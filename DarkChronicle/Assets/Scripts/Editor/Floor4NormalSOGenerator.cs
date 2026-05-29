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
    /// Floor 4「混沌の終末域」通常敵 4 体と NormalEncounters 5 グループを自動生成するツール。
    ///   ① 終末の騎士
    ///   ② 混沌の爪獣
    ///   ③ 虚無の霊体
    ///   ④ 崩壊の巨人
    /// 生成後、FloorData (FLD_Floor4) の NormalEncounters に 5 グループを登録します。
    /// Menu: DarkChronicle → Generate → Floor4 Normal Enemies
    /// </summary>
    public static class Floor4NormalSOGenerator
    {
        const string EnemyDir = "Assets/Data/Enemies/Floor4/Normal";
        const string SkillDir = EnemyDir + "/Skills";
        const string FloorDir = "Assets/Data/Floors";

        [MenuItem("DarkChronicle/Generate/Floor4 Normal Enemies")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            var knight        = GenerateApocalypseKnight();
            var chaosBeast    = GenerateChaosBeast();
            var voidSpecter   = GenerateVoidSpecter();
            var collapseGiant = GenerateCollapseGiant();

            GenerateFloorData(knight, chaosBeast, voidSpecter, collapseGiant);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor4NormalSOGenerator] All Floor 4 normal enemy assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor4",
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
        //   ① 終末の騎士
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateApocalypseKnight()
        {
            var doomswordStrike = CreatePhysSkill("SKL_F4N_DoomswordStrike",
                ApocalypseKnightDesign.Action_DoomswordStrike.Name,
                ApocalypseKnightDesign.Action_DoomswordStrike.Desc,
                ApocalypseKnightDesign.Action_DoomswordStrike.Power, hits: 1, hitsAll: false);

            var chaosGuard = CreateSupportSkill("SKL_F4N_ChaosGuard",
                ApocalypseKnightDesign.Action_ChaosGuard.Name,
                ApocalypseKnightDesign.Action_ChaosGuard.Desc,
                ApocalypseKnightDesign.Action_ChaosGuard.ShieldRestore);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F4N_ApocalypseKnight.asset");
            enemy.EnemyName  = ApocalypseKnightDesign.EnemyName;
            enemy.Lore       = ApocalypseKnightDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ApocalypseKnightDesign.MaxHP,
                PhysicalAttack  = ApocalypseKnightDesign.PhysicalAttack,
                MagicAttack     = ApocalypseKnightDesign.MagicAttack,
                PhysicalDefense = ApocalypseKnightDesign.PhysicalDefense,
                MagicDefense    = ApocalypseKnightDesign.MagicDefense,
                Speed           = ApocalypseKnightDesign.Speed,
            };
            enemy.ShieldPoints = ApocalypseKnightDesign.ShieldPoints;
            enemy.ExpReward    = ApocalypseKnightDesign.ExpReward;
            enemy.JPReward     = ApocalypseKnightDesign.JPReward;
            enemy.GoldReward   = ApocalypseKnightDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Light, ElementType.Fire, ElementType.Physical };
            enemy.IsUndead = ApocalypseKnightDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = doomswordStrike.SkillName,
                    Skill           = doomswordStrike,
                    Priority        = ApocalypseKnightDesign.Action_DoomswordStrike.Priority,
                    UseChance       = ApocalypseKnightDesign.Action_DoomswordStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chaosGuard.SkillName,
                    Skill           = chaosGuard,
                    Priority        = ApocalypseKnightDesign.Action_ChaosGuard.Priority,
                    UseChance       = ApocalypseKnightDesign.Action_ChaosGuard.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ② 混沌の爪獣
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateChaosBeast()
        {
            var chaosClaw = CreatePhysSkill("SKL_F4N_ChaosClaw",
                ChaosBeastDesign.Action_ChaosClaw.Name,
                ChaosBeastDesign.Action_ChaosClaw.Desc,
                ChaosBeastDesign.Action_ChaosClaw.Power, hits: 1, hitsAll: false);

            var lacerateTear = CreateStatusSkill("SKL_F4N_LacerateTear",
                ChaosBeastDesign.Action_LacerateTear.Name,
                ChaosBeastDesign.Action_LacerateTear.Desc,
                ChaosBeastDesign.Action_LacerateTear.StatusChance,
                StatusEffectType.Bleed, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F4N_ChaosBeast.asset");
            enemy.EnemyName  = ChaosBeastDesign.EnemyName;
            enemy.Lore       = ChaosBeastDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ChaosBeastDesign.MaxHP,
                PhysicalAttack  = ChaosBeastDesign.PhysicalAttack,
                MagicAttack     = ChaosBeastDesign.MagicAttack,
                PhysicalDefense = ChaosBeastDesign.PhysicalDefense,
                MagicDefense    = ChaosBeastDesign.MagicDefense,
                Speed           = ChaosBeastDesign.Speed,
            };
            enemy.ShieldPoints = ChaosBeastDesign.ShieldPoints;
            enemy.ExpReward    = ChaosBeastDesign.ExpReward;
            enemy.JPReward     = ChaosBeastDesign.JPReward;
            enemy.GoldReward   = ChaosBeastDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Ice, ElementType.Lightning, ElementType.Physical };
            enemy.IsUndead = ChaosBeastDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = chaosClaw.SkillName,
                    Skill           = chaosClaw,
                    Priority        = ChaosBeastDesign.Action_ChaosClaw.Priority,
                    UseChance       = ChaosBeastDesign.Action_ChaosClaw.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = lacerateTear.SkillName,
                    Skill           = lacerateTear,
                    Priority        = ChaosBeastDesign.Action_LacerateTear.Priority,
                    UseChance       = ChaosBeastDesign.Action_LacerateTear.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ③ 虚無の霊体
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateVoidSpecter()
        {
            var voidWave = CreateMagicSkill("SKL_F4N_VoidWave",
                VoidSpecterDesign.Action_VoidWave.Name,
                VoidSpecterDesign.Action_VoidWave.Desc,
                ElementType.Dark,
                VoidSpecterDesign.Action_VoidWave.Power, hits: 1, hitsAll: false);

            var chaosWhisper = CreateStatusSkill("SKL_F4N_ChaosWhisper",
                VoidSpecterDesign.Action_ChaosWhisper.Name,
                VoidSpecterDesign.Action_ChaosWhisper.Desc,
                VoidSpecterDesign.Action_ChaosWhisper.StatusChance,
                StatusEffectType.Silence, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F4N_VoidSpecter.asset");
            enemy.EnemyName  = VoidSpecterDesign.EnemyName;
            enemy.Lore       = VoidSpecterDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = VoidSpecterDesign.MaxHP,
                PhysicalAttack  = VoidSpecterDesign.PhysicalAttack,
                MagicAttack     = VoidSpecterDesign.MagicAttack,
                PhysicalDefense = VoidSpecterDesign.PhysicalDefense,
                MagicDefense    = VoidSpecterDesign.MagicDefense,
                Speed           = VoidSpecterDesign.Speed,
            };
            enemy.ShieldPoints = VoidSpecterDesign.ShieldPoints;
            enemy.ExpReward    = VoidSpecterDesign.ExpReward;
            enemy.JPReward     = VoidSpecterDesign.JPReward;
            enemy.GoldReward   = VoidSpecterDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light, ElementType.Physical };
            enemy.IsUndead = VoidSpecterDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = voidWave.SkillName,
                    Skill           = voidWave,
                    Priority        = VoidSpecterDesign.Action_VoidWave.Priority,
                    UseChance       = VoidSpecterDesign.Action_VoidWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = chaosWhisper.SkillName,
                    Skill           = chaosWhisper,
                    Priority        = VoidSpecterDesign.Action_ChaosWhisper.Priority,
                    UseChance       = VoidSpecterDesign.Action_ChaosWhisper.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = VoidSpecterDesign.Action_ChaosWhisper.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ④ 崩壊の巨人
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateCollapseGiant()
        {
            var collapseFist = CreatePhysSkill("SKL_F4N_CollapseFist",
                CollapseGiantDesign.Action_CollapseFist.Name,
                CollapseGiantDesign.Action_CollapseFist.Desc,
                CollapseGiantDesign.Action_CollapseFist.Power, hits: 1, hitsAll: false);

            var doomstompAll = CreatePhysSkill("SKL_F4N_DoomstompAll",
                CollapseGiantDesign.Action_DoomstompAll.Name,
                CollapseGiantDesign.Action_DoomstompAll.Desc,
                CollapseGiantDesign.Action_DoomstompAll.Power, hits: 1, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F4N_CollapseGiant.asset");
            enemy.EnemyName  = CollapseGiantDesign.EnemyName;
            enemy.Lore       = CollapseGiantDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = CollapseGiantDesign.MaxHP,
                PhysicalAttack  = CollapseGiantDesign.PhysicalAttack,
                MagicAttack     = CollapseGiantDesign.MagicAttack,
                PhysicalDefense = CollapseGiantDesign.PhysicalDefense,
                MagicDefense    = CollapseGiantDesign.MagicDefense,
                Speed           = CollapseGiantDesign.Speed,
            };
            enemy.ShieldPoints = CollapseGiantDesign.ShieldPoints;
            enemy.ExpReward    = CollapseGiantDesign.ExpReward;
            enemy.JPReward     = CollapseGiantDesign.JPReward;
            enemy.GoldReward   = CollapseGiantDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Lightning, ElementType.Wind, ElementType.Physical };
            enemy.IsUndead = CollapseGiantDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = collapseFist.SkillName,
                    Skill           = collapseFist,
                    Priority        = CollapseGiantDesign.Action_CollapseFist.Priority,
                    UseChance       = CollapseGiantDesign.Action_CollapseFist.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = doomstompAll.SkillName,
                    Skill           = doomstompAll,
                    Priority        = CollapseGiantDesign.Action_DoomstompAll.Priority,
                    UseChance       = CollapseGiantDesign.Action_DoomstompAll.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
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
            EnemyData knight,      EnemyData chaosBeast,
            EnemyData voidSpecter, EnemyData collapseGiant)
        {
            var floor = CreateOrLoad<FloorData>(FloorDir + "/FLD_Floor4.asset");

            floor.FloorIndex = 4;
            if (string.IsNullOrEmpty(floor.FloorName))
                floor.FloorName = "混沌の終末域";

            floor.NormalEncounters = new List<EnemyEncounterGroup>
            {
                new() {
                    GroupName = "終末の哨戒",
                    Enemies   = new List<EnemyData> { knight },
                    Weight    = 1.2f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "騎士の双撃",
                    Enemies   = new List<EnemyData> { knight, knight },
                    Weight    = 1.0f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "混沌の急襲",
                    Enemies   = new List<EnemyData> { chaosBeast, knight },
                    Weight    = 0.9f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "虚無の祭壇",
                    Enemies   = new List<EnemyData> { voidSpecter, voidSpecter, chaosBeast },
                    Weight    = 0.8f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "崩壊の巨人",
                    Enemies   = new List<EnemyData> { collapseGiant },
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
            sk.Element        = ElementType.Physical;
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
            sk.IsHeal         = false;
            sk.ShieldRestore  = shieldRestore;
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
