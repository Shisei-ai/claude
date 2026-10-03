// レベル/ジョブレベル — Unity版 Roguelike/LevelSystem.cs の移植
import type { RunState, UnitState } from './run';
import type { SkillDef } from './types';
import { getCharacter } from '../data/characters';
import { getEffectiveMaxHP, getMaxMP } from './run';

export const MAX_CHARACTER_LEVEL = 50;
export const MAX_JOB_LEVEL = 12;

/** level → level+1 に必要なEXP: 80 + 20 × level² */
export function expToNextLevel(level: number): number {
  return Math.round(80 + 20 * level * level);
}

/** jobLevel → jobLevel+1 に必要なJP: 50 × jobLevel */
export function jpToNextJobLevel(jobLevel: number): number {
  return 50 * jobLevel;
}

export interface LevelUpResult {
  levelsGained: number[];
  hpGained: number;
}

/** EXP を得る。unit を省くと主人公 (仲間も主人公と同じ量を個別に得る) */
export function addExp(run: RunState, expGained: number, unit: UnitState = run): LevelUpResult {
  const char = getCharacter(unit.characterId);
  unit.currentEXP += expGained;
  if (unit === run) run.totalExpGained += expGained;
  const levelsGained: number[] = [];
  let hpGained = 0;
  const mpBefore = getMaxMP(run, unit);

  while (unit.characterLevel < MAX_CHARACTER_LEVEL) {
    const needed = expToNextLevel(unit.characterLevel);
    if (unit.currentEXP < needed) break;
    unit.currentEXP -= needed;
    unit.characterLevel++;
    levelsGained.push(unit.characterLevel);

    // GrowthRates.MaxHP 分だけ最大HPと現在HPを増加 (戦闘不能の仲間は起き上がらない)
    const hpUp = char.growthRates.maxHP;
    unit.maxHPBase += hpUp;
    hpGained += hpUp;
    if (unit.currentHP > 0) unit.currentHP = Math.min(unit.currentHP + hpUp, getEffectiveMaxHP(run, unit));
  }

  // 増えた最大MPの分だけ現在MPも増やす (Web版: MPは戦闘をまたいで持ち越すため。HPと同じく戦闘不能なら増えない)
  if (levelsGained.length > 0 && unit.currentHP > 0) unit.currentMP += Math.max(0, getMaxMP(run, unit) - mpBefore);

  // 最大レベル: 余剰EXPは 10EXP → 1G
  if (unit.characterLevel >= MAX_CHARACTER_LEVEL && unit.currentEXP > 0) {
    run.gold += Math.floor(unit.currentEXP / 10);
    unit.currentEXP = 0;
  }

  return { levelsGained, hpGained };
}

/** JP を得る。unit を省くと主人公 */
export function addJP(run: RunState, jpGained: number, unit: UnitState = run): SkillDef[] {
  const char = getCharacter(unit.characterId);
  unit.currentJobJP += jpGained;
  if (unit === run) run.totalJPGained += jpGained;
  const unlocked: SkillDef[] = [];

  while (unit.jobLevel < MAX_JOB_LEVEL) {
    const needed = jpToNextJobLevel(unit.jobLevel);
    if (unit.currentJobJP < needed) break;
    unit.currentJobJP -= needed;
    unit.jobLevel++;

    for (const entry of char.learnableSkills) {
      if (entry.jobLevel !== unit.jobLevel) continue;
      if (unit.unlockedSkillIds.includes(entry.skill.id)) continue;
      unit.unlockedSkillIds.push(entry.skill.id);
      unlocked.push(entry.skill);
    }
  }

  // 最大ジョブレベル: 余剰JPは 5JP → 1G
  if (unit.jobLevel >= MAX_JOB_LEVEL && unit.currentJobJP > 0) {
    run.gold += Math.floor(unit.currentJobJP / 5);
    unit.currentJobJP = 0;
  }

  return unlocked;
}

/** 現在解放済みのアクティブスキル一覧 (パッシブ除く) */
export function getActiveSkills(run: UnitState): SkillDef[] {
  const char = getCharacter(run.characterId);
  const seen = new Set<string>();
  const out: SkillDef[] = [];
  for (const entry of char.learnableSkills) {
    if (!run.unlockedSkillIds.includes(entry.skill.id)) continue;
    if (entry.skill.isPassive) continue;
    if (seen.has(entry.skill.id)) continue;
    seen.add(entry.skill.id);
    out.push(entry.skill);
  }
  return out;
}

/** 解放済みパッシブのID集合 */
export function getPassiveIds(run: UnitState): Set<string> {
  const char = getCharacter(run.characterId);
  const out = new Set<string>();
  for (const entry of char.learnableSkills) {
    if (entry.skill.isPassive && run.unlockedSkillIds.includes(entry.skill.id)) {
      out.add(entry.skill.id);
    }
  }
  return out;
}
