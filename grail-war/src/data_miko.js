// =============================================================
//  data_miko.js … 巫女・天降 雫との物語
//
//  雫は天降神社の巫女で、主人公より二つ年下。天降神社に生まれた主人公にとっては従妹、
//  それ以外の主人公とは、9歳の秋祭りで出会う（通常のシナリオのみ。特殊シナリオでは、これまで通りの脇役）。
//  分岐「天降の祟り」で山の神の「花嫁」に選ばれる少女なので、雫との関係が、そのまま分岐の物語の重さになる。
//
//  ・生い立ち：9・12・16・17歳の節目に、雫との出来事が起きる
//      9歳「鈴の音」      … 出会い（従妹なら、泣きながら神楽を稽古する雫）。鈴のお守りをもらえる
//      12歳「山の声」     … 雫だけに聞こえる、山の奥の寂しい声
//      16歳「初舞台」     … 六十年前、舞った年の冬に山へ消えた巫女の話。守るか、一緒に調べるか
//      17歳「冬のお守り」 … 「もし山に呼ばれたら」。迎えに行く約束か、共に立ち向かう約束か
//  ・関係：関係値（-100〜100）で「恋人」「妹分」「相棒」「従妹（顔見知り）」「疎遠」が決まる
//      55以上 … 「恋人」「妹分」（守りたい存在）「相棒」（背中を預け合う存在）になる機会が訪れる
//      恋人になれるのは、三人のヒロイン（英霊・幼馴染・雫）のうち一人だけ。英霊と恋人になると、雫とは別れることになる
//      雫は女性。主人公が女性なら、同性の恋人として書き分ける（結婚式の装い・子を迎える場面など）
//      -30以下 … 「疎遠」になる。10以上に戻れば、雪解けで元に戻る
//  ・聖杯戦争
//      2日目の昼「令呪と巫女」 … 雫が令呪に気づく。関係が育っていれば、山の異変を打ち明けてくれる
//      4日目の夜「霧の夜」・5日目の昼「巫女の失踪」 … 関係によって、雫が残していくもの（手紙・鈴・地図）が変わる
//      8日目の夜「隠り世の声」 … 夢の中で、花嫁になった雫が「もう来ないで」と言う。
//                               迎えに行くと誓うか、六十年前の老人と同じように、彼女の決意を受け入れるか
//                               （分岐に入っていなくても、妹分・相棒なら、雫の声が最後の機会をくれる）
//      10日目「祟りの日」 … 誓っていれば、雫が隠り世の内側から神楽を舞い、神の力を削ぐ。
//                           受け入れていれば、雫は花嫁として山に嫁ぎ、祟りは鎮まる（聖杯を山へ還せば、取り戻せる）
//      昼の行動「雫に会いに行く」 … 雫が山に呼ばれる前と、帰ってきた後
//  ・エピローグ：雫が帰ってきたかどうかと関係で、章が変わる（春の神楽・祝言／新しい宮司・白髪の巫女、
//    帰らなかったなら、空の神楽殿・花嫁の祠・霧の中の少女）
// =============================================================

function mkNormal() { return !!G && !isFuji() && !isKishi() && !isShirou(); }
function miko() { if (!G.miko) G.miko = { bond: birthOf().id === 'shrine' ? 20 : 0, rel: null, met: birthOf().id === 'shrine' }; return G.miko; }
function mk(n) { if (!mkNormal()) return; const m = miko(); m.bond = clamp(m.bond + n, -100, 100); }
function mkMet() { return mkNormal() && !!(G.miko && G.miko.met); }
const mkCousin = () => birthOf().id === 'shrine';
const SHIZUKU = () => CAST.miko.split(' ').pop();   // 「雫」
// 雫からの呼び方：従妹なら「兄さん・姉さん」（幼い頃は「にいちゃん・ねえちゃん」）。それ以外は名前に「さん」
function mkGiven() { const n = G.master.name; return esc(n.includes(' ') ? n.split(' ').pop() : n); }
function mkCall(child) {
  if (mkCousin()) return child ? gw('にいちゃん', 'ねえちゃん', `${mkGiven()}ちゃん`) : gw('兄さん', '姉さん', `${mkGiven()}さん`);
  return child ? gw('おにいちゃん', 'おねえちゃん', `${mkGiven()}ちゃん`) : `${mkGiven()}さん`;
}

// ---- 関係（妹分・相棒・従妹／顔見知り・疎遠） ----
const MK_REL = { lover: '恋人', sister: '妹分', ally: '相棒', known: '顔見知り', far: '疎遠' };
const MK_UP = 55, MK_FAR = -30, MK_MEND = 10;
function mkRel() { return G.miko ? G.miko.rel || 'known' : null; }
function mkRelName() { const r = mkRel(); return r === 'known' && mkCousin() ? '従妹' : MK_REL[r] || ''; }
function mkClose() { return mkRel() === 'sister' || mkRel() === 'ally' || mkRel() === 'lover'; }
function mkLover() { return mkMet() && mkRel() === 'lover'; }
// 三人のヒロイン（英霊・幼馴染・雫）のうち、いま恋人なのは誰か（自分以外）
function otherLover(me) {
  if (me !== 'servant' && G.servant && G.servant.special === 'lover') return SV();
  if (me !== 'friend' && typeof frLover === 'function' && G.friend && frLover()) return friendName();
  if (me !== 'miko' && mkLover()) return CAST.miko;
  return null;
}
function mkFar() { return mkRel() === 'far'; }
function mkR(o) { const r = mkRel(); return o[r] ?? (r === 'lover' ? o.sister : undefined) ?? o.known; }   // 関係ごとに文章を選ぶ（恋人の文がなければ妹分の文）
function mkSetRel(rel, why) { const before = mkRelName(); miko().rel = rel; addLog(`${CAST.miko}との関係：${before} → ${mkRelName()}${why ? `（${why}）` : ''}`); }

// 雫は今、この世にいるか（山に呼ばれたまま戻らなければ、いない）。特殊シナリオでも使う
function mikoHere() {
  if (!G || !G.flags.kamiMikoTaken) return true;
  if (G.flags.mkBack) return true;
  const o = G.kami && G.kami.outcome;
  if (['calm', 'repelled', 'slain', 'pact'].includes(o)) return true;
  return !!(G.epi && G.epi.kind === 'kamiReturn');
}
// 雫がいない時の言い換え
function mikoOr(alt) { return mikoHere() ? CAST.miko : alt; }

// 関係が切り替わる出来事が必要か
function mkRelPending() {
  if (!mkMet()) return null; const m = miko(); const rel = mkRel();
  if (G.phase === 'growth' && G.master.age < 12) return null;
  if (rel !== 'far' && m.bond <= MK_FAR) return 'far';
  if (rel === 'far' && m.bond >= MK_MEND) return 'mend';
  if (rel === 'known' && m.bond >= Math.max(MK_UP, G.flags.mkRelNext || 0) && (G.phase !== 'growth' || G.master.age >= 16) && (G.phase !== 'war' || !G.flags.kamiMikoTaken || mikoHere())) return 'choose';
  return null;
}
function mkRelCheck(then) { const k = mkRelPending(); if (!k) return then(); mkRelScene(k, then); }
function mkRelScene(kind, then) {
  const s = SHIZUKU(); const war = G.phase === 'war'; const sub = war ? 'WAR' : `${G.master.age}歳`;
  if (kind === 'far') {
    const was = mkRelName();
    return scene({ title: '遠ざかる鈴の音', sub, reveal: true, body: paras([
      `いつからだろう。${s}が、あなたを避けるようになったのは。<br>${war ? '神社の石段ですれ違っても、' : '学校の帰り道、神社の前を通っても、'}${s}は目を伏せて、足早に行ってしまう。`,
      `前はあんなに鳴っていた、鈴のお守りの音も、もう聞こえない。`,
    ]), choices: [{ label: '次へ', fn: () => { mkSetRel('far', `${was}から`); next('遠ざかる鈴の音', paras([`${CAST.miko}との関係が「疎遠」になった。`]), then); } }] });
  }
  if (kind === 'mend') {
    return scene({ title: '雪解け', sub, reveal: true, body: paras([
      `${s}が、久しぶりに自分から声をかけてきた。「……${mkCall()}」`,
      `それだけだった。けれど、その声は、昔と同じ響きをしていた。`,
    ]), choices: [{ label: '次へ', fn: () => { mkSetRel('known', '雪解け'); next('雪解け', paras([`${CAST.miko}との関係が「${mkRelName()}」に戻った。`]), then); } }] });
  }
  // choose：恋人か、妹分か、相棒か（続いていく会話は data_dialog.js）
  if (typeof mikoConfession === 'function') return mikoConfession(then);
  return scene({ title: `${s}という存在`, sub, reveal: true, body: paras([
    war ? `戦いの合間の昼下がり。神社の境内で、${s}と並んで石段に腰かけた。冬の陽が、白い息を照らしている。` : `例大祭の後片付けを終えて、${s}と並んで石段に腰かけた。夜の境内に、虫の声だけが響いている。`,
    `「……${mkCall()}にとって、わたしって、何なんでしょうね」${s}は冗談めかして笑った。けれど、その目は真剣だった。`,
    'あなたにとって、雫は――',
  ]), choices: [
    (() => { const o = otherLover('miko'); return o
      ? { label: '想いを伝える', hint: `心はもう、${o}に向いている`, disabled: true, fn: () => {} }
      : { label: '想いを伝える', hint: '関係：恋人', fn: () => { mkSetRel('lover'); mk(5); next('想い', paras([
          `「好きだよ」――${mkCousin() ? '従妹相手に、' : ''}その一言を言うのに、ずいぶん遠回りをした。`,
          `${s}は、鈴を落とした。拾おうともせずに、真っ赤な顔であなたを見上げた。「……ずるいです。わたしの方が、ずっと前から好きだったのに」<br>「${mkCousin() ? '神楽殿で、泣いてたわたしに付き合ってくれた夜' : '九歳の、あの秋祭りの夜'}から。……ううん、たぶん、もっと前から」`,
          `${CAST.miko}と<b>「恋人」</b>になった。`]), then); } }; })(),
    { label: '「守りたい。妹みたいな、大事な存在だよ」', hint: '関係：妹分（雫は、あなたを頼りにする）', fn: () => { mkSetRel('sister'); next('妹分', paras([`${s}は、くすぐったそうに笑った。「……妹、かあ。――うん。じゃあ、ずっと守ってくださいね、${mkCall()}」`, `${CAST.miko}が「妹分」になった。`]), then); } },
    { label: '「背中を預けられる、相棒だと思ってる」', hint: '関係：相棒（雫は、自分の力で戦おうとする）', fn: () => { mkSetRel('ally'); next('相棒', paras([`${s}は目を丸くして、それから、ぱっと顔を輝かせた。「相棒……。はい！ 守られるだけなんて、天降の巫女の名折れですから」`, `${CAST.miko}が「相棒」になった。`]), then); } },
    { label: () => mkCousin() ? '「大事な従妹だよ」とだけ答える' : '「大事な友達だよ」とだけ答える', hint: '関係は変わらない', fn: () => { G.flags.mkRelNext = miko().bond + 15; next(`${s}という存在`, paras([`「……そっか。そうですよね」${s}は、少しだけ寂しそうに、でも嬉しそうに笑った。`]), then); } },
  ] });
}

// =============================================================
//  生い立ち：節目ごとの出来事（growth.js から、幼馴染の出来事の後に呼ぶ）
// =============================================================
const MIKO_GROWTH = [
  { id: 'mk_meet', age: 9, title: '鈴の音',
    text: () => mkCousin()
      ? `夜の神楽殿から、鈴の音が聞こえた。覗くと、七歳の${SHIZUKU()}が一人で神楽の稽古をしていた。何度も同じところで足がもつれ、そのたびに、鈴が床に落ちる。<br>「……おばあさまが、『天降の巫女がそれでは、山の神様に笑われる』って」<br>${SHIZUKU()}は、ぽろぽろと泣き出した。「わたし、巫女に向いてないのかな。……ねえ、${mkCall(true)}」`
      : `天降神社の秋祭り。人混みの外れで、巫女装束の小さな女の子が泣いていた。神楽で使う鈴を、どこかに落としてしまったらしい。<br>「……今夜、はじめて舞うのに。鈴がないと、山の神様に届かないの」<br>女の子は、<b>${CAST.miko}</b>と名乗った。神社の、宮司さんの家の子だという。`,
    choices: [
      { label: () => mkCousin() ? '「一緒に練習しよう。できるまで付き合う」' : '「一緒に探そう」', hint: '雫との関係↑↑・鈴のお守り', run: () => { mk(20); miko().met = true; G.flags.mkBell = true;
          return mkCousin()
            ? `夜が更けるまで、二人で神楽殿の床を踏み鳴らした。次の日の朝、${SHIZUKU()}は一度も鈴を落とさずに舞い切った。<br>その夜、${SHIZUKU()}は、あなたの手首に赤い紐を結んでくれた。小さな鈴が一つ、ちりんと鳴る。「お守り。山の神様が、${mkCall(true)}のことも覚えてくれるように」`
            : `屋台の下を這い回って、やっと見つけた鈴は、綿あめの屋台の裏に転がっていた。その夜、${SHIZUKU()}は、ちゃんと舞い切った。<br>帰り際、${SHIZUKU()}が駆けてきて、あなたの手首に赤い紐を結んだ。小さな鈴が一つ、ちりんと鳴る。「お礼。……山の神様が、${mkCall(true)}のことも覚えてくれるように」`; } },
      { label: () => mkCousin() ? '「泣いてても、上手くならないよ」' : '「泣いてても、鈴は戻ってこないよ」', hint: '雫との関係↓・知力↑', run: () => { mk(-10); miko().met = true; gain('int', 2);
          return `${SHIZUKU()}は唇を噛んで、泣くのをやめた。「……分かってる」<br>それきり、${SHIZUKU()}はあなたの前で泣かなくなった。笑うことも、少しだけ減った。（知力+2）`; } },
      { label: '変な顔をして、笑わせる', hint: '雫との関係↑・幸運↑', run: () => { mk(12); miko().met = true; gain('luk', 3);
          return `${SHIZUKU()}は、泣きながら吹き出した。「……へんなかお」<br>涙を拭いた${SHIZUKU()}は、もう一度、鈴を握り直した。（幸運+3）`; } },
    ] },
  { id: 'mk_voice', age: 12, title: '山の声', cond: () => !mkFar(),
    text: () => `「……ねえ、${mkCall(true)}。山の声って、聞こえる？」<br>${mkCousin() ? '社務所の縁側で' : '神社の石段で、久しぶりに会った'}${SHIZUKU()}が、膝を抱えて言った。十歳になった${SHIZUKU()}には、夜になると、山の奥から、誰かが名前を呼ぶ声が聞こえるのだという。<br>「大人に言っても、『気のせい』って。……でも、本当に聞こえるの。すごく、寂しそうな声で」` +
      (kamiPactChild() ? `<br><span class="note">右手の甲の、古い痣が、かすかに疼いた。</span>` : ''),
    choices: [
      { label: '「信じる。どんな声なのか、話して」', hint: '雫との関係↑↑・精神↑', run: () => { mk(15); gain('spi', 2); G.flags.mkBelieved = true;
          return `${SHIZUKU()}は、ほっとしたように話し始めた。声は、いつも同じ言葉を繰り返すのだという。<br>「『まだか』って。……誰かを、ずっと待ってるみたいなの」（精神+2）`; } },
      { label: '「気のせいだよ。夢でも見たんじゃない？」', hint: '雫との関係↓・知力↑', run: () => { mk(-12); gain('int', 2);
          return `「……そうだよね」${SHIZUKU()}は笑った。それきり、山の声の話は二度としなかった。（知力+2）`; } },
      { label: '「一緒に、確かめに行こう」', hint: '雫との関係↑・魔力↑・大胆', run: () => { mk(10); gain('mag', 3); tone('bold');
          return `夕暮れ、二人で天降山の中腹の鳥居まで登った。鳥居の向こうの森から、獣の吐息のような風が吹き下ろしてきた。<br>二人で手をつないで、転がるように逃げ帰った。宮司さんに、こっぴどく叱られた。（魔力+3）`; } },
    ] },
  { id: 'mk_stage', age: 16, title: '初舞台', cond: () => !mkFar(),
    text: () => `例大祭の夜。十四歳になった${SHIZUKU()}が、初めて本殿の神楽を任された。<br>出番の前の社務所で、${SHIZUKU()}は白い顔をしていた。<br>「……おばあさまが、六十年前にも、こうして初めて舞った巫女がいたって。その人は、舞った年の冬に、山へ消えたんだそうです」<br>「ねえ、${mkCall()}。……もし、わたしも、いなくなったら」`,
    choices: [
      { label: '「いなくならせない。何があっても守る」', hint: '雫との関係↑・妹分に近づく', run: () => { mk(12); G.flags.mkProtect = true;
          return `${SHIZUKU()}は、少しだけ泣きそうな顔で笑った。「……はい」<br>その夜の神楽は、見事だった。舞い終えた${SHIZUKU()}は、真っ先に客席のあなたを探した。`; } },
      { label: '「なら、一緒に調べよう。六十年前に何があったのか」', hint: '雫との関係↑・知力↑・相棒に近づく', run: () => { mk(12); gain('int', 3); G.flags.mkResearch = true;
          return `舞の後、二人で蔵の古い帳面をめくった。六十年前の冬、例大祭で舞った巫女が、確かに一人、山で行方知れずになっていた。帳面のその頁にだけ、「嫁ぐ」と墨で一言、書き足されていた。（知力+3）`; } },
      { label: '「考えすぎだよ。ほら、もうすぐ出番」', hint: '雫との関係↓・精神↑', run: () => { mk(-10); gain('spi', 2);
          return `「……そう、ですよね」${SHIZUKU()}は鈴を握りしめて、舞台へ出ていった。舞は、少しだけ硬かった。（精神+2）`; } },
    ] },
  { id: 'mk_charm', age: 17, title: '冬のお守り', cond: () => !mkFar(),
    text: () => `冬の初め。${mkCousin() ? '母屋の廊下で' : '神社の石段で'}、${SHIZUKU()}に呼び止められた。手には、白い紙で包んだお守りがある。<br>「この冬は、山の様子がおかしいんです。……それに、${mkCall()}も。何か、大きなことに巻き込まれそうな顔をしてる」<br>${SHIZUKU()}は、お守りをあなたの手に押しつけた。「もし、わたしが山に呼ばれたら――なんて。変なこと、言いましたね」`,
    choices: [
      { label: '「呼ばれたら、必ず迎えに行く」', hint: '雫との関係↑・約束', run: () => { mk(10); G.flags.mkPromise = true; gain('luk', 2);
          return `${SHIZUKU()}は、目を丸くして、それから小指を差し出した。「……約束ですよ。破ったら、山の神様に言いつけますから」（幸運+2）`; } },
      { label: '「その時は、一緒に立ち向かおう」', hint: '雫との関係↑・約束', run: () => { mk(10); G.flags.mkTogether = true; gain('spi', 2);
          return `「一緒に、ですか」${SHIZUKU()}は、お守りを握るあなたの手を、両手で包んだ。「……はい。天降の巫女は、守られるだけじゃありませんから」（精神+2）`; } },
      { label: '「ありがとう」とだけ言って受け取る', hint: '雫との関係↑', run: () => { mk(5); gain('luk', 2);
          return `「……どういたしまして」${SHIZUKU()}は、何か言いたそうな顔で、けれど何も言わずに頭を下げた。（幸運+2）`; } },
    ] },
];
// 疎遠のときの、12・16・17歳の出来事
MIKO_GROWTH.push(
  { id: 'mk_voice_far', age: 12, title: '石段の上の背中', cond: () => mkFar(),
    text: () => `神社の石段の上に、${SHIZUKU()}が一人で座っていた。山の方を、じっと見つめている。<br>あなたに気づくと、${SHIZUKU()}は何も言わずに、社務所へ入っていった。`,
    choices: [
      { label: '「何を見てたの？」と声をかける', hint: '雫との関係↑↑', run: () => { mk(25); return `扉の向こうから、小さな声がした。「……山の声が、聞こえるんです。誰も、信じてくれないけど」<br>「信じるよ」と答えると、扉が、ほんの少しだけ開いた。`; } },
      { label: 'そのまま立ち去る', hint: '精神↑', run: () => { gain('spi', 3); return '石段を下りる背中に、鈴の音は聞こえなかった。（精神+3）'; } },
    ] },
  { id: 'mk_stage_far', age: 16, title: '遠い神楽', cond: () => mkFar(),
    text: () => `例大祭の夜。本殿で、${SHIZUKU()}が初めての神楽を舞うと聞いた。<br>もう何年も、まともに口をきいていない。`,
    choices: [
      { label: '最前列で見届ける', hint: '雫との関係↑↑', run: () => { mk(20); return `舞い終えた${SHIZUKU()}と、目が合った。${SHIZUKU()}は、驚いたように目を見開いて――小さく、本当に小さく、頭を下げた。`; } },
      { label: '人垣の後ろから、遠く眺める', hint: '精神↑', run: () => { gain('spi', 3); return '人垣の向こうで、鈴の音だけが澄んで響いた。（精神+3）'; } },
    ] },
  { id: 'mk_charm_far', age: 17, title: '差出人のないお守り', cond: () => mkFar(),
    text: () => `冬の初め。郵便受けに、白い紙で包んだお守りが一つ、入っていた。差出人の名前はない。<br>けれど、包み紙からは、天降神社の御神木の香りがした。`,
    choices: [
      { label: '神社へ、礼を言いに行く', hint: '雫との関係↑↑', run: () => { mk(18); G.flags.mkPromise = true; return `「……別に。余ったから、入れただけです」${SHIZUKU()}は、そっぽを向いた。<br>「もし、わたしが山に呼ばれても――あなたには、関係ありませんから」その声は、少しだけ震えていた。`; } },
      { label: '黙って、鞄につけておく', hint: '幸運↑', run: () => { gain('luk', 3); return 'お守りは、冬のあいだずっと、鞄の底で揺れていた。（幸運+3）'; } },
    ] },
);
function mikoCheck(then) {
  if (!mkNormal()) return then();
  miko();
  const ev = MIKO_GROWTH.find(e => e.age === G.master.age && !G.used[e.id] && (!e.cond || e.cond()));
  if (!ev) return mkRelCheck(then);
  showEvent({ ...ev, chapter: `${CAST.miko}・${G.master.age}歳` }, () => mikoCheck(then));
}

// =============================================================
//  聖杯戦争
// =============================================================
// 分岐に入ったとき、雫から聞いていたことが手がかりになる（data_kami.js の kamiEnter から）
function mikoEnterClues() {
  if (!mkMet()) return '';
  let out = '';
  if (G.flags.mkWarned) out += kamiClue('mk_warn', '雫が聞いた声', `${CAST.miko}は、何年も前から、山の奥で「まだか」と誰かを待つ声を聞いていた。今年の冬、その声は急に大きくなった。`);
  if (G.flags.mkResearch) out += kamiClue('mk_research', '六十年前の巫女', '六十年前の冬、例大祭で初めて舞った巫女が、山で行方知れずになった。蔵の帳面には、その頁にだけ「嫁ぐ」と書き足されていた。');
  return out;
}
// 祟りの日の戦いで、雫が内側から力を貸す（神の体力を削る量）
function mikoKamiAid() { if (!mkMet() || !G.flags.mkResolve) return 0; return mkR({ ally: 25, sister: 15, known: 10, far: 10 }); }
// 雫が帰ってきた時の言葉（kind：'calm' 'none' 'slain' 'return' 'bride'）
function mikoReunion(kind) {
  if (!mkMet()) return '';
  G.flags.mkBack = true; const s = SHIZUKU(); const c = mkCall();
  if (kind === 'bride') { const t = mkR({
      lover: `「……なら、わたしも山に残ります」${s}は、あなたの手を取って、離さなかった。「守り人の隣にいるのは、巫女の務めです。……ううん、違う。これは、恋人のわたしの、わがままです」`,
      sister: `「どうして……どうして、${c}が」${s}は、あなたの袖を掴んで離さなかった。「わたしが行けば、済んだのに」<br>「妹を嫁に出すには、まだ早いからね」そう言うと、${s}は泣きながら笑った。`,
      ally: `「……ずるいです。一人で決めるなんて」${s}は涙を拭いて、まっすぐにあなたを見た。「なら、わたしは巫女として、あなたの隣で山を守ります。相棒を、一人になんてさせません」`,
      known: `${s}は、深く、深く頭を下げた。「……このご恩は、一生かけて、お返しします」`,
      far: `${s}は泣いていた。「……ずるい。こんなことされたら、もう、嫌いでいられないじゃないですか」` });
    if (mkRel() === 'ally' || mkRel() === 'lover') G.flags.mkKeeper = true;
    if (mkFar()) { mk(40); G.flags.mkMendedLate = true; } else mk(15);
    return `<p>${t}</p>`; }
  const t = mkR({
    lover: `石段の途中で、${s}が足を止めた。それから、まっすぐに駆けてきて、あなたの胸に飛び込んだ。<br>「……約束どおり、ちゃんと顔を見て言います。――好きです、${c}」<br>手首の鈴が、ちりんと鳴った。`,
    sister: `石段を駆け下りてきた${s}が、あなたの胸に飛び込んできた。「……来てくれた。やっぱり、来てくれた、${c}」<br>泣きじゃくる背中を、黙って撫で続けた。手首の鈴が、ちりんと鳴った。`,
    ally: `${s}は、少しふらつきながら石段を下りてきて、あなたの前で立ち止まった。「……外、ちゃんと守ってくれたんですね」<br>差し出された手を、強く握り返した。相棒の手だった。`,
    known: `${s}は、あなたを見つけると、深く頭を下げた。「……ありがとうございました。助けに来てくれたこと、忘れません」`,
    far: `${s}は、あなたの前で足を止めた。何か言いかけて、唇を噛み、それから小さく言った。「……ありがとう。……ずっと、ごめんなさい」<br>何年分かの氷が、溶ける音がした。` });
  if (mkFar()) { mk(40); G.flags.mkMendedLate = true; } else mk(15);
  return `<p>${t}</p>`;
}
// 巫女の失踪：雫が残していったもの
function mikoBrideNote() {
  if (!mkMet()) return '';
  const s = SHIZUKU(); const c = mkCall();
  return '<br>' + mkR({
    lover: `書き置きの隣に、あなた宛ての封筒があった。<br><b>「${c}へ。好きです。だから、行きます。<br>……でも、もし迎えに来てくれたら。その時は、ちゃんと顔を見て、もう一度言わせてください」</b>${G.flags.mkPromise ? '<br>――あの冬の約束を、' + s + 'は覚えていた。' : ''}`,
    sister: `書き置きの隣に、あなた宛ての封筒があった。<br><b>「${c}へ。迎えに来てくれるって、信じてます。だから、怖くない」</b>${G.flags.mkPromise ? '<br>――あの冬の約束を、' + s + 'は覚えていた。' : ''}`,
    ally: `あなた宛ての封筒には、手書きの山の地図と、${s}の神楽鈴が入っていた。<br><b>「わたしは中から、できることをします。外は、お願いします。――相棒へ」</b>`,
    known: G.flags.mkPromise || G.flags.mkTogether ? `文机の隅に、あなたの名前を書きかけて、やめたような紙片が残っていた。` : '',
    far: `あなた宛てのものは、何もなかった。――ただ、文机の引き出しに、渡しそびれたらしいお守りが一つ、しまわれていた。`,
  });
}

STORY.push(
  // ---- 2日目の昼：令呪と巫女 ----
  // （2日目の昼は「胸騒ぎ」＝三つのルートの分岐なので、1日目の夜に）
  { id: 'mk_seal', phase: 'war', day: 1, slot: 1, after: 'hub', cond: () => mkMet(),
    title: '令呪と巫女',
    text: () => { const s = SHIZUKU(); const c = mkCall();
      return `${mkCousin() ? '母屋の台所で' : '天降神社の前を通りかかると、石段の上から'}、${s}に呼び止められた。視線は、あなたの右手に注がれている。<br>` + mkR({
        lover: `「${c}……それ、令呪ですよね」${s}は、あなたの右手を両手で包んだ。「……死なないで。わたし、まだ、${c}と一緒に行きたいところが、たくさんあるんです」`,
        sister: `「${c}……それ、令呪ですよね。おばあさまから、聞いたことがあります」${s}は、今にも泣きそうな顔をしていた。「……死なないでくださいね。絶対ですよ」`,
        ally: `「やっぱり。……${c}も、選ばれたんですね」${s}は、きゅっと唇を結んだ。「わたしにも、何か手伝えることがあったら言ってください。巫女として、できることはあるはずです」`,
        known: `「……あなたも、聖杯戦争に」${s}は、礼儀正しく、けれど不安そうに頭を下げた。「どうか、お気をつけて。この冬の山は、様子がおかしいですから」`,
        far: `「……あなたも、なんですね」${s}は、冷たい声で言った。「神社には、近づかないでください。……巻き込まれたくないので」<br>そう言いながら、${s}は、あなたの右手から目を離さなかった。`,
      }); },
    choices: [
      { label: '「大丈夫。必ず無事に終わらせる」', hint: '雫との関係↑', run: () => { mk(5); return mkR({ sister: `「……約束ですよ」${SHIZUKU()}は、あなたの手首の鈴に、そっと触れた。`, ally: `「はい。信じてます」${SHIZUKU()}は、力強く頷いた。`, far: `「……別に、心配なんてしてません」${SHIZUKU()}は、背を向けた。`, known: `「……はい。ご無事で」` }); } },
      { label: '「山の様子は、どう？」と尋ねる', hint: '関係が育っていれば、山の異変を打ち明けてくれる', run: () => {
          if (miko().bond >= 20 || mkClose()) { G.flags.mkWarned = true; mk(3);
            return [`${SHIZUKU()}は、少し迷ってから、声を落とした。「……山の声が、急に大きくなったんです。子どもの頃から聞こえていた、あの寂しい声が」`,
              `「『まだか』って。……それが最近、『もうよい』に変わったんです。待つのを、やめたみたいに」`, '<span class="note">（山で何かが起きたとき、雫の話が手がかりになる）</span>']; }
          return `「……別に、何も」${SHIZUKU()}は、それ以上は話してくれなかった。`; } },
      { label: '「戦いが終わるまで、会わないでおこう」', hint: '雫との関係↓・巻き込まないために', run: () => { mk(-8);
          return mkR({ sister: `「……どうして、そういうこと言うんですか」${SHIZUKU()}は、俯いたまま動かなかった。`, ally: `「巻き込まないため、ですか。……分かりました。でも、わたしだって、ただ待ってるだけじゃありませんから」`, far: `「言われなくても、そうします」`, known: `「……分かりました。お気をつけて」` }); } },
    ] },
  // ---- 8日目の夜：隠り世の声（分岐の中で、花嫁になった雫が夢に現れる） ----
  { id: 'mk_dream', phase: 'war', day: 8, slot: 1, after: 'advance', cond: () => mkMet() && kamiOn() && G.flags.kamiMikoTaken && !kamiResolved(),
    title: '隠り世の声',
    text: () => { const s = SHIZUKU(); const c = mkCall();
      return `夢の中で、あなたは霧の野原に立っていた。<br>遠くに、白無垢の少女の背中が見えた。${s}だ。振り返った顔は、驚くほど静かだった。<br>` + mkR({
        lover: `<p class="quote">「……来ないで、${c}。白無垢なんて、${c}以外の人のために、着たくなかったのに。<br>でも、わたしが花嫁になれば、霧は止まるの。消えた子たちも、帰れる。……好きな人が傷つくのは、いやだよ」</p>`,
        sister: `<p class="quote">「${c}……来てくれるって、信じてた。でも――もう、来ないで。わたしが花嫁になれば、霧は止まるの。消えた子たちも、帰れる。……${c}が傷つくの、いやだよ」</p>`,
        ally: `<p class="quote">「聞こえますか、${c}。わたし、こっちで神楽を舞っています。神様の荒魂を、少しでも鎮めるために。<br>――でも、もし間に合わなかったら。その時は、わたしを花嫁のままにしてください。それで、街は助かりますから」</p>`,
        known: `<p class="quote">「……あなたでしたか。お願いがあります。もう、わたしを探さないでください。わたしが花嫁になれば、それで、全部終わるんです」</p>`,
        far: `<p class="quote">「……どうして、あなたが来るんですか。わたしのことなんて、どうでもいいくせに。――放っておいてください。これは、天降の巫女の務めです」</p>`,
      }) + (kamiPactChild() ? `<p class="quote">「あの時、${c}が代わりに約束してくれたから、わたしは今まで生きてこられた。……だから、今度はわたしの番」</p>` : '') +
        `<span class="note">霧の向こうで、${CAST.old}の声が聞こえた気がした。「わしは、あの子が山へ行くのを、止めなんだ」</span>`; },
    choices: [
      { label: '「必ず迎えに行く。花嫁になんて、させない」', hint: () => mkFar() ? '交渉判定・届けば、祟りの日に雫が力を貸してくれる' : '祟りの日に、雫が隠り世の内側から力を貸してくれる', cls: 'primary', run: () => {
          const s = SHIZUKU();
          if (mkFar()) { const c = chk('cha', 55);
            if (!c.ok) { mk(5); return [c.text, `${s}は、背を向けた。「……来ないでって、言ってるのに」霧が、二人のあいだを閉ざした。`]; }
            mk(15); G.flags.mkResolve = true;
            return [c.text, `${s}の肩が、震えた。「……ばか。……本当に、来るつもりなんですか」<br>霧の向こうで、鈴の音が一つ、鳴った。`, '<span class="note">祟りの日、雫が隠り世の内側から、神の力を削いでくれる。</span>']; }
          mk(10); G.flags.mkResolve = true; tone('good');
          return [mkR({ lover: `${s}は、泣き笑いの顔になった。「……ばか。そう言うって、分かってた。――待ってる。今度は、${mkCall()}の花嫁として、この衣装を着たいから」`,
              sister: `${s}は、泣き笑いの顔になった。「……やっぱり、そう言うと思った。――待ってる。ずっと、待ってるから」`,
              ally: `${s}は、ふっと笑った。「……ですよね。相棒が、そんなこと許すわけないか。――分かりました。わたしは中から舞い続けます。外は、任せました」`,
              known: `${s}は、しばらく黙っていた。「……変な人ですね。――でも、ありがとう」` }),
            '<span class="note">祟りの日、雫が隠り世の内側から、神の力を削いでくれる。</span>'];
        } },
      { label: '「……分かった。雫が、そう決めたなら」', hint: '雫は花嫁として山に嫁ぎ、祟りは戦わずに鎮まる', run: () => {
          G.flags.mkOffered = true; tone('law'); mk(-10);
          return [`${SHIZUKU()}は、ほっとしたように微笑んだ。「……ありがとう。最後に、${mkCall()}の声が聞けて、よかった」<br>白無垢の背中が、霧の奥へ遠ざかっていく。`,
            `目を覚ますと、枕が濡れていた。――止めなんだ。あの老人の言葉が、耳の奥で響いていた。`,
            '<span class="note">祟りの日、雫は花嫁として山へ嫁ぐ。祟りは、それで鎮まるだろう。</span>'];
        } },
    ] },
  // ---- 8日目の夜：雫の声（分岐に入っていなくても、妹分・相棒なら、最後の機会） ----
  { id: 'mk_call', phase: 'war', day: 8, slot: 1, after: 'advance', cond: () => mkMet() && mkClose() && !kamiOn() && G.flags.kamiMikoTaken && !G.flags.kamiLeft && !kamiResolved(),
    title: '雫の声',
    text: () => { const s = SHIZUKU(); const c = mkCall();
      return `眠りの中で、霧の野原に立っていた。遠くで、白無垢の${s}が、こちらに背を向けて歩いていく。<br>` +
        mkR({ lover: `<p class="quote">「……${c}。来てくれないの？ ……会いたいよ」</p>`, sister: `<p class="quote">「……${c}。来てくれないの？」</p>`, ally: `<p class="quote">「${c}。……一人じゃ、ちょっと、きついです」</p>` }) +
        `手首の鈴が、夢の中で、ちりんと鳴った。――まだ、間に合うかもしれない。`; },
    choices: [
      { label: '霧の奥へ、手を伸ばす', hint: '祟りの日まで、あと2日', cls: 'primary', run: () => { G.flags.kamiLate = true; G.flags.mkResolve = true; mk(10); tone('good');
          return [`「――${SHIZUKU()}！」<br>叫んだ瞬間、霧の中で、${SHIZUKU()}の手がこちらへ伸びた。指先が触れる。冷たい手だった。`,
            `<p class="quote">「……百八十年の契りなの。六十年ごとに、花嫁を一人。今年は、わたしの番。――でも、来てくれるなら、わたしは中から神楽を舞う」</p>`,
            kamiClue('miko_bride', '花嫁に選ばれた巫女', `${CAST.miko}が「花嫁に選ばれた」と書き置きを残し、山へ消えた。`),
            kamiClue('mk_dream', '隠り世の花嫁', `${CAST.miko}は、霧の奥の隠り世で、花嫁として神のもとにいる。まだ、生きている。`),
            kamiClue('pact', '六十年の契り', '天降山は土地神「天降大神」の体。神は六十年に一度、聖杯に力を貸す。代わりに人は「花嫁」を一人捧げる――それが百八十年続いた契り。'),
            kamiEnter('雫の声に応えた'), '<span class="note">「山の異変を追う」から、神と向き合う道を選べる。祟りの日は、10日目だ。</span>'];
        } },
      { label: '目を覚ます', run: () => { mk(-10); return `夢の中の背中は、霧に溶けて消えた。目を覚ましても、手首の鈴の音が、耳から離れなかった。`; } },
    ] },
);

// ---- 昼の行動「雫に会いに行く」 ----
function mikoVisitable() { return mkMet() && G.phase === 'war' && !mkFar() && (!G.flags.kamiMikoTaken || mikoHere()); }
function mikoVisit() {
  actResult(CAST.miko, () => {
    const s = SHIZUKU(); mk(6); gain('mag', 1); gain('spi', 1);
    const back = G.flags.kamiMikoTaken;
    const lines = back ? mkR({
        lover: [`山から帰ってきた${s}と、手をつないで境内を歩いた。「……もう、どこにも行きません。${mkCall()}の隣以外は」`, `${s}が、神楽の稽古の合間に、あなたの肩にもたれて少しだけ眠った。`],
        sister: [`山から帰ってきた${s}は、前よりよく笑うようになった。境内の掃除を手伝うと、「${mkCall()}は箒の持ち方がなってません」と、楽しそうに直された。`, `${s}が、甘酒を作って待っていてくれた。「……寒いのに、来てくれてありがとう」`],
        ally: [`${s}と二人で、山の要石の注連縄を見回った。「……もう、二度とあんなことはさせません」その横顔は、すっかり一人前の巫女だった。`, `${s}が、聖杯戦争の話を聞きたがった。作戦を話すと、真剣な顔で頷いて、結界のコツを教えてくれた。`],
        known: [`${s}が、帰還のお礼にと、お守りを一つくれた。「……少しは、ご恩返しになるといいんですけど」`],
      }) : mkR({
        lover: [`${s}が、手作りのお弁当を持って拠点まで来てくれた。「戦争中だって、恋人がお昼を届けちゃいけない決まりはありませんから」`, `${s}と、人目を避けて、神社の裏の御神木の下で会った。寒いからと、${s}はあなたのコートのポケットに、自分の手を入れてきた。`],
        sister: [`${s}が、神社の裏の井戸で、あなたの分のお茶を淹れてくれた。「戦争中だって、お茶くらい飲んでいいんですよ」`, `${s}と並んで、境内の落ち葉を掃いた。何も話さなくても、鈴の音だけで、十分だった。`],
        ally: [`${s}が、天降山の霊脈の流れを教えてくれた。「陣地を作るなら、この線を使ってください。山の力が、少しだけ味方してくれます」`, `${s}と二人で、神社の結界を張り直した。「相棒の拠点も、ついでに守っておきますね」`],
        known: [`${s}が、社務所でお守りを授けてくれた。「……ご武運を」`, `${s}は、神楽の稽古中だった。邪魔をしないように、しばらく舞を眺めて帰った。`],
      });
    const all = typeof mkVisitMore === 'function' ? lines.concat(mkVisitMore(back)) : lines;   // 言い換え（data_variety.js）
    return [pickFresh('mkv' + (back ? 'b' : '') + mkRel(), all), `<span class="note">（${CAST.miko}との関係+6・魔力+1・精神+1）</span>`];
  });
}

// =============================================================
//  エピローグ：雫の章
// =============================================================
const mkEpiFar = () => mkFar() && !G.flags.mkMendedLate && !(G.epi && G.epi.mkMended);
const MIKO_EPI = {
  // ---- 2年後：春の神楽（雫が帰ってきた） ----
  spring: { y: 2, title: '春の神楽',
    text: () => { const s = SHIZUKU();
      return `あの冬から、二度目の春。天降神社の神楽殿で、${s}が舞っていた。十八歳になった${s}の鈴の音は、あの冬よりずっと澄んでいる。<br>` + (mkEpiFar()
        ? `${s}は、最後まであなたの方を見なかった。けれど、舞い終えた鈴が、一度だけ、こちらへ向けて鳴った。`
        : mkR({ lover: `舞い終えた${s}が、巫女装束のまま客席へ駆けてきて、人目もはばからず、あなたの手を握った。`, sister: `舞い終えた${s}が、真っ先に客席のあなたへ手を振った。巫女の威厳は、どこにもなかった。`, ally: `舞い終えた${s}が、目だけで「どうでした？」と聞いてくる。あなたは、親指を立てて答えた。`, known: `舞い終えた${s}が、客席のあなたに気づいて、小さく会釈した。` })); },
    choices: [
      { label: () => mkEpiFar() ? '神楽殿の裏で、声をかける' : '「きれいだった」と伝えに行く', hint: () => mkEpiFar() ? '雪解け' : '幸福↑', run: () => {
          if (mkEpiFar()) { G.epi.mkMended = true; return epiGain({ bond: 1, joy: 1 }, '雫と、ようやく言葉を交わした') || `「……見てたんですか」${SHIZUKU()}は、ぷいと横を向いた。それから、ぽつりと言った。「……あの冬、助けに来てくれたって、聞きました。――ありがとう」`; }
          return epiGain({ joy: 2 }, '雫の神楽を見届けた') || `「……本当ですか？」${SHIZUKU()}は、ぱっと顔を赤くした。「あの冬が、なかったら。わたしは今、ここで舞えてなかったから」`; } },
      { label: '鈴のお守りを、鳴らしてみせる', hint: '絆↑', cond: () => !!G.flags.mkBell, run: () => epiGain({ bond: 2 }, '幼い日の鈴のお守りを、まだ持っていた') || `手首の赤い紐は、すっかり色褪せていた。ちりん、と鳴らすと、${SHIZUKU()}は目を丸くして、それから笑った。「……まだ、つけてたんだ」` },
      { label: '人混みに紛れて、そっと帰る', hint: '遺したもの↑', run: () => epiGain({ legacy: 1, joy: 1 }, '雫の神楽を、遠くから見届けた') || '春の境内に、鈴の音が、いつまでも残っていた。' },
    ] },
  // ---- 12年後：巫女の祝言／新しい宮司 ----
  // ---- 5年後：求婚（恋人） ----
  propose: { y: 5, title: '神楽殿の誓い', skip: () => !mkLover() || mkEpiFar(),
    text: () => `${SHIZUKU()}と付き合い始めて、もう何年になるだろう。<br>例大祭の後の、誰もいない神楽殿。${SHIZUKU()}は、あの冬に花嫁衣装を着せられたことを、今でも時々、夢に見るという。<br>「……だから、ちゃんと上書きしたいんです。今度は、自分で選んだ人のために」` +
      (G.epi && /^together_/.test(G.epi.track) ? `<br>${SV()}が、境内の外で、素知らぬ顔をして待っていた。` : ''),
    choices: [
      { label: '「結婚しよう」', hint: '雫と、人生を共に歩む', run: () => {
          const e = G.epi; e.mkSpouse = true; e.newLove = true;
          e.steps = e.steps.filter((st, i) => i <= e.i || st.title !== '面影');   // 新しい人と出会う章は、もういらない
          if (!e.steps.some(st => st.title === '二人の未来') && typeof EPI_LOVE !== 'undefined') { const i = e.steps.findIndex((st, k) => k > e.i && st.y > 6); e.steps.splice(i < 0 ? e.steps.length - 1 : i, 0, { ...EPI_LOVE, y: 7 }); }
          epiGain({ joy: 3, bond: 1 }, `${CAST.miko}と結婚した`);
          return `${SHIZUKU()}は、泣きながら笑った。「……はい。喜んで」<br>式は、天降神社で挙げた。${gw(`白無垢の${SHIZUKU()}と、紋付袴のあなた`, `白無垢を揃えた二人`, `白無垢の${SHIZUKU()}と、あなた`)}。祝詞を上げたのは${mkCousin() ? '叔父――' + SHIZUKU() + 'の父' : SHIZUKU() + 'の父'}で、途中で声を詰まらせて、しばらく先へ進めなかった。<br>霧の向こうで、白い大狼が、退屈そうに欠伸をした気がした。――今度の花嫁は、山のものではない。`;
        } },
      { label: '「今のままで、いいんだ」', hint: '恋人のまま、それぞれの道を', run: () => { G.epi.mkNoMarry = true; epiGain({ legacy: 2 }, '雫と、結婚という形を選ばなかった');
          return `${SHIZUKU()}は少し驚いて、それから、くすりと笑った。「……${mkCall()}らしいですね。じゃあ、ずっと恋人のままで。それも、悪くないです」`; } },
    ] },
  grown: { y: 12, title: '巫女の祝言', skip: () => mkEpiFar() || mkLover(),
    text: () => { const s = SHIZUKU();
      if (mkRel() === 'ally') return `${s}が、天降神社の宮司を継ぐことになった。天降の家で、初めての女性の宮司だという。<br>就任の日、白い装束の${s}が、あなたの前に立った。「……あの冬から、ずっと考えてたんです。山と街の両方を守れる宮司になりたいって。――${mkCall()}。これからも、相棒でいてくれますか」`;
      return `${s}が、結婚することになった。相手は、麓の町で小さな診療所を開いている、穏やかな人だという。<br>` + mkR({
        sister: `「${mkCall()}に、お願いがあるんです」${s}は、少しもじもじしながら言った。「参進の時、わたしの手を引いて、石段を一緒に上ってほしいの。……${gw('兄', '姉', '家族')}代わり、じゃなくて、${gw('兄さん', '姉さん', '家族')}として」`,
        known: `あなたのもとにも、招待状が届いた。添えられた手紙には、丁寧な字で「あの冬、助けていただいたから、この日を迎えられます」と書かれていた。` }); },
    choices: [
      { label: () => mkRel() === 'ally' ? '「もちろん。ずっと相棒だよ」' : mkRel() === 'sister' ? '手を引いて、石段を上る' : '式に参列して、祝う', hint: '幸福↑↑', run: () => epiGain({ joy: 3 }, mkRel() === 'ally' ? '新しい宮司・雫の相棒であり続けた' : '雫の門出を祝った') || mkR({
          ally: `${SHIZUKU()}は、子どもの頃と同じ顔で笑った。その日から、天降神社の帳面には、時々、宮司ではない名前の筆跡が混じるようになった。`,
          sister: `白無垢の${SHIZUKU()}の手は、少し震えていた。石段の上で手を離すと、${SHIZUKU()}は小さく言った。「……今度は、ちゃんと人のお嫁さんになります」――霧の向こうで、山の神が、笑った気がした。`,
          known: `${SHIZUKU()}の白無垢姿は、春の光の中で、とても綺麗だった。` }) },
      { label: '山の神に、報告に行く', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '雫の門出を、山の神に報告した') || '祠の前で手を合わせた。「あの子は、もう花嫁にはならないよ」――霧の中で、大狼が、満足そうに目を細めた気がした。' },
    ] },
  // ---- 50年後：白髪の巫女 ----
  old: { y: 50, title: '白髪の巫女', skip: () => mkEpiFar(),
    text: () => `五十年が過ぎた。${G.epi && G.epi.mkSpouse ? `半世紀を共に歩いた${SHIZUKU()}は、すっかり白髪になった。今日も、` : ''}天降神社の神楽殿で、白髪の${SHIZUKU()}が、小さな女の子に神楽を教えていた。何度も同じところで足がもつれ、そのたびに、鈴が床に落ちる。<br>${SHIZUKU()}は、あなたに気づいて、いたずらっぽく笑った。「……誰かさんに、そっくりでしょう？」`,
    choices: [
      { label: '「一緒に練習しよう。できるまで付き合う」と、女の子に言う', hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '雫と共に、次の巫女を育てた') || `女の子は、泣き顔のまま頷いた。${SHIZUKU()}が、目尻の皺を深くして、遠い冬を思い出すように笑った。` },
      { label: '縁側で、二人でお茶を飲む', hint: '幸福↑・絆↑', run: () => epiGain({ joy: 2, bond: 1 }, '年老いた雫と、縁側でお茶を飲んだ') || `「……長い付き合いになりましたね、${mkCall()}」${SHIZUKU()}が淹れてくれたお茶は、五十年前と同じ味がした。` },
    ] },
  // ---- 1年後：花嫁の祠（雫が花嫁として山に嫁いだ） ----
  shrine: { y: 1, title: '花嫁の祠',
    text: () => `天降山の祠の脇に、小さな祠が一つ増えた。誰が建てたのかは、誰も知らない。<br>霧の濃い朝、その祠の前に、白い草履がきちんと揃えて置いてあることがある。`,
    choices: [
      { label: '毎年、鈴を一つ供える', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, '花嫁になった雫の祠に、鈴を供え続けた') || '霧の中で、ちりん、と鈴が鳴った。返事のように聞こえたのは、気のせいだったかもしれない。' },
      { label: () => `${CAST.old}を訪ねる`, hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '六十年前の花嫁を知る老人と、語り合った') || `${CAST.old}は、黙って隣に座り、川面を見つめた。「……わしと、同じ道を選んだか。――悔いても、いい。悔いながら、生きればいい」` },
    ] },
  // ---- 1年後：空の神楽殿（雫が戻らなかった） ----
  empty: { y: 1, title: '空の神楽殿',
    text: () => `あの冬から、初めての例大祭。今年の神楽は、舞われなかった。神楽殿には、${SHIZUKU()}の鈴だけが、白い布の上に置かれていた。` +
      (mkClose() ? `<br>あの冬に受け取った封筒は、まだ、開けられずにいる。` : ''),
    choices: [
      { label: () => mkClose() ? '封筒を開ける' : '神楽殿に、手を合わせる', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, mkClose() ? '雫の最後の手紙を読んだ' : '空の神楽殿に手を合わせた') || (mkClose()
          ? `<b>「${mkCall()}へ。もし、迎えに来られなくても、怒ってません。${mkCall()}が生きていてくれたら、それでいいんです。――${mkRel() === 'ally' ? '背中を預けてもらえて、嬉しかった。相棒より' : 'ずっと、大好きでした。妹より'}」</b>`.replace('ずっと、大好きでした。妹より', mkRel() === 'lover' ? 'ずっと、好きでした。――あなたの雫より' : 'ずっと、大好きでした。妹より')
          : '冷たい床板の上で、鈴が、一度だけ風に鳴った。') },
      { label: '天降山を、探して歩く', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '霧の消えた天降山を、探して歩いた') || '霧はもう、どこにもなかった。山はただ、静かだった。' },
    ] },
  // ---- 40年後：霧の中の少女（雫が戻らなかった） ----
  mist: { y: 40, title: '霧の中の少女',
    text: () => `霧の濃い朝だった。天降山の石段で、白無垢の少女とすれ違った気がした。<br>振り返ると、誰もいない。――あの冬のままの、十六歳の${SHIZUKU()}だった。`,
    choices: [
      { label: '名前を呼ぶ', hint: '絆↑', run: () => epiGain({ bond: 2 }, '霧の中で、雫の名を呼んだ') || `「――${SHIZUKU()}」<br>霧の奥で、鈴の音が一つ、鳴った。${mkCall()}、と呼ぶ声が、聞こえた気がした。` },
      { label: '黙って、頭を下げる', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '霧の中の少女に、頭を下げた') || '霧が晴れた石段に、朝日が差していた。' },
    ] },
};
// 守り人の人生で、恋人の雫と祠の前で結ばれる（data_kami.js の「巫女の祝言」から）：その後に「二人の未来」が続く
function mikoKeeperMarry() {
  const e = G.epi; if (e.mkSpouse) return; e.mkSpouse = true; e.newLove = true;
  if (typeof EPI_LOVE !== 'undefined' && !e.steps.some(st => st.title === '二人の未来')) { const i = e.steps.findIndex((st, k) => k > e.i && st.y > 7); e.steps.splice(i < 0 ? e.steps.length - 1 : i, 0, { ...EPI_LOVE, y: 7 }); }   // 年の順に
}
function mikoEpiSteps(track) {
  if (!mkMet() || /^kishi_/.test(track)) return [];
  if (track === 'kami_keeper') return [];   // 山の守り人の人生には、専用の「巫女の祝言」がある
  if (!mikoHere()) return G.kami && G.kami.outcome === 'offered' ? [MIKO_EPI.shrine, MIKO_EPI.mist] : [MIKO_EPI.empty, MIKO_EPI.mist];
  return [MIKO_EPI.spring, MIKO_EPI.propose, MIKO_EPI.grown, MIKO_EPI.old];
}
