using UnityEngine;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Centralizes all Sanity-dependent RNG calculations for field exploration.
    /// Sanity ∈ [-3, +3]. Positive sanity biases outcomes toward the favorable;
    /// negative sanity actively biases outcomes toward the unfavorable.
    /// </summary>
    public static class SanitySystem
    {
        // ── Core Formula ───────────────────────────────────────────────────
        // Returns a [0,1] value biased by sanity.
        // sanity = 0  → pure Random.value
        // sanity = +3 → ~30% push toward 1.0 (favorable)
        // sanity = -3 → ~30% push toward 0.0 (unfavorable)
        public static float SanityRoll(int sanity)
        {
            float raw  = Random.value;
            float bias = sanity / 3f * 0.3f;          // ±0.3 bias at extremes
            if (bias >= 0f)
                return Mathf.Lerp(raw, 1f, bias * Random.value);
            else
                return Mathf.Lerp(raw, 0f, (-bias) * Random.value);
        }

        // Inverted roll: used for negative outcomes (ambush chance, curse trigger)
        public static float InsanityRoll(int sanity) => 1f - SanityRoll(sanity);

        // ── Relic / Loot Quality ──────────────────────────────────────────
        // Returns 0=Common, 1=Uncommon, 2=Rare based on sanity
        public static int RollRelicQuality(int sanity)
        {
            float roll = SanityRoll(sanity);
            if (roll > 0.88f) return 2;  // Rare    (12% at neutral, better at +3)
            if (roll > 0.65f) return 1;  // Uncommon(23% at neutral)
            return 0;                    // Common
        }

        // ── Gold Range ─────────────────────────────────────────────────────
        public static int RollGold(int baseAmount, int sanity)
        {
            float t = SanityRoll(sanity) * 0.8f + 0.6f;  // [0.6, 1.4]
            return Mathf.RoundToInt(baseAmount * t);
        }

        // ── Event Outcome ──────────────────────────────────────────────────
        // Biases which event category is selected (positive/neutral/negative)
        public static EventQuality RollEventQuality(int sanity)
        {
            float roll = SanityRoll(sanity);
            if (roll > 0.75f) return EventQuality.Positive;
            if (roll > 0.30f) return EventQuality.Neutral;
            return EventQuality.Negative;
        }

        // ── Shop Stock ─────────────────────────────────────────────────────
        // Higher sanity = better chance of rare items appearing in shops
        public static bool IsShopItemRare(int sanity) =>
            Random.value < Mathf.Clamp(0.08f + sanity * 0.04f, 0.01f, 0.20f);

        // ── Encounter Tone ─────────────────────────────────────────────────
        // Low sanity increases chance of ambush / disadvantageous start
        public static bool IsAmbush(int sanity) =>
            Random.value < Mathf.Clamp(0.10f - sanity * 0.03f, 0f, 0.25f);
    }

    public enum EventQuality { Positive, Neutral, Negative }
}
