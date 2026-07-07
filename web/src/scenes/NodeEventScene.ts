// 非戦闘ノード — 焚き火 / 商人 / 宝箱 / 未知 / 呪われた間
// RestSiteController.cs (回復30%)・ShopController.cs (在庫生成/価格式/売約管理)・
// EventFactory.cs (全50種) を移植。
// ショップのWeb版適応: デッキ構築が存在しないため、スキル枠(3-4)はJP+25の
// 「修練の書」、サービス「スキル削除」は「呪い解除」、「スキル強化」はJP+50に
// 読み替え。消耗品はインベントリが無いため即時使用型4種に適応 (価格は
// Unity同様一律 ConsumablePrice=40)。価格式・枠数・BlackMarket・装備6回抽選は
// ShopController.cs に忠実。
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP, healRun, damageRun, earnGold, addSanity, canEquip } from '../core/run';
import type { NodeType } from '../core/types';
import { Rng } from '../core/rng';
import { FLOORS } from '../data/enemies';
import {
  modifyHealAmount, modifyShopPrice, modifyEventGold, modifyGoldDrop,
  eventMasterBonus, riskRewardMultiplier, hasEffect, drawRelic,
  rollRelicRarity, addRelicToRun, randomCurse, CURSE_INFO,
} from '../core/relics';
import { RARITY_LABEL, RARITY_COLOR, getRelic, type RelicRarity } from '../data/relics';
import { RANDOM_EVENTS, ENDING_RELIC_ID, type RandomEventDef, type EventChoiceDef, type EventResult } from '../data/events';
import { getEnding } from '../data/endings';
import { addJP } from '../core/level';
import { drawEquipmentForFloor, EQUIP_RARITY_LABEL, EQUIP_RARITY_COLOR, SLOT_LABEL } from '../data/equipment';

interface NodeEventInit { nodeType: NodeType; contentSeed: number }

// ショップ在庫1枠 (ShopController.ShopItem 相当。buy は結果メッセージを返す)
interface ShopEntry {
  tag: string; tagColor: string;
  name: string; desc: string;
  price: number; sold: boolean;
  canBuy: () => boolean;
  buy: () => string;
}

export class NodeEventScene extends Phaser.Scene {
  private run!: RunState;
  private nodeType!: NodeType;
  private rng!: Rng;

  constructor() { super('NodeEvent'); }

  init(data: NodeEventInit): void {
    this.nodeType = data.nodeType;
    this.rng = new Rng(data.contentSeed);
    this.shopStock = [];
    this.shopMessage = '';
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
    // 羽毛の毛布/聖者の遺骨/涸れの呪い: 回復量補正 (RelicManager.ModifyHealAmount)
    const healAmount = modifyHealAmount(this.run, Math.round(maxHP * 0.30));

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

  // ── 商人 (ShopController.cs 移植) ───────────────────────────────────
  private shopStock: ShopEntry[] = [];
  private shopMessage = '';

  private createShop(): void {
    if (this.shopStock.length === 0) this.generateShopStock();
    this.renderShop();
  }

  // ShopController.GenerateStock の移植。在庫は入店時に1度だけ生成し、
  // 購入した枠は「売約済」になる (Unity版の MarkSold 相当)。
  private generateShopStock(): void {
    const run = this.run;
    const floor = run.currentFloor;
    // ApplyMetaDiscount(RelicManager.ModifyShopPrice(...)) 相当
    // (modifyShopPrice がレリック割引+メタ割引を合算・60%上限)
    const price = (base: number) => modifyShopPrice(run, base);
    const stock = this.shopStock;

    // スキル枠 3-4 (SkillBasePrice=75 × (1+floor×0.3))
    // Web版適応: デッキ構築が無いため、購入で JP+25 を得る「修練の書」
    const skillCount = this.rng.range(3, 5);
    const skillPrice = price(Math.round(75 * (1 + floor * 0.3)));
    for (let i = 0; i < skillCount; i++) {
      stock.push({
        tag: '【修練】', tagColor: COLORS.textBlue,
        name: '修練の書', desc: '読み解くと職業の理解が深まる (JP+25)',
        price: skillPrice, sold: false,
        canBuy: () => true,
        buy: () => {
          const unlocked = addJP(run, 25);
          return unlocked.length > 0
            ? `JP+25　新スキル習得: ${unlocked.map((s) => s.name).join('、')}`
            : 'JP+25 を得た';
        },
      });
    }

    // レリック枠 2-3 (RollRelicRarity + RelicBasePrices × (1+floor×0.25))
    const RELIC_BASE_PRICE: Partial<Record<RelicRarity, number>> = {
      Common: 80, Uncommon: 150, Rare: 250, Cursed: 50,
    };
    const usedRelics = new Set<string>();
    const addRelicSlot = (forceCursed: boolean) => {
      const rarity = forceCursed ? 'Cursed' : rollRelicRarity(run.sanity, false);
      const relic = drawRelic(run, rarity, usedRelics);
      if (!relic) return;
      stock.push({
        tag: `【${RARITY_LABEL[relic.rarity]}】`, tagColor: RARITY_COLOR[relic.rarity],
        name: relic.name, desc: relic.description,
        price: price(Math.round((RELIC_BASE_PRICE[relic.rarity] ?? 100) * (1 + floor * 0.25))),
        sold: false,
        canBuy: () => !run.relics.includes(relic.id),
        buy: () => {
          const cursesBefore = run.curses.length;
          const gained = addRelicToRun(run, relic);
          let msg = `「${gained.map((r) => r.name).join('」「')}」を手に入れた`;
          if (run.curses.length > cursesBefore) msg += '　…呪いも憑いてきた';
          return msg;
        },
      });
    };
    const relicCount = this.rng.range(2, 4);
    for (let i = 0; i < relicCount; i++) addRelicSlot(false);
    // 密売人の割符 (BlackMarket): 呪われたレリックを必ず1枠追加
    if (hasEffect(run, 'BlackMarket')) addRelicSlot(true);

    // 消耗品枠 2 (ConsumablePrice=40 一律 / Web版適応: 即時使用型)
    const consumablePool: Array<Omit<ShopEntry, 'price' | 'sold' | 'tag' | 'tagColor'>> = [
      {
        name: '回復薬', desc: 'HPを30%回復する',
        canBuy: () => run.currentHP < getEffectiveMaxHP(run),
        buy: () => {
          const heal = modifyHealAmount(run, Math.round(getEffectiveMaxHP(run) * 0.30));
          healRun(run, heal);
          return `HPが ${heal} 回復した`;
        },
      },
      {
        name: '大回復薬', desc: 'HPを60%回復する',
        canBuy: () => run.currentHP < getEffectiveMaxHP(run),
        buy: () => {
          const heal = modifyHealAmount(run, Math.round(getEffectiveMaxHP(run) * 0.60));
          healRun(run, heal);
          return `HPが ${heal} 回復した`;
        },
      },
      {
        name: '聖なる護符', desc: '正気度+1',
        canBuy: () => run.sanity < 3,
        buy: () => { addSanity(run, 1); return '心が少し軽くなった (正気度+1)'; },
      },
      {
        name: '生命の霊薬', desc: '最大HP+10 (このランの間)',
        canBuy: () => true,
        buy: () => { run.maxHPBase += 10; healRun(run, 10); return '最大HPが 10 上がった'; },
      },
    ];
    const consumablePrice = price(40);
    const poolIdx = [...consumablePool.keys()];
    for (let i = 0; i < 2 && poolIdx.length > 0; i++) {
      const pick = poolIdx.splice(this.rng.int(poolIdx.length), 1)[0];
      stock.push({
        tag: '【消耗品】', tagColor: COLORS.textGreen,
        ...consumablePool[pick], price: consumablePrice, sold: false,
      });
    }

    // 装備枠 1-2 (CanEquip を満たすまで最大6回抽選 / 価格 = equip.Value)
    const equipCount = this.rng.range(1, 3);
    const ownedOrStocked = new Set<string>([
      ...run.equipmentInventory,
      run.equippedWeapon ?? '', run.equippedArmor ?? '', run.equippedAccessory ?? '',
    ]);
    for (let i = 0; i < equipCount; i++) {
      let equip = null as ReturnType<typeof drawEquipmentForFloor> | null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const cand = drawEquipmentForFloor(floor, this.rng);
        if (canEquip(run, cand.id) && !ownedOrStocked.has(cand.id)) { equip = cand; break; }
      }
      if (!equip) continue;
      const chosen = equip;
      ownedOrStocked.add(chosen.id);
      stock.push({
        tag: `${EQUIP_RARITY_LABEL[chosen.rarity]}`, tagColor: EQUIP_RARITY_COLOR[chosen.rarity],
        name: `${chosen.name}〔${SLOT_LABEL[chosen.slot]}〕`, desc: chosen.description,
        price: price(chosen.value), sold: false,
        canBuy: () => true,
        buy: () => {
          run.equipmentInventory.push(chosen.id);
          return `「${chosen.name}」を仕入れた (装備画面で装備できる)`;
        },
      });
    }

    // サービス (SkillPurgePrice=100 / SkillUpgradePrice=120)
    // Web版適応: 「スキル削除」→「呪い解除」、「スキル強化」→ JP+50
    const purgeFree = hasEffect(run, 'FreeRemove');
    stock.push({
      tag: '【サービス】', tagColor: COLORS.textGold,
      name: '呪い解除', desc: '身に宿った呪いを1つ祓ってもらう',
      price: purgeFree ? 0 : price(100), sold: false,
      canBuy: () => run.curses.length > 0,
      buy: () => {
        const removed = run.curses.pop()! as keyof typeof CURSE_INFO;
        return `【${CURSE_INFO[removed].name}】の呪いが解けた`;
      },
    });
    stock.push({
      tag: '【サービス】', tagColor: COLORS.textGold,
      name: 'スキル強化', desc: '実戦の型を教わり、職業の理解が大きく深まる (JP+50)',
      price: price(120), sold: false,
      canBuy: () => true,
      buy: () => {
        const unlocked = addJP(run, 50);
        return unlocked.length > 0
          ? `JP+50　新スキル習得: ${unlocked.map((s) => s.name).join('、')}`
          : 'JP+50 を得た';
      },
    });
  }

  private renderShop(): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    drawSceneBackground(this);
    this.header('流浪の商人',
      this.shopMessage || '「よく来たね、旅人さん。掘り出し物があるよ」');

    // 2列レイアウト (最大 4+4+2+2+2 = 14枠)
    const colX = [width / 2 - 315, width / 2 + 315];
    const topY = 178;
    const rowH = 54;
    const perCol = Math.ceil(this.shopStock.length / 2);

    this.shopStock.forEach((item, i) => {
      const x = colX[Math.floor(i / perCol)];
      const y = topY + (i % perCol) * rowH;
      const affordable = !item.sold && this.run.gold >= item.price && item.canBuy();

      this.add.rectangle(x, y, 600, 48, 0x171226, item.sold ? 0.5 : 0.95)
        .setStrokeStyle(1, COLORS.border);
      this.add.text(x - 285, y - 16, item.tag + item.name,
        textStyle(13, item.sold ? COLORS.textDim : item.tagColor)).setAlpha(item.sold ? 0.5 : 1);
      this.add.text(x - 285, y + 3, item.desc, textStyle(10, COLORS.textDim, {
        wordWrap: { width: 400 },
      })).setAlpha(item.sold ? 0.5 : 1);

      if (item.sold) {
        this.add.text(x + 235, y, '売約済', textStyle(13, COLORS.textDim)).setOrigin(0.5);
      } else {
        makeButton(this, x + 235, y, item.price > 0 ? `${item.price} G` : '無料', () => {
          if (item.sold || this.run.gold < item.price || !item.canBuy()) return;
          this.run.gold -= item.price;
          this.shopMessage = `「${item.name}」— ${item.buy()}`;
          item.sold = true;
          saveRun(this.run);
          this.renderShop();
        }, { width: 110, height: 36, fontSize: 13, disabled: !affordable });
      }
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

    // 装備品ドロップ (40%)
    if (this.rng.next() < 0.40) {
      const equip = drawEquipmentForFloor(this.run.currentFloor, this.rng);
      this.run.equipmentInventory.push(equip.id);
      message += `\n${EQUIP_RARITY_LABEL[equip.rarity]}「${equip.name}」を見つけた！ (装備画面で装備できる)`;
    }

    // レリック入手 (財宝羅針盤: レアリティ1段階UP)
    let rarity = rollRelicRarity(this.run.sanity, false);
    if (hasEffect(this.run, 'TreasureNose')) {
      const bump: Record<string, RelicRarity> = { Common: 'Uncommon', Uncommon: 'Rare', Rare: 'Rare', Cursed: 'Rare' };
      rarity = bump[rarity] ?? rarity;
    }
    const relic = drawRelic(this.run, rarity);
    if (relic) {
      addRelicToRun(this.run, relic);
      message += `\n【${RARITY_LABEL[relic.rarity]}】「${relic.name}」を見つけた！\n${relic.description}`;
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
    // 悪魔の帳簿: 呪われた間の報酬2倍
    const gold = Math.round((60 + this.rng.range(0, 41)) * riskRewardMultiplier(this.run));

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

  // ── ランダムイベント (EventFactory.cs 全50種の移植) ────────────────
  private createRandomEvent(): void {
    const run = this.run;
    run.eventsVisited++;

    // 出現条件でフィルタ (RandomEventManager の選択条件を移植)
    const pool = RANDOM_EVENTS.filter((ev) => {
      if (run.currentFloor < ev.minFloor || run.currentFloor > ev.maxFloor) return false;
      if (ev.oneTime && run.seenOneTimeEvents.includes(ev.id)) return false;
      if (ev.requiredCharacter && ev.requiredCharacter !== run.characterId) return false;
      if (ev.isEndingEvent && run.activeEnding) return false;
      return true;
    });

    // Sanity補正付き重み抽選
    const weights = pool.map((ev) => Math.max(0.1, 1 + (ev.sanityWeight ?? 0) * run.sanity));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = this.rng.next() * total;
    let event = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { event = pool[i]; break; }
    }

    if (event.oneTime) run.seenOneTimeEvents.push(event.id);
    this.showEvent(event);
  }

  private showEvent(event: RandomEventDef): void {
    const { width, height } = this.scale;

    // 雰囲気の色板 (UITintColor)
    this.add.rectangle(width / 2, height / 2, width, height, event.tint, 0.12);

    this.header(event.title, '― 未知との遭遇 ―');
    this.add.text(width / 2, 250, event.narrative,
      textStyle(16, COLORS.text, { align: 'center', lineSpacing: 10, wordWrap: { width: width - 260 } }))
      .setOrigin(0.5, 0);

    this.statusLine();

    // 選択肢 (RequiresGold: 所持金不足なら選択不可)
    const btnY = height - 74;
    const count = event.choices.length;
    const btnW = Math.min(340, (width - 120) / count - 16);
    const startX = width / 2 - ((count - 1) * (btnW + 16)) / 2;

    event.choices.forEach((choice, i) => {
      const affordable = !choice.goldCost || this.run.gold >= choice.goldCost;
      const btn = makeButton(this, startX + i * (btnW + 16), btnY, choice.text, () => {
        this.resolveChoice(choice);
      }, { width: btnW, height: 52, fontSize: 14, disabled: !affordable });

      if (choice.tooltip) {
        const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
        bg.on('pointerover', () => this.showChoiceTooltip(startX + i * (btnW + 16), btnY - 40, choice.tooltip!));
        bg.on('pointerout', () => { this.choiceTip?.destroy(); this.choiceTip = null; });
      }
    });
  }

  private choiceTip: Phaser.GameObjects.Container | null = null;

  private showChoiceTooltip(x: number, y: number, text: string): void {
    this.choiceTip?.destroy();
    const label = this.add.text(0, 0, text, textStyle(12, COLORS.textDim, {
      wordWrap: { width: 320 }, align: 'center',
    })).setOrigin(0.5, 1);
    const bg = this.add.rectangle(0, 6, label.width + 20, label.height + 14, 0x000000, 0.92)
      .setStrokeStyle(1, COLORS.border).setOrigin(0.5, 1);
    this.choiceTip = this.add.container(x, y, [bg, label]).setDepth(100);
  }

  // ── 選択結果の適用 (RandomEventManager.ApplyResult の移植) ──────────
  private resolveChoice(choice: EventChoiceDef): void {
    const run = this.run;
    const r = choice.result;
    const outcomes: string[] = [];

    // コスト減算
    if (choice.goldCost) run.gold = Math.max(0, run.gold - choice.goldCost);

    // HP変化 (回復はレリック補正 / ダメージはそのまま)
    if (r.fullHeal) {
      run.currentHP = getEffectiveMaxHP(run);
      outcomes.push('HPが完全に回復した');
    } else if (r.hpPct) {
      const delta = Math.round(getEffectiveMaxHP(run) * r.hpPct);
      if (delta > 0) {
        const healed = Math.min(modifyHealAmount(run, delta), getEffectiveMaxHP(run) - run.currentHP);
        healRun(run, modifyHealAmount(run, delta));
        outcomes.push(`HP +${Math.max(0, healed)}`);
      } else {
        damageRun(run, -delta);
        outcomes.push(`HP ${delta}`);
      }
    }

    // ゴールド (-9999 = 全財産)
    if (r.gold) {
      if (r.gold > 0) {
        let earned = modifyGoldDrop(run, r.gold);
        earned = modifyEventGold(run, earned);
        earnGold(run, earned);
        outcomes.push(`+${earned} G`);
      } else {
        const spend = r.gold === -9999 ? run.gold : -r.gold;
        run.gold = Math.max(0, run.gold - spend);
        outcomes.push(`-${spend} G`);
      }
    }

    // 最大HP
    if (r.maxHP) {
      run.maxHPBase = Math.max(1, run.maxHPBase + r.maxHP);
      run.currentHP = Math.min(run.currentHP, getEffectiveMaxHP(run));
      outcomes.push(`最大HP ${r.maxHP > 0 ? '+' : ''}${r.maxHP}`);
    }

    // 正気度
    if (r.sanity) {
      addSanity(run, r.sanity);
      outcomes.push(`正気度 ${r.sanity > 0 ? '+' : ''}${r.sanity}`);
    }

    // レリック獲得
    if (r.relicPool) {
      // Event レアリティのプールは証印専用のため Rare に読み替え
      const rarity = r.relicPool === 'Event' ? 'Rare' : r.relicPool;
      const relic = drawRelic(run, rarity);
      if (relic) {
        addRelicToRun(run, relic);
        outcomes.push(`「${relic.name}」を得た (${relic.description})`);
      }
    }

    // 呪い
    if (r.curse) {
      const curse = randomCurse();
      run.curses.push(curse);
      outcomes.push(`【${CURSE_INFO[curse].name}】を受けた…`);
    }
    if (r.removeCurse && run.curses.length > 0) {
      const n = r.removeCurse >= 99 ? run.curses.length : Math.min(r.removeCurse, run.curses.length);
      for (let i = 0; i < n; i++) run.curses.pop();
      outcomes.push(`呪いが${n}つ解けた`);
    }

    // スキルドラフト → JP獲得 (Web版適応: デッキ構築が存在しないため)
    if (r.skillDraft) {
      const jp = r.skillDraft * 25;
      const unlocked = addJP(run, jp);
      outcomes.push(`修練が進んだ (JP +${jp})`);
      if (unlocked.length > 0) {
        outcomes.push(`新スキル習得: ${unlocked.map((s) => s.name).join('、')}`);
      }
    }
    // スキル売却 → JP消費 (Web版適応)
    if (r.removeSkill) {
      run.currentJobJP = Math.max(0, run.currentJobJP - 50);
    }

    // エンディング分岐: 証印レリック + ActiveEnding + 予兆演出
    if (r.endingPath) {
      run.activeEnding = r.endingPath;
      const sealId = ENDING_RELIC_ID[r.endingPath];
      if (sealId && !run.relics.includes(sealId)) {
        run.relics.push(sealId);
        run.relicsFound++;
        const seal = getRelic(sealId);
        if (seal) outcomes.push(`【証印】「${seal.name}」を得た`);
      }
      const ending = getEnding(r.endingPath);
      if (ending) {
        outcomes.push(`\n${ending.premonitionTitle}`);
        outcomes.push(ending.premonitionText);
      }
    }

    // 放浪者の日記: イベント終了後+20G
    const diary = eventMasterBonus(run);
    if (diary > 0) {
      earnGold(run, diary);
      outcomes.push(`【放浪者の日記】+${diary} G`);
    }

    saveRun(run);

    // 死亡チェック
    if (run.currentHP <= 0) {
      this.scene.start('Result', { won: false });
      return;
    }

    // 戦闘トリガー (結果表示後に開戦)
    this.showEventResult(r, outcomes);
  }

  private showEventResult(r: EventResult, outcomes: string[]): void {
    const { width, height } = this.scale;

    // 画面を作り直して結果を表示
    this.children.removeAll(true);
    drawSceneBackground(this);
    this.add.text(width / 2, height / 2 - 120, r.narrative,
      textStyle(16, COLORS.text, { align: 'center', lineSpacing: 10, wordWrap: { width: width - 300 } }))
      .setOrigin(0.5);
    if (outcomes.length > 0) {
      this.add.text(width / 2, height / 2 + 20, outcomes.join('\n'),
        textStyle(15, COLORS.textGold, { align: 'center', lineSpacing: 8, wordWrap: { width: width - 300 } }))
        .setOrigin(0.5);
    }
    this.statusLine();

    if (r.battle) {
      makeButton(this, width / 2, height - 64, '― 戦闘開始 ―', () => {
        this.scene.start('Battle', {
          nodeType: r.elite ? 'EliteBattle' : 'Battle',
          contentSeed: this.rng.int(0x7fffffff),
        });
      }, { width: 300, color: COLORS.textRed });
    } else {
      this.leave();
    }
  }
}
