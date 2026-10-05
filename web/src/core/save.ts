// localStorage セーブ — Unity版 PlayerPrefs / RunSaveSystem 相当
import type { RunState, UnitState } from './run';
import { createPartyMember, equippedIds, partyUnits, getMaxMP } from './run';
import { MOVED_TO_LEVEL_PASSIVES } from '../data/levelPassives';
import { getCharacter } from '../data/characters';

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
  // ── 図鑑 ──
  /** 戦ったことのある敵ID */
  seenEnemies: string[];
  /** 敵ID → 倒した数 */
  enemyKills: Record<string, number>;
  /** 手に入れたことのあるレリックID */
  seenRelics: string[];
  /** 手に入れたことのある装備ID */
  seenEquipment: string[];
  // ── 実績・デイリー ──
  /** 解除した実績ID */
  achievements: string[];
  /** 旅に出たことのあるキャラクターID */
  playedCharacters: string[];
  /** ゼノがこれまでにグリモワールへ刻んだ敵の技 (旅をまたいで持ち越す候補) */
  grimoireArchive: string[];
  /** デイリー挑戦の最高記録 (日付 YYYY-MM-DD → 記録) */
  dailyRecords: Record<string, DailyRecord>;
}

export interface DailyRecord {
  /** 到達した層 (0始まり) */
  floor: number;
  rooms: number;
  won: boolean;
  attempts: number;
}

/** 配列・オブジェクトを共有しない新しい既定値 */
function freshMeta(): MetaSave {
  return {
    totalEpitaphs: 0,
    totalRuns: 0,
    totalWins: 0,
    maxFloor: 0,
    unlockedNodes: [],
    clearedEndings: [],
    knownWeaknesses: {},
    seenEnemies: [],
    enemyKills: {},
    seenRelics: [],
    seenEquipment: [],
    achievements: [],
    playedCharacters: [],
    grimoireArchive: [],
    dailyRecords: {},
  };
}

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return freshMeta();
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    // 旧セーブに無い項目は既定値で補う
    const meta = freshMeta();
    for (const k of Object.keys(parsed) as (keyof MetaSave)[]) {
      if (parsed[k] !== undefined && parsed[k] !== null) (meta as unknown as Record<string, unknown>)[k] = parsed[k];
    }
    return meta;
  } catch {
    return freshMeta();
  }
}

export function saveMeta(meta: MetaSave): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch { /* 保存できない環境では記録を諦める */ }
}

/** 所持しているレリック・装備を図鑑に記録する (新しい物があるときだけ書き込む) */
function recordOwnedItems(run: RunState): void {
  const meta = loadMeta();
  let changed = false;
  const add = (list: string[], id: string | null) => {
    if (id && !list.includes(id)) { list.push(id); changed = true; }
  };
  run.relics.forEach((id) => add(meta.seenRelics, id));
  run.equipmentInventory.forEach((id) => add(meta.seenEquipment, id));
  equippedIds(run).forEach((id) => add(meta.seenEquipment, id));
  if (changed) saveMeta(meta);
}

/** 戦闘で出会った敵を図鑑に記録する */
export function recordEnemiesSeen(enemyIds: string[]): void {
  const meta = loadMeta();
  const fresh = enemyIds.filter((id) => !meta.seenEnemies.includes(id));
  if (fresh.length === 0) return;
  meta.seenEnemies.push(...new Set(fresh));
  saveMeta(meta);
}

/** グリモワールに刻んだ技を記録する (持ち越しの候補になる) */
export function recordGrimoire(skillIds: string[]): void {
  const meta = loadMeta();
  const fresh = skillIds.filter((id) => !meta.grimoireArchive.includes(id));
  if (fresh.length === 0) return;
  meta.grimoireArchive.push(...new Set(fresh));
  saveMeta(meta);
}

/** 倒した敵を図鑑に記録する */
export function recordEnemyKills(enemyIds: string[]): void {
  const meta = loadMeta();
  for (const id of enemyIds) {
    meta.enemyKills[id] = (meta.enemyKills[id] ?? 0) + 1;
    if (!meta.seenEnemies.includes(id)) meta.seenEnemies.push(id);
  }
  saveMeta(meta);
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
  recordOwnedItems(run);
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
    // 旧形式の仲間 (レベル固定・スキルなし) を、主人公と同じく成長・装備する形へ。
    // 職レベルは主人公に揃え、初期武器を持たせ、HPの減り具合は引き継ぐ
    run.partyMembers = run.partyMembers.map((m) => {
      if ('characterLevel' in m) return m;
      const old = m as unknown as { characterId: string; level: number; currentHP: number; maxHP: number };
      const member = createPartyMember(run, old.characterId, old.level ?? 4, run.jobLevel ?? 1);
      member.currentHP = old.currentHP > 0
        ? Math.max(1, Math.round(member.maxHPBase * old.currentHP / Math.max(1, old.maxHP))) : 0;
      return member;
    });
    run.phantomEventDone ??= false;
    run.soloVow ??= false;
    run.metaRestHealBonus ??= 0;
    run.metaStartJP ??= 0;
    run.metaExtraStartRelics ??= 0;
    run.pendingEncounter ??= null;
    run.floorIntroSeen ??= [];
    run.dailyDate ??= null;
    // 職レベル以下で覚えるはずのスキルを補う (LevelSystem.RestoreSkillsToJobLevel。
    // 習得レベルを前倒ししたスキル — ゼノの吸収など — を進行中のセーブにも反映する)
    for (const unit of partyUnits(run) as UnitState[]) {
      // 固有特性をキャラLvで解放するようにしたので、職Lvで覚えていた分を外す (キャラLvが届いていれば自動で有効)
      unit.unlockedSkillIds = unit.unlockedSkillIds.filter((id) => !MOVED_TO_LEVEL_PASSIVES.includes(id));
      // MPを持ち越すようになる前のセーブは満タンで始める
      if (typeof unit.currentMP !== 'number') unit.currentMP = getMaxMP(run, unit);
      for (const entry of getCharacter(unit.characterId).learnableSkills) {
        if (entry.jobLevel <= unit.jobLevel && !unit.unlockedSkillIds.includes(entry.skill.id)) {
          unit.unlockedSkillIds.push(entry.skill.id);
        }
      }
    }
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
