using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Pause menu overlay.
    /// Provides: Resume, Status, Options, Save (roguelike checkpoint), Abandon Run, Main Menu.
    /// Design: dark translucent backdrop, slide-in panel, Persona 5-style vertical list.
    /// </summary>
    public sealed class PauseMenuUI : MonoBehaviour
    {
        [Header("Root")]
        [SerializeField] CanvasGroup    _backdropGroup;
        [SerializeField] CanvasGroup    _panelGroup;
        [SerializeField] RectTransform  _panelRect;

        [Header("Buttons")]
        [SerializeField] Button         _resumeButton;
        [SerializeField] Button         _statusButton;
        [SerializeField] Button         _optionsButton;
        [SerializeField] Button         _saveButton;
        [SerializeField] Button         _abandonButton;
        [SerializeField] Button         _mainMenuButton;

        [Header("Labels")]
        [SerializeField] TextMeshProUGUI _saveLabel;
        [SerializeField] TextMeshProUGUI _floorLabel;
        [SerializeField] TextMeshProUGUI _goldLabel;

        [Header("Sub-panels")]
        [SerializeField] OptionsPanel   _optionsPanel;

        [Header("Confirm Dialog")]
        [SerializeField] CanvasGroup    _confirmGroup;
        [SerializeField] TextMeshProUGUI _confirmText;
        [SerializeField] Button         _confirmYesButton;
        [SerializeField] Button         _confirmNoButton;

        bool _isOpen;
        bool _awaitingConfirm;

        public event System.Action OnResumed;
        public event System.Action OnStatusRequested;
        public event System.Action OnSaveRequested;
        public event System.Action OnMainMenuConfirmed;
        public event System.Action OnAbandonConfirmed;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            _resumeButton  .onClick.AddListener(Resume);
            _statusButton  .onClick.AddListener(() => OnStatusRequested?.Invoke());
            _optionsButton .onClick.AddListener(OpenOptions);
            _saveButton    .onClick.AddListener(Save);
            _abandonButton .onClick.AddListener(() => ShowConfirm("ランを諦めますか？",
                                                    () => OnAbandonConfirmed?.Invoke()));
            _mainMenuButton.onClick.AddListener(() => ShowConfirm("タイトルに戻りますか？",
                                                    () => OnMainMenuConfirmed?.Invoke()));
            if (_confirmYesButton) _confirmYesButton.onClick.AddListener(ConfirmYes);
            if (_confirmNoButton)  _confirmNoButton .onClick.AddListener(ConfirmNo);

            SetInstant(_backdropGroup, false);
            SetInstant(_panelGroup,    false);
            if (_confirmGroup) SetInstant(_confirmGroup, false);

            gameObject.SetActive(false);
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape) && !_awaitingConfirm)
            {
                if (_isOpen) Resume();
                else Open();
            }
        }

        // ── Public API ─────────────────────────────────────────────────────
        public void Open(Roguelike.RunData run = null)
        {
            if (_isOpen) return;
            _isOpen = true;
            gameObject.SetActive(true);
            Time.timeScale = 0f;

            if (run != null) RefreshRunInfo(run);
            StartCoroutine(OpenRoutine());
        }

        public void Resume()
        {
            if (!_isOpen) return;
            _isOpen = false;
            Time.timeScale = 1f;
            StartCoroutine(CloseRoutine());
            OnResumed?.Invoke();
        }

        // ── Run info ────────────────────────────────────────────────────────
        void RefreshRunInfo(Roguelike.RunData run)
        {
            if (_floorLabel) _floorLabel.text = $"フロア {run.CurrentFloor + 1}";
            if (_goldLabel)  _goldLabel.text  = $"{run.Gold} G";
        }

        // ── Button actions ─────────────────────────────────────────────────
        void OpenOptions()
        {
            _optionsPanel?.Open();
        }

        void Save()
        {
            OnSaveRequested?.Invoke();
            if (_saveLabel) StartCoroutine(SaveFeedbackRoutine());
        }

        IEnumerator SaveFeedbackRoutine()
        {
            _saveLabel.text = "保存しました！";
            _saveLabel.color = new Color(0.3f, 1f, 0.5f);
            yield return new WaitForSecondsRealtime(1.5f);
            _saveLabel.text  = "セーブ";
            _saveLabel.color = Color.white;
        }

        // ── Confirm dialog ──────────────────────────────────────────────────
        System.Action _pendingConfirmAction;

        void ShowConfirm(string message, System.Action onYes)
        {
            if (_confirmGroup == null) { onYes?.Invoke(); return; }
            _pendingConfirmAction = onYes;
            _awaitingConfirm      = true;
            if (_confirmText) _confirmText.text = message;
            StartCoroutine(UIAnimator.FadeIn(_confirmGroup, 0.15f));
        }

        void ConfirmYes()
        {
            _awaitingConfirm = false;
            Time.timeScale   = 1f;
            _isOpen          = false;
            StartCoroutine(UIAnimator.FadeOut(_confirmGroup, 0.1f));
            StartCoroutine(CloseRoutine());
            _pendingConfirmAction?.Invoke();
        }

        void ConfirmNo()
        {
            _awaitingConfirm = false;
            StartCoroutine(UIAnimator.FadeOut(_confirmGroup, 0.15f));
        }

        // ── Animations ─────────────────────────────────────────────────────
        IEnumerator OpenRoutine()
        {
            // Backdrop fade-in (unscaled)
            float t   = 0f;
            float dur = 0.2f;
            _backdropGroup.gameObject.SetActive(true);
            while (t < dur)
            {
                t += Time.unscaledDeltaTime;
                _backdropGroup.alpha = Mathf.Lerp(0f, 0.65f, t / dur);
                yield return null;
            }
            _backdropGroup.alpha = 0.65f;

            // Panel slide-in from right
            if (_panelRect)
            {
                Vector2 to   = _panelRect.anchoredPosition;
                Vector2 from = to + Vector2.right * 80f;
                t = 0f;
                dur = 0.2f;
                _panelRect.anchoredPosition = from;
                _panelGroup.alpha = 1f;
                _panelGroup.blocksRaycasts = true;
                _panelGroup.interactable   = true;
                while (t < dur)
                {
                    t += Time.unscaledDeltaTime;
                    _panelRect.anchoredPosition = Vector2.Lerp(from, to,
                        UIAnimator.EaseOut(t / dur));
                    yield return null;
                }
                _panelRect.anchoredPosition = to;
            }
            else
            {
                _panelGroup.alpha = 1f;
                _panelGroup.blocksRaycasts = true;
                _panelGroup.interactable   = true;
            }
        }

        IEnumerator CloseRoutine()
        {
            float t   = 0f;
            float dur = 0.16f;
            while (t < dur)
            {
                t += Time.unscaledDeltaTime;
                float p = 1f - UIAnimator.EaseOut(t / dur);
                if (_panelGroup)    _panelGroup.alpha    = p;
                if (_backdropGroup) _backdropGroup.alpha = p * 0.65f;
                yield return null;
            }
            SetInstant(_panelGroup,    false);
            SetInstant(_backdropGroup, false);
            gameObject.SetActive(false);
        }

        static void SetInstant(CanvasGroup g, bool visible)
        {
            if (g == null) return;
            g.alpha          = visible ? 1f : 0f;
            g.blocksRaycasts = visible;
            g.interactable   = visible;
        }
    }

    // ── Options panel (inline component) ─────────────────────────────────────
    public sealed class OptionsPanel : MonoBehaviour
    {
        [SerializeField] CanvasGroup    _group;
        [SerializeField] Slider         _bgmSlider;
        [SerializeField] Slider         _sfxSlider;
        [SerializeField] Toggle         _fullscreenToggle;
        [SerializeField] Button         _closeButton;

        const string BGMKey        = "opt_bgm";
        const string SFXKey        = "opt_sfx";
        const string FullscreenKey = "opt_fs";

        void Awake()
        {
            _closeButton?.onClick.AddListener(Close);
            _bgmSlider?.onValueChanged.AddListener(v =>
            {
                PlayerPrefs.SetFloat(BGMKey, v);
                // Audio manager hook: AudioManager.Instance?.SetBGMVolume(v);
            });
            _sfxSlider?.onValueChanged.AddListener(v =>
            {
                PlayerPrefs.SetFloat(SFXKey, v);
                // AudioManager.Instance?.SetSFXVolume(v);
            });
            _fullscreenToggle?.onValueChanged.AddListener(v =>
            {
                Screen.fullScreen = v;
                PlayerPrefs.SetInt(FullscreenKey, v ? 1 : 0);
            });

            SetInstant(_group, false);
        }

        public void Open()
        {
            // Load saved prefs
            if (_bgmSlider)        _bgmSlider.value        = PlayerPrefs.GetFloat(BGMKey, 0.8f);
            if (_sfxSlider)        _sfxSlider.value        = PlayerPrefs.GetFloat(SFXKey, 1.0f);
            if (_fullscreenToggle) _fullscreenToggle.isOn  = PlayerPrefs.GetInt(FullscreenKey, 1) == 1;

            _group.blocksRaycasts = true;
            _group.interactable   = true;
            StartCoroutine(UIAnimator.FadeIn(_group, 0.15f));
        }

        void Close()
        {
            PlayerPrefs.Save();
            _group.blocksRaycasts = false;
            _group.interactable   = false;
            StartCoroutine(UIAnimator.FadeOut(_group, 0.12f));
        }

        static void SetInstant(CanvasGroup g, bool visible)
        {
            if (g == null) return;
            g.alpha          = visible ? 1f : 0f;
            g.blocksRaycasts = visible;
            g.interactable   = visible;
        }
    }
}
