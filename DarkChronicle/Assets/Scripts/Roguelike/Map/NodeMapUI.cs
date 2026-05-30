using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Roguelike.Relics;

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
        [SerializeField] Sprite        _startSprite;

        [Header("Player Marker")]
        [SerializeField] GameObject    _playerMarkerPrefab;

        [Header("Colors")]
        [SerializeField] Color         _availableColor  = Color.white;
        [SerializeField] Color         _visitedColor    = new(0.5f, 0.5f, 0.5f, 0.7f);
        [SerializeField] Color         _lockedColor     = new(0.2f, 0.2f, 0.2f, 0.5f);
        [SerializeField] Color         _currentColor    = new(0.8f, 1f, 0.3f, 1f);

        [Header("Scroll")]
        [SerializeField] ScrollRect    _scrollRect;

        [Header("Floor Label")]
        [SerializeField] TextMeshProUGUI _floorLabel;

        // ── State ──────────────────────────────────────────────────────────
        MapData                    _mapData;
        Dictionary<int, NodeIcon>  _nodeIcons = new();
        System.Action<MapNode>     _onNodeSelected;
        GameObject                 _playerMarkerInstance;
        Coroutine                  _pulseRoutine;
        int                        _lastCurrentNodeID = -1;
        HashSet<int>               _shortcutNodeIDs   = new();

        // ── Public API ─────────────────────────────────────────────────────
        public void BuildMap(MapData data, int currentNodeID, System.Action<MapNode> onNodeSelected)
        {
            _mapData          = data;
            _onNodeSelected   = onNodeSelected;
            _lastCurrentNodeID = currentNodeID;

            ClearMap();

            // Compute reachable IDs before drawing
            var (currentNode, availableIDs) = ComputeAvailability(data, currentNodeID);
            ComputeShortcutNodes(data, availableIDs);

            var drawAvailableIDs = new HashSet<int>(availableIDs);
            drawAvailableIDs.UnionWith(_shortcutNodeIDs);

            SetMapContentSize();
            DrawEdges(data, currentNode, drawAvailableIDs);
            DrawNodes(data, currentNodeID, currentNode, drawAvailableIDs);

            if (_floorLabel != null)
                _floorLabel.text = $"第{data.FloorIndex + 1}層";

            PlacePlayerMarker(currentNodeID);

            // Scroll to current node (or to start if first visit)
            StartCoroutine(ScrollToNode(currentNodeID >= 0 ? currentNodeID : data.GetStartNodes().FirstOrDefault()?.ID ?? -1));
        }

        public void RefreshAvailability(int currentNodeID)
        {
            if (_mapData == null) return;
            _lastCurrentNodeID = currentNodeID;

            var (currentNode, availableIDs) = ComputeAvailability(_mapData, currentNodeID);
            ComputeShortcutNodes(_mapData, availableIDs);

            foreach (var (id, icon) in _nodeIcons)
            {
                var node = _mapData.GetNode(id);
                if (node == null) continue;

                NodeIconState state;
                if (node.Visited)                                                   state = NodeIconState.Visited;
                else if (id == currentNodeID)                                       state = NodeIconState.Current;
                else if (availableIDs.Contains(id) || _shortcutNodeIDs.Contains(id)) state = NodeIconState.Available;
                else                                                                state = NodeIconState.Locked;

                icon.SetState(state);
                if (state == NodeIconState.Available)
                {
                    icon.Button.onClick.RemoveAllListeners();
                    var capturedNode = node;
                    icon.Button.onClick.AddListener(() => OnNodeClicked(capturedNode));
                }
            }

            PlacePlayerMarker(currentNodeID);
        }

        // ── Build internals ────────────────────────────────────────────────
        static (MapNode current, HashSet<int> available) ComputeAvailability(MapData data, int currentNodeID)
        {
            var current = data.GetNode(currentNodeID);
            var available = new HashSet<int>();

            if (current != null)
            {
                foreach (int id in current.NextIDs) available.Add(id);
            }
            else
            {
                // Before first move: all start nodes are available
                foreach (var n in data.GetStartNodes()) available.Add(n.ID);
            }
            return (current, available);
        }

        void DrawNodes(MapData data, int currentNodeID, MapNode currentNode, HashSet<int> availableIDs)
        {
            foreach (var node in data.Nodes)
            {
                Vector2 pos = NodePosition(node.Row, node.Column);
                var go      = Instantiate(_nodePrefab, _mapRoot);
                go.GetComponent<RectTransform>().anchoredPosition = pos;

                var icon = go.GetComponent<NodeIcon>() ?? go.AddComponent<NodeIcon>();
                icon.Setup(node, SpriteForType(node.Type), TypeLabel(node.Type));

                NodeIconState state;
                if (node.Visited)                        state = NodeIconState.Visited;
                else if (node.ID == currentNodeID)       state = NodeIconState.Current;
                else if (availableIDs.Contains(node.ID)) state = NodeIconState.Available;
                else                                     state = NodeIconState.Locked;

                icon.SetState(state);

                if (state == NodeIconState.Available)
                {
                    var capturedNode = node;
                    icon.Button.onClick.AddListener(() => OnNodeClicked(capturedNode));
                }

                _nodeIcons[node.ID] = icon;
            }
        }

        void DrawEdges(MapData data, MapNode currentNode, HashSet<int> availableIDs)
        {
            foreach (var from in data.Nodes)
            {
                foreach (int toID in from.NextIDs)
                {
                    var to = data.GetNode(toID);
                    if (to == null) continue;

                    var edgeGO = Instantiate(_edgePrefab, _mapRoot);
                    edgeGO.transform.SetAsFirstSibling();

                    var rt = edgeGO.GetComponent<RectTransform>();
                    Vector2 fromPos = NodePosition(from.Row, from.Column);
                    Vector2 toPos   = NodePosition(to.Row,   to.Column);
                    Vector2 delta   = toPos - fromPos;
                    float   length  = delta.magnitude;
                    float   angle   = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg;

                    rt.anchoredPosition = fromPos + delta * 0.5f;
                    rt.sizeDelta        = new Vector2(length, 3f);
                    rt.localRotation    = Quaternion.Euler(0f, 0f, angle);

                    // Color edge by path state
                    Color edgeColor = EdgeColor(from, to, currentNode, availableIDs);
                    var img = edgeGO.GetComponent<Image>();
                    if (img != null) img.color = edgeColor;
                }
            }
        }

        static Color EdgeColor(MapNode from, MapNode to, MapNode currentNode, HashSet<int> availableIDs)
        {
            bool fromVisited    = from.Visited;
            bool toVisited      = to.Visited;
            bool isCurrent      = currentNode != null && from.ID == currentNode.ID;
            bool isAvailableTo  = availableIDs.Contains(to.ID);

            // Active path to a selectable next node
            if (isCurrent && isAvailableTo)
                return new Color(1f, 0.88f, 0.2f, 0.9f);

            // Already-walked path
            if (fromVisited && toVisited)
                return new Color(0.45f, 0.45f, 0.5f, 0.55f);

            // Partially walked (visited → current)
            if (fromVisited)
                return new Color(0.35f, 0.32f, 0.48f, 0.45f);

            // Locked future path
            return new Color(0.22f, 0.18f, 0.32f, 0.30f);
        }

        // ── Player marker ──────────────────────────────────────────────────
        void PlacePlayerMarker(int nodeID)
        {
            if (_pulseRoutine != null) StopCoroutine(_pulseRoutine);
            if (_playerMarkerInstance != null) Destroy(_playerMarkerInstance);

            if (_playerMarkerPrefab == null || nodeID < 0) return;
            if (!_nodeIcons.TryGetValue(nodeID, out var icon)) return;

            _playerMarkerInstance = Instantiate(_playerMarkerPrefab, _mapRoot);
            var rt     = _playerMarkerInstance.GetComponent<RectTransform>();
            var iconRT = icon.GetComponent<RectTransform>();
            if (rt != null && iconRT != null)
                rt.anchoredPosition = iconRT.anchoredPosition;

            _pulseRoutine = StartCoroutine(PulseMarker(_playerMarkerInstance.transform));
        }

        IEnumerator PulseMarker(Transform t)
        {
            while (t != null)
            {
                float scale = Mathf.Lerp(0.85f, 1.15f, Mathf.PingPong(Time.unscaledTime * 1.8f, 1f));
                t.localScale = Vector3.one * scale;
                yield return null;
            }
        }

        // ── Map sizing ─────────────────────────────────────────────────────
        void SetMapContentSize()
        {
            if (_mapRoot == null) return;

            float minX = float.MaxValue, maxX = float.MinValue;
            float minY = float.MaxValue, maxY = float.MinValue;

            for (int r = 0; r < NodeMapGenerator.Rows; r++)
            {
                for (int c = 0; c < NodeMapGenerator.Columns; c++)
                {
                    Vector2 p = NodePosition(r, c);
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }
            }

            const float padding = 80f;
            _mapRoot.sizeDelta = new Vector2(maxX - minX + padding * 2,
                                             maxY - minY + padding * 2);
        }

        // ── Scroll ─────────────────────────────────────────────────────────
        IEnumerator ScrollToNode(int nodeID)
        {
            yield return null;  // wait one frame for layout
            if (_scrollRect == null || !_nodeIcons.TryGetValue(nodeID, out var icon)) yield break;

            float contentH  = _mapRoot.rect.height;
            float viewportH = _scrollRect.viewport?.rect.height ?? 600f;
            float yPos      = icon.GetComponent<RectTransform>().anchoredPosition.y;

            // Normalised vertical position (0=bottom, 1=top)
            float t = (yPos - _mapOrigin.y) / Mathf.Max(1f, contentH - viewportH);
            _scrollRect.verticalNormalizedPosition = Mathf.Clamp01(t);
        }

        // ── Helpers ────────────────────────────────────────────────────────
        void ClearMap()
        {
            foreach (Transform child in _mapRoot) Destroy(child.gameObject);
            _nodeIcons.Clear();
            _playerMarkerInstance = null;
        }

        void OnNodeClicked(MapNode node)
        {
            // Consume ShortcutKey when a grandchild node is selected
            if (_shortcutNodeIDs.Contains(node.ID))
                RelicManager.Instance?.UseShortcutKey();
            _onNodeSelected?.Invoke(node);
        }

        void ComputeShortcutNodes(MapData data, HashSet<int> directAvailable)
        {
            _shortcutNodeIDs.Clear();
            if (RelicManager.Instance?.HasShortcutKey() != true) return;
            foreach (int nextID in directAvailable)
            {
                var nextNode = data.GetNode(nextID);
                if (nextNode == null) continue;
                foreach (int nnID in nextNode.NextIDs)
                    if (!directAvailable.Contains(nnID))
                        _shortcutNodeIDs.Add(nnID);
            }
        }

        Vector2 NodePosition(int row, int col)
        {
            float x = _mapOrigin.x + col * _nodeSpacing.x;
            float y = _mapOrigin.y + row * _nodeSpacing.y;
            if (col % 2 == 1) y += _nodeSpacing.y * 0.35f;  // stagger odd columns
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
            NodeType.Start       => _startSprite ?? _battleSprite,
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
            NodeType.Start       => "出発",
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

            Color iconColor = state switch
            {
                NodeIconState.Available => new Color(1f,   1f,   1f,   1f),
                NodeIconState.Visited   => new Color(0.45f, 0.45f, 0.5f, 0.7f),
                NodeIconState.Locked    => new Color(0.2f,  0.2f,  0.25f, 0.45f),
                NodeIconState.Current   => new Color(0.9f,  1f,    0.35f, 1f),
                _                      => Color.white
            };

            if (_icon  != null) _icon.color = iconColor;
            if (_ring  != null) _ring.enabled = state == NodeIconState.Current || state == NodeIconState.Available;
            if (_ring  != null && _ring.enabled)
                _ring.color = state == NodeIconState.Current
                    ? new Color(1f, 0.9f, 0.2f, 0.9f)
                    : new Color(0.8f, 0.85f, 1f, 0.5f);
            if (_group != null) _group.alpha = state == NodeIconState.Locked ? 0.38f : 1f;
        }
    }
}
