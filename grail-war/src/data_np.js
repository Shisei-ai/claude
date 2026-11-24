// =============================================================
//  data_np.js … 宝具の性能（種類・消費魔力・効果）
//
//  宝具ごとに「どんな宝具か」が違う。
//   ・攻撃宝具（対人／対軍／対城／対界）：敵に大ダメージを与える。範囲が大きいほど威力が高い
//       対人 … 一人を狙う。命中しやすいが、威力はほどほど
//       対軍 … 多数を薙ぎ払う。威力と命中の釣り合いが良い
//       対城 … 城をも砕く。威力が大きい
//       対界 … 世界を裂く。最大の威力
//   ・攻撃しない宝具：効果を出したうえで、その手番は宝具の力を纏ったまま最も得意な戦い方（白兵・機動・魔術）で攻める（判定+15・ダメージ+8）
//       支援 … 自分を強化・回復する
//       弱体 … 敵を弱らせる・動きを封じる
//       結界 … 自分に有利な場を作る（強化と弱体の両方）
//       守護 … 守りを固める・攻撃を防ぐ。この宝具だけは、使った手番は守りの構えになる（防御と同じ扱い。判定には宝具の値を使う）
//   ・消費魔力は宝具ごとに違う。軽い宝具は何度も撃てるが効果はそれなり、重い宝具は強力
//     攻撃宝具は、消費魔力が多いほど威力も上がる
//
//  書式：id: '種類|消費魔力|効果|説明'
//   効果は空白区切り。「名前=値:手番」。手番を省くと、攻撃宝具は3手番、攻撃しない宝具は（次の手番から）4手番。先頭に @ が付いたものは「命中したときだけ」働く
//    atk=v   すべての攻撃+v          def=v   受けるダメージ-v       crit=v  会心率+v%
//    debuff=v 敵の判定-v              expose=v 敵が受けるダメージ+v  dot=v   毎手番、敵にvダメージ
//    regen=v 毎手番、HP+v             heal=v  HP+v                   charge=v 使ったあと魔力+v
//    drain=v 敵の魔力-v（宝具封じ）   stun=p  p%で敵の次の手番を封じる
//    evade=n 次のn回の攻撃を無効      guts=n  n回まで、HP0から踏みとどまる
//    dispel  敵の強化をすべて消す     cleanse 自分にかかった弱体をすべて消す
//    pierce  防御を貫く               sure    必中（回避を無視し、判定+6）
//    death=p p%で急所を穿ち、敵の最大HPの3割の追加ダメージ（幸運で抵抗）
//    rage=v  減ったHPの割合に応じて威力+最大v
//    self=v  使うと自分のHPがv減る    reveal  敵の真名を見抜く       once 1回の戦闘で1度だけ
//   敵の対魔力（・領域外の生命）は、弱体・行動封じ・宝具封じをランク×3%の確率で軽減する
// =============================================================

const NP_DATA = {
  // ---------------- セイバー ----------------
  artoria:        '対城|65||星の光を束ねた聖剣。小細工のない、最大級の光の斬撃',
  nero:           '結界|50|atk=15 debuff=15|黄金の劇場を築き上げる。そこでは皇帝が主役で、敵は観客にすぎない',
  siegfried:      '対軍|50|pierce|竜殺しの大剣。黄昏の剣気が、守りごと敵を断つ',
  mordred:        '対軍|55|atk=6:2|父への憎悪を載せた赤雷。放ったあとも勢いは衰えない',
  okita:          '支援|30|atk=18 crit=25|浅葱の羽織を纏い、新選組の一番隊組長として剣を冴え渡らせる',
  musashi:        '対人|55|pierce @dispel|天眼が捉えた「斬るべきもの」だけを、仏の一刀で断つ',
  gawain:         '対城|55|@dot=5|太陽の熱を宿した聖剣。焼かれた傷はしばらく燻り続ける',
  deon:           '弱体|35|stun=70 debuff=9:2|白百合の幻惑。見る者は、剣を向けることさえ忘れてしまう',
  rama:           '対人|55|sure @expose=5|魔を穿つ不滅の刃。投げ放てば、必ず敵を貫く',
  bedivere:       '対人|35|sure self=8|銀の腕に宿る聖剣の光。その一振りは、自らの命を削る',
  lancelot_saber: '対人|60|pierce|湖の光を過剰に解き放つ。最強の騎士の、最大の一撃',
  munenori:       '対人|40|sure @dispel|剣禅一如の境地。相手の術も構えも、一刀のもとに無に帰す',
  suzuka:         '対軍|45|@debuff=5:2|神通力で舞う無数の刀が、雨のように降り注ぐ',
  tsuna:          '対人|50|pierce|大江山の鬼を斬った太刀。どんな守りも、鬼の首と同じく断ち切る',
  artoria_alter:  '対城|75||黒く染まった聖剣。光を呑む闇の奔流は、聖剣以上の破壊を生む',
  fergus:         '対城|60|@stun=30|丘を三つ斬り落とした虹の剣。大地ごと揺さぶり、敵の足を奪う',
  charlemagne:    '対軍|50|atk=6:2|十二勇士の輝剣を従えて駆ける。冒険は、ここから始まる',
  muramasa:       '対人|65|pierce @dispel|天下五剣にも劣らぬ一振り。因果も加護も、まとめて斬り捨てる',
  saito:          '対人|30|sure @debuff=6:2|型を持たない剣。読もうとするほど、読めなくなる',
  altera:         '対城|60|pierce|文明を破壊する軍神の剣。三色の光の奔流が、どんな守りも撃ち抜く',
  // ---------------- アーチャー ----------------
  emiya:          '対軍|60|atk=8|心象に広がる剣の荒野。無数の剣が、尽きることなく敵を襲う',
  gilgamesh:      '対界|80|pierce|天地を分けた乖離剣。世界そのものを切り裂く、最古の一撃',
  atalante:       '対軍|45|@debuff=4:2|天に祈りを捧げ、太陽神と月女神の矢を雨と降らせる',
  robin:          '対人|30|@dot=7|イチイの毒が、敵の体を内から蝕む。派手さはないが、確実に効く',
  nobunaga:       '対軍|50|crit=25:1|三千の火縄銃が一斉に火を吹く。神秘を纏う者ほど、その弾丸に弱い',
  arash:          '対城|90|sure pierce self=50|国境を定めた一矢。放てば、射手の体は砕け散る',
  tristan:        '対軍|35|sure|弦を弾くたびに真空の刃が飛ぶ。どこにいようと、必ず届く',
  euryale:        '対人|40|@stun=70|女神の甘い眼差し。見つめられた者は、心を奪われて動けなくなる',
  arjuna:         '対界|75|pierce|破壊神シヴァから授かった神の一矢。触れたものを、跡形もなく消し去る',
  napoleon:       '対軍|60|atk=6:2|凱旋門を描く虹の砲撃。「不可能」の三文字は、皇帝の辞書にない',
  ishtar:         '対城|70|crit=15:1|金星を弾にして撃ち出す、女神の大砲。値の張る宝石を惜しげもなく使う',
  tomoe:          '対軍|50|@dot=5|観世音菩薩の加護を受けた炎の騎射。焼け跡は消えない',
  billy:          '対人|25|sure crit=40:1|目にも留まらぬ三連射。ほとんど魔力を使わない、早撃ちの極み',
  chiron:         '対人|50|sure @expose=5|蠍の心臓を狙う星の一射。賢者は、急所を決して外さない',
  tesla:          '対軍|60|@stun=40|人類が手にした雷霆。神々の雷を、科学の力で再現する',
  tawara:         '支援|35|heal=42 regen=9|尽きることのない俵から、米と力が溢れ出る',
  // ---------------- ランサー ----------------
  cuchulainn:     '対人|40|sure @death=30|心臓に当たったという結果を先に作る、因果逆転の呪いの槍',
  diarmuid:       '対人|35|pierce @dispel|魔力を断つ紅の槍。あらゆる守りの魔術を、刃先で無にする',
  scathach:       '対軍|55|sure @death=25|影の国の女王が投げ放つ死の槍。逃れる術はない',
  karna:          '対界|70|pierce once|黄金の鎧と引き換えに得た、神をも殺す一撃。一度きりの槍',
  leonidas:       '守護|45|def=13 atk=12:2|三百の兵と共に門を守る。守り抜いた先に、反撃の機が来る',
  elizabeth:      '対軍|30|@stun=40|竜の歌声（というより騒音）。耳を塞いでいる間に、敵は動きを止める',
  hector:         '対軍|50|pierce|不毀の極槍を投げ放つ。トロイアの守護者は、攻めても強い',
  brynhild:       '対人|50|@expose=6|愛する者を殺してしまう、恋の呪いの槍。想いが強いほど、槍は重くなる',
  inshun:         '対人|35|sure|十一の型を持つ槍術の奥義。月影のように、静かに急所を突く',
  shobun:         '対人|35|pierce @death=20|二の打ちいらず。一撃で、すべてを終わらせる',
  romulus:        '対軍|60|atk=8 def=4|ローマの歴史そのものを顕現させる。すべての道は、ローマに通ず',
  vlad_lancer:    '対軍|50|@stun=40 @dot=4:2|大地から無数の杭が突き出し、敵を串刺しにする',
  kagetora:       '対軍|45|crit=20:1 atk=5:2|毘沙門天の加護を受け、車輪のように絶え間なく攻め立てる',
  parvati:        '対人|50|heal=10 @expose=5|シヴァの三叉戟を借りて振るう。女神の抱擁は、慈しみと破壊を併せ持つ',
  finn:           '対軍|45|@debuff=5:2|海神の槍が呼ぶ大波。押し流された敵は、足場を失う',
  // ---------------- ライダー ----------------
  medusa:         '対軍|55|sure|天馬を駆り、流星となって突進する。誰にも止められない',
  iskandar:       '対軍|70|atk=8 def=4|かつての臣下たちを呼び寄せる、王の軍勢。数万の兵が王と共に駆ける',
  astolfo:        '弱体|30|stun=70 debuff=9:2|恐怖を呼び起こす魔笛の大音響。相手は耳を塞いで縮み上がる',
  ushiwakamaru:   '対軍|45|evade=1 crit=20:1|八艘跳びの身軽さで戦場を翔ける。捉えようとしても、そこにはもういない',
  drake:          '対軍|50|charge=10 @debuff=4:2|嵐の夜に艦隊を呼ぶ。砲撃のあとには、略奪品の魔力が残る',
  marie:          '支援|40|heal=35 atk=9|硝子の馬車で駆ける王妃。その輝きは、味方の心を奮い立たせる',
  achilles:       '対軍|55|sure def=5:2|神馬が引く不死の戦車。駆け抜ければ、何者も寄せつけない',
  ozymandias:     '結界|75|atk=18:4 def=8:4 regen=9:4|神殿そのものを呼び出す。そこは王の領域、王はそこで不滅となる',
  georgios:       '対人|40|@expose=8|斬った相手を「竜」に変える聖剣。竜となった者は、竜殺しの刃に弱い',
  teach:          '対軍|40|@debuff=4:2|恐怖の象徴だった海賊船。黒髭の名は、それだけで敵を怯ませる',
  columbus:       '対軍|45|charge=15|新天地を求めて錨を下ろす。奪ったものは、すべて自分のものだ',
  medb:           '対軍|40|@debuff=5:2|女王の戦車が踏み潰す。女王に逆らう者に、居場所はない',
  boudica:        '守護|35|def=13 heal=14|約束されなかった勝利の車輪。それでも、守るべきものを守り抜く',
  taikobo:        '弱体|45|dispel debuff=9|神をも打つ鞭。加護も神威も、打てば剥がれ落ちる',
  ryoma:          '対軍|50|@stun=30|相棒のお竜さんが天を駆ける。竜の咆哮に、敵は身を竦ませる',
  // ---------------- キャスター ----------------
  medea:          '弱体|35|dispel drain=40|あらゆる契約と魔術を破る短剣。強化も、魔力の繋がりも断ち切る',
  gilles:         '対軍|50|@dot=6|魔導書が喚ぶ海魔の群れ。倒しても倒しても、湧き出てくる',
  tamamo:         '支援|40|charge=30 heal=28|鏡に映した常世の光。魔力が満ちて、宝具を続けて撃てるようになる',
  merlin:         '支援|60|regen=15:5 atk=9:5|閉ざされた理想郷に咲く花々。花の香りが、長く傷を癒やし続ける',
  zhuge:          '弱体|50|stun=60 debuff=15|石を並べた迷いの陣。入れば二度と、出口は見つからない',
  andersen:       '支援|40|atk=12 crit=15 heal=21|あなたのためだけに書かれた物語。読んだ者は、主人公になる',
  cu_caster:      '対軍|55|@dot=6|炎を纏う巨人の檻。閉じ込められた者は、焼かれ続ける',
  shakespeare:    '弱体|40|debuff=15 stun=40|開演の喝采。舞台に上げられた者は、自分の悲劇を演じさせられる',
  nursery:        '結界|50|heal=28 debuff=12|誰かのための物語の世界。主人公は守られ、悪役は迷い続ける',
  blavatsky:      '対軍|55|@debuff=4:2|金星から降りた神の炎。神秘の光が、すべてを照らし出す',
  murasaki:       '弱体|45|dot=9 debuff=9|物語から生まれた物の怪が、敵にとり憑いて苦しめる',
  paracelsus:     '対軍|50|charge=10 @dispel|五大元素を束ねた魔剣。敵の術を解きほぐし、魔力を取り戻す',
  avicebron:      '結界|65|def=10:4 atk=9:4 regen=8:4|楽園を宿す巨大なゴーレム。その腕の中は、地上の楽園となる',
  sanzang:        '対人|50|@stun=70|お釈迦様の掌。どれほど速くても、掌の外へは逃れられない',
  skadi:          '支援|50|atk=15 crit=20|魔境への門を開き、戦う者に冬の女王の力を授ける',
  medea_lily:     '支援|40|heal=63 cleanse|あらゆる傷と呪いを癒やす、優しい魔術。負った傷は、なかったことになる',
  mozart:         '弱体|35|debuff=12 stun=30|死神のための鎮魂曲。聴いた者の魂が、ゆっくりと凍えていく',
  // ---------------- アサシン ----------------
  kojiro:         '対人|30|sure pierce|宝具ではなく、ただの技。三つの斬撃が同時に、逃げ場なく襲う',
  hassan:         '対人|40|@death=35|呪いの腕で、相手の心臓の鏡像を握り潰す',
  jack:           '対人|45|sure @death=30|霧と夜と女性。条件が揃ったとき、解体は必ず成功する',
  jingke:         '対人|40|self=10 @death=40|生きて帰らぬ覚悟の匕首。自分の命ごと、一撃に懸ける',
  shiki:          '対人|50|pierce @death=30 @dispel|万物の「死」の線をなぞる。生きているなら、神様だって殺してみせる',
  serenity:       '対人|30|@dot=8|全身が毒そのもの。触れただけで、相手は内から崩れていく',
  hundred:        '対人|45|sure crit=20:1|百の人格が、同時に一つの標的を狙う',
  carmilla:       '対人|40|@heal=15 @dot=5:2|鉄の処女に閉じ込め、血を絞り取る。奪った血が、自らを癒やす',
  shuten:         '弱体|45|dot=9 debuff=12 stun=40|甘く香る鬼の神酒。一口でも飲めば、骨まで溶けていく',
  kotaro:         '弱体|35|debuff=12 evade=1|風魔の忍びが群れとなって現れる。誰が本物か、もう分からない',
  danzo:          '対人|40|@stun=60|絡繰の幻法で、牛ごと呑み込む。気づいたときには、もう動けない',
  izo:            '対人|30|sure crit=30:1|相手の技を盗み、そのまま返す人斬りの剣',
  mata_hari:      '弱体|40|stun=80 debuff=9:2|陽の眼を持つ女。その微笑みに、誰もが戦う意思を失う',
  yan_qing:       '対人|40|sure evade=1|十の方角すべてに伏兵がいる。気配もなく、影もなく、拳が届く',
  wu_zetian:      '弱体|45|dot=9 debuff=9|密告と拷問の経典。罪を問われた者は、苦しみから逃れられない',
  // ---------------- バーサーカー ----------------
  heracles:       '守護|50|guts=1 heal=28 def=8:2|十二の試練を越えた肉体。一度や二度殺したくらいでは、止まらない',
  lancelot:       '支援|30|atk=18|手にしたものを何でも自分の宝具にする。木の枝でさえ、最強の武器になる',
  lubu:           '対軍|55|crit=20:1|六つの形に変わる、天下無双の武器。どの形でも、受ければ終わり',
  frankenstein:   '対軍|45|self=10 @stun=40|胸の炉心から雷の樹を放つ。自分の体も、ただでは済まない',
  kintoki:        '対人|45|crit=30:1|黄金の斧が唸る、ゴールデンな一撃',
  spartacus:      '対軍|35|rage=30|受けた痛みを、そのまま力に変える。傷つくほど、叛逆の拳は重くなる',
  kiyohime:       '対人|45|@dot=8|竜に化して、嘘つきを焼き尽くす炎を吐く',
  tamamo_cat:     '支援|35|heal=35 atk=9:2|ご馳走を並べてお昼寝。食べて寝れば、また戦えるワン',
  beowulf:        '対人|40|crit=30:1|武器を捨て、拳で殴り合う。それが、怪物退治の流儀だ',
  caligula:       '弱体|40|stun=60 debuff=12|月の光で、相手の心を狂わせる',
  darius:         '対軍|55|@debuff=5:2|死なない一万の騎兵が、絶え間なく押し寄せる',
  vlad_berserker: '対人|45|@heal=10 @dot=5:2|全身から杭を生やして襲いかかる。流した血は、自らの糧になる',
  ibaraki:        '対人|45|@expose=5|羅生門の怨念を込めた鬼の腕。掴まれた者は、骨まで砕かれる',
  raikou:         '対軍|55|@stun=30|牛王の雷を天から呼ぶ。張り巡らされた雷の網から、逃れる術はない',
  hijikata:       '支援|25|guts=1 atk=12:2|新選組は、まだ終わっていない。誠の旗がある限り、倒れない',
  nightingale:    '支援|45|heal=56 cleanse def=8:2|すべての害と毒を断つ、看護の誓い。治療は、拒否できない',
  penthesilea:    '対人|45|rage=25|英雄への憎しみが、拳を何倍にも重くする',
  // ---------------- エクストラクラス ----------------
  jeanne:         '守護|50|evade=2 heal=35 def=8|聖旗を掲げ、主の御業で攻撃をすべて退ける',
  jalter:         '対軍|55|@debuff=6 @dot=5:2|憎悪の炎で、すべてを焼き尽くす',
  edmond:         '対人|50|sure crit=15:1|時間さえ止まったかのような超高速の思考で、獄の中を駆け巡る',
  amakusa:        '対軍|60|@dispel|両腕の魔術回路を束ね、あらゆる加護を打ち消す一撃を放つ',
  martha_ruler:   '対人|45|@stun=30|鉄甲竜タラスクと共に、拳で語る。信仰の拳は、竜をも鎮める',
  holmes:         '支援|30|reveal debuff=9 atk=9:2|初歩的なことだ。真実を暴かれた相手は、もう何も隠せない',
  gorgon:         '対軍|60|@stun=50|すべてを石に変える、魔神の神殿。石になった者は、動くことができない',
  salieri:        '対軍|45|@debuff=8|灰色の男の葬送曲。響き渡るたびに、相手の力が削がれていく',
  meltryllis:     '対人|50|@drain=30 @heal=12|愛しいものを溶かして、吸い上げる。奪った魔力は、彼女の踊りの糧になる',
  passionlip:     '対人|55|pierce|巨大な爪で押し潰し、圧縮する。どんな鎧も、紙のように潰れる',
  okita_alter:    '対人|40|sure pierce|無穹の三段突き。空間ごと貫く、防ぎようのない一突き',
  doman:          '弱体|50|dot=9:4 debuff=12 drain=20|悪霊の群れを呼び、相手の運気も魔力も吸い尽くす',
  bb:             '結界|60|debuff=18 drain=30 atk=9|月の裏側の支配者が、この戦場のルールを書き換える',
  abigail:        '対軍|55|@debuff=8|門の向こうから伸びる光の樹。触れた者の正気を、静かに削る',
  hokusai:        '対軍|50|crit=15:1 @stun=30|描いた大波が、そのまま現実になって押し寄せる',
  mash:           '守護|40|def=18 evade=1|白亜の城壁を呼び出す、人理の盾。誰一人、傷つけさせない',
  oberon:         '弱体|65|stun=90 debuff=18 drain=40|すべてを眠りへと落とす、奈落の夢。目覚める者はいない',
  // カルデアにゆかりのある英霊
  artoria_caster: '支援|50|atk=18 def=8 charge=20|希望の星が、戦う者を抱きしめる。支えられた者は、どこまでも戦える',
  davinci:        '対人|45|crit=20:1 @expose=5|万能の天才が、その場で最適な一撃を設計する。弱点の解析も込みで',
  nemo:           '対軍|55|def=6:2|鸚鵡貝の大衝角で突撃する。頑丈な船体が、反撃もはね返す',
  // ---------------- 特別な敵 ----------------
  ori:            '対軍|50|@dot=5|六十年分の呪いが、泥となって押し寄せる',
  beast8:         '結界|60|drain=30 debuff=15 heal=28|満ち足りた楽園。望むことを、忘れさせる',
  enf_chain:      '弱体|40|stun=60 debuff=9:2|千の鎖が絡みつき、動きを縛る',
  enf_specimen:   '弱体|45|dot=9 debuff=12|永遠の檻に閉じ込め、生きたまま標本にする',
  enf_hound:      '対人|40|sure crit=25:1|獲物を決して逃さない、灰色の魔弾',
};
// 名前の付いていない英霊（自作の英霊など）は、標準の対軍宝具として扱う
const NP_DEFAULT = '対軍|50||伝説そのものを解き放つ大技';
const NP_ATTACK_KINDS = ['対人', '対軍', '対城', '対界'];
// 種類ごとの基本の強さ（消費魔力50のとき）：判定への加算・ダメージへの加算
const NP_KIND_BASE = { 対人: { score: 28, dmg: 20 }, 対軍: { score: 24, dmg: 22 }, 対城: { score: 24, dmg: 30 }, 対界: { score: 26, dmg: 38 } };

const NP_CACHE = {};
function npInfo(sv) {
  const id = sv && sv.id;
  if (id && NP_CACHE[id]) return NP_CACHE[id];
  const [kind, cost, fx, desc] = (NP_DATA[id] || NP_DEFAULT).split('|');
  const atk = NP_ATTACK_KINDS.includes(kind);
  const effects = (fx || '').split(/\s+/).filter(Boolean).map(t => {
    const hit = t.startsWith('@'); const m = /^@?([a-z]+)(?:=(\d+))?(?::(\d+))?$/.exec(t);
    return { code: m[1], v: m[2] ? +m[2] : 0, turns: m[3] ? +m[3] : atk ? 3 : 4, hit };   // 攻撃しない宝具の効果は、標準で4手番
  });
  const c = +cost;
  const base = NP_KIND_BASE[kind] || { score: 24, dmg: 0 };
  const info = { kind, cost: c, effects, desc: desc || '', atk,
    // 消費魔力50を基準に、重いほど強く（50を超えた分は大きく伸びる）、軽いほど控えめに
    score: atk ? Math.round(base.score + (c > 50 ? (c - 50) * 0.35 : (c - 50) * 0.15)) : 12,
    dmg: atk ? Math.round(base.dmg + (c > 50 ? (c - 50) * 0.9 : (c - 50) * 0.35)) : 0,
    has: code => effects.some(e => e.code === code), val: code => effects.filter(e => e.code === code).reduce((s, e) => s + e.v, 0) };
  if (id) NP_CACHE[id] = info;
  return info;
}
// 威力の目安（ダメージ加算から）
function npPowerLabel(info) {
  if (!info.atk) return '';
  const d = info.dmg + (info.has('rage') ? Math.round(info.val('rage') / 3) : 0);
  return d >= 40 ? '極大' : d >= 31 ? '特大' : d >= 23 ? '大' : d >= 15 ? '中' : '小';
}
// 効果の説明（短い言葉で）
const NP_FX_TEXT = {
  atk: (v, t) => `攻撃+${v}（${t}手番）`, def: (v, t) => `被ダメージ-${v}（${t}手番）`, crit: (v, t) => t === 1 ? `会心率+${v}%` : `会心率+${v}%（${t}手番）`,
  debuff: (v, t) => `敵の判定-${v}（${t}手番）`, expose: (v, t) => `敵の被ダメージ+${v}（${t}手番）`, dot: (v, t) => `毎手番敵に${v}ダメージ（${t}手番）`,
  regen: (v, t) => `毎手番HP+${v}（${t}手番）`, heal: v => `HP+${v}`, charge: v => `魔力+${v}`, drain: v => `敵の魔力-${v}`,
  stun: v => `${v}%で敵の行動を封じる`, evade: v => v > 1 ? `攻撃を${v}回無効` : '攻撃を1回無効', guts: v => v > 1 ? `${v}回まで踏みとどまる` : '一度だけ踏みとどまる',
  dispel: () => '敵の強化を消す', cleanse: () => '自分の弱体を消す', pierce: () => '防御を貫く', sure: () => '必中',
  death: v => `${v}%で急所を穿つ`, rage: v => `傷つくほど威力上昇（最大+${v}）`, self: v => `自分のHP-${v}`, reveal: () => '敵の真名を見抜く', once: () => '1戦闘に1度だけ',
};
function npFxText(info) {
  return info.effects.map(e => (e.hit ? '命中時：' : '') + NP_FX_TEXT[e.code](e.v, e.turns)).join('・');
}
// 「対城宝具・威力特大・魔力70」のような一行
function npSummary(info) {
  return `${info.kind}宝具${info.atk ? `・威力${npPowerLabel(info)}` : ''}・魔力${info.cost}`;
}
// ステータス画面・敵の情報用の説明
function npDetailHTML(sv) {
  const info = npInfo(sv); const fx = npFxText(info);
  return `<div class="np-detail"><b>${npSummary(info)}</b>${fx ? `<span>${fx}</span>` : ''}<em>${info.desc}</em></div>`;
}

// =============================================================
//  戦闘での処理（battle.js から呼ぶ）。side は 'me' か 'en'
// =============================================================
function npOf(side) { return npInfo(sideSv(side)); }
function npCost(side) { return npOf(side).cost; }
function npUsable(side) {
  const info = npOf(side); if (info.has('once') && B.npUsed && B.npUsed[side]) return false;
  const mpNow = side === 'me' ? G.servant.mp : B.r.mp; return mpNow >= info.cost;
}
// 判定への加算（攻撃宝具：種類と消費魔力から／激昂：減ったHPに応じて）
function npScoreBonus(side) {
  const info = npOf(side); let s = info.score + (info.has('sure') ? 6 : 0);
  if (info.has('rage')) s += Math.round(info.val('rage') * npLostFrac(side));
  return s;
}
function npDmgBonus(side) {
  const info = npOf(side); let d = info.dmg;
  if (info.has('rage')) d += Math.round(info.val('rage') * npLostFrac(side) / 2);
  return d;
}
function npLostFrac(side) { return side === 'me' ? 1 - Math.max(0, G.servant.hp) / servantHpMax() : 1 - Math.max(0, B.r.hp) / B.r.hpMax; }
function npResisted(side, scale = 3) {
  const t = sideSv(side === 'me' ? 'en' : 'me'); if (!t || B.boss || B.beast) return false;
  const v = classSkillV(t, '対魔力') + classSkillV(t, '領域外の生命'); return Math.random() * 100 < v * scale;
}
// 1つの効果を適用する
function npApply(side, e, log) {
  const foe = side === 'me' ? 'en' : 'me'; const meSide = side === 'me';
  const who = meSide ? servantOf(G).short : enemyName(); const foeName = meSide ? enemyName() : servantOf(G).short;
  const big = B.boss || B.beast || B.enforcer;
  const heal = n => { if (meSide) shp(n); else B.r.hp = Math.min(B.r.hpMax, B.r.hp + n); };
  const out = [];
  // 宝具の強化・弱体は重ねがけせず、かけ直すと上書きになる
  const put = (code, v, turns) => { B.buf[side] = B.buf[side].filter(b => !(b.np && b.code === code)); B.buf[side].push({ code, v, turns, np: true }); };
  switch (e.code) {
    // 守護の宝具は、使った手番は守りに回るので、効果は次の手番から数える
    case 'atk': case 'def': case 'crit': put(e.code, e.v, e.turns + (npOf(side).kind === '守護' ? 1 : 0)); break;
    case 'debuff': case 'expose': {
      const v = npResisted(side) ? Math.ceil(e.v / 2) : e.v; if (v < e.v) out.push(`${foeName}の対魔力が効果を弱めた`);
      put(e.code, v, e.turns + (npOf(side).kind === '守護' ? 1 : 0)); break;
    }
    case 'dot': case 'regen': put(e.code, e.v, e.turns + 1); break;   // 次の手番から数える
    case 'heal': heal(e.v); out.push(`${who}のHP+${e.v}`); break;
    case 'charge': if (meSide) mp(e.v); else B.r.mp = Math.min(100, B.r.mp + e.v); out.push(`魔力+${e.v}`); break;
    case 'drain': {
      const v = npResisted(side) ? Math.ceil(e.v / 2) : e.v;
      if (meSide) B.r.mp = Math.max(0, B.r.mp - v); else mp(-v); out.push(`${foeName}の魔力-${v}`); break;
    }
    case 'stun': {
      const p = big ? e.v / 2 : e.v;
      if (npResisted(side)) out.push(`${foeName}は対魔力で踏みとどまった`);
      else if (Math.random() * 100 < p) { B.stun[foe] = true; out.push(`${foeName}の動きを封じた！`); }
      else out.push(`${foeName}は辛うじて踏みとどまった`);
      break;
    }
    case 'evade': B.evade[side] = Math.max(B.evade[side], e.v); out.push(e.v > 1 ? `次の${e.v}回の攻撃を無効にする` : '次の攻撃を無効にする'); break;
    case 'guts': B.guts[side] = Math.max(B.guts[side] || 0, e.v); out.push(e.v > 1 ? `${e.v}度まで、倒れても立ち上がる` : '一度だけ、倒れても立ち上がる'); break;
    case 'dispel': {
      const pos = ['str', 'agi', 'mag', 'atk', 'np', 'def', 'crit', 'pierce', 'master', 'regen'];
      const had = B.buf[foe].some(b => pos.includes(b.code)) || B.guts[foe] || B.evade[foe];
      B.buf[foe] = B.buf[foe].filter(b => !pos.includes(b.code)); B.guts[foe] = 0; B.evade[foe] = 0;
      out.push(had ? `${foeName}の強化を打ち消した` : `${foeName}に打ち消すべき強化はなかった`); break;
    }
    case 'cleanse': {
      const neg = ['debuff', 'expose', 'dot']; const had = B.buf[foe].some(b => neg.includes(b.code)) || B.stun[side];
      B.buf[foe] = B.buf[foe].filter(b => !neg.includes(b.code)); B.stun[side] = false;
      if (had) out.push(`${who}にかかった弱体が消えた`); break;
    }
    case 'death': {
      const luck = meSide ? rivalParam(B.r, 4) : servantParam(4);
      const p = (e.v - luck / 4) * (big ? 0.5 : 1);
      if (Math.random() * 100 < p) {
        const d = Math.round((meSide ? B.r.hpMax : servantHpMax()) * 0.3);
        if (meSide) B.r.hp -= d; else shp(-d);
        B.fxq.push({ type: 'hit', side: foe, dmg: d, crit: true });
        out.push(`<b>急所を穿った！</b>（追加${d}ダメージ）`);
      }
      break;
    }
    case 'self': {
      if (meSide) G.servant.hp = Math.max(1, G.servant.hp - e.v); else B.r.hp = Math.max(1, B.r.hp - e.v);
      out.push(`${who}自身もHP-${e.v}`); break;
    }
    case 'reveal':
      if (meSide) { if (!knowsName(B.r) && !B.boss) { B.r.intel = 3; out.push(`${foeName}の真名は<b>${servantOf(B.r).name}</b>だと見抜いた`); addLog(`${B.r.cls}の真名「${servantOf(B.r).name}」を看破。`); } }
      else if (!G.servant.exposed) { G.servant.exposed = true; out.push(`${foeName}の真名を見抜かれた`); }
      break;
    default: break;   // pierce / sure / rage / once は判定の中で働く
  }
  return out;
}
// 宝具を使ったとき（命中を待たない効果）
function npOnUse(side, log) {
  const info = npOf(side); if (!B.npUsed) B.npUsed = { me: false, en: false }; B.npUsed[side] = true;
  const lines = []; for (const e of info.effects) if (!e.hit) lines.push(...npApply(side, e, log));
  const shown = info.effects.filter(e => !e.hit && !['pierce', 'sure', 'rage', 'once'].includes(e.code));
  if (shown.length) log.push(`<span class="np-fx ${side}">【${info.kind}宝具】${npFxText({ effects: shown })}${lines.length ? `――${lines.join('、')}` : ''}</span>`);
  else if (!info.atk && lines.length) log.push(`<span class="np-fx ${side}">${lines.join('、')}</span>`);
}
// 攻撃宝具が命中したとき
function npOnHit(side, log) {
  const info = npOf(side); const lines = [];
  for (const e of info.effects) if (e.hit) lines.push(...npApply(side, e, log));
  const shown = info.effects.filter(e => e.hit && e.code !== 'death');
  if (shown.length || lines.length) log.push(`<span class="np-fx ${side}">${shown.length ? `【追加効果】${npFxText({ effects: shown.map(e => ({ ...e, hit: false })) })}` : ''}${lines.length ? `${shown.length ? '――' : ''}${lines.join('、')}` : ''}</span>`);
}
// 攻撃しない宝具を使った手番の動き：守護なら守りの構え（'npg'）、それ以外は最も得意な攻撃
function npFollow(side) {
  if (npOf(side).kind === '守護') return 'npg';
  const val = k => side === 'me' ? servantParam(TACTICS[k].stat) : rivalParam(B.r, TACTICS[k].stat);
  return ['str', 'agi', 'mag'].reduce((b, k) => val(k) > val(b) ? k : b, 'str');
}
// 毎手番のはじめ：継続ダメージ・継続回復
function npTick(log) {
  for (const side of ['me', 'en']) {
    const foe = side === 'me' ? 'en' : 'me';
    const dot = buffSum(side, 'dot'); const reg = buffSum(side, 'regen');
    if (dot > 0) {
      if (side === 'me') { B.r.hp -= dot; log.push(`<span class="note">宝具の傷が${enemyName()}を蝕む。（${dot}ダメージ）</span>`); }
      else { G.servant.hp = Math.max(1, G.servant.hp - dot); log.push(`<span class="note">宝具の傷が${servantOf(G).short}を蝕む。（${dot}ダメージ）</span>`); }
      B.fxq.push({ type: 'hit', side: foe, dmg: dot });
    }
    if (reg > 0) {
      if (side === 'me') { shp(reg); log.push(`<span class="note">宝具の加護が、${servantOf(G).short}の傷を癒やす。（HP+${reg}）</span>`); }
      else { B.r.hp = Math.min(B.r.hpMax, B.r.hp + reg); log.push(`<span class="note">宝具の加護が、${enemyName()}の傷を癒やす。（敵HP+${reg}）</span>`); }
    }
  }
}
// 敵が宝具を使うかどうか（攻撃しない宝具は、追い詰められたときに使いやすい）
function enemyWantsNp() {
  if (!npUsable('en')) return false;
  const info = npOf('en'); const low = B.r.hp < B.r.hpMax * 0.5;
  if (!info.atk) {
    const healing = info.has('heal') || info.has('regen') || info.has('guts') || info.has('evade') || info.has('def');
    const again = B.npUsed.en ? 0.35 : 1;   // 一度使ったら、しばらくは攻めに回る
    return Math.random() < (low ? (healing ? 0.55 : 0.35) : 0.18) * again;
  }
  return low || Math.random() < 0.15;
}
