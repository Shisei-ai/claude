/**
 * §6-3 の単体テスト（ソルバー）。
 *
 * HANDOFF §5-1 が「守るべき性質」として挙げているものを、そのままテストにしてある。
 * どれも実際にバグを踏んで直した箇所なので、ここが赤くなったら移植が壊れている。
 * あわせて参照実装との差分テストを回す。
 */

import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { buildDataset } from '../src/domain/dataset';
import { boardOf, type Board } from '../src/domain/geometry';
import { connectNodes } from '../src/domain/routing';
import { solve, type SolveResult } from '../src/domain/solver';
import type { Belt, FieldEntry, Node, Rot, Save } from '../src/domain/types';
import { loadReference } from './helpers/reference';

const near = (a: number, b: number, eps = 1e-6): void => expect(Math.abs(a - b)).toBeLessThan(eps);

/** テスト用の小さな盤面組み立て */
class Scene {
  readonly data: Save = seed();
  readonly ds = buildDataset(this.data);
  readonly board: Board = boardOf(40, 24, [], []);
  private seq = 0;

  add(fac: string, x: number, y: number, opts: { rec?: string; item?: string; rot?: Rot } = {}): Node {
    const n: Node = {
      uid: 'u' + ++this.seq,
      fac,
      x,
      y,
      rot: opts.rot ?? 0,
      rec: opts.rec ?? null,
      item: opts.item ?? null,
    };
    this.board.nodes.push(n);
    return n;
  }
  link(a: Node, z: Node, item?: string | null): Belt {
    const r = connectNodes(this.ds, this.board, a, z, item);
    if (!r.ok) throw new Error(`配線できません: ${a.fac} → ${z.fac} (${r.reason})`);
    return r.belt;
  }
  solve(opts: { cur?: number; basePower?: number; field?: FieldEntry[]; genRec?: string } = {}): SolveResult {
    return solve({
      ds: this.ds,
      board: this.board,
      areas: this.data.areas,
      cur: opts.cur ?? 0,
      basePower: opts.basePower ?? 240,
      ...(opts.field ? { field: opts.field } : {}),
      ...(opts.genRec ? { genRec: opts.genRec } : {}),
    });
  }
  /** 同じ状態を参照実装に渡して解かせる */
  solveRef(opts: { cur?: number; basePower?: number; field?: FieldEntry[]; genRec?: string } = {}): unknown {
    const ref = loadReference();
    return ref.solveWith({
      areas: structuredClone(this.data.areas) as unknown[],
      cur: opts.cur ?? 0,
      nodes: structuredClone(this.board.nodes),
      belts: structuredClone(this.board.belts),
      field: opts.field ? structuredClone(opts.field) : undefined,
      basePower: opts.basePower ?? 240,
      genRec: opts.genRec ?? null,
      w: this.board.w,
      h: this.board.h,
      items: structuredClone(this.data.items) as unknown[],
      facs: structuredClone(this.data.facs) as unknown[],
      recs: structuredClone(this.data.recs) as unknown[],
    });
  }
}

describe('基本の流れ', () => {
  it('倉庫搬出口 → 精錬炉 → 倉庫搬入口 が 100% 稼働する', () => {
    // 中枢エリアの採取ゾーンは 源石鉱物 4台×15 = 60個/分
    const s = new Scene();
    const tap = s.add('wh_out', 2, 5, { item: 'ore_gen' });
    const sm = s.add('smelt', 8, 5, { rec: 'r_shell' }); // 源石鉱物*3 → 結晶外殻*1 / 6秒
    const sink = s.add('wh_in', 14, 5);
    s.link(tap, sm, 'ore_gen');
    s.link(sm, sink, 'shell');
    const r = s.solve();

    near(r.ratio[sm.uid]!, 1);
    near(r.belt[s.board.belts[0]!.uid]!, 30); // 搬出口はベルト上限まで引ける
    near(r.core['shell']!.ship, 10); // 10周期/分 × 1個
    near(r.core['ore_gen']!.draw, 30);
    near(r.core['ore_gen']!.net, 30); // 採取60 − 引き出し30
    expect(r.pf).toBe(1);
  });

  it('出口にラインが無い設備は停止する（在庫が満杯になる）', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 2, 5, { item: 'ore_gen' });
    const sm = s.add('smelt', 8, 5, { rec: 'r_shell' });
    s.link(tap, sm, 'ore_gen');
    const r = s.solve();
    expect(r.ratio[sm.uid]).toBe(0);
    expect(r.des[sm.uid]).toBe(0);
    expect(r.diag.some((d) => d.lv === 'err' && d.t.includes('出口にラインがなく停止'))).toBe(true);
  });

  it('倉庫搬出口の供給は「倉庫への入り ÷ 搬出口の数」で頭割りになる', () => {
    const s = new Scene();
    // 紫晶鉱物の採取は 鉱山エリア（index 4）の 2台×15 = 30個/分 だけ
    const t1 = s.add('wh_out', 2, 3, { item: 'ore_pur' });
    const t2 = s.add('wh_out', 2, 9, { item: 'ore_pur' });
    const m1 = s.add('mold', 8, 3, { rec: 'r_bot_pur' });
    const m2 = s.add('mold', 8, 9, { rec: 'r_bot_pur' });
    const sink = s.add('wh_in', 16, 6);
    s.link(t1, m1, 'ore_pur');
    s.link(t2, m2, 'ore_pur');
    s.link(m1, sink, 'bot_pur');
    s.link(m2, sink, 'bot_pur');
    const r = s.solve({ cur: 4 });
    // 30個/分 を2つの搬出口で割って各15
    near(r.belt[s.board.belts[0]!.uid]!, 15);
    near(r.belt[s.board.belts[1]!.uid]!, 15);
    near(r.core['ore_pur']!.draw, 30);
  });
});

describe('分配は需要比例（分流器には背圧がある）', () => {
  it('同じ出口から出る2本へ、需要の比で配分される', () => {
    /* 分流器を挟んで、必要量の違う2つの設備へ分ける。
       成形機 20個/分、粉砕機 30個/分 を要求するので、
       等分（15/15）ではなく 12/18 になるのが正しい。 */
    const s = new Scene();
    const tap = s.add('wh_out', 2, 6, { item: 'ore_blue' }); // 中枢エリアは青鉄 60個/分
    const sp = s.add('split', 6, 6);
    const mold = s.add('mold', 12, 2, { rec: 'r_bot_blue' }); // 青鉄*2 / 6秒 = 20個/分
    const crush = s.add('crush', 12, 10, { rec: 'r_pw_ore' }); // 青鉄*2 / 4秒 = 30個/分
    const sink = s.add('wh_in', 20, 6);
    const bTap = s.link(tap, sp, 'ore_blue');
    const bMold = s.link(sp, mold, 'ore_blue');
    const bCrush = s.link(sp, crush, 'ore_blue');
    s.link(mold, sink, 'bot_blue');
    s.link(crush, sink, 'pw_ore');

    const r = s.solve();
    near(r.belt[bTap.uid]!, 30); // ベルト1本の上限まで
    near(r.belt[bMold.uid]!, 12); // 30 × 20/50
    near(r.belt[bCrush.uid]!, 18); // 30 × 30/50
    expect(r.belt[bMold.uid]).not.toBeCloseTo(15, 5); // 等分ではない
    near(r.ratio[mold.uid]!, 0.6);
    near(r.ratio[crush.uid]!, 0.6);
  });
});

describe('電力の充足率は収束後に一度だけ掛ける', () => {
  /* HANDOFF §5-1 の「実際に踏んだバグ」。
     反復のたびに掛けると上流から下流へ段ごとに累乗され（3段で pf³）、
     充足率55%の系で最終工程が1%と出ていた。 */
  const buildChain = (): { s: Scene; nodes: Node[] } => {
    const s = new Scene();
    const tap = s.add('wh_out', 1, 6, { item: 'ore_blue' });
    const sm = s.add('smelt', 5, 6, { rec: 'r_ingot' }); // 青鉄*2 → 精錬材 / 4秒
    const assy = s.add('assy', 11, 6, { rec: 'r_part_fe' }); // 精錬材*2 → 鉄製部品 / 6秒
    const sink = s.add('wh_in', 18, 6);
    s.link(tap, sm, 'ore_blue');
    s.link(sm, assy, 'ingot');
    s.link(assy, sink, 'part_fe');
    return { s, nodes: [sm, assy] };
  };

  it('全段が同じ割合で落ちる（段ごとに累乗されない）', () => {
    const full = buildChain();
    const rFull = full.s.solve({ basePower: 240 });
    expect(rFull.pf).toBe(1);

    const low = buildChain();
    // 精錬炉24 + 組立機24 = 48。基礎電力 26.4 で充足率 0.55
    const rLow = low.s.solve({ basePower: 26.4 });
    near(rLow.pf, 0.55, 1e-9);

    for (let i = 0; i < 2; i++) {
      const a = rFull.ratio[full.nodes[i]!.uid]!;
      const b = rLow.ratio[low.nodes[i]!.uid]!;
      near(b, a * 0.55, 1e-6);
    }
    // 3段目にあたる搬入量も同じ割合。pf³ = 0.166 ではない
    near(rLow.core['part_fe']!.ship, rFull.core['part_fe']!.ship * 0.55, 1e-6);
  });

  it('消費電力は稼働率によらず常にかかる', () => {
    // 待機中でも電気は食う。設備を置いた時点で消費が立つ
    const s = new Scene();
    s.add('smelt', 4, 4, { rec: 'r_shell' }); // 繋がっていないので稼働率0
    const r = s.solve();
    expect(r.cons).toBe(24);
    expect(r.ratio[s.board.nodes[0]!.uid]).toBe(0);
  });

  it('電力不足は診断に出る', () => {
    const s = new Scene();
    s.add('tenyu', 4, 4, { rec: 'r_sokuj2' });
    s.add('tenyu', 10, 4, { rec: 'r_sokuj2' });
    const r = s.solve({ basePower: 100 }); // 天有洪炉 80×2 = 160
    expect(r.gen).toBe(100);
    expect(r.cons).toBe(160);
    expect(r.diag[0]!.lv).toBe('err');
    expect(r.diag[0]!.t).toContain('電力不足');
  });
});

describe('発電機の燃料は倉庫から引く', () => {
  it('燃料が倉庫に無ければ診断に出る', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 2, 5, { item: 'batS' });
    const g = s.add('gen', 6, 5, { rec: 'r_gen' });
    s.link(tap, g, 'batS');
    const r = s.solve();
    expect(r.diag.some((d) => d.t.includes('発電機の燃料が足りません'))).toBe(true);
    // 発電機1台につき 60/40 = 1.5個/分
    expect(r.diag.find((d) => d.t.includes('発電機の燃料'))!.t).toContain('1.5');
  });

  it('倉庫に燃料があれば発電する', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 2, 5, { item: 'batS' });
    const g = s.add('gen', 6, 5, { rec: 'r_gen' });
    s.link(tap, g, 'batS');
    /* 採取ゾーンに燃料が入っている状態を作る（他エリアからの搬入と同じ扱い）。
       発電レシピは明示する。既定では設備 'gen' の1件目＝武陵バッテリーになるので、
       谷地バッテリーを焚くつもりなら genRec を指定しないと燃料違いで警告が出る */
    const r = s.solve({ field: [{ fac: 'miner2', item: 'batS', count: 1, rate: 10 }], genRec: 'r_gen' });
    expect(r.diag.some((d) => d.t.includes('発電機の燃料が足りません'))).toBe(false);
    near(r.genOnly, 120);
    near(r.gen, 360);
  });
});

describe('地域の倉庫は共通（エリアをまたぐ）', () => {
  it('他エリアの純増が、このエリアの倉庫の入りになる', () => {
    const s = new Scene();
    // 首礎（index 9, 武陵）が赤銅塊を 40個/分 余らせている、という状態にする
    const shuso = s.data.areas.find((a) => a.id === 'w_shuso')!;
    shuso.net = { ingot_red: 40 };

    // 応龍関（index 13, 武陵）で赤銅塊を引き出す
    const oryu = s.data.areas.findIndex((a) => a.id === 'w_oryu');
    const tap = s.add('wh_out', 2, 5, { item: 'ingot_red' });
    const assy = s.add('assy', 8, 5, { rec: 'r_part_red' }); // 赤銅塊*4 / 8秒 = 30個/分
    const sink = s.add('wh_in', 14, 5);
    s.link(tap, assy, 'ingot_red');
    s.link(assy, sink, 'part_red');

    const r = s.solve({ cur: oryu });
    expect(r.field['ingot_red']).toBe(40);
    expect(r.core['ingot_red']!.other).toBe(40);
    near(r.belt[s.board.belts[0]!.uid]!, 30); // ベルト上限が効く
    near(r.ratio[assy.uid]!, 1);
    // このエリアの純増を返す（呼び出し側が area.net へ書き戻す）
    near(r.net['part_red']!, 7.5);
    near(r.net['ingot_red']!, -30);
  });

  it('別の地域の採取ゾーンは混ざらない', () => {
    const s = new Scene();
    // 中枢エリア（四号谷地）で計算しても、武陵の赤銅は倉庫に入らない
    const r = s.solve({ cur: 0 });
    expect(r.field['ore_red']).toBeUndefined();
    expect(r.field['ore_gen']).toBe(60); // 中枢の4台×15
    // 武陵城で計算すれば武陵の採取量が見える
    const jo = s.data.areas.findIndex((a) => a.id === 'w_jo');
    const r2 = s.solve({ cur: jo });
    expect(r2.field['ore_red']).toBe(240 + 120); // 武陵城240 + 首礎120
    expect(r2.field['ore_gen']).toBe(540);
  });
});

describe('参照実装との差分テスト', () => {
  const compare = (mine: SolveResult, want: unknown): void => {
    const w = want as SolveResult;
    for (const k of Object.keys(mine.ratio)) near(mine.ratio[k]!, w.ratio[k]!, 1e-9);
    for (const k of Object.keys(mine.belt)) near(mine.belt[k]!, w.belt[k]!, 1e-9);
    near(mine.gen, w.gen, 1e-9);
    near(mine.cons, w.cons, 1e-9);
    near(mine.pf, w.pf, 1e-12);
    expect(Object.keys(mine.core).sort()).toEqual(Object.keys(w.core).sort());
    for (const k of Object.keys(mine.core)) {
      near(mine.core[k]!.ship, w.core[k]!.ship, 1e-9);
      near(mine.core[k]!.draw, w.core[k]!.draw, 1e-9);
      near(mine.core[k]!.net, w.core[k]!.net, 1e-9);
    }
    expect(mine.diag.map((d) => d.lv + '|' + d.t)).toEqual(w.diag.map((d) => d.lv + '|' + d.t));
  };

  it('基本の直列ラインが一致する', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 2, 5, { item: 'ore_gen' });
    const sm = s.add('smelt', 8, 5, { rec: 'r_shell' });
    const sink = s.add('wh_in', 14, 5);
    s.link(tap, sm, 'ore_gen');
    s.link(sm, sink, 'shell');
    compare(s.solve(), s.solveRef());
  });

  it('分流器を挟んだ需要比例の配分が一致する', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 2, 6, { item: 'ore_blue' });
    const sp = s.add('split', 6, 6);
    const mold = s.add('mold', 12, 2, { rec: 'r_bot_blue' });
    const crush = s.add('crush', 12, 10, { rec: 'r_pw_ore' });
    const sink = s.add('wh_in', 20, 6);
    s.link(tap, sp, 'ore_blue');
    s.link(sp, mold, 'ore_blue');
    s.link(sp, crush, 'ore_blue');
    s.link(mold, sink, 'bot_blue');
    s.link(crush, sink, 'pw_ore');
    compare(s.solve(), s.solveRef());
  });

  it('電力不足の系が一致する', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 1, 6, { item: 'ore_blue' });
    const sm = s.add('smelt', 5, 6, { rec: 'r_ingot' });
    const assy = s.add('assy', 11, 6, { rec: 'r_part_fe' });
    const sink = s.add('wh_in', 18, 6);
    s.link(tap, sm, 'ore_blue');
    s.link(sm, assy, 'ingot');
    s.link(assy, sink, 'part_fe');
    compare(s.solve({ basePower: 26.4 }), s.solveRef({ basePower: 26.4 }));
  });

  it('発電機つきの系が一致する', () => {
    const s = new Scene();
    const tap = s.add('wh_out', 2, 3, { item: 'batS' });
    const g = s.add('gen', 6, 3, { rec: 'r_gen' });
    const tap2 = s.add('wh_out', 2, 9, { item: 'ore_gen' });
    const sm = s.add('smelt', 8, 9, { rec: 'r_shell' });
    const sink = s.add('wh_in', 16, 9);
    s.link(tap, g, 'batS');
    s.link(tap2, sm, 'ore_gen');
    s.link(sm, sink, 'shell');
    const field: FieldEntry[] = [{ fac: 'miner2', item: 'batS', count: 1, rate: 10 }];
    compare(s.solve({ field }), s.solveRef({ field }));
  });

  it('副産物つき・液体まじりの系が一致する（武陵の赤銅塊）', () => {
    const s = new Scene();
    const jo = seed().areas.findIndex((a) => a.id === 'w_jo');
    const tOre = s.add('wh_out', 2, 3, { item: 'ore_red' });
    const tWat = s.add('wh_out', 2, 9, { item: 'water' });
    const sm = s.add('smelt', 8, 5, { rec: 'r_ingot_red' }); // 赤銅鉱石+水 → 赤銅塊+汚水
    const sink = s.add('wh_in', 16, 4);
    const tank = s.add('tank', 16, 9); // 汚水の捨て先
    s.link(tOre, sm, 'ore_red');
    s.link(tWat, sm, 'water');
    s.link(sm, sink, 'ingot_red');
    s.link(sm, tank, 'waste');
    compare(s.solve({ cur: jo }), s.solveRef({ cur: jo }));
  });

  it('エリアをまたぐ倉庫の合算が一致する', () => {
    const s = new Scene();
    s.data.areas.find((a) => a.id === 'w_shuso')!.net = { ingot_red: 40 };
    const oryu = s.data.areas.findIndex((a) => a.id === 'w_oryu');
    const tap = s.add('wh_out', 2, 5, { item: 'ingot_red' });
    const assy = s.add('assy', 8, 5, { rec: 'r_part_red' });
    const sink = s.add('wh_in', 14, 5);
    s.link(tap, assy, 'ingot_red');
    s.link(assy, sink, 'part_red');
    compare(s.solve({ cur: oryu }), s.solveRef({ cur: oryu }));
  });
});

describe('参照実装との差分テスト（ランダム盤面）', () => {
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

  /** レシピ付きで置ける設備と、取出口・搬入口・物流・発電を混ぜる */
  const POOL = [
    { fac: 'wh_out', item: 'ore_gen' },
    { fac: 'wh_out', item: 'ore_blue' },
    { fac: 'wh_out', item: 'water' },
    { fac: 'wh_in' },
    { fac: 'box' },
    { fac: 'tank' },
    { fac: 'split' },
    { fac: 'merge' },
    { fac: 'psplit' },
    { fac: 'gen', rec: 'r_gen' },
    { fac: 'smelt', rec: 'r_shell' },
    { fac: 'smelt', rec: 'r_ingot' },
    { fac: 'smelt', rec: 'r_ingot_red' },
    { fac: 'crush', rec: 'r_pw_ore' },
    { fac: 'mold', rec: 'r_bot_blue' },
    { fac: 'assy', rec: 'r_part_fe' },
    { fac: 'pack', rec: 'r_batS' },
    { fac: 'tenyu', rec: 'r_sokuj2' },
  ];

  it('ランダムな盤面 40 通りで、稼働率・流量・電力・倉庫収支・診断が一致する', () => {
    let boardsCompared = 0;
    let nodesCompared = 0;

    for (let seedN = 1; seedN <= 40; seedN++) {
      const rand = rng(seedN * 104729);
      const s = new Scene();
      const W = 30;
      const H = 20;
      const occupied = new Set<string>();

      const want = 5 + Math.floor(rand() * 8);
      for (let attempt = 0; attempt < 120 && s.board.nodes.length < want; attempt++) {
        const pick = POOL[Math.floor(rand() * POOL.length)]!;
        const f = s.ds.fac(pick.fac)!;
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
        s.add(pick.fac, x, y, { rot, ...(pick.rec ? { rec: pick.rec } : {}), ...(pick.item ? { item: pick.item } : {}) });
      }
      if (s.board.nodes.length < 2) continue;

      // ランダムに繋ぐ。品目は推定に任せる（pickItemFor もまとめて突き合わせる）
      for (let step = 0; step < 14; step++) {
        const a = s.board.nodes[Math.floor(rand() * s.board.nodes.length)]!;
        const z = s.board.nodes[Math.floor(rand() * s.board.nodes.length)]!;
        if (a === z) continue;
        connectNodes(s.ds, s.board, a, z);
      }

      const cur = Math.floor(rand() * s.data.areas.length);
      const basePower = [0, 60, 240, 1000][Math.floor(rand() * 4)]!;
      const mine = s.solve({ cur, basePower });
      const ref = s.solveRef({ cur, basePower }) as SolveResult;

      const label = `seed=${seedN} nodes=${s.board.nodes.length} belts=${s.board.belts.length} cur=${cur} base=${basePower}`;
      for (const n of s.board.nodes) {
        near(mine.ratio[n.uid]!, ref.ratio[n.uid]!, 1e-9);
        near(mine.des[n.uid]!, ref.des[n.uid]!, 1e-9);
        nodesCompared++;
      }
      for (const b of s.board.belts) near(mine.belt[b.uid]!, ref.belt[b.uid]!, 1e-9);
      near(mine.gen, ref.gen, 1e-9);
      near(mine.cons, ref.cons, 1e-9);
      near(mine.pf, ref.pf, 1e-12);
      expect(Object.keys(mine.core).sort(), label).toEqual(Object.keys(ref.core).sort());
      for (const k of Object.keys(mine.core)) {
        near(mine.core[k]!.ship, ref.core[k]!.ship, 1e-9);
        near(mine.core[k]!.draw, ref.core[k]!.draw, 1e-9);
        near(mine.core[k]!.net, ref.core[k]!.net, 1e-9);
      }
      // 診断は文言も並び順も一致すること（UI がこの順で出す）
      expect(mine.diag.map((x) => x.lv + '|' + x.t), label).toEqual(ref.diag.map((x) => x.lv + '|' + x.t));
      boardsCompared++;
    }

    expect(boardsCompared).toBeGreaterThan(30);
    expect(nodesCompared).toBeGreaterThan(250);
  });
});

describe('構造の点検（ソルバーとは別）', () => {
  it('設備の重なりと行き先を失ったラインを見つける', async () => {
    const { inspectBoard } = await import('../src/domain/solver');
    const s = new Scene();
    const a = s.add('smelt', 4, 4, { rec: 'r_shell' });
    s.add('smelt', 5, 5, { rec: 'r_shell' }); // 重なる
    s.board.belts.push({ uid: 'bz', from: a.uid, fromPort: 0, to: 'missing', toPort: 0, cells: [], item: null });
    const out = inspectBoard(s.ds, s.board);
    expect(out.some((d) => d.t.includes('設備が重なっています'))).toBe(true);
    expect(out.some((d) => d.t.includes('行き先を失ったライン'))).toBe(true);
  });
});
