using System.Collections.Generic;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// ゼノのスキル Boost 強化テーブル。
    ///
    /// デバッファーとして「デバフをより広く」「より強く」「より長く」という方向性と、
    /// 吸収スキルの「より確実に」「より即効性を高く」という方向性が軸。
    /// Boost×3 では多くのスキルが全体化するか、or 極端な効果を得る。
    /// </summary>
    public static class BoostSkillResolver_Zeno
    {
        public static readonly Dictionary<string, BoostUpgrade[]> ZenoBoostTable = new()
        {
            // ── 呪縛 ───────────────────────────────────────────────────────
            ["呪縛"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "速度デバフ+1ターン（合計3ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, HitsAllEnemies = true,
                    FlavorText = "全体化 / デバフ+2ターン（合計4ターン）" },
                new BoostUpgrade { BuffDurationBonus = 3, HitsAllEnemies = true,
                    BindDurationBonus = 1,
                    FlavorText = "全体化 / 速度-60%（デバフ増幅）/ デバフ+3ターン / 次ターン全敵行動不能" },
            },

            // ── 毒霧 ───────────────────────────────────────────────────────
            ["毒霧"] = new[]
            {
                new BoostUpgrade { ApplyStatusDurationBonus = 2,
                    FlavorText = "毒持続+2ターン（合計5ターン）" },
                new BoostUpgrade { ApplyStatusDurationBonus = 3, ApplyStatusChanceBonus = 0.10f,
                    FlavorText = "毒持続+3ターン / 付与確率+10%（合計90%）" },
                new BoostUpgrade { ApplyStatusDurationBonus = 4, ApplyStatusChanceBonus = 0.20f,
                    CurseChainAll = true,
                    FlavorText = "毒持続+4ターン（合計7ターン）/ 付与確率+20% / 毒中の敵がダメージを受けると他の毒中の敵にも50%伝播" },
            },

            // ── 恐怖の叫び ─────────────────────────────────────────────────
            ["恐怖の叫び"] = new[]
            {
                new BoostUpgrade { ApplyStatusDurationBonus = 1, DebuffAmplifyPercent = 0.10f,
                    FlavorText = "恐怖+1ターン / 物理攻撃デバフ-10%増幅（合計-40%）" },
                new BoostUpgrade { ApplyStatusDurationBonus = 2, DebuffAmplifyPercent = 0.20f,
                    HitsAllEnemies = true,
                    FlavorText = "全体化 / 恐怖+2ターン / デバフ-50%に増幅" },
                new BoostUpgrade { ApplyStatusDurationBonus = 3, DebuffAmplifyPercent = 0.30f,
                    HitsAllEnemies = true, ParalyzeAlreadyParalyzedStun = true,
                    FlavorText = "全体化 / 恐怖+3ターン / デバフ-60% / 魔法攻撃も封じる / 恐怖+沈黙の敵は完全行動不能" },
            },

            // ── 呪いの眼差し ───────────────────────────────────────────────
            ["呪いの眼差し"] = new[]
            {
                new BoostUpgrade { DebuffAmplifyPercent = 0.05f, BuffDurationBonus = 1,
                    FlavorText = "全ステータスデバフ-25%に増幅 / 持続+1ターン（合計4ターン）" },
                new BoostUpgrade { DebuffAmplifyPercent = 0.10f, BuffDurationBonus = 2,
                    FlavorText = "全ステータスデバフ-30% / 持続+2ターン（合計5ターン）" },
                new BoostUpgrade { DebuffAmplifyPercent = 0.15f, BuffDurationBonus = 3,
                    HitsAllEnemies = true,
                    FlavorText = "全体化 / 全ステータスデバフ-35% / 持続+3ターン（合計6ターン）/ バフ付与も封じる" },
            },

            // ── 吸収 ───────────────────────────────────────────────────────
            // Boostで「今すぐ吸収したい」確率を上げる方向性。
            // ×3は吸収後に即座にその技が使えるという即効性を付与。
            ["吸収"] = new[]
            {
                new BoostUpgrade { AbsorbChanceBonus = 0.15f,
                    FlavorText = "吸収確率+15%（合計最大90%）" },
                new BoostUpgrade { AbsorbChanceBonus = 0.25f,
                    FlavorText = "吸収確率+25% / HP消費-50%（術者消費: MaxHPの7.5%）" },
                new BoostUpgrade { AbsorbChanceBonus = 0.35f, GainBPOnUse = 1,
                    FlavorText = "吸収確率+35% / HP消費なし / 吸収成功時BP+1 / 失敗しても次の吸収確率が残る" },
            },

            // ── 魂縛 ───────────────────────────────────────────────────────
            ["魂縛"] = new[]
            {
                new BoostUpgrade { BindDurationBonus = 1,
                    FlavorText = "行動不能+1ターン（合計2ターン）" },
                new BoostUpgrade { BindDurationBonus = 2, HitsAllEnemies = true,
                    FlavorText = "全体化 / 行動不能+2ターン（合計3ターン）" },
                new BoostUpgrade { BindDurationBonus = 3, HitsAllEnemies = true,
                    CurseChainAll = true,
                    FlavorText = "全体化 / 行動不能+3ターン / 束縛中の敵が行動不能解除時に隣の敵にも1ターン伝播" },
            },

            // ── 呪詛の霧 ───────────────────────────────────────────────────
            ["呪詛の霧"] = new[]
            {
                new BoostUpgrade { ApplyStatusChanceBonus = 0.20f, BuffDurationBonus = 1,
                    FlavorText = "状態異常付与確率+20%（合計60%）/ デバフ+1ターン（合計3ターン）" },
                new BoostUpgrade { ApplyStatusChanceBonus = 0.30f, BuffDurationBonus = 2,
                    DebuffAmplifyPercent = 0.10f,
                    FlavorText = "付与確率+30%（合計70%）/ デバフ+2ターン / デバフ量増幅+10%" },
                new BoostUpgrade { ApplyStatusChanceBonus = 0.40f, BuffDurationBonus = 3,
                    DebuffAmplifyPercent = 0.20f,
                    FlavorText = "ランダムデバフが3種に増加 / 付与確率80% / 持続+3ターン / デバフ増幅+20% / 完全に混沌" },
            },

            // ── 因果の鎖 ───────────────────────────────────────────────────
            // 全体攻撃と組み合わせるとBoost無しでも爆発的な火力が出るが、
            // Boostかけると連鎖率が上がってさらに凄いことになる。
            ["因果の鎖"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "鎖持続+1ターン（合計3ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, DebuffAmplifyPercent = 0.20f,
                    FlavorText = "持続+2ターン（合計4ターン）/ 連鎖ダメージ+20%増幅（合計70%）" },
                new BoostUpgrade { BuffDurationBonus = 3, DebuffAmplifyPercent = 0.50f,
                    HitsAllEnemies = true,
                    FlavorText = "持続+3ターン（合計5ターン）/ 全敵連結に拡張 / 連鎖ダメージ最大（一体への攻撃が全体に100%伝播）" },
            },

            // ── 魂喰い ─────────────────────────────────────────────────────
            ["魂喰い"] = new[]
            {
                new BoostUpgrade { AbsorbChanceBonus = 0.15f,
                    FlavorText = "吸収確率+15%（エリートにも適用）" },
                new BoostUpgrade { AbsorbChanceBonus = 0.30f, GainBPOnUse = 1,
                    FlavorText = "吸収確率+30% / 成功時BP+1" },
                new BoostUpgrade { AbsorbChanceBonus = 0.50f, GainBPOnUse = 2,
                    FlavorText = "吸収確率+50% / エリートにも80%の確率で吸収 / 成功時BP+2 / 2スロット同時取得" },
            },

            // ── 死の宣告 ───────────────────────────────────────────────────
            // ×3の「即時発動」は究極の除去手段だが、ボス戦では発動タイミングが重要。
            ["死の宣告"] = new[]
            {
                new BoostUpgrade { DelayReductionTurns = 1,
                    FlavorText = "発動-1ターン（合計2ターン後発動）" },
                new BoostUpgrade { DelayReductionTurns = 2, DebuffAmplifyPercent = 0.20f,
                    FlavorText = "発動-2ターン（合計1ターン後発動）/ ボスへのダメージ+20%増幅" },
                new BoostUpgrade { DelayReductionTurns = 3,
                    FlavorText = "即時発動（次のターン開始時ではなく今すぐ）/ ボスには現在HPの100%追加ダメージ" },
            },

            // ── 混沌の呪い ─────────────────────────────────────────────────
            ["混沌の呪い"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1, DebuffAmplifyPercent = 0.05f,
                    FlavorText = "全デバフ持続+1ターン（合計4ターン）/ 効果量+5%" },
                new BoostUpgrade { BuffDurationBonus = 2, DebuffAmplifyPercent = 0.10f,
                    ApplyStatusChanceBonus = 0.10f,
                    FlavorText = "持続+2ターン（合計5ターン）/ 効果量+10% / 状態異常付与率+10%" },
                new BoostUpgrade { BuffDurationBonus = 3, DebuffAmplifyPercent = 0.20f,
                    ApplyStatusChanceBonus = 0.20f, CurseChainAll = true,
                    FlavorText = "持続+3ターン（合計6ターン）/ 効果量+20% / デバフが呪詛の霧とも重複 / デバフ中の敵へのダメージ+20%さらにボーナス" },
            },

            // ── 冥界の扉 ───────────────────────────────────────────────────
            ["冥界の扉"] = new[]
            {
                new BoostUpgrade { AbsorbChanceBonus = 0.10f, BuffDurationBonus = 1,
                    FlavorText = "エリート吸収確率+10%（合計70%）/ フィールドデバフ延長+1（合計+2T）" },
                new BoostUpgrade { AbsorbChanceBonus = 0.20f, BuffDurationBonus = 2,
                    GainBPOnUse = 1,
                    FlavorText = "エリート吸収確率+20%（合計80%）/ デバフ延長+2（合計+3T）/ BP+1" },
                new BoostUpgrade { AbsorbChanceBonus = 0.40f, BuffDurationBonus = 3,
                    GainBPOnUse = 2, CurseChainAll = true,
                    FlavorText = "エリート吸収確率100% / デバフ延長+3（合計+4T）/ BP+2 / 吸収した技を即2回使用 / 全デバフが全敵に波及" },
            },
        };
    }

    // ── デバフ計算ヘルパー ────────────────────────────────────────────────
    /// <summary>
    /// ゼノの呪術デバフ計算。
    /// Trait_CurseAmplifier / Trait_DarkWill / Boost の三段階を統合する。
    /// </summary>
    public static class ZenoDebuffCalculator
    {
        /// <summary>
        /// 最終的なデバフ量を計算する。
        ///   baseDebuff: スキル本来のデバフ値（例: 0.20 = 20%低下）
        ///   traitAmplify: Trait_CurseAmplifier のボーナス（常時）
        ///   darkWillAmplify: Trait_DarkWill のボーナス（HP低下時）
        ///   boostAmplify: BoostUpgrade.DebuffAmplifyPercent
        /// </summary>
        public static float FinalDebuffAmount(float baseDebuff, float traitAmplify,
                                               float darkWillAmplify, float boostAmplify)
        {
            float total = baseDebuff + boostAmplify;
            float mult  = 1f + traitAmplify + darkWillAmplify;
            return UnityEngine.Mathf.Min(total * mult, 0.90f);  // 上限90%（完全無力化防止）
        }

        /// <summary>
        /// 死の宣告の発動ターン数（Boost短縮適用後）
        /// </summary>
        public static int GetDeathSentenceTurns(int baseTurns, int boostReduction)
            => UnityEngine.Mathf.Max(1, baseTurns - boostReduction);
    }
}
