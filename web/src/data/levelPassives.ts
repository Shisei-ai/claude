// キャラLvで覚えるパッシブスキル — 各キャラのパッシブは、キャラLv1・3・5で解放されるこの3つだけ
// (Web版の変更。職Lvで覚えるパッシブは廃止)。Unity版の「固有特性」(Character/Traits/*.cs) を基本に、
// 職Lvのパッシブだったものと見比べて各キャラ3つに絞った。
//   ベルンハルト: BernhardTraits.cs (不撓不屈・歴戦の鎧・鋼の肉体)
//   ラヴィニア:   LaviniaTraits.cs  (魔法の極意・過負荷詠唱・元素共鳴)
//   アッシュ:     AshTraits.cs      (影舞踊・鷲の目・盗賊の技)
//   リリア:       LiliaTraits.cs    (清心の治癒師・奇跡の手・聖光の加護)
//   ゼノ:         ZenoTraits.cs     (呪詛増幅・魔獣の書の主・暗黒の意志) → 呪いの刻印 (新規)・呪詛増幅・吸収の代価
// 以前は職Lvで覚えていたもの (鋼の肉体・過負荷詠唱など) や最初から有効だった特性もここへ移した。
import type { SkillDef } from '../core/types';
import { BERNHARD_SKILLS as B, LAVINIA_SKILLS as L, ASH_SKILLS as A, ZENO_SKILLS as Z } from './skills';
import { TRAIT_INFO, type TraitId } from '../battle/traits';

/** 解放されるキャラLv */
export const LEVEL_PASSIVE_LEVELS = [1, 3, 5] as const;

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
/** ゼノ① 呪いの刻印 (Web版の新規): 戦闘開始時に敵全員の攻撃・魔攻を下げる */
export const CURSE_BRAND_ID = 'SKL_Z_Passive_CurseBrand';
export const CURSE_BRAND = { atkDown: 0.15, turns: 3 };
/** アッシュ③ 盗賊の技 (Trait_RoguesCraft) */
export const ROGUES_CRAFT_ID = 'TRAIT_RoguesCraft';

export const LEVEL_PASSIVES: Record<string, LevelPassive[]> = {
  bernhard: [
    { level: 1, skill: B.passiveIronConstitution },
    { level: 3, skill: B.passiveBattleHardened },
    { level: 5, skill: B.passiveIndomitableWill },
  ],
  lavinia: [
    { level: 1, skill: L.passiveOverloadedCasting },
    { level: 3, skill: L.passiveArcaneMastery },
    {
      level: 5,
      skill: passive(RESONANCE_PASSIVE_ID, '元素共鳴',
        '直前 (2ターン以内) と違う属性の魔法を使うと威力+30%。炎・氷・雷の組み合わせは「元素反応」でさらに+50%、' +
        '風と炎・氷・雷は+20%、闇と光は「禁忌共鳴」で+80% (自分のHPを5%失う)。同じ属性を続けると共鳴は途切れる。'),
    },
  ],
  // 流麗回避 (旧・職Lv5) は回避率上昇が影舞踊と重なるため外した
  ash: [
    { level: 1, skill: fromTrait('ShadowDance'), trait: 'ShadowDance' },
    {
      level: 3,
      skill: { ...A.passiveCritEnhancement, name: '鷲の目',
        description: '【パッシブ】会心ダメージ倍率が×2.5になり、運の1/4が会心率に加わる。会心ヒット時、次の攻撃の会心率+10%（最大3スタック）。' },
    },
    {
      level: 5,
      skill: passive(ROGUES_CRAFT_ID, '盗賊の技',
        '宝箱ノードで隠し宝箱を1つ見つける。呪われた間の罠のダメージを50%減らす。盲目状態にならない。'),
      grants: ['SKL_A_Lockpicking', 'SKL_A_TrapMastery', 'SKL_A_DarkVision'],
    },
  ],
  // 癒しの心得 (回復+25%) は清心の治癒師と、自動慈愛 (自動回復) は奇跡の手と重なるため外した
  lilia: [
    { level: 1, skill: fromTrait('MiracleHands'), trait: 'MiracleHands' },
    { level: 3, skill: fromTrait('PureheartHealer'), trait: 'PureheartHealer' },
    { level: 5, skill: fromTrait('HolyGrace'), trait: 'HolyGrace' },
  ],
  // 呪術の心得 (付与率+20%・持続+1) は呪詛増幅とほぼ同じため外した。
  // ゼノは序盤 (第1層のボス) で倒れやすかったため、呪術師らしく「先手で敵を弱らせる」呪いの刻印を新しく作り、
  // 刻印の2つの弱体と呪詛増幅 (状態異常1種につき与ダメ+15%) が噛み合うようにした。
  // 吸収の代価は吸収の核として残し、魔獣の書の主・暗黒の意志は外した (吸収技の威力の目減りはWeb版でなくした)
  zeno: [
    {
      level: 1,
      skill: passive(CURSE_BRAND_ID, '呪いの刻印',
        `戦闘開始時、敵全員の攻撃力と魔法攻撃力を${Math.round(CURSE_BRAND.atkDown * 100)}%下げる (${CURSE_BRAND.turns}ターン)。`),
    },
    { level: 3, skill: fromTrait('CurseAmplifier'), trait: 'CurseAmplifier' },
    { level: 5, skill: Z.passivePriceOfAbsorption },
  ],

};

/** 職Lvで覚えるパッシブ・フィールドスキルとしては無くなったもの (古いセーブから取り除く。
 *  キャラLvのパッシブに含まれるものは、キャラLvが届いていれば引き続き有効) */
export const MOVED_TO_LEVEL_PASSIVES = [
  'SKL_Passive_IronConstitution', 'SKL_Passive_BattleHardened', 'SKL_Passive_IndomitableWill',
  'SKL_L_Passive_Overloaded', 'SKL_L_Passive_ArcaneMastery',
  'SKL_A_Passive_CritEnhance', 'SKL_A_Lockpicking', 'SKL_A_TrapMastery', 'SKL_A_DarkVision',
  'SKL_A_Passive_FluidEvasion', 'SKL_L2_Passive_HealingMastery', 'SKL_L2_Passive_AutoCompassion',
  'SKL_Z_Passive_CurseMastery', 'SKL_Z_Passive_PriceOfAbsorption',
];

export function levelPassivesOf(characterId: string): LevelPassive[] {
  return LEVEL_PASSIVES[characterId] ?? [];
}
