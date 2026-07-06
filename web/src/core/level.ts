// レベル/ジョブレベル — Unity版 Roguelike/LevelSystem.cs の移植
import type { RunState } from './run';
import type { SkillDef } from './types';
import { getCharacter } from '../data/characters';
import { getEffectiveMaxHP } from './run';

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

export function addExp(run: RunState, expGained: number): LevelUpResult {
  const char = getCharacter(run.characterId);
  run.currentEXP += expGained;
  run.totalExpGained += expGained;
  const levelsGained: number[] = [];
  let hpGained = 0;

  while (run.characterLevel < MAX_CHARACTER_LEVEL) {
    const needed = expToNextLevel(run.characterLevel);
    if (run.currentEXP < needed) break;
    run.currentEXP -= needed;
    run.characterLevel++;
    levelsGained.push(run.characterLevel);

    // GrowthRates.MaxHP 分だけ最大HPと現在HPを増加
    const hpUp = char.growthRates.maxHP;
    run.maxHPBase += hpUp;
    hpGained += hpUp;
    run.currentHP = Math.min(run.currentHP + hpUp, getEffectiveMaxHP(run));
  }

  // 最大レベル: 余剰EXPは 10EXP → 1G
  if (run.characterLevel >= MAX_CHARACTER_LEVEL && run.currentEXP > 0) {
    run.gold += Math.floor(run.currentEXP / 10);
    run.currentEXP = 0;
  }

  return { levelsGained, hpGained };
}

export function addJP(run: RunState, jpGained: number): SkillDef[] {
  const char = getCharacter(run.characterId);
  run.currentJobJP += jpGained;
  run.totalJPGained += jpGained;
  const unlocked: SkillDef[] = [];

  while (run.jobLevel < MAX_JOB_LEVEL) {
    const needed = jpToNextJobLevel(run.jobLevel);
    if (run.currentJobJP < needed) break;
    run.currentJobJP -= needed;
    run.jobLevel++;

    for (const entry of char.learnableSkills) {
      if (entry.jobLevel !== run.jobLevel) continue;
      if (run.unlockedSkillIds.includes(entry.skill.id)) continue;
      run.unlockedSkillIds.push(entry.skill.id);
      unlocked.push(entry.skill);
    }
  }

  // 最大ジョブレベル: 余剰JPは 5JP → 1G
  if (run.jobLevel >= MAX_JOB_LEVEL && run.currentJobJP > 0) {
    run.gold += Math.floor(run.currentJobJP / 5);
    run.currentJobJP = 0;
  }

  return unlocked;
}

/** 現在解放済みのアクティブスキル一覧 (パッシブ除く) */
export function getActiveSkills(run: RunState): SkillDef[] {
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
export function getPassiveIds(run: RunState): Set<string> {
  const char = getCharacter(run.characterId);
  const out = new Set<string>();
  for (const entry of char.learnableSkills) {
    if (entry.skill.isPassive && run.unlockedSkillIds.includes(entry.skill.id)) {
      out.add(entry.skill.id);
    }
  }
  return out;
}
