using System.Collections;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace DarkChronicle.HD2D
{
    /// <summary>
    /// Manages time-of-day lighting, god rays, particle atmosphere (dust, fireflies),
    /// and global post-processing transitions for HD-2D dark fantasy atmosphere.
    /// </summary>
    public sealed class AtmosphereManager : MonoBehaviour
    {
        public static AtmosphereManager Instance { get; private set; }

        // ── Time of Day ────────────────────────────────────────────────────
        [Header("Time of Day")]
        [SerializeField] Light         _sunLight;
        [SerializeField] Gradient      _sunColorGradient;
        [SerializeField] AnimationCurve _sunIntensityCurve;
        [SerializeField, Range(0f, 1f)] float _timeOfDay = 0.5f;
        [SerializeField] float         _dayDuration      = 120f;  // seconds per full day
        [SerializeField] bool          _autoAdvanceTime  = false;

        // ── Post Processing ────────────────────────────────────────────────
        [Header("Post Processing")]
        [SerializeField] Volume        _globalVolume;
        ColorAdjustments  _colorAdjust;
        Bloom             _bloom;
        ChromaticAberration _chromaticAb;
        Vignette          _vignette;

        // ── Atmosphere Presets ─────────────────────────────────────────────
        [Header("Atmosphere Presets")]
        [SerializeField] AtmospherePreset _dayPreset;
        [SerializeField] AtmospherePreset _nightPreset;
        [SerializeField] AtmospherePreset _battlePreset;
        [SerializeField] AtmospherePreset _dungeonPreset;

        // ── Particle Systems ───────────────────────────────────────────────
        [Header("Particles")]
        [SerializeField] ParticleSystem _dustParticles;
        [SerializeField] ParticleSystem _fireflyParticles;
        [SerializeField] ParticleSystem _snowParticles;
        [SerializeField] ParticleSystem _ashParticles;

        // ── State ──────────────────────────────────────────────────────────
        AtmospherePreset _currentPreset;
        Coroutine        _transitionCoroutine;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            Instance = this;
            if (_globalVolume != null)
            {
                _globalVolume.profile.TryGet(out _colorAdjust);
                _globalVolume.profile.TryGet(out _bloom);
                _globalVolume.profile.TryGet(out _chromaticAb);
                _globalVolume.profile.TryGet(out _vignette);
            }
        }

        void Update()
        {
            if (_autoAdvanceTime && _dayDuration > 0f)
                _timeOfDay = (_timeOfDay + Time.deltaTime / _dayDuration) % 1f;

            UpdateSunLight();
        }

        // ── Public API ─────────────────────────────────────────────────────
        public void TransitionTo(AtmospherePreset preset, float duration = 2f)
        {
            if (_transitionCoroutine != null) StopCoroutine(_transitionCoroutine);
            _transitionCoroutine = StartCoroutine(TransitionCoroutine(preset, duration));
        }

        public void EnterBattle()  => TransitionTo(_battlePreset,  1.2f);
        public void ExitBattle()   => TransitionTo(_dayPreset,     2.0f);
        public void EnterDungeon() => TransitionTo(_dungeonPreset, 3.0f);

        public void SetTimeOfDay(float t) => _timeOfDay = Mathf.Clamp01(t);

        public void SetWeather(WeatherType weather)
        {
            _snowParticles?.Stop();
            _ashParticles?.Stop();
            _dustParticles?.Stop();
            _fireflyParticles?.Stop();

            switch (weather)
            {
                case WeatherType.Snow:       _snowParticles?.Play();  break;
                case WeatherType.AshFall:    _ashParticles?.Play();   break;
                case WeatherType.DustStorm:  _dustParticles?.Play();  break;
                case WeatherType.Night:
                    _fireflyParticles?.Play();
                    _dustParticles?.Play();
                    break;
            }
        }

        // ── Private ────────────────────────────────────────────────────────
        void UpdateSunLight()
        {
            if (_sunLight == null) return;
            _sunLight.color     = _sunColorGradient.Evaluate(_timeOfDay);
            _sunLight.intensity = _sunIntensityCurve.Evaluate(_timeOfDay);
            // Rotate sun: noon at top, midnight at bottom
            _sunLight.transform.rotation = Quaternion.Euler(
                (_timeOfDay - 0.25f) * 360f, -30f, 0f);
        }

        IEnumerator TransitionCoroutine(AtmospherePreset target, float duration)
        {
            AtmospherePreset start = _currentPreset ?? target;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t  = Mathf.SmoothStep(0f, 1f, elapsed / duration);
                ApplyLerped(start, target, t);
                yield return null;
            }
            ApplyLerped(target, target, 1f);
            _currentPreset = target;
        }

        void ApplyLerped(AtmospherePreset a, AtmospherePreset b, float t)
        {
            if (_colorAdjust != null)
            {
                _colorAdjust.postExposure.value = Mathf.Lerp(a.exposure, b.exposure, t);
                _colorAdjust.contrast.value     = Mathf.Lerp(a.contrast, b.contrast, t);
                _colorAdjust.saturation.value   = Mathf.Lerp(a.saturation, b.saturation, t);
                _colorAdjust.colorFilter.value  = Color.Lerp(a.colorFilter, b.colorFilter, t);
            }
            if (_bloom != null)
            {
                _bloom.intensity.value  = Mathf.Lerp(a.bloomIntensity, b.bloomIntensity, t);
                _bloom.scatter.value    = Mathf.Lerp(a.bloomScatter,   b.bloomScatter,   t);
                _bloom.tint.value       = Color.Lerp(a.bloomTint,      b.bloomTint,      t);
            }
            if (_chromaticAb != null)
                _chromaticAb.intensity.value = Mathf.Lerp(a.chromaticAberration, b.chromaticAberration, t);
            if (_vignette != null)
            {
                _vignette.intensity.value = Mathf.Lerp(a.vignetteIntensity, b.vignetteIntensity, t);
                _vignette.color.value     = Color.Lerp(a.vignetteColor, b.vignetteColor, t);
            }

            RenderSettings.ambientLight    = Color.Lerp(a.ambientColor, b.ambientColor, t);
            RenderSettings.fogColor        = Color.Lerp(a.fogColor,     b.fogColor,     t);
            RenderSettings.fogDensity      = Mathf.Lerp(a.fogDensity,   b.fogDensity,   t);
        }
    }

    // ── Data Types ─────────────────────────────────────────────────────────
    [System.Serializable]
    public class AtmospherePreset
    {
        [Header("Color Grading")]
        public float exposure           = 0f;
        public float contrast           = 10f;
        public float saturation         = -10f;
        public Color colorFilter        = Color.white;

        [Header("Bloom")]
        public float bloomIntensity     = 0.5f;
        public float bloomScatter       = 0.7f;
        public Color bloomTint          = new Color(0.8f, 0.6f, 1f);

        [Header("Lens Effects")]
        public float chromaticAberration = 0.1f;
        public float vignetteIntensity   = 0.35f;
        public Color vignetteColor       = new Color(0.02f, 0f, 0.05f);

        [Header("Scene Lighting")]
        public Color ambientColor       = new Color(0.05f, 0.03f, 0.08f);
        public Color fogColor           = new Color(0.08f, 0.05f, 0.12f);
        public float fogDensity         = 0.02f;
    }

    public enum WeatherType { Clear, Snow, AshFall, DustStorm, Night }
}
