#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 4「混沌の終末域」エリート敵 4 体を自動生成するツール。
    ///   E1: 虚無の化身「グナウス」       (Solo — ActionsPerTurn=2, HP回復)
    ///   E2: 混沌の預言者「セルゴン」      (Group — 全体デバフ連打, HP回復サポート)
    ///       + 深淵の騎士
    ///   E3: 終末の顕現「ヴォイダル」      (Solo — フェーズ変化HP≤40%, ActionsPerTurn=2)
    /// Menu: DarkChronicle → Generate → Floor4 Elite Assets
    /// </summary>
    public static class Floor4EliteSOGenerator
    {
        const string BaseDir = "Assets/Data/Enemies/Floor4/Elites";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor4 Elite Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            GenerateGnaus();
            GenerateSergon();
            GenerateAbyssKnight();
            GenerateVoidal();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor4EliteSOGenerator] All Floor 4 elite assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor4",
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
        //   E1: 虚無の化身「グナウス」
        // ══════════════════════════════════════════════════════════════════
        static void GenerateGnaus()
        {
            var voidTread = CreatePhysSkill("SKL_F4E_VoidTread",
                GnausDesign.Action_VoidTread.Name,
                GnausDesign.Action_VoidTread.Desc,
                GnausDesign.Action_VoidTread.Power, hits: 1, hitsAll: false);

            var collapseGauntlet = CreatePhysSkill("SKL_F4E_CollapseGauntlet",
                GnausDesign.Action_CollapseGauntlet.Name,
                GnausDesign.Action_CollapseGauntlet.Desc,
                GnausDesign.Action_CollapseGauntlet.Power, hits: 1, hitsAll: false);

            var doomSwing = CreatePhysSkill("SKL_F4E_DoomSwing",
                GnausDesign.Action_DoomSwing.Name,
                GnausDesign.Action_DoomSwing.Desc,
                GnausDesign.Action_DoomSwing.Power, hits: 1, hitsAll: true);

            var chaosRegen = CreateHealSkill("SKL_F4E_ChaosRegen",
                GnausDesign.Action_ChaosRegen.Name,
                GnausDesign.Action_ChaosRegen.Desc,
                GnausDesign.Action_ChaosRegen.HealAmount);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Gnaus.asset");
            enemy.EnemyName  = GnausDesign.EnemyName;
            enemy.Lore       = GnausDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = GnausDesign.MaxHP,
                PhysicalAttack  = GnausDesign.PhysicalAttack,
                MagicAttack     = GnausDesign.MagicAttack,
                PhysicalDefense = GnausDesign.PhysicalDefense,
                MagicDefense    = GnausDesign.MagicDefense,
                Speed           = GnausDesign.Speed,
            };
            enemy.ShieldPoints = GnausDesign.ShieldPoints;
            enemy.ExpReward    = GnausDesign.ExpReward;
            enemy.JPReward     = GnausDesign.JPReward;
            enemy.GoldReward   = GnausDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Light,
                ElementType.Lightning,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };
            enemy.IsUndead = GnausDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = voidTread.SkillName,
                    Skill           = voidTread,
                    Priority        = GnausDesign.Action_VoidTread.Priority,
                    UseChance       = GnausDesign.Action_VoidTread.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = collapseGauntlet.SkillName,
                    Skill           = collapseGauntlet,
                    Priority        = GnausDesign.Action_CollapseGauntlet.Priority,
                    UseChance       = GnausDesign.Action_CollapseGauntlet.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = doomSwing.SkillName,
                    Skill           = doomSwing,
                    Priority        = GnausDesign.Action_DoomSwing.Priority,
                    UseChance       = GnausDesign.Action_DoomSwing.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chaosRegen.SkillName,
                    Skill           = chaosRegen,
                    Priority        = GnausDesign.Action_ChaosRegen.Priority,
                    UseChance       = GnausDesign.Action_ChaosRegen.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = GnausDesign.ActionsPerTurn;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   E2: 混沌の預言者「セルゴン」
        // ══════════════════════════════════════════════════════════════════
        static void GenerateSergon()
        {
            var doomCurse = CreateMagicSkill("SKL_F4E_DoomCurse",
                SergonDesign.Action_DoomCurse.Name,
                SergonDesign.Action_DoomCurse.Desc,
                ElementType.Dark,
                SergonDesign.Action_DoomCurse.Power, hits: 1, hitsAll: true);

            var silenceStorm = CreateStatusSkill("SKL_F4E_SilenceStorm",
                SergonDesign.Action_SilenceStorm.Name,
                SergonDesign.Action_SilenceStorm.Desc,
                SergonDesign.Action_SilenceStorm.StatusChance,
                StatusEffectType.Silence, hitsAll: true);

            var paralysisWave = CreateStatusSkill("SKL_F4E_ParalysisWave",
                SergonDesign.Action_ParalysisWave.Name,
                SergonDesign.Action_ParalysisWave.Desc,
                SergonDesign.Action_ParalysisWave.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            var chaosHeal = CreateHealSkill("SKL_F4E_ChaosHeal",
                SergonDesign.Action_ChaosHeal.Name,
                SergonDesign.Action_ChaosHeal.Desc,
                SergonDesign.Action_ChaosHeal.HealAmount);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Sergon.asset");
            enemy.EnemyName  = SergonDesign.EnemyName;
            enemy.Lore       = SergonDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = SergonDesign.MaxHP,
                PhysicalAttack  = SergonDesign.PhysicalAttack,
                MagicAttack     = SergonDesign.MagicAttack,
                PhysicalDefense = SergonDesign.PhysicalDefense,
                MagicDefense    = SergonDesign.MagicDefense,
                Speed           = SergonDesign.Speed,
            };
            enemy.ShieldPoints = SergonDesign.ShieldPoints;
            enemy.ExpReward    = SergonDesign.ExpReward;
            enemy.JPReward     = SergonDesign.JPReward;
            enemy.GoldReward   = SergonDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Light,
                ElementType.Fire,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Tome,
            };
            enemy.IsUndead = SergonDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = doomCurse.SkillName,
                    Skill           = doomCurse,
                    Priority        = SergonDesign.Action_DoomCurse.Priority,
                    UseChance       = SergonDesign.Action_DoomCurse.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = silenceStorm.SkillName,
                    Skill           = silenceStorm,
                    Priority        = SergonDesign.Action_SilenceStorm.Priority,
                    UseChance       = SergonDesign.Action_SilenceStorm.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = SergonDesign.Action_SilenceStorm.IsAbsorbable,
                },
                new() {
                    ActionName      = paralysisWave.SkillName,
                    Skill           = paralysisWave,
                    Priority        = SergonDesign.Action_ParalysisWave.Priority,
                    UseChance       = SergonDesign.Action_ParalysisWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = SergonDesign.Action_ParalysisWave.IsAbsorbable,
                },
                new() {
                    ActionName      = chaosHeal.SkillName,
                    Skill           = chaosHeal,
                    Priority        = SergonDesign.Action_ChaosHeal.Priority,
                    UseChance       = SergonDesign.Action_ChaosHeal.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = SergonDesign.Action_ChaosHeal.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   E2: 深淵の騎士
        // ══════════════════════════════════════════════════════════════════
        static void GenerateAbyssKnight()
        {
            var abyssSlash = CreatePhysSkill("SKL_F4E_AbyssSlash",
                AbyssKnightDesign.Action_AbyssSlash.Name,
                AbyssKnightDesign.Action_AbyssSlash.Desc,
                AbyssKnightDesign.Action_AbyssSlash.Power, hits: 1, hitsAll: false);

            var chaosGuard = CreateSupportSkill("SKL_F4E_ChaosGuard",
                AbyssKnightDesign.Action_ChaosGuard.Name,
                AbyssKnightDesign.Action_ChaosGuard.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_AbyssKnight.asset");
            enemy.EnemyName  = AbyssKnightDesign.EnemyName;
            enemy.Lore       = AbyssKnightDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = AbyssKnightDesign.MaxHP,
                PhysicalAttack  = AbyssKnightDesign.PhysicalAttack,
                MagicAttack     = AbyssKnightDesign.MagicAttack,
                PhysicalDefense = AbyssKnightDesign.PhysicalDefense,
                MagicDefense    = AbyssKnightDesign.MagicDefense,
                Speed           = AbyssKnightDesign.Speed,
            };
            enemy.ShieldPoints = AbyssKnightDesign.ShieldPoints;
            enemy.ExpReward    = AbyssKnightDesign.ExpReward;
            enemy.JPReward     = AbyssKnightDesign.JPReward;
            enemy.GoldReward   = AbyssKnightDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Light,
                ElementType.Lightning,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Sword,
            };
            enemy.IsUndead = AbyssKnightDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = abyssSlash.SkillName,
                    Skill           = abyssSlash,
                    Priority        = AbyssKnightDesign.Action_AbyssSlash.Priority,
                    UseChance       = AbyssKnightDesign.Action_AbyssSlash.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chaosGuard.SkillName,
                    Skill           = chaosGuard,
                    Priority        = AbyssKnightDesign.Action_ChaosGuard.Priority,
                    UseChance       = AbyssKnightDesign.Action_ChaosGuard.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   E3: 終末の顕現「ヴォイダル」
        // ══════════════════════════════════════════════════════════════════
        static void GenerateVoidal()
        {
            // ── Phase 1 Skills (常時) ────────────────────────────────────
            var voidClaw = CreateMagicSkill("SKL_F4E_VoidClaw",
                VoidalDesign.Action_VoidClaw.Name,
                VoidalDesign.Action_VoidClaw.Desc,
                ElementType.Dark,
                VoidalDesign.Action_VoidClaw.Power, hits: 1, hitsAll: false);

            var chaosWhisper = CreateStatusSkill("SKL_F4E_VoidalChaosWhisper",
                VoidalDesign.Action_ChaosWhisper.Name,
                VoidalDesign.Action_ChaosWhisper.Desc,
                VoidalDesign.Action_ChaosWhisper.StatusChance,
                StatusEffectType.Silence, hitsAll: false);

            var doomRegen = CreateHealSkill("SKL_F4E_DoomRegen",
                VoidalDesign.Action_DoomRegen.Name,
                VoidalDesign.Action_DoomRegen.Desc,
                VoidalDesign.Action_DoomRegen.HealAmount);

            var collapseWave = CreateMagicSkill("SKL_F4E_CollapseWave",
                VoidalDesign.Action_CollapseWave.Name,
                VoidalDesign.Action_CollapseWave.Desc,
                ElementType.Dark,
                VoidalDesign.Action_CollapseWave.Power, hits: 1, hitsAll: true);

            // ── Phase 2 Skills (HP ≤ 40%) ────────────────────────────────
            var despairManifestation = CreateMagicSkill("SKL_F4E_DespairManifestation",
                VoidalDesign.Action_DespairManifestation.Name,
                VoidalDesign.Action_DespairManifestation.Desc,
                ElementType.Dark,
                VoidalDesign.Action_DespairManifestation.Power, hits: 1, hitsAll: true);

            var voidRelease = CreateTrueDmgSkill("SKL_F4E_VoidRelease",
                VoidalDesign.Action_VoidRelease.Name,
                VoidalDesign.Action_VoidRelease.Desc,
                VoidalDesign.Action_VoidRelease.Power);

            var chaosExplosion = CreateStatusSkill("SKL_F4E_ChaosExplosion",
                VoidalDesign.Action_ChaosExplosion.Name,
                VoidalDesign.Action_ChaosExplosion.Desc,
                VoidalDesign.Action_ChaosExplosion.StatusChance,
                StatusEffectType.Bleed, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Voidal.asset");
            enemy.EnemyName  = VoidalDesign.EnemyName;
            enemy.Lore       = VoidalDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = VoidalDesign.MaxHP,
                PhysicalAttack  = VoidalDesign.PhysicalAttack,
                MagicAttack     = VoidalDesign.MagicAttack,
                PhysicalDefense = VoidalDesign.PhysicalDefense,
                MagicDefense    = VoidalDesign.MagicDefense,
                Speed           = VoidalDesign.Speed,
            };
            enemy.ShieldPoints = VoidalDesign.ShieldPoints;
            enemy.ExpReward    = VoidalDesign.ExpReward;
            enemy.JPReward     = VoidalDesign.JPReward;
            enemy.GoldReward   = VoidalDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Light,
                ElementType.Fire,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Tome,
            };
            enemy.IsUndead = VoidalDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                // ── Phase 1（常時） ────────────────────────────────────────
                new() {
                    ActionName      = voidClaw.SkillName,
                    Skill           = voidClaw,
                    Priority        = VoidalDesign.Action_VoidClaw.Priority,
                    UseChance       = VoidalDesign.Action_VoidClaw.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chaosWhisper.SkillName,
                    Skill           = chaosWhisper,
                    Priority        = VoidalDesign.Action_ChaosWhisper.Priority,
                    UseChance       = VoidalDesign.Action_ChaosWhisper.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = VoidalDesign.Action_ChaosWhisper.IsAbsorbable,
                },
                new() {
                    ActionName      = doomRegen.SkillName,
                    Skill           = doomRegen,
                    Priority        = VoidalDesign.Action_DoomRegen.Priority,
                    UseChance       = VoidalDesign.Action_DoomRegen.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = collapseWave.SkillName,
                    Skill           = collapseWave,
                    Priority        = VoidalDesign.Action_CollapseWave.Priority,
                    UseChance       = VoidalDesign.Action_CollapseWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                // ── Phase 2（HP 40% 以下） ─────────────────────────────────
                new() {
                    ActionName      = despairManifestation.SkillName,
                    Skill           = despairManifestation,
                    Priority        = VoidalDesign.Action_DespairManifestation.Priority,
                    UseChance       = VoidalDesign.Action_DespairManifestation.UseChance,
                    HealthThreshold = VoidalDesign.Action_DespairManifestation.HealthThreshold,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = voidRelease.SkillName,
                    Skill           = voidRelease,
                    Priority        = VoidalDesign.Action_VoidRelease.Priority,
                    UseChance       = VoidalDesign.Action_VoidRelease.UseChance,
                    HealthThreshold = VoidalDesign.Action_VoidRelease.HealthThreshold,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chaosExplosion.SkillName,
                    Skill           = chaosExplosion,
                    Priority        = VoidalDesign.Action_ChaosExplosion.Priority,
                    UseChance       = VoidalDesign.Action_ChaosExplosion.UseChance,
                    HealthThreshold = VoidalDesign.Action_ChaosExplosion.HealthThreshold,
                    IsAbsorbable    = VoidalDesign.Action_ChaosExplosion.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = VoidalDesign.ActionsPerTurn;
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
