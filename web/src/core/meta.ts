// メタ進行「彼方の墓標」— Unity版 Meta/MetaUpgradeTree.cs +
// SkillUpgradeSystem.cs の MetaProgression を移植 (PlayerPrefs → localStorage)
// Web版の調整: 各道を10段 (魔獣の書は4段) に伸ばし、費用を Unity版の2倍 + 深層 (6段目以降) は80〜200碑文に。
// 能力値・所持金・割引の効果は Unity版の約0.45倍 (全解放しても踏破率が6割ほどになるように)
import { loadMeta, saveMeta } from './save';
import type { RunState } from './run';

export type MetaBonusType =
  | 'MaxHPPercent' | 'PhysAtkPercent' | 'MagAtkPercent'
  | 'PhysDefPercent' | 'MagDefPercent'
  | 'CritRateFlat' | 'MaxMPFlat' | 'StartingGold' | 'ShopDiscount'
  | 'ExtraRelicChoices' | 'StartBP'
  | 'FloorClearExtraHeal' | 'StartWithCommonRelic'
  | 'CurseDmgReduction' | 'CurseHPReductionImmune'
  | 'GrimoireCarrySlot'    // Web版で追加: ゼノが旅立ちに持ち込める簒奪技の枠
  // Web版で追加 (深層の段)
  | 'RestHealPercent'      // 焚き火の回復量 +%
  | 'StartJP'              // 旅立ち時に JP を得る
  | 'StartRelicExtra';     // 旅立ち時にコモンレリックを追加で携える

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
  N('iron_1', '鉄の意志', '強靭な体', '最大HP+2%', 10, [], false,
    { type: 'MaxHPPercent', value: 0.02 }),
  N('iron_2', '鉄の意志', '護りの盾', '物防+4%', 20, ['iron_1'], false,
    { type: 'PhysDefPercent', value: 0.04 }),
  N('iron_3', '鉄の意志', '不屈の肉体', '最大HP+4%', 30, ['iron_2'], false,
    { type: 'MaxHPPercent', value: 0.04 }),
  N('iron_4', '鉄の意志', '回復の章', '層を越えるとHP5%回復', 40, ['iron_3'], false,
    { type: 'FloorClearExtraHeal', value: 1 }),
  N('iron_5', '鉄の意志', '★ 鋼鉄の城', '最大HP+7% 魔防+4%', 60, ['iron_4'], false,
    { type: 'MaxHPPercent', value: 0.07 }, { type: 'MagDefPercent', value: 0.04 }),

  // 深層
  N('iron_6', '鉄の意志', '古傷の記憶', '魔防+4%', 80, ['iron_5'], false,
    { type: 'MagDefPercent', value: 0.04 }),
  N('iron_7', '鉄の意志', '鉄壁', '物防+4%', 100, ['iron_6'], false,
    { type: 'PhysDefPercent', value: 0.04 }),
  N('iron_8', '鉄の意志', '命の器', '最大HP+4%', 130, ['iron_7'], false,
    { type: 'MaxHPPercent', value: 0.04 }),
  N('iron_9', '鉄の意志', '城壁の守り', '物防・魔防+4%', 160, ['iron_8'], false,
    { type: 'PhysDefPercent', value: 0.04 }, { type: 'MagDefPercent', value: 0.04 }),
  N('iron_10', '鉄の意志', '★★ 不落の砦', '最大HP+7% 物防・魔防+4%', 200, ['iron_9'], true,
    { type: 'MaxHPPercent', value: 0.07 }, { type: 'PhysDefPercent', value: 0.04 }, { type: 'MagDefPercent', value: 0.04 }),

  // PATH 2 : 刃の覚醒 (攻撃)
  N('blade_1', '刃の覚醒', '鋭き刃', '物攻+2%', 10, [], false,
    { type: 'PhysAtkPercent', value: 0.02 }),
  N('blade_2', '刃の覚醒', '急所の眼', '会心率+2', 20, ['blade_1'], false,
    { type: 'CritRateFlat', value: 2 }),
  N('blade_3', '刃の覚醒', '魔力の刃', '魔攻+2%', 30, ['blade_2'], false,
    { type: 'MagAtkPercent', value: 0.02 }),
  N('blade_4', '刃の覚醒', '闘志', '開戦時BP+1', 40, ['blade_3'], false,
    { type: 'StartBP', value: 1 }),
  N('blade_5', '刃の覚醒', '★ 覇王の一撃', '物攻・魔攻+4% 会心率+2', 60, ['blade_4'], false,
    { type: 'PhysAtkPercent', value: 0.04 }, { type: 'MagAtkPercent', value: 0.04 },
    { type: 'CritRateFlat', value: 2 }),

  // 深層
  N('blade_6', '刃の覚醒', '研ぎ澄ます', '物攻+4%', 80, ['blade_5'], false,
    { type: 'PhysAtkPercent', value: 0.04 }),
  N('blade_7', '刃の覚醒', '魔刃', '魔攻+4%', 100, ['blade_6'], false,
    { type: 'MagAtkPercent', value: 0.04 }),
  N('blade_8', '刃の覚醒', '必殺の眼', '会心率+2', 130, ['blade_7'], false,
    { type: 'CritRateFlat', value: 2 }),
  N('blade_9', '刃の覚醒', '戦意昂揚', '物攻・魔攻+3%', 160, ['blade_8'], false,
    { type: 'PhysAtkPercent', value: 0.03 }, { type: 'MagAtkPercent', value: 0.03 }),
  N('blade_10', '刃の覚醒', '★★ 万象断ち', '物攻・魔攻+5% 会心率+2', 200, ['blade_9'], true,
    { type: 'PhysAtkPercent', value: 0.05 }, { type: 'MagAtkPercent', value: 0.05 }, { type: 'CritRateFlat', value: 2 }),

  // PATH 3 : 幸運の星 (経済)
  N('luck_1', '幸運の星', '行商の知恵', '初期ゴールド+10', 10, [], false,
    { type: 'StartingGold', value: 10 }),
  N('luck_2', '幸運の星', '交渉術', '店の価格-4%', 20, ['luck_1'], false,
    { type: 'ShopDiscount', value: 0.04 }),
  N('luck_3', '幸運の星', '商才', '初期ゴールド+20', 30, ['luck_2'], false,
    { type: 'StartingGold', value: 20 }),
  N('luck_4', '幸運の星', '鑑定眼', '強敵・ボスの報酬の選択肢+1', 40, ['luck_3'], false,
    { type: 'ExtraRelicChoices', value: 1 }),
  N('luck_5', '幸運の星', '★ 運命の寵児', '初期ゴールド+40 一般レリック1つ', 60, ['luck_4'], false,
    { type: 'StartingGold', value: 40 }, { type: 'StartWithCommonRelic', value: 1 }),

  // 深層
  N('luck_6', '幸運の星', '貯えの才', '初期ゴールド+30', 80, ['luck_5'], false,
    { type: 'StartingGold', value: 30 }),
  N('luck_7', '幸運の星', '値踏み', '店の価格-4%', 100, ['luck_6'], false,
    { type: 'ShopDiscount', value: 0.04 }),
  N('luck_8', '幸運の星', '宝の嗅覚', '初期ゴールド+40', 130, ['luck_7'], false,
    { type: 'StartingGold', value: 40 }),
  N('luck_9', '幸運の星', '豪商', '初期ゴールド+50', 160, ['luck_8'], false,
    { type: 'StartingGold', value: 50 }),
  N('luck_10', '幸運の星', '★★ 星の導き', '一般レリック1つ 店の価格-2%', 200, ['luck_9'], true,
    { type: 'StartRelicExtra', value: 1 }, { type: 'ShopDiscount', value: 0.02 }),

  // PATH 4 : 古代の知識 (MP/スキル)
  N('arcane_1', '古代の知識', '秘術の素養', '最大MP+5', 10, [], false,
    { type: 'MaxMPFlat', value: 5 }),
  N('arcane_2', '古代の知識', '魔力の泉', '最大MP+10', 20, ['arcane_1'], false,
    { type: 'MaxMPFlat', value: 10 }),
  N('arcane_3', '古代の知識', '技の研鑽', '物攻・魔攻+2%', 30, ['arcane_2'], false,
    { type: 'PhysAtkPercent', value: 0.02 }, { type: 'MagAtkPercent', value: 0.02 }),
  N('arcane_4', '古代の知識', '値切り上手', '店の価格-4%', 40, ['arcane_3'], false,
    { type: 'ShopDiscount', value: 0.04 }),
  N('arcane_5', '古代の知識', '★ 秘術の極み', '最大MP+10 物攻・魔攻+2%', 60, ['arcane_4'], false,
    { type: 'MaxMPFlat', value: 10 },
    { type: 'PhysAtkPercent', value: 0.02 }, { type: 'MagAtkPercent', value: 0.02 }),

  // 深層
  N('arcane_6', '古代の知識', '魔力の器', '最大MP+10', 80, ['arcane_5'], false,
    { type: 'MaxMPFlat', value: 10 }),
  N('arcane_7', '古代の知識', '叡智', '物攻・魔攻+2%', 100, ['arcane_6'], false,
    { type: 'PhysAtkPercent', value: 0.02 }, { type: 'MagAtkPercent', value: 0.02 }),
  N('arcane_8', '古代の知識', '魔力の奔流', '最大MP+15', 130, ['arcane_7'], false,
    { type: 'MaxMPFlat', value: 15 }),
  N('arcane_9', '古代の知識', '修練の記憶', '旅立ち時JP+50', 160, ['arcane_8'], false,
    { type: 'StartJP', value: 50 }),
  N('arcane_10', '古代の知識', '★★ 叡智の極北', '最大MP+15 物攻・魔攻+4%', 200, ['arcane_9'], true,
    { type: 'MaxMPFlat', value: 15 }, { type: 'PhysAtkPercent', value: 0.04 }, { type: 'MagAtkPercent', value: 0.04 }),

  // PATH 5 : 荒野の知恵 (呪い耐性)
  N('wild_1', '荒野の知恵', '呪いへの慣れ', '呪いの被ダメ増加を15%軽減', 10, [], false,
    { type: 'CurseDmgReduction', value: 0.15 }),
  N('wild_2', '荒野の知恵', '穢れ払い', '呪いの被ダメ増加を15%軽減', 20, ['wild_1'], false,
    { type: 'CurseDmgReduction', value: 0.15 }),
  N('wild_3', '荒野の知恵', '盾の守護', '物防+4%', 30, ['wild_2'], false,
    { type: 'PhysDefPercent', value: 0.04 }),
  N('wild_4', '荒野の知恵', '呪縛解放', '呪いの被ダメ増加を20%軽減', 40, ['wild_3'], false,
    { type: 'CurseDmgReduction', value: 0.2 }),
  N('wild_5', '荒野の知恵', '★ 不死身の旅人', '衰弱の呪いを無効', 60, ['wild_4'], false,
    { type: 'CurseHPReductionImmune', value: 1 }),

  // 深層
  N('wild_6', '荒野の知恵', '荒野の守り', '魔防+4%', 80, ['wild_5'], false,
    { type: 'MagDefPercent', value: 0.04 }),
  N('wild_7', '荒野の知恵', '穢れの浄化', '呪いの被ダメ増加を15%軽減', 100, ['wild_6'], false,
    { type: 'CurseDmgReduction', value: 0.15 }),
  N('wild_8', '荒野の知恵', '旅慣れ', '最大HP+4%', 130, ['wild_7'], false,
    { type: 'MaxHPPercent', value: 0.04 }),
  N('wild_9', '荒野の知恵', '焚き火の心得', '焚き火の回復+5%', 160, ['wild_8'], false,
    { type: 'RestHealPercent', value: 0.05 }),
  N('wild_10', '荒野の知恵', '★★ 荒野の覇者', '呪い軽減+15% 最大HP+4% 物防・魔防+2%', 200, ['wild_9'], true,
    { type: 'CurseDmgReduction', value: 0.15 }, { type: 'MaxHPPercent', value: 0.04 },
    { type: 'PhysDefPercent', value: 0.02 }, { type: 'MagDefPercent', value: 0.02 }),

  // PATH 6 : 魔獣の書 (Web版で追加 — ゼノの簒奪技の持ち越し)
  N('grimoire_1', '魔獣の書', '書に残る記憶', 'ゼノが刻んだ技を1つ持ち込める', 30, [], false,
    { type: 'GrimoireCarrySlot', value: 1 }),
  N('grimoire_2', '魔獣の書', '★ 深淵の蔵書', '持ち込める技+1', 60, ['grimoire_1'], false,
    { type: 'GrimoireCarrySlot', value: 1 }),
  // 深層
  N('grimoire_3', '魔獣の書', '禁書の頁', '持ち込める技+1', 120, ['grimoire_2'], false,
    { type: 'GrimoireCarrySlot', value: 1 }),
  N('grimoire_4', '魔獣の書', '★★ 万魔の書', '持ち込める技+1', 200, ['grimoire_3'], true,
    { type: 'GrimoireCarrySlot', value: 1 }),
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

/** ゼノが旅立ちに持ち込める簒奪技の数 (彼方の墓標「魔獣の書」で解放) */
export function grimoireCarrySlots(): number {
  return META_NODES
    .filter((n) => isNodeUnlocked(n.id))
    .reduce((sum, n) => sum + n.bonuses
      .filter((b) => b.type === 'GrimoireCarrySlot')
      .reduce((a, b) => a + b.value, 0), 0);
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
        case 'GrimoireCarrySlot':   break;   // 旅立ちの画面で使う (grimoireCarrySlots)
        case 'RestHealPercent':     run.metaRestHealBonus += b.value; break;
        case 'StartJP':             run.metaStartJP += Math.round(b.value); break;
        case 'StartRelicExtra':     run.metaExtraStartRelics += Math.round(b.value); break;
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
  // 到達エンディングの記録 (MetaProgression.RecordEndingCleared)
  if (won && run.activeEnding && !meta.clearedEndings.includes(run.activeEnding)) {
    meta.clearedEndings.push(run.activeEnding);
  }
  if (!meta.playedCharacters.includes(run.characterId)) meta.playedCharacters.push(run.characterId);
  // デイリー挑戦: その日の最高記録を残す (踏破 > 到達層 > 踏破した部屋数 の順で比べる)
  if (run.dailyDate) {
    const prev = meta.dailyRecords[run.dailyDate];
    const score = (r: { won: boolean; floor: number; rooms: number }) =>
      (r.won ? 1_000_000 : 0) + r.floor * 1000 + r.rooms;
    const now = { floor: run.currentFloor, rooms: run.totalRoomsCleared, won };
    const best = !prev || score(now) > score(prev) ? now : prev;
    meta.dailyRecords[run.dailyDate] = { ...best, attempts: (prev?.attempts ?? 0) + 1 };
  }
  const earned = calculateEpitaphsEarned(run, won);
  meta.totalEpitaphs += earned;
  saveMeta(meta);
  return earned;
}
