/**
 * 段の割り当てと重心法による並び替え（HANDOFF §5-3 / §2 の layout/tiers.ts）
 *
 * 段の決め方・並べ方:
 *
 *   - 段は「最終産物から何段手前か」で決める。原料からの距離で決めると、
 *     終盤でしか使わない枝（蕎花のような素材）が左端に流されて長距離配線になる。
 *   - 段内の順序は重心法（つながる相手の平均位置）で決め、段ごとの縦の広がりを揃える。
 *     台数の違う段（採鉱機9台と精錬炉5台）でも相手が真横に来る。
 *   - 分流器・合流器は、繋がる相手の平均の高さへ寄せる（座標割り当て後・autoLayout 側）。
 *
 * 呼ぶ順序そのものが仕様なので、autoLayout.ts の番号つきコメントを必ず読むこと。
 */

import type { Dataset } from '../dataset';
import type { Plan } from '../planner';
import type { Facility, Node, Recipe } from '../types';

/** 段に並べる1台ぶんの枠。座標が決まると node が入る */
export interface Slot {
  fac: string;
  rec?: string | undefined;
  item?: string | undefined;
  /** 産出（品目 → 個/分） */
  out: Record<string, number>;
  /** 消費（品目 → 個/分） */
  in: Record<string, number>;
  /** 段。整数が本体の段、小数は挿し込んだ段（貯蔵設備・分流器・燃料取出口） */
  d: number;
  ord?: number;
  node?: Node;
  sink?: boolean;
  logi?: boolean;
}

export interface Link {
  a: Slot;
  z: Slot;
  item: string;
  /** 分流器・合流器に置き換えられた印 */
  dead?: boolean;
}

/**
 * 段の入れ物。
 *
 * ここは Map ではなく素のオブジェクトであることに意味がある。
 * JS のキー順は「整数キーを昇順 → それ以外を挿入順」なので、
 * 本体の段（0,1,2…）が先に、挿し込んだ小数の段（0.5, 1.2…）が後に来る。
 * この順序が下の貪欲マッチングの結果を左右するため、参照実装と同じ形を保つ。
 */
export type Tiers = Record<string, Slot[]>;

export interface TierBuild {
  tiers: Tiers;
  /** 全スロット。tiers のキー順に並んでいる */
  all: Slot[];
  maxRank: number;
  maxD: number;
}

/**
 * レシピの段＝「最終産物から何段手前か」。
 * 自分の産物を使う相手の段 + 1 の最大値。
 */
export function makeRanker(plan: Plan): {
  rankRec: (rec: Recipe, dep?: number) => number;
  rankItem: (item: string) => number;
  maxRank: number;
} {
  const consumersOf: Record<string, Recipe[]> = {};
  for (const r of plan.rows) for (const x of r.rec.in) (consumersOf[x.item] ??= []).push(r.rec);

  const memo: Record<string, number> = {};
  const rankRec = (rec: Recipe, dep = 0): number => {
    if (memo[rec.id] !== undefined) return memo[rec.id]!;
    if (dep > 24) return 0;
    memo[rec.id] = 0; // 循環レシピで無限に潜らないための仮置き
    let m = -1;
    for (const o of rec.out) {
      for (const cr of consumersOf[o.item] ?? []) {
        if (cr.id === rec.id) continue;
        m = Math.max(m, rankRec(cr, dep + 1) + 1);
      }
    }
    memo[rec.id] = m < 0 ? 0 : m;
    return memo[rec.id]!;
  };

  let maxRank = 0;
  for (const r of plan.rows) maxRank = Math.max(maxRank, rankRec(r.rec, 0));

  const rankItem = (item: string): number => {
    let m = 0;
    for (const cr of consumersOf[item] ?? []) m = Math.max(m, rankRec(cr, 0) + 1);
    return m;
  };

  return { rankRec, rankItem, maxRank };
}

/**
 * 1) 段ごとのスロットを作る（採取口・生産設備・発電機とその燃料取出口）
 */
export function buildTiers(ds: Dataset, plan: Plan): TierBuild {
  const { rankRec, rankItem, maxRank } = makeRanker(plan);
  const tiers: Tiers = {};
  const push = (d: number, o: Omit<Slot, 'd'>): Slot => {
    const s = o as Slot;
    s.d = d;
    (tiers[d] ??= []).push(s);
    return s;
  };

  const tapFac = [...ds.facs.values()].find((f) => f.tap);

  // 倉庫から引く原料の取出口。使う側より必ず1段手前へ
  for (const item of Object.keys(plan.raw)) {
    if (!tapFac) break;
    const n = Math.max(1, Math.ceil(plan.raw[item]! / ds.capOf(item) - 1e-9));
    const d = maxRank - rankItem(item);
    for (let i = 0; i < n; i++) push(d, { fac: tapFac.id, item, out: { [item]: ds.capOf(item) }, in: {} });
  }

  let maxD = 0;
  for (const r of plan.rows) {
    const d = maxRank - rankRec(r.rec, 0);
    maxD = Math.max(maxD, d);
    const cpm = 60 / r.rec.sec;
    const out: Record<string, number> = {};
    const inp: Record<string, number> = {};
    for (const x of r.rec.out) out[x.item] = x.qty * cpm;
    for (const x of r.rec.in) inp[x.item] = x.qty * cpm;
    for (let k = 0; k < r.int; k++) push(d, { fac: r.rec.fac, rec: r.rec.id, out, in: inp });
  }

  // 発電機と、その燃料を倉庫から引く取出口（発電機の並びのすぐ手前）
  if (plan.gens > 0 && plan.gr) {
    const gr = plan.gr;
    const cpm = 60 / gr.sec;
    const inp: Record<string, number> = {};
    for (const x of gr.in) inp[x.item] = x.qty * cpm;
    for (let k = 0; k < plan.gens; k++) push(maxD + 1, { fac: gr.fac, rec: gr.id, out: {}, in: inp });
    if (tapFac) {
      for (const x of gr.in) {
        const need = plan.gens * x.qty * cpm;
        const nt = Math.max(1, Math.ceil(need / ds.capOf(x.item) - 1e-9));
        for (let k = 0; k < nt; k++)
          push(maxD + 0.5, { fac: tapFac.id, item: x.item, out: { [x.item]: ds.capOf(x.item) }, in: {} });
      }
    }
  }

  const all: Slot[] = ([] as Slot[]).concat(...Object.keys(tiers).map((d) => tiers[d]!));
  return { tiers, all, maxRank, maxD };
}

export interface Surplus {
  slot: Slot;
  item: string;
  rate: number;
}

/**
 * 2) スロット同士の接続を決める（貪欲マッチング）。余った産出量を surplus に記録
 */
export function buildLinks(ds: Dataset, all: Slot[]): { links: Link[]; surplus: Surplus[] } {
  const links: Link[] = [];
  const surplus: Surplus[] = [];
  const items = new Set<string>();
  for (const s of all) {
    for (const i of Object.keys(s.out)) items.add(i);
    for (const i of Object.keys(s.in)) items.add(i);
  }

  for (const item of items) {
    const P = all.filter((s) => (s.out[item] ?? 0) > 0).map((s) => ({ s, r: s.out[item]! }));
    const Cn = all.filter((s) => (s.in[item] ?? 0) > 0).map((s) => ({ s, r: s.in[item]! }));
    let pi = 0;
    for (const c of Cn) {
      let need = c.r;
      let guard = 0;
      while (need > 1e-6 && pi < P.length && guard++ < 400) {
        if (P[pi]!.r <= 1e-6) {
          pi++;
          continue;
        }
        const take = Math.min(need, P[pi]!.r, ds.capOf(item));
        links.push({ a: P[pi]!.s, z: c.s, item });
        need -= take;
        P[pi]!.r -= take;
      }
    }
    for (const x of P) if (x.r > 1e-6) surplus.push({ slot: x.s, item, rate: x.r });
  }
  return { links, surplus };
}

/**
 * 3) 余った産出（最終産物も副産物も）に貯蔵設備を足す。
 *
 * **必ず 4)（分流器を挟む処理）より前に行うこと。**
 * 後にすると、口の割り当てが済んだ設備に接続を足すことになり
 * 「搬出口が満杯」で配線が落ちる。失敗22本の原因がこれだった。
 *
 * 在庫が満杯になると設備が止まるので、汚水や廃液にも必ず捨て先が要る。
 */
export function addSurplusSinks(
  ds: Dataset,
  tiers: Tiers,
  all: Slot[],
  links: Link[],
  surplus: Surplus[],
): void {
  const sinkFor = (item: string): Facility | undefined => {
    const ph = ds.phaseOf(item);
    const facs = [...ds.facs.values()];
    return (
      facs.find((f) => f.kind === 'sink' && (f.phase || 'solid') === ph) ??
      facs.find((f) => f.kind === 'sink' && !f.phase) ??
      facs.find((f) => f.kind === 'sink')
    );
  };

  for (const su of surplus) {
    const sf = sinkFor(su.item);
    if (!sf) continue;
    const n = Math.max(1, Math.ceil(su.rate / ds.capOf(su.item) - 1e-9));
    for (let k = 0; k < n; k++) {
      const d = su.slot.d + 0.5;
      const sk: Slot = {
        fac: sf.id,
        sink: true,
        out: {},
        in: { [su.item]: Math.min(ds.capOf(su.item), su.rate / n) },
        d,
      };
      (tiers[d] ??= []).push(sk);
      all.push(sk);
      links.push({ a: su.slot, z: sk, item: su.item });
    }
  }
}

/** 挿入順を保つグループ化 */
function groupBy<T, K>(arr: T[], kf: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = kf(x);
    let g = m.get(k);
    if (!g) m.set(k, (g = []));
    g.push(x);
  }
  return m;
}

/** 均等木の分岐数。割り切れる数を選ぶと枝の重さが揃う */
function branch(n: number, cap: number): number {
  if (n <= cap) return n;
  for (let b = cap; b >= 2; b--) if (n % b === 0) return b;
  return cap;
}

function evenSplit<T>(list: T[], b: number): T[][] {
  const per = Math.floor(list.length / b);
  const rem = list.length % b;
  const gs: T[][] = [];
  let i = 0;
  for (let g = 0; g < b; g++) {
    const c = per + (g < rem ? 1 : 0);
    if (c > 0) {
      gs.push(list.slice(i, i + c));
      i += c;
    }
  }
  return gs;
}

/** 品目ごとに何本の口を割り当てるか。1品目1本を確保したうえで、残りを本数の多い品目へ */
function allocPorts(byItem: Map<string, Link[]>, room: number): Map<string, number> {
  const items = [...byItem.keys()];
  const alloc = new Map(items.map((i) => [i, 1]));
  let spare = room - items.length;
  let guard = 0;
  const sorted = items.slice().sort((x, y) => byItem.get(y)!.length - byItem.get(x)!.length);
  while (spare > 0 && guard++ < 500) {
    let moved = false;
    for (const i of sorted) {
      if (spare <= 0) break;
      if (alloc.get(i)! < byItem.get(i)!.length) {
        alloc.set(i, alloc.get(i)! + 1);
        spare--;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return alloc;
}

/**
 * 4) 口の数を超える分岐・合流に分流器／合流器の均等木を挟む。
 *
 * 1つの口にラインは1本しか繋がらないので、ここは物理的な必須条件。
 * 分流器は繋がった本数に等分するだけなので、枝の重さが揃う「均等木」に組む。
 * 品目をまたいで1本にまとめないこと（別の品目が混ざったラインは意味を持たない）。
 */
export function insertLogistics(ds: Dataset, tiers: Tiers, links: Link[]): Link[] {
  const facs = [...ds.facs.values()];
  // 固体はベルト用、液体・ガスはパイプ用の物流設備を選ぶ
  const logiFor = (item: string, split: boolean): Facility | undefined => {
    const fluid = ds.phaseOf(item) !== 'solid';
    return (
      facs.find((f) => f.kind === 'logistics' && !!f.split === split && (f.phase === 'fluid') === fluid) ??
      facs.find((f) => f.kind === 'logistics' && !!f.split === split)
    );
  };
  const spF = facs.find((f) => f.kind === 'logistics' && f.split);
  const mgF = facs.find((f) => f.kind === 'logistics' && !f.split);
  const push = (d: number, o: Omit<Slot, 'd'>): Slot => {
    const s = o as Slot;
    s.d = d;
    (tiers[d] ??= []).push(s);
    return s;
  };

  let out = links;

  // 分流：親1つ → 子n個の均等木
  if (spF) {
    const cap = Math.max(2, ds.portCounts(spF.id).nOut);
    groupBy(out, (l) => l.a).forEach((ls, a) => {
      const room = Math.max(1, ds.portCounts(a.fac).nOut);
      if (ls.length <= room) return;
      const byItem = groupBy(ls, (l) => l.item);
      const alloc = allocPorts(byItem, room);
      byItem.forEach((ls2, item) => {
        const k = Math.max(1, Math.min(alloc.get(item) ?? 1, ls2.length));
        if (ls2.length <= k) return;
        for (const l of ls2) l.dead = true;
        const spF2 = logiFor(item, true) ?? spF;
        const build = (list: Link[], lv: number): Slot => {
          if (list.length === 1) return list[0]!.z;
          const sp = push(a.d + 0.2 + lv * 0.1, { fac: spF2.id, out: {}, in: {}, logi: true });
          for (const g of evenSplit(list, branch(list.length, cap)))
            out.push({ a: sp, z: build(g, lv + 1), item });
          return sp;
        };
        for (const g of evenSplit(ls2, k)) out.push({ a, z: build(g, 0), item });
      });
    });
    out = out.filter((l) => !l.dead);
  }

  // 合流：子n個 → 親1つの均等木
  if (mgF) {
    const cap = Math.max(2, ds.portCounts(mgF.id).nIn);
    groupBy(out, (l) => l.z).forEach((ls, z) => {
      const room = Math.max(1, ds.portCounts(z.fac).nIn);
      if (ls.length <= room) return;
      const byItem = groupBy(ls, (l) => l.item);
      const alloc = allocPorts(byItem, room);
      byItem.forEach((ls2, item) => {
        const k = Math.max(1, Math.min(alloc.get(item) ?? 1, ls2.length));
        if (ls2.length <= k) return;
        for (const l of ls2) l.dead = true;
        const mgF2 = logiFor(item, false) ?? mgF;
        const build = (list: Link[], lv: number): Slot => {
          if (list.length === 1) return list[0]!.a;
          const mg = push(z.d - 0.2 - lv * 0.1, { fac: mgF2.id, out: {}, in: {}, logi: true });
          for (const g of evenSplit(list, branch(list.length, cap)))
            out.push({ a: build(g, lv + 1), z: mg, item });
          return mg;
        };
        for (const g of evenSplit(ls2, k)) out.push({ a: build(g, 0), z, item });
      });
    });
    out = out.filter((l) => !l.dead);
  }

  return out;
}

/**
 * 5) 重心法で段内の順序を決める（深い段から手前へ）。
 * つながる相手の平均位置に寄せると、相手が真横に来て配線が短くなる。
 */
export function orderByCentroid(tiers: Tiers, tierKeys: number[], links: Link[]): void {
  tierKeys
    .slice()
    .reverse()
    .forEach((d, k) => {
      const list = tiers[d]!;
      list.forEach((s, i) => {
        if (s.ord === undefined) s.ord = i;
      });
      if (k === 0) {
        // いちばん奥の段は基準なので、並びをそのまま番号にする
        list.forEach((s, i) => (s.ord = i));
        return;
      }
      for (const s of list) {
        const tos = links.filter((l) => l.a === s).map((l) => l.z.ord).filter((v): v is number => v !== undefined);
        s.ord = tos.length ? tos.reduce((a, b) => a + b, 0) / tos.length : 1e6;
      }
      list.sort((a, b) => a.ord! - b.ord!);
      list.forEach((s, i) => (s.ord = i));
    });
}
