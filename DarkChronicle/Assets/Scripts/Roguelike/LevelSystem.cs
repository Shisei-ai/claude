using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Pure-logic level/job-level system for Dark Chronicle.
    ///
    /// Character Level (1–50): earned via EXP from defeated enemies.
    ///   EXP to next = 80 + 20 × level²
    ///   Levelling up applies GrowthRates to stats and increases MaxHP.
    ///
    /// Job Level (1–10): earned via JP (Job Points) from defeated enemies.
    ///   JP to next = 50 × jobLevel
    ///   Job levelling unlocks new skills from JobData.LearnableSkills.
    /// </summary>
    public static class LevelSystem
    {
        public const int MaxCharacterLevel = 50;
        public const int MaxJobLevel       = 10;

        // ── EXP curve ─────────────────────────────────────────────────────
        /// <summary>EXP required to advance from <paramref name="level"/> to level+1.</summary>
        public static int ExpToNextLevel(int level)
            => Mathf.RoundToInt(80f + 20f * level * level);

        /// <summary>Cumulative EXP from level 1 to reach <paramref name="targetLevel"/>.</summary>
        public static int TotalExpForLevel(int targetLevel)
        {
            int total = 0;
            for (int i = 1; i < targetLevel; i++) total += ExpToNextLevel(i);
            return total;
        }

        /// <summary>Progress through current level bar (0–1).</summary>
        public static float GetExpBarFill(RunData run)
        {
            int needed = ExpToNextLevel(run.CharacterLevel);
            return needed > 0 ? Mathf.Clamp01((float)run.CurrentEXP / needed) : 0f;
        }

        // ── JP curve ──────────────────────────────────────────────────────
        /// <summary>JP required to advance job from <paramref name="jobLevel"/> to jobLevel+1.</summary>
        public static int JPToNextJobLevel(int jobLevel)
            => 50 * jobLevel;

        /// <summary>Progress through current job-level JP bar (0–1).</summary>
        public static float GetJPBarFill(RunData run)
        {
            int needed = JPToNextJobLevel(run.JobLevel);
            return needed > 0 ? Mathf.Clamp01((float)run.CurrentJobJP / needed) : 0f;
        }

        // ── Add EXP ───────────────────────────────────────────────────────
        /// <summary>
        /// Adds EXP to the run, processing any level-ups.
        /// Returns the list of new levels reached (empty if none).
        /// Also records the stat delta accumulated across all level-ups.
        /// </summary>
        public static List<int> AddExp(RunData run, int expGained,
                                       out CharacterStats totalStatGrowth)
        {
            run.CurrentEXP   += expGained;
            run.TotalExpGained += expGained;
            var levelsGained  = new List<int>();
            totalStatGrowth   = new CharacterStats();

            while (run.CharacterLevel < MaxCharacterLevel)
            {
                int needed = ExpToNextLevel(run.CharacterLevel);
                if (run.CurrentEXP < needed) break;

                run.CurrentEXP    -= needed;
                run.CharacterLevel++;
                levelsGained.Add(run.CharacterLevel);

                // Apply one level of stat growth
                var rates = run.SelectedCharacter?.GrowthRates;
                if (rates != null)
                {
                    run.MaxHP     = Mathf.Max(1, run.MaxHP + rates.MaxHP);
                    run.CurrentHP = Mathf.Min(run.CurrentHP + rates.MaxHP, run.MaxHP);
                    totalStatGrowth = totalStatGrowth + rates;
                }
            }

            return levelsGained;
        }

        // ── Add JP ────────────────────────────────────────────────────────
        /// <summary>
        /// Adds JP to the run, processing any job level-ups.
        /// Returns skills newly unlocked (auto-added to run.Deck).
        /// </summary>
        public static List<SkillData> AddJP(RunData run, JobData job, int jpGained)
        {
            run.CurrentJobJP  += jpGained;
            run.TotalJPGained += jpGained;
            var unlocked       = new List<SkillData>();

            while (run.JobLevel < MaxJobLevel)
            {
                int needed = JPToNextJobLevel(run.JobLevel);
                if (run.CurrentJobJP < needed) break;

                run.CurrentJobJP -= needed;
                run.JobLevel++;

                if (job?.LearnableSkills == null) continue;
                foreach (var entry in job.LearnableSkills)
                {
                    if (entry.Skill == null) continue;
                    if (entry.JobLevel != run.JobLevel) continue;
                    if (run.UnlockedSkillNames.Contains(entry.Skill.SkillName)) continue;

                    run.UnlockedSkillNames.Add(entry.Skill.SkillName);
                    run.AddSkill(entry.Skill);
                    unlocked.Add(entry.Skill);
                }
            }

            return unlocked;
        }

        // ── Stat growth query ─────────────────────────────────────────────
        /// <summary>
        /// Cumulative stat growth from level 1 to <paramref name="level"/>
        /// (does NOT include base stats — add to CharacterData.BaseStats separately).
        /// </summary>
        public static CharacterStats GetAccumulatedStatGrowth(CharacterData data, int level)
        {
            var result = new CharacterStats();
            var rates  = data?.GrowthRates;
            if (rates == null || level <= 1) return result;

            int levels = level - 1;
            result.MaxHP           = rates.MaxHP           * levels;
            result.MaxMP           = rates.MaxMP           * levels;
            result.PhysicalAttack  = rates.PhysicalAttack  * levels;
            result.MagicAttack     = rates.MagicAttack     * levels;
            result.PhysicalDefense = rates.PhysicalDefense * levels;
            result.MagicDefense    = rates.MagicDefense    * levels;
            result.Speed           = rates.Speed           * levels;
            result.Luck            = rates.Luck            * levels;
            result.CriticalRate    = rates.CriticalRate    * levels;
            return result;
        }

        // ── Initial skill unlock ──────────────────────────────────────────
        /// <summary>
        /// Called once at run start to unlock all job-level-1 starter skills.
        /// </summary>
        public static void InitStartingSkills(RunData run, JobData job)
        {
            if (job?.LearnableSkills == null) return;
            foreach (var entry in job.LearnableSkills)
            {
                if (entry.Skill == null) continue;
                if (entry.JobLevel > 1) continue;
                if (run.UnlockedSkillNames.Contains(entry.Skill.SkillName)) continue;

                run.UnlockedSkillNames.Add(entry.Skill.SkillName);
                if (!run.Deck.Contains(entry.Skill))
                    run.Deck.Add(entry.Skill);
            }
        }

        // ── EXP from an enemy group ────────────────────────────────────────
        public static (int totalExp, int totalJP) ComputeBattleRewards(
            IEnumerable<EnemyData> enemies)
        {
            int exp = 0, jp = 0;
            foreach (var e in enemies)
            {
                if (e == null) continue;
                exp += e.ExpReward;
                jp  += e.JPReward;
            }
            return (exp, jp);
        }

        // ── Display helpers ───────────────────────────────────────────────
        public static string LevelLabel(int level) => $"Lv. {level}";

        public static string StatDeltaText(CharacterStats delta)
        {
            if (delta == null) return string.Empty;
            var sb = new System.Text.StringBuilder();
            void Add(string name, int v) { if (v != 0) sb.AppendLine($"{name} +{v}"); }
            Add("最大HP", delta.MaxHP);
            Add("最大MP", delta.MaxMP);
            Add("物理攻撃", delta.PhysicalAttack);
            Add("魔法攻撃", delta.MagicAttack);
            Add("物理防御", delta.PhysicalDefense);
            Add("魔法防御", delta.MagicDefense);
            Add("速度",    delta.Speed);
            Add("運",      delta.Luck);
            Add("会心",    delta.CriticalRate);
            return sb.ToString().TrimEnd();
        }
    }
}
