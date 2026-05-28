using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.UI
{
    /// <summary>
    /// In-game character status screen.
    /// Shows full stats, job skills, traits, and equipment.
    /// Design: Octopath Traveler stat page — clean columns, dark background.
    /// </summary>
    public sealed class StatusMenuUI : MonoBehaviour
    {
        // ── Root ────────────────────────────────────────────────────────────
        [Header("Root")]
        [SerializeField] CanvasGroup    _rootGroup;
        [SerializeField] RectTransform  _rootRect;

        // ── Header ──────────────────────────────────────────────────────────
        [Header("Character Header")]
        [SerializeField] Image           _portrait;
        [SerializeField] TextMeshProUGUI _nameText;
        [SerializeField] TextMeshProUGUI _jobText;
        [SerializeField] Image           _themeBar;

        // ── HP / MP bars ────────────────────────────────────────────────────
        [Header("HP/MP")]
        [SerializeField] Slider          _hpSlider;
        [SerializeField] Slider          _mpSlider;
        [SerializeField] TextMeshProUGUI _hpText;
        [SerializeField] TextMeshProUGUI _mpText;

        // ── Stats grid ──────────────────────────────────────────────────────
        [Header("Stats")]
        [SerializeField] TextMeshProUGUI _pAtkText;
        [SerializeField] TextMeshProUGUI _mAtkText;
        [SerializeField] TextMeshProUGUI _pDefText;
        [SerializeField] TextMeshProUGUI _mDefText;
        [SerializeField] TextMeshProUGUI _speedText;
        [SerializeField] TextMeshProUGUI _luckText;
        [SerializeField] TextMeshProUGUI _critText;

        // ── Skill list ──────────────────────────────────────────────────────
        [Header("Skills")]
        [SerializeField] Transform       _skillListRoot;
        [SerializeField] GameObject      _skillEntryPrefab;

        // ── Trait list ──────────────────────────────────────────────────────
        [Header("Traits")]
        [SerializeField] Transform       _traitListRoot;
        [SerializeField] GameObject      _traitEntryPrefab;

        // ── Status effects ──────────────────────────────────────────────────
        [Header("Status Effects")]
        [SerializeField] Transform       _statusIconRoot;
        [SerializeField] GameObject      _statusIconPrefab;

        // ── Detail tooltip ──────────────────────────────────────────────────
        [Header("Skill Detail Tooltip")]
        [SerializeField] CanvasGroup     _tooltipGroup;
        [SerializeField] TextMeshProUGUI _tooltipName;
        [SerializeField] TextMeshProUGUI _tooltipDesc;
        [SerializeField] TextMeshProUGUI _tooltipCost;

        // ── Navigation ──────────────────────────────────────────────────────
        [Header("Navigation")]
        [SerializeField] Button          _closeButton;
        [SerializeField] Button          _prevCharButton;
        [SerializeField] Button          _nextCharButton;

        BattleCharacter[] _party;
        int               _partyIndex;

        public event System.Action OnClosed;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            _closeButton?.onClick.AddListener(Close);
            _prevCharButton?.onClick.AddListener(ShowPrev);
            _nextCharButton?.onClick.AddListener(ShowNext);

            if (_tooltipGroup) { _tooltipGroup.alpha = 0f; _tooltipGroup.blocksRaycasts = false; }
            if (_rootGroup)    { _rootGroup.alpha    = 0f; _rootGroup.blocksRaycasts    = false; }
        }

        // ── Public API ─────────────────────────────────────────────────────
        public void Open(BattleCharacter[] party, int startIndex = 0)
        {
            _party      = party;
            _partyIndex = Mathf.Clamp(startIndex, 0, party.Length - 1);
            gameObject.SetActive(true);
            Populate(party[_partyIndex]);
            StartCoroutine(OpenRoutine());
        }

        public void Close()
        {
            StartCoroutine(CloseRoutine());
        }

        // ── Animation ──────────────────────────────────────────────────────
        IEnumerator OpenRoutine()
        {
            if (_rootRect)
                yield return StartCoroutine(UIAnimator.SlideIn(_rootRect,
                    _rootRect.anchoredPosition + Vector2.right * 60f,
                    _rootRect.anchoredPosition, 0.22f));
            else
                yield return StartCoroutine(UIAnimator.FadeIn(_rootGroup, 0.2f));
        }

        IEnumerator CloseRoutine()
        {
            yield return StartCoroutine(UIAnimator.FadeOut(_rootGroup, 0.18f));
            gameObject.SetActive(false);
            OnClosed?.Invoke();
        }

        // ── Populate ───────────────────────────────────────────────────────
        void Populate(BattleCharacter c)
        {
            if (c?.CharData == null) return;
            var data = c.CharData;

            if (_portrait  && data.Portrait)    _portrait.sprite  = data.Portrait;
            if (_nameText)  _nameText.text  = data.CharacterName;
            if (_jobText)   _jobText.text   = data.StarterJob?.JobName ?? string.Empty;
            if (_themeBar)  _themeBar.color = data.ThemeColor;

            // HP / MP
            if (_hpSlider) _hpSlider.value = c.HPRatio;
            if (_mpSlider) _mpSlider.value = c.MaxMP > 0 ? (float)c.MP / c.MaxMP : 0f;
            if (_hpText)   _hpText.text    = $"{c.HP} / {c.MaxHP}";
            if (_mpText)   _mpText.text    = $"{c.MP} / {c.MaxMP}";

            // Stats
            SetStatText(_pAtkText,  "物理攻撃",  c.Patk);
            SetStatText(_mAtkText,  "魔法攻撃",  c.Matk);
            SetStatText(_pDefText,  "物理防御",  c.Pdef);
            SetStatText(_mDefText,  "魔法防御",  c.Mdef);
            SetStatText(_speedText, "速度",      c.Speed);
            SetStatText(_luckText,  "運",        c.Luck);
            SetStatText(_critText,  "会心",      c.Crit);

            PopulateSkillList(c);
            PopulateTraitList(c);
            PopulateStatusIcons(c);

            UpdateNavButtons();
        }

        void SetStatText(TextMeshProUGUI label, string name, int value)
        {
            if (label) label.text = $"{name}  {value}";
        }

        void PopulateSkillList(BattleCharacter c)
        {
            if (_skillListRoot == null || _skillEntryPrefab == null) return;
            foreach (Transform child in _skillListRoot) Destroy(child.gameObject);

            var job = c.CharData?.StarterJob;
            if (job?.LearnableSkills == null) return;

            foreach (var entry in job.LearnableSkills)
            {
                if (entry.Skill == null) continue;
                var go    = Instantiate(_skillEntryPrefab, _skillListRoot);
                var texts = go.GetComponentsInChildren<TextMeshProUGUI>();
                if (texts.Length >= 1) texts[0].text  = entry.Skill.SkillName;
                if (texts.Length >= 2)
                {
                    texts[1].text  = $"MP {entry.Skill.MPCost}";
                    texts[1].color = new Color(0.6f, 0.85f, 1f);
                }
                if (texts.Length >= 3) texts[2].text = entry.Skill.Description;

                // Element indicator
                var icon = go.GetComponentInChildren<Image>();
                if (icon != null) icon.color = GetElementColor(entry.Skill.Element);

                // Hover tooltip
                var btn = go.GetComponent<Button>();
                if (btn != null)
                {
                    var captured = entry.Skill;
                    btn.onClick.AddListener(() => ShowSkillTooltip(captured));
                }
            }
        }

        void PopulateTraitList(BattleCharacter c)
        {
            if (_traitListRoot == null || _traitEntryPrefab == null) return;
            foreach (Transform child in _traitListRoot) Destroy(child.gameObject);

            if (c.CharData?.Traits == null) return;
            foreach (var trait in c.CharData.Traits)
            {
                if (trait == null) continue;
                var go  = Instantiate(_traitEntryPrefab, _traitListRoot);
                var txt = go.GetComponentInChildren<TextMeshProUGUI>();
                if (txt) txt.text = trait.name;   // ScriptableObject asset name
            }
        }

        void PopulateStatusIcons(BattleCharacter c)
        {
            if (_statusIconRoot == null) return;
            foreach (Transform child in _statusIconRoot) Destroy(child.gameObject);
            if (_statusIconPrefab == null) return;

            foreach (var s in c.StatusEffects)
            {
                var go  = Instantiate(_statusIconPrefab, _statusIconRoot);
                var txt = go.GetComponentInChildren<TextMeshProUGUI>();
                if (txt) txt.text = $"{s.Type}  {s.RemainingTurns}T";
            }
        }

        void ShowSkillTooltip(SkillData skill)
        {
            if (_tooltipGroup == null) return;
            if (_tooltipName) _tooltipName.text = skill.SkillName;
            if (_tooltipDesc) _tooltipDesc.text = skill.Description;
            if (_tooltipCost) _tooltipCost.text = $"MP {skill.MPCost}  {skill.Element}";
            StartCoroutine(UIAnimator.FadeIn(_tooltipGroup, 0.12f));
        }

        void HideTooltip()
        {
            if (_tooltipGroup != null)
                StartCoroutine(UIAnimator.FadeOut(_tooltipGroup, 0.1f));
        }

        // ── Navigation ─────────────────────────────────────────────────────
        void ShowPrev()
        {
            if (_party == null || _party.Length <= 1) return;
            _partyIndex = (_partyIndex - 1 + _party.Length) % _party.Length;
            HideTooltip();
            Populate(_party[_partyIndex]);
            if (_rootRect)
                StartCoroutine(UIAnimator.SlideIn(_rootRect,
                    _rootRect.anchoredPosition + Vector2.right * 30f,
                    _rootRect.anchoredPosition, 0.14f));
        }

        void ShowNext()
        {
            if (_party == null || _party.Length <= 1) return;
            _partyIndex = (_partyIndex + 1) % _party.Length;
            HideTooltip();
            Populate(_party[_partyIndex]);
            if (_rootRect)
                StartCoroutine(UIAnimator.SlideIn(_rootRect,
                    _rootRect.anchoredPosition + Vector2.left * 30f,
                    _rootRect.anchoredPosition, 0.14f));
        }

        void UpdateNavButtons()
        {
            bool multi = _party != null && _party.Length > 1;
            if (_prevCharButton) _prevCharButton.gameObject.SetActive(multi);
            if (_nextCharButton) _nextCharButton.gameObject.SetActive(multi);
        }

        static Color GetElementColor(ElementType el) => el switch
        {
            ElementType.Fire      => new Color(1f,  0.4f, 0.1f),
            ElementType.Ice       => new Color(0.4f, 0.8f, 1f),
            ElementType.Lightning => new Color(1f,  0.95f, 0.1f),
            ElementType.Wind      => new Color(0.4f, 1f,  0.4f),
            ElementType.Dark      => new Color(0.6f, 0.1f, 0.8f),
            ElementType.Light     => new Color(1f,  1f,  0.7f),
            ElementType.Poison    => new Color(0.5f, 0.9f, 0.2f),
            ElementType.Bleed     => new Color(0.9f, 0.15f, 0.15f),
            _                     => Color.gray,
        };
    }
}
