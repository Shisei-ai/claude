// =============================================================
//  data_friend.js … 幼馴染の物語
//
//  幼馴染は、6歳の「幼馴染」の出来事で出会う（通常のシナリオのみ）。
//  幼馴染には、どうしても叶えたい切実な願いがある（自分の体の中で暴れ出す魔術回路――生きたい、という願い。幼馴染ルート「願い桜」の真相に繋がる）。
//
//  ・生い立ち：9・12・14・16・17歳の節目に、幼馴染との出来事が起きる（関係を築き、願いの根が明かされる）
//  ・聖杯戦争：幼馴染もマスターとして参戦している。3日目に再会し、その後も苦しい選択が続く
//      5日目の夜「友の危機」 … 襲われる幼馴染を、助けるか、見捨てて漁夫の利を得るか
//      7日目の昼「病室」     … 聖杯を幼馴染の願いのために使うと約束するか。真実を告げるか
//      10日目の夜「堕ちる友」 … 追い詰められた幼馴染が魂喰いに手を染める。止めるか、見逃すか、教会に告げるか
//      最後の敵が幼馴染なら … 討つか、聖杯を譲るか、（真実を共有していれば）二人で聖杯を壊すか
//      聖杯の前で           … 自分の願いか、幼馴染の願いか
//  ・関係：関係値（-100〜100）で「恋人」「親友」「幼馴染」「絶縁」が決まる
//      60以上 … 「恋人」か「親友」になる機会が訪れる（選ばずに、今のままでいることもできる）
//      -30以下 … 「絶縁」を突き付けられる（恋人・親友でも）
//      絶縁のあと、関係値が10以上に戻れば「雪解け」で幼馴染に戻れる
//      関係によって、再会・危機・病室・魂喰い・決着・結末の展開と台詞が変わる
//  ・関係が育っていれば（恋人・親友、または関係値50以上）、9日目に幼馴染の異変を察知し、
//    話を聞いて説得できれば、魂喰い（10日目「堕ちる友」）をそもそもさせずに済む
//  ・昼の行動「幼馴染に会いに行く」で、戦いの最中にも関係を深められる
//  ・結末：エンディング「友の願い」「譲られた杯」「友の願いの代償」と、結末ごとの後日談
// =============================================================

const FRIEND_SIS = ['ひなた', '菜々', '美羽', '小雪'];
// 幼馴染の情報（古いセーブにも、足りない項目を補う）
function fr() {
  const f = G.friend; if (!f) return null;
  f.wish = 'self';   // 幼馴染の願いは「自分の、暴れ出す魔術回路」に固定（幼馴染ルート：桜守の血と、願い桜に繋がる回路。data_sakura.js）
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
    self: { who: '自分自身', ill: `${friendName()}の体の中で、魔術回路が少しずつ暴れ出している。医者にも魔術師にも、治せない`, worse: `${friendName()}が血を吐いて倒れた。回路の暴走は、もう薬では抑えきれなくなっているらしい`,
      wish: '生きたい。普通に、大人になりたい', short: '生きること', healed: `${friendName()}の体を蝕んでいた熱が、嘘のように引いていった。「……生きてて、いいんだね」` },
  }[f.wish];
}
// 幼馴染の性別：必ずプレイヤーと異性（性別を指定しない場合は、出会った時に決まる）
function frGender() { const f = G.friend; if (!f) return 'f'; if (!f.gender) f.gender = gender() === 'm' ? 'f' : gender() === 'f' ? 'm' : pick(['m', 'f']); return f.gender; }
const fg = (m, f) => (frGender() === 'm' ? m : f);   // 幼馴染の性別で言い方を変える（男, 女）
const fI = () => fg('俺', 'わたし');                  // 幼馴染の一人称
const fYou = () => fg('お前', 'あなた');               // 幼馴染から見た、プレイヤーの呼び方
function frRival() { return (G.rivals || []).find(r => r.friend); }
function frAlive() { const r = frRival(); return !!(r && r.alive); }          // 幼馴染の陣営が、まだ戦いに残っている
function frSafe() { const r = frRival(); return !!(r && !r.killed); }          // 幼馴染本人が無事
function frNormal() { return !!G.friend && !isFuji() && !isKishi() && !isShirou(); }

// ---- 関係（恋人・親友・幼馴染・絶縁） ----
const FR_REL = { lover: '恋人', best: '親友', friend: '幼馴染', cut: '絶縁' };
const FR_UP = 60, FR_CUT = -30, FR_MEND = 10;
function frRel() { return G.friend ? G.friend.rel || 'friend' : null; }
function frRelName() { return FR_REL[frRel()] || ''; }
function frCut() { return frRel() === 'cut'; }
function frLover() { return frRel() === 'lover'; }
function frClose() { return frRel() === 'lover' || frRel() === 'best'; }
function frSetRel(rel, why) { const before = frRelName(); G.friend.rel = rel; addLog(`幼馴染・${G.friend.name}との関係：${before} → ${FR_REL[rel]}${why ? `（${why}）` : ''}`); }
// 関係が切り替わる出来事が必要か：'cut'（絶縁を突き付けられる）・'mend'（雪解け）・'choose'（恋人か親友かを選ぶ機会）
function frRelPending() {
  if (!frNormal()) return null; const f = fr(); const rel = frRel();
  if (G.phase === 'growth' && G.master.age < 12) return null;
  if (rel !== 'cut' && f.bond <= FR_CUT) return 'cut';
  if (rel === 'cut' && f.bond >= FR_MEND) return 'mend';
  if (rel === 'friend' && f.bond >= Math.max(FR_UP, G.flags.frRelNext || 0) && (G.phase !== 'growth' || G.master.age >= 14)) return 'choose';
  return null;
}
function frRelCheck(then) { const k = frRelPending(); if (!k) return then(); frRelScene(k, then); }
function frRelScene(kind, then) {
  const n = friendName(); const war = G.phase === 'war'; const svLover = typeof otherLover === 'function' ? otherLover('friend') : (G.servant && G.servant.special === 'lover' ? SV() : null);   // ほかのヒロイン（英霊・雫）と恋人なら、想いは伝えられない
  const done = (title, lines) => { NOTES = []; next(title, paras([...lines, ...takeNotes()]), then); };
  if (kind === 'cut') {
    const was = frRel();
    const why = G.flags.frBetrayed ? '「信じてたのに」――あの夜のメッセージが、最後の言葉だった。' : G.flags.frAbandoned ? 'あの夜、あなたが動かなかったことを、' + n + 'は知っていた。' : '積み重なったすれ違いが、もう埋められないところまで来ていた。';
    return scene({ title: '絶縁', sub: war ? 'WAR' : `${G.master.age}歳`, reveal: true, body: paras([
      war ? `${n}から、短いメッセージが届いた。` : `${n}は、城跡公園の桜の木の下で待っていた。`,
      `<p class="quote">「${was === 'lover' ? fg('もう、終わりにしよう。……恋人ごっこは、もう終わりだ。', 'もう、終わりにしよう。……恋人ごっこは、おしまい。') : was === 'best' ? fg('親友だって、思ってた。……俺だけだったんだな。', '親友だって、思ってた。……わたしだけだったんだね。') : fg('もう、俺に関わるな。', 'もう、わたしに関わらないで。')}${fYou()}とは、もう何の関係もない」</p>`,
      why, `<span class="note">${n}との関係が<b>「絶縁」</b>になった。（${FR_REL[was]} → 絶縁）</span>`]), choices: [
      { label: '「……分かった」', fn: () => { frSetRel('cut', '突き付けられた'); done('絶縁', [`${n}は、一度も振り返らなかった。`]); } },
      { label: '「それでも、待ってる」', fn: () => { frSetRel('cut', '突き付けられた'); G.flags.frWaiting = true; done('絶縁', [`${n}の足が、一瞬だけ止まった。けれど、何も言わずに去っていった。`, '<span class="note">いつか関係を修復できれば、雪解けの日が来るかもしれない。</span>']); } },
    ] });
  }
  if (kind === 'mend') {
    return scene({ title: '雪解け', sub: war ? 'WAR' : `${G.master.age}歳`, reveal: true, body: paras([
      `${war ? '夜更け' : '放課後'}、城跡公園の桜の木の下に、${n}が立っていた。`,
      `<p class="quote">「……${G.flags.frWaiting ? fg('「待ってる」なんて言うから。本当に、待たせちまったな', '「待ってる」なんて言うから。本当に、待たせちゃったね') : 'ずっと、意地を張ってた'}。${fg('悪かった', 'ごめん')}」</p>`,
      `<span class="note">${n}との関係が<b>「幼馴染」</b>に戻った。</span>`]), choices: [
      { label: '「おかえり」', fn: () => { frSetRel('friend', '雪解け'); friend(5); done('雪解け', [`${n}は、昔と同じ顔で、泣きながら笑った。`]); } },
    ] });
  }
  // choose：恋人か親友か（続いていく会話は data_dialog.js）
  if (typeof friendConfession === 'function') return friendConfession(then);
  const heart = !!G.flags.friendHeart;
  const choices = [];
  choices.push(svLover
    ? { label: '想いを伝える', hint: `心はもう、${svLover}に向いている`, disabled: true, fn: () => {} }
    : { label: heart ? '「あの日の答え、ちゃんと言わせて」' : '想いを伝える', hint: '関係：恋人', fn: () => { frSetRel('lover'); friend(10); done('想い', [
        `「好きだ」――その一言を言うのに、ずいぶん遠回りをした。`, fg(`${n}は真っ赤になって目を逸らし、それから、あなたの手を強く握った。「……遅えよ、ばか。俺から言おうと思ってたのに」`, `${n}は真っ赤になって、それから、あなたの胸に額を押し当てた。「……遅いよ、ばか」`),
        `<span class="note">${n}と<b>「恋人」</b>になった。</span>`]); } });
  choices.push({ label: '「ずっと、親友でいよう」', hint: '関係：親友', fn: () => { frSetRel('best'); friend(5); done('約束', [
    `${n}は少しだけ目を瞬かせて、それから拳を突き出した。「${fg('……おう。一生、親友だからな', '……うん。一生、親友だからね')}」`, '二人の拳が、こつんとぶつかった。', `<span class="note">${n}と<b>「親友」</b>になった。</span>`]); } });
  choices.push({ label: '今の関係のままでいる', hint: '関係：幼馴染', fn: () => { G.flags.frRelNext = G.friend.bond + 15; done('いつも通り', [`言いかけた言葉を、飲み込んだ。${n}は「なに？」と首を傾げて、いつも通りに笑った。`, '<span class="note">さらに関係が深まれば、また機会が訪れるだろう。</span>']); } });
  scene({ title: war ? '冬の夜に' : '二人の距離', sub: war ? 'WAR' : `${G.master.age}歳`, reveal: true, body: paras([
    war ? `戦いの合間の、静かな夜。${n}が、あなたの隣に腰を下ろした。「……こんな時なのに、${fYou()}といると、ほっとする」`
      : `${G.master.age}歳の冬。帰り道、${n}がふと立ち止まった。夕焼けが、二人の影を長く伸ばしている。`,
    `<p class="quote">「${fg('なあ。俺たちって……何なんだろうな', 'ねえ。わたしたちって……何なんだろうね')}」</p>`, 'あなたは――']), choices });
}

// =============================================================
//  生い立ち：節目ごとの出来事（growth.js から、節目の最後に呼ぶ）
// =============================================================
const FRIEND_GROWTH = [
  { id: 'fr_sakura', age: 9, title: '桜の木の下で',
    text: () => `城跡公園のいちばん大きな桜の木の下が、いつの間にか${friendName()}とあなたの「秘密の場所」になっていた。<br>` +
      (fr().wish === 'sister' ? `今日の${friendName()}は、小さな妹の${fr().sis}ちゃんを連れてきていた。「この子、体が弱いんだ。だから、${fg('俺が守るんだ', 'わたしが守るの')}」<br>${fr().sis}ちゃんが花びらを追いかけて走り回るのを眺めながら、${friendName()}が言った。` :
       fr().wish === 'mother' ? `${friendName()}のお母さんが、二人分のおにぎりを持たせてくれた。「あの人、料理だけは上手なんだよ」と${friendName()}は照れくさそうに笑う。<br>おにぎりを食べ終えると、${friendName()}は満開の枝を見上げて言った。` :
       `${friendName()}は木のいちばん低い枝に腰かけて、足をぶらぶらさせていた。花びらが一枚、その髪に落ちた。<br>${friendName()}は、枝の上からあなたを見下ろして言った。`) +
      `<p class="quote">「${fg('なあ。この木の下、俺たちだけの場所にしようぜ。……来年も、ここに来てくれるか？', 'ねえ。この木の下、わたしたちだけの場所にしようよ。……来年も、ここに来てくれる？')}」</p>`,
    choices: [
      { label: '「大人になっても、毎年ここで桜を見よう」', hint: '友情↑↑', run: () => { friend(15); G.flags.frSakura = true; return `${friendName()}は小指を差し出した。「${fg('約束な。破ったら、針千本だからな', '約束ね。破ったら、針千本だから')}」<br>二人の小指が、花びらの下で絡まった。`; } },
      { label: '「……別に、ここじゃなくてもいいよ」と素っ気なく返す', hint: '関係↓・知力↑', run: () => { friend(-10); gain('int', 2); return `${friendName()}は少しだけ寂しそうな顔をして、「……そっか」と枝から飛び降りた。（知力+2）`; } },
      { label: '「うん。ここを、二人の秘密基地にしよう」', hint: '友情↑・幸運↑', run: () => { friend(10); gain('luk', 3); return '段ボールとブルーシートで、小さな基地ができた。雨が降るたびに潰れて、そのたびに二人で作り直した。（幸運+3）'; } },
      { label: '「来年も来る！ ……その前に、てっぺんまで競争だ！」', hint: '友情↑・体力↑', run: () => { friend(10); gain('phy', 3); G.flags.friendRival = true; return `二人とも途中で降りられなくなり、公園の管理人さんにこっぴどく叱られた。帰り道、${friendName()}はずっと笑っていた。（体力+3）`; } },
    ] },
  { id: 'fr_shadow', age: 12, title: '影',
    text: () => (fr().wish === 'sister' ? `学校の帰り道、${friendName()}の携帯が鳴った。${fr().sis}ちゃんが、また倒れたらしい。<br>病院の廊下で、${friendName()}は膝を抱えて座り込んでいた。「……あの子の心臓、治らないんだって」` :
       fr().wish === 'mother' ? `その知らせは、突然だった。${friendName()}のお母さんが、交通事故に遭った。命は助かった。けれど――目を覚まさない。<br>病院の待合室で、${friendName()}は一言も喋らなかった。` :
       `その春、${friendName()}のおばあさんが亡くなった。葬儀から一月ほど経ったある日、体育の授業中に、${friendName()}が倒れた。救急車の中で、その手は火傷しそうなほど熱かった。<br>検査の結果は「原因不明」。それから${friendName()}は、時々、ひどい熱を出すようになった。`),
    choices: [
      { label: '毎日、病院に通う', hint: '友情↑↑・精神↑', run: () => { friend(20); gain('spi', 3); G.flags.frStayed = true; return `何を話すでもなく、ただ隣に座った。ある日、${friendName()}がぽつりと言った。「……来てくれて、ありがと」（精神+3）`; } },
      { label: '「大丈夫。きっと良くなる」と励ます', hint: '友情↑・交渉↑', run: () => { friend(10); gain('cha', 3); return `${friendName()}は無理に笑って頷いた。その笑顔が、少しだけ痛かった。（交渉+3）`; } },
      { label: 'どう接していいか分からず、距離を置いてしまう', hint: '関係↓・知力↑', run: () => { friend(-15); gain('int', 3); G.flags.frDistance = true; return `声をかけようとして、何度もやめた。気づけば、${friendName()}とは廊下ですれ違うだけになっていた。（知力+3）`; } },
    ] },
  { id: 'fr_quarrel', age: 14, title: 'すれ違い',
    text: () => `${G.flags.frDistance ? 'しばらく疎遠だった' : 'いつものように隣を歩いていた'}${friendName()}が、ふいに立ち止まった。<br>` +
      `「……${fYou()}には分からないよ。${birthOf().magic ? '立派な家があって、特別な力まであって' : '家族がみんな元気で、何の心配もなくて'}。${fI()}の気持ちなんて、分かるわけない！」<br>${frWish().ill}。その重さが、${friendName()}を少しずつ押し潰していた。`,
    choices: [
      { label: '「そっちこそ、勝手なことばかり！」と言い返す', hint: '関係↓・精神↑', run: () => { friend(-20); gain('spi', 3); G.flags.frRift = true; return `言ってはいけない言葉を、お互いにぶつけた。その日から、二人は口をきかなくなった。（精神+3）`; } },
      { label: '「もう知らない。勝手にすれば」と突き放す', hint: '関係↓↓↓', run: () => { friend(-35); G.flags.frRift = true; G.flags.frSpurned = true; return `${friendName()}の顔から、表情が消えた。「……そっか」<br>それきり、${friendName()}はあなたの前で笑わなくなった。`; } },
      { label: '何も言わず、隣に座り続ける', hint: '友情↑↑・精神↑', run: () => { friend(15); gain('spi', 4); return `日が暮れるまで、二人で黙って座っていた。やがて${friendName()}は、声を殺して泣き出した。あなたは、その背中にそっと手を置いた。（精神+4）`; } },
      { label: '「分からない。だから、教えてほしい」', hint: '友情↑・交渉↑・知力↑', run: () => { friend(10); gain('cha', 3); gain('int', 2); return `${friendName()}は驚いた顔をして、それから、ずっと言えなかったことを少しずつ話してくれた。（交渉+3 知力+2）`; } },
    ] },
  { id: 'fr_legend', age: 16, title: '杯の伝説', cond: () => !frCut(),
    text: () => `${G.flags.frRift ? `あの喧嘩から二年。久しぶりに、${friendName()}から声をかけてきた。` : `放課後の図書室で、${friendName()}が古い本を広げていた。`}<br>` +
      `「${fg('なあ、知ってるか？', 'ねえ、知ってる？')} この街には、六十年に一度、<b>どんな願いでも叶える杯</b>が現れるんだって」<br>郷土史の片隅の、おとぎ話のような記述。けれど${friendName()}の目は、本気だった。<br>「もし本当なら――${frWish().wish}って、願えるのに」`,
    choices: [
      { label: '「……あの時は、ごめん」と先に謝る', hint: '友情↑↑・わだかまりが解ける', cond: () => !!G.flags.frRift, run: () => { friend(20); G.flags.frRift = false; G.flags.frMended = true; return `${friendName()}は目を丸くして、それから泣き笑いの顔になった。「……ずるいよ。${fI()}が先に謝ろうと思ってたのに」`; } },
      { label: '「……今さら、何の用？」と冷たく返す', hint: '関係↓↓', cond: () => !!G.flags.frRift, run: () => { friend(-15); return `${friendName()}は唇を噛んで、本を抱えたまま図書室を出ていった。`; } },
      { label: '「そんな話、信じちゃだめだ」', hint: '友情↓', run: () => { friend(-5); G.flags.frWarned = true; return `「……分かってるよ。言ってみただけ」${friendName()}は本を閉じた。けれど、その本は返却されないまま、${friendName()}の鞄の中にあった。`; } },
      { label: '「もし本当にあるなら、一緒に探そう」', hint: '友情↑', run: () => { friend(10); G.flags.frGrailHope = true; lore(1); return `「ほんと？」${friendName()}の顔が、ぱっと明るくなった。その日から、二人で街の古い言い伝えを調べ始めた。`; } },
      { label: '「願いは、自分の手で叶えるものだよ」', hint: '友情↑・精神↑', run: () => { friend(5); gain('spi', 3); return `${friendName()}はしばらく黙っていた。「${fg('……そうだな。そうだと、いいな', '……そうだね。そうだと、いいね')}」（精神+3）`; } },
    ] },
  { id: 'fr_promise', age: 17, title: '冬の前の約束', cond: () => !frCut(),
    text: () => `冬の初め。城跡公園の桜の木は、すっかり葉を落としていた。<br>${frLover() ? `つないだ手をポケットに入れたまま、${friendName()}が` : frRel() === 'best' ? `いつものように並んで歩きながら、${friendName()}が` : `${friendName()}が、`}白い息を吐きながら言った。<br>「${fg('なあ', 'ねえ')}。もしも、いつか――${fI()}が、間違ったことをしようとしたら」<br>「${fg('……止めてくれるか？ それとも、味方でいてくれるか？', '……止めてくれる？ それとも、味方でいてくれる？')}」`,
    choices: [
      { label: '「止める。何があっても」', hint: '秩序', run: () => { tone('law'); friend(5); G.flags.frStop = true; return `「${fg('……ああ。お前なら、そう言うと思った', '……うん。あなたなら、そう言うと思った')}」${friendName()}は、少しだけ安心したように笑った。`; } },
      { label: '「味方でいる。何があっても」', hint: '友情↑', run: () => { friend(10); G.flags.frSide = true; return `「${fg('……ばか。そういうとこ、昔から変わらないな', '……ばか。そういうところ、昔から変わらないね')}」${friendName()}は、あなたの肩に額を押し当てた。`; } },
      { label: '「その時は、一緒に考えよう」', hint: '友情↑・知力↑', run: () => { friend(5); gain('int', 2); G.flags.frTogether = true; return `「一緒に、か」${friendName()}は空を見上げた。「……それ、いちばん難しい答えだよ」（知力+2）`; } },
    ] },
];
// 絶縁しているときの、16・17歳の出来事
FRIEND_GROWTH.push(
  { id: 'fr_legend_cut', age: 16, title: '遠い背中', cond: () => frCut(),
    text: () => `${friendName()}とは、もう何年も口をきいていない。<br>噂では、${friendName()}は放課後になると一人で図書館に籠もり、「どんな願いでも叶える杯」の古い伝説を調べているらしい。<br>${frWish().ill}。――その重さを、今は誰が分かち合っているのだろう。`,
    choices: [
      { label: '図書館へ行き、声をかける', hint: '関係↑↑', run: () => { friend(25); return `「${fg('……何しに来たんだよ', '……何しに来たの')}」<br>冷たい声だった。けれど${friendName()}は、隣の席を空けてくれた。閉館の音楽が鳴るまで、二人は黙って同じ本を読んでいた。`; } },
      { label: '遠くから見ているだけにする', hint: '精神↑', run: () => { gain('spi', 3); return `図書館の窓の向こうで、${friendName()}の背中は、ひどく小さく見えた。（精神+3）`; } },
    ] },
  { id: 'fr_promise_cut', age: 17, title: '冬の前の手紙', cond: () => frCut(),
    text: () => `冬の初め。郵便受けに、差出人の名前のない手紙が入っていた。見慣れた、${friendName()}の字だった。<br>「もしも、いつか――${fI()}が間違ったことをしようとしたら。……そんなこと、もう${fYou()}に聞く資格は${fg('ないよな', 'ないね')}」`,
    choices: [
      { label: '「それでも、止める」と返事を書く', hint: '関係↑・秩序', run: () => { friend(15); tone('law'); G.flags.frStop = true; return '短い返事を、桜の木の下に結んでおいた。翌日、手紙はなくなっていた。'; } },
      { label: '返事は書かない', hint: '精神↑', run: () => { gain('spi', 3); return '手紙は、机の引き出しの奥にしまった。捨てることは、どうしてもできなかった。（精神+3）'; } },
    ] },
);
// 節目の出来事をすべて出したあと、関係の変化（絶縁・雪解け・恋人／親友）を確かめる
function friendCheck(then) {
  if (!frNormal()) return then();
  fr();
  const ev = FRIEND_GROWTH.find(e => e.age === G.master.age && !G.used[e.id] && (!e.cond || e.cond()));
  if (!ev) return frRelCheck(then);
  showEvent({ ...ev, chapter: `幼馴染・${G.master.age}歳` }, () => friendCheck(then));
}

// =============================================================
//  聖杯戦争：幼馴染の物語（STORY に加える）
// =============================================================
// 再会（3日目）の文章を、関係と願いに合わせて書き換える
function frReunionText(r) {
  const n = friendName();
  if (frCut()) return `城跡公園の、あの桜の木の下。何年ぶりかに向かい合った${n}の手の甲に、<b>令呪</b>が刻まれていた。<br>背後に、${r.cls}のサーヴァントが静かに控えている。` +
    `<p class="quote">「${fg('……お前も、か。別に驚かねえよ。話すことなんて、何もない', '……あなたも、なんだ。別に驚かない。話すことなんて、何もないから')}」</p>` + `「${fI()}には、叶えたい願いがある。――${frWish().wish}。邪魔をするなら、${fYou()}でも容赦しない」`;
  return `「${fg('……やっぱり、お前もだったんだな', '……やっぱり、あなたもだったんだ')}」<br>城跡公園の、あの桜の木の下。待っていたのは${n}だった。手袋を外したその手の甲に、<b>令呪</b>が刻まれている。<br>背後に、${r.cls}のサーヴァントが静かに控えていた。` +
    (frLover() ? fg(`<br>${n}は、あなたを強く抱きしめた。「よりによって、恋人同士で殺し合いなんて……」`, `<br>${n}は、あなたの胸に飛び込んできた。「よりによって、恋人同士で殺し合いなんて……」`) : frRel() === 'best' ? `<br>「親友と殺し合いなんて、冗談にしても笑えない${fg('よな', 'よね')}」${n}は、無理に笑ってみせた。` : '') +
    `<p class="quote">「${r.quote}」</p>` + `「${fI()}には、叶えたい願いがある。――${frWish().wish}。そのためなら、何だってする」`;
}
function frReunion() {
  const R = () => frRival(); const N = () => friendName();
  return [
    { label: () => frLover() ? '「二人で生き残ろう。絶対に」' : '「手を組もう。二人で生き残るんだ」', hint: '同盟（恋人なら必ず応じる・親友なら易しい）', cond: () => !frCut(), run: () => {
      const r = R(); const n = N();
      const need = frRel() === 'best' ? Math.max(20, 55 - G.friend.bond / 2) : Math.max(30, 75 - G.friend.bond / 2); const c = frLover() ? { ok: true, text: '' } : chk('cha', need);
      if (c.ok || G.friend.bond >= 80) { r.ally = true; r.intel = 3; friend(10); addLog(`幼馴染・${G.friend.name}と同盟を結ぶ。`);
        return [c.text, `${n}は少しだけ泣きそうな顔で笑った。「${fg('……ああ。お前となら', '……うん。あなたとなら')}」<br>${r.cls}陣営と同盟を結んだ。サーヴァントの真名<b>${servantOf(r).name}</b>も教えてもらった。`]; }
      return [c.text, `「ごめん。……それは、できない」${n}は目を伏せて、去っていった。`];
    } },
    { label: '「戦いから降りてくれ」と説得する', hint: '交渉判定（恋人なら易しい）・友は願いを手放す', cond: () => !frCut(), run: () => {
      const r = R(); const n = N(); const c = chk('cha', Math.max(25, (frLover() ? 60 : 80) - G.friend.bond / 2));
      if (c.ok) { r.alive = false; r.hp = 0; G.flags.friendSaved = true; addLog(`幼馴染・${G.friend.name}、聖杯戦争から降りる。`);
        return [c.text, `長い沈黙の後、${n}は頷いた。「${fg('……分かった。教会に行く。でも、約束しろ。絶対に、死ぬなよ', '……分かった。教会に行く。でも、約束して。絶対に、死なないで')}」<br>${r.cls}陣営は脱落した。誰も傷つかずに。`, `<span class="note">「${frWish().wish}」――${n}は、その願いを、あなたのために手放した。</span>`]; }
      friend(-5); return [c.text, `「${fYou()}にだけは、それを言われたくなかった」${n}の声は震えていた。`];
    } },
    { label: '「正々堂々、戦おう」と約束する', hint: '秩序・大胆', run: () => { const n = N(); const cut = frCut(); tone('law'); tone('bold'); friend(cut ? 10 : 5); G.flags.friendDuel = true;
      return cut ? `${n}は鼻で笑った。「……昔から、そういうとこだけは変わらない${fg('な', 'ね')}」けれど、その声は少しだけ揺れていた。` : `「……昔から、そういうとこ変わらない${fg('な', 'ね')}」${n}は拳を突き出した。あなたはそれに、自分の拳を合わせた。`; } },
    { label: '「それでも、話を聞いてほしい」', hint: '交渉判定（難）・関係↑↑', cond: () => frCut(), run: () => {
      const n = N(); const c = chk('cha', 68);
      if (c.ok) { friend(25); return [c.text, `${n}は背を向けたまま、立ち止まった。あなたは、言えなかったことを全部話した。<br>「……今さら、ずるいよ」その声は、泣いていた。`]; }
      friend(-5); return [c.text, `「話すことなんてないって、${fg('言っただろ', '言ったよね')}」${n}は振り返らずに去っていった。`];
    } },
    { label: '黙って見送る', cond: () => frCut(), run: () => `${N()}の背中が、雪の中に消えていった。` },
  ];
}
// 襲撃者：幼馴染以外で、戦える陣営
function frAttacker() { const c = engageable().filter(r => !r.friend); return c.length ? c.reduce((a, b) => (a.aggr >= b.aggr ? a : b)) : null; }

// 再会：data_story.js の s_friend を、関係に合わせたものに差し替える
{ const i = STORY.findIndex(s => s.id === 's_friend'); if (i >= 0) STORY[i].choices = frReunion(); }

STORY.push(
  // ---- 5日目の夜：友の危機 ----
  { id: 'fr_rescue', phase: 'war', day: 5, slot: 1, after: 'advance',
    cond: () => !(typeof skOn === 'function' && skOn()) && frNormal() && frAlive() && !!frAttacker() && !G.flags.frBetrayed,
    title: '友の危機',
    text: () => { const a = G.tmpRival = frAttacker(); const r = frRival();
      return `深夜。${SV()}が、鋭く顔を上げた。サーヴァント同士がぶつかり合う気配だ。<br>旧城下町の方角――${friendName()}の拠点がある辺りで、魔力がぶつかり合っている。<br>使い魔の目に映ったのは、${rivalLabel(a)}陣営に追い詰められていく${r.cls}のサーヴァントと、その後ろで必死に令呪を握りしめる${friendName()}の姿だった。<br><span class="note">このままでは、${friendName()}の陣営は落ちる。${frCut() ? '――絶縁した相手だ。助ける義理はない。それでも。' : frLover() ? '――恋人が、殺されようとしている。' : ''}</span>`; },
    choices: [
      { label: () => `「${SV()}、行くぞ！」助けに飛び込む`, hint: '戦闘（奇襲）・友情↑↑', run: () => {
          const a = G.tmpRival; const r = frRival(); friend(frCut() ? 30 : 20); G.flags.frRescued = true; tone('good');
          if (!r.ally && !frCut() && G.friend.bond >= 40) { r.ally = true; r.intel = 3; addLog(`幼馴染・${G.friend.name}と、助け合う約束をする。`); }
          return { text: [`考えるより先に、体が動いていた。`, `「${friendName()}、下がって！」<br>${SV()}が、${rivalLabel(a)}の死角へ躍り込む。`, r.ally ? `<span class="note">${friendName()}の陣営と、手を取り合うことになった。（同盟）</span>` : ''], then: () => startBattle(a, { ambush: true }) };
        } },
      { label: '令呪を使い、一瞬で割って入らせる', hint: '令呪-1・戦わずに救う・友情↑↑', cond: () => G.master.seals > 0, run: () => {
          const a = G.tmpRival; const r = frRival(); G.master.seals--; friend(frCut() ? 35 : 25); G.flags.frRescued = true; tone('good');
          a.hp = Math.max(10, a.hp - 30); a.intel = Math.max(a.intel, 2); if (!r.ally && !frCut() && G.friend.bond >= 40) { r.ally = true; r.intel = 3; }
          addLog('令呪で幼馴染を救う。');
          return [`<b>「令呪をもって命ずる――${friendName()}を守れ！」</b>`, `${SV()}の姿が掻き消え、次の瞬間、${rivalLabel(a)}の一撃を受け止めていた。不意を突かれた敵は、深手を負って退いていく。（敵HP-30・敵の拠点が判明）`,
            frCut() ? `${friendName()}は、あなたを睨みつけた。「${fg('……借りを作ったなんて、思わねえからな', '……借りを作ったなんて、思わないから')}」けれど、その目は赤くなっていた。` : `${friendName()}は、震える手であなたの袖を掴んだ。「${fg('……なんでだよ。俺たち、敵同士なのに', '……どうして。わたしたち、敵同士なのに')}」`];
        } },
      { label: '見届ける。弱ったところを、後で叩けばいい', hint: '悪・混沌・友情↓↓↓・敵の情報', run: () => {
          const a = G.tmpRival; const r = frRival(); tone('evil'); tone('chaos'); friend(frLover() ? -60 : -40); G.flags.frAbandoned = true;
          r.alive = false; r.hp = 0; a.hp = Math.max(10, a.hp - 40); a.intel = Math.max(a.intel, 2); a.clues = (a.clues || 0) + 2;
          addLog(`幼馴染・${G.friend.name}の陣営が倒れるのを、見届ける。`);
          return [`あなたは動かなかった。`, `${r.cls}のサーヴァントが光の粒になって消えていく。${friendName()}が、こちらの方角を見た気がした。――気づいていたのかもしれない。`,
            `${friendName()}は生き延びた。けれど、その願いは、この夜に潰えた。`, `<span class="note">${rivalLabel(a)}陣営は手負いになり、拠点も割れた。……勝つためには、正しい選択だったはずだ。</span>`];
        } },
    ] },
  // ---- 7日目の昼：病室 ----
  { id: 'fr_hospital', phase: 'war', day: 7, slot: 0, after: 'hub',
    cond: () => !(typeof skOn === 'function' && skOn()) && frNormal() && frSafe() && !!G.used.s_friend && !G.flags.frAbandoned && !G.flags.frBetrayed && !frCut(),
    title: '病室',
    text: () => `${friendName()}から呼び出されたのは、市立病院だった。<br>${frWish().worse}。<br>${fr().wish === 'self' ? '病室のベッドの上で' : '病室の前の長椅子で'}、${friendName()}は小さく笑った。<br>` +
      `「${fg('なあ。頼みがあるんだ。……もし、お前が聖杯を手にしたら。<b>俺の願いを、叶えてくれないか？</b>', 'ねえ。お願いがあるの。……もし、あなたが聖杯を手にしたら。<b>わたしの願いを、叶えてくれない？</b>')}」`,
    choices: [
      { label: '「約束する。聖杯は、君の願いのために使う」', hint: '善・自分の願いを手放す・友情↑↑', run: () => { tone('good'); friend(15); G.flags.frGrailPromise = true; addLog(`幼馴染に、聖杯を譲ると約束する。`);
          return [`${friendName()}は、声を上げて泣いた。「ありがとう……ありがとう……」`, `<span class="note">自分の願い「${masterWish()}」は、もう叶わないかもしれない。それでも――。</span>`]; } },
      { label: '「……ごめん。私にも、譲れない願いがある」', hint: '友情↓', run: () => { friend(-10); G.flags.frRefused = true;
          return `「……そっか。そう${fg('だよな', 'だよね')}」${friendName()}は、それ以上何も言わなかった。窓の外で、雪が降り始めていた。`; } },
      { label: '「聖杯以外の道を、一緒に探そう」', hint: '知力判定・友情↑', run: () => { friend(5); const c = chk('int', 58);
          if (c.ok) { G.flags.frOtherWay = true; return [c.text, `二人で、医学と魔術の両方の資料を夜通し調べた。明け方、一つだけ、細い糸のような可能性が見つかった。<br>「……聖杯がなくても、まだ、終わりじゃないんだ${fg('な', 'ね')}」`]; }
          return [c.text, `夜通し調べても、何も見つからなかった。${friendName()}は「ありがとう。気持ちだけで、十分」と笑った。その笑顔が、痛かった。`]; } },
      { label: '「聖杯は、呪われている」と真実を告げる', hint: '聖杯の真実を知っている時のみ', cond: () => !!G.flags.grailTruth, run: () => {
          if (G.friend.bond >= 60) { G.flags.frKnowsTruth = true; friend(5); return `${friendName()}は長いあいだ黙っていた。「${fg('……お前が言うなら、本当なんだな', '……あなたが言うなら、本当なんだね')}」<br>その声は、静かに震えていた。「じゃあ、${fI()}は何のために、ここまで――」`; }
          friend(-15); G.flags.frDenial = true; return `「嘘だ」${friendName()}は、あなたを睨んだ。「${fg('お前は、聖杯を独り占めしたいだけだろ！', 'あなたは、聖杯を独り占めしたいだけでしょ！')}」<br>病室の扉が、強く閉ざされた。`;
        } },
    ] },
  // ---- 9日目の昼：異変の兆し（関係が育っていれば、魂喰いを未然に防げる） ----
  { id: 'fr_omen', phase: 'war', day: 9, slot: 0, after: 'hub',
    cond: () => !(typeof altRoute === 'function' && altRoute()) && !(typeof skOn === 'function' && skOn()) && frNormal() && frAlive() && !frCut() && (frClose() || G.friend.bond >= 50) && !G.flags.frKnowsTruth && !G.flags.frOtherWay,
    title: '異変の兆し',
    text: () => { const n = friendName(); const r = frRival();
      return `${frLover() ? `恋人からの` : `${n}からの`}メッセージが、ここ数日、妙に短い。<br>会いに行くと、${n}は笑って迎えてくれた。けれど、その笑顔はどこか張り詰めていて、${r.cls}のサーヴァントの気配は、ひどく弱っていた。<br>` +
        `${G.used && G.used.fr_hospital ? `あの病室の日から、${frWish().who === '自分自身' ? n + '自身の' : frWish().who + 'の'}容体はさらに悪くなっていたらしい。――それなのに${n}は、あなたには「大丈夫」としか言っていなかった。` : `${frWish().worse}。――${n}はそれを、あなたに話していなかった。`}<br>帰り際、${n}がぽつりと呟いた。「……${fg('なあ', 'ねえ')}。眠ってる人から、少しだけ力を借りるのって、そんなに悪いことかな」<br><span class="note">――このままでは、${n}は取り返しのつかないことをする。</span>`; },
    choices: [
      { label: '「話を聞かせて。全部」', hint: '説得（恋人なら必ず届く・関係が深いほど易しい）', run: () => {
          const n = friendName(); const c = frLover() ? { ok: true, text: '' } : chk('cha', Math.max(25, (frRel() === 'best' ? 60 : 70) - G.friend.bond / 3));
          if (c.ok) { G.flags.frPrevented = true; friend(10); tone('good'); addLog(`幼馴染・${G.friend.name}の魂喰いを、未然に止める。`);
            return [c.text, `${n}は長いあいだ黙っていた。それから、堰を切ったように泣き出した。<br>「……怖かった。勝てなかったら、${fr().wish === 'self' ? fI() + 'は' : frWish().who + 'は'}って思ったら、もう何でもしなきゃって」`,
              `あなたは${n}の手を握って、夜が明けるまで話を聞いた。${n}は、自分のサーヴァントに「魂喰いはしない」と告げた。`,
              `<span class="note">${n}は、魂喰いに手を染めずに済んだ。</span>`]; }
          G.flags.frPremonition = true; friend(-5);
          return [c.text, `「……大丈夫。ちょっと言ってみただけ」${n}は、それ以上何も話してくれなかった。<br>閉ざされた扉の向こうで、何かが軋む音がした気がした。`];
        } },
      { label: '「……疲れてるんだよ。少し休んで」と流す', run: () => { G.flags.frPremonition = true;
          return `「${fg('……ああ。そうだな', '……うん。そうだね')}」${friendName()}は笑った。その笑顔を、あなたは信じたかった。`; } },
    ] },
  // ---- 10日目の夜：堕ちる友 ----
  { id: 'fr_fall', phase: 'war', day: 10, slot: 1, after: 'advance',
    cond: () => !(typeof altRoute === 'function' && altRoute()) && !G.flags.counter && !(typeof skOn === 'function' && skOn()) && frNormal() && frAlive() && !G.flags.frKnowsTruth && !G.flags.frOtherWay && !G.flags.frPrevented,
    title: '堕ちる友',
    text: () => { const r = frRival();
      return `${frWish().worse.replace(/。$/, '')}――あの知らせから、${friendName()}は変わってしまった。<br>深夜の病院の裏手。眠る人々の窓の下で、${r.cls}のサーヴァントが、生命力を吸い上げていた。<b>魂喰い</b>だ。<br>その傍らで、${friendName()}が振り返った。目の下には、深い隈が刻まれている。<br>` +
        (frCut() ? `「${fg('……お前には関係ないだろ。絶縁したんだから', '……あなたには関係ないでしょ。絶縁したんだから')}」` : frLover() ? `「${fg('……見るな。お前にだけは、見られたくなかった', '……見ないで。あなたにだけは、見られたくなかった')}」` : `「${fg('……見るな。頼む。', '……見ないで。お願い。')}`) +
        `${frCut() ? '' : fg('あと少し、あと少しで勝てるんだ。', 'あと少し、あと少しで勝てるの。')}勝たなきゃ、${fr().wish === 'self' ? fI() + 'が' : frWish().who + 'が'}――」` +
        (G.flags.frPremonition ? `<br><span class="note">――あの日、異変に気づいていたのに。話を聞ききれなかった。</span>` : '') +
        (soulOn() ? `<br>「${fYou()}だって、やってるくせに。……分かってるんだよ」` : '') +
        (G.flags.frStop ? `<br><span class="note">――「止めてくれる？」あの冬の日の声が、耳の奥で響いた。</span>` : G.flags.frSide ? `<br><span class="note">――「味方でいる。何があっても」あの冬の日に、あなたはそう答えた。</span>` : ''); },
    choices: [
      { label: '「止める。戦ってでも」', hint: '戦闘（一騎打ち）', run: () => { const r = frRival(); G.flags.frStopped = true; if (G.flags.frStop) friend(10); else friend(-5); tone('law');
          if (r.ally) r.ally = false;
          return { text: [`「……約束、したから」`, `${friendName()}の顔が、くしゃりと歪んだ。「……そうだった${fg('な', 'ね')}」<br>${r.cls}のサーヴァントが、主を守るように前へ出る。`], then: () => startBattle(r, { duel: true }) }; } },
      { label: '見なかったことにする', hint: '混沌・悪・友の罪に目をつぶる', run: () => { const r = frRival(); tone('chaos'); tone('evil'); G.flags.frBlind = true;
          if (G.flags.frSide) friend(10); r.power += 2; r.hp = r.hpMax; r.mp = 100;
          return [`あなたは、黙って背を向けた。`, `背後で、${friendName()}が小さく「${fg('……悪い', 'ごめんね')}」と言った。`, `<span class="note">翌朝、眠り病の被害者がまた増えたと、ニュースが報じていた。${friendName()}の陣営は、力を増している。</span>`]; } },
      { label: '教会に告げる', hint: '秩序・関係↓↓↓', run: () => { const r = frRival(); tone('law'); friend(frClose() ? -70 : -40); G.flags.frBetrayed = true; r.bounty = true; r.ally = false; r.intel = 3;
          addLog(`幼馴染・${G.friend.name}の魂喰いを、教会に告げる。`);
          return [`${CAST.sister}は短く「分かりました」とだけ言った。翌日、${friendName()}の陣営に討伐令が出た。`,
            `その夜、一通だけメッセージが届いた。<br>「信じてたのに」`, `<span class="note">${friendName()}の陣営を討てば、令呪が一画与えられる。</span>`]; } },
    ] },
);

// =============================================================
//  昼の行動：幼馴染に会いに行く
// =============================================================
function friendVisitable() { return frNormal() && !G.flags.skGone && G.phase === 'war' && !!G.used.s_friend && frSafe() && !G.flags.frBetrayed && !G.flags.frAbandoned && !frCut(); }
function friendVisit() {
  actResult('幼馴染', () => {
    const r = frRival(); const n = friendName(); friend(6); gain('spi', 2);
    const love = frLover() ? [`戦争の最中だということを、少しだけ忘れることにした。${n}と手をつないで、冬の商店街を歩いた。「……こういうの、ずっと続けばいいのに${fg('な', 'ね')}」`,
      `${n}が、あなたの肩に頭を預けて眠ってしまった。起こさないように、そのまま夕方までじっとしていた。`] : frRel() === 'best' ? [`${n}と、昔みたいにゲームセンターで勝負した。結果は三勝三敗。「決着は、戦争が終わってから${fg('な', 'ね')}」`] : [];
    if (love.length && Math.random() < 0.6) return [pick(love), `<span class="note">（${frRelName()}との関係+6・精神+2）</span>`];
    const lines = !r.alive ? [`${n}の家を訪ねた。もう戦いから降りた${n}は、少し痩せていたけれど、笑って迎えてくれた。「${fg('……生きて帰ってこいよ。約束だぞ', '……生きて帰ってきてね。約束だよ')}」`,
      `${n}と二人で、城跡公園の桜の木を見に行った。まだ固い蕾を見上げて、${n}が言った。「春になったら、また一緒に見よう」`]
      : r.ally ? [`${n}の拠点で、作戦会議という名目のお茶会をした。${SV()}と${r.cls}のサーヴァントが、無言で睨み合っている。二人で、こっそり笑った。`,
        `${n}が、${frWish().who === '自分自身' ? '薬の時間の合間に' : '病院の帰りに'}立ち寄ってくれた。「同盟相手の様子を見に来ただけ」と言いながら、手作りのお弁当を置いていった。`]
      : [`休戦の白い布を掲げて、${n}と城跡公園で会った。サーヴァントは遠くに待たせて、二人きりで、昔の話をした。`,
        `敵同士だと分かっていても、${n}からのメッセージは途切れなかった。「${fg('ちゃんと食ってるか？', 'ちゃんと食べてる？')}」――それだけの言葉が、妙に嬉しかった。`];
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
    next('二人で', paras([`${n}は、長いあいだ杯を見上げていた。そして、令呪の刻まれた右手を下ろした。`, `「${fg('……ああ', '……うん')}。あんなものに、${frWish().who === '自分自身' ? fI() + 'の命' : frWish().who}を預けたくない」`, `${r.cls}のサーヴァントは、主の決意を見届けるように、静かに霊体化していった。`]),
      victoryScene, '杯の前へ');
  } });
  return out;
}
function friendFinalQuote(r) {
  if (G.flags.frBetrayed) return `……ここで終わらせよう。${fYou()}にだけは、負けたくない。`;
  if (frCut()) return `${fYou()}と決着をつけるのは、${fI()}だって決めてた。……それだけ${fg('だ', '')}。`;
  if (frLover()) return fg('お前を傷つけたくない。でも、願いも捨てられない。……なあ、どうしてこうなっちまったんだろうな。', 'あなたを傷つけたくない。でも、願いも捨てられない。……ねえ、どうしてこうなっちゃったんだろうね。');
  if (G.flags.frBlind) return `ありがとう、黙っていてくれて。……でも、ここは譲れない${fg('んだ', 'の')}。`;
  if (G.flags.frGrailPromise) return `${fYou()}は約束してくれた。でも――${fYou()}の手を汚させたくない。だから、${fI()}が勝つ。`;
  if (G.flags.frRescued) return `あの夜、助けてくれてありがとう。……だからこそ、全力でいく${fg('ぞ', 'ね')}。`;
  return `${frWish().wish}。――${fg('悪い', 'ごめんね')}。それでも、${fI()}は勝ちたい。`;
}

// =============================================================
//  結末
// =============================================================
// 聖杯の前で：幼馴染の願いを叶える（友が無事で、真実を知らないか、聖杯が正しいとき）
function friendWishChoice() {
  if (!frNormal() || !frSafe() || G.flags.frBetrayed || G.flags.frAbandoned || frCut()) return null;
  if (!G.flags.frGrailPromise && !frClose() && G.friend.bond < 60) return null;
  if (G.flags.grailTruth && isCursed()) return null;
  return { label: `${friendName()}の願いを叶える`, hint: `「${frWish().wish}」${G.flags.frGrailPromise ? '・約束を果たす' : ''}`, fn: () => ending(isCursed() ? 'friendRuin' : 'friendWish') };
}
function friendEndingTexts(sv) {
  if (!G.friend) return {};   // 幼馴染のいないシナリオ（藤丸・岸波・士郎など）
  const n = friendName(); const w = frWish();
  return {
    friendWish: () => ({ title: '終幕：友の願い', text: [`<p>「${w.wish}」</p>`, `<p>それは、あなたの願いではなかった。けれど、聖杯は静かに願いを聞き届けた。</p>`, `<p>${w.healed}</p>`,
      `<p>${sv.short}は、光の中で微笑んだ。「……君らしい願いだ」</p>`, `<p class="quote">${farewellLine(sv)}</p>`,
      `<p>自分の願い「${masterWish()}」は、叶わなかった。それでも――城跡公園の桜が咲いた日、${frLover() ? '恋人が' : frRel() === 'best' ? '親友が' : `${n}が`}隣で泣きながら笑っていた。それで、十分だった。</p>`] }),
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
    : `聖杯の奇跡は、${n}には訪れなかった。${fr().wish === 'self' ? `回路の病は、治らないまま。それでも${n}は、笑って生きていくと決めた。` : `それでも${n}は、${w.who}のそばに居続けている。`}`;
  if (r.killed) return `<p class="note">${n}の家の前を通るたび、あなたは足を止める。${frLover() ? '恋人だった人の笑顔が、' : 'もう、あの笑顔が'}迎えてくれることはない。</p>`;
  if (frCut()) return `<p class="note">${n}とは、絶縁したままだ。それでも毎年、春になると、城跡公園の桜の木の下に、誰かが一輪の花を置いていく。${fate}</p>`;
  const tie = frLover() ? `春、${n}と手をつないで、城跡公園の桜を見上げた。「来年も、再来年も、ずっと一緒に見よう${fg('な', 'ね')}」` : frRel() === 'best' ? `春、${n}と城跡公園の桜の下で、缶ジュースで乾杯した。「親友の生還に」` : '';
  if (G.flags.frBetrayed) return `<p class="note">${n}とは、あれから一度も会っていない。春、城跡公園の桜の木の下に、二人で埋めたビー玉が掘り返されていた。</p>`;
  if (G.flags.frAbandoned) return `<p class="note">${n}は、あの夜のことを一度も口にしなかった。だから、あなたも謝れないままでいる。${fate}</p>`;
  if (G.flags.friendSaved) return `<p class="note">${tie || `春。${n}と並んで、城跡公園の桜を見上げた。`}「約束、守ってくれた${fg('な', 'ね')}」${fate}</p>`;
  if (G.flags.friendDefeated) return `<p class="note">戦いの後、${n}から一通のメッセージが届いた。「おかえり。……止めてくれて、ありがとう」${fate}</p>`;
  if (G.flags.frBlind) return `<p class="note">${n}の罪を、あなたは誰にも話していない。二人だけの秘密は、春になっても溶けなかった。${fate}</p>`;
  if (r.alive && r.ally) return `<p class="note">${n}は最後まで、あなたの味方でいてくれた。${tie || '春、二人で城跡公園を歩きながら、あの冬の話を少しだけした。'}${fate}</p>`;
  return `<p class="note">${n}も、あの冬を生きて越えた。${tie || `「お互い、しぶとい${fg('な', 'ね')}」――そう言って笑う顔は、昔のままだった。`}${fate}</p>`;
}
