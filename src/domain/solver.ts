/**
 * ソルバー（HANDOFF §5-1 / §2 の solver.ts）
 *
 * 稼働率・流量・電力・倉庫収支を繰り返し計算で収束させる。2段構え。
 *
 *   1. 需要（desired）を下流から上流へ伝える。
 *      「作れる量」ではなく「引き取ってもらえる量」の上限を求める。
 *      出口にラインが無い設備は稼働率0（在庫が満杯になって止まる）。
 *   2. 実際に流れる量（achieved）を収束させる。緩和係数 0.45、240反復。
 *
 * 守るべき性質（どれも実際にバグを踏んで直した箇所なので、崩さないこと）:
 *
 *   - 分配は需要比例。同じ出口から複数のラインが出るとき、需要に応じて配分する。
 *     分流器は片側が詰まればもう片側へ流すので、等分ではない（背圧あり）。
 *   - 電力の充足率は、収束後に一度だけ全体へ掛ける。
 *   - 倉庫搬出口の供給量は min(相ごとの上限, 倉庫への入り / その品目の搬出口数)。
 *   - 発電機の燃料は倉庫から引く。生産ツリーに混ぜない。
 */

import { SPLIT_MAX, capCostOf, fmt } from './constants';
import type { Dataset } from './dataset';
import { type Board, cellKey, cellsOf } from './geometry';
import { crossings } from './routing';
import type { Area, Facility, FieldEntry, Node, Recipe, RecipeIO } from './types';

/** 反復回数と緩和係数。参照実装の値をそのまま使う */
const DESIRED_ITERS = 160;
const DESIRED_RELAX = 0.5;
const ACHIEVED_ITERS = 240;
const ACHIEVED_RELAX = 0.45;
/** 物流設備をたどる需要計算の深さ上限（分流器の連鎖が循環しても止まるように） */
const LOGISTICS_DEPTH = 5;

export interface Diag {
  lv: 'err' | 'wrn' | 'inf';
  t: string;
  uid?: string;
  belt?: string;
  field?: boolean;
}

export interface CoreRow {
  id: string;
  /** 採取ゾーンからの転送（同じ地域の全エリア分＋他エリアの純増） */
  field: number;
  /** 他エリアの純増ぶん */
  other: number;
  /** このエリアから倉庫へ搬入した量 */
  ship: number;
  /** 倉庫搬出口が引き出した量 */
  draw: number;
  /** 収支 */
  net: number;
}

export interface BalanceRow {
  id: string;
  make: number;
  use: number;
  ship: number;
}

export interface SolveResult {
  /** 設備 uid → 実効稼働率 */
  ratio: Record<string, number>;
  /** 設備 uid → 下流需要から決まる上限稼働率 */
  des: Record<string, number>;
  /** ライン uid → 流量（個/分） */
  belt: Record<string, number>;
  gen: number;
  genOnly: number;
  base: number;
  cons: number;
  /** 電力充足率 */
  pf: number;
  balance: BalanceRow[];
  core: Record<string, CoreRow>;
  /** 採取ゾーンからの転送量（地域計） */
  field: Record<string, number>;
  /**
   * このエリアの倉庫への純増。
   * 参照実装は area.net を直接書き換えていたが、ここでは返すだけにしてある。
   * 同じ地域の他エリアを計算するとき、呼び出し側がこれを area.net へ書き戻す。
   */
  net: Record<string, number>;
  diag: Diag[];
}

export interface SolveInput {
  ds: Dataset;
  /** 計算するエリアの盤面 */
  board: Board;
  /** 同じ地域の倉庫を合算するために全エリアが要る */
  areas: readonly Area[];
  cur: number;
  basePower: number;
  /** 発電に使うレシピ id（meta.genRec） */
  genRec?: string | null;
  /** 現在のエリアの採取ゾーン。省略時は areas[cur].field */
  field?: readonly FieldEntry[];
  /** 協約容量の点検に使うエリア名・上限。省略時は areas[cur] */
  area?: Area;
}

/** 設備1台ぶんの、計算に必要な情報だけを取り出したもの */
interface Meta {
  n: Node;
  f: { kind: string; power: number; gen: number; name: string; tap?: boolean; phase?: string; max?: number };
  r: { sec: number; in: RecipeIO[]; out: RecipeIO[]; name: string } | null;
  cpm: number;
  inR: { item: string; rate: number }[];
  outR: { item: string; rate: number }[];
}

interface Edge {
  uid: string;
  a: number;
  z: number;
  item: string | null;
  flow: number;
  /** その反復での「引き取ってもらえる量」。分配の重みになる */
  w: number;
}

export function solve(input: SolveInput): SolveResult {
  const { ds, board, areas, cur } = input;
  const nodes = board.nodes;
  const N = nodes.length;
  const at = new Map(nodes.map((n, i) => [n.uid, i]));

  const meta: Meta[] = nodes.map((n) => {
    // 設備定義が消えていても計算は続ける（参照実装と同じ緩さ）
    const f: Partial<Facility> & { kind: string; power: number; gen: number; name: string } = ds.fac(n.fac) ?? {
      kind: 'process',
      power: 0,
      gen: 0,
      name: '?',
    };
    /* 取出口は「倉庫から指定品目をベルト速度で引き出す口」として扱う。
       レシピを持たないので、その場で仮のレシピを組み立てる */
    const r: Meta['r'] = f.tap
      ? n.item
        ? { sec: 60 / ds.capOf(n.item), in: [], out: [{ item: n.item, qty: 1 }], name: '取出：' + ds.itemName(n.item) }
        : null
      : ((): Meta['r'] => {
          const rec: Recipe | undefined = ds.rec(n.rec);
          return rec ? { sec: rec.sec, in: rec.in, out: rec.out, name: rec.name } : null;
        })();
    const cpm = r && r.sec > 0 ? 60 / r.sec : 0; // サイクル/分
    return {
      n,
      f: { kind: f.kind, power: f.power || 0, gen: f.gen || 0, name: f.name, tap: f.tap, phase: f.phase, max: f.max },
      r,
      cpm,
      inR: r ? r.in.map((x) => ({ item: x.item, rate: x.qty * cpm })) : [],
      outR: r ? r.out.map((x) => ({ item: x.item, rate: x.qty * cpm })) : [],
    };
  });

  const belts: Edge[] = board.belts
    .filter((b) => at.has(b.from) && at.has(b.to))
    .map((b) => ({ uid: b.uid, a: at.get(b.from)!, z: at.get(b.to)!, item: b.item, flow: 0, w: 0 }));

  const key = (i: number, it: string | null): string => i + '|' + it;
  const outCnt = new Map<string, number>();
  const inCnt = new Map<string, number>();
  for (const e of belts) {
    outCnt.set(key(e.a, e.item), (outCnt.get(key(e.a, e.item)) || 0) + 1);
    inCnt.set(key(e.z, e.item), (inCnt.get(key(e.z, e.item)) || 0) + 1);
  }
  const outN = nodes.map((_, i) => belts.filter((e) => e.a === i).length);
  const kindOf = (i: number): string => meta[i]!.f.kind;

  /* ── 第1段：需要を下流から上流へ伝える（desired）
        「作れる量」ではなく「引き取ってもらえる量」の上限を求める。
        ライン1本 30個/分 の壁もここで効く。 ── */
  const des = nodes.map(() => 1);

  function needOf(z: number, item: string, depth: number): number {
    const m = meta[z]!;
    if (m.f.kind === 'sink') return Infinity; // 倉庫・貯蔵設備はいくらでも受け取る
    if (m.f.kind === 'logistics') {
      if (depth > LOGISTICS_DEPTH) return ds.capOf(item);
      let s = 0;
      for (const e of belts) {
        if (e.a === z) s += Math.min(ds.capOf(item), needOf(e.z, item, depth + 1) / (inCnt.get(key(e.z, item)) || 1));
      }
      return Math.min(s, ds.capOf(item) * Math.max(1, outN[z]!));
    }
    if (!m.r) return 0;
    const x = m.inR.find((y) => y.item === item);
    return x ? x.rate * des[z]! : 0;
  }

  for (let it = 0; it < DESIRED_ITERS; it++) {
    const nd = nodes.map((_, i) => {
      const m = meta[i]!;
      if (m.f.kind === 'sink' || m.f.kind === 'logistics' || m.f.kind === 'generator') return 1;
      if (!m.r) return 0;
      let r = 1;
      for (const x of m.outR) {
        let acc = 0;
        for (const e of belts) {
          if (e.a === i && e.item === x.item)
            acc += Math.min(ds.capOf(x.item), needOf(e.z, x.item, 0) / (inCnt.get(key(e.z, x.item)) || 1));
        }
        if (x.rate > 0) r = Math.min(r, acc / x.rate);
      }
      return Math.max(0, Math.min(1, r));
    });
    for (let i = 0; i < N; i++) {
      des[i]! += DESIRED_RELAX * (nd[i]! - des[i]!);
      if (des[i]! < 1e-6) des[i] = 0;
    }
  }

  /* ── 第2段：実際に流れる量（achieved）。電力の自己参照もここで収束させる ── */
  const ach = nodes.map((_, i) => (kindOf(i) === 'sink' || kindOf(i) === 'logistics' ? 1 : des[i]!));
  const base = Math.max(0, +input.basePower || 0);

  /* 倉庫は地域ごとに1つ。同じ地域の全エリアの採取量と、
     他エリアの純増（最後にそのエリアを計算したときの結果）を合算する */
  const reg = areas[cur]?.region;
  const fieldRate: Record<string, number> = {};
  const fromOther: Record<string, number> = {};
  areas.forEach((a, ai) => {
    if (a.region !== reg) return;
    const fl = ai === cur ? (input.field ?? a.field ?? []) : (a.field ?? []);
    for (const f of fl) {
      if (!f.item || !(f.count > 0)) continue;
      fieldRate[f.item] = (fieldRate[f.item] || 0) + f.count * (+f.rate || 0);
    }
    if (ai !== cur && a.net) {
      for (const k of Object.keys(a.net)) {
        const v = a.net[k]!;
        if (v > 0) {
          fieldRate[k] = (fieldRate[k] || 0) + v;
          fromOther[k] = (fromOther[k] || 0) + v;
        }
      }
    }
  });

  /* 同じ品目を複数の搬出口が引くときは、倉庫への入りを頭割りにする */
  const tapN: Record<string, number> = {};
  for (const n of nodes) {
    const f = ds.fac(n.fac);
    if (f?.tap && n.item) tapN[n.item] = (tapN[n.item] || 0) + 1;
  }
  let coreIn: Record<string, number> = { ...fieldRate };
  const tapRate = (it: string): number =>
    Math.max(0, Math.min(ds.capOf(it), (coreIn[it] || 0) / Math.max(1, tapN[it] || 1)));

  let supply: Record<string, number>[] = nodes.map(() => ({}));
  let pf = 1;
  let gen = 0;
  let genOnly = 0;
  let cons = 0;

  for (let it = 0; it < ACHIEVED_ITERS; it++) {
    const avail: Record<string, number>[] = meta.map((m, i) => {
      const o: Record<string, number> = {};
      if (m.f.kind === 'logistics') Object.assign(o, supply[i]);
      else if (m.f.tap) {
        if (m.n.item) o[m.n.item] = tapRate(m.n.item);
      } else for (const x of m.outR) o[x.item] = x.rate * ach[i]!;
      return o;
    });

    /* 同じ出口から出る複数のラインへは、需要に応じて配分する。
       分流器は片側が詰まればもう片側へ流すので、単純な等分にはならない */
    const inflow: Record<string, number>[] = nodes.map(() => ({}));
    const wsum = new Map<string, number>();
    for (const e of belts) {
      if (!e.item) {
        e.w = 0;
        continue;
      }
      e.w = Math.min(ds.capOf(e.item), needOf(e.z, e.item, 0) / (inCnt.get(key(e.z, e.item)) || 1));
      const k = key(e.a, e.item);
      wsum.set(k, (wsum.get(k) || 0) + e.w);
    }
    for (const e of belts) {
      if (!e.item) {
        e.flow = 0;
        continue;
      }
      const k = key(e.a, e.item);
      const tot = wsum.get(k) || 0;
      const avl = avail[e.a]![e.item] || 0;
      const share = tot > 0 ? (avl * e.w) / tot : 0;
      e.flow = Math.max(0, Math.min(ds.capOf(e.item), share, e.w));
      inflow[e.z]![e.item] = (inflow[e.z]![e.item] || 0) + e.flow;
    }
    supply = inflow;

    /* 倉庫の入りを更新：採取ゾーン＋このエリアの搬入口に届いた分 */
    const ci: Record<string, number> = { ...fieldRate };
    for (const e of belts) if (e.item && meta[e.z]!.f.kind === 'sink') ci[e.item] = (ci[e.item] || 0) + e.flow;
    coreIn = ci;

    const tgt = meta.map((m, i) => {
      if (m.f.kind === 'sink' || m.f.kind === 'logistics' || m.f.tap) return 1;
      if (!m.r) return 0;
      let r = m.f.kind === 'generator' ? 1 : des[i]!;
      for (const x of m.inR) if (x.rate > 0) r = Math.min(r, (supply[i]![x.item] || 0) / x.rate);
      return Math.max(0, Math.min(1, r));
    });

    cons = 0;
    genOnly = 0;
    meta.forEach((m, i) => {
      // 消費電力は稼働率に関係なく常にかかる（待機中でも電気は食う）
      cons += m.f.power || 0;
      if (m.f.kind === 'generator') genOnly += (m.f.gen || 0) * ach[i]!;
    });
    gen = base + genOnly;
    pf = cons > 0 ? Math.min(1, gen / cons) : 1;

    /* 反復中は電力を満たしている前提で流れを収束させる。
       ここで毎回 pf を掛けると、上流から下流へ段ごとに pf が累乗され
       （3段で pf³）、実際より何倍も低い稼働率になってしまう。
       充足率55%の系で最終工程が1%と出ていたのがこれ。 */
    for (let i = 0; i < N; i++) {
      ach[i]! += ACHIEVED_RELAX * (tgt[i]! - ach[i]!);
      if (ach[i]! < 1e-6) ach[i] = 0;
    }
  }

  /* 電力の充足率は、収束したあとに全体へ一度だけ効かせる。
     ゲームでは電力が足りないと全設備が止まるので、
     これは「全体がこの割合まで落ちる」目安。 */
  if (pf < 1) {
    for (let i = 0; i < N; i++) if (meta[i]!.f.kind !== 'generator') ach[i]! *= pf;
    for (const e of belts) e.flow *= pf;
    supply = supply.map((o) => {
      const r2: Record<string, number> = {};
      for (const k of Object.keys(o)) r2[k] = o[k]! * pf;
      return r2;
    });
    for (const k of Object.keys(coreIn)) coreIn[k]! *= pf;
  }

  /* ── 結果 ── */
  const ratio: Record<string, number> = {};
  const desOut: Record<string, number> = {};
  const beltFlow: Record<string, number> = {};
  nodes.forEach((n, i) => {
    ratio[n.uid] = ach[i]!;
    desOut[n.uid] = des[i]!;
  });
  for (const e of belts) beltFlow[e.uid] = e.flow;

  /* 倉庫（協約核心）の収支：採取ゾーンからの転送＋工業からの搬入 − 取出口の引き出し */
  const core: Record<string, CoreRow> = {};
  const ctouch = (id: string): CoreRow =>
    (core[id] ??= { id, field: fieldRate[id] || 0, other: 0, ship: 0, draw: 0, net: 0 });
  for (const id of Object.keys(fieldRate)) ctouch(id);
  for (const e of belts) {
    if (!e.item) continue;
    if (meta[e.z]!.f.kind === 'sink') ctouch(e.item).ship += e.flow;
    if (meta[e.a]!.f.tap) ctouch(e.item).draw += e.flow;
  }
  for (const c of Object.values(core)) {
    c.net = c.field + c.ship - c.draw;
    c.other = fromOther[c.id] || 0;
  }
  /* このエリアの純増。同じ地域の他エリアを計算するとき倉庫の入りとして使う */
  const net: Record<string, number> = {};
  for (const c of Object.values(core)) {
    const v = (c.ship || 0) - (c.draw || 0);
    if (Math.abs(v) > 1e-6) net[c.id] = v;
  }

  const bal: Record<string, BalanceRow> = {};
  const touch = (id: string): BalanceRow => (bal[id] ??= { id, make: 0, use: 0, ship: 0 });
  meta.forEach((m, i) => {
    if (m.f.kind === 'logistics' || !m.r) return;
    for (const x of m.outR) touch(x.item).make += x.rate * ach[i]!;
    for (const x of m.inR) touch(x.item).use += x.rate * ach[i]!;
  });
  for (const e of belts) if (meta[e.z]!.f.kind === 'sink' && e.item) touch(e.item).ship += e.flow;

  const diag = diagnose({
    ds,
    board,
    meta,
    belts,
    ach,
    des,
    supply,
    outCnt,
    key,
    gen,
    cons,
    pf,
    core,
    fieldRate,
    genRec: input.genRec,
    area: input.area ?? areas[cur],
    field: input.field ?? areas[cur]?.field ?? [],
  });

  return {
    ratio,
    des: desOut,
    belt: beltFlow,
    gen,
    genOnly,
    base,
    cons,
    pf,
    balance: Object.values(bal),
    core,
    field: fieldRate,
    net,
    diag,
  };
}

/* ═══════════════════════════════════════════════════════════
   診断。ソルバーの数値から「どこが詰まっているか」を言葉にする。
   UI は行をクリックして該当箇所へ飛べるよう uid / belt を持たせる。
   ═══════════════════════════════════════════════════════════ */

interface DiagInput {
  ds: Dataset;
  board: Board;
  meta: Meta[];
  belts: Edge[];
  ach: number[];
  des: number[];
  supply: Record<string, number>[];
  outCnt: Map<string, number>;
  key: (i: number, it: string | null) => string;
  gen: number;
  cons: number;
  pf: number;
  core: Record<string, CoreRow>;
  fieldRate: Record<string, number>;
  genRec?: string | null;
  area?: Area;
  field: readonly FieldEntry[];
}

function diagnose(d: DiagInput): Diag[] {
  const { ds, board, meta, belts, ach, des, supply, outCnt, key, gen, cons, pf, core, fieldRate } = d;
  const dg: Diag[] = [];
  const itemName = (id: string): string => ds.itemName(id);

  const powerBad = cons > 0 && gen < cons;
  if (powerBad)
    dg.push({
      lv: 'err',
      t: `電力不足：供給 ${fmt(gen)} に対し消費 ${fmt(cons)}（充足率 ${Math.round(pf * 100)}%）。ゲームでは全設備が停止します。以下の稼働率はすべてこの停電の影響を受けています。`,
    });
  else if (cons > 0 && gen > 0 && gen < cons * 1.15)
    dg.push({ lv: 'wrn', t: `電力の余裕が ${Math.round((gen / cons - 1) * 100)}% しかありません。設備を足すと落ちます。` });

  board.nodes.forEach((n, i) => {
    const m = meta[i]!;
    const nm = (m.f.name || '?') + ' #' + n.uid.slice(1);
    if (m.f.kind === 'logistics' || m.f.kind === 'sink') return;
    if (!m.r) {
      dg.push({ lv: 'wrn', t: `${nm}：${m.f.tap ? '引き出す品目' : 'レシピ'}が未設定です。`, uid: n.uid });
      return;
    }
    // 出口にラインが無い品目 ＝ 在庫が満杯になって止まる
    const blocked = m.outR.filter((x) => !(outCnt.get(key(i, x.item)) || 0));
    if (ach[i]! >= 0.995 && !blocked.length) return;
    if (powerBad && !blocked.length) return; // 停電の巻き添えは個別に言わない
    const lack = m.inR.filter((x) => x.rate > 0 && (supply[i]![x.item] || 0) < x.rate * des[i]! * 0.995);
    if (blocked.length)
      dg.push({
        lv: 'err',
        t: `${nm}：${blocked.map((x) => itemName(x.item)).join('・')} の出口にラインがなく停止しています。`,
        uid: n.uid,
      });
    else if (lack.length)
      dg.push({
        lv: 'wrn',
        t: `${nm}：${lack.map((x) => itemName(x.item)).join('・')} が足りず稼働率 ${Math.round(ach[i]! * 100)}%。`,
        uid: n.uid,
      });
    else if (des[i]! < 0.995)
      dg.push({ lv: 'inf', t: `${nm}：下流の需要が ${Math.round(des[i]! * 100)}% しかなく、設備が余っています。`, uid: n.uid });
    else dg.push({ lv: 'wrn', t: `${nm}：出口が詰まり稼働率 ${Math.round(ach[i]! * 100)}%。`, uid: n.uid });
  });

  /* 発電機の燃料は倉庫から引く。生産ツリーに混ぜていないぶん、
     ここで「倉庫に燃料が入っているか」を明示的に見る必要がある */
  const gr = ds.generatorRec(d.genRec);
  const fuel = gr?.in?.[0]?.item ?? null;
  const nGen = meta.filter((m) => m.f.kind === 'generator').length;
  if (fuel && nGen > 0 && gr) {
    const have = (fieldRate[fuel] || 0) + (core[fuel]?.ship || 0);
    const need = nGen * ((gr.in[0]!.qty * 60) / gr.sec);
    if (have < need - 0.01)
      dg.push({
        lv: 'err',
        t: `発電機の燃料が足りません：${itemName(fuel)}が毎分 ${fmt(need)} 必要ですが、倉庫に入るのは ${fmt(have)} です。燃料を作るラインを別に用意するか、採取ゾーン／他エリアからの供給を確認してください。`,
      });
  }

  /* 取出口が引きたい量に対して倉庫の供給が足りているか */
  const wantDraw: Record<string, number> = {};
  for (const e of belts) if (e.item && meta[e.a]!.f.tap) wantDraw[e.item] = (wantDraw[e.item] || 0) + (e.w || 0);
  for (const id of Object.keys(wantDraw)) {
    const have = (fieldRate[id] || 0) + (core[id]?.ship || 0);
    if (wantDraw[id]! > have + 0.01)
      dg.push({
        lv: 'err',
        t: `${itemName(id)}の供給不足：工業側が毎分 ${fmt(wantDraw[id]!)} 引き出したいのに、倉庫へ入るのは ${fmt(have)}（採取ゾーン ${fmt(fieldRate[id] || 0)}）。採取設備を増やすか目標を下げてください。`,
        field: true,
      });
  }
  for (const c of Object.values(core)) {
    if (c.draw > 0.01 && c.net < -0.01)
      dg.push({
        lv: 'err',
        t: `倉庫の${itemName(c.id)}が毎分 ${fmt(-c.net)} 足りません。採取ゾーンの設備を増やすか、引き出し量を減らしてください（採取 ${fmt(c.field)}＋搬入 ${fmt(c.ship)} に対し取出 ${fmt(c.draw)}）。`,
      });
  }

  const cross = crossings(board).length;
  if (cross > 0)
    dg.push({
      lv: 'inf',
      t: `ラインの交差が ${cross} 箇所あります。ここにはベルトブリッジ／パイプブリッジ（または地下配管）が要ります。`,
    });

  for (const e of belts) {
    const belt = board.belts.find((b) => b.uid === e.uid)!;
    if (!e.item) {
      dg.push({ lv: 'wrn', t: `ライン #${e.uid.slice(1)}：運ぶ品目が決まっていません（両端のレシピを確認）。`, belt: e.uid });
      continue;
    }
    const ph = ds.phaseOf(e.item);
    const fa = meta[e.a]!.f;
    const fz = meta[e.z]!.f;
    // 固体はベルト用、液体・ガスはパイプ用。取り違えると繋がらない
    const wrongFluid =
      ph !== 'solid' &&
      ((fa.kind === 'logistics' && fa.phase !== 'fluid') || (fz.kind === 'logistics' && fz.phase !== 'fluid'));
    const wrongSolid =
      ph === 'solid' &&
      ((fa.kind === 'logistics' && fa.phase === 'fluid') || (fz.kind === 'logistics' && fz.phase === 'fluid'));
    if (wrongFluid)
      dg.push({
        lv: 'err',
        t: `#${e.uid.slice(1)}：${itemName(e.item)} は${ph === 'gas' ? 'ガス' : '液体'}なのでパイプ用の分流器・合流器が必要です。`,
        belt: e.uid,
      });
    if (wrongSolid)
      dg.push({
        lv: 'err',
        t: `#${e.uid.slice(1)}：${itemName(e.item)} は固体なのでベルト用の分流器・合流器を使ってください。`,
        belt: e.uid,
      });
    const ma = meta[e.a]!;
    const mz = meta[e.z]!;
    if (ma.f.kind !== 'logistics' && !ma.outR.some((x) => x.item === e.item))
      dg.push({ lv: 'err', t: `ベルト #${e.uid.slice(1)}：${ma.f.name} は ${itemName(e.item)} を出力しません。` });
    else if (mz.f.kind === 'process' || mz.f.kind === 'generator') {
      if (!mz.inR.some((x) => x.item === e.item))
        dg.push({ lv: 'err', t: `ベルト #${e.uid.slice(1)}：${mz.f.name} は ${itemName(e.item)} を受け取りません。` });
    }
    if (e.flow >= ds.capOf(e.item) - 0.05)
      dg.push({
        lv: 'inf',
        t: `${ds.lineName(e.item)} #${e.uid.slice(1)}（${itemName(e.item)}）が上限 ${ds.capOf(e.item)}個/分 に到達。増やすなら2本目が必要です。`,
        belt: e.uid,
      });
    void belt;
  }

  /* 協約容量。工業エリア内の設備はほとんど消費せず、
     フィールドの採取機やタンク・散布機の類が消費する */
  const ar = d.area;
  if (ar && ar.cap > 0) {
    let used = 0;
    for (const f of d.field) used += (f.count || 0) * capCostOf(ds.fac(f.fac));
    for (const n of board.nodes) used += capCostOf(ds.fac(n.fac));
    if (used > ar.cap)
      dg.push({
        lv: 'err',
        t: `${ar.name}の協約容量を超えています（使用 ${used} / 上限 ${ar.cap}）。採取機やタンクを減らすか、地域建設レベルを上げてください。`,
      });
    else if (used > ar.cap * 0.9)
      dg.push({ lv: 'wrn', t: `${ar.name}の協約容量の残りが ${ar.cap - used} です（使用 ${used} / ${ar.cap}）。` });
  }

  const facCount: Record<string, number> = {};
  for (const n of board.nodes) facCount[n.fac] = (facCount[n.fac] || 0) + 1;
  for (const fid of Object.keys(facCount)) {
    const f = ds.fac(fid);
    if (f && (f.max ?? 0) > 0 && facCount[fid]! > f.max!)
      dg.push({ lv: 'err', t: `${f.name} が ${facCount[fid]} 台あります（設置上限 ${f.max} 台）。` });
  }
  for (const n of board.nodes) {
    const f = ds.fac(n.fac);
    if (!f || f.kind !== 'logistics') continue;
    const c = board.belts.filter((b) => b.from === n.uid).length;
    if (c > SPLIT_MAX)
      dg.push({ lv: 'err', t: `${f.name} #${n.uid.slice(1)}：出力が ${c} 本ありますが上限は ${SPLIT_MAX} 本です。`, uid: n.uid });
  }

  return dg;
}

/**
 * 盤面そのものの整合性（ソルバーとは別の、構造の点検）。
 * 参照実装の inspectBoard。設備の重なり・1つの口への二重接続・行き先を失ったライン。
 */
export function inspectBoard(ds: Dataset, board: Board): Diag[] {
  const out: Diag[] = [];
  const occ = new Map<string, string>();
  for (const n of board.nodes) {
    for (const c of cellsOf(ds, n)) {
      const k = cellKey(c.x, c.y);
      if (occ.has(k)) out.push({ lv: 'err', t: `設備が重なっています（${c.x},${c.y}）。`, uid: n.uid });
      occ.set(k, n.uid);
    }
  }
  for (const b of board.belts) {
    for (const c of b.cells || []) {
      if (occ.has(cellKey(c.x, c.y)))
        out.push({ lv: 'err', t: `ラインが設備と重なっています（${c.x},${c.y}）。`, belt: b.uid });
    }
  }
  const seen = new Set<string>();
  for (const b of board.belts) {
    for (const [u, pi] of [
      [b.from, b.fromPort],
      [b.to, b.toPort],
    ] as [string, number][]) {
      if (u == null || pi == null) continue;
      const k = u + '/' + pi;
      if (seen.has(k)) out.push({ lv: 'err', t: '1つの口に2本のラインが繋がっています。', belt: b.uid });
      seen.add(k);
    }
    if (!board.nodes.some((n) => n.uid === b.from) || !board.nodes.some((n) => n.uid === b.to))
      out.push({ lv: 'err', t: '行き先を失ったラインが残っています。', belt: b.uid });
  }
  return out;
}

/** 検証目標に対する達成度 */
export function goalStatus(
  res: SolveResult,
  goal: { item: string; rate: number } | null | undefined,
): { item: string; rate: number; got: number; ratio: number } | null {
  if (!goal || !goal.item || !(goal.rate > 0)) return null;
  const got = res.core[goal.item]?.ship ?? 0;
  return { item: goal.item, rate: goal.rate, got, ratio: goal.rate > 0 ? got / goal.rate : 0 };
}
