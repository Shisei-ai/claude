using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.HD2D;
using DarkChronicle.UI;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// Central controller for Octopath-style turn-based battle.
    /// ATB gauge determines turn order; Break, Boost, and job skills are fully supported.
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

        // ── State ──────────────────────────────────────────────────────────
        public enum Phase { Inactive, Intro, PlayerTurn, EnemyTurn, Resolution, Outro }
        public Phase CurrentPhase { get; private set; } = Phase.Inactive;

        List<BattleCharacter> _heroes  = new();
        List<BattleCharacter> _enemies = new();
        List<BattleCharacter> _allCombatants = new();

        BattleCharacter _activeCharacter;
        bool            _awaitingPlayerInput;

        [Header("References")]
        [SerializeField] BattleUI       _battleUI;
        [SerializeField] HD2DCamera     _camera;
        [SerializeField] Transform[]    _heroPositions;
        [SerializeField] Transform[]    _enemyPositions;

        [Header("Timing")]
        [SerializeField] float _actionDelay    = 0.6f;
        [SerializeField] float _introDuration  = 1.8f;
        [SerializeField] float _gaugeTickRate  = 10f;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake() => Instance = this;

        // ── Public API ─────────────────────────────────────────────────────
        public void StartBattle(List<CharacterData> heroDataList,
                                List<CharacterStats> heroStats,
                                List<EnemyData> enemyDataList)
        {
            _heroes.Clear();
            _enemies.Clear();

            for (int i = 0; i < heroDataList.Count; i++)
                _heroes.Add(new BattleCharacter(heroDataList[i], heroStats[i]));

            foreach (var ed in enemyDataList)
                _enemies.Add(new BattleCharacter(ed));

            _allCombatants = _heroes.Concat(_enemies).ToList();

            // Stagger initial gauges by speed for variety
            foreach (var c in _allCombatants)
                c.TurnGauge = Random.Range(0f, 50f);

            AtmosphereManager.Instance?.EnterBattle();
            StartCoroutine(BattleLoop());
        }

        // ── Core Loop ──────────────────────────────────────────────────────
        IEnumerator BattleLoop()
        {
            yield return StartCoroutine(BattleIntro());

            while (true)
            {
                // Advance gauges until someone reaches 100
                while (!_allCombatants.Any(c => c.IsAlive && c.TurnGauge >= 100f))
                {
                    foreach (var c in _allCombatants.Where(c => c.IsAlive))
                        c.AdvanceTurnGauge(_gaugeTickRate * Time.deltaTime);
                    _battleUI.UpdateTurnOrder(GetTurnOrder());
                    yield return null;
                }

                // Pick the fastest ready combatant
                _activeCharacter = _allCombatants
                    .Where(c => c.IsAlive && c.TurnGauge >= 100f)
                    .OrderByDescending(c => c.TurnGauge)
                    .ThenByDescending(c => c.Speed)
                    .First();

                _activeCharacter.ResetTurnGauge();
                OnTurnStart?.Invoke(_activeCharacter);
                _battleUI.HighlightActive(_activeCharacter);

                // Status effects tick
                _activeCharacter.TickStatusEffects(out int dot, out int hot);
                if (dot > 0) _battleUI.ShowDamageNumber(_activeCharacter, dot, false);
                if (hot > 0) _battleUI.ShowHealNumber  (_activeCharacter, hot);
                if (!_activeCharacter.IsAlive) { yield return HandleDefeat(_activeCharacter); continue; }

                // Break recovery tick (enemies)
                _activeCharacter.TickBreak();

                if (_activeCharacter.IsPlayer)
                    yield return PlayerTurn(_activeCharacter);
                else
                    yield return EnemyTurn(_activeCharacter);

                _activeCharacter.ResetBoost();

                // Check win/lose
                if (_enemies.All(e => !e.IsAlive)) { yield return BattleVictory(); yield break; }
                if (_heroes.All(h => !h.IsAlive))  { yield return BattleDefeat();  yield break; }

                // Heroes gain 1 BP per ally turn that isn't theirs
                if (!_activeCharacter.IsPlayer)
                    foreach (var h in _heroes.Where(h => h.IsAlive)) h.AddBP(1);

                yield return new WaitForSeconds(_actionDelay);
            }
        }

        // ── Turn Handlers ──────────────────────────────────────────────────
        IEnumerator PlayerTurn(BattleCharacter hero)
        {
            CurrentPhase = Phase.PlayerTurn;
            _awaitingPlayerInput = true;
            _battleUI.ShowPlayerCommandMenu(hero);

            while (_awaitingPlayerInput) yield return null;
        }

        IEnumerator EnemyTurn(BattleCharacter enemy)
        {
            CurrentPhase = Phase.EnemyTurn;
            yield return new WaitForSeconds(0.3f);

            // Select action by priority + chance
            var validActions = enemy.EnemyData.Actions
                .Where(a => a.UseChance >= Random.value
                         && (a.HealthThreshold == 0 || enemy.HPRatio * 100f <= a.HealthThreshold))
                .OrderByDescending(a => a.Priority)
                .ToList();

            EnemyAction chosen = validActions.Count > 0
                ? validActions[0]
                : enemy.EnemyData.Actions[0];   // fallback

            // Target selection
            var targets = chosen.Skill != null && chosen.Skill.HitsAllAllies
                ? _heroes.Where(h => h.IsAlive).ToList()
                : new List<BattleCharacter> { GetRandomLivingHero() };

            yield return ExecuteSkill(enemy, chosen.Skill, targets);
        }

        // ── Player Input (called from UI) ──────────────────────────────────
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
                case CommandType.Item:
                    yield return ExecuteItem(_activeCharacter, command.Item, command.Targets);
                    break;
                case CommandType.Flee:
                    yield return AttemptFlee();
                    break;
            }
        }

        // ── Skill Execution ────────────────────────────────────────────────
        IEnumerator ExecuteBasicAttack(BattleCharacter attacker, List<BattleCharacter> targets, int boostLevel = 0)
        {
            int hitCount = 1 + boostLevel;  // extra hits per boost (basic attack)
            for (int hit = 0; hit < hitCount; hit++)
            {
                foreach (var target in targets)
                {
                    if (!target.IsAlive) continue;
                    int rawDamage = CalculatePhysicalDamage(attacker, target, 1f, boostLevel);
                    int dealt     = target.TakeDamage(rawDamage, DamageType.Physical);

                    OnDamageDealt?.Invoke(target, dealt);
                    _battleUI.ShowDamageNumber(target, dealt, dealt > rawDamage * 0.8f);
                    _camera?.Shake(0.15f);

                    // Break attempt with weapon weakness
                    TryBreakShield(attacker, target, WeaponType.Sword);

                    yield return new WaitForSeconds(0.15f);
                    if (!target.IsAlive) yield return HandleDefeat(target);
                }
                yield return new WaitForSeconds(0.1f);
            }
        }

        IEnumerator ExecuteSkill(BattleCharacter user, SkillData skill, List<BattleCharacter> targets, int boostLevel = 0)
        {
            if (skill == null) yield break;

            if (!user.UseMana(skill.MPCost))
            {
                _battleUI.ShowMessage("MPが足りない！");
                yield break;
            }

            _battleUI.ShowSkillName(skill.SkillName);
            // TODO: spawn VFX, play SFX, trigger animation
            yield return new WaitForSeconds(0.4f);

            int effectiveHits = skill.HitCount * (1 + boostLevel);

            for (int hit = 0; hit < effectiveHits; hit++)
            {
                foreach (var target in targets)
                {
                    if (!target.IsAlive) continue;

                    if (skill.IsHeal)
                    {
                        int healAmt = CalculateHeal(user, skill, boostLevel);
                        int healed  = target.Heal(healAmt);
                        _battleUI.ShowHealNumber(target, healed);
                    }
                    else
                    {
                        int rawDamage = skill.DamageType == DamageType.Physical
                            ? CalculatePhysicalDamage(user, target, skill.BasePower, boostLevel)
                            : CalculateMagicDamage(user, target, skill, boostLevel);

                        int dealt = target.TakeDamage(rawDamage, skill.DamageType, skill.Element);
                        OnDamageDealt?.Invoke(target, dealt);
                        _battleUI.ShowDamageNumber(target, dealt, IsCritical(user));
                        _camera?.Shake(0.2f);

                        if (skill.CanBreak) TryBreakShieldElement(attacker: user, target, skill.Element);
                        if (skill.AppliedStatus != null) target.ApplyStatus(skill.AppliedStatus, skill.StatusChance);

                        yield return new WaitForSeconds(0.1f);
                        if (!target.IsAlive) yield return HandleDefeat(target);
                    }
                }
                yield return new WaitForSeconds(0.12f);
            }
        }

        IEnumerator ExecuteItem(BattleCharacter user, ItemData item, List<BattleCharacter> targets)
        {
            foreach (var target in targets)
            {
                if (item.ReviveTarget && !target.IsAlive)
                {
                    target.Revive(item.ReviveHPPercent);
                    _battleUI.ShowMessage($"{target.DisplayName} が復活した！");
                }
                else if (target.IsAlive)
                {
                    if (item.HealHP > 0)  { int h = target.Heal(item.HealHP);  _battleUI.ShowHealNumber(target, h); }
                    if (item.HealMP > 0)    target.RestoreMana(item.HealMP);
                    if (item.CureStatus != null) target.ClearAllStatus();
                }
            }
            yield return new WaitForSeconds(0.5f);
        }

        // ── Damage Formulas ────────────────────────────────────────────────
        int CalculatePhysicalDamage(BattleCharacter attacker, BattleCharacter target, float power, int boost)
        {
            float boostMultiplier = 1f + boost * 0.5f;
            float base_ = attacker.Patk * power * boostMultiplier;
            float crit  = IsCritical(attacker) ? attacker.Crit / 100f * 0.5f + 1f : 1f;
            float rand  = Random.Range(0.9f, 1.1f);
            return Mathf.RoundToInt(base_ * crit * rand);
        }

        int CalculateMagicDamage(BattleCharacter attacker, BattleCharacter target, SkillData skill, int boost)
        {
            float boostMultiplier = 1f + boost * 0.5f;
            float elementMult    = IsElementWeak(target, skill.Element) ? 1.5f : 1f;
            float base_ = attacker.Matk * skill.BasePower * boostMultiplier * elementMult;
            float crit  = IsCritical(attacker) ? attacker.Crit / 100f * 0.5f + 1f : 1f;
            float rand  = Random.Range(0.88f, 1.12f);
            return Mathf.RoundToInt(base_ * crit * rand);
        }

        int CalculateHeal(BattleCharacter user, SkillData skill, int boost)
        {
            float boostMultiplier = 1f + boost * 0.4f;
            return Mathf.RoundToInt(user.Matk * skill.HealPower * boostMultiplier * Random.Range(0.95f, 1.05f));
        }

        // ── Break Helpers ──────────────────────────────────────────────────
        void TryBreakShield(BattleCharacter attacker, BattleCharacter target, WeaponType weapon)
        {
            if (!target.IsPlayer && target.EnemyData.WeaponWeaknesses.Contains(weapon))
                if (target.HitShield()) OnBreak(target);
        }

        void TryBreakShieldElement(BattleCharacter attacker, BattleCharacter target, ElementType element)
        {
            if (!target.IsPlayer && target.EnemyData.ElementWeaknesses.Contains(element))
                if (target.HitShield()) OnBreak(target);
        }

        void OnBreak(BattleCharacter target)
        {
            OnCharacterBroken?.Invoke(target);
            _battleUI.ShowMessage($"{target.DisplayName} が崩れた！");
            _camera?.Shake(0.4f);
        }

        // ── Utility ────────────────────────────────────────────────────────
        bool IsCritical(BattleCharacter attacker) => Random.Range(0, 100) < attacker.Crit;

        bool IsElementWeak(BattleCharacter target, ElementType element) =>
            target.EnemyData != null && target.EnemyData.ElementWeaknesses.Contains(element);

        BattleCharacter GetRandomLivingHero() =>
            _heroes.Where(h => h.IsAlive).OrderBy(_ => Random.value).FirstOrDefault();

        List<BattleCharacter> GetTurnOrder() =>
            _allCombatants.Where(c => c.IsAlive)
                          .OrderByDescending(c => c.TurnGauge + c.Speed * 5f)
                          .ToList();

        IEnumerator HandleDefeat(BattleCharacter c)
        {
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
        public CommandType              Type;
        public SkillData                Skill;
        public ItemData                 Item;
        public List<BattleCharacter>    Targets;
        public int                      BoostLevel;  // 0-3
    }

    public enum CommandType { Attack, Skill, Item, Flee }
    public enum BattleResult { Victory, Defeat, Fled }
}
