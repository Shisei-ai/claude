using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.Roguelike.Map
{
    /// <summary>
    /// Renders the procedural map as a canvas of node icons connected by lines.
    /// Player selects the next node by clicking; unavailable nodes are dimmed.
    /// </summary>
    public sealed class NodeMapUI : MonoBehaviour
    {
        [Header("Layout")]
        [SerializeField] RectTransform _mapRoot;
        [SerializeField] Vector2       _nodeSpacing  = new(110f, 80f);
        [SerializeField] Vector2       _mapOrigin    = new(-350f, -450f);

        [Header("Node Prefabs")]
        [SerializeField] GameObject    _nodePrefab;
        [SerializeField] GameObject    _edgePrefab;      // UI Image used as a line

        [Header("Node Sprites")]
        [SerializeField] Sprite        _battleSprite;
        [SerializeField] Sprite        _eliteSprite;
        [SerializeField] Sprite        _bossSprite;
        [SerializeField] Sprite        _shopSprite;
        [SerializeField] Sprite        _restSprite;
        [SerializeField] Sprite        _eventSprite;
        [SerializeField] Sprite        _treasureSprite;
        [SerializeField] Sprite        _cursedSprite;

        [Header("Colors")]
        [SerializeField] Color         _availableColor  = Color.white;
        [SerializeField] Color         _visitedColor    = new(0.5f, 0.5f, 0.5f, 0.7f);
        [SerializeField] Color         _lockedColor     = new(0.2f, 0.2f, 0.2f, 0.5f);
        [SerializeField] Color         _playerColor     = new(0.8f, 1f, 0.3f, 1f);

        [Header("Scroll")]
        [SerializeField] ScrollRect    _scrollRect;

        [Header("Floor Label")]
        [SerializeField] TextMeshProUGUI _floorLabel;

        // ── State ──────────────────────────────────────────────────────────
        MapData                    _mapData;
        Dictionary<int, NodeIcon>  _nodeIcons = new();
        System.Action<MapNode>     _onNodeSelected;

        // ── Public API ─────────────────────────────────────────────────────
        public void BuildMap(MapData data, int currentNodeID, System.Action<MapNode> onNodeSelected)
        {
            _mapData        = data;
            _onNodeSelected = onNodeSelected;

            foreach (Transform child in _mapRoot) Destroy(child.gameObject);
            _nodeIcons.Clear();

            DrawEdges(data);
            DrawNodes(data, currentNodeID);

            if (_floorLabel != null)
                _floorLabel.text = $"第{data.FloorIndex + 1}層";

            // Scroll to current node
            StartCoroutine(ScrollToNode(currentNodeID));
        }

        public void RefreshAvailability(int currentNodeID)
        {
            var currentNode = _mapData.GetNode(currentNodeID);
            var availableIDs = new HashSet<int>(currentNode?.NextIDs ?? new List<int>());

            foreach (var (id, icon) in _nodeIcons)
            {
                var node = _mapData.GetNode(id);
                if (node.Visited)             icon.SetState(NodeIconState.Visited);
                else if (id == currentNodeID) icon.SetState(NodeIconState.Current);
                else if (availableIDs.Contains(id)) icon.SetState(NodeIconState.Available);
                else                          icon.SetState(NodeIconState.Locked);
            }
        }

        // ── Build ──────────────────────────────────────────────────────────
        void DrawNodes(MapData data, int currentNodeID)
        {
            var currentNode  = data.GetNode(currentNodeID);
            var availableIDs = new HashSet<int>(currentNode?.NextIDs ?? new List<int>());

            foreach (var node in data.Nodes)
            {
                Vector2 pos = NodePosition(node.Row, node.Column);
                var go      = Instantiate(_nodePrefab, _mapRoot);
                go.GetComponent<RectTransform>().anchoredPosition = pos;

                var icon = go.GetComponent<NodeIcon>() ?? go.AddComponent<NodeIcon>();
                icon.Setup(node, SpriteForType(node.Type), TypeLabel(node.Type));

                NodeIconState state;
                if (node.Visited)             state = NodeIconState.Visited;
                else if (node.ID == currentNodeID) state = NodeIconState.Current;
                else if (availableIDs.Contains(node.ID)) state = NodeIconState.Available;
                else                          state = NodeIconState.Locked;

                icon.SetState(state);

                if (state == NodeIconState.Available)
                {
                    var capturedNode = node;
                    icon.Button.onClick.AddListener(() => OnNodeClicked(capturedNode));
                }

                _nodeIcons[node.ID] = icon;
            }
        }

        void DrawEdges(MapData data)
        {
            foreach (var from in data.Nodes)
            {
                foreach (int toID in from.NextIDs)
                {
                    var to = data.GetNode(toID);
                    if (to == null) continue;

                    var edgeGO = Instantiate(_edgePrefab, _mapRoot);
                    edgeGO.transform.SetAsFirstSibling();  // edges behind nodes

                    var rt = edgeGO.GetComponent<RectTransform>();
                    Vector2 fromPos = NodePosition(from.Row, from.Column);
                    Vector2 toPos   = NodePosition(to.Row,   to.Column);

                    Vector2 delta  = toPos - fromPos;
                    float   length = delta.magnitude;
                    float   angle  = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg;

                    rt.anchoredPosition = fromPos + delta * 0.5f;
                    rt.sizeDelta        = new Vector2(length, 3f);
                    rt.localRotation    = Quaternion.Euler(0f, 0f, angle);

                    var img = edgeGO.GetComponent<Image>();
                    if (img != null) img.color = new Color(0.4f, 0.35f, 0.55f, 0.6f);
                }
            }
        }

        void OnNodeClicked(MapNode node) => _onNodeSelected?.Invoke(node);

        IEnumerator ScrollToNode(int nodeID)
        {
            yield return null;  // wait one frame for layout
            if (_scrollRect == null || !_nodeIcons.TryGetValue(nodeID, out var icon)) yield break;

            var rt       = icon.GetComponent<RectTransform>();
            float yRatio = 1f - (rt.anchoredPosition.y - _mapOrigin.y)
                               / (_mapRoot.rect.height - (_scrollRect.viewport?.rect.height ?? 600f));
            _scrollRect.verticalNormalizedPosition = Mathf.Clamp01(yRatio);
        }

        // ── Helpers ────────────────────────────────────────────────────────
        Vector2 NodePosition(int row, int col)
        {
            float x = _mapOrigin.x + col * _nodeSpacing.x;
            float y = _mapOrigin.y + row * _nodeSpacing.y;
            // Odd columns: slight vertical offset for visual interest
            if (col % 2 == 1) y += _nodeSpacing.y * 0.35f;
            return new Vector2(x, y);
        }

        Sprite SpriteForType(NodeType type) => type switch
        {
            NodeType.Battle      => _battleSprite,
            NodeType.EliteBattle => _eliteSprite,
            NodeType.Boss        => _bossSprite,
            NodeType.Shop        => _shopSprite,
            NodeType.RestSite    => _restSprite,
            NodeType.RandomEvent => _eventSprite,
            NodeType.Treasure    => _treasureSprite,
            NodeType.CursedRoom  => _cursedSprite,
            _                    => _battleSprite
        };

        string TypeLabel(NodeType type) => type switch
        {
            NodeType.Battle      => "戦闘",
            NodeType.EliteBattle => "強敵",
            NodeType.Boss        => "BOSS",
            NodeType.Shop        => "商店",
            NodeType.RestSite    => "野営",
            NodeType.RandomEvent => "？",
            NodeType.Treasure    => "宝",
            NodeType.CursedRoom  => "呪",
            _                    => ""
        };
    }

    // ── Node Icon Component ────────────────────────────────────────────────
    public enum NodeIconState { Available, Visited, Locked, Current }

    public sealed class NodeIcon : MonoBehaviour
    {
        [SerializeField] Image            _icon;
        [SerializeField] Image            _ring;
        [SerializeField] TextMeshProUGUI  _label;
        [SerializeField] CanvasGroup      _group;

        public Button Button { get; private set; }

        void Awake()
        {
            Button = GetComponent<Button>();
            if (_group == null) _group = GetComponent<CanvasGroup>();
        }

        public void Setup(MapNode node, Sprite sprite, string label)
        {
            if (_icon  != null) _icon.sprite = sprite;
            if (_label != null) _label.text  = label;
        }

        public void SetState(NodeIconState state)
        {
            if (Button != null) Button.interactable = state == NodeIconState.Available;

            Color color = state switch
            {
                NodeIconState.Available => new Color(1f,   1f,   1f,   1f),
                NodeIconState.Visited   => new Color(0.5f, 0.5f, 0.5f, 0.7f),
                NodeIconState.Locked    => new Color(0.2f, 0.2f, 0.2f, 0.5f),
                NodeIconState.Current   => new Color(0.8f, 1f,   0.3f, 1f),
                _                      => Color.white
            };

            if (_icon  != null) _icon.color  = color;
            if (_ring  != null) _ring.enabled = state == NodeIconState.Current;
            if (_group != null) _group.alpha  = state == NodeIconState.Locked ? 0.4f : 1f;
        }
    }
}
