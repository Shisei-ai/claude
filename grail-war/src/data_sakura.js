// =============================================================
//  data_sakura.js … 幼馴染ルート「願い桜」
//
//  城跡公園の大桜は、人の願いを叶える「願い桜」。六十年前の聖杯戦争で、幼馴染の祖母――桜守の家の魔術師で、
//  榊宗玄の戦友――が、壊れかけた聖杯からこぼれた魔力を桜の根に封じ、自らの魔術回路を「鞘」にして抑え続けた。
//  祖母が亡くなり、鞘を失った桜は、同じ血を引く幼馴染の回路へ根を伸ばした。幼い頃からの回路の暴走は、桜と繋がる予兆だった。
//  今回の聖杯戦争で、桜は霊脈を通じて天降山の聖杯と結びつく。倒れた英霊の魂が、桜へ、そして幼馴染へ流れ込み、
//  幼馴染は「聖杯そのもの」――花冠の杯――へと変わっていく。
//  この幼馴染を、どうやって救うのか。それがこのルートの主題。
//
//   2日目の昼  胸騒ぎ → 桜の木（data_route.js）……真冬に、桜が一輪だけ咲いている
//   3日目の昼  桜の下の同盟 ……このルートでは、幼馴染と必ず手を組む
//   4日目の夜  狂い咲き      ……真冬の夜に、桜が満開になる。昼の行動「桜の謎を追う」が加わる
//   5日目の昼  桜守の蔵      ……祖母の日記。一族は桜守だった
//   5日目の夜  刈り取る者    ……六十年分の願いを奪おうとする敵マスターの襲撃
//   6日目の昼  老人と桜      ……宗玄が語る、祖母の務め。救う道を選ぶ（断つ・受け止める・還す）
//   7日目の昼  花喰い        ……幼馴染のサーヴァントが、桜の根に呑まれる。幼馴染が変わり始める
//   8日目の昼  花の声        ……半ば変わった幼馴染との会話（心の灯が揺れる）
//   9日目の昼  散り際の手紙  ……幼馴染が、桜の中へ消える
//  10日目の昼  花の夢        ……夢の中で、桜の中の幼馴染と言葉を交わす最後の機会
//  最後の敵を倒した夜、聖杯は天降山ではなく大桜に降り、幼馴染が「花冠の杯」として立ちはだかる
//
//  心の灯（0〜100）……幼馴染の心が、どれだけ残っているか。会話・会いに行く・備えで上がり、英霊が呑まれるたびに揺らぐ
//  結末：散る桜（断つ）／代価の人（受け止める）／花還し（還す：恋人か親友・心の灯60以上）／花葬（討つ）／桜の眠り（敗北）
//  このルートでは、聖杯の真相（昏睡事件）と、幼馴染のこれまでの出来事（友の危機・病室・堕ちる友）は、この物語に置き換わる
// =============================================================

const SAKURA_CUP = { id: 'sakura_cup', name: '花冠の杯', short: '花冠の杯', cls: '聖杯', p: ['B', 'A', 'A', 'EX', 'C', 'EX'], align: '―', persona: 'berserker',
  np: '千年夜桜', npRuby: 'ヨザクラ・カカン', catalyst: null, line: '', desc: '桜守の血と、願い桜と、聖杯が一つになったもの。かつて、あなたの幼馴染だった。' };
function skOn() { return !!G && G.route3 === 'friend'; }
function sk() { if (!G.sakura) G.sakura = { ev: 0, clues: [], done: {}, path: null, prep: 0, tasks: {}, heart: 30, outcome: null, absorbed: 0, seenDead: 0 }; return G.sakura; }
function skHeart(n) { const s = sk(); s.heart = clamp(s.heart + n, 0, 100); return `<span class="note">（${friendName()}の心の灯 ${n >= 0 ? '+' : ''}${n}）</span>`; }
const SK_PATHS = { cut: '断つ', bear: '受け止める', ret: '還す' };
function skRetOk() { return frClose() && sk().heart >= 60; }   // 還す：恋人か親友で、心の灯が60以上
function skClue(id, title, text) {
  const s = sk(); if (s.clues.some(c => c.id === id)) return '';
  s.clues.push({ id, title, text, when: whenShort() }); s.ev++;
  return `<span class="note">🌸 桜の記録：「${title}」（手がかり ${s.ev}）${s.ev === 3 ? '　救う道が、見え始めた。' : ''}</span>`;
}
function skStart() { const s = sk(); s.heart = clamp(30 + (frLover() ? 15 : frRel() === 'best' ? 10 : 0) + (G.flags.frSakura ? 10 : 0), 0, 100); }
// このルートでは置き換わる出来事
function skReplaced() { return skOn(); }

// =============================================================
//  物語
// =============================================================
STORY.push(
  // ---- 3日目の昼：桜の下の同盟 ----
  { id: 'f_ally', phase: 'war', day: 3, slot: 0, after: 'hub', cond: () => skOn() && !!frRival(),
    title: '桜の下の同盟', chapter: '第一幕　開幕',
    text: () => { const n = friendName(); const r = frRival();
      return `城跡公園の桜の木の下。昨日と同じ場所で、${n}が待っていた。手袋を外したその手の甲に、<b>令呪</b>が刻まれている。<br>背後に、${r.cls}のサーヴァントが静かに控えていた。<br>` +
        `<p class="quote">「${fg('……やっぱり、お前もだったんだな', '……やっぱり、あなたもだったんだ')}」</p>` +
        `${n}は、冬枯れの枝に一輪だけ咲いた桜を見上げた。<p class="quote">「${fg('この花、俺が来た日から咲いてるんだ。……それと、最近、体の中が熱くてさ。回路が、勝手に何かに引っ張られてるみたいで', 'この花、わたしが来た日から咲いてるの。……それとね、最近、体の中が熱いんだ。回路が、勝手に何かに引っ張られてるみたいで')}」</p>`; },
    choices: [
      { label: '「一緒に戦おう。この桜のことも、二人で調べよう」', hint: '同盟・心の灯↑', cls: 'primary', run: () => skAlly(8) },
      { label: () => gw('「無理はするな。何かあったら、すぐ呼べ」', '「無理しないで。何かあったら、すぐ呼んで」', '「無理はしないで。何かあったら、すぐ呼んで」'), hint: '同盟・心の灯↑', run: () => skAlly(6, `「${fg('……過保護', '……過保護だなあ')}」${friendName()}は笑って、それから、小さく「ありがと」と言った。`) },
    ] },
  // ---- 4日目の夜：狂い咲き ----
  { id: 'f_bloom', phase: 'war', day: 4, slot: 1, after: 'advance', cond: () => skOn(),
    title: '狂い咲き', chapter: '第二幕　侵蝕',
    text: () => `深夜。${friendName()}から、震える声で電話があった。「${fg('……桜が、変なんだ。来てくれ', '……桜が、変なの。来て')}」<br>` +
      `城跡公園に駆けつけると、真冬の夜空の下で、大桜が<b>満開</b>になっていた。花びらが、雪のように降りしきっている。<br>` +
      `根元に、知らない人たちが何人も横たわっていた。皆、幸せそうに眠っている。その胸から、淡い光が桜の根へ吸い込まれていく。<br>` +
      `そして、根の一本に手をついたまま、${friendName()}がうずくまっていた。手の甲の令呪の周りで、魔術回路が、<b>薄紅色</b>に光っている。`,
    choices: [
      { label: () => `${friendName()}を、桜から引き剥がす`, hint: '心の灯↑', cls: 'primary', run: () => [`${friendName()}の体を抱えて、根から引き剥がした。腕の中の体は、火傷しそうなほど熱かった。`, `「${fg('……悪い。桜に、呼ばれた気がして', '……ごめん。桜に、呼ばれた気がして')}」`, skHeart(8),
          skClue('bloom', '狂い咲き', '真冬の夜に、大桜が満開になった。根元で眠る人々から、光が根へ吸われていた。幼馴染の回路は、桜と同じ薄紅色に光っていた。'), skMenuNote()] },
      { label: '眠っている人たちを、先に助ける', hint: '善', run: () => { tone('good'); return [`${SV()}と手分けして、眠る人々を桜から遠ざけた。最後に${friendName()}の肩を揺すると、${friendName()}は、ぼんやりと目を開けた。`,
          skClue('bloom', '狂い咲き', '真冬の夜に、大桜が満開になった。根元で眠る人々から、光が根へ吸われていた。幼馴染の回路は、桜と同じ薄紅色に光っていた。'), skMenuNote()]; } },
      { label: '桜に触れて、魔力の流れを読む', hint: '魔力判定・手がかり', run: () => { const c = chk('mag', 55);
          return [c.text, c.ok ? '幹に手を当てた瞬間、途方もない量の魔力が、地の底から押し寄せてきた。――この桜は、ただの木ではない。何かが、根の下に封じられている。' : '幹に触れた手が、弾かれた。指先が、しばらく痺れていた。',
            skClue('bloom', '狂い咲き', '真冬の夜に、大桜が満開になった。根元で眠る人々から、光が根へ吸われていた。幼馴染の回路は、桜と同じ薄紅色に光っていた。'), c.ok ? skClue('seal', '根の下の封印', '大桜の根の下には、桜そのものとは別の、途方もない魔力の塊が封じられている。') : '', skMenuNote()]; } },
    ] },
  // ---- 5日目の昼：桜守の蔵 ----
  { id: 'f_kura', phase: 'war', day: 5, slot: 0, after: 'hub', cond: () => skOn(),
    title: '桜守の蔵',
    text: () => `${friendName()}の家の蔵は、祖母が亡くなってから、誰も開けていなかった。<br>埃をかぶった桐の箱の中に、古い日記が一冊。表紙には、祖母の字で<b>「桜守日誌」</b>とあった。<br>` +
      `<p class="quote">「桜守の血を引く者は、願い桜の『鞘』となる。我が回路を以て、桜の内なる杯を鎮めよ。――鞘を失えば、桜は次の鞘を、血の中に探すだろう」</p>` +
      `${friendName()}は、日記を持つ手を震わせていた。「${fg('……ばあちゃん、魔術師だったのかよ。俺の回路が暴れてたのって――', '……おばあちゃん、魔術師だったの？ わたしの回路が暴れてたのって――')}」`,
    choices: [
      { label: '「一人で抱えるな。一緒に読もう」', hint: '心の灯↑', cls: 'primary', run: () => [`二人で、夜まで日記をめくった。${friendName()}は時々手を止めて、祖母の字を指でなぞっていた。`, skHeart(6),
          skClue('lineage', '桜守の血', '幼馴染の家は、願い桜を鎮める「桜守」の家系だった。桜守は自らの回路を桜の「鞘」にする。鞘を失った桜は、同じ血の中に次の鞘を探す。')] },
      { label: '「回路の暴走は、桜のせいだったのか」と確かめる', hint: '知力↑', run: () => { gain('int', 2); return [`日記の最後の頁に、震える字で書き足されていた。「孫の回路が、桜に似てきた。わたしが逝けば、あの子が呼ばれる。どうか、誰か――」`, '（知力+2）',
          skClue('lineage', '桜守の血', '幼馴染の家は、願い桜を鎮める「桜守」の家系だった。桜守は自らの回路を桜の「鞘」にする。鞘を失った桜は、同じ血の中に次の鞘を探す。')]; } },
    ] },
  // ---- 5日目の夜：刈り取る者 ----
  { id: 'f_reaper', phase: 'war', day: 5, slot: 1, after: 'advance', cond: () => skOn() && hostileRivals().some(r => !r.friend),
    title: '刈り取る者',
    text: () => { const r = skReaper(); G.tmpRival = r;
      return `夜の城跡公園。大桜の根元に、見知らぬ術式が描かれていた。<br>術式の中心に立っていたのは、${rivalLabel(r)}陣営のマスター、${esc(r.master)}だった。${(typeof rvReaperLine === 'function' && rvReaperLine(r)) || '<p class="quote">「六十年分の願いが、この木に溜まっている。聖杯など待つまでもない。――刈り取らせてもらう」</p>'}` +
        `${friendName()}が、胸を押さえて膝をついた。術式が、桜を通じて${friendName()}の回路まで吸い上げようとしている。`; },
    choices: [
      { label: '迎え撃つ', hint: '戦闘', cls: 'danger', run: () => { const r = G.tmpRival; return { text: [`${SV()}が前に出る。${friendName()}を背に庇って、あなたは右手を掲げた。`], then: () => startBattle(r, {}) }; } },
      { label: () => `${friendName()}を抱えて、術式を壊す`, hint: '体力判定・心の灯↑', run: () => { const c = chk('phy', 55); const r = G.tmpRival;
          if (c.ok) { r.hp = Math.max(1, r.hp - 30); return [c.text, `術式の一角を踏み砕いた。光が弾け、${esc(r.master)}は舌打ちして退いた。（敵HP-30）`, skHeart(6)]; }
          hp(-20); return [c.text, `術式の反動に、体ごと吹き飛ばされた。それでも、${friendName()}の手だけは離さなかった。（HP-20）`, skHeart(8)]; } },
    ] },
  // ---- 6日目の昼：老人と桜 ----
  { id: 'f_old', phase: 'war', day: 6, slot: 0, after: 'hub', cond: () => skOn(),
    title: '老人と桜',
    text: () => `御影川の河川敷。釣り糸を垂れたまま、${CAST.old}が言った。<br>「……あの桜守の孫か。目元が、あいつにそっくりじゃ」<br>` +
      `「六十年前、壊れかけた聖杯から、魔力がこぼれた。放っておけば、街ごと呑まれておった。あいつは、それを城跡の桜に封じた。――自分の回路を鞘にしてな。それから四十年、あいつは一度も、この街を離れなんだ」<br>` +
      `「若いの。あの子を救う道は、三つある。桜を<b>断つ</b>か。鞘の務めを、誰かが<b>受け止める</b>か。……あるいは、桜に溜まった願いを、<b>還す</b>か。どれも、ただでは済まん」`,
    choices: [
      { label: '断つ ―― 桜を伐り、繋がりを断ち切る', hint: '備え：守り刀・根の要・霊脈の堰／幼馴染は助かるが、桜と結んだものも失われる', run: () => skChoose('cut') },
      { label: '受け止める ―― 鞘の務めを、自分が引き受ける', hint: '備え：桜守の術・回路の鍛錬・英霊への打ち明け／自分の時間を差し出す', run: () => skChoose('bear') },
      { label: '還す ―― 二人で、桜に願いを返す', hint: '備え：思い出の場所・約束・返し方／恋人か親友で、心の灯が60以上なら届く', run: () => skChoose('ret') },
      { label: 'まだ、決められない', hint: '「桜の謎を追う」から、後で選べる', run: () => ['「……そうか。じゃが、桜は待ってくれんぞ」', skClue('grandma', '桜守の務め', '六十年前、幼馴染の祖母は、壊れかけた聖杯の魔力を桜に封じ、自らの回路を鞘にして四十年抑え続けた。救う道は三つ――断つ・受け止める・還す。')] },
    ] },
  // ---- 7日目の昼：花喰い ----
  { id: 'f_devour', phase: 'war', day: 7, slot: 0, after: 'hub', cond: () => skOn() && !!frRival(),
    title: '花喰い', chapter: '第三幕　降臨',
    text: () => { const r = frRival();
      return `昼下がり、${friendName()}の拠点から、悲鳴のような魔力の爆発が届いた。<br>駆けつけた時には、もう遅かった。<br>` +
        `床を割って伸びた桜の根が、${r.cls}のサーヴァントの霊基に、幾重にも絡みついていた。霊基が、花びらになってほどけていく。その花びらが、すべて${friendName()}の体へ吸い込まれていく。<br>` +
        `<p class="quote">「${fg('……止まらない。止められないんだ。俺の中に、入ってくる――！', '……止まらない。止められないの。わたしの中に、入ってくる――！')}」</p>` +
        `${friendName()}の髪の一房が、白く染まっていた。見開いた瞳の奥に、薄紅色の光が揺れていた。`; },
    choices: [
      { label: () => `${friendName()}を、抱きしめる`, hint: '心の灯↑↑', cls: 'primary', run: () => { skDevour(); return [`花びらの嵐の中で、${friendName()}を抱きしめた。熱い。それでも、離さなかった。`, `「${fg('……ばか。危ないだろ', '……ばか。危ないよ')}」――震える声が、少しだけ、いつもの${friendName()}に戻った。`, skHeart(12)]; } },
      { label: () => gw('「しっかりしろ！ 自分の名前を言え！」', '「しっかりして！ 自分の名前を言って！」', '「しっかりして！ 自分の名前を言って！」'), hint: '心の灯↑', run: () => { skDevour(); return [`「${friendName()}${gw('だろ', 'でしょ', 'だよ')}！」何度も、名前を呼んだ。`, `${friendName()}は、うわごとのように自分の名前を繰り返し、やがて、ぐったりと目を閉じた。`, skHeart(8)]; } },
      { label: () => `${SV()}に、根を断ち切らせる`, hint: '英霊の判定・心の灯↓', run: () => { skDevour(); const c = schk(0, 60);
          return [c.text, c.ok ? `${SV()}の一撃が、根を断ち切った。けれど、もう遅かった。サーヴァントは消え、${friendName()}は、怯えたように${SV()}を見ていた。` : '根は、斬っても斬っても伸びてきた。', skHeart(-6)]; } },
    ] },
  // ---- 8日目の昼：花の声（会話で進む） ----
  { id: 'f_voice', phase: 'war', day: 8, slot: 0, after: 'hub', cond: () => skOn() && !!G.used.f_devour, title: '花の声' },
  // ---- 9日目の昼：散り際の手紙 ----
  { id: 'f_letter', phase: 'war', day: 9, slot: 0, after: 'hub', cond: () => skOn() && !!G.used.f_devour,
    title: '散り際の手紙',
    text: () => { G.flags.skGone = true;
      return `朝、郵便受けに、桜の花びらが一枚挟まった手紙が入っていた。見慣れた、${friendName()}の字だった。<br>` +
        `<p class="quote">「${fg('ごめん。もう、自分で自分を止められない。倒れた英霊が増えるたびに、俺の中に何かが溜まっていく。このままだと、俺はお前を傷つける。だから、桜の中で待ってる。――来るなよ。……来るなって書いたけど、本当は', 'ごめんね。もう、自分で自分を止められないの。倒れた英霊が増えるたびに、わたしの中に何かが溜まっていく。このままだと、わたしはあなたを傷つける。だから、桜の中で待ってる。――来ないで。……来ないでって書いたけど、本当は')}」</p>` +
        `手紙は、そこで途切れていた。<br>城跡公園の大桜は、昼なのに、薄紅色の霧に包まれていた。`; },
    choices: [
      { label: '「本当は」の続きを、聞きに行く', hint: '心の灯↑', cls: 'primary', run: () => ['霧の向こうに、桜の幹に背を預けて眠る人影が見えた気がした。近づこうとすると、霧が深くなる。――最後の夜まで、桜は誰も通さないつもりらしい。', `「必ず、迎えに行く」――霧に向かって、そう告げた。`, skHeart(8)] },
      { label: '手紙を、胸のポケットにしまう', hint: '精神↑', run: () => { gain('spi', 3); return ['手紙は、少しだけ温かかった。（精神+3）']; } },
    ] },
  // ---- 10日目の昼：花の夢（会話で進む） ----
  { id: 'f_dream', phase: 'war', day: 10, slot: 0, after: 'hub', cond: () => skOn() && !!G.used.f_letter, title: '花の夢' },
);
function skReaper() { let list = hostileRivals().filter(r => !r.friend); if (typeof rvReaperPick === 'function') list = rvReaperPick(list); return list.reduce((a, b) => (a.power >= b.power ? a : b)); }   // 六十年分の願いを欲しがる来歴のマスターが来やすい（data_rivals.js）
function skMenuNote() { return '<span class="note">昼の行動に「桜の謎を追う」が加わった。最後の夜までに、幼馴染を救う道を選び、備えよう。</span>'; }
function skAlly(h, extra) {
  const r = frRival(); r.ally = true; r.intel = 3; G.used.s_friend = true;
  addLog(`幼馴染・${G.friend.name}と同盟を結ぶ（幼馴染ルート）。`);
  return [extra || `${friendName()}は少しだけ泣きそうな顔で笑った。「${fg('……ああ。お前となら', '……うん。あなたとなら')}」`, `${r.cls}陣営と同盟を結んだ。サーヴァントの真名<b>${servantOf(r).name}</b>も教えてもらった。`, skHeart(h)];
}
function skDevour() {
  const r = frRival(); if (!r || r.devoured) return;
  r.alive = false; r.devoured = true; r.hp = 0; r.ally = false; sk().absorbed++;
  addLog(`幼馴染・${G.friend.name}のサーヴァントが、桜の根に呑まれる。`);
}
function skChoose(p) {
  const s = sk(); s.path = p; addLog(`幼馴染ルート：「${SK_PATHS[p]}」道を選ぶ。`);
  if (p === 'cut') tone('bold'); if (p === 'bear') tone('good'); if (p === 'ret') tone('good');
  const t = { cut: '「……断つか。桜守の蔵に、守り刀がある。桜の枝を削った刃じゃ。あいつが、最後の務めのために遺したものじゃろう」', bear: `「お前さんが、鞘になると？」${CAST.old}は、長いこと黙っていた。「……あいつも、同じ顔をしておった」`, ret: '「還す、か。……願いを叶えた桜に、願いを返す。誰もやったことはない。じゃが、あの子とお前さんなら、あるいは」' }[p];
  return [t, skClue('grandma', '桜守の務め', '六十年前、幼馴染の祖母は、壊れかけた聖杯の魔力を桜に封じ、自らの回路を鞘にして四十年抑え続けた。救う道は三つ――断つ・受け止める・還す。'),
    p === 'ret' && !frClose() ? `<span class="note">還す道は、${friendName()}と恋人か親友でなければ、最後に届かないかもしれない。</span>` : '', `<span class="note">道：<b>${SK_PATHS[p]}</b>。「桜の謎を追う」に、この道の備えが加わった。</span>`].filter(Boolean);
}

// ---- 毎朝：倒れた英霊の魂が、桜へ ----
function skDaily() {
  if (!skOn() || !G.used.f_devour) return;
  const s = sk(); const dead = (G.rivals || []).filter(r => !r.alive && !r.friend).length;
  if (dead > s.seenDead) { const n = dead - s.seenDead; s.seenDead = dead; s.absorbed += n; s.heart = clamp(s.heart - 3 * n, 0, 100);
    G.news.push(`倒れた英霊の魂が、御影川の霊脈を逆流して、城跡公園の桜へ流れ込んでいくのが分かった。――${friendName()}の中に、また一つ、何かが溜まった。（心の灯-${3 * n}）`); }
}
function skStatusHTML() {
  if (!skOn() || sk().outcome || !G.used.f_bloom) return '';
  const s = sk();
  return `<div class="wide kami-line"><span>願い桜</span>手がかり${s.ev}・${s.path ? `${SK_PATHS[s.path]}（備え${s.prep}/3）` : '道を未選択'}・${friendName()}の心の灯 ${s.heart}</div>`;
}

// =============================================================
//  会話：花の声（8日目）・花の夢（10日目）
// =============================================================
function skVoiceTalk(after) {
  G.used.f_voice = true; const n = friendName(); const L = myLaw();
  dialog({ title: '花の声', sub: 'STORY', then: after, steps: [
    { text: () => [`${n}の部屋は、桜の香りで満ちていた。ベッドの上で膝を抱えた${n}の髪は、半分ほどが白くなっていた。`,
        svSay(fg('「……来るなって、言っただろ。――なあ。俺、分かったんだ。俺が何になろうとしてるのか」', '「……来ないでって、言ったのに。――ねえ。わたし、分かったの。わたしが何になろうとしてるのか」')),
        svSay(fg('「聖杯だよ。倒れた英霊の魂が、桜を通って、俺の中に溜まっていく。全部溜まったら、俺は願いを叶える器になる。……すごいだろ。もう、熱も痛くないんだ」', '「聖杯だよ。倒れた英霊の魂が、桜を通って、わたしの中に溜まっていく。全部溜まったら、わたしは願いを叶える器になる。……すごいでしょ。もう、熱も痛くないの」')),
        `<p>${n}は笑っていた。その笑顔が、少しも笑っていないことに、あなたは気づいていた。</p>`],
      choices: [
        { label: () => `「${gw('すごくない。……怖いんだろ', 'すごくない。……怖いんでしょ', 'すごくない。……怖いんだろう')}」`, run: () => skHeart(10), reply: () => [meSay(gw('すごくない。……怖いんだろ', 'すごくない。……怖いんでしょ', 'すごくない。……怖いんだろう')), `<p>${n}の笑顔が、崩れた。</p>`, svSay(fg('「……怖いよ。怖いに決まってるだろ」', '「……怖いよ。怖いに決まってるでしょ」')), `<p>${n}は、あなたの胸に額を押しつけて、声を殺して泣いた。</p>`] },
        { label: L === 'law' ? '「必ず元に戻す。約束する」' : L === 'chaos' ? `「${gw('聖杯なんかになるな', '聖杯なんかにならないで', '聖杯なんかにならないで')}。そんなもの、どうでもいい」` : '「……隣に、いてもいい？」', hint: L === 'mid' ? '' : `${L === 'law' ? '秩序' : '混沌'}の言葉`, run: () => skHeart(8),
          reply: () => [meSay(L === 'law' ? '必ず元に戻す。約束する' : L === 'chaos' ? `${gw('聖杯なんかになるな', '聖杯なんかにならないで', '聖杯なんかにならないで')}。そんなもの、どうでもいい` : '……隣に、いてもいい？'), svSay(L === 'law' ? fg('「……お前の約束は、破られたことないもんな」', '「……あなたの約束は、破られたことないもんね」') : L === 'chaos' ? fg('「……どうでもいい、か。お前は、昔からそうだ」', '「……どうでもいい、かあ。あなたは、昔からそう」') : fg('「……勝手にしろ」', '「……勝手にすれば」')), `<p>${n}は、少しだけ、肩の力を抜いた。</p>`] },
        { label: () => `「……化け物になる前に、離れたほうがいいのかも${gw('な', 'ね', 'しれない')}」`, hint: '心の灯↓↓', run: () => skHeart(-15), reply: () => [meSay(`……化け物になる前に、離れたほうがいいのかも${gw('な', 'ね', 'しれない')}`), `<p>${n}は、何も言わなかった。ただ、ゆっくりと、あなたから目を逸らした。</p>`, svSay(fg('「……だよな」', '「……だよね」'))] },
      ] },
    { text: () => [svSay(G.flags.frSakura ? fg('「……なあ。九歳の春に、桜の下で、約束したよな。毎年ここで桜を見ようって」', '「……ねえ。九歳の春に、桜の下で、約束したよね。毎年ここで桜を見ようって」') : fg('「……なあ。六歳の夏のビー玉、まだ持ってるか」', '「……ねえ。六歳の夏のビー玉、まだ持ってる？」')),
        svSay(fg('「あの桜が、あの時の願いも、ちゃんと覚えてるんだ。……だから、俺がこうなっても、あの約束だけは、まだ俺の中にある」', '「あの桜が、あの時の願いも、ちゃんと覚えてるの。……だから、わたしがこうなっても、あの約束だけは、まだわたしの中にある」'))],
      choices: [
        { label: '「覚えてる。全部」', run: () => skHeart(6), reply: () => [meSay('覚えてる。全部'), svSay(fg('「……そっか」', '「……そっか」')), `<p>${n}は、目を閉じた。その横顔は、${G.flags.frSakura ? '九歳の春' : '六歳の夏'}と、何も変わっていなかった。</p>`] },
        { label: '「その約束で、必ず引き戻す」', hint: '還す道への手がかり', run: () => { skHeart(6); G.flags.skPromiseKey = true; }, reply: () => [meSay('その約束で、必ず引き戻す'), svSay(fg('「……ばか。そういうの、ずるいって言ってんだよ」', '「……ばか。そういうの、ずるいって言ってるの」')), skClue('promise', '約束の残り香', '桜は、二人が幼い頃に交わした願いも覚えている。その約束だけは、変わりゆく幼馴染の中にも残っている。')] },
      ] },
  ] });
}
function skDreamTalk(after) {
  G.used.f_dream = true; const n = friendName();
  dialog({ title: '花の夢', sub: 'STORY', then: after, steps: [
    { text: () => [`夢の中で、満開の桜の下に立っていた。花びらが、音もなく降り続けている。<br>幹にもたれて、${n}が座っていた。髪は真っ白で、瞳は桜色だった。`,
        svSay(fg('「……来るなって言ったのに。夢の中まで来るなよ」', '「……来ないでって言ったのに。夢の中まで来ないでよ」')),
        svSay(fg(`「明日の夜、全部が終わる。最後の英霊が倒れたら、俺は聖杯になる。……その時、俺がお前に何をするか、俺にも分からない」`, `「明日の夜、全部が終わる。最後の英霊が倒れたら、わたしは聖杯になる。……その時、わたしがあなたに何をするか、わたしにも分からない」`))],
      choices: [
        { label: '「何をされても、迎えに行く」', run: () => skHeart(10), reply: () => [meSay('何をされても、迎えに行く'), svSay(fg('「……本当に、ばかだな」', '「……本当に、ばかだね」')), `<p>${n}は、子どもみたいに笑った。</p>`] },
        { label: frLover() ? '「好きだよ。聖杯になっても、変わらない」' : frRel() === 'best' ? `「親友${gw('だろ', 'でしょ', 'だよ')}。見捨てるわけない」` : `「幼馴染${gw('だろ。放っておけるか', 'でしょ。放っておけるわけない', 'だよ。放っておけるわけない')}」`, hint: `「${frRelName()}」として`, cls: 'primary', run: () => skHeart(12),
          reply: () => [meSay(frLover() ? '好きだよ。聖杯になっても、変わらない' : frRel() === 'best' ? `親友${gw('だろ', 'でしょ', 'だよ')}。見捨てるわけない` : `幼馴染${gw('だろ。放っておけるか', 'でしょ。放っておけるわけない', 'だよ。放っておけるわけない')}`),
            svSay(frLover() ? fg('「……俺も。俺も、ずっと好きだった。――だから、怖いんだよ」', '「……わたしも。わたしも、ずっと好きだった。――だから、怖いの」') : frRel() === 'best' ? fg('「……親友、か。一生有効、だったな」', '「……親友、かあ。一生有効、だったね」') : fg('「……腐れ縁だな」', '「……腐れ縁だね」')),
            `<p>${n}の頬を、桜色の涙が伝った。</p>`] },
        { label: '「……もし、どうしても戻れなかったら」', hint: '討つ覚悟', run: () => { G.flags.skKillResolve = true; skHeart(-5); }, reply: () => [meSay('……もし、どうしても戻れなかったら'), `<p>言いかけた言葉を、${n}が遮った。</p>`, svSay(fg('「その時は、お前の手で終わらせてくれ。……他の誰かじゃ、嫌だ」', '「その時は、あなたの手で終わらせて。……他の誰かじゃ、嫌だ」'))] },
      ] },
    { text: () => [`<p>目を覚ますと、窓の外で、季節外れの桜の花びらが一枚、舞っていた。</p>`, `<span class="note">${n}の心の灯：${sk().heart}${sk().path === 'ret' ? (skRetOk() ? '（還す道は、届くはずだ）' : frClose() ? '（還す道には、まだ足りない。60以上が要る）' : '（還す道は、恋人か親友でなければ届かない）') : ''}</span>`] },
  ] });
}
{ const v = STORY.find(s => s.id === 'f_voice'); if (v) v.dialog = after => skVoiceTalk(after); const d = STORY.find(s => s.id === 'f_dream'); if (d) d.dialog = after => skDreamTalk(after); }

// =============================================================
//  昼の行動「桜の謎を追う」
// =============================================================
const SK_SITES = [
  { id: 'root', name: '大桜の根元', lead: '城跡公園の大桜。根は、どこまで伸びているのだろう。', ways: [{ label: '根の流れを霊視する', stat: 'mag', diff: 56 }, { label: '根元の土を掘って調べる', stat: 'int', diff: 54 }],
    clue: ['根の行き先', '大桜の根は地下で御影川の霊脈に繋がり、その先は天降山――聖杯の降りる場所へ続いている。桜と聖杯は、霊脈で結ばれている。'] },
  { id: 'hospital', name: '市立病院の記録', lead: () => `${friendName()}が通っていた病院。熱の記録が残っているはずだ。`, ways: [{ label: '主治医に話を聞く', stat: 'cha', diff: 54 }, { label: 'カルテの写しを読み解く', stat: 'int', diff: 56 }],
    clue: ['熱の記録', '幼馴染の原因不明の発熱は、祖母が亡くなった年から始まり、毎年、大桜が咲く日と同じ日に起きていた。'] },
  { id: 'library', name: '図書館の郷土史', lead: '城跡にまつわる古い言い伝えを探す。', ways: [{ label: '郷土史を読み込む', stat: 'int', diff: 52 }, { label: '書庫の奥を、勘で探す', stat: 'luk', diff: 55 }],
    clue: ['願い桜の伝説', '城跡の大桜は、昔から「願い桜」と呼ばれていた。根元で願えば叶う。ただし、桜守がいなくなれば、桜は人を喰う――そう書かれていた。'] },
  { id: 'river', name: '御影川の霊脈', lead: '天降山から街へ流れる霊脈。何かが逆に流れている。', ways: [{ label: '川辺で霊脈を読む', stat: 'mag', diff: 58 }, { label: '上流まで辿って歩く', stat: 'phy', diff: 56 }],
    clue: ['逆流する霊脈', '聖杯戦争が始まってから、霊脈が天降山から城跡の桜へ逆流している。倒れた英霊の魂も、この流れに乗って桜へ運ばれている。'] },
  { id: 'diary', name: '桜守日誌の続き', lead: '祖母の日記の、まだ読んでいない頁。', cond: () => !!G.used.f_kura, ways: [{ label: '崩れた字を読み解く', stat: 'int', diff: 56 }, { label: '書いた人の想いを辿る', stat: 'spi', diff: 54 }],
    clue: ['鞘の重さ', '鞘となった桜守は、桜に溜まった願いの重さを、生涯その身に受け続ける。祖母の晩年の字は、ひどく震えていた。それでも最後の頁には「孫と桜を見た。幸せだった」とあった。'] },
  { id: 'night', name: '夜桜', lead: '夜の大桜。最も危険で、最も多くを語る時間。', night: true, ways: [{ label: () => `${SV()}に、夜桜の気配を探らせる`, sv: 3, diff: 60 }, { label: '花の下で、心を澄ます', stat: 'spi', diff: 60 }],
    clue: ['花の声', () => `夜の桜の中で、${friendName()}の声が聞こえた。「たすけて」と「ほっといて」が、交互に繰り返されていた。`] },
];
const SK_TASKS = {
  cut: [
    { id: 'blade', name: '祖母の守り刀を探す', hint: '知力判定（桜守の蔵）', stat: 'int', diff: 56, run: () => '蔵の床下に、桜の枝を削った短刀が隠されていた。柄に、祖母の字で「最後の務めに」とある。――桜を断つための刃だ。' },
    { id: 'root', name: '根の要を見つける', hint: () => `${SV()}の敏捷判定（夜の公園へ）`, sv: 2, diff: 58, run: () => `${SV()}が、無数の根の中から、一本だけ脈打つ太い根を見つけ出した。桜の心臓――断つなら、ここだ。` },
    { id: 'dam', name: '霊脈を堰き止める結界を張る', hint: '魔力判定', stat: 'mag', diff: 58, run: () => '御影川の四か所に杭を打ち、霊脈の流れを一時的に堰き止める結界を仕込んだ。桜は、聖杯からの力を汲めなくなる。' },
  ],
  bear: [
    { id: 'art', name: '桜守の術を学ぶ', hint: '知力判定（日誌から）', stat: 'int', diff: 56, run: () => '日誌の術式を、夜通し書き写した。他人の回路を、自分の回路に繋ぎ替える術。――桜守が、鞘を受け継ぐための術だ。' },
    { id: 'circuit', name: '魔術回路を鍛え直す', hint: '魔力判定', stat: 'mag', diff: 58, run: () => '回路が焼けつくまで、魔力を通し続けた。桜の重さに耐えられる器に、少しでも近づくために。' },
    { id: 'vow', name: () => `${SV()}に、覚悟を打ち明ける`, hint: '絆（自分の時間を差し出すことになる）', run: () => { const b = G.servant.bond; bond(3); return b >= 50 ? `${SV()}は長いこと黙っていた。${say('withYou')}` : `${SV()}は、何も言わずに背を向けた。……それでも、止めはしなかった。`; } },
  ],
  ret: [
    { id: 'memory', name: '二人の思い出の場所を巡る', hint: '交渉判定・心の灯↑', stat: 'cha', diff: 50, run: () => `ゲームセンター、通学路、駄菓子屋の跡地。一つ巡るたびに、霧の向こうの桜が、かすかに揺れた気がした。${skHeart(8)}` },
    { id: 'promise', name: () => G.flags.frSakura ? 'あの日の約束を、言葉にし直す' : '新しい約束を、言葉にする', hint: '精神判定・心の灯↑', stat: 'spi', diff: 54, run: () => `${G.flags.frSakura ? '九歳の春の約束を、' : '新しい約束を、'}紙に書いて、桜の枝に結んだ。「来年も、再来年も、ここで」${skHeart(8)}` },
    { id: 'way', name: '願いの返し方を調べる', hint: '知力判定（郷土史と日誌）', stat: 'int', diff: 56, run: () => '願い桜に願いを返すには、願った者同士が、桜の前で「もう、叶えてもらわなくていい」と告げること。――ただし、心が残っていなければ、声は届かない。' },
  ],
};
function skMenu() {
  const s = sk(); const night = isNight(); const choices = [];
  for (const st of SK_SITES) {
    if (s.done[st.id] || (st.cond && !st.cond()) || (st.night && !night)) continue;
    choices.push({ label: typeof st.name === 'function' ? st.name() : st.name, hint: st.night ? '夜だけ調べられる・危険' : '調査（技能を選んで判定）', icon: 'study', fn: () => skSiteMenu(st) });
  }
  if (!s.path && s.ev >= 3 && G.used.f_old) choices.push({ label: () => `${friendName()}を救う道を選ぶ`, hint: '断つ・受け止める・還す', cls: 'primary', fn: () => scene({ title: '選ぶ道', sub: '願い桜', body: ['<p>どの道を選んでも、ただでは済まない。――けれど、選ばなければ、あの子は聖杯になる。</p>'],
    choices: [...Object.keys(SK_PATHS).map(p => ({ label: SK_PATHS[p], fn: () => next('選ぶ道', paras(skChoose(p)), hub) })), { label: 'やめる', fn: hub }] }) });
  if (s.path) for (const t of SK_TASKS[s.path]) { if (s.tasks[t.id]) continue;
    choices.push({ label: () => `【備え】${typeof t.name === 'function' ? t.name() : t.name}`, hint: typeof t.hint === 'function' ? t.hint() : t.hint, cls: 'primary', fn: () => skTask(t) }); }
  const status = `<p class="note">手がかり ${s.ev}／道：${s.path ? `<b>${SK_PATHS[s.path]}</b>（備え ${s.prep}/3）` : s.ev >= 3 && G.used.f_old ? 'まだ選んでいない' : '手がかりを集めよう（3つ以上）'}／${friendName()}の心の灯 ${s.heart}</p>`;
  const notes = s.clues.length ? `<ul class="clue-list">${s.clues.map(c => `<li><b>${c.title}</b>　${c.text}</li>`).join('')}</ul>` : '<p>まだ、桜の記録は何もない。</p>';
  submenu('桜の謎を追う', '願い桜', [status, notes], choices);
}
function skSiteMenu(st) {
  const nm = typeof st.name === 'function' ? st.name() : st.name; const easy = G.flags.leyline ? 4 : 0;
  submenu(nm, '願い桜', [`<p>${typeof st.lead === 'function' ? st.lead() : st.lead}</p>`], st.ways.map(w => { const diff = w.diff - easy; const lab = typeof w.label === 'function' ? w.label() : w.label;
    return { label: lab, hint: `${w.sv !== undefined ? `${SV()}・${PARAM_NAMES[w.sv]}` : STAT_LABEL[w.stat]}判定 目標${diff}`, fn: () => actResult(nm, () => {
      const c = w.sv !== undefined ? schk(w.sv, diff) : chk(w.stat, diff);
      if (!c.ok) { if (c.margin <= -25 && st.night) { shp(-12); return [c.text, '夜桜の花びらが、刃のように吹きつけた。英霊が身を挺して庇った。（英霊のHP-12）']; } return [c.text, '何も掴めなかった。日を改めよう。']; }
      sk().done[st.id] = true; const [t, body] = st.clue; const text = typeof body === 'function' ? body() : body;
      return [c.text, text, skClue(st.id, t, text)]; }) }; }));
}
function skTask(t) {
  const nm = typeof t.name === 'function' ? t.name() : t.name;
  actResult(nm, () => { const s = sk();
    if (!t.stat && t.sv === undefined) { s.tasks[t.id] = true; s.prep++; return [t.run(true), `<span class="note">備え ${s.prep}/3</span>`]; }
    const c = t.sv !== undefined ? schk(t.sv, t.diff) : chk(t.stat, t.diff);
    if (!c.ok) return [c.text, 'うまくいかなかった。日を改めて、もう一度。'];
    s.tasks[t.id] = true; s.prep++; return [c.text, t.run(true), `<span class="note">備え ${s.prep}/3</span>`]; });
}
// 会いに行く（幼馴染ルート）
function skVisit() {
  actResult('幼馴染', () => { const n = friendName(); friend(4); gain('spi', 2);
    const after = !!G.used.f_devour;
    const lines = after ? [`${n}は、窓辺で白くなった髪を指に巻きつけていた。「${fg('……変だろ', '……変でしょ')}」と笑う${n}の隣に、黙って座った。`, `${n}が、あなたの手を握ったまま眠ってしまった。その手は、まだ、人の温かさだった。`]
      : [`${n}と、桜の下で缶コーヒーを飲んだ。一輪だけの花が、二人の上で揺れていた。`, `${n}の拠点で、作戦会議という名目のお茶会をした。${SV()}と${frRival() ? frRival().cls : ''}のサーヴァントが、無言で睨み合っている。二人で、こっそり笑った。`];
    return [pick(lines), skHeart(5), '<span class="note">（精神+2）</span>']; });
}

// =============================================================
//  最後の夜：花冠の杯（ending.js の victoryScene から）
// =============================================================
function skFinale() {
  G.phase = 'end'; const s = sk(); const n = friendName(); const p = s.path; const breath = typeof finalBreath === 'function' ? finalBreath() : '';
  const choices = [];
  if (p === 'cut') choices.push({ label: '桜を、断つ', hint: `備え ${s.prep}/3・守り刀で、桜と${n}の繋がりを断ち切る`, cls: 'primary', fn: () => skBattle('cut') });
  if (p === 'bear') choices.push({ label: '繋がりを、引き受ける', hint: `備え ${s.prep}/3・${n}に近づき、鞘の務めを受け継ぐ`, cls: 'primary', fn: () => skBattle('bear') });
  if (p === 'ret') choices.push({ label: 'あの日の約束で、呼び戻す', hint: skRetOk() ? `備え ${s.prep}/3・二人で、桜に願いを返す` : frClose() ? `心の灯が足りない（${s.heart}/60）` : '恋人か親友でなければ、声は届かない', cls: 'primary', disabled: !skRetOk(), fn: () => skBattle('ret') });
  if (!p) choices.push({ label: () => `${n}を、止める`, hint: '備えのない戦い', cls: 'danger', fn: () => skBattle('none') });
  choices.push({ label: '……討つ', hint: `${n}ごと、聖杯を終わらせる`, cls: 'danger', fn: () => skBattle('kill') });
  const bright = s.heart >= 60;
  scene({ title: '花冠の杯', sub: '第三幕　降臨', reveal: true, body: paras([
    '最後の英霊が消えた夜。聖杯は、天降山には降りなかった。',
    `霊脈が逆流する。光の奔流が御影川を下り、城跡公園の大桜へ――。満開の桜が、夜空を覆うほどに枝を広げていた。`,
    `桜の幹から、人影が歩み出た。${fg('白い髪の少年', '白い髪の少女')}。桜色の瞳。花びらでできた冠を戴き、その胸の奥で、倒れた英霊たちの魂が脈打っている。――<b>花冠の杯</b>。`,
    `<p class="quote">「${bright ? fg('……来ちまったのか。来るなって、書いたのに', '……来ちゃったんだ。来ないでって、書いたのに') : fg('……誰だ、お前。……いや、知ってる。知ってる、はずなのに', '……だれ、あなた。……ううん、知ってる。知ってる、はずなのに')}」</p>`,
    `<p class="quote">「${fg('見ろよ。全部、叶うんだ。願いも、痛みも、全部俺が呑み込んでやる。――お前も、ここにいろよ。ずっと', '見て。全部、叶うんだよ。願いも、痛みも、全部わたしが呑み込んであげる。――あなたも、ここにいて。ずっと')}」</p>`,
    `${SV()}が、あなたの前に立った。${say('stayBack')}`, breath,
    `<span class="note">花冠の杯との決戦。${SV()} HP ${G.servant.hp}/${servantHpMax()}・魔力 ${G.servant.mp}　令呪 ${G.master.seals}画。撤退はできない。${n}の心の灯：${s.heart}</span>`,
  ]), choices });
}
function skBattle(mode) {
  const s = sk(); s.mode = mode;
  // 体力：備えと心の灯（討つ時は心の灯は関係ない）で弱まり、呑んだ英霊の数で強まる。力：備えで弱まる
  const base = { cut: 150, bear: 145, ret: 125, kill: 165, none: 175 }[mode];
  const hp = Math.max(80, base - s.prep * 15 - (mode === 'kill' ? 0 : Math.round(s.heart * 0.4)) + s.absorbed * 2 - (G.flags.resolve === 'friend' ? 15 : 0));
  const r = { id: 'sakura_cup', cls: '聖杯', servantId: 'sakura_cup', master: '―', type: '', quote: '', power: Math.max(3, 7 - s.prep - (mode !== 'kill' && s.heart >= 70 ? 1 : 0)), aggr: 1, alive: true,
    hp, hpMax: hp, mp: 100, intel: 3, clues: 0, seals: 0, ally: false, named: true };
  B = null; startBattle(r, { boss: true, sakura: mode, final: true });
}
function skWin(mode) {
  const s = sk(); B = null; sfx('win'); const n = friendName();
  if (mode === 'kill') { s.outcome = 'kill'; return ending('skKill'); }
  if (mode === 'none') return scene({ title: '花冠の杯', sub: 'FINAL', reveal: true, body: paras([`花びらの嵐が止んだ。膝をついた${n}が、あなたを見上げていた。桜色の瞳が、揺れている。`, '備えは、何もない。できることは、二つだけだった。']), choices: [
    { label: '……とどめを刺す', cls: 'danger', fn: () => { s.outcome = 'kill'; ending('skKill'); } },
    { label: () => `${SV()}に、桜の根を断たせる`, hint: '繋がりを、力ずくで断ち切る', fn: () => { s.outcome = 'cut'; ending('skCut'); } }] });
  if (mode === 'cut') { s.outcome = 'cut'; return ending('skCut'); }
  if (mode === 'bear') { s.outcome = 'bear'; return ending('skBear'); }
  // 還す：二人で、桜に願いを返す
  dialog({ title: '花還し', sub: 'FINAL', then: () => { s.outcome = 'ret'; ending('skReturn'); }, last: '結末へ', steps: [
    { text: () => [`花びらの嵐の中を、一歩ずつ進んだ。膝をついた${n}の前に、しゃがみこむ。`, svSay(fg('「……来るなよ。俺、もう、お前のこと、よく分からないんだ」', '「……来ないで。わたし、もう、あなたのこと、よく分からないの」')), `<p>あなたは、${n}の手を取った。冷たい手だった。</p>`],
      choices: [
        { label: G.flags.frSakura ? '「来年も、再来年も、ここで桜を見よう」' : '「ビー玉、まだ持ってるよ」', reply: () => [meSay(G.flags.frSakura ? '来年も、再来年も、ここで桜を見よう' : 'ビー玉、まだ持ってるよ'), `<p>${n}の桜色の瞳が、大きく見開かれた。</p>`, svSay(fg('「……それ、九歳の――」', '「……それ、九歳の――」'))] },
        { label: () => frLover() ? '「好きだよ。帰ってきて」' : `「親友${gw('だろ。帰ってこい', 'でしょ。帰ってきて', 'だよ。帰ってきて')}」`, reply: () => [meSay(frLover() ? '好きだよ。帰ってきて' : `親友${gw('だろ。帰ってこい', 'でしょ。帰ってきて', 'だよ。帰ってきて')}`), `<p>${n}の瞳から、桜色の涙が一粒こぼれた。</p>`] },
      ] },
    { text: () => [`<p>${n}の手を握ったまま、二人で桜を見上げた。</p>`, meSay('……もう、叶えてもらわなくていい。一緒にいるのは、自分たちで決めるから'),
        svSay(fg('「……ああ。もう、いいんだ。ありがとな、ばあちゃんの桜」', '「……うん。もう、いいの。ありがとう、おばあちゃんの桜」')),
        `<p>桜が、震えた。六十年分の願いが、光の粒になって夜空へほどけていく。${n}の髪から白が抜け、瞳の桜色が消えていく。</p><p>最後の花びらが散った時、腕の中にいたのは、ただの${n}だった。</p>`] },
  ] });
}
function skLose() { B = null; sk().outcome = 'sleep'; ending('skSleep'); }

// =============================================================
//  結末
// =============================================================
function skEndingTexts(sv) {
  if (!G.friend) return {};
  const n = friendName(); const s = sv ? sv.short : '';
  return {
    skCut: () => ({ title: '終幕：散る桜', text: [`<p>祖母の守り刀が、桜の心臓を貫いた。大桜は、長い長い溜め息のように花を散らし、夜明けとともに、ただの枯れ木になった。</p>`,
      `<p>${n}は、桜の根元で眠っていた。髪は元の色に戻り、回路の熱も、もうない。――魔術回路そのものが、焼き切れていた。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`,
      `<p>数日後、病室で目を覚ました${n}は、見舞いに来たあなたを見て、首を傾げた。</p><p class="quote">「${fg('……ええと。どこかで、会ったっけ？', '……ええと。どこかで、会ったこと、ある？')}」</p>`,
      '<p>桜が叶えた願いは、桜と一緒に散った。――あの桜の下で重ねた年月も、一緒に。</p>'] }),
    skBear: () => ({ title: '終幕：代価の人', text: [`<p>${n}の胸に手を当て、桜守の術を唱えた。桜色の光が、${n}の回路から、あなたの回路へ流れ込んでくる。焼けるように熱い。それでも、手を離さなかった。</p>`,
      `<p>花冠が崩れ、${n}の髪から白が抜けていく。最後に残った花びらが、あなたの手の甲――令呪のあった場所に、薄紅色の痣になって残った。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`,
      `<p>あなたは、新しい桜守になった。桜は鎮まり、${n}の回路は、もう暴れない。――その代わり、あなたの時間は、少しずつ桜に注がれていく。</p>`,
      `<p class="quote">「${fg('……なんで、お前が背負うんだよ', '……なんで、あなたが背負うの')}」泣きじゃくる${n}に、あなたは笑って答えた。「一緒にいるためだよ」</p>`] }),
    skReturn: () => ({ title: '終幕：花還し', text: ['<p>夜が明けた時、城跡公園の大桜は、静かに枯れていた。六十年分の願いは、すべて空へ還った。</p>',
      `<p>${n}は、あなたの隣で眠っていた。回路の熱は、もうない。桜守の血は、もう桜に呼ばれない。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`,
      `<p>春。枯れた大桜の隣に、二人で小さな若木を植えた。<br>「${fg('……今度は、願いなんかかけないで、ただ見ような', '……今度は、願いなんかかけないで、ただ見ようね')}」<br>${n}が、土のついた手で笑った。</p>`] }),
    skKill: () => ({ title: '終幕：花葬', text: [`<p>${s}の一撃が、花冠を砕いた。七騎分の魂が光になって散り、${n}の体が、ゆっくりと、あなたの腕の中に倒れ込んだ。</p>`,
      `<p class="quote">「${G.flags.skKillResolve ? fg('……ありがとな。お前の手で、よかった', '……ありがとう。あなたの手で、よかった') : fg('……ごめんな。最後まで、迷惑かけて', '……ごめんね。最後まで、迷惑かけて')}」</p>`,
      `<p>最後の言葉は、それだけだった。${n}の体は、桜の花びらになって、夜明けの風にほどけていった。</p>`,
      `<p class="quote">${farewellLine(sv)}</p>`, '<p>街は救われた。聖杯は、もうどこにもない。――大桜は、その春から、二度と咲かなかった。</p>',
      '<p class="note">ヒント：心の灯を守り、救う道を選んで備えれば、別の結末に辿り着けるかもしれない。</p>'] }),
    skSleep: () => ({ title: '終幕：桜の眠り', text: [`<p>${s}が、膝をついた。花びらが、あなたを、${s}を、街を、やさしく埋めていく。</p>`,
      `<p>春の夢の中で、あなたは${n}と並んで、満開の桜を見上げている。ずっと、ずっと。――誰も、目を覚まさない。</p>`,
      '<p class="note">ヒント：「桜の謎を追う」で手がかりを集め、救う道を選び、備えを整えよう。心の灯が高いほど、花冠の杯は弱まる。</p>'] }),
  };
}
// 最後の会話（data_dialog.js）の、場面のはじまり
const SK_LEADS = { skCut: '枯れた大桜の下で、夜が明けようとしていた。', skBear: '鎮まった大桜の下で、夜が明けようとしていた。', skReturn: '枯れた大桜の下で、二人で朝日を見ていた。', skKill: '花びらの雨が止み、夜が明けようとしていた。' };

// =============================================================
//  エピローグの章
// =============================================================
const SK_EPI = {
  // 散る桜：幼馴染は、あなたを覚えていない
  hello: { y: 1, title: 'はじめまして',
    text: () => `春。退院した${friendName()}と、城跡公園ですれ違った。枯れた大桜の前で、${friendName()}は足を止めていた。<br>「${fg('……変だよな。この木を見ると、なんか、胸が痛いんだ', '……変だよね。この木を見ると、なんだか、胸が痛いの')}」`,
    choices: [
      { label: '「はじめまして」と声をかける', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, '記憶をなくした幼馴染と、もう一度出会った') || `「${fg('……はじめまして。――あれ、なんで俺、泣いてるんだろ', '……はじめまして。――あれ、なんでわたし、泣いてるんだろ')}」` },
      { label: '何も言わずに、見守る', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '記憶をなくした幼馴染を、遠くから見守った') || `${friendName()}は、しばらく桜を見上げて、それから、春の人混みの中へ歩いていった。` },
    ] },
  again: { y: 6, title: 'もう一度、最初から',
    text: () => `出会い直してから、五年。${friendName()}とは、いつの間にか、毎週のように会う仲になっていた。<br>ある日、${friendName()}がぽつりと言った。「${fg('……なあ。俺たち、前にも、こうしてた気がするんだ', '……ねえ。わたしたち、前にも、こうしてた気がするの')}」`,
    choices: [
      { label: '「そうかもね」と笑う', hint: '幸福↑↑', run: () => epiGain({ joy: 3 }, '幼馴染と、もう一度、同じ時間を重ねた') || '二人で、枯れた大桜の跡に植えた若木を見に行った。小さな枝に、蕾が一つだけついていた。' },
      { label: 'あの冬のことを、少しだけ話す', hint: '絆↑', run: () => epiGain({ bond: 2, joy: 1 }, '幼馴染に、あの冬のことを話した') || `${friendName()}は、黙って最後まで聞いてくれた。「${fg('……覚えてないけど、信じるよ。お前が言うなら', '……覚えてないけど、信じる。あなたが言うなら')}」` },
    ] },
  // 代価の人：あなたの人生は短い
  keeper: { y: 3, title: '桜守の朝',
    text: () => `毎朝、城跡公園の大桜に手を当てる。手の甲の薄紅色の痣が、ちりちりと疼く。<br>桜は静かだ。その静けさを守るために、あなたの時間が、少しずつ注がれていく。<br>隣で、${friendName()}が、あなたの手に自分の手を重ねた。`,
    choices: [
      { label: '「平気だよ」と笑う', hint: '幸福↑', run: () => epiGain({ joy: 2, bond: 1 }, '桜守として、桜を鎮め続けた') || `「${fg('……嘘つけ', '……嘘つき')}」${friendName()}は、そう言って、あなたの肩にもたれた。` },
      { label: '桜守の術を、記録に残す', hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '桜守の術を、記録に残した') || 'いつか、誰も鞘にならずに済む日のために。日誌の新しい頁を、あなたの字が埋めていく。' },
    ] },
  bearEnd: { y: 22, title: '桜の下の最期', final: true,
    text: () => `${epiAgeLabel()}。あの冬から、まだ二十年ほどしか経っていない。けれど、あなたの時間は、もうほとんど残っていなかった。<br>満開の大桜の下。${friendName()}が、あなたの手を握っている。<br>「${fg('……来年も、再来年も、ここで見るんだろ。約束だろ', '……来年も、再来年も、ここで見るんでしょ。約束でしょ')}」`,
    choices: [
      { label: '「来年は、一人で見て。……ちゃんと、見てて」', hint: '最後の言葉', run: () => epiGain({ legacy: 3, bond: 1 }, '桜の下で、生涯を閉じた') || `花びらが、あなたの上に降り積もっていく。――その年から、大桜は、もう誰の時間も吸わなくなった。最後の桜守が、桜と一緒に眠ったから。` },
      { label: () => `${SVN()}の名を呼ぶ`, hint: '最後の言葉', run: () => epiGain({ bond: 3 }, '最後に英霊の名を呼んだ') || `遠くで、${SV()}の声が聞こえた気がした。花びらの向こうで、誰かが手を差し伸べていた。` },
    ] },
  // 花還し
  sapling: { y: 3, title: '若木',
    text: () => `枯れた大桜の隣に植えた若木が、初めて花をつけた。ほんの三つ、四つ。<br>「${fg('……ちっちゃいな', '……ちっちゃいね')}」${friendName()}が笑う。回路の熱は、あの冬から一度も出ていない。`,
    choices: [
      { label: '「願いは、かけないでおこう」', hint: '幸福↑↑', run: () => epiGain({ joy: 3 }, '願いをかけない桜を、二人で見上げた') || '二人で、ただ黙って、小さな花を見上げた。それで、十分だった。' },
      { label: '祖母の墓に、報告に行く', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '桜守の墓に、報告した') || `墓前で、${friendName()}が手を合わせた。「${fg('ばあちゃん。もう、鞘はいらないよ', 'おばあちゃん。もう、鞘はいらないよ')}」` },
    ] },
  // 花葬
  grave: { y: 1, title: '咲かない桜',
    text: () => `あの冬から、初めての春。城跡公園の大桜は、一輪も咲かなかった。<br>根元に、花を一輪だけ供えた。${friendName()}が好きだった、黄色いフリージアだった。`,
    choices: [
      { label: '「来年も、来るよ」', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, '咲かない桜の下に、毎年通った') || '返事はなかった。けれど、風が一度だけ、枯れ枝を揺らした。' },
      { label: '桜守の日誌を、引き継ぐ', hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '桜守の日誌を引き継いだ') || '二度と、誰も桜の鞘にならずに済むように。日誌の続きを、あなたが書いていく。' },
    ] },
};
// friendEpiSteps（data_friend_epi.js）から：幼馴染ルートの結末なら、専用の章に置き換える
function skFriendEpi(kind) {
  if (kind === 'skCut') return [SK_EPI.hello, SK_EPI.again];
  if (kind === 'skBear') return [FRIEND_EPI.spring, SK_EPI.keeper, FRIEND_EPI.propose];
  if (kind === 'skReturn') return [FRIEND_EPI.spring, SK_EPI.sapling, FRIEND_EPI.propose, FRIEND_EPI.path, FRIEND_EPI.wedding, FRIEND_EPI.old];
  if (kind === 'skKill') return [SK_EPI.grave];
  return null;
}
// 代価の人：人生が短くなる（startEpilogue から）
function skEpiAdjust(kind, steps) {
  if (kind !== 'skBear') return;
  for (let i = steps.length - 1; i >= 0; i--) if (steps[i].y > 20 || steps[i].final) steps.splice(i, 1);
  steps.push(SK_EPI.bearEnd);
}
