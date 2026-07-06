// メタ進行「彼方の墓標」— Unity版 Meta/MetaUpgradeTree.cs +
// SkillUpgradeSystem.cs の MetaProgression を移植 (PlayerPrefs → localStorage)
import { loadMeta, saveMeta } from './save';
import type { RunState } from './run';

export type MetaBonusType =
  | 'MaxHPPercent' | 'PhysAtkPercent' | 'MagAtkPercent'
  | 'PhysDefPercent' | 'MagDefPercent'
  | 'CritRateFlat' | 'MaxMPFlat' | 'StartingGold' | 'ShopDiscount'
  | 'ExtraRelicChoices' | 'StartBP'
  | 'FloorClearExtraHeal' | 'StartWithCommonRelic'
  | 'CurseDmgReduction' | 'CurseHPReductionImmune';

export interface MetaBonus { type: MetaBonusType; value: number }

export interface MetaNode {
  id: string;
  pathName: string;
  displayName: string;
  description: string;
  epitaphCost: number;
  requiredNodeIDs: string[];
  isFinalNode: boolean;
  bonuses: MetaBonus[];
}

const N = (
  id: string, path: string, name: string, desc: string,
  cost: number, required: string[], isFinal: boolean,
  ...bonuses: MetaBonus[]
): MetaNode => ({
  id, pathName: path, displayName: name, description: desc,
  epitaphCost: cost, requiredNodeIDs: required, isFinalNode: isFinal, bonuses,
});

export const META_NODES: MetaNode[] = [
  // PATH 1 : 鉄の意志 (HP/防御)
  N('iron_1', '鉄の意志', '強靭な体', '最大HPが5%増加する。', 5, [], false,
    { type: 'MaxHPPercent', value: 0.05 }),
  N('iron_2', '鉄の意志', '護りの盾', '物理防御が8%増加する。', 10, ['iron_1'], false,
    { type: 'PhysDefPercent', value: 0.08 }),
  N('iron_3', '鉄の意志', '不屈の肉体', '最大HPがさらに10%増加する。', 15, ['iron_2'], false,
    { type: 'MaxHPPercent', value: 0.10 }),
  N('iron_4', '鉄の意志', '回復の章', 'フロアクリア時に最大HPの5%を追加回復する。', 20, ['iron_3'], false,
    { type: 'FloorClearExtraHeal', value: 1 }),
  N('iron_5', '鉄の意志', '★ 鋼鉄の城', '最大HPが15%増加し、魔法防御も8%増加する。', 30, ['iron_4'], true,
    { type: 'MaxHPPercent', value: 0.15 }, { type: 'MagDefPercent', value: 0.08 }),

  // PATH 2 : 刃の覚醒 (攻撃)
  N('blade_1', '刃の覚醒', '鋭き刃', '物理攻撃が5%増加する。', 5, [], false,
    { type: 'PhysAtkPercent', value: 0.05 }),
  N('blade_2', '刃の覚醒', '急所の眼', '会心率が5ポイント増加する。', 10, ['blade_1'], false,
    { type: 'CritRateFlat', value: 5 }),
  N('blade_3', '刃の覚醒', '魔力の刃', '魔法攻撃が5%増加する。', 15, ['blade_2'], false,
    { type: 'MagAtkPercent', value: 0.05 }),
  N('blade_4', '刃の覚醒', '闘志', 'バトル開始時にBPを1つ獲得する。', 20, ['blade_3'], false,
    { type: 'StartBP', value: 1 }),
  N('blade_5', '刃の覚醒', '★ 覇王の一撃', '物理・魔法攻撃が10%増加し、会心率がさらに5ポイント増加する。', 30, ['blade_4'], true,
    { type: 'PhysAtkPercent', value: 0.10 }, { type: 'MagAtkPercent', value: 0.10 },
    { type: 'CritRateFlat', value: 5 }),

  // PATH 3 : 幸運の星 (経済)
  N('luck_1', '幸運の星', '行商の知恵', 'ランスタート時のゴールドが30増加する。', 5, [], false,
    { type: 'StartingGold', value: 30 }),
  N('luck_2', '幸運の星', '交渉術', 'ショップの全品価格が10%低下する。', 10, ['luck_1'], false,
    { type: 'ShopDiscount', value: 0.10 }),
  N('luck_3', '幸運の星', '商才', 'ランスタート時のゴールドがさらに50増加する。', 15, ['luck_2'], false,
    { type: 'StartingGold', value: 50 }),
  N('luck_4', '幸運の星', '鑑定眼', '戦闘勝利後のレリック選択肢が1つ増える。', 20, ['luck_3'], false,
    { type: 'ExtraRelicChoices', value: 1 }),
  N('luck_5', '幸運の星', '★ 運命の寵児', 'ランスタート時のゴールドが100増加し、コモンレリックを1つ携えてランを始める。', 30, ['luck_4'], true,
    { type: 'StartingGold', value: 100 }, { type: 'StartWithCommonRelic', value: 1 }),

  // PATH 4 : 古代の知識 (MP/スキル)
  N('arcane_1', '古代の知識', '秘術の素養', '最大MPが15増加する。', 5, [], false,
    { type: 'MaxMPFlat', value: 15 }),
  N('arcane_2', '古代の知識', '魔力の泉', '最大MPがさらに20増加する。', 10, ['arcane_1'], false,
    { type: 'MaxMPFlat', value: 20 }),
  N('arcane_3', '古代の知識', '技の研鑽', '物理・魔法攻撃が5%増加する（スキル威力の底上げ）。', 15, ['arcane_2'], false,
    { type: 'PhysAtkPercent', value: 0.05 }, { type: 'MagAtkPercent', value: 0.05 }),
  N('arcane_4', '古代の知識', '値切り上手', 'ショップの全品価格がさらに10%低下する。', 20, ['arcane_3'], false,
    { type: 'ShopDiscount', value: 0.10 }),
  N('arcane_5', '古代の知識', '★ 秘術の極み', '最大MPが25増加し、物理・魔法攻撃がさらに5%増加する。', 30, ['arcane_4'], true,
    { type: 'MaxMPFlat', value: 25 },
    { type: 'PhysAtkPercent', value: 0.05 }, { type: 'MagAtkPercent', value: 0.05 }),

  // PATH 5 : 荒野の知恵 (呪い耐性)
  N('wild_1', '荒野の知恵', '呪いへの慣れ', '呪いによるダメージ増加効果が15%軽減される。', 5, [], false,
    { type: 'CurseDmgReduction', value: 0.15 }),
  N('wild_2', '荒野の知恵', '穢れ払い', '呪いによるダメージ増加がさらに15%軽減される。', 10, ['wild_1'], false,
    { type: 'CurseDmgReduction', value: 0.15 }),
  N('wild_3', '荒野の知恵', '盾の守護', '物理防御が8%増加する。', 15, ['wild_2'], false,
    { type: 'PhysDefPercent', value: 0.08 }),
  N('wild_4', '荒野の知恵', '呪縛解放', '呪いによるダメージ増加がさらに20%軽減される。', 20, ['wild_3'], false,
    { type: 'CurseDmgReduction', value: 0.20 }),
  N('wild_5', '荒野の知恵', '★ 不死身の旅人', '「衰弱」呪いによる最大HP低下を完全に無効化する。', 30, ['wild_4'], true,
    { type: 'CurseHPReductionImmune', value: 1 }),
];

export function getMetaNode(id: string): MetaNode | undefined {
  return META_NODES.find((n) => n.id === id);
}

export function isNodeUnlocked(id: string): boolean {
  return loadMeta().unlockedNodes.includes(id);
}

export function canUnlockNode(id: string): boolean {
  const node = getMetaNode(id);
  if (!node || isNodeUnlocked(id)) return false;
  const meta = loadMeta();
  if (meta.totalEpitaphs < node.epitaphCost) return false;
  return node.requiredNodeIDs.every(isNodeUnlocked);
}

export function tryUnlockNode(id: string): boolean {
  if (!canUnlockNode(id)) return false;
  const node = getMetaNode(id)!;
  const meta = loadMeta();
  meta.totalEpitaphs -= node.epitaphCost;
  meta.unlockedNodes.push(id);
  saveMeta(meta);
  return true;
}

/** ランスタート時: 解放済みノードのボーナスを RunState に適用 */
export function applyMetaBonuses(run: RunState): void {
  for (const node of META_NODES) {
    if (!isNodeUnlocked(node.id)) continue;
    for (const b of node.bonuses) {
      switch (b.type) {
        case 'MaxHPPercent':        run.metaMaxHPMult += b.value; break;
        case 'PhysAtkPercent':      run.metaPhysAtkMult += b.value; break;
        case 'MagAtkPercent':       run.metaMagAtkMult += b.value; break;
        case 'PhysDefPercent':      run.metaPhysDefMult += b.value; break;
        case 'MagDefPercent':       run.metaMagDefMult += b.value; break;
        case 'CritRateFlat':        run.metaCritRateBonus += Math.round(b.value); break;
        case 'MaxMPFlat':           run.metaMaxMPBonus += Math.round(b.value); break;
        case 'StartingGold':        run.metaExtraStartGold += Math.round(b.value); break;
        case 'ShopDiscount':        run.metaShopDiscount += b.value; break;
        case 'ExtraRelicChoices':   run.metaExtraRelicChoices += Math.round(b.value); break;
        case 'StartBP':             run.metaStartBP += Math.round(b.value); break;
        case 'FloorClearExtraHeal': run.metaFloorClearExtraHeal = true; break;
        case 'StartWithCommonRelic':run.metaStartWithCommonRelic = true; break;
        case 'CurseDmgReduction':   run.metaCurseDmgReduction += b.value; break;
        case 'CurseHPReductionImmune': run.metaCurseHPReductionImmune = true; break;
      }
    }
  }
  run.metaShopDiscount = Math.min(run.metaShopDiscount, 0.40);
  run.metaCurseDmgReduction = Math.min(run.metaCurseDmgReduction, 0.80);
}

// ── 碑文の獲得計算 (MetaProgression.CalculateEpitaphsEarned) ────────────
export function calculateEpitaphsEarned(run: RunState, won: boolean): number {
  const base =
    10 +
    run.currentFloor * 10 +
    (won ? 20 : 0) +
    Math.min(Math.floor(run.enemiesKilled / 3), 20) +
    Math.min(run.relicsFound * 2, 15);
  const diffMult = 1 + run.difficultyLevel * 0.3;
  return Math.round(base * diffMult);
}

export function recordRunEnd(run: RunState, won: boolean): number {
  const meta = loadMeta();
  meta.totalRuns += 1;
  if (won) meta.totalWins += 1;
  if (run.currentFloor > meta.maxFloor) meta.maxFloor = run.currentFloor;
  const earned = calculateEpitaphsEarned(run, won);
  meta.totalEpitaphs += earned;
  saveMeta(meta);
  return earned;
}
