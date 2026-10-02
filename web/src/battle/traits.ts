// キャラクター固有トレイト — Unity版 Character/Traits/*.cs の移植。
// Unity版ではトレイトは CharacterData に紐付く「常時パッシブ特性」で、スキル習得とは別に
// 最初から有効になる。ベルンハルト・ラヴィニアのトレイトと、アッシュの会心系は
// Web版では習得パッシブ (SKL_*_Passive_*) として実装済みのため、ここでは
// 未移植だったリリア・ゼノの全トレイトと、アッシュ「影舞踊」を扱う。
// 数値は各トレイトクラスの定数そのまま。発動箇所は BattleManager.cs の呼び出し位置に合わせる。

import type { SkillDef } from '../core/types';

export type TraitId =
  // アッシュ
  | 'ShadowDance'      // 影舞踊
  // リリア
  | 'PureheartHealer'  // 清心の治癒師
  | 'MiracleHands'     // 奇跡の手
  | 'HolyGrace'        // 聖光の加護
  // ゼノ
  | 'CurseAmplifier'   // 呪詛増幅
  | 'GrimoireMaster'   // 魔獣の書の主
  | 'DarkWill';        // 暗黒の意志

/** キャラID → 固有トレイト (仲間として加入した幻影にも同じく付く) */
export const CHARACTER_TRAITS: Record<string, TraitId[]> = {
  ash: ['ShadowDance'],
  lilia: ['PureheartHealer', 'MiracleHands', 'HolyGrace'],
  zeno: ['CurseAmplifier', 'GrimoireMaster', 'DarkWill'],
};

/** 表示用の名前と説明 (Unity版 GetCurrentBonusText / クラスコメント準拠) */
export const TRAIT_INFO: Record<TraitId, { name: string; desc: string }> = {
  ShadowDance: { name: '影舞踊', desc: '回避率+20%。回避するとShadow State、次の攻撃が会心確定＋威力+30%' },
  PureheartHealer: { name: '清心の治癒師', desc: '回復量+30% / 蘇生時に自分もHP20%回復 / リジェネ持続+1T' },
  MiracleHands: { name: '奇跡の手', desc: '行動のたびに最もHPの低い味方を魔攻×0.30回復 / 完全蘇生でリジェネ3T' },
  HolyGrace: { name: '聖光の加護', desc: '光属性ダメージ+40%、アンデッドに追加×1.5 / アンデッドのシールド削り×2' },
  CurseAmplifier: { name: '呪詛増幅', desc: '状態異常の付与率+25%・持続+1T / 敵の状態異常1種につきダメージ+15%（最大+60%）' },
  GrimoireMaster: { name: '魔獣の書の主', desc: '吸収のHP消費-25% / 吸収した技のMP-1・威力+10%' },
  DarkWill: { name: '暗黒の意志', desc: 'HP50%以下でMP消費-3 / 25%以下で吸収率+30% / 10%以下で与ダメージ+50%' },
};

// ── 定数 (Unity版の各トレイトクラスの const) ─────────────────────────
export const SHADOW_DODGE_BONUS = 0.20;            // Trait_ShadowDance.DodgeRateBonus

export const PUREHEART_HEAL_BONUS = 0.30;          // Trait_PureheartHealer.HealBonus
export const PUREHEART_SELF_HEAL_AFTER_REVIVE = 0.20;
export const PUREHEART_REGEN_DURATION_BONUS = 1;

export const MIRACLE_AUTO_HEAL_MULT = 0.30;        // Trait_MiracleHands: Matk × 0.30
export const MIRACLE_AUTO_HEAL_THRESHOLD = 0.99;   // HP99%以上の味方には発動しない
export const MIRACLE_FULL_REVIVE_REGEN_TURNS = 3;

export const HOLY_DAMAGE_BONUS = 0.40;             // Trait_HolyGrace
export const HOLY_UNDEAD_EXTRA_MULT = 1.50;
export const HOLY_UNDEAD_BREAK_MULTIPLE = 2;

export const CURSE_STATUS_CHANCE_BONUS = 0.25;     // Trait_CurseAmplifier
export const CURSE_DEBUFF_DURATION_BONUS = 1;
export const CURSE_DMG_BONUS_PER_DEBUFF = 0.15;
export const CURSE_MAX_DEBUFF_STACKS = 4;

export const GRIMOIRE_ABSORB_HP_COST_REDUCTION = 0.25; // Trait_GrimoireMaster
export const GRIMOIRE_MP_DISCOUNT = 1;
export const GRIMOIRE_SKILL_POWER_SCALE = 0.90;    // GrimoireSystem.SkillPowerScale (吸収技は威力10%ダウン)
export const GRIMOIRE_ABSORBED_POWER_BONUS = 0.10;

export const DARKWILL_LOW_HP = 0.50;               // Trait_DarkWill
export const DARKWILL_CRIT_HP = 0.25;
export const DARKWILL_DESPERATE_HP = 0.10;
export const DARKWILL_MP_REDUCTION = 3;
export const DARKWILL_ABSORB_BONUS = 0.30;
export const DARKWILL_DEBUFF_AMPLIFY = 0.50;

export function traitsFor(characterId: string | undefined): Set<TraitId> {
  return new Set(characterId ? CHARACTER_TRAITS[characterId] ?? [] : []);
}

/** グリモワールに刻む形へ変換 (MP4以上、Web版の調整: 元が物理技でもゼノの魔法攻撃力で放つ) */
export function toGrimoireSkill(sk: SkillDef): SkillDef {
  return {
    ...sk,
    mpCost: Math.max(4, sk.mpCost || 8),
    damageType: sk.damageType === 'Physical' ? 'Magical' : sk.damageType,
    fromGrimoire: true,
  };
}
