/**
 * 盤面の幾何（HANDOFF §2 の geometry.ts）
 *
 *   footprint / ポート幾何 / 回転 / 占有図
 *
 * 参照実装では盤面が `D.nodes` `D.belts` と `GW/GH` というグローバルだった。
 * ここでは Board という値にまとめ、全ての関数が引数で受け取る形にしている。
 *
 * 参照実装から落としたもの: ringOf / touching は定義だけで
 * どこからも呼ばれていなかったため移していない。
 */

import { DIRS } from './constants';
import type { Dataset } from './dataset';
import type { Belt, Cell, Facility, Node, Rot } from './types';

/** 盤面ひとつ分の状態。エリアの nodes / belts / 盤面サイズをまとめたもの */
export interface Board {
  w: number;
  h: number;
  nodes: Node[];
  belts: Belt[];
  /** uid の採番。参照実装の uidSeq に相当し、エリアを読むたびに振り直す */
  uidSeq: number;
}

export function createBoard(w: number, h: number): Board {
  return { w, h, nodes: [], belts: [], uidSeq: 1 };
}

/** 既存の uid（u1, u2, …）と衝突しないところから採番を始める */
export function boardOf(w: number, h: number, nodes: Node[], belts: Belt[]): Board {
  let seq = 1;
  for (const o of [...nodes, ...belts]) {
    const m = /^u(\d+)$/.exec(o.uid || '');
    if (m) seq = Math.max(seq, +m[1]! + 1);
  }
  return { w, h, nodes, belts, uidSeq: seq };
}

export function nextUid(board: Board): string {
  return 'u' + board.uidSeq++;
}

/**
 * 設備の占有範囲。90°／270°では幅と奥行きが入れ替わる。
 *
 * 参照実装は `n.rot ? {w:f.h,h:f.w} : {w:f.w,h:f.h}` と書いていて、
 * 180°回転（rot=2）でも入れ替えてしまっていた。portGeom 側は rot=2 を
 * 「w×h のまま上下左右を反転」として計算しているので、両者が食い違う。
 * 初期データの設備が全て正方形なので表に出ていないだけで、
 * ユーザーが非正方形の設備を作った瞬間に口が範囲外へ出るバグになる。
 * ここは portGeom に合わせて rot の偶奇で判定する。
 */
export function footprint(ds: Dataset, n: Pick<Node, 'fac' | 'rot'>): { w: number; h: number } {
  const f = ds.fac(n.fac);
  if (!f) return { w: 1, h: 1 };
  return (n.rot || 0) & 1 ? { w: f.h, h: f.w } : { w: f.w, h: f.h };
}

export function cellsOf(ds: Dataset, n: Node): Cell[] {
  const { w, h } = footprint(ds, n);
  const out: Cell[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push({ x: n.x + x, y: n.y + y });
  return out;
}

export function center(ds: Dataset, n: Node): { x: number; y: number } {
  const { w, h } = footprint(ds, n);
  return { x: n.x + w / 2, y: n.y + h / 2 };
}

export const cellKey = (x: number, y: number): string => x + ',' + y;

export type Occupant = { t: 'n' | 'b'; uid: string };

/** 設備とラインの両方を含む占有図。設備が先勝ち */
export function buildOcc(ds: Dataset, board: Board, skipBeltUid?: string): Map<string, Occupant> {
  const m = new Map<string, Occupant>();
  for (const n of board.nodes) for (const c of cellsOf(ds, n)) m.set(cellKey(c.x, c.y), { t: 'n', uid: n.uid });
  for (const b of board.belts) {
    if (b.uid === skipBeltUid) continue;
    for (const c of b.cells || []) {
      const k = cellKey(c.x, c.y);
      if (!m.has(k)) m.set(k, { t: 'b', uid: b.uid });
    }
  }
  return m;
}

/** 設備だけの占有図。経路探索はラインを別扱い（跨げることがある）にするのでこちらを使う */
export function machineOcc(ds: Dataset, board: Board): Map<string, string> {
  const m = new Map<string, string>();
  for (const n of board.nodes) for (const c of cellsOf(ds, n)) m.set(cellKey(c.x, c.y), n.uid);
  return m;
}

export function canPlace(ds: Dataset, board: Board, n: Node, ignoreUid?: string): boolean {
  const { w, h } = footprint(ds, n);
  if (n.x < 0 || n.y < 0 || n.x + w > board.w || n.y + h > board.h) return false;
  const occ = buildOcc(ds, {
    ...board,
    nodes: ignoreUid ? board.nodes.filter((x) => x.uid !== ignoreUid) : board.nodes,
    belts: ignoreUid ? board.belts.filter((b) => b.from !== ignoreUid && b.to !== ignoreUid) : board.belts,
  });
  return cellsOf(ds, n).every((c) => !occ.has(cellKey(c.x, c.y)));
}

export function nodeAt(ds: Dataset, board: Board, x: number, y: number): Node | null {
  for (const n of board.nodes) {
    const { w, h } = footprint(ds, n);
    if (x >= n.x && x < n.x + w && y >= n.y && y < n.y + h) return n;
  }
  return null;
}

export function beltAt(board: Board, x: number, y: number): Belt | null {
  for (const b of board.belts) for (const c of b.cells || []) if (c.x === x && c.y === y) return b;
  return null;
}

/* ── 搬入口／搬出口（ポート）の幾何 ───────────────────────────
   ポートは「設備のどの辺のどこに口があるか」で持つ。設備を回すと口も回る。
   1つの口に繋げるラインは1本まで —— これが実際の詰め込み密度を決めている。 */

export interface PortGeom {
  /** ポート番号（Belt.fromPort / toPort と同じ） */
  i: number;
  t: 'in' | 'out';
  /** 口があるマス（設備の内側） */
  inside: Cell;
  /** 口の正面のマス。ラインはここから始まる */
  adj: Cell;
  /** 口が向いている方角。DIRS の添字 */
  dir: number;
}

export function portGeom(ds: Dataset, n: Node, pi: number): PortGeom | null {
  const f: Facility | undefined = ds.fac(n.fac);
  if (!f) return null;
  const P = ds.ports(f.id)[pi];
  if (!P) return null;
  const w = f.w;
  const h = f.h;
  const r = ((n.rot || 0) & 3) as Rot;

  // まず回転前（rot=0）の設備内でのマスを求める
  let lx: number;
  let ly: number;
  if (P.s === 0) {
    lx = P.o;
    ly = 0;
  } else if (P.s === 1) {
    lx = w - 1;
    ly = P.o;
  } else if (P.s === 2) {
    lx = P.o;
    ly = h - 1;
  } else {
    lx = 0;
    ly = P.o;
  }

  // 回転を適用する。90°ごとに w×h の枠ごと回すので、辺の番号も同じだけずれる
  let rx: number;
  let ry: number;
  if (r === 0) {
    rx = lx;
    ry = ly;
  } else if (r === 1) {
    rx = h - 1 - ly;
    ry = lx;
  } else if (r === 2) {
    rx = w - 1 - lx;
    ry = h - 1 - ly;
  } else {
    rx = ly;
    ry = w - 1 - lx;
  }

  const inside: Cell = { x: n.x + rx, y: n.y + ry };
  const dir = (P.s + r) & 3;
  const d = DIRS[dir]!;
  return { i: pi, t: P.t, inside, adj: { x: inside.x + d[0], y: inside.y + d[1] }, dir };
}

/** その口に既にラインが繋がっているか。1つの口につき1本まで */
export function portUsed(board: Board, uid: string, pi: number): boolean {
  return board.belts.some((b) => (b.from === uid && b.fromPort === pi) || (b.to === uid && b.toPort === pi));
}

export function portList(ds: Dataset, node: Node, t: 'in' | 'out'): { i: number }[] {
  const f = ds.fac(node.fac);
  if (!f) return [];
  return ds
    .ports(f.id)
    .map((p, i) => ({ p, i }))
    .filter((x) => x.p.t === t)
    .map((x) => ({ i: x.i }));
}

export function freePorts(ds: Dataset, board: Board, node: Node, t: 'in' | 'out'): { i: number }[] {
  return portList(ds, node, t).filter((x) => !portUsed(board, node.uid, x.i));
}

/** 全設備の口の正面マス。ここを他のラインに横切られると、その口は使えなくなる */
export function portFaces(ds: Dataset, board: Board): Set<string> {
  const s = new Set<string>();
  for (const n of board.nodes) {
    const f = ds.fac(n.fac);
    if (!f) continue;
    const ps = ds.ports(f.id);
    for (let i = 0; i < ps.length; i++) {
      const g = portGeom(ds, n, i);
      if (g) s.add(cellKey(g.adj.x, g.adj.y));
    }
  }
  return s;
}

/**
 * 既存ラインの通り方。
 * 直進しているマス（'h' 横 / 'v' 縦）は、直交方向ならブリッジで跨げる。
 * 曲がり角（'t'）と、既に1度跨がれたマス（bridged）はもう跨げない。
 */
export type BeltAxis = { axis: 'h' | 'v' | 't'; bridged: boolean };

export function beltAxis(board: Board, skipUid?: string): Map<string, BeltAxis> {
  const m = new Map<string, BeltAxis>();
  for (const b of board.belts) {
    if (b.uid === skipUid) continue;
    const cs = b.cells || [];
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i]!;
      const pv = cs[i - 1];
      const nx = cs[i + 1];
      let ax: 'h' | 'v' | 't';
      if (pv && nx) ax = pv.x === nx.x ? 'v' : pv.y === nx.y ? 'h' : 't';
      else if (pv) ax = pv.x === c.x ? 'v' : 'h';
      else if (nx) ax = nx.x === c.x ? 'v' : 'h';
      else ax = 't';
      const k = cellKey(c.x, c.y);
      m.set(k, m.get(k) ? { axis: 't', bridged: true } : { axis: ax, bridged: false });
    }
  }
  return m;
}

/** 盤面の密度を測る（効率パネル用）。参照実装の boardMetrics */
export function boardMetrics(
  ds: Dataset,
  board: Board,
  ratio: Record<string, number> = {},
): {
  cells: number;
  facCells: number;
  beltCells: number;
  bbox: number;
  fill: number;
  avgUtil: number;
  machines: number;
  bw: number;
  bh: number;
} {
  const used = new Set<string>();
  let facCells = 0;
  let beltCells = 0;
  let minX = 1e9;
  let minY = 1e9;
  let maxX = -1;
  let maxY = -1;
  for (const n of board.nodes) {
    for (const c of cellsOf(ds, n)) {
      used.add(cellKey(c.x, c.y));
      facCells++;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
  }
  for (const b of board.belts) {
    for (const c of b.cells || []) {
      const k = cellKey(c.x, c.y);
      if (!used.has(k)) {
        used.add(k);
        beltCells++;
      }
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
  }
  const bbox = maxX < 0 ? 0 : (maxX - minX + 1) * (maxY - minY + 1);
  let util = 0;
  let cnt = 0;
  for (const n of board.nodes) {
    const f = ds.fac(n.fac);
    if (!f || f.kind === 'sink' || f.kind === 'logistics') continue;
    util += ratio[n.uid] || 0;
    cnt++;
  }
  return {
    cells: used.size,
    facCells,
    beltCells,
    bbox,
    fill: bbox ? used.size / bbox : 0,
    avgUtil: cnt ? util / cnt : 0,
    machines: cnt,
    bw: maxX < 0 ? 0 : maxX - minX + 1,
    bh: maxY < 0 ? 0 : maxY - minY + 1,
  };
}
