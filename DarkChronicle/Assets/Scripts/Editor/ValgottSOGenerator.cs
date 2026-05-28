#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.EnemyDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Unityエディタメニューから呼び出して、Floor 3 ボス「千年の扉番 ヴァルゴット」
    /// 関連の ScriptableObject をすべて自動生成するツール。
    /// Menu: DarkChronicle → Generate → Floor3 Boss (Valgott) Assets
    /// </summary>
    public static class ValgottSOGenerator
    {
        const string BaseDir  = "Assets/Data/Enemies/Floor3";
        const string SkillDir = BaseDir + "/Skills";

        [MenuItem("DarkChronicle/Generate/Floor3 Boss (Valgott) Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            var skills = GenerateSkills();
            GenerateEnemyData(skills);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[ValgottSOGenerator] All assets generated.");
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

        // ── スキル全生成 ───────────────────────────────────────────────
        static ValgottSkills GenerateSkills()
        {
            var s = new ValgottSkills();

            // ── Phase 1 ───────────────────────────────────────────────────

            // 石礫の打撃: 単体物理 1.8倍
            s.BoulderStrike = CreatePhysSkill("SKL_V_BoulderStrike",
                ValgottDesign.Action_BoulderStrike.Name,
                ValgottDesign.Action_BoulderStrike.Desc,
                ValgottDesign.Action_BoulderStrike.Power, 1, false);

            // 封印の圧: 全体物理 0.9倍
            s.SealPressure = CreatePhysSkill("SKL_V_SealPressure",
                ValgottDesign.Action_SealPressure.Name,
                ValgottDesign.Action_SealPressure.Desc,
                ValgottDesign.Action_SealPressure.Power, 1, false, hitsAll: true);

            // 石化の眼差し: 単体 麻痺 30%（吸収可能）
            s.PetrifyingGaze = CreateStatusSkill("SKL_V_PetrifyingGaze",
                ValgottDesign.Action_PetrifyingGaze.Name,
                ValgottDesign.Action_PetrifyingGaze.Desc,
                ValgottDesign.Action_PetrifyingGaze.StatusChance,
                StatusEffectType.Paralysis, hitsAll: false);

            // 守護の構え: シールド再生（カスタム実装待ち）
            s.GuardianStance = CreateSupportSkill("SKL_V_GuardianStance",
                ValgottDesign.Action_GuardianStance.Name,
                ValgottDesign.Action_GuardianStance.Desc);

            // ── Phase 2 (HP 50% 以下) ─────────────────────────────────────

            // 深淵の脈動: 全体闇魔法 0.95倍
            s.AbyssPulse = CreateMagicSkill("SKL_V_AbyssPulse",
                ValgottDesign.Action_AbyssPulse.Name,
                ValgottDesign.Action_AbyssPulse.Desc,
                ElementType.Dark,
                ValgottDesign.Action_AbyssPulse.Power, 1, hitsAll: true);

            // 石化の眼差し＋: 全体 麻痺 25%（吸収可能）
            s.PetrifyingGazePlus = CreateStatusSkill("SKL_V_PetrifyingGazePlus",
                ValgottDesign.Action_PetrifyingGazePlus.Name,
                ValgottDesign.Action_PetrifyingGazePlus.Desc,
                ValgottDesign.Action_PetrifyingGazePlus.StatusChance,
                StatusEffectType.Paralysis, hitsAll: true);

            // 深淵解放: True ダメージ 全体固定 400（防御無視）
            // Power 6.67 × MagATK 60 ≒ 400。DamageType.True で防御減算なし。
            s.VoidRelease = CreateTrueDmgSkill("SKL_V_VoidRelease",
                ValgottDesign.Action_VoidRelease.Name,
                ValgottDesign.Action_VoidRelease.Desc,
                ValgottDesign.Action_VoidRelease.Power);

            return s;
        }

        // ── エネミーデータ生成 ─────────────────────────────────────────
        static void GenerateEnemyData(ValgottSkills s)
        {
            var enemy = CreateOrLoad<EnemyData>(BaseDir + "/ENM_Valgott.asset");

            enemy.EnemyName = ValgottDesign.EnemyName;
            enemy.Lore      = ValgottDesign.Lore;
            enemy.Rank      = EnemyRank.Boss;
            enemy.Stats     = new CharacterStats
            {
                MaxHP           = ValgottDesign.MaxHP,
                PhysicalAttack  = ValgottDesign.PhysicalAttack,
                MagicAttack     = ValgottDesign.MagicAttack,
                PhysicalDefense = ValgottDesign.PhysicalDefense,
                MagicDefense    = ValgottDesign.MagicDefense,
                Speed           = ValgottDesign.Speed,
            };
            enemy.ShieldPoints = ValgottDesign.ShieldPoints;
            enemy.ExpReward    = ValgottDesign.ExpReward;
            enemy.JPReward     = ValgottDesign.JPReward;
            enemy.GoldReward   = ValgottDesign.GoldReward;

            enemy.ElementWeaknesses = new List<ElementType>
            {
                ElementType.Fire,
                ElementType.Thunder,
            };
            enemy.WeaponWeaknesses = new List<WeaponType>
            {
                WeaponType.Axe,
            };

            enemy.IsUndead = false;

            enemy.Actions = new List<EnemyAction>
            {
                // ── Phase 1（常時） ────────────────────────────────────────
                new() {
                    ActionName      = s.BoulderStrike.SkillName,
                    Skill           = s.BoulderStrike,
                    Priority        = ValgottDesign.Action_BoulderStrike.Priority,
                    UseChance       = ValgottDesign.Action_BoulderStrike.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = s.SealPressure.SkillName,
                    Skill           = s.SealPressure,
                    Priority        = ValgottDesign.Action_SealPressure.Priority,
                    UseChance       = ValgottDesign.Action_SealPressure.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = s.PetrifyingGaze.SkillName,
                    Skill           = s.PetrifyingGaze,
                    Priority        = ValgottDesign.Action_PetrifyingGaze.Priority,
                    UseChance       = ValgottDesign.Action_PetrifyingGaze.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = ValgottDesign.Action_PetrifyingGaze.IsAbsorbable,
                },
                new() {
                    ActionName      = s.GuardianStance.SkillName,
                    Skill           = s.GuardianStance,
                    Priority        = ValgottDesign.Action_GuardianStance.Priority,
                    UseChance       = ValgottDesign.Action_GuardianStance.UseChance,
                    HealthThreshold = 0,
                    IsAbsorbable    = false,
                },
                // ── Phase 2（HP 50% 以下） ─────────────────────────────────
                new() {
                    ActionName      = s.AbyssPulse.SkillName,
                    Skill           = s.AbyssPulse,
                    Priority        = ValgottDesign.Action_AbyssPulse.Priority,
                    UseChance       = ValgottDesign.Action_AbyssPulse.UseChance,
                    HealthThreshold = ValgottDesign.Action_AbyssPulse.HealthThreshold,
                    IsAbsorbable    = false,
                },
                new() {
                    ActionName      = s.PetrifyingGazePlus.SkillName,
                    Skill           = s.PetrifyingGazePlus,
                    Priority        = ValgottDesign.Action_PetrifyingGazePlus.Priority,
                    UseChance       = ValgottDesign.Action_PetrifyingGazePlus.UseChance,
                    HealthThreshold = ValgottDesign.Action_PetrifyingGazePlus.HealthThreshold,
                    IsAbsorbable    = ValgottDesign.Action_PetrifyingGazePlus.IsAbsorbable,
                },
                // 深淵解放: 崩壊カウントダウン実装まで UseChance 0.20 で暫定登録
                new() {
                    ActionName      = s.VoidRelease.SkillName,
                    Skill           = s.VoidRelease,
                    Priority        = ValgottDesign.Action_VoidRelease.Priority,
                    UseChance       = ValgottDesign.Action_VoidRelease.UseChance,
                    HealthThreshold = ValgottDesign.Action_VoidRelease.HealthThreshold,
                    IsAbsorbable    = false,
                },
            };

            enemy.ActionsPerTurn = 1;
            EditorUtility.SetDirty(enemy);
        }

        // ── ファクトリ ────────────────────────────────────────────────
        static SkillData CreatePhysSkill(string fileName, string name, string desc,
                                          float power, int hits, bool canBreak,
                                          bool hitsAll = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.DamageType     = DamageType.Physical;
            sk.Element        = ElementType.None;
            sk.BasePower      = power;
            sk.HitCount       = hits;
            sk.MPCost         = 0;
            sk.CanBreak       = canBreak;
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

        class ValgottSkills
        {
            public SkillData BoulderStrike;
            public SkillData SealPressure;
            public SkillData PetrifyingGaze;
            public SkillData GuardianStance;
            public SkillData AbyssPulse;
            public SkillData PetrifyingGazePlus;
            public SkillData VoidRelease;
        }
    }
}
#endif
