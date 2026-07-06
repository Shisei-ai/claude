// 非戦闘ノード — 焚き火 / 商人 / 宝箱 / 未知 / 呪われた間
// RestSiteController.cs (回復30%) を移植。
// 商人・イベント・宝箱・呪いは Unity 版フル機能 (ShopController / EventFactory
// 40種 / LootSystem) の移植まで簡易実装 (フェーズ2)。
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP, healRun, damageRun, earnGold, addSanity } from '../core/run';
import type { NodeType } from '../core/types';
import { Rng } from '../core/rng';
import { FLOORS } from '../data/enemies';

interface NodeEventInit { nodeType: NodeType; contentSeed: number }

export class NodeEventScene extends Phaser.Scene {
  private run!: RunState;
  private nodeType!: NodeType;
  private rng!: Rng;

  constructor() { super('NodeEvent'); }

  init(data: NodeEventInit): void {
    this.nodeType = data.nodeType;
    this.rng = new Rng(data.contentSeed);
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    this.run = run;
  }

  create(): void {
    drawSceneBackground(this);
    switch (this.nodeType) {
      case 'RestSite': this.createRestSite(); break;
      case 'Shop': this.createShop(); break;
      case 'Treasure': this.createTreasure(); break;
      case 'CursedRoom': this.createCursedRoom(); break;
      default: this.createRandomEvent(); break;
    }
  }

  private header(title: string, subtitle: string): void {
    const { width } = this.scale;
    this.add.text(width / 2, 90, title, textStyle(34, COLORS.textGold)).setOrigin(0.5);
    this.add.text(width / 2, 130, subtitle, textStyle(15, COLORS.textDim)).setOrigin(0.5);
  }

  private statusLine(): void {
    const { width, height } = this.scale;
    const maxHP = getEffectiveMaxHP(this.run);
    this.add.text(width / 2, height - 120,
      `HP ${this.run.currentHP}/${maxHP}　　◈ ${this.run.gold} G　　正気度 ${this.run.sanity >= 0 ? '+' : ''}${this.run.sanity}`,
      textStyle(15, COLORS.textDim)).setOrigin(0.5);
  }

  private leave(label = 'マップへ戻る'): void {
    const { width, height } = this.scale;
    makeButton(this, width / 2, height - 64, label, () => {
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 260 });
  }

  private resultAndLeave(message: string, color = COLORS.text): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 + 40, message,
      textStyle(18, color, { align: 'center', lineSpacing: 8 })).setOrigin(0.5);
    this.statusLine();
    this.leave();
  }

  // ── 焚き火 (RestSiteController: 30%回復) ──────────────────────────
  private createRestSite(): void {
    const { width, height } = this.scale;
    this.header('焚き火', '暖かな火が、束の間の安らぎをくれる');

    // 焚き火の簡易描画
    const fire = this.add.text(width / 2, height / 2 - 60, '🔥', { fontSize: '72px' }).setOrigin(0.5);
    this.tweens.add({ targets: fire, scale: { from: 1, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });

    const maxHP = getEffectiveMaxHP(this.run);
    const healAmount = Math.round(maxHP * 0.30);

    this.statusLine();
    makeButton(this, width / 2 - 150, height - 64, `休息する (+${healAmount} HP)`, () => {
      healRun(this.run, healAmount);
      addSanity(this.run, 1);
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 280 });
    makeButton(this, width / 2 + 160, height - 64, '先を急ぐ', () => {
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 260 });
  }

  // ── 商人 (簡易版 / ShopController 移植はフェーズ2) ──────────────────
  private createShop(): void {
    const { width, height } = this.scale;
    this.header('流浪の商人', '「よく来たね、旅人さん。掘り出し物があるよ」');

    const discount = 1 - this.run.metaShopDiscount;
    const maxHP = getEffectiveMaxHP(this.run);

    const items = [
      {
        name: '癒しの秘薬', desc: `HPを30%回復する`, price: Math.round(50 * discount),
        canBuy: () => this.run.currentHP < maxHP,
        buy: () => healRun(this.run, Math.round(maxHP * 0.30)),
      },
      {
        name: '生命の霊薬', desc: `最大HP+15 (このランの間)`, price: Math.round(120 * discount),
        canBuy: () => true,
        buy: () => { this.run.maxHPBase += 15; healRun(this.run, 15); },
      },
      {
        name: '聖なる護符', desc: `正気度+1`, price: Math.round(40 * discount),
        canBuy: () => this.run.sanity < 3,
        buy: () => addSanity(this.run, 1),
      },
    ];

    items.forEach((item, i) => {
      const y = 240 + i * 96;
      const affordable = this.run.gold >= item.price && item.canBuy();
      this.add.rectangle(width / 2, y, 640, 80, 0x171226, 0.95).setStrokeStyle(1, COLORS.border);
      this.add.text(width / 2 - 290, y - 18, item.name, textStyle(18, COLORS.textGold));
      this.add.text(width / 2 - 290, y + 10, item.desc, textStyle(13, COLORS.textDim));
      makeButton(this, width / 2 + 220, y, `${item.price} G`, () => {
        if (this.run.gold < item.price || !item.canBuy()) return;
        this.run.gold -= item.price;
        item.buy();
        saveRun(this.run);
        this.scene.restart({ nodeType: this.nodeType, contentSeed: this.rng.int(0x7fffffff) });
      }, { width: 140, height: 44, fontSize: 16, disabled: !affordable });
    });

    this.statusLine();
    this.leave('店を出る');
  }

  // ── 宝箱 ───────────────────────────────────────────────────────────
  private createTreasure(): void {
    const { width, height } = this.scale;
    this.header('宝箱', '埃を被った箱が静かに佇んでいる');
    this.add.text(width / 2, height / 2 - 60, '▣', textStyle(72, COLORS.textGold)).setOrigin(0.5);

    const floor = FLOORS[Math.min(this.run.currentFloor, FLOORS.length - 1)];
    let gold = floor.baseGoldReward + this.rng.range(10, 41);
    let message = `${gold} G を手に入れた！`;

    // 鍵師の手 (アッシュ): 秘密の宝箱を追加発見
    if (this.run.unlockedSkillIds.includes('SKL_A_Lockpicking')) {
      const secret = 30 + this.rng.range(0, 31);
      gold += secret;
      message += `\n【鍵師の手】隠し宝箱を発見！ 追加で ${secret} G`;
    }

    earnGold(this.run, gold);
    saveRun(this.run);
    this.resultAndLeave(message, COLORS.textGold);
  }

  // ── 呪われた間 ──────────────────────────────────────────────────────
  private createCursedRoom(): void {
    const { width, height } = this.scale;
    this.header('呪われた間', '空気が重い。何かがこちらを見ている——');
    this.add.text(width / 2, height / 2 - 60, '✖', textStyle(72, COLORS.textRed)).setOrigin(0.5);

    const maxHP = getEffectiveMaxHP(this.run);
    // 罠師の知識 (アッシュ): トラップダメージ50%軽減
    const hasTrapMastery = this.run.unlockedSkillIds.includes('SKL_A_TrapMastery');
    const damage = Math.round(maxHP * 0.10 * (hasTrapMastery ? 0.5 : 1));
    const gold = 60 + this.rng.range(0, 41);

    if (hasTrapMastery) {
      this.add.text(width / 2, height / 2 + 10,
        '【罠師の知識】トラップの仕掛けが見える。ダメージを半減できる。',
        textStyle(13, COLORS.textGreen)).setOrigin(0.5);
    }

    this.statusLine();
    makeButton(this, width / 2 - 170, height - 64, `祭壇に触れる (HP-${damage} / +${gold}G)`, () => {
      damageRun(this.run, damage);
      addSanity(this.run, -1);
      earnGold(this.run, gold);
      saveRun(this.run);
      if (this.run.currentHP <= 0) {
        this.scene.start('Result', { won: false });
      } else {
        this.scene.start('Map');
      }
    }, { width: 340 });
    makeButton(this, width / 2 + 180, height - 64, '立ち去る', () => {
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 240 });
  }

  // ── 未知のイベント (簡易版 / EventFactory 40種の移植はフェーズ2) ────
  private createRandomEvent(): void {
    const { width, height } = this.scale;
    this.run.eventsVisited++;

    const events = [
      {
        title: '朽ちた祠',
        text: '道端に小さな祠が残されている。\n祈りを捧げると、微かな光が体を包んだ。',
        apply: () => {
          const heal = Math.round(getEffectiveMaxHP(this.run) * 0.15);
          healRun(this.run, heal);
          addSanity(this.run, 1);
          return `HP +${heal} / 正気度 +1`;
        },
      },
      {
        title: '行き倒れの行商人',
        text: '倒れた行商人の荷袋が落ちている。\n持ち主はもう、この世のものではない。',
        apply: () => {
          const gold = 45 + this.rng.range(0, 31);
          earnGold(this.run, gold);
          addSanity(this.run, -1);
          return `${gold} G を拾った / 正気度 -1`;
        },
      },
      {
        title: '囁く影',
        text: '壁の影が言葉にならない声で囁く。\n聞いてはいけないと分かっていても、耳が離せない。',
        apply: () => {
          addSanity(this.run, -1);
          const gold = 80 + this.rng.range(0, 41);
          earnGold(this.run, gold);
          return `禁忌の知識の対価に ${gold} G / 正気度 -1`;
        },
      },
      {
        title: '澄んだ泉',
        text: '廃墟には似つかわしくない、澄んだ泉が湧いている。\n一口飲むと、疲れが洗い流されていく。',
        apply: () => {
          const heal = Math.round(getEffectiveMaxHP(this.run) * 0.25);
          healRun(this.run, heal);
          return `HP +${heal}`;
        },
      },
    ];

    const ev = events[this.rng.int(events.length)];
    this.header(ev.title, '― 未知との遭遇 ―');
    this.add.text(width / 2, height / 2 - 80, ev.text,
      textStyle(17, COLORS.text, { align: 'center', lineSpacing: 10 })).setOrigin(0.5);

    const result = ev.apply();
    saveRun(this.run);
    this.resultAndLeave(result, COLORS.textGold);
  }
}
