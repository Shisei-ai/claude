using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Core;
using DarkChronicle.Data;

namespace DarkChronicle.Character
{
    /// <summary>
    /// Octopath-style dual-job system: each character has a main job and an optional sub-job.
    /// Skills from both jobs are available; stat growth uses main job rates.
    /// </summary>
    public static class JobSystem
    {
        // ── Level Up ───────────────────────────────────────────────────────
        public static bool TryLevelUp(CharacterRuntimeData character)
        {
            int required = ExpForLevel(character.Level + 1);
            if (character.Experience < required) return false;

            character.Level++;
            character.Experience -= required;

            ApplyLevelUpStatGrowth(character);
            return true;
        }

        public static int ExpForLevel(int level)
        {
            // Standard RPG curve: base 100 * level^1.5
            return Mathf.RoundToInt(100f * Mathf.Pow(level, 1.5f));
        }

        static void ApplyLevelUpStatGrowth(CharacterRuntimeData character)
        {
            var growth = character.CurrentJob?.GrowthRates ?? character.BaseData.BaseStats;
            var stats  = character.RuntimeStats;

            // Add growth rates (with small random variance for feel)
            stats.MaxHP            += Mathf.RoundToInt(growth.MaxHP            * Random.Range(0.9f, 1.1f));
            stats.MaxMP            += Mathf.RoundToInt(growth.MaxMP            * Random.Range(0.9f, 1.1f));
            stats.PhysicalAttack   += Mathf.RoundToInt(growth.PhysicalAttack   * Random.Range(0.9f, 1.1f));
            stats.MagicAttack      += Mathf.RoundToInt(growth.MagicAttack      * Random.Range(0.9f, 1.1f));
            stats.PhysicalDefense  += Mathf.RoundToInt(growth.PhysicalDefense  * Random.Range(0.9f, 1.1f));
            stats.MagicDefense     += Mathf.RoundToInt(growth.MagicDefense     * Random.Range(0.9f, 1.1f));
            stats.Speed            += Mathf.Max(0, Mathf.RoundToInt(growth.Speed * Random.Range(0.9f, 1.1f)));

            // Restore HP/MP on level up (Octopath-style)
            character.CurrentHP = stats.MaxHP;
            character.CurrentMP = stats.MaxMP;

            character.RuntimeStats = stats;
        }

        // ── Job Level & Skill Learning ─────────────────────────────────────
        public static bool TryLearnSkill(CharacterRuntimeData character, JobSkillEntry entry)
        {
            if (character.JobPoints < entry.JpCost) return false;
            if (character.JobLevel  < entry.JobLevel) return false;
            character.JobPoints -= entry.JpCost;
            return true;
        }

        public static List<SkillData> GetAvailableSkills(CharacterRuntimeData character, JobData subJob = null)
        {
            var skills = new List<SkillData>();

            // Main job skills (up to current job level)
            if (character.CurrentJob != null)
                skills.AddRange(character.CurrentJob.LearnableSkills
                    .Where(e => e.JobLevel <= character.JobLevel)
                    .Select(e => e.Skill));

            // Sub-job skills (fixed set, no level gating)
            if (subJob != null)
                skills.AddRange(subJob.LearnableSkills
                    .Take(4)           // 4 skills from sub-job max
                    .Select(e => e.Skill));

            return skills.Distinct().ToList();
        }

        // ── Job Change ─────────────────────────────────────────────────────
        public static void ChangeJob(CharacterRuntimeData character, JobData newJob)
        {
            character.CurrentJob  = newJob;
            character.JobLevel    = 1;
            // Stats remain as-is; growth applies from new job going forward
        }

        // ── EXP Reward Distribution ────────────────────────────────────────
        public static void DistributeExp(List<CharacterRuntimeData> party, int totalExp, int totalJP)
        {
            int perMember = Mathf.CeilToInt((float)totalExp / party.Count);
            int perMemberJP = Mathf.CeilToInt((float)totalJP / party.Count);

            foreach (var member in party)
            {
                member.Experience += perMember;
                member.JobPoints  += perMemberJP;

                // Level up loop
                while (TryLevelUp(member))
                {
                    Debug.Log($"{member.BaseData.CharacterName} が Lv.{member.Level} になった！");
                }
            }
        }
    }
}
