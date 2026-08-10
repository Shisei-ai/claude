/**
 * 網羅状況（HANDOFF §2 の coverage.ts）
 *
 * 「データが揃っているか」を数える。データ編集の網羅状況タブの中身。
 *
 *   行き止まり … 作り方も採取ゾーンの登録も無い品目
 *   未到達     … レシピはあるが材料が揃わない品目
 *
 * ここが空になれば、その範囲は計算できる状態になっている。
 * 確度が推定のままのレシピが残っている間は、逆算した台数も推定値。
 */

import type { Dataset } from './dataset';
import type { Conf, FieldEntry, Item, Recipe } from './types';

export interface Coverage {
  /** 作り方が未登録の品目 */
  noRecipe: Item[];
  /** 行き止まり（作れず、採取ゾーンにも無い） */
  deadEnd: Item[];
  /** どのレシピでも使われない品目（最終製品ならOK） */
  unused: Item[];
  /** 材料が揃わず到達できない品目 */
  unreachable: Item[];
  byConf: Record<Conf, number>;
  reach: Set<string>;
  fieldItems: Record<string, number>;
  madeBy: Record<string, Recipe[]>;
  usedAsInput: Record<string, Recipe[]>;
}

export function coverage(ds: Dataset, field: readonly FieldEntry[] = []): Coverage {
  const fieldItems: Record<string, number> = {};
  for (const f of field) {
    if (f.item && f.count > 0) fieldItems[f.item] = (fieldItems[f.item] || 0) + f.count * (+f.rate || 0);
  }

  const usedAsInput: Record<string, Recipe[]> = {};
  const madeBy: Record<string, Recipe[]> = {};
  const byConf: Record<Conf, number> = { ok: 0, part: 0, guess: 0 };
  for (const r of ds.recs.values()) {
    for (const x of r.in) (usedAsInput[x.item] ??= []).push(r);
    for (const x of r.out) (madeBy[x.item] ??= []).push(r);
    byConf[r.conf || 'guess']++;
  }

  const noRecipe: Item[] = [];
  const deadEnd: Item[] = [];
  const unused: Item[] = [];
  for (const i of ds.items.values()) {
    const made = (madeBy[i.id] ?? []).length > 0;
    const inField = !!fieldItems[i.id];
    const used = (usedAsInput[i.id] ?? []).length > 0;
    if (!made) noRecipe.push(i);
    if (!made && !inField) deadEnd.push(i); // 作れず採取もされない＝行き止まり
    if (!used && made) unused.push(i); // 作れるが誰も使わない＝最終製品か登録漏れ
  }

  /* 到達可能性：採取ゾーンにあるものから前向きに広げる */
  const reach = new Set(Object.keys(fieldItems));
  for (let k = 0; k < 40; k++) {
    let grew = false;
    for (const r of ds.recs.values()) {
      if (r.in.every((x) => reach.has(x.item))) {
        for (const o of r.out)
          if (!reach.has(o.item)) {
            reach.add(o.item);
            grew = true;
          }
      }
    }
    if (!grew) break;
  }
  const unreachable = [...ds.items.values()].filter((i) => !reach.has(i.id) && (madeBy[i.id] ?? []).length > 0);

  return { noRecipe, deadEnd, unused, unreachable, byConf, reach, fieldItems, madeBy, usedAsInput };
}
