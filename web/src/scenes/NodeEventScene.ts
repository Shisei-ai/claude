// 非戦闘ノード — 焚き火 / 商人 / 宝箱 / 未知 / 呪われた間
// RestSiteController.cs (回復30%)・ShopController.cs (在庫生成/価格式/売約管理)・
// EventFactory.cs (全50種) を移植。
// ショップのWeb版適応: デッキ構築が存在しないため、スキル枠(3-4)はJP+25の
// 「修練の書」、サービス「スキル削除」は「呪い解除」、「スキル強化」はJP+50に
// 読み替え。消耗品はインベントリが無いため即時使用型4種に適応 (価格は
// Unity同様一律 ConsumablePrice=40)。価格式・枠数・BlackMarket・装備6回抽選は
// ShopController.cs に忠実。
import Phaser from 'phaser';
import {
  COLORS, makeButton, textStyle, titleStyle, drawSceneBackground, drawPanel, drawOrnamentLine, addAmbientMotes,
} from '../ui/theme';
import { hasArt, bgArtKey } from '../data/assets';
import { loadRun, saveRun } from '../core/save';
import type { RunState, UnitState } from '../core/run';
import {
  getEffectiveMaxHP, healRun, damageRun, earnGold, addSanity, canEquip, addMaxHP, partyUnits, equippedIds,
  restAtCampfire, REST_HEAL_PCT, REST_REVIVE_HP,
  type ShopSpec,
} from '../core/run';
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
import { playBgm } from '../audio/bgm';
import { getCharacter } from '../data/characters';
import { LINES, pickLine, shortName, type CharLines } from '../data/dialogue';
import { drawEquipmentForFloor, getEquipment, EQUIP_RARITY_LABEL, EQUIP_RARITY_COLOR, SLOT_LABEL } from '../data/equipment';

interface NodeEventInit { nodeType: NodeType; contentSeed: number }

// ショップ在庫1枠 (ShopController.ShopItem 相当。buy は結果メッセージを返す)
interface ShopEntry {
  tag: string; tagColor: string;
  name: string; desc: string;
  price: number; sold: boolean;
  canBuy: () => boolean;
  /** 1人向けの品。仲間がいれば購入時に誰に使うかを選ぶ (filter で選べる人を絞る) */
  target?: { filter?: (u: UnitState) => boolean };
  buy: (unit: UnitState) => string;
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
    this.shopQuote = null;
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    this.run = run;
    run.pendingEncounter ??= { scene: 'NodeEvent', nodeType: data.nodeType, contentSeed: data.contentSeed };
  }

  /** このノードを完了扱いにする (保存は呼び出し側) */
  private finish(): void {
    this.run.pendingEncounter = null;
  }

  /** ノード種別 → 背景キー */
  private bgKey(): string {
    switch (this.nodeType) {
      case 'RestSite': return 'event_rest';
      case 'Shop': return 'event_shop';
      case 'Treasure': return 'event_treasure';
      case 'CursedRoom': return 'event_cursed';
      default: return 'event_unknown';
    }
  }

  /** 背景画像が置かれているか (あれば焚き火・宝箱などの記号は絵に任せる) */
  private hasBgArt(): boolean {
    return hasArt(this, bgArtKey(this.bgKey()));
  }

  /** パーティの誰かが覚えているスキル (仲間のアッシュの鍵開けなども効く) */
  private partyHasSkill(skillId: string): boolean {
    return partyUnits(this.run).some((u) => u.unlockedSkillIds.includes(skillId));
  }

  /** 仲間がいるとき、結果の文に誰のことかを添える */
  private who(unit: UnitState): string {
    return this.run.partyMembers.length > 0 ? `${shortName(getCharacter(unit.characterId).name)}: ` : '';
  }

  /** 1人向けの効果を誰に使うか選ぶ。仲間がいなければすぐ主人公に決まる */
  private pickUnit(title: string, detail: string, filter: (u: UnitState) => boolean, onPick: (u: UnitState) => void): void {
    const units = partyUnits(this.run);
    if (units.length === 1) { onPick(units[0]); return; }
    const { width, height } = this.scale;
    const layer: Phaser.GameObjects.GameObject[] = [];
    const close = () => layer.forEach((o) => o.destroy());
    // 下の画面を押せないよう全面を覆う
    layer.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(200).setInteractive());
    const h = 170 + units.length * 58;
    const top = height / 2 - h / 2;
    layer.push(drawPanel(this, width / 2, height / 2, 600, h, { alpha: 0.97 }).setDepth(201));
    layer.push(this.add.text(width / 2, top + 36, title, titleStyle(22)).setOrigin(0.5).setDepth(202));
    layer.push(this.add.text(width / 2, top + 66, detail, textStyle(13, COLORS.textDim)).setOrigin(0.5).setDepth(202));
    units.forEach((u, i) => {
      const max = getEffectiveMaxHP(this.run, u);
      const name = shortName(getCharacter(u.characterId).name);
      const hp = u.currentHP > 0 ? `HP ${u.currentHP}/${max}` : '戦闘不能';
      const label = `${i === 0 ? '' : '仲間 '}${name}　Lv.${u.characterLevel}　職Lv.${u.jobLevel}　${hp}`;
      layer.push(makeButton(this, width / 2, top + 116 + i * 58, label, () => { close(); onPick(u); },
        { width: 520, height: 48, fontSize: 14, disabled: !filter(u) }).setDepth(202));
    });
    layer.push(makeButton(this, width / 2, top + h - 36, 'やめる', close, { width: 200, height: 40, fontSize: 14 }).setDepth(202));
  }

  create(): void {
    const floorBgm = `floor${Math.min(this.run.currentFloor, 3)}`;
    playBgm(this, this.nodeType === 'RestSite' ? ['campfire', floorBgm] : floorBgm);
    drawSceneBackground(this, undefined, this.bgKey());
    switch (this.nodeType) {
      case 'RestSite': this.createRestSite(); break;
      case 'Shop': this.createShop(); break;
      case 'Treasure': this.createTreasure(); break;
      case 'CursedRoom': this.createCursedRoom(); break;
      default: this.createRandomEvent(); break;
    }
  }

  /** 主人公のひとこと (「名前「台詞」」の形。台詞が無ければ null) */
  private heroQuote(kind: keyof Omit<CharLines, 'skill' | 'element'>): string | null {
    const line = pickLine(LINES[this.run.characterId]?.[kind]);
    return line ? `${shortName(getCharacter(this.run.characterId).name)}「${line}」` : null;
  }

  private header(title: string, subtitle: string): void {
    const { width } = this.scale;
    this.add.text(width / 2, 84, title, titleStyle(36, COLORS.textGold)).setOrigin(0.5).setLetterSpacing(4);
    drawOrnamentLine(this, width / 2, 112, 360);
    this.add.text(width / 2, 134, subtitle, textStyle(15, COLORS.textDim)).setOrigin(0.5);
  }

  /** 文章の後ろに羊皮紙のような暗い板を敷く (背景画像の上でも読めるように) */
  private backPanel(text: Phaser.GameObjects.Text, padX = 48, padY = 26): void {
    const b = text.getBounds();
    drawPanel(this, b.centerX, b.centerY, b.width + padX * 2, b.height + padY * 2, { alpha: 0.82 })
      .setDepth(text.depth - 1);
  }

  /** 下部の状態表示。above (台詞など) を渡すと同じ下地にまとめる */
  private statusLine(above?: Phaser.GameObjects.Text): void {
    const { width, height } = this.scale;
    const maxHP = getEffectiveMaxHP(this.run);
    // 仲間がいれば各自のHPも並べる
    const members = this.run.partyMembers.map((m) => `${shortName(getCharacter(m.characterId).name)} ` +
      (m.currentHP > 0 ? `${m.currentHP}/${getEffectiveMaxHP(this.run, m)}` : '戦闘不能')).join('　');
    const t = this.add.text(width / 2, height - 120,
      `HP ${this.run.currentHP}/${maxHP}${members ? `　${members}` : ''}　　◈ ${this.run.gold} G　　正気度 ${this.run.sanity >= 0 ? '+' : ''}${this.run.sanity}`,
      textStyle(15, COLORS.textDim)).setOrigin(0.5).setDepth(2);
    const b = t.getBounds();
    const a = above?.setDepth(2).getBounds();
    const top = Math.min(b.top, a?.top ?? b.top), bottom = b.bottom;
    drawPanel(this, width / 2, (top + bottom) / 2, Math.max(b.width, a?.width ?? 0) + 90, bottom - top + 22,
      { alpha: 0.72, ornate: false }).setDepth(1);
  }

  private leave(label = 'マップへ戻る'): void {
    const { width, height } = this.scale;
    makeButton(this, width / 2, height - 64, label, () => {
      this.finish();
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 260 });
  }

  private resultAndLeave(message: string, color = COLORS.text): void {
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height / 2 + 40, message,
      textStyle(18, color, { align: 'center', lineSpacing: 8 })).setOrigin(0.5).setDepth(2);
    this.backPanel(msg);
    this.statusLine();
    this.leave();
  }

  // ── 焚き火 (RestSiteController: 30%回復) ──────────────────────────
  private createRestSite(): void {
    const { width, height } = this.scale;
    this.header('焚き火', '暖かな火が、束の間の安らぎをくれる');

    if (this.hasBgArt()) {
      addAmbientMotes(this, 22, 0xff9a40, 1);   // 火の粉
    } else {
      // 背景画像が無いときの焚き火の簡易描画
      const fire = this.add.text(width / 2, height / 2 - 60, '🔥', { fontSize: '72px' }).setOrigin(0.5);
      this.tweens.add({ targets: fire, scale: { from: 1, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });
    }

    // 羽毛の毛布/聖者の遺骨/涸れの呪い: 回復量補正 (RelicManager.ModifyHealAmount)。
    // 全員が自分の最大HPの25%回復し、戦闘不能の仲間は HP100 で起き上がる
    const pct = Math.round(REST_HEAL_PCT * 100);
    const healAmount = modifyHealAmount(this.run, Math.round(getEffectiveMaxHP(this.run) * REST_HEAL_PCT));
    const hasParty = this.run.partyMembers.length > 0;
    const someoneDown = this.run.partyMembers.some((m) => m.currentHP <= 0);
    const restLabel = !hasParty ? `休息する (+${healAmount} HP)`
      : someoneDown ? `休息する (全員HP${pct}%・倒れた仲間はHP${REST_REVIVE_HP})` : `休息する (全員 HP${pct}%回復)`;
    const quote = this.heroQuote('rest');
    if (quote) {
      // 背景画像があれば焚き火の絵を隠さないよう少し上に置く
      const q = this.add.text(width / 2, height / 2 + (this.hasBgArt() ? -20 : 50), quote, textStyle(17, COLORS.text, {
        align: 'center', wordWrap: { width: width - 300 },
      })).setOrigin(0.5).setDepth(2);
      this.backPanel(q, 40, 16);
    }

    this.statusLine();
    makeButton(this, width / 2 - (someoneDown ? 190 : 150), height - 64, restLabel, () => {
      restAtCampfire(this.run);
      addSanity(this.run, 1);
      this.finish();
      saveRun(this.run);
      this.scene.start('Map');
    }, someoneDown ? { width: 400, fontSize: 15 } : { width: 280 });
    makeButton(this, width / 2 + (someoneDown ? 200 : 160), height - 64, '先を急ぐ', () => {
      this.finish();
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 260 });
  }

  // ── 商人 (ShopController.cs 移植) ───────────────────────────────────
  private shopStock: ShopEntry[] = [];
  private shopMessage = '';
  /** 入店時に選んだ主人公の台詞 (購入で再描画しても変えない) */
  private shopQuote: string | null = null;

  private createShop(): void {
    // 在庫は入店時に確定して保存する。中断→再開しても同じ在庫・同じ売約状態で再開し、
    // 在庫の引き直しや購入済み品の買い直しはできない
    const pending = this.run.pendingEncounter!;
    if (!pending.shop) {
      pending.shop = { stock: this.buildShopSpecs(), sold: [] };
      saveRun(this.run);
    }
    const shop = pending.shop;
    this.shopStock = shop.stock.map((spec, i) => ({ ...this.shopEntry(spec), sold: shop.sold.includes(i) }));
    this.renderShop();
  }

  // ShopController.GenerateStock の移植。何を何Gで並べるかだけを決める
  private buildShopSpecs(): ShopSpec[] {
    const run = this.run;
    const floor = run.currentFloor;
    // ApplyMetaDiscount(RelicManager.ModifyShopPrice(...)) 相当
    // (modifyShopPrice がレリック割引+メタ割引を合算・60%上限)
    const price = (base: number) => modifyShopPrice(run, base);
    const specs: ShopSpec[] = [];

    // スキル枠 3-4 (SkillBasePrice=75 × (1+floor×0.3))
    // Web版適応: デッキ構築が無いため、購入で JP+25 を得る「修練の書」
    const skillCount = this.rng.range(3, 5);
    const skillPrice = price(Math.round(75 * (1 + floor * 0.3)));
    for (let i = 0; i < skillCount; i++) specs.push({ k: 'skill', price: skillPrice });

    // レリック枠 2-3 (RollRelicRarity + RelicBasePrices × (1+floor×0.25))
    const RELIC_BASE_PRICE: Partial<Record<RelicRarity, number>> = {
      Common: 80, Uncommon: 150, Rare: 250, Cursed: 50,
    };
    const usedRelics = new Set<string>();
    const addRelicSlot = (forceCursed: boolean) => {
      const rarity = forceCursed ? 'Cursed' : rollRelicRarity(run.sanity, false);
      const relic = drawRelic(run, rarity, usedRelics);
      if (!relic) return;
      specs.push({
        k: 'relic', id: relic.id,
        price: price(Math.round((RELIC_BASE_PRICE[relic.rarity] ?? 100) * (1 + floor * 0.25))),
      });
    };
    const relicCount = this.rng.range(2, 4);
    for (let i = 0; i < relicCount; i++) addRelicSlot(false);
    // 密売人の割符 (BlackMarket): 呪われたレリックを必ず1枠追加
    if (hasEffect(run, 'BlackMarket')) addRelicSlot(true);

    // 消耗品枠 2 (ConsumablePrice=40 一律 / Web版適応: 即時使用型)
    const consumablePrice = price(40);
    const poolIdx = [...this.consumablePool().keys()];
    for (let i = 0; i < 2 && poolIdx.length > 0; i++) {
      const pick = poolIdx.splice(this.rng.int(poolIdx.length), 1)[0];
      specs.push({ k: 'consumable', i: pick, price: consumablePrice });
    }

    // 装備枠 1-2 (CanEquip を満たすまで最大6回抽選 / 価格 = equip.Value)
    const equipCount = this.rng.range(1, 3);
    const ownedOrStocked = new Set<string>([...run.equipmentInventory, ...equippedIds(run)]);
    for (let i = 0; i < equipCount; i++) {
      let equip = null as ReturnType<typeof drawEquipmentForFloor> | null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const cand = drawEquipmentForFloor(floor, this.rng);
        if (partyUnits(run).some((u) => canEquip(u, cand.id)) && !ownedOrStocked.has(cand.id)) { equip = cand; break; }
      }
      if (!equip) continue;
      ownedOrStocked.add(equip.id);
      specs.push({ k: 'equip', id: equip.id, price: price(equip.value) });
    }

    // サービス (SkillPurgePrice=100 / SkillUpgradePrice=120)
    // Web版適応: 「スキル削除」→「呪い解除」、「スキル強化」→ JP+50
    specs.push({ k: 'purge', price: hasEffect(run, 'FreeRemove') ? 0 : price(100) });
    specs.push({ k: 'upgrade', price: price(120) });
    return specs;
  }

  /** 消耗品の候補 (Web版適応: 即時使用型4種) */
  private consumablePool(): Array<Omit<ShopEntry, 'price' | 'sold' | 'tag' | 'tagColor'>> {
    const run = this.run;
    return [
      this.healPotion('回復薬', 0.30),
      this.healPotion('大回復薬', 0.60),
      {
        name: '聖なる護符', desc: '正気度+1',
        canBuy: () => run.sanity < 3,
        buy: () => { addSanity(run, 1); return '心が少し軽くなった (正気度+1)'; },
      },
      {
        name: '生命の霊薬', desc: '最大HP+10 (このランの間)',
        canBuy: () => true,
        target: {},
        buy: (u) => { addMaxHP(run, 10, u); return `${this.who(u)}最大HPが 10 上がった`; },
      },
    ];
  }

  /** 回復薬: 1人のHPを最大HPの pct 回復 (戦闘不能の仲間にも使え、起き上がる) */
  private healPotion(name: string, pct: number): Omit<ShopEntry, 'price' | 'sold' | 'tag' | 'tagColor'> {
    const run = this.run;
    const hurt = (u: UnitState) => u.currentHP < getEffectiveMaxHP(run, u);
    return {
      name, desc: `HPを${Math.round(pct * 100)}%回復する`,
      canBuy: () => partyUnits(run).some(hurt),
      target: { filter: hurt },
      buy: (u) => {
        const wasDown = u.currentHP <= 0;
        const heal = healRun(run, modifyHealAmount(run, Math.round(getEffectiveMaxHP(run, u) * pct)), u);
        return `${this.who(u)}${wasDown ? '起き上がった。' : ''}HPが ${heal} 回復した`;
      },
    };
  }

  /** JPを得る (修練の書・スキル強化・イベント) */
  private gainJP(u: UnitState, jp: number): string {
    const unlocked = addJP(this.run, jp, u);
    return unlocked.length > 0
      ? `${this.who(u)}JP+${jp}　新スキル習得: ${unlocked.map((s) => s.name).join('、')}`
      : `${this.who(u)}JP+${jp} を得た`;
  }

  /** 保存した在庫1枠から、表示と購入処理を組み立てる */
  private shopEntry(spec: ShopSpec): ShopEntry {
    const run = this.run;
    switch (spec.k) {
      case 'skill':
        return {
          tag: '【修練】', tagColor: COLORS.textBlue,
          name: '修練の書', desc: '読み解くと職業の理解が深まる (JP+25)',
          price: spec.price, sold: false,
          canBuy: () => true,
          target: {},
          buy: (u) => this.gainJP(u, 25),
        };
      case 'relic': {
        const relic = getRelic(spec.id)!;
        return {
          tag: `【${RARITY_LABEL[relic.rarity]}】`, tagColor: RARITY_COLOR[relic.rarity],
          name: relic.name, desc: relic.description,
          price: spec.price, sold: false,
          canBuy: () => !run.relics.includes(relic.id),
          buy: () => {
            const cursesBefore = run.curses.length;
            const gained = addRelicToRun(run, relic);
            let msg = `「${gained.map((r) => r.name).join('」「')}」を手に入れた`;
            if (run.curses.length > cursesBefore) msg += '　…呪いも憑いてきた';
            return msg;
          },
        };
      }
      case 'consumable':
        return {
          tag: '【消耗品】', tagColor: COLORS.textGreen,
          ...this.consumablePool()[spec.i], price: spec.price, sold: false,
        };
      case 'equip': {
        const equip = getEquipment(spec.id)!;
        return {
          tag: `${EQUIP_RARITY_LABEL[equip.rarity]}`, tagColor: EQUIP_RARITY_COLOR[equip.rarity],
          name: `${equip.name}〔${SLOT_LABEL[equip.slot]}〕`, desc: equip.description,
          price: spec.price, sold: false,
          canBuy: () => true,
          buy: () => {
            run.equipmentInventory.push(equip.id);
            return `「${equip.name}」を仕入れた (装備画面で装備できる)`;
          },
        };
      }
      case 'purge':
        return {
          tag: '【サービス】', tagColor: COLORS.textGold,
          name: '呪い解除', desc: '身に宿った呪いを1つ祓ってもらう',
          price: spec.price, sold: false,
          canBuy: () => run.curses.length > 0,
          buy: () => {
            const removed = run.curses.pop()! as keyof typeof CURSE_INFO;
            return `【${CURSE_INFO[removed].name}】の呪いが解けた`;
          },
        };
      case 'upgrade':
        return {
          tag: '【サービス】', tagColor: COLORS.textGold,
          name: 'スキル強化', desc: '実戦の型を教わり、職業の理解が大きく深まる (JP+50)',
          price: spec.price, sold: false,
          canBuy: () => true,
          target: {},
          buy: (u) => this.gainJP(u, 50),
        };
    }
  }

  private renderShop(): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    drawSceneBackground(this, undefined, this.bgKey());
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

      this.add.rectangle(x, y, 600, 48, 0x140e1d, item.sold ? 0.55 : 0.92)
        .setStrokeStyle(1, item.sold ? COLORS.border : COLORS.trim, item.sold ? 0.6 : 0.7);
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
          const complete = (unit: UnitState) => {
            this.run.gold -= item.price;
            this.shopMessage = `「${item.name}」— ${item.buy(unit)}`;
            item.sold = true;
            this.run.pendingEncounter?.shop?.sold.push(i);
            saveRun(this.run);
            this.renderShop();
          };
          if (item.target) {
            this.pickUnit(`${item.name}を誰に使う？`, item.desc, item.target.filter ?? (() => true), complete);
          } else {
            complete(this.run);
          }
        }, { width: 110, height: 36, fontSize: 13, disabled: !affordable });
      }
    });

    const quote = this.shopQuote ??= this.heroQuote('shop') ?? '';
    const quoteText = quote ? this.add.text(width / 2, height - 156, quote, textStyle(15, COLORS.text, {
      align: 'center', wordWrap: { width: width - 300 },
    })).setOrigin(0.5) : undefined;
    this.statusLine(quoteText);
    this.leave('店を出る');
  }

  // ── 宝箱 ───────────────────────────────────────────────────────────
  private createTreasure(): void {
    const { width, height } = this.scale;
    this.header('宝箱', '埃を被った箱が静かに佇んでいる');
    // 見つけた物の説明が複数行になるので、箱は上寄せにする
    if (!this.hasBgArt()) this.add.text(width / 2, 210, '▣', textStyle(64, COLORS.textGold)).setOrigin(0.5);

    const floor = FLOORS[Math.min(this.run.currentFloor, FLOORS.length - 1)];
    let gold = floor.baseGoldReward + this.rng.range(10, 41);
    let message = `${gold} G を手に入れた！`;

    // 鍵師の手 (アッシュ): 秘密の宝箱を追加発見
    if (this.partyHasSkill('SKL_A_Lockpicking')) {
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
      const quote = this.heroQuote('getRelic');
      if (quote) message += `\n\n${quote}`;
    }

    earnGold(this.run, gold);
    this.finish();   // 報酬付与と同じ保存で完了 (再開しても二重に受け取れない)
    saveRun(this.run);
    this.resultAndLeave(message, COLORS.textGold);
  }

  // ── 呪われた間 ──────────────────────────────────────────────────────
  private createCursedRoom(): void {
    const { width, height } = this.scale;
    this.header('呪われた間', '空気が重い。何かがこちらを見ている——');
    // 「閉じる/エラー」の✖に見えないよう、焚き火の🔥と同じく絵文字で示す
    if (!this.hasBgArt()) {
      const skull = this.add.text(width / 2, height / 2 - 60, '💀', { fontSize: '68px' }).setOrigin(0.5);
      this.tweens.add({ targets: skull, alpha: { from: 1, to: 0.65 }, duration: 1400, yoyo: true, repeat: -1 });
    }

    // 罠師の知識 (アッシュ): トラップダメージ50%軽減
    const hasTrapMastery = this.partyHasSkill('SKL_A_TrapMastery');
    // 罠は生きている全員が自分の最大HPの10%を受ける
    const damageOf = (u: UnitState) => Math.round(getEffectiveMaxHP(this.run, u) * 0.10 * (hasTrapMastery ? 0.5 : 1));
    const damage = damageOf(this.run);
    const hasParty = this.run.partyMembers.length > 0;
    // 悪魔の帳簿: 呪われた間の報酬2倍
    const gold = Math.round((60 + this.rng.range(0, 41)) * riskRewardMultiplier(this.run));

    if (hasTrapMastery) {
      const tip = this.add.text(width / 2, height / 2 + 10,
        '【罠師の知識】トラップの仕掛けが見える。ダメージを半減できる。',
        textStyle(13, COLORS.textGreen)).setOrigin(0.5).setDepth(2);
      this.backPanel(tip, 30, 12);
    }

    this.statusLine();
    makeButton(this, width / 2 - 170, height - 64,
      hasParty ? `祭壇に触れる (全員 HP-${hasTrapMastery ? 5 : 10}% / +${gold}G)` : `祭壇に触れる (HP-${damage} / +${gold}G)`, () => {
      for (const u of partyUnits(this.run)) if (u.currentHP > 0) damageRun(this.run, damageOf(u), u);
      addSanity(this.run, -1);
      earnGold(this.run, gold);
      this.finish();
      saveRun(this.run);
      if (this.run.currentHP <= 0) {
        this.scene.start('Result', { won: false });
      } else {
        this.scene.start('Map');
      }
    }, { width: 340 });
    makeButton(this, width / 2 + 180, height - 64, '立ち去る', () => {
      this.finish();
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
    const story = this.add.text(width / 2, 250, event.narrative,
      textStyle(17, COLORS.text, { align: 'center', lineSpacing: 12, wordWrap: { width: width - 300 } }))
      .setOrigin(0.5, 0).setDepth(2);
    this.backPanel(story, 60, 30);

    this.statusLine();

    // 選択肢 (RequiresGold: 所持金不足なら選択不可)
    const btnY = height - 74;
    const count = event.choices.length;
    const btnW = Math.min(340, (width - 120) / count - 16);
    const startX = width / 2 - ((count - 1) * (btnW + 16)) / 2;

    let armedChoice = -1;
    event.choices.forEach((choice, i) => {
      const affordable = !choice.goldCost || this.run.gold >= choice.goldCost;
      const btn = makeButton(this, startX + i * (btnW + 16), btnY, choice.text, (pointer) => {
        // タッチではホバーが無いので、補足がある選択肢は1回目のタップで補足を出し、2回目で決定
        if (choice.tooltip && pointer.wasTouch && armedChoice !== i) {
          armedChoice = i;
          this.showChoiceTooltip(startX + i * (btnW + 16), btnY - 40, `${choice.tooltip}\n（もう一度タップで決定）`);
          return;
        }
        this.resolveChoice(choice);
      }, { width: btnW, height: 52, fontSize: 14, disabled: !affordable });

      if (choice.tooltip) {
        const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
        bg.on('pointerover', () => this.showChoiceTooltip(startX + i * (btnW + 16), btnY - 40, choice.tooltip!));
        // タッチは指を離すと pointerout が来るため、タッチ由来では補足を消さない
        bg.on('pointerout', (pointer: Phaser.Input.Pointer) => {
          if (pointer.wasTouch) return;
          this.choiceTip?.destroy(); this.choiceTip = null;
        });
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
  private resolveChoice(choice: EventChoiceDef, target?: UnitState): void {
    const run = this.run;
    const r = choice.result;
    const outcomes: string[] = [];

    // 最大HP・JP の増減は1人向け。仲間がいれば先に誰が受けるかを選ぶ (やめれば選択肢に戻る)
    if (!target && (r.maxHP || r.skillDraft || r.removeSkill) && run.partyMembers.length > 0) {
      const parts: string[] = [];
      if (r.maxHP) parts.push(`最大HP ${r.maxHP > 0 ? '+' : ''}${r.maxHP}`);
      if (r.skillDraft) parts.push(`JP +${r.skillDraft * 25}`);
      if (r.removeSkill) parts.push('JP -50');
      this.pickUnit('誰が受ける？', parts.join('　'), () => true, (u) => this.resolveChoice(choice, u));
      return;
    }
    const unit = target ?? run;

    // コスト減算
    if (choice.goldCost) run.gold = Math.max(0, run.gold - choice.goldCost);

    // HP変化 (回復はレリック補正 / ダメージはそのまま)。全員がそれぞれの最大HP比で受ける。
    // 全回復は戦闘不能の仲間も起き上がり、割合回復・ダメージは生きている者だけ
    const party = partyUnits(run);
    const hasParty = party.length > 1;
    if (r.fullHeal) {
      for (const u of party) u.currentHP = getEffectiveMaxHP(run, u);
      outcomes.push(hasParty ? '全員のHPが完全に回復した' : 'HPが完全に回復した');
    } else if (r.hpPct) {
      const pct = r.hpPct;
      const changes = party.filter((u) => u.currentHP > 0).map((u) => {
        const delta = Math.round(getEffectiveMaxHP(run, u) * pct);
        if (delta > 0) return { u, d: healRun(run, modifyHealAmount(run, delta), u) };
        const before = u.currentHP;
        damageRun(run, -delta, u);
        return { u, d: u.currentHP - before };
      });
      const fmt = (d: number) => (d >= 0 ? `HP +${d}` : `HP ${d}`);
      outcomes.push(hasParty
        ? changes.map((c) => `${shortName(getCharacter(c.u.characterId).name)} ${fmt(c.d)}${c.u.currentHP <= 0 ? ' (戦闘不能)' : ''}`).join('　')
        : fmt(changes[0]?.d ?? 0));
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
      addMaxHP(run, r.maxHP, unit);
      outcomes.push(`${this.who(unit)}最大HP ${r.maxHP > 0 ? '+' : ''}${r.maxHP}`);
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
        const quote = this.heroQuote('getRelic');
        if (quote) outcomes.push(quote);
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
      const unlocked = addJP(run, jp, unit);
      outcomes.push(`${this.who(unit)}修練が進んだ (JP +${jp})`);
      if (unlocked.length > 0) {
        outcomes.push(`新スキル習得: ${unlocked.map((s) => s.name).join('、')}`);
      }
    }
    // スキル売却 → JP消費 (Web版適応)
    if (r.removeSkill) {
      unit.currentJobJP = Math.max(0, unit.currentJobJP - 50);
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

    // 選択の結果を適用した保存で完了。戦闘が起きる場合は、その戦闘を進行中にする
    // (再開すると選択肢から選び直せてしまう、または戦闘を飛ばせてしまうため)
    if (r.battle) {
      run.pendingEncounter = {
        scene: 'Battle',
        nodeType: r.elite ? 'EliteBattle' : 'Battle',
        contentSeed: this.rng.int(0x7fffffff),
      };
    } else {
      this.finish();
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
    drawSceneBackground(this, undefined, this.bgKey());
    const story = this.add.text(width / 2, height / 2 - 120, r.narrative,
      textStyle(17, COLORS.text, { align: 'center', lineSpacing: 12, wordWrap: { width: width - 320 } }))
      .setOrigin(0.5).setDepth(2);
    this.backPanel(story, 60, 26);
    if (outcomes.length > 0) {
      this.add.text(width / 2, height / 2 + 40, outcomes.join('\n'),
        textStyle(15, COLORS.textGold, { align: 'center', lineSpacing: 8, wordWrap: { width: width - 300 } }))
        .setOrigin(0.5);
    }
    this.statusLine();

    if (r.battle) {
      const battle = this.run.pendingEncounter!;
      makeButton(this, width / 2, height - 64, '― 戦闘開始 ―', () => {
        this.scene.start('Battle', { nodeType: battle.nodeType, contentSeed: battle.contentSeed });
      }, { width: 300, color: COLORS.textRed });
    } else {
      this.leave();
    }
  }
}
