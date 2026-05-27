#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.CharacterDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Unityエディタメニューから呼び出して、アッシュ関連の
    /// ScriptableObjectをすべて自動生成するツール。
    /// Menu: DarkChronicle → Generate → Ash Assets
    /// </summary>
    public static class AshSOGenerator
    {
        const string BaseDir  = "Assets/Data/Characters/Ash";
        const string SkillDir = BaseDir + "/Skills";
        const string JobDir   = BaseDir + "/Job";

        [MenuItem("DarkChronicle/Generate/Ash Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            var skills = GenerateSkills();
            var job    = GenerateJob(skills);
            GenerateCharacterData(job);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[AshSOGenerator] All assets generated.");
        }

        static void EnsureDirectories()
        {
            foreach (var dir in new[] { BaseDir, SkillDir, JobDir })
                if (!AssetDatabase.IsValidFolder(dir))
                {
                    var parts  = dir.Split('/');
                    string parent = string.Join("/", parts[..^1]);
                    AssetDatabase.CreateFolder(parent, parts[^1]);
                }
        }

        // ── スキル全生成 ───────────────────────────────────────────────
        static AshSkills GenerateSkills()
        {
            var s = new AshSkills();

            // ── 基本攻撃 ─────────────────────────────────────────────────
            s.ShadowArrow = CreatePhysicalSkill("SKL_A_ShadowArrow",
                AshDesign.Skill_ShadowArrow.Name, AshDesign.Skill_ShadowArrow.Desc,
                AshDesign.Skill_ShadowArrow.BasePower, 1,
                AshDesign.Skill_ShadowArrow.MPCost, AshDesign.Skill_ShadowArrow.CanBreak);

            s.ShadowArrowPlus = CreatePhysicalSkill("SKL_A_ShadowArrow_Plus",
                AshDesign.Skill_ShadowArrow.NameUpgrade, AshDesign.Skill_ShadowArrow.DescUpgrade,
                AshDesign.Skill_ShadowArrow.BasePowerU, 1,
                AshDesign.Skill_ShadowArrow.MPCostU, AshDesign.Skill_ShadowArrow.CanBreak);

            // ── 毒系 ─────────────────────────────────────────────────────
            s.PoisonArrow = CreatePhysicalSkill("SKL_A_PoisonArrow",
                AshDesign.Skill_PoisonArrow.Name, AshDesign.Skill_PoisonArrow.Desc,
                AshDesign.Skill_PoisonArrow.BasePower, 1,
                AshDesign.Skill_PoisonArrow.MPCost, false,
                statusChance: AshDesign.Skill_PoisonArrow.PoisonChance,
                statusEffect: StatusEffectType.Poison);

            // ── 防御/バフ系 ───────────────────────────────────────────────
            s.Afterimage = CreateSupportSkill("SKL_A_Afterimage",
                AshDesign.Skill_Afterimage.Name, AshDesign.Skill_Afterimage.Desc,
                AshDesign.Skill_Afterimage.MPCost);

            s.EagleEye = CreateSupportSkill("SKL_A_EagleEye",
                AshDesign.Skill_EagleEye.Name, AshDesign.Skill_EagleEye.Desc,
                AshDesign.Skill_EagleEye.MPCost);

            // ── マルチヒット ──────────────────────────────────────────────
            s.DoubleShot = CreatePhysicalSkill("SKL_A_DoubleShot",
                AshDesign.Skill_DoubleShot.Name, AshDesign.Skill_DoubleShot.Desc,
                AshDesign.Skill_DoubleShot.BasePower, AshDesign.Skill_DoubleShot.HitCount,
                AshDesign.Skill_DoubleShot.MPCost, AshDesign.Skill_DoubleShot.CanBreak);

            // ── 罠/デバフ ─────────────────────────────────────────────────
            s.SetTrap = CreateSupportSkill("SKL_A_SetTrap",
                AshDesign.Skill_SetTrap.Name, AshDesign.Skill_SetTrap.Desc,
                AshDesign.Skill_SetTrap.MPCost);

            s.SmokeScreen = CreateSupportSkill("SKL_A_SmokeScreen",
                AshDesign.Skill_SmokeScreen.Name, AshDesign.Skill_SmokeScreen.Desc,
                AshDesign.Skill_SmokeScreen.MPCost, hitsAllEnemies: true);

            // ── 高火力単発 ────────────────────────────────────────────────
            s.DeathmarkShot = CreatePhysicalSkill("SKL_A_DeathmarkShot",
                AshDesign.Skill_DeathmarkShot.Name, AshDesign.Skill_DeathmarkShot.Desc,
                AshDesign.Skill_DeathmarkShot.BasePower, 1,
                AshDesign.Skill_DeathmarkShot.MPCost, false);

            // ── 全体攻撃 ──────────────────────────────────────────────────
            s.ArrowRain = CreatePhysicalSkill("SKL_A_ArrowRain",
                AshDesign.Skill_ArrowRain.Name, AshDesign.Skill_ArrowRain.Desc,
                AshDesign.Skill_ArrowRain.BasePower, AshDesign.Skill_ArrowRain.HitCount,
                AshDesign.Skill_ArrowRain.MPCost, AshDesign.Skill_ArrowRain.CanBreak,
                hitsAll: true);

            // ── 拘束 ─────────────────────────────────────────────────────
            s.ShadowStitch = CreatePhysicalSkill("SKL_A_ShadowStitch",
                AshDesign.Skill_ShadowStitch.Name, AshDesign.Skill_ShadowStitch.Desc,
                AshDesign.Skill_ShadowStitch.BasePower, 1,
                AshDesign.Skill_ShadowStitch.MPCost, false,
                statusChance: 1.00f, statusEffect: StatusEffectType.Sleep);  // Sleep = 行動不能

            // ── 最終奥義 ─────────────────────────────────────────────────
            s.DanceOfDeath = CreatePhysicalSkill("SKL_A_DanceOfDeath",
                AshDesign.Skill_DanceOfDeath.Name, AshDesign.Skill_DanceOfDeath.Desc,
                AshDesign.Skill_DanceOfDeath.BasePower, AshDesign.Skill_DanceOfDeath.HitCount,
                AshDesign.Skill_DanceOfDeath.MPCost, false);

            // ── フィールドスキル ──────────────────────────────────────────
            s.Lockpicking = CreateFieldSkill("SKL_A_Lockpicking",
                AshDesign.Skill_Lockpicking.Name, AshDesign.Skill_Lockpicking.Desc);

            s.TrapMastery = CreateFieldSkill("SKL_A_TrapMastery",
                AshDesign.Skill_TrapMastery.Name, AshDesign.Skill_TrapMastery.Desc);

            s.DarkVision = CreateFieldSkill("SKL_A_DarkVision",
                AshDesign.Skill_DarkVision.Name, AshDesign.Skill_DarkVision.Desc);

            return s;
        }

        // ── ジョブ生成 ────────────────────────────────────────────────
        static JobData GenerateJob(AshSkills s)
        {
            var job = CreateOrLoad<JobData>(JobDir + "/Job_Hunter.asset");

            job.JobName     = "狩人";
            job.Description = "全キャラ最速の行動と高い回避率を持つ物理アタッカー。回避→Shadow State→会心確定のコンボが軸。罠・毒・拘束など変則的な手段で敵を翻弄する玄人向けクラス。フィールド探索も得意。";
            job.ThemeColor  = new Color(0.20f, 0.15f, 0.10f);  // 深い焦茶（革鎧・夜の狩人）

            job.GrowthRates = AshDesign.GrowthRates;

            job.LearnableSkills = new System.Collections.Generic.List<JobSkillEntry>
            {
                // Level 1 初期
                new() { JobLevel=1,  Skill=s.ShadowArrow,    JpCost=0   },
                // Level 2
                new() { JobLevel=2,  Skill=s.PoisonArrow,    JpCost=60  },
                // Level 3
                new() { JobLevel=3,  Skill=s.Lockpicking,    JpCost=70  },
                new() { JobLevel=3,  Skill=s.Afterimage,      JpCost=80  },
                // Level 4
                new() { JobLevel=4,  Skill=s.EagleEye,        JpCost=100 },
                // Level 5
                new() { JobLevel=5,  Skill=s.DoubleShot,      JpCost=130 },
                new() { JobLevel=5,  Skill=CreatePassiveSkill("SKL_A_Passive_FluidEvasion",
                                         AshDesign.Passive_FluidEvasion.Name,
                                         AshDesign.Passive_FluidEvasion.Desc), JpCost=150 },
                // Level 6
                new() { JobLevel=6,  Skill=s.SetTrap,         JpCost=160 },
                new() { JobLevel=6,  Skill=s.TrapMastery,     JpCost=140 },
                // Level 7
                new() { JobLevel=7,  Skill=s.SmokeScreen,     JpCost=180 },
                // Level 8
                new() { JobLevel=8,  Skill=s.DeathmarkShot,   JpCost=220 },
                new() { JobLevel=8,  Skill=CreatePassiveSkill("SKL_A_Passive_CritEnhancement",
                                         AshDesign.Passive_CriticalEnhancement.Name,
                                         AshDesign.Passive_CriticalEnhancement.Desc), JpCost=260 },
                // Level 9
                new() { JobLevel=9,  Skill=s.ArrowRain,       JpCost=240 },
                new() { JobLevel=9,  Skill=s.DarkVision,       JpCost=180 },
                // Level 10
                new() { JobLevel=10, Skill=s.ShadowArrowPlus, JpCost=260 },
                new() { JobLevel=10, Skill=s.ShadowStitch,    JpCost=240 },
                // Level 11 (最終)
                new() { JobLevel=11, Skill=s.DanceOfDeath,    JpCost=340 },
            };

            job.AllowedWeapons = new System.Collections.Generic.List<WeaponType>(AshDesign.AllowedWeapons);
            job.AllowedArmors  = new System.Collections.Generic.List<ArmorType>(AshDesign.AllowedArmors);

            EditorUtility.SetDirty(job);
            return job;
        }

        // ── キャラクターデータ生成 ────────────────────────────────────
        static void GenerateCharacterData(JobData job)
        {
            var cd = CreateOrLoad<CharacterData>(BaseDir + "/CHR_Ash.asset");

            cd.CharacterName = AshDesign.CharacterName;
            cd.Backstory     =
                "元王国諜報部隊「鴉の翼」所属の腕利き斥候。27歳。" +
                "任務中に見た王国の真実に独自行動を取り、お尋ね者になった。" +
                "今は賞金稼ぎとして気ままに生きる飄々とした皮肉屋。" +
                "いざとなれば誰より頼りになる。本人は口が裂けても言わないが。";
            cd.VoicePrefix   = AshDesign.VoicePrefix;
            cd.ThemeColor    = new Color(0.20f, 0.15f, 0.10f);
            cd.BaseStats     = AshDesign.BaseStats;
            cd.StarterJob    = job;
            cd.ChapterCount  = AshDesign.ChapterTitles.Length;
            cd.ChapterTitles = AshDesign.ChapterTitles;

            EditorUtility.SetDirty(cd);
        }

        // ── ファクトリ ────────────────────────────────────────────────
        static SkillData CreatePhysicalSkill(string fileName, string name, string desc,
                                              float power, int hits, int mpCost, bool canBreak,
                                              bool hitsAll = false,
                                              float statusChance = 0f,
                                              StatusEffectType statusEffect = StatusEffectType.Poison)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.Element        = ElementType.None;
            sk.DamageType     = DamageType.Physical;
            sk.BasePower      = power;
            sk.HitCount       = hits;
            sk.MPCost         = mpCost;
            sk.CanBreak       = canBreak;
            sk.HitsAllEnemies = hitsAll;
            sk.StatusChance   = statusChance;
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateSupportSkill(string fileName, string name, string desc,
                                             int mpCost, bool hitsAllEnemies = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.MPCost         = mpCost;
            sk.HitsAllEnemies = hitsAllEnemies;
            sk.IsHeal         = false;
            sk.BasePower      = 0f;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateFieldSkill(string fileName, string name, string desc)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName   = name;
            sk.Description = desc;
            sk.MPCost      = 0;
            sk.BasePower   = 0f;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreatePassiveSkill(string fileName, string name, string desc)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName   = name;
            sk.Description = desc;
            sk.MPCost      = 0;
            sk.BasePower   = 0f;
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

        class AshSkills
        {
            public SkillData ShadowArrow, ShadowArrowPlus;
            public SkillData PoisonArrow;
            public SkillData Afterimage;
            public SkillData EagleEye;
            public SkillData DoubleShot;
            public SkillData SetTrap;
            public SkillData SmokeScreen;
            public SkillData DeathmarkShot;
            public SkillData ArrowRain;
            public SkillData ShadowStitch;
            public SkillData DanceOfDeath;
            public SkillData Lockpicking, TrapMastery, DarkVision;
        }
    }
}
#endif
