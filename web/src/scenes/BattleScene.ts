// バトルシーン — Unity版 UI/BattleUI.cs 相当の簡易UI + BattleEngine 駆動
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, titleStyle, latinStyle, drawBar, drawPanel, paintPanel, drawOrnamentLine } from '../ui/theme';
import { BattleEngine, Combatant, type BattleEvent, type PlayerCommand } from '../battle/engine';
import { pickEncounter, buildHeroes, buildEnemies, computeRewards } from '../battle/setup';
import { loadRun, saveRun, clearRun, loadMeta, recordWeakness, recordEnemiesSeen, recordEnemyKills, recordGrimoire } from '../core/save';
import { notifyAchievements } from './ToastScene';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP, partyUnits } from '../core/run';
import { addExp, addJP } from '../core/level';
import type { ElementType, EnemyDef, NodeType, SkillDef } from '../core/types';
import { STATUS_DISPLAY_NAME } from '../core/types';
import { FLOORS } from '../data/enemies';
import { getCharacter } from '../data/characters';
import { RelicBattleState } from '../battle/relicHooks';
import { getBoostPreview } from '../battle/boost';
import { playSfx } from '../audio/sfx';
import { playBgm } from '../audio/bgm';
import { getSettings, updateSettings, BATTLE_SPEEDS } from '../core/settings';
import { hasArt } from './PreloadScene';
import { charFullKey, enemyArtKey, bgArtKey, ENDING_BG_STEM, artFrame } from '../data/assets';
import {
  buildBattleLoot, addRelicToRun, modifyGoldDrop, hasEffect, sumEffect,
  drawRelic, rollRelicRarity,
} from '../core/relics';
import { RARITY_LABEL, RARITY_COLOR, getRelic, type RelicDef } from '../data/relics';
import { LINES, pickLine, shortName, type CharLines } from '../data/dialogue';
import { ELEMENT_BADGE } from '../ui/elements';
import { BattleFx, ELEMENT_FX_COLOR } from '../ui/battleFx';

interface BattleInit { nodeType: NodeType; contentSeed: number }

interface WeakSlot { el: ElementType; box: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }

/** 付与されたときに上昇音を鳴らす状態 (それ以外は下降音) */
const BUFF_STATUSES = new Set(['AtkUp', 'MatkUp', 'DefUp', 'SpdUp', 'Regen', 'RegenFlat', 'CritUp', 'Afterimage', 'Barrier']);

export class BattleScene extends Phaser.Scene {
  private run!: RunState;
  private engine!: BattleEngine;
  private enemyDefs!: EnemyDef[];
  private nodeType!: NodeType;

  private hero!: Combatant;                 // 主人公 (heroes[0])
  private heroes: Combatant[] = [];
  private heroSprites: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[] = [];
  private enemySprites: Phaser.GameObjects.Container[] = [];
  private msgText!: Phaser.GameObjects.Text;
  private hudG!: Phaser.GameObjects.Graphics;
  private hudTexts: Phaser.GameObjects.Text[] = [];
  private turnStrip: Phaser.GameObjects.Container | null = null;
  private commandContainer: Phaser.GameObjects.Container | null = null;
  private boostLevel = 0;
  private processing = false;
  private fx!: BattleFx;
  /** 画面に出しているHP (実際のHPへ少しずつ近づけ、ダメージが減っていく様子を見せる) */
  private shownHp = new Map<Combatant, number>();
  private hpTween: Phaser.Tweens.Tween | null = null;
  /** 吸収した直後の撃破は、魂が使い手へ流れる演出にする */
  private pendingAbsorb = false;
  /** タッチ操作で「1回目のタップ」を受けたコマンド (2回目で決定) */
  private armedCommand = -1;

  private contentSeed = 0;
  /** 頭上の吹き出し (同時に1つだけ) */
  private bubble: Phaser.GameObjects.Container | null = null;
  /** 一度だけ言う台詞 (HP危険など) を言い終えた組み合わせ */
  private saidOnce = new Set<string>();

  constructor() { super('Battle'); }

  init(data: BattleInit): void {
    this.nodeType = data.nodeType;
    this.contentSeed = data.contentSeed;
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    this.run = run;
    this.enemyDefs = pickEncounter(run, data.nodeType, data.contentSeed);
  }

  create(): void {
    const { width, height } = this.scale;
    this.enemySprites = [];
    this.hudTexts = [];
    this.commandContainer = null;
    this.boostLevel = 0;
    this.processing = false;
    this.bubble = null;
    this.saidOnce = new Set();

    // 最終層はエンディングごとの最終ボス曲、各層のボスは層別のボス曲 (無ければ共通の曲)
    const finalStem = this.run.activeEnding ? ENDING_BG_STEM[this.run.activeEnding] : undefined;
    playBgm(this, this.run.currentFloor >= 4 ? [...(finalStem ? [`final_${finalStem}`] : []), 'finale']
      : this.nodeType === 'Boss' ? [`boss_floor${this.run.currentFloor}`, 'boss'] : 'battle');

    // 背景: 画像があれば全面表示、無ければフロアごとの色味
    const floorTints = [0x0d0a16, 0x08120a, 0x160810, 0x14100a];
    // フロア4以降はエンディング分岐のアリーナ背景
    const bgStem = this.run.currentFloor >= 4 && this.run.activeEnding
      ? `arena_${ENDING_BG_STEM[this.run.activeEnding] ?? 'true_core'}`
      : `floor${Math.min(this.run.currentFloor, 3)}`;
    if (hasArt(this, bgArtKey(bgStem))) {
      const bg = this.add.image(width / 2, height / 2, bgArtKey(bgStem));
      bg.setScale(Math.max(width / bg.width, height / bg.height));
      this.add.rectangle(width / 2, height / 2, width, height, 0x07050d, 0.28);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height,
        floorTints[Math.min(this.run.currentFloor, 3)]);
    }
    // 地面線。コマンド欄 (3行時の上端 = 画面下から202px) に足元が隠れない高さ
    const groundLineY = height - 202;
    this.add.rectangle(width / 2, groundLineY, width, 2, 0x3a3050);

    // 勝利後の遺物選択の途中で中断していた場合: 戦闘はやり直さず、選択画面から再開
    // (報酬は勝利時に付与・保存済みなので、戦闘をやり直すと二重取りになる)
    const pendingReward = this.run.pendingEncounter?.reward;
    if (pendingReward) {
      drawPanel(this, width / 2, 60, width - 60, 46, { alpha: 0.8 });
      this.msgText = this.add.text(width / 2, 60, '戦いの余韻が残っている…', textStyle(17)).setOrigin(0.5);
      const loot = pendingReward.loot
        .map((id) => getRelic(id))
        .filter((r): r is RelicDef => !!r && !this.run.relics.includes(r.id));
      this.showVictoryPanel(pendingReward.lines, loot, pendingReward.isBoss);
      return;
    }

    // エンジン構築 (主人公+幻影パーティ)
    this.heroes = buildHeroes(this.run);
    this.hero = this.heroes[0];
    const isFirstCombat = this.run.battlesWon === 0;
    const enemies = buildEnemies(this.run, this.enemyDefs, this.nodeType, isFirstCombat);
    if (isFirstCombat && this.run.blessingFirstCombatShieldReduction) {
      this.run.blessingFirstCombatShieldReduction = false;
    }
    recordEnemiesSeen(this.enemyDefs.map((d) => d.id));
    const relicState = new RelicBattleState(this.run);
    this.engine = new BattleEngine(this.heroes, enemies, this.run.metaStartBP, relicState);

    // ヒーロー描画 (左側・最大3人)。足元を地面線にそろえ、名前は頭上に表示
    const groundY = groundLineY - 2;   // 足元の位置
    const labelStyle = (size: number, color: string = COLORS.text) =>
      textStyle(size, color, { stroke: '#000000', strokeThickness: 3 });
    this.heroSprites = [];
    this.heroes.forEach((h, i) => {
      const x = 220 - i * 10 + (i > 0 ? (i === 1 ? -90 : 90) : 0);
      const feetY = groundY - (i > 0 ? 40 : 0);   // 仲間は一歩奥
      const id = h.characterId ?? this.run.characterId;
      const color = getCharacter(id).themeColor;

      // 立ち絵があれば画像、無ければ従来の矩形 (アスペクト比維持で高さ合わせ)
      let sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
      let bodyH: number;
      const key = charFullKey(id);
      if (hasArt(this, key)) {
        bodyH = i === 0 ? 230 : 168;
        const img = this.add.image(x, feetY - bodyH / 2, key, artFrame(this, key)).setOrigin(0.5, 0.5);
        img.setScale(bodyH / img.height);
        sprite = img;
      } else {
        bodyH = i === 0 ? 110 : 88;
        sprite = this.add.rectangle(x, feetY - bodyH / 2, i === 0 ? 72 : 58, bodyH, color, 0.95)
          .setStrokeStyle(2, 0xd8d0e8);
      }
      sprite.setDepth(i === 0 ? 5 : 4);   // 主人公を手前に
      sprite.setData('homeX', x);
      this.add.text(x, feetY - bodyH - 12, h.name.split('・')[0], labelStyle(i === 0 ? 14 : 12))
        .setOrigin(0.5).setDepth(6);
      if (!h.isAlive) sprite.setAlpha(0.25);
      this.heroSprites.push(sprite);
    });

    // 敵描画 (右側)。足元を地面線にそろえ、名前・HP・シールドは頭上にまとめる
    const knownWeak = loadMeta().knownWeaknesses;
    enemies.forEach((e, i) => {
      const x = width - 200 - i * 180;
      const rank = e.enemyDef!.rank;
      const ekey = enemyArtKey(e.enemyDef!.id);
      let rect: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
      let bodyH: number;
      let bodyW: number;
      if (hasArt(this, ekey)) {
        // 主人公(230px)と釣り合う高さ: 通常190 / エリート235 / ボス300。
        // 横長の敵 (狼など) が隣と重ならないよう横幅にも上限を設ける
        const isBoss = rank === 'Boss' || rank === 'TrueFinalBoss';
        const targetH = isBoss ? 300 : rank === 'Elite' ? 235 : 190;
        const maxW = isBoss ? 320 : 170;
        const img = this.add.image(0, 0, ekey, artFrame(this, ekey)).setOrigin(0.5, 0.5);
        img.setScale(Math.min(targetH / img.height, maxW / img.width));
        bodyH = img.displayHeight;
        bodyW = img.displayWidth;
        rect = img;
      } else {
        bodyH = rank === 'Boss' || rank === 'TrueFinalBoss' ? 130 : rank === 'Elite' ? 100 : 76;
        bodyW = bodyH * 0.7;
        rect = this.add.rectangle(0, 0, bodyW, bodyH, e.enemyDef!.tint, 0.95)
          .setStrokeStyle(2, 0x000000);
      }
      const top = -bodyH / 2;
      const hpText = this.add.text(0, top - 10, '', labelStyle(11, COLORS.textDim)).setOrigin(0.5);
      const nameText = this.add.text(0, top - 27, e.name, labelStyle(12)).setOrigin(0.5);
      const shieldText = this.add.text(0, top - 45, '', labelStyle(13, '#8fc2ee')).setOrigin(0.5);
      const container = this.add.container(x, groundY - bodyH / 2, [rect, hpText, nameText, shieldText]);

      // 弱点枠: 弱点の数だけ「?」を並べ、弱点を突くと属性を開示する (オクトパストラベラー式)。
      // 一度見つけた弱点はランをまたいで記憶する。鑑定士の片眼鏡を持っていれば最初から全開示
      const weaknesses = e.enemyDef!.elementWeaknesses;
      const revealAll = hasEffect(this.run, 'WeaknessReveal');
      const known = new Set(knownWeak[e.enemyDef!.id] ?? []);
      const weakSlots: WeakSlot[] = [];
      let labelTop = top - 45;
      if (weaknesses.length > 0) {
        labelTop = top - 64;
        const gap = 22;
        weaknesses.forEach((el, wi) => {
          const sx = (wi - (weaknesses.length - 1) / 2) * gap;
          const box = this.add.rectangle(sx, labelTop, 19, 19, 0x000000, 0.65).setStrokeStyle(1, 0x6a5a8a);
          const text = this.add.text(sx, labelTop, '?', labelStyle(12, '#9a90b0')).setOrigin(0.5);
          container.add([box, text]);
          const slot = { el, box, text };
          weakSlots.push(slot);
          if (revealAll || known.has(el)) this.showWeakSlot(slot, false);
        });
      }
      container.setData({ combatant: e, rect, hpText, shieldText, bodyH, bodyW, labelTop, weakSlots, homeX: x });
      this.enemySprites.push(container);
    });

    // メッセージ帯
    drawPanel(this, width / 2, 60, width - 60, 46, { alpha: 0.8 });
    this.msgText = this.add.text(width / 2, 60, `${this.enemyDefs.map((d) => d.name).join('、')} が現れた！`,
      textStyle(17)).setOrigin(0.5);
    this.createSpeedToggle();

    // 開幕の台詞 (危険域の台詞はこれが消えてから)
    this.say(this.hero, this.linesOf(this.hero)?.battleStart, { force: true });

    // HUD領域
    this.hudG = this.add.graphics();
    this.refreshDisplay();

    this.fx = new BattleFx(this, (ms) => this.spd(ms));

    // 開始
    this.time.delayedCall(900, () => this.progress());
  }

  // ── エンジン進行 → イベント再生 → 入力待ち/決着 ──────────────────────
  private progress(): void {
    if (this.processing) return;
    this.processing = true;
    const result = this.engine.advance();
    const events = this.engine.drainEvents();
    this.playEvents(events, () => {
      this.processing = false;
      if (result === 'over') {
        this.onBattleEnd();
      } else {
        this.showCommandMenu();
      }
    });
  }

  private submitCommand(cmd: PlayerCommand): void {
    if (this.processing) return;
    this.hideCommandMenu();
    this.processing = true;
    const actor = this.engine.activeCombatant;
    if (cmd.boostLevel > 0 && actor?.isPlayer) {
      this.say(actor, this.linesOf(actor)?.boost, { force: true });
    }
    const result = this.engine.executePlayerCommand(cmd);
    const events = this.engine.drainEvents();
    this.playEvents(events, () => {
      this.processing = false;
      if (result === 'over') {
        this.onBattleEnd();
      } else {
        this.showCommandMenu();
      }
    });
  }

  // ── イベント逐次再生 ──────────────────────────────────────────────
  private playEvents(events: BattleEvent[], onDone: () => void): void {
    let i = 0;
    const step = () => {
      if (i >= events.length) { this.refreshDisplay(); onDone(); return; }
      const e = events[i++];
      let delay = this.renderEvent(e);
      // 多段・全体攻撃のように当たりが続くときは、2発目以降の間を詰める
      if (e.kind === 'damage' && events[i]?.kind === 'damage') delay = Math.round(delay * 0.6);
      // HPなどの表示は、着弾の演出が届いてから変える
      this.time.delayedCall(this.spd(140), () => this.refreshDisplay());
      this.time.delayedCall(this.spd(delay), step);
    };
    step();
  }

  /** 体の中心と大きさ (演出の位置合わせ用。踏み込み中でも元の位置) */
  private centerOf(c: Combatant): { x: number; y: number; h: number; w: number } | null {
    if (c.isPlayer) {
      const s = this.heroSpriteOf(c);
      if (!s) return null;
      return { x: (s.getData('homeX') as number) ?? s.x, y: s.y, h: s.displayHeight, w: s.displayWidth };
    }
    const s = this.findEnemySprite(c);
    if (!s) return null;
    return { x: s.getData('homeX') as number, y: s.y, h: s.getData('bodyH') as number, w: s.getData('bodyW') as number };
  }

  private renderEvent(e: BattleEvent): number {
    switch (e.kind) {
      case 'message':
        this.msgText.setText(e.text);
        if (e.text.includes('回避')) {
          playSfx('miss');
          const actor = this.engine.activeCombatant;
          const foe = actor ? (actor.isPlayer ? this.engine.enemies : this.heroes).find((f) => e.text.includes(f.name)) : undefined;
          const at = foe && this.centerOf(foe);
          if (at) this.spawnMiss(at.x, at.y - at.h * 0.3);
        }
        this.sayForMessage(e.text);
        return 800;
      case 'skillUse': {
        this.msgText.setText(`${e.user.name} の ${e.skillName}！`);
        const at = this.centerOf(e.user);
        const sk = e.skill;
        const support = !!sk && (sk.isHeal || !!sk.revive || !!sk.regenFlat || !!sk.buff || !!sk.barrier || !!sk.cleanse)
          && !(sk.basePower > 0);
        let windup = 620;
        if (at && (e.boost ?? 0) > 0) {
          this.fx.boostAura(at.x, at.y, e.boost!);
          windup += 220;
        }
        if (at) {
          const feetY = at.y + at.h / 2 - 4;
          if (support) {
            this.fx.castCircle(at.x, feetY, sk!.isHeal || sk!.revive || sk!.regenFlat ? 0x6ade8a : 0xffd88a);
          } else if (sk && sk.damageType === 'Magical') {
            this.fx.castCircle(at.x, feetY, ELEMENT_FX_COLOR[sk.element] ?? 0xc89aff);
          } else if (sk && sk.basePower <= 0) {
            this.fx.castCircle(at.x, feetY, sk.debuff || sk.appliedStatus ? 0xb070e0 : 0xd0c8e0);
          } else {
            // 物理の構え: 武器がきらめいてから踏み込む
            this.fx.glint(at.x + (e.user.isPlayer ? at.w * 0.3 : -at.w * 0.3), at.y - at.h * 0.2);
          }
        }
        this.lunge(e.user);
        if (e.skillName !== '攻撃') {
          playSfx('skill');
          if (e.user.isPlayer) this.sayForSkill(e.user, e.skillName);
        }
        return windup;
      }
      case 'damage': {
        const at = this.centerOf(e.target);
        if (at && e.amount > 0) {
          this.fx.impact(at.x, at.y, e.element, !!e.magical, e.isCrit, !e.target.isPlayer);
        }
        this.spawnDamageNumber(e.target, e.amount,
          e.isCrit ? '#ffd24a' : '#ffffff', e.isCrit, e.isWeak);
        this.flashCombatant(e.target);
        if (e.amount > 0) {
          this.shake(e.target, e.isCrit ? 11 : 7);
          if (e.isCrit) this.cameras.main.shake(this.spd(160), 0.004);
          playSfx(e.isWeak ? 'weak' : e.isCrit ? 'crit' : 'hit');
        }
        if (e.isWeak && e.element && !e.target.isPlayer) this.revealWeakness(e.target, e.element);
        if (e.isCrit && !e.target.isPlayer) {
          const actor = this.engine.activeCombatant;
          if (actor?.isPlayer) this.say(actor, this.linesOf(actor)?.crit, { chance: 0.6 });
        }
        return e.isCrit ? 900 : 680;
      }
      case 'dot': {
        const at = this.centerOf(e.target);
        if (at) this.fx.status(at.x, at.y, at.h, 'Poison');
        this.spawnDamageNumber(e.target, e.amount, '#b070e0', false, false);
        this.shake(e.target, 4);
        return 600;
      }
      case 'heal': {
        const at = this.centerOf(e.target);
        if (at) this.fx.heal(at.x, at.y, at.h);
        this.spawnDamageNumber(e.target, e.amount, '#6ade8a', false, false, '+');
        playSfx('heal');
        return 650;
      }
      case 'status':
        if (e.applied) {
          const at = this.centerOf(e.target);
          if (at) this.fx.status(at.x, at.y, at.h, e.status);
          this.msgText.setText(`${e.target.name} に ${STATUS_DISPLAY_NAME[e.status]}`);
          playSfx(BUFF_STATUSES.has(e.status) ? 'buff' : 'debuff');
          return 650;
        }
        return 80;
      case 'shieldHit': {
        const at = this.centerOf(e.target);
        if (at) this.fx.shieldSpark(at.x, at.y - at.h * 0.2);
        return 220;
      }
      case 'shadow': {
        if (e.target.isPlayer) {
          this.heroSpriteOf(e.target)?.setAlpha(e.active ? 0.55 : 1);
          if (e.active) {
            const at = this.centerOf(e.target);
            if (at) this.fx.status(at.x, at.y, at.h, 'Blind');
            this.msgText.setText(`${e.target.name} は影に溶けた…`);
            this.say(e.target, this.linesOf(e.target)?.shadow);
          }
        }
        return e.active ? 700 : 120;
      }
      case 'absorb':
        this.msgText.setText(`「${e.skillName}」をグリモワールに刻んだ！`);
        this.pendingAbsorb = true;
        {
          const actor = this.engine.activeCombatant;
          if (actor?.isPlayer) this.say(actor, this.linesOf(actor)?.absorbSuccess, { force: true });
        }
        return 900;
      case 'break': {
        this.msgText.setText(`⚡ ${e.target.name} を Break！`);
        this.cameras.main.shake(this.spd(240), 0.01);
        this.breakBurst(e.target);
        playSfx('break');
        {
          const actor = this.engine.activeCombatant;
          if (actor?.isPlayer) this.say(actor, this.linesOf(actor)?.breakEnemy);
        }
        return 1000;
      }
      case 'defeat': {
        const sprite = this.findEnemySprite(e.target);
        const at = this.centerOf(e.target);
        if (sprite && at) {
          // 吸収なら魂が使い手へ流れ、そうでなければ塵になって昇る
          const actor = this.engine.activeCombatant;
          const to = this.pendingAbsorb && actor ? this.centerOf(actor) : null;
          if (to) this.fx.absorb(at.x, at.y, to.x, to.y);
          else this.fx.dissolve(at.x, at.y, at.w, at.h, e.target.enemyDef?.tint ?? 0x9a8abd);
          this.pendingAbsorb = false;
          // 沈みながら消える
          this.tweens.add({
            targets: sprite, alpha: 0, y: sprite.y + 18, scale: 0.92,
            duration: this.spd(700), ease: 'Quad.easeIn',
          });
          playSfx('defeat');
        }
        if (e.target.isPlayer) {
          if (at) this.fx.dissolve(at.x, at.y, at.w * 0.6, at.h * 0.6, 0x5a4a7a);
          this.heroSpriteOf(e.target)?.setAlpha(0.25);
          this.msgText.setText(`${e.target.name} は倒れた…`);
          return 900;
        }
        this.msgText.setText(`${e.target.name} を倒した！`);
        return 800;
      }
      case 'victory':
        this.msgText.setText('勝利！');
        playSfx('victory');
        return 900;
      case 'defeat_party':
        this.msgText.setText(`${this.hero.name} は倒れた…`);
        return 1200;
    }
  }

  // ── 台詞の吹き出し (Unity版 VoiceLines) ─────────────────────────────
  private linesOf(c: Combatant): CharLines | undefined {
    return LINES[c.characterId ?? this.run.characterId];
  }

  /** 味方の頭上に台詞を約2秒出す。force でなければ、表示中の吹き出しは上書きしない。
   *  出せたら true */
  private say(c: Combatant, list: string[] | undefined, opts: { force?: boolean; chance?: number } = {}): boolean {
    if (opts.chance !== undefined && Math.random() > opts.chance) return false;
    if (!opts.force && this.bubble?.active) return false;
    const text = pickLine(list);
    const sprite = this.heroSpriteOf(c);
    if (!text || !sprite) return false;
    this.bubble?.destroy();

    const txt = this.add.text(0, 0, text, textStyle(14, '#2a2030', {
      wordWrap: { width: 260, useAdvancedWrap: true }, align: 'center',
    })).setOrigin(0.5);
    const w = txt.width + 24;
    const h = txt.height + 14;
    const g = this.add.graphics();
    g.fillStyle(0xf4ecd8, 0.96).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(2, 0x5a4a3a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.fillStyle(0xf4ecd8, 0.96).fillTriangle(-8, h / 2 - 1, 8, h / 2 - 1, 0, h / 2 + 10);

    // 頭上の名前ラベル (頭の12px上) より上に置く
    const headY = sprite.y - sprite.displayHeight / 2;
    const x = Phaser.Math.Clamp(sprite.getData('homeX') as number, w / 2 + 8, this.scale.width - w / 2 - 8);
    const bubble = this.add.container(x, headY - 26 - 10 - h / 2, [g, txt]).setDepth(60);
    this.bubble = bubble;
    bubble.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
    // 戦闘速度に関係なく読める長さだけ残す
    this.tweens.add({
      targets: bubble, alpha: 0, delay: 2200, duration: 300,
      onComplete: () => {
        bubble.destroy();
        if (this.bubble === bubble) this.bubble = null;
        this.checkLowLines();   // 待たせていた危険域の台詞を出す
      },
    });
    return true;
  }

  private sayForSkill(user: Combatant, skillName: string): void {
    const L = this.linesOf(user);
    if (!L) return;
    const specific = L.skill?.[skillName];
    if (specific) { this.say(user, specific); return; }
    const skill = user.skills.find((s) => s.name === skillName);
    const byElement = skill ? L.element?.[skill.element] : undefined;
    if (byElement) this.say(user, byElement, { chance: 0.7 });
    else this.say(user, L.genericSkill, { chance: 0.4 });
  }

  /** エンジンのメッセージから場面を判定して台詞を出す */
  private sayForMessage(text: string): void {
    const actor = this.engine.activeCombatant;
    if (text.includes('回避')) {
      const who = this.heroes.find((h) => text.startsWith(h.name));
      if (who) this.say(who, this.linesOf(who)?.evade, { force: true });
    } else if (text.includes('踏みとどまった')) {
      const who = this.heroes.find((h) => text.startsWith(h.name));
      if (who) this.say(who, this.linesOf(who)?.indomitable, { force: true });
    } else if (text.includes('吸収に失敗') && actor?.isPlayer) {
      this.say(actor, this.linesOf(actor)?.absorbFail, { force: true });
    } else if (text.includes('元素が共鳴') && actor?.isPlayer) {
      this.say(actor, this.linesOf(actor)?.resonance, { force: true });
    }
  }

  /** HP・MPが危険域に入ったときの台詞 (各1戦につき1回。他の吹き出しが消えるのを待って出す) */
  private checkLowLines(): void {
    if (!this.engine || this.engine.over) return;
    this.heroes.forEach((c, i) => {
      if (!c.isAlive) return;
      const L = this.linesOf(c);
      if (!L) return;
      const once = (key: string, list: string[] | undefined) => {
        const k = `${key}:${i}`;
        if (!list || this.saidOnce.has(k)) return;
        if (this.say(c, list)) this.saidOnce.add(k);
      };
      if (c.hp / c.base.maxHP < 0.3) once('lowHP', L.lowHP);
      if (c.base.maxMP > 0 && c.mp / c.base.maxMP < 0.2) once('lowMP', L.lowMP);
      const allyDown = this.heroes.some((o) => o !== c && o.isAlive && o.hp / o.base.maxHP < 0.3);
      if (allyDown) once('lowAlly', L.lowAlly);
    });
  }

  private findEnemySprite(c: Combatant): Phaser.GameObjects.Container | undefined {
    return this.enemySprites.find((s) => s.getData('combatant') === c);
  }

  private heroSpriteOf(c: Combatant): Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | undefined {
    const idx = this.heroes.indexOf(c);
    return idx >= 0 ? this.heroSprites[idx] : undefined;
  }

  private spawnDamageNumber(
    target: Combatant, amount: number, color: string,
    isCrit: boolean, isWeak: boolean, prefix = '',
  ): void {
    let x: number, y: number;
    if (target.isPlayer) {
      const hs = this.heroSpriteOf(target);
      if (!hs) return;
      x = hs.x; y = hs.y - 60;
    } else {
      const s = this.findEnemySprite(target);
      if (!s) return;
      x = s.x; y = s.y - 70;
    }
    // 数字は碑文風の欧文書体で。弱点・会心は添え字を付けて少し大きく弾ませる
    const txt = this.add.text(x, y, `${prefix}${amount}`, latinStyle(isCrit ? 34 : 26, color, true, {
      stroke: '#120a06', strokeThickness: 5,
    })).setOrigin(0.5).setDepth(50);
    const tag = isWeak || isCrit
      ? this.add.text(x, y - (isCrit ? 26 : 22), isCrit && isWeak ? '会心・弱点' : isCrit ? '会心' : '弱点',
        textStyle(13, isWeak ? '#ffd88a' : '#ffe9a8', { stroke: '#120a06', strokeThickness: 4 })).setOrigin(0.5).setDepth(50)
      : null;
    const parts = tag ? [txt, tag] : [txt];
    this.tweens.add({ targets: parts, scale: { from: isCrit ? 1.7 : 1.35, to: 1 }, duration: this.spd(200), ease: 'Back.easeOut' });
    this.tweens.add({
      targets: parts, y: '-=46', alpha: 0, delay: this.spd(450), duration: this.spd(900),
      ease: 'Cubic.easeIn',
      onComplete: () => parts.forEach((o) => o.destroy()),
    });
  }

  /** 弱点枠を開示表示にする */
  private showWeakSlot(slot: WeakSlot, animate: boolean): void {
    const badge = ELEMENT_BADGE[slot.el];
    slot.text.setText(badge.label).setColor(badge.color);
    slot.box.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(badge.color).color);
    if (animate) {
      this.tweens.add({ targets: [slot.box, slot.text], scale: { from: 1.8, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    }
  }

  /** 弱点を突いたとき: 同じ種類の敵すべての枠を開示し、初発見ならランをまたいで記録する */
  private revealWeakness(target: Combatant, el: ElementType): void {
    const id = target.enemyDef?.id;
    if (!id) return;
    for (const container of this.enemySprites) {
      const c = container.getData('combatant') as Combatant;
      if (c.enemyDef?.id !== id) continue;
      const slot = (container.getData('weakSlots') as WeakSlot[]).find((w) => w.el === el);
      if (slot && slot.text.text === '?') this.showWeakSlot(slot, true);
    }
    if (recordWeakness(id, el)) {
      this.msgText.setText(`${target.name} の弱点を見つけた！【${ELEMENT_BADGE[el].label}】`);
      notifyAchievements(this, this.run);
    }
  }

  private flashCombatant(target: Combatant): void {
    const obj = target.isPlayer ? this.heroSpriteOf(target) : this.findEnemySprite(target)?.getData('rect');
    if (!obj) return;
    this.tweens.add({
      targets: obj, alpha: { from: 1, to: 0.3 }, duration: this.spd(80), yoyo: true, repeat: 1,
    });
  }

  // ── 戦闘演出 ─────────────────────────────────────────────────────────
  /** 演出時間を戦闘速度に合わせる */
  private spd(ms: number): number {
    return ms / getSettings().battleSpeed;
  }

  /** 画面上の本体 (ヒーローは立ち絵、敵は名前等を含むコンテナ) */
  private bodyOf(c: Combatant): Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Container | undefined {
    return c.isPlayer ? this.heroSpriteOf(c) : this.findEnemySprite(c);
  }

  /** 行動時の踏み込み (ヒーローは右へ、敵は左へ) */
  private lunge(c: Combatant): void {
    const obj = this.bodyOf(c);
    const homeX = obj?.getData('homeX') as number | undefined;
    if (!obj || homeX === undefined) return;
    const dx = c.isPlayer ? 54 : -54;
    // 踏み込んで一瞬止まり、ゆっくり戻る
    this.tweens.addCounter({
      from: 0, to: 1, duration: this.spd(190), ease: 'Quad.easeOut',
      onUpdate: (tw) => { obj.x = homeX + dx * (tw.getValue() ?? 0); },
      onComplete: () => this.tweens.addCounter({
        from: 1, to: 0, delay: this.spd(160), duration: this.spd(260), ease: 'Sine.easeInOut',
        onUpdate: (tw) => { obj.x = homeX + dx * (tw.getValue() ?? 0); },
        onComplete: () => { obj.x = homeX; },
      }),
    });
  }

  /** 被弾時の揺れ */
  private shake(c: Combatant, amp: number): void {
    const obj = this.bodyOf(c);
    const homeX = obj?.getData('homeX') as number | undefined;
    if (!obj || homeX === undefined) return;
    this.tweens.addCounter({
      from: 0, to: 1, duration: this.spd(240),
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        obj.x = homeX + Math.sin(v * Math.PI * 6) * amp * (1 - v);
      },
      onComplete: () => { obj.x = homeX; },
    });
  }

  /** 回避されたときの「MISS」 */
  private spawnMiss(x: number, y: number): void {
    const t = this.add.text(x, y, 'MISS', latinStyle(24, '#c8c0d8', true, { stroke: '#120a06', strokeThickness: 5 }))
      .setOrigin(0.5).setDepth(50).setLetterSpacing(3);
    this.tweens.add({ targets: t, x: x + 26, alpha: 0, delay: this.spd(300), duration: this.spd(600), ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  /** Break の演出: 「BREAK!」の文字と、シールドの破片が飛び散る */
  private breakBurst(c: Combatant): void {
    const obj = this.findEnemySprite(c);
    if (!obj) return;
    const cx = obj.x;
    const cy = obj.y - 20;
    this.cameras.main.flash(this.spd(140), 255, 236, 170);
    const label = this.add.text(cx, cy, 'BREAK', latinStyle(44, '#ffd24a', true, {
      stroke: '#3a1a00', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(60).setScale(0.5).setLetterSpacing(6);
    this.tweens.add({
      targets: label, scale: 1.25, duration: this.spd(220), ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: label, alpha: 0, y: cy - 30, duration: this.spd(520), delay: this.spd(180),
        onComplete: () => label.destroy(),
      }),
    });
    for (let k = 0; k < 10; k++) {
      const ang = (Math.PI * 2 * k) / 10 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 60;
      const shard = this.add.rectangle(cx, cy, 8, 4, 0x8fc2ee, 1).setDepth(59).setRotation(ang);
      this.tweens.add({
        targets: shard, x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist,
        alpha: 0, angle: shard.angle + 180, duration: this.spd(560), ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  /** 画面右上の戦闘速度ボタン (押すたびに ×1 → ×1.5 → ×2 → ×3) */
  private createSpeedToggle(): void {
    const { width } = this.scale;
    const bg = this.add.rectangle(width - 70, 104, 104, 24, 0x140f1e, 0.9)
      .setStrokeStyle(1, COLORS.trim).setDepth(56)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(width - 70, 104, '', textStyle(12, COLORS.text)).setOrigin(0.5).setDepth(57);
    const refresh = () => label.setText(`速度 ×${getSettings().battleSpeed}`);
    refresh();
    bg.on('pointerdown', () => {
      const i = BATTLE_SPEEDS.indexOf(getSettings().battleSpeed);
      updateSettings({ battleSpeed: BATTLE_SPEEDS[(i + 1) % BATTLE_SPEEDS.length] });
      playSfx('select');
      refresh();
    });
  }

  // ── 行動順 (画面上部。先頭=いま行動中、以降は予測) ───────────────────
  private drawTurnOrder(): void {
    this.turnStrip?.destroy();
    this.turnStrip = null;
    if (!this.engine || this.engine.over) return;
    const { width } = this.scale;
    const current = this.engine.activeCombatant;
    const upcoming = this.engine.predictTurnOrder(current?.isAlive ? 7 : 8);
    const order = current?.isAlive ? [current, ...upcoming] : upcoming;

    // 同名の敵は A/B/C で区別する
    const shortName = (c: Combatant): string => {
      const base = c.isPlayer ? c.name.split('・')[0] : c.name.split(' ').pop()!;
      if (c.isPlayer) return base;
      const same = this.engine.enemies.filter((e) => e.name === c.name);
      return same.length > 1 ? `${base}${'ABCD'[same.indexOf(c)]}` : base;
    };

    const chipW = 86;
    const gap = 6;
    const y = 104;
    const totalW = order.length * chipW + (order.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + chipW / 2;
    const items: Phaser.GameObjects.GameObject[] = [
      this.add.text(startX - chipW / 2 - 10, y, '行動順', textStyle(12, COLORS.textDim)).setOrigin(1, 0.5),
    ];
    order.forEach((c, i) => {
      const x = startX + i * (chipW + gap);
      const isNow = i === 0 && c === current;
      const box = this.add.rectangle(x, y, chipW, 22, c.isPlayer ? 0x17223a : 0x2c121b, 0.88)
        .setStrokeStyle(isNow ? 2 : 1, isNow ? COLORS.trimBright : c.isPlayer ? 0x4f6a96 : 0x8a3f4f);
      const label = this.add.text(x, y, shortName(c), textStyle(11,
        isNow ? COLORS.textGold : c.isPlayer ? '#b8d0f0' : '#f0b8c0')).setOrigin(0.5);
      if (label.width > chipW - 8) label.setScale((chipW - 8) / label.width);
      items.push(box, label);
    });
    this.turnStrip = this.add.container(0, 0, items).setDepth(55);
  }

  // ── HUD更新 ────────────────────────────────────────────────────────
  /** 表示を最新にする。HPは数値もバーも、実際の値へ0.5秒ほどかけて近づける */
  private refreshDisplay(): void {
    const all = [...this.heroes, ...this.engine.enemies];
    const from = new Map(all.map((c) => [c, this.hpOf(c)]));
    if (all.some((c) => from.get(c) !== c.hp)) {
      this.hpTween?.stop();
      this.hpTween = this.tweens.addCounter({
        from: 0, to: 1, duration: this.spd(520), ease: 'Quad.easeOut',
        onUpdate: (tw) => {
          const v = tw.getValue() ?? 0;
          for (const c of all) this.shownHp.set(c, Math.round(from.get(c)! + (c.hp - from.get(c)!) * v));
          this.drawHud();
        },
        onComplete: () => { for (const c of all) this.shownHp.set(c, c.hp); this.drawHud(); },
      });
    }
    this.drawHud();
  }

  /** 画面に出すHP */
  private hpOf(c: Combatant): number {
    return this.shownHp.get(c) ?? c.hp;
  }

  private drawHud(): void {
    this.drawTurnOrder();
    this.checkLowLines();
    const { width, height } = this.scale;
    this.hudG.clear();
    this.hudTexts.forEach((t) => t.destroy());
    this.hudTexts = [];

    // ヒーローパネル (左下・パーティ全員)
    const panelH = 120;
    const px = 40, py = height - 150;
    paintPanel(this.hudG, px, py, 360, panelH, { alpha: 0.92 });
    const h = this.hero;

    this.hudTexts.push(this.add.text(px + 16, py + 8,
      `${h.name}`, titleStyle(16, COLORS.textGold)));
    const hHp = this.hpOf(h);
    drawBar(this.hudG, px + 14, py + 34, 240, 14, hHp / h.base.maxHP,
      hHp / h.base.maxHP > 0.3 ? COLORS.hpBar : COLORS.hpBarLow);
    this.hudTexts.push(this.add.text(px + 262, py + 31,
      `${hHp}/${h.base.maxHP}`, latinStyle(12)));
    drawBar(this.hudG, px + 14, py + 56, 240, 10, h.mp / Math.max(1, h.base.maxMP), COLORS.mpBar);
    this.hudTexts.push(this.add.text(px + 262, py + 51,
      `MP ${h.mp}/${h.base.maxMP}`, latinStyle(11, COLORS.textBlue)));

    // BP
    // BP は菱形の宝石で表す
    for (let i = 0; i < 5; i++) {
      const filled = i < h.bp;
      const gx = px + 26 + i * 26, gy = py + 86;
      const gem = [{ x: gx, y: gy - 10 }, { x: gx + 8, y: gy }, { x: gx, y: gy + 10 }, { x: gx - 8, y: gy }];
      this.hudG.fillStyle(filled ? COLORS.bpBar : 0x221a2e, 1).fillPoints(gem, true);
      if (filled) this.hudG.fillStyle(0xfff0c0, 0.55).fillPoints([{ x: gx, y: gy - 10 }, { x: gx + 4, y: gy - 5 }, { x: gx, y: gy }, { x: gx - 4, y: gy - 5 }], true);
      this.hudG.lineStyle(1, filled ? 0x6b4a14 : COLORS.trim, 0.9).strokePoints(gem, true);
    }
    this.hudTexts.push(this.add.text(px + 160, py + 78, `BP`, textStyle(12, COLORS.textGold)));

    // ステータスアイコン
    const statusStr = h.statuses.map((s) => STATUS_DISPLAY_NAME[s.type]).join(' ');
    if (statusStr) {
      this.hudTexts.push(this.add.text(px + 200, py + 78, statusStr, textStyle(11, COLORS.textRed)));
    }

    // 仲間の小型パネル (右隣に縦積み)
    this.heroes.slice(1).forEach((m, i) => {
      const mx = px + 372;
      const my = py + i * 62;
      paintPanel(this.hudG, mx, my, 214, 56, { alpha: 0.9, ornate: false });
      this.hudTexts.push(this.add.text(mx + 10, my + 5,
        m.isAlive ? m.name.split('・')[0] : `${m.name.split('・')[0]} (戦闘不能)`,
        textStyle(12, m.isAlive ? COLORS.text : '#77445a')));
      const mHp = this.hpOf(m);
      drawBar(this.hudG, mx + 10, my + 24, 128, 9, mHp / m.base.maxHP,
        mHp / m.base.maxHP > 0.3 ? COLORS.hpBar : COLORS.hpBarLow);
      this.hudTexts.push(this.add.text(mx + 146, my + 20,
        `${mHp}/${m.base.maxHP}`, latinStyle(10)));
      // 仲間もスキルを使うので MP も出す
      drawBar(this.hudG, mx + 10, my + 37, 128, 5, m.mp / Math.max(1, m.base.maxMP), COLORS.mpBar);
      this.hudTexts.push(this.add.text(mx + 146, my + 33,
        `MP ${m.mp}`, latinStyle(9, COLORS.textBlue)));
      for (let b = 0; b < 5; b++) {
        this.hudG.fillStyle(b < m.bp ? COLORS.bpBar : 0x201a2c, 1)
          .fillCircle(mx + 15 + b * 14, my + 49, 4);
      }
      const st = m.statuses.map((s) => STATUS_DISPLAY_NAME[s.type]).join(' ');
      if (st) this.hudTexts.push(this.add.text(mx + 90, my + 44, st, textStyle(9, COLORS.textRed)));
    });

    // 敵HP・シールド更新
    for (const sprite of this.enemySprites) {
      const c = sprite.getData('combatant') as Combatant;
      const hpText = sprite.getData('hpText') as Phaser.GameObjects.Text;
      const shieldText = sprite.getData('shieldText') as Phaser.GameObjects.Text;
      hpText.setText(c.isAlive ? `HP ${this.hpOf(c)}/${c.base.maxHP}` : '');
      if (c.maxShields > 0 && c.isAlive) {
        shieldText.setText(c.isBroken ? 'BREAK!' : '🛡'.repeat(c.currentShields));
        shieldText.setColor(c.isBroken ? '#ffd24a' : '#8fc2ee');
      } else {
        shieldText.setText('');
      }
      const statusLine = c.statuses.map((s) => STATUS_DISPLAY_NAME[s.type]).join(' ');
      let st = sprite.getData('statusText') as Phaser.GameObjects.Text | undefined;
      if (!st) {
        st = this.add.text(0, (sprite.getData('labelTop') as number) - 17,
          '', textStyle(10, COLORS.textRed, { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5);
        sprite.add(st);
        sprite.setData('statusText', st);
      }
      st.setText(statusLine);
    }
  }

  // ── コマンドメニュー (2列 / 多スキル対応 / 手番のヒーロー用) ────────
  private showCommandMenu(): void {
    this.hideCommandMenu();
    this.armedCommand = -1;
    const { width, height } = this.scale;
    const h = this.engine.activeCombatant?.isPlayer ? this.engine.activeCombatant : this.hero;
    const items: Phaser.GameObjects.GameObject[] = [];

    const entries = h.skills.filter((s) => !s.isPassive);
    const rows = Math.max(3, Math.ceil((entries.length + 1) / 2));
    const panelH = 76 + rows * 30 + 16;
    const panelW = 620;

    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x000000, 0.001);
    const frame = this.add.graphics();
    paintPanel(frame, -panelW / 2, -panelH / 2, panelW, panelH, { alpha: 0.96 });
    items.push(frame, bg);
    const topY = -panelH / 2 + 18;

    // 手番表示 + ブースト選択
    items.push(this.add.text(-panelW / 2 + 20, topY - 2, `▶ ${h.name}`,
      textStyle(15, COLORS.textGold)));
    items.push(this.add.text(-panelW / 2 + 200, topY, `ブースト (BP ${h.bp})`,
      textStyle(14, COLORS.textGold)));
    for (let lv = 0; lv <= 3; lv++) {
      const canUse = lv <= Math.min(h.bp, 3);
      const btn = this.add.text(80 + lv * 56, topY + 8, `×${lv}`, textStyle(15,
        lv === this.boostLevel ? COLORS.textGold : canUse ? COLORS.text : '#443d55'))
        .setOrigin(0.5);
      if (canUse) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.boostLevel = lv;
          this.hideCommandMenu();
          this.showCommandMenu();
        });
      }
      items.push(btn);
    }

    // コマンド一覧: 通常攻撃 + スキル (2列)
    const colX = [-panelW / 2 + 20, 16];
    const listTop = topY + 36;

    const addCommand = (
      index: number, label: string, color: string, enabled: boolean,
      skill: SkillDef | null, onPick: () => void,
    ) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const btn = this.add.text(colX[col], listTop + row * 30, label,
        textStyle(14, enabled ? color : '#554d66'));
      const describe = () => {
        if (skill) {
          // ブースト選択中はスキル別の強化内容 (BoostSkillResolver) を表示
          const preview = this.boostLevel > 0
            ? `\n【ブースト×${this.boostLevel}】${getBoostPreview(skill, this.boostLevel)}`
            : '';
          this.msgText.setText(skill.description + preview);
        } else {
          this.msgText.setText('武器で攻撃する。');
        }
      };
      if (enabled) {
        btn.setInteractive({ useHandCursor: true })
          .on('pointerover', (pointer: Phaser.Input.Pointer) => {
            if (pointer.wasTouch) return;   // タッチはタップ側で説明を出す (案内文を上書きしない)
            describe();
            btn.setColor(COLORS.textGold);
          })
          .on('pointerout', () => { if (this.armedCommand !== index) btn.setColor(color); })
          .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // タッチではホバーが無いので、1回目のタップで説明を出し、2回目で決定する
            if (pointer.wasTouch && this.armedCommand !== index) {
              this.armedCommand = index;
              describe();
              this.msgText.setText(`${this.msgText.text}\n（もう一度タップで決定）`);
              for (const t of commandTexts) t.setColor(t === btn ? COLORS.textGold : (t.getData('baseColor') as string));
              return;
            }
            onPick();
          });
      }
      btn.setData('baseColor', enabled ? color : '#554d66');
      commandTexts.push(btn);
      items.push(btn);
    };
    const commandTexts: Phaser.GameObjects.Text[] = [];

    addCommand(0, '⚔ 攻撃', COLORS.text, true, null, () => {
      this.selectTarget((idx) => {
        this.submitCommandWithBoost({ type: 'attack', targetIndex: idx, boostLevel: this.boostLevel });
      });
    });

    const livingEnemies = this.engine.enemies.filter((e) => e.isAlive).length;
    entries.forEach((skill, i) => {
      let enabled = h.mp >= skill.mpCost && !h.isSilenced;
      let note = '';
      // 蘇生: 戦闘不能の味方がいなければ使用不可
      if (skill.revive && !this.engine.heroes.some((x: Combatant) => !x.isAlive)) {
        enabled = false;
        note = ' (対象なし)';
      }
      // 因果の鎖(2体版): 敵が2体未満なら不可
      if (skill.causalChain && !skill.causalChain.all && livingEnemies < 2) {
        enabled = false;
        note = ' (対象不足)';
      }
      const label = `${skill.name} ${skill.mpCost > 0 ? `MP${skill.mpCost}` : ''}${note}`;
      addCommand(i + 1, label, COLORS.text, enabled, skill, () => {
        if (this.skillNeedsEnemyTarget(skill)) {
          this.selectTarget((idx) => {
            this.submitCommandWithBoost({ type: 'skill', skill, targetIndex: idx, boostLevel: this.boostLevel });
          });
        } else {
          this.submitCommandWithBoost({ type: 'skill', skill, targetIndex: 0, boostLevel: this.boostLevel });
        }
      });
    });

    if (h.isSilenced) {
      items.push(this.add.text(-panelW / 2 + 20, panelH / 2 - 24,
        '【沈黙】スキル使用不可', textStyle(12, COLORS.textRed)));
    }

    // 仲間がいるときは右に寄せ、左下の仲間パネル (HP・MP) を隠さない
    const menuX = this.heroes.length > 1 ? width - 24 - panelW / 2 : width / 2;
    this.commandContainer = this.add.container(menuX, height - 20 - panelH / 2, items).setDepth(60);
  }

  private skillNeedsEnemyTarget(skill: SkillDef): boolean {
    if (skill.hitsAllEnemies || skill.isHeal || skill.fullHeal) return false;
    if (skill.revive || skill.cleanse || skill.regenFlat || skill.barrier) return false;
    return skill.basePower > 0 || !!skill.appliedStatus || !!skill.debuff
      || !!skill.absorb || !!skill.deathSentence
      || (!!skill.causalChain && !skill.causalChain.all);
  }

  private submitCommandWithBoost(cmd: PlayerCommand): void {
    this.boostLevel = 0;
    this.submitCommand(cmd);
  }

  private hideCommandMenu(): void {
    this.commandContainer?.destroy();
    this.commandContainer = null;
    this.clearTargetSelectors();
  }

  private targetSelectors: Phaser.GameObjects.GameObject[] = [];

  private selectTarget(onPick: (index: number) => void): void {
    this.clearTargetSelectors();
    const living = this.engine.enemies
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.isAlive);

    if (living.length === 1) { onPick(living[0].i); return; }

    for (const { e, i } of living) {
      const sprite = this.findEnemySprite(e);
      if (!sprite) continue;
      const markerY = sprite.y + (sprite.getData('labelTop') as number) - 40;
      const marker = this.add.text(sprite.x, markerY, '▼', textStyle(26, COLORS.textGold))
        .setOrigin(0.5).setDepth(70)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.clearTargetSelectors(); onPick(i); });
      this.tweens.add({ targets: marker, y: marker.y - 8, duration: 400, yoyo: true, repeat: -1 });
      const hitW = Math.max(110, sprite.getData('bodyW') as number);
      const hitH = Math.max(140, sprite.getData('bodyH') as number);
      const hit = this.add.rectangle(sprite.x, sprite.y, hitW, hitH, 0xffffff, 0.001)
        .setDepth(69)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.clearTargetSelectors(); onPick(i); });
      this.targetSelectors.push(marker, hit);
    }
  }

  private clearTargetSelectors(): void {
    this.targetSelectors.forEach((t) => t.destroy());
    this.targetSelectors = [];
  }

  // ── 決着処理 ────────────────────────────────────────────────────────
  private onBattleEnd(): void {
    // 刻んだ技は勝敗に関係なく記録 (次の旅で持ち込む候補になる)
    if (this.engine.absorbedThisBattle.length > 0) recordGrimoire(this.engine.absorbedThisBattle);
    if (this.engine.over === 'victory') {
      this.onVictory();
    } else {
      this.onDefeat();
    }
  }

  private onVictory(): void {
    const run = this.run;
    // 主人公が倒れていてもパーティ勝利ならHP1で生還
    run.currentHP = Math.max(1, this.hero.hp);
    // 仲間のHPを永続化 (戦闘不能は0のまま — 蘇生スキルか焚き火で復帰)
    run.partyMembers.forEach((m, i) => {
      const c = this.heroes[i + 1];
      if (c) m.currentHP = c.hp;
    });
    const units = partyUnits(run);
    run.battlesWon++;
    run.totalRoomsCleared++;
    run.enemiesKilled += this.enemyDefs.length;

    // ゼノ: このバトルで吸収したスキルを、刻んだ本人のグリモワールに永続化
    for (const { skillId, user } of this.engine.absorbedBy) {
      const unit = units[this.heroes.indexOf(user)] ?? run;
      if (!unit.absorbedSkillIds.includes(skillId)) unit.absorbedSkillIds.push(skillId);
    }

    const isElite = this.nodeType === 'EliteBattle';
    const isBoss = this.nodeType === 'Boss';

    // ゴールド (レリック補正 + 賞金首の手配書: エリート2倍)
    const rewards = computeRewards(this.enemyDefs);
    let gold = modifyGoldDrop(run, rewards.gold);
    if (isElite && hasEffect(run, 'EliteHunter')) gold *= 2;
    run.gold += gold;
    run.goldEarned += gold;

    const levelResult = addExp(run, rewards.exp);
    const newSkills = addJP(run, rewards.jp);
    // 仲間も主人公と同じ量の EXP・JP を個別に得る (戦闘不能でも得る)
    const memberGains = run.partyMembers.map((m) => ({
      name: shortName(getCharacter(m.characterId).name),
      level: addExp(run, rewards.exp, m),
      skills: addJP(run, rewards.jp, m),
      unit: m,
    }));

    // レリック報酬抽選 (LootSystem.BuildChoices 準拠)
    const lootChoices = buildBattleLoot(run, isElite, isBoss);
    // 魂の吊灯籠: 10体撃破ごとにレリック1つ確定
    for (let i = 0; i < this.engine.soulSiphonRewards; i++) {
      const bonus = drawRelic(run, rollRelicRarity(run.sanity, false));
      if (bonus) lootChoices.push(bonus);
    }

    const lines = [`◈ ${gold} G　　EXP +${rewards.exp}　　JP +${rewards.jp}`];
    if (levelResult.levelsGained.length > 0) {
      lines.push(`レベルアップ！ → Lv.${run.characterLevel}（最大HP +${levelResult.hpGained}）`);
    }
    if (newSkills.length > 0) {
      lines.push(`新スキル習得: ${newSkills.map((s: SkillDef) => s.name).join('、')}`);
    }
    for (const g of memberGains) {
      const parts: string[] = [];
      if (g.level.levelsGained.length > 0) parts.push(`Lv.${g.unit.characterLevel}`);
      if (g.skills.length > 0) parts.push(`新スキル ${g.skills.map((sk) => sk.name).join('、')}`);
      if (parts.length > 0) lines.push(`${g.name}: ${parts.join('　')}`);
    }
    // 主人公のひとこと (レベルアップ時はその台詞を優先)
    const heroLines = this.linesOf(this.hero);
    const quote = (levelResult.levelsGained.length > 0 ? pickLine(heroLines?.levelUp) : null)
      ?? pickLine(heroLines?.victory);
    if (quote) lines.push(`${shortName(this.hero.name)}「${quote}」`);

    // 報酬は付与済み。ここで中断しても、再開時は戦闘ではなく遺物選択から
    run.pendingEncounter = {
      ...(run.pendingEncounter ?? { scene: 'Battle', nodeType: this.nodeType, contentSeed: this.contentSeed }),
      reward: { lines, loot: lootChoices.map((r) => r.id), isBoss },
    };
    saveRun(run);
    recordEnemyKills(this.enemyDefs.map((d) => d.id));
    notifyAchievements(this, run);

    this.showVictoryPanel(lines, lootChoices, isBoss);
  }

  // ── 勝利パネル + レリック選択 (LootSystem.ShowChoicePanel 相当) ─────
  private showVictoryPanel(lines: string[], loot: RelicDef[], isBoss: boolean): void {
    const { width, height } = this.scale;
    const hasLoot = loot.length > 0;
    const panelH = hasLoot ? 420 : 240;
    const cy = height / 2;

    const done = () => {
      this.run.pendingEncounter = null;   // このノードは完了
      saveRun(this.run);
      if (isBoss) this.onFloorClear();
      else this.scene.start('Map');
    };

    drawPanel(this, width / 2, cy, Math.max(620, loot.length * 200 + 60), panelH, { alpha: 0.97, depth: 80 });
    this.add.text(width / 2, cy - panelH / 2 + 34, 'VICTORY', latinStyle(30, COLORS.textGold, true))
      .setOrigin(0.5).setDepth(81).setLetterSpacing(8);
    drawOrnamentLine(this, width / 2, cy - panelH / 2 + 58, 320).setDepth(81);
    this.add.text(width / 2, cy - panelH / 2 + 88, lines.join('\n'),
      textStyle(15, COLORS.text, { align: 'center', lineSpacing: 8 }))
      .setOrigin(0.5).setDepth(81);

    if (!hasLoot) {
      makeButton(this, width / 2, cy + panelH / 2 - 44, isBoss ? '先へ進む' : 'マップへ戻る',
        done, { width: 260 }).setDepth(82);
      return;
    }

    this.add.text(width / 2, cy - 44, '遺物を1つ選べ', textStyle(17, COLORS.textGold))
      .setOrigin(0.5).setDepth(81);

    const cardW = 190;
    const startX = width / 2 - ((loot.length - 1) * (cardW + 12)) / 2;
    loot.forEach((relic, i) => {
      const x = startX + i * (cardW + 12);
      const y = cy + 60;
      const rarityColor = Phaser.Display.Color.HexStringToColor(RARITY_COLOR[relic.rarity]).color;
      const card = this.add.rectangle(x, y, cardW, 180, 0x150f20, 0.98)
        .setStrokeStyle(1, COLORS.trim).setDepth(81)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { card.setStrokeStyle(2, COLORS.trimBright); card.setFillStyle(0x221832, 1); })
        .on('pointerout', () => { card.setStrokeStyle(1, COLORS.trim); card.setFillStyle(0x150f20, 0.98); })
        .on('pointerdown', () => {
          const gained = addRelicToRun(this.run, relic);
          this.msgText.setText(gained.length > 1
            ? `「${relic.name}」を得た！ 合わせ鏡が「${gained[1].name}」を複製した！`
            : `「${relic.name}」を得た！`);
          done();
        });
      // 上端にレアリティ色の帯
      this.add.rectangle(x, y - 89, cardW - 2, 3, rarityColor, 0.9).setDepth(82);
      this.add.text(x, y - 64, `【${RARITY_LABEL[relic.rarity]}】`,
        textStyle(11, RARITY_COLOR[relic.rarity])).setOrigin(0.5).setDepth(82);
      this.add.text(x, y - 40, relic.name, textStyle(15, COLORS.textGold, {
        wordWrap: { width: cardW - 20 }, align: 'center',
      })).setOrigin(0.5).setDepth(82);
      this.add.text(x, y + 16, relic.description, textStyle(11, COLORS.text, {
        wordWrap: { width: cardW - 20 }, align: 'center',
      })).setOrigin(0.5).setDepth(82);
    });

    makeButton(this, width / 2, cy + panelH / 2 - 28, '受け取らない', done,
      { width: 220, height: 40, fontSize: 14 }).setDepth(82);
  }

  /** フロアクリア回復。仲間は墓標「回復の章」の+5%を除いた割合で回復し、戦闘不能でも起き上がる */
  private floorClearHeal(heroPct: number): void {
    const run = this.run;
    const memberPct = heroPct - (run.metaFloorClearExtraHeal ? 0.05 : 0);
    for (const unit of partyUnits(run)) {
      const max = getEffectiveMaxHP(run, unit);
      const pct = unit === run ? heroPct : memberPct;
      unit.currentHP = Math.min(max, unit.currentHP + Math.round(max * pct));
    }
  }

  private onFloorClear(): void {
    const run = this.run;

    // Floor 4 (最終層) ボス撃破 → エンディング
    if (run.currentFloor >= 4) {
      saveRun(run);
      this.scene.start('Result', { won: true, finale: true });
      return;
    }

    // Floor 3 (ヴァルゴット) 撃破
    if (run.currentFloor >= FLOORS.length - 1) {
      if (run.activeEnding) {
        // 証印あり: 最終層へ (EndingSystem.CreateFloor4)
        run.currentFloor = 4;
        run.currentNodeId = -1;
        run.map = null;
        // フロアクリア回復はそのまま適用
        let healPct0 = 0.30;
        if (run.metaFloorClearExtraHeal) healPct0 += 0.05;
        healPct0 += sumEffect(run, 'FloorClearHeal');
        this.floorClearHeal(healPct0);
        saveRun(run);
        this.scene.start('Finale');
      } else {
        // 証印なし: ヴァルゴットが最終ボス — デフォルトエンディング
        this.scene.start('Result', { won: true, finale: true });
      }
      return;
    }

    // 次フロアへ (フロアクリア回復: 基本30% + メタ「回復の章」+5% + 安息の泉石)
    let healPct = 0.30;
    if (run.metaFloorClearExtraHeal) healPct += 0.05;
    healPct += sumEffect(run, 'FloorClearHeal');
    this.floorClearHeal(healPct);
    const maxHP = getEffectiveMaxHP(run);

    // 巡礼者の礎石: フロアクリアごとにバリア蓄積 (RelicManager.NotifyFloorCleared)
    const shieldPct = sumEffect(run, 'ShieldPerFloor');
    if (shieldPct > 0) run.shieldBarrier += Math.round(maxHP * shieldPct);

    const wasFloor0 = run.currentFloor === 0;
    run.currentFloor++;
    run.currentNodeId = -1;
    run.map = null;   // 次フロアのマップは MapScene で生成
    saveRun(run);

    // Floor 0 クリア時に一度だけ幻影加入イベント (RoguelikeManager.PhantomJoinEvent)
    if (wasFloor0 && !run.phantomEventDone) {
      this.scene.start('PhantomJoin');
    } else {
      this.scene.start('Map');
    }
  }

  private onDefeat(): void {
    this.run.currentHP = 0;
    // 最終層ボスに敗れた場合は敗北エンディングの語りを表示
    const finale = this.run.currentFloor >= 4;
    this.scene.start('Result', { won: false, finale });
  }
}
