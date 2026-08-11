/**
 * ブロック方式の配置（HANDOFF §5-3 / §2 の layout/blocks.ts）
 *
 * 全設備が整数台になる最小ユニットを1枚だけ丁寧に組み（置き方を最大27通り試し、
 * 時間で打ち切る）、平行移動で敷き詰める。
 * 1枚が原料の取り出しから倉庫への搬入まで自己完結しているので、
 * 何枚並べても配線が破綻せず、増設も1枚単位でできる。
 */

import { BOARD_H_DEFAULT, BOARD_W_DEFAULT, BOARD_H_MAX, BOARD_W_MAX, clampBoard } from '../constants';
import type { Dataset } from '../dataset';
import { type Board, createBoard, nextUid } from '../geometry';
import { buildPlan, unitOf, type Choice, type Plan, type PlanContext } from '../planner';
import { connectNodes } from '../routing';
import type { Belt, Node } from '../types';
import { autoLayout, type LayoutBase, type LayoutOptions, type LayoutResult } from './autoLayout';

/** 置き方の候補。順序・縦の間隔・段間の余白の組み合わせで 3×3×3 = 27通り */
export const LAY_VARIANTS: LayoutOptions[] = (() => {
  const v: LayoutOptions[] = [];
  for (const order of ['dy', 'len', 'x'] as const)
    for (const pad of [2, 3, 4]) for (const gm of [1, 2, 3]) v.push({ order, pad, gm });
  return v;
})();

export interface Block {
  nodes: Node[];
  belts: Belt[];
  w: number;
  h: number;
  power: number;
  failed: number;
  made: number;
  plan: Plan;
}

/**
 * 1枚分を実際に組んでみて、原点に寄せた雛形として持ち帰る。
 * 小さなブロックなら総当たりできるので、配線が1本も落ちない置き方を探す。
 * 大きなブロックは1回の試行が重いので、探索は候補数と時間の両方で打ち切る。
 */
export function captureBlock(
  ds: Dataset,
  plan: Plan,
  opts: { budget?: number; msLimit?: number; now?: () => number; w?: number; h?: number } = {},
): Block | null {
  const now = opts.now ?? (() => Date.now());
  const t0 = now();
  const limit = opts.msLimit ?? 2500;
  const size = (plan.rows || []).reduce((a, r) => a + r.int, 0);
  const budget = opts.budget ?? (size > 60 ? 4 : size > 30 ? 9 : LAY_VARIANTS.length);
  const vs = LAY_VARIANTS.slice(0, budget);

  let best: { score: number; r: LayoutResult; nodes: Node[]; belts: Belt[] } | null = null;
  for (const v of vs) {
    if (best && now() - t0 > limit) break;
    /* 1枚ぶんの盤面は毎回まっさらから組む（呼び出し側の盤面は触らない）。
       ただし**開始サイズは呼び出し側の盤面と同じ**にすること。
       autoLayout の縦の広がりは `max(いまの高さ, 必要な高さ)` で決まるので、
       ここで最大サイズから始めると段が広がりきって別の配置になる。 */
    const tmp = createBoard(opts.w ?? BOARD_W_DEFAULT, opts.h ?? BOARD_H_DEFAULT);
    let r: LayoutResult | null = null;
    try {
      r = autoLayout(ds, tmp, plan, { ...v, autoGrow: true });
    } catch {
      r = null;
    }
    if (!r || !tmp.nodes.length) continue;
    // 配線が落ちないことを最優先、次に設備数、次にベルトの総長
    const score = r.failed * 1000 + tmp.nodes.length + tmp.belts.reduce((a, b) => a + (b.cells || []).length, 0);
    if (!best || score < best.score) best = { score, r, nodes: tmp.nodes, belts: tmp.belts };
    if (r.failed === 0) break;
  }
  if (!best || !best.nodes.length) return null;

  const { nodes, belts } = best;
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const n of nodes) {
    const f = ds.fac(n.fac) ?? { w: 1, h: 1 };
    const swap = (n.rot || 0) & 1;
    const fw = swap ? f.h : f.w;
    const fh = swap ? f.w : f.h;
    x0 = Math.min(x0, n.x);
    y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x + fw);
    y1 = Math.max(y1, n.y + fh);
  }
  for (const b of belts)
    for (const c of b.cells || []) {
      x0 = Math.min(x0, c.x);
      y0 = Math.min(y0, c.y);
      x1 = Math.max(x1, c.x + 1);
      y1 = Math.max(y1, c.y + 1);
    }
  for (const n of nodes) {
    n.x -= x0;
    n.y -= y0;
  }
  for (const b of belts)
    for (const c of b.cells || []) {
      c.x -= x0;
      c.y -= y0;
    }

  let power = 0;
  for (const n of nodes) power += ds.fac(n.fac)?.power ?? 0;
  return { nodes, belts, w: x1 - x0, h: y1 - y0, power, failed: best.r.failed, made: best.r.made, plan };
}

/** 雛形を指定位置に押す。配線は雛形のまま平行移動するだけなので必ず通る */
export function stampBlock(board: Board, blk: Block, ox: number, oy: number): void {
  const map: Record<string, string> = {};
  for (const n of blk.nodes) {
    const u = nextUid(board);
    map[n.uid] = u;
    board.nodes.push({
      uid: u,
      fac: n.fac,
      x: n.x + ox,
      y: n.y + oy,
      rot: n.rot || 0,
      rec: n.rec ?? null,
      item: n.item ?? null,
    });
  }
  for (const b of blk.belts) {
    board.belts.push({
      uid: nextUid(board),
      from: map[b.from]!,
      to: map[b.to]!,
      fromPort: b.fromPort,
      toPort: b.toPort,
      item: b.item,
      cells: (b.cells || []).map((c) => ({ x: c.x + ox, y: c.y + oy })),
    });
  }
}

/**
 * 発電区画：取出口 → 発電機を1組として並べる。
 * バッテリーは倉庫から引き出す前提なので、生産ラインとは切り離せる。
 */
export function placePower(
  ds: Dataset,
  board: Board,
  gens: number,
  batItem: string | null,
  ox: number,
  oy: number,
  maxY: number,
): { failed: number; right: number; bottom: number } {
  const gf = ds.generatorFac();
  const gr = ds.generatorRec();
  const tapF = [...ds.facs.values()].find((f) => f.tap);
  if (!gf || !tapF) return { failed: gens, right: ox, bottom: oy };

  const gh = gf.h;
  const gw = gf.w;
  let placed = 0;
  let x = ox;
  let y = oy;
  let failed = 0;
  let right = ox;
  let bottom = oy;
  while (placed < gens) {
    if (y + gh > maxY && y > oy) {
      y = oy;
      x += gw + 4;
    }
    if (x + gw + 2 >= BOARD_W_MAX) break;
    /* 取出口を発電機の搬入口の真正面に置く。ラインが1マスで確実に繋がる */
    const g: Node = { uid: nextUid(board), fac: gf.id, x: x + 2, y, rot: 0, rec: gr ? gr.id : null, item: null };
    const tap: Node = { uid: nextUid(board), fac: tapF.id, x, y, rot: 0, rec: null, item: batItem };
    board.nodes.push(tap, g);
    if (!connectNodes(ds, board, tap, g, batItem).ok) failed++;
    placed++;
    y += gh + 1;
    right = Math.max(right, x + 2 + gw);
    bottom = Math.max(bottom, y);
  }
  if (placed < gens) failed += gens - placed;
  return { failed, right, bottom };
}

export interface BlocksResult extends LayoutBase {
  mode: 'blocks';
  blocks: number;
  batBlocks: number;
  gens: number;
  unit: number;
  batRate: number;
  batItem: string | null;
  blockSize: [number, number];
  blockPower: number;
  blockMachines: number;
}

/** ブロック方式で全体を組む */
export function autoLayoutBlocks(
  ctx: PlanContext,
  board: Board,
  plan: Plan,
  choice: Choice = {},
  opts: { msLimit?: number; now?: () => number } = {},
): BlocksResult | null {
  const ds = ctx.ds;
  const gf = ds.generatorFac();
  const gr = ds.generatorRec(ctx.genRec);
  const base = Math.max(0, +ctx.basePower || 0);
  const batItem = gr?.in?.[0]?.item ?? null;
  const perGen = gr?.in?.[0] ? (gr.in[0]!.qty * 60) / gr.sec : 0;

  const unitMain = unitOf(ctx, plan.targetItem, choice);
  if (!unitMain) return null;
  const size = { w: board.w, h: board.h };
  const blkMain = captureBlock(ds, buildPlan(ctx, plan.targetItem, unitMain, choice, { noPower: true }), { ...opts, ...size });
  if (!blkMain) return null;

  /* 発電用のバッテリーが別品目なら、必要量ちょうどの給電ラインを1本だけ作る */
  const sep = !!(batItem && batItem !== plan.targetItem && gf);
  let blkBat: Block | null = null;

  /* 台数と発電機数を収束させる（給電ライン自身の消費も含めて） */
  let gens = 0;
  let nMain = 1;
  for (let it = 0; it < 10; it++) {
    const rate = plan.targetRate + (sep ? 0 : gens * perGen);
    nMain = Math.max(1, Math.ceil(rate / unitMain - 1e-9));
    const power = nMain * blkMain.power + (blkBat ? blkBat.power : 0);
    const ng = gf && gf.gen > 0 ? Math.max(0, Math.ceil((power - base) / gf.gen - 1e-9)) : 0;
    if (ng === gens) break;
    gens = ng;
    if (sep && gens > 0 && batItem) {
      const bp = buildPlan(ctx, batItem, gens * perGen, choice, { noPower: true });
      blkBat = bp && bp.rows.length ? captureBlock(ds, bp, { ...opts, ...size, budget: 9 }) : null;
    }
  }
  const nBat = blkBat ? 1 : 0;
  if (nMain > 200) return null;

  /* 並べ方：全体が正方形に近くなる列数を選ぶ */
  const grid = (n: number, w: number, h: number): { cols: number; rows: number } => {
    const cols = Math.max(1, Math.round(Math.sqrt((n * (h + 2)) / (w + 2))) || 1);
    return { cols: Math.min(cols, n), rows: Math.ceil(n / Math.min(cols, n)) };
  };
  const gA = grid(nMain, blkMain.w, blkMain.h);
  const wA = gA.cols * (blkMain.w + 2) + 1;
  const hA = gA.rows * (blkMain.h + 2) + 1;
  const wB = nBat ? blkBat!.w + 3 : 0;
  const hB = nBat ? blkBat!.h + 3 : 0;
  const powW = gens && gf ? (Math.ceil(gens / 3) > 4 ? 2 * (gf.w + 7) : gf.w + 7) : 0;
  const c = clampBoard(
    Math.min(BOARD_W_MAX, wA + wB + powW + 6),
    Math.min(BOARD_H_MAX, Math.max(hA, hB, gens && gf ? Math.ceil(gens / 3) * (gf.h * 3 + 4) : 0) + 3),
  );
  board.w = c.w;
  board.h = c.h;

  board.nodes = [];
  board.belts = [];
  board.uidSeq = 1;
  let failed = blkMain.failed * nMain + (blkBat ? blkBat.failed : 0);
  for (let i = 0; i < nMain; i++) {
    const col = i % gA.cols;
    const row = Math.floor(i / gA.cols);
    stampBlock(board, blkMain, 1 + col * (blkMain.w + 2), 1 + row * (blkMain.h + 2));
  }
  let cx = wA + 2;
  if (nBat && blkBat) {
    stampBlock(board, blkBat, cx, 1);
    cx += wB + 2;
  }
  let pw = { failed: 0 };
  if (gens > 0) pw = placePower(ds, board, gens, batItem, cx, 1, board.h - 2);
  failed += pw.failed;

  return {
    mode: 'blocks',
    blocks: nMain,
    batBlocks: nBat,
    gens,
    failed,
    made: board.belts.length,
    unit: unitMain,
    batRate: gens * perGen,
    batItem,
    blockSize: [blkMain.w, blkMain.h],
    blockPower: blkMain.power,
    blockMachines: blkMain.nodes.length,
    overflow: false,
    logistics: board.nodes.filter((n) => ds.fac(n.fac)?.kind === 'logistics').length,
  };
}

/**
 * 生産目標を盤面へ落とす入口。
 * ブロック方式を試し、配線が落ちるなら1本のライン方式と比べて良い方を採る。
 */
export function applyPlan(
  ctx: PlanContext,
  board: Board,
  plan: Plan,
  choice: Choice = {},
  opts: { useBlocks?: boolean; msLimit?: number; now?: () => number } = {},
): LayoutResult | BlocksResult {
  const useBlocks = opts.useBlocks !== false;
  if (useBlocks) {
    let r: BlocksResult | null = null;
    try {
      r = autoLayoutBlocks(ctx, board, plan, choice, opts);
    } catch {
      r = null;
    }
    if (r && r.failed > 0) {
      // ブロックで配線が落ちるなら、1本のラインと比べて良い方を採る
      const keep = { nodes: board.nodes, belts: board.belts, w: board.w, h: board.h, seq: board.uidSeq };
      board.nodes = [];
      board.belts = [];
      const r2 = autoLayout(ctx.ds, board, plan);
      if (r2.failed < r.failed) return r2;
      board.nodes = keep.nodes;
      board.belts = keep.belts;
      board.w = keep.w;
      board.h = keep.h;
      board.uidSeq = keep.seq;
      return r;
    }
    if (r) return r;
  }
  return autoLayout(ctx.ds, board, plan);
}
