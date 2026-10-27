using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Character.Traits
{
    // ═══════════════════════════════════════════════════════════════════════
    //   ラヴィニア固有トレイト × 2  +  固有システム保持トレイト
    // ═══════════════════════════════════════════════════════════════════════

    // ── トレイト①: 魔法の極意 ────────────────────────────────────────────
    /// <summary>
    /// 魔法会心時のダメージが通常の2.25倍（+150%）に。
    /// またMagATK/5 の値が会心率に恒常加算される。
    /// → MagATK 110 なら +22% 会心率。最終的に会心率が驚異の値になりうる。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_ArcaneMastery",
                     menuName  = "DarkChronicle/Trait/Lavinia/ArcaneMastery")]
    public sealed class Trait_ArcaneMastery : CharacterTrait
    {
        // 魔法会心倍率の追加量: 通常は CritMultiplier=1.5 (50%増)
        // このトレイトで +1.0 → 実質 CritMultiplier=2.5 (150%増)
        public const float ExtraCritMultiplier = 1.0f;

        // 会心率: MagATK / この値を加算
        public const int MagAtkToCritDivisor = 5;

        /// <summary>
        /// BattleManager の会心計算パスが呼ぶ。通常倍率に追加乗算する。
        /// </summary>
        public float GetMagicCritMultiplierBonus() => ExtraCritMultiplier;

        /// <summary>
        /// BattleCharacter の CriticalRate 計算時に呼ぶ。
        /// </summary>
        public int GetMagicCritRateBonus(int magicAttack)
            => Mathf.RoundToInt((float)magicAttack / MagAtkToCritDivisor);

        // UIヒント用
        public string GetCurrentBonusText(BattleCharacter owner)
        {
            int critBonus = GetMagicCritRateBonus(owner.Matk);
            return $"魔法会心×2.5倍、会心率+{critBonus}%（MagATK依存）";
        }
    }

    // ── トレイト②: 過負荷詠唱 ───────────────────────────────────────────
    /// <summary>
    /// MPが60%以上: 全魔法コスト-2 / Speed+10%
    /// MPが40%以下: MagATK+25%（窮地の覚醒）
    /// → MPを計画的に使うと強く、使い切った土壇場でも強い。中間が弱点。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_OverloadedCasting",
                     menuName  = "DarkChronicle/Trait/Lavinia/OverloadedCasting")]
    public sealed class Trait_OverloadedCasting : CharacterTrait
    {
        const float HighMPThreshold  = 0.60f;
        const float LowMPThreshold   = 0.40f;
        const int   MPCostReduction  = 2;
        const int   SpeedBonusPct    = 10;
        const float DespMagAtkBonus  = 0.25f;

        // 現在のMP比率
        static float MPRatio(BattleCharacter owner)
            => owner.MaxMP > 0 ? (float)owner.MP / owner.MaxMP : 0f;

        // BattleManagerのスキルMPコスト計算時に呼ぶ
        public int ModifyMPCost(BattleCharacter owner, int baseCost)
        {
            if (MPRatio(owner) >= HighMPThreshold)
                return Mathf.Max(0, baseCost - MPCostReduction);
            return baseCost;
        }

        // BattleCharacter.Speed取得時に適用する追加速度
        public int GetSpeedBonus(BattleCharacter owner)
            => MPRatio(owner) >= HighMPThreshold ? SpeedBonusPct : 0;

        // BattleCharacter.Matk取得時に適用する追加攻撃力
        public int GetMagAtkBonus(BattleCharacter owner)
        {
            if (MPRatio(owner) <= LowMPThreshold)
                return Mathf.RoundToInt(owner.BaseStats.MagicAttack * DespMagAtkBonus);
            return 0;
        }

        // UIステータス表示用
        public string GetStateLabel(BattleCharacter owner)
        {
            float ratio = MPRatio(owner);
            if (ratio >= HighMPThreshold) return "<color=#ADD8E6>MP充填：詠唱最適化</color>";
            if (ratio <= LowMPThreshold)  return "<color=#FF6060>MP枯渇：覚醒状態</color>";
            return string.Empty;
        }

        public override void OnTurnStart(BattleCharacter owner)
        {
            // ターン表示のためにUI更新イベントを発火（実装はUI側で購読）
            // 実際の値はGetSpeedBonus/GetMagAtkBonusで毎回計算する
        }
    }

    // ── トレイト③: 元素共鳴保持体（システム連結トレイト） ───────────────
    /// <summary>
    /// ラヴィニアが元素共鳴システムのインスタンスを持ち続けるためのトレイト。
    /// スキルとして習得するのではなく、CharacterDataに直接紐付ける「固有特性」。
    /// BattleManager は IResonanceHolder を見てラヴィニアかどうかを判定する。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_ElementalResonanceHolder",
                     menuName  = "DarkChronicle/Trait/Lavinia/ElementalResonanceHolder")]
    public sealed class Trait_ElementalResonanceHolder : CharacterTrait
    {
        // 各バトルインスタンスにひとつ
        public ElementalResonanceSystem ResonanceSystem { get; private set; }

        public override void OnBattleStart(BattleCharacter owner, BattleCharacter[] heroes)
        {
            ResonanceSystem ??= new ElementalResonanceSystem();
            ResonanceSystem.OnBattleStart();
            BattleResonanceUIBridge.NotifyStart(owner, ResonanceSystem);
        }

        public override void OnTurnStart(BattleCharacter owner)
        {
            ResonanceSystem?.OnTurnEnd();
            BattleResonanceUIBridge.NotifyUpdate(owner, ResonanceSystem);
        }

        public override void OnBattleEnd(BattleCharacter owner)
        {
            ResonanceSystem?.OnBattleStart();  // リセット
        }
    }

    // ── 元素共鳴UI橋渡し ─────────────────────────────────────────────────
    /// <summary>
    /// 元素共鳴状態の変化をBattleUIに通知する。
    /// 実装はBattleUIが購読するイベントで行う。
    /// </summary>
    public static class BattleResonanceUIBridge
    {
        public static event System.Action<BattleCharacter, ElementalResonanceSystem>
            OnResonanceUpdate;

        public static void NotifyStart(BattleCharacter c, ElementalResonanceSystem rs)
            => OnResonanceUpdate?.Invoke(c, rs);

        public static void NotifyUpdate(BattleCharacter c, ElementalResonanceSystem rs)
            => OnResonanceUpdate?.Invoke(c, rs);
    }
}
