using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Data;
using DarkChronicle.Roguelike;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Full-screen level-up announcement.
    /// Shows old → new level, animated stat gains, and any skills newly unlocked via job level.
    /// Call Show() as a coroutine from RoguelikeManager after AddExp/AddJP.
    /// </summary>
    public sealed class LevelUpUI : MonoBehaviour
    {
        [Header("Panel")]
        [SerializeField] CanvasGroup        _panel;

        [Header("Level Display")]
        [SerializeField] TextMeshProUGUI    _levelLabel;       // "Lv. 5 → Lv. 6"
        [SerializeField] TextMeshProUGUI    _congratsText;     // "LEVEL UP!"

        [Header("Stat Growth")]
        [SerializeField] Transform          _statContainer;    // parent for stat rows
        [SerializeField] GameObject         _statRowPrefab;    // TextMeshProUGUI label + value

        [Header("Skill Unlock")]
        [SerializeField] Transform          _skillContainer;   // parent for skill unlock rows
        [SerializeField] GameObject         _skillRowPrefab;   // skill name label
        [SerializeField] TextMeshProUGUI    _skillUnlockHeader;

        [Header("Continue")]
        [SerializeField] Button             _continueButton;
        [SerializeField] TextMeshProUGUI    _continueLabel;

        [Header("Timing")]
        [SerializeField] float _fadeInDuration  = 0.4f;
        [SerializeField] float _fadeOutDuration = 0.3f;
        [SerializeField] float _statRevealDelay = 0.07f;   // seconds between each stat line

        void Awake()
        {
            if (_panel) { _panel.alpha = 0f; _panel.blocksRaycasts = false; }
        }

        /// <summary>
        /// Main entry point. Show level-up results and wait for the player to continue.
        /// </summary>
        public IEnumerator Show(List<int> levelsGained, CharacterStats statDelta,
                                List<SkillData> skillsUnlocked)
        {
            if (levelsGained == null || levelsGained.Count == 0) yield break;

            int oldLevel = levelsGained[0] - 1;
            int newLevel = levelsGained[levelsGained.Count - 1];

            BuildContent(oldLevel, newLevel, statDelta, skillsUnlocked);

            yield return StartCoroutine(UIAnimator.FadeIn(_panel, _fadeInDuration));

            // Reveal stat rows one by one for the Slay-the-Spire feel
            yield return RevealStatRows();

            // Reveal skill unlocks (if any)
            if (skillsUnlocked != null && skillsUnlocked.Count > 0)
                yield return RevealSkillRows();

            // Wait for player tap / click
            bool continued = false;
            _continueButton.gameObject.SetActive(true);
            if (_continueLabel) _continueLabel.text = "続ける";
            var crt = _continueButton.GetComponent<RectTransform>();
            if (crt) StartCoroutine(UIAnimator.Punch(crt, 1.1f, 0.2f));

            _continueButton.onClick.RemoveAllListeners();
            _continueButton.onClick.AddListener(() => continued = true);
            while (!continued) yield return null;

            yield return StartCoroutine(UIAnimator.FadeOut(_panel, _fadeOutDuration));
            _continueButton.gameObject.SetActive(false);
            ClearRows();
        }

        void BuildContent(int oldLevel, int newLevel, CharacterStats delta, List<SkillData> skills)
        {
            ClearRows();

            if (_levelLabel)
                _levelLabel.text = newLevel > oldLevel + 1
                    ? $"Lv. {oldLevel} → Lv. {newLevel}"   // multi-level jump
                    : $"Lv. {oldLevel} → Lv. {newLevel}";

            if (_congratsText) _congratsText.text = "LEVEL UP!";

            // Build stat rows (hidden initially; RevealStatRows fades them in)
            if (delta != null && _statContainer && _statRowPrefab)
            {
                AddStatRow("最大HP",   delta.MaxHP);
                AddStatRow("最大MP",   delta.MaxMP);
                AddStatRow("物理攻撃", delta.PhysicalAttack);
                AddStatRow("魔法攻撃", delta.MagicAttack);
                AddStatRow("物理防御", delta.PhysicalDefense);
                AddStatRow("魔法防御", delta.MagicDefense);
                AddStatRow("速度",     delta.Speed);
                AddStatRow("運",       delta.Luck);
                AddStatRow("会心",     delta.CriticalRate);
            }

            // Build skill unlock rows (hidden initially)
            bool hasSkills = skills != null && skills.Count > 0;
            if (_skillUnlockHeader) _skillUnlockHeader.gameObject.SetActive(hasSkills);
            if (hasSkills && _skillContainer && _skillRowPrefab)
            {
                foreach (var sk in skills)
                    AddSkillRow(sk);
            }

            _continueButton.gameObject.SetActive(false);
        }

        void AddStatRow(string label, int value)
        {
            if (value == 0) return;
            var go  = Instantiate(_statRowPrefab, _statContainer);
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt) txt.text = $"{label}  <color=#88FF88>+{value}</color>";
            var cg = go.GetComponent<CanvasGroup>() ?? go.AddComponent<CanvasGroup>();
            cg.alpha = 0f;
        }

        void AddSkillRow(SkillData skill)
        {
            if (skill == null) return;
            var go  = Instantiate(_skillRowPrefab, _skillContainer);
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt) txt.text = $"<color=#FFE080>★</color> {skill.SkillName}";
            var cg = go.GetComponent<CanvasGroup>() ?? go.AddComponent<CanvasGroup>();
            cg.alpha = 0f;
        }

        IEnumerator RevealStatRows()
        {
            foreach (Transform child in _statContainer)
            {
                var cg = child.GetComponent<CanvasGroup>();
                if (cg == null) continue;
                yield return StartCoroutine(UIAnimator.FadeIn(cg, 0.18f));
                yield return new WaitForSeconds(_statRevealDelay);
            }
        }

        IEnumerator RevealSkillRows()
        {
            yield return new WaitForSeconds(0.15f);
            if (_skillUnlockHeader)
                yield return StartCoroutine(UIAnimator.FadeIn(
                    _skillUnlockHeader.GetComponent<CanvasGroup>()
                    ?? _skillUnlockHeader.gameObject.AddComponent<CanvasGroup>(), 0.2f));

            foreach (Transform child in _skillContainer)
            {
                var cg = child.GetComponent<CanvasGroup>();
                if (cg == null) continue;
                yield return StartCoroutine(UIAnimator.FadeIn(cg, 0.18f));
                yield return new WaitForSeconds(0.1f);
            }
        }

        void ClearRows()
        {
            if (_statContainer)  foreach (Transform c in _statContainer)  Destroy(c.gameObject);
            if (_skillContainer) foreach (Transform c in _skillContainer) Destroy(c.gameObject);
        }
    }
}
