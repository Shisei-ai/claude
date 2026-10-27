using System.Collections.Generic;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// アッシュのスキル Boost 強化テーブル。
    /// Shadow Dance システムとの連動ロジック（GrantShadowState / Shadow State消費時の
    /// ダメージ修飾）は Trait_ShadowDance 側で処理するが、
    /// Boost強化でShadow Stateを付与するかどうかはこのテーブルで制御する。
    /// </summary>
    public static class BoostSkillResolver_Ash
    {
        public static readonly Dictionary<string, BoostUpgrade[]> AshBoostTable = new()
        {
            // ── 影矢 ───────────────────────────────────────────────────────
            ["影矢"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.50f,
                    FlavorText = "威力×1.5" },
                new BoostUpgrade { PowerMult = 2.00f, CritRateBonus = 20,
                    FlavorText = "威力×2.0 / 会心率+20%" },
                new BoostUpgrade { PowerMult = 2.50f, GuaranteedCrit = true,
                    GrantShadowState = true,
                    FlavorText = "威力×2.5 / 会心確定 / 使用後Shadow State付与（連続コンボ可）" },
            },

            // ── 毒矢 ───────────────────────────────────────────────────────
            ["毒矢"] = new[]
            {
                new BoostUpgrade { ApplyStatusDurationBonus = 1,
                    FlavorText = "毒持続+1ターン（合計4ターン）" },
                new BoostUpgrade { PowerMult = 1.30f, ApplyStatusDurationBonus = 2,
                    FlavorText = "威力×1.3 / 毒持続+2ターン（合計5ターン）" },
                new BoostUpgrade { PowerMult = 1.50f, ApplyStatusDurationBonus = 3,
                    HitsAllEnemies = true,
                    FlavorText = "全体化 / 毒+3ターン / 全体毒爆発コンボが可能" },
            },

            // ── 残影 ───────────────────────────────────────────────────────
            ["残影"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "持続+1ターン（合計3ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, CritRateBonus = 15,
                    FlavorText = "持続+2ターン（合計4ターン） / 反撃時の会心率+15%" },
                new BoostUpgrade { BuffDurationBonus = 3, GainBPOnUse = 1,
                    GrantShadowState = true,
                    FlavorText = "持続+3ターン / BP+1 / 使用と同時にShadow State付与 / 魔法攻撃も回避対象に" },
            },

            // ── 鷹の目 ─────────────────────────────────────────────────────
            ["鷹の目"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "バフ+1ターン（合計3ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, CritRateBonus = 20,
                    FlavorText = "バフ+2ターン / 会心率追加+20%" },
                new BoostUpgrade { BuffDurationBonus = 3, GuaranteedCrit = true,
                    FlavorText = "バフ+3ターン / 会心確定（バフ期間中全攻撃） / 会心時Break判定を追加付与" },
            },

            // ── 二連射 ─────────────────────────────────────────────────────
            ["二連射"] = new[]
            {
                new BoostUpgrade { ExtraHits = 1, PowerMult = 1.00f,
                    FlavorText = "ヒット数+1（合計3連射、Shadow中4連射）" },
                new BoostUpgrade { ExtraHits = 2, PowerMult = 1.10f,
                    FlavorText = "ヒット数+2（合計4連射、Shadow中5連射）/ 威力×1.1" },
                new BoostUpgrade { ExtraHits = 3, PowerMult = 1.20f,
                    LastHitGuaranteedCrit = true,
                    FlavorText = "ヒット数+3（合計5連射、Shadow中6連射）/ 威力×1.2 / 最終ヒット会心確定" },
            },

            // ── 罠設置 ─────────────────────────────────────────────────────
            // 使いこなしポイントが最も色濃く出るスキル。
            // ×3はさらに「使用後に即Shadow State」→「次のターンに超強化攻撃」まで繋がる。
            ["罠設置"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.30f,
                    FlavorText = "罠威力×1.3（合計299%）" },
                new BoostUpgrade { PowerMult = 1.60f, ApplyStatusChanceBonus = 0.20f,
                    FlavorText = "罠威力×1.6 / スタン確率+20%（合計70%）" },
                new BoostUpgrade { PowerMult = 2.00f, ApplyStatusChanceBonus = 0.30f,
                    GrantShadowState = true,
                    FlavorText = "罠威力×2.0（合計460%）/ スタン確率最大 / 爆発と同時にShadow State付与 / 任意手動起爆" },
            },

            // ── スモーク ───────────────────────────────────────────────────
            ["スモーク"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "デバフ+1ターン（合計3ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, ApplyKnockback = true,
                    FlavorText = "デバフ+2ターン / 全敵の速度-20%に強化" },
                new BoostUpgrade { BuffDurationBonus = 3, ApplyKnockback = true,
                    GrantShadowState = true,
                    GainBPOnUse = 1,
                    FlavorText = "デバフ+3ターン / 速度ダウン最大 / Shadow State確実付与 / BP+1" },
            },

            // ── 必殺狙撃 ───────────────────────────────────────────────────
            ["必殺狙撃"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.30f,
                    ExecuteOnLowHPChance = 0.10f, ExecuteHPThreshold = 0.35f,
                    FlavorText = "威力×1.3（合計390%）/ 即死確率+10%（合計40%）" },
                new BoostUpgrade { PowerMult = 1.60f, IgnoreDefensePercent = 0.25f,
                    ExecuteOnLowHPChance = 0.15f, ExecuteHPThreshold = 0.35f,
                    FlavorText = "威力×1.6 / 防御25%無視 / 即死確率+15%（合計45%）" },
                new BoostUpgrade { PowerMult = 2.00f, IgnoreDefensePercent = 0.50f,
                    GuaranteedCrit = true,
                    ExecuteOnLowHPChance = 0.25f, ExecuteHPThreshold = 0.50f,
                    FlavorText = "威力×2.0 / 防御50%無視 / 会心確定 / HP50%以下の敵に55%即死 / Shadow中は必ず即死判定に会心が乗る" },
            },

            // ── 矢の雨 ─────────────────────────────────────────────────────
            ["矢の雨"] = new[]
            {
                new BoostUpgrade { ExtraHits = 1, PowerMult = 1.00f,
                    FlavorText = "ヒット数+1（合計4ヒット×全体）" },
                new BoostUpgrade { ExtraHits = 2, PowerMult = 1.10f,
                    FlavorText = "ヒット数+2（合計5ヒット）/ 威力×1.1" },
                new BoostUpgrade { ExtraHits = 3, PowerMult = 1.20f,
                    ApplyStatusChanceBonus = 0.50f,
                    FlavorText = "ヒット数+3（合計6ヒット）/ 威力×1.2 / 盲目付与率100%確定" },
            },

            // ── 影縫い ─────────────────────────────────────────────────────
            ["影縫い"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.30f,
                    FlavorText = "威力×1.3（合計130%）" },
                new BoostUpgrade { PowerMult = 1.60f, BindDurationBonus = 1,
                    FlavorText = "威力×1.6 / バインド+1ターン（合計2ターン行動不能）" },
                new BoostUpgrade { PowerMult = 2.00f, BindDurationBonus = 2,
                    IgnoreDefensePercent = 0.30f,
                    FlavorText = "威力×2.0 / バインド+2ターン（合計3ターン） / 防御30%無視 / 縛り中のスキルダメ+30%に強化" },
            },

            // ── 死の踊り ───────────────────────────────────────────────────
            // 会心コンボとBoostが相乗効果を生む最終奥義。
            // ×3で全ヒット会心確定 → 最大10ヒット全会心 → 追加スタックが全部乗る。
            ["死の踊り"] = new[]
            {
                new BoostUpgrade { ExtraHits = 1, PowerMult = 1.10f,
                    FlavorText = "ヒット数+1（6連打、最大12ヒット）/ 威力×1.1" },
                new BoostUpgrade { ExtraHits = 2, PowerMult = 1.20f, GainBPOnUse = 1,
                    FlavorText = "ヒット数+2（7連打、最大14ヒット）/ 威力×1.2 / BP+1" },
                new BoostUpgrade { ExtraHits = 3, PowerMult = 1.30f, GainBPOnUse = 2,
                    GuaranteedCrit = true,
                    FlavorText = "ヒット数+3（8連打、最大16ヒット）/ 会心確定 / BP+2 / 全ヒットが追加ヒットを誘発（最大の火力爆発）" },
            },
        };
    }

    // ── Shadow State連動ダメージ計算 ──────────────────────────────────────
    /// <summary>
    /// アッシュ専用の「Shadow State中の武器ダメージ補正」計算クラス。
    /// スキルによってShadow Stateボーナスが異なるケース（影矢/影矢＋）で使用する。
    /// 通常は Trait_ShadowDance.ShadowDamageBonus(0.30f) が適用されるが、
    /// 特定スキルの強化版はさらに高いボーナスを適用する。
    /// </summary>
    public static class ShadowStateCalculator
    {
        // 基本Shadow Stateボーナス（Trait側と同値）
        public const float BaseBonus       = 0.30f;
        // 影矢＋ 専用ボーナス
        public const float ShadowArrowPlusBonus = 0.55f;

        /// <summary>
        /// 死の踊りで会心チェーンが最大まで積んだ場合の総ダメージ倍率を試算する。
        /// BoostLevel と 会心コンボスタック数を渡す。
        /// </summary>
        public static float EstimateDanceOfDeathPeak(int boostLevel, int critComboStacks)
        {
            int baseHits    = 5 + boostLevel;           // Boost×0〜×3: 5〜8連打
            float extraMult = 2.5f;                     // 固有トレイトで×2.5（会心時×2.0含む）
            float comboBonus= 1f + critComboStacks * 0.10f;  // 最大+30%

            float powerMult  = boostLevel > 0 ? 1f + boostLevel * 0.10f : 1f;
            float basePower  = 1.10f * powerMult;

            // 全ヒット会心確定（Boost×3）での理論最大値
            float totalMult  = extraMult * comboBonus;
            return baseHits * basePower * totalMult;
        }
    }
}
