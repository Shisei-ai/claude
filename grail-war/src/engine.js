// =============================================================
//  ゲーム本体（進行・判定・戦闘・画面描画）
//  大まかな流れ：
//   タイトル → 産まれの決定 → 準備期間（6日） → 召喚の夜
//   → 聖杯戦争（最大14日） → エンディング
//  1日は「昼」と「夜」の2コマ。コマごとに行動を1つ選びます。
// =============================================================

const SAVE_KEY = 'fukami-grail-war-v1';
const PREP_DAYS = 6;
const WAR_DAYS = 14;
const STAT_LABEL = { mag: '魔力', phy: '体力', int: '知力', spi: '精神', cha: '交渉', luk: '幸運' };
const CLASS_EN = { 'セイバー': 'SABER', 'アーチャー': 'ARCHER', 'ランサー': 'LANCER', 'ライダー': 'RIDER',
  'キャスター': 'CASTER', 'アサシン': 'ASSASSIN', 'バーサーカー': 'BERSERKER', 'ルーラー': 'RULER', 'アヴェンジャー': 'AVENGER' };

let G = null;          // ゲームの状態（セーブされる）
let SCENE = null;      // 今表示している場面（セーブしない）
let TAB = 'story';     // 選択中のタブ
let NOTES = [];        // 判定結果などに付け足す小さな注記
let LAST_HUB = null;   // 最後に行動選択画面へ戻った時点のセーブデータ

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
const SV_BY_ID = Object.fromEntries(SERVANTS.map(s => [s.id, s]));

// ---------------- 名前・参照 ----------------
function M() { return esc(G.master.name); }
function servantOf(o) { return SV_BY_ID[o.servantId || (o.servant && o.servant.id)]; }
function SV() { return G.servant ? servantOf(G).short : 'サーヴァント'; }
const SVname = SV;
function fmt(s) { return s.replaceAll('{m}', M()).replaceAll('{s}', SV()); }
function aliveRivals() { return (G.rivals || []).filter(r => r.alive); }
function hostileRivals() { return aliveRivals().filter(r => !r.ally); }
function randomAliveRival() { return pick(aliveRivals()); }
function rivalLabel(r) { return r.intel >= 3 ? servantOf(r).short : r.cls; }

// ---------------- 状態を変える関数（イベントからも使う） ----------------
function note(t) { NOTES.push(t); }
function gain(stat, n) {
  const st = G.master.stats; const before = st[stat];
  st[stat] = clamp(st[stat] + n, 1, 100);
}
function money(n) { G.master.money = Math.max(0, G.master.money + n); }
function hp(n) { G.master.hp = clamp(G.master.hp + n, 0, G.master.hpMax); }
function shp(n) { if (G.servant) G.servant.hp = clamp(G.servant.hp + n, 0, servantHpMax()); }
function mp(n) { if (G.servant) G.servant.mp = clamp(G.servant.mp + n, 0, 100); }
function bond(n) {
  if (!G.servant || n === 0) return;
  if (n > 0 && G.master.birth === 'civilian') n = Math.round(n * 1.3);
  const before = Math.floor(G.servant.bond / 10);
  G.servant.bond = clamp(G.servant.bond + n, 0, 100);
  const after = Math.floor(G.servant.bond / 10);
  if (after > before) note(`<span class="tag gold">絆Lv ${after} に上昇</span>`);
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
  return { ok, text: `<span class="chk ${ok ? 'ok' : 'ng'}">【${STAT_LABEL[stat]}判定】${ok ? '成功' : '失敗'} <em>${v}+${roll}=${total} / 目標${diff}</em></span>` };
}
// サーヴァント判定：パラメータ（ランクを数値化）+ サイコロ
function schk(i, diff) {
  const v = servantParam(i); const roll = rand(1, 45); const total = v + roll; const ok = total >= diff;
  return { ok, text: `<span class="chk ${ok ? 'ok' : 'ng'}">【${SV()}・${PARAM_NAMES[i]}判定】${ok ? '成功' : '失敗'} <em>${v}+${roll}=${total} / 目標${diff}</em></span>` };
}

// マスターの魔力がサーヴァントの性能に影響する（Fateの設定に準拠）
function masterCorrection() {
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
function randomName(foreign) {
  return foreign ? `${pick(NAMES.foreignGiven)}・${pick(NAMES.foreignFamily)}` : `${pick(NAMES.family)} ${pick(NAMES.given)}`;
}
function rollMaster(name) {
  const b = wpick(BIRTHS, x => x.weight);
  const stats = {};
  for (const k in b.stats) stats[k] = clamp(b.stats[k] + rand(-8, 8), 5, 95);
  return {
    name: name || randomName(false), birth: b.id, stats, hp: 100, hpMax: 100, money: b.money + rand(0, 3),
    seals: 3, align: { law: rand(-20, 20), good: rand(-10, 25) },
    element: wpick(ELEMENTS, e => e.w).name, circuits: rand(b.circuits[0], b.circuits[1]),
    age: rand(16, 34),
  };
}
function newGame(master) {
  G = {
    v: 1, phase: 'prep', day: 1, slot: 0, master, servant: null,
    catalysts: [], flags: {}, used: {}, rivals: [], log: [], news: [],
    ritual: 0, workshop: 0, kills: 0, battles: 0, tmpRival: null,
  };
  if (master.birth === 'noble') giveCatalyst();
  addLog(`${master.name}、深見市にて聖杯戦争への参加を決意する。`);
}
function addLog(t) { G.log.unshift({ when: whenShort(), text: t }); if (G.log.length > 80) G.log.pop(); }
function whenShort() {
  if (G.phase === 'prep') return `準備${G.day}日`;
  if (G.phase === 'war') return `${G.day}日目${G.slot ? '夜' : '昼'}`;
  return '―';
}

// 触媒：まだ持っていない英霊の触媒からランダムに1つ
function giveCatalyst() {
  const owned = new Set(G.catalysts);
  const pool = SERVANTS.filter(s => s.catalyst && !owned.has(s.id));
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
  scene({ title, sub, body, choices: [{ label, fn, cls: 'primary' }] });
}
function takeNotes() { const n = NOTES; NOTES = []; return n; }

// =============================================================
//  タイトル・キャラクター作成
// =============================================================
function titleScreen() {
  G = null;
  const save = loadSave();
  SCENE = { kind: 'title', save };
  TAB = 'story'; render();
}
function createScreen(master) {
  const m = master || rollMaster();
  const b = BIRTHS.find(x => x.id === m.birth);
  SCENE = { kind: 'create', master: m, birth: b };
  render();
}

// =============================================================
//  時間の進行
// =============================================================
function phaseLabel() {
  if (!G) return '';
  if (G.phase === 'prep') return '準備期間';
  if (G.phase === 'summon') return '召喚の夜';
  if (G.phase === 'war') return '聖杯戦争';
  return '終幕';
}
function isNight() { return G.slot === 1; }

// コマの始まり：イベント判定 → 行動選択
function startSlot() {
  if (checkGameOver()) return;
  // 準備期間の最後の夜は召喚
  if (G.phase === 'prep' && G.day > PREP_DAYS) { G.phase = 'summon'; return summonScene(); }
  if (G.phase === 'war') {
    if (hostileRivals().length === 0 && aliveRivals().length > 0) return breakAlliance();
    if (aliveRivals().length === 0) return victoryScene();
    if (aliveRivals().length === 1 && isNight()) return finalBattleIntro();
  }
  // 前日のニュース
  if (G.news.length && G.slot === 0) {
    const n = G.news.splice(0);
    return next('昨夜の出来事', n.map(t => `<p class="news">${t}</p>`), () => maybeEvent());
  }
  maybeEvent();
}
function maybeEvent() {
  const chance = G.phase === 'prep' ? 0.33 : 0.3;
  if (Math.random() < chance) { const ev = drawEvent(); if (ev) return showEvent(ev); }
  hub();
}
function advance() {
  if (checkGameOver()) return;
  G.slot++;
  if (G.slot > 1) { G.slot = 0; G.day++; dailyUpdate(); }
  if (G.phase === 'war' && G.day > WAR_DAYS) return deadlineScene();
  startSlot();
}
function dailyUpdate() {
  hp(10);
  if (G.phase === 'war' && G.servant) {
    mp(15 + Math.floor(G.master.stats.mag * 0.3) + G.workshop * 5);
    shp(10 + G.workshop * 3);
    for (const r of aliveRivals()) { r.hp = Math.min(r.hpMax, r.hp + 18); r.mp = Math.min(100, r.mp + 30); }
    simulateRivals();
  }
}

// ライバル同士の戦い（画面外で進む）
function simulateRivals() {
  const alive = aliveRivals();
  if (alive.length < 3) return;   // 最後の2陣営はプレイヤーと決着をつける
  const p = 0.24 + G.day * 0.012;
  if (Math.random() > p) return;
  const [a, b] = shuffle(alive).slice(0, 2);
  const power = r => [0, 1, 2, 3, 5].reduce((s, i) => s + rivalParam(r, i), 0) / 5 + r.power + r.hp / 8 + rand(0, 30);
  const [win, lose] = power(a) >= power(b) ? [a, b] : [b, a];
  lose.alive = false; lose.hp = 0;
  win.hp = Math.max(20, win.hp - rand(20, 50));
  const place = pick(['港の倉庫街', '城跡公園', '御影川の河川敷', '天降山の山道', '駅前の再開発地区']);
  G.news.push(`昨夜、${place}で激しい戦闘があった。<b>${rivalLabel(lose)}陣営</b>が脱落したようだ。` +
    (win.intel >= 1 ? `勝ったのは${rivalLabel(win)}陣営らしい。` : ''));
  addLog(`${rivalLabel(lose)}陣営が${rivalLabel(win)}陣営に敗れ脱落。`);
}

function checkGameOver() {
  if (!G || G.phase === 'end') return true;
  if (G.master.hp <= 0) { ending('dead'); return true; }
  return false;
}

// =============================================================
//  イベント
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
function showEvent(ev) {
  G.used[ev.id] = true;
  const text = typeof ev.text === 'function' ? ev.text() : ev.text;
  const choices = ev.choices
    .filter(c => !c.cond || c.cond())
    .map(c => ({
      label: typeof c.label === 'function' ? c.label() : c.label, hint: c.hint,
      fn: () => {
        NOTES = [];
        const res = c.run();
        let body = [], then = null;
        if (res && res.text !== undefined) { body = [].concat(res.text); then = res.then; } else body = [].concat(res);
        body = body.filter(Boolean).concat(takeNotes());
        next(ev.title, body.map(p => `<p>${p}</p>`), then || advance);
      },
    }));
  if (!choices.length) choices.push({ label: '次へ', fn: advance });
  scene({ title: ev.title, sub: 'EVENT', body: [`<p>${text}</p>`], choices });
}

// =============================================================
//  行動選択（ハブ）
// =============================================================
function hub() {
  G.tmpRival = null;
  saveGame();
  const flavor = pick(FLAVOR[isNight() ? 'night' : 'day']);
  const body = [`<p>${flavor}</p>`];
  let acts = [];
  if (G.phase === 'prep') {
    body.push(`<p class="note">聖杯戦争の開幕まで、あと${PREP_DAYS - G.day + 1}日。召喚に備えて力を蓄えよう。</p>`);
    acts = isNight() ? prepNightActions() : prepDayActions();
  } else {
    const sv = G.servant;
    body.push(`<p class="note">残り陣営：${hostileRivals().length}${aliveRivals().length !== hostileRivals().length ? `（同盟中 ${aliveRivals().length - hostileRivals().length}）` : ''}　${SV()} HP ${sv.hp}/${servantHpMax()}・魔力 ${sv.mp}</p>`);
    acts = isNight() ? warNightActions() : warDayActions();
  }
  scene({ title: isNight() ? '夜の行動' : '昼の行動', sub: `${phaseLabel()}・${G.day}日目`, body, choices: acts });
}

// ---- 準備期間 ----
function prepDayActions() {
  return [
    { label: '体を鍛える', hint: '体力↑ 精神↑', fn: () => actResult('鍛錬', () => { const n = rand(3, 5); gain('phy', n); gain('spi', 1);
      return `早朝の御影川の河川敷を走り込んだ。（体力+${n} 精神+1）`; }) },
    { label: '魔術の修練', hint: '魔力↑（精神判定）', fn: () => actResult('魔術の修練', studyMagic) },
    { label: '書庫で調べもの', hint: '知力↑ 触媒の手がかり', fn: () => actResult('調べもの', () => {
      const n = rand(3, 5); gain('int', n);
      if (Math.random() < 0.15) { const c = giveCatalyst(); return [`市立図書館の郷土資料室で調べものをした。（知力+${n}）`, `古い寄贈品目録を辿り、<b>${c}</b>の在処を突き止めて入手した！`]; }
      return `市立図書館で英霊の伝承を調べた。（知力+${n}）`; }) },
    { label: '街を歩く', hint: '何かが起きるかも', fn: () => walkTown('day') },
    { label: 'アルバイト', hint: '資金↑ 交渉↑', fn: () => actResult('アルバイト', () => { const n = rand(2, 3); money(n); gain('cha', 1);
      return `駅前の喫茶店で働いた。（資金+${n}万円 交渉+1）`; }) },
    { label: '休む', hint: 'HP回復', fn: () => actResult('休息', () => { hp(30); gain('spi', 1); return '一日ゆっくりと体を休めた。（HP+30 精神+1）'; }) },
  ];
}
function prepNightActions() {
  return [
    { label: '召喚陣の準備', hint: `召喚の質↑（現在${G.ritual}/3）`, disabled: G.ritual >= 3, fn: () => actResult('召喚陣の準備', () => {
      G.ritual++; gain('mag', 1);
      return [`工房の床に、銀と水銀で召喚陣を描き込んでいく。（召喚の準備 ${G.ritual}/3 魔力+1）`,
        '<span class="note">準備が整うほど、召喚したサーヴァントとの最初の絆と魔力が高まる。</span>']; }) },
    { label: '魔術の修練', hint: '魔力↑（精神判定）', fn: () => actResult('魔術の修練', studyMagic) },
    { label: '夜の街を歩く', hint: '危険と出会い', fn: () => walkTown('night') },
    { label: '眠る', hint: 'HP回復', fn: () => actResult('休息', () => { hp(25); return '早めに床についた。（HP+25）'; }) },
  ];
}
function studyMagic() {
  const r = chk('spi', 45);
  if (r.ok) { const n = rand(3, 5); gain('mag', n); gain('int', 1); return [r.text, `魔術回路を酷使し、術式の精度を高めた。（魔力+${n} 知力+1）`]; }
  hp(-10); gain('mag', 1); return [r.text, '魔力の制御を誤り、回路が焼けるように痛んだ。（HP-10 魔力+1）'];
}
function walkTown(t) {
  const ev = drawEvent(t);
  if (ev && Math.random() < 0.85) return showEvent(ev);
  actResult('散策', () => { gain('luk', 1); return `${pick(CITY.places)}を歩いた。特に何も起きなかったが、街の地理に詳しくなった。（幸運+1）`; });
}
function actResult(title, fn) {
  NOTES = [];
  const res = [].concat(fn()).filter(Boolean).concat(takeNotes());
  next(title, res.map(p => `<p>${p}</p>`), advance);
}

// ---- 聖杯戦争中 ----
function warDayActions() {
  const canBuild = G.workshop < 5;
  return [
    { label: `${SV()}と過ごす`, hint: '絆↑', fn: hangoutMenu },
    { label: '情報収集', hint: '敵陣営の情報（知力/交渉）', fn: () => actResult('情報収集', gatherIntel) },
    { label: '工房を強化する', hint: canBuild ? `資金-2 陣地Lv${G.workshop}→${G.workshop + 1}` : '最大', disabled: !canBuild || G.master.money < 2,
      fn: () => actResult('陣地作成', () => {
        money(-2); const up = (G.master.birth === 'shrine' || G.flags.leyline) && G.workshop < 4 ? 2 : 1;
        G.workshop = Math.min(5, G.workshop + up);
        return `拠点の結界を張り直し、魔力の溜まり場を整えた。（陣地Lv ${G.workshop}）`;
      }) },
    { label: '鍛錬する', hint: '体力↑ 魔力↑', fn: () => actResult('鍛錬', () => { gain('phy', 2); gain('mag', 2);
      return `${SV()}に見てもらいながら鍛錬した。（体力+2 魔力+2）`; }) },
    { label: '休息', hint: 'HP・魔力回復', fn: () => actResult('休息', () => { hp(25); shp(20); mp(15);
      return `拠点で体を休めた。（HP+25 ${SV()}のHP+20 魔力+15）`; }) },
  ];
}
function warNightActions() {
  const targets = hostileRivals().filter(r => r.intel >= 2);
  const acts = [
    { label: '夜の巡回', hint: '敵と遭遇するかも', fn: patrol, cls: 'danger' },
  ];
  if (targets.length) acts.push({ label: '敵の拠点を襲撃する', hint: '奇襲で有利に戦える', fn: assaultMenu, cls: 'danger' });
  acts.push(
    { label: '拠点で待ち構える', hint: `陣地Lv${G.workshop}で迎撃`, fn: defendBase },
    { label: `${SV()}と語らう`, hint: '絆↑ 特別な会話', fn: nightTalk },
    { label: '魔力を回復して休む', hint: '魔力・HP回復', fn: nightRest },
  );
  return acts;
}

function gatherIntel() {
  const stat = G.master.stats.int >= G.master.stats.cha ? 'int' : 'cha';
  const r = chk(stat, 55);
  if (!r.ok) return [r.text, '有力な手がかりは得られなかった。'];
  const t = intelRandom(1);
  return [r.text, t || 'これ以上、新しい情報は見つからなかった。'];
}
// 情報を1段階進める：1=マスター判明 2=拠点判明 3=真名判明
function intelRandom(n) {
  const cand = aliveRivals().filter(r => r.intel < 3);
  if (!cand.length) return '';
  const r = pick(cand); r.intel = Math.min(3, r.intel + n);
  if (r.intel === 1) return `${r.cls}陣営のマスターは<b>${esc(r.master)}</b>――${r.type}だと分かった。`;
  if (r.intel === 2) return `${r.cls}陣営の拠点を突き止めた。いつでも襲撃を仕掛けられる。`;
  addLog(`${r.cls}の真名「${servantOf(r).name}」を看破。`);
  return `${r.cls}の真名は<b>${servantOf(r).name}</b>だ！ 伝承から弱点が見えてきた。（戦闘で有利になる）`;
}

// ---- サーヴァントと過ごす ----
function bondTier() { const b = G.servant.bond; return b < 30 ? 'low' : b < 60 ? 'mid' : 'high'; }
function hangoutMenu() {
  const choices = Object.entries(ACTIVITIES).map(([k, a]) => ({
    label: a.name, hint: `${a.place}${a.cost ? `・資金-${a.cost}` : ''}`, disabled: G.master.money < a.cost,
    fn: () => hangout(k),
  }));
  choices.push({ label: 'やめる', fn: hub });
  scene({ title: `${SV()}と過ごす`, sub: 'BOND', body: [`<p>今日はどう過ごそうか。${SV()}にも好みがあるようだ。</p>`,
    G.servant.bond >= 20 ? `<p class="note">${SV()}が好きそうなこと：${PERSONAS[servantOf(G).persona].likes.map(k => ACTIVITIES[k].name).join('、')}</p>` :
      '<p class="note">絆が深まれば、好みも分かってくるだろう。</p>'], choices });
}
function hangout(k) {
  NOTES = [];
  const a = ACTIVITIES[k]; const per = PERSONAS[servantOf(G).persona];
  money(-a.cost);
  let n = 4, react = '';
  if (per.likes.includes(k)) { n = 8; react = `${SV()}はとても楽しそうだ。`; }
  else if (per.dislikes.includes(k)) { n = 1; react = `${SV()}はあまり気乗りしない様子だった。`; }
  n += Math.floor(G.master.stats.cha / 30);
  const statGain = { eat: ['cha', 1], train: ['phy', 2], walk: ['luk', 1], talk: ['int', 1], shop: ['cha', 1], quiet: ['spi', 2] }[k];
  gain(statGain[0], statGain[1]);
  bond(n);
  const line = fmt(pick(per[bondTier()]));
  next(a.name, [`<p>${a.place}で${SV()}と過ごした。${react}</p>`, `<p class="quote">${line}</p>`,
    `<p class="note">絆+${n}　${STAT_LABEL[statGain[0]]}+${statGain[1]}</p>`, ...takeNotes().map(t => `<p>${t}</p>`)], advance);
}
function nightTalk() {
  const sv = G.servant;
  if (sv.bond >= 70 && !sv.special && sv.bond >= (G.flags.specialNext || 0)) return specialEvent();
  NOTES = [];
  const n = rand(3, 5); bond(n); mp(5);
  const per = PERSONAS[servantOf(G).persona];
  next('夜の語らい', [`<p>静かな夜。拠点の縁側で、${SV()}と言葉を交わした。</p>`, `<p class="quote">${fmt(pick(per[bondTier()]))}</p>`,
    `<p class="note">絆+${n}</p>`, ...takeNotes().map(t => `<p>${t}</p>`)], advance);
}
function specialEvent() {
  const per = PERSONAS[servantOf(G).persona];
  const choices = Object.entries(RELATIONS).map(([k, r]) => ({
    label: r.verb, hint: `関係：${r.name}`, fn: () => {
      G.servant.special = k; NOTES = []; bond(10);
      addLog(`${servantOf(G).name}と「${r.name}」の関係になる。`);
      next('特別な関係', [`<p>${fmt(r.text)}</p>`, `<p class="note">${SV()}と<b>「${r.name}」</b>になった。戦闘で絆の力が働くようになる。</p>`,
        ...takeNotes().map(t => `<p>${t}</p>`)], advance);
    },
  }));
  choices.push({ label: '今は、この関係のままで', fn: () => {
    G.flags.specialNext = G.servant.bond + 10;
    next('夜の語らい', [`<p>あなたは微笑んで、首を横に振った。${SV()}は少しだけ目を伏せ、「……そうか」と呟いた。</p>`,
      '<p class="note">さらに絆が深まれば、また機会が訪れるだろう。</p>'], advance);
  } });
  scene({ title: '月下の告白', sub: 'SPECIAL', body: [`<p>月の綺麗な夜だった。${SV()}がふと、真剣な顔であなたを見つめた。</p>`,
    `<p class="quote">${fmt(per.special)}</p>`, '<p>あなたは――</p>'], choices });
}
function nightRest() {
  if (Math.random() < 0.15 && hostileRivals().length) {
    const r = wpick(hostileRivals(), x => x.aggr);
    return next('夜襲', [`<p>眠りに落ちかけた時、結界が軋む音がした。――${rivalLabel(r)}陣営の襲撃だ！</p>`],
      () => startBattle(r, { defend: true }), '迎え撃つ');
  }
  actResult('休息', () => { mp(30); shp(15); hp(15); bond(1); return `パスを通じて${SV()}に魔力を送りながら眠った。（魔力+30 ${SV()}のHP+15 HP+15）`; });
}
function patrol() {
  const roll = Math.random();
  const foes = hostileRivals();
  if (roll < 0.55 && foes.length) {
    const r = wpick(foes, x => 0.5 + x.aggr);
    r.intel = Math.max(r.intel, 1);
    return next('遭遇', [`<p>${pick(CITY.places)}を巡回中、凄まじい殺気が闇を裂いた。</p>`,
      `<p>――<b>${rivalLabel(r)}</b>のサーヴァントだ。背後には、マスターの${esc(r.master)}の姿もある。</p>`,
      r.intel >= 1 ? `<p class="quote">「${r.quote}」</p>` : ''], () => startBattle(r, {}), '戦う');
  }
  if (roll < 0.8) { const ev = drawEvent('night'); if (ev) return showEvent(ev); }
  actResult('夜の巡回', () => { const t = Math.random() < 0.4 ? intelRandom(1) : ''; return ['静かな夜だった。敵の気配は見当たらない。', t]; });
}
function assaultMenu() {
  const choices = hostileRivals().filter(r => r.intel >= 2).map(r => ({
    label: `${rivalLabel(r)}陣営を襲う`, hint: `マスター：${esc(r.master)}`, cls: 'danger',
    fn: () => next('襲撃', [`<p>夜陰に紛れ、${rivalLabel(r)}陣営の拠点へと迫る。</p>`], () => startBattle(r, { ambush: true }), '仕掛ける'),
  }));
  choices.push({ label: 'やめる', fn: hub });
  scene({ title: '襲撃目標', sub: 'ASSAULT', body: ['<p>拠点を突き止めた陣営に奇襲を仕掛ける。奇襲側は戦闘で有利になる。</p>'], choices });
}
function defendBase() {
  if (Math.random() < 0.45 && hostileRivals().length) {
    const r = wpick(hostileRivals(), x => x.aggr);
    return next('迎撃', [`<p>結界に反応。${rivalLabel(r)}陣営が攻めてきた！ 陣地の力で迎え撃つ。</p>`],
      () => startBattle(r, { defend: true }), '迎え撃つ');
  }
  actResult('待機', () => { mp(15); shp(10); return '敵は現れなかった。結界の内で魔力を蓄えた。（魔力+15 HP+10）'; });
}

// =============================================================
//  召喚
// =============================================================
function summonScene() {
  const choices = G.catalysts.map(id => ({ label: `「${SV_BY_ID[id].catalyst}」を使う`, hint: '縁ある英霊を喚ぶ', fn: () => doSummon(id) }));
  choices.push({ label: '触媒を使わない', hint: '自分と似た英霊が応える', fn: () => doSummon(null) });
  scene({ title: '召喚の夜', sub: 'SUMMONING', body: [
    '<p>準備の日々は終わった。今宵、聖杯戦争が始まる。</p>',
    `<p>工房の床に描いた召喚陣の前に立つ。右手の令呪が、熱を帯びて脈打っている。${G.ritual >= 3 ? '陣は完璧に仕上がっている。' : G.ritual > 0 ? '陣の準備はまずまずだ。' : '急ごしらえの陣だが、やるしかない。'}</p>`,
    G.catalysts.length ? '<p>手元には触媒がある。どれを使おうか。</p>' : '<p>触媒は手に入らなかった。縁に任せるしかない。</p>',
  ], choices });
}
function doSummon(catalystId) {
  let sv;
  if (catalystId) sv = SV_BY_ID[catalystId];
  else {
    const a = alignLabel().split('・');
    sv = wpick(SERVANTS, s => {
      const [o, m] = s.align.split('・');
      let w = 1;
      if (o === a[0]) w += 1.5;
      if (m === a[1]) w += 1.5;
      if (!BASE_CLASSES.includes(s.cls)) w *= 0.4;
      if (G.flags.vision === s.id) w *= G.flags.visionStrong ? 6 : 2.5;
      return w;
    });
  }
  G.servant = { id: sv.id, hp: 0, mp: 60 + G.ritual * 13, bond: 5 + G.ritual * 4, special: null, exposed: false };
  G.servant.hp = servantHpMax();
  setupRivals();
  G.phase = 'war'; G.day = 1; G.slot = 0;
  addLog(`${sv.cls}「${sv.name}」を召喚。`);
  if (G.flags.earlyIntel) intelRandom(1);
  SCENE = { kind: 'summon', sv }; TAB = 'story'; render();
}
function setupRivals() {
  const mine = servantOf(G).cls;
  let classes = BASE_CLASSES.filter(c => c !== mine);
  if (classes.length > 6) classes = shuffle(classes).slice(0, 6);
  const types = shuffle(RIVAL_TYPES);
  G.rivals = classes.map((cls, i) => {
    const pool = SERVANTS.filter(s => s.cls === cls && s.id !== G.servant.id);
    const s = pick(pool); const t = types[i];
    const r = { id: 'r' + i, cls, servantId: s.id, master: randomName(t.foreign), type: t.type, power: t.power + rand(-1, 1),
      aggr: t.aggr, quote: t.quote, alive: true, hp: 0, hpMax: 0, mp: 100, intel: 0, ally: false, bounty: false, masterDead: false };
    r.hpMax = r.hp = 70 + rankValue(s.p[1]);
    return r;
  });
}
function afterSummon() {
  next('聖杯戦争、開幕', [
    `<p>こうして、深見市における聖杯戦争が幕を開けた。七騎のサーヴァントと七人のマスター。生き残るのは、ただ一組。</p>`,
    `<p class="note">昼は準備と絆を深める時間、夜は戦いの時間だ。情報を集めて敵の真名を暴き、絆を育み、最後の一組となれ。期限は${WAR_DAYS}日。</p>`,
  ], () => startSlot(), '戦いへ');
}

// =============================================================
//  戦闘
// =============================================================
// 戦術の三すくみ：白兵（筋力）> 魔術（魔力）> 機動（敏捷）> 白兵
const TACTICS = {
  str: { name: '白兵戦', stat: 0, beats: 'mag', tell: '大きく踏み込む構えを見せている（白兵戦の気配）' },
  agi: { name: '機動戦', stat: 2, beats: 'str', tell: '間合いを測り、素早く動き回っている（機動戦の気配）' },
  mag: { name: '魔術戦', stat: 3, beats: 'agi', tell: '周囲に魔力が渦巻いている（魔術戦の気配）' },
  np:  { name: '宝具', stat: 5, tell: '魔力が異常に高まっている――宝具が来る！' },
};
let B = null; // 戦闘中の状態（セーブしない）

function startBattle(rival, opt) {
  G.battles++;
  B = { r: rival, round: 0, log: [], ambush: !!opt.ambush, defend: !!opt.defend, final: !!opt.final, miracle: false, enemyNext: null, tell: null };
  rival.intel = Math.max(rival.intel, 1);
  planEnemy();
  battleScene();
}
function enemyName() { return B.r.intel >= 3 ? servantOf(B.r).short : `敵${B.r.cls}`; }
function planEnemy() {
  const r = B.r;
  let t;
  if (r.mp >= 50 && (r.hp < r.hpMax * 0.5 || Math.random() < 0.15)) t = 'np';
  else t = wpick(['str', 'agi', 'mag'], k => Math.pow(rivalParam(r, TACTICS[k].stat), 1.5));
  B.enemyNext = t;
  // 敵の構えを読む（知力と情報量で見抜ける確率が上がる）
  const seeChance = t === 'np' ? 0.9 : 0.3 + G.master.stats.int / 200 + (r.intel >= 3 ? 0.2 : 0);
  if (Math.random() < seeChance) {
    const shown = t === 'np' || Math.random() < 0.75 ? t : pick(['str', 'agi', 'mag']);
    B.tell = `${enemyName()}は${TACTICS[shown].tell}`;
  } else B.tell = null;
}
function battleScene(extra) {
  const r = B.r; const sv = G.servant; const me = servantOf(G);
  const body = [
    `<div class="battle-field">
      <div class="fighter"><div class="fighter-top"><span class="fighter-name">${me.short}</span><span>${me.cls}　HP ${sv.hp}/${servantHpMax()}　魔力 ${sv.mp}</span></div>
        <div class="bar hp"><i style="width:${(sv.hp / servantHpMax()) * 100}%"></i></div></div>
      <div class="vs">VS</div>
      <div class="fighter enemy"><div class="fighter-top"><span class="fighter-name">${enemyName()}</span><span>${r.cls}${r.intel >= 3 ? '' : '（真名不明）'}　HP ${Math.max(0, r.hp)}/${r.hpMax}</span></div>
        <div class="bar enemy"><i style="width:${Math.max(0, r.hp / r.hpMax) * 100}%"></i></div></div>
    </div>`,
  ];
  if (B.round === 0) {
    const mods = [];
    if (B.ambush) mods.push('奇襲');
    if (B.defend && G.workshop) mods.push(`陣地Lv${G.workshop}`);
    if (r.intel >= 3) mods.push('真名看破');
    const aff = classAffinity(me.cls, r.cls);
    if (aff > 0 && me.cls !== 'バーサーカー' && r.cls !== 'バーサーカー') mods.push('クラス相性◎');
    if (aff < 0) mods.push('クラス相性×');
    body.push(`<p>${B.final ? '聖杯を賭けた、最後の戦いが始まる。' : '戦闘開始。'}${mods.length ? `<br><span class="note">有利・不利：${mods.join('・')}</span>` : ''}</p>`);
  }
  if (extra) body.push(...extra);
  if (B.tell) body.push(`<p class="tell">${B.tell}</p>`);
  body.push('<p class="note">白兵は魔術に、魔術は機動に、機動は白兵に強い。</p>');
  const p = i => `${PARAM_NAMES[i]}${valueRank(servantParam(i))}`;
  const choices = [
    { label: '白兵戦', hint: `${p(0)}・魔術に強い`, fn: () => battleRound('str') },
    { label: '機動戦', hint: `${p(2)}・白兵に強い`, fn: () => battleRound('agi') },
    { label: '魔術戦', hint: `${p(3)}・機動に強い`, fn: () => battleRound('mag') },
    { label: `宝具「${me.np}」`, hint: `魔力-50　真名が知られる`, disabled: sv.mp < 50, fn: () => battleRound('np'), cls: 'primary' },
    { label: '令呪：全力で打ち倒せ', hint: `令呪-1（残${G.master.seals}）`, disabled: G.master.seals < 1, fn: () => battleRound('seal'), cls: 'danger' },
  ];
  if (!B.final) choices.push({ label: '撤退する', hint: '敏捷・幸運で判定', fn: () => battleRound('flee') });
  scene({ title: B.final ? '最終決戦' : '戦闘', sub: `ROUND ${B.round + 1}`, body, choices });
}
function battleRound(cmd) {
  const r = B.r; const me = servantOf(G); const sv = G.servant;
  B.round++;
  const log = [];
  const et = B.enemyNext;
  const P = me.short, E = enemyName();

  if (cmd === 'flee') {
    const mine = (servantParam(2) + servantParam(4)) / 2 + rand(1, 40) + 5;
    const theirs = rivalParam(r, 2) + rand(1, 40);
    if (mine >= theirs) {
      addLog(`${rivalLabel(r)}陣営との戦闘から撤退。`);
      B = null;
      return next('撤退', [`<p>${P}が煙幕のように魔力を散らし、あなたを抱えて離脱した。どうにか逃げ切れた。</p>`], advance);
    }
    log.push(`撤退に失敗！ ${E}に回り込まれた。`);
    const dmg = rand(10, 18); shp(-dmg); log.push(`${P}は${dmg}のダメージを受けた。`);
    return afterRound(log);
  }

  // 自分の戦術
  let tac = cmd, sealBoost = 0;
  if (cmd === 'seal') {
    G.master.seals--; sealBoost = 35; shp(25);
    tac = ['str', 'agi', 'mag'].reduce((best, k) => servantParam(TACTICS[k].stat) > servantParam(TACTICS[best].stat) ? k : best, 'str');
    log.push(`<b>「令呪をもって命ずる――全力で打ち倒せ！」</b> 右手の令呪が一画、紅く輝いて消えた。`);
    addLog('令呪を一画使用（戦闘）。');
  }
  if (tac === 'np') {
    sv.mp -= 50;
    if (!sv.exposed) { sv.exposed = true; log.push(`<span class="note">宝具の解放により、${P}の真名が敵に知られた。</span>`); }
    log.push(`<b>「${me.np}（${me.npRuby}）――！」</b>`);
  }
  if (et === 'np') {
    r.mp -= 50;
    const en = servantOf(r);
    log.push(`敵が宝具を解き放つ。<b>「${en.np}（${en.npRuby}）！」</b>`);
    if (r.intel < 3) { r.intel = 3; log.push(`<span class="note">その宝具は――${en.name}！ 敵の真名が判明した。</span>`); addLog(`${r.cls}の真名「${en.name}」が判明。`); }
  }

  // スコア計算
  const myBase = servantParam(TACTICS[tac].stat) + (tac === 'np' ? 25 : 0);
  const enBase = rivalParam(r, TACTICS[et].stat) + (et === 'np' ? 25 : 0);
  let myMod = classAffinity(me.cls, r.cls) + Math.floor(sv.bond / 8) + (sv.special ? 5 : 0) + Math.floor(G.master.stats.mag / 20)
    + (['mercenary', 'executor'].includes(G.master.birth) ? 4 : 0) + (r.intel >= 3 ? 8 : 0)
    + (B.ambush && B.round === 1 ? 10 : 0) + (B.defend ? G.workshop * 3 : 0) + sealBoost;
  let enMod = classAffinity(r.cls, me.cls) + r.power + (sv.exposed ? 6 : 0);
  if (tac !== 'np' && et !== 'np') {
    if (TACTICS[tac].beats === et) myMod += 15;
    if (TACTICS[et].beats === tac) enMod += 15;
  }
  const mine = myBase + myMod + rand(1, 40);
  const theirs = enBase + enMod + rand(1, 40);
  const diff = mine - theirs;
  log.push(`<span class="note">${P}：${TACTICS[tac].name}（${mine}）　対　${E}：${TACTICS[et].name}（${theirs}）</span>`);

  const crit = luck => Math.random() * 100 < luck / 2;
  if (diff >= 0) {
    let dmg = Math.round(10 + diff * 0.5 + (tac === 'np' ? 22 : 0) - rankValue(servantOf(r).p[1]) / 10);
    if (crit(servantParam(4))) { dmg = Math.round(dmg * 1.5); log.push('会心の一撃！'); }
    dmg = Math.max(6, dmg); r.hp -= dmg;
    log.push(winText(tac, P, E) + `（${dmg}ダメージ）`);
  } else {
    let dmg = Math.round(10 + (-diff) * 0.5 + (et === 'np' ? 22 : 0) - servantParam(1) / 10);
    if (crit(rivalParam(r, 4))) { dmg = Math.round(dmg * 1.5); log.push('痛恨の一撃！'); }
    dmg = Math.max(6, dmg); shp(-dmg);
    log.push(winText(et, E, P) + `（${dmg}ダメージ）`);
  }
  afterRound(log);
}
function winText(t, a, d) {
  const lines = {
    str: [`${a}の重い一撃が${d}を捉えた！`, `${a}が真正面から${d}を押し切った！`],
    agi: [`${a}は残像を残して${d}の死角に回り込んだ！`, `目にも留まらぬ速さで、${a}の連撃が${d}を襲う！`],
    mag: [`${a}の放った魔力の奔流が${d}を呑み込んだ！`, `${a}の術式が炸裂し、${d}を吹き飛ばした！`],
    np: [`宝具の光が夜を白く染め、${d}を薙ぎ払った！`, `伝説そのものが、${d}に牙を剥いた！`],
  };
  return pick(lines[t]);
}
function afterRound(log) {
  const r = B.r; const sv = G.servant;
  const extra = [`<div class="blog">${log.map(t => `<p>${t}</p>`).join('')}</div>`];
  if (r.hp <= 0) return battleWin(extra);
  if (sv.hp <= 0) {
    if (sv.special && !B.miracle) {
      B.miracle = true; sv.hp = 25;
      extra.push(`<p class="quote">「……まだだ。${M()}を残して、消えるわけにはいかない！」</p><p>絆の力が、消えかけた霊基を繋ぎ止めた。（HP 25で踏みとどまった）</p>`);
    } else return battleLoseChoice(extra);
  }
  planEnemy();
  battleScene(extra);
}
function battleLoseChoice(extra) {
  const choices = [];
  if (G.master.seals > 0) choices.push({ label: '令呪：「立ち上がれ」', hint: `令呪-1（残${G.master.seals}）`, cls: 'danger', fn: () => {
    G.master.seals--; G.servant.hp = Math.round(servantHpMax() * 0.4); addLog('令呪で消滅寸前のサーヴァントを繋ぎ止める。');
    planEnemy(); battleScene([`<p>令呪の魔力が${SV()}の霊基を強引に繋ぎ止めた。${SV()}は再び立ち上がる！</p>`]);
  } });
  choices.push({ label: '……ここまでか', fn: () => { B = null; ending('lost'); } });
  scene({ title: '霊核の危機', sub: 'CRISIS', body: [...extra, `<p>${SV()}が膝をつく。霊基が崩れ始めている――このままでは消滅する！</p>`], choices });
}
function battleWin(extra) {
  const r = B.r; const wasFinal = B.final; B = null;
  r.alive = false; r.hp = 0; G.kills++;
  NOTES = []; bond(5);
  const body = [...extra, `<p>${rivalLabel(r)}の霊基が砕け、光の粒となって夜空に溶けていく。<b>勝利だ。</b></p>`];
  addLog(`${rivalLabel(r)}陣営（${servantOf(r).name}）を撃破。`);
  if (r.bounty) { G.master.seals++; body.push('<p>教会からの討伐令を果たした。報酬として令呪が一画、右手に刻まれた。（令呪+1）</p>'); }
  body.push(...takeNotes().map(t => `<p>${t}</p>`));
  const finish = () => {
    if (wasFinal || aliveRivals().length === 0) return victoryScene();
    advance();
  };
  const choices = [
    { label: 'マスターを教会へ送る', hint: '秩序・善', fn: () => { NOTES = []; tone('law'); tone('good');
      next('戦いの後', [`<p>${esc(r.master)}は力なく頷き、教会へと去っていった。</p>`, ...takeNotes().map(t => `<p>${t}</p>`)], finish); } },
    { label: '残った令呪を奪う', hint: '悪 / 令呪+1', disabled: G.master.seals >= 3, fn: () => { NOTES = []; tone('evil'); G.master.seals++; r.masterDead = true;
      next('戦いの後', [`<p>${esc(r.master)}の腕から令呪を奪い取った。（令呪+1）</p>`, ...takeNotes().map(t => `<p>${t}</p>`)], finish); } },
    { label: '何も言わず立ち去る', hint: '混沌', fn: () => { NOTES = []; tone('chaos');
      next('戦いの後', ['<p>敗者に掛ける言葉はない。あなたは振り返らずに、その場を後にした。</p>', ...takeNotes().map(t => `<p>${t}</p>`)], finish); } },
  ];
  scene({ title: '勝利', sub: 'VICTORY', body, choices });
}

// ---- 終盤の展開 ----
function breakAlliance() {
  for (const r of aliveRivals()) r.ally = false;
  next('同盟の終わり', ['<p>残るは、同盟を結んだ陣営とあなたたちだけになった。電話の向こうで、相手が静かに告げる。「――ここまでだ。次に会う時は、敵同士だ」</p>'], startSlot);
}
function finalBattleIntro() {
  const r = aliveRivals()[0];
  r.ally = false;
  next('天降山', [
    '<p>残る陣営は、あと一つ。天降山の頂、霊脈の集う古社の境内に、聖杯の器が姿を現しつつある。</p>',
    `<p>月明かりの下、最後の敵が待っていた。${rivalLabel(r)}陣営――マスター、${esc(r.master)}。</p>`,
    `<p class="quote">「${r.quote}」</p>`,
    `<p class="quote">${fmt(pick(PERSONAS[servantOf(G).persona].high))}</p>`,
  ], () => startBattle(r, { final: true }), '最後の戦いへ');
}
function deadlineScene() {
  // 期限切れ：残った陣営のうち最強の一つが最後の敵になる
  G.day = WAR_DAYS; G.slot = 1;
  const alive = aliveRivals();
  const strongest = alive.reduce((a, b) => (a.power + a.hp) >= (b.power + b.hp) ? a : b);
  for (const r of alive) if (r !== strongest) { r.alive = false; addLog(`${rivalLabel(r)}陣営、混戦の中で脱落。`); }
  next('最終局面', ['<p>聖杯の器が満ちようとしている。監督役から全陣営へ通達が届いた。「聖杯の降臨は今宵。残る者は天降山へ」</p>',
    '<p>天降山へ向かう途中の混戦で、いくつもの陣営が倒れていった。生き残ったのは――</p>'], finalBattleIntro);
}

// =============================================================
//  エンディング
// =============================================================
function victoryScene() {
  G.phase = 'end';
  const sv = servantOf(G); const b = BIRTHS.find(x => x.id === G.master.birth);
  const choices = [
    { label: `「${b.wish}」を願う`, hint: 'マスターの願い', fn: () => ending(G.flags.grailTruth ? 'wishKnown' : 'wish') },
  ];
  if (G.servant.special) choices.unshift({ label: `${sv.short}の受肉を願う`, hint: `「${RELATIONS[G.servant.special].name}」として共に生きる`, cls: 'primary', fn: () => ending('together') });
  if (G.flags.grailTruth) choices.unshift({ label: '聖杯を破壊する', hint: '汚染された聖杯を消し去る', cls: 'primary', fn: () => ending(G.servant.special ? 'destroySpecial' : 'destroy') });
  choices.push({ label: '何も願わない', fn: () => ending('none') });
  scene({ title: '聖杯降臨', sub: 'THE HOLY GRAIL', body: [
    '<p>最後の敵が消え、天降山の頂に黄金の杯が降りてきた。万能の願望機――聖杯。</p>',
    G.flags.grailTruth ? '<p>だが、あなたは知っている。その黄金の内側には、どす黒い泥が渦巻いていることを。</p>' : '<p>その輝きは眩く、どんな願いでも叶えてくれそうに見えた。</p>',
    `<p class="quote">${fmt(pick(PERSONAS[sv.persona].high))}</p>`,
    '<p>あなたが願うのは――</p>',
  ], choices });
}
function ending(kind) {
  G.phase = 'end'; clearSave();
  const sv = G.servant ? servantOf(G) : null; const rel = G.servant && G.servant.special ? RELATIONS[G.servant.special] : null;
  const per = sv ? PERSONAS[sv.persona] : null;
  const E = {
    dead: () => ({ title: '終幕：血に染まる冬', text: [`<p>深見市の冬の夜に、${M()}の命は散った。</p>`, sv ? `<p>契約者を失った${sv.short}もまた、光の粒となって消えていく。最後に、何かを言いかけたように見えた。</p>` : '', '<p>聖杯戦争は、あなたのいないまま続いていく。</p>'] }),
    lost: () => ({ title: '終幕：脱落', text: [`<p>${sv.short}の霊基は砕け、聖杯戦争からの脱落が決まった。</p>`, `<p class="quote">${fmt(per.farewell)}</p>`,
      G.flags.registered ? '<p>あなたは教会に保護され、戦いの結末を遠くから聞くことになった。右手の痣だけが、あの日々が夢ではなかったと告げている。</p>' : '<p>あなたは傷ついた体を引きずり、冬の街へと消えた。右手の痣だけが、あの日々が夢ではなかったと告げている。</p>'] }),
    wish: () => ({ title: '終幕：歪んだ願い', text: ['<p>聖杯は願いを聞き届けた。――最悪の形で。</p>', '<p>溢れ出した黒い泥が天降山を覆い、深見市の夜空が赤く染まる。願いは確かに「叶った」。だが、その代償はあまりにも大きかった。</p>',
      `<p>消えゆく${sv.short}の姿を見送りながら、あなたは悟る。この聖杯は、最初から呪われていたのだと。</p>`, '<p class="note">ヒント：聖杯の真実を知っていれば、別の選択肢があったかもしれない。</p>'] }),
    wishKnown: () => ({ title: '終幕：承知の上の願い', text: ['<p>呪われた聖杯と知りながら、あなたは願った。泥が溢れ、街に災いが降りかかる。</p>', `<p>${sv.short}は何も言わず、ただ悲しげにあなたを見つめていた。</p>`] }),
    destroy: () => ({ title: '終幕：冬の終わり', text: [`<p>「${sv.short}、聖杯を破壊して」</p>`, `<p>${sv.short}の最後の宝具が、黄金の杯を光の中に消し去った。呪いは霧散し、天降山に朝日が昇る。</p>`,
      `<p class="quote">${fmt(per.farewell)}</p>`, '<p>聖杯を手にすることはなかった。けれど、あなたは確かにこの街を救ったのだ。</p>'] }),
    destroySpecial: () => ({ title: '終幕：夜明けの約束', text: [`<p>二人で選んだ答えは、聖杯の破壊だった。${sv.short}の宝具が呪いを焼き払い、夜が明けていく。</p>`,
      `<p>消えゆく体で、${sv.short}はあなたの手を握った。「${rel ? rel.name : ''}」として過ごした日々が、指先から伝わってくる。</p>`, `<p class="quote">${fmt(per.farewell)}</p>`,
      '<p>朝日の中に消えた姿を、あなたは決して忘れない。――いつかまた、どこかの空の下で。</p>'] }),
    together: () => ({ title: `終幕：${rel ? rel.name : ''}として`, text: [`<p>「${sv.short}に、この世界で生きる体を」</p>`, '<p>聖杯は願いを聞き届けた。黄金の光が霊基を包み、英霊は肉体を得て現世に降り立つ。</p>',
      `<p>冬が終わり、深見市に春が来た。桜並木の下を、${sv.short}と並んで歩く。かつて「${rel ? rel.name : ''}」と呼び合った二人の、新しい日々が始まる。</p>`,
      G.flags.grailTruth ? '<p class="note">聖杯の呪いは今も眠っている。いつか、二人で向き合う日が来るだろう。</p>' : ''] }),
    none: () => ({ title: '終幕：願いなき勝者', text: ['<p>あなたは何も願わなかった。聖杯は誰の手にも渡らぬまま、静かに消えていった。</p>', `<p class="quote">${fmt(per.farewell)}</p>`,
      '<p>勝者の手に残ったのは、戦いの記憶と、確かに結ばれた絆だけだった。</p>'] }),
  }[kind]();
  addLog(E.title);
  SCENE = { kind: 'ending', title: E.title, text: E.text.filter(Boolean), good: !['dead', 'lost', 'wish', 'wishKnown'].includes(kind) };
  TAB = 'story'; render();
}

// =============================================================
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

function render() {
  const app = document.getElementById('app');
  if (!SCENE) return;
  const k = SCENE.kind;
  if (k === 'title' || k === 'create') { app.innerHTML = `<main class="main">${k === 'title' ? viewTitle() : viewCreate()}</main>`; return; }
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
}
function viewTop() {
  const night = G.slot === 1;
  const dayText = G.phase === 'prep' ? `${G.day}日目` : G.phase === 'summon' ? '開幕前夜' : G.phase === 'end' ? '終幕' : `${G.day}日目`;
  const seals = [0, 1, 2].map(i => `<svg class="seal ${i < G.master.seals ? '' : 'used'}" viewBox="0 0 18 22" aria-hidden="true"><path d="${SEAL_PATH}"/></svg>`).join('');
  const extraSeals = G.master.seals > 3 ? `<span class="tag red">+${G.master.seals - 3}</span>` : '';
  const sv = G.servant;
  return `<header class="topbar">
    <div class="topbar-row">
      <div class="when"><span class="when-phase">${phaseLabel()}</span><span class="when-day">${dayText}</span>
        ${G.phase === 'prep' || G.phase === 'war' ? `<span class="time-chip ${night ? 'night' : 'day'}">${night ? '夜' : '昼'}</span>` : ''}</div>
      <div class="seals" title="令呪 残り${G.master.seals}画" aria-label="令呪 残り${G.master.seals}画">${seals}${extraSeals}</div>
    </div>
    <div class="mini"><span>HP <b>${G.master.hp}</b></span><span>資金 <b>${G.master.money}</b>万円</span>
      ${sv ? `<span>${SV()} <b>${sv.hp}</b>/${servantHpMax()}</span><span>絆Lv <b>${Math.floor(sv.bond / 10)}</b></span>` : `<span>触媒 <b>${G.catalysts.length}</b></span>`}</div>
  </header>`;
}
function viewScene() {
  const s = SCENE;
  return `<article class="scene">
    ${s.sub ? `<div class="scene-sub">${s.sub}</div>` : ''}
    <h1 class="scene-title">${s.title}</h1>
    <div class="scene-body">${s.body.join('')}</div>
    <div class="choices">${s.choices.map((c, i) => `<button class="choice ${c.cls || ''}" data-choice="${i}" ${c.disabled ? 'disabled' : ''}>
      <span class="c-label">${c.label}</span>${c.hint ? `<span class="c-hint">${c.hint}</span>` : ''}</button>`).join('')}</div>
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
  const save = SCENE.save;
  return `<div class="title-wrap">
    ${circleSVG()}
    <h1 class="game-title"><small>HOLY GRAIL WAR</small>深見市聖杯戦争</h1>
    <p class="lead">${CITY.intro}</p>
    <div class="choices">
      <button class="choice primary" data-act="new"><span class="c-label">はじめから</span><span class="c-hint">産まれはランダムで決まる</span></button>
      ${save ? `<button class="choice" data-act="continue"><span class="c-label">つづきから</span><span class="c-hint">${esc(save.master.name)}・${save.phase === 'prep' ? '準備期間' : '聖杯戦争'}${save.day}日目</span></button>` : ''}
    </div>
  </div>`;
}
function viewCreate() {
  const m = SCENE.master, b = SCENE.birth;
  return `<article class="scene">
    <div class="scene-sub">MASTER</div><h1 class="scene-title">あなたの産まれ</h1>
    <div class="birth-card">
      <div class="birth-name">${b.name}</div>
      <p style="margin:6px 0 10px;font-size:14px">${b.text}</p>
      <dl class="kv"><dt>年齢</dt><dd>${m.age}歳</dd><dt>魔術属性</dt><dd>${m.element}</dd><dt>魔術回路</dt><dd>${m.circuits}本</dd>
        <dt>資金</dt><dd>${m.money}万円</dd><dt>願い</dt><dd>${b.wish}</dd><dt>特徴</dt><dd>${b.perk}</dd></dl>
      <h3>能力値</h3>${statBars(m.stats)}
    </div>
    <div class="field"><label for="mname">マスターの名前</label><input id="mname" maxlength="16" value="${esc(m.name)}" autocomplete="off"></div>
    <div class="choices">
      <button class="choice primary" data-act="start"><span class="c-label">この運命で始める</span></button>
      <button class="choice" data-act="reroll"><span class="c-label">運命を引き直す</span><span class="c-hint">産まれ・能力を再抽選</span></button>
      <button class="choice" data-act="title"><span class="c-label">タイトルへ戻る</span></button>
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
  return `<article class="scene">
    ${circleSVG('summon-glow')}
    <div class="reveal">
      <p class="quote" style="font-family:var(--font-display);font-size:16px;margin:16px 0">「${sv.line}」</p>
      ${servantCard(sv)}
      <div class="choices"><button class="choice primary" data-act="aftersummon"><span class="c-label">契約を結ぶ</span></button></div>
    </div></article>`;
}
function servantCard(sv) {
  return `<div class="svcard"><div class="svclass">${CLASS_EN[sv.cls] || sv.cls}</div>
    <div class="svname">${sv.name}</div>
    <div><span class="tag gold">${sv.cls}</span><span class="tag">${sv.align}</span><span class="tag">性格：${PERSONAS[sv.persona].label}</span></div>
    <p style="font-size:13px;color:var(--muted);margin:8px 0 12px">${sv.desc}</p>
    ${paramGrid(sv.p, G && G.servant && G.servant.id === sv.id ? servantParam : null)}
    <div class="np"><div class="np-ruby">${sv.npRuby}</div><div class="np-name">${sv.np}</div></div></div>`;
}
function viewMaster() {
  const m = G.master; const b = BIRTHS.find(x => x.id === m.birth);
  return `<section class="panel"><h2>${M()}</h2><div><span class="tag gold">${b.name}</span><span class="tag">${alignLabel()}</span><span class="tag">${m.element}</span></div>
    <h3>状態</h3><div class="bars">
      <div class="bar-row"><span>HP</span><div class="bar hp"><i style="width:${m.hp}%"></i></div><span class="num">${m.hp}</span></div></div>
    <dl class="kv" style="margin-top:10px"><dt>令呪</dt><dd>${m.seals}画</dd><dt>資金</dt><dd>${m.money}万円</dd><dt>魔術回路</dt><dd>${m.circuits}本</dd>
      <dt>陣地</dt><dd>Lv ${G.workshop}${G.flags.leyline || m.birth === 'shrine' ? '（霊脈の知識あり）' : ''}</dd>
      <dt>願い</dt><dd>${b.wish}</dd><dt>特徴</dt><dd>${b.perk}</dd>
      <dt>属性値</dt><dd>秩序 ${m.align.law > 0 ? '+' : ''}${m.align.law}／善 ${m.align.good > 0 ? '+' : ''}${m.align.good}</dd></dl>
    <h3>能力値</h3>${statBars(m.stats)}
    ${G.servant ? `<p class="note" style="font-size:12px;color:var(--muted)">マスターの魔力による英霊パラメータ補正：${masterCorrection() > 0 ? '+' : ''}${masterCorrection()}（魔力が低いとサーヴァントの性能が落ちる）</p>` : ''}
    <h3>所持している触媒</h3>${G.catalysts.length ? G.catalysts.map(id => `<span class="tag gold">${SV_BY_ID[id].catalyst}</span>`).join('') : '<p class="empty">まだ無い</p>'}
    <h3>判明している事実</h3>
      ${G.flags.grailTruth ? '<span class="tag red">聖杯は汚染されている</span>' : G.flags.grailHint ? '<span class="tag">聖杯には何か秘密がある……</span>' : '<p class="empty">特になし</p>'}
      ${G.flags.registered ? '<span class="tag green">教会に登録済み</span>' : ''}
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
        <div class="rival-head"><span class="rival-cls">${r.intel >= 3 ? s.name : r.cls}</span>
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
    </div></section>`;
}
function viewEnding() {
  const s = SCENE; const sv = G.servant ? servantOf(G) : null;
  return `<article class="scene">
    ${circleSVG()}
    <div class="scene-sub">${s.good ? 'ENDING' : 'BAD END'}</div>
    <h1 class="scene-title">${s.title}</h1>
    <div class="scene-body">${s.text.join('')}</div>
    <div class="ending-stats">
      <div>到達<b>${G.phase === 'end' && G.servant ? `${G.day}日目` : `準備${G.day}日目`}</b></div>
      <div>撃破数<b>${G.kills}騎</b></div>
      <div>サーヴァント<b>${sv ? sv.short : '―'}</b></div>
      <div>絆<b>${G.servant ? `Lv${Math.floor(G.servant.bond / 10)}` : '―'}${G.servant && G.servant.special ? `・${RELATIONS[G.servant.special].name}` : ''}</b></div>
    </div>
    <div class="choices"><button class="choice primary" data-act="totitle"><span class="c-label">タイトルへ</span></button></div>
  </article>`;
}

// ---------------- 操作（タップ） ----------------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-choice],[data-tab],[data-act]');
  if (!t || t.disabled) return;
  if (t.dataset.tab) { TAB = t.dataset.tab; if (SCENE) SCENE.confirmReset = false; render(); return; }
  if (t.dataset.choice !== undefined) { const c = SCENE.choices[+t.dataset.choice]; if (c && !c.disabled) c.fn(); return; }
  const a = t.dataset.act;
  if (a === 'new') createScreen();
  else if (a === 'reroll') { const name = document.getElementById('mname').value.trim(); const m = rollMaster(); if (name) m.name = name; createScreen(m); }
  else if (a === 'title' || a === 'totitle') titleScreen();
  else if (a === 'start') {
    const name = document.getElementById('mname').value.trim() || SCENE.master.name;
    SCENE.master.name = name.slice(0, 16);
    newGame(SCENE.master);
    const b = BIRTHS.find(x => x.id === G.master.birth);
    next('物語の始まり', [`<p>${CITY.intro}</p>`, `<p>${M()}――${b.name}。${b.text}</p>`,
      `<p>右手の甲に浮かんだ三画の紋様。それは聖杯に選ばれたマスターの証、<b>令呪</b>だ。聖杯戦争の開幕まで、あと${PREP_DAYS}日。</p>`,
      G.catalysts.length ? `<p>家の宝物庫からは、英霊召喚の触媒<b>「${SV_BY_ID[G.catalysts[0]].catalyst}」</b>を持ち出してきた。</p>` : '',
      '<p class="note">準備期間のうちに能力を鍛え、触媒を探し、召喚陣を整えよう。触媒がなければ、あなたの在り方に似た英霊が応えるという。</p>'], startSlot, '準備を始める', 'PROLOGUE');
  }
  else if (a === 'continue') { G = SCENE.save; if (!G.flags) G.flags = {}; startFromSave(); }
  else if (a === 'aftersummon') afterSummon();
  else if (a === 'reset') {
    if (SCENE.confirmReset) { clearSave(); titleScreen(); }
    else { SCENE.confirmReset = true; render(); }
  }
});
function startFromSave() {
  if (G.phase === 'summon') return summonScene();
  hub();
}

// ---------------- 起動 ----------------
function boot(data) {
  if (data && data.save) { try { G = JSON.parse(data.save); return startFromSave(); } catch (e) { } }
  titleScreen();
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: LAST_HUB }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
