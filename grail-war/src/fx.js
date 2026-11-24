// =============================================================
//  fx.js … 演出（設定・カットイン・空と雪・アイコン・エンディング記録）。音は audio.js
// =============================================================

// ---------------- 設定（ブラウザに保存） ----------------
const CFG_KEY = 'fukami-cfg';
const END_KEY = 'fukami-endings';
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let CFG = { speed: 1, fx: !REDUCED, sound: false, bgm: false, vol: 1 };
try { Object.assign(CFG, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { }
function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); } catch (e) { } applyCfg(); }
function applyCfg() { document.body.classList.toggle('fx-on', !!CFG.fx); }
const SPEED_STEP = [0, 230, 420];        // 文字送り：段落ごとの表示間隔（ミリ秒）
const SPEED_NAMES = ['瞬時', '普通', 'ゆっくり'];
let REVEAL_UNTIL = 0;                    // 文章の表示演出が終わる時刻

// ---------------- エンディングの記録 ----------------
const ENDING_LIST = [
  ['destroySpecial', '夜明けの約束'], ['destroy', '冬の終わり'], ['together', '共に生きる'], ['servantWish', '託された願い'],
  ['wishPure', '叶えられた願い'], ['none', '願いなき勝者'], ['destroyPure', '砕かれた奇跡'], ['abstain', '日常への帰還'], ['wish', '歪んだ願い'], ['wishKnown', '承知の上の願い'], ['devoured', '黒い夜明け'],
  ['lost', '脱落'], ['dead', '血に染まる冬'], ['beastSlain', '楽園の外で'], ['saturated', '飽和'], ['sealed', '封印指定'], ['avalon', '隠し：Garden of Avalon'],
];
function seenEndings() { try { return JSON.parse(localStorage.getItem(END_KEY) || '[]'); } catch (e) { return []; } }
function markEnding(k) {
  const s = seenEndings(); if (s.includes(k)) return;
  s.push(k); try { localStorage.setItem(END_KEY, JSON.stringify(s)); } catch (e) { }
}

// ---------------- クラスの紋章と色 ----------------
const CLASS_COLOR = {
  '封印指定執行者': '#9aa4b8',
  'ビーストⅧ': '#9fd8b4',
  'セイバー': '#7fa7e0', 'アーチャー': '#d8796a', 'ランサー': '#5cbca8', 'ライダー': '#d1a253', 'キャスター': '#ad88dc',
  'アサシン': '#97a0b5', 'バーサーカー': '#e0644a', 'ルーラー': '#e6d6a0', 'アヴェンジャー': '#8a74c8', '聖杯': '#b04050',
  'アルターエゴ': '#d985bd', 'ムーンキャンサー': '#c3b2f0', 'フォーリナー': '#6fb3a8', 'シールダー': '#b8c6d8', 'プリテンダー': '#9fd36f',
};
const CLASS_ICON = {
  'セイバー': '<path d="M12 2l2 3v10h-4V5z"/><path d="M7 15h10M12 15v5M10 21h4"/>',
  'アーチャー': '<path d="M6 3c8 3 8 15 0 18"/><path d="M6 3v18"/><path d="M4 12h15M16 9l3 3-3 3"/>',
  'ランサー': '<path d="M12 2l3 5h-6z"/><path d="M12 7v15M9 11h6"/>',
  'ライダー': '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M12 14v6M4 12h6M14 12h6"/>',
  'キャスター': '<path d="M12 3l1.8 3.7 4 .6-2.9 2.8.7 4L12 12.2l-3.6 1.9.7-4-2.9-2.8 4-.6z"/><path d="M12 15v7"/>',
  'アサシン': '<path d="M5 8c2-3 12-3 14 0-1 6-4 9-7 9S6 14 5 8z"/><path d="M8.5 10.5h2.5M13 10.5h2.5"/>',
  'バーサーカー': '<path d="M4 3l5 6-2 2 9 10"/><path d="M20 3l-5 6 2 2-9 10"/>',
  'ルーラー': '<path d="M12 3v17M7 21h10M4 8h16"/><path d="M4 8l-2 6h4zM20 8l-2 6h4z"/>',
  'アヴェンジャー': '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 2 4 3 4-1-3 0-6 0-9z"/>',
  '聖杯': '<path d="M7 3h10v4a5 5 0 0 1-10 0z"/><path d="M12 12v6M8 21h8"/>',
  'アルターエゴ': '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  'ムーンキャンサー': '<path d="M16 3a9 9 0 1 0 5 13A7 7 0 0 1 16 3z"/>',
  'フォーリナー': '<circle cx="12" cy="10" r="5"/><circle cx="12" cy="10" r="1.5"/><path d="M7 14c-1 3-3 5-4 6M12 15v6M17 14c1 3 3 5 4 6"/>',
  'シールダー': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8 10h8M12 6v12"/>',
  'プリテンダー': '<path d="M4 9l4-4 4 4 4-4 4 4v4c0 4-4 7-8 7s-8-3-8-7z"/><path d="M8 13h2M14 13h2"/>',
};
function classColor(cls) { return CLASS_COLOR[cls] || '#d2ad5f'; }
function emblem(cls, size = 22) {
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="color:${classColor(cls)}">${CLASS_ICON[cls] || CLASS_ICON['聖杯']}</svg>`;
}

// ---------------- 行動ボタンのアイコン ----------------
const ACT_ICON = {
  battle: '<path d="M4 4l10 10M14 18l4-4M6 20l4-4"/><path d="M20 4L10 14M4 14l4 4"/>',
  bond: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  intel: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  base: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
  shop: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  rest: '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  train: '<path d="M4 12h16M7 8v8M17 8v8M4 10v4M20 10v4"/>',
  ally: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  walk: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 4-4 2 2-4z"/>',
  ritual: '<circle cx="12" cy="12" r="9"/><path d="M12 3l5.3 16.2L3.4 9.2h17.2L6.7 19.2z"/>',
  scout: '<path d="M3 21l7-7M14 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/>',
  study: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>',
  str: '<path d="M12 2l2 3v10h-4V5z"/><path d="M7 15h10M12 15v6"/>',
  agi: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  mag: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
  np: '<circle cx="12" cy="12" r="4"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M19.8 4.2L17 7M7 17l-2.8 2.8"/>',
  guard: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 7v10"/>',
  observe: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
  seal: '<path d="M12 2c4 5 6 9 0 20C6 11 8 7 12 2z"/>',
  flee: '<path d="M10 6l-6 6 6 6M4 12h16"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
};
function actIcon(k) { return ACT_ICON[k] ? `<svg class="aicon" viewBox="0 0 24 24" aria-hidden="true">${ACT_ICON[k]}</svg>` : ''; }
// ラベルからアイコンを決める（行動選択・サブメニュー用）
const ICON_RULES = [
  [/巡回|襲撃|迎え撃|戦う|仕掛|攻め込|挑発|戦いへ|挑む/, 'battle'], [/過ごす|語らう|想い|相棒|誓い|家族/, 'bond'],
  [/情報|聞き込み|使い魔|教会|尾行/, 'intel'], [/偵察|探る/, 'scout'], [/文献|調べ|書庫|読み/, 'study'],
  [/拠点|結界|罠|霊脈|陣/, 'base'], [/買い|買う/, 'shop'], [/休|眠る|覚悟/, 'rest'], [/鍛|修練|磨く|学ぶ|稼ぐ|アルバイト/, 'train'],
  [/同盟/, 'ally'], [/歩く|散策/, 'walk'], [/召喚|触媒/, 'ritual'], [/撤退|退く|やめる|戻る|立ち去/, 'flee'],
];
function guessIcon(label) { for (const [re, k] of ICON_RULES) if (re.test(label)) return k; return null; }

// ---------------- オーバーレイ（場面転換・カットイン） ----------------
function overlayEl() {
  let o = document.getElementById('overlay');
  if (!o) { o = document.createElement('div'); o.id = 'overlay'; document.body.appendChild(o); }
  return o;
}
// card({ kicker, title, sub, cls, ms }, then)  ……  タップでも閉じられる
function showCard(c, then) {
  if (!CFG.fx) { if (then) then(); return; }
  const o = overlayEl();
  const snd = { chapter: 'chapter', day: 'day', night: 'night', blood: 'doom' }[(c.cls || '').split(' ')[0]]; if (snd) sfx(snd);
  o.className = `show ${c.cls || ''}`;
  o.innerHTML = `<div class="ov-inner">${c.kicker ? `<div class="ov-kicker">${c.kicker}</div>` : ''}${c.ruby ? `<div class="ov-ruby">${c.ruby}</div>` : ''}<div class="ov-title">${c.title}</div>${c.sub ? `<div class="ov-sub">${c.sub}</div>` : ''}</div>`;
  if (c.color) o.style.setProperty('--cc', c.color);
  let done = false;
  const fin = () => { if (done) return; done = true; o.className = ''; o.innerHTML = ''; o.onclick = null; if (then) then(); };
  o.onclick = e => { e.stopPropagation(); fin(); };
  setTimeout(fin, c.ms || 1200);
}
function playQueue(q, then) { if (!q.length) { if (then) then(); return; } const [f, ...rest] = q; f(() => playQueue(rest, then)); }

const KANJI_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];
function chapterOf() {
  if (!G) return '';
  if (G.phase === 'growth') { const st = stageList()[G.growth.stage]; return `${isFuji() ? '日常' : isKishi() ? '月の玉座' : isShirou() ? '旅路' : '生い立ち'}　${st ? st.band : ''}`; }
  if (G.phase === 'prep' || G.phase === 'summon') return '序章　令呪の冬';
  if (G.phase === 'end') return '終幕';
  if (G.phase === 'epilogue') return 'エピローグ　その後の人生';
  return G.day < 4 ? '第一幕　開幕' : G.day < 10 ? '第二幕　侵蝕' : '第三幕　降臨';
}
// コマが変わる時の「〇日目・夜」カード
function slotCard(then) {
  if (!G || !['prep', 'war'].includes(G.phase)) return then();
  if (G.phase === 'prep' && G.day > PREP_DAYS) return showCard({ kicker: '序章', title: '召喚の夜', cls: 'night', ms: 1500 }, then);
  const day = G.phase === 'prep' ? `召喚まで、あと${KANJI_NUM[PREP_DAYS - G.day + 1]}日` : `${KANJI_NUM[G.day] || G.day}日目`;
  showCard({ kicker: chapterOf(), title: day, sub: G.slot ? '夜' : '昼', cls: G.slot ? 'night' : 'day', ms: 1000 }, then);
}
// 章の始まりカード
function chapterCard(name, then) {
  const [a, b] = name.split('　');
  showCard({ kicker: 'CHAPTER', title: a, sub: b, cls: 'chapter', ms: 2200 }, then);
}

// 効果音・BGMは audio.js

// ---------------- 空と雪 ----------------
let SKY = null;
function setSky(mode) { document.body.dataset.sky = mode; }
function startSnow() {
  const c = document.createElement('canvas'); c.id = 'snow'; c.setAttribute('aria-hidden', 'true'); document.body.prepend(c);
  const ctx = c.getContext('2d'); let w = 0, h = 0, dpr = 1;
  const flakes = [...Array(46)].map(() => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, s: 0.15 + Math.random() * 0.4, d: Math.random() * 6 }));
  const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; };
  window.addEventListener('resize', resize); resize();
  const loop = t => {
    SKY = requestAnimationFrame(loop);
    if (!CFG.fx || document.hidden) { ctx.clearRect(0, 0, c.width, c.height); return; }
    const night = document.body.dataset.sky !== 'day';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = night ? 'rgba(235,229,214,0.55)' : 'rgba(255,255,255,0.7)';
    for (const f of flakes) {
      f.y += f.s / h * 2.2; f.x += Math.sin(t / 1800 + f.d) * 0.0004;
      if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
      ctx.beginPath(); ctx.arc(f.x * w, f.y * h, f.r, 0, Math.PI * 2); ctx.fill();
    }
  };
  SKY = requestAnimationFrame(loop);
}
