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
    /// Floor 3「古代遺跡の回廊」通常敵 4 体と NormalEncounters 5 グループを自動生成するツール。
    ///   ① 遺跡の石兵
    ///   ② 毒砂蛇
    ///   ③ 封印の亡霊
    ///   ④ 古代の巨人兵
    /// 生成後、FloorData (FLD_Floor3) の NormalEncounters に 5 グループを登録します。
    /// Menu: DarkChronicle → Generate → Floor3 Normal Enemies
    /// </summary>
    public static class Floor3NormalSOGenerator
    {
        const string EnemyDir = "Assets/Data/Enemies/Floor3/Normal";
        const string SkillDir = EnemyDir + "/Skills";
        const string FloorDir = "Assets/Data/Floors";

        [MenuItem("DarkChronicle/Generate/Floor3 Normal Enemies")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            var stoneSoldier    = GenerateRuinStoneSoldier();
            var sandSerpent     = GeneratePoisonSandSerpent();
            var sealedWraith    = GenerateSealedWraith();
            var giantSoldier    = GenerateAncientGiantSoldier();

            GenerateFloorData(stoneSoldier, sandSerpent, sealedWraith, giantSoldier);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor3NormalSOGenerator] All Floor 3 normal enemy assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor3",
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
        //   ① 遺跡の石兵
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateRuinStoneSoldier()
        {
            var stoneStrike = CreatePhysSkill("SKL_F3N_StoneStrike",
                RuinStoneSoldierDesign.Action_StoneStrike.Name,
                RuinStoneSoldierDesign.Action_StoneStrike.Desc,
                RuinStoneSoldierDesign.Action_StoneStrike.Power, hits: 1, hitsAll: false);

            var steadfastStance = CreateSupportSkill("SKL_F3N_SteadfastStance",
                RuinStoneSoldierDesign.Action_SteadfastStance.Name,
                RuinStoneSoldierDesign.Action_SteadfastStance.Desc);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F3N_RuinStoneSoldier.asset");
            enemy.EnemyName  = RuinStoneSoldierDesign.EnemyName;
            enemy.Lore       = RuinStoneSoldierDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = RuinStoneSoldierDesign.MaxHP,
                PhysicalAttack  = RuinStoneSoldierDesign.PhysicalAttack,
                MagicAttack     = RuinStoneSoldierDesign.MagicAttack,
                PhysicalDefense = RuinStoneSoldierDesign.PhysicalDefense,
                MagicDefense    = RuinStoneSoldierDesign.MagicDefense,
                Speed           = RuinStoneSoldierDesign.Speed,
            };
            enemy.ShieldPoints = RuinStoneSoldierDesign.ShieldPoints;
            enemy.ExpReward    = RuinStoneSoldierDesign.ExpReward;
            enemy.JPReward     = RuinStoneSoldierDesign.JPReward;
            enemy.GoldReward   = RuinStoneSoldierDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Lightning, ElementType.Wind };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = RuinStoneSoldierDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = stoneStrike.SkillName,
                    Skill           = stoneStrike,
                    Priority        = RuinStoneSoldierDesign.Action_StoneStrike.Priority,
                    UseChance       = RuinStoneSoldierDesign.Action_StoneStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = steadfastStance.SkillName,
                    Skill           = steadfastStance,
                    Priority        = RuinStoneSoldierDesign.Action_SteadfastStance.Priority,
                    UseChance       = RuinStoneSoldierDesign.Action_SteadfastStance.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ② 毒砂蛇
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GeneratePoisonSandSerpent()
        {
            var poisonFang = CreatePhysSkill("SKL_F3N_PoisonFang",
                PoisonSandSerpentDesign.Action_PoisonFang.Name,
                PoisonSandSerpentDesign.Action_PoisonFang.Desc,
                PoisonSandSerpentDesign.Action_PoisonFang.Power, hits: 1, hitsAll: false);

            var venomBreath = CreateStatusSkill("SKL_F3N_VenomBreath",
                PoisonSandSerpentDesign.Action_VenomBreath.Name,
                PoisonSandSerpentDesign.Action_VenomBreath.Desc,
                PoisonSandSerpentDesign.Action_VenomBreath.StatusChance,
                StatusEffectType.Poison, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F3N_PoisonSandSerpent.asset");
            enemy.EnemyName  = PoisonSandSerpentDesign.EnemyName;
            enemy.Lore       = PoisonSandSerpentDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = PoisonSandSerpentDesign.MaxHP,
                PhysicalAttack  = PoisonSandSerpentDesign.PhysicalAttack,
                MagicAttack     = PoisonSandSerpentDesign.MagicAttack,
                PhysicalDefense = PoisonSandSerpentDesign.PhysicalDefense,
                MagicDefense    = PoisonSandSerpentDesign.MagicDefense,
                Speed           = PoisonSandSerpentDesign.Speed,
            };
            enemy.ShieldPoints = PoisonSandSerpentDesign.ShieldPoints;
            enemy.ExpReward    = PoisonSandSerpentDesign.ExpReward;
            enemy.JPReward     = PoisonSandSerpentDesign.JPReward;
            enemy.GoldReward   = PoisonSandSerpentDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Ice, ElementType.Fire };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Sword };
            enemy.IsUndead = PoisonSandSerpentDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = poisonFang.SkillName,
                    Skill           = poisonFang,
                    Priority        = PoisonSandSerpentDesign.Action_PoisonFang.Priority,
                    UseChance       = PoisonSandSerpentDesign.Action_PoisonFang.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = venomBreath.SkillName,
                    Skill           = venomBreath,
                    Priority        = PoisonSandSerpentDesign.Action_VenomBreath.Priority,
                    UseChance       = PoisonSandSerpentDesign.Action_VenomBreath.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ③ 封印の亡霊
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateSealedWraith()
        {
            var ancientCurse = CreateMagicSkill("SKL_F3N_AncientCurse",
                SealedWraithDesign.Action_AncientCurse.Name,
                SealedWraithDesign.Action_AncientCurse.Desc,
                ElementType.Dark,
                SealedWraithDesign.Action_AncientCurse.Power, hits: 1, hitsAll: false);

            var sealBind = CreateStatusSkill("SKL_F3N_SealBind",
                SealedWraithDesign.Action_SealBind.Name,
                SealedWraithDesign.Action_SealBind.Desc,
                SealedWraithDesign.Action_SealBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F3N_SealedWraith.asset");
            enemy.EnemyName  = SealedWraithDesign.EnemyName;
            enemy.Lore       = SealedWraithDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = SealedWraithDesign.MaxHP,
                PhysicalAttack  = SealedWraithDesign.PhysicalAttack,
                MagicAttack     = SealedWraithDesign.MagicAttack,
                PhysicalDefense = SealedWraithDesign.PhysicalDefense,
                MagicDefense    = SealedWraithDesign.MagicDefense,
                Speed           = SealedWraithDesign.Speed,
            };
            enemy.ShieldPoints = SealedWraithDesign.ShieldPoints;
            enemy.ExpReward    = SealedWraithDesign.ExpReward;
            enemy.JPReward     = SealedWraithDesign.JPReward;
            enemy.GoldReward   = SealedWraithDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Tome };
            enemy.IsUndead = SealedWraithDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = ancientCurse.SkillName,
                    Skill           = ancientCurse,
                    Priority        = SealedWraithDesign.Action_AncientCurse.Priority,
                    UseChance       = SealedWraithDesign.Action_AncientCurse.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = sealBind.SkillName,
                    Skill           = sealBind,
                    Priority        = SealedWraithDesign.Action_SealBind.Priority,
                    UseChance       = SealedWraithDesign.Action_SealBind.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = SealedWraithDesign.Action_SealBind.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ④ 古代の巨人兵
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateAncientGiantSoldier()
        {
            var giantStomp = CreatePhysSkill("SKL_F3N_GiantStomp",
                AncientGiantSoldierDesign.Action_GiantStomp.Name,
                AncientGiantSoldierDesign.Action_GiantStomp.Desc,
                AncientGiantSoldierDesign.Action_GiantStomp.Power, hits: 1, hitsAll: false);

            var collapseSwing = CreatePhysSkill("SKL_F3N_CollapseSwing",
                AncientGiantSoldierDesign.Action_CollapseSwing.Name,
                AncientGiantSoldierDesign.Action_CollapseSwing.Desc,
                AncientGiantSoldierDesign.Action_CollapseSwing.Power, hits: 1, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F3N_AncientGiantSoldier.asset");
            enemy.EnemyName  = AncientGiantSoldierDesign.EnemyName;
            enemy.Lore       = AncientGiantSoldierDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = AncientGiantSoldierDesign.MaxHP,
                PhysicalAttack  = AncientGiantSoldierDesign.PhysicalAttack,
                MagicAttack     = AncientGiantSoldierDesign.MagicAttack,
                PhysicalDefense = AncientGiantSoldierDesign.PhysicalDefense,
                MagicDefense    = AncientGiantSoldierDesign.MagicDefense,
                Speed           = AncientGiantSoldierDesign.Speed,
            };
            enemy.ShieldPoints = AncientGiantSoldierDesign.ShieldPoints;
            enemy.ExpReward    = AncientGiantSoldierDesign.ExpReward;
            enemy.JPReward     = AncientGiantSoldierDesign.JPReward;
            enemy.GoldReward   = AncientGiantSoldierDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Lightning, ElementType.Wind };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = AncientGiantSoldierDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = giantStomp.SkillName,
                    Skill           = giantStomp,
                    Priority        = AncientGiantSoldierDesign.Action_GiantStomp.Priority,
                    UseChance       = AncientGiantSoldierDesign.Action_GiantStomp.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = collapseSwing.SkillName,
                    Skill           = collapseSwing,
                    Priority        = AncientGiantSoldierDesign.Action_CollapseSwing.Priority,
                    UseChance       = AncientGiantSoldierDesign.Action_CollapseSwing.UseChance,
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
            EnemyData stoneSoldier, EnemyData sandSerpent,
            EnemyData sealedWraith, EnemyData giantSoldier)
        {
            var floor = CreateOrLoad<FloorData>(FloorDir + "/FLD_Floor3.asset");

            floor.FloorIndex = 3;
            if (string.IsNullOrEmpty(floor.FloorName))
                floor.FloorName = "古代遺跡の回廊";

            floor.NormalEncounters = new List<EnemyEncounterGroup>
            {
                new() {
                    GroupName = "石兵の哨戒",
                    Enemies   = new List<EnemyData> { stoneSoldier },
                    Weight    = 1.2f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "石兵の双騎",
                    Enemies   = new List<EnemyData> { stoneSoldier, stoneSoldier },
                    Weight    = 1.0f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "砂蛇と石兵",
                    Enemies   = new List<EnemyData> { sandSerpent, stoneSoldier },
                    Weight    = 0.9f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "封印の祭壇",
                    Enemies   = new List<EnemyData> { sealedWraith, sealedWraith, sandSerpent },
                    Weight    = 0.8f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "古代の巨人兵",
                    Enemies   = new List<EnemyData> { giantSoldier },
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
