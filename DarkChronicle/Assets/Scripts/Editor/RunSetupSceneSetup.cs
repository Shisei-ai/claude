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
    /// Menu: DarkChronicle → Create RunSetup Scene
    ///
    /// ニューゲーム開始前の4ステップ準備シーンを自動構築する。
    ///   Step Ⅰ — 冒険者選択（キャラクターカード）
    ///   Step Ⅱ — 加護選択（出発の祝福 3択）
    ///   Step Ⅲ — 深淵選択（難易度）
    ///   Step Ⅳ — 出立（確認・旅の始まり）
    ///
    /// プロジェクト内の TMP_FontAsset を自動検索し、日本語対応フォントがあれば全テキストへ適用。
    ///
    /// 実行後の手動作業（コンソールレポート参照）:
    ///   1. RunSetupController → _characters に CharacterData SO をアサイン
    ///   2. SFXSource の _selectClip / _pageClip / _confirmClip に SE をアサイン
    ///   3. 日本語フォントが検出されなかった場合は手動で TMP フォントを割り当て
    /// </summary>
    public static class RunSetupSceneSetup
    {
        const string ScenePath = "Assets/Scenes/RunSetup.unity";

        // ── カラーパレット ──────────────────────────────────────────────────────
        static readonly Color ColBg         = new(0.016f, 0.010f, 0.055f, 1.000f);
        static readonly Color ColVignette   = new(0.006f, 0.003f, 0.024f, 0.780f);
        static readonly Color ColTitle      = new(0.929f, 0.898f, 0.820f, 1.000f);
        static readonly Color ColFlavor     = new(0.560f, 0.490f, 0.370f, 1.000f);
        static readonly Color ColGold       = new(0.784f, 0.647f, 0.357f, 1.000f);
        static readonly Color ColGoldDim    = new(0.380f, 0.285f, 0.130f, 1.000f);
        static readonly Color ColBtnText    = new(0.867f, 0.831f, 0.745f, 1.000f);
        static readonly Color ColBtnBg      = new(0.050f, 0.025f, 0.110f, 0.720f);
        static readonly Color ColAccent     = new(0.784f, 0.647f, 0.357f, 1.000f);
        static readonly Color ColSep        = new(0.784f, 0.647f, 0.357f, 0.380f);
        static readonly Color ColDotOff     = new(0.200f, 0.160f, 0.280f, 1.000f);
        static readonly Color ColDim        = new(0.320f, 0.270f, 0.380f, 1.000f);
        static readonly Color ColCardBg     = new(0.055f, 0.030f, 0.130f, 0.920f);
        static readonly Color ColPanelBg    = new(0.022f, 0.011f, 0.065f, 0.980f);

        // ── ステップごとのフレーバーテキスト ───────────────────────────────────
        // 作品の雰囲気（暗黒ファンタジー×皮肉なユーモア）を反映
        static readonly string[] StepFlavors =
        {
            "死地へ赴く者よ、まずは名を名乗れ。",
            "神々の気まぐれか、それとも宿命の導きか。",
            "深淵に落ちる速さを、自ら選ぶがいい。",
            "一度踏み出せば、もう後戻りはできない。",
        };

        // ステップ表示ラベル（ローマ数字サークル直下）
        static readonly string[] StepLabels = { "冒険者", "加護", "深淵", "出立" };

        // ローマ数字
        static readonly string[] StepRomans = { "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ" };

        // ── 日本語フォントキャッシュ ────────────────────────────────────────────
        static TMP_FontAsset s_JaFont;

        static TMP_FontAsset FindJaFont()
        {
            if (s_JaFont != null) return s_JaFont;
            var guids = AssetDatabase.FindAssets("t:TMP_FontAsset");
            if (guids.Length == 0) return null;

            string[] priority = {
                "Shippori", "しっぽり",
                "NotoSerifJP", "NotoSansJP", "Noto",
                "ZenOldMincho", "ZenMaruGothic", "ZenKakuGothic",
                "YuMincho", "游明朝", "YuGothic", "游ゴシック",
                "GenYoMincho", "源ノ明朝",
                "IPAexMincho", "IPAexGothic",
                "MPlus", "RoundedMplus",
            };

            TMP_FontAsset fallback = null;
            foreach (var guid in guids)
            {
                var path  = AssetDatabase.GUIDToAssetPath(guid);
                var asset = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(path);
                if (asset == null) continue;
                fallback ??= asset;
                foreach (var kw in priority)
                    if (path.Contains(kw) || asset.name.Contains(kw))
                    {
                        s_JaFont = asset;
                        return s_JaFont;
                    }
            }
            s_JaFont = fallback;
            return s_JaFont;
        }

        // ── エントリポイント ────────────────────────────────────────────────────
        [MenuItem("DarkChronicle/Create RunSetup Scene", priority = 103)]
        public static void CreateScene()
        {
            EnsureScenesFolder();
            s_JaFont = null;
            var jaFont = FindJaFont();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);

            // ── インフラ ──────────────────────────────────────────────────────
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

            // ── Canvas ────────────────────────────────────────────────────────
            var canvasGO = Make("Canvas", scene);
            var canvas   = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode     = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight  = 0.5f;
            canvasGO.AddComponent<GraphicRaycaster>();

            // ── 背景レイヤー ──────────────────────────────────────────────────
            var bgBase = MakeImage("BG_Base", canvasGO.transform, ColBg);
            Stretch(bgBase);

            // 下部ヴィネット
            var bgBot = MakeImage("BG_BottomVignette", canvasGO.transform, ColVignette);
            SetAnchors(bgBot, Vector2.zero, new Vector2(1f, 0.28f));

            // 上部ヴィネット
            var bgTop = MakeImage("BG_TopVignette", canvasGO.transform, ColVignette);
            SetAnchors(bgTop, new Vector2(0f, 0.72f), Vector2.one);

            // 上下装飾ライン（金）
            MakeHLine("Decor_TopLine",    canvasGO.transform, ColGold,  -118f, fromTop: true,  xPad: 80f,  h: 1.5f);
            MakeHLine("Decor_BottomLine", canvasGO.transform, ColSep,    60f,  fromTop: false, xPad: 120f, h: 1f);

            // ── ステップインジケータ（上部中央・ローマ数字サークル） ────────────
            var stepRoot = new GameObject("StepIndicator");
            stepRoot.transform.SetParent(canvasGO.transform, false);
            var srRT = stepRoot.AddComponent<RectTransform>();
            srRT.anchorMin        = new Vector2(0.5f, 1f);
            srRT.anchorMax        = new Vector2(0.5f, 1f);
            srRT.pivot            = new Vector2(0.5f, 1f);
            srRT.anchoredPosition = new Vector2(0f, -22f);
            srRT.sizeDelta        = new Vector2(460f, 80f);

            float[] stepXs = { -165f, -55f, 55f, 165f };
            var stepDots  = new Image[4];

            // サークル間をつなぐコネクターライン
            for (int i = 0; i < 3; i++)
            {
                var lineGO = MakeImage($"StepConnector{i}", stepRoot.transform, ColDotOff);
                var lRT    = lineGO.GetComponent<RectTransform>();
                lRT.anchorMin        = lRT.anchorMax = new Vector2(0.5f, 0.5f);
                lRT.pivot            = new Vector2(0.5f, 0.5f);
                lRT.anchoredPosition = new Vector2((stepXs[i] + stepXs[i + 1]) * 0.5f, 0f);
                lRT.sizeDelta        = new Vector2(stepXs[i + 1] - stepXs[i] - 50f, 1.5f);
            }

            // ローマ数字サークル + テキスト
            for (int i = 0; i < 4; i++)
            {
                bool active = i == 0;

                var circGO = MakeImage($"StepCircle{i}", stepRoot.transform,
                    active ? ColGold : ColDotOff);
                var cRT = circGO.GetComponent<RectTransform>();
                cRT.anchorMin        = cRT.anchorMax = new Vector2(0.5f, 0.5f);
                cRT.pivot            = new Vector2(0.5f, 0.5f);
                cRT.anchoredPosition = new Vector2(stepXs[i], 0f);
                cRT.sizeDelta        = new Vector2(44f, 44f);
                stepDots[i]          = circGO.GetComponent<Image>();

                // ローマ数字（クリーム色 — 金・暗紫どちらの背景でも視認可）
                var num = MakeTMP($"StepNum{i}", StepRomans[i], circGO.transform,
                    15f, new Color(0.87f, 0.83f, 0.72f, 0.90f),
                    TextAlignmentOptions.Center, FontStyles.Bold, jaFont);
                StretchFull(num.gameObject);

                // サークル直下のラベル（静的装飾）
                var lbl = MakeTMP($"StepLbl{i}", StepLabels[i], stepRoot.transform,
                    11f, active ? ColGold : ColDim,
                    TextAlignmentOptions.Center, FontStyles.Normal, jaFont);
                var lblRT = lbl.GetComponent<RectTransform>();
                lblRT.anchorMin        = lblRT.anchorMax = new Vector2(0.5f, 0.5f);
                lblRT.pivot            = new Vector2(0.5f, 1f);
                lblRT.anchoredPosition = new Vector2(stepXs[i], -28f);
                lblRT.sizeDelta        = new Vector2(82f, 18f);
            }

            // ── Step Ⅰ: キャラクター選択 ─────────────────────────────────────
            var charPanel   = MakeFullPanel("CharSelectPanel", canvasGO.transform, visible: true);
            BuildStepHeader(charPanel.transform, "キャラクターを選んでください", StepFlavors[0], jaFont);
            var charCardRoot = MakeCardContainer("CharCardContainer", charPanel.transform,
                isHorizontal: true, spacing: 20f, centerY: -20f, containerH: 370f);
            var charNextBtn  = MakeNavButton("CharNextBtn", "次へ  →", charPanel.transform, right: true, jaFont);

            // ── Step Ⅱ: 加護選択 ─────────────────────────────────────────────
            var blessPanel   = MakeFullPanel("BlessingPanel", canvasGO.transform, visible: false);
            BuildStepHeader(blessPanel.transform, "出発の加護を選んでください", StepFlavors[1], jaFont);
            var blessCardRoot = MakeCardContainer("BlessCardContainer", blessPanel.transform,
                isHorizontal: true, spacing: 28f, centerY: -20f, containerH: 330f);
            var blessBackBtn  = MakeNavButton("BlessBackBtn", "←  戻る", blessPanel.transform, right: false, jaFont);
            var blessNextBtn  = MakeNavButton("BlessNextBtn", "次へ  →", blessPanel.transform, right: true,  jaFont);

            // ── Step Ⅲ: 難易度選択 ───────────────────────────────────────────
            var diffPanel    = MakeFullPanel("DifficultyPanel", canvasGO.transform, visible: false);
            BuildStepHeader(diffPanel.transform, "試練の深さを選んでください", StepFlavors[2], jaFont);
            var diffCardRoot = MakeCardContainer("DiffCardContainer", diffPanel.transform,
                isHorizontal: false, spacing: 10f, centerY: -30f, containerH: 440f);
            var diffBackBtn  = MakeNavButton("DiffBackBtn", "←  戻る", diffPanel.transform, right: false, jaFont);
            var diffNextBtn  = MakeNavButton("DiffNextBtn", "次へ  →", diffPanel.transform, right: true,  jaFont);

            // ── Step Ⅳ: 旅立ちの刻（確認パネル） ────────────────────────────
            var confirmPanel = MakeFullPanel("ConfirmPanel", canvasGO.transform, visible: false);
            BuildStepHeader(confirmPanel.transform, "旅立ちの刻", StepFlavors[3], jaFont);

            // 肖像枠（金ボーダー + 内側画像）
            var portraitBorder = MakeImage("PortraitBorder", confirmPanel.transform, ColGold);
            PlaceCenter(portraitBorder, new Vector2(-364f, -10f), new Vector2(214f, 294f));
            var confirmPortraitGO = MakeImage("ConfirmPortrait", confirmPanel.transform,
                new Color(0.06f, 0.04f, 0.12f));
            PlaceCenter(confirmPortraitGO, new Vector2(-364f, -10f), new Vector2(208f, 288f));

            // 右カラム — 情報テキスト群
            const float InfoX = 106f;
            var confirmCharName = MakeTMP("ConfirmCharName", "—", confirmPanel.transform,
                36f, ColTitle, TextAlignmentOptions.Left, FontStyles.Bold, jaFont);
            PlaceCenter(confirmCharName.gameObject, new Vector2(InfoX, 126f), new Vector2(440f, 50f));
            confirmCharName.characterSpacing = 4f;

            var confirmJobName = MakeTMP("ConfirmJobName", "—", confirmPanel.transform,
                18f, ColGold, TextAlignmentOptions.Left, FontStyles.Normal, jaFont);
            PlaceCenter(confirmJobName.gameObject, new Vector2(InfoX, 80f), new Vector2(440f, 28f));

            // 名前下の区切り線
            var sep1 = MakeImage("Sep1", confirmPanel.transform, ColSep);
            PlaceCenter(sep1, new Vector2(InfoX + 90f, 55f), new Vector2(260f, 1f));

            var confirmDiffText = MakeTMP("ConfirmDiffText", "難易度:  —", confirmPanel.transform,
                16f, ColBtnText, TextAlignmentOptions.Left, FontStyles.Normal, jaFont);
            PlaceCenter(confirmDiffText.gameObject, new Vector2(InfoX, 24f), new Vector2(440f, 26f));

            var confirmBlessText = MakeTMP("ConfirmBlessText", "加護:      —", confirmPanel.transform,
                16f, ColBtnText, TextAlignmentOptions.Left, FontStyles.Normal, jaFont);
            PlaceCenter(confirmBlessText.gameObject, new Vector2(InfoX, -8f), new Vector2(440f, 26f));

            var sep2 = MakeImage("Sep2", confirmPanel.transform, ColSep);
            PlaceCenter(sep2, new Vector2(InfoX + 90f, -32f), new Vector2(260f, 1f));

            // 「旅を始める」大ボタン（金ボーダー、荘厳な演出）
            var beginBtn = MakeBeginButton("BeginBtn", "旅 を 始 め る", confirmPanel.transform, jaFont);

            var confirmBackBtn = MakeNavButton("ConfirmBackBtn", "←  戻る",
                confirmPanel.transform, right: false, jaFont);

            // ── コントローラ配線 ────────────────────────────────────────────
            var ctrlGO = Make("RunSetupController", scene);
            var ui     = ctrlGO.AddComponent<RunSetupUI>();

            WireUI(ui,
                charPanel,   charCardRoot.transform,  charNextBtn,
                blessPanel,  blessCardRoot.transform, blessBackBtn, blessNextBtn,
                diffPanel,   diffCardRoot.transform,  diffBackBtn,  diffNextBtn,
                confirmPanel, confirmPortraitGO.GetComponent<Image>(),
                confirmCharName, confirmJobName,
                confirmDiffText, confirmBlessText,
                confirmBackBtn, beginBtn,
                stepDots, sfxSrc);

            // ── シーン保存 ──────────────────────────────────────────────────
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorSceneManager.CloseScene(scene, true);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            string fontReport = jaFont != null
                ? $"✓ 日本語フォント適用済み: {jaFont.name}"
                : "⚠ 日本語フォントが見つかりません。手動で TMP フォントを割り当ててください。\n" +
                  "  推奨: しっぽり明朝 SDF / Noto Serif JP / ZenOldMincho";

            Debug.Log(
                "[RunSetupSceneSetup] RunSetup.unity 生成完了: " + ScenePath + "\n\n" +
                $"フォント: {fontReport}\n\n" +
                "=== 残りの手動作業 ===\n" +
                "  1. RunSetupController → _characters に CharacterData SO をアサイン\n" +
                "  2. SFXSource → _selectClip / _pageClip / _confirmClip に SE をアサイン\n" +
                "  3. BGM が必要な場合は BGMAudioSource を追加し AudioClip を割り当て");
        }

        // ── ステップヘッダー（タイトル + 金ライン + フレーバー文） ───────────────
        static void BuildStepHeader(Transform parent, string title, string flavor, TMP_FontAsset font)
        {
            var t = MakeTMP("PanelTitle", title, parent,
                38f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold, font);
            var tRT = t.GetComponent<RectTransform>();
            tRT.anchorMin        = new Vector2(0.1f, 1f);
            tRT.anchorMax        = new Vector2(0.9f, 1f);
            tRT.pivot            = new Vector2(0.5f, 1f);
            tRT.anchoredPosition = new Vector2(0f, -140f);
            tRT.sizeDelta        = new Vector2(0f, 52f);
            t.characterSpacing   = 5f;

            var rule = MakeImage("TitleRule", parent, ColSep);
            var rRT  = rule.GetComponent<RectTransform>();
            rRT.anchorMin        = new Vector2(0.2f, 1f);
            rRT.anchorMax        = new Vector2(0.8f, 1f);
            rRT.pivot            = new Vector2(0.5f, 1f);
            rRT.anchoredPosition = new Vector2(0f, -197f);
            rRT.sizeDelta        = new Vector2(0f, 1f);

            var f = MakeTMP("PanelFlavor", flavor, parent,
                14f, ColFlavor, TextAlignmentOptions.Center, FontStyles.Italic, font);
            var fRT = f.GetComponent<RectTransform>();
            fRT.anchorMin        = new Vector2(0.15f, 1f);
            fRT.anchorMax        = new Vector2(0.85f, 1f);
            fRT.pivot            = new Vector2(0.5f, 1f);
            fRT.anchoredPosition = new Vector2(0f, -206f);
            fRT.sizeDelta        = new Vector2(0f, 24f);
        }

        // ── 「旅を始める」大ボタン（4辺金ボーダー + 金テキスト） ────────────────
        static Button MakeBeginButton(string name, string label, Transform parent, TMP_FontAsset font)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin        = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot            = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(106f, -118f);
            rt.sizeDelta        = new Vector2(390f, 74f);

            var img = go.AddComponent<Image>();
            img.color = new Color(0.10f, 0.06f, 0.04f, 0.92f);
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            var cb = btn.colors;
            cb.normalColor      = Color.white;
            cb.highlightedColor = new Color(1.12f, 1.02f, 0.76f, 1f);
            cb.pressedColor     = new Color(0.70f, 0.62f, 0.45f, 1f);
            cb.fadeDuration     = 0.12f;
            btn.colors = cb;

            // 4辺ボーダー（金）
            MakeBorderEdge(go.transform, "BorderTop",   new Vector2(0f,1f), new Vector2(1f,1f), new Vector2(0f,-2f),  Vector2.zero);
            MakeBorderEdge(go.transform, "BorderBot",   new Vector2(0f,0f), new Vector2(1f,0f), Vector2.zero,          new Vector2(0f, 2f));
            MakeBorderEdge(go.transform, "BorderLeft",  new Vector2(0f,0f), new Vector2(0f,1f), Vector2.zero,          new Vector2(2f, 0f));
            MakeBorderEdge(go.transform, "BorderRight", new Vector2(1f,0f), new Vector2(1f,1f), new Vector2(-2f, 0f), Vector2.zero);

            var lbl = MakeTMP("Label", label, go.transform,
                23f, ColGold, TextAlignmentOptions.Center, FontStyles.Bold, font);
            StretchFull(lbl.gameObject);
            lbl.characterSpacing = 8f;

            return btn;
        }

        // ── ナビゲーションボタン（左下 / 右下） ────────────────────────────────
        static Button MakeNavButton(string name, string label, Transform parent, bool right, TMP_FontAsset font)
        {
            var anchor = right ? new Vector2(1f, 0f) : new Vector2(0f, 0f);
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin        = anchor;
            rt.anchorMax        = anchor;
            rt.pivot            = anchor;
            rt.anchoredPosition = right ? new Vector2(-48f, 48f) : new Vector2(48f, 48f);
            rt.sizeDelta        = new Vector2(190f, 54f);

            var img = go.AddComponent<Image>();
            img.color = ColBtnBg;
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            var cb = btn.colors;
            cb.normalColor      = Color.white;
            cb.highlightedColor = new Color(1.05f, 0.96f, 0.76f, 1f);
            cb.pressedColor     = new Color(0.65f, 0.58f, 0.43f, 1f);
            cb.fadeDuration     = 0.10f;
            btn.colors = cb;

            // アクセントバー（右ボタン → 右端、左ボタン → 左端）
            var bar = MakeImage("AccentBar", go.transform, ColAccent);
            var bRT = bar.GetComponent<RectTransform>();
            if (right)
            {
                bRT.anchorMin = new Vector2(1f, 0f); bRT.anchorMax = Vector2.one;
                bRT.offsetMin = new Vector2(-3f, 0f); bRT.offsetMax = Vector2.zero;
            }
            else
            {
                bRT.anchorMin = Vector2.zero; bRT.anchorMax = new Vector2(0f, 1f);
                bRT.offsetMin = Vector2.zero; bRT.offsetMax = new Vector2(3f, 0f);
            }

            var lbl = MakeTMP("Label", label, go.transform,
                17f, ColBtnText, TextAlignmentOptions.Center, FontStyles.Normal, font);
            StretchFull(lbl.gameObject);

            return btn;
        }

        // ── ファクトリ ─────────────────────────────────────────────────────────

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

        static GameObject MakeCardContainer(string name, Transform parent,
            bool isHorizontal, float spacing, float centerY, float containerH)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin        = new Vector2(0f, 0.5f);
            rt.anchorMax        = new Vector2(1f, 0.5f);
            rt.pivot            = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(0f, centerY);
            rt.sizeDelta        = new Vector2(0f, containerH);

            if (isHorizontal)
            {
                var hlg = go.AddComponent<HorizontalLayoutGroup>();
                hlg.spacing               = spacing;
                hlg.childAlignment        = TextAnchor.MiddleCenter;
                hlg.childControlWidth     = hlg.childControlHeight     = false;
                hlg.childForceExpandWidth = hlg.childForceExpandHeight = false;
            }
            else
            {
                var vlg = go.AddComponent<VerticalLayoutGroup>();
                vlg.spacing               = spacing;
                vlg.childAlignment        = TextAnchor.UpperCenter;
                vlg.childControlWidth     = vlg.childControlHeight     = false;
                vlg.childForceExpandWidth = vlg.childForceExpandHeight = false;
            }
            return go;
        }

        static GameObject MakeImage(string name, Transform parent, Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<Image>().color = color;
            return go;
        }

        // 返り値を TextMeshProUGUI に変更（配線時に .GetComponent 不要）
        static TextMeshProUGUI MakeTMP(string name, string text, Transform parent,
            float size, Color color, TextAlignmentOptions align, FontStyles style,
            TMP_FontAsset font = null)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            var t = go.AddComponent<TextMeshProUGUI>();
            t.text               = text;
            t.fontSize           = size;
            t.color              = color;
            t.alignment          = align;
            t.fontStyle          = style;
            t.enableWordWrapping = false;
            t.overflowMode       = TextOverflowModes.Ellipsis;
            if (font != null) t.font = font;
            return t;
        }

        // 1px ボーダーエッジ
        static void MakeBorderEdge(Transform parent, string name,
            Vector2 ancMin, Vector2 ancMax, Vector2 offMin, Vector2 offMax)
        {
            var go  = MakeImage(name, parent, ColAccent);
            var rt  = go.GetComponent<RectTransform>();
            rt.anchorMin = ancMin; rt.anchorMax = ancMax;
            rt.offsetMin = offMin; rt.offsetMax = offMax;
        }

        // ── レイアウトヘルパー ─────────────────────────────────────────────────

        // 中央基準の絶対配置
        static void PlaceCenter(GameObject go, Vector2 pos, Vector2 size)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin        = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot            = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta        = size;
        }

        // anchorMin/Max を直接指定（ヴィネット等）
        static void SetAnchors(GameObject go, Vector2 min, Vector2 max)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = min; rt.anchorMax = max;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        // 親に完全ストレッチ
        static void Stretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        static void StretchFull(GameObject go) => Stretch(go);

        // 上端または下端固定の水平ライン
        static void MakeHLine(string name, Transform parent, Color color,
            float yOffset, bool fromTop, float xPad, float h)
        {
            var go = MakeImage(name, parent, color);
            var rt = go.GetComponent<RectTransform>();
            float ay = fromTop ? 1f : 0f;
            rt.anchorMin        = new Vector2(0f, ay);
            rt.anchorMax        = new Vector2(1f, ay);
            rt.pivot            = new Vector2(0.5f, ay);
            rt.anchoredPosition = new Vector2(0f, fromTop ? -yOffset : yOffset);
            rt.sizeDelta        = new Vector2(-xPad * 2f, h);
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

        // ── UI 配線 ────────────────────────────────────────────────────────────
        static void WireUI(
            RunSetupUI ui,
            CanvasGroup charPanel,  Transform charCardRoot,  Button charNextBtn,
            CanvasGroup blessPanel, Transform blessCardRoot, Button blessBackBtn, Button blessNextBtn,
            CanvasGroup diffPanel,  Transform diffCardRoot,  Button diffBackBtn,  Button diffNextBtn,
            CanvasGroup confirmPanel, Image confirmPortrait,
            TextMeshProUGUI confirmCharName, TextMeshProUGUI confirmJobName,
            TextMeshProUGUI confirmDiffText, TextMeshProUGUI confirmBlessText,
            Button confirmBackBtn, Button beginBtn,
            Image[] stepDots, AudioSource sfx)
        {
            var so = new SerializedObject(ui);

            so.FindProperty("_charPanel")       .objectReferenceValue = charPanel;
            so.FindProperty("_charCardRoot")    .objectReferenceValue = charCardRoot;
            so.FindProperty("_charNextBtn")     .objectReferenceValue = charNextBtn;
            so.FindProperty("_blessPanel")      .objectReferenceValue = blessPanel;
            so.FindProperty("_blessCardRoot")   .objectReferenceValue = blessCardRoot;
            so.FindProperty("_blessBackBtn")    .objectReferenceValue = blessBackBtn;
            so.FindProperty("_blessNextBtn")    .objectReferenceValue = blessNextBtn;
            so.FindProperty("_diffPanel")       .objectReferenceValue = diffPanel;
            so.FindProperty("_diffCardRoot")    .objectReferenceValue = diffCardRoot;
            so.FindProperty("_diffBackBtn")     .objectReferenceValue = diffBackBtn;
            so.FindProperty("_diffNextBtn")     .objectReferenceValue = diffNextBtn;
            so.FindProperty("_confirmPanel")    .objectReferenceValue = confirmPanel;
            so.FindProperty("_confirmPortrait") .objectReferenceValue = confirmPortrait;
            so.FindProperty("_confirmCharName") .objectReferenceValue = confirmCharName;
            so.FindProperty("_confirmJobName")  .objectReferenceValue = confirmJobName;
            so.FindProperty("_confirmDiffText") .objectReferenceValue = confirmDiffText;
            so.FindProperty("_confirmBlessText").objectReferenceValue = confirmBlessText;
            so.FindProperty("_confirmBackBtn")  .objectReferenceValue = confirmBackBtn;
            so.FindProperty("_beginBtn")        .objectReferenceValue = beginBtn;
            so.FindProperty("_sfx")             .objectReferenceValue = sfx;

            var dotsProp = so.FindProperty("_stepDots");
            dotsProp.arraySize = stepDots.Length;
            for (int i = 0; i < stepDots.Length; i++)
                dotsProp.GetArrayElementAtIndex(i).objectReferenceValue = stepDots[i];

            // プロジェクト内の CharacterData を自動検索してアサイン
            var guids = AssetDatabase.FindAssets("t:CharacterData");
            var chars = guids
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
    }
}
#endif
