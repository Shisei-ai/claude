/**
 * 1本のラインとして配置する（HANDOFF §5-3 / §2 の layout/autoLayout.ts）
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │ 処理順序が決定的に重要。実際にバグを踏んで決まった順序なので崩さないこと。│
 * │                                                          │
 * │  1. 段ごとのスロットを作る（採取口・生産設備・発電機とその燃料取出口）  │
 * │  2. スロット同士の接続を決める（貪欲マッチング）。余りを surplus に記録 │
 * │  3.【必ずここで】余った産出（最終産物も副産物も）に貯蔵設備を足す      │
 * │       ← 4 より後にやると、口の割り当て済みの設備に接続を足すことになり  │
 * │         「搬出口が満杯」で配線が落ちる。失敗22本の原因がこれだった     │
 * │  4. 口の数を超える分岐・合流に分流器／合流器の均等木を挟む            │
 * │       （品目をまたいで1本にまとめない）                          │
 * │  5. 座標を割り当てる                                        │
 * │  6. 高さの近い組から配線し、落ちた線を先頭に回して全部引き直す（最大4巡）│
 * └─────────────────────────────────────────────────────────┘
 */

import { BOARD_H_MAX, BOARD_W_MAX, clampBoard } from '../constants';
import type { Dataset } from '../dataset';
import { type Board, nextUid } from '../geometry';
import type { Plan } from '../planner';
import { connectNodes } from '../routing';
import type { Node } from '../types';
import { addSurplusSinks, buildLinks, buildTiers, insertLogistics, orderByCentroid, type Link, type Slot } from './tiers';

export interface LayoutOptions {
  /** 段間の余白の係数（交差本数に掛ける） */
  gm?: number;
  /** 縦方向の最小間隔 */
  pad?: number;
  /** 配線を試す順序 */
  order?: 'dy' | 'len' | 'x';
  /** 盤面を自動で広げてよいか（meta.autoGrow） */
  autoGrow?: boolean;
}

export interface LayoutResult {
  overflow: boolean;
  failed: number;
  made: number;
  logistics: number;
  mode?: 'line' | 'blocks';
}

export function autoLayout(ds: Dataset, board: Board, plan: Plan, opts: LayoutOptions = {}): LayoutResult {
  const gm = opts.gm || 1;
  const pad = opts.pad || 2;
  const order = opts.order || 'dy';
  const autoGrow = opts.autoGrow !== false;

  /* 1) 段ごとのスロットを作る */
  const { tiers, all } = buildTiers(ds, plan);

  /* 2) スロット同士の接続を決める（貪欲マッチング） */
  const { links: links0, surplus } = buildLinks(ds, all);

  /* 3) 余った産出に貯蔵設備を足す。**4 より前**であることが要件 */
  addSurplusSinks(ds, tiers, all, links0, surplus);

  /* 4) 口の数を超える分岐・合流に分流器／合流器を挟む */
  const links: Link[] = insertLogistics(ds, tiers, links0);

  /* 5) 段内の順序を重心法で決めてから、座標を割り当てる */
  const tierKeys = Object.keys(tiers)
    .map(Number)
    .sort((a, b) => a - b);
  orderByCentroid(tiers, tierKeys, links);

  board.nodes = [];
  board.belts = [];
  board.uidSeq = 1;

  const hOf = (d: number): number => Math.max(...tiers[d]!.map((s) => ds.fac(s.fac)?.h ?? 1));

  // いちばん台数の多い段が縦に収まるところまで盤面を広げる
  let want = 1;
  for (const d of tierKeys) {
    const n = tiers[d]!.length;
    want = Math.max(want, n * hOf(d) + pad * (n - 1) + 2);
  }
  if (autoGrow) {
    const c = clampBoard(BOARD_W_MAX, Math.max(board.h, Math.min(BOARD_H_MAX, want)));
    board.w = c.w;
    board.h = c.h;
  }

  const span = Math.min(want, board.h - 2);
  let cx = 1;
  let overflow = false;
  for (const d of tierKeys) {
    const list = tiers[d]!;
    const n = list.length;
    const h = hOf(d);
    // 段ごとの縦の広がりを揃えると、つながる相手が真横に来て配線が短くなる
    let step = h + pad;
    if (n > 1) step = Math.max(h + pad, Math.floor((span - h) / (n - 1)));
    if (1 + step * (n - 1) + h > board.h - 1) step = h + pad; // 収まらないときは詰めて折り返す
    let colW = 0;
    let y = 1;
    for (const s of list) {
      const f = ds.fac(s.fac);
      if (!f) continue;
      if (y + f.h > board.h - 1) {
        y = 1;
        cx += colW + pad;
        colW = 0;
      }
      if (cx + f.w > board.w - 1) {
        overflow = true;
        continue;
      }
      s.node = {
        uid: nextUid(board),
        fac: s.fac,
        x: cx,
        y,
        rot: 0,
        rec: s.rec ?? null,
        item: s.item ?? null,
      };
      board.nodes.push(s.node);
      colW = Math.max(colW, f.w);
      y += step;
    }
    // 段の間には、その段から出るライン本数に応じた通路を空ける
    const cross = links.filter((l) => l.a.d === d).length;
    cx += colW + Math.max(3, Math.min(34, Math.ceil(cross * gm) + 3));
  }
  if (autoGrow) {
    // 使った範囲まで横幅を詰め戻す
    let mx = 1;
    for (const n of board.nodes) mx = Math.max(mx, n.x + (ds.fac(n.fac)?.w ?? 1));
    const c = clampBoard(Math.min(BOARD_W_MAX, mx + Math.max(6, Math.round(mx * 0.2))), board.h);
    board.w = c.w;
    board.h = c.h;
  }

  /* 5.5) 分流器・合流器は、繋がる相手の平均の高さへ寄せる。
          斜めに長く走るラインが減り、通路の取り合いが起きにくくなる */
  for (let pass = 0; pass < 3; pass++) {
    for (const d of tierKeys) {
      if (Number.isInteger(d)) continue; // 本体の段は動かさない
      const list = tiers[d]!.filter((s) => s.node);
      if (list.length < 1) continue;
      const col = list[0]!.node!.x;
      if (list.some((s) => s.node!.x !== col)) continue; // 折り返した段はいじらない
      const wants = list
        .map((s) => {
          const ys: number[] = [];
          for (const l of links) {
            if (l.a === s && l.z.node) ys.push(l.z.node.y);
            if (l.z === s && l.a.node) ys.push(l.a.node.y);
          }
          return { s, y: ys.length ? Math.round(ys.reduce((x, y) => x + y, 0) / ys.length) : s.node!.y };
        })
        .sort((x, y) => x.y - y.y);
      let cursor = 1;
      for (const w of wants) {
        const h = ds.fac(w.s.fac)?.h ?? 1;
        const y = Math.max(cursor, Math.min(board.h - 1 - h, w.y));
        w.s.node!.y = y;
        cursor = y + h + 1;
      }
    }
  }

  /* 6) 高さの近い組から順に配線する。
        全部引き直しを何度か行い、落ちた線を先頭に回すと、
        そこが優先して通路を取れる */
  const live = links.filter((l) => l.a.node && l.z.node);
  const dy = (l: Link): number => Math.abs(l.a.node!.y - l.z.node!.y);
  const len = (l: Link): number => Math.abs(l.a.node!.x - l.z.node!.x) + dy(l);
  if (order === 'len') live.sort((p, q) => len(p) - len(q));
  else if (order === 'x') live.sort((p, q) => p.a.node!.x - q.a.node!.x || dy(p) - dy(q));
  else live.sort((p, q) => dy(p) - dy(q));

  const routeAll = (list: Link[]): { made: number; lost: Link[] } => {
    board.belts = [];
    let made = 0;
    const lost: Link[] = [];
    for (const l of list) {
      if (connectNodes(ds, board, l.a.node!, l.z.node!, l.item).ok) made++;
      else lost.push(l);
    }
    return { made, lost };
  };

  let seq = live.slice();
  let res = routeAll(seq);
  let best = { belts: board.belts.slice(), res };
  for (let round = 0; round < 4 && res.lost.length; round++) {
    seq = res.lost.concat(seq.filter((l) => res.lost.indexOf(l) < 0));
    const r2 = routeAll(seq);
    if (r2.lost.length < best.res.lost.length) best = { belts: board.belts.slice(), res: r2 };
    if (!r2.lost.length) break;
    res = r2;
  }
  board.belts = best.belts;

  return {
    overflow,
    failed: best.res.lost.length,
    made: best.res.made,
    logistics: board.nodes.filter((n) => ds.fac(n.fac)?.kind === 'logistics').length,
    mode: 'line',
  };
}

/** 配置に使ったスロットの内訳（テストと診断用） */
export function slotsOf(tiers: Record<string, Slot[]>): Slot[] {
  return ([] as Slot[]).concat(...Object.keys(tiers).map((d) => tiers[d]!));
}

export type { Node };
