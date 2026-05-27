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
    /// Shop scene: sells skills, relics, consumable items, and offers skill purge.
    /// Prices scale with floor; Luck affects rare stock appearance.
    /// </summary>
    public sealed class ShopController : MonoBehaviour
    {
        public static ShopController Instance { get; private set; }

        // ── UI ─────────────────────────────────────────────────────────────
        [Header("Shop UI")]
        [SerializeField] CanvasGroup        _shopPanel;
        [SerializeField] TextMeshProUGUI    _goldText;
        [SerializeField] Transform          _skillSection;
        [SerializeField] Transform          _relicSection;
        [SerializeField] Transform          _consumableSection;
        [SerializeField] Transform          _serviceSection;
        [SerializeField] GameObject         _shopItemPrefab;
        [SerializeField] Button             _leaveButton;

        [Header("Tooltip")]
        [SerializeField] CanvasGroup        _tooltip;
        [SerializeField] TextMeshProUGUI    _tooltipName;
        [SerializeField] TextMeshProUGUI    _tooltipDesc;
        [SerializeField] TextMeshProUGUI    _tooltipPrice;

        // ── Pricing ────────────────────────────────────────────────────────
        static readonly Dictionary<RelicRarity, int> RelicBasePrices = new()
        {
            { RelicRarity.Common,   80  },
            { RelicRarity.Uncommon, 150 },
            { RelicRarity.Rare,     250 },
            { RelicRarity.Cursed,   50  },  // cursed relics are cheap
        };
        const int SkillBasePrice    = 75;
        const int ConsumablePrice   = 40;
        const int SkillPurgePrice   = 100;
        const int SkillUpgradePrice = 120;

        RunData              _run;
        List<ShopItem>       _stock = new();
        bool                 _isOpen;
        ShopItem             _hoveredItem;

        void Awake()
        {
            Instance = this;
            _shopPanel.alpha = 0f;
            _shopPanel.blocksRaycasts = false;
            _tooltip.alpha = 0f;
        }

        public void InitForRun(RunData run) => _run = run;

        // ── Open ───────────────────────────────────────────────────────────
        public IEnumerator OpenShop()
        {
            GenerateStock();
            RefreshGoldDisplay();
            _leaveButton.onClick.RemoveAllListeners();
            _leaveButton.onClick.AddListener(() => { _isOpen = false; });

            _isOpen = true;
            yield return FadeGroup(_shopPanel, 0f, 1f, 0.4f);

            while (_isOpen) yield return null;

            yield return FadeGroup(_shopPanel, 1f, 0f, 0.3f);
        }

        // ── Stock Generation ───────────────────────────────────────────────
        void GenerateStock()
        {
            _stock.Clear();
            ClearSection(_skillSection);
            ClearSection(_relicSection);
            ClearSection(_consumableSection);
            ClearSection(_serviceSection);

            int luck      = RelicManager.Instance.GetLuck();
            int floor     = _run.CurrentFloor;

            // 3-4 skills
            var skillPool = LootSystem.Instance != null
                ? new List<SkillData>()     // filled from LootSystem pools
                : new List<SkillData>();
            for (int i = 0; i < Random.Range(3, 5); i++)
                AddSkillItem(floor, luck);

            // 2-3 relics
            for (int i = 0; i < Random.Range(2, 4); i++)
                AddRelicItem(floor, luck);

            // 2 consumables
            for (int i = 0; i < 2; i++)
                AddConsumableItem();

            // Services
            AddService("スキル削除", SkillPurgePrice,   OnPurgeSkill,   RelicManager.Instance.HasFreeRemove());
            AddService("スキル強化", SkillUpgradePrice,  OnUpgradeSkill, false);
        }

        void AddSkillItem(int floor, int luck)
        {
            var skill = LootSystem.Instance?.DrawSkillPublic(luck);
            if (skill == null) return;
            int price = RelicManager.Instance.ModifyShopPrice(
                Mathf.RoundToInt(SkillBasePrice * (1f + floor * 0.3f)));
            var item = CreateShopItem(_skillSection, skill.SkillName, skill.Description,
                                      skill.Icon, price, () => BuySkill(skill, price));
            _stock.Add(new ShopItem { Skill = skill, Price = price, GO = item });
        }

        void AddRelicItem(int floor, int luck)
        {
            var rarity = LootSystem.Instance?.DrawRelicRarityPublic(luck, false) ?? RelicRarity.Common;
            var relic  = LootSystem.Instance?.DrawRelicPublic(rarity, false);
            if (relic == null) return;
            int basePrice = RelicBasePrices.TryGetValue(relic.Rarity, out int p) ? p : 100;
            int price     = RelicManager.Instance.ModifyShopPrice(
                Mathf.RoundToInt(basePrice * (1f + floor * 0.25f)));
            var item = CreateShopItem(_relicSection, relic.RelicName, relic.Description,
                                      relic.Icon, price, () => BuyRelic(relic, price));
            _stock.Add(new ShopItem { Relic = relic, Price = price, GO = item });
        }

        void AddConsumableItem()
        {
            // TODO: draw from consumable pool
            int price = RelicManager.Instance.ModifyShopPrice(ConsumablePrice);
        }

        void AddService(string name, int baseCost, System.Action action, bool isFree)
        {
            int price = isFree ? 0 : RelicManager.Instance.ModifyShopPrice(baseCost);
            CreateShopItem(_serviceSection, name, string.Empty, null, price, action);
        }

        // ── Buy ────────────────────────────────────────────────────────────
        void BuySkill(SkillData skill, int price)
        {
            if (_run.Gold < price) return;
            _run.SpendGold(price);
            _run.AddSkill(skill);
            RefreshGoldDisplay();
        }

        void BuyRelic(RelicData relic, int price)
        {
            if (_run.Gold < price) return;
            _run.SpendGold(price);
            _run.AddRelic(relic);
            if (relic.AttachedCurse != null) _run.AddCurse(relic.AttachedCurse);
            StartCoroutine(LootSystem.Instance.ShowRelicObtained(relic));
            RefreshGoldDisplay();
        }

        void OnPurgeSkill()
        {
            // TODO: open skill selection to purge one
        }

        void OnUpgradeSkill()
        {
            // TODO: open skill selection to upgrade one
        }

        // ── UI Helpers ─────────────────────────────────────────────────────
        GameObject CreateShopItem(Transform parent, string name, string desc,
                                  Sprite icon, int price, System.Action onBuy)
        {
            var go  = Instantiate(_shopItemPrefab, parent);
            var si  = go.GetComponent<ShopItemUI>() ?? go.AddComponent<ShopItemUI>();
            si.Setup(name, desc, icon, price, onBuy,
                     hovered => { _hoveredItem = hovered; ShowTooltip(hovered); });
            return go;
        }

        void ShowTooltip(ShopItem item)
        {
            if (item == null) { _tooltip.alpha = 0f; return; }
            _tooltipName.text  = item.Skill?.SkillName ?? item.Relic?.RelicName ?? string.Empty;
            _tooltipDesc.text  = item.Skill?.Description ?? item.Relic?.Description ?? string.Empty;
            _tooltipPrice.text = $"{item.Price} G";
            _tooltip.alpha     = 1f;
        }

        void ClearSection(Transform section)
        {
            foreach (Transform child in section) Destroy(child.gameObject);
        }

        void RefreshGoldDisplay()
        {
            if (_goldText != null) _goldText.text = $"所持金: {_run.Gold} G";
        }

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha = from;
            group.blocksRaycasts = to > 0.5f;
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

    // ── Shop Item Data ─────────────────────────────────────────────────────
    public class ShopItem
    {
        public SkillData  Skill;
        public RelicData  Relic;
        public int        Price;
        public GameObject GO;
        public bool       Sold;
    }

    // ── Shop Item UI Component ─────────────────────────────────────────────
    public sealed class ShopItemUI : MonoBehaviour, UnityEngine.EventSystems.IPointerEnterHandler,
                                                     UnityEngine.EventSystems.IPointerExitHandler
    {
        [SerializeField] Image            _icon;
        [SerializeField] TextMeshProUGUI  _nameText;
        [SerializeField] TextMeshProUGUI  _priceText;
        [SerializeField] Button           _buyButton;
        [SerializeField] GameObject       _soldLabel;

        ShopItem               _data;
        System.Action<ShopItem> _onHover;

        public void Setup(string name, string desc, Sprite icon, int price,
                          System.Action onBuy, System.Action<ShopItem> onHover)
        {
            if (_nameText)  _nameText.text  = name;
            if (_priceText) _priceText.text = price > 0 ? $"{price} G" : "無料";
            if (_icon && icon != null) _icon.sprite = icon;
            _buyButton?.onClick.AddListener(() => { onBuy?.Invoke(); MarkSold(); });
            _onHover = onHover;
        }

        void MarkSold()
        {
            _buyButton.interactable = false;
            if (_soldLabel) _soldLabel.SetActive(true);
        }

        public void OnPointerEnter(UnityEngine.EventSystems.PointerEventData e) =>
            _onHover?.Invoke(_data);
        public void OnPointerExit(UnityEngine.EventSystems.PointerEventData e) =>
            _onHover?.Invoke(null);
    }

    // Temporary extension stubs (real implementations in LootSystem)
    public static class LootSystemExtensions
    {
        public static SkillData DrawSkillPublic(this LootSystem ls, int luck) => null;
        public static RelicData DrawRelicPublic(this LootSystem ls, RelicRarity rarity, bool forEvent) => null;
        public static RelicRarity DrawRelicRarityPublic(this LootSystem ls, int luck, bool isElite)
            => RelicRarity.Common;
    }

    public static class RelicManagerExtensions
    {
        public static bool HasFreeRemove(this RelicManager rm)
            => rm != null && rm.SumEffectPublic(RelicEffectType.FreeRemove) > 0f;
    }

    public static class RelicManagerPublicHelper
    {
        public static float SumEffectPublic(this RelicManager rm, RelicEffectType effect) => 0f;
    }
}
