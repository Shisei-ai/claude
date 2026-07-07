// バトルシーン — Unity版 UI/BattleUI.cs 相当の簡易UI + BattleEngine 駆動
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawBar } from '../ui/theme';
import { BattleEngine, Combatant, type BattleEvent, type PlayerCommand } from '../battle/engine';
import { pickEncounter, buildHeroes, buildEnemies, computeRewards } from '../battle/setup';
import { loadRun, saveRun, clearRun } from '../core/save';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP } from '../core/run';
import { addExp, addJP } from '../core/level';
import type { EnemyDef, NodeType, SkillDef } from '../core/types';
import { STATUS_DISPLAY_NAME } from '../core/types';
import { FLOORS } from '../data/enemies';
import { getCharacter } from '../data/characters';
import { RelicBattleState } from '../battle/relicHooks';
import { getBoostPreview } from '../battle/boost';
import {
  buildBattleLoot, addRelicToRun, modifyGoldDrop, hasEffect, sumEffect,
  drawRelic, rollRelicRarity,
} from '../core/relics';
import { RARITY_LABEL, RARITY_COLOR, type RelicDef } from '../data/relics';

interface BattleInit { nodeType: NodeType; contentSeed: number }

export class BattleScene extends Phaser.Scene {
  private run!: RunState;
  private engine!: BattleEngine;
  private enemyDefs!: EnemyDef[];
  private nodeType!: NodeType;

  private hero!: Combatant;                 // 主人公 (heroes[0])
  private heroes: Combatant[] = [];
  private heroSprites: Phaser.GameObjects.Rectangle[] = [];
  private enemySprites: Phaser.GameObjects.Container[] = [];
  private msgText!: Phaser.GameObjects.Text;
  private hudG!: Phaser.GameObjects.Graphics;
  private hudTexts: Phaser.GameObjects.Text[] = [];
  private commandContainer: Phaser.GameObjects.Container | null = null;
  private boostLevel = 0;
  private processing = false;

  constructor() { super('Battle'); }

  init(data: BattleInit): void {
    this.nodeType = data.nodeType;
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

    // 背景 (フロアごとに色味を変える)
    const floorTints = [0x0d0a16, 0x08120a, 0x160810, 0x14100a];
    this.add.rectangle(width / 2, height / 2, width, height,
      floorTints[Math.min(this.run.currentFloor, 3)]);
    this.add.rectangle(width / 2, height - 170, width, 2, 0x3a3050);  // 地面線

    // エンジン構築 (主人公+幻影パーティ)
    this.heroes = buildHeroes(this.run);
    this.hero = this.heroes[0];
    const isFirstCombat = this.run.battlesWon === 0;
    const enemies = buildEnemies(this.run, this.enemyDefs, this.nodeType, isFirstCombat);
    if (isFirstCombat && this.run.blessingFirstCombatShieldReduction) {
      this.run.blessingFirstCombatShieldReduction = false;
    }
    const relicState = new RelicBattleState(this.run);
    this.engine = new BattleEngine(this.heroes, enemies, this.run.metaStartBP, relicState);

    // ヒーロー描画 (左側・最大3人)
    this.heroSprites = [];
    this.heroes.forEach((h, i) => {
      const x = 220 - i * 10 + (i > 0 ? (i === 1 ? -90 : 90) : 0);
      const y = height - 260 - (i > 0 ? 60 : 0);
      const color = getCharacter(h.characterId ?? this.run.characterId).themeColor;
      const sprite = this.add.rectangle(x, y, i === 0 ? 72 : 58, i === 0 ? 110 : 88, color, 0.95)
        .setStrokeStyle(2, 0xd8d0e8);
      this.add.text(x, y + (i === 0 ? 70 : 58), h.name.split('・')[0], textStyle(i === 0 ? 14 : 12)).setOrigin(0.5);
      if (!h.isAlive) sprite.setAlpha(0.25);
      this.heroSprites.push(sprite);
    });

    // 敵描画 (右側)
    enemies.forEach((e, i) => {
      const x = width - 200 - i * 180;
      const y = height - 270;
      const size = e.enemyDef!.rank === 'Boss' ? 130 : e.enemyDef!.rank === 'Elite' ? 100 : 76;
      const rect = this.add.rectangle(0, 0, size * 0.7, size, e.enemyDef!.tint, 0.95)
        .setStrokeStyle(2, 0x000000);
      const nameText = this.add.text(0, size / 2 + 14, e.name, textStyle(12)).setOrigin(0.5);
      const hpText = this.add.text(0, size / 2 + 32, '', textStyle(11, COLORS.textDim)).setOrigin(0.5);
      const shieldText = this.add.text(0, -size / 2 - 16, '', textStyle(13, '#8fc2ee')).setOrigin(0.5);
      const container = this.add.container(x, y, [rect, nameText, hpText, shieldText]);
      // 鑑定士の片眼鏡: 弱点を常時表示
      if (hasEffect(this.run, 'WeaknessReveal')) {
        const weakStr = '弱点: ' + e.enemyDef!.elementWeaknesses.join('/');
        container.add(this.add.text(0, size / 2 + 48, weakStr, textStyle(10, COLORS.textGold)).setOrigin(0.5));
      }
      container.setData({ combatant: e, rect, hpText, shieldText });
      this.enemySprites.push(container);
    });

    // メッセージ帯
    this.add.rectangle(width / 2, 60, width - 60, 44, 0x000000, 0.6)
      .setStrokeStyle(1, COLORS.border);
    this.msgText = this.add.text(width / 2, 60, `${this.enemyDefs.map((d) => d.name).join('、')} が現れた！`,
      textStyle(17)).setOrigin(0.5);

    // HUD領域
    this.hudG = this.add.graphics();
    this.refreshDisplay();

    // 開始
    this.time.delayedCall(700, () => this.progress());
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
      const delay = this.renderEvent(e);
      this.refreshDisplay();
      this.time.delayedCall(delay, step);
    };
    step();
  }

  private renderEvent(e: BattleEvent): number {
    switch (e.kind) {
      case 'message':
        this.msgText.setText(e.text);
        return 550;
      case 'skillUse':
        this.msgText.setText(`${e.user.name} の ${e.skillName}！`);
        return 420;
      case 'damage': {
        this.spawnDamageNumber(e.target, e.amount,
          e.isCrit ? '#ffd24a' : '#ffffff', e.isCrit, e.isWeak);
        this.flashCombatant(e.target);
        return e.isCrit ? 480 : 320;
      }
      case 'dot':
        this.spawnDamageNumber(e.target, e.amount, '#b070e0', false, false);
        return 350;
      case 'heal':
        this.spawnDamageNumber(e.target, e.amount, '#6ade8a', false, false, '+');
        return 350;
      case 'status':
        if (e.applied) {
          this.msgText.setText(`${e.target.name} に ${STATUS_DISPLAY_NAME[e.status]}`);
          return 380;
        }
        return 60;
      case 'shieldHit':
        return 160;
      case 'shadow': {
        if (e.target.isPlayer) {
          this.heroSpriteOf(e.target)?.setAlpha(e.active ? 0.55 : 1);
          if (e.active) this.msgText.setText(`${e.target.name} は影に溶けた…`);
        }
        return e.active ? 420 : 100;
      }
      case 'absorb':
        this.msgText.setText(`「${e.skillName}」をグリモワールに刻んだ！`);
        return 700;
      case 'break': {
        this.msgText.setText(`⚡ ${e.target.name} を Break！`);
        this.cameras.main.shake(200, 0.008);
        return 600;
      }
      case 'defeat': {
        const sprite = this.findEnemySprite(e.target);
        if (sprite) {
          this.tweens.add({ targets: sprite, alpha: 0, duration: 400 });
        }
        if (e.target.isPlayer) {
          this.heroSpriteOf(e.target)?.setAlpha(0.25);
          this.msgText.setText(`${e.target.name} は倒れた…`);
          return 600;
        }
        this.msgText.setText(`${e.target.name} を倒した！`);
        return 500;
      }
      case 'victory':
        this.msgText.setText('勝利！');
        return 600;
      case 'defeat_party':
        this.msgText.setText(`${this.hero.name} は倒れた…`);
        return 900;
    }
  }

  private findEnemySprite(c: Combatant): Phaser.GameObjects.Container | undefined {
    return this.enemySprites.find((s) => s.getData('combatant') === c);
  }

  private heroSpriteOf(c: Combatant): Phaser.GameObjects.Rectangle | undefined {
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
    const label = `${prefix}${amount}${isWeak ? ' 弱点!' : ''}`;
    const txt = this.add.text(x, y, label, textStyle(isCrit ? 30 : 22, color, {
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    })).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: txt, y: y - 46, alpha: 0, duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private flashCombatant(target: Combatant): void {
    const obj = target.isPlayer ? this.heroSpriteOf(target) : this.findEnemySprite(target)?.getData('rect');
    if (!obj) return;
    this.tweens.add({
      targets: obj, alpha: { from: 1, to: 0.3 }, duration: 80, yoyo: true, repeat: 1,
    });
  }

  // ── HUD更新 ────────────────────────────────────────────────────────
  private refreshDisplay(): void {
    const { width, height } = this.scale;
    this.hudG.clear();
    this.hudTexts.forEach((t) => t.destroy());
    this.hudTexts = [];

    // ヒーローパネル (左下・パーティ全員)
    const panelH = 120;
    const px = 40, py = height - 150;
    this.hudG.fillStyle(0x0e0a18, 0.92).fillRect(px, py, 360, panelH);
    this.hudG.lineStyle(1, COLORS.border).strokeRect(px, py, 360, panelH);
    const h = this.hero;

    this.hudTexts.push(this.add.text(px + 14, py + 8,
      `${h.name}`, textStyle(15)));
    drawBar(this.hudG, px + 14, py + 34, 240, 14, h.hp / h.base.maxHP,
      h.hp / h.base.maxHP > 0.3 ? COLORS.hpBar : COLORS.hpBarLow);
    this.hudTexts.push(this.add.text(px + 260, py + 32,
      `${h.hp}/${h.base.maxHP}`, textStyle(12)));
    drawBar(this.hudG, px + 14, py + 56, 240, 10, h.mp / Math.max(1, h.base.maxMP), COLORS.mpBar);
    this.hudTexts.push(this.add.text(px + 260, py + 52,
      `MP ${h.mp}/${h.base.maxMP}`, textStyle(11, COLORS.textBlue)));

    // BP
    for (let i = 0; i < 5; i++) {
      const filled = i < h.bp;
      this.hudG.fillStyle(filled ? COLORS.bpBar : 0x201a2c, 1)
        .fillCircle(px + 24 + i * 26, py + 86, 9);
      this.hudG.lineStyle(1, 0x000000).strokeCircle(px + 24 + i * 26, py + 86, 9);
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
      this.hudG.fillStyle(0x0e0a18, 0.92).fillRect(mx, my, 250, 56);
      this.hudG.lineStyle(1, COLORS.border).strokeRect(mx, my, 250, 56);
      this.hudTexts.push(this.add.text(mx + 10, my + 5,
        m.isAlive ? m.name.split('・')[0] : `${m.name.split('・')[0]} (戦闘不能)`,
        textStyle(12, m.isAlive ? COLORS.text : '#77445a')));
      drawBar(this.hudG, mx + 10, my + 28, 160, 10, m.hp / m.base.maxHP,
        m.hp / m.base.maxHP > 0.3 ? COLORS.hpBar : COLORS.hpBarLow);
      this.hudTexts.push(this.add.text(mx + 178, my + 24,
        `${m.hp}/${m.base.maxHP}`, textStyle(10)));
      for (let b = 0; b < 5; b++) {
        this.hudG.fillStyle(b < m.bp ? COLORS.bpBar : 0x201a2c, 1)
          .fillCircle(mx + 16 + b * 16, my + 47, 5);
      }
    });

    // 敵HP・シールド更新
    for (const sprite of this.enemySprites) {
      const c = sprite.getData('combatant') as Combatant;
      const hpText = sprite.getData('hpText') as Phaser.GameObjects.Text;
      const shieldText = sprite.getData('shieldText') as Phaser.GameObjects.Text;
      hpText.setText(c.isAlive ? `HP ${c.hp}/${c.base.maxHP}` : '');
      if (c.maxShields > 0 && c.isAlive) {
        shieldText.setText(c.isBroken ? 'BREAK!' : '🛡'.repeat(c.currentShields));
        shieldText.setColor(c.isBroken ? '#ffd24a' : '#8fc2ee');
      } else {
        shieldText.setText('');
      }
      const statusLine = c.statuses.map((s) => STATUS_DISPLAY_NAME[s.type]).join(' ');
      let st = sprite.getData('statusText') as Phaser.GameObjects.Text | undefined;
      if (!st) {
        st = this.add.text(0, -((sprite.getData('rect') as Phaser.GameObjects.Rectangle).height / 2) - 34,
          '', textStyle(10, COLORS.textRed)).setOrigin(0.5);
        sprite.add(st);
        sprite.setData('statusText', st);
      }
      st.setText(statusLine);
    }
  }

  // ── コマンドメニュー (2列 / 多スキル対応 / 手番のヒーロー用) ────────
  private showCommandMenu(): void {
    this.hideCommandMenu();
    const { width, height } = this.scale;
    const h = this.engine.activeCombatant?.isPlayer ? this.engine.activeCombatant : this.hero;
    const items: Phaser.GameObjects.GameObject[] = [];

    const entries = h.skills.filter((s) => !s.isPassive);
    const rows = Math.max(3, Math.ceil((entries.length + 1) / 2));
    const panelH = 76 + rows * 30 + 16;
    const panelW = 620;

    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0e0a18, 0.96)
      .setStrokeStyle(1, COLORS.borderBright);
    items.push(bg);
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
      if (enabled) {
        btn.setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            if (skill) {
              // ブースト選択中はスキル別の強化内容 (BoostSkillResolver) を表示
              const preview = this.boostLevel > 0
                ? `\n【ブースト×${this.boostLevel}】${getBoostPreview(skill, this.boostLevel)}`
                : '';
              this.msgText.setText(skill.description + preview);
            }
            btn.setColor(COLORS.textGold);
          })
          .on('pointerout', () => btn.setColor(color))
          .on('pointerdown', onPick);
      }
      items.push(btn);
    };

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

    this.commandContainer = this.add.container(width / 2, height - 20 - panelH / 2, items).setDepth(60);
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
      const marker = this.add.text(sprite.x, sprite.y - 100, '▼', textStyle(26, COLORS.textGold))
        .setOrigin(0.5).setDepth(70)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.clearTargetSelectors(); onPick(i); });
      this.tweens.add({ targets: marker, y: marker.y - 8, duration: 400, yoyo: true, repeat: -1 });
      const hit = this.add.rectangle(sprite.x, sprite.y, 140, 160, 0xffffff, 0.001)
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
    // 仲間のHPを永続化 (戦闘不能は0のまま — 蘇生スキルでのみ復帰)
    run.partyMembers.forEach((m, i) => {
      const c = this.heroes[i + 1];
      if (c) m.currentHP = c.hp;
    });
    run.battlesWon++;
    run.totalRoomsCleared++;
    run.enemiesKilled += this.enemyDefs.length;

    // ゼノ: このバトルで吸収したスキルをランに永続化
    for (const id of this.engine.absorbedThisBattle) {
      if (!run.absorbedSkillIds.includes(id)) run.absorbedSkillIds.push(id);
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

    // レリック報酬抽選 (LootSystem.BuildChoices 準拠)
    const lootChoices = buildBattleLoot(run, isElite, isBoss);
    // 魂の吊灯籠: 10体撃破ごとにレリック1つ確定
    for (let i = 0; i < this.engine.soulSiphonRewards; i++) {
      const bonus = drawRelic(run, rollRelicRarity(run.sanity, false));
      if (bonus) lootChoices.push(bonus);
    }

    saveRun(run);

    const lines = [`◈ ${gold} G　　EXP +${rewards.exp}　　JP +${rewards.jp}`];
    if (levelResult.levelsGained.length > 0) {
      lines.push(`レベルアップ！ → Lv.${run.characterLevel}（最大HP +${levelResult.hpGained}）`);
    }
    if (newSkills.length > 0) {
      lines.push(`新スキル習得: ${newSkills.map((s: SkillDef) => s.name).join('、')}`);
    }

    this.showVictoryPanel(lines, lootChoices, isBoss);
  }

  // ── 勝利パネル + レリック選択 (LootSystem.ShowChoicePanel 相当) ─────
  private showVictoryPanel(lines: string[], loot: RelicDef[], isBoss: boolean): void {
    const { width, height } = this.scale;
    const hasLoot = loot.length > 0;
    const panelH = hasLoot ? 420 : 240;
    const cy = height / 2;

    const done = () => {
      saveRun(this.run);
      if (isBoss) this.onFloorClear();
      else this.scene.start('Map');
    };

    this.add.rectangle(width / 2, cy, Math.max(620, loot.length * 200 + 60), panelH, 0x0e0a18, 0.97)
      .setStrokeStyle(2, COLORS.borderBright).setDepth(80);
    this.add.text(width / 2, cy - panelH / 2 + 34, '― 勝利 ―', textStyle(28, COLORS.textGold))
      .setOrigin(0.5).setDepth(81);
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
      const card = this.add.rectangle(x, y, cardW, 180, 0x171226, 0.98)
        .setStrokeStyle(1, COLORS.border).setDepth(81)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => card.setStrokeStyle(2, COLORS.borderBright))
        .on('pointerout', () => card.setStrokeStyle(1, COLORS.border))
        .on('pointerdown', () => {
          const gained = addRelicToRun(this.run, relic);
          this.msgText.setText(gained.length > 1
            ? `「${relic.name}」を得た！ 合わせ鏡が「${gained[1].name}」を複製した！`
            : `「${relic.name}」を得た！`);
          done();
        });
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
        const max0 = getEffectiveMaxHP(run);
        run.currentHP = Math.min(max0, run.currentHP + Math.round(max0 * healPct0));
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
    const maxHP = getEffectiveMaxHP(run);
    run.currentHP = Math.min(maxHP, run.currentHP + Math.round(maxHP * healPct));

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
