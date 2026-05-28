#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 0「廃墟の回廊」エリート敵 3体 の ScriptableObject を自動生成するツール。
    ///   Elite A: 亡骸騎士 ガルム          (ソロ)
    ///   Elite B: 廃術士 ＋ 鎖縛り兵      (グループ)
    ///   Elite C: 石礫の守護像 ランバード   (ソロ)
    /// Menu: DarkChronicle → Generate → Floor0 Elite Assets
    /// </summary>
    public static class Floor0EliteSOGenerator
    {
        const string BaseDir  = "Assets/Data/Enemies/Floor0";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor0 Elite Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            GenerateGarm();
            GenerateRuinedSorcerer();
            GenerateChainSoldier();
            GenerateRambard();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor0EliteSOGenerator] All Floor 0 elite assets generated.");
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
                    var parts = dir.Split('/');
                    string parent = string.Join("/", parts[..^1]);
                    AssetDatabase.CreateFolder(parent, parts[^1]);
                }
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite A: 亡骸騎士 ガルム
        // ══════════════════════════════════════════════════════════════════
        static void GenerateGarm()
        {
            // ── Skills ──────────────────────────────────────────────────
            var rustThrust = CreatePhysSkill("SKL_F0E_RustyThrust",
                GarmDesign.Action_RustyThrust.Name,
                GarmDesign.Action_RustyThrust.Desc,
                GarmDesign.Action_RustyThrust.Power, hits: 1, hitsAll: false);

            var boneCrush = CreatePhysSkill("SKL_F0E_BoneCrush",
                GarmDesign.Action_BoneCrush.Name,
                GarmDesign.Action_BoneCrush.Desc,
                GarmDesign.Action_BoneCrush.Power, hits: 1, hitsAll: false);

            var skullRoar = CreateStatusSkill("SKL_F0E_SkullRoar",
                GarmDesign.Action_SkullRoar.Name,
                GarmDesign.Action_SkullRoar.Desc,
                GarmDesign.Action_SkullRoar.StatusChance,
                StatusEffectType.Blind, hitsAll: true);

            // 亡者の意地: 自己回復スキル（BasePower は便宜上 HP 回復量を格納）
            var undeadWill = CreateHealSkill("SKL_F0E_UndeadWill",
                GarmDesign.Action_UndeadWill.Name,
                GarmDesign.Action_UndeadWill.Desc,
                GarmDesign.Action_UndeadWill.HealAmount);

            // ── EnemyData ────────────────────────────────────────────────
            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Garm.asset");
            enemy.EnemyName  = GarmDesign.EnemyName;
            enemy.Lore       = GarmDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = GarmDesign.MaxHP,
                PhysicalAttack  = GarmDesign.PhysicalAttack,
                MagicAttack     = GarmDesign.MagicAttack,
                PhysicalDefense = GarmDesign.PhysicalDefense,
                MagicDefense    = GarmDesign.MagicDefense,
                Speed           = GarmDesign.Speed,
            };
            enemy.ShieldPoints = GarmDesign.ShieldPoints;
            enemy.ExpReward    = GarmDesign.ExpReward;
            enemy.JPReward     = GarmDesign.JPReward;
            enemy.GoldReward   = GarmDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };
            enemy.IsUndead = GarmDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = rustThrust.SkillName,
                    Skill           = rustThrust,
                    Priority        = GarmDesign.Action_RustyThrust.Priority,
                    UseChance       = GarmDesign.Action_RustyThrust.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = boneCrush.SkillName,
                    Skill           = boneCrush,
                    Priority        = GarmDesign.Action_BoneCrush.Priority,
                    UseChance       = GarmDesign.Action_BoneCrush.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = skullRoar.SkillName,
                    Skill           = skullRoar,
                    Priority        = GarmDesign.Action_SkullRoar.Priority,
                    UseChance       = GarmDesign.Action_SkullRoar.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = GarmDesign.Action_SkullRoar.IsAbsorbable,
                },
                new() {
                    ActionName      = undeadWill.SkillName,
                    Skill           = undeadWill,
                    Priority        = GarmDesign.Action_UndeadWill.Priority,
                    UseChance       = GarmDesign.Action_UndeadWill.UseChance,
                    HealthThreshold = GarmDesign.Action_UndeadWill.HealthThreshold,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-1: 廃術士
        // ══════════════════════════════════════════════════════════════════
        static void GenerateRuinedSorcerer()
        {
            var corruptWave = CreateMagicSkill("SKL_F0E_CorruptionWave",
                RuinedSorcererDesign.Action_CorruptionWave.Name,
                RuinedSorcererDesign.Action_CorruptionWave.Desc,
                ElementType.Dark,
                RuinedSorcererDesign.Action_CorruptionWave.Power, hits: 1, hitsAll: true);

            var corruptBind = CreateStatusSkill("SKL_F0E_CorruptionBind",
                RuinedSorcererDesign.Action_CorruptionBind.Name,
                RuinedSorcererDesign.Action_CorruptionBind.Desc,
                RuinedSorcererDesign.Action_CorruptionBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var undeadFury = CreateSupportSkill("SKL_F0E_UndeadFury",
                RuinedSorcererDesign.Action_UndeadFury.Name,
                RuinedSorcererDesign.Action_UndeadFury.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_RuinedSorcerer.asset");
            enemy.EnemyName  = RuinedSorcererDesign.EnemyName;
            enemy.Lore       = RuinedSorcererDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = RuinedSorcererDesign.MaxHP,
                PhysicalAttack  = RuinedSorcererDesign.PhysicalAttack,
                MagicAttack     = RuinedSorcererDesign.MagicAttack,
                PhysicalDefense = RuinedSorcererDesign.PhysicalDefense,
                MagicDefense    = RuinedSorcererDesign.MagicDefense,
                Speed           = RuinedSorcererDesign.Speed,
            };
            enemy.ShieldPoints = RuinedSorcererDesign.ShieldPoints;
            enemy.ExpReward    = RuinedSorcererDesign.ExpReward;
            enemy.JPReward     = RuinedSorcererDesign.JPReward;
            enemy.GoldReward   = RuinedSorcererDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Tome,
            };
            enemy.IsUndead = RuinedSorcererDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = corruptWave.SkillName,
                    Skill           = corruptWave,
                    Priority        = RuinedSorcererDesign.Action_CorruptionWave.Priority,
                    UseChance       = RuinedSorcererDesign.Action_CorruptionWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = RuinedSorcererDesign.Action_CorruptionWave.IsAbsorbable,
                },
                new() {
                    ActionName      = corruptBind.SkillName,
                    Skill           = corruptBind,
                    Priority        = RuinedSorcererDesign.Action_CorruptionBind.Priority,
                    UseChance       = RuinedSorcererDesign.Action_CorruptionBind.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = RuinedSorcererDesign.Action_CorruptionBind.IsAbsorbable,
                },
                new() {
                    ActionName      = undeadFury.SkillName,
                    Skill           = undeadFury,
                    Priority        = RuinedSorcererDesign.Action_UndeadFury.Priority,
                    UseChance       = RuinedSorcererDesign.Action_UndeadFury.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-2: 鎖縛り兵
        // ══════════════════════════════════════════════════════════════════
        static void GenerateChainSoldier()
        {
            var chainStrike = CreatePhysSkill("SKL_F0E_ChainStrike",
                ChainSoldierDesign.Action_ChainStrike.Name,
                ChainSoldierDesign.Action_ChainStrike.Desc,
                ChainSoldierDesign.Action_ChainStrike.Power, hits: 1, hitsAll: false);

            var bindThrow = CreatePhysSkill("SKL_F0E_BindingThrow",
                ChainSoldierDesign.Action_BindingThrow.Name,
                ChainSoldierDesign.Action_BindingThrow.Desc,
                ChainSoldierDesign.Action_BindingThrow.Power, hits: 1, hitsAll: true);

            var chainBind = CreateStatusSkill("SKL_F0E_ChainBind",
                ChainSoldierDesign.Action_ChainBind.Name,
                ChainSoldierDesign.Action_ChainBind.Desc,
                ChainSoldierDesign.Action_ChainBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_ChainSoldier.asset");
            enemy.EnemyName  = ChainSoldierDesign.EnemyName;
            enemy.Lore       = ChainSoldierDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ChainSoldierDesign.MaxHP,
                PhysicalAttack  = ChainSoldierDesign.PhysicalAttack,
                MagicAttack     = ChainSoldierDesign.MagicAttack,
                PhysicalDefense = ChainSoldierDesign.PhysicalDefense,
                MagicDefense    = ChainSoldierDesign.MagicDefense,
                Speed           = ChainSoldierDesign.Speed,
            };
            enemy.ShieldPoints = ChainSoldierDesign.ShieldPoints;
            enemy.ExpReward    = ChainSoldierDesign.ExpReward;
            enemy.JPReward     = ChainSoldierDesign.JPReward;
            enemy.GoldReward   = ChainSoldierDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };
            enemy.IsUndead = ChainSoldierDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = chainStrike.SkillName,
                    Skill           = chainStrike,
                    Priority        = ChainSoldierDesign.Action_ChainStrike.Priority,
                    UseChance       = ChainSoldierDesign.Action_ChainStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bindThrow.SkillName,
                    Skill           = bindThrow,
                    Priority        = ChainSoldierDesign.Action_BindingThrow.Priority,
                    UseChance       = ChainSoldierDesign.Action_BindingThrow.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chainBind.SkillName,
                    Skill           = chainBind,
                    Priority        = ChainSoldierDesign.Action_ChainBind.Priority,
                    UseChance       = ChainSoldierDesign.Action_ChainBind.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = ChainSoldierDesign.Action_ChainBind.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite C: 石礫の守護像 ランバード
        // ══════════════════════════════════════════════════════════════════
        static void GenerateRambard()
        {
            var boulderStrike = CreatePhysSkill("SKL_F0E_BoulderStrike",
                RambardDesign.Action_BoulderStrike.Name,
                RambardDesign.Action_BoulderStrike.Desc,
                RambardDesign.Action_BoulderStrike.Power, hits: 1, hitsAll: false);

            var rubbleThrow = CreatePhysSkill("SKL_F0E_RubbleThrow",
                RambardDesign.Action_RubbleThrow.Name,
                RambardDesign.Action_RubbleThrow.Desc,
                RambardDesign.Action_RubbleThrow.Power, hits: 1, hitsAll: true);

            var petrifyDust = CreateStatusSkill("SKL_F0E_PetrifyingDust",
                RambardDesign.Action_PetrifyingDust.Name,
                RambardDesign.Action_PetrifyingDust.Desc,
                RambardDesign.Action_PetrifyingDust.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var rockSkin = CreateSupportSkill("SKL_F0E_RockSkin",
                RambardDesign.Action_RockSkin.Name,
                RambardDesign.Action_RockSkin.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Rambard.asset");
            enemy.EnemyName  = RambardDesign.EnemyName;
            enemy.Lore       = RambardDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = RambardDesign.MaxHP,
                PhysicalAttack  = RambardDesign.PhysicalAttack,
                MagicAttack     = RambardDesign.MagicAttack,
                PhysicalDefense = RambardDesign.PhysicalDefense,
                MagicDefense    = RambardDesign.MagicDefense,
                Speed           = RambardDesign.Speed,
            };
            enemy.ShieldPoints = RambardDesign.ShieldPoints;
            enemy.ExpReward    = RambardDesign.ExpReward;
            enemy.JPReward     = RambardDesign.JPReward;
            enemy.GoldReward   = RambardDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Lightning,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };
            enemy.IsUndead = RambardDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = boulderStrike.SkillName,
                    Skill           = boulderStrike,
                    Priority        = RambardDesign.Action_BoulderStrike.Priority,
                    UseChance       = RambardDesign.Action_BoulderStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = rubbleThrow.SkillName,
                    Skill           = rubbleThrow,
                    Priority        = RambardDesign.Action_RubbleThrow.Priority,
                    UseChance       = RambardDesign.Action_RubbleThrow.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = petrifyDust.SkillName,
                    Skill           = petrifyDust,
                    Priority        = RambardDesign.Action_PetrifyingDust.Priority,
                    UseChance       = RambardDesign.Action_PetrifyingDust.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = RambardDesign.Action_PetrifyingDust.IsAbsorbable,
                },
                new() {
                    ActionName      = rockSkin.SkillName,
                    Skill           = rockSkin,
                    Priority        = RambardDesign.Action_RockSkin.Priority,
                    UseChance       = RambardDesign.Action_RockSkin.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
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
