#if UNITY_EDITOR
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.UI;
using DarkChronicle.Data;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// DarkChronicle → Create RunSetup Scene
    /// ニューゲーム開始前の準備シーン（キャラ・祝福・難易度選択）を自動構築する。
    /// </summary>
    public static class RunSetupSceneSetup
    {
        const string ScenePath = "Assets/Scenes/RunSetup.unity";

        // ── カラーパレット（MainMenu と統一した暗黒ファンタジー調） ────────────
        static readonly Color ColBg      = new(0.036f, 0.024f, 0.067f);
        static readonly Color ColTitle   = new(0.930f, 0.880f, 0.780f);
        static readonly Color ColSub     = new(0.720f, 0.600f, 0.350f);
        static readonly Color ColGold    = new(0.780f, 0.600f, 0.200f);
        static readonly Color ColBtnBg   = new(0.083f, 0.050f, 0.167f);
        static readonly Color ColBtnText = new(0.867f, 0.816f, 0.706f);
        static readonly Color ColSep     = new(0.290f, 0.188f, 0.376f);
        static readonly Color ColDotOff  = new(0.250f, 0.200f, 0.333f);
        static readonly Color ColDotOn   = new(0.780f, 0.600f, 0.200f);

        [MenuItem("DarkChronicle/Create RunSetup Scene", priority = 103)]
        public static void CreateScene()
        {
            EnsureScenesFolder();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);

            // ── インフラ ─────────────────────────────────────────────────────
            var camGO = Make("MainCamera", scene);
            var cam   = camGO.AddComponent<Camera>();
            cam.clearFlags      = CameraClearFlags.SolidColor;
            cam.backgroundColor = ColBg;
            cam.orthographic    = true;
            camGO.AddComponent<AudioListener>();

            var evtGO = Make("EventSystem", scene);
            evtGO.AddComponent<EventSystem>();
            evtGO.AddComponent<StandaloneInputModule>();

            var sfxGO  = Make("SFXSource", scene);
            var sfxSrc = sfxGO.AddComponent<AudioSource>();
            sfxSrc.playOnAwake = false;

            // ── Canvas ───────────────────────────────────────────────────────
            var canvasGO = Make("Canvas", scene);
            var canvas   = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.screenMatchMode     = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight  = 0.5f;
            canvasGO.AddComponent<GraphicRaycaster>();

            // 背景
            var bgGO = MakeImage("Background", canvasGO.transform, ColBg);
            Stretch(bgGO);

            // ── ステップインジケータ（上部中央・4 ドット） ───────────────────
            var stepBarGO = new GameObject("StepBar");
            stepBarGO.transform.SetParent(canvasGO.transform, false);
            stepBarGO.AddComponent<RectTransform>();
            var hlg = stepBarGO.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 18f;
            hlg.childAlignment      = TextAnchor.MiddleCenter;
            hlg.childControlWidth   = hlg.childControlHeight   = false;
            hlg.childForceExpandWidth = hlg.childForceExpandHeight = false;
            var csf = stepBarGO.AddComponent<ContentSizeFitter>();
            csf.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
            var sbRT = stepBarGO.GetComponent<RectTransform>();
            sbRT.anchorMin = new Vector2(0.5f, 1f);
            sbRT.anchorMax = new Vector2(0.5f, 1f);
            sbRT.pivot     = new Vector2(0.5f, 1f);
            sbRT.anchoredPosition = new Vector2(0, -24f);
            sbRT.sizeDelta        = new Vector2(0, 16f);

            var stepDots = new Image[4];
            for (int i = 0; i < 4; i++)
            {
                var dotGO = new GameObject($"Dot{i}");
                dotGO.transform.SetParent(stepBarGO.transform, false);
                var drt = dotGO.AddComponent<RectTransform>();
                drt.sizeDelta = new Vector2(14f, 14f);
                var di = dotGO.AddComponent<Image>();
                di.color = i == 0 ? ColDotOn : ColDotOff;
                var dle = dotGO.AddComponent<LayoutElement>();
                dle.minWidth = dle.minHeight = 14f;
                stepDots[i] = di;
            }

            // ── Step 0: キャラクター選択 ──────────────────────────────────────
            var charPanel = MakeFullPanel("CharSelectPanel", canvasGO.transform, visible: true);
            MakePanelTitle("キャラクターを選んでください", charPanel.transform, yTop: -60f);
            MakePanelSubtitle("5人の冒険者から一人を選ぶ", charPanel.transform, yTop: -116f);
            var charCardRoot = MakeCardContainer("CharCardContainer", charPanel.transform,
                isHorizontal: true, spacing: 20f, centerY: -20f, containerH: 360f);
            var charNextBtn  = MakeNavButton("CharNextBtn", "次へ →", charPanel.transform, right: true);

            // ── Step 1: 祝福選択 ─────────────────────────────────────────────
            var blessPanel = MakeFullPanel("BlessingPanel", canvasGO.transform, visible: false);
            MakePanelTitle("出発の祝福を選んでください", blessPanel.transform, yTop: -60f);
            MakePanelSubtitle("3つの祝福から1つを受け取れ", blessPanel.transform, yTop: -116f);
            var blessCardRoot = MakeCardContainer("BlessCardContainer", blessPanel.transform,
                isHorizontal: true, spacing: 24f, centerY: -20f, containerH: 330f);
            var blessBackBtn  = MakeNavButton("BlessBackBtn", "← 戻る", blessPanel.transform, right: false);
            var blessNextBtn  = MakeNavButton("BlessNextBtn", "次へ →", blessPanel.transform, right: true);

            // ── Step 2: 難易度選択 ────────────────────────────────────────────
            var diffPanel = MakeFullPanel("DifficultyPanel", canvasGO.transform, visible: false);
            MakePanelTitle("試練の深さを選んでください", diffPanel.transform, yTop: -60f);
            MakePanelSubtitle("解放された難易度から選ぶ", diffPanel.transform, yTop: -116f);
            var diffCardRoot = MakeCardContainer("DiffCardContainer", diffPanel.transform,
                isHorizontal: false, spacing: 8f, centerY: -30f, containerH: 440f);
            var diffBackBtn  = MakeNavButton("DiffBackBtn", "← 戻る", diffPanel.transform, right: false);
            var diffNextBtn  = MakeNavButton("DiffNextBtn", "次へ →", diffPanel.transform, right: true);

            // ── Step 3: 確認パネル ────────────────────────────────────────────
            var confirmPanel = MakeFullPanel("ConfirmPanel", canvasGO.transform, visible: false);
            MakePanelTitle("旅の準備完了", confirmPanel.transform, yTop: -60f);

            // 左: キャラ肖像
            var confirmPortrait = MakeImage("ConfirmPortrait", confirmPanel.transform,
                new Color(0.06f, 0.04f, 0.12f));
            PlaceRect(confirmPortrait, new Vector2(-340f, 10f), new Vector2(200f, 280f));

            // 右: キャラ情報
            var confirmCharName = MakeTMP("ConfirmCharName", confirmPanel.transform,
                "—", 32f, ColTitle, TextAlignmentOptions.Left, FontStyles.Bold);
            PlaceRect(confirmCharName.gameObject, new Vector2(120f, 160f), new Vector2(400f, 46f));

            var confirmJobName = MakeTMP("ConfirmJobName", confirmPanel.transform,
                "—", 18f, ColGold, TextAlignmentOptions.Left, FontStyles.Normal);
            PlaceRect(confirmJobName.gameObject, new Vector2(120f, 118f), new Vector2(400f, 28f));

            var sep = MakeImage("Sep", confirmPanel.transform, ColSep);
            PlaceRect(sep, new Vector2(120f, 92f), new Vector2(400f, 1f));

            var confirmDiffText = MakeTMP("ConfirmDiffText", confirmPanel.transform,
                "難易度:  —", 16f, ColBtnText, TextAlignmentOptions.Left, FontStyles.Normal);
            PlaceRect(confirmDiffText.gameObject, new Vector2(120f, 62f), new Vector2(400f, 26f));

            var confirmBlessText = MakeTMP("ConfirmBlessText", confirmPanel.transform,
                "祝福:      —", 16f, ColBtnText, TextAlignmentOptions.Left, FontStyles.Normal);
            PlaceRect(confirmBlessText.gameObject, new Vector2(120f, 28f), new Vector2(400f, 26f));

            var sep2 = MakeImage("Sep2", confirmPanel.transform, ColSep);
            PlaceRect(sep2, new Vector2(120f, 6f), new Vector2(400f, 1f));

            // 「旅を始める」大きなボタン
            var beginBtn = MakeStyledButton("BeginBtn", "旅 を 始 め る", confirmPanel.transform,
                new Vector2(120f, -80f), new Vector2(380f, 64f), fontSize: 22f, gold: true);

            // 「← 戻る」小さなボタン
            var confirmBackBtn = MakeNavButton("ConfirmBackBtn", "← 戻る",
                confirmPanel.transform, right: false);

            // ── RunSetupController ────────────────────────────────────────────
            var ctrlGO = Make("RunSetupController", scene);
            var ui     = ctrlGO.AddComponent<RunSetupUI>();

            WireUI(ui,
                charPanel,    charCardRoot.transform,    charNextBtn,
                blessPanel,   blessCardRoot.transform,   blessBackBtn, blessNextBtn,
                diffPanel,    diffCardRoot.transform,     diffBackBtn,  diffNextBtn,
                confirmPanel, confirmPortrait.GetComponent<Image>(),
                confirmCharName, confirmJobName,
                confirmDiffText, confirmBlessText,
                confirmBackBtn, beginBtn,
                stepDots, sfxSrc);

            // ── ビルド設定へ追加 ──────────────────────────────────────────────
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorSceneManager.CloseScene(scene, true);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            Debug.Log("[RunSetupSceneSetup] RunSetup.unity を生成しました。\n" +
                      "残作業: _characters にキャラクター SO を手動アサイン してください。");
        }

        // ── UI コンポーネント配線 ────────────────────────────────────────────

        static void WireUI(
            RunSetupUI ui,
            CanvasGroup charPanel, Transform charCardRoot, Button charNextBtn,
            CanvasGroup blessPanel, Transform blessCardRoot, Button blessBackBtn, Button blessNextBtn,
            CanvasGroup diffPanel, Transform diffCardRoot, Button diffBackBtn, Button diffNextBtn,
            CanvasGroup confirmPanel, Image confirmPortrait,
            TextMeshProUGUI confirmCharName, TextMeshProUGUI confirmJobName,
            TextMeshProUGUI confirmDiffText, TextMeshProUGUI confirmBlessText,
            Button confirmBackBtn, Button beginBtn,
            Image[] stepDots, AudioSource sfx)
        {
            var so = new SerializedObject(ui);

            // Step 0
            so.FindProperty("_charPanel")     .objectReferenceValue = charPanel;
            so.FindProperty("_charCardRoot")  .objectReferenceValue = charCardRoot;
            so.FindProperty("_charNextBtn")   .objectReferenceValue = charNextBtn;

            // Step 1
            so.FindProperty("_blessPanel")    .objectReferenceValue = blessPanel;
            so.FindProperty("_blessCardRoot") .objectReferenceValue = blessCardRoot;
            so.FindProperty("_blessBackBtn")  .objectReferenceValue = blessBackBtn;
            so.FindProperty("_blessNextBtn")  .objectReferenceValue = blessNextBtn;

            // Step 2
            so.FindProperty("_diffPanel")     .objectReferenceValue = diffPanel;
            so.FindProperty("_diffCardRoot")  .objectReferenceValue = diffCardRoot;
            so.FindProperty("_diffBackBtn")   .objectReferenceValue = diffBackBtn;
            so.FindProperty("_diffNextBtn")   .objectReferenceValue = diffNextBtn;

            // Step 3
            so.FindProperty("_confirmPanel")     .objectReferenceValue = confirmPanel;
            so.FindProperty("_confirmPortrait")  .objectReferenceValue = confirmPortrait;
            so.FindProperty("_confirmCharName")  .objectReferenceValue = confirmCharName;
            so.FindProperty("_confirmJobName")   .objectReferenceValue = confirmJobName;
            so.FindProperty("_confirmDiffText")  .objectReferenceValue = confirmDiffText;
            so.FindProperty("_confirmBlessText") .objectReferenceValue = confirmBlessText;
            so.FindProperty("_confirmBackBtn")   .objectReferenceValue = confirmBackBtn;
            so.FindProperty("_beginBtn")         .objectReferenceValue = beginBtn;

            // Step dots
            var dotsProp = so.FindProperty("_stepDots");
            dotsProp.arraySize = stepDots.Length;
            for (int i = 0; i < stepDots.Length; i++)
                dotsProp.GetArrayElementAtIndex(i).objectReferenceValue = stepDots[i];

            // Audio
            so.FindProperty("_sfx").objectReferenceValue = sfx;

            // Characters — プロジェクト内の CharacterData を自動検索
            var guids  = AssetDatabase.FindAssets("t:CharacterData");
            var chars  = guids
                .Select(g => AssetDatabase.LoadAssetAtPath<CharacterData>(AssetDatabase.GUIDToAssetPath(g)))
                .Where(c => c != null)
                .OrderBy(c => c.name)
                .Take(5)
                .ToArray();
            if (chars.Length > 0)
            {
                var charsProp = so.FindProperty("_characters");
                charsProp.arraySize = chars.Length;
                for (int i = 0; i < chars.Length; i++)
                    charsProp.GetArrayElementAtIndex(i).objectReferenceValue = chars[i];
            }

            so.ApplyModifiedProperties();
        }

        // ── ファクトリ ────────────────────────────────────────────────────────

        static CanvasGroup MakeFullPanel(string name, Transform parent, bool visible)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            Stretch(go);
            var cg = go.AddComponent<CanvasGroup>();
            cg.alpha          = visible ? 1f : 0f;
            cg.blocksRaycasts = visible;
            cg.interactable   = visible;
            return cg;
        }

        static void MakePanelTitle(string text, Transform parent, float yTop)
        {
            var go = MakeTMP(text, text, parent, 38f, ColTitle,
                TextAlignmentOptions.Center, FontStyles.Bold);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.1f, 1f);
            rt.anchorMax = new Vector2(0.9f, 1f);
            rt.pivot     = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0, yTop);
            rt.sizeDelta = new Vector2(0, 52f);
            go.GetComponent<TextMeshProUGUI>().characterSpacing = 4f;
        }

        static void MakePanelSubtitle(string text, Transform parent, float yTop)
        {
            var go = MakeTMP(text, text, parent, 16f, ColSub,
                TextAlignmentOptions.Center, FontStyles.Normal);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.1f, 1f);
            rt.anchorMax = new Vector2(0.9f, 1f);
            rt.pivot     = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0, yTop);
            rt.sizeDelta = new Vector2(0, 28f);
        }

        static GameObject MakeCardContainer(string name, Transform parent,
            bool isHorizontal, float spacing, float centerY, float containerH)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0, 0.5f);
            rt.anchorMax = new Vector2(1, 0.5f);
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(0, centerY);
            rt.sizeDelta        = new Vector2(0, containerH);

            if (isHorizontal)
            {
                var hlg = go.AddComponent<HorizontalLayoutGroup>();
                hlg.spacing                = spacing;
                hlg.childAlignment         = TextAnchor.MiddleCenter;
                hlg.childControlWidth      = hlg.childControlHeight      = false;
                hlg.childForceExpandWidth  = hlg.childForceExpandHeight  = false;
            }
            else
            {
                var vlg = go.AddComponent<VerticalLayoutGroup>();
                vlg.spacing                = spacing;
                vlg.childAlignment         = TextAnchor.UpperCenter;
                vlg.childControlWidth      = vlg.childControlHeight      = false;
                vlg.childForceExpandWidth  = vlg.childForceExpandHeight  = false;
            }
            return go;
        }

        // 右下 or 左下のナビゲーションボタン
        static Button MakeNavButton(string name, string label, Transform parent, bool right)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = right ? new Vector2(1f, 0f) : new Vector2(0f, 0f);
            rt.anchorMax = right ? new Vector2(1f, 0f) : new Vector2(0f, 0f);
            rt.pivot     = right ? new Vector2(1f, 0f) : new Vector2(0f, 0f);
            rt.anchoredPosition = right ? new Vector2(-48f, 48f) : new Vector2(48f, 48f);
            rt.sizeDelta = new Vector2(180f, 52f);

            var img = go.AddComponent<Image>();
            img.color = ColBtnBg;
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            SetButtonColors(btn);

            var txtGO = MakeTMP(label, label, go.transform, 17f, ColBtnText,
                TextAlignmentOptions.Center, FontStyles.Normal);
            var trt = txtGO.GetComponent<RectTransform>();
            trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one;
            trt.offsetMin = trt.offsetMax = Vector2.zero;

            return btn;
        }

        // 大きな確定ボタン（中央配置）
        static Button MakeStyledButton(string name, string label, Transform parent,
            Vector2 pos, Vector2 size, float fontSize, bool gold)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta        = size;

            var img = go.AddComponent<Image>();
            img.color = gold ? new Color(0.14f, 0.09f, 0.06f) : ColBtnBg;
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            SetButtonColors(btn, gold);

            Color txtCol = gold ? ColGold : ColBtnText;
            var txtGO = MakeTMP(label, label, go.transform, fontSize, txtCol,
                TextAlignmentOptions.Center, FontStyles.Bold);
            var trt = txtGO.GetComponent<RectTransform>();
            trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one;
            trt.offsetMin = trt.offsetMax = Vector2.zero;
            txtGO.GetComponent<TextMeshProUGUI>().characterSpacing = 6f;

            return btn;
        }

        static void SetButtonColors(Button btn, bool gold = false)
        {
            var cb = btn.colors;
            cb.normalColor      = Color.white;
            cb.highlightedColor = gold
                ? new Color(1.0f, 0.95f, 0.75f)
                : new Color(0.85f, 0.82f, 0.92f);
            cb.pressedColor     = new Color(0.65f, 0.62f, 0.70f);
            cb.selectedColor    = Color.white;
            cb.fadeDuration     = 0.1f;
            btn.colors = cb;
        }

        static GameObject MakeImage(string name, Transform parent, Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<Image>().color = color;
            return go;
        }

        static GameObject MakeTMP(string goName, string text, Transform parent,
            float size, Color color, TextAlignmentOptions align, FontStyles style)
        {
            var go  = new GameObject(goName);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            var t   = go.AddComponent<TextMeshProUGUI>();
            t.text               = text;
            t.fontSize           = size;
            t.color              = color;
            t.alignment          = align;
            t.fontStyle          = style;
            t.enableWordWrapping = false;
            t.overflowMode       = TextOverflowModes.Ellipsis;
            return go;
        }

        // センター基準で絶対配置
        static void PlaceRect(GameObject go, Vector2 pos, Vector2 size)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta        = size;
        }

        // フルストレッチ（0,0 → 1,1）
        static void Stretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        static GameObject Make(string name, Scene scene)
        {
            var go = new GameObject(name);
            SceneManager.MoveGameObjectToScene(go, scene);
            return go;
        }

        static void EnsureScenesFolder()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");
        }

        static void AddToBuildSettings(string path)
        {
            var scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (scenes.Any(s => s.path == path)) return;
            scenes.Add(new EditorBuildSettingsScene(path, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }
    }
}
#endif
