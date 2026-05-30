#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.CharacterDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Unityエディタメニューから呼び出して、ラヴィニア関連の
    /// ScriptableObjectをすべて自動生成するツール。
    /// Menu: DarkChronicle → Generate → Lavinia Assets
    /// </summary>
    public static class LaviniaSOGenerator
    {
        const string BaseDir  = "Assets/Data/Characters/Lavinia";
        const string SkillDir = BaseDir + "/Skills";
        const string JobDir   = BaseDir + "/Job";

        [MenuItem("DarkChronicle/Generate/Lavinia Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            var skills = GenerateSkills();
            var job    = GenerateJob(skills);
            GenerateCharacterData(job);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[LaviniaSOGenerator] All assets generated.");
        }

        static void EnsureDirectories()
        {
            foreach (var dir in new[] { BaseDir, SkillDir, JobDir })
                if (!AssetDatabase.IsValidFolder(dir))
                {
                    var parts = dir.Split('/');
                    string parent = string.Join("/", parts[..^1]);
                    AssetDatabase.CreateFolder(parent, parts[^1]);
                }
        }

        // ── スキル全生成 ───────────────────────────────────────────────
        static LaviniaSkills GenerateSkills()
        {
            var s = new LaviniaSkills();

            // 炎系
            s.FireBolt = CreateMagicSkill("SKL_L_FireBolt",
                LaviniaDesign.Skill_FireBolt.Name, LaviniaDesign.Skill_FireBolt.Desc,
                LaviniaDesign.Skill_FireBolt.Element, LaviniaDesign.Skill_FireBolt.BasePower,
                LaviniaDesign.Skill_FireBolt.HitCount, LaviniaDesign.Skill_FireBolt.MPCost,
                LaviniaDesign.Skill_FireBolt.CanBreak,
                statusChance: LaviniaDesign.Skill_FireBolt.BurnChance);

            s.FireBoltPlus = CreateMagicSkill("U_SKL_L_FireBolt",
                LaviniaDesign.Skill_FireBolt.NameUpgrade, LaviniaDesign.Skill_FireBolt.DescUpgrade,
                LaviniaDesign.Skill_FireBolt.Element, LaviniaDesign.Skill_FireBolt.BasePowerU,
                LaviniaDesign.Skill_FireBolt.HitCount, LaviniaDesign.Skill_FireBolt.MPCostU,
                LaviniaDesign.Skill_FireBolt.CanBreak,
                statusChance: LaviniaDesign.Skill_FireBolt.BurnChanceU);

            s.Inferno = CreateMagicSkill("SKL_L_Inferno",
                LaviniaDesign.Skill_Inferno.Name, LaviniaDesign.Skill_Inferno.Desc,
                LaviniaDesign.Skill_Inferno.Element, LaviniaDesign.Skill_Inferno.BasePower,
                1, LaviniaDesign.Skill_Inferno.MPCost, LaviniaDesign.Skill_Inferno.CanBreak,
                statusChance: LaviniaDesign.Skill_Inferno.BurnChance);

            // 氷系
            s.IceSpike = CreateMagicSkill("SKL_L_IceSpike",
                LaviniaDesign.Skill_IceSpike.Name, LaviniaDesign.Skill_IceSpike.Desc,
                LaviniaDesign.Skill_IceSpike.Element, LaviniaDesign.Skill_IceSpike.BasePower,
                LaviniaDesign.Skill_IceSpike.HitCount, LaviniaDesign.Skill_IceSpike.MPCost,
                LaviniaDesign.Skill_IceSpike.CanBreak,
                statusChance: LaviniaDesign.Skill_IceSpike.FreezeChance);

            s.Blizzard = CreateMagicSkill("SKL_L_Blizzard",
                LaviniaDesign.Skill_Blizzard.Name, LaviniaDesign.Skill_Blizzard.Desc,
                LaviniaDesign.Skill_Blizzard.Element, LaviniaDesign.Skill_Blizzard.BasePower,
                1, LaviniaDesign.Skill_Blizzard.MPCost, false,
                hitsAll: true,
                statusChance: LaviniaDesign.Skill_Blizzard.FreezeChance);

            // 雷系
            s.ChainLightning = CreateMagicSkill("SKL_L_ChainLightning",
                LaviniaDesign.Skill_ChainLightning.Name, LaviniaDesign.Skill_ChainLightning.Desc,
                LaviniaDesign.Skill_ChainLightning.Element, LaviniaDesign.Skill_ChainLightning.BasePower,
                LaviniaDesign.Skill_ChainLightning.ChainCount,
                LaviniaDesign.Skill_ChainLightning.MPCost,
                LaviniaDesign.Skill_ChainLightning.CanBreak,
                statusChance: LaviniaDesign.Skill_ChainLightning.ParalyzeChance);

            // 風系
            s.GaleBlade = CreateMagicSkill("SKL_L_GaleBlade",
                LaviniaDesign.Skill_GaleBlade.Name, LaviniaDesign.Skill_GaleBlade.Desc,
                LaviniaDesign.Skill_GaleBlade.Element, LaviniaDesign.Skill_GaleBlade.BasePower,
                LaviniaDesign.Skill_GaleBlade.HitCount,
                LaviniaDesign.Skill_GaleBlade.MPCost,
                LaviniaDesign.Skill_GaleBlade.CanBreak,
                hitsAll: true);

            // 闇系
            s.DarkWave = CreateMagicSkill("SKL_L_DarkWave",
                LaviniaDesign.Skill_DarkWave.Name, LaviniaDesign.Skill_DarkWave.Desc,
                LaviniaDesign.Skill_DarkWave.Element, LaviniaDesign.Skill_DarkWave.BasePower,
                1, LaviniaDesign.Skill_DarkWave.MPCost,
                LaviniaDesign.Skill_DarkWave.CanBreak);

            // 光系
            s.HolyBlaze = CreateMagicSkill("SKL_L_HolyBlaze",
                LaviniaDesign.Skill_HolyBlaze.Name, LaviniaDesign.Skill_HolyBlaze.Desc,
                LaviniaDesign.Skill_HolyBlaze.Element, LaviniaDesign.Skill_HolyBlaze.BasePower,
                1, LaviniaDesign.Skill_HolyBlaze.MPCost,
                LaviniaDesign.Skill_HolyBlaze.CanBreak);

            // 複合・上位
            s.ArcaneBurst = CreateMagicSkill("SKL_L_ArcaneBurst",
                LaviniaDesign.Skill_ArcaneBurst.Name, LaviniaDesign.Skill_ArcaneBurst.Desc,
                LaviniaDesign.Skill_ArcaneBurst.Element, LaviniaDesign.Skill_ArcaneBurst.BasePower,
                1, LaviniaDesign.Skill_ArcaneBurst.MPCost, false,
                dmgType: DamageType.True);

            s.ElementalConverge = CreateMagicSkill("SKL_L_ElementalConverge",
                LaviniaDesign.Skill_ElementalConverge.Name,
                LaviniaDesign.Skill_ElementalConverge.Desc,
                LaviniaDesign.Skill_ElementalConverge.Element,
                LaviniaDesign.Skill_ElementalConverge.BasePower,
                1, LaviniaDesign.Skill_ElementalConverge.MPCost, false);

            // 支援
            s.ManaAcceleration = CreateSupportSkill("SKL_L_ManaAcceleration",
                LaviniaDesign.Skill_ManaAcceleration.Name,
                LaviniaDesign.Skill_ManaAcceleration.Desc,
                LaviniaDesign.Skill_ManaAcceleration.MPCost,
                hitsAllAllies: false);

            s.CurseOfSilence = CreateMagicSkill("SKL_L_CurseOfSilence",
                LaviniaDesign.Skill_CurseOfSilence.Name,
                LaviniaDesign.Skill_CurseOfSilence.Desc,
                ElementType.Dark, 0f, 1,
                LaviniaDesign.Skill_CurseOfSilence.MPCost, false,
                statusChance: LaviniaDesign.Skill_CurseOfSilence.SuccessRate);

            return s;
        }

        // ── ジョブ生成 ────────────────────────────────────────────────
        static JobData GenerateJob(LaviniaSkills s)
        {
            var job = CreateOrLoad<JobData>(JobDir + "/Job_Mage.asset");

            job.JobName    = "魔法使い";
            job.Description = "6属性すべてを操る純粋魔法アタッカー。圧倒的な魔法火力と「元素共鳴」システムで属性を連鎖させる。打たれ弱さとMP管理が命。ほぼすべてのスキルが攻撃魔法。";
            job.ThemeColor = new Color(0.08f, 0.10f, 0.30f);  // 深夜群青

            job.GrowthRates = LaviniaDesign.GrowthRates;

            job.LearnableSkills = new System.Collections.Generic.List<JobSkillEntry>
            {
                // Level 1 初期
                new() { JobLevel=1,  Skill=s.FireBolt,          JpCost=0   },
                // Level 2
                new() { JobLevel=2,  Skill=s.IceSpike,          JpCost=60  },
                // Level 3
                new() { JobLevel=3,  Skill=s.ManaAcceleration,  JpCost=80  },
                // Level 4
                new() { JobLevel=4,  Skill=s.CurseOfSilence,    JpCost=100 },
                // Level 5
                new() { JobLevel=5,  Skill=s.Blizzard,          JpCost=150 },
                new() { JobLevel=5,  Skill=CreatePassiveSkill("SKL_L_Passive_OverloadedCasting",
                                         LaviniaDesign.Passive_OverloadedCasting.Name,
                                         LaviniaDesign.Passive_OverloadedCasting.Desc), JpCost=160 },
                // Level 6
                new() { JobLevel=6,  Skill=s.ChainLightning,    JpCost=180 },
                // Level 7
                new() { JobLevel=7,  Skill=s.GaleBlade,         JpCost=200 },
                // Level 8
                new() { JobLevel=8,  Skill=s.Inferno,           JpCost=250 },
                new() { JobLevel=8,  Skill=CreatePassiveSkill("SKL_L_Passive_ArcaneMastery",
                                         LaviniaDesign.Passive_ArcaneMastery.Name,
                                         LaviniaDesign.Passive_ArcaneMastery.Desc), JpCost=280 },
                // Level 9
                new() { JobLevel=9,  Skill=s.DarkWave,          JpCost=240 },
                // Level 10
                new() { JobLevel=10, Skill=s.HolyBlaze,         JpCost=280 },
                // Level 11
                new() { JobLevel=11, Skill=s.ArcaneBurst,       JpCost=320 },
                // Level 12 (最高峰)
                new() { JobLevel=12, Skill=s.ElementalConverge, JpCost=380 },
            };

            job.AllowedWeapons = new System.Collections.Generic.List<WeaponType>(LaviniaDesign.AllowedWeapons);
            job.AllowedArmors  = new System.Collections.Generic.List<ArmorType>(LaviniaDesign.AllowedArmors);

            EditorUtility.SetDirty(job);
            return job;
        }

        // ── キャラクターデータ生成 ────────────────────────────────────
        static void GenerateCharacterData(JobData job)
        {
            var cd = CreateOrLoad<CharacterData>(BaseDir + "/CHR_Lavinia.asset");

            cd.CharacterName = LaviniaDesign.CharacterName;
            cd.Backstory     =
                "王立魔術院の元首席研究官。深い群青黒の長髪で前髪を左目に掛け、" +
                "右目だけ氷青の瞳が覗く。左目は深紅のオッドアイで禁忌の契約の証。" +
                "深紺の甲冑と星空模様の大コート、深紫のコルセットを纏い、" +
                "三日月型の杖と光る魔導書を携える。禁忌の契約で人知を超えた魔力を得た代価として、" +
                "寿命を少しずつ支払い続けている。品格と知性で感情を包み隠すが、" +
                "旅を通じて仲間への信頼を少しずつ見せるようになる。甘いものが好き。";
            cd.VoicePrefix    = LaviniaDesign.VoicePrefix;
            // テーマカラー: 深夜群青をベースに氷青の魔力と深紫のアクセント
            cd.ThemeColor     = new Color(0.08f, 0.10f, 0.30f);  // #14193C — 深夜群青
            cd.BaseStats      = LaviniaDesign.BaseStats;
            cd.StarterJob     = job;
            cd.ChapterCount   = LaviniaDesign.ChapterTitles.Length;
            cd.ChapterTitles  = LaviniaDesign.ChapterTitles;

            EditorUtility.SetDirty(cd);
        }

        // ── ファクトリ ────────────────────────────────────────────────
        static SkillData CreateMagicSkill(string fileName, string name, string desc,
                                           ElementType element, float power, int hits,
                                           int mpCost, bool canBreak,
                                           bool hitsAll = false,
                                           float statusChance = 0f,
                                           DamageType dmgType = DamageType.Magical)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.Element        = element;
            sk.DamageType     = dmgType;
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
                                             int mpCost, bool hitsAllAllies = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName     = name;
            sk.Description   = desc;
            sk.MPCost        = mpCost;
            sk.HitsAllAllies = hitsAllAllies;
            sk.IsHeal        = false;
            sk.BasePower     = 0f;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreatePassiveSkill(string fileName, string name, string desc)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName  = name;
            sk.Description = desc;
            sk.MPCost     = 0;
            sk.BasePower  = 0f;
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

        class LaviniaSkills
        {
            public SkillData FireBolt, FireBoltPlus, Inferno;
            public SkillData IceSpike, Blizzard;
            public SkillData ChainLightning;
            public SkillData GaleBlade;
            public SkillData DarkWave;
            public SkillData HolyBlaze;
            public SkillData ArcaneBurst, ElementalConverge;
            public SkillData ManaAcceleration, CurseOfSilence;
        }
    }
}
#endif
