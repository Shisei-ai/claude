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
// 藤丸シナリオかどうか（成長の節目・過ごし方・出来事が切り替わる）
function isFuji() { return !!G && G.master.birth === 'fujimaru'; }
// 章の名前は性別で変わることがある（少年期／少女期）
function stageList() { return (isFuji() ? STAGES_F : isKishi() ? STAGES_K : isShirou() ? STAGES_S : STAGES).map(st => typeof st.band === 'function' ? { ...st, band: st.band() } : st); }
function currentStage() { return stageList()[G.growth.stage]; }
function stageLabel(st = currentStage()) { return st.label || `${st.age}歳`; }

// 伸びやすさ（産まれ × 生まれつきの得意 × ゆらぎ）を掛けて能力を伸ばす
function growthMul(stat) { return (birthOf().growth[stat] || 1) * (G.master.talent === stat ? 1.3 : 1); }
const GROW_RATE = 1.2;   // 成長全体の倍率（大きくすると18歳時点の能力が高くなる）
function grow(stat, base) {
  const rate = isFuji() ? FUJI_RATE : isKishi() ? KISHI_RATE : isShirou() ? SHIROU_RATE : GROW_RATE;
  const n = Math.max(1, Math.round(base * rate * growthMul(stat) * (0.85 + Math.random() * 0.3))); gain(stat, n); return n;
}

// ---------------- 誕生（0歳） ----------------
function growthStart() {
  arcPick();   // 人生の転機（data_lifearcs.js）
  if (isFuji()) return fujimaruStart();
  if (isKishi()) return kishinamiStart();
  if (isShirou()) return shirouStart();
  const b = birthOf(); const m = G.master;
  G.lastChapter = '誕生';
  chapterCard('第零幕　生い立ち', () => {
    scene({ title: '誕生', sub: '0歳', reveal: true, body: paras([
      b.origin,
      `元気な${gw('男の子', '女の子', '赤ん坊')}だった。${M()}――そう名付けられた。`,
      `<div class="birth-facts"><div><span>魔術属性</span><b>${m.element}</b></div><div><span>魔術回路</span><b>${m.circuits}本</b></div><div><span>生まれつきの得意</span><b>${TALENTS[m.talent]}</b></div></div>`,
      `<span class="note">これから18歳になるまでの日々が、あなたの能力を形作る。どう育つかは、あなた次第だ。</span>`,
    ]), choices: [{ label: '産声を上げる', cls: 'primary', icon: 'next', fn: () => nextStage() }] });
  });
}
// ---------------- 藤丸：帰還 ----------------
function fujimaruStart() {
  const m = G.master;
  G.lastChapter = '日常';
  chapterCard('特殊シナリオ　藤丸立香', () => {
    scene({ title: '帰還', sub: '20歳・春', reveal: true, body: paras([
      '長い、長い旅だった。<br>焼却された未来。剪定された世界。数え切れない英霊たちとの出会いと、別れ。',
      'その全てを終えて、あなたは「日常」に帰ってきた。<br>人類最後のマスター――その肩書きは、もう誰も口にしない。',
      '春。深見市の大学に入学し、小さな学生アパートで一人暮らしを始めた。<br>右手の甲には、もう令呪はない。……はずだった。',
      `<div class="birth-facts"><div><span>魔術回路</span><b>${m.circuits}本（平凡）</b></div><div><span>魔術属性</span><b>${m.element}</b></div><div><span>得意</span><b>${TALENTS[m.talent]}</b></div></div>`,
      '<span class="note">特殊シナリオ：英霊召喚の制限はすべて解除されている。召喚の際には、英霊を指名することもできる。<br>11月までの7ヶ月の過ごし方が、あなたの力になる。</span>',
    ]), choices: [{ label: '日常を始める', cls: 'primary', icon: 'next', fn: () => nextStage() }] });
  });
}

// ---------------- 成長の節目 ----------------
function focusList() {
  if (isFuji()) return Object.entries(FOCUS_F);
  if (isKishi()) return Object.entries(FOCUS_K);
  if (isShirou()) return Object.entries(FOCUS_S);
  const b = birthOf();
  return Object.entries(FOCUS).filter(([, f]) =>
    G.master.age >= f.ages[0] && G.master.age <= f.ages[1] &&
    (!f.magic || hasMagic()) && (!f.births || f.births.includes(b.id)));
}
function focusDef(k) { return (isFuji() ? FOCUS_F : isKishi() ? FOCUS_K : isShirou() ? FOCUS_S : FOCUS)[k]; }
function growthStage() {
  const st = currentStage();
  saveGame();
  const b = birthOf();
  const choices = focusList().map(([k, f]) => ({
    label: f.name,
    hint: Object.entries(f.gains).map(([s, v]) => `${STAT_LABEL[s]}${growthMul(s) >= 1.2 ? '↑↑' : '↑'}`).join(' ') + (f.money ? ' 資金↑' : '') + (f.catalyst ? ' 触媒?' : '') + (f.friend && G.friend ? ' 友情↑' : ''),
    icon: guessIcon(f.name) || 'train',
    fn: () => applyFocus(k),
  }));
  scene({ title: stageLabel(st), sub: `${st.band}　${b.home}`, body: [
    `<p>${st.text}</p>`,
    `<div class="grow-stats">${statBars(G.master.stats)}</div>`,
    `<p class="note">${isFuji() ? 'このひと月を' : isKishi() ? 'この期間を' : isShirou() ? 'この一年を' : 'この数年を'}、どう過ごす？　↑↑は伸びやすい能力。</p>`,
  ], choices });
}
function applyFocus(k) {
  const f = focusDef(k); NOTES = [];
  const res = [];
  const ups = Object.entries(f.gains).map(([s, v]) => `${STAT_LABEL[s]}+${grow(s, v)}`);
  if (f.money) money(f.money);
  if (f.friend) friend(f.friend);
  if (f.tone) tone(f.tone);
  if (f.lore) lore(f.lore);
  money(Math.max(1, Math.round(birthOf().money / 7)));   // おこづかい・仕送り
  res.push(isFuji() ? `${stageLabel()}は、「${f.name}」ひと月だった。` : isKishi() ? `${stageLabel()}の期間は、「${f.name}」ことに費やした。` : isShirou() ? `${stageLabel()}――「${f.name}」一年だった。` : `${G.master.age}歳からの数年間は、「${f.name}」日々だった。`);
  res.push(`<span class="note">${ups.join('　')}${f.money ? `　資金+${f.money}` : ''}</span>`);
  if (f.catalyst && Math.random() < f.catalyst) { const c = giveCatalyst(); res.push(`街の古道具屋で、妙に惹かれる品を手に入れた。<b>${c}</b>だ。`); }
  addLog(`${stageLabel()}：${f.name}。`);
  next(stageLabel(), paras(res.concat(takeNotes())), growthEvent, '次へ', currentStage().band);
}
function growthEvent() {
  if (pendingSpellTier()) return spellLearnScene(growthEvent);   // 魔力が一定値を超えたら、魔術を習得する
  const age = G.master.age; const b = birthOf().id; const idx = G.growth.stage;
  const ok = e => !G.used[e.id] && (!e.births || e.births.includes(b)) && (!e.magic || hasMagic()) && (!e.cond || e.cond());
  let ev;
  if (isFuji() || isKishi() || isShirou()) {
    const list = isFuji() ? GROWTH_EVENTS_F : isKishi() ? GROWTH_EVENTS_K : GROWTH_EVENTS_S;
    ev = list.find(e => e.fixed && e.stages.includes(idx) && ok(e));
    if (!ev) { const pool = list.filter(e => !e.fixed && e.stages.includes(idx) && ok(e)); if (pool.length) ev = pick(pool); }
  } else {
    ev = GROWTH_EVENTS.find(e => e.fixed && e.ages[0] === age && ok(e));
    // 人生の転機：決まった出来事が無ければ、次の章を優先する
    if (!ev && G.arc) { ev = GROWTH_EVENTS.find(e => e.arc === G.arc && e.step === (G.arcStep || 0) + 1 && age >= e.ages[0] && ok(e)); if (ev) G.arcStep = ev.step; }
    if (!ev) { const pool = GROWTH_EVENTS.filter(e => !e.fixed && !e.arc && age >= e.ages[0] && age <= e.ages[1] && ok(e)); if (pool.length) ev = pick(pool); }
  }
  if (!ev) return nextStage();
  showEvent({ ...ev, chapter: `${currentStage().band}・${stageLabel()}` }, nextStage);
}
function nextStage() {
  G.growth.stage++;
  if (G.growth.stage >= stageList().length) return comingOfAge();
  const st = currentStage();
  if (isShirou()) G.master.age = 17 + G.growth.stage;
  else if (!isFuji() && !isKishi()) G.master.age = st.age;
  const go = () => growthStage();
  if (!CFG.fx) return go();
  const title = isFuji() || isKishi() || isShirou() ? st.label : `${kanjiNum(st.age)}歳`;
  if (st.band !== G.lastChapter) { G.lastChapter = st.band; return showCard({ kicker: st.band, title, sub: st.text, cls: 'chapter', ms: 1800 }, go); }
  showCard({ kicker: st.band, title, cls: 'day', ms: 1100 }, go);
}

// 18歳の冬（令呪の発現）は routes.js の comingOfAge() へ
