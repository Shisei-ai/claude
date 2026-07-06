// 1ランの全状態 — Unity版 Roguelike/RunData.cs の移植
// (JSONシリアライズ可能な形にするため、スキルはID参照で保持する)
import type { BlessingType, CharacterStats, MapData } from './types';
import { getCharacter } from '../data/characters';
import { getDifficulty } from '../data/difficulty';
import { applyMetaBonuses } from './meta';
import { grantRandomCommonRelic, randomCurse, hasEffect, sumEffect } from './relics';

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
  absorbedSkillIds: string[];   // ゼノ: グリモワールに刻んだ敵スキル

  // Relics / Curses
  relics: string[];             // RelicDef.id (重複所持あり = 強欲の合わせ鏡)
  curses: string[];             // CurseType
  soulSiphonCount: number;      // 魂の吊灯籠: 撃破カウント
  shieldBarrier: number;        // 巡礼者の礎石: フロア跨ぎバリア蓄積

  // Events / Ending
  activeEnding: string | null;  // エンディング分岐 (DemonKing等 / 1ラン1つ)
  seenOneTimeEvents: string[];  // OneTimeOnly イベントの既読ID

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
    absorbedSkillIds: [],

    relics: [],
    curses: [],
    soulSiphonCount: 0,
    shieldBarrier: 0,

    activeEnding: null,
    seenOneTimeEvents: [],

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
  let pendingCommonRelics = 0;

  switch (blessing) {
    case 'VitalGuard':
      run.metaMaxHPMult += 0.25;
      break;
    case 'GoldenCompass':
      run.gold += 150;
      break;
    case 'IronWill':
      pendingCommonRelics++;
      break;
    case 'AncientKnowledge':
      run.blessingFirstCombatSkillBonus = 1;
      break;
    case 'ShadowVeil':
      run.blessingFirstCombatShieldReduction = true;
      break;
  }

  // メタ「運命の寵児」: コモンレリック1つ所持で開始
  if (run.metaStartWithCommonRelic) pendingCommonRelics++;

  // 深淵難易度: 呪いを1つ背負って開始 (DifficultyTier.StartWithCurse)
  if (diff.startWithCurse) run.curses.push(randomCurse());

  // 初期スキル解放 (LevelSystem.InitStartingSkills)
  for (const entry of char.learnableSkills) {
    if (entry.jobLevel <= 1 && !run.unlockedSkillIds.includes(entry.skill.id)) {
      run.unlockedSkillIds.push(entry.skill.id);
    }
  }

  // 開始レリック付与 (加護「鉄の意志」/ メタ「運命の寵児」)
  for (let i = 0; i < pendingCommonRelics; i++) grantRandomCommonRelic(run);

  run.currentHP = getEffectiveMaxHP(run);
  return run;
}

/** メタ倍率適用後の最大HP */
export function getEffectiveMaxHP(run: RunState): number {
  return Math.round(run.maxHPBase * run.metaMaxHPMult);
}

/** レベル・メタ・レリック補正込みの戦闘用ステータスを構築
 *  (RelicManager.GetGoldToHPBonus / GetAncientCurseStatMultiplier /
 *   GetMirrorCurseHPPenalty / BerserkerRage 防御-50% 相当) */
export function buildBattleStats(run: RunState): CharacterStats {
  const char = getCharacter(run.characterId);
  const g = char.growthRates;
  const levels = run.characterLevel - 1;

  // レリック由来のステータス補正
  const ancientCurse = hasEffect(run, 'AncientCurse') ? 0.30 : 0;      // 全ステ+30%
  const mirrorPenalty = hasEffect(run, 'MirrorCurse') ? run.curses.length * 0.10 : 0; // 最大HP-10%/呪い
  const goldToHP = hasEffect(run, 'GoldToHP') ? Math.floor(run.gold / 50) : 0;
  const berserkDef = hasEffect(run, 'BerserkerRage') ? 0.5 : 1;        // 防御-50%
  const statMult = 1 + ancientCurse;

  let maxHP = Math.round(getEffectiveMaxHP(run) * statMult * (1 - Math.min(0.9, mirrorPenalty))) + goldToHP;
  maxHP = Math.max(1, maxHP);

  return {
    maxHP,
    maxMP: Math.round(char.baseStats.maxMP + g.maxMP * levels) + run.metaMaxMPBonus,
    physicalAttack: Math.round((char.baseStats.physicalAttack + g.physicalAttack * levels) * run.metaPhysAtkMult * statMult),
    magicAttack: Math.round((char.baseStats.magicAttack + g.magicAttack * levels) * run.metaMagAtkMult * statMult),
    physicalDefense: Math.round((char.baseStats.physicalDefense + g.physicalDefense * levels) * run.metaPhysDefMult * statMult * berserkDef),
    magicDefense: Math.round((char.baseStats.magicDefense + g.magicDefense * levels) * run.metaMagDefMult * statMult * berserkDef),
    speed: char.baseStats.speed + g.speed * levels,
    luck: char.baseStats.luck + g.luck * levels + Math.round(sumEffect(run, 'LuckUp')),
    criticalRate: Math.min(100, char.baseStats.criticalRate + run.metaCritRateBonus + Math.round(sumEffect(run, 'CritRateUp'))),
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
