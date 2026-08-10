/**
 * 経路探索（HANDOFF §5-4 / §2 の routing.ts）
 *
 * ダイクストラ法。**コストの設計がすべて**なので、各コストの理由をここに残す。
 *
 *   基本コスト        1 / マス
 *   他の設備の口の正面 +5
 *   既存ラインとの交差 +12
 *   遠回りの上限      通過マス数で man*3+80
 *
 * それぞれ「そうしないとどう壊れるか」がある。下のコメントを消さないこと。
 */

import { DIRS } from './constants';
import type { Dataset } from './dataset';
import {
  type Board,
  type PortGeom,
  cellKey,
  beltAxis,
  freePorts,
  machineOcc,
  nextUid,
  portFaces,
  portGeom,
} from './geometry';
import type { Belt, Cell, Node } from './types';

/** 既存ラインを跨ぐ（ベルトブリッジ／パイプブリッジ／地下配管）1基ぶんのコスト */
export const CROSS_COST = 12;
/** 他の設備の口の正面マスを横切るコスト */
export const PORT_FACE_COST = 5;

export interface Route {
  cells: Cell[];
  cost: number;
}

/** [cost, x, y] の最小ヒープ。経路探索が盤面サイズに効くのでここだけ手書きしている */
class MinHeap {
  private a: [number, number, number][] = [];
  get size(): number {
    return this.a.length;
  }
  push(c: number, x: number, y: number): void {
    this.a.push([c, x, y]);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p]![0] <= this.a[i]![0]) break;
      const t = this.a[p]!;
      this.a[p] = this.a[i]!;
      this.a[i] = t;
      i = p;
    }
  }
  pop(): [number, number, number] | undefined {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length && last) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.a.length && this.a[l]![0] < this.a[m]![0]) m = l;
        if (r < this.a.length && this.a[r]![0] < this.a[m]![0]) m = r;
        if (m === i) break;
        const t = this.a[m]!;
        this.a[m] = this.a[i]!;
        this.a[i] = t;
        i = m;
      }
    }
    return top;
  }
}

/**
 * ポートからポートへの経路を1本引く。
 * penal に「他の設備の口の正面マス」を渡すと、そこを通るのを嫌がるようになる。
 */
export function routePorts(
  ds: Dataset,
  board: Board,
  a: Node,
  pa: number,
  b: Node,
  pb: number,
  penal?: Set<string>,
): Route | null {
  const ga: PortGeom | null = portGeom(ds, a, pa);
  const gb: PortGeom | null = portGeom(ds, b, pb);
  if (!ga || !gb) return null;

  const inBounds = (c: Cell): boolean => c.x >= 0 && c.y >= 0 && c.x < board.w && c.y < board.h;
  if (!inBounds(ga.adj) || !inBounds(gb.adj)) return null;

  // 口どうしが密着している（互いの正面が相手の口そのもの）ならラインは要らない
  if (ga.adj.x === gb.inside.x && ga.adj.y === gb.inside.y && gb.adj.x === ga.inside.x && gb.adj.y === ga.inside.y)
    return { cells: [], cost: 0 };

  const occ = machineOcc(ds, board);
  const bel = beltAxis(board);
  const ka = cellKey(ga.adj.x, ga.adj.y);
  const kb = cellKey(gb.adj.x, gb.adj.y);
  // 口の正面が設備や他のラインで埋まっていたら、その口はもう使えない
  if (occ.has(ka) || occ.has(kb) || bel.has(ka) || bel.has(kb)) return null;
  if (ka === kb) return { cells: [ga.adj], cost: 1 };

  const man = Math.abs(ga.adj.x - gb.adj.x) + Math.abs(ga.adj.y - gb.adj.y);
  /* 遠回りの上限は「コスト」ではなく「通ったマス数」で見る。
     コストで打ち切ると、口の正面を何度か跨ぐだけの正当な経路
     （+5 が積み上がってコストだけ大きい）が弾かれてしまう。 */
  const cap = man * 3 + 80;

  const dist = new Map<string, number>([[ka, 0]]);
  const prev = new Map<string, string | null>([[ka, null]]);
  const steps = new Map<string, number>([[ka, 0]]);
  const heap = new MinHeap();
  heap.push(0, ga.adj.x, ga.adj.y);

  while (heap.size) {
    const top = heap.pop()!;
    const [c, x, y] = top;
    const k = cellKey(x, y);
    if (c > (dist.get(k) ?? Infinity)) continue;
    if (k === kb) break;
    const sk = steps.get(k) ?? 0;
    if (sk > cap) continue;

    for (const d of DIRS) {
      const nx = x + d[0];
      const ny = y + d[1];
      const nk = cellKey(nx, ny);
      if (nx < 0 || ny < 0 || nx >= board.w || ny >= board.h) continue;
      if (occ.has(nk)) continue;

      let extra = 0;
      const bi = bel.get(nk);
      if (bi) {
        /* 既存ラインの上は、直進しているところを直交方向に、まだ跨がれていない
           ときだけブリッジで越えられる。同じ向きに重ねること、曲がり角を跨ぐことは
           ゲーム側でできない。 */
        if (nk === kb || bi.bridged || bi.axis === 't') continue;
        const moveAxis = d[0] !== 0 ? 'h' : 'v';
        if (moveAxis === bi.axis) continue;
        extra = CROSS_COST;
      }

      /* 口の正面は +5。塞ぐくらいなら少し遠回りするが、大回りするくらいなら
         1マスだけ横切る、という判断になる。ここを絶対禁止にすると、
         盤面を一周する経路を選んで結果的に他の口を全部塞ぐ。 */
      const w = 1 + extra + (penal && nk !== kb && penal.has(nk) ? PORT_FACE_COST : 0);
      const nc = c + w;
      if (sk + 1 > cap) continue;
      const seen = dist.get(nk);
      if (seen !== undefined && seen <= nc) continue;
      dist.set(nk, nc);
      steps.set(nk, sk + 1);
      prev.set(nk, k);
      heap.push(nc, nx, ny);
    }
  }

  if (!prev.has(kb)) return null;
  const path: Cell[] = [];
  let k: string | null | undefined = kb;
  while (k) {
    const t = k.split(',');
    path.push({ x: +t[0]!, y: +t[1]! });
    k = prev.get(k);
  }
  return { cells: path.reverse(), cost: dist.get(kb)! };
}

export type ConnectFailure = 'no-out-port' | 'no-in-port' | 'no-route';

export type ConnectResult = { ok: true; belt: Belt } | { ok: false; reason: ConnectFailure };

/** 口の組み合わせを試す上限。近い順にこれだけ引いてみて、いちばん安いものを採る */
const PORT_PAIR_TRIES = 12;

/**
 * 空いている口どうしを選んで繋ぐ。
 * 参照実装と違って画面へメッセージを出さず、失敗の理由を返すだけにしてある
 * （domain は DOM を触らない）。
 */
export function connectNodes(
  ds: Dataset,
  board: Board,
  A: Node,
  Z: Node,
  item?: string | null,
): ConnectResult {
  const outs = freePorts(ds, board, A, 'out');
  const ins = freePorts(ds, board, Z, 'in');
  if (!outs.length) return { ok: false, reason: 'no-out-port' };
  if (!ins.length) return { ok: false, reason: 'no-in-port' };

  const pairs: { o: number; i: number; d: number }[] = [];
  for (const o of outs) {
    for (const i of ins) {
      const ga = portGeom(ds, A, o.i);
      const gb = portGeom(ds, Z, i.i);
      if (!ga || !gb) continue;
      pairs.push({ o: o.i, i: i.i, d: Math.abs(ga.adj.x - gb.adj.x) + Math.abs(ga.adj.y - gb.adj.y) });
    }
  }
  pairs.sort((x, y) => x.d - y.d);

  const faces = portFaces(ds, board);
  let best: { pr: { o: number; i: number; d: number }; r: Route } | null = null;
  for (const pr of pairs.slice(0, PORT_PAIR_TRIES)) {
    const r = routePorts(ds, board, A, pr.o, Z, pr.i, faces);
    if (r && (!best || r.cost < best.r.cost)) best = { pr, r };
    // 直線距離ぶんのコストで引けたなら、これ以上安くはならない
    if (best && best.r.cost <= pr.d) break;
  }
  if (!best) return { ok: false, reason: 'no-route' };

  const belt: Belt = {
    uid: nextUid(board),
    from: A.uid,
    fromPort: best.pr.o,
    to: Z.uid,
    toPort: best.pr.i,
    cells: best.r.cells,
    item: item !== undefined ? item : pickItemFor(ds, board, A.uid, Z.uid),
  };
  board.belts.push(belt);
  return { ok: true, belt };
}

export function nodeByUid(board: Board, uid: string): Node | undefined {
  return board.nodes.find((n) => n.uid === uid);
}

/**
 * そのラインが何を運ぶかの推定。
 * 送り側が出せるものと受け側が受け取れるものの共通部分の先頭を採る。
 * 物流設備（分流器・合流器）は品目を選ばないので、どちらの側でも「何でも通る」扱い。
 */
export function pickItemFor(ds: Dataset, board: Board, fromUid: string, toUid: string): string | null {
  const A = nodeByUid(board, fromUid);
  const Z = nodeByUid(board, toUid);
  if (!A || !Z) return null;
  const fa = ds.fac(A.fac);
  const fz = ds.fac(Z.fac);
  if (!fa || !fz) return null;
  const all = [...ds.items.keys()];

  const outs: string[] = fa.tap
    ? A.item
      ? [A.item]
      : []
    : fa.kind === 'logistics'
      ? all
      : (ds.rec(A.rec)?.out ?? []).map((o) => o.item);
  const ins: string[] =
    fz.kind === 'logistics' || fz.kind === 'sink' ? all : (ds.rec(Z.rec)?.in ?? []).map((o) => o.item);

  const both = outs.filter((i) => ins.includes(i));
  if (fa.kind === 'logistics' && fz.kind !== 'logistics') return ins.length === 1 ? ins[0]! : (both[0] ?? null);
  return both.length ? both[0]! : null;
}

/**
 * 設備を回した／動かしたあとに、繋がっているラインを引き直す。
 * 引き直せなかった本数を返す。
 */
export function rewire(ds: Dataset, board: Board, uid: string): number {
  const touch = board.belts.filter((b) => b.from === uid || b.to === uid);
  if (!touch.length) return 0;
  const keep = touch.map((b) => ({ from: b.from, to: b.to, item: b.item }));
  board.belts = board.belts.filter((b) => b.from !== uid && b.to !== uid);
  let lost = 0;
  for (const k of keep) {
    const A = nodeByUid(board, k.from);
    const Z = nodeByUid(board, k.to);
    if (!A || !Z) {
      lost++;
      continue;
    }
    if (!connectNodes(ds, board, A, Z, k.item).ok) lost++;
  }
  return lost;
}

/**
 * 全ラインを引き直す。
 * 端のポート番号を持っていない古い保存ファイルを読んだときに使う（後方互換）。
 */
export function repairBelts(ds: Dataset, board: Board): number {
  const keep = board.belts.map((b) => ({ from: b.from, to: b.to, item: b.item }));
  board.belts = [];
  let lost = 0;
  for (const k of keep) {
    const A = nodeByUid(board, k.from);
    const Z = nodeByUid(board, k.to);
    if (!A || !Z || !connectNodes(ds, board, A, Z, k.item).ok) lost++;
  }
  return lost;
}

/** 盤面上でラインが重なっている箇所＝ブリッジが要る箇所 */
export function crossings(board: Board): Cell[] {
  const use = new Set<string>();
  const out: Cell[] = [];
  for (const b of board.belts) {
    for (const c of b.cells || []) {
      const k = cellKey(c.x, c.y);
      if (use.has(k)) out.push(c);
      use.add(k);
    }
  }
  return out;
}
