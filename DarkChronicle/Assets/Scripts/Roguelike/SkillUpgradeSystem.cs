using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Handles skill upgrading and the upgrade catalogue.
    /// Every skill has an Upgraded variant stored in a separate ScriptableObject
    /// prefixed with "U_" and containing buffed values.
    /// The upgrade system tracks which skills in the current run have been upgraded.
    /// </summary>
    public static class SkillUpgradeSystem
    {
        // ── Upgrade Registry ───────────────────────────────────────────────
        // Maps base skill → upgraded skill. Populated at game start from Resources.
        static Dictionary<SkillData, SkillData> _upgradeMap = new();

        public static void BuildUpgradeMap(IEnumerable<SkillData> allSkills)
        {
            _upgradeMap.Clear();
            var lookup = new Dictionary<string, SkillData>();
            foreach (var s in allSkills) lookup[s.name] = s;

            foreach (var s in allSkills)
            {
                string upgradedName = "U_" + s.name;
                if (lookup.TryGetValue(upgradedName, out var upgraded))
                    _upgradeMap[s] = upgraded;
            }
        }

        // ── Upgrade ────────────────────────────────────────────────────────
        public static bool CanUpgrade(SkillData skill) =>
            _upgradeMap.ContainsKey(skill);

        public static SkillData GetUpgraded(SkillData skill) =>
            _upgradeMap.TryGetValue(skill, out var up) ? up : skill;

        public static bool UpgradeInDeck(RunData run, SkillData skill)
        {
            if (!CanUpgrade(skill)) return false;
            int idx = run.Deck.IndexOf(skill);
            if (idx < 0) return false;

            run.Deck[idx] = GetUpgraded(skill);
            return true;
        }

        // ── Upgrade Preview ────────────────────────────────────────────────
        public static string GetUpgradePreview(SkillData base_, SkillData upgraded)
        {
            var lines = new List<string>();

            if (base_.BasePower != upgraded.BasePower)
                lines.Add($"威力: {base_.BasePower:F1} → <color=#FFD700>{upgraded.BasePower:F1}</color>");
            if (base_.HitCount != upgraded.HitCount)
                lines.Add($"ヒット数: {base_.HitCount} → <color=#FFD700>{upgraded.HitCount}</color>");
            if (base_.MPCost != upgraded.MPCost)
                lines.Add($"MP消費: {base_.MPCost} → <color=#FFD700>{upgraded.MPCost}</color>");
            if (base_.StatusChance != upgraded.StatusChance)
                lines.Add($"状態異常確率: {base_.StatusChance:P0} → <color=#FFD700>{upgraded.StatusChance:P0}</color>");
            if (base_.HealPower != upgraded.HealPower)
                lines.Add($"回復量: {base_.HealPower:F1} → <color=#FFD700>{upgraded.HealPower:F1}</color>");
            if (!base_.HitsAllEnemies && upgraded.HitsAllEnemies)
                lines.Add("全体攻撃を習得");
            if (!base_.CanBreak && upgraded.CanBreak)
                lines.Add("<color=#FFD700>ブレイク攻撃を習得</color>");

            return lines.Count > 0 ? string.Join("\n", lines) : "（効果は変わらないが強くなった気がする）";
        }
    }

    // ── Meta Progression ───────────────────────────────────────────────────
    /// <summary>
    /// Unlocks and persistent records that survive between runs.
    /// Stored in PlayerPrefs; separate from RunData which resets each run.
    /// </summary>
    public static class MetaProgression
    {
        const string KeyTotalRuns    = "Meta_TotalRuns";
        const string KeyTotalWins    = "Meta_TotalWins";
        const string KeyMaxFloor     = "Meta_MaxFloor";
        const string KeyUnlockFlags  = "Meta_Unlocks";
        const string KeyRelicsFound  = "Meta_RelicsFound";

        public static int  TotalRuns    => PlayerPrefs.GetInt(KeyTotalRuns,   0);
        public static int  TotalWins    => PlayerPrefs.GetInt(KeyTotalWins,   0);
        public static int  MaxFloor     => PlayerPrefs.GetInt(KeyMaxFloor,    0);

        public static void RecordRunEnd(RunData run, bool won)
        {
            PlayerPrefs.SetInt(KeyTotalRuns, TotalRuns + 1);
            if (won) PlayerPrefs.SetInt(KeyTotalWins, TotalWins + 1);

            int floor = run.CurrentFloor;
            if (floor > MaxFloor) PlayerPrefs.SetInt(KeyMaxFloor, floor);

            // Record relics seen
            foreach (var relic in run.Relics)
                SetRelicSeen(relic.name);

            // Unlock new characters / relics based on milestone
            CheckUnlocks(run, won);
            PlayerPrefs.Save();
        }

        // ── Unlocks ────────────────────────────────────────────────────────
        static readonly Dictionary<string, System.Func<RunData, bool, bool>> UnlockConditions = new()
        {
            // Unlock Character 2: reach floor 2 for the first time
            ["char_2"] = (run, won) => run.CurrentFloor >= 1,
            // Unlock Character 3: win a run
            ["char_3"] = (run, won) => won,
            // Unlock Cursed relics in pool: have 5 curses in one run
            ["cursed_pool"] = (run, won) => run.Curses.Count >= 5,
            // Unlock true final boss: win 3 times
            ["final_boss"] = (run, won) => TotalWins >= 2 && won,
        };

        static void CheckUnlocks(RunData run, bool won)
        {
            foreach (var (key, condition) in UnlockConditions)
                if (!IsUnlocked(key) && condition(run, won))
                    Unlock(key);
        }

        public static bool IsUnlocked(string key) =>
            PlayerPrefs.GetInt($"Unlock_{key}", 0) == 1;

        static void Unlock(string key) =>
            PlayerPrefs.SetInt($"Unlock_{key}", 1);

        static void SetRelicSeen(string relicName) =>
            PlayerPrefs.SetInt($"Relic_{relicName}", 1);

        public static bool HasSeenRelic(string relicName) =>
            PlayerPrefs.GetInt($"Relic_{relicName}", 0) == 1;

        // ── Difficulty Unlock ──────────────────────────────────────────────
        const string KeyMaxDifficulty = "Meta_MaxDifficulty";

        // 解放済みの最高難易度（0=物語〜5=深淵）。Normal(1) は常に選択可。
        public static int MaxUnlockedDifficulty =>
            PlayerPrefs.GetInt(KeyMaxDifficulty, 1);

        // クリアした難易度の次の段階を解放する。
        public static void TryUnlockNextDifficulty(int clearedDifficulty)
        {
            int next = clearedDifficulty + 1;
            int max  = DifficultyConfig.Tiers.Length - 1;
            if (next <= max && next > MaxUnlockedDifficulty)
            {
                PlayerPrefs.SetInt(KeyMaxDifficulty, next);
                PlayerPrefs.Save();
            }
        }

        // ── Stats Display ──────────────────────────────────────────────────
        public static string GetStatsText()
        {
            var tier = DifficultyConfig.Get(MaxUnlockedDifficulty);
            return $"総ラン数: {TotalRuns}\n" +
                   $"クリア数: {TotalWins}\n" +
                   $"最高到達: Floor {MaxFloor + 1}\n" +
                   $"解放難易度: {tier.DisplayName}（Lv{MaxUnlockedDifficulty}）";
        }
    }
}
