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
//  ラヴィニア (魔法使い) — LaviniaDesign.cs 全12スキル + パッシブ2種
// ══════════════════════════════════════════════════════════════════════

export const LAVINIA_SKILLS = {
  fireBolt: atk({
    id: 'SKL_L_FireBolt', name: '火炎弾',
    description: '標準的な炎の弾を放つ。130%の炎属性魔法ダメージ。15%で炎上。',
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
  manaAcceleration: atk({
    id: 'SKL_L_ManaAccel', name: '魔力加速',
    description: '自分の速度+40%、魔法会心率+20%（3ターン）。詠唱の流れを加速する。',
    basePower: 0, damageType: 'Magical', mpCost: 12,
    buff: [
      { type: 'SpdUp', value: 0.40, duration: 3, toSelf: true },
      { type: 'CritUp', value: 20, duration: 3, toSelf: true },
    ],
  }),
  curseOfSilence: atk({
    id: 'SKL_L_CurseOfSilence', name: '沈黙の呪詛',
    description: '1体の敵に沈黙を付与する（3ターン）。85%の高確率で命中しスキルを封じる。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 14,
    statusChance: 0.85,
    appliedStatus: { type: 'Silence', duration: 3, value: 0 },
  }),
  blizzard: atk({
    id: 'SKL_L_Blizzard', name: '氷嵐',
    description: '吹雪で全敵を包む。全体に100%の氷属性ダメージ、15%で凍結。',
    element: 'Ice', damageType: 'Magical', basePower: 1.00, mpCost: 18,
    hitsAllEnemies: true,
    statusChance: 0.15,
    appliedStatus: { type: 'Freeze', duration: 2, value: 0 },
  }),
  chainLightning: atk({
    id: 'SKL_L_ChainLightning', name: '連鎖雷撃',
    description: '雷を走らせ敵から敵へ連鎖する。2体を180%で貫通。25%で麻痺。',
    element: 'Lightning', damageType: 'Magical', basePower: 1.80, mpCost: 16,
    canBreak: true, chainCount: 2,
    statusChance: 0.25,
    appliedStatus: { type: 'Paralysis', duration: 2, value: 0 },
  }),
  galeBlade: atk({
    id: 'SKL_L_GaleBlade', name: '風刃嵐',
    description: '風の刃で全敵を切り刻む。全体に90%×2ヒット、命中率が高い。',
    element: 'Wind', damageType: 'Magical', basePower: 0.90, hitCount: 2,
    mpCost: 20, hitsAllEnemies: true, canBreak: true,
  }),
  inferno: atk({
    id: 'SKL_L_Inferno', name: '業火',
    description: 'すべての魔力を凝縮した炎の柱。300%の炎属性ダメージ。60%で炎上。',
    element: 'Fire', damageType: 'Magical', basePower: 3.00, mpCost: 32,
    canBreak: true,
    statusChance: 0.60,
    appliedStatus: { type: 'Burn', duration: 2, value: 0.06 },
  }),
  darkWave: atk({
    id: 'SKL_L_DarkWave', name: '暗黒波',
    description: '絶対に外れない闇の波動。200%の闇属性ダメージ。必中。',
    element: 'Dark', damageType: 'Magical', basePower: 2.00, mpCost: 22,
    canBreak: true, neverMiss: true,
  }),
  holyBlaze: atk({
    id: 'SKL_L_HolyBlaze', name: '聖光閃',
    description: '清浄な光で単体を焼く。160%の光属性ダメージ。アンデッド系に1.5倍。',
    element: 'Light', damageType: 'Magical', basePower: 1.60, mpCost: 20,
    canBreak: true, undeadMult: 1.50,
  }),
  arcaneBurst: atk({
    id: 'SKL_L_ArcaneBurst', name: '魔力爆発',
    description: '純粋な魔力の爆発。防御10%無視の280%真実ダメージ。残MPが多いほど威力上昇（0.7〜1.3倍）。',
    damageType: 'True', basePower: 2.80, mpCost: 30,
    ignoreDefPct: 0.10, mpScaling: { min: 0.70, max: 1.30 },
  }),
  elementalConverge: atk({
    id: 'SKL_L_Converge', name: '元素収束',
    description: '直前に放った属性と反応する魔法を収束させる。220%。属性反応（炎→氷/氷→雷/雷→炎）で威力1.5倍+50%。',
    damageType: 'Magical', basePower: 2.20, mpCost: 26, isConverge: true,
  }),
  // パッシブ
  passiveOverloadedCasting: atk({
    id: 'SKL_L_Passive_Overloaded', name: '過負荷詠唱',
    description: '【パッシブ】MP60%以上: 全魔法コスト-2・速度+10%。MP40%以下: 魔法攻撃力+25%。',
    basePower: 0, isPassive: true,
  }),
  passiveArcaneMastery: atk({
    id: 'SKL_L_Passive_ArcaneMastery', name: '魔法の極意',
    description: '【パッシブ】魔法会心倍率+100%（1.5→2.5倍）。魔法攻撃力/5が会心率に加算される。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  アッシュ (狩人) — AshDesign.cs 全スキル + パッシブ2種 + フィールド3種
// ══════════════════════════════════════════════════════════════════════

export const ASH_SKILLS = {
  shadowArrow: atk({
    id: 'SKL_A_ShadowArrow', name: '影矢',
    description: '影を纏った一矢（130%）。Shadow State中は威力が大幅に上昇する（+40%）。',
    element: 'Dark', basePower: 1.30, mpCost: 4, shadowPowerBonus: 0.40,
  }),
  poisonArrow: atk({
    id: 'SKL_A_PoisonArrow', name: '毒矢',
    description: '毒を塗った矢（70%）。80%の確率で毒を付与する（3ターン）。',
    basePower: 0.70, mpCost: 6,
    statusChance: 0.80,
    appliedStatus: { type: 'Poison', duration: 3, value: 0.05 },
  }),
  afterimage: atk({
    id: 'SKL_A_Afterimage', name: '残影',
    description: '2ターン間、単体攻撃を75%の確率で回避する。回避時に50%の反撃。',
    basePower: 0, mpCost: 8,
    buff: [{ type: 'Afterimage', value: 0.75, duration: 2, toSelf: true }],
  }),
  eagleEye: atk({
    id: 'SKL_A_EagleEye', name: '鷹の目',
    description: '2ターン間、命中を必中にし、会心率を35%上昇させる。',
    basePower: 0, mpCost: 8,
    buff: [{ type: 'CritUp', value: 35, duration: 2, toSelf: true }],
  }),
  doubleShot: atk({
    id: 'SKL_A_DoubleShot', name: '二連射',
    description: '素早い2連続攻撃（各85%）。Shadow State中は3連射。各ヒット独立で会心判定。',
    basePower: 0.85, hitCount: 2, mpCost: 12, shadowExtraHits: 1,
  }),
  setTrap: atk({
    id: 'SKL_A_SetTrap', name: '罠設置',
    description: '次に行動した敵に230%の爆発ダメージ＋50%スタン。設置後にShadow Stateを得る。',
    basePower: 0, mpCost: 10, grantsShadowState: true,
    trap: { power: 2.30, stunChance: 0.50 },
  }),
  smokeScreen: atk({
    id: 'SKL_A_SmokeScreen', name: 'スモーク',
    description: '煙幕で全敵の命中-25%・速度-15%（2ターン）。使用者にShadow Stateを付与。',
    basePower: 0, mpCost: 14, hitsAllEnemies: true, grantsShadowState: true,
    debuff: [
      { type: 'AccDown', value: 0.25, duration: 2 },
      { type: 'SpdDown', value: 0.15, duration: 2 },
    ],
  }),
  deathmarkShot: atk({
    id: 'SKL_A_DeathmarkShot', name: '必殺狙撃',
    description: '急所を狙った必殺の一矢（300%）。HP35%以下の敵に30%で即死。Shadow State中は350%。',
    basePower: 3.00, mpCost: 20,
    executeChance: 0.30, executeThreshold: 0.35, shadowPowerBonus: 0.50,
  }),
  arrowRain: atk({
    id: 'SKL_A_ArrowRain', name: '矢の雨',
    description: '敵全体に3ヒットの矢を降らせる（各65%）。ブレイクゲージを削りやすい。',
    basePower: 0.65, hitCount: 3, mpCost: 22, hitsAllEnemies: true, canBreak: true,
  }),
  shadowArrowPlus: atk({
    id: 'SKL_A_ShadowArrowPlus', name: '影矢＋',
    description: '暗影を凝縮した一矢（175%）。Shadow State中は威力+55%、会心も確定する。',
    element: 'Dark', basePower: 1.75, mpCost: 4, shadowPowerBonus: 0.55,
  }),
  shadowStitch: atk({
    id: 'SKL_A_ShadowStitch', name: '影縫い',
    description: '影で縫い付け（100%）、次ターン必ず行動不能にする（必中）。',
    basePower: 1.00, mpCost: 16, neverMiss: true,
    debuff: [{ type: 'ActionSeal', value: 0, duration: 1 }],
  }),
  danceOfDeath: atk({
    id: 'SKL_A_DanceOfDeath', name: '死の踊り',
    description: 'ランダムに敵を5連打（110%×5）。会心時にそのヒットが追加1ヒットを生む（最大10ヒット）。',
    basePower: 1.10, hitCount: 5, mpCost: 28,
    randomTargets: true, critExtraHit: true,
  }),
  // フィールドスキル
  lockpicking: atk({
    id: 'SKL_A_Lockpicking', name: '鍵師の手',
    description: '【フィールド】宝箱ノードで追加の秘密宝箱を1つ発見する。',
    basePower: 0, isPassive: true, isFieldSkill: true,
  }),
  trapMastery: atk({
    id: 'SKL_A_TrapMastery', name: '罠師の知識',
    description: '【フィールド】呪われた部屋のトラップダメージを50%軽減する。',
    basePower: 0, isPassive: true, isFieldSkill: true,
  }),
  darkVision: atk({
    id: 'SKL_A_DarkVision', name: '暗視術',
    description: '【バトル】盲目状態を無効化する。【フィールド】暗闇でも視界を確保できる。',
    basePower: 0, isPassive: true, isFieldSkill: true,
  }),
  // パッシブ
  passiveFluidEvasion: atk({
    id: 'SKL_A_Passive_FluidEvasion', name: '流麗回避',
    description: '【パッシブ】基本回避率を15%上昇させる。攻撃を回避するたびにBPを1獲得する。',
    basePower: 0, isPassive: true,
  }),
  passiveCritEnhancement: atk({
    id: 'SKL_A_Passive_CritEnhance', name: '会心強化',
    description: '【パッシブ】会心ダメージ倍率が×2.5になる。会心ヒット時、次の攻撃の会心率+10%（最大3スタック）。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  リリア (僧侶) — LiliaDesign.cs 全スキル + パッシブ2種
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
    basePower: 0, mpCost: 8, cleanse: 'target',
  }),
  holyBolt: atk({
    id: 'SKL_L2_HolyBolt', name: '聖光弾',
    description: '聖なる光弾を放つ（120%）。アンデッド系に×2.0の追加ダメージ。',
    element: 'Light', damageType: 'Magical', basePower: 1.20, mpCost: 10,
    undeadMult: 2.00,
  }),
  guardianPrayer: atk({
    id: 'SKL_L2_GuardianPrayer', name: '守護の祈り',
    description: '一人の味方を守護する。物理防御+30%、魔法防御+30%（3ターン）。',
    basePower: 0, mpCost: 10,
    buff: [{ type: 'DefUp', value: 0.30, duration: 3, toSelf: true }],
  }),
  holyCure: atk({
    id: 'SKL_L2_HolyCure', name: '聖癒',
    description: '強力な回復魔法（回復力200）。HP大幅回復。',
    basePower: 0, mpCost: 16, isHeal: true, healPower: 200,
  }),
  revive: atk({
    id: 'SKL_L2_Revive', name: '蘇生',
    description: '戦闘不能の味方一人をHP50%で蘇生させる。',
    basePower: 0, mpCost: 20, revive: { pct: 0.50, all: false },
  }),
  regenLight: atk({
    id: 'SKL_L2_RegenLight', name: '再生の光',
    description: '味方全員にリジェネを付与する（5ターン間、毎ターンMagATK×0.35回復）。',
    basePower: 0, mpCost: 14,
    regenFlat: { duration: 5, matkMult: 0.35, toAllAllies: true },
  }),
  curePlus: atk({
    id: 'SKL_L2_CurePlus', name: '治癒＋',
    description: 'より強力な回復（回復力130）。同時に小さな状態異常を1つ解除する。',
    basePower: 0, mpCost: 8, isHeal: true, healPower: 130, cleanse: 'target',
  }),
  holyBoltPlus: atk({
    id: 'SKL_L2_HolyBoltPlus', name: '聖光弾＋',
    description: '強力な光弾（200%）。アンデッド系に×2.5の追加ダメージ。',
    element: 'Light', damageType: 'Magical', basePower: 2.00, mpCost: 12,
    undeadMult: 2.50,
  }),
  curaga: atk({
    id: 'SKL_L2_Curaga', name: '全体治癒',
    description: '味方全員のHPを回復する（回復力110）。',
    basePower: 0, mpCost: 22, isHeal: true, healPower: 110, hitsAllAllies: true,
  }),
  divinePunishment: atk({
    id: 'SKL_L2_DivinePunishment', name: '神罰',
    description: '聖なる裁きが敵全体を3回打つ（100%×3）。アンデッド系に×2.5の特効。ブレイクゲージを削る。',
    element: 'Light', damageType: 'Magical', basePower: 1.00, hitCount: 3,
    mpCost: 26, hitsAllEnemies: true, canBreak: true, undeadMult: 2.50,
  }),
  sanctuary: atk({
    id: 'SKL_L2_Sanctuary', name: '聖域',
    description: '味方全員の状態異常を回復し、リジェネ（5ターン）＋魔法防御+30%（3ターン）を付与する。',
    basePower: 0, mpCost: 30, hitsAllAllies: true, cleanse: 'allAllies',
    regenFlat: { duration: 5, matkMult: 0.35, toAllAllies: true },
    buff: [{ type: 'DefUp', value: 0.30, duration: 3, toAllAllies: true }],
  }),
  guardianPrayerPlus: atk({
    id: 'SKL_L2_GuardianPrayerPlus', name: '守護の祈り＋',
    description: 'より強固な守護。物理防御+40%、魔法防御+40%、速度+10%（4ターン）。',
    basePower: 0, mpCost: 12,
    buff: [
      { type: 'DefUp', value: 0.40, duration: 4, toSelf: true },
      { type: 'SpdUp', value: 0.10, duration: 4, toSelf: true },
    ],
  }),
  fullRevive: atk({
    id: 'SKL_L2_FullRevive', name: '完全蘇生',
    description: '戦闘不能の味方全員をHP100%で蘇生させる。大いなる奇跡。',
    basePower: 0, mpCost: 38, revive: { pct: 1.00, all: true },
  }),
  revivePlus: atk({
    id: 'SKL_L2_RevivePlus', name: '蘇生＋',
    description: '戦闘不能の味方一人をHP80%で蘇生させる。リジェネも付与する。',
    basePower: 0, mpCost: 22, revive: { pct: 0.80, all: false },
    regenFlat: { duration: 3, matkMult: 0.35, toAllAllies: false },
  }),
  holyCurePlus: atk({
    id: 'SKL_L2_HolyCurePlus', name: '聖癒＋',
    description: '極めて強力な回復（回復力280）。状態異常も全回復する。',
    basePower: 0, mpCost: 18, isHeal: true, healPower: 280, cleanse: 'target',
  }),
  miracleBlessing: atk({
    id: 'SKL_L2_MiracleBlessing', name: '奇跡の祝福',
    description: '全員のHPを完全回復し、すべての状態異常を除去。魔法防御+50%（2ターン）＋次の被ダメ1回を50%軽減するバリアを付与。',
    basePower: 0, mpCost: 44, hitsAllAllies: true,
    fullHeal: true, cleanse: 'allAllies', barrier: true,
    buff: [{ type: 'DefUp', value: 0.50, duration: 2, toAllAllies: true }],
  }),
  // パッシブ
  passiveHealingMastery: atk({
    id: 'SKL_L2_Passive_HealingMastery', name: '癒しの心得',
    description: '【パッシブ】すべての回復魔法の効果量が25%上昇する。',
    basePower: 0, isPassive: true,
  }),
  passiveAutoCompassion: atk({
    id: 'SKL_L2_Passive_AutoCompassion', name: '自動慈愛',
    description: '【パッシブ】毎ターン終了時、最もHP残量の少ない味方にMagATK×0.30の回復を自動で行う。',
    basePower: 0, isPassive: true,
  }),
};

// ══════════════════════════════════════════════════════════════════════
//  ゼノ (呪術師) — ZenoDesign.cs 全スキル + パッシブ2種
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
  terror: atk({
    id: 'SKL_Z_Terror', name: '恐怖の叫び',
    description: '単体を恐怖状態にする（2ターン。物理攻撃不可）。物理攻撃力-30%。80%で命中。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 10,
    statusChance: 0.80,
    appliedStatus: { type: 'Fear', duration: 2, value: 0 },
    debuff: [{ type: 'AtkDown', value: 0.30, duration: 2 }],
  }),
  evilEye: atk({
    id: 'SKL_Z_EvilEye', name: '呪いの眼差し',
    description: '単体の全ステータス（攻撃・防御・速度）を-20%する（3ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 14,
    debuff: [
      { type: 'AtkDown', value: 0.20, duration: 3 },
      { type: 'MatkDown', value: 0.20, duration: 3 },
      { type: 'DefDown', value: 0.20, duration: 3 },
      { type: 'SpdDown', value: 0.20, duration: 3 },
    ],
  }),
  absorb: atk({
    id: 'SKL_Z_Absorb', name: '吸収',
    description: '敵1体を確率で吸収しその技をグリモワールに記録する（基本25%、敵HPが低いほど+最大50%）。術者HP-15%。ボスには無効。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    absorb: { baseChance: 0.25, maxBonus: 0.50, hpCostPct: 0.15, eliteMult: 0 },
  }),
  soulShackle: atk({
    id: 'SKL_Z_SoulShackle', name: '魂縛',
    description: '単体を必中で次ターン行動不能にする（1ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 14, neverMiss: true,
    debuff: [{ type: 'ActionSeal', value: 0, duration: 1 }],
  }),
  curseFog: atk({
    id: 'SKL_Z_CurseFog', name: '呪詛の霧',
    description: '全敵にランダムなデバフ1種（-25%）と、ランダムな状態異常を40%で付与する（2ターン）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    hitsAllEnemies: true,
    randomDebuff: { count: 1, amount: 0.25, statusChance: 0.40, duration: 2 },
  }),
  bindCursePlus: atk({
    id: 'SKL_Z_BindCursePlus', name: '呪縛＋',
    description: '速度-50%（3ターン）＋物理攻撃力も-20%。',
    element: 'Dark', damageType: 'Magical', basePower: 0.5, mpCost: 8,
    debuff: [
      { type: 'SpdDown', value: 0.50, duration: 3 },
      { type: 'AtkDown', value: 0.20, duration: 3 },
    ],
  }),
  absorbPlus: atk({
    id: 'SKL_Z_AbsorbPlus', name: '吸収＋',
    description: 'HP消費-10%に軽減。吸収確率+10%ボーナス。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 16,
    absorb: { baseChance: 0.35, maxBonus: 0.50, hpCostPct: 0.10, eliteMult: 0 },
  }),
  causalChain: atk({
    id: 'SKL_Z_CausalChain', name: '因果の鎖',
    description: '2体の敵を鎖で繋ぐ（2ターン）。一体がダメージを受けるとその50%がもう一体にも伝わる。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 18,
    causalChain: { pct: 0.50, duration: 2, all: false },
  }),
  soulFeast: atk({
    id: 'SKL_Z_SoulFeast', name: '魂喰い',
    description: '吸収の強化版（基本45%）。HP消費20%。エリートにも使用可能（確率×40%）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    absorb: { baseChance: 0.45, maxBonus: 0.50, hpCostPct: 0.20, eliteMult: 0.40 },
  }),
  deathSentence: atk({
    id: 'SKL_Z_DeathSentence', name: '死の宣告',
    description: '単体に死の刻印を刻む。3ターン後に必ず即死（ボスにはMaxHPの50%ダメージ）。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    deathSentence: { delay: 3, bossDmgPct: 0.50 },
  }),
  evilEyePlus: atk({
    id: 'SKL_Z_EvilEyePlus', name: '呪いの眼差し＋',
    description: '全ステータス-25%（4ターン）。',
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
    description: '全敵を連結（3ターン）。一体へのダメージが全体に30%伝播する。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    causalChain: { pct: 0.30, duration: 3, all: true },
  }),
  chaosCurse: atk({
    id: 'SKL_Z_ChaosCurse', name: '混沌の呪い',
    description: '全敵の全ステータスを-20%し、毒・出血のいずれかを75%で付与する（3ターン）。',
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
    description: '発動まで2ターン。ボスへのダメージがMaxHPの70%に増加。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 20,
    deathSentence: { delay: 2, bossDmgPct: 0.70 },
  }),
  gateOfUnderworld: atk({
    id: 'SKL_Z_GateOfUnderworld', name: '冥界の扉',
    description: '通常敵を100%確率で吸収し消滅させる。エリートには60%。全デバフの持続を+1ターン延長する。',
    element: 'Dark', damageType: 'Magical', basePower: 0, mpCost: 34,
    absorb: { baseChance: 0.60, maxBonus: 0, hpCostPct: 0, eliteMult: 1, instantNormal: true },
    extendDebuffs: 1,
  }),
  // パッシブ
  passiveCurseMastery: atk({
    id: 'SKL_Z_Passive_CurseMastery', name: '呪術の心得',
    description: '【パッシブ】すべての状態異常付与確率が20%上昇し、持続ターンが1増加する。',
    basePower: 0, isPassive: true,
  }),
  passivePriceOfAbsorption: atk({
    id: 'SKL_Z_Passive_PriceOfAbsorption', name: '吸収の代価',
    description: '【パッシブ】吸収スキルのHP消費を50%軽減する。',
    basePower: 0, isPassive: true,
  }),
};
