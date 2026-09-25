// =============================================================
//  data_post.js — クリア後(やり込み)要素の定義データ
//    ・装備・触媒錬成   … 【錬装の炉】で杖・法衣・触媒を作り、装備する
//    ・物質変換         … 【変成の祭壇】で賢者の石の欠片を触媒に、採取素材を生み出す
//    ・冥界の深層       … どこまでも続く階層ダンジョン
//    ・強化ボスへの再戦 … 各地の主に何度でも挑み、ランクを上げていく
//  いずれも物語を終えた後に現れる書物を読むことで解放される。
//  data.js の後に読み込み、data.js の表に項目を追加する。
// =============================================================

// ---- アイテム -------------------------------------------------
Object.assign(ITEMS, {
  // 物質変換
  stone_shard:  { name: '賢者の石の欠片', ch: '片', color: '#ff5a7a', cat: 'mid', desc: '賢者の石を砕いた欠片。物質変換の触媒になる。' },
  // 冥界の深層でしか手に入らない素材
  abyss_shard:  { name: '深淵の欠片', ch: '淵', color: '#5a4aa0', cat: 'raw',  desc: '冥界の深層に散らばる、光を吸う結晶。' },
  void_essence: { name: '虚無の雫',   ch: '虚', color: '#30c0c0', cat: 'drop', desc: '深層の魔物が宿す、何物でもない力。' },
  primal_ember: { name: '原初の火種', ch: '原', color: '#ff9a30', cat: 'raw',  desc: '世界が生まれた時の火の名残。深層の奥でのみ見つかる。' },
  // 強化ボスの素材
  forest_core:  { name: '古王の樹核',   ch: '樹', color: '#7fcf5f', cat: 'drop', desc: '森の古王の心臓部。' },
  desert_core:  { name: '大蠍の毒晶',   ch: '毒', color: '#d0a040', cat: 'drop', desc: '砂塵の大蠍の尾に結晶化した猛毒。' },
  mine_core:    { name: '巨像の魔核',   ch: '核', color: '#9aa0c0', cat: 'drop', desc: '霧喰らいの巨像を動かしていた魔核。' },
  snow_core:    { name: '狼王の氷牙',   ch: '王', color: '#bff0ff', cat: 'drop', desc: '氷獄の狼王の、決して融けない牙。' },
});
ITEM_CATS.splice(ITEM_CATS.findIndex(c => c[0] === 'key'), 0, ['equip', '装備']);

// ---- 装備 -----------------------------------------------------
// slot: staff=杖 / robe=法衣 / catalyst=触媒
//   杖  … dmg: 与ダメージ +x
//   法衣 … hp: 最大HP +x, guard: 被ダメージ -x
//   触媒 … boost: { 魔法ID: 威力+x } / regen: MP回復 +x / cd: 再使用時間 -x / hpMult: 最大HP +x / heal: 回復量 +x
const EQUIP_SLOTS = [['staff', '杖'], ['robe', '法衣'], ['catalyst', '触媒']];
const EQUIPS = {
  staff1: { slot: 'staff', name: '樫の魔杖',   ch: '杖', color: '#b08050', dmg: 0.10, desc: '古木を削り出した魔杖。' },
  staff2: { slot: 'staff', name: '銀晶の杖',   ch: '杖', color: '#c9d3de', dmg: 0.25, desc: '銀と魔晶を嵌め込んだ杖。' },
  staff3: { slot: 'staff', name: '魔鉄の杖',   ch: '杖', color: '#7d8cff', dmg: 0.45, desc: '魔鉄を芯にした重い杖。' },
  staff4: { slot: 'staff', name: '金冥の杖',   ch: '杖', color: '#ffcf40', dmg: 0.70, desc: '錬金の金と虚無の雫で鍛えた杖。' },
  staff5: { slot: 'staff', name: '賢者の杖',   ch: '杖', color: '#ff2050', dmg: 1.10, desc: '賢者の石の欠片を戴く、至高の杖。' },
  robe1:  { slot: 'robe', name: '旅の外套',     ch: '衣', color: '#8a7a5a', hp: 30,  guard: 0.05, desc: '獣の牙で留めた丈夫な外套。' },
  robe2:  { slot: 'robe', name: '聖布の法衣',   ch: '衣', color: '#fff3b0', hp: 60,  guard: 0.10, desc: '聖水で清めた布の法衣。' },
  robe3:  { slot: 'robe', name: '冥布の法衣',   ch: '衣', color: '#8a6caa', hp: 100, guard: 0.16, desc: '魂の残滓を織り込んだ法衣。' },
  robe4:  { slot: 'robe', name: '虚無の衣',     ch: '衣', color: '#30c0c0', hp: 150, guard: 0.22, desc: '虚無の雫で染めた衣。刃が滑る。' },
  robe5:  { slot: 'robe', name: '第五元素の衣', ch: '衣', color: '#ffffff', hp: 220, guard: 0.30, desc: '第五元素を纏う衣。在るべき姿を保ち続ける。' },
  cat_fire:    { slot: 'catalyst', name: '紅蓮の触媒', ch: '触', color: '#ff7a3d', boost: { fire: 0.5 }, desc: '火球系の威力 +50%' },
  cat_ice:     { slot: 'catalyst', name: '凍晶の触媒', ch: '触', color: '#9fe3ff', boost: { ice: 0.5 }, desc: '氷槍系の威力 +50%' },
  cat_thunder: { slot: 'catalyst', name: '雷霆の触媒', ch: '触', color: '#ffe66b', boost: { thunder: 0.5 }, desc: '雷鎖系の威力 +50%' },
  cat_wind:    { slot: 'catalyst', name: '疾風の触媒', ch: '触', color: '#b8ffd8', boost: { nova: 0.5 }, desc: '風陣系の威力 +50%' },
  cat_light:   { slot: 'catalyst', name: '煌光の触媒', ch: '触', color: '#fff7c2', boost: { light: 0.5, bolt: 0.3 }, desc: '反証の光系 +50%、魔弾系 +30%' },
  cat_cycle:   { slot: 'catalyst', name: '循環の触媒', ch: '触', color: '#9d7bff', regen: 0.8, desc: 'MP自然回復 +80%' },
  cat_swift:   { slot: 'catalyst', name: '迅速の触媒', ch: '触', color: '#6fdc8c', cd: 0.15, desc: '全魔法の再使用時間 -15%' },
  cat_life:    { slot: 'catalyst', name: '生命の触媒', ch: '触', color: '#ff8a8a', hpMult: 0.2, heal: 0.5, desc: '最大HP +20%、治癒系の回復量 +50%' },
};
for (const [id, e] of Object.entries(EQUIPS)) ITEMS[id] = { name: e.name, ch: e.ch, color: e.color, cat: 'equip', desc: e.desc };

// ---- 設備 -----------------------------------------------------
Object.assign(MACHINES, {
  forge:      { name: '錬装の炉',   ch: '装', color: '#ff9a30', desc: '杖・法衣・触媒を錬成する。', cost: { stone: 50, iron_ingot: 20, enchanted_iron: 5 } },
  transmuter: { name: '変成の祭壇', ch: '変', color: '#ff5a7a', desc: '賢者の石の欠片を触媒に、物質を別の物質へ変える。', cost: { gold: 10, quintessence: 1, pure_core: 10 } },
});

// ---- レシピ ---------------------------------------------------
Object.assign(RECIPES, {
  r_shard:   { m: 'mortar', in: { philosopher_stone: 1 }, out: { stone_shard: 12 }, t: 30, xp: 50 },
  // 杖
  e_staff1:  { m: 'forge', in: { wood: 20, essence: 10, mana: 10 }, out: { staff1: 1 }, t: 40, xp: 60 },
  e_staff2:  { m: 'forge', in: { staff1: 1, silver_ingot: 10, crystal: 10, forest_core: 3 }, out: { staff2: 1 }, t: 80, xp: 150 },
  e_staff3:  { m: 'forge', in: { staff2: 1, enchanted_iron: 10, desert_core: 3, abyss_shard: 20 }, out: { staff3: 1 }, t: 120, xp: 300 },
  e_staff4:  { m: 'forge', in: { staff3: 1, gold: 10, mine_core: 3, void_essence: 10 }, out: { staff4: 1 }, t: 180, xp: 600 },
  e_staff5:  { m: 'forge', in: { staff4: 1, stone_shard: 10, snow_core: 3, nether_heart: 1, primal_ember: 5 }, out: { staff5: 1 }, t: 300, xp: 1200 },
  // 法衣
  e_robe1:   { m: 'forge', in: { slime_gel: 20, wolf_fang: 10, essence: 10 }, out: { robe1: 1 }, t: 40, xp: 60 },
  e_robe2:   { m: 'forge', in: { robe1: 1, pure_water: 20, pure_core: 5, forest_core: 2 }, out: { robe2: 1 }, t: 80, xp: 150 },
  e_robe3:   { m: 'forge', in: { robe2: 1, soul_ash: 30, nether_stone: 20, mine_core: 2 }, out: { robe3: 1 }, t: 120, xp: 300 },
  e_robe4:   { m: 'forge', in: { robe3: 1, void_essence: 20, snow_core: 3, abyss_shard: 40 }, out: { robe4: 1 }, t: 180, xp: 600 },
  e_robe5:   { m: 'forge', in: { robe4: 1, quintessence: 3, primal_ember: 8, nether_heart: 1 }, out: { robe5: 1 }, t: 300, xp: 1200 },
  // 触媒
  e_cat_fire:    { m: 'forge', in: { sulfur: 3, sun_dust: 20, desert_core: 2 }, out: { cat_fire: 1 }, t: 120, xp: 250 },
  e_cat_ice:     { m: 'forge', in: { salt: 3, ice: 20, snow_core: 2 }, out: { cat_ice: 1 }, t: 120, xp: 250 },
  e_cat_thunder: { m: 'forge', in: { mercury: 3, crystal: 20, mine_core: 2 }, out: { cat_thunder: 1 }, t: 120, xp: 250 },
  e_cat_wind:    { m: 'forge', in: { alkahest: 2, frost_flower: 20, forest_core: 2 }, out: { cat_wind: 1 }, t: 120, xp: 250 },
  e_cat_light:   { m: 'forge', in: { quintessence: 2, pure_core: 10, nether_heart: 1 }, out: { cat_light: 1 }, t: 160, xp: 400 },
  e_cat_cycle:   { m: 'forge', in: { mana: 50, mana_potion: 10, abyss_shard: 20 }, out: { cat_cycle: 1 }, t: 120, xp: 250 },
  e_cat_swift:   { m: 'forge', in: { gold: 5, void_essence: 15, primal_ember: 3 }, out: { cat_swift: 1 }, t: 160, xp: 400 },
  e_cat_life:    { m: 'forge', in: { potion: 20, essence: 30, forest_core: 3 }, out: { cat_life: 1 }, t: 120, xp: 250 },
});

// 物質変換: 賢者の石の欠片1つ + 魔素 で、採取素材をまとめて生み出す
// [素材, 生成数, 必要な魔素]  ※深層の素材とボス素材は変換できない
const TRANSMUTES = [
  ['herb', 20, 4], ['wood', 20, 4], ['stone', 20, 4], ['mushroom', 10, 4], ['slime_gel', 15, 4], ['wolf_fang', 12, 4],
  ['sand', 20, 4], ['sunstone', 10, 6], ['bone', 12, 6],
  ['iron_ore', 12, 6], ['silver_ore', 10, 6], ['crystal', 8, 6], ['miasma_core', 6, 8],
  ['ice', 8, 8], ['frost_flower', 8, 8], ['soul_ash', 10, 8], ['nether_stone', 8, 8],
];
for (const [item, n, mana] of TRANSMUTES) {
  RECIPES[`t_${item}`] = { m: 'transmuter', in: { stone_shard: 1, mana }, out: { [item]: n }, t: 20, xp: 20 };
}

// ---- 強化ボス -------------------------------------------------
// pattern: ring=全方位弾の数 / aimed=狙い撃ちの弾数 / charge=突進する / summon=呼び出す手下 / rate=攻撃間隔(秒)
Object.assign(ENEMIES, {
  b_forest: { name: '森の古王', hp: 4000, spd: 60, dmg: 35, xp: 500, r: 30, color: '#4f8f3f', ai: 'boss', boss: true,
    pattern: { ring: 10, summon: 'wolf', rate: 2.6 }, drops: [['forest_core', 1, 1, 1], ['herb', 1, 10, 20], ['wood', 1, 10, 20]] },
  b_desert: { name: '砂塵の大蠍', hp: 6000, spd: 85, dmg: 45, xp: 700, r: 30, color: '#c9953b', ai: 'boss', boss: true,
    pattern: { aimed: 5, charge: true, summon: 'scorpion', rate: 2.4 }, drops: [['desert_core', 1, 1, 1], ['sunstone', 1, 5, 10], ['bone', 1, 5, 10]] },
  b_mine:   { name: '霧喰らいの巨像', hp: 8000, spd: 50, dmg: 55, xp: 900, r: 34, color: '#8088a8', ai: 'boss', boss: true,
    pattern: { ring: 14, aimed: 3, summon: 'ghost', rate: 2.6 }, drops: [['mine_core', 1, 1, 1], ['crystal', 1, 5, 10], ['iron_ore', 1, 8, 15]] },
  b_snow:   { name: '氷獄の狼王', hp: 10000, spd: 125, dmg: 65, xp: 1100, r: 28, color: '#bfe8ff', ai: 'boss', boss: true,
    pattern: { aimed: 7, charge: true, summon: 'icewolf', rate: 2.2 }, drops: [['snow_core', 1, 1, 1], ['frost_flower', 1, 5, 10], ['ice', 1, 5, 10]] },
});
ENEMIES.guardian.pattern = { ring: 12, aimed: 5, rate: 2.4 };

// 各地の強化ボス。ランクが1上がるごとに HP +50% / 攻撃力 +15%、報酬は3ランクごとに +1
const BOSS_ARENAS = {
  forest: 'b_forest', desert: 'b_desert', mine: 'b_mine', snow: 'b_snow', underworld: 'guardian',
};

// ---- 冥界の深層 -----------------------------------------------
// 階層が深くなるほど敵が強くなる: HP ×(1 + 0.3×(階層-1)) / 攻撃力 ×(1 + 0.1×(階層-1))
FIELDS.abyss = {
  name: '冥界の深層', lv: '15〜', desc: '冥界のさらに下、底の見えない深淵。潜るほどに魔物は強く、素材は稀少になる。',
  floor: '#140a1c', floor2: '#180c22', wall: '#050208', wallTop: '#2a1040', tint: 'rgba(20,0,40,0.25)',
  nodes: [['abyss_shard', 5, 1, 3], ['soul_ash', 2, 1, 3], ['nether_stone', 2, 1, 2], ['primal_ember', 0.6, 1, 1]],
  enemies: [['dead', 2], ['specter', 1.5], ['icewolf', 1], ['frostspirit', 1], ['ghost', 1], ['golem', 0.7]],
  extraDrops: [['void_essence', 0.15, 1, 1], ['primal_ember', 0.02, 1, 1]], // 深層の敵が追加で落とす素材
  maxEnemies: 13, abyss: true,
};
const ABYSS_EMBER_FLOOR = 10; // 原初の火種の採取ポイントが現れる階層
const ABYSS_CHECKPOINT = 5;   // この階層ごとに、次回そこから潜り始められる

// ---- 物語を終えた後に現れる書物 --------------------------------
// after: 'ended' … 物語をクリアするまで書庫に現れない
BOOKS.push(
  { id: 'p_forge', kind: 'alchemy', lv: 12, sp: 2, after: 'ended', name: '武具錬成論',
    unlock: { machines: ['forge'], recipes: ['e_staff1', 'e_staff2', 'e_robe1', 'e_robe2', 'e_cat_life', 'e_cat_cycle'] },
    text: ['錬金術は、身を守り、敵を討つためにも使える。', '【錬装の炉】を築け。杖は魔力を研ぎ澄まし、法衣は身を守り、触媒は術の性質を変える。',
      '上等な武具には、各地の主の素材が要る。……主たちは、倒しても幾度となく蘇るらしい。'] },
  { id: 'p_forge2', kind: 'alchemy', lv: 18, sp: 2, after: 'ended', name: '武具錬成論・続',
    unlock: { recipes: ['e_staff3', 'e_staff4', 'e_robe3', 'e_robe4', 'e_cat_fire', 'e_cat_ice', 'e_cat_thunder', 'e_cat_wind', 'e_cat_swift'] },
    text: ['深淵の素材を武具に用いる技法。', '虚無の雫は、あらゆる力を受け流す。杖に宿せば術は鋭く、衣に染めれば刃は滑る。'] },
  { id: 'p_forge3', kind: 'alchemy', lv: 24, sp: 3, after: 'ended', name: '至高の武具',
    unlock: { recipes: ['e_staff5', 'e_robe5', 'e_cat_light'] },
    text: ['賢者の石の欠片、原初の火種、番人の心核。', 'それらを束ねた武具は、もはや道具ではない。持ち主の意志そのものだ。'] },
  { id: 'p_trans', kind: 'alchemy', lv: 15, sp: 3, after: 'ended', name: '変成の祭壇',
    unlock: { machines: ['transmuter'], recipes: ['r_shard', ...TRANSMUTES.map(t => `t_${t[0]}`)] },
    text: ['賢者の石は、一度使えば終わりではない。', '石を砕き、その欠片を【変成の祭壇】に捧げよ。魔素を糧に、ある物質を別の物質へと変えることができる。',
      '森へ、砂漠へ、雪原へ──もう素材を求めて彷徨う必要はない。ただし、深淵の素材だけは、深淵でしか得られない。'] },
  { id: 'p_abyss', kind: 'magic', lv: 15, sp: 3, after: 'ended', name: '深淵考',
    unlock: { fields: ['abyss'] },
    text: ['冥界には、さらに下がある。', '審判神が人を縛るより遥か昔から在った、底の見えない深淵。', `潜るほどに魔物は強くなる。${ABYSS_CHECKPOINT}層ごとに道標を残せば、次はそこから潜り直せるだろう。`] },
  { id: 'p_hunt', kind: 'magic', lv: 15, sp: 3, after: 'ended', name: '討伐録',
    unlock: { features: ['bosses'] },
    text: ['各地には「主」と呼ばれる強大な魔物がいる。', '主は倒しても、より強くなって蘇る。その度に、より上質な素材を残して。',
      '探索の地から、主のもとへ挑むことができる。'] },
);

// ---- クリア後の目標 -------------------------------------------
OBJECTIVES.push(
  { post: true, text: '書庫に現れた新たな書物を読もう', done: s => ['p_forge', 'p_trans', 'p_abyss', 'p_hunt'].some(id => s.books[id]) },
  { post: true, text: '【錬装の炉】で装備を作り、身に着けよう', done: s => Object.values(s.equip || {}).some(Boolean) },
  { post: true, text: '各地の主（強化ボス）をすべて1度ずつ討伐しよう', done: s => Object.keys(BOSS_ARENAS).every(f => (s.post.bossRank[f] || 0) >= 1) },
  { post: true, text: '冥界の深層・第10層に到達しよう', done: s => s.post.abyssBest >= 10 },
  { post: true, text: '【変成の祭壇】で物質変換を行おう', done: s => TRANSMUTES.some(t => (s.stats.made[t[0]] || 0) > 0) },
  { post: true, text: '【賢者の杖】と【第五元素の衣】を完成させよう', done: s => (s.stats.made.staff5 || 0) > 0 && (s.stats.made.robe5 || 0) > 0 },
  { post: true, text: '冥界の深層・第30層に到達しよう', done: s => s.post.abyssBest >= 30 },
  { post: true, text: 'すべての主をランク10まで討伐しよう', done: s => Object.keys(BOSS_ARENAS).every(f => (s.post.bossRank[f] || 0) >= 10) },
);
