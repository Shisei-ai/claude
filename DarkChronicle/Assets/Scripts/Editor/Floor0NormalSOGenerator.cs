#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;
using DarkChronicle.Roguelike;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 0「廃墟の回廊」通常敵 4 体と NormalEncounters 5 グループを自動生成するツール。
    ///   ① ゴブリン
    ///   ② 腐乱ゾンビ
    ///   ③ 骸骨の射手
    ///   ④ 亡者の魔術師
    /// 生成後、FloorData (FLD_Floor0) の NormalEncounters に 5 グループを登録します。
    /// Menu: DarkChronicle → Generate → Floor0 Normal Enemies
    /// </summary>
    public static class Floor0NormalSOGenerator
    {
        const string EnemyDir = "Assets/Data/Enemies/Floor0/Normal";
        const string SkillDir = EnemyDir + "/Skills";
        const string FloorDir = "Assets/Data/Floors";

        [MenuItem("DarkChronicle/Generate/Floor0 Normal Enemies")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            var goblin     = GenerateGoblin();
            var rotZombie  = GenerateRottingZombie();
            var skelArcher = GenerateSkeletonArcher();
            var undeadMage = GenerateUndeadMage();

            GenerateFloorData(goblin, rotZombie, skelArcher, undeadMage);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor0NormalSOGenerator] All Floor 0 normal enemy assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor0",
                EnemyDir,
                SkillDir,
                FloorDir,
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
        //   ① ゴブリン
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateGoblin()
        {
            var goblinStab = CreatePhysSkill("SKL_F0N_GoblinStab",
                GoblinDesign.Action_GoblinStab.Name,
                GoblinDesign.Action_GoblinStab.Desc,
                GoblinDesign.Action_GoblinStab.Power, hits: 1, hitsAll: false);

            var poisonKnife = CreateStatusSkill("SKL_F0N_PoisonKnife",
                GoblinDesign.Action_PoisonKnife.Name,
                GoblinDesign.Action_PoisonKnife.Desc,
                GoblinDesign.Action_PoisonKnife.StatusChance,
                StatusEffectType.Poison, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F0N_Goblin.asset");
            enemy.EnemyName  = GoblinDesign.EnemyName;
            enemy.Lore       = GoblinDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = GoblinDesign.MaxHP,
                PhysicalAttack  = GoblinDesign.PhysicalAttack,
                MagicAttack     = GoblinDesign.MagicAttack,
                PhysicalDefense = GoblinDesign.PhysicalDefense,
                MagicDefense    = GoblinDesign.MagicDefense,
                Speed           = GoblinDesign.Speed,
            };
            enemy.ShieldPoints = GoblinDesign.ShieldPoints;
            enemy.ExpReward    = GoblinDesign.ExpReward;
            enemy.JPReward     = GoblinDesign.JPReward;
            enemy.GoldReward   = GoblinDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Dagger };
            enemy.IsUndead = GoblinDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = goblinStab.SkillName,
                    Skill           = goblinStab,
                    Priority        = GoblinDesign.Action_GoblinStab.Priority,
                    UseChance       = GoblinDesign.Action_GoblinStab.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = poisonKnife.SkillName,
                    Skill           = poisonKnife,
                    Priority        = GoblinDesign.Action_PoisonKnife.Priority,
                    UseChance       = GoblinDesign.Action_PoisonKnife.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ② 腐乱ゾンビ
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateRottingZombie()
        {
            var rottenClaw = CreatePhysSkill("SKL_F0N_RottenClaw",
                RottingZombieDesign.Action_RottenClaw.Name,
                RottingZombieDesign.Action_RottenClaw.Desc,
                RottingZombieDesign.Action_RottenClaw.Power, hits: 1, hitsAll: false);

            var stenchBreath = CreateStatusSkill("SKL_F0N_StenchBreath",
                RottingZombieDesign.Action_StenchBreath.Name,
                RottingZombieDesign.Action_StenchBreath.Desc,
                RottingZombieDesign.Action_StenchBreath.StatusChance,
                StatusEffectType.Poison, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F0N_RottingZombie.asset");
            enemy.EnemyName  = RottingZombieDesign.EnemyName;
            enemy.Lore       = RottingZombieDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = RottingZombieDesign.MaxHP,
                PhysicalAttack  = RottingZombieDesign.PhysicalAttack,
                MagicAttack     = RottingZombieDesign.MagicAttack,
                PhysicalDefense = RottingZombieDesign.PhysicalDefense,
                MagicDefense    = RottingZombieDesign.MagicDefense,
                Speed           = RottingZombieDesign.Speed,
            };
            enemy.ShieldPoints = RottingZombieDesign.ShieldPoints;
            enemy.ExpReward    = RottingZombieDesign.ExpReward;
            enemy.JPReward     = RottingZombieDesign.JPReward;
            enemy.GoldReward   = RottingZombieDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = RottingZombieDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = rottenClaw.SkillName,
                    Skill           = rottenClaw,
                    Priority        = RottingZombieDesign.Action_RottenClaw.Priority,
                    UseChance       = RottingZombieDesign.Action_RottenClaw.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = stenchBreath.SkillName,
                    Skill           = stenchBreath,
                    Priority        = RottingZombieDesign.Action_StenchBreath.Priority,
                    UseChance       = RottingZombieDesign.Action_StenchBreath.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ③ 骸骨の射手
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateSkeletonArcher()
        {
            var boneArrow = CreatePhysSkill("SKL_F0N_BoneArrow",
                SkeletonArcherDesign.Action_BoneArrow.Name,
                SkeletonArcherDesign.Action_BoneArrow.Desc,
                SkeletonArcherDesign.Action_BoneArrow.Power, hits: 1, hitsAll: false);

            var doubleShot = CreatePhysSkill("SKL_F0N_DoubleShot",
                SkeletonArcherDesign.Action_DoubleShot.Name,
                SkeletonArcherDesign.Action_DoubleShot.Desc,
                SkeletonArcherDesign.Action_DoubleShot.Power,
                hits: SkeletonArcherDesign.Action_DoubleShot.HitCount, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F0N_SkeletonArcher.asset");
            enemy.EnemyName  = SkeletonArcherDesign.EnemyName;
            enemy.Lore       = SkeletonArcherDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = SkeletonArcherDesign.MaxHP,
                PhysicalAttack  = SkeletonArcherDesign.PhysicalAttack,
                MagicAttack     = SkeletonArcherDesign.MagicAttack,
                PhysicalDefense = SkeletonArcherDesign.PhysicalDefense,
                MagicDefense    = SkeletonArcherDesign.MagicDefense,
                Speed           = SkeletonArcherDesign.Speed,
            };
            enemy.ShieldPoints = SkeletonArcherDesign.ShieldPoints;
            enemy.ExpReward    = SkeletonArcherDesign.ExpReward;
            enemy.JPReward     = SkeletonArcherDesign.JPReward;
            enemy.GoldReward   = SkeletonArcherDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Sword };
            enemy.IsUndead = SkeletonArcherDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = boneArrow.SkillName,
                    Skill           = boneArrow,
                    Priority        = SkeletonArcherDesign.Action_BoneArrow.Priority,
                    UseChance       = SkeletonArcherDesign.Action_BoneArrow.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = doubleShot.SkillName,
                    Skill           = doubleShot,
                    Priority        = SkeletonArcherDesign.Action_DoubleShot.Priority,
                    UseChance       = SkeletonArcherDesign.Action_DoubleShot.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ④ 亡者の魔術師
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateUndeadMage()
        {
            var darkPebble = CreateMagicSkill("SKL_F0N_DarkPebble",
                UndeadMageDesign.Action_DarkPebble.Name,
                UndeadMageDesign.Action_DarkPebble.Desc,
                ElementType.Dark,
                UndeadMageDesign.Action_DarkPebble.Power, hits: 1, hitsAll: false);

            var corruptionCurse = CreateStatusSkill("SKL_F0N_CorruptionCurse",
                UndeadMageDesign.Action_CorruptionCurse.Name,
                UndeadMageDesign.Action_CorruptionCurse.Desc,
                UndeadMageDesign.Action_CorruptionCurse.StatusChance,
                StatusEffectType.Poison, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F0N_UndeadMage.asset");
            enemy.EnemyName  = UndeadMageDesign.EnemyName;
            enemy.Lore       = UndeadMageDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = UndeadMageDesign.MaxHP,
                PhysicalAttack  = UndeadMageDesign.PhysicalAttack,
                MagicAttack     = UndeadMageDesign.MagicAttack,
                PhysicalDefense = UndeadMageDesign.PhysicalDefense,
                MagicDefense    = UndeadMageDesign.MagicDefense,
                Speed           = UndeadMageDesign.Speed,
            };
            enemy.ShieldPoints = UndeadMageDesign.ShieldPoints;
            enemy.ExpReward    = UndeadMageDesign.ExpReward;
            enemy.JPReward     = UndeadMageDesign.JPReward;
            enemy.GoldReward   = UndeadMageDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Tome };
            enemy.IsUndead = UndeadMageDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = darkPebble.SkillName,
                    Skill           = darkPebble,
                    Priority        = UndeadMageDesign.Action_DarkPebble.Priority,
                    UseChance       = UndeadMageDesign.Action_DarkPebble.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = corruptionCurse.SkillName,
                    Skill           = corruptionCurse,
                    Priority        = UndeadMageDesign.Action_CorruptionCurse.Priority,
                    UseChance       = UndeadMageDesign.Action_CorruptionCurse.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = UndeadMageDesign.Action_CorruptionCurse.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   FloorData — NormalEncounters 登録
        // ══════════════════════════════════════════════════════════════════
        static void GenerateFloorData(
            EnemyData goblin, EnemyData rotZombie,
            EnemyData skelArcher, EnemyData undeadMage)
        {
            var floor = CreateOrLoad<FloorData>(FloorDir + "/FLD_Floor0.asset");

            floor.FloorIndex = 0;
            if (string.IsNullOrEmpty(floor.FloorName))
                floor.FloorName = "廃墟の回廊";

            floor.NormalEncounters = new List<EnemyEncounterGroup>
            {
                new() {
                    GroupName = "廃墟の歩哨",
                    Enemies   = new List<EnemyData> { goblin },
                    Weight    = 1.2f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "ゴブリンの群れ",
                    Enemies   = new List<EnemyData> { goblin, goblin },
                    Weight    = 1.0f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "廃墟の混成",
                    Enemies   = new List<EnemyData> { rotZombie, goblin },
                    Weight    = 0.9f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "射撃陣営",
                    Enemies   = new List<EnemyData> { skelArcher, skelArcher, rotZombie },
                    Weight    = 0.8f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "亡者の術師",
                    Enemies   = new List<EnemyData> { undeadMage },
                    Weight    = 0.7f,
                    MinFloor  = 0,
                },
            };

            EditorUtility.SetDirty(floor);
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
