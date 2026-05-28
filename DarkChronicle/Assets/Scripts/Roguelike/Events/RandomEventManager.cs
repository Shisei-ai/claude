using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.UI;

namespace DarkChronicle.Roguelike.Events
{
    /// <summary>
    /// Loads event data, applies Luck weighting to event selection,
    /// shows the narrative UI, and processes choice results.
    ///
    /// If no events are assigned in the inspector, EventFactory generates
    /// all 40 events at runtime.
    /// </summary>
    public sealed class RandomEventManager : MonoBehaviour
    {
        public static RandomEventManager Instance { get; private set; }

        // ── UI ─────────────────────────────────────────────────────────────
        [Header("Event UI")]
        [SerializeField] CanvasGroup        _eventPanel;
        [SerializeField] RectTransform      _eventPanelRect;
        [SerializeField] Image              _illustration;
        [SerializeField] TextMeshProUGUI    _titleText;
        [SerializeField] TextMeshProUGUI    _narrativeText;
        [SerializeField] TextMeshProUGUI    _resultText;
        [SerializeField] Transform          _choiceContainer;
        [SerializeField] GameObject         _choiceButtonPrefab;
        [SerializeField] Button             _continueButton;
        [SerializeField] Image              _uiTint;
        [SerializeField] AudioSource        _ambientSource;

        // ── Event Pool ─────────────────────────────────────────────────────
        [Header("Event Pool (leave empty to use EventFactory)")]
        [SerializeField] List<RandomEventData> _allEvents = new();

        // ── State ──────────────────────────────────────────────────────────
        RunData          _run;
        HashSet<string>  _usedOneTimeEvents = new();
        int              _choiceResult      = -1;

        void Awake() => Instance = this;

        public void InitForRun(RunData run)
        {
            _run = run;
            _usedOneTimeEvents.Clear();

            // Auto-populate from factory if no events are wired in the inspector
            if (_allEvents == null || _allEvents.Count == 0)
                _allEvents = EventFactory.CreateAllEvents();

            if (_eventPanel)
            {
                _eventPanel.alpha          = 0f;
                _eventPanel.blocksRaycasts = false;
            }
        }

        // ── Selection ──────────────────────────────────────────────────────
        public RandomEventData SelectEvent(int floorIndex, int sanity)
        {
            var pool = _allEvents
                .Where(e => e != null
                         && e.MinFloor <= floorIndex
                         && e.MaxFloor >= floorIndex
                         && (!e.OneTimeOnly || !_usedOneTimeEvents.Contains(e.EventID)))
                .ToList();

            if (pool.Count == 0) return null;

            // Sanity-weighted random selection: high sanity favors positive events
            var weights = pool.Select(e => Mathf.Max(0.01f, 1f + e.SanityWeight * sanity)).ToList();
            float total = weights.Sum();
            float roll  = Random.Range(0f, total);
            float acc   = 0f;
            for (int i = 0; i < pool.Count; i++)
            {
                acc += weights[i];
                if (roll < acc) return pool[i];
            }
            return pool[pool.Count - 1];
        }

        // ── Run Event ──────────────────────────────────────────────────────
        public IEnumerator RunEvent(RandomEventData eventData)
        {
            if (eventData == null) yield break;

            _run.EventsVisited++;
            if (eventData.OneTimeOnly) _usedOneTimeEvents.Add(eventData.EventID);

            yield return ShowPanel(eventData);
            yield return WaitForChoice(eventData);
            yield return HidePanel();

            // EventMaster: earn bonus gold after any random event
            int eventBonus = RelicManager.Instance?.GetEventMasterBonus() ?? 0;
            if (eventBonus > 0) _run.EarnGold(eventBonus);
        }

        // ── Show Panel ─────────────────────────────────────────────────────
        IEnumerator ShowPanel(RandomEventData ev)
        {
            // Set up static elements immediately
            if (_titleText)     _titleText.text      = ev.Title;
            if (_narrativeText) _narrativeText.text  = string.Empty;
            if (_resultText)    _resultText.text     = string.Empty;
            if (_illustration && ev.IllustrationSprite) _illustration.sprite = ev.IllustrationSprite;
            if (_uiTint)        _uiTint.color        = ev.UITintColor;

            if (_ambientSource != null && ev.AmbientSound != null)
            {
                _ambientSource.clip = ev.AmbientSound;
                _ambientSource.Play();
            }

            _continueButton.gameObject.SetActive(false);

            // Slide panel in
            if (_eventPanelRect)
                _eventPanelRect.anchoredPosition += Vector2.down * 40f;
            yield return StartCoroutine(UIAnimator.FadeIn(_eventPanel, 0.35f));
            if (_eventPanelRect)
                yield return StartCoroutine(UIAnimator.SlideIn(_eventPanelRect,
                    _eventPanelRect.anchoredPosition,
                    _eventPanelRect.anchoredPosition + Vector2.up * 40f, 0.25f));

            // Typewriter for narrative
            if (_narrativeText != null)
                yield return StartCoroutine(UIAnimator.Typewriter(_narrativeText, ev.NarrativeText, 35f));

            // Build choice buttons after text finishes
            BuildChoiceButtons(ev.Choices);
        }

        // ── Choice Buttons ─────────────────────────────────────────────────
        void BuildChoiceButtons(List<EventChoice> choices)
        {
            foreach (Transform child in _choiceContainer) Destroy(child.gameObject);

            for (int i = 0; i < choices.Count; i++)
            {
                int idx    = i;
                var choice = choices[i];
                var go     = Instantiate(_choiceButtonPrefab, _choiceContainer);
                var btn    = go.GetComponent<Button>();
                var texts  = go.GetComponentsInChildren<TextMeshProUGUI>();

                if (texts.Length > 0) texts[0].text = choice.ChoiceText;

                bool affordable   = !choice.RequiresGold || _run.Gold >= choice.GoldCost;
                bool luckyEnough  = choice.SanityRequirement == 0
                                 || _run.Sanity >= choice.SanityRequirement;
                btn.interactable  = affordable && luckyEnough;

                // Subtitle / tooltip line
                if (texts.Length > 1)
                {
                    if (!affordable)
                        texts[1].text = $"<color=#FF6060>必要ゴールド: {choice.GoldCost}G</color>";
                    else if (!string.IsNullOrEmpty(choice.TooltipText))
                        texts[1].text = choice.TooltipText;
                }

                // Punch animation on spawn
                var rt = go.GetComponent<RectTransform>();
                if (rt != null) StartCoroutine(UIAnimator.Punch(rt, 1.04f, 0.15f));

                btn.onClick.AddListener(() => { _choiceResult = idx; });
            }
        }

        // ── Wait For Choice ────────────────────────────────────────────────
        IEnumerator WaitForChoice(RandomEventData ev)
        {
            _choiceResult = -1;
            while (_choiceResult < 0) yield return null;

            var choice = ev.Choices[_choiceResult];

            // Disable buttons
            foreach (Transform child in _choiceContainer)
                if (child.GetComponent<Button>() is Button b) b.interactable = false;

            // Show result via typewriter
            if (_resultText != null && !string.IsNullOrEmpty(choice.Result?.NarrativeText))
                yield return StartCoroutine(UIAnimator.Typewriter(_resultText,
                    choice.Result.NarrativeText, 40f));

            // Apply result effects
            if (choice.Result != null)
                yield return ApplyResult(choice.Result, choice);

            // Show continue button with a punch
            _continueButton.gameObject.SetActive(true);
            var crt = _continueButton.GetComponent<RectTransform>();
            if (crt != null) StartCoroutine(UIAnimator.Punch(crt, 1.08f, 0.2f));

            bool continued = false;
            _continueButton.onClick.RemoveAllListeners();
            _continueButton.onClick.AddListener(() => continued = true);
            while (!continued) yield return null;
        }

        // ── Apply Result ───────────────────────────────────────────────────
        IEnumerator ApplyResult(EventChoiceResult result, EventChoice choice)
        {
            // Gold cost deduction
            if (choice.RequiresGold) _run.SpendGold(choice.GoldCost);

            // HP change
            if (result.FullHeal)
            {
                _run.HealHP(_run.MaxHP);
            }
            else if (result.ChangeHP)
            {
                int delta = result.HPChangeFlat
                          + Mathf.RoundToInt(_run.MaxHP * result.HPChangePercent);
                if (delta > 0)
                    _run.HealHP(RelicManager.Instance?.ModifyHealAmount(delta) ?? delta);
                else if (delta < 0)
                    _run.TakeDamage(-delta);
            }

            // Gold change (not a cost — a reward/penalty)
            if (result.ChangeGold && result.GoldChange != 0)
            {
                if (result.GoldChange > 0)
                {
                    int earned = RelicManager.Instance?.ModifyGoldDrop(result.GoldChange)
                                 ?? result.GoldChange;
                    _run.EarnGold(earned);
                }
                else
                {
                    // "全財産を捧げる" uses GoldChange = -9999 as sentinel
                    int spend = result.GoldChange == -9999
                                ? _run.Gold
                                : -result.GoldChange;
                    _run.SpendGold(spend);
                }
            }

            // Max HP change
            if (result.ChangeMaxHP)
            {
                _run.MaxHP = Mathf.Max(1, _run.MaxHP + result.MaxHPChange);
                if (_run.CurrentHP > _run.MaxHP) _run.CurrentHP = _run.MaxHP;
            }

            // Sanity change
            if (result.ChangeSanity) _run.AddSanity(result.SanityChange);

            // Relic gain
            if (result.GainRelic)
            {
                var relic = result.SpecificRelic
                         ?? RoguelikeManager.Instance?.DrawRelic(result.RelicRarityPool, true);
                if (relic != null)
                {
                    _run.AddRelic(relic);
                    if (relic.AttachedCurse != null) _run.AddCurse(relic.AttachedCurse);
                    yield return RoguelikeManager.Instance?.ShowRelicObtained(relic);
                }
            }

            // Curse gain (random from pool when SpecificCurse is null)
            if (result.GainCurse)
            {
                if (result.SpecificCurse != null)
                {
                    _run.AddCurse(result.SpecificCurse);
                }
                else
                {
                    // Draw a random curse from the registered pool
                    var randCurse = RoguelikeManager.Instance?.DrawRandomCurse();
                    if (randCurse != null) _run.AddCurse(randCurse);
                }
            }

            // Curse removal
            if (result.RemoveCurse && _run.Curses.Count > 0)
            {
                int removeCount = result.RemoveCurseCount >= 99
                    ? _run.Curses.Count
                    : Mathf.Min(result.RemoveCurseCount, _run.Curses.Count);
                // Remove the most recently added curses (last in list)
                for (int i = 0; i < removeCount && _run.Curses.Count > 0; i++)
                    _run.Curses.RemoveAt(_run.Curses.Count - 1);
            }

            // Skill draft
            if (result.GainSkillDraft)
                yield return RoguelikeManager.Instance?.ShowSkillDraft(result.SkillChoiceCount);

            // Skill remove
            if (result.RemoveSkill && _run.Deck.Count > 0)
                yield return RoguelikeManager.Instance?.ShowSkillRemove();

            // Ending branch: create and award the ending relic, set active path, show premonition
            if (result.TriggerEndingBranch && result.EndingPath != EndingType.None)
            {
                var endingRelic = EndingSystem.CreateEndingRelic(result.EndingPath);
                _run.AddRelic(endingRelic);
                _run.ActiveEnding = result.EndingPath;
                yield return RoguelikeManager.Instance?.ShowRelicObtained(endingRelic);
                yield return EndingManager.Instance?.ShowPremonition(result.EndingPath);
            }

            // Battle trigger
            if (result.TriggerBattle)
                yield return RoguelikeManager.Instance?.TriggerEventBattle(result.IsEliteBattle);
        }

        // ── Hide Panel ─────────────────────────────────────────────────────
        IEnumerator HidePanel()
        {
            _ambientSource?.Stop();
            yield return StartCoroutine(UIAnimator.FadeOut(_eventPanel, 0.3f));
            foreach (Transform child in _choiceContainer) Destroy(child.gameObject);
        }
    }
}
