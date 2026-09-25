// =============================================================
//  data.js — ゲームの「定義データ」をまとめたファイル
//  アイテム・設備・レシピ・書物・技能・魔法・フィールド・敵・物語。
//  数値調整(バランス調整)は基本的にこのファイルだけで完結します。
// =============================================================

// ---- アイテム -------------------------------------------------
// ch: アイコンに表示する一文字 / color: アイコンの色
// cat: raw=採取素材, drop=敵ドロップ, mid=中間素材, use=消耗品, key=鍵となる品, final=最終
const ITEMS = {
  // --- 採取素材(フィールドでしか手に入らない) ---
  herb:        { name: '霊草',       ch: '草', color: '#5fbf5f', cat: 'raw',  desc: '芽吹き森に自生する、淡く光る薬草。' },
  wood:        { name: '古木の枝',   ch: '木', color: '#a0703c', cat: 'raw',  desc: '魔力を帯びた古木の枝。燃やすと良質な炭になる。' },
  stone:       { name: '石材',       ch: '石', color: '#9a9a9a', cat: 'raw',  desc: '設備の建造に使う頑丈な石。' },
  mushroom:    { name: '月光茸',     ch: '茸', color: '#c8b5ff', cat: 'raw',  desc: '月の光を溜め込む茸。微量の魔素を含む。' },
  sand:        { name: '赤砂',       ch: '砂', color: '#d9905a', cat: 'raw',  desc: '割れた砂漠の赤い砂。熱すると硝子になる。' },
  sunstone:    { name: '陽光石',     ch: '陽', color: '#ffcc33', cat: 'raw',  desc: '陽の力を閉じ込めた黄色い鉱石。' },
  iron_ore:    { name: '鉄鉱石',     ch: '鉄', color: '#a57a62', cat: 'raw',  desc: '霧深い鉱山で採れる鉄の原石。' },
  silver_ore:  { name: '銀鉱石',     ch: '銀', color: '#c9d3de', cat: 'raw',  desc: '魔を退ける性質を持つ銀の原石。' },
  crystal:     { name: '魔晶の欠片', ch: '晶', color: '#8f8fff', cat: 'raw',  desc: '魔素が結晶化したもの。抽出すれば大量の魔素になる。' },
  ice:         { name: '永久氷',     ch: '氷', color: '#a8e6ff', cat: 'raw',  desc: '決して融けない氷。「固定」の性質を持つ。' },
  frost_flower:{ name: '霜の花',     ch: '霜', color: '#e0f4ff', cat: 'raw',  desc: '極寒の中でのみ咲く花。流動する魔力を宿す。' },
  soul_ash:    { name: '魂の残滓',   ch: '魂', color: '#c39be6', cat: 'raw',  desc: '冥界に漂う、囚われた魂のかけら。温かい。' },
  nether_stone:{ name: '冥石',       ch: '冥', color: '#8a6caa', cat: 'raw',  desc: '冥界の大地そのもの。神の呪いが染みついている。' },
  // --- 敵のドロップ ---
  slime_gel:   { name: '粘液',       ch: '粘', color: '#6fd6c0', cat: 'drop', desc: 'スライムの体液。' },
  wolf_fang:   { name: '獣の牙',     ch: '牙', color: '#e8e0c8', cat: 'drop', desc: '獣の鋭い牙。砕けば骨粉になる。' },
  bone:        { name: '古骨',       ch: '骨', color: '#eee6d0', cat: 'drop', desc: '砂漠に眠っていた古い骨。' },
  miasma_core: { name: '瘴気の核',   ch: '瘴', color: '#b0508f', cat: 'drop', desc: '魔物の内に凝った瘴気。浄化すれば聖なる核となる。' },
  nether_heart:{ name: '番人の心核', ch: '心', color: '#ff3355', cat: 'key',  desc: '冥府の番人の心臓。冥界と現世を繋ぐ唯一の楔。' },
  // --- 中間素材(工房で作れる) ---
  water:        { name: '清水',         ch: '水', color: '#4aa3ff', cat: 'mid', desc: '工房の井戸から汲み上げた清らかな水。' },
  essence:      { name: '草の精髄',     ch: '精', color: '#3fdf8f', cat: 'mid', desc: '霊草から抽出した生命の雫。' },
  charcoal:     { name: '木炭',         ch: '炭', color: '#666666', cat: 'mid', desc: '精錬の燃料。' },
  glass:        { name: '硝子瓶',       ch: '瓶', color: '#bfe9ff', cat: 'mid', desc: '薬を詰めるための瓶。' },
  mana:         { name: '魔素',         ch: '魔', color: '#9d7bff', cat: 'mid', desc: '魔術と錬金術の源となる力。' },
  iron_powder:  { name: '鉄粉',         ch: '粉', color: '#a57a62', cat: 'mid', desc: '砕いた鉄鉱石。' },
  silver_powder:{ name: '銀粉',         ch: '粉', color: '#c9d3de', cat: 'mid', desc: '砕いた銀鉱石。' },
  sun_dust:     { name: '陽光の粉',     ch: '光', color: '#ffd966', cat: 'mid', desc: '陽光石を砕いた、きらめく粉。' },
  bone_powder:  { name: '骨粉',         ch: '粉', color: '#eee6d0', cat: 'mid', desc: '骨や牙を砕いた粉。' },
  iron_ingot:   { name: '鉄塊',         ch: '塊', color: '#8c97a1', cat: 'mid', desc: '精錬された鉄。' },
  silver_ingot: { name: '銀塊',         ch: '塊', color: '#e6eef6', cat: 'mid', desc: '精錬された銀。' },
  pure_water:   { name: '聖水',         ch: '聖', color: '#aaeeff', cat: 'mid', desc: '浄化された水。瘴気を払う。' },
  pure_core:    { name: '浄化核',       ch: '浄', color: '#fff3b0', cat: 'mid', desc: '瘴気を反転させた聖なる核。' },
  enchanted_iron:{name: '魔鉄',         ch: '鋼', color: '#7d8cff', cat: 'mid', desc: '魔素を宿した鉄。' },
  gold:         { name: '錬金の金',     ch: '金', color: '#ffcf40', cat: 'mid', desc: '銀から変成された金。錬金術師の証。' },
  alkahest:     { name: '万能溶媒',     ch: '溶', color: '#b0ffea', cat: 'mid', desc: 'あらゆる物質を溶かす伝説の溶媒アルカヘスト。' },
  salt:         { name: '賢者の塩',     ch: '塩', color: '#f4f4f4', cat: 'mid', desc: '三原質のひとつ。「肉体」を司る。' },
  mercury:      { name: '賢者の水銀',   ch: '汞', color: '#d0d8e8', cat: 'mid', desc: '三原質のひとつ。「精神」を司る。' },
  sulfur:       { name: '賢者の硫黄',   ch: '硫', color: '#ffb030', cat: 'mid', desc: '三原質のひとつ。「魂」を司る。' },
  quintessence: { name: '第五元素',     ch: '五', color: '#ffffff', cat: 'mid', desc: '四大元素を超えた、万物の根源。' },
  red_tincture: { name: '赤きティンクトゥラ', ch: '赤', color: '#e0203a', cat: 'mid', desc: '大いなる業の最終段階「赤化」を経た霊液。' },
  // --- 消耗品 ---
  potion:       { name: '回復薬',       ch: '癒', color: '#ff6b6b', cat: 'use', desc: '探索中に [Q] で使用。HPを50%回復する。' },
  mana_potion:  { name: '魔力薬',       ch: '力', color: '#6b8cff', cat: 'use', desc: '探索中に [R] で使用。MPを60%回復する。' },
  // --- 鍵となる品(持っているだけで効果がある) ---
  lantern:      { name: '霧払いの灯',   ch: '灯', color: '#ffe08a', cat: 'key', desc: '霧深い鉱山の霧を払う灯り。鉱山の探索に必要。' },
  frost_amulet: { name: '耐寒の護符',   ch: '護', color: '#9fe3ff', cat: 'key', desc: '極寒から身を守る護符。永久雪原の探索に必要。' },
  nether_key:   { name: '冥府の鍵',     ch: '鍵', color: '#a070ff', cat: 'key', desc: '冥界への門を開く鍵。' },
  // --- 最終目標 ---
  philosopher_stone: { name: '賢者の石', ch: '賢', color: '#ff2050', cat: 'final', desc: 'あらゆる理を書き換える究極の触媒。神の呪いすら解きうる。' },
};

const ITEM_CATS = [
  ['raw', '採取素材'], ['drop', '魔物素材'], ['mid', '錬成素材'],
  ['use', '消耗品'], ['key', '鍵となる品'], ['final', '至高の品'],
];

// ---- 設備 -----------------------------------------------------
// cost: 1台目の建造コスト(2台目以降は 1.6倍ずつ増える)
const MACHINES = {
  pot:       { name: '抽出の壺', ch: '壺', color: '#4aa3ff', desc: '素材から液体や魔素を抽出する。', cost: { wood: 5, stone: 3 } },
  furnace:   { name: '精錬の竈', ch: '竈', color: '#ff7a3d', desc: '高熱で素材を精錬・焼成する。', cost: { stone: 12, wood: 6 } },
  mortar:    { name: '破砕の臼', ch: '臼', color: '#b59a7a', desc: '鉱石や骨を砕き、粉にする。', cost: { stone: 15, wood: 8 } },
  cauldron:  { name: '融合の釜', ch: '釜', color: '#3fdf8f', desc: '複数の素材を混ぜ合わせ、新たな物を生む。', cost: { stone: 20, charcoal: 5, slime_gel: 5 } },
  purifier:  { name: '浄化の匣', ch: '浄', color: '#fff3b0', desc: '穢れを祓い、素材を清める。', cost: { glass: 6, wood: 10, essence: 5 } },
  enchanter: { name: '魔化の匣', ch: '魔', color: '#9d7bff', desc: '素材に魔素を宿らせ、性質を変える。', cost: { iron_ingot: 6, crystal: 8, glass: 4 } },
};

// ---- レシピ ---------------------------------------------------
// m: 使う設備 / in: 投入素材 / out: 生産物 / t: 所要秒数 / xp: 獲得A.Lv経験値
const RECIPES = {
  // 抽出の壺
  r_water:     { m: 'pot', in: {}, out: { water: 1 }, t: 4, xp: 1 },
  r_essence:   { m: 'pot', in: { herb: 2 }, out: { essence: 1 }, t: 5, xp: 2 },
  r_mana_mush: { m: 'pot', in: { mushroom: 1 }, out: { mana: 1 }, t: 6, xp: 3 },
  r_mana_crys: { m: 'pot', in: { crystal: 1 }, out: { mana: 3 }, t: 6, xp: 4 },
  // 精錬の竈
  r_charcoal:  { m: 'furnace', in: { wood: 2 }, out: { charcoal: 1 }, t: 5, xp: 2 },
  r_glass:     { m: 'furnace', in: { sand: 2, charcoal: 1 }, out: { glass: 1 }, t: 6, xp: 3 },
  r_iron:      { m: 'furnace', in: { iron_powder: 2, charcoal: 1 }, out: { iron_ingot: 1 }, t: 8, xp: 5 },
  r_silver:    { m: 'furnace', in: { silver_powder: 2, charcoal: 1 }, out: { silver_ingot: 1 }, t: 8, xp: 6 },
  // 破砕の臼
  r_ironpow:   { m: 'mortar', in: { iron_ore: 1 }, out: { iron_powder: 2 }, t: 4, xp: 2 },
  r_silverpow: { m: 'mortar', in: { silver_ore: 1 }, out: { silver_powder: 2 }, t: 4, xp: 2 },
  r_sundust:   { m: 'mortar', in: { sunstone: 1 }, out: { sun_dust: 2 }, t: 4, xp: 2 },
  r_bonepow:   { m: 'mortar', in: { bone: 1 }, out: { bone_powder: 2 }, t: 4, xp: 2 },
  r_fangpow:   { m: 'mortar', in: { wolf_fang: 1 }, out: { bone_powder: 1 }, t: 4, xp: 1 },
  // 融合の釜
  r_potion:    { m: 'cauldron', in: { essence: 1, water: 1, glass: 1 }, out: { potion: 1 }, t: 8, xp: 5 },
  r_lantern:   { m: 'cauldron', in: { glass: 1, essence: 2, sun_dust: 2 }, out: { lantern: 1 }, t: 10, xp: 10 },
  r_mana_potion:{ m: 'cauldron', in: { mana: 2, water: 1, glass: 1 }, out: { mana_potion: 1 }, t: 8, xp: 6 },
  r_alkahest:  { m: 'cauldron', in: { pure_water: 2, sun_dust: 2, bone_powder: 2 }, out: { alkahest: 1 }, t: 12, xp: 15 },
  r_mercury:   { m: 'cauldron', in: { silver_ingot: 1, alkahest: 1, frost_flower: 2 }, out: { mercury: 1 }, t: 15, xp: 25 },
  r_sulfur:    { m: 'cauldron', in: { sun_dust: 3, pure_core: 1, charcoal: 2 }, out: { sulfur: 1 }, t: 15, xp: 25 },
  r_red:       { m: 'cauldron', in: { quintessence: 1, gold: 2, soul_ash: 5, nether_stone: 3 }, out: { red_tincture: 1 }, t: 30, xp: 120 },
  r_stone:     { m: 'cauldron', in: { red_tincture: 1, quintessence: 1, nether_heart: 1 }, out: { philosopher_stone: 1 }, t: 60, xp: 500 },
  // 浄化の匣
  r_purewater: { m: 'purifier', in: { water: 2 }, out: { pure_water: 1 }, t: 5, xp: 3 },
  r_purecore:  { m: 'purifier', in: { miasma_core: 1, pure_water: 1 }, out: { pure_core: 1 }, t: 8, xp: 8 },
  r_salt:      { m: 'purifier', in: { bone_powder: 2, ice: 1 }, out: { salt: 1 }, t: 10, xp: 15 },
  // 魔化の匣
  r_eniron:    { m: 'enchanter', in: { iron_ingot: 1, mana: 2 }, out: { enchanted_iron: 1 }, t: 10, xp: 12 },
  r_amulet:    { m: 'enchanter', in: { enchanted_iron: 1, mana_potion: 1, wolf_fang: 3 }, out: { frost_amulet: 1 }, t: 15, xp: 20 },
  r_gold:      { m: 'enchanter', in: { silver_ingot: 1, sun_dust: 2, mana: 3 }, out: { gold: 1 }, t: 15, xp: 20 },
  r_key:       { m: 'enchanter', in: { enchanted_iron: 2, pure_core: 2, gold: 1 }, out: { nether_key: 1 }, t: 20, xp: 40 },
  r_quint:     { m: 'enchanter', in: { mercury: 1, sulfur: 1, salt: 1 }, out: { quintessence: 1 }, t: 30, xp: 80 },
};

// ---- 魔法 -----------------------------------------------------
// 各魔法には4段階の「グレード」があり、段階ごとに名称と性能が変わる。
// type: proj=弾を飛ばす / chain=連鎖雷 / heal=回復 / nova=周囲攻撃 / beam=光線
// grades[n]: そのグレードの性能(基本値を上書きする)
//   count=同時に放つ弾の数 / pierce=貫通 / explode=爆発半径 / slow=鈍足秒数
//   chains=連鎖数 / radius=範囲 / heal=回復割合 / width=光線の太さ
// need[n]: グレード n+1 の習得条件 { mlv: 必要M.Lv, uses: その魔法の使用回数(熟練度) }
//   (グレードIは書物を読むと習得。need[0] は常に null)
const SPELLS = {
  bolt: { ch: '弾', color: '#b9a4ff', type: 'proj', speed: 520, r: 5, desc: '魔力の弾を放つ基本の魔法。',
    grades: [
      { name: '魔弾',     dmg: 12, mp: 2, cd: 0.28 },
      { name: '重魔弾',   dmg: 22, mp: 3, cd: 0.26, count: 2 },
      { name: '穿魔弾',   dmg: 38, mp: 5, cd: 0.24, count: 2, pierce: true },
      { name: '星魔弾',   dmg: 60, mp: 7, cd: 0.22, count: 3, pierce: true },
    ],
    need: [null, { mlv: 5, uses: 150 }, { mlv: 11, uses: 600 }, { mlv: 18, uses: 1500 }] },
  fire: { ch: '火', color: '#ff7a3d', type: 'proj', speed: 380, r: 8, desc: '着弾すると爆発し、周囲を焼く。',
    grades: [
      { name: '火球',     dmg: 26,  mp: 8,  cd: 1.1, explode: 70 },
      { name: '業火球',   dmg: 50,  mp: 13, cd: 1.1, explode: 90 },
      { name: '煉獄球',   dmg: 88,  mp: 20, cd: 1.0, explode: 115 },
      { name: '劫火',     dmg: 140, mp: 30, cd: 1.0, explode: 150, count: 3 },
    ],
    need: [null, { mlv: 7, uses: 80 }, { mlv: 13, uses: 300 }, { mlv: 20, uses: 800 }] },
  heal: { ch: '癒', color: '#7dff9a', type: 'heal', desc: '最大HPの一定割合を回復する。',
    grades: [
      { name: '治癒',     heal: 0.35, mp: 16, cd: 7 },
      { name: '快癒',     heal: 0.5,  mp: 22, cd: 6.5 },
      { name: '聖癒',     heal: 0.7,  mp: 30, cd: 6 },
      { name: '再生の祈り', heal: 1.0, mp: 40, cd: 6 },
    ],
    need: [null, { mlv: 8, uses: 30 }, { mlv: 14, uses: 100 }, { mlv: 21, uses: 250 }] },
  ice: { ch: '氷', color: '#9fe3ff', type: 'proj', speed: 600, r: 6, pierce: true, desc: '敵を貫通し、動きを鈍らせる。',
    grades: [
      { name: '氷槍',     dmg: 22,  mp: 6,  cd: 0.75, slow: 2.0 },
      { name: '氷牙槍',   dmg: 42,  mp: 10, cd: 0.7,  slow: 2.5 },
      { name: '凍獄槍',   dmg: 72,  mp: 15, cd: 0.65, slow: 3.0, count: 2 },
      { name: '絶対零度', dmg: 115, mp: 22, cd: 0.6,  slow: 4.0, count: 3 },
    ],
    need: [null, { mlv: 11, uses: 100 }, { mlv: 16, uses: 350 }, { mlv: 22, uses: 900 }] },
  thunder: { ch: '雷', color: '#ffe66b', type: 'chain', range: 320, desc: '照準付近の敵に落雷し、次々と連鎖する。',
    grades: [
      { name: '雷鎖',     dmg: 30,  mp: 10, cd: 1.4, chains: 4 },
      { name: '迅雷鎖',   dmg: 55,  mp: 15, cd: 1.3, chains: 5 },
      { name: '轟雷鎖',   dmg: 90,  mp: 22, cd: 1.2, chains: 7 },
      { name: '天雷',     dmg: 140, mp: 32, cd: 1.1, chains: 10 },
    ],
    need: [null, { mlv: 12, uses: 80 }, { mlv: 17, uses: 300 }, { mlv: 23, uses: 800 }] },
  nova: { ch: '風', color: '#b8ffd8', type: 'nova', desc: '周囲の敵を切り裂き、吹き飛ばす。',
    grades: [
      { name: '風陣',     dmg: 24,  mp: 12, cd: 3.0, radius: 150 },
      { name: '旋風陣',   dmg: 45,  mp: 17, cd: 2.8, radius: 180 },
      { name: '嵐刃陣',   dmg: 78,  mp: 24, cd: 2.6, radius: 215 },
      { name: '天嵐',     dmg: 125, mp: 34, cd: 2.4, radius: 260 },
    ],
    need: [null, { mlv: 13, uses: 60 }, { mlv: 18, uses: 220 }, { mlv: 24, uses: 600 }] },
  light: { ch: '光', color: '#fff7c2', type: 'beam', length: 640, desc: '神の理を否定する光線。貫通する。',
    grades: [
      { name: '反証の光', dmg: 90,  mp: 26, cd: 4.0, width: 26 },
      { name: '否定の光', dmg: 150, mp: 34, cd: 3.8, width: 32 },
      { name: '棄却の光', dmg: 240, mp: 44, cd: 3.6, width: 40 },
      { name: '審判返し', dmg: 380, mp: 56, cd: 3.4, width: 52 },
    ],
    need: [null, { mlv: 16, uses: 40 }, { mlv: 21, uses: 150 }, { mlv: 26, uses: 400 }] },
};
const GRADE_LABEL = ['I', 'II', 'III', 'IV'];

// ---- 書物 -----------------------------------------------------
// kind: magic=魔術書(M.Lvで解放) / alchemy=錬金術書(A.Lvで解放)
// unlock: 読んだときに解放されるもの
const BOOKS = [
  { id: 'a1', kind: 'alchemy', lv: 1, sp: 1, name: '錬金術の基礎',
    unlock: { machines: ['pot'], recipes: ['r_water', 'r_essence'] },
    text: [
      '──もし、これを読む者がいるのなら。君はきっと、何かを失ってここへ来たのだろう。',
      '錬金術とは「在るものを、在るべき姿へ導く」術である。無から有は生まれない。だが、形を変えることはできる。',
      'まずは【抽出の壺】を使いたまえ。井戸の水を汲み、霊草から精髄を搾る。全ての業はそこから始まる。',
      '設備は一度動かせば、君が眠っていても森を歩いていても働き続ける。錬金術師とは、時間を味方につける者のことだ。',
    ] },
  { id: 'm1', kind: 'magic', lv: 1, sp: 1, name: '魔術入門',
    unlock: { spells: ['bolt'], fields: ['forest'] },
    text: [
      '魔術とは、己の内なる魔力を「形」にする技である。',
      '最初に覚えるべきは【魔弾】。狙いを定め、数字の鍵を押す──それだけで良い。',
      '森には魔物が棲む。だが恐れるな。戦うたびに君の魔力は研ぎ澄まされ、より高度な書が読めるようになる。',
      '（頁の隅に、震える字で書き込みがある）「芽吹き森の霊草は、何度摘んでもまた生える」',
    ] },
  { id: 'a2', kind: 'alchemy', lv: 2, sp: 1, name: '炉と炭',
    unlock: { machines: ['furnace'], recipes: ['r_charcoal', 'r_glass'] },
    text: [
      '火は錬金術師の最も古い友である。',
      '【精錬の竈】は古木を炭に変え、炭の熱は砂を硝子に変える。硝子は薬を容れる器となる。',
      '覚えておきたまえ。一つの設備の産物は、別の設備の糧となる。流れを設計せよ。それが工房を「生かす」ということだ。',
    ] },
  { id: 'm2', kind: 'magic', lv: 3, sp: 2, name: '砂塵の旅路',
    unlock: { spells: ['fire'], fields: ['desert'] },
    text: [
      '森を東へ抜けると、大地が裂けた砂漠がある。かつては豊かな王国だったという。',
      '……「審判」の爪痕は、あの神が降りる遥か以前にも刻まれていたのだ。',
      '砂漠の魔物は硬い。【火球】を授けよう。着弾と同時に弾け、群れを焼き払う。',
    ] },
  { id: 'a3', kind: 'alchemy', lv: 3, sp: 2, name: '砕き、分かつ',
    unlock: { machines: ['mortar'], recipes: ['r_ironpow', 'r_silverpow', 'r_sundust', 'r_bonepow', 'r_fangpow', 'r_iron', 'r_silver'] },
    text: [
      '分解は、結合の前段である。',
      '【破砕の臼】で鉱石を砕き、竈で溶かせば純粋な金属が得られる。陽光石を砕けば、光の粉が舞う。',
      '「分けること」を恐れてはならない。一度ばらばらにしたものこそ、より強く結び直すことができる。',
    ] },
  { id: 'm3', kind: 'magic', lv: 4, sp: 1, name: '癒しの詠唱',
    unlock: { spells: ['heal'] },
    text: [
      '傷を癒す魔術は、最も優しく、最も難しい。',
      '他者のために祈る心が、魔力を「治癒」に変える。──私は、これで妻を救えなかった。',
      '君は、間に合うといい。',
    ] },
  { id: 'a4', kind: 'alchemy', lv: 4, sp: 2, name: '混ぜ合わせる者',
    unlock: { machines: ['cauldron'], recipes: ['r_potion', 'r_lantern', 'r_mana_mush'] },
    text: [
      '【融合の釜】は、錬金術の心臓である。',
      '精髄と水と硝子を合わせれば回復薬に。硝子と精髄と陽光の粉を合わせれば、霧を払う灯りとなる。',
      '北の鉱山は、晴れぬ霧に覆われている。灯りなくして踏み入れば、二度と戻れまい。',
    ] },
  { id: 'm4', kind: 'magic', lv: 5, sp: 2, name: '霧中行軍記',
    unlock: { fields: ['mine'] },
    text: [
      '霧深い鉱山には、鉄と銀と、魔晶が眠る。',
      '霧の中を彷徨う亡霊どもは、瘴気の核を宿している。……あれは元は人だったのかもしれない。',
      '【霧払いの灯】を持っていくこと。それが無ければ、入口すら見つけられないだろう。',
    ] },
  { id: 'a5', kind: 'alchemy', lv: 6, sp: 2, name: '清めの技法',
    unlock: { machines: ['purifier'], recipes: ['r_purewater', 'r_purecore', 'r_mana_crys', 'r_mana_potion'] },
    text: [
      '穢れとは、在るべき場所から外れた力のことだ。',
      '【浄化の匣】で水を清めれば聖水に、聖水で瘴気の核を洗えば、それは聖なる浄化核へと反転する。',
      '穢れと聖性は表裏一体。神が「浄化」と称したあの所業も、見方を変えれば──。',
    ] },
  { id: 'm5', kind: 'magic', lv: 7, sp: 2, name: '氷の理',
    unlock: { spells: ['ice'] },
    text: [
      '氷は「止める」力である。時を、動きを、命の流れを。',
      '【氷槍】は敵を貫き、その足を鈍らせる。一直線に並んだ敵には特に有効だ。',
    ] },
  { id: 'a6', kind: 'alchemy', lv: 8, sp: 2, name: '魔を宿す',
    unlock: { machines: ['enchanter'], recipes: ['r_eniron', 'r_amulet', 'r_gold'] },
    text: [
      '物質に魔を宿すこと。それは錬金術と魔術が交わる地点である。',
      '【魔化の匣】は鉄を魔鉄へ、銀を金へと変える。卑金属を貴金属へ──錬金術師が千年追い求めた夢の、ほんの入口だ。',
      '魔鉄と魔力薬で護符を作れば、永久雪原の寒さにも耐えられよう。',
    ] },
  { id: 'm6', kind: 'magic', lv: 8, sp: 2, name: '雷の系譜',
    unlock: { spells: ['thunder'] },
    text: [
      '雷は天の怒りと呼ばれる。だが実のところ、ただの力の流れに過ぎない。',
      '神の怒りもまた、同じではないのか？',
      '【雷鎖】は狙った敵から次の敵へと跳ね回る。群れを相手にするときに使うといい。',
    ] },
  { id: 'm7', kind: 'magic', lv: 9, sp: 2, name: '極寒の地にて',
    unlock: { fields: ['snow'] },
    text: [
      '北の果て、永久雪原。そこでは時さえ凍りついている。',
      '永久氷は「固定」を、霜の花は「流動」を司る。相反する二つの性質こそ、三原質を生むための鍵だ。',
      '【耐寒の護符】を忘れるな。',
    ] },
  { id: 'm8', kind: 'magic', lv: 10, sp: 2, name: '風の書',
    unlock: { spells: ['nova'] },
    text: [
      '風は形を持たず、ゆえに何者にも縛られない。',
      '【風陣】は己を中心に風の刃を巡らせ、取り囲む敵を切り裂き、吹き飛ばす。',
      '囲まれたときこそ、風を思い出せ。',
    ] },
  { id: 'a7', kind: 'alchemy', lv: 10, sp: 3, name: '三原質',
    unlock: { recipes: ['r_alkahest', 'r_mercury', 'r_sulfur', 'r_salt'] },
    text: [
      '万物は三つの原質から成る。肉体たる【塩】、精神たる【水銀】、魂たる【硫黄】。',
      'まず万能溶媒アルカヘストを作れ。それで銀を溶かし、霜の花と合わせれば水銀となる。',
      '陽光と浄化核と炭からは硫黄が。骨と永久氷からは塩が生まれる。',
      '三つが揃ったとき、君は「第五」への扉の前に立つ。',
    ] },
  { id: 'a8', kind: 'alchemy', lv: 11, sp: 2, name: '冥府の門',
    unlock: { recipes: ['r_key'] },
    text: [
      '冥界への門は、生者には開かれない。',
      'だが、魔鉄の芯に浄化核を二つ嵌め込み、金で封じた鍵ならば──神の錠前をも欺けるはずだ。',
      '（ここで筆跡が途切れ、別の日付で続いている）「私は行けなかった。臆病だったのだ」',
    ] },
  { id: 'm9', kind: 'magic', lv: 12, sp: 3, name: '冥界考',
    unlock: { fields: ['underworld'] },
    text: [
      '神は人を殺せない。',
      '神が人を「消す」ように見えるのは、その者の全てを冥界に縛り付けるからだ。肉体も、記憶も、魂も。',
      'ゆえに──冥界に堕ちた者は、厳密には死んでいない。縛りを解く術さえあれば、取り戻せる。',
      '冥界の奥には【冥府の番人】がいる。神が遣わした、縛りの守り手だ。その心核こそが、呪いを解く最後の鍵となる。',
    ] },
  { id: 'a9', kind: 'alchemy', lv: 13, sp: 3, name: '第五元素',
    unlock: { recipes: ['r_quint'] },
    text: [
      '塩・水銀・硫黄。三つを魔化の匣で一つに溶かし合わせよ。',
      '生まれるのは火でも水でも風でも土でもない、第五の元素クインテッセンス。',
      'それは「在るべき姿」そのもの。神の定めた理の外側にある力だ。',
    ] },
  { id: 'm10', kind: 'magic', lv: 14, sp: 3, name: '神罰の反証',
    unlock: { spells: ['light'] },
    text: [
      '【審判神エリクラウス】。自らを審判と名乗る神。',
      '彼は人が愚かだと言った。だが愚かさを裁く資格が、彼にあるのか。',
      'この書に記す魔術【反証の光】は、神の理を否定する光。──使う日が来ないことを、祈っていた。',
    ] },
  { id: 'a10', kind: 'alchemy', lv: 15, sp: 3, name: '大いなる業',
    unlock: { recipes: ['r_red', 'r_stone'] },
    text: [
      'マグヌム・オプス。黒化、白化、黄化、そして赤化。',
      '第五元素に金と、冥界の魂と冥石を溶かし込め。赤きティンクトゥラが生まれる。',
      'そして最後に、番人の心核を。',
      '【賢者の石】──それは万物を在るべき姿へ還す石。冥界に縛られた魂も、在るべき場所へ還るだろう。',
      '頼む。私にはできなかったことを。',
    ] },
];

// ---- 技能 -----------------------------------------------------
// tree: industry=工業 / explore=探索 / combat=戦闘
// max: 最大ランク / cost: 1ランクあたりのSP / req: 前提技能(そのランク以上が必要)
const SKILL_TREES = [
  ['industry', '工業', '#ffb35c'],
  ['explore', '探索', '#6fdc8c'],
  ['combat', '戦闘', '#ff6b8b'],
];
const SKILLS = {
  ind_speed:  { tree: 'industry', name: '錬成加速',   max: 5, cost: 1, desc: '全設備の生産速度 +15%/ランク' },
  ind_xp:     { tree: 'industry', name: '錬金の悟り', max: 3, cost: 1, desc: '獲得A.Lv経験値 +25%/ランク' },
  ind_slots:  { tree: 'industry', name: '工房拡張',   max: 3, cost: 2, desc: '各設備の建造上限 +1/ランク' },
  ind_save:   { tree: 'industry', name: '省材の心得', max: 3, cost: 2, desc: '素材を消費しない確率 +8%/ランク', req: { ind_speed: 2 } },
  ind_double: { tree: 'industry', name: '豊穣の錬成', max: 3, cost: 2, desc: '生産物が2倍になる確率 +8%/ランク', req: { ind_speed: 2 } },

  exp_yield:  { tree: 'explore', name: '採取の心得', max: 5, cost: 1, desc: '採取量 +20%/ランク' },
  exp_speed:  { tree: 'explore', name: '健脚',       max: 3, cost: 1, desc: '移動速度 +10%/ランク' },
  exp_gather: { tree: 'explore', name: '手際',       max: 3, cost: 1, desc: '採取時間 -20%/ランク' },
  exp_luck:   { tree: 'explore', name: '幸運',       max: 3, cost: 2, desc: '魔物の素材ドロップ率 +15%/ランク', req: { exp_yield: 2 } },
  exp_recall: { tree: 'explore', name: '帰還術',     max: 2, cost: 2, desc: '帰還詠唱の時間 3秒→2秒→1秒', req: { exp_gather: 1 } },

  cmb_dmg:    { tree: 'combat', name: '魔力増幅', max: 5, cost: 1, desc: '魔法の与ダメージ +10%/ランク' },
  cmb_hp:     { tree: 'combat', name: '生命強化', max: 5, cost: 1, desc: '最大HP +20/ランク' },
  cmb_mp:     { tree: 'combat', name: '魔力容量', max: 5, cost: 1, desc: '最大MP +15/ランク' },
  cmb_regen:  { tree: 'combat', name: '魔力循環', max: 3, cost: 1, desc: 'MP自然回復 +35%/ランク', req: { cmb_mp: 1 } },
  cmb_cd:     { tree: 'combat', name: '詠唱短縮', max: 3, cost: 2, desc: '魔法の再使用時間 -10%/ランク', req: { cmb_dmg: 2 } },
};

// ---- 敵 -------------------------------------------------------
// ai: chase=追跡 / ranged=遠距離 / charge=突進 / boss=ボス
// drops: [アイテム, 確率, 最小数, 最大数]
const ENEMIES = {
  slime:    { name: 'スライム', hp: 22, spd: 55, dmg: 6, xp: 3, r: 12, color: '#6fd6c0', ai: 'chase', drops: [['slime_gel', 0.65, 1, 2]] },
  wolf:     { name: '森狼', hp: 36, spd: 115, dmg: 9, xp: 6, r: 13, color: '#9b9b86', ai: 'chase', drops: [['wolf_fang', 0.5, 1, 1]] },
  scorpion: { name: '骨蠍', hp: 70, spd: 80, dmg: 14, xp: 11, r: 14, color: '#c9a66b', ai: 'charge', drops: [['bone', 0.7, 1, 2]] },
  sandwraith:{ name: '砂の亡霊', hp: 48, spd: 60, dmg: 12, xp: 12, r: 13, color: '#e0c090', ai: 'ranged', drops: [['bone', 0.3, 1, 1], ['sunstone', 0.25, 1, 1]] },
  ghost:    { name: '霧の亡霊', hp: 80, spd: 72, dmg: 16, xp: 17, r: 14, color: '#b0b8d0', ai: 'chase', drops: [['miasma_core', 0.45, 1, 1]] },
  golem:    { name: '岩のゴーレム', hp: 200, spd: 45, dmg: 26, xp: 28, r: 20, color: '#8a7a6a', ai: 'chase', drops: [['iron_ore', 0.6, 1, 3], ['crystal', 0.3, 1, 1]] },
  icewolf:  { name: '氷狼', hp: 120, spd: 135, dmg: 22, xp: 27, r: 14, color: '#bfe8ff', ai: 'chase', drops: [['wolf_fang', 0.6, 1, 2], ['miasma_core', 0.2, 1, 1]] },
  frostspirit:{ name: '雪の精', hp: 100, spd: 65, dmg: 20, xp: 30, r: 13, color: '#eef8ff', ai: 'ranged', drops: [['frost_flower', 0.5, 1, 1], ['crystal', 0.25, 1, 1]] },
  dead:     { name: '亡者', hp: 190, spd: 78, dmg: 30, xp: 42, r: 15, color: '#8c7aa8', ai: 'chase', drops: [['soul_ash', 0.5, 1, 2], ['miasma_core', 0.3, 1, 1]] },
  specter:  { name: '怨霊', hp: 150, spd: 70, dmg: 28, xp: 46, r: 14, color: '#d0a0ff', ai: 'ranged', drops: [['soul_ash', 0.4, 1, 2], ['nether_stone', 0.3, 1, 1]] },
  guardian: { name: '冥府の番人', hp: 3200, spd: 70, dmg: 45, xp: 700, r: 36, color: '#ff3355', ai: 'boss', boss: true, drops: [['nether_heart', 1, 1, 1], ['soul_ash', 1, 5, 8]] },
};

// ---- フィールド -----------------------------------------------
// need: 探索に必要な「鍵となる品」(消費しない)
// nodes: 採取ポイント [アイテム, 出現の重み, 最小数, 最大数]
const FIELDS = {
  forest: {
    name: '芽吹き森', lv: '1〜4', desc: '工房を囲む大森林。霊草や古木が豊富で、弱い魔物が棲む。',
    floor: '#33502f', floor2: '#37562f', wall: '#122416', wallTop: '#24582c',
    nodes: [['herb', 5, 2, 4], ['wood', 4, 2, 3], ['stone', 3, 2, 3], ['mushroom', 1.5, 1, 2]],
    enemies: [['slime', 3], ['wolf', 1.5]], maxEnemies: 10,
  },
  desert: {
    name: '割れた砂漠', lv: '3〜7', desc: '大地が無数に裂けた赤い砂漠。陽光石が眠り、骨の魔物が徘徊する。',
    floor: '#a8764a', floor2: '#a06e40', wall: '#4a2a18', wallTop: '#7a4428',
    nodes: [['sand', 5, 2, 4], ['sunstone', 3, 1, 2], ['stone', 2, 2, 3], ['herb', 0.8, 1, 2]],
    enemies: [['scorpion', 2], ['sandwraith', 1.5]], maxEnemies: 11,
  },
  mine: {
    name: '霧深い鉱山', lv: '5〜10', need: 'lantern', fog: 'rgba(28,30,40,', desc: '晴れぬ霧に包まれた廃鉱。鉄・銀・魔晶が眠る。',
    floor: '#4a4650', floor2: '#46424c', wall: '#16141a', wallTop: '#2e2b34',
    nodes: [['iron_ore', 4, 1, 3], ['silver_ore', 3, 1, 2], ['crystal', 2, 1, 2], ['stone', 3, 2, 4]],
    enemies: [['ghost', 2.5], ['golem', 1]], maxEnemies: 11,
  },
  snow: {
    name: '永久雪原', lv: '9〜13', need: 'frost_amulet', desc: '時さえ凍る北の果て。永久氷と霜の花が咲く。',
    floor: '#dfe8ef', floor2: '#d4dfe8', wall: '#5d7d96', wallTop: '#9ab8cc',
    nodes: [['ice', 4, 1, 2], ['frost_flower', 3, 1, 2], ['silver_ore', 2, 1, 2], ['crystal', 2, 1, 2]],
    enemies: [['icewolf', 2], ['frostspirit', 1.5]], maxEnemies: 12,
  },
  underworld: {
    name: '冥界', lv: '12〜', need: 'nether_key', tint: 'rgba(60,0,60,0.18)', desc: '審判神に堕とされた人々が縛られる地の底。レネイは、この先に。',
    floor: '#2e1a36', floor2: '#331d3c', wall: '#0d0610', wallTop: '#3a1a4a',
    nodes: [['soul_ash', 4, 1, 3], ['nether_stone', 3, 1, 2]],
    enemies: [['dead', 2], ['specter', 1.5]], maxEnemies: 12, boss: 'guardian',
  },
};
const FIELD_ORDER = ['forest', 'desert', 'mine', 'snow', 'underworld'];

// ---- 物語 -----------------------------------------------------
const STORY = {
  prologue: [
    { title: '序', text: '平和とは言えずとも、緩やかに時が流れる世界。\nクラヴィスは妹のレネイと二人、慎ましくも幸せに暮らしていた。' },
    { title: '降臨', text: 'ある日、空が割れ、世界に「神」が降り立った。\n\n其れは【審判神エリクラウス】を名乗り、こう告げた。\n\n「人は蔓延り過ぎた。愚か者が溢れ、もはや霊長の資格に値しない。\n　──故にこれより、浄化する」' },
    { title: '喪失', text: '神が腕を振るうと、世界中の大地がひび割れた。\n人々の七割が、その裂け目へと堕ちていった。\n\n「兄さん──！」\n\n落ちてゆくレネイに手を伸ばし──一度は、掴んだ。\nけれど大地の震えに負けて、クラヴィスはその手を離してしまった。' },
    { title: '工房', text: '失意のまま彷徨い、辿り着いたのは人の寄りつかぬ大森林の深奥。\nそこに、古ぼけた小屋があった。\n\n外見よりずっと広い室内には、無数の書物と、埃をかぶった錬金設備。\nここはかつて、魔術師であり錬金術師であった誰かの工房だった。' },
    { title: '覚悟', text: '手に取った一冊に、こう記されていた。\n\n「神は人を殺せない。殺すように見えるのは、人の全てを冥界に縛り付けるからだ」\n\nレネイは、死んでいない。\nならば──取り戻す。\n\n神の呪いを解く唯一の触媒、【賢者の石】を創り出して。' },
  ],
  ending: [
    { title: '冥界の底', text: '賢者の石が、紅く脈打つ。\n冥界の闇が、その光に触れた端から解けてゆく。\n\n縛られていた無数の魂が、ゆっくりと顔を上げた。' },
    { title: '再会', text: '光の中に、見覚えのある背中があった。\n\n「……兄さん？」\n\n振り返ったレネイの顔は、あの日と何も変わらない。\n\n今度こそ。\nクラヴィスは手を伸ばし──その手を、決して離さなかった。' },
    { title: '終', text: '審判神の呪いは解けた。\n冥界に縛られた人々は、在るべき場所へと還ってゆく。\n\n森の奥の小さな工房には、今日も二人分の足音が響いている。\n\n── Descensus ad Inferos ──\n\n（工房はこのまま運営を続けられます）' },
  ],
};

// ---- 目標(次に何をすべきかのガイド) ---------------------------
const OBJECTIVES = [
  { text: '書庫で『錬金術の基礎』を読もう', done: s => s.books.a1 },
  { text: '書庫で『魔術入門』を読もう', done: s => s.books.m1 },
  { text: '工房で抽出の壺に「清水」のレシピを設定しよう', done: s => (s.stats.made.water || 0) > 0 },
  { text: '探索タブから【芽吹き森】へ行き、素材を集めよう', done: s => s.stats.visited.forest },
  { text: '抽出の壺で「草の精髄」を作ろう', done: s => (s.stats.made.essence || 0) > 0 },
  { text: 'A.Lv2で『炉と炭』を読み、精錬の竈を建てよう', done: s => countMachines(s, 'furnace') > 0 },
  { text: 'M.Lv3で『砂塵の旅路』を読み、【割れた砂漠】へ', done: s => s.stats.visited.desert },
  { text: 'A.Lv3で『砕き、分かつ』を読み、破砕の臼を建てよう', done: s => countMachines(s, 'mortar') > 0 },
  { text: '『混ぜ合わせる者』を読み、融合の釜で「霧払いの灯」を作ろう', done: s => (s.stats.made.lantern || 0) > 0 },
  { text: 'M.Lv5で『霧中行軍記』を読み、【霧深い鉱山】へ', done: s => s.stats.visited.mine },
  { text: 'A.Lv6で『清めの技法』を読み、浄化の匣を建てよう', done: s => countMachines(s, 'purifier') > 0 },
  { text: 'A.Lv8で『魔を宿す』を読み、「耐寒の護符」を作ろう', done: s => (s.stats.made.frost_amulet || 0) > 0 },
  { text: 'M.Lv9で『極寒の地にて』を読み、【永久雪原】へ', done: s => s.stats.visited.snow },
  { text: '『三原質』を読み、塩・水銀・硫黄を作ろう', done: s => ['salt', 'mercury', 'sulfur'].every(i => (s.stats.made[i] || 0) > 0) },
  { text: '『冥府の門』を読み、「冥府の鍵」を作ろう', done: s => (s.stats.made.nether_key || 0) > 0 },
  { text: 'M.Lv12で『冥界考』を読み、【冥界】へ', done: s => s.stats.visited.underworld },
  { text: '冥界の奥に潜む【冥府の番人】を討て', done: s => s.flags.bossDefeated },
  { text: '第五元素、そして赤きティンクトゥラを作ろう', done: s => (s.stats.made.red_tincture || 0) > 0 },
  { text: '【賢者の石】を創り出せ', done: s => (s.stats.made.philosopher_stone || 0) > 0 },
  { text: '探索タブの【冥界】から、レネイを迎えに行こう', done: s => s.flags.ended },
];

function countMachines(s, type) {
  return s.machines.filter(m => m.type === type).length;
}

// Node.js(テスト)から読み込めるようにするための一行
if (typeof module !== 'undefined') {
  module.exports = { ITEMS, ITEM_CATS, MACHINES, RECIPES, SPELLS, GRADE_LABEL, BOOKS, SKILL_TREES, SKILLS, ENEMIES, FIELDS, FIELD_ORDER, STORY, OBJECTIVES, countMachines };
}
