// 敵データ — Unity版 EnemyDesigns/*.cs からの移植
// フェーズ1: Floor 0「廃墟の回廊」通常4体 + エリート4体 + 暫定ボス
// (Floor 0-2 の専用ボスは Unity 版でもアセット未定義のため、エリート強化版を暫定使用)
import type { EnemyDef, SkillDef, ElementType } from '../core/types';
import * as F1 from './enemies_floor123';

function enemySkill(p: Partial<SkillDef> & Pick<SkillDef, 'id' | 'name' | 'description'>): SkillDef {
  return {
    element: 'Physical', damageType: 'Physical', mpCost: 0,
    basePower: 0, hitCount: 1, hitsAllEnemies: false, hitsAllAllies: false,
    canBreak: false, isHeal: false, healPower: 0,
    ...p,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  Floor 0 通常敵 (Floor0NormalDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const GOBLIN: EnemyDef = {
  id: 'f0n_goblin', name: 'ゴブリン', rank: 'Normal',
  lore: '廃墟の暗がりに潜む小柄な野蛮族。乱暴だが臆病で、数で優位に立てないと逃げる。毒を塗った粗末なナイフを愛用している。',
  stats: {
    maxHP: 75, maxMP: 0, physicalAttack: 24, magicAttack: 0,
    physicalDefense: 6, magicDefense: 4, speed: 24, luck: 0,
    criticalRate: 5, accuracyRate: 90,
  },
  shieldPoints: 1, isUndead: false,
  elementWeaknesses: ['Fire', 'Physical'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0n_goblin_stab', name: 'ゴブリン突き',
        description: '粗末なナイフで一体を突き刺す。', basePower: 1.2,
      }),
      priority: 2, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0n_poison_knife', name: '毒ナイフ',
        description: '毒を塗ったナイフで一体を切りつける。20%の確率で毒を付与する。',
        element: 'None', statusChance: 0.20,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 18, jpReward: 5, goldReward: 12,
  tint: 0x5a7a3a,
};

export const ROTTING_ZOMBIE: EnemyDef = {
  id: 'f0n_zombie', name: '腐乱ゾンビ', rank: 'Normal',
  lore: '廃墟に倒れた兵士の遺体が死霊術で蘇った不死者。鈍重だが頑丈で、腐敗した息が毒として周囲に広がる。',
  stats: {
    maxHP: 110, maxMP: 0, physicalAttack: 20, magicAttack: 0,
    physicalDefense: 6, magicDefense: 2, speed: 10, luck: 0,
    criticalRate: 3, accuracyRate: 85,
  },
  shieldPoints: 0, isUndead: true,
  elementWeaknesses: ['Fire', 'Light', 'Physical'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0n_rotten_claw', name: '腐った爪',
        description: '腐敗した爪で一体を引っかく。', basePower: 1.0,
      }),
      priority: 2, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0n_stench_breath', name: '腐臭の吐息',
        description: '腐敗した息を一体に吹きかける。25%の確率で毒を付与する。',
        element: 'None', statusChance: 0.25,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 22, jpReward: 7, goldReward: 14,
  tint: 0x6a5a4a,
};

export const SKELETON_ARCHER: EnemyDef = {
  id: 'f0n_skel_archer', name: '骸骨の射手', rank: 'Normal',
  lore: 'かつて弓兵だった骸骨が死霊術で蘇った不死者。前衛を避けて後方から矢を放ち続ける。骨の軽い体は素早いが脆い。',
  stats: {
    maxHP: 60, maxMP: 0, physicalAttack: 18, magicAttack: 0,
    physicalDefense: 5, magicDefense: 4, speed: 22, luck: 0,
    criticalRate: 8, accuracyRate: 92,
  },
  shieldPoints: 0, isUndead: true,
  elementWeaknesses: ['Fire', 'Light', 'Physical'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0n_bone_arrow', name: '骨の矢',
        description: '骨で作った矢を一体に放つ。', basePower: 1.1,
      }),
      priority: 2, useChance: 0.70, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0n_double_shot', name: '二連射',
        description: '矢を素早く2本連続で放つ。', basePower: 0.7, hitCount: 2,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 18, jpReward: 5, goldReward: 10,
  tint: 0xc9c2b0,
};

export const UNDEAD_MAGE: EnemyDef = {
  id: 'f0n_undead_mage', name: '亡者の魔術師', rank: 'Normal',
  lore: '廃墟に残された魔術師の亡霊。生前の呪文詠唱の記憶だけが体を動かす。闇の礫と腐敗の呪いで侵入者を蝕む。',
  stats: {
    maxHP: 95, maxMP: 0, physicalAttack: 0, magicAttack: 28,
    physicalDefense: 4, magicDefense: 10, speed: 20, luck: 0,
    criticalRate: 5, accuracyRate: 90,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light', 'Physical'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0n_dark_pebble', name: '暗黒の礫',
        description: '闇の魔力を固めた礫を一体に放つ。',
        element: 'Dark', damageType: 'Magical', basePower: 1.0,
      }),
      priority: 2, useChance: 0.55, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0n_corruption_curse', name: '腐敗の呪い',
        description: '腐敗の呪いを一体に刻む。20%の確率で毒を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.20,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.45, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 28, jpReward: 9, goldReward: 18,
  tint: 0x7a5a9a,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 0 エリート (Floor0EliteDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const GARM: EnemyDef = {
  id: 'f0e_garm', name: '亡骸騎士 ガルム', rank: 'Elite',
  lore: '廃墟の回廊に残された古い騎士の骸が、死霊術によって動かされている。かつては忠義の戦士だったが、今や命令の残滓だけが体を動かす。錆びた剣でも、その一撃は重い。',
  stats: {
    maxHP: 480, maxMP: 0, physicalAttack: 60, magicAttack: 0,
    physicalDefense: 22, magicDefense: 8, speed: 20, luck: 0,
    criticalRate: 8, accuracyRate: 90,
  },
  shieldPoints: 3, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0e_rusty_thrust', name: '錆剣突き',
        description: '錆びた剣で一体を深々と貫く。30%の確率で物理防御を2ターン低下させる。',
        basePower: 1.7, statusChance: 0.30,
        appliedStatus: { type: 'DefDown', duration: 2, value: 0.30 },
      }),
      priority: 2, useChance: 0.40, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_bone_crush', name: '骨砕き',
        description: '全体重を乗せた一撃で骨ごと砕く。', basePower: 2.2,
      }),
      priority: 2, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_skull_roar', name: '骸骨の咆哮',
        description: '亡骸が腹の底から吠える。全体に30%の確率で暗闇を付与する。',
        element: 'None', hitsAllEnemies: true, statusChance: 0.30,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 },
      }),
      priority: 1, useChance: 0.20, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_undead_will', name: '亡者の意地',
        description: '不死の意志で自らの骨を繋ぎ直し、HPを80回復する。',
        healAmountFlat: 80,
      }),
      priority: 3, useChance: 0.15, healthThreshold: 30,
    },
  ],
  actionsPerTurn: 1,
  expReward: 120, jpReward: 35, goldReward: 55,
  tint: 0x8a9aae,
};

export const RUINED_SORCERER: EnemyDef = {
  id: 'f0e_sorcerer', name: '廃術士', rank: 'Elite',
  lore: '死霊術に取り憑かれたまま朽ちた魔術師。意識のない体が術式を繰り返す。腐敗の魔力が周囲を侵食し、仲間の亡者を強化する。',
  stats: {
    maxHP: 250, maxMP: 0, physicalAttack: 0, magicAttack: 38,
    physicalDefense: 8, magicDefense: 15, speed: 26, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0e_corruption_wave', name: '腐敗の波',
        description: '腐敗の魔力を波状に放つ。全体に闇属性ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.2, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.40, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_corruption_bind', name: '腐敗の呪縛',
        description: '腐敗の魔力で一体の動きを縛る。40%の確率で麻痺を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.40,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_undead_fury', name: '死霊鼓舞',
        description: '死霊の呪詛で仲間を鼓舞し、攻撃力を2ターン強化する。',
        buff: [{ type: 'AtkUp', value: 0.20, duration: 2 }],
      }),
      priority: 3, useChance: 0.25, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 70, jpReward: 22, goldReward: 30,
  tint: 0x9a6aba,
};

export const CHAIN_SOLDIER: EnemyDef = {
  id: 'f0e_chain_soldier', name: '鎖縛り兵', rank: 'Elite',
  lore: '廃墟の看守だった亡骸が、鎖を武器に蘇った。鈍重だが頑丈で、前に立ちはだかり仲間を守る。',
  stats: {
    maxHP: 380, maxMP: 0, physicalAttack: 52, magicAttack: 0,
    physicalDefense: 20, magicDefense: 6, speed: 16, luck: 0,
    criticalRate: 5, accuracyRate: 88,
  },
  shieldPoints: 2, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0e_chain_strike', name: '鎖攻撃',
        description: '重い鎖を振り回して一体を打ち据える。', basePower: 1.5,
      }),
      priority: 2, useChance: 0.50, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_binding_throw', name: '拘束投げ',
        description: '鎖を大きく振り回し全体に打撃を与える。',
        basePower: 1.0, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_chain_bind', name: '鎖縛り',
        description: '鎖で全身を縛り動きを封じる。35%の確率で麻痺を付与する。',
        element: 'None', statusChance: 0.35,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 90, jpReward: 28, goldReward: 40,
  tint: 0x707a8a,
};

export const RAMBARD: EnemyDef = {
  id: 'f0e_rambard', name: '石礫の守護像 ランバード', rank: 'Elite',
  lore: '廃墟の入口を守るために造られた石の守護像。命令が刻まれた石板が核となり、破壊命令がない限り動き続ける。鈍重だが堅牢で、シールドを絶えず再生する。',
  stats: {
    maxHP: 550, maxMP: 0, physicalAttack: 65, magicAttack: 0,
    physicalDefense: 28, magicDefense: 5, speed: 14, luck: 0,
    criticalRate: 5, accuracyRate: 88,
  },
  shieldPoints: 4, isUndead: false,
  elementWeaknesses: ['Lightning'],
  actions: [
    {
      skill: enemySkill({
        id: 'f0e_boulder_strike', name: '石礫の一撃',
        description: '石の拳で一体に強烈な一撃を叩き込む。', basePower: 1.6,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_rubble_throw', name: '瓦礫投げ',
        description: '自身の石片を全体に撒き散らす。', basePower: 0.85, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_petrifying_dust', name: '石化の粉',
        description: '石化を引き起こす粉塵を一体に吹きかける。30%の確率で麻痺を付与する。',
        element: 'None', statusChance: 0.30,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.20, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0e_rock_skin', name: '岩の皮膚',
        description: '石の外皮を硬化・再生させ、守護の障壁を作り出す。シールド+2。',
        shieldRestore: 2,
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 130, jpReward: 38, goldReward: 60,
  tint: 0x9a9282,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 0 ボス — 屍呼びの司祭 モルヴァ
//  ※ Unity版では Floor0 の BossPool アセットが未定義だったため、
//     フロアのロア (廃墟の回廊 / かつての王国の残骸 / 死霊術で蘇る亡者) に
//     沿って新規デザイン。廃墟の亡者すべてを甦らせた術の主。
//     設計様式は Floor4BossDesign.cs 準拠 (常時+HP50%以下フェーズ2 / 2行動)。
// ══════════════════════════════════════════════════════════════════════

export const F0_BOSS_MORVA: EnemyDef = {
  id: 'f0b_morva', name: '屍呼びの司祭 モルヴァ', rank: 'Boss',
  lore: '滅んだ王国の墓所に巣食う不死の司祭。廃墟を彷徨う亡者はすべて、この者が死霊術で甦らせたもの。生者を憎むのではなく、ただ死者を増やすことだけを望んでいる。',
  stats: {
    maxHP: 1000, maxMP: 0, physicalAttack: 18, magicAttack: 46,
    physicalDefense: 14, magicDefense: 24, speed: 26, luck: 0,
    criticalRate: 6, accuracyRate: 92,
  },
  shieldPoints: 3, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    // ── Phase 1 (常時) ──
    {
      skill: enemySkill({
        id: 'f0b_necro_bolt', name: '死霊の礫',
        description: '凝縮した死の魔力を一体に撃ち込む。闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.5,
      }),
      priority: 3, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0b_decay_wave', name: '腐敗の波動',
        description: '腐敗の魔力を波として全体に浴びせる。闇属性魔法全体ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.0, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0b_death_hex', name: '死の呪詛',
        description: '死の呪いを全体に振りまく。30%の確率で全員に毒を付与する。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.30,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f0b_offering', name: '亡者の供物',
        description: '周囲の亡骸を喰らい、自らの朽ちた体を繋ぎ直す。HPを120回復する。',
        healAmountFlat: 120,
      }),
      priority: 0, useChance: 0.20, healthThreshold: 0,
    },
    // ── Phase 2 (HP50%以下) ──
    {
      skill: enemySkill({
        id: 'f0b_dead_march', name: '死者の行進',
        description: '無数の亡者の怨念を束ねて全体に叩きつける。闇属性魔法全体ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.8, hitsAllEnemies: true,
      }),
      priority: 3, useChance: 0.40, healthThreshold: 50,
    },
    {
      skill: enemySkill({
        id: 'f0b_soul_harvest', name: '魂の収奪',
        description: '魂そのものを直接刈り取る。防御を無視した死の一撃を一体に与える。',
        element: 'None', damageType: 'True', basePower: 3.9,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 50,
    },
    {
      skill: enemySkill({
        id: 'f0b_nether_bind', name: '冥府の呪縛',
        description: '冥府の鎖で全体を縛り上げる。25%の確率で全員に麻痺を付与する。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.25,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.30, healthThreshold: 50,
    },
  ],
  actionsPerTurn: 2,
  expReward: 320, jpReward: 85, goldReward: 160,
  tint: 0x6a4a8a,
};

// ══════════════════════════════════════════════════════════════════════
//  エンカウンターグループ (Floor0NormalSOGenerator.cs)
// ══════════════════════════════════════════════════════════════════════

export interface EncounterGroup {
  groupName: string;
  enemies: EnemyDef[];
  weight: number;
}

export interface FloorDef {
  floorIndex: number;
  floorName: string;
  floorSubtitle: string;
  normalEncounters: EncounterGroup[];
  eliteEncounters: EncounterGroup[];
  bossPool: EnemyDef[][];
  baseGoldReward: number;
  // フェーズ2以降のフロアはこの倍率で暫定スケール(専用敵データ移植まで)
  interimScale?: number;
}

export const FLOOR_0: FloorDef = {
  floorIndex: 0,
  floorName: '廃墟の回廊',
  floorSubtitle: 'かつての王国の残骸',
  normalEncounters: [
    { groupName: '廃墟の歩哨',   enemies: [GOBLIN], weight: 1.2 },
    { groupName: 'ゴブリンの群れ', enemies: [GOBLIN, GOBLIN], weight: 1.0 },
    { groupName: '廃墟の混成',   enemies: [ROTTING_ZOMBIE, GOBLIN], weight: 0.9 },
    { groupName: '射撃陣営',     enemies: [SKELETON_ARCHER, SKELETON_ARCHER, ROTTING_ZOMBIE], weight: 0.8 },
    { groupName: '亡者の術師',   enemies: [UNDEAD_MAGE], weight: 0.7 },
  ],
  eliteEncounters: [
    { groupName: '亡骸騎士',     enemies: [GARM], weight: 1.0 },
    { groupName: '廃術士と看守', enemies: [RUINED_SORCERER, CHAIN_SOLDIER], weight: 1.0 },
    { groupName: '石の守護像',   enemies: [RAMBARD], weight: 0.8 },
  ],
  bossPool: [[F0_BOSS_MORVA]],
  baseGoldReward: 50,
};

// Floor 1-3: 専用敵データ (enemies_floor123.ts / Floor{1,2,3}{Normal,Elite}Design.cs)
// エンカウンターグループ構成・重みは各デザインファイルのヘッダーコメント準拠。
export const FLOOR_1: FloorDef = {
  floorIndex: 1,
  floorName: '暗黒の森',
  floorSubtitle: '黒く捻れた木々の迷宮',
  normalEncounters: [
    { groupName: '森の追跡者', enemies: [F1.DARK_WOLF], weight: 1.2 },
    { groupName: '狼の群れ',   enemies: [F1.DARK_WOLF, F1.DARK_WOLF], weight: 1.0 },
    { groupName: '森の毒気',   enemies: [F1.TOXIC_SPORE_FUNGUS, F1.DARK_WOLF], weight: 0.9 },
    { groupName: '妖精の悪戯', enemies: [F1.FOREST_SPRITE, F1.FOREST_SPRITE, F1.TOXIC_SPORE_FUNGUS], weight: 0.8 },
    { groupName: '蠢く根',     enemies: [F1.ENTANGLING_VINE], weight: 0.7 },
  ],
  eliteEncounters: [
    { groupName: '影の狂猟',   enemies: [F1.RAXEN], weight: 1.0 },
    { groupName: '森の儀式',   enemies: [F1.DARK_FOREST_MEDIUM, F1.SHADOW_SPIRIT], weight: 1.0 },
    { groupName: '千年の根霊', enemies: [F1.NAGUL], weight: 0.8 },
  ],
  bossPool: [[F1.F1_BOSS_GRISELDA]],
  baseGoldReward: 65,
};

export const FLOOR_2: FloorDef = {
  floorIndex: 2,
  floorName: '呪われた城',
  floorSubtitle: '深紅の月光が照らす玉座',
  normalEncounters: [
    { groupName: '城の歩哨',     enemies: [F1.CURSED_GUARD], weight: 1.2 },
    { groupName: '衛兵の巡回',   enemies: [F1.CURSED_GUARD, F1.CURSED_GUARD], weight: 1.0 },
    { groupName: '血月の眷属',   enemies: [F1.CURSE_BLOOD_BAT, F1.CURSED_GUARD], weight: 0.9 },
    { groupName: '彷徨う怨嗟',   enemies: [F1.CASTLE_WRAITH, F1.CASTLE_WRAITH, F1.CURSE_BLOOD_BAT], weight: 0.8 },
    { groupName: '地下牢の番人', enemies: [F1.SHADOW_EXECUTIONER], weight: 0.7 },
  ],
  eliteEncounters: [
    { groupName: '紅月の近衛',   enemies: [F1.GALEN], weight: 1.0 },
    { groupName: '魔女と使い魔', enemies: [F1.FERNA, F1.CURSED_FAMILIAR], weight: 1.0 },
    { groupName: '伯爵の怨霊',   enemies: [F1.VELMON], weight: 0.8 },
  ],
  bossPool: [[F1.F2_BOSS_SANGUINA]],
  baseGoldReward: 80,
};

export const FLOOR_3: FloorDef = {
  floorIndex: 3,
  floorName: '古代遺跡の回廊',
  floorSubtitle: '封じられた巨像の眠る地',
  normalEncounters: [
    { groupName: '遺跡の番兵',   enemies: [F1.RUIN_STONE_SOLDIER], weight: 1.2 },
    { groupName: '石兵の隊列',   enemies: [F1.RUIN_STONE_SOLDIER, F1.RUIN_STONE_SOLDIER], weight: 1.0 },
    { groupName: '砂中の待ち伏せ', enemies: [F1.POISON_SAND_SERPENT, F1.RUIN_STONE_SOLDIER], weight: 0.9 },
    { groupName: '封印の残響',   enemies: [F1.SEALED_WRAITH, F1.SEALED_WRAITH, F1.POISON_SAND_SERPENT], weight: 0.8 },
    { groupName: '眠れる巨像',   enemies: [F1.ANCIENT_GIANT_SOLDIER], weight: 0.7 },
  ],
  eliteEncounters: [
    { groupName: '覚醒の石兵',   enemies: [F1.GROM], weight: 1.0 },
    { groupName: '封印の儀式',   enemies: [F1.FARUN, F1.SEAL_GUARDIAN], weight: 1.0 },
    { groupName: '深淵の先触れ', enemies: [F1.VORGA], weight: 0.8 },
  ],
  bossPool: [],   // VALGOTT はファイル後方で定義されるため下で代入
  baseGoldReward: 100,
};

export const FLOORS: FloorDef[] = [FLOOR_0, FLOOR_1, FLOOR_2, FLOOR_3];

// Floor 3 最終ボス: 千年の扉番 ヴァルゴット (ValgottDesign.cs)
export const VALGOTT: EnemyDef = {
  id: 'f3b_valgott', name: '千年の扉番 ヴァルゴット', rank: 'Boss',
  lore: '古代遺跡の最深部で千年間、封印の扉を守り続けてきた巨躯の守護者。侵入者に慈悲はない。',
  stats: {
    maxHP: 2400, maxMP: 0, physicalAttack: 85, magicAttack: 40,
    physicalDefense: 30, magicDefense: 15, speed: 42, luck: 0,
    criticalRate: 10, accuracyRate: 92,
  },
  shieldPoints: 6, isUndead: false,
  elementWeaknesses: ['Lightning', 'Dark'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3b_gate_smash', name: '扉番の鉄槌',
        description: '巨大な拳を叩きつける。', basePower: 1.8,
      }),
      priority: 2, useChance: 0.40, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3b_millennium_quake', name: '千年の震撼',
        description: '大地を揺らし全体に打撃を与える。', basePower: 1.1, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3b_seal_light', name: '封印の光',
        description: '封印の術式が輝き、一体の行動を封じる。40%の確率で麻痺。',
        element: 'None', damageType: 'Magical', statusChance: 0.40,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.30, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 2,
  expReward: 800, jpReward: 200, goldReward: 400,
  tint: 0xc9a24a,
};

FLOORS[3] = { ...FLOORS[3], bossPool: [[VALGOTT]] };

// ── 敵スキルレジストリ (ゼノの吸収スキル永続化用) ────────────────────────
export const ALL_ENEMIES: EnemyDef[] = [
  // Floor 0
  GOBLIN, ROTTING_ZOMBIE, SKELETON_ARCHER, UNDEAD_MAGE,
  GARM, RUINED_SORCERER, CHAIN_SOLDIER, RAMBARD,
  F0_BOSS_MORVA,
  // Floor 1
  F1.DARK_WOLF, F1.TOXIC_SPORE_FUNGUS, F1.FOREST_SPRITE, F1.ENTANGLING_VINE,
  F1.RAXEN, F1.DARK_FOREST_MEDIUM, F1.SHADOW_SPIRIT, F1.NAGUL,
  F1.F1_BOSS_GRISELDA,
  // Floor 2
  F1.CURSED_GUARD, F1.CURSE_BLOOD_BAT, F1.CASTLE_WRAITH, F1.SHADOW_EXECUTIONER,
  F1.GALEN, F1.FERNA, F1.CURSED_FAMILIAR, F1.VELMON,
  F1.F2_BOSS_SANGUINA,
  // Floor 3
  F1.RUIN_STONE_SOLDIER, F1.POISON_SAND_SERPENT, F1.SEALED_WRAITH, F1.ANCIENT_GIANT_SOLDIER,
  F1.GROM, F1.FARUN, F1.SEAL_GUARDIAN, F1.VORGA,
  VALGOTT,
];

export function findEnemySkillById(id: string): SkillDef | undefined {
  for (const e of ALL_ENEMIES) {
    for (const a of e.actions) {
      if (a.skill.id === id) return a.skill;
    }
  }
  return undefined;
}
