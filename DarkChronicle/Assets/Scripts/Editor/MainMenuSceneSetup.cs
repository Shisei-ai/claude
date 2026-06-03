#if UNITY_EDITOR
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using TMPro;
using DarkChronicle.UI;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Menu: DarkChronicle → Create MainMenu Scene
    ///
    /// Assets/Scenes/MainMenu.unity を新規作成し、以下を自動構築します：
    ///   - Canvas（1920×1080 ScaleWithScreenSize）
    ///   - 背景 Image（深紫）
    ///   - TitleGroup（CanvasGroup + タイトル/サブタイトル TextMeshPro）
    ///   - ButtonsGroup（CanvasGroup + 6ボタン + セパレーター）
    ///   - SaveSlotPanel（3スロット）
    ///   - SettingsPanel（BGM/SEスライダー + フルスクリーントグル）
    ///   - BackgroundParticles（金の塵パーティクル）
    ///   - MainMenuUI の全 SerializeField を自動配線
    ///
    /// 実行後の手動作業（コンソールログ参照）:
    ///   1. TextMeshPro フォントを割り当て（しっぽり明朝 SDF 等）
    ///   2. _titleBGM に BGM クリップを割り当て
    ///   3. TitleLogo に画像スプライトを割り当て（不要なら非表示化）
    ///   4. BackgroundParticles の Renderer/Material に Particles/Additive を割り当て
    /// </summary>
    public static class MainMenuSceneSetup
    {
        const string ScenePath = "Assets/Scenes/MainMenu.unity";

        // ── カラーパレット ──────────────────────────────────────────────────
        // ダークファンタジー HD-2D: 深紫・羊皮紙白・くすみ金
        static readonly Color ColBg          = new Color(0.024f, 0.016f, 0.067f, 1.000f); // #060411
        static readonly Color ColTitle       = new Color(0.929f, 0.878f, 0.769f, 1.000f); // #EDE0C4
        static readonly Color ColSubtitle    = new Color(0.722f, 0.604f, 0.353f, 1.000f); // #B89A5A
        static readonly Color ColBtnText     = new Color(0.867f, 0.816f, 0.706f, 1.000f); // #DDD0B4
        static readonly Color ColBtnTextDim  = new Color(0.416f, 0.353f, 0.290f, 1.000f); // #6A5A4A
        static readonly Color ColBtnBg       = new Color(0.082f, 0.043f, 0.165f, 0.784f); // #150B2A a200
        static readonly Color ColSeparator   = new Color(0.290f, 0.188f, 0.376f, 0.471f); // #4A3060 a120
        static readonly Color ColPanelBg     = new Color(0.040f, 0.020f, 0.100f, 0.950f); // #0A0519 a242
        static readonly Color ColParticle    = new Color(0.784f, 0.588f, 0.235f, 0.350f); // #C8963C a89
        static readonly Color ColSliderFill  = new Color(0.722f, 0.604f, 0.353f, 1.000f); // B89A5A

        // ── エントリポイント ────────────────────────────────────────────────
        [MenuItem("DarkChronicle/Create MainMenu Scene", priority = 102)]
        public static void CreateScene()
        {
            if (File.Exists(ScenePath))
            {
                bool overwrite = EditorUtility.DisplayDialog(
                    "MainMenu Scene Already Exists",
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
            var bgmGO     = new GameObject("BGMAudioSource");
            var bgmSource = bgmGO.AddComponent<AudioSource>();
            bgmSource.loop         = true;
            bgmSource.playOnAwake  = false;
            bgmSource.volume       = 0.8f;

            // ── BackgroundParticles (World Space) ────────────────────────────
            var particlesGO = new GameObject("BackgroundParticles");
            particlesGO.transform.position = new Vector3(0f, 0f, 2f);
            var ps = particlesGO.AddComponent<ParticleSystem>();
            ConfigureBackgroundParticles(ps);

            // ── Canvas ───────────────────────────────────────────────────────
            var canvasGO = new GameObject("MainMenuCanvas");
            var canvas   = canvasGO.AddComponent<Canvas>();
            canvas.renderMode    = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder  = 0;

            var scaler = canvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution  = new Vector2(1920f, 1080f);
            scaler.screenMatchMode     = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight  = 0.5f;

            canvasGO.AddComponent<GraphicRaycaster>();

            // ── 背景 Image（Canvas 全面） ─────────────────────────────────────
            var bgGO = CreateImage("Background", canvasGO.transform, ColBg);
            SetStretch(bgGO);

            // ── TitleGroup ───────────────────────────────────────────────────
            var (titleGroupGO, titleGroup) = CreateCanvasGroup("TitleGroup", canvasGO.transform,
                anchoredPos: new Vector2(0f, 200f),
                size:        new Vector2(1000f, 200f));
            titleGroup.alpha = 0f;

            var logoGO = CreateImage("TitleLogo", titleGroupGO.transform, new Color(1f, 1f, 1f, 0f));
            PlaceRect(logoGO, new Vector2(0f, 20f), new Vector2(800f, 140f));

            var titleTextGO = CreateText("TitleText", titleGroupGO.transform,
                "DARK  CHRONICLE", 96f, ColTitle,
                TextAlignmentOptions.Center, FontStyles.Bold);
            PlaceRect(titleTextGO, new Vector2(0f, 20f), new Vector2(900f, 140f));
            titleTextGO.GetComponent<TextMeshProUGUI>().characterSpacing = 10f;

            var subtitleTextGO = CreateText("SubtitleText", titleGroupGO.transform,
                "——  闇 の 年 代 記  ——", 24f, ColSubtitle,
                TextAlignmentOptions.Center, FontStyles.Italic);
            PlaceRect(subtitleTextGO, new Vector2(0f, -68f), new Vector2(600f, 40f));
            subtitleTextGO.GetComponent<TextMeshProUGUI>().characterSpacing = 14f;

            // ── ButtonsGroup ─────────────────────────────────────────────────
            var (buttonsGroupGO, buttonsGroup) = CreateCanvasGroup("ButtonsGroup", canvasGO.transform,
                anchoredPos: new Vector2(0f, -80f),
                size:        new Vector2(320f, 420f));
            buttonsGroup.alpha = 0f;

            var btnContainerGO = CreateButtonContainer("ButtonContainer", buttonsGroupGO.transform);

            var newGameBtn     = CreateButton("NewGameButton",     "新しい旅を始める",  btnContainerGO.transform, 300f, 52f);
            var continueBtn    = CreateButton("ContinueButton",    "旅を続ける",       btnContainerGO.transform, 300f, 52f);
            var sepGO          = CreateSeparator("Separator",       btnContainerGO.transform);
            var roguelikeBtn   = CreateButton("RoguelikeButton",   "ローグライク開始",   btnContainerGO.transform, 300f, 52f);
            var metaUpgradeBtn = CreateButton("MetaUpgradeButton", "メタ強化  [0 碑文]", btnContainerGO.transform, 300f, 52f);
            var settingsBtn    = CreateButton("SettingsButton",    "設定",              btnContainerGO.transform, 300f, 52f);
            var quitBtn        = CreateButton("QuitButton",        "終了",              btnContainerGO.transform, 300f, 44f);
            // 終了ボタンは一回り小さい文字で控えめに
            var quitTMP = quitBtn.GetComponentInChildren<TextMeshProUGUI>();
            if (quitTMP != null) { quitTMP.fontSize = 18f; quitTMP.color = ColBtnTextDim; }

            // ── SaveSlotPanel ────────────────────────────────────────────────
            var saveSlotPanel = CreateDarkPanel("SaveSlotPanel", canvasGO.transform,
                Vector2.zero, new Vector2(700f, 460f));
            saveSlotPanel.SetActive(false);
            var saveSlots = BuildSaveSlots(saveSlotPanel.transform);

            // ── SettingsPanel ────────────────────────────────────────────────
            var settingsPanel = CreateDarkPanel("SettingsPanel", canvasGO.transform,
                Vector2.zero, new Vector2(520f, 420f));
            settingsPanel.SetActive(false);
            var (musicSlider, sfxSlider, fsToggle) = BuildSettingsPanel(settingsPanel.transform);

            // ── MainMenuController (MainMenuUI をアタッチ) ─────────────────
            var controllerGO = new GameObject("MainMenuController");
            var ui = controllerGO.AddComponent<MainMenuUI>();

            WireMainMenuUI(ui,
                titleGroup:        titleGroup,
                titleText:         titleTextGO.GetComponent<TextMeshProUGUI>(),
                subtitleText:      subtitleTextGO.GetComponent<TextMeshProUGUI>(),
                titleLogo:         logoGO.GetComponent<Image>(),
                buttonsGroup:      buttonsGroup,
                newGameButton:     newGameBtn.GetComponent<Button>(),
                continueButton:    continueBtn.GetComponent<Button>(),
                roguelikeButton:   roguelikeBtn.GetComponent<Button>(),
                metaUpgradeButton: metaUpgradeBtn.GetComponent<Button>(),
                settingsButton:    settingsBtn.GetComponent<Button>(),
                quitButton:        quitBtn.GetComponent<Button>(),
                saveSlotPanelGO:   saveSlotPanel,
                saveSlots:         saveSlots,
                settingsPanelGO:   settingsPanel,
                musicSlider:       musicSlider,
                sfxSlider:         sfxSlider,
                fsToggle:          fsToggle,
                bgParticles:       ps,
                bgmSource:         bgmSource);

            // ── シーン保存 ───────────────────────────────────────────────────
            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            Debug.Log(
                "[MainMenu] シーン生成完了: " + ScenePath + "\n\n" +
                "=== 残りの手動作業 ===\n" +
                "  1. TitleText・SubtitleText・各ボタンLabel の Font を割り当て\n" +
                "     推奨: しっぽり明朝 v2 SDF（日本語）/ Crimson Text SDF（英語タイトル）\n" +
                "  2. MainMenuController の _titleBGM に BGM クリップを割り当て\n" +
                "  3. TitleLogo の Image にロゴスプライトを割り当て\n" +
                "     （ロゴなしの場合は TitleLogo GameObject を非アクティブに）\n" +
                "  4. BackgroundParticles の ParticleSystemRenderer → Material を\n" +
                "     Particles/Additive または Mobile/Particles/Additive に設定\n" +
                "  5. ボタンにホバー演出が必要な場合は EventTrigger + DOTween で\n" +
                "     X位置 +8px / テキスト金色化（0.12秒 EaseOut）を追加");
        }

        // ── パーティクル設定（背景の舞う金の塵） ───────────────────────────
        static void ConfigureBackgroundParticles(ParticleSystem ps)
        {
            var main = ps.main;
            main.loop             = true;
            main.startLifetime    = new ParticleSystem.MinMaxCurve(8f, 12f);
            main.startSpeed       = new ParticleSystem.MinMaxCurve(0.3f, 0.8f);
            main.startSize        = new ParticleSystem.MinMaxCurve(0.02f, 0.06f);
            main.startColor       = new ParticleSystem.MinMaxGradient(ColParticle);
            main.maxParticles     = 80;
            main.simulationSpace  = ParticleSystemSimulationSpace.World;

            var emission = ps.emission;
            emission.rateOverTime = 6f;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Rectangle;
            shape.scale     = new Vector3(19.2f, 10.8f, 1f);

            var vel = ps.velocityOverLifetime;
            vel.enabled = true;
            vel.y = new ParticleSystem.MinMaxCurve(0.1f, 0.3f);

            var renderer = ps.GetComponent<ParticleSystemRenderer>();
            renderer.sortingOrder = -1;
        }

        // ── SaveSlotPanel 構築 ─────────────────────────────────────────────
        static SaveSlotEntry[] BuildSaveSlots(Transform parent)
        {
            var titleGO = CreateText("Title", parent, "セーブデータを選択", 24f,
                ColSubtitle, TextAlignmentOptions.Center, FontStyles.Normal);
            var titleRT = titleGO.GetComponent<RectTransform>();
            titleRT.anchorMin = titleRT.anchorMax = new Vector2(0.5f, 1f);
            titleRT.pivot = new Vector2(0.5f, 1f);
            titleRT.sizeDelta = new Vector2(600f, 44f);
            titleRT.anchoredPosition = new Vector2(0f, -20f);

            var slots = new SaveSlotEntry[3];
            for (int i = 0; i < 3; i++)
            {
                // スロットルート
                var slotGO  = CreateImage($"SaveSlot_{i}", parent, ColBtnBg);
                var slotRT  = slotGO.GetComponent<RectTransform>();
                slotRT.anchorMin = slotRT.anchorMax = new Vector2(0.5f, 1f);
                slotRT.pivot = new Vector2(0.5f, 1f);
                slotRT.sizeDelta = new Vector2(620f, 80f);
                slotRT.anchoredPosition = new Vector2(0f, -84f - i * 98f);

                var slotBtn = slotGO.AddComponent<Button>();
                SetButtonColors(slotBtn, slotGO.GetComponent<Image>());

                // スロット番号
                var numGO = CreateText("SlotNumber", slotGO.transform,
                    $"SLOT {i + 1}", 14f, ColSubtitle,
                    TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
                var numRT = numGO.GetComponent<RectTransform>();
                numRT.anchorMin = new Vector2(0f, 0.5f); numRT.anchorMax = new Vector2(0f, 0.5f);
                numRT.pivot = new Vector2(0f, 0.5f);
                numRT.sizeDelta = new Vector2(80f, 40f);
                numRT.anchoredPosition = new Vector2(16f, 0f);

                // エリア名
                var areaGO = CreateText("AreaName", slotGO.transform,
                    "──", 18f, ColBtnText,
                    TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
                var areaRT = areaGO.GetComponent<RectTransform>();
                areaRT.anchorMin = new Vector2(0f, 0.5f); areaRT.anchorMax = new Vector2(0f, 0.5f);
                areaRT.pivot = new Vector2(0f, 0.5f);
                areaRT.sizeDelta = new Vector2(320f, 40f);
                areaRT.anchoredPosition = new Vector2(110f, 0f);

                // プレイ時間
                var timeGO = CreateText("Playtime", slotGO.transform,
                    "00:00", 14f, ColSubtitle,
                    TextAlignmentOptions.MidlineRight, FontStyles.Normal);
                var timeRT = timeGO.GetComponent<RectTransform>();
                timeRT.anchorMin = new Vector2(1f, 0.5f); timeRT.anchorMax = new Vector2(1f, 0.5f);
                timeRT.pivot = new Vector2(1f, 0.5f);
                timeRT.sizeDelta = new Vector2(80f, 40f);
                timeRT.anchoredPosition = new Vector2(-16f, 0f);

                // 空スロットラベル
                var emptyGO = CreateText("EmptyLabel", slotGO.transform,
                    "─── NEW GAME ───", 16f, ColBtnTextDim,
                    TextAlignmentOptions.Center, FontStyles.Normal);
                var emptyRT = emptyGO.GetComponent<RectTransform>();
                emptyRT.anchorMin = Vector2.zero; emptyRT.anchorMax = Vector2.one;
                emptyRT.sizeDelta = Vector2.zero; emptyRT.anchoredPosition = Vector2.zero;

                slots[i] = new SaveSlotEntry
                {
                    Root           = slotGO,
                    SlotNumberText = numGO.GetComponent<TextMeshProUGUI>(),
                    AreaNameText   = areaGO.GetComponent<TextMeshProUGUI>(),
                    PlaytimeText   = timeGO.GetComponent<TextMeshProUGUI>(),
                    SelectButton   = slotBtn,
                    EmptyLabel     = emptyGO,
                };
            }

            // 閉じるボタン
            var closeBtn = CreateButton("CloseButton", "閉じる", parent, 200f, 44f);
            var closeRT  = closeBtn.GetComponent<RectTransform>();
            closeRT.anchorMin = new Vector2(0.5f, 0f);
            closeRT.anchorMax = new Vector2(0.5f, 0f);
            closeRT.pivot     = new Vector2(0.5f, 0f);
            closeRT.anchoredPosition = new Vector2(0f, 20f);

            return slots;
        }

        // ── SettingsPanel 構築 ─────────────────────────────────────────────
        static (Slider music, Slider sfx, Toggle fs) BuildSettingsPanel(Transform parent)
        {
            var titleGO = CreateText("Title", parent, "設 定", 28f,
                ColSubtitle, TextAlignmentOptions.Center, FontStyles.Normal);
            var titleRT = titleGO.GetComponent<RectTransform>();
            titleRT.anchorMin = titleRT.anchorMax = new Vector2(0.5f, 1f);
            titleRT.pivot = new Vector2(0.5f, 1f);
            titleRT.sizeDelta = new Vector2(420f, 52f);
            titleRT.anchoredPosition = new Vector2(0f, -24f);

            var musicSlider = CreateLabeledSlider("BGMVolume",    "BGM 音量", parent, new Vector2(0f, -110f));
            var sfxSlider   = CreateLabeledSlider("SFXVolume",    "SE 音量",  parent, new Vector2(0f, -188f));

            // フルスクリーントグル
            var fsContainerGO = new GameObject("FullscreenContainer");
            fsContainerGO.transform.SetParent(parent, false);
            var fsRT = fsContainerGO.AddComponent<RectTransform>();
            fsRT.anchorMin = fsRT.anchorMax = new Vector2(0.5f, 1f);
            fsRT.pivot = new Vector2(0.5f, 1f);
            fsRT.sizeDelta = new Vector2(420f, 48f);
            fsRT.anchoredPosition = new Vector2(0f, -266f);

            var fsLabelGO = CreateText("Label", fsContainerGO.transform,
                "フルスクリーン", 18f, ColBtnText,
                TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
            var fsLabelRT = fsLabelGO.GetComponent<RectTransform>();
            fsLabelRT.anchorMin = Vector2.zero; fsLabelRT.anchorMax = new Vector2(0.65f, 1f);
            fsLabelRT.sizeDelta = Vector2.zero; fsLabelRT.anchoredPosition = Vector2.zero;

            var toggleGO  = new GameObject("FullscreenToggle");
            toggleGO.transform.SetParent(fsContainerGO.transform, false);
            var toggleRT  = toggleGO.AddComponent<RectTransform>();
            toggleRT.anchorMin = new Vector2(0.65f, 0.1f); toggleRT.anchorMax = new Vector2(1f, 0.9f);
            toggleRT.sizeDelta = Vector2.zero; toggleRT.anchoredPosition = Vector2.zero;
            var toggleImg = toggleGO.AddComponent<Image>();
            toggleImg.color = ColBtnBg;
            var toggle = toggleGO.AddComponent<Toggle>();
            toggle.targetGraphic = toggleImg;

            var checkmarkGO = CreateImage("Checkmark", toggleGO.transform, ColSubtitle);
            var checkRT     = checkmarkGO.GetComponent<RectTransform>();
            checkRT.anchorMin = new Vector2(0.1f, 0.1f); checkRT.anchorMax = new Vector2(0.9f, 0.9f);
            checkRT.sizeDelta = Vector2.zero; checkRT.anchoredPosition = Vector2.zero;
            toggle.graphic = checkmarkGO.GetComponent<Image>();

            // 閉じるボタン
            var closeBtn = CreateButton("CloseButton", "閉じる", parent, 200f, 44f);
            var closeRT  = closeBtn.GetComponent<RectTransform>();
            closeRT.anchorMin = new Vector2(0.5f, 0f);
            closeRT.anchorMax = new Vector2(0.5f, 0f);
            closeRT.pivot     = new Vector2(0.5f, 0f);
            closeRT.anchoredPosition = new Vector2(0f, 20f);

            return (musicSlider, sfxSlider, toggle);
        }

        static Slider CreateLabeledSlider(string name, string labelText, Transform parent, Vector2 pos)
        {
            var containerGO = new GameObject(name);
            containerGO.transform.SetParent(parent, false);
            var cRT = containerGO.AddComponent<RectTransform>();
            cRT.anchorMin = cRT.anchorMax = new Vector2(0.5f, 1f);
            cRT.pivot = new Vector2(0.5f, 1f);
            cRT.sizeDelta = new Vector2(420f, 52f);
            cRT.anchoredPosition = pos;

            var labelGO = CreateText("Label", containerGO.transform, labelText,
                18f, ColBtnText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
            var labelRT = labelGO.GetComponent<RectTransform>();
            labelRT.anchorMin = new Vector2(0f, 0f); labelRT.anchorMax = new Vector2(0.38f, 1f);
            labelRT.sizeDelta = Vector2.zero; labelRT.anchoredPosition = Vector2.zero;

            // スライダー本体
            var sliderGO = new GameObject("Slider");
            sliderGO.transform.SetParent(containerGO.transform, false);
            var sRT = sliderGO.AddComponent<RectTransform>();
            sRT.anchorMin = new Vector2(0.40f, 0.2f); sRT.anchorMax = new Vector2(1f, 0.8f);
            sRT.sizeDelta = Vector2.zero; sRT.anchoredPosition = Vector2.zero;
            var sliderBg = sliderGO.AddComponent<Image>();
            sliderBg.color = new Color(0.2f, 0.1f, 0.3f, 0.8f);

            var slider = sliderGO.AddComponent<Slider>();
            slider.minValue = 0f;
            slider.maxValue = 1f;
            slider.value    = 0.8f;

            // Fill Area
            var fillAreaGO = new GameObject("Fill Area");
            fillAreaGO.transform.SetParent(sliderGO.transform, false);
            var faRT = fillAreaGO.AddComponent<RectTransform>();
            faRT.anchorMin = Vector2.zero; faRT.anchorMax = Vector2.one;
            faRT.sizeDelta = new Vector2(-10f, 0f); faRT.anchoredPosition = Vector2.zero;

            var fillGO = CreateImage("Fill", fillAreaGO.transform, ColSliderFill);
            var fillRT = fillGO.GetComponent<RectTransform>();
            fillRT.anchorMin = new Vector2(0f, 0f); fillRT.anchorMax = new Vector2(0.8f, 1f);
            fillRT.sizeDelta = Vector2.zero; fillRT.anchoredPosition = Vector2.zero;
            slider.fillRect = fillRT;

            // Handle
            var handleAreaGO = new GameObject("Handle Slide Area");
            handleAreaGO.transform.SetParent(sliderGO.transform, false);
            var haRT = handleAreaGO.AddComponent<RectTransform>();
            haRT.anchorMin = Vector2.zero; haRT.anchorMax = Vector2.one;
            haRT.sizeDelta = new Vector2(-20f, 0f); haRT.anchoredPosition = Vector2.zero;

            var handleGO = CreateImage("Handle", handleAreaGO.transform, ColSubtitle);
            var handleRT = handleGO.GetComponent<RectTransform>();
            handleRT.anchorMin = new Vector2(0.8f, 0f); handleRT.anchorMax = new Vector2(0.8f, 1f);
            handleRT.sizeDelta = new Vector2(12f, 0f); handleRT.anchoredPosition = Vector2.zero;
            slider.handleRect = handleRT;
            slider.targetGraphic = handleGO.GetComponent<Image>();

            return slider;
        }

        // ── MainMenuUI SerializeField 配線 ─────────────────────────────────
        static void WireMainMenuUI(
            MainMenuUI ui,
            CanvasGroup titleGroup,  TextMeshProUGUI titleText, TextMeshProUGUI subtitleText,
            Image titleLogo,         CanvasGroup buttonsGroup,
            Button newGameButton,    Button continueButton,
            Button roguelikeButton,  Button metaUpgradeButton,
            Button settingsButton,   Button quitButton,
            GameObject saveSlotPanelGO, SaveSlotEntry[] saveSlots,
            GameObject settingsPanelGO,
            Slider musicSlider,      Slider sfxSlider,
            Toggle fsToggle,         ParticleSystem bgParticles,
            AudioSource bgmSource)
        {
            var so = new SerializedObject(ui);

            so.FindProperty("_titleGroup")          .objectReferenceValue = titleGroup;
            so.FindProperty("_titleText")           .objectReferenceValue = titleText;
            so.FindProperty("_subtitleText")        .objectReferenceValue = subtitleText;
            so.FindProperty("_titleLogo")           .objectReferenceValue = titleLogo;
            so.FindProperty("_buttonsGroup")        .objectReferenceValue = buttonsGroup;
            so.FindProperty("_newGameButton")       .objectReferenceValue = newGameButton;
            so.FindProperty("_continueButton")      .objectReferenceValue = continueButton;
            so.FindProperty("_roguelikeButton")     .objectReferenceValue = roguelikeButton;
            so.FindProperty("_metaUpgradeButton")   .objectReferenceValue = metaUpgradeButton;
            so.FindProperty("_settingsButton")      .objectReferenceValue = settingsButton;
            so.FindProperty("_quitButton")          .objectReferenceValue = quitButton;
            so.FindProperty("_saveSlotPanel")       .objectReferenceValue = saveSlotPanelGO;
            so.FindProperty("_settingsPanel")       .objectReferenceValue = settingsPanelGO;
            so.FindProperty("_musicSlider")         .objectReferenceValue = musicSlider;
            so.FindProperty("_sfxSlider")           .objectReferenceValue = sfxSlider;
            so.FindProperty("_fullscreenToggle")    .objectReferenceValue = fsToggle;
            so.FindProperty("_backgroundParticles") .objectReferenceValue = bgParticles;
            so.FindProperty("_bgmSource")           .objectReferenceValue = bgmSource;
            so.FindProperty("_introDelay")          .floatValue           = 1.5f;

            var slotsProp = so.FindProperty("_saveSlots");
            slotsProp.arraySize = saveSlots.Length;
            for (int i = 0; i < saveSlots.Length; i++)
            {
                var elem = slotsProp.GetArrayElementAtIndex(i);
                elem.FindPropertyRelative("Root")          .objectReferenceValue = saveSlots[i].Root;
                elem.FindPropertyRelative("SlotNumberText").objectReferenceValue = saveSlots[i].SlotNumberText;
                elem.FindPropertyRelative("AreaNameText")  .objectReferenceValue = saveSlots[i].AreaNameText;
                elem.FindPropertyRelative("PlaytimeText")  .objectReferenceValue = saveSlots[i].PlaytimeText;
                elem.FindPropertyRelative("SelectButton")  .objectReferenceValue = saveSlots[i].SelectButton;
                elem.FindPropertyRelative("EmptyLabel")    .objectReferenceValue = saveSlots[i].EmptyLabel;
            }

            so.ApplyModifiedProperties();
        }

        // ── UI ファクトリ ──────────────────────────────────────────────────

        static (GameObject go, CanvasGroup group) CreateCanvasGroup(
            string name, Transform parent, Vector2 anchoredPos, Vector2 size)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin        = new Vector2(0.5f, 0.5f);
            rt.anchorMax        = new Vector2(0.5f, 0.5f);
            rt.pivot            = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta        = size;
            var cg = go.AddComponent<CanvasGroup>();
            return (go, cg);
        }

        static GameObject CreateButtonContainer(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();

            var vlg = go.AddComponent<VerticalLayoutGroup>();
            vlg.spacing             = 14f;
            vlg.childAlignment      = TextAnchor.UpperCenter;
            vlg.childControlWidth   = true;
            vlg.childControlHeight  = true;
            vlg.childForceExpandWidth  = true;
            vlg.childForceExpandHeight = false;
            vlg.padding = new RectOffset(0, 0, 0, 0);

            var csf = go.AddComponent<ContentSizeFitter>();
            csf.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin        = new Vector2(0f, 1f);
            rt.anchorMax        = new Vector2(1f, 1f);
            rt.pivot            = new Vector2(0.5f, 1f);
            rt.anchoredPosition = Vector2.zero;
            rt.sizeDelta        = Vector2.zero;
            return go;
        }

        static GameObject CreateButton(string name, string labelText,
            Transform parent, float width, float height)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);

            var rt  = go.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(width, height);

            var img = go.AddComponent<Image>();
            img.color = ColBtnBg;

            var btn = go.AddComponent<Button>();
            SetButtonColors(btn, img);

            var le = go.AddComponent<LayoutElement>();
            le.minHeight       = height;
            le.preferredHeight = height;

            var txtGO = CreateText("Label", go.transform, labelText,
                22f, ColBtnText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
            var txtRT = txtGO.GetComponent<RectTransform>();
            txtRT.anchorMin = Vector2.zero; txtRT.anchorMax = Vector2.one;
            txtRT.offsetMin = new Vector2(24f, 0f);
            txtRT.offsetMax = new Vector2(-24f, 0f);
            txtGO.GetComponent<TextMeshProUGUI>().characterSpacing = 3f;

            return go;
        }

        static GameObject CreateSeparator(string name, Transform parent)
        {
            var go  = CreateImage(name, parent, ColSeparator);
            var le  = go.AddComponent<LayoutElement>();
            le.minHeight       = 1f;
            le.preferredHeight = 1f;
            return go;
        }

        static GameObject CreateDarkPanel(string name, Transform parent,
            Vector2 anchoredPos, Vector2 size)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin        = new Vector2(0.5f, 0.5f);
            rt.anchorMax        = new Vector2(0.5f, 0.5f);
            rt.pivot            = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta        = size;
            go.AddComponent<Image>().color = ColPanelBg;
            return go;
        }

        static GameObject CreateImage(string name, Transform parent, Color color)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<Image>().color = color;
            return go;
        }

        static GameObject CreateText(string name, Transform parent, string text,
            float fontSize, Color color, TextAlignmentOptions alignment, FontStyles style)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.text               = text;
            tmp.fontSize           = fontSize;
            tmp.color              = color;
            tmp.alignment          = alignment;
            tmp.fontStyle          = style;
            tmp.enableWordWrapping = false;
            tmp.overflowMode       = TextOverflowModes.Overflow;
            return go;
        }

        static void SetButtonColors(Button btn, Image targetImage)
        {
            btn.targetGraphic = targetImage;
            var c = btn.colors;
            c.normalColor      = Color.white;
            c.highlightedColor = new Color(1.15f, 1.05f, 0.80f, 1f); // 暖かい金色寄りのハイライト
            c.pressedColor     = new Color(0.85f, 0.80f, 0.65f, 1f);
            c.disabledColor    = new Color(0.50f, 0.50f, 0.50f, 0.45f);
            c.fadeDuration     = 0.12f;
            btn.colors         = c;
        }

        static void SetStretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin        = Vector2.zero;
            rt.anchorMax        = Vector2.one;
            rt.sizeDelta        = Vector2.zero;
            rt.anchoredPosition = Vector2.zero;
        }

        static void PlaceRect(GameObject go, Vector2 anchoredPos, Vector2 size)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin        = new Vector2(0.5f, 0.5f);
            rt.anchorMax        = new Vector2(0.5f, 0.5f);
            rt.pivot            = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta        = size;
        }

        static void AddToBuildSettings(string path)
        {
            var current = EditorBuildSettings.scenes;
            foreach (var s in current)
                if (s.path == path) return;
            var updated = new EditorBuildSettingsScene[current.Length + 1];
            System.Array.Copy(current, updated, current.Length);
            updated[current.Length] = new EditorBuildSettingsScene(path, true);
            EditorBuildSettings.scenes = updated;
            Debug.Log("[MainMenu] Build Settings に追加: " + path);
        }
    }
}
#endif
