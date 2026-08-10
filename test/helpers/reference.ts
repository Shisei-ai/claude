/**
 * 参照実装を「動く仕様書」としてテストから直接呼ぶための足場。
 *
 * reference/aic-planner.html の §0〜§2（定数・初期データ・盤面ヘルパ・ポート幾何・
 * 経路探索）だけを切り出して Node 上で評価する。DOM を触る部分はこの範囲に無いので、
 * 描画側から呼ばれる数個の関数だけスタブを差し込めば動く。
 *
 * これがあると、移植した TypeScript と参照実装へ同じ盤面を与えて
 * 結果を突き合わせられる（差分テスト）。HANDOFF が言う
 * 「挙動が食い違ったら参照実装が正しい」を、目視ではなく機械で担保するための仕組み。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { Belt, Node } from '../../src/domain/types';

export interface RefRoute {
  cells: { x: number; y: number }[];
  cost: number;
}

export interface ReferenceApi {
  /** 盤面を差し替えて索引を作り直す */
  setup(nodes: Node[], belts: Belt[], w: number, h: number): void;
  footprint(n: Node): { w: number; h: number };
  portGeom(n: Node, pi: number): { i: number; t: string; inside: { x: number; y: number }; adj: { x: number; y: number }; dir: number } | null;
  portsOf(facId: string): { t: string; s: number; o: number }[];
  canPlace(n: Node): boolean;
  freePorts(n: Node, t: 'in' | 'out'): { i: number }[];
  portFaces(): Set<string>;
  /** penal を渡さないと口の正面の +5 が効かない点まで参照実装と同じ */
  routePorts(a: Node, pa: number, b: Node, pb: number, penal?: Set<string>): RefRoute | null;
  connectNodes(a: Node, z: Node, item?: string | null): Belt | null;
  belts(): Belt[];
  seed(): unknown;
  setPipeCap(v: number): void;
  solveWith(st: RefSolveState): RefSolveResult;
  planWith(
    st: RefSolveState,
    item: string,
    rate: number,
    choice?: Record<string, string | undefined>,
    opts?: { noPower?: boolean },
  ): RefPlanResult;
  unitOf(st: RefSolveState, item: string, choice?: Record<string, string | undefined>): number | null;
  toFrac(x: number, maxD?: number): [number, number];
}

export interface RefPlanResult {
  rows: { rid: string; fac: string; machines: number; int: number; util: number; area: number; power: number }[];
  raw: Record<string, number>;
  made: Record<string, number>;
  gens: number;
  base: number;
  power: number;
  area: number;
  fracSum: number;
  intSum: number;
  capMax: number;
  diverged: boolean;
  pure: { rid: string; machines: number }[];
  flow: { item: string; rate: number }[];
  ideal: { unit: number; cands: number[] } | null;
}

export interface RefSolveState {
  areas: unknown[];
  cur: number;
  nodes: Node[];
  belts: Belt[];
  field?: unknown[];
  basePower: number;
  genRec?: string | null;
  w: number;
  h: number;
  items?: unknown[];
  facs?: unknown[];
  recs?: unknown[];
}

export interface RefSolveResult {
  ratio: Record<string, number>;
  des: Record<string, number>;
  belt: Record<string, number>;
  gen: number;
  genOnly: number;
  base: number;
  cons: number;
  pf: number;
  balance: { id: string; make: number; use: number; ship: number }[];
  core: Record<string, { id: string; field: number; other: number; ship: number; draw: number; net: number }>;
  field: Record<string, number>;
  diag: { lv: string; t: string; uid?: string; belt?: string }[];
}

let cached: ReferenceApi | null = null;

export function loadReference(): ReferenceApi {
  if (cached) return cached;

  const html = readFileSync(fileURLToPath(new URL('../../reference/aic-planner.html', import.meta.url)), 'utf8');
  const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

  const start = js.indexOf('const BELT_CAP');
  // §3 ソルバーの直前まで。ここから先は描画・UI が混ざる
  const solver = js.indexOf('3. ソルバー');
  const end = js.lastIndexOf('/* ═', solver);
  if (start < 0 || solver < 0 || end < 0) throw new Error('参照実装の切り出しに失敗しました');
  // pickItemFor だけは §5（入力）側に置かれているが、connectNodes から呼ばれるので一緒に連れてくる
  const pickStart = js.indexOf('function pickItemFor(');
  const pickEnd = js.indexOf('function addBelt(', pickStart);
  if (pickStart < 0 || pickEnd < 0) throw new Error('pickItemFor の切り出しに失敗しました');
  // §3 ソルバー本体（末尾の fmt まで）
  const solveStart = js.indexOf('let RES =');
  const solveEnd = js.indexOf('/* ═', js.indexOf('const fmt ='));
  if (solveStart < 0 || solveEnd < 0) throw new Error('ソルバーの切り出しに失敗しました');
  /* §10 の逆算プランナー一式（toFrac 〜 idealTargets）。
     solve() から呼ばれる generatorFac / generatorRec もこの範囲に含まれる */
  const planStart = js.indexOf('function toFrac(');
  const planEnd = js.indexOf('/* ── 盤面メトリクス', planStart);
  if (planStart < 0 || planEnd < 0) throw new Error('プランナーの切り出しに失敗しました');
  // §11 のブロック方式から unitOf だけ
  const unitStart = js.indexOf('function unitOf(');
  const unitEnd = js.indexOf('const LAY_VARIANTS', unitStart);
  if (unitStart < 0 || unitEnd < 0) throw new Error('unitOf の切り出しに失敗しました');

  const body =
    js.slice(start, end) +
    '\n' +
    js.slice(pickStart, pickEnd) +
    '\n' +
    js.slice(solveStart, solveEnd) +
    '\n' +
    js.slice(planStart, planEnd) +
    '\n' +
    js.slice(unitStart, unitEnd);

  const src = `
    "use strict";
    /* 描画側から借りている関数のスタブ。この範囲では実際には呼ばれない */
    function flash(){}
    function beltPoints(){ return []; }
    function w2s(x,y){ return {x:x,y:y}; }
    let sel = null;
    ${body}
    return {
      setup: function(nodes, belts, w, h){
        D.nodes = nodes; D.belts = belts;
        var a = D.areas[D.cur||0];
        if(a){ a.nodes = nodes; a.belts = belts; }
        setBoard(w, h);
        reindex();
      },
      footprint: footprint,
      portGeom: portGeom,
      portsOf: function(facId){ return portsOf(IX.fac[facId]); },
      canPlace: canPlace,
      freePorts: function(n,t){ return freePorts(n,t).map(function(x){ return {i:x.i}; }); },
      portFaces: portFaces,
      routePorts: routePorts,
      connectNodes: function(a,z,item){ return connectNodes(a,z,item,true); },
      belts: function(){ return D.belts; },
      seed: seed,
      setPipeCap: function(v){ PIPE_CAP = v; },
      /* 盤面と地域の状態をまるごと差し替えてソルバーを回す。
         solve() は内部で reindex() を呼ぶので索引の作り直しは要らない */
      solveWith: function(st){
        if(st.items) D.items = st.items;
        if(st.facs)  D.facs  = st.facs;
        if(st.recs)  D.recs  = st.recs;
        D.areas = st.areas; D.cur = st.cur|0;
        D.nodes = st.nodes; D.belts = st.belts;
        /* 参照実装の D.field は「いま開いているエリアの採取ゾーンの実体」。
           loadArea が area.field を代入して同期している。ここでも同じ既定にする */
        D.field = st.field || (D.areas[st.cur|0] && D.areas[st.cur|0].field) || [];
        D.meta.basePower = st.basePower;
        D.meta.genRec = st.genRec || undefined;
        var a = D.areas[D.cur];
        if(a){ a.nodes = st.nodes; a.belts = st.belts; a.field = D.field; }
        setBoard(st.w, st.h);
        solve();
        return RES;
      },
      /* 逆算プランナー。地域とエリアの文脈（採取ゾーン・他エリアの純増）に
         依存するので、盤面と同じように状態を差し替えてから呼ぶ */
      planWith: function(st, item, rate, choice, opts){
        D.areas = st.areas; D.cur = st.cur|0;
        D.nodes = st.nodes || []; D.belts = st.belts || [];
        D.field = st.field || (D.areas[st.cur|0] && D.areas[st.cur|0].field) || [];
        D.meta.basePower = st.basePower;
        D.meta.genRec = st.genRec || undefined;
        reindex();
        var p = buildPlan(item, rate, choice||{}, opts||{});
        return {
          rows: p.rows.map(function(r){
            return {rid:r.rid, fac:r.fac.id, machines:r.machines, int:r.int,
                    util:r.util, area:r.area, power:r.power};
          }),
          raw: p.raw, made: p.made, gens: p.gens, base: p.base,
          power: p.power, area: p.area, fracSum: p.fracSum, intSum: p.intSum,
          capMax: p.capMax, diverged: !!p.diverged,
          pure: p.pure, flow: p.flow,
          ideal: idealTargets(p)
        };
      },
      unitOf: function(st, item, choice){
        D.areas = st.areas; D.cur = st.cur|0;
        D.nodes = st.nodes || []; D.belts = st.belts || [];
        D.field = st.field || (D.areas[st.cur|0] && D.areas[st.cur|0].field) || [];
        D.meta.basePower = st.basePower;
        reindex();
        return unitOf(item, choice||{});
      },
      toFrac: function(x, maxD){ return toFrac(x, maxD); }
    };
  `;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  cached = new Function(src)() as ReferenceApi;
  return cached;
}
