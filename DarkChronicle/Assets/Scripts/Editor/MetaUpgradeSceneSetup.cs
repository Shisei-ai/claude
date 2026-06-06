#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using TMPro;
using DarkChronicle.Roguelike.Meta;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Menu: DarkChronicle → Create MetaUpgrade Scene
    ///
    /// Assets/Scenes/MetaUpgrade.unity を新規作成し、以下を自動構築します：
    ///   - Canvas（1920×1080 ScaleWithScreenSize）
    ///   - ヘッダー: 碑文カウンター / Back / Reset ボタン
    ///   - PathContainer (水平レイアウト — 5パス列の親)
    ///   - TooltipPanel (CanvasGroup, alpha=0)
    ///   - MetaUpgradeUIController の全 SerializeField を自動配線
    ///
    /// 実行後の手動作業（コンソールログ参照）:
    ///   1. _pathColumnPrefab にカラムPrefabを割り当て
    ///   2. _nodeButtonPrefab にノードボタンPrefabを割り当て
    ///   3. TextMeshPro フォントを割り当て（しっぽり明朝 SDF 等）
    /// </summary>
    public static class MetaUpgradeSceneSetup
    {
        const string ScenePath = "Assets/Scenes/MetaUpgrade.unity";

        // ── カラーパレット ───────────────────────────────────────────────────
        static readonly Color ColBg      = new(0.036f, 0.024f, 0.067f);
        static readonly Color ColGold    = new(0.780f, 0.600f, 0.200f);
        static readonly Color ColText    = new(0.867f, 0.816f, 0.706f);
        static readonly Color ColBtnBg   = new(0.083f, 0.050f, 0.167f);
        static readonly Color ColPanel   = new(0.040f, 0.020f, 0.100f, 0.950f);
        static readonly Color ColTooltip = new(0.060f, 0.030f, 0.120f, 0.970f);

        // ── エントリポイント ──────────────────────────────────────────────────
        [MenuItem("DarkChronicle/Create MetaUpgrade Scene", priority = 105)]
        public static void CreateScene()
        {
            if (File.Exists(ScenePath))
            {
                bool overwrite = EditorUtility.DisplayDialog(
                    "MetaUpgrade Scene Already Exists",
                    $"'{ScenePath}' already exists.\nOverwrite?",
                    "Overwrite", "Cancel");
                if (!overwrite) return;
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // ── Camera ──────────────────────────────────────────────────────
            var camGO = new GameObject("Main Camera");
            camGO.tag = "MainCamera";
            var cam = camGO.AddComponent<Camera>();
            cam.clearFlags      = CameraClearFlags.SolidColor;
            cam.backgroundColor = ColBg;
            cam.orthographic    = true;
            cam.depth           = -1;
            camGO.AddComponent<AudioListener>();

            // ── EventSystem ─────────────────────────────────────────────────
            var esGO = new GameObject("EventSystem");
            esGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            esGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();

            // ── BGM AudioSource ──────────────────────────────────────────────
            var bgmGO = new GameObject("BGMAudioSource");
            var bgm   = bgmGO.AddComponent<AudioSource>();
            bgm.loop        = true;
            bgm.playOnAwake = false;
            bgm.volume      = 0.75f;

            // ── Canvas ───────────────────────────────────────────────────────
            var canvasGO = new GameObject("MetaUpgradeCanvas");
            var canvas   = canvasGO.AddComponent<Canvas>();
            canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 0;
            var scaler = canvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode     = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight  = 0.5f;
            canvasGO.AddComponent<GraphicRaycaster>();

            // 背景
            var bgGO = MakeImage("Background", canvasGO.transform, ColBg);
            Stretch(bgGO);

            // ── ヘッダーバー ─────────────────────────────────────────────────
            var headerGO = new GameObject("Header");
            headerGO.transform.SetParent(canvasGO.transform, false);
            var headerRT = headerGO.AddComponent<RectTransform>();
            headerRT.anchorMin        = new Vector2(0f, 1f);
            headerRT.anchorMax        = new Vector2(1f, 1f);
            headerRT.pivot            = new Vector2(0.5f, 1f);
            headerRT.anchoredPosition = Vector2.zero;
            headerRT.sizeDelta        = new Vector2(0f, 72f);

            var headerBgGO = MakeImage("HeaderBg", headerGO.transform, ColPanel);
            Stretch(headerBgGO);

            // 碑文カウンター（左寄せ）
            var epitaphGO  = MakeTMP("EpitaphText", headerGO.transform,
                "碑文（ヒトブン）: 0", 24f, ColGold, TextAlignmentOptions.MidlineLeft, FontStyles.Bold);
            var eRT = epitaphGO.GetComponent<RectTransform>();
            eRT.anchorMin         = new Vector2(0f, 0f);
            eRT.anchorMax         = new Vector2(0.5f, 1f);
            eRT.offsetMin         = new Vector2(40f, 0f);
            eRT.offsetMax         = Vector2.zero;

            // 戻るボタン（右寄せ）
            var backBtnGO  = MakeButton("BackButton",  "← メインメニュー", headerGO.transform, 220f, 48f,
                anchorPivot: new Vector2(1f, 0.5f), pos: new Vector2(-260f, 0f));

            // デバッグリセットボタン
            var resetBtnGO = MakeButton("ResetButton", "[DEBUG] リセット",  headerGO.transform, 180f, 40f,
                anchorPivot: new Vector2(1f, 0.5f), pos: new Vector2(-56f,  0f));
            resetBtnGO.GetComponentInChildren<TextMeshProUGUI>().fontSize = 15f;

            // ── PathContainer (水平レイアウト) ──────────────────────────────
            var pathContainerGO = new GameObject("PathContainer");
            pathContainerGO.transform.SetParent(canvasGO.transform, false);
            var pcRT = pathContainerGO.AddComponent<RectTransform>();
            pcRT.anchorMin        = Vector2.zero;
            pcRT.anchorMax        = Vector2.one;
            pcRT.offsetMin        = new Vector2(40f,  20f);
            pcRT.offsetMax        = new Vector2(-40f, -80f); // ヘッダー分を除く
            var hlg = pathContainerGO.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing                = 16f;
            hlg.childAlignment         = TextAnchor.UpperCenter;
            hlg.childControlWidth      = true;
            hlg.childControlHeight     = false;
            hlg.childForceExpandWidth  = true;
            hlg.childForceExpandHeight = false;

            // ── Tooltip パネル（右下固定, alpha=0） ─────────────────────────
            var tooltipGO = MakeImage("TooltipPanel", canvasGO.transform, ColTooltip);
            var tRT = tooltipGO.GetComponent<RectTransform>();
            tRT.anchorMin        = new Vector2(1f, 0f);
            tRT.anchorMax        = new Vector2(1f, 0f);
            tRT.pivot            = new Vector2(1f, 0f);
            tRT.anchoredPosition = new Vector2(-24f, 24f);
            tRT.sizeDelta        = new Vector2(340f, 230f);
            var tooltipCG = tooltipGO.AddComponent<CanvasGroup>();
            tooltipCG.alpha          = 0f;
            tooltipCG.blocksRaycasts = false;

            var tNameGO   = MakeTMP("TooltipName",   tooltipGO.transform,
                "—", 20f, new Color(0.930f, 0.880f, 0.780f), TextAlignmentOptions.TopLeft, FontStyles.Bold);
            var tDescGO   = MakeTMP("TooltipDesc",   tooltipGO.transform,
                "—", 14f, ColText,                           TextAlignmentOptions.TopLeft, FontStyles.Normal);
            var tCostGO   = MakeTMP("TooltipCost",   tooltipGO.transform,
                "コスト: —", 16f, ColGold,                   TextAlignmentOptions.TopLeft, FontStyles.Normal);
            var tStatusGO = MakeTMP("TooltipStatus", tooltipGO.transform,
                "—", 16f, new Color(0.930f, 0.880f, 0.780f), TextAlignmentOptions.TopLeft, FontStyles.Normal);

            PlaceInPanel(tNameGO,    14f,  -14f, 312f, 28f);
            PlaceInPanel(tDescGO,    14f,  -50f, 312f, 80f);
            PlaceInPanel(tCostGO,    14f, -138f, 312f, 26f);
            PlaceInPanel(tStatusGO,  14f, -172f, 312f, 26f);
            tDescGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;
            tDescGO.GetComponent<TextMeshProUGUI>().overflowMode       = TextOverflowModes.Truncate;

            // ── MetaUpgradeController ────────────────────────────────────────
            var ctrlGO = new GameObject("MetaUpgradeController");
            var ui     = ctrlGO.AddComponent<MetaUpgradeUIController>();
            WireController(ui,
                epitaphText:   epitaphGO.GetComponent<TextMeshProUGUI>(),
                backButton:    backBtnGO.GetComponent<Button>(),
                resetButton:   resetBtnGO.GetComponent<Button>(),
                pathContainer: pathContainerGO.transform,
                tooltip:       tooltipCG,
                tooltipName:   tNameGO.GetComponent<TextMeshProUGUI>(),
                tooltipDesc:   tDescGO.GetComponent<TextMeshProUGUI>(),
                tooltipCost:   tCostGO.GetComponent<TextMeshProUGUI>(),
                tooltipStatus: tStatusGO.GetComponent<TextMeshProUGUI>());

            // ── シーン保存 ───────────────────────────────────────────────────
            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            Debug.Log(
                "[MetaUpgrade] シーン生成完了: " + ScenePath + "\n\n" +
                "=== 残りの手動作業 ===\n" +
                "  1. MetaUpgradeController → _pathColumnPrefab  にカラムPrefabを割り当て\n" +
                "  2. MetaUpgradeController → _nodeButtonPrefab  にノードボタンPrefabを割り当て\n" +
                "  3. BGMAudioSource の AudioClip を割り当て\n" +
                "  4. 各 TextMeshPro の Font を割り当て（しっぽり明朝 SDF 等）");
        }

        // ── 配線 ────────────────────────────────────────────────────────────
        static void WireController(
            MetaUpgradeUIController ui,
            TextMeshProUGUI epitaphText,
            Button backButton, Button resetButton,
            Transform pathContainer,
            CanvasGroup tooltip,
            TextMeshProUGUI tooltipName, TextMeshProUGUI tooltipDesc,
            TextMeshProUGUI tooltipCost, TextMeshProUGUI tooltipStatus)
        {
            var so = new SerializedObject(ui);
            so.FindProperty("_epitaphText")   .objectReferenceValue = epitaphText;
            so.FindProperty("_backButton")    .objectReferenceValue = backButton;
            so.FindProperty("_resetButton")   .objectReferenceValue = resetButton;
            so.FindProperty("_pathContainer") .objectReferenceValue = pathContainer;
            so.FindProperty("_tooltip")       .objectReferenceValue = tooltip;
            so.FindProperty("_tooltipName")   .objectReferenceValue = tooltipName;
            so.FindProperty("_tooltipDesc")   .objectReferenceValue = tooltipDesc;
            so.FindProperty("_tooltipCost")   .objectReferenceValue = tooltipCost;
            so.FindProperty("_tooltipStatus") .objectReferenceValue = tooltipStatus;
            so.ApplyModifiedProperties();
        }

        // ── ファクトリ ───────────────────────────────────────────────────────
        // ボタン（anchor=pivot で単一点配置）
        static GameObject MakeButton(string name, string label, Transform parent,
            float w, float h, Vector2 anchorPivot, Vector2 pos)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin        = anchorPivot;
            rt.anchorMax        = anchorPivot;
            rt.pivot            = anchorPivot;
            rt.anchoredPosition = pos;
            rt.sizeDelta        = new Vector2(w, h);
            var img = go.AddComponent<Image>();
            img.color = ColBtnBg;
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;

            var txtGO = MakeTMP("Label", go.transform, label, 18f, ColText,
                TextAlignmentOptions.Center, FontStyles.Normal);
            var trt = txtGO.GetComponent<RectTransform>();
            trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one;
            trt.offsetMin = new Vector2(8f, 0f); trt.offsetMax = new Vector2(-8f, 0f);
            return go;
        }

        // Image GO
        static GameObject MakeImage(string name, Transform parent, Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<Image>().color = color;
            return go;
        }

        // TextMeshPro GO
        static GameObject MakeTMP(string name, Transform parent, string text,
            float size, Color color, TextAlignmentOptions align, FontStyles style)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            var tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.text               = text;
            tmp.fontSize           = size;
            tmp.color              = color;
            tmp.alignment          = align;
            tmp.fontStyle          = style;
            tmp.enableWordWrapping = false;
            tmp.overflowMode       = TextOverflowModes.Ellipsis;
            return go;
        }

        // パネル内の固定位置（左上基点）
        static void PlaceInPanel(GameObject go, float x, float y, float w, float h)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin        = new Vector2(0f, 1f);
            rt.anchorMax        = new Vector2(0f, 1f);
            rt.pivot            = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(x, y);
            rt.sizeDelta        = new Vector2(w, h);
        }

        // フルストレッチ
        static void Stretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        static void AddToBuildSettings(string path)
        {
            var list = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (list.Exists(s => s.path == path)) return;
            list.Add(new EditorBuildSettingsScene(path, true));
            EditorBuildSettings.scenes = list.ToArray();
            Debug.Log("[MetaUpgrade] Build Settings に追加: " + path);
        }
    }
}
#endif
