// =============================================================
//  data_rivals.js … 敵マスターの来歴（バックボーン）と、マスター同士の因縁
//
//  敵マスターの「型」（時計塔の貴族魔術師・深見の名家の当主 など8種、data_world.js の RIVAL_TYPES）ごとに、
//  来歴を3〜4種用意する。毎回のプレイで、型ごとに一つが選ばれる。
//  さらに、その回に揃った顔ぶれ次第で、二人のマスターのあいだに「因縁」が生まれることがある。
//   ・雇い主と傭兵（名家の当主／時計塔の研究者 × 雇われた傭兵）
//   ・狩る者と狩られる者（異端狩りの代行者 × 狂気の魔術師）
//   ・兄弟／姉妹（重圧の若き当主 × 名家の末っ子）
//   ・兄弟弟子（破門者を追う講師 × 破門された魔術師）
//   ・蒐集家と器（器を狙う蒐集家 × 聖杯の器として造られた少女）
//   ・六十年前の因縁（裏切りの記憶を持つ老魔術師 × 帰らなかった祖母の孫娘）
//   ・元同僚（裏切り者を追う代行者 × 教会を捨てた傭兵）
//  因縁のない来歴も多いので、同じ型でも、毎回違う人物・違う組み合わせになる。
//  来歴は、マスターの好む英霊の性格（騎士・王・学者 など）とも噛み合う。噛み合うかどうかで、主従の一言が変わる。
//
//  出てくる場所
//   ・陣営の画面：マスターが判明すると来歴、真名が判明すると主従の様子、二人とも判明すると因縁
//   ・戦いの前の台詞／倒した後の最後の言葉
//   ・因縁の相手が倒れると、残った側の態度が変わる（復讐に燃える・戦う理由を失う・契約が切れる など）
//   ・画面の外での陣営同士の戦いも、因縁に沿って起きやすい（兄弟や雇い主と傭兵は戦わない）
//   ・出来事「因縁の二人」（因縁ごと）と「敵マスターの素顔」（来歴ごと）
//   ・昏睡事件の犯人は、魂喰いに手を染めそうな来歴のマスターが選ばれやすく、判明すると動機が分かる
//  幼馴染・人生の転機の因縁の相手・藤丸シナリオの蒐集者は、これまで通り（来歴は付かない）
// =============================================================

const RV_TYPE = { noble: '時計塔の貴族魔術師', head: '深見の名家の当主', merc: '冷酷な傭兵', alch: '錬金術師の一族の少女',
  mad: '狂気に憑かれた魔術師', exec: '聖堂教会の代行者', stu: '巻き込まれた高校生', old: '老いた魔術師' };
const rvKey = r => Object.keys(RV_TYPE).find(k => RV_TYPE[k] === r.type);
const rvN = r => esc(r.master);
const rg = (r, m, f) => (r && r.g === 'f' ? f : m);   // 敵マスターの性別で言い方を変える
const rvSv = r => servantOf(r).name;
// 呼び名：二度目からは短く（外国の名は名前、日本の名は姓。兄弟・姉妹は名前）
function rvShort(r) { const w = String(r.master).split(/[・ ]/); if (/・/.test(r.master)) return w[0]; return G.rivals.some(x => x !== r && x.master.split(' ')[0] === w[0]) ? (w[1] || w[0]) : w[0]; }
function rvT(text) {
  let t = String(text);
  for (const r of (G && G.rivals) || []) { const n = esc(r.master), sh = esc(rvShort(r)); if (!n || n === sh) continue;
    const i = t.indexOf(n); if (i < 0) continue; t = t.slice(0, i + n.length) + t.slice(i + n.length).split(n).join(sh); }
  return t;
}

// =================================================================
//  来歴（type：型、pref：好む英霊の性格、dark：魂喰いに手を染めうる、linkOnly：因縁の中でだけ現れる）
//  story：来歴 / quote：戦いの前の台詞 / lose：倒れた時の最後の言葉 / fit：[噛み合う主従, 噛み合わない主従]
//  glimpse：出来事「敵マスターの素顔」の場面 / why：昏睡事件の犯人だった時の動機
// =================================================================
const RV_BB = {
  // ---------------- 時計塔の貴族魔術師 ----------------
  noble_fall: { type: 'noble', title: '没落した名門の嫡子', pref: ['king', 'knight'],
    story: r => `${rvN(r)}の家は、三代前に時計塔の派閥争いに敗れ、没落した。残ったのは古い家名と、屋敷を売って手に入れた一つの聖遺物だけ。聖杯戦争の勝者という名誉で、家を時計塔に返り咲かせるつもりだ。`,
    quote: () => '没落した家の名を、ここで取り戻す。……君の不運を呪いたまえ。',
    lose: () => '……屋敷まで売ったのだぞ。父上に、何と言えば……',
    fit: [r => `屋敷と引き換えの聖遺物で喚んだのは、${rvSv(r)}。誇り高い英霊と、誇りしか残っていない魔術師。主従は、奇妙なほど噛み合っている。`,
      r => `屋敷と引き換えの聖遺物で喚んだのは、${rvSv(r)}。思い描いていた「高貴な英霊」とは違ったらしく、主従の会話はいつも噛み合わない。`],
    glimpse: r => `駅前の質屋から、${rvN(r)}が出てきた。手にしていた懐中時計が、なくなっている。家紋の入った、古い銀時計だった。<br>目が合うと、${rvN(r)}は顔を背けた。「……見なかったことにしたまえ。滞在費が、少し足りなくなっただけだ」` },
  noble_root: { type: 'noble', title: '根源を求める研究者', pref: ['scholar', 'cool'], dark: true,
    story: r => `${rvN(r)}にとって、聖杯は願望機ではない。六十年に一度だけ開く、根源への「穴」だ。英霊も、他のマスターも、この街の住人も、観測のための変数にすぎない。`,
    quote: () => '願望機？ 違うね。これは根源への穴だ。観測の邪魔をしないでくれたまえ。',
    lose: () => '……興味深い。敗北の瞬間の数値も、ちゃんと記録しておかなければ……',
    fit: [r => `喚び出したのは${rvSv(r)}。${rvN(r)}の研究に、英霊は意外なほど協力的だという。`,
      r => `喚び出したのは${rvSv(r)}。${rvN(r)}は英霊を「観測対象」として扱い、英霊の方は、それに心底うんざりしているらしい。`],
    glimpse: r => `図書館の郷土資料室に、${rvN(r)}がいた。机の上には、深見の古地図と、霊脈の流れを書き込んだ方眼紙が何十枚も広がっている。<br>「……ああ、君か。この街の霊脈は美しいね。誰が設計したのか、ぜひ会ってみたかった」`,
    why: r => `「魂の流量を測るには、実際に流してみるのが一番早い」――${rvN(r)}にとって、昏睡した人々は、実験の対照群にすぎなかった。` },
  noble_lecturer: { type: 'noble', title: '破門者を追う講師', pref: ['knight', 'scholar'], linkOnly: true,
    story: r => `${rvN(r)}は時計塔の講師だ。かつて同じ師に学んだ兄弟弟子が、禁術に手を染めて破門され、この聖杯戦争に紛れ込んだと知って、極東まで追ってきた。師の名誉を汚した者を、自分の手で止めるために。`,
    quote: () => '君に用はない。私が探しているのは、ただ一人だ。……だが、道を塞ぐなら容赦はしない。',
    lose: () => '……あいつを止めるのは、私の役目だったのに……',
    fit: [r => `喚び出したのは${rvSv(r)}。${rvN(r)}の生真面目な戦い方を、英霊は好ましく思っているようだ。`,
      r => `喚び出したのは${rvSv(r)}。私怨で戦う主に、英霊は時々、冷ややかな目を向けている。`],
    glimpse: r => `喫茶店の窓際で、${rvN(r)}が一枚の古い写真を見つめていた。若い頃の二人の魔術師と、その間に立つ老人。<br>「……師と、兄弟弟子だ。三人で撮った、最後の写真だよ」` },
  noble_collector: { type: 'noble', title: '器を狙う蒐集家', pref: ['king', 'dark'], dark: true, linkOnly: true,
    story: r => `${rvN(r)}は、魔術の名品を集める蒐集家として知られている。今回の狙いは聖杯そのものではない。錬金術の一族が造り上げた聖杯の「器」――生きた少女の姿をした、最高傑作だ。`,
    quote: () => '聖杯などおまけだよ。私が欲しいのは、あの一族の最高傑作だけだ。',
    lose: () => '……私の、コレクションが……',
    fit: [r => `喚び出したのは${rvSv(r)}。蒐集家の歪んだ審美眼を、英霊は面白がっているらしい。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の「蒐集」を、はっきりと嫌悪している。`],
    glimpse: r => `骨董店の奥で、${rvN(r)}が硝子のケースを眺めていた。中には、古い人形が一体。<br>「美しいものは、正しく保管されるべきだ。……人も、ね」`,
    why: r => `「器の完成度を確かめるには、魂を注いでみなければ」――${rvN(r)}は、街の人々の魂で、器の容量を試していた。` },

  // ---------------- 深見の名家の当主 ----------------
  head_grudge: { type: 'head', title: '六十年の雪辱', pref: ['knight', 'warrior'],
    story: r => `${rvN(r)}の家は、深見に三百年続く魔術の家だ。六十年前の聖杯戦争で、先代の当主――${rvN(r)}の祖父――は、聖杯を目前にして敗れた。それから家は「負けた家」と呼ばれてきた。その汚名を雪ぐことが、一族の悲願だ。`,
    quote: () => 'この地の聖杯は我が家のものだ。余所者に渡すわけにはいかない。',
    lose: () => '……祖父と、同じところで躓くとはな……',
    fit: [r => `祖父の遺した触媒で喚んだのは、${rvSv(r)}。家の悲願を背負う主の覚悟を、英霊は正面から受け止めている。`,
      r => `祖父の遺した触媒で喚んだのは、${rvSv(r)}。家の名誉を語るたびに、英霊は退屈そうに欠伸をするという。`],
    glimpse: r => `古い屋敷の門の前で、${rvN(r)}が、苔むした石碑に手を合わせていた。刻まれているのは、六十年前に死んだ先代の名前だ。<br>「……祖父は、最後まで笑っていたそうだ。負けたのに。――私には、それが分からない」` },
  head_keeper: { type: 'head', title: '土地の管理者', pref: ['gentle', 'knight'],
    story: r => `${rvN(r)}の家は、代々この土地の霊脈を管理してきた。聖杯が欲しいわけではない。余所から来た魔術師たちに、深見の街を好き勝手にさせないため――聖杯を誰にも渡さず、封じるために参戦した。`,
    quote: () => '聖杯は誰にも使わせない。この街は、私が守る。',
    lose: () => '……街を、頼む。せめて、無関係な人だけは……',
    fit: [r => `喚び出したのは${rvSv(r)}。街を守りたいという主の願いに、英霊は心から賛同している。`,
      r => `喚び出したのは${rvSv(r)}。「守るだけでは勝てない」と、英霊は主に何度も進言しているらしい。`],
    glimpse: r => `商店街の福引所で、${rvN(r)}が、子どもたちにくじを引かせていた。町内会の手伝いだという。<br>「……この街の人たちは、聖杯のことなんて知らなくていい。知らないまま、福引で一喜一憂していればいいんだ」` },
  head_young: { type: 'head', title: '重圧の若き当主', pref: ['knight', 'cool'], linkOnly: true,
    story: r => { const s = rvPartner(r, 'kin');
      return `父の急死で、${rvN(r)}は十九歳で家を継いだ。親族は誰も若い当主を認めず、聖杯戦争での勝利だけが、当主としての証になる。……ただ一つの願いは、${s ? rg(s, '弟', '妹') : '弟'}だけは、この戦いに巻き込まないことだった。`; },
    quote: () => '下がっていろ。……私には、負けられない理由がある。',
    lose: r => { const s = rvPartner(r, 'kin'); return `……${s ? rg(s, '弟', '妹') : '弟'}には、言わないでくれ。${rg(r, '兄', '姉')}が、負けたことを……`; },
    fit: [r => `喚び出したのは${rvSv(r)}。若い主の張り詰めた背中を、英霊は黙って支えている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主が無理をしていることを見抜いて、何度も休めと言っているらしい。`],
    glimpse: r => `薬局で、${rvN(r)}が胃薬を買っていた。目の下の隈が、濃い。<br>「……当主が弱っているところを、見せるわけにはいかない。家の者にも、――家族にも」` },
  head_patron: { type: 'head', title: '傭兵を雇った当主', pref: ['king', 'free'], linkOnly: true,
    story: r => `${rvN(r)}は、名家の当主でありながら、魔術の才には恵まれなかった。足りない分は、金で補う。聖杯戦争に勝つために、海の向こうから腕利きの傭兵を雇い入れた。――もう一人のマスターとして。`,
    quote: () => '才能がないなら、勝ち筋を買えばいい。それも、当主の器量だ。',
    lose: () => '……金で買えないものも、あったか……',
    fit: [r => `喚び出したのは${rvSv(r)}。金払いのいい主を、英霊は案外気に入っているらしい。`,
      r => `喚び出したのは${rvSv(r)}。金で何でも片付けようとする主に、英霊は呆れ顔だという。`],
    glimpse: r => `高級料亭の前に、黒塗りの車が停まっていた。降りてきた${rvN(r)}は、電話の向こうの誰かに、低い声で指示を出している。<br>「……前金は払った。結果を出せ。――それが、君の仕事だろう」` },

  // ---------------- 冷酷な傭兵 ----------------
  merc_pro: { type: 'merc', title: '戦争屋', pref: ['cool', 'dark'], dark: true,
    story: r => `${rvN(r)}は、世界中の紛争地を渡り歩いてきた魔術使いだ。依頼主は名乗らない組織。報酬は、聖杯の「中身」の一部。どんな手段を使ってでも、結果だけを持ち帰る。`,
    quote: () => '仕事だ。悪く思うな。',
    lose: () => '……割に合わない仕事だった。それだけだ。',
    fit: [r => `喚び出したのは${rvSv(r)}。主従の間に情はない。けれど、互いの腕だけは信用している。`,
      r => `喚び出したのは${rvSv(r)}。手段を選ばない主のやり方に、英霊は何度も異を唱えているらしい。`],
    glimpse: r => `港のコンテナの陰で、${rvN(r)}が、缶詰を温めていた。ホテルには泊まらないらしい。<br>「……寝床は、逃げ道の確保できる場所に限る。戦場の癖だ」`,
    why: r => `「効率の問題だ」――${rvN(r)}にとって、魂喰いは、英霊を強くする最も安い手段にすぎなかった。` },
  merc_sister: { type: 'merc', title: '妹の治療費', pref: ['warrior', 'gentle'],
    story: r => `${rvN(r)}が戦う理由は、金だ。故郷の病院で、${rvN(r)}の妹が眠り続けている。治療を続けるための金と、もし手に入るなら――聖杯の奇跡。どちらでもいい。妹が目を覚ますなら。`,
    quote: r => `恨むなら、${rg(r, '俺', '私')}の運の悪さを恨め。……こっちにも、待ってる奴がいる。`,
    lose: r => `……悪い。……${rg(r, '兄ちゃん', '姉ちゃん')}、帰れそうにない……`,
    fit: [r => `喚び出したのは${rvSv(r)}。妹のために戦う主の不器用さを、英霊は放っておけないらしい。`,
      r => `喚び出したのは${rvSv(r)}。金のためだと言い張る主を、英霊は最後まで信用していない。`],
    glimpse: r => `郵便局の窓口で、${rvN(r)}が、海外への送金をしていた。伝票の宛先は、病院の名前だった。<br>「……見るな。――ただの、仕送りだ」` },
  merc_hired: { type: 'merc', title: '雇われた傭兵', pref: ['cool', 'warrior'], linkOnly: true,
    story: r => { const e = rvPartner(r, 'employ'); return `${rvN(r)}は、${e ? `${rvN(e)}（${e.type}）` : '依頼主'}に雇われてこの街に来た。依頼の内容は「雇い主を勝たせること」。${rvN(r)}自身の願いは、ない。契約が続く限り、雇い主の剣であり続ける。`; },
    quote: () => '雇い主の命令だ。悪く思うな。',
    lose: () => '……契約は、ここまでだな。',
    fit: [r => `喚び出したのは${rvSv(r)}。仕事と割り切る主に、英霊も淡々と従っている。`,
      r => `喚び出したのは${rvSv(r)}。「お前自身の願いは何だ」と、英霊は主に問い続けているらしい。`],
    glimpse: r => `ビジネスホテルのロビーで、${rvN(r)}が、雇い主への報告書を書いていた。几帳面な字だった。<br>「……契約は契約だ。好き嫌いで仕事はしない」` },
  merc_ex: { type: 'merc', title: '教会を捨てた元代行者', pref: ['dark', 'cool'], linkOnly: true,
    story: r => `${rvN(r)}は、かつて聖堂教会の代行者だった。ある任務で命令に背き、教会を捨てた。今は金で動く傭兵だ。……かつての同僚が、この街に来ていることも知っている。`,
    quote: () => '神様に祈るのは、もうやめたんだ。',
    lose: () => '……結局、どっちつかずのまま、か。',
    fit: [r => `喚び出したのは${rvSv(r)}。居場所をなくした主と英霊は、どこか似た者同士だ。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主が時々、教会の方角を見つめていることに気付いている。`],
    glimpse: r => `教会の前の坂道で、${rvN(r)}が立ち止まっていた。ポケットの中で、古いロザリオを握りしめている。<br>「……捨てたつもりだったんだがな。手が、覚えてる」` },

  // ---------------- 錬金術師の一族の少女 ----------------
  alch_last: { type: 'alch', title: '一族最後の錬金術師', pref: ['knight', 'gentle'], g: 'f',
    story: r => `${rvN(r)}の一族は、千年をかけて「完璧な聖杯」を造ろうとしてきた錬金術師の家系だ。けれど一族は衰え、今では${rvN(r)}一人しか残っていない。一族の千年を、${rvN(r)}は一人で背負って、この街に来た。`,
    quote: () => 'あなたも聖杯を求めるの？ なら、ここで消えてもらうわ。',
    lose: () => '……ごめんなさい、みんな。千年を、ここで終わらせてしまった……',
    fit: [r => `喚び出したのは${rvSv(r)}。一人で気を張る少女を、英霊は騎士のように守っている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、まだ幼い主に、どう接すればいいのか分からないらしい。`],
    glimpse: r => `城跡公園のベンチで、${rvN(r)}が、鳩に囲まれて途方に暮れていた。パンの耳を、あげすぎたらしい。<br>「……い、今のは見なかったことにして。錬金術師の威厳に関わるから」` },
  alch_prodigy: { type: 'alch', title: '一族の天才', pref: ['scholar', 'cool'], g: 'f', dark: true,
    story: r => `${rvN(r)}は、一族始まって以来の天才と呼ばれている。祖父の代から続く研究――「人の手で造る聖杯」――を完成させるために、本物の聖杯を解剖しに来た。`,
    quote: () => '本物の聖杯、見せてもらうわ。……邪魔をしないで。',
    lose: () => '……計算が、合わない……どこで、間違えたの……',
    fit: [r => `喚び出したのは${rvSv(r)}。天才の少女と英霊は、夜ごと難しい議論を交わしているという。`,
      r => `喚び出したのは${rvSv(r)}。理屈で全部を割り切ろうとする主を、英霊は危なっかしく見ている。`],
    glimpse: r => `古書店の専門書の棚の前で、${rvN(r)}が、背伸びをして一番上の本を取ろうとしていた。届いていない。<br>「……取って。――お礼は、言わないから」`,
    why: r => `「本物の聖杯が魂でできているなら、魂を集めれば、人の手でも造れるはず」――${rvN(r)}は、自分の研究のために、街の人々の魂を集めていた。` },
  alch_vessel: { type: 'alch', title: '聖杯の器として造られた少女', pref: ['gentle', 'knight'], g: 'f', linkOnly: true,
    story: r => `${rvN(r)}は、人間ではない。一族が聖杯の「器」として造り上げたホムンクルスだ。器になれば、心は消える。それでも${rvN(r)}は、自分の意思で、最後まで戦い抜くと決めた。……ある蒐集家に狙われていることも、知りながら。`,
    quote: () => '私は器じゃない。……最後まで、私として戦う。',
    lose: () => '……よかった。最後まで、私のままでいられた……',
    fit: [r => `喚び出したのは${rvSv(r)}。英霊は、造られた少女を「器」ではなく、一人の主として扱っている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の正体を知って、どう向き合えばいいか迷っているらしい。`],
    glimpse: r => `商店街のクレープ屋の前で、${rvN(r)}が、じっとメニューを見つめていた。<br>「……食べたことが、ないの。器には、味覚は要らないって言われてたから。――どれが、おいしいの？」` },
  alch_grand: { type: 'alch', title: '帰らなかった祖母の孫娘', pref: ['knight', 'gentle'], g: 'f', linkOnly: true,
    story: r => `六十年前、${rvN(r)}の祖母は深見の聖杯戦争に参加し、二度と帰らなかった。一族に残されたのは、「深見で、ある魔術師に見捨てられた」という言葉だけ。${rvN(r)}は、祖母の最期の真実を知るために来た。`,
    quote: () => '六十年前のことを知っている人が、この街にいるはず。……あなたじゃないのね。',
    lose: () => '……おばあさまの最期、結局、分からないまま……',
    fit: [r => `喚び出したのは${rvSv(r)}。祖母の真実を探す少女の旅に、英霊は静かに付き合っている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、「過去より今を見ろ」と、主にたびたび言うらしい。`],
    glimpse: r => `市立図書館で、${rvN(r)}が、六十年前の新聞の縮刷版をめくっていた。「港で原因不明の火災」「旧市街で行方不明者」――<br>「……この日。おばあさまの最後の手紙の、日付と同じ」` },

  // ---------------- 狂気に憑かれた魔術師 ----------------
  mad_revive: { type: 'mad', title: '娘を喪った親', pref: ['berserker', 'dark'], dark: true,
    story: r => `${rvN(r)}は、三年前に事故で娘を喪った。それから、${rvN(r)}は人が変わった。死者を呼び戻す術を探し続け、最後に辿り着いたのが、聖杯だった。「全部、あの子のためだ」――その言葉だけが、今の${rvN(r)}を動かしている。`,
    quote: () => 'ヒヒ……あの子が帰ってくるなら、街の一つくらい……。',
    lose: r => `……ごめん、ごめんね……${rg(r, 'お父さん', 'お母さん')}、迎えに行けなかった……`,
    fit: [r => `喚び出したのは${rvSv(r)}。英霊もまた、主と同じくらい、何かに取り憑かれている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の狂気の奥にある悲しみに気付いて、時々、引き止めようとしているらしい。`],
    glimpse: r => `おもちゃ屋の前で、${rvN(r)}が、ショーウィンドウのうさぎのぬいぐるみを見つめていた。いつもの狂気は、どこにもない。<br>「……あの子の誕生日、明日なんだ。帰ってきたら、渡そうと思って」`,
    why: r => `「あの子の魂を呼び戻すには、器を満たすだけの魂が要る」――${rvN(r)}は、娘を取り戻すために、他人の命を削っていた。` },
  mad_cult: { type: 'mad', title: '終末を夢見る者', pref: ['berserker', 'free'], dark: true,
    story: r => `${rvN(r)}は、深見の古い家の末裔だ。家に伝わる古文書を読み解くうちに、ある確信に取り憑かれた。「この街は、聖杯に捧げられるために造られた」――${rvN(r)}は、それを「完成」させようとしている。`,
    quote: () => 'ヒヒ……街ごと燃やせば、聖杯も早く満ちると思わないかい？',
    lose: () => '……なぜだ……完成、するはずだったのに……',
    fit: [r => `喚び出したのは${rvSv(r)}。主の狂った祭儀に、英霊は嬉々として付き合っている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の「完成」に、はっきりと背を向けている。令呪で縛られているだけだ。`],
    glimpse: r => `天降山の麓の古い石段に、${rvN(r)}が座り込んで、何かを熱心に書き写していた。苔むした石に刻まれた、読めない文字。<br>「ヒヒ……ほら、ここにも。この街の、設計図が」`,
    why: r => `「街の魂をすべて聖杯に捧げれば、儀式は完成する」――${rvN(r)}にとって、魂喰いは「祭儀」だった。` },
  mad_exile: { type: 'mad', title: '破門された魔術師', pref: ['dark', 'scholar'], dark: true, linkOnly: true,
    story: r => `${rvN(r)}は、かつて時計塔で将来を嘱望された魔術師だった。禁じられた魂の術式に手を出し、破門された。「真理に近づいたのは、${rg(r, '俺', '私')}の方だった」――その執念が、${rvN(r)}をこの街へ導いた。`,
    quote: r => `ヒヒ……時計塔の連中に、${rg(r, '俺', '私')}の真理を見せてやる。`,
    lose: () => '……結局、あいつの方が、正しかったのか……',
    fit: [r => `喚び出したのは${rvSv(r)}。禁術の研究に、英霊は危うい興味を示している。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の執念を哀れむように見ているらしい。`],
    glimpse: r => `コンビニで、${rvN(r)}が、栄養補助食品を山ほど買い込んでいた。目だけが、異様に光っている。<br>「……あと少しなんだ。あと少しで、術式が閉じる。――寝ている暇なんて、ないだろう？」`,
    why: r => `「禁術の実証には、魂が要る」――破門の理由になった術式を、${rvN(r)}はこの街で完成させようとしていた。` },

  // ---------------- 聖堂教会の代行者 ----------------
  exec_relic: { type: 'exec', title: '聖遺物の回収者', pref: ['knight', 'king'],
    story: r => `聖堂教会は、聖杯を「人の手に余る聖遺物」と見なしている。${rvN(r)}の任務は、聖杯を回収し、誰の願いも叶えさせずに封じること。監督役とは別の系統の命令で動いているらしい。`,
    quote: () => '主の名において、異端の魔術師を討つ。',
    lose: () => '……任務、失敗。……主よ、お許しを。',
    fit: [r => `喚び出したのは${rvSv(r)}。厳格な代行者と英霊は、主従というより戦友のようだ。`,
      r => `喚び出したのは${rvSv(r)}。教会の教えを説く主に、英霊は毎晩のように反論しているらしい。`],
    glimpse: r => `教会の裏庭で、${rvN(r)}が、黙々と黒鍵の手入れをしていた。祈りの言葉を、小さく唱えながら。<br>「……戦う前には、こうする。祈らずに刃を振るうのは、獣と同じだ」` },
  exec_hunt: { type: 'exec', title: '異端狩り', pref: ['knight', 'warrior'], linkOnly: true,
    story: r => { const t = rvPartner(r, 'hunt'); return `${rvN(r)}は、異端狩りを専門とする代行者だ。各地で魂を弄んできた一人の魔術師を、三年かけて追ってきた。${t ? `その魔術師――${rvN(t)}――` : 'その魔術師'}が、この聖杯戦争のマスターになったという。`; },
    quote: () => '私が狩るのは、ただ一人。……だが、邪魔をするなら、あなたも異端だ。',
    lose: () => '……あの異端を、残したまま……',
    fit: [r => `喚び出したのは${rvSv(r)}。異端を狩るという主の使命に、英霊は迷いなく刃を貸している。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、復讐めいた主の執念を、危ういものだと感じているらしい。`],
    glimpse: r => `朝の河川敷で、${rvN(r)}が、地面に残った焦げ跡を調べていた。<br>「……あれの、魔力の痕だ。三年追って、ようやく尻尾を掴んだ」` },
  exec_vendetta: { type: 'exec', title: '裏切り者を追う代行者', pref: ['knight', 'cool'], linkOnly: true,
    story: r => { const m = rvPartner(r, 'vendetta'); return `${rvN(r)}の任務は二つ。聖杯の回収と、教会を裏切って逃げた元同僚――${m ? rvN(m) : 'ある傭兵'}――の処分。……かつて、背中を預け合った相手だった。`; },
    quote: () => '主の名において。……そして、昔の友の名において。',
    lose: () => '……あいつに、伝えてくれ。恨んでは、いないと……',
    fit: [r => `喚び出したのは${rvSv(r)}。迷いを抱えたまま戦う主を、英霊は黙って見守っている。`,
      r => `喚び出したのは${rvSv(r)}。「本当に斬れるのか」と、英霊は主に問い続けているらしい。`],
    glimpse: r => `教会の告解室から、${rvN(r)}が出てきた。代行者が、告解を受ける側ではなく、する側に座っていた。<br>「……友を斬る許しを、乞うていた。――許されるはずも、ないのにな」` },
  exec_doubt: { type: 'exec', title: '信仰を見失った代行者', pref: ['gentle', 'scholar'],
    story: r => `${rvN(r)}は、ある任務で多くの命を救えなかった。それ以来、祈りの言葉が出てこない。この聖杯戦争に志願したのは、願望機に問うためだ。「主は、本当におられるのか」と。`,
    quote: () => '……答えが欲しいだけだ。主の沈黙の、理由が。',
    lose: () => '……ああ。これが、答えか……',
    fit: [r => `喚び出したのは${rvSv(r)}。答えを探す主に、英霊は自分の生きた時代の話を聞かせているという。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、迷いを抱えたまま戦う主を、もどかしく思っているらしい。`],
    glimpse: r => `夕暮れの礼拝堂で、${rvN(r)}が、最後列の長椅子に座っていた。祈ってはいない。ただ、祭壇を見つめている。<br>「……昔は、ここに座るだけで、声が聞こえた気がしたんだ」` },

  // ---------------- 巻き込まれた高校生 ----------------
  stu_accident: { type: 'stu', title: '偶然の召喚', pref: ['gentle', 'free', 'warrior'],
    story: r => `${rvN(r)}は、魔術とは無縁の高校生だ。古本屋で買った洋書に描かれた魔法陣を、面白半分に書き写した夜――本物の英霊が現れた。それから${rvN(r)}は、英霊と二人で、必死にこの戦争を生き延びている。`,
    quote: r => `お、${rg(r, '俺', 'わたし')}だって分かんないんだよ！ でも、こいつと約束したんだ！`,
    lose: () => '……ごめん。約束、守れなかった……',
    fit: [r => `現れたのは${rvSv(r)}。右も左も分からない主を、英霊は兄か姉のように面倒を見ている。`,
      r => `現れたのは${rvSv(r)}。とんでもない英霊を喚んでしまったと、${rvN(r)}は毎日頭を抱えているらしい。`],
    glimpse: r => `ファミレスで、${rvN(r)}が、宿題を広げたまま突っ伏していた。手の甲の令呪を、絆創膏で隠している。<br>「……明日、数学の小テストなんだよ。聖杯戦争中でも、テストはあるんだよ……」` },
  stu_wish: { type: 'stu', title: '叶えたい願い', pref: ['warrior', 'knight'],
    story: r => `${rvN(r)}の親友は、一年前の事故で歩けなくなった。偶然手に入れた令呪の意味を知った時、${rvN(r)}は迷わなかった。「聖杯なら、あいつをもう一度走らせられる」――素人の、まっすぐすぎる願いだ。`,
    quote: () => 'あいつを、もう一度走らせてやるんだ。だから、負けられない！',
    lose: () => '……あいつに、何て言えばいいんだよ……',
    fit: [r => `喚び出したのは${rvSv(r)}。まっすぐな主の願いに、英霊は全力で応えようとしている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、願いの重さを知らない主を、少し心配しているらしい。`],
    glimpse: r => `病院のリハビリ室の窓の外で、${rvN(r)}が、中を覗いていた。車椅子の少年が、平行棒を掴んで、立ち上がろうとしている。<br>「……あいつ、毎日ああなんだ。だから、${rg(r, '俺', 'わたし')}も、諦めない」` },
  stu_brother: { type: 'stu', title: '名家の末っ子', pref: ['gentle', 'warrior'], linkOnly: true,
    story: r => { const h = rvPartner(r, 'kin'); return `${rvN(r)}は、深見の名家の末っ子だ。魔術の才能はないと、ずっと言われてきた。けれど、手の甲に令呪が浮かんだ。当主の${h ? rg(h, '兄', '姉') : '兄'}に黙ったまま、${rvN(r)}は英霊と契約した。「一人で背負わせたくない」――ただ、それだけのために。`; },
    quote: r => { const h = rvPartner(r, 'kin'); return `${h ? rg(h, '兄さん', '姉さん') : '兄さん'}には内緒なんだ。……でも、手伝いたいんだよ！`; },
    lose: r => { const h = rvPartner(r, 'kin'); return `……やっぱり、${rg(r, '俺', 'わたし')}じゃ駄目だった……${h ? rg(h, '兄さん', '姉さん') : '兄さん'}、ごめん……`; },
    fit: [r => `喚び出したのは${rvSv(r)}。健気な末っ子を、英霊は弟子のように鍛えている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主が家族に隠れて戦っていることを、良く思っていないらしい。`],
    glimpse: r => `和菓子屋の前で、${rvN(r)}が、紙袋を抱えて立っていた。<br>「……${(() => { const h = rvPartner(r, 'kin'); return h ? rg(h, '兄さん', '姉さん') : '兄さん'; })()}、ここのどら焼きが好きなんだ。最近、全然笑わないから。……せめて、これくらいはさ」` },

  // ---------------- 老いた魔術師 ----------------
  old_sixty: { type: 'old', title: '六十年前の生き残り', pref: ['scholar', 'king', 'cool'],
    story: r => `${rvN(r)}は、六十年前の聖杯戦争を戦い抜いた、数少ない生き残りだ。あの時は、決着がつかないまま聖杯が壊れた。${CAST.old}とは、同じ戦場にいた古い知り合いだという。六十年越しに、あの戦いの続きを見届けに来た。`,
    quote: () => '六十年前の戦いの続きを、ようやく見届けられる……。',
    lose: () => '……ようやく、終われる。……ありがとうよ、若いの。',
    fit: [r => `喚び出したのは${rvSv(r)}。老練な主と英霊は、言葉少なに通じ合っている。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の老体を気遣って、いつも先に前へ出るという。`],
    glimpse: r => `御影川の土手で、${rvN(r)}が、${CAST.old}と並んで釣り糸を垂れていた。二人とも、何も話さない。<br>やがて、${rvN(r)}がぽつりと言った。「……六十年経っても、お前は下手なままだな」` },
  old_heir: { type: 'old', title: '最後の教え', pref: ['scholar', 'gentle'],
    story: r => `${rvN(r)}には、跡を継ぐ者がいない。弟子も、子も、先に逝った。自分の魔術を、何も遺せないまま終わることが、${rvN(r)}には何より恐ろしい。聖杯戦争は、その魔術のすべてを刻みつける、最後の舞台だ。`,
    quote: () => 'せめて、わしの魔術がここに在ったことを、覚えておいてくれ。',
    lose: () => '……若いの。今の術、覚えたか。……なら、それでいい。',
    fit: [r => `喚び出したのは${rvSv(r)}。英霊は、主の魔術を「美しい」と言ったという。${rvN(r)}は、それを何より喜んだ。`,
      r => `喚び出したのは${rvSv(r)}。英霊は、主の魔術にはまるで興味がないらしい。それが、少しだけ寂しいという。`],
    glimpse: r => `公民館の書道教室で、${rvN(r)}が、子どもたちに字を教えていた。半紙に書かれた文字が、かすかに魔力を帯びている。<br>「……ただの手習いだよ。――ただ、この子らの中に、一人くらい、筋のいいのがいるかもしれんだろう」` },
  old_feud: { type: 'old', title: '見捨てた夜の記憶', pref: ['cool', 'gentle', 'scholar'], linkOnly: true,
    story: r => `六十年前、${rvN(r)}は、ある錬金術師の娘と同盟を組んだ。そして最後の夜、自分が生き残るために、彼女を見捨てた。六十年間、${rvN(r)}はその夜を忘れたことがない。――その娘の孫が、この街に来ている。`,
    quote: () => '……あの子の孫か。わしを、裁きに来たのだろうな。',
    lose: () => '……これで、あの人に、詫びに行ける……',
    fit: [r => `喚び出したのは${rvSv(r)}。英霊は、主の悔恨を、何も言わずに受け止めている。`,
      r => `喚び出したのは${rvSv(r)}。「六十年も悔やむなら、今度こそ逃げるな」と、英霊は主を叱るという。`],
    glimpse: r => `港を見下ろす墓地で、${rvN(r)}が、名前の刻まれていない小さな墓に、花を供えていた。<br>「……遺骨も、名前もない。それでも、六十年、毎年来ておる。――来ずには、おれんのだ」` },
};

// =================================================================
//  因縁（a・b：型と来歴。来歴が無指定なら、その型のどの来歴でもよい）
//  label：陣営の画面での呼び名 / reveal：二人のマスターが判明した時 / scene：出来事「因縁の二人」
//  ally：二人は手を組んでいる（画面の外で戦わない） / feud：二人は争っている（画面の外で戦いやすい）
//  fallA：a が倒れた時（b の変化） / fallB：b が倒れた時（a の変化）
// =================================================================
const RV_LINKS = [
  { id: 'employ', a: { type: 'head', bb: 'head_patron' }, b: { type: 'merc', bb: 'merc_hired' }, ally: true, p: 0.45,
    label: () => '雇い主と傭兵',
    reveal: (A, B) => `${rvN(A)}と${rvN(B)}は、雇い主と傭兵の関係だ。二つの陣営は、裏で手を組んでいる。`,
    scene: (A, B) => `港の倉庫街。人目を避けた場所で、${rvN(A)}が、${rvN(B)}に分厚い封筒を渡していた。<br>「次の標的だ。……前金は、倍にしてある」<br>${rvN(B)}は、封筒の中身を確かめもせずに懐にしまった。「仕事は、する。それ以上は期待するな」`,
    special: { label: () => '傭兵に、もっといい条件を持ちかける', hint: '交渉判定・資金-3（傭兵の陣営と同盟）', disabled: () => G.master.money < 3,
      run: (A, B) => { const c = chk('cha', 62); if (!c.ok) return [c.text, `「……雇い主を裏切れ、と？ 安く見られたもんだな」${rvN(B)}は、冷たく言い捨てて去っていった。`];
        money(-3); B.ally = true; B.intel = Math.max(B.intel, 2); rvBreak('employ'); addLog(`${rvN(B)}（${B.cls}陣営）を、雇い主から引き抜いた。`);
        return [c.text, `「……前金の三割増し。それと、雇い主には手を出さないこと。それが条件だ」<br>${rvN(B)}は、あなたと短く握手をした。${B.cls}陣営は、当面あなたの側につく。（資金-3）`]; } },
    fallA: (A, B) => { B.aggr = 0.3; B.quote = '雇い主は消えた。……ただ働きはしない主義でね。'; return `${rvN(B)}の雇い主――${rvN(A)}――が倒れた。契約を失った${B.cls}陣営の傭兵は、動きを止めたようだ。`; },
    fallB: (A, B) => { A.aggr = Math.min(0.95, A.aggr + 0.25); A.quote = '……金で買った勝ち筋も、尽きたか。ならば、自分の手で掴むまでだ。'; return `${rvN(A)}が雇った傭兵――${rvN(B)}――が倒れた。後のなくなった${A.cls}陣営は、なりふり構わなくなるだろう。`; } },
  { id: 'employ', a: { type: 'noble', bb: 'noble_root' }, b: { type: 'merc', bb: 'merc_hired' }, ally: true, p: 0.35,
    label: () => '雇い主と傭兵',
    reveal: (A, B) => `${rvN(A)}と${rvN(B)}は、雇い主と傭兵の関係だ。研究者が、汚れ仕事を傭兵に任せている。`,
    scene: (A, B) => `深夜のホテルの屋上。${rvN(A)}が、${rvN(B)}にタブレットを見せていた。<br>「この陣営の英霊の魔力の数値を、もう少し取りたい。適度に、戦ってきてくれたまえ」<br>「……適度に、ね」${rvN(B)}は、うんざりしたように肩をすくめた。`,
    special: { label: () => '傭兵に、もっといい条件を持ちかける', hint: '交渉判定・資金-3（傭兵の陣営と同盟）', disabled: () => G.master.money < 3,
      run: (A, B) => { const c = chk('cha', 58); if (!c.ok) return [c.text, `「悪いが、契約中だ」${rvN(B)}は、取り合わなかった。`];
        money(-3); B.ally = true; B.intel = Math.max(B.intel, 2); rvBreak('employ'); addLog(`${rvN(B)}（${B.cls}陣営）を、雇い主から引き抜いた。`);
        return [c.text, `「……実験動物扱いには、正直うんざりしてたところだ」${rvN(B)}は、あなたの側につくことを承知した。（資金-3）`]; } },
    fallA: (A, B) => { B.aggr = 0.3; B.quote = '雇い主は消えた。……ただ働きはしない主義でね。'; return `${rvN(B)}の雇い主――${rvN(A)}――が倒れた。契約を失った${B.cls}陣営の傭兵は、動きを止めたようだ。`; },
    fallB: (A, B) => { A.quote = '……駒を一つ失ったか。まあいい。観測は、私自身の手で続けよう。'; return `${rvN(A)}が雇った傭兵――${rvN(B)}――が倒れた。`; } },
  { id: 'hunt', a: { type: 'exec', bb: 'exec_hunt' }, b: { type: 'mad' }, feud: true, p: 0.5,
    label: () => '狩る者と狩られる者',
    reveal: (A, B) => `代行者の${rvN(A)}が三年かけて追ってきた異端は、${rvN(B)}だ。二つの陣営は、互いを狙っている。`,
    scene: (A, B) => `夜の旧城下町。路地の奥で、黒鍵を構えた${rvN(A)}が、${rvN(B)}を追い詰めていた。<br>「三年だ。……ようやく、ここまで来た」<br>「ヒヒ……しつこいねえ、教会の犬は」${rvN(B)}の背後で、英霊の気配が膨れ上がる。`,
    special: { label: () => '代行者に、異端の拠点の情報を渡す', hint: '知力判定（狂気の魔術師の陣営の拠点が分かる・代行者と同盟）',
      run: (A, B) => { const c = chk('int', 55); B.intel = Math.max(B.intel, 2);
        if (!c.ok) return [c.text, `情報は、半分しか伝わらなかった。それでも${rvN(A)}は、短く頭を下げた。「……感謝する」（${B.cls}陣営の拠点が判明）`];
        A.ally = true; A.intel = Math.max(A.intel, 2); addLog(`代行者・${rvN(A)}（${A.cls}陣営）と、異端を狩るために手を組んだ。`);
        return [c.text, `${rvN(A)}は、あなたの調べた情報を、黙って最後まで聞いた。「……異端を狩るまで、あなたとは争わない。主に誓って」（${A.cls}陣営と同盟・${B.cls}陣営の拠点が判明）`]; } },
    fallA: (A, B) => { B.aggr = Math.min(1, B.aggr + 0.1); B.quote = 'ヒヒ……鬱陶しい狩人は、もういない。これで、心置きなく……'; return `${rvN(B)}を追っていた代行者――${rvN(A)}――が倒れた。狩人のいなくなった${B.cls}陣営は、ますます大胆になるだろう。`; },
    fallB: (A, B) => { A.aggr = 0.2; A.quote = '狩りは終わった。……あなたと争う理由は、もうない。だが、聖杯は回収させてもらう。'; return `代行者の${rvN(A)}が追ってきた異端――${rvN(B)}――が倒れた。${A.cls}陣営は、狩るべき相手を失った。`; } },
  { id: 'kin', a: { type: 'head', bb: 'head_young' }, b: { type: 'stu', bb: 'stu_brother' }, ally: true, kin: true, p: 0.55,
    label: (A, B) => `${rg(A, '兄', '姉')}と${rg(B, '弟', '妹')}`,
    reveal: (A, B) => `${rvN(A)}と${rvN(B)}は、${rg(A, '兄', '姉')}と${rg(B, '弟', '妹')}だ。` + (G.used.rv_link_kin ? `${rg(A, '兄', '姉')}に黙ってマスターになった${rvN(B)}のことは、もう${rvN(A)}に知られてしまった。` : `けれど${rvN(B)}は、${rg(A, '兄', '姉')}に黙って、マスターになったらしい。`),
    scene: (A, B) => `古い屋敷の門の前で、${rvN(A)}と${rvN(B)}が言い争っていた。<br>「なぜ黙っていた！ お前まで、この戦いに――」<br>「だって、${rg(A, '兄さん', '姉さん')}が一人で全部背負うから！ ……${rg(B, '俺', 'わたし')}だって、家族なんだ！」<br>二人の手の甲で、令呪が同じ色に光っていた。`,
    special: { label: () => '末っ子に、当主の本心を伝える', hint: '交渉判定（末っ子が聖杯戦争から降りるかもしれない）', cond: () => aliveRivals().length > 2,
      run: (A, B) => { const c = chk('cha', 55); if (!c.ok) return [c.text, `「……分かってるよ。でも、それでも」${rvN(B)}は、首を振った。`];
        B.alive = false; B.retired = true; B.hp = 0; A.aggr = Math.max(0.2, A.aggr - 0.2); addLog(`${rvN(B)}（${B.cls}陣営）が、${rg(A, '兄', '姉')}のために聖杯戦争から降りる。`);
        return [c.text, `「${rg(A, '兄さん', '姉さん')}は、一人で背負いたいんじゃない。……あなたを、巻き込みたくないだけだ」<br>${rvN(B)}は、長いこと黙っていた。それから、手の甲の令呪を見つめて、頷いた。<br>翌日、${rvN(B)}は教会に保護を求めた。英霊とは、笑って別れたという。${rvN(A)}から、短い手紙が届いた。「……礼を言う」`]; } },
    fallA: (A, B) => { B.aggr = 0.95; B.power += 1; B.quote = `……${rg(A, '兄さん', '姉さん')}を倒したのは、お前か。――絶対に、許さない！`; return `${rvN(B)}の${rg(A, '兄', '姉')}――${rvN(A)}――が倒れた。${B.cls}陣営の末っ子は、復讐に燃えている。`; },
    fallB: (A, B) => { if (B.retired) return ''; A.aggr = 0.95; A.power += 1; A.quote = `……${rg(B, '弟', '妹')}を、よくも。――家も、聖杯も、もうどうでもいい。お前だけは！`; return `${rvN(A)}の${rg(B, '弟', '妹')}――${rvN(B)}――が倒れた。${A.cls}陣営の当主は、すべてを捨てて復讐に向かうだろう。`; } },
  { id: 'rivalry', a: { type: 'noble', bb: 'noble_lecturer' }, b: { type: 'mad', bb: 'mad_exile' }, feud: true, p: 0.5,
    label: () => '兄弟弟子',
    reveal: (A, B) => `${rvN(A)}と${rvN(B)}は、時計塔で同じ師に学んだ兄弟弟子だ。${rvN(A)}は、破門された${rvN(B)}を止めるために、この街に来た。`,
    scene: (A, B) => `廃校になった小学校の屋上。${rvN(A)}と${rvN(B)}が、距離を置いて向かい合っていた。<br>「……先生は、最後までお前の名前を呼んでいた」<br>「ヒヒ……だから何だ。あの人は、${rg(B, '俺', '私')}の術式を、最後まで理解しなかった」<br>二人の間の空気が、軋むように歪んだ。`,
    special: { label: () => '講師に、手を組もうと持ちかける', hint: '交渉判定（講師の陣営と同盟）',
      run: (A, B) => { const c = chk('cha', 55); if (!c.ok) return [c.text, `「……これは、私の問題だ。部外者は引っ込んでいたまえ」`];
        A.ally = true; A.intel = Math.max(A.intel, 2); B.intel = Math.max(B.intel, 1); addLog(`講師・${rvN(A)}（${A.cls}陣営）と、兄弟弟子を止めるために手を組んだ。`);
        return [c.text, `${rvN(A)}は、しばらく考えてから、眼鏡を押し上げた。「……いいだろう。あいつを止めるまでの、休戦だ」（${A.cls}陣営と同盟）`]; } },
    fallA: (A, B) => { B.quote = 'ヒヒ……先生のお気に入りが、先に逝ったか。もう、誰も止めに来ない。'; B.aggr = Math.min(1, B.aggr + 0.1); return `${rvN(B)}を追っていた兄弟弟子――${rvN(A)}――が倒れた。`; },
    fallB: (A, B) => { A.aggr = 0.3; A.quote = '……あいつは、もういない。私の戦う理由も、半分は消えた。'; return `${rvN(A)}の兄弟弟子――${rvN(B)}――が倒れた。${A.cls}陣営の講師は、戦う理由の半分を失った。`; } },
  { id: 'chase', a: { type: 'noble', bb: 'noble_collector' }, b: { type: 'alch', bb: 'alch_vessel' }, feud: true, p: 0.45,
    label: () => '蒐集家と器',
    reveal: (A, B) => `蒐集家の${rvN(A)}が狙っている「器」は、${rvN(B)}だ。${rvN(B)}は、聖杯と蒐集家の両方から逃げながら戦っている。`,
    scene: (A, B) => `雨の夜の商店街。アーケードの下を、${rvN(B)}が走っていた。その後ろから、ゆっくりと、${rvN(A)}が歩いてくる。<br>「逃げなくていい。君は、私の硝子のケースの中で、永遠に美しくいられるのだから」<br>${rvN(B)}が、あなたの方へ駆けてきた。`,
    special: { label: () => '少女を匿う', hint: '戦力を割く（体力-10・少女の陣営と同盟）',
      run: (A, B) => { hp(-10); B.ally = true; B.intel = Math.max(B.intel, 2); A.intel = Math.max(A.intel, 1); A.aggr = Math.min(0.95, A.aggr + 0.15); addLog(`器の少女・${rvN(B)}（${B.cls}陣営）を匿った。`);
        return `${SV()}が、${rvN(A)}の前に立ちはだかった。${rvN(A)}は、しばらくあなたたちを眺めて、薄く笑って去っていった。「……いいだろう。コレクションは、まとめて手に入れる主義でね」<br>${rvN(B)}は、震える声で言った。「……どうして、助けたの。私は、器なのに」（HP-10・${B.cls}陣営と同盟）`; } },
    fallA: (A, B) => { B.aggr = 0.3; B.quote = '……もう、誰にも追われない。最後まで、自分のために戦える。'; return `${rvN(B)}を狙っていた蒐集家――${rvN(A)}――が倒れた。器の少女は、ようやく追われずに済む。`; },
    fallB: (A, B) => { A.aggr = Math.min(0.95, A.aggr + 0.2); A.quote = '……最高傑作が、壊れたか。ならばせめて、聖杯だけは私のものに。'; return `蒐集家の${rvN(A)}が狙っていた器――${rvN(B)}――が倒れた。獲物を失った${A.cls}陣営は、聖杯そのものに矛先を向けるだろう。`; } },
  { id: 'oldfeud', a: { type: 'old', bb: 'old_feud' }, b: { type: 'alch', bb: 'alch_grand' }, p: 0.5,
    label: () => '六十年前の因縁',
    reveal: (A, B) => `${rvN(B)}の祖母を、六十年前の最後の夜に見捨てたのは、${rvN(A)}だ。` + (G.used.rv_link_oldfeud ? `${rvN(A)}は、それを自ら${rvN(B)}に打ち明けた。` : `${rvN(B)}は、まだそれを知らない。`),
    scene: (A, B) => `港を見下ろす墓地。名前のない小さな墓の前で、${rvN(A)}が、${rvN(B)}に向かって膝をついていた。<br>「……あんたのおばあさんを見捨てたのは、わしだ。最後の夜、わしは逃げた」<br>${rvN(B)}の手が、震えていた。英霊が、その背後で静かに刃を構えている。`,
    special: { label: () => '二人の間に入り、話を最後まで聞かせる', hint: '交渉判定（二人の陣営の敵意が和らぐ）',
      run: (A, B) => { const c = chk('cha', 55); if (!c.ok) return [c.text, `${rvN(B)}は、何も言わずに背を向けた。${rvN(A)}は、膝をついたまま、動かなかった。`];
        A.aggr = 0.2; B.aggr = 0.25; A.intel = Math.max(A.intel, 2); B.intel = Math.max(B.intel, 2); G.flags.rvFeudHeard = true; addLog(`${rvN(A)}と${rvN(B)}の、六十年前の因縁を見届けた。`);
        return [c.text, `${rvN(A)}は、あの夜のことを、全部話した。逃げた理由。それから六十年、毎年この墓に来ていたこと。<br>${rvN(B)}は、最後まで黙って聞いていた。そして、墓に花を一輪、供えた。<br>「……おばあさまは、最後の手紙に書いてたの。『あの人は、きっと生き延びる。それでいい』って」<br>${rvN(A)}は、声を上げて泣いた。`]; } },
    fallA: (A, B) => { B.aggr = 0.25; B.quote = G.flags.rvFeudHeard ? '……あの人の言葉、ちゃんと聞けた。もう、恨む理由はない。' : '……おばあさまのことを知ってる人が、いなくなった。'; return `${rvN(B)}の祖母を知る老魔術師――${rvN(A)}――が倒れた。`; },
    fallB: (A, B) => { A.aggr = Math.min(0.9, A.aggr + 0.3); A.quote = '……また、守れなかったか。六十年経っても、わしは何も変わらん。'; return `${rvN(A)}が六十年悔やみ続けた娘の孫――${rvN(B)}――が倒れた。`; } },
  { id: 'vendetta', a: { type: 'exec', bb: 'exec_vendetta' }, b: { type: 'merc', bb: 'merc_ex' }, feud: true, p: 0.45,
    label: () => '元同僚',
    reveal: (A, B) => `代行者の${rvN(A)}と傭兵の${rvN(B)}は、かつて教会で背中を預け合った同僚だ。${rvN(A)}の任務の一つは、裏切り者の${rvN(B)}を処分することだ。`,
    scene: (A, B) => `教会の裏の墓地。月明かりの下で、${rvN(A)}と${rvN(B)}が、刃の届かない距離で向かい合っていた。<br>「……戻る気は、ないのか」<br>「戻ったら、お前に斬られるだけだろう」<br>二人とも、先に刃を抜こうとはしなかった。`,
    special: { label: () => '二人に、休戦を勧める', hint: '交渉判定（二人の陣営の敵意が和らぐ）',
      run: (A, B) => { const c = chk('cha', 58); if (!c.ok) return [c.text, '「部外者の口出しは、無用だ」――二人の声が、揃った。'];
        A.aggr = Math.max(0.2, A.aggr - 0.25); B.aggr = Math.max(0.2, B.aggr - 0.25); A.intel = Math.max(A.intel, 1); B.intel = Math.max(B.intel, 1);
        return [c.text, `「……この戦争が終わるまで、だ」${rvN(A)}が、先に刃を収めた。${rvN(B)}は、小さく笑った。「相変わらず、甘いな」<br>二人は、別々の方向へ歩いていった。けれど、その足取りは、来た時より少しだけ軽かった。`]; } },
    fallA: (A, B) => { B.quote = '……あいつが、逝ったか。――斬られるなら、あいつがよかった。'; return `${rvN(B)}を追っていた元同僚――${rvN(A)}――が倒れた。`; },
    fallB: (A, B) => { A.aggr = Math.max(0.3, A.aggr - 0.2); A.quote = '……任務の半分は、終わった。終わってしまった。'; return `${rvN(A)}が追っていた元同僚――${rvN(B)}――が倒れた。`; } },
];

// =================================================================
//  割り当て（setupRivals の最後に呼ぶ）
// =================================================================
const RV_FOREIGN = { m: ['エーリッヒ', 'ユリウス', 'ルドルフ', 'ヴィクトル'], f: ['クラリス', 'アデーレ', 'セシリア', 'イレーネ'] };
function rvName(r, g, family, used) {
  const foreign = /・/.test(r.master);
  for (let k = 0; k < 40; k++) {
    const n = foreign ? `${pick(RV_FOREIGN[g])}・${family || pick(NAMES.foreignFamily)}` : `${family || pick(NAMES.family)} ${pick(g === 'f' ? NAMES.givenF : NAMES.givenM)}`;
    const ws = n.split(/[・ ]/); if (!ws.some((w, i) => used.has(w) && !(family && w === family))) return n;
  }
  return r.master;
}
function rvFree(r) { return !r.friend && !r.lifeRival && !r.curator && !r.erased; }
function rvAssign() {
  if (!G || !G.rivals) return;
  const rs = G.rivals.filter(rvFree); const byKey = {};
  for (const r of rs) { const k = rvKey(r); if (k && !byKey[k]) byKey[k] = r; r.bb = null; }
  G.rvLinks = []; G.rvFell = {}; G.rvKnown = {}; const taken = new Set();
  for (const L of shuffle(RV_LINKS)) {
    const A = byKey[L.a.type], B = byKey[L.b.type];
    if (!A || !B || taken.has(A.id) || taken.has(B.id) || Math.random() > (L.p || 0.6)) continue;
    if (L.a.bb) A.bb = L.a.bb; if (L.b.bb) B.bb = L.b.bb;
    taken.add(A.id); taken.add(B.id); G.rvLinks.push({ id: L.id, a: A.id, b: B.id, k: RV_LINKS.indexOf(L) });
  }
  // 残りは、因縁のない来歴から。英霊の性格に合う来歴ほど選ばれやすい
  for (const r of rs) {
    if (r.bb) continue; const k = rvKey(r); if (!k) continue;
    const pool = Object.keys(RV_BB).filter(id => RV_BB[id].type === k && !RV_BB[id].linkOnly);
    const per = servantOf(r).persona; r.bb = wpick(pool, id => 1 + (RV_BB[id].pref.includes(per) ? 1.5 : 0));
  }
  // 性別と名前（兄弟・姉妹は同じ姓）
  const used = new Set();
  for (const n of [G.master && G.master.name, G.friend && G.friend.name, ...G.rivals.filter(r => !rvFree(r)).map(r => r.master)]) if (n) for (const w of String(n).split(/[・ ]/)) used.add(w);
  const kinOf = {}; for (const l of G.rvLinks) if (RV_LINKS[l.k].kin) kinOf[l.b] = l.a;
  const order = rs.filter(r => r.bb).sort((x, y) => (kinOf[x.id] ? 1 : 0) - (kinOf[y.id] ? 1 : 0));
  for (const r of order) {
    const bb = RV_BB[r.bb]; r.g = bb.g || pick(['m', 'f']);
    const head = kinOf[r.id] && G.rivals.find(x => x.id === kinOf[r.id]);
    const family = head ? head.master.split(/[・ ]/)[/・/.test(head.master) ? 1 : 0] : null;
    r.master = rvName(r, r.g, family, used); for (const w of r.master.split(/[・ ]/)) used.add(w);
  }
  for (const r of order) r.quote = RV_BB[r.bb].quote(r);
}
function rvBB(r) { return r && r.bb && rvFree(r) ? RV_BB[r.bb] : null; }
// 成立している因縁（二人とも、まだ来歴を持っている）
function rvLinks() {
  if (!G || !G.rvLinks) return [];
  return G.rvLinks.map(l => ({ ...l, L: RV_LINKS[l.k], A: G.rivals.find(r => r.id === l.a), B: G.rivals.find(r => r.id === l.b) }))
    .filter(l => l.A && l.B && rvBB(l.A) && rvBB(l.B) && !l.broken);
}
function rvPartner(r, id) { const l = rvLinks().find(x => x.id === id && (x.A === r || x.B === r)); return l ? (l.A === r ? l.B : l.A) : null; }
function rvBreak(id) { for (const l of G.rvLinks || []) if (l.id === id) l.broken = true; }   // 雇い主から引き抜いた、など

// ---- 情報が判明した時の一文（intelText から） ----
function rvIntelLine(r) {
  const bb = rvBB(r); if (!bb) return '';
  return rvT(`<br><span class="note">来歴：${bb.title}――${bb.story(r)}</span>`) + rvRevealLinks();
}
function rvRevealLinks() {
  const out = [];
  for (const l of rvLinks()) { const key = l.a + l.b; if (G.rvKnown[key] || l.A.intel < 1 || l.B.intel < 1) continue;
    G.rvKnown[key] = true; addLog(`敵マスター同士の因縁：${l.L.label(l.A, l.B)}（${l.A.cls}陣営と${l.B.cls}陣営）。`);
    out.push(rvT(`<br><span class="note">🔗 因縁が分かった：${l.L.reveal(l.A, l.B)}</span>`)); }
  return out.join('');
}
// ---- 陣営の画面 ----
function rvViewHTML(r) {
  const bb = rvBB(r); if (!bb || r.intel < 1) return '';
  const s = servantOf(r); const fit = bb.pref.includes(s.persona) ? 0 : 1;
  const links = rvLinks().filter(l => (l.A === r || l.B === r) && l.A.intel >= 1 && l.B.intel >= 1).map(l => { const o = l.A === r ? l.B : l.A;
    return `<p class="rv-link">🔗 ${l.L.label(l.A, l.B)}：${o.cls}陣営の${rvN(o)}${o.alive ? '' : '（脱落）'}</p>`; }).join('');
  const fall = r.rvAfter ? `<p class="rv-after">${r.rvAfter}</p>` : '';
  const sty = rvStyleOf(r); const style = sty && r.intel >= 2 ? `<p class="rv-fit">戦い方：${sty.name}（${sty.note}）</p>` : '';
  return `<div class="rv-bb"><p class="rv-title">来歴：${bb.title}</p><p>${rvT(bb.story(r))}</p>${knowsName(r) ? `<p class="rv-fit">${rvT(bb.fit[fit](r))}</p>` : ''}${style}${links}${fall ? rvT(fall) : ''}</div>`;
}
// ---- 倒れた時の最後の言葉（battleWin から） ----
function rvLoseLine(r) { const bb = rvBB(r); return bb && !r.masterDead ? `<p class="quote">「${bb.lose(r)}」</p><p>${rvN(r)}が、膝をついたまま呟いた。</p>` : ''; }
// ---- 因縁の相手が倒れた（倒した直後と、毎朝） ----
function rvCheckFalls() {
  const out = [];
  for (const l of rvLinks()) for (const side of ['A', 'B']) {
    const X = l[side], Y = side === 'A' ? l.B : l.A; const key = l.a + l.b + side;
    if (X.alive || G.rvFell[key]) continue; G.rvFell[key] = true;
    if (!Y.alive) continue;
    const t = rvT((side === 'A' ? l.L.fallA : l.L.fallB)(l.A, l.B)); if (!t) continue;
    Y.rvAfter = t; addLog(t.replace(/<[^>]+>/g, '')); out.push(`<p class="note">🔗 ${t}</p>`);
  }
  return out;
}
function rvDaily() { const t = rvCheckFalls(); if (t.length && G.news) G.news.push(...t.map(x => x.replace(/^<p class="note">|<\/p>$/g, ''))); }
// ---- 画面の外の陣営同士の戦い：因縁に沿って ----
function rvClashPair(alive) {
  const ls = rvLinks().filter(l => alive.includes(l.A) && alive.includes(l.B));
  const feud = ls.filter(l => l.L.feud);
  if (feud.length && Math.random() < 0.45) { const l = pick(feud); return shuffle([l.A, l.B]); }
  for (let k = 0; k < 6; k++) { const p = shuffle(alive).slice(0, 2); if (!ls.some(l => l.L.ally && p.includes(l.A) && p.includes(l.B))) return p; }
  return shuffle(alive).slice(0, 2);
}
// ---- 昏睡事件の犯人 ----
function rvDarkW(r) { const bb = rvBB(r); return !bb ? 1 : bb.dark ? 2.5 : 0.06; }
function rvWhyLine(r) { const bb = rvBB(r); return bb && bb.why ? rvT(`<br>${bb.why(r)}`) : ''; }

// =================================================================
//  出来事
// =================================================================
// 因縁の二人（因縁ごとに一度だけ）
for (const id of [...new Set(RV_LINKS.map(L => L.id))]) {
  EVENTS.push({ id: 'rv_link_' + id, phase: 'war', time: ['employ', 'hunt', 'chase', 'vendetta'].includes(id) ? 'night' : id === 'oldfeud' ? 'day' : 'any', once: true, weight: 3,
    cond: () => G.day >= 2 && !!rvLinks().find(l => l.id === id && l.A.alive && l.B.alive),
    title: '因縁の二人',
    text: () => { const l = G.rvTmp = rvLinks().find(x => x.id === id && x.A.alive && x.B.alive); return rvT(l.L.scene(l.A, l.B)); },
    choices: [
      { label: () => G.rvTmp.L.special.label(), hint: () => G.rvTmp.L.special.hint, cond: () => !G.rvTmp.L.special.cond || G.rvTmp.L.special.cond(),
        disabled: () => !!(G.rvTmp.L.special.disabled && G.rvTmp.L.special.disabled()),
        run: () => { const l = G.rvTmp; const r = l.L.special.run(l.A, l.B); return [].concat(r).map(rvT).concat(rvLinkKnown(l)); } },
      { label: '物陰から、最後まで見届ける', hint: '知力判定（二人の情報が分かる）', run: () => { const l = G.rvTmp; const c = chk('int', 50);
          l.A.intel = Math.max(l.A.intel, c.ok ? 2 : 1); l.B.intel = Math.max(l.B.intel, c.ok ? 2 : 1);
          return [c.text, c.ok ? `二人が去った後、それぞれの足取りを辿った。${l.A.cls}陣営と${l.B.cls}陣営の拠点が分かった。` : '二人の顔と名前だけは、しっかりと覚えた。'].concat(rvLinkKnown(l)); } },
      { label: '関わらずに、立ち去る', hint: '慎重', run: () => { tone('cautious'); const l = G.rvTmp; l.A.intel = Math.max(l.A.intel, 1); l.B.intel = Math.max(l.B.intel, 1);
          return ['他人の因縁に、首を突っ込む余裕はない。あなたは、静かにその場を離れた。'].concat(rvLinkKnown(l)); } },
    ] });
}
function rvLinkKnown(l) { const key = l.a + l.b; if (G.rvKnown[key]) return []; G.rvKnown[key] = true; addLog(`敵マスター同士の因縁：${l.L.label(l.A, l.B)}（${l.A.cls}陣営と${l.B.cls}陣営）。`); return [rvT(`<span class="note">🔗 因縁が分かった：${l.L.reveal(l.A, l.B)}</span>`)]; }

// 敵マスターの素顔（来歴ごと。一度の聖杯戦争で三人まで）
EVENTS.push({ id: 'rv_glimpse', phase: 'war', time: 'day', once: false, weight: 2,
  cond: () => (G.rvGlimpse || []).length < 3 && aliveRivals().some(r => rvBB(r) && !r.ally && !(G.rvGlimpse || []).includes(r.id)),
  title: '敵マスターの素顔',
  text: () => { const r = G.rvTmpR = pick(aliveRivals().filter(r => rvBB(r) && !r.ally && !(G.rvGlimpse || []).includes(r.id)));
    (G.rvGlimpse = G.rvGlimpse || []).push(r.id); r.intel = Math.max(r.intel, 1);
    return rvT(`昼の街で、見覚えのある顔を見つけた。${r.cls}陣営のマスター、${rvN(r)}だ。<br>${rvBB(r).glimpse(r)}`); },
  choices: [
    { label: '少しだけ、話をする', hint: '交渉判定（相手の敵意が和らぐ・来歴が分かる）', run: () => { const r = G.rvTmpR; const c = chk('cha', 50);
        if (!c.ok) return [c.text, `「……馴れ合うつもりはない」${rvN(r)}は、そう言って去っていった。`, `<span class="note">来歴：${rvBB(r).title}</span>`];
        r.aggr = Math.max(0.15, r.aggr - 0.2); tone('good'); G.rvGlimpseOk = true;
        return [c.text, `夜には敵同士だ。それでも、昼の光の下で、少しだけ言葉を交わした。`, rvT(`<span class="note">来歴：${rvBB(r).title}――${rvBB(r).story(r)}</span>`), `<span class="note">（${r.cls}陣営の敵意が和らいだ）</span>`, rvRevealLinks()].filter(Boolean); } },
    { label: '気付かれないように、後をつける', hint: '幸運判定（拠点が分かる）', run: () => { const r = G.rvTmpR; const c = chk('luk', 55);
        if (c.ok) r.intel = Math.max(r.intel, 2);
        return [c.text, c.ok ? `${rvN(r)}は、人通りの少ない道を選んで帰っていった。${r.cls}陣営の拠点を突き止めた。` : '角を曲がったところで、見失った。', rvRevealLinks()].filter(Boolean); } },
    { label: '見なかったことにする', hint: '慎重', run: () => { tone('cautious'); return '昼の街で、敵と関わるべきではない。あなたは、人混みに紛れた。'; } },
  ] });

// =================================================================
//  ルートの物語と来歴をつなぐ
// =================================================================
// 幼馴染ルート「刈り取る者」：六十年分の願いを欲しがるのは、こういう来歴のマスター
const RV_REAPER = {
  noble_root: '「六十年分の願いが、一本の木に溜まっている。……これほどの観測対象を、見逃せるものか」',
  noble_collector: '「願いを溜め込んだ桜。そして、それに繋がった娘。――どちらも、私の硝子のケースに相応しい」',
  alch_prodigy: '「六十年分の願いの魔力。人の手で聖杯を造る材料として、これ以上のものはないわ」',
  mad_revive: '「ヒヒ……六十年分の願いがあれば、あの子を呼び戻せる。聖杯なんて、待っていられない」',
  mad_cult: '「ヒヒ……この木もまた、街を聖杯に捧げるための祭具だ。完成させてやらなくちゃねえ」',
  mad_exile: '「六十年分の願いの魔力……禁術の実証には、十分すぎる量だ」',
  merc_pro: '「依頼主の注文は、聖杯の中身だ。木に溜まっているなら、木から刈り取るまでだ」',
  head_grudge: '「六十年前、祖父から聖杯を奪った戦いの残り滓が、この木に溜まっている。――ならば、それは我が家のものだ」',
};
function rvReaperPick(list) { const fit = list.filter(r => rvBB(r) && RV_REAPER[r.bb]); return fit.length ? fit : list; }
function rvReaperLine(r) { const bb = rvBB(r); return bb && RV_REAPER[r.bb] ? `<p class="quote">${RV_REAPER[r.bb]}</p><p class="note">${rvT(`${rvN(r)}――${bb.title}。`)}</p>` : ''; }
// 雫ルート「残された者たちを集める」：英霊を失ったマスターたちの言葉（型ごと）
const RV_RALLY = {
  noble: '「……英霊を失った魔術師など、ただの人間だ。だが、ただの人間にも、ここに在る権利はある」',
  head: '「この土地の者として、黙っているわけにはいかない。深見は、消させない」',
  merc: '「戦場で消えるのは慣れてる。……だが、存在ごと消されるのは、さすがに御免だ」',
  alch: '「私は、まだ何も残していない。……ここで消えるなんて、嫌」',
  mad: '「ヒヒ……世界に消される？ 冗談じゃない。……あの子の思い出まで、消させるものか」',
  exec: '「主の御業か、世界の理か。……どちらにせよ、人が在ったことまで消すのは、間違っている」',
  stu: '「あいつと過ごした十日間が、なかったことになるなんて……そんなの、絶対に嫌だ！」',
  old: '「六十年前に消えた者たちの分まで、わしはここに在ると、言ってやらねばならん」',
};
function rvRallyLines() {
  const ms = (G.rivals || []).filter(r => rvBB(r) && !r.masterDead && !r.killed && RV_RALLY[rvKey(r)]);
  return shuffle(ms).slice(0, 2).map(r => rvT(`<p>${r.cls}陣営のマスターだった${rvN(r)}――${rvBB(r).title}――も、礼拝堂に来ていた。</p><p class="quote">${RV_RALLY[rvKey(r)]}</p>`)).join('');
}
// 英霊ルート「呑まれた陣営」：助け出したマスターの言葉（型ごと）
const RV_SAVED = {
  noble: '「……借りができたな。時計塔の名にかけて、知っていることは全部話そう」',
  head: '「……この土地の者を、余所者に救われるとはな。借りは返す。知っていることを話そう」',
  merc: '「……借りは作らない主義なんだがな。情報で返す。それで貸し借りなしだ」',
  alch: '「……ありがとう。お礼に、私が調べたことを全部教えるわ」',
  mad: '「ヒヒ……助けたのか、この私を。……いいだろう。見たものを、全部話してやる」',
  exec: '「……主の導きか。恩は、情報で返そう」',
  stu: '「た、助かった……！ ありがとう！ 知ってること、全部話すから！」',
  old: '「……若いのに、借りができたわい。年寄りの知っておることを、全部話そう」',
};
function rvSavedLine(r) { const k = rvBB(r) ? rvKey(r) : null; return k && RV_SAVED[k] ? RV_SAVED[k] : '「……借りができた。知っていることは全部話す」'; }

// =================================================================
//  同盟の中身（情報の提供・共闘・裏切り／筋を通す別れ）
// =================================================================
const RV_TREACHERY = ['merc_pro', 'merc_hired', 'noble_root', 'noble_collector', 'mad_revive', 'mad_cult', 'mad_exile', 'alch_prodigy', 'head_patron'];   // 裏切りうる来歴
const RV_BETRAY = {
  noble: '「悪く思わないでくれたまえ。……敵が減れば、同盟は終わる。少し早く終わらせるだけだ」',
  head: '「家のためだ。……許せとは言わん」',
  merc: '「契約の範囲内だ。同盟は、いつ切ってもいいことになってる」',
  alch: '「……ごめんなさい。でも、私には、聖杯が必要なの」',
  mad: '「ヒヒ……同盟？ 最初から、君の英霊の魂が欲しかったんだよ」',
};
const rvAllies = () => aliveRivals().filter(r => r.ally && !r.friend && !r.lifeRival);
const RV_ALLY_TALK = {
  noble: '「時計塔の流儀では、同盟相手への情報は対価なしで渡すものではないのだが……今回は特別だ」',
  head: '「この街のことなら、うちの者が一番よく知っている。――使え」',
  merc: '「偵察は、仕事のうちだ。……代金は、次の戦いで返してもらう」',
  alch: '「使い魔に見張らせておいたの。……べ、別に、あなたのためじゃないから」',
  mad: '「ヒヒ……面白いものを見たよ。教えてあげようか？」',
  exec: '「教会の情報網に、引っかかったものがある。同盟の誼だ」',
  stu: '「あのさ、昨日、変なもの見ちゃって……。一応、伝えといた方がいいかなって」',
  old: '「年寄りは、夜が早くて朝が早い。……おかげで、いろいろ見えるものよ」',
};
EVENTS.push(
  { id: 'rv_ally_intel', phase: 'war', time: 'day', once: false, weight: 3,
    cond: () => (G.rvAllyIntel || 0) < 2 && rvAllies().length > 0 && hostileRivals().some(r => r.intel < 3),
    title: '同盟相手からの知らせ',
    text: () => { const a = G.rvTmpA = pick(rvAllies()); G.rvAllyIntel = (G.rvAllyIntel || 0) + 1; const k = rvKey(a);
      return rvT(`${a.cls}陣営の${rvN(a)}から、連絡があった。<p class="quote">${(rvBB(a) && RV_ALLY_TALK[k]) || '「同盟の誼だ。見たものを伝えておく」'}</p>`); },
    choices: [
      { label: '話を聞く', run: () => { const t = pick(hostileRivals().filter(r => r.intel < 3)); t.intel = Math.min(3, t.intel + 1);
          return [`${G.rvTmpA.cls}陣営からの情報で、${t.cls}陣営のことが分かった。`, intelText(t)]; } },
      { label: '見返りに、こちらの情報も渡す', hint: '秩序（同盟が固くなる）', run: () => { tone('law'); const a = G.rvTmpA; a.rvLoyal = (a.rvLoyal || 0) + 1;
          const t = pick(hostileRivals().filter(r => r.intel < 3)); t.intel = Math.min(3, t.intel + 1);
          return [`互いの調べたことを、包み隠さず突き合わせた。${rvT(`${rvN(a)}は、少しだけ表情を緩めた`)}。「……信用していいらしいな」`, intelText(t), '<span class="note">（同盟が固くなった）</span>']; } },
    ] },
  { id: 'rv_ally_joint', phase: 'war', time: 'night', once: true, weight: 3,
    cond: () => rvAllies().length > 0 && engageable().length > 0 && G.day >= 3,
    title: '挟み撃ちの夜',
    text: () => { const a = G.rvTmpA = pick(rvAllies()); const t = G.rvTmpT = engageable().reduce((x, y) => (x.hp / x.hpMax) <= (y.hp / y.hpMax) ? x : y);
      return rvT(`深夜、${a.cls}陣営の${rvN(a)}から使い魔が届いた。<br>「今夜、${rivalLabel(t)}陣営の拠点を挟み撃ちにする。そちらは正面から来てくれ。――こちらは、裏から回る」`); },
    choices: [
      { label: '共闘する', hint: '戦闘（敵は手負い・不意を突ける）', cls: 'danger', run: () => { const a = G.rvTmpA, t = G.rvTmpT; t.hp = Math.max(1, t.hp - 25); t.intel = Math.max(t.intel, 2); a.rvLoyal = (a.rvLoyal || 0) + 1;
          return { text: [`${a.cls}陣営の英霊が、敵の拠点の裏手から仕掛けた。慌てて振り向いた${rivalLabel(t)}の背に、${SV()}が正面から迫る。`, `<span class="note">（敵HP-25・不意を突いた）</span>`], then: () => startBattle(t, { ambush: true }) }; } },
      { label: '今夜は見送る', hint: '慎重', run: () => { tone('cautious'); return '「……そうか。なら、今夜は様子見だ」使い魔は、すぐに飛び去った。'; } },
    ] },
  { id: 'rv_ally_end', phase: 'war', time: 'any', once: true, weight: 6,
    cond: () => G.day >= 7 && hostileRivals().length <= 2 && rvAllies().some(r => rvBB(r)),
    title: '同盟の行方',
    text: () => { const a = G.rvTmpA = pick(rvAllies().filter(r => rvBB(r))); const bad = RV_TREACHERY.includes(a.bb) && !(a.rvLoyal >= 2);
      G.rvTmpBad = bad;
      return rvT(bad ? `その夜、拠点の結界が、内側から軋んだ。<br>結界の合鍵を知っているのは、同盟相手だけだ。――闇の中から、${a.cls}陣営の英霊が姿を現した。その後ろに、${rvN(a)}が立っている。<p class="quote">${RV_BETRAY[rvKey(a)] || RV_BETRAY.noble}</p>`
        : `${a.cls}陣営の${rvN(a)}が、昼の公園で、あなたを待っていた。<p class="quote">「残る敵は、もう少ない。……いずれ、私たちも戦うことになる。だから、今のうちに言っておく」</p>${rvN(a)}は、小さな包みを差し出した。「同盟の礼だ。――その時が来たら、正面から来い。こちらも、正面から行く」`); },
    choices: [
      { label: '裏切りを読んでいた。先に仕掛ける', hint: '知力判定（不意を突けば有利）', cls: 'danger', cond: () => G.rvTmpBad, run: () => { const a = G.rvTmpA; a.ally = false; a.intel = Math.max(a.intel, 2); const c = chk('int', 55); addLog(`${a.cls}陣営の${a.master}が、同盟を裏切った。`);
          return { text: [c.text, c.ok ? '結界の綻びは、わざと残しておいたものだった。裏切りの気配は、とうに読んでいた。' : '読みは、半歩遅れた。'], then: () => startBattle(a, c.ok ? { ambush: true } : { enemyFirst: true }) }; } },
      { label: '「同盟を続けよう」と説得する', hint: '交渉判定（失敗すると、そのまま戦闘）', cond: () => G.rvTmpBad, run: () => { const a = G.rvTmpA; const c = chk('cha', 62);
          if (c.ok) { a.rvLoyal = 2; return [c.text, rvT(`「……ふん。君は、思ったより使える」${rvN(a)}は、英霊を下がらせた。「いいだろう。最後の一組になるまでは、手を組んでいてやる」`)]; }
          a.ally = false; addLog(`${a.cls}陣営の${a.master}が、同盟を裏切った。`); return { text: [c.text, '言葉は、届かなかった。'], then: () => startBattle(a, { enemyFirst: true }) }; } },
      { label: '包みを受け取る', cond: () => !G.rvTmpBad, run: () => { const a = G.rvTmpA; a.rvHonor = true; item('potion', 1); a.quote = '約束通り、正面から来たな。――始めよう。';
          return [rvT(`包みの中身は、上等な霊薬だった。（霊薬+1）<br>${rvN(a)}は、それ以上何も言わずに去っていった。`), '<span class="note">同盟は、最後の一組になるまで続く。</span>']; } },
    ] },
);
// 同盟の終わり（ending.js の breakAlliance から）：来歴ごとの別れの言葉
function rvAllianceEndLine() {
  const a = aliveRivals().find(r => rvBB(r)); if (!a) return '';
  return rvT(a.rvHonor ? `<p>${rvN(a)}は、約束どおり、正面から使い魔を寄越した。「同盟は、ここまでだ。――礼は、もう済ませた。あとは、悔いのない戦いを」</p>`
    : `<p class="quote">「${rvBB(a).quote(a)}」</p><p>${rvN(a)}の声は、同盟を結んでいた頃と、まるで違って聞こえた。</p>`);
}

// =================================================================
//  来歴ごとの戦い方（battle.js から）
// =================================================================
const RV_STYLE = {
  noble: { id: 'seal', name: '令呪を惜しまない', pre: r => `${rvN(r)}の右手で、令呪が鈍く光った。名門の魔術師は、勝つためなら令呪を惜しまない。`, note: '敵は早めに令呪を使う' },
  head: { id: 'home', name: '土地の加護', pre: r => `${rvN(r)}の足元で、深見の霊脈がざわめいている。この土地に根を張る家の加護だ。`, note: '序盤の3手番、敵の力が増す' },
  merc: { id: 'gun', name: 'マスター狙い', pre: r => `${rvN(r)}が、英霊の陰から銃口を覗かせた。狙いは英霊ではない。――あなただ。`, note: '毎手番、あなたが狙い撃たれることがある' },
  alch: { id: 'guard', name: '錬金術の守り', pre: r => `${rvN(r)}の錬金術が、敵の英霊を、硝子のような薄い守りで包んでいる。`, note: '敵は守りを固めやすい' },
  mad: { id: 'frenzy', name: '狂気の魔力', pre: r => `${rvN(r)}の令呪が、不気味に脈打っている。英霊に、無茶な量の魔力を注ぎ込んでいる。`, note: '敵は宝具を使いやすく、攻めが荒い' },
  exec: { id: 'anti', name: '秘蹟の詠唱', pre: r => `${rvN(r)}が、黒鍵を構えて詠唱を始めた。魔術を打ち消す、教会の秘蹟だ。`, note: 'あなたの英霊の魔術戦が弱まる' },
  stu: { id: 'novice', name: '不慣れな指示', pre: r => `${rvN(r)}の指示は、どこかぎこちない。英霊も、主の声を待って一瞬遅れる。`, note: '敵の構えを読みやすい' },
  old: { id: 'read', name: '老練な読み', pre: r => `${rvN(r)}は、こちらの動きを、黙ってじっと観察している。六十年分の戦いの勘だ。`, note: '敵の構えを読みにくい・敵の力がわずかに増す' },
};
function rvStyleOf(r) { return rvBB(r) ? RV_STYLE[rvKey(r)] || null : null; }
function rvBattleInit(r) {
  if (!B || B.boss || B.beast || B.enforcer) return '';
  const st = rvStyleOf(r); if (!st) return '';
  B.rvStyle = st.id; if (st.id === 'seal') B.rvSealAt = 0.5; if (st.id === 'novice') B.rvSealAt = 0.2;
  return rvT(`<p>${st.pre(r)}</p><p class="note">戦い方：${st.name}（${st.note}）</p>`);
}
function rvPlanTweak(t) {
  if (!B || !B.rvStyle || t === 'np') return t;
  if (B.rvStyle === 'frenzy' && typeof npUsable === 'function' && npUsable('en') && Math.random() < 0.2) return 'np';
  if (B.rvStyle === 'guard' && B.echarge === 0 && Math.random() < 0.15) return 'guard';
  return t;
}
function rvSeeMod() { return !B || !B.rvStyle ? 0 : B.rvStyle === 'novice' ? 0.15 : B.rvStyle === 'read' ? -0.15 : 0; }
function rvMyMod(tac) { return B && B.rvStyle === 'anti' && tac === 'mag' ? -8 : 0; }
function rvEnMod() { if (!B || !B.rvStyle) return 0; if (B.rvStyle === 'home' && B.round <= 3) return 4; if (B.rvStyle === 'frenzy') return 3; if (B.rvStyle === 'read') return 2; return 0; }
function rvRoundFx(log) {
  if (!B || B.rvStyle !== 'gun' || G.master.hp <= 12 || Math.random() > 0.2) return;
  hp(-5); log.push(rvT(`<span class="note">${rvN(B.r)}の銃弾が、あなたの肩を掠めた。（HP-5）</span>`));
}

// =================================================================
//  敵マスターとの会話（出来事「因縁の二人」「敵マスターの素顔」を、言葉を交わす会話にする）
// =================================================================
// 願いを語る言葉（来歴ごと）
const RV_TALK = {
  noble_fall: '「家名など、くだらないと思うかね。……だが、父はそれを取り戻せないまま死んだ。私が取り戻さなければ、父の一生は何だったことになる」',
  noble_root: '「根源に至れば、魔術師の千年の問いに答えが出る。……君は、答えを知りたいと思ったことはないのかね」',
  noble_lecturer: '「あいつは、天才だった。私より、ずっと。……だから、止めるのは私でなければならない」',
  noble_collector: '「美しいものは、いずれ壊れる。だから私は、壊れる前に手に入れて、永遠に閉じ込めておきたいのだよ」',
  head_grudge: '「負けた家、と呼ばれ続けるのは、もう終わりにしたい。……祖父のためにも、子どもたちのためにも」',
  head_keeper: '「聖杯なんて、この街には過ぎたものだ。誰の手にも渡さず、静かに眠らせてやりたい」',
  head_young: '「当主として認められたい……いや、違うな。本当は、弟妹たちが胸を張れる家にしたいだけだ」',
  head_patron: '「才能がないことは、子どもの頃から知っていた。だから、持っているものは全部使う。それが、私のやり方だ」',
  merc_pro: '「願い？ 報酬の話なら、いくらでもできるがな。……それ以外の話は、とうの昔に忘れた」',
  merc_sister: '「妹が目を覚ましたら、真っ先に謝るつもりだ。……ずっと、そばにいてやれなかったからな」',
  merc_hired: '「自分の願いがない人間は、他人の願いのために戦うしかないんだよ。……そういう生き方も、あるだろう」',
  merc_ex: '「教会を捨てた日から、祈る相手がいない。……聖杯なら、何か答えてくれるかと思ってな」',
  alch_last: '「千年分の夢を、私一人で終わらせるわけにはいかないの。……たとえ、私が最後の一人でも」',
  alch_prodigy: '「人の手で聖杯を造れたら、誰も、願いのために殺し合わなくて済む。……そう思わない？」',
  alch_vessel: '「器になったら、私は消える。だから、消える前に、一度でいいから、自分のために何かを選んでみたかったの」',
  alch_grand: '「おばあさまが、最後に何を見たのか知りたいの。恨むためじゃない。……ちゃんと、お別れを言うために」',
  mad_revive: '「ヒヒ……おかしいだろう？ でも、あの子のいない朝が、もう三年も続いているんだ。……耐えられるわけが、ないだろう」',
  mad_cult: '「ヒヒ……この街は、完成するために造られたんだよ。私は、それを手伝っているだけさ」',
  mad_exile: '「真理に近づいた者を、時計塔は追放した。……なら、時計塔の外で、真理に辿り着いてやる」',
  exec_relic: '「聖杯は、人の手に余る。願いを叶える杯など、争いしか生まない。だから、誰にも使わせない」',
  exec_hunt: '「あの異端に、魂を喰われた人々がいる。……彼らの無念を晴らすまで、私の巡礼は終わらない」',
  exec_vendetta: '「斬りたくはない。……だが、斬らなければ、私が信じてきたものが、全部嘘になる」',
  exec_doubt: '「主が答えてくださらないのなら、せめて、願望機の沈黙を聞いてみたい。……愚かだと思うか」',
  stu_accident: '「願いなんて、まだ分からないよ。……でも、こいつと出会えたことだけは、後悔してない」',
  stu_wish: '「あいつ、走るのが大好きだったんだ。……もう一回、走ってるところを見たい。それだけ」',
  stu_brother: '「才能がないのは分かってる。でも、家族が一人で戦ってるのを、黙って見てるなんてできないだろ」',
  old_sixty: '「六十年前、わしらは何のために戦ったのか。……その答えを見届けんと、死ぬに死ねん」',
  old_heir: '「わしの魔術は、わしが死ねば消える。……せめて、誰かの記憶の中にでも、残っておってほしいのじゃ」',
  old_feud: '「わしは六十年前、一度逃げた。……二度目は、逃げずにおりたい。それが、わしの願いじゃ」',
};
// 共感した時／譲らないと告げた時の返事（型ごと）
const RV_SOFT = {
  noble: '「……君に分かられても、困るのだがね」そう言いながら、その口元は、少しだけ緩んでいた。',
  head: '「……そうか。この土地の人間に言われると、少しは救われる」',
  merc: '「……甘い奴だ。だが、嫌いじゃない」',
  alch: '「……っ、あなたに分かるわけ、ないでしょ」そう言って、目を逸らした。けれど、声は柔らかかった。',
  mad: '「ヒヒ……分かる、だって？ ……そんなこと言われたのは、三年ぶりだよ」',
  exec: '「……あなたに、主の祝福がありますように。――敵であっても」',
  stu: '「……へへ。なんか、ちょっと元気出た。ありがとう」',
  old: '「……若いのに、年寄りの話を最後まで聞くとはな。良い主に、仕えておる英霊じゃ」',
};
const RV_HARD = {
  noble: '「当然だ。譲られた聖杯に、価値などない。――次は、夜に会おう」',
  head: '「それでいい。……手加減は、しないぞ」',
  merc: '「それでいい。情けをかけられるより、ずっと話が早い」',
  alch: '「……ええ。それでこそ、倒しがいがあるわ」',
  mad: '「ヒヒ……いいねえ。その英霊の魂、きっと美味しいよ」',
  exec: '「ならば、主の御前で、正しき方が勝つまでだ」',
  stu: '「……分かってる。こっちだって、負けないから！」',
  old: '「ほっほ。それでよい。……全力で来い。年寄りも、全力で応えよう」',
};
// 因縁の二人の片方が、あなたに向ける言葉
const RV_WORD = {
  employ: (A, B) => [B, '「……今夜のことは、忘れろ。雇い主に知られたら、面倒なことになる」'],
  hunt: (A, B) => [A, '「異端を追う者として、忠告しておく。……あれに、英霊の魂を喰わせるな。喰わせれば、手がつけられなくなる」'],
  kin: (A, B) => [B, `「……${rg(A, '兄さん', '姉さん')}には、内緒にして。お願い。${rg(A, '兄さん', '姉さん')}、一人で全部背負っちゃうから」`],
  rivalry: (A, B) => [A, '「……見苦しいところを見せたな。あれは、私の兄弟弟子だ。――昔は、あんな目をする奴ではなかった」'],
  chase: (A, B) => [B, '「……私のことは、放っておいて。あなたまで、あの人に目をつけられる」'],
  oldfeud: (A, B) => [A, '「……若いの。見届けてくれて、礼を言う。わしひとりでは、あの子の目を、最後まで見られんかった」'],
  vendetta: (A, B) => [B, `「……お前、あいつの知り合いか？ なら、伝えておいてくれ。${rg(B, '俺', '私')}は、逃げも隠れもしないってな」`],
};
function rvReply(r, soft) { const t = (soft ? RV_SOFT : RV_HARD)[rvKey(r)] || ''; const m = t.match(/^(「[^」]*」)(.*)$/); return m ? `<p class="quote">${m[1]}</p>` + (m[2] ? `<p>${m[2]}</p>` : '') : `<p>${t}</p>`; }
function rvTalkChoices(r) {
  return [
    { label: '「その気持ち、分かる気がする」', run: () => { r.aggr = Math.max(0.15, r.aggr - 0.1); tone('good'); }, reply: () => [meSay('その気持ち、分かる気がする'), rvReply(r, true), `<span class="note">（${r.cls}陣営の敵意が和らいだ）</span>`] },
    { label: '「それでも、聖杯は譲らない」', run: () => tone('bold'), reply: () => [meSay('それでも、聖杯は譲らない'), rvReply(r, false)] },
  ];
}
// 因縁の二人
for (const ev of EVENTS.filter(e => /^rv_link_/.test(e.id))) {
  const id = ev.id.replace('rv_link_', '');
  ev.dialog = after => { G.used[ev.id] = true; const l = G.rvTmp = rvLinks().find(x => x.id === id && x.A.alive && x.B.alive); let left = false;
    const choices = ev.choices.filter(c => !c.cond || c.cond()).map((c, k) => ({ label: c.label, hint: c.hint, disabled: c.disabled,
      run: () => { left = c.label === '関わらずに、立ち去る'; G.rvRes = c.run(); }, reply: () => [].concat(G.rvRes || []) }));
    const word = RV_WORD[id] ? RV_WORD[id](l.A, l.B) : null;
    dialog({ title: ev.title, sub: 'EVENT', then: after, steps: [
      { text: () => [rvT(l.L.scene(l.A, l.B))], choices },
      { skip: () => left || !word || !word[0].alive, text: () => [rvT(`二人が去り際、${rvN(word[0])}が、あなたの方を振り返った。`), `<p class="quote">${rvT(word[1])}</p>`], choices: rvTalkChoices(word[0]) },
    ] }); };
}
// 敵マスターの素顔
{ const ev = EVENTS.find(e => e.id === 'rv_glimpse');
  ev.dialog = after => { G.used[ev.id] = true; const intro = ev.text(); const r = G.rvTmpR; let talked = false;
    const ch = ev.choices.map((c, k) => ({ label: c.label, hint: c.hint, run: () => { G.rvGlimpseOk = false; G.rvRes = [].concat(c.run()); talked = k === 0 && G.rvGlimpseOk; }, reply: () => G.rvRes }));
    dialog({ title: ev.title, sub: 'EVENT', then: after, steps: [
      { text: () => [intro], choices: ch },
      { skip: () => !talked || !RV_TALK[r.bb], text: () => [rvT(`${rvN(r)}は、少し迷ってから、ぽつりと言った。`), `<p class="quote">${RV_TALK[r.bb]}</p>`], choices: rvTalkChoices(r) },
    ] }); };
}
