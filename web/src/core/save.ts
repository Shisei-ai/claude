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
  clearedEndings: string[];   // 到達済みエンディング (EndingType)
  /** 発見済みの弱点 (敵ID → 属性)。ランをまたいで保持し、戦闘で「?」を開示済みにする */
  knownWeaknesses: Record<string, string[]>;
}

const DEFAULT_META: MetaSave = {
  totalEpitaphs: 0,
  totalRuns: 0,
  totalWins: 0,
  maxFloor: 0,
  unlockedNodes: [],
  clearedEndings: [],
  knownWeaknesses: {},
};

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META, unlockedNodes: [], clearedEndings: [], knownWeaknesses: {} };
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    return {
      ...DEFAULT_META, ...parsed,
      unlockedNodes: parsed.unlockedNodes ?? [],
      clearedEndings: parsed.clearedEndings ?? [],
      knownWeaknesses: parsed.knownWeaknesses ?? {},
    };
  } catch {
    return { ...DEFAULT_META, unlockedNodes: [], clearedEndings: [], knownWeaknesses: {} };
  }
}

export function saveMeta(meta: MetaSave): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

/** 弱点を発見済みとして記録する。新しく見つけたときだけ true */
export function recordWeakness(enemyId: string, element: string): boolean {
  const meta = loadMeta();
  const known = meta.knownWeaknesses[enemyId] ?? [];
  if (known.includes(element)) return false;
  meta.knownWeaknesses[enemyId] = [...known, element];
  saveMeta(meta);
  return true;
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
    run.equippedWeapon ??= null;
    run.equippedArmor ??= null;
    run.equippedAccessory ??= null;
    run.equipmentInventory ??= [];
    run.partyMembers ??= [];
    run.phantomEventDone ??= false;
    run.pendingEncounter ??= null;
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
