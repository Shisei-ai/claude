/**
 * §6-5 の単体テスト（自動配置）。
 *
 * HANDOFF §5-3 の「処理順序が決定的に重要」を、順序を入れ替えると壊れることまで含めて
 * テストにしてある。あわせて参照実装との差分テスト。
 */

import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { buildDataset, type Dataset } from '../src/domain/dataset';
import { createBoard, type Board } from '../src/domain/geometry';
import { autoLayout } from '../src/domain/layout/autoLayout';
import { applyPlan, autoLayoutBlocks, captureBlock, stampBlock } from '../src/domain/layout/blocks';
import {
  addSurplusSinks,
  buildLinks,
  buildTiers,
  insertLogistics,
  makeRanker,
  orderByCentroid,
} from '../src/domain/layout/tiers';
import { buildPlan, unitOf, type PlanContext } from '../src/domain/planner';
import { solve } from '../src/domain/solver';
import type { Save } from '../src/domain/types';
import { loadReference } from './helpers/reference';

const data: Save = seed();
const ds = buildDataset(data);
const areaIdx = (id: string): number => data.areas.findIndex((a) => a.id === id);
const ctxOf = (areaId: string, basePower = 240): PlanContext => ({
  ds, areas: seed().areas, cur: areaIdx(areaId), basePower,
});

describe('段の割り当て', () => {
  it('段は「最終産物から何段手前か」で決める', () => {
    /* 原料からの距離で決めると、終盤でしか使わない枝が左端に流されて
       長距離配線になる。だから消費側からの距離で決めている。 */
    const ctx = ctxOf('a_chusu');
    const plan = buildPlan(ctx, 'batM', 10, {}, { noPower: true });
    const { rankRec, maxRank } = makeRanker(plan);
    const rank = (rid: string): number => rankRec(ds.rec(rid)!, 0);
    // 中容量バッテリー ← 小容量バッテリー ← 鉱物粉末 の順で深くなる
    expect(rank('r_batM')).toBe(0);
    expect(rank('r_batS')).toBe(1);
    expect(rank('r_pw_ore')).toBe(2);
    // 鉄製部品は中容量バッテリーの直前なので浅い（左端に流されない）
    expect(rank('r_part_fe')).toBe(1);
    expect(rank('r_ingot')).toBe(2);
    expect(maxRank).toBe(2);
  });

  it('スロットは実台数ぶん作られ、原料には取出口が付く', () => {
    const ctx = ctxOf('a_chusu');
    const plan = buildPlan(ctx, 'batS', 30, {}, { noPower: true });
    const { tiers, all } = buildTiers(ds, plan);
    const count = (fac: string): number => all.filter((s) => s.fac === fac).length;
    expect(count('pack')).toBe(5);
    expect(count('crush')).toBe(4);
    // 青鉄120個/分 ÷ ベルト30個/分 = 取出口4つ
    expect(count('wh_out')).toBe(4);
    // 本体の段は整数キー
    expect(Object.keys(tiers).every((k) => Number.isInteger(Number(k)))).toBe(true);
  });

  it('重心法で段内の順序が決まる', () => {
    const ctx = ctxOf('a_chusu');
    const plan = buildPlan(ctx, 'batS', 30, {}, { noPower: true });
    const { tiers, all } = buildTiers(ds, plan);
    const { links } = buildLinks(ds, all);
    const keys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
    orderByCentroid(tiers, keys, links);
    for (const k of keys) {
      const ords = tiers[k]!.map((s) => s.ord);
      // 各段は 0..n-1 の連番になる
      expect(ords).toEqual(tiers[k]!.map((_, i) => i));
    }
  });
});

describe('処理順序（HANDOFF §5-3）', () => {
  /** 赤銅塊は汚水という副産物を出す。捨て先が要る典型 */
  const redPlan = (): { ctx: PlanContext; plan: ReturnType<typeof buildPlan> } => {
    const ctx = ctxOf('w_jo');
    return { ctx, plan: buildPlan(ctx, 'ingot_red', 240, {}, { noPower: true }) };
  };

  it('余った産出（副産物を含む）に貯蔵設備が足される', () => {
    const { plan } = redPlan();
    const { tiers, all } = buildTiers(ds, plan);
    const { links, surplus } = buildLinks(ds, all);
    // 汚水は誰も使わないので余る
    expect(surplus.some((s) => s.item === 'waste')).toBe(true);
    addSurplusSinks(ds, tiers, all, links, surplus);
    // 液体なので液体貯蔵タンクが選ばれる
    expect(all.some((s) => s.fac === 'tank')).toBe(true);
    // 最終産物の赤銅塊には倉庫搬入口
    expect(all.some((s) => s.fac === 'wh_in')).toBe(true);
  });

  it('貯蔵設備を分流器より「後」に足すと「搬出口が満杯」になる', () => {
    /* HANDOFF が名指ししているバグ。分流器を挟む処理は「1つの口にライン1本」を
       守るために口の数を数えるので、そのあとから接続を足すと定員を超える。
       超えた接続は配線時に必ず落ちる（失敗22本の原因がこれだった）。

       口の定員を超えたスロットの数を、正しい順序と入れ替えた順序で数えて比べる。 */
    const overflows = (
      areaId: string, item: string, rate: number, correctOrder: boolean,
      rates: 'planned' | 'nameplate',
    ): number => {
      const ctx: PlanContext = { ds, areas: seed().areas, cur: areaIdx(areaId), basePower: 240 };
      const plan = buildPlan(ctx, item, rate, {}, { noPower: true });
      const { tiers, all } = buildTiers(ds, plan, { rates });
      const { links: l0, surplus } = buildLinks(ds, all);
      let links = l0;
      if (correctOrder) {
        addSurplusSinks(ds, tiers, all, links, surplus); // 3) 先に貯蔵設備
        links = insertLogistics(ds, tiers, links); //        4) あとで分流器
      } else {
        links = insertLogistics(ds, tiers, links); //        先に分流器（誤り）
        addSurplusSinks(ds, tiers, all, links, surplus);
      }
      const outC = new Map<object, number>();
      const inC = new Map<object, number>();
      for (const l of links) {
        outC.set(l.a, (outC.get(l.a) ?? 0) + 1);
        inC.set(l.z, (inC.get(l.z) ?? 0) + 1);
      }
      let over = 0;
      for (const [s, c] of outC) if (c > ds.portCounts((s as { fac: string }).fac).nOut) over++;
      for (const [s, c] of inC) if (c > ds.portCounts((s as { fac: string }).fac).nIn) over++;
      return over;
    };

    const cases: [string, string, number][] = [
      ['w_jo', 'ingot_red', 240],
      ['w_jo', 'crystal', 10],
      ['w_jo', 'wbatM', 4],
      ['w_jo', 'part_cu', 12],
      ['w_jo', 'eq_soku', 2],
      ['w_oryu', 'core_sep', 60],
      ['a_chusu', 'batM', 10],
      ['a_chusu', 'batS', 30],
    ];
    for (const rates of ['planned', 'nameplate'] as const) {
      let broken = 0;
      for (const [area, item, rate] of cases) {
        // 正しい順序なら、どの構成でも口の定員を超えるスロットは1つも無い
        expect(overflows(area, item, rate, true, rates), `${area} ${item} ${rate} (${rates})`).toBe(0);
        if (overflows(area, item, rate, false, rates) > 0) broken++;
      }
      // 入れ替えると定員超過が出る（どちらのモードでも）
      expect(broken, `入れ替えで壊れた構成の数 (${rates})`).toBeGreaterThanOrEqual(1);
    }

    // 正しい順序で組んだ本物の配置は、1本も落ちない
    const { plan } = redPlan();
    const board = createBoard(80, 56);
    expect(autoLayout(ds, board, plan).failed).toBe(0);
  });

  it('口の数を超える分岐にだけ分流器を挟む', () => {
    const ctx = ctxOf('a_chusu');
    // 取出口は搬出口1つ。4つの取出口 → 5台の包装機、で分岐が要る構成
    const plan = buildPlan(ctx, 'batS', 30, {}, { noPower: true });
    const { tiers, all } = buildTiers(ds, plan);
    const { links: l0, surplus } = buildLinks(ds, all);
    addSurplusSinks(ds, tiers, all, l0, surplus);
    const links = insertLogistics(ds, tiers, l0);
    const logi = ([] as string[]).concat(
      ...Object.keys(tiers).map((k) => tiers[k]!.filter((s) => s.logi).map((s) => s.fac)),
    );
    // 挟まれた物流設備は、すべて固体用（ベルト用）である
    expect(logi.every((f) => f === 'split' || f === 'merge')).toBe(true);
    // 品目をまたいで1本にまとめていない
    for (const l of links) expect(typeof l.item).toBe('string');
  });

  it('液体・ガスにはパイプ用の分流器・合流器を使う', () => {
    const ctx = ctxOf('w_jo');
    const plan = buildPlan(ctx, 'sokuj', 120, {}, { noPower: true });
    const board = createBoard(80, 56);
    autoLayout(ds, board, plan);
    const facs = board.nodes.map((n) => n.fac);
    // 水は液体。パイプ用が使われ、ベルト用の分流器に水が流れていない
    for (const b of board.belts) {
      if (ds.phaseOf(b.item) === 'solid') continue;
      const from = ds.fac(board.nodes.find((n) => n.uid === b.from)!.fac)!;
      const to = ds.fac(board.nodes.find((n) => n.uid === b.to)!.fac)!;
      if (from.kind === 'logistics') expect(from.phase, `${b.item}`).toBe('fluid');
      if (to.kind === 'logistics') expect(to.phase, `${b.item}`).toBe('fluid');
    }
    expect(facs.length).toBeGreaterThan(0);
  });
});

describe('ブロック方式', () => {
  it('1枚が自己完結していて、何枚並べても配線が破綻しない', () => {
    const ctx = ctxOf('a_chusu');
    const unit = unitOf(ctx, 'batS')!;
    expect(unit).toBe(30);
    const blk = captureBlock(ds, buildPlan(ctx, 'batS', unit, {}, { noPower: true }), { w: 80, h: 56 })!;
    expect(blk).not.toBeNull();
    expect(blk.failed).toBe(0);
    // 原点に寄せてある
    expect(Math.min(...blk.nodes.map((n) => n.x))).toBeGreaterThanOrEqual(0);
    expect(Math.min(...blk.nodes.map((n) => n.y))).toBeGreaterThanOrEqual(0);

    // 6枚並べても、ラインが設備と重ならず、口の二重使用も起きない
    const board = createBoard(200, 120);
    for (let i = 0; i < 6; i++) stampBlock(board, blk, 1 + (i % 3) * (blk.w + 2), 1 + Math.floor(i / 3) * (blk.h + 2));
    expect(board.nodes).toHaveLength(blk.nodes.length * 6);
    expect(board.belts).toHaveLength(blk.belts.length * 6);
    const occ = new Set<string>();
    for (const n of board.nodes) {
      const f = ds.fac(n.fac)!;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) occ.add(`${n.x + x},${n.y + y}`);
    }
    for (const b of board.belts) for (const c of b.cells) expect(occ.has(`${c.x},${c.y}`)).toBe(false);
    const ports = new Set<string>();
    for (const b of board.belts) {
      expect(ports.has(b.from + '/' + b.fromPort)).toBe(false);
      expect(ports.has(b.to + '/' + b.toPort)).toBe(false);
      ports.add(b.from + '/' + b.fromPort);
      ports.add(b.to + '/' + b.toPort);
    }
  });

  it('目標に足りるだけの枚数を並べる', () => {
    const ctx = ctxOf('a_chusu');
    const board = createBoard(80, 56);
    const plan = buildPlan(ctx, 'shell', 20);
    const r = autoLayoutBlocks(ctx, board, plan)!;
    expect(r.mode).toBe('blocks');
    expect(r.unit).toBe(10);
    expect(r.blocks).toBe(2);
    expect(r.failed).toBe(0);
  });

  it('探索は時間で打ち切れる（UI を固めないため）', () => {
    const ctx = ctxOf('a_chusu');
    let t = 0;
    const now = (): number => (t += 10_000); // 1回目の計測で必ず上限を超える
    const blk = captureBlock(ds, buildPlan(ctx, 'batS', 30, {}, { noPower: true }), { now, msLimit: 1, w: 80, h: 56 });
    expect(blk).not.toBeNull(); // 打ち切っても、それまでの最良を返す
  });
});

describe('参照実装との差分テスト', () => {
  const ref = loadReference();

  /* 参照実装と突き合わせるので、スロットの量は互換モード（定格）で回す。
     既定の 'planned' は §8-1 を直した挙動なので、意図的に参照実装と食い違う。 */
  const COMPAT = { rates: 'nameplate' } as const;

  const runMine = (
    areaId: string, item: string, rate: number, useBlocks: boolean,
  ): { board: Board; failed: number; made: number; ds: Dataset; data: Save; cur: number } => {
    const d2 = seed();
    const ds2 = buildDataset(d2);
    const cur = d2.areas.findIndex((a) => a.id === areaId);
    const ctx: PlanContext = { ds: ds2, areas: d2.areas, cur, basePower: 240 };
    const board = createBoard(80, 56);
    const plan = buildPlan(ctx, item, rate);
    let r: { failed: number; made: number } | null = null;
    if (useBlocks) {
      const b = autoLayoutBlocks(ctx, board, plan, {}, COMPAT);
      if (b && b.failed > 0) {
        const keep = { nodes: board.nodes, belts: board.belts, w: board.w, h: board.h, seq: board.uidSeq };
        board.nodes = []; board.belts = [];
        const r2 = autoLayout(ds2, board, plan, COMPAT);
        if (r2.failed < b.failed) r = r2;
        else {
          board.nodes = keep.nodes; board.belts = keep.belts;
          board.w = keep.w; board.h = keep.h; board.uidSeq = keep.seq;
          r = b;
        }
      } else r = b;
    }
    if (!r) r = autoLayout(ds2, board, plan, COMPAT);
    return { board, failed: r.failed, made: r.made, ds: ds2, data: d2, cur };
  };

  const runRef = (areaId: string, item: string, rate: number, useBlocks: boolean) =>
    ref.layoutWith(
      {
        areas: structuredClone(seed().areas) as unknown[],
        cur: areaIdx(areaId), nodes: [], belts: [], basePower: 240, w: 80, h: 56,
        items: structuredClone(data.items) as unknown[],
        facs: structuredClone(data.facs) as unknown[],
        recs: structuredClone(data.recs) as unknown[],
      },
      item, rate, {}, useBlocks,
    );

  const CASES: [string, string, number][] = [
    ['a_chusu', 'shell', 20],
    ['a_chusu', 'batS', 6],
    ['a_chusu', 'batS', 30],
    ['a_chusu', 'batM', 10],
    ['a_chusu', 'part_hi', 7],
    ['a_mine', 'bot_pur', 15],
    ['w_shuso', 'ingot_red', 120],
    ['w_jo', 'ingot_red', 240],
    ['w_jo', 'wbatS', 30],
    ['w_jo', 'sokuj', 120],
    ['w_jo', 'crystal', 10],
    ['w_oryu', 'core_sep', 60],
    ['w_tenno', 'sokuj', 120],
  ];

  for (const useBlocks of [true, false]) {
    it(`配置結果（設備・ライン・盤面サイズ）が一致する（${useBlocks ? 'ブロック方式' : '1本のライン方式'}）`, { timeout: 120_000 }, () => {
      for (const [areaId, item, rate] of CASES) {
        const mine = runMine(areaId, item, rate, useBlocks);
        const want = runRef(areaId, item, rate, useBlocks);
        const label = `${areaId} ${item} ${rate} ${useBlocks ? 'blocks' : 'line'}`;

        expect(mine.failed, label + ' failed').toBe(want.layout.failed);
        expect(mine.board.w, label + ' w').toBe(want.gw);
        expect(mine.board.h, label + ' h').toBe(want.gh);
        // 設備は uid・種別・座標・向き・レシピまで一致
        expect(
          mine.board.nodes.map((n) => `${n.uid} ${n.fac} ${n.x},${n.y} r${n.rot} ${n.rec ?? '-'} ${n.item ?? '-'}`),
          label + ' nodes',
        ).toEqual(want.nodes.map((n) => `${n.uid} ${n.fac} ${n.x},${n.y} r${n.rot ?? 0} ${n.rec ?? '-'} ${n.item ?? '-'}`));
        // ラインは端の口と経路まで一致
        expect(
          mine.board.belts.map((b) => `${b.from}#${b.fromPort}→${b.to}#${b.toPort} ${b.item ?? '-'} ${b.cells.map((c) => c.x + ':' + c.y).join(' ')}`),
          label + ' belts',
        ).toEqual(want.belts.map((b) => `${b.from}#${b.fromPort}→${b.to}#${b.toPort} ${b.item ?? '-'} ${b.cells.map((c) => c.x + ':' + c.y).join(' ')}`));

        // 配置した盤面をソルバーに掛けた結果も一致する
        mine.data.areas[mine.cur]!.nodes = mine.board.nodes;
        mine.data.areas[mine.cur]!.belts = mine.board.belts;
        const res = solve({ ds: mine.ds, board: mine.board, areas: mine.data.areas, cur: mine.cur, basePower: 240 });
        expect(Math.abs(res.gen - want.gen), label + ' gen').toBeLessThan(1e-9);
        expect(res.cons, label + ' cons').toBe(want.cons);
        expect(Math.abs((res.core[item]?.ship ?? 0) - want.ship), label + ' ship').toBeLessThan(1e-9);
      }
    });
  }
});

describe('§8-3 大きな計画でも現実的な時間で返る', () => {
  /* 参照実装の課題「ブロック方式の探索が重い。27通り×大きな計画で数秒かかる」。
     実測すると数秒どころではなく、
       ・端数の多いレシピで単位が 15000個/分（1枚3287台）になり、探索が返ってこない
       ・ブロックが失敗したときの1本ライン方式との比較に、105台の計画で55秒
     という2つの穴があった。前者は台数で単位を弾き、後者は計画の大きさで比較を打ち切る。 */

  const measure = (areaId: string, item: string, rate: number): { ms: number; failed: number; nodes: number } => {
    const d2 = seed();
    const ds2 = buildDataset(d2);
    const cur = d2.areas.findIndex((a) => a.id === areaId);
    const ctx: PlanContext = { ds: ds2, areas: d2.areas, cur, basePower: 240 };
    const board = createBoard(80, 56);
    const t0 = Date.now();
    const r = applyPlan(ctx, board, buildPlan(ctx, item, rate), {}, { useBlocks: true });
    return { ms: Date.now() - t0, failed: r.failed, nodes: board.nodes.length };
  };

  it(
    '470台規模でも配置が返る（以前は60秒かかっていた）',
    { timeout: 120_000 },
    () => {
      const r = measure('w_jo', 'part_cu', 60);
      expect(r.nodes).toBeGreaterThan(300);
      expect(r.ms, `${r.ms}ms かかった`).toBeLessThan(25_000);
    },
  );

  it(
    '端数の多いレシピでも固まらない（以前は返ってこなかった）',
    { timeout: 120_000 },
    () => {
      // 息壌ガスは「1周期2.86秒・材料1.286個」なので単位が 15000個/分 になる
      const r = measure('w_oryu', 'sokuj_h', 6);
      expect(r.ms, `${r.ms}ms かかった`).toBeLessThan(10_000);
      expect(r.failed).toBe(0);
    },
  );

  it('小さな計画はこれまでどおり速い', { timeout: 60_000 }, () => {
    const r = measure('a_chusu', 'shell', 20);
    expect(r.ms, `${r.ms}ms かかった`).toBeLessThan(5_000);
    expect(r.failed).toBe(0);
  });
});
