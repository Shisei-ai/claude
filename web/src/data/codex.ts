// 図鑑に載せる敵の一覧 (第1〜4層 + 最終層のボス5体)
import type { EnemyDef, SkillDef } from '../core/types';
import { ALL_ENEMIES } from './enemies';
import { ENDINGS } from './endings';

export const CODEX_ENEMIES: EnemyDef[] = [
  ...ALL_ENEMIES,
  ...Object.values(ENDINGS).map((e) => e.boss),
];

/** 敵IDの接頭辞 (f0〜f4) から出現する層を得る */
export function enemyFloor(id: string): number {
  const m = /^f(\d)/.exec(id);
  return m ? Number(m[1]) : 0;
}

/** 敵の技IDから、その技を使う敵 (図鑑の表示用) */
export function enemyUsingSkill(skillId: string): EnemyDef | undefined {
  return CODEX_ENEMIES.find((e) => e.actions.some((a) => a.skill.id === skillId));
}

/** ゼノが吸収で刻める敵の技 (ボス以外の敵の、攻撃か状態異常を伴う技。重複なし) */
export const GRIMOIRE_SKILLS: SkillDef[] = (() => {
  const seen = new Set<string>();
  const out: SkillDef[] = [];
  for (const e of CODEX_ENEMIES) {
    if (e.rank === 'Boss' || e.rank === 'TrueFinalBoss') continue;
    for (const a of e.actions) {
      if (!(a.skill.basePower > 0 || a.skill.appliedStatus) || seen.has(a.skill.id)) continue;
      seen.add(a.skill.id);
      out.push(a.skill);
    }
  }
  return out;
})();

/** 旅立ちに持ち込める技か (通常の敵の技のみ。強敵の技は強すぎるため第1層から使えないようにする) */
export function isCarryableGrimoireSkill(skillId: string): boolean {
  return enemyUsingSkill(skillId)?.rank === 'Normal';
}

export const FLOOR_BOSS_IDS = ['f0b_morva', 'f1b_griselda', 'f2b_sanguina', 'f3b_valgott'];
