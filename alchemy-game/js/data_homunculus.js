// =============================================================
//  data_homunculus.js — ホムンクルス(人造生命)の定義
//
//  ・設備【培養の瓶】で素材からホムンクルスを培養する
//  ・生まれた瞬間に「個体値(4つの能力値)」が決まる。同じ種類でも1体ずつ性能が違う
//  ・培養に「霊媒」素材を加えるとレアリティが上がり、能力値の下限と上限・最大レベルが上がり、
//    固有スキルを持って生まれる
//  ・工房のNPCとして設備に1体ずつ配置でき、働くほどレベルが上がって効果が伸びる
//  ・働いている間は【培養液】を食べる。培養液が尽きると「空腹」で効果が止まる
// =============================================================

// ---- 種類 -----------------------------------------------------
// effect: 本来の仕事 / base: Lv1の効果 / perLv: 1レベルごとの上昇 / book: この種類を解放する書物
//   speed  … 生産速度 +x
//   save   … 素材を消費しない確率 +x
//   double … 生産物が2倍になる確率 +x
//   wisdom … その設備で得るA.Lv経験値 +x
const HOMUNCULI = {
  h_worker: { name: '働き手のホムンクルス', short: '働き手', ch: '働', color: '#8fd3ff', effect: 'speed',  base: 0.30, perLv: 0.04, book: 'h_book1',
    in: { essence: 10, pure_water: 5, mana: 5, bone_powder: 5 }, t: 120, xp: 40, desc: '勤勉な小人。配置した設備の生産速度を上げる。' },
  h_saver:  { name: '倹約のホムンクルス',   short: '倹約',   ch: '倹', color: '#b5e27a', effect: 'save',   base: 0.10, perLv: 0.015, book: 'h_book2',
    in: { essence: 10, pure_water: 5, salt: 1, silver_powder: 5 }, t: 150, xp: 60, desc: '几帳面な小人。素材を無駄なく使い、消費しない確率を上げる。' },
  h_twin:   { name: '豊穣のホムンクルス',   short: '豊穣',   ch: '豊', color: '#ffcf70', effect: 'double', base: 0.10, perLv: 0.015, book: 'h_book2',
    in: { essence: 10, pure_water: 5, sun_dust: 10, gold: 1 }, t: 150, xp: 60, desc: '陽気な小人。生産物が2倍になる確率を上げる。' },
  h_sage:   { name: '賢しきホムンクルス',   short: '賢しき', ch: '賢', color: '#d0a0ff', effect: 'wisdom', base: 0.50, perLv: 0.08, book: 'h_book3',
    in: { essence: 15, pure_water: 10, mercury: 1, crystal: 10 }, t: 200, xp: 90, desc: '物知りな小人。配置した設備で得るA.Lv経験値を増やす。' },
};
const HOMU_EFFECT_TEXT = {
  speed: v => `生産速度 +${Math.round(v * 100)}%`,
  save: v => `素材を消費しない確率 +${Math.round(v * 100)}%`,
  double: v => `2倍生産の確率 +${Math.round(v * 100)}%`,
  wisdom: v => `A.Lv経験値 +${Math.round(v * 100)}%`,
};

// ---- 個体値(能力値) -------------------------------------------
// 生まれた瞬間に 1〜20 の範囲で決まる(レアリティが高いほど下限・上限が上がる)
//   器用 … 本来の仕事の効果      ×(0.7 + 0.03×器用)   → 0.73倍〜1.30倍
//   体力 … 培養液を食べる間隔    ×(0.8 + 0.03×体力)   → 0.83倍〜1.40倍
//   知性 … 成長(経験)の早さ      ×(0.5 + 0.075×知性)  → 0.58倍〜2.00倍
//   幸運 … 2倍生産の確率        +0.5%×幸運           → +0.5%〜+10%
const HOMU_STATS = [
  ['dex', '器用', '仕事の効果'],
  ['vit', '体力', '食事の間隔'],
  ['int', '知性', '成長の早さ'],
  ['luk', '幸運', '2倍生産の確率'],
];
const HOMU_STAT_MAX = 20;
// 能力値の評価(S〜D)
const homuGrade = v => (v >= 18 ? 'S' : v >= 15 ? 'A' : v >= 11 ? 'B' : v >= 7 ? 'C' : 'D');

// ---- レアリティ -------------------------------------------------
// extra: 基本の素材に追加する「霊媒」 / iv: 個体値の範囲 / maxLv: 最大レベル
// skills: 生まれ持つ固有スキルの枠(どの等級から選ばれるか) / time: 培養時間の倍率 / book: 解放する書物
const HOMU_RARITIES = [
  { id: 'n',  name: '並', color: '#b8b8b8', extra: {}, iv: [1, 12], maxLv: 10, skills: [], time: 1, book: null },
  { id: 'r',  name: '良', color: '#6fd6ff', extra: { pure_core: 2, crystal: 5 }, iv: [4, 15], maxLv: 15, skills: ['r'], time: 1.5, book: 'h_book2' },
  { id: 'sr', name: '秀', color: '#d08aff', extra: { quintessence: 1, gold: 2 }, iv: [8, 18], maxLv: 20, skills: ['sr', 'r'], time: 2, book: 'h_book4' },
  { id: 'ur', name: '極', color: '#ffcf40', extra: { stone_shard: 2, boss_soul: 1 }, iv: [12, 20], maxLv: 25, skills: ['ur', 'sr'], time: 3, book: 'h_post' },
];
const homuRarity = id => HOMU_RARITIES.find(r => r.id === id) || HOMU_RARITIES[0];

// ---- 固有スキル ---------------------------------------------------
// rank: どのレアリティの枠から出るか(ur はその種類専用の伝説スキル)
// mod: 効果
//   speed/save/double/wisdom … 配置した設備への上乗せ
//   feed … 培養液を食べる間隔 +x / grow … 成長の早さ +x
//   hungryWork … 空腹でも半分の力で働く / triple … 2倍生産がさらに3倍になる確率
//   globalSpeed … 工房全体の生産速度 +x / globalGrow … 全ホムンクルスの成長 +x
const HOMU_SKILLS = {
  diligent:  { rank: 'r', name: '勤勉',   desc: '生産速度 +10%', mod: { speed: 0.10 } },
  frugal:    { rank: 'r', name: '節約家', desc: '素材を消費しない確率 +5%', mod: { save: 0.05 } },
  smalleat:  { rank: 'r', name: '小食',   desc: '培養液を食べる間隔 +50%', mod: { feed: 0.5 } },
  quick:     { rank: 'r', name: '物覚え', desc: '成長の早さ +50%', mod: { grow: 0.5 } },
  artisan:   { rank: 'sr', name: '職人気質', desc: '2倍生産の確率 +8%', mod: { double: 0.08 } },
  scholar:   { rank: 'sr', name: '学究',     desc: 'A.Lv経験値 +25%', mod: { wisdom: 0.25 } },
  tireless:  { rank: 'sr', name: '不屈',     desc: '空腹でも半分の力で働き続ける', mod: { hungryWork: true } },
  cheer:     { rank: 'sr', name: '鼓舞',     desc: '工房全体の生産速度 +5%', mod: { globalSpeed: 0.05 } },
  mentor:    { rank: 'sr', name: '教導',     desc: '全ホムンクルスの成長 +20%', mod: { globalGrow: 0.2 } },
  leg_worker: { rank: 'ur', type: 'h_worker', name: '疾風の手',   desc: '生産速度 +40%、工房全体の生産速度 +5%', mod: { speed: 0.4, globalSpeed: 0.05 } },
  leg_saver:  { rank: 'ur', type: 'h_saver',  name: '無駄なき手', desc: '素材を消費しない確率 +20%', mod: { save: 0.2 } },
  leg_twin:   { rank: 'ur', type: 'h_twin',   name: '黄金の双子', desc: '2倍生産の確率 +8%、2倍生産の20%が3倍になる', mod: { double: 0.08, triple: 0.2 } },
  leg_sage:   { rank: 'ur', type: 'h_sage',   name: '大賢',       desc: 'A.Lv経験値 +60%、全ホムンクルスの成長 +30%', mod: { wisdom: 0.6, globalGrow: 0.3 } },
};
const HOMU_GLOBAL_SPEED_CAP = 0.3; // 工房全体への速度上乗せの上限
const HOMU_SAVE_CAP = 0.8;         // 素材を消費しない確率の上限

// ---- その他の定数 ----------------------------------------------
const HOMU_PER_JAR = 3;         // 培養の瓶1台あたりの最大体数
const HOMU_FEED_SEC = 90;       // 働いている間、この秒数ごとに培養液を1つ食べる(体力で伸びる)
const homuXpNeed = lv => Math.round(10 * Math.pow(lv, 1.5)); // 次のレベルまでに必要な経験
const HOMU_RELEASE_NUTRIENT = [3, 6, 12, 24]; // 瓶に還した時に戻る培養液(並/良/秀/極)

// 名前の候補(生まれた時にランダムで付く)
const HOMU_NAMES = ['ルゥ', 'ミィ', 'ポッコ', 'チト', 'ネム', 'ピピ', 'コロ', 'シズク', 'ホタル', 'モモ',
  'ツムギ', 'ユラ', 'ナギ', 'トト', 'リリ', 'ココ', 'スゥ', 'ハク', 'ノノ', 'キキ'];

// ---- アイテム・設備・レシピ・書物 ---------------------------------
ITEMS.nutrient = { name: '培養液', ch: '養', color: '#7fe0b0', cat: 'mid', desc: 'ホムンクルスの糧。働いている間に少しずつ食べる。' };
MACHINES.incubator = { name: '培養の瓶', ch: '瓶', color: '#7fe0b0', desc: `ホムンクルスと培養液を生み出す。1台につき${HOMU_PER_JAR}体まで養える。`,
  cost: { glass: 10, pure_water: 5, essence: 10 } };
RECIPES.r_nutrient = { m: 'incubator', in: { essence: 2, water: 2, mana: 1 }, out: { nutrient: 3 }, t: 10, xp: 4 };

const HOMU_BOOKS = [
  { id: 'h_book1', kind: 'alchemy', lv: 7, sp: 2, name: 'ホムンクルス生成論', machines: ['incubator'], recipes: ['r_nutrient'],
    text: ['フラスコの中の小人。錬金術師たちが幾世代も夢見た、人の手による生命。',
      '精髄と聖水を【培養の瓶】に満たし、骨の粉で形を与え、魔素で目覚めさせよ。',
      '小人は一体ごとに器用さも、体の強さも、賢さも違う。同じ瓶から生まれても、同じ者は二つとない。',
      '培養液を絶やさぬこと。飢えた小人は働かない。'] },
  { id: 'h_book2', kind: 'alchemy', lv: 10, sp: 2, name: '小人たちの手記',
    text: ['小人にも性格がある。塩を与えれば几帳面に、陽光と金を与えれば陽気に育つ。',
      '瓶に浄化核と魔晶を「霊媒」として加えると、より良質な小人──【良】が生まれる。良質な小人は、生まれながらに特技を持つ。'] },
  { id: 'h_book3', kind: 'alchemy', lv: 14, sp: 2, name: '賢しき小人',
    text: ['水銀──精神の原質を与えられた小人は、言葉を覚え、書を読むようになる。',
      '彼らは錬金の理を主と共に学び、その学びを主へと還す。'] },
  { id: 'h_book4', kind: 'alchemy', lv: 15, sp: 2, name: '秀でし小人',
    text: ['第五元素と金を霊媒とせよ。生まれる小人は【秀】──二つの特技を持ち、工房全体を導くことさえある。'] },
  { id: 'h_post', kind: 'alchemy', lv: 20, sp: 3, after: 'ended', name: '極めし人造生命',
    text: ['賢者の石の欠片と、主の魂晶。', 'それを霊媒として生まれる小人は【極】。種ごとに伝説の技を宿し、もはや人の似姿を越えている。',
      '……彼らは、私たちのことをどう見ているのだろう。'] },
];

// 種類 × レアリティごとに、アイテム(培養の結果)とレシピを作る
// レシピを解放する書物は「種類の書物」と「レアリティの書物」のうち、後に読めるほう
const homuBookRecipes = {};
for (const [type, h] of Object.entries(HOMUNCULI)) {
  for (const R of HOMU_RARITIES) {
    const id = `${type}_${R.id}`;
    ITEMS[id] = { name: `${h.name}【${R.name}】`, ch: h.ch, color: h.color, cat: 'homu', homuType: type, rarity: R.id, desc: h.desc };
    const inputs = Object.assign({}, h.in);
    for (const [k, v] of Object.entries(R.extra)) inputs[k] = (inputs[k] || 0) + v;
    RECIPES[`r_${id}`] = { m: 'incubator', in: inputs, out: { [id]: 1 }, t: Math.round(h.t * R.time), xp: Math.round(h.xp * R.time) };
    const books = [h.book, R.book].filter(Boolean).map(bid => HOMU_BOOKS.find(b => b.id === bid));
    const book = books.sort((a, b) => (a.after ? 100 : 0) + a.lv - ((b.after ? 100 : 0) + b.lv)).pop();
    (homuBookRecipes[book.id] = homuBookRecipes[book.id] || []).push(`r_${id}`);
  }
}
for (const b of HOMU_BOOKS) {
  BOOKS.push({ id: b.id, kind: b.kind, lv: b.lv, sp: b.sp, name: b.name, after: b.after, text: b.text,
    unlock: { machines: b.machines, recipes: (b.recipes || []).concat(homuBookRecipes[b.id] || []) } });
}
ITEM_CATS.splice(ITEM_CATS.findIndex(c => c[0] === 'key'), 0, ['homu', 'ホムンクルス']);
