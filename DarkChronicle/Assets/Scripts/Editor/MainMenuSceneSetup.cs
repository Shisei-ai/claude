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
    /// Assets/Scenes/MainMenu.unity を新規作成します。
    /// プロジェクト内の TMP_FontAsset を自動検索し、日本語対応フォントがあれば
    /// すべてのテキストコンポーネントへ自動適用します。
    ///
    /// 実行後の手動作業（コンソールレポート参照）:
    ///   1. 日本語対応フォントが見つからなかった場合は手動で割り当て
    ///   2. MainMenuController → _titleBGM に BGM クリップを割り当て
    ///   3. TitleLogo → Image にロゴスプライトを割り当て（不要なら非表示化）
    ///   4. BackgroundParticles → ParticleSystemRenderer → Material を設定
    /// </summary>
    public static class MainMenuSceneSetup
    {
        const string ScenePath = "Assets/Scenes/MainMenu.unity";

        // ── カラーパレット ──────────────────────────────────────────────────
        // 背景
        static readonly Color ColBg          = new Color(0.016f, 0.010f, 0.055f, 1.000f);
        static readonly Color ColVignette    = new Color(0.006f, 0.003f, 0.024f, 0.700f);
        // テキスト
        static readonly Color ColTitle       = new Color(0.929f, 0.898f, 0.820f, 1.000f);
        static readonly Color ColSubtitle    = new Color(0.784f, 0.647f, 0.357f, 1.000f);
        static readonly Color ColBtnText     = new Color(0.867f, 0.831f, 0.745f, 1.000f);
        static readonly Color ColBtnTextDim  = new Color(0.350f, 0.298f, 0.235f, 1.000f);
        static readonly Color ColVersion     = new Color(0.270f, 0.220f, 0.165f, 0.700f);
        // ボタン・装飾
        static readonly Color ColBtnBg       = new Color(0.050f, 0.025f, 0.110f, 0.620f);
        static readonly Color ColAccentBar   = new Color(0.784f, 0.647f, 0.357f, 1.000f);
        static readonly Color ColDivider     = new Color(0.784f, 0.647f, 0.357f, 0.420f);
        static readonly Color ColSeparator   = new Color(0.280f, 0.180f, 0.360f, 0.380f);
        // パネル
        static readonly Color ColPanelBg     = new Color(0.022f, 0.011f, 0.065f, 0.975f);
        static readonly Color ColPanelBorder = new Color(0.784f, 0.647f, 0.357f, 0.380f);
        // スライダー
        static readonly Color ColSliderBg    = new Color(0.130f, 0.065f, 0.210f, 0.750f);
        static readonly Color ColSliderFill  = new Color(0.784f, 0.647f, 0.357f, 1.000f);

        // ── フォントキャッシュ ──────────────────────────────────────────────
        static TMP_FontAsset s_JaFont;

        /// <summary>
        /// プロジェクト内の TMP_FontAsset を検索し、日本語に対応していそうな
        /// フォントを優先して返す。見つからなければ任意の TMP フォントを返す。
        /// </summary>
        static TMP_FontAsset FindJaFont()
        {
            if (s_JaFont != null) return s_JaFont;

            var guids = AssetDatabase.FindAssets("t:TMP_FontAsset");
            if (guids.Length == 0) return null;

            // Pass 1: 名前キーワードで日本語フォントを優先検索
            string[] priority = {
                "Shippori", "しっぽり",
                "NotoSerifJP", "NotoSansJP", "NotoSans", "Noto",
                "ZenOldMincho", "ZenMaruGothic", "ZenKakuGothic",
                "YuMincho", "游明朝", "YuGothic", "游ゴシック",
                "GenYoMincho", "源ノ明朝",
                "IPAexMincho", "IPAexGothic",
                "MPlus", "RoundedMplus",
                "UDDigiKyokasho",
            };
            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var fa   = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(path);
                if (fa == null) continue;
                foreach (var kw in priority)
                    if (path.Contains(kw) || fa.name.Contains(kw))
                    {
                        s_JaFont = fa;
                        return s_JaFont;
                    }
            }

            // Pass 2: グリフ実在チェック（ひらがな「あ」が収録されているか）
            // 名前に日本語キーワードがなくても実際に日本語を持つフォントを検出する
            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var fa   = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(path);
                if (fa == null) continue;
                if (fa.HasCharacter('あ')) // 'あ'
                {
                    s_JaFont = fa;
                    return s_JaFont;
                }
            }

            // 日本語グリフを持つフォントが存在しない — null を返してデフォルトを維持
            // （ラテン専用フォントを誤って適用しない）
            return null;
        }

        // ── エントリポイント ────────────────────────────────────────────────
        [MenuItem("DarkChronicle/Create MainMenu Scene", priority = 102)]
        public static void CreateScene()
        {
            s_JaFont = null; // キャッシュリセット

            if (File.Exists(ScenePath))
            {
                bool overwrite = EditorUtility.DisplayDialog(
                    "MainMenu Scene Already Exists",
                    $"'{ScenePath}' already exists.\nOverwrite?",
                    "Overwrite", "Cancel");
                if (!overwrite) return;
            }

            var scene  = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var jaFont = FindJaFont();

            // ── Camera ─────────────────────────────────────────────────────
            var camGO = new GameObject("Main Camera");
            camGO.tag = "MainCamera";
            var cam   = camGO.AddComponent<Camera>();
            cam.clearFlags      = CameraClearFlags.SolidColor;
            cam.backgroundColor = ColBg;
            cam.orthographic    = true;
            cam.depth           = -1;
            camGO.AddComponent<AudioListener>();

            // ── EventSystem ────────────────────────────────────────────────
            var esGO = new GameObject("EventSystem");
            esGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            esGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();

            // ── BGM AudioSource ────────────────────────────────────────────
            var bgmGO     = new GameObject("BGMAudioSource");
            var bgmSource = bgmGO.AddComponent<AudioSource>();
            bgmSource.loop        = true;
            bgmSource.playOnAwake = false;
            bgmSource.volume      = 0.8f;

            // ── パーティクル（金の塵） ──────────────────────────────────────
            var particlesGO = new GameObject("BackgroundParticles");
            particlesGO.transform.position = new Vector3(0f, 0f, 2f);
            var ps = particlesGO.AddComponent<ParticleSystem>();
            ConfigureParticles(ps);

            // ── Canvas ─────────────────────────────────────────────────────
            var canvasGO = new GameObject("MainMenuCanvas");
            var canvas   = canvasGO.AddComponent<Canvas>();
            canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 0;

            var scaler = canvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode     = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight  = 0.5f;
            canvasGO.AddComponent<GraphicRaycaster>();

            // ── 背景レイヤー（奥 → 手前の順で追加） ──────────────────────
            // ベースカラー
            Stretch(MakeImage("BG_Base", canvasGO.transform, ColBg));

            // 上端ビネット（画面上部 40% を暗く）
            var bgTop   = MakeImage("BG_TopVignette",    canvasGO.transform, ColVignette);
            var bgTopRT = bgTop.GetComponent<RectTransform>();
            bgTopRT.anchorMin = new Vector2(0f, 0.60f); bgTopRT.anchorMax = Vector2.one;
            bgTopRT.offsetMin = bgTopRT.offsetMax = Vector2.zero;

            // 下端ビネット（画面下部 28% を暗く）
            var bgBot   = MakeImage("BG_BottomVignette", canvasGO.transform, ColVignette);
            var bgBotRT = bgBot.GetComponent<RectTransform>();
            bgBotRT.anchorMin = Vector2.zero; bgBotRT.anchorMax = new Vector2(1f, 0.28f);
            bgBotRT.offsetMin = bgBotRT.offsetMax = Vector2.zero;

            // 最上端ゴールドライン（2px）
            var topLine   = MakeImage("Decor_TopLine", canvasGO.transform, ColDivider);
            var topLineRT = topLine.GetComponent<RectTransform>();
            topLineRT.anchorMin = new Vector2(0f, 1f); topLineRT.anchorMax = Vector2.one;
            topLineRT.pivot     = new Vector2(0.5f, 1f);
            topLineRT.anchoredPosition = new Vector2(0f, -2f); topLineRT.sizeDelta = new Vector2(0f, 2f);

            // 下端ゴールドライン（1px、バージョン表記の上）
            var botLine   = MakeImage("Decor_BottomLine", canvasGO.transform, ColDivider);
            var botLineRT = botLine.GetComponent<RectTransform>();
            botLineRT.anchorMin = Vector2.zero; botLineRT.anchorMax = new Vector2(1f, 0f);
            botLineRT.pivot     = new Vector2(0.5f, 0f);
            botLineRT.anchoredPosition = new Vector2(0f, 44f); botLineRT.sizeDelta = new Vector2(0f, 1f);

            // ── TitleGroup ─────────────────────────────────────────────────
            var (titleGroupGO, titleGroup) = MakeCanvasGroup("TitleGroup", canvasGO.transform,
                new Vector2(0f, 210f), new Vector2(1200f, 220f));
            titleGroup.alpha = 0f;

            // タイトル上ルール（細いゴールドライン）
            var titleTopRule = MakeImage("Rule_Top", titleGroupGO.transform, ColDivider);
            PlaceCenter(titleTopRule, new Vector2(0f, 93f), new Vector2(720f, 1f));

            // タイトルロゴ（スプライト割り当てまで非表示）
            var logoGO  = MakeImage("TitleLogo", titleGroupGO.transform, Color.white);
            var logoImg = logoGO.GetComponent<Image>();
            logoImg.enabled       = false;   // ← スプライト設定後に手動で有効化
            logoImg.raycastTarget = false;
            PlaceCenter(logoGO, new Vector2(0f, 28f), new Vector2(820f, 130f));

            // タイトルテキスト
            var titleTextGO = MakeTMP("TitleText", titleGroupGO.transform,
                "DARK  CHRONICLE", 88f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold, jaFont);
            PlaceCenter(titleTextGO, new Vector2(0f, 28f), new Vector2(1000f, 130f));
            titleTextGO.GetComponent<TextMeshProUGUI>().characterSpacing = 12f;

            // サブタイトル
            var subtitleGO = MakeTMP("SubtitleText", titleGroupGO.transform,
                "——  闇 の 年 代 記  ——", 22f, ColSubtitle, TextAlignmentOptions.Center, FontStyles.Italic, jaFont);
            PlaceCenter(subtitleGO, new Vector2(0f, -63f), new Vector2(660f, 36f));
            subtitleGO.GetComponent<TextMeshProUGUI>().characterSpacing = 14f;

            // サブタイトル下ルール
            var titleBotRule = MakeImage("Rule_Bottom", titleGroupGO.transform, ColDivider);
            PlaceCenter(titleBotRule, new Vector2(0f, -90f), new Vector2(440f, 1f));

            // ── タイトル↔ボタン間の装飾区切り ──────────────────────────────
            BuildCenterDivider(canvasGO.transform, new Vector2(0f, 48f), 560f);

            // ── ButtonsGroup ───────────────────────────────────────────────
            var (buttonsGroupGO, buttonsGroup) = MakeCanvasGroup("ButtonsGroup", canvasGO.transform,
                new Vector2(0f, -108f), new Vector2(380f, 460f));
            buttonsGroup.alpha = 0f;

            var btnContainerGO = MakeButtonContainer("ButtonContainer", buttonsGroupGO.transform);

            var newGameBtn     = MakeStyledButton("NewGameButton",    "新しい旅を始める",       btnContainerGO.transform, 360f, 56f, jaFont);
            var continueBtn    = MakeStyledButton("ContinueButton",   "旅を続ける",            btnContainerGO.transform, 360f, 56f, jaFont);
            MakeSeparator("Separator", btnContainerGO.transform);
            var metaUpgradeBtn = MakeStyledButton("MetaUpgradeButton","彼方の墓標  [0 碑文]",  btnContainerGO.transform, 360f, 56f, jaFont);
            var settingsBtn    = MakeStyledButton("SettingsButton",   "設定",                 btnContainerGO.transform, 360f, 56f, jaFont);
            var quitBtn        = MakeStyledButton("QuitButton",       "終了",                 btnContainerGO.transform, 360f, 48f, jaFont);
            var quitLabel      = quitBtn.GetComponentInChildren<TextMeshProUGUI>();
            if (quitLabel != null) { quitLabel.fontSize = 18f; quitLabel.color = ColBtnTextDim; }

            // ── バージョン表記（右下） ──────────────────────────────────────
            var verGO = MakeTMP("VersionText", canvasGO.transform,
                "v0.1.0  Pre-Alpha", 13f, ColVersion, TextAlignmentOptions.BottomRight, FontStyles.Normal, jaFont);
            var verRT = verGO.GetComponent<RectTransform>();
            verRT.anchorMin = Vector2.zero; verRT.anchorMax = Vector2.one;
            verRT.offsetMin = new Vector2(0f, 10f); verRT.offsetMax = new Vector2(-24f, 0f);

            // ── SaveSlotPanel ──────────────────────────────────────────────
            var saveSlotPanel = MakeBorderedPanel("SaveSlotPanel", canvasGO.transform,
                Vector2.zero, new Vector2(720f, 488f));
            saveSlotPanel.SetActive(false);
            var saveSlots = BuildSaveSlots(saveSlotPanel.transform, jaFont);

            // ── SettingsPanel ──────────────────────────────────────────────
            var settingsPanel = MakeBorderedPanel("SettingsPanel", canvasGO.transform,
                Vector2.zero, new Vector2(540f, 448f));
            settingsPanel.SetActive(false);
            var (musicSlider, sfxSlider, fsToggle) = BuildSettingsPanel(settingsPanel.transform, jaFont);

            // ── MainMenuController ─────────────────────────────────────────
            var controllerGO = new GameObject("MainMenuController");
            var ui           = controllerGO.AddComponent<MainMenuUI>();

            WireMainMenuUI(ui,
                titleGroup:        titleGroup,
                titleText:         titleTextGO.GetComponent<TextMeshProUGUI>(),
                subtitleText:      subtitleGO.GetComponent<TextMeshProUGUI>(),
                titleLogo:         logoGO.GetComponent<Image>(),
                buttonsGroup:      buttonsGroup,
                newGameButton:     newGameBtn.GetComponent<Button>(),
                continueButton:    continueBtn.GetComponent<Button>(),
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

            // ── シーン保存 ─────────────────────────────────────────────────
            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            string fontMsg = jaFont != null
                ? $"✓ 使用フォント: {jaFont.name}"
                : "⚠ 日本語対応 TMP_FontAsset が見つかりません。\n"
                  + "    「しっぽり明朝 SDF」等を TextMeshPro Importer でインポートし、\n"
                  + "    各 TextMeshProUGUI の Font Asset を手動割り当てしてください。";

            Debug.Log(
                "[MainMenu] シーン生成完了: " + ScenePath + "\n\n" +
                "=== フォント状況 ===\n" +
                "  " + fontMsg + "\n\n" +
                "=== 残りの手動作業 ===\n" +
                "  1. MainMenuController → _titleBGM に BGM クリップを割り当て\n" +
                "  2. TitleLogo → Image を有効化し、ロゴスプライトを割り当て（不要なら削除）\n" +
                "  3. BackgroundParticles → ParticleSystemRenderer → Material に\n" +
                "     Particles/Additive マテリアルを割り当て\n" +
                (jaFont == null ? "  4. 全 TextMeshProUGUI に日本語フォントを手動割り当て\n" : ""));
        }

        // ── パーティクル設定 ────────────────────────────────────────────────
        static void ConfigureParticles(ParticleSystem ps)
        {
            var main             = ps.main;
            main.loop            = true;
            main.startLifetime   = new ParticleSystem.MinMaxCurve(8f, 16f);
            main.startSpeed      = new ParticleSystem.MinMaxCurve(0.25f, 0.80f);
            main.startSize       = new ParticleSystem.MinMaxCurve(0.018f, 0.055f);
            // 金と薄紫の2色範囲
            main.startColor      = new ParticleSystem.MinMaxGradient(
                new Color(0.80f, 0.62f, 0.22f, 0.30f),
                new Color(0.65f, 0.52f, 0.85f, 0.22f));
            main.maxParticles    = 110;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            var emission          = ps.emission;
            emission.rateOverTime = 7f;

            var shape       = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Rectangle;
            shape.scale     = new Vector3(20f, 11f, 1f);

            // ゆっくり上昇 + わずかな横流れ
            var vel      = ps.velocityOverLifetime;
            vel.enabled  = true;
            vel.x        = new ParticleSystem.MinMaxCurve(-0.06f, 0.06f);
            vel.y        = new ParticleSystem.MinMaxCurve(0.12f,  0.42f);
            vel.z        = new ParticleSystem.MinMaxCurve(0f, 0f);

            // アルファ: フェードイン → 維持 → フェードアウト
            var col2       = ps.colorOverLifetime;
            col2.enabled   = true;
            var grad       = new Gradient();
            grad.SetKeys(
                new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[] { new GradientAlphaKey(0f, 0f),  new GradientAlphaKey(1f, 0.18f),
                        new GradientAlphaKey(1f, 0.78f), new GradientAlphaKey(0f, 1f) });
            col2.color = grad;

            ps.GetComponent<ParticleSystemRenderer>().sortingOrder = -1;
        }

        // ── タイトル↔ボタン間の装飾区切り ─────────────────────────────────
        static void BuildCenterDivider(Transform parent, Vector2 pos, float totalWidth)
        {
            var go = new GameObject("TitleButtonDivider");
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos; rt.sizeDelta = new Vector2(totalWidth, 20f);

            float halfGap = 0.06f; // 中央ダイヤのための隙間

            var lineL   = MakeImage("LineL", go.transform, ColDivider);
            var lineL_RT = lineL.GetComponent<RectTransform>();
            lineL_RT.anchorMin = new Vector2(0f, 0.5f);    lineL_RT.anchorMax = new Vector2(0.5f - halfGap, 0.5f);
            lineL_RT.sizeDelta = new Vector2(0f, 1f);      lineL_RT.anchoredPosition = Vector2.zero;

            var diamond   = MakeImage("Diamond", go.transform, ColSubtitle);
            var diamondRT = diamond.GetComponent<RectTransform>();
            diamondRT.anchorMin = diamondRT.anchorMax = new Vector2(0.5f, 0.5f);
            diamondRT.sizeDelta = new Vector2(6f, 6f); diamondRT.anchoredPosition = Vector2.zero;

            var lineR   = MakeImage("LineR", go.transform, ColDivider);
            var lineR_RT = lineR.GetComponent<RectTransform>();
            lineR_RT.anchorMin = new Vector2(0.5f + halfGap, 0.5f); lineR_RT.anchorMax = new Vector2(1f, 0.5f);
            lineR_RT.sizeDelta = new Vector2(0f, 1f);                lineR_RT.anchoredPosition = Vector2.zero;
        }

        // ── SaveSlotPanel 構築 ─────────────────────────────────────────────
        static SaveSlotEntry[] BuildSaveSlots(Transform parent, TMP_FontAsset font)
        {
            var titleGO = MakeTMP("PanelTitle", parent, "— セーブデータを選択 —",
                22f, ColSubtitle, TextAlignmentOptions.Center, FontStyles.Normal, font);
            PinTopCenter(titleGO, new Vector2(660f, 48f), new Vector2(0f, -26f));

            var rule = MakeImage("TitleRule", parent, ColDivider);
            PinTopCenter(rule, new Vector2(640f, 1f), new Vector2(0f, -78f));

            var slots = new SaveSlotEntry[3];
            for (int i = 0; i < 3; i++)
            {
                var slotGO  = MakeImage($"SaveSlot_{i}", parent, ColBtnBg);
                var slotRT  = slotGO.GetComponent<RectTransform>();
                slotRT.anchorMin = slotRT.anchorMax = new Vector2(0.5f, 1f);
                slotRT.pivot     = new Vector2(0.5f, 1f);
                slotRT.sizeDelta = new Vector2(664f, 86f);
                slotRT.anchoredPosition = new Vector2(0f, -94f - i * 102f);

                // 左アクセントバー
                var bar   = MakeImage("AccentBar", slotGO.transform, ColAccentBar);
                var barRT = bar.GetComponent<RectTransform>();
                barRT.anchorMin = Vector2.zero; barRT.anchorMax = new Vector2(0f, 1f);
                barRT.pivot = new Vector2(0f, 0.5f);
                barRT.sizeDelta = new Vector2(3f, 0f); barRT.anchoredPosition = Vector2.zero;

                var slotBtn = slotGO.AddComponent<Button>();
                SetButtonColors(slotBtn, slotGO.GetComponent<Image>());

                var numGO = MakeTMP("SlotNumber", slotGO.transform,
                    $"SLOT {i + 1}", 12f, ColSubtitle, TextAlignmentOptions.MidlineLeft, FontStyles.Bold, font);
                PinMidLeft(numGO, new Vector2(72f, 36f), new Vector2(20f, 0f));

                var areaGO = MakeTMP("AreaName", slotGO.transform,
                    "──", 20f, ColBtnText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal, font);
                PinMidLeft(areaGO, new Vector2(380f, 40f), new Vector2(108f, 0f));

                var timeGO = MakeTMP("Playtime", slotGO.transform,
                    "──:──", 14f, ColSubtitle, TextAlignmentOptions.MidlineRight, FontStyles.Normal, font);
                PinMidRight(timeGO, new Vector2(100f, 36f), new Vector2(-18f, 0f));

                var emptyGO = MakeTMP("EmptyLabel", slotGO.transform,
                    "─── NEW GAME ───", 16f, ColBtnTextDim, TextAlignmentOptions.Center, FontStyles.Normal, font);
                Stretch(emptyGO);

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

            var closeBtn   = MakeStyledButton("CloseButton", "閉じる", parent, 220f, 48f, font);
            PinBottomCenter(closeBtn, 220f, 48f, new Vector2(0f, 26f));
            return slots;
        }

        // ── SettingsPanel 構築 ─────────────────────────────────────────────
        static (Slider music, Slider sfx, Toggle fs) BuildSettingsPanel(Transform parent, TMP_FontAsset font)
        {
            var titleGO = MakeTMP("PanelTitle", parent, "— 設 定 —",
                24f, ColSubtitle, TextAlignmentOptions.Center, FontStyles.Normal, font);
            PinTopCenter(titleGO, new Vector2(460f, 52f), new Vector2(0f, -28f));

            var rule = MakeImage("TitleRule", parent, ColDivider);
            PinTopCenter(rule, new Vector2(460f, 1f), new Vector2(0f, -84f));

            var musicSlider = MakeLabeledSlider("BGMVolume", "BGM 音量", parent, new Vector2(0f, -112f), font);
            var sfxSlider   = MakeLabeledSlider("SFXVolume", "SE 音量",  parent, new Vector2(0f, -200f), font);

            // フルスクリーントグル行
            var fsRow   = new GameObject("FullscreenRow");
            fsRow.transform.SetParent(parent, false);
            var fsRT    = fsRow.AddComponent<RectTransform>();
            fsRT.anchorMin = fsRT.anchorMax = new Vector2(0.5f, 1f);
            fsRT.pivot     = new Vector2(0.5f, 1f);
            fsRT.sizeDelta = new Vector2(460f, 52f);
            fsRT.anchoredPosition = new Vector2(0f, -290f);

            var fsLabel   = MakeTMP("Label", fsRow.transform,
                "フルスクリーン", 18f, ColBtnText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal, font);
            var fsLabelRT = fsLabel.GetComponent<RectTransform>();
            fsLabelRT.anchorMin = Vector2.zero; fsLabelRT.anchorMax = new Vector2(0.65f, 1f);
            fsLabelRT.sizeDelta = Vector2.zero; fsLabelRT.anchoredPosition = Vector2.zero;

            var toggleGO  = new GameObject("FullscreenToggle");
            toggleGO.transform.SetParent(fsRow.transform, false);
            var toggleRT  = toggleGO.AddComponent<RectTransform>();
            toggleRT.anchorMin = new Vector2(0.68f, 0.12f);
            toggleRT.anchorMax = new Vector2(1.00f, 0.88f);
            toggleRT.sizeDelta = Vector2.zero; toggleRT.anchoredPosition = Vector2.zero;
            var toggleImg = toggleGO.AddComponent<Image>();
            toggleImg.color = new Color(0.12f, 0.06f, 0.22f, 0.85f);
            var toggle    = toggleGO.AddComponent<Toggle>();
            toggle.targetGraphic = toggleImg;

            var checkGO  = MakeImage("Checkmark", toggleGO.transform, ColSubtitle);
            var checkRT  = checkGO.GetComponent<RectTransform>();
            checkRT.anchorMin = new Vector2(0.10f, 0.10f);
            checkRT.anchorMax = new Vector2(0.90f, 0.90f);
            checkRT.sizeDelta = Vector2.zero; checkRT.anchoredPosition = Vector2.zero;
            toggle.graphic = checkGO.GetComponent<Image>();

            var closeBtn = MakeStyledButton("CloseButton", "閉じる", parent, 220f, 48f, font);
            PinBottomCenter(closeBtn, 220f, 48f, new Vector2(0f, 28f));

            return (musicSlider, sfxSlider, toggle);
        }

        static Slider MakeLabeledSlider(string name, string label, Transform parent,
            Vector2 pos, TMP_FontAsset font)
        {
            var cGO = new GameObject(name);
            cGO.transform.SetParent(parent, false);
            var cRT = cGO.AddComponent<RectTransform>();
            cRT.anchorMin = cRT.anchorMax = new Vector2(0.5f, 1f);
            cRT.pivot     = new Vector2(0.5f, 1f);
            cRT.sizeDelta = new Vector2(460f, 60f); cRT.anchoredPosition = pos;

            var labelGO   = MakeTMP("Label", cGO.transform, label,
                18f, ColBtnText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal, font);
            var labelRT   = labelGO.GetComponent<RectTransform>();
            labelRT.anchorMin = Vector2.zero; labelRT.anchorMax = new Vector2(0.38f, 1f);
            labelRT.sizeDelta = Vector2.zero; labelRT.anchoredPosition = Vector2.zero;

            var sliderGO  = new GameObject("Slider");
            sliderGO.transform.SetParent(cGO.transform, false);
            var sRT       = sliderGO.AddComponent<RectTransform>();
            sRT.anchorMin = new Vector2(0.40f, 0.22f); sRT.anchorMax = new Vector2(1f, 0.78f);
            sRT.sizeDelta = Vector2.zero; sRT.anchoredPosition = Vector2.zero;
            sliderGO.AddComponent<Image>().color = ColSliderBg;

            var slider       = sliderGO.AddComponent<Slider>();
            slider.minValue  = 0f; slider.maxValue = 1f; slider.value = 0.8f;

            var fillAreaGO   = new GameObject("Fill Area");
            fillAreaGO.transform.SetParent(sliderGO.transform, false);
            var faRT         = fillAreaGO.AddComponent<RectTransform>();
            faRT.anchorMin   = Vector2.zero; faRT.anchorMax = Vector2.one;
            faRT.sizeDelta   = new Vector2(-10f, 0f); faRT.anchoredPosition = Vector2.zero;

            var fillGO  = MakeImage("Fill", fillAreaGO.transform, ColSliderFill);
            var fillRT  = fillGO.GetComponent<RectTransform>();
            fillRT.anchorMin = new Vector2(0f, 0f); fillRT.anchorMax = new Vector2(0.8f, 1f);
            fillRT.sizeDelta = Vector2.zero; fillRT.anchoredPosition = Vector2.zero;
            slider.fillRect  = fillRT;

            var haGO  = new GameObject("Handle Slide Area");
            haGO.transform.SetParent(sliderGO.transform, false);
            var haRT  = haGO.AddComponent<RectTransform>();
            haRT.anchorMin = Vector2.zero; haRT.anchorMax = Vector2.one;
            haRT.sizeDelta = new Vector2(-20f, 0f); haRT.anchoredPosition = Vector2.zero;

            var handleGO  = MakeImage("Handle", haGO.transform, ColSubtitle);
            var handleRT  = handleGO.GetComponent<RectTransform>();
            handleRT.anchorMin = new Vector2(0.8f, 0f); handleRT.anchorMax = new Vector2(0.8f, 1f);
            handleRT.sizeDelta = new Vector2(12f, 0f); handleRT.anchoredPosition = Vector2.zero;
            slider.handleRect    = handleRT;
            slider.targetGraphic = handleGO.GetComponent<Image>();

            return slider;
        }

        // ── MainMenuUI 配線 ────────────────────────────────────────────────
        static void WireMainMenuUI(
            MainMenuUI ui,
            CanvasGroup titleGroup, TextMeshProUGUI titleText, TextMeshProUGUI subtitleText,
            Image titleLogo, CanvasGroup buttonsGroup,
            Button newGameButton, Button continueButton,
            Button metaUpgradeButton, Button settingsButton, Button quitButton,
            GameObject saveSlotPanelGO, SaveSlotEntry[] saveSlots,
            GameObject settingsPanelGO,
            Slider musicSlider, Slider sfxSlider, Toggle fsToggle,
            ParticleSystem bgParticles, AudioSource bgmSource)
        {
            var so = new SerializedObject(ui);

            so.FindProperty("_titleGroup")          .objectReferenceValue = titleGroup;
            so.FindProperty("_titleText")           .objectReferenceValue = titleText;
            so.FindProperty("_subtitleText")        .objectReferenceValue = subtitleText;
            so.FindProperty("_titleLogo")           .objectReferenceValue = titleLogo;
            so.FindProperty("_buttonsGroup")        .objectReferenceValue = buttonsGroup;
            so.FindProperty("_newGameButton")       .objectReferenceValue = newGameButton;
            so.FindProperty("_continueButton")      .objectReferenceValue = continueButton;
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
                var e = slotsProp.GetArrayElementAtIndex(i);
                e.FindPropertyRelative("Root")          .objectReferenceValue = saveSlots[i].Root;
                e.FindPropertyRelative("SlotNumberText").objectReferenceValue = saveSlots[i].SlotNumberText;
                e.FindPropertyRelative("AreaNameText")  .objectReferenceValue = saveSlots[i].AreaNameText;
                e.FindPropertyRelative("PlaytimeText")  .objectReferenceValue = saveSlots[i].PlaytimeText;
                e.FindPropertyRelative("SelectButton")  .objectReferenceValue = saveSlots[i].SelectButton;
                e.FindPropertyRelative("EmptyLabel")    .objectReferenceValue = saveSlots[i].EmptyLabel;
            }

            so.ApplyModifiedProperties();
        }

        // ── ファクトリ ─────────────────────────────────────────────────────

        static (GameObject go, CanvasGroup cg) MakeCanvasGroup(string name, Transform parent,
            Vector2 pos, Vector2 size)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            var cg = go.AddComponent<CanvasGroup>();
            return (go, cg);
        }

        static GameObject MakeButtonContainer(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            var vlg = go.AddComponent<VerticalLayoutGroup>();
            vlg.spacing                = 10f;
            vlg.childAlignment         = TextAnchor.UpperCenter;
            vlg.childControlWidth      = true;
            vlg.childControlHeight     = true;
            vlg.childForceExpandWidth  = true;
            vlg.childForceExpandHeight = false;
            var csf = go.AddComponent<ContentSizeFitter>();
            csf.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            var rt  = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0f, 1f); rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.anchoredPosition = Vector2.zero; rt.sizeDelta = Vector2.zero;
            return go;
        }

        // ゴールドアクセントバー付きスタイルドボタン
        static GameObject MakeStyledButton(string name, string label, Transform parent,
            float width, float height, TMP_FontAsset font)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(width, height);
            var img = go.AddComponent<Image>();
            img.color = ColBtnBg;
            var btn = go.AddComponent<Button>();
            SetButtonColors(btn, img);
            var le  = go.AddComponent<LayoutElement>();
            le.minHeight = height; le.preferredHeight = height;

            // 左アクセントバー（金）
            var bar   = MakeImage("AccentBar", go.transform, ColAccentBar);
            var barRT = bar.GetComponent<RectTransform>();
            barRT.anchorMin = Vector2.zero; barRT.anchorMax = new Vector2(0f, 1f);
            barRT.pivot     = new Vector2(0f, 0.5f);
            barRT.sizeDelta = new Vector2(3f, 0f); barRT.anchoredPosition = Vector2.zero;

            // テキスト
            var txtGO = MakeTMP("Label", go.transform, label,
                22f, ColBtnText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal, font);
            var txtRT = txtGO.GetComponent<RectTransform>();
            txtRT.anchorMin = Vector2.zero; txtRT.anchorMax = Vector2.one;
            txtRT.offsetMin = new Vector2(20f, 0f); txtRT.offsetMax = new Vector2(-20f, 0f);
            txtGO.GetComponent<TextMeshProUGUI>().characterSpacing = 2f;

            return go;
        }

        static GameObject MakeSeparator(string name, Transform parent)
        {
            var go = MakeImage(name, parent, ColSeparator);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = 1f; le.preferredHeight = 1f;
            return go;
        }

        // 枠線付きダークパネル（4辺に ColPanelBorder の細線）
        static GameObject MakeBorderedPanel(string name, Transform parent, Vector2 pos, Vector2 size)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            go.AddComponent<Image>().color = ColPanelBg;

            // 4辺の枠線
            MakeBorderEdge("BorderTop",    go.transform, new Vector2(0f,1f), new Vector2(1f,1f), new Vector2(0f,-1.5f), Vector2.zero);
            MakeBorderEdge("BorderBottom", go.transform, new Vector2(0f,0f), new Vector2(1f,0f), Vector2.zero,          new Vector2(0f, 1.5f));
            MakeBorderEdge("BorderLeft",   go.transform, new Vector2(0f,0f), new Vector2(0f,1f), Vector2.zero,          new Vector2(1.5f,0f));
            MakeBorderEdge("BorderRight",  go.transform, new Vector2(1f,0f), new Vector2(1f,1f), new Vector2(-1.5f,0f), Vector2.zero);
            return go;
        }

        static void MakeBorderEdge(string name, Transform parent,
            Vector2 ancMin, Vector2 ancMax, Vector2 offMin, Vector2 offMax)
        {
            var go = MakeImage(name, parent, ColPanelBorder);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = ancMin; rt.anchorMax = ancMax;
            rt.offsetMin = offMin; rt.offsetMax = offMax;
        }

        static GameObject MakeImage(string name, Transform parent, Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<Image>().color = color;
            return go;
        }

        static GameObject MakeTMP(string name, Transform parent, string text,
            float fontSize, Color color, TextAlignmentOptions alignment,
            FontStyles style, TMP_FontAsset font = null)
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
            tmp.raycastTarget      = false;
            if (font != null) tmp.font = font;
            return go;
        }

        static void SetButtonColors(Button btn, Image target)
        {
            btn.targetGraphic = target;
            var c = btn.colors;
            c.normalColor      = Color.white;
            c.highlightedColor = new Color(1.22f, 1.06f, 0.78f, 1f);
            c.pressedColor     = new Color(0.76f, 0.70f, 0.56f, 1f);
            c.disabledColor    = new Color(0.44f, 0.40f, 0.36f, 0.40f);
            c.fadeDuration     = 0.10f;
            btn.colors         = c;
        }

        // ── 配置ヘルパー ───────────────────────────────────────────────────

        static void PlaceCenter(GameObject go, Vector2 pos, Vector2 size)
        {
            var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos; rt.sizeDelta = size;
        }

        static void PinTopCenter(GameObject go, Vector2 size, Vector2 pos)
        {
            var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.sizeDelta = size; rt.anchoredPosition = pos;
        }

        static void PinMidLeft(GameObject go, Vector2 size, Vector2 pos)
        {
            var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 0.5f);
            rt.pivot = new Vector2(0f, 0.5f);
            rt.sizeDelta = size; rt.anchoredPosition = pos;
        }

        static void PinMidRight(GameObject go, Vector2 size, Vector2 pos)
        {
            var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(1f, 0.5f);
            rt.pivot = new Vector2(1f, 0.5f);
            rt.sizeDelta = size; rt.anchoredPosition = pos;
        }

        static void PinBottomCenter(GameObject go, float w, float h, Vector2 pos)
        {
            var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.sizeDelta = new Vector2(w, h); rt.anchoredPosition = pos;
        }

        static void Stretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        static void AddToBuildSettings(string path)
        {
            var current = EditorBuildSettings.scenes;
            foreach (var s in current) if (s.path == path) return;
            var updated = new EditorBuildSettingsScene[current.Length + 1];
            System.Array.Copy(current, updated, current.Length);
            updated[current.Length] = new EditorBuildSettingsScene(path, true);
            EditorBuildSettings.scenes = updated;
            Debug.Log("[MainMenu] Build Settings に追加: " + path);
        }
    }
}
#endif
