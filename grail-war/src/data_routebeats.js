// =============================================================
//  data_routebeats.js … 三つのルートの長さと山場を揃える（ルート固有の物語の場面）
//
//  ルート固有の物語の場面の数を、いちばん多い幼馴染ルート（9場面＋決戦前夜＋最後の敵）に揃える。
//   ・英霊ルート（商店街）：聖杯の真相の4場面に、英霊が主役の5場面を足す（すべて会話で進む）
//      5日目の昼  伝承の向こう側  …… 図書館で、英霊が自分の伝承に出会う
//      6日目の昼  英霊の勘        …… 昏睡事件の現場に残った痕を、英霊が嗅ぎ当てる（犯人の来歴の手がかり）
//      7日目の夜  背中を預ける夜  …… 帰り道の襲撃。英霊と背中を合わせて切り抜ける
//      8日目の夜  願いの在処      …… 六十年前の真実を知った夜、英霊の願いを聞く
//     10日目の昼  最後の昼        …… 決戦の前の日、英霊と街を歩く
//   ・雫ルート（静かな祠）：天降の祟り・抑止の守護者の7場面に、3場面を足す
//      4日目の昼  社務所の古文書  …… 霧の夜の前。塗り潰された初代の巫女の頁（白妙の伏線）。土地の名家の当主が訪ねてくることも
//      9日目の昼  迎えの前日      …… 隠り世に連れ去られた雫を迎えに行く前の日
//     12日目の昼  最後の昼        …… 抑止の守護者が来る日の昼、雫と英霊と三人で
//  英霊ルートの場面は、通常のシナリオの英霊ルートだけ（特殊シナリオには、それぞれの物語がある）
// =============================================================

const isSvRoute = () => !!G && G.route3 === 'servant';
// 英霊の口調ごとの一言（vl：data_dialog.js）
const RB = {
  legendOpen: { polite: '「……後世の人々は、こう語り継いでいるのですね。少し、面映ゆいです」', regal: '「ほう。{I}の伝承か。……ふん、肝心なところが抜けておる」',
    rough: '「うわ、{I}の話かよ。……なんか、盛られてねえか、これ」', cool: '「……{I}の記録か。知らない誰かの話を読んでいるようだ」',
    bright: '「見て見て！ {I}、本になってる！ ……でも、絵、あんまり似てないなあ」', old: '「ほっほ。{I}の話が、子どもの本にのう。……長生きはするものじゃ。もう死んでおるが」',
    mute: '{s}は、表紙の絵を、長いこと黙って見つめていた。' },
  legendTrue: { polite: '「……伝承より、ずっと不器用でした。迷ってばかりで。――ですが、選んだことに悔いはありません」', regal: '「本当、か。……王とは、本に書かれぬところで、一番迷うものだ。それだけ言っておこう」',
    rough: '「本当は、もっと泥臭かったさ。……でも、まあ、悪くない生き方だった」', cool: '「……本当のことは、{I}だけが覚えていればいい。ただ、一つだけ言えるのは――悔いはある、ということだ」',
    bright: '「本当は？ うーん……もっと楽しかったし、もっと寂しかったよ。本には、書ききれないくらい」', old: '「本当のことなど、誰も知らんでよい。……ただ、{you}には、いつか話してもよいかの」',
    mute: '{s}は、本を棚に戻し、あなたの手のひらに、指で何かを書いた。読めなかった。けれど、温かかった。' },
  legendNow: { polite: '「……{you}は、時々、ずるいことを言いますね」', regal: '「……不敬な。だが、悪い気はせぬ」', rough: '「……へっ。照れること言うなよ」',
    cool: '「……そうか。なら、それでいい」', bright: '「……えへへ。うん。今の{I}を、見ててね」', old: '「……ほう。良いことを言う。年寄りを泣かせるでない」',
    mute: '{s}が、低く喉を鳴らした。笑ったように見えた。' },
  legendClose: { polite: '「伝承に残るのは、英霊のほんの一部です。この冬のことは、きっとどこにも残らない。……それでも、{you}が覚えていてくれるなら」',
    regal: '「この冬は、どの本にも載らぬ。……ならば、{you}が覚えておけ。それで足りる」', rough: '「この冬のことは、本には載らねえ。……お前が覚えてりゃ、それでいいさ」',
    cool: '「この冬の記録は、どこにも残らない。……{you}の中以外には」', bright: '「この冬のことは、本にならないね。……だから、{call}がちゃんと覚えててね」',
    old: '「この冬は、どの書にも残らん。……{you}の胸にだけ、残しておいておくれ」', mute: '{s}は、あなたの胸のあたりを、大きな指で、とん、と叩いた。' },
  traceOpen: { polite: '「……ここに、まだ残っています。魔力の痕が」', regal: '「待て。……残り香がある。下手な隠し方だ」', rough: '「……おい、待て。匂うぞ。魔術の匂いだ」',
    cool: '「……痕がある。まだ新しい」', bright: '「ねえ、ここ。……変な感じがする。誰かが、ここで何かしてた」', old: '「……ふむ。残っておるな。若いのには、見えんじゃろうが」',
    mute: '{s}が、低く唸って、路地の奥を睨んだ。' },
  traceClose: { polite: '「……こんなことをする者を、{I}は許せません。必ず、止めましょう」', regal: '「民を喰らう者は、王の敵だ。……必ず、引きずり出す」', rough: '「……胸糞悪い。見つけたら、ただじゃおかねえ」',
    cool: '「……放っておけば、また誰かが倒れる。終わらせよう」', bright: '「……絶対、止めようね。こんなの、ひどすぎるよ」', old: '「……人の命を啜る術か。年寄りでも、腹は立つ」',
    mute: '{s}の拳が、静かに握られた。' },
  ambushTrust: { polite: '「……背中を預けられる、というのは。悪くないものですね」', regal: '「{I}の背を任せるとはな。……ふん、及第点だ」', rough: '「へっ、悪くねえ。お前になら、背中を任せてやるよ」',
    cool: '「……背中が、温かかった。不思議な感覚だ」', bright: '「すごいすごい！ 今の、息ぴったりだったよね！」', old: '「ほっほ。背を預けられる主とは、久しく縁がなかったわい」',
    mute: '{s}が、あなたの背中に、自分の背中を、そっと押し当てた。' },
  wishAsk: { polite: '「……もし、聖杯が願いを叶えられないものだったら。{I}は、何のために喚ばれたのでしょう」', regal: '「聖杯が、思うような杯でなかったとしたら。……{I}の願いは、どこへ行けばよい」',
    rough: '「……なあ。聖杯が、とんでもねえ代物だったらさ。オレの願いは、どうなるんだろうな」', cool: '「……聖杯が何であれ、{I}には願いがある。だが、それを叶える場所がなかったら」',
    bright: '「……ねえ。聖杯が、願いを叶えてくれなかったら。{I}、どうしたらいいのかな」', old: '「……杯が、ただの器でなかったとしたら。年寄りの願いなど、どこへ持っていけばよいかの」',
    mute: '{s}は、夜空の、天降山の方角をじっと見ていた。何かを、確かめるように。' },
  wishVow: { polite: '「……はい。{you}がそう言ってくれるなら、{I}は、最後まで信じられます」', regal: '「……主の誓い、確かに聞いた。違えるでないぞ」', rough: '「……ああ。頼むぜ、マスター」',
    cool: '「……分かった。その言葉を、信じる」', bright: '「……うん！ 約束だよ！」', old: '「……うむ。その言葉、冥土の土産にさせてもらおう」', mute: '{s}が、ゆっくりと、深く頷いた。' },
  wishMine: { polite: '「{I}の、もの……。そうですね。聖杯がどうであれ、この願いは、{I}だけのものです」', regal: '「……そうだ。杯に許しを乞う願いなど、王の願いではない」',
    rough: '「……ははっ。そうだな。オレの願いは、オレのもんだ」', cool: '「……そうか。叶う叶わないの前に、{I}の願いは、{I}のものか」', bright: '「……そっか。叶わなくても、{I}の願いなんだね。……なんか、ちょっと軽くなった」',
    old: '「……ほう。願いは、持ち主のものか。若いのに、良いことを言う」', mute: '{s}の目が、少しだけ、和らいだ気がした。' },
  wishWinter: { polite: '「その時は……{you}と過ごしたこの冬を、答えにします」', regal: '「その時は、この冬を、{I}の答えにしよう。……それも悪くない」', rough: '「そん時は、そん時さ。……この冬が楽しかった。それで十分だ」',
    cool: '「……その時は、{you}と戦ったこの冬が、{I}の答えだ」', bright: '「その時は……{call}と一緒にいた冬が、{I}の願いの代わり！」', old: '「その時は、この冬の思い出を抱いて、座へ還るまでよ」', mute: '{s}は、あなたの手に、自分の手を重ねた。それが答えだった。' },
  lastOpen: { polite: '「……少し、歩きませんか。明日になる前に」', regal: '「供をせよ。……明日の前に、この街をもう一度見ておきたい」', rough: '「なあ、ちょっと出ようぜ。……じっとしてると、落ち着かねえ」',
    cool: '「……少し、歩かないか。今日のうちに」', bright: '「ねえねえ、お出かけしよ！ 明日の前に、思い出作り！」', old: '「どれ、少し散歩でもするかの。明日のことは、明日考えればよい」',
    mute: '{s}が、玄関で、あなたの靴を揃えて待っていた。' },
  lastClose: { polite: '「……ありがとうございます。明日、{I}は、この景色のために戦います」', regal: '「……良い街だ。明日、この街ごと、{you}を勝たせてやろう」', rough: '「……よし。明日は、全部ぶつけてやる。見てろよ」',
    cool: '「……覚えておく。この景色も、{you}の顔も」', bright: '「……楽しかった！ よーし、明日もがんばるぞ！」', old: '「……良い一日じゃった。明日も、こうありたいものじゃ」',
    mute: '{s}は、夕焼けの街を、目に焼き付けるように見つめていた。' },
};
const rbVl = k => vl(RB[k]);

// ---- 英霊ルート：5日目の昼 伝承の向こう側 ----
function rbLegend(ev, after) {
  G.used[ev.id] = true; const sv = servantOf(G);
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`昼の市立図書館。調べものの合間に顔を上げると、${SV()}が、子ども向けの伝説や物語の棚の前で立ち止まっていた。<br>手にしている本の表紙には――<b>${sv.name.replace(/〔.*?〕/g, '')}</b>の名前があった。`, `<span class="note">${sv.desc}</span>`, rbVl('legendOpen')],
      choices: [
        { label: '「本当は、どうだったの？」', run: () => bond(4), reply: () => [meSay('本当は、どうだったの？'), rbVl('legendTrue'), '<span class="note">（絆+4）</span>'] },
        { label: '「伝承なんて関係ない。隣にいる今のあなたを見てる」', run: () => { bond(5); tone('good'); }, reply: () => [meSay('伝承なんて関係ない。隣にいる今のあなたを見てる'), rbVl('legendNow'), '<span class="note">（絆+5）</span>'] },
        { label: 'その本を、借りて帰る', run: () => { bond(3); G.flags.svBook = true; }, reply: () => [fmt('貸出カードに、あなたの名前と、その本の題名が並んだ。その夜、{s}は、こっそりその本を読んでいたらしい。'), '<span class="note">（絆+3）</span>'] },
      ] },
    { text: () => [`帰り道。夕暮れの坂道で、${SV()}がぽつりと言った。`, rbVl('legendClose')] },
  ] });
}
// ---- 英霊ルート：6日目の昼 英霊の勘（犯人の来歴が、手がかりに出る） ----
const RB_TRACE = {
  noble_root: ['測定用の水晶の欠片', '時計塔の魔術師が、魔力の流れを測るのに使う道具だ。'],
  noble_collector: ['硝子の標本瓶の欠片', '何かを「保管」するための、魔術の瓶らしい。'],
  merc_pro: ['空の薬莢と、焼き切られた結界の跡', '魔術師というより、戦場を知る者のやり口だ。'],
  alch_prodigy: ['錬金術に使う、銀の粉', '錬金術の一族の魔術師が、触媒に使うものだ。'],
  mad_revive: ['小さな女の子の髪留め', '被害者のものではない。……誰かが、大事に持ち歩いていたものだ。'],
  mad_cult: ['古い文字を写した呪符', '天降山の麓の石に刻まれた文字と、同じ形をしている。'],
  mad_exile: ['禁術式の断片', '時計塔では、口にすることさえ禁じられている種類の術式だ。'],
};
function rbTraceClue() {
  const r = typeof culprit === 'function' ? culprit() : null;
  if (!r) return { item: '黒い泥の染み', note: '触れると、指先が冷たく痺れた。……人の仕業とは、思えない。', id: 'sv_trace_mud' };
  const t = (typeof rvBB === 'function' && rvBB(r) && RB_TRACE[r.bb]) || ['焦げた術式の跡', '誰かが、ここで魂を吸い上げる術を使ったのは間違いない。'];
  return { item: t[0], note: t[1], id: 'sv_trace' };
}
function rbTrace(ev, after) {
  G.used[ev.id] = true; const place = pick(['旧城下町の裏路地', '駅前の再開発地区', '港の倉庫街', '御影川の下流']);
  const found = how => { const c = rbTraceClue(); const t = addClue(c.id, '英霊が見つけた痕', `昏睡事件の現場に、${c.item}が残っていた。${c.note}`, 1);
    return [`${how}――路地の奥の排水溝に、<b>${c.item}</b>が落ちていた。${c.note}`, t]; };
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`昏睡事件の現場の一つ、${place}。規制線のテープが、冬の風に揺れている。<br>通り過ぎようとした時、${SV()}が足を止めた。`, rbVl('traceOpen')],
      choices: [
        { label: () => `${SVN()}に、痕を辿ってもらう`, hint: '英霊の敏捷判定', run: () => { const c = schk(2, 50); G.rbTmp = c.ok ? [c.text, ...found(`${SV()}は、地面すれすれに身を屈めて、痕を辿っていった。`)] : [c.text, '痕は、角を曲がったところで途切れていた。']; bond(2); },
          reply: () => G.rbTmp },
        { label: '自分で、術式の痕を読み解く', hint: '知力判定', run: () => { const c = chk('int', 55); G.rbTmp = c.ok ? [c.text, ...found('残った魔力の流れを、指でなぞるように読んでいった。')] : [c.text, '術式の残骸は、もう形を保っていなかった。']; },
          reply: () => G.rbTmp },
      ] },
    { text: () => [rbVl('traceClose')] },
  ] });
}
// ---- 英霊ルート：7日目の夜 背中を預ける夜 ----
function rbAmbush(ev, after) {
  G.used[ev.id] = true; const mud = !(typeof culprit === 'function' && culprit());
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`帰り道の高架下。街灯が、一斉に消えた。<br>闇の中から、${mud ? '黒い泥でできた、獣のような影' : '術で操られた使い魔の群れ'}が、四方から湧き出してくる。数が多い。`,
      `${SV()}が、あなたの前に立った。――いや、違う。今夜は、前だけではない。後ろからも来る。`],
      choices: [
        { label: () => `${SVN()}に前を任せ、自分は退路を守る`, hint: '知力判定', run: () => { const c = chk('int', 50); if (c.ok) bond(4); else hp(-8); G.rbTmp = [c.text, c.ok ? '退路の結界を張り直し、背後から来る影を足止めした。前では、${s}が一体ずつ確実に仕留めていく。（絆+4）' : '背後からの一撃を、避けきれなかった。（HP-8）']; },
          reply: () => G.rbTmp.map(fmt) },
        { label: '自分も魔術で、背中を合わせて戦う', hint: '魔力判定', run: () => { const c = chk('mag', 55); if (c.ok) { bond(6); G.flags.svCover = true; } else { hp(-12); shp(-10); } G.rbTmp = [c.text, c.ok ? '背中合わせに立った。{s}の呼吸が、背中越しに伝わってくる。二人で、闇を押し返した。（絆+6）' : '息が合わなかった。{s}があなたを庇い、二人とも手傷を負った。（HP-12・英霊HP-10）']; },
          reply: () => G.rbTmp.map(fmt) },
        { label: () => `令呪を構えて、${SVN()}の背に立つ`, hint: '大胆', run: () => { bond(5); tone('bold'); G.rbTmp = ['右手を掲げて、{s}の背に立った。令呪は使わない。ただ、そこにいる。――それだけで、{s}の剣筋が変わった。（絆+5）']; },
          reply: () => G.rbTmp.map(fmt) },
      ] },
    { text: () => ['影が、夜の中に溶けて消えた。', rbVl('ambushTrust')] },
  ] });
}
// ---- 英霊ルート：8日目の夜 願いの在処 ----
function rbWish(ev, after) {
  G.used[ev.id] = true; const w = svWish();
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`六十年前の真実を聞いた夜。拠点の縁側で、${SV()}は、ずっと黙っていた。`, rbVl('wishAsk'),
      isMute() ? `<p>パスを通じて、想いが流れ込んでくる。――「${w}」</p>` : svSay(fmt(`「${w}」`)), `<p>――それが、${SV()}の願いだった。</p>`],
      choices: [
        { label: '「その願い、必ず叶えよう」', run: () => { bond(4); G.flags.svWishVow = true; }, reply: () => [meSay('その願い、必ず叶えよう'), rbVl('wishVow'), '<span class="note">（絆+4）</span>'] },
        { label: '「聖杯がどんなものでも、その願いは、あなたのものだ」', run: () => { bond(5); tone('good'); }, reply: () => [meSay('聖杯がどんなものでも、その願いは、あなたのものだ'), rbVl('wishMine'), '<span class="note">（絆+5）</span>'] },
        { label: '「……もし、叶えられなかったら？」', hint: '慎重', run: () => { bond(3); tone('cautious'); }, reply: () => [meSay('……もし、叶えられなかったら？'), rbVl('wishWinter'), '<span class="note">（絆+3）</span>'] },
      ] },
  ] });
}
// ---- 英霊ルート：10日目の昼 最後の昼 ----
const RB_PLACE = { knight: '城跡公園の堀端', king: '駅前の百貨店の屋上', warrior: '商店街の食べ歩き', cool: '港の防波堤', gentle: '図書館の中庭', free: '駅前のゲームセンター', dark: '夕暮れの旧城下町', scholar: '古書店の並ぶ裏通り', berserker: '天降山の麓の河原' };
function rbLastDay(ev, after) {
  G.used[ev.id] = true; const sv = servantOf(G); const place = RB_PLACE[sv.persona] || '城跡公園';
  const mem = [G.flags.svBook ? '図書館で借りたあの本は、まだ返していない。' : '', G.flags.svCover ? '高架下で、背中を合わせて戦った夜のこと。' : '', G.flags.svWishVow ? `${SV()}の願いを、必ず叶えると誓った夜のこと。` : ''].filter(Boolean);
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`決戦を明日に控えた昼。${SV()}が、珍しく自分から言った。`, rbVl('lastOpen'), `行き先は、${place}。${SV()}が選んだ場所だった。`] },
    { text: () => [`冬の日差しの中を、二人で並んで歩いた。` + (mem.length ? `<br>歩きながら、この冬のことを思い出す。${mem.join('')}` : '<br>出会ってから、まだ十日と少し。それなのに、ずっと昔から隣にいた気がする。')],
      choices: [
        { label: '「明日が終わっても、忘れない」', run: () => bond(4), reply: () => [meSay('明日が終わっても、忘れない'), '<span class="note">（絆+4）</span>'] },
        { label: '「全部終わったら、また来よう」', run: () => { bond(3); tone('good'); }, reply: () => [meSay('全部終わったら、また来よう'), '<span class="note">（絆+3）</span>'] },
        { label: '黙って、隣を歩く', run: () => bond(3), reply: () => [fmt('言葉は、いらなかった。{s}の歩幅が、あなたに合わせて、少しだけ小さくなった。'), '<span class="note">（絆+3）</span>'] },
      ] },
    { text: () => [rbVl('lastClose')] },
  ] });
}

// =================================================================
//  雫ルート
// =================================================================
// 土地の名家の当主（来歴があれば、その来歴で）
function rbHead() { return (G.rivals || []).find(r => r.alive && r.type === '深見の名家の当主' && typeof rvBB === 'function' && rvBB(r)); }
const RB_HEAD_LINE = {
  head_keeper: '「この土地の霊脈は、うちが三百年見てきた。……今年の山は、おかしい。巫女殿、気をつけろ」',
  head_grudge: '「六十年前、祖父が負けた夜も、山はこう鳴いていたそうだ。……余所者には、渡さんぞ。山も、聖杯も」',
  head_young: '「父の残した帳面に、山の鳴る年のことが書いてあった。……巫女殿。何かあったら、うちを頼れ」',
  head_patron: '「山の様子を見に来た。……金で解決できる話なら、いくらでも出すんだがな」',
};
function rbWatch(ev, after) {
  G.used[ev.id] = true; const s = SHIZUKU(); const c = mkCall(); const h = rbHead();
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`天降神社の社務所。${s}が、蔵から古い帳面を何冊も運び出してきた。<br>「……山が鳴く年のことを、調べたくて。${c}にも、一緒に見てほしいんです」`,
      `帳面には、六十年ごとに、同じ言葉が書かれていた。<b>「山、鳴く。霧、降りる。花嫁を、迎えに来る」</b>――そして、いちばん古い帳面の最初の頁だけが、墨で黒々と塗り潰されていた。`,
      mkR({ lover: `${s}は、塗り潰された頁を、指先でなぞった。「……ここに、最初の花嫁の名前があったはずなんです。誰が、消したんでしょう」`, sister: `「……最初の花嫁の名前、ここにあったはずなのに」${s}が、不安そうにあなたを見上げた。`, ally: `「最初の花嫁の名前が、塗り潰されてる。……相棒、これ、気になりません？」`, known: `「……最初の頁だけ、読めないんです」${s}が、申し訳なさそうに言った。` }),
      h ? `その時、社務所の戸が開いた。入ってきたのは、${h.cls}陣営のマスター――深見の名家の当主、${esc(h.master)}だった。<p class="quote">${RB_HEAD_LINE[h.bb] || '「……山の様子を、見に来た」'}</p>` : ''],
      choices: [
        { label: '塗り潰された頁を、光にかざしてみる', hint: '知力判定', run: () => { const r = chk('int', 52); G.rbTmp = r.ok ? [r.text, `墨の下に、かすかに文字が透けて見えた。<b>「白」</b>――それだけ読めた。`, kamiClue('first_bride', '塗り潰された頁', '天降神社のいちばん古い帳面。最初の花嫁の名前が、墨で塗り潰されている。かすかに「白」の字が読めた。')] : [r.text, '墨は厚く、何も透けて見えなかった。']; },
          reply: () => G.rbTmp },
        { label: () => `${s}に、花嫁の言い伝えを聞く`, run: () => mk(4), reply: () => [`「……六十年に一度、山の神様は花嫁を迎えに来る。そう言われてきました。でも、本当に連れて行かれた人がいたのかは、誰も知らないんです」<br>${s}は、自分の手首の鈴を、ぎゅっと握った。`, `<span class="note">（${CAST.miko}との関係+4）</span>`] },
        { label: () => `${esc(h.master)}と話す`, cond: () => !!h, hint: '交渉（名家の陣営の敵意が和らぐ・情報）', run: () => { h.intel = Math.max(h.intel, 1); h.aggr = Math.max(0.2, h.aggr - 0.15); },
          reply: () => [`「……聖杯戦争の敵同士だ。だが、山のことは別だ。この土地に住む者として、言っておく」<br>${esc(h.master)}は、帳面の黒い頁を見下ろした。「六十年前の夜も、霧が出た。……今夜、山に入るなら、覚悟していけ」`, `<span class="note">（${h.cls}陣営のマスターが判明・敵意が和らいだ）</span>`] },
      ] },
    { text: () => [`夕暮れ。社務所の窓から、天降山の稜線が見えた。山の上だけ、空気が白く霞んでいる。<br>${SV()}が、低く言った。「……今夜、何かが来る」`] },
  ] });
}
function rbVigil(ev, after) {
  G.used[ev.id] = true; const s = SHIZUKU(); const fam = kamiHome() ? '叔父' : '宮司';
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`${s}が隠り世に連れ去られて、四日。明日は、祟りの日だ。<br>天降神社の社務所で、${s}の${kamiHome() ? '父――あなたの叔父――' : '父である宮司'}が、あなたに頭を下げた。`,
      `「……娘を、頼みます。私には、あの霧の向こうへ行く力がない」<br>机の上には、${s}がいつも手首に結んでいた、赤い紐の鈴が置かれていた。連れ去られた夜、石段に落ちていたのだという。`],
      choices: [
        { label: '鈴を預かって、迎えに行くと約束する', run: () => { mk(5); G.flags.rbBell = true; }, reply: () => [meSay('必ず、連れて帰ります'), `${fam}は、鈴をあなたの手のひらに載せた。ちりん、と小さく鳴った。――霧の向こうで、誰かが、それに応えた気がした。`, `<span class="note">（${CAST.miko}との関係+5）</span>`] },
        { label: () => `${SVN()}と、明日の段取りを確かめる`, hint: '絆', run: () => bond(4), reply: () => [`拠点に戻って、${SV()}と、天降山の地図を広げた。祟りの源、霧の深い沢、${s}がいるはずの場所。`, `${SV()}が、地図の一点を指で叩いた。${say('withYou')}`, '<span class="note">（絆+4）</span>'] },
        { label: '一人で、神楽殿に座る', hint: '精神', run: () => gain('spi', 2), reply: () => [`誰もいない神楽殿で、${s}が舞っていた場所に座った。床板が、冷たい。<br>――明日、必ず、ここに連れて帰る。`, '<span class="note">（精神+2）</span>'] },
      ] },
  ] });
}
function rbLastNoon(ev, after) {
  G.used[ev.id] = true; const s = SHIZUKU(); const c = mkCall(); const n = typeof wedgeCount === 'function' ? wedgeCount() : 0; const ok = typeof wedgeOk === 'function' && wedgeOk();
  dialog({ title: ev.title, sub: ev.chapter || 'STORY', then: after, steps: [
    { text: () => [`十二日目の昼。今夜、抑止の守護者が来る。<br>天降神社の石段に、三人で並んで座った。あなたと、${SV()}と、${s}。空のひびは、もう山の半分を覆っている。`,
      mkR({ lover: `${s}が、あなたの手を握った。「……${c}。今夜が終わったら、何をしたいですか」`, sister: `${s}が、膝を抱えて言った。「……${c}。怖くないですか」`, ally: `「楔は${n}つ。${ok ? '打ち込める数は、揃いました' : 'まだ、足りないかもしれません'}」${s}が、帳面を閉じた。「……相棒。今夜、勝ちましょう」`, known: `「……巻き込んでしまって、ごめんなさい」${s}が、小さく頭を下げた。` })],
      choices: [
        { label: () => mkRel() === 'lover' ? '「春になったら、二人で桜を見に行こう」' : '「終わったら、みんなでご飯を食べよう」', run: () => mk(4),
          reply: () => [meSay(mkRel() === 'lover' ? '春になったら、二人で桜を見に行こう' : '終わったら、みんなでご飯を食べよう'), mkR({ lover: `「……はい。約束ですよ」${s}は、あなたの肩に、そっと頭を預けた。`, sister: `「……はい！ わたし、お赤飯炊きます」${s}が、やっと笑った。`, ally: `「いいですね。……相棒のおごりで」`, known: `「……はい。ぜひ」${s}は、少しだけ笑った。` }), `<span class="note">（${CAST.miko}との関係+4）</span>`] },
        { label: () => `${SVN()}に、今夜のことを聞く`, run: () => bond(4), reply: () => [`${SV()}は、空のひびを見上げたまま言った。${say('stayBack')}`, `${s}が、${SV()}の横顔をじっと見ていた。「……あなたも、消えないでくださいね」`, '<span class="note">（絆+4）</span>'] },
        { label: '黙って、空のひびを見上げる', run: () => gain('spi', 2), reply: () => ['三人とも、何も言わなかった。冬の風が、石段を吹き上がっていった。', '<span class="note">（精神+2）</span>'] },
      ] },
    { text: () => [`日が傾き始めた。${s}が立ち上がり、手首の鈴を、一度だけ鳴らした。<br>「――行きましょう。この土地が、ここに在ることを、世界に見せてやるんです」`] },
  ] });
}

STORY.push(
  { id: 'sv_legend', phase: 'war', day: 5, slot: 0, after: 'hub', cond: () => isSvRoute(), title: '伝承の向こう側', dialog: null },
  { id: 'sv_trace', phase: 'war', day: 6, slot: 0, after: 'hub', cond: () => isSvRoute() && !solved(), title: '英霊の勘', dialog: null },
  { id: 'sv_ambush', phase: 'war', day: 7, slot: 1, after: 'advance', cond: () => isSvRoute() && hostileRivals().length > 0, title: '背中を預ける夜', dialog: null },
  { id: 'sv_wish', phase: 'war', day: 8, slot: 1, after: 'advance', cond: () => isSvRoute(), title: '願いの在処', dialog: null },
  { id: 'sv_lastday', phase: 'war', day: 10, slot: 0, after: 'hub', cond: () => isSvRoute() && hostileRivals().length > 0, title: '最後の昼', dialog: null },
  { id: 'k_watch', phase: 'war', day: 4, slot: 0, after: 'hub', cond: () => G.route3 === 'miko' && kamiNormal() && mkMet(), title: '社務所の古文書', dialog: null },
  { id: 'k_vigil', phase: 'war', day: 9, slot: 0, after: 'hub', cond: () => G.route3 === 'miko' && kamiOn() && !!G.flags.kamiMikoTaken && !kamiResolved() && !G.flags.mkBack, title: '迎えの前日', dialog: null },
  { id: 'k_lastnoon', phase: 'war', day: 12, slot: 0, after: 'hub', cond: () => typeof counterOn === 'function' && counterOn() && mikoHere(), title: '最後の昼', chapter: '終章　抑止', dialog: null },
);
{ const fns = { sv_legend: rbLegend, sv_trace: rbTrace, sv_ambush: rbAmbush, sv_wish: rbWish, sv_lastday: rbLastDay, k_watch: rbWatch, k_vigil: rbVigil, k_lastnoon: rbLastNoon };
  for (const st of STORY) if (fns[st.id]) { const f = fns[st.id]; st.dialog = after => f(st, after); st.text = () => ''; st.choices = []; } }
