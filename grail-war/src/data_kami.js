// =============================================================
//  data_kami.js … 分岐シナリオ「天降の祟り」
//
//  深見市の秘密は、聖杯だけではない。天降山は、太古の土地神「天降大神（あまふりのおおかみ）」の体そのもの。
//  百八十年前、聖杯戦争を築いた者たちは神と「契り」を結んだ。六十年に一度、神の力（霊脈）を借りて聖杯を降ろす代わりに、
//  一人を「花嫁」として山へ差し出す――それが、六十年ごとに繰り返される神隠しの正体だった。
//  今回、契りを守る者はおらず、再開発で神を鎮める「要石」まで掘り起こされた。目覚めかけた神の荒魂が、霧となって街を呑もうとしている。
//
//  分岐（通常のシナリオのみ）
//   4日目の夜「霧の夜」      … 黒い霧を追って山へ入るか、聖杯戦争に集中するか
//   5日目の昼「巫女の失踪」  … 霧を追わなかった場合の、二度目の機会（巫女・天降雫が消える）
//  分岐に入ると（昼の行動「山の異変を追う」）
//   調査（6か所）で手がかりを集める → 6日目「神の声」→ 7日目の夜「老人の告白」と「選ぶ道」
//   選んだ道ごとの備え（3つずつ）
//      鎮める … 御神酒・神楽・要石。祟りの日に、鎮魂の儀を守り抜けば、神は眠りに戻り、消えた人々が帰る（聖杯戦争は続く）
//      討つ   … 神殺しの刃・急所・霊脈の結界。祟りの日に、神そのものと戦う。勝てば六十年の契りは終わる（エンディング「神殺し」）
//      契る   … 祠での語らい・供物・覚悟。祟りの日に、自らが新しい「守り人」になると誓う（エンディング「山の守り人」）
//   10日目の昼「祟りの日」  … 決着。何も決めずに迎えると、荒魂がそのまま街を襲う。敗れればエンディング「隠り世」
//   聖杯の前で「聖杯を山へ還す」… 契りを知っていれば選べる（エンディング「山へ還る杯」）
//  生い立ちの「神隠し」で山の神と約束していれば神に覚えられていて、「神社の危機」で山を売っていれば神の怒りは深い
// =============================================================

// ---- 天降大神・荒魂（祟りの日の相手） ----
const KAMI = {
  id: 'kami', name: '天降大神・荒魂', short: '荒魂', cls: '土地神',
  p: ['A+', 'A', 'A', 'EX', 'B', 'EX'], align: '―', persona: 'berserker',
  np: '天降る霧の大顎', npRuby: 'アマフリノオオアギト', catalyst: null,
  line: '', desc: '天降山そのものである、太古の土地神。白い大狼の姿をとる。百八十年にわたり聖杯に力を貸し続け、契りを破られた怒りで荒魂となった。',
};
// 宝具の性能は data_np.js の NP_DATA.kami

function kamiNormal() { return !!G && !isFuji() && !isKishi() && !isShirou(); }
function kami() { if (!G.kami) G.kami = { on: false, ev: 0, clues: [], done: {}, path: null, prep: 0, tasks: {}, outcome: null }; return G.kami; }
function kamiOn() { return !!(G && G.kami && G.kami.on); }
function kamiResolved() { return !!(G && G.kami && G.kami.outcome); }
// 神の怒り：山を売った・要石が掘られた・契りを知らないまま時が過ぎる
function kamiAnger() { const l = typeof life === 'function' ? life() : {}; return (l.redSell ? 2 : l.redWin ? -1 : 0) + (G.flags.kamiStoneFound ? -1 : 0); }
// 神に覚えられている（生い立ちで山の神と約束した、または霧に触れた）
function kamiKnown() { const l = typeof life === 'function' ? life() : {}; return !!(l.kamiPact || G.flags.touchedMist); }
const KAMI_PATHS = { calm: '鎮める', slay: '討つ', pact: '契る' };

function kamiEnter(how) {
  const k = kami(); if (k.on) return '';
  k.on = true; G.flags.kamiRoute = true; addLog(`分岐「天降の祟り」に入る（${how}）。`);
  return `<div class="truth kami"><b>分岐：天降の祟り</b><br>深見市の秘密は、聖杯だけではなかった。天降山で、何かが目覚めようとしている。<br><span class="note">昼の行動に「山の異変を追う」が加わった。10日目までに、山の神と向き合う道を決めなければならない。</span></div>`;
}
function kamiClue(id, title, text) {
  const k = kami(); if (k.clues.some(c => c.id === id)) return '';
  k.clues.push({ id, title, text, when: whenShort() }); k.ev++;
  return `<span class="note">📜 山の記録：「${title}」（手がかり ${k.ev}）${k.ev === 3 ? '　山の神と向き合う道が、見え始めた。' : ''}</span>`;
}

// =============================================================
//  物語（STORY に加える）
// =============================================================
STORY.push(
  // ---- 4日目の夜：霧の夜（分岐） ----
  { id: 'k_mist', phase: 'war', day: 4, slot: 1, after: 'advance', cond: () => kamiNormal(),
    title: '霧の夜',
    text: () => `深夜。天降山から、<b>黒い霧</b>が街へ流れ下りてきた。<br>${pick(['旧城下町', '駅前', '御影川の土手'])}の路地で、パジャマ姿の小さな子どもが、霧の中を裸足で歩いていた。<br>何かの歌を口ずさんでいる。――古い、神楽の節だった。<br>声をかけようとした瞬間、子どもの姿は、霧ごと掻き消えた。` +
      (kamiKnown() ? `<br><span class="note">右手の甲の、古い痣が疼いた。――あの夜、山の神と交わした約束の痣だ。霧の奥から、誰かがあなたを呼んでいる。</span>` : '') +
      `<br>${SV()}が、霧の流れていく先――天降山を見上げた。${say('warnShadow')}`,
    choices: [
      { label: '霧を追って、天降山へ入る', hint: '分岐「天降の祟り」へ', cls: 'primary', run: () => {
          G.flags.kamiSawMist = true; tone('bold');
          return [`霧は、山道を這うように登っていく。${SV()}と共に後を追った。`,
            `中腹の鳥居の前で、霧は消えた。鳥居の向こうの闇から、獣の吐息のような風が吹き下ろしてくる。<br>そして――鳥居の足元に、さっきの子どものものらしい、小さな片方のスリッパが落ちていた。`,
            kamiClue('mist_child', '霧に消えた子ども', '黒い霧は天降山から下りてきて、神楽の節を口ずさむ子どもを連れ去った。霧は中腹の鳥居で消えた。'), kamiEnter('霧を追った')];
        } },
      { label: '聖杯戦争に集中する', hint: '分岐しない', run: () => { G.flags.kamiSawMist = true; tone('cautious');
          return [`あなたは、霧から目を逸らした。今は、聖杯戦争の最中だ。他のことに構っている余裕はない。`, `<span class="note">翌朝のニュースは、市内で子どもが一人、行方不明になったと報じていた。</span>`]; } },
    ] },
  // ---- 5日目の昼：巫女の失踪（二度目の分岐） ／ 分岐の中では、花嫁が選ばれる ----
  { id: 'k_bride', phase: 'war', day: 5, slot: 0, after: 'hub', cond: () => kamiNormal(),
    title: '巫女の失踪',
    text: () => `朝早く、天降神社の宮司から電話があった。<br>「${CAST.miko}が、昨夜から戻らないのです。……部屋の窓が開いていて、山の方へ、裸足の足跡が続いていた」` +
      (kamiOn() ? `<br>霧に消えた子どもと同じだ。――ただ、${CAST.miko}の部屋の文机には、一枚の書き置きが残されていた。<br><b>「花嫁に、選ばれました。」</b>` : `<br>昨夜の霧のことを、思い出した。`) +
      (birthOf().id === 'shrine' ? `<br>幼い頃、神隠しから取り戻したはずの${CAST.miko}が、また山に呼ばれている。` : ''),
    choices: [
      { label: () => kamiOn() ? '必ず連れ戻すと、宮司に約束する' : `${CAST.miko}を探しに、山へ向かう`, hint: () => kamiOn() ? '分岐を進める' : '分岐「天降の祟り」へ', cls: 'primary', run: () => {
          G.flags.kamiMikoTaken = true; tone('good');
          return [kamiOn() ? `宮司は、深く頭を下げた。「……六十年前にも、同じことがあったと聞いています。どうか」` : `昨夜の霧と、消えた子ども。そして${CAST.miko}。――この街で、何かが起きている。`,
            kamiClue('miko_bride', '花嫁に選ばれた巫女', `${CAST.miko}が「花嫁に選ばれた」と書き置きを残し、山へ消えた。昨夜の子どもと同じく、裸足で、山の方へ。`), kamiEnter('巫女を探しに向かった')];
        } },
      { label: '警察に任せる。今は聖杯戦争だ', hint: '分岐しない・悪', cond: () => !kamiOn(), run: () => { tone('evil'); G.flags.kamiMikoTaken = true; G.flags.kamiIgnored = true;
          return [`「……警察に、相談してください」それだけ言って、電話を切った。`, `<span class="note">${CAST.miko}は、それきり戻らなかった。</span>`]; } },
    ] },
  // ---- 6日目の昼：神の声 ----
  { id: 'k_voice', phase: 'war', day: 6, slot: 0, after: 'hub', cond: () => kamiNormal() && kamiOn(),
    title: '神の声',
    text: () => `天降山の中腹、あの鳥居の前。霧の向こうから、獣とも人ともつかない声が響いた。<br>` +
      (kamiKnown() ? `「――来たか、約束の童よ。随分と、大きくなった」<br>` : '') +
      `<p class="quote">「百八十年。我は力を貸し、人は花嫁を捧げた。それが契り。<br>だが、此度は誰も来ぬ。我が身を穿ち、要石を掘り出し、力だけを奪おうとする。<br>――ならば、この地のすべてを、我が懐に隠すまで。」</p>` +
      `霧の奥に、山ほどもある<b>白い大狼</b>の影が、一瞬だけ見えた。その瞳は、半分が澄み、半分が黒く濁っていた。`,
    choices: [
      { label: '「契りとは、何だ」と問う', hint: '手がかり', run: () => ['声は、もう答えなかった。けれど、霧の中に、古い文字の刻まれた石碑が浮かび上がっていた。',
          kamiClue('pact', '六十年の契り', '天降山は土地神「天降大神」の体。神は六十年に一度、聖杯に力を貸す。代わりに人は「花嫁」を一人捧げる――それが百八十年続いた契り。今回、契りは果たされず、要石まで掘り出された。')] },
      { label: () => `${SV()}に、神の気配を探らせる`, hint: () => `${SV()}の魔力判定`, run: () => { const c = schk(3, 58);
          return c.ok ? [c.text, `${SV()}が、霧の流れを読み解いた。「……荒ぶる魂（荒魂）と、穏やかな魂（和魂）が、引き裂かれている」`, kamiClue('split', '裂かれた神の魂', '神の魂は、荒ぶる「荒魂」と穏やかな「和魂」に引き裂かれている。荒魂が霧となって人を攫い、和魂はどこかに封じられているらしい。')]
            : [c.text, '霧が濃すぎて、何も読めなかった。']; } },
    ] },
  // ---- 7日目の夜：老人の告白 → 選ぶ道 ----
  { id: 'k_old', phase: 'war', day: 7, slot: 1, after: 'advance', cond: () => kamiNormal() && kamiOn(),
    title: '老人の告白',
    text: () => `御影川の河川敷。釣り糸を垂れたまま、${CAST.old}が言った。<br>「……六十年前の花嫁はな、わしの許嫁じゃった」<br>` +
      `「契りのことは、聖杯戦争を始めた家の者しか知らん。わしは聖杯を取るために、あの子が山へ行くのを止めなんだ。――止めなんだんじゃ」<br>` +
      `「若いの。神を鎮める道、神を討つ道、神と契り直す道。どれを選んでも、何かを失う。……じゃが、選ばずにおれば、街ごと失う」` +
      `<br><span class="note">10日目「祟りの日」までに、道を選び、備えなければならない。</span>`,
    choices: [
      { label: '鎮める ―― 鎮魂の儀で、神を眠りに戻す', hint: '備え：御神酒・神楽・要石／消えた人々が帰る・聖杯戦争は続く', run: () => kamiChoose('calm') },
      { label: '討つ ―― 神そのものを倒し、六十年の契りを終わらせる', hint: '備え：神殺しの刃・急所・結界／勝てば「神殺し」の結末', run: () => kamiChoose('slay') },
      { label: '契る ―― 自分が、山の新しい守り人になる', hint: '備え：語らい・供物・覚悟／聖杯戦争を降りる「山の守り人」の結末', run: () => kamiChoose('pact') },
      { label: 'まだ、決められない', hint: '「山の異変を追う」から、後で選べる', run: () => [`「……そうか。じゃが、時間はないぞ」${CAST.old}は、川面から目を離さなかった。`] },
    ] },
  // ---- 10日目の昼：祟りの日 ----
  { id: 'k_climax', phase: 'war', day: 10, slot: 0, after: 'hub', cond: () => kamiNormal() && kamiOn() && !kamiResolved(),
    title: '祟りの日',
    text: () => { const k = kami();
      return `昼なのに、空が暗い。天降山から溢れ出した黒い霧が、深見市の空を覆っていた。<br>街のあちこちで、人々が歌を口ずさみながら、山の方へ歩き出している。<br>` +
        (k.path === 'calm' ? `天降神社の神楽殿に、鎮魂の儀の支度は整っている。${kamiPrepText()}` : k.path === 'slay' ? `神殺しの備えは、${kamiPrepText()}` : k.path === 'pact' ? `祠へ続く石段の前で、あなたは深く息を吸った。${kamiPrepText()}` : '<b>何の備えもないまま、この日を迎えてしまった。</b>') +
        `<br>霧の中から、白い大狼が姿を現した。その体の半分は、黒い泥のような荒魂に覆われている。`; },
    choices: [
      { label: '鎮魂の儀を始める', hint: () => `備え ${kami().prep}/3・荒魂の化身と戦い、儀を守り抜く`, cls: 'primary', cond: () => kami().path === 'calm', run: () => {
          const k = kami(); return { text: [`${k.tasks.kagura ? `神楽の鈴が鳴る。${k.tasks.kaguraBy || CAST.miko}の舞に合わせて、霧が一瞬、揺らいだ。` : '鈴の音が、心細く響いた。'}`, `荒魂の化身が、儀を止めようと襲いかかってくる。――守り抜け。`], then: () => kamiBattle('calm') };
        } },
      { label: '神殺しに挑む', hint: () => `備え ${kami().prep}/3・神そのものとの決戦`, cls: 'danger', cond: () => kami().path === 'slay', run: () => {
          const k = kami(); return { text: [`${k.tasks.blade ? '布にくるんだ神殺しの刃を、' + SV() + 'に託した。' : '刃もないまま、'}${SV()}が前に出る。`, '「――人の子が、神を討つか」大狼が、天を仰いで吠えた。'], then: () => kamiBattle('slay') };
        } },
      { label: '祠へ行き、守り人になると誓う', hint: () => `備え ${kami().prep}/3・精神判定`, cls: 'primary', cond: () => kami().path === 'pact', run: () => kamiPactClimax() },
      { label: '荒魂を食い止める', hint: '備えのない戦い', cls: 'danger', cond: () => !kami().path, run: () => ({ text: ['迷っている時間は、もうなかった。', `${SV()}が、霧の中へ駆け出した。`], then: () => kamiBattle('none') }) },
    ] },
);

function kamiChoose(p) {
  const k = kami(); k.path = p; addLog(`天降の祟り：「${KAMI_PATHS[p]}」道を選ぶ。`);
  if (p === 'calm') tone('law'); if (p === 'slay') tone('bold'); if (p === 'pact') tone('good');
  return [{ calm: `「……鎮魂の儀か。神楽と、御神酒と、要石。三つ揃えば、荒魂も眠りに戻るじゃろう」`, slay: `「神を、討つか。……天降神社の宝物庫に、古い刃が眠っておる。神殺しの刃じゃ」`, pact: `「……お前さんが、花嫁の代わりに？」${CAST.old}は、長いこと黙っていた。「――あの子にも、そう言ってやれたらよかった」` }[p],
    `<span class="note">道：<b>${KAMI_PATHS[p]}</b>。「山の異変を追う」に、この道の備えが加わった。</span>`];
}
function kamiPrepText() { const n = kami().prep; return n >= 3 ? 'すべての備えが整っている。' : n >= 1 ? `備えは、${n}つだけ整っている。` : '備えは、何も整っていない。'; }

// ---- 祟りの日の戦い ----
function kamiBattle(mode) {
  const k = kami(); const prep = k.prep;
  const base = { calm: 130, slay: 210, none: 190, pact: 170 }[mode];
  const hp = Math.max(80, base - prep * (mode === 'slay' ? 30 : 18) + kamiAnger() * 15 - (G.flags.kamiPup ? 15 : 0));
  const r = { id: 'kami', cls: '土地神', servantId: 'kami', master: '―', type: '', quote: '', power: Math.max(3, Math.round(9 - prep * (mode === 'slay' ? 2 : 1.5)) + kamiAnger()), aggr: 1, alive: true,
    hp, hpMax: hp, mp: 100, intel: 3, clues: 0, seals: 0, ally: false, named: true };
  B = null; startBattle(r, { boss: true, kami: mode, final: true });
}
function kamiWin(mode) {
  const k = kami(); B = null; sfx('win');
  if (mode === 'slay') { k.outcome = 'slain'; return ending('kamiSlain'); }
  k.outcome = 'calm'; G.flags.kamiCalm = true; addLog('鎮魂の儀を守り抜き、天降大神を眠りに戻した。');
  bond(5);
  next('鎮魂', paras([
    '荒魂の化身が、霧になってほどけていった。神楽の鈴が、最後に一つ、澄んだ音を立てた。',
    '霧の晴れた天降山の頂に、白い大狼が静かに座っていた。その瞳は、両方とも澄んでいた。<br>「……永く、眠りすぎた。人の子よ、礼を言う」',
    `その夕方、山から人々が下りてきた。消えていた子ども、${CAST.miko}、そして名前も知らない何人もの人たち。皆、長い夢を見ていたような顔をしていた。`,
    `<span class="note">天降の祟りは鎮まった。――聖杯戦争は、まだ終わっていない。（絆+5）</span>`]), advance, '戦いへ戻る');
}
function kamiLose() { B = null; kami().outcome = 'taken'; ending('kamiTaken'); }
function kamiPactClimax() {
  const k = kami(); const c = chk('spi', Math.max(30, 70 - k.prep * 10 - (kamiKnown() ? 10 : 0)));
  if (c.ok) {
    k.outcome = 'pact'; addLog('天降大神と契りを結び直し、山の守り人となる。');
    return { text: [c.text, '祠の前に膝をつき、あなたは誓った。「花嫁はいらない。――これからは、私がこの山を守る」',
      '長い沈黙の後、大狼は、あなたの額に鼻先を寄せた。「……かつて、同じことを言った童がいた。良かろう。契りを、結び直そう」'], then: () => ending('kamiBride') };
  }
  return { text: [c.text, '誓いの言葉は、霧に呑まれた。荒魂が、牙を剥く。「――足りぬ。人の子の覚悟では、足りぬ」'], then: () => kamiBattle('pact') };
}

// =============================================================
//  昼の行動「山の異変を追う」
// =============================================================
const KAMI_SITES = [
  { id: 'archive', name: '天降神社の古文書', lead: '神社の蔵に、山の神の縁起を記した古文書があるという。',
    ways: [{ label: '古文書を読み解く', stat: 'int', diff: 56 }, { label: '霊視で、文字に残る想いを読む', stat: 'mag', diff: 60 }],
    clue: ['天降大神の縁起', '天降山の神は「天降大神（あまふりのおおかみ）」。白い大狼の姿で、霊脈そのものを体とする。古文書の最後の頁は、百八十年前に墨で塗り潰されていた。'] },
  { id: 'missing', name: '消えた人々の家', lead: '霧の夜に姿を消した人々の家族に、話を聞く。',
    ways: [{ label: '家族に話を聞く', stat: 'cha', diff: 52 }, { label: '部屋に残る痕跡を調べる', stat: 'int', diff: 56 }],
    clue: ['神楽を歌う者たち', '消えた人々は皆、消える前の晩に、誰にも教わっていないはずの神楽の節を口ずさんでいた。山に「呼ばれた」のだ。'] },
  { id: 'stone', name: '再開発の工事現場', lead: '天降山の麓、削られた森の跡。工事は霧のせいで止まっているらしい。',
    ways: [{ label: '現場に忍び込んで調べる', stat: 'phy', diff: 56 }, { label: '工事の記録を手に入れる', stat: 'cha', diff: 58 }],
    clue: ['掘り出された要石', '工事現場の隅に、注連縄の切れた大きな石が転がっていた。山の神の荒魂を鎮めていた「要石」だ。掘り出されてから、霧が出るようになった。'],
    after: () => { G.flags.kamiStoneFound = true; } },
  { id: 'hokora', name: '山頂の祠', lead: '天降山の頂。聖杯の器が降りる古社の、さらに奥にある小さな祠。',
    ways: [{ label: '祠の前で、精神を研ぎ澄ます', stat: 'spi', diff: 58 }, { label: () => `${SV()}に、祠の霊気を探らせる`, sv: 3, diff: 60 }],
    clue: ['封じられた和魂', '祠の御神体の鏡の中に、白い光が閉じ込められていた。神の穏やかな魂「和魂」だ。百八十年前、聖杯を築いた者たちが、神を御しやすくするために封じたらしい。'] },
  { id: 'kakuriyo', name: '霧の奥（隠り世）', lead: '霧の一番濃い場所に踏み込む。戻れる保証はない。', night: true,
    ways: [{ label: () => `${SV()}に霧の奥を偵察させる`, sv: 2, diff: 60 }, { label: '自ら霧の中へ踏み込む', stat: 'spi', diff: 62 }],
    clue: ['隠り世の人々', '霧の奥は、この世ではない場所――隠り世に通じていた。消えた人々は、そこで眠っている。まだ、生きている。'] },
  { id: 'miko', name: () => `${CAST.miko}の部屋`, lead: () => `${CAST.miko}が消えた部屋。巫女として、何かを知っていたのかもしれない。`,
    ways: [{ label: '日記を読ませてもらう', stat: 'cha', diff: 50 }, { label: '部屋の結界を読み解く', stat: 'mag', diff: 54 }],
    clue: ['巫女の日記', () => `${CAST.miko}は知っていた。天降の巫女の家には、六十年ごとに「花嫁」を出す務めがあることを。日記の最後の頁には、「怖くない。わたしが行けば、皆が助かる」と書かれていた。`],
    cond: () => !!G.flags.kamiMikoTaken },
];
// 選んだ道ごとの備え
const KAMI_TASKS = {
  calm: [
    { id: 'sake', name: '御神酒を手に入れる', hint: '資金-2', cost: 2, run: () => '古い酒蔵に頼み込み、神前に供える御神酒を一樽、譲ってもらった。' },
    { id: 'kagura', name: '神楽を舞える者を探す', hint: '交渉判定（巫女が戻らない以上、誰かが舞うしかない）', stat: 'cha', diff: 56, run: (ok) => { const k = kami();
        if (ok) { k.tasks.kaguraBy = birthOf().id === 'shrine' ? 'あなた' : SV(); return birthOf().id === 'shrine' ? '幼い頃に習った神楽を、夜通し稽古し直した。体が、舞を覚えていた。' : `${SV()}が、意外なほど真剣に神楽の稽古を始めた。「……この国の神への礼節だ。覚えておいて損はない」`; }
        return null; } },
    { id: 'purify', name: '要石を据え直す', hint: '体力判定（工事現場へ）', stat: 'phy', diff: 58, run: (ok) => ok ? `${SV()}と二人がかりで、要石を元の場所へ運び、新しい注連縄を張った。霧が、ほんの少し薄くなった。` : null },
  ],
  slay: [
    { id: 'blade', name: '神殺しの刃を探す', hint: '知力判定（神社の宝物庫）', stat: 'int', diff: 58, run: (ok) => ok ? '宝物庫の奥、封印札に覆われた木箱の中に、刃こぼれした古い太刀があった。触れただけで、指先が冷たくなる。――神殺しの刃だ。' : null },
    { id: 'weak', name: '荒魂の急所を探る', hint: () => `${SV()}の敏捷判定（霧の中へ）`, sv: 2, diff: 60, run: (ok) => ok ? `${SV()}が霧の中で、荒魂の気配を読み切った。「黒く濁った右目だ。あそこだけ、神の守りが薄い」` : null },
    { id: 'bind', name: '霊脈を断つ結界を張る', hint: '魔力判定', stat: 'mag', diff: 60, run: (ok) => ok ? '山の四方に杭を打ち、霊脈を一時的に断つ結界を張った。神は、山から力を汲み上げられなくなる。' : null },
  ],
  pact: [
    { id: 'talk', name: '祠で、神と語らう', hint: '精神判定', stat: 'spi', diff: 54, run: (ok) => ok ? '霧の中で、神と夜通し語らった。百八十年分の孤独を、少しだけ聞かせてもらった。「……人の子と話すのは、六十年ぶりだ」' : null },
    { id: 'gift', name: '供物を捧げる', hint: '資金-2', cost: 2, run: () => '米と、酒と、山の幸。それから、子どもの頃に好きだった駄菓子を一つ。祠に供えると、霧の中で、何かが笑った気がした。' },
    { id: 'vow', name: () => `${SV()}に、覚悟を打ち明ける`, hint: '絆判定（守り人になれば、聖杯戦争を降りることになる）', run: () => { const b = G.servant.bond;
        bond(3); return b >= 50 ? `${SV()}は長いこと黙っていた。${say('withYou')}` : `${SV()}は、何も言わずに背を向けた。……それでも、反対はしなかった。`; } },
  ],
};
function kamiMenu() {
  const k = kami(); const night = isNight();
  const choices = [];
  for (const s of KAMI_SITES) {
    if (k.done[s.id] || (s.cond && !s.cond()) || (s.night && !night)) continue;
    const nm = typeof s.name === 'function' ? s.name() : s.name;
    choices.push({ label: nm, hint: s.night ? '夜だけ調べられる・危険' : '調査（技能を選んで判定）', icon: 'study', fn: () => kamiSiteMenu(s) });
  }
  if (!k.path && k.ev >= 3 && G.used.k_old) choices.push({ label: '山の神と向き合う道を選ぶ', hint: '鎮める・討つ・契る', cls: 'primary', fn: () => {
    scene({ title: '選ぶ道', sub: '天降の祟り', body: ['<p>どの道を選んでも、何かを失う。――けれど、選ばずにおれば、街ごと失う。</p>'], choices: [
      ...Object.keys(KAMI_PATHS).map(p => ({ label: KAMI_PATHS[p], fn: () => next('選ぶ道', paras(kamiChoose(p)), hub) })), { label: 'やめる', fn: hub }] });
  } });
  if (k.path) for (const t of KAMI_TASKS[k.path]) {
    if (k.tasks[t.id]) continue;
    const nm = typeof t.name === 'function' ? t.name() : t.name;
    choices.push({ label: `【備え】${nm}`, hint: typeof t.hint === 'function' ? t.hint() : t.hint, cls: 'primary', disabled: !!t.cost && G.master.money < t.cost, fn: () => kamiTask(t) });
  }
  const status = `<p class="note">手がかり ${k.ev}／道：${k.path ? `<b>${KAMI_PATHS[k.path]}</b>（備え ${k.prep}/3）` : k.ev >= 3 && G.used.k_old ? 'まだ選んでいない' : '手がかりを集めよう（7日目の夜までに3つ以上）'}／祟りの日まで、あと${Math.max(0, 10 - G.day)}日</p>`;
  const notes = k.clues.length ? `<ul class="clue-list">${k.clues.map(c => `<li><b>${c.title}</b>　${c.text}</li>`).join('')}</ul>` : '';
  submenu('山の異変を追う', '天降の祟り', [status, notes || '<p>まだ、山の記録は何もない。</p>'], choices);
}
function kamiSiteMenu(s) {
  const nm = typeof s.name === 'function' ? s.name() : s.name;
  const easy = (kamiKnown() ? 6 : 0) + (birthOf().id === 'shrine' ? 6 : 0);
  submenu(nm, '天降の祟り', [`<p>${typeof s.lead === 'function' ? s.lead() : s.lead}</p>`], s.ways.map(w => {
    const diff = w.diff - easy; const lab = typeof w.label === 'function' ? w.label() : w.label;
    return { label: lab, hint: `${w.sv !== undefined ? `${SV()}・${PARAM_NAMES[w.sv]}` : STAT_LABEL[w.stat]}判定 目標${diff}`, fn: () => actResult(nm, () => {
      const c = w.sv !== undefined ? schk(w.sv, diff) : chk(w.stat, diff);
      if (!c.ok) { if (c.margin <= -25) { shp(-12); return [c.text, '霧に足を取られ、深い傷を負った。（英霊のHP-12）']; } return [c.text, '何も掴めなかった。日を改めよう。']; }
      kami().done[s.id] = true; if (s.after) s.after();
      const [t, body] = s.clue; const text = typeof body === 'function' ? body() : body;
      return [c.text, text, kamiClue(s.id, t, text)];
    }) };
  }));
}
function kamiTask(t) {
  const nm = typeof t.name === 'function' ? t.name() : t.name;
  actResult(nm, () => {
    const k = kami();
    if (t.cost) { money(-t.cost); k.tasks[t.id] = true; k.prep++; return [t.run(true), `<span class="note">備え ${k.prep}/3</span>`]; }
    if (!t.stat && t.sv === undefined) { k.tasks[t.id] = true; k.prep++; return [t.run(true), `<span class="note">備え ${k.prep}/3</span>`]; }
    const c = t.sv !== undefined ? schk(t.sv, t.diff - (kamiKnown() ? 6 : 0)) : chk(t.stat, t.diff - (kamiKnown() ? 6 : 0));
    if (!c.ok) return [c.text, 'うまくいかなかった。日を改めて、もう一度。'];
    k.tasks[t.id] = true; k.prep++; return [c.text, t.run(true), `<span class="note">備え ${k.prep}/3</span>`];
  });
}
function kamiStatusHTML() {
  if (!kamiOn() || kamiResolved()) return '';
  const k = kami();
  return `<div class="wide kami-line"><span>天降の祟り</span>手がかり${k.ev}・${k.path ? `${KAMI_PATHS[k.path]}（備え${k.prep}/3）` : '道を未選択'}・祟りの日まで${Math.max(0, 10 - G.day)}日</div>`;
}

// =============================================================
//  結末
// =============================================================
// 聖杯の前で：聖杯を山へ還す（契りを知っていれば）
function kamiGrailChoice() {
  if (!kamiNormal() || !kamiOn() || !kami().clues.some(c => c.id === 'pact') || ['slain', 'pact', 'taken'].includes(kami().outcome)) return null;
  return { label: '聖杯を、山へ還す', hint: '六十年の契りを、聖杯ごと終わらせる', fn: () => ending('kamiReturn') };
}
function kamiEndingTexts(sv) {
  const s = sv ? sv.short : '';
  return {
    kamiSlain: () => ({ title: '終幕：神殺し', text: [`<p>${s}の一撃が、荒魂の黒く濁った右目を貫いた。白い大狼は、長い、長い遠吠えを一つ上げて、霧と共にほどけていった。</p>`,
      '<p>天降山から、霊脈の脈動が消えた。神のいない山に、聖杯が降りることは、もう二度とない。聖杯戦争は、勝者のないまま終わった。</p>',
      `<p>その夕方、山から人々が下りてきた。${CAST.miko}も、消えていた子どもも。――六十年ごとの神隠しは、これで終わる。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`, '<p>神を殺した街は、少しだけ、何かを失った。春が来ても、天降山の桜は、例年より少し遅れて咲いた。</p>'] }),
    kamiBride: () => ({ title: '終幕：山の守り人', text: ['<p>あなたは、聖杯戦争を降りた。令呪は教会に預けられ、右手には、山の神の痣だけが残った。</p>',
      `<p>${s}は、去り際に言った。</p><p class="quote">${farewellLine(sv)}</p>`,
      `<p>霧が晴れ、${CAST.miko}と消えた人々が山から帰ってきた。白い大狼は、二度と花嫁を求めなかった。――代わりに、毎朝、祠に参る一人の守り人がいる。</p>`,
      '<p>聖杯の行方は、誰も知らない。あなたはもう、それを知りたいとも思わなかった。</p>'] }),
    kamiReturn: () => ({ title: '終幕：山へ還る杯', text: ['<p>「――この聖杯は、山から借りたものだ。返そう」</p>', '<p>黄金の杯を、天降山の祠に捧げた。杯は光の粒となって、霊脈の中へ溶けていった。</p>',
      '<p>霧の向こうで、白い大狼が静かに頭を垂れた。その瞳は、両方とも澄んでいた。「……契りは、果たされた。もう、花嫁はいらぬ」</p>',
      `<p>${CAST.miko}と、消えていた人々が、山から帰ってきた。深見市の聖杯戦争は、これで最後になる。</p>`, `<p class="quote">${farewellLine(sv)}</p>`] }),
    kamiTaken: () => ({ title: '終幕：隠り世', text: [`<p>${s}が、膝をついた。黒い霧が、あなたを、${s}を、街のすべてを包み込んでいく。</p>`,
      '<p>音が消えた。光が消えた。深見市は、ある冬の日、地図の上から消えた。</p>', '<p>――霧の奥の隠り世で、あなたは長い長い夢を見ている。誰も、目を覚まさない。</p>',
      '<p class="note">ヒント：山の異変を追い、10日目「祟りの日」までに道を選び、備えを整えよう。神の怒りは、山を売った過去があると深くなる。</p>'] }),
  };
}
// 通常の結末に添える一文
function kamiEpilogue(kind) {
  if (!kamiNormal() || !G.flags.kamiSawMist || /^kami/.test(kind) || kind === 'dead') return '';
  if (G.flags.kamiCalm) return `<p class="note">天降山の霧は、あの日を境に二度と下りてこなかった。毎年冬になると、天降神社では、鎮魂の神楽が舞われるようになった。</p>`;
  if (kamiOn()) return '<p class="note">天降山の霧は、聖杯戦争が終わっても晴れなかった。神隠しの噂は、今も街のどこかで囁かれている。</p>';
  return `<p class="note">あの冬、深見市では何人かが行方知れずになった。${G.flags.kamiIgnored ? `その中には、${CAST.miko}の名前もあった。` : ''}六十年後、また同じことが起きるのだろうか。</p>`;
}

// =============================================================
//  エピローグ
// =============================================================
// 山の守り人として生きる（kamiBride の専用の人生）
const EPI_KAMI = [
  { y: 1, title: '守り人の朝', text: () => '毎朝、夜明け前に起きて、天降山の祠へ登る。霧の中で、白い大狼が寝そべっている。<br>「……今日も来たか。律儀な守り人だ」',
    choices: [
      { label: '神に、街の話を聞かせる', hint: '絆↑', run: () => epiGain({ bond: 2, joy: 1 }, '山の神に、街の話を聞かせた') || '商店街の福引のこと、新しくできたパン屋のこと。大狼は、退屈そうな顔で、最後まで聞いていた。' },
      { label: '山の手入れをする', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '山の手入れを続けた') || '倒木を片付け、獣道を整え、削られた森に苗木を植えた。百年後、ここは森に戻るだろう。' },
    ] },
  { y: 5, title: '巫女の祝言', text: () => `${CAST.miko}が、結婚することになった。花嫁衣装で祠に挨拶に来た${CAST.miko}は、少し泣いていた。「……あなたが代わってくれなかったら、わたしは、この日を迎えられなかった」`,
    choices: [
      { label: '神と共に、祝福を贈る', hint: '幸福↑↑', run: () => epiGain({ joy: 3 }, '巫女の祝言を、山の神と共に祝った') || '霧の中から、白い花びらが降ってきた。季節外れの、山桜だった。' },
      { label: '「幸せに」とだけ伝える', hint: '絆↑', run: () => epiGain({ bond: 2, joy: 1 }, '巫女の門出を見送った') || `${CAST.miko}は、何度も振り返りながら、石段を下りていった。` },
    ] },
  { y: 20, title: '若い魔術師', text: () => '山に、迷い込んだ若い魔術師がいた。霊脈を盗もうとしていたらしい。<br>大狼が、低く唸った。「……守り人。どうする」',
    choices: [
      { label: '叱って、山を下ろす', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '霊脈を狙う魔術師を諭した') || '「この山には、神様がいる。……二度と来るな。来るなら、手土産を持ってこい」若者は、なぜか毎年、手土産を持って来るようになった。' },
      { label: '神の怒りを、そのまま見せる', hint: '絆↑', run: () => epiGain({ bond: 2 }, '山の神の威を示した') || '霧の中から現れた大狼の姿に、若者は腰を抜かして逃げていった。大狼は、少しだけ愉快そうだった。' },
    ] },
  { y: 45, title: '次の守り人', text: () => '年を取った。石段を登るのが、少しつらくなった。<br>ある朝、祠の前に、小さな子どもが座っていた。「……神様と、お話ししてみたいの」',
    choices: [
      { label: '守り人の務めを教える', hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '次の守り人を育てた') || '神への礼、山の手入れ、霧の読み方。子どもは、目を輝かせて全部を覚えた。' },
      { label: '神に、その子を引き合わせる', hint: '幸福↑・絆↑', run: () => epiGain({ joy: 2, bond: 1 }, '次の守り人を、山の神に引き合わせた') || '大狼は、子どもの頬を、大きな舌でべろりと舐めた。子どもは、大笑いした。' },
    ] },
  { y: 60, title: '山に還る', final: true, text: () => `最後の朝。祠の前で、目を閉じた。霧の中で、白い大狼が、あなたの隣に寝そべった。<br>「……長い付き合いだった。人の子よ。――お前は、良い守り人だった」<br>遠くで、あの冬の英霊の声が聞こえた気がした。${SV()}の声だった。`,
    choices: [
      { label: '「この山を、頼む」', hint: '最後の言葉', run: () => epiGain({ legacy: 3 }, '山に還った') || '霧が、優しくあなたを包んだ。――その日から、天降山には、二柱の守り神がいると言われるようになった。' },
      { label: () => `${SVN()}の名を呼ぶ`, hint: '最後の言葉', run: () => epiGain({ bond: 3 }, '最後に英霊の名を呼んだ') || `「――${SVN()}」<br>霧の向こうで、誰かが手を差し伸べた。あなたは、その手を取った。` },
    ] },
];
// 他の人生に差し込む章：祟りを鎮めた・神を討った・杯を還した人生
const EPI_KAMI_FEST = { y: 10, title: '天降の祭り', skip: () => !(G.flags.kamiCalm || /^kami(Slain|Return)$/.test(G.epi.kind)),
  text: () => `毎年冬、天降神社では新しい祭りが開かれるようになった。${G.flags.kamiCalm ? '鎮魂の神楽' : /Slain/.test(G.epi.kind) ? '神を送る祭り' : '杯を還した日を祝う祭り'}。${CAST.miko}が舞い、街の人々が山を見上げる。<br>` +
    (G.flags.kamiCalm || /Return/.test(G.epi.kind) ? '霧の向こうで、白い大狼が、退屈そうに欠伸をしている気がした。' : '山は静かだ。もう、誰の声もしない。'),
  choices: [
    { label: '祭りの手伝いをする', hint: '遺したもの↑', run: () => epiGain({ legacy: 2, joy: 1 }, '天降の祭りを手伝った') || '屋台を組み、提灯を吊るし、子どもたちに山の神の昔話を聞かせた。' },
    { label: '祠に、一人で参る', hint: '絆↑', run: () => epiGain({ bond: 2, joy: 1 }, '天降の祠に参った') || '祭りの喧騒から離れて、祠の前で手を合わせた。冷たい風が、頬を撫でていった。' },
  ] };
function kamiEpiSteps(track) { if (!kamiNormal() || /^kishi_|^kami_/.test(track)) return []; if (!(G.flags.kamiCalm || (G.epi && /^kami(Slain|Return)$/.test(G.epi.kind)))) return []; return [EPI_KAMI_FEST]; }

EPI.kami_keeper = EPI_KAMI;

// ---- 分岐の中で起きるランダムな出来事 ----
EVENTS.push(
  { id: 'k_ev_pup', phase: 'war', time: 'day', once: true, weight: 4, cond: () => kamiOn() && !kamiResolved(),
    title: '白い仔狼',
    text: () => `拠点の庭に、真っ白な仔狼が迷い込んでいた。足を怪我している。<br>${SV()}が、怪訝な顔で見下ろした。「……ただの獣ではないな。山の気配がする」`,
    choices: [
      { label: '手当てをして、山へ帰す', hint: '善・山の神の心証', run: () => { tone('good'); G.flags.kamiPup = true;
          return ['包帯を巻いてやると、仔狼はあなたの指を一度だけ舐めて、山の方へ駆けていった。', '<span class="note">その夜、霧の中から、礼を言うような遠吠えが聞こえた。（祟りの日の戦いで、神の力が少し弱まる）</span>']; } },
      { label: () => `${SV()}に、仔狼の後を追わせる`, hint: '手がかり', run: () => ['仔狼は、山頂の祠の方へ消えていった。祠の鏡の奥で、白い光が瞬いていた。',
          kamiClue('pup', '白い仔狼', '神の和魂の欠片が、仔狼の姿で山を下りてきた。和魂は、まだ人を見捨ててはいない。')] },
    ] },
  { id: 'k_ev_song', phase: 'war', time: 'night', once: true, weight: 4, cond: () => kamiOn() && !kamiResolved(),
    title: '神楽の節',
    text: () => `夜。気がつくと、あなたは窓辺に立ち、知らないはずの神楽の節を口ずさんでいた。<br>窓の外の霧の中から、誰かが手招きしている。――呼ばれている。`,
    choices: [
      { label: '歯を食いしばって、正気を保つ', hint: '精神判定', run: () => { const c = chk('spi', 55);
          return c.ok ? [c.text, '頬を叩いて、窓を閉めた。霧の中の手は、名残惜しそうに引っ込んでいった。（精神+2）', (gain('spi', 2), '')] : [c.text, `気がつくと、裸足で庭に立っていた。${SV()}が、あなたの腕を強く掴んでいた。（HP-10）`, (hp(-10), '')]; } },
      { label: () => `${SV()}に、自分を止めてもらう`, hint: '絆↑', run: () => { bond(4); return [`「……世話の焼ける${G.master.gender === 'f' ? '人' : '奴'}だ」${SV()}が、一晩中、窓の前に立っていてくれた。（絆+4）`]; } },
    ] },
  { id: 'k_ev_worker', phase: 'war', time: 'day', once: true, weight: 4, cond: () => kamiOn() && !kamiResolved(),
    title: '石を掘った男',
    text: () => '駅前の居酒屋で、作業着の男が一人で酒を飲んでいた。再開発の工事で、重機を動かしていたらしい。<br>「……あの石を掘り出してから、夢見が悪いんだ。毎晩、でかい白い狼が、こっちを見てる」',
    choices: [
      { label: '話を最後まで聞く', hint: '交渉判定・手がかり', run: () => { const c = chk('cha', 50);
          if (!c.ok) return [c.text, '男は、それきり口をつぐんだ。'];
          G.flags.kamiStoneFound = true;
          return [c.text, '「注連縄が巻いてあったんだ。現場監督は、ただの古い石だって言った。……俺は、止めるべきだった」',
            kamiClue('worker', '石を掘った男', '再開発の作業員が、注連縄の巻かれた石を掘り出した。それ以来、毎晩白い狼の夢を見るという。霧が出始めたのも、その頃からだ。')]; } },
      { label: '「あんたのせいじゃない」と声をかける', hint: '善', run: () => { tone('good'); return '男は、少しだけ泣いた。「……ありがとよ。神社に、詫びに行ってみる」'; } },
    ] },
);
