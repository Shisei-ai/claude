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
    /// Floor 2「呪われた城」通常敵 4 体と NormalEncounters 5 グループを自動生成するツール。
    ///   ① 呪われた衛兵
    ///   ② 呪血蝙蝠
    ///   ③ 城の怨霊
    ///   ④ 影の処刑人
    /// 生成後、FloorData (FLD_Floor2) の NormalEncounters に 5 グループを登録します。
    /// Menu: DarkChronicle → Generate → Floor2 Normal Enemies
    /// </summary>
    public static class Floor2NormalSOGenerator
    {
        const string EnemyDir = "Assets/Data/Enemies/Floor2/Normal";
        const string SkillDir = EnemyDir + "/Skills";
        const string FloorDir = "Assets/Data/Floors";

        [MenuItem("DarkChronicle/Generate/Floor2 Normal Enemies")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            var cursedGuard      = GenerateCursedGuard();
            var bloodBat         = GenerateCurseBloodBat();
            var castleWraith     = GenerateCastleWraith();
            var shadowExecutioner = GenerateShadowExecutioner();

            GenerateFloorData(cursedGuard, bloodBat, castleWraith, shadowExecutioner);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor2NormalSOGenerator] All Floor 2 normal enemy assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor2",
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
        //   ① 呪われた衛兵
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateCursedGuard()
        {
            var swordStrike = CreatePhysSkill("SKL_F2N_SwordStrike",
                CursedGuardDesign.Action_SwordStrike.Name,
                CursedGuardDesign.Action_SwordStrike.Desc,
                CursedGuardDesign.Action_SwordStrike.Power, hits: 1, hitsAll: false);

            var cursedShield = CreateSupportSkill("SKL_F2N_CursedShield",
                CursedGuardDesign.Action_CursedShield.Name,
                CursedGuardDesign.Action_CursedShield.Desc);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F2N_CursedGuard.asset");
            enemy.EnemyName  = CursedGuardDesign.EnemyName;
            enemy.Lore       = CursedGuardDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = CursedGuardDesign.MaxHP,
                PhysicalAttack  = CursedGuardDesign.PhysicalAttack,
                MagicAttack     = CursedGuardDesign.MagicAttack,
                PhysicalDefense = CursedGuardDesign.PhysicalDefense,
                MagicDefense    = CursedGuardDesign.MagicDefense,
                Speed           = CursedGuardDesign.Speed,
            };
            enemy.ShieldPoints = CursedGuardDesign.ShieldPoints;
            enemy.ExpReward    = CursedGuardDesign.ExpReward;
            enemy.JPReward     = CursedGuardDesign.JPReward;
            enemy.GoldReward   = CursedGuardDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = CursedGuardDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = swordStrike.SkillName,
                    Skill           = swordStrike,
                    Priority        = CursedGuardDesign.Action_SwordStrike.Priority,
                    UseChance       = CursedGuardDesign.Action_SwordStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = cursedShield.SkillName,
                    Skill           = cursedShield,
                    Priority        = CursedGuardDesign.Action_CursedShield.Priority,
                    UseChance       = CursedGuardDesign.Action_CursedShield.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ② 呪血蝙蝠
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateCurseBloodBat()
        {
            var bloodBite = CreatePhysSkill("SKL_F2N_BloodBite",
                CurseBloodBatDesign.Action_BloodBite.Name,
                CurseBloodBatDesign.Action_BloodBite.Desc,
                CurseBloodBatDesign.Action_BloodBite.Power, hits: 1, hitsAll: false);

            var bloodDrain = CreateStatusSkill("SKL_F2N_BloodDrain",
                CurseBloodBatDesign.Action_BloodDrain.Name,
                CurseBloodBatDesign.Action_BloodDrain.Desc,
                CurseBloodBatDesign.Action_BloodDrain.StatusChance,
                StatusEffectType.Bleed, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F2N_CurseBloodBat.asset");
            enemy.EnemyName  = CurseBloodBatDesign.EnemyName;
            enemy.Lore       = CurseBloodBatDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = CurseBloodBatDesign.MaxHP,
                PhysicalAttack  = CurseBloodBatDesign.PhysicalAttack,
                MagicAttack     = CurseBloodBatDesign.MagicAttack,
                PhysicalDefense = CurseBloodBatDesign.PhysicalDefense,
                MagicDefense    = CurseBloodBatDesign.MagicDefense,
                Speed           = CurseBloodBatDesign.Speed,
            };
            enemy.ShieldPoints = CurseBloodBatDesign.ShieldPoints;
            enemy.ExpReward    = CurseBloodBatDesign.ExpReward;
            enemy.JPReward     = CurseBloodBatDesign.JPReward;
            enemy.GoldReward   = CurseBloodBatDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Bow };
            enemy.IsUndead = CurseBloodBatDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = bloodBite.SkillName,
                    Skill           = bloodBite,
                    Priority        = CurseBloodBatDesign.Action_BloodBite.Priority,
                    UseChance       = CurseBloodBatDesign.Action_BloodBite.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bloodDrain.SkillName,
                    Skill           = bloodDrain,
                    Priority        = CurseBloodBatDesign.Action_BloodDrain.Priority,
                    UseChance       = CurseBloodBatDesign.Action_BloodDrain.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ③ 城の怨霊
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateCastleWraith()
        {
            var grudgeWave = CreateMagicSkill("SKL_F2N_GrudgeWave",
                CastleWraithDesign.Action_GrudgeWave.Name,
                CastleWraithDesign.Action_GrudgeWave.Desc,
                ElementType.Dark,
                CastleWraithDesign.Action_GrudgeWave.Power, hits: 1, hitsAll: false);

            var cursingGaze = CreateStatusSkill("SKL_F2N_CursingGaze",
                CastleWraithDesign.Action_CursingGaze.Name,
                CastleWraithDesign.Action_CursingGaze.Desc,
                CastleWraithDesign.Action_CursingGaze.StatusChance,
                StatusEffectType.Blind, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F2N_CastleWraith.asset");
            enemy.EnemyName  = CastleWraithDesign.EnemyName;
            enemy.Lore       = CastleWraithDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = CastleWraithDesign.MaxHP,
                PhysicalAttack  = CastleWraithDesign.PhysicalAttack,
                MagicAttack     = CastleWraithDesign.MagicAttack,
                PhysicalDefense = CastleWraithDesign.PhysicalDefense,
                MagicDefense    = CastleWraithDesign.MagicDefense,
                Speed           = CastleWraithDesign.Speed,
            };
            enemy.ShieldPoints = CastleWraithDesign.ShieldPoints;
            enemy.ExpReward    = CastleWraithDesign.ExpReward;
            enemy.JPReward     = CastleWraithDesign.JPReward;
            enemy.GoldReward   = CastleWraithDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Staff };
            enemy.IsUndead = CastleWraithDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = grudgeWave.SkillName,
                    Skill           = grudgeWave,
                    Priority        = CastleWraithDesign.Action_GrudgeWave.Priority,
                    UseChance       = CastleWraithDesign.Action_GrudgeWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = cursingGaze.SkillName,
                    Skill           = cursingGaze,
                    Priority        = CastleWraithDesign.Action_CursingGaze.Priority,
                    UseChance       = CastleWraithDesign.Action_CursingGaze.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = CastleWraithDesign.Action_CursingGaze.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ④ 影の処刑人
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateShadowExecutioner()
        {
            var executionStrike = CreatePhysSkill("SKL_F2N_ExecutionStrike",
                ShadowExecutionerDesign.Action_ExecutionStrike.Name,
                ShadowExecutionerDesign.Action_ExecutionStrike.Desc,
                ShadowExecutionerDesign.Action_ExecutionStrike.Power, hits: 1, hitsAll: false);

            var judgmentSweep = CreatePhysSkill("SKL_F2N_JudgmentSweep",
                ShadowExecutionerDesign.Action_JudgmentSweep.Name,
                ShadowExecutionerDesign.Action_JudgmentSweep.Desc,
                ShadowExecutionerDesign.Action_JudgmentSweep.Power, hits: 1, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F2N_ShadowExecutioner.asset");
            enemy.EnemyName  = ShadowExecutionerDesign.EnemyName;
            enemy.Lore       = ShadowExecutionerDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ShadowExecutionerDesign.MaxHP,
                PhysicalAttack  = ShadowExecutionerDesign.PhysicalAttack,
                MagicAttack     = ShadowExecutionerDesign.MagicAttack,
                PhysicalDefense = ShadowExecutionerDesign.PhysicalDefense,
                MagicDefense    = ShadowExecutionerDesign.MagicDefense,
                Speed           = ShadowExecutionerDesign.Speed,
            };
            enemy.ShieldPoints = ShadowExecutionerDesign.ShieldPoints;
            enemy.ExpReward    = ShadowExecutionerDesign.ExpReward;
            enemy.JPReward     = ShadowExecutionerDesign.JPReward;
            enemy.GoldReward   = ShadowExecutionerDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = ShadowExecutionerDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = executionStrike.SkillName,
                    Skill           = executionStrike,
                    Priority        = ShadowExecutionerDesign.Action_ExecutionStrike.Priority,
                    UseChance       = ShadowExecutionerDesign.Action_ExecutionStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = judgmentSweep.SkillName,
                    Skill           = judgmentSweep,
                    Priority        = ShadowExecutionerDesign.Action_JudgmentSweep.Priority,
                    UseChance       = ShadowExecutionerDesign.Action_JudgmentSweep.UseChance,
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
            EnemyData cursedGuard,  EnemyData bloodBat,
            EnemyData castleWraith, EnemyData shadowExecutioner)
        {
            var floor = CreateOrLoad<FloorData>(FloorDir + "/FLD_Floor2.asset");

            floor.FloorIndex = 2;
            if (string.IsNullOrEmpty(floor.FloorName))
                floor.FloorName = "呪われた城";

            floor.NormalEncounters = new List<EnemyEncounterGroup>
            {
                new() {
                    GroupName = "呪われた衛兵の単騎",
                    Enemies   = new List<EnemyData> { cursedGuard },
                    Weight    = 1.2f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "衛兵の双撃",
                    Enemies   = new List<EnemyData> { cursedGuard, cursedGuard },
                    Weight    = 1.0f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "血と鋼の挟撃",
                    Enemies   = new List<EnemyData> { bloodBat, cursedGuard },
                    Weight    = 0.9f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "怨霊の祭壇",
                    Enemies   = new List<EnemyData> { castleWraith, castleWraith, bloodBat },
                    Weight    = 0.8f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "影の処刑人",
                    Enemies   = new List<EnemyData> { shadowExecutioner },
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
