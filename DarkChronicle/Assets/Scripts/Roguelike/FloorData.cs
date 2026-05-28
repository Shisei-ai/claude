using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.HD2D;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Per-floor configuration: enemy pools, boss, theme, atmosphere, and encounter modifiers.
    /// Three floors = three dramatically different HD-2D worlds.
    /// </summary>
    [CreateAssetMenu(fileName = "FloorData", menuName = "DarkChronicle/Roguelike/Floor")]
    public class FloorData : ScriptableObject
    {
        // ── Identity ───────────────────────────────────────────────────────
        [Header("Identity")]
        public int              FloorIndex;
        public string           FloorName;      // e.g. "廃墟の回廊"
        public string           FloorSubtitle;  // e.g. "かつての王国の残骸"
        [TextArea]
        public string           FloorLore;
        public Sprite           FloorTitleSprite;

        // ── Atmosphere ─────────────────────────────────────────────────────
        [Header("Atmosphere")]
        public AtmospherePreset AtmospherePreset;
        public WeatherType      Weather;
        public AudioClip        FloorBGM;
        public AudioClip        BossBGM;
        public Color            FogColor        = new(0.06f, 0.03f, 0.10f);
        public float            FogDensity      = 0.02f;
        public bool             HasFog          = true;

        // ── Enemy Pools ────────────────────────────────────────────────────
        [Header("Enemy Pools")]
        public List<EnemyEncounterGroup> NormalEncounters;
        public List<EnemyEncounterGroup> EliteEncounters;
        public List<EnemyData>           BossPool;          // randomly pick one boss per run
        public float                     EncounterRateMultiplier = 1f;

        // ── Scaling ────────────────────────────────────────────────────────
        [Header("Difficulty Scaling")]
        public float EnemyHPMultiplier      = 1f;
        public float EnemyDamageMultiplier  = 1f;
        public int   AdditionalShieldsOnElite = 0;

        // ── Loot ──────────────────────────────────────────────────────────
        [Header("Loot Modifiers")]
        public int   BaseGoldReward         = 50;
        public float RelicDropChanceBonus   = 0f;  // added to base chance
        public bool  ForceRelicOnEliteKill  = true;

        // ── Boss ──────────────────────────────────────────────────────────
        [Header("Boss Settings")]
        public int   BossHPBonus            = 0;   // flat HP added to boss stats
        public float BossDamageMultiplier   = 1.3f;
        public int   BossShieldBonus        = 2;   // extra shields on the boss
        public bool  BossGivesRelic         = true;
    }

    // ── Enemy Group (one "encounter" = 1-4 enemies) ────────────────────────
    [System.Serializable]
    public class EnemyEncounterGroup
    {
        public string           GroupName;
        public List<EnemyData>  Enemies;
        public float            Weight = 1f;  // selection weight
        public int              MinFloor = 0;

        // Sanity ∈ [-3, +3]: higher sanity makes favorable encounter groups slightly more likely
        public float AdjustedWeight(int sanity) => Mathf.Max(0.1f, Weight + sanity * 0.1f);
    }

    // ── Floor Library ──────────────────────────────────────────────────────
    /// <summary>
    /// References to all three floors; read by RoguelikeManager.
    /// </summary>
    [CreateAssetMenu(fileName = "FloorLibrary", menuName = "DarkChronicle/Roguelike/FloorLibrary")]
    public class FloorLibrary : ScriptableObject
    {
        [Header("Floors (index = floor number)")]
        public List<FloorData> Floors;

        // Floor 0: 廃墟の回廊 — shattered stone halls, dim candlelight, undead soldiers
        // Floor 1: 暗黒の森   — twisted black trees, glowing fungi, fae creatures
        // Floor 2: 呪われた城 — crimson moonlight, shadow knights, the Cursed Monarch

        public FloorData Get(int index) =>
            index >= 0 && index < Floors.Count ? Floors[index] : null;

        public bool HasNextFloor(int currentIndex) => currentIndex + 1 < Floors.Count;
    }
}
