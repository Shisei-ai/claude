// =============================================================
//  data_skills.js … サーヴァントのスキル（FGOを参考元に、このゲームの仕組みに合わせたもの）
//
//  ・保有スキル（3種）：戦闘中に1つずつ選んで使う。1回の戦闘で各スキル1回まで。
//      行動（白兵戦・宝具など）と一緒に使い、その手番から効果が出る
//  ・クラススキル：常に働く（対魔力・騎乗・単独行動・陣地作成・気配遮断・狂化 など）
//  ・敵のサーヴァントも、自分のスキルを使ってくる
//
//  書式：'クラススキル（名前＋ランク、読点区切り）|保有スキル（名前:ランク[:効果]、読点区切り）'
//   クラススキルを省略すると、クラスの標準のものになる
//   効果を省略すると、スキル名から自動で決まる（SKILL_AUTO）
// =============================================================

// ---- 保有スキルの効果（v はランクから決まる強さ） ----
const SKILL_FX = {
  str:     { tag: '白兵強化', desc: v => `3手番、白兵戦+${v}` },
  agi:     { tag: '機動強化', desc: v => `3手番、機動戦+${v}` },
  mag:     { tag: '魔術強化', desc: v => `3手番、魔術戦+${v}` },
  atk:     { tag: '攻撃強化', desc: v => `3手番、すべての攻撃+${Math.ceil(v * 0.7)}` },
  np:      { tag: '宝具強化', desc: v => `3手番、宝具+${Math.round(v * 1.5)}・魔力+10` },
  charge:  { tag: '魔力充填', desc: v => `魔力+${v * 3}` },
  def:     { tag: '防御強化', desc: v => `3手番、受けるダメージ-${Math.ceil(v * 0.8)}` },
  evade:   { tag: '回避', desc: () => '次に受ける攻撃を1回無効にする' },
  guts:    { tag: '戦闘続行', desc: () => 'この戦闘中、一度だけHP0から20で踏みとどまる' },
  heal:    { tag: '回復', desc: v => `HP+${v * 3}` },
  crit:    { tag: '会心', desc: v => `3手番、会心率+${v * 3}%` },
  debuff:  { tag: '弱体', desc: v => `3手番、敵の判定-${v}` },
  charm:   { tag: '行動封じ', desc: () => '敵の次の手番を、6割の確率で封じる' },
  pierce:  { tag: '防御貫通', desc: v => `3手番、敵の防御を貫き攻撃+${Math.ceil(v / 2)}` },
  insight: { tag: '看破', desc: v => `敵の次の手を確実に読み、次の攻撃+${v}` },
  master:  { tag: '対マスター', desc: v => `3手番、敵マスター狙い+${v * 2}` },
};
// スキル名から効果を推測する（上から順に、名前に含まれる言葉で判定）
const SKILL_AUTO = [
  ['戦闘続行', 'guts'], ['仕切り直し', 'heal'], ['直感', 'insight'], ['啓示', 'insight'], ['千里眼', 'insight'], ['看破', 'insight'], ['観察', 'insight'],
  ['心眼', 'evade'], ['矢避け', 'evade'], ['透化', 'def'], ['魔力放出', 'str'], ['怪力', 'str'], ['勇猛', 'str'], ['武練', 'str'], ['鬼種', 'str'],
  ['カリスマ', 'atk'], ['皇帝特権', 'atk'], ['軍略', 'np'], ['黄金律', 'charge'], ['高速', 'charge'], ['吸血', 'charge'], ['魔術', 'mag'], ['ルーン', 'debuff'],
  ['魅了', 'charm'], ['黒子', 'charm'], ['魔眼', 'charm'], ['美貌', 'charm'], ['話術', 'debuff'], ['拷問', 'debuff'], ['破壊工作', 'debuff'], ['無辜', 'debuff'],
  ['天性の肉体', 'heal'], ['再生', 'heal'], ['治癒', 'heal'], ['加護', 'def'], ['守護', 'def'], ['変化', 'def'], ['縮地', 'agi'], ['騎射', 'agi'], ['早撃ち', 'agi'],
];
function skillCode(name) { for (const [k, c] of SKILL_AUTO) if (name.includes(k)) return c; return 'atk'; }
// ランク → 強さ
function skillV(rank) {
  const m = /^(EX|[A-E])([+\-]*)$/.exec(rank || 'C'); if (!m) return 6;
  const base = { EX: 12, A: 10, B: 8, C: 6, D: 4, E: 3 }[m[1]];
  return base + (m[2].match(/\+/g) || []).length - (m[2].match(/-/g) || []).length;
}

// ---- クラスの標準のクラススキル ----
const CLASS_SKILL_DEFAULT = {
  'セイバー': '対魔力B,騎乗B', 'アーチャー': '対魔力D,単独行動B', 'ランサー': '対魔力C', 'ライダー': '対魔力C,騎乗B',
  'キャスター': '陣地作成B,道具作成B', 'アサシン': '気配遮断B', 'バーサーカー': '狂化B', 'ルーラー': '対魔力A,真名看破B',
  'アヴェンジャー': '復讐者B,忘却補正B,自己回復（魔力）C', 'アルターエゴ': '対魔力C,女神の神核C', 'ムーンキャンサー': '対魔力C,陣地作成A',
  'フォーリナー': '領域外の生命B,神性B', 'シールダー': '対魔力A,騎乗C', 'プリテンダー': '対魔力C,陣地作成B',
};
// ---- クラススキルの効果（常に働く） ----
const CLASS_FX = {
  '対魔力':   { desc: v => `敵の魔術戦-${Math.ceil(v / 2)}・弱体や行動封じを${v * 5}%で防ぐ` },
  '騎乗':     { desc: v => `機動戦+${Math.ceil(v / 3)}` },
  '単独行動': { desc: v => `毎日、魔力+${Math.ceil(v / 2)}` },
  '陣地作成': { desc: v => `拠点での迎撃+${Math.ceil(v / 2)}` },
  '道具作成': { desc: v => `毎日${10 + v}%で治癒の霊薬を作る` },
  '気配遮断': { desc: v => `奇襲の初撃+${v}・敵マスター狙い+${Math.ceil(v / 2)}` },
  '狂化':     { desc: v => `すべての攻撃+${Math.ceil(v / 2)}・受けるダメージ+${Math.ceil(v / 4)}` },
  '神性':     { desc: v => `すべての攻撃+${Math.ceil(v / 4)}` },
  '女神の神核': { desc: v => `すべての攻撃+${Math.ceil(v / 4)}・受けるダメージ-${Math.ceil(v / 4)}` },
  '真名看破': { desc: () => '対面した敵の真名を見抜く' },
  '復讐者':   { desc: v => `HPが半分を切ると、すべての攻撃+${Math.ceil(v / 2)}` },
  '忘却補正': { desc: v => `会心率+${v}%` },
  '自己回復（魔力）': { desc: v => `毎手番、魔力+${Math.ceil(v / 3)}` },
  '領域外の生命': { desc: v => `受けるダメージ-${Math.ceil(v / 4)}・弱体を${v * 5}%で防ぐ` },
};

// ---- 全サーヴァントのスキル ----
const SKILL_DATA = {
  // セイバー
  artoria: '対魔力A,騎乗B|直感:A,魔力放出:A,カリスマ:B',
  nero: '対魔力C,騎乗B|頭痛持ち:B:heal,皇帝特権:EX,三度、落陽を迎えても:A:guts',
  siegfried: '対魔力E,騎乗B|黄金律:C-,竜殺し:A:pierce,仕切り直し:A',
  mordred: '対魔力B,騎乗B|魔力放出:A,直感:B,カリスマ:C-',
  okita: '対魔力E,騎乗E|心眼（偽）:A,病弱:A:crit,縮地:B',
  musashi: '対魔力A,騎乗B|第五勢:A:atk,無空:A:evade,天眼:A:insight',
  gawain: '対魔力B,騎乗B|聖者の数字:EX:str,カリスマ:E,不夜の加護:EX:def',
  deon: '対魔力C,騎乗C|自己暗示:A:def,美しき容貌:C:charm,剣技:A:str',
  rama: '対魔力A,騎乗A|武芸の祝福:A:atk,心眼（真）:B,魔性の言説:A:debuff',
  bedivere: '対魔力B,騎乗A|戦闘続行:B,守護の誓約:B,銀の腕:A:np',
  lancelot_saber: '対魔力B,騎乗B|騎士は徒手にて死せず:A:atk,無窮の武練:A+,湖の騎士:A:np',
  munenori: '対魔力C|新陰流:A+:str,水月:B:evade,剣禅一如:A:insight',
  suzuka: '対魔力B,騎乗B,神性B|魅了の美貌:B,神通力:A:mag,才知の祝福:B:atk',
  tsuna: '対魔力B,騎乗B|鬼切:A:pierce,心眼（真）:B,頼光四天王:A:atk',
  artoria_alter: '対魔力B|直感:B,魔力放出:A,カリスマ:E',
  fergus: '対魔力B,騎乗B|勇猛:B,戦闘続行:A,虹霓剣の担い手:A:np',
  charlemagne: '対魔力A,騎乗A|カリスマ:B,聖騎士帝:A:np,輝きの冒険:A:heal',
  muramasa: '対魔力C|鍛冶の業:A:np,心眼（真）:B,剣豪:A:str',
  saito: '対魔力E|心眼（真）:B,無形の剣:A:pierce,三番隊組長:A:atk',
  altera: '対魔力B,騎乗A,神性B|天性の肉体:D,軍略:B,星の紋章:EX:crit',
  // アーチャー
  emiya: '対魔力D,単独行動B|心眼（真）:B,千里眼:C,投影魔術:A:atk',
  gilgamesh: '対魔力E,単独行動A+,神性B|黄金律:A,カリスマ:A+,王の財宝:EX:np',
  atalante: '対魔力D,単独行動A|追い込みの美学:C:crit,アルカディア越え:B:agi,天穹の弓:A:np',
  robin: '対魔力D,単独行動A|破壊工作:A,黄金律:E,祈りの弓:A:np',
  nobunaga: '対魔力B,単独行動B|天下布武・革新:A:pierce,戦略:B:np,魔王:A:debuff',
  arash: '対魔力C,単独行動C|頑健:EX:def,千里眼:A,弓矢作成:A:charge',
  tristan: '対魔力B,単独行動B|治癒の竪琴:C,祝福されぬ生誕:B:debuff,無駄なき射撃:A:np',
  euryale: '対魔力E,単独行動A,女神の神核EX|吸血:C,女神のきまぐれ:A:debuff,魅了:A',
  arjuna: '対魔力C,単独行動A,神性B|千里眼:C+,魔力放出（炎）:A,授かりの英雄:A:atk',
  napoleon: '対魔力C,単独行動B|皇帝の戦略:A:atk,可能性の光:EX:np,不可能を可能に:A:guts',
  ishtar: '対魔力A,単独行動A,女神の神核B|美の女神の加護:B:charm,魔力放出（宝石）:A:mag,金星の女神:EX:np',
  tomoe: '対魔力B,単独行動A|鬼種の魔:B,心眼（偽）:B,騎射:A',
  billy: '対魔力E,単独行動A|早撃ち:A++,心眼（偽）:C,射撃:A+:crit',
  chiron: '対魔力B,単独行動B|心眼（真）:A,神授の智慧:A+:atk,千里眼:B+',
  tesla: '対魔力C,単独行動A|天才の証明:A:np,星の開拓者:EX:atk,魔力放出（雷）:A:mag',
  tawara: '対魔力C,単独行動B|龍神の加護:A,弓矢の達人:A:crit,無尽の俵:A:heal',
  // ランサー
  cuchulainn: '対魔力C|戦闘続行:A,仕切り直し:C,矢避けの加護:B',
  diarmuid: '対魔力B|心眼（真）:B,愛の黒子:C,騎士の誉れ:B:atk',
  scathach: '対魔力A|魔境の叡智:A+:atk,原初のルーン:A,神殺し:B:pierce',
  karna: '対魔力C,神性A|貧者の見識:A:insight,魔力放出（炎）:A,梵天よ、我を呪え:A:debuff',
  leonidas: '対魔力B|殿の矜持:A:def,戦闘続行:A,軍略:B',
  elizabeth: '対魔力A,陣地作成B|嗜虐のカリスマ:A,拷問技術:A,戦闘続行:B',
  hector: '対魔力B,騎乗B|軍略:B,仕切り直し:B,不屈の守り:A:def',
  brynhild: '対魔力B,騎乗A,神性B|魔力放出:A,原初のルーン:A,英雄の介添:A:atk',
  inshun: '対魔力C|宝蔵院流槍術:A:str,心眼（真）:B,仏道の心得:A:heal',
  shobun: '対魔力E|中国武術:A+:str,圏境:A:evade,絶招:B:pierce',
  romulus: '対魔力C,神性A|皇帝特権:EX,天性の肉体:C,七つの丘:A:def',
  vlad_lancer: '対魔力C|護国の鬼将:EX:def,戦闘続行:A,無辜の怪物:A',
  kagetora: '対魔力C,騎乗A|車懸りの陣:A:atk,軍神の加護:A,無二の将:A:crit',
  parvati: '対魔力B,女神の神核C|白き女神の慈愛:A:heal,恋心:A:charm,ヒマラヤの娘:A:np',
  finn: '対魔力B,神性D|魔術:B,親指かむかむ知恵もりもり:A:insight,女難の美:B:charm',
  // ライダー
  medusa: '対魔力B,騎乗A+,神性E-|魔眼:A+,怪力:B,吸血:C',
  iskandar: '対魔力D,騎乗A+,神性C|カリスマ:A,軍略:B,征服王:A:pierce',
  astolfo: '対魔力A,騎乗A+|理性蒸発:D:crit,怪物的魅力:C:charm,魔術:D',
  ushiwakamaru: '対魔力C,騎乗A+|天狗の兵法:A:agi,カリスマ:C+,壇ノ浦・八艘跳:B:evade',
  drake: '対魔力D,騎乗C+|嵐の航海者:A+:atk,黄金律:B,星の開拓者:EX:np',
  marie: '対魔力C,騎乗A|魅惑の美声:C:charm,麗しの姫君:A:heal,神の恩寵:B:atk',
  achilles: '対魔力C,騎乗A+,神性C|勇猛:B,女神の寵愛:B:def,戦闘続行:A',
  ozymandias: '対魔力B,騎乗A,神性B|皇帝特権:EX,カリスマ:B,太陽神の加護:A:charge',
  georgios: '対魔力A,騎乗B|守護騎士:A+,殉教者の魂:B+:heal,戦闘続行:A',
  teach: '対魔力E,騎乗C|嵐の航海者:B:atk,海賊の誉れ:B:guts,紳士的な愛:C:heal',
  columbus: '対魔力D,騎乗B|嵐の航海者:B:atk,新天地探索:A:charge,黄金律:B:np',
  medb: '対魔力C,騎乗A|女王の躾:A:debuff,女王の寵愛:A:atk,黄金律:B',
  boudica: '対魔力D,騎乗A|勝利の誓い:B:atk,女神の加護:B,癒やしの祈り:B:heal',
  taikobo: '対魔力C,騎乗B|軍略:A,仙術:A:mag,釣り人の知恵:A:insight',
  ryoma: '対魔力D,騎乗B|北辰一刀流:B:str,新時代の夜明け:A:atk,お竜さんの守り:A:def',
  nemo: '対魔力C,騎乗A|海神の加護:B,航海者の知恵:A:insight,艦長の指揮:A:atk',
  // キャスター
  medea: '陣地作成A,道具作成A|高速神言:A,金羊の皮:EX:heal,魔術:A+',
  gilles: '陣地作成B,道具作成C|精神汚染:A:def,芸術審美:E-:insight,魔術:C',
  tamamo: '陣地作成C,道具作成B,神性A|呪術:EX:debuff,変化:A,狐の嫁入り:EX:charge',
  merlin: '陣地作成C,道具作成C|夢幻のカリスマ:A,幻術:A:debuff,英雄作成:EX:np',
  zhuge: '陣地作成A,道具作成B|鑑識眼:A:insight,軍師の忠言:A+:def,軍師の指揮:A+:atk',
  andersen: '陣地作成D,道具作成C|人間観察:A,無辜の怪物:D,高速詠唱:E',
  cu_caster: '陣地作成B,神性B|ルーン魔術:A:mag,矢避けの加護:A,叡智の結晶:C:heal',
  shakespeare: '陣地作成C,道具作成C|魔力付与:A+:atk,自己保存:B:def,人間観察:A',
  nursery: '陣地作成A|自己改造:A:heal,変化:A,魔術:C+',
  blavatsky: '陣地作成A,道具作成A|マハトマ:A:charge,高速詠唱:A:mag,魔術:A:np',
  murasaki: '陣地作成A,道具作成B|物語の加護:A:atk,泰山解説祭:A:heal,香の魔術:A:debuff',
  paracelsus: '陣地作成A,道具作成EX|高速詠唱:A,エレメンタル:A:mag,賢者の石:A:heal',
  avicebron: '陣地作成B,道具作成B|ゴーレム作成:A:def,生命の樹:A:np,魔術:A',
  sanzang: '陣地作成C,神性D|仏の加護:A,念仏:A:debuff,天竺への旅路:A:heal',
  skadi: '陣地作成A,神性B|原初のルーン:A,冬の女王:A:mag,狩猟の女神:A:crit',
  medea_lily: '陣地作成A,道具作成C|高速神言:C,魔術:A,純粋の祈り:A:heal',
  mozart: '陣地作成B,道具作成C|音楽神の加護:A:atk,芸術審美:B:insight,天才の旋律:A:np',
  artoria_caster: '陣地作成B,道具作成C|希望のカリスマ:B,湖の加護:A,選定の剣:EX:np',
  davinci: '陣地作成A,道具作成A|万能の人:EX:atk,黄金律:B,天才の証明:A:np',
  // アサシン
  kojiro: '気配遮断D|心眼（偽）:A,透化:C,宗和の心得:B:pierce',
  hassan: '気配遮断A+|風除けの加護:A:evade,自己改造:C:heal,投擲（短刀）:B:crit',
  jack: '気配遮断A+|霧夜の殺人:A:crit,情報抹消:B:debuff,外科手術:E:heal',
  jingke: '気配遮断A+|酒仙:B:atk,暗殺の心得:A:master,好機の一撃:A:crit',
  shiki: '気配遮断A|直死の魔眼:A:pierce,心眼（偽）:A,体術:A:agi',
  serenity: '気配遮断A+|妄想毒身:A:debuff,投擲（短刀）:C:crit,死の舞踏:A:charm',
  hundred: '気配遮断A|妄想多重人格:A:atk,情報抹消:B:debuff,群体の利:B:evade',
  carmilla: '気配遮断D|吸血:A,拷問技術:A,戦闘続行:B',
  shuten: '気配遮断C,神性C|鬼種の魔:A,戦闘続行:A+,果実の酒気:A:charm',
  kotaro: '気配遮断A+|破壊工作:A,忍術:A:agi,風魔の群れ:A:evade',
  danzo: '気配遮断A+|忍術:A:agi,機械仕掛けの体:B:def,飛び加藤:A:evade',
  izo: '気配遮断C|人斬り:A:crit,天賦の見識:A:insight,心眼（偽）:B',
  mata_hari: '気配遮断C|諜報:A++:debuff,魅了:A,恋の手管:A:master',
  yan_qing: '気配遮断A|中国武術:A:str,浪子の心得:A:agi,燕青拳:A:pierce',
  wu_zetian: '気配遮断C|酷吏の拷問:A:debuff,女帝の威光:A:atk,毒の皇帝:A:charm',
  // バーサーカー
  heracles: '狂化B,神性A|勇猛:A+,心眼（偽）:B,戦闘続行:A',
  lancelot: '狂化C|騎士は徒手にて死せず:A:atk,精霊の加護:A:crit,無窮の武練:A+',
  lubu: '狂化A|勇猛:B,戦闘続行:A,破壊工作:A',
  frankenstein: '狂化D|ガルバニズム:B:charge,虚ろなる生者の嘆き:D:debuff,過剰駆動:A:str',
  kintoki: '狂化E,神性D|怪力:A+,天性の肉体:C,動物会話:C:insight',
  spartacus: '狂化EX|被虐の誉れ:B:heal,不屈の意志:A:guts,叛逆の徒:EX:str',
  kiyohime: '狂化EX|変化:C,焔毒のブレス:C:debuff,ストーキング:B:insight',
  tamamo_cat: '狂化C,神性C|怪力:B,野生の勘:A:insight,恋するキャット:A:heal',
  beowulf: '狂化B|戦闘続行:B,心眼（偽）:B,喧嘩殺法:A:str',
  caligula: '狂化A+|加虐体質:A:str,皇帝特権:A,月の狂気:A:debuff',
  darius: '狂化B|黄金律:A,戦闘続行:A,王の威光:A:atk',
  vlad_berserker: '狂化EX|無辜の怪物:A,戦闘続行:A,吸血:C',
  ibaraki: '狂化B,神性C|鬼種の魔:A,変化:C,大江山の頭領:A:atk',
  raikou: '狂化EX,神性C|魔力放出（雷）:A+,神秘殺し:A:pierce,無窮の武練:A+',
  hijikata: '狂化B|戦闘続行:A,鬼の副長:A:atk,不屈:A:heal',
  nightingale: '狂化EX|人体理解:A:heal,天使の叫び:EX:debuff,鋼の看護:A:def',
  penthesilea: '狂化EX,神性C|戦闘続行:A,勇猛:A+,軍神の加護:A:atk',
  // エクストラクラス
  jeanne: '対魔力EX,真名看破B,神性E|啓示:A,カリスマ:C,聖人:B:heal',
  amakusa: '対魔力A,真名看破B|啓示:A,洗礼詠唱:A+:mag,奇蹟:D+:heal',
  martha_ruler: '対魔力A,真名看破D|信仰の加護:A:def,奇蹟:C:heal,竜鎮めの拳:A:str',
  holmes: '対魔力C,真名看破EX|初歩的なことだ:A:insight,バリツ:A:evade,計算された推理:EX:atk',
  jalter: '復讐者A,忘却補正A,自己回復（魔力）A+|自己改造:EX:atk,竜の魔女:EX:debuff,憤怒の焔:A:str',
  edmond: '復讐者A,忘却補正B,自己回復（魔力）D|鋼鉄の決意:EX:agi,黄金律:A,窮地の知恵:A:evade',
  gorgon: '復讐者B,忘却補正A,自己回復（魔力）A+,神性E-|魔眼:A++,怪力:A,蛇神の権能:A:heal',
  salieri: '復讐者C,忘却補正B,自己回復（魔力）C|無辜の怪物:EX,灰色の男:A:def,音楽家の妬み:A:atk',
  meltryllis: '対魔力B,女神の神核C|加虐体質:A:str,恋の吸収:A:charge,美しき白鳥:A:agi',
  passionlip: '対魔力C,女神の神核C|被虐体質:A:def,恋の呪い:A:charm,怪力:A+',
  okita_alter: '対魔力C,神性C|魔力放出:A,心眼（偽）:B,縮地:A',
  doman: '対魔力C,陣地作成A|呪術:A:debuff,陰陽術:A:mag,道満の企み:A:charge',
  bb: '対魔力C,陣地作成A|自己改造:EX:atk,黄金律:A,月の支配者:EX:debuff',
  abigail: '領域外の生命EX,神性B|信仰の祈り:C:heal,正気喪失:B:debuff,魔力放出（光）:A:mag',
  hokusai: '領域外の生命B,神性B|浮世の画工:A:atk,葛飾派の手法:A:mag,鉄の筆:A:pierce',
  mash: '対魔力A,騎乗C|誉れ堅き雪花の壁:A:def,時に煙る白亜の壁:A:evade,奮い断つ決意の盾:A:guts',
  oberon: '対魔力C,陣地作成B|夜のとばり:EX:charge,朝の夢:A:np,夢のおわり:EX:atk',
};

// ---- 解釈 ----
const SKILL_CACHE = {};
function skillsOf(sv) {
  if (!sv) return { cls: [], act: [] };
  if (SKILL_CACHE[sv.id]) return SKILL_CACHE[sv.id];
  const raw = SKILL_DATA[sv.id] || '|';
  const [c, a] = raw.split('|');
  const clsStr = c || CLASS_SKILL_DEFAULT[sv.cls] || '';
  const cls = clsStr.split(',').filter(Boolean).map(t => { const m = /^(.+?)(EX|[A-E][+\-]*)$/.exec(t.trim()); return m ? { name: m[1], rank: m[2], v: skillV(m[2]) } : null; }).filter(Boolean);
  const act = (a || '').split(',').filter(Boolean).map(t => { const [name, rank, code] = t.split(':'); return { name, rank, code: code || skillCode(name), v: skillV(rank) }; });
  return (SKILL_CACHE[sv.id] = { cls, act });
}
function classSkillV(sv, name) { const c = skillsOf(sv).cls.find(x => x.name === name); return c ? c.v : 0; }
function skillDesc(s) { return SKILL_FX[s.code].desc(s.v); }
function classDesc(c) { return CLASS_FX[c.name] ? CLASS_FX[c.name].desc(c.v) : '―'; }
// ステータス画面用
function skillListHTML(sv) {
  const s = skillsOf(sv);
  return `<div class="skill-list">${s.act.map(x => `<div><b>${x.name}</b><em>${x.rank}</em><span>${SKILL_FX[x.code].tag}：${skillDesc(x)}</span></div>`).join('')}</div>` +
    (s.cls.length ? `<div class="skill-list cls">${s.cls.map(x => `<div><b>${x.name}</b><em>${x.rank}</em><span>${classDesc(x)}</span></div>`).join('')}</div>` : '');
}

// =============================================================
//  戦闘での処理
//   side は 'me'（自分のサーヴァント）か 'en'（敵）
// =============================================================
function sideSv(side) { return side === 'me' ? servantOf(G) : servantOf(B.r); }
function skillInit() { B.sk = { me: {}, en: {} }; B.buf = { me: [], en: [] }; B.guts = { me: false, en: false }; B.evade = { me: 0, en: 0 }; B.stun = { me: false, en: false }; B.skill = null; }
function buffSum(side, code) { return (B.buf[side] || []).filter(b => b.code === code).reduce((s, b) => s + b.v, 0); }
// スキルを使う
function skillActivate(side, idx, log) {
  const sv = sideSv(side); const s = skillsOf(sv).act[idx]; if (!s || B.sk[side][idx]) return;
  B.sk[side][idx] = true;
  const who = side === 'me' ? servantOf(G).short : enemyName(); const foe = side === 'me' ? 'en' : 'me';
  const resist = () => { const t = sideSv(foe); const v = classSkillV(t, '対魔力') + classSkillV(t, '領域外の生命'); return Math.random() * 100 < v * 5; };
  let t = '';
  switch (s.code) {
    case 'heal': if (side === 'me') shp(s.v * 3); else B.r.hp = Math.min(B.r.hpMax, B.r.hp + s.v * 3); t = `HP+${s.v * 3}`; break;
    case 'charge': if (side === 'me') mp(s.v * 3); else B.r.mp = Math.min(100, B.r.mp + s.v * 3); t = `魔力+${s.v * 3}`; break;
    case 'guts': B.guts[side] = true; t = '戦闘続行の加護'; break;
    case 'evade': B.evade[side]++; t = '次の攻撃を回避する構え'; break;
    case 'insight': if (side === 'me') { B.sure = true; B.charge += s.v; } else B.echarge += s.v; t = '相手の動きを見切った'; break;
    case 'charm': if (resist()) t = '――だが、対魔力に阻まれた'; else { B.stun[foe] = Math.random() < 0.6; t = B.stun[foe] ? '相手の動きを封じた！' : '……相手は踏みとどまった'; } break;
    case 'debuff': if (resist()) { t = '――だが、対魔力に阻まれた'; break; } B.buf[side].push({ code: 'debuff', v: s.v, turns: 3 }); t = SKILL_FX.debuff.desc(s.v); break;
    case 'np': B.buf[side].push({ code: 'np', v: Math.round(s.v * 1.5), turns: 3 }); if (side === 'me') mp(10); else B.r.mp = Math.min(100, B.r.mp + 10); t = SKILL_FX.np.desc(s.v); break;
    default: B.buf[side].push({ code: s.code, v: s.code === 'atk' ? Math.ceil(s.v * 0.7) : s.code === 'def' ? Math.ceil(s.v * 0.8) : s.code === 'crit' ? s.v * 3 : s.code === 'pierce' ? Math.ceil(s.v / 2) : s.code === 'master' ? s.v * 2 : s.v, turns: 3 }); t = skillDesc(s);
  }
  log.push(`<span class="skill-use ${side}">【スキル】${who}「${s.name}」${s.rank}――${t}</span>`);
}
// 敵のスキル：ときどき使う（HPが減ると回復・戦闘続行を優先）
function enemySkillAI(log) {
  if (B.beast || B.boss) { if (Math.random() < 0.25) { B.buf.en.push({ code: 'atk', v: 6, turns: 2 }); log.push(`<span class="skill-use en">【スキル】${enemyName()}の霊基が膨れ上がる――攻撃強化</span>`); } return; }
  const list = skillsOf(sideSv('en')).act.map((s, i) => ({ s, i })).filter(x => !B.sk.en[x.i] && x.s.code !== 'master');
  if (!list.length || Math.random() > 0.3) return;
  const low = B.r.hp < B.r.hpMax * 0.45;
  const pref = low ? list.find(x => ['heal', 'guts', 'def'].includes(x.s.code)) : null;
  skillActivate('en', (pref || pick(list)).i, log);
}
// 判定への補正（tac：その側の行動、foeTac：相手の行動）
function skillMod(side, tac, foeTac) {
  const sv = sideSv(side); const foe = side === 'me' ? 'en' : 'me';
  let m = 0; const atk = ['str', 'agi', 'mag'].includes(tac);
  if (atk) m += buffSum(side, tac) + buffSum(side, 'atk');
  if (tac === 'np') m += buffSum(side, 'np') + Math.round(buffSum(side, 'atk') / 2);
  if (tac === 'agi') m += Math.ceil(classSkillV(sv, '騎乗') / 3);
  if (atk || tac === 'np') {
    m += Math.ceil(classSkillV(sv, '狂化') / 2) + Math.ceil(classSkillV(sv, '神性') / 4) + Math.ceil(classSkillV(sv, '女神の神核') / 4);
    const hp = side === 'me' ? G.servant.hp / servantHpMax() : B.r.hp / B.r.hpMax;
    if (hp < 0.5) m += Math.ceil(classSkillV(sv, '復讐者') / 2);
    if (tac === 'agi' || tac === 'str' || tac === 'mag') if (buffSum(side, 'pierce') && foeTac === 'guard') m += buffSum(side, 'pierce');
  }
  if (tac === 'mag') m -= Math.ceil(classSkillV(sideSv(foe), '対魔力') / 2);   // 相手の対魔力
  m -= buffSum(foe, 'debuff');                                                // 相手から受けた弱体
  if (B.round === 1 && side === 'me' && B.opt.ambush) m += classSkillV(sv, '気配遮断');
  if (side === 'me' && B.opt.defend) m += Math.ceil(classSkillV(sv, '陣地作成') / 2);
  return m;
}
function skillCrit(side) { return buffSum(side, 'crit') + classSkillV(sideSv(side), '忘却補正'); }
function skillPierce(side) { return buffSum(side, 'pierce') > 0; }
// 受けるダメージの補正（回避・防御強化・狂化・女神の神核）
function skillDamage(side, d, log) {
  if (B.evade[side] > 0) { B.evade[side]--; log.push(`<span class="note">${side === 'me' ? servantOf(G).short : enemyName()}は攻撃を見切ってかわした！</span>`); return 0; }
  const sv = sideSv(side);
  d = d - buffSum(side, 'def') + Math.ceil(classSkillV(sv, '狂化') / 4) - Math.ceil(classSkillV(sv, '女神の神核') / 4) - Math.ceil(classSkillV(sv, '領域外の生命') / 4);
  return Math.max(1, d);
}
// 手番の終わり：効果の残り手番を減らし、魔力の自己回復
function skillTick() {
  for (const side of ['me', 'en']) B.buf[side] = B.buf[side].map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0);
  const v = classSkillV(servantOf(G), '自己回復（魔力）'); if (v) mp(Math.ceil(v / 3));
  const ev = classSkillV(servantOf(B.r), '自己回復（魔力）'); if (ev) B.r.mp = Math.min(100, B.r.mp + Math.ceil(ev / 3));
}
// 毎日：単独行動・道具作成
function skillDaily() {
  if (!G.servant) return;
  const sv = servantOf(G);
  const solo = classSkillV(sv, '単独行動'); if (solo) mp(Math.ceil(solo / 2));
  const craft = classSkillV(sv, '道具作成'); if (craft && Math.random() * 100 < 10 + craft && (G.items.potion || 0) < ITEM_MAX) { item('potion', 1); G.news.push(`${SV()}が、道具作成のスキルで治癒の霊薬を作っておいてくれた。（治癒の霊薬+1）`); }
}
// 戦闘画面のスキル欄
function skillRowHTML() {
  const s = skillsOf(servantOf(G)).act; if (!s.length) return '';
  return `<div class="mact"><div class="mact-head">${SV()}のスキル <span>1戦闘に各1回・行動と一緒に使う</span></div><div class="mact-row">` +
    `<button class="chip ${B.skill == null ? 'on' : ''}" data-skill="-1" aria-pressed="${B.skill == null}">使わない<small></small></button>` +
    s.map((x, i) => `<button class="chip ${B.skill === i ? 'on' : ''}" data-skill="${i}" ${B.sk.me[i] ? 'disabled' : ''} aria-pressed="${B.skill === i}">${x.name}<small>${x.rank}・${SKILL_FX[x.code].tag}</small></button>`).join('') +
    '</div></div>';
}
