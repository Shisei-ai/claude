using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike.Events
{
    /// <summary>
    /// Loads event data, applies Luck weighting to event selection,
    /// shows the narrative UI, and processes choice results.
    /// </summary>
    public sealed class RandomEventManager : MonoBehaviour
    {
        public static RandomEventManager Instance { get; private set; }

        // ── UI ─────────────────────────────────────────────────────────────
        [Header("Event UI")]
        [SerializeField] CanvasGroup        _eventPanel;
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
        [Header("Event Pool")]
        [SerializeField] List<RandomEventData> _allEvents;

        // ── State ──────────────────────────────────────────────────────────
        RunData           _run;
        HashSet<string>   _usedOneTimeEvents = new();
        int               _choiceResult      = -1;

        void Awake() => Instance = this;

        public void InitForRun(RunData run)
        {
            _run = run;
            _usedOneTimeEvents.Clear();
            _eventPanel.alpha          = 0f;
            _eventPanel.blocksRaycasts = false;
        }

        // ── Selection ──────────────────────────────────────────────────────
        public RandomEventData SelectEvent(int floorIndex, int luck)
        {
            var pool = _allEvents
                .Where(e =>
                    e.MinFloor <= floorIndex &&
                    e.MaxFloor >= floorIndex &&
                    (!e.OneTimeOnly || !_usedOneTimeEvents.Contains(e.EventID)))
                .ToList();

            if (pool.Count == 0) return null;

            // Luck-weighted random selection
            // High LUCK events get a bonus weight
            var weights = pool.Select(e =>
            {
                float w = 1f + e.LuckBonusWeight * luck;
                return Mathf.Max(0.01f, w);
            }).ToList();

            float totalWeight = weights.Sum();
            float roll        = Random.Range(0f, totalWeight);
            float cumulative  = 0f;
            for (int i = 0; i < pool.Count; i++)
            {
                cumulative += weights[i];
                if (roll < cumulative) return pool[i];
            }
            return pool[pool.Count - 1];
        }

        // ── Execution ──────────────────────────────────────────────────────
        public IEnumerator RunEvent(RandomEventData eventData)
        {
            if (eventData == null) yield break;

            _run.EventsVisited++;
            if (eventData.OneTimeOnly) _usedOneTimeEvents.Add(eventData.EventID);

            yield return ShowPanel(eventData);
            yield return WaitForChoice(eventData);
            yield return HidePanel();
        }

        IEnumerator ShowPanel(RandomEventData ev)
        {
            _titleText.text     = ev.Title;
            _narrativeText.text = ev.NarrativeText;
            _resultText.text    = string.Empty;
            _illustration.sprite = ev.IllustrationSprite;
            _uiTint.color       = ev.UITintColor;

            if (_ambientSource != null && ev.AmbientSound != null)
            {
                _ambientSource.clip = ev.AmbientSound;
                _ambientSource.Play();
            }

            BuildChoiceButtons(ev.Choices);

            _continueButton.gameObject.SetActive(false);
            yield return FadeGroup(_eventPanel, 0f, 1f, 0.4f);
        }

        void BuildChoiceButtons(List<EventChoice> choices)
        {
            foreach (Transform child in _choiceContainer) Destroy(child.gameObject);

            for (int i = 0; i < choices.Count; i++)
            {
                int idx      = i;
                var choice   = choices[i];
                var go       = Instantiate(_choiceButtonPrefab, _choiceContainer);
                var btn      = go.GetComponent<Button>();
                var texts    = go.GetComponentsInChildren<TextMeshProUGUI>();

                if (texts.Length > 0) texts[0].text = choice.ChoiceText;
                if (texts.Length > 1 && !string.IsNullOrEmpty(choice.TooltipText))
                    texts[1].text = choice.TooltipText;

                // Grey out if can't afford gold cost
                bool affordable = !choice.RequiresGold || _run.Gold >= choice.GoldCost;
                bool luckyEnough = choice.LuckRequirement <= 0f ||
                                   RelicManager.Instance.GetLuck() >= choice.LuckRequirement;
                btn.interactable = affordable && luckyEnough;

                if (!affordable && texts.Length > 1)
                    texts[1].text = $"必要ゴールド: {choice.GoldCost}G";

                btn.onClick.AddListener(() => { _choiceResult = idx; });
            }
        }

        IEnumerator WaitForChoice(RandomEventData ev)
        {
            _choiceResult = -1;
            while (_choiceResult < 0) yield return null;

            var choice = ev.Choices[_choiceResult];

            // Show result text
            _resultText.text = choice.Result?.NarrativeText ?? string.Empty;

            // Disable choice buttons
            foreach (Transform child in _choiceContainer)
                child.GetComponent<Button>()?.gameObject.SetActive(false);

            // Apply result
            if (choice.Result != null)
                yield return ApplyResult(choice.Result, choice);

            _continueButton.gameObject.SetActive(true);

            bool continued = false;
            _continueButton.onClick.RemoveAllListeners();
            _continueButton.onClick.AddListener(() => continued = true);
            while (!continued) yield return null;
        }

        IEnumerator ApplyResult(EventChoiceResult result, EventChoice choice)
        {
            // Gold cost
            if (choice.RequiresGold) _run.SpendGold(choice.GoldCost);

            // HP change
            if (result.ChangeHP)
            {
                int delta = result.HPChangeFlat
                          + Mathf.RoundToInt(_run.MaxHP * result.HPChangePercent);
                if (delta > 0) _run.HealHP(RelicManager.Instance.ModifyHealAmount(delta));
                else           _run.TakeDamage(-delta);
            }

            // Gold change
            if (result.ChangeGold)
            {
                int goldDelta = result.GoldChange;
                if (goldDelta > 0) _run.EarnGold(RelicManager.Instance.ModifyGoldDrop(goldDelta));
                else               _run.SpendGold(-goldDelta);
            }

            // Relic
            if (result.GainRelic)
            {
                RelicData relic = result.SpecificRelic
                               ?? RoguelikeManager.Instance.DrawRelic(result.RelicRarityPool, true);
                if (relic != null)
                {
                    _run.AddRelic(relic);
                    if (relic.AttachedCurse != null) _run.AddCurse(relic.AttachedCurse);
                    // Show relic obtain UI
                    yield return RoguelikeManager.Instance.ShowRelicObtained(relic);
                }
            }

            // Curse
            if (result.GainCurse && result.SpecificCurse != null)
                _run.AddCurse(result.SpecificCurse);

            // Skill draft
            if (result.GainSkillDraft)
                yield return RoguelikeManager.Instance.ShowSkillDraft(result.SkillChoiceCount);

            // Skill remove
            if (result.RemoveSkill && _run.Deck.Count > 0)
                yield return RoguelikeManager.Instance.ShowSkillRemove();

            // Max HP
            if (result.ChangeMaxHP)
            {
                _run.MaxHP = Mathf.Max(1, _run.MaxHP + result.MaxHPChange);
                if (_run.CurrentHP > _run.MaxHP) _run.CurrentHP = _run.MaxHP;
            }

            // Luck
            if (result.ChangeLuck) _run.Luck += result.LuckChange;

            // Battle trigger
            if (result.TriggerBattle)
                yield return RoguelikeManager.Instance.TriggerEventBattle(result.IsEliteBattle);
        }

        IEnumerator HidePanel()
        {
            _ambientSource?.Stop();
            yield return FadeGroup(_eventPanel, 1f, 0f, 0.3f);
        }

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha = from;
            group.blocksRaycasts = from > to;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                group.alpha = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
            group.blocksRaycasts = to > 0.5f;
        }
    }
}
