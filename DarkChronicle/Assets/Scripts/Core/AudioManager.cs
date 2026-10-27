using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace DarkChronicle.Core
{
    /// <summary>
    /// Audio manager: BGM crossfade, SFX pooling, volume management, and battle stinger support.
    /// </summary>
    public sealed class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        // ── BGM Sources (dual for crossfade) ──────────────────────────────
        [Header("BGM")]
        [SerializeField] AudioSource _bgmSourceA;
        [SerializeField] AudioSource _bgmSourceB;
        [SerializeField] float       _crossfadeDuration = 1.5f;

        bool _isSourceA = true;
        AudioSource ActiveBGM   => _isSourceA ? _bgmSourceA : _bgmSourceB;
        AudioSource InactiveBGM => _isSourceA ? _bgmSourceB : _bgmSourceA;

        // ── SFX Pool ───────────────────────────────────────────────────────
        [Header("SFX")]
        [SerializeField] int          _sfxPoolSize = 10;
        [SerializeField] float        _masterSFXVolume = 1f;

        List<AudioSource> _sfxPool = new();

        // ── Volume ─────────────────────────────────────────────────────────
        float _masterMusicVolume = 1f;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            // Build SFX pool
            for (int i = 0; i < _sfxPoolSize; i++)
            {
                var src = gameObject.AddComponent<AudioSource>();
                src.playOnAwake = false;
                _sfxPool.Add(src);
            }

            // Load volume preferences
            _masterMusicVolume = PlayerPrefs.GetFloat("MusicVolume", 1f);
            _masterSFXVolume   = PlayerPrefs.GetFloat("SFXVolume", 1f);
        }

        // ── BGM ────────────────────────────────────────────────────────────
        public void PlayBGM(AudioClip clip, bool loop = true, float volume = 1f)
        {
            if (ActiveBGM.clip == clip && ActiveBGM.isPlaying) return;
            StartCoroutine(CrossfadeBGM(clip, loop, volume));
        }

        public void StopBGM(float fadeTime = 1f) =>
            StartCoroutine(FadeAudio(ActiveBGM, ActiveBGM.volume, 0f, fadeTime));

        public void SetMusicVolume(float volume)
        {
            _masterMusicVolume = Mathf.Clamp01(volume);
            PlayerPrefs.SetFloat("MusicVolume", _masterMusicVolume);
            if (ActiveBGM.isPlaying) ActiveBGM.volume = _masterMusicVolume;
        }

        IEnumerator CrossfadeBGM(AudioClip clip, bool loop, float targetVolume)
        {
            AudioSource incoming = InactiveBGM;
            AudioSource outgoing = ActiveBGM;

            incoming.clip   = clip;
            incoming.loop   = loop;
            incoming.volume = 0f;
            incoming.Play();

            float elapsed = 0f;
            while (elapsed < _crossfadeDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                float t  = elapsed / _crossfadeDuration;
                outgoing.volume = Mathf.Lerp(_masterMusicVolume, 0f, t) * targetVolume;
                incoming.volume = Mathf.Lerp(0f, _masterMusicVolume, t) * targetVolume;
                yield return null;
            }

            outgoing.Stop();
            outgoing.clip   = null;
            incoming.volume = _masterMusicVolume * targetVolume;
            _isSourceA      = !_isSourceA;
        }

        // ── SFX ────────────────────────────────────────────────────────────
        public void PlaySFX(AudioClip clip, float volume = 1f, float pitch = 1f)
        {
            if (clip == null) return;
            var src = GetFreeSFXSource();
            if (src == null) return;
            src.clip    = clip;
            src.volume  = volume * _masterSFXVolume;
            src.pitch   = pitch;
            src.Play();
        }

        public void PlaySFXAt(AudioClip clip, Vector3 position, float volume = 1f)
        {
            AudioSource.PlayClipAtPoint(clip, position, volume * _masterSFXVolume);
        }

        public void PlayRandomPitch(AudioClip clip, float volume = 1f,
                                    float minPitch = 0.9f, float maxPitch = 1.1f)
        {
            PlaySFX(clip, volume, Random.Range(minPitch, maxPitch));
        }

        AudioSource GetFreeSFXSource()
        {
            foreach (var src in _sfxPool)
                if (!src.isPlaying) return src;
            // Recycle oldest
            return _sfxPool[0];
        }

        IEnumerator FadeAudio(AudioSource source, float from, float to, float duration)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed      += Time.unscaledDeltaTime;
                source.volume = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            source.volume = to;
            if (to <= 0f) source.Stop();
        }
    }
}
