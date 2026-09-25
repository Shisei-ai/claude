// =============================================================
//  data_equip.js — 装備(杖・法衣・触媒)の定義
//
//  装備は「系統(ライン)」ごとに、段階(ティア)を並べた表で定義する。
//  表に行を足すだけで段階を増やせる(アイテム・レシピ・書物の解放は自動で作られる)。
//    ・杖/法衣 … 7段階 (I〜III: 本編で作成可能 / IV〜VII: クリア後)
//    ・触媒     … 8系統 × 3段階 (I: 本編 / II〜III: クリア後)
//  上位の段階は、1つ下の段階の装備を素材にして作る(自動で素材に追加される)。
//
//  各段階の項目:
//    name/color … 名前と色 / book … 解放する書物のID / in … 素材 / t … 錬成秒数 / xp … A.Lv経験値
//    杖:   dmg   … 魔法の与ダメージ +x
//    法衣: hp    … 最大HP +x / guard … 被ダメージ -x
//    触媒: boost … { 魔法ID: 威力 +x } / regen … MP回復 +x / cd … 再使用時間 -x / hpMult … 最大HP +x / heal … 回復量 +x
// =============================================================

const EQUIP_SLOTS = [['staff', '杖'], ['robe', '法衣'], ['catalyst', '触媒']];
const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const EQUIP_LINES = {
  // ---- 杖 ----
  staff: { slot: 'staff', ch: '杖', name: '杖', tiers: [
    { name: '樫の魔杖',   color: '#b08050', dmg: 0.10, book: 'e_book1', in: { wood: 20, essence: 10, slime_gel: 5 }, t: 40, xp: 30 },
    { name: '銀晶の杖',   color: '#c9d3de', dmg: 0.22, book: 'e_book2', in: { silver_ingot: 8, crystal: 8, mana: 10 }, t: 80, xp: 80 },
    { name: '魔鉄の杖',   color: '#7d8cff', dmg: 0.38, book: 'e_book3', in: { enchanted_iron: 8, gold: 3, frost_flower: 6 }, t: 120, xp: 160 },
    { name: '金冥の杖',   color: '#ffcf40', dmg: 0.60, book: 'e_post1', in: { gold: 10, forest_core: 3, desert_core: 3, abyss_shard: 20 }, t: 180, xp: 400 },
    { name: '賢者の杖',   color: '#ff2050', dmg: 0.90, book: 'e_post1', in: { stone_shard: 10, mine_core: 3, void_essence: 15 }, t: 240, xp: 800 },
    { name: '星詠みの杖', color: '#a0b0ff', dmg: 1.30, book: 'e_post2', in: { snow_core: 5, primal_ember: 8, void_essence: 30, boss_soul: 2 }, t: 300, xp: 1500 },
    { name: '原初の杖',   color: '#ff9a30', dmg: 1.80, book: 'e_post3', in: { nether_heart: 3, primal_ember: 20, abyss_heart: 3, boss_soul: 5 }, t: 400, xp: 3000 },
  ] },
  // ---- 法衣 ----
  robe: { slot: 'robe', ch: '衣', name: '法衣', tiers: [
    { name: '旅の外套',     color: '#8a7a5a', hp: 30,  guard: 0.05, book: 'e_book1', in: { slime_gel: 20, wolf_fang: 10, essence: 10 }, t: 40, xp: 30 },
    { name: '聖布の法衣',   color: '#fff3b0', hp: 60,  guard: 0.09, book: 'e_book2', in: { pure_water: 15, pure_core: 4, glass: 5 }, t: 80, xp: 80 },
    { name: '冥布の法衣',   color: '#8a6caa', hp: 95,  guard: 0.13, book: 'e_book3', in: { soul_ash: 20, nether_stone: 10, salt: 2 }, t: 120, xp: 160 },
    { name: '虚無の衣',     color: '#30c0c0', hp: 140, guard: 0.18, book: 'e_post1', in: { void_essence: 15, mine_core: 3, snow_core: 3, abyss_shard: 30 }, t: 180, xp: 400 },
    { name: '第五元素の衣', color: '#ffffff', hp: 200, guard: 0.23, book: 'e_post1', in: { quintessence: 3, stone_shard: 10, desert_core: 3 }, t: 240, xp: 800 },
    { name: '深淵の外套',   color: '#5a4aa0', hp: 270, guard: 0.28, book: 'e_post2', in: { abyss_shard: 80, forest_core: 5, primal_ember: 8, boss_soul: 2 }, t: 300, xp: 1500 },
    { name: '原初の衣',     color: '#ff9a30', hp: 360, guard: 0.34, book: 'e_post3', in: { nether_heart: 3, primal_ember: 20, abyss_heart: 3, boss_soul: 5 }, t: 400, xp: 3000 },
  ] },
  // ---- 触媒(同時に1つだけ装備できる) ----
  cat_fire: { slot: 'catalyst', ch: '触', name: '紅蓮の触媒', color: '#ff7a3d', tiers: [
    { boost: { fire: 0.25 }, book: 'e_book1', in: { sun_dust: 10, charcoal: 10, essence: 5 }, t: 60, xp: 40 },
    { boost: { fire: 0.5 },  book: 'e_post1', in: { sulfur: 3, desert_core: 2 }, t: 120, xp: 250 },
    { boost: { fire: 0.8 },  book: 'e_post2', in: { primal_ember: 5, desert_core: 5, boss_soul: 1 }, t: 200, xp: 800 },
  ] },
  cat_ice: { slot: 'catalyst', ch: '触', name: '凍晶の触媒', color: '#9fe3ff', tiers: [
    { boost: { ice: 0.25 }, book: 'e_book3', in: { salt: 1, ice: 10, mana: 10 }, t: 60, xp: 40 },
    { boost: { ice: 0.5 },  book: 'e_post1', in: { snow_core: 2, frost_flower: 20 }, t: 120, xp: 250 },
    { boost: { ice: 0.8 },  book: 'e_post2', in: { snow_core: 5, abyss_heart: 1, boss_soul: 1 }, t: 200, xp: 800 },
  ] },
  cat_thunder: { slot: 'catalyst', ch: '触', name: '雷霆の触媒', color: '#ffe66b', tiers: [
    { boost: { thunder: 0.25 }, book: 'e_book2', in: { crystal: 10, silver_ingot: 4, mana: 10 }, t: 60, xp: 40 },
    { boost: { thunder: 0.5 },  book: 'e_post1', in: { mercury: 3, mine_core: 2 }, t: 120, xp: 250 },
    { boost: { thunder: 0.8 },  book: 'e_post2', in: { mine_core: 5, void_essence: 20, boss_soul: 1 }, t: 200, xp: 800 },
  ] },
  cat_wind: { slot: 'catalyst', ch: '触', name: '疾風の触媒', color: '#b8ffd8', tiers: [
    { boost: { nova: 0.25 }, book: 'e_book3', in: { frost_flower: 8, alkahest: 1, essence: 10 }, t: 60, xp: 40 },
    { boost: { nova: 0.5 },  book: 'e_post1', in: { forest_core: 2, frost_flower: 20 }, t: 120, xp: 250 },
    { boost: { nova: 0.8 },  book: 'e_post2', in: { forest_core: 5, void_essence: 20, boss_soul: 1 }, t: 200, xp: 800 },
  ] },
  cat_light: { slot: 'catalyst', ch: '触', name: '煌光の触媒', color: '#fff7c2', tiers: [
    { boost: { light: 0.25, bolt: 0.15 }, book: 'e_book3', in: { pure_core: 5, gold: 2, sun_dust: 10 }, t: 60, xp: 40 },
    { boost: { light: 0.5, bolt: 0.3 },   book: 'e_post1', in: { quintessence: 2, nether_heart: 1 }, t: 160, xp: 400 },
    { boost: { light: 0.8, bolt: 0.5 },   book: 'e_post2', in: { nether_heart: 2, primal_ember: 10, boss_soul: 1 }, t: 240, xp: 1000 },
  ] },
  cat_cycle: { slot: 'catalyst', ch: '触', name: '循環の触媒', color: '#9d7bff', tiers: [
    { regen: 0.4, book: 'e_book2', in: { mana: 30, mana_potion: 5 }, t: 60, xp: 40 },
    { regen: 0.8, book: 'e_post1', in: { abyss_shard: 20, mana: 50 }, t: 120, xp: 250 },
    { regen: 1.2, book: 'e_post2', in: { abyss_heart: 1, void_essence: 20, boss_soul: 1 }, t: 200, xp: 800 },
  ] },
  cat_swift: { slot: 'catalyst', ch: '触', name: '迅速の触媒', color: '#6fdc8c', tiers: [
    { cd: 0.08, book: 'e_book2', in: { gold: 3, wolf_fang: 20, mana: 20 }, t: 60, xp: 40 },
    { cd: 0.15, book: 'e_post1', in: { void_essence: 15, primal_ember: 3 }, t: 160, xp: 400 },
    { cd: 0.22, book: 'e_post2', in: { primal_ember: 10, abyss_heart: 1, boss_soul: 1 }, t: 240, xp: 1000 },
  ] },
  cat_life: { slot: 'catalyst', ch: '触', name: '生命の触媒', color: '#ff8a8a', tiers: [
    { hpMult: 0.1, heal: 0.25, book: 'e_book1', in: { potion: 10, essence: 20, herb: 20 }, t: 60, xp: 40 },
    { hpMult: 0.2, heal: 0.5,  book: 'e_post1', in: { forest_core: 3, potion: 20 }, t: 120, xp: 250 },
    { hpMult: 0.3, heal: 0.8,  book: 'e_post2', in: { forest_core: 5, stone_shard: 5, boss_soul: 1 }, t: 200, xp: 800 },
  ] },
};

// ---- 書物 -----------------------------------------------------
// 本編: 錬金術書3冊 / クリア後: 3冊。どの装備を解放するかは上の表の book で決まる
const EQUIP_BOOKS = [
  { id: 'e_book1', kind: 'alchemy', lv: 5, sp: 2, name: '武具錬成論', machines: ['forge'],
    text: ['錬金術は、身を守り、敵を討つためにも使える。', '【錬装の炉】を築け。杖は魔力を研ぎ澄まし、法衣は身を守り、触媒は術の性質を変える。',
      '良き武具は、より良き武具の礎となる。古い杖を捨てるな。溶かして、次の杖の芯にするのだ。'] },
  { id: 'e_book2', kind: 'alchemy', lv: 9, sp: 2, name: '鍛錬の書',
    text: ['銀と魔晶、聖水と浄化核。', '錬金術で得た素材を武具に宿す技法を記す。触媒は術者の癖に合わせて選ぶといい。'] },
  { id: 'e_book3', kind: 'alchemy', lv: 13, sp: 2, name: '魔装の極意',
    text: ['魔鉄の杖、冥布の法衣。', '冥界の素材を身に纏うことを恐れるな。死者の魂は、生者を守る盾にもなる。'] },
  { id: 'e_post1', kind: 'alchemy', lv: 16, sp: 2, after: 'ended', name: '深淵の武具',
    text: ['各地の主の素材、深淵の欠片、そして賢者の石の欠片。', 'それらを用いた武具は、人の域を越え始める。……主たちは、倒しても幾度となく蘇るらしい。'] },
  { id: 'e_post2', kind: 'alchemy', lv: 22, sp: 3, after: 'ended', name: '至高の武具',
    text: ['幾度も蘇った主は、その度に強くなり、やがて魂を結晶として残すようになる。', '主の魂晶を用いた武具は、もはや道具ではない。持ち主の意志そのものだ。'] },
  { id: 'e_post3', kind: 'alchemy', lv: 28, sp: 3, after: 'ended', name: '原初の武具',
    text: ['深淵の最奥、世界が生まれた場所の核。', 'それを戴く武具は、神の理の外側に立つ者のためのものである。'] },
];

// ---- 表から アイテム・レシピ・書物の解放 を作る ------------------
// ID: 杖なら staff1〜staff7、触媒なら cat_fire1〜cat_fire3
const EQUIPS = {};
const equipBookRecipes = {};
for (const [line, L] of Object.entries(EQUIP_LINES)) {
  L.tiers.forEach((tier, i) => {
    const id = `${line}${i + 1}`;
    const name = tier.name || `${L.name} ${TIER_LABEL[i]}`;
    EQUIPS[id] = Object.assign({ line, tier: i + 1, slot: L.slot, ch: L.ch, color: tier.color || L.color }, tier, { name });
    const inputs = Object.assign(i > 0 ? { [`${line}${i}`]: 1 } : {}, tier.in); // 1つ下の段階を素材に加える
    RECIPES[`e_${id}`] = { m: 'forge', in: inputs, out: { [id]: 1 }, t: tier.t, xp: tier.xp };
    (equipBookRecipes[tier.book] = equipBookRecipes[tier.book] || []).push(`e_${id}`);
  });
}
for (const b of EQUIP_BOOKS) {
  BOOKS.push({ id: b.id, kind: b.kind, lv: b.lv, sp: b.sp, name: b.name, after: b.after, text: b.text,
    unlock: { machines: b.machines, recipes: equipBookRecipes[b.id] || [] } });
}

// 装備の効果を文章にする(画面表示用)
function equipEffectText(e) {
  const t = [];
  const pct = v => `${Math.round(v * 100)}%`;
  if (e.dmg) t.push(`与ダメージ +${pct(e.dmg)}`);
  if (e.hp) t.push(`最大HP +${e.hp}`);
  if (e.guard) t.push(`被ダメージ -${pct(e.guard)}`);
  for (const [sp, v] of Object.entries(e.boost || {})) t.push(`${SPELLS[sp].grades[0].name}系の威力 +${pct(v)}`);
  if (e.regen) t.push(`MP自然回復 +${pct(e.regen)}`);
  if (e.cd) t.push(`再使用時間 -${pct(e.cd)}`);
  if (e.hpMult) t.push(`最大HP +${pct(e.hpMult)}`);
  if (e.heal) t.push(`治癒系の回復量 +${pct(e.heal)}`);
  return t.join('、');
}
for (const [id, e] of Object.entries(EQUIPS)) {
  ITEMS[id] = { name: e.name, ch: e.ch, color: e.color, cat: 'equip', desc: equipEffectText(e) };
}
ITEM_CATS.splice(ITEM_CATS.findIndex(c => c[0] === 'key'), 0, ['equip', '装備']);

MACHINES.forge = { name: '錬装の炉', ch: '装', color: '#ff9a30', desc: '杖・法衣・触媒を錬成する。', cost: { stone: 30, wood: 20, charcoal: 10 } };

// 旧バージョンのセーブデータにある装備IDの読み替え
const EQUIP_RENAMES = { cat_fire: 'cat_fire2', cat_ice: 'cat_ice2', cat_thunder: 'cat_thunder2', cat_wind: 'cat_wind2',
  cat_light: 'cat_light2', cat_cycle: 'cat_cycle2', cat_swift: 'cat_swift2', cat_life: 'cat_life2' };
