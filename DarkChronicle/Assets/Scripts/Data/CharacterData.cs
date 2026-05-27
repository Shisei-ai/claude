using System.Collections.Generic;
using UnityEngine;

namespace DarkChronicle.Data
{
    // ── Base Stats ─────────────────────────────────────────────────────────
    [System.Serializable]
    public class CharacterStats
    {
        public int MaxHP;
        public int MaxMP;
        public int PhysicalAttack;
        public int MagicAttack;
        public int PhysicalDefense;
        public int MagicDefense;
        public int Speed;
        public int Luck;
        public int CriticalRate;   // 0-100
        public int AccuracyRate;   // base 85

        public CharacterStats Clone() => (CharacterStats)MemberwiseClone();

        public static CharacterStats operator +(CharacterStats a, CharacterStats b) => new CharacterStats
        {
            MaxHP           = a.MaxHP           + b.MaxHP,
            MaxMP           = a.MaxMP           + b.MaxMP,
            PhysicalAttack  = a.PhysicalAttack  + b.PhysicalAttack,
            MagicAttack     = a.MagicAttack     + b.MagicAttack,
            PhysicalDefense = a.PhysicalDefense + b.PhysicalDefense,
            MagicDefense    = a.MagicDefense    + b.MagicDefense,
            Speed           = a.Speed           + b.Speed,
            Luck            = a.Luck            + b.Luck,
            CriticalRate    = a.CriticalRate    + b.CriticalRate,
            AccuracyRate    = a.AccuracyRate    + b.AccuracyRate,
        };
    }

    // ── Element System ─────────────────────────────────────────────────────
    public enum ElementType
    {
        None, Fire, Ice, Lightning, Wind, Dark, Light, Poison, Bleed
    }

    public enum DamageType { Physical, Magical, True }

    // ── Skill Data ─────────────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "SkillData", menuName = "DarkChronicle/Skill")]
    public class SkillData : ScriptableObject
    {
        [Header("Identity")]
        public string        SkillName;
        [TextArea] public string Description;
        public Sprite        Icon;
        public ElementType   Element;
        public DamageType    DamageType;

        [Header("Cost")]
        public int  MPCost;
        public int  BPCost;         // Boost Points: 0 = no boost variant

        [Header("Power")]
        public float BasePower;
        public float CritMultiplier  = 1.5f;
        public bool  HitsAllEnemies;
        public bool  HitsAllAllies;
        public int   HitCount        = 1;
        public bool  CanBreak;       // contributes to Break

        [Header("Status Effect")]
        public StatusEffect AppliedStatus;
        public float        StatusChance;   // 0-1

        [Header("Healing")]
        public bool  IsHeal;
        public float HealPower;

        [Header("Animation")]
        public string AnimationTrigger;
        public GameObject VFXPrefab;
        public AudioClip  SFX;
    }

    // ── Status Effects ─────────────────────────────────────────────────────
    [System.Serializable]
    public class StatusEffect
    {
        public StatusEffectType Type;
        public int              Duration;   // turns
        public float            Value;      // damage / heal per turn, or multiplier

        public string DisplayName => Type switch
        {
            StatusEffectType.Poison   => "毒",
            StatusEffectType.Bleed    => "出血",
            StatusEffectType.Burn     => "炎上",
            StatusEffectType.Freeze   => "凍結",
            StatusEffectType.Paralysis=> "麻痺",
            StatusEffectType.Sleep    => "睡眠",
            StatusEffectType.Blind    => "暗闇",
            StatusEffectType.Silence  => "沈黙",
            StatusEffectType.AtkUp    => "攻撃UP",
            StatusEffectType.DefDown  => "防御DOWN",
            _                         => Type.ToString()
        };
    }

    public enum StatusEffectType
    {
        Poison, Bleed, Burn, Freeze, Paralysis, Sleep, Blind, Silence,
        AtkUp, AtkDown, DefUp, DefDown, SpdUp, SpdDown, Regen
    }

    // ── Job / Class System ─────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "JobData", menuName = "DarkChronicle/Job")]
    public class JobData : ScriptableObject
    {
        public string       JobName;
        [TextArea] public string Description;
        public Sprite       Icon;
        public Color        ThemeColor = Color.white;

        [Header("Stat Growth Rates (per level)")]
        public CharacterStats GrowthRates;

        [Header("Learnable Skills")]
        public List<JobSkillEntry> LearnableSkills;

        [Header("Equipment Proficiency")]
        public List<WeaponType> AllowedWeapons;
        public List<ArmorType>  AllowedArmors;
    }

    [System.Serializable]
    public class JobSkillEntry
    {
        public int       JobLevel;
        public SkillData Skill;
        public int       JpCost;    // Job Points to learn
    }

    public enum WeaponType { Sword, Axe, Bow, Staff, Dagger, Spear, Tome, Fists }
    public enum ArmorType  { LightArmor, HeavyArmor, Robe, Shield }

    // ── Character Data ─────────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "CharacterData", menuName = "DarkChronicle/Character")]
    public class CharacterData : ScriptableObject
    {
        [Header("Identity")]
        public string        CharacterName;
        [TextArea] public string Backstory;
        public Sprite        Portrait;
        public Sprite        BattleSprite;
        public Sprite        FieldSprite;
        public Color         ThemeColor = Color.white;
        public string        VoicePrefix;  // e.g. "Leona" -> "Leona_Attack_01"

        [Header("Base Stats at Level 1")]
        public CharacterStats BaseStats;

        [Header("Starting Job")]
        public JobData       StarterJob;

        [Header("Story Path")]
        public int           ChapterCount = 4;
        public string[]      ChapterTitles;

        [Header("Weapon Sprite Variants")]
        public Sprite[]      WeaponSprites;  // indexed by WeaponType
    }

    // ── Enemy Data ─────────────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "EnemyData", menuName = "DarkChronicle/Enemy")]
    public class EnemyData : ScriptableObject
    {
        [Header("Identity")]
        public string        EnemyName;
        [TextArea] public string Lore;
        public Sprite        BattleSprite;
        public EnemyRank     Rank;

        [Header("Stats")]
        public CharacterStats Stats;
        public int            ShieldPoints = 1;   // Octopath-style break shields

        [Header("Weaknesses (Break)")]
        public List<ElementType>  ElementWeaknesses;
        public List<WeaponType>   WeaponWeaknesses;

        [Header("Actions")]
        public List<EnemyAction>  Actions;
        public int                ActionsPerTurn = 1;

        [Header("Rewards")]
        public int   ExpReward;
        public int   GoldReward;
        public int   JPReward;
        public List<DropItem> DropTable;
    }

    [System.Serializable]
    public class EnemyAction
    {
        public string        ActionName;
        public SkillData     Skill;
        public int           Priority;            // higher = preferred
        public float         UseChance = 1f;
        public int           HealthThreshold = 0; // only use below this HP %
    }

    [System.Serializable]
    public class DropItem
    {
        public ItemData Item;
        public float    DropRate;  // 0-1
        public int      Quantity   = 1;
    }

    public enum EnemyRank { Normal, Elite, Boss, TrueFinalBoss }

    // ── Item Data ──────────────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "ItemData", menuName = "DarkChronicle/Item")]
    public class ItemData : ScriptableObject
    {
        public string        ItemName;
        [TextArea] public string Description;
        public Sprite        Icon;
        public ItemType      Type;
        public int           Value;       // shop price
        public bool          IsKeyItem;

        [Header("Effect")]
        public int           HealHP;
        public int           HealMP;
        public bool          ReviveTarget;
        public int           ReviveHPPercent = 50;
        public StatusEffect  CureStatus;
        public StatusEffect  ApplyStatus;
    }

    public enum ItemType { Consumable, Equipment, KeyItem, Material }
}
