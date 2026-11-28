// =============================================================
//  data_counter.js … 雫ルートの終章「抑止の守護者」
//
//  深見の聖杯戦争は、本来「天降大神が、聖杯を降ろす」儀式だった。神が霊脈の力を器に注ぎ、
//  世界はそれを「聖杯戦争」という枠として許す。その枠の中だからこそ、英霊――境界記録帯（ゴーストライナー）――の召喚が許されていた。
//  今回、契りは守られず、神は聖杯を降ろさなかった。マスターたちが「聖杯の気配」と信じていたものは、荒ぶる神の魔力だった。
//  祟りの日に神が鎮まった（または討たれた）ことで、世界はそれが聖杯ではなかったと正しく認識する。
//  儀式は、最初から成立していなかった。枠の外で呼ばれた英霊たちは「あってはならないもの」となり、
//  抑止力が、聖杯戦争に関わった全員を消すための「抑止の守護者」を降ろす。
//
//  守護者の正体は、百八十年前、最初の花嫁となった天降の巫女「白妙（しろたえ）」。
//  飢えと疫病で滅びかけた村を救うために神と最初の契りを結び、さらに死の間際、世界とも契約した――「この地の人々が、二度と滅びぬように」。
//  その代価として抑止の守護者となった彼女が、今、守りたかったはずの土地の人々に刃を向ける。
//
//  流れ（通常のシナリオの「雫ルート」のみ）
//   10日目の昼 祟りの日に勝つ → 「綻び」（空がひび割れ、英霊の輪郭が揺らぐ）
//   10日目の夜 「抑止の守護者」……守護者が降り、他の陣営の英霊を次々と消していく。監督役が儀式の破綻を告げる
//   11日目〜12日目の昼 昼と夜の行動「存在の楔を打つ」
//        要石を楔に変える／降臨の神楽を雫と舞う（神が生きていれば）／残された者たちを集める／守護者の正体を探る
//   12日目の夜 抑止の守護者との決戦（必ず立ちはだかる）
//  結末：存在の楔（要石の楔＋神楽か人々の意志）／綻びの朝（楔が足りず、英霊が自らを楔にする）／抹消（敗北）
//        山の守り人になる道を選んでいれば、守り人の結末（守り人そのものが、この地の楔になる）
// =============================================================

const COUNTER_GUARDIAN = { id: 'counter_guardian', name: '抑止の守護者', short: '守護者', cls: '守護者', p: ['A', 'B', 'A', 'A', 'E', 'EX'], align: '―', persona: 'berserker',
  np: '祓神楽・白妙', npRuby: 'ハラエカグラ・シロタエ', catalyst: null, line: '', desc: '世界の均衡を乱すものを消し去る、抑止力の掃除屋。顔は白い霧の面に隠れ、手首に古い鈴を結んでいる。' };
function counterRoute() { return !!G && G.route3 === 'miko' && kamiRoute() === 'normal'; }
function counterOn() { return !!(G && G.flags.counter && !G.flags.guardianDone); }
function ctr() { if (!G.counter) G.counter = { stone: false, kagura: false, allies: false, named: false }; return G.counter; }
function counterBattleDay() { return G.day > 12 || (G.day === 12 && G.slot === 1); }
// 守護者との決戦までは、勝利や同盟の解消で物語を終わらせない（core.js の startSlot から）
function counterHold() { return counterOn() && !counterBattleDay(); }
function wedgeCount() { const c = ctr(); return [c.stone, c.kagura, c.allies, c.named].filter(Boolean).length; }
function wedgeOk() { const c = ctr(); return c.stone && (c.kagura || c.allies); }

// ---- 祟りの日に勝った後（data_kami.js の kamiWin・kamiPactClimax から） ----
function counterStart(how) {
  const k = kami(); G.flags.counter = true; addLog('天降の祟りの後、儀式が綻び始める。');
  const reunion = how === 'slain' ? mikoReunion('slain') : how === 'pact' ? mikoReunion('bride') : '';
  next('綻び', paras([
    how === 'slain' ? `${SV()}の一撃が、荒魂の黒く濁った右目を貫いた。白い大狼は、長い遠吠えを一つ上げて、霧と共にほどけていった。山から、消えていた人々が下りてくる。` : how === 'pact' ? '契りは、結び直された。霧が晴れ、山から、消えていた人々が下りてくる。' : '',
    reunion,
    'その夜。天降山の頂を見上げた時、あなたは、空に<b>ひび</b>が入っているのに気づいた。ガラスに走るような、細く、白い亀裂。',
    `${SV()}の輪郭が、一瞬だけ、ノイズのように揺らいだ。${SV()}自身も、驚いたように自分の手を見つめている。`,
    `携帯が鳴った。監督役の${CAST.sister}だった。声が、かすかに震えている。「……聖杯の気配が、消えました。いいえ――最初から、そんなものは無かったのかもしれません」`,
    '<span class="note">何かが、決定的に狂い始めている。</span>',
  ].filter(Boolean)), advance, '次へ', 'STORY');
}

STORY.push(
  // ---- 10日目の夜：抑止の守護者 ----
  { id: 'k_counter', phase: 'war', day: 10, slot: 1, after: 'hub', cond: () => counterOn(),
    title: '抑止の守護者', chapter: '終章　抑止',
    text: () => { const gone = aliveRivals().filter(r => !r.friend).map(r => `${rivalLabel(r)}`); const fr = frRival && frRival() && frRival().alive;
      for (const r of aliveRivals()) { r.alive = false; r.erased = true; r.hp = 0; r.ally = false; }
      return `深夜。天降山の頂の亀裂から、白い光が一筋、街へ降りた。<br>光の中から現れたのは、白装束の人影だった。古い巫女装束にも似た、白い狩衣。顔は、白い霧の面に隠れて見えない。右手首に、古い鈴が一つ。<br>` +
        `<p class="quote">「――境界記録帯の残留を確認。儀式の不成立により、存在の根拠を喪失。修正を、開始します」</p>` +
        `その夜のうちに、街のあちこちで、英霊の気配が一つ、また一つと消えていった。${gone.length ? gone.join('、') + '陣営。' : ''}${fr ? `${friendName()}の陣営も。――${friendName()}本人は、教会に保護されて無事だという。` : ''}戦いですらなかった。白い人影が通り過ぎた後には、何も残らなかった。<br>` +
        `<p class="quote">${CAST.sister}「……深見の聖杯戦争は、天降大神が聖杯を降ろすことで成立する儀式でした。その枠の中でだけ、英霊の召喚が許されていた。ですが今回、神は聖杯を降ろさなかった。わたしたちが聖杯の気配だと信じていたのは、荒ぶる神の魔力だったのです」</p>` +
        `<p class="quote">「祟りが鎮まった今、世界はそれに気づいてしまった。儀式は最初から成立していなかった。……枠の外で呼ばれた英霊は、あってはならないもの。あれは<b>抑止の守護者</b>――世界の、掃除屋です。英霊を消し終えたら、次は、聖杯戦争に関わったすべての人間を」</p>` +
        `${SV()}が、白い人影の去った方角を睨んでいた。${CAST.miko}が、あなたの袖を掴んだ。手首の鈴を見て、${CAST.miko}は息を呑んだ。「……あの鈴。うちの神社の、一番古い神楽鈴と、同じ形です」` +
        `<br><span class="note">守護者は、二日後の夜に、ここへ来る。それまでに「<b>存在の楔</b>」を打ち込まなければ、あなたも、${SV()}も、${CAST.miko}も、この冬に関わったすべてが、なかったことにされる。昼と夜の行動に「存在の楔を打つ」が加わった。</span>`; },
    choices: [
      { label: '「消させない。誰も」', hint: '善・大胆', cls: 'primary', run: () => { tone('good'); tone('bold'); bond(3); return [`${SV()}が、短く頷いた。${say('withYou')}`, `${CAST.miko}は、震える手で鈴を握りしめた。「……わたしも、戦います。天降の巫女として」`]; } },
      { label: `「${CAST.sister}、守護者を止める方法は？」`, hint: '知力・手がかり', run: () => { gain('int', 2);
          return [`「……存在の楔。この土地と、ここに生きる人々が、確かにここに在るのだと、世界に示すもの。要石か、儀式か、人の意志か。――わたしにも、それ以上は分かりません」（知力+2）`]; } },
    ] },
);

// ---- 昼と夜の行動「存在の楔を打つ」 ----
const WEDGE_TASKS = [
  { id: 'stone', name: '要石を、存在の楔に変える', hint: () => `魔力判定${kami().tasks.purify || G.flags.kamiStoneFound ? '（要石の場所は分かっている）' : ''}`, stat: 'mag', diff: () => 60 - (kami().tasks.purify || G.flags.kamiStoneFound ? 10 : 0),
    run: () => `掘り起こされた要石に、${CAST.miko}が新しい注連縄を張り、あなたが魔力を注ぎ込んだ。石は、神を鎮める楔から、<b>この地の存在を世界に縫い止める楔</b>へと、その意味を変えた。` },
  { id: 'kagura', name: () => `降臨の神楽を、${CAST.miko}と舞う`, hint: () => kami().outcome === 'slain' ? '神のいない山では舞えない' : `精神判定${mkClose() ? '（雫と息が合う）' : ''}`, stat: 'spi', diff: () => 58 - (mkClose() ? 10 : 0) - (mkRel() === 'ally' ? 5 : 0),
    cond: () => kami().outcome !== 'slain',
    run: () => `神楽殿で、${CAST.miko}と二人、夜通し舞った。百八十年、誰も舞わなかった「降臨の神楽」。最後の鈴が鳴った時、天降山の頂に、細い光の柱が立った。――<b>神が、ようやく聖杯を降ろそうとしている</b>。儀式は、まだ終わっていない。` },
  { id: 'allies', name: '残された者たちを集める', hint: '交渉判定', stat: 'cha', diff: () => 56,
    run: () => `${CAST.old}、${CAST.sister}、${kamiHome() ? '叔父' : '宮司'}、そして英霊を失ったマスターたち。教会の礼拝堂に、生き残った人々が集まった。「この街で、生きていたい」――その意志の重さは、きっと世界にも届く。` + (typeof rvRallyLines === 'function' ? rvRallyLines() : '') },
  { id: 'named', name: '守護者の正体を探る', hint: '知力判定（神社の古文書）', stat: 'int', diff: () => 56,
    run: () => `古文書の、墨で塗り潰された最後の頁。${CAST.miko}が霊視で読み解いた。<p class="quote">「初代の巫女・<b>白妙</b>、山へ嫁ぐ。嫁ぐ前の夜、白妙は天にも願った。――この地の人々が、二度と滅びぬように、と」</p>守護者は、百八十年前の最初の花嫁だった。この地を守るために世界と契約し、その代価として、抑止の守護者になったのだ。` },
];
function wedgeMenu() {
  const c = ctr(); const choices = [];
  for (const t of WEDGE_TASKS) { if (c[t.id] || (t.cond && !t.cond())) continue;
    const nm = typeof t.name === 'function' ? t.name() : t.name; const d = t.diff();
    choices.push({ label: `【楔】${nm}`, hint: `${typeof t.hint === 'function' ? t.hint() : t.hint} 目標${d}`, cls: 'primary', fn: () => actResult(nm, () => {
      const r = chk(t.stat, d); if (!r.ok) return [r.text, 'うまくいかなかった。時間は、あまり残っていない。'];
      c[t.id] = true; if (t.id === 'named') G.flags.guardianNamed = true; mk(3);
      return [r.text, t.run(), `<span class="note">存在の楔：${wedgeCount()}/4${wedgeOk() ? '　――楔は、打ち込める。' : ''}</span>`]; }) });
  }
  for (const t of WEDGE_TASKS) if (t.cond && !t.cond() && !c[t.id]) choices.push({ label: typeof t.name === 'function' ? t.name() : t.name, hint: typeof t.hint === 'function' ? t.hint() : t.hint, disabled: true, fn: () => {} });
  const lines = WEDGE_TASKS.map(t => `<li>${c[t.id] ? '✔' : '・'} ${typeof t.name === 'function' ? t.name() : t.name}</li>`).join('');
  submenu('存在の楔を打つ', '終章　抑止', [`<p>守護者が来るのは、12日目の夜。それまでに、この地と人々がここに在ることを、世界に示さなければならない。</p>`,
    `<ul class="clue-list">${lines}</ul>`, `<p class="note">楔が打ち込めるのは、要石の楔に加えて、降臨の神楽か、人々の意志が揃った時。正体を知れば、守護者の力は弱まる。</p>`], choices);
}
function counterStatusHTML() {
  if (!counterOn()) return '';
  return `<div class="wide kami-line"><span>抑止</span>存在の楔 ${wedgeCount()}/4${wedgeOk() ? '（打ち込める）' : ''}・守護者の到来まで${Math.max(0, 12 - G.day)}日</div>`;
}

// ---- 12日目の夜：抑止の守護者（ending.js の victoryScene から） ----
function guardianIntro() {
  G.phase = 'end'; const c = ctr(); const breath = typeof finalBreath === 'function' ? finalBreath() : '';
  const named = G.flags.guardianNamed;
  scene({ title: '抑止の守護者', sub: '終章　抑止', reveal: true, body: paras([
    '十二日目の夜。天降山の亀裂は、空の半分にまで広がっていた。',
    `神社の石段の上に、白い人影が立っていた。霧の面の奥から、感情のない声が響く。<p class="quote">「残存する関与者を確認。対象――マスター一名、境界記録帯一騎、及び、儀式の媒介たる巫女一名。修正を、執行します」</p>`,
    c.stone ? '足元の要石が、脈打つように光っていた。この地を世界に縫い止める、存在の楔。' : '',
    c.kagura ? `背後の神楽殿で、${CAST.miko}が鈴を鳴らした。降臨の神楽。天降山の頂の光の柱が、少しだけ太くなる。` : '',
    c.allies ? `礼拝堂の窓から、生き残った人々が、祈るようにこちらを見ている。` : '',
    named ? `あなたは、白い人影に向かって、その名を呼んだ。<p class="quote">「――白妙」</p>人影の手首で、古い鈴が、ちりんと鳴った。一瞬だけ、霧の面が揺らいだ。` : '',
    `${SV()}が、あなたと${CAST.miko}の前に立った。${say('stayBack')}`, breath,
    `<span class="note">抑止の守護者との決戦。撤退はできない。存在の楔 ${wedgeCount()}/4${wedgeOk() ? '――楔は、打ち込める。' : '――楔は、まだ足りない。'}</span>`,
  ].filter(Boolean)), choices: [{ label: '最後の戦いへ', cls: 'primary', fn: guardianBattle }] });
}
function guardianBattle() {
  const n = wedgeCount();
  // 体力と力は、打ち込んだ楔の数で弱まる（正体を知れば、さらに）
  const hp = Math.max(80, 170 - n * 20 - (G.flags.guardianNamed ? 10 : 0));
  const r = { id: 'counter_guardian', cls: '守護者', servantId: 'counter_guardian', master: '―', type: '', quote: '', power: Math.max(3, 7 - n), aggr: 1, alive: true,
    hp, hpMax: hp, mp: 100, intel: G.flags.guardianNamed ? 3 : 2, clues: 0, seals: 0, ally: false, named: !!G.flags.guardianNamed };
  B = null; startBattle(r, { boss: true, guardian: true, final: true });
}
function guardianWin() {
  B = null; sfx('win'); G.flags.guardianDone = true; addLog('抑止の守護者を退ける。');
  if (kami().outcome === 'pact') return ending('kamiBride');
  return ending(wedgeOk() ? 'kamiWedge' : 'kamiFray');
}
function guardianLose() { B = null; G.flags.guardianDone = true; ending('kamiErased'); }

// ---- 結末 ----
function counterEndingTexts(sv) {
  const s = sv ? sv.short : ''; const m = CAST.miko;
  return {
    kamiWedge: () => ({ title: '終幕：存在の楔', text: [`<p>${s}の一撃が、霧の面を砕いた。その瞬間、要石が光の楔となって霊脈を貫き、天降山の光の柱が、夜空いっぱいに広がった。</p>`,
      `<p>――神が、聖杯を降ろした。百八十年目にして、儀式は、ようやく正しく成った。世界は、この地の在り方を認め、修正の手を引いていく。</p>`,
      `<p>白い人影の霧の面が、ほどけていった。現れたのは、${m}によく似た、若い娘の顔だった。神楽殿で鈴を鳴らす${m}を見て、娘は、ふっと微笑んだ。</p><p class="quote">「……この地は、続いていたのですね。――よかった」</p><p>白妙は、光の粒になって消えた。手首の鈴だけが、石段の上に、ちりんと落ちた。</p>`,
      `<p>天降山の頂に、黄金の杯が静かに浮かんでいた。神が、自らの手で降ろした、本物の聖杯。${m}は、しばらくそれを見上げてから、あなたを振り返った。</p><p class="quote">「……もう、わたしたちには要りませんね。願いは、自分たちで叶えますから」</p>` + `<p>天降山に降りた聖杯を、あなたは${m}と二人で、山へ還した。「もう、花嫁はいらない」――白い大狼が、霧の向こうで静かに頭を垂れた。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`, `<p>深見の聖杯戦争は、これで最後になる。この冬に生きた人々の名前は、何一つ消えなかった。</p>`] }),
    kamiFray: () => ({ title: '終幕：綻びの朝', text: [`<p>${s}の一撃が、霧の面を砕いた。白い人影は崩れ落ちた。――けれど、空の亀裂は、閉じなかった。楔が、足りない。世界の修正は、止まらない。</p>`,
      G.flags.lastTalkDone === 'kamiFray' ? `<p>――その夜、${s}が何を選んだのかを、あなたは生涯忘れない。英霊の存在そのものが、この地を世界に縫い止めた。</p>` : `<p>${s}が、あなたを振り返った。その体が、足元から光にほどけ始めていた。</p><p class="quote">${farewellLine(sv)}</p><p>${s}は、自らの霊基を砕いて、要石の上に注ぎ込んだ。英霊の存在そのものが、楔になる。亀裂が、ゆっくりと閉じていく。</p>`,
      `<p>夜が明けると、街の人々は、この冬に起きたことを、何一つ覚えていなかった。英霊の名も、聖杯戦争という言葉も、すべて綻びの向こうに消えた。</p>`,
      `<p>覚えているのは、あなたと、${m}だけだった。右手の令呪の痕を、${m}が、そっと指でなぞった。</p>`] }),
    kamiErased: () => ({ title: '終幕：抹消', text: [`<p>${s}が、膝をついた。白い人影の刃が、静かに振り下ろされる。</p>`,
      `<p>――深見市の記録から、この冬の聖杯戦争は消えた。七騎の英霊も、七人のマスターも、花嫁に選ばれた巫女も。最初から、誰もいなかったことになった。</p>`,
      `<p>天降神社の神楽殿には、誰のものか分からない古い鈴が、二つ、並んで置かれている。</p>`,
      '<p class="note">ヒント：守護者が来るまでに「存在の楔を打つ」で、要石の楔と、降臨の神楽か人々の意志を揃えよう。守護者の正体を知れば、その力は弱まる。</p>'] }),
  };
}
// 山の守り人の結末に添える一文（守護者を退けた雫ルート）
function counterBrideLine() { return G.flags.guardianDone && counterRoute() ? `<p>白い人影――白妙は、守り人となったあなたを見て、刃を下ろした。山の一部となった者を、世界は消せない。<br>「……あなたが、次の守り人なのですね」白妙は微笑み、光になって消えた。守り人そのものが、この地の楔になった。</p>` : ''; }
// エピローグ：綻びの朝の後、誰も覚えていない人生
const EPI_KAMI_FRAY = { y: 2, title: '誰も知らない冬', skip: () => !(G.epi && G.epi.kind === 'kamiFray'),
  text: () => `あの冬のことを、街の誰も覚えていない。図書館の新聞にも、教会の記録にも、聖杯戦争という言葉は、どこにもない。<br>ただ、天降神社の神楽殿で、${CAST.miko}が時々、あなたに尋ねる。「……${typeof mkCall === 'function' && mkMet() ? mkCall() : 'あなた'}は、覚えてますよね。あの人のこと」`,
  choices: [
    { label: '「忘れるわけがない」', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, '誰も知らない冬を、覚え続けた') || `${CAST.miko}は、ほっとしたように笑った。二人だけが知っている英霊の話を、その夜は遅くまで続けた。` },
    { label: 'あの冬のことを、書き残す', hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '誰も知らない冬を、書き残した') || 'いつか、誰かが読むかもしれない。読まれなくても、いい。ここに確かに在ったことを、書き残しておく。' },
  ] };

// ---- 場面ごとの曲調（audio.js）：雫ルート＝霧の神楽、抑止の終章＝綻ぶ世界、幼馴染ルート＝願い桜 ----
for (const st of STORY) {
  if (['k_mist', 'k_bride', 'k_bride_sp', 'k_voice', 'k_old', 'k_old_f', 'k_climax', 'mk_dream', 'mk_call'].includes(st.id)) st.mood = 'kagura';
  if (st.id === 'k_counter') st.mood = 'counter';
  if (/^f_/.test(st.id)) st.mood = 'sakura';
  if (st.id === 'r_route') st.mood = 'unease';
}
