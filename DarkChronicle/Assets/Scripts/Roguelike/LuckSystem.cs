using UnityEngine;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Centralizes all luck-dependent RNG calculations.
    /// Luck stat shifts the distribution of outcomes — it never guarantees anything
    /// but meaningfully improves probability of positive outcomes over a run.
    /// </summary>
    public static class LuckSystem
    {
        // ── Core Formula ───────────────────────────────────────────────────
        // Luck shifts a [0,1] uniform roll toward 1 (favorable).
        // At Luck=0: neutral roll.
        // At Luck=10: ~65% of the time the outcome is "top 35%" quality.
        // At Luck=20: overwhelmingly skewed positive, but never guaranteed.
        public static float LuckyRoll(int luck, float min = 0f, float max = 1f)
        {
            float raw   = Random.value;
            float shift = Mathf.Clamp01(luck * 0.03f);   // +3% per luck point
            // Shifted roll: blend raw with 1.0 by shift amount
            float shifted = Mathf.Lerp(raw, 1f, shift * Random.value);
            return Mathf.Lerp(min, max, shifted);
        }

        // Negative luck roll: used for curse events, enemy crits etc.
        public static float UnluckyRoll(int luck) => 1f - LuckyRoll(luck);

        // ── Relic Quality ─────────────────────────────────────────────────
        // Returns 0=Common, 1=Uncommon, 2=Rare based on luck
        public static int RollRelicQuality(int luck)
        {
            float roll = LuckyRoll(luck);
            if (roll > 0.92f) return 2;  // Rare   ( 8% base,  scales up)
            if (roll > 0.70f) return 1;  // Uncommon(22% base, scales up)
            return 0;                    // Common
        }

        // ── Gold Range ─────────────────────────────────────────────────────
        public static int RollGold(int baseAmount, int luck)
        {
            float t = LuckyRoll(luck, 0.7f, 1.5f);
            return Mathf.RoundToInt(baseAmount * t);
        }

        // ── Event Outcome ──────────────────────────────────────────────────
        // Determines which event category is rolled for (positive/neutral/negative)
        public static EventQuality RollEventQuality(int luck)
        {
            float roll = LuckyRoll(luck);
            if (roll > 0.80f) return EventQuality.Positive;
            if (roll > 0.35f) return EventQuality.Neutral;
            return EventQuality.Negative;
        }

        // ── Critical Hit ───────────────────────────────────────────────────
        // Luck contributes a small crit bonus on top of base crit rate
        public static int GetLuckCritBonus(int luck) =>
            Mathf.RoundToInt(luck * 0.5f);  // +0.5% crit per Luck

        // ── Dodge ──────────────────────────────────────────────────────────
        // LuckyDodge relic: base 0 + 0.5% per Luck
        public static float GetDodgeChance(int luck) =>
            Mathf.Clamp01(luck * 0.005f);

        // ── Shop Stock Quality ─────────────────────────────────────────────
        // Higher luck = more rare items appear in shops
        public static bool IsShopItemRare(int luck) =>
            Random.value < (0.05f + luck * 0.02f);

        // ── Encounter Modifications ────────────────────────────────────────
        // Luck reduces chance of negative encounter events (ambush, etc.)
        public static bool IsAmbush(int luck) =>
            Random.value > Mathf.Clamp01(0.15f - luck * 0.01f);

        // ── Curse Interactions ─────────────────────────────────────────────
        // At very high luck, cursed room rewards can double
        public static bool CursedRoomDoubleLoot(int luck) =>
            luck >= 15 && Random.value < 0.25f;

        // ── Miracle Chance ─────────────────────────────────────────────────
        // From MiracleChance relic: tiny chance per battle for bonus drop
        public static bool RollMiracleChance(int luck) =>
            Random.value < (0.01f + luck * 0.001f);
    }

    public enum EventQuality { Positive, Neutral, Negative }
}
