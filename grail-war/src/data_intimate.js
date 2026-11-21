// =============================================================
//  恋人関係の夜：魔力供給
//  ・「恋人」関係のとき、夜の「魔力を回復して休む」が二人で過ごす夜になり、回復量も大きい
//  ・大人の姿の英霊：Fate原作の「魔力供給」に準拠した、官能的だが露骨ではない描写（loverNight）
//    英霊ごとの個別の場面は data_lover_sv.js（LOVER_SV）にあり、あればそちらを優先する
//  ・少年少女の姿の英霊（YOUTHFUL）：信頼し合うプラトニックな恋人としての夜（platonicNight）
//    英霊ごとの個別の場面は data_platonic_sv.js（PLATONIC_SV）
//  ・子どもの英霊（CHILDREN）：恋人関係そのものを選べない（相棒・主従・家族は可）
// =============================================================

// 子どもの英霊：恋人関係は選べない
const CHILDREN = new Set(['jack', 'nursery', 'abigail', 'andersen']);
// 官能的な描写の対象外（恋人関係はプラトニックなものになる）
// （原作で肉体年齢が若いとされる英霊、少年少女の姿で現界する英霊）
const YOUTHFUL = new Set(['jack', 'nursery', 'abigail', 'andersen']);
function isYouthful(sv) { return YOUTHFUL.has((sv || servantOf(G)).id); }
function canBeLover(sv) { return !CHILDREN.has((sv || servantOf(G)).id); }

// 夜の情景（{s}＝英霊の名前）
const LOVER_NIGHTS = [
  '灯りを落とした部屋で、{s}があなたの名を呼んだ。その声は、いつになく掠れていた。<br>重ねた唇が離れるたび、熱を帯びた吐息が混じり合う。衣擦れの音、肌に触れる指先の熱。パスを通じて流れ込む魔力は、触れ合うほどに濃く、甘くなっていく――。',
  '「……魔力が、足りないんだ」<br>そう言った{s}の瞳は、魔力だけを求めているようには見えなかった。引き寄せられるまま寝台に沈み、互いの体温を確かめ合う。首筋に落ちる口づけ、背に回された腕の強さ。夜の静けさの中で、二人の境界がゆっくりと溶けていく。',
  '魔力供給――マスターとサーヴァントが、最も深く繋がるための方法。<br>知識としては知っていた。けれど、{s}の肌の熱も、耳元で零れる甘い声も、知識の中にはなかった。何度も名前を呼び合いながら、二人は夜の底へと沈んでいった。',
  '雪明かりが、肌を重ねる二人の輪郭を淡く浮かび上がらせる。<br>{s}の指が、あなたの頬から首筋へ、胸元へと、確かめるようにゆっくりと辿っていく。重なった鼓動が速くなるほど、パスを流れる魔力は熱を帯びていった。夜が明けるまで、{s}はあなたを離さなかった。',
  '囁きとともに、熱い唇が重なった。<br>乱れた呼吸、絡み合う指、シーツを掴む手。互いに刺激しあい、気持ちを高める。<br>やがて怒張した肉棒を、濡れた秘部へと突き刺した。次第にあまりの快感に嬌声が漏れ、卑猥な水音が部屋に響く。<br>愛する人の淫らな姿に興奮は高まり、動きが加速していく。<br>────白濁の魔力が放たれ、蜜壺を満たしていく。片や絶頂に身を捩じらせ、艶やかに痙攣する。<br>しばらく、余韻に浸る。<br>しかし欲求が収まることはなく、魂ごと溶け合うような感覚の中で何度も互いの肉体を貪り、愛と快楽に溺れ続けた────。',
];

// 囁き（話し方ごと。{I}＝一人称 / {you}＝相手の呼び方）
const LOVER_WHISPER = {
  polite: ['「……{you}の熱で、{I}をいっぱいにしてください」', '「……もっと、近くに。……今夜は、離さないで」'],
  regal: ['「光栄に思え。{I}のすべてを許すのは、{you}だけだ」', '「今宵は、{I}が満ちるまで眠らせぬぞ」'],
  rough: ['「……そんな目で見んな。……止まんなくなるだろ」', '「……全部、{I}に寄越せよ」'],
  old: ['「……ふふ、今宵は寝かせぬぞ。覚悟せい」', '「……もっと近う寄れ。{you}の熱が欲しい」'],
  cool: ['「……今夜は、理性なんて置いていく」', '「……{you}の全部が、欲しい」'],
  bright: ['「……ドキドキしすぎて、どうにかなっちゃいそう」', '「……ねえ、もっと、ぎゅってして。離れないで」'],
  mute: [],
};
// 翌朝
const LOVER_MORNINGS = [
  '乱れたシーツの中で目を覚ますと、{s}が隣であなたの寝顔を見つめていた。目が合うと、昨夜を思い出したように頬を染める。',
  '朝の光の中、{s}はあなたの腕を枕に、まだ穏やかな寝息を立てていた。パスを流れる魔力は、かつてないほど満ちている。',
  '目覚めると、素肌に触れる毛布の温もりと、{s}の体温がそこにあった。体の奥の奥まで、魔力が満ちているのが分かる。',
];

// 恋人と過ごす夜（休息の代わり）
function loverNight() {
  NOTES = [];
  mp(60); shp(25); hp(15); bond(3); od(10);
  const sv = servantOf(G);
  const v = voiceOf(sv);
  const own = (typeof LOVER_SV !== 'undefined') ? LOVER_SV[sv.id] : null;
  const whisper = LOVER_WHISPER[v.reg] || [];
  // 英霊ごとの個別の場面があれば優先（毎回同じにならないよう、4回に1回は共通の場面）
  const useOwn = own && (!G.loverSeen || !G.loverSeen[sv.id] || Math.random() < 0.75);
  if (own) { G.loverSeen = G.loverSeen || {}; G.loverSeen[sv.id] = true; }
  const body = useOwn ? [
    fmt(own[0]),
    /^（/.test(own[1]) ? fmt(own[1]) : `<p class="quote">${fmt(own[1])}</p>`,
    fmt(own[2]),
  ] : [
    fmt(pick(LOVER_NIGHTS)),
    whisper.length ? `<p class="quote">${fmt(pick(whisper))}</p>` : `（${SV()}の腕が、言葉の代わりにあなたを強く抱きしめた）`,
    fmt(pick(LOVER_MORNINGS)),
    `<span class="note">恋人同士の魔力供給。（${SV()}の魔力+60 HP+25　あなたのHP+15 オド+10 絆+3）</span>`,
    ...takeNotes(),
  ];
  next('二人の夜', paras(body), advance, '朝を迎える', 'LOVERS');
}

// ---- プラトニックな恋人の夜（少年少女の姿の英霊） ----
const PLATONIC_NIGHTS = [
  '縁側に並んで座り、毛布を一枚、二人で分け合った。<br>雪が降るのを眺めながら、他愛もない話を夜更けまで続ける。ふと触れた指先を、{s}はそのままそっと握り返した。繋いだ手から、パスを通じて温かな魔力が流れていく。',
  '「……少しだけ、こうしていてもいいですか」<br>{s}はそう言って、あなたの肩にもたれかかった。窓の外の月を見上げながら、繋いだ手の温もりだけを確かめ合う。それだけで、パスが静かに満ちていくのが分かった。',
  '眠れない夜、{s}と二人で星を数えた。<br>好きなもの、怖いもの、叶えたいこと。一つずつ打ち明けるたび、手と手の間を流れる魔力が、少しずつ温かくなっていく。',
  '拠点の居間で、温かい飲み物を片手に語り合った。<br>話し疲れて、いつの間にか二人とも肩を寄せ合ったまま眠っていた。繋いだままの手を通して、魔力が穏やかに巡り続けていた。',
];
const PLATONIC_WHISPER = {
  polite: ['「……{you}の隣は、とても落ち着きます」', '「……手を、離さないでいてくださいね」'],
  regal: ['「……今宵は、{I}の隣にいることを許す」', '「……{you}の手は、温かいな」'],
  rough: ['「……べ、別に、手ぐらい繋いだっていいだろ」', '「……{you}の隣、悪くねえな」'],
  old: ['「……ふふ、こうしておると落ち着くのう」', '「……今宵は、手を離さぬぞ」'],
  cool: ['「……もう少しだけ、このままでいて」', '「……{you}の手は、温かい」'],
  bright: ['「えへへ……こうしてると、あったかいね」', '「ねえ、明日もこうしてていい？」'],
  mute: [],
};
const PLATONIC_MORNINGS = [
  '翌朝、目を覚ますと、二人の手はまだ繋がれたままだった。{s}が照れくさそうに笑う。',
  '朝の光の中、{s}が「おはよう」と小さく言った。パスを流れる魔力は、かつてないほど満ちている。',
];
function platonicNight() {
  NOTES = [];
  mp(50); shp(20); hp(15); bond(3); od(10);
  const sv = servantOf(G);
  const v = voiceOf(sv);
  const own = (typeof PLATONIC_SV !== 'undefined') ? PLATONIC_SV[sv.id] : null;
  const whisper = PLATONIC_WHISPER[v.reg] || [];
  // 英霊ごとの個別の場面があれば優先（初回は必ず、以降は4回に3回）
  const useOwn = own && (!G.loverSeen || !G.loverSeen[sv.id] || Math.random() < 0.75);
  if (own) { G.loverSeen = G.loverSeen || {}; G.loverSeen[sv.id] = true; }
  const body = useOwn ? [
    fmt(own[0]),
    /^（/.test(own[1]) ? fmt(own[1]) : `<p class="quote">${fmt(own[1])}</p>`,
    fmt(own[2]),
  ] : [
    fmt(pick(PLATONIC_NIGHTS)),
    whisper.length ? `<p class="quote">${fmt(pick(whisper))}</p>` : `（${SV()}が、あなたの手をそっと握った）`,
    fmt(pick(PLATONIC_MORNINGS)),
    `<span class="note">手を繋いで過ごした夜。（${SV()}の魔力+50 HP+20　あなたのHP+15 オド+10 絆+3）</span>`,
    ...takeNotes(),
  ];
  next('二人の夜', paras(body), advance, '朝を迎える', 'LOVERS');
}
// 恋人の夜：英霊の姿に応じて描写を変える
function loversNight() { return isYouthful(servantOf(G)) ? platonicNight() : loverNight(); }
