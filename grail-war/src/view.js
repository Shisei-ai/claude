// =============================================================
//  view.js … 画面の描画と、タップ操作の受け付け
//  画面描画
// =============================================================
const ICON = {
  story: '<svg viewBox="0 0 24 24"><path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6"/></svg>',
  master: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>',
  servant: '<svg viewBox="0 0 24 24"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z"/></svg>',
  rivals: '<svg viewBox="0 0 24 24"><path d="M5 19L19 5M14 5h5v5M19 19L5 5M5 10V5h5"/></svg>',
  log: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
};
const SEAL_PATH = 'M9 1 C 13 6, 15 10, 9 21 C 3 10, 5 6, 9 1 Z';

// ---------------- タイトル・キャラクター作成 ----------------
function titleScreen() {
  G = null; B = null;
  SCENE = { kind: 'title', save: loadSave() };
  TAB = 'story'; render();
}
function createScreen(master) {
  const m = master || rollMaster();
  SCENE = { kind: 'create', master: m, birth: BIRTHS.find(x => x.id === m.birth) };
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!SCENE) return;
  const k = SCENE.kind;
  setSky(!G || k === 'title' || k === 'create' || k === 'settings' || k === 'gallery' ? 'night'
    : k === 'ending' ? (SCENE.good ? 'dawn' : 'blood') : k === 'summon' || G.phase === 'summon' ? 'night' : G.slot === 1 ? 'night' : 'day');
  if (['title', 'create', 'settings', 'gallery'].includes(k)) {
    app.innerHTML = `<main class="main">${k === 'title' ? viewTitle() : k === 'create' ? viewCreate() : k === 'settings' ? `<section class="panel">${viewSettings()}<div class="choices"><button class="choice primary" data-act="title">${actIcon('flee')}<span class="c-label">タイトルへ戻る</span></button></div></section>` : viewGallery()}</main>`;
    return afterRender();
  }
  const top = G ? viewTop() : '';
  let content = '';
  if (TAB === 'story') content = k === 'summon' ? viewSummon() : k === 'ending' ? viewEnding() : viewScene();
  else if (TAB === 'master') content = viewMaster();
  else if (TAB === 'servant') content = viewServant();
  else if (TAB === 'rivals') content = viewRivals();
  else if (TAB === 'log') content = viewLog();
  const tabs = [['story', '物語'], ['master', 'マスター'], ['servant', '英霊'], ['rivals', '陣営'], ['log', '記録']];
  app.innerHTML = `${top}<main class="main" id="main">${content}</main>
    <nav class="tabs" aria-label="画面切り替え">${tabs.map(([id, l]) => `<button class="tab ${TAB === id ? 'on' : ''}" data-tab="${id}" aria-pressed="${TAB === id}">${ICON[id]}${l}</button>`).join('')}</nav>`;
  afterRender();
}
// 描画のあと：文章の表示演出の終了時刻を記録
function afterRender() {
  const sc = document.querySelector('.scene[data-total]');
  REVEAL_UNTIL = sc ? Date.now() + (+sc.dataset.total) : 0;
}
function skipReveal() {
  const sc = document.querySelector('.scene[data-total]');
  if (sc) sc.classList.add('skip');
  REVEAL_UNTIL = 0;
}
function viewTop() {
  const night = G.slot === 1;
  const dayText = G.phase === 'growth' ? `${G.master.age}歳` : G.phase === 'prep' ? `18歳・${G.day}日目` : G.phase === 'summon' || (G.phase === 'war' && G.day === 0) ? '開幕前夜' : G.phase === 'end' ? '終幕' : `${G.day}日目`;
  const seals = [0, 1, 2].map(i => `<svg class="seal ${i < G.master.seals ? '' : 'used'}" viewBox="0 0 18 22" aria-hidden="true"><path d="${SEAL_PATH}"/></svg>`).join('');
  const extraSeals = G.master.seals > 3 ? `<span class="tag red">+${G.master.seals - 3}</span>` : '';
  const sv = G.servant;
  const prog = G.phase === 'growth' ? G.master.age / ADULT_AGE : G.phase === 'prep' ? (G.day - 1 + G.slot * 0.5) / PREP_DAYS : G.phase === 'war' ? (G.day - 1 + G.slot * 0.5) / WAR_DAYS : 1;
  return `<header class="topbar">
    <div class="topbar-row">
      <div class="when"><span class="when-phase">${chapterOf().replace('　', ' ')}</span><span class="when-day">${dayText}</span>
        ${G.phase === 'prep' || G.phase === 'war' ? `<span class="time-chip ${night ? 'night' : 'day'}">${night ? '夜' : '昼'}</span>` : ''}</div>
      ${G.phase === 'growth' ? '' : `<div class="seals" title="令呪 残り${G.master.seals}画" aria-label="令呪 残り${G.master.seals}画">${seals}${extraSeals}</div>`}
    </div>
    <div class="mini"><span>HP <b>${G.master.hp}</b></span><span>資金 <b>${G.master.money}</b>万円</span>
      ${sv ? `<span>${emblem(servantOf(G).cls, 12)}${SV()} <b>${sv.hp}</b>/${servantHpMax()}</span><span>絆Lv <b>${Math.floor(sv.bond / 10)}</b></span>` : `<span>触媒 <b>${G.catalysts.length}</b></span>`}</div>
    <div class="progress" aria-hidden="true"><i style="width:${Math.min(100, prog * 100)}%"></i>${G.phase === 'war' ? `<b style="left:${((FINAL_DAY - 0.5) / WAR_DAYS) * 100}%"></b>` : ''}</div>
  </header>`;
}
function viewScene() {
  const s = SCENE;
  const step = s.reveal && CFG.fx ? SPEED_STEP[CFG.speed] : 0;
  const body = s.body.filter(Boolean);
  const total = step ? body.length * step + 250 : 0;
  const story = /幕|序章|STORY|SPECIAL|FINAL|SIEGE/.test(s.sub || '');
  return `<article class="scene ${story ? 'story' : ''} ${s.battle ? 'battle' : ''}" ${total ? `data-total="${total}"` : ''}>
    ${s.sub ? `<div class="scene-sub">${s.sub}</div>` : ''}
    <h1 class="scene-title">${s.title}</h1>
    <div class="scene-body">${body.map((h, i) => step ? `<div class="rv" style="--d:${i * step}ms">${h}</div>` : h).join('')}</div>
    <div class="choices ${s.grid ? 'grid' : ''} ${step ? 'rv' : ''}" style="--d:${body.length * step}ms">${s.choices.map((c, i) => {
      const ic = c.icon || guessIcon(String(c.label));
      return `<button class="choice ${c.cls || ''}" data-choice="${i}" ${c.disabled ? 'disabled' : ''}>
      ${ic ? actIcon(ic) : ''}<span class="c-label">${c.label}</span>${c.hint ? `<span class="c-hint">${c.hint}</span>` : ''}</button>`;
    }).join('')}</div>
  </article>`;
}
function circleSVG(cls = '') {
  // 召喚陣：円と、円周上の点を結ぶ七芒星
  const pts = [...Array(7)].map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 7; return [50 + 34 * Math.cos(a), 50 + 34 * Math.sin(a)]; });
  const star = pts.map((_, i) => pts[(i * 3) % 7]).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + 'Z';
  return `<svg class="circle ${cls}" viewBox="0 0 100 100" aria-hidden="true">
    <g class="spin"><circle class="ring" cx="50" cy="50" r="47"/><circle class="ring" cx="50" cy="50" r="43"/>
      <path id="tp" d="M50 50 m-45 0 a45 45 0 1 1 90 0 a45 45 0 1 1 -90 0" fill="none"/>
      <text><textPath href="#tp">SABER · ARCHER · LANCER · RIDER · CASTER · ASSASSIN · BERSERKER ·</textPath></text></g>
    <g class="spin rev"><path class="ring red" d="${star}"/><circle class="ring" cx="50" cy="50" r="34"/><circle class="ring" cx="50" cy="50" r="14"/></g>
  </svg>`;
}
function viewTitle() {
  const save = SCENE.save; const seen = seenEndings().length;
  return `<div class="title-wrap">
    ${circleSVG('title-circle')}
    <h1 class="game-title"><small>HOLY GRAIL WAR</small>深見市聖杯戦争</h1>
    <p class="lead">${CITY.intro}</p>
    <div class="choices">
      <button class="choice primary" data-act="new">${actIcon('ritual')}<span class="c-label">はじめから</span><span class="c-hint">産まれはランダムで決まる</span></button>
      ${save ? `<button class="choice" data-act="continue">${actIcon('next')}<span class="c-label">つづきから</span><span class="c-hint">${esc(save.master.name)}・${save.phase === 'growth' ? `${save.master.age}歳` : save.phase === 'prep' ? `18歳の冬・${save.day}日目` : `聖杯戦争${save.day}日目`}</span></button>` : ''}
      <div class="title-sub">
        <button class="choice" data-act="gallery">${actIcon('study')}<span class="c-label">エンディング</span><span class="c-hint">${seen}/${ENDING_LIST.length}</span></button>
        <button class="choice" data-act="settings">${actIcon('base')}<span class="c-label">設定</span></button>
      </div>
    </div>
  </div>`;
}
function viewSettings() {
  const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-cfg="${key}:${v}" class="${String(CFG[key]) === String(v) ? 'on' : ''}" aria-pressed="${String(CFG[key]) === String(v)}">${l}</button>`).join('')}</div>`;
  return `<h2>設定</h2>
    <div class="setting"><div><b>文字送り</b><span>文章が段落ごとに現れる速さ。表示中に画面をタップすると全文が出る。</span></div>${seg('speed', SPEED_NAMES.map((n, i) => [i, n]))}</div>
    <div class="setting"><div><b>演出</b><span>場面転換カード・宝具カットイン・雪・揺れなど。</span></div>${seg('fx', [[true, 'ON'], [false, 'OFF']])}</div>
    <div class="setting"><div><b>効果音</b><span>その場で合成する控えめな音。消音モードでは鳴らない場合がある。</span></div>${seg('sound', [[true, 'ON'], [false, 'OFF']])}</div>`;
}
function viewGallery() {
  const seen = seenEndings();
  return `<section class="panel"><h2>エンディング</h2><p class="note" style="color:var(--muted);font-size:13px">到達したエンディング ${seen.length} / ${ENDING_LIST.length}</p>
    <div class="gallery">${ENDING_LIST.map(([k, t], i) => `<div class="${seen.includes(k) ? 'got' : ''}"><span>${String(i + 1).padStart(2, '0')}</span><b>${seen.includes(k) ? t : '？？？'}</b></div>`).join('')}</div>
    <div class="choices"><button class="choice primary" data-act="title">${actIcon('flee')}<span class="c-label">タイトルへ戻る</span></button></div></section>`;
}
function viewCreate() {
  const m = SCENE.master, b = SCENE.birth;
  const mul = k => (b.growth[k] || 1) * (m.talent === k ? 1.3 : 1);
  const pot = Object.keys(STAT_LABEL).map(k => `<span class="tag ${mul(k) >= 1.2 ? 'gold' : mul(k) < 0.95 ? '' : ''}">${STAT_LABEL[k]}${mul(k) >= 1.2 ? '↑↑' : mul(k) < 0.95 ? '↓' : ''}</span>`).join('');
  return `<article class="scene">
    <div class="scene-sub">BIRTH</div><h1 class="scene-title">あなたが生まれる家</h1>
    <div class="birth-card">
      <div class="birth-name">${b.home}</div>
      <p style="margin:6px 0 10px;font-size:14px">${b.origin}</p>
      <dl class="kv"><dt>魔術属性</dt><dd>${m.element}</dd><dt>魔術回路</dt><dd>${m.circuits}本</dd>
        <dt>生まれつき</dt><dd>${TALENTS[m.talent]}</dd><dt>魔術</dt><dd>${b.magic ? '幼い頃から学べる' : '学べない（目覚めれば別）'}</dd>
        <dt>18歳の姿</dt><dd>${b.name}　<span style="color:var(--muted)">（願い：${b.wish}）</span></dd></dl>
      <h3>伸びやすさ</h3><div>${pot}</div>
      <h3>0歳の素質</h3>${statBars(m.stats)}
      <p class="note" style="font-size:12px;color:var(--muted);margin-top:8px">ここから18歳までの過ごし方で、能力は大きく伸びていく。</p>
    </div>
    <div class="field"><label for="mname">あなたの名前</label><input id="mname" maxlength="16" value="${esc(m.name)}" autocomplete="off"></div>
    <div class="choices">
      <button class="choice primary" data-act="start">${actIcon('ritual')}<span class="c-label">この運命に生まれる</span></button>
      <button class="choice" data-act="reroll">${actIcon('walk')}<span class="c-label">運命を引き直す</span><span class="c-hint">家・素質を再抽選</span></button>
      <button class="choice" data-act="title">${actIcon('flee')}<span class="c-label">タイトルへ戻る</span></button>
    </div></article>`;
}
function statBars(stats) {
  return `<div class="bars">${Object.keys(STAT_LABEL).map(k => `<div class="bar-row"><span>${STAT_LABEL[k]}</span><div class="bar"><i style="width:${stats[k]}%"></i></div><span class="num">${stats[k]}</span></div>`).join('')}</div>`;
}
function paramGrid(p, effFn) {
  return `<div class="params">${PARAM_NAMES.map((n, i) => {
    const base = p[i]; const eff = effFn ? effFn(i) : null; const bv = rankValue(base);
    const diff = eff === null ? 0 : eff - bv;
    const shown = diff ? `${base}<small>→${valueRank(eff)}</small>` : base;
    return `<div class="param"><div class="pl">${n}</div><div class="pr ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${shown}</div>
      <div class="bar"><i style="width:${Math.min(100, ((eff ?? bv) / 65) * 100)}%"></i></div></div>`;
  }).join('')}</div>`;
}
function viewSummon() {
  const sv = SCENE.sv;
  return `<article class="scene summon" style="--cc:${classColor(sv.cls)}" data-total="${CFG.fx ? 3600 : 0}">
    <div class="summon-stage">${circleSVG('summon-glow')}<div class="summon-flash"></div>
      <div class="summon-class">${emblem(sv.cls, 54)}<span>${CLASS_EN[sv.cls] || sv.cls}</span></div></div>
    <div class="summon-name">${sv.name}</div>
    ${SCENE.emergency ? '<p class="note" style="text-align:center;margin:10px 0 0">召喚陣も詠唱もないまま、令呪の光が英霊を呼び寄せた。</p>' : ''}
    <p class="quote summon-line">「${sv.line}」</p>
    <div class="summon-card">${servantCard(sv)}
      <div class="choices"><button class="choice primary" data-act="aftersummon">${actIcon('seal')}<span class="c-label">契約を結ぶ</span></button></div></div>
  </article>`;
}
function servantCard(sv) {
  return `<div class="svcard" style="--cc:${classColor(sv.cls)}"><div class="svcard-emblem">${emblem(sv.cls, 64)}</div><div class="svclass">${CLASS_EN[sv.cls] || sv.cls}</div>
    <div class="svname">${sv.name}</div>
    <div><span class="tag gold">${sv.cls}</span><span class="tag">${sv.align}</span><span class="tag">性格：${PERSONAS[sv.persona].label}</span></div>
    <p style="font-size:13px;color:var(--muted);margin:8px 0 12px">${sv.desc}</p>
    ${paramGrid(sv.p, G && G.servant && G.servant.id === sv.id ? servantParam : null)}
    <div class="np"><div class="np-ruby">${sv.npRuby}</div><div class="np-name">${sv.np}</div></div></div>`;
}
function viewMaster() {
  const m = G.master; const b = BIRTHS.find(x => x.id === m.birth);
  return `<section class="panel"><h2>${M()}<span style="font-size:14px;color:var(--muted);margin-left:8px">${m.age}歳</span></h2><div><span class="tag gold">${G.phase === 'growth' ? b.home : b.name}</span><span class="tag">${TALENTS[m.talent] || ''}</span>${G.route ? `<span class="tag red">${routeName()}</span>` : ''}<span class="tag">${alignLabel()}</span><span class="tag">${m.element}</span></div>
    <h3>状態</h3><div class="bars">
      <div class="bar-row"><span>HP</span><div class="bar hp"><i style="width:${m.hp}%"></i></div><span class="num">${m.hp}</span></div></div>
    <dl class="kv" style="margin-top:10px"><dt>令呪</dt><dd>${m.seals}画</dd><dt>資金</dt><dd>${m.money}万円</dd><dt>魔術回路</dt><dd>${m.circuits}本</dd>
      <dt>オド</dt><dd>${m.od} / ${odMax()}（マスター自身の魔力。戦闘の支援魔術や使い魔に使う）</dd>
      <dt>陣地</dt><dd>Lv ${G.workshop}・罠${G.traps}${G.flags.leyline || m.birth === 'shrine' ? '（霊脈の知識あり）' : ''}</dd>
      <dt>願い</dt><dd>${b.wish}</dd><dt>特徴</dt><dd>${b.perk}</dd>
      <dt>属性値</dt><dd>秩序 ${m.align.law > 0 ? '+' : ''}${m.align.law}／善 ${m.align.good > 0 ? '+' : ''}${m.align.good}</dd></dl>
    <h3>能力値</h3>${statBars(m.stats)}
    ${G.friend ? `<h3>幼馴染</h3><div class="bar-row"><span style="white-space:nowrap">${friendName()}</span><div class="bar bond"><i style="width:${G.friend.bond}%"></i></div><span class="num">${G.friend.bond}</span></div>` : ''}
    ${G.servant ? `<p class="note" style="font-size:12px;color:var(--muted)">マスターの魔力による英霊パラメータ補正：${masterCorrection() > 0 ? '+' : ''}${masterCorrection()}（魔力が低いとサーヴァントの性能が落ちる）</p>` : ''}
    <h3>道具</h3><div class="item-list">${Object.entries(ITEMS).map(([k, it]) => `<div><b>${it.name} ×${G.items[k] || 0}</b><span>${it.desc}</span></div>`).join('')}</div>
    <h3>所持している触媒</h3>${G.catalysts.length ? G.catalysts.map(id => `<span class="tag gold">${SV_BY_ID[id].catalyst}</span>`).join('') : '<p class="empty">まだ無い</p>'}
    <h3>判明している事実</h3>
      ${G.flags.grailTruth ? '<span class="tag red">聖杯は汚染されている</span>' : G.flags.grailHint ? '<span class="tag">聖杯には何か秘密がある……</span>' : '<p class="empty">特になし</p>'}
      ${G.flags.registered ? '<span class="tag green">教会に登録済み</span>' : ''}
      ${G.flags.mudKnown ? '<span class="tag red">黒い泥は傷ついた英霊を狙う</span>' : ''}
      ${G.flags.knowWish && G.servant ? `<span class="tag gold">${SV()}の願い：${SERVANT_WISH[servantOf(G).persona]}</span>` : ''}
  </section>`;
}
function viewServant() {
  if (!G.servant) return '<section class="panel"><p class="empty">まだサーヴァントを召喚していない。<br>準備期間の終わりに召喚の儀が行われる。</p></section>';
  const s = G.servant; const sv = servantOf(G); const per = PERSONAS[sv.persona];
  return `<section class="panel">${servantCard(sv)}
    <h3>状態</h3><div class="bars">
      <div class="bar-row"><span>HP</span><div class="bar hp"><i style="width:${(s.hp / servantHpMax()) * 100}%"></i></div><span class="num">${s.hp}</span></div>
      <div class="bar-row"><span>魔力</span><div class="bar mp"><i style="width:${s.mp}%"></i></div><span class="num">${s.mp}</span></div>
      <div class="bar-row"><span>絆</span><div class="bar bond"><i style="width:${s.bond}%"></i></div><span class="num">Lv${Math.floor(s.bond / 10)}</span></div></div>
    <dl class="kv" style="margin-top:10px"><dt>関係</dt><dd>${s.special ? `<span class="tag red">${RELATIONS[s.special].name}</span>` : s.bond >= 70 ? '夜に語らえば、何かが起きるかもしれない' : 'マスターとサーヴァント（絆Lv7で変化）'}</dd>
      <dt>真名</dt><dd>${s.exposed ? '<span class="tag red">敵に知られている</span>' : '秘匿中'}</dd>
      <dt>好み</dt><dd>${s.bond >= 20 ? per.likes.map(k => ACTIVITIES[k].name).join('、') : '絆Lv2で判明'}</dd>
      <dt>苦手</dt><dd>${s.bond >= 40 ? per.dislikes.map(k => ACTIVITIES[k].name).join('、') : '絆Lv4で判明'}</dd></dl>
    <p class="note" style="font-size:12px;color:var(--muted);margin-top:12px">パラメータの「→」はマスター補正後の実効ランク。判定ではランクを数値（E=10〜EX=65）にして使う。</p>
  </section>`;
}
function viewRivals() {
  if (!G.rivals.length) return '<section class="panel"><p class="empty">聖杯戦争が始まると、敵陣営の情報がここに表示される。</p></section>';
  return `<section class="panel"><h2>陣営</h2><p class="note" style="font-size:12px;color:var(--muted);margin:0 0 12px">情報段階：①マスター判明 ②拠点判明（襲撃可能） ③真名判明（戦闘有利）</p>
    <div class="rivals">${G.rivals.map(r => {
      const s = servantOf(r);
      return `<div class="rival ${r.alive ? '' : 'out'}">
        <div class="rival-head"><span class="rival-cls">${emblem(r.cls, 16)}${r.intel >= 3 ? s.name : r.cls}</span>
          <span>${!r.alive ? '<span class="tag">脱落</span>' : r.ally ? '<span class="tag green">同盟</span>' : ''}${r.bounty && r.alive ? '<span class="tag red">討伐令</span>' : ''}
          <span class="intel" aria-label="情報段階${r.intel}">${[1, 2, 3].map(i => `<i class="${r.intel >= i ? 'on' : ''}"></i>`).join('')}</span></span></div>
        <p>${r.cls}　マスター：${r.intel >= 1 ? `${esc(r.master)}（${r.type}）` : '不明'}</p>
        ${r.intel >= 2 && r.alive ? `<div class="bar-row" style="margin-top:6px"><span>HP</span><div class="bar enemy"><i style="width:${(r.hp / r.hpMax) * 100}%"></i></div><span class="num">${r.hp}</span></div>` : ''}
        ${r.intel >= 3 ? `<div style="margin-top:8px">${paramGrid(s.p)}</div><p>宝具：${s.np}（${s.npRuby}）</p>` : ''}
      </div>`;
    }).join('')}</div></section>`;
}
function viewLog() {
  return `<section class="panel"><h2>記録</h2>
    <div class="log-list" style="margin-top:12px">${G.log.map(l => `<div><span>${l.when}</span><p style="margin:0">${esc(l.text)}</p></div>`).join('')}</div>
    <h3>ゲーム</h3><div class="choices">
      <button class="choice" data-act="totitle"><span class="c-label">タイトルへ戻る</span><span class="c-hint">進行は自動保存されている</span></button>
      <button class="choice danger" data-act="reset"><span class="c-label">${SCENE && SCENE.confirmReset ? 'もう一度押すと削除' : 'セーブデータを削除'}</span></button>
    </div>
    <div style="margin-top:22px">${viewSettings()}</div></section>`;
}
function viewEnding() {
  const s = SCENE; const sv = G.servant ? servantOf(G) : null;
  const no = ENDING_LIST.findIndex(e => e[0] === s.endKind) + 1;
  return `<article class="scene ending ${s.good ? 'good' : 'bad'}">
    ${circleSVG(s.good ? 'dawn-circle' : 'blood-circle')}
    <div class="scene-sub">${s.good ? 'ENDING' : 'BAD END'}${no ? `　No.${String(no).padStart(2, '0')}` : ''}</div>
    <h1 class="scene-title">${s.title}</h1>
    <div class="scene-body">${s.text.map((h, i) => CFG.fx ? `<div class="rv" style="--d:${400 + i * 700}ms">${h}</div>` : h).join('')}</div>
    <div class="ending-stats ${CFG.fx ? 'rv' : ''}" style="--d:${400 + s.text.length * 700}ms">
      <div>到達<b>${G.phase === 'end' && G.servant ? `${G.day}日目` : `準備${G.day}日目`}</b></div>
      <div>撃破数<b>${G.kills}騎</b></div>
      <div>サーヴァント<b>${sv ? sv.short : '―'}</b></div>
      <div>参戦の経緯<b>${routeName() || '―'}</b></div>
      <div>残った令呪<b>${G.master.seals}画</b></div>
      <div>絆<b>${G.servant ? `Lv${Math.floor(G.servant.bond / 10)}` : '―'}${G.servant && G.servant.special ? `・${RELATIONS[G.servant.special].name}` : ''}</b></div>
    </div>
    <div class="choices"><button class="choice primary" data-act="totitle"><span class="c-label">タイトルへ</span></button></div>
  </article>`;
}

// ---------------- 操作（タップ） ----------------
document.addEventListener('click', e => {
  if (REVEAL_UNTIL > Date.now() && e.target.closest('.main')) { skipReveal(); return; }   // 表示中のタップは全文表示
  const t = e.target.closest('[data-choice],[data-tab],[data-act],[data-mact],[data-cfg]');
  if (!t || t.disabled) return;
  sfx('tick');
  if (t.dataset.cfg) {
    const [k, v] = t.dataset.cfg.split(':'); CFG[k] = k === 'speed' ? +v : v === 'true'; saveCfg();
    if (k === 'sound' && CFG.sound) sfx('page');
    render(); return;
  }
  if (t.dataset.mact) { if (B) { B.mact = t.dataset.mact; battleScene(); } return; }
  if (t.dataset.tab) { TAB = t.dataset.tab; if (SCENE) SCENE.confirmReset = false; render(); return; }
  if (t.dataset.choice !== undefined) { const c = SCENE.choices[+t.dataset.choice]; if (c && !c.disabled) c.fn(); return; }
  const a = t.dataset.act;
  if (a === 'new') createScreen();
  else if (a === 'reroll') { const name = document.getElementById('mname').value.trim(); const m = rollMaster(); if (name) m.name = name; createScreen(m); }
  else if (a === 'title' || a === 'totitle') titleScreen();
  else if (a === 'settings') { SCENE = { kind: 'settings' }; render(); }
  else if (a === 'gallery') { SCENE = { kind: 'gallery' }; render(); }
  else if (a === 'start') {
    const name = document.getElementById('mname').value.trim() || SCENE.master.name;
    SCENE.master.name = name.slice(0, 16);
    newGame(SCENE.master);
    growthStart();
  }
  else if (a === 'continue') { G = SCENE.save; SLOT = { news: true, story: true, event: true }; startFromSave(); }
  else if (a === 'aftersummon') afterSummon();
  else if (a === 'reset') {
    if (SCENE.confirmReset) { clearSave(); titleScreen(); }
    else { SCENE.confirmReset = true; render(); }
  }
});
function startFromSave() {
  if (G.phase === 'growth') return growthStage();
  if (G.phase === 'summon') return summonScene();
  hub();
}

// ---------------- 起動 ----------------
function boot(data) {
  applyCfg(); startSnow();
  if (data && data.save) { try { G = JSON.parse(data.save); SLOT = { news: true, story: true, event: true }; return startFromSave(); } catch (e) { } }
  titleScreen();
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: LAST_HUB }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
