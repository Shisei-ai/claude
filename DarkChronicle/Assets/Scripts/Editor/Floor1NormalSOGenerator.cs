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
    /// Floor 1「暗黒の森」通常敵 4 体と NormalEncounters 5 グループを自動生成するツール。
    ///   ① 闇色の狼
    ///   ② 毒胞子菌
    ///   ③ 森の妖精
    ///   ④ 絡み蔓
    /// 生成後、FloorData (FLD_Floor1) の NormalEncounters に 5 グループを登録します。
    /// Menu: DarkChronicle → Generate → Floor1 Normal Enemies
    /// </summary>
    public static class Floor1NormalSOGenerator
    {
        const string EnemyDir = "Assets/Data/Enemies/Floor1/Normal";
        const string SkillDir = EnemyDir + "/Skills";
        const string FloorDir = "Assets/Data/Floors";

        [MenuItem("DarkChronicle/Generate/Floor1 Normal Enemies")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            var darkWolf   = GenerateDarkWolf();
            var fungus     = GenerateToxicSporeFungus();
            var sprite     = GenerateForestSprite();
            var vine       = GenerateEntanglingVine();

            GenerateFloorData(darkWolf, fungus, sprite, vine);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor1NormalSOGenerator] All Floor 1 normal enemy assets generated.");
        }

        static void EnsureDirectories()
        {
            var dirs = new[]
            {
                "Assets/Data",
                "Assets/Data/Enemies",
                "Assets/Data/Enemies/Floor1",
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
        //   ① 闇色の狼
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateDarkWolf()
        {
            var fangStrike = CreatePhysSkill("SKL_F1N_FangStrike",
                DarkWolfDesign.Action_FangStrike.Name,
                DarkWolfDesign.Action_FangStrike.Desc,
                DarkWolfDesign.Action_FangStrike.Power, hits: 1, hitsAll: false);

            var darkHowl = CreateStatusSkill("SKL_F1N_DarkHowl",
                DarkWolfDesign.Action_DarkHowl.Name,
                DarkWolfDesign.Action_DarkHowl.Desc,
                DarkWolfDesign.Action_DarkHowl.StatusChance,
                StatusEffectType.Blind, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F1N_DarkWolf.asset");
            enemy.EnemyName  = DarkWolfDesign.EnemyName;
            enemy.Lore       = DarkWolfDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = DarkWolfDesign.MaxHP,
                PhysicalAttack  = DarkWolfDesign.PhysicalAttack,
                MagicAttack     = DarkWolfDesign.MagicAttack,
                PhysicalDefense = DarkWolfDesign.PhysicalDefense,
                MagicDefense    = DarkWolfDesign.MagicDefense,
                Speed           = DarkWolfDesign.Speed,
            };
            enemy.ShieldPoints = DarkWolfDesign.ShieldPoints;
            enemy.ExpReward    = DarkWolfDesign.ExpReward;
            enemy.JPReward     = DarkWolfDesign.JPReward;
            enemy.GoldReward   = DarkWolfDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Sword };
            enemy.IsUndead = DarkWolfDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = fangStrike.SkillName,
                    Skill           = fangStrike,
                    Priority        = DarkWolfDesign.Action_FangStrike.Priority,
                    UseChance       = DarkWolfDesign.Action_FangStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = darkHowl.SkillName,
                    Skill           = darkHowl,
                    Priority        = DarkWolfDesign.Action_DarkHowl.Priority,
                    UseChance       = DarkWolfDesign.Action_DarkHowl.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ② 毒胞子菌
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateToxicSporeFungus()
        {
            var sporeCloud = CreateStatusSkill("SKL_F1N_SporeCloud",
                ToxicSporeFungusDesign.Action_SporeCloud.Name,
                ToxicSporeFungusDesign.Action_SporeCloud.Desc,
                ToxicSporeFungusDesign.Action_SporeCloud.StatusChance,
                StatusEffectType.Poison, hitsAll: false);

            var myceliumBurst = CreateMagicSkill("SKL_F1N_MyceliumBurst",
                ToxicSporeFungusDesign.Action_MyceliumBurst.Name,
                ToxicSporeFungusDesign.Action_MyceliumBurst.Desc,
                ElementType.Wind,
                ToxicSporeFungusDesign.Action_MyceliumBurst.Power, hits: 1, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F1N_ToxicSporeFungus.asset");
            enemy.EnemyName  = ToxicSporeFungusDesign.EnemyName;
            enemy.Lore       = ToxicSporeFungusDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ToxicSporeFungusDesign.MaxHP,
                PhysicalAttack  = ToxicSporeFungusDesign.PhysicalAttack,
                MagicAttack     = ToxicSporeFungusDesign.MagicAttack,
                PhysicalDefense = ToxicSporeFungusDesign.PhysicalDefense,
                MagicDefense    = ToxicSporeFungusDesign.MagicDefense,
                Speed           = ToxicSporeFungusDesign.Speed,
            };
            enemy.ShieldPoints = ToxicSporeFungusDesign.ShieldPoints;
            enemy.ExpReward    = ToxicSporeFungusDesign.ExpReward;
            enemy.JPReward     = ToxicSporeFungusDesign.JPReward;
            enemy.GoldReward   = ToxicSporeFungusDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = ToxicSporeFungusDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = sporeCloud.SkillName,
                    Skill           = sporeCloud,
                    Priority        = ToxicSporeFungusDesign.Action_SporeCloud.Priority,
                    UseChance       = ToxicSporeFungusDesign.Action_SporeCloud.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = myceliumBurst.SkillName,
                    Skill           = myceliumBurst,
                    Priority        = ToxicSporeFungusDesign.Action_MyceliumBurst.Priority,
                    UseChance       = ToxicSporeFungusDesign.Action_MyceliumBurst.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ③ 森の妖精
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateForestSprite()
        {
            var fairyPebble = CreateMagicSkill("SKL_F1N_FairyPebble",
                ForestSpriteDesign.Action_FairyPebble.Name,
                ForestSpriteDesign.Action_FairyPebble.Desc,
                ElementType.Wind,
                ForestSpriteDesign.Action_FairyPebble.Power, hits: 1, hitsAll: false);

            var bewitchingDust = CreateStatusSkill("SKL_F1N_BewitchingDust",
                ForestSpriteDesign.Action_BewitchingDust.Name,
                ForestSpriteDesign.Action_BewitchingDust.Desc,
                ForestSpriteDesign.Action_BewitchingDust.StatusChance,
                StatusEffectType.Sleep, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F1N_ForestSprite.asset");
            enemy.EnemyName  = ForestSpriteDesign.EnemyName;
            enemy.Lore       = ForestSpriteDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = ForestSpriteDesign.MaxHP,
                PhysicalAttack  = ForestSpriteDesign.PhysicalAttack,
                MagicAttack     = ForestSpriteDesign.MagicAttack,
                PhysicalDefense = ForestSpriteDesign.PhysicalDefense,
                MagicDefense    = ForestSpriteDesign.MagicDefense,
                Speed           = ForestSpriteDesign.Speed,
            };
            enemy.ShieldPoints = ForestSpriteDesign.ShieldPoints;
            enemy.ExpReward    = ForestSpriteDesign.ExpReward;
            enemy.JPReward     = ForestSpriteDesign.JPReward;
            enemy.GoldReward   = ForestSpriteDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Bow };
            enemy.IsUndead = ForestSpriteDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = fairyPebble.SkillName,
                    Skill           = fairyPebble,
                    Priority        = ForestSpriteDesign.Action_FairyPebble.Priority,
                    UseChance       = ForestSpriteDesign.Action_FairyPebble.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bewitchingDust.SkillName,
                    Skill           = bewitchingDust,
                    Priority        = ForestSpriteDesign.Action_BewitchingDust.Priority,
                    UseChance       = ForestSpriteDesign.Action_BewitchingDust.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = ForestSpriteDesign.Action_BewitchingDust.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
            return enemy;
        }

        // ══════════════════════════════════════════════════════════════════
        //   ④ 絡み蔓
        // ══════════════════════════════════════════════════════════════════
        static EnemyData GenerateEntanglingVine()
        {
            var vineWhip = CreatePhysSkill("SKL_F1N_VineWhip",
                EntanglingVineDesign.Action_VineWhip.Name,
                EntanglingVineDesign.Action_VineWhip.Desc,
                EntanglingVineDesign.Action_VineWhip.Power, hits: 1, hitsAll: false);

            var entangleBind = CreateStatusSkill("SKL_F1N_EntangleBind",
                EntanglingVineDesign.Action_EntangleBind.Name,
                EntanglingVineDesign.Action_EntangleBind.Desc,
                EntanglingVineDesign.Action_EntangleBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(EnemyDir + "/ENM_F1N_EntanglingVine.asset");
            enemy.EnemyName  = EntanglingVineDesign.EnemyName;
            enemy.Lore       = EntanglingVineDesign.Lore;
            enemy.Rank       = EnemyRank.Normal;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = EntanglingVineDesign.MaxHP,
                PhysicalAttack  = EntanglingVineDesign.PhysicalAttack,
                MagicAttack     = EntanglingVineDesign.MagicAttack,
                PhysicalDefense = EntanglingVineDesign.PhysicalDefense,
                MagicDefense    = EntanglingVineDesign.MagicDefense,
                Speed           = EntanglingVineDesign.Speed,
            };
            enemy.ShieldPoints = EntanglingVineDesign.ShieldPoints;
            enemy.ExpReward    = EntanglingVineDesign.ExpReward;
            enemy.JPReward     = EntanglingVineDesign.JPReward;
            enemy.GoldReward   = EntanglingVineDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = EntanglingVineDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = vineWhip.SkillName,
                    Skill           = vineWhip,
                    Priority        = EntanglingVineDesign.Action_VineWhip.Priority,
                    UseChance       = EntanglingVineDesign.Action_VineWhip.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = entangleBind.SkillName,
                    Skill           = entangleBind,
                    Priority        = EntanglingVineDesign.Action_EntangleBind.Priority,
                    UseChance       = EntanglingVineDesign.Action_EntangleBind.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = EntanglingVineDesign.Action_EntangleBind.IsAbsorbable,
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
            EnemyData darkWolf, EnemyData fungus,
            EnemyData sprite,   EnemyData vine)
        {
            var floor = CreateOrLoad<FloorData>(FloorDir + "/FLD_Floor1.asset");

            floor.FloorIndex = 1;
            if (string.IsNullOrEmpty(floor.FloorName))
                floor.FloorName = "暗黒の森";

            floor.NormalEncounters = new List<EnemyEncounterGroup>
            {
                new() {
                    GroupName = "森の孤狼",
                    Enemies   = new List<EnemyData> { darkWolf },
                    Weight    = 1.2f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "狼の群れ",
                    Enemies   = new List<EnemyData> { darkWolf, darkWolf },
                    Weight    = 1.0f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "森の混成",
                    Enemies   = new List<EnemyData> { fungus, darkWolf },
                    Weight    = 0.9f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "妖精の罠",
                    Enemies   = new List<EnemyData> { sprite, sprite, fungus },
                    Weight    = 0.8f,
                    MinFloor  = 0,
                },
                new() {
                    GroupName = "絡み蔓の潜伏",
                    Enemies   = new List<EnemyData> { vine },
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
