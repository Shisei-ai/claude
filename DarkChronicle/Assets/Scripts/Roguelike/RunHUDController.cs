using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.UI;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// ローグライクラン中に常時表示される HUD。
    /// HP バー・ゴールド・精神値・レリック/呪いバー・フロア進捗に加え、
    /// キャラLv/EXPバー・職業Lv/JPバー・デッキ枚数・エンディングルート表示を備える。
    /// </summary>
    public sealed class RunHUDController : MonoBehaviour
    {
        public static RunHUDController Instance { get; private set; }

        // ── HP Bar ─────────────────────────────────────────────────────────
        [Header("HP")]
        [SerializeField] Slider              _hpSlider;
        [SerializeField] Slider              _hpGhostSlider;   // delayed drain effect
        [SerializeField] TextMeshProUGUI     _hpText;
        [SerializeField] Image               _hpFill;
        [SerializeField] Gradient            _hpColorGradient; // green → yellow → red

        // ── Resources ─────────────────────────────────────────────────────
        [Header("Resources")]
        [SerializeField] TextMeshProUGUI     _goldText;

        // ── Sanity ────────────────────────────────────────────────────────
        [Header("Sanity")]
        [SerializeField] TextMeshProUGUI     _sanityText;
        [SerializeField] Image               _sanityIcon;
        [SerializeField] Slider              _sanityBar;       // fill: (sanity+3)/6  center=0.5
        [SerializeField] Image               _sanityBarFill;   // colored per state

        // ── Level / EXP ───────────────────────────────────────────────────
        [Header("Level / EXP")]
        [SerializeField] TextMeshProUGUI     _levelText;       // "Lv.14"
        [SerializeField] Slider              _expBar;
        [SerializeField] TextMeshProUGUI     _expText;         // "1240 / 1500"
        [SerializeField] GameObject          _levelUpBadge;    // "LEVEL UP!" flash

        // ── Job Level / JP ────────────────────────────────────────────────
        [Header("Job Level / JP")]
        [SerializeField] TextMeshProUGUI     _jobLevelText;    // "職Lv.7"
        [SerializeField] Slider              _jpBar;
        [SerializeField] TextMeshProUGUI     _jpText;          // "140 / 350"
        [SerializeField] GameObject          _jobLevelUpBadge; // "JOB LEVEL UP!" flash

        // ── Floor Progress ─────────────────────────────────────────────────
        [Header("Floor Progress")]
        [SerializeField] TextMeshProUGUI     _floorText;
        [SerializeField] TextMeshProUGUI     _roomText;        // "3 / 14"
        [SerializeField] Image[]             _floorDots;       // 4 dots (Floor 1-4)
        [SerializeField] Color               _dotActive   = Color.white;
        [SerializeField] Color               _dotCurrent  = new(1f, 0.9f, 0.2f);
        [SerializeField] Color               _dotInactive = new(0.25f, 0.25f, 0.25f);

        // ── Relic Bar ─────────────────────────────────────────────────────
        [Header("Relic Bar")]
        [SerializeField] Transform           _relicBar;
        [SerializeField] GameObject          _relicSlotPrefab;
        [SerializeField] int                 _maxVisibleRelics = 12;
        [SerializeField] TextMeshProUGUI     _overflowText;    // "+N more"

        // ── Curse Bar ─────────────────────────────────────────────────────
        [Header("Curse Bar")]
        [SerializeField] Transform           _curseBar;
        [SerializeField] GameObject          _curseSlotPrefab;

        // ── Deck ──────────────────────────────────────────────────────────
        [Header("Deck")]
        [SerializeField] Button              _deckViewButton;
        [SerializeField] TextMeshProUGUI     _deckCountText;   // "12枚"

        // ── Ending Path ───────────────────────────────────────────────────
        [Header("Ending Path")]
        [SerializeField] GameObject          _endingPathRoot;  // hidden until relic acquired
        [SerializeField] TextMeshProUGUI     _endingPathText;  // e.g. "魔王再誕"
        [SerializeField] Image               _endingPathBg;    // tinted per ending
        [SerializeField] Image               _endingPathIcon;  // optional skull/eye/etc

        // ── Animations ─────────────────────────────────────────────────────
        [Header("Animations")]
        [SerializeField] float               _ghostDrainSpeed = 0.3f;
        [SerializeField] GameObject          _goldChangePrefab;
        [SerializeField] GameObject          _hpChangePrefab;
        [SerializeField] Transform           _floatingTextRoot;

        // ── State ──────────────────────────────────────────────────────────
        RunData    _run;
        float      _ghostHP;
        bool       _ghostDraining;

        // Change-detection sentinels
        int        _lastHP, _lastGold, _lastSanity;
        int        _lastLevel, _lastJobLevel;
        int        _lastRelicCount, _lastCurseCount;
        int        _lastDeckCount;
        EndingType _lastActiveEnding = (EndingType)(-1);

        // ── Lifecycle ──────────────────────────────────────────────────────
        void Awake() => Instance = this;

        public void InitForRun(RunData run)
        {
            _run     = run;
            _ghostHP = run.CurrentHP;

            _deckViewButton?.onClick.AddListener(() => DeckViewPanel.Instance?.OpenView());

            if (_levelUpBadge    != null) _levelUpBadge.SetActive(false);
            if (_jobLevelUpBadge != null) _jobLevelUpBadge.SetActive(false);
            if (_endingPathRoot  != null) _endingPathRoot.SetActive(false);

            RefreshAll();
        }

        // ── Update Loop ────────────────────────────────────────────────────
        void Update()
        {
            if (_run == null) return;

            if (_run.CurrentHP       != _lastHP)           OnHPChanged();
            if (_run.Gold            != _lastGold)         OnGoldChanged();
            if (_run.Sanity          != _lastSanity)       RefreshSanity();
            if (_run.CharacterLevel  != _lastLevel)        OnLevelChanged();
            if (_run.JobLevel        != _lastJobLevel)     OnJobLevelChanged();
            if (_run.Relics.Count    != _lastRelicCount)   RefreshRelics();
            if (_run.Curses.Count    != _lastCurseCount)   RefreshCurses();
            if (_run.Deck.Count      != _lastDeckCount)    RefreshDeckBadge();
            if (_run.ActiveEnding    != _lastActiveEnding) RefreshEndingPath();

            // Ghost HP drain animation
            if (_ghostDraining)
            {
                _ghostHP = Mathf.MoveTowards(_ghostHP, _run.CurrentHP,
                                             _run.MaxHP * _ghostDrainSpeed * Time.deltaTime);
                if (_hpGhostSlider != null)
                    _hpGhostSlider.value = _ghostHP / _run.MaxHP;
                if (Mathf.Abs(_ghostHP - _run.CurrentHP) < 0.5f)
                    _ghostDraining = false;
            }

            // EXP bar live-update (EXP changes continuously within the same level)
            if (_expBar != null)
                _expBar.value = LevelSystem.GetExpBarFill(_run);
            if (_jpBar != null)
                _jpBar.value  = LevelSystem.GetJPBarFill(_run);
        }

        // ── HP ─────────────────────────────────────────────────────────────
        void OnHPChanged()
        {
            int delta = _run.CurrentHP - _lastHP;
            _lastHP   = _run.CurrentHP;

            float ratio = _run.HPRatio;
            if (_hpSlider) _hpSlider.value = ratio;
            if (_hpText)   _hpText.text    = $"{_run.CurrentHP} / {_run.MaxHP}";
            if (_hpFill)   _hpFill.color   = _hpColorGradient.Evaluate(ratio);

            if (delta < 0)
            {
                _ghostDraining = true;
                ShowFloatingText(_hpChangePrefab, delta.ToString(), Color.red);
                if (ratio < 0.25f) StartCoroutine(PulseHPBar());
            }
            else if (delta > 0)
            {
                if (_hpGhostSlider != null) _hpGhostSlider.value = ratio;
                ShowFloatingText(_hpChangePrefab, $"+{delta}", Color.green);
            }
        }

        // ── Gold ───────────────────────────────────────────────────────────
        void OnGoldChanged()
        {
            int delta = _run.Gold - _lastGold;
            _lastGold = _run.Gold;
            if (_goldText) _goldText.text = $"{_run.Gold} G";
            ShowFloatingText(_goldChangePrefab,
                delta >= 0 ? $"+{delta} G" : $"{delta} G",
                delta >= 0 ? new Color(1f, 0.85f, 0.2f) : new Color(0.8f, 0.3f, 0.3f));
        }

        // ── Sanity ─────────────────────────────────────────────────────────
        void RefreshSanity()
        {
            _lastSanity = _run.Sanity;

            string sign = _run.Sanity >= 0 ? "+" : string.Empty;
            if (_sanityText) _sanityText.text = $"精神 {sign}{_run.Sanity}";

            // Icon tint: -3 = deep purple, 0 = white, +3 = gold
            Color iconColor = _run.Sanity >= 2  ? new Color(1f,  0.85f, 0.2f)  :  // gold
                              _run.Sanity >= 0  ? Color.white                   :
                              _run.Sanity >= -1 ? new Color(0.9f, 0.6f, 0.6f)  :  // pink warning
                                                   new Color(0.6f, 0.3f, 0.7f);   // deep purple
            if (_sanityIcon) _sanityIcon.color = iconColor;

            // Sanity bar: 0 = -3, 0.5 = 0 (neutral), 1 = +3
            float fill = (_run.Sanity + 3f) / 6f;
            if (_sanityBar) _sanityBar.value = fill;

            // Bar fill color mirrors icon tint
            if (_sanityBarFill) _sanityBarFill.color = iconColor;
        }

        // ── Character Level / EXP ──────────────────────────────────────────
        void OnLevelChanged()
        {
            bool leveled = _run.CharacterLevel > _lastLevel && _lastLevel > 0;
            _lastLevel   = _run.CharacterLevel;

            if (_levelText) _levelText.text = $"Lv.{_run.CharacterLevel}";

            float fill   = LevelSystem.GetExpBarFill(_run);
            int   needed = LevelSystem.ExpToNextLevel(_run.CharacterLevel);
            if (_expBar)  _expBar.value = fill;
            if (_expText) _expText.text = _run.CharacterLevel >= LevelSystem.MaxCharacterLevel
                ? "MAX"
                : $"{_run.CurrentEXP} / {needed}";

            if (leveled && _levelUpBadge != null)
                StartCoroutine(ShowBadge(_levelUpBadge));
        }

        // ── Job Level / JP ─────────────────────────────────────────────────
        void OnJobLevelChanged()
        {
            bool leveled  = _run.JobLevel > _lastJobLevel && _lastJobLevel > 0;
            _lastJobLevel = _run.JobLevel;

            if (_jobLevelText) _jobLevelText.text = $"職Lv.{_run.JobLevel}";

            float fill   = LevelSystem.GetJPBarFill(_run);
            int   needed = LevelSystem.JPToNextJobLevel(_run.JobLevel);
            if (_jpBar)  _jpBar.value = fill;
            if (_jpText) _jpText.text = _run.JobLevel >= LevelSystem.MaxJobLevel
                ? "MAX"
                : $"{_run.CurrentJobJP} / {needed}";

            if (leveled && _jobLevelUpBadge != null)
                StartCoroutine(ShowBadge(_jobLevelUpBadge));
        }

        // ── Deck Badge ─────────────────────────────────────────────────────
        void RefreshDeckBadge()
        {
            _lastDeckCount = _run.Deck.Count;
            if (_deckCountText) _deckCountText.text = $"{_run.Deck.Count}枚";
        }

        // ── Ending Path Indicator ──────────────────────────────────────────
        void RefreshEndingPath()
        {
            _lastActiveEnding = _run.ActiveEnding;
            bool active       = _run.ActiveEnding != EndingType.None;

            if (_endingPathRoot != null) _endingPathRoot.SetActive(active);
            if (!active) return;

            if (_endingPathText) _endingPathText.text = EndingPathLabel(_run.ActiveEnding);
            if (_endingPathBg)   _endingPathBg.color  = EndingPathColor(_run.ActiveEnding);

            // Brief pulse to draw attention when first set
            if (_endingPathRoot != null)
                StartCoroutine(PulseEndingIndicator());
        }

        // ── Relics ─────────────────────────────────────────────────────────
        void RefreshRelics()
        {
            _lastRelicCount = _run.Relics.Count;
            foreach (Transform child in _relicBar) Destroy(child.gameObject);

            int shown = Mathf.Min(_run.Relics.Count, _maxVisibleRelics);
            for (int i = 0; i < shown; i++)
            {
                var relic = _run.Relics[i];
                var go    = Instantiate(_relicSlotPrefab, _relicBar);
                var img   = go.GetComponent<Image>();
                if (img && relic.Icon) img.sprite = relic.Icon;
                var tip   = go.AddComponent<TooltipTrigger>();
                tip.SetText(relic.RelicName, $"【{relic.RarityLabel}】 {relic.Description}");
            }

            if (_overflowText != null)
            {
                int overflow = _run.Relics.Count - _maxVisibleRelics;
                _overflowText.text    = overflow > 0 ? $"+{overflow}" : string.Empty;
                _overflowText.enabled = overflow > 0;
            }
        }

        // ── Curses ─────────────────────────────────────────────────────────
        void RefreshCurses()
        {
            _lastCurseCount = _run.Curses.Count;
            foreach (Transform child in _curseBar) Destroy(child.gameObject);

            foreach (var curse in _run.Curses)
            {
                var go  = Instantiate(_curseSlotPrefab, _curseBar);
                var tip = go.AddComponent<TooltipTrigger>();
                tip.SetText($"【呪い】{curse.CurseName}", curse.Description);
            }
        }

        // ── Floor Progress ─────────────────────────────────────────────────
        /// <summary>
        /// フロア進捗ドットとルームカウンターを更新する。
        /// RoguelikeManager.RefreshHUD() から毎ループ呼び出す。
        /// </summary>
        public void RefreshFloor(int floorIndex, int nodeRow, int totalRows)
        {
            if (_floorText) _floorText.text = $"Floor {floorIndex + 1}";
            if (_roomText)  _roomText.text  = $"{Mathf.Max(nodeRow, 0)} / {totalRows}";

            for (int i = 0; i < _floorDots.Length; i++)
            {
                if (_floorDots[i] == null) continue;
                _floorDots[i].color = i < floorIndex  ? _dotActive   :
                                      i == floorIndex ? _dotCurrent  :
                                                         _dotInactive;
            }
        }

        // ── Full Refresh ───────────────────────────────────────────────────
        /// <summary>全セクションを次フレームで強制再描画する（ラン開始・再開時に使う）。</summary>
        public void ForceRefreshAll() => RefreshAll();

        void RefreshAll()
        {
            // Set sentinels to invalid values so every section fires in Update
            _lastHP          = _run.CurrentHP + 1;
            _lastGold        = _run.Gold + 1;
            _lastSanity      = _run.Sanity + 1;
            _lastLevel       = 0;   // triggers OnLevelChanged without leveled-up flag
            _lastJobLevel    = 0;
            _lastRelicCount  = -1;
            _lastCurseCount  = -1;
            _lastDeckCount   = -1;
            _lastActiveEnding = (EndingType)(-1);
            _ghostHP         = _run.CurrentHP;
        }

        // ── Animations ─────────────────────────────────────────────────────
        IEnumerator PulseHPBar()
        {
            if (_hpFill == null) yield break;
            Color base_ = _hpFill.color;
            float t = 0f;
            while (_run != null && _run.HPRatio < 0.25f)
            {
                t += Time.deltaTime * 3f;
                _hpFill.color = Color.Lerp(base_, Color.red, (Mathf.Sin(t) + 1f) * 0.3f);
                yield return null;
            }
            if (_hpFill != null)
                _hpFill.color = _hpColorGradient.Evaluate(_run?.HPRatio ?? 1f);
        }

        IEnumerator ShowBadge(GameObject badge)
        {
            badge.SetActive(true);
            var rt = badge.GetComponent<RectTransform>();
            var cg = badge.GetComponent<CanvasGroup>() ?? badge.AddComponent<CanvasGroup>();

            // Scale punch
            if (rt != null)
                yield return StartCoroutine(UIAnimator.Punch(rt, 1.25f, 0.3f));

            yield return new WaitForSeconds(1.2f);

            // Fade out
            float t = 0f;
            while (t < 0.4f)
            {
                t     += Time.deltaTime;
                cg.alpha = 1f - t / 0.4f;
                yield return null;
            }
            badge.SetActive(false);
            cg.alpha = 1f;
        }

        IEnumerator PulseEndingIndicator()
        {
            if (_endingPathBg == null) yield break;
            Color base_ = _endingPathBg.color;
            Color flash  = Color.Lerp(base_, Color.white, 0.5f);
            float t = 0f;
            while (t < 0.6f)
            {
                t += Time.deltaTime;
                float p = Mathf.PingPong(t * 4f, 1f);
                _endingPathBg.color = Color.Lerp(base_, flash, p);
                yield return null;
            }
            _endingPathBg.color = base_;
        }

        void ShowFloatingText(GameObject prefab, string text, Color color)
        {
            if (prefab == null || _floatingTextRoot == null) return;
            var go  = Instantiate(prefab, _floatingTextRoot);
            var tmp = go.GetComponentInChildren<TextMeshProUGUI>();
            if (tmp) { tmp.text = text; tmp.color = color; }
            StartCoroutine(UIAnimator.FloatFade(go.transform, Vector3.up * 60f, 1.5f));
        }

        // ── Ending Path Helpers ────────────────────────────────────────────
        static string EndingPathLabel(EndingType e) => e switch
        {
            EndingType.DemonKing  => "魔王再誕",
            EndingType.AbyssGod   => "深淵神覚醒",
            EndingType.TimeWraith => "時の亡霊",
            EndingType.CursedKing => "呪われた王",
            EndingType.TrueCore   => "世界の核",
            _                     => string.Empty,
        };

        static Color EndingPathColor(EndingType e) => e switch
        {
            EndingType.DemonKing  => new Color(0.55f, 0.05f, 0.05f, 0.88f),  // 深紅
            EndingType.AbyssGod   => new Color(0.05f, 0.08f, 0.45f, 0.88f),  // 深海青
            EndingType.TimeWraith => new Color(0.25f, 0.12f, 0.45f, 0.88f),  // 暗紫
            EndingType.CursedKing => new Color(0.35f, 0.04f, 0.35f, 0.88f),  // 暗紫紅
            EndingType.TrueCore   => new Color(0.06f, 0.06f, 0.06f, 0.92f),  // 漆黒
            _                     => new Color(0.15f, 0.15f, 0.15f, 0.88f),
        };
    }
}
