using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Static coroutine utilities shared across all UI components.
    /// Call via MonoBehaviour.StartCoroutine(UIAnimator.FadeGroup(...)).
    /// </summary>
    public static class UIAnimator
    {
        // ── Canvas Group ────────────────────────────────────────────────────
        public static IEnumerator Fade(CanvasGroup group, float from, float to, float duration)
        {
            float t = 0f;
            group.alpha = from;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                group.alpha = Mathf.Lerp(from, to, EaseOut(t / duration));
                yield return null;
            }
            group.alpha = to;
        }

        public static IEnumerator FadeIn(CanvasGroup group, float duration = 0.25f)
        {
            group.blocksRaycasts = true;
            yield return Fade(group, 0f, 1f, duration);
        }

        public static IEnumerator FadeOut(CanvasGroup group, float duration = 0.2f)
        {
            yield return Fade(group, 1f, 0f, duration);
            group.blocksRaycasts = false;
        }

        // ── RectTransform ───────────────────────────────────────────────────
        public static IEnumerator SlideIn(RectTransform rt, Vector2 from, Vector2 to, float duration)
        {
            float t = 0f;
            rt.anchoredPosition = from;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                rt.anchoredPosition = Vector2.Lerp(from, to, EaseOut(t / duration));
                yield return null;
            }
            rt.anchoredPosition = to;
        }

        public static IEnumerator Punch(RectTransform rt, float scale, float duration)
        {
            Vector3 original = rt.localScale;
            float   half     = duration * 0.5f;
            float   t        = 0f;

            while (t < half)
            {
                t += Time.unscaledDeltaTime;
                float s = Mathf.Lerp(1f, scale, EaseOut(t / half));
                rt.localScale = original * s;
                yield return null;
            }
            t = 0f;
            while (t < half)
            {
                t += Time.unscaledDeltaTime;
                float s = Mathf.Lerp(scale, 1f, EaseOut(t / half));
                rt.localScale = original * s;
                yield return null;
            }
            rt.localScale = original;
        }

        public static IEnumerator Shake(RectTransform rt, float strength, float duration)
        {
            Vector2 origin = rt.anchoredPosition;
            float   t      = 0f;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                float decay = 1f - t / duration;
                rt.anchoredPosition = origin + Random.insideUnitCircle * (strength * decay);
                yield return null;
            }
            rt.anchoredPosition = origin;
        }

        // ── Color / Image ───────────────────────────────────────────────────
        public static IEnumerator FlashColor(Graphic graphic, Color flashColor, float duration)
        {
            Color original = graphic.color;
            float t        = 0f;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                float p = Mathf.PingPong(t * 2f / duration, 1f);
                graphic.color = Color.Lerp(original, flashColor, p);
                yield return null;
            }
            graphic.color = original;
        }

        public static IEnumerator SmoothBar(Slider slider, float target, float duration)
        {
            float start = slider.value;
            float t     = 0f;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                slider.value = Mathf.Lerp(start, target, EaseOut(t / duration));
                yield return null;
            }
            slider.value = target;
        }

        // ── Float + Fade (damage numbers) ──────────────────────────────────
        public static IEnumerator FloatFade(Transform obj, Vector3 offset, float duration)
        {
            Vector3    start = obj.position;
            CanvasGroup cg   = obj.GetComponent<CanvasGroup>();
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                float p = t / duration;
                obj.position = start + offset * EaseOut(p);
                if (cg != null) cg.alpha = 1f - p * p;
                yield return null;
            }
            Object.Destroy(obj.gameObject);
        }

        // ── Typewriter ──────────────────────────────────────────────────────
        public static IEnumerator Typewriter(TextMeshProUGUI text, string fullText,
                                              float charsPerSec = 40f,
                                              System.Func<bool> skipCheck = null)
        {
            float secPerChar = 1f / charsPerSec;
            for (int i = 0; i <= fullText.Length; i++)
            {
                if (skipCheck != null && skipCheck())
                {
                    text.text = fullText;
                    yield break;
                }
                text.text = fullText[..i];
                if (i < fullText.Length && fullText[i] == '<')
                {
                    int close = fullText.IndexOf('>', i);
                    if (close > i) { i = close; text.text = fullText[..i]; continue; }
                }
                yield return new WaitForSeconds(secPerChar);
            }
        }

        // ── Pulse (looping attention indicator) ────────────────────────────
        public static IEnumerator Pulse(Graphic graphic, float minAlpha, float maxAlpha,
                                         float period, System.Func<bool> stopCondition)
        {
            while (stopCondition == null || !stopCondition())
            {
                float a = Mathf.Lerp(minAlpha, maxAlpha,
                                     (Mathf.Sin(Time.time * Mathf.PI * 2f / period) + 1f) * 0.5f);
                graphic.color = new Color(graphic.color.r, graphic.color.g, graphic.color.b, a);
                yield return null;
            }
        }

        // ── Audio fade ──────────────────────────────────────────────────────
        public static IEnumerator FadeAudio(AudioSource src, float from, float to, float duration)
        {
            float t   = 0f;
            src.volume = from;
            while (t < duration)
            {
                t         += Time.unscaledDeltaTime;
                src.volume = Mathf.Lerp(from, to, t / duration);
                yield return null;
            }
            src.volume = to;
        }

        // ── Ease functions ──────────────────────────────────────────────────
        public static float EaseOut(float t) => 1f - (1f - Mathf.Clamp01(t)) * (1f - Mathf.Clamp01(t));
        public static float EaseIn (float t) => Mathf.Clamp01(t) * Mathf.Clamp01(t);
        public static float EaseInOut(float t)
        {
            t = Mathf.Clamp01(t);
            return t < 0.5f ? 2f * t * t : 1f - 2f * (1f - t) * (1f - t);
        }
    }
}
