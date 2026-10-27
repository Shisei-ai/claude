#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.CharacterDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Unityエディタメニューから呼び出して、リリア関連の
    /// ScriptableObjectをすべて自動生成するツール。
    /// Menu: DarkChronicle → Generate → Lilia Assets
    /// </summary>
    public static class LiliaSOGenerator
    {
        const string BaseDir  = "Assets/Data/Characters/Lilia";
        const string SkillDir = BaseDir + "/Skills";
        const string JobDir   = BaseDir + "/Job";

        [MenuItem("DarkChronicle/Generate/Lilia Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();
            var skills = GenerateSkills();
            var job    = GenerateJob(skills);
            GenerateCharacterData(job);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[LiliaSOGenerator] All assets generated.");
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
        static LiliaSkills GenerateSkills()
        {
            var s = new LiliaSkills();

            // ── 回復 ─────────────────────────────────────────────────────
            s.Cure = CreateHealSkill("SKL_L2_Cure",
                LiliaDesign.Skill_Cure.Name, LiliaDesign.Skill_Cure.Desc,
                LiliaDesign.Skill_Cure.HealPower, LiliaDesign.Skill_Cure.MPCost,
                hitsAllAllies: false);

            s.CurePlus = CreateHealSkill("SKL_L2_Cure_Plus",
                LiliaDesign.Skill_Cure.NameUpgrade, LiliaDesign.Skill_Cure.DescUpgrade,
                LiliaDesign.Skill_Cure.HealPowerU, LiliaDesign.Skill_Cure.MPCostU,
                hitsAllAllies: false);

            s.HolyCure = CreateHealSkill("SKL_L2_HolyCure",
                LiliaDesign.Skill_HolyCure.Name, LiliaDesign.Skill_HolyCure.Desc,
                LiliaDesign.Skill_HolyCure.HealPower, LiliaDesign.Skill_HolyCure.MPCost,
                hitsAllAllies: false);

            s.HolyCurePlus = CreateHealSkill("SKL_L2_HolyCure_Plus",
                LiliaDesign.Skill_HolyCure.NameUpgrade, LiliaDesign.Skill_HolyCure.DescUpgrade,
                LiliaDesign.Skill_HolyCure.HealPowerU, LiliaDesign.Skill_HolyCure.MPCostU,
                hitsAllAllies: false);

            s.Curaga = CreateHealSkill("SKL_L2_Curaga",
                LiliaDesign.Skill_Curaga.Name, LiliaDesign.Skill_Curaga.Desc,
                LiliaDesign.Skill_Curaga.HealPower, LiliaDesign.Skill_Curaga.MPCost,
                hitsAllAllies: true);

            s.MiracleBlessing = CreateHealSkill("SKL_L2_MiracleBlessing",
                LiliaDesign.Skill_MiracleBlessing.Name, LiliaDesign.Skill_MiracleBlessing.Desc,
                LiliaDesign.Skill_MiracleBlessing.HealPower, LiliaDesign.Skill_MiracleBlessing.MPCost,
                hitsAllAllies: true);

            // ── 蘇生 ─────────────────────────────────────────────────────
            s.Revive = CreateReviveSkill("SKL_L2_Revive",
                LiliaDesign.Skill_Revive.Name, LiliaDesign.Skill_Revive.Desc,
                LiliaDesign.Skill_Revive.ReviveHPPct, LiliaDesign.Skill_Revive.MPCost,
                reviveAll: false);

            s.RevivePlus = CreateReviveSkill("SKL_L2_Revive_Plus",
                LiliaDesign.Skill_Revive.NameUpgrade, LiliaDesign.Skill_Revive.DescUpgrade,
                LiliaDesign.Skill_Revive.ReviveHPPctU, LiliaDesign.Skill_Revive.MPCostU,
                reviveAll: false);

            s.FullRevive = CreateReviveSkill("SKL_L2_FullRevive",
                LiliaDesign.Skill_FullRevive.Name, LiliaDesign.Skill_FullRevive.Desc,
                LiliaDesign.Skill_FullRevive.ReviveHPPct, LiliaDesign.Skill_FullRevive.MPCost,
                reviveAll: true);

            // ── 状態異常回復 ──────────────────────────────────────────────
            s.Purify = CreateSupportSkill("SKL_L2_Purify",
                LiliaDesign.Skill_Purify.Name, LiliaDesign.Skill_Purify.Desc,
                LiliaDesign.Skill_Purify.MPCost);

            // ── バフ・補助 ────────────────────────────────────────────────
            s.GuardianPrayer = CreateSupportSkill("SKL_L2_GuardianPrayer",
                LiliaDesign.Skill_GuardianPrayer.Name, LiliaDesign.Skill_GuardianPrayer.Desc,
                LiliaDesign.Skill_GuardianPrayer.MPCost);

            s.GuardianPrayerPlus = CreateSupportSkill("SKL_L2_GuardianPrayer_Plus",
                LiliaDesign.Skill_GuardianPrayer.NameUpgrade, LiliaDesign.Skill_GuardianPrayer.DescUpgrade,
                LiliaDesign.Skill_GuardianPrayer.MPCostU);

            s.RegenLight = CreateSupportSkill("SKL_L2_RegenLight",
                LiliaDesign.Skill_RegenLight.Name, LiliaDesign.Skill_RegenLight.Desc,
                LiliaDesign.Skill_RegenLight.MPCost, hitsAllAllies: true);

            s.Sanctuary = CreateSupportSkill("SKL_L2_Sanctuary",
                LiliaDesign.Skill_Sanctuary.Name, LiliaDesign.Skill_Sanctuary.Desc,
                LiliaDesign.Skill_Sanctuary.MPCost, hitsAllAllies: true);

            // ── 聖属性攻撃 ────────────────────────────────────────────────
            s.HolyBolt = CreateHolySkill("SKL_L2_HolyBolt",
                LiliaDesign.Skill_HolyBolt.Name, LiliaDesign.Skill_HolyBolt.Desc,
                LiliaDesign.Skill_HolyBolt.BasePower, 1,
                LiliaDesign.Skill_HolyBolt.MPCost, LiliaDesign.Skill_HolyBolt.CanBreak,
                hitsAll: false);

            s.HolyBoltPlus = CreateHolySkill("SKL_L2_HolyBolt_Plus",
                LiliaDesign.Skill_HolyBolt.NameUpgrade, LiliaDesign.Skill_HolyBolt.DescUpgrade,
                LiliaDesign.Skill_HolyBolt.BasePowerU, 1,
                LiliaDesign.Skill_HolyBolt.MPCostU, LiliaDesign.Skill_HolyBolt.CanBreak,
                hitsAll: false);

            s.DivinePunishment = CreateHolySkill("SKL_L2_DivinePunishment",
                LiliaDesign.Skill_DivinePunishment.Name, LiliaDesign.Skill_DivinePunishment.Desc,
                LiliaDesign.Skill_DivinePunishment.BasePower,
                LiliaDesign.Skill_DivinePunishment.HitCount,
                LiliaDesign.Skill_DivinePunishment.MPCost,
                LiliaDesign.Skill_DivinePunishment.CanBreak, hitsAll: true);

            return s;
        }

        // ── ジョブ生成 ────────────────────────────────────────────────
        static JobData GenerateJob(LiliaSkills s)
        {
            var job = CreateOrLoad<JobData>(JobDir + "/Job_Cleric.asset");

            job.JobName     = "僧侶";
            job.Description = "全キャラ最多MPを持つ回復・支援特化クラス。単体回復・全体回復・蘇生・状態異常回復・防御バフを網羅し、パーティの生命線となる。聖属性攻撃が使える唯一のキャラクターで、アンデッド系に対して壊滅的なダメージを与えられる。行動は遅いが、遅いからこそ被ダメを見てから動ける。";
            // テーマカラー: 温かみのある聖白（ドレスの WhiteBase ＋ 金刺繍の琥珀色を混ぜた中間）
            job.ThemeColor  = new Color(0.97f, 0.94f, 0.84f);  // #F7EFDA — 暖かいクリーム白

            job.GrowthRates = LiliaDesign.GrowthRates;

            job.LearnableSkills = new System.Collections.Generic.List<JobSkillEntry>
            {
                // Level 1 初期: 基本回復と清浄（最初から役割を担える）
                new() { JobLevel=1,  Skill=s.Cure,              JpCost=0   },
                new() { JobLevel=1,  Skill=s.Purify,            JpCost=0   },
                // Level 2: 聖属性攻撃（序盤からアンデッドに対抗できる）
                new() { JobLevel=2,  Skill=s.HolyBolt,          JpCost=60  },
                // Level 3: 守護バフ
                new() { JobLevel=3,  Skill=s.GuardianPrayer,    JpCost=80  },
                // Level 4: 強化回復＋回復パッシブ
                new() { JobLevel=4,  Skill=s.HolyCure,          JpCost=100 },
                new() { JobLevel=4,  Skill=CreatePassiveSkill("SKL_L2_Passive_HealingMastery",
                                         LiliaDesign.Passive_HealingMastery.Name,
                                         LiliaDesign.Passive_HealingMastery.Desc), JpCost=120 },
                // Level 5: 蘇生・リジェネ（核心スキル群）
                new() { JobLevel=5,  Skill=s.Revive,            JpCost=150 },
                new() { JobLevel=5,  Skill=s.RegenLight,        JpCost=130 },
                // Level 6: 強化版解放
                new() { JobLevel=6,  Skill=s.CurePlus,          JpCost=160 },
                new() { JobLevel=6,  Skill=s.HolyBoltPlus,      JpCost=180 },
                // Level 7: 全体回復（重要マイルストーン）
                new() { JobLevel=7,  Skill=s.Curaga,            JpCost=200 },
                // Level 8: アンデッド特効全体攻撃＋自動回復パッシブ
                new() { JobLevel=8,  Skill=s.DivinePunishment,  JpCost=240 },
                new() { JobLevel=8,  Skill=CreatePassiveSkill("SKL_L2_Passive_AutoCompassion",
                                         LiliaDesign.Passive_AutoCompassion.Name,
                                         LiliaDesign.Passive_AutoCompassion.Desc), JpCost=260 },
                // Level 9: 集大成の全体支援
                new() { JobLevel=9,  Skill=s.Sanctuary,         JpCost=280 },
                new() { JobLevel=9,  Skill=s.GuardianPrayerPlus, JpCost=240 },
                // Level 10: 完全蘇生・強化蘇生
                new() { JobLevel=10, Skill=s.FullRevive,        JpCost=320 },
                new() { JobLevel=10, Skill=s.RevivePlus,        JpCost=260 },
                new() { JobLevel=10, Skill=s.HolyCurePlus,      JpCost=280 },
                // Level 11: 最終奥義
                new() { JobLevel=11, Skill=s.MiracleBlessing,   JpCost=380 },
            };

            job.AllowedWeapons = new System.Collections.Generic.List<WeaponType>(LiliaDesign.AllowedWeapons);
            job.AllowedArmors  = new System.Collections.Generic.List<ArmorType>(LiliaDesign.AllowedArmors);

            EditorUtility.SetDirty(job);
            return job;
        }

        // ── キャラクターデータ生成 ────────────────────────────────────
        static void GenerateCharacterData(JobData job)
        {
            var cd = CreateOrLoad<CharacterData>(BaseDir + "/CHR_Lilia.asset");

            cd.CharacterName = LiliaDesign.CharacterName;
            cd.Backstory     =
                "聖ルミアス教会の若き司祭見習い。19歳。" +
                "ピンクがかったシャンパンブロンドの長い波髪に蝶の金髪飾りをつけ、" +
                "金の唐草刺繍が施された白の典礼ドレスを纏う。" +
                "胸元の青いサファイア十字ブローチは、異例の若さで授けられた「癒しの聖印」の証。" +
                "天使の翼と輝く水晶を持つ聖杖「天光の杖アルミア」を携え、" +
                "世界の苦難を目にしながらも笑顔を絶やさない芯の強さを持つ。" +
                "旅の仲間への愛情は誰よりも深く、時に過保護なほど。" +
                "甘いものとお花が好き。アッシュに「口の減らない子」と言われ怒る。";
            cd.VoicePrefix   = LiliaDesign.VoicePrefix;
            cd.ThemeColor    = new Color(0.97f, 0.94f, 0.84f);  // 暖かいクリーム白
            cd.BaseStats     = LiliaDesign.BaseStats;
            cd.StarterJob    = job;
            cd.ChapterCount  = LiliaDesign.ChapterTitles.Length;
            cd.ChapterTitles = LiliaDesign.ChapterTitles;

            EditorUtility.SetDirty(cd);
        }

        // ── ファクトリ ────────────────────────────────────────────────
        static SkillData CreateHealSkill(string fileName, string name, string desc,
                                          float healPower, int mpCost, bool hitsAllAllies)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName     = name;
            sk.Description   = desc;
            sk.IsHeal        = true;
            sk.HealPower     = healPower;
            sk.MPCost        = mpCost;
            sk.HitsAllAllies = hitsAllAllies;
            sk.BasePower     = 0f;
            sk.Element       = ElementType.Light;  // 聖属性系の回復
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateReviveSkill(string fileName, string name, string desc,
                                            float reviveHPPct, int mpCost, bool reviveAll)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName       = name;
            sk.Description     = desc;
            sk.IsRevive        = true;
            sk.ReviveHPPercent = reviveHPPct;
            sk.ReviveAllAllies = reviveAll;
            sk.HitsAllAllies   = reviveAll;
            sk.MPCost          = mpCost;
            sk.BasePower       = 0f;
            sk.IsHeal          = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateHolySkill(string fileName, string name, string desc,
                                          float power, int hits, int mpCost,
                                          bool canBreak, bool hitsAll)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = name;
            sk.Description    = desc;
            sk.Element        = ElementType.Light;
            sk.DamageType     = DamageType.Magical;
            sk.BasePower      = power;
            sk.HitCount       = hits;
            sk.MPCost         = mpCost;
            sk.CanBreak       = canBreak;
            sk.HitsAllEnemies = hitsAll;
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

        class LiliaSkills
        {
            public SkillData Cure, CurePlus;
            public SkillData HolyCure, HolyCurePlus;
            public SkillData Curaga;
            public SkillData MiracleBlessing;
            public SkillData Revive, RevivePlus, FullRevive;
            public SkillData Purify;
            public SkillData GuardianPrayer, GuardianPrayerPlus;
            public SkillData RegenLight;
            public SkillData Sanctuary;
            public SkillData HolyBolt, HolyBoltPlus;
            public SkillData DivinePunishment;
        }
    }
}
#endif
