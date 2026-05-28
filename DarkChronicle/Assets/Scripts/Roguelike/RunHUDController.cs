using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Persistent HUD overlay visible during field/map/battle: shows HP, Gold, Luck,
    /// relic/curse bar, floor progress, and animates resource changes.
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
        [SerializeField] TextMeshProUGUI     _luckText;
        [SerializeField] Image               _luckIcon;

        // ── Floor Progress ─────────────────────────────────────────────────
        [Header("Floor Progress")]
        [SerializeField] TextMeshProUGUI     _floorText;
        [SerializeField] TextMeshProUGUI     _roomText;
        [SerializeField] Image[]             _floorDots;       // 3 dots, one per floor
        [SerializeField] Color               _dotActive   = Color.white;
        [SerializeField] Color               _dotInactive = new(0.3f, 0.3f, 0.3f);

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

        // ── Animations ─────────────────────────────────────────────────────
        [Header("Animations")]
        [SerializeField] float               _ghostDrainSpeed = 0.3f;
        [SerializeField] GameObject          _goldChangePrefab;
        [SerializeField] GameObject          _hpChangePrefab;
        [SerializeField] Transform           _floatingTextRoot;

        // ── State ──────────────────────────────────────────────────────────
        RunData _run;
        float   _ghostHP;
        bool    _ghostDraining;

        // Cached values for change detection
        int     _lastHP, _lastGold, _lastSanity;
        int     _lastRelicCount, _lastCurseCount;

        void Awake() => Instance = this;

        public void InitForRun(RunData run)
        {
            _run    = run;
            _ghostHP = run.CurrentHP;
            RefreshAll();
        }

        void Update()
        {
            if (_run == null) return;

            // Detect changes and animate
            if (_run.CurrentHP != _lastHP)       OnHPChanged();
            if (_run.Gold != _lastGold)           OnGoldChanged();
            if (_run.Sanity != _lastSanity)       RefreshSanity();
            if (_run.Relics.Count != _lastRelicCount) RefreshRelics();
            if (_run.Curses.Count != _lastCurseCount) RefreshCurses();

            // Ghost HP drain
            if (_ghostDraining)
            {
                _ghostHP = Mathf.MoveTowards(_ghostHP, _run.CurrentHP,
                                             _run.MaxHP * _ghostDrainSpeed * Time.deltaTime);
                if (_hpGhostSlider != null)
                    _hpGhostSlider.value = _ghostHP / _run.MaxHP;
                if (Mathf.Abs(_ghostHP - _run.CurrentHP) < 0.5f) _ghostDraining = false;
            }
        }

        // ── Change Handlers ────────────────────────────────────────────────
        void OnHPChanged()
        {
            int delta = _run.CurrentHP - _lastHP;
            _lastHP   = _run.CurrentHP;

            // Update bar
            float ratio = _run.HPRatio;
            if (_hpSlider)    _hpSlider.value = ratio;
            if (_hpText)      _hpText.text    = $"{_run.CurrentHP} / {_run.MaxHP}";
            if (_hpFill)      _hpFill.color   = _hpColorGradient.Evaluate(ratio);

            // Ghost effect
            if (delta < 0)
            {
                _ghostDraining = true;
                ShowFloatingText(_hpChangePrefab, delta.ToString(), delta > 0 ? Color.green : Color.red);
            }
            else if (delta > 0)
            {
                if (_hpGhostSlider != null) _hpGhostSlider.value = ratio;
                ShowFloatingText(_hpChangePrefab, $"+{delta}", Color.green);
            }

            // Pulse the HP bar red when low
            if (ratio < 0.25f) StartCoroutine(PulseHPBar());
        }

        void OnGoldChanged()
        {
            int delta   = _run.Gold - _lastGold;
            _lastGold   = _run.Gold;
            if (_goldText) _goldText.text = $"{_run.Gold} G";
            ShowFloatingText(_goldChangePrefab,
                delta >= 0 ? $"+{delta} G" : $"{delta} G",
                delta >= 0 ? new Color(1f, 0.85f, 0.2f) : new Color(0.8f, 0.3f, 0.3f));
        }

        void RefreshSanity()
        {
            _lastSanity = _run.Sanity;
            string sign = _run.Sanity >= 0 ? "+" : string.Empty;
            if (_luckText) _luckText.text = $"精神 {sign}{_run.Sanity}";
            // Color: -3 = sickly purple, 0 = white, +3 = calm gold
            if (_luckIcon)
            {
                _luckIcon.color = _run.Sanity >= 2  ? new Color(1f,  0.85f, 0.2f) :  // gold
                                  _run.Sanity >= 0  ? Color.white                  :  // neutral
                                  _run.Sanity >= -1 ? new Color(0.9f, 0.6f, 0.6f) :  // pink warning
                                                      new Color(0.6f, 0.3f, 0.7f);   // deep purple
            }
        }

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
                tip.SetText(relic.RelicName, relic.Description);
            }

            if (_overflowText != null)
            {
                int overflow = _run.Relics.Count - _maxVisibleRelics;
                _overflowText.text    = overflow > 0 ? $"+{overflow}" : string.Empty;
                _overflowText.enabled = overflow > 0;
            }
        }

        void RefreshCurses()
        {
            _lastCurseCount = _run.Curses.Count;
            foreach (Transform child in _curseBar) Destroy(child.gameObject);

            foreach (var curse in _run.Curses)
            {
                var go  = Instantiate(_curseSlotPrefab, _curseBar);
                var tip = go.AddComponent<TooltipTrigger>();
                tip.SetText(curse.CurseName, curse.Description);
            }
        }

        public void RefreshFloor(int floor, int room, int totalRooms)
        {
            if (_floorText) _floorText.text = $"Floor {floor + 1}";
            if (_roomText)  _roomText.text  = $"{room} / {totalRooms}";

            for (int i = 0; i < _floorDots.Length; i++)
                if (_floorDots[i]) _floorDots[i].color = i <= floor ? _dotActive : _dotInactive;
        }

        void RefreshAll()
        {
            _lastHP         = _run.CurrentHP + 1;  // force update
            _lastGold       = _run.Gold + 1;
            _lastSanity     = _run.Sanity + 1;  // +1 forces RefreshSanity on first frame
            _lastRelicCount = -1;
            _lastCurseCount = -1;
        }

        // ── Animations ─────────────────────────────────────────────────────
        IEnumerator PulseHPBar()
        {
            if (_hpFill == null) yield break;
            float t = 0f;
            Color base_ = _hpFill.color;
            while (_run.HPRatio < 0.25f)
            {
                t += Time.deltaTime * 3f;
                _hpFill.color = Color.Lerp(base_, Color.red, (Mathf.Sin(t) + 1f) * 0.3f);
                yield return null;
            }
            _hpFill.color = _hpColorGradient.Evaluate(_run.HPRatio);
        }

        void ShowFloatingText(GameObject prefab, string text, Color color)
        {
            if (prefab == null || _floatingTextRoot == null) return;
            var go  = Instantiate(prefab, _floatingTextRoot);
            var tmp = go.GetComponentInChildren<TextMeshProUGUI>();
            if (tmp) { tmp.text = text; tmp.color = color; }
            StartCoroutine(FloatAndFade(go.transform, 1.5f));
        }

        IEnumerator FloatAndFade(Transform t, float duration)
        {
            Vector3 start   = t.position;
            var     group   = t.GetComponent<CanvasGroup>();
            float   elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed     += Time.deltaTime;
                float p      = elapsed / duration;
                t.position   = start + Vector3.up * (p * 60f);
                if (group) group.alpha = 1f - p * p;
                yield return null;
            }
            Destroy(t.gameObject);
        }
    }
}
