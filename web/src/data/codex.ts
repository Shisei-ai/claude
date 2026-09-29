// 図鑑に載せる敵の一覧 (第1〜4層 + 最終層のボス5体)
import type { EnemyDef } from '../core/types';
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

export const FLOOR_BOSS_IDS = ['f0b_morva', 'f1b_griselda', 'f2b_sanguina', 'f3b_valgott'];
