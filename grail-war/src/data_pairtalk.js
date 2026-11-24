// =============================================================
//  data_pairtalk.js … 縁ある英霊どうしが出会った時の会話（全シナリオ共通）
//
//  自分の英霊と敵の英霊が、原作や伝承で縁のある組み合わせだった時、剣を交える前に一度だけ短く言葉を交わす。
//  ・PAIR_TALK に [英霊A, 英霊B, [[話し手, 台詞], …]] の形で書く。話し手は英霊ID か 'narr'（地の文）
//  ・どちらが自分の英霊でも成り立つように書いている（マスターへの呼びかけは使わない）
//  ・会話の後、縁ある英霊が見抜いたので、敵の真名が判明する
//  ・士郎シナリオの「再会」、藤丸・岸波シナリオの「対面」で、同じ相手と既に話した時は出さない
// =============================================================
const PAIR_TALK = [
  // ---------------- 円卓 ----------------
  ['artoria', 'mordred', [
    ['narr', '赤い雷を纏った騎士が、兜を脱ぎ捨てた。'],
    ['mordred', '……父上。こんな極東の街で、また会うなんてな'],
    ['artoria', 'モードレッド。……貴方と剣を交えるのは、二度目ですね'],
    ['mordred', '今度こそ、オレを見ろ。――そして認めろ。オレが、父上の息子だってな！'],
  ]],
  ['artoria', 'lancelot_saber', [
    ['lancelot_saber', '……我が王。このような形で、再び御前に立つことになろうとは'],
    ['artoria', 'ランスロット卿。顔を上げなさい。今は、敵同士です'],
    ['lancelot_saber', '――はい。ならば、円卓最強と呼ばれた剣で、全霊をもってお応えいたします'],
  ]],
  ['artoria', 'lancelot', [
    ['narr', '黒い霧を纏った騎士が、その姿を見た瞬間、獣のように咆哮した。'],
    ['lancelot', 'Arrrr……thurrrr……！'],
    ['artoria', '……その声。まさか、ランスロット卿……。貴方は、そこまで――'],
  ]],
  ['artoria', 'gawain', [
    ['gawain', '王よ。……陽の下で再びお目にかかれるとは、光栄の極み'],
    ['artoria', 'ガウェイン卿。貴方の忠義に、私は何度救われたことか'],
    ['gawain', 'ならば今宵は、その恩を剣で返しましょう。――太陽の騎士、手加減はいたしません'],
  ]],
  ['artoria', 'bedivere', [
    ['bedivere', '……王。お久しぶりです。この銀の腕、覚えておいでですか'],
    ['artoria', 'ベディヴィエール。……私の最期を看取ってくれた、最後の騎士'],
    ['bedivere', 'はい。――ですから今度は、王の剣を、私が受け止めてみせます'],
  ]],
  ['artoria', 'tristan', [
    ['tristan', '……私は悲しい。王に弓を引く日が来ようとは'],
    ['artoria', 'トリスタン卿。……「王は人の心が分からない」。貴方の言葉、今も覚えています'],
    ['tristan', 'あの言葉を、今は悔いております。――ですが、弦は引かねばなりません'],
  ]],
  ['artoria', 'merlin', [
    ['merlin', 'やあ、アルトリア。元気そうで何よりだ。……そんな怖い顔しないでくれよ'],
    ['artoria', 'マーリン。……貴方がそちら側にいるということは、また何か企んでいるのですね'],
    ['merlin', '人聞きが悪いなあ。ハッピーエンドのために、少しだけ遠回りをしているだけさ'],
  ]],
  ['artoria', 'artoria_alter', [
    ['narr', '月光の下、同じ顔をした二人の騎士王が向き合った。'],
    ['artoria_alter', '……ふん。理想を捨てきれぬ、甘い私か'],
    ['artoria', '黒く染まった私。……貴方の剣にも、守りたいものがあるはずです'],
    ['artoria_alter', 'あるとも。だから斬る。――来い、もう一人の私'],
  ]],
  ['mordred', 'artoria_alter', [
    ['mordred', '……父上、なのか？ なんだよ、その黒い鎧は'],
    ['artoria_alter', 'モードレッドか。相変わらず騒がしい。――剣を構えろ。話はそれからだ'],
    ['mordred', 'へっ……！ 黒かろうが白かろうが、父上は父上だ。行くぜ！'],
  ]],
  ['gawain', 'lancelot_saber', [
    ['gawain', 'ランスロット卿……！ 弟たちの仇、今ここで――'],
    ['lancelot_saber', 'ガウェイン卿。……言い訳はしない。その怒りは、正当なものだ'],
    ['gawain', '……いいえ。今は、騎士として剣を交えるのみ。私怨は、捨てましょう'],
  ]],
  ['tristan', 'lancelot_saber', [
    ['tristan', 'ランスロット卿。……私は悲しい。円卓の友と、また刃を交えるとは'],
    ['lancelot_saber', 'トリスタン卿。君の弓は、相変わらず悲しい音がするな'],
  ]],
  ['bedivere', 'gawain', [
    ['bedivere', 'ガウェイン卿……。陽が高いうちは、勝ち目がありませんね'],
    ['gawain', 'ははは！ では、夜まで待ちますか、ベディヴィエール卿？ ――冗談です。いざ！'],
  ]],
  ['lancelot_saber', 'lancelot', [
    ['narr', '理性を保った湖の騎士と、狂気に堕ちた湖の騎士。同じ顔の二人が向き合った。'],
    ['lancelot_saber', '……それが、王を裏切った罪に呑まれた私の姿か'],
    ['lancelot', 'A……rrr……'],
    ['lancelot_saber', 'ならば、せめて私の手で、終わらせよう'],
  ]],
  // ---------------- 第五次・第四次 ----------------
  ['artoria', 'emiya', [
    ['emiya', '……セイバー。君とこうして向き合うのは、随分と久しぶりだ'],
    ['artoria', 'アーチャー。……なぜでしょう。貴方の剣筋を、私はよく知っている気がします'],
    ['emiya', '気のせいだろう。――さあ、構えたまえ'],
  ]],
  ['artoria', 'gilgamesh', [
    ['gilgamesh', 'ほう、セイバーか。相変わらず、手に入れ甲斐のある女よ'],
    ['artoria', '……英雄王。貴方の戯言に付き合う気はありません'],
    ['gilgamesh', 'フハハ！ その強情さこそ、我が愛でるに値する！'],
  ]],
  ['artoria', 'iskandar', [
    ['iskandar', 'おう、騎士王！ あの夜の問答の続き、まだ答えを聞いておらんぞ！'],
    ['artoria', '征服王。……王とは、民のために己を捧げる者。その答えは、変わりません'],
    ['iskandar', 'わはは！ ならば、剣で語り合おうではないか！'],
  ]],
  ['artoria', 'diarmuid', [
    ['diarmuid', '騎士王よ。あの時の決着、まだついてはおりませぬ'],
    ['artoria', 'ディルムッド。……今度こそ、騎士として、正々堂々と'],
  ]],
  ['iskandar', 'gilgamesh', [
    ['iskandar', '金ピカ！ 貴様もこの街の聖杯を狙っておったか！'],
    ['gilgamesh', '征服王か。……貴様の軍勢、今度は最後まで見届けてやろう'],
    ['iskandar', '言うではないか！ ならば受けよ、我が王の軍勢を！'],
  ]],
  ['iskandar', 'zhuge', [
    ['zhuge', '……っ！ その、大きな背中は……'],
    ['iskandar', 'おお？ 坊主、お前、ずいぶんと背が伸びたではないか！'],
    ['zhuge', '……坊主はやめろ。――いや。やめないでくれ。……行くぞ、征服王'],
  ]],
  ['iskandar', 'darius', [
    ['narr', '巨大な王が、征服王の姿を見た瞬間、大地を揺るがす咆哮を上げた。'],
    ['iskandar', 'ダレイオス王か！ ……狂気に堕ちてなお、余を追うか。面白い！'],
    ['narr', 'ダレイオスの背後に、不死の軍勢が立ち並んだ。'],
  ]],
  ['emiya', 'cuchulainn', [
    ['cuchulainn', 'よう、弓兵。相変わらず辛気臭え面してやがるな'],
    ['emiya', 'ランサー。……君のその軽口も、相変わらずだな'],
    ['cuchulainn', 'へっ、上等だ。今度こそ、白黒つけようぜ'],
  ]],
  ['emiya', 'gilgamesh', [
    ['gilgamesh', '贋作者か。王の前に、紛い物の剣を晒すとは不敬であろう'],
    ['emiya', '……紛い物でも、届く刃はある。それを証明しよう、英雄王'],
  ]],
  ['cuchulainn', 'gilgamesh', [
    ['cuchulainn', 'うげ、金ピカかよ。……アンタとは、相性が悪いんだよな'],
    ['gilgamesh', '狗か。吠える元気があるなら、少しは王を楽しませてみせよ'],
  ]],
  ['medea', 'kojiro', [
    ['medea', '……あら。山門の門番が、どうしてこんな所にいるのかしら'],
    ['kojiro', 'これは、女狐殿。……いや、今宵は互いに、別の主に仕える身。遠慮は無用であろう'],
  ]],
  ['medea', 'heracles', [
    ['narr', '巨人が、魔女の姿を見て、低く唸った。'],
    ['medea', '……ヘラクレス。アルゴー船の大英雄が相手だなんて、ついていないわね'],
    ['narr', 'ヘラクレスは、斧剣を静かに構えた。'],
  ]],
  ['medea', 'medea_lily', [
    ['medea_lily', 'あ……あなたは、未来の、わたし……？'],
    ['medea', '……やめてちょうだい。その純真な目で、私を見ないで'],
    ['medea_lily', 'だ、大丈夫です！ わたし、あなたも治してみせますから！'],
  ]],
  ['heracles', 'gilgamesh', [
    ['gilgamesh', 'ほう、ヘラクレスか。十二の命、一つ残らず奪ってやろう'],
    ['narr', '巨人の咆哮が、夜を震わせた。――あの冬の再戦が、始まる。'],
  ]],
  ['heracles', 'chiron', [
    ['chiron', '……ヘラクレス。狂化していても、その構えは私が教えたものですね'],
    ['narr', 'ヘラクレスの動きが、一瞬だけ止まった。巨人の目に、師を慕う光がよぎる。'],
    ['chiron', '良い生徒でした。――さあ、師に成長を見せてください'],
  ]],
  // ---------------- ケルト ----------------
  ['cuchulainn', 'scathach', [
    ['scathach', 'セタンタ。少しは腕を上げたか？'],
    ['cuchulainn', 'げっ、師匠……！ よりによって、アンタが相手かよ'],
    ['scathach', '逃げるなよ。――稽古の続きだ'],
  ]],
  ['cuchulainn', 'cu_caster', [
    ['cu_caster', 'よう、槍のオレ。……杖じゃ締まらねえのは分かってるよ'],
    ['cuchulainn', '自分と殴り合うってのは、妙な気分だな。――ま、手加減はしねえぜ'],
  ]],
  ['scathach', 'cu_caster', [
    ['scathach', 'セタンタ。なぜ槍を持っていない。……ルーンなど教えた覚えはあるが'],
    ['cu_caster', 'し、師匠……！ いや、これは、クラスの都合っつーか……'],
  ]],
  ['cuchulainn', 'fergus', [
    ['fergus', 'おう、セタンタ！ 大きくなったな！'],
    ['cuchulainn', '叔父貴……！ ……あの時の約束、覚えてるか？ 次は、オレが道を譲る番だったな'],
    ['fergus', 'がはは！ 今日は譲り合いはなしだ！ 思いっきり来い！'],
  ]],
  ['cuchulainn', 'medb', [
    ['medb', 'クー・フーリン！ やっと会えたわね！ 今度こそ、あなたを私のものにしてあげる！'],
    ['cuchulainn', 'うげ……メイヴ。アンタだけは、本当に勘弁してくれ……'],
  ]],
  ['cu_caster', 'medb', [
    ['medb', 'あら、杖を持ったクー・フーリンも素敵！'],
    ['cu_caster', '……どの姿でも、追いかけてくるのかよ'],
  ]],
  ['fergus', 'medb', [
    ['medb', 'フェルグス！ ……あなた、また私を裏切る気？'],
    ['fergus', 'がはは！ いい女は、敵に回しても楽しいもんだ！'],
  ]],
  ['scathach', 'skadi', [
    ['skadi', '……そなたが、影の国の女王か。我が名を分かつ者よ'],
    ['scathach', 'スカディ……。北の女神と私が、ここで相見えるとはな'],
  ]],
  ['diarmuid', 'finn', [
    ['finn', 'ディルムッド！ ……ああ、いや、その。久しぶりだな、我が騎士よ'],
    ['diarmuid', '……我が主、フィン。あなたと再び相見えるとは'],
    ['finn', '……今度は、水を零さない。――いや、今は戦いだ。行くぞ'],
  ]],
  // ---------------- ギリシャ ----------------
  ['achilles', 'hector', [
    ['hector', 'うわ、アキレウスかよ……。おじさん、あんたとだけは二度とやりたくなかったんだけどな'],
    ['achilles', 'ヘクトール。トロイアの城壁ごと、また突破してやるよ'],
    ['hector', 'はいはい。――じゃ、おじさんも本気出しますか'],
  ]],
  ['achilles', 'penthesilea', [
    ['penthesilea', 'アキレウス……！ 貴様だけは、決して許さぬ'],
    ['achilles', '……ペンテシレイア。あの時のことは――'],
    ['penthesilea', '言うな！ 二度と、私を「美しい」などと言うな！ 戦士として、私と戦え！'],
  ]],
  ['achilles', 'chiron', [
    ['chiron', 'アキレウス。……ちゃんと、教えたことを守っていますか？'],
    ['achilles', '先生！？ ……ま、待ってくれ、先生が相手なんて聞いてねえ！'],
    ['chiron', 'では、補習の時間です。パンクラチオンの基本から、おさらいしましょう'],
  ]],
  ['achilles', 'atalante', [
    ['atalante', 'アキレウスか。……汝の足の速さ、今度こそ私が上回ってみせよう'],
    ['achilles', 'へっ、望むところだ。俊足の狩人と、駿足の英雄。どっちが速いか、決着つけようぜ'],
  ]],
  ['medusa', 'euryale', [
    ['euryale', 'あら、駄妹。こんな所で何をしているのかしら'],
    ['medusa', '……上姉様。どうか、お手柔らかに……'],
    ['euryale', 'ふふ、だめよ。姉に逆らう妹には、お仕置きが必要でしょう？'],
  ]],
  ['medusa', 'gorgon', [
    ['narr', '長い髪の騎兵と、蛇の髪の怪物。同じ魂の、二つの姿が向き合った。'],
    ['gorgon', '……私の、怪物になる前の姿か'],
    ['medusa', 'あなたは……私の、行き着く先'],
    ['gorgon', 'ならば教えてやろう。姉様たちを守るために、何を捨てたのかを'],
  ]],
  ['euryale', 'gorgon', [
    ['euryale', '……メドゥーサ。ずいぶん、大きくなってしまったのね'],
    ['gorgon', '姉様……。下がってください。私は、もう、姉様を傷つけたくない'],
  ]],
  ['euryale', 'heracles', [
    ['euryale', 'あら、ヘラクレス。……また、私を追いかけ回すつもり？ 本当に、しつこい男ね'],
    ['narr', 'ヘラクレスが、女神を前に低く唸った。……どこかで見た光景だ。'],
  ]],
  // ---------------- 聖女と救国 ----------------
  ['jeanne', 'jalter', [
    ['jalter', '……ジャンヌ・ダルク。その澄ました顔、今日こそ燃やしてあげる'],
    ['jeanne', 'あなたも、私です。……憎しみも、怒りも、全部'],
    ['jalter', '違うって言ってるでしょ！ ――ああもう、いいわ。焼き尽くしてやる！'],
  ]],
  ['jeanne', 'gilles', [
    ['gilles', 'おお……おおお……！ ジャンヌ！ 我が聖女よ！'],
    ['jeanne', 'ジル……。あなたは、そこまで堕ちてしまったのですね'],
    ['gilles', 'すべては、あなたを火刑に処した神への報復のため！'],
  ]],
  ['jalter', 'gilles', [
    ['gilles', 'おお、竜の魔女よ！ 我が復讐の聖女よ！'],
    ['jalter', '……ジル。アンタだけは、私の味方だと思ってたんだけど？'],
  ]],
  ['jeanne', 'amakusa', [
    ['amakusa', 'ルーラーが二人、ですか。……聖杯戦争の調停者が争うとは、皮肉なものですね'],
    ['jeanne', '天草四郎時貞。あなたの「救済」は、人の意志を奪うものです'],
    ['amakusa', 'それでも、私は全ての人を救いたい。――譲れませんね、お互いに'],
  ]],
  ['marie', 'deon', [
    ['deon', '王妃様……！ まさか、王妃様と剣を交えることになるなんて'],
    ['marie', 'デオン！ ふふ、手加減は要らないわ。――ヴィヴ・ラ・フランス！'],
  ]],
  ['marie', 'mozart', [
    ['mozart', 'マリア！ 覚えてる？ 小さい頃、僕、君に結婚を申し込んだんだよ！'],
    ['marie', 'もちろん覚えているわ、アマデウス。……ふふ、あの時の答えは、今も同じよ'],
  ]],
  ['mozart', 'salieri', [
    ['narr', '灰色の男が、天才の姿を見た瞬間、その身を震わせた。'],
    ['salieri', 'アマデウス……アマデウス……！'],
    ['mozart', 'サリエリ先生。……僕は知ってますよ。先生が、僕を殺してなんかいないって'],
  ]],
  // ---------------- インド ----------------
  ['karna', 'arjuna', [
    ['arjuna', 'カルナ……！ ここで会ったが、運命というものか'],
    ['karna', 'アルジュナ。……お前と決着をつけられるなら、どこでもいい'],
    ['arjuna', '今度こそ、恥じることのない勝負を。――いざ！'],
  ]],
  ['karna', 'siegfried', [
    ['siegfried', '……施しの英雄。君と剣を交えるのは、これで二度目だな'],
    ['karna', '竜殺しか。……あの時の戦いは、良いものだった'],
  ]],
  ['ishtar', 'parvati', [
    ['ishtar', 'げっ、パールヴァティー！ ……その顔、やめてくれない？ 妹そっくりなんだけど'],
    ['parvati', 'イシュタルさん……。その顔も、姉さんそっくりです'],
  ]],
  ['ishtar', 'gilgamesh', [
    ['ishtar', 'ギルガメッシュ……！ あんたの顔を見ると、天の牡牛の恨みが蘇るわ！'],
    ['gilgamesh', 'イシュタルか。相変わらず、女神としての品位に欠ける女よ'],
  ]],
  // ---------------- 日本 ----------------
  ['okita', 'hijikata', [
    ['okita', 'ひ、土方さん！？ なんでここに……！'],
    ['hijikata', '総司か。……ちょうどいい。新選組は、まだ終わっちゃいねえ'],
    ['okita', 'うう……鬼の副長が相手なんて、聞いてませんよ！'],
  ]],
  ['okita', 'saito', [
    ['saito', 'あれ、沖田ちゃんじゃない。こんな所で何してんの'],
    ['okita', '斎藤さん！ ……手加減してくださいね？ 病弱なんですから'],
    ['saito', 'それ、こっちの台詞だよ。沖田ちゃんの三段突き、本気で怖いんだから'],
  ]],
  ['hijikata', 'saito', [
    ['hijikata', '斎藤。……てめえ、また寝てやがったな'],
    ['saito', 'うわ、土方さん。……やだなあ、ちゃんと起きてますって'],
  ]],
  ['okita', 'okita_alter', [
    ['okita_alter', '……沖田総司。わたしの、元になった人'],
    ['okita', 'うわ、わたしがもう一人……！ しかも、なんか背が高い……！'],
    ['okita_alter', '……団子、好き？ わたしも。――でも、斬る'],
  ]],
  ['okita', 'nobunaga', [
    ['nobunaga', '沖田ではないか！ わはは、是非もなし！ ここで決着をつけるかのう！'],
    ['okita', 'ノッブ！ ……今日こそ、沖田さんが勝ちますからね！'],
  ]],
  ['musashi', 'kojiro', [
    ['kojiro', '新免武蔵殿か。……巌流島の続き、ここで果たすとしよう'],
    ['musashi', '佐々木小次郎……！ 今度は、遅刻しないで来たわよ！'],
    ['kojiro', 'はっはっは。それは重畳。――では、燕返しを、受けてみられよ'],
  ]],
  ['musashi', 'munenori', [
    ['munenori', '宮本武蔵。……その剣、柳生の剣とどちらが上か、確かめさせてもらおう'],
    ['musashi', '柳生但馬守！ ……うわあ、ものすごく強そう。でも、負けないから！'],
  ]],
  ['raikou', 'kintoki', [
    ['raikou', '金時……！ どうして母に刃を向けるのですか！？'],
    ['kintoki', 'た、大将……！ いや、違うんだ、これはマスターの命令で……！ ちくしょう、ゴールデンにやりづれえ！'],
  ]],
  ['raikou', 'tsuna', [
    ['tsuna', '……頼光様。お手合わせを'],
    ['raikou', '綱。……母に剣を向けるとは、成長しましたね。――お仕置きです'],
  ]],
  ['raikou', 'shuten', [
    ['shuten', 'あら、頼光はん。また、うちの首を取りに来はったん？'],
    ['raikou', '酒呑童子……！ 鬼は、母が斬ります'],
  ]],
  ['raikou', 'ibaraki', [
    ['ibaraki', 'ら、頼光……！ 吾は、汝なんぞ怖くないぞ！'],
    ['raikou', '茨木童子。……逃げても、母は追いかけますよ'],
  ]],
  ['kintoki', 'shuten', [
    ['shuten', '金時はん、久しぶりやねえ。……うちのこと、まだ覚えてはる？'],
    ['kintoki', '酒呑……！ お前とは、ゴールデンに決着つけなきゃならねえ'],
  ]],
  ['kintoki', 'ibaraki', [
    ['ibaraki', '坂田金時！ 汝の、その金ピカの鉞、へし折ってくれる！'],
    ['kintoki', 'おう、茨木か！ 元気そうで何よりだぜ！'],
  ]],
  ['tsuna', 'ibaraki', [
    ['ibaraki', '渡辺綱……！ 吾の腕を斬った侍……！'],
    ['tsuna', '……茨木童子。腕は、返さない'],
    ['ibaraki', 'ぐぬぬ……！ ならば、力ずくで取り返す！'],
  ]],
  ['shuten', 'ibaraki', [
    ['ibaraki', 'しゅ、酒呑！？ な、なぜ汝が敵なのだ……！'],
    ['shuten', 'ふふ、茨木。……たまには、本気で遊んであげよか'],
  ]],
  ['ryoma', 'izo', [
    ['izo', '龍馬……！ おまんとは、こがな所で会いとうなかった'],
    ['ryoma', '以蔵さん。……僕は、ずっと、以蔵さんのこと友達だと思ってたよ'],
    ['izo', '……そういうところが、昔から気に食わんのじゃ。――行くぞ'],
  ]],
  ['tamamo', 'tamamo_cat', [
    ['tamamo_cat', 'おお、本体だワン！ キャットは、尻尾の一本なのだ！'],
    ['tamamo', 'げっ、キャット……！ わたくしの尻尾が、どうしてそっちに……'],
  ]],
  ['kagetora', 'nobunaga', [
    ['kagetora', '織田殿ですね！ 正々堂々、戦いましょう！'],
    ['nobunaga', '上杉謙信……長尾景虎か。うわ、一番やりにくい相手じゃな……'],
  ]],
  ['kotaro', 'danzo', [
    ['danzo', '……小太郎殿。大きくなられましたね'],
    ['kotaro', '段蔵殿……！ そんな、段蔵殿と戦うなんて……'],
    ['danzo', '主の命です。――ですが、手加減はいたしませぬ。それが、段蔵の教えでした'],
  ]],
  // ---------------- 月の聖杯戦争・ローマ ----------------
  ['nero', 'tamamo', [
    ['nero', '狐か！ 月でも地上でも、余の邪魔ばかりするのう！'],
    ['tamamo', 'こちらの台詞です、赤セイバー！ 今日こそ、どちらが上か決着をつけましょう！'],
  ]],
  ['nero', 'elizabeth', [
    ['elizabeth', '赤セイバー！ アイドルの座は、アタシのものよ！'],
    ['nero', 'ほう、竜の娘か！ 歌の勝負なら、余が負けるはずがない！'],
  ]],
  ['nero', 'caligula', [
    ['caligula', 'ネ……ロ……！'],
    ['nero', '叔父上……！ 狂気に呑まれてなお、余を、覚えておいでか……'],
  ]],
  ['nero', 'romulus', [
    ['romulus', 'ネロよ。我が愛し子よ。――ローマである'],
    ['nero', 'ロ、ロムルス様……！ 建国の祖に剣を向けるなど……余は、余は……！'],
  ]],
  ['nero', 'boudica', [
    ['boudica', 'ローマ皇帝……！ あなたのことは、許せない。ブリタニアの怒り、思い知らせてあげる'],
    ['nero', 'ブーディカ……。そなたの怒りは、余が受け止めよう。皇帝として'],
  ]],
  ['boudica', 'caligula', [
    ['boudica', 'ローマ……！ あなたも、ローマの皇帝なんだね'],
    ['narr', 'カリギュラが、月を見上げて唸った。勝利の女王の怒りが、炎のように燃え上がる。'],
  ]],
  ['spartacus', 'nero', [
    ['spartacus', 'おお、圧制者よ！ ローマの皇帝よ！ 我が反逆を受けよ！'],
    ['nero', 'むう、反逆の剣闘士か！ 余は、民を愛する皇帝だぞ！'],
  ]],
  ['spartacus', 'romulus', [
    ['spartacus', 'ローマの建国者！ すなわち、最大の圧制者！'],
    ['romulus', '……それもまた、ローマである'],
  ]],
  ['meltryllis', 'passionlip', [
    ['passionlip', 'メ、メルト……！ どうして、メルトが……'],
    ['meltryllis', '……リップ。泣かないで。――本気で来なさい。手加減したら、許さないわ'],
  ]],
  ['meltryllis', 'bb', [
    ['bb', 'あら、メルト。お母さんに逆らうなんて、悪い子ですね♪'],
    ['meltryllis', 'BB……。あなたの悪趣味な遊びには、もう付き合わないわ'],
  ]],
  ['passionlip', 'bb', [
    ['bb', 'リップ。……ちゃんと、ご飯食べてますか？'],
    ['passionlip', 'BB……。お母さんみたいなこと、言わないでください……'],
  ]],
  // ---------------- その他 ----------------
  ['vlad_lancer', 'vlad_berserker', [
    ['vlad_lancer', '……それが、吸血鬼の伝説に呑まれた余の姿か'],
    ['vlad_berserker', '護国の鬼よ。貴様もまた、余だ。……血を寄越せ'],
    ['vlad_lancer', '断る。――余は、王として貴様を討つ'],
  ]],
  ['elizabeth', 'carmilla', [
    ['carmilla', '……エリザベート。その無邪気な顔、本当に腹が立つわ'],
    ['elizabeth', 'げっ、未来のアタシ……！ アタシ、絶対にあんな風にはならないんだから！'],
  ]],
  ['hassan', 'serenity', [
    ['serenity', '……呪腕様。わたしは、あなたとは戦いたくありません'],
    ['hassan', '静謐よ。……我らは、主の命に従うのみ。許せ'],
  ]],
  ['hassan', 'hundred', [
    ['hundred', '呪腕の。……歴代の翁同士で、殺し合うことになるとはな'],
    ['hassan', '百貌の。……互いに、名を刻むための戦いだ。恨みは無しとしよう'],
  ]],
  ['serenity', 'hundred', [
    ['hundred', '静謐か。……毒の娘よ、我らの分身には触れるなよ'],
    ['serenity', '……はい。触れずに、倒します'],
  ]],
  ['tesla', 'blavatsky', [
    ['blavatsky', 'あら、テスラ！ エジソンは一緒じゃないの？'],
    ['tesla', 'あの凡骨の名を出すな、ブラヴァツキー女史！ ……今日は、私一人で十分だ'],
  ]],
  ['drake', 'teach', [
    ['teach', 'デュフフ！ ドレイク氏！ 今日こそ拙者が、世界一の海賊の座をいただきますぞ！'],
    ['drake', 'アッハッハ！ 黒髭か！ あんたに負けるほど、アタシは落ちぶれちゃいないよ！'],
  ]],
  ['astolfo', 'charlemagne', [
    ['astolfo', 'あっ、王様！ 久しぶりー！'],
    ['charlemagne', 'アストルフォ！ ……お前、敵でもそのノリなのかよ！ いいぜ、カッコよく相手してやる！'],
  ]],
  ['andersen', 'shakespeare', [
    ['shakespeare', 'おお、アンデルセン殿！ 劇作家と童話作家、筆の勝負と参りましょうか！'],
    ['andersen', '黙れ、シェイクスピア。お前の芝居がかった台詞は、聞いているだけで疲れる'],
  ]],
];

// 二騎の組から会話を引く（順番は問わない）
const PAIR_TALK_MAP = {};
for (const [a, b, lines] of PAIR_TALK) { PAIR_TALK_MAP[a + '|' + b] = lines; PAIR_TALK_MAP[b + '|' + a] = lines; }
function pairTalkFor(r) {
  if (!r || !G.servant || r.pairTalked || r.servantId === 'ori') return null;
  const mine = G.servant.id;
  const lines = PAIR_TALK_MAP[mine + '|' + r.servantId];
  if (!lines) return null;
  if (isShirou() && typeof FIFTH_TALK !== 'undefined' && FIFTH_TALK[r.servantId]) return null;   // 士郎の「再会」で話している
  if (r.encTalked && typeof ENC_TALK !== 'undefined') {   // 藤丸・岸波の「対面」で、自分の英霊が既に口を挟んでいる
    const enc = (ENC_TALK[isFuji() ? 'fuji' : 'kishi'] || {})[r.servantId] || [];
    if (enc.some(([sp, t]) => sp === 'mine' && t && typeof t === 'object' && t[mine])) return null;
  }
  return lines;
}
function pairTalkScene(r, then) {
  r.pairTalked = true;
  const mine = G.servant.id, sv = servantOf(r);
  const body = PAIR_TALK_MAP[mine + '|' + r.servantId].map(([sp, t]) => {
    if (sp === 'narr') return `<p>${t}</p>`;
    const isMine = sp === mine;
    return `<p class="talk ${isMine ? 'saber' : 'enemy'}"><b>${isMine ? SV() : sv.short}</b>「${t}」</p>`;
  });
  if (!knowsName(r) && !isKishi()) {
    r.named = true;
    body.push(`<p class="note">${SV()}は、相手の正体を一目で見抜いていた。――敵${r.cls}の真名は<b>${sv.name}</b>。</p>`);
    addLog(`${SV()}が、縁ある英霊「${sv.name}」と対面。真名が判明した。`);
  } else addLog(`${SV()}が、縁ある英霊「${sv.name}」と対面した。`);
  scene({ title: '縁ある者', sub: `${rivalLabel(r)}・${r.cls}`, reveal: true, body,
    choices: [{ label: '戦いを始める', cls: 'primary', icon: 'battle', fn: then }] });
}

// 自分の英霊と縁のある英霊（敵陣営に、1騎だけ現れやすくする）
function pairRelatedIds(id) { return PAIR_TALK.filter(p => p[0] === id || p[1] === id).map(p => p[0] === id ? p[1] : p[0]); }
function biasRivalsByBond() {
  if (!G.servant || isShirou() || Math.random() >= 0.6) return;
  const used = new Set(G.rivals.map(r => r.servantId));
  const cands = shuffle(pairRelatedIds(G.servant.id).map(id => SV_BY_ID[id]).filter(s => s && !s.chaldea && !used.has(s.id)
    && !(isKishi() && kishiLineup().includes(s.id))));
  for (const s of cands) {
    const r = G.rivals.find(x => x.cls === s.cls);
    if (!r) continue;
    r.servantId = s.id; r.hpMax = r.hp = 70 + rankValue(s.p[1]);
    return;
  }
}

// ---- はぐれサーヴァントとの出会い ----
//  同じクラス・エクストラクラスなど、敵の陣営としては現れない縁ある英霊は、
//  主を失って消えかけた「はぐれサーヴァント」として、夜の街で一度だけ出会う
function pairCanBeRival(mineId, enemyId) {
  const a = SV_BY_ID[mineId], e = SV_BY_ID[enemyId];
  return !!a && !!e && BASE_CLASSES.includes(e.cls) && e.cls !== a.cls && !e.chaldea;
}
function strayPartner() {
  if (!G.servant || isShirou()) return null;
  const inWar = id => (G.rivals || []).some(r => r.servantId === id);   // 敵の陣営にいる相手とは、戦場で出会う
  if (G.flags.strayPair !== undefined) return G.flags.strayPair && !inWar(G.flags.strayPair) ? G.flags.strayPair : null;
  const mine = G.servant.id;
  const cands = pairRelatedIds(mine).filter(id => SV_BY_ID[id] && !pairCanBeRival(mine, id) && !inWar(id) && (!SV_BY_ID[id].chaldea || isFuji()));
  return (G.flags.strayPair = cands.length ? pick(cands) : null);
}
function strayLines() {
  const mine = G.servant.id, other = strayPartner(), sv = SV_BY_ID[other];
  return PAIR_TALK_MAP[mine + '|' + other].map(([sp, t]) => {
    if (sp === 'narr') return `<p>${t}</p>`;
    const isMine = sp === mine;
    return `<p class="talk ${isMine ? 'saber' : 'enemy'}"><b>${isMine ? SV() : sv.short}</b>「${t}」</p>`;
  }).join('');
}
EVENTS.push({
  id: 'pair_stray', phase: 'war', time: 'night', once: true, weight: 4,
  cond: () => G.day >= 2 && !!strayPartner(),
  title: 'はぐれサーヴァント',
  text: () => { const sv = SV_BY_ID[strayPartner()];
    G.flags.strayMet = true; addLog(`はぐれサーヴァント「${sv.name}」と出会った。`);
    return `夜の見回りの途中、路地の奥に、半ば透き通った人影が立っていた。主を失い、消えかけている<b>はぐれサーヴァント</b>――${sv.name}だ。<br>${SV()}が、息を呑んで足を止めた。` + strayLines(); },
  choices: [
    { label: '一合だけ、刃を交えさせる', hint: '絆↑↑・精神↑', run: () => { const sv = SV_BY_ID[strayPartner()];
        return [`二騎の刃が、一度だけ、夜の中で交わった。勝ち負けのない、ただ一合。<br>${sv.short}は満足そうに目を閉じ、光の粒になって、冬の空へ消えていった。${SV()}は、その光が見えなくなるまで、黙って見送っていた。`, rboost({ bond: 7, spi: 4 })]; } },
    { label: '魔力を分けて、見送る', hint: '交渉・幸運↑・絆↑', run: () => { const sv = SV_BY_ID[strayPartner()]; mp(-10);
        return [`あなたが分けた魔力で、${sv.short}の輪郭が、少しだけはっきりした。<br>短い礼の言葉を残して、${sv.short}は夜の街へ去っていった。消えるまでの、ほんのわずかな時間を、自由に歩くために。（${SV()}の魔力-10）`, rboost({ bond: 5, cha: 4, luk: 4 })]; } },
  ],
});
