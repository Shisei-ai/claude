using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Rest site (野営地): player can heal, upgrade a skill, smelt a relic for power,
    /// or meditate to restore Sanity. Choices cost the rest opportunity.
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

        [Header("Visual Feedback")]
        [SerializeField] TextMeshProUGUI    _statusPopupText;

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
            bool done = false;
            yield return RoguelikeManager.Instance.ShowSkillUpgradeSelection(r => done = r);
            if (done) TakeRestAction();
        }

        IEnumerator OnSmeltRelic()
        {
            if (_run.Relics.Count <= 1) yield break;
            bool done = false;
            yield return RoguelikeManager.Instance.ShowRelicSmeltSelection(r => done = r);
            if (done) TakeRestAction();
        }

        IEnumerator OnMeditate()
        {
            // Restore +1 Sanity (clamped to +3)
            _run.AddSanity(1);
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
            // Tick HP display upward over 0.5s
            int startHP = Mathf.Max(0, _run.CurrentHP - amount);
            Color origColor = _hpText.color;
            float elapsed   = 0f;
            while (elapsed < 0.5f)
            {
                elapsed += Time.deltaTime;
                float p = elapsed / 0.5f;
                _hpText.text  = $"HP: {Mathf.RoundToInt(Mathf.Lerp(startHP, _run.CurrentHP, p))} / {_run.MaxHP}";
                _hpText.color = Color.Lerp(origColor, new Color(0.3f, 1f, 0.5f), p);
                yield return null;
            }
            RefreshUI();

            if (_statusPopupText != null)
            {
                _statusPopupText.color = new Color(0.3f, 1f, 0.5f, 1f);
                _statusPopupText.text  = $"+ {amount} HP 回復";
                yield return StartCoroutine(FadeOutText(_statusPopupText, 1.2f));
            }

            // Restore text color (in case RefreshUI doesn't reset it)
            _hpText.color = origColor;
        }

        IEnumerator ShowMeditateEffect()
        {
            // Extra campfire burst
            _campfireParticles?.Emit(30);

            // Pulse HP text with a calm purple glow
            Color origColor = _hpText.color;
            float elapsed   = 0f;
            while (elapsed < 0.8f)
            {
                elapsed += Time.deltaTime;
                float p = elapsed / 0.8f;
                _hpText.color = Color.Lerp(origColor, new Color(0.7f, 0.5f, 1f), Mathf.Sin(p * Mathf.PI));
                yield return null;
            }
            _hpText.color = origColor;

            if (_statusPopupText != null)
            {
                _statusPopupText.color = new Color(0.7f, 0.5f, 1f, 1f);
                _statusPopupText.text  = "精神 +1";
                yield return StartCoroutine(FadeOutText(_statusPopupText, 1.0f));
            }
        }

        IEnumerator FadeOutText(TextMeshProUGUI text, float duration)
        {
            Color c   = text.color;
            c.a       = 1f;
            float t   = 0f;
            while (t < duration)
            {
                t   += Time.deltaTime;
                c.a  = Mathf.Lerp(1f, 0f, t / duration);
                text.color = c;
                yield return null;
            }
            c.a = 0f;
            text.color = c;
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
