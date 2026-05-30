#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.CharacterDesigns;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Unityエディタメニューから呼び出して、ベルンハルト関連の
    /// ScriptableObjectをすべて自動生成するツール。
    /// Menu: DarkChronicle → Generate → Bernhard Assets
    /// </summary>
    public static class BernhardSOGenerator
    {
        const string BaseDir   = "Assets/Data/Characters/Bernhard";
        const string SkillDir  = BaseDir + "/Skills";
        const string JobDir    = BaseDir + "/Job";

        [MenuItem("DarkChronicle/Generate/Bernhard Assets")]
        public static void GenerateAll()
        {
            EnsureDirectories();

            var skills = GenerateSkills();
            var job    = GenerateJob(skills);
            GenerateCharacterData(job);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[BernhardSOGenerator] All assets generated successfully.");
        }

        // ── ディレクトリ準備 ───────────────────────────────────────────────
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

        // ── スキル全生成 ───────────────────────────────────────────────────
        static GeneratedSkills GenerateSkills()
        {
            var s = new GeneratedSkills
            {
                DoubleSlash      = CreateSkill("SKL_DoubleSlash",       BernhardDesign.Skill_DoubleSlash.Name,
                                               BernhardDesign.Skill_DoubleSlash.Desc,
                                               BernhardDesign.Skill_DoubleSlash.Element,
                                               BernhardDesign.Skill_DoubleSlash.DmgType,
                                               BernhardDesign.Skill_DoubleSlash.BasePower,
                                               BernhardDesign.Skill_DoubleSlash.HitCount,
                                               BernhardDesign.Skill_DoubleSlash.MPCost,
                                               BernhardDesign.Skill_DoubleSlash.CanBreak),

                DoubleSlashPlus  = CreateSkill("U_SKL_DoubleSlash",     BernhardDesign.Skill_DoubleSlash.NameUpgrade,
                                               BernhardDesign.Skill_DoubleSlash.DescUpgrade,
                                               BernhardDesign.Skill_DoubleSlash.Element,
                                               BernhardDesign.Skill_DoubleSlash.DmgType,
                                               BernhardDesign.Skill_DoubleSlash.BasePowerU,
                                               BernhardDesign.Skill_DoubleSlash.HitCountU,
                                               BernhardDesign.Skill_DoubleSlash.MPCost,
                                               BernhardDesign.Skill_DoubleSlash.CanBreak),

                ShieldBash       = CreateSkill("SKL_ShieldBash",        BernhardDesign.Skill_ShieldBash.Name,
                                               BernhardDesign.Skill_ShieldBash.Desc,
                                               BernhardDesign.Skill_ShieldBash.Element,
                                               BernhardDesign.Skill_ShieldBash.DmgType,
                                               BernhardDesign.Skill_ShieldBash.BasePower,
                                               BernhardDesign.Skill_ShieldBash.HitCount,
                                               BernhardDesign.Skill_ShieldBash.MPCost,
                                               canBreak: true,
                                               statusChance: BernhardDesign.Skill_ShieldBash.StunChance),

                WarCry           = CreateSupportSkill("SKL_WarCry",     BernhardDesign.Skill_WarCry.Name,
                                               BernhardDesign.Skill_WarCry.Desc,
                                               BernhardDesign.Skill_WarCry.MPCost,
                                               hitsAllAllies: true),

                WarCryPlus       = CreateSupportSkill("U_SKL_WarCry",   BernhardDesign.Skill_WarCry.NameUpgrade,
                                               BernhardDesign.Skill_WarCry.DescUpgrade,
                                               BernhardDesign.Skill_WarCry.MPCostU,
                                               hitsAllAllies: true),

                HeavyStrike      = CreateSkill("SKL_HeavyStrike",       BernhardDesign.Skill_HeavyStrike.Name,
                                               BernhardDesign.Skill_HeavyStrike.Desc,
                                               BernhardDesign.Skill_HeavyStrike.Element,
                                               BernhardDesign.Skill_HeavyStrike.DmgType,
                                               BernhardDesign.Skill_HeavyStrike.BasePower,
                                               BernhardDesign.Skill_HeavyStrike.HitCount,
                                               BernhardDesign.Skill_HeavyStrike.MPCost,
                                               false),

                Whirlwind        = CreateSkill("SKL_Whirlwind",         BernhardDesign.Skill_Whirlwind.Name,
                                               BernhardDesign.Skill_Whirlwind.Desc,
                                               BernhardDesign.Skill_Whirlwind.Element,
                                               BernhardDesign.Skill_Whirlwind.DmgType,
                                               BernhardDesign.Skill_Whirlwind.BasePower,
                                               BernhardDesign.Skill_Whirlwind.HitCount,
                                               BernhardDesign.Skill_Whirlwind.MPCost,
                                               BernhardDesign.Skill_Whirlwind.CanBreak,
                                               hitsAll: true),

                FlameBlade       = CreateSkill("SKL_FlameBlade",        BernhardDesign.Skill_FlameBlade.Name,
                                               BernhardDesign.Skill_FlameBlade.Desc,
                                               BernhardDesign.Skill_FlameBlade.Element,
                                               BernhardDesign.Skill_FlameBlade.DmgType,
                                               BernhardDesign.Skill_FlameBlade.BasePower,
                                               1, BernhardDesign.Skill_FlameBlade.MPCost,
                                               false,
                                               statusChance: BernhardDesign.Skill_FlameBlade.BurnChance),

                RapidBarrage     = CreateSkill("SKL_RapidBarrage",      BernhardDesign.Skill_RapidBarrage.Name,
                                               BernhardDesign.Skill_RapidBarrage.Desc,
                                               BernhardDesign.Skill_RapidBarrage.Element,
                                               BernhardDesign.Skill_RapidBarrage.DmgType,
                                               BernhardDesign.Skill_RapidBarrage.BasePower,
                                               BernhardDesign.Skill_RapidBarrage.HitCount,
                                               BernhardDesign.Skill_RapidBarrage.MPCost,
                                               BernhardDesign.Skill_RapidBarrage.CanBreak),

                ThunderEdge      = CreateSkill("SKL_ThunderEdge",       BernhardDesign.Skill_ThunderEdge.Name,
                                               BernhardDesign.Skill_ThunderEdge.Desc,
                                               BernhardDesign.Skill_ThunderEdge.Element,
                                               BernhardDesign.Skill_ThunderEdge.DmgType,
                                               BernhardDesign.Skill_ThunderEdge.BasePower,
                                               1,
                                               BernhardDesign.Skill_ThunderEdge.MPCost,
                                               false, hitsAll: true,
                                               statusChance: BernhardDesign.Skill_ThunderEdge.ParalyzeChance),

                SovereignBlade   = CreateSkill("SKL_SovereignBlade",    BernhardDesign.Skill_SovereignBlade.Name,
                                               BernhardDesign.Skill_SovereignBlade.Desc,
                                               BernhardDesign.Skill_SovereignBlade.Element,
                                               BernhardDesign.Skill_SovereignBlade.DmgType,
                                               BernhardDesign.Skill_SovereignBlade.BasePower,
                                               1, BernhardDesign.Skill_SovereignBlade.MPCost,
                                               false),

                EarthBastion     = CreateHealSkill("SKL_EarthBastion",  BernhardDesign.Skill_EarthBastion.Name,
                                               BernhardDesign.Skill_EarthBastion.Desc,
                                               BernhardDesign.Skill_EarthBastion.MPCost,
                                               BernhardDesign.Skill_EarthBastion.HealPower),
            };
            return s;
        }

        // ── ジョブ生成 ────────────────────────────────────────────────────
        static JobData GenerateJob(GeneratedSkills s)
        {
            var job = CreateOrLoad<JobData>(JobDir + "/Job_Warrior.asset");

            job.JobName    = "戦士";
            job.Description = "攻防のバランスに優れた万能の剣士。スキル種類が多く、少量の魔法も扱える。習得に時間はかかるが、強化し続けるほど「安定して強い」使用感になる。";
            job.ThemeColor = new Color(0.60f, 0.20f, 0.10f);  // 錆びた赤

            job.GrowthRates = new CharacterStats
            {
                MaxHP           = 30,
                MaxMP           = 3,
                PhysicalAttack  = 4,
                MagicAttack     = 1,
                PhysicalDefense = 4,
                MagicDefense    = 2,
                Speed           = 1,
                Luck            = 1,
            };

            job.LearnableSkills = new System.Collections.Generic.List<JobSkillEntry>
            {
                // JobLevel 1 (初期)
                new() { JobLevel=1, Skill=s.DoubleSlash,    JpCost=0   },
                // JobLevel 2
                new() { JobLevel=2, Skill=s.ShieldBash,     JpCost=50  },
                new() { JobLevel=2, Skill=CreatePassiveSkill("SKL_Passive_IronConstitution",
                                          BernhardDesign.Passive_IronConstitution.Name,
                                          BernhardDesign.Passive_IronConstitution.Desc), JpCost=120 },
                // JobLevel 3
                new() { JobLevel=3, Skill=CreateSupportSkill("SKL_DefStance",
                                          BernhardDesign.Skill_DefensiveStance.Name,
                                          BernhardDesign.Skill_DefensiveStance.Desc,
                                          BernhardDesign.Skill_DefensiveStance.MPCost),  JpCost=60  },
                // JobLevel 4
                new() { JobLevel=4, Skill=s.WarCry,          JpCost=100 },
                // JobLevel 5
                new() { JobLevel=5, Skill=s.HeavyStrike,     JpCost=120 },
                // JobLevel 6
                new() { JobLevel=6, Skill=s.Whirlwind,       JpCost=150 },
                new() { JobLevel=6, Skill=CreatePassiveSkill("SKL_Passive_BattleHardened",
                                          BernhardDesign.Passive_BattleHardened.Name,
                                          BernhardDesign.Passive_BattleHardened.Desc),   JpCost=180 },
                // JobLevel 7
                new() { JobLevel=7, Skill=s.FlameBlade,      JpCost=180 },
                // JobLevel 8
                new() { JobLevel=8, Skill=s.RapidBarrage,    JpCost=200 },
                // JobLevel 9
                new() { JobLevel=9, Skill=s.ThunderEdge,     JpCost=220 },
                // JobLevel 10
                new() { JobLevel=10, Skill=s.SovereignBlade,  JpCost=350 },
                new() { JobLevel=10, Skill=CreatePassiveSkill("SKL_Passive_IndomitableWill",
                                          BernhardDesign.Passive_IndomitableWill.Name,
                                          BernhardDesign.Passive_IndomitableWill.Desc),  JpCost=300 },
                // JobLevel 11
                new() { JobLevel=11, Skill=s.EarthBastion,    JpCost=280 },
                // UpgradeはSkillUpgradeSystemが自動でU_プレフィックスを見る
            };

            job.AllowedWeapons = new System.Collections.Generic.List<WeaponType>
                (BernhardDesign.AllowedWeapons);
            job.AllowedArmors  = new System.Collections.Generic.List<ArmorType>
                (BernhardDesign.AllowedArmors);

            EditorUtility.SetDirty(job);
            return job;
        }

        // ── キャラクターデータ生成 ──────────────────────────────────────────
        static void GenerateCharacterData(JobData job)
        {
            var cd = CreateOrLoad<CharacterData>(BaseDir + "/CHR_Bernhard.asset");

            cd.CharacterName  = BernhardDesign.CharacterName;
            cd.Backstory      =
                "元・王国騎士団長。銀甲冑に緋色のマント、金の装飾と青いルーンが刻まれた鎧を身に纏う。" +
                "三年前の王国滅亡の夜、自らの判断の誤りが主君の死を招いたと信じている。" +
                "生き延びたことへの罪悪感を胸に、その元凶を打ち倒すために旅に出た。" +
                "不器用に見えて気遣いができ、野営では必ず料理を担当する。";
            cd.VoicePrefix    = BernhardDesign.VoicePrefix;
            // テーマカラー: 緋マントの赤をベースに、銀・金・青ルーンのアクセント
            cd.ThemeColor     = new Color(0.72f, 0.11f, 0.11f);  // #B81C1C — 緋マント

            cd.BaseStats      = BernhardDesign.BaseStats;
            cd.StarterJob     = job;
            cd.ChapterCount   = BernhardDesign.ChapterTitles.Length;
            cd.ChapterTitles  = BernhardDesign.ChapterTitles;

            EditorUtility.SetDirty(cd);
        }

        // ── ScriptableObjectファクトリ ──────────────────────────────────────
        static SkillData CreateSkill(string fileName, string skillName, string desc,
                                     ElementType element, DamageType dmgType,
                                     float basePower, int hitCount, int mpCost,
                                     bool canBreak, bool hitsAll = false,
                                     float statusChance = 0f)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = skillName;
            sk.Description    = desc;
            sk.Element        = element;
            sk.DamageType     = dmgType;
            sk.BasePower      = basePower;
            sk.HitCount       = hitCount;
            sk.MPCost         = mpCost;
            sk.CanBreak       = canBreak;
            sk.HitsAllEnemies = hitsAll;
            sk.StatusChance   = statusChance;
            sk.IsHeal         = false;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateSupportSkill(string fileName, string skillName, string desc,
                                             int mpCost, bool hitsAllAllies = false)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName      = skillName;
            sk.Description    = desc;
            sk.MPCost         = mpCost;
            sk.HitsAllAllies  = hitsAllAllies;
            sk.IsHeal         = false;
            sk.BasePower      = 0f;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreateHealSkill(string fileName, string skillName, string desc,
                                          int mpCost, float healPower)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName     = skillName;
            sk.Description   = desc;
            sk.MPCost        = mpCost;
            sk.IsHeal        = true;
            sk.HealPower     = healPower;
            sk.HitsAllAllies = true;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static SkillData CreatePassiveSkill(string fileName, string skillName, string desc)
        {
            var sk = CreateOrLoad<SkillData>(SkillDir + $"/{fileName}.asset");
            sk.SkillName  = skillName;
            sk.Description = desc;
            sk.MPCost     = 0;
            sk.BasePower  = 0f;
            EditorUtility.SetDirty(sk);
            return sk;
        }

        static T CreateOrLoad<T>(string path) where T : ScriptableObject
        {
            var existing = AssetDatabase.LoadAssetAtPath<T>(path);
            if (existing != null) return existing;
            var asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }

        // ── 生成スキルの一時コンテナ ────────────────────────────────────────
        class GeneratedSkills
        {
            public SkillData DoubleSlash, DoubleSlashPlus;
            public SkillData ShieldBash;
            public SkillData WarCry, WarCryPlus;
            public SkillData HeavyStrike;
            public SkillData Whirlwind;
            public SkillData FlameBlade;
            public SkillData RapidBarrage;
            public SkillData ThunderEdge;
            public SkillData SovereignBlade;
            public SkillData EarthBastion;
        }
    }
}
#endif
