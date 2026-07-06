// 5人のプレイアブルキャラクター
// Unity版 CharacterDesigns/*.cs + Editor/*SOGenerator.cs からの移植
import type { CharacterDef } from '../core/types';
import {
  BERNHARD_SKILLS, LAVINIA_SKILLS, ASH_SKILLS, LILIA_SKILLS, ZENO_SKILLS,
} from './skills';

const B = BERNHARD_SKILLS;

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'bernhard',
    name: 'ベルンハルト',
    jobName: '戦士',
    backstory:
      '元・王国騎士団長。三年前の王国滅亡の夜、自らの判断の誤りが主君の死を招いたと信じている。' +
      '生き延びたことへの罪悪感を胸に、その元凶を打ち倒すために旅に出た。',
    themeColor: 0xb81c1c,   // 緋マント
    baseStats: {
      maxHP: 450, maxMP: 80, physicalAttack: 35, magicAttack: 12,
      physicalDefense: 28, magicDefense: 20, speed: 18, luck: 12,
      criticalRate: 8, accuracyRate: 92,
    },
    growthRates: {
      maxHP: 30, maxMP: 3, physicalAttack: 4, magicAttack: 1,
      physicalDefense: 4, magicDefense: 2, speed: 1, luck: 1,
      criticalRate: 0, accuracyRate: 0,
    },
    learnableSkills: [
      { jobLevel: 1,  skill: B.doubleSlash, jpCost: 0 },
      { jobLevel: 2,  skill: B.shieldBash, jpCost: 50 },
      { jobLevel: 2,  skill: B.passiveIronConstitution, jpCost: 120 },
      { jobLevel: 3,  skill: B.defensiveStance, jpCost: 60 },
      { jobLevel: 4,  skill: B.warCry, jpCost: 100 },
      { jobLevel: 5,  skill: B.heavyStrike, jpCost: 120 },
      { jobLevel: 6,  skill: B.whirlwind, jpCost: 150 },
      { jobLevel: 6,  skill: B.passiveBattleHardened, jpCost: 180 },
      { jobLevel: 7,  skill: B.flameBlade, jpCost: 180 },
      { jobLevel: 8,  skill: B.rapidBarrage, jpCost: 200 },
      { jobLevel: 9,  skill: B.thunderEdge, jpCost: 220 },
      { jobLevel: 10, skill: B.sovereignBlade, jpCost: 350 },
      { jobLevel: 10, skill: B.passiveIndomitableWill, jpCost: 300 },
      { jobLevel: 11, skill: B.earthBastion, jpCost: 280 },
    ],
  },
  {
    id: 'lavinia',
    name: 'ラヴィニア・ヴェルクロア',
    jobName: '魔法使い',
    backstory:
      '名門魔導家系の出身。契約の代償として左眼に氷晶の呪いを宿す。' +
      '禁忌の知識を追い、滅びの元凶へと近づいていく。',
    themeColor: 0x4f7fd9,
    baseStats: {
      maxHP: 280, maxMP: 200, physicalAttack: 8, magicAttack: 55,
      physicalDefense: 8, magicDefense: 18, speed: 22, luck: 15,
      criticalRate: 12, accuracyRate: 98,
    },
    growthRates: {
      maxHP: 14, maxMP: 12, physicalAttack: 1, magicAttack: 6,
      physicalDefense: 1, magicDefense: 2, speed: 1, luck: 1,
      criticalRate: 0, accuracyRate: 0,
    },
    learnableSkills: [
      { jobLevel: 1,  skill: LAVINIA_SKILLS.fireBolt, jpCost: 0 },
      { jobLevel: 2,  skill: LAVINIA_SKILLS.iceSpike, jpCost: 60 },
      { jobLevel: 3,  skill: LAVINIA_SKILLS.manaAcceleration, jpCost: 80 },
      { jobLevel: 4,  skill: LAVINIA_SKILLS.curseOfSilence, jpCost: 100 },
      { jobLevel: 5,  skill: LAVINIA_SKILLS.blizzard, jpCost: 150 },
      { jobLevel: 5,  skill: LAVINIA_SKILLS.passiveOverloadedCasting, jpCost: 160 },
      { jobLevel: 6,  skill: LAVINIA_SKILLS.chainLightning, jpCost: 180 },
      { jobLevel: 7,  skill: LAVINIA_SKILLS.galeBlade, jpCost: 200 },
      { jobLevel: 8,  skill: LAVINIA_SKILLS.inferno, jpCost: 250 },
      { jobLevel: 8,  skill: LAVINIA_SKILLS.passiveArcaneMastery, jpCost: 280 },
      { jobLevel: 9,  skill: LAVINIA_SKILLS.darkWave, jpCost: 240 },
      { jobLevel: 10, skill: LAVINIA_SKILLS.holyBlaze, jpCost: 280 },
      { jobLevel: 11, skill: LAVINIA_SKILLS.arcaneBurst, jpCost: 320 },
      { jobLevel: 12, skill: LAVINIA_SKILLS.elementalConverge, jpCost: 380 },
    ],
  },
  {
    id: 'ash',
    name: 'アッシュ・レイヴン',
    jobName: '狩人',
    backstory:
      '暗黒の森の生き残り。故郷を焼いた「灰の夜」の真実を追う影の射手。' +
      '影に潜み、急所を射抜くことに長ける。',
    themeColor: 0x3d6b4f,
    baseStats: {
      maxHP: 320, maxMP: 65, physicalAttack: 32, magicAttack: 8,
      physicalDefense: 10, magicDefense: 14, speed: 28, luck: 20,
      criticalRate: 18, accuracyRate: 95,
    },
    growthRates: {
      maxHP: 18, maxMP: 2, physicalAttack: 3, magicAttack: 0,
      physicalDefense: 2, magicDefense: 1, speed: 2, luck: 1,
      criticalRate: 0, accuracyRate: 0,
    },
    learnableSkills: [
      { jobLevel: 1,  skill: ASH_SKILLS.shadowArrow, jpCost: 0 },
      { jobLevel: 2,  skill: ASH_SKILLS.poisonArrow, jpCost: 60 },
      { jobLevel: 3,  skill: ASH_SKILLS.lockpicking, jpCost: 70 },
      { jobLevel: 3,  skill: ASH_SKILLS.afterimage, jpCost: 80 },
      { jobLevel: 4,  skill: ASH_SKILLS.eagleEye, jpCost: 100 },
      { jobLevel: 5,  skill: ASH_SKILLS.doubleShot, jpCost: 130 },
      { jobLevel: 5,  skill: ASH_SKILLS.passiveFluidEvasion, jpCost: 150 },
      { jobLevel: 6,  skill: ASH_SKILLS.setTrap, jpCost: 160 },
      { jobLevel: 6,  skill: ASH_SKILLS.trapMastery, jpCost: 140 },
      { jobLevel: 7,  skill: ASH_SKILLS.smokeScreen, jpCost: 180 },
      { jobLevel: 8,  skill: ASH_SKILLS.deathmarkShot, jpCost: 220 },
      { jobLevel: 8,  skill: ASH_SKILLS.passiveCritEnhancement, jpCost: 260 },
      { jobLevel: 9,  skill: ASH_SKILLS.arrowRain, jpCost: 240 },
      { jobLevel: 9,  skill: ASH_SKILLS.darkVision, jpCost: 180 },
      { jobLevel: 10, skill: ASH_SKILLS.shadowArrowPlus, jpCost: 260 },
      { jobLevel: 10, skill: ASH_SKILLS.shadowStitch, jpCost: 240 },
      { jobLevel: 11, skill: ASH_SKILLS.danceOfDeath, jpCost: 340 },
    ],
  },
  {
    id: 'lilia',
    name: 'リリア・アルバ',
    jobName: '僧侶',
    backstory:
      '滅びた聖堂の最後の巫女。死者の声を聞く力を持ち、彷徨う魂を鎮めるために旅をする。' +
      '聖光はアンデッドを浄化する。',
    themeColor: 0xd9c66b,
    baseStats: {
      maxHP: 370, maxMP: 240, physicalAttack: 10, magicAttack: 42,
      physicalDefense: 15, magicDefense: 28, speed: 14, luck: 16,
      criticalRate: 5, accuracyRate: 90,
    },
    growthRates: {
      maxHP: 22, maxMP: 15, physicalAttack: 0, magicAttack: 4,
      physicalDefense: 2, magicDefense: 3, speed: 1, luck: 1,
      criticalRate: 0, accuracyRate: 0,
    },
    learnableSkills: [
      { jobLevel: 1,  skill: LILIA_SKILLS.cure, jpCost: 0 },
      { jobLevel: 1,  skill: LILIA_SKILLS.purify, jpCost: 0 },
      { jobLevel: 2,  skill: LILIA_SKILLS.holyBolt, jpCost: 60 },
      { jobLevel: 3,  skill: LILIA_SKILLS.guardianPrayer, jpCost: 80 },
      { jobLevel: 4,  skill: LILIA_SKILLS.holyCure, jpCost: 100 },
      { jobLevel: 4,  skill: LILIA_SKILLS.passiveHealingMastery, jpCost: 120 },
      { jobLevel: 5,  skill: LILIA_SKILLS.revive, jpCost: 150 },
      { jobLevel: 5,  skill: LILIA_SKILLS.regenLight, jpCost: 130 },
      { jobLevel: 6,  skill: LILIA_SKILLS.curePlus, jpCost: 160 },
      { jobLevel: 6,  skill: LILIA_SKILLS.holyBoltPlus, jpCost: 180 },
      { jobLevel: 7,  skill: LILIA_SKILLS.curaga, jpCost: 200 },
      { jobLevel: 8,  skill: LILIA_SKILLS.divinePunishment, jpCost: 240 },
      { jobLevel: 8,  skill: LILIA_SKILLS.passiveAutoCompassion, jpCost: 260 },
      { jobLevel: 9,  skill: LILIA_SKILLS.sanctuary, jpCost: 280 },
      { jobLevel: 9,  skill: LILIA_SKILLS.guardianPrayerPlus, jpCost: 240 },
      { jobLevel: 10, skill: LILIA_SKILLS.fullRevive, jpCost: 320 },
      { jobLevel: 10, skill: LILIA_SKILLS.revivePlus, jpCost: 260 },
      { jobLevel: 10, skill: LILIA_SKILLS.holyCurePlus, jpCost: 280 },
      { jobLevel: 11, skill: LILIA_SKILLS.miracleBlessing, jpCost: 380 },
    ],
  },
  {
    id: 'zeno',
    name: 'ゼノ・ファウスト',
    jobName: '呪術師',
    backstory:
      '呪骸杖グリムを携える異端の呪術師。敵の技を「吸収」し、己の魔導書に刻む。' +
      'その代償として、彼の命は常に削られ続けている。',
    themeColor: 0x6b3d8f,
    baseStats: {
      maxHP: 340, maxMP: 130, physicalAttack: 12, magicAttack: 38,
      physicalDefense: 14, magicDefense: 20, speed: 25, luck: 18,
      criticalRate: 8, accuracyRate: 90,
    },
    growthRates: {
      maxHP: 20, maxMP: 6, physicalAttack: 0, magicAttack: 3,
      physicalDefense: 2, magicDefense: 2, speed: 2, luck: 1,
      criticalRate: 0, accuracyRate: 0,
    },
    learnableSkills: [
      { jobLevel: 1,  skill: ZENO_SKILLS.bindCurse, jpCost: 0 },
      { jobLevel: 2,  skill: ZENO_SKILLS.poisonMist, jpCost: 60 },
      { jobLevel: 3,  skill: ZENO_SKILLS.terror, jpCost: 80 },
      { jobLevel: 3,  skill: ZENO_SKILLS.evilEye, jpCost: 90 },
      { jobLevel: 4,  skill: ZENO_SKILLS.absorb, jpCost: 100 },
      { jobLevel: 5,  skill: ZENO_SKILLS.soulShackle, jpCost: 130 },
      { jobLevel: 5,  skill: ZENO_SKILLS.passiveCurseMastery, jpCost: 140 },
      { jobLevel: 6,  skill: ZENO_SKILLS.curseFog, jpCost: 160 },
      { jobLevel: 6,  skill: ZENO_SKILLS.bindCursePlus, jpCost: 150 },
      { jobLevel: 6,  skill: ZENO_SKILLS.absorbPlus, jpCost: 170 },
      { jobLevel: 7,  skill: ZENO_SKILLS.causalChain, jpCost: 200 },
      { jobLevel: 8,  skill: ZENO_SKILLS.soulFeast, jpCost: 220 },
      { jobLevel: 8,  skill: ZENO_SKILLS.passivePriceOfAbsorption, jpCost: 250 },
      { jobLevel: 9,  skill: ZENO_SKILLS.deathSentence, jpCost: 240 },
      { jobLevel: 9,  skill: ZENO_SKILLS.evilEyePlus, jpCost: 200 },
      { jobLevel: 9,  skill: ZENO_SKILLS.causalChainPlus, jpCost: 260 },
      { jobLevel: 10, skill: ZENO_SKILLS.chaosCurse, jpCost: 300 },
      { jobLevel: 10, skill: ZENO_SKILLS.deathSentencePlus, jpCost: 280 },
      { jobLevel: 11, skill: ZENO_SKILLS.gateOfUnderworld, jpCost: 360 },
    ],
  },
];

export function getCharacter(id: string): CharacterDef {
  const c = CHARACTERS.find((c) => c.id === id);
  if (!c) throw new Error(`unknown character: ${id}`);
  return c;
}
