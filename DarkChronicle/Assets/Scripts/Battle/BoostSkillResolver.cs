using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// Boost時の各スキル追加効果を定義する。
    /// BattleManager.ExecuteSkill から呼ばれ、BoostLevelに応じた
    /// 強化内容をBattleActionModifierとして返す。
    /// </summary>
    public static class BoostSkillResolver
    {
        // ── Boost強化テーブル ──────────────────────────────────────────────
        // スキル名 → Boost強化定義
        // Boost×1 / ×2 / ×3 の順で配列に格納

        static readonly Dictionary<string, BoostUpgrade[]> BoostTable = new()
        {
            // ── 二段斬り ──────────────────────────────────────────────────
            ["二段斬り"] = new[]
            {
                new BoostUpgrade { ExtraHits = 1, PowerMult = 1.0f,
                    FlavorText = "ヒット数+1" },
                new BoostUpgrade { ExtraHits = 2, PowerMult = 1.0f,
                    FlavorText = "ヒット数+2" },
                new BoostUpgrade { ExtraHits = 3, PowerMult = 1.2f,
                    FlavorText = "ヒット数+3 / 威力×1.2 / 最終ヒットが会心確定" ,
                    LastHitGuaranteedCrit = true },
            },

            // ── 盾砕き ────────────────────────────────────────────────────
            ["盾砕き"] = new[]
            {
                new BoostUpgrade { ExtraShieldDamage = 1,
                    FlavorText = "シールドダメージ+1" },
                new BoostUpgrade { ExtraShieldDamage = 2, PowerMult = 1.3f,
                    FlavorText = "シールドダメージ+2 / 威力×1.3" },
                new BoostUpgrade { ExtraShieldDamage = 3, PowerMult = 1.5f,
                    ForceBreakIfShielded = true,
                    FlavorText = "シールドダメージ+3 / 威力×1.5 / 残シールドを無視してBreak" },
            },

            // ── 雄叫び ────────────────────────────────────────────────────
            ["雄叫び"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "バフ持続+1ターン" },
                new BoostUpgrade { BuffDurationBonus = 2, SelfBuffIncluded = true,
                    FlavorText = "バフ持続+2ターン / 自分にも同じバフ" },
                new BoostUpgrade { BuffDurationBonus = 2, SelfBuffIncluded = true,
                    AlsoBuffMagicAtk = true, HealPartyHPPercent = 0.05f,
                    FlavorText = "物理+魔法バフ / 自分含む / HP5%回復 / +2ターン" },
            },

            // ── 強撃 ──────────────────────────────────────────────────────
            ["強撃"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.5f, CritRateBonus = 10,
                    FlavorText = "威力×1.5 / 会心+10%" },
                new BoostUpgrade { PowerMult = 2.0f, CritRateBonus = 20,
                    FlavorText = "威力×2.0 / 会心+20%" },
                new BoostUpgrade { PowerMult = 2.5f, CritRateBonus = 30,
                    GuaranteedCrit = true, IgnoreDefensePercent = 0.5f,
                    FlavorText = "威力×2.5 / 会心確定 / 防御を50%無視" },
            },

            // ── 旋風斬 ────────────────────────────────────────────────────
            ["旋風斬"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.3f,
                    FlavorText = "威力×1.3" },
                new BoostUpgrade { PowerMult = 1.6f, ExtraShieldDamage = 1,
                    FlavorText = "威力×1.6 / 全敵シールド+1削る" },
                new BoostUpgrade { PowerMult = 2.0f, ExtraShieldDamage = 2,
                    ApplyKnockback = true,
                    FlavorText = "威力×2.0 / シールド+2 / 全敵の速度-1ターン" },
            },

            // ── 百烈斬 ────────────────────────────────────────────────────
            ["百烈斬"] = new[]
            {
                new BoostUpgrade { ExtraHits = 2,
                    FlavorText = "ヒット数+2" },
                new BoostUpgrade { ExtraHits = 4, PowerMult = 1.2f,
                    FlavorText = "ヒット数+4 / 威力×1.2" },
                new BoostUpgrade { ExtraHits = 5, PowerMult = 1.3f,
                    HitsAllEnemies = true,
                    FlavorText = "ヒット数+5 / 全体化 / 各ヒットがBreakに有効" },
            },

            // ── 炎の刃 ────────────────────────────────────────────────────
            ["炎の刃"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.4f, ApplyStatusDurationBonus = 1,
                    FlavorText = "威力×1.4 / 炎付与+1ターン" },
                new BoostUpgrade { PowerMult = 1.8f, ApplyStatusDurationBonus = 2,
                    BurnChanceBonus = 0.20f,
                    FlavorText = "威力×1.8 / 炎付与+2ターン / 炎上確率+20%" },
                new BoostUpgrade { PowerMult = 2.2f, ApplyStatusDurationBonus = 3,
                    BurnChanceBonus = 0.40f, SplashToAdjacent = true,
                    FlavorText = "威力×2.2 / 炎上確率+40% / 隣接2体にも炎属性スプラッシュ" },
            },

            // ── 雷迸り ────────────────────────────────────────────────────
            ["雷迸り"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.3f, ApplyStatusChanceBonus = 0.15f,
                    FlavorText = "威力×1.3 / 麻痺確率+15%" },
                new BoostUpgrade { PowerMult = 1.6f, ApplyStatusChanceBonus = 0.25f,
                    GainBPOnUse = 1,
                    FlavorText = "威力×1.6 / 麻痺確率+25% / BP+1" },
                new BoostUpgrade { PowerMult = 2.0f, ApplyStatusChanceBonus = 0.35f,
                    GainBPOnUse = 2, ParalyzeAlreadyParalyzedStun = true,
                    FlavorText = "威力×2.0 / 麻痺確率最大化 / BP+2 / 麻痺中の敵は完全スタン" },
            },

            // ── 覇剣 ─────────────────────────────────────────────────────
            ["覇剣"] = new[]
            {
                new BoostUpgrade { PowerMult = 1.5f,
                    FlavorText = "威力×1.5" },
                new BoostUpgrade { PowerMult = 2.0f, IgnoreDefensePercent = 0.3f,
                    FlavorText = "威力×2.0 / 防御を30%無視" },
                new BoostUpgrade { PowerMult = 2.5f, IgnoreDefensePercent = 1.0f,
                    InstantKillOnBrokenChance = 0.10f,
                    FlavorText = "威力×2.5 / 防御完全無視 / Break中の敵に10%で即死" },
            },

            // ── 大地の盾 ─────────────────────────────────────────────────
            ["大地の盾"] = new[]
            {
                new BoostUpgrade { HealPartyHPPercent = 0.05f, BuffDurationBonus = 1,
                    FlavorText = "回復+5% / バフ+1ターン" },
                new BoostUpgrade { HealPartyHPPercent = 0.10f, BuffDurationBonus = 2,
                    AlsoBuffPhysicalDef = true,
                    FlavorText = "回復+10% / バフ+2ターン / 物理防御も上昇" },
                new BoostUpgrade { HealPartyHPPercent = 0.15f, BuffDurationBonus = 3,
                    AlsoBuffPhysicalDef = true, GrantRegenStatus = true,
                    FlavorText = "回復+15% / 全防御UP / +3ターン / リジェネ付与" },
            },
        };

        // ── API ────────────────────────────────────────────────────────────
        public static BoostUpgrade GetUpgrade(SkillData skill, int boostLevel)
        {
            if (boostLevel <= 0) return BoostUpgrade.None;
            if (!BoostTable.TryGetValue(skill.SkillName, out var upgrades))
                return BoostUpgrade.Default(boostLevel);

            int idx = Mathf.Clamp(boostLevel - 1, 0, upgrades.Length - 1);
            return upgrades[idx];
        }

        public static string GetBoostPreviewText(SkillData skill, int boostLevel)
        {
            var u = GetUpgrade(skill, boostLevel);
            return u.FlavorText ?? string.Empty;
        }
    }

    // ── Boost強化内容 ─────────────────────────────────────────────────────
    public class BoostUpgrade
    {
        public string FlavorText;

        // 威力・ヒット
        public float PowerMult              = 1f;
        public int   ExtraHits              = 0;

        // Break
        public int   ExtraShieldDamage      = 0;
        public bool  ForceBreakIfShielded   = false;

        // 会心
        public int   CritRateBonus          = 0;
        public bool  GuaranteedCrit         = false;
        public bool  LastHitGuaranteedCrit  = false;

        // 防御無視
        public float IgnoreDefensePercent   = 0f;

        // バフ
        public int   BuffDurationBonus      = 0;
        public bool  SelfBuffIncluded       = false;
        public bool  AlsoBuffMagicAtk       = false;
        public bool  AlsoBuffPhysicalDef    = false;
        public float HealPartyHPPercent     = 0f;

        // 状態異常
        public float ApplyStatusChanceBonus   = 0f;
        public int   ApplyStatusDurationBonus = 0;
        public float BurnChanceBonus          = 0f;
        public bool  ParalyzeAlreadyParalyzedStun = false;
        public bool  GrantRegenStatus         = false;
        public bool  ApplyKnockback           = false;

        // 特殊
        public bool  HitsAllEnemies           = false;
        public bool  SplashToAdjacent         = false;
        public int   GainBPOnUse              = 0;
        public float InstantKillOnBrokenChance = 0f;

        // ── ファクトリ ─────────────────────────────────────────────────────
        public static readonly BoostUpgrade None = new();

        public static BoostUpgrade Default(int level) => new()
        {
            PowerMult  = 1f + level * 0.5f,
            FlavorText = $"威力×{1f + level * 0.5f:F1}",
        };
    }
}
