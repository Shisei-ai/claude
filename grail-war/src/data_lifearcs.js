// =============================================================
//  data_lifearcs.js … 人生の転機（成長期のバリエーション）
//
//  産まれた時に、その家庭に合った「人生の転機」が一つ決まる（産まれごとに2種類から）。
//  成長に合わせて3つの章で進み、選択によってプラスにもマイナスにも転ぶ。
//  結末は「人生の痕跡」として残り、聖杯戦争やエンディングにも響く。
//   ・因縁の相手（兄弟・婚約者・宿敵 など）が、敵のマスターとして聖杯戦争に現れることがある
//   ・和解した家族からの支援、教会との関係、復讐心（アヴェンジャーの召喚条件）など
//
//  書式は GROWTH_EVENTS と同じ。arc：転機の名前　step：章（1〜3）　ages[0]：その章が起こりうる最低年齢
// =============================================================

const LIFE_ARCS = {
  noble: ['succession', 'engagement'], fallen: ['betrayal', 'illness'], clocktower: ['faction', 'genius'],
  mercenary: ['traitor', 'foundling'], civilian: ['divorce', 'sister'], executor: ['orphanage', 'miracle'], shrine: ['kamikakushi', 'redevelopment'],
};
const ARC_TITLE = {
  succession: '家督争い', engagement: '政略の婚約', betrayal: '没落の真相', illness: '母の病', faction: '派閥の渦', genius: '天才の友',
  traitor: '戦場の裏切り', foundling: '拾った子', divorce: '家族のかたち', sister: '小さな妹', orphanage: '孤児院の闇', miracle: '聖堂の光',
  kamikakushi: '神隠し', redevelopment: '神社の危機',
};
function arcPick() { if (G.arc || isFuji() || isKishi() || isShirou()) return; const list = LIFE_ARCS[G.master.birth]; if (list) { G.arc = pick(list); G.arcStep = 0; G.life = {}; } }
function life() { if (!G.life) G.life = {}; return G.life; }
function mark(title, text) { if (!G.marks) G.marks = []; G.marks.push({ title, text, age: G.master.age }); }
// 因縁の相手を、敵のマスターとして聖杯戦争に送り込む
function setLifeRival(name, type, stance, quotes) { G.lifeRival = { name, type, stance, quote: quotes[stance] || quotes.hostile }; }
// 弟妹：名字は主人公と同じ
const SIB = () => life().sib || (life().sib = (() => { const p = G.master.name.split(/[\s　]/); return { name: p.length > 1 ? `${p[0]} ${pick(NAMES.given)}` : pick(NAMES.given), kind: pick(['弟', '妹']) }; })());

GROWTH_EVENTS.push(
  // ======================= 魔術の名門：家督争い =======================
  { arc: 'succession', step: 1, id: 'a_succ1', ages: [6, 17], title: '弟妹の誕生',
    text: () => `${SIB().kind}が生まれた。名前は${SIB().name}。<br>産声と同時に、屋敷中の魔術具が震えたという。――その小さな体には、あなたより多くの魔術回路が宿っていた。<br>親の目が、少しずつ${SIB().kind}に向いていくのを感じる。`,
    choices: [
      { label: () => `${SIB().kind}を可愛がる`, hint: '交渉↑・兄弟の絆', run: () => { gain('cha', 3); life().sibBond = 2; return `小さな手が、あなたの指を握った。……この子と争うことになるなんて、この時は思いもしなかった。（交渉+3）`; } },
      { label: '負けじと修練に打ち込む', hint: '魔力↑↑・対抗心', run: () => { gain('mag', 5); life().sibBond = 0; return '夜明け前から工房に籠もった。才能で劣るなら、努力で埋めるしかない。（魔力+5）'; } },
      { label: '家のことに、背を向ける', hint: '精神↑・混沌', run: () => { gain('spi', 3); tone('chaos'); life().sibBond = 1; return '跡継ぎが誰になろうと、知ったことではない。……そう思い込もうとした。（精神+3）'; } },
    ] },
  { arc: 'succession', step: 2, id: 'a_succ2', ages: [12, 17], title: '後継の試し',
    text: () => `当主である親が、二人を工房に呼んだ。「魔術刻印を継ぐのは、一人だけだ。――お前たちの術を、見せてみろ」<br>${SIB().name}が、緊張した面持ちでこちらを見ている。`,
    choices: [
      { label: '正々堂々、競い合う', hint: '魔力判定', run: () => { const c = chk('mag', 55);
          if (c.ok) { life().heir = true; gain('mag', 4); return [c.text, `あなたの術式が、${SIB().name}のそれを上回った。親が、静かに頷いた。「……後継は、お前だ」（魔力+4）`]; }
          life().heir = false; gain('spi', 3); return [c.text, `${SIB().name}の術は、圧倒的だった。親は、${SIB().name}の肩に手を置いた。（精神+3）`]; } },
      { label: () => `${SIB().kind}に、後継を譲る`, hint: '善・兄弟の絆↑・自由', run: () => { tone('good'); life().heir = false; life().sibBond = (life().sibBond || 0) + 2; gain('luk', 3); gain('cha', 2);
          return `「この家は、${SIB().name}の方が向いている」<br>${SIB().name}は泣きそうな顔で、あなたの袖を掴んだ。（幸運+3 交渉+2）`; } },
      { label: () => `${SIB().kind}の術式に、細工をする`, hint: '悪・後継の座を奪う', run: () => { tone('evil'); life().heir = true; life().sibBond = -3; gain('mag', 3);
          return `試しの最中、${SIB().name}の術式が暴発した。後継に選ばれたのは、あなただった。<br>……${SIB().name}の目が、何かに気付いたように、あなたを見ていた。（魔力+3）`; } },
    ] },
  { arc: 'succession', step: 3, id: 'a_succ3', ages: [14, 17], title: '家を継ぐ者',
    text: () => life().heir ? `後継として、家の重責を担う日々。${SIB().name}とは、${(life().sibBond || 0) < 0 ? 'もう何年も口をきいていない' : 'ぎこちないながらも、言葉を交わしている'}。<br>ある夜、${SIB().name}が工房の扉を叩いた。`
      : `後継は${SIB().name}に決まった。家の中に、自分の居場所は少しずつ減っていく。<br>ある夜、${SIB().name}が部屋を訪ねてきた。「……話が、あるんだ」`,
    choices: [
      { label: '本音で話し合う', hint: '交渉判定・和解', run: () => { const c = chk('cha', (life().sibBond || 0) < 0 ? 62 : 45);
          if (c.ok) { life().sibStance = 'ally'; mark('家督争い', `${SIB().name}と和解した。`); gain('spi', 3);
            return [c.text, `長い話の末に、${SIB().name}は小さく笑った。「……ずっと、そう言ってほしかった」<br>二人は、初めて本当の兄弟になれた気がした。（精神+3）`]; }
          life().sibStance = 'rival'; mark('家督争い', `${SIB().name}とは、分かり合えないままだった。`);
          return [c.text, `言葉は、すれ違ったままだった。「……いつか、決着をつけよう」${SIB().name}はそう言って、背を向けた。`]; } },
      { label: '突き放す', hint: '混沌・因縁が残る', run: () => { tone('chaos'); life().sibStance = 'hostile'; gain('mag', 2); mark('家督争い', `${SIB().name}を突き放した。`);
          return `「お前と話すことはない」<br>扉が閉まる直前、${SIB().name}の瞳に、冷たい光が宿るのが見えた。（魔力+2）`; } },
    ], after: () => {
      const s = SIB(); const t = `実の${s.kind}`;
      if (life().heir) { gain('mag', 3); money(3); } else { gain('luk', 3); gain('cha', 2); }
      setLifeRival(s.name, t, life().sibStance || 'rival', {
        ally: '……まさか、こんな形で並び立つなんてね。背中は、任せて。',
        rival: 'やっと、あの日の決着がつけられる。――手加減はしない。',
        hostile: '家も、刻印も、聖杯も。今度こそ、全部いただく。' });
    } },

  // ======================= 魔術の名門：政略の婚約 =======================
  { arc: 'engagement', step: 1, id: 'a_eng1', ages: [9, 17], title: '許嫁',
    text: () => { life().fiance = life().fiance || pick(['アデーレ', 'ルートヴィヒ', 'セシリア', 'ユリウス']);
      return `家同士の取り決めで、許嫁ができた。欧州の魔術の名家の子、${life().fiance}。<br>顔合わせの席で、${life().fiance}は退屈そうに窓の外を眺めていた。「……政略結婚なんて、時代遅れね」`; },
    choices: [
      { label: '「同感だ」と笑う', hint: '交渉↑・縁', run: () => { gain('cha', 4); life().engBond = 2; return `${life().fiance}は驚いたように振り返り、それから初めて笑った。（交渉+4）`; } },
      { label: '礼儀正しく振る舞う', hint: '秩序・知力↑', run: () => { tone('law'); gain('int', 3); life().engBond = 1; return '家の名に恥じぬよう、完璧な礼儀で応じた。（知力+3）'; } },
    ] },
  { arc: 'engagement', step: 2, id: 'a_eng2', ages: [12, 17], title: '手紙',
    text: () => `${life().fiance}から、月に一度、手紙が届くようになった。魔術の話、家の愚痴、読んだ本のこと。<br>最新の手紙の最後には、こう書いてあった。「……あなたは、自分の人生を、自分で選べている？」`,
    choices: [
      { label: '正直な気持ちを書いて返す', hint: '精神↑・縁↑', run: () => { gain('spi', 4); life().engBond = (life().engBond || 0) + 2; return '何枚も書き直して、ようやく一通の返事を出した。（精神+4）'; } },
      { label: '当たり障りのない返事を書く', hint: '知力↑', run: () => { gain('int', 3); return '家の跡継ぎらしい、無難な返事を書いた。（知力+3）'; } },
    ] },
  { arc: 'engagement', step: 3, id: 'a_eng3', ages: [14, 17], title: '婚約の行方',
    text: () => `${life().fiance}の家が、魔術協会での失態で没落しかけているという報せが届いた。両家の親は、婚約の破棄を決めようとしている。<br>${life().fiance}からの手紙は、それきり途絶えた。`,
    choices: [
      { label: () => `${life().fiance}に会いに行く`, hint: '善・大胆', run: () => { tone('good'); tone('bold');
          if ((life().engBond || 0) >= 3) { mark('政略の婚約', `${life().fiance}と、家の決めた婚約ではない絆を結んだ。`); life().engOk = true;
            return `雨の中、${life().fiance}の屋敷を訪ねた。「……馬鹿ね。わざわざ来るなんて」それでも、その目は潤んでいた。<br>二人は、家とは関係のない約束を交わした。`; }
          mark('政略の婚約', `${life().fiance}との婚約は、静かに解消された。`);
          return `${life().fiance}は会ってくれなかった。扉越しに一言だけ。「……ありがとう。でも、もういいの」`; } },
      { label: '家の決定に従う', hint: '秩序・魔力↑', run: () => { tone('law'); gain('mag', 4); mark('政略の婚約', `${life().fiance}との婚約は、家の決定で破棄された。`); return '婚約は破棄された。家の跡継ぎとして、それが正しいのだと自分に言い聞かせた。（魔力+4）'; } },
    ], after: () => { if (life().engOk) { const c = giveCatalyst(); G.flags.fianceGift = c; } } },

  // ======================= 没落した家系：没落の真相 =======================
  { arc: 'betrayal', step: 1, id: 'a_bet1', ages: [6, 17], title: '祖父の日記',
    text: () => '屋根裏で、祖父の日記を見つけた。最後の頁に、震える字で書かれていた。<br>「我が家は没落したのではない。<b>ヴァイスハイト家</b>に陥れられたのだ。研究も、刻印の半分も、奴らに奪われた」',
    choices: [
      { label: '日記を、最後まで読み込む', hint: '知力↑・真相', run: () => { gain('int', 4); life().betKnow = true; return '奪われた研究の内容、陥れた手口。祖父の無念が、頁から滲み出ていた。（知力+4）'; } },
      { label: '日記を閉じ、見なかったことにする', hint: '精神↑', run: () => { gain('spi', 3); return '過去に縛られて生きたくはなかった。……それでも、その名前だけは、頭から離れなかった。（精神+3）'; } },
    ] },
  { arc: 'betrayal', step: 2, id: 'a_bet2', ages: [12, 17], title: '仇の子',
    text: () => { life().foe = life().foe || pick(['レオン', 'クラリッサ', 'アルベルト', 'エミーリア']);
      return `転校生が来た。${life().foe}・ヴァイスハイト。――あの日記に書かれていた家の名前だ。<br>何も知らない顔で、${life().foe}は隣の席に座り、屈託なく笑いかけてきた。「よろしくね」`; },
    choices: [
      { label: '友人として接する', hint: '交渉↑・縁', run: () => { gain('cha', 4); life().foeBond = 2; return `${life().foe}は、驚くほど気のいい奴だった。……家のことさえ、なければ。（交渉+4）`; } },
      { label: '距離を置き、探りを入れる', hint: '知力↑・慎重', run: () => { gain('int', 4); tone('cautious'); life().foeBond = 0; return `${life().foe}の家のことを、それとなく聞き出した。奪われた研究は、今もあの家にあるらしい。（知力+4）`; } },
    ] },
  { arc: 'betrayal', step: 3, id: 'a_bet3', ages: [14, 17], title: '復讐か、赦しか',
    text: () => `${life().foe}が、ある日打ち明けてきた。「うちの家、昔……ひどいことをしたらしい。あなたの家に」<br>${life().foe}の手には、古い魔術書が握られていた。祖父の日記に記されていた、奪われた研究だ。`,
    choices: [
      { label: '研究を受け取り、赦す', hint: '善・魔力↑↑', run: () => { tone('good'); gain('mag', 5); gain('spi', 3); life().foeStance = 'ally'; mark('没落の真相', `${life().foe}・ヴァイスハイトを赦し、奪われた研究を取り戻した。`);
          return `「……ありがとう」${life().foe}は、泣きながら笑った。祖父の研究が、六十年ぶりに家に戻った。（魔力+5 精神+3）`; } },
      { label: '研究を奪い、突き放す', hint: '悪・復讐心', run: () => { tone('evil'); gain('mag', 6); G.flags.grudge = true; life().foeStance = 'hostile'; mark('没落の真相', `${life().foe}・ヴァイスハイトとの因縁は、憎しみのまま残った。`);
          return `「謝って済むと思うな」研究書をひったくると、${life().foe}は青ざめた顔で立ち尽くした。<br>胸の奥で、黒い炎が燃えている。（魔力+6）`; } },
      { label: '「過去は、過去だ」と受け取らない', hint: '精神↑↑', run: () => { gain('spi', 6); life().foeStance = 'rival'; mark('没落の真相', `奪われた研究を、あえて受け取らなかった。`);
          return `「それは、君の家のものだ。俺は、俺の力で取り戻す」${life().foe}は、しばらく黙ってから頷いた。（精神+6）`; } },
    ], after: () => setLifeRival(`${life().foe}・ヴァイスハイト`, '仇の家の子', life().foeStance || 'rival', {
      ally: '……あの時の借り、ここで返させて。一緒に戦おう。', rival: '家の因縁は関係ない。――あなたと、正々堂々戦いたい。', hostile: 'あなたが憎い。家を、私を、踏みにじったあなたが。' }) },

  // ======================= 没落した家系：母の病 =======================
  { arc: 'illness', step: 1, id: 'a_ill1', ages: [6, 17], title: '母の咳',
    text: () => '母が、血を吐いた。<br>医者は首を振った。原因は分からないという。……けれど、あなたは知っている。家の魔術の研究に、母が無理を重ねていたことを。',
    choices: [
      { label: '母の看病をする', hint: '精神↑・家族', run: () => { gain('spi', 4); life().care = 1; return '夜通し、母の手を握っていた。「……ごめんね、心配かけて」（精神+4）'; } },
      { label: '母の研究を、代わりに進める', hint: '魔力↑↑', run: () => { gain('mag', 5); life().care = 0; return '母が倒れた原因の研究を、自分で引き継いだ。完成させれば、母を救えるかもしれない。（魔力+5）'; } },
    ] },
  { arc: 'illness', step: 2, id: 'a_ill2', ages: [12, 17], title: '治療の代価',
    text: () => '母の病は、魔術の代償による「回路の焼損」だと分かった。治すには、高価な霊薬か――禁じられた術式が要る。',
    choices: [
      { label: '働いて、霊薬の資金を貯める', hint: '体力・交渉↑', run: () => { gain('phy', 3); gain('cha', 3); life().cure = 'money'; return '学校が終わると、いくつものアルバイトを掛け持ちした。（体力+3 交渉+3）'; } },
      { label: '禁じられた術式に手を出す', hint: '魔力↑↑・混沌', run: () => { tone('chaos'); gain('mag', 5); hp(-15); life().cure = 'forbidden'; return '禁書の頁をめくるたび、自分の回路も焼けるように痛んだ。（魔力+5 HP-15）'; } },
    ] },
  { arc: 'illness', step: 3, id: 'a_ill3', ages: [14, 17], title: '母の手',
    text: () => '母の容態が、急に変わった。――今夜が、峠だと医者は言った。',
    choices: [
      { label: '最後まで、そばにいる', hint: '幸運判定', run: () => { const c = chk('luk', life().cure === 'money' ? 45 : 60);
          if (c.ok) { mark('母の病', '母は、峠を越えて快方に向かった。'); gain('spi', 4); life().motherSaved = true;
            return [c.text, '夜明けとともに、母がゆっくりと目を開けた。「……おはよう」その一言で、涙が止まらなくなった。（精神+4）']; }
          mark('母の病', '母を、看取った。'); gain('spi', 6); G.flags.grudge = G.flags.grudge || life().cure === 'forbidden';
          return [c.text, '母は、あなたの手を握ったまま、静かに息を引き取った。「……あなたは、自由に生きてね」それが、最後の言葉だった。（精神+6）']; } },
    ], after: () => { if (life().motherSaved) item('potion', 1); } },

  // ======================= 時計塔：派閥の渦 =======================
  { arc: 'faction', step: 1, id: 'a_fac1', ages: [9, 17], title: '二人の講師',
    text: () => '時計塔には、二つの派閥がある。血統と伝統を重んじる貴族主義派と、才能を重んじる民主主義派。<br>二人の講師が、それぞれあなたを自分の教室に誘ってきた。',
    choices: [
      { label: '貴族主義派の講師につく', hint: '秩序・魔力↑', run: () => { tone('law'); gain('mag', 4); life().faction = 'noble'; return '伝統の重みを、骨の髄まで叩き込まれた。（魔力+4）'; } },
      { label: '民主主義派の講師につく', hint: '混沌・知力↑', run: () => { tone('chaos'); gain('int', 4); life().faction = 'demo'; return '型破りな講義は、どれも刺激的だった。（知力+4）'; } },
      { label: 'どちらにもつかない', hint: '精神↑', run: () => { gain('spi', 3); life().faction = 'none'; return '派閥に属さない者は、時計塔では生きにくい。それでも、自分の目で選びたかった。（精神+3）'; } },
    ] },
  { arc: 'faction', step: 2, id: 'a_fac2', ages: [12, 17], title: '濡れ衣',
    text: () => '研究棟で、禁書が盗まれる事件が起きた。容疑をかけられたのは――あなただった。派閥争いの、生贄にされたらしい。',
    choices: [
      { label: '自分で真犯人を突き止める', hint: '知力判定', run: () => { const c = chk('int', 55);
          if (c.ok) { life().cleared = true; gain('int', 3); return [c.text, '証拠を一つずつ積み上げ、真犯人を暴いた。時計塔の中で、あなたの名前が少しだけ知られるようになった。（知力+3）']; }
          life().cleared = false; return [c.text, '真犯人には辿り着けなかった。疑いは、晴れないままだ。']; } },
      { label: '派閥の講師に、庇ってもらう', hint: '交渉↑・借り', run: () => { gain('cha', 3); life().cleared = true; life().debt = true; return '講師の一声で、疑いは晴れた。……その代わり、大きな借りができた。（交渉+3）'; } },
    ] },
  { arc: 'faction', step: 3, id: 'a_fac3', ages: [14, 17], title: '時計塔を去る日',
    text: () => life().cleared ? '派閥の講師から、正式な弟子にならないかと誘われた。時計塔での将来が約束される。' : '疑いが晴れないまま、時計塔での居場所は日に日に狭くなっていく。',
    choices: [
      { label: () => life().cleared ? '弟子になる' : '最後まで、時計塔に残る', hint: '魔力↑↑・秩序', run: () => { tone('law'); gain('mag', 5); mark('派閥の渦', life().cleared ? '時計塔の講師の弟子になった。' : '疑いを背負ったまま、時計塔に残った。'); life().stay = true;
          return life().cleared ? '師の工房の鍵を受け取った。時計塔の魔術師として、生きていく。（魔力+5）' : '陰口を聞き流しながら、研究を続けた。いつか、結果で黙らせてやる。（魔力+5）'; } },
      { label: '時計塔を去り、自分の道を行く', hint: '自由・幸運↑', run: () => { gain('luk', 4); gain('spi', 3); mark('派閥の渦', '時計塔の派閥争いに背を向け、自分の道を選んだ。');
          return '時計塔の門をくぐって外に出ると、ロンドンの空が、思ったよりずっと広く見えた。（幸運+4 精神+3）'; } },
    ], after: () => { if (life().stay) item('gem', 1); } },

  // ======================= 時計塔：天才の友 =======================
  { arc: 'genius', step: 1, id: 'a_gen1', ages: [9, 17], title: '天才',
    text: () => { life().gen = life().gen || pick(['ノア', 'イリーナ', 'カミル', 'フローラ']);
      return `同じ教室に、本物の天才がいた。${life().gen}。誰も解けない術式を、退屈そうに一晩で組み上げる。<br>「ねえ、君。君の術式、面白い。少し見せてよ」`; },
    choices: [
      { label: '一緒に研究する', hint: '知力↑↑・友情', run: () => { gain('int', 5); life().genBond = 2; return `${life().gen}と過ごす時間は、どんな講義よりも刺激的だった。（知力+5）`; } },
      { label: '張り合う', hint: '魔力↑↑', run: () => { gain('mag', 5); life().genBond = 1; return '天才に負けたくなくて、徹夜で術式を磨いた。（魔力+5）'; } },
    ] },
  { arc: 'genius', step: 2, id: 'a_gen2', ages: [12, 17], title: '禁忌の扉',
    text: () => `${life().gen}が、目を輝かせて言った。「根源に届く術式を見つけたかもしれない。……ただ、禁術の領域なんだ。手伝ってくれる？」`,
    choices: [
      { label: '止める', hint: '秩序・精神↑', run: () => { tone('law'); gain('spi', 4); life().genPath = 'stop'; return `「やめておけ」<br>${life().gen}は、少しだけ寂しそうな顔をした。（精神+4）`; } },
      { label: '共に禁忌を覗く', hint: '魔力↑↑・混沌', run: () => { tone('chaos'); gain('mag', 6); hp(-10); life().genPath = 'join'; return '二人で開いた扉の向こうに、世界の裏側が一瞬だけ見えた。（魔力+6 HP-10）'; } },
    ] },
  { arc: 'genius', step: 3, id: 'a_gen3', ages: [14, 17], title: '封印指定',
    text: () => `${life().gen}が、姿を消した。噂では、その研究が<b>封印指定</b>の対象になり、執行者に追われているという。<br>深夜、あなたの部屋の窓を、誰かが叩いた。`,
    choices: [
      { label: () => `${life().gen}を匿う`, hint: '善・大胆', run: () => { tone('good'); tone('bold'); life().genStance = 'ally'; mark('天才の友', `封印指定を受けた${life().gen}を匿い、逃がした。`);
          return `一晩だけ匿い、夜明け前に裏口から逃がした。「……この恩は、必ず返す」${life().gen}は、そう言って闇に消えた。`; } },
      { label: '協会に通報する', hint: '秩序・魔力↑', run: () => { tone('law'); gain('mag', 3); life().genStance = 'hostile'; mark('天才の友', `${life().gen}を協会に引き渡した。`);
          return `窓を開けずに、協会に連絡した。翌朝、${life().gen}が捕らえられたと聞いた。……窓の外に残された手の跡が、いつまでも消えなかった。（魔力+3）`; } },
    ], after: () => setLifeRival(life().gen, '封印指定の天才', life().genStance || 'rival', {
      ally: '約束通り、恩を返しに来たよ。――この聖杯戦争、君の側につく。', hostile: '君だけは、信じていたのに。……聖杯で、全部やり直させてもらう。' }) },

  // ======================= 傭兵：戦場の裏切り =======================
  { arc: 'traitor', step: 1, id: 'a_tra1', ages: [9, 17], title: '養父の相棒',
    text: () => { life().tr = life().tr || pick(['ヴィクトル', 'ラシード', 'ジャン', 'カルロス']);
      return `養父には、背中を預ける相棒がいた。${life().tr}。陽気で、子どもの扱いが上手で、あなたにナイフの使い方を教えてくれた。<br>「いつか、お前も一人前の魔術使いになるんだぜ」`; },
    choices: [
      { label: () => `${life().tr}に懐く`, hint: '体力↑・縁', run: () => { gain('phy', 4); life().trBond = 2; return `${life().tr}の教え方は、養父よりずっと優しかった。（体力+4）`; } },
      { label: '養父の背中だけを見る', hint: '精神↑', run: () => { gain('spi', 4); return '養父の戦い方を、一つも見逃さないよう目に焼き付けた。（精神+4）'; } },
    ] },
  { arc: 'traitor', step: 2, id: 'a_tra2', ages: [12, 17], title: '裏切り',
    text: () => `ある任務で、待ち伏せに遭った。情報を漏らしたのは――${life().tr}だった。<br>養父は、あなたを庇って深手を負った。${life().tr}は、敵の車に乗って消えた。`,
    choices: [
      { label: '養父の手当てをする', hint: '治癒・精神↑', run: () => { gain('spi', 4); gain('int', 2); life().foster = 'saved'; return '震える手で、教わった通りに止血した。養父は、助かった。（精神+4 知力+2）'; } },
      { label: () => `${life().tr}を追う`, hint: '体力判定', run: () => { const c = chk('phy', 60); life().foster = 'hurt';
          if (c.ok) { gain('phy', 4); return [c.text, `${life().tr}の車に追いつき、窓越しに目が合った。……その目は、ひどく疲れていた。（体力+4）`]; }
          hp(-15); return [c.text, '追いつけなかった。戻った時、養父は意識を失っていた。（HP-15）']; } },
    ] },
  { arc: 'traitor', step: 3, id: 'a_tra3', ages: [14, 17], title: '再会',
    text: () => `何年か後、とある街で${life().tr}と再会した。痩せこけ、追われる身になっていた。<br>「……金が要ったんだ。病気の娘がいた。言い訳には、ならねえがな」`,
    choices: [
      { label: '見逃す', hint: '善・精神↑↑', run: () => { tone('good'); gain('spi', 5); life().trStance = 'rival'; mark('戦場の裏切り', `裏切り者の${life().tr}を、見逃した。`);
          return `「……行けよ。二度と、顔を見せるな」<br>${life().tr}は深く頭を下げ、雑踏に消えた。（精神+5）`; } },
      { label: '養父の仇を取る', hint: '悪・復讐心', run: () => { tone('evil'); gain('phy', 3); G.flags.grudge = true; life().trStance = 'hostile'; mark('戦場の裏切り', `裏切り者の${life().tr}と、刃を交えた。`);
          return `刃を抜いた。${life().tr}は抵抗しなかった。……とどめを刺す前に、${life().tr}は煙のように姿を消した。胸の中の黒い炎だけが残った。（体力+3）`; } },
    ], after: () => setLifeRival(life().tr, 'かつての養父の相棒', life().trStance || 'rival', {
      rival: '……よう。まさか、聖杯戦争で会うとはな。今度は、正面からだ。', hostile: '恨むなら恨め。俺は、聖杯で全部取り戻す。' }) },

  // ======================= 傭兵：拾った子 =======================
  { arc: 'foundling', step: 1, id: 'a_fou1', ages: [9, 17], title: '瓦礫の中の子',
    text: () => { life().kid = life().kid || pick(['ミラ', 'サーシャ', 'アミル', 'レナ']);
      return `紛争地の廃墟で、瓦礫の下から小さな子どもを見つけた。言葉が通じない。名前を聞くと、小さく「${life().kid}」と答えた。<br>養父は渋い顔をしている。「……連れて行くなら、お前が面倒を見ろ」`; },
    choices: [
      { label: '連れて行く', hint: '善・家族', run: () => { tone('good'); gain('spi', 3); life().kidTaken = true; return `${life().kid}は、あなたの服の裾を、片時も離さなかった。（精神+3）`; } },
      { label: '難民キャンプに預ける', hint: '慎重・知力↑', run: () => { tone('cautious'); gain('int', 3); life().kidTaken = false; return `キャンプの職員に${life().kid}を託した。振り返ると、小さな手が、ずっと振られていた。（知力+3）`; } },
    ] },
  { arc: 'foundling', step: 2, id: 'a_fou2', ages: [12, 17], title: '小さな家族',
    text: () => life().kidTaken ? `${life().kid}は、すっかり妹のような存在になった。片言の日本語で、あなたの後をついて回る。<br>「おにい……おねえ……どっち？」` : `難民キャンプから、拙い字の手紙が届いた。${life().kid}からだ。「げんき？ わたし、べんきょう、がんばってる」`,
    choices: [
      { label: () => life().kidTaken ? `${life().kid}に読み書きを教える` : '返事を書き続ける', hint: '交渉・知力↑', run: () => { gain('cha', 3); gain('int', 3); life().kidBond = 2; return `${life().kid}の成長が、何よりの楽しみになった。（交渉+3 知力+3）`; } },
      { label: () => life().kidTaken ? '戦い方を教える' : '仕事を優先する', hint: '体力↑', run: () => { gain('phy', 4); life().kidBond = 1; return '生き抜くための術を、まず身につけてほしかった。（体力+4）'; } },
    ] },
  { arc: 'foundling', step: 3, id: 'a_fou3', ages: [14, 17], title: '旅立ち',
    text: () => `${life().kid}が、遠い国の学校に入れることになった。奨学金が出るという。<br>「……行っても、いい？」`,
    choices: [
      { label: '笑って送り出す', hint: '幸運↑↑', run: () => { gain('luk', 5); mark('拾った子', `${life().kid}を、遠い国の学校へ送り出した。`); life().kidGone = true; return `空港のゲートの向こうで、${life().kid}は何度も振り返って手を振った。（幸運+5）`; } },
      { label: '「一緒に日本へ行こう」と誘う', hint: '交渉↑・家族', run: () => { gain('cha', 3); gain('spi', 3); mark('拾った子', `${life().kid}と、日本で家族として暮らすことにした。`); life().kidHome = true;
          return `${life().kid}は、泣きながら頷いた。日本の小さなアパートに、二人分の歯ブラシが並んだ。（交渉+3 精神+3）`; } },
    ] },

  // ======================= 一般人：家族のかたち =======================
  { arc: 'divorce', step: 1, id: 'a_div1', ages: [6, 17], title: '夜の声',
    text: () => '夜中に目が覚めると、居間から両親の言い争う声が聞こえた。<br>最近、こういう夜が増えている。父の声は低く、母の声は震えていた。',
    choices: [
      { label: '布団を被って、聞かないふりをする', hint: '精神↑', run: () => { gain('spi', 3); return '耳を塞いでも、声は聞こえてきた。（精神+3）'; } },
      { label: '居間に出ていく', hint: '大胆・交渉↑', run: () => { tone('bold'); gain('cha', 3); life().spoke = true; return '「……けんか、しないで」<br>両親は、ばつが悪そうに黙り込んだ。その夜だけは、静かになった。（交渉+3）'; } },
    ] },
  { arc: 'divorce', step: 2, id: 'a_div2', ages: [9, 17], title: '二つの家',
    text: () => '両親が、離婚することになった。<br>「どっちと暮らしたい？」母が、泣き腫らした目で聞いてきた。父は、窓の外を見たまま黙っている。',
    choices: [
      { label: '父と暮らす', hint: '資金↑・体力↑', run: () => { money(4); gain('phy', 3); life().with = 'father'; return '父との暮らしは、会話は少ないが、不自由はなかった。（資金+4 体力+3）'; } },
      { label: '母と暮らす', hint: '精神・交渉↑', run: () => { gain('spi', 3); gain('cha', 3); life().with = 'mother'; return '母との小さなアパート。お金はなかったが、夕食はいつも二人で食べた。（精神+3 交渉+3）'; } },
      { label: '「選べない」と泣く', hint: '幸運↑', run: () => { gain('luk', 3); life().with = 'grandma'; return '結局、祖母の家で暮らすことになった。祖母は、何も聞かずに温かいお茶を淹れてくれた。（幸運+3）'; } },
    ] },
  { arc: 'divorce', step: 3, id: 'a_div3', ages: [14, 17], title: '再会',
    text: () => `${life().with === 'father' ? '母' : life().with === 'mother' ? '父' : '両親'}から、久しぶりに連絡があった。「一度、会えないか」`,
    choices: [
      { label: '会いに行く', hint: '交渉判定・和解', run: () => { const c = chk('cha', life().spoke ? 40 : 52);
          if (c.ok) { life().reconciled = true; mark('家族のかたち', '別れた両親と、和解できた。'); gain('spi', 3);
            return [c.text, '最初はぎこちなかった。けれど、帰り際、「……大きくなったな」と言われた。三人で、昔みたいに笑えた気がした。（精神+3）']; }
          mark('家族のかたち', '両親とは、すれ違ったままだった。'); return [c.text, '話は、すれ違ったままだった。……それでも、会えてよかったと思う。']; } },
      { label: '会わない', hint: '精神↑・自立', run: () => { gain('spi', 4); gain('phy', 2); mark('家族のかたち', '両親とは会わず、自分の足で歩くことを選んだ。'); return 'もう、自分の足で立てる。そう思うことにした。（精神+4 体力+2）'; } },
    ] },

  // ======================= 一般人：小さな妹 =======================
  { arc: 'sister', step: 1, id: 'a_sis1', ages: [6, 17], title: '妹の誕生',
    text: () => { life().sis = life().sis || pick(['ひなた', 'こはる', 'あかり', 'みお']);
      return `妹が生まれた。名前は${life().sis}。<br>ガラス越しに見た小さな顔が、くしゃっと笑った気がした。……この子は、自分が守る。`; },
    choices: [
      { label: 'お世話を手伝う', hint: '精神・交渉↑', run: () => { gain('spi', 3); gain('cha', 2); return 'おむつ替えも、ミルクも、すぐに上手くなった。（精神+3 交渉+2）'; } },
      { label: () => `「${gw('お兄ちゃん', 'お姉ちゃん', 'お兄ちゃん')}」になると誓う`, hint: '体力↑', run: () => { gain('phy', 3); return '強くならなきゃ。この子を、守れるように。（体力+3）'; } },
    ] },
  { arc: 'sister', step: 2, id: 'a_sis2', ages: [9, 17], title: '高熱',
    text: () => `${life().sis}が、高熱で倒れた。救急車を待つ間、小さな体はどんどん熱くなっていく。<br>――その時、自分の手のひらが、ぼんやりと光った気がした。`,
    choices: [
      { label: '光る手で、妹の額に触れる', hint: '魔力判定・目覚め', run: () => { const c = chk('mag', 25);
          if (c.ok) { G.flags.awakened = true; gain('mag', 4); return [c.text, `手のひらの熱が、${life().sis}の熱を吸い取っていくようだった。救急車が着く頃には、${life().sis}は穏やかな寝息を立てていた。<br><b>あなたの中の何かが、目を覚ました。</b>（魔力+4）`]; }
          return [c.text, `何も起きなかった。……それでも、${life().sis}は病院で無事に回復した。`]; } },
      { label: '必死で、母に知らせに走る', hint: '体力↑', run: () => { gain('phy', 4); return `全力で走った。${life().sis}は、病院で無事に回復した。（体力+4）`; } },
    ] },
  { arc: 'sister', step: 3, id: 'a_sis3', ages: [14, 17], title: '妹の夢',
    text: () => `${life().sis}が、恥ずかしそうに打ち明けてきた。「あのね、${gw('おにいちゃん', 'おねえちゃん', 'おにいちゃん')}。わたし、お医者さんになりたいの。……${gw('おにいちゃん', 'おねえちゃん', 'おにいちゃん')}が、昔助けてくれたみたいに」`,
    choices: [
      { label: '全力で応援する', hint: '幸運↑↑', run: () => { gain('luk', 5); mark('小さな妹', `妹の${life().sis}の夢を、全力で応援した。`); life().sisCharm = true; return `${life().sis}は、手作りのお守りをくれた。「これ、${gw('おにいちゃん', 'おねえちゃん', 'おにいちゃん')}にもあげる」（幸運+5）`; } },
      { label: '勉強を教える', hint: '知力↑↑', run: () => { gain('int', 5); mark('小さな妹', `妹の${life().sis}に、毎晩勉強を教えた。`); life().sisCharm = true; return '毎晩、机を並べて勉強した。教えることで、自分の理解も深まった。（知力+5）'; } },
    ] },

  // ======================= 教会の孤児院：孤児院の闇 =======================
  { arc: 'orphanage', step: 1, id: 'a_orp1', ages: [6, 17], title: '夜の足音',
    text: () => '夜中に目が覚めると、廊下を誰かが歩いていく音がした。<br>窓から覗くと、神父に連れられた子どもが、裏の礼拝堂へ入っていく。……翌朝、その子は「遠くの施設に移った」と聞かされた。',
    choices: [
      { label: '礼拝堂を調べに行く', hint: '大胆・知力↑', run: () => { tone('bold'); gain('int', 3); life().orpSaw = true; return '礼拝堂の床に、隠し扉があった。鍵はかかっていた。（知力+3）'; } },
      { label: '見なかったことにする', hint: '慎重・精神↑', run: () => { tone('cautious'); gain('spi', 3); return '大人の言うことを、信じることにした。……信じたかった。（精神+3）'; } },
    ] },
  { arc: 'orphanage', step: 2, id: 'a_orp2', ages: [12, 17], title: '地下室',
    text: () => '礼拝堂の地下に、ついに降りた。<br>そこは、「代行者の養成」と称する施設だった。魔術回路を無理やり開かれ、苦しむ子どもたち。――いなくなった子の名札が、檻にかかっていた。',
    choices: [
      { label: '子どもたちを、連れて逃げる', hint: '体力判定・善', run: () => { tone('good'); const c = chk('phy', 55);
          if (c.ok) { life().orpRescue = true; gain('phy', 3); gain('spi', 3); return [c.text, '三人の子を背負い、夜の町へ逃げた。追っ手は、来なかった。（体力+3 精神+3）']; }
          hp(-20); life().orpRescue = false; return [c.text, '見つかった。子どもたちは連れ戻され、あなたは独房に入れられた。（HP-20）']; } },
      { label: () => `${CAST.sister}に打ち明ける`, hint: '秩序・交渉↑', run: () => { tone('law'); gain('cha', 3); life().orpSister = true;
          return `${CAST.sister}は、真っ青な顔で地下室を見た。「……私も、知らなかった。――いいえ、知ろうとしなかった」（交渉+3）`; } },
      { label: '何もできず、逃げ帰る', hint: '精神↓・復讐心', run: () => { gain('spi', -3); G.flags.grudge = true; life().orpFled = true; return '震えが止まらなかった。あの子たちの声が、耳から離れない。（精神-3）'; } },
    ] },
  { arc: 'orphanage', step: 3, id: 'a_orp3', ages: [14, 17], title: '告発',
    text: () => '施設のことを、教会の上層部に告発するか。告発すれば、孤児院は取り潰され、自分の居場所もなくなるかもしれない。',
    choices: [
      { label: '告発する', hint: '善・秩序・教会の信頼', run: () => { tone('good'); tone('law'); life().exposed = true; mark('孤児院の闇', '孤児院の地下の施設を告発し、子どもたちを救った。');
          return `${life().orpSister ? CAST.sister + 'が、共に証言してくれた。' : ''}施設は閉鎖され、神父は姿を消した。孤児院は、まともな場所に生まれ変わった。<br>教会の中に、あなたの名を覚えている者が増えた。`; } },
      { label: '沈黙する', hint: '悪・魔力↑', run: () => { tone('evil'); gain('mag', 4); mark('孤児院の闇', '孤児院の闇を知りながら、沈黙した。');
          return '何も言わなかった。代わりに、教会の秘蹟を貪欲に学んだ。いつか、自分の力で壊すために。（魔力+4）'; } },
    ], after: () => { if (life().exposed) { G.flags.registered = true; G.flags.sisterTrust = true; } } },

  // ======================= 教会の孤児院：聖堂の光 =======================
  { arc: 'miracle', step: 1, id: 'a_mir1', ages: [6, 17], title: '聖堂の光',
    text: () => '冬の朝。誰もいない聖堂で、古い聖遺物の箱が、ほのかに光っているのを見た。<br>手を伸ばすと、温かい何かが指先に触れた気がした。',
    choices: [
      { label: '祈りを捧げる', hint: '精神↑↑', run: () => { gain('spi', 5); life().faith = 2; return '言葉にならない祈りが、胸の奥から溢れた。（精神+5）'; } },
      { label: '誰かに話す', hint: '交渉↑', run: () => { gain('cha', 3); life().faith = 1; return `${CAST.sister}は、真剣な顔で話を聞いてくれた。「……それは、あなただけの秘密にしておきなさい」（交渉+3）`; } },
    ] },
  { arc: 'miracle', step: 2, id: 'a_mir2', ages: [12, 17], title: '信仰の揺らぎ',
    text: () => '奇跡を見たはずなのに、世界は理不尽なことばかりだ。病で死ぬ子、戦争のニュース。<br>神は本当にいるのだろうか。',
    choices: [
      { label: '疑いを抱えたまま、祈り続ける', hint: '精神↑・秩序', run: () => { tone('law'); gain('spi', 4); life().faith = (life().faith || 0) + 1; return '答えは出ない。それでも、祈ることだけはやめなかった。（精神+4）'; } },
      { label: '自分の手で、誰かを救う道を選ぶ', hint: '善・体力↑', run: () => { tone('good'); gain('phy', 4); return '祈るより先に、手を動かすことにした。炊き出し、病院の手伝い、できることは何でも。（体力+4）'; } },
    ] },
  { arc: 'miracle', step: 3, id: 'a_mir3', ages: [14, 17], title: '聖遺物',
    text: () => '老神父が、あの聖遺物の箱をあなたに託した。「あの光を見たのは、あなたが初めてです。……いつか、必要になる時が来るでしょう」',
    choices: [
      { label: '受け取る', hint: '触媒を得る', run: () => { const pool = ['jeanne', 'martha_ruler', 'georgios', 'amakusa'].filter(id => !G.catalysts.includes(id));
          const id = pick(pool) || 'jeanne'; if (!G.catalysts.includes(id)) { G.catalysts.push(id); addLog(`触媒「${SV_BY_ID[id].catalyst}」を入手。`); }
          mark('聖堂の光', `聖遺物「${SV_BY_ID[id].catalyst}」を託された。`);
          return `箱の中には、<b>${SV_BY_ID[id].catalyst}</b>が収められていた。手に取ると、あの冬の朝と同じ温もりがした。`; } },
    ] },

  // ======================= 天降神社：神隠し =======================
  { arc: 'kamikakushi', step: 1, id: 'a_kam1', ages: [6, 17], title: '神隠し',
    text: () => `一緒に遊んでいた${CAST.miko}が、天降山の森で消えた。<br>大人たちが山狩りをしても、見つからない。祖母が、青い顔で呟いた。「……山の神様に、連れていかれたのじゃ」`,
    choices: [
      { label: '夜の山に、一人で探しに行く', hint: '大胆・精神↑', run: () => { tone('bold'); gain('spi', 4); life().kamiGo = true; return '月明かりの山道を登った。森の奥から、鈴の音が聞こえた。（精神+4）'; } },
      { label: '祖母に、神様との話し方を聞く', hint: '知力↑・慎重', run: () => { tone('cautious'); gain('int', 4); life().kamiAsk = true; return '「神様にはな、願うのではなく、約束をするのじゃ」（知力+4）'; } },
    ] },
  { arc: 'kamikakushi', step: 2, id: 'a_kam2', ages: [9, 17], title: '山の神',
    text: () => '森の奥の、苔むした祠の前。白い霧の中から、獣とも人ともつかない声がした。<br>「――この子は、我が花嫁とする。返してほしくば、代わりに何を差し出す」',
    choices: [
      { label: '「一生、この山を守ると約束する」', hint: '精神判定・約束', run: () => { const c = chk('spi', life().kamiAsk ? 35 : 50);
          if (c.ok) { life().kamiPact = true; G.flags.leyline = true; gain('mag', 4); mk(20); return [c.text, `霧が晴れた。祠の前で、${CAST.miko}が眠っていた。<br>「……約束じゃぞ」山の神の声が、遠ざかっていった。（魔力+4 霊脈の知識）`]; }
          hp(-20); return [c.text, '霧に呑まれ、気を失った。目を覚ますと、二人とも麓の鳥居の前に倒れていた。……神様が、見逃してくれたのかもしれない。（HP-20）']; } },
      { label: '「自分が代わりになる」', hint: '善・大胆', run: () => { tone('good'); tone('bold'); life().kamiPact = true; gain('spi', 5); G.flags.touchedMist = true; mk(25);
          return `「……面白い童じゃ」霧の中で、何かが笑った。${CAST.miko}は返され、あなたの右手の甲に、小さな痣が残った。（精神+5）`; } },
    ] },
  { arc: 'kamikakushi', step: 3, id: 'a_kam3', ages: [14, 17], title: '神との約束',
    text: () => life().kamiPact ? '天降山の霊脈が、時折あなたを呼んでいる気がする。山の神との約束は、今も続いている。' : 'あの夜のことは、今でもよく分からない。ただ、山の霧を見ると、胸がざわつく。',
    choices: [
      { label: '毎朝、祠に参る', hint: '幸運↑↑', run: () => { gain('luk', 5); mark('神隠し', '従妹の雫を神隠しから取り戻し、山の神と約束を交わした。'); return '毎朝、祠に参った。山の神は、黙ってあなたを見守ってくれている気がした。（幸運+5）'; } },
      { label: '霊脈を学び、山を守る力をつける', hint: '魔力↑↑', run: () => { gain('mag', 5); G.flags.leyline = true; mark('神隠し', '神隠しの夜から、山を守る力を磨き続けた。'); return '霊脈の流れを、隅々まで覚えた。この山は、自分が守る。（魔力+5）'; } },
    ] },

  // ======================= 天降神社：神社の危機 =======================
  { arc: 'redevelopment', step: 1, id: 'a_red1', ages: [9, 17], title: '再開発の話',
    text: () => '背広の男たちが神社に来た。天降山の麓に、大きなリゾート施設を作るという。<br>「神社の土地も、ぜひ売っていただきたい。悪い話ではないはずです」祖母は、黙って茶を啜っていた。',
    choices: [
      { label: '男たちを追い返す', hint: '大胆・混沌', run: () => { tone('bold'); tone('chaos'); gain('spi', 3); life().redAnger = true; return '「帰ってください！」男たちは苦笑して、名刺を置いていった。（精神+3）'; } },
      { label: '話を、最後まで聞く', hint: '知力↑・慎重', run: () => { tone('cautious'); gain('int', 3); return '提示された金額は、神社が何十年も暮らしていけるほどだった。（知力+3）'; } },
    ] },
  { arc: 'redevelopment', step: 2, id: 'a_red2', ages: [12, 17], title: '揺れる町',
    text: () => '町は、賛成派と反対派に割れた。仕事が増えると喜ぶ人。山を壊すなと怒る人。<br>神社の跡取りとして、どちらにつくのか。皆があなたを見ている。',
    choices: [
      { label: '反対運動の先頭に立つ', hint: '交渉判定', run: () => { const c = chk('cha', 50);
          if (c.ok) { life().redWin = true; gain('cha', 4); return [c.text, '集会で、山と町の歴史を語った。拍手が、少しずつ大きくなっていった。（交渉+4）']; }
          gain('spi', 3); return [c.text, '言葉は、届かなかった。それでも、話を聞いてくれた人はいた。（精神+3）']; } },
      { label: '町の人の暮らしを、優先する', hint: '善・幸運↑', run: () => { tone('good'); gain('luk', 3); life().redSell = true; return '「町が潤うなら」――祖母は、静かに頷いた。（幸運+3）'; } },
    ] },
  { arc: 'redevelopment', step: 3, id: 'a_red3', ages: [14, 17], title: '山の行方',
    text: () => life().redSell ? '工事が始まった。麓の森が、少しずつ削られていく。……その夜、天降山の霊脈が、苦しげに揺れた。' : life().redWin ? '再開発の計画は、白紙になった。山は、守られた。' : '計画は、まだ決まらないまま。重機の音が、遠くで聞こえる。',
    choices: [
      { label: '山の霊脈を鎮める儀式を行う', hint: '魔力↑↑', run: () => { gain('mag', 5); G.flags.leyline = true; mark('神社の危機', life().redSell ? '削られた山の霊脈を、儀式で鎮めた。' : '神社と山を、守り抜いた。');
          return '一晩中、祝詞を奏上した。霊脈が、少しずつ落ち着いていく。（魔力+5）'; } },
      { label: '神社の未来を、町と話し合う', hint: '交渉↑・資金↑', run: () => { gain('cha', 3); money(4); mark('神社の危機', '神社の未来を、町の人々と話し合って決めた。');
          return '神社を観光の拠点にする案がまとまった。お賽銭箱が、少しだけ重くなった。（交渉+3 資金+4）'; } },
    ] },
);

// 章ごとの「その後」の処理（after）を、選択の後に呼ぶ
for (const e of GROWTH_EVENTS) if (e.after) { const after = e.after; e.choices = e.choices.map(c => ({ ...c, run: () => { const r = c.run(); after(); return r; } })); }

// ---- 聖杯戦争への影響 ----
// 準備期間の始まりに、和解した家族などからの支援
function lifePrepSupport() {
  const l = G.life || {}; const out = [];
  if (G.arc === 'divorce' && l.reconciled) { money(3); item('potion', 1); out.push('両親から、短い手紙と仕送りが届いた。「体に気をつけて」（資金+3 治癒の霊薬+1）'); }
  if (G.arc === 'sister' && l.sisCharm) { gain('luk', 3); out.push(`${l.sis}がくれたお守りが、鞄の中で揺れている。（幸運+3）`); }
  if (G.arc === 'foundling' && l.kidHome) { item('potion', 1); out.push(`${l.kid}が、手作りの弁当と薬を持たせてくれた。「ちゃんと帰ってきてね」（治癒の霊薬+1）`); }
  if (G.arc === 'foundling' && l.kidGone) { item('crystal', 1); out.push(`遠い国から、${l.kid}の手紙と小さな贈り物が届いた。（魔力結晶+1）`); }
  if (G.arc === 'illness' && l.motherSaved) { hp(100); out.push('母が、玄関で見送ってくれた。「行ってらっしゃい」'); }
  if (G.arc === 'engagement' && G.flags.fianceGift) out.push(`${l.fiance}から、一つの品が送られてきた。「あなたの戦いに、使って」――<b>${G.flags.fianceGift}</b>。`);
  return out;
}
// 敵陣営の一つに、因縁の相手を据える
function applyLifeRival() {
  const lr = G.lifeRival; if (!lr || !G.rivals.length) return;
  const cand = G.rivals.filter(r => !r.friend); if (!cand.length) return;
  const r = pick(cand);
  Object.assign(r, { lifeRival: true, master: lr.name, type: lr.type, quote: lr.quote, power: Math.max(r.power, 7), aggr: lr.stance === 'hostile' ? 0.9 : lr.stance === 'ally' ? 0.2 : 0.6 });
  if (lr.stance === 'ally') { r.ally = true; r.intel = Math.max(r.intel, 2); }
  addLog(`因縁の相手「${lr.name}」が、${r.cls}陣営のマスターとして参戦。`);
}
// エンディングに添える一文
function lifeEpilogue(kind) {
  if (!G.marks || !G.marks.length || kind === 'sealed') return '';
  const lr = G.lifeRival; const r = G.rivals.find(x => x.lifeRival);
  const tail = !lr || !r ? '' : !r.alive ? `${lr.name}との因縁は、あの冬に決着がついた。`
    : r.ally ? `${lr.name}とは、戦いの後も連絡を取り合っている。あの冬、肩を並べたことは、二人だけの秘密だ。`
    : lr.stance === 'hostile' ? `戦いの後、${lr.name}と一度だけ言葉を交わした。許されたのかどうかは、まだ分からない。`
    : `${lr.name}とは、戦いの後に一度だけ言葉を交わした。互いに、少しだけ大人になっていた。`;
  return `<p class="note">人生の痕跡――${G.marks[G.marks.length - 1].text}${tail ? '<br>' + tail : ''}</p>`;
}
// ステータス画面
function lifeMarksHTML() {
  if (!G.marks || !G.marks.length) return G.arc ? `<h3>人生の転機</h3><p class="empty">「${ARC_TITLE[G.arc]}」――まだ、物語の途中だ。</p>` : '';
  return `<h3>人生の痕跡</h3><div class="skill-list">${G.marks.map(m => `<div><b>${m.title}</b><em>${m.age}歳</em><span>${m.text}</span></div>`).join('')}</div>`;
}

// ---- 聖杯戦争：因縁の相手との再会（3日目の夜） ----
STORY.push({
  id: 'l_rival', phase: 'war', day: 3, slot: 1, after: 'advance', cond: () => !!G.lifeRival && G.rivals.some(r => r.lifeRival && r.alive) && !isShirou() && !isFuji() && !isKishi(),
  title: '因縁の再会', chapter: '第一幕　開幕',
  text: () => { const r = G.storyRival = G.rivals.find(x => x.lifeRival); r.intel = Math.max(r.intel, 1); const lr = G.lifeRival;
    return `夜の旧城下町。路地の向こうに、見覚えのある人影が立っていた。<br><b>${lr.name}</b>――${lr.type}。その傍らに、${r.cls}のサーヴァントが控えている。<br>あの日、道が分かれてから、何年が経っただろう。<p class="quote">「${r.quote}」</p>`; },
  choices: [
    { label: '言葉を交わす', hint: '交渉判定・関係が変わる', run: () => { const r = G.storyRival; const lr = G.lifeRival;
        const c = chk('cha', lr.stance === 'hostile' ? 65 : lr.stance === 'rival' ? 50 : 35);
        if (!c.ok) return [c.text, `${lr.name}は、何も答えずに背を向けた。……言葉は、まだ届かない。`];
        if (lr.stance === 'hostile') { lr.stance = 'rival'; r.aggr = 0.6; return [c.text, `長い沈黙の後、${lr.name}は小さく息をついた。「……憎しみだけで戦うのは、もうやめる。正々堂々、決着をつけよう」`]; }
        if (!r.ally) { r.ally = true; r.intel = Math.max(r.intel, 2); lr.stance = 'ally'; addLog(`${r.cls}陣営（${lr.name}）と手を組む。`); return [c.text, `「……昔みたいに、背中を預けてもいい？」${lr.name}が差し出した手を、強く握り返した。<br>${r.cls}陣営と同盟を結んだ。`]; }
        gain('spi', 3); return [c.text, `二人で、あの頃の話をした。夜が更けるまで。（精神+3）`]; } },
    { label: '剣を交える', hint: '戦闘', cls: 'danger', run: () => { const r = G.storyRival; if (r.ally) { r.ally = false; }
        return { text: `${SV()}が前に出る。${G.lifeRival.name}も、静かにサーヴァントに目配せした。`, then: () => startBattle(r, { duel: true }) }; } },
    { label: '今夜は、黙って立ち去る', hint: '慎重', run: () => { tone('cautious'); return `${G.lifeRival.name}の視線を背中に感じながら、路地を離れた。……いつか、向き合わなければならない。`; } },
  ],
});
