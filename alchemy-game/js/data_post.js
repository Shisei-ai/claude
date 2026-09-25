// =============================================================
//  data_post.js — クリア後(やり込み)要素の定義データ
//    (装備・触媒錬成は data_equip.js。上位段階はクリア後の書物で解放される)
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
  boss_soul:    { name: '主の魂晶',     ch: '晶', color: '#ff80c0', cat: 'drop', desc: 'ランク5以上の主が残す、魂の結晶。最上位の装備に使う。' },
  abyss_heart:  { name: '深淵の核',     ch: '核', color: '#8040ff', cat: 'drop', desc: '深層の第20層より下の魔物が稀に宿す、深淵そのものの欠片。' },
});

// ---- 設備 -----------------------------------------------------
Object.assign(MACHINES, {
  transmuter: { name: '変成の祭壇', ch: '変', color: '#ff5a7a', desc: '賢者の石の欠片を触媒に、物質を別の物質へ変える。', cost: { gold: 10, quintessence: 1, pure_core: 10 } },
});

// ---- レシピ ---------------------------------------------------
Object.assign(RECIPES, {
  r_shard:   { m: 'mortar', in: { philosopher_stone: 1 }, out: { stone_shard: 12 }, t: 30, xp: 50 },
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
    pattern: { ring: 10, summon: 'wolf', rate: 2.6 }, drops: [['forest_core', 1, 1, 1], ['boss_soul', 1, 1, 1, 5], ['herb', 1, 10, 20], ['wood', 1, 10, 20]] },
  b_desert: { name: '砂塵の大蠍', hp: 6000, spd: 85, dmg: 45, xp: 700, r: 30, color: '#c9953b', ai: 'boss', boss: true,
    pattern: { aimed: 5, charge: true, summon: 'scorpion', rate: 2.4 }, drops: [['desert_core', 1, 1, 1], ['boss_soul', 1, 1, 1, 5], ['sunstone', 1, 5, 10], ['bone', 1, 5, 10]] },
  b_mine:   { name: '霧喰らいの巨像', hp: 8000, spd: 50, dmg: 55, xp: 900, r: 34, color: '#8088a8', ai: 'boss', boss: true,
    pattern: { ring: 14, aimed: 3, summon: 'ghost', rate: 2.6 }, drops: [['mine_core', 1, 1, 1], ['boss_soul', 1, 1, 1, 5], ['crystal', 1, 5, 10], ['iron_ore', 1, 8, 15]] },
  b_snow:   { name: '氷獄の狼王', hp: 10000, spd: 125, dmg: 65, xp: 1100, r: 28, color: '#bfe8ff', ai: 'boss', boss: true,
    pattern: { aimed: 7, charge: true, summon: 'icewolf', rate: 2.2 }, drops: [['snow_core', 1, 1, 1], ['boss_soul', 1, 1, 1, 5], ['frost_flower', 1, 5, 10], ['ice', 1, 5, 10]] },
});
ENEMIES.guardian.pattern = { ring: 12, aimed: 5, rate: 2.4 };
// 5つ目の数値は「出現条件」: 強化ボスではランク、冥界の深層では階層がこの値以上のときだけ落とす
ENEMIES.guardian.drops.push(['boss_soul', 1, 1, 1, 5]);

// 各地の強化ボス。ランクが1上がるごとに HP +50% / 攻撃力 +15%、報酬は3ランクごとに +1
// ランク5以上では【主の魂晶】も落とす
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
  extraDrops: [['void_essence', 0.15, 1, 1], ['primal_ember', 0.02, 1, 1], ['abyss_heart', 0.04, 1, 1, 20]], // 深層の敵が追加で落とす素材(5つ目=必要階層)
  maxEnemies: 13, abyss: true,
};
const ABYSS_EMBER_FLOOR = 10; // 原初の火種の採取ポイントが現れる階層
const ABYSS_CHECKPOINT = 5;   // この階層ごとに、次回そこから潜り始められる

// ---- 物語を終えた後に現れる書物 --------------------------------
// after: 'ended' … 物語をクリアするまで書庫に現れない
BOOKS.push(
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
  { post: true, text: '書庫に現れた新たな書物を読もう', done: s => ['e_post1', 'p_trans', 'p_abyss', 'p_hunt'].some(id => s.books[id]) },
  { post: true, text: 'クリア後の武具書『深淵の武具』を読み、IV段階の装備を作ろう', done: s => (s.stats.made.staff4 || 0) + (s.stats.made.robe4 || 0) > 0 },
  { post: true, text: '各地の主（強化ボス）をすべて1度ずつ討伐しよう', done: s => Object.keys(BOSS_ARENAS).every(f => (s.post.bossRank[f] || 0) >= 1) },
  { post: true, text: '冥界の深層・第10層に到達しよう', done: s => s.post.abyssBest >= 10 },
  { post: true, text: '【変成の祭壇】で物質変換を行おう', done: s => TRANSMUTES.some(t => (s.stats.made[t[0]] || 0) > 0) },
  { post: true, text: '【賢者の杖】と【第五元素の衣】を完成させよう', done: s => (s.stats.made.staff5 || 0) > 0 && (s.stats.made.robe5 || 0) > 0 },
  { post: true, text: '冥界の深層・第30層に到達しよう', done: s => s.post.abyssBest >= 30 },
  { post: true, text: '主をランク5以上で倒し、【主の魂晶】を手に入れよう', done: s => (s.inv.boss_soul || 0) > 0 || Object.keys(s.stats.made).some(k => /^(staff|robe)[67]$|^cat_\w+3$/.test(k)) },
  { post: true, text: '【原初の杖】と【原初の衣】を完成させよう', done: s => (s.stats.made.staff7 || 0) > 0 && (s.stats.made.robe7 || 0) > 0 },
  { post: true, text: 'すべての主をランク10まで討伐しよう', done: s => Object.keys(BOSS_ARENAS).every(f => (s.post.bossRank[f] || 0) >= 10) },
);
