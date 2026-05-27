using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// ラヴィニア固有の「元素共鳴」システム。
    ///
    /// ■ 仕組み
    ///   詠唱した属性魔法の属性が「共鳴スロット」に記録される。
    ///   次のターンに「別の属性」を使うと共鳴ボーナス(+30%)が発動する。
    ///   さらに特定の属性ペアは「元素反応」として+50%の追加ボーナスを受ける。
    ///
    /// ■ 元素反応ペア（どちらの順番でも成立）
    ///   炎 ↔ 氷  = 蒸気爆発  +50%
    ///   氷 ↔ 雷  = 帯電氷    +50%
    ///   雷 ↔ 炎  = 超過熱    +50%
    ///   闇 ↔ 光  = 禁忌共鳴  +80% (両方向共に自HP-5%)
    ///   風 ↔ 何でも = なびき +20% (風は汎用コンボ材)
    ///
    /// ■ スタック
    ///   同属性を連続で使うとスタックはリセット（ボーナスなし）。
    ///   「元素収束」スキルは現在の共鳴スタックを全消費して爆発させる特殊技。
    /// </summary>
    public sealed class ElementalResonanceSystem
    {
        // ── 定数 ──────────────────────────────────────────────────────────
        public const float DifferentElementBonus  = 0.30f;   // 別属性: +30%
        public const float ElementReactionBonus   = 0.50f;   // 元素反応: +50%
        public const float ForbiddenResonanceBonus= 0.80f;   // 禁忌共鳴: +80%
        public const float WindComboBonus         = 0.20f;   // 風コンボ: +20%
        public const float ForbiddenHPCost        = 0.05f;   // 禁忌共鳴HPコスト(MaxHPの5%)

        // 元素反応テーブル: (A, B) → ReactionName
        static readonly Dictionary<(ElementType, ElementType), ElementReaction> ReactionTable = new()
        {
            { (ElementType.Fire,      ElementType.Ice),       new("蒸気爆発",  ElementReactionBonus,  false) },
            { (ElementType.Ice,       ElementType.Fire),      new("蒸気爆発",  ElementReactionBonus,  false) },
            { (ElementType.Ice,       ElementType.Lightning), new("帯電氷",    ElementReactionBonus,  false) },
            { (ElementType.Lightning, ElementType.Ice),       new("帯電氷",    ElementReactionBonus,  false) },
            { (ElementType.Lightning, ElementType.Fire),      new("超過熱",    ElementReactionBonus,  false) },
            { (ElementType.Fire,      ElementType.Lightning), new("超過熱",    ElementReactionBonus,  false) },
            { (ElementType.Dark,      ElementType.Light),     new("禁忌共鳴",  ForbiddenResonanceBonus, true) },
            { (ElementType.Light,     ElementType.Dark),      new("禁忌共鳴",  ForbiddenResonanceBonus, true) },
            { (ElementType.Wind,      ElementType.Fire),      new("熱風",      WindComboBonus,        false) },
            { (ElementType.Wind,      ElementType.Ice),       new("吹雪増幅",  WindComboBonus,        false) },
            { (ElementType.Wind,      ElementType.Lightning), new("雷嵐",      WindComboBonus,        false) },
            { (ElementType.Fire,      ElementType.Wind),      new("熱風",      WindComboBonus,        false) },
            { (ElementType.Ice,       ElementType.Wind),      new("吹雪増幅",  WindComboBonus,        false) },
            { (ElementType.Lightning, ElementType.Wind),      new("雷嵐",      WindComboBonus,        false) },
        };

        // ── 状態 ─────────────────────────────────────────────────────────
        public ElementType  LastElement    { get; private set; } = ElementType.None;
        public bool         HasResonance   => LastElement != ElementType.None;
        public int          ResonanceAge   { get; private set; } = 0;  // ターン経過
        public const int    ResonanceDecayTurns = 2;  // 2ターン使わないと消える

        // Boost×3「元素収束」用のスタック
        List<ElementType> _elementHistory = new();
        public IReadOnlyList<ElementType> ElementHistory => _elementHistory;

        // ── バトル開始リセット ──────────────────────────────────────────
        public void OnBattleStart()
        {
            LastElement = ElementType.None;
            ResonanceAge = 0;
            _elementHistory.Clear();
        }

        // ── ターン経過 ──────────────────────────────────────────────────
        public void OnTurnEnd()
        {
            if (LastElement == ElementType.None) return;
            ResonanceAge++;
            if (ResonanceAge >= ResonanceDecayTurns)
            {
                LastElement  = ElementType.None;
                ResonanceAge = 0;
            }
        }

        // ── 魔法使用時のメイン処理 ────────────────────────────────────
        /// <summary>
        /// 魔法を使用する直前に呼ぶ。
        /// 共鳴ボーナス倍率を返す（1.0 = ボーナスなし）。
        /// hasForbiddenCost=true の場合、HPを5%失う処理を呼び出し側でやること。
        /// </summary>
        public ResonanceResult EvaluateAndRecord(ElementType usedElement,
                                                  BattleCharacter caster)
        {
            var result = new ResonanceResult { BonusMultiplier = 1f };

            if (usedElement == ElementType.None)
            {
                // 非属性魔法は共鳴に影響しない（ArcaneBurstなど）
                return result;
            }

            if (HasResonance && LastElement != usedElement)
            {
                // 別属性 → 共鳴ボーナス基本分
                result.BonusMultiplier += DifferentElementBonus;
                result.IsResonanceTrigger = true;

                // 元素反応チェック
                var key = (LastElement, usedElement);
                if (ReactionTable.TryGetValue(key, out var reaction))
                {
                    result.BonusMultiplier += reaction.BonusValue;
                    result.ReactionName     = reaction.Name;
                    result.HasForbiddenCost = reaction.IsForbitten;

                    if (reaction.IsForbitten)
                    {
                        // 禁忌共鳴: HPを5%失う
                        int hpCost = Mathf.Max(1, Mathf.RoundToInt(caster.MaxHP * ForbiddenHPCost));
                        caster.TakeDamage(hpCost, DamageType.True);
                    }
                }
            }
            else if (HasResonance && LastElement == usedElement)
            {
                // 同属性連続: ボーナスなし、共鳴リセット
                result.IsSameElementReset = true;
            }

            // 履歴に記録
            _elementHistory.Add(usedElement);
            if (_elementHistory.Count > 5) _elementHistory.RemoveAt(0);

            LastElement  = usedElement;
            ResonanceAge = 0;
            return result;
        }

        // ── 元素収束スキル用: 全スタック消費 ────────────────────────
        /// <summary>
        /// 「元素収束」使用時に呼ぶ。蓄積された全属性履歴から最大ボーナスを計算する。
        /// </summary>
        public float EvaluateConverge(bool isUpgraded)
        {
            if (_elementHistory.Count < 2)
                return isUpgraded ? 2.80f : 2.20f;  // 履歴不足は基本威力のみ

            float basePower  = isUpgraded ? 2.80f : 2.20f;
            float bonusMult  = isUpgraded ? 1.80f : 1.50f;
            float reactBonus = isUpgraded ? 0.80f : 0.50f;

            // 最後の2属性の反応チェック
            int last  = _elementHistory.Count - 1;
            int prev  = last - 1;
            var key   = (_elementHistory[prev], _elementHistory[last]);
            float reactionExtra = ReactionTable.TryGetValue(key, out var reaction)
                ? reaction.BonusValue : 0f;

            float totalMult = 1f
                + (HasResonance ? bonusMult - 1f : 0f)
                + reactionExtra + reactBonus;

            _elementHistory.Clear();
            LastElement  = ElementType.None;
            return basePower * totalMult;
        }

        // ── UI向けプレビュー ──────────────────────────────────────────
        /// <summary>
        /// 次の魔法を使う前に「これを使ったらいくらボーナスになるか」を返す
        /// </summary>
        public string GetResonancePreview(ElementType nextElement)
        {
            if (!HasResonance || nextElement == ElementType.None)
                return string.Empty;

            if (LastElement == nextElement)
                return "<color=#888>共鳴リセット（同属性）</color>";

            var key = (LastElement, nextElement);
            if (ReactionTable.TryGetValue(key, out var reaction))
                return $"<color=#FFD700>【{reaction.Name}】×{1f + DifferentElementBonus + reaction.BonusValue:P0} !</color>";

            return $"<color=#ADD8E6>【元素共鳴】×{1f + DifferentElementBonus:P0}</color>";
        }

        public Color GetResonanceColor() => LastElement switch
        {
            ElementType.Fire      => new Color(1.0f, 0.4f, 0.1f),
            ElementType.Ice       => new Color(0.5f, 0.8f, 1.0f),
            ElementType.Lightning => new Color(0.9f, 0.9f, 0.2f),
            ElementType.Wind      => new Color(0.5f, 1.0f, 0.5f),
            ElementType.Dark      => new Color(0.4f, 0.1f, 0.6f),
            ElementType.Light     => new Color(1.0f, 0.95f, 0.7f),
            _                     => Color.white,
        };
    }

    // ── 結果データ ─────────────────────────────────────────────────────
    public class ResonanceResult
    {
        public float  BonusMultiplier    = 1f;
        public bool   IsResonanceTrigger = false;
        public bool   IsSameElementReset = false;
        public string ReactionName;
        public bool   HasForbiddenCost   = false;
    }

    public class ElementReaction
    {
        public readonly string  Name;
        public readonly float   BonusValue;
        public readonly bool    IsForbitten;
        public ElementReaction(string name, float bonus, bool forbidden)
        { Name = name; BonusValue = bonus; IsForbitten = forbidden; }
    }
}
