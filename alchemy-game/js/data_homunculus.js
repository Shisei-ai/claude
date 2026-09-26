// =============================================================
//  data_homunculus.js — ホムンクルス(人造生命)の定義
//
//  ・設備【培養の瓶】で素材からホムンクルスを培養する
//  ・生まれた瞬間に「個体値(4つの能力値)」が決まる。同じ種類でも1体ずつ性能が違う
//  ・レアリティ(並/良/秀/極)は生まれる時の抽選で決まる。培養に「霊媒」を加えると上位が出やすくなる
//    (40体続けて【秀】以上が出なければ、次は必ず【秀】以上 = 天井)
//  ・レアリティが高いほど能力値の下限と上限・最大レベルが上がり、固有スキルを持って生まれる
//  ・賢者の石を使う「秘薬」で、生まれた後に能力値やレアリティを変えられる(クリア後)
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
// iv: 個体値の範囲 / maxLv: 最大レベル / skills: 生まれ持つ固有スキルの枠(どの等級から選ばれるか)
// book: このレアリティが抽選に出るようになる書物(【極】だけはクリア後の書物を読むまで出ない)
const HOMU_RARITIES = [
  { id: 'n',  name: '並', color: '#b8b8b8', iv: [1, 12],  maxLv: 10, skills: [] },
  { id: 'r',  name: '良', color: '#6fd6ff', iv: [4, 15],  maxLv: 15, skills: ['r'] },
  { id: 'sr', name: '秀', color: '#d08aff', iv: [8, 18],  maxLv: 20, skills: ['sr', 'r'] },
  { id: 'ur', name: '極', color: '#ffcf40', iv: [12, 20], maxLv: 25, skills: ['ur', 'sr'], book: 'h_post' },
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

// ---- 霊媒(レアリティの出やすさを変える素材) ----------------------
// item/n: 培養1回に加える霊媒と個数 / weights: レアリティごとの出やすさ(重み)
// time: 培養時間の倍率 / book: この霊媒を使った培養を解放する書物
// ※【極】がまだ解放されていない間は、極の重みは【秀】に回される
const HOMU_MEDIA = [
  { name: '霊媒なし',   item: null,           n: 0, weights: { n: 88, r: 10, sr: 2,  ur: 0 },  time: 1,   book: null },
  { name: '命の揺籃液', item: 'cradle_fluid', n: 2, weights: { n: 55, r: 35, sr: 9,  ur: 1 },  time: 1.3, book: 'h_book2' },
  { name: '月霊の結晶', item: 'moon_crystal', n: 2, weights: { n: 15, r: 50, sr: 30, ur: 5 },  time: 1.6, book: 'h_book4' },
  { name: '魂の萌芽',   item: 'soul_seed',    n: 1, weights: { n: 0,  r: 25, sr: 55, ur: 20 }, time: 2,   book: 'h_book4' },
];
const HOMU_PITY = 40; // 【秀】以上が出ないまま、この数だけ生まれたら次は必ず【秀】以上

// ---- 秘薬(生まれた後に個体値を変える。賢者の石が必要) ---------------
//   raise   … 選んだ能力値1つを +3(最大20)
//   reroll  … 能力値4つを、そのレアリティの範囲で振り直す(下がることもある)
//   ascend  … レアリティを1段階上げる(能力値の下限が上がり、スキル枠が増える)
const HOMU_ELIXIRS = {
  elixir_raise:  { name: '錬魂の秘薬', ch: '錬', color: '#ff8ab0', effect: 'raise',  amount: 3,
    in: { philosopher_stone: 1, quintessence: 2, soul_seed: 2 }, t: 300, xp: 600, desc: 'ホムンクルスの能力値1つを +3 する（最大20）。' },
  elixir_reroll: { name: '転生の秘薬', ch: '転', color: '#80d0ff', effect: 'reroll',
    in: { philosopher_stone: 1, red_tincture: 1, soul_seed: 3 }, t: 300, xp: 600, desc: 'ホムンクルスの能力値4つを、そのレアリティの範囲で振り直す。下がることもある。' },
  elixir_ascend: { name: '昇華の秘薬', ch: '昇', color: '#ffd84a', effect: 'ascend',
    in: { philosopher_stone: 2, boss_soul: 2, soul_seed: 5, primal_ember: 5 }, t: 600, xp: 1500, desc: 'ホムンクルスのレアリティを1段階上げる。能力値の下限が上がり、固有スキルが増える。' },
};

// ---- その他の定数 ----------------------------------------------
const HOMU_PER_JAR = 3;         // 培養の瓶1台あたりの最大体数
const HOMU_FEED_SEC = 90;       // 働いている間、この秒数ごとに培養液を1つ食べる(体力で伸びる)
const homuXpNeed = lv => Math.round(10 * Math.pow(lv, 1.5)); // 次のレベルまでに必要な経験
const HOMU_RELEASE_NUTRIENT = [3, 6, 12, 24]; // 瓶に還した時に戻る培養液(並/良/秀/極)

// 名前の候補(生まれた時にランダムで付く)
const HOMU_NAMES = ['ルゥ', 'ミィ', 'ポッコ', 'チト', 'ネム', 'ピピ', 'コロ', 'シズク', 'ホタル', 'モモ',
  'ツムギ', 'ユラ', 'ナギ', 'トト', 'リリ', 'ココ', 'スゥ', 'ハク', 'ノノ', 'キキ'];

// ---- 素材 -----------------------------------------------------
// ホムンクルスのための新しい素材(採取・魔物)と、それを加工した霊媒
Object.assign(ITEMS, {
  nutrient:     { name: '培養液',     ch: '養', color: '#7fe0b0', cat: 'mid',  desc: 'ホムンクルスの糧。働いている間に少しずつ食べる。' },
  life_moss:    { name: '生命の苔',   ch: '苔', color: '#7fd07a', cat: 'raw',  desc: '芽吹き森の古木の根元に、まれに生える苔。触れると脈打つ。' },
  moonstone:    { name: '月長石',     ch: '月', color: '#d8e4ff', cat: 'raw',  desc: '霧深い鉱山の奥で、まれに見つかる青白い石。霊を宿しやすい。' },
  fairy_dust:   { name: '妖精の鱗粉', ch: '鱗', color: '#f0d0ff', cat: 'drop', desc: '雪の精が散らす、きらめく粉。生命に形を与える力がある。' },
  cradle_fluid: { name: '命の揺籃液', ch: '揺', color: '#9fe8a8', cat: 'mid',  desc: '霊媒。培養に加えると、良質なホムンクルスが生まれやすくなる。' },
  moon_crystal: { name: '月霊の結晶', ch: '霊', color: '#c0d0ff', cat: 'mid',  desc: '霊媒。培養に加えると、【良】【秀】が生まれやすくなる。' },
  soul_seed:    { name: '魂の萌芽',   ch: '萌', color: '#ffb0d8', cat: 'mid',  desc: '最上の霊媒。培養に加えると【秀】以上が生まれやすくなる。秘薬の素材にもなる。' },
});
for (const [id, e] of Object.entries(HOMU_ELIXIRS)) ITEMS[id] = { name: e.name, ch: e.ch, color: e.color, cat: 'use', desc: e.desc + '（ホムンクルスタブで使う）' };
FIELDS.forest.nodes.push(['life_moss', 0.8, 1, 2]);
FIELDS.mine.nodes.push(['moonstone', 0.8, 1, 2]);
ENEMIES.frostspirit.drops.push(['fairy_dust', 0.3, 1, 2]);

// ---- 設備・レシピ・書物 -------------------------------------------
MACHINES.incubator = { name: '培養の瓶', ch: '瓶', color: '#7fe0b0', desc: `ホムンクルス・培養液・秘薬を生み出す。1台につき${HOMU_PER_JAR}体まで養える。`,
  cost: { glass: 10, pure_water: 5, essence: 10 } };
Object.assign(RECIPES, {
  r_nutrient:   { m: 'incubator', in: { essence: 2, water: 2, mana: 1 }, out: { nutrient: 3 }, t: 10, xp: 4 },
  r_cradle:     { m: 'purifier',  in: { life_moss: 3, essence: 5, pure_water: 3 }, out: { cradle_fluid: 1 }, t: 20, xp: 12 },
  r_mooncrystal:{ m: 'enchanter', in: { moonstone: 2, crystal: 5, mana: 8 }, out: { moon_crystal: 1 }, t: 30, xp: 25 },
  r_soulseed:   { m: 'cauldron',  in: { soul_ash: 8, fairy_dust: 3, quintessence: 1 }, out: { soul_seed: 1 }, t: 45, xp: 60 },
});
for (const [id, e] of Object.entries(HOMU_ELIXIRS)) RECIPES[`r_${id}`] = { m: 'incubator', in: e.in, out: { [id]: 1 }, t: e.t, xp: e.xp };

const HOMU_BOOKS = [
  { id: 'h_book1', kind: 'alchemy', lv: 7, sp: 2, name: 'ホムンクルス生成論', machines: ['incubator'], recipes: ['r_nutrient'],
    text: ['フラスコの中の小人。錬金術師たちが幾世代も夢見た、人の手による生命。',
      '精髄と聖水を【培養の瓶】に満たし、骨の粉で形を与え、魔素で目覚めさせよ。',
      '小人は一体ごとに器用さも、体の強さも、賢さも違う。同じ瓶から生まれても、同じ者は二つとない。',
      '培養液を絶やさぬこと。飢えた小人は働かない。'] },
  { id: 'h_book2', kind: 'alchemy', lv: 10, sp: 2, name: '小人たちの手記', recipes: ['r_cradle'],
    text: ['小人にも性格がある。塩を与えれば几帳面に、陽光と金を与えれば陽気に育つ。',
      '芽吹き森の古木の根元には、脈打つ苔が生えることがある。それを精髄と聖水に溶いた「揺籃液」を瓶に加えると、良質な小人が生まれやすい。',
      'もっとも、何が生まれるかは瓶の気まぐれだ。'] },
  { id: 'h_book3', kind: 'alchemy', lv: 14, sp: 2, name: '賢しき小人',
    text: ['水銀──精神の原質を与えられた小人は、言葉を覚え、書を読むようになる。',
      '彼らは錬金の理を主と共に学び、その学びを主へと還す。'] },
  { id: 'h_book4', kind: 'alchemy', lv: 15, sp: 2, name: '秀でし小人', recipes: ['r_mooncrystal', 'r_soulseed'],
    text: ['霧の鉱山の月長石、雪の精の鱗粉、冥界の魂の残滓。', 'それらから作る霊媒──「月霊の結晶」と「魂の萌芽」は、秀でた小人を呼び寄せる。',
      '瓶は幾度も空振りする。だが四十も続けて凡庸な小人が生まれることは、まず無い。'] },
  { id: 'h_post', kind: 'alchemy', lv: 20, sp: 3, after: 'ended', name: '極めし人造生命',
    text: ['霊媒を尽くした瓶の底に、ごく稀に、金色に輝く小人が生まれることがある。', '【極】。種ごとに伝説の技を宿し、もはや人の似姿を越えている。',
      '……彼らは、私たちのことをどう見ているのだろう。'] },
  { id: 'h_elixir', kind: 'alchemy', lv: 18, sp: 3, after: 'ended', name: '人造生命の秘奥', recipes: Object.keys(HOMU_ELIXIRS).map(id => `r_${id}`),
    text: ['生まれ持った器は変えられない──それが錬金術の常識だった。', 'だが賢者の石は「在るべき姿」へ導く石。小人の魂に溶かせば、その器さえ作り変えられる。',
      '錬魂、転生、昇華。いずれも賢者の石を惜しみなく注ぐ、狂気の業である。'] },
];

// 種類 × 霊媒ごとに、培養のアイテム(生まれる瞬間にレアリティを抽選)とレシピを作る
// レシピを解放する書物は「種類の書物」と「霊媒の書物」のうち、後に読めるほう
const homuBookRecipes = {};
for (const [type, h] of Object.entries(HOMUNCULI)) {
  HOMU_MEDIA.forEach((M, k) => {
    const id = `${type}_m${k}`;
    ITEMS[id] = { name: k ? `${h.name}〔${M.name}〕` : h.name, ch: h.ch, color: h.color, cat: 'homu', homuType: type, media: k, desc: h.desc };
    const inputs = Object.assign({}, h.in);
    if (M.item) inputs[M.item] = M.n;
    RECIPES[`r_${id}`] = { m: 'incubator', in: inputs, out: { [id]: 1 }, t: Math.round(h.t * M.time), xp: Math.round(h.xp * M.time) };
    const books = [h.book, M.book].filter(Boolean).map(bid => HOMU_BOOKS.find(b => b.id === bid));
    const book = books.sort((a, b) => a.lv - b.lv).pop();
    (homuBookRecipes[book.id] = homuBookRecipes[book.id] || []).push(`r_${id}`);
  });
}
for (const b of HOMU_BOOKS) {
  BOOKS.push({ id: b.id, kind: b.kind, lv: b.lv, sp: b.sp, name: b.name, after: b.after, text: b.text,
    unlock: { machines: b.machines, recipes: (b.recipes || []).concat(homuBookRecipes[b.id] || []) } });
}
ITEM_CATS.splice(ITEM_CATS.findIndex(c => c[0] === 'key'), 0, ['homu', 'ホムンクルス']);

// 物質変換(クリア後)にも、ホムンクルスの素材を追加
for (const [item, n, mana] of [['life_moss', 8, 6], ['moonstone', 6, 8], ['fairy_dust', 5, 8]]) {
  TRANSMUTES.push([item, n, mana]);
  RECIPES[`t_${item}`] = { m: 'transmuter', in: { stone_shard: 1, mana }, out: { [item]: n }, t: 20, xp: 20 };
  BOOKS.find(b => b.id === 'p_trans').unlock.recipes.push(`t_${item}`);
}
