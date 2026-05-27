using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Post-battle loot screen: shows N skill/relic/item choices weighted by Luck,
    /// handles gold reward, and triggers relic obtain animations.
    /// </summary>
    public sealed class LootSystem : MonoBehaviour
    {
        public static LootSystem Instance { get; private set; }

        // ── UI ─────────────────────────────────────────────────────────────
        [Header("Loot Screen")]
        [SerializeField] CanvasGroup        _lootPanel;
        [SerializeField] TextMeshProUGUI    _headerText;
        [SerializeField] TextMeshProUGUI    _goldRewardText;
        [SerializeField] Transform          _choiceContainer;
        [SerializeField] GameObject         _skillChoicePrefab;
        [SerializeField] GameObject         _relicChoicePrefab;
        [SerializeField] Button             _skipButton;

        [Header("Relic Obtain")]
        [SerializeField] CanvasGroup        _relicObtainPanel;
        [SerializeField] Image              _relicObtainIcon;
        [SerializeField] TextMeshProUGUI    _relicObtainName;
        [SerializeField] TextMeshProUGUI    _relicObtainDesc;
        [SerializeField] TextMeshProUGUI    _relicObtainRarity;
        [SerializeField] AudioClip          _relicSFX;
        [SerializeField] AudioClip          _commonLootSFX;
        [SerializeField] AudioSource        _audioSource;

        // ── Pools ──────────────────────────────────────────────────────────
        [Header("Pools")]
        [SerializeField] List<SkillData>    _commonSkillPool;
        [SerializeField] List<SkillData>    _uncommonSkillPool;
        [SerializeField] List<SkillData>    _rareSkillPool;
        [SerializeField] List<RelicData>    _commonRelicPool;
        [SerializeField] List<RelicData>    _uncommonRelicPool;
        [SerializeField] List<RelicData>    _rareRelicPool;
        [SerializeField] List<RelicData>    _bossRelicPool;
        [SerializeField] List<RelicData>    _cursedRelicPool;

        RunData _run;
        bool    _choiceMade;

        void Awake()
        {
            Instance = this;
            _lootPanel.alpha = 0f;
            _lootPanel.blocksRaycasts = false;
            _relicObtainPanel.alpha   = 0f;
        }

        public void InitForRun(RunData run) => _run = run;

        // ── Battle Rewards ─────────────────────────────────────────────────
        public IEnumerator ShowBattleRewards(int baseGold, bool isElite, bool isBoss)
        {
            int luck          = RelicManager.Instance.GetLuck();
            int goldReward    = RelicManager.Instance.ModifyGoldDrop(
                                    Mathf.RoundToInt(baseGold * (isElite ? 2f : 1f) * (isBoss ? 3f : 1f)));
            _run.EarnGold(goldReward);

            int choiceCount   = RelicManager.Instance.GetLootChoiceCount();
            if (isElite) choiceCount += (int)RelicManager.Instance.GetLuck() / 5;

            // Build choice pool: mix skills and relics by floor and luck
            var choices = BuildChoices(choiceCount, isElite, isBoss, luck);

            _headerText.text    = isBoss ? "BOSS 撃破！" : isElite ? "強敵 撃破！" : "戦闘 勝利！";
            _goldRewardText.text = $"+ {goldReward} G";

            yield return ShowChoicePanel(choices);
        }

        List<LootChoice> BuildChoices(int count, bool isElite, bool isBoss, int luck)
        {
            var choices  = new List<LootChoice>();
            var used     = new HashSet<string>();

            // Boss always offers a boss relic
            if (isBoss && _bossRelicPool.Count > 0)
            {
                var bossRelic = DrawRelicFromPool(_bossRelicPool, used);
                if (bossRelic != null) choices.Add(new LootChoice { Relic = bossRelic });
            }

            int remaining = count - choices.Count;
            for (int i = 0; i < remaining; i++)
            {
                // Decide: skill or relic? Later floors and higher luck → more relics
                bool offerRelic = Random.value < (0.25f + _run.CurrentFloor * 0.1f + luck * 0.02f)
                                  || isElite;

                if (offerRelic)
                {
                    var rarity = RollRelicRarity(luck, isElite);
                    var relic  = DrawRelic(rarity, false, used);
                    if (relic != null) choices.Add(new LootChoice { Relic = relic });
                    else              offerRelic = false;
                }

                if (!offerRelic)
                {
                    var skill = DrawSkill(luck, used);
                    if (skill != null) choices.Add(new LootChoice { Skill = skill });
                }
            }

            // Shuffle
            return choices.OrderBy(_ => Random.value).ToList();
        }

        // ── Choice Panel ───────────────────────────────────────────────────
        IEnumerator ShowChoicePanel(List<LootChoice> choices)
        {
            foreach (Transform child in _choiceContainer) Destroy(child.gameObject);

            foreach (var choice in choices)
            {
                var prefab = choice.IsRelic ? _relicChoicePrefab : _skillChoicePrefab;
                var go     = Instantiate(prefab, _choiceContainer);
                var card   = go.GetComponent<LootCard>() ?? go.AddComponent<LootCard>();

                if (choice.IsRelic) card.SetupRelic(choice.Relic);
                else                card.SetupSkill(choice.Skill);

                var captured = choice;
                card.Button.onClick.AddListener(() => OnChoiceSelected(captured));
            }

            _skipButton.onClick.RemoveAllListeners();
            _skipButton.onClick.AddListener(() => _choiceMade = true);

            _choiceMade = false;
            yield return FadeGroup(_lootPanel, 0f, 1f, 0.4f);

            while (!_choiceMade) yield return null;

            yield return FadeGroup(_lootPanel, 1f, 0f, 0.3f);
        }

        void OnChoiceSelected(LootChoice choice)
        {
            if (choice.IsRelic)
            {
                _run.AddRelic(choice.Relic);
                if (choice.Relic.AttachedCurse != null) _run.AddCurse(choice.Relic.AttachedCurse);
                StartCoroutine(ShowRelicObtained(choice.Relic));
            }
            else
            {
                _run.AddSkill(choice.Skill);
                _audioSource?.PlayOneShot(_commonLootSFX);
                _choiceMade = true;
            }
        }

        // ── Relic Obtain Animation ─────────────────────────────────────────
        public IEnumerator ShowRelicObtained(RelicData relic)
        {
            _relicObtainIcon.sprite   = relic.Icon;
            _relicObtainName.text     = relic.RelicName;
            _relicObtainDesc.text     = relic.Description;
            _relicObtainRarity.text   = relic.RarityLabel;
            _relicObtainRarity.color  = relic.RarityColor;

            _audioSource?.PlayOneShot(_relicSFX);

            yield return FadeGroup(_relicObtainPanel, 0f, 1f, 0.5f);

            // Pulse animation
            float t = 0f;
            var rt  = _relicObtainIcon.rectTransform;
            while (t < 1.5f)
            {
                t += Time.deltaTime;
                rt.localScale = Vector3.one * (1f + Mathf.Sin(t * 6f) * 0.04f);
                yield return null;
            }
            rt.localScale = Vector3.one;

            // Wait for input
            bool dismissed = false;
            var btn = _relicObtainPanel.GetComponentInChildren<Button>();
            if (btn != null)
            {
                btn.onClick.RemoveAllListeners();
                btn.onClick.AddListener(() => dismissed = true);
            }
            while (!dismissed && !Input.GetKeyDown(KeyCode.Z) && !Input.GetKeyDown(KeyCode.Return))
                yield return null;

            yield return FadeGroup(_relicObtainPanel, 1f, 0f, 0.3f);
            _choiceMade = true;
        }

        // ── Skill Draft (for events) ───────────────────────────────────────
        public IEnumerator ShowSkillDraft(int count = 3)
        {
            var luck   = RelicManager.Instance.GetLuck();
            var skills = Enumerable.Range(0, count)
                .Select(_ => DrawSkill(luck, null))
                .Where(s => s != null)
                .ToList();

            var choices = skills.Select(s => new LootChoice { Skill = s }).ToList();
            _headerText.text     = "スキルを1つ選択";
            _goldRewardText.text = string.Empty;
            yield return ShowChoicePanel(choices);
        }

        public IEnumerator ShowSkillRemove()
        {
            if (_run.Deck.Count == 0) yield break;
            // TODO: show deck list with "remove" buttons
            yield return null;
        }

        // ── Relic Drawing ──────────────────────────────────────────────────
        public RelicData DrawRelic(RelicRarity rarity, bool forEvent,
                                   HashSet<string> used = null)
        {
            var pool = rarity switch
            {
                RelicRarity.Common   => _commonRelicPool,
                RelicRarity.Uncommon => _uncommonRelicPool,
                RelicRarity.Rare     => _rareRelicPool,
                RelicRarity.Boss     => _bossRelicPool,
                RelicRarity.Cursed   => _cursedRelicPool,
                _                    => _commonRelicPool
            };
            return DrawRelicFromPool(pool, used);
        }

        RelicData DrawRelicFromPool(List<RelicData> pool, HashSet<string> used)
        {
            var available = pool
                .Where(r => _run.Relics.Find(h => h.name == r.name) == null)  // not held
                .Where(r => used == null || !used.Contains(r.name))
                .ToList();

            if (available.Count == 0) return null;
            var chosen = available[Random.Range(0, available.Count)];
            used?.Add(chosen.name);
            return chosen;
        }

        // ── Skill Drawing ──────────────────────────────────────────────────
        SkillData DrawSkill(int luck, HashSet<string> used)
        {
            // Higher luck = higher chance of rare skill
            float rareChance    = 0.1f + luck * 0.03f;
            float uncommonChance = 0.25f + luck * 0.02f;
            float roll = Random.value;

            List<SkillData> pool = roll < rareChance    ? _rareSkillPool :
                                   roll < uncommonChance ? _uncommonSkillPool :
                                                           _commonSkillPool;

            var available = pool
                .Where(s => !_run.Deck.Contains(s))
                .Where(s => used == null || !used.Contains(s.name))
                .ToList();

            if (available.Count == 0) available = pool.ToList();
            if (available.Count == 0) return null;

            var chosen = available[Random.Range(0, available.Count)];
            used?.Add(chosen.name);
            return chosen;
        }

        RelicRarity RollRelicRarity(int luck, bool isElite)
        {
            float rare     = 0.05f + luck * 0.02f + (isElite ? 0.1f : 0f);
            float uncommon = 0.20f + luck * 0.01f + (isElite ? 0.1f : 0f);
            float cursed   = 0.05f;

            float roll = Random.value;
            if (roll < rare)              return RelicRarity.Rare;
            if (roll < rare + uncommon)   return RelicRarity.Uncommon;
            if (roll < rare + uncommon + cursed) return RelicRarity.Cursed;
            return RelicRarity.Common;
        }

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha = from;
            group.blocksRaycasts = from > to ? true : false;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                group.alpha = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
            group.blocksRaycasts = to > 0.5f;
        }
    }

    // ── Data ───────────────────────────────────────────────────────────────
    public class LootChoice
    {
        public SkillData  Skill;
        public RelicData  Relic;
        public bool       IsRelic => Relic != null;
    }

    // ── Loot Card Component ────────────────────────────────────────────────
    public sealed class LootCard : MonoBehaviour
    {
        [SerializeField] Image            _icon;
        [SerializeField] TextMeshProUGUI  _nameText;
        [SerializeField] TextMeshProUGUI  _descText;
        [SerializeField] TextMeshProUGUI  _rarityLabel;
        [SerializeField] Image            _rarityBackground;

        public Button Button { get; private set; }
        void Awake() => Button = GetComponent<Button>();

        public void SetupSkill(SkillData skill)
        {
            if (_icon)        _icon.sprite = skill.Icon;
            if (_nameText)    _nameText.text = skill.SkillName;
            if (_descText)    _descText.text  = skill.Description;
            if (_rarityLabel) _rarityLabel.text = "スキル";
        }

        public void SetupRelic(RelicData relic)
        {
            if (_icon)            _icon.sprite     = relic.Icon;
            if (_nameText)        _nameText.text    = relic.RelicName;
            if (_descText)        _descText.text    = relic.Description;
            if (_rarityLabel)     _rarityLabel.text = relic.RarityLabel;
            if (_rarityBackground) _rarityBackground.color = relic.RarityColor;
        }
    }
}
