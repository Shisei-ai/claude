using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Core;
using DarkChronicle.Roguelike;

namespace DarkChronicle.Roguelike.Meta
{
    /// <summary>
    /// MetaUpgrade シーンのUIコントローラ。
    /// 5パス × 5ノードの永続強化ツリーを表示し、碑文を消費してノードを解放する。
    /// </summary>
    public sealed class MetaUpgradeUIController : MonoBehaviour
    {
        // ── Header ────────────────────────────────────────────────────────────
        [Header("Header")]
        [SerializeField] TextMeshProUGUI _epitaphText;
        [SerializeField] Button          _backButton;
        [SerializeField] Button          _resetButton;   // デバッグ用リセット (optional)

        // ── Node Tree ─────────────────────────────────────────────────────────
        [Header("Node Tree")]
        [SerializeField] Transform       _pathContainer;   // 水平レイアウト — 5つのパス列の親
        [SerializeField] GameObject      _pathColumnPrefab; // Vertical layout column per path
        [SerializeField] GameObject      _nodeButtonPrefab; // Button prefab for each node

        // ── Tooltip Panel ─────────────────────────────────────────────────────
        [Header("Tooltip")]
        [SerializeField] CanvasGroup     _tooltip;
        [SerializeField] TextMeshProUGUI _tooltipName;
        [SerializeField] TextMeshProUGUI _tooltipDesc;
        [SerializeField] TextMeshProUGUI _tooltipCost;
        [SerializeField] TextMeshProUGUI _tooltipStatus;

        // ── Node colours ──────────────────────────────────────────────────────
        static readonly Color ColUnlocked  = new(0.25f, 0.85f, 0.40f); // green
        static readonly Color ColAvailable = new(0.95f, 0.85f, 0.20f); // gold
        static readonly Color ColLocked    = new(0.45f, 0.45f, 0.45f); // grey
        static readonly Color ColFinal     = new(0.95f, 0.55f, 0.10f); // orange (★ final)

        readonly Dictionary<string, Button> _nodeButtons = new();

        // ── Unity ─────────────────────────────────────────────────────────────
        void Start()
        {
            _backButton.onClick.AddListener(() =>
                SceneManager.LoadScene(SceneNames.MainMenu));

            if (_resetButton != null)
                _resetButton.onClick.AddListener(OnResetAll);

            if (_tooltip != null)
                _tooltip.alpha = 0f;

            BuildTree();
            RefreshAll();
        }

        // ── Tree Build ────────────────────────────────────────────────────────
        void BuildTree()
        {
            if (_pathContainer == null || _pathColumnPrefab == null || _nodeButtonPrefab == null)
            {
                Debug.LogWarning("[MetaUpgradeUI] パスコンテナ、カラムPrefab、ノードPrefabが未設定です。");
                return;
            }

            // Group nodes by PathName
            var paths = new Dictionary<string, List<MetaUpgradeNode>>();
            foreach (var node in MetaUpgradeTree.AllNodes)
            {
                if (!paths.ContainsKey(node.PathName))
                    paths[node.PathName] = new List<MetaUpgradeNode>();
                paths[node.PathName].Add(node);
            }

            foreach (var (pathName, nodes) in paths)
            {
                var colGO = Instantiate(_pathColumnPrefab, _pathContainer);

                // Set path header label if the column prefab has a TextMeshProUGUI at root
                var header = colGO.GetComponentInChildren<TextMeshProUGUI>();
                if (header != null) header.text = pathName;

                // Find or use a child container for the node buttons
                var nodeContainer = colGO.transform.Find("NodeContainer") ?? colGO.transform;

                foreach (var node in nodes)
                {
                    var captured = node;
                    var btnGO = Instantiate(_nodeButtonPrefab, nodeContainer);
                    var btn   = btnGO.GetComponent<Button>() ?? btnGO.GetComponentInChildren<Button>();
                    if (btn == null) continue;

                    // Set node name label
                    var labels = btnGO.GetComponentsInChildren<TextMeshProUGUI>();
                    if (labels.Length > 0) labels[0].text = node.DisplayName;
                    if (labels.Length > 1) labels[1].text = $"{node.EpitaphCost} 碑文";

                    btn.onClick.AddListener(() => OnNodeClicked(captured));

                    // Hover tooltip
                    var trigger = btnGO.GetComponent<UnityEngine.EventSystems.EventTrigger>()
                               ?? btnGO.AddComponent<UnityEngine.EventSystems.EventTrigger>();
                    AddHoverEntry(trigger, UnityEngine.EventSystems.EventTriggerType.PointerEnter,
                                  _ => ShowTooltip(captured));
                    AddHoverEntry(trigger, UnityEngine.EventSystems.EventTriggerType.PointerExit,
                                  _ => HideTooltip());

                    _nodeButtons[node.ID] = btn;
                }
            }
        }

        // ── Refresh ───────────────────────────────────────────────────────────
        void RefreshAll()
        {
            if (_epitaphText != null)
                _epitaphText.text = $"碑文（ヒトブン）: {MetaProgression.TotalEpitaphs}";

            foreach (var node in MetaUpgradeTree.AllNodes)
            {
                if (!_nodeButtons.TryGetValue(node.ID, out var btn)) continue;

                bool unlocked  = MetaUpgradeTree.IsUnlocked(node.ID);
                bool canUnlock = !unlocked && MetaUpgradeTree.CanUnlock(node.ID);

                btn.interactable = canUnlock;

                // Tint the button image to reflect state
                var img = btn.GetComponent<Image>();
                if (img != null)
                {
                    if (unlocked)
                        img.color = node.IsFinalNode ? ColFinal : ColUnlocked;
                    else if (canUnlock)
                        img.color = ColAvailable;
                    else
                        img.color = ColLocked;
                }
            }
        }

        // ── Node Click ────────────────────────────────────────────────────────
        void OnNodeClicked(MetaUpgradeNode node)
        {
            if (!MetaUpgradeTree.TryUnlock(node.ID)) return;
            RefreshAll();
            HideTooltip();
        }

        // ── Reset ─────────────────────────────────────────────────────────────
        void OnResetAll()
        {
            MetaUpgradeTree.ResetAll();
            RefreshAll();
        }

        // ── Tooltip ───────────────────────────────────────────────────────────
        void ShowTooltip(MetaUpgradeNode node)
        {
            if (_tooltip == null) return;

            bool unlocked  = MetaUpgradeTree.IsUnlocked(node.ID);
            bool canUnlock = MetaUpgradeTree.CanUnlock(node.ID);

            if (_tooltipName)   _tooltipName.text   = node.DisplayName;
            if (_tooltipDesc)   _tooltipDesc.text   = node.Description;
            if (_tooltipCost)   _tooltipCost.text   = $"コスト: {node.EpitaphCost} 碑文";
            if (_tooltipStatus)
            {
                _tooltipStatus.text = unlocked  ? "✓ 解放済み"
                                    : canUnlock ? "▶ 解放可能"
                                    :             "🔒 ロック中";
            }

            _tooltip.alpha           = 1f;
            _tooltip.blocksRaycasts  = false;
        }

        void HideTooltip()
        {
            if (_tooltip == null) return;
            _tooltip.alpha = 0f;
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        static void AddHoverEntry(UnityEngine.EventSystems.EventTrigger trigger,
                                  UnityEngine.EventSystems.EventTriggerType type,
                                  UnityEngine.Events.UnityAction<UnityEngine.EventSystems.BaseEventData> action)
        {
            var entry = new UnityEngine.EventSystems.EventTrigger.Entry { eventID = type };
            entry.callback.AddListener(action);
            trigger.triggers.Add(entry);
        }
    }
}
