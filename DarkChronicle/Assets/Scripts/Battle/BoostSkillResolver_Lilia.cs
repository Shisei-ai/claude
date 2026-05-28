using System.Collections.Generic;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// リリアのスキル Boost 強化テーブル。
    ///
    /// 回復スキルのBoostは「即座の大回復 vs 安定した継続回復」という
    /// トレードオフを意識した設計。蘇生スキルのBoostは全滅逆転力を高める。
    /// 攻撃系（聖光弾・神罰）はアンデッド特効と連動した爆発力が軸。
    /// </summary>
    public static class BoostSkillResolver_Lilia
    {
        public static readonly Dictionary<string, BoostUpgrade[]> LiliaBoostTable = new()
        {
            // ── 治癒 ───────────────────────────────────────────────────────
            ["治癒"] = new[]
            {
                new BoostUpgrade { HealPowerMult = 1.50f,
                    FlavorText = "回復量×1.5" },
                new BoostUpgrade { HealPowerMult = 2.00f,
                    HealRemovesAllStatus = true,
                    FlavorText = "回復量×2.0 / 状態異常も全回復" },
                new BoostUpgrade { HealPowerMult = 2.50f,
                    HealRemovesAllStatus = true, HitsAllAllies = true,
                    FlavorText = "回復量×2.5 / 全体化 / 状態異常全回復（使うなら全員に）" },
            },

            // ── 清浄 ───────────────────────────────────────────────────────
            ["清浄"] = new[]
            {
                new BoostUpgrade { HitsAllAllies = true,
                    FlavorText = "全体化（全員の状態異常を同時に解除）" },
                new BoostUpgrade { HitsAllAllies = true, HealPowerMult = 1.00f,
                    GrantRegenStatus = true,
                    FlavorText = "全体化 / 浄化後にリジェネも付与" },
                new BoostUpgrade { HitsAllAllies = true, GrantRegenStatus = true,
                    BuffDurationBonus = 3,
                    FlavorText = "全体化 / リジェネ付与（+3ターン延長）/ 次ターンの被ダメを20%軽減するバリア付与" },
            },

            // ── 聖光弾 ─────────────────────────────────────────────────────
            ["聖光弾"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.50f, UndeadBonusMult = 0.50f,
                    FlavorText = "威力×1.5 / アンデッドボーナス+0.5（合計×2.5）" },
                new BoostUpgrade { PowerMult = 2.00f, UndeadBonusMult = 1.00f,
                    FlavorText = "威力×2.0 / アンデッドボーナス+1.0（合計×3.0）" },
                new BoostUpgrade { PowerMult = 2.50f, UndeadBonusMult = 1.50f,
                    HitsAllEnemies = true,
                    FlavorText = "威力×2.5 / 全体化 / アンデッドボーナス+1.5（合計×3.5）/ アンデッドBreak確定" },
            },

            // ── 守護の祈り ─────────────────────────────────────────────────
            ["守護の祈り"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1, SelfBuffIncluded = true,
                    FlavorText = "バフ+1ターン / 自分にも適用" },
                new BoostUpgrade { BuffDurationBonus = 2, SelfBuffIncluded = true,
                    HitsAllAllies = true,
                    FlavorText = "全体化 / バフ+2ターン / 全員に守護" },
                new BoostUpgrade { BuffDurationBonus = 3, SelfBuffIncluded = true,
                    HitsAllAllies = true, HealPowerMult = 0f,
                    GrantRegenStatus = true,
                    FlavorText = "全体化 / バフ+3ターン / 全員に守護＋リジェネ付与 / 被ダメ軽減バリア追加" },
            },

            // ── 聖癒 ───────────────────────────────────────────────────────
            ["聖癒"] = new[]
            {
                new BoostUpgrade { HealPowerMult = 1.40f,
                    FlavorText = "回復量×1.4" },
                new BoostUpgrade { HealPowerMult = 1.80f, GrantRegenStatus = true,
                    FlavorText = "回復量×1.8 / リジェネも付与（3ターン）" },
                new BoostUpgrade { HealPowerMult = 2.30f, GrantRegenStatus = true,
                    AlsoRevive = true, AlsoReviveHPPercent = 0.30f,
                    FlavorText = "回復量×2.3 / リジェネ付与 / 戦闘不能者がいれば30%HPで同時蘇生" },
            },

            // ── 蘇生 ───────────────────────────────────────────────────────
            // Boostで蘇生HPが上がり、×3では全員蘇生に変化する。
            ["蘇生"] = new[]
            {
                new BoostUpgrade { HealPowerMult = 1.30f,
                    FlavorText = "蘇生HP+30%（合計80%HP）" },
                new BoostUpgrade { HealPowerMult = 1.00f, GrantRegenStatus = true,
                    FlavorText = "蘇生HP80% / リジェネ付与（即死回避）" },
                new BoostUpgrade { HitsAllAllies = true, GrantRegenStatus = true,
                    FlavorText = "全員蘇生（HP80%）/ 全員にリジェネ / 蘇生直後の1発を無効化するバリア付与" },
            },

            // ── 再生の光 ───────────────────────────────────────────────────
            ["再生の光"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 2,
                    FlavorText = "リジェネ持続+2ターン（合計7ターン）" },
                new BoostUpgrade { BuffDurationBonus = 3, HealPowerMult = 1.30f,
                    FlavorText = "リジェネ持続+3ターン / 回復量×1.3" },
                new BoostUpgrade { BuffDurationBonus = 5, HealPowerMult = 1.60f,
                    HealRemovesAllStatus = true,
                    FlavorText = "リジェネ持続+5ターン（合計10ターン）/ 回復量×1.6 / 同時に全状態異常も回復" },
            },

            // ── 全体治癒 ───────────────────────────────────────────────────
            ["全体治癒"] = new[]
            {
                new BoostUpgrade { HealPowerMult = 1.40f,
                    FlavorText = "全体回復量×1.4" },
                new BoostUpgrade { HealPowerMult = 1.80f, HealRemovesAllStatus = true,
                    FlavorText = "全体回復量×1.8 / 状態異常も全回復" },
                new BoostUpgrade { HealPowerMult = 2.30f, HealRemovesAllStatus = true,
                    GrantRegenStatus = true, AlsoRevive = true, AlsoReviveHPPercent = 0.40f,
                    FlavorText = "全体回復×2.3 / 状態異常全回復 / リジェネ付与 / 戦闘不能者も40%HP蘇生" },
            },

            // ── 神罰 ───────────────────────────────────────────────────────
            // アンデッド特効との組み合わせで爆発的な火力を発揮する。
            // ×3でアンデッドのBreakを確定させ、Break後に即座に高威力を叩き込める。
            ["神罰"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.40f, UndeadBonusMult = 0.50f,
                    FlavorText = "威力×1.4 / アンデッドボーナス+0.5（合計×3.0）" },
                new BoostUpgrade { PowerMult = 1.80f, UndeadBonusMult = 1.00f,
                    ExtraHits = 1,
                    FlavorText = "威力×1.8 / ヒット+1（合計4ヒット）/ アンデッドボーナス+1.0（合計×3.5）" },
                new BoostUpgrade { PowerMult = 2.20f, UndeadBonusMult = 1.50f,
                    ExtraHits = 2, ForceBreakIfShielded = true,
                    FlavorText = "威力×2.2 / ヒット+2（合計5ヒット）/ アンデッド確定Break / ボーナス+1.5（合計×4.0）/ 次ターン行動不能付与" },
            },

            // ── 聖域 ───────────────────────────────────────────────────────
            ["聖域"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "バフ持続+1ターン（合計4ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, AlsoBuffPhysicalDef = true,
                    FlavorText = "バフ持続+2ターン / 物理防御バフも追加" },
                new BoostUpgrade { BuffDurationBonus = 3, AlsoBuffPhysicalDef = true,
                    AlsoRevive = true, AlsoReviveHPPercent = 0.50f, GainBPOnUse = 1,
                    FlavorText = "バフ持続+3ターン / 物理防御バフ / 戦闘不能者も50%HP蘇生 / BP+1 / 完全防衛陣形" },
            },

            // ── 奇跡の祝福 ─────────────────────────────────────────────────
            // 最終奥義。Boostをかけることで「奇跡の連鎖」が発動する。
            ["奇跡の祝福"] = new[]
            {
                new BoostUpgrade { GrantRegenStatus = true, BuffDurationBonus = 1,
                    FlavorText = "バフ持続+1ターン / リジェネ持続も延長" },
                new BoostUpgrade { GrantRegenStatus = true, BuffDurationBonus = 2,
                    GainBPOnUse = 1,
                    FlavorText = "バフ+2ターン / リジェネ延長 / BP+1（連続行動も可）" },
                new BoostUpgrade { GrantRegenStatus = true, BuffDurationBonus = 3,
                    GainBPOnUse = 2, AlsoRevive = true, AlsoReviveHPPercent = 1.00f,
                    FlavorText = "バフ+3ターン / リジェネ最長 / BP+2 / 戦闘不能者も100%HP蘇生 / 完全な奇跡" },
            },
        };
    }

    // ── 回復量計算ヘルパー ────────────────────────────────────────────────
    /// <summary>
    /// リリアの回復量計算。BattleManager.CalculateHeal と連動して
    /// 「癒しの心得」パッシブ・「清心の治癒師」トレイト・Boost倍率を統合する。
    /// </summary>
    public static class LiliaHealCalculator
    {
        // CalculateHeal のデフォルト式: HealPower + (MagATK × 1.2) に各倍率を乗算

        /// <summary>
        /// 全ての倍率を統合した最終回復量を計算する。
        /// </summary>
        public static int CalculateFinalHeal(float baseHealPower, int magAtk,
                                              float traitBonus, float passiveBonus,
                                              float boostMult)
        {
            float baseMagScale = magAtk * 1.2f;
            float rawHeal      = baseHealPower + baseMagScale;
            float totalMult    = (1f + traitBonus + passiveBonus) * boostMult;
            return UnityEngine.Mathf.Max(1, UnityEngine.Mathf.RoundToInt(rawHeal * totalMult));
        }

        // ピーク回復量（奇跡の祝福 Boost×3 時）の試算
        public static int EstimatePeakHeal(int magAtk)
        {
            const float baseHeal    = 9999f;  // 完全回復フラグ
            const float traitBonus  = 0.30f;  // 清心の治癒師
            const float passiveBon  = 0.25f;  // 癒しの心得
            const float boostMult   = 1.00f;  // 奇跡の祝福は既に完全回復
            return CalculateFinalHeal(baseHeal, magAtk, traitBonus, passiveBon, boostMult);
        }
    }
}
