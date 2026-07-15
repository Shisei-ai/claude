// レリック効果のラン外クエリ + 呪い + 抽選
// Unity版 RelicManager.cs のラン系メソッド + LootSystem.cs の抽選部を移植
import type { RunState } from './run';
import { getRelic, relicPool, RELICS, type RelicDef, type RelicEffectType, type RelicRarity } from '../data/relics';
import { battleRandom as rnd } from './rng';

// ── 呪い (Unity版 CurseEffectType の主要分) ─────────────────────────────

export type CurseType =
  | 'FragileHP'      // 被ダメージ+10%
  | 'GoldReduced'    // 取得ゴールド50%
  | 'SkillCostUp'    // MP消費+1
  | 'WeakenedHeal';  // 回復量半減

export const CURSE_INFO: Record<CurseType, { name: string; desc: string }> = {
  FragileHP:   { name: '脆弱の呪い', desc: '受けるダメージが10%増える。' },
  GoldReduced: { name: '貧困の呪い', desc: '得られるゴールドが半分になる。' },
  SkillCostUp: { name: '重詠唱の呪い', desc: '全スキルのMP消費+1。' },
  WeakenedHeal:{ name: '涸れの呪い', desc: '回復量が半分になる。' },
};

export function randomCurse(): CurseType {
  const pool: CurseType[] = ['FragileHP', 'GoldReduced', 'SkillCostUp', 'WeakenedHeal'];
  return pool[rnd.range(0, pool.length)];
}

// ── クエリヘルパー ──────────────────────────────────────────────────────

export function heldRelics(run: RunState): RelicDef[] {
  return run.relics.map((id) => getRelic(id)).filter((r): r is RelicDef => !!r);
}

export function hasEffect(run: RunState, effect: RelicEffectType): boolean {
  return heldRelics(run).some((r) => r.effect === effect);
}

export function sumEffect(run: RunState, effect: RelicEffectType): number {
  return heldRelics(run).filter((r) => r.effect === effect)
    .reduce((s, r) => s + r.value, 0);
}

export function hasCurse(run: RunState, curse: CurseType): boolean {
  return run.curses.includes(curse);
}

// ── ラン系の効果適用 (RelicManager 相当) ────────────────────────────────

/** 敵ゴールドドロップ補正 */
export function modifyGoldDrop(run: RunState, baseGold: number): number {
  let mult = 1 + sumEffect(run, 'GoldDropUp') / 100;
  if (hasEffect(run, 'PhilosophersStone')) mult *= 2;
  if (hasCurse(run, 'GoldReduced')) mult *= 0.5;
  if (hasEffect(run, 'CompoundInterest')) {
    mult += Math.min(0.10, Math.floor(run.gold / 100) * 0.01);
  }
  return Math.round(baseGold * mult);
}

/** ショップ価格補正 (メタ割引と併用) */
export function modifyShopPrice(run: RunState, basePrice: number): number {
  const discount = sumEffect(run, 'ShopDiscount') / 100 + run.metaShopDiscount;
  return Math.max(1, Math.round(basePrice * (1 - Math.min(0.60, discount))));
}

/** 回復量補正 (焚き火など) */
export function modifyHealAmount(run: RunState, baseHeal: number): number {
  let mult = 1;
  mult += sumEffect(run, 'RestEfficiencyUp') / 100;
  mult += sumEffect(run, 'HealingFactor') / 100;
  if (hasCurse(run, 'WeakenedHeal')) mult *= 0.5;
  return Math.round(baseHeal * mult);
}

/** イベントゴールド補正 (LuckyGold ×1.5 + EventMaster +20) */
export function modifyEventGold(run: RunState, gold: number): number {
  let g = gold;
  if (hasEffect(run, 'LuckyGold')) g = Math.round(g * 1.5);
  return g;
}

export function eventMasterBonus(run: RunState): number {
  return hasEffect(run, 'EventMaster') ? 20 : 0;
}

/** 呪われた間の報酬倍率 */
export function riskRewardMultiplier(run: RunState): number {
  return hasEffect(run, 'RiskRewardMaster') ? 2 : 1;
}

/** 報酬選択肢の数 (LootSystem.GetLootChoiceCount) */
export function lootChoiceCount(run: RunState): number {
  let count = 3;
  count += Math.round(sumEffect(run, 'ExtraLootChoice'));
  count += Math.floor(sumEffect(run, 'LuckUp') / 3);
  return Math.max(2, count);
}

// ── レリック抽選 (LootSystem.RollRelicRarity / DrawRelic) ────────────────

export function rollRelicRarity(sanity: number, isElite: boolean): RelicRarity {
  const rare = Math.max(0.01, Math.min(0.23, 0.08 + sanity * 0.05)) + (isElite ? 0.1 : 0);
  const uncommon = Math.max(0.05, Math.min(0.29, 0.20 + sanity * 0.03)) + (isElite ? 0.1 : 0);
  const cursed = 0.05;
  const roll = rnd.value();
  if (roll < rare) return 'Rare';
  if (roll < rare + uncommon) return 'Uncommon';
  if (roll < rare + uncommon + cursed) return 'Cursed';
  return 'Common';
}

export function drawRelic(
  run: RunState, rarity: RelicRarity, used: Set<string> = new Set(),
): RelicDef | null {
  let pool = relicPool(rarity)
    .filter((r) => !run.relics.includes(r.id) && !used.has(r.id));
  // レアリティのプールが尽きたら1段下にフォールバック
  if (pool.length === 0 && rarity === 'Rare') {
    pool = relicPool('Uncommon').filter((r) => !run.relics.includes(r.id) && !used.has(r.id));
  }
  if (pool.length === 0 && rarity !== 'Common') {
    pool = relicPool('Common').filter((r) => !run.relics.includes(r.id) && !used.has(r.id));
  }
  if (pool.length === 0) return null;
  const chosen = pool[rnd.range(0, pool.length)];
  used.add(chosen.id);
  return chosen;
}

/** レリック入手 (DuplicateRelic・PhilosophersStone・CursedButPowerful の副作用込み) */
export function addRelicToRun(run: RunState, relic: RelicDef): RelicDef[] {
  const gained: RelicDef[] = [relic];
  run.relics.push(relic.id);
  run.relicsFound++;

  // 呪い付きレリック
  if (relic.effect === 'PhilosophersStone' || relic.effect === 'CursedButPowerful') {
    run.curses.push(randomCurse());
  }
  // 吸血鬼の短剣: 最大HP-20% (取得時に即適用)
  if (relic.effect === 'VampiricBlade') {
    run.maxHPBase = Math.max(1, Math.round(run.maxHPBase * 0.80));
    run.currentHP = Math.min(run.currentHP, run.maxHPBase);
  }

  // 強欲の合わせ鏡: 所持レリックのコピーを1つ得る (今取った物以外)
  if (hasEffect(run, 'DuplicateRelic') && run.relics.length > 1) {
    const candidates = run.relics.filter((id) => id !== relic.id);
    if (candidates.length > 0) {
      const copyId = candidates[rnd.range(0, candidates.length)];
      const copy = getRelic(copyId);
      if (copy) {
        run.relics.push(copy.id);
        run.relicsFound++;
        gained.push(copy);
      }
    }
  }
  return gained;
}

/** ランダムなコモンレリックを入手 (メタ「運命の寵児」・加護「鉄の意志」用) */
export function grantRandomCommonRelic(run: RunState): RelicDef | null {
  const relic = drawRelic(run, 'Common');
  if (relic) addRelicToRun(run, relic);
  return relic;
}

// ── 戦闘後の報酬抽選 (LootSystem.BuildChoices) ──────────────────────────
// スキルプールが Web 版に存在しないため、Unity版で「レリックが出る確率」
// だった枠のみレリック候補として提示する (スキル枠は出現しない)。
export function buildBattleLoot(
  run: RunState, isElite: boolean, isBoss: boolean,
): RelicDef[] {
  const used = new Set<string>();
  const choices: RelicDef[] = [];
  const sanity = run.sanity;

  let count = lootChoiceCount(run);
  if (isElite && hasEffect(run, 'EliteReward')) count += 1;
  if (isElite && sanity >= 3) count += 1;
  count += run.metaExtraRelicChoices;
  // 知識の欠片: 最初の戦闘後、選択肢+1 (Unity版はスキル選択肢+1)
  if (run.blessingFirstCombatSkillBonus > 0 && run.battlesWon <= 1) {
    count += run.blessingFirstCombatSkillBonus;
    run.blessingFirstCombatSkillBonus = 0;
  }

  // ボスは必ずボスレリックを1つ提示
  if (isBoss) {
    const bossRelic = drawRelic(run, 'Boss', used);
    if (bossRelic) choices.push(bossRelic);
  }

  const remaining = count - choices.length;
  for (let i = 0; i < remaining; i++) {
    const offerRelic = isElite ||
      rnd.value() < 0.25 + run.currentFloor * 0.1 + sanity * 0.05;
    if (!offerRelic) continue;   // Unity版ではこの枠はスキル候補だった
    const rarity = rollRelicRarity(sanity, isElite);
    const relic = drawRelic(run, rarity, used);
    if (relic) choices.push(relic);
  }

  // 流星の欠片: 2%でレア追加
  if (hasEffect(run, 'MiracleChance') && rnd.value() < 0.02) {
    const miracle = drawRelic(run, 'Rare', used);
    if (miracle) choices.push(miracle);
  }

  return choices;
}
