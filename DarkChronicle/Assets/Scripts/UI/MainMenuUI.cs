using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Core;
using DarkChronicle.HD2D;
using DarkChronicle.Roguelike;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Main menu with animated title, particle effects, save slot selection,
    /// and cinematic startup sequence.
    /// </summary>
    public sealed class MainMenuUI : MonoBehaviour
    {
        // ── UI ─────────────────────────────────────────────────────────────
        [Header("Title")]
        [SerializeField] CanvasGroup    _titleGroup;
        [SerializeField] TextMeshProUGUI _titleText;
        [SerializeField] TextMeshProUGUI _subtitleText;
        [SerializeField] Image          _titleLogo;

        [Header("Menu Buttons")]
        [SerializeField] CanvasGroup    _buttonsGroup;
        [SerializeField] Button         _newGameButton;
        [SerializeField] Button         _continueButton;
        [SerializeField] Button         _metaUpgradeButton;
        [SerializeField] Button         _settingsButton;
        [SerializeField] Button         _quitButton;

        [Header("Save Slot Panel")]
        [SerializeField] GameObject     _saveSlotPanel;
        [SerializeField] SaveSlotEntry[] _saveSlots;

        [Header("Settings Panel")]
        [SerializeField] GameObject     _settingsPanel;
        [SerializeField] Slider         _musicSlider;
        [SerializeField] Slider         _sfxSlider;
        [SerializeField] Toggle         _fullscreenToggle;

        [Header("Atmosphere")]
        [SerializeField] ParticleSystem _backgroundParticles;
        [SerializeField] AudioSource    _bgmSource;
        [SerializeField] AudioClip      _titleBGM;
        [SerializeField] float          _introDelay = 1.5f;

        // ── Unity ──────────────────────────────────────────────────────────
        void Start()
        {
            _titleGroup.alpha   = 0f;
            _buttonsGroup.alpha = 0f;
            if (_saveSlotPanel != null) _saveSlotPanel.SetActive(false);
            _settingsPanel.SetActive(false);

            _newGameButton.onClick.AddListener(OnNewGame);
            _continueButton.onClick.AddListener(OnContinue);
            if (_metaUpgradeButton != null) _metaUpgradeButton.onClick.AddListener(OnMetaUpgrade);
            _settingsButton.onClick.AddListener(OnSettings);
            _quitButton.onClick.AddListener(OnQuit);

            _continueButton.interactable = RunSaveSystem.HasSave();

            if (_metaUpgradeButton != null)
            {
                var label = _metaUpgradeButton.GetComponentInChildren<TextMeshProUGUI>();
                if (label != null)
                    label.text = $"メタ強化  [{MetaProgression.TotalEpitaphs} 碑文]";
            }

            StartCoroutine(IntroSequence());
        }

        // ── Intro ──────────────────────────────────────────────────────────
        IEnumerator IntroSequence()
        {
            yield return new WaitForSeconds(_introDelay);

            if (_backgroundParticles != null) _backgroundParticles.Play();

            if (_bgmSource != null && _titleBGM != null)
            {
                _bgmSource.clip   = _titleBGM;
                _bgmSource.volume = 0f;
                _bgmSource.Play();
                StartCoroutine(FadeAudio(_bgmSource, 0f, 0.8f, 3f));
            }

            yield return StartCoroutine(FadeCanvasGroup(_titleGroup, 0f, 1f, 1.5f));

            StartCoroutine(TitleFlickerLoop());

            yield return new WaitForSeconds(0.5f);

            yield return StartCoroutine(FadeCanvasGroup(_buttonsGroup, 0f, 1f, 0.8f));
        }

        IEnumerator TitleFlickerLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(Random.Range(4f, 8f));
                _titleText.alpha = 0.7f;
                yield return new WaitForSeconds(0.05f);
                _titleText.alpha = 1f;
                yield return new WaitForSeconds(0.05f);
                _titleText.alpha = 0.8f;
                yield return new WaitForSeconds(0.03f);
                _titleText.alpha = 1f;
            }
        }

        // ── Button Handlers ────────────────────────────────────────────────
        void OnNewGame() => SceneManager.LoadScene(SceneNames.RunSetup);

        void OnContinue()
        {
            if (!RunSaveSystem.HasSave()) return;
            RoguelikeManager.ForceNewRun = false;
            SceneManager.LoadScene(SceneNames.Roguelike);
        }

        void OnMetaUpgrade() =>
            SceneManager.LoadScene(SceneNames.MetaUpgrade);

        void OnSettings()
        {
            _settingsPanel.SetActive(true);
            _musicSlider.value     = PlayerPrefs.GetFloat("MusicVolume", 1f);
            _sfxSlider.value       = PlayerPrefs.GetFloat("SFXVolume", 1f);
            _fullscreenToggle.isOn = Screen.fullScreen;

            _musicSlider.onValueChanged.AddListener(v => {
                PlayerPrefs.SetFloat("MusicVolume", v);
                AudioListener.volume = v;
            });
            _fullscreenToggle.onValueChanged.AddListener(v => Screen.fullScreen = v);
        }

        void OnQuit()
        {
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }

        // ── Utilities ──────────────────────────────────────────────────────
        IEnumerator FadeCanvasGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha   = from;
            group.blocksRaycasts = from > to;
            while (elapsed < duration)
            {
                elapsed    += Time.deltaTime;
                group.alpha = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
            group.blocksRaycasts = to > 0.5f;
        }

        IEnumerator FadeAudio(AudioSource source, float from, float to, float duration)
        {
            float elapsed = 0f;
            source.volume = from;
            while (elapsed < duration)
            {
                elapsed      += Time.deltaTime;
                source.volume = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            source.volume = to;
        }
    }

    // ── Save Slot UI Entry ─────────────────────────────────────────────────
    [System.Serializable]
    public class SaveSlotEntry
    {
        public GameObject     Root;
        public TextMeshProUGUI SlotNumberText;
        public TextMeshProUGUI AreaNameText;
        public TextMeshProUGUI PlaytimeText;
        public Button         SelectButton;
        public GameObject     EmptyLabel;

        public void Setup(SaveData data, bool isLoad, System.Action onSelected)
        {
            SelectButton.onClick.RemoveAllListeners();
            SelectButton.onClick.AddListener(() => onSelected?.Invoke());

            bool hasData = data != null;
            EmptyLabel.SetActive(!hasData);

            if (hasData)
            {
                if (AreaNameText) AreaNameText.text = data.SceneName;
                if (PlaytimeText)
                {
                    int h = data.PlaytimeSeconds / 3600;
                    int m = (data.PlaytimeSeconds % 3600) / 60;
                    PlaytimeText.text = $"{h:D2}:{m:D2}";
                }
            }

            SelectButton.interactable = !isLoad || hasData;
        }
    }
}
