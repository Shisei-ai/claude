using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Character.Traits;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// Runtime state of one combatant (player or enemy) during a battle.
    /// Tracks HP, MP, BP, status effects, break state, and boost state.
    /// </summary>
    public class BattleCharacter
    {
        // ── Data ───────────────────────────────────────────────────────────
        public CharacterData  CharData   { get; private set; }   // null for enemies
        public EnemyData      EnemyData  { get; private set; }   // null for heroes
        public bool           IsPlayer   => CharData != null;

        // ── Stats (base + equipment buffs + status-effect % modifiers) ────
        public CharacterStats BaseStats  { get; private set; }
        CharacterStats        _buffStats = new CharacterStats();
        int                   _tempDefBuff;

        // Flat base values before status-effect percentage scaling.
        int _basePatk  => BaseStats.PhysicalAttack  + _buffStats.PhysicalAttack;
        int _baseMatk  => BaseStats.MagicAttack     + _buffStats.MagicAttack;
        int _basePdef  => BaseStats.PhysicalDefense + _buffStats.PhysicalDefense;
        int _baseMdef  => BaseStats.MagicDefense    + _buffStats.MagicDefense;
        int _baseSpeed => BaseStats.Speed           + _buffStats.Speed;

        public int MaxHP   => BaseStats.MaxHP  + _buffStats.MaxHP;
        public int MaxMP   => BaseStats.MaxMP  + _buffStats.MaxMP;
        public int Patk    => Mathf.Max(1, _basePatk  + StatusStatBonus(_basePatk,  StatusEffectType.AtkUp, StatusEffectType.AtkDown));
        public int Matk    => Mathf.Max(1, _baseMatk  + StatusStatBonus(_baseMatk,  StatusEffectType.AtkUp, StatusEffectType.AtkDown));
        public int Pdef    => Mathf.Max(0, _basePdef  + StatusStatBonus(_basePdef,  StatusEffectType.DefUp, StatusEffectType.DefDown));
        public int Mdef    => Mathf.Max(0, _baseMdef  + StatusStatBonus(_baseMdef,  StatusEffectType.DefUp, StatusEffectType.DefDown));
        public int Speed   => Mathf.Max(1, _baseSpeed + StatusStatBonus(_baseSpeed, StatusEffectType.SpdUp, StatusEffectType.SpdDown));
        public int Luck    => Mathf.Max(0, BaseStats.Luck            + _buffStats.Luck);
        public int Crit    => Mathf.Clamp(BaseStats.CriticalRate     + _buffStats.CriticalRate, 0, 100);
        public int Accuracy=> Mathf.Clamp(BaseStats.AccuracyRate     + _buffStats.AccuracyRate, 0, 100);

        // ── Current Status ─────────────────────────────────────────────────
        public int     HP    { get; private set; }
        public int     MP    { get; private set; }
        public int     BP    { get; private set; }  // Boost Points (0-5)
        public int     CurrentBoost { get; private set; }  // boosts spent this turn (0-3)
        public bool    IsAlive    => HP > 0;
        public bool    IsBroken   => IsEnemy && _currentShields <= 0;
        public bool    IsSilenced => HasStatus(StatusEffectType.Silence);
        public float   HPRatio    => (float)HP / MaxHP;

        // ── Break System (enemies only) ────────────────────────────────────
        bool    IsEnemy       => EnemyData != null;
        int     _maxShields;
        int     _currentShields;
        int     _brokenTurnsRemaining;
        const int BreakStunTurns = 2;

        public int  MaxShields      => _maxShields;
        public int  CurrentShields  => _currentShields;

        // ── Status Effects ─────────────────────────────────────────────────
        public List<ActiveStatusEffect> StatusEffects { get; } = new();

        // ── Turn Order ─────────────────────────────────────────────────────
        public float TurnGauge  { get; set; }
        public string DisplayName => IsPlayer ? CharData.CharacterName : EnemyData.EnemyName;

        // ── Character Systems ──────────────────────────────────────────────
        public TraitProcessor           Traits          { get; private set; }
        public ElementalResonanceSystem ResonanceSystem { get; private set; }

        // ── Constructor ────────────────────────────────────────────────────
        public BattleCharacter(CharacterData data, CharacterStats stats)
        {
            CharData  = data;
            BaseStats = stats.Clone();
            HP = MaxHP;
            MP = MaxMP;
            BP = 0;
            Traits          = new TraitProcessor(this, data.Traits ?? System.Array.Empty<CharacterTrait>());
            ResonanceSystem = new ElementalResonanceSystem();
        }

        public BattleCharacter(EnemyData data)
        {
            EnemyData       = data;
            BaseStats       = data.Stats.Clone();
            _maxShields     = data.ShieldPoints;
            _currentShields = _maxShields;
            HP = MaxHP;
            MP = MaxMP;
            Traits          = new TraitProcessor(this, System.Array.Empty<CharacterTrait>());
            ResonanceSystem = new ElementalResonanceSystem();
        }

        // ── HP / MP Modification ───────────────────────────────────────────
        public int TakeDamage(int rawDamage, DamageType type,
                               ElementType element = ElementType.None,
                               float ignoreDefPct = 0f)
        {
            if (!IsAlive) return 0;

            int defense      = type == DamageType.Physical ? Pdef : Mdef;
            int effectiveDef = type == DamageType.True ? 0
                               : Mathf.RoundToInt(defense * (1f - Mathf.Clamp01(ignoreDefPct)));
            int damage       = Mathf.Max(1, rawDamage - effectiveDef);

            if (IsBroken) damage = Mathf.RoundToInt(damage * 1.5f);

            HP = Mathf.Max(0, HP - damage);
            return damage;
        }

        public int Heal(int amount)
        {
            if (!IsAlive) return 0;
            int healed = Mathf.Min(amount, MaxHP - HP);
            HP += healed;
            return healed;
        }

        public bool UseMana(int amount)
        {
            if (MP < amount) return false;
            MP -= amount;
            return true;
        }

        public void RestoreMana(int amount) => MP = Mathf.Min(MaxMP, MP + amount);

        public void Revive(float hpRatio)
        {
            HP = Mathf.Max(1, Mathf.RoundToInt(MaxHP * Mathf.Clamp01(hpRatio)));
        }

        // ── BP / Boost System ──────────────────────────────────────────────
        public void AddBP(int amount = 1) => BP = Mathf.Min(5, BP + amount);

        public bool UseBoost(int boosts)
        {
            if (BP < boosts || CurrentBoost + boosts > 3) return false;
            BP           -= boosts;
            CurrentBoost += boosts;
            return true;
        }

        public void ResetBoost() => CurrentBoost = 0;

        // ── Break System ───────────────────────────────────────────────────
        public bool HitShield(int shieldDamage = 1)
        {
            if (!IsEnemy || IsBroken) return false;
            _currentShields = Mathf.Max(0, _currentShields - shieldDamage);
            if (_currentShields == 0)
            {
                _brokenTurnsRemaining = BreakStunTurns;
                return true;   // just broke
            }
            return false;
        }

        public void TickBreak()
        {
            if (!IsBroken) return;
            _brokenTurnsRemaining--;
            if (_brokenTurnsRemaining <= 0)
                _currentShields = _maxShields;  // shields recover
        }

        public void RestoreShields(int amount)
        {
            if (!IsEnemy) return;
            _currentShields = Mathf.Min(_maxShields, _currentShields + amount);
        }

        // ── Status Effects ─────────────────────────────────────────────────
        public void ApplyStatus(StatusEffect effect, float chance)
        {
            if (Random.value > chance) return;
            // No duplicates of same type
            StatusEffects.RemoveAll(s => s.Type == effect.Type);
            StatusEffects.Add(new ActiveStatusEffect(effect));
        }

        public void TickStatusEffects(out int dotDamage, out int hotHeal)
        {
            dotDamage = 0;
            hotHeal   = 0;
            var toRemove = new List<ActiveStatusEffect>();

            foreach (var s in StatusEffects)
            {
                switch (s.Type)
                {
                    case StatusEffectType.Poison:
                    case StatusEffectType.Bleed:
                    case StatusEffectType.Burn:
                        dotDamage += Mathf.Max(1, Mathf.RoundToInt(MaxHP * s.Value));
                        break;
                    case StatusEffectType.Regen:
                        hotHeal += Mathf.Max(1, Mathf.RoundToInt(MaxHP * s.Value));
                        break;
                }
                s.RemainingTurns--;
                if (s.RemainingTurns <= 0) toRemove.Add(s);
            }
            HP = Mathf.Max(0, HP - dotDamage);
            HP = Mathf.Min(MaxHP, HP + hotHeal);
            StatusEffects.RemoveAll(toRemove.Contains);
        }

        public bool HasStatus(StatusEffectType type) =>
            StatusEffects.Exists(s => s.Type == type);

        public void ClearAllStatus() => StatusEffects.Clear();

        // Value on stat-buff StatusEffects is a fraction: 0.20 = 20% of effectiveBase.
        int StatusStatBonus(int effectiveBase, StatusEffectType upType, StatusEffectType downType)
        {
            float pct = 0f;
            foreach (var s in StatusEffects)
                if      (s.Type == upType)   pct += s.Value;
                else if (s.Type == downType) pct -= s.Value;
            return Mathf.RoundToInt(effectiveBase * pct);
        }

        // ── Temporary Defense Buff (Trait_BattleHardened) ──────────────────
        public void AddTempDefBuff(int amount)
        {
            _buffStats.PhysicalDefense += amount;
            _tempDefBuff += amount;
        }

        public void ClearTempDefBuff()
        {
            _buffStats.PhysicalDefense -= _tempDefBuff;
            _tempDefBuff = 0;
        }

        // ── Turn Gauge ─────────────────────────────────────────────────────
        public void AdvanceTurnGauge(float tickSize = 1f) => TurnGauge += Speed * tickSize;

        public void ResetTurnGauge() => TurnGauge -= 100f;
    }

    // ── Active Status (runtime) ────────────────────────────────────────────
    public class ActiveStatusEffect
    {
        public StatusEffectType Type;
        public float            Value;
        public int              RemainingTurns;

        public ActiveStatusEffect(StatusEffect src)
        {
            Type           = src.Type;
            Value          = src.Value;
            RemainingTurns = src.Duration;
        }
    }
}
