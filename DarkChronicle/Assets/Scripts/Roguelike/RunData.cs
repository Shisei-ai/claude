using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// All state that persists through one roguelike run.
    /// Single source of truth passed between every room/floor.
    /// </summary>
    [System.Serializable]
    public class RunData
    {
        // ── Identity ───────────────────────────────────────────────────────
        public CharacterData   SelectedCharacter;
        public int             Seed;
        public System.DateTime StartTime;

        // ── Progress ───────────────────────────────────────────────────────
        public int  CurrentFloor    = 0;     // 0-based (0=Floor1 廃墟, 1=暗黒の森, 2=呪われた城)
        public int  CurrentNodeIndex = 0;
        public int  TotalRoomsCleared = 0;
        public bool IsRunActive     = false;

        // ── Resources ─────────────────────────────────────────────────────
        public int  CurrentHP;
        public int  MaxHP;
        public int  Gold         = 0;
        public int  Luck         = 0;         // +1 per Luck relic; affects loot/events

        // ── Skill Deck ─────────────────────────────────────────────────────
        // Player drafts skills into their deck as the run progresses.
        public List<SkillData>  Deck         = new();
        public List<SkillData>  SkillsRemoved = new();  // purged from deck

        // ── Relics ─────────────────────────────────────────────────────────
        public List<RelicData>  Relics       = new();

        // ── Curses ─────────────────────────────────────────────────────────
        public List<CurseData>  Curses       = new();

        // ── Level / Job Level ──────────────────────────────────────────────
        public int  CharacterLevel  = 1;
        public int  CurrentEXP      = 0;
        public int  JobLevel        = 1;
        public int  CurrentJobJP    = 0;
        public int  TotalExpGained  = 0;
        public int  TotalJPGained   = 0;
        public List<string> UnlockedSkillNames = new();

        // ── Statistics (for end screen) ────────────────────────────────────
        public int  DamageDealt   = 0;
        public int  DamageTaken   = 0;
        public int  EnemiesKilled = 0;
        public int  GoldEarned    = 0;
        public int  RelicsFound   = 0;
        public int  EventsVisited = 0;

        // ── Map State ──────────────────────────────────────────────────────
        public int[]  ChosenPath;            // serialized node choices per floor
        public NodeType LastNodeType;

        // ── Helpers ────────────────────────────────────────────────────────
        public float HPRatio => MaxHP > 0 ? (float)CurrentHP / MaxHP : 0f;

        public bool HasRelic(RelicEffectType effect) =>
            Relics.Exists(r => r.PrimaryEffect == effect);

        public int CountRelics(RelicEffectType effect) =>
            Relics.FindAll(r => r.PrimaryEffect == effect).Count;

        public void AddRelic(RelicData relic)
        {
            Relics.Add(relic);
            RelicsFound++;
        }

        public void AddCurse(CurseData curse) => Curses.Add(curse);

        public void AddSkill(SkillData skill)
        {
            if (!Deck.Contains(skill)) Deck.Add(skill);
        }

        public bool RemoveSkill(SkillData skill)
        {
            if (!Deck.Contains(skill)) return false;
            Deck.Remove(skill);
            SkillsRemoved.Add(skill);
            return true;
        }

        public void HealHP(int amount) => CurrentHP = Mathf.Min(CurrentHP + amount, MaxHP);
        public void TakeDamage(int amount) => CurrentHP = Mathf.Max(0, CurrentHP - amount);
        public bool IsAlive => CurrentHP > 0;

        public void SpendGold(int amount) => Gold = Mathf.Max(0, Gold - amount);
        public void EarnGold(int amount)  { Gold += amount; GoldEarned += amount; }
    }

    // ── Curse Data ─────────────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "CurseData", menuName = "DarkChronicle/Roguelike/Curse")]
    public class CurseData : ScriptableObject
    {
        public string       CurseName;
        [TextArea] public string Description;
        public Sprite       Icon;
        public CurseEffectType Effect;
        public float        Magnitude;

        public string DisplayText => $"【呪い】{CurseName}";
    }

    public enum CurseEffectType
    {
        ReduceMaxHP,          // max HPが下がる
        DoubleEncounterRate,  // エンカウント率2倍
        GoldReduced,          // 取得ゴールド50%
        SkillCostUp,          // MP消費+1
        WeakenedHeal,         // 回復量半減
        BleedAtStart,         // 戦闘開始時に出血付与
        ShieldBreakChanceDown,// Break確率-20%
        LuckDown,             // LUCKが下がる
        FragileHP,            // 被ダメージ+10%
        NoBP,                 // BP回収できない
    }

    public enum NodeType
    {
        Battle, EliteBattle, Boss, Shop, RestSite, RandomEvent, Treasure, CursedRoom, Start
    }
}
