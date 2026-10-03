// デイリー挑戦 — Web版独自の追加要素。
// 日付から種を決め、その日は誰が遊んでも同じ旅人・加護・マップになる
// (戦闘中の乱数までは固定しないので、戦いの展開は毎回変わる)。
import { CHARACTERS } from '../data/characters';
import type { CharacterDef } from './types';
import { BLESSINGS, type BlessingInfo } from '../data/blessings';
import { createRun, type RunState } from './run';

/** デイリー挑戦の難易度 (標準) */
export const DAILY_DIFFICULTY = 1;

/** 端末の現地日付 (YYYY-MM-DD) */
export function todayKey(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 文字列から32bitの種を作る (FNV-1a) */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface DailySetup {
  date: string;
  seed: number;
  character: CharacterDef;
  blessing: BlessingInfo;
}

export function dailySetup(date = todayKey()): DailySetup {
  const h = hash(`dc-daily-${date}`);
  const blessings = BLESSINGS.filter((b) => b.type !== 'None');
  return {
    date,
    seed: h & 0x7fffffff,
    character: CHARACTERS[h % CHARACTERS.length],
    blessing: blessings[(h >>> 8) % blessings.length],
  };
}

export function createDailyRun(setup = dailySetup()): RunState {
  const run = createRun(setup.character.id, DAILY_DIFFICULTY, setup.blessing.type);
  run.seed = setup.seed;
  run.dailyDate = setup.date;
  return run;
}
