using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Cursor-following tooltip panel. Pair with TooltipTrigger on hover targets.
    /// </summary>
    public sealed class TooltipSystem : MonoBehaviour
    {
        public static TooltipSystem Instance { get; private set; }

        [SerializeField] CanvasGroup        _group;
        [SerializeField] RectTransform      _panel;
        [SerializeField] TextMeshProUGUI    _titleText;
        [SerializeField] TextMeshProUGUI    _bodyText;
        [SerializeField] LayoutElement      _layoutElement;
        [SerializeField] int                _maxWidth = 280;

        Canvas _canvas;

        void Awake()
        {
            Instance = this;
            _canvas  = GetComponentInParent<Canvas>();
            if (_group != null) { _group.alpha = 0f; _group.blocksRaycasts = false; }
        }

        void Update()
        {
            if (_group == null || _group.alpha < 0.01f) return;
            FollowCursor();
        }

        public void Show(string title, string body)
        {
            if (_group == null) return;
            if (_titleText) _titleText.text = title;
            if (_bodyText)  _bodyText.text  = body;
            if (_layoutElement)
                _layoutElement.preferredWidth = body.Length > 60 ? _maxWidth : -1;

            _group.alpha          = 1f;
            _group.blocksRaycasts = false;
            FollowCursor();
        }

        public void Hide()
        {
            if (_group == null) return;
            _group.alpha          = 0f;
            _group.blocksRaycasts = false;
        }

        void FollowCursor()
        {
            if (_canvas == null || _panel == null) return;

            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                _canvas.transform as RectTransform,
                Input.mousePosition,
                _canvas.renderMode == RenderMode.ScreenSpaceOverlay ? null : _canvas.worldCamera,
                out Vector2 localPos);

            var canvasRect = (_canvas.transform as RectTransform).rect;
            float pw = _panel.rect.width;
            float ph = _panel.rect.height;
            const float offset = 12f;

            // Offset right/down from cursor, clamped within canvas bounds
            localPos.x = Mathf.Clamp(localPos.x + offset,
                canvasRect.xMin + pw * 0.5f, canvasRect.xMax - pw * 0.5f);
            localPos.y = Mathf.Clamp(localPos.y - offset,
                canvasRect.yMin + ph * 0.5f, canvasRect.yMax - ph * 0.5f);

            _panel.anchoredPosition = localPos;
        }
    }
}
