// Floor 1〜3 敵データ — Unity版 EnemyDesigns/Floor{1,2,3}{Normal,Elite}Design.cs の移植
// エンカウンターグループ構成・重みは各デザインファイルのヘッダーコメント準拠。
// Floor 1・2 のボスは Unity 版でも未定義のため、各フロアの看板エリートの
// 強化版を暫定ボスとして使用 (Floor 3 は正規のヴァルゴット)。
import type { EnemyDef, SkillDef } from '../core/types';

function enemySkill(p: Partial<SkillDef> & Pick<SkillDef, 'id' | 'name' | 'description'>): SkillDef {
  return {
    element: 'Physical', damageType: 'Physical', mpCost: 0,
    basePower: 0, hitCount: 1, hitsAllEnemies: false, hitsAllAllies: false,
    canBreak: false, isHeal: false, healPower: 0,
    ...p,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  Floor 1「暗黒の森」 通常敵 (Floor1NormalDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const DARK_WOLF: EnemyDef = {
  id: 'f1n_dark_wolf', name: '闇色の狼', rank: 'Normal',
  lore: '暗黒の森の魔力に侵食された野生の狼。毛並みは夜闇の色に染まり、その遠吠えは聞いた者の視界を奪う。群れで行動することが多い。',
  stats: {
    maxHP: 120, maxMP: 0, physicalAttack: 38, magicAttack: 0,
    physicalDefense: 12, magicDefense: 8, speed: 32, luck: 0,
    criticalRate: 8, accuracyRate: 90,
  },
  shieldPoints: 0, isUndead: false,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1n_fang_strike', name: '牙の一撃',
        description: '鋭い牙で一体に噛みつく。', basePower: 1.3,
      }),
      priority: 2, useChance: 0.65, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1n_dark_howl', name: '暗闇の遠吠え',
        description: '闇を纏った遠吠えで一体の視界を奪う。15%の確率で暗闇を付与する。',
        element: 'None', statusChance: 0.15,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 },
      }),
      priority: 1, useChance: 0.35, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 30, jpReward: 9, goldReward: 18,
  tint: 0x2a3244,
};

export const TOXIC_SPORE_FUNGUS: EnemyDef = {
  id: 'f1n_spore_fungus', name: '毒胞子菌', rank: 'Normal',
  lore: '暗黒の森に生える発光するキノコが魔力で変異した魔生物。動く必要はなく、胞子と菌糸を周囲に広げて侵入者を蝕む。',
  stats: {
    maxHP: 140, maxMP: 0, physicalAttack: 0, magicAttack: 30,
    physicalDefense: 10, magicDefense: 8, speed: 10, luck: 0,
    criticalRate: 3, accuracyRate: 88,
  },
  shieldPoints: 0, isUndead: false,
  elementWeaknesses: ['Fire'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1n_spore_cloud', name: '胞子散布',
        description: '毒性の胞子を一体に浴びせる。30%の確率で毒を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.30,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1n_mycelium_burst', name: '菌糸噴射',
        description: '地中の菌糸を膨張させ、風の力で一体を打ち据える。',
        element: 'Wind', damageType: 'Magical', basePower: 0.9,
      }),
      priority: 2, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 28, jpReward: 8, goldReward: 16,
  tint: 0x7a9a4a,
};

export const FOREST_SPRITE: EnemyDef = {
  id: 'f1n_forest_sprite', name: '森の妖精', rank: 'Normal',
  lore: '暗黒の森に棲む悪意に満ちた小さな精霊。人を惑わし、眠らせて森の奥へ誘い込む。単体では脆いが、複数で行動すると厄介。',
  stats: {
    maxHP: 85, maxMP: 0, physicalAttack: 0, magicAttack: 35,
    physicalDefense: 8, magicDefense: 14, speed: 36, luck: 0,
    criticalRate: 8, accuracyRate: 92,
  },
  shieldPoints: 0, isUndead: false,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1n_fairy_pebble', name: '妖精の礫',
        description: '妖精の魔力で固めた風の礫を一体に放つ。',
        element: 'Wind', damageType: 'Magical', basePower: 0.9,
      }),
      priority: 2, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1n_bewitching_dust', name: '惑わしの粉',
        description: '眠りを誘う輝く粉を一体に振りかける。18%の確率で睡眠を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.18,
        appliedStatus: { type: 'Sleep', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 32, jpReward: 10, goldReward: 20,
  tint: 0x6ac2a0,
};

export const ENTANGLING_VINE: EnemyDef = {
  id: 'f1n_entangling_vine', name: '絡み蔓', rank: 'Normal',
  lore: '暗黒の森の根が魔力で覚醒し、自ら動き始めた植物型の魔物。鞭のように振るう蔓は強靭で、絡みつかれると身動きが取れなくなる。',
  stats: {
    maxHP: 180, maxMP: 0, physicalAttack: 34, magicAttack: 0,
    physicalDefense: 18, magicDefense: 6, speed: 6, luck: 0,
    criticalRate: 3, accuracyRate: 86,
  },
  shieldPoints: 1, isUndead: false,
  elementWeaknesses: ['Fire'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1n_vine_whip', name: '蔓打ち',
        description: '強靭な蔓を鞭のように振るい一体を打つ。', basePower: 1.1,
      }),
      priority: 2, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1n_entangle_bind', name: '絡み縛り',
        description: '蔓で一体の手足をがんじがらめに縛る。20%の確率で麻痺を付与する。',
        element: 'None', statusChance: 0.20,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 38, jpReward: 11, goldReward: 22,
  tint: 0x3d6b2a,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 1 エリート (Floor1EliteDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const RAXEN: EnemyDef = {
  id: 'f1e_raxen', name: '影の狂猟 ラクセン', rank: 'Elite',
  lore: '暗黒の森の深部に潜む変異した大型の猛獣。その体は影そのものでできており、光に触れると苦痛を感じる。傷ついた部位は影の力で瞬く間に再生する。',
  stats: {
    maxHP: 540, maxMP: 0, physicalAttack: 75, magicAttack: 25,
    physicalDefense: 20, magicDefense: 12, speed: 44, luck: 0,
    criticalRate: 10, accuracyRate: 90,
  },
  shieldPoints: 2, isUndead: false,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1e_dark_claw', name: '闇爪',
        description: '影の爪で一体を深々と引き裂く。', basePower: 1.8,
      }),
      priority: 2, useChance: 0.38, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_tearing_bite', name: '噛み裂き',
        description: '鋭い牙で一体の肉を噛み裂く。', basePower: 2.1,
      }),
      priority: 2, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_dark_howl', name: '暗黒の遠吠え',
        description: '闇を纏った遠吠えで全体の視界を奪う。30%の確率で全員に暗闇を付与する。',
        element: 'None', hitsAllEnemies: true, statusChance: 0.30,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 },
      }),
      priority: 1, useChance: 0.22, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_shadow_regen', name: '影の再生',
        description: '影の力で傷口を塞ぎ、HPを120回復する。',
        healAmountFlat: 120,
      }),
      priority: 3, useChance: 0.15, healthThreshold: 35,
    },
  ],
  actionsPerTurn: 1,
  expReward: 150, jpReward: 45, goldReward: 65,
  tint: 0x1c2438,
};

export const DARK_FOREST_MEDIUM: EnemyDef = {
  id: 'f1e_medium', name: '暗森の霊媒師', rank: 'Elite',
  lore: '森の奥で古代の儀式を繰り返す死霊術師の亡骸。自我はないが、術式の記憶だけが肉体を動かし続けている。',
  stats: {
    maxHP: 280, maxMP: 0, physicalAttack: 0, magicAttack: 45,
    physicalDefense: 10, magicDefense: 18, speed: 30, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  // ※「影霊召喚」はUnity版でも召喚未実装のプレースホルダーのため除外
  actions: [
    {
      skill: enemySkill({
        id: 'f1e_shadow_vortex', name: '影渦',
        description: '影の渦を一体に向けて放つ。闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.3,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_dark_wave', name: '暗闇の波',
        description: '闇の魔力の波動で全体を打ち据える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.0, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_cursed_mist', name: '呪縛の霧',
        description: '呪われた霧を全体に漂わせる。20%の確率で全員に睡眠を付与する。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.20,
        appliedStatus: { type: 'Sleep', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.15, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 85, jpReward: 27, goldReward: 40,
  tint: 0x4a3a66,
};

export const SHADOW_SPIRIT: EnemyDef = {
  id: 'f1e_shadow_spirit', name: '影霊', rank: 'Elite',
  lore: '霊媒師の儀式によって呼び出された影の精霊。実体が薄く物理攻撃を弾くが、光属性には極めて脆い。',
  stats: {
    maxHP: 180, maxMP: 0, physicalAttack: 0, magicAttack: 28,
    physicalDefense: 5, magicDefense: 20, speed: 50, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 0, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1e_shadow_touch', name: '影触れ',
        description: '影の爪先で一体に触れ、闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 0.9,
      }),
      priority: 2, useChance: 0.50, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_cursed_touch', name: '呪い触れ',
        description: '呪われた影で一体に触れる。30%の確率で毒を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.30,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_shadow_merge', name: '影融合',
        description: '霊媒師と影を融合させ、攻撃力を高める。魔法攻撃力+15%（2ターン）。',
        buff: [{ type: 'MatkUp', value: 0.15, duration: 2 }],
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 55, jpReward: 17, goldReward: 28,
  tint: 0x30284a,
};

export const NAGUL: EnemyDef = {
  id: 'f1e_nagul', name: '千年の根霊 ナグル', rank: 'Elite',
  lore: '暗黒の森の奥に根を張り続けて千年が経つ古代の植物精霊。その巨体は半ば石化しており、体からは絶えず毒の胞子が溢れ出す。',
  stats: {
    maxHP: 620, maxMP: 0, physicalAttack: 80, magicAttack: 0,
    physicalDefense: 30, magicDefense: 8, speed: 12, luck: 0,
    criticalRate: 5, accuracyRate: 88,
  },
  shieldPoints: 3, isUndead: false,
  elementWeaknesses: ['Fire'],
  actions: [
    {
      skill: enemySkill({
        id: 'f1e_root_strike', name: '根の打撃',
        description: '巨大な根を振り上げ一体を叩き潰す。', basePower: 1.7,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_toxic_spores', name: '毒胞子',
        description: '毒性の胞子を全体に撒き散らす。40%の確率で全員に毒を付与する。',
        element: 'None', hitsAllEnemies: true, statusChance: 0.40,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_root_regen', name: '根の再生',
        description: '大地の力を吸い上げ、傷を癒す。HPを150回復する。',
        healAmountFlat: 150,
      }),
      priority: 3, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f1e_vine_bind', name: '蔦縛り',
        description: '蔦を伸ばして一体の手足を縛る。35%の確率で麻痺を付与する。',
        element: 'None', statusChance: 0.35,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.15, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 160, jpReward: 48, goldReward: 70,
  tint: 0x5a4a2a,
};

// Floor 1 暫定ボス: ラクセン強化版 (Unity版もFloor1のBossPoolアセット未定義)
export const F1_BOSS_RAXEN_ALPHA: EnemyDef = {
  ...RAXEN,
  id: 'f1b_raxen_alpha',
  name: '深影の主 ラクセン',
  rank: 'Boss',
  lore: '暗黒の森そのものと同化した影の獣の王。森のすべての影が、彼の爪であり牙である。',
  stats: {
    ...RAXEN.stats,
    maxHP: 1100, physicalAttack: 85, magicAttack: 35, physicalDefense: 24, speed: 46,
  },
  shieldPoints: 4,
  actionsPerTurn: 2,
  expReward: 400, jpReward: 100, goldReward: 200,
  tint: 0x101830,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 2「呪われた城」 通常敵 (Floor2NormalDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const CURSED_GUARD: EnemyDef = {
  id: 'f2n_cursed_guard', name: '呪われた衛兵', rank: 'Normal',
  lore: '呪われた城の守備についていた兵士の亡骸。血月の呪いに縛られ、侵入者を排除し続ける。生前の戦闘本能だけが残っている。',
  stats: {
    maxHP: 160, maxMP: 0, physicalAttack: 50, magicAttack: 0,
    physicalDefense: 20, magicDefense: 10, speed: 20, luck: 0,
    criticalRate: 5, accuracyRate: 88,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2n_sword_strike', name: '剣撃',
        description: '呪いを帯びた剣で一体を斬りつける。', basePower: 1.2,
      }),
      priority: 2, useChance: 0.65, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2n_cursed_shield', name: '呪いの盾',
        description: '呪われた盾で守りを固める。シールド+1。',
        shieldRestore: 1,
      }),
      priority: 3, useChance: 0.35, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 40, jpReward: 12, goldReward: 26,
  tint: 0x5a4a5a,
};

export const CURSE_BLOOD_BAT: EnemyDef = {
  id: 'f2n_blood_bat', name: '呪血蝙蝠', rank: 'Normal',
  lore: '血月の呪いを受けた大型の蝙蝠。鋭い牙で血を啜り、傷口から出血を引き起こす。夜の城内を飛び回り複数で襲いかかる。',
  stats: {
    maxHP: 100, maxMP: 0, physicalAttack: 44, magicAttack: 0,
    physicalDefense: 8, magicDefense: 12, speed: 42, luck: 0,
    criticalRate: 10, accuracyRate: 90,
  },
  shieldPoints: 0, isUndead: false,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2n_blood_bite', name: '血の噛みつき',
        description: '鋭い牙で一体に噛みつく。', basePower: 1.1,
      }),
      priority: 2, useChance: 0.55, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2n_blood_drain', name: '血吸い',
        description: '傷口から血を啜る。25%の確率で出血を付与する。',
        element: 'None', statusChance: 0.25,
        appliedStatus: { type: 'Bleed', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.45, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 35, jpReward: 10, goldReward: 22,
  tint: 0x6a2a3a,
};

export const CASTLE_WRAITH: EnemyDef = {
  id: 'f2n_castle_wraith', name: '城の怨霊', rank: 'Normal',
  lore: '呪われた城で非業の死を遂げた者の怨念が霊体として顕現した存在。恨みの波動で侵入者を蝕み、暗闇に引きずり込もうとする。',
  stats: {
    maxHP: 130, maxMP: 0, physicalAttack: 0, magicAttack: 48,
    physicalDefense: 6, magicDefense: 22, speed: 28, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2n_grudge_wave', name: '怨念の波',
        description: '怨念を波動にして一体に叩きつける。闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.0,
      }),
      priority: 2, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2n_cursing_gaze', name: '呪縛の眼差し',
        description: '怨念の眼で一体を見据える。20%の確率で暗闇を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.20,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 42, jpReward: 13, goldReward: 28,
  tint: 0x3a4a6a,
};

export const SHADOW_EXECUTIONER: EnemyDef = {
  id: 'f2n_executioner', name: '影の処刑人', rank: 'Normal',
  lore: '呪われた城の地下牢で死刑を執行し続けた処刑人の亡骸。巨大な斧を振るう腕力は死してなお衰えず、薙ぎ払いで複数を一掃する。',
  stats: {
    maxHP: 200, maxMP: 0, physicalAttack: 58, magicAttack: 0,
    physicalDefense: 25, magicDefense: 10, speed: 14, luck: 0,
    criticalRate: 8, accuracyRate: 88,
  },
  shieldPoints: 2, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2n_execution_strike', name: '処刑の一撃',
        description: '全体重を乗せた斧の一撃で一体を叩き潰す。', basePower: 1.5,
      }),
      priority: 2, useChance: 0.65, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2n_judgment_sweep', name: '断罪の薙ぎ',
        description: '巨大な斧を大きく振るい全体を薙ぎ払う。',
        basePower: 1.1, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 55, jpReward: 16, goldReward: 38,
  tint: 0x2a2a34,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 2 エリート (Floor2EliteDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const GALEN: EnemyDef = {
  id: 'f2e_galen', name: '紅月の近衛騎士 ガレン', rank: 'Elite',
  lore: '呪われた城が崩壊の始まりを迎えたとき、血月の光を浴びて不死となった近衛騎士。王への忠誠だけが残り、侵入者を排除するために動き続ける。',
  stats: {
    maxHP: 580, maxMP: 0, physicalAttack: 88, magicAttack: 0,
    physicalDefense: 35, magicDefense: 12, speed: 35, luck: 0,
    criticalRate: 10, accuracyRate: 90,
  },
  shieldPoints: 4, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2e_cursed_slash', name: '呪剣斬',
        description: '呪いを纏った剣で一体を鋭く斬り裂く。', basePower: 1.5,
      }),
      priority: 2, useChance: 0.40, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_judgment_blade', name: '断罪の剣',
        description: '全力を込めた一撃で一体を断ち切る。', basePower: 1.8,
      }),
      priority: 2, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_bloodmoon_sweep', name: '血月の一掃',
        description: '血月の力を解放し、薙ぎ払いで全体を打ち据える。',
        basePower: 1.2, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.15, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_guard_restore', name: '守護再建',
        description: '呪われた鎧を補強し、守護の障壁を再構築する。シールド+2。',
        shieldRestore: 2,
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 2,   // 1ターン2回行動
  expReward: 200, jpReward: 55, goldReward: 80,
  tint: 0x8a2a3a,
};

export const FERNA: EnemyDef = {
  id: 'f2e_ferna', name: '呪いの魔女 フェルナ', rank: 'Elite',
  lore: 'かつて城の魔術顧問として仕えた女性魔術師の亡霊。死してなお呪いの研究を続け、訪れる者に呪縛を重ねて消耗させる。使い魔との連携が真骨頂。',
  stats: {
    maxHP: 300, maxMP: 0, physicalAttack: 0, magicAttack: 50,
    physicalDefense: 8, magicDefense: 22, speed: 28, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2e_cursed_gaze', name: '呪いの一瞥',
        description: '呪いの眼差しで一体を見据える。35%の確率で暗闇を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.35,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 },
      }),
      priority: 1, useChance: 0.28, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_corruption_wave', name: '腐敗の波',
        description: '腐敗の魔力を一体に叩き込む。闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.1,
      }),
      priority: 2, useChance: 0.27, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_binding_curse', name: '縛りの呪詛',
        description: '呪縛の魔力で一体の動きを縛る。30%の確率で麻痺を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.30,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_curse_enhance', name: '呪いの強化',
        description: '使い魔に呪いの力を注ぎ込み、攻撃力を高める。攻撃力+20%（2ターン）。',
        buff: [{ type: 'AtkUp', value: 0.20, duration: 2 }],
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 100, jpReward: 32, goldReward: 50,
  tint: 0x6a3a7a,
};

export const CURSED_FAMILIAR: EnemyDef = {
  id: 'f2e_familiar', name: '呪縛の使い魔', rank: 'Elite',
  lore: 'フェルナが生前から使役し続けてきた使い魔。主の死後も呪いの契約で縛られ、戦い続けている。爪と叫び声で相手を消耗させる前衛役。',
  stats: {
    maxHP: 220, maxMP: 0, physicalAttack: 55, magicAttack: 0,
    physicalDefense: 12, magicDefense: 10, speed: 38, luck: 0,
    criticalRate: 8, accuracyRate: 90,
  },
  shieldPoints: 1, isUndead: false,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f2e_cursed_claw', name: '呪いの爪',
        description: '呪いに染まった鋭い爪で一体を引き裂く。', basePower: 1.5,
      }),
      priority: 2, useChance: 0.45, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_shadow_bite', name: '暗影噛み',
        description: '影に潜り込みながら一体に噛みつく。', basePower: 1.3,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_binding_shriek', name: '呪縛の叫び',
        description: '呪いを込めた甲高い叫びで一体を眠りに誘う。25%の確率で睡眠を付与する。',
        element: 'None', statusChance: 0.25,
        appliedStatus: { type: 'Sleep', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 75, jpReward: 22, goldReward: 35,
  tint: 0x4a2a5a,
};

export const VELMON: EnemyDef = {
  id: 'f2e_velmon', name: '呪われた伯爵の霊 ヴェルモン', rank: 'Elite',
  lore: '城の主であった伯爵の怨霊。呪いの連鎖に囚われ、城から離れられなくなった。その怒りと嘆きが呪術となり、訪れる者を絶望へと叩き落とす。',
  stats: {
    maxHP: 500, maxMP: 0, physicalAttack: 0, magicAttack: 62,
    physicalDefense: 15, magicDefense: 30, speed: 25, luck: 0,
    criticalRate: 8, accuracyRate: 92,
  },
  shieldPoints: 3, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    // Phase 1 (常時)
    {
      skill: enemySkill({
        id: 'f2e_cursed_hand', name: '呪縛の手',
        description: '怨念を込めた手で一体を掴み、闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.2,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_bloodmoon_gaze', name: '血月の眼差し',
        description: '血月に染まった眼で一体を見据える。30%の確率で暗闇を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.30,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 },
      }),
      priority: 1, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_corrupt_breath', name: '腐敗の息吹',
        description: '腐敗した魔力を全体に吹き散らす。',
        element: 'Dark', damageType: 'Magical', basePower: 0.9, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.20, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f2e_curse_armor', name: '呪いの鎧',
        description: '呪いの力で霊体の守護を再構築する。シールド+1。',
        shieldRestore: 1,
      }),
      priority: 3, useChance: 0.15, healthThreshold: 0,
    },
    // Phase 2 (HP40%以下で解放)
    {
      skill: enemySkill({
        id: 'f2e_despair_bind', name: '絶望の呪縛',
        description: '絶望の呪いで全体の動きを縛る。25%の確率で全員に麻痺を付与する。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.25,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 40,
    },
    {
      skill: enemySkill({
        id: 'f2e_blood_storm', name: '血の嵐',
        description: '血月の力を解放し、嵐となった呪血が全体を蹂躙する。',
        element: 'Dark', damageType: 'Magical', basePower: 1.5, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 40,
    },
    {
      skill: enemySkill({
        id: 'f2e_collapse_roar', name: '崩壊の咆哮',
        description: '崩壊の怒りを咆哮に乗せ全体に放つ。30%の確率で全員に睡眠を付与する。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.30,
        appliedStatus: { type: 'Sleep', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.25, healthThreshold: 40,
    },
  ],
  actionsPerTurn: 1,
  expReward: 210, jpReward: 58, goldReward: 85,
  tint: 0x5a2a4a,
};

// Floor 2 暫定ボス: ヴェルモン強化版 (Unity版もFloor2のBossPoolアセット未定義)
export const F2_BOSS_VELMON_LORD: EnemyDef = {
  ...VELMON,
  id: 'f2b_velmon_lord',
  name: '血月の王 ヴェルモン',
  rank: 'Boss',
  lore: '血月の呪いの中心で王を名乗り続ける伯爵の怨霊。城のすべての呪いが、彼の玉座に集まっていく。',
  stats: {
    ...VELMON.stats,
    maxHP: 1600, magicAttack: 72, magicDefense: 34, speed: 30,
  },
  shieldPoints: 5,
  actionsPerTurn: 2,
  expReward: 550, jpReward: 140, goldReward: 280,
  tint: 0x7a1a3a,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 3「古代遺跡の回廊」 通常敵 (Floor3NormalDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const RUIN_STONE_SOLDIER: EnemyDef = {
  id: 'f3n_stone_soldier', name: '遺跡の石兵', rank: 'Normal',
  lore: '古代遺跡の守護のために錬成された石製の兵士。血月の呪いとは無関係に古代の命令で動き続ける。分厚い石の外皮と盾の構えで侵入者を押しとどめる。',
  stats: {
    maxHP: 220, maxMP: 0, physicalAttack: 64, magicAttack: 0,
    physicalDefense: 28, magicDefense: 12, speed: 14, luck: 0,
    criticalRate: 5, accuracyRate: 88,
  },
  shieldPoints: 2, isUndead: false,
  elementWeaknesses: ['Lightning', 'Wind'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3n_stone_strike', name: '石の打撃',
        description: '石の拳で一体を打ちつける。', basePower: 1.2,
      }),
      priority: 2, useChance: 0.65, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3n_steadfast_stance', name: '堅守の構え',
        description: '堅固な構えで守りを固める。シールド+1。',
        shieldRestore: 1,
      }),
      priority: 3, useChance: 0.35, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 52, jpReward: 14, goldReward: 34,
  tint: 0x8a8272,
};

export const POISON_SAND_SERPENT: EnemyDef = {
  id: 'f3n_sand_serpent', name: '毒砂蛇', rank: 'Normal',
  lore: '遺跡の砂地に潜む大型の毒蛇。古代の封印によって毒腺が強化され、一噛みで即死級の猛毒を注入する。砂に潜伏して獲物を待ち伏せる。',
  stats: {
    maxHP: 160, maxMP: 0, physicalAttack: 58, magicAttack: 0,
    physicalDefense: 14, magicDefense: 10, speed: 40, luck: 0,
    criticalRate: 10, accuracyRate: 90,
  },
  shieldPoints: 0, isUndead: false,
  elementWeaknesses: ['Ice', 'Fire'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3n_poison_fang', name: '毒牙',
        description: '猛毒を含む牙で一体に噛みつく。', basePower: 1.1,
      }),
      priority: 2, useChance: 0.55, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3n_venom_breath', name: '猛毒の吐息',
        description: '強力な毒液を一体に吐きかける。35%の確率で毒を付与する。',
        element: 'None', statusChance: 0.35,
        appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
      }),
      priority: 1, useChance: 0.45, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 48, jpReward: 13, goldReward: 30,
  tint: 0x9a8a3a,
};

export const SEALED_WRAITH: EnemyDef = {
  id: 'f3n_sealed_wraith', name: '封印の亡霊', rank: 'Normal',
  lore: '古代遺跡の封印陣に縛られた霊魂。遺跡の守護のため強制的に霊体化させられた者の怨念が顕現している。侵入者に呪縛をかけて動きを封じる。',
  stats: {
    maxHP: 160, maxMP: 0, physicalAttack: 0, magicAttack: 55,
    physicalDefense: 8, magicDefense: 24, speed: 28, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 1, isUndead: true,
  elementWeaknesses: ['Fire', 'Light'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3n_ancient_curse', name: '古代の呪詛',
        description: '遺跡に刻まれた古代の呪詛を一体に叩きつける。闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.0,
      }),
      priority: 2, useChance: 0.60, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3n_seal_bind', name: '封印の呪縛',
        description: '封印の力で一体の動きを縛る。20%の確率で麻痺を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.20,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.40, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 55, jpReward: 15, goldReward: 36,
  tint: 0x6a8aaa,
};

export const ANCIENT_GIANT_SOLDIER: EnemyDef = {
  id: 'f3n_giant_soldier', name: '古代の巨人兵', rank: 'Normal',
  lore: '遺跡最深部を守る巨大な石造りの守護者。通常の石兵の数倍の大きさを誇り、その踏みつけは地を揺るがす。圧倒的な質量と3枚のシールドで前進を阻む。',
  stats: {
    maxHP: 300, maxMP: 0, physicalAttack: 75, magicAttack: 0,
    physicalDefense: 35, magicDefense: 15, speed: 8, luck: 0,
    criticalRate: 5, accuracyRate: 86,
  },
  shieldPoints: 3, isUndead: false,
  elementWeaknesses: ['Lightning', 'Wind'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3n_giant_stomp', name: '巨人の踏みつけ',
        description: '巨大な足で一体を踏みつぶす。', basePower: 1.5,
      }),
      priority: 2, useChance: 0.65, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3n_collapse_swing', name: '崩壊の薙ぎ払い',
        description: '石腕を大きく振り払い全体を薙ぎ払う。',
        basePower: 1.2, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 72, jpReward: 19, goldReward: 48,
  tint: 0xaa9a7a,
};

// ══════════════════════════════════════════════════════════════════════
//  Floor 3 エリート (Floor3EliteDesign.cs)
// ══════════════════════════════════════════════════════════════════════

export const GROM: EnemyDef = {
  id: 'f3e_grom', name: '覚醒の石兵 グロム', rank: 'Elite',
  lore: '古代文明が戦争のために造り出した石製の自動戦闘兵器。長い封印の眠りから目覚め、刻まれた命令のまま侵入者を排除し続ける。',
  stats: {
    maxHP: 660, maxMP: 0, physicalAttack: 95, magicAttack: 40,
    physicalDefense: 40, magicDefense: 12, speed: 16, luck: 0,
    criticalRate: 5, accuracyRate: 88,
  },
  shieldPoints: 3, isUndead: false,
  elementWeaknesses: ['Lightning', 'Fire'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3e_boulder_smash', name: '石礫の殴打',
        description: '巨大な石の拳で一体を叩き潰す。', basePower: 1.8,
      }),
      priority: 2, useChance: 0.35, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_seal_crush', name: '封印の砕撃',
        description: '封印の力を解放した衝撃波で全体を打ち据える。',
        basePower: 1.3, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.20, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_ancient_regen', name: '古代の再生',
        description: '古代の修復機構が起動し、HPを180回復する。',
        healAmountFlat: 180,
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_rune_shield', name: '刻印の盾',
        description: '石の外皮に刻まれた紋章が輝き、守護の盾を再生する。シールド+2。',
        shieldRestore: 2,
      }),
      priority: 3, useChance: 0.15, healthThreshold: 0,
    },
    {
      // 封印崩壊: 全体固定300真ダメージ (7.5 × MagATK40 ≒ 300)
      skill: enemySkill({
        id: 'f3e_seal_collapse', name: '封印崩壊',
        description: '蓄積した封印エネルギーが一気に解放され、全体に300の固定ダメージを与える。',
        damageType: 'True', basePower: 7.5, hitsAllEnemies: true,
      }),
      priority: 3, useChance: 0.10, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 250, jpReward: 65, goldReward: 95,
  tint: 0x7a7262,
};

export const FARUN: EnemyDef = {
  id: 'f3e_farun', name: '古代祭司 ファルン', rank: 'Elite',
  lore: '古代遺跡の封印術式が祭司の形を取って具現化した存在。意志はなく、封印を維持するという機能だけが動かしている。自身に干渉する呪いを即座に解除し、仲間の守護剣士を強化する。',
  stats: {
    maxHP: 320, maxMP: 0, physicalAttack: 0, magicAttack: 55,
    physicalDefense: 10, magicDefense: 25, speed: 32, luck: 0,
    criticalRate: 5, accuracyRate: 92,
  },
  shieldPoints: 1, isUndead: false,
  elementWeaknesses: ['Fire', 'Wind'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3e_seal_radiance', name: '封印の光芒',
        description: '封印の光の束を一体に向けて放つ。光属性魔法ダメージを与える。',
        element: 'Light', damageType: 'Magical', basePower: 1.1,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_ancient_bind', name: '古代の縛り',
        description: '古代の封印術で一体の動きを縛る。35%の確率で麻痺を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.35,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_seal_release', name: '封印解除',
        description: '封印術式を逆用し、自身に付与された状態異常をすべて解除する。',
        clearsOwnStatus: true,
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_rune_boost', name: '刻印強化',
        description: '仲間に刻印を施し、攻撃力を高める。攻撃力+20%（2ターン）。',
        buff: [{ type: 'AtkUp', value: 0.20, duration: 2 }],
      }),
      priority: 3, useChance: 0.25, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 110, jpReward: 32, goldReward: 52,
  tint: 0xc2b28a,
};

export const SEAL_GUARDIAN: EnemyDef = {
  id: 'f3e_seal_guardian', name: '封印の守護剣士', rank: 'Elite',
  lore: '古代遺跡の入口を守るために造られた石製の剣士型守護機構。祭司の指令に従い前衛を担い、侵入者を剣で排除する。',
  stats: {
    maxHP: 420, maxMP: 0, physicalAttack: 85, magicAttack: 0,
    physicalDefense: 30, magicDefense: 15, speed: 28, luck: 0,
    criticalRate: 8, accuracyRate: 90,
  },
  shieldPoints: 2, isUndead: false,
  elementWeaknesses: ['Lightning', 'Fire'],
  actions: [
    {
      skill: enemySkill({
        id: 'f3e_seal_sword', name: '封印剣',
        description: '封印の紋章を刻んだ剣で一体を鋭く斬る。', basePower: 1.7,
      }),
      priority: 2, useChance: 0.40, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_ancient_charge', name: '古代の突撃',
        description: '全体重を乗せて一体に突撃する。', basePower: 1.4,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_rune_slash', name: '刻印の斬撃',
        description: '紋章の力を解放した薙ぎ払いで全体を斬り裂く。',
        basePower: 1.5, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.10, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_seal_barrier', name: '封印の防壁',
        description: '封印の術式で防壁を再構築する。シールド+1。',
        shieldRestore: 1,
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
  ],
  actionsPerTurn: 1,
  expReward: 130, jpReward: 38, goldReward: 58,
  tint: 0x9a9282,
};

export const VORGA: EnemyDef = {
  id: 'f3e_vorga', name: '深淵の先触れ ヴォルガ', rank: 'Elite',
  lore: '深淵への封印に生じた亀裂から這い出た、深淵の意志の断片。実体を持ちながら半ば虚無に属しており、光と炎だけが有効に作用する。',
  stats: {
    maxHP: 560, maxMP: 0, physicalAttack: 0, magicAttack: 75,
    physicalDefense: 20, magicDefense: 35, speed: 28, luck: 0,
    criticalRate: 8, accuracyRate: 92,
  },
  shieldPoints: 3, isUndead: false,
  elementWeaknesses: ['Light', 'Fire'],
  actions: [
    // Phase 1 (常時)
    {
      skill: enemySkill({
        id: 'f3e_abyss_tentacle', name: '深淵の触手',
        description: '深淵の虚無から伸びた触手で一体を打ち据える。闇属性魔法ダメージを与える。',
        element: 'Dark', damageType: 'Magical', basePower: 1.3,
      }),
      priority: 2, useChance: 0.30, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_seal_shackle', name: '封印の呪縛',
        description: '古代封印の残滓を利用して一体の動きを縛る。30%の確率で麻痺を付与する。',
        element: 'None', damageType: 'Magical', statusChance: 0.30,
        appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_abyss_regen', name: '深淵の再生',
        description: '深淵の虚無に傷を沈め、闇の力でHPを200回復する。',
        healAmountFlat: 200,
      }),
      priority: 3, useChance: 0.25, healthThreshold: 0,
    },
    {
      skill: enemySkill({
        id: 'f3e_void_purge', name: '虚無の浄化',
        description: '虚無の力で干渉を払拭し、自身の状態異常をすべて解除する。',
        clearsOwnStatus: true,
      }),
      priority: 3, useChance: 0.20, healthThreshold: 0,
    },
    // Phase 2 (HP45%以下で解放)
    {
      skill: enemySkill({
        id: 'f3e_abyss_opening', name: '深淵の開口',
        description: '深淵の門が開き、全体を呑み込む闇の奔流が走る。',
        element: 'Dark', damageType: 'Magical', basePower: 1.8, hitsAllEnemies: true,
      }),
      priority: 2, useChance: 0.45, healthThreshold: 45,
    },
    {
      // 虚無解放: 全体固定280真ダメージ (3.73 × MagATK75 ≒ 280)
      skill: enemySkill({
        id: 'f3e_void_release', name: '虚無解放',
        description: '蓄積した虚無のエネルギーが解放され、全体に280の固定ダメージを与える。',
        element: 'Dark', damageType: 'True', basePower: 3.73, hitsAllEnemies: true,
      }),
      priority: 3, useChance: 0.35, healthThreshold: 45,
    },
    {
      skill: enemySkill({
        id: 'f3e_despair_mist', name: '絶望の霧',
        description: '深淵の絶望が霧となって全体を包む。25%の確率で全員に睡眠を付与する。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.25,
        appliedStatus: { type: 'Sleep', duration: 2, value: 0 },
      }),
      priority: 1, useChance: 0.20, healthThreshold: 45,
    },
  ],
  actionsPerTurn: 1,
  expReward: 270, jpReward: 70, goldReward: 100,
  tint: 0x2a1a44,
};
