// =============================================================
//  growth.js … 成長期（0歳〜17歳）の進行
//  誕生 → [過ごし方を選ぶ → 出来事] × 7回 → 18歳の冬（令呪の発現）
// =============================================================

// ---- 幼馴染 ----
function makeFriend() { if (!G.friend) G.friend = { name: pick(NAMES.friend), bond: 0 }; return G.friend.name; }
function friendName() { return G.friend ? esc(G.friend.name) : ''; }
function friend(n) { if (G.friend) G.friend.bond = clamp(G.friend.bond + n, 0, 100); }
function hasMagic() { return birthOf().magic || !!G.flags.awakened; }
function kanjiNum(n) {
  const d = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 10) return n === 10 ? '十' : d[n];
  if (n < 20) return '十' + d[n - 10];
  return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
}
function currentStage() { return STAGES[G.growth.stage]; }

// 伸びやすさ（産まれ × 生まれつきの得意 × ゆらぎ）を掛けて能力を伸ばす
function growthMul(stat) { return (birthOf().growth[stat] || 1) * (G.master.talent === stat ? 1.3 : 1); }
const GROW_RATE = 1.2;   // 成長全体の倍率（大きくすると18歳時点の能力が高くなる）
function grow(stat, base) { const n = Math.max(1, Math.round(base * GROW_RATE * growthMul(stat) * (0.85 + Math.random() * 0.3))); gain(stat, n); return n; }

// ---------------- 誕生（0歳） ----------------
function growthStart() {
  const b = birthOf(); const m = G.master;
  G.lastChapter = '誕生';
  chapterCard('第零幕　生い立ち', () => {
    scene({ title: '誕生', sub: '0歳', reveal: true, body: paras([
      b.origin,
      `<div class="birth-facts"><div><span>魔術属性</span><b>${m.element}</b></div><div><span>魔術回路</span><b>${m.circuits}本</b></div><div><span>生まれつきの得意</span><b>${TALENTS[m.talent]}</b></div></div>`,
      `<span class="note">これから18歳になるまでの日々が、あなたの能力を形作る。どう育つかは、あなた次第だ。</span>`,
    ]), choices: [{ label: '産声を上げる', cls: 'primary', icon: 'next', fn: () => nextStage() }] });
  });
}

// ---------------- 成長の節目 ----------------
function growthStage() {
  const st = currentStage();
  saveGame();
  const b = birthOf();
  const list = Object.entries(FOCUS).filter(([, f]) =>
    G.master.age >= f.ages[0] && G.master.age <= f.ages[1] &&
    (!f.magic || hasMagic()) && (!f.births || f.births.includes(b.id)));
  const choices = list.map(([k, f]) => ({
    label: f.name,
    hint: Object.entries(f.gains).map(([s, v]) => `${STAT_LABEL[s]}${growthMul(s) >= 1.2 ? '↑↑' : '↑'}`).join(' ') + (f.money ? ' 資金↑' : '') + (f.catalyst ? ' 触媒?' : '') + (f.friend && G.friend ? ' 友情↑' : ''),
    icon: guessIcon(f.name) || 'train',
    fn: () => applyFocus(k),
  }));
  scene({ title: `${G.master.age}歳`, sub: `${st.band}　${b.home}`, body: [
    `<p>${st.text}</p>`,
    `<div class="grow-stats">${statBars(G.master.stats)}</div>`,
    `<p class="note">この数年を、どう過ごす？　↑↑は伸びやすい能力。</p>`,
  ], choices });
}
function applyFocus(k) {
  const f = FOCUS[k]; NOTES = [];
  const res = [];
  const ups = Object.entries(f.gains).map(([s, v]) => `${STAT_LABEL[s]}+${grow(s, v)}`);
  if (f.money) money(f.money);
  if (f.friend) friend(f.friend);
  if (f.tone) tone(f.tone);
  money(Math.max(1, Math.round(birthOf().money / 7)));   // おこづかい・仕送り
  res.push(`${G.master.age}歳からの数年間は、「${f.name}」日々だった。`);
  res.push(`<span class="note">${ups.join('　')}${f.money ? `　資金+${f.money}` : ''}</span>`);
  if (f.catalyst && Math.random() < f.catalyst) { const c = giveCatalyst(); res.push(`調べものの途中で、古い品を手に入れた。<b>${c}</b>だ。`); }
  addLog(`${G.master.age}歳：${f.name}。`);
  next(`${G.master.age}歳`, paras(res.concat(takeNotes())), growthEvent, '次へ', currentStage().band);
}
function growthEvent() {
  const age = G.master.age; const b = birthOf().id;
  const ok = e => !G.used[e.id] && (!e.births || e.births.includes(b)) && (!e.magic || hasMagic()) && (!e.cond || e.cond());
  let ev = GROWTH_EVENTS.find(e => e.fixed && e.ages[0] === age && ok(e));
  if (!ev) {
    const pool = GROWTH_EVENTS.filter(e => !e.fixed && age >= e.ages[0] && age <= e.ages[1] && ok(e));
    if (pool.length) ev = pick(pool);
  }
  if (!ev) return nextStage();
  showEvent({ ...ev, chapter: `${currentStage().band}・${age}歳` }, nextStage);
}
function nextStage() {
  G.growth.stage++;
  if (G.growth.stage >= STAGES.length) return comingOfAge();
  const st = currentStage();
  G.master.age = st.age;
  const go = () => growthStage();
  if (!CFG.fx) return go();
  if (st.band !== G.lastChapter) { G.lastChapter = st.band; return showCard({ kicker: st.band, title: `${kanjiNum(st.age)}歳`, sub: st.text, cls: 'chapter', ms: 1800 }, go); }
  showCard({ kicker: st.band, title: `${kanjiNum(st.age)}歳`, cls: 'day', ms: 1100 }, go);
}

// 18歳の冬（令呪の発現）は routes.js の comingOfAge() へ
