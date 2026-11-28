// =============================================================
//  data_mystery.js … 聖杯の真相（2つのシナリオ）と、TRPG的な調査
//
//  ・ゲーム開始時に、プレイヤーには見えない形で「真相」が決まる
//      cursed … 聖杯は六十年前に呪われた（既存のシナリオ）。昏睡事件は聖杯から漏れた黒い泥の仕業
//      pure   … 聖杯は正規のもの。昏睡事件は、ある陣営（犯人）が魂喰いをしている
//  ・どちらなのかは、プレイヤーが「調査」をしない限り分からない
//      調査で得られる手がかりの中身が、真相によって変わる（同じ場所を調べても、見えるものが違う）
//      手がかりは「調査手帳」に記録され、プレイヤー自身が読み比べて推理できる
//  ・手がかりが十分に集まると、真相を確定させる方法が2つ開く
//      核心の調査（天降山の古社で聖杯の器を直接調べる：危険）
//      推理（手帳を整理して結論を出す：知力判定）
//  ・判定は TRPG 風：同じ場所でも「どの技能で調べるか」を選べる。
//      大成功（目標を25以上上回る）でおまけの発見、大失敗（25以上下回る）で厄介ごとが起きる
// =============================================================

const MYSTERY_CORE_EV = 3;     // 核心の調査に必要な手がかりの数
const MYSTERY_DEDUCE_EV = 4;   // 推理に必要な手がかりの数

function isCursed() { return G.truth !== 'pure' && G.truth !== 'beast'; }
function isPure() { return G.truth === 'pure'; }
function isBeast() { return G.truth === 'beast'; }
// 真相ごとに値を選ぶ（人類悪の場合、省略すると「正規の聖杯」と同じに見える）
function T(cursed, pure, beast) { return isCursed() ? cursed : isBeast() ? (beast === undefined ? pure : beast) : pure; }
function solved() { return !!(G.flags.grailTruth || G.flags.grailPure || G.flags.grailBeast); }

// ---- 人類悪：ビーストⅧ（第三の真相のラスボス） ----
const BEAST8 = {
  id: 'beast8', name: 'アダム=サーペント', short: 'アダム=サーペント', cls: 'ビーストⅧ',
  p: ['A+', 'EX', 'B', 'EX', 'A', 'EX'], align: '―', persona: 'berserker',
  np: '満ち足りよ、原初の楽園', npRuby: 'エデン・サチュレーション', catalyst: null,
  line: '', desc: '人類悪の一つ。理は【飽和】。知恵の実を齧った最初の人間と、彼を唆した蛇。「満たされたい」という人類の原初の欲求そのもの。聖杯に寄生し、その魔力を吸い上げて孵化を待っていた。',
};
function mys() {
  if (!G.mys) G.mys = { ev: 0, clues: [], done: {}, culprit: null, culpritKnown: false, area: null, stopped: false };
  return G.mys;
}

// ---- 正規の聖杯の場合の「犯人」陣営（最初に必要になった時に決める） ----
function culprit() {
  if (!isPure() || !G.rivals.length) return null;
  const m = mys();
  if (!m.culprit) {
    const pool = G.rivals.filter(r => r.alive && !r.friend);
    if (!pool.length) return null;
    // 魂喰いをするのは、好戦的で悪辣な陣営ほどありえる
    const r = wpick(pool, x => (0.4 + x.aggr) * (typeof rvDarkW === 'function' ? rvDarkW(x) : 1));   // 来歴が魂喰いに手を染めそうなマスターほど（data_rivals.js）
    m.culprit = r.id; m.area = pick(['旧城下町', '港の倉庫街', '駅前の再開発地区', '御影川の下流', '城跡公園の北側']);
  }
  return G.rivals.find(r => r.id === m.culprit) || null;
}
function culpritAlive() { const r = culprit(); return !!(r && r.alive); }
function culpritLabel() { const r = culprit(); return r ? `${r.cls}陣営` : '某陣営'; }

// ---- 手がかりを手帳に記録する ----
// ev：真相への手がかりとしての重み（0 は噂・真偽不明の情報）
function addClue(id, title, text, ev = 1) {
  const m = mys();
  if (m.clues.some(c => c.id === id)) return '';
  m.clues.push({ id, title, text, ev, when: whenShort() });
  m.ev += ev;
  const left = solved() ? '' : m.ev >= MYSTERY_DEDUCE_EV ? '　推理で真相を確かめられる。'
    : m.ev >= MYSTERY_CORE_EV ? '　天降山の古社を調べられるようになった。' : '';
  return `<span class="note">📓 調査手帳に記録：「${title}」${ev ? `（手がかり ${m.ev}）` : '（真偽不明の情報）'}${left}</span>`;
}
// 犯人の陣営が判明する
function revealCulprit(how) {
  const r = culprit(); if (!r) return '';
  const m = mys(); if (m.culpritKnown) return '';
  m.culpritKnown = true; r.intel = Math.max(r.intel, 1);
  addLog(`昏睡事件の犯人は${r.cls}陣営と判明（${how}）。`);
  return `<b>昏睡事件の犯人は、${rivalLabel(r)}陣営だ。</b>マスターは${esc(r.master)}――${r.type}。` + (typeof rvWhyLine === 'function' ? rvWhyLine(r) : '');
}

// ---- 真相が確定する ----
function solveMystery(how) {
  if (solved()) return '';
  if (isCursed()) {
    G.flags.grailTruth = true; G.flags.grailHint = true;
    addLog(`聖杯の真相に辿り着く：聖杯は呪われている（${how}）。`);
    return '<div class="truth cursed"><b>真相：この聖杯は、呪われている。</b><br>六十年前の戦いで「呪いそのもの」を呑み込んだ聖杯は、願いを破滅の形でしか叶えない。昏睡事件は、聖杯から溢れた黒い泥の仕業だった。</div>';
  }
  if (isBeast()) {
    G.flags.grailBeast = true; G.flags.grailHint = true;
    addLog(`聖杯の真相に辿り着く：聖杯に人類悪が寄生している（${how}）。`);
    return '<div class="truth beast"><b>真相：この聖杯は正しい聖杯だ。――だが、その中に「何か」が巣食っている。</b><br>器の底に潜む、白い蛇のようなもの。それは六十年かけて聖杯の魔力を吸い上げ、孵化の時を待っている。昏睡事件の被害者が皆、満ち足りた顔で眠り続けているのも、そのせいだ。<br>人類の原初の欲求――「満たされたい」という願いの化身。<b>人類悪</b>。</div>';
  }
  G.flags.grailPure = true;
  addLog(`聖杯の真相に辿り着く：聖杯は正規のもの（${how}）。`);
  const r = culprit(); const who = r ? revealCulprit(how) : '';
  return `<div class="truth pure"><b>真相：この聖杯は、正しい聖杯だ。</b><br>六十年前の儀式は器が満ちる前に途絶え、聖杯は無垢のまま霊脈の底に眠っていた。願いは、願ったとおりに叶う。<br>昏睡事件は、聖杯ではなく――人の仕業だ。${who ? '<br>' + who : ''}</div>`;
}

// =============================================================
//  調査の場所（昼の行動「真相を調べる」）
//  stages：その場所で得られる手がかりの段階数
//  ways：調べ方（技能）。diff は目標値、risk は大失敗時の厄介ごと
// =============================================================
const MYSTERY_SITES = [
  {
    id: 'scene', name: '昏睡事件の現場', place: '港の倉庫街', stages: 2, cond: () => !!G.used.s_coma,
    lead: '被害者が倒れていた路地。魔力の残滓が残っているかもしれない。',
    ways: [
      { label: '現場を霊視する', stat: 'mag', diff: 56 },
      { label: '痕跡を分析する', stat: 'int', diff: 56 },
      { label: '目撃者を探して聞き込む', stat: 'cha', diff: 52 },
      { label: () => `${SV()}に残滓を辿らせる`, sv: 3, diff: 58 },
    ],
    clue: (stage) => isCursed()
      ? stage === 1 ? ['残滓の正体', '路地に残っていたのは、サーヴァントの魔力ではなかった。粘つくような、悪意そのものの残滓――人の怨念を煮詰めたような<b>呪詛</b>だ。']
        : ['残滓の行き先', '残滓を辿ると、地下の霊脈に沿って北へ――<b>天降山の方角</b>へ続いていた。どの陣営の拠点とも、方角が合わない。']
      : isBeast() ? (stage === 1 ? ['残滓の正体', '路地に残っていたのは、澄んだ魔力の残滓だった。呪詛ではない。サーヴァントのものとも、どこか違う。<b>穢れは、どこにもない</b>。']
        : ['残滓の行き先', '残滓を辿ると、霊脈に沿って天降山の方へ続いていた。……けれど、呪いの気配はまるでない。ただ、何かが<b>細く長く</b>、山の方へ這っていった跡のようにも見えた。'])
      : stage === 1 ? ['残滓の正体', '路地に残っていたのは、確かに<b>サーヴァントの魔力</b>だった。何者かが、使い魔を通じて人の魂を吸い上げている。手口は魔術師のものだ。']
        : ['残滓の行き先', `残滓を辿ると、霊脈ではなく人の手で引かれた魔力の糸が、<b>${mys().area}</b>の方へ続いていた。……誰かの拠点がある。`],
    extra: (stage) => !isCursed() && stage === 2 ? revealCulprit('現場の調査') : '',
    risk: { text: '残滓に触れた瞬間、何かがこちらを「見た」。……こちらの存在が、誰かに知られたかもしれない。', run: () => { G.servant.exposed = true; } },
  },
  {
    id: 'hospital', name: '市民病院', place: '被害者の病室', stages: 1, cond: () => !!G.used.s_coma,
    lead: '昏睡状態の被害者たちが運び込まれている。直接、体を診られれば。',
    ways: [
      { label: '見舞い客を装って面会する', stat: 'cha', diff: 55 },
      { label: '魔術で被害者を診る', stat: 'mag', diff: 52 },
      { label: '夜間に忍び込む', stat: 'luk', diff: 50, tone: 'chaos' },
    ],
    clue: () => isCursed()
      ? ['被害者の容態', '被害者の魂には、<b>黒い澱</b>のようなものがこびりついていた。ただ魔力を奪われたのではない。何かに「侵されて」いる。']
      : isBeast() ? ['被害者の容態', '被害者の魂は<b>穢れていない</b>。それどころか、誰もが<b>幸せそうな顔</b>で眠っていた。まるで、願いがすべて叶った夢を見ているかのように。']
      : ['被害者の容態', '被害者は魔力を抜き取られているだけで、魂そのものは<b>穢れていない</b>。抜き取りの跡には、術式で吸い上げた几帳面な痕がある。'],
    risk: { text: '看護師に見咎められた。病院から警察に連絡が入り、しばらく近寄れそうにない。（精神-3）', run: () => { gain('spi', -3); } },
  },
  {
    id: 'shrine', name: '天降神社の蔵', place: '古文書', stages: 1,
    lead: '古くから霊脈を守ってきた神社。前回の聖杯戦争の記録が残っているかもしれない。',
    ways: [
      { label: '古文書を読み解く', stat: 'int', diff: () => G.flags.metMiko || G.master.birth === 'shrine' ? 45 : 60 },
      { label: () => `${mikoOr('宮司')}に蔵を開けてもらう`, stat: 'cha', diff: () => G.flags.metMiko || G.master.birth === 'shrine' ? 40 : 62 },
    ],
    clue: () => isCursed()
      ? ['神社の古文書', '六十年前の記録には、こうあった。「器、呪ひを孕み、黒く染まりぬ。願ひし者、ことごとく災ひに遭ふ」']
      : ['神社の古文書', '六十年前の記録には、こうあった。「器、満つる前に儀絶えたり。無垢のまま霊脈の底に鎮め奉る」――聖杯は、<b>完成する前に封じられていた</b>。'],
    risk: { text: '古い蔵の棚が崩れ、下敷きになりかけた。（HP-15）', run: () => { hp(-15); } },
  },
  {
    id: 'oldman', name: () => `${CAST.old}の証言`, place: '御影川の河川敷', stages: 1,
    lead: '六十年前の聖杯戦争の、ただ一人の生き残り。',
    ways: [
      { label: '当時のことを問い詰める', stat: 'cha', diff: () => G.flags.oldTrust ? 42 : 60 },
      { label: '黙って隣で釣り糸を垂れる', stat: 'spi', diff: () => G.flags.oldTrust ? 40 : 58 },
    ],
    clue: () => isCursed()
      ? ['生き残りの証言', `${CAST.old}は重い口を開いた。「最後の夜、わしは見た。あの呪いのような英霊が、<b>聖杯に呑まれる</b>ところを。……杯は、あれを喰らって黒く染まったんじゃ」`]
      : ['生き残りの証言', `${CAST.old}は長い沈黙の後、震える声で言った。「……あの呪いのような英霊はな、聖杯に呑まれる前に、<b>わしが令呪で自害させた</b>んじゃ。六十年、誰にも言えなんだ。杯は――あれを呑んではおらん」`],
    extra: () => { G.flags.oldTrust = true; return ''; },
    risk: { text: `「帰れ！」${CAST.old}は声を荒らげた。しばらくは話を聞いてくれないだろう。`, run: () => { G.flags.oldTrust = false; } },
  },
  {
    id: 'church', name: '教会の記録庫', place: '聖ヨハネ教会', stages: 1,
    lead: '監督役の教会には、前回の報告書が保管されているはずだ。',
    ways: [
      { label: () => `${CAST.sister}に閲覧を願い出る`, stat: 'cha', diff: () => G.flags.registered ? 58 : 72, tone: 'law' },
      { label: '記録庫に忍び込む', stat: 'luk', diff: 55, tone: 'chaos' },
    ],
    clue: () => isCursed()
      ? ['教会の報告書', '前回の報告書：「聖杯の汚染を確認。ただし、儀式の継続を優先する」――署名は教会上層部のものだ。<b>教会は、知っていて黙っていた。</b>']
      : isBeast() ? ['教会の報告書', '前回の報告書：「聖杯に汚染の兆候なし。儀式は器の完成前に中断」。……最後の頁の隅に、誰かの走り書きがあった。「器の底に、何か――」その先は、インクが滲んで読めない。']
      : ['教会の報告書', '前回の報告書：「聖杯に汚染の兆候なし。儀式は器の完成前に中断」。添付の資料には、魔術協会の手配書が一枚――<b>他人の魂を喰らって魔力を蓄える魔術師</b>の手口が記されていた。'],
    extra: () => { if (isCursed()) G.flags.sisterSecret = true; return ''; },
    risk: { text: `足音。${CAST.sister}だ。「……ここは立入禁止です」その目は冷たかった。（教会からの信用を失った）`, run: () => { G.flags.registered = false; } },
  },
  {
    id: 'mountain', name: '天降山の霊脈', place: '山道', stages: 2,
    lead: '街を流れる霊脈の源。子どもの頃から、黒い霧の噂が絶えない。',
    ways: [
      { label: '山道を登り、霊脈の要を探す', stat: 'phy', diff: 55 },
      { label: '霊脈の流れを読む', stat: 'mag', diff: () => G.flags.leyline || G.master.birth === 'shrine' ? 45 : 60 },
      { label: () => `${SV()}に霊脈の気配を探らせる`, sv: 3, diff: 58 },
    ],
    clue: (stage) => isCursed()
      ? stage === 1 ? ['霊脈の濁り', '山の霊脈は、底の方で<b>濁っていた</b>。黒い霧は、地の底から滲み出す何かの「吐息」のようだ。']
        : ['霊脈の底', '霊脈の要に耳を澄ますと、地の底で何かが<b>脈打っている</b>のが分かった。黒い泥だ。……それは、街で倒れた人々から奪った魔力を、ゆっくりと呑み込んでいた。']
      : stage === 1 ? ['霊脈の濁り', '霊脈そのものは<b>澄んでいた</b>。黒い霧は、霊脈が吐き出す古い瘴気――六十年前の儀式の名残で、悪意は感じられない。']
        : isBeast() ? ['霊脈の底', '霊脈の要の奥深くに、黄金の気配があった。濁りはない。……ただ、<b>六十年分の魔力にしては、あまりにも弱々しい</b>。']
        : ['霊脈の底', '霊脈の要の奥深くに、静かに眠る黄金の気配があった。濁りはない。<b>街で奪われた魔力は、ここには流れ込んでいない</b>。'],
    risk: { text: '足を滑らせ、凍った斜面を転げ落ちた。（HP-20）', run: () => { hp(-20); } },
  },
  {
    id: 'sister', name: () => `監督役・${CAST.sister}`, place: '聖ヨハネ教会', stages: 3, cond: () => (mys().sisterDay || 0) < G.day,
    lead: '聖杯の器を観測しているのは、監督役の教会だ。何度か話を聞けば、何か分かるかもしれない。（1日1度まで）',
    ways: [
      { label: '聖杯の様子を尋ねる', stat: 'cha', diff: () => G.flags.registered ? 42 : 55, tone: 'law' },
      { label: '世間話から、それとなく探る', stat: 'spi', diff: 48 },
    ],
    clue: (stage) => {
      const S = CAST.sister;
      if (stage === 1) return ['監督役の話・一', T(`${S}は言葉を選びながら言った。「器の観測は、順調です。……ただ、ときおり、計器が妙な揺れ方をします」`,
        `${S}は穏やかに答えた。「器の観測は順調です。脱落者が出るたびに、きちんと満ちていっています」`,
        `${S}は少しだけ首を傾げた。「器の観測は……順調、のはずです。ただ、脱落者が出ても、計器の針があまり動かないのです」`), 1];
      if (stage === 2) return ['監督役の話・二', T(`${S}の表情が曇った。「器の周りの空気が、重いのです。……上の者は、問題ないと言うのですが」`,
        `「器は順調に満ちています」${S}はきっぱりと言った。「事件を起こしているのは、聖杯ではなく、参加者の誰かでしょう」`,
        `${S}は帳簿を何度も見返していた。「おかしいのです。器に注がれるはずの魔力が、日に日に<b>減っている</b>。……満ちるどころか、痩せていく」`), 1];
      return ['監督役の話・三', T(`${S}は、意を決したように声を潜めた。「……前回の儀式の記録には、封印された頁があります。器が『何か』を取り込んだ、と」`,
        `${S}は微笑んだ。「心配は無用です。この聖杯は、正しく機能しています。……どうか、正しい願いを」`,
        `${S}は、青ざめた顔で一枚の観測図を差し出した。「昨夜、器の底から、魔力が<b>外へ吸い出されている</b>のを観測しました。――聖杯に、何かが寄生しています。私たちの誰も、気付かないうちに」`), 2];
    },
    extra: (stage) => { const m = mys(); m.sisterDay = G.day; if (stage === 3 && isBeast()) { m.beastSign = true; return '<span class="note">「聖杯に、何かが寄生している」――推理の新しい仮説が立てられるようになった。</span>'; } return ''; },
    risk: { text: `「……今日は、お引き取りください」${CAST.sister}は、珍しく疲れた顔で扉を閉じた。`, run: () => { mys().sisterDay = G.day; } },
  },
];

// 物語の場面から、調査の場所の手がかりを得る（その場所は調査済みになる）
function siteOpen(id) { const s = MYSTERY_SITES.find(x => x.id === id); return (mys().done[id] || 0) < s.stages; }
function siteResult(id, ev = 1) {
  const s = MYSTERY_SITES.find(x => x.id === id); const m = mys();
  const stage = (m.done[id] || 0) + 1; m.done[id] = stage;
  const [title, text, w] = s.clue(stage); const ex = s.extra && s.extra(stage);
  return [text, addClue(`${id}${stage}`, title, text, Math.max(ev, w || 1)), ex].filter(Boolean);
}

// 調査の判定（マスターの技能か、サーヴァントのパラメータか）
function mysteryCheck(w) {
  const diff = typeof w.diff === 'function' ? w.diff() : w.diff;
  return w.sv != null ? schk(w.sv, diff) : chk(w.stat, diff);
}
function wayHint(w) {
  const diff = typeof w.diff === 'function' ? w.diff() : w.diff;
  const who = w.sv != null ? `${SV()}の${PARAM_NAMES[w.sv]}` : `${STAT_LABEL[w.stat]}${G.master.stats[w.stat]}`;
  return `${who}判定・目標${diff}${w.tone === 'chaos' ? '・混沌' : w.tone === 'law' ? '・秩序' : ''}`;
}
const lab = x => typeof x === 'function' ? x() : x;

function mysteryMenu() {
  const m = mys();
  const sites = MYSTERY_SITES.filter(s => (!s.cond || s.cond()) && (m.done[s.id] || 0) < s.stages);
  const choices = sites.map(s => ({
    label: `${lab(s.name)}`, hint: `${s.place}${s.stages > 1 ? `・${(m.done[s.id] || 0) + 1}/${s.stages}段階目` : ''}`, icon: 'study',
    fn: () => siteMenu(s),
  }));
  if (!solved() && m.ev >= MYSTERY_CORE_EV) choices.push({ label: '天降山の古社に潜入する', hint: `核心の調査・危険（手がかり${m.ev}）`, cls: 'danger', fn: coreMenu });
  if (!solved() && m.ev >= MYSTERY_DEDUCE_EV) choices.push({ label: '調査手帳を整理して推理する', hint: `知力判定 目標${deduceDiff()}`, cls: 'primary', fn: deduce });
  if (!isCursed() && m.culpritKnown && culpritAlive() && G.flags.registered && !culprit().bounty)
    choices.push({ label: `${culpritLabel()}を教会に告発する`, hint: '交渉判定・討伐令（令呪の報酬）', fn: accuse });
  const body = [
    '<p>この街で起きていることの真相を探る。どこを、どうやって調べる？</p>',
    `<p class="note">調べ方（技能）によって目標値が変わる。大成功ならおまけの発見があり、大失敗なら厄介ごとが起きる。手がかり<b>${m.ev}</b>${solved() ? '（真相は判明済み）' : `：${MYSTERY_CORE_EV}で核心の調査、${MYSTERY_DEDUCE_EV}で推理ができる`}。</p>`,
  ];
  if (!sites.length && !choices.length) body.push('<p class="empty">今調べられる場所は、もう無い。</p>');
  submenu('真相を調べる', 'INVESTIGATE', body, choices);
}
function siteMenu(s) {
  const m = mys(); const stage = (m.done[s.id] || 0) + 1;
  scene({ title: lab(s.name), sub: 'INVESTIGATE', body: paras([`${s.place}。${s.lead}`, '<p>どうやって調べる？</p>']),
    choices: s.ways.map(w => ({ label: lab(w.label), hint: wayHint(w), fn: () => actResult(lab(s.name), () => {
      if (w.tone) tone(w.tone);
      const c = mysteryCheck(w);
      if (!c.ok) {
        if (c.margin <= -25 && s.risk) { s.risk.run(); return [c.text, '<b>大失敗！</b>', s.risk.text]; }
        return [c.text, '手がかりは掴めなかった。……別の調べ方を試すべきかもしれない。'];
      }
      m.done[s.id] = stage;
      const [title, text, wt] = s.clue(stage);
      const out = [c.text, text, addClue(`${s.id}${stage}`, title, text, wt || 1)];
      const ex = s.extra && s.extra(stage); if (ex) out.push(ex);
      if (c.margin >= 25) { out.push('<b>大成功！</b>', criticalBonus(s)); }
      return out;
    }) })).concat([{ label: 'やめる', fn: mysteryMenu }]) });
}
// 大成功のおまけ
function criticalBonus(s) {
  const m = mys();
  if (s.stages > 1 && (m.done[s.id] || 0) < s.stages && s.id !== 'sister') {   // 監督役の話は、一度に一歩ずつ
    m.done[s.id]++; const [title, text] = s.clue(m.done[s.id]);
    const ex = s.extra && s.extra(m.done[s.id]);
    return [`勢いのまま、さらに奥まで調べ上げた。<br>${text}`, addClue(`${s.id}${m.done[s.id]}`, title, text, 1), ex].filter(Boolean).join('<br>');
  }
  gain('int', 2); lore(1);
  return '調べるうちに、魔術の世界の理解も深まった。（知力+2）';
}

// ---- 核心の調査：天降山の古社 ----
function coreMenu() {
  const m = mys(); const d = Math.max(45, 75 - m.ev * 4);
  scene({ title: '天降山の古社', sub: 'INVESTIGATE', body: paras([
    '天降山の頂、霊脈の集う古社。聖杯が降臨するはずの場所だ。強い結界が張られ、近づくだけで肌が粟立つ。',
    '器そのものを調べれば、真相は分かる。だが、無事で済む保証はない。',
  ]), choices: [
    { label: `${SV()}と共に結界を破る`, hint: `${SV()}の魔力判定 目標${d}`, cls: 'danger', fn: () => coreTry(schk(3, d)) },
    { label: '結界の綻びを探して忍び込む', hint: `知力判定 目標${d + 5}`, fn: () => coreTry(chk('int', d + 5)) },
    { label: 'やめる', fn: mysteryMenu },
  ] });
}
function coreTry(c) {
  actResult('古社の器', () => {
    if (!c.ok) {
      shp(-20); hp(-15);
      return [c.text, isCursed() ? '結界に弾かれた瞬間、足元から黒い何かが這い上がってきた。辛うじて逃げ延びたが、体の芯が冷えきっている。（HP-15 サーヴァントHP-20）'
        : '結界は思った以上に堅く、跳ね返された魔力が二人を打ち据えた。（HP-15 サーヴァントHP-20）', '<span class="note">手がかりがもっと集まれば、結界の綻びも見えてくるはずだ。</span>'];
    }
    if (isBeast() && !mys().beastSign) {
      return [c.text, '結界の奥、霊脈の要に半ば埋もれて、黄金の杯があった。澄んだ光。濁りも、悪意もない。……ただ、器の中身が、驚くほど<b>少ない</b>。六十年分の魔力が溜まっているとは、とても思えなかった。',
        addClue('core_beast', '空っぽに近い器', '聖杯の器は澄んでいたが、中身が驚くほど少なかった。六十年分の魔力が溜まっているとは思えない。', 1),
        '<span class="note">……何かを見落としている。聖杯を観測している監督役なら、何か知っているかもしれない。</span>'];
    }
    if (isBeast()) return [c.text, '結界の奥の黄金の杯。その底に、白く濡れた<b>蛇の尾</b>のようなものが、ずるりと沈んでいくのが見えた。杯の縁から、細い光の糸が、その「何か」へと吸い込まれ続けている。', solveMystery('古社の調査')];
    const seen = isCursed()
      ? '結界の奥、霊脈の要に半ば埋もれて、黄金の杯があった。――その内側で、<b>黒い泥</b>が渦を巻いている。杯の縁から溢れた泥が、細い筋となって街の方へ流れ出していた。'
      : '結界の奥、霊脈の要に半ば埋もれて、黄金の杯があった。澄んだ光。濁りも、悪意もない。……そして杯の周りには、<b>何者かが聖杯を探って回った魔術の痕跡</b>が残されていた。';
    return [c.text, seen, solveMystery('古社の調査')];
  });
}
// ---- 推理 ----
function deduceDiff() { return Math.max(40, 72 - mys().ev * 4); }
function deduce() {
  const m = mys();
  const list = m.clues.filter(c => c.ev).map(c => `<li><b>${c.title}</b>：${c.text}</li>`).join('');
  scene({ title: '推理', sub: 'DEDUCTION', body: [
    '<p>集めた手がかりを、一つずつ手帳に並べていく。</p>', `<ul class="clue-list">${list}</ul>`,
    '<p>これらが指し示す真相は――？</p>',
  ], choices: [
    { label: '「聖杯は呪われている」', hint: `知力判定 目標${deduceDiff()}`, fn: () => deduceTry('cursed') },
    { label: '「聖杯は正規のもの。事件は人の仕業だ」', hint: `知力判定 目標${deduceDiff()}`, fn: () => deduceTry('pure') },
    ...(m.beastSign ? [{ label: '「聖杯に、何かが寄生している」', hint: `知力判定 目標${deduceDiff()}`, cls: 'danger', fn: () => deduceTry('beast') }] : []),
    { label: 'まだ結論を出さない', fn: mysteryMenu },
  ] });
}
function deduceTry(guess) {
  actResult('推理', () => {
    const c = chk('int', deduceDiff());
    const unsure = '筋は通っている気がする。だが、確信には一歩届かなかった。……思い込みで決めつけていないか、もう一度手帳を見直すべきかもしれない。';
    if (!c.ok) return [c.text, unsure];
    // 間違った仮説：判定に成功していれば、矛盾に気付ける（精神的に堪える）
    if (guess !== G.truth) { gain('spi', -2);
      return [c.text, '仮説を組み立てようとして、手が止まった。いくつかの手がかりが、どうしても噛み合わない。……どこかで、思い込みをしていたようだ。（精神-2）',
        isBeast() && !mys().beastSign ? '<span class="note">聖杯を観測している監督役に、何度か話を聞いてみるべきかもしれない。</span>' : '']; }
    return [c.text, '散らばっていた手がかりが、一本の線で繋がった。', solveMystery('推理')];
  });
}
// ---- 犯人の告発（正規の聖杯の場合） ----
function accuse() {
  actResult('告発', () => {
    const r = culprit(); const c = chk('cha', 50);
    if (!c.ok) return [c.text, `「証拠が不十分です」${CAST.sister}は首を振った。「確かな証拠を揃えてから来てください」`];
    r.bounty = true; r.intel = Math.max(r.intel, 2);
    return [c.text, `${CAST.sister}は手帳を確かめ、静かに頷いた。「……神秘の秘匿を破り、一般人を喰らう行為。見過ごせません」<br>教会は${rivalLabel(r)}陣営に討伐令を出した。拠点の場所も提供された。<span class="note">討伐すれば令呪+1。</span>`];
  });
}

// =============================================================
//  夜の調査：事件現場に張り込む
// =============================================================
function stakeoutMenu() {
  submenu('張り込み', 'STAKEOUT', '<p>夜の街で、昏睡事件の「瞬間」を押さえる。どう張り込む？</p>', [
    { label: '物陰から見張る', hint: `知力判定 目標55`, fn: () => stakeout(chk('int', 55), 'watch') },
    { label: '使い魔を街中に放つ', hint: `魔力判定 目標52・オド-10（残${G.master.od}）`, disabled: G.master.od < 10, fn: () => { od(-10); stakeout(chk('mag', 52), 'familiar'); } },
    { label: '自ら囮になる', hint: '体力判定 目標50・危険・大胆', cls: 'danger', fn: () => { tone('bold'); stakeout(chk('phy', 50), 'bait'); } },
  ]);
}
function stakeout(c, mode) {
  NOTES = [];
  const r = culprit();
  if (!c.ok) {
    if (c.margin <= -25) {
      if (!isCursed() && r && r.alive && engageable().includes(r)) {
        return next('張り込み', paras([c.text, '<b>大失敗！</b>', `背後に気配――逆に、こちらが見つかっていた。${rivalLabel(r)}陣営のサーヴァントが迫る！`]), () => startBattle(r, { enemyFirst: true }), '戦う');
      }
      hp(-15); shp(-15);
      return next('張り込み', paras([c.text, '<b>大失敗！</b>', '暗がりから伸びた黒い影に、足を取られた。どうにか振り払ったが、無傷では済まなかった。（HP-15 サーヴァントHP-15）', ...takeNotes()]), advance);
    }
    return next('張り込み', paras([c.text, '冷たい夜風の中、明け方まで粘ったが、今夜は何も起きなかった。', ...takeNotes()]), advance);
  }
  if (isBeast()) {
    const t = '深夜二時。酔い潰れて眠る男の胸の上に、半透明の<b>白い蛇</b>のような影がとぐろを巻いていた。影は男の胸から淡い光を吸い上げ、霊脈へ溶けるように消えた。<br>男は、幸せそうに微笑んだまま、目を覚まさなかった。操る者の気配は、どこにもなかった。';
    return next('張り込み', paras([c.text, t, addClue('stakeout', '白い影', '昏睡事件の瞬間を目撃した。人を襲ったのは、白い蛇のような影だった。被害者は幸せそうに微笑んだまま眠り続けた。', 1), ...takeNotes()]), advance);
  }
  if (isCursed()) {
    const t = '深夜二時。路地のマンホールの隙間から、<b>黒い泥</b>が這い出してきた。泥は酔い潰れた男に覆いかぶさり、魔力を吸い上げ始める。' +
      `${SV()}が斬り払うと、泥は悲鳴のような音を立て、地下の霊脈へ逃げ込んだ。……誰かが操っている気配は、まったく無かった。`;
    return next('張り込み', paras([c.text, t, addClue('stakeout', '夜の泥', '昏睡事件の瞬間を目撃した。人を襲ったのは、誰にも操られていない黒い泥だった。泥は霊脈へ逃げ込んだ。', 1), ...takeNotes()]), advance);
  }
  const t = `深夜二時。${mys().area}の路地で、影のような<b>使い魔</b>が通行人に取りついていた。使い魔から伸びる魔力の糸は、どこかの拠点へと続いている。`;
  const clue = addClue('stakeout', '夜の使い魔', '昏睡事件の瞬間を目撃した。人を襲ったのは、魔術師が操る使い魔だった。魔力の糸がどこかの拠点へ続いていた。', 1);
  if (mode === 'bait' && r && r.alive && engageable().includes(r)) {
    const who = revealCulprit('張り込み');
    return scene({ title: '張り込み', sub: 'STAKEOUT', body: paras([c.text, t, '囮になったあなたに使い魔が群がった瞬間、糸の先から術者のサーヴァントが姿を現した。', who, clue, ...takeNotes()]),
      choices: [
        { label: 'このまま仕掛ける', hint: '戦闘（相手は不意を突かれている）', cls: 'danger', fn: () => startBattle(r, { ambush: true }) },
        { label: '顔を覚えて退く', fn: advance },
      ] });
  }
  const who = c.margin >= 15 || mode === 'familiar' ? revealCulprit('張り込み') : '';
  return next('張り込み', paras([c.text, t, who || '糸の先までは辿りきれなかった。', clue, ...takeNotes()]), advance);
}

// =============================================================
//  毎朝のニュース（昏睡事件の続報）：真相によって、事件の起き方が違う
// =============================================================
function mysteryDaily() {
  if (G.phase !== 'war' || !G.used.s_coma) return;
  const m = mys();
  // 同じ文面が続かないよう、続報は順番に言い回しを変え、被害者の数も積み上がっていく
  const push = (list) => { if (Math.random() >= 0.5) return; m.newsN = (m.newsN || 0) + 1; m.victims = (m.victims || 12) + rand(2, 5);
    G.news.push(`${list[(m.newsN - 1) % list.length]}（被害者は、これで${m.victims}人）`); };
  if (isBeast()) {
    push(['昏睡事件の被害者が、また見つかった。医師によれば、被害者は皆<b>穏やかに微笑んだまま</b>眠り続けており、「まるで幸せな夢を見ているようだ」という。',
      '昏睡事件の続報。眠り続ける患者の家族が、口を揃えて言う。「寝言で、何度も『もう、いいの』と――満ち足りた声で」',
      '市民病院の病床が足りなくなり始めた。眠る人々の顔は、どれも安らかだった。<b>まるで、何もかも叶ってしまったかのように</b>。',
      '昏睡事件の被害者が、また見つかった。枕元に、なぜか<b>熟れた林檎の甘い香り</b>が残っていたという。']);
    return;
  }
  if (isCursed()) {
    push(['昏睡事件の被害者が、また見つかった。発見現場は<b>天降山の麓</b>から、川沿いに街の中心へと広がっているという。',
      '昏睡事件の続報。被害者の皮膚に、<b>黒い痣</b>のようなものが浮かんでいるという。医師は「原因不明」とだけ答えた。',
      '御影川の水が、夜になると黒く濁るという噂が広がっている。昏睡事件との関係は、分かっていない。',
      '昏睡事件の被害者が、また見つかった。うなされるように「熱い、熱い」と繰り返しているという。']);
    return;
  }
  if (culpritAlive()) { push([`昏睡事件の被害者が、また見つかった。現場は<b>${m.area}</b>の周辺に集中しているという。`,
    `昏睡事件の続報。警察は<b>${m.area}</b>周辺の夜間の巡回を強化すると発表した。`,
    `昏睡事件の被害者が、また見つかった。目撃者は「人影が、すっと消えた」と話している。現場は<b>${m.area}</b>の近くだった。`]); return; }
  if (!m.stopped) {
    m.stopped = true;
    G.news.push('ここ数日、昏睡事件の新たな被害者が出ていない。ニュースは「事件は収束に向かっている」と報じていた。');
    if (G.flags.investigate || m.ev) {
      const n = addClue('stopped', '止んだ事件', `${culpritLabel()}が脱落してから、昏睡事件はぴたりと止んだ。`, 1);
      if (n) G.news.push(n);
    }
  }
}

// ---- 手帳の表示（ステータス画面） ----
function viewNotebook() {
  const m = mys();
  const state = G.flags.grailTruth ? '<span class="tag red">聖杯は呪われている</span>'
    : G.flags.grailBeast ? '<span class="tag red">聖杯に人類悪が寄生している</span>'
    : G.flags.grailPure ? '<span class="tag green">聖杯は正規のもの</span>'
      : G.flags.grailHint ? '<span class="tag">聖杯には何か秘密がある……？</span>' : '<span class="tag">聖杯の真相は不明</span>';
  const who = isPure() && m.culpritKnown ? `<span class="tag red">昏睡事件の犯人：${culpritLabel()}</span>` : '';
  const list = m.clues.length ? `<ul class="clue-list">${m.clues.map(c => `<li><b>${c.title}</b>${c.ev ? '' : '<em>（噂）</em>'}<span>${c.when}</span><br>${c.text}</li>`).join('')}</ul>`
    : '<p class="empty">まだ何も記録していない。昼の「真相を調べる」で、街の謎を調べられる。</p>';
  return `<h3>調査手帳</h3><p>${state}${who}<span class="tag">手がかり ${m.ev}</span></p>${list}`;
}
