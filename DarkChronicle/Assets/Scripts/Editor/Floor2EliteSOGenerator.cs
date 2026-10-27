#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Floor 2「呪われた城」エリート敵 4体 の ScriptableObject を自動生成するツール。
    ///   Elite A: 紅月の近衛騎士 ガレン          (ソロ / ActionsPerTurn=2)
    ///   Elite B: 呪いの魔女 フェルナ ＋ 呪縛の使い魔 (グループ)
    ///   Elite C: 呪われた伯爵の霊 ヴェルモン      (ソロ / フェーズ変化)
    /// Menu: DarkChronicle → Generate → Floor2 Elite Assets
    /// </summary>
    public static class Floor2EliteSOGenerator
    {
        const string BaseDir  = "Assets/Data/Enemies/Floor2";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor2 Elite Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            GenerateGalen();
            GenerateFerna();
            GenerateCursedFamiliar();
            GenerateVelmon();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Floor2EliteSOGenerator] All Floor 2 elite assets generated.");
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
        //   Elite A: 紅月の近衛騎士 ガレン
        // ══════════════════════════════════════════════════════════════════
        static void GenerateGalen()
        {
            var cursedSlash = CreatePhysSkill("SKL_F2E_CursedSlash",
                GalenDesign.Action_CursedSlash.Name,
                GalenDesign.Action_CursedSlash.Desc,
                GalenDesign.Action_CursedSlash.Power, hits: 1, hitsAll: false);

            var judgmentBlade = CreatePhysSkill("SKL_F2E_JudgmentBlade",
                GalenDesign.Action_JudgmentBlade.Name,
                GalenDesign.Action_JudgmentBlade.Desc,
                GalenDesign.Action_JudgmentBlade.Power, hits: 1, hitsAll: false);

            var bloodMoonSweep = CreatePhysSkill("SKL_F2E_BloodMoonSweep",
                GalenDesign.Action_BloodMoonSweep.Name,
                GalenDesign.Action_BloodMoonSweep.Desc,
                GalenDesign.Action_BloodMoonSweep.Power, hits: 1, hitsAll: true);

            var guardRestore = CreateSupportSkill("SKL_F2E_GuardRestore",
                GalenDesign.Action_GuardRestore.Name,
                GalenDesign.Action_GuardRestore.Desc,
                GalenDesign.Action_GuardRestore.ShieldRestore);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Galen.asset");
            enemy.EnemyName  = GalenDesign.EnemyName;
            enemy.Lore       = GalenDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = GalenDesign.MaxHP,
                PhysicalAttack  = GalenDesign.PhysicalAttack,
                MagicAttack     = GalenDesign.MagicAttack,
                PhysicalDefense = GalenDesign.PhysicalDefense,
                MagicDefense    = GalenDesign.MagicDefense,
                Speed           = GalenDesign.Speed,
            };
            enemy.ShieldPoints = GalenDesign.ShieldPoints;
            enemy.ExpReward    = GalenDesign.ExpReward;
            enemy.JPReward     = GalenDesign.JPReward;
            enemy.GoldReward   = GalenDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
                ElementType.Physical,
            };
            enemy.IsUndead = GalenDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = cursedSlash.SkillName,
                    Skill           = cursedSlash,
                    Priority        = GalenDesign.Action_CursedSlash.Priority,
                    UseChance       = GalenDesign.Action_CursedSlash.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = judgmentBlade.SkillName,
                    Skill           = judgmentBlade,
                    Priority        = GalenDesign.Action_JudgmentBlade.Priority,
                    UseChance       = GalenDesign.Action_JudgmentBlade.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bloodMoonSweep.SkillName,
                    Skill           = bloodMoonSweep,
                    Priority        = GalenDesign.Action_BloodMoonSweep.Priority,
                    UseChance       = GalenDesign.Action_BloodMoonSweep.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = guardRestore.SkillName,
                    Skill           = guardRestore,
                    Priority        = GalenDesign.Action_GuardRestore.Priority,
                    UseChance       = GalenDesign.Action_GuardRestore.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = GalenDesign.ActionsPerTurn;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-1: 呪いの魔女 フェルナ
        // ══════════════════════════════════════════════════════════════════
        static void GenerateFerna()
        {
            var cursedGaze = CreateStatusSkill("SKL_F2E_CursedGaze",
                FernaDesign.Action_CursedGaze.Name,
                FernaDesign.Action_CursedGaze.Desc,
                FernaDesign.Action_CursedGaze.StatusChance,
                StatusEffectType.Blind, hitsAll: false);

            var corruptionWave = CreateMagicSkill("SKL_F2E_CorruptionWave",
                FernaDesign.Action_CorruptionWave.Name,
                FernaDesign.Action_CorruptionWave.Desc,
                ElementType.Dark,
                FernaDesign.Action_CorruptionWave.Power, hits: 1, hitsAll: false);

            var bindingCurse = CreateStatusSkill("SKL_F2E_BindingCurse",
                FernaDesign.Action_BindingCurse.Name,
                FernaDesign.Action_BindingCurse.Desc,
                FernaDesign.Action_BindingCurse.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            var curseEnhance = CreateSupportSkill("SKL_F2E_CurseEnhance",
                FernaDesign.Action_CurseEnhance.Name,
                FernaDesign.Action_CurseEnhance.Desc);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Ferna.asset");
            enemy.EnemyName  = FernaDesign.EnemyName;
            enemy.Lore       = FernaDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = FernaDesign.MaxHP,
                PhysicalAttack  = FernaDesign.PhysicalAttack,
                MagicAttack     = FernaDesign.MagicAttack,
                PhysicalDefense = FernaDesign.PhysicalDefense,
                MagicDefense    = FernaDesign.MagicDefense,
                Speed           = FernaDesign.Speed,
            };
            enemy.ShieldPoints = FernaDesign.ShieldPoints;
            enemy.ExpReward    = FernaDesign.ExpReward;
            enemy.JPReward     = FernaDesign.JPReward;
            enemy.GoldReward   = FernaDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
                ElementType.Physical,
            };
            enemy.IsUndead = FernaDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = cursedGaze.SkillName,
                    Skill           = cursedGaze,
                    Priority        = FernaDesign.Action_CursedGaze.Priority,
                    UseChance       = FernaDesign.Action_CursedGaze.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = FernaDesign.Action_CursedGaze.IsAbsorbable,
                },
                new() {
                    ActionName      = corruptionWave.SkillName,
                    Skill           = corruptionWave,
                    Priority        = FernaDesign.Action_CorruptionWave.Priority,
                    UseChance       = FernaDesign.Action_CorruptionWave.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bindingCurse.SkillName,
                    Skill           = bindingCurse,
                    Priority        = FernaDesign.Action_BindingCurse.Priority,
                    UseChance       = FernaDesign.Action_BindingCurse.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = FernaDesign.Action_BindingCurse.IsAbsorbable,
                },
                new() {
                    ActionName      = curseEnhance.SkillName,
                    Skill           = curseEnhance,
                    Priority        = FernaDesign.Action_CurseEnhance.Priority,
                    UseChance       = FernaDesign.Action_CurseEnhance.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite B-2: 呪縛の使い魔
        // ══════════════════════════════════════════════════════════════════
        static void GenerateCursedFamiliar()
        {
            var cursedClaw = CreatePhysSkill("SKL_F2E_CursedClaw",
                CursedFamiliarDesign.Action_CursedClaw.Name,
                CursedFamiliarDesign.Action_CursedClaw.Desc,
                CursedFamiliarDesign.Action_CursedClaw.Power, hits: 1, hitsAll: false);

            var shadowBite = CreatePhysSkill("SKL_F2E_ShadowBite",
                CursedFamiliarDesign.Action_ShadowBite.Name,
                CursedFamiliarDesign.Action_ShadowBite.Desc,
                CursedFamiliarDesign.Action_ShadowBite.Power, hits: 1, hitsAll: false);

            var bindingShriek = CreateStatusSkill("SKL_F2E_BindingShriek",
                CursedFamiliarDesign.Action_BindingShriek.Name,
                CursedFamiliarDesign.Action_BindingShriek.Desc,
                CursedFamiliarDesign.Action_BindingShriek.StatusChance,
                StatusEffectType.Sleep, hitsAll: false);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_CursedFamiliar.asset");
            enemy.EnemyName  = CursedFamiliarDesign.EnemyName;
            enemy.Lore       = CursedFamiliarDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = CursedFamiliarDesign.MaxHP,
                PhysicalAttack  = CursedFamiliarDesign.PhysicalAttack,
                MagicAttack     = CursedFamiliarDesign.MagicAttack,
                PhysicalDefense = CursedFamiliarDesign.PhysicalDefense,
                MagicDefense    = CursedFamiliarDesign.MagicDefense,
                Speed           = CursedFamiliarDesign.Speed,
            };
            enemy.ShieldPoints = CursedFamiliarDesign.ShieldPoints;
            enemy.ExpReward    = CursedFamiliarDesign.ExpReward;
            enemy.JPReward     = CursedFamiliarDesign.JPReward;
            enemy.GoldReward   = CursedFamiliarDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
                ElementType.Physical,
            };
            enemy.IsUndead = CursedFamiliarDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                new() {
                    ActionName      = cursedClaw.SkillName,
                    Skill           = cursedClaw,
                    Priority        = CursedFamiliarDesign.Action_CursedClaw.Priority,
                    UseChance       = CursedFamiliarDesign.Action_CursedClaw.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = shadowBite.SkillName,
                    Skill           = shadowBite,
                    Priority        = CursedFamiliarDesign.Action_ShadowBite.Priority,
                    UseChance       = CursedFamiliarDesign.Action_ShadowBite.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bindingShriek.SkillName,
                    Skill           = bindingShriek,
                    Priority        = CursedFamiliarDesign.Action_BindingShriek.Priority,
                    UseChance       = CursedFamiliarDesign.Action_BindingShriek.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = CursedFamiliarDesign.Action_BindingShriek.IsAbsorbable,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ══════════════════════════════════════════════════════════════════
        //   Elite C: 呪われた伯爵の霊 ヴェルモン
        // ══════════════════════════════════════════════════════════════════
        static void GenerateVelmon()
        {
            // ── Phase 1 Skills ──────────────────────────────────────────
            var cursedHand = CreateMagicSkill("SKL_F2E_CursedHand",
                VelmonDesign.Action_CursedHand.Name,
                VelmonDesign.Action_CursedHand.Desc,
                ElementType.Dark,
                VelmonDesign.Action_CursedHand.Power, hits: 1, hitsAll: false);

            var bloodMoonGaze = CreateStatusSkill("SKL_F2E_BloodMoonGaze",
                VelmonDesign.Action_BloodMoonGaze.Name,
                VelmonDesign.Action_BloodMoonGaze.Desc,
                VelmonDesign.Action_BloodMoonGaze.StatusChance,
                StatusEffectType.Blind, hitsAll: false);

            var corruptBreath = CreateMagicSkill("SKL_F2E_CorruptBreath",
                VelmonDesign.Action_CorruptBreath.Name,
                VelmonDesign.Action_CorruptBreath.Desc,
                ElementType.Dark,
                VelmonDesign.Action_CorruptBreath.Power, hits: 1, hitsAll: true);

            var curseArmor = CreateSupportSkill("SKL_F2E_CurseArmor",
                VelmonDesign.Action_CurseArmor.Name,
                VelmonDesign.Action_CurseArmor.Desc,
                VelmonDesign.Action_CurseArmor.ShieldRestore);

            // ── Phase 2 Skills (HP ≤ 40%) ───────────────────────────────
            var despairBind = CreateStatusSkill("SKL_F2E_DespairBind",
                VelmonDesign.Action_DespairBind.Name,
                VelmonDesign.Action_DespairBind.Desc,
                VelmonDesign.Action_DespairBind.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            var bloodStorm = CreateMagicSkill("SKL_F2E_BloodStorm",
                VelmonDesign.Action_BloodStorm.Name,
                VelmonDesign.Action_BloodStorm.Desc,
                ElementType.Dark,
                VelmonDesign.Action_BloodStorm.Power, hits: 1, hitsAll: true);

            var collapseRoar = CreateStatusSkill("SKL_F2E_CollapseRoar",
                VelmonDesign.Action_CollapseRoar.Name,
                VelmonDesign.Action_CollapseRoar.Desc,
                VelmonDesign.Action_CollapseRoar.StatusChance,
                StatusEffectType.Sleep, hitsAll: true);

            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Velmon.asset");
            enemy.EnemyName  = VelmonDesign.EnemyName;
            enemy.Lore       = VelmonDesign.Lore;
            enemy.Rank       = EnemyRank.Elite;
            enemy.Stats      = new CharacterStats
            {
                MaxHP           = VelmonDesign.MaxHP,
                PhysicalAttack  = VelmonDesign.PhysicalAttack,
                MagicAttack     = VelmonDesign.MagicAttack,
                PhysicalDefense = VelmonDesign.PhysicalDefense,
                MagicDefense    = VelmonDesign.MagicDefense,
                Speed           = VelmonDesign.Speed,
            };
            enemy.ShieldPoints = VelmonDesign.ShieldPoints;
            enemy.ExpReward    = VelmonDesign.ExpReward;
            enemy.JPReward     = VelmonDesign.JPReward;
            enemy.GoldReward   = VelmonDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Light,
                ElementType.Physical,
            };
            enemy.IsUndead = VelmonDesign.IsUndead;

            enemy.Actions = new List<EnemyAction>
            {
                // ── Phase 1（常時） ────────────────────────────────────────
                new() {
                    ActionName      = cursedHand.SkillName,
                    Skill           = cursedHand,
                    Priority        = VelmonDesign.Action_CursedHand.Priority,
                    UseChance       = VelmonDesign.Action_CursedHand.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = bloodMoonGaze.SkillName,
                    Skill           = bloodMoonGaze,
                    Priority        = VelmonDesign.Action_BloodMoonGaze.Priority,
                    UseChance       = VelmonDesign.Action_BloodMoonGaze.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = VelmonDesign.Action_BloodMoonGaze.IsAbsorbable,
                },
                new() {
                    ActionName      = corruptBreath.SkillName,
                    Skill           = corruptBreath,
                    Priority        = VelmonDesign.Action_CorruptBreath.Priority,
                    UseChance       = VelmonDesign.Action_CorruptBreath.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = curseArmor.SkillName,
                    Skill           = curseArmor,
                    Priority        = VelmonDesign.Action_CurseArmor.Priority,
                    UseChance       = VelmonDesign.Action_CurseArmor.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                // ── Phase 2（HP 40% 以下） ─────────────────────────────────
                new() {
                    ActionName      = despairBind.SkillName,
                    Skill           = despairBind,
                    Priority        = VelmonDesign.Action_DespairBind.Priority,
                    UseChance       = VelmonDesign.Action_DespairBind.UseChance,
                    HealthThreshold = VelmonDesign.Action_DespairBind.HealthThreshold,
                    IsAbsorbable    = VelmonDesign.Action_DespairBind.IsAbsorbable,
                },
                new() {
                    ActionName      = bloodStorm.SkillName,
                    Skill           = bloodStorm,
                    Priority        = VelmonDesign.Action_BloodStorm.Priority,
                    UseChance       = VelmonDesign.Action_BloodStorm.UseChance,
                    HealthThreshold = VelmonDesign.Action_BloodStorm.HealthThreshold,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = collapseRoar.SkillName,
                    Skill           = collapseRoar,
                    Priority        = VelmonDesign.Action_CollapseRoar.Priority,
                    UseChance       = VelmonDesign.Action_CollapseRoar.UseChance,
                    HealthThreshold = VelmonDesign.Action_CollapseRoar.HealthThreshold,
                    IsAbsorbable    = VelmonDesign.Action_CollapseRoar.IsAbsorbable,
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
