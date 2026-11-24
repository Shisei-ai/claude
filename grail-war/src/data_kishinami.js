// =============================================================
//  特殊シナリオ：岸波 白野
//  名前を「岸波 白野」にすると始まる。Fate/EXTRA シリーズを下地にした主人公のシナリオ。
//
//  月の聖杯戦争を勝ち抜き「月の王」となった岸波白野が、ムーンセルを通して見た
//  不穏な世界線――深見の聖杯戦争。その介入がどんな結末をもたらすのかは、宝石翁のみぞ知る。
//
//   ・月の玉座での「観測」と「干渉」の7期間で能力を育て（成長期の代わり）、深見へ降下する
//   ・召喚できる英霊は、性別で変わる（月で契約した英霊たち）
//       男性：ネロ、玉藻の前、アルテラ、シャルルマーニュ、BB
//       女性：無銘（エミヤ）、ギルガメッシュ、アルテラ、シャルルマーニュ、BB
//       指定しない：上の全員
//   ・歴戦のマスターにして、超高レベルの戦略眼の持ち主
//       英霊は十二分に力を振るえる（パラメータ補正+6）、戦闘の補正が大きい
//       【戦略眼】敵の次の手を、毎手番必ず読み切る
//       【マトリクス】対面するたびに敵の情報を解析し、2度目の対面で真名を暴く
// =============================================================

const KISHI_NAME = '岸波白野';
function isKishiName(name) { return String(name).replace(/[\s　]/g, '') === KISHI_NAME; }
function isKishi() { return !!G && G.master.birth === 'kishinami'; }
// 彼／彼女（性別を指定しない場合は名前で呼ぶ）
function kp() { return gw('彼', '彼女', '岸波白野'); }

BIRTHS.push({ id: 'kishinami', name: '月の王', weight: 0, magic: true, home: 'ムーンセル・オートマトン　月の玉座',
  origin: '', text: '月の聖杯戦争を勝ち抜き、ムーンセルの主となった。',
  stats: { mag: 38, phy: 38, int: 72, spi: 78, cha: 56, luk: 50 },
  growth: { int: 1.15, spi: 1.15, cha: 1.05, mag: 0.9 },
  money: 6, circuits: [25, 35], wish: 'この世界線の結末を、見届けること',
  perk: '月の聖杯戦争の覇者。超高レベルの戦略眼を持つ（戦闘の補正が大きく、敵の次の手を必ず読む。対面を重ねるほど敵を解析する）。' });

// ---- 月で契約した英霊たち（性別で変わる） ----
const KISHI_LINEUP = { m: ['nero', 'tamamo', 'altera', 'charlemagne', 'bb'], f: ['emiya', 'gilgamesh', 'altera', 'charlemagne', 'bb'] };
function kishiLineup() {
  const g = gender();
  return g === 'm' ? KISHI_LINEUP.m : g === 'f' ? KISHI_LINEUP.f : [...new Set(KISHI_LINEUP.m.concat(KISHI_LINEUP.f))];
}

// ---- アルテラ（この特殊シナリオと藤丸シナリオでのみ召喚できる） ----
SERVANTS.push(sv('altera', 'アルテラ', 'アルテラ', 'セイバー', ['B', 'A', 'A', 'B', 'A', 'A+'], '混沌・善', 'cool',
  '軍神の剣', 'フォトン・レイ', '三色の光を宿す剣の欠片',
  'セイバー、アルテラ。……私は、フンヌの戦士である。この西の世界を、滅ぼしに――いや、今は、お前の剣だ。',
  'フン族の王アッティラ。文明を破壊する「神の鞭」と恐れられた。戦うこと以外を知らずに生きた大王。'));
SERVANTS.find(x => x.id === 'altera').chaldea = true;   // 通常シナリオには出てこない
VOICE_OF.altera = ['cool_f', '私', 'お前'];
SIG.altera = [
  '「……私は、戦うことしか知らない。だが、お前の隣でなら、他のことも覚えられる気がする」',
  '「{m}。この時代の甘いものは、良い文明だ。……もう一つ、くれないか」',
  '「{m}。私は破壊しかできないと思っていた。だが、お前を守ることはできる。それが、嬉しい」',
  '「{m}。……私は、お前が好きだ。これは、破壊すべきではない、良い気持ちだ」',
  '「さよならだ、{m}。お前と過ごした日々は、壊したくない、私の宝物だ」',
  '「……{m}。また会えた。月で、お前と見た星の数を、私はまだ覚えている」',
];
SAY_SV.altera = [
  '「おはよう、マスター。一つ聞きたい。……お前は聖杯に、何を願う？」', '「そうか。分かりやすいのは、良いことだ」',
  '「下がれ、マスター。あれは英霊ではない。……壊すべきものだ」', '「……痕跡が、消されている。小賢しい」',
  '「無茶をするな。……だが、礼を言う」', '「マスター。今夜は私一人で、敵を探ってくる」', '「戻った。敵の様子は、見てきた」',
  '「……少し、斬られた。問題ない」', '「……分かった。命令なら、従う」', '「無茶をするマスターだ。……だが、嫌いではない」',
  '「私のマスターに、触れるな」', '「……綺麗だ。この景色は、壊したくない」', '「サーヴァント、セイバー。お前が、私のマスターか」',
  '「良い答えだ」', '「改めて。セイバー、アルテラ。お前の剣になろう」', '「マスター。最後の戦いの前に、お前の心を聞かせてくれ」',
  '「約束する」', '……それが、私の願いだ', '「……それが、お前の答えなら。最後まで、共に」',
  '「まだだ……。私は、まだ、壊れていない」', '「下がっていろ、マスター」', '「マスター、命令を」',
  '「……マスター。あの聖杯からは、文明を喰らう悪意を感じる」', '「お前を狙う者は、私が壊す」',
  '「……見たのか。私の、過去を。……構わない。お前になら」',
];
FUJI_REUNION_SV.altera = '「……マスター。また、お前の剣になれるのだな。良い文明だ」';

// ---- 再会の言葉（月での記憶を持ったまま応える） ----
const KISHI_REUNION_SV = {
  nero: '「うむ！ 呼んだな、奏者よ！ 月の玉座を空けてまで地上に降りるとは、そなたも物好きよな。……だが、余はそういうそなたが好きだ！」',
  tamamo: '「ご主人様ぁ～！ はい、良妻狐、地上出張でも全力でお供いたします！ ……他の女のサーヴァント、いませんよね？」',
  altera: '「マスター。月の外に出るのは、初めてだ。……お前と一緒なら、怖くない」',
  charlemagne: '「よっ、マスター！ 月の王が地上に殴り込みか？ カッコいいじゃねえか、付き合うぜ！」',
  bb: '「はーい、センパイ♪ 地上なんて退屈な場所に降りるなんて、BBちゃん心配で付いてきちゃいました！」',
  emiya: '「……やれやれ。月の王になっても、君の無茶は変わらないな、マスター。いいだろう、今度も私が君の剣だ」',
  gilgamesh: '「フン。月の王などと名乗りながら、地上の小競り合いに首を突っ込むか。……よい、我が見届けてやろう。お前の物語の続きをな」',
};
const KISHI_MEMORY_BOND = 35;   // 月での記憶を持つ英霊の、最初の絆の上乗せ
function kishiReunionLine(sv) { return KISHI_REUNION_SV[sv.id] ? fmt(KISHI_REUNION_SV[sv.id]) : reunionLine(sv); }

// エミヤはこのシナリオでは「無銘」として現れる（月で出会った、名前を持たない弓兵）
const MUMEI = { name: '無銘', short: 'アーチャー', desc: '月の聖杯戦争で岸波白野と契約した、名を持たない弓兵。正義の味方を目指した、ある男の成れの果て。' };

// ---- 月の玉座での日々（成長の代わり） ----
const STAGES_K = [
  { label: '月の玉座', band: '月の王' },
  { label: '観測・一', band: '観測', text: 'ムーンセルの膨大な記録の中に、一つの世界線が引っかかった。地上の、冬の地方都市――深見市。' },
  { label: '観測・二', band: '観測', text: '深見の霊脈には、六十年前の不自然な「空白」がある。まるで誰かが、記録を消したかのように。' },
  { label: '観測・三', band: '観測', text: '観測を続けるほど、世界線の揺らぎは大きくなる。このままでは、何かが起きる。' },
  { label: '干渉・一', band: '干渉', text: '月の王として、地上に降りる準備を始めた。霊子の体を、地上の理に合わせて組み直していく。' },
  { label: '干渉・二', band: '干渉', text: '並行世界への道は、ムーンセルの力だけでは開けない。――万華鏡の主の手が要る。' },
  { label: '降下前夜', band: '降下', text: '月の庭で、英霊たちが見送りの支度をしている。' },
  { label: '降下', band: '降下', text: '霊子の体が、少しずつ地上の重さを帯びていく。' },
];
const KISHI_RATE = 0.85;

const FOCUS_K = {
  tactics: { name: '月の聖杯戦争の記録を読み返す', gains: { int: 10, spi: 3 } },
  arena:   { name: 'アリーナで模擬戦を重ねる', gains: { phy: 9, int: 4 } },
  code:    { name: 'コードキャストを組み直す', gains: { mag: 10, int: 3 } },
  court:   { name: '英霊たちと語らう', gains: { cha: 9, spi: 4 } },
  observe: { name: '深見の世界線を観測する', gains: { int: 6, luk: 6 }, lore: 1 },
  garden:  { name: '月の庭で、静かに過ごす', gains: { spi: 9, luk: 4 } },
  body:    { name: '地上で動く体を鍛える', gains: { phy: 10, spi: 3 } },
};

const lineupNames = () => kishiLineup().map(id => SV_BY_ID[id].short).join('・');
const GROWTH_EVENTS_K = [
  { id: 'k_court', stages: [1], fixed: true, title: '月の王の宮廷',
    text: () => `月の玉座の間。今日も英霊たちが、あなたの周りで賑やかに過ごしている。<br>${lineupNames()}――月の聖杯戦争を共に駆け抜けた、かけがえのない英霊たち。<br>その中の一騎が、あなたの顔を覗き込んだ。「何か、気になることでもあるのか？」`,
    choices: [] },   // 選択肢は下で、今の英霊たちから作る
  { id: 'k_zelretch', stages: [5], fixed: true, title: '万華鏡の主',
    text: () => '月の庭に、ありえない来客があった。<br>白髪の老紳士が、宝石の付いた杖をついて、楽しげに笑っている。<br>「ほう、これが月の王か。面白い。実に面白い。――並行世界の小さな街を、覗き見ておったな？」<br>魔道元帥キシュア・ゼルレッチ・シュバインオーグ。第二魔法の使い手、「宝石翁」。',
    choices: [
      { label: '「深見へ行く道を、開いてほしい」', hint: '交渉判定・宝石を得る', run: () => {
          const c = chk('cha', 60); G.flags.zelretch = true;
          if (c.ok) { item('gem', 2); gain('cha', 3); return [c.text, '「よかろう。ただし、何が起きても儂は手を貸さんぞ。――ああ、これは餞別だ」<br>老人は宝石を二つ、あなたの掌に落とした。（魔力を込めた宝石+2 交渉+3）']; }
          item('gem', 1); return [c.text, '「頼み方がなっとらん。……が、まあよい。面白そうだからな」（魔力を込めた宝石+1）'];
        } },
      { label: '「あなたは、あの世界線の何を知っている？」', hint: '知力判定・街の秘密', run: () => {
          const c = chk('int', 62); G.flags.zelretch = true; G.flags.grailHint = true;
          if (c.ok) { gain('int', 4); lore(2); return [c.text, '「さてな。あの街の杯が呪われておるか否か――それは、行って確かめるのが筋というものだ」<br>老人は、意味ありげに片目をつぶった。（知力+4）']; }
          return [c.text, '「知りたければ、自分の目で見るがよい」はぐらかされた。'];
        } },
      { label: '「面白がっているだけでしょう」', hint: '精神↑・混沌', run: () => { tone('chaos'); gain('spi', 5); G.flags.zelretch = true;
          return '「はっはっは！ その通りだ！」老人は愉快そうに笑い、杖で空間を叩いた。万華鏡のような光の向こうに、冬の街が見えた。（精神+5）'; } },
    ] },
  { id: 'k_log', stages: [2, 3, 4, 5, 6, 7], title: '観測ログ',
    text: () => 'ムーンセルの観測ログに、深見市の夜の記録が流れていく。<br>天降山の斜面から滲み出す黒い霧。原因不明の小さな事故。六十年前の、記録の空白。',
    choices: [
      { label: 'ログを徹底的に解析する', hint: '知力↑・街の秘密', run: () => { gain('int', 4); G.flags.grailHint = true; lore(1);
          return '解析を重ねるほど、あの街の聖杯に「何か」があることだけは確かになった。それが何なのかは、地上で確かめるしかない。（知力+4）'; } },
      { label: '霊脈の流れを写し取る', hint: '魔力↑・霊脈の知識', run: () => { gain('mag', 3); G.flags.leyline = true;
          return '深見の霊脈の地図を、霊子の記憶に焼き付けた。地上に降りたら、陣地作りに役立つはずだ。（魔力+3 陣地作成が得意になった）'; } },
    ] },
  { id: 'k_code', stages: [2, 3, 4, 5, 6, 7], title: 'コードキャスト',
    text: () => '月の聖杯戦争で使い慣れた礼装の術式――コードキャスト。地上の理に合わせて、一つずつ組み直していく。',
    choices: [
      { label: '回復の術式 heal() を組む', hint: '道具を得る', run: () => { item('potion', 1); item('crystal', 1); gain('mag', 2); return '治癒と魔力補給の術式を、地上でも使える形に変換した。（治癒の霊薬+1 魔力結晶+1 魔力+2）'; } },
      { label: '強化の術式 gain_str() を組む', hint: '魔力・知力↑', run: () => { gain('mag', 4); gain('int', 2); return 'サーヴァントの力を引き出す強化の術式を、より精密に磨き上げた。（魔力+4 知力+2）'; } },
    ] },
  { id: 'k_memory', stages: [2, 3, 4, 5, 6, 7], title: '月の記憶',
    text: () => '月の聖杯戦争の記憶が、ふと蘇る。<br>百二十八人のマスター。勝ち進むたびに消えていった、名前も知らない誰か。――そして、何度倒れても立ち上がった、自分自身。',
    choices: [
      { label: '敗れた者たちのことを思う', hint: '精神↑↑', run: () => { gain('spi', 6); return '彼らの願いの上に、今の自分がいる。それを忘れないことが、勝ち残った者の務めだ。（精神+6）'; } },
      { label: 'あの頃の戦術を振り返る', hint: '知力↑↑', run: () => { gain('int', 6); return '敵の手を読み、一手先を打つ。あの戦いで磨いた眼は、今も衰えていない。（知力+6）'; } },
    ] },
  { id: 'k_arena', stages: [2, 3, 4, 5, 6], title: 'アリーナの夜',
    text: () => 'SE.RA.PHの迷宮――アリーナ。かつて幾度も潜ったその場所で、地上を想定した模擬戦を行う。',
    choices: [
      { label: 'エネミーの群れに挑む', hint: '体力判定', run: () => {
          const c = chk('phy', 50);
          if (c.ok) { gain('phy', 4); gain('luk', 2); return [c.text, '霊子の体が、少しずつ戦いの勘を取り戻していく。（体力+4 幸運+2）']; }
          hp(-10); gain('spi', 3); return [c.text, '手痛い一撃をもらった。だが、諦めずに最後まで立っていた。（HP-10 精神+3）'];
        } },
      { label: '英霊の戦いぶりを観察する', hint: '知力↑', run: () => { gain('int', 4); return `${lineupNames()}――英霊たちの戦い方を、一つずつ頭に叩き込んだ。（知力+4）`; } },
    ] },
  { id: 'k_bb', stages: [3, 4, 5, 6, 7], title: '月の裏側からの通信', cond: () => kishiLineup().includes('bb'),
    text: () => '玉座の間に、ノイズ混じりの通信が割り込んできた。「センパイ、聞こえてますー？ 地上なんて、つまらない場所に行くつもりですか？ BBちゃん、反対でーす♪」',
    choices: [
      { label: '「一緒に来てくれると心強い」', hint: '交渉・幸運↑', run: () => { gain('cha', 3); gain('luk', 3); G.flags.kishiBond = G.flags.kishiBond || 'bb';
          return '「……ふーん。センパイがそこまで言うなら、考えてあげてもいいですよ？」通信は、少しだけ嬉しそうな声で切れた。（交渉+3 幸運+3）'; } },
      { label: '通信を切る', hint: '精神↑', run: () => { gain('spi', 4); return '「ちょ、センパイ!? ひど――」ぷつん。……後で埋め合わせをしよう。（精神+4）'; } },
    ] },
  { id: 'k_fukami', stages: [6, 7], title: '深見の夜',
    text: () => '降下の前に、もう一度だけ深見の夜を観測した。<br>雪の降る街。旧城下町の灯り。天降山の頂に、黒い霧がわだかまっている。<br>――あの街で、もうすぐ聖杯戦争が始まる。',
    choices: [
      { label: '黒い霧を、さらに深く観測する', hint: '魔力判定・秘密に触れる', run: () => {
          const c = chk('mag', 50); G.flags.grailHint = true; lore(2);
          if (c.ok) { G.flags.touchedMist = true; gain('mag', 3); return [c.text, '霧の奥に、聖杯の器らしきものが見えた。……それが穢れているのか、澄んでいるのか。月からでは、まだ分からない。（魔力+3）']; }
          return [c.text, '観測にノイズが走り、霧の奥は見えなかった。'];
        } },
      { label: '街の人々の暮らしを眺める', hint: '精神・交渉↑', run: () => { gain('spi', 3); gain('cha', 3);
          return '笑い合う家族、帰り道の学生たち、店じまいをする老人。――守る理由は、それで十分だった。（精神+3 交渉+3）'; } },
    ] },
];
// 宮廷の出来事：選択肢は今の英霊たちから作る
GROWTH_EVENTS_K[0].choices = KISHI_LINEUP.m.concat(KISHI_LINEUP.f).filter((x, i, a) => a.indexOf(x) === i).map(id => ({
  label: () => `${SV_BY_ID[id].id === 'emiya' ? '無銘' : SV_BY_ID[id].short}と話す`, hint: 'この英霊との縁が深まる',
  cond: () => kishiLineup().includes(id),
  run: () => { G.flags.kishiBond = id; gain('cha', 3); gain('spi', 3);
    return [`${id === 'emiya' ? '無銘' : SV_BY_ID[id].short}に、深見の世界線のことを打ち明けた。`, `<p class="quote">${fmt(KISHI_REUNION_SV[id] || '「……分かった」')}</p>`,
      '（交渉+3 精神+3）', '<span class="note">地上でこの英霊を喚ぶと、さらに絆が深い状態で始まる。</span>']; },
}));

// ---- 物語 ----
STORY.push(
  {
    id: 'k_prep_descent', phase: 'prep', day: 1, slot: 0, after: 'hub', cond: () => G.route === 'kishinami',
    title: '降下', chapter: '序章　令呪の冬',
    text: () => `目を開けると、冬の匂いがした。<br>霊子の体は、地上の理に馴染んでいる。駅前の雑踏、白い息、遠くに見える天降山。――深見市。<br>右手の甲には、ムーンセルの紋様に似た、三画の令呪が浮かんでいた。<br>どこかで、宝石翁の笑い声が聞こえた気がした。`,
    choices: [
      { label: '教会に、マスターとして名乗り出る', hint: '秩序・教会に登録', run: () => { tone('law'); G.flags.registered = true;
          return `${CAST.sister}は名簿を確かめ、首を傾げた。「……奇妙ですね。あなたの記録は、この世界のどこにもありません」<br>それでも彼女は、あなたの名を名簿に書き加えた。（教会に登録）`; } },
      { label: '街を観測し、霊脈の要を探る', hint: '知力↑・霊脈の知識', run: () => { gain('int', 3); G.flags.leyline = true;
          return '月から写し取った霊脈の地図と、実際の街を照らし合わせた。拠点にすべき場所が、手に取るように分かる。（知力+3 陣地作成が得意になった）'; } },
      { label: '宝石翁の置き土産を確かめる', hint: '道具を得る', run: () => { item('potion', 1); item('smoke', 1); money(3);
          return 'コートのポケットに、見覚えのない財布と小瓶が入っていた。メモには一言。「せいぜい楽しませてくれ」（治癒の霊薬+1 煙幕の護符+1 資金+3）'; } },
    ],
  },
  {
    id: 'k_moonlink', phase: 'war', day: 5, slot: 0, after: 'hub', cond: () => G.route === 'kishinami',
    title: 'ムーンセルの解析', chapter: '第二幕　侵蝕',
    text: () => `夜明け前、頭の奥にノイズが走った。月に残してきたムーンセルからの、細い通信だ。<br>「――地上の聖杯の、解析結果を送信します」`,
    choices: [
      { label: '解析結果を読み解く', hint: '知力判定・真相の手がかり+2', run: () => {
          const c = chk('int', 55);
          if (!c.ok) return [c.text, '通信は途中で途切れた。地上と月の距離は、思った以上に遠い。'];
          if (solved()) { gain('int', 5); return [c.text, '解析結果は、あなたが地上で確かめた真相を裏付けていた。（知力+5）']; }
          if (isBeast()) { mys().beastSign = true; return [c.text, '「地上の聖杯に、汚染は検出されず。ただし、器の魔力量が観測のたびに減少。外部への<b>流出</b>を検出。――警告。この反応は、人類悪の幼体に類似」',
            addClue('moonlink', 'ムーンセルの解析', '地上の聖杯に汚染はない。だが、器の魔力が何者かに吸い出されている。人類悪の幼体に似た反応がある。', 2)]; }
          return isCursed()
            ? [c.text, '「地上の聖杯の内部に、月でいう『ウイルス』に近い汚染を検出。六十年前に取り込まれたものと推定」',
              addClue('moonlink', 'ムーンセルの解析', '地上の聖杯の内部に、ウイルスのような汚染がある。六十年前に取り込まれたものらしい。', 2)]
            : [c.text, '「地上の聖杯に、汚染は検出されず。ただし、市内の複数地点で、魔術師による魂の収奪の痕跡を確認」',
              addClue('moonlink', 'ムーンセルの解析', '地上の聖杯に汚染はない。代わりに、市内で魔術師による魂の収奪の痕跡がある。', 2)];
        } },
      { label: () => `${SVname()}と、月の戦いを思い出す`, hint: '絆↑・精神↑', run: () => { bond(5); gain('spi', 4);
          return `「月で戦っていた頃と、同じ顔をしているな」${SV()}が、小さく笑った。（絆+5 精神+4）`; } },
    ],
  },
  {
    id: 'k_jewel', phase: 'war', day: 7, slot: 0, after: 'hub', cond: () => G.route === 'kishinami',
    title: '宝石翁の気まぐれ', chapter: '第二幕　侵蝕',
    text: () => `城跡公園のベンチに、見覚えのある老紳士が座っていた。<br>「やあ、月の王。なかなか良い顔で戦っておるな」宝石翁は、楽しげに杖を回した。「褒美というわけではないが――少しばかり、助けてやろう」`,
    choices: [
      { label: '「力を貸してほしい」', hint: '魔力・知力↑↑', run: () => { gain('mag', 8); gain('int', 5); return '老人が杖で地面を叩くと、霊子の体に、並行世界の自分たちの経験が流れ込んできた。（魔力+8 知力+5）'; } },
      { label: '「この戦いの結末を教えてほしい」', hint: '交渉判定', run: () => {
          const c = chk('cha', 65);
          if (c.ok) { G.master.seals = Math.min(3, G.master.seals + 1); return [c.text, '「結末は教えられん。だが――これくらいはよかろう」<br>右手が熱を帯び、失われた令呪が一画、蘇った。（令呪+1、最大3画）']; }
          return [c.text, '「それを知ってしまっては、つまらんだろう？」老人は笑って姿を消した。'];
        } },
      { label: '「見ていてください。最後まで」', hint: '精神↑↑・絆↑', run: () => { gain('spi', 8); bond(5);
          return `「……ふむ。その目だ。諦めを知らぬ目。だからこそ、儂は月の王を面白いと思うのだ」<br>宝石翁は満足げに頷き、雑踏の中に消えた。（精神+8 絆+5）`; } },
    ],
  },
);

// ---- 降下の序章 ----
function kishinamiStart() {
  const m = G.master;
  G.lastChapter = '月の王';
  chapterCard('特殊シナリオ　岸波白野', () => {
    scene({ title: '月の玉座', sub: '月の王', reveal: true, body: paras([
      '月の聖杯戦争。百二十八人のマスターが、願望機ムーンセルを巡って競い合った電脳の戦い。<br>その頂に立ったのは、記憶も願いも持たなかった、一人のマスターだった。',
      `岸波白野。月の王となった${kp()}は、ムーンセルの玉座から、無数の世界線を観測し続けている。`,
      'ある日、観測の網に、一つの不穏な世界線が掛かった。<br>地上の、冬の地方都市。<b>深見の聖杯戦争</b>。',
      `${kp()}の介入は、果たしてどのような結果をもたらすのか。……それは、宝石翁のみぞ知る。`,
      `<div class="birth-facts"><div><span>共に戦う英霊</span><b>${lineupNames()}</b></div><div><span>戦略眼</span><b>超高レベル</b></div><div><span>得意</span><b>${TALENTS[m.talent]}</b></div></div>`,
      '<span class="note">特殊シナリオ：月の玉座での7つの期間の過ごし方が、あなたの力になる。召喚できるのは、月で契約した英霊たちだ。</span>',
    ]), choices: [{ label: '観測を始める', cls: 'primary', icon: 'next', fn: () => nextStage() }] });
  });
}
function kishiMaster(name, g) {
  const b = BIRTHS.find(x => x.id === 'kishinami');
  return { name: name || '岸波　白野', gender: g || 'n', birth: 'kishinami', stats: { ...b.stats }, hp: 100, hpMax: 100, money: b.money, age: 18,
    talent: 'int', seals: 3, od: 0, align: { law: 1, good: 4 }, alignV: 2, element: '霊子', circuits: 30 };
}
function kishinamiPrologue() {
  next('降下', paras([
    '七つの期間が過ぎた。観測と干渉を重ね、霊子の体は地上の理に馴染んだ。', G.summary,
    '宝石翁の開いた万華鏡の道を抜けて、月の王は地上へと降りる。',
    '深見市。冬。――聖杯戦争が始まる、三日前。',
    `<span class="note">【特殊シナリオ】召喚の夜まで${PREP_DAYS}日。召喚できるのは月で契約した英霊（${lineupNames()}）。<br>【戦略眼】戦闘では敵の次の手を必ず読み切る。【マトリクス】敵と対面するたびに情報を解析し、2度目の対面で真名を暴く。</span>`,
  ]), beginPrep, '準備を始める', 'PROLOGUE');
}
// 召喚：月で契約した英霊を、霊子の縁で喚び寄せる
function kishiSummonScene() {
  scene({ title: '召喚の夜', sub: 'SUMMONING', body: [
    '<p>準備の日々は終わった。今宵、聖杯戦争が始まる。</p>',
    '<p>召喚陣の前に立ち、目を閉じる。月の玉座と、霊子の糸でまだ繋がっている。その先に、月で契約した英霊たちがいる。</p>',
    '<p>誰の名を呼ぶ？</p>',
  ], choices: kishiLineup().map(id => {
    const s = SV_BY_ID[id];
    return { label: `${id === 'emiya' ? '無銘' : s.name}（${s.cls}）${G.flags.kishiBond === id ? '　★' : ''}`, hint: s.p.map((r, i) => PARAM_NAMES[i][0] + r).join(' '), fn: () => kishiChant(id) };
  }).concat([{ label: '縁に任せる', hint: '月の英霊の誰かが応える', fn: () => kishiChant(pick(kishiLineup())) }]) });
}
function kishiChant(id) {
  scene({ title: '英霊召喚', sub: 'SUMMONING', reveal: true, body: [
    '<p>右手を掲げる。令呪と、月から伸びる霊子の糸が重なる。</p>',
    ...SUMMON_CHANT.map(t => `<p class="chant">${t}</p>`),
    '<p class="chant">――月の王の名において。応えよ、我が英霊！</p>',
  ], choices: [{ label: '詠唱を終える', cls: 'primary', icon: 'ritual', fn: () => doSummon(id) }] });
}
function kishiAfterSummon() {
  next('聖杯戦争、開幕', [
    `<p>月の記憶を持ったまま応えた${SV()}と、地上での契約を交わした。互いの戦い方は、もう知り尽くしている。</p>`,
    '<p>七騎のサーヴァントと七人のマスター。月の聖杯戦争とは違う、地上の戦い。けれど、やることは変わらない。――最後まで、諦めないこと。</p>',
    `<p class="note">【戦略眼】戦闘では敵の次の手を必ず読み切り、大きな補正がかかる。【マトリクス】敵と対面するたびに情報を解析し、2度目の対面で真名を暴く。期限は${WAR_DAYS}日。</p>`,
  ], startSlot, '戦いへ', '第一幕　開幕');
}
// マトリクス：対面するたびに敵を解析する
function kishiMatrix(r) {
  if (!isKishi() || r.servantId === 'ori' || knowsName(r)) return '';
  r.matrix = (r.matrix || 0) + 1;
  if (r.matrix >= 2) { r.named = true; r.intel = Math.max(r.intel, 2); addLog(`マトリクス解析：${r.cls}の真名「${servantOf(r).name}」。`);
    return `<span class="note">【マトリクス解析・完了】${r.cls}の真名は<b>${servantOf(r).name}</b>。宝具「${servantOf(r).np}」――手の内は、すべて読めた。</span>`; }
  r.clues = (r.clues || 0) + 2;
  return `<span class="note">【マトリクス解析・1/2】${r.cls}の戦い方、パラメータの傾向を記録した。次に対面すれば、真名まで暴ける。</span>`;
}
// エピローグ
function kishiEpilogue(kind) {
  if (!isKishi() || kind === 'dead') return '';
  return `<p class="note">戦いが終わり、霊子の体が、少しずつ月へと還っていく。深見の世界線は、確かに一つの結末を迎えた。<br>月の玉座に戻った${kp()}を、英霊たちが迎える。遠く、宝石翁の愉快そうな笑い声が聞こえた気がした。<br>――月の王の観測は、まだ続いていく。</p>`;
}
