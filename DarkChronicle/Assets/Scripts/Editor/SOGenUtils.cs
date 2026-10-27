#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// 全SOジェネレーターで共有する共通ユーティリティ。
    /// CreateOrLoad, EnsureDirectories, スキル/敵/ステータスのファクトリメソッドを一元管理する。
    /// 新しいジェネレーターはこのクラスのみ使えば個別ヘルパーの定義が不要になる。
    /// </summary>
    public static class SOGenUtils
    {
        // ── Asset I/O ──────────────────────────────────────────────────────────

        /// <summary>
        /// 指定パスのアセットを読み込む。存在しなければ新規作成して保存する。
        /// </summary>
        public static T CreateOrLoad<T>(string path) where T : ScriptableObject
        {
            var existing = AssetDatabase.LoadAssetAtPath<T>(path);
            if (existing != null) return existing;
            var asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }

        /// <summary>
        /// 指定したすべてのフォルダパスを作成する（中間フォルダも含む）。
        /// </summary>
        public static void EnsureDirs(params string[] dirs)
        {
            foreach (var dir in dirs)
            {
                if (AssetDatabase.IsValidFolder(dir)) continue;
                var parts  = dir.Split('/');
                string parent = string.Join("/", parts[..^1]);
                AssetDatabase.CreateFolder(parent, parts[^1]);
            }
        }

        // ── Status Effect Helpers ──────────────────────────────────────────────

        /// <summary>
        /// StatusEffect を生成する。value/duration が 0 の場合は種別ごとのデフォルト値を使用する。
        /// </summary>
        public static StatusEffect MakeStatus(StatusEffectType type,
                                               float customValue    = 0f,
                                               int   customDuration = 0)
            => new StatusEffect
            {
                Type     = type,
                Duration = customDuration > 0 ? customDuration : DefaultDuration(type),
                Value    = customValue    > 0 ? customValue    : DefaultValue(type),
            };

        static int DefaultDuration(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => 3,
            StatusEffectType.Bleed     => 3,
            StatusEffectType.Burn      => 3,
            StatusEffectType.Regen     => 3,
            StatusEffectType.Freeze    => 2,
            StatusEffectType.Paralysis => 2,
            StatusEffectType.Sleep     => 2,
            StatusEffectType.Blind     => 2,
            StatusEffectType.Silence   => 2,
            StatusEffectType.AtkUp     => 3,
            StatusEffectType.AtkDown   => 2,
            StatusEffectType.DefUp     => 3,
            StatusEffectType.DefDown   => 2,
            StatusEffectType.SpdUp     => 2,
            StatusEffectType.SpdDown   => 2,
            _                          => 2,
        };

        static float DefaultValue(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => 0.05f,
            StatusEffectType.Bleed     => 0.05f,
            StatusEffectType.Burn      => 0.07f,
            StatusEffectType.Regen     => 0.04f,
            StatusEffectType.AtkUp     => 0.25f,
            StatusEffectType.AtkDown   => 0.25f,
            StatusEffectType.DefUp     => 0.25f,
            StatusEffectType.DefDown   => 0.25f,
            StatusEffectType.SpdUp     => 0.20f,
            StatusEffectType.SpdDown   => 0.20f,
            _                          => 0f,
        };

        // ── Skill Factories ────────────────────────────────────────────────────

        /// <summary>
        /// 低レベルファクトリ。SkillData を CreateOrLoad し、configure を適用して SetDirty する。
        /// </summary>
        public static SkillData Skill(string path, System.Action<SkillData> configure)
        {
            var sk = CreateOrLoad<SkillData>(path);
            configure(sk);
            EditorUtility.SetDirty(sk);
            return sk;
        }

        /// <summary>物理攻撃スキル。</summary>
        public static SkillData PhysSkill(
            string dir, string fileName,
            string name, string desc,
            float power, int hits = 1, bool hitsAll = false,
            bool canBreak = false, int mpCost = 0,
            StatusEffectType status = StatusEffectType.Bleed, float statusChance = 0f)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName      = name;
                sk.Description    = desc;
                sk.DamageType     = DamageType.Physical;
                sk.Element        = ElementType.Physical;
                sk.BasePower      = power;
                sk.HitCount       = hits;
                sk.MPCost         = mpCost;
                sk.CanBreak       = canBreak;
                sk.HitsAllEnemies = hitsAll;
                sk.IsHeal         = false;
                if (statusChance > 0f)
                {
                    sk.AppliedStatus = MakeStatus(status);
                    sk.StatusChance  = statusChance;
                }
            });

        /// <summary>魔法攻撃スキル。</summary>
        public static SkillData MagicSkill(
            string dir, string fileName,
            string name, string desc,
            ElementType element, float power, int hits = 1,
            bool hitsAll = false, int mpCost = 0,
            StatusEffectType status = StatusEffectType.Burn, float statusChance = 0f)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName      = name;
                sk.Description    = desc;
                sk.DamageType     = DamageType.Magical;
                sk.Element        = element;
                sk.BasePower      = power;
                sk.HitCount       = hits;
                sk.MPCost         = mpCost;
                sk.HitsAllEnemies = hitsAll;
                sk.IsHeal         = false;
                if (statusChance > 0f)
                {
                    sk.AppliedStatus = MakeStatus(status);
                    sk.StatusChance  = statusChance;
                }
            });

        /// <summary>状態異常のみのスキル（ダメージなし）。</summary>
        public static SkillData StatusSkill(
            string dir, string fileName,
            string name, string desc,
            StatusEffectType effect, float chance,
            bool hitsAll = false, int mpCost = 0,
            float effectValue = 0f, int duration = 0)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName      = name;
                sk.Description    = desc;
                sk.DamageType     = DamageType.Physical;
                sk.Element        = ElementType.None;
                sk.BasePower      = 0f;
                sk.HitCount       = 1;
                sk.MPCost         = mpCost;
                sk.CanBreak       = false;
                sk.HitsAllEnemies = hitsAll;
                sk.StatusChance   = chance;
                sk.AppliedStatus  = MakeStatus(effect, effectValue, duration);
                sk.IsHeal         = false;
            });

        /// <summary>デバフスキル（敵ステータス低下）。</summary>
        public static SkillData DebuffSkill(
            string dir, string fileName,
            string name, string desc,
            StatusEffectType debuff, float chance,
            bool hitsAll = false, int mpCost = 0,
            float debuffValue = 0f, int duration = 0)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName      = name;
                sk.Description    = desc;
                sk.MPCost         = mpCost;
                sk.HitsAllEnemies = hitsAll;
                sk.BasePower      = 0f;
                sk.HitCount       = 1;
                sk.StatusChance   = chance;
                sk.AppliedStatus  = MakeStatus(debuff, debuffValue, duration);
                sk.IsHeal         = false;
            });

        /// <summary>味方対象の回復スキル。</summary>
        public static SkillData HealSkill(
            string dir, string fileName,
            string name, string desc,
            int mpCost, float healPower,
            bool hitsAllAllies = false)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName      = name;
                sk.Description    = desc;
                sk.MPCost         = mpCost;
                sk.IsHeal         = true;
                sk.HealPower      = healPower;
                sk.HitsAllAllies  = hitsAllAllies;
                sk.BasePower      = 0f;
            });

        /// <summary>蘇生スキル。</summary>
        public static SkillData ReviveSkill(
            string dir, string fileName,
            string name, string desc,
            int mpCost, float reviveHpPct = 0.5f,
            bool allAllies = false)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName        = name;
                sk.Description      = desc;
                sk.MPCost           = mpCost;
                sk.IsRevive         = true;
                sk.ReviveHPPercent  = reviveHpPct;
                sk.ReviveAllAllies  = allAllies;
                sk.IsHeal           = false;
                sk.BasePower        = 0f;
            });

        /// <summary>バフ・支援スキル（ダメージなし）。</summary>
        public static SkillData SupportSkill(
            string dir, string fileName,
            string name, string desc,
            int mpCost, bool hitsAllAllies = false,
            StatusEffectType? buff = null, float buffValue = 0.25f)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName      = name;
                sk.Description    = desc;
                sk.MPCost         = mpCost;
                sk.HitsAllAllies  = hitsAllAllies;
                sk.IsHeal         = false;
                sk.BasePower      = 0f;
                if (buff.HasValue)
                {
                    sk.AppliedStatus = MakeStatus(buff.Value, buffValue);
                    sk.StatusChance  = 1f;
                }
            });

        /// <summary>パッシブスキル（コストなし・効果量なし — 説明文専用）。</summary>
        public static SkillData PassiveSkill(
            string dir, string fileName,
            string name, string desc)
            => Skill(dir + $"/{fileName}.asset", sk =>
            {
                sk.SkillName   = name;
                sk.Description = desc;
                sk.MPCost      = 0;
                sk.BasePower   = 0f;
            });

        // ── Stat Builder ───────────────────────────────────────────────────────

        /// <summary>CharacterStats を名前付き引数で簡潔に組み立てる。</summary>
        public static CharacterStats Stats(
            int hp, int patk = 0, int matk = 0,
            int pdef = 0, int mdef = 0, int spd = 0,
            int mp = 0, int luck = 0, int crit = 0, int acc = 85)
            => new CharacterStats
            {
                MaxHP           = hp,
                MaxMP           = mp,
                PhysicalAttack  = patk,
                MagicAttack     = matk,
                PhysicalDefense = pdef,
                MagicDefense    = mdef,
                Speed           = spd,
                Luck            = luck,
                CriticalRate    = crit,
                AccuracyRate    = acc,
            };

        // ── Enemy Action Builder ───────────────────────────────────────────────

        /// <summary>EnemyAction を1行で組み立てる。</summary>
        public static EnemyAction MakeAction(
            SkillData skill, float useChance, int priority,
            int hpThreshold = 0, bool absorbable = false)
            => new EnemyAction
            {
                ActionName      = skill?.SkillName ?? "—",
                Skill           = skill,
                UseChance       = useChance,
                Priority        = priority,
                HealthThreshold = hpThreshold,
                IsAbsorbable    = absorbable,
            };

        // ── EnemyData Builder ──────────────────────────────────────────────────

        /// <summary>EnemyData を CreateOrLoad してすべてのフィールドを設定する。</summary>
        public static EnemyData Enemy(
            string path, string enemyName, string lore,
            EnemyRank rank, CharacterStats stats, int shield,
            List<ElementType> weaknesses, bool isUndead,
            List<EnemyAction> actions, int actionsPerTurn,
            int exp, int jp, int gold,
            List<DropItem> drops = null)
        {
            var e = CreateOrLoad<EnemyData>(path);
            e.EnemyName         = enemyName;
            e.Lore              = lore;
            e.Rank              = rank;
            e.Stats             = stats;
            e.ShieldPoints      = shield;
            e.ElementWeaknesses = weaknesses ?? new List<ElementType>();
            e.IsUndead          = isUndead;
            e.Actions           = actions;
            e.ActionsPerTurn    = actionsPerTurn;
            e.ExpReward         = exp;
            e.JPReward          = jp;
            e.GoldReward        = gold;
            e.DropTable         = drops ?? new List<DropItem>();
            EditorUtility.SetDirty(e);
            return e;
        }

        // ── Validation ─────────────────────────────────────────────────────────

        public struct ValidationResult
        {
            public string AssetPath;
            public string Issue;
            public bool   IsError;
        }

        /// <summary>
        /// Assets/Data 以下の全生成アセットを走査し、よくある問題を検出して返す。
        /// </summary>
        public static List<ValidationResult> ValidateAllGeneratedAssets()
        {
            var issues = new List<ValidationResult>();
            const string root = "Assets/Data";

            // ── EnemyData ──────────────────────────────────────────────────
            foreach (var guid in AssetDatabase.FindAssets("t:EnemyData", new[] { root }))
            {
                string path  = AssetDatabase.GUIDToAssetPath(guid);
                var    enemy = AssetDatabase.LoadAssetAtPath<EnemyData>(path);
                if (enemy == null) continue;

                if (string.IsNullOrEmpty(enemy.EnemyName))
                    issues.Add(new() { AssetPath = path, Issue = "EnemyName が空",              IsError = true  });
                if (enemy.Stats.MaxHP <= 0)
                    issues.Add(new() { AssetPath = path, Issue = "Stats.MaxHP が 0",            IsError = true  });
                if (enemy.Stats.Speed <= 0)
                    issues.Add(new() { AssetPath = path, Issue = "Stats.Speed が 0（行動不能）", IsError = false });
                if (enemy.Actions == null || enemy.Actions.Count == 0)
                    issues.Add(new() { AssetPath = path, Issue = "Actions が空（敵が何もしない）",IsError = true  });
                if (enemy.ShieldPoints <= 0)
                    issues.Add(new() { AssetPath = path, Issue = "ShieldPoints が 0",           IsError = false });
            }

            // ── SkillData ──────────────────────────────────────────────────
            foreach (var guid in AssetDatabase.FindAssets("t:SkillData", new[] { root }))
            {
                string path  = AssetDatabase.GUIDToAssetPath(guid);
                var    skill = AssetDatabase.LoadAssetAtPath<SkillData>(path);
                if (skill == null) continue;

                if (string.IsNullOrEmpty(skill.SkillName))
                    issues.Add(new() { AssetPath = path, Issue = "SkillName が空", IsError = true });

                bool hasPower  = skill.BasePower > 0f || skill.HealPower > 0f || skill.IsRevive;
                bool hasStatus = skill.AppliedStatus != null && skill.StatusChance > 0f;
                bool isPassive = skill.MPCost == 0 && !hasPower && !hasStatus;
                if (!hasPower && !hasStatus && !isPassive && !skill.IsHeal)
                    issues.Add(new() { AssetPath = path, Issue = "効果不明スキル（攻撃・回復・状態異常なし）", IsError = false });
            }

            // ── CharacterData ──────────────────────────────────────────────
            foreach (var guid in AssetDatabase.FindAssets("t:CharacterData", new[] { root }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var    cd   = AssetDatabase.LoadAssetAtPath<CharacterData>(path);
                if (cd == null) continue;

                if (string.IsNullOrEmpty(cd.CharacterName))
                    issues.Add(new() { AssetPath = path, Issue = "CharacterName が空",       IsError = true });
                if (cd.StarterJob == null)
                    issues.Add(new() { AssetPath = path, Issue = "StarterJob が未設定",      IsError = true });
                if (cd.BaseStats.MaxHP <= 0)
                    issues.Add(new() { AssetPath = path, Issue = "BaseStats.MaxHP が 0",    IsError = true });
                if (cd.BaseStats.Speed <= 0)
                    issues.Add(new() { AssetPath = path, Issue = "BaseStats.Speed が 0",    IsError = false });
            }

            return issues;
        }
    }
}
#endif
