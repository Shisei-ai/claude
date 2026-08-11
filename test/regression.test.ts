/**
 * §7 回帰ケース ── 移植の合否判定
 *
 * 「初期データ・初期採取ゾーンのまま、各エリアで目標を組み、自動配置してソルバーを回した結果。
 *   配線失敗0 と 搬入量 を再現できれば移植は成功とみなす。」
 *
 * ── 表の読み方について分かったこと ─────────────────────────
 *
 * HANDOFF §7 の表には「どちらの自動配置を使ったか」が書かれていないが、
 * 実測すると **行ごとに方式が違う**。参照実装で両方を回して突き合わせた結果:
 *
 *   ブロック方式で一致 : 中枢の小容量谷地バッテリー6、鉱山の紫晶製ボトル15
 *   1本のライン方式で一致: 天王原の息壌120、および下の「エリア連携」の3件
 *   どちらでも一致     : 中枢の結晶外殻20、首礎の赤銅塊120、武陵城の赤銅塊240
 *
 * さらに、表の「武陵城 小容量武陵バッテリー30」と「応龍関 分離コア60」は
 * **単独の値ではなくエリア連携シーケンスを流したあとの値**である。
 * 単独で応龍関だけを回すと HANDOFF 自身が書いているとおり搬入37.5になる。
 *
 * どの行も方式と手順を明示すれば厳密に再現できるので、それをそのままテストにしてある。
 */

import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { buildDataset } from '../src/domain/dataset';
import { createBoard } from '../src/domain/geometry';
import { applyPlan } from '../src/domain/layout/blocks';
import { buildPlan, type PlanContext } from '../src/domain/planner';
import { goalStatus, solve, type SolveResult } from '../src/domain/solver';
import type { Save } from '../src/domain/types';
import { loadReference } from './helpers/reference';

/** 表の値は小数第1位まで */
const r1 = (v: number): number => Math.round(v * 10) / 10;

interface RunOut {
  failed: number;
  ship: number;
  gen: number;
  cons: number;
  res: SolveResult;
  nodes: number;
  belts: number;
}

/**
 * 目標を立てて自動配置し、ソルバーを回す。
 * 実際のアプリと同じく、計算後に純増をエリアへ書き戻す（次のエリアの倉庫の入りになる）。
 */
function run(
  data: Save,
  areaId: string,
  item: string,
  rate: number,
  useBlocks: boolean,
  rates: 'planned' | 'nameplate' = 'nameplate',
): RunOut {
  const ds = buildDataset(data);
  const cur = data.areas.findIndex((a) => a.id === areaId);
  if (cur < 0) throw new Error('エリアが見つかりません: ' + areaId);
  const ctx: PlanContext = { ds, areas: data.areas, cur, basePower: 240 };
  const board = createBoard(80, 56);
  const plan = buildPlan(ctx, item, rate);
  const lay = applyPlan(ctx, board, plan, {}, { useBlocks, rates });

  const area = data.areas[cur]!;
  area.nodes = board.nodes;
  area.belts = board.belts;
  area.w = board.w;
  area.h = board.h;
  area.goal = { item, rate };

  const res = solve({ ds, board, areas: data.areas, cur, basePower: 240 });
  area.net = res.net; // ← アプリと同じく純増を控える
  return {
    failed: lay.failed,
    ship: r1(res.core[item]?.ship ?? 0),
    gen: r1(res.gen),
    cons: res.cons,
    res,
    nodes: board.nodes.length,
    belts: board.belts.length,
  };
}

/** 同じ条件を参照実装でも回す */
function runRef(areaId: string, item: string, rate: number, useBlocks: boolean): RunOut {
  const ref = loadReference();
  const d = seed();
  const cur = d.areas.findIndex((a) => a.id === areaId);
  const rr = ref.layoutWith(
    {
      areas: structuredClone(d.areas) as unknown[],
      cur,
      nodes: [],
      belts: [],
      basePower: 240,
      w: 80,
      h: 56,
      items: structuredClone(d.items) as unknown[],
      facs: structuredClone(d.facs) as unknown[],
      recs: structuredClone(d.recs) as unknown[],
    },
    item,
    rate,
    {},
    useBlocks,
  );
  return {
    failed: rr.layout.failed,
    ship: r1(rr.ship),
    gen: r1(rr.gen),
    cons: rr.cons,
    res: null as unknown as SolveResult,
    nodes: rr.nodes.length,
    belts: rr.belts.length,
  };
}

/* 表の数値は参照実装と同じ設定（rates:'nameplate'）で出したもの。
   既定の 'planned' は §8-1 を直した挙動なので、意図的に数値が変わる。
   下の「§8-1 改善後」でその差を記録している。 */

/** 表1行ぶん */
interface Row {
  area: string;
  areaId: string;
  item: string;
  itemId: string;
  rate: number;
  /** HANDOFF の期待値 */
  failed: number;
  ship: number;
  power: string;
  /** true=ブロック方式 / false=1本のライン方式 */
  blocks: boolean;
}

const TABLE: Row[] = [
  // どちらの方式でも一致する行
  { area: '中枢エリア', areaId: 'a_chusu', item: '結晶外殻', itemId: 'shell', rate: 20, failed: 0, ship: 20.0, power: '240/48', blocks: true },
  { area: '首礎', areaId: 'w_shuso', item: '赤銅塊', itemId: 'ingot_red', rate: 120, failed: 0, ship: 120.0, power: '240/96', blocks: true },
  { area: '武陵城', areaId: 'w_jo', item: '赤銅塊', itemId: 'ingot_red', rate: 240, failed: 0, ship: 240.0, power: '240/192', blocks: true },
  // ブロック方式でのみ一致する行
  { area: '中枢エリア', areaId: 'a_chusu', item: '小容量谷地バッテリー', itemId: 'batS', rate: 6, failed: 0, ship: 15.0, power: '240/216', blocks: true },
  { area: '鉱山エリア', areaId: 'a_mine', item: '紫晶製ボトル', itemId: 'bot_pur', rate: 15, failed: 0, ship: 12.0, power: '240/48', blocks: true },
  // 1本のライン方式でのみ一致する行
  { area: '天王原', areaId: 'w_tenno', item: '息壌', itemId: 'sokuj', rate: 120, failed: 0, ship: 56.2, power: '240/512', blocks: false },
];

describe('§7 回帰ケース（単独で回すもの）', () => {
  for (const row of TABLE) {
    it(`${row.area} ／ ${row.item} ${row.rate} → 配線失敗${row.failed}・搬入${row.ship}・電力${row.power}`, () => {
      const got = run(seed(), row.areaId, row.itemId, row.rate, row.blocks);
      expect(got.failed, '配線失敗').toBe(row.failed);
      expect(got.ship, '搬入/分').toBe(row.ship);
      expect(`${got.gen}/${got.cons}`, '電力').toBe(row.power);
    });
  }

  it('どの行も、参照実装とまったく同じ結果になる', () => {
    for (const row of TABLE) {
      for (const blocks of [true, false]) {
        const mine = run(seed(), row.areaId, row.itemId, row.rate, blocks);
        const want = runRef(row.areaId, row.itemId, row.rate, blocks);
        const label = `${row.area} ${row.item} ${row.rate} ${blocks ? 'ブロック' : '1本'}`;
        expect(mine.failed, label + ' 失敗').toBe(want.failed);
        expect(mine.ship, label + ' 搬入').toBe(want.ship);
        expect(mine.gen, label + ' 発電').toBe(want.gen);
        expect(mine.cons, label + ' 消費').toBe(want.cons);
        expect(mine.nodes, label + ' 設備数').toBe(want.nodes);
        expect(mine.belts, label + ' ライン数').toBe(want.belts);
      }
    }
  });
});

describe('§7 エリア連携（この順に実行すること）', () => {
  /* 1. 天王原で息壌120 → 2. 武陵城で小容量武陵バッテリー30 → 3. 応龍関で分離コア60
     倉庫は地域ごとに1つなので、前のエリアの純増が次のエリアの原料になる。 */
  it('順に流すと、応龍関の搬入が60.0（達成100%）・電力240/128になる', () => {
    const data = seed();

    const a = run(data, 'w_tenno', 'sokuj', 120, false);
    expect(a.failed, '天王原 配線失敗').toBe(0);
    expect(a.ship, '天王原 搬入').toBe(56.2);
    expect(`${a.gen}/${a.cons}`, '天王原 電力').toBe('240/512');

    const b = run(data, 'w_jo', 'wbatS', 30, false);
    expect(b.failed, '武陵城 配線失敗').toBe(0);
    expect(b.ship, '武陵城 搬入').toBe(26.6);
    expect(`${b.gen}/${b.cons}`, '武陵城 電力').toBe('240/216');

    const c = run(data, 'w_oryu', 'core_sep', 60, false);
    expect(c.failed, '応龍関 配線失敗').toBe(0);
    expect(c.ship, '応龍関 搬入').toBe(60.0);
    expect(`${c.gen}/${c.cons}`, '応龍関 電力').toBe('240/128');

    // 達成度100%
    const g = goalStatus(c.res, { item: 'core_sep', rate: 60 })!;
    expect(g.ratio).toBeCloseTo(1, 6);
  });

  it('燃料が無い状態で応龍関だけを実行すると、燃料不足の警告と搬入37.5になる', () => {
    const c = run(seed(), 'w_oryu', 'core_sep', 60, false);
    expect(c.ship).toBe(37.5);
    expect(c.res.diag.some((d) => d.t.includes('発電機の燃料が足りません'))).toBe(true);
  });

  it('前のエリアの純増が、次のエリアの倉庫の入りとして見えている', () => {
    const data = seed();
    run(data, 'w_tenno', 'sokuj', 120, false);
    const tenno = data.areas.find((a) => a.id === 'w_tenno')!;
    expect(tenno.net['sokuj']).toBeGreaterThan(0);

    const ds = buildDataset(data);
    const cur = data.areas.findIndex((a) => a.id === 'w_jo');
    const res = solve({ ds, board: createBoard(80, 56), areas: data.areas, cur, basePower: 240 });
    expect(res.field['sokuj']).toBeCloseTo(tenno.net['sokuj']!, 6);
  });
});

/* ═══════════════════════════════════════════════════════════
   §8-1 の改善 ── 多段構成で稼働率が揃わない問題

   HANDOFF:「中容量武陵バッテリーのように6〜8段になると、貪欲マッチングの端数が
             偏って各設備が中途半端な稼働率になり、搬入量が目標に届かない。」

   実際に測ると「中途半端」どころか **設備がまるごと停止して搬入0** になっていた。
   原因は2つあり、どちらも配置側（layout）にあった。

     1. スロットが名乗る量が「定格能力」だった。
        切り上げた台数ぶんの定格は供給を上回るので、貪欲マッチングで
        最初の消費者が供給を食い尽くし、2台目以降にラインが1本も繋がらない。
        → 計画上の実際の量（定格 × その工程の稼働率）で名乗るようにした。

     2. 原料の取出口を全体で1つのプールにしていた。
        必要量の違う設備どうしが同じ口を共有すると、ソルバーは定格の需要比で
        分けるので、計画が意図した配分にならず片方が飢える。
        → 同じレシピの設備ごとに取出口をまとめた（必要量が等しければ等分が正しい）。

   ソルバーには手を入れていない。需要の割り振りを「入口本数で等分」から
   「先頭から上限まで詰める」に変えると、逆に上流が飢えて悪化することを確認済み。
   HANDOFF が言う最小費用流での定式化は、この2点の改善で足りたので見送っている。
   ═══════════════════════════════════════════════════════════ */

interface ImproveRow {
  area: string;
  areaId: string;
  item: string;
  itemId: string;
  rate: number;
  /** 参照実装のまま（定格で名乗る）だとこうなる */
  before: number;
  /** 改善後 */
  after: number;
}

const IMPROVED: ImproveRow[] = [
  { area: '応龍関', areaId: 'w_oryu', item: '重息壌', itemId: 'sokuj_h', rate: 6, before: 0, after: 3.6 },
  { area: '武陵城', areaId: 'w_jo', item: '重息壌', itemId: 'sokuj_h', rate: 6, before: 0, after: 3.6 },
  { area: '武陵城', areaId: 'w_jo', item: '息壌装備部品', itemId: 'eq_soku', rate: 2, before: 0, after: 1.7 },
  { area: '武陵城', areaId: 'w_jo', item: '焔銅部品', itemId: 'part_cu', rate: 12, before: 2.8, after: 3.5 },
  { area: '中枢エリア', areaId: 'a_chusu', item: '大容量谷地バッテリー', itemId: 'batL', rate: 3, before: 0.2, after: 2.2 },
  { area: '中枢エリア', areaId: 'a_chusu', item: '中容量谷地バッテリー', itemId: 'batM', rate: 10, before: 2.6, after: 3.5 },
];

describe('§8-1 多段構成の稼働率（改善後）', () => {
  for (const row of IMPROVED) {
    it(`${row.area} ／ ${row.item} ${row.rate} → 搬入 ${row.before} から ${row.after} へ`, () => {
      const before = run(seed(), row.areaId, row.itemId, row.rate, false, 'nameplate');
      const after = run(seed(), row.areaId, row.itemId, row.rate, false, 'planned');
      expect(before.ship, '改善前').toBe(row.before);
      expect(after.ship, '改善後').toBe(row.after);
      expect(after.ship, '改善後のほうが多い').toBeGreaterThan(before.ship);
      expect(after.failed, '配線失敗は増えない').toBeLessThanOrEqual(before.failed);
    });
  }

  it('稼働率0で死んでいた設備が無くなる', () => {
    const dead = (rates: 'planned' | 'nameplate'): number => {
      const data = seed();
      const out = run(data, 'w_oryu', 'sokuj_h', 6, false, rates);
      const ds = buildDataset(data);
      const area = data.areas.find((a) => a.id === 'w_oryu')!;
      return area.nodes.filter((n) => ds.fac(n.fac)?.kind === 'process' && (out.res.ratio[n.uid] ?? 0) < 0.005).length;
    };
    expect(dead('nameplate'), '改善前は生産設備がまるごと停止していた').toBeGreaterThan(0);
    expect(dead('planned'), '改善後は停止する設備が無い').toBe(0);
  });

  it('電力さえ足りれば、重息壌は目標ちょうどに届く', () => {
    /* 既定の基礎電力240では、燃料の無い発電機のぶん全体が落ちる。
       電力を十分にすると、配置そのものは目標を満たせていることが分かる。 */
    const data = seed();
    const ds = buildDataset(data);
    const cur = data.areas.findIndex((a) => a.id === 'w_oryu');
    const ctx: PlanContext = { ds, areas: data.areas, cur, basePower: 5000 };
    const board = createBoard(80, 56);
    const plan = buildPlan(ctx, 'sokuj_h', 6);
    const lay = applyPlan(ctx, board, plan, {}, { useBlocks: false });
    data.areas[cur]!.nodes = board.nodes;
    data.areas[cur]!.belts = board.belts;
    const res = solve({ ds, board, areas: data.areas, cur, basePower: 5000 });
    expect(lay.failed).toBe(0);
    expect(r1(res.core['sokuj_h']?.ship ?? 0)).toBe(6);
  });

  it('§7 の回帰ケースは改善後も配線失敗0で、搬入が減らない', () => {
    for (const row of TABLE) {
      const before = run(seed(), row.areaId, row.itemId, row.rate, row.blocks, 'nameplate');
      const after = run(seed(), row.areaId, row.itemId, row.rate, row.blocks, 'planned');
      const label = `${row.area} ${row.item} ${row.rate}`;
      expect(after.failed, label + ' 配線失敗').toBe(0);
      expect(after.ship, label + ' 搬入').toBeGreaterThanOrEqual(before.ship - 1e-9);
    }
  });
});
