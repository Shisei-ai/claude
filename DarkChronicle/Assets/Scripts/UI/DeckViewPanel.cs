using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Data;
using DarkChronicle.Roguelike;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Full-screen deck viewer.
    /// OpenView()        — read-only, from HUD deck button.
    /// OpenRemoveMode()  — coroutine; player picks one skill to remove.
    /// </summary>
    public sealed class DeckViewPanel : MonoBehaviour
    {
        public static DeckViewPanel Instance { get; private set; }

        [Header("Panel")]
        [SerializeField] CanvasGroup        _group;
        [SerializeField] TextMeshProUGUI    _headerText;
        [SerializeField] Button             _closeButton;

        [Header("Card Grid")]
        [SerializeField] Transform          _cardContainer;
        [SerializeField] GameObject         _cardPrefab;

        [Header("Detail Sidebar")]
        [SerializeField] CanvasGroup        _detailGroup;
        [SerializeField] Image              _detailIcon;
        [SerializeField] TextMeshProUGUI    _detailName;
        [SerializeField] TextMeshProUGUI    _detailDesc;
        [SerializeField] TextMeshProUGUI    _detailCost;
        [SerializeField] Button             _removeConfirmButton;
        [SerializeField] TextMeshProUGUI    _removeConfirmLabel;

        RunData  _run;
        SkillData _selectedSkill;
        bool     _isOpen;
        bool     _removeMode;
        System.Action<SkillData> _onRemoveCallback;

        void Awake()
        {
            Instance = this;
            if (_group) { _group.alpha = 0f; _group.blocksRaycasts = false; }
            if (_detailGroup) { _detailGroup.alpha = 0f; _detailGroup.blocksRaycasts = false; }
            _closeButton?.onClick.AddListener(() => _isOpen = false);
        }

        public void InitForRun(RunData run) => _run = run;

        // ── View-only ───────────────────────────────────────────────────────
        public void OpenView()
        {
            if (_isOpen || _run == null) return;
            StartCoroutine(ViewRoutine());
        }

        IEnumerator ViewRoutine()
        {
            _removeMode = false;
            _selectedSkill = null;
            if (_headerText) _headerText.text = $"デッキ一覧（{_run.Deck.Count}枚）";
            _removeConfirmButton?.gameObject.SetActive(false);
            HideDetail();
            BuildCards();

            _isOpen = true;
            yield return FadeGroup(_group, 0f, 1f, 0.3f);
            while (_isOpen) yield return null;
            yield return FadeGroup(_group, 1f, 0f, 0.25f);
        }

        // ── Remove mode ─────────────────────────────────────────────────────
        public IEnumerator OpenRemoveMode(System.Action<SkillData> onSelected)
        {
            _onRemoveCallback = onSelected;
            _removeMode       = true;
            _selectedSkill    = null;

            if (_headerText) _headerText.text = "削除するスキルを選択";
            if (_removeConfirmButton)
            {
                _removeConfirmButton.gameObject.SetActive(true);
                _removeConfirmButton.interactable = false;
                _removeConfirmButton.onClick.RemoveAllListeners();
                _removeConfirmButton.onClick.AddListener(ConfirmRemove);
            }
            if (_removeConfirmLabel) _removeConfirmLabel.text = "このスキルを削除";
            HideDetail();
            BuildCards();

            _isOpen = true;
            yield return FadeGroup(_group, 0f, 1f, 0.3f);
            while (_isOpen) yield return null;
            yield return FadeGroup(_group, 1f, 0f, 0.25f);
        }

        // ── Card building ───────────────────────────────────────────────────
        void BuildCards()
        {
            foreach (Transform child in _cardContainer) Destroy(child.gameObject);
            if (_run == null) return;

            foreach (var skill in _run.Deck)
            {
                var go  = Instantiate(_cardPrefab, _cardContainer);
                SetupCard(go, skill);
                var cap = skill;
                var btn = go.GetComponent<Button>() ?? go.GetComponentInChildren<Button>();
                btn?.onClick.AddListener(() => OnCardClicked(cap));
            }
        }

        void SetupCard(GameObject go, SkillData skill)
        {
            var img = go.GetComponent<Image>();
            if (img) img.color = ElementColor(skill.Element);

            var icon = go.transform.Find("Icon")?.GetComponent<Image>();
            if (icon && skill.Icon) icon.sprite = skill.Icon;

            var texts = go.GetComponentsInChildren<TextMeshProUGUI>();
            if (texts.Length > 0) texts[0].text = skill.SkillName;
            if (texts.Length > 1) texts[1].text = $"MP:{skill.MPCost}";
        }

        void OnCardClicked(SkillData skill)
        {
            _selectedSkill = skill;
            ShowDetail(skill);
            if (_removeMode && _removeConfirmButton != null)
                _removeConfirmButton.interactable = true;
        }

        void ShowDetail(SkillData skill)
        {
            if (_detailGroup == null) return;
            if (_detailIcon) _detailIcon.sprite = skill.Icon;
            if (_detailName) _detailName.text   = skill.SkillName;
            if (_detailDesc) _detailDesc.text   = skill.Description;
            if (_detailCost) _detailCost.text   = $"MP消費: {skill.MPCost}";
            _detailGroup.alpha          = 1f;
            _detailGroup.blocksRaycasts = true;
        }

        void HideDetail()
        {
            if (_detailGroup == null) return;
            _detailGroup.alpha          = 0f;
            _detailGroup.blocksRaycasts = false;
        }

        void ConfirmRemove()
        {
            if (_selectedSkill == null) return;
            _run.RemoveSkill(_selectedSkill);
            _onRemoveCallback?.Invoke(_selectedSkill);
            _isOpen = false;
        }

        // ── Helpers ─────────────────────────────────────────────────────────
        static Color ElementColor(ElementType element) => element switch
        {
            ElementType.Fire      => new Color(1f,   0.35f, 0.1f,  0.35f),
            ElementType.Ice       => new Color(0.3f, 0.7f,  1f,    0.35f),
            ElementType.Lightning => new Color(1f,   0.95f, 0.1f,  0.35f),
            ElementType.Wind      => new Color(0.4f, 0.9f,  0.5f,  0.35f),
            ElementType.Dark      => new Color(0.5f, 0.1f,  0.8f,  0.35f),
            ElementType.Light     => new Color(1f,   1f,    0.6f,  0.35f),
            ElementType.Physical  => new Color(0.7f, 0.5f,  0.3f,  0.35f),
            _                     => new Color(0.3f, 0.3f,  0.3f,  0.35f),
        };

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            if (group == null) yield break;
            float elapsed = 0f;
            group.alpha          = from;
            group.blocksRaycasts = to > 0.5f;
            while (elapsed < duration)
            {
                elapsed     += Time.deltaTime;
                group.alpha  = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha          = to;
            group.blocksRaycasts = to > 0.5f;
        }
    }
}
