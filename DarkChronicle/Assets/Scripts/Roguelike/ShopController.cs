using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.UI;

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
        [SerializeField] Transform          _equipmentSection;
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
            yield return UIAnimator.FadeIn(_shopPanel, 0.4f);

            while (_isOpen) yield return null;

            yield return UIAnimator.FadeOut(_shopPanel, 0.3f);
        }

        // ── Stock Generation ───────────────────────────────────────────────
        void GenerateStock()
        {
            _stock.Clear();
            ClearSection(_skillSection);
            ClearSection(_relicSection);
            ClearSection(_consumableSection);
            ClearSection(_equipmentSection);
            ClearSection(_serviceSection);

            int sanity    = _run.Sanity;
            int floor     = _run.CurrentFloor;

            // 3-4 skills
            for (int i = 0; i < Random.Range(3, 5); i++)
                AddSkillItem(floor, sanity);

            // 2-3 relics
            for (int i = 0; i < Random.Range(2, 4); i++)
                AddRelicItem(floor, sanity);

            // BlackMarket: always add one cursed relic to the shop
            if (RelicManager.Instance?.HasBlackMarket() == true)
                AddRelicItem(floor, sanity, forceCursed: true);

            // 2 consumables
            for (int i = 0; i < 2; i++)
                AddConsumableItem();

            // 1-2 equipment items
            for (int i = 0; i < Random.Range(1, 3); i++)
                AddEquipmentItem(floor);

            // Services
            AddService("スキル削除", SkillPurgePrice,   OnPurgeSkill,   RelicManager.Instance.HasFreeRemove());
            AddService("スキル強化", SkillUpgradePrice,  OnUpgradeSkill, false);
        }

        void AddSkillItem(int floor, int sanity)
        {
            var skill = LootSystem.Instance?.DrawSkill(sanity);
            if (skill == null) return;
            int price = RelicManager.Instance.ModifyShopPrice(
                Mathf.RoundToInt(SkillBasePrice * (1f + floor * 0.3f)));
            var item = CreateShopItem(_skillSection, skill.SkillName, skill.Description,
                                      skill.Icon, price, () => BuySkill(skill, price));
            _stock.Add(new ShopItem { Skill = skill, Price = price, GO = item });
        }

        void AddRelicItem(int floor, int sanity, bool forceCursed = false)
        {
            var rarity = forceCursed ? RelicRarity.Cursed
                                     : LootSystem.Instance?.RollRelicRarity(sanity, false) ?? RelicRarity.Common;
            var relic  = LootSystem.Instance?.DrawRelic(rarity, false);
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
            var item = LootSystem.Instance?.DrawConsumable();
            if (item == null) return;
            int price = RelicManager.Instance.ModifyShopPrice(ConsumablePrice);
            var go = CreateShopItem(_consumableSection, item.ItemName, item.Description,
                                    item.Icon, price, () => BuyConsumable(item, price));
            _stock.Add(new ShopItem { Item = item, Price = price, GO = go });
        }

        void AddEquipmentItem(int floor)
        {
            if (_equipmentSection == null) return;
            var equip = EquipmentFactory.DrawForFloor(floor);
            if (equip == null) return;
            int price = RelicManager.Instance.ModifyShopPrice(equip.Value);
            var go = CreateShopItem(_equipmentSection, equip.EquipName, equip.Description,
                                    equip.Icon, price, () => BuyEquipment(equip, price));
            _stock.Add(new ShopItem { Equipment = equip, Price = price, GO = go });
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

        void BuyConsumable(ItemData item, int price)
        {
            if (_run.Gold < price) return;
            _run.SpendGold(price);
            _run.Inventory.Add(item);
            RefreshGoldDisplay();
        }

        void BuyEquipment(Data.EquipmentData equip, int price)
        {
            if (_run.Gold < price) return;
            _run.SpendGold(price);
            _run.EquipmentInventory.Add(equip);
            RefreshGoldDisplay();
        }

        void OnPurgeSkill()
        {
            int price = RelicManager.Instance.HasFreeRemove() ? 0 :
                        RelicManager.Instance.ModifyShopPrice(SkillPurgePrice);
            if (_run.Gold < price) return;
            StartCoroutine(PurgeSkillFlow(price));
        }

        IEnumerator PurgeSkillFlow(int price)
        {
            SkillData selected = null;
            yield return LootSystem.Instance.ShowPickFromDeck(
                "削除するスキルを選択", null, s => selected = s);
            if (selected == null) yield break;
            _run.SpendGold(price);
            _run.RemoveSkill(selected);
            RefreshGoldDisplay();
        }

        void OnUpgradeSkill()
        {
            int price = RelicManager.Instance.ModifyShopPrice(SkillUpgradePrice);
            if (_run.Gold < price) return;
            StartCoroutine(UpgradeSkillFlow(price));
        }

        IEnumerator UpgradeSkillFlow(int price)
        {
            SkillData selected = null;
            yield return LootSystem.Instance.ShowPickFromDeck(
                "強化するスキルを選択", SkillUpgradeSystem.CanUpgrade, s => selected = s);
            if (selected == null) yield break;
            if (_run.Gold < price) yield break;
            _run.SpendGold(price);
            SkillUpgradeSystem.UpgradeInDeck(_run, selected);
            RefreshGoldDisplay();
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
            if (item == null)
            {
                StartCoroutine(UIAnimator.FadeOut(_tooltip, 0.1f));
                return;
            }
            _tooltipName.text  = item.Skill?.SkillName ?? item.Relic?.RelicName ?? string.Empty;
            _tooltipDesc.text  = item.Skill?.Description ?? item.Relic?.Description ?? string.Empty;
            _tooltipPrice.text = $"{item.Price} G";
            StartCoroutine(UIAnimator.FadeIn(_tooltip, 0.12f));
        }

        void ClearSection(Transform section)
        {
            foreach (Transform child in section) Destroy(child.gameObject);
        }

        void RefreshGoldDisplay()
        {
            if (_goldText != null) _goldText.text = $"所持金: {_run.Gold} G";
        }

    }

    // ── Shop Item Data ─────────────────────────────────────────────────────
    public class ShopItem
    {
        public SkillData              Skill;
        public RelicData              Relic;
        public ItemData               Item;
        public Data.EquipmentData     Equipment;
        public int                    Price;
        public GameObject             GO;
        public bool                   Sold;
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

    public static class RelicManagerExtensions
    {
        public static bool HasFreeRemove(this RelicManager rm)
            => rm != null && rm.SumEffectPublic(RelicEffectType.FreeRemove) > 0f;
    }

}
