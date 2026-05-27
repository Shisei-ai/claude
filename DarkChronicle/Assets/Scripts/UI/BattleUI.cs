using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Manages all in-battle UI: HP/MP/BP bars, command menu, damage numbers,
    /// turn order display, and skill names — all with HD-2D animation polish.
    /// </summary>
    public sealed class BattleUI : MonoBehaviour
    {
        // ── Hero Panel ─────────────────────────────────────────────────────
        [Header("Hero Status Panels")]
        [SerializeField] HeroStatusPanel[] _heroPanels;

        // ── Command Menu ───────────────────────────────────────────────────
        [Header("Command Menu")]
        [SerializeField] GameObject     _commandMenuRoot;
        [SerializeField] Button         _attackButton;
        [SerializeField] Button         _skillButton;
        [SerializeField] Button         _itemButton;
        [SerializeField] Button         _fleeButton;
        [SerializeField] GameObject     _skillListRoot;
        [SerializeField] Transform      _skillListContent;
        [SerializeField] GameObject     _skillEntryPrefab;

        // ── Boost UI ───────────────────────────────────────────────────────
        [Header("Boost UI")]
        [SerializeField] Image[]        _bpDots;          // 5 dots
        [SerializeField] Image[]        _boostDots;       // 3 boost slots
        [SerializeField] Button         _boostButton;
        [SerializeField] TextMeshProUGUI _boostLabel;

        // ── Turn Order ─────────────────────────────────────────────────────
        [Header("Turn Order")]
        [SerializeField] Transform      _turnOrderRoot;
        [SerializeField] GameObject     _turnOrderIconPrefab;

        // ── Damage Numbers ─────────────────────────────────────────────────
        [Header("Damage Numbers")]
        [SerializeField] GameObject     _damageNumberPrefab;
        [SerializeField] GameObject     _healNumberPrefab;
        [SerializeField] GameObject     _statusNumberPrefab;

        // ── Skill Name Flash ───────────────────────────────────────────────
        [Header("Skill Name Flash")]
        [SerializeField] CanvasGroup    _skillNameGroup;
        [SerializeField] TextMeshProUGUI _skillNameText;

        // ── Message Box ────────────────────────────────────────────────────
        [Header("Message")]
        [SerializeField] TextMeshProUGUI _messageText;
        [SerializeField] CanvasGroup    _messageGroup;

        // ── Victory / Defeat ───────────────────────────────────────────────
        [Header("Result Screens")]
        [SerializeField] CanvasGroup    _victoryScreen;
        [SerializeField] CanvasGroup    _defeatScreen;

        // ── State ──────────────────────────────────────────────────────────
        BattleCharacter _activeHero;
        int             _pendingBoosts;
        Coroutine       _messageCoroutine;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            _attackButton.onClick.AddListener(OnAttackPressed);
            _skillButton .onClick.AddListener(OnSkillPressed);
            _itemButton  .onClick.AddListener(OnItemPressed);
            _fleeButton  .onClick.AddListener(OnFleePressed);
            _boostButton .onClick.AddListener(OnBoostPressed);

            _commandMenuRoot.SetActive(false);
            _skillNameGroup.alpha = 0f;
            _victoryScreen.alpha  = 0f;
            _defeatScreen.alpha   = 0f;
        }

        // ── Public API ─────────────────────────────────────────────────────
        public void ShowPlayerCommandMenu(BattleCharacter hero)
        {
            _activeHero   = hero;
            _pendingBoosts = 0;
            _commandMenuRoot.SetActive(true);
            _skillListRoot.SetActive(false);
            RefreshBPDisplay(hero);
            RefreshBoostDisplay();
        }

        public void HighlightActive(BattleCharacter c)
        {
            foreach (var p in _heroPanels) p.SetHighlight(false);
            if (c.IsPlayer)
            {
                var panel = GetHeroPanel(c);
                panel?.SetHighlight(true);
            }
        }

        public void UpdateHeroPanel(BattleCharacter hero)
        {
            var panel = GetHeroPanel(hero);
            panel?.Refresh(hero);
        }

        public void UpdateTurnOrder(List<BattleCharacter> order)
        {
            // Clear old icons
            foreach (Transform child in _turnOrderRoot) Destroy(child.gameObject);

            // Show next 8 slots
            int shown = Mathf.Min(order.Count, 8);
            for (int i = 0; i < shown; i++)
            {
                var icon = Instantiate(_turnOrderIconPrefab, _turnOrderRoot).GetComponent<TurnOrderIcon>();
                icon?.Setup(order[i]);
            }
        }

        public void ShowDamageNumber(BattleCharacter target, int amount, bool isCrit)
        {
            var go  = Instantiate(_damageNumberPrefab);
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt != null)
            {
                txt.text  = isCrit ? $"<b>{amount}</b>!" : amount.ToString();
                txt.color = isCrit ? new Color(1f, 0.9f, 0.1f) : Color.white;
            }
            StartCoroutine(FloatAndFade(go.transform, Vector3.up * 1.5f, 1.2f));
        }

        public void ShowHealNumber(BattleCharacter target, int amount)
        {
            var go  = Instantiate(_healNumberPrefab);
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt != null) { txt.text = $"+{amount}"; txt.color = new Color(0.3f, 1f, 0.5f); }
            StartCoroutine(FloatAndFade(go.transform, Vector3.up * 1.2f, 1.0f));
        }

        public void ShowSkillName(string skillName)
        {
            StopCoroutine(nameof(FlashSkillName));
            StartCoroutine(FlashSkillName(skillName));
        }

        public void ShowMessage(string msg)
        {
            if (_messageCoroutine != null) StopCoroutine(_messageCoroutine);
            _messageCoroutine = StartCoroutine(ShowMessageCoroutine(msg));
        }

        public void ShowDefeatAnimation(BattleCharacter c)
        {
            var panel = GetHeroPanel(c);
            panel?.PlayDefeatAnimation();
        }

        public void PlayIntroAnimation() => StartCoroutine(IntroAnimation());

        public void ShowVictoryScreen() => StartCoroutine(FadeIn(_victoryScreen, 1.5f));
        public void ShowDefeatScreen()  => StartCoroutine(FadeIn(_defeatScreen,  1.5f));

        // ── Button Handlers ────────────────────────────────────────────────
        void OnAttackPressed()
        {
            _commandMenuRoot.SetActive(false);
            BattleManager.Instance.PlayerCommandSelected(new BattleCommand
            {
                Type       = CommandType.Attack,
                Targets    = GetDefaultTargets(),
                BoostLevel = _pendingBoosts
            });
        }

        void OnSkillPressed()
        {
            _skillListRoot.SetActive(true);
            PopulateSkillList();
        }

        void OnItemPressed()
        {
            // TODO: open item selection
        }

        void OnFleePressed()
        {
            _commandMenuRoot.SetActive(false);
            BattleManager.Instance.PlayerCommandSelected(new BattleCommand { Type = CommandType.Flee });
        }

        void OnBoostPressed()
        {
            if (_activeHero == null || _activeHero.BP <= 0 || _pendingBoosts >= 3) return;
            if (_activeHero.UseBoost(1))
            {
                _pendingBoosts++;
                RefreshBPDisplay(_activeHero);
                RefreshBoostDisplay();
            }
        }

        // ── Helpers ────────────────────────────────────────────────────────
        void PopulateSkillList()
        {
            foreach (Transform child in _skillListContent) Destroy(child.gameObject);
            // TODO: iterate active hero's job skills, instantiate entries
        }

        void RefreshBPDisplay(BattleCharacter hero)
        {
            for (int i = 0; i < _bpDots.Length; i++)
            {
                _bpDots[i].color = i < hero.BP
                    ? new Color(1f, 0.85f, 0.2f)
                    : new Color(0.2f, 0.2f, 0.25f);
            }
        }

        void RefreshBoostDisplay()
        {
            for (int i = 0; i < _boostDots.Length; i++)
                _boostDots[i].color = i < _pendingBoosts
                    ? new Color(1f, 0.6f, 0.1f)
                    : new Color(0.2f, 0.2f, 0.25f);
            _boostLabel.text = _pendingBoosts > 0 ? $"BOOST ×{_pendingBoosts + 1}" : "BOOST";
        }

        HeroStatusPanel GetHeroPanel(BattleCharacter hero)
        {
            for (int i = 0; i < _heroPanels.Length; i++)
                if (_heroPanels[i].Character == hero) return _heroPanels[i];
            return null;
        }

        List<BattleCharacter> GetDefaultTargets()
        {
            // Default: single enemy with lowest HP
            // TODO: player selects via cursor
            return new List<BattleCharacter>();
        }

        // ── Coroutines ─────────────────────────────────────────────────────
        IEnumerator FloatAndFade(Transform t, Vector3 delta, float duration)
        {
            Vector3 start = t.position;
            var group     = t.GetComponent<CanvasGroup>();
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float p  = elapsed / duration;
                t.position = start + delta * p;
                if (group != null) group.alpha = 1f - p * p;
                yield return null;
            }
            Destroy(t.gameObject);
        }

        IEnumerator FlashSkillName(string name)
        {
            _skillNameText.text = name;
            yield return StartCoroutine(FadeCanvasGroup(_skillNameGroup, 0f, 1f, 0.2f));
            yield return new WaitForSeconds(0.8f);
            yield return StartCoroutine(FadeCanvasGroup(_skillNameGroup, 1f, 0f, 0.4f));
        }

        IEnumerator ShowMessageCoroutine(string msg)
        {
            _messageText.text = msg;
            yield return StartCoroutine(FadeCanvasGroup(_messageGroup, 0f, 1f, 0.2f));
            yield return new WaitForSeconds(1.5f);
            yield return StartCoroutine(FadeCanvasGroup(_messageGroup, 1f, 0f, 0.3f));
        }

        IEnumerator FadeCanvasGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha   = from;
            while (elapsed < duration)
            {
                elapsed     += Time.deltaTime;
                group.alpha  = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
        }

        IEnumerator FadeIn(CanvasGroup group, float duration)
        {
            yield return StartCoroutine(FadeCanvasGroup(group, 0f, 1f, duration));
        }

        IEnumerator IntroAnimation()
        {
            // Wipe effect, camera shake, dramatic reveal
            _camera?.Shake(0.3f);
            yield return new WaitForSeconds(0.5f);
        }
    }

    // ── Hero Status Panel Component ────────────────────────────────────────
    [System.Serializable]
    public class HeroStatusPanel
    {
        public BattleCharacter  Character;
        public TextMeshProUGUI  NameText;
        public Slider           HPSlider;
        public Slider           MPSlider;
        public TextMeshProUGUI  HPText;
        public TextMeshProUGUI  MPText;
        public Image            Portrait;
        public CanvasGroup      Group;
        public Image            HighlightFrame;

        public void Refresh(BattleCharacter c)
        {
            Character = c;
            if (NameText) NameText.text = c.DisplayName;
            if (HPSlider) HPSlider.value = c.HPRatio;
            if (MPSlider) MPSlider.value = c.MaxMP > 0 ? (float)c.HP / c.MaxMP : 0f;
            if (HPText)   HPText.text    = $"{c.HP}/{c.MaxHP}";
            if (MPText)   MPText.text    = $"{c.MP}/{c.MaxMP}";
        }

        public void SetHighlight(bool active)
        {
            if (HighlightFrame) HighlightFrame.enabled = active;
        }

        public void PlayDefeatAnimation()
        {
            // Greyscale the portrait, fade down panel
            if (Portrait) Portrait.color = new Color(0.5f, 0.5f, 0.5f, 0.7f);
        }
    }

    // ── Turn Order Icon Component ──────────────────────────────────────────
    public class TurnOrderIcon : MonoBehaviour
    {
        [SerializeField] Image            _portrait;
        [SerializeField] Image            _background;
        [SerializeField] TextMeshProUGUI  _nameText;

        public void Setup(BattleCharacter c)
        {
            if (_nameText) _nameText.text = c.DisplayName;
            if (_background)
                _background.color = c.IsPlayer ? new Color(0.2f, 0.4f, 0.8f, 0.8f)
                                               : new Color(0.6f, 0.1f, 0.1f, 0.8f);
        }
    }
}
