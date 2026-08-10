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
  const body = js.slice(start, end) + '\n' + js.slice(pickStart, pickEnd);

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
      setPipeCap: function(v){ PIPE_CAP = v; }
    };
  `;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  cached = new Function(src)() as ReferenceApi;
  return cached;
}
