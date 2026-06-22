/* =========================================================================
 * 鋼鉄戦線 - 生産ライン（簡易グリッド・ファクトリー）
 *   設備をタイルに配置し、コンベアで繋いでアイテムを流す。
 *   フロー: 資源入力(鉱区の素材) → 製錬炉(2素材→合金) → 部品工場(合金→部品)
 *           → 組立機(ボディ+ヘッド+ウェポン → ユニット)
 *   電力: 発電機が供給、各設備が消費。供給不足で稼働速度が低下。
 *   研究/指揮容量/モジュール/砲台 も盤面に置く設備として扱う。
 * ========================================================================= */
(function (G) {
  'use strict';

  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];   // dir 0=右 1=下 2=左 3=上
  G.FAC_DIR = { DX: DX, DY: DY };

  // 設備定義（build=建設コスト[鉄], use=電力消費, ct=製作時間秒, inCap=入力バッファ上限）
  G.MACH = {
    belt:      { name: 'コンベア',     icon: '⇢', build: 6,   use: 0.1, cat: 'flow', flow: true },
    intake:    { name: '資源入力',     icon: '⛏', build: 24,  use: 1,   cat: 'flow', ct: 0.6 },
    smelter:   { name: '製錬炉',       icon: '🔩', build: 70,  use: 5,   cat: 'flow', ct: 1.4, inCap: 8 },
    fab:       { name: '部品工場',     icon: '🔧', build: 80,  use: 5,   cat: 'flow', ct: 1.3, inCap: 6 },
    assembler: { name: '組立機',       icon: '⚙', build: 130, use: 8,   cat: 'flow', ct: 1.6, inCap: 4 },
    gen:       { name: '発電機',       icon: '⚡', build: 90,  use: 0,   gen: 30, cat: 'util' },
    lab:       { name: '研究所',       icon: '🔬', build: 110, use: 6,   research: 0.6, cat: 'util' },
    relay:     { name: '通信中継塔',   icon: '📡', build: 120, use: 4,   capacity: 6, cat: 'util' },
    modfab:    { name: 'モジュール工房', icon: '📦', build: 120, use: 5,  module: 0.12, cat: 'util' },
    turret:    { name: '防衛砲台',     icon: '🗼', build: 150, use: 6,   turret: 1, cat: 'util' },
  };
  // 配置可能なツール順（パレット表示順）
  G.MACH_ORDER = ['belt', 'intake', 'smelter', 'fab', 'assembler', 'gen', 'lab', 'relay', 'modfab', 'turret'];

  var BELT_SPEED = 2.4;   // セル/秒
  function isMat(t) { return G.MAT_INFO[t] != null; }

  var F = {};
  F.idx = function (g, x, y) { return y * g.w + x; };
  F.inb = function (g, x, y) { return x >= 0 && x < g.w && y >= 0 && y < g.h; };
  F.cell = function (g, x, y) { return F.inb(g, x, y) ? g.cells[y * g.w + x] : null; };

  F.newGrid = function (w, h) {
    var cells = new Array(w * h); for (var i = 0; i < cells.length; i++) cells[i] = null;
    return { w: w, h: h, cells: cells };
  };

  // 新規セル生成
  function mk(type, dir) {
    var c = { t: type, dir: dir || 0 };
    var d = G.MACH[type];
    if (type === 'belt') { c.item = null; c.p = 0; }
    else { c.inbuf = {}; c.prog = 0; c.out = null; }
    if (type === 'intake') c.mat = 'iron';
    if (type === 'smelter') c.recipe = 'alloy';
    if (type === 'fab') c.part = 'body';
    if (type === 'assembler') { c.body = 'infantry'; c.weapon = 'standard'; c.cpus = []; }
    return c;
  }
  F.make = mk;

  // 編集操作（UIから）
  F.place = function (g, x, y, type, dir) {
    if (!F.inb(g, x, y)) return false;
    g.cells[F.idx(g, x, y)] = mk(type, dir); return true;
  };
  F.remove = function (g, x, y) {
    if (!F.inb(g, x, y)) return false;
    g.cells[F.idx(g, x, y)] = null; return true;
  };

  // ---- 既定レイアウト（鉄だけで1ユニットが流れる稼働ライン） --------------
  //   見やすい横並び: 入力→製錬→部品(3)→組立。発電機・研究所も配置。
  F.defaultLayout = function () {
    var g = F.newGrid(16, 9);
    function put(x, y, t, dir, cfg) { var c = mk(t, dir); if (cfg) for (var k in cfg) c[k] = cfg[k]; g.cells[F.idx(g, x, y)] = c; }
    function belts(x, y, dir, n) { for (var i = 0; i < n; i++) put(x + DX[dir] * i, y + DY[dir] * i, 'belt', dir); }
    // 3本のライン（ヘッド=y2 / ボディ=y4 / ウェポン=y6）：入力→製錬→部品→組立
    function line(y, part) {
      put(1, y, 'intake', 0, { mat: 'iron' });
      put(2, y, 'belt', 0);
      put(3, y, 'smelter', 0);
      put(4, y, 'belt', 0);
      put(5, y, 'fab', 0, { part: part });
      belts(6, y, 0, 3);                 // (6,y)(7,y)(8,y) → 右へ
    }
    line(2, 'head'); line(4, 'body'); line(6, 'weapon');
    // 各ラインを組立機(9,4)へ寄せる
    put(9, 2, 'belt', 1); put(9, 3, 'belt', 1);   // ヘッド：下へ→上入力
    put(9, 6, 'belt', 3); put(9, 5, 'belt', 3);   // ウェポン：上へ→下入力
    // ボディ(8,4)→(9,4)左入力はそのまま
    put(9, 4, 'assembler', 0);
    // 電力・研究（右上）
    put(13, 0, 'gen'); put(14, 0, 'gen'); put(15, 0, 'gen'); put(13, 1, 'lab');
    return g;
  };

  // ---- 電力 ---------------------------------------------------------------
  F.power = function (g) {
    var supply = 0, demand = 0;
    for (var i = 0; i < g.cells.length; i++) {
      var c = g.cells[i]; if (!c) continue; var d = G.MACH[c.t];
      if (d.gen) supply += d.gen;
      demand += d.use || 0;
    }
    return { supply: supply, demand: demand, eff: demand <= 0 ? 1 : Math.min(1, supply / demand) };
  };

  // 設備カウント（研究所/中継塔/モジュール工房/砲台 などの効果集計）
  F.count = function (g, type) {
    var n = 0; for (var i = 0; i < g.cells.length; i++) { var c = g.cells[i]; if (c && c.t === type) n++; } return n;
  };

  // セルが item を受け取れるか（belt=空 / machine=入力バッファに空き）
  function accepts(c, type) {
    if (!c) return false;
    if (c.t === 'belt') return c.item == null;
    var d = G.MACH[c.t], cap = d.inCap || 0;
    if (c.t === 'smelter') return isMat(type) && (c.inbuf.ore || 0) < cap;
    if (c.t === 'fab') return type === 'alloy' && (c.inbuf.alloy || 0) < cap;
    if (c.t === 'assembler') return (type === 'body' || type === 'head' || type === 'weapon') && (c.inbuf[type] || 0) < cap;
    return false;
  }
  function deliver(c, type) {
    if (c.t === 'belt') { c.item = type; c.p = 0; return true; }
    if (c.t === 'smelter') { c.inbuf.ore = (c.inbuf.ore || 0) + 1; return true; }
    if (c.t === 'fab') { c.inbuf.alloy = (c.inbuf.alloy || 0) + 1; return true; }
    if (c.t === 'assembler') { c.inbuf[type] = (c.inbuf[type] || 0) + 1; return true; }
    return false;
  }
  F.nextCell = function (g, x, y, dir) { var nx = x + DX[dir], ny = y + DY[dir]; return F.inb(g, nx, ny) ? { c: g.cells[F.idx(g, nx, ny)], x: nx, y: ny } : null; };

  // ---- シミュレーション（毎フレーム dt） ---------------------------------
  //   api = { eff, mat(k), takeMat(k,n), canSpawn(), spawnUnit(cfg) }
  F.tick = function (g, dt, api) {
    var eff = api.eff, w = g.w, h = g.h, cells = g.cells;

    // 1) 機械の生産（入力が揃えば craft。完成品は out に保持し、出力先へ押し出す）
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var c = cells[y * w + x]; if (!c) continue;
      if (c.t === 'belt') continue;
      // 完成品の押し出し
      if (c.out) pushOut(g, x, y, c);
      if (c.t === 'gen' || c.t === 'lab' || c.t === 'relay' || c.t === 'modfab' || c.t === 'turret') continue;
      var d = G.MACH[c.t];
      if (c.t === 'intake') {
        if (c.out) continue;                       // 出力待ち
        c.prog += dt * eff;
        if (c.prog >= d.ct) { c.prog = 0; if (api.takeMat(c.mat, 1)) c.out = c.mat; }
        continue;
      }
      if (c.t === 'smelter') {
        if (!c.out && (c.inbuf.ore || 0) >= 2) { c.prog += dt * eff; if (c.prog >= d.ct) { c.prog = 0; c.inbuf.ore -= 2; c.out = 'alloy'; } }
        continue;
      }
      if (c.t === 'fab') {
        if (!c.out && (c.inbuf.alloy || 0) >= 1) { c.prog += dt * eff; if (c.prog >= d.ct) { c.prog = 0; c.inbuf.alloy -= 1; c.out = c.part; } }
        continue;
      }
      if (c.t === 'assembler') {
        if ((c.inbuf.body || 0) >= 1 && (c.inbuf.head || 0) >= 1 && (c.inbuf.weapon || 0) >= 1) {
          c.prog += dt * eff;
          if (c.prog >= d.ct) {
            if (api.canSpawn()) { c.prog = 0; c.inbuf.body--; c.inbuf.head--; c.inbuf.weapon--; api.spawnUnit({ body: c.body, weapon: c.weapon, cpus: c.cpus }); }
            else c.prog = d.ct;                     // 指揮容量が一杯なら待機
          }
        }
        continue;
      }
    }

    // 2) ベルト搬送（下流が空いていれば1セル進む。今tick受領済みは進めない）
    var got = {};
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var b = cells[yy * w + xx]; if (!b || b.t !== 'belt' || b.item == null) continue;
      if (got[yy * w + xx]) continue;
      b.p += BELT_SPEED * dt; if (b.p < 1) continue;
      var nx = xx + DX[b.dir], ny = yy + DY[b.dir];
      if (!F.inb(g, nx, ny)) { b.p = 1; continue; }
      var nc = cells[ny * w + nx];
      if (accepts(nc, b.item)) {
        var t = b.item; deliver(nc, t); b.item = null; b.p = 0;
        if (nc.t === 'belt') got[ny * w + nx] = 1;
      } else b.p = 1;                                // 詰まり
    }
  };

  // 機械の out を出力方向のセルへ押し出す
  function pushOut(g, x, y, c) {
    var nx = x + G.FAC_DIR.DX[c.dir], ny = y + G.FAC_DIR.DY[c.dir];
    if (!F.inb(g, nx, ny)) return;
    var nc = g.cells[F.idx(g, nx, ny)];
    if (accepts(nc, c.out)) { deliver(nc, c.out); c.out = null; }
  }

  G.Factory = F;
})(window.G = window.G || {});
