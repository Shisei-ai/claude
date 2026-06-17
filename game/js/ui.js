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

  // ---- フェーズ遷移 ------------------------------------------------------
  var lastPhase = null;
  function handlePhase() {
    var s = Game.state; if (s.phase === lastPhase) return; lastPhase = s.phase;
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
  //  キャンバス描画
  // =======================================================================
  function resize() { var r = canvas.getBoundingClientRect(); canvas.width = r.width * devicePixelRatio; canvas.height = r.height * devicePixelRatio; }
  var UNIT_COLOR = { infantry: '#6bd0ff', assault: '#ff9a4a', heavy: '#9b8bff', shooter: '#5be0a8', flyer: '#ffe06b' };

  function draw() {
    var s = Game.state, W = canvas.width, H = canvas.height, dpr = devicePixelRatio;
    ctx.clearRect(0, 0, W, H);
    var LANE = Game.constants.LANE, sx = W / LANE, midY = H * 0.62;
    ctx.strokeStyle = 'rgba(120,150,180,0.18)'; ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
    drawHQ(midY, dpr, s);
    var wallX = Game.constants.WALL_X * sx;
    ctx.strokeStyle = 'rgba(90,200,255,0.35)'; ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.beginPath(); ctx.moveTo(wallX, midY - 70 * dpr); ctx.lineTo(wallX, midY + 18 * dpr); ctx.stroke(); ctx.setLineDash([]);
    var turrets = s.buildings.turret || 0;
    for (var t = 0; t < turrets; t++) drawTurret(wallX, midY - 14 * dpr - t * 16 * dpr, dpr);
    s.units.forEach(function (u) { drawEntity(u, u.stats, sx, midY, dpr, false); });
    s.enemies.forEach(function (e) { drawEntity(e, G.ENEMIES[e.type], sx, midY, dpr, true); });
    s.effects.forEach(function (fx) {
      ctx.globalAlpha = Math.max(0, fx.life * 2); ctx.strokeStyle = fx.color; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.arc(fx.x * sx, midY, fx.r * dpr * 0.5, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    });
    if (s.phase === 'prep') { ctx.fillStyle = 'rgba(140,170,200,0.5)'; ctx.font = (13 * dpr) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('― 準備フェーズ（部品を備蓄）―', W / 2, H * 0.18); }
  }
  function drawHQ(midY, dpr, s) {
    var bx = 6 * dpr, by = midY - 38 * dpr, bw = 26 * dpr, bh = 56 * dpr, hp = Math.max(0, s.hqHp) / s.hqHpMax;
    ctx.fillStyle = '#16334a'; ctx.strokeStyle = hp > 0.3 ? '#3fa9ff' : '#ff5d5d'; ctx.lineWidth = 2 * dpr;
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#3fa9ff'; ctx.font = (16 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏛', bx + bw / 2, by + bh / 2 + 6 * dpr);
  }
  function drawTurret(x, y, dpr) { ctx.fillStyle = '#2a4f6e'; ctx.strokeStyle = '#7fd1ff'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(x, y, 6 * dpr, 0, 7); ctx.fill(); ctx.stroke(); }
  function drawEntity(ent, spec, sx, midY, dpr, isEnemy) {
    var x = ent.x * sx, isAir = spec.domain === 'air';
    var y = midY - 8 * dpr - (isAir ? 44 * dpr : 0);
    var col = isEnemy ? spec.color : (UNIT_COLOR[spec.body] || '#6bd0ff');
    var r = (spec.boss ? 14 : isEnemy ? 7 : 8) * dpr;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, midY + 4 * dpr, r * 0.9, r * 0.4, 0, 0, 7); ctx.fill();
    if (isAir) { ctx.strokeStyle = 'rgba(150,180,210,0.25)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x, midY); ctx.stroke(); }
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1 * dpr;
    if (isAir) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (isEnemy) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); }
    var hp = Math.max(0, ent.hp) / ent.maxHp;
    if (hp < 1) { var bw = r * 2.2, bx = x - bw / 2, byy = y - r - 6 * dpr; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, byy, bw, 3 * dpr); ctx.fillStyle = isEnemy ? '#ff7b7b' : '#6bff9e'; ctx.fillRect(bx, byy, bw * hp, 3 * dpr); }
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
    Game.update(dt); handlePhase(); draw();
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
