using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Roguelike.Relics
{
    /// <summary>
    /// Processes all relic effects by hooking into BattleManager events
    /// and RunData state. One instance persists across the entire run.
    /// </summary>
    public sealed class RelicManager : MonoBehaviour
    {
        public static RelicManager Instance { get; private set; }

        RunData _run;

        // ── Per-battle state (original) ────────────────────────────────────
        bool _firstHitUsed;
        bool _firstHitImmuneUsed;
        bool _reviveUsed;
        bool _freeBoostUsed;
        bool _echoUsed;
        int  _soulSiphonCount;

        // ── Per-battle tracking (new) ──────────────────────────────────────
        float  _bossShieldBarrier;        // BossShield: boss-fight barrier HP
        float  _shieldPerFloorBarrier;    // ShieldPerFloor: accumulated across floors (persists)
        int    _lastBoostLevel;           // BoostDamageMultiplier: boost level of last skill
        float  _randomSkillBuffMult;      // RandomSkillBuff: 1.5× for next skill this turn
        bool   _randomSkillBuffUsed;      // RandomSkillBuff: reset each turn
        bool   _shortcutKeyUsed;          // ShortcutKey: one-time map skip per run
        int    _stackingRageStacks;       // StackingRage: 0–10
        bool   _critChainActive;          // CritChain: true after a crit
        bool   _firstTurnPassed;          // FirstTurnBoost: false on turn 1
        bool   _boostSurgeActive;         // BoostSurge: true after a boost
        bool   _skillCopyAvailable;       // SkillCopy: true until used
        float  _mirrorImageBonus;         // MirrorImage: accumulated bonus damage
        string _battleRhythmLastSkillId;  // BattleRhythm: last used skill name
        int    _battleRhythmStreak;       // BattleRhythm: consecutive same-skill count
        int    _damageTakenCount;         // SurgeProtection: hits taken this battle
        bool   _sacrificialBonusActive;   // SacrificialPact: active this battle
        float  _doubleOrNothingMult;      // DoubleOrNothing: 2f or 0.5f
        int    _chainSkillTurnCount;      // ChainBonus: consecutive skill turns
        bool   _chainBonusActive;         // ChainBonus: next skill is 2x
        int    _adaptiveArmorStacks;      // AdaptiveArmor: 0–10
        float  _transcendenceBarrier;     // Transcendence: startup barrier
        float  _fortifiedWallBarrier;     // FortifiedWall: startup barrier
        bool   _breakSealActive;          // BreakSeal: next enemy attack is 0
        int    _turnCount;                // turn tracking
        bool   _jumpStartAvailable;       // JumpStart: first skill of battle is free

        // ── Battle character references ────────────────────────────────────
        List<BattleCharacter> _currentHeroes  = new();
        List<BattleCharacter> _currentEnemies = new();

        void Awake() => Instance = this;

        public void InitForRun(RunData run)
        {
            _run = run;
            BattleManager.OnTurnStart         += OnTurnStart;
            BattleManager.OnDamageDealt       += OnDamageDealt;
            BattleManager.OnCharacterBroken   += OnCharacterBroken;
            BattleManager.OnCharacterDefeated += OnCharacterDefeated;
            BattleManager.OnBattleEnd         += OnBattleEnd;
        }

        void OnDestroy()
        {
            BattleManager.OnTurnStart         -= OnTurnStart;
            BattleManager.OnDamageDealt       -= OnDamageDealt;
            BattleManager.OnCharacterBroken   -= OnCharacterBroken;
            BattleManager.OnCharacterDefeated -= OnCharacterDefeated;
            BattleManager.OnBattleEnd         -= OnBattleEnd;
        }

        // ── Battle Start / Room Entry ──────────────────────────────────────
        public void OnBattleStart(List<BattleCharacter> heroes, List<BattleCharacter> enemies)
        {
            // Store references
            _currentHeroes  = heroes  ?? new List<BattleCharacter>();
            _currentEnemies = enemies ?? new List<BattleCharacter>();

            // Reset original state
            _firstHitUsed       = false;
            _firstHitImmuneUsed = false;
            _reviveUsed         = false;
            _freeBoostUsed      = false;
            _echoUsed           = false;

            // Reset new state
            _bossShieldBarrier       = 0f;
            _lastBoostLevel          = 0;
            _randomSkillBuffMult     = 1f;
            _randomSkillBuffUsed     = false;
            _stackingRageStacks      = 0;
            _critChainActive         = false;
            _firstTurnPassed         = false;
            _boostSurgeActive        = false;
            _skillCopyAvailable      = HasEffect(RelicEffectType.SkillCopy);
            _mirrorImageBonus        = 0f;
            _battleRhythmLastSkillId = string.Empty;
            _battleRhythmStreak      = 0;
            _damageTakenCount        = 0;
            _sacrificialBonusActive  = false;
            _doubleOrNothingMult     = 1f;
            _chainSkillTurnCount     = 0;
            _chainBonusActive        = false;
            _adaptiveArmorStacks     = 0;
            _transcendenceBarrier    = 0f;
            _fortifiedWallBarrier    = 0f;
            _breakSealActive         = false;
            _turnCount               = 0;
            _jumpStartAvailable      = false;

            foreach (var hero in heroes)
            {
                // StartWithBP
                int bpBonus = (int)SumEffect(RelicEffectType.StartWithBP);
                for (int i = 0; i < bpBonus; i++) hero.AddBP(1);

                // HealAtBattleStart
                float healPct = SumEffect(RelicEffectType.HealAtBattleStart);
                if (healPct > 0f)
                {
                    int healAmt = Mathf.RoundToInt(hero.MaxHP * healPct);
                    hero.Heal(healAmt);
                    _run.HealHP(healAmt);
                }
            }

            // WeaknessReveal: handled by BattleUI side — just flag here

            // PoisonAura / BurnAura / ChillAura
            foreach (var enemy in enemies)
            {
                if (HasEffect(RelicEffectType.PoisonAura))
                    enemy.ApplyStatus(new StatusEffect { Type = StatusEffectType.Poison, Duration = 3, Value = 0.03f }, 1f);
                if (HasEffect(RelicEffectType.BurnAura))
                    enemy.ApplyStatus(new StatusEffect { Type = StatusEffectType.Burn,   Duration = 3, Value = 0.02f }, 1f);
                if (HasEffect(RelicEffectType.ChillAura))
                    enemy.ApplyStatus(new StatusEffect { Type = StatusEffectType.Freeze, Duration = 2, Value = 0f   }, 1f);
            }

            // FortifiedWall
            if (HasEffect(RelicEffectType.FortifiedWall) && heroes.Count > 0)
                _fortifiedWallBarrier = heroes[0].MaxHP * 0.10f;

            // Transcendence: startup barrier (10% MaxHP)
            if (HasEffect(RelicEffectType.Transcendence) && heroes.Count > 0)
                _transcendenceBarrier = heroes[0].MaxHP * 0.10f;

            // SacrificialPact: HP-30% at battle start
            if (HasEffect(RelicEffectType.SacrificialPact) && heroes.Count > 0)
            {
                int sacrifice = Mathf.RoundToInt(heroes[0].MaxHP * 0.30f);
                heroes[0].TakeDamage(sacrifice, DamageType.True);
                _run.TakeDamage(sacrifice);
                _sacrificialBonusActive = true;
            }

            // DoubleOrNothing: coin flip
            if (HasEffect(RelicEffectType.DoubleOrNothing))
                _doubleOrNothingMult = Random.value < 0.5f ? 2f : 0.5f;

            // JumpStart: first skill of this battle is free
            if (HasEffect(RelicEffectType.JumpStart))
                _jumpStartAvailable = true;

            // BossShield: HP barrier at boss battle start
            if (HasEffect(RelicEffectType.BossShield))
            {
                bool hasBoss = enemies.Exists(e =>
                    e.EnemyData?.Rank == EnemyRank.Boss ||
                    e.EnemyData?.Rank == EnemyRank.TrueFinalBoss);
                if (hasBoss && heroes.Count > 0)
                    _bossShieldBarrier = heroes[0].MaxHP * 0.15f;
            }

            // StartWithFullMP
            if (HasEffect(RelicEffectType.StartWithFullMP))
                foreach (var hero in heroes) hero.RestoreMana(hero.MaxMP);

            // MaxBPUp: extend the BP cap
            int maxBPBonus = (int)SumEffect(RelicEffectType.MaxBPUp);
            if (maxBPBonus > 0)
                foreach (var hero in heroes) hero.MaxBP += maxBPBonus;
        }

        // ── Turn Start ─────────────────────────────────────────────────────
        void OnTurnStart(BattleCharacter character)
        {
            if (!character.IsPlayer) return;

            // Original effects
            float regenPct = SumEffect(RelicEffectType.RegenEachTurn);
            if (regenPct > 0f)
            {
                int regen = Mathf.Max(1, Mathf.RoundToInt(character.MaxHP * regenPct));
                character.Heal(regen);
                _run.HealHP(regen);
            }

            int mpRegen = (int)SumEffect(RelicEffectType.MPRegenEachTurn);
            if (mpRegen > 0) character.RestoreMana(mpRegen);

            // New turn tracking
            _turnCount++;
            _firstTurnPassed  = _turnCount > 1;
            _randomSkillBuffUsed = false;
            if (HasEffect(RelicEffectType.RandomSkillBuff)) _randomSkillBuffMult = 1.50f;

            // BreakRegen: if any enemy is broken, heal hero
            if (HasEffect(RelicEffectType.BreakRegen))
            {
                bool anyBroken = _currentEnemies.Exists(e => e.IsAlive && e.IsBroken);
                if (anyBroken)
                {
                    int regen = Mathf.Max(1, Mathf.RoundToInt(character.MaxHP * 0.05f));
                    character.Heal(regen);
                    _run.HealHP(regen);
                }
            }

            // HungryBlade: HP drain each turn (flat 5)
            if (HasEffect(RelicEffectType.HungryBlade))
            {
                _run.TakeDamage(5);
                character.TakeDamage(5, DamageType.True);
            }

            // BloodPact: drain 3% HP per turn
            if (HasEffect(RelicEffectType.BloodPact))
            {
                int drain = Mathf.Max(1, Mathf.RoundToInt(character.MaxHP * 0.03f));
                _run.TakeDamage(drain);
                character.TakeDamage(drain, DamageType.True);
            }

            // LifeDrain: absorb 1% HP from each living enemy
            if (HasEffect(RelicEffectType.LifeDrain))
            {
                int totalDrained = 0;
                foreach (var enemy in _currentEnemies)
                {
                    if (!enemy.IsAlive) continue;
                    int drain = Mathf.Max(1, Mathf.RoundToInt(enemy.MaxHP * 0.01f));
                    enemy.TakeDamage(drain, DamageType.True);
                    totalDrained += drain;
                }
                if (totalDrained > 0)
                {
                    character.Heal(totalDrained);
                    _run.HealHP(totalDrained);
                }
            }
        }

        // ── Damage Modifier (called before damage is applied) ──────────────
        public int ModifyOutgoingDamage(BattleCharacter attacker, BattleCharacter target,
                                        int rawDamage, ElementType element)
        {
            float multiplier = 1f;

            // Flat bonus
            rawDamage += (int)SumEffect(RelicEffectType.FlatDamageUp);

            // Percent bonus
            multiplier += SumEffect(RelicEffectType.PercentDamageUp) / 100f;

            // FirstHitDoubleDamage
            if (!_firstHitUsed && HasEffect(RelicEffectType.FirstHitDoubleDamage))
            {
                multiplier *= 2f;
                _firstHitUsed = true;
            }

            // LastStandDamage
            if (_run.HPRatio < 0.5f && HasEffect(RelicEffectType.LastStandDamage))
                multiplier += SumEffect(RelicEffectType.LastStandDamage) / 100f;

            // BerserkerRage: scales inversely with HP
            if (HasEffect(RelicEffectType.BerserkerRage))
                multiplier += (1f - _run.HPRatio) * 1.5f;

            // ForbiddenGrimoire: 2x damage, but MP cost is also 2x (handled in skill use)
            if (HasEffect(RelicEffectType.ForbiddenGrimoire)) multiplier *= 2f;

            // Elemental bonus
            multiplier += GetElementBonus(element) / 100f;

            // Break damage (two separate relic effects)
            if (target.IsBroken)
            {
                multiplier += SumEffect(RelicEffectType.BonusDamageOnBreak) / 100f;
                multiplier += SumEffect(RelicEffectType.BreakDamageBonus)   / 100f;
            }

            // VampiricBlade: absorb 20% (heal applied in OnDamageDealt)
            // Handled there to keep modifier pure.

            // ── New offense modifiers ──────────────────────────────────────

            // FirstTurnBoost
            if (!_firstTurnPassed && HasEffect(RelicEffectType.FirstTurnBoost))
                multiplier += 0.50f;

            // StackingRage: apply current stacks then increment
            if (HasEffect(RelicEffectType.StackingRage))
            {
                multiplier += _stackingRageStacks * 0.03f;
                _stackingRageStacks = Mathf.Min(10, _stackingRageStacks + 1);
            }

            // NecroticPower: uses run-wide EnemiesKilled
            if (HasEffect(RelicEffectType.NecroticPower))
                multiplier += Mathf.Min(0.40f, _run.EnemiesKilled * 0.02f);

            // SpiritualBalance: Sanity × 10% (clamped ±30%)
            if (HasEffect(RelicEffectType.SpiritualBalance))
                multiplier += Mathf.Clamp(_run.Sanity * 0.10f, -0.30f, 0.30f);

            // PoisonMaster
            if (HasEffect(RelicEffectType.PoisonMaster) && target.HasStatus(StatusEffectType.Poison))
                multiplier += 0.30f;

            // BleedMaster
            if (HasEffect(RelicEffectType.BleedMaster) && target.HasStatus(StatusEffectType.Bleed))
                multiplier += 0.30f;

            // Opportunist: target has any debuff
            if (HasEffect(RelicEffectType.Opportunist) && target.StatusEffects.Count > 0)
                multiplier += 0.20f;

            // DeckPurify: +3% per removed skill (max +30%)
            if (HasEffect(RelicEffectType.DeckPurify))
                multiplier += Mathf.Min(0.30f, _run.SkillsRemoved.Count * 0.03f);

            // CurseWeaver: +10% per curse held
            if (HasEffect(RelicEffectType.CurseWeaver))
                multiplier += _run.Curses.Count * 0.10f;

            // SpecializedDeck: +20% if deck ≤ 10 skills
            if (HasEffect(RelicEffectType.SpecializedDeck) && _run.Deck.Count <= 10)
                multiplier += 0.20f;

            // BoostSurge: after boost, next skill +30%
            if (_boostSurgeActive)
            {
                multiplier += 0.30f;
                _boostSurgeActive = false;
            }

            // ChainBonus: next skill is 2x
            if (_chainBonusActive)
            {
                multiplier *= 2f;
                _chainBonusActive = false;
            }

            // MirrorImage: add accumulated bonus damage
            rawDamage += Mathf.RoundToInt(_mirrorImageBonus);
            _mirrorImageBonus = 0f;

            // SurgeProtection: 3+ hits taken → +30%
            if (HasEffect(RelicEffectType.SurgeProtection) && _damageTakenCount >= 3)
                multiplier += 0.30f;

            // CorruptedCore: +50% skill damage bonus (applied here generically)
            if (HasEffect(RelicEffectType.CorruptedCore))
                multiplier += 0.50f;

            // GlassCannon: +80%
            if (HasEffect(RelicEffectType.GlassCannon))
                multiplier += 0.80f;

            // BloodPact: HP ≤ 50% → +100%
            if (HasEffect(RelicEffectType.BloodPact) && _run.HPRatio <= 0.5f)
                multiplier += 1.00f;

            // ChaosCore: ±30% random
            if (HasEffect(RelicEffectType.ChaosCore))
                multiplier += Random.Range(-0.30f, 0.30f);

            // HungryBlade: +40%
            if (HasEffect(RelicEffectType.HungryBlade))
                multiplier += 0.40f;

            // SacrificialPact: +60% for whole battle
            if (_sacrificialBonusActive)
                multiplier += 0.60f;

            // MirrorCurse: curses × 15%
            if (HasEffect(RelicEffectType.MirrorCurse))
                multiplier += _run.Curses.Count * 0.15f;

            // DoubleOrNothing: coin flip mult applied at battle start
            multiplier *= _doubleOrNothingMult;

            // CursedButPowerful: +30% when holding at least one curse
            if (HasEffect(RelicEffectType.CursedButPowerful) && _run.Curses.Count > 0)
                multiplier += 0.30f;

            // BoostDamageMultiplier: scales with boost level of this skill
            if (_lastBoostLevel > 0 && HasEffect(RelicEffectType.BoostDamageMultiplier))
                multiplier += SumEffect(RelicEffectType.BoostDamageMultiplier) / 100f * _lastBoostLevel;

            // RandomSkillBuff: one-shot 50% bonus for next skill this turn
            if (!_randomSkillBuffUsed && _randomSkillBuffMult > 1f)
            {
                multiplier       *= _randomSkillBuffMult;
                _randomSkillBuffUsed = true;
            }

            return Mathf.Max(1, Mathf.RoundToInt(rawDamage * multiplier));
        }

        public int ModifyIncomingDamage(BattleCharacter target, int rawDamage)
        {
            // Original reductions
            float reduction = SumEffect(RelicEffectType.PercentDamageReduction) / 100f;
            rawDamage = Mathf.RoundToInt(rawDamage * (1f - reduction));
            rawDamage -= (int)SumEffect(RelicEffectType.FlatDefenseUp);

            // FirstHitImmune
            if (!_firstHitImmuneUsed && HasEffect(RelicEffectType.FirstHitImmune))
            {
                _firstHitImmuneUsed = true;
                return 0;
            }

            // DeathMark: +25% incoming
            if (HasEffect(RelicEffectType.DeathMark))
                rawDamage = Mathf.RoundToInt(rawDamage * 1.25f);

            // Curse: FragileHP
            if (_run.Curses.Exists(c => c.Effect == CurseEffectType.FragileHP))
                rawDamage = Mathf.RoundToInt(rawDamage * 1.10f);

            // ── New incoming modifiers ─────────────────────────────────────

            // GlassCannon: +60% incoming
            if (HasEffect(RelicEffectType.GlassCannon))
                rawDamage = Mathf.RoundToInt(rawDamage * 1.60f);

            // LastStandGuard: HP ≤ 20% → -40%
            if (HasEffect(RelicEffectType.LastStandGuard) && _run.HPRatio <= 0.20f)
                rawDamage = Mathf.RoundToInt(rawDamage * 0.60f);

            // AdaptiveArmor: -3% per stack (max 10 stacks = -30%)
            if (HasEffect(RelicEffectType.AdaptiveArmor) && _adaptiveArmorStacks > 0)
                rawDamage = Mathf.RoundToInt(rawDamage * (1f - _adaptiveArmorStacks * 0.03f));
            if (HasEffect(RelicEffectType.AdaptiveArmor))
                _adaptiveArmorStacks = Mathf.Min(10, _adaptiveArmorStacks + 1);

            // DamageCap: cap at 20% MaxHP
            if (HasEffect(RelicEffectType.DamageCap))
                rawDamage = Mathf.Min(rawDamage, Mathf.RoundToInt(_run.MaxHP * 0.20f));

            // FortifiedWall barrier absorption
            if (_fortifiedWallBarrier > 0f)
            {
                float absorbed = Mathf.Min(_fortifiedWallBarrier, rawDamage);
                _fortifiedWallBarrier -= absorbed;
                rawDamage -= Mathf.RoundToInt(absorbed);
            }

            // BossShield barrier absorption
            if (_bossShieldBarrier > 0f)
            {
                float absorbed = Mathf.Min(_bossShieldBarrier, rawDamage);
                _bossShieldBarrier -= absorbed;
                rawDamage -= Mathf.RoundToInt(absorbed);
            }

            // ShieldPerFloor accumulated barrier
            if (_shieldPerFloorBarrier > 0f)
            {
                float absorbed = Mathf.Min(_shieldPerFloorBarrier, rawDamage);
                _shieldPerFloorBarrier -= absorbed;
                rawDamage -= Mathf.RoundToInt(absorbed);
            }

            // Transcendence barrier absorption
            if (_transcendenceBarrier > 0f)
            {
                float absorbed = Mathf.Min(_transcendenceBarrier, rawDamage);
                _transcendenceBarrier -= absorbed;
                rawDamage -= Mathf.RoundToInt(absorbed);
            }

            // BreakSeal: zero damage if active
            if (_breakSealActive)
            {
                _breakSealActive = false;
                rawDamage = 0;
            }

            // GoldShield: spend gold to absorb up to 50G worth of damage
            if (HasEffect(RelicEffectType.GoldShield) && _run.Gold > 0)
            {
                int absorb = Mathf.Min(rawDamage, Mathf.Min(50, _run.Gold));
                _run.SpendGold(absorb);
                rawDamage -= absorb;
            }

            // MirrorImage: accumulate 25% of damage taken for next attack
            if (HasEffect(RelicEffectType.MirrorImage))
                _mirrorImageBonus += rawDamage * 0.25f;

            // Track hits taken this battle (for SurgeProtection)
            _damageTakenCount++;

            // Counterstrike: 15% chance to deal 10% MaxHP to all enemies
            if (HasEffect(RelicEffectType.Counterstrike) && Random.value < 0.15f && target.IsPlayer)
            {
                int counterDmg = Mathf.RoundToInt(_run.MaxHP * 0.10f);
                foreach (var enemy in _currentEnemies)
                {
                    if (enemy.IsAlive) enemy.TakeDamage(counterDmg, DamageType.True);
                }
            }

            return Mathf.Max(0, rawDamage);
        }

        // ── On Damage Dealt ────────────────────────────────────────────────
        void OnDamageDealt(BattleCharacter target, int amount)
        {
            _run.DamageDealt += amount;

            // VampiricBlade: heal 20% of damage dealt
            if (HasEffect(RelicEffectType.VampiricBlade))
            {
                int absorbed = Mathf.RoundToInt(amount * 0.2f);
                _run.HealHP(absorbed);
            }

            // ThornsReflect: apply back to attacker (enemies only)
            // Handled in battle damage pipeline.

            // Only apply status infliction to enemies
            if (!target.IsPlayer)
            {
                // BleedOnCrit: 15% chance to apply bleed
                if (HasEffect(RelicEffectType.BleedOnCrit) && Random.value < 0.15f)
                    target.ApplyStatus(new StatusEffect { Type = StatusEffectType.Bleed, Duration = 2, Value = 0.04f }, 1f);

                // ThunderMark: 20% chance paralysis
                if (HasEffect(RelicEffectType.ThunderMark) && Random.value < 0.20f)
                    target.ApplyStatus(new StatusEffect { Type = StatusEffectType.Paralysis, Duration = 1, Value = 0f }, 1f);
            }
        }

        // ── On Character Broken ────────────────────────────────────────────
        void OnCharacterBroken(BattleCharacter broken)
        {
            if (broken.IsPlayer) return;

            // BPOnBreak: BP+2 for all heroes
            if (HasEffect(RelicEffectType.BPOnBreak))
                foreach (var hero in _currentHeroes) hero.AddBP(2);

            // BreakSeal: zero the enemy's next attack
            if (HasEffect(RelicEffectType.BreakSeal))
                _breakSealActive = true;
        }

        // ── On Kill ────────────────────────────────────────────────────────
        void OnCharacterDefeated(BattleCharacter defeated)
        {
            if (defeated.IsPlayer) return;
            _run.EnemiesKilled++;

            // OnKillHeal
            float healPct = SumEffect(RelicEffectType.OnKillHeal);
            if (healPct > 0f)
            {
                int heal = Mathf.Max(1, Mathf.RoundToInt(_run.MaxHP * healPct));
                _run.HealHP(heal);
            }

            // OnKillBP
            if (HasEffect(RelicEffectType.OnKillBP))
                foreach (var hero in _currentHeroes.Where(h => h.IsAlive))
                    hero.AddBP(1);

            // SoulSiphon
            if (HasEffect(RelicEffectType.SoulSiphon))
            {
                _soulSiphonCount++;
                if (_soulSiphonCount >= 10)
                {
                    _soulSiphonCount = 0;
                    RoguelikeManager.Instance?.TriggerSoulSiphonReward();
                }
            }
        }

        // ── On Battle End ──────────────────────────────────────────────────
        void OnBattleEnd(BattleResult result)
        {
            if (result != BattleResult.Victory) return;

            // FloorClearHeal - handled by RoguelikeManager at floor end

            // Recycler: on victory, "sell" a random skill for 30G
            if (HasEffect(RelicEffectType.Recycler) && _run.Deck.Count > 1)
            {
                int idx = Random.Range(0, _run.Deck.Count);
                _run.Deck.RemoveAt(idx);
                _run.EarnGold(30);
            }
        }

        // ── Revive Check ───────────────────────────────────────────────────
        public bool TryRevive(BattleCharacter hero)
        {
            if (_reviveUsed || !HasEffect(RelicEffectType.ReviveOnce)) return false;
            _reviveUsed = true;
            hero.Revive(0.01f);  // revive at ~1% HP
            return true;
        }

        // ── Break Modifiers ────────────────────────────────────────────────
        public int GetBreakShieldDamage()
        {
            int bonus = HasEffect(RelicEffectType.ShieldHitBonus) ? 2 : 1;
            if (HasEffect(RelicEffectType.QuickBreak)) bonus++;
            return bonus;
        }

        public int GetBreakExtendTurns() =>
            HasEffect(RelicEffectType.BreakExtend) ? 1 : 0;

        public int GetBoostExtendTurns() =>
            HasEffect(RelicEffectType.BoostExtend) ? 1 : 0;

        // ── Skill Modifiers ────────────────────────────────────────────────
        public int ModifySkillMPCost(int baseCost)
        {
            int discount = (int)SumEffect(RelicEffectType.SkillMPDiscount);
            // ForbiddenGrimoire doubles cost
            if (HasEffect(RelicEffectType.ForbiddenGrimoire)) baseCost *= 2;
            // Curse: SkillCostUp
            if (_run.Curses.Exists(c => c.Effect == CurseEffectType.SkillCostUp)) baseCost++;
            return Mathf.Max(0, baseCost - discount);
        }

        public bool TryEchoSkill()
        {
            if (_echoUsed || !HasEffect(RelicEffectType.EchoSkill)) return false;
            _echoUsed = true;
            return true;
        }

        public bool TryNegateSkillCost()
        {
            float chance = SumEffect(RelicEffectType.NegateSkillCost);
            return chance > 0f && Random.value < chance;
        }

        // ── Gold Modifiers ─────────────────────────────────────────────────
        public int ModifyGoldDrop(int baseGold)
        {
            float mult = 1f + SumEffect(RelicEffectType.GoldDropUp) / 100f;
            if (HasEffect(RelicEffectType.PhilosophersStone)) mult *= 2f;
            if (_run.Curses.Exists(c => c.Effect == CurseEffectType.GoldReduced)) mult *= 0.5f;

            // CompoundInterest: +1% per 100G held (max +10%)
            if (HasEffect(RelicEffectType.CompoundInterest))
                mult += Mathf.Min(0.10f, (_run.Gold / 100) * 0.01f);

            return Mathf.RoundToInt(baseGold * mult);
        }

        public int ModifyShopPrice(int basePrice)
        {
            float discount = SumEffect(RelicEffectType.ShopDiscount) / 100f;
            return Mathf.RoundToInt(basePrice * (1f - discount));
        }

        // ── Loot Modifiers ─────────────────────────────────────────────────
        public int GetLootChoiceCount()
        {
            int count = 3;
            count += (int)SumEffect(RelicEffectType.ExtraLootChoice);
            count += (int)SumEffect(RelicEffectType.LuckUp) / 3;  // every 3 LUCK = +1 choice
            return Mathf.Max(2, count);
        }

        // Returns relic-based luck bonus only (for battle crits / dodge; exploration uses RunData.Sanity)
        public int GetLuck() => (int)SumEffect(RelicEffectType.LuckUp);

        // ── Heal Modifiers ─────────────────────────────────────────────────
        public int ModifyHealAmount(int baseHeal)
        {
            float mult = 1f;
            mult += SumEffect(RelicEffectType.RestEfficiencyUp) / 100f;

            // HealingFactor: +25%
            mult += SumEffect(RelicEffectType.HealingFactor) / 100f;

            if (_run.Curses.Exists(c => c.Effect == CurseEffectType.WeakenedHeal)) mult *= 0.5f;
            return Mathf.RoundToInt(baseHeal * mult);
        }

        // ── New Query Methods ──────────────────────────────────────────────

        /// <summary>Returns true to trigger a shadow strike (extra hit).</summary>
        public bool TryShadowStrike() =>
            HasEffect(RelicEffectType.ShadowStrike) && Random.value < 0.25f;

        /// <summary>Returns true if the target should be instantly killed (ExecuteOnBreak).</summary>
        public bool TryExecuteOnBreak(BattleCharacter target) =>
            HasEffect(RelicEffectType.ExecuteOnBreak)
            && target.IsBroken && target.HPRatio <= 0.20f;

        /// <summary>Additional crit rate bonus from CritChain (cleared after use).</summary>
        public float GetBonusCritRate()
        {
            if (!_critChainActive || !HasEffect(RelicEffectType.CritChain)) return 0f;
            _critChainActive = false;
            return SumEffect(RelicEffectType.CritChain) / 100f;
        }

        /// <summary>Call after landing a critical hit to arm CritChain.</summary>
        public void NotifyCriticalHit()
        {
            if (HasEffect(RelicEffectType.CritChain)) _critChainActive = true;
        }

        /// <summary>Returns player evasion bonus (0–1 fraction).</summary>
        public float GetEvasionBonus() => SumEffect(RelicEffectType.EvasionUp) / 100f;

        /// <summary>BP cost modifier for Boost action.</summary>
        public int ModifyBoostBPCost(int baseCost) =>
            HasEffect(RelicEffectType.EfficientBoost)
                ? Mathf.Max(1, baseCost - 1) : baseCost;

        /// <summary>Call when a Boost is used. Arms BoostSurge and records level for BoostDamageMultiplier.</summary>
        public void NotifyBoostUsed(int boostLevel = 0)
        {
            _lastBoostLevel = boostLevel;
            if (HasEffect(RelicEffectType.BoostSurge)) _boostSurgeActive = true;
        }

        /// <summary>Returns SkillCopy flag and resets it (one use per battle).</summary>
        public bool TrySkillCopy()
        {
            if (!_skillCopyAvailable || !HasEffect(RelicEffectType.SkillCopy)) return false;
            _skillCopyAvailable = false;
            return true;
        }

        /// <summary>True if the first skill of this battle should be free (JumpStart).</summary>
        public bool TryJumpStartFree()
        {
            if (!_jumpStartAvailable || !HasEffect(RelicEffectType.JumpStart)) return false;
            _jumpStartAvailable = false;
            return true;
        }

        /// <summary>Mana overflow damage bonus (0.20 if ManaOverflow relic held and hero MP is full).</summary>
        public float GetManaOverflowBonus() =>
            HasEffect(RelicEffectType.ManaOverflow) ? 0.20f : 0f;

        /// <summary>
        /// Call when a skill is executed. Updates BattleRhythm, ChainBonus, CorruptedCore.
        /// Returns BattleRhythm damage multiplier bonus (add to 1f as a factor).
        /// </summary>
        public float NotifySkillUsed(string skillId, BattleCharacter hero)
        {
            float bonus = 1f;

            // BattleRhythm: same skill streak → +50%
            if (HasEffect(RelicEffectType.BattleRhythm))
            {
                if (!string.IsNullOrEmpty(skillId) && skillId == _battleRhythmLastSkillId)
                {
                    _battleRhythmStreak++;
                    if (_battleRhythmStreak >= 1) bonus += 0.50f;
                }
                else
                {
                    _battleRhythmStreak = 0;
                }
                _battleRhythmLastSkillId = skillId;
            }

            // ChainBonus: 3rd consecutive turn with a skill → arm chain bonus for next skill
            _chainSkillTurnCount++;
            if (_chainSkillTurnCount >= 3 && HasEffect(RelicEffectType.ChainBonus))
                _chainBonusActive = true;

            // CorruptedCore: HP-5 per skill use
            if (HasEffect(RelicEffectType.CorruptedCore) && hero != null)
            {
                hero.TakeDamage(5, DamageType.True);
                _run.TakeDamage(5);
            }

            return bonus;
        }

        /// <summary>Whether AoEShieldDamage relic is active (BattleManager checks for AoE skills).</summary>
        public bool HasAoEShieldDamage() => HasEffect(RelicEffectType.AoEShieldDamage);

        /// <summary>Whether EliteHunter relic is active (gold doubled for elite battles).</summary>
        public bool HasEliteHunter() => HasEffect(RelicEffectType.EliteHunter);

        /// <summary>Whether TreasureNose relic is active (relic rarity bumped in treasure rooms).</summary>
        public bool HasTreasureNose() => HasEffect(RelicEffectType.TreasureNose);

        /// <summary>Gold bonus on event completion (EventMaster: +20G).</summary>
        public int GetEventMasterBonus() =>
            HasEffect(RelicEffectType.EventMaster) ? 20 : 0;

        /// <summary>Whether BlackMarket is active (shop adds a cursed relic).</summary>
        public bool HasBlackMarket() => HasEffect(RelicEffectType.BlackMarket);

        /// <summary>CorruptedCore skill damage bonus (+50%) — also applied inline in ModifyOutgoingDamage.</summary>
        public float GetCorruptedCoreBonus() =>
            HasEffect(RelicEffectType.CorruptedCore) ? 0.50f : 0f;

        /// <summary>MirrorCurse MaxHP reduction factor (10% per curse). Applied in RoguelikeManager.BuildCurrentHeroStats.</summary>
        public float GetMirrorCurseHPPenalty() =>
            HasEffect(RelicEffectType.MirrorCurse) ? _run.Curses.Count * 0.10f : 0f;

        // ── Previously-missing effect handlers ────────────────────────────

        /// <summary>Extra crit rate from CritRateUp relics. Add to GetEffectiveCritRate in BattleManager.</summary>
        public int GetCritRateBonus() => (int)SumEffect(RelicEffectType.CritRateUp);

        /// <summary>Extra crit damage multiplier from CritDamageUp relics. Add to GetCritMultiplier in BattleManager.</summary>
        public float GetCritDamageBonus() => SumEffect(RelicEffectType.CritDamageUp) / 100f;

        /// <summary>True if ExtraHitOnCrit relic triggers an extra hit (40% chance per crit).</summary>
        public bool TryExtraHitOnCrit() =>
            HasEffect(RelicEffectType.ExtraHitOnCrit) && Random.value < 0.40f;

        /// <summary>True if ExecuteLowHP relic should instantly defeat this enemy (HP ≤ 10%).</summary>
        public bool TryExecuteLowHP(BattleCharacter target) =>
            !target.IsPlayer && HasEffect(RelicEffectType.ExecuteLowHP) && target.HPRatio <= 0.10f;

        /// <summary>Additional damage multiplier per hit index for MultiHitBonus relic (non-first hits).</summary>
        public float GetMultiHitBonus(int hitIndex) =>
            hitIndex > 0 && HasEffect(RelicEffectType.MultiHitBonus)
            ? SumEffect(RelicEffectType.MultiHitBonus) / 100f : 0f;

        /// <summary>Extra BP gained per BP-gain event (BPGainUp relic).</summary>
        public int GetBPGainBonus() => (int)SumEffect(RelicEffectType.BPGainUp);

        /// <summary>True if BoostFree relic grants a free boost this battle (one-time).</summary>
        public bool TryFreeBoost()
        {
            if (_freeBoostUsed || !HasEffect(RelicEffectType.BoostFree)) return false;
            _freeBoostUsed = true;
            return true;
        }

        /// <summary>True if the target's status type should be blocked by StatusImmunity relic.
        /// The relic's PrimaryValue encodes the immune StatusEffectType as an int.</summary>
        public bool IsImmuneToStatus(StatusEffectType type)
        {
            if (_run == null) return false;
            return _run.Relics.Exists(r =>
                r.PrimaryEffect == RelicEffectType.StatusImmunity &&
                (int)type == Mathf.RoundToInt(r.PrimaryValue));
        }

        /// <summary>True if WeaknessReveal relic reveals all enemy weaknesses at battle start.</summary>
        public bool HasWeaknessReveal() => HasEffect(RelicEffectType.WeaknessReveal);

        /// <summary>HP damage to reflect back to the attacker when a player hero is hit (ThornsReflect).</summary>
        public int GetThornsReflectDamage(int dealtToHero) =>
            HasEffect(RelicEffectType.ThornsReflect)
            ? Mathf.Max(1, Mathf.RoundToInt(dealtToHero * SumEffect(RelicEffectType.ThornsReflect) / 100f))
            : 0;

        /// <summary>Flat evasion bonus from LuckyDodge relic (0–0.09 fraction).</summary>
        public float GetLuckyDodgeBonus() =>
            HasEffect(RelicEffectType.LuckyDodge)
            ? Mathf.Clamp(GetLuck(), 0, 30) * 0.003f : 0f;

        /// <summary>True if MiracleChance relic triggers a rare loot event (2% per check).</summary>
        public bool ShouldTriggerMiracleChance() =>
            HasEffect(RelicEffectType.MiracleChance) && Random.value < 0.02f;

        /// <summary>Extra loot choices for elite battles (EliteReward).</summary>
        public int GetEliteRewardBonus() => HasEffect(RelicEffectType.EliteReward) ? 1 : 0;

        /// <summary>Applies LuckyGold multiplier to event-sourced gold rewards.</summary>
        public int ModifyEventGold(int gold) =>
            HasEffect(RelicEffectType.LuckyGold) ? Mathf.RoundToInt(gold * 1.5f) : gold;

        /// <summary>MaxHP bonus from GoldToHP relic (+1 MaxHP per 50G held). Applied in BuildCurrentHeroStats.</summary>
        public int GetGoldToHPBonus() =>
            _run != null && HasEffect(RelicEffectType.GoldToHP) ? _run.Gold / 50 : 0;

        /// <summary>Stat multiplier from AncientCurse relic (+30% offensive/defensive stats). Applied in BuildCurrentHeroStats.</summary>
        public float GetAncientCurseStatMultiplier() =>
            HasEffect(RelicEffectType.AncientCurse) ? 0.30f : 0f;

        /// <summary>Gold reward multiplier for curse-room events (RiskRewardMaster: ×2).</summary>
        public float GetRiskRewardMultiplier() =>
            HasEffect(RelicEffectType.RiskRewardMaster) ? 2.0f : 1.0f;

        /// <summary>True if ShortcutKey relic is available to skip one map node.</summary>
        public bool HasShortcutKey() => !_shortcutKeyUsed && HasEffect(RelicEffectType.ShortcutKey);

        /// <summary>Consume the ShortcutKey relic's one-time skip.</summary>
        public void UseShortcutKey() => _shortcutKeyUsed = true;

        /// <summary>Call when a floor is cleared to accumulate ShieldPerFloor barrier HP.</summary>
        public void NotifyFloorCleared()
        {
            float pct = SumEffect(RelicEffectType.ShieldPerFloor);
            if (pct > 0f && _run != null)
                _shieldPerFloorBarrier += _run.MaxHP * pct;
        }

        /// <summary>True if DuplicateRelic relic should copy a random existing relic on new relic pickup.</summary>
        public bool HasDuplicateRelic() => HasEffect(RelicEffectType.DuplicateRelic);

        // ── Query Helpers ──────────────────────────────────────────────────
        bool HasEffect(RelicEffectType effect) =>
            _run != null && _run.HasRelic(effect);

        public float SumEffectPublic(RelicEffectType effect) => SumEffect(effect);

        float SumEffect(RelicEffectType effect)
        {
            if (_run == null) return 0f;
            return _run.Relics
                .Where(r => r.PrimaryEffect == effect).Sum(r => r.PrimaryValue)
                + _run.Relics
                .Where(r => r.HasSecondaryEffect && r.SecondaryEffect == effect)
                .Sum(r => r.SecondaryValue);
        }

        float GetElementBonus(ElementType element) => element switch
        {
            ElementType.Fire      => SumEffect(RelicEffectType.FireDamageUp),
            ElementType.Ice       => SumEffect(RelicEffectType.IceDamageUp),
            ElementType.Lightning => SumEffect(RelicEffectType.LightningDamageUp),
            ElementType.Dark      => SumEffect(RelicEffectType.DarkDamageUp),
            ElementType.Light     => SumEffect(RelicEffectType.LightDamageUp),
            ElementType.Poison    => SumEffect(RelicEffectType.PoisonDamageUp),
            ElementType.Bleed     => SumEffect(RelicEffectType.BleedDamageUp),
            _                     => 0f
        };
    }
}
