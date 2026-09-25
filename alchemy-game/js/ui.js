// =============================================================
//  ui.js — 工房側の画面(HTML)を組み立てる処理
//  「構造が変わったとき」だけ丸ごと描き直し(render)、
//  数字やゲージは0.25秒ごとに部分更新(tick)する。
// =============================================================

const STATUS_TEXT = {
  idle: ['未設定', 'st-idle'], work: ['錬成中', 'st-work'], off: ['停止中', 'st-off'],
  limit: ['在庫上限', 'st-limit'], wait: ['素材待ち', 'st-wait'], ready: ['開始待ち', 'st-ready'],
};

// URLの末尾に ?debug を付けて開くと、バランス調整用の開発者パネルが表示される
const DEBUG = { on: /[?&]debug/.test(location.search), speed: 1 };

const TABS = [
  ['workshop', '工房'], ['storage', '倉庫'], ['library', '書庫'],
  ['skills', '技能'], ['magic', '魔法'], ['explore', '探索'], ['log', '記録'],
];

const fmtTime = sec => `${Math.floor(sec / 3600)}時間${Math.floor(sec % 3600 / 60)}分`;
const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function icon(id, cls = '') {
  const it = ITEMS[id];
  const img = Assets.html(`items/${id}`, `ic img ${cls}`, esc(it.name) + '：' + esc(it.desc));
  if (img) return img;
  return `<span class="ic ${cls}" style="--c:${it.color}" title="${esc(it.name)}：${esc(it.desc)}">${it.ch}</span>`;
}
// 「素材 ×必要数（所持数）」の表示。所持数は data-inv で自動更新される
function itemReq(id, n) {
  return `<span class="req" data-need="${id}:${n}">${icon(id)}${esc(ITEMS[id].name)}×${n}<small>(<b data-inv="${id}">${count(id)}</b>)</small></span>`;
}
function itemOut(id, n) {
  return `<span class="req out">${icon(id)}${esc(ITEMS[id].name)}×${n}</span>`;
}

const UI = {
  tab: 'workshop',
  hideRead: (() => { try { return !!localStorage.getItem('ui_hideRead'); } catch (e) { return false; } })(),
  sig: '',

  init() {
    $('#tabs').innerHTML = TABS.map(([id, name]) => `<button data-tab="${id}">${name}<i class="dot" data-dot="${id}"></i></button>`).join('');
    $('#tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-tab]');
      if (b) { this.tab = b.dataset.tab; this.render(); }
    });
    // ボタン類はすべて data-act 属性で処理を振り分ける(イベント委譲)
    document.body.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) this.act(b.dataset.act, b.dataset.arg, b);
    });
    document.body.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.recipe !== undefined) {
        const m = S.machines[+t.dataset.recipe];
        // 作業中にレシピを変えたら、投入済みの材料を倉庫へ戻す
        if (m.busy) for (const [k, v] of Object.entries(RECIPES[m.recipe].in)) addItem(k, v);
        m.busy = false; m.prog = 0;
        m.recipe = t.value || null;
        this.render();
      }
      if (t.dataset.limit !== undefined) {
        S.machines[+t.dataset.limit].limit = Math.max(0, parseInt(t.value, 10) || 0);
      }
      if (t.dataset.slot !== undefined) {
        const i = +t.dataset.slot, v = t.value || null;
        const j = S.slots.indexOf(v);
        if (v && j >= 0) S.slots[j] = S.slots[i]; // 入れ替え
        S.slots[i] = v;
        this.render();
      }
    });
    this.render();
  },

  act(act, arg) {
    switch (act) {
      case 'build': buildMachine(arg); break;
      case 'toggle': { const m = S.machines[+arg]; m.on = !m.on; break; }
      case 'remove': {
        const m = S.machines[+arg];
        if (m.type === 'pot' && countMachines(S, 'pot') <= 1) { this.toast('最後の抽出の壺は撤去できません', 'bad'); return; }
        if (!confirm(`${MACHINES[m.type].name}を撤去しますか？（建造素材は戻りません）`)) return;
        if (m.busy) for (const [k, v] of Object.entries(RECIPES[m.recipe].in)) addItem(k, v);
        S.machines.splice(+arg, 1);
        break;
      }
      case 'read': {
        const b = BOOKS.find(x => x.id === arg);
        const first = readBook(b);
        if (first || S.books[b.id]) this.showBook(b, first);
        break;
      }
      case 'learn': learnSkill(arg); break;
      case 'hideread':
        this.hideRead = !this.hideRead;
        try { localStorage.setItem('ui_hideRead', this.hideRead ? '1' : ''); } catch (e) { /* noop */ }
        break;
      case 'go': Field.start(arg); return;
      case 'ending': this.showStory(STORY.ending, () => { S.flags.ended = true; log('レネイを、取り戻した。', 'lv'); saveGame(); this.render(); }); return;
      case 'prologue': this.showStory(STORY.prologue); return;
      case 'dbg':
        if (arg === 'mlv') gainMXP(xpNeed(S.mlv));
        if (arg === 'alv') gainAXP(xpNeed(S.alv) / (1 + 0.25 * skill('ind_xp')));
        if (arg === 'sp') S.sp += 5;
        if (arg === 'items') Object.keys(ITEMS).forEach(k => addItem(k, 20));
        if (arg === 'speed') DEBUG.speed = DEBUG.speed >= 100 ? 1 : DEBUG.speed * 10;
        break;
      case 'save': saveGame(); this.toast('保存しました', 'good'); return;
      case 'reset':
        if (confirm('セーブデータを消去して最初から始めますか？この操作は取り消せません。')) {
          resetGame(); this.render(); this.showStory(STORY.prologue, () => { S.flags.prologue = true; });
        }
        return;
    }
    this.render();
  },

  // ---------------- 描画 ----------------
  render() {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    const fn = this['r_' + this.tab];
    $('#panel').innerHTML = fn.call(this);
    this.renderSide();
    this.sig = this.signature();
    this.tick();
  },

  // これが変化したら画面全体を描き直す
  signature() {
    return [S.mlv, S.alv, S.sp, S.machines.length, Object.keys(S.inv).sort().join(','),
      S.machines.map(m => machineStatus(m)).join(''), S.flags.bossDefeated, S.flags.ended, OBJECTIVES.findIndex(o => !o.done(S))].join('|');
  },

  tick() {
    // 上部バー
    $('#mlv').textContent = S.mlv;
    $('#alv').textContent = S.alv;
    $('#sp').textContent = S.sp;
    $('#mxp').style.width = (S.mlv >= MAX_LV ? 100 : S.mxp / xpNeed(S.mlv) * 100) + '%';
    $('#axp').style.width = (S.alv >= MAX_LV ? 100 : S.axp / xpNeed(S.alv) * 100) + '%';
    $('#mxpt').textContent = S.mlv >= MAX_LV ? 'MAX' : `${Math.floor(S.mxp)} / ${xpNeed(S.mlv)}`;
    $('#axpt').textContent = S.alv >= MAX_LV ? 'MAX' : `${Math.floor(S.axp)} / ${xpNeed(S.alv)}`;
    // タブの通知ドット(読める本・振れるSPがあるとき)
    $('[data-dot="library"]').classList.toggle('show', BOOKS.some(canRead));
    $('[data-dot="skills"]').classList.toggle('show', Object.keys(SKILLS).some(canLearn));
    if (Field.active) return;

    const focused = document.activeElement && ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
    if (!focused && this.signature() !== this.sig) { this.render(); return; }

    document.querySelectorAll('[data-inv]').forEach(el => { el.textContent = count(el.dataset.inv); });
    document.querySelectorAll('[data-need]').forEach(el => {
      const [id, n] = el.dataset.need.split(':');
      el.classList.toggle('ng', !has(id, +n));
    });
    document.querySelectorAll('[data-prog]').forEach(el => {
      const m = S.machines[+el.dataset.prog];
      if (m) el.style.width = (m.recipe ? m.prog / RECIPES[m.recipe].t * 100 : 0) + '%';
    });
    document.querySelectorAll('[data-status]').forEach(el => {
      const m = S.machines[+el.dataset.status];
      if (!m) return;
      const [t, c] = STATUS_TEXT[machineStatus(m)];
      el.textContent = t; el.className = 'status ' + c;
    });
    document.querySelectorAll('[data-build]').forEach(el => {
      const type = el.dataset.build;
      el.disabled = countMachines(S, type) >= machineMax() || !canAfford(machineCost(type));
    });
  },

  // ---- 工房 ----
  r_workshop() {
    const types = [...unlocked('machines')];
    if (!types.length) {
      return `<div class="empty"><p>埃をかぶった設備が並んでいる。使い方がわからない。</p>
        <p>まずは <b>書庫</b> で『錬金術の基礎』を読もう。</p></div>`;
    }
    let h = `<div class="panel-head"><h2>工房</h2><p class="sub">生産速度 ×${productionSpeed().toFixed(2)} ／ 設備は探索中も、ページを閉じている間（最大4時間）も動き続けます。</p></div>`;
    for (const type of Object.keys(MACHINES)) {
      if (!types.includes(type)) continue;
      const M = MACHINES[type], n = countMachines(S, type), max = machineMax();
      const cost = machineCost(type);
      h += `<section class="mgroup">
        <div class="mhead">
          ${Assets.html(`machines/${type}`, 'mic img') || `<span class="mic" style="--c:${M.color}">${M.ch}</span>`}
          <div><h3>${M.name} <small>${n} / ${max}台</small></h3><p>${M.desc}</p></div>
          <div class="build">
            ${n < max ? `<div class="costs">${Object.entries(cost).map(([k, v]) => itemReq(k, v)).join('')}</div>` : '<div class="costs muted">建造上限（技能【工房拡張】で増やせます）</div>'}
            <button class="btn" data-act="build" data-arg="${type}" data-build="${type}">建造</button>
          </div>
        </div><div class="mlist">`;
      S.machines.forEach((m, i) => {
        if (m.type !== type) return;
        const recipes = Object.entries(RECIPES).filter(([rid, r]) => r.m === type && unlocked('recipes').has(rid));
        const r = m.recipe && RECIPES[m.recipe];
        h += `<div class="mcard ${m.on ? '' : 'off'}">
          <div class="mrow">
            <select data-recipe="${i}">
              <option value="">── レシピを選択 ──</option>
              ${recipes.map(([rid, rr]) => `<option value="${rid}" ${rid === m.recipe ? 'selected' : ''}>${Object.keys(rr.out).map(o => ITEMS[o].name).join('・')}</option>`).join('')}
            </select>
            <span class="status" data-status="${i}"></span>
          </div>
          ${r ? `<div class="recipe">
              ${Object.keys(r.in).length ? Object.entries(r.in).map(([k, v]) => itemReq(k, v)).join('<i>+</i>') : '<span class="muted">（材料不要）</span>'}
              <i class="arrow">→</i>${Object.entries(r.out).map(([k, v]) => itemOut(k, v)).join('')}
              <span class="muted small">${(r.t / productionSpeed()).toFixed(1)}秒 / A.xp ${r.xp}</span>
            </div>
            <div class="prog"><div data-prog="${i}"></div></div>` : '<div class="recipe muted">レシピを選ぶと、倉庫から自動で材料を取り出して作り続けます。</div>'}
          <div class="mrow ctrl">
            <label title="生産物がこの数に達したら作業を止めます。0で無制限。">在庫上限 <input type="number" min="0" step="1" value="${m.limit}" data-limit="${i}"></label>
            <button class="btn sm" data-act="toggle" data-arg="${i}">${m.on ? '一時停止' : '再開'}</button>
            <button class="btn sm ghost" data-act="remove" data-arg="${i}" title="撤去">撤去</button>
          </div>
        </div>`;
      });
      h += '</div></section>';
    }
    return h;
  },

  // ---- 倉庫 ----
  r_storage() {
    let h = `<div class="panel-head"><h2>倉庫</h2><p class="sub">アイコンにカーソルを合わせると説明が表示されます。</p></div>`;
    for (const [cat, label] of ITEM_CATS) {
      const items = Object.keys(ITEMS).filter(k => ITEMS[k].cat === cat && count(k) > 0);
      if (!items.length) continue;
      h += `<h3 class="cat">${label}</h3><div class="grid">`;
      for (const k of items) {
        h += `<div class="cell" title="${esc(ITEMS[k].desc)}">${icon(k, 'big')}<div><div class="nm">${ITEMS[k].name}</div><div class="ct">×<b data-inv="${k}">${count(k)}</b></div></div></div>`;
      }
      h += '</div>';
    }
    return h;
  },

  // ---- 書庫 ----
  // 流れ: レベルが上がる → 読める書物が増える → 読む → 記載された術(魔法・設備・レシピ・地域)を習得
  bookRow(b, lvName) {
    const read = S.books[b.id], ok = canRead(b);
    const locked = !read && !ok;
    return `<div class="book ${read ? 'read' : ''} ${ok ? 'ready' : ''} ${locked ? 'locked' : ''}">
      <div class="bspine ${b.kind}"></div>
      <div class="binfo">
        <div class="bname">${locked ? '？？？' : '『' + b.name + '』'}</div>
        <div class="bmeta">${lvName} ${b.lv} 以上 ・ SP +${b.sp}${read ? ' ・ <span class="good">読了</span>' : ''}</div>
        ${read ? `<div class="bunlock">${this.unlockText(b)}</div>` : ''}
      </div>
      ${ok ? `<button class="btn glow" data-act="read" data-arg="${b.id}">読む</button>` : read ? `<button class="btn sm ghost" data-act="read" data-arg="${b.id}">再読</button>` : `<span class="muted small">${lvName}不足</span>`}
    </div>`;
  },

  r_library() {
    const hide = this.hideRead;
    // 今のレベルより6以上先の未読書物は、1行にまとめて表示する(一覧が長くなりすぎないように)
    const list = (books, lvName) => {
      const lv = lvName === 'M.Lv' ? S.mlv : S.alv;
      const sorted = books.filter(b => !(hide && S.books[b.id])).sort((a, b) => a.lv - b.lv);
      const near = sorted.filter(b => S.books[b.id] || b.lv <= lv + 5);
      const far = sorted.filter(b => !near.includes(b));
      let h = near.map(b => this.bookRow(b, lvName)).join('');
      if (far.length) h += `<div class="book locked far"><div class="binfo muted small">……ほか ${far.length} 冊（${lvName} ${far[0].lv}〜${far[far.length - 1].lv} で読めるようになる）</div></div>`;
      return h || '<p class="muted small">（すべて読了）</p>';
    };
    const unread = books => books.filter(b => !S.books[b.id]).length;
    const alch = BOOKS.filter(b => b.kind === 'alchemy');
    const basic = BOOKS.filter(b => b.kind === 'magic' && !b.series);
    const grade = BOOKS.filter(b => b.kind === 'magic' && b.series);
    return `<div class="panel-head"><h2>書庫</h2>
        <p class="sub">レベルが上がると読める書物が増え、<b>書物を読むことで記載された術を習得</b>します（魔法とそのグレード・設備・レシピ・地域）。読むとSPも得られます。<br>
        魔術書は M.Lv（戦闘で上昇）、錬金術書は A.Lv（生産で上昇）で読めるようになります。</p>
        <label class="small"><input type="checkbox" data-act="hideread" ${hide ? 'checked' : ''}> 読了済みの書物を隠す</label></div>
      <div class="books">
        <div class="bookcol"><h3>錬金術書 <small>A.Lv ${S.alv} ・ 未読 ${unread(alch)}</small></h3>${list(alch, 'A.Lv')}</div>
        <div class="bookcol"><h3>魔術書 <small>M.Lv ${S.mlv} ・ 未読 ${unread(basic)}</small></h3>${list(basic, 'M.Lv')}
          <h3 class="sub-h">魔術奥義書 <small>魔法の上位グレードを記す ・ 未読 ${unread(grade)}</small></h3>${list(grade, 'M.Lv')}</div>
      </div>`;
  },

  unlockText(b) {
    const u = b.unlock, parts = [];
    (u.machines || []).forEach(x => parts.push(`設備【${MACHINES[x].name}】`));
    (u.spells || []).forEach(x => { const p = parseSlot(x); parts.push(`魔法【${SPELLS[p.id].grades[p.g - 1].name}】（グレード${GRADE_LABEL[p.g - 1]}）`); });
    (u.fields || []).forEach(x => parts.push(`地域【${FIELDS[x].name}】`));
    if (u.recipes && u.recipes.length) parts.push(`レシピ ${u.recipes.length}種：${u.recipes.map(r => Object.keys(RECIPES[r].out).map(o => ITEMS[o].name).join('')).join('、')}`);
    return parts.join(' ／ ');
  },

  // ---- 技能 ----
  r_skills() {
    let h = `<div class="panel-head"><h2>技能 <span class="spbadge">SP ${S.sp}</span></h2><p class="sub">書物を読んで得たSPを使い、技能を習得します。暗いパネルは前提技能が必要です。</p></div><div class="trees">`;
    for (const [tree, name, color] of SKILL_TREES) {
      h += `<div class="tree" style="--tc:${color}"><h3>${name}</h3>`;
      for (const [id, sk] of Object.entries(SKILLS)) {
        if (sk.tree !== tree) continue;
        const r = skill(id), reqOk = skillReqMet(id), can = canLearn(id);
        const req = sk.req ? Object.entries(sk.req).map(([k, v]) => `${SKILLS[k].name} Rank${v}`).join('、') : '';
        h += `<button class="skill ${r >= sk.max ? 'max' : ''} ${reqOk ? '' : 'lock'} ${can ? 'can' : ''}" data-act="learn" data-arg="${id}" ${can ? '' : 'disabled'}>
          <div class="sname">${sk.name}<span class="scost">${r >= sk.max ? 'MAX' : `SP ${sk.cost}`}</span></div>
          <div class="pips">${Array.from({ length: sk.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</div>
          <div class="sdesc">${sk.desc}</div>
          ${reqOk ? '' : `<div class="sreq">前提：${req}</div>`}
        </button>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  },

  // ---- 魔法 ----
  r_magic() {
    const learned = learnedSpells();
    const dmgMult = playerStats().dmgMult;
    let h = `<div class="panel-head"><h2>魔法</h2><p class="sub">探索中、数字キー 1〜6 で割り当てた魔法を照準（マウス）の方向へ放ちます。左クリックでも最後に使ったスロットを連射できます。<br>
      各魔法には4段階の<b>グレード</b>があります。上位グレードは、それを記した<b>魔術奥義書</b>を書庫で読むと習得します（M.Lv が上がると読める書物が増えます）。<br>
      習得した下位グレードも残るので、消費MPを抑えたいときは使い分けられます。</p></div>`;
    h += '<div class="slots">';
    for (let i = 0; i < 6; i++) {
      let opts = '';
      for (const id of learned) {
        for (let g = 1; g <= spellMaxGrade(id); g++) {
          const v = `${id}:${g}`;
          opts += `<option value="${v}" ${S.slots[i] === v ? 'selected' : ''}>${SPELLS[id].grades[g - 1].name}（${GRADE_LABEL[g - 1]}）</option>`;
        }
      }
      h += `<label class="slot"><span class="key">${i + 1}</span><select data-slot="${i}"><option value="">（なし）</option>${opts}</select></label>`;
    }
    h += '</div><div class="spells">';
    if (!learned.length) h += '<p class="muted">まだ魔法を覚えていない。書庫で『魔術入門』を読もう。</p>';
    for (const id of learned) {
      const sp = SPELLS[id], max = spellMaxGrade(id);
      h += `<div class="spell">${Assets.html(`icons/spell_${id}_${max}`, 'mic img') || Assets.html(`icons/spell_${id}`, 'mic img') || `<span class="mic" style="--c:${sp.color}">${sp.ch}</span>`}<div class="sbody">
        <h4>${sp.grades[max - 1].name} <small class="muted">グレード${GRADE_LABEL[max - 1]}</small></h4><p>${sp.desc}</p>
        <table class="grades">`;
      sp.grades.forEach((gr, gi) => {
        const g = gi + 1, got = g <= max, book = gradeBook(id, g);
        const a = spellAt(id, g);
        const perf = [a.dmg ? `威力${Math.round(a.dmg * dmgMult)}` : '', a.heal ? `回復${Math.round(a.heal * 100)}%` : '',
          a.count > 1 ? `${a.count}発` : '', a.chains ? `連鎖${a.chains}` : '', a.explode ? `爆発${a.explode}` : '',
          a.radius ? `範囲${a.radius}` : '', `MP${a.mp}`, `${a.cd}秒`].filter(Boolean).join(' ・ ');
        const cond = got ? '<span class="good">習得済</span>'
          : !book ? ''
          : canRead(book) ? `<span class="good">『${book.name}』が読める！</span>`
          : `<span class="bad">M.Lv${book.lv}で読める書物に記載</span>`;
        h += `<tr class="${got ? '' : 'nogot'}"><th>${GRADE_LABEL[gi]}</th><td class="gname">${got ? gr.name : '？？？'}</td><td class="small">${got ? perf : ''}</td><td class="small">${cond}</td></tr>`;
      });
      h += '</table></div></div>';
    }
    return h + '</div>';
  },

  // ---- 探索 ----
  r_explore() {
    let h = `<div class="panel-head"><h2>探索</h2><p class="sub">フィールドで素材を集め、魔物を倒して M.Lv を上げましょう。力尽きると<b>採取袋の素材を全て失います</b>。危ないと思ったら早めに帰還しましょう。</p></div>
      <div class="controls">操作：<b>WASD</b> 移動 ／ <b>マウス</b> 照準 ／ <b>1〜6</b> 魔法 ／ <b>左クリック</b> 選択中の魔法 ／ <b>E</b> 採取・帰還ゲート ／ <b>H</b> 帰還詠唱 ／ <b>Q</b> 回復薬 ／ <b>R</b> 魔力薬 ／ <b>Esc</b> 一時停止</div>
      <div class="fields">`;
    for (const id of FIELD_ORDER) {
      const f = FIELDS[id], un = fieldUnlocked(id), ok = fieldAccessible(id);
      const book = BOOKS.find(b => (b.unlock.fields || []).includes(id));
      let reason = '';
      if (!un) reason = `『${book.name}』（M.Lv ${book.lv}）を読む必要がある`;
      else if (f.need && !has(f.need)) reason = `【${ITEMS[f.need].name}】が必要`;
      h += `<div class="field ${ok ? '' : 'lock'}" style="--fc:${f.wall}">
        <div class="fname">${un ? f.name : '？？？'}<small>推奨 M.Lv ${f.lv}</small></div>
        <p>${un ? f.desc : '未知の地。書物に記述があるかもしれない。'}</p>
        ${un ? `<div class="small">採れる素材：${f.nodes.map(n => icon(n[0])).join('')}</div>` : ''}
        ${reason ? `<p class="bad small">${reason}</p>` : ''}
        <button class="btn ${ok ? 'glow' : ''}" data-act="go" data-arg="${id}" ${ok ? '' : 'disabled'}>出発</button>
        ${id === 'underworld' && has('philosopher_stone') && !S.flags.ended ? `<button class="btn final" data-act="ending">賢者の石を掲げ、レネイを迎えに行く</button>` : ''}
      </div>`;
    }
    return h + '</div>';
  },

  // ---- 記録 ----
  r_log() {
    return `<div class="panel-head"><h2>記録</h2></div>
      <p><button class="btn sm" data-act="prologue">序章を読み返す</button></p>
      <p class="small muted">プレイ時間 ${fmtTime(S.stats.playSec)} ／ 討伐数 ${S.stats.kills} ／ 建造した設備 ${S.machines.length}台</p>
      <ul class="log">${S.log.map(l => `<li class="${l.type}"><time>${new Date(l.t).toLocaleTimeString()}</time>${esc(l.msg)}</li>`).join('')}</ul>`;
  },

  renderSide() {
    const i = OBJECTIVES.findIndex(o => !o.done(S));
    $('#objective').innerHTML = i < 0
      ? '<p class="good">すべての目標を達成した。</p>'
      : `<div class="onum">目標 ${i + 1} / ${OBJECTIVES.length}</div><p>${OBJECTIVES[i].text}</p>`;
    const busy = S.machines.filter(m => m.busy).length;
    $('#summary').innerHTML = `稼働中の設備 <b>${busy}</b> / ${S.machines.length}<br><span class="small muted">プレイ時間 ${fmtTime(S.stats.playSec)}</span>`
      + (DEBUG.on ? `<div class="debug"><b>開発者パネル</b><br>
        <button class="btn sm" data-act="dbg" data-arg="mlv">M.Lv+1</button>
        <button class="btn sm" data-act="dbg" data-arg="alv">A.Lv+1</button>
        <button class="btn sm" data-act="dbg" data-arg="sp">SP+5</button>
        <button class="btn sm" data-act="dbg" data-arg="items">全素材+20</button>
        <button class="btn sm" data-act="dbg" data-arg="speed">生産×${DEBUG.speed}</button></div>` : '');
  },

  // ---------------- モーダル(物語・書物) ----------------
  showStory(pages, done) {
    let i = 0;
    const show = () => {
      const p = pages[i];
      this.modal(`<h2>${esc(p.title)}</h2><div class="story">${esc(p.text).replace(/\n/g, '<br>')}</div>
        <div class="mfoot"><span class="muted">${i + 1} / ${pages.length}</span><button class="btn glow" id="mnext">${i < pages.length - 1 ? '次へ' : '閉じる'}</button></div>`);
      $('#mnext').onclick = () => {
        i++;
        if (i < pages.length) show();
        else { this.closeModal(); if (done) done(); }
      };
    };
    show();
  },

  showBook(b, first) {
    this.modal(`<h2>『${esc(b.name)}』</h2>
      <div class="story book-text">${b.text.map(t => `<p>${esc(t)}</p>`).join('')}</div>
      <div class="unlock-box">${first ? `<b>SP +${b.sp}</b><br>` : ''}${this.unlockText(b) || '（新たな知識を得た）'}</div>
      <div class="mfoot"><span></span><button class="btn glow" id="mnext">閉じる</button></div>`);
    $('#mnext').onclick = () => this.closeModal();
  },

  modal(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
  },
  closeModal() { $('#modal').hidden = true; this.render(); },

  toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3200);
    while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove();
  },

  enterField() {
    $('#app').hidden = true;
    document.body.classList.add('infield');
    $('#field').hidden = false;
  },
  leaveField() {
    $('#field').hidden = true;
    document.body.classList.remove('infield');
    $('#app').hidden = false;
    this.render();
  },
};
