/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - UI / 描画 / 入力 / メインループ
 * ========================================================================= */
(function (G) {
  'use strict';
  var Game = G.Game;
  var $ = function (id) { return document.getElementById(id); };

  var canvas, ctx, lastTime = 0, lastHudT = 0;
  var modalCallback = null;

  // ---- ログ --------------------------------------------------------------
  var logLines = [];
  function log(msg) {
    logLines.unshift(msg);
    if (logLines.length > 6) logLines.pop();
    $('log').innerHTML = logLines
      .map(function (l, i) { return '<div class="' + (i === 0 ? 'l0' : 'll') + '">▸ ' + l + '</div>'; })
      .join('');
  }

  // ---- モーダル ----------------------------------------------------------
  function showModal(title, body, choices, okLabel, cb, cls) {
    $('modal-title').textContent = title;
    $('modal-body').textContent = body || '';
    $('modal').className = cls || '';
    var cbox = $('modal-choices');
    cbox.innerHTML = '';
    var ok = $('modal-ok');
    if (choices && choices.length) {
      ok.style.display = 'none';
      choices.forEach(function (opt, idx) {
        var b = document.createElement('button');
        b.innerHTML = '<span class="opt-label">' + opt.label + '</span>' +
                      '<span class="opt-desc">' + opt.desc + '</span>';
        b.onclick = function () { hideModal(); cb(idx); };
        cbox.appendChild(b);
      });
    } else {
      ok.style.display = '';
      ok.textContent = okLabel || '続ける ▶';
      modalCallback = cb;
    }
    $('overlay').classList.remove('hidden');
  }
  function hideModal() { $('overlay').classList.add('hidden'); modalCallback = null; }
  $('modal-ok').onclick = function () { var cb = modalCallback; hideModal(); if (cb) cb(); };

  // ---- 画面遷移（フェーズに応じたモーダル制御） --------------------------
  var lastPhase = null;
  function handlePhase() {
    var s = Game.state;
    if (s.phase === lastPhase) return;
    lastPhase = s.phase;

    if (s.phase === 'intro') {
      var ch = Game.currentChapter();
      showModal(ch.title, s.pendingStory, null, '防衛を開始 ▶', function () { Game.afterIntro(); }, '');
    } else if (s.phase === 'story') {
      showModal('― 戦域記録 ―', s.pendingStory, null, '次へ ▶', function () { Game.afterOutro(); }, '');
    } else if (s.phase === 'choice') {
      var c = s.pendingChoice;
      showModal('決断', c.prompt, c.options, null, function (idx) {
        Game.applyChoice(c.options[idx]);
        log('方針決定：' + c.options[idx].label);
      }, '');
    } else if (s.phase === 'won') {
      showModal('防衛成功', '全ての群体を退けた。基地カストルは陥落しなかった。\n\n――だが、戦線はまだ終わらない。',
        null, 'もう一度遊ぶ ↻', function () { restart(); }, 'win');
    } else if (s.phase === 'lost') {
      showModal('司令部 陥落', '防衛線は突破され、司令部は沈黙した。\n群体は基地を呑み込んでいく……',
        null, '再起動 ↻', function () { restart(); }, 'lose');
    } else if (s.phase === 'prep') {
      log('準備フェーズ：建設・建造・研究を進め、「次の波を呼ぶ」で出撃。');
    } else if (s.phase === 'battle') {
      log('交戦開始！　第' + (s.wave + 1) + '波');
    }
  }

  function restart() { Game.newGame(); lastPhase = null; buildBuildPanel(); buildProducePanel(); buildTechPanel(); }

  // =======================================================================
  //  パネル構築
  // =======================================================================
  function costSpan(amount, kind) {
    var cls = kind === 'cap' ? 'cost-cap' : kind === 'res' ? 'cost-res' : 'cost-ore';
    var ic = kind === 'cap' ? '📡' : kind === 'res' ? '🔬' : '⛏';
    return '<span class="' + cls + '">' + ic + amount + '</span>';
  }

  // 建設タブ
  function buildBuildPanel() {
    var wrap = $('tab-build');
    wrap.innerHTML = '<div class="cards" id="build-cards"></div>';
    var grid = $('build-cards');
    Object.keys(G.BUILDINGS).forEach(function (id) {
      var b = G.BUILDINGS[id];
      var card = document.createElement('div');
      card.className = 'card';
      card.dataset.bid = id;
      var powerTxt = b.power > 0 ? '+' + b.power + '電力' : (b.power < 0 ? b.power + '電力' : '');
      var extra = [];
      if (b.ore) extra.push('+' + b.ore + '鉱石/s');
      if (b.research) extra.push('+' + b.research + '研究/s');
      if (b.oreCap) extra.push('貯蔵+' + b.oreCap);
      if (b.capacity) extra.push('指揮+' + b.capacity);
      if (b.slot) extra.push('生産ライン+1');
      card.innerHTML =
        '<div class="h"><span class="ci">' + b.icon + '</span><span class="nm">' + b.name + '</span>' +
        '<span class="ct" data-count></span></div>' +
        '<div class="ds">' + b.desc + '</div>' +
        '<div class="meta">' + (powerTxt ? '<span>' + powerTxt + '</span>' : '') +
        extra.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</div>' +
        '<button data-buy>建設 <span data-cost></span></button>';
      card.querySelector('[data-buy]').onclick = function () {
        if (Game.buyBuilding(id)) { log(b.name + 'を建設した。'); refreshBuildPanel(); }
      };
      grid.appendChild(card);
    });
    refreshBuildPanel();
  }
  function refreshBuildPanel() {
    var s = Game.state;
    var cards = $('tab-build').querySelectorAll('.card');
    cards.forEach(function (card) {
      var id = card.dataset.bid;
      var cost = Game.buildingCost(id);
      card.querySelector('[data-count]').textContent = '×' + (s.buildings[id] || 0);
      card.querySelector('[data-cost]').innerHTML = costSpan(cost, 'ore');
      card.querySelector('[data-buy]').disabled = s.ore < cost;
    });
  }

  // 建造タブ
  function buildProducePanel() {
    var grid = $('produce-list');
    grid.className = 'cards';
    grid.innerHTML = '';
    Object.keys(G.UNITS).forEach(function (id) {
      var u = G.UNITS[id];
      var card = document.createElement('div');
      card.className = 'card';
      card.dataset.uid = id;
      var domLabel = u.domain === 'air' ? '空' : '地';
      var tags = domLabel + (u.antiAir ? '・対空' : '');
      card.innerHTML =
        '<div class="h"><span class="ci">' + u.icon + '</span><span class="nm">' + u.name + '</span>' +
        '<span class="ct">[' + tags + ']</span></div>' +
        '<div class="ds">' + u.desc + '</div>' +
        '<div class="meta"><span>HP' + u.hp + '</span><span>攻' + u.dmg + '</span>' +
        '<span>防' + u.def + '</span><span>射' + u.range + '</span>' +
        '<span>速' + u.speed + '</span><span>建造' + u.build + 's</span></div>' +
        '<button data-make>建造 ' + costSpan(u.cost, 'ore') + ' ' + costSpan(u.cap, 'cap') + '</button>' +
        '<div class="lockmsg" data-lock></div>';
      card.querySelector('[data-make]').onclick = function () {
        if (Game.enqueueUnit(id)) { refreshProducePanel(); }
        else { flash(card); }
      };
      grid.appendChild(card);
    });
    $('clear-queue').onclick = function () { Game.clearQueue(); refreshProducePanel(); };
    refreshProducePanel();
  }
  function flash(card) { card.style.outline = '1px solid var(--bad)'; setTimeout(function () { card.style.outline = ''; }, 250); }

  function refreshProducePanel() {
    var s = Game.state;
    var cards = $('produce-list').querySelectorAll('.card');
    cards.forEach(function (card) {
      var id = card.dataset.uid;
      var u = G.UNITS[id];
      var unlocked = !!s.unlocked[id];
      card.classList.toggle('locked', !unlocked);
      var lock = card.querySelector('[data-lock]');
      var btn = card.querySelector('[data-make]');
      if (!unlocked) {
        lock.textContent = '🔒 研究で解放';
        btn.disabled = true;
      } else {
        lock.textContent = '';
        var capOk = Game.capacityUsed() + u.cap <= Game.capacityMax();
        btn.disabled = s.ore < u.cost || !capOk;
      }
    });
    // キュー表示
    var ql = $('queue-list');
    var items = [];
    s.lines.forEach(function (line) { if (line) items.push({ id: line.unitId, active: true }); });
    s.queue.forEach(function (id) { items.push({ id: id, active: false }); });
    if (items.length === 0) { ql.innerHTML = '<span style="color:var(--dim);font-size:11px">（空）</span>'; }
    else {
      ql.innerHTML = items.map(function (it) {
        return '<span class="qchip' + (it.active ? ' active' : '') + '">' + G.UNITS[it.id].icon + '</span>';
      }).join('');
    }
  }

  // 研究タブ
  function buildTechPanel() {
    var wrap = $('tab-tech');
    var branches = { '工業': [], '軍事': [], '特殊': [] };
    Object.keys(G.TECHS).forEach(function (id) { branches[G.TECHS[id].branch].push(id); });
    wrap.innerHTML = '';
    Object.keys(branches).forEach(function (br) {
      var sec = document.createElement('div');
      sec.innerHTML = '<div class="branch-tag">' + br + '系</div>';
      var grid = document.createElement('div');
      grid.className = 'cards';
      branches[br].forEach(function (id) {
        var t = G.TECHS[id];
        var card = document.createElement('div');
        card.className = 'card';
        card.dataset.tid = id;
        var reqTxt = t.req.length ? '前提: ' + t.req.map(function (r) { return G.TECHS[r].name; }).join('・') : '';
        card.innerHTML =
          '<div class="h"><span class="nm">' + t.name + '</span></div>' +
          '<div class="ds">' + t.desc + (reqTxt ? '<br><span style="color:#566">' + reqTxt + '</span>' : '') + '</div>' +
          '<button data-tech>研究 ' + costSpan(t.cost, 'res') + '</button>';
        card.querySelector('[data-tech]').onclick = function () {
          if (Game.doResearch(id)) {
            log('研究完了：' + t.name);
            buildTechPanel(); refreshProducePanel();
          }
        };
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
    refreshTechPanel();
  }
  function refreshTechPanel() {
    var s = Game.state;
    $('tab-tech').querySelectorAll('.card').forEach(function (card) {
      var id = card.dataset.tid;
      var done = !!s.researched[id];
      card.classList.toggle('tech-done', done);
      var btn = card.querySelector('[data-tech]');
      if (done) { btn.disabled = true; btn.textContent = '✓ 研究済'; }
      else { btn.disabled = !Game.canResearch(id); }
    });
  }

  // =======================================================================
  //  HUD 更新
  // =======================================================================
  function refreshHUD() {
    var s = Game.state;
    $('ore-val').textContent = Math.floor(s.ore);
    $('ore-cap').textContent = '/' + Game.oreCap();
    $('ore-rate').textContent = '+' + Game.oreRate().toFixed(1) + '/s';
    $('res-val').textContent = Math.floor(s.research);
    $('res-rate').textContent = '+' + Game.researchRate().toFixed(1) + '/s';
    var sup = Game.powerSupply(), dem = Math.round(Game.powerDemand());
    $('pow-val').textContent = sup + '/' + dem;
    var eff = Game.powerEfficiency();
    var pe = $('pow-eff');
    if (eff < 0.999) { pe.textContent = '効率' + Math.round(eff * 100) + '%'; pe.className = 'warn'; }
    else { pe.textContent = ''; pe.className = ''; }
    $('cap-val').textContent = Game.capacityUsed() + '/' + Game.capacityMax();

    var ch = Game.currentChapter ? Game.currentChapter() : null;
    if (ch && s.phase !== 'won') {
      $('chap-title').textContent = ch.title;
      $('wave-info').textContent = '第' + Math.min(s.wave + 1, ch.waves.length) + '波 / ' + ch.waves.length +
        (s.phase === 'battle' ? '　⚔交戦中' : '　待機');
    }

    // 司令部HPバー
    var hp = Math.max(0, s.hqHp) / s.hqHpMax;
    var bar = $('hq-bar');
    bar.style.width = (hp * 100) + '%';
    bar.style.background = hp > 0.5 ? 'linear-gradient(90deg,#2ee08a,#7fffb0)'
      : hp > 0.25 ? 'linear-gradient(90deg,#e0b62e,#ffd86b)'
      : 'linear-gradient(90deg,#e02e3e,#ff7b7b)';
    $('hq-label').textContent = '司令部 HP ' + Math.max(0, Math.ceil(s.hqHp)) + '/' + s.hqHpMax;

    // 出撃ボタン
    var wb = $('wave-btn');
    wb.disabled = s.phase !== 'prep';
    $('phase-hint').textContent =
      s.phase === 'prep' ? '次に来る波に備えて編成を整えよう（相性に注意）' :
      s.phase === 'battle' ? '生産は戦闘中も継続。前線へ増援を送れ' : '';
  }

  // =======================================================================
  //  キャンバス描画
  // =======================================================================
  function resize() {
    var r = canvas.getBoundingClientRect();
    canvas.width = r.width * devicePixelRatio;
    canvas.height = r.height * devicePixelRatio;
  }
  function draw() {
    var s = Game.state;
    var W = canvas.width, H = canvas.height, dpr = devicePixelRatio;
    ctx.clearRect(0, 0, W, H);
    var LANE = Game.constants.LANE;
    var sx = W / LANE;                 // 論理x → 画面x
    var midY = H * 0.62;

    // 地面ライン
    ctx.strokeStyle = 'rgba(120,150,180,0.18)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();

    // 司令部
    drawHQ(0, midY, dpr, s);
    // 防衛壁／砲台
    var wallX = Game.constants.WALL_X * sx;
    ctx.strokeStyle = 'rgba(90,200,255,0.35)';
    ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.beginPath(); ctx.moveTo(wallX, midY - 70 * dpr); ctx.lineTo(wallX, midY + 18 * dpr); ctx.stroke();
    ctx.setLineDash([]);
    var turrets = s.buildings.turret || 0;
    for (var t = 0; t < turrets; t++) {
      drawTurret(wallX, midY - 14 * dpr - t * 16 * dpr, dpr);
    }

    // ユニット
    s.units.forEach(function (u) { drawEntity(u, G.UNITS[u.type], sx, midY, dpr, false); });
    // 敵
    s.enemies.forEach(function (e) { drawEntity(e, G.ENEMIES[e.type], sx, midY, dpr, true); });

    // エフェクト
    s.effects.forEach(function (fx) {
      ctx.globalAlpha = Math.max(0, fx.life * 2);
      ctx.strokeStyle = fx.color; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.arc(fx.x * sx, midY, fx.r * dpr * 0.5, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // フェーズ表示
    if (s.phase === 'prep') {
      ctx.fillStyle = 'rgba(140,170,200,0.5)';
      ctx.font = (13 * dpr) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('― 準備フェーズ ―', W / 2, H * 0.2);
    }
  }

  function drawHQ(x, midY, dpr, s) {
    var bx = 6 * dpr, by = midY - 38 * dpr, bw = 26 * dpr, bh = 56 * dpr;
    var hp = Math.max(0, s.hqHp) / s.hqHpMax;
    ctx.fillStyle = '#16334a';
    ctx.strokeStyle = hp > 0.3 ? '#3fa9ff' : '#ff5d5d';
    ctx.lineWidth = 2 * dpr;
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#3fa9ff';
    ctx.font = (16 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏛', bx + bw / 2, by + bh / 2 + 6 * dpr);
  }
  function drawTurret(x, y, dpr) {
    ctx.fillStyle = '#2a4f6e'; ctx.strokeStyle = '#7fd1ff'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.arc(x, y, 6 * dpr, 0, 7); ctx.fill(); ctx.stroke();
  }
  function drawEntity(ent, spec, sx, midY, dpr, isEnemy) {
    var x = ent.x * sx;
    var isAir = spec.domain === 'air';
    var y = midY - 8 * dpr - (isAir ? 44 * dpr : 0);   // 空中ユニットは上空に描画
    var col = isEnemy ? spec.color : UNIT_COLOR[ent.type] || '#6bd0ff';
    var r = (spec.boss ? 14 : isEnemy ? 7 : 8) * dpr;

    // 影（地上の真下に落とす）
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, midY + 4 * dpr, r * 0.9, r * 0.4, 0, 0, 7); ctx.fill();
    // 空中ユニットは係留線で高度を示す
    if (isAir) {
      ctx.strokeStyle = 'rgba(150,180,210,0.25)'; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x, midY); ctx.stroke();
    }
    // 本体
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1 * dpr;
    if (isAir) {
      // ひし形（空中）
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (isEnemy) {
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    }
    // HPバー
    var hp = Math.max(0, ent.hp) / ent.maxHp;
    if (hp < 1) {
      var bw = r * 2.2, bx = x - bw / 2, byy = y - r - 6 * dpr;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, byy, bw, 3 * dpr);
      ctx.fillStyle = isEnemy ? '#ff7b7b' : '#6bff9e'; ctx.fillRect(bx, byy, bw * hp, 3 * dpr);
    }
  }
  var UNIT_COLOR = {
    infantry: '#6bd0ff', assault: '#ff9a4a', heavy: '#9b8bff', shooter: '#5be0a8', flyer: '#ffe06b',
  };

  // =======================================================================
  //  入力 / タブ
  // =======================================================================
  function bindTabs() {
    $('tabs').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        $('tabs').querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        document.querySelectorAll('.tab-body').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        $('tab-' + b.dataset.tab).classList.add('active');
      };
    });
    $('wave-btn').onclick = function () { Game.startBattle(); };
  }

  // =======================================================================
  //  メインループ
  // =======================================================================
  function loop(ts) {
    var dt = lastTime ? (ts - lastTime) / 1000 : 0;
    lastTime = ts;

    Game.update(dt);
    handlePhase();
    draw();

    // HUD/パネルは10Hz程度で更新（負荷軽減）
    if (ts - lastHudT > 100) {
      lastHudT = ts;
      refreshHUD();
      refreshBuildPanel();
      refreshProducePanel();
      refreshTechPanel();
    }
    requestAnimationFrame(loop);
  }

  // ---- 起動 --------------------------------------------------------------
  function init() {
    canvas = $('lane'); ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    Game.newGame();
    resize();
    bindTabs();
    buildBuildPanel();
    buildProducePanel();
    buildTechPanel();
    log('指揮AI 起動。基地カストルの防衛権限を掌握した。');
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.G = window.G || {});
