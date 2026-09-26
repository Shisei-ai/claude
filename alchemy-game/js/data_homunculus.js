// =============================================================
//  data_homunculus.js — ホムンクルス(人造生命)の定義
//
//  ・設備【培養の瓶】で素材からホムンクルスを培養する
//  ・生まれたホムンクルスは工房のNPCとなり、設備に1体ずつ配置できる
//  ・配置された設備を種類に応じて補助し、働くほどレベルが上がって効果が伸びる
//  ・働いている間は【培養液】を食べる。培養液が尽きると「空腹」で効果が止まる
// =============================================================

// ---- 種類 -----------------------------------------------------
// effect: 補助の種類 / base: Lv1の効果 / perLv: 1レベルごとの上昇
//   speed  … 生産速度 +x
//   save   … 素材を消費しない確率 +x
//   double … 生産物が2倍になる確率 +x
//   wisdom … その設備で得るA.Lv経験値 +x
const HOMUNCULI = {
  h_worker: { name: '働き手のホムンクルス', ch: '働', color: '#8fd3ff', effect: 'speed',  base: 0.30, perLv: 0.05,
    desc: '勤勉な小人。配置した設備の生産速度を上げる。' },
  h_saver:  { name: '倹約のホムンクルス',   ch: '倹', color: '#b5e27a', effect: 'save',   base: 0.10, perLv: 0.02,
    desc: '几帳面な小人。素材を無駄なく使い、消費しない確率を上げる。' },
  h_twin:   { name: '豊穣のホムンクルス',   ch: '豊', color: '#ffcf70', effect: 'double', base: 0.10, perLv: 0.02,
    desc: '陽気な小人。生産物が2倍になる確率を上げる。' },
  h_sage:   { name: '賢しきホムンクルス',   ch: '賢', color: '#d0a0ff', effect: 'wisdom', base: 0.50, perLv: 0.10,
    desc: '物知りな小人。配置した設備で得るA.Lv経験値を増やす。' },
};
const HOMU_EFFECT_TEXT = {
  speed: v => `生産速度 +${Math.round(v * 100)}%`,
  save: v => `素材を消費しない確率 +${Math.round(v * 100)}%`,
  double: v => `2倍生産の確率 +${Math.round(v * 100)}%`,
  wisdom: v => `A.Lv経験値 +${Math.round(v * 100)}%`,
};
const HOMU_MAX_LV = 10;         // レベル上限
const HOMU_PER_JAR = 3;         // 培養の瓶1台あたりの最大体数
const HOMU_FEED_SEC = 90;       // 働いている間、この秒数ごとに培養液を1つ食べる
const homuXpNeed = lv => Math.round(10 * Math.pow(lv, 1.5)); // 次のレベルまでの仕事回数

// 名前の候補(生まれた時にランダムで付く)
const HOMU_NAMES = ['ルゥ', 'ミィ', 'ポッコ', 'チト', 'ネム', 'ピピ', 'コロ', 'シズク', 'ホタル', 'モモ',
  'ツムギ', 'ユラ', 'ナギ', 'トト', 'リリ', 'ココ', 'スゥ', 'ハク', 'ノノ', 'キキ'];

// ---- アイテム -------------------------------------------------
ITEMS.nutrient = { name: '培養液', ch: '養', color: '#7fe0b0', cat: 'mid', desc: 'ホムンクルスの糧。働いている間に少しずつ食べる。' };
for (const [id, h] of Object.entries(HOMUNCULI)) {
  // 培養されるとすぐにNPCとして目覚める(空きが無い時だけ倉庫で眠って待つ)
  ITEMS[id] = { name: h.name, ch: h.ch, color: h.color, cat: 'homu', desc: h.desc };
}
ITEM_CATS.splice(ITEM_CATS.findIndex(c => c[0] === 'key'), 0, ['homu', '眠るホムンクルス']);

// ---- 設備 -----------------------------------------------------
MACHINES.incubator = { name: '培養の瓶', ch: '瓶', color: '#7fe0b0', desc: `ホムンクルスと培養液を生み出す。1台につき${HOMU_PER_JAR}体まで養える。`,
  cost: { glass: 10, pure_water: 5, essence: 10 } };

// ---- レシピ ---------------------------------------------------
Object.assign(RECIPES, {
  r_nutrient: { m: 'incubator', in: { essence: 2, water: 2, mana: 1 }, out: { nutrient: 3 }, t: 10, xp: 4 },
  r_h_worker: { m: 'incubator', in: { essence: 10, pure_water: 5, mana: 5, bone_powder: 5 }, out: { h_worker: 1 }, t: 120, xp: 40 },
  r_h_saver:  { m: 'incubator', in: { essence: 10, pure_water: 5, salt: 1, silver_powder: 5 }, out: { h_saver: 1 }, t: 150, xp: 60 },
  r_h_twin:   { m: 'incubator', in: { essence: 10, pure_water: 5, sun_dust: 10, gold: 1 }, out: { h_twin: 1 }, t: 150, xp: 60 },
  r_h_sage:   { m: 'incubator', in: { essence: 15, pure_water: 10, mercury: 1, crystal: 10 }, out: { h_sage: 1 }, t: 200, xp: 90 },
});

// ---- 書物 -----------------------------------------------------
BOOKS.push(
  { id: 'h_book1', kind: 'alchemy', lv: 7, sp: 2, name: 'ホムンクルス生成論',
    unlock: { machines: ['incubator'], recipes: ['r_nutrient', 'r_h_worker'] },
    text: ['フラスコの中の小人。錬金術師たちが幾世代も夢見た、人の手による生命。',
      '精髄と聖水を【培養の瓶】に満たし、骨の粉で形を与え、魔素で目覚めさせよ。',
      '生まれた小人は主を慕い、工房の仕事を手伝う。培養液を絶やさぬこと。飢えた小人は働かない。',
      '（頁の余白に、小さな落書きがある。瓶の中で笑う、小さな人影）'] },
  { id: 'h_book2', kind: 'alchemy', lv: 10, sp: 2, name: '小人たちの手記',
    unlock: { recipes: ['r_h_saver', 'r_h_twin'] },
    text: ['小人にも性格がある。塩を与えれば几帳面に、陽光と金を与えれば陽気に育つ。',
      'この手記は、工房の小人たちの観察記録である。……彼らは時々、歌を歌う。'] },
  { id: 'h_book3', kind: 'alchemy', lv: 14, sp: 2, name: '賢しき小人',
    unlock: { recipes: ['r_h_sage'] },
    text: ['水銀──精神の原質を与えられた小人は、言葉を覚え、書を読むようになる。',
      '彼らは錬金の理を主と共に学び、その学びを主へと還す。'] },
);
