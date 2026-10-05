using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Battle;
using DarkChronicle.Data;
using DarkChronicle.Roguelike;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Post-battle results screen.
    /// Shows EXP / JP / gold gained, items dropped, and battle statistics.
    /// Design: Octopath-style dark panel with typewriter reveals and animated tallies.
    /// </summary>
    public sealed class RunSummaryUI : MonoBehaviour
    {
        [Header("Root")]
        [SerializeField] CanvasGroup    _rootGroup;
        [SerializeField] RectTransform  _rootRect;

        [Header("Header")]
        [SerializeField] TextMeshProUGUI _titleText;
        [SerializeField] Image           _titleUnderline;

        [Header("Rewards Section")]
        [SerializeField] TextMeshProUGUI _expText;
        [SerializeField] TextMeshProUGUI _jpText;
        [SerializeField] TextMeshProUGUI _goldText;
        [SerializeField] Slider          _expBar;
        [SerializeField] Transform       _dropItemRoot;
        [SerializeField] GameObject      _dropItemEntryPrefab;

        [Header("Stats Section")]
        [SerializeField] TextMeshProUGUI _damageDealtText;
        [SerializeField] TextMeshProUGUI _damageTakenText;
        [SerializeField] TextMeshProUGUI _enemiesKilledText;
        [SerializeField] TextMeshProUGUI _turnCountText;

        [Header("New Relics / Skills")]
        [SerializeField] Transform       _newRelicRoot;
        [SerializeField] GameObject      _relicEntryPrefab;
        [SerializeField] Transform       _newSkillRoot;
        [SerializeField] GameObject      _skillEntryPrefab;

        [Header("Continue Button")]
        [SerializeField] Button          _continueButton;
        [SerializeField] TextMeshProUGUI _continueLabel;

        public event System.Action OnContinuePressed;

        // ── Public API ─────────────────────────────────────────────────────
        public void ShowVictory(BattleRewards rewards)
        {
            gameObject.SetActive(true);
            StartCoroutine(PresentResults("勝利！", rewards));
        }

        public void ShowDefeat()
        {
            gameObject.SetActive(true);
            if (_titleText) _titleText.text = "敗北...";
            if (_titleText) _titleText.color = new Color(0.8f, 0.15f, 0.15f);
            if (_continueLabel) _continueLabel.text = "タイトルへ戻る";
            _continueButton.onClick.AddListener(() => OnContinuePressed?.Invoke());
            StartCoroutine(UIAnimator.FadeIn(_rootGroup, 0.6f));
        }

        // ── Presentation coroutine ─────────────────────────────────────────
        IEnumerator PresentResults(string title, BattleRewards rewards)
        {
            if (_rootRect)
                yield return StartCoroutine(UIAnimator.SlideIn(_rootRect,
                    _rootRect.anchoredPosition + Vector2.down * 80f,
                    _rootRect.anchoredPosition, 0.35f));
            yield return StartCoroutine(UIAnimator.FadeIn(_rootGroup, 0.3f));

            if (_titleText)
            {
                yield return StartCoroutine(UIAnimator.Typewriter(_titleText, title, 30f));
                yield return new WaitForSecondsRealtime(0.3f);
            }

            // Tally EXP
            yield return StartCoroutine(TallyNumber(_expText,  "EXP",  rewards.ExpGained));
            yield return StartCoroutine(TallyNumber(_jpText,   "JP",   rewards.JPGained));
            yield return StartCoroutine(TallyNumber(_goldText, "ゴールド", rewards.GoldGained));

            if (_expBar) yield return StartCoroutine(UIAnimator.SmoothBar(_expBar, rewards.ExpBarFill, 0.5f));

            // Items
            if (rewards.DroppedItems != null && _dropItemRoot != null)
            {
                foreach (var drop in rewards.DroppedItems)
                {
                    yield return new WaitForSecondsRealtime(0.12f);
                    SpawnDropEntry(drop);
                }
            }

            // Stats
            yield return new WaitForSecondsRealtime(0.2f);
            SetStatText(_damageDealtText,  "与ダメージ",  rewards.DamageDealt);
            SetStatText(_damageTakenText,  "被ダメージ",  rewards.DamageTaken);
            SetStatText(_enemiesKilledText,"討伐数",      rewards.EnemiesKilled);
            SetStatText(_turnCountText,    "ターン数",    rewards.TurnCount);

            // New relics / skills previews
            ShowNewRelics(rewards.NewRelics);
            ShowNewSkills(rewards.NewSkills);

            // Continue button
            yield return new WaitForSecondsRealtime(0.3f);
            if (_continueLabel) _continueLabel.text = "次へ進む";
            _continueButton.gameObject.SetActive(true);
            _continueButton.interactable = true;
            _continueButton.onClick.AddListener(() => OnContinuePressed?.Invoke());
            StartCoroutine(UIAnimator.Punch(_continueButton.GetComponent<RectTransform>(),
                           1.08f, 0.2f));
        }

        IEnumerator TallyNumber(TextMeshProUGUI label, string prefix, int target)
        {
            if (label == null) yield break;
            int current = 0;
            float duration = Mathf.Clamp(target / 200f, 0.3f, 1.2f);
            float t = 0f;
            while (t < duration)
            {
                t       += Time.unscaledDeltaTime;
                current  = Mathf.RoundToInt(Mathf.Lerp(0, target, UIAnimator.EaseOut(t / duration)));
                label.text = $"{prefix}  +{current}";
                yield return null;
            }
            label.text = $"{prefix}  +{target}";
        }

        void SpawnDropEntry((ItemData item, int qty) drop)
        {
            if (_dropItemEntryPrefab == null || _dropItemRoot == null) return;
            var go    = Instantiate(_dropItemEntryPrefab, _dropItemRoot);
            var texts = go.GetComponentsInChildren<TextMeshProUGUI>();
            if (texts.Length >= 1) texts[0].text = drop.item.ItemName;
            if (texts.Length >= 2) texts[1].text = drop.qty > 1 ? $"×{drop.qty}" : string.Empty;
            var icon = go.GetComponentInChildren<Image>();
            if (icon != null && drop.item.Icon != null) icon.sprite = drop.item.Icon;
        }

        void SetStatText(TextMeshProUGUI label, string prefix, int value)
        {
            if (label) label.text = $"{prefix}: {value}";
        }

        void ShowNewRelics(List<Data.RelicDataRef> relics)
        {
            if (relics == null || _newRelicRoot == null || _relicEntryPrefab == null) return;
            foreach (var r in relics)
            {
                var go   = Instantiate(_relicEntryPrefab, _newRelicRoot);
                var txt  = go.GetComponentInChildren<TextMeshProUGUI>();
                if (txt) txt.text = r.Name;
                var icon = go.GetComponentInChildren<Image>();
                if (icon != null && r.Icon != null) icon.sprite = r.Icon;
            }
        }

        void ShowNewSkills(List<SkillData> skills)
        {
            if (skills == null || _newSkillRoot == null || _skillEntryPrefab == null) return;
            foreach (var s in skills)
            {
                var go  = Instantiate(_skillEntryPrefab, _newSkillRoot);
                var txt = go.GetComponentInChildren<TextMeshProUGUI>();
                if (txt) txt.text = s.SkillName;
            }
        }

        public void Hide()
        {
            StartCoroutine(HideRoutine());
        }

        IEnumerator HideRoutine()
        {
            yield return StartCoroutine(UIAnimator.FadeOut(_rootGroup, 0.3f));
            gameObject.SetActive(false);
        }
    }

    // ── Battle Rewards data ────────────────────────────────────────────────────
    public class BattleRewards
    {
        public int  ExpGained;
        public int  JPGained;
        public int  GoldGained;
        public float ExpBarFill;          // 0-1: new EXP bar fill level
        public int  DamageDealt;
        public int  DamageTaken;
        public int  EnemiesKilled;
        public int  TurnCount;
        public List<(ItemData item, int qty)> DroppedItems = new();
        public List<Data.RelicDataRef>        NewRelics    = new();
        public List<SkillData>                NewSkills    = new();
    }

    namespace Data
    {
        // Lightweight reference used by RunSummaryUI (avoids pulling full RelicData)
        public class RelicDataRef
        {
            public string Name;
            public Sprite Icon;
        }
    }
}
