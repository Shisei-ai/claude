using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike.Events
{
    // ── Event Choice Result ────────────────────────────────────────────────
    [System.Serializable]
    public class EventChoiceResult
    {
        [TextArea] public string NarrativeText;   // text shown after choosing

        [Header("HP Change")]
        public bool  ChangeHP;
        public float HPChangePercent;             // positive = heal, negative = damage
        public int   HPChangeFlat;

        [Header("Gold")]
        public bool  ChangeGold;
        public int   GoldChange;                  // positive = gain, negative = lose

        [Header("Relic")]
        public bool      GainRelic;
        public RelicData SpecificRelic;           // null = random from pool
        public RelicRarity RelicRarityPool;

        [Header("Curse")]
        public bool      GainCurse;
        public CurseData SpecificCurse;

        [Header("Skill Draft")]
        public bool  GainSkillDraft;             // show 3 skills to pick from
        public int   SkillChoiceCount = 3;

        [Header("Skill Remove")]
        public bool  RemoveSkill;

        [Header("Max HP")]
        public bool  ChangeMaxHP;
        public int   MaxHPChange;

        [Header("Battle")]
        public bool  TriggerBattle;              // some events lead to fights
        public bool  IsEliteBattle;

        [Header("Sanity Change")]
        public bool  ChangeSanity;
        public int   SanityChange;    // positive = sanity up, negative = sanity down

        [Header("Curse Removal")]
        public bool  RemoveCurse;
        public int   RemoveCurseCount = 1;

        [Header("Miscellaneous")]
        public bool  FullHeal;          // HP全回復
    }

    // ── Event Choice ───────────────────────────────────────────────────────
    [System.Serializable]
    public class EventChoice
    {
        public string             ChoiceText;     // what the button says
        [TextArea] public string  TooltipText;    // optional hint
        public bool               RequiresGold;
        public int                GoldCost;
        public float              SanityRequirement; // 0 = no requirement
        public EventChoiceResult  Result;
    }

    // ── Random Event ScriptableObject ─────────────────────────────────────
    [CreateAssetMenu(fileName = "RandomEventData", menuName = "DarkChronicle/Roguelike/RandomEvent")]
    public class RandomEventData : ScriptableObject
    {
        [Header("Identity")]
        public string       EventID;
        public string       Title;
        [TextArea(3, 8)]
        public string       NarrativeText;
        public Sprite       IllustrationSprite;
        public AudioClip    AmbientSound;

        [Header("Conditions")]
        public int          MinFloor = 0;           // earliest floor this can appear
        public int          MaxFloor = 99;
        public bool         OneTimeOnly = false;    // once per run
        public RelicEffectType RequiredRelic = (RelicEffectType)(-1); // -1 = no requirement
        public float        SanityWeight = 0f;   // selection weight modifier per Sanity point

        [Header("Choices")]
        public List<EventChoice> Choices;

        [Header("Atmospheric")]
        public Color        UITintColor = Color.white;
    }

    // ── Predefined Event Library ───────────────────────────────────────────
    // These are the 40 event templates referenced at runtime.
    // Actual ScriptableObjects created in Unity editor; this class just names them.
    public static class EventLibrary
    {
        // フロア1 (廃墟) events
        public const string AncientAltar      = "ancient_altar";
        public const string WoundedKnight     = "wounded_knight";
        public const string MysteriousChest   = "mysterious_chest";
        public const string CorruptedSpring   = "corrupted_spring";
        public const string RuinedLibrary     = "ruined_library";
        public const string ScavengersDeal    = "scavengers_deal";
        public const string ForgottenGrave    = "forgotten_grave";
        public const string DemonicPact       = "demonic_pact";
        public const string VoiceInTheDark    = "voice_in_dark";
        public const string AbandonnedCamp    = "abandoned_camp";

        // フロア2 (暗黒の森) events
        public const string TalkingRaven      = "talking_raven";
        public const string MoonshadowPuddle  = "moonshadow_puddle";
        public const string WitchsCauldron    = "witchs_cauldron";
        public const string BloodTree         = "blood_tree";
        public const string LostMerchant      = "lost_merchant";
        public const string FaeringAmbush     = "faering_ambush";
        public const string DruidCircle       = "druid_circle";
        public const string SpiritWell        = "spirit_well";
        public const string BanditCamp        = "bandit_camp";
        public const string MirrorLake        = "mirror_lake";

        // フロア3 (呪われた城) events
        public const string ShadowCouncil     = "shadow_council";
        public const string PhantomArmoury    = "phantom_armoury";
        public const string DarkSanctum       = "dark_sanctum";
        public const string TreasureVault     = "treasure_vault";
        public const string FallenHero        = "fallen_hero";
        public const string CursedPortrait    = "cursed_portrait";
        public const string GrimReapersDeal   = "grim_reapers_deal";
        public const string SoulCage          = "soul_cage";
        public const string DespairChamber    = "despair_chamber";
        public const string FinalBlessing     = "final_blessing";

        // Special / any floor
        public const string GamblersTavern    = "gamblers_tavern";
        public const string MysteriousTrader  = "mysterious_trader";
        public const string DivineSanctuary   = "divine_sanctuary";
        public const string ChaoticRift       = "chaotic_rift";
        public const string BloodForKnowledge = "blood_for_knowledge";
        public const string SkillForgery      = "skill_forgery";
        public const string LuckyShrine       = "lucky_shrine";
        public const string DarkMirror        = "dark_mirror";
        public const string TimeEchoChamber   = "time_echo_chamber";
        public const string SovereignsTrial   = "sovereigns_trial";
    }
}
