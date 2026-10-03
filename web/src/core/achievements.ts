// 実績 — Web版独自の追加要素 (Unity版には無い)。
// 条件はメタ記録と進行中のランから判定し、解除済みIDをメタセーブに残す。
import type { RunState } from './run';
import { loadMeta, saveMeta, type MetaSave } from './save';
import { META_NODES } from './meta';
import { CHARACTERS } from '../data/characters';
import { CODEX_ENEMIES, FLOOR_BOSS_IDS } from '../data/codex';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (meta: MetaSave, run: RunState | null) => boolean;
}

const totalKills = (m: MetaSave) => Object.values(m.enemyKills).reduce((a, b) => a + b, 0);
const knownWeakCount = (m: MetaSave) => Object.values(m.knownWeaknesses).reduce((a, b) => a + b.length, 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', name: '初陣', desc: '戦闘に初めて勝利する',
    check: (m) => totalKills(m) > 0 },
  { id: 'floor2', name: '森の入口', desc: '第2層に到達する',
    check: (m, r) => m.maxFloor >= 1 || (r?.currentFloor ?? 0) >= 1 },
  { id: 'floor4', name: '封印の地へ', desc: '第4層に到達する',
    check: (m, r) => m.maxFloor >= 3 || (r?.currentFloor ?? 0) >= 3 },
  { id: 'floor_bosses', name: '層の主たち', desc: '第1〜4層のボスをすべて倒す',
    check: (m) => FLOOR_BOSS_IDS.every((id) => (m.enemyKills[id] ?? 0) > 0) },
  { id: 'first_clear', name: '踏破者', desc: '旅を最後までやり遂げる',
    check: (m) => m.totalWins >= 1 },
  { id: 'ending', name: '結末を見た者', desc: 'いずれかのエンディングに到達する',
    check: (m) => m.clearedEndings.length >= 1 },
  { id: 'true_core', name: '世界の核', desc: '真のエンディングに到達する',
    check: (m) => m.clearedEndings.includes('TrueCore') },
  { id: 'all_endings', name: '五つの結末', desc: 'すべてのエンディングに到達する',
    check: (m) => m.clearedEndings.length >= 5 },
  { id: 'kills100', name: '百の屍', desc: '敵を通算100体倒す',
    check: (m) => totalKills(m) >= 100 },
  { id: 'weak20', name: '弱点研究家', desc: '弱点を通算20個見つける',
    check: (m) => knownWeakCount(m) >= 20 },
  { id: 'enemies_all', name: '魔物図鑑', desc: 'すべての敵と戦う',
    check: (m) => CODEX_ENEMIES.every((e) => m.seenEnemies.includes(e.id)) },
  { id: 'relics50', name: '蒐集家', desc: 'レリックを50種類手に入れる',
    check: (m) => m.seenRelics.length >= 50 },
  { id: 'equip20', name: '武具の目利き', desc: '装備を20種類手に入れる',
    check: (m) => m.seenEquipment.length >= 20 },
  { id: 'relics10', name: '遺物に囲まれて', desc: '1回の旅でレリックを10個持つ',
    check: (m, r) => (r?.relics.length ?? 0) >= 10 },
  { id: 'gold500', name: '懐が重い', desc: '所持金が500Gに達する',
    check: (m, r) => (r?.gold ?? 0) >= 500 },
  { id: 'level10', name: '熟練の旅人', desc: 'レベル10に達する',
    check: (m, r) => (r?.characterLevel ?? 0) >= 10 },
  { id: 'all_chars', name: '五人の旅人', desc: '全員で旅に出る',
    check: (m) => CHARACTERS.every((c) => m.playedCharacters.includes(c.id)) },
  { id: 'runs10', name: '終わらぬ巡礼', desc: '旅を10回終える',
    check: (m) => m.totalRuns >= 10 },
  { id: 'daily', name: '日々の試練', desc: 'デイリー挑戦を終える',
    check: (m) => Object.keys(m.dailyRecords).length >= 1 },
  { id: 'meta_all', name: '墓標の完成', desc: '彼方の墓標をすべて解放する',
    check: (m) => META_NODES.every((n) => m.unlockedNodes.includes(n.id)) },
];

/** 条件を満たした実績を解除して保存し、新しく解除したものを返す */
export function checkAchievements(run: RunState | null = null): AchievementDef[] {
  const meta = loadMeta();
  const fresh = ACHIEVEMENTS.filter((a) => !meta.achievements.includes(a.id) && a.check(meta, run));
  if (fresh.length > 0) {
    meta.achievements.push(...fresh.map((a) => a.id));
    saveMeta(meta);
  }
  return fresh;
}
