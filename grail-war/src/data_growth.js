// =============================================================
//  成長期のデータ（0歳〜17歳）
//  1ターン＝数年。ターンごとに
//   ①「この数年をどう過ごすか（FOCUS）」を選ぶ → 能力が大きく伸びる
//   ② その年頃の出来事（GROWTH_EVENTS）が起きる → 選択で能力・縁・属性が変わる
//  18歳の冬に令呪が現れ、聖杯戦争の序章へ。
// =============================================================

// 成長の節目（age）。band は章の名前
const STAGES = [
  { age: 0, band: '誕生' },
  { age: 3, band: '幼年期', text: '言葉を覚え、世界の広さを知り始める頃。' },
  { age: 6, band: '幼年期', text: 'ランドセルを背負い、新しい友達ができる頃。' },
  { age: 9, band: () => gw('少年期', '少女期', '学童期'), text: '自分の得意と苦手が、少しずつ見えてくる頃。' },
  { age: 12, band: () => gw('少年期', '少女期', '学童期'), text: '子どもでも大人でもない、揺れ動く頃。' },
  { age: 14, band: '思春期', text: '自分は何者なのか――答えの出ない問いを抱える頃。' },
  { age: 16, band: '青年期', text: '進む道を、自分で選び始める頃。' },
  { age: 17, band: '青年期', text: '子ども時代の終わりが、すぐそこに見えている。' },
];
const ADULT_AGE = 18;

// 過ごし方。gains は伸びる能力（基準値）。magic:true は魔術を学べる環境が必要
const FOCUS = {
  play:    { name: '外を駆け回って遊ぶ', ages: [3, 9], gains: { phy: 12, luk: 6 } },
  books:   { name: '本を読みふける', ages: [3, 12], gains: { int: 12, spi: 5 } },
  family:  { name: '家族と過ごす', ages: [3, 9], gains: { cha: 10, spi: 5, luk: 4 } },
  magic1:  { name: '魔術の手ほどきを受ける', ages: [3, 9], magic: true, gains: { mag: 12, int: 4 } },
  friends: { name: '友達と遊ぶ', ages: [6, 14], gains: { cha: 12, luk: 5 }, friend: 8 },
  martial: { name: '武道を習う', ages: [6, 17], gains: { phy: 12, spi: 6 } },
  shrines: { name: '寺社を巡り、縁を結ぶ', ages: [6, 17], gains: { luk: 11, spi: 5 } },
  merc:    { name: '養父に戦い方を学ぶ', ages: [6, 17], births: ['mercenary'], gains: { phy: 10, int: 5, mag: 5 } },
  church:  { name: '代行者の訓練を受ける', ages: [9, 17], births: ['executor'], gains: { phy: 10, spi: 8, mag: 4 } },
  study:   { name: '勉強に打ち込む', ages: [9, 17], gains: { int: 13, spi: 4 } },
  magic2:  { name: '魔術の修行に励む', ages: [9, 17], magic: true, gains: { mag: 14, spi: 5 } },
  mind:    { name: '瞑想・禊で心を鍛える', ages: [9, 17], gains: { spi: 13, mag: 3 } },
  club:    { name: '部活に打ち込む', ages: [12, 17], gains: { phy: 9, cha: 8 } },
  council: { name: '生徒会で人をまとめる', ages: [12, 17], gains: { cha: 10, int: 6 }, tone: 'law' },
  wander:  { name: '夜の街をさまよう', ages: [12, 17], gains: { luk: 9, spi: 7 }, tone: 'chaos' },
  work:    { name: 'アルバイトで貯金する', ages: [14, 17], gains: { cha: 6 }, money: 4 },
  lore:    { name: '街の伝承と霊脈を調べる', ages: [14, 17], gains: { int: 8, mag: 5 }, catalyst: 0.25 },
};

// 成長期のイベント（書式は data_events.js と同じ）
//  ages  : 発生する年齢の範囲 / births : 特定の産まれ限定 / fixed : その年齢で必ず起きる
const GROWTH_EVENTS = [
  // ---------- 幼年期 ----------
  { id: 'g_fever', ages: [3, 3], title: '三日三晩の熱',
    text: () => '原因不明の高熱が、三日三晩続いた。<br>うなされる夢の中で、誰かがあなたを見下ろしていた。遠い時代の、遠い国の誰か――。',
    choices: [
      { label: '夢の中の声に耳を傾ける', hint: '魔力↑・英霊との縁', run: () => {
          const s = pickVisionServant(); gain('mag', 5); lore(1);
          return [`――${s.desc}<br>熱が引いた朝、あなたはその人の顔だけを、なぜかはっきりと覚えていた。（魔力+5）`,
            '<span class="note">この「縁」は、いつか召喚の時に導いてくれるかもしれない。</span>'];
        } },
      { label: '必死に目を覚まそうとする', hint: '精神↑', run: () => { gain('spi', 6); return '目を開けると、泣き腫らした母の顔があった。あなたは小さな手で、その頬を撫でた。（精神+6）'; } },
    ] },
  { id: 'g_lost', ages: [3, 6], title: '夏祭りの迷子',
    text: () => '天降神社の夏祭り。屋台の灯りに見とれているうちに、家族とはぐれてしまった。',
    choices: [
      { label: '泣かずにその場で待つ', hint: '精神↑・秩序', run: () => { gain('spi', 5); tone('law'); return '鳥居の下でじっと待っていると、ほどなく家族が駆けつけてきた。「えらかったね」（精神+5）'; } },
      { label: '自分で探し回る', hint: '体力・幸運↑・大胆', run: () => { gain('phy', 4); gain('luk', 3); tone('bold'); return '人混みをかき分けて走り回り、自力で家族を見つけ出した。（体力+4 幸運+3）'; } },
      { label: '釣竿を持ったおじいさんについていく', hint: '不思議な出会い', run: () => {
          G.flags.oldTrust = true; gain('luk', 4); lore(1);
          return `釣竿を担いだ無口な老人が、黙って手を引いて家まで送ってくれた。別れ際、老人はあなたの右手をじっと見て呟いた。「……まさか、な」<br>名前は${CAST.old}というらしい。（幸運+4）`;
        } },
    ] },
  { id: 'g_friend', ages: [6, 6], fixed: true, title: '幼馴染',
    text: () => { const f = makeFriend(); return `${birthOf().id === 'clocktower' ? '母の故郷・深見で過ごした夏。' : birthOf().id === 'mercenary' ? '養父がしばらく身を寄せた深見の街で、' : ''}同い年の子と出会った。名前は<b>${f}</b>。<br>${fg('日に焼けた顔で「なあ、いっしょにあそぼうぜ！」と手を差し出してくる。', '人懐っこい笑顔で「いっしょにあそぼ！」と手を差し出してくる。')}`; },
    choices: [
      { label: '手を取って一緒に遊ぶ', hint: '交渉↑・友情', run: () => { friend(30); gain('cha', 4); return `日が暮れるまで遊んだ。それから毎日、${friendName()}はあなたの家に来るようになった。（交渉+4）`; } },
      { label: 'つい意地を張って喧嘩する', hint: '体力↑・好敵手', run: () => { friend(20); gain('phy', 4); G.flags.friendRival = true;
          return `取っ組み合いの喧嘩になった。泥だらけの二人は、なぜか最後には笑っていた。${friendName()}は「${fg('次は負けないからな！', '次は負けないんだから！')}」と言った。（体力+4）`; } },
      { label: '大事な宝物を分けてあげる', hint: '幸運↑・善', run: () => { friend(25); gain('luk', 3); tone('good');
          return `綺麗なビー玉を半分あげると、${friendName()}は目を輝かせた。「ずっと大事にする！」（幸運+3）`; } },
    ] },
  { id: 'g_first_magic', ages: [6, 9], magic: true, title: '初めての魔術',
    text: () => `${birthOf().id === 'mercenary' ? '養父' : '父'}が、蝋燭を一本あなたの前に置いた。「指先に意識を集めろ。魔力を、熱に変えるんだ」`,
    choices: [
      { label: '教えられた通りに', hint: '魔力↑・秩序', run: () => { gain('mag', 5); tone('law'); return '小さな、けれど確かな火が灯った。「……筋は悪くない」（魔力+5）'; } },
      { label: '自己流でやってみる', hint: '魔力判定・混沌', run: () => {
          tone('chaos'); const r = chk('mag', 32);
          if (r.ok) { gain('mag', 9); return [r.text, '蝋燭どころか、燭台ごと青い炎に包まれた。大人たちが息を呑む。（魔力+9）']; }
          gain('spi', -2); gain('mag', 2); return [r.text, '指先を火傷した。痛みと一緒に、魔力の流れが少しだけ分かった気がする。（魔力+2 精神-2）'];
        } },
      { label: '炎が怖くて泣いてしまう', hint: '精神・交渉↑', run: () => { gain('spi', 3); gain('cha', 2);
          return '大きな手が、あなたの頭を撫でた。「怖いと思えるなら、それでいい。魔術は危ないものだからな」（精神+3 交渉+2）'; } },
    ] },
  { id: 'g_agnes', ages: [3, 3], fixed: true, births: ['executor'], title: '若い修道女',
    text: () => `孤児院を切り盛りする若い修道女――${CAST.sister}は、あなたにとって母であり、姉だった。<br>厳しくて、不器用で、でも夜にはいつも子守唄を歌ってくれる。`,
    choices: [
      { label: '聖書を読んでもらう', hint: '知力・精神↑', run: () => { gain('int', 4); gain('spi', 3); G.flags.agnesBond = true; return '難しい言葉ばかりだったけれど、彼女の声を聞いているのが好きだった。（知力+4 精神+3）'; } },
      { label: '礼拝を抜け出して遊ぶ', hint: '体力↑・混沌', run: () => { gain('phy', 4); tone('chaos'); return '見つかってこっぴどく叱られた。でも、彼女は最後に少しだけ笑っていた。（体力+4）'; } },
      { label: '小さい子の世話を手伝う', hint: '交渉↑・善', run: () => { gain('cha', 4); tone('good'); G.flags.agnesBond = true; return '「ありがとう。あなたがいてくれて、助かります」（交渉+4）'; } },
    ] },
  { id: 'g_merc', ages: [3, 3], fixed: true, births: ['mercenary'], title: '養父の教え',
    text: () => '砂埃の舞う野営地。養父はナイフを研ぎながら言った。「いいか。生き延びろ。それだけが、この世界で唯一の正解だ」',
    choices: [
      { label: 'ナイフの扱いを教わる', hint: '体力↑', run: () => { gain('phy', 6); G.flags.grudge = true; return '焼かれた村のことは、一日も忘れたことがない。何度も手を切りながら、刃の重さを体で覚えた。（体力+6）'; } },
      { label: '魔術の罠の作り方を教わる', hint: '魔力・知力↑', run: () => { gain('mag', 5); gain('int', 2); return '「魔術は道具だ。使えるものは全部使え」（魔力+5 知力+2）'; } },
      { label: '「なんで戦うの？」と聞く', hint: '精神↑', run: () => { gain('spi', 5); G.flags.askedWhy = true;
          return '養父は長いこと黙っていた。「……いつか、戦わなくていい場所を見つけるためさ」（精神+5）'; } },
    ] },
  // ---------- 少年期 ----------
  { id: 'g_shrine', ages: [9, 9], fixed: true, births: ['shrine'], title: '神楽と霊脈',
    text: () => `秋の例大祭。あなたは初めて神楽を舞うことになった。年下の従妹、${CAST.miko}が袖を引く。「がんばってね！」`,
    choices: [
      { label: '舞を極める', hint: '精神・交渉↑', run: () => { gain('spi', 6); gain('cha', 2); return '鈴の音とともに舞い終えると、境内が静まり返り、やがて大きな拍手が湧いた。（精神+6 交渉+2）'; } },
      { label: '舞いながら霊脈を感じ取る', hint: '魔力↑・霊脈の知識', run: () => { gain('mag', 6); G.flags.leyline = true;
          return '足元から、山の鼓動が伝わってきた。この山の下には、とても大きな何かが眠っている。（魔力+6）'; } },
      { label: '雫と屋台を回る', hint: '交渉↑', run: () => { gain('cha', 4); G.flags.metMiko = true; return `「ねえねえ、次はあっち！」${CAST.miko}に振り回された一日だった。（交渉+4）`; } },
    ] },
  { id: 'g_debt', ages: [9, 9], fixed: true, births: ['fallen'], title: '借金取り',
    text: () => '玄関で、母が見知らぬ男たちに頭を下げていた。「先代の借りは、きっちり返してもらいますよ」',
    choices: [
      { label: '母の前に立つ', hint: '精神↑・善', run: () => { gain('spi', 5); tone('good'); return '男たちは鼻で笑って帰っていった。母は、震えるあなたを強く抱きしめた。（精神+5）'; } },
      { label: '蔵に籠もって魔導書を読む', hint: '魔力・知力↑', run: () => { gain('mag', 6); gain('int', 3); G.flags.grudge = true;
          return '「いつか、この家を取り戻す」先祖の魔導書を開いたのは、その夜が初めてだった。（魔力+6 知力+3）'; } },
      { label: '蔵の骨董を売ろうと提案する', hint: '資金↑', run: () => { money(3); gain('int', 2); return '母は悲しそうに笑い、古い壺を一つだけ手放した。（資金+3 知力+2）'; } },
    ] },
  { id: 'g_awaken', ages: [12, 12], fixed: true, births: ['civilian', 'executor'], title: '目覚め',
    text: () => '眠れない夜。ふと見ると、手のひらに小さな火花が散っていた。<br>体の奥で、何かが脈打っている。……これは、何だ？',
    choices: [
      { label: '誰にも言わずに隠し通す', hint: '精神↑', run: () => { G.flags.awakened = true; lore(2); gain('spi', 5); gain('mag', 3); return '火花はやがて消えた。あなたはそれを、自分だけの秘密にした。（精神+5 魔力+3）<br><span class="note">これ以降、魔術の修行ができるようになった。</span>'; } },
      { label: '図書館で手がかりを探す', hint: '知力・魔力↑', run: () => { G.flags.awakened = true; lore(2); gain('int', 4); gain('mag', 4); return '古いオカルト本の片隅に、「魔術回路」という言葉を見つけた。（知力+4 魔力+4）<br><span class="note">これ以降、魔術の修行ができるようになった。</span>'; } },
      { label: () => G.friend ? `${friendName()}に打ち明ける` : '家族に打ち明ける', hint: '交渉↑', run: () => { G.flags.awakened = true; lore(2); friend(15); gain('cha', 3); gain('mag', 2);
          return `${G.friend ? friendName() : '家族'}は驚いたけれど、笑わずに聞いてくれた。「${G.friend ? fg('すげえじゃん。でも、無理すんなよ', 'すごいじゃん。でも、無理しちゃだめだよ') : 'すごいじゃない。でも、無理しちゃだめよ'}」（交渉+3 魔力+2）<br><span class="note">これ以降、魔術の修行ができるようになった。</span>`; } },
    ] },
  { id: 'g_crest', ages: [12, 12], fixed: true, births: ['noble'], title: '魔術刻印の継承',
    text: () => '十二歳の誕生日。父の手が、あなたの背中に刻印を移していく。全身の神経が焼けるような激痛。<br>「耐えろ。これが、我が家の数百年だ」',
    choices: [
      { label: '歯を食いしばって耐える', hint: '精神判定', run: () => {
          const r = chk('spi', 45);
          if (r.ok) { gain('mag', 12); gain('spi', 3); return [r.text, '激痛の果てに、刻印が体に馴染んでいく。先祖たちの研鑽が、あなたの中で目を覚ました。（魔力+12 精神+3）']; }
          gain('mag', 7); return [r.text, '途中で意識を失った。目覚めると、刻印は半ばまで定着していた。（魔力+7）'];
        } },
      { label: '「なぜ根源を目指すの？」と問う', hint: '知力↑', run: () => { gain('int', 5); gain('mag', 6); G.flags.questioned = true;
          return '父は答えなかった。ただ、その手がほんの一瞬だけ止まったのを、あなたは覚えている。（知力+5 魔力+6）'; } },
    ] },
  { id: 'g_bully', ages: [9, 12], title: '教室の片隅で',
    text: () => `${G.friend ? friendName() : 'クラスメイト'}が、上級生たちに囲まれている。誰も助けようとしない。`,
    choices: [
      { label: '割って入る', hint: '体力判定・善', run: () => {
          tone('good'); const r = chk('phy', 35); friend(10);
          if (r.ok) { gain('phy', 3); gain('cha', 3); return [r.text, '体を張って追い払った。翌日から、あなたを見る皆の目が少し変わった。（体力+3 交渉+3）']; }
          gain('spi', 4); return [r.text, 'ボロボロにされた。それでも、最後まで引かなかった。（精神+4）'];
        } },
      { label: '先生を呼んでくる', hint: '交渉↑・秩序', run: () => { tone('law'); gain('cha', 3); friend(5); return '先生が駆けつけ、上級生たちは散っていった。（交渉+3）'; } },
      { label: '見て見ぬふりをする', hint: '知力↑・悪', run: () => { tone('evil'); gain('int', 2); friend(-10); return '関わらない方が賢い。……そう思うことにした。（知力+2）'; } },
    ] },
  { id: 'g_museum', ages: [9, 14], title: '博物館の遠足',
    text: () => '社会科見学で訪れた市立博物館。古い展示品の一つから、呼ばれたような気がした。',
    choices: [
      { label: '学芸員に話を聞く', hint: '交渉判定・触媒', run: () => {
          const r = chk('cha', 40);
          if (r.ok) { const c = giveCatalyst(); lore(1); return [r.text, `熱心な質問に感心した老学芸員が、「収蔵庫の隅で埃をかぶっていたものだ」と、小さな欠片を譲ってくれた。<b>${c}</b>だ。`]; }
          gain('int', 3); return [r.text, '詳しい話は聞けたが、それだけだった。（知力+3）'];
        } },
      { label: 'ガラス越しにじっと見つめる', hint: '魔力↑', run: () => { gain('mag', 4); gain('spi', 2); lore(1); return '展示品の奥に、かすかな魔力の残り香を感じた。（魔力+4 精神+2）'; } },
    ] },
  { id: 'g_storm', ages: [9, 14], title: '天降山の嵐',
    text: () => '天降山で遊んでいるうちに、急な嵐に襲われた。雨宿りした岩陰の奥で、<b>黒い霧</b>が地面から滲み出しているのが見えた。',
    choices: [
      { label: '霧に近づいてみる', hint: '魔力↑・秘密に触れる', run: () => { gain('mag', 4); gain('spi', -2); G.flags.grailHint = true; G.flags.touchedMist = true; lore(1);
          return '霧に触れた指先が、凍るように冷たくなった。耳の奥で、誰かの怨嗟の声がした気がする。（魔力+4 精神-2）'; } },
      { label: '雨の中を全力で駆け下りる', hint: '体力↑', run: () => { gain('phy', 5); return '泥だらけになって、どうにか麓まで辿り着いた。（体力+5）'; } },
      { label: '目を閉じて祈る', hint: '精神↑', run: () => { gain('spi', 5); return '嵐が過ぎるまで、ただ祈り続けた。目を開けると、霧は消えていた。（精神+5）'; } },
    ] },
  { id: 'g_oldman', ages: [12, 17], title: '河川敷の釣り人',
    text: () => `御影川の河川敷で、釣り糸を垂れる老人の隣に座るのが、いつの間にか習慣になっていた。${CAST.old}――無口だが、不思議と居心地のいい人だ。`,
    choices: [
      { label: '昔の話をせがむ', hint: '知力↑・街の秘密', run: () => { gain('int', 4); G.flags.oldTrust = true; G.flags.grailHint = true; lore(2);
          return '「昔、この街で戦争があった。誰も知らない戦争じゃ」老人はそれきり黙った。（知力+4）'; } },
      { label: '釣りを教わる', hint: '精神・幸運↑', run: () => { gain('spi', 4); gain('luk', 2); G.flags.oldTrust = true; lore(1);
          return '「待つことを覚えなされ。焦る者から、川に呑まれる」（精神+4 幸運+2）'; } },
    ] },
  { id: 'g_injury', ages: [9, 16], title: '交差点',
    text: () => '下校途中の交差点。信号無視のトラックが、目の前に迫ってきた――！',
    choices: [
      { label: '咄嗟に跳ぶ', hint: '幸運判定', run: () => {
          const r = chk('luk', 40);
          if (r.ok) { gain('luk', 3); gain('phy', 2); return [r.text, '紙一重でかわした。……今のは、本当に自分の力だったのだろうか。（幸運+3 体力+2）']; }
          gain('phy', -2); gain('spi', 5); return [r.text, '跳ね飛ばされ、一ヶ月入院した。病室の窓から見る景色で、少しだけ大人になった。（体力-2 精神+5）'];
        } },
    ] },
  // ---------- 思春期・青年期 ----------
  { id: 'g_club', ages: [12, 16], title: '最後の大会',
    text: () => '部活の大会。ここまで積み重ねてきた全てを出し切る日だ。',
    choices: [
      { label: '全力でぶつかる', hint: '体力判定', run: () => {
          const r = chk('phy', 50);
          if (r.ok) { gain('cha', 5); gain('phy', 3); return [r.text, '勝った。仲間たちと抱き合って泣いた。（交渉+5 体力+3）']; }
          gain('spi', 5); return [r.text, '負けた。悔しさで眠れなかった夜が、あなたを強くした。（精神+5）'];
        } },
      { label: '仲間を支える役に回る', hint: '交渉↑・善', run: () => { gain('cha', 5); tone('good'); return '「お前がいたから、ここまで来れた」仲間の言葉が、何よりの勲章だった。（交渉+5）'; } },
    ] },
  { id: 'g_exam', ages: [12, 17], title: '試験',
    text: () => '人生を左右するかもしれない試験の日。鉛筆を握る手に、汗が滲む。',
    choices: [
      { label: '実力で挑む', hint: '知力判定', run: () => {
          const r = chk('int', 52);
          if (r.ok) { gain('int', 5); gain('spi', 2); return [r.text, '手応えは十分だった。結果は――合格。（知力+5 精神+2）']; }
          gain('spi', 4); return [r.text, '結果は振るわなかった。けれど、まだ道は一つじゃない。（精神+4）'];
        } },
      { label: '暗示の魔術で試験官を……', hint: '魔力判定・悪', cond: () => hasMagic(), run: () => {
          tone('evil'); const r = chk('mag', 48);
          if (r.ok) { gain('mag', 4); return [r.text, '誰にも気付かれなかった。……胸の奥に、小さな棘が刺さったまま。（魔力+4）']; }
          gain('spi', -3); return [r.text, '術が乱れ、自分の頭がぼんやりしてしまった。散々な結果だ。（精神-3）'];
        } },
    ] },
  { id: 'g_runaway', ages: [12, 16], title: '家出',
    text: () => '些細なことで家族と言い争い、夜の街に飛び出した。',
    choices: [
      { label: '夜の港へ向かう', hint: '幸運・知力↑・混沌', run: () => { tone('chaos'); gain('luk', 4); gain('int', 3); lore(1);
          return '倉庫街で、外国訛りの奇妙な男に会った。男はあなたの右手を見て笑った。「数年後が楽しみだ」……あれは誰だったのだろう。（幸運+4 知力+3）'; } },
      { label: () => G.friend ? `${friendName()}の家に転がり込む` : '公園で夜を明かす', hint: '友情', run: () => { friend(15); gain('cha', 3);
          return G.friend ? `${friendName()}は何も聞かずに、温かいココアを出してくれた。（交渉+3）` : '寒い夜だった。朝になって、家に帰った。（交渉+3）'; } },
      { label: '思いとどまって家に帰る', hint: '精神↑・秩序', run: () => { tone('law'); gain('spi', 4); return '玄関で待っていた家族に、ぽつりと謝った。（精神+4）'; } },
    ] },
  { id: 'g_heart', ages: [14, 17], cond: () => !!G.friend && !frCut() && !frClose(), title: '淡い想い',
    text: () => `放課後の帰り道。夕焼けの中で${friendName()}が振り返った。「${fg('なあ、高校卒業したらさ……どうすんの？', 'ねえ、高校卒業したらさ……どうするの？')}」<br>その横顔に、なぜか胸がざわついた。`,
    choices: [
      { label: '素直な気持ちを伝える', hint: '交渉↑・関係：恋人', run: () => { friend(20); gain('cha', 5); G.flags.friendHeart = true; frSetRel('lover', '想いを伝えた');
          return `${friendName()}は真っ赤になって、それから小さく頷いた。「${fg('……知ってたよ、ばか。俺もだ', '……知ってたよ、ばか')}」（交渉+5）`; } },
      { label: '「ずっと友達だよ」と笑う', hint: '精神↑', run: () => { friend(10); gain('spi', 4); return `「${fg('……ああ。ずっと、な', '……うん。ずっと、ね')}」${friendName()}は少しだけ寂しそうに笑った。（精神+4）`; } },
    ] },
  { id: 'g_heirloom', ages: [14, 17], title: '形見',
    text: () => '祖父の葬儀の後、遺品の整理をしていると、桐箱が出てきた。添えられた手紙には「これは、いつかお前の役に立つ」とだけ書かれている。',
    choices: [
      { label: '大切に受け継ぐ', hint: '触媒を得る', run: () => { const c = giveCatalyst(); lore(1); return `箱の中には<b>${c}</b>が入っていた。祖父は、何を知っていたのだろう。`; } },
      { label: '古物商に売る', hint: '資金↑', run: () => { money(4); return '思いのほか高値がついた。（資金+4）……少しだけ、後ろめたい。'; } },
    ] },
  { id: 'g_trip', ages: [15, 17], title: '修学旅行',
    text: () => '修学旅行で、初めて海外を訪れた。古い街並み、石畳、博物館の大理石。',
    choices: [
      { label: '大英博物館に入り浸る', hint: '知力↑・幸運判定で触媒', run: () => {
          gain('int', 4); const r = chk('luk', 50);
          if (r.ok) { const c = giveCatalyst(); return [r.text, `帰り際、蚤の市で妙に惹かれる品を見つけた。<b>${c}</b>だ。（知力+4）`]; }
          return [r.text, '展示品の数々に圧倒された。（知力+4）'];
        } },
      { label: '自由行動で街を歩き回る', hint: '交渉・幸運↑', run: () => { gain('cha', 4); gain('luk', 2); return '片言の英語で、地元の人たちと笑い合った。（交渉+4 幸運+2）'; } },
    ] },
  { id: 'g_secret', ages: [16, 17], cond: () => !!G.friend && !frCut(), title: '幼馴染の秘密',
    text: () => `夜、${friendName()}から電話がかかってきた。「${fg('なあ……変なこと聞くけど。最近、手の甲が痛くなったりしないか？', 'ねえ……変なこと聞くけど。最近、手の甲が痛くなったりしない？')}」<br>電話の向こうの声は、かすかに震えていた。`,
    choices: [
      { label: '「何かあったら、必ず力になる」', hint: '友情・善', run: () => { friend(15); tone('good'); G.flags.friendPromise = true; lore(1);
          return `「……ありがと。うん、大丈夫。ちょっと聞いてみただけ」${friendName()}はそう言って電話を切った。<br>その夜、あなたの右手の甲も、かすかに疼いた。`; } },
      { label: '自分の秘密も打ち明ける', hint: '友情↑', cond: () => hasMagic(), run: () => { friend(20); gain('cha', 3); lore(1);
          return `長い沈黙の後、${friendName()}は言った。「……そっか。やっぱり、${fYou()}も『こっち側』なんだ${fg('な', '')}」（交渉+3）`; } },
      { label: '「気のせいじゃない？」と流す', hint: '精神↑', run: () => { gain('spi', 3); return `「……そうだよね。ごめん、変なこと言って」（精神+3）`; } },
    ] },
  { id: 'g_parttime', ages: [14, 17], title: '初めてのアルバイト',
    text: () => '駅前の喫茶店で、初めてのアルバイトを始めた。',
    choices: [
      { label: '真面目にこなす', hint: '資金・交渉↑', run: () => { money(3); gain('cha', 3); return '常連客にも顔を覚えてもらえた。（資金+3 交渉+3）'; } },
      { label: '夜勤も入って稼ぐ', hint: '資金↑↑・体力↓', run: () => { money(5); gain('phy', -2); return '体はきついが、貯金は順調に増えた。（資金+5 体力-2）'; } },
    ] },
  // ---------- 17歳：進路（参戦の経緯が決まる） ----------
  { id: 'g_crossroads', ages: [17, 17], fixed: true, title: '進路',
    text: () => {
      const b = birthOf();
      if (b.id === 'mercenary') return '養父が古い銃を磨きながら言った。「お前ももう一人前だ。この先どう生きるかは、自分で決めろ」';
      if (b.id === 'executor') return `${CAST.sister}が、進路希望の紙を差し出した。「代行者の道に進むのも、普通の大学に行くのも、あなたの自由です。……どちらを選んでも、私はあなたの味方ですよ」`;
      if (b.magic) return '高校最後の冬。家の書斎で、分厚い魔導書と大学のパンフレットが並んでいる。魔術師として生きるのか、それとも――。';
      if (G.lore >= 2) return 'この街には、何かがある。夢に見た英霊、黒い霧、釣り人の昔話。<br>大学のパンフレットを前に、あなたはずっと考えていた。このまま「普通」に生きていいのだろうか、と。';
      return '高校最後の冬。友達は皆、受験や就職の話で持ちきりだ。あなたも、そろそろ決めなければならない。';
    },
    choices: [
      { label: '家を継ぎ、魔術師として生きる', hint: '魔力↑', cond: () => birthOf().magic && birthOf().id !== 'mercenary', run: () => {
          gain('mag', 4); tone('law'); return '書斎の扉を閉じ、魔導書を開いた。迷いは、もうない。（魔力+4）'; } },
      { label: '魔術から離れて生きたい', hint: '交渉↑・道を外れる', cond: () => birthOf().magic, run: () => {
          G.flags.rebel = true; gain('cha', 3); tone('chaos');
          return '大学のパンフレットに、そっと丸をつけた。……家の誰にも、まだ言えていない。（交渉+3）'; } },
      { label: '養父の跡を継ぎ、傭兵になる', hint: '体力↑', cond: () => birthOf().id === 'mercenary', run: () => {
          gain('phy', 4); return '養父は何も言わず、使い込んだナイフを一本、あなたに渡した。（体力+4）'; } },
      { label: '代行者として生きる', hint: '体力・精神↑', cond: () => birthOf().id === 'executor', run: () => {
          G.flags.churchPath = true; gain('phy', 2); gain('spi', 3); lore(2);
          return `${CAST.sister}は少しだけ寂しそうに微笑んだ。「……分かりました。では、教えましょう。この街の、本当の姿を」（体力+2 精神+3）`; } },
      { label: 'この街の秘密を追い続ける', hint: '知力↑・真実へ', cond: () => !birthOf().magic && G.lore >= 2, run: () => {
          G.flags.pursue = true; gain('int', 4); lore(1); tone('bold');
          return 'パンフレットを閉じ、図書館の郷土資料室へ向かった。答えは、きっとこの街のどこかにある。（知力+4）'; } },
      { label: '普通に進学・就職する', hint: '交渉・精神↑', cond: () => !birthOf().magic || birthOf().id === 'mercenary', run: () => {
          if (birthOf().magic) G.flags.rebel = true;
          gain('cha', 3); gain('spi', 2); tone('cautious');
          return '平凡でいい。穏やかな毎日が続けば、それで。（交渉+3 精神+2）'; } },
      { label: () => `${friendName()}と同じ大学を目指す`, hint: '友情↑', cond: () => !!G.friend && !birthOf().magic, run: () => {
          friend(10); gain('int', 3); return `「${fg('マジか！？ じゃあ一緒に勉強しようぜ！', 'ほんと！？ じゃあ一緒に勉強しよ！')}」${friendName()}は飛び上がって喜んだ。（知力+3）`; } },
    ] },
];

// ---- 成長期の過ごし方の情景（[幼い頃（〜9歳）, 12歳から]）。結果の数値の前に添える ----
const FOCUS_SCENE = {
  play: ['泥だらけで帰って、毎晩叱られた。膝の擦り傷は、治る前に新しいものが増えた。', '日が暮れるまで、知らない路地を駆け回った。'],
  books: ['絵本を抱えたまま眠る夜が続いた。気付けば、図書館の司書さんに名前を覚えられていた。', '図書館の閉館時間まで、本の世界に浸った。読んだ本の数だけ、世界が広がっていく気がした。'],
  family: ['食卓を囲み、他愛のない話をして笑った。何でもない毎日が、あなたの土台になっていった。', '家族と過ごす時間は、少し照れくさく、けれど確かに温かかった。'],
  magic1: ['指先に小さな灯りがともった日、あなたは嬉しくて眠れなかった。', '魔術の基礎を、繰り返し体に叩き込んだ。'],
  friends: ['毎日誰かの家に集まって、秘密基地を作ったり、喧嘩をしたり、仲直りをしたりした。', '放課後は、いつも誰かと一緒だった。くだらない話で、何時間でも笑っていられた。'],
  martial: ['道場の床は冷たく、竹刀は重かった。それでも、毎週欠かさず通った。', '朝の稽古で、汗と一緒に迷いを流した。少しずつ、背筋が伸びていく。'],
  shrines: ['休みの日は、古い神社やお寺を巡った。鳥居をくぐるたびに、空気が変わる気がした。', '古い社を巡り、手を合わせる。見えない何かと、少しずつ縁が結ばれていく。'],
  merc: ['養父の背中を追いかけて、山を歩き、火の起こし方を覚えた。', '養父との訓練は、容赦がなかった。生き延びる術が、体に刻み込まれていく。'],
  church: ['祈りと規律の毎日。夜明け前の聖堂は、いつも冷たかった。', '代行者としての訓練は過酷だった。祈りの言葉と、戦いの技を、同じ重さで覚えた。'],
  study: ['机に向かう時間が、少しずつ長くなっていった。', '参考書の山を、一冊ずつ崩していった。答えが分かる瞬間が、たまらなく好きだった。'],
  magic2: ['魔術回路が焼けるような痛みにも、少しずつ慣れていった。', '工房に籠もり、術式の精度を一つずつ高めていった。魔術師としての自分が、形になっていく。'],
  mind: ['静かに目を閉じ、自分の呼吸だけを聞く時間が好きになった。', '冷たい水を浴び、心を鎮める。揺れなくなった心に、少しずつ芯が通っていく。'],
  club: ['部活の仲間と、汗を流した。', '部活の仲間と、汗と涙を分け合った。最後の大会の夜、皆で泣きながら笑った。'],
  council: ['クラスの話し合いで、自然とまとめ役になっていた。', '生徒会室の灯りは、いつも最後まで点いていた。人をまとめる難しさと、面白さを知った。'],
  wander: ['夜の街を、あてもなく歩いた。', '夜の街を、あてもなく歩いた。ネオンの下で、昼には見えない街の顔を知った。'],
  work: ['お手伝いをして、小さなお駄賃を貯めた。', '放課後はアルバイトに明け暮れた。自分で稼いだお金は、少しだけ重く感じた。'],
  lore: ['街の古い言い伝えを、聞いて回った。', '郷土資料室に通い詰め、街の伝承と霊脈の地図を突き合わせた。この街には、何かが眠っている。'],
};
function focusScene(k) {
  const s = FOCUS_SCENE[k]; if (!s) return '';
  // 同じ過ごし方を続けた時は、前と違う文にする
  const seen = (G.flags.focusSeen = G.flags.focusSeen || {});
  let i = G.master.age < 12 ? 0 : 1;
  if (seen[k + i]) i = 1 - i;
  seen[k + i] = true;
  return s[i];
}
