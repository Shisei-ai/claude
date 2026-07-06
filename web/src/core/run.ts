// 1ランの全状態 — Unity版 Roguelike/RunData.cs の移植
// (JSONシリアライズ可能な形にするため、スキルはID参照で保持する)
import type { BlessingType, CharacterStats, MapData } from './types';
import { getCharacter } from '../data/characters';
import { getDifficulty } from '../data/difficulty';
import { applyMetaBonuses } from './meta';

export interface RunState {
  // Identity
  characterId: string;
  seed: number;
  difficultyLevel: number;
  blessing: BlessingType;

  // Progress
  currentFloor: number;
  currentNodeId: number;     // -1 = フロア開始(未選択)
  totalRoomsCleared: number;
  isRunActive: boolean;
  map: MapData | null;

  // Resources
  currentHP: number;
  maxHPBase: number;         // ベース最大HP(レベル成長込み・メタ倍率適用前)
  gold: number;
  sanity: number;            // -3 〜 +3

  // Level / Job
  characterLevel: number;
  currentEXP: number;
  jobLevel: number;
  currentJobJP: number;
  totalExpGained: number;
  totalJPGained: number;
  unlockedSkillIds: string[];

  // Statistics
  damageDealt: number;
  damageTaken: number;
  enemiesKilled: number;
  goldEarned: number;
  relicsFound: number;
  eventsVisited: number;
  battlesWon: number;

  // Blessing one-shots
  blessingFirstCombatSkillBonus: number;
  blessingFirstCombatShieldReduction: boolean;

  // Meta bonuses (applied at run start)
  metaMaxHPMult: number;
  metaPhysAtkMult: number;
  metaMagAtkMult: number;
  metaPhysDefMult: number;
  metaMagDefMult: number;
  metaCritRateBonus: number;
  metaMaxMPBonus: number;
  metaExtraStartGold: number;
  metaExtraRelicChoices: number;
  metaStartBP: number;
  metaShopDiscount: number;
  metaCurseDmgReduction: number;
  metaFloorClearExtraHeal: boolean;
  metaStartWithCommonRelic: boolean;
  metaCurseHPReductionImmune: boolean;
}

/** ランスタート (RoguelikeManager.MainFlow 冒頭 + PendingRunConfig 消費に相当) */
export function createRun(
  characterId: string,
  difficultyLevel: number,
  blessing: BlessingType,
): RunState {
  const char = getCharacter(characterId);
  const diff = getDifficulty(difficultyLevel);

  const run: RunState = {
    characterId,
    seed: (Math.random() * 0x7fffffff) | 0,
    difficultyLevel,
    blessing,

    currentFloor: 0,
    currentNodeId: -1,
    totalRoomsCleared: 0,
    isRunActive: true,
    map: null,

    currentHP: 0,
    maxHPBase: char.baseStats.maxHP,
    gold: diff.startingGold,
    sanity: 0,

    characterLevel: 1,
    currentEXP: 0,
    jobLevel: 1,
    currentJobJP: 0,
    totalExpGained: 0,
    totalJPGained: 0,
    unlockedSkillIds: [],

    damageDealt: 0,
    damageTaken: 0,
    enemiesKilled: 0,
    goldEarned: 0,
    relicsFound: 0,
    eventsVisited: 0,
    battlesWon: 0,

    blessingFirstCombatSkillBonus: 0,
    blessingFirstCombatShieldReduction: false,

    metaMaxHPMult: 1, metaPhysAtkMult: 1, metaMagAtkMult: 1,
    metaPhysDefMult: 1, metaMagDefMult: 1,
    metaCritRateBonus: 0, metaMaxMPBonus: 0, metaExtraStartGold: 0,
    metaExtraRelicChoices: 0, metaStartBP: 0,
    metaShopDiscount: 0, metaCurseDmgReduction: 0,
    metaFloorClearExtraHeal: false, metaStartWithCommonRelic: false,
    metaCurseHPReductionImmune: false,
  };

  // メタ強化 → 加護 の順に適用 (Unity版 MainFlow と同順)
  applyMetaBonuses(run);
  run.gold += run.metaExtraStartGold;

  switch (blessing) {
    case 'VitalGuard':
      run.metaMaxHPMult += 0.25;
      break;
    case 'GoldenCompass':
      run.gold += 150;
      break;
    case 'IronWill':
      run.relicsFound += 1;   // レリック実装(フェーズ2)まで暫定: 統計のみ加算
      break;
    case 'AncientKnowledge':
      run.blessingFirstCombatSkillBonus = 1;
      break;
    case 'ShadowVeil':
      run.blessingFirstCombatShieldReduction = true;
      break;
  }

  // 初期スキル解放 (LevelSystem.InitStartingSkills)
  for (const entry of char.learnableSkills) {
    if (entry.jobLevel <= 1 && !run.unlockedSkillIds.includes(entry.skill.id)) {
      run.unlockedSkillIds.push(entry.skill.id);
    }
  }

  run.currentHP = getEffectiveMaxHP(run);
  return run;
}

/** メタ倍率適用後の最大HP */
export function getEffectiveMaxHP(run: RunState): number {
  return Math.round(run.maxHPBase * run.metaMaxHPMult);
}

/** レベル・メタ補正込みの戦闘用ステータスを構築 */
export function buildBattleStats(run: RunState): CharacterStats {
  const char = getCharacter(run.characterId);
  const g = char.growthRates;
  const levels = run.characterLevel - 1;
  return {
    maxHP: getEffectiveMaxHP(run),
    maxMP: Math.round(char.baseStats.maxMP + g.maxMP * levels) + run.metaMaxMPBonus,
    physicalAttack: Math.round((char.baseStats.physicalAttack + g.physicalAttack * levels) * run.metaPhysAtkMult),
    magicAttack: Math.round((char.baseStats.magicAttack + g.magicAttack * levels) * run.metaMagAtkMult),
    physicalDefense: Math.round((char.baseStats.physicalDefense + g.physicalDefense * levels) * run.metaPhysDefMult),
    magicDefense: Math.round((char.baseStats.magicDefense + g.magicDefense * levels) * run.metaMagDefMult),
    speed: char.baseStats.speed + g.speed * levels,
    luck: char.baseStats.luck + g.luck * levels,
    criticalRate: Math.min(100, char.baseStats.criticalRate + run.metaCritRateBonus),
    accuracyRate: char.baseStats.accuracyRate,
  };
}

export function healRun(run: RunState, amount: number): number {
  const max = getEffectiveMaxHP(run);
  const healed = Math.min(amount, max - run.currentHP);
  run.currentHP += healed;
  return healed;
}

export function damageRun(run: RunState, amount: number): void {
  run.currentHP = Math.max(0, run.currentHP - amount);
}

export function earnGold(run: RunState, amount: number): void {
  run.gold += amount;
  run.goldEarned += amount;
}

export function addSanity(run: RunState, delta: number): void {
  run.sanity = Math.max(-3, Math.min(3, run.sanity + delta));
}
