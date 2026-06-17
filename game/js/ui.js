/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - UI / 描画 / 入力 / メインループ（工業版）
 * ========================================================================= */
(function (G) {
  'use strict';
  var Game = G.Game;
  var $ = function (id) { return document.getElementById(id); };
  var canvas, ctx, lastTime = 0, lastHudT = 0, lastSig = '';
  var modalCallback = null;

  // ---- ログ --------------------------------------------------------------
  var logLines = [];
  function log(msg) {
    logLines.unshift(msg); if (logLines.length > 6) logLines.pop();
    $('log').innerHTML = logLines.map(function (l, i) { return '<div class="' + (i === 0 ? 'l0' : 'll') + '">▸ ' + l + '</div>'; }).join('');
  }

  // ---- モーダル ----------------------------------------------------------
  function showModal(title, body, choices, okLabel, cb, cls) {
    $('modal-title').textContent = title; $('modal-body').textContent = body || '';
    $('modal').className = cls || '';
    var cbox = $('modal-choices'); cbox.innerHTML = '';
    var ok = $('modal-ok');
    if (choices && choices.length) {
      ok.style.display = 'none';
      choices.forEach(function (opt, idx) {
        var b = document.createElement('button');
        b.innerHTML = '<span class="opt-label">' + opt.label + '</span><span class="opt-desc">' + opt.desc + '</span>';
        b.onclick = function () { hideModal(); cb(idx); };
        cbox.appendChild(b);
      });
    } else { ok.style.display = ''; ok.textContent = okLabel || '続ける ▶'; modalCallback = cb; }
    $('overlay').classList.remove('hidden');
  }
  function hideModal() { $('overlay').classList.add('hidden'); modalCallback = null; }
  $('modal-ok').onclick = function () { var cb = modalCallback; hideModal(); if (cb) cb(); };

  // ---- カットイン演出 ----------------------------------------------------
  var cutinTimer = null;
  function showCutin(jp, en, cls, dur) {
    var el = $('cutin'); if (!el) return;
    el.querySelector('.ci-jp').textContent = jp;
    el.querySelector('.ci-en').textContent = en;
    el.className = ''; void el.offsetWidth;        // アニメーション再始動
    el.className = 'show ' + cls;
    clearTimeout(cutinTimer);
    cutinTimer = setTimeout(function () { el.className = ''; }, dur || 2200);
  }

  // ---- フェーズ遷移 ------------------------------------------------------
  var lastPhase = null;
  function handlePhase() {
    var s = Game.state; if (s.phase === lastPhase) return; var prev = lastPhase; lastPhase = s.phase;
    if (s.phase === 'battle') showCutin('第' + (s.wave + 1) + '波　接近', 'WAVE ' + (s.wave + 1), 'wave', 2200);
    else if (s.phase === 'prep' && prev === 'battle') showCutin('波　殲滅', 'WAVE CLEAR', 'clear', 1900);
    if (s.phase === 'intro') showModal(Game.currentChapter().title, s.pendingStory, null, '防衛を開始 ▶', function () { Game.afterIntro(); }, '');
    else if (s.phase === 'story') showModal('― 戦域記録 ―', s.pendingStory, null, '次へ ▶', function () { Game.afterOutro(); }, '');
    else if (s.phase === 'choice') { var c = s.pendingChoice; showModal('決断', c.prompt, c.options, null, function (idx) { Game.applyChoice(c.options[idx]); log('方針決定：' + c.options[idx].label); }, ''); }
    else if (s.phase === 'won') showModal('防衛成功', '全ての群体を退けた。基地カストルは陥落しなかった。\n\n――だが、戦線はまだ終わらない。', null, 'もう一度 ↻', function () { restart(); }, 'win');
    else if (s.phase === 'lost') showModal('司令部 陥落', '防衛線は突破され、司令部は沈黙した。\n群体は基地を呑み込んでいく……', null, '再起動 ↻', function () { restart(); }, 'lose');
    else if (s.phase === 'prep') log('準備フェーズ：在庫を備蓄し設計を整え、「次の波を呼ぶ」で出撃。');
    else if (s.phase === 'battle') log('交戦開始！　第' + (s.wave + 1) + '波　組立ラインが稼働を始める。');
  }
  function restart() { Game.newGame(); lastPhase = null; lastSig = ''; rebuildAll(); }

  // ---- 共通パーツ --------------------------------------------------------
  function oreCost(n) { return '<span class="cost-ore">⛏' + n + '</span>'; }

  var BODY_KEYS = ['infantry', 'assault', 'heavy', 'shooter', 'flyer'];
  var WEAPON_KEYS = ['standard', 'splash', 'chain', 'heavyW'];

  // =======================================================================
  //  設備タブ（基盤）
  // =======================================================================
  function buildBasePanel() {
    var wrap = $('tab-base');
    wrap.innerHTML = '<div class="hint">基盤設備。電力・鉱石・研究・指揮容量の土台を整える。</div><div class="cards" id="base-cards"></div>';
    var grid = $('base-cards');
    Object.keys(G.BASE_BUILDINGS).forEach(function (id) {
      var b = G.BASE_BUILDINGS[id];
      var extra = [];
      if (b.power > 0) extra.push('+' + b.power + '電力'); else if (b.power < 0) extra.push(b.power + '電力');
      if (b.ore) extra.push('+' + b.ore + '鉱石/s'); if (b.research) extra.push('+' + b.research + '研究/s');
      if (b.oreCap) extra.push('貯蔵+' + b.oreCap); if (b.capacity) extra.push('指揮+' + b.capacity);
      var card = document.createElement('div'); card.className = 'card'; card.dataset.bid = id;
      card.innerHTML =
        '<div class="h"><span class="ci">' + b.icon + '</span><span class="nm">' + b.name + '</span><span class="ct" data-count></span></div>' +
        '<div class="ds">' + b.desc + '</div>' +
        '<div class="meta">' + extra.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</div>' +
        '<button data-buy>建設 <span data-cost></span></button>';
      card.querySelector('[data-buy]').onclick = function () { if (Game.buyBuilding(id)) log(b.name + 'を建設。'); };
      grid.appendChild(card);
    });
  }

  // =======================================================================
  //  部品工場タブ
  // =======================================================================
  function buildFabPanel() {
    var s = Game.state, wrap = $('tab-fab');
    wrap.innerHTML =
      '<div class="hint">部品工場は<b>準備中も稼働</b>し、ボディ/ヘッド/ウェポンを在庫に備蓄する。' +
      '組立ラインがこの在庫を消費してユニットを生産する。</div>' +
      '<div id="stock-box"></div>' +
      '<div class="fab-cols">' +
      '<div class="fab-col" id="fabcol-body"></div>' +
      '<div class="fab-col" id="fabcol-head"></div>' +
      '<div class="fab-col" id="fabcol-weapon"></div>' +
      '</div>';
    renderStockBox();
    renderFabColumn('body', '🦿 ボディ工場（兵科）', $('fabcol-body'));
    renderFabColumn('head', '🧠 ヘッド工場', $('fabcol-head'));
    renderFabColumn('weapon', '🔫 ウェポン工場', $('fabcol-weapon'));
  }

  function renderStockBox() {
    var s = Game.state, box = $('stock-box');
    var parts = ['<div class="stock-title">部品在庫</div><div class="stock-rows">'];
    parts.push('<div class="stock-row"><span class="sl">ボディ</span>');
    BODY_KEYS.forEach(function (k) { if (s.unlockedBodies[k]) parts.push('<span class="schip">' + G.BODIES[k].icon + '<b id="stk-body-' + k + '">' + s.stock.body[k] + '</b></span>'); });
    parts.push('</div>');
    parts.push('<div class="stock-row"><span class="sl">ヘッド</span><span class="schip">🧠<b id="stk-head">' + s.stock.head + '</b></span></div>');
    parts.push('<div class="stock-row"><span class="sl">ウェポン</span>');
    WEAPON_KEYS.forEach(function (k) { if (s.unlockedWeapons[k]) parts.push('<span class="schip">' + G.WEAPONS[k].icon + '<b id="stk-weapon-' + k + '">' + s.stock.weapon[k] + '</b></span>'); });
    parts.push('</div></div>');
    box.innerHTML = parts.join('');
  }

  function renderFabColumn(kind, title, col) {
    var s = Game.state, list = Game.industryList(kind);
    var html = ['<div class="fab-head">' + title + ' <span class="fabn">×' + list.length + '</span></div>'];
    list.forEach(function (f, i) {
      html.push('<div class="fab-item">');
      if (kind === 'head') {
        html.push('<span class="fab-assign">ヘッド部品を生産</span>');
      } else {
        var keys = kind === 'body' ? BODY_KEYS : WEAPON_KEYS;
        var src = kind === 'body' ? G.BODIES : G.WEAPONS;
        var unlocked = kind === 'body' ? s.unlockedBodies : s.unlockedWeapons;
        var sel = '<select data-fabsel="' + kind + '" data-idx="' + i + '">';
        keys.forEach(function (k) { if (unlocked[k]) sel += '<option value="' + k + '"' + (f.assign === k ? ' selected' : '') + '>' + src[k].icon + ' ' + src[k].name + '</option>'; });
        sel += '</select>';
        html.push(sel);
      }
      html.push('<button class="xbtn" data-fabdel="' + kind + '" data-idx="' + i + '">×</button>');
      html.push('</div>');
    });
    html.push('<button class="addbtn" data-fabadd="' + kind + '">＋ 追加 <span data-cost></span></button>');
    col.innerHTML = html.join('');
    // 配線
    col.querySelectorAll('[data-fabsel]').forEach(function (selEl) {
      selEl.onchange = function () { Game.setFabAssign(kind, +selEl.dataset.idx, selEl.value); markDirty(); };
    });
    col.querySelectorAll('[data-fabdel]').forEach(function (b) {
      b.onclick = function () { Game.removeIndustry(kind, +b.dataset.idx); markDirty(); };
    });
    col.querySelector('[data-fabadd]').onclick = function () { if (Game.buyIndustry(kind)) { log(G.INDUSTRY[kind === 'body' ? 'bodyFab' : kind === 'head' ? 'headFab' : 'weaponFab'].name + 'を増設。'); markDirty(); } };
  }

  // =======================================================================
  //  組立ラインタブ
  // =======================================================================
  function buildAsmPanel() {
    var s = Game.state, wrap = $('tab-asm');
    wrap.innerHTML =
      '<div class="hint">組立ラインに設計（ボディ＋ウェポン＋ヘッドCPU）を組む。' +
      '戦闘中に在庫を消費して連続生産する。スロット数＝ヘッド規格。</div>' +
      '<div id="asm-list"></div>' +
      '<button class="addbtn" data-asmadd>＋ 組立ライン追加 <span data-cost></span></button>';
    var listEl = $('asm-list');
    s.assemblies.forEach(function (a, i) { listEl.appendChild(renderAssembly(a, i)); });
    wrap.querySelector('[data-asmadd]').onclick = function () { if (Game.buyIndustry('assembly')) { log('組立ラインを増設。'); markDirty(); } };
  }

  function renderAssembly(a, i) {
    var s = Game.state, st = Game.computeStats(a);
    var box = document.createElement('div'); box.className = 'asm';
    // ボディ選択
    var bsel = '<select data-asmbody="' + i + '">';
    BODY_KEYS.forEach(function (k) { if (s.unlockedBodies[k]) bsel += '<option value="' + k + '"' + (a.body === k ? ' selected' : '') + '>' + G.BODIES[k].icon + ' ' + G.BODIES[k].name + '</option>'; });
    bsel += '</select>';
    // ウェポン選択
    var wsel = '<select data-asmweapon="' + i + '">';
    WEAPON_KEYS.forEach(function (k) { if (s.unlockedWeapons[k]) wsel += '<option value="' + k + '"' + (a.weapon === k ? ' selected' : '') + '>' + G.WEAPONS[k].icon + ' ' + G.WEAPONS[k].name + '</option>'; });
    wsel += '</select>';
    // CPUスロット
    var slots = s.tiers.head, used = a.cpus.length;
    var cpuChips = '';
    Object.keys(G.CPUS).forEach(function (cid) {
      if (!s.unlockedCpus[cid]) return;
      var on = a.cpus.indexOf(cid) >= 0;
      cpuChips += '<span class="cpuchip' + (on ? ' on' : '') + '" data-cpu="' + cid + '" data-idx="' + i + '" title="' + G.CPUS[cid].desc + '">' + G.CPUS[cid].icon + G.CPUS[cid].name.replace('CPU', '') + '</span>';
    });
    if (!cpuChips) cpuChips = '<span class="cpu-empty">（CPU未研究）</span>';
    var wk = st.weapon.kind === 'aoe' ? '範囲' + st.weapon.aoe : st.weapon.kind === 'chain' ? '連鎖' + st.weapon.chain : '単体';

    // 部品供給チェック：このラインのボディ/ウェポンを生産している工場があるか
    var bodyFed = s.bodyFabs.some(function (f) { return f.assign === a.body; });
    var wpFed = s.weaponFabs.some(function (f) { return f.assign === a.weapon; });
    var warn = '';
    if (!bodyFed || !wpFed || s.headFabs.length === 0) {
      var miss = [];
      if (!bodyFed) miss.push(G.BODIES[a.body].name + 'ボディ');
      if (!wpFed) miss.push(G.WEAPONS[a.weapon].name);
      if (s.headFabs.length === 0) miss.push('ヘッド');
      warn = '<div class="asm-warn">⚠ 未供給: ' + miss.join('・') + '（対応する工場が必要）</div>';
    }

    box.innerHTML =
      '<div class="asm-row1"><span class="asm-ci">' + G.BODIES[a.body].icon + '</span>' + bsel + wsel +
      '<button class="xbtn" data-asmdel="' + i + '">×</button></div>' +
      '<div class="asm-stats">HP' + Math.round(st.hp) + '・攻' + Math.round(st.dmg) + '・防' + st.def +
      '・速' + Math.round(st.speed) + '・射' + Math.round(st.range) + '・' + (st.domain === 'air' ? '空' : '地') +
      (st.antiAir ? '/対空' : '') + '・武装:' + wk + '</div>' + warn +
      '<div class="asm-cpu"><span class="slotlbl">CPUスロット ' + used + '/' + slots + '</span>' + cpuChips + '</div>';

    box.querySelector('[data-asmbody]').onchange = function (e) { Game.setAssemblyBody(i, e.target.value); markDirty(); };
    box.querySelector('[data-asmweapon]').onchange = function (e) { Game.setAssemblyWeapon(i, e.target.value); markDirty(); };
    box.querySelector('[data-asmdel]').onclick = function () { Game.removeIndustry('assembly', i); markDirty(); };
    box.querySelectorAll('[data-cpu]').forEach(function (chip) { chip.onclick = function () { Game.toggleCpu(i, chip.dataset.cpu); markDirty(); }; });
    return box;
  }

  // =======================================================================
  //  研究タブ
  // =======================================================================
  function buildTechPanel() {
    var wrap = $('tab-tech');
    var branches = {};
    Object.keys(G.TECHS).forEach(function (id) { var br = G.TECHS[id].branch; (branches[br] = branches[br] || []).push(id); });
    wrap.innerHTML = '';
    Object.keys(branches).forEach(function (br) {
      var sec = document.createElement('div');
      sec.innerHTML = '<div class="branch-tag">' + br + '系</div>';
      var grid = document.createElement('div'); grid.className = 'cards';
      branches[br].forEach(function (id) {
        var t = G.TECHS[id];
        var reqTxt = t.req.length ? '前提: ' + t.req.map(function (r) { return G.TECHS[r].name; }).join('・') : '';
        var card = document.createElement('div'); card.className = 'card'; card.dataset.tid = id;
        card.innerHTML =
          '<div class="h"><span class="nm">' + t.name + '</span></div>' +
          '<div class="ds">' + t.desc + (reqTxt ? '<br><span style="color:#566">' + reqTxt + '</span>' : '') + '</div>' +
          '<button data-tech><span class="cost-res">🔬' + t.cost + '</span></button>';
        card.querySelector('[data-tech]').onclick = function () { if (Game.doResearch(id)) { log('研究完了：' + t.name); markDirty(); } };
        grid.appendChild(card);
      });
      sec.appendChild(grid); wrap.appendChild(sec);
    });
  }

  // =======================================================================
  //  リフレッシュ（数値のみ・毎フレーム）
  // =======================================================================
  function refreshNumbers() {
    var s = Game.state;
    // 設備
    $('tab-base').querySelectorAll('.card').forEach(function (card) {
      var id = card.dataset.bid, cost = Game.baseCost(id);
      card.querySelector('[data-count]').textContent = '×' + (s.buildings[id] || 0);
      card.querySelector('[data-cost]').innerHTML = oreCost(cost);
      card.querySelector('[data-buy]').disabled = s.ore < cost;
    });
    // 工場の追加コスト
    document.querySelectorAll('[data-fabadd]').forEach(function (b) {
      var kind = b.dataset.fabadd, cost = Game.industryCost(kind);
      var cs = b.querySelector('[data-cost]'); if (cs) cs.innerHTML = oreCost(cost);
      b.disabled = s.ore < cost;
    });
    var asmAdd = document.querySelector('[data-asmadd]');
    if (asmAdd) { var ac = Game.industryCost('assembly'); asmAdd.querySelector('[data-cost]').innerHTML = oreCost(ac); asmAdd.disabled = s.ore < ac; }
    // 在庫数
    BODY_KEYS.forEach(function (k) { var el = $('stk-body-' + k); if (el) el.textContent = s.stock.body[k]; });
    var hd = $('stk-head'); if (hd) hd.textContent = s.stock.head;
    WEAPON_KEYS.forEach(function (k) { var el = $('stk-weapon-' + k); if (el) el.textContent = s.stock.weapon[k]; });
    // 研究
    $('tab-tech').querySelectorAll('.card').forEach(function (card) {
      var id = card.dataset.tid, done = !!s.researched[id], btn = card.querySelector('[data-tech]');
      card.classList.toggle('tech-done', done);
      if (done) { btn.disabled = true; btn.innerHTML = '✓ 研究済'; }
      else { btn.disabled = !Game.canResearch(id); }
    });
  }

  // 構造シグネチャ（変化時のみパネル再構築）
  function structureSig() {
    var s = Game.state;
    return s.bodyFabs.length + ',' + s.headFabs.length + ',' + s.weaponFabs.length + ',' + s.assemblies.length +
      '|' + Object.keys(s.researched).length + '|' + s.tiers.head + s.tiers.body + s.tiers.weapon +
      '|' + s.bodyFabs.map(function (f) { return f.assign; }).join('') +
      '|' + s.weaponFabs.map(function (f) { return f.assign; }).join('') +
      '|' + s.assemblies.map(function (a) { return a.body + a.weapon + a.cpus.join(''); }).join('_');
  }
  var dirty = false;
  function markDirty() { dirty = true; }
  function rebuildAll() { buildBasePanel(); buildFabPanel(); buildAsmPanel(); buildTechPanel(); refreshNumbers(); lastSig = structureSig(); }

  // =======================================================================
  //  HUD
  // =======================================================================
  function refreshHUD() {
    var s = Game.state;
    $('ore-val').textContent = Math.floor(s.ore); $('ore-cap').textContent = '/' + Game.oreCap();
    $('ore-rate').textContent = '+' + Game.oreRate().toFixed(1) + '/s';
    $('res-val').textContent = Math.floor(s.research); $('res-rate').textContent = '+' + Game.researchRate().toFixed(1) + '/s';
    var sup = Game.powerSupply(), dem = Math.round(Game.powerDemand());
    $('pow-val').textContent = sup + '/' + dem;
    var eff = Game.powerEfficiency(), pe = $('pow-eff');
    if (eff < 0.999) { pe.textContent = '効率' + Math.round(eff * 100) + '%'; pe.className = 'warn'; } else { pe.textContent = ''; pe.className = ''; }
    $('cap-val').textContent = Game.capacityUsed() + '/' + Game.capacityMax();
    var ch = Game.currentChapter();
    if (ch && s.phase !== 'won') { $('chap-title').textContent = ch.title; $('wave-info').textContent = '第' + Math.min(s.wave + 1, ch.waves.length) + '波 / ' + ch.waves.length + (s.phase === 'battle' ? '　⚔交戦中' : '　待機'); }
    var hp = Math.max(0, s.hqHp) / s.hqHpMax, bar = $('hq-bar');
    bar.style.width = (hp * 100) + '%';
    bar.style.background = hp > 0.5 ? 'linear-gradient(90deg,#2ee08a,#7fffb0)' : hp > 0.25 ? 'linear-gradient(90deg,#e0b62e,#ffd86b)' : 'linear-gradient(90deg,#e02e3e,#ff7b7b)';
    $('hq-label').textContent = '司令部 HP ' + Math.max(0, Math.ceil(s.hqHp)) + '/' + s.hqHpMax;
    var wb = $('wave-btn'); wb.disabled = s.phase !== 'prep';
    $('phase-hint').textContent = s.phase === 'prep' ? '部品を備蓄し、設計を整えて出撃せよ' : s.phase === 'battle' ? '組立ラインが在庫を消費して増援を生産中' : '';
  }

  // =======================================================================
  //  キャンバス描画 ＋ エフェクト/パーティクル
  // =======================================================================
  var UNIT_COLOR = { infantry: '#6bd0ff', assault: '#ff9a4a', heavy: '#9b8bff', shooter: '#5be0a8', flyer: '#ffe06b' };
  var T = 0;                 // 演出用の経過時間
  var particles = [], tracers = [], rings = [];
  var shakeMag = 0, shakeT = 0, hqFlash = 0;
  var stars = [], ridgeFar = [], ridgeNear = [];

  function dprNow() { return Math.min(2, devicePixelRatio || 1); }
  function resize() {
    var r = canvas.getBoundingClientRect(), dpr = dprNow();
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    buildBackdrop();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function buildBackdrop() {
    stars = [];
    for (var i = 0; i < 70; i++) stars.push({ x: Math.random(), y: Math.random() * 0.55, r: rand(0.4, 1.4), ph: rand(0, 6.28), sp: rand(0.004, 0.02) });
    ridgeFar = []; ridgeNear = [];
    for (var k = 0; k <= 24; k++) { ridgeFar.push(rand(0.3, 0.7)); ridgeNear.push(rand(0.0, 1.0)); }
  }
  function geo() {
    var dpr = dprNow();
    return { W: canvas.width, H: canvas.height, dpr: dpr, sx: canvas.width / Game.constants.LANE, midY: canvas.height * 0.64 };
  }
  function yLevel(air, g) { return g.midY - 9 * g.dpr - (air ? 46 * g.dpr : 0); }
  function addShake(m, d) { shakeMag = Math.max(shakeMag, m); shakeT = Math.max(shakeT, d); }

  function spawnParticle(p) { if (particles.length > 620) particles.shift(); particles.push(p); }
  function burst(x, y, col, n, spd, opt) {
    opt = opt || {};
    for (var i = 0; i < n; i++) {
      var a = rand(0, 6.28), v = rand(spd * 0.3, spd);
      spawnParticle({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opt.up || 0),
        g: opt.g == null ? 520 : opt.g, life: rand(0.3, 0.7) * (opt.lifeMul || 1), max: 0.7,
        size: rand(1.2, 3) * (opt.sizeMul || 1) * dprNow(), color: Math.random() < 0.4 ? '#ffffff' : col, glow: opt.glow });
    }
  }

  // 視覚イベントを消費して演出を生成
  function consumeVfx(g) {
    var list = Game.state.vfx; if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      if (ev.k === 'shot') {
        var col = ev.side === 'p' ? (UNIT_COLOR[ev.body] || '#6bd0ff') : ev.col;
        var x1 = ev.x1 * g.sx, y1 = yLevel(ev.a1, g), x2 = ev.x2 * g.sx, y2 = yLevel(ev.a2, g);
        var face = ev.side === 'p' ? 1 : -1;
        burst(x1 + face * 6 * g.dpr, y1, col, 3, 90 * g.dpr, { g: 0, lifeMul: 0.4, glow: true });
        tracers.push({ x1: x1, y1: y1, x2: x2, y2: y2, t: 0, dur: Math.max(0.05, Math.min(0.16, Math.abs(x2 - x1) / (1500 * g.dpr))), color: col, w: ev.kind === 'single' ? 2.2 : 1.8, hit: true });
      } else if (ev.k === 'beam') {
        var bx2 = ev.x2 * g.sx, by2 = yLevel(ev.a2, g), bx1 = ev.x1 * g.sx, by1 = g.midY - 18 * g.dpr;
        tracers.push({ x1: bx1, y1: by1, x2: bx2, y2: by2, t: 0, dur: 0.16, color: '#8fe0ff', beam: true, w: 2.4, hit: true, hitcol: '#8fe0ff' });
      } else if (ev.k === 'arc') {
        tracers.push({ x1: ev.x1 * g.sx, y1: yLevel(ev.a1, g), x2: ev.x2 * g.sx, y2: yLevel(ev.a2, g), t: 0, dur: 0.2, color: '#9af0ff', arc: true, w: 2 });
      } else if (ev.k === 'blast') {
        var px = ev.x * g.sx, py = yLevel(ev.a, g);
        rings.push({ x: px, y: py, r: 5 * g.dpr, r1: ev.r * g.sx, life: 0.34, max: 0.34, color: '#ffd24a', w: 2.5 });
        burst(px, py, '#ffcf6b', 10, 150 * g.dpr, { glow: true, sizeMul: 1.1 });
      } else if (ev.k === 'boom') {
        var ex = ev.x * g.sx, ey = yLevel(ev.a, g), big = ev.big;
        rings.push({ x: ex, y: ey, r: 4 * g.dpr, r1: (big ? 70 : ev.ally ? 22 : 30) * g.dpr, life: big ? 0.5 : 0.32, max: 0.5, color: ev.ally ? '#bfe6ff' : '#ffd0a0', w: big ? 4 : 2 });
        burst(ex, ey, ev.col || '#ff8a6a', big ? 30 : ev.ally ? 8 : 14, (big ? 280 : 180) * g.dpr, { sizeMul: big ? 1.6 : 1, glow: true });
        spawnParticle({ x: ex, y: ey, vx: 0, vy: -10 * g.dpr, g: -20, life: big ? 0.6 : 0.35, max: 0.6, size: (big ? 26 : 13) * g.dpr, color: 'rgba(255,255,255,0.9)', flash: true });
        if (big) addShake(9 * g.dpr, 0.4); else if (!ev.ally) addShake(2.2 * g.dpr, 0.12);
      } else if (ev.k === 'hqhit') {
        hqFlash = 1; addShake(7 * g.dpr, 0.3);
        rings.push({ x: ev.x * g.sx + 16 * g.dpr, y: g.midY - 14 * g.dpr, r: 4 * g.dpr, r1: 40 * g.dpr, life: 0.3, max: 0.3, color: '#ff5a5a', w: 3 });
      } else if (ev.k === 'spawn') {
        var spx = ev.x * g.sx, spy = yLevel(ev.a, g);
        rings.push({ x: spx, y: spy, r: 2 * g.dpr, r1: 16 * g.dpr, life: 0.3, max: 0.3, color: UNIT_COLOR[ev.body] || '#8fd', w: 1.6 });
        burst(spx, spy, UNIT_COLOR[ev.body] || '#8fd', 6, 70 * g.dpr, { up: 40 * g.dpr, g: 120, glow: true });
      } else if (ev.k === 'boss') {
        showCutin('警告　巨核接近', 'WARNING : TITAN', 'boss', 2800);
        addShake(6 * g.dpr, 0.5);
      }
    }
    list.length = 0;
  }

  function stepFX(dt, g) {
    T += dt;
    consumeVfx(g);
    var i, p;
    for (i = particles.length - 1; i >= 0; i--) {
      p = particles[i]; p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.vx *= (1 - 1.5 * dt);
    }
    for (i = tracers.length - 1; i >= 0; i--) {
      var tr = tracers[i]; tr.t += dt;
      if (tr.t >= tr.dur) { if (tr.hit) burst(tr.x2, tr.y2, tr.hitcol || tr.color, 4, 110 * g.dpr, { g: 80, lifeMul: 0.5, glow: true }); tracers.splice(i, 1); }
    }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeMag = 0; }
    if (hqFlash > 0) hqFlash = Math.max(0, hqFlash - dt * 3.5);
  }

  // ---- 描画本体 ----
  function draw() {
    var s = Game.state, g = geo(), W = g.W, H = g.H, dpr = g.dpr, sx = g.sx, midY = g.midY;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shakeMag > 0) ctx.translate(rand(-shakeMag, shakeMag), rand(-shakeMag, shakeMag));

    drawBackground(g, s);
    drawWall(g, s);
    var turrets = s.buildings.turret || 0;
    for (var t = 0; t < turrets; t++) drawTurret(Game.constants.WALL_X * sx, midY - 16 * dpr - t * 15 * dpr, dpr, s.enemies.length > 0);
    drawHQ(g, s);

    // 影 → 本体（敵→自軍の順で自軍を手前に）
    s.enemies.forEach(function (e) { drawShadow(e, G.ENEMIES[e.type], g); });
    s.units.forEach(function (u) { drawShadow(u, u.stats, g); });
    s.enemies.forEach(function (e) { drawEnemy(e, G.ENEMIES[e.type], g); });
    s.units.forEach(function (u) { drawUnit(u, u.stats, g); });

    drawTracers(dpr);
    drawRings();
    drawParticles();

    // 前景：HQ被弾フラッシュ・ビネット・準備表示
    if (hqFlash > 0) { ctx.fillStyle = 'rgba(255,40,40,' + (hqFlash * 0.28) + ')'; ctx.fillRect(0, 0, W, H); }
    drawVignette(g);
    if (s.phase === 'prep') {
      ctx.fillStyle = 'rgba(150,180,210,' + (0.35 + 0.12 * Math.sin(T * 2)) + ')';
      ctx.font = '700 ' + (13 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('◇ 準備フェーズ — 部品を備蓄し設計を整えよ ◇', W / 2, H * 0.16);
    }
    ctx.restore();
  }

  function drawBackground(g, s) {
    var W = g.W, H = g.H, dpr = g.dpr, midY = g.midY;
    // 空グラデーション
    var sky = ctx.createLinearGradient(0, 0, 0, midY);
    sky.addColorStop(0, '#0a0e18'); sky.addColorStop(1, '#141021');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, midY);
    // 敵側の赤いグロー
    var glow = ctx.createRadialGradient(W, midY, 10, W, midY, W * 0.7);
    glow.addColorStop(0, 'rgba(120,30,50,0.30)'); glow.addColorStop(1, 'rgba(120,30,50,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, midY + 20 * dpr);
    // 星（緩くドリフト＋またたき）
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i]; var sxp = ((st.x - T * st.sp) % 1 + 1) % 1;
      var a = 0.35 + 0.4 * Math.sin(T * 1.5 + st.ph);
      ctx.fillStyle = 'rgba(200,220,255,' + Math.max(0, a) + ')';
      ctx.fillRect(sxp * W, st.y * H, st.r * dpr, st.r * dpr);
    }
    // 遠景の稜線（赤）／近景（暗）
    drawRidge(g, ridgeFar, midY - 4 * dpr, 26 * dpr, 'rgba(70,28,40,0.85)');
    drawRidge(g, ridgeNear, midY + 2 * dpr, 16 * dpr, 'rgba(20,16,28,0.95)');
    // 地面
    var grd = ctx.createLinearGradient(0, midY, 0, H);
    grd.addColorStop(0, '#161a22'); grd.addColorStop(1, '#0c0d12');
    ctx.fillStyle = grd; ctx.fillRect(0, midY, W, H - midY);
    // 地面の遠近グリッド（手前へスクロール）
    ctx.strokeStyle = 'rgba(90,120,150,0.10)'; ctx.lineWidth = 1 * dpr;
    var off = (T * 40 * dpr) % (40 * dpr);
    for (var gx = -off; gx < W; gx += 40 * dpr) { ctx.beginPath(); ctx.moveTo(gx, midY); ctx.lineTo(gx - 30 * dpr, H); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(90,120,150,0.13)';
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
    // 基地側シルエット（左）
    drawBaseSilhouette(g);
  }
  function drawRidge(g, pts, baseY, amp, color) {
    var W = g.W; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, baseY);
    for (var i = 0; i < pts.length; i++) { var x = (i / (pts.length - 1)) * W; ctx.lineTo(x, baseY - pts[i] * amp); }
    ctx.lineTo(W, baseY + 60 * g.dpr); ctx.lineTo(0, baseY + 60 * g.dpr); ctx.closePath(); ctx.fill();
  }
  function drawBaseSilhouette(g) {
    var dpr = g.dpr, midY = g.midY;
    ctx.fillStyle = 'rgba(18,30,42,0.9)';
    var towers = [[18, 30], [40, 48], [70, 24]];
    for (var i = 0; i < towers.length; i++) {
      var tx = towers[i][0] * dpr, th = towers[i][1] * dpr;
      ctx.fillRect(tx, midY - th, 12 * dpr, th);
      var blink = (Math.sin(T * 2 + i) > 0.6);
      ctx.fillStyle = blink ? 'rgba(120,200,255,0.9)' : 'rgba(40,80,110,0.6)';
      ctx.fillRect(tx + 4 * dpr, midY - th - 3 * dpr, 3 * dpr, 3 * dpr);
      ctx.fillStyle = 'rgba(18,30,42,0.9)';
    }
  }
  function drawWall(g, s) {
    var dpr = g.dpr, midY = g.midY, wallX = Game.constants.WALL_X * g.sx;
    var pulse = 0.25 + 0.18 * Math.sin(T * 3);
    var grad = ctx.createLinearGradient(wallX - 4 * dpr, 0, wallX + 4 * dpr, 0);
    grad.addColorStop(0, 'rgba(80,200,255,0)'); grad.addColorStop(0.5, 'rgba(110,220,255,' + pulse + ')'); grad.addColorStop(1, 'rgba(80,200,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(wallX - 4 * dpr, midY - 74 * dpr, 8 * dpr, 92 * dpr);
    ctx.strokeStyle = 'rgba(120,225,255,' + (0.45 + 0.2 * Math.sin(T * 3)) + ')'; ctx.lineWidth = 1.4 * dpr;
    ctx.setLineDash([5 * dpr, 6 * dpr]); ctx.lineDashOffset = -(T * 30 * dpr);
    ctx.beginPath(); ctx.moveTo(wallX, midY - 72 * dpr); ctx.lineTo(wallX, midY + 16 * dpr); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  function drawTurret(x, y, dpr, active) {
    ctx.save();
    ctx.fillStyle = '#243f56'; ctx.strokeStyle = '#7fd1ff'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.arc(x, y, 6 * dpr, 0, 7); ctx.fill(); ctx.stroke();
    // 砲身（敵がいれば右へ向く）
    var ang = active ? Math.sin(T * 6) * 0.15 : -0.3;
    ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 2.4 * dpr;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * 11 * dpr, y + Math.sin(ang) * 11 * dpr); ctx.stroke();
    ctx.restore();
  }
  function drawHQ(g, s) {
    var dpr = g.dpr, midY = g.midY, hp = Math.max(0, s.hqHp) / s.hqHpMax;
    var bx = 8 * dpr, by = midY - 44 * dpr, bw = 30 * dpr, bh = 62 * dpr;
    var edge = hp > 0.5 ? '#3fa9ff' : hp > 0.25 ? '#ffcf5a' : '#ff5d5d';
    var grd = ctx.createLinearGradient(bx, by, bx, by + bh);
    grd.addColorStop(0, '#1c3c54'); grd.addColorStop(1, '#0e2031');
    ctx.fillStyle = grd; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = edge; ctx.lineWidth = 2 * dpr; ctx.strokeRect(bx, by, bw, bh);
    // パネルの灯り
    for (var r = 0; r < 3; r++) for (var c = 0; c < 2; c++) {
      var on = Math.sin(T * 3 + r * 1.7 + c) > 0;
      ctx.fillStyle = on ? 'rgba(120,200,255,0.8)' : 'rgba(40,70,95,0.6)';
      ctx.fillRect(bx + 6 * dpr + c * 12 * dpr, by + 8 * dpr + r * 14 * dpr, 8 * dpr, 7 * dpr);
    }
    // アンテナ＋点滅灯
    ctx.strokeStyle = edge; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by - 12 * dpr); ctx.stroke();
    if (Math.sin(T * 4) > 0) { ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(bx + bw / 2, by - 13 * dpr, 2.2 * dpr, 0, 7); ctx.fill(); }
  }

  function spriteOf(ent) { return ent.side === 'e' ? G.SPRITES['e_' + ent.type] : G.SPRITES[ent.stats.body]; }
  function pxOf(ent, spec, dpr) { return (spec.boss ? 2.5 : ent.side === 'e' ? 1.95 : 2.0) * dpr; }

  function drawShadow(ent, spec, g) {
    var spr = spriteOf(ent); if (!spr) return;
    var px = pxOf(ent, spec, g.dpr), hw = spr.w * px * 0.38;
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(ent.x * g.sx, g.midY + 5 * g.dpr, hw, hw * 0.32, 0, 0, 7); ctx.fill();
  }
  function ensurePhase(ent) { if (ent._ph === undefined) { ent._ph = rand(0, 6.28); ent._px = ent.x; } }

  // ドット絵スプライト描画。cx=中心X / footY=下端Y / px=1ドット / flip=左右反転
  // legPhase!=null のとき最下段2行を歩行モーション（脚の振り）でずらす
  function drawSprite(spr, cx, footY, px, flip, legPhase) {
    var w = spr.w, h = spr.h, x0 = cx - (w * px) / 2, sz = Math.ceil(px) + 1;
    for (var r = 0; r < h; r++) {
      var row = spr.rows[r], legs = (legPhase != null && r >= h - 2);
      var sw = legs ? Math.sin(legPhase) * px * 0.7 : 0;
      var py = Math.floor(footY - (h - r) * px);
      for (var c = 0; c < w; c++) {
        var ch = row.charAt(c); if (ch === '.') continue;
        var col = spr.pal[ch]; if (!col) continue;
        var gc = flip ? (w - 1 - c) : c;
        var sh = legs ? (gc < w / 2 ? sw : -sw) : 0;
        ctx.fillStyle = col;
        ctx.fillRect(Math.floor(x0 + gc * px + sh), py, sz, sz);
      }
    }
  }

  function drawUnit(ent, st, g) {
    ensurePhase(ent);
    var dpr = g.dpr, air = st.domain === 'air', x = ent.x * g.sx;
    var moving = Math.abs(ent.x - ent._px) > 0.01; ent._px = ent.x;
    var spr = G.SPRITES[st.body] || G.SPRITES.infantry, px = 2.0 * dpr;
    if (air) {
      var cy = yLevel(true, g) + Math.sin(T * 3 + ent._ph) * 4 * dpr;
      // 推進炎（後方＝左）
      var fl = 0.45 + 0.4 * Math.abs(Math.sin(T * 26 + ent._ph));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(120,205,255,' + fl + ')';
      ctx.beginPath(); ctx.ellipse(x - (spr.w * px) / 2 - 1 * dpr, cy + 1 * dpr, 5 * dpr * fl, 1.8 * dpr, 0, 0, 7); ctx.fill();
      ctx.restore();
      drawSprite(spr, x, cy + (spr.h * px) / 2, px, false, null);
      hpBar(ent, x, cy - (spr.h * px) / 2 - 4 * dpr, 10 * dpr, dpr, false);
    } else {
      var bob = moving ? Math.abs(Math.sin(T * 9 + ent._ph)) * 1.1 * dpr : Math.sin(T * 2 + ent._ph) * 0.5 * dpr;
      var footY = g.midY + 3 * dpr - bob;
      drawSprite(spr, x, footY, px, false, moving ? (T * 9 + ent._ph) : null);
      hpBar(ent, x, footY - spr.h * px - 3 * dpr, 10 * dpr, dpr, false);
    }
  }
  function drawEnemy(ent, spec, g) {
    ensurePhase(ent);
    var dpr = g.dpr, air = spec.domain === 'air', x = ent.x * g.sx;
    var spr = G.SPRITES['e_' + ent.type] || G.SPRITES.e_swarmling;
    var pulse = 1 + Math.sin(T * 6 + ent._ph) * 0.06;
    var px = (spec.boss ? 2.5 : 1.95) * dpr * pulse;
    if (spec.boss) {
      var gy = g.midY - spr.h * px * 0.5;
      var rg = ctx.createRadialGradient(x, gy, 2, x, gy, spr.w * px * 0.8);
      rg.addColorStop(0, 'rgba(255,90,50,0.40)'); rg.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg;
      ctx.fillRect(x - spr.w * px, gy - spr.h * px, spr.w * px * 2, spr.h * px * 2); ctx.restore();
    }
    if (air) {
      var cy = yLevel(true, g) + Math.sin(T * 3 + ent._ph) * 4 * dpr;
      drawSprite(spr, x, cy + (spr.h * px) / 2, px, false, null);
      hpBar(ent, x, cy - (spr.h * px) / 2 - 4 * dpr, 10 * dpr, dpr, true);
    } else {
      var footY = g.midY + 3 * dpr;
      drawSprite(spr, x, footY, px, false, null);
      hpBar(ent, x, footY - spr.h * px - 3 * dpr, (spec.boss ? 20 : 10) * dpr, dpr, true);
    }
  }
  function hpBar(ent, x, y, r, dpr, enemy) {
    var hp = Math.max(0, ent.hp) / ent.maxHp; if (hp >= 1) return;
    var bw = r * 2.4, bx = x - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, y, bw, 3 * dpr);
    ctx.fillStyle = enemy ? (hp > 0.4 ? '#ff7b7b' : '#ff4040') : (hp > 0.4 ? '#6bff9e' : '#ffd24a');
    ctx.fillRect(bx, y, bw * hp, 3 * dpr);
  }

  function drawTracers(dpr) {
    for (var i = 0; i < tracers.length; i++) {
      var tr = tracers[i], p = Math.min(1, tr.t / tr.dur), a = 1 - p * 0.2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (tr.beam) {
        ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = tr.color; ctx.lineWidth = tr.w * dpr;
        ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 * dpr; ctx.stroke();
      } else if (tr.arc) {
        ctx.globalAlpha = (1 - p); ctx.strokeStyle = tr.color; ctx.lineWidth = tr.w * dpr;
        ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1);
        var seg = 5; for (var k = 1; k < seg; k++) { var f = k / seg; var jx = (Math.random() - 0.5) * 9 * dpr, jy = (Math.random() - 0.5) * 9 * dpr; ctx.lineTo(tr.x1 + (tr.x2 - tr.x1) * f + jx, tr.y1 + (tr.y2 - tr.y1) * f + jy); }
        ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
      } else {
        var cx = tr.x1 + (tr.x2 - tr.x1) * p, cy = tr.y1 + (tr.y2 - tr.y1) * p;
        var p0 = Math.max(0, p - 0.3), tx = tr.x1 + (tr.x2 - tr.x1) * p0, ty = tr.y1 + (tr.y2 - tr.y1) * p0;
        ctx.globalAlpha = a; ctx.strokeStyle = tr.color; ctx.lineWidth = tr.w * dpr;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, tr.w * 0.9 * dpr, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawRings() {
    for (var i = 0; i < rings.length; i++) {
      var R = rings[i], f = R.life / R.max, rr = R.r + (R.r1 - R.r) * (1 - f);
      ctx.globalAlpha = Math.max(0, f); ctx.strokeStyle = R.color; ctx.lineWidth = R.w * dprNow();
      ctx.beginPath(); ctx.arc(R.x, R.y, rr, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  function drawParticles() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i], a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.flash) { var rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size); rg.addColorStop(0, 'rgba(255,255,255,' + a + ')'); rg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 0.4, 0, 7); ctx.fill(); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawVignette(g) {
    var vg = ctx.createRadialGradient(g.W / 2, g.H / 2, g.H * 0.4, g.W / 2, g.H / 2, g.H * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, g.W, g.H);
  }

  // ---- 入力・タブ --------------------------------------------------------
  function bindTabs() {
    $('tabs').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        $('tabs').querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        document.querySelectorAll('.tab-body').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); $('tab-' + b.dataset.tab).classList.add('active');
      };
    });
    $('wave-btn').onclick = function () { Game.startBattle(); };
  }

  // ---- メインループ ------------------------------------------------------
  function loop(ts) {
    var dt = lastTime ? (ts - lastTime) / 1000 : 0; lastTime = ts;
    if (dt > 0.1) dt = 0.1;
    Game.update(dt); handlePhase();
    stepFX(dt, geo()); draw();
    if (ts - lastHudT > 100) {
      lastHudT = ts; refreshHUD();
      var sig = structureSig();
      if (dirty || sig !== lastSig) { dirty = false; rebuildAll(); }
      else refreshNumbers();
    }
    requestAnimationFrame(loop);
  }

  function init() {
    canvas = $('lane'); ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    Game.newGame(); resize(); bindTabs(); rebuildAll();
    log('指揮AI 起動。工業ラインを構築し、量産で群体を迎え撃て。');
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})(window.G = window.G || {});
