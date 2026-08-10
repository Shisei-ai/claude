/**
 * §6-2 の単体テスト（経路探索）。HANDOFF が挙げる4つ —— 直線・迂回・交差・口の正面回避 ——
 * に加えて、参照実装との差分テストを回して移植のずれを機械的に検出する。
 */

import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { buildDataset } from '../src/domain/dataset';
import { boardOf, portFaces, type Board } from '../src/domain/geometry';
import { CROSS_COST, PORT_FACE_COST, connectNodes, crossings, pickItemFor, repairBelts, rewire, routePorts } from '../src/domain/routing';
import type { Belt, Node, Rot } from '../src/domain/types';
import { loadReference } from './helpers/reference';

const data = seed();
const ds = buildDataset(data);

let uid = 0;
const node = (fac: string, x: number, y: number, rot: Rot = 0, extra: Partial<Node> = {}): Node => ({
  uid: 'u' + ++uid,
  fac,
  x,
  y,
  rot,
  ...extra,
});
const board = (w: number, h: number, nodes: Node[], belts: Belt[] = []): Board => boardOf(w, h, nodes, belts);
const path = (r: { cells: { x: number; y: number }[] } | null): string =>
  r ? r.cells.map((c) => `${c.x},${c.y}`).join(' ') : 'null';

describe('直線', () => {
  it('向かい合った口の間をまっすぐ引く', () => {
    // 倉庫搬出口(1×1, 出口は右) → 精錬炉(2×2, 入口は左)
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const b = board(24, 12, [a, z]);
    const r = routePorts(ds, b, a, 0, z, 2)!;
    expect(path(r)).toBe('3,5 4,5 5,5 6,5 7,5');
    // コストは「進んだ回数」。始点（搬出口の正面マス）はただで乗るので マス数−1
    expect(r.cost).toBe(4);
  });

  it('口どうしが密着しているときはラインが要らない', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 3, 5, 0, { rec: 'r_shell' });
    const r = routePorts(ds, board(24, 12, [a, z]), a, 0, z, 2)!;
    expect(r).toEqual({ cells: [], cost: 0 });
  });

  it('口の正面が設備で塞がっていたら引けない', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const wall = node('box', 3, 5); // 搬出口の真正面を潰す
    expect(routePorts(ds, board(24, 12, [a, z, wall]), a, 0, z, 2)).toBeNull();
  });
});

describe('迂回', () => {
  it('間の設備を避けて回り込む', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 10, 5, 0, { rec: 'r_shell' });
    const wall = node('tenyu', 5, 4); // 4×4 が真ん中に居座る
    const r = routePorts(ds, board(24, 14, [a, z, wall]), a, 0, z, 2)!;
    expect(r).not.toBeNull();
    // 障害物のマスを一切通らない
    const occupied = new Set<string>();
    for (let y = 4; y < 8; y++) for (let x = 5; x < 9; x++) occupied.add(`${x},${y}`);
    for (const c of r.cells) expect(occupied).not.toContain(`${c.x},${c.y}`);
    expect(r.cells.length).toBeGreaterThan(7); // 直線より長い
  });

  it('通り道が無ければ null', () => {
    const a = node('wh_out', 0, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 6, 5, 0, { rec: 'r_shell' });
    // 縦一列に壁を作って盤面を分断する
    const walls: Node[] = [];
    for (let y = 0; y < 12; y++) walls.push(node('wh_in', 3, y));
    expect(routePorts(ds, board(12, 12, [a, z, ...walls]), a, 0, z, 2)).toBeNull();
  });
});

describe('交差（ブリッジ）', () => {
  it('直進しているラインは直交方向なら跨げる（+12）', () => {
    // 盤面を縦に貫くラインを置いて、迂回では回り込めないようにする。
    // 回り込めてしまうと「跨いだ」のか「避けた」のか判別できない。
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const H = 12;
    const cells = Array.from({ length: H }, (_, y) => ({ x: 5, y }));
    // beltAxis が見るのは cells だけなので、端点の設備は既存のものを借りてよい
    const belt: Belt = { uid: 'bv', from: a.uid, fromPort: 9, to: z.uid, toPort: 9, cells, item: 'water' };
    const r = routePorts(ds, board(24, H, [a, z], [belt]), a, 0, z, 2)!;
    expect(r).not.toBeNull();
    expect(path(r)).toBe('3,5 4,5 5,5 6,5 7,5'); // まっすぐ跨いだ
    expect(r.cost).toBe(4 + CROSS_COST); // 4回進んで、うち1回がブリッジ
  });

  it('同じ向きに重ねることはできない', () => {
    // 横向きのライン上を、同じく横向きに走ろうとする経路は通れない
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const src = node('wh_out', 2, 8, 0, { item: 'water' });
    const dst = node('wh_in', 9, 5);
    const cells = [3, 4, 5, 6, 7].map((x) => ({ x, y: 5 })); // 経路の真上を横向きに占有
    const belt: Belt = { uid: 'bh', from: src.uid, fromPort: 0, to: dst.uid, toPort: 0, cells, item: 'water' };
    const r = routePorts(ds, board(24, 14, [a, z, src, dst], [belt]), a, 0, z, 2);
    // まっすぐは通れないので、通れたとしても迂回した経路になる
    if (r) expect(r.cells.some((c) => c.y !== 5)).toBe(true);
  });

  it('曲がり角は跨げない', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const src = node('wh_out', 2, 1, 0, { item: 'water' });
    const dst = node('wh_in', 9, 9);
    // (5,5) が曲がり角になるように折れ線を作る
    const cells = [
      { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
      { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 },
    ];
    const belt: Belt = { uid: 'bc', from: src.uid, fromPort: 0, to: dst.uid, toPort: 0, cells, item: 'water' };
    const r = routePorts(ds, board(24, 14, [a, z, src, dst], [belt]), a, 0, z, 2);
    if (r) {
      // 曲がり角 (5,5) も、そこから続く (6,5) も通っていないこと
      expect(r.cells.some((c) => c.x === 5 && c.y === 5)).toBe(false);
    }
  });

  it('既に跨がれたマスは二度目は跨げない', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const src = node('wh_out', 5, 0, 1, { item: 'water' });
    const dst = node('wh_in', 5, 10);
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((y) => ({ x: 5, y }));
    const b1: Belt = { uid: 'bv', from: src.uid, fromPort: 0, to: dst.uid, toPort: 0, cells: v, item: 'water' };
    // 既に (5,5) を跨いでいる2本目
    const b2: Belt = { uid: 'bx', from: src.uid, fromPort: 0, to: dst.uid, toPort: 0, cells: [{ x: 5, y: 5 }], item: 'waste' };
    const r = routePorts(ds, board(24, 14, [a, z, src, dst], [b1, b2]), a, 0, z, 2);
    if (r) expect(r.cells.some((c) => c.x === 5 && c.y === 5)).toBe(false);
  });

  it('交差箇所を数えられる（診断とブリッジ表示用）', () => {
    const src = node('wh_out', 0, 0);
    const dst = node('wh_in', 9, 9);
    const b1: Belt = { uid: 'b1', from: src.uid, fromPort: 0, to: dst.uid, toPort: 0, cells: [{ x: 3, y: 3 }, { x: 4, y: 3 }], item: null };
    const b2: Belt = { uid: 'b2', from: src.uid, fromPort: 0, to: dst.uid, toPort: 0, cells: [{ x: 4, y: 2 }, { x: 4, y: 3 }], item: null };
    expect(crossings(board(12, 12, [src, dst], [b1, b2]))).toEqual([{ x: 4, y: 3 }]);
  });
});

describe('口の正面回避', () => {
  it('他の設備の口の正面は +5 を払ってでも避ける', () => {
    // (5,5) に別の設備の口の正面が来るように置く
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const other = node('wh_out', 5, 4, 1, { item: 'water' }); // rot=1 で南向き → 正面は (5,5)
    const b = board(24, 14, [a, z, other]);
    const faces = portFaces(ds, b);
    expect(faces).toContain('5,5');

    const straight = routePorts(ds, b, a, 0, z, 2)!;
    expect(path(straight)).toBe('3,5 4,5 5,5 6,5 7,5'); // penal なしなら真っ直ぐ

    const avoided = routePorts(ds, b, a, 0, z, 2, faces)!;
    expect(avoided.cells.some((c) => c.x === 5 && c.y === 5)).toBe(false); // 避けた
    expect(avoided.cost).toBeLessThan(straight.cost + PORT_FACE_COST);
  });

  it('避けると大回りになる場合は、1マスだけ横切る', () => {
    // 通路が1マスしかない状況を作る。ここを禁止にすると経路が消えてしまうので、
    // +5 は「禁止」ではなく「割高」でなければならない。
    const a = node('wh_out', 0, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 6, 5, 0, { rec: 'r_shell' });
    const walls: Node[] = [];
    for (let y = 0; y < 12; y++) if (y !== 5) walls.push(node('wh_in', 3, y));
    const other = node('wh_out', 3, 4, 1, { item: 'water' }); // 南向き。正面は (3,5) ＝唯一の通路
    const b = board(12, 12, [a, z, ...walls, other]);
    const faces = portFaces(ds, b);
    expect(faces).toContain('3,5');
    const r = routePorts(ds, b, a, 0, z, 2, faces)!;
    expect(r).not.toBeNull();
    expect(r.cells.some((c) => c.x === 3 && c.y === 5)).toBe(true); // 割高でも通る
  });

  it('打ち切りはコストではなく通過マス数で見る', () => {
    /* 唯一の通路の全マスが、他の設備の口の正面という状況を作る。
       通れば +5 が11回積み上がってコストは 68 になるが、通ったマス数は13しかない。
       ここで「コストで打ち切る」実装にしていると、この正当な経路が丸ごと弾かれて
       配線が落ちる。上限を man*3+80 という通過マス数で見ているのはこのため。 */
    const a = node('wh_out', 0, 1, 0, { item: 'ore_gen' });
    const z = node('wh_in', 14, 1);
    const others: Node[] = [];
    for (let x = 2; x <= 12; x++) others.push(node('wh_out', x, 0, 1, { item: 'water' })); // 南向き → 正面は (x,1)
    const b = board(16, 2, [a, z, ...others]); // 高さ2。y=0 は設備で埋まり、y=1 が唯一の通路
    const faces = portFaces(ds, b);
    for (let x = 2; x <= 12; x++) expect(faces).toContain(`${x},1`);

    const r = routePorts(ds, b, a, 0, z, 0, faces);
    expect(r).not.toBeNull();
    expect(r!.cells).toHaveLength(13); // (1,1)〜(13,1)
    expect(r!.cost).toBe(12 + 11 * PORT_FACE_COST); // 12回進み、うち11回が口の正面
  });
});

describe('口の組み合わせを選んで繋ぐ', () => {
  it('空いている口が無ければ理由を返す', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const b = board(24, 12, [a, z]);
    expect(connectNodes(ds, b, a, z, 'ore_gen').ok).toBe(true);
    // 倉庫搬出口の口は1つだけなので2本目は繋がらない
    const second = connectNodes(ds, b, a, z, 'ore_gen');
    expect(second).toEqual({ ok: false, reason: 'no-out-port' });
    // 逆向き（精錬炉→倉庫搬出口）は受け側に搬入口が無い
    expect(connectNodes(ds, b, z, a, 'ore_gen')).toEqual({ ok: false, reason: 'no-in-port' });
  });

  it('経路が無ければ no-route', () => {
    const a = node('wh_out', 0, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 6, 5, 0, { rec: 'r_shell' });
    const walls: Node[] = [];
    for (let y = 0; y < 12; y++) walls.push(node('wh_in', 3, y));
    expect(connectNodes(ds, board(12, 12, [a, z, ...walls]), a, z, 'ore_gen')).toEqual({
      ok: false,
      reason: 'no-route',
    });
  });

  it('運ぶ品目を両端のレシピから決める', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' }); // 源石鉱物*3 → 結晶外殻
    const b = board(24, 12, [a, z]);
    expect(pickItemFor(ds, b, a.uid, z.uid)).toBe('ore_gen');
    // 受け取らないものなら null
    const a2 = node('wh_out', 2, 8, 0, { item: 'water' });
    b.nodes.push(a2);
    expect(pickItemFor(ds, b, a2.uid, z.uid)).toBeNull();
    // 倉庫搬入口は何でも受け取る
    const sink = node('wh_in', 12, 5);
    b.nodes.push(sink);
    expect(pickItemFor(ds, b, z.uid, sink.uid)).toBe('shell');
  });

  it('引き直しで本数が保たれる', () => {
    const a = node('wh_out', 2, 5, 0, { item: 'ore_gen' });
    const z = node('smelt', 8, 5, 0, { rec: 'r_shell' });
    const b = board(24, 12, [a, z]);
    connectNodes(ds, b, a, z, 'ore_gen');
    expect(b.belts).toHaveLength(1);
    expect(rewire(ds, b, a.uid)).toBe(0);
    expect(b.belts).toHaveLength(1);
    expect(repairBelts(ds, b)).toBe(0);
    expect(b.belts).toHaveLength(1);
    expect(b.belts[0]!.item).toBe('ore_gen');
  });
});

/* ═══════════════════════════════════════════════════════════
   参照実装との差分テスト

   ランダムな盤面を作り、同じ順で同じ接続を試して、
   選ばれた口・引かれた経路・失敗の有無がすべて一致することを見る。
   ここが通っていれば「挙動が食い違ったら参照実装が正しい」を満たしている。
   ═══════════════════════════════════════════════════════════ */

/** 再現可能な擬似乱数（mulberry32） */
function rng(s: number): () => number {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = ['wh_out', 'smelt', 'crush', 'box', 'tank', 'split', 'merge', 'gen', 'wh_in', 'tenyu', 'farm', 'chemL'];

describe('参照実装との差分テスト', () => {
  const ref = loadReference();

  it('ランダムな盤面 60 通りで、経路と選ばれた口が完全に一致する', () => {
    let connectsTried = 0;
    let connectsMade = 0;

    for (let seedN = 1; seedN <= 60; seedN++) {
      const rand = rng(seedN * 7919);
      const W = 22 + Math.floor(rand() * 10);
      const H = 14 + Math.floor(rand() * 8);

      // 1) 設備をランダムに置く（重ならないところだけ）
      const nodes: Node[] = [];
      const occupied = new Set<string>();
      const target = 6 + Math.floor(rand() * 7);
      for (let attempt = 0; attempt < 120 && nodes.length < target; attempt++) {
        const fac = POOL[Math.floor(rand() * POOL.length)]!;
        const f = ds.fac(fac)!;
        const rot = Math.floor(rand() * 4) as Rot;
        const w = rot & 1 ? f.h : f.w;
        const h = rot & 1 ? f.w : f.h;
        const x = Math.floor(rand() * (W - w));
        const y = Math.floor(rand() * (H - h));
        let free = true;
        for (let dy = -1; dy <= h && free; dy++)
          for (let dx = -1; dx <= w && free; dx++) if (occupied.has(`${x + dx},${y + dy}`)) free = false;
        if (!free) continue;
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) occupied.add(`${x + dx},${y + dy}`);
        const n: Node = {
          uid: 'u' + (nodes.length + 1),
          fac,
          x,
          y,
          rot,
          rec: ds.recipesFor(fac)[0]?.id ?? null,
          item: f.tap ? 'ore_gen' : null,
        };
        nodes.push(n);
      }
      if (nodes.length < 2) continue;

      // 2) 同じ盤面を両方に用意する（互いに影響しないよう複製を渡す）
      const mine = boardOf(W, H, structuredClone(nodes), []);
      const refNodes = structuredClone(nodes);
      const refBelts: Belt[] = [];
      ref.setup(refNodes, refBelts, W, H);

      // 3) ランダムな組を順に繋いでいき、毎回突き合わせる
      for (let step = 0; step < 18; step++) {
        const ai = Math.floor(rand() * nodes.length);
        const zi = Math.floor(rand() * nodes.length);
        if (ai === zi) continue;
        const item = rand() < 0.3 ? undefined : 'ore_gen';
        connectsTried++;

        const got = connectNodes(ds, mine, mine.nodes[ai]!, mine.nodes[zi]!, item);
        const want = ref.connectNodes(refNodes[ai]!, refNodes[zi]!, item);

        const label = `seed=${seedN} step=${step} ${nodes[ai]!.fac}#${ai}→${nodes[zi]!.fac}#${zi}`;
        expect(got.ok, label).toBe(want !== null);
        if (got.ok && want) {
          connectsMade++;
          expect({ ...got.belt, uid: '' }, label).toEqual({ ...want, uid: '' });
        }
        // 盤面の状態もずれていないこと
        expect(mine.belts.length, label).toBe(refBelts.length);
      }
    }

    // テスト自体が空回りしていないことの確認
    expect(connectsTried).toBeGreaterThan(500);
    expect(connectsMade).toBeGreaterThan(200);
  });

  it('液体・ガスのパイプ上限を変えても一致する', () => {
    ref.setPipeCap(45);
    const ds2 = buildDataset(data, { pipeCap: 45 });
    expect(ds2.capOf('water')).toBe(45);
    expect(ds2.capOf('ore_gen')).toBe(30); // 固体はベルトなので影響しない
    ref.setPipeCap(30);
  });
});
