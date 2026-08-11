/**
 * 逆算プランナー（HANDOFF §5-2 / §2 の planner.ts）
 *
 * 目標産出量から必要台数を求める。
 *
 * 守るべき性質:
 *
 *   - 副産物（out[0] 以外）は「狙って作るもの」の候補にしない。
 *     これを入れないと、汚水ほしさに赤銅塊を、そのために水を、水のために汚水を…と
 *     無限に膨らむ。実際に発散して台数が 1e263 になった。発散検知も残してある。
 *   - 採取ゾーンにある品目・他エリアが余らせている品目は「作らず倉庫から引く」。
 *     ただし目標品目自身は除く（目標を掘って済ませては意味がない）。
 *   - 端数最適化は連分数展開で分母を求める。
 *     全設備が整数台・100%稼働になる最小の目標値（の倍数）を提示する。
 */

import type { Dataset } from './dataset';
import type { Area, Facility, FieldEntry, Recipe } from './types';

/** 発散とみなす閾値。ここを超えたら諦めて diverged を返す */
const DIVERGE_LIMIT = 1e9;
const EXPAND_ITERS = 300;

export interface PlanContext {
  ds: Dataset;
  areas: readonly Area[];
  cur: number;
  basePower: number;
  /** 発電に使うレシピ id（meta.genRec） */
  genRec?: string | null;
  /** 現在のエリアの採取ゾーン。省略時は areas[cur].field */
  field?: readonly FieldEntry[];
}

/** 品目ごとの経路選択。レシピ id か、'__raw__'（作らず倉庫から引く） */
export type Choice = Record<string, string | undefined>;
export const RAW = '__raw__';

export interface PlanRow {
  rid: string;
  rec: Recipe;
  fac: Facility;
  /** 理論台数（端数あり） */
  machines: number;
  /** 切り上げた実台数 */
  int: number;
  util: number;
  area: number;
  power: number;
}

export interface Plan {
  targetItem: string;
  targetRate: number;
  rows: PlanRow[];
  /** 倉庫から引き出す原料（作らないもの） */
  raw: Record<string, number>;
  made: Record<string, number>;
  /** 必要な発電機の台数 */
  gens: number;
  gf: Facility | undefined;
  gr: Recipe | undefined;
  base: number;
  power: number;
  area: number;
  /** 理論台数の合計と実台数の合計。差が「切り上げの無駄」 */
  fracSum: number;
  intSum: number;
  /** 発電機の消費を除いた純粋な生産比率。端数最適化はこちらで判定する */
  pure: { rid: string; machines: number }[];
  /** 品目ごとの総搬送量 */
  flow: { item: string; rate: number }[];
  /** 切り上げ後の構成で実際に出せる上限 */
  capMax: number;
  diverged?: boolean;
  /** 材料が循環していて必要量が収束しなかった品目（§8-5） */
  unresolved?: Record<string, number>;
}

export interface ExpandResult {
  /** レシピ id → 必要サイクル数（毎分） */
  cyc: Record<string, number>;
  /** 倉庫から引く品目 → 量 */
  raw: Record<string, number>;
  made: Record<string, number>;
  need: Record<string, number>;
  diverged: boolean;
  /**
   * 反復を打ち切ってもなお足りていない品目と、その不足量。
   *
   * 材料が循環していて利得が1以下だと（1個作るのに1個要る、など）、
   * 展開は永久に終わらない。参照実装は反復上限で黙って打ち切っていたので、
   * 台数が「それらしいが正しくない値」になっていた。
   * ここで検出して、呼び出し側が「収束しなかった」と言えるようにする。
   */
  unresolved: Record<string, number>;
}

/**
 * 品目 → その品目を「主産物として」作るレシピの候補。
 *
 * 2番目以降の産物（副産物）は、狙って作るものではないので候補にしない。
 * これを入れないと、副産物ほしさに上流を無限に増やす循環が起きる。
 */
export function producersOf(ds: Dataset): Record<string, Recipe[]> {
  const m: Record<string, Recipe[]> = {};
  for (const r of ds.recs.values()) {
    const o = r.out[0];
    if (o) (m[o.item] ??= []).push(r);
  }
  return m;
}

/**
 * 倉庫から引き出せる品目と量。
 * この地域のどこかで採取しているか、他エリアが余らせているもの。
 */
export function warehouseSupply(ctx: PlanContext): Record<string, number> {
  const reg = ctx.areas[ctx.cur]?.region;
  const sup: Record<string, number> = {};
  ctx.areas.forEach((a, ai) => {
    if (a.region !== reg) return;
    const fl = ai === ctx.cur ? (ctx.field ?? a.field ?? []) : (a.field ?? []);
    for (const f of fl) {
      if (f.item && f.count > 0 && +f.rate > 0) sup[f.item] = (sup[f.item] || 0) + f.count * (+f.rate || 0);
    }
    if (ai !== ctx.cur && a.net) {
      for (const k of Object.keys(a.net)) if (a.net[k]! > 0) sup[k] = (sup[k] || 0) + a.net[k]!;
    }
  });
  return sup;
}

function fieldSupplied(ctx: PlanContext): Record<string, boolean> {
  const sup = warehouseSupply(ctx);
  const s2: Record<string, boolean> = {};
  for (const k of Object.keys(sup)) if (sup[k]! > 0) s2[k] = true;
  return s2;
}

/**
 * 需要を再帰的に展開してレシピ別サイクル数を求める。
 *
 * 各周回で「まだ足りていない品目」を1つずつ潰していく。
 * 展開の途中で新しく現れた品目は次の周回で拾う。
 */
export function expandNeed(ctx: PlanContext, targets: Record<string, number>, choice: Choice): ExpandResult {
  const prod = producersOf(ctx.ds);
  const fs = fieldSupplied(ctx);
  const need: Record<string, number> = {};
  const made: Record<string, number> = {};
  const cyc: Record<string, number> = {};
  const raw: Record<string, number> = {};
  let diverged = false;

  // 目標そのものは掘らずに作る
  for (const k of Object.keys(targets)) {
    need[k] = targets[k]!;
    delete fs[k];
  }

  for (let it = 0; it < EXPAND_ITERS; it++) {
    let changed = false;
    for (const item of Object.keys(need)) {
      const deficit = need[item]! - (made[item] || 0);
      if (deficit <= 1e-9) continue;
      if (!isFinite(deficit) || deficit > DIVERGE_LIMIT) {
        diverged = true;
        break;
      }
      const ch = choice[item];
      let r: Recipe | null = null;
      if (ch === RAW) r = null;
      else if (ch && ctx.ds.rec(ch)) r = ctx.ds.rec(ch)!;
      else if (fs[item]) r = null; // 採取ゾーンにあるものは掘って賄う
      else r = prod[item]?.[0] ?? null;

      if (!r) {
        raw[item] = (raw[item] || 0) + deficit;
        made[item] = (made[item] || 0) + deficit;
        changed = true;
        continue;
      }
      const q = (r.out.find((o) => o.item === item) ?? { qty: 1 }).qty || 1;
      const cycles = deficit / q;
      cyc[r.id] = (cyc[r.id] || 0) + cycles;
      for (const o of r.out) made[o.item] = (made[o.item] || 0) + cycles * o.qty;
      for (const i of r.in) need[i.item] = (need[i.item] || 0) + cycles * i.qty;
      changed = true;
    }
    if (!changed || diverged) break;
  }

  // 打ち切り時点で埋まっていない需要が残っていれば、それは収束しなかったということ
  const unresolved: Record<string, number> = {};
  for (const item of Object.keys(need)) {
    const short = need[item]! - (made[item] || 0);
    if (short > 1e-6) unresolved[item] = short;
  }
  return { cyc, raw, made, need, diverged, unresolved };
}

/**
 * 目標から最小構成を組む。
 * 発電機とバッテリー消費の自己参照もここで収束させる。
 */
export function buildPlan(
  ctx: PlanContext,
  targetItem: string,
  targetRate: number,
  choice: Choice = {},
  opts: { noPower?: boolean } = {},
): Plan {
  const ds = ctx.ds;
  const base = Math.max(0, +ctx.basePower || 0);
  const gf = ds.generatorFac();
  const gr = ds.generatorRec(ctx.genRec);
  let gens = 0;
  let out: Plan | null = null;

  for (let k = 0; k < 12; k++) {
    /* 発電機の燃料は倉庫から引き出す前提にする。生産ツリーに混ぜると、
       わずかな燃料のために中途半端な設備が1台ずつ増え、どれもフル稼働できなくなる */
    const targets: Record<string, number> = { [targetItem]: targetRate };
    const ex = expandNeed(ctx, targets, choice);
    if (ex.diverged)
      return {
        targetItem, targetRate, rows: [], raw: {}, made: {}, gens: 0, gf, gr, base,
        power: 0, area: 0, fracSum: 0, intSum: 0, flow: [], capMax: 0, pure: [], diverged: true,
        unresolved: ex.unresolved,
      };

    const rows: PlanRow[] = [];
    let power = 0;
    let area = 0;
    let fracSum = 0;
    let intSum = 0;
    for (const rid of Object.keys(ex.cyc)) {
      const r = ds.rec(rid)!;
      const f = ds.fac(r.fac) ?? ({ w: 1, h: 1, power: 0, name: '?' } as Facility);
      const machines = (ex.cyc[rid]! * r.sec) / 60;
      const int = Math.ceil(machines - 1e-9);
      rows.push({
        rid, rec: r, fac: f, machines, int,
        util: int ? machines / int : 0,
        area: int * f.w * f.h,
        power: int * (f.power || 0),
      });
      power += int * (f.power || 0);
      area += int * f.w * f.h;
      fracSum += machines;
      intSum += int;
    }
    rows.sort((a, b) => b.machines - a.machines);

    const deficit = Math.max(0, power - base);
    const ng = opts.noPower || !(gf && gf.gen > 0) ? 0 : Math.max(0, Math.ceil(deficit / gf.gen - 1e-9));
    out = {
      targetItem, targetRate, rows, raw: ex.raw, made: ex.made, gens: ng, gf, gr, base,
      power, area, fracSum, intSum, pure: [], flow: [], capMax: 0,
      ...(Object.keys(ex.unresolved).length ? { unresolved: ex.unresolved } : {}),
    };
    if (ng === gens) break;
    gens = ng;
  }
  const plan = out!;

  /* 発電機の消費を除いた「純粋な生産比率」— 端数最適化はこちらで判定する */
  const pure = expandNeed(ctx, { [targetItem]: targetRate }, choice);
  plan.pure = Object.keys(pure.cyc).map((rid) => ({ rid, machines: (pure.cyc[rid]! * ds.rec(rid)!.sec) / 60 }));

  /* 発電機そのものの面積 */
  if (plan.gens > 0 && plan.gf) plan.area += plan.gens * plan.gf.w * plan.gf.h;

  /* 品目ごとの総搬送量。最低ライン数はここから割り出す */
  const flow: Record<string, { item: string; rate: number }> = {};
  const bump = (i: string, v: number): void => {
    (flow[i] ??= { item: i, rate: 0 }).rate += v;
  };
  for (const r of plan.rows) for (const x of r.rec.out) bump(x.item, ((x.qty * 60) / r.rec.sec) * r.machines);
  for (const i of Object.keys(plan.raw)) bump(i, plan.raw[i]!);
  plan.flow = Object.values(flow)
    .filter((f) => f.rate > 1e-9)
    .sort((a, b) => b.rate - a.rate);

  /* 切り上げ後の構成で実際に出せる上限。ここまでは目標を上げても設備が増えない */
  let capMax = Infinity;
  for (const r of plan.rows) if (r.machines > 1e-9) capMax = Math.min(capMax, (r.int * targetRate) / r.machines);
  plan.capMax = isFinite(capMax) ? capMax : targetRate;
  return plan;
}

/* ── 端数最適化 ──────────────────────────────────────────
   台数は目標値に比例する分数になるので、連分数展開で分母を求め、
   全設備が整数台・100%稼働になる最小の目標値（の倍数）を提示する。
   例: 小容量バッテリーは30個/分の倍数なら無駄ゼロ。 */

/** 小数を分数に（連分数展開） */
export function toFrac(x: number, maxD = 20000): [number, number] {
  let n0 = 0;
  let d0 = 1;
  let n1 = 1;
  let d1 = 0;
  let v = x;
  for (let i = 0; i < 30; i++) {
    const a = Math.floor(v + 1e-12);
    const n2 = a * n1 + n0;
    const d2 = a * d1 + d0;
    if (d2 > maxD || !isFinite(d2)) break;
    n0 = n1;
    d0 = d1;
    n1 = n2;
    d1 = d2;
    if (Math.abs(n1 / d1 - x) < 1e-9) break;
    const f = v - a;
    if (f < 1e-9) break;
    v = 1 / f;
  }
  return d1 ? [n1, d1] : [Math.round(x), 1];
}

export function gcdI(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

export function lcmI(a: number, b: number): number {
  return (a / gcdI(a, b)) * b;
}

/** 全設備が整数台・100%稼働になる目標値（の単位）と、近い候補 */
export function idealTargets(plan: Plan): { unit: number; cands: number[] } | null {
  const src: { machines: number }[] = plan.pure && plan.pure.length ? plan.pure : plan.rows;
  if (!src.length || plan.targetRate <= 0) return null;
  let L = 1;
  let ok = true;
  for (const r of src) {
    const c = r.machines / plan.targetRate; // 目標1個/分あたりの台数
    const [p, q] = toFrac(c);
    if (!p || !q) {
      ok = false;
      continue;
    }
    const step = q / gcdI(p, q);
    if (step > 100000) {
      ok = false;
      continue;
    }
    L = lcmI(L, step);
    if (L > 1e7) ok = false;
  }
  if (!ok || !isFinite(L) || L > 1e6) return null;
  const unit = L; // これの倍数なら全設備が整数台・100%稼働
  const k = Math.max(1, Math.round(plan.targetRate / unit));
  const cands = [...new Set([Math.max(1, k - 1), k, k + 1, k + 2])]
    .map((i) => i * unit)
    .filter((v) => v > 0 && Math.abs(v - plan.targetRate) > 1e-9)
    .sort((a, b) => Math.abs(a - plan.targetRate) - Math.abs(b - plan.targetRate));
  return { unit, cands: cands.slice(0, 3) };
}

/**
 * ブロック1枚に入れてよい設備の数。
 *
 * 初期データには「1周期2.86秒・材料1.286個」のように、ライン本数から逆算した
 * 端数の値がある。連分数展開はそれを額面どおり受け取るので、
 * 全設備が整数台になる目標値が 15000個/分（＝1枚3287台）のような
 * 現実離れした大きさになることがある。
 * そのまま組もうとすると探索が何十秒も返ってこないので、
 * 大きすぎる単位はブロック方式の対象から外し、1本のライン方式へ回す。
 */
export const BLOCK_MACHINES_MAX = 120;

/** その品目の「全設備が整数台になる最小の生産量」＝ブロック1枚分 */
export function unitOf(
  ctx: PlanContext,
  item: string,
  choice: Choice = {},
  opts: { maxMachines?: number } = {},
): number | null {
  const p = buildPlan(ctx, item, 1, choice, { noPower: true });
  if (!p || !p.rows.length) return null;
  const id = idealTargets(p);
  if (!id || !isFinite(id.unit) || id.unit <= 0 || id.unit > 100000) return null;
  // 単位の値ではなく、その単位で組んだときの**台数**で現実味を判定する
  const unitPlan = buildPlan(ctx, item, id.unit, choice, { noPower: true });
  if (unitPlan.intSum > (opts.maxMachines ?? BLOCK_MACHINES_MAX)) return null;
  return id.unit;
}
