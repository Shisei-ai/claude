#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 4 エンディング分岐ボス 5 体の ScriptableObject アセットを生成するツール。
    ///   ① 魔王ヴァルナ＝マルアーク  (DemonKing)
    ///   ② 深淵神ウォルム            (AbyssGod)
    ///   ③ 時の亡霊エオン            (TimeWraith)
    ///   ④ 呪われた王アルドリック    (CursedKing)
    ///   ⑤ 世界の核（真の形態）      (TrueCore)
    /// Menu: DarkChronicle → Generate → Floor4 Boss Assets
    /// </summary>
    public static class Floor4BossSOGenerator
    {
        const string BaseDir = "Assets/Data/Enemies/Floor4/Bosses";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor4 Boss Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            GenerateDemonKing();
            GenerateAbyssGod();
            GenerateTimeWraith();
            GenerateCursedKing();
            GenerateTrueCore();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor4BossSOGenerator] All Floor 4 boss assets generated.");
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
        //   ① 魔王ヴァルナ＝マルアーク (DemonKing)
        // ══════════════════════════════════════════════════════════════════
        static void GenerateDemonKing()
        {
            // ── Phase 1 ─────────────────────────────────────────────────
            var demonSwordStrike = CreatePhysSkill("SKL_F4B_DK_DemonSwordStrike",
                DemonKingDesign.Action_DemonSwordStrike.Name,
                DemonKingDesign.Action_DemonSwordStrike.Desc,
                DemonKingDesign.Action_DemonSwordStrike.Power, hits: 1, hitsAll: false);

            var blackFlameBlast = CreateMagicSkill("SKL_F4B_DK_BlackFlameBlast",
                DemonKingDesign.Action_BlackFlameBlast.Name,
                DemonKingDesign.Action_BlackFlameBlast.Desc,
                ElementType.Dark,
                DemonKingDesign.Action_BlackFlameBlast.Power, hits: 1, hitsAll: true);

            var abyssBind = CreateStatusSkill("SKL_F4B_DK_AbyssBind",
                DemonKingDesign.Action_AbyssBind.Name,
                DemonKingDesign.Action_AbyssBind.Desc,
                DemonKingDesign.Action_AbyssBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            var demonAwe = CreateSupportSkill("SKL_F4B_DK_DemonAwe",
                DemonKingDesign.Action_DemonAwe.Name,
                DemonKingDesign.Action_DemonAwe.Desc);

            // ── Phase 2 (HP ≤ 50%) ─────────────────────────────────────
            var demonRelease = CreatePhysSkill("SKL_F4B_DK_DemonRelease",
                DemonKingDesign.Action_DemonRelease.Name,
                DemonKingDesign.Action_DemonRelease.Desc,
                DemonKingDesign.Action_DemonRelease.Power, hits: 1, hitsAll: false);

            var soulDestroyFlame = CreateMagicSkill("SKL_F4B_DK_SoulDestroyFlame",
                DemonKingDesign.Action_SoulDestroyFlame.Name,
                DemonKingDesign.Action_SoulDestroyFlame.Desc,
                ElementType.Dark,
                DemonKingDesign.Action_SoulDestroyFlame.Power, hits: 1, hitsAll: true);

            var abyssJudgment = CreateTrueDmgSkill("SKL_F4B_DK_AbyssJudgment",
                DemonKingDesign.Action_AbyssJudgment.Name,
                DemonKingDesign.Action_AbyssJudgment.Desc,
                DemonKingDesign.Action_AbyssJudgment.Power);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_DemonKing_Varna.asset");
            enemy.EnemyName  = DemonKingDesign.EnemyName;
            enemy.Lore       = DemonKingDesign.Lore;
            enemy.Rank       = EnemyRank.Boss;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = DemonKingDesign.MaxHP,
                PhysicalAttack  = DemonKingDesign.PhysicalAttack,
                MagicAttack     = DemonKingDesign.MagicAttack,
                PhysicalDefense = DemonKingDesign.PhysicalDefense,
                MagicDefense    = DemonKingDesign.MagicDefense,
                Speed           = DemonKingDesign.Speed,
            };
            enemy.ShieldPoints = DemonKingDesign.ShieldPoints;
            enemy.ExpReward    = DemonKingDesign.ExpReward;
            enemy.JPReward     = DemonKingDesign.JPReward;
            enemy.GoldReward   = DemonKingDesign.GoldReward;
            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = DemonKingDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() { ActionName = demonSwordStrike.SkillName, Skill = demonSwordStrike,
                        Priority = DemonKingDesign.Action_DemonSwordStrike.Priority,
                        UseChance = DemonKingDesign.Action_DemonSwordStrike.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = blackFlameBlast.SkillName, Skill = blackFlameBlast,
                        Priority = DemonKingDesign.Action_BlackFlameBlast.Priority,
                        UseChance = DemonKingDesign.Action_BlackFlameBlast.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = abyssBind.SkillName, Skill = abyssBind,
                        Priority = DemonKingDesign.Action_AbyssBind.Priority,
                        UseChance = DemonKingDesign.Action_AbyssBind.UseChance,
                        HealthThreshold = 0,
                        IsAbsorbable = DemonKingDesign.Action_AbyssBind.IsAbsorbable },
                new() { ActionName = demonAwe.SkillName, Skill = demonAwe,
                        Priority = DemonKingDesign.Action_DemonAwe.Priority,
                        UseChance = DemonKingDesign.Action_DemonAwe.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = demonRelease.SkillName, Skill = demonRelease,
                        Priority = DemonKingDesign.Action_DemonRelease.Priority,
                        UseChance = DemonKingDesign.Action_DemonRelease.UseChance,
                        HealthThreshold = DemonKingDesign.Action_DemonRelease.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = soulDestroyFlame.SkillName, Skill = soulDestroyFlame,
                        Priority = DemonKingDesign.Action_SoulDestroyFlame.Priority,
                        UseChance = DemonKingDesign.Action_SoulDestroyFlame.UseChance,
                        HealthThreshold = DemonKingDesign.Action_SoulDestroyFlame.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = abyssJudgment.SkillName, Skill = abyssJudgment,
                        Priority = DemonKingDesign.Action_AbyssJudgment.Priority,
                        UseChance = DemonKingDesign.Action_AbyssJudgment.UseChance,
                        HealthThreshold = DemonKingDesign.Action_AbyssJudgment.HealthThreshold,
                        IsAbsorbable = false },
            };

            enemy.ActionsPerTurn = DemonKingDesign.ActionsPerTurn;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   ② 深淵神ウォルム (AbyssGod)
        // ══════════════════════════════════════════════════════════════════
        static void GenerateAbyssGod()
        {
            var abyssGaze = CreateMagicSkill("SKL_F4B_AG_AbyssGaze",
                AbyssGodDesign.Action_AbyssGaze.Name,
                AbyssGodDesign.Action_AbyssGaze.Desc,
                ElementType.Dark,
                AbyssGodDesign.Action_AbyssGaze.Power, hits: 1, hitsAll: false);

            var godEyeWave = CreateMagicSkill("SKL_F4B_AG_GodEyeWave",
                AbyssGodDesign.Action_GodEyeWave.Name,
                AbyssGodDesign.Action_GodEyeWave.Desc,
                ElementType.Dark,
                AbyssGodDesign.Action_GodEyeWave.Power, hits: 1, hitsAll: true);

            var silenceBless = CreateStatusSkill("SKL_F4B_AG_SilenceBless",
                AbyssGodDesign.Action_SilenceBless.Name,
                AbyssGodDesign.Action_SilenceBless.Desc,
                AbyssGodDesign.Action_SilenceBless.StatusChance,
                StatusEffectType.Silence, hitsAll: true);

            var abyssRegen = CreateHealSkill("SKL_F4B_AG_AbyssRegen",
                AbyssGodDesign.Action_AbyssRegen.Name,
                AbyssGodDesign.Action_AbyssRegen.Desc,
                AbyssGodDesign.Action_AbyssRegen.HealAmount);

            var godAwakening = CreateMagicSkill("SKL_F4B_AG_GodAwakening",
                AbyssGodDesign.Action_GodAwakening.Name,
                AbyssGodDesign.Action_GodAwakening.Desc,
                ElementType.Dark,
                AbyssGodDesign.Action_GodAwakening.Power, hits: 1, hitsAll: true);

            var abyssSwallow = CreateTrueDmgSkill("SKL_F4B_AG_AbyssSwallow",
                AbyssGodDesign.Action_AbyssSwallow.Name,
                AbyssGodDesign.Action_AbyssSwallow.Desc,
                AbyssGodDesign.Action_AbyssSwallow.Power);

            var paralysisBaptism = CreateStatusSkill("SKL_F4B_AG_ParalysisBaptism",
                AbyssGodDesign.Action_ParalysisBaptism.Name,
                AbyssGodDesign.Action_ParalysisBaptism.Desc,
                AbyssGodDesign.Action_ParalysisBaptism.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_AbyssGod_Wolm.asset");
            enemy.EnemyName  = AbyssGodDesign.EnemyName;
            enemy.Lore       = AbyssGodDesign.Lore;
            enemy.Rank       = EnemyRank.Boss;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = AbyssGodDesign.MaxHP,
                PhysicalAttack  = AbyssGodDesign.PhysicalAttack,
                MagicAttack     = AbyssGodDesign.MagicAttack,
                PhysicalDefense = AbyssGodDesign.PhysicalDefense,
                MagicDefense    = AbyssGodDesign.MagicDefense,
                Speed           = AbyssGodDesign.Speed,
            };
            enemy.ShieldPoints = AbyssGodDesign.ShieldPoints;
            enemy.ExpReward    = AbyssGodDesign.ExpReward;
            enemy.JPReward     = AbyssGodDesign.JPReward;
            enemy.GoldReward   = AbyssGodDesign.GoldReward;
            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = AbyssGodDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() { ActionName = abyssGaze.SkillName,    Skill = abyssGaze,
                        Priority = AbyssGodDesign.Action_AbyssGaze.Priority,
                        UseChance = AbyssGodDesign.Action_AbyssGaze.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = godEyeWave.SkillName,   Skill = godEyeWave,
                        Priority = AbyssGodDesign.Action_GodEyeWave.Priority,
                        UseChance = AbyssGodDesign.Action_GodEyeWave.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = silenceBless.SkillName, Skill = silenceBless,
                        Priority = AbyssGodDesign.Action_SilenceBless.Priority,
                        UseChance = AbyssGodDesign.Action_SilenceBless.UseChance,
                        HealthThreshold = 0,
                        IsAbsorbable = AbyssGodDesign.Action_SilenceBless.IsAbsorbable },
                new() { ActionName = abyssRegen.SkillName,   Skill = abyssRegen,
                        Priority = AbyssGodDesign.Action_AbyssRegen.Priority,
                        UseChance = AbyssGodDesign.Action_AbyssRegen.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = godAwakening.SkillName, Skill = godAwakening,
                        Priority = AbyssGodDesign.Action_GodAwakening.Priority,
                        UseChance = AbyssGodDesign.Action_GodAwakening.UseChance,
                        HealthThreshold = AbyssGodDesign.Action_GodAwakening.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = abyssSwallow.SkillName, Skill = abyssSwallow,
                        Priority = AbyssGodDesign.Action_AbyssSwallow.Priority,
                        UseChance = AbyssGodDesign.Action_AbyssSwallow.UseChance,
                        HealthThreshold = AbyssGodDesign.Action_AbyssSwallow.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = paralysisBaptism.SkillName, Skill = paralysisBaptism,
                        Priority = AbyssGodDesign.Action_ParalysisBaptism.Priority,
                        UseChance = AbyssGodDesign.Action_ParalysisBaptism.UseChance,
                        HealthThreshold = AbyssGodDesign.Action_ParalysisBaptism.HealthThreshold,
                        IsAbsorbable = AbyssGodDesign.Action_ParalysisBaptism.IsAbsorbable },
            };

            enemy.ActionsPerTurn = AbyssGodDesign.ActionsPerTurn;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   ③ 時の亡霊エオン (TimeWraith)
        // ══════════════════════════════════════════════════════════════════
        static void GenerateTimeWraith()
        {
            var timeSword = CreatePhysSkill("SKL_F4B_TW_TimeSword",
                TimeWraithDesign.Action_TimeSword.Name,
                TimeWraithDesign.Action_TimeSword.Desc,
                TimeWraithDesign.Action_TimeSword.Power, hits: 1, hitsAll: false);

            var timeStamp = CreatePhysSkill("SKL_F4B_TW_TimeStamp",
                TimeWraithDesign.Action_TimeStamp.Name,
                TimeWraithDesign.Action_TimeStamp.Desc,
                TimeWraithDesign.Action_TimeStamp.Power, hits: 1, hitsAll: true);

            var timeReversal = CreateStatusSkill("SKL_F4B_TW_TimeReversal",
                TimeWraithDesign.Action_TimeReversal.Name,
                TimeWraithDesign.Action_TimeReversal.Desc,
                TimeWraithDesign.Action_TimeReversal.StatusChance,
                StatusEffectType.Sleep, hitsAll: true);

            var timeShard = CreateMagicSkill("SKL_F4B_TW_TimeShard",
                TimeWraithDesign.Action_TimeShard.Name,
                TimeWraithDesign.Action_TimeShard.Desc,
                ElementType.Dark,
                TimeWraithDesign.Action_TimeShard.Power, hits: 1, hitsAll: false);

            var timeEnd = CreateMagicSkill("SKL_F4B_TW_TimeEnd",
                TimeWraithDesign.Action_TimeEnd.Name,
                TimeWraithDesign.Action_TimeEnd.Desc,
                ElementType.Dark,
                TimeWraithDesign.Action_TimeEnd.Power, hits: 1, hitsAll: true);

            var timeCollapse = CreateTrueDmgSkill("SKL_F4B_TW_TimeCollapse",
                TimeWraithDesign.Action_TimeCollapse.Name,
                TimeWraithDesign.Action_TimeCollapse.Desc,
                TimeWraithDesign.Action_TimeCollapse.Power);

            var eternalStop = CreateStatusSkill("SKL_F4B_TW_EternalStop",
                TimeWraithDesign.Action_EternalStop.Name,
                TimeWraithDesign.Action_EternalStop.Desc,
                TimeWraithDesign.Action_EternalStop.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_TimeWraith_Eon.asset");
            enemy.EnemyName  = TimeWraithDesign.EnemyName;
            enemy.Lore       = TimeWraithDesign.Lore;
            enemy.Rank       = EnemyRank.Boss;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = TimeWraithDesign.MaxHP,
                PhysicalAttack  = TimeWraithDesign.PhysicalAttack,
                MagicAttack     = TimeWraithDesign.MagicAttack,
                PhysicalDefense = TimeWraithDesign.PhysicalDefense,
                MagicDefense    = TimeWraithDesign.MagicDefense,
                Speed           = TimeWraithDesign.Speed,
            };
            enemy.ShieldPoints = TimeWraithDesign.ShieldPoints;
            enemy.ExpReward    = TimeWraithDesign.ExpReward;
            enemy.JPReward     = TimeWraithDesign.JPReward;
            enemy.GoldReward   = TimeWraithDesign.GoldReward;
            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Sword };
            enemy.IsUndead = TimeWraithDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() { ActionName = timeSword.SkillName,    Skill = timeSword,
                        Priority = TimeWraithDesign.Action_TimeSword.Priority,
                        UseChance = TimeWraithDesign.Action_TimeSword.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = timeStamp.SkillName,    Skill = timeStamp,
                        Priority = TimeWraithDesign.Action_TimeStamp.Priority,
                        UseChance = TimeWraithDesign.Action_TimeStamp.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = timeReversal.SkillName, Skill = timeReversal,
                        Priority = TimeWraithDesign.Action_TimeReversal.Priority,
                        UseChance = TimeWraithDesign.Action_TimeReversal.UseChance,
                        HealthThreshold = 0,
                        IsAbsorbable = TimeWraithDesign.Action_TimeReversal.IsAbsorbable },
                new() { ActionName = timeShard.SkillName,    Skill = timeShard,
                        Priority = TimeWraithDesign.Action_TimeShard.Priority,
                        UseChance = TimeWraithDesign.Action_TimeShard.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = timeEnd.SkillName,      Skill = timeEnd,
                        Priority = TimeWraithDesign.Action_TimeEnd.Priority,
                        UseChance = TimeWraithDesign.Action_TimeEnd.UseChance,
                        HealthThreshold = TimeWraithDesign.Action_TimeEnd.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = timeCollapse.SkillName, Skill = timeCollapse,
                        Priority = TimeWraithDesign.Action_TimeCollapse.Priority,
                        UseChance = TimeWraithDesign.Action_TimeCollapse.UseChance,
                        HealthThreshold = TimeWraithDesign.Action_TimeCollapse.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = eternalStop.SkillName,  Skill = eternalStop,
                        Priority = TimeWraithDesign.Action_EternalStop.Priority,
                        UseChance = TimeWraithDesign.Action_EternalStop.UseChance,
                        HealthThreshold = TimeWraithDesign.Action_EternalStop.HealthThreshold,
                        IsAbsorbable = TimeWraithDesign.Action_EternalStop.IsAbsorbable },
            };

            enemy.ActionsPerTurn = TimeWraithDesign.ActionsPerTurn;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   ④ 呪われた王アルドリック (CursedKing)
        // ══════════════════════════════════════════════════════════════════
        static void GenerateCursedKing()
        {
            var cursedSword = CreatePhysSkill("SKL_F4B_CK_CursedSword",
                CursedKingDesign.Action_CursedSword.Name,
                CursedKingDesign.Action_CursedSword.Desc,
                CursedKingDesign.Action_CursedSword.Power, hits: 1, hitsAll: false);

            var ancientCursePoison = CreateStatusSkill("SKL_F4B_CK_AncientCursePoison",
                CursedKingDesign.Action_AncientCursePoison.Name,
                CursedKingDesign.Action_AncientCursePoison.Desc,
                CursedKingDesign.Action_AncientCursePoison.StatusChance,
                StatusEffectType.Poison, hitsAll: true);

            var kingsGuard = CreateSupportSkill("SKL_F4B_CK_KingsGuard",
                CursedKingDesign.Action_KingsGuard.Name,
                CursedKingDesign.Action_KingsGuard.Desc,
                CursedKingDesign.Action_KingsGuard.ShieldRestore);

            var grudgeWave = CreateMagicSkill("SKL_F4B_CK_GrudgeWave",
                CursedKingDesign.Action_GrudgeWave.Name,
                CursedKingDesign.Action_GrudgeWave.Desc,
                ElementType.Dark,
                CursedKingDesign.Action_GrudgeWave.Power, hits: 1, hitsAll: true);

            var kingsFury = CreatePhysSkill("SKL_F4B_CK_KingsFury",
                CursedKingDesign.Action_KingsFury.Name,
                CursedKingDesign.Action_KingsFury.Desc,
                CursedKingDesign.Action_KingsFury.Power, hits: 1, hitsAll: true);

            var curseRelease = CreateStatusSkill("SKL_F4B_CK_CurseRelease",
                CursedKingDesign.Action_CurseRelease.Name,
                CursedKingDesign.Action_CurseRelease.Desc,
                CursedKingDesign.Action_CurseRelease.StatusChance,
                StatusEffectType.Bleed, hitsAll: true);

            var kingsJudgment = CreateTrueDmgSkill("SKL_F4B_CK_KingsJudgment",
                CursedKingDesign.Action_KingsJudgment.Name,
                CursedKingDesign.Action_KingsJudgment.Desc,
                CursedKingDesign.Action_KingsJudgment.Power);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_CursedKing_Aldric.asset");
            enemy.EnemyName  = CursedKingDesign.EnemyName;
            enemy.Lore       = CursedKingDesign.Lore;
            enemy.Rank       = EnemyRank.Boss;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = CursedKingDesign.MaxHP,
                PhysicalAttack  = CursedKingDesign.PhysicalAttack,
                MagicAttack     = CursedKingDesign.MagicAttack,
                PhysicalDefense = CursedKingDesign.PhysicalDefense,
                MagicDefense    = CursedKingDesign.MagicDefense,
                Speed           = CursedKingDesign.Speed,
            };
            enemy.ShieldPoints = CursedKingDesign.ShieldPoints;
            enemy.ExpReward    = CursedKingDesign.ExpReward;
            enemy.JPReward     = CursedKingDesign.JPReward;
            enemy.GoldReward   = CursedKingDesign.GoldReward;
            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Fire, ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Axe };
            enemy.IsUndead = CursedKingDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() { ActionName = cursedSword.SkillName,        Skill = cursedSword,
                        Priority = CursedKingDesign.Action_CursedSword.Priority,
                        UseChance = CursedKingDesign.Action_CursedSword.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = ancientCursePoison.SkillName, Skill = ancientCursePoison,
                        Priority = CursedKingDesign.Action_AncientCursePoison.Priority,
                        UseChance = CursedKingDesign.Action_AncientCursePoison.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = kingsGuard.SkillName,         Skill = kingsGuard,
                        Priority = CursedKingDesign.Action_KingsGuard.Priority,
                        UseChance = CursedKingDesign.Action_KingsGuard.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = grudgeWave.SkillName,         Skill = grudgeWave,
                        Priority = CursedKingDesign.Action_GrudgeWave.Priority,
                        UseChance = CursedKingDesign.Action_GrudgeWave.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = kingsFury.SkillName,          Skill = kingsFury,
                        Priority = CursedKingDesign.Action_KingsFury.Priority,
                        UseChance = CursedKingDesign.Action_KingsFury.UseChance,
                        HealthThreshold = CursedKingDesign.Action_KingsFury.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = curseRelease.SkillName,       Skill = curseRelease,
                        Priority = CursedKingDesign.Action_CurseRelease.Priority,
                        UseChance = CursedKingDesign.Action_CurseRelease.UseChance,
                        HealthThreshold = CursedKingDesign.Action_CurseRelease.HealthThreshold,
                        IsAbsorbable = CursedKingDesign.Action_CurseRelease.IsAbsorbable },
                new() { ActionName = kingsJudgment.SkillName,      Skill = kingsJudgment,
                        Priority = CursedKingDesign.Action_KingsJudgment.Priority,
                        UseChance = CursedKingDesign.Action_KingsJudgment.UseChance,
                        HealthThreshold = CursedKingDesign.Action_KingsJudgment.HealthThreshold,
                        IsAbsorbable = false },
            };

            enemy.ActionsPerTurn = CursedKingDesign.ActionsPerTurn;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   ⑤ 世界の核（真の形態）(TrueCore)
        // ══════════════════════════════════════════════════════════════════
        static void GenerateTrueCore()
        {
            // ── Phase 1 (常時) ──────────────────────────────────────────
            var coreRay = CreateMagicSkill("SKL_F4B_TC_CoreRay",
                TrueCoreDesign.Action_CoreRay.Name,
                TrueCoreDesign.Action_CoreRay.Desc,
                ElementType.Light,
                TrueCoreDesign.Action_CoreRay.Power, hits: 1, hitsAll: false);

            var worldWave = CreateMagicSkill("SKL_F4B_TC_WorldWave",
                TrueCoreDesign.Action_WorldWave.Name,
                TrueCoreDesign.Action_WorldWave.Desc,
                ElementType.Dark,
                TrueCoreDesign.Action_WorldWave.Power, hits: 1, hitsAll: true);

            var existenceErosion = CreateStatusSkill("SKL_F4B_TC_ExistenceErosion",
                TrueCoreDesign.Action_ExistenceErosion.Name,
                TrueCoreDesign.Action_ExistenceErosion.Desc,
                TrueCoreDesign.Action_ExistenceErosion.StatusChance,
                StatusEffectType.Silence, hitsAll: true);

            var coreRegen = CreateHealSkill("SKL_F4B_TC_CoreRegen",
                TrueCoreDesign.Action_CoreRegen.Name,
                TrueCoreDesign.Action_CoreRegen.Desc,
                TrueCoreDesign.Action_CoreRegen.HealAmount);

            // ── Phase 2 (HP ≤ 66%) ─────────────────────────────────────
            var worldCollapse = CreateMagicSkill("SKL_F4B_TC_WorldCollapse",
                TrueCoreDesign.Action_WorldCollapse.Name,
                TrueCoreDesign.Action_WorldCollapse.Desc,
                ElementType.Dark,
                TrueCoreDesign.Action_WorldCollapse.Power, hits: 1, hitsAll: true);

            var existenceDenial = CreateStatusSkill("SKL_F4B_TC_ExistenceDenial",
                TrueCoreDesign.Action_ExistenceDenial.Name,
                TrueCoreDesign.Action_ExistenceDenial.Desc,
                TrueCoreDesign.Action_ExistenceDenial.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            var coreFission = CreateTrueDmgSkill("SKL_F4B_TC_CoreFission",
                TrueCoreDesign.Action_CoreFission.Name,
                TrueCoreDesign.Action_CoreFission.Desc,
                TrueCoreDesign.Action_CoreFission.Power);

            // ── Phase 3 (HP ≤ 33%) ─────────────────────────────────────
            var endLight = CreateMagicSkill("SKL_F4B_TC_EndLight",
                TrueCoreDesign.Action_EndLight.Name,
                TrueCoreDesign.Action_EndLight.Desc,
                ElementType.Light,
                TrueCoreDesign.Action_EndLight.Power, hits: 1, hitsAll: true);

            var worldAnnihilation = CreateTrueDmgSkill("SKL_F4B_TC_WorldAnnihilation",
                TrueCoreDesign.Action_WorldAnnihilation.Name,
                TrueCoreDesign.Action_WorldAnnihilation.Desc,
                TrueCoreDesign.Action_WorldAnnihilation.Power);

            var existenceDissolve = CreateStatusSkill("SKL_F4B_TC_ExistenceDissolve",
                TrueCoreDesign.Action_ExistenceDissolve.Name,
                TrueCoreDesign.Action_ExistenceDissolve.Desc,
                TrueCoreDesign.Action_ExistenceDissolve.StatusChance,
                StatusEffectType.Bleed, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_TrueCore.asset");
            enemy.EnemyName  = TrueCoreDesign.EnemyName;
            enemy.Lore       = TrueCoreDesign.Lore;
            enemy.Rank       = EnemyRank.TrueFinalBoss;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = TrueCoreDesign.MaxHP,
                PhysicalAttack  = TrueCoreDesign.PhysicalAttack,
                MagicAttack     = TrueCoreDesign.MagicAttack,
                PhysicalDefense = TrueCoreDesign.PhysicalDefense,
                MagicDefense    = TrueCoreDesign.MagicDefense,
                Speed           = TrueCoreDesign.Speed,
            };
            enemy.ShieldPoints = TrueCoreDesign.ShieldPoints;
            enemy.ExpReward    = TrueCoreDesign.ExpReward;
            enemy.JPReward     = TrueCoreDesign.JPReward;
            enemy.GoldReward   = TrueCoreDesign.GoldReward;
            enemy.ElementWeaknesses = new List<ElementType> { ElementType.Light };
            enemy.WeaponWeaknesses  = new List<WeaponType>  { WeaponType.Tome };
            enemy.IsUndead = TrueCoreDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                // Phase 1
                new() { ActionName = coreRay.SkillName,           Skill = coreRay,
                        Priority = TrueCoreDesign.Action_CoreRay.Priority,
                        UseChance = TrueCoreDesign.Action_CoreRay.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = worldWave.SkillName,          Skill = worldWave,
                        Priority = TrueCoreDesign.Action_WorldWave.Priority,
                        UseChance = TrueCoreDesign.Action_WorldWave.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                new() { ActionName = existenceErosion.SkillName,   Skill = existenceErosion,
                        Priority = TrueCoreDesign.Action_ExistenceErosion.Priority,
                        UseChance = TrueCoreDesign.Action_ExistenceErosion.UseChance,
                        HealthThreshold = 0,
                        IsAbsorbable = TrueCoreDesign.Action_ExistenceErosion.IsAbsorbable },
                new() { ActionName = coreRegen.SkillName,          Skill = coreRegen,
                        Priority = TrueCoreDesign.Action_CoreRegen.Priority,
                        UseChance = TrueCoreDesign.Action_CoreRegen.UseChance,
                        HealthThreshold = 0, IsAbsorbable = false },
                // Phase 2
                new() { ActionName = worldCollapse.SkillName,      Skill = worldCollapse,
                        Priority = TrueCoreDesign.Action_WorldCollapse.Priority,
                        UseChance = TrueCoreDesign.Action_WorldCollapse.UseChance,
                        HealthThreshold = TrueCoreDesign.Action_WorldCollapse.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = existenceDenial.SkillName,    Skill = existenceDenial,
                        Priority = TrueCoreDesign.Action_ExistenceDenial.Priority,
                        UseChance = TrueCoreDesign.Action_ExistenceDenial.UseChance,
                        HealthThreshold = TrueCoreDesign.Action_ExistenceDenial.HealthThreshold,
                        IsAbsorbable = TrueCoreDesign.Action_ExistenceDenial.IsAbsorbable },
                new() { ActionName = coreFission.SkillName,        Skill = coreFission,
                        Priority = TrueCoreDesign.Action_CoreFission.Priority,
                        UseChance = TrueCoreDesign.Action_CoreFission.UseChance,
                        HealthThreshold = TrueCoreDesign.Action_CoreFission.HealthThreshold,
                        IsAbsorbable = false },
                // Phase 3
                new() { ActionName = endLight.SkillName,           Skill = endLight,
                        Priority = TrueCoreDesign.Action_EndLight.Priority,
                        UseChance = TrueCoreDesign.Action_EndLight.UseChance,
                        HealthThreshold = TrueCoreDesign.Action_EndLight.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = worldAnnihilation.SkillName,  Skill = worldAnnihilation,
                        Priority = TrueCoreDesign.Action_WorldAnnihilation.Priority,
                        UseChance = TrueCoreDesign.Action_WorldAnnihilation.UseChance,
                        HealthThreshold = TrueCoreDesign.Action_WorldAnnihilation.HealthThreshold,
                        IsAbsorbable = false },
                new() { ActionName = existenceDissolve.SkillName,  Skill = existenceDissolve,
                        Priority = TrueCoreDesign.Action_ExistenceDissolve.Priority,
                        UseChance = TrueCoreDesign.Action_ExistenceDissolve.UseChance,
                        HealthThreshold = TrueCoreDesign.Action_ExistenceDissolve.HealthThreshold,
                        IsAbsorbable = TrueCoreDesign.Action_ExistenceDissolve.IsAbsorbable },
            };

            enemy.ActionsPerTurn = TrueCoreDesign.ActionsPerTurn;
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
            sk.IsHeal         = false;
            sk.ShieldRestore  = shieldRestore;
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
