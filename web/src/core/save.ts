// localStorage セーブ — Unity版 PlayerPrefs / RunSaveSystem 相当
import type { RunState } from './run';

const META_KEY = 'dc_meta_v1';
const RUN_KEY = 'dc_run_v1';

export interface MetaSave {
  totalEpitaphs: number;
  totalRuns: number;
  totalWins: number;
  maxFloor: number;
  unlockedNodes: string[];
}

const DEFAULT_META: MetaSave = {
  totalEpitaphs: 0,
  totalRuns: 0,
  totalWins: 0,
  maxFloor: 0,
  unlockedNodes: [],
};

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META, unlockedNodes: [] };
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    return { ...DEFAULT_META, ...parsed, unlockedNodes: parsed.unlockedNodes ?? [] };
  } catch {
    return { ...DEFAULT_META, unlockedNodes: [] };
  }
}

export function saveMeta(meta: MetaSave): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

// ── ラン途中セーブ (チェックポイント) ──────────────────────────────────

export function saveRun(run: RunState): void {
  localStorage.setItem(RUN_KEY, JSON.stringify(run));
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const run = JSON.parse(raw) as RunState;
    if (!run.isRunActive) return null;
    // 旧セーブ互換
    run.absorbedSkillIds ??= [];
    run.relics ??= [];
    run.curses ??= [];
    run.soulSiphonCount ??= 0;
    run.shieldBarrier ??= 0;
    run.activeEnding ??= null;
    run.seenOneTimeEvents ??= [];
    return run;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  localStorage.removeItem(RUN_KEY);
}

export function hasSavedRun(): boolean {
  return loadRun() !== null;
}
