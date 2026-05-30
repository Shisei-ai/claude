using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Data;
using DarkChronicle.Roguelike;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Equipment menu: shows three equipped slots and the equipment inventory.
    /// Clicking an inventory item equips it (swapping out the old one).
    /// Clicking an equipped slot unequips it back to inventory.
    /// </summary>
    public sealed class EquipMenuUI : MonoBehaviour
    {
        public static EquipMenuUI Instance { get; private set; }

        // ── Root ────────────────────────────────────────────────────────────
        [Header("Root")]
        [SerializeField] CanvasGroup    _rootGroup;
        [SerializeField] Button         _closeButton;

        // ── Equipped Slots ──────────────────────────────────────────────────
        [Header("Equipped Slots")]
        [SerializeField] EquipSlotDisplay _weaponSlot;
        [SerializeField] EquipSlotDisplay _armorSlot;
        [SerializeField] EquipSlotDisplay _accessorySlot;

        // ── Inventory List ──────────────────────────────────────────────────
        [Header("Inventory")]
        [SerializeField] Transform       _inventoryRoot;
        [SerializeField] GameObject      _equipEntryPrefab;

        // ── Stat Detail ─────────────────────────────────────────────────────
        [Header("Detail Panel")]
        [SerializeField] CanvasGroup     _detailGroup;
        [SerializeField] TextMeshProUGUI _detailName;
        [SerializeField] TextMeshProUGUI _detailDesc;
        [SerializeField] TextMeshProUGUI _detailStats;
        [SerializeField] TextMeshProUGUI _detailPassive;

        RunData _run;
        bool    _closed;

        void Awake()
        {
            Instance = this;
            _closeButton?.onClick.AddListener(OnClose);
            if (_rootGroup)   { _rootGroup.alpha   = 0f; _rootGroup.blocksRaycasts   = false; }
            if (_detailGroup) { _detailGroup.alpha  = 0f; _detailGroup.blocksRaycasts = false; }
            gameObject.SetActive(false);
        }

        // ── Public API ─────────────────────────────────────────────────────
        public IEnumerator Open(RunData run)
        {
            _run    = run;
            _closed = false;
            gameObject.SetActive(true);
            Refresh();
            yield return StartCoroutine(UIAnimator.FadeIn(_rootGroup, 0.2f));
            while (!_closed) yield return null;
            yield return StartCoroutine(UIAnimator.FadeOut(_rootGroup, 0.15f));
            gameObject.SetActive(false);
        }

        void OnClose() => _closed = true;

        // ── Refresh ────────────────────────────────────────────────────────
        void Refresh()
        {
            _weaponSlot   ?.Setup(_run.EquippedWeapon,    "武器スロット",    () => OnUnequip(EquipSlot.Weapon));
            _armorSlot    ?.Setup(_run.EquippedArmor,     "防具スロット",    () => OnUnequip(EquipSlot.Armor));
            _accessorySlot?.Setup(_run.EquippedAccessory, "アクセサリスロット", () => OnUnequip(EquipSlot.Accessory));
            RefreshInventoryList();
        }

        void RefreshInventoryList()
        {
            if (_inventoryRoot == null || _equipEntryPrefab == null) return;
            foreach (Transform child in _inventoryRoot) Destroy(child.gameObject);

            if (_run.EquipmentInventory.Count == 0)
            {
                var empty = Instantiate(_equipEntryPrefab, _inventoryRoot);
                var t = empty.GetComponentInChildren<TextMeshProUGUI>();
                if (t) t.text = "──装備なし──";
                return;
            }

            foreach (var equip in _run.EquipmentInventory)
            {
                if (equip == null) continue;
                var go    = Instantiate(_equipEntryPrefab, _inventoryRoot);
                var texts = go.GetComponentsInChildren<TextMeshProUGUI>();
                if (texts.Length >= 1) texts[0].text = equip.EquipName;
                if (texts.Length >= 2) texts[1].text = SlotLabel(equip.Slot);
                if (texts.Length >= 3) texts[2].text = equip.RarityLabel;

                var icon = go.GetComponentInChildren<Image>();
                if (icon && equip.Icon) icon.sprite = equip.Icon;

                var btn = go.GetComponent<Button>();
                var captured = equip;
                btn?.onClick.AddListener(() => OnEquip(captured));

                // Hover: show detail
                var trigger = go.GetComponent<UnityEngine.EventSystems.EventTrigger>()
                           ?? go.AddComponent<UnityEngine.EventSystems.EventTrigger>();
                var enterEntry = new UnityEngine.EventSystems.EventTrigger.Entry
                    { eventID = UnityEngine.EventSystems.EventTriggerType.PointerEnter };
                var exitEntry = new UnityEngine.EventSystems.EventTrigger.Entry
                    { eventID = UnityEngine.EventSystems.EventTriggerType.PointerExit };
                enterEntry.callback.AddListener(_ => ShowDetail(captured));
                exitEntry.callback.AddListener(_ => HideDetail());
                trigger.triggers.Add(enterEntry);
                trigger.triggers.Add(exitEntry);
            }
        }

        void OnEquip(EquipmentData equip)
        {
            _run.Equip(equip);
            Refresh();
            HideDetail();
        }

        void OnUnequip(EquipSlot slot)
        {
            _run.Unequip(slot);
            Refresh();
            HideDetail();
        }

        // ── Detail Panel ───────────────────────────────────────────────────
        void ShowDetail(EquipmentData equip)
        {
            if (_detailGroup == null) return;
            if (_detailName)  _detailName.text  = equip.EquipName;
            if (_detailDesc)  _detailDesc.text  = equip.Description;
            if (_detailStats) _detailStats.text = BuildStatText(equip.BonusStats);
            if (_detailPassive && !string.IsNullOrEmpty(equip.PassiveText))
                _detailPassive.text = $"【パッシブ】{equip.PassiveText}";
            else if (_detailPassive)
                _detailPassive.text = string.Empty;
            StartCoroutine(UIAnimator.FadeIn(_detailGroup, 0.1f));
        }

        void HideDetail()
        {
            if (_detailGroup != null) StartCoroutine(UIAnimator.FadeOut(_detailGroup, 0.08f));
        }

        static string BuildStatText(CharacterStats s)
        {
            var sb = new System.Text.StringBuilder();
            if (s.MaxHP           != 0) sb.AppendLine($"HP        {s.MaxHP:+#;-#;0}");
            if (s.MaxMP           != 0) sb.AppendLine($"MP        {s.MaxMP:+#;-#;0}");
            if (s.PhysicalAttack  != 0) sb.AppendLine($"物理攻撃  {s.PhysicalAttack:+#;-#;0}");
            if (s.MagicAttack     != 0) sb.AppendLine($"魔法攻撃  {s.MagicAttack:+#;-#;0}");
            if (s.PhysicalDefense != 0) sb.AppendLine($"物理防御  {s.PhysicalDefense:+#;-#;0}");
            if (s.MagicDefense    != 0) sb.AppendLine($"魔法防御  {s.MagicDefense:+#;-#;0}");
            if (s.Speed           != 0) sb.AppendLine($"速度      {s.Speed:+#;-#;0}");
            if (s.Luck            != 0) sb.AppendLine($"運        {s.Luck:+#;-#;0}");
            if (s.CriticalRate    != 0) sb.AppendLine($"会心率    {s.CriticalRate:+#;-#;0}");
            return sb.ToString().TrimEnd();
        }

        static string SlotLabel(EquipSlot s) => s switch
        {
            EquipSlot.Weapon    => "【武器】",
            EquipSlot.Armor     => "【防具】",
            EquipSlot.Accessory => "【アクセ】",
            _                   => string.Empty,
        };
    }

    // ── Slot Display ───────────────────────────────────────────────────────
    [System.Serializable]
    public class EquipSlotDisplay
    {
        public Image            Icon;
        public TextMeshProUGUI  NameText;
        public TextMeshProUGUI  SlotLabel;
        public Button           UnequipButton;

        public void Setup(EquipmentData equip, string label, System.Action onUnequip)
        {
            bool has = equip != null;
            if (SlotLabel)  SlotLabel.text  = label;
            if (Icon)       Icon.enabled    = has && equip.Icon != null;
            if (has && equip.Icon != null && Icon) Icon.sprite = equip.Icon;
            if (NameText)   NameText.text   = has ? equip.EquipName : "──";
            UnequipButton?.gameObject.SetActive(has);
            if (has) { UnequipButton?.onClick.RemoveAllListeners(); UnequipButton?.onClick.AddListener(() => onUnequip?.Invoke()); }
        }
    }
}
