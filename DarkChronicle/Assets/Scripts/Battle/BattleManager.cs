using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.HD2D;
using DarkChronicle.UI;
using DarkChronicle.Character.Traits;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// Octopath-style ATB battle controller.
    /// Integrates BoostUpgrade, CharacterTrait hooks, Elemental Resonance,
    /// Shadow State, Grimoire, Auto Compassion, Death Sentence, Causal Chain.
    /// </summary>
    public sealed class BattleManager : MonoBehaviour
    {
        public static BattleManager Instance { get; private set; }

        // ── Events ─────────────────────────────────────────────────────────
        public static event System.Action<BattleCharacter>      OnTurnStart;
        public static event System.Action<BattleCharacter, int> OnDamageDealt;
        public static event System.Action<BattleCharacter>      OnCharacterBroken;
        public static event System.Action<BattleCharacter>      OnCharacterDefeated;
        public static event System.Action<BattleResult>         OnBattleEnd;

        // ── Phase ──────────────────────────────────────────────────────────
        public enum Phase { Inactive, Intro, PlayerTurn, EnemyTurn, Resolution, Outro }
        public Phase CurrentPhase { get; private set; } = Phase.Inactive;

        // ── Combatants ─────────────────────────────────────────────────────
        List<BattleCharacter> _heroes       = new();
        List<BattleCharacter> _enemies      = new();
        List<BattleCharacter> _allCombatants = new();
        BattleCharacter       _activeCharacter;
        bool                  _awaitingPlayerInput;

        /// <summary>EnemyData list from the last victorious battle. Used by RoguelikeManager to compute EXP/JP rewards.</summary>
        public List<EnemyData> VictoryEnemyData { get; private set; } = new();

        // ── Special mechanics state ────────────────────────────────────────
        // Death Sentence: target → turns remaining until execution
        readonly Dictionary<BattleCharacter, int> _deathSentenceTimers = new();
        // Causal Chain: A ↔ B linked pairs with propagation percent
        readonly List<(BattleCharacter A, BattleCharacter B, float Pct)> _causalChainLinks = new();

        // ── Inspector refs ─────────────────────────────────────────────────
        [Header("References")]
        [SerializeField] BattleUI    _battleUI;
        [SerializeField] HD2DCamera  _camera;
        [SerializeField] Transform[] _heroPositions;
        [SerializeField] Transform[] _enemyPositions;

        [Header("Timing")]
        [SerializeField] float _actionDelay   = 0.6f;
        [SerializeField] float _introDuration = 1.8f;
        [SerializeField] float _gaugeTickRate = 10f;

        void Awake() => Instance = this;

        // ── Public API ─────────────────────────────────────────────────────
        public void StartBattle(List<CharacterData>  heroDataList,
                                List<CharacterStats> heroStats,
                                List<EnemyData>      enemyDataList)
        {
            _heroes.Clear();
            _enemies.Clear();
            _deathSentenceTimers.Clear();
            _causalChainLinks.Clear();

            for (int i = 0; i < heroDataList.Count; i++)
                _heroes.Add(new BattleCharacter(heroDataList[i], heroStats[i]));
            foreach (var ed in enemyDataList)
                _enemies.Add(new BattleCharacter(ed));

            _allCombatants = _heroes.Concat(_enemies).ToList();

            // Initialise traits and resonance systems
            var heroArray = _heroes.ToArray();
            foreach (var h in _heroes)
            {
                h.Traits.OnBattleStart(heroArray);
                h.ResonanceSystem.OnBattleStart();
            }

            // Relic initialisation
            RelicManager.Instance?.OnBattleStart(_heroes, _enemies);

            // Stagger initial gauges
            foreach (var c in _allCombatants)
                c.TurnGauge = Random.Range(0f, 50f);

            AtmosphereManager.Instance?.EnterBattle();
            StartCoroutine(BattleLoop());
        }

        // ── Core Battle Loop ───────────────────────────────────────────────
        IEnumerator BattleLoop()
        {
            yield return StartCoroutine(BattleIntro());

            while (true)
            {
                // Advance ATB gauges
                while (!_allCombatants.Any(c => c.IsAlive && c.TurnGauge >= 100f))
                {
                    foreach (var c in _allCombatants.Where(c => c.IsAlive))
                        c.AdvanceTurnGauge(_gaugeTickRate * Time.deltaTime);
                    _battleUI.UpdateTurnOrder(GetTurnOrder());
                    yield return null;
                }

                // Pick fastest ready combatant
                _activeCharacter = _allCombatants
                    .Where(c => c.IsAlive && c.TurnGauge >= 100f)
                    .OrderByDescending(c => c.TurnGauge)
                    .ThenByDescending(c => c.Speed)
                    .First();

                _activeCharacter.ResetTurnGauge();
                OnTurnStart?.Invoke(_activeCharacter);
                _battleUI.HighlightActive(_activeCharacter);

                // Trait turn-start hooks
                _activeCharacter.Traits.OnTurnStart();

                // Tick and fire Death Sentence timers
                yield return HandleDeathSentenceTick();

                // Tick status effects (DoT / HoT)
                _activeCharacter.TickStatusEffects(out int dot, out int hot);
                if (dot > 0) _battleUI.ShowDamageNumber(_activeCharacter, dot, false);
                if (hot > 0) _battleUI.ShowHealNumber(_activeCharacter, hot);

                if (_activeCharacter.IsAlive)
                {
                    _activeCharacter.TickBreak();

                    bool stunned = _activeCharacter.HasStatus(StatusEffectType.Sleep)
                                || _activeCharacter.HasStatus(StatusEffectType.Paralysis);
                    if (stunned)
                    {
                        _battleUI.ShowMessage($"{_activeCharacter.DisplayName} は行動できない！");
                    }
                    else if (_activeCharacter.IsPlayer)
                    {
                        yield return PlayerTurn(_activeCharacter);
                    }
                    else
                    {
                        yield return EnemyTurn(_activeCharacter);
                    }
                }
                else
                {
                    yield return HandleDefeat(_activeCharacter);
                }

                // Resonance decay (Lavinia's resonance ages each of her own turns)
                if (_activeCharacter.IsPlayer
                 && _activeCharacter.Traits.GetTrait<Trait_ArcaneMastery>() != null)
                    _activeCharacter.ResonanceSystem.OnTurnEnd();

                // Lilia Auto Compassion after every action
                yield return TryLiliaAutoCompassion();

                _activeCharacter.ResetBoost();

                // Win / lose checks
                if (_enemies.All(e => !e.IsAlive)) { yield return BattleVictory(); yield break; }
                if (_heroes.All(h => !h.IsAlive))  { yield return BattleDefeat();  yield break; }

                // Heroes gain BP on enemy turns
                if (!_activeCharacter.IsPlayer)
                    foreach (var h in _heroes.Where(h => h.IsAlive)) h.AddBP(1);

                yield return new WaitForSeconds(_actionDelay);
            }
        }

        // ── Player Turn ────────────────────────────────────────────────────
        IEnumerator PlayerTurn(BattleCharacter hero)
        {
            CurrentPhase = Phase.PlayerTurn;
            _awaitingPlayerInput = true;
            _battleUI.ShowPlayerCommandMenu(hero);
            while (_awaitingPlayerInput) yield return null;
        }

        // ── Enemy Turn ─────────────────────────────────────────────────────
        IEnumerator EnemyTurn(BattleCharacter enemy)
        {
            CurrentPhase = Phase.EnemyTurn;
            yield return new WaitForSeconds(0.3f);

            var validActions = enemy.EnemyData.Actions
                .Where(a => a.UseChance >= Random.value
                         && (a.HealthThreshold == 0 || enemy.HPRatio * 100f <= a.HealthThreshold))
                .OrderByDescending(a => a.Priority)
                .ToList();

            EnemyAction chosen = validActions.Count > 0
                ? validActions[0]
                : (enemy.EnemyData.Actions?.Count > 0 ? enemy.EnemyData.Actions[0] : null);

            if (chosen.Skill == null) yield break;

            var randomHero = GetRandomLivingHero();
            if (randomHero == null) yield break;

            var targets = chosen.Skill.HitsAllAllies
                ? _heroes.Where(h => h.IsAlive).ToList()
                : new List<BattleCharacter> { randomHero };

            yield return ExecuteSkill(enemy, chosen.Skill, targets);
        }

        // ── Player Command Input (called from UI) ──────────────────────────
        public void PlayerCommandSelected(BattleCommand command)
        {
            if (!_awaitingPlayerInput) return;
            _awaitingPlayerInput = false;
            StartCoroutine(ExecutePlayerCommand(command));
        }

        IEnumerator ExecutePlayerCommand(BattleCommand command)
        {
            switch (command.Type)
            {
                case CommandType.Attack:
                    yield return ExecuteBasicAttack(_activeCharacter, command.Targets, command.BoostLevel);
                    break;
                case CommandType.Skill:
                    yield return ExecuteSkill(_activeCharacter, command.Skill, command.Targets, command.BoostLevel);
                    break;
                case CommandType.GrimoireSkill:
                    yield return ExecuteGrimoireSkill(_activeCharacter, command.GrimoireSkill, command.Targets);
                    break;
                case CommandType.Item:
                    yield return ExecuteItem(_activeCharacter, command.Item, command.Targets);
                    break;
                case CommandType.Flee:
                    yield return AttemptFlee();
                    break;
            }
        }

        // ── Basic Attack ───────────────────────────────────────────────────
        IEnumerator ExecuteBasicAttack(BattleCharacter attacker, List<BattleCharacter> targets, int boostLevel = 0)
        {
            int hitCount = 1 + boostLevel;
            for (int hit = 0; hit < hitCount; hit++)
            {
                foreach (var target in targets.Where(t => t.IsAlive))
                {
                    if (TryEvade(attacker, target)) { _battleUI.ShowMessage($"{target.DisplayName} 回避！"); continue; }

                    bool isCrit;
                    int raw = ComputeRawDamage(attacker, target, 1f, DamageType.Physical, ElementType.None,
                                               BoostUpgrade.None, hit == hitCount - 1, out isCrit);
                    yield return ApplyDamageToTarget(attacker, target, raw, DamageType.Physical, ElementType.None, 0f, isCrit);
                    TryBreakShield(attacker, target, attacker.CharData?.StarterJob?.AllowedWeapons?.FirstOrDefault() ?? WeaponType.Sword);
                }
                yield return new WaitForSeconds(0.1f);
            }
        }

        // ── Skill Execution ────────────────────────────────────────────────
        IEnumerator ExecuteSkill(BattleCharacter user, SkillData skill, List<BattleCharacter> targets, int boostLevel = 0)
        {
            if (skill == null) yield break;

            var upgrade = BoostSkillResolver.GetUpgrade(skill, boostLevel);

            // Resolve final targets (BoostUpgrade may expand scope)
            List<BattleCharacter> finalTargets = ResolveTargets(skill, upgrade, targets);

            // MP cost with trait / relic modifiers
            int mpCost = skill.MPCost;
            if (RelicManager.Instance != null)
                mpCost = RelicManager.Instance.ModifySkillMPCost(mpCost);
            var darkWill = user.Traits.GetTrait<Trait_DarkWill>();
            if (darkWill != null) mpCost = darkWill.ModifyMPCost(user, mpCost);

            bool freeCast = RelicManager.Instance != null && RelicManager.Instance.TryNegateSkillCost();
            if (!freeCast && !user.UseMana(mpCost))
            {
                _battleUI.ShowMessage("MPが足りない！");
                yield break;
            }

            _battleUI.ShowSkillName(skill.SkillName);
            yield return new WaitForSeconds(0.4f);

            // ── Converge (Lavinia element convergence) ─────────────────────
            if (skill.IsConverge)
            {
                yield return ExecuteConverge(user, finalTargets, boostLevel);
                yield return ApplyPostSkillEffects(user, skill, upgrade, targets);
                yield break;
            }

            // ── Revive ─────────────────────────────────────────────────────
            if (skill.IsRevive)
            {
                yield return ExecuteRevive(user, skill, finalTargets, upgrade);
                yield return ApplyPostSkillEffects(user, skill, upgrade, targets);
                yield break;
            }

            // Pre-compute resonance bonus (magic skills — only Lavinia has ArcaneMastery)
            float resonanceMult = 1f;
            if (skill.DamageType == DamageType.Magical && skill.Element != ElementType.None
             && user.Traits.GetTrait<Trait_ArcaneMastery>() != null)
            {
                var res = user.ResonanceSystem.EvaluateAndRecord(skill.Element, user);
                resonanceMult = res.BonusMultiplier;
                if (res.IsResonanceTrigger && res.ReactionName != null)
                    _battleUI.ShowMessage($"【{res.ReactionName}】！");
            }

            // Check shadow state once (consumed on first offensive hit)
            var shadowDance = user.Traits.GetTrait<Trait_ShadowDance>();
            bool shadowActive = shadowDance != null && shadowDance.IsInShadowState;

            int totalHits = skill.HitCount + upgrade.ExtraHits;
            for (int hit = 0; hit < totalHits; hit++)
            {
                bool isLastHit = hit == totalHits - 1;

                foreach (var target in finalTargets.Where(t => t.IsAlive))
                {
                    // ── Heal path ──────────────────────────────────────────
                    if (skill.IsHeal)
                    {
                        yield return ApplyHeal(user, target, skill, upgrade, boostLevel);
                        continue;
                    }

                    // ── Damage path ────────────────────────────────────────
                    if (TryEvade(user, target))
                    {
                        _battleUI.ShowMessage($"{target.DisplayName} 回避！");
                        var targetShadow = target.Traits.GetTrait<Trait_ShadowDance>();
                        targetShadow?.GrantShadowState();
                        continue;
                    }

                    // Consume shadow state on first hit
                    bool usedShadow = false;
                    if (shadowActive && hit == 0)
                    {
                        shadowDance.ConsumeShadowState();
                        usedShadow = true;
                    }

                    bool isCrit;
                    int raw = ComputeRawDamage(user, target,
                                               skill.BasePower, skill.DamageType, skill.Element,
                                               upgrade, isLastHit, out isCrit,
                                               resonanceMult, usedShadow);

                    // Instant kill on broken check
                    if (!target.IsPlayer && target.IsBroken && upgrade.InstantKillOnBrokenChance > 0f
                        && Random.value < upgrade.InstantKillOnBrokenChance)
                    {
                        raw = target.HP + 9999;
                        _battleUI.ShowMessage($"Break処刑！");
                    }

                    // Execute on low HP (Ash)
                    if (!target.IsPlayer && upgrade.ExecuteOnLowHPChance > 0f
                        && target.HPRatio <= upgrade.ExecuteHPThreshold
                        && Random.value < upgrade.ExecuteOnLowHPChance)
                    {
                        raw = target.HP + 9999;
                        _battleUI.ShowMessage($"処刑！");
                    }

                    yield return ApplyDamageToTarget(user, target, raw,
                                                     skill.DamageType, skill.Element,
                                                     upgrade.IgnoreDefensePercent, isCrit);

                    // Break shield damage
                    if (skill.CanBreak)
                    {
                        int shieldDmg = 1 + upgrade.ExtraShieldDamage;
                        if (RelicManager.Instance != null)
                            shieldDmg = RelicManager.Instance.GetBreakShieldDamage() + upgrade.ExtraShieldDamage;

                        // Undead gets double break (HolyGrace)
                        var holyGrace = user.Traits.GetTrait<Trait_HolyGrace>();
                        if (holyGrace != null && (target.EnemyData?.IsUndead ?? false))
                            shieldDmg *= holyGrace.GetBreakDamageMultiple(true);

                        TryBreakShieldElement(user, target, skill.Element, shieldDmg, upgrade.ForceBreakIfShielded);
                    }

                    // Status effect application
                    if (skill.AppliedStatus != null)
                    {
                        // Skip blind if target has RoguesCraft
                        bool blindImmune = target.Traits.GetTrait<Trait_RoguesCraft>()?.IsBlindImmune ?? false;
                        if (!(skill.AppliedStatus.Type == StatusEffectType.Blind && blindImmune))
                        {
                            float chance = skill.StatusChance + upgrade.ApplyStatusChanceBonus;
                            // CurseAmplifier bonus
                            var curseAmp = user.Traits.GetTrait<Trait_CurseAmplifier>();
                            if (curseAmp != null) chance = curseAmp.ModifyStatusChance(chance);

                            int durBonus = upgrade.ApplyStatusDurationBonus;
                            var pureHeart = user.Traits.GetTrait<Trait_PureheartHealer>();
                            if (skill.AppliedStatus.Type == StatusEffectType.Regen && pureHeart != null)
                                durBonus += Trait_PureheartHealer.RegenDurationBonus;

                            // CurseAmplifier debuff duration
                            if (curseAmp != null) durBonus += Trait_CurseAmplifier.DebuffDurationBonus;

                            ApplyStatusWithBonus(target, skill.AppliedStatus, chance, durBonus);
                        }
                    }

                    // ExtraHitOnCrit (Ash)
                    if (isCrit && upgrade.ExtraHitOnCrit && target.IsAlive)
                    {
                        bool extraCrit;
                        int extraRaw = ComputeRawDamage(user, target, skill.BasePower * 0.5f,
                                                         skill.DamageType, skill.Element,
                                                         BoostUpgrade.None, false, out extraCrit);
                        yield return ApplyDamageToTarget(user, target, extraRaw,
                                                         skill.DamageType, skill.Element, 0f, extraCrit);
                    }
                }

                yield return new WaitForSeconds(0.12f);
            }

            // ── Absorb skill (Zeno) ────────────────────────────────────────
            if (skill.IsAbsorb)
            {
                foreach (var target in finalTargets.Where(t => t.IsAlive))
                    yield return TryAbsorb(user, target, skill, upgrade);
            }

            // ── Death Sentence (Zeno) ──────────────────────────────────────
            if (skill.IsDeathSentence)
            {
                int delay = skill.DeathSentenceDelayTurns - upgrade.DelayReductionTurns;
                if (upgrade.DelayReductionTurns >= skill.DeathSentenceDelayTurns)
                {
                    // Boost×3 = immediate execution
                    foreach (var target in finalTargets.Where(t => t.IsAlive))
                        yield return ExecuteDeathSentenceEffect(target, skill.DeathSentenceBossDmgPct);
                }
                else
                {
                    foreach (var target in finalTargets.Where(t => t.IsAlive))
                    {
                        _deathSentenceTimers[target] = Mathf.Max(1, delay);
                        _battleUI.ShowMessage($"{target.DisplayName} に死の宣告（{Mathf.Max(1, delay)}ターン後）！");
                    }
                }
            }

            // ── Causal Chain (Zeno) ────────────────────────────────────────
            if (skill.IsCausalChain)
            {
                var livingEnemies = _enemies.Where(e => e.IsAlive).ToList();
                if (skill.ChainToAllEnemies || upgrade.HitsAllEnemies)
                {
                    // Link all living enemies in a ring
                    for (int i = 0; i < livingEnemies.Count; i++)
                    {
                        var a = livingEnemies[i];
                        var b = livingEnemies[(i + 1) % livingEnemies.Count];
                        if (a != b) _causalChainLinks.Add((a, b, skill.CausalChainDamagePct * 0.6f));
                    }
                    _battleUI.ShowMessage("全敵を因果連鎖で結んだ！");
                }
                else if (finalTargets.Count >= 1)
                {
                    var primary = finalTargets.First(t => t.IsAlive && !t.IsPlayer);
                    var others  = livingEnemies.Where(e => e != primary).ToList();
                    if (others.Count > 0)
                    {
                        var secondary = others[Random.Range(0, others.Count)];
                        _causalChainLinks.Add((primary, secondary, skill.CausalChainDamagePct));
                        _battleUI.ShowMessage($"{primary.DisplayName} と {secondary.DisplayName} が連結された！");
                    }
                }
            }

            // ── CurseChainAll: propagate debuffs to all enemies ────────────
            if (upgrade.CurseChainAll && skill.AppliedStatus != null)
            {
                foreach (var e in _enemies.Where(e => e.IsAlive && !finalTargets.Contains(e)))
                    ApplyStatusWithBonus(e, skill.AppliedStatus, skill.StatusChance * 0.5f, 0);
            }

            yield return ApplyPostSkillEffects(user, skill, upgrade, targets);
        }

        IEnumerator ApplyPostSkillEffects(BattleCharacter user, SkillData skill,
                                           BoostUpgrade upgrade, List<BattleCharacter> originalTargets = null)
        {
            // BP gain on use
            if (upgrade.GainBPOnUse > 0) user.AddBP(upgrade.GainBPOnUse);

            // Relic echo skill
            if (user.IsPlayer && skill != null && RelicManager.Instance != null
                && RelicManager.Instance.TryEchoSkill())
            {
                _battleUI.ShowMessage("エコー発動！");
                yield return new WaitForSeconds(0.3f);
                yield return ExecuteSkill(user, skill, originalTargets, 0);
            }

            // Shadow state grant (certain Ash skills)
            if (upgrade.GrantShadowState)
                user.Traits.GetTrait<Trait_ShadowDance>()?.GrantShadowState();
        }

        // ── Grimoire Skill Execution (Zeno) ────────────────────────────────
        IEnumerator ExecuteGrimoireSkill(BattleCharacter user, GrimoireEntry entry, List<BattleCharacter> targets)
        {
            if (entry == null) yield break;

            var grimoireMaster = user.Traits.GetTrait<Trait_GrimoireMaster>();
            int mpCost = grimoireMaster != null
                ? grimoireMaster.GetGrimoireMPCost(entry.OverrideMPCost)
                : entry.OverrideMPCost;

            var darkWill = user.Traits.GetTrait<Trait_DarkWill>();
            if (darkWill != null) mpCost = darkWill.ModifyMPCost(user, mpCost);

            if (!user.UseMana(mpCost)) { _battleUI.ShowMessage("MPが足りない！"); yield break; }

            _battleUI.ShowSkillName(entry.DisplayName);
            yield return new WaitForSeconds(0.4f);

            // Power scale through trait
            float powerScale = grimoireMaster != null
                ? grimoireMaster.GetAbsorbedSkillPowerScale()
                : GrimoireSystem.SkillPowerScale;

            foreach (var target in targets.Where(t => t.IsAlive))
            {
                if (TryEvade(user, target)) { _battleUI.ShowMessage($"{target.DisplayName} 回避！"); continue; }

                bool isCrit;
                int raw = ComputeRawDamage(user, target, entry.OverridePower * powerScale,
                                           entry.OverrideDmgType, entry.BaseSkill?.Element ?? ElementType.None,
                                           BoostUpgrade.None, true, out isCrit);

                yield return ApplyDamageToTarget(user, target, raw,
                                                 entry.OverrideDmgType, entry.BaseSkill?.Element ?? ElementType.None,
                                                 0f, isCrit);

                if (entry.BaseSkill?.CanBreak == true)
                    TryBreakShieldElement(user, target, entry.BaseSkill.Element);
                if (entry.BaseSkill?.AppliedStatus != null)
                    ApplyStatusWithBonus(target, entry.BaseSkill.AppliedStatus, entry.BaseSkill.StatusChance, 0);
            }
        }

        // ── Item Execution ─────────────────────────────────────────────────
        IEnumerator ExecuteItem(BattleCharacter user, ItemData item, List<BattleCharacter> targets)
        {
            foreach (var target in targets)
            {
                if (item.ReviveTarget && !target.IsAlive)
                {
                    target.Revive(item.ReviveHPPercent * 0.01f);
                    _battleUI.ShowMessage($"{target.DisplayName} が復活した！");
                }
                else if (target.IsAlive)
                {
                    if (item.HealHP > 0)
                    {
                        int h = target.Heal(item.HealHP);
                        _battleUI.ShowHealNumber(target, h);
                    }
                    if (item.HealMP > 0) target.RestoreMana(item.HealMP);
                    if (item.CureStatus != null) target.ClearAllStatus();
                }
            }
            yield return new WaitForSeconds(0.5f);
        }

        // ── Heal Application ───────────────────────────────────────────────
        IEnumerator ApplyHeal(BattleCharacter user, BattleCharacter target, SkillData skill,
                               BoostUpgrade upgrade, int boostLevel)
        {
            if (!target.IsAlive) yield break;

            float mult = upgrade.HealPowerMult * (1f + boostLevel * 0.4f);
            float rawHeal = user.Matk * skill.HealPower * mult * Random.Range(0.95f, 1.05f);

            // Trait_PureheartHealer bonus
            var pureHeart = user.Traits.GetTrait<Trait_PureheartHealer>();
            if (pureHeart != null) rawHeal = pureHeart.ModifyHealAmount(rawHeal);

            // Relic bonus
            int healAmt = RelicManager.Instance != null
                ? RelicManager.Instance.ModifyHealAmount(Mathf.RoundToInt(rawHeal))
                : Mathf.RoundToInt(rawHeal);

            int healed = target.Heal(healAmt);
            _battleUI.ShowHealNumber(target, healed);

            // HealRemovesAllStatus (Lilia Boost)
            if (upgrade.HealRemovesAllStatus) target.ClearAllStatus();

            // AlsoRevive: revive downed allies at low HP
            if (upgrade.AlsoRevive)
            {
                foreach (var ally in _heroes.Where(h => !h.IsAlive))
                {
                    ally.Revive(upgrade.AlsoReviveHPPercent);
                    _battleUI.ShowMessage($"{ally.DisplayName} が蘇生した！");
                }
            }

            yield break;
        }

        // ── Revive Execution ───────────────────────────────────────────────
        IEnumerator ExecuteRevive(BattleCharacter user, SkillData skill,
                                   List<BattleCharacter> targets, BoostUpgrade upgrade)
        {
            var toRevive = skill.ReviveAllAllies
                ? _heroes.Where(h => !h.IsAlive).ToList()
                : targets.Where(h => !h.IsAlive).ToList();

            foreach (var target in toRevive)
            {
                target.Revive(skill.ReviveHPPercent);
                _battleUI.ShowMessage($"{target.DisplayName} が復活した！");

                // Trait_PureheartHealer: self-heal after revive
                var pureHeart = user.Traits.GetTrait<Trait_PureheartHealer>();
                if (pureHeart != null)
                {
                    int selfHeal = pureHeart.GetPostReviveSelfHeal(user);
                    int healed = user.Heal(selfHeal);
                    if (healed > 0) _battleUI.ShowHealNumber(user, healed);
                }

                // Trait_MiracleHands: FullRevive grants regen (if ReviveHPPercent == 1)
                var miracleHands = user.Traits.GetTrait<Trait_MiracleHands>();
                if (miracleHands != null && skill.ReviveHPPercent >= 1f)
                {
                    var regenEffect = new StatusEffect
                    {
                        Type     = StatusEffectType.Regen,
                        Duration = miracleHands.GetFullReviveRegenTurns(),
                        Value    = 0.05f,
                    };
                    target.ApplyStatus(regenEffect, 1f);
                }
            }

            yield break;
        }

        // ── Converge (Lavinia) ─────────────────────────────────────────────
        IEnumerator ExecuteConverge(BattleCharacter user, List<BattleCharacter> targets, int boostLevel)
        {
            float powerMult = user.ResonanceSystem.EvaluateConverge(boostLevel >= 2);
            foreach (var target in targets.Where(t => t.IsAlive))
            {
                bool isCrit;
                int raw = ComputeRawDamage(user, target, powerMult, DamageType.Magical,
                                           ElementType.None, BoostUpgrade.None, true, out isCrit);
                if (RelicManager.Instance != null)
                    raw = RelicManager.Instance.ModifyIncomingDamage(target, raw);
                yield return ApplyDamageToTarget(user, target, raw, DamageType.Magical, ElementType.None, 0f, isCrit);
            }
            _battleUI.ShowMessage("元素収束！");
        }

        // ── Core Damage Calculation ────────────────────────────────────────
        int ComputeRawDamage(BattleCharacter attacker, BattleCharacter target,
                              float basePower, DamageType dmgType, ElementType element,
                              BoostUpgrade upgrade, bool isLastHit, out bool isCritOut,
                              float resonanceMult = 1f, bool shadowActiveThisHit = false)
        {
            isCritOut = false;

            float power = basePower * upgrade.PowerMult;

            // Trait OnBeforeAttack (shadow damage bonus is applied inside ShadowDance.OnBeforeAttack)
            power = attacker.Traits.ModifyOutgoingPower(target, power);

            // Shadow State crit
            bool isCrit = shadowActiveThisHit
                          || upgrade.GuaranteedCrit
                          || (isLastHit && upgrade.LastHitGuaranteedCrit)
                          || Random.Range(0, 100) < GetEffectiveCritRate(attacker, dmgType, upgrade);

            float critMult = 1f;
            if (isCrit)
            {
                critMult  = GetCritMultiplier(attacker, dmgType);
                isCritOut = true;
                attacker.Traits.GetTrait<Trait_EagleEye>()?.OnCriticalHit();
            }

            // Holy damage bonus (Lilia HolyGrace)
            if (element == ElementType.Light)
            {
                var holyGrace = attacker.Traits.GetTrait<Trait_HolyGrace>();
                if (holyGrace != null)
                {
                    power = holyGrace.ModifyHolyDamage(power);
                    if (target.EnemyData?.IsUndead ?? false)
                        power *= holyGrace.GetUndeadBonusMult(true);
                }
            }

            // Debuff stack bonus (Zeno CurseAmplifier)
            float curseBonus = 1f;
            if (!target.IsPlayer)
            {
                var curseAmp = attacker.Traits.GetTrait<Trait_CurseAmplifier>();
                if (curseAmp != null)
                    curseBonus += curseAmp.GetDebuffStackBonus(target.StatusEffects.Count);
            }

            // Dark Will debuff amplify (passed via DebuffAmplifyPercent or trait)
            float darkWillAmp = 0f;
            var darkWill = attacker.Traits.GetTrait<Trait_DarkWill>();
            if (darkWill != null) darkWillAmp = darkWill.GetDebuffAmplify(attacker);

            float atk = dmgType == DamageType.Physical ? attacker.Patk : attacker.Matk;

            // Element weakness multiplier
            float elemMult = IsElementWeak(target, element) ? 1.5f : 1f;
            if (dmgType == DamageType.Physical) elemMult = 1f;

            float rawDmg = atk * power * critMult * elemMult * resonanceMult * curseBonus
                           * (1f + darkWillAmp) * Random.Range(0.9f, 1.1f);

            int raw = Mathf.RoundToInt(rawDmg);

            if (RelicManager.Instance != null)
                raw = RelicManager.Instance.ModifyOutgoingDamage(attacker, target, raw, element);

            return Mathf.Max(1, raw);
        }

        float GetCritMultiplier(BattleCharacter attacker, DamageType dmgType)
        {
            bool isMagic = dmgType == DamageType.Magical;
            float mult   = isMagic ? 1.5f : 2.0f;

            var eagleEye = attacker.Traits.GetTrait<Trait_EagleEye>();
            if (eagleEye != null && !isMagic) mult += eagleEye.GetCritMultiplierBonus();

            var arcaneMastery = attacker.Traits.GetTrait<Trait_ArcaneMastery>();
            if (arcaneMastery != null && isMagic) mult += arcaneMastery.GetMagicCritMultiplierBonus();

            return mult;
        }

        int GetEffectiveCritRate(BattleCharacter attacker, DamageType dmgType, BoostUpgrade upgrade)
        {
            int rate = attacker.Crit + upgrade.CritRateBonus;

            var eagleEye = attacker.Traits.GetTrait<Trait_EagleEye>();
            if (eagleEye != null) rate += eagleEye.GetCritRateBonus(attacker.Luck);

            if (dmgType == DamageType.Magical)
            {
                var arcaneMastery = attacker.Traits.GetTrait<Trait_ArcaneMastery>();
                if (arcaneMastery != null) rate += arcaneMastery.GetMagicCritRateBonus(attacker.Matk);
            }

            return Mathf.Clamp(rate, 0, 100);
        }

        // ── Damage Application (shared path) ──────────────────────────────
        IEnumerator ApplyDamageToTarget(BattleCharacter attacker, BattleCharacter target,
                                         int rawDamage, DamageType type, ElementType element,
                                         float ignoreDefPct, bool isCrit)
        {
            if (!target.IsAlive) yield break;

            // Incoming modifiers (applied once for all damage sources)
            if (type != DamageType.True)
            {
                if (RelicManager.Instance != null)
                    rawDamage = RelicManager.Instance.ModifyIncomingDamage(target, rawDamage);
                rawDamage = target.Traits.ModifyIncomingDamage(rawDamage, type);
            }

            int dealt = target.TakeDamage(rawDamage, type, element, ignoreDefPct);

            // Trait after-take-damage hook
            target.Traits.AfterTakeDamage(dealt);

            // Fatal damage check (trait survival)
            if (!target.IsAlive && target.IsPlayer && target.Traits.TryBlockFatalDamage())
            {
                target.Heal(1);  // survives at 1 HP
                dealt = rawDamage - 1;
                _battleUI.ShowMessage($"{target.DisplayName} 踏みとどまった！");
            }

            // Relic revive check
            if (!target.IsAlive && target.IsPlayer)
            {
                if (RelicManager.Instance != null && RelicManager.Instance.TryRevive(target))
                    _battleUI.ShowMessage($"{target.DisplayName} が奇跡で復活！");
            }

            OnDamageDealt?.Invoke(target, dealt);
            _battleUI.ShowDamageNumber(target, dealt, isCrit);
            _camera?.Shake(isCrit ? 0.3f : 0.15f);

            // Causal chain propagation
            yield return PropagateChainDamage(target, dealt, type);

            yield return new WaitForSeconds(0.1f);

            if (!target.IsAlive) yield return HandleDefeat(target);
        }

        IEnumerator PropagateChainDamage(BattleCharacter source, int sourceDealt, DamageType type)
        {
            foreach (var link in _causalChainLinks.ToList())
            {
                BattleCharacter chainTarget = null;
                float           pct         = 0f;

                if (link.A == source) { chainTarget = link.B; pct = link.Pct; }
                else if (link.B == source) { chainTarget = link.A; pct = link.Pct; }

                if (chainTarget == null || !chainTarget.IsAlive) continue;

                int chainDmg = Mathf.Max(1, Mathf.RoundToInt(sourceDealt * pct));
                int chainDealt = chainTarget.TakeDamage(chainDmg, DamageType.True);
                OnDamageDealt?.Invoke(chainTarget, chainDealt);
                _battleUI.ShowDamageNumber(chainTarget, chainDealt, false);
                _battleUI.ShowMessage("因果連鎖！");

                if (!chainTarget.IsAlive) yield return HandleDefeat(chainTarget);
            }
        }

        // ── Evasion Check ──────────────────────────────────────────────────
        bool TryEvade(BattleCharacter attacker, BattleCharacter target)
        {
            if (!target.IsPlayer) return false;  // enemies don't evade by default

            float hitChance = Mathf.Clamp01(attacker.Accuracy / 100f);

            float dodge = 0f;
            var shadow = target.Traits.GetTrait<Trait_ShadowDance>();
            if (shadow != null) dodge += Trait_ShadowDance.DodgeRateBonus;

            if (target.HasStatus(StatusEffectType.Blind)) dodge -= 0.15f;
            if (attacker.HasStatus(StatusEffectType.Blind)) hitChance -= 0.25f;

            float finalHit = Mathf.Clamp01(hitChance - dodge);
            return Random.value > finalHit;
        }

        // ── Absorb (Zeno) ──────────────────────────────────────────────────
        IEnumerator TryAbsorb(BattleCharacter user, BattleCharacter target,
                               SkillData skill, BoostUpgrade upgrade)
        {
            if (target.IsPlayer || target.EnemyData == null) yield break;

            var grimoireMaster = user.Traits.GetTrait<Trait_GrimoireMaster>();
            if (grimoireMaster?.GrimoireSystem == null) yield break;

            var gs = grimoireMaster.GrimoireSystem;

            // HP cost of absorb (paid regardless of success)
            float hpCostPct = skill.AbsorbHPCostPercent * upgrade.AbsorbHPCostMult;
            if (hpCostPct > 0f)
            {
                int hpCost = grimoireMaster.GetAbsorbHPCost(user, hpCostPct);
                user.TakeDamage(hpCost, DamageType.True);
                _battleUI.ShowDamageNumber(user, hpCost, false);
            }

            // Absorb chance with DarkWill bonus
            var darkWill = user.Traits.GetTrait<Trait_DarkWill>();
            float extraChance = upgrade.AbsorbChanceBonus;
            if (darkWill != null) extraChance += darkWill.GetAbsorbBonus(user);

            float roll = Random.value;
            var entry = gs.TryAbsorb(target.EnemyData, user, target, roll, extraChance);

            if (entry != null)
            {
                _battleUI.ShowMessage($"【{entry.DisplayName}】を吸収した！");
                // Instant-kill the target after successful absorb
                target.TakeDamage(target.HP + 9999, DamageType.True);
                yield return HandleDefeat(target);
            }
            else
            {
                _battleUI.ShowMessage("吸収失敗...");
            }
        }

        // ── Death Sentence (Zeno) ──────────────────────────────────────────
        IEnumerator HandleDeathSentenceTick()
        {
            var toExecute = new List<(BattleCharacter Target, float BossPct)>();

            foreach (var kv in _deathSentenceTimers.ToList())
            {
                int newVal = kv.Value - 1;
                if (newVal <= 0)
                {
                    // We'll pick bossPct from the skill when it was set; store it as 0.5 default
                    toExecute.Add((kv.Key, 0.50f));
                    _deathSentenceTimers.Remove(kv.Key);
                }
                else
                {
                    _deathSentenceTimers[kv.Key] = newVal;
                }
            }

            foreach (var (tgt, bossPct) in toExecute)
                yield return ExecuteDeathSentenceEffect(tgt, bossPct);
        }

        IEnumerator ExecuteDeathSentenceEffect(BattleCharacter target, float bossDmgPct)
        {
            if (!target.IsAlive) yield break;

            bool isBoss = target.EnemyData?.Rank == EnemyRank.Boss
                       || target.EnemyData?.Rank == EnemyRank.TrueFinalBoss;
            if (isBoss)
            {
                int bossDmg = Mathf.Max(1, Mathf.RoundToInt(target.MaxHP * bossDmgPct));
                int dealt = target.TakeDamage(bossDmg, DamageType.True);
                OnDamageDealt?.Invoke(target, dealt);
                _battleUI.ShowDamageNumber(target, dealt, false);
                _battleUI.ShowMessage($"死の宣告発動！{target.DisplayName}に{dealt}ダメージ！");
            }
            else
            {
                _battleUI.ShowMessage($"死の宣告発動！{target.DisplayName} を消滅させた！");
                target.TakeDamage(target.HP + 9999, DamageType.True);
                yield return HandleDefeat(target);
            }
        }

        // ── Lilia Auto Compassion ──────────────────────────────────────────
        IEnumerator TryLiliaAutoCompassion()
        {
            foreach (var hero in _heroes.Where(h => h.IsAlive))
            {
                var miracleHands = hero.Traits.GetTrait<Trait_MiracleHands>();
                if (miracleHands == null) continue;

                // Find lowest HP living ally
                BattleCharacter lowest = null;
                foreach (var h in _heroes.Where(h => h.IsAlive))
                    if (lowest == null || h.HPRatio < lowest.HPRatio) lowest = h;

                if (lowest == null || !miracleHands.ShouldAutoHeal(lowest)) continue;

                int healAmt = miracleHands.ComputeAutoHeal(hero);

                var pureHeart = hero.Traits.GetTrait<Trait_PureheartHealer>();
                if (pureHeart != null)
                    healAmt = Mathf.RoundToInt(pureHeart.ModifyHealAmount(healAmt));

                if (RelicManager.Instance != null)
                    healAmt = RelicManager.Instance.ModifyHealAmount(healAmt);

                int healed = lowest.Heal(healAmt);
                if (healed > 0) _battleUI.ShowHealNumber(lowest, healed);
            }
            yield break;
        }

        // ── Break Helpers ──────────────────────────────────────────────────
        void TryBreakShield(BattleCharacter attacker, BattleCharacter target, WeaponType weapon)
        {
            if (target.IsPlayer) return;
            if (target.EnemyData.WeaponWeaknesses.Contains(weapon))
                if (target.HitShield()) OnBreak(target);
        }

        void TryBreakShieldElement(BattleCharacter attacker, BattleCharacter target,
                                    ElementType element, int shieldDamage = 1,
                                    bool forceBreak = false)
        {
            if (target.IsPlayer) return;
            if (forceBreak)
            {
                if (target.HitShield(target.CurrentShields)) OnBreak(target);
                return;
            }
            if (target.EnemyData.ElementWeaknesses.Contains(element))
                if (target.HitShield(shieldDamage)) OnBreak(target);
        }

        void OnBreak(BattleCharacter target)
        {
            OnCharacterBroken?.Invoke(target);
            _battleUI.ShowMessage($"{target.DisplayName} が崩れた！");
            _camera?.Shake(0.4f);
        }

        // ── Status Helpers ─────────────────────────────────────────────────
        void ApplyStatusWithBonus(BattleCharacter target, StatusEffect effect, float chance, int durationBonus)
        {
            if (Random.value > chance) return;
            var active = new ActiveStatusEffect(effect);
            active.RemainingTurns += durationBonus;
            target.StatusEffects.RemoveAll(s => s.Type == active.Type);
            target.StatusEffects.Add(active);
        }

        // ── Target Resolution ──────────────────────────────────────────────
        List<BattleCharacter> ResolveTargets(SkillData skill, BoostUpgrade upgrade,
                                              List<BattleCharacter> provided)
        {
            if (skill.HitsAllEnemies || upgrade.HitsAllEnemies)
                return _enemies.Where(e => e.IsAlive).ToList();
            if (skill.HitsAllAllies || upgrade.HitsAllAllies)
                return _heroes.Where(h => h.IsAlive).ToList();
            return provided ?? new List<BattleCharacter>();
        }

        // ── Utility ────────────────────────────────────────────────────────
        bool IsElementWeak(BattleCharacter target, ElementType element) =>
            target.EnemyData != null && element != ElementType.None
            && target.EnemyData.ElementWeaknesses.Contains(element);

        BattleCharacter GetRandomLivingHero() =>
            _heroes.Where(h => h.IsAlive).OrderBy(_ => Random.value).FirstOrDefault();

        List<BattleCharacter> GetTurnOrder() =>
            _allCombatants.Where(c => c.IsAlive)
                          .OrderByDescending(c => c.TurnGauge + c.Speed * 5f)
                          .ToList();

        IEnumerator HandleDefeat(BattleCharacter c)
        {
            // Remove from chain links
            _causalChainLinks.RemoveAll(l => l.A == c || l.B == c);
            _deathSentenceTimers.Remove(c);

            OnCharacterDefeated?.Invoke(c);
            _battleUI.ShowDefeatAnimation(c);
            yield return new WaitForSeconds(0.5f);
        }

        IEnumerator AttemptFlee()
        {
            float fleeChance = 0.6f + _heroes.Average(h => h.Speed) / 200f;
            if (Random.value < fleeChance)
            {
                _battleUI.ShowMessage("逃げ出した！");
                yield return new WaitForSeconds(1f);
                EndBattle(BattleResult.Fled);
            }
            else
            {
                _battleUI.ShowMessage("逃げられなかった！");
            }
        }

        // ── Intro / Outro ──────────────────────────────────────────────────
        IEnumerator BattleIntro()
        {
            CurrentPhase = Phase.Intro;
            _battleUI.PlayIntroAnimation();
            yield return new WaitForSeconds(_introDuration);
        }

        IEnumerator BattleVictory()
        {
            CurrentPhase = Phase.Outro;
            foreach (var h in _heroes) h.Traits.OnBattleEnd();

            // Capture defeated enemy data for EXP/JP computation
            VictoryEnemyData = _enemies
                .Where(e => e.EnemyData != null)
                .Select(e => e.EnemyData)
                .ToList();

            _battleUI.ShowVictoryScreen();
            yield return new WaitForSeconds(2f);
            AtmosphereManager.Instance?.ExitBattle();
            EndBattle(BattleResult.Victory);
        }

        IEnumerator BattleDefeat()
        {
            CurrentPhase = Phase.Outro;
            _battleUI.ShowDefeatScreen();
            yield return new WaitForSeconds(2f);
            EndBattle(BattleResult.Defeat);
        }

        void EndBattle(BattleResult result)
        {
            CurrentPhase = Phase.Inactive;
            OnBattleEnd?.Invoke(result);
        }
    }

    // ── Command Data ───────────────────────────────────────────────────────
    public class BattleCommand
    {
        public CommandType           Type;
        public SkillData             Skill;
        public GrimoireEntry         GrimoireSkill;
        public ItemData              Item;
        public List<BattleCharacter> Targets;
        public int                   BoostLevel;  // 0-3
    }

    public enum CommandType  { Attack, Skill, GrimoireSkill, Item, Flee }
    public enum BattleResult { Victory, Defeat, Fled }
}
