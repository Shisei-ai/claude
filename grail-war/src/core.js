// =============================================================
//  core.js … ゲームの土台（状態・判定・時間の進行・イベント表示）
//  大まかな流れ：
//   タイトル → 産まれの決定 → 準備期間（5日） → 召喚の夜
//   → 聖杯戦争（最大14日） → 天降山の決戦 → 聖杯 → エンディング
//  1日は「昼」と「夜」の2コマ。コマごとに行動を1つ選びます。
//  1プレイの目安は30分前後です。
// =============================================================

const SAVE_KEY = 'fukami-grail-war-v3';
const PREP_DAYS = 3;   // 18歳の冬、令呪が現れてから召喚までの日数
const WAR_DAYS = 14;
const FINAL_DAY = 11;   // 天降山の決戦はこの日の夜以降
const EVENT_CHANCE = { prep: 0.25, war: 0.22 };   // コマの始めにランダムイベントが起きる確率
const STAT_LABEL = { mag: '魔力', phy: '体力', int: '知力', spi: '精神', cha: '交渉', luk: '幸運' };
const CLASS_EN = { 'セイバー': 'SABER', 'アーチャー': 'ARCHER', 'ランサー': 'LANCER', 'ライダー': 'RIDER',
  'キャスター': 'CASTER', 'アサシン': 'ASSASSIN', 'バーサーカー': 'BERSERKER', 'ルーラー': 'RULER', 'アヴェンジャー': 'AVENGER', '聖杯': 'GRAIL',
  'アルターエゴ': 'ALTER EGO', 'ビーストⅧ': 'BEAST VIII', '封印指定執行者': 'ENFORCER', 'ムーンキャンサー': 'MOON CANCER', 'フォーリナー': 'FOREIGNER', 'シールダー': 'SHIELDER', 'プリテンダー': 'PRETENDER' };

// 道具（買い出しで入手。主に戦闘中に「マスターの行動」として使う）
const ITEMS = {
  potion:  { name: '治癒の霊薬', cost: 2, desc: '戦闘中、サーヴァントのHPを35回復' },
  gem:     { name: '魔力を込めた宝石', cost: 3, desc: '戦闘中、宝石魔術で援護（その手番+12・敵に10ダメージ）' },
  crystal: { name: '魔力結晶', cost: 2, desc: 'サーヴァントの魔力を40回復（戦闘中も使える）' },
  smoke:   { name: '煙幕の護符', cost: 1, desc: '戦闘から確実に撤退できる' },
};
const ITEM_MAX = 3;

let G = null;          // ゲームの状態（セーブされる）
let SCENE = null;      // 今表示している場面（セーブしない）
let TAB = 'story';     // 選択中のタブ
let NOTES = [];        // 判定結果などに付け足す小さな注記
let LAST_HUB = null;   // 最後に行動選択画面へ戻った時点のセーブデータ
let SLOT = {};         // このコマで済ませた処理（ニュース・物語・イベント）

// ---------------- 小さな道具 ----------------
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function wpick(items, wf) {
  const ws = items.map(wf); const total = ws.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SV_BY_ID = Object.fromEntries(SERVANTS.concat([BOSS, BEAST8], ENFORCERS).map(s => [s.id, s]));

// ---------------- 名前・参照 ----------------
function M() { return esc(G.master.name); }
function servantOf(o) {
  const s = SV_BY_ID[o.servantId || (o.servant && o.servant.id)];
  // 岸波白野のシナリオでは、自分のエミヤは「無銘」として現れる
  if (o === G && s && s.id === 'emiya' && typeof isKishi === 'function' && isKishi()) return { ...s, ...MUMEI };
  return s;
}
function SV() { return G.servant ? servantOf(G).short : 'サーヴァント'; }
const SVname = SV;
function birthOf() { return BIRTHS.find(x => x.id === G.master.birth); }
function fmt(s) {
  let t = s.replaceAll('{m}', typeof isShirou === 'function' && isShirou() ? 'シロウ' : M()).replaceAll('{s}', SV());
  if (G && G.servant) t = fmtVoice(t, servantOf(G));   // 一人称・二人称を英霊の口調に
  return t;
}
function aliveRivals() { return (G.rivals || []).filter(r => r.alive); }
function hostileRivals() { return aliveRivals().filter(r => !r.ally); }
function randomAliveRival() { return pick(aliveRivals()); }
function randomHostile() { return pick(hostileRivals()); }
// 今戦える敵（天降山に籠城した最後の陣営は除く）
function engageable() { return hostileRivals().filter(r => !r.siege); }
// 敵の真名を知っているか（情報③、または藤丸が対面して看破した）
function knowsName(r) { return r.intel >= 3 || !!r.named; }
// 敵サーヴァントと対面した：藤丸なら一目で真名を看破する。看破した時は説明文を返す
function meet(r) {
  r.intel = Math.max(r.intel, 1);
  if (typeof isShirou === 'function' && isShirou()) { const t = shirouMeet(r); if (t) return t; }
  if (G.servant && typeof classSkillV === 'function' && classSkillV(servantOf(G), '真名看破') && !knowsName(r) && !['ori', 'beast8'].includes(r.servantId)) {
    r.named = true; addLog(`真名看破：${r.cls}の真名「${servantOf(r).name}」。`);
    return `${SV()}の瞳が、裁定者の光を帯びた。「――真名看破。あの英霊は、<b>${servantOf(r).name}</b>です」`;
  }
  if (typeof isFuji === 'function' && isFuji() && !knowsName(r) && r.servantId !== 'ori') {
    r.named = true; addLog(`${r.cls}の真名「${servantOf(r).name}」を一目で看破。`);
    return `一目で分かった。あの姿、あの武具――<b>${servantOf(r).name}</b>だ。かつての旅で、共に戦ったことのある英霊。`;
  }
  return '';
}
function rivalLabel(r) { return knowsName(r) ? servantOf(r).short : r.cls; }
function isAssassin() { return G.servant && servantOf(G).cls === 'アサシン'; }

// ---------------- 状態を変える関数（イベントからも使う） ----------------
function note(t) { NOTES.push(t); }
function gain(stat, n) {
  const st = G.master.stats; const before = st[stat]; st[stat] = clamp(st[stat] + n, 1, 100);
  // 魔力が伸びると、修めた魔術系統の研鑽が進む（系統が多いほど一つあたりは浅く）
  if (stat === 'mag' && st[stat] > before && G.magic && typeof magicResearch === 'function') magicResearch((st[stat] - before) * 2);
}
function money(n) { G.master.money = Math.max(0, G.master.money + n); }
function hp(n) { G.master.hp = clamp(G.master.hp + n, 0, G.master.hpMax); }
function od(n) { G.master.od = clamp(G.master.od + n, 0, odMax()); }
function odMax() { return 20 + Math.floor(G.master.stats.mag * 0.6) + (G.master.birth === 'shirou' ? 25 : 0); }   // 士郎は投影のために魔力を溜め込める
function shp(n) { if (G.servant) G.servant.hp = clamp(G.servant.hp + n, 0, servantHpMax()); }
function mp(n) { if (G.servant) G.servant.mp = clamp(G.servant.mp + n, 0, 100); }
function item(k, n) { G.items[k] = clamp((G.items[k] || 0) + n, 0, ITEM_MAX); }
function bond(n) {
  if (!G.servant || n === 0) return;
  if (n > 0 && G.master.birth === 'civilian') n = Math.round(n * 1.3);
  if (n > 0 && G.master.birth === 'fujimaru') n = Math.round(n * 1.5);
  if (n > 0 && G.master.birth === 'kishinami') n = Math.round(n * 1.3);   // 月で結んだ絆   // 数多の英霊と絆を結んできた
  const before = Math.floor(G.servant.bond / 10);
  G.servant.bond = clamp(G.servant.bond + n, 0, 100);
  const after = Math.floor(G.servant.bond / 10);
  if (after > before) note(`<span class="tag gold">絆Lv ${after} に上昇</span>`);
  if (before < BOND_LINK / 10 && after >= BOND_LINK / 10) note(`<span class="tag gold">絆の繋がりが強くなった</span> 休息で回復する魔力・HPが増える。`);
}

// 選択肢の「傾向」：マスターの属性が動き、サーヴァントの好き嫌いで絆も変わる
function tone(t) {
  const a = G.master.align;
  if (t === 'good') a.good = clamp(a.good + 8, -100, 100);
  if (t === 'evil') a.good = clamp(a.good - 8, -100, 100);
  if (t === 'law') a.law = clamp(a.law + 8, -100, 100);
  if (t === 'chaos') a.law = clamp(a.law - 8, -100, 100);
  if (!G.servant) return;
  const sv = servantOf(G); const [order, moral] = sv.align.split('・');
  let d = 0;
  if (order === '秩序') d += t === 'law' ? 2 : t === 'chaos' ? -2 : 0;
  if (order === '混沌') d += t === 'chaos' ? 2 : t === 'law' ? -1 : 0;
  if (moral === '善') d += t === 'good' ? 2 : t === 'evil' ? -3 : 0;
  if (moral === '悪') d += t === 'evil' ? 2 : 0;
  const bold = ['warrior', 'king', 'free'].includes(sv.persona);
  const calm = ['cool', 'scholar'].includes(sv.persona);
  if (t === 'cautious') d += calm ? 1 : bold ? -1 : 0;
  if (t === 'bold') d += bold ? 1 : calm ? -1 : 0;
  if (d > 0) { bond(d); note(`<span class="note">${SV()}は好ましく思ったようだ。（絆+${d}）</span>`); }
  if (d < 0) { bond(d); note(`<span class="note">${SV()}は少し不満そうだ。（絆${d}）</span>`); }
}
function alignLabel(a = G.master.align) {
  const o = a.law > 25 ? '秩序' : a.law < -25 ? '混沌' : '中立';
  const m = a.good > 25 ? '善' : a.good < -25 ? '悪' : '中庸';
  return `${o}・${m}`;
}

// ---------------- 判定 ----------------
// マスター判定：能力値 + サイコロ(1〜45) が 目標値 以上なら成功
function chk(stat, diff) {
  let v = G.master.stats[stat];
  if (stat === 'spi' && G.master.birth === 'fallen') v += 5;
  const roll = rand(1, 45); const total = v + roll; const ok = total >= diff;
  return { ok, margin: total - diff, text: `<span class="chk ${ok ? 'ok' : 'ng'}">【${STAT_LABEL[stat]}判定】${ok ? '成功' : '失敗'} <em>${v}+${roll}=${total} / 目標${diff}</em></span>` };
}
// サーヴァント判定：パラメータ（ランクを数値化）+ サイコロ
function schk(i, diff) {
  const v = servantParam(i); const roll = rand(1, 45); const total = v + roll; const ok = total >= diff;
  return { ok, margin: total - diff, text: `<span class="chk ${ok ? 'ok' : 'ng'}">【${SV()}・${PARAM_NAMES[i]}判定】${ok ? '成功' : '失敗'} <em>${v}+${roll}=${total} / 目標${diff}</em></span>` };
}

// マスターの魔力がサーヴァントの性能に影響する（Fateの設定に準拠）
function masterCorrection() {
  if (G.master.birth === 'fujimaru' || G.master.birth === 'kishinami') return 6;
  if (G.master.birth === 'shirou') return -6;   // 衛宮士郎：魔力の供給が苦手な、未熟なマスター   // 歴戦のマスター：英霊は十二分に力を振るえる
  const m = G.master.stats.mag;
  if (m < 25) return -8; if (m < 40) return -4; if (m < 70) return 0; if (m < 85) return 3; return 5;
}
function servantParam(i) {
  const base = rankValue(servantOf(G).p[i]);
  return i === 4 ? base : Math.max(5, base + masterCorrection());
}
function servantHpMax() { return 70 + rankValue(servantOf(G).p[1]); }
function rivalParam(r, i) { const base = rankValue(servantOf(r).p[i]); return i === 4 ? base : base + (r.power - 6); }

// ---------------- 新しいゲーム ----------------
function randomName(foreign, gender) {
  const given = gender === 'm' ? NAMES.givenM : gender === 'f' ? NAMES.givenF : NAMES.given;
  return foreign ? `${pick(NAMES.foreignGiven)}・${pick(NAMES.foreignFamily)}` : `${pick(NAMES.family)} ${pick(given)}`;
}
// ---- 主人公の性別（m：男性 / f：女性 / n：指定しない） ----
const GENDERS = { m: '男性', f: '女性', n: '指定しない' };
function gender() { return (G && G.master && G.master.gender) || 'n'; }
// 性別で言い方が変わる言葉：gw('男の子', '女の子', '子ども')
function gw(m, f, n) { const g = gender(); return g === 'm' ? m : g === 'f' ? f : n; }
function rollMaster(name, gen) {
  const b = wpick(BIRTHS, x => x.weight);
  const g = gen || pick(['m', 'f']);
  const auto = randomName(false, g);
  const stats = {};
  for (const k in b.stats) stats[k] = clamp(Math.round(b.stats[k] * 0.3) + rand(-3, 3), 3, 40);   // 0歳時点の素質
  return {
    name: name || auto, autoName: auto, gender: g, birth: b.id, stats, hp: 100, hpMax: 100, money: 0, age: 0,
    talent: pick(Object.keys(TALENTS)),
    seals: 3, od: 0, align: { law: rand(-20, 20), good: rand(-10, 25) },
    element: wpick(ELEMENTS, e => e.w).name, circuits: rand(b.circuits[0], b.circuits[1]),
  };
}
function newGame(master) {
  G = {
    v: 3, phase: 'growth', day: 1, slot: 0, master, servant: null, growth: { stage: 0 }, friend: null,
    catalysts: [], items: { potion: 1, gem: 0, crystal: 0, smoke: 1 }, flags: {}, used: {}, rivals: [], log: [], news: [],
    ritual: 0, workshop: 0, traps: 0, kills: 0, battles: 0, tmpRival: null, storyRival: null,
    truth: pick(['cursed', 'pure', 'beast']),   // 聖杯の真相（プレイヤーには見えない。data_mystery.js）：呪い／正規／人類悪の寄生
  };
  G.master.od = odMax();
  G.lore = BIRTHS.find(b => b.id === master.birth).magic ? 5 : 0;   // 魔術世界をどれだけ知っているか
  addLog(`${master.name}、誕生。`);
}
function addLog(t) { G.log.unshift({ when: whenShort(), text: t }); if (G.log.length > 80) G.log.pop(); }
function whenShort() {
  if (G.phase === 'growth') return `${G.master.age}歳`;
  if (G.phase === 'prep') return `18歳・${G.day}日`;
  if (G.phase === 'war') return `${G.day}日目${G.slot ? '夜' : '昼'}`;
  return '―';
}

// 触媒：まだ持っていない英霊の触媒からランダムに1つ
function giveCatalyst() {
  const owned = new Set(G.catalysts);
  const pool = SERVANTS.filter(s => s.catalyst && !owned.has(s.id) && (!s.chaldea || isFuji()));
  const s = pick(pool); G.catalysts.push(s.id);
  addLog(`触媒「${s.catalyst}」を入手。`);
  return s.catalyst;
}
function pickVisionServant() {
  if (!G.flags.vision) G.flags.vision = pick(SERVANTS).id;
  return SV_BY_ID[G.flags.vision];
}

// ---------------- セーブ / ロード ----------------
function saveGame() {
  LAST_HUB = JSON.stringify(G);
  try { localStorage.setItem(SAVE_KEY, LAST_HUB); } catch (e) { /* 保存できない環境でも遊べるように無視 */ }
}
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } LAST_HUB = null; }

// =============================================================
//  場面（シーン）の表示
// =============================================================
// scene({ title, sub, body:[段落...], choices:[{label, hint, fn, cls, disabled}] })
function scene(s) { SCENE = s; TAB = 'story'; render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }
function next(title, body, fn, label = '次へ', sub) {
  scene({ title, sub, body, reveal: true, choices: [{ label, fn, cls: 'primary', icon: 'next' }] });
}
function takeNotes() { const n = NOTES; NOTES = []; return n; }
function paras(list) { return list.filter(Boolean).map(p => p.startsWith('<p') || p.startsWith('<div') ? p : `<div class="para">${p}</div>`); }

// =============================================================
//  時間の進行
// =============================================================
function phaseLabel() {
  if (!G) return '';
  if (G.phase === 'growth') return '成長期';
  if (G.phase === 'prep') return '令呪の冬';
  if (G.phase === 'summon') return '召喚の夜';
  if (G.phase === 'war') return '聖杯戦争';
  return '終幕';
}
function isNight() { return G.slot === 1; }

// コマの始まり：ニュース → 物語 → 決戦判定 → ランダムイベント → 行動選択
function startSlot() {
  if (checkGameOver()) return;
  if (G.phase === 'prep' && G.day > PREP_DAYS) { G.phase = 'summon'; return summonScene(); }
  if (G.phase === 'war') {
    if (aliveRivals().length === 0) return victoryScene();
    if (hostileRivals().length === 0) return breakAlliance();
  }
  if (!SLOT.news && G.news.length && G.slot === 0) {
    SLOT.news = true;
    const n = G.news.splice(0);
    return next('昨夜の出来事', n.map(t => `<p class="news">${t}</p>`), startSlot, '次へ', 'NEWS');
  }
  if (!SLOT.story) {
    SLOT.story = true;
    const beat = STORY.find(s => s.phase === G.phase && s.day === G.day && s.slot === G.slot && !G.used[s.id] && (!s.cond || s.cond()));
    if (beat) {
      const go = () => showEvent(beat, beat.after === 'advance' ? advance : startSlot);
      if (beat.chapter && beat.chapter !== G.lastChapter) { G.lastChapter = beat.chapter; return chapterCard(beat.chapter, go); }
      return go();
    }
  }
  if (!SLOT.enf) { SLOT.enf = true; const f = enforcerCheck(); if (f) return f(); }   // 封印指定執行者（data_enforcer.js）
  if (G.phase === 'war' && aliveRivals().length === 1) {
    const last = aliveRivals()[0];
    if (isNight() && G.day >= FINAL_DAY) return finalBattleIntro();
    if (!last.siege) return siegeScene(last);
  }
  if (!SLOT.spell && pendingSpellTier()) { SLOT.spell = true; return spellLearnScene(startSlot); }
  if (!SLOT.event) {
    SLOT.event = true;
    if (Math.random() < EVENT_CHANCE[G.phase]) { const ev = drawEvent(); if (ev) return showEvent(ev, startSlot); }
  }
  hub();
}
function advance() {
  if (checkGameOver()) return;
  SLOT = {};
  G.slot++;
  if (G.slot > 1) { G.slot = 0; G.day++; dailyUpdate(); }
  if (G.phase === 'war' && G.day > WAR_DAYS) return deadlineScene();
  slotCard(startSlot);
}
function dailyUpdate() {
  hp(10); od(Math.ceil(odMax() * 0.6));
  if (G.phase === 'war' && G.servant) {
    mp(15 + Math.floor(G.master.stats.mag * 0.3) + G.workshop * 5);
    shp(10 + G.workshop * 3);
    for (const r of aliveRivals()) { r.hp = Math.min(r.hpMax, r.hp + 18); r.mp = Math.min(100, r.mp + 30); }
    simulateRivals();
    mysteryDaily();
    skillDaily();
    magicDaily();
  }
}

// ライバル同士の戦い（画面外で進む）
function simulateRivals() {
  const alive = aliveRivals();
  if (alive.length < 3 || G.day < 3) return;   // 最後の2陣営はプレイヤーと決着をつける
  const p = 0.1 + G.day * 0.015;
  if (Math.random() > p) return;
  const [a, b] = shuffle(alive).slice(0, 2);
  const power = r => [0, 1, 2, 3, 5].reduce((s, i) => s + rivalParam(r, i), 0) / 5 + r.power + r.hp / 8 + rand(0, 30);
  const [win, lose] = power(a) >= power(b) ? [a, b] : [b, a];
  lose.alive = false; lose.hp = 0;
  win.hp = Math.max(20, win.hp - rand(20, 50)); win.clues = (win.clues || 0) + (Math.random() < 0.5 ? 1 : 0);
  const place = pick(['港の倉庫街', '城跡公園', '御影川の河川敷', '天降山の山道', '駅前の再開発地区']);
  G.news.push(`昨夜、${place}で激しい戦闘があった。<b>${rivalLabel(lose)}陣営</b>が脱落したようだ。` +
    (win.intel >= 1 ? `勝ったのは${rivalLabel(win)}陣営らしい。手負いのはずだ。` : ''));
  addLog(`${rivalLabel(lose)}陣営が${rivalLabel(win)}陣営に敗れ脱落。`);
}

function checkGameOver() {
  if (!G || G.phase === 'end') return true;
  if (G.master.hp <= 0) { ending('dead'); return true; }
  return false;
}

// =============================================================
//  イベント（ランダム・物語共通）
// =============================================================
function drawEvent(forceTime) {
  const t = forceTime || (isNight() ? 'night' : 'day');
  const ph = G.phase;
  const list = EVENTS.filter(e =>
    (e.phase === 'any' || e.phase === ph) &&
    (e.time === 'any' || e.time === t) &&
    !(e.once && G.used[e.id]) &&
    (!e.cond || e.cond()));
  if (!list.length) return null;
  return wpick(list, e => e.weight || 1);
}
// after：結果を読んだ後に進む先（advance＝コマを使い切る / startSlot＝行動選択へ）
function showEvent(ev, after = advance) {
  G.used[ev.id] = true;
  const text = typeof ev.text === 'function' ? ev.text() : ev.text;
  const choices = ev.choices
    .filter(c => !c.cond || c.cond())
    .map(c => ({
      label: typeof c.label === 'function' ? c.label() : c.label, hint: c.hint, cls: c.cls,
      fn: () => {
        NOTES = [];
        const res = c.run();
        let body = [], then = null;
        if (res && res.text !== undefined) { body = [].concat(res.text); then = res.then; } else body = [].concat(res);
        body = paras(body.concat(takeNotes()));
        next(ev.title, body, then || after, then ? '次へ' : '次へ', ev.chapter ? 'STORY' : 'EVENT');
      },
    }));
  if (!choices.length) choices.push({ label: '次へ', fn: after });
  scene({ title: ev.title, sub: ev.chapter || 'EVENT', body: paras([text]), choices, reveal: true });
}
