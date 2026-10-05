// キャラLvで覚えるパッシブスキル — Unity版の「固有特性」(Character/Traits/*.cs) を、
// 各キャラ3つずつ、キャラLv2・4・6で解放されるパッシブスキルとして扱う (Web版の変更)。
//   ベルンハルト: BernhardTraits.cs (不撓不屈・歴戦の鎧・鋼の肉体)
//   ラヴィニア:   LaviniaTraits.cs  (魔法の極意・過負荷詠唱・元素共鳴)
//   アッシュ:     AshTraits.cs      (影舞踊・鷲の目・盗賊の技)
//   リリア:       LiliaTraits.cs    (清心の治癒師・奇跡の手・聖光の加護)
//   ゼノ:         ZenoTraits.cs     (呪詛増幅・魔獣の書の主・暗黒の意志)
// 以前は職Lvで覚えていたもの (鋼の肉体・過負荷詠唱など) や最初から有効だった特性もここへ移した。
import type { SkillDef } from '../core/types';
import { BERNHARD_SKILLS as B, LAVINIA_SKILLS as L, ASH_SKILLS as A } from './skills';
import { TRAIT_INFO, type TraitId } from '../battle/traits';

/** 解放されるキャラLv */
export const LEVEL_PASSIVE_LEVELS = [2, 4, 6] as const;

export interface LevelPassive {
  level: number;
  skill: SkillDef;
  /** 戦闘エンジンの固有トレイト (battle/traits.ts) として効くもの */
  trait?: TraitId;
  /** 同時に有効になる既存のスキル (盗賊の技 → 鍵師の手・罠師の知識・暗視術) */
  grants?: string[];
}

const passive = (id: string, name: string, description: string): SkillDef => ({
  id, name, description: `【パッシブ】${description}`,
  element: 'None', damageType: 'Physical', mpCost: 0, basePower: 0, hitCount: 1,
  hitsAllEnemies: false, hitsAllAllies: false, canBreak: false, isHeal: false, healPower: 0,
  isPassive: true,
});
const fromTrait = (t: TraitId): SkillDef => passive(`TRAIT_${t}`, TRAIT_INFO[t].name, `${TRAIT_INFO[t].desc}。`);

/** ラヴィニア③ 元素共鳴 (ElementalResonanceSystem.cs) */
export const RESONANCE_PASSIVE_ID = 'SKL_L_Passive_Resonance';
/** アッシュ③ 盗賊の技 (Trait_RoguesCraft) */
export const ROGUES_CRAFT_ID = 'TRAIT_RoguesCraft';

export const LEVEL_PASSIVES: Record<string, LevelPassive[]> = {
  bernhard: [
    { level: 2, skill: B.passiveIronConstitution },
    { level: 4, skill: B.passiveBattleHardened },
    { level: 6, skill: B.passiveIndomitableWill },
  ],
  lavinia: [
    { level: 2, skill: L.passiveOverloadedCasting },
    { level: 4, skill: L.passiveArcaneMastery },
    {
      level: 6,
      skill: passive(RESONANCE_PASSIVE_ID, '元素共鳴',
        '直前 (2ターン以内) と違う属性の魔法を使うと威力+30%。炎・氷・雷の組み合わせは「元素反応」でさらに+50%、' +
        '風と炎・氷・雷は+20%、闇と光は「禁忌共鳴」で+80% (自分のHPを5%失う)。同じ属性を続けると共鳴は途切れる。'),
    },
  ],
  ash: [
    { level: 2, skill: fromTrait('ShadowDance'), trait: 'ShadowDance' },
    {
      level: 4,
      skill: { ...A.passiveCritEnhancement, name: '鷲の目',
        description: '【パッシブ】会心ダメージ倍率が×2.5になり、運の1/4が会心率に加わる。会心ヒット時、次の攻撃の会心率+10%（最大3スタック）。' },
    },
    {
      level: 6,
      skill: passive(ROGUES_CRAFT_ID, '盗賊の技',
        '宝箱ノードで隠し宝箱を1つ見つける。呪われた間の罠のダメージを50%減らす。盲目状態にならない。'),
      grants: ['SKL_A_Lockpicking', 'SKL_A_TrapMastery', 'SKL_A_DarkVision'],
    },
  ],
  lilia: [
    // 回復役の要「奇跡の手」を最初に (聖光の加護を先にすると第1層の突破率が大きく落ちたため)
    { level: 2, skill: fromTrait('MiracleHands'), trait: 'MiracleHands' },
    { level: 4, skill: fromTrait('PureheartHealer'), trait: 'PureheartHealer' },
    { level: 6, skill: fromTrait('HolyGrace'), trait: 'HolyGrace' },
  ],
  zeno: [
    { level: 2, skill: fromTrait('CurseAmplifier'), trait: 'CurseAmplifier' },
    { level: 4, skill: fromTrait('GrimoireMaster'), trait: 'GrimoireMaster' },
    { level: 6, skill: fromTrait('DarkWill'), trait: 'DarkWill' },
  ],
};

/** 職Lvの習得から外し、キャラLvの解放へ移したスキル (古いセーブから取り除く) */
export const MOVED_TO_LEVEL_PASSIVES = [
  'SKL_Passive_IronConstitution', 'SKL_Passive_BattleHardened', 'SKL_Passive_IndomitableWill',
  'SKL_L_Passive_Overloaded', 'SKL_L_Passive_ArcaneMastery',
  'SKL_A_Passive_CritEnhance', 'SKL_A_Lockpicking', 'SKL_A_TrapMastery', 'SKL_A_DarkVision',
];

export function levelPassivesOf(characterId: string): LevelPassive[] {
  return LEVEL_PASSIVES[characterId] ?? [];
}
