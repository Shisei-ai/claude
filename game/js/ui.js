/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - UI / 描画 / 入力 / メインループ（工業版）
 * ========================================================================= */
(function (G) {
  'use strict';
  var Game = G.Game;
  var $ = function (id) { return document.getElementById(id); };
  var canvas, ctx, lastTime = 0, lastHudT = 0, lastSig = '', lastLaySig = '';
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

  // ---- VN会話劇エンジン --------------------------------------------------
  var vnBeats = null, vnIdx = 0, vnDone = null, vnStage = { left: null, right: null };
  var vnExpr = {}, vnTyping = null, vnFull = '', vnFxTimer = null;
  function preloadPortraits() {
    if (typeof Image === 'undefined') return;
    for (var id in G.CHARACTERS) { var im = G.CHARACTERS[id].img || {}; for (var e in im) { var x = new Image(); x.src = im[e]; } }
  }
  function normalizeScene(content) {
    if (Array.isArray(content)) return content;
    return String(content || '').split(/\n\s*\n/).map(function (p) { return { who: 'narration', text: p.trim() }; });
  }
  function portraitHTML(who, expr) {
    var ch = G.CHARACTERS[who] || G.CHARACTERS.narration;
    var ph = '<div class="vn-ph" style="border-color:' + ch.color + '"><span>' + (ch.icon || '◆') + '</span><b style="color:' + ch.color + '">' + (ch.name || '') + '</b></div>';
    var src = ch.img && (ch.img[expr] || ch.img.neutral);
    if (src) return '<img src="' + src + '" alt="" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' + ph.replace('vn-ph', 'vn-ph hidden');
    return ph;
  }
  function renderPortraits(active) {
    ['left', 'right'].forEach(function (side) {
      var slot = $('vn').querySelector('.vn-portrait.' + side), who = vnStage[side];
      if (!who) { slot.innerHTML = ''; slot.className = 'vn-portrait ' + side; return; }
      var ch = G.CHARACTERS[who] || {};
      slot.innerHTML = portraitHTML(who, vnExpr[who] || 'neutral');
      slot.className = 'vn-portrait ' + side + (who === active ? ' on' : ' off') + (ch.hud ? ' hud' : '');
    });
  }
  function vnShake() { var el = $('vn'); el.classList.remove('vn-shake'); void el.offsetWidth; el.classList.add('vn-shake'); }
  function vnFlash(col) { var f = $('vn').querySelector('.vn-flash'); f.style.background = col || 'rgba(255,255,255,0.6)'; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  function startType(text) {
    vnFull = text || ''; var el = $('vn-text'); el.textContent = ''; var i = 0;
    clearInterval(vnTyping); $('vn-next').classList.remove('ready');
    if (!vnFull) { return; }
    vnTyping = setInterval(function () { i++; el.textContent = vnFull.slice(0, i); if (i >= vnFull.length) { clearInterval(vnTyping); vnTyping = null; $('vn-next').classList.add('ready'); } }, 18);
  }
  function playStory(content, done) {
    vnBeats = normalizeScene(content); vnIdx = 0; vnDone = done; vnStage = { left: null, right: null }; vnExpr = {};
    $('vn').classList.add('show'); showBeat();
  }
  function showBeat() {
    if (!vnBeats || vnIdx >= vnBeats.length) { endStory(); return; }
    var b = vnBeats[vnIdx], who = b.who || 'narration', ch = G.CHARACTERS[who] || G.CHARACTERS.narration;
    if (b.expr) vnExpr[who] = b.expr;
    if (b.bg) $('vn-bg').style.background = b.bg;
    if (b.cutin) showCutin(b.cutin.jp, b.cutin.en, b.cutin.cls || 'wave', b.cutin.dur || 2000);
    if (b.fx === 'shake') vnShake(); else if (b.fx === 'flash') vnFlash(b.flashColor);
    if (who !== 'narration') { var side = b.pos || ch.side || 'right'; if (side !== 'center') vnStage[side] = who; }
    renderPortraits(who);
    $('vn-box').classList.toggle('narration', who === 'narration');
    $('vn-name').textContent = ch.name || ''; $('vn-name').style.color = ch.color || '#fff';
    startType(b.text || '');
    if (!b.text) { clearTimeout(vnFxTimer); vnFxTimer = setTimeout(function () { if (vnBeats && vnBeats[vnIdx] === b) { vnIdx++; showBeat(); } }, 360); }
  }
  function vnAdvance() {
    if (!$('vn').classList.contains('show')) return;
    if (vnTyping) { clearInterval(vnTyping); vnTyping = null; $('vn-text').textContent = vnFull; $('vn-next').classList.add('ready'); return; }
    var b = vnBeats && vnBeats[vnIdx]; if (b && !b.text) return; // 演出ビートは自動送り
    vnIdx++; showBeat();
  }
  function endStory() { clearInterval(vnTyping); vnTyping = null; clearTimeout(vnFxTimer); $('vn').classList.remove('show'); var d = vnDone; vnDone = null; vnBeats = null; if (d) d(); }

  // ---- 章開始のフルスクリーン・カットイン（立ち絵風） --------------------
  var CHAPTER_FEATURE = ['e_swarmling', 'e_armored', 'e_wyrm', 'e_titan'];
  var CHAPTER_SUB = ['謎の襲撃、最前線に至る', '装甲の群れが押し寄せる', '空を制する飛翔体', '中枢炉、ついに開く'];
  var chapTimer = null;
  function showChapterCutin(chIdx, done) {
    var el = $('chapter-cut'); if (!el) { if (done) done(); return; }
    var title = Game.currentChapter().title, parts = title.split('　');
    el.querySelector('.cc-num').innerHTML = (parts[0] || '') + '<span>CHAPTER ' + (chIdx + 1) + '</span>';
    el.querySelector('.cc-title').textContent = parts[1] || title;
    el.querySelector('.cc-sub').textContent = CHAPTER_SUB[chIdx] || '';
    // 立ち絵（その章の脅威キャラを大きく描く）
    var pcv = el.querySelector('.cc-portrait'), pc = pcv && pcv.getContext && pcv.getContext('2d');
    if (pc) {
      pc.clearRect(0, 0, pcv.width, pcv.height);
      var spr = G.SPRITES[CHAPTER_FEATURE[chIdx]] || G.SPRITES.e_swarmling;
      var ppx = Math.floor(Math.min((pcv.width - 16) / spr.w, (pcv.height - 16) / spr.h));
      G.renderSprite(pc, spr, (pcv.width - spr.w * ppx) / 2, (pcv.height - spr.h * ppx) / 2, ppx, false);
    }
    el.className = ''; void el.offsetWidth; el.className = 'show';
    var finished = false;
    var fin = function () { if (finished) return; finished = true; el.className = ''; el.onclick = null; clearTimeout(chapTimer); if (done) done(); };
    el.onclick = fin; chapTimer = setTimeout(fin, 3000);
  }

  // ---- フェーズ遷移 ------------------------------------------------------
  var lastPhase = null;
  function handlePhase() {
    var s = Game.state; if (s.phase === lastPhase) return; var prev = lastPhase; lastPhase = s.phase;
    if (s.phase === 'battle') {
      if (s.battleMode === 'defense') { var st = G.DEFENSE[s.defenseStage]; showCutin('暫時防衛・' + st.name, 'INTERIM DEFENSE ' + (s.defenseStage + 1), 'wave', 2200); }
      else showCutin('第' + (s.wave + 1) + '波　接近', 'WAVE ' + (s.wave + 1), 'wave', 2200);
    } else if (s.phase === 'prep' && prev === 'battle') {
      if (s.defenseResult) {
        var dr = s.defenseResult; s.defenseResult = null;
        if (dr.fail) { showCutin('暫時防衛　失敗', 'DEFENSE FAILED', 'boss', 2000); log('暫時防衛に失敗。供給モジュールは得られなかった。'); }
        else { showCutin('暫時防衛　完了', 'DEFENSE CLEAR', 'clear', 2000); log(dr.gained > 0 ? ('暫時防衛 成功：資源供給モジュール ×' + dr.gained + ' を獲得！') : '暫時防衛 成功：今回は供給モジュールを獲得できなかった。'); }
      } else showCutin('波　殲滅', 'WAVE CLEAR', 'clear', 1900);
    }
    if (s.phase === 'intro') showChapterCutin(s.chapter, function () { playStory(s.pendingStory, function () { Game.afterIntro(); }); });
    else if (s.phase === 'story') playStory(s.pendingStory, function () { if (Game.state.storyReturn === 'interlude') Game.afterInterlude(); else Game.afterOutro(); });
    else if (s.phase === 'choice') { var c = s.pendingChoice; showModal('決断', c.prompt, c.options, null, function (idx) { Game.applyChoice(c.options[idx]); log('方針決定：' + c.options[idx].label); }, ''); }
    else if (s.phase === 'won') showModal('防衛成功', '襲撃を退けた。研究基地オールトは、まだ陥落していない。\n\n――だが、戦いはまだ終わらない。', null, 'もう一度 ↻', function () { restart(); }, 'win');
    else if (s.phase === 'lost') showModal('オールト 陥落', '防衛線は突破され、オールトの中枢は沈黙した。\n襲撃者が基地を呑み込んでいく……', null, '再起動 ↻', function () { restart(); }, 'lose');
    else if (s.phase === 'prep') log('準備フェーズ：在庫を備蓄し設計を整え、「次の波を呼ぶ」で出撃。');
    else if (s.phase === 'battle') log('交戦開始！　第' + (s.wave + 1) + '波　組立ラインが稼働を始める。');
    // 冒頭の導入が終わったら執務室（ホーム）へ
    if (s.phase === 'prep' && prev === 'intro' && !homeIntroShown) { homeIntroShown = true; openHome(); }
  }
  function restart() { Game.newGame(); lastPhase = null; lastSig = ''; homeIntroShown = false; closeHome(); rebuildAll(); }

  // 暫時防衛：出撃ステージ選択
  function openDefenseMenu() {
    var s = Game.state; if (s.phase !== 'prep') return;
    var n = Game.defenseAvailable(); if (n <= 0) return;
    var opts = [];
    for (var i = 0; i < n; i++) {
      var st = G.DEFENSE[i], lo = Math.min.apply(null, st.mods), hi = Math.max.apply(null, st.mods);
      opts.push({ label: 'ステージ' + (i + 1) + '　' + st.name, desc: st.sub + '／報酬：供給モジュール ' + lo + '〜' + hi + '（確率）' });
    }
    opts.push({ label: 'やめる', desc: '出撃しない', _cancel: true });
    showModal('暫時防衛', '出撃するステージを選べ。勝利すると確率で資源供給モジュールを獲得する。\n（本陣HPは戦闘後に回復するが、失った機体は戻らない）', opts, null, function (idx) {
      if (opts[idx] && opts[idx]._cancel) return;
      if (Game.startDefense(idx)) log('暫時防衛・' + G.DEFENSE[idx].name + ' に出撃。');
    }, '');
  }

  // ---- ホーム画面（執務室ハブ） ------------------------------------------
  var homeIntroShown = false;
  function refreshHome() {
    var s = Game.state, ch = Game.currentChapter();
    $('home-chap').textContent = (s.phase === 'won') ? '防衛完了' : (ch ? ch.title : '―');
    $('home-iron').textContent = Math.floor(s.mat.iron);
    $('home-res').textContent = Math.floor(s.research);
    $('home-mod').textContent = Math.floor(Game.freeModules()) + '/' + Game.moduleCap();
    var navail = Game.defenseAvailable(), db = $('home').querySelector('[data-home="defense"]');
    if (db) db.disabled = navail <= 0;
    $('home-def-sub').textContent = navail > 0 ? ('解放ステージ：' + navail + ' ／ 周回で供給モジュール獲得') : '章クリアで解放';
  }
  function openHome() { if (Game.state.phase !== 'prep') return; refreshHome(); $('home').classList.add('show'); }
  function closeHome() { $('home').classList.remove('show'); }
  function bindHome() {
    $('home').querySelectorAll('[data-home]').forEach(function (b) {
      b.onclick = function () {
        var act = b.dataset.home;
        if (act === 'defense') { if (Game.defenseAvailable() <= 0) return; closeHome(); openDefenseMenu(); return; }
        closeHome();
        if (act !== 'story') activateTab(act);   // story = 前線（戦場）へそのまま戻る
      };
    });
  }

  // ---- 共通パーツ --------------------------------------------------------
  function ironCost(n) { return '<span class="cost-ore">⛓' + n + '</span>'; }

  var BODY_KEYS = ['infantry', 'assault', 'heavy', 'shooter', 'flyer'];
  var WEAPON_KEYS = ['standard', 'splash', 'chain', 'heavyW'];

  // =======================================================================
  //  鉱区タブ（採取モジュール割当 ＋ 基本素材在庫）
  // =======================================================================
  function buildZonePanel() {
    var s = Game.state, wrap = $('tab-zone');
    wrap.innerHTML =
      '<div class="hint">鉱区に<b>採取モジュール</b>を投入して基本素材を採取する（投入数で産出量が変わる）。' +
      'モジュールは設備「モジュール工房」で増え、研究／ストーリーで保有上限が拡張。鉱区はストーリーで順次解放。</div>' +
      '<div id="mat-box"></div><div id="zone-list"></div>';
    renderMatBox();
    var list = $('zone-list');
    G.ZONES.forEach(function (z, i) {
      var zs = s.zones[i], mi = G.MAT_INFO[z.mat];
      var row = document.createElement('div'); row.className = 'zone' + (zs.unlocked ? '' : ' zlocked');
      if (!zs.unlocked) {
        row.innerHTML = '<div class="zone-h"><b>' + z.name + '</b><span class="zlock">🔒 ストーリーで解放</span></div>';
      } else {
        row.innerHTML =
          '<div class="zone-h"><b>' + z.name + '</b><span class="zmat">' + mi.icon + mi.name +
          (z.byproduct ? ' ＋' + G.MAT_INFO[z.byproduct].icon + G.MAT_INFO[z.byproduct].name : '') + '</span>' +
          '<span class="zrate" data-zrate="' + i + '"></span></div>' +
          '<div class="zone-mod"><button class="modbtn" data-zminus="' + i + '">－</button>' +
          '<span class="modn">📦<b data-zmod="' + i + '">' + zs.modules + '</b></span>' +
          '<button class="modbtn" data-zplus="' + i + '">＋</button></div>';
      }
      list.appendChild(row);
    });
    list.querySelectorAll('[data-zplus]').forEach(function (b) { b.onclick = function () { if (Game.assignModule(+b.dataset.zplus)) markDirty(); }; });
    list.querySelectorAll('[data-zminus]').forEach(function (b) { b.onclick = function () { if (Game.unassignModule(+b.dataset.zminus)) markDirty(); }; });
  }
  function renderMatBox() {
    var s = Game.state, h = ['<div class="stock-title">基本素材 在庫（上限 ' + Game.matCap() + '）</div><div class="stock-row">'];
    G.MATERIALS.forEach(function (k) { var mi = G.MAT_INFO[k]; h.push('<span class="schip" title="' + mi.name + '">' + mi.icon + '<b id="mat-' + k + '">' + Math.floor(s.mat[k]) + '</b></span>'); });
    h.push('</div>'); $('mat-box').innerHTML = h.join('');
  }

  // =======================================================================
  //  生産タブ（グリッド・ファクトリー：配置＋コンベア）
  // =======================================================================
  var facTool = 'select', facSel = null, facCanvas = null, facCtx = null;
  var FAC_CELL = 32, facDown = false, facLastKey = '';
  var ITEM_COL = { body: '#8fd0ff', head: '#c79bff', weapon: '#ffd24a' };
  function itemColor(t) { return ITEM_COL[t] || (G.RECIPES[t] ? G.RECIPES[t].color : G.MAT_INFO[t] ? G.MAT_INFO[t].color : '#9fb4c8'); }
  function recipeInStr(r) { return Object.keys(r.in).map(function (m) { var n = r.in[m]; return G.MAT_INFO[m].icon + G.MAT_INFO[m].name + (n > 1 ? '×' + n : ''); }).join('＋'); }

  function buildProdPanel() {
    var wrap = $('tab-prod');
    if (!wrap.dataset.init) {
      wrap.innerHTML =
        '<div class="hint">設備をタイルに置き、<b>コンベア(⇢)</b>で繋いで生産を流す：' +
        '<b>資源入力→製錬炉→部品工場→組立機</b>。電力が不足すると稼働が遅くなる。</div>' +
        '<div id="fac-bar"></div>' +
        '<div id="fac-wrap"><canvas id="fac-canvas"></canvas></div>' +
        '<div id="fac-config"></div>';
      wrap.dataset.init = '1';
      facCanvas = $('fac-canvas'); facCtx = facCanvas.getContext('2d');
      bindFactory();
    }
    buildFacBar();        // 解放状況を反映して毎回作り直す
    renderFacConfig();
  }
  function buildFacBar() {
    var bar = $('fac-bar'), h = [];
    h.push('<div class="fac-tools">');
    h.push('<button class="ftool" data-tool="select">⊹ 選択</button>');
    h.push('<button class="ftool" data-tool="erase">🗑 撤去</button>');
    h.push('<button class="ftool" id="fac-rot">⟳ 回転</button>');
    G.MACH_ORDER.forEach(function (t) { var d = G.MACH[t], lk = !Game.facUnlocked(t);
      h.push('<button class="ftool fmach' + (lk ? ' locked' : '') + '" data-tool="' + t + '"' + (lk ? ' disabled title="研究で解放"' : '') + '>' + d.icon + ' ' + d.name + (lk ? ' 🔒' : '<i class="fcost" data-fcost="' + t + '"></i>') + '</button>');
    });
    h.push('</div>');
    h.push('<div class="fac-readout"><span title="鉄">⛓ <b id="fac-iron">0</b></span>' +
      '<span title="電力 供給/消費">⚡ <b id="fac-pow">0/0</b><em id="fac-eff"></em></span>' +
      '<span class="fac-tip">配置=クリック／コンベアはドラッグで方向、回転で向き変更</span></div>');
    bar.innerHTML = h.join('');
    bar.querySelectorAll('[data-tool]').forEach(function (b) { if (b.id === 'fac-rot') return; b.onclick = function () { setTool(b.dataset.tool); }; });
    $('fac-rot').onclick = function () { _facDir = (_facDir + 1) % 4; Game.facSetDir(_facDir); if (facSel) Game.facRotate(facSel.x, facSel.y); };
    bar.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === facTool); });  // 現在のツールを維持
  }
  var _facDir = 0;
  function facDirGet() { return _facDir; }
  function setTool(t) {
    facTool = t; _facDir = 0; Game.facSetDir(0);
    $('fac-bar').querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === t); });
  }
  function facCellAt(e) {
    var r = facCanvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / r.width * Game.state.factory.w);
    var y = Math.floor((e.clientY - r.top) / r.height * Game.state.factory.h);
    return { x: x, y: y };
  }
  function facApply(cx, cy, prev) {
    var f = Game.state.factory; if (!G.Factory.inb(f, cx, cy)) return;
    if (facTool === 'erase') { Game.facRemove(cx, cy); if (facSel && facSel.x === cx && facSel.y === cy) { facSel = null; renderFacConfig(); } return; }
    if (facTool === 'select') { var c = G.Factory.cell(f, cx, cy); facSel = c ? { x: cx, y: cy } : null; renderFacConfig(); return; }
    // 機械/ベルト配置
    var dir = _facDir;
    if (facTool === 'belt' && prev) { var ddx = cx - prev.x, ddy = cy - prev.y;   // ドラッグ方向＝流れ
      if (ddx === 1) dir = 0; else if (ddy === 1) dir = 1; else if (ddx === -1) dir = 2; else if (ddy === -1) dir = 3;
      var pc = G.Factory.cell(f, prev.x, prev.y); if (pc && pc.t === 'belt') pc.dir = dir;   // 直前ベルトも向き調整
    }
    if (!f.cells[cy * f.w + cx]) Game.facBuild(cx, cy, facTool, dir);
  }
  function bindFactory() {
    facCanvas.addEventListener('mousedown', function (e) {
      facDown = true; var c = facCellAt(e); facLastKey = c.x + ',' + c.y; facApply(c.x, c.y, null);
    });
    facCanvas.addEventListener('mousemove', function (e) {
      if (!facDown || facTool === 'select') return;
      var c = facCellAt(e), key = c.x + ',' + c.y; if (key === facLastKey) return;
      var pk = facLastKey.split(','), prev = { x: +pk[0], y: +pk[1] };
      facLastKey = key; facApply(c.x, c.y, prev);
    });
    window.addEventListener('mouseup', function () { facDown = false; });
  }

  function renderFacConfig() {
    var box = $('fac-config'); if (!box) return;
    var f = Game.state.factory, s = Game.state;
    if (!facSel) { box.innerHTML = '<div class="fac-cfg-empty">「選択」ツールで設備をクリックすると、ここで設定できます。</div>'; return; }
    var c = G.Factory.cell(f, facSel.x, facSel.y);
    if (!c) { box.innerHTML = ''; facSel = null; return; }
    var d = G.MACH[c.t], h = ['<div class="fac-cfg-h"><b>' + d.icon + ' ' + d.name + '</b>' +
      '<button class="xbtn" id="fac-del">撤去 ×</button></div>'];
    if (c.t === 'intake') {
      h.push('<label>採取する素材：<select id="cfg-mat">');
      G.MATERIALS.forEach(function (m, i) { if (s.zones[i] && s.zones[i].unlocked) h.push('<option value="' + m + '"' + (c.mat === m ? ' selected' : '') + '>' + G.MAT_INFO[m].icon + ' ' + G.MAT_INFO[m].name + '</option>'); });
      h.push('</select></label>');
    } else if (c.t === 'fab') {
      h.push('<label>生産部品：<select id="cfg-part">' +
        ['body', 'head', 'weapon'].map(function (p) { var nm = p === 'body' ? 'ボディ' : p === 'head' ? 'ヘッド' : 'ウェポン'; return '<option value="' + p + '"' + (c.part === p ? ' selected' : '') + '>' + nm + '</option>'; }).join('') + '</select></label>');
      var need = G.RECIPES[c.part === 'weapon' ? G.gradeInt(s.tiers.weapon) : G.gradeInt(s.tiers.body)];
      h.push('<div class="fac-cfg-note">現在の規格では <b style="color:' + need.color + '">' + need.icon + need.name + '</b> 1つ → ' + (c.part === 'weapon' ? 'ウェポン' : c.part === 'head' ? 'ヘッド' : 'ボディ') + '。製錬炉でこの中間素材を作り、繋げてください。</div>');
    } else if (c.t === 'smelter') {
      h.push('<label>レシピ：<select id="cfg-recipe">');
      G.RECIPE_ORDER.forEach(function (rk) { var r = G.RECIPES[rk], av = Game.recipeAvailable(rk);
        h.push('<option value="' + rk + '"' + (c.recipe === rk ? ' selected' : '') + (av ? '' : ' disabled') + '>' + r.icon + r.name + '（' + recipeInStr(r) + '）' + (av ? '' : ' 🔒') + '</option>');
      });
      h.push('</select></label>');
      var rr = G.RECIPES[c.recipe];
      h.push('<div class="fac-cfg-note">' + recipeInStr(rr) + ' → <b style="color:' + rr.color + '">' + rr.icon + rr.name + '</b>。必要素材の資源入力を繋げてください。</div>');
    } else if (c.t === 'assembler') {
      h.push(renderAsmConfig(c));
    } else {
      h.push('<div class="fac-cfg-note">' + (d.gen ? '電力 +' + d.gen : d.research ? '研究 +' + d.research + '/s' : d.capacity ? '指揮容量 +' + d.capacity : d.module ? '採取モジュールを製造' : d.turret ? 'ドーム周囲の固定砲（対空可）' : '') + '</div>');
    }
    box.innerHTML = h.join('');
    var del = $('fac-del'); if (del) del.onclick = function () { Game.facRemove(facSel.x, facSel.y); facSel = null; renderFacConfig(); markDirty(); };
    var mat = $('cfg-mat'); if (mat) mat.onchange = function () { Game.facSetCfg(facSel.x, facSel.y, 'mat', mat.value); };
    var part = $('cfg-part'); if (part) part.onchange = function () { Game.facSetCfg(facSel.x, facSel.y, 'part', part.value); renderFacConfig(); };
    var rec = $('cfg-recipe'); if (rec) rec.onchange = function () { Game.facSetCfg(facSel.x, facSel.y, 'recipe', rec.value); renderFacConfig(); };
    wireAsmConfig(c);
  }
  function renderAsmConfig(c) {
    var s = Game.state, st = Game.computeStats({ body: c.body, weapon: c.weapon, cpus: c.cpus });
    var bsel = '<select id="cfg-body">';
    BODY_KEYS.forEach(function (k) { if (s.unlockedBodies[k]) bsel += '<option value="' + k + '"' + (c.body === k ? ' selected' : '') + '>' + G.BODIES[k].icon + ' ' + G.BODIES[k].name + '</option>'; });
    bsel += '</select>';
    var wsel = '<select id="cfg-weapon">';
    WEAPON_KEYS.forEach(function (k) { if (s.unlockedWeapons[k]) wsel += '<option value="' + k + '"' + (c.weapon === k ? ' selected' : '') + '>' + G.WEAPONS[k].icon + ' ' + G.WEAPONS[k].name + '</option>'; });
    wsel += '</select>';
    var slots = s.tiers.head, chips = '';
    Object.keys(G.CPUS).forEach(function (cid) { if (!s.unlockedCpus[cid]) return;
      var on = c.cpus.indexOf(cid) >= 0;
      chips += '<span class="cpuchip' + (on ? ' on' : '') + '" data-acpu="' + cid + '" title="' + G.CPUS[cid].desc + '">' + G.CPUS[cid].icon + G.CPUS[cid].name.replace('CPU', '') + '</span>';
    });
    if (!chips) chips = '<span class="cpu-empty">（CPU未研究）</span>';
    var sp = [];
    if (st.crit) sp.push('暴' + Math.round(st.crit * 100) + '%'); if (st.pierce) sp.push('貫' + st.pierce);
    if (st.lifesteal) sp.push('吸' + Math.round(st.lifesteal * 100) + '%'); if (st.regen) sp.push('再' + Math.round(st.regen * 100) + '%/s');
    if (st.slow) sp.push('鈍' + Math.round((1 - st.slow) * 100) + '%'); if (st.stunChance) sp.push('麻' + Math.round(st.stunChance * 100) + '%');
    if (st.shield) sp.push('盾' + Math.round(st.shield * 100) + '%'); if (st.thorns) sp.push('反' + Math.round(st.thorns * 100) + '%'); if (st.multishot) sp.push('多' + st.multishot);
    var spStr = sp.length ? '・<span class="asm-sp">' + sp.join('/') + '</span>' : '';
    var wk = st.weapon.kind === 'aoe' ? '範囲' + st.weapon.aoe : st.weapon.kind === 'chain' ? '連鎖' + st.weapon.chain : '単体';
    return '<div class="asm-row1">' + bsel + wsel + '</div>' +
      '<div class="asm-stats">HP' + Math.round(st.hp) + '・攻' + Math.round(st.dmg) + '・防' + st.def + '・速' + Math.round(st.speed) +
      '・射' + Math.round(st.range) + '・' + (st.domain === 'air' ? '空' : '地') + (st.antiAir ? '/対空' : '') + '・武装:' + wk + spStr + '</div>' +
      '<div class="asm-cpu"><span class="slotlbl">CPUスロット ' + c.cpus.length + '/' + slots + '</span>' + chips + '</div>';
  }
  function wireAsmConfig(c) {
    if (!c || c.t !== 'assembler') return;
    var b = $('cfg-body'); if (b) b.onchange = function () { Game.facSetCfg(facSel.x, facSel.y, 'body', b.value); renderFacConfig(); };
    var w = $('cfg-weapon'); if (w) w.onchange = function () { Game.facSetCfg(facSel.x, facSel.y, 'weapon', w.value); renderFacConfig(); };
    $('fac-config').querySelectorAll('[data-acpu]').forEach(function (chip) { chip.onclick = function () { Game.facToggleCpu(facSel.x, facSel.y, chip.dataset.acpu); renderFacConfig(); }; });
  }

  // ---- ファクトリー描画（メインループから毎フレーム） --------------------
  function drawFactory() {
    if (!facCtx || !$('tab-prod').classList.contains('active')) return;
    var f = Game.state.factory, dpr = Math.min(2, window.devicePixelRatio || 1), cell = FAC_CELL;
    var W = f.w * cell, H = f.h * cell;
    if (facCanvas.width !== W * dpr) { facCanvas.width = W * dpr; facCanvas.height = H * dpr; facCanvas.style.width = W + 'px'; facCanvas.style.height = H + 'px'; }
    var x = facCtx; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#0c131c'; x.fillRect(0, 0, W, H);
    // グリッド線
    x.strokeStyle = 'rgba(120,160,200,0.08)'; x.lineWidth = 1;
    for (var gx = 0; gx <= f.w; gx++) { x.beginPath(); x.moveTo(gx * cell, 0); x.lineTo(gx * cell, H); x.stroke(); }
    for (var gy = 0; gy <= f.h; gy++) { x.beginPath(); x.moveTo(0, gy * cell); x.lineTo(W, gy * cell); x.stroke(); }
    var DX = G.FAC_DIR.DX, DY = G.FAC_DIR.DY;
    for (var cy = 0; cy < f.h; cy++) for (var cx = 0; cx < f.w; cx++) {
      var c = f.cells[cy * f.w + cx]; if (!c) continue;
      var px = cx * cell, py = cy * cell, mid = cell / 2;
      if (c.t === 'belt') {
        x.fillStyle = '#16202b'; x.fillRect(px + 2, py + 2, cell - 4, cell - 4);
        // 流れ方向のシェブロン（アニメ）
        x.strokeStyle = 'rgba(120,200,255,0.5)'; x.lineWidth = 2;
        var off = (T * 14) % 8, a = c.dir * Math.PI / 2;
        x.save(); x.translate(px + mid, py + mid); x.rotate(a);
        for (var ci = -1; ci <= 1; ci++) { var o = (ci * 10 + off) - 4; x.beginPath(); x.moveTo(-5, o - 4); x.lineTo(3, o); x.lineTo(-5, o + 4); x.stroke(); }
        x.restore();
        if (c.item) {   // 流れるアイテム
          var ix = px + mid + (DX[c.dir]) * (c.p - 0.5) * cell, iy = py + mid + (DY[c.dir]) * (c.p - 0.5) * cell;
          x.fillStyle = itemColor(c.item); x.beginPath(); x.arc(ix, iy, 5, 0, 7); x.fill();
          x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1; x.stroke();
        }
      } else {
        var d = G.MACH[c.t];
        var bg = c.t === 'gen' ? '#3a2a12' : c.t === 'lab' ? '#10322f' : d.cat === 'util' ? '#1a2436' : '#1d2c3c';
        x.fillStyle = bg; roundRect(x, px + 2, py + 2, cell - 4, cell - 4, 6); x.fill();
        x.strokeStyle = (facSel && facSel.x === cx && facSel.y === cy) ? '#ffd24a' : '#33506a'; x.lineWidth = (facSel && facSel.x === cx && facSel.y === cy) ? 2.5 : 1.2; x.stroke();
        // アイコン
        x.font = (cell * 0.5) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(d.icon, px + mid, py + mid + 1);
        // 出力方向の矢印（フロー機械）
        if (d.cat === 'flow' && c.t !== 'intake' || c.t === 'intake' || c.t === 'smelter' || c.t === 'fab' || c.t === 'assembler') {
          x.fillStyle = 'rgba(150,210,255,0.8)';
          var ax = px + mid + DX[c.dir] * (mid - 5), ay = py + mid + DY[c.dir] * (mid - 5);
          x.beginPath(); x.arc(ax, ay, 2.4, 0, 7); x.fill();
        }
        // 進捗バー
        if (d.ct) { var p = Math.min(1, (c.prog || 0) / d.ct); x.fillStyle = 'rgba(110,255,160,0.7)'; x.fillRect(px + 4, py + cell - 6, (cell - 8) * p, 3); }
        // 入力バッファのピップ
        var bufN = 0; if (c.inbuf) for (var bk in c.inbuf) bufN += c.inbuf[bk];
        if (bufN > 0) { x.fillStyle = '#cdd6e0'; x.font = '9px sans-serif'; x.textAlign = 'right'; x.fillText(Math.min(99, bufN), px + cell - 4, py + 9); }
        // ラベル（小）
        x.fillStyle = 'rgba(160,190,215,0.6)'; x.font = '8px sans-serif'; x.textAlign = 'center';
        var lbl = c.t === 'intake' ? (G.MAT_INFO[c.mat] ? G.MAT_INFO[c.mat].name : '') : c.t === 'fab' ? (c.part === 'body' ? 'ボディ' : c.part === 'head' ? 'ヘッド' : 'ウェポン') : c.t === 'assembler' ? (G.BODIES[c.body] ? G.BODIES[c.body].name : '') : '';
        if (lbl) x.fillText(lbl, px + mid, py + cell - 9);
      }
    }
  }
  function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }

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
    var s = Game.state, iron = s.mat.iron;
    // 生産タブ：建設コスト・鉄・電力
    if ($('tab-prod').classList.contains('active')) {
      document.querySelectorAll('[data-fcost]').forEach(function (el) { var c = Game.facCost(el.dataset.fcost); el.innerHTML = '⛓' + c; el.classList.toggle('nocash', iron < c); });
      var fi = $('fac-iron'); if (fi) fi.textContent = Math.floor(iron);
      var pw = Game.facPower(), fp = $('fac-pow'); if (fp) fp.textContent = pw.supply + '/' + Math.round(pw.demand);
      var fe = $('fac-eff'); if (fe) { fe.textContent = pw.eff < 0.999 ? ' 効率' + Math.round(pw.eff * 100) + '%' : ''; fe.className = pw.eff < 0.999 ? 'warn' : ''; }
    }
    // 鉱区：素材在庫・モジュール数・産出レート
    G.MATERIALS.forEach(function (k) { var el = $('mat-' + k); if (el) el.textContent = Math.floor(s.mat[k]); });
    var free = Game.freeModules();
    s.zones.forEach(function (zs, i) {
      var mEl = document.querySelector('[data-zmod="' + i + '"]'); if (mEl) mEl.textContent = zs.modules;
      var rEl = document.querySelector('[data-zrate="' + i + '"]');
      if (rEl) { var z = G.ZONES[i], r = zs.modules * z.rate * s.mod.mineMult; rEl.textContent = r > 0 ? '+' + r.toFixed(2) + '/s' : ''; }
      var pl = document.querySelector('[data-zplus="' + i + '"]'); if (pl) pl.disabled = free <= 0;
      var mn = document.querySelector('[data-zminus="' + i + '"]'); if (mn) mn.disabled = zs.modules <= 0;
    });
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
    return Object.keys(s.researched).length + '|' + s.tiers.head + s.tiers.body + s.tiers.weapon +
      '|' + s.zones.map(function (z) { return (z.unlocked ? 'u' : '') + z.modules; }).join('.');
  }
  var dirty = false;
  function markDirty() { dirty = true; }
  function rebuildAll() { buildZonePanel(); buildProdPanel(); buildTechPanel(); refreshNumbers(); lastSig = structureSig(); }

  // =======================================================================
  //  HUD
  // =======================================================================
  function refreshHUD() {
    var s = Game.state;
    $('ore-val').textContent = Math.floor(s.mat.iron); $('ore-cap').textContent = '/' + Game.matCap();
    $('res-val').textContent = Math.floor(s.research); $('res-rate').textContent = '+' + Game.researchRate().toFixed(1) + '/s';
    var sup = Game.powerSupply(), dem = Math.round(Game.powerDemand());
    $('pow-val').textContent = sup + '/' + dem;
    var eff = Game.powerEfficiency(), pe = $('pow-eff');
    if (eff < 0.999) { pe.textContent = '効率' + Math.round(eff * 100) + '%'; pe.className = 'warn'; } else { pe.textContent = ''; pe.className = ''; }
    $('mod-val').textContent = Math.floor(Game.freeModules()) + '/' + Game.moduleCap();
    $('cap-val').textContent = Game.capacityUsed() + '/' + Game.capacityMax();
    var ch = Game.currentChapter();
    if (ch && s.phase !== 'won') { $('chap-title').textContent = ch.title; $('wave-info').textContent = '第' + Math.min(s.wave + 1, ch.waves.length) + '波 / ' + ch.waves.length + (s.phase === 'battle' ? '　⚔交戦中' : '　待機'); }
    var hp = Math.max(0, s.hqHp) / s.hqHpMax, bar = $('hq-bar');
    bar.style.width = (hp * 100) + '%';
    bar.style.background = hp > 0.5 ? 'linear-gradient(90deg,#2ee08a,#7fffb0)' : hp > 0.25 ? 'linear-gradient(90deg,#e0b62e,#ffd86b)' : 'linear-gradient(90deg,#e02e3e,#ff7b7b)';
    $('hq-label').textContent = 'オールト HP ' + Math.max(0, Math.ceil(s.hqHp)) + '/' + s.hqHpMax;
    var wb = $('wave-btn'); wb.disabled = s.phase !== 'prep';
    var battle = s.phase === 'battle';
    $('app').classList.toggle('battling', battle);                                  // 戦闘中はアリーナを主役に
    $('app').classList.toggle('facmode', !battle && $('tab-prod').classList.contains('active'));
    var laySig = (battle ? 'b' : '') + ($('app').classList.contains('facmode') ? 'f' : '');
    if (laySig !== lastLaySig) { lastLaySig = laySig; resize(); }                   // レイアウト変化時にアリーナ解像度を更新
    var hb = $('home-btn'); hb.style.display = s.phase === 'prep' ? '' : 'none';
    var db = $('defense-btn'), navail = Game.defenseAvailable();
    db.style.display = (s.phase === 'prep' && navail > 0) ? '' : 'none';
    db.disabled = s.phase !== 'prep';
    $('phase-hint').textContent =
      (s.phase === 'battle' && s.battleMode === 'defense') ? '暫時防衛 交戦中　勝利で供給モジュールを獲得' :
      s.phase === 'prep' ? '生産ラインを敷き設計を整えて出撃（ユニットは戦闘中に射出）' :
      s.phase === 'battle' ? '組立機がリアルタイムに増援を戦場へ射出中' : '';
  }

  // =======================================================================
  //  キャンバス描画 ＋ エフェクト/パーティクル
  // =======================================================================
  var UNIT_COLOR = { infantry: '#6bd0ff', assault: '#ff9a4a', heavy: '#9b8bff', shooter: '#5be0a8', flyer: '#ffe06b' };
  var T = 0;                 // 演出用の経過時間
  var particles = [], tracers = [], rings = [];
  var shakeMag = 0, shakeT = 0, hqFlash = 0;
  var stars = [];

  function dprNow() { return Math.min(2, devicePixelRatio || 1); }
  function resize() {
    var r = canvas.getBoundingClientRect(), dpr = dprNow();
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    buildBackdrop();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function buildBackdrop() {
    stars = [];
    for (var i = 0; i < 130; i++) stars.push({ x: Math.random(), y: Math.random(), r: rand(0.4, 1.5), ph: rand(0, 6.28) });
  }
  // 中央(0,0)＝ドーム自陣のワールド座標 → 画面座標
  function geo() {
    var dpr = dprNow(), W = canvas.width, H = canvas.height;
    var scale = Math.min(W, H) * 0.46 / Game.constants.viewR;
    return { W: W, H: H, dpr: dpr, cx: W / 2, cy: H / 2, scale: scale };
  }
  function W2S(x, y, g) { return { x: g.cx + x * g.scale, y: g.cy + y * g.scale }; }
  var AIR_LIFT = 30;   // 空中ユニットの画面上の浮き（px、要×dpr）
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
  // 撃破時：そのキャラのドット絵を構成ピクセルに分解して飛散させる
  function shatter(spr, cx, cy, g, pxScale) {
    var px = pxScale * g.dpr, w = spr.w, h = spr.h;
    var step = (w * h > 170) ? 2 : 1, cnt = 0;
    for (var r = 0; r < h; r += step) {
      var row = spr.rows[r];
      for (var c = 0; c < w; c += step) {
        var ch = row.charAt(c); if (ch === '.') continue;
        var col = spr.pal[ch]; if (!col) continue;
        if (cnt++ > 90) return;
        var pxw = cx + (c - w / 2) * px, pyw = cy + (r - h / 2) * px;
        var dx = (pxw - cx), dy = (pyw - cy);
        var sp = (1.8 + Math.random() * 2.2);
        spawnParticle({ x: pxw, y: pyw, vx: dx * sp + rand(-30, 30) * g.dpr, vy: dy * sp - rand(40, 120) * g.dpr,
          g: 620, life: rand(0.5, 1.0), max: 1.0, size: px, color: col, debris: true });
      }
    }
  }

  // 視覚イベントを消費して演出を生成（ワールド座標→画面座標に変換）
  function consumeVfx(g) {
    var list = Game.state.vfx; if (!list || !list.length) return;
    var dpr = g.dpr, lift = AIR_LIFT * dpr;
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      if (ev.k === 'shot') {
        var col = ev.side === 'p' ? (UNIT_COLOR[ev.body] || '#6bd0ff') : ev.col;
        if (ev.crit) col = '#ffe06a';
        var p1 = W2S(ev.x1, ev.y1, g), p2 = W2S(ev.x2, ev.y2, g);
        burst(p1.x, p1.y, col, ev.crit ? 7 : 3, (ev.crit ? 150 : 90) * dpr, { g: 0, lifeMul: 0.4, glow: true, sizeMul: ev.crit ? 1.4 : 1 });
        var dd = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        tracers.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, t: 0, dur: Math.max(0.05, Math.min(0.16, dd / (900 * dpr))), color: col, w: ev.crit ? 3 : ev.kind === 'single' ? 2.2 : 1.8, hit: true });
      } else if (ev.k === 'beam') {
        var b1 = W2S(ev.x1, ev.y1, g), b2 = W2S(ev.x2, ev.y2, g);
        tracers.push({ x1: b1.x, y1: b1.y, x2: b2.x, y2: b2.y, t: 0, dur: 0.16, color: '#8fe0ff', beam: true, w: 2.4, hit: true, hitcol: '#8fe0ff' });
      } else if (ev.k === 'arc') {
        var a1 = W2S(ev.x1, ev.y1, g), a2 = W2S(ev.x2, ev.y2, g);
        tracers.push({ x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, t: 0, dur: 0.2, color: '#9af0ff', arc: true, w: 2 });
      } else if (ev.k === 'blast') {
        var bp = W2S(ev.x, ev.y, g);
        rings.push({ x: bp.x, y: bp.y, r: 5 * dpr, r1: ev.r * g.scale, life: 0.34, max: 0.34, color: '#ffd24a', w: 2.5 });
        burst(bp.x, bp.y, '#ffcf6b', 10, 150 * dpr, { glow: true, sizeMul: 1.1 });
      } else if (ev.k === 'boom') {
        var ep = W2S(ev.x, ev.y, g), ey = ep.y - (ev.a ? lift : 0), big = ev.big;
        rings.push({ x: ep.x, y: ey, r: 4 * dpr, r1: (big ? 70 : ev.ally ? 22 : 30) * dpr, life: big ? 0.5 : 0.32, max: 0.5, color: ev.ally ? '#bfe6ff' : '#ffd0a0', w: big ? 4 : 2 });
        burst(ep.x, ey, ev.col || '#ff8a6a', big ? 18 : ev.ally ? 5 : 8, (big ? 280 : 180) * dpr, { sizeMul: big ? 1.6 : 1, glow: true });
        spawnParticle({ x: ep.x, y: ey, vx: 0, vy: -10 * dpr, g: -20, life: big ? 0.6 : 0.35, max: 0.6, size: (big ? 26 : 13) * dpr, color: 'rgba(255,255,255,0.9)', flash: true });
        var sspr = ev.spr ? (ev.ally ? G.unitFrame(ev.spr, ev.grade || 1) : G.SPRITES[ev.spr]) : null;
        if (sspr) shatter(sspr, ep.x, ey, g, big ? 2.4 : ev.ally ? 1.7 : 1.9);
        if (big) addShake(9 * dpr, 0.4); else if (!ev.ally) addShake(2.2 * dpr, 0.12);
      } else if (ev.k === 'hqhit') {
        var hpx = W2S(ev.x, ev.y, g); hqFlash = 1; addShake(6 * dpr, 0.28);
        rings.push({ x: hpx.x, y: hpx.y, r: 4 * dpr, r1: 34 * dpr, life: 0.3, max: 0.3, color: '#ff5a5a', w: 3 });
      } else if (ev.k === 'spawn') {
        var sp2 = W2S(ev.x, ev.y, g), sy = sp2.y - (ev.a ? lift : 0);
        rings.push({ x: sp2.x, y: sy, r: 2 * dpr, r1: 16 * dpr, life: 0.3, max: 0.3, color: UNIT_COLOR[ev.body] || '#8fd', w: 1.6 });
        burst(sp2.x, sy, UNIT_COLOR[ev.body] || '#8fd', 6, 70 * dpr, { up: 40 * dpr, g: 120, glow: true });
      } else if (ev.k === 'heal') {
        var hl = W2S(ev.x, ev.y, g);
        for (var hh = 0; hh < 4; hh++) spawnParticle({ x: hl.x + rand(-6, 6) * dpr, y: hl.y - rand(0, 8) * dpr, vx: rand(-7, 7) * dpr, vy: -rand(28, 58) * dpr, g: -30, life: rand(0.4, 0.7), max: 0.7, size: rand(1.4, 2.4) * dpr, color: '#6bff9e', glow: true });
      } else if (ev.k === 'stun') {
        var su = W2S(ev.x, ev.y, g);
        for (var kk = 0; kk < 5; kk++) { var sa = rand(0, 6.28); spawnParticle({ x: su.x, y: su.y - 10 * dpr, vx: Math.cos(sa) * 45 * dpr, vy: Math.sin(sa) * 45 * dpr - 20 * dpr, g: 80, life: rand(0.3, 0.5), max: 0.5, size: rand(1.2, 2.2) * dpr, color: '#ffe06a', glow: true }); }
      } else if (ev.k === 'boss') {
        showCutin(ev.jp || '警告　巨核接近', ev.en || 'WARNING : TITAN', 'boss', 2800);
        addShake(6 * dpr, 0.5);
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

  // ---- 描画本体（トップダウン・アリーナ） ----
  function draw() {
    var s = Game.state, g = geo(), W = g.W, H = g.H, dpr = g.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shakeMag > 0) ctx.translate(rand(-shakeMag, shakeMag), rand(-shakeMag, shakeMag));

    drawArena(g, s);
    drawHQ(g, s);
    var turrets = G.Factory.count(s.factory, 'turret');
    for (var t = 0; t < turrets; t++) drawTurret(g, (t / Math.max(turrets, 1)) * 6.2832 + T * 0.2);

    // 影（全体）→ 本体（画面Y＝奥行きでソート、手前を後描き）
    s.enemies.forEach(function (e) { drawShadow(e, G.ENEMIES[e.type], g); });
    s.units.forEach(function (u) { drawShadow(u, u.stats, g); });
    var ents = s.enemies.concat(s.units);
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (ent) { if (ent.side === 'e') drawEnemy(ent, G.ENEMIES[ent.type], g); else drawUnit(ent, ent.stats, g); });

    drawTracers(dpr); drawRings(); drawParticles();

    if (hqFlash > 0) { ctx.fillStyle = 'rgba(255,40,40,' + (hqFlash * 0.28) + ')'; ctx.fillRect(0, 0, W, H); }
    drawVignette(g);
    if (s.phase === 'prep') {
      ctx.fillStyle = 'rgba(150,180,210,' + (0.35 + 0.12 * Math.sin(T * 2)) + ')';
      ctx.font = '700 ' + (13 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('◇ 準備フェーズ — 生産ラインを構築せよ ◇', W / 2, 22 * dpr);
    }
    ctx.restore();
  }

  function drawArena(g, s) {
    var W = g.W, H = g.H, dpr = g.dpr, cx = g.cx, cy = g.cy;
    var bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.6);
    bg.addColorStop(0, '#10141f'); bg.addColorStop(1, '#06080e'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // 宙の星
    for (var i = 0; i < stars.length; i++) { var st = stars[i], a = 0.25 + 0.4 * Math.sin(T * 1.3 + st.ph); ctx.fillStyle = 'rgba(200,220,255,' + Math.max(0, a) + ')'; ctx.fillRect(st.x * W, st.y * H, st.r * dpr, st.r * dpr); }
    var R = Game.constants.viewR * g.scale;
    // アリーナ床
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    var fg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R); fg.addColorStop(0, '#1a2230'); fg.addColorStop(1, '#0e1119'); ctx.fillStyle = fg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.strokeStyle = 'rgba(90,120,150,0.12)'; ctx.lineWidth = 1 * dpr;
    for (var rr = 1; rr <= 4; rr++) { ctx.beginPath(); ctx.arc(cx, cy, R * rr / 4, 0, 7); ctx.stroke(); }
    for (var k = 0; k < 12; k++) { var aa = k / 12 * 6.2832; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(aa) * R, cy + Math.sin(aa) * R); ctx.stroke(); }
    ctx.restore();
    // 敵出現リング（危険帯・脈動）
    var SR = Game.constants.spawnR * g.scale;
    ctx.strokeStyle = 'rgba(255,70,70,' + (0.3 + 0.18 * Math.sin(T * 2.5)) + ')'; ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([6 * dpr, 8 * dpr]); ctx.lineDashOffset = -(T * 20 * dpr);
    ctx.beginPath(); ctx.arc(cx, cy, SR, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    // アリーナ外縁
    ctx.strokeStyle = 'rgba(80,120,160,0.4)'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  }
  function drawTurret(g, ang) {
    var dpr = g.dpr, dr = Game.constants.domeR * g.scale;
    var x = g.cx + Math.cos(ang) * (dr + 6 * dpr), y = g.cy + Math.sin(ang) * (dr + 6 * dpr);
    ctx.fillStyle = '#243f56'; ctx.strokeStyle = '#7fd1ff'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.arc(x, y, 5 * dpr, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * 9 * dpr, y + Math.sin(ang) * 9 * dpr); ctx.stroke();
  }
  function drawHQ(g, s) {
    var dpr = g.dpr, cx = g.cx, cy = g.cy, dr = Game.constants.domeR * g.scale, hp = Math.max(0, s.hqHp) / s.hqHpMax;
    var edge = hp > 0.5 ? '#3fa9ff' : hp > 0.25 ? '#ffcf5a' : '#ff5d5d';
    var gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, dr * 1.6); gl.addColorStop(0, 'rgba(60,170,255,0.22)'); gl.addColorStop(1, 'rgba(60,170,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - dr * 1.6, cy - dr * 1.6, dr * 3.2, dr * 3.2);
    var dg = ctx.createRadialGradient(cx - dr * 0.3, cy - dr * 0.35, 2, cx, cy, dr); dg.addColorStop(0, '#2f6088'); dg.addColorStop(1, '#0e2233');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(cx, cy, dr, 0, 7); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 2.5 * dpr; ctx.stroke();
    ctx.strokeStyle = 'rgba(150,205,255,0.28)'; ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.arc(cx, cy, dr * 0.6, 0, 7); ctx.moveTo(cx - dr, cy); ctx.lineTo(cx + dr, cy); ctx.moveTo(cx, cy - dr); ctx.lineTo(cx, cy + dr); ctx.stroke();
    ctx.fillStyle = 'rgba(130,205,255,' + (0.5 + 0.3 * Math.sin(T * 3)) + ')'; ctx.beginPath(); ctx.arc(cx, cy, dr * 0.2, 0, 7); ctx.fill();
    // HPリング
    ctx.strokeStyle = edge; ctx.lineWidth = 3 * dpr;
    ctx.beginPath(); ctx.arc(cx, cy, dr + 4 * dpr, -Math.PI / 2, -Math.PI / 2 + hp * 6.2832); ctx.stroke();
  }

  function spriteOf(ent) { return ent.side === 'e' ? G.SPRITES['e_' + ent.type] : G.unitFrame(ent.stats.body, ent.stats.grade); }
  function pxOf(ent, spec, dpr) { return (spec.boss ? 2.4 : ent.side === 'e' ? 1.9 : 1.7) * dpr; }

  function drawShadow(ent, spec, g) {
    var spr = spriteOf(ent); if (!spr) return;
    var sp = W2S(ent.x, ent.y, g), px = pxOf(ent, spec, g.dpr), hw = spr.w * px * 0.34;
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 2 * g.dpr, hw, hw * 0.4, 0, 0, 7); ctx.fill();
  }
  function ensurePhase(ent) { if (ent._ph === undefined) { ent._ph = rand(0, 6.28); ent._px = ent.x; ent._py = ent.y; ent._flip = false; } }

  // ドット絵スプライト描画。cx=中心X / footY=下端Y / px=1ドット / flip=左右反転
  // legPhase!=null で歩行モーション（脚の振り）/ tint で全ピクセルを単色化（被弾フラッシュ）
  function drawSprite(spr, cx, footY, px, flip, legPhase, tint) {
    var w = spr.w, h = spr.h, x0 = cx - (w * px) / 2, sz = Math.ceil(px) + 1;
    if (tint) ctx.fillStyle = tint;
    for (var r = 0; r < h; r++) {
      var row = spr.rows[r], legs = (legPhase != null && r >= h - 2);
      var sw = legs ? Math.sin(legPhase) * px * 0.7 : 0;
      var py = Math.floor(footY - (h - r) * px);
      for (var c = 0; c < w; c++) {
        var ch = row.charAt(c); if (ch === '.' || ch === ' ') continue;
        var col = spr.pal[ch]; if (!col) continue;
        var gc = flip ? (w - 1 - c) : c;
        var sh = legs ? (gc < w / 2 ? sw : -sw) : 0;
        if (!tint) ctx.fillStyle = col;
        ctx.fillRect(Math.floor(x0 + gc * px + sh), py, sz, sz);
      }
    }
  }
  // 兵科ごとの待機モーション特性 [周波数, 振幅]
  var IDLE = { infantry: [2.2, 0.5], assault: [3.4, 0.9], heavy: [1.4, 0.35], shooter: [1.8, 0.4], flyer: [3, 1] };
  var FIRE_DUR = 0.17, HIT_DUR = 0.13;
  function fireOffset(st, ent, dpr) {
    if (!ent.fireT || ent.fireT <= 0) return 0;
    var p = 1 - ent.fireT / FIRE_DUR, melee = st.range < 70;
    return (melee ? 1 : -1) * Math.sin(p * Math.PI) * (melee ? 5 : 3) * dpr; // melee=前へ踏込/ranged=反動
  }

  var WK_COLOR = { single: '#eaf6ff', aoe: '#ffd24a', chain: '#7fe0ff' };
  function gradeColor(gr) { return gr >= 5 ? '#9af0ff' : gr >= 3 ? '#ffd24a' : '#d7e2ee'; }

  // 追加装甲・武器形状は専用フレームに内包。ここでは武装種の発光チップと階級章のみ。
  function drawGradeDecor(st, x, topY, midBodyY, px, dpr, spr, flip) {
    var gr = st.grade || 1, wg = st.wgrade || 1, hw = spr.w * px / 2;
    // 武装種を示すマズル発光（向いている側）。グレードで強さが増す。
    var wcol = WK_COLOR[st.weapon.kind] || '#eaf6ff';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 + 0.1 * wg;
    ctx.fillStyle = wcol;
    ctx.beginPath(); ctx.arc(x + (flip ? -1 : 1) * (hw + 2 * dpr), midBodyY, (1.4 + wg * 0.5) * dpr, 0, 7); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
    // 階級章（シェブロン）: グレード-1個
    var n = Math.min(gr - 1, 5);
    for (var i = 0; i < n; i++) {
      var cxk = x - (n - 1) * 2.4 * dpr + i * 4.8 * dpr, cyk = topY - px * 1.4;
      ctx.strokeStyle = gradeColor(gr); ctx.lineWidth = 1.4 * dpr;
      ctx.beginPath(); ctx.moveTo(cxk - 2 * dpr, cyk + 2 * dpr); ctx.lineTo(cxk, cyk); ctx.lineTo(cxk + 2 * dpr, cyk + 2 * dpr); ctx.stroke();
    }
  }
  function drawAura(x, cy, rad, col) {
    var rg = ctx.createRadialGradient(x, cy, 2, x, cy, rad);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg;
    ctx.fillRect(x - rad, cy - rad, rad * 2, rad * 2); ctx.restore();
  }

  // グレードⅢ専用：残像＋立ち上るオーラ粒子（精鋭演出）
  function eliteFx(ent, st, gr, spr, drawX, footY, px, dpr, air, legPhase, moving) {
    if (gr < 3) return;
    if (moving) { // 残像（後方＝左へ尾を引く）
      ctx.save();
      ctx.globalAlpha = 0.20; drawSprite(spr, drawX - 4 * dpr, footY, px, false, legPhase);
      ctx.globalAlpha = 0.10; drawSprite(spr, drawX - 8 * dpr, footY, px, false, legPhase);
      ctx.restore();
    }
    if (Math.random() < 0.22) { // オーラ粒子
      var hw = spr.w * px / 2;
      spawnParticle({ x: drawX + rand(-hw, hw), y: footY - rand(0, spr.h * px), vx: rand(-6, 6) * dpr, vy: -rand(18, 42) * dpr,
        g: -8, life: rand(0.4, 0.85), max: 0.85, size: rand(1, 2.2) * dpr, color: gradeColor(gr), glow: true });
    }
  }

  function drawUnit(ent, st, g) {
    ensurePhase(ent);
    var dpr = g.dpr, air = st.domain === 'air';
    var dx = ent.x - ent._px, dy = ent.y - ent._py, moving = (dx * dx + dy * dy) > 0.0004;
    if (moving && Math.abs(dx) > 0.02) ent._flip = dx < 0;   // 進行方向へ向く（自軍は基本右向き）
    ent._px = ent.x; ent._py = ent.y;
    var spr = G.unitFrame(st.body, st.grade) || G.SPRITES.infantry, px = 1.7 * dpr, gr = st.grade || 1, flip = ent._flip;
    var sp = W2S(ent.x, ent.y, g), idle = IDLE[st.body] || [2, 0.5];
    var bob = moving ? Math.abs(Math.sin(T * 9 + ent._ph)) * 1.1 * dpr : Math.sin(T * idle[0] + ent._ph) * idle[1] * dpr;
    var footY = sp.y - (air ? AIR_LIFT * dpr : 0) - bob;
    var drawX = sp.x + fireOffset(st, ent, dpr) * (flip ? -1 : 1);
    var topY = footY - spr.h * px, midBodyY = footY - spr.h * px * 0.5;
    var legPhase = (!air && moving) ? (T * 9 + ent._ph) : null;
    var flash = ent.hitT > 0 ? (ent.hitT / HIT_DUR) * 0.55 : 0;
    if (air) {
      ctx.strokeStyle = 'rgba(150,180,210,0.18)'; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(sp.x, footY + spr.h * px * 0.5); ctx.lineTo(sp.x, sp.y); ctx.stroke();
      var fl = 0.45 + 0.4 * Math.abs(Math.sin(T * 26 + ent._ph));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,205,255,' + fl + ')';
      ctx.beginPath(); ctx.ellipse(sp.x, footY + 2 * dpr, 4 * dpr * fl, 1.6 * dpr, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    if (gr >= 3) drawAura(drawX, midBodyY, spr.w * px * (0.5 + 0.05 * gr), 'rgba(255,210,90,' + (0.05 * (gr - 1)) + ')');
    eliteFx(ent, st, gr, spr, drawX, footY, px, dpr, air, legPhase, moving);
    drawSprite(spr, drawX, footY, px, flip, legPhase);
    if (flash) { ctx.save(); ctx.globalAlpha = flash; drawSprite(spr, drawX, footY, px, flip, legPhase, '#ffffff'); ctx.restore(); }
    drawGradeDecor(st, drawX, topY, midBodyY, px, dpr, spr, flip);
    hpBar(ent, sp.x, topY - 3 * dpr, 10 * dpr, dpr, false);
  }
  function drawEnemy(ent, spec, g) {
    ensurePhase(ent);
    var dpr = g.dpr, air = spec.domain === 'air';
    var dx = ent.x - ent._px, dy = ent.y - ent._py, moving = (dx * dx + dy * dy) > 0.0004;
    if (moving && Math.abs(dx) > 0.02) ent._flip = dx > 0;   // 敵スプライトは基本左向き
    ent._px = ent.x; ent._py = ent.y;
    var spr = G.SPRITES['e_' + ent.type] || G.SPRITES.e_swarmling, flip = ent._flip;
    var pulse = 1 + Math.sin(T * 6 + ent._ph) * 0.06, px = (spec.boss ? 2.4 : 1.9) * dpr * pulse;
    var sp = W2S(ent.x, ent.y, g);
    var hpf = ent.hitT > 0 ? ent.hitT / HIT_DUR : 0;
    var kb = hpf > 0 ? Math.sin(hpf * Math.PI) * (spec.boss ? 2 : 3.5) * dpr : 0;
    var bob = Math.sin(T * 4 + ent._ph) * (air ? 2.5 : 0.6) * dpr;
    var footY = sp.y - (air ? AIR_LIFT * dpr : 0) - bob;
    var drawX = sp.x + kb * (flip ? -1 : 1), flash = hpf * (spec.boss ? 0.45 : 0.6);
    if (air) { ctx.strokeStyle = 'rgba(255,150,190,0.16)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(sp.x, footY + spr.h * px * 0.5); ctx.lineTo(sp.x, sp.y); ctx.stroke(); }
    if (spec.boss) {
      var gy = footY - spr.h * px * 0.5;
      var rg = ctx.createRadialGradient(drawX, gy, 2, drawX, gy, spr.w * px * 0.8);
      rg.addColorStop(0, 'rgba(255,90,50,0.40)'); rg.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg;
      ctx.fillRect(drawX - spr.w * px, gy - spr.h * px, spr.w * px * 2, spr.h * px * 2); ctx.restore();
    }
    if (ent.slowT > 0 && !(ent.stunT > 0)) drawAura(drawX, footY - spr.h * px * 0.5, spr.w * px * 0.75, 'rgba(90,170,255,0.30)');  // 鈍化
    drawSprite(spr, drawX, footY, px, flip, null);
    if (flash) { ctx.save(); ctx.globalAlpha = flash; drawSprite(spr, drawX, footY, px, flip, null, '#ffffff'); ctx.restore(); }
    if (ent.stunT > 0) {   // 麻痺：頭上で回る星
      var sy2 = footY - spr.h * px - 6 * dpr;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffe06a';
      for (var st2 = 0; st2 < 3; st2++) { var ang2 = T * 9 + st2 * 2.094; ctx.beginPath(); ctx.arc(drawX + Math.cos(ang2) * 6 * dpr, sy2 + Math.sin(ang2) * 2 * dpr, 1.6 * dpr, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    hpBar(ent, sp.x, footY - spr.h * px - 3 * dpr, (spec.boss ? 20 : 10) * dpr, dpr, true);
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
    var i, p, a;
    // 破片（ドット）は不透明の四角で描く
    for (i = 0; i < particles.length; i++) {
      p = particles[i]; if (!p.debris) continue;
      a = Math.max(0, p.life / p.max); ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.fillStyle = p.color; ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
    }
    ctx.globalAlpha = 1;
    // 発光系は加算合成
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < particles.length; i++) {
      p = particles[i]; if (p.debris) continue;
      a = Math.max(0, p.life / p.max); ctx.globalAlpha = a;
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
  function activateTab(name) {
    $('tabs').querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x.dataset.tab === name); });
    document.querySelectorAll('.tab-body').forEach(function (x) { x.classList.remove('active'); });
    var body = $('tab-' + name); if (body) body.classList.add('active');
    $('app').classList.toggle('facmode', name === 'prod');   // 生産ラインは広く表示（戦場を縮小）
  }
  function bindTabs() {
    $('tabs').querySelectorAll('button').forEach(function (b) { b.onclick = function () { activateTab(b.dataset.tab); }; });
    $('wave-btn').onclick = function () { Game.startBattle(); };
    $('defense-btn').onclick = openDefenseMenu;
    $('home-btn').onclick = openHome;
    bindHome();
    // VN会話劇：本文クリックで送り、スキップで即終了
    var vn = $('vn');
    vn.onclick = function (e) { if (e.target.classList.contains('vn-skip')) { endStory(); return; } vnAdvance(); };
  }

  // ---- メインループ ------------------------------------------------------
  function loop(ts) {
    var dt = lastTime ? (ts - lastTime) / 1000 : 0; lastTime = ts;
    if (dt > 0.1) dt = 0.1;
    Game.update(dt); handlePhase();
    stepFX(dt, geo()); draw(); drawFactory();
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
    Game.newGame(); resize(); bindTabs(); rebuildAll(); preloadPortraits();
    log('ケイオス、起動。生産ラインを構築し、押し寄せる襲撃を迎え撃て。');
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})(window.G = window.G || {});
