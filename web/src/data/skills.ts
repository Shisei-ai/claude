// キャラクタースキル定義
// Unity版 CharacterDesigns/*.cs + Editor/*SOGenerator.cs からの移植
import type { SkillDef } from '../core/types';

function atk(p: Partial<SkillDef> & Pick<SkillDef, 'id' | 'name' | 'description'>): SkillDef {
  return {
    element: 'None', damageType: 'Physical', mpCost: 0,
    basePower: 1, hitCount: 1, hitsAllEnemies: false, hitsAllAllies: false,
    canBreak: false, isHeal: false, healPower: 0,
    ...p,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  ベルンハルト (戦士) — BernhardDesign.cs 全12スキル + パッシブ3種
// ══════════════════════════════════════════════════════════════════════

export const BERNHARD_SKILLS = {
  doubleSlash: atk({
    id: 'SKL_DoubleSlash', name: '二段斬り',
    description: '素早く2回斬りかかる。シンプルだが確実な技。',
    basePower: 0.80, hitCount: 2, mpCost: 4,
  }),
  shieldBash: atk({
    id: 'SKL_ShieldBash', name: '盾砕き',
    description: '盾で強打し、敵の防御体制を崩す。シールドを2つ削る。',
    basePower: 0.60, mpCost: 5, canBreak: true, shieldDamage: 2,
    statusChance: 0.30,
    appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
  }),
  defensiveStance: atk({
    id: 'SKL_DefStance', name: '守りの構え',
    description: '防御態勢を取る。物理防御+40%、速度-20%（2ターン）。',
    basePower: 0, mpCost: 6,
    buff: [
      { type: 'DefUp', value: 0.40, duration: 2, toSelf: true },
      { type: 'SpdDown', value: 0.20, duration: 2, toSelf: true },
    ],
  }),
  warCry: atk({
    id: 'SKL_WarCry', name: '雄叫び',
    description: '気合いの一喝で味方全員の物理攻撃力を3ターン+25%。',
    basePower: 0, mpCost: 10, hitsAllAllies: true,
    buff: [{ type: 'AtkUp', value: 0.25, duration: 3, toAllAllies: true }],
  }),
  heavyStrike: atk({
    id: 'SKL_HeavyStrike', name: '強撃',
    description: '力を溜めた一撃。220%の高威力。クリティカル率+20%。',
    basePower: 2.20, mpCost: 12, critBonus: 20,
  }),
  whirlwind: atk({
    id: 'SKL_Whirlwind', name: '旋風斬',
    description: '剣を大きく振り回し、全敵を90%の威力で斬りつける。Break効果あり。',
    basePower: 0.90, mpCost: 14, hitsAllEnemies: true, canBreak: true,
  }),
  flameBlade: atk({
    id: 'SKL_FlameBlade', name: '炎の刃',
    description: '剣に炎を纏わせた一撃。150%の炎属性ダメージ。25%で炎上付与。',
    element: 'Fire', basePower: 1.50, mpCost: 16,
    statusChance: 0.25,
    appliedStatus: { type: 'Burn', duration: 2, value: 0.06 },
  }),
  rapidBarrage: atk({
    id: 'SKL_RapidBarrage', name: '百烈斬',
    description: '休みなく5連撃を叩き込む。各ヒットがBreakに有効。',
    basePower: 0.55, hitCount: 5, mpCost: 18, canBreak: true,
  }),
  thunderEdge: atk({
    id: 'SKL_ThunderEdge', name: '雷迸り',
    description: '雷光を帯びた横薙ぎ。全敵に110%の雷属性魔法ダメージ、40%で麻痺。',
    element: 'Lightning', damageType: 'Magical',
    basePower: 1.10, mpCost: 20, hitsAllEnemies: true,
    statusChance: 0.40,
    appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
  }),
  sovereignBlade: atk({
    id: 'SKL_SovereignBlade', name: '覇剣',
    description: '魂を込めた一太刀。350%の真実ダメージ（防御無視）。',
    damageType: 'True', basePower: 3.50, mpCost: 28,
  }),
  earthBastion: atk({
    id: 'SKL_EarthBastion', name: '大地の盾',
    description: '味方全員の魔法防御+30%、HP10%回復。',
    basePower: 0, mpCost: 22, hitsAllAllies: true,
    isHeal: true, healPower: 0.10,
    buff: [{ type: 'DefUp', value: 0.30, duration: 3, toAllAllies: true }],
  }),
  // パッシブ
  passiveIronConstitution: atk({
    id: 'SKL_Passive_IronConstitution', name: '鋼の肉体',
    description: '【パッシブ】毒・出血によるダメージを30%軽減する。',
    basePower: 0, isPassive: true,
  }),
  passiveBattleHardened: atk({
    id: 'SKL_Passive_BattleHardened', name: '歴戦の鎧',
    description: '【パッシブ】攻撃を受けるたびに物理防御+3%（最大5スタック、戦闘ごとにリセット）。',
    basePower: 0, isPassive: true,
  }),
  passiveIndomitableWill: atk({
    id: 'SKL_Passive_IndomitableWill', name: '不撓不屈',
    description: '【パッシブ】1戦闘に1回だけ、致死ダメージを受けてもHP1で踏みとどまる。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  ラヴィニア (魔法使い) — LaviniaDesign.cs (序盤スキル / 残りは移植中)
// ══════════════════════════════════════════════════════════════════════

export const LAVINIA_SKILLS = {
  fireBolt: atk({
    id: 'SKL_L_FireBolt', name: '火炎弾',
    description: '標準的な炎の弾を放つ。130%の炎属性魔法ダメージ。',
    element: 'Fire', damageType: 'Magical', basePower: 1.30, mpCost: 8,
    canBreak: true,
    statusChance: 0.15,
    appliedStatus: { type: 'Burn', duration: 2, value: 0.06 },
  }),
  iceSpike: atk({
    id: 'SKL_L_IceSpike', name: '氷棘',
    description: '鋭い氷柱を放つ。140%の氷属性ダメージ、20%で凍結。',
    element: 'Ice', damageType: 'Magical', basePower: 1.40, mpCost: 10,
    statusChance: 0.20,
    appliedStatus: { type: 'Freeze', duration: 2, value: 0 },
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  アッシュ (狩人) — AshDesign.cs (序盤スキル / 残りは移植中)
// ══════════════════════════════════════════════════════════════════════

export const ASH_SKILLS = {
  shadowArrow: atk({
    id: 'SKL_A_ShadowArrow', name: '影矢',
    description: '影を纏った一矢。130%の物理ダメージ。',
    element: 'Dark', basePower: 1.30, mpCost: 4,
  }),
  poisonArrow: atk({
    id: 'SKL_A_PoisonArrow', name: '毒矢',
    description: '毒を塗った矢。80%の確率で毒を付与する（3ターン）。',
    basePower: 0.70, mpCost: 6,
    statusChance: 0.80,
    appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  リリア (僧侶) — LiliaDesign.cs (序盤スキル / 残りは移植中)
// ══════════════════════════════════════════════════════════════════════

export const LILIA_SKILLS = {
  cure: atk({
    id: 'SKL_L2_Cure', name: '治癒',
    description: '一人の味方のHPを回復する（回復力80）。',
    basePower: 0, mpCost: 6, isHeal: true, healPower: 80,
  }),
  purify: atk({
    id: 'SKL_L2_Purify', name: '清浄',
    description: '一人の味方のすべての状態異常を取り除く。',
    basePower: 0, mpCost: 8,
  }),
  holyBolt: atk({
    id: 'SKL_L2_HolyBolt', name: '聖光弾',
    description: '聖なる光弾を放つ（120%）。アンデッドに×2.0の追加ダメージ。',
    element: 'Light', damageType: 'Magical', basePower: 1.20, mpCost: 10,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  ゼノ (呪術師) — ZenoDesign.cs (序盤スキル / 残りは移植中)
// ══════════════════════════════════════════════════════════════════════

export const ZENO_SKILLS = {
  bindCurse: atk({
    id: 'SKL_Z_BindCurse', name: '呪縛',
    description: '一体の敵の速度を-40%にする（2ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0.5, mpCost: 6,
    debuff: [{ type: 'SpdDown', value: 0.40, duration: 2 }],
  }),
  poisonMist: atk({
    id: 'SKL_Z_PoisonMist', name: '毒霧',
    description: '全敵に80%の確率で毒を付与する（3ターン）。',
    element: 'Poison', damageType: 'Magical', basePower: 0, mpCost: 10,
    hitsAllEnemies: true,
    statusChance: 0.80,
    appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
  }),
};
