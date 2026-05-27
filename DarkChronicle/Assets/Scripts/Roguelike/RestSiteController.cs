using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Rest site (野営地): player can heal, upgrade a skill, smelt a relic for power,
    /// or meditate for Luck. Choices cost the rest opportunity.
    /// </summary>
    public sealed class RestSiteController : MonoBehaviour
    {
        public static RestSiteController Instance { get; private set; }

        // ── UI ─────────────────────────────────────────────────────────────
        [Header("Rest Site UI")]
        [SerializeField] CanvasGroup        _restPanel;
        [SerializeField] TextMeshProUGUI    _hpText;
        [SerializeField] Button             _healButton;
        [SerializeField] Button             _upgradeButton;
        [SerializeField] Button             _smeltButton;
        [SerializeField] Button             _meditateButton;
        [SerializeField] Button             _leaveButton;

        [Header("Heal")]
        [SerializeField] TextMeshProUGUI    _healAmountText;
        const float BaseHealPercent = 0.30f;  // 30% HP

        [Header("Atmosphere")]
        [SerializeField] ParticleSystem     _campfireParticles;
        [SerializeField] AudioClip          _campfireBGM;
        [SerializeField] AudioSource        _audioSource;

        // ── State ──────────────────────────────────────────────────────────
        RunData _run;
        bool    _actionTaken;
        bool    _isOpen;

        void Awake() => Instance = this;

        public void InitForRun(RunData run) => _run = run;

        // ── Open ───────────────────────────────────────────────────────────
        public IEnumerator OpenRestSite()
        {
            _actionTaken = false;
            _isOpen      = true;

            _campfireParticles?.Play();
            if (_audioSource != null && _campfireBGM != null)
            {
                _audioSource.clip = _campfireBGM;
                _audioSource.Play();
            }

            RefreshUI();
            SetupButtons();

            yield return FadeGroup(_restPanel, 0f, 1f, 0.5f);

            while (_isOpen) yield return null;

            _campfireParticles?.Stop();
            _audioSource?.Stop();
            yield return FadeGroup(_restPanel, 1f, 0f, 0.3f);
        }

        void RefreshUI()
        {
            _hpText.text = $"HP: {_run.CurrentHP} / {_run.MaxHP}";

            int healAmount = RelicManager.Instance.ModifyHealAmount(
                Mathf.RoundToInt(_run.MaxHP * BaseHealPercent));
            int afterHeal  = Mathf.Min(_run.MaxHP, _run.CurrentHP + healAmount);
            _healAmountText.text = $"回復: +{healAmount} HP ({afterHeal}/{_run.MaxHP})";

            bool alreadyFull = _run.CurrentHP >= _run.MaxHP;
            _healButton.interactable    = !alreadyFull;
            _upgradeButton.interactable = _run.Deck.Count > 0;
            _smeltButton.interactable   = _run.Relics.Count > 1;  // keep at least 1
        }

        void SetupButtons()
        {
            _healButton.onClick.RemoveAllListeners();
            _healButton.onClick.AddListener(() => StartCoroutine(OnHeal()));

            _upgradeButton.onClick.RemoveAllListeners();
            _upgradeButton.onClick.AddListener(() => StartCoroutine(OnUpgradeSkill()));

            _smeltButton.onClick.RemoveAllListeners();
            _smeltButton.onClick.AddListener(() => StartCoroutine(OnSmeltRelic()));

            _meditateButton.onClick.RemoveAllListeners();
            _meditateButton.onClick.AddListener(() => StartCoroutine(OnMeditate()));

            _leaveButton.onClick.RemoveAllListeners();
            _leaveButton.onClick.AddListener(() => _isOpen = false);
        }

        // ── Actions ────────────────────────────────────────────────────────
        IEnumerator OnHeal()
        {
            int healAmount = RelicManager.Instance.ModifyHealAmount(
                Mathf.RoundToInt(_run.MaxHP * BaseHealPercent));
            _run.HealHP(healAmount);

            yield return AnimateHeal(healAmount);
            TakeRestAction();
        }

        IEnumerator OnUpgradeSkill()
        {
            // Show skill selection for upgrade
            yield return RoguelikeManager.Instance.ShowSkillUpgradeSelection();
            TakeRestAction();
        }

        IEnumerator OnSmeltRelic()
        {
            // Destroy a relic to permanently gain +15% Max HP
            if (_run.Relics.Count <= 1) yield break;

            yield return RoguelikeManager.Instance.ShowRelicSmeltSelection();
            int maxHPGain = Mathf.RoundToInt(_run.MaxHP * 0.15f);
            _run.MaxHP      += maxHPGain;
            _run.CurrentHP   = Mathf.Min(_run.CurrentHP, _run.MaxHP);

            TakeRestAction();
        }

        IEnumerator OnMeditate()
        {
            // Gain +2 Luck and +1 BP in next battle
            _run.Luck += 2;
            yield return ShowMeditateEffect();
            TakeRestAction();
        }

        void TakeRestAction()
        {
            _actionTaken = true;
            // Grey out all action buttons after one action
            _healButton.interactable     = false;
            _upgradeButton.interactable  = false;
            _smeltButton.interactable    = false;
            _meditateButton.interactable = false;
            RefreshUI();
        }

        // ── Visual Feedback ────────────────────────────────────────────────
        IEnumerator AnimateHeal(int amount)
        {
            // TODO: flash green on HP bar, show floating heal number
            yield return new WaitForSeconds(0.5f);
            RefreshUI();
        }

        IEnumerator ShowMeditateEffect()
        {
            // TODO: particle burst, show LUCK +2 text
            yield return new WaitForSeconds(0.8f);
        }

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha = from;
            group.blocksRaycasts = to > 0.5f;
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
