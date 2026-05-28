#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 3「古代遺跡の回廊」エリート敵 4体 の ScriptableObject を自動生成するツール。
    ///   Elite A: 覚醒の石兵 グロム              (ソロ / カウントダウン+HP回復)
    ///   Elite B: 古代祭司 ファルン ＋ 封印の守護剣士 (グループ / デバフ無効)
    ///   Elite C: 深淵の先触れ ヴォルガ            (ソロ / フェーズ変化+デバフ無効+カウントダウン)
    /// Menu: DarkChronicle → Generate → Floor3 Elite Assets
    /// </summary>
    public static class Floor3EliteSOGenerator
    {
        const string BaseDir  = "Assets/Data/Enemies/Floor3/Elites";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor3 Elite Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            GenerateGrom();
            GenerateFarun();
            GenerateSealGuardian();
            GenerateVorga();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor3EliteSOGenerator] All Floor 3 elite assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor3",
                BaseDir,
                SkillDir,
            };
            foreach (var dir in dirs)
                if (!AssetDatabase.IsValidFolder(dir))
                {
                    var parts  = dir.Split('/');
                    string parent = string.Join("/", parts[..^1]);
                    AssetDatabase.CreateFolder(parent, parts[^1]);
                }
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite A: 覚醒の石兵 グロム
        // ══════════════════════════════════════════════════════════════════
        static void GenerateGrom()
        {
            var boulderSmash = CreatePhysSkill("SKL_F3E_BoulderSmash",
                GromDesign.Action_BoulderSmash.Name,
                GromDesign.Action_BoulderSmash.Desc,
                GromDesign.Action_BoulderSmash.Power, hits: 1, hitsAll: false);

            var sealCrush = CreatePhysSkill("SKL_F3E_SealCrush",
                GromDesign.Action_SealCrush.Name,
                GromDesign.Action_SealCrush.Desc,
                GromDesign.Action_SealCrush.Power, hits: 1, hitsAll: true);

            var ancientRegen = CreateHealSkill("SKL_F3E_AncientRegen",
                GromDesign.Action_AncientRegen.Name,
                GromDesign.Action_AncientRegen.Desc,
                GromDesign.Action_AncientRegen.HealAmount);

            var runeShield = CreateSupportSkill("SKL_F3E_RuneShield",
                GromDesign.Action_RuneShield.Name,
                GromDesign.Action_RuneShield.Desc);

            var sealCollapse = CreateTrueDmgSkill("SKL_F3E_SealCollapse",
                GromDesign.Action_SealCollapse.Name,
                GromDesign.Action_SealCollapse.Desc,
                GromDesign.Action_SealCollapse.Power);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Grom.asset");
            enemy.EnemyName  = GromDesign.EnemyName;
            enemy.Lore       = GromDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = GromDesign.MaxHP,
                PhysicalAttack  = GromDesign.PhysicalAttack,
                MagicAttack     = GromDesign.MagicAttack,
                PhysicalDefense = GromDesign.PhysicalDefense,
                MagicDefense    = GromDesign.MagicDefense,
                Speed           = GromDesign.Speed,
            };
            enemy.ShieldPoints = GromDesign.ShieldPoints;
            enemy.ExpReward    = GromDesign.ExpReward;
            enemy.JPReward     = GromDesign.JPReward;
            enemy.GoldReward   = GromDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Lightning,
                ElementType.Fire,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };
            enemy.IsUndead = GromDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = boulderSmash.SkillName,
                    Skill           = boulderSmash,
                    Priority        = GromDesign.Action_BoulderSmash.Priority,
                    UseChance       = GromDesign.Action_BoulderSmash.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = sealCrush.SkillName,
                    Skill           = sealCrush,
                    Priority        = GromDesign.Action_SealCrush.Priority,
                    UseChance       = GromDesign.Action_SealCrush.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = ancientRegen.SkillName,
                    Skill           = ancientRegen,
                    Priority        = GromDesign.Action_AncientRegen.Priority,
                    UseChance       = GromDesign.Action_AncientRegen.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = runeShield.SkillName,
                    Skill           = runeShield,
                    Priority        = GromDesign.Action_RuneShield.Priority,
                    UseChance       = GromDesign.Action_RuneShield.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = sealCollapse.SkillName,
                    Skill           = sealCollapse,
                    Priority        = GromDesign.Action_SealCollapse.Priority,
                    UseChance       = GromDesign.Action_SealCollapse.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-1: 古代祭司 ファルン
        // ══════════════════════════════════════════════════════════════════
        static void GenerateFarun()
        {
            var sealRadiance = CreateMagicSkill("SKL_F3E_SealRadiance",
                FarunDesign.Action_SealRadiance.Name,
                FarunDesign.Action_SealRadiance.Desc,
                ElementType.Light,
                FarunDesign.Action_SealRadiance.Power, hits: 1, hitsAll: false);

            var ancientBind = CreateStatusSkill("SKL_F3E_AncientBind",
                FarunDesign.Action_AncientBind.Name,
                FarunDesign.Action_AncientBind.Desc,
                FarunDesign.Action_AncientBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var sealRelease = CreateSupportSkill("SKL_F3E_SealRelease",
                FarunDesign.Action_SealRelease.Name,
                FarunDesign.Action_SealRelease.Desc);

            var runeBoost = CreateSupportSkill("SKL_F3E_RuneBoost",
                FarunDesign.Action_RuneBoost.Name,
                FarunDesign.Action_RuneBoost.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Farun.asset");
            enemy.EnemyName  = FarunDesign.EnemyName;
            enemy.Lore       = FarunDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = FarunDesign.MaxHP,
                PhysicalAttack  = FarunDesign.PhysicalAttack,
                MagicAttack     = FarunDesign.MagicAttack,
                PhysicalDefense = FarunDesign.PhysicalDefense,
                MagicDefense    = FarunDesign.MagicDefense,
                Speed           = FarunDesign.Speed,
            };
            enemy.ShieldPoints = FarunDesign.ShieldPoints;
            enemy.ExpReward    = FarunDesign.ExpReward;
            enemy.JPReward     = FarunDesign.JPReward;
            enemy.GoldReward   = FarunDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Wind,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Tome,
            };
            enemy.IsUndead = FarunDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = sealRadiance.SkillName,
                    Skill           = sealRadiance,
                    Priority        = FarunDesign.Action_SealRadiance.Priority,
                    UseChance       = FarunDesign.Action_SealRadiance.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = FarunDesign.Action_SealRadiance.IsAbsorbable,
                },
                new() {
                    ActionName      = ancientBind.SkillName,
                    Skill           = ancientBind,
                    Priority        = FarunDesign.Action_AncientBind.Priority,
                    UseChance       = FarunDesign.Action_AncientBind.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = FarunDesign.Action_AncientBind.IsAbsorbable,
                },
                new() {
                    ActionName      = sealRelease.SkillName,
                    Skill           = sealRelease,
                    Priority        = FarunDesign.Action_SealRelease.Priority,
                    UseChance       = FarunDesign.Action_SealRelease.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = runeBoost.SkillName,
                    Skill           = runeBoost,
                    Priority        = FarunDesign.Action_RuneBoost.Priority,
                    UseChance       = FarunDesign.Action_RuneBoost.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-2: 封印の守護剣士
        // ══════════════════════════════════════════════════════════════════
        static void GenerateSealGuardian()
        {
            var sealSword = CreatePhysSkill("SKL_F3E_SealSword",
                SealGuardianDesign.Action_SealSword.Name,
                SealGuardianDesign.Action_SealSword.Desc,
                SealGuardianDesign.Action_SealSword.Power, hits: 1, hitsAll: false);

            var ancientCharge = CreatePhysSkill("SKL_F3E_AncientCharge",
                SealGuardianDesign.Action_AncientCharge.Name,
                SealGuardianDesign.Action_AncientCharge.Desc,
                SealGuardianDesign.Action_AncientCharge.Power, hits: 1, hitsAll: false);

            var runeSlash = CreatePhysSkill("SKL_F3E_RuneSlash",
                SealGuardianDesign.Action_RuneSlash.Name,
                SealGuardianDesign.Action_RuneSlash.Desc,
                SealGuardianDesign.Action_RuneSlash.Power, hits: 1, hitsAll: true);

            var sealBarrier = CreateSupportSkill("SKL_F3E_SealBarrier",
                SealGuardianDesign.Action_SealBarrier.Name,
                SealGuardianDesign.Action_SealBarrier.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_SealGuardian.asset");
            enemy.EnemyName  = SealGuardianDesign.EnemyName;
            enemy.Lore       = SealGuardianDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = SealGuardianDesign.MaxHP,
                PhysicalAttack  = SealGuardianDesign.PhysicalAttack,
                MagicAttack     = SealGuardianDesign.MagicAttack,
                PhysicalDefense = SealGuardianDesign.PhysicalDefense,
                MagicDefense    = SealGuardianDesign.MagicDefense,
                Speed           = SealGuardianDesign.Speed,
            };
            enemy.ShieldPoints = SealGuardianDesign.ShieldPoints;
            enemy.ExpReward    = SealGuardianDesign.ExpReward;
            enemy.JPReward     = SealGuardianDesign.JPReward;
            enemy.GoldReward   = SealGuardianDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Lightning,
                ElementType.Fire,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Spear,
            };
            enemy.IsUndead = SealGuardianDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = sealSword.SkillName,
                    Skill           = sealSword,
                    Priority        = SealGuardianDesign.Action_SealSword.Priority,
                    UseChance       = SealGuardianDesign.Action_SealSword.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = ancientCharge.SkillName,
                    Skill           = ancientCharge,
                    Priority        = SealGuardianDesign.Action_AncientCharge.Priority,
                    UseChance       = SealGuardianDesign.Action_AncientCharge.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = runeSlash.SkillName,
                    Skill           = runeSlash,
                    Priority        = SealGuardianDesign.Action_RuneSlash.Priority,
                    UseChance       = SealGuardianDesign.Action_RuneSlash.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = sealBarrier.SkillName,
                    Skill           = sealBarrier,
                    Priority        = SealGuardianDesign.Action_SealBarrier.Priority,
                    UseChance       = SealGuardianDesign.Action_SealBarrier.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite C: 深淵の先触れ ヴォルガ
        // ══════════════════════════════════════════════════════════════════
        static void GenerateVorga()
        {
            // ── Phase 1 Skills ──────────────────────────────────────────
            var abyssTentacle = CreateMagicSkill("SKL_F3E_AbyssTentacle",
                VorgaDesign.Action_AbyssTentacle.Name,
                VorgaDesign.Action_AbyssTentacle.Desc,
                ElementType.Dark,
                VorgaDesign.Action_AbyssTentacle.Power, hits: 1, hitsAll: false);

            var sealShackle = CreateStatusSkill("SKL_F3E_SealShackle",
                VorgaDesign.Action_SealShackle.Name,
                VorgaDesign.Action_SealShackle.Desc,
                VorgaDesign.Action_SealShackle.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var abyssRegen = CreateHealSkill("SKL_F3E_AbyssRegen",
                VorgaDesign.Action_AbyssRegen.Name,
                VorgaDesign.Action_AbyssRegen.Desc,
                VorgaDesign.Action_AbyssRegen.HealAmount);

            var voidPurge = CreateSupportSkill("SKL_F3E_VoidPurge",
                VorgaDesign.Action_VoidPurge.Name,
                VorgaDesign.Action_VoidPurge.Desc);

            // ── Phase 2 Skills (HP ≤ 45%) ───────────────────────────────
            var abyssOpening = CreateMagicSkill("SKL_F3E_AbyssOpening",
                VorgaDesign.Action_AbyssOpening.Name,
                VorgaDesign.Action_AbyssOpening.Desc,
                ElementType.Dark,
                VorgaDesign.Action_AbyssOpening.Power, hits: 1, hitsAll: true);

            var voidRelease = CreateTrueDmgSkill("SKL_F3E_VoidRelease",
                VorgaDesign.Action_VoidRelease.Name,
                VorgaDesign.Action_VoidRelease.Desc,
                VorgaDesign.Action_VoidRelease.Power);

            var despairMist = CreateStatusSkill("SKL_F3E_DespairMist",
                VorgaDesign.Action_DespairMist.Name,
                VorgaDesign.Action_DespairMist.Desc,
                VorgaDesign.Action_DespairMist.StatusChance,
                StatusEffectType.Sleep, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Vorga.asset");
            enemy.EnemyName  = VorgaDesign.EnemyName;
            enemy.Lore       = VorgaDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = VorgaDesign.MaxHP,
                PhysicalAttack  = VorgaDesign.PhysicalAttack,
                MagicAttack     = VorgaDesign.MagicAttack,
                PhysicalDefense = VorgaDesign.PhysicalDefense,
                MagicDefense    = VorgaDesign.MagicDefense,
                Speed           = VorgaDesign.Speed,
            };
            enemy.ShieldPoints = VorgaDesign.ShieldPoints;
            enemy.ExpReward    = VorgaDesign.ExpReward;
            enemy.JPReward     = VorgaDesign.JPReward;
            enemy.GoldReward   = VorgaDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Light,
                ElementType.Fire,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Staff,
            };
            enemy.IsUndead = VorgaDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                // ── Phase 1（常時） ────────────────────────────────────────
                new() {
                    ActionName      = abyssTentacle.SkillName,
                    Skill           = abyssTentacle,
                    Priority        = VorgaDesign.Action_AbyssTentacle.Priority,
                    UseChance       = VorgaDesign.Action_AbyssTentacle.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = VorgaDesign.Action_AbyssTentacle.IsAbsorbable,
                },
                new() {
                    ActionName      = sealShackle.SkillName,
                    Skill           = sealShackle,
                    Priority        = VorgaDesign.Action_SealShackle.Priority,
                    UseChance       = VorgaDesign.Action_SealShackle.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = VorgaDesign.Action_SealShackle.IsAbsorbable,
                },
                new() {
                    ActionName      = abyssRegen.SkillName,
                    Skill           = abyssRegen,
                    Priority        = VorgaDesign.Action_AbyssRegen.Priority,
                    UseChance       = VorgaDesign.Action_AbyssRegen.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = voidPurge.SkillName,
                    Skill           = voidPurge,
                    Priority        = VorgaDesign.Action_VoidPurge.Priority,
                    UseChance       = VorgaDesign.Action_VoidPurge.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                // ── Phase 2（HP 45% 以下） ─────────────────────────────────
                new() {
                    ActionName      = abyssOpening.SkillName,
                    Skill           = abyssOpening,
                    Priority        = VorgaDesign.Action_AbyssOpening.Priority,
                    UseChance       = VorgaDesign.Action_AbyssOpening.UseChance,
                    HealthThreshold = VorgaDesign.Action_AbyssOpening.HealthThreshold,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = voidRelease.SkillName,
                    Skill           = voidRelease,
                    Priority        = VorgaDesign.Action_VoidRelease.Priority,
                    UseChance       = VorgaDesign.Action_VoidRelease.UseChance,
                    HealthThreshold = VorgaDesign.Action_VoidRelease.HealthThreshold,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = despairMist.SkillName,
                    Skill           = despairMist,
                    Priority        = VorgaDesign.Action_DespairMist.Priority,
                    UseChance       = VorgaDesign.Action_DespairMist.UseChance,
                    HealthThreshold = VorgaDesign.Action_DespairMist.HealthThreshold,
                    IsAbsorbable    = VorgaDesign.Action_DespairMist.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ── ファクトリ ────────────────────────────────────────────────────
        static SkillData CreatePhysSkill(string fileName, string name, string desc,
                                          float power, int hits, bool hitsAll = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.Physical;
            sk.Element        = ElementType.None;
            sk.BasePower      = power;
            sk.HitCount       = hits;
            sk.MPCost         = 0;
            sk.CanBreak       = false;
            sk.HitsAllEnemies = hitsAll;
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateMagicSkill(string fileName, string name, string desc,
                                           ElementType element, float power, int hits,
                                           bool hitsAll = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.Magical;
            sk.Element        = element;
            sk.BasePower      = power;
            sk.HitCount       = hits;
            sk.MPCost         = 0;
            sk.CanBreak       = false;
            sk.HitsAllEnemies = hitsAll;
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateTrueDmgSkill(string fileName, string name, string desc, float power)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.True;
            sk.Element        = ElementType.None;
            sk.BasePower      = power;
            sk.HitCount       = 1;
            sk.MPCost         = 0;
            sk.CanBreak       = false;
            sk.HitsAllEnemies = true;
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateStatusSkill(string fileName, string name, string desc,
                                            float statusChance, StatusEffectType effect,
                                            bool hitsAll = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.Physical;
            sk.Element        = ElementType.None;
            sk.BasePower      = 0f;
            sk.HitCount       = 1;
            sk.MPCost         = 0;
            sk.CanBreak       = false;
            sk.HitsAllEnemies = hitsAll;
            sk.StatusChance   = statusChance;
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateSupportSkill(string fileName, string name, string desc)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName   = name;
            sk.Description = desc;
            sk.DamageType  = DamageType.Physical;
            sk.Element     = ElementType.None;
            sk.BasePower   = 0f;
            sk.MPCost      = 0;
            sk.IsHeal      = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateHealSkill(string fileName, string name, string desc, int healAmount)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.Physical;
            sk.Element        = ElementType.None;
            sk.BasePower      = healAmount;
            sk.HitCount       = 1;
            sk.MPCost         = 0;
            sk.CanBreak       = false;
            sk.HitsAllEnemies = false;
            sk.IsHeal         = true;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static T CreateOrLoad<T>(string path) where T : ScriptableObject
        {
            var ex = AssetDatabase.LoadAssetAtPath<T>(path);
            if (ex != null) return ex;
            var asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }
    }
}
#endif
