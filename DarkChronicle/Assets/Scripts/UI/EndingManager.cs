using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Singleton MonoBehaviour that orchestrates the two-stage ending presentation:
    ///   1. Premonition card — shown when the player picks up an ending relic mid-run.
    ///   2. Ending screen — shown after the true final boss is resolved.
    /// Both stages use UIAnimator coroutines for fade/typewriter/punch animations.
    /// </summary>
    public class EndingManager : MonoBehaviour
    {
        // ── Singleton ──────────────────────────────────────────────────────────
        public static EndingManager Instance { get; private set; }

        // ── Premonition UI ─────────────────────────────────────────────────────
        [Header("Premonition UI")]
        [SerializeField] CanvasGroup       _premonitionPanel;
        [SerializeField] Image             _premonitionBg;
        [SerializeField] TextMeshProUGUI   _premonitionTitle;
        [SerializeField] TextMeshProUGUI   _premonitionText;
        [SerializeField] Button            _premonitionDismissButton;

        // ── Ending Screen ──────────────────────────────────────────────────────
        [Header("Ending Screen")]
        [SerializeField] CanvasGroup       _endingPanel;
        [SerializeField] TextMeshProUGUI   _endingTitle;
        [SerializeField] TextMeshProUGUI   _endingText;
        [SerializeField] Button            _endingContinueButton;
        [SerializeField] Image             _endingTintOverlay;

        // ── Audio ──────────────────────────────────────────────────────────────
        [Header("Audio")]
        [SerializeField] AudioSource       _audioSource;
        [SerializeField] AudioClip         _premonitionSFX;
        [SerializeField] AudioClip         _endingSFX;

        // ── Timing ────────────────────────────────────────────────────────────
        [Header("Timing")]
        [SerializeField] float _premonitionTypewriterSpeed = 30f;
        [SerializeField] float _endingTypewriterSpeed      = 25f;

        // ── Lifecycle ─────────────────────────────────────────────────────────

        void Awake()
        {
            Instance = this;

            HidePanel(_premonitionPanel);
            HidePanel(_endingPanel);

            // Buttons start hidden; shown only at the right moment
            if (_premonitionDismissButton != null)
                _premonitionDismissButton.gameObject.SetActive(false);
            if (_endingContinueButton != null)
                _endingContinueButton.gameObject.SetActive(false);
        }

        // ── Public Coroutines ──────────────────────────────────────────────────

        /// <summary>
        /// Stage 1: Show the premonition overlay when an ending relic is obtained.
        /// Fades in, typewriters the ominous text, then waits for dismiss click or 4s timeout.
        /// </summary>
        public IEnumerator ShowPremonition(EndingType ending)
        {
            // Audio
            PlaySFX(_premonitionSFX);

            // Populate text before fading in so layout is stable
            _premonitionTitle.text = EndingSystem.GetPremonitionTitle(ending);
            _premonitionText.text  = string.Empty;

            // Tint the background based on ending path
            if (_premonitionBg != null)
                _premonitionBg.color = GetPremonitionBgColor(ending);

            // Fade panel in
            yield return StartCoroutine(UIAnimator.FadeIn(_premonitionPanel, 0.6f));

            // Typewrite the body text
            yield return StartCoroutine(
                UIAnimator.Typewriter(_premonitionText,
                                      EndingSystem.GetPremonitionText(ending),
                                      _premonitionTypewriterSpeed));

            // Punch the title to draw attention after text finishes
            yield return StartCoroutine(
                UIAnimator.Punch(_premonitionTitle.rectTransform, 1.12f, 0.35f));

            // Show dismiss button and wait for click OR 4-second timeout
            bool clicked = false;
            if (_premonitionDismissButton != null)
            {
                _premonitionDismissButton.gameObject.SetActive(true);
                _premonitionDismissButton.onClick.RemoveAllListeners();
                _premonitionDismissButton.onClick.AddListener(() => clicked = true);
            }

            float elapsed = 0f;
            while (!clicked && elapsed < 4f)
            {
                elapsed += Time.unscaledDeltaTime;
                yield return null;
            }

            if (_premonitionDismissButton != null)
            {
                _premonitionDismissButton.onClick.RemoveAllListeners();
                _premonitionDismissButton.gameObject.SetActive(false);
            }

            // Fade out
            yield return StartCoroutine(UIAnimator.FadeOut(_premonitionPanel, 0.4f));
        }

        /// <summary>
        /// Stage 2: Show the full ending narrative after the final boss is resolved.
        /// Fades in over the tinted overlay, typewriters the ending text, then waits for continue.
        /// </summary>
        public IEnumerator ShowEnding(EndingType ending)
        {
            // Audio
            PlaySFX(_endingSFX);

            // Populate title; body will be typewritten below
            _endingTitle.text = EndingSystem.GetEndingTitle(ending);
            _endingText.text  = string.Empty;

            // Dark tint overlay behind the text
            if (_endingTintOverlay != null)
                _endingTintOverlay.color = new Color(0f, 0f, 0f, 0.7f);

            // Fade the panel in slowly
            yield return StartCoroutine(UIAnimator.FadeIn(_endingPanel, 1.0f));

            // Brief dramatic pause before text begins
            yield return new WaitForSeconds(1f);

            // Typewrite the ending narrative (won: true — player defeated the boss)
            yield return StartCoroutine(
                UIAnimator.Typewriter(_endingText,
                                      EndingSystem.GetEndingText(ending, won: true),
                                      _endingTypewriterSpeed));

            // Show continue button and wait for click
            bool clicked = false;
            if (_endingContinueButton != null)
            {
                _endingContinueButton.gameObject.SetActive(true);
                _endingContinueButton.onClick.RemoveAllListeners();
                _endingContinueButton.onClick.AddListener(() => clicked = true);
            }

            yield return new WaitUntil(() => clicked);

            if (_endingContinueButton != null)
            {
                _endingContinueButton.onClick.RemoveAllListeners();
                _endingContinueButton.gameObject.SetActive(false);
            }

            // Fade out
            yield return StartCoroutine(UIAnimator.FadeOut(_endingPanel, 0.5f));
        }

        // ── Internal Helpers ───────────────────────────────────────────────────

        /// <summary>Instantly hides a CanvasGroup without animation (used during Awake).</summary>
        static void HidePanel(CanvasGroup group)
        {
            if (group == null) return;
            group.alpha          = 0f;
            group.blocksRaycasts = false;
        }

        /// <summary>Plays a one-shot SFX clip if both the source and clip are assigned.</summary>
        void PlaySFX(AudioClip clip)
        {
            if (_audioSource != null && clip != null)
                _audioSource.PlayOneShot(clip);
        }

        /// <summary>
        /// Returns the background tint colour that sets the mood for each ending path's premonition.
        /// </summary>
        static Color GetPremonitionBgColor(EndingType ending) => ending switch
        {
            EndingType.DemonKing  => new Color(0.25f, 0.02f, 0.02f),   // dark crimson
            EndingType.AbyssGod   => new Color(0.02f, 0.04f, 0.22f),   // deep navy blue
            EndingType.TimeWraith => new Color(0.12f, 0.06f, 0.22f),   // dark purple
            EndingType.CursedKing => new Color(0.18f, 0.02f, 0.18f),   // dark violet
            EndingType.TrueCore   => new Color(0.03f, 0.03f, 0.03f),   // near-black
            _                     => new Color(0.05f, 0.05f, 0.05f),
        };
    }
}
