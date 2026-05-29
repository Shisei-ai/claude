#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 1「暗黒の森」エリート敵 3体 の ScriptableObject を自動生成するツール。
    ///   Elite A: 影の狂猟 ラクセン          (ソロ)
    ///   Elite B: 暗森の霊媒師 ＋ 影霊       (グループ)
    ///   Elite C: 千年の根霊 ナグル           (ソロ)
    /// Menu: DarkChronicle → Generate → Floor1 Elite Assets
    /// </summary>
    public static class Floor1EliteSOGenerator
    {
        const string BaseDir  = "Assets/Data/Enemies/Floor1";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor1 Elite Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            GenerateRaxen();
            GenerateDarkForestMedium();
            GenerateShadowSpirit();
            GenerateNagul();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor1EliteSOGenerator] All Floor 1 elite assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
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
        //   Elite A: 影の狂猟 ラクセン
        // ══════════════════════════════════════════════════════════════════
        static void GenerateRaxen()
        {
            var darkClaw = CreatePhysSkill("SKL_F1E_DarkClaw",
                RaxenDesign.Action_DarkClaw.Name,
                RaxenDesign.Action_DarkClaw.Desc,
                RaxenDesign.Action_DarkClaw.Power, hits: 1, hitsAll: false);

            var tearingBite = CreatePhysSkill("SKL_F1E_TearingBite",
                RaxenDesign.Action_TearingBite.Name,
                RaxenDesign.Action_TearingBite.Desc,
                RaxenDesign.Action_TearingBite.Power, hits: 1, hitsAll: false);

            var darkHowl = CreateStatusSkill("SKL_F1E_DarkHowl",
                RaxenDesign.Action_DarkHowl.Name,
                RaxenDesign.Action_DarkHowl.Desc,
                RaxenDesign.Action_DarkHowl.StatusChance,
                StatusEffectType.Blind, hitsAll: true);

            var shadowRegen = CreateHealSkill("SKL_F1E_ShadowRegen",
                RaxenDesign.Action_ShadowRegen.Name,
                RaxenDesign.Action_ShadowRegen.Desc,
                RaxenDesign.Action_ShadowRegen.HealAmount);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Raxen.asset");
            enemy.EnemyName  = RaxenDesign.EnemyName;
            enemy.Lore       = RaxenDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = RaxenDesign.MaxHP,
                PhysicalAttack  = RaxenDesign.PhysicalAttack,
                MagicAttack     = RaxenDesign.MagicAttack,
                PhysicalDefense = RaxenDesign.PhysicalDefense,
                MagicDefense    = RaxenDesign.MagicDefense,
                Speed           = RaxenDesign.Speed,
            };
            enemy.ShieldPoints = RaxenDesign.ShieldPoints;
            enemy.ExpReward    = RaxenDesign.ExpReward;
            enemy.JPReward     = RaxenDesign.JPReward;
            enemy.GoldReward   = RaxenDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Sword,
            };
            enemy.IsUndead = RaxenDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = darkClaw.SkillName,
                    Skill           = darkClaw,
                    Priority        = RaxenDesign.Action_DarkClaw.Priority,
                    UseChance       = RaxenDesign.Action_DarkClaw.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = tearingBite.SkillName,
                    Skill           = tearingBite,
                    Priority        = RaxenDesign.Action_TearingBite.Priority,
                    UseChance       = RaxenDesign.Action_TearingBite.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = darkHowl.SkillName,
                    Skill           = darkHowl,
                    Priority        = RaxenDesign.Action_DarkHowl.Priority,
                    UseChance       = RaxenDesign.Action_DarkHowl.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = RaxenDesign.Action_DarkHowl.IsAbsorbable,
                },
                new() {
                    ActionName      = shadowRegen.SkillName,
                    Skill           = shadowRegen,
                    Priority        = RaxenDesign.Action_ShadowRegen.Priority,
                    UseChance       = RaxenDesign.Action_ShadowRegen.UseChance,
                    HealthThreshold = RaxenDesign.Action_ShadowRegen.HealthThreshold,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-1: 暗森の霊媒師
        // ══════════════════════════════════════════════════════════════════
        static void GenerateDarkForestMedium()
        {
            var shadowVortex = CreateMagicSkill("SKL_F1E_ShadowVortex",
                DarkForestMediumDesign.Action_ShadowVortex.Name,
                DarkForestMediumDesign.Action_ShadowVortex.Desc,
                ElementType.Dark,
                DarkForestMediumDesign.Action_ShadowVortex.Power, hits: 1, hitsAll: false);

            var darkWave = CreateMagicSkill("SKL_F1E_DarkWave",
                DarkForestMediumDesign.Action_DarkWave.Name,
                DarkForestMediumDesign.Action_DarkWave.Desc,
                ElementType.Dark,
                DarkForestMediumDesign.Action_DarkWave.Power, hits: 1, hitsAll: true);

            var summonSpirit = CreateSupportSkill("SKL_F1E_SummonShadowSpirit",
                DarkForestMediumDesign.Action_SummonShadowSpirit.Name,
                DarkForestMediumDesign.Action_SummonShadowSpirit.Desc);

            var cursedMist = CreateStatusSkill("SKL_F1E_CursedMist",
                DarkForestMediumDesign.Action_CursedMist.Name,
                DarkForestMediumDesign.Action_CursedMist.Desc,
                DarkForestMediumDesign.Action_CursedMist.StatusChance,
                StatusEffectType.Sleep, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_DarkForestMedium.asset");
            enemy.EnemyName  = DarkForestMediumDesign.EnemyName;
            enemy.Lore       = DarkForestMediumDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = DarkForestMediumDesign.MaxHP,
                PhysicalAttack  = DarkForestMediumDesign.PhysicalAttack,
                MagicAttack     = DarkForestMediumDesign.MagicAttack,
                PhysicalDefense = DarkForestMediumDesign.PhysicalDefense,
                MagicDefense    = DarkForestMediumDesign.MagicDefense,
                Speed           = DarkForestMediumDesign.Speed,
            };
            enemy.ShieldPoints = DarkForestMediumDesign.ShieldPoints;
            enemy.ExpReward    = DarkForestMediumDesign.ExpReward;
            enemy.JPReward     = DarkForestMediumDesign.JPReward;
            enemy.GoldReward   = DarkForestMediumDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Tome,
            };
            enemy.IsUndead = DarkForestMediumDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = shadowVortex.SkillName,
                    Skill           = shadowVortex,
                    Priority        = DarkForestMediumDesign.Action_ShadowVortex.Priority,
                    UseChance       = DarkForestMediumDesign.Action_ShadowVortex.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = DarkForestMediumDesign.Action_ShadowVortex.IsAbsorbable,
                },
                new() {
                    ActionName      = darkWave.SkillName,
                    Skill           = darkWave,
                    Priority        = DarkForestMediumDesign.Action_DarkWave.Priority,
                    UseChance       = DarkForestMediumDesign.Action_DarkWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = summonSpirit.SkillName,
                    Skill           = summonSpirit,
                    Priority        = DarkForestMediumDesign.Action_SummonShadowSpirit.Priority,
                    UseChance       = DarkForestMediumDesign.Action_SummonShadowSpirit.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = cursedMist.SkillName,
                    Skill           = cursedMist,
                    Priority        = DarkForestMediumDesign.Action_CursedMist.Priority,
                    UseChance       = DarkForestMediumDesign.Action_CursedMist.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = DarkForestMediumDesign.Action_CursedMist.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-2: 影霊
        // ══════════════════════════════════════════════════════════════════
        static void GenerateShadowSpirit()
        {
            var shadowTouch = CreateMagicSkill("SKL_F1E_ShadowTouch",
                ShadowSpiritDesign.Action_ShadowTouch.Name,
                ShadowSpiritDesign.Action_ShadowTouch.Desc,
                ElementType.Dark,
                ShadowSpiritDesign.Action_ShadowTouch.Power, hits: 1, hitsAll: false);

            var cursedTouch = CreateStatusSkill("SKL_F1E_CursedTouch",
                ShadowSpiritDesign.Action_CursedTouch.Name,
                ShadowSpiritDesign.Action_CursedTouch.Desc,
                ShadowSpiritDesign.Action_CursedTouch.StatusChance,
                StatusEffectType.Poison, hitsAll: false);

            var shadowMerge = CreateSupportSkill("SKL_F1E_ShadowMerge",
                ShadowSpiritDesign.Action_ShadowMerge.Name,
                ShadowSpiritDesign.Action_ShadowMerge.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_ShadowSpirit.asset");
            enemy.EnemyName  = ShadowSpiritDesign.EnemyName;
            enemy.Lore       = ShadowSpiritDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ShadowSpiritDesign.MaxHP,
                PhysicalAttack  = ShadowSpiritDesign.PhysicalAttack,
                MagicAttack     = ShadowSpiritDesign.MagicAttack,
                PhysicalDefense = ShadowSpiritDesign.PhysicalDefense,
                MagicDefense    = ShadowSpiritDesign.MagicDefense,
                Speed           = ShadowSpiritDesign.Speed,
            };
            enemy.ShieldPoints = ShadowSpiritDesign.ShieldPoints;
            enemy.ExpReward    = ShadowSpiritDesign.ExpReward;
            enemy.JPReward     = ShadowSpiritDesign.JPReward;
            enemy.GoldReward   = ShadowSpiritDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>();
            enemy.IsUndead = ShadowSpiritDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = shadowTouch.SkillName,
                    Skill           = shadowTouch,
                    Priority        = ShadowSpiritDesign.Action_ShadowTouch.Priority,
                    UseChance       = ShadowSpiritDesign.Action_ShadowTouch.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = cursedTouch.SkillName,
                    Skill           = cursedTouch,
                    Priority        = ShadowSpiritDesign.Action_CursedTouch.Priority,
                    UseChance       = ShadowSpiritDesign.Action_CursedTouch.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = ShadowSpiritDesign.Action_CursedTouch.IsAbsorbable,
                },
                new() {
                    ActionName      = shadowMerge.SkillName,
                    Skill           = shadowMerge,
                    Priority        = ShadowSpiritDesign.Action_ShadowMerge.Priority,
                    UseChance       = ShadowSpiritDesign.Action_ShadowMerge.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite C: 千年の根霊 ナグル
        // ══════════════════════════════════════════════════════════════════
        static void GenerateNagul()
        {
            var rootStrike = CreatePhysSkill("SKL_F1E_RootStrike",
                NagulDesign.Action_RootStrike.Name,
                NagulDesign.Action_RootStrike.Desc,
                NagulDesign.Action_RootStrike.Power, hits: 1, hitsAll: false);

            var toxicSpores = CreateStatusSkill("SKL_F1E_ToxicSpores",
                NagulDesign.Action_ToxicSpores.Name,
                NagulDesign.Action_ToxicSpores.Desc,
                NagulDesign.Action_ToxicSpores.StatusChance,
                StatusEffectType.Poison, hitsAll: true);

            var rootRegen = CreateHealSkill("SKL_F1E_RootRegen",
                NagulDesign.Action_RootRegen.Name,
                NagulDesign.Action_RootRegen.Desc,
                NagulDesign.Action_RootRegen.HealAmount);

            var vineBind = CreateStatusSkill("SKL_F1E_VineBind",
                NagulDesign.Action_VineBind.Name,
                NagulDesign.Action_VineBind.Desc,
                NagulDesign.Action_VineBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Nagul.asset");
            enemy.EnemyName  = NagulDesign.EnemyName;
            enemy.Lore       = NagulDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = NagulDesign.MaxHP,
                PhysicalAttack  = NagulDesign.PhysicalAttack,
                MagicAttack     = NagulDesign.MagicAttack,
                PhysicalDefense = NagulDesign.PhysicalDefense,
                MagicDefense    = NagulDesign.MagicDefense,
                Speed           = NagulDesign.Speed,
            };
            enemy.ShieldPoints = NagulDesign.ShieldPoints;
            enemy.ExpReward    = NagulDesign.ExpReward;
            enemy.JPReward     = NagulDesign.JPReward;
            enemy.GoldReward   = NagulDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };
            enemy.IsUndead = NagulDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = rootStrike.SkillName,
                    Skill           = rootStrike,
                    Priority        = NagulDesign.Action_RootStrike.Priority,
                    UseChance       = NagulDesign.Action_RootStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = toxicSpores.SkillName,
                    Skill           = toxicSpores,
                    Priority        = NagulDesign.Action_ToxicSpores.Priority,
                    UseChance       = NagulDesign.Action_ToxicSpores.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = rootRegen.SkillName,
                    Skill           = rootRegen,
                    Priority        = NagulDesign.Action_RootRegen.Priority,
                    UseChance       = NagulDesign.Action_RootRegen.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = vineBind.SkillName,
                    Skill           = vineBind,
                    Priority        = NagulDesign.Action_VineBind.Priority,
                    UseChance       = NagulDesign.Action_VineBind.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = NagulDesign.Action_VineBind.IsAbsorbable,
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
            sk.AppliedStatus  = new StatusEffect
            {
                Type     = effect,
                Duration = effect switch
                {
                    StatusEffectType.Poison => 3,
                    StatusEffectType.Bleed  => 3,
                    StatusEffectType.Burn   => 3,
                    _                       => 2,
                },
                Value = effect switch
                {
                    StatusEffectType.Poison => 0.05f,
                    StatusEffectType.Bleed  => 0.05f,
                    StatusEffectType.Burn   => 0.07f,
                    StatusEffectType.Regen  => 0.04f,
                    _                       => 0f,
                },
            };
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateSupportSkill(string fileName, string name, string desc,
                                             int shieldRestore = 0)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.Physical;
            sk.Element        = ElementType.None;
            sk.BasePower      = 0f;
            sk.MPCost         = 0;
            sk.ShieldRestore  = shieldRestore;
            sk.IsHeal         = false;
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
