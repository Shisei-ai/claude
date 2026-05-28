#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.CharacterDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Unityエディタメニューから呼び出して、ゼノ関連の
    /// ScriptableObjectをすべて自動生成するツール。
    /// Menu: DarkChronicle → Generate → Zeno Assets
    /// </summary>
    public static class ZenoSOGenerator
    {
        const string BaseDir  = "Assets/Data/Characters/Zeno";
        const string SkillDir = BaseDir + "/Skills";
        const string JobDir   = BaseDir + "/Job";

        [MenuItem("DarkChronicle/Generate/Zeno Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            var skills = GenerateSkills();
            var job    = GenerateJob(skills);
            GenerateCharacterData(job);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[ZenoSOGenerator] All assets generated.");
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

        static ZenoSkills GenerateSkills()
        {
            var s = new ZenoSkills();

            // ── 速度デバフ ────────────────────────────────────────────────
            s.BindCurse = CreateDebuffSkill("SKL_Z_BindCurse",
                ZenoDesign.Skill_BindCurse.Name, ZenoDesign.Skill_BindCurse.Desc,
                ZenoDesign.Skill_BindCurse.MPCost);

            s.BindCursePlus = CreateDebuffSkill("SKL_Z_BindCurse_Plus",
                ZenoDesign.Skill_BindCurse.NameUpgrade, ZenoDesign.Skill_BindCurse.DescUpgrade,
                ZenoDesign.Skill_BindCurse.MPCostU);

            // ── 毒系 ─────────────────────────────────────────────────────
            s.PoisonMist = CreateDebuffSkill("SKL_Z_PoisonMist",
                ZenoDesign.Skill_PoisonMist.Name, ZenoDesign.Skill_PoisonMist.Desc,
                ZenoDesign.Skill_PoisonMist.MPCost, hitsAllEnemies: true,
                statusChance: ZenoDesign.Skill_PoisonMist.PoisonChance,
                statusEffect: StatusEffectType.Poison);

            // ── 恐怖 ─────────────────────────────────────────────────────
            s.Terror = CreateDebuffSkill("SKL_Z_Terror",
                ZenoDesign.Skill_Terror.Name, ZenoDesign.Skill_Terror.Desc,
                ZenoDesign.Skill_Terror.MPCost,
                statusChance: ZenoDesign.Skill_Terror.FearChance,
                statusEffect: StatusEffectType.Sleep);  // Sleep = 行動封じの代用

            // ── 全ステータスデバフ ────────────────────────────────────────
            s.EvilEye = CreateDebuffSkill("SKL_Z_EvilEye",
                ZenoDesign.Skill_EvilEye.Name, ZenoDesign.Skill_EvilEye.Desc,
                ZenoDesign.Skill_EvilEye.MPCost);

            s.EvilEyePlus = CreateDebuffSkill("SKL_Z_EvilEye_Plus",
                ZenoDesign.Skill_EvilEye.NameUpgrade, ZenoDesign.Skill_EvilEye.DescUpgrade,
                ZenoDesign.Skill_EvilEye.MPCostU);

            // ── 吸収（固有） ──────────────────────────────────────────────
            s.Absorb = CreateSpecialSkill("SKL_Z_Absorb",
                ZenoDesign.Skill_Absorb.Name, ZenoDesign.Skill_Absorb.Desc,
                ZenoDesign.Skill_Absorb.MPCost);

            s.AbsorbPlus = CreateSpecialSkill("SKL_Z_Absorb_Plus",
                ZenoDesign.Skill_Absorb.NameUpgrade, ZenoDesign.Skill_Absorb.DescUpgrade,
                ZenoDesign.Skill_Absorb.MPCostU);

            s.SoulFeast = CreateSpecialSkill("SKL_Z_SoulFeast",
                ZenoDesign.Skill_SoulFeast.Name, ZenoDesign.Skill_SoulFeast.Desc,
                ZenoDesign.Skill_SoulFeast.MPCost);

            // ── 行動封じ ─────────────────────────────────────────────────
            s.SoulShackle = CreateDebuffSkill("SKL_Z_SoulShackle",
                ZenoDesign.Skill_SoulShackle.Name, ZenoDesign.Skill_SoulShackle.Desc,
                ZenoDesign.Skill_SoulShackle.MPCost,
                statusChance: 1.00f, statusEffect: StatusEffectType.Sleep);

            // ── ランダムデバフ ────────────────────────────────────────────
            s.CurseFog = CreateDebuffSkill("SKL_Z_CurseFog",
                ZenoDesign.Skill_CurseFog.Name, ZenoDesign.Skill_CurseFog.Desc,
                ZenoDesign.Skill_CurseFog.MPCost, hitsAllEnemies: true,
                statusChance: ZenoDesign.Skill_CurseFog.StatusChance);

            // ── 因果連鎖 ─────────────────────────────────────────────────
            s.CausalChain = CreateSpecialSkill("SKL_Z_CausalChain",
                ZenoDesign.Skill_CausalChain.Name, ZenoDesign.Skill_CausalChain.Desc,
                ZenoDesign.Skill_CausalChain.MPCost);

            s.CausalChainPlus = CreateSpecialSkill("SKL_Z_CausalChain_Plus",
                ZenoDesign.Skill_CausalChain.NameUpgrade, ZenoDesign.Skill_CausalChain.DescUpgrade,
                ZenoDesign.Skill_CausalChain.MPCostU, hitsAllEnemies: true);

            // ── 遅延除去 ─────────────────────────────────────────────────
            s.DeathSentence = CreateSpecialSkill("SKL_Z_DeathSentence",
                ZenoDesign.Skill_DeathSentence.Name, ZenoDesign.Skill_DeathSentence.Desc,
                ZenoDesign.Skill_DeathSentence.MPCost);

            s.DeathSentencePlus = CreateSpecialSkill("SKL_Z_DeathSentence_Plus",
                ZenoDesign.Skill_DeathSentence.NameUpgrade, ZenoDesign.Skill_DeathSentence.DescUpgrade,
                ZenoDesign.Skill_DeathSentence.MPCostU);

            // ── 全体デバフ ────────────────────────────────────────────────
            s.ChaosCurse = CreateDebuffSkill("SKL_Z_ChaosCurse",
                ZenoDesign.Skill_ChaosCurse.Name, ZenoDesign.Skill_ChaosCurse.Desc,
                ZenoDesign.Skill_ChaosCurse.MPCost, hitsAllEnemies: true,
                statusChance: ZenoDesign.Skill_ChaosCurse.StatusChance);

            // ── 最終奥義 ─────────────────────────────────────────────────
            s.GateOfUnderworld = CreateSpecialSkill("SKL_Z_GateOfUnderworld",
                ZenoDesign.Skill_GateOfUnderworld.Name, ZenoDesign.Skill_GateOfUnderworld.Desc,
                ZenoDesign.Skill_GateOfUnderworld.MPCost);

            return s;
        }

        static JobData GenerateJob(ZenoSkills s)
        {
            var job = CreateOrLoad<JobData>(JobDir + "/Job_Shaman.asset");

            job.JobName     = "呪術師";
            job.Description = "妨害・弱体化に特化したデバッファー。SPD25（全2位）で先手を取りながら、敵の能力を削り行動を封じる。「吸収」システムで敵のスキルを奪いグリモワールに蓄積する唯一無二のキャラクター。HPが減るほど強くなる反面、守りは薄い。";
            job.ThemeColor  = new Color(0.20f, 0.05f, 0.30f);  // 深い暗紫（呪術・禁忌）

            job.GrowthRates = ZenoDesign.GrowthRates;

            job.LearnableSkills = new System.Collections.Generic.List<JobSkillEntry>
            {
                // Level 1: 基本デバフ（速度封じ）
                new() { JobLevel=1,  Skill=s.BindCurse,           JpCost=0   },
                // Level 2: 毒撒き
                new() { JobLevel=2,  Skill=s.PoisonMist,          JpCost=60  },
                // Level 3: 複合デバフ二種（恐怖 / 全ステデバフ）
                new() { JobLevel=3,  Skill=s.Terror,              JpCost=80  },
                new() { JobLevel=3,  Skill=s.EvilEye,             JpCost=90  },
                // Level 4: 核心スキル「吸収」解禁
                new() { JobLevel=4,  Skill=s.Absorb,              JpCost=100 },
                // Level 5: 行動封じ + パッシブ
                new() { JobLevel=5,  Skill=s.SoulShackle,         JpCost=130 },
                new() { JobLevel=5,  Skill=CreatePassiveSkill("SKL_Z_Passive_CurseMastery",
                                         ZenoDesign.Passive_CurseMastery.Name,
                                         ZenoDesign.Passive_CurseMastery.Desc), JpCost=140 },
                // Level 6: ランダムデバフ + 強化版解放
                new() { JobLevel=6,  Skill=s.CurseFog,            JpCost=160 },
                new() { JobLevel=6,  Skill=s.BindCursePlus,       JpCost=150 },
                new() { JobLevel=6,  Skill=s.AbsorbPlus,          JpCost=170 },
                // Level 7: 因果連鎖（多敵戦の必殺技）
                new() { JobLevel=7,  Skill=s.CausalChain,         JpCost=200 },
                // Level 8: 強化吸収 + パッシブ
                new() { JobLevel=8,  Skill=s.SoulFeast,           JpCost=220 },
                new() { JobLevel=8,  Skill=CreatePassiveSkill("SKL_Z_Passive_PriceOfAbsorption",
                                         ZenoDesign.Passive_PriceOfAbsorption.Name,
                                         ZenoDesign.Passive_PriceOfAbsorption.Desc), JpCost=250 },
                // Level 9: 遅延死 + 強化版群
                new() { JobLevel=9,  Skill=s.DeathSentence,       JpCost=240 },
                new() { JobLevel=9,  Skill=s.EvilEyePlus,         JpCost=200 },
                new() { JobLevel=9,  Skill=s.CausalChainPlus,     JpCost=260 },
                // Level 10: 全体デバフ全部載せ
                new() { JobLevel=10, Skill=s.ChaosCurse,          JpCost=300 },
                new() { JobLevel=10, Skill=s.DeathSentencePlus,   JpCost=280 },
                // Level 11: 最終奥義
                new() { JobLevel=11, Skill=s.GateOfUnderworld,    JpCost=360 },
            };

            job.AllowedWeapons = new System.Collections.Generic.List<WeaponType>(ZenoDesign.AllowedWeapons);
            job.AllowedArmors  = new System.Collections.Generic.List<ArmorType>(ZenoDesign.AllowedArmors);

            EditorUtility.SetDirty(job);
            return job;
        }

        static void GenerateCharacterData(JobData job)
        {
            var cd = CreateOrLoad<CharacterData>(BaseDir + "/CHR_Zeno.asset");

            cd.CharacterName = ZenoDesign.CharacterName;
            cd.Backstory     =
                "元王立魔術院の精霊魔法研究員。34歳。" +
                "禁忌の「魂吸収」魔法を追求したため異端として追放された。" +
                "封印された妹の魂を取り戻すために力を集め続ける。" +
                "狡猾で口数が少ないが、妹を想う炎だけは誰にも消せない。" +
                "ラヴィニアとは禁忌の術者同士として複雑な関係を持つ。";
            cd.VoicePrefix   = ZenoDesign.VoicePrefix;
            cd.ThemeColor    = new Color(0.20f, 0.05f, 0.30f);
            cd.BaseStats     = ZenoDesign.BaseStats;
            cd.StarterJob    = job;
            cd.ChapterCount  = ZenoDesign.ChapterTitles.Length;
            cd.ChapterTitles = ZenoDesign.ChapterTitles;

            EditorUtility.SetDirty(cd);
        }

        static SkillData CreateDebuffSkill(string fileName, string name, string desc,
                                            int mpCost, bool hitsAllEnemies = false,
                                            float statusChance = 0f,
                                            StatusEffectType statusEffect = StatusEffectType.Blind)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.MPCost         = mpCost;
            sk.HitsAllEnemies = hitsAllEnemies;
            sk.StatusChance   = statusChance;
            sk.BasePower      = 0f;
            sk.IsHeal         = false;
            sk.Element        = ElementType.Dark;   // 呪術は闇属性
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateSpecialSkill(string fileName, string name, string desc,
                                             int mpCost, bool hitsAllEnemies = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.MPCost         = mpCost;
            sk.HitsAllEnemies = hitsAllEnemies;
            sk.BasePower      = 0f;
            sk.IsHeal         = false;
            sk.Element        = ElementType.Dark;
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

        class ZenoSkills
        {
            public SkillData BindCurse, BindCursePlus;
            public SkillData PoisonMist;
            public SkillData Terror;
            public SkillData EvilEye, EvilEyePlus;
            public SkillData Absorb, AbsorbPlus, SoulFeast;
            public SkillData SoulShackle;
            public SkillData CurseFog;
            public SkillData CausalChain, CausalChainPlus;
            public SkillData DeathSentence, DeathSentencePlus;
            public SkillData ChaosCurse;
            public SkillData GateOfUnderworld;
        }
    }
}
#endif
