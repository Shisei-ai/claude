/**
 * §6-4 の単体テスト（逆算プランナー）。
 *
 * HANDOFF §7 の「逆算の検算」（出典の実数と一致すること）と
 * 「端数最適化」を、そのまま合否判定に使っている。
 */

import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { buildDataset } from '../src/domain/dataset';
import {
  RAW,
  buildPlan,
  expandNeed,
  gcdI,
  idealTargets,
  lcmI,
  producersOf,
  toFrac,
  unitOf,
  warehouseSupply,
  type Choice,
  type PlanContext,
} from '../src/domain/planner';
import type { Save } from '../src/domain/types';
import { loadReference } from './helpers/reference';

const near = (a: number, b: number, eps = 1e-6): void => expect(Math.abs(a - b)).toBeLessThan(eps);

const data: Save = seed();
const ds = buildDataset(data);
const areaIdx = (id: string): number => data.areas.findIndex((a) => a.id === id);

const ctxOf = (areaId: string, basePower = 240): PlanContext => ({
  ds,
  areas: data.areas,
  cur: areaIdx(areaId),
  basePower,
});

/** 同じ文脈を参照実装に渡す */
const refState = (ctx: PlanContext): Parameters<ReturnType<typeof loadReference>['planWith']>[0] => ({
  areas: structuredClone(data.areas) as unknown[],
  cur: ctx.cur,
  nodes: [],
  belts: [],
  basePower: ctx.basePower,
  genRec: ctx.genRec ?? null,
  w: 80,
  h: 56,
  items: structuredClone(data.items) as unknown[],
  facs: structuredClone(data.facs) as unknown[],
  recs: structuredClone(data.recs) as unknown[],
});

describe('副産物は狙って作らない（発散対策）', () => {
  it('主産物として作るレシピだけが候補になる', () => {
    const prod = producersOf(ds);
    // 汚水は 赤銅塊レシピの2番目の産物。狙って作る候補にはならない
    expect(prod['waste']).toBeUndefined();
    expect(ds.producedBy('waste').map((r) => r.id)).toContain('r_ingot_red');
    // 不活性壌晶廃液も同じ（壌晶レシピの副産物）
    expect(prod['sludge']).toBeUndefined();
    // 赤銅塊自身は主産物なので候補になる
    expect(prod['ingot_red']!.map((r) => r.id)).toEqual(['r_ingot_red']);
  });

  it('副産物しか作れない品目を目標にしても発散しない', () => {
    /* 汚水を作ろうとすると、赤銅塊 → 水 → 汚水… と循環しうる。
       副産物を候補から外してあるので、汚水は「倉庫から引く原料」になって止まる。
       台数が 1e263 になった、という事故がこれ。 */
    const ctx = ctxOf('w_jo');
    const p = buildPlan(ctx, 'waste', 100);
    expect(p.diverged).toBeFalsy();
    expect(p.rows).toHaveLength(0);
    near(p.raw['waste']!, 100);
  });

  it('発散したら検知して打ち切る', () => {
    /* 1個作るのに自分自身を2個要求する、という壊れたデータを与える。
       ユーザーがデータ編集で作れてしまう形なので、落ちずに返ることが要件。 */
    const broken: Save = seed();
    broken.recs.push({
      id: 'r_bad', name: '壊れたレシピ', conf: 'guess', fac: 'smelt', sec: 4,
      in: [{ item: 'shell', qty: 2 }], out: [{ item: 'shell', qty: 1 }],
    });
    // 主産物として先に見つかるよう、既存の結晶外殻レシピを外す
    broken.recs = broken.recs.filter((r) => r.id !== 'r_shell');
    const ctx: PlanContext = { ds: buildDataset(broken), areas: broken.areas, cur: 0, basePower: 240 };
    const p = buildPlan(ctx, 'shell', 10);
    expect(p.diverged).toBe(true);
    expect(p.rows).toHaveLength(0);
  });
});

describe('採取ゾーンにあるものは作らず倉庫から引く', () => {
  it('採取している品目は原料になる', () => {
    const sup = warehouseSupply(ctxOf('a_chusu'));
    expect(sup['ore_gen']).toBe(60); // 中枢エリア 4台×15
    expect(sup['ore_blue']).toBe(60);
    expect(sup['ore_pur']).toBe(30); // 同じ地域の鉱山エリアから

    const p = buildPlan(ctxOf('a_chusu'), 'shell', 10);
    // 源石鉱物は採れるので粉砕や精錬の枝を伸ばさない
    near(p.raw['ore_gen']!, 30);
    expect(p.rows.map((r) => r.rid)).toEqual(['r_shell']);
  });

  it('目標品目自身は、採取できても作る', () => {
    // 源石鉱物を目標にすると、掘って済ませるのではなく作ろうとする。
    // 作るレシピが無ければ原料として残る
    const p = buildPlan(ctxOf('a_chusu'), 'ore_gen', 10);
    expect(p.rows).toHaveLength(0);
    near(p.raw['ore_gen']!, 10);
  });

  it('経路の選択で「作らず倉庫から引く」を指定できる', () => {
    const ctx = ctxOf('a_chusu');
    const normal = buildPlan(ctx, 'part_fe', 10);
    expect(normal.rows.map((r) => r.rid).sort()).toEqual(['r_ingot', 'r_part_fe']);
    const choice: Choice = { ingot: RAW };
    const raw = buildPlan(ctx, 'part_fe', 10, choice);
    expect(raw.rows.map((r) => r.rid)).toEqual(['r_part_fe']);
    near(raw.raw['ingot']!, 20);
  });

  it('他エリアが余らせている品目も倉庫から引ける', () => {
    const d2: Save = seed();
    d2.areas.find((a) => a.id === 'w_shuso')!.net = { ingot_red: 240 };
    const ctx: PlanContext = {
      ds: buildDataset(d2), areas: d2.areas, cur: d2.areas.findIndex((a) => a.id === 'w_oryu'), basePower: 240,
    };
    const p = buildPlan(ctx, 'part_red', 10);
    expect(p.rows.map((r) => r.rid)).toEqual(['r_part_red']); // 赤銅塊は作らない
    near(p.raw['ingot_red']!, 40);
  });
});

describe('逆算の検算（HANDOFF §7 — 出典の実数と一致すること）', () => {
  it('赤銅塊 240/分 → 赤銅鉱物240・水240', () => {
    const p = buildPlan(ctxOf('w_jo'), 'ingot_red', 240);
    near(p.raw['ore_red']!, 240);
    near(p.raw['water']!, 240);
    // 精錬炉 1周期2秒 → 30周期/分。240個/分なら8台ちょうど
    const smelt = p.rows.find((r) => r.rid === 'r_ingot_red')!;
    near(smelt.machines, 8);
    expect(smelt.int).toBe(8);
    near(smelt.util, 1);
  });

  it('焔銅部品 12/分 → 赤銅鉱物300・息壌ガス96', () => {
    const p = buildPlan(ctxOf('w_jo'), 'part_cu', 12);
    // 出典の投入量: 赤銅塊240・分離コア60・息壌ガス96
    near(p.made['ingot_red']!, 240 + 60); // 焔銅部品240ぶん + 分離コア60ぶん
    near(p.made['core_sep']!, 60);
    near(p.raw['gas_soku']!, 96);
    near(p.raw['ore_red']!, 300);
  });

  it('緋銅部品 3/分 → 赤銅鉱物75・息壌ガス12', () => {
    const p = buildPlan(ctxOf('w_jo'), 'part_sca', 3);
    // 出典の投入量: 赤銅塊60・分離コア15・息壌ガス12
    near(p.made['ingot_red']!, 60 + 15);
    near(p.made['core_sep']!, 15);
    near(p.raw['gas_soku']!, 12);
    near(p.raw['ore_red']!, 75);
  });
});

describe('端数最適化', () => {
  it('連分数展開で分数に直す', () => {
    expect(toFrac(0.5)).toEqual([1, 2]);
    expect(toFrac(1 / 6)).toEqual([1, 6]);
    expect(toFrac(2 / 15)).toEqual([2, 15]);
    expect(toFrac(3)).toEqual([3, 1]);
    expect(toFrac(0.1)).toEqual([1, 10]);
    // 割り切れない値でも分母の上限で止まる
    const [, q] = toFrac(Math.PI, 1000);
    expect(q).toBeLessThanOrEqual(1000);
  });

  it('gcd と lcm', () => {
    expect(gcdI(12, 18)).toBe(6);
    expect(gcdI(7, 0)).toBe(7);
    expect(gcdI(0, 0)).toBe(1); // 0除算を避けるため 1 に丸める
    expect(lcmI(6, 15)).toBe(30);
  });

  it('小容量谷地バッテリーの単位は 30個/分（HANDOFF §7）', () => {
    const ctx = ctxOf('a_chusu');
    expect(unitOf(ctx, 'batS')).toBe(30);

    // 30個/分 なら全設備が整数台・100%稼働になる
    const p = buildPlan(ctx, 'batS', 30, {}, { noPower: true });
    const pack = p.rows.find((r) => r.rid === 'r_batS')!;
    const crush = p.rows.find((r) => r.rid === 'r_pw_ore')!;
    near(pack.machines, 5); // 包装機5
    near(crush.machines, 4); // 粉砕機4
    expect(pack.int).toBe(5);
    expect(crush.int).toBe(4);
    near(p.fracSum, p.intSum); // 切り上げの無駄ゼロ
    // 採鉱機8台ぶん（青鉄 120個/分 ÷ 1台15個/分）
    near(p.raw['ore_blue']!, 120);
  });

  it('半端な目標には、無駄なく組める目標値を提案する', () => {
    const p = buildPlan(ctxOf('a_chusu'), 'batS', 25, {}, { noPower: true });
    expect(p.intSum).toBeGreaterThan(p.fracSum); // 切り上げの無駄がある
    const ideal = idealTargets(p)!;
    expect(ideal.unit).toBe(30);
    expect(ideal.cands).toContain(30);
    // 候補は目標に近い順
    expect(ideal.cands[0]).toBe(30);
  });

  it('切り上げた構成で実際に出せる上限を返す', () => {
    const p = buildPlan(ctxOf('a_chusu'), 'batS', 25, {}, { noPower: true });
    // 包装機は ceil(25*10/60)=5台 → 5台で 30個/分 まで出せる
    expect(p.capMax).toBeGreaterThanOrEqual(25);
    near(p.capMax, 30);
  });
});

describe('電力と発電機', () => {
  it('基礎電力を超えたぶんだけ発電機を足す', () => {
    const ctx = ctxOf('a_chusu', 240);
    const p = buildPlan(ctx, 'batS', 30);
    // 包装機5 + 粉砕機4 = 9台 × 24 = 216W。基礎電力240で足りる
    expect(p.power).toBe(216);
    expect(p.gens).toBe(0);

    const low = buildPlan(ctxOf('a_chusu', 100), 'batS', 30);
    // 216 − 100 = 116W 不足。発電機は1台120Wなので1台
    expect(low.gens).toBe(1);
    expect(low.area).toBe(p.area + 1 * 2 * 2); // 発電機の面積も足す
  });

  it('noPower なら発電機を数えない（ブロック方式が使う）', () => {
    const p = buildPlan(ctxOf('a_chusu', 0), 'batS', 30, {}, { noPower: true });
    expect(p.gens).toBe(0);
  });
});

describe('搬送量とライン本数', () => {
  it('品目ごとの総流量を出す', () => {
    const p = buildPlan(ctxOf('a_chusu'), 'batS', 30, {}, { noPower: true });
    const f = (id: string): number => p.flow.find((x) => x.item === id)?.rate ?? 0;
    near(f('batS'), 30);
    near(f('pw_ore'), 60);
    near(f('ore_blue'), 120);
    // 最低ライン数（ベルト1本30個/分）
    expect(Math.ceil(f('ore_blue') / ds.capOf('ore_blue') - 1e-9)).toBe(4);
    expect(p.flow[0]!.item).toBe('ore_blue'); // 多い順
  });
});

describe('参照実装との差分テスト', () => {
  const ref = loadReference();

  const compare = (ctx: PlanContext, item: string, rate: number, choice: Choice = {}, opts = {}): void => {
    const mine = buildPlan(ctx, item, rate, choice, opts);
    const want = ref.planWith(refState(ctx), item, rate, choice, opts);
    const label = `${item} ${rate}/分 @${data.areas[ctx.cur]!.name}`;

    expect(mine.diverged ?? false, label).toBe(want.diverged);
    expect(
      mine.rows.map((r) => `${r.rid}:${r.machines.toFixed(9)}:${r.int}:${r.area}:${r.power}`),
      label,
    ).toEqual(want.rows.map((r) => `${r.rid}:${r.machines.toFixed(9)}:${r.int}:${r.area}:${r.power}`));
    expect(Object.keys(mine.raw).sort(), label).toEqual(Object.keys(want.raw).sort());
    for (const k of Object.keys(mine.raw)) near(mine.raw[k]!, want.raw[k]!, 1e-9);
    expect(Object.keys(mine.made).sort(), label).toEqual(Object.keys(want.made).sort());
    for (const k of Object.keys(mine.made)) near(mine.made[k]!, want.made[k]!, 1e-9);
    near(mine.power, want.power, 1e-9);
    near(mine.area, want.area, 1e-9);
    near(mine.fracSum, want.fracSum, 1e-9);
    expect(mine.intSum, label).toBe(want.intSum);
    expect(mine.gens, label).toBe(want.gens);
    near(mine.capMax, want.capMax, 1e-9);
    expect(
      mine.flow.map((f) => `${f.item}:${f.rate.toFixed(9)}`),
      label,
    ).toEqual(want.flow.map((f) => `${f.item}:${f.rate.toFixed(9)}`));
    expect(idealTargets(mine), label).toEqual(want.ideal);
  };

  it('連分数展開が一致する', () => {
    for (const x of [0.5, 1 / 3, 2 / 15, 1 / 6, 0.1, 7, 0.0833333333, Math.PI, Math.SQRT2]) {
      expect(toFrac(x), String(x)).toEqual(ref.toFrac(x));
    }
  });

  it('主要な目標について、台数・原料・面積・電力・提案がすべて一致する', () => {
    const cases: [string, string, number][] = [
      ['a_chusu', 'shell', 20],
      ['a_chusu', 'batS', 6],
      ['a_chusu', 'batS', 25],
      ['a_chusu', 'batS', 30],
      ['a_chusu', 'batM', 10],
      ['a_chusu', 'part_hi', 7],
      ['a_mine', 'bot_pur', 15],
      ['a_chusu', 'cap1', 5],
      ['w_jo', 'ingot_red', 240],
      ['w_shuso', 'ingot_red', 120],
      ['w_jo', 'wbatS', 30],
      ['w_jo', 'wbatM', 4],
      ['w_jo', 'part_cu', 12],
      ['w_jo', 'part_sca', 3],
      ['w_oryu', 'core_sep', 60],
      ['w_tenno', 'sokuj', 120],
      ['w_jo', 'crystal', 10],
      ['w_jo', 'eq_soku', 2],
      ['w_jo', 'sokuj_h', 6],
      ['w_jo', 'gas_acid', 3],
    ];
    for (const [area, item, rate] of cases) compare(ctxOf(area), item, rate);
  });

  it('経路の選択を変えても一致する', () => {
    // 壌晶は 大型化学反応炉 と 精製機 の2通りで作れる
    compare(ctxOf('w_jo'), 'crystal', 10, { crystal: 'r_crystalB' });
    compare(ctxOf('w_jo'), 'wbatM', 4, { crystal: 'r_crystalB' });
    compare(ctxOf('w_jo'), 'part_cu', 12, { core_sep: RAW });
  });

  it('基礎電力を変えても発電機の台数が一致する', () => {
    for (const base of [0, 60, 100, 240, 1000]) compare(ctxOf('a_chusu', base), 'batS', 30);
  });

  it('ブロック1枚の単位が一致する', () => {
    const cases: [string, string][] = [
      ['a_chusu', 'batS'],
      ['a_chusu', 'batM'],
      ['a_chusu', 'shell'],
      ['a_chusu', 'part_hi'],
      ['w_jo', 'ingot_red'],
      ['w_jo', 'wbatS'],
      ['w_jo', 'part_cu'],
      ['w_oryu', 'core_sep'],
      ['w_tenno', 'sokuj'],
    ];
    for (const [area, item] of cases) {
      const ctx = ctxOf(area);
      expect(unitOf(ctx, item), `${item}@${area}`).toEqual(ref.unitOf(refState(ctx), item));
    }
  });

  it('展開の途中経過（サイクル数）まで一致する', () => {
    const ctx = ctxOf('w_jo');
    const mine = expandNeed(ctx, { part_cu: 12 }, {});
    const want = ref.planWith(refState(ctx), 'part_cu', 12, {}, { noPower: true });
    // pure は expandNeed の cyc から作られる
    const mineMachines = Object.keys(mine.cyc)
      .map((rid) => `${rid}:${((mine.cyc[rid]! * ds.rec(rid)!.sec) / 60).toFixed(9)}`)
      .sort();
    expect(mineMachines).toEqual(want.pure.map((p) => `${p.rid}:${p.machines.toFixed(9)}`).sort());
  });
});

/* ═══════════════════════════════════════════════════════════
   §8 の未解決課題への対応
   ═══════════════════════════════════════════════════════════ */

describe('§8-5 循環レシピ', () => {
  it('利得のある循環（種2個 ⇄ サンドリーフ1個）は正しく収束する', () => {
    /* 1個の種から1個のサンドリーフ、1個のサンドリーフから2個の種。
       種を作るぶんを自分で賄いながら、目標ぶんを外へ出す形に落ち着く。 */
    const p = buildPlan(ctxOf('a_chusu'), 'sand', 30, {}, { noPower: true });
    expect(p.diverged).toBeFalsy();
    expect(p.unresolved ?? {}).toEqual({});
    const farm = p.rows.find((r) => r.rid === 'r_grow_sand')!;
    const seeder = p.rows.find((r) => r.rid === 'r_seed_sand')!;
    // 栽培60個/分（うち30を採種へ回す）、採種30個/分
    near(farm.machines, 6);
    near(seeder.machines, 3);
    expect(Object.keys(p.raw)).toEqual([]); // 外から要るものは無い
  });

  it('利得のない循環は「収束しない」と分かる（黙って打ち切らない）', () => {
    /* 参照実装は反復上限で打ち切るだけだったので、
       台数が「それらしいが正しくない値」になっていた（HANDOFF §8-5）。 */
    const broken: Save = seed();
    const seedRec = broken.recs.find((r) => r.id === 'r_seed_sand')!;
    seedRec.out = [{ item: 'seed_sand', qty: 1 }]; // 1個から1個 ＝ 利得なし
    const ctx: PlanContext = { ds: buildDataset(broken), areas: broken.areas, cur: 0, basePower: 240 };
    const p = buildPlan(ctx, 'sand', 30, {}, { noPower: true });
    expect(Object.keys(p.unresolved ?? {}).length).toBeGreaterThan(0);
    expect(p.unresolved!['sand'] ?? p.unresolved!['seed_sand']).toBeGreaterThan(0);
  });
});

describe('§8-3 ブロック方式が現実的な大きさに収まるか', () => {
  it('端数だらけのレシピでは、単位が大きすぎるので使わない', () => {
    /* 息壌ガスは「1周期2.86秒・材料1.286個」というライン本数からの推定値なので、
       全設備が整数台になる目標値が 15000個/分（1枚3287台）になってしまう。
       そのまま組もうとすると探索が返ってこない。 */
    const ctx = ctxOf('w_jo');
    const ideal = idealTargets(buildPlan(ctx, 'gas_soku', 1, {}, { noPower: true }))!;
    expect(ideal.unit).toBe(15000);
    expect(buildPlan(ctx, 'gas_soku', ideal.unit, {}, { noPower: true }).intSum).toBeGreaterThan(1000);
    // 台数で弾く
    expect(unitOf(ctx, 'gas_soku')).toBeNull();
    expect(unitOf(ctx, 'sokuj_h')).toBeNull();
    expect(unitOf(ctx, 'eq_soku')).toBeNull();
  });

  it('普通のレシピはこれまでどおり使える', () => {
    const ctx = ctxOf('a_chusu');
    expect(unitOf(ctx, 'batS')).toBe(30);
    expect(unitOf(ctx, 'shell')).toBe(10);
    expect(unitOf(ctxOf('w_jo'), 'ingot_red')).toBe(30);
    expect(unitOf(ctxOf('w_jo'), 'part_cu')).toBe(12);
  });

  it('上限は明示的に変えられる', () => {
    const ctx = ctxOf('w_jo');
    // 上限を外せば、数学的に正しい単位そのものは今までどおり得られる
    expect(unitOf(ctx, 'gas_soku', {}, { maxMachines: 100000 })).toBe(15000);
    // 逆に上限を0にすれば何も通らない
    expect(unitOf(ctx, 'ingot_red', {}, { maxMachines: 0 })).toBeNull();
  });
});
