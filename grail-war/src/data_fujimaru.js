// =============================================================
//  特殊シナリオ：藤丸 立香
//  名前を「藤丸 立香」にすると始まる。
//  FGOの物語を終え、日常に帰還した「元・人類最後のマスター」が、
//  深見市の陰謀渦巻く聖杯戦争に関わっていく。
//   ・20歳の春から始まり、4月〜10月の7ヶ月を過ごして能力を育てる
//   ・11月に令呪が現れ、聖杯戦争へ
//   ・召喚の制限なし。英霊を指名して召喚できる
//   ・マシュ、オベロン、アルトリア・キャスターなど特異な英霊も召喚できる
// =============================================================

const FUJI_NAME = '藤丸立香';
function isFujiName(name) { return String(name).replace(/[\s　]/g, '') === FUJI_NAME; }

// 産まれの代わり（BIRTHS に追加。通常の抽選では選ばれない）
// 基本ステータスはFGO準拠：魔術回路は平凡で魔力は低いが、精神・交渉（コミュニケーション）・幸運が並外れて高い
BIRTHS.push({ id: 'fujimaru', name: '元・人類最後のマスター', weight: 0, magic: true, home: '深見市の学生アパート',
  origin: '', text: '人理を巡る長い旅を終え、日常へ帰ってきた。',
  stats: { mag: 20, phy: 45, int: 40, spi: 68, cha: 66, luk: 62 },
  growth: { mag: 0.8, spi: 1.15, cha: 1.15, luk: 1.1 },
  money: 8, circuits: [20, 30], wish: 'この日常を、守ること',
  perk: '数多の英霊と絆を結んできた（絆が深まりやすく、戦闘の指揮が巧み。召喚の制限がない）。' });

// カルデアにゆかりのある、本来の聖杯戦争では喚ばれない英霊（この特殊シナリオでのみ召喚できる）
SERVANTS.push(
  sv('artoria_caster', 'アルトリア・キャスター', 'キャストリア', 'キャスター', ['C', 'B', 'B', 'A', 'EX', 'EX'], '秩序・善', 'gentle',
    'きみをいだく希望の星', 'アラウンド・カリバーン', '妖精の杖の欠片',
    'キャスター、アルトリア。……えへへ、また会えたね、なんて言ったら変かな。よろしくね、マスター。', '妖精國で「楽園の妖精」として生まれ、予言の子として旅をした少女。'),
  sv('davinci', 'レオナルド・ダ・ヴィンチ', 'ダ・ヴィンチ', 'キャスター', ['E', 'D', 'C', 'A+', 'B', 'EX'], '混沌・善', 'scholar',
    '万能の人', 'ウォモ・ウニヴェルサーレ', '万能の天才のスケッチ',
    'やあやあ、天才ダ・ヴィンチちゃんの登場だ！ 困った時はいつでも頼りたまえ、マスター！', 'ルネサンスの万能の天才。かつて、ある組織の技術顧問を務めた。'),
  sv('nemo', 'ネモ', 'ネモ', 'ライダー', ['C', 'B', 'C', 'B', 'A', 'A+'], '中立・善', 'cool',
    '我は征く、鸚鵡貝の大衝角', 'ノーチラス・ストライク', '潜水艦の古い羅針盤',
    'ライダー、ネモ。船長として、この航海も無事に終わらせてみせる。乗艦を許可するよ、マスター。', '海底二万里の船長。ある旅では、移動拠点の艦長を務めた。'),
);
// カルデアゆかりの英霊に印をつける（通常シナリオでは召喚・ライバル・触媒に出てこない）
for (const id of ['mash', 'oberon', 'artoria_caster', 'davinci', 'nemo']) { const s = SERVANTS.find(x => x.id === id); if (s) s.chaldea = true; }

// ---- 日常の7ヶ月 ----
const STAGES_F = [
  { label: '帰還', band: '日常' },
  { label: '4月', band: '春', text: '大学の新学期。桜並木の下を、ごく普通の学生として歩く。' },
  { label: '5月', band: '春', text: '新しい生活にも少し慣れてきた。けれど、夜になるとふと空を見上げてしまう。' },
  { label: '6月', band: '梅雨', text: '雨の日が続く。窓を打つ雨音が、遠い戦場の音に聞こえる夜がある。' },
  { label: '7月', band: '夏', text: '夏休みが近い。蝉の声と、試験と、ほんの少しの退屈。' },
  { label: '8月', band: '夏', text: '長い夏休み。あの頃のように、何かに追われることもない。' },
  { label: '9月', band: '秋', text: '残暑の中、深見の街に少しずつ秋の気配が混じり始めた。' },
  { label: '10月', band: '秋', text: '木々が色づく頃。右手の甲が、時々かすかに疼く。' },
];
const FUJI_RATE = 0.85;   // 1ヶ月ごとの伸び（年単位の通常シナリオより控えめ）

const FOCUS_F = {
  lecture: { name: '大学の講義に真面目に出る', gains: { int: 10, spi: 3 } },
  train:   { name: '体を鍛え直す', gains: { phy: 10, spi: 3 } },
  magic:   { name: '魔術を独学で復習する', gains: { mag: 10, int: 3 } },
  friends: { name: '新しい友人たちと過ごす', gains: { cha: 9, luk: 4 } },
  work:    { name: 'アルバイトに精を出す', gains: { cha: 5, phy: 3 }, money: 3 },
  records: { name: '旅の記録を読み返す', gains: { spi: 8, int: 5 }, lore: 1 },
  town:    { name: '深見の街を歩き回る', gains: { luk: 8, phy: 4 }, catalyst: 0.25 },
};

// ---- 日常の出来事（stage：何ヶ月目に起きるか。fixed は必ず起きる） ----
const GROWTH_EVENTS_F = [
  { id: 'f_ordinary', stages: [1], fixed: true, title: 'ありふれた日常',
    text: () => '入学式の日。隣の席の学生が、気さくに話しかけてきた。「ねえ、高校どこ？ 春休み何してた？」<br>――人理を救っていました、とは言えない。',
    choices: [
      { label: '「特に何も。普通だよ」と笑う', hint: '交渉↑', run: () => { gain('cha', 4); return 'ごく普通の学生として振る舞うのは、思ったより難しくて、思ったより楽しかった。（交渉+4）'; } },
      { label: '「ちょっと、長い旅をしてた」', hint: '精神↑', run: () => { gain('spi', 4); return '「へえ、バックパッカー？ いいなあ！」……そういうことにしておこう。（精神+4）'; } },
    ] },
  { id: 'f_watcher', stages: [3], fixed: true, title: '監視者',
    text: () => '大学からの帰り道。黒いコートの女が、当然のように隣を歩き始めた。<br>「魔術協会・時計塔の監視官です。藤丸立香――あなたの『その後』を見届けるよう、命じられています」',
    choices: [
      { label: '協力的に応じる', hint: '秩序', run: () => { tone('law'); G.flags.watcherAlly = true; return '「……話の分かる人で助かります」監視官は名刺を一枚置いていった。何かあれば、力になってくれるかもしれない。'; } },
      { label: '冗談を交えてはぐらかす', hint: '交渉判定', run: () => {
          const c = chk('cha', 70);
          if (c.ok) { G.flags.watcherAlly = true; gain('cha', 2); return [c.text, '「……噂通りの人ですね」監視官は小さく笑った。少しだけ、距離が縮まった気がする。（交渉+2）']; }
          return [c.text, '「冗談で済む立場ではありませんよ」監視官は表情一つ変えなかった。'];
        } },
      { label: '「放っておいてほしい」', hint: '混沌', run: () => { tone('chaos'); return '「そうはいきません。……ですが、邪魔はしませんよ」監視官はそう言って、雑踏に消えた。'; } },
    ] },
  { id: 'f_dream', stages: [1, 2, 3, 4, 5, 6, 7], title: '旅の夢',
    text: () => '夢を見た。あの旅の、ある日の記憶。<br>焚き火の向こうで、一騎の英霊が笑っている。――忘れるはずもない、あの顔だ。',
    choices: [
      { label: '夢の中の英霊に、手を伸ばす', hint: '再会の縁を結ぶ', run: () => {
          const pool = SERVANTS.filter(s => s.id !== 'mash');
          const s = SV_BY_ID[G.flags.fujiDream] || pick(pool); G.flags.fujiDream = s.id; gain('spi', 3);
          return [`――${s.name}。あの旅で、何度も背中を預けた英霊。`, `目が覚めると、頬が濡れていた。「……また、会いたいな」（精神+3）`,
            '<span class="note">この英霊を召喚すると、さらに絆が深い状態で始まる。</span>'];
        } },
      { label: 'そっと目を閉じ直す', hint: '精神↑', run: () => { gain('spi', 5); return 'もう少しだけ、この夢の中にいたかった。（精神+5）'; } },
    ] },
  { id: 'f_letter', stages: [2, 3, 4, 5, 6], title: '旧友からの小包',
    text: () => 'かつての旅の仲間から、小包が届いた。中には手紙と、見覚えのある礼装の材料がいくつか。<br>「元気にしてる？ 念のため、ね。最近、そっちの街の霊脈がおかしいって話を聞いたんだ」',
    choices: [
      { label: '礼装を組み上げておく', hint: '道具を得る', run: () => { item('potion', 1); item('crystal', 1); G.flags.grailHint = true; return '霊薬と魔力結晶を一つずつ用意できた。……備えあれば、だ。（治癒の霊薬+1 魔力結晶+1）'; } },
      { label: '霊脈の話を詳しく聞き返す', hint: '知力↑・街の秘密', run: () => { gain('int', 3); G.flags.grailHint = true; lore(2);
          return '返事には、深見市で六十年前に起きた「何か」についての断片的な記録が添えられていた。（知力+3）'; } },
    ] },
  { id: 'f_presence', stages: [3, 4, 5, 6, 7], title: '残り香',
    text: () => '夜の天降山の麓で、懐かしい感覚が背筋を走った。――サーヴァントの気配。だが、まだ聖杯戦争は始まっていないはずだ。<br>山の斜面から、黒い霧が滲み出している。',
    choices: [
      { label: '霧の正体を確かめに行く', hint: '魔力判定・秘密に触れる', run: () => {
          const c = chk('mag', 45); G.flags.touchedMist = true; G.flags.grailHint = true; lore(2);
          if (c.ok) { gain('mag', 3); return [c.text, '霧の奥に、聖杯の器のようなものが一瞬だけ見えた。そこから漏れる悪意は、あの旅で何度も感じたものに似ていた。（魔力+3）']; }
          hp(-10); return [c.text, '霧に触れた瞬間、冷たい悪意が流れ込んできた。慌てて振り払う。（HP-10）'];
        } },
      { label: '深追いせず、記録だけ取る', hint: '知力↑・慎重', run: () => { tone('cautious'); gain('int', 3); lore(1); return '場所と時刻をメモして、その場を離れた。……生き延びる者は、退き時を知る者だ。（知力+3）'; } },
    ] },
  { id: 'f_rescue', stages: [2, 3, 4, 5, 6, 7], title: '交差点の事故',
    text: () => '目の前で、子どもが車道に飛び出した。体が勝手に動く。',
    choices: [
      { label: '迷わず飛び込む', hint: '体力判定・善', run: () => {
          tone('good'); const c = chk('phy', 55);
          if (c.ok) { gain('phy', 2); gain('luk', 2); return [c.text, '子どもを抱えて歩道に転がり込んだ。……あの頃の反射神経は、まだ残っているらしい。（体力+2 幸運+2）']; }
          hp(-15); gain('spi', 3); return [c.text, '子どもは無事だったが、自分は派手に擦りむいた。（HP-15 精神+3）'];
        } },
    ] },
  { id: 'f_shrine', stages: [2, 3, 4, 5, 6, 7], title: '天降神社',
    text: () => `天降神社の石段で、巫女の${CAST.miko}に呼び止められた。「あの……あなた、普通の人じゃないですよね？ 山の神様が、ずっとあなたを見てるって言ってます」`,
    choices: [
      { label: '正直に話してみる', hint: '交渉↑・霊脈の知識', run: () => { G.flags.metMiko = true; G.flags.leyline = true; gain('cha', 3);
          return `${CAST.miko}は目を丸くして話を聞き、それから霊脈の流れを教えてくれた。（交渉+3 陣地作成が得意になった）`; } },
      { label: '笑ってごまかす', hint: '幸運↑', run: () => { gain('luk', 3); return '「……そうですか。でも、困ったらいつでも来てくださいね」（幸運+3）'; } },
    ] },
  { id: 'f_oldman', stages: [2, 3, 4, 5, 6, 7], title: '河川敷の老人',
    text: () => `御影川の河川敷で、釣り糸を垂れる老人の隣に座った。老人――${CAST.old}は、あなたの横顔をじっと見た。「……お若いの。ずいぶん遠くまで旅をしてきた目をしとるな」`,
    choices: [
      { label: '旅の話を少しだけする', hint: '精神↑・縁', run: () => { G.flags.oldTrust = true; gain('spi', 4); lore(1);
          return '老人は黙って聞いていた。別れ際、「この街にも、昔、終わらなかった戦があった」とだけ呟いた。（精神+4）'; } },
      { label: '釣りを教わる', hint: '幸運↑', run: () => { G.flags.oldTrust = true; gain('luk', 3); return '「待つことを覚えなされ」……どこかで聞いたような言葉だった。（幸運+3）'; } },
    ] },
  { id: 'f_night', stages: [4, 5, 6, 7], title: '眠れない夜',
    text: () => '眠れない夜。目を閉じると、旅の途中で別れた人たちの顔が浮かぶ。',
    choices: [
      { label: '夜明けまで、記録を書き綴る', hint: '精神・知力↑', run: () => { gain('spi', 3); gain('int', 3); return '書き終えた頃には、窓の外が白み始めていた。忘れないこと。それが、自分にできることだ。（精神+3 知力+3）'; } },
      { label: '外に出て、星を見る', hint: '幸運・精神↑', run: () => { gain('luk', 3); gain('spi', 2); return '冬の星座が昇り始めていた。どこかで、誰かも同じ空を見ているだろうか。（幸運+3 精神+2）'; } },
    ] },
];

// ---- 藤丸シナリオ専用の物語（聖杯戦争中の陰謀） ----
STORY.push(
  {
    id: 'f_prep_watcher', phase: 'prep', day: 1, slot: 0, after: 'hub', cond: () => G.route === 'fujimaru',
    title: '招待状の差出人', chapter: '序章　令呪の冬',
    text: () => (G.flags.watcherAlly
      ? '時計塔の監視官が、険しい顔で訪ねてきた。「その招待状、差出人は『蒐集者』と名乗る人物ですね。……協会の記録にも残っていない。あなたを狙った罠の可能性があります」'
      : '差出人の名は『蒐集者』。どこの誰とも知れない。だが、この筆跡には見覚えのない悪意が滲んでいた。') +
      '<br>「人類最後のマスター殿。深見の聖杯戦争にご招待いたします。あなたの旅の記録は、聖杯を満たすに相応しい」',
    choices: [
      { label: '罠と承知で乗り込む', hint: '大胆', run: () => { tone('bold'); return 'どんな罠でも、見過ごせば誰かが傷つく。それなら、自分が行くしかない。'; } },
      { label: '監視官に調査を頼む', hint: '協力者がいる時のみ・情報', cond: () => !!G.flags.watcherAlly, run: () => { G.flags.earlyIntel = true; G.flags.grailHint = true;
          return '「……借りにしておきます」監視官は、他の参加者に関する資料を数枚、置いていった。（敵陣営の情報を得た）'; } },
      { label: '旧友に連絡する', hint: '道具を得る', run: () => { item('crystal', 1); item('smoke', 1);
          return '電話の向こうで、懐かしい声が溜め息をついた。「また厄介ごと？ ……分かった、できる限り送るよ」（魔力結晶+1 煙幕の護符+1）'; } },
    ],
  },
  {
    id: 'f_conspiracy', phase: 'war', day: 5, slot: 0, after: 'hub', cond: () => G.route === 'fujimaru',
    title: '蒐集者の目的', chapter: '第二幕　侵蝕',
    text: () => '倒れた使い魔の残骸から、一枚の羊皮紙が見つかった。そこには、この聖杯戦争の「本当の目的」が記されていた。<br><b>「人理修復の記録――無数の英霊と結ばれた縁を、聖杯の燃料とする」</b><br>この戦争は、最初からあなたを呼び寄せるために仕組まれていたのだ。',
    choices: [
      { label: '記録を解読し、計画の全貌を探る', hint: '知力判定', run: () => {
          const c = chk('int', 55);
          if (c.ok) { G.flags.grailHint = true;
            if (isBeast()) return [c.text, '「無垢なる杯に縁を注げ。――だが、器の底の『あれ』には気を付けよ」……最後の一行だけ、筆跡が震えていた。蒐集者すら、何かを恐れているらしい。',
              addClue('curator_note', '蒐集者の羊皮紙', '蒐集者の計画書。「器の底の『あれ』には気を付けよ」とあった。', 2)];
            if (isCursed()) return [c.text, '「汚れた杯に縁を注げ。呪いは縁を喰らい、世界を呑むほどに膨れ上がる」――蒐集者は、聖杯が呪われていることを<b>知っている</b>らしい。',
              addClue('curator_note', '蒐集者の羊皮紙', '蒐集者の計画書。「汚れた杯に縁を注げ。呪いは縁を喰らい、世界を呑む」とあった。', 2)];
            return [c.text, '「無垢なる杯に縁を注げ。英霊の座への門が開き、すべての英霊は我が蒐集品となる」――蒐集者の狙いは、<b>完全な聖杯</b>そのものらしい。',
              addClue('curator_note', '蒐集者の羊皮紙', '蒐集者の計画書。「無垢なる杯に縁を注げ。英霊の座への門が開く」とあった。', 2)]; }
          G.flags.grailHint = true; return [c.text, '暗号の大半は読めなかった。だが、聖杯が何か恐ろしいものだということだけは分かった。'];
        } },
      { label: () => `${SVname()}と対策を練る`, hint: '絆↑', run: () => { bond(5); G.flags.grailHint = true;
          return `${say('protect2')}${SV()}の言葉に、少しだけ肩の力が抜けた。（絆+5）`; } },
    ],
  },
  {
    id: 'f_curator', phase: 'war', day: 7, slot: 1, after: 'advance', cond: () => G.route === 'fujimaru' && hostileRivals().length >= 2,
    title: '蒐集者', chapter: '第二幕　侵蝕',
    text: () => {
      const r = G.storyRival = hostileRivals().reduce((a, b) => a.power >= b.power ? a : b);
      Object.assign(r, { curator: true, master: 'クラウス・アイゼンベルク', type: '時計塔の蒐集者', quote: 'ようやくお会いできましたね、人類最後のマスター。あなたの記録、頂戴いたします。' });
      r.power += 2; r.intel = Math.max(r.intel, 2); meet(r);
      return `夜の城跡公園。月明かりの下に、仕立ての良い外套の男が立っていた。<br>「初めまして。私が『蒐集者』――クラウス・アイゼンベルクです」<br>男の背後に、<b>${servantOf(r).name}</b>が控えている。かつての旅で、肩を並べたこともある英霊だ。<br><p class="quote">「${r.quote}」</p>`;
    },
    choices: [
      { label: '今ここで決着をつける', hint: '戦闘', cls: 'danger', run: () => ({ text: `${SV()}が前に出る。${say('orders')}`, then: () => startBattle(G.storyRival, {}) }) },
      { label: '証拠を突きつけ、教会に告発する', hint: '交渉判定・討伐令', run: () => {
          const r = G.storyRival; const c = chk('cha', 60);
          if (c.ok) { r.bounty = true; return [c.text, `${CAST.sister}は証拠を確認し、即座に告げた。「蒐集者の陣営を、規約違反として討伐対象とします」<span class="note">討伐すれば令呪+1。</span>`]; }
          return [c.text, '「証拠が不十分です」……蒐集者は、薄く笑って姿を消した。'];
        } },
      { label: '泳がせて、拠点を突き止める', hint: '知力判定', run: () => {
          const r = G.storyRival; const c = chk('int', 55);
          if (c.ok) { r.intel = 3; return [c.text, `尾行の末、拠点と、サーヴァントの真名<b>${servantOf(r).name}</b>を掴んだ。`]; }
          return [c.text, '見失った。……向こうも、こちらを試しているのかもしれない。'];
        } },
    ],
  },
);

// ---- 召喚した英霊が、カルデアで喚ばれていた記憶を思い出す ----
// 再会の台詞は口調ごと（data_voices.js の reunion）。個別の台詞がある英霊は FUJI_REUNION_SV を優先
const FUJI_REUNION_SV = {
  mash: '「先輩……！ 本当に、先輩なんですね。……はい。シールダー、マシュ・キリエライト。もう一度、あなたの盾になります」',
  oberon: '「……げ。やっぱり君か。日常に帰ったって聞いてたんだけど？ ――はいはい、分かってるよ。付き合えって言うんだろ。……最悪だ」',
  artoria_caster: '「わ、マスター！ 本当にマスターだ！ ……えへへ、また一緒に旅ができるんだね。今度は、楽しい旅になるといいな」',
  meltryllis: '「あら、マスター。……また私を喚んだのね。何、その顔。私が覚えていたことが、そんなに嬉しい？ ――ふふ、私もよ。SE.RA.PHの続き、ここで踊ってあげる」',
  davinci: '「やあやあ、我らがマスター！ 天才ダ・ヴィンチちゃん、再び参上さ。日常の話、たっぷり聞かせてもらうよ？」',
  nemo: '「マスター、乗艦を確認。……また君の航海に付き合えるなら、船長として光栄だ」',
};
const FUJI_MEMORY_BOND = 30;   // 記憶を取り戻した英霊の、最初の絆の上乗せ
function fujiReunionLine(sv) { return FUJI_REUNION_SV[sv.id] ? fmt(FUJI_REUNION_SV[sv.id]) : reunionLine(sv); }
// 会話の台詞：藤丸シナリオでは旅の記憶が混ざる
function talkLine() {
  if (isFuji() && !sigOnly() && Math.random() < 0.35) return fmt(pick(V().talk));   // 旅の思い出話
  return tierLine();
}
