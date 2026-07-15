using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.Core
{
    /// <summary>
    /// Handles cinematic wipe/fade transitions between scenes with optional area name display.
    /// Supports black fade, white flash, horizontal wipe, and cross-iris effects.
    /// </summary>
    public sealed class SceneTransitionManager : MonoBehaviour
    {
        public static SceneTransitionManager Instance { get; private set; }

        public enum TransitionStyle { Fade, WhiteFlash, WipeLeft, IrisIn }

        [Header("Transition Panels")]
        [SerializeField] CanvasGroup  _fadePanel;
        [SerializeField] Image        _wipePanel;
        [SerializeField] Image        _irisPanel;

        [Header("Area Title")]
        [SerializeField] CanvasGroup  _areaTitleGroup;
        [SerializeField] TextMeshProUGUI _areaTitleText;
        [SerializeField] TextMeshProUGUI _areaSubtitleText;

        [Header("Timing")]
        [SerializeField] float _defaultDuration = 0.6f;

        void Awake()
        {
            Instance = this;
            _fadePanel.alpha      = 0f;
            _areaTitleGroup.alpha = 0f;
        }

        // ── Public API ─────────────────────────────────────────────────────
        public IEnumerator TransitionOut(TransitionStyle style = TransitionStyle.Fade, float duration = -1f)
        {
            float d = duration < 0f ? _defaultDuration : duration;
            yield return style switch
            {
                TransitionStyle.WhiteFlash => WhiteFlash(d),
                TransitionStyle.WipeLeft   => WipeLeft(true, d),
                TransitionStyle.IrisIn     => IrisIn(true, d),
                _                          => Fade(0f, 1f, d)
            };
        }

        public IEnumerator TransitionIn(TransitionStyle style = TransitionStyle.Fade, float duration = -1f)
        {
            float d = duration < 0f ? _defaultDuration : duration;
            yield return style switch
            {
                TransitionStyle.WipeLeft => WipeLeft(false, d),
                TransitionStyle.IrisIn   => IrisIn(false, d),
                _                        => Fade(1f, 0f, d)
            };
        }

        public IEnumerator ShowAreaTitle(string title, string subtitle = "", float displayTime = 2f)
        {
            _areaTitleText.text    = title;
            _areaSubtitleText.text = subtitle;
            yield return FadeGroup(_areaTitleGroup, 0f, 1f, 0.5f);
            yield return new WaitForSeconds(displayTime);
            yield return FadeGroup(_areaTitleGroup, 1f, 0f, 0.7f);
        }

        // ── Transition Effects ─────────────────────────────────────────────
        IEnumerator Fade(float from, float to, float duration)
        {
            _fadePanel.blocksRaycasts = true;
            yield return FadeGroup(_fadePanel, from, to, duration);
            _fadePanel.blocksRaycasts = to > 0.5f;
        }

        IEnumerator WhiteFlash(float duration)
        {
            var img = _fadePanel.GetComponent<Image>();
            if (img != null) img.color = Color.white;
            yield return Fade(0f, 1f, duration * 0.2f);
            yield return Fade(1f, 0f, duration * 0.8f);
            if (img != null) img.color = Color.black;
        }

        IEnumerator WipeLeft(bool closing, float duration)
        {
            // Animate wipe panel fill amount
            float from = closing ? 0f : 1f;
            float to   = closing ? 1f : 0f;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t  = Mathf.SmoothStep(0f, 1f, elapsed / duration);
                _wipePanel.fillAmount = Mathf.Lerp(from, to, t);
                yield return null;
            }
            _wipePanel.fillAmount = to;
        }

        IEnumerator IrisIn(bool closing, float duration)
        {
            // Scale iris panel from 0 to full or vice versa
            Vector3 full  = Vector3.one * 3f;
            Vector3 zero  = Vector3.zero;
            _irisPanel.rectTransform.localScale = closing ? zero : full;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t  = Mathf.SmoothStep(0f, 1f, elapsed / duration);
                _irisPanel.rectTransform.localScale = closing
                    ? Vector3.Lerp(zero, full, t)
                    : Vector3.Lerp(full, zero, t);
                yield return null;
            }
            _irisPanel.rectTransform.localScale = closing ? full : zero;
        }

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha   = from;
            while (elapsed < duration)
            {
                elapsed    += Time.deltaTime;
                group.alpha = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
        }
    }
}
