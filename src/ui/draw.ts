/**
 * 盤面の描画。
 *
 * HANDOFF §2 の要件どおり **状態を持たない**。`draw(ctx, view)` の形で、
 * 渡されたものだけを見て描く。
 *
 * 視認性のために気をつけていること:
 *   - ラインは暗い縁取りを敷いてから品目色を重ねる（背景に溶けないように）
 *   - 上限に張り付いたラインは色だけでなく破線の重ねで示す
 *   - 稼働率は設備下端のバーと、停止時の枠色の両方で示す
 *   - 口は向きの分かる矢印で描き、未使用は中抜きにする
 *   - 交差（ブリッジが要る箇所）は橙の四角で必ず見えるようにする
 *   - ズームが小さいときは文字と口を省き、形と色だけ残す
 */

import { DIRS, KIND } from '../domain/constants';
import type { Dataset } from '../domain/dataset';
import { type Board, cellsOf, footprint, portGeom, portUsed } from '../domain/geometry';
import { crossings } from '../domain/routing';
import type { SolveResult } from '../domain/solver';
import type { Node, Rot } from '../domain/types';
import { CELL, worldToScreen, type Camera } from './camera';

export interface DrawView {
  ds: Dataset;
  board: Board;
  res: SolveResult;
  cam: Camera;
  width: number;
  height: number;
  sel: { k: 'n' | 'b'; uid: string } | null;
  hover: { k: 'n' | 'b'; uid: string } | null;
  beltFrom: string | null;
  /** 設備ツールのプレビュー */
  ghost: { fac: string; x: number; y: number; rot: Rot; ok: boolean } | null;
  /** ドラッグ移動中の行き先 */
  dragTo: { fac: string; x: number; y: number; rot: Rot; ok: boolean } | null;
}

const COL = {
  boardBg: '#081115',
  gridMinor: 'rgba(95,227,205,.055)',
  gridMajor: 'rgba(95,227,205,.14)',
  border: '#33505c',
  nodeOn: '#182831',
  nodeOff: '#241a1c',
  nodeOffLine: '#6b4144',
  label: '#d5e6eb',
  labelOff: '#a8918f',
  sub: '#7d959e',
  idle: 'rgba(130,150,160,.5)',
  sat: '#ffb84d',
  mint: '#5fe3cd',
  steel: '#9db0b8',
  sel: '#ffffff',
  hover: 'rgba(255,255,255,.55)',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** ライン1本の折れ線を画面座標で返す。両端は設備の中心に寄せる */
export function beltPoints(v: DrawView, beltUid: string): { x: number; y: number }[] {
  const b = v.board.belts.find((x) => x.uid === beltUid);
  if (!b) return [];
  const A = v.board.nodes.find((n) => n.uid === b.from);
  const Z = v.board.nodes.find((n) => n.uid === b.to);
  if (!A || !Z) return [];
  const ca = centerOf(v.ds, A);
  const cz = centerOf(v.ds, Z);
  const pts = [worldToScreen(v.cam, ca.x, ca.y)];
  for (const c of b.cells ?? []) pts.push(worldToScreen(v.cam, c.x + 0.5, c.y + 0.5));
  pts.push(worldToScreen(v.cam, cz.x, cz.y));
  return pts;
}

function centerOf(ds: Dataset, n: Node): { x: number; y: number } {
  const { w, h } = footprint(ds, n);
  return { x: n.x + w / 2, y: n.y + h / 2 };
}

export function draw(ctx: CanvasRenderingContext2D, v: DrawView): void {
  const { cam, board, ds, res } = v;
  const u = CELL * cam.z;
  ctx.clearRect(0, 0, v.width, v.height);

  /* ── 盤面と方眼 ── */
  const o = worldToScreen(cam, 0, 0);
  ctx.fillStyle = COL.boardBg;
  ctx.fillRect(o.x, o.y, board.w * u, board.h * u);

  if (u > 6) {
    ctx.strokeStyle = COL.gridMinor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= board.w; x++) {
      const p = worldToScreen(cam, x, 0);
      ctx.moveTo(p.x, o.y);
      ctx.lineTo(p.x, o.y + board.h * u);
    }
    for (let y = 0; y <= board.h; y++) {
      const p = worldToScreen(cam, 0, y);
      ctx.moveTo(o.x, p.y);
      ctx.lineTo(o.x + board.w * u, p.y);
    }
    ctx.stroke();
  }
  // 8マスごとの太い線。距離が数えやすくなる
  ctx.strokeStyle = COL.gridMajor;
  ctx.beginPath();
  for (let x = 0; x <= board.w; x += 8) {
    const p = worldToScreen(cam, x, 0);
    ctx.moveTo(p.x, o.y);
    ctx.lineTo(p.x, o.y + board.h * u);
  }
  for (let y = 0; y <= board.h; y += 8) {
    const p = worldToScreen(cam, 0, y);
    ctx.moveTo(o.x, p.y);
    ctx.lineTo(o.x + board.w * u, p.y);
  }
  ctx.stroke();
  ctx.strokeStyle = COL.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(o.x, o.y, board.w * u, board.h * u);

  /* ── ライン ── */
  for (const b of board.belts) {
    const pts = beltPoints(v, b.uid);
    if (pts.length < 2) continue;
    const flow = res.belt[b.uid] ?? 0;
    const cap = ds.capOf(b.item);
    const col = b.item ? ds.itemColor(b.item) : '#5a6f78';
    const saturated = flow >= cap - 0.05;
    const idle = flow <= 0.001;

    const stroke = (w: number, style: string, dash?: number[]): void => {
      ctx.lineWidth = w;
      ctx.strokeStyle = style;
      ctx.setLineDash(dash ?? []);
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 暗い縁取り → 品目色。背景に溶けないようにする
    stroke(Math.max(2.4, u * 0.32), 'rgba(4,9,12,.92)');
    /* 流れていないラインは薄くするだけで、品目色は保つ。
       灰色一色にすると「何を運ぶ線か」が分からなくなり、
       止まっている系統ほど読み解きたいのに読めなくなる。 */
    ctx.globalAlpha = idle ? 0.42 : 1;
    stroke(Math.max(1.6, u * 0.2), b.item ? col : COL.idle);
    ctx.globalAlpha = 1;
    /* 上限に張り付いたラインは、色ではなく**模様**で示す。
       品目色に琥珀のものがあるので、琥珀の実線では区別がつかない。
       白の破線なら、どんな品目色の上でも読める。 */
    if (saturated) {
      const d = Math.max(3, u * 0.24);
      stroke(Math.max(1.2, u * 0.09), 'rgba(255,255,255,.92)', [d, d]);
    }

    if (v.sel?.k === 'b' && v.sel.uid === b.uid) stroke(Math.max(1.2, u * 0.07), COL.sel);
    else if (v.hover?.k === 'b' && v.hover.uid === b.uid) stroke(Math.max(1, u * 0.06), COL.hover);

    // 進行方向の矢印
    if (u > 13) {
      ctx.fillStyle = idle ? 'rgba(150,170,180,.65)' : 'rgba(6,13,17,.88)';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const c = pts[i]!;
        const mx = (a.x + c.x) / 2;
        const my = (a.y + c.y) / 2;
        const ang = Math.atan2(c.y - a.y, c.x - a.x);
        const s = u * 0.15;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.lineTo(-s * 0.8, s * 0.7);
        ctx.lineTo(-s * 0.8, -s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ── 交差（ブリッジ／地下配管が要る箇所） ── */
  for (const c of crossings(board)) {
    const p = worldToScreen(cam, c.x + 0.5, c.y + 0.5);
    const sz = Math.max(3, u * 0.26);
    ctx.fillStyle = '#0b1216';
    ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    ctx.strokeStyle = COL.sat;
    ctx.lineWidth = Math.max(1, u * 0.055);
    ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }

  /* ── 設備 ── */
  for (const n of board.nodes) {
    const f = ds.fac(n.fac);
    if (!f) continue;
    const { w, h } = footprint(ds, n);
    const p = worldToScreen(cam, n.x, n.y);
    const W = w * u;
    const H = h * u;
    const kc = (KIND[f.kind] ?? KIND.process).color;
    const rt = res.ratio[n.uid] ?? 0;
    const passive = f.kind === 'sink' || f.kind === 'logistics';
    const on = passive || rt > 0.005;
    const r = Math.min(4, u * 0.16);

    ctx.fillStyle = on ? COL.nodeOn : COL.nodeOff;
    roundRect(ctx, p.x + 1, p.y + 1, W - 2, H - 2, r);
    ctx.fill();
    ctx.strokeStyle = on ? kc : COL.nodeOffLine;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = on ? 0.9 : 1;
    roundRect(ctx, p.x + 1, p.y + 1, W - 2, H - 2, r);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 種別を示す左端の帯
    ctx.fillStyle = kc;
    ctx.globalAlpha = 0.26;
    ctx.fillRect(p.x + 1, p.y + 1, Math.max(2, u * 0.13), H - 2);
    ctx.globalAlpha = 1;

    // 稼働率バー
    if (!passive) {
      const bw = (W - 8) * Math.max(0, Math.min(1, rt));
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(p.x + 4, p.y + H - 7, W - 8, 3.5);
      ctx.fillStyle = rt > 0.995 ? COL.mint : rt > 0.005 ? COL.sat : '#ff7d6d';
      ctx.fillRect(p.x + 4, p.y + H - 7, bw, 3.5);
    }

    /* 名前と作るもの。
       読めない大きさの文字は描かない —— 潰れた文字は情報にならず、
       線や色の判別を邪魔するだけになる。9px を下限にしている。 */
    const nameSize = Math.min(13, u * 0.42);
    if (nameSize >= 9 && W > u * 1.5) {
      ctx.textBaseline = 'top';
      ctx.fillStyle = on ? COL.label : COL.labelOff;
      ctx.font = `600 ${nameSize}px system-ui, sans-serif`;
      const label = f.name.length > 7 && W < u * 3 ? f.name.slice(0, 6) + '…' : f.name;
      ctx.fillText(label, p.x + u * 0.22, p.y + u * 0.14, W - u * 0.34);

      const subSize = Math.min(11, u * 0.33);
      const sub = f.tap ? (n.item ? ds.itemName(n.item) : '未設定') : (ds.rec(n.rec)?.name ?? '');
      if (sub && subSize >= 9 && H > u * 1.5) {
        ctx.fillStyle = COL.sub;
        ctx.font = `400 ${subSize}px ui-monospace, monospace`;
        ctx.fillText(sub.replace(/^[^：]*：/, ''), p.x + u * 0.22, p.y + u * 0.14 + nameSize + 2, W - u * 0.34);
      }
      /* 何を扱う設備かは、盤面のラインと同じ品目色の点でも示す。
         レシピ名が入らない大きさでも「何を作る列か」が一目で分かる。 */
      const mark = f.tap ? n.item : (ds.rec(n.rec)?.out[0]?.item ?? null);
      if (mark) {
        ctx.fillStyle = ds.itemColor(mark);
        ctx.fillRect(p.x + W - u * 0.36, p.y + u * 0.18, u * 0.2, u * 0.2);
      }
    } else if (u > 8) {
      // 文字がまったく入らない大きさでも、扱う品目は色で分かるようにする
      const mark = f.tap ? n.item : (ds.rec(n.rec)?.out[0]?.item ?? null);
      if (mark) {
        ctx.fillStyle = ds.itemColor(mark);
        ctx.fillRect(p.x + W * 0.3, p.y + H * 0.3, W * 0.4, H * 0.4);
      }
    }

    if (v.sel?.k === 'n' && v.sel.uid === n.uid) {
      ctx.strokeStyle = COL.sel;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      roundRect(ctx, p.x - 2.5, p.y - 2.5, W + 5, H + 5, r + 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (v.hover?.k === 'n' && v.hover.uid === n.uid) {
      ctx.strokeStyle = COL.hover;
      ctx.lineWidth = 1.4;
      roundRect(ctx, p.x - 1.5, p.y - 1.5, W + 3, H + 3, r + 1);
      ctx.stroke();
    }
    if (v.beltFrom === n.uid) {
      ctx.strokeStyle = COL.mint;
      ctx.lineWidth = 2.4;
      roundRect(ctx, p.x - 3.5, p.y - 3.5, W + 7, H + 7, r + 3);
      ctx.stroke();
    }

    // 搬入口・搬出口
    if (u > 12) {
      const ps = ds.ports(f.id);
      for (let pi = 0; pi < ps.length; pi++) {
        const g = portGeom(ds, n, pi);
        if (!g) continue;
        const c = worldToScreen(cam, g.inside.x + 0.5, g.inside.y + 0.5);
        const d = DIRS[g.dir]!;
        const t = u * 0.4;
        const len = u * 0.16;
        const mx = c.x + d[0] * t;
        const my = c.y + d[1] * t;
        const used = portUsed(board, n.uid, pi);
        ctx.strokeStyle = g.t === 'out' ? COL.mint : COL.steel;
        ctx.lineWidth = Math.max(1.5, u * 0.11);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(mx - d[0] * len, my - d[1] * len);
        ctx.lineTo(mx + d[0] * len, my + d[1] * len);
        ctx.stroke();
        if (!used) {
          // 未使用の口は中を抜いて「空いている」と分かるようにする
          ctx.strokeStyle = 'rgba(8,17,21,.92)';
          ctx.lineWidth = Math.max(1, u * 0.05);
          ctx.beginPath();
          ctx.moveTo(mx - d[0] * len * 0.3, my - d[1] * len * 0.3);
          ctx.lineTo(mx + d[0] * len * 0.3, my + d[1] * len * 0.3);
          ctx.stroke();
        }
      }
    }
  }

  /* ── 置こうとしている設備・動かそうとしている設備 ── */
  const preview = (g: NonNullable<DrawView['ghost']>, filled: boolean): void => {
    const t: Node = { uid: '', fac: g.fac, x: g.x, y: g.y, rot: g.rot };
    const { w, h } = footprint(ds, t);
    const p = worldToScreen(cam, g.x, g.y);
    if (filled) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = g.ok ? '#1f424a' : '#421f26';
      roundRect(ctx, p.x + 1, p.y + 1, w * u - 2, h * u - 2, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = g.ok ? COL.mint : '#ff7d6d';
    ctx.setLineDash([5, 3]);
    ctx.lineWidth = 1.6;
    roundRect(ctx, p.x + 1, p.y + 1, w * u - 2, h * u - 2, 3);
    ctx.stroke();
    ctx.setLineDash([]);
    if (u > 17 && filled) {
      const f = ds.fac(g.fac);
      if (f) {
        ctx.fillStyle = '#a8c0c7';
        ctx.font = `600 ${Math.min(11.5, u * 0.4)}px system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(f.name, p.x + u * 0.22, p.y + u * 0.15, w * u - u * 0.34);
      }
    }
  };
  if (v.dragTo) preview(v.dragTo, false);
  if (v.ghost) preview(v.ghost, true);
}

/** 画面座標がどのラインに近いか（隣接設備間の短いライン向け） */
export function beltNear(v: DrawView, sx: number, sy: number, tol: number): string | null {
  let best: string | null = null;
  let bd = tol * tol;
  for (const b of v.board.belts) {
    const pts = beltPoints(v, b.uid);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const c = pts[i]!;
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const L = dx * dx + dy * dy;
      let t = L ? ((sx - a.x) * dx + (sy - a.y) * dy) / L : 0;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + t * dx - sx;
      const py = a.y + t * dy - sy;
      const d = px * px + py * py;
      if (d < bd) {
        bd = d;
        best = b.uid;
      }
    }
  }
  return best;
}

/** 盤面のどのマスに何があるか（当たり判定） */
export function nodeAtCell(ds: Dataset, board: Board, x: number, y: number): Node | null {
  for (const n of board.nodes) {
    const { w, h } = footprint(ds, n);
    if (x >= n.x && x < n.x + w && y >= n.y && y < n.y + h) return n;
  }
  return null;
}

export function beltAtCell(board: Board, x: number, y: number): string | null {
  for (const b of board.belts) for (const c of b.cells ?? []) if (c.x === x && c.y === y) return b.uid;
  return null;
}

/** 設備が占めるマス（ドラッグ移動の判定に使う） */
export const occupiedCells = cellsOf;
