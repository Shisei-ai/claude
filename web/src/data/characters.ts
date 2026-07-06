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
      { jobLevel: 1, skill: LAVINIA_SKILLS.fireBolt, jpCost: 0 },
      { jobLevel: 2, skill: LAVINIA_SKILLS.iceSpike, jpCost: 60 },
      // TODO(移植中): マナ加速/沈黙の呪い/ブリザード/連鎖雷 ほか JobLv3-12
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
      { jobLevel: 1, skill: ASH_SKILLS.shadowArrow, jpCost: 0 },
      { jobLevel: 2, skill: ASH_SKILLS.poisonArrow, jpCost: 60 },
      // TODO(移植中): 解錠/残影/鷹の眼/二連射 ほか JobLv3-12
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
      { jobLevel: 1, skill: LILIA_SKILLS.cure, jpCost: 0 },
      { jobLevel: 1, skill: LILIA_SKILLS.purify, jpCost: 0 },
      { jobLevel: 2, skill: LILIA_SKILLS.holyBolt, jpCost: 60 },
      // TODO(移植中): 守護の祈り/聖治癒/蘇生 ほか JobLv3-12
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
      { jobLevel: 1, skill: ZENO_SKILLS.bindCurse, jpCost: 0 },
      { jobLevel: 2, skill: ZENO_SKILLS.poisonMist, jpCost: 60 },
      // TODO(移植中): 恐怖の叫び/邪眼/吸収 ほか JobLv3-12
    ],
  },
];

export function getCharacter(id: string): CharacterDef {
  const c = CHARACTERS.find((c) => c.id === id);
  if (!c) throw new Error(`unknown character: ${id}`);
  return c;
}
