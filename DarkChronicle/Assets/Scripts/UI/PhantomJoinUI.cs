using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Data;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Shown at the Floor 0→1 transition.
    /// Presents two choices: accept phantom party members or refuse and gain levels.
    /// Wire _root to a CanvasGroup in the Roguelike scene (or use PhantomJoinPanelSetup editor script).
    /// </summary>
    public sealed class PhantomJoinUI : MonoBehaviour
    {
        [SerializeField] CanvasGroup     _root;
        [SerializeField] TextMeshProUGUI _titleText;
        [SerializeField] TextMeshProUGUI _bodyText;
        [SerializeField] Transform       _portraitRow;
        [SerializeField] Button          _acceptButton;
        [SerializeField] TextMeshProUGUI _acceptLabel;
        [SerializeField] Button          _refuseButton;
        [SerializeField] TextMeshProUGUI _refuseLabel;

        bool? _accepted;

        // ── Public API ─────────────────────────────────────────────────────
        /// <summary>
        /// Show the two-choice event panel.
        /// Yields until the player makes a choice.
        /// After the coroutine ends, <see cref="AcceptedPhantoms"/> holds the result.
        /// </summary>
        public IEnumerator Show(List<CharacterData> candidates)
        {
            _accepted = null;

            EnsureUI();
            BuildPortraits(candidates);
            SetLabels();

            _acceptButton.onClick.RemoveAllListeners();
            _refuseButton.onClick.RemoveAllListeners();
            _acceptButton.onClick.AddListener(() => _accepted = true);
            _refuseButton.onClick.AddListener(() => _accepted = false);

            yield return FadeGroup(0f, 1f, 0.5f);

            while (_accepted == null) yield return null;

            yield return FadeGroup(1f, 0f, 0.4f);
        }

        public bool AcceptedPhantoms => _accepted ?? false;

        // ── Private helpers ────────────────────────────────────────────────
        void EnsureUI()
        {
            if (_root != null) return;

            // Auto-create a full-screen overlay when not wired in the Inspector
            var canvas = FindAnyObjectByType<Canvas>();
            if (canvas == null) return;

            var go = new GameObject("PhantomJoinPanel");
            go.transform.SetParent(canvas.transform, false);

            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;

            var bg = go.AddComponent<Image>();
            bg.color = new Color(0.05f, 0.03f, 0.10f, 0.92f);

            _root = go.AddComponent<CanvasGroup>();
            _root.alpha         = 0f;
            _root.blocksRaycasts = true;

            // Title
            var titleGO = new GameObject("Title");
            titleGO.transform.SetParent(go.transform, false);
            var titleRT  = titleGO.AddComponent<RectTransform>();
            titleRT.anchorMin = new Vector2(0.1f, 0.70f);
            titleRT.anchorMax = new Vector2(0.9f, 0.85f);
            titleRT.offsetMin = Vector2.zero;
            titleRT.offsetMax = Vector2.zero;
            _titleText = titleGO.AddComponent<TextMeshProUGUI>();
            _titleText.alignment   = TextAlignmentOptions.Center;
            _titleText.fontSize    = 32;
            _titleText.color       = new Color(0.93f, 0.88f, 0.78f);

            // Body
            var bodyGO = new GameObject("Body");
            bodyGO.transform.SetParent(go.transform, false);
            var bodyRT  = bodyGO.AddComponent<RectTransform>();
            bodyRT.anchorMin = new Vector2(0.1f, 0.50f);
            bodyRT.anchorMax = new Vector2(0.9f, 0.68f);
            bodyRT.offsetMin = Vector2.zero;
            bodyRT.offsetMax = Vector2.zero;
            _bodyText = bodyGO.AddComponent<TextMeshProUGUI>();
            _bodyText.alignment = TextAlignmentOptions.Center;
            _bodyText.fontSize  = 20;
            _bodyText.color     = new Color(0.80f, 0.76f, 0.68f);

            // Portrait row
            var rowGO = new GameObject("PortraitRow");
            rowGO.transform.SetParent(go.transform, false);
            var rowRT = rowGO.AddComponent<RectTransform>();
            rowRT.anchorMin = new Vector2(0.15f, 0.30f);
            rowRT.anchorMax = new Vector2(0.85f, 0.48f);
            rowRT.offsetMin = Vector2.zero;
            rowRT.offsetMax = Vector2.zero;
            var hlg = rowGO.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing           = 20f;
            hlg.childAlignment    = TextAnchor.MiddleCenter;
            hlg.childForceExpandWidth  = false;
            hlg.childForceExpandHeight = false;
            _portraitRow = rowGO.transform;

            // Accept button
            _acceptButton = MakeButton(go.transform, new Vector2(0.15f, 0.10f), new Vector2(0.45f, 0.24f),
                                       new Color(0.20f, 0.36f, 0.58f), out _acceptLabel);

            // Refuse button
            _refuseButton = MakeButton(go.transform, new Vector2(0.55f, 0.10f), new Vector2(0.85f, 0.24f),
                                       new Color(0.48f, 0.22f, 0.20f), out _refuseLabel);
        }

        void SetLabels()
        {
            if (_titleText) _titleText.text = "幻影との邂逅";
            if (_bodyText)  _bodyText.text  =
                "奈落の霧の中から、二つの気配が近づいてくる。\n" +
                "それは旅の同行者となるのか、それとも拒むのか。";
            if (_acceptLabel) _acceptLabel.text = "幻影を受け入れる\n（仲間が加入）";
            if (_refuseLabel) _refuseLabel.text = "拒み、力を求める\n（自分のレベル+2）";
        }

        void BuildPortraits(List<CharacterData> candidates)
        {
            if (_portraitRow == null) return;
            foreach (Transform child in _portraitRow) Destroy(child.gameObject);

            int show = Mathf.Min(2, candidates != null ? candidates.Count : 0);
            for (int i = 0; i < show; i++)
            {
                var cd = candidates[i];
                var card = new GameObject($"Portrait_{i}");
                card.transform.SetParent(_portraitRow, false);
                var cardRT = card.AddComponent<RectTransform>();
                cardRT.sizeDelta = new Vector2(120f, 150f);
                var vlg = card.AddComponent<VerticalLayoutGroup>();
                vlg.spacing           = 6f;
                vlg.childAlignment    = TextAnchor.UpperCenter;
                vlg.childForceExpandWidth  = false;
                vlg.childForceExpandHeight = false;
                vlg.padding = new RectOffset(0, 0, 0, 0);

                var imgGO = new GameObject("Portrait");
                imgGO.transform.SetParent(card.transform, false);
                var imgRT  = imgGO.AddComponent<RectTransform>();
                imgRT.sizeDelta = new Vector2(80f, 100f);
                var img = imgGO.AddComponent<Image>();
                if (cd != null && cd.Portrait != null)
                    img.sprite = cd.Portrait;
                else
                    img.color = new Color(0.3f, 0.3f, 0.4f);
                imgGO.AddComponent<LayoutElement>().preferredHeight = 100f;

                var nameGO  = new GameObject("Name");
                nameGO.transform.SetParent(card.transform, false);
                nameGO.AddComponent<RectTransform>().sizeDelta = new Vector2(120f, 30f);
                var nameTMP = nameGO.AddComponent<TextMeshProUGUI>();
                nameTMP.text      = cd?.CharacterName ?? "???";
                nameTMP.alignment = TextAlignmentOptions.Center;
                nameTMP.fontSize  = 16;
                nameTMP.color     = new Color(0.93f, 0.88f, 0.78f);
                nameGO.AddComponent<LayoutElement>().preferredHeight = 30f;

                var lvGO  = new GameObject("Level");
                lvGO.transform.SetParent(card.transform, false);
                lvGO.AddComponent<RectTransform>().sizeDelta = new Vector2(120f, 22f);
                var lvTMP = lvGO.AddComponent<TextMeshProUGUI>();
                lvTMP.text      = "Lv. 4";
                lvTMP.alignment = TextAlignmentOptions.Center;
                lvTMP.fontSize  = 14;
                lvTMP.color     = new Color(0.60f, 0.80f, 0.60f);
                lvGO.AddComponent<LayoutElement>().preferredHeight = 22f;
            }
        }

        static Button MakeButton(Transform parent, Vector2 anchorMin, Vector2 anchorMax,
                                  Color color, out TextMeshProUGUI label)
        {
            var go = new GameObject("Btn");
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;

            var img = go.AddComponent<Image>();
            img.color = color;

            var btn = go.AddComponent<Button>();
            var colors = btn.colors;
            colors.highlightedColor = color * 1.3f;
            colors.pressedColor     = color * 0.8f;
            btn.colors = colors;

            var textGO = new GameObject("Label");
            textGO.transform.SetParent(go.transform, false);
            var textRT = textGO.AddComponent<RectTransform>();
            textRT.anchorMin = Vector2.zero;
            textRT.anchorMax = Vector2.one;
            textRT.offsetMin = new Vector2(8f, 4f);
            textRT.offsetMax = new Vector2(-8f, -4f);
            label = textGO.AddComponent<TextMeshProUGUI>();
            label.alignment   = TextAlignmentOptions.Center;
            label.fontSize    = 18;
            label.color       = Color.white;

            return btn;
        }

        IEnumerator FadeGroup(float from, float to, float duration)
        {
            if (_root == null) yield break;
            float elapsed = 0f;
            _root.alpha         = from;
            _root.blocksRaycasts = to > 0.5f;
            while (elapsed < duration)
            {
                elapsed     += Time.deltaTime;
                _root.alpha  = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            _root.alpha         = to;
            _root.blocksRaycasts = to > 0.5f;
        }
    }
}
