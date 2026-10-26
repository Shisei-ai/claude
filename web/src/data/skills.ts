// キャラクタースキル定義 (全5キャラ・フルロスター)
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
    description: '素早く2回斬る。',
    basePower: 0.80, hitCount: 2, mpCost: 4,
  }),
  shieldBash: atk({
    id: 'SKL_ShieldBash', name: '盾砕き',
    // Web版の調整: 弱点を問わず削れるので、削る数を2 → 1 に
    description: '弱点を問わずシールドを1削る。30%で麻痺。',
    basePower: 0.60, mpCost: 5, canBreak: true, shieldDamage: 1,
    statusChance: 0.30,
    appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
  }),
  defensiveStance: atk({
    id: 'SKL_DefStance', name: '守りの構え',
    description: '物理防御+40%、速度-20%（2ターン）。',
    basePower: 0, mpCost: 6,
    buff: [
      { type: 'DefUp', value: 0.40, duration: 2, toSelf: true },
      { type: 'SpdDown', value: 0.20, duration: 2, toSelf: true },
    ],
  }),
  warCry: atk({
    id: 'SKL_WarCry', name: '雄叫び',
    description: '味方全員の物理攻撃+25%（3ターン）。',
    basePower: 0, mpCost: 10, hitsAllAllies: true,
    buff: [{ type: 'AtkUp', value: 0.25, duration: 3, toAllAllies: true }],
  }),
  heavyStrike: atk({
    id: 'SKL_HeavyStrike', name: '強撃',
    description: '会心率+20%。',
    basePower: 2.20, mpCost: 12, critBonus: 20,
  }),
  whirlwind: atk({
    id: 'SKL_Whirlwind', name: '旋風斬',
    description: 'シールドを削る。',
    basePower: 0.90, mpCost: 14, hitsAllEnemies: true, canBreak: true,
  }),
  flameBlade: atk({
    id: 'SKL_FlameBlade', name: '炎の刃',
    description: '25%で炎上。',
    element: 'Fire', basePower: 1.50, mpCost: 16,
    statusChance: 0.25,
    appliedStatus: { type: 'Burn', duration: 2, value: 0.06 },
  }),
  rapidBarrage: atk({
    id: 'SKL_RapidBarrage', name: '百烈斬',
    description: '各ヒットがシールドを削る。',
    basePower: 0.55, hitCount: 5, mpCost: 18, canBreak: true,
  }),
  thunderEdge: atk({
    id: 'SKL_ThunderEdge', name: '雷迸り',
    description: '40%で麻痺。',
    element: 'Lightning', damageType: 'Magical',
    basePower: 1.10, mpCost: 20, hitsAllEnemies: true,
    statusChance: 0.40,
    appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
  }),
  sovereignBlade: atk({
    id: 'SKL_SovereignBlade', name: '覇剣',
    description: '防御無視。',
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
    description: '毒・出血のダメージ-30%。',
    basePower: 0, isPassive: true,
  }),
  passiveBattleHardened: atk({
    id: 'SKL_Passive_BattleHardened', name: '歴戦の鎧',
    description: '被弾ごとに物理防御+3%（最大5回）。',
    basePower: 0, isPassive: true,
  }),
  passiveIndomitableWill: atk({
    id: 'SKL_Passive_IndomitableWill', name: '不撓不屈',
    description: '1戦闘に1回、致死ダメージをHP1で耐える。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  ラヴィニア (魔法使い) — LaviniaDesign.cs 全12スキル + パッシブ2種
// ══════════════════════════════════════════════════════════════════════

export const LAVINIA_SKILLS = {
  fireBolt: atk({
    id: 'SKL_L_FireBolt', name: '火炎弾',
    description: '15%で炎上。',
    element: 'Fire', damageType: 'Magical', basePower: 1.30, mpCost: 8,
    canBreak: true,
    statusChance: 0.15,
    appliedStatus: { type: 'Burn', duration: 2, value: 0.06 },
  }),
  iceSpike: atk({
    id: 'SKL_L_IceSpike', name: '氷棘',
    description: '20%で凍結。',
    element: 'Ice', damageType: 'Magical', basePower: 1.40, mpCost: 10,
    statusChance: 0.20,
    appliedStatus: { type: 'Freeze', duration: 2, value: 0 },
  }),
  manaAcceleration: atk({
    id: 'SKL_L_ManaAccel', name: '魔力加速',
    description: '自分の速度+40%、会心率+20%（3ターン）。',
    basePower: 0, damageType: 'Magical', mpCost: 12,
    buff: [
      { type: 'SpdUp', value: 0.40, duration: 3, toSelf: true },
      { type: 'CritUp', value: 20, duration: 3, toSelf: true },
    ],
  }),
  curseOfSilence: atk({
    id: 'SKL_L_CurseOfSilence', name: '沈黙の呪詛',
    description: '85%で沈黙（3ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 14,
    statusChance: 0.85,
    appliedStatus: { type: 'Silence', duration: 3, value: 0 },
  }),
  blizzard: atk({
    id: 'SKL_L_Blizzard', name: '氷嵐',
    description: '15%で凍結。',
    element: 'Ice', damageType: 'Magical', basePower: 1.00, mpCost: 18,
    hitsAllEnemies: true,
    statusChance: 0.15,
    appliedStatus: { type: 'Freeze', duration: 2, value: 0 },
  }),
  chainLightning: atk({
    id: 'SKL_L_ChainLightning', name: '連鎖雷撃',
    description: '2体を貫く。25%で麻痺。',
    element: 'Lightning', damageType: 'Magical', basePower: 1.80, mpCost: 16,
    canBreak: true, chainCount: 2,
    statusChance: 0.25,
    appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
  }),
  galeBlade: atk({
    id: 'SKL_L_GaleBlade', name: '風刃嵐',
    description: '命中しやすい。',
    element: 'Wind', damageType: 'Magical', basePower: 0.90, hitCount: 2,
    mpCost: 20, hitsAllEnemies: true, canBreak: true,
  }),
  inferno: atk({
    id: 'SKL_L_Inferno', name: '業火',
    description: '60%で炎上。',
    element: 'Fire', damageType: 'Magical', basePower: 3.00, mpCost: 32,
    canBreak: true,
    statusChance: 0.60,
    appliedStatus: { type: 'Burn', duration: 2, value: 0.06 },
  }),
  darkWave: atk({
    id: 'SKL_L_DarkWave', name: '暗黒波',
    description: '必中。',
    element: 'Dark', damageType: 'Magical', basePower: 2.00, mpCost: 22,
    canBreak: true, neverMiss: true,
  }),
  holyBlaze: atk({
    id: 'SKL_L_HolyBlaze', name: '聖光閃',
    description: 'アンデッドに×1.5。',
    element: 'Light', damageType: 'Magical', basePower: 1.60, mpCost: 20,
    canBreak: true, undeadMult: 1.50,
  }),
  arcaneBurst: atk({
    id: 'SKL_L_ArcaneBurst', name: '魔力爆発',
    description: '防御を一部無視。残りMPが多いほど強い。',
    damageType: 'True', basePower: 2.80, mpCost: 30,
    ignoreDefPct: 0.10, mpScaling: { min: 0.70, max: 1.30 },
  }),
  elementalConverge: atk({
    id: 'SKL_L_Converge', name: '元素収束',
    description: '直前の属性と反応すると威力が跳ね上がる。',
    damageType: 'Magical', basePower: 2.20, mpCost: 26, isConverge: true,
  }),
  // パッシブ
  passiveOverloadedCasting: atk({
    id: 'SKL_L_Passive_Overloaded', name: '過負荷詠唱',
    description: 'MP60%以上で消費-2・速度+10%。40%以下で魔攻+25%。',
    basePower: 0, isPassive: true,
  }),
  passiveArcaneMastery: atk({
    id: 'SKL_L_Passive_ArcaneMastery', name: '魔法の極意',
    description: '魔法の会心ダメージ×2.5。魔攻に応じて会心率UP。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  アッシュ (狩人) — AshDesign.cs 全スキル + パッシブ2種 + フィールド3種
// ══════════════════════════════════════════════════════════════════════

export const ASH_SKILLS = {
  shadowArrow: atk({
    id: 'SKL_A_ShadowArrow', name: '影矢',
    description: '影状態なら威力+40%。',
    element: 'Dark', basePower: 1.30, mpCost: 4, shadowPowerBonus: 0.40,
  }),
  poisonArrow: atk({
    id: 'SKL_A_PoisonArrow', name: '毒矢',
    description: '80%で毒。',
    basePower: 0.70, mpCost: 6,
    statusChance: 0.80,
    appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
  }),
  afterimage: atk({
    id: 'SKL_A_Afterimage', name: '残影',
    description: '2ターン、単体攻撃を75%で回避し反撃する。',
    basePower: 0, mpCost: 8,
    buff: [{ type: 'Afterimage', value: 0.75, duration: 2, toSelf: true }],
  }),
  eagleEye: atk({
    id: 'SKL_A_EagleEye', name: '鷹の目',
    description: '2ターン必中、会心率+35%。',
    basePower: 0, mpCost: 8,
    buff: [{ type: 'CritUp', value: 35, duration: 2, toSelf: true }],
  }),
  doubleShot: atk({
    id: 'SKL_A_DoubleShot', name: '二連射',
    description: '影状態なら3連射。',
    basePower: 0.85, hitCount: 2, mpCost: 12, shadowExtraHits: 1,
  }),
  setTrap: atk({
    id: 'SKL_A_SetTrap', name: '罠設置',
    description: '次に動いた敵に爆発(230%)、50%でスタン。影状態になる。',
    basePower: 0, mpCost: 10, grantsShadowState: true,
    trap: { power: 2.30, stunChance: 0.50 },
  }),
  smokeScreen: atk({
    id: 'SKL_A_SmokeScreen', name: 'スモーク',
    description: '全敵の命中・速度を下げ、影状態になる。',
    basePower: 0, mpCost: 14, hitsAllEnemies: true, grantsShadowState: true,
    debuff: [
      { type: 'AccDown', value: 0.25, duration: 2 },
      { type: 'SpdDown', value: 0.15, duration: 2 },
    ],
  }),
  deathmarkShot: atk({
    id: 'SKL_A_DeathmarkShot', name: '必殺狙撃',
    description: 'HP35%以下の敵を30%で即死。影状態なら350%。',
    basePower: 3.00, mpCost: 20,
    executeChance: 0.30, executeThreshold: 0.35, shadowPowerBonus: 0.50,
  }),
  arrowRain: atk({
    id: 'SKL_A_ArrowRain', name: '矢の雨',
    description: 'シールドを削りやすい。',
    basePower: 0.65, hitCount: 3, mpCost: 22, hitsAllEnemies: true, canBreak: true,
  }),
  shadowArrowPlus: atk({
    id: 'SKL_A_ShadowArrowPlus', name: '影矢＋',
    description: '影状態なら威力+55%・会心確定。',
    element: 'Dark', basePower: 1.75, mpCost: 4, shadowPowerBonus: 0.55,
  }),
  shadowStitch: atk({
    id: 'SKL_A_ShadowStitch', name: '影縫い',
    description: '必中。次のターン行動不能。',
    basePower: 1.00, mpCost: 16, neverMiss: true,
    debuff: [{ type: 'ActionSeal', value: 0, duration: 1 }],
  }),
  danceOfDeath: atk({
    id: 'SKL_A_DanceOfDeath', name: '死の踊り',
    description: 'ランダムな敵を5連打。会心で追撃。',
    basePower: 1.10, hitCount: 5, mpCost: 28,
    randomTargets: true, critExtraHit: true,
  }),
  // フィールドスキル
  lockpicking: atk({
    id: 'SKL_A_Lockpicking', name: '鍵師の手',
    description: '【探索】宝箱で隠し宝箱を見つける。',
    basePower: 0, isPassive: true, isFieldSkill: true,
  }),
  trapMastery: atk({
    id: 'SKL_A_TrapMastery', name: '罠師の知識',
    description: '【探索】罠のダメージ半減。',
    basePower: 0, isPassive: true, isFieldSkill: true,
  }),
  darkVision: atk({
    id: 'SKL_A_DarkVision', name: '暗視術',
    description: '盲目にならない。',
    basePower: 0, isPassive: true, isFieldSkill: true,
  }),
  // パッシブ
  passiveFluidEvasion: atk({
    id: 'SKL_A_Passive_FluidEvasion', name: '流麗回避',
    description: '回避率+15%。回避でBP+1。',
    basePower: 0, isPassive: true,
  }),
  passiveCritEnhancement: atk({
    id: 'SKL_A_Passive_CritEnhance', name: '会心強化',
    description: '会心ダメージ×2.5。会心で次の会心率が上がる。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  リリア (僧侶) — LiliaDesign.cs 全スキル + パッシブ2種
// ══════════════════════════════════════════════════════════════════════

export const LILIA_SKILLS = {
  cure: atk({
    id: 'SKL_L2_Cure', name: '治癒',
    description: '味方1人を回復（70）。',
    basePower: 0, mpCost: 6, isHeal: true, healPower: 70,
  }),
  purify: atk({
    id: 'SKL_L2_Purify', name: '清浄',
    description: '味方1人の状態異常を治す。',
    basePower: 0, mpCost: 8, cleanse: 'target',
  }),
  holyBolt: atk({
    id: 'SKL_L2_HolyBolt', name: '聖光弾',
    description: 'アンデッドに×2。',
    element: 'Light', damageType: 'Magical', basePower: 1.20, mpCost: 10,
    undeadMult: 2.00,
  }),
  guardianPrayer: atk({
    id: 'SKL_L2_GuardianPrayer', name: '守護の祈り',
    description: '味方1人の物防・魔防+30%（3ターン）。',
    basePower: 0, mpCost: 10,
    buff: [{ type: 'DefUp', value: 0.30, duration: 3, toSelf: true }],
  }),
  holyCure: atk({
    id: 'SKL_L2_HolyCure', name: '聖癒',
    description: '味方1人を大きく回復（175）。',
    basePower: 0, mpCost: 16, isHeal: true, healPower: 175,
  }),
  revive: atk({
    id: 'SKL_L2_Revive', name: '蘇生',
    description: '倒れた味方1人をHP50%で蘇生。',
    basePower: 0, mpCost: 20, revive: { pct: 0.50, all: false },
  }),
  regenLight: atk({
    id: 'SKL_L2_RegenLight', name: '再生の光',
    description: '味方全員にリジェネ（5ターン）。',
    basePower: 0, mpCost: 14,
    regenFlat: { duration: 5, matkMult: 0.30, toAllAllies: true },
  }),
  curePlus: atk({
    id: 'SKL_L2_CurePlus', name: '治癒＋',
    description: '味方1人を回復（115）し、状態異常を1つ治す。',
    basePower: 0, mpCost: 8, isHeal: true, healPower: 115, cleanse: 'target',
  }),
  holyBoltPlus: atk({
    id: 'SKL_L2_HolyBoltPlus', name: '聖光弾＋',
    description: 'アンデッドに×2.5。',
    element: 'Light', damageType: 'Magical', basePower: 2.00, mpCost: 12,
    undeadMult: 2.50,
  }),
  curaga: atk({
    id: 'SKL_L2_Curaga', name: '全体治癒',
    description: '味方全員を回復（95）。',
    basePower: 0, mpCost: 22, isHeal: true, healPower: 95, hitsAllAllies: true,
  }),
  divinePunishment: atk({
    id: 'SKL_L2_DivinePunishment', name: '神罰',
    description: 'アンデッドに×2.5。シールドを削る。',
    element: 'Light', damageType: 'Magical', basePower: 1.00, hitCount: 3,
    mpCost: 26, hitsAllEnemies: true, canBreak: true, undeadMult: 2.50,
  }),
  sanctuary: atk({
    id: 'SKL_L2_Sanctuary', name: '聖域',
    description: '味方全員の状態異常を治し、リジェネと魔防+30%。',
    basePower: 0, mpCost: 30, hitsAllAllies: true, cleanse: 'allAllies',
    regenFlat: { duration: 5, matkMult: 0.30, toAllAllies: true },
    buff: [{ type: 'DefUp', value: 0.30, duration: 3, toAllAllies: true }],
  }),
  guardianPrayerPlus: atk({
    id: 'SKL_L2_GuardianPrayerPlus', name: '守護の祈り＋',
    description: '味方1人の物防・魔防+40%、速度+10%（4ターン）。',
    basePower: 0, mpCost: 12,
    buff: [
      { type: 'DefUp', value: 0.40, duration: 4, toSelf: true },
      { type: 'SpdUp', value: 0.10, duration: 4, toSelf: true },
    ],
  }),
  fullRevive: atk({
    id: 'SKL_L2_FullRevive', name: '完全蘇生',
    description: '倒れた味方全員をHP100%で蘇生。',
    basePower: 0, mpCost: 38, revive: { pct: 1.00, all: true },
  }),
  revivePlus: atk({
    id: 'SKL_L2_RevivePlus', name: '蘇生＋',
    description: '倒れた味方1人をHP80%で蘇生し、リジェネ。',
    basePower: 0, mpCost: 22, revive: { pct: 0.80, all: false },
    regenFlat: { duration: 3, matkMult: 0.30, toAllAllies: false },
  }),
  holyCurePlus: atk({
    id: 'SKL_L2_HolyCurePlus', name: '聖癒＋',
    description: '味方1人を大きく回復（250）し、状態異常も治す。',
    basePower: 0, mpCost: 18, isHeal: true, healPower: 250, cleanse: 'target',
  }),
  miracleBlessing: atk({
    id: 'SKL_L2_MiracleBlessing', name: '奇跡の祝福',
    description: '全員を全快・状態異常を治し、魔防UPと被ダメ半減の加護。',
    basePower: 0, mpCost: 44, hitsAllAllies: true,
    fullHeal: true, cleanse: 'allAllies', barrier: true,
    buff: [{ type: 'DefUp', value: 0.50, duration: 2, toAllAllies: true }],
  }),
  // パッシブ
  passiveHealingMastery: atk({
    id: 'SKL_L2_Passive_HealingMastery', name: '癒しの心得',
    description: '回復量+25%。',
    basePower: 0, isPassive: true,
  }),
  passiveAutoCompassion: atk({
    id: 'SKL_L2_Passive_AutoCompassion', name: '自動慈愛',
    description: '毎ターン、最もHPの低い味方を少し回復。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  ゼノ (呪術師) — ZenoDesign.cs 全スキル + パッシブ2種
// ══════════════════════════════════════════════════════════════════════

export const ZENO_SKILLS = {
  // Web版で追加: デバフを重ねて爆ぜさせる攻撃手段 (Unity版のゼノは攻撃技を持たない)
  curseBurst: atk({
    id: 'SKL_Z_CurseBurst', name: '呪詛解放',
    description: '敵の状態異常1種ごとに威力+40%。',
    element: 'Dark', damageType: 'Magical', basePower: 0.8, mpCost: 10,
    powerPerStatus: 0.4,
  }),
  bindCurse: atk({
    id: 'SKL_Z_BindCurse', name: '呪縛',
    description: '速度-40%（2ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0.5, mpCost: 6,
    debuff: [{ type: 'SpdDown', value: 0.40, duration: 2 }],
  }),
  poisonMist: atk({
    id: 'SKL_Z_PoisonMist', name: '毒霧',
    description: '全敵に80%で毒。',
    element: 'None', damageType: 'Magical', basePower: 0, mpCost: 10,
    hitsAllEnemies: true,
    statusChance: 0.80,
    appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
  }),
  terror: atk({
    id: 'SKL_Z_Terror', name: '恐怖の叫び',
    description: '80%で恐怖（物理攻撃不可）、物攻-30%。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 10,
    statusChance: 0.80,
    appliedStatus: { type: 'Fear', duration: 2, value: 0 },
    debuff: [{ type: 'AtkDown', value: 0.30, duration: 2 }],
  }),
  evilEye: atk({
    id: 'SKL_Z_EvilEye', name: '呪いの眼差し',
    description: '攻撃・防御・速度-20%（3ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 14,
    debuff: [
      { type: 'AtkDown', value: 0.20, duration: 3 },
      { type: 'MatkDown', value: 0.20, duration: 3 },
      { type: 'DefDown', value: 0.20, duration: 3 },
      { type: 'SpdDown', value: 0.20, duration: 3 },
    ],
  }),
  // Web版で追加: 与えたダメージの半分を自分のHPにする闇魔法。HPを削って戦うゼノの命綱
  drain: atk({
    id: 'SKL_Z_Drain', name: '吸収',
    description: '与えたダメージの半分を回復。',
    element: 'Dark', damageType: 'Magical', basePower: 1.0, mpCost: 8,
    drainPct: 0.5,
  }),
  // 旧「吸収」。敵の技を奪う方は「簒奪」と呼ぶ (IDは古いセーブのため旧名のまま)
  absorb: atk({
    id: 'SKL_Z_Absorb', name: '簒奪',
    description: '敵の魂を奪い技を刻む。弱らせ・呪うほど成功しやすい。HP-15%。ボス不可。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    absorb: { baseChance: 0.25, maxBonus: 0.50, hpCostPct: 0.15, eliteMult: 0.70, perStatus: 0.05 },
  }),
  soulShackle: atk({
    id: 'SKL_Z_SoulShackle', name: '魂縛',
    description: '必中。次のターン行動不能。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 14, neverMiss: true,
    debuff: [{ type: 'ActionSeal', value: 0, duration: 1 }],
  }),
  curseFog: atk({
    id: 'SKL_Z_CurseFog', name: '呪詛の霧',
    description: '全敵にランダムな弱体と状態異常。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    hitsAllEnemies: true,
    randomDebuff: { count: 1, amount: 0.25, statusChance: 0.40, duration: 2 },
  }),
  bindCursePlus: atk({
    id: 'SKL_Z_BindCursePlus', name: '呪縛＋',
    description: '速度-50%・物攻-20%（3ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0.5, mpCost: 8,
    debuff: [
      { type: 'SpdDown', value: 0.50, duration: 3 },
      { type: 'AtkDown', value: 0.20, duration: 3 },
    ],
  }),
  absorbPlus: atk({
    id: 'SKL_Z_AbsorbPlus', name: '簒奪＋',
    description: '簒奪の強化版。成功しやすくHP-10%。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    absorb: { baseChance: 0.35, maxBonus: 0.50, hpCostPct: 0.10, eliteMult: 0.85, perStatus: 0.05 },
  }),
  drainPlus: atk({
    id: 'SKL_Z_DrainPlus', name: '吸収＋',
    description: '与えたダメージの半分を回復。',
    element: 'Dark', damageType: 'Magical', basePower: 1.5, mpCost: 14,
    drainPct: 0.5,
  }),
  causalChain: atk({
    id: 'SKL_Z_CausalChain', name: '因果の鎖',
    description: '2体を鎖で繋ぎ、ダメージの50%を伝える。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 18,
    causalChain: { pct: 0.50, duration: 2, all: false },
  }),
  soulFeast: atk({
    id: 'SKL_Z_SoulFeast', name: '魂喰い',
    description: '簒奪の最上位。強敵にもよく通じる。HP-20%。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    absorb: { baseChance: 0.45, maxBonus: 0.50, hpCostPct: 0.20, eliteMult: 1, perStatus: 0.05 },
  }),
  deathSentence: atk({
    id: 'SKL_Z_DeathSentence', name: '死の宣告',
    description: '3ターン後に即死（ボスは最大HPの50%）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    deathSentence: { delay: 3, bossDmgPct: 0.50 },
  }),
  evilEyePlus: atk({
    id: 'SKL_Z_EvilEyePlus', name: '呪いの眼差し＋',
    description: '攻撃・防御・速度-25%（4ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    debuff: [
      { type: 'AtkDown', value: 0.25, duration: 4 },
      { type: 'MatkDown', value: 0.25, duration: 4 },
      { type: 'DefDown', value: 0.25, duration: 4 },
      { type: 'SpdDown', value: 0.25, duration: 4 },
    ],
  }),
  causalChainPlus: atk({
    id: 'SKL_Z_CausalChainPlus', name: '因果の鎖＋',
    description: '全敵を繋ぎ、ダメージの30%を伝える。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    causalChain: { pct: 0.30, duration: 3, all: true },
  }),
  chaosCurse: atk({
    id: 'SKL_Z_ChaosCurse', name: '混沌の呪い',
    description: '全敵の能力-20%、75%で毒か出血。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 28,
    hitsAllEnemies: true,
    debuff: [
      { type: 'AtkDown', value: 0.20, duration: 3 },
      { type: 'MatkDown', value: 0.20, duration: 3 },
      { type: 'DefDown', value: 0.20, duration: 3 },
      { type: 'SpdDown', value: 0.20, duration: 3 },
    ],
    randomDebuff: { count: 0, amount: 0, statusChance: 0.75, duration: 3 },
  }),
  deathSentencePlus: atk({
    id: 'SKL_Z_DeathSentencePlus', name: '死の宣告＋',
    description: '2ターン後に即死（ボスは最大HPの70%）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    deathSentence: { delay: 2, bossDmgPct: 0.70 },
  }),
  gateOfUnderworld: atk({
    id: 'SKL_Z_GateOfUnderworld', name: '冥界の扉',
    description: '通常敵は必ず簒奪、強敵は60%〜。全弱体を1ターン延長。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 34,
    absorb: { baseChance: 0.60, maxBonus: 0.30, hpCostPct: 0, eliteMult: 1, instantNormal: true },
    extendDebuffs: 1,
  }),
  // パッシブ
  passiveCurseMastery: atk({
    id: 'SKL_Z_Passive_CurseMastery', name: '呪術の心得',
    description: '状態異常の付与率+20%・持続+1。',
    basePower: 0, isPassive: true,
  }),
  passivePriceOfAbsorption: atk({
    id: 'SKL_Z_Passive_PriceOfAbsorption', name: '簒奪の代価',
    description: '簒奪のHP消費半減。成功すると奪った技を即座に放つ。',
    basePower: 0, isPassive: true,
  }),
};
