using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// ラヴィニアのスキル Boost 強化テーブル。
    /// BoostSkillResolver.BoostTable に統合されるが、
    /// 元素共鳴システムとの連動ロジックを持つため別ファイルで管理する。
    /// </summary>
    public static class BoostSkillResolver_Lavinia
    {
        // 既存BoostSkillResolverに追加するエントリ群
        public static readonly Dictionary<string, BoostUpgrade[]> LaviniaBoostTable = new()
        {
            // ── 火炎弾 ─────────────────────────────────────────────────
            ["火炎弾"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.50f, BurnChanceBonus = 0.15f,
                    FlavorText = "威力×1.5 / 炎上確率+15%" },
                new BoostUpgrade { PowerMult = 2.00f, BurnChanceBonus = 0.30f,
                    FlavorText = "威力×2.0 / 炎上確率+30%" },
                new BoostUpgrade { PowerMult = 2.50f, BurnChanceBonus = 0.50f,
                    HitsAllEnemies = true,
                    FlavorText = "威力×2.5 / 全体化 / 炎上確率最大 / 元素共鳴ボーナスも全体適用" },
            },

            // ── 業火 ───────────────────────────────────────────────────
            ["業火"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.40f,
                    FlavorText = "威力×1.4" },
                new BoostUpgrade { PowerMult = 1.80f, IgnoreDefensePercent = 0.30f,
                    FlavorText = "威力×1.8 / 魔法防御30%無視" },
                new BoostUpgrade { PowerMult = 2.30f, IgnoreDefensePercent = 0.50f,
                    InstantKillOnBrokenChance = 0.15f,
                    FlavorText = "威力×2.3 / 魔法防御50%無視 / Break中に15%で即死 / 炎上確定" },
            },

            // ── 氷棘 ───────────────────────────────────────────────────
            ["氷棘"] = new[]
            {
                new BoostUpgrade { ExtraHits = 1, ApplyStatusChanceBonus = 0.10f,
                    FlavorText = "ヒット数+1 / 凍結確率+10%" },
                new BoostUpgrade { ExtraHits = 2, ApplyStatusChanceBonus = 0.20f,
                    FlavorText = "ヒット数+2 / 凍結確率+20%" },
                new BoostUpgrade { ExtraHits = 3, ApplyStatusChanceBonus = 0.30f,
                    GuaranteedCrit = true,
                    FlavorText = "ヒット数+3 / 凍結確率+30% / 会心確定 / 凍結した敵は次の被弾+30%" },
            },

            // ── 氷嵐 ───────────────────────────────────────────────────
            ["氷嵐"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.35f, ApplyStatusChanceBonus = 0.10f,
                    FlavorText = "威力×1.35 / 凍結確率+10%" },
                new BoostUpgrade { PowerMult = 1.70f, ApplyStatusChanceBonus = 0.20f, ApplyKnockback = true,
                    FlavorText = "威力×1.7 / 凍結確率+20% / 全敵の速度を-1ターン" },
                new BoostUpgrade { PowerMult = 2.10f, ApplyStatusChanceBonus = 0.30f, ApplyKnockback = true,
                    ExtraHits = 1,
                    FlavorText = "威力×2.1×2ヒット / 凍結確率最大 / 速度ダウン2ターン" },
            },

            // ── 連鎖雷撃 ──────────────────────────────────────────────
            ["連鎖雷撃"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.30f, ApplyStatusChanceBonus = 0.10f,
                    FlavorText = "威力×1.3 / 麻痺確率+10%" },
                new BoostUpgrade { PowerMult = 1.60f, ApplyStatusChanceBonus = 0.20f, GainBPOnUse = 1,
                    FlavorText = "威力×1.6 / 麻痺確率+20% / BP+1" },
                new BoostUpgrade { PowerMult = 2.00f, ApplyStatusChanceBonus = 0.30f, GainBPOnUse = 2,
                    ParalyzeAlreadyParalyzedStun = true,
                    FlavorText = "威力×2.0 / 全体連鎖 / 麻痺中の敵を完全スタン / BP+2" },
            },

            // ── 風刃嵐 ─────────────────────────────────────────────────
            ["風刃嵐"] = new[]
            {
                new BoostUpgrade { ExtraHits = 1, PowerMult = 1.10f,
                    FlavorText = "ヒット数+1 / 威力×1.1" },
                new BoostUpgrade { ExtraHits = 2, PowerMult = 1.20f, ApplyKnockback = true,
                    FlavorText = "ヒット数+2 / 威力×1.2 / 全敵の速度ダウン延長" },
                new BoostUpgrade { ExtraHits = 3, PowerMult = 1.30f, ApplyKnockback = true,
                    SplashToAdjacent = true,
                    FlavorText = "ヒット数+3 / 威力×1.3 / 速度ダウン3ターン / 次ターン元素共鳴が消えない" },
            },

            // ── 暗黒波 ─────────────────────────────────────────────────
            ["暗黒波"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.40f,
                    FlavorText = "威力×1.4（必中維持）" },
                new BoostUpgrade { PowerMult = 1.80f, IgnoreDefensePercent = 0.25f,
                    FlavorText = "威力×1.8 / 魔法防御25%無視" },
                new BoostUpgrade { PowerMult = 2.20f, IgnoreDefensePercent = 0.50f,
                    // 禁忌共鳴の代わりにHPを吸収（Boost×3は闇の力を全解放）
                    FlavorText = "威力×2.2 / 防御50%無視 / 必中 / ダメージ30%を自分のHPとして吸収" },
            },

            // ── 聖光閃 ─────────────────────────────────────────────────
            ["聖光閃"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.40f,
                    FlavorText = "威力×1.4（アンデッド・悪魔ボーナス倍率維持）" },
                new BoostUpgrade { PowerMult = 1.70f, HitsAllEnemies = true,
                    FlavorText = "威力×1.7 / 全体化" },
                new BoostUpgrade { PowerMult = 2.20f, HitsAllEnemies = true,
                    GrantRegenStatus = true,
                    FlavorText = "威力×2.2 / 全体 / 味方全員にリジェネ付与 / 光属性の光輝で共鳴スロットを保持" },
            },

            // ── 魔力爆発 ──────────────────────────────────────────────
            ["魔力爆発"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.40f,
                    FlavorText = "威力×1.4（MPスケーリング維持）" },
                new BoostUpgrade { PowerMult = 1.80f, IgnoreDefensePercent = 0.20f,
                    FlavorText = "威力×1.8 / 防御20%無視" },
                new BoostUpgrade
                {
                    PowerMult = 2.30f, IgnoreDefensePercent = 0.50f,
                    // 特殊: 3連続発動（弱めた威力で3回）
                    ExtraHits = 2,
                    FlavorText = "3連続発動（×2.3×3）/ 防御50%無視 / 3発ともMPスケーリング適用 / 消費MP2倍",
                },
            },

            // ── 元素収束 ──────────────────────────────────────────────
            ["元素収束"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.30f,
                    FlavorText = "全元素収束威力×1.3 / 共鳴ボーナスも×1.3" },
                new BoostUpgrade { PowerMult = 1.60f, GainBPOnUse = 1,
                    FlavorText = "×1.6 / 爆発後BP+1 / 次ターン共鳴スロット維持" },
                new BoostUpgrade { PowerMult = 2.00f, GainBPOnUse = 2,
                    HitsAllEnemies = true,
                    FlavorText = "×2.0 / 全体化 / BP+2 / 全元素反応を同時発動（最大火力）" },
            },

            // ── 魔力加速 ──────────────────────────────────────────────
            ["魔力加速"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "バフ+1ターン" },
                new BoostUpgrade { BuffDurationBonus = 2, AlsoBuffMagicAtk = true,
                    FlavorText = "バフ+2ターン / 魔法攻撃力+20%も追加" },
                new BoostUpgrade { BuffDurationBonus = 3, AlsoBuffMagicAtk = true,
                    GuaranteedCrit = true,
                    FlavorText = "バフ+3ターン / 魔法攻撃+20% / 次に使う魔法が会心確定" },
            },

            // ── 沈黙の呪詛 ────────────────────────────────────────────
            ["沈黙の呪詛"] = new[]
            {
                new BoostUpgrade { ApplyStatusDurationBonus = 1,
                    FlavorText = "沈黙持続+1ターン" },
                new BoostUpgrade { ApplyStatusDurationBonus = 2, HitsAllEnemies = true,
                    FlavorText = "全体化 / 沈黙+2ターン" },
                new BoostUpgrade { ApplyStatusDurationBonus = 3, HitsAllEnemies = true,
                    // ボスにも2ターン有効
                    FlavorText = "全体沈黙+3ターン / ボスにも2ターン有効 / 沈黙中の敵はBreakゲージ回復しない" },
            },
        };
    }

    // ── MPスケーリング計算 (ArcaneBurst 専用) ──────────────────────────
    public static class ArcaneBurstCalculator
    {
        const float MinScaleMPRatio = 0.30f;  // MP30%以下 → ×0.70
        const float MaxScaleMPRatio = 1.00f;  // MP100%   → ×1.30
        const float MinMult         = 0.70f;
        const float MaxMult         = 1.30f;

        public static float GetMPScaleMultiplier(int currentMP, int maxMP)
        {
            if (maxMP <= 0) return 1f;
            float ratio = (float)currentMP / maxMP;
            return Mathf.Lerp(MinMult, MaxMult, (ratio - MinScaleMPRatio)
                                                / (MaxScaleMPRatio - MinScaleMPRatio));
        }

        // 強化版BoostなしArcaneBurst
        public static float GetUpgradedBonus(int currentMP, int maxMP)
        {
            float ratio = maxMP > 0 ? (float)currentMP / maxMP : 0f;
            return ratio >= 0.70f ? 1.50f : 1f;
        }
    }
}
