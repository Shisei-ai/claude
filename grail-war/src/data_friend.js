// =============================================================
//  data_friend.js … 幼馴染の物語
//
//  幼馴染は、6歳の「幼馴染」の出来事で出会う（通常のシナリオのみ）。
//  幼馴染には、どうしても叶えたい切実な願いがある（妹の病・眠り続ける母・自分自身の命のどれか）。
//
//  ・生い立ち：9・12・14・16・17歳の節目に、幼馴染との出来事が起きる（関係を築き、願いの根が明かされる）
//  ・聖杯戦争：幼馴染もマスターとして参戦している。3日目に再会し、その後も苦しい選択が続く
//      5日目の夜「友の危機」 … 襲われる幼馴染を、助けるか、見捨てて漁夫の利を得るか
//      7日目の昼「病室」     … 聖杯を幼馴染の願いのために使うと約束するか。真実を告げるか
//      10日目の夜「堕ちる友」 … 追い詰められた幼馴染が魂喰いに手を染める。止めるか、見逃すか、教会に告げるか
//      最後の敵が幼馴染なら … 討つか、聖杯を譲るか、（真実を共有していれば）二人で聖杯を壊すか
//      聖杯の前で           … 自分の願いか、幼馴染の願いか
//  ・昼の行動「幼馴染に会いに行く」で、戦いの最中にも関係を深められる
//  ・結末：エンディング「友の願い」「譲られた杯」「友の願いの代償」と、結末ごとの後日談
// =============================================================

const FRIEND_SIS = ['ひなた', '菜々', '美羽', '小雪'];
// 幼馴染の情報（古いセーブにも、足りない項目を補う）
function fr() {
  const f = G.friend; if (!f) return null;
  if (!f.wish) f.wish = pick(['sister', 'mother', 'self']);
  if (!f.sis) f.sis = pick(FRIEND_SIS);
  return f;
}
// 願いごとの言葉
function frWish() {
  const f = fr(); if (!f) return { who: '', ill: '', worse: '', wish: '', short: '', healed: '' }; const s = f.sis;
  return {
    sister: { who: `妹の${s}ちゃん`, ill: `妹の${s}ちゃんは、生まれつき心臓が弱い。入院と退院を繰り返している`, worse: `${s}ちゃんの容体が急変した。医師は「春まで持つかどうか」と言ったという`,
      wish: `${s}の心臓を、治してあげたい`, short: '妹を救うこと', healed: `春。退院した${s}ちゃんが、${friendName()}と手をつないで、城跡公園の桜の下を走っていた。` },
    mother: { who: 'お母さん', ill: '三年前の事故から、お母さんは病院のベッドで眠り続けている', worse: '病院から、延命の治療をいつまで続けるか決めてほしいと言われたという',
      wish: 'お母さんを、目覚めさせたい', short: '母を目覚めさせること', healed: `${friendName()}のお母さんが、三年ぶりに目を開けた。最初に呼んだのは、${friendName()}の名前だった。` },
    self: { who: '自分自身', ill: `${friendName()}の体の中で、魔術回路が少しずつ暴れ出している。医者にも魔術師にも、治せない`, worse: `${friendName()}が血を吐いて倒れた。残された時間は、思っていたよりずっと短いらしい`,
      wish: '生きたい。普通に、大人になりたい', short: '生きること', healed: `${friendName()}の体を蝕んでいた熱が、嘘のように引いていった。「……生きてて、いいんだね」` },
  }[f.wish];
}
function frRival() { return (G.rivals || []).find(r => r.friend); }
function frAlive() { const r = frRival(); return !!(r && r.alive); }          // 幼馴染の陣営が、まだ戦いに残っている
function frSafe() { const r = frRival(); return !!(r && !r.killed); }          // 幼馴染本人が無事
function frNormal() { return !!G.friend && !isFuji() && !isKishi() && !isShirou(); }

// =============================================================
//  生い立ち：節目ごとの出来事（growth.js から、節目の最後に呼ぶ）
// =============================================================
const FRIEND_GROWTH = [
  { id: 'fr_sakura', age: 9, title: '桜の木の下で',
    text: () => `城跡公園のいちばん大きな桜の木の下が、いつの間にか${friendName()}とあなたの「秘密の場所」になっていた。<br>` +
      (fr().wish === 'sister' ? `今日の${friendName()}は、小さな妹の${fr().sis}ちゃんを連れてきていた。「この子、体が弱いんだ。だから、わたしが守るの」` :
       fr().wish === 'mother' ? `${friendName()}のお母さんが、二人分のおにぎりを持たせてくれた。「あの人、料理だけは上手なんだよ」と${friendName()}は照れくさそうに笑う。` :
       `${friendName()}は木のいちばん低い枝に腰かけて、足をぶらぶらさせていた。「ねえ、大人になったら何になる？」`),
    choices: [
      { label: '「大人になっても、毎年ここで桜を見よう」', hint: '友情↑↑', run: () => { friend(15); G.flags.frSakura = true; return `${friendName()}は小指を差し出した。「約束ね。破ったら、針千本だから」<br>二人の小指が、花びらの下で絡まった。`; } },
      { label: '「ここを秘密基地にしよう」', hint: '友情↑・幸運↑', run: () => { friend(10); gain('luk', 3); return '段ボールとブルーシートで、小さな基地ができた。雨が降るたびに潰れて、そのたびに二人で作り直した。（幸運+3）'; } },
      { label: '「どっちが先に、てっぺんまで登れるか勝負！」', hint: '友情↑・体力↑', run: () => { friend(10); gain('phy', 3); G.flags.friendRival = true; return `二人とも途中で降りられなくなり、公園の管理人さんにこっぴどく叱られた。帰り道、${friendName()}はずっと笑っていた。（体力+3）`; } },
    ] },
  { id: 'fr_shadow', age: 12, title: '影',
    text: () => (fr().wish === 'sister' ? `学校の帰り道、${friendName()}の携帯が鳴った。${fr().sis}ちゃんが、また倒れたらしい。<br>病院の廊下で、${friendName()}は膝を抱えて座り込んでいた。「……あの子の心臓、治らないんだって」` :
       fr().wish === 'mother' ? `その知らせは、突然だった。${friendName()}のお母さんが、交通事故に遭った。命は助かった。けれど――目を覚まさない。<br>病院の待合室で、${friendName()}は一言も喋らなかった。` :
       `体育の授業中、${friendName()}が倒れた。救急車の中で、その手は火傷しそうなほど熱かった。<br>検査の結果は「原因不明」。それから${friendName()}は、時々、ひどい熱を出すようになった。`),
    choices: [
      { label: '毎日、病院に通う', hint: '友情↑↑・精神↑', run: () => { friend(20); gain('spi', 3); G.flags.frStayed = true; return `何を話すでもなく、ただ隣に座った。ある日、${friendName()}がぽつりと言った。「……来てくれて、ありがと」（精神+3）`; } },
      { label: '「大丈夫。きっと良くなる」と励ます', hint: '友情↑・交渉↑', run: () => { friend(10); gain('cha', 3); return `${friendName()}は無理に笑って頷いた。その笑顔が、少しだけ痛かった。（交渉+3）`; } },
      { label: 'どう接していいか分からず、距離を置いてしまう', hint: '友情↓・知力↑', run: () => { friend(-10); gain('int', 3); G.flags.frDistance = true; return `声をかけようとして、何度もやめた。気づけば、${friendName()}とは廊下ですれ違うだけになっていた。（知力+3）`; } },
    ] },
  { id: 'fr_quarrel', age: 14, title: 'すれ違い',
    text: () => `${G.flags.frDistance ? 'しばらく疎遠だった' : 'いつものように隣を歩いていた'}${friendName()}が、ふいに立ち止まった。<br>` +
      `「……あなたには分からないよ。${birthOf().magic ? '立派な家があって、特別な力まであって' : '家族がみんな元気で、何の心配もなくて'}。わたしの気持ちなんて、分かるわけない！」<br>${frWish().ill}。その重さが、${friendName()}を少しずつ押し潰していた。`,
    choices: [
      { label: '「そっちこそ、勝手なことばかり！」と言い返す', hint: '友情↓・精神↑', run: () => { friend(-15); gain('spi', 3); G.flags.frRift = true; return `言ってはいけない言葉を、お互いにぶつけた。その日から、二人は口をきかなくなった。（精神+3）`; } },
      { label: '何も言わず、隣に座り続ける', hint: '友情↑↑・精神↑', run: () => { friend(15); gain('spi', 4); return `日が暮れるまで、二人で黙って座っていた。やがて${friendName()}は、声を殺して泣き出した。あなたは、その背中にそっと手を置いた。（精神+4）`; } },
      { label: '「分からない。だから、教えてほしい」', hint: '友情↑・交渉↑・知力↑', run: () => { friend(10); gain('cha', 3); gain('int', 2); return `${friendName()}は驚いた顔をして、それから、ずっと言えなかったことを少しずつ話してくれた。（交渉+3 知力+2）`; } },
    ] },
  { id: 'fr_legend', age: 16, title: '杯の伝説',
    text: () => `${G.flags.frRift ? `あの喧嘩から二年。久しぶりに、${friendName()}から声をかけてきた。` : `放課後の図書室で、${friendName()}が古い本を広げていた。`}<br>` +
      `「ねえ、知ってる？ この街には、六十年に一度、<b>どんな願いでも叶える杯</b>が現れるんだって」<br>郷土史の片隅の、おとぎ話のような記述。けれど${friendName()}の目は、本気だった。<br>「もし本当なら――${frWish().wish}って、願えるのに」`,
    choices: [
      { label: '「……あの時は、ごめん」と先に謝る', hint: '友情↑↑・わだかまりが解ける', cond: () => !!G.flags.frRift, run: () => { friend(20); G.flags.frRift = false; G.flags.frMended = true; return `${friendName()}は目を丸くして、それから泣き笑いの顔になった。「……ずるいよ。わたしが先に謝ろうと思ってたのに」`; } },
      { label: '「そんな話、信じちゃだめだ」', hint: '友情↓', run: () => { friend(-5); G.flags.frWarned = true; return `「……分かってるよ。言ってみただけ」${friendName()}は本を閉じた。けれど、その本は返却されないまま、${friendName()}の鞄の中にあった。`; } },
      { label: '「もし本当にあるなら、一緒に探そう」', hint: '友情↑', run: () => { friend(10); G.flags.frGrailHope = true; lore(1); return `「ほんと？」${friendName()}の顔が、ぱっと明るくなった。その日から、二人で街の古い言い伝えを調べ始めた。`; } },
      { label: '「願いは、自分の手で叶えるものだよ」', hint: '友情↑・精神↑', run: () => { friend(5); gain('spi', 3); return `${friendName()}はしばらく黙っていた。「……そうだね。そうだと、いいね」（精神+3）`; } },
    ] },
  { id: 'fr_promise', age: 17, title: '冬の前の約束',
    text: () => `冬の初め。城跡公園の桜の木は、すっかり葉を落としていた。<br>${friendName()}が、白い息を吐きながら言った。<br>「ねえ。もしも、いつか――わたしが、間違ったことをしようとしたら」<br>「……止めてくれる？ それとも、味方でいてくれる？」`,
    choices: [
      { label: '「止める。何があっても」', hint: '秩序', run: () => { tone('law'); friend(5); G.flags.frStop = true; return `「……うん。あなたなら、そう言うと思った」${friendName()}は、少しだけ安心したように笑った。`; } },
      { label: '「味方でいる。何があっても」', hint: '友情↑', run: () => { friend(10); G.flags.frSide = true; return `「……ばか。そういうところ、昔から変わらないね」${friendName()}は、あなたの肩に額を押し当てた。`; } },
      { label: '「その時は、一緒に考えよう」', hint: '友情↑・知力↑', run: () => { friend(5); gain('int', 2); G.flags.frTogether = true; return `「一緒に、か」${friendName()}は空を見上げた。「……それ、いちばん難しい答えだよ」（知力+2）`; } },
    ] },
];
function friendCheck(then) {
  if (!frNormal()) return then();
  const ev = FRIEND_GROWTH.find(e => e.age === G.master.age && !G.used[e.id]);
  if (!ev) return then();
  fr();
  showEvent({ ...ev, chapter: `幼馴染・${G.master.age}歳` }, then);
}

// =============================================================
//  聖杯戦争：幼馴染の物語（STORY に加える）
// =============================================================
// 再会（3日目）の文章を、幼馴染の願いに合わせて書き換える
function frReunionText(r) {
  return `「……やっぱり、あなたもだったんだ」<br>城跡公園の、あの桜の木の下。待っていたのは${friendName()}だった。手袋を外したその手の甲に、<b>令呪</b>が刻まれている。<br>背後に、${r.cls}のサーヴァントが静かに控えていた。` +
    `<p class="quote">「${r.quote}」</p>` + `「わたしには、叶えたい願いがある。――${frWish().wish}。そのためなら、何だってする」`;
}
// 襲撃者：幼馴染以外で、戦える陣営
function frAttacker() { const c = engageable().filter(r => !r.friend); return c.length ? c.reduce((a, b) => (a.aggr >= b.aggr ? a : b)) : null; }

STORY.push(
  // ---- 5日目の夜：友の危機 ----
  { id: 'fr_rescue', phase: 'war', day: 5, slot: 1, after: 'advance',
    cond: () => frNormal() && frAlive() && !!frAttacker() && !G.flags.frBetrayed,
    title: '友の危機',
    text: () => { const a = G.tmpRival = frAttacker(); const r = frRival();
      return `深夜。${SV()}が、鋭く顔を上げた。${say('warnShadow')}<br>旧城下町の方角――${friendName()}の拠点がある辺りで、魔力がぶつかり合っている。<br>使い魔の目に映ったのは、${rivalLabel(a)}陣営に追い詰められていく${r.cls}のサーヴァントと、その後ろで必死に令呪を握りしめる${friendName()}の姿だった。<br><span class="note">このままでは、${friendName()}の陣営は落ちる。</span>`; },
    choices: [
      { label: () => `「${SV()}、行くぞ！」助けに飛び込む`, hint: '戦闘（奇襲）・友情↑↑', run: () => {
          const a = G.tmpRival; const r = frRival(); friend(20); G.flags.frRescued = true; tone('good');
          if (!r.ally && G.friend.bond >= 40) { r.ally = true; r.intel = 3; addLog(`幼馴染・${G.friend.name}と、助け合う約束をする。`); }
          return { text: [`考えるより先に、体が動いていた。`, `「${friendName()}、下がって！」<br>${SV()}が、${rivalLabel(a)}の死角へ躍り込む。`, r.ally ? `<span class="note">${friendName()}の陣営と、手を取り合うことになった。（同盟）</span>` : ''], then: () => startBattle(a, { ambush: true }) };
        } },
      { label: '令呪を使い、一瞬で割って入らせる', hint: '令呪-1・戦わずに救う・友情↑↑', cond: () => G.master.seals > 0, run: () => {
          const a = G.tmpRival; const r = frRival(); G.master.seals--; friend(25); G.flags.frRescued = true; tone('good');
          a.hp = Math.max(10, a.hp - 30); a.intel = Math.max(a.intel, 2); if (!r.ally && G.friend.bond >= 40) { r.ally = true; r.intel = 3; }
          addLog('令呪で幼馴染を救う。');
          return [`<b>「令呪をもって命ずる――${friendName()}を守れ！」</b>`, `${SV()}の姿が掻き消え、次の瞬間、${rivalLabel(a)}の一撃を受け止めていた。不意を突かれた敵は、深手を負って退いていく。（敵HP-30・敵の拠点が判明）`,
            `${friendName()}は、震える手であなたの袖を掴んだ。「……どうして。わたしたち、敵同士なのに」`];
        } },
      { label: '見届ける。弱ったところを、後で叩けばいい', hint: '悪・混沌・友情↓↓↓・敵の情報', run: () => {
          const a = G.tmpRival; const r = frRival(); tone('evil'); tone('chaos'); friend(-40); G.flags.frAbandoned = true;
          r.alive = false; r.hp = 0; a.hp = Math.max(10, a.hp - 40); a.intel = Math.max(a.intel, 2); a.clues = (a.clues || 0) + 2;
          addLog(`幼馴染・${G.friend.name}の陣営が倒れるのを、見届ける。`);
          return [`あなたは動かなかった。`, `${r.cls}のサーヴァントが光の粒になって消えていく。${friendName()}が、こちらの方角を見た気がした。――気づいていたのかもしれない。`,
            `${friendName()}は生き延びた。けれど、その願いは、この夜に潰えた。`, `<span class="note">${rivalLabel(a)}陣営は手負いになり、拠点も割れた。……勝つためには、正しい選択だったはずだ。</span>`];
        } },
    ] },
  // ---- 7日目の昼：病室 ----
  { id: 'fr_hospital', phase: 'war', day: 7, slot: 0, after: 'hub',
    cond: () => frNormal() && frSafe() && !!G.used.s_friend && !G.flags.frAbandoned && !G.flags.frBetrayed,
    title: '病室',
    text: () => `${friendName()}から呼び出されたのは、市立病院だった。<br>${frWish().worse}。<br>${fr().wish === 'self' ? '病室のベッドの上で' : '病室の前の長椅子で'}、${friendName()}は小さく笑った。<br>` +
      `「ねえ。お願いがあるの。……もし、あなたが聖杯を手にしたら。<b>わたしの願いを、叶えてくれない？</b>」`,
    choices: [
      { label: '「約束する。聖杯は、君の願いのために使う」', hint: '善・自分の願いを手放す・友情↑↑', run: () => { tone('good'); friend(15); G.flags.frGrailPromise = true; addLog(`幼馴染に、聖杯を譲ると約束する。`);
          return [`${friendName()}は、声を上げて泣いた。「ありがとう……ありがとう……」`, `<span class="note">自分の願い「${masterWish()}」は、もう叶わないかもしれない。それでも――。</span>`]; } },
      { label: '「……ごめん。私にも、譲れない願いがある」', hint: '友情↓', run: () => { friend(-10); G.flags.frRefused = true;
          return `「……そっか。そうだよね」${friendName()}は、それ以上何も言わなかった。窓の外で、雪が降り始めていた。`; } },
      { label: '「聖杯以外の道を、一緒に探そう」', hint: '知力判定・友情↑', run: () => { friend(5); const c = chk('int', 58);
          if (c.ok) { G.flags.frOtherWay = true; return [c.text, `二人で、医学と魔術の両方の資料を夜通し調べた。明け方、一つだけ、細い糸のような可能性が見つかった。<br>「……聖杯がなくても、まだ、終わりじゃないんだね」`]; }
          return [c.text, `夜通し調べても、何も見つからなかった。${friendName()}は「ありがとう。気持ちだけで、十分」と笑った。その笑顔が、痛かった。`]; } },
      { label: '「聖杯は、呪われている」と真実を告げる', hint: '聖杯の真実を知っている時のみ', cond: () => !!G.flags.grailTruth, run: () => {
          if (G.friend.bond >= 60) { G.flags.frKnowsTruth = true; friend(5); return `${friendName()}は長いあいだ黙っていた。「……あなたが言うなら、本当なんだね」<br>その声は、静かに震えていた。「じゃあ、わたしは何のために、ここまで――」`; }
          friend(-15); G.flags.frDenial = true; return `「嘘だ」${friendName()}は、あなたを睨んだ。「あなたは、聖杯を独り占めしたいだけでしょ！」<br>病室の扉が、強く閉ざされた。`;
        } },
    ] },
  // ---- 10日目の夜：堕ちる友 ----
  { id: 'fr_fall', phase: 'war', day: 10, slot: 1, after: 'advance',
    cond: () => frNormal() && frAlive() && !G.flags.frKnowsTruth && !G.flags.frOtherWay,
    title: '堕ちる友',
    text: () => { const r = frRival();
      return `${frWish().worse.replace(/。$/, '')}――あの知らせから、${friendName()}は変わってしまった。<br>深夜の病院の裏手。眠る人々の窓の下で、${r.cls}のサーヴァントが、生命力を吸い上げていた。<b>魂喰い</b>だ。<br>その傍らで、${friendName()}が振り返った。目の下には、深い隈が刻まれている。<br>` +
        `「……見ないで。お願い。あと少し、あと少しで勝てるの。勝たなきゃ、${fr().wish === 'self' ? 'わたしが' : frWish().who + 'が'}――」` +
        (soulOn() ? `<br>「あなただって、やってるくせに。……分かってるんだよ」` : '') +
        (G.flags.frStop ? `<br><span class="note">――「止めてくれる？」あの冬の日の声が、耳の奥で響いた。</span>` : G.flags.frSide ? `<br><span class="note">――「味方でいる。何があっても」あの冬の日に、あなたはそう答えた。</span>` : ''); },
    choices: [
      { label: '「止める。戦ってでも」', hint: '戦闘（一騎打ち）', run: () => { const r = frRival(); G.flags.frStopped = true; if (G.flags.frStop) friend(10); else friend(-5); tone('law');
          if (r.ally) r.ally = false;
          return { text: [`「……約束、したから」`, `${friendName()}の顔が、くしゃりと歪んだ。「……そうだったね」<br>${r.cls}のサーヴァントが、主を守るように前へ出る。`], then: () => startBattle(r, { duel: true }) }; } },
      { label: '見なかったことにする', hint: '混沌・悪・友の罪に目をつぶる', run: () => { const r = frRival(); tone('chaos'); tone('evil'); G.flags.frBlind = true;
          if (G.flags.frSide) friend(10); r.power += 2; r.hp = r.hpMax; r.mp = 100;
          return [`あなたは、黙って背を向けた。`, `背後で、${friendName()}が小さく「ごめんね」と言った。`, `<span class="note">翌朝、眠り病の被害者がまた増えたと、ニュースが報じていた。${friendName()}の陣営は、力を増している。</span>`]; } },
      { label: '教会に告げる', hint: '秩序・友情↓↓↓', run: () => { const r = frRival(); tone('law'); friend(-40); G.flags.frBetrayed = true; r.bounty = true; r.ally = false; r.intel = 3;
          addLog(`幼馴染・${G.friend.name}の魂喰いを、教会に告げる。`);
          return [`${CAST.sister}は短く「分かりました」とだけ言った。翌日、${friendName()}の陣営に討伐令が出た。`,
            `その夜、一通だけメッセージが届いた。<br>「信じてたのに」`, `<span class="note">${friendName()}の陣営を討てば、令呪が一画与えられる。</span>`]; } },
    ] },
);

// =============================================================
//  昼の行動：幼馴染に会いに行く
// =============================================================
function friendVisitable() { return frNormal() && G.phase === 'war' && !!G.used.s_friend && frSafe() && !G.flags.frBetrayed && !G.flags.frAbandoned; }
function friendVisit() {
  actResult('幼馴染', () => {
    const r = frRival(); const n = friendName(); friend(6); gain('spi', 2);
    const lines = !r.alive ? [`${n}の家を訪ねた。もう戦いから降りた${n}は、少し痩せていたけれど、笑って迎えてくれた。「……生きて帰ってきてね。約束だよ」`,
      `${n}と二人で、城跡公園の桜の木を見に行った。まだ固い蕾を見上げて、${n}が言った。「春になったら、また一緒に見よう」`]
      : r.ally ? [`${n}の拠点で、作戦会議という名目のお茶会をした。${SV()}と${r.cls}のサーヴァントが、無言で睨み合っている。二人で、こっそり笑った。`,
        `${n}が、${frWish().who === '自分自身' ? '薬の時間の合間に' : '病院の帰りに'}立ち寄ってくれた。「同盟相手の様子を見に来ただけ」と言いながら、手作りのお弁当を置いていった。`]
      : [`休戦の白い布を掲げて、${n}と城跡公園で会った。サーヴァントは遠くに待たせて、二人きりで、昔の話をした。`,
        `敵同士だと分かっていても、${n}からのメッセージは途切れなかった。「ちゃんと食べてる？」――それだけの言葉が、妙に嬉しかった。`];
    return [pick(lines), `<span class="note">（幼馴染との友情+6・精神+2）</span>`];
  });
}

// =============================================================
//  決着：最後の敵が幼馴染のとき（ending.js の finalBattleIntro から）
// =============================================================
function friendFinalChoices(r) {
  const n = friendName(); const out = [];
  out.push({ label: `聖杯を、${n}に譲る`, hint: '戦わずに降りる・自分の願いを手放す', cls: 'danger', fn: () => {
    r.ally = false; addLog(`聖杯を幼馴染・${G.friend.name}に譲る。`);
    next('譲る', paras([`あなたは、${SV()}を振り返った。${SV()}は、何も言わずに頷いた。`, `「${n}。――聖杯は、君が使って」`, `${n}は、その場に崩れ落ちるように泣いた。`]),
      () => ending(isCursed() ? 'friendRuin' : 'yield'), '見届ける');
  } });
  if (G.flags.frKnowsTruth && G.flags.grailTruth) out.push({ label: '「二人で、聖杯を壊そう」', hint: '真実を分かち合っている時のみ', cls: 'primary', fn: () => {
    r.alive = false; r.hp = 0; G.flags.friendSaved = true; addLog(`幼馴染・${G.friend.name}と、聖杯を壊すと決める。`);
    next('二人で', paras([`${n}は、長いあいだ杯を見上げていた。そして、令呪の刻まれた右手を下ろした。`, `「……うん。あんなものに、${frWish().who === '自分自身' ? 'わたしの命' : frWish().who}を預けたくない」`, `${r.cls}のサーヴァントは、主の決意を見届けるように、静かに霊体化していった。`]),
      victoryScene, '杯の前へ');
  } });
  return out;
}
function friendFinalQuote(r) {
  if (G.flags.frBetrayed) return '……ここで終わらせよう。あなたにだけは、負けたくない。';
  if (G.flags.frBlind) return 'ありがとう、黙っていてくれて。……でも、ここは譲れないの。';
  if (G.flags.frGrailPromise) return 'あなたは約束してくれた。でも――あなたの手を汚させたくない。だから、わたしが勝つ。';
  if (G.flags.frRescued) return 'あの夜、助けてくれてありがとう。……だからこそ、全力でいくね。';
  return `${frWish().wish}。――ごめんね。それでも、わたしは勝ちたい。`;
}

// =============================================================
//  結末
// =============================================================
// 聖杯の前で：幼馴染の願いを叶える（友が無事で、真実を知らないか、聖杯が正しいとき）
function friendWishChoice() {
  if (!frNormal() || !frSafe() || G.flags.frBetrayed || G.flags.frAbandoned) return null;
  if (!G.flags.frGrailPromise && G.friend.bond < 60) return null;
  if (G.flags.grailTruth && isCursed()) return null;
  return { label: `${friendName()}の願いを叶える`, hint: `「${frWish().wish}」${G.flags.frGrailPromise ? '・約束を果たす' : ''}`, fn: () => ending(isCursed() ? 'friendRuin' : 'friendWish') };
}
function friendEndingTexts(sv) {
  if (!G.friend) return {};   // 幼馴染のいないシナリオ（藤丸・岸波・士郎など）
  const n = friendName(); const w = frWish();
  return {
    friendWish: () => ({ title: '終幕：友の願い', text: [`<p>「${w.wish}」</p>`, `<p>それは、あなたの願いではなかった。けれど、聖杯は静かに願いを聞き届けた。</p>`, `<p>${w.healed}</p>`,
      `<p>${sv.short}は、光の中で微笑んだ。「……君らしい願いだ」</p>`, `<p class="quote">${farewellLine(sv)}</p>`,
      `<p>自分の願い「${masterWish()}」は、叶わなかった。それでも――城跡公園の桜が咲いた日、${n}が隣で泣きながら笑っていた。それで、十分だった。</p>`] }),
    yield: () => ({ title: '終幕：譲られた杯', text: [`<p>あなたは戦わなかった。天降山の頂で、聖杯は${n}の手に渡った。</p>`, `<p>${w.healed}</p>`,
      `<p>${sv.short}は、戦わずに終わったことを責めなかった。</p>`, `<p class="quote">${farewellLine(sv)}</p>`,
      `<p>勝者にはなれなかった。けれど、あの冬、あなたはたった一人の友を、勝たせた。</p>`] }),
    friendRuin: () => ({ title: '終幕：友の願いの代償', text: [`<p>「${w.wish}」――聖杯は、その願いを聞き届けた。……最悪の形で。</p>`,
      `<p>溢れ出した黒い泥が、天降山から街へと流れ下っていく。${w.healed.replace(/。[^。]*$/, '。')}――けれど、その代わりに、街の多くのものが失われた。</p>`,
      `<p>${n}は、自分の願いが何を引き起こしたのかを知ってしまった。その日から、${n}は笑わなくなった。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`, '<p class="note">ヒント：この街の聖杯には秘密がある。真実を知っていれば、別の選び方ができたかもしれない。</p>'] }),
  };
}
// 結末ごとの後日談（ending.js の friendEpilogue を置き換える）
function friendEpilogueText(kind) {
  if (!G.friend || !G.rivals.length || kind === 'dead') return '';
  const r = frRival(); const n = friendName(); if (!r) return '';
  if (['friendWish', 'yield', 'friendRuin'].includes(kind)) return '';
  const w = frWish();
  const fate = G.flags.frOtherWay ? `あの夜に見つけた細い糸を、二人で手繰り続けた。${w.short}は、少しずつ、前に進み始めている。`
    : `聖杯の奇跡は、${n}には訪れなかった。${fr().wish === 'self' ? `残された時間を、${n}は笑って生きると決めた。` : `それでも${n}は、${w.who}のそばに居続けている。`}`;
  if (r.killed) return `<p class="note">${n}の家の前を通るたび、あなたは足を止める。もう、あの笑顔が迎えてくれることはない。</p>`;
  if (G.flags.frBetrayed) return `<p class="note">${n}とは、あれから一度も会っていない。春、城跡公園の桜の木の下に、二人で埋めたビー玉が掘り返されていた。</p>`;
  if (G.flags.frAbandoned) return `<p class="note">${n}は、あの夜のことを一度も口にしなかった。だから、あなたも謝れないままでいる。${fate}</p>`;
  if (G.flags.friendSaved) return `<p class="note">春。${n}と並んで、城跡公園の桜を見上げた。「約束、守ってくれたね」${fate}</p>`;
  if (G.flags.friendDefeated) return `<p class="note">戦いの後、${n}から一通のメッセージが届いた。「おかえり。……止めてくれて、ありがとう」${fate}</p>`;
  if (G.flags.frBlind) return `<p class="note">${n}の罪を、あなたは誰にも話していない。二人だけの秘密は、春になっても溶けなかった。${fate}</p>`;
  if (r.alive && r.ally) return `<p class="note">${n}は最後まで、あなたの味方でいてくれた。春、二人で城跡公園を歩きながら、あの冬の話を少しだけした。${fate}</p>`;
  return `<p class="note">${n}も、あの冬を生きて越えた。「お互い、しぶといね」――そう言って笑う顔は、昔のままだった。${fate}</p>`;
}
