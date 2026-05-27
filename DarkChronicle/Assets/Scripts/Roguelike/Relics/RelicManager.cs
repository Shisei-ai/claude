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

        // ── Per-battle state ───────────────────────────────────────────────
        bool _firstHitUsed;
        bool _firstHitImmuneUsed;
        bool _reviveUsed;
        bool _freeBoostUsed;
        bool _echoUsed;
        int  _soulSiphonCount;

        void Awake() => Instance = this;

        public void InitForRun(RunData run)
        {
            _run = run;
            BattleManager.OnTurnStart       += OnTurnStart;
            BattleManager.OnDamageDealt     += OnDamageDealt;
            BattleManager.OnCharacterDefeated += OnCharacterDefeated;
            BattleManager.OnBattleEnd       += OnBattleEnd;
        }

        void OnDestroy()
        {
            BattleManager.OnTurnStart       -= OnTurnStart;
            BattleManager.OnDamageDealt     -= OnDamageDealt;
            BattleManager.OnCharacterDefeated -= OnCharacterDefeated;
            BattleManager.OnBattleEnd       -= OnBattleEnd;
        }

        // ── Battle Start / Room Entry ──────────────────────────────────────
        public void OnBattleStart(List<BattleCharacter> heroes, List<BattleCharacter> enemies)
        {
            _firstHitUsed       = false;
            _firstHitImmuneUsed = false;
            _reviveUsed         = false;
            _freeBoostUsed      = false;
            _echoUsed           = false;

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
        }

        // ── Turn Start ─────────────────────────────────────────────────────
        void OnTurnStart(BattleCharacter character)
        {
            if (!character.IsPlayer) return;

            // RegenEachTurn
            float regenPct = SumEffect(RelicEffectType.RegenEachTurn);
            if (regenPct > 0f)
            {
                int regen = Mathf.Max(1, Mathf.RoundToInt(character.MaxHP * regenPct));
                character.Heal(regen);
                _run.HealHP(regen);
            }

            // MPRegenEachTurn
            int mpRegen = (int)SumEffect(RelicEffectType.MPRegenEachTurn);
            if (mpRegen > 0) character.RestoreMana(mpRegen);
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

            // Break damage
            if (target.IsBroken)
                multiplier += SumEffect(RelicEffectType.BonusDamageOnBreak) / 100f;

            // VampiricBlade: absorb 20% (heal applied in OnDamageDealt)
            // Handled there to keep modifier pure.

            return Mathf.Max(1, Mathf.RoundToInt(rawDamage * multiplier));
        }

        public int ModifyIncomingDamage(BattleCharacter target, int rawDamage)
        {
            float reduction = SumEffect(RelicEffectType.PercentDamageReduction) / 100f;
            rawDamage = Mathf.RoundToInt(rawDamage * (1f - reduction));
            rawDamage -= (int)SumEffect(RelicEffectType.FlatDefenseUp);

            // FirstHitImmune
            if (!_firstHitImmuneUsed && HasEffect(RelicEffectType.FirstHitImmune))
            {
                _firstHitImmuneUsed = true;
                return 0;
            }

            // AncientCurse: +5% HP lost per room (handled in room entry, not here)
            // DeathMark: +25% incoming
            if (HasEffect(RelicEffectType.DeathMark))
                rawDamage = Mathf.RoundToInt(rawDamage * 1.25f);

            // Curse: FragileHP
            if (_run.Curses.Exists(c => c.Effect == CurseEffectType.FragileHP))
                rawDamage = Mathf.RoundToInt(rawDamage * 1.10f);

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

            // OnKillBP: done via BattleManager event subscription

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
        }

        // ── Revive Check ───────────────────────────────────────────────────
        public bool TryRevive(BattleCharacter hero)
        {
            if (_reviveUsed || !HasEffect(RelicEffectType.ReviveOnce)) return false;
            _reviveUsed = true;
            hero.Revive(1);   // revive at 1 HP
            return true;
        }

        // ── Break Modifiers ────────────────────────────────────────────────
        public int GetBreakShieldDamage() =>
            HasEffect(RelicEffectType.ShieldHitBonus) ? 2 : 1;

        public int GetBreakExtendTurns() =>
            HasEffect(RelicEffectType.BreakExtend) ? 1 : 0;

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

        public int GetLuck() => _run.Luck + (int)SumEffect(RelicEffectType.LuckUp);

        // ── Heal Modifiers ─────────────────────────────────────────────────
        public int ModifyHealAmount(int baseHeal)
        {
            float mult = 1f;
            mult += SumEffect(RelicEffectType.RestEfficiencyUp) / 100f;
            if (_run.Curses.Exists(c => c.Effect == CurseEffectType.WeakenedHeal)) mult *= 0.5f;
            return Mathf.RoundToInt(baseHeal * mult);
        }

        // ── Query Helpers ──────────────────────────────────────────────────
        bool HasEffect(RelicEffectType effect) =>
            _run != null && _run.HasRelic(effect);

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
