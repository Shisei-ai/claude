#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using TMPro;
using DarkChronicle.Core;
using DarkChronicle.Roguelike;
using DarkChronicle.Roguelike.Events;
using DarkChronicle.Roguelike.Map;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.UI;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Menu: DarkChronicle → Create Roguelike Scene
    ///
    /// Assets/Scenes/Roguelike.unity を新規作成し、以下を自動構築します：
    ///   - Sub-systems: RelicManager / LootSystem / RandomEventManager /
    ///                  ShopController / RestSiteController / AssetRegistry / EndingManager
    ///   - SceneTransitionManager（専用高優先度キャンバス）
    ///   - メインキャンバス上の全UIパネル（HUD / CharSelect / Difficulty /
    ///     Prologue / Victory / Death / RunResult / Loot / SkillUpgrade /
    ///     RelicSmelt / Event / Shop / Rest / Map / Pause / LevelUp / Equip）
    ///   - RoguelikeManager の全 SerializeField を自動配線
    ///
    /// 実行後の手動作業（コンソールログ参照）:
    ///   1. RoguelikeManager → _floorLibrary  に FloorLibrary SO を割り当て
    ///   2. RoguelikeManager → _charCardPrefab / _difficultyCardPrefab / _relicIconPrefab / _curseIconPrefab を割り当て
    ///   3. RoguelikeManager → _playableCharacters に CharacterData SO を追加
    ///   4. LootSystem → スキル/遺物プール、_skillChoicePrefab / _relicChoicePrefab を割り当て
    ///   5. NodeMapUI → _nodePrefab / _edgePrefab / スプライト一式 / _playerMarkerPrefab を割り当て
    ///   6. AssetRegistry / EndingManager → 各 SO リストを割り当て
    ///   7. 各 AudioClip を割り当て（BGM / SE）
    ///   8. DarkChronicle → Add PhantomJoin Panel を実行して PhantomJoinUI を追加
    ///   9. TextMeshPro フォントを割り当て
    /// </summary>
    public static class RoguelikeSceneSetup
    {
        const string ScenePath = "Assets/Scenes/Roguelike.unity";

        // ── カラーパレット ───────────────────────────────────────────────────
        static readonly Color ColBg      = new(0.036f, 0.024f, 0.067f);
        static readonly Color ColText    = new(0.867f, 0.816f, 0.706f);
        static readonly Color ColTitle   = new(0.930f, 0.880f, 0.780f);
        static readonly Color ColGold    = new(0.780f, 0.600f, 0.200f);
        static readonly Color ColBtnBg   = new(0.083f, 0.050f, 0.167f);
        static readonly Color ColPanel   = new(0.040f, 0.020f, 0.100f, 0.950f);
        static readonly Color ColOverlay = new(0.000f, 0.000f, 0.000f, 0.820f);
        static readonly Color ColHpFill  = new(0.820f, 0.200f, 0.200f, 1.000f);
        static readonly Color ColSep     = new(0.290f, 0.188f, 0.376f, 0.471f);

        // ── エントリポイント ──────────────────────────────────────────────────
        [MenuItem("DarkChronicle/Create Roguelike Scene", priority = 104)]
        public static void CreateScene()
        {
            if (File.Exists(ScenePath))
            {
                bool overwrite = EditorUtility.DisplayDialog(
                    "Roguelike Scene Already Exists",
                    $"'{ScenePath}' already exists.\nOverwrite?",
                    "Overwrite", "Cancel");
                if (!overwrite) return;
            }

            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // ── Camera + AudioListener ───────────────────────────────────────
            var camGO = new GameObject("Main Camera");
            camGO.tag = "MainCamera";
            var cam = camGO.AddComponent<Camera>();
            cam.clearFlags      = CameraClearFlags.SolidColor;
            cam.backgroundColor = ColBg;
            cam.orthographic    = true;
            cam.depth           = -1;
            camGO.AddComponent<AudioListener>();

            var bgmGO  = new GameObject("BGMAudioSource");
            var bgmSrc = bgmGO.AddComponent<AudioSource>();
            bgmSrc.loop = true; bgmSrc.playOnAwake = false; bgmSrc.volume = 0.75f;

            // ── EventSystem ─────────────────────────────────────────────────
            var esGO = new GameObject("EventSystem");
            esGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            esGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();

            // ── Sub-systems ─────────────────────────────────────────────────
            var subRoot = new GameObject("SubSystems");

            var relicMgrGO   = new GameObject("RelicManager");    relicMgrGO.transform.SetParent(subRoot.transform);
            var lootSysGO    = new GameObject("LootSystem");       lootSysGO.transform.SetParent(subRoot.transform);
            var eventMgrGO   = new GameObject("EventManager");     eventMgrGO.transform.SetParent(subRoot.transform);
            var shopCtrlGO   = new GameObject("ShopController");   shopCtrlGO.transform.SetParent(subRoot.transform);
            var restSiteGO   = new GameObject("RestSiteController"); restSiteGO.transform.SetParent(subRoot.transform);
            var assetRegGO   = new GameObject("AssetRegistry");    assetRegGO.transform.SetParent(subRoot.transform);
            var endingMgrGO  = new GameObject("EndingManager");    endingMgrGO.transform.SetParent(subRoot.transform);

            var relicMgr    = relicMgrGO .AddComponent<RelicManager>();
            var lootSys     = lootSysGO  .AddComponent<LootSystem>();
            var eventMgr    = eventMgrGO .AddComponent<RandomEventManager>();
            var shopCtrl    = shopCtrlGO .AddComponent<ShopController>();
            var restSite    = restSiteGO .AddComponent<RestSiteController>();
            var assetReg    = assetRegGO .AddComponent<AssetRegistry>();
            var endingMgr   = endingMgrGO.AddComponent<EndingManager>();

            var lootAudio   = lootSysGO .AddComponent<AudioSource>(); lootAudio.playOnAwake  = false;
            var eventAudio  = eventMgrGO.AddComponent<AudioSource>(); eventAudio.playOnAwake  = false;
            var restAudio   = restSiteGO.AddComponent<AudioSource>(); restAudio.playOnAwake   = false;

            // ── Main Canvas ─────────────────────────────────────────────────
            var mainCanvasGO = new GameObject("MainCanvas");
            var mainCanvas   = mainCanvasGO.AddComponent<Canvas>();
            mainCanvas.renderMode   = RenderMode.ScreenSpaceOverlay;
            mainCanvas.sortingOrder = 0;
            var scaler = mainCanvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode     = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight  = 0.5f;
            mainCanvasGO.AddComponent<GraphicRaycaster>();

            var canvasT = mainCanvasGO.transform;

            // 背景
            Stretch(MakeImage("Background", canvasT, ColBg));

            // ── HUD ─────────────────────────────────────────────────────────
            var hudGO  = new GameObject("HUD");
            hudGO.transform.SetParent(canvasT, false);
            Stretch(hudGO);
            var hudCG  = hudGO.AddComponent<CanvasGroup>();
            hudCG.alpha = 1f;
            var hudT   = hudGO.transform;

            var floorLabelGO = MakeTMP("FloorLabel", hudT,
                "Floor 1", 20f, ColGold, TextAlignmentOptions.TopLeft, FontStyles.Bold);
            PlaceAnchored(floorLabelGO, new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(20f, -16f), new Vector2(320f, 36f));

            var hpSlider = MakeSlider("HPSlider", hudT, ColHpFill,
                new Vector2(0f, 1f), new Vector2(0.35f, 1f), new Vector2(16f, -54f), new Vector2(-16f, -18f));

            var hpTextGO = MakeTMP("HPText", hudT,
                "100 / 100", 16f, ColText, TextAlignmentOptions.MidlineRight, FontStyles.Normal);
            PlaceAnchored(hpTextGO, new Vector2(0.35f, 1f), new Vector2(0.35f, 1f),
                new Vector2(-120f, -44f), new Vector2(120f, 28f));

            var goldTextGO = MakeTMP("GoldText", hudT,
                "G 0", 18f, ColGold, TextAlignmentOptions.TopLeft, FontStyles.Normal);
            PlaceAnchored(goldTextGO, new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(20f, -56f), new Vector2(160f, 28f));

            var luckTextGO = MakeTMP("LuckText", hudT,
                "幸運 0", 16f, ColText, TextAlignmentOptions.TopLeft, FontStyles.Normal);
            PlaceAnchored(luckTextGO, new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(190f, -56f), new Vector2(120f, 28f));

            var relicBarGO = new GameObject("RelicBar");
            relicBarGO.transform.SetParent(hudT, false);
            relicBarGO.AddComponent<RectTransform>();
            var relicHLG = relicBarGO.AddComponent<HorizontalLayoutGroup>();
            relicHLG.spacing = 4f; relicHLG.childForceExpandWidth = relicHLG.childForceExpandHeight = false;
            PlaceAnchored(relicBarGO, new Vector2(0f, 1f), new Vector2(0.6f, 1f),
                new Vector2(0f, -88f), new Vector2(0f, 32f));

            var curseBarGO = new GameObject("CurseBar");
            curseBarGO.transform.SetParent(hudT, false);
            curseBarGO.AddComponent<RectTransform>();
            var curseHLG = curseBarGO.AddComponent<HorizontalLayoutGroup>();
            curseHLG.spacing = 4f; curseHLG.childForceExpandWidth = curseHLG.childForceExpandHeight = false;
            PlaceAnchored(curseBarGO, new Vector2(0f, 1f), new Vector2(0.6f, 1f),
                new Vector2(0f, -124f), new Vector2(0f, 28f));

            // ── Character Select Panel ───────────────────────────────────────
            var charPanelGO = MakePanel("CharSelectPanel", canvasT);
            var charPanelCG = charPanelGO.GetComponent<CanvasGroup>();
            var charContainerGO = new GameObject("CharCardContainer");
            charContainerGO.transform.SetParent(charPanelGO.transform, false);
            charContainerGO.AddComponent<RectTransform>();
            var charHLG = charContainerGO.AddComponent<HorizontalLayoutGroup>();
            charHLG.spacing = 24f; charHLG.childAlignment = TextAnchor.MiddleCenter;
            charHLG.childForceExpandWidth = charHLG.childForceExpandHeight = false;
            PlaceAnchored(charContainerGO, new Vector2(0.1f, 0.15f), new Vector2(0.9f, 0.85f),
                Vector2.zero, Vector2.zero);

            // ── Difficulty Panel ─────────────────────────────────────────────
            var diffPanelGO = MakePanel("DifficultyPanel", canvasT);
            var diffPanelCG = diffPanelGO.GetComponent<CanvasGroup>();
            var diffContainerGO = new GameObject("DiffCardContainer");
            diffContainerGO.transform.SetParent(diffPanelGO.transform, false);
            diffContainerGO.AddComponent<RectTransform>();
            var diffVLG = diffContainerGO.AddComponent<VerticalLayoutGroup>();
            diffVLG.spacing = 12f; diffVLG.childAlignment = TextAnchor.MiddleCenter;
            diffVLG.childForceExpandWidth = diffVLG.childForceExpandHeight = false;
            PlaceAnchored(diffContainerGO, new Vector2(0.25f, 0.15f), new Vector2(0.75f, 0.85f),
                Vector2.zero, Vector2.zero);

            // ── Prologue Panel ───────────────────────────────────────────────
            var prologuePanelGO = MakePanel("ProloguePanel", canvasT);
            var prologueCG      = prologuePanelGO.GetComponent<CanvasGroup>();
            MakeImage("PrologueBg", prologuePanelGO.transform, ColOverlay).GetComponent<RectTransform>();
            Stretch(prologuePanelGO.transform.Find("PrologueBg")?.gameObject ?? prologuePanelGO);
            var prologueTextGO  = MakeTMP("PrologueText", prologuePanelGO.transform,
                "—", 22f, ColTitle, TextAlignmentOptions.Center, FontStyles.Normal);
            PlaceAnchored(prologueTextGO, new Vector2(0.1f, 0.3f), new Vector2(0.9f, 0.7f),
                Vector2.zero, Vector2.zero);
            prologueTextGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            // ── Victory Panel ────────────────────────────────────────────────
            var victoryPanelGO = MakePanel("VictoryPanel", canvasT);
            var victoryCG      = victoryPanelGO.GetComponent<CanvasGroup>();
            MakeTMP("VictoryLabel", victoryPanelGO.transform,
                "VICTORY!", 60f, ColGold, TextAlignmentOptions.Center, FontStyles.Bold);

            // ── Death Panel ──────────────────────────────────────────────────
            var deathPanelGO = MakePanel("DeathPanel", canvasT);
            var deathCG      = deathPanelGO.GetComponent<CanvasGroup>();
            MakeTMP("DeathLabel", deathPanelGO.transform,
                "YOU DIED", 60f, new Color(0.7f, 0.1f, 0.1f), TextAlignmentOptions.Center, FontStyles.Bold);

            // ── Run Result（勝敗両パネルに重なって表示） ─────────────────────
            var runResultGO = new GameObject("RunResult");
            runResultGO.transform.SetParent(canvasT, false);
            runResultGO.AddComponent<RectTransform>();
            Stretch(runResultGO);

            var runSummaryGO = MakeTMP("RunSummaryText", runResultGO.transform,
                "—", 18f, ColText, TextAlignmentOptions.Center, FontStyles.Normal);
            PlaceAnchored(runSummaryGO, new Vector2(0.2f, 0.55f), new Vector2(0.8f, 0.75f),
                Vector2.zero, Vector2.zero);
            runSummaryGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            var restartBtnGO = MakeStyledButton("RestartButton", "もう一度挑戦",
                runResultGO.transform, new Vector2(0.5f, 0.5f), new Vector2(-160f, -80f), new Vector2(280f, 56f));
            var menuBtnGO = MakeStyledButton("MenuButton", "メインメニューへ",
                runResultGO.transform, new Vector2(0.5f, 0.5f), new Vector2(160f, -80f), new Vector2(280f, 56f));

            // ── Loot Panel（LootSystem UI） ─────────────────────────────────
            var lootPanelGO = MakePanel("LootPanel", canvasT);
            var lootCG      = lootPanelGO.GetComponent<CanvasGroup>();
            var lootT       = lootPanelGO.transform;
            MakeImage("LootBg", lootT, ColOverlay); // stretch later
            Stretch(lootT.Find("LootBg")?.gameObject ?? lootPanelGO);

            var lootHeaderGO     = MakeTMP("LootHeader",      lootT, "報酬を選択",  28f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold);
            var lootGoldGO       = MakeTMP("LootGoldReward",  lootT, "G +0",        20f, ColGold,  TextAlignmentOptions.Center, FontStyles.Normal);
            PlaceAnchored(lootHeaderGO,  new Vector2(0.1f, 1f), new Vector2(0.9f, 1f), new Vector2(0f, -80f),  new Vector2(0f, 44f));
            PlaceAnchored(lootGoldGO,    new Vector2(0.1f, 1f), new Vector2(0.9f, 1f), new Vector2(0f, -134f), new Vector2(0f, 30f));

            var lootChoiceContainerGO = new GameObject("LootChoiceContainer");
            lootChoiceContainerGO.transform.SetParent(lootT, false);
            lootChoiceContainerGO.AddComponent<RectTransform>();
            var lootHLG = lootChoiceContainerGO.AddComponent<HorizontalLayoutGroup>();
            lootHLG.spacing = 20f; lootHLG.childAlignment = TextAnchor.MiddleCenter;
            lootHLG.childForceExpandWidth = lootHLG.childForceExpandHeight = false;
            PlaceAnchored(lootChoiceContainerGO, new Vector2(0.1f, 0.2f), new Vector2(0.9f, 0.75f),
                Vector2.zero, Vector2.zero);

            var lootSkipBtnGO = MakeStyledButton("LootSkipButton", "スキップ",
                lootT, new Vector2(0.5f, 0f), new Vector2(0f, 48f), new Vector2(200f, 44f));

            // RelicObtain サブパネル
            var relicObtainGO = MakePanel("RelicObtainPanel", lootT);
            var relicObtainCG = relicObtainGO.GetComponent<CanvasGroup>();
            PlaceAnchored(relicObtainGO, new Vector2(0.3f, 0.25f), new Vector2(0.7f, 0.75f),
                Vector2.zero, Vector2.zero);
            var relicIconGO   = MakeImage("RelicObtainIcon",    relicObtainGO.transform, Color.white);
            var relicNameGO   = MakeTMP("RelicObtainName",      relicObtainGO.transform, "—", 24f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold);
            var relicDescGO   = MakeTMP("RelicObtainDesc",      relicObtainGO.transform, "—", 16f, ColText,  TextAlignmentOptions.Center, FontStyles.Normal);
            var relicRarityGO = MakeTMP("RelicObtainRarity",    relicObtainGO.transform, "Common", 14f, ColGold, TextAlignmentOptions.Center, FontStyles.Italic);
            PlaceAnchored(relicIconGO,    new Vector2(0.35f, 0.55f), new Vector2(0.65f, 0.90f), Vector2.zero, Vector2.zero);
            PlaceAnchored(relicNameGO,    new Vector2(0.05f, 0.40f), new Vector2(0.95f, 0.55f), Vector2.zero, Vector2.zero);
            PlaceAnchored(relicDescGO,    new Vector2(0.05f, 0.15f), new Vector2(0.95f, 0.40f), Vector2.zero, Vector2.zero);
            PlaceAnchored(relicRarityGO,  new Vector2(0.05f, 0.05f), new Vector2(0.95f, 0.15f), Vector2.zero, Vector2.zero);
            relicDescGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            // ── Skill Upgrade UI / Relic Smelt UI（RoguelikeManager管理） ─
            var skillUpgradeGO = MakePanel("SkillUpgradeUI", canvasT);
            var skillUpgradeCG = skillUpgradeGO.GetComponent<CanvasGroup>();
            MakeTMP("SkillUpgradeTitle", skillUpgradeGO.transform,
                "スキルを強化してください", 28f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold);

            var relicSmeltGO = MakePanel("RelicSmeltUI", canvasT);
            var relicSmeltCG = relicSmeltGO.GetComponent<CanvasGroup>();
            MakeTMP("RelicSmeltTitle", relicSmeltGO.transform,
                "遺物を溶錬してください", 28f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold);

            // ── Event Panel（RandomEventManager UI） ────────────────────────
            var eventPanelGO  = MakePanel("EventPanel", canvasT);
            var eventCG       = eventPanelGO.GetComponent<CanvasGroup>();
            var eventRT       = eventPanelGO.GetComponent<RectTransform>();
            var eventT        = eventPanelGO.transform;

            var illustrationGO   = MakeImage("Illustration",    eventT, new Color(0.1f, 0.05f, 0.2f));
            var eventTitleGO     = MakeTMP("EventTitle",         eventT, "—", 32f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold);
            var eventNarrativeGO = MakeTMP("EventNarrative",     eventT, "—", 18f, ColText,  TextAlignmentOptions.Center, FontStyles.Normal);
            var eventResultGO    = MakeTMP("EventResult",         eventT, "—", 16f, ColGold,  TextAlignmentOptions.Center, FontStyles.Italic);
            PlaceAnchored(illustrationGO,   new Vector2(0.35f, 0.50f), new Vector2(0.65f, 0.85f), Vector2.zero, Vector2.zero);
            PlaceAnchored(eventTitleGO,     new Vector2(0.10f, 0.78f), new Vector2(0.90f, 0.88f), Vector2.zero, Vector2.zero);
            PlaceAnchored(eventNarrativeGO, new Vector2(0.10f, 0.40f), new Vector2(0.90f, 0.62f), Vector2.zero, Vector2.zero);
            PlaceAnchored(eventResultGO,    new Vector2(0.10f, 0.30f), new Vector2(0.90f, 0.40f), Vector2.zero, Vector2.zero);
            eventNarrativeGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            var eventChoiceContainerGO = new GameObject("EventChoiceContainer");
            eventChoiceContainerGO.transform.SetParent(eventT, false);
            eventChoiceContainerGO.AddComponent<RectTransform>();
            var eVLG = eventChoiceContainerGO.AddComponent<VerticalLayoutGroup>();
            eVLG.spacing = 10f; eVLG.childAlignment = TextAnchor.UpperCenter;
            eVLG.childControlWidth = true; eVLG.childForceExpandWidth = true;
            eVLG.childForceExpandHeight = false;
            PlaceAnchored(eventChoiceContainerGO, new Vector2(0.25f, 0.08f), new Vector2(0.75f, 0.30f),
                Vector2.zero, Vector2.zero);

            var eventContinueBtnGO = MakeStyledButton("EventContinueButton", "続ける",
                eventT, new Vector2(0.5f, 0f), new Vector2(0f, 48f), new Vector2(200f, 44f));
            var eventUiTintGO = MakeImage("UITint", eventT, new Color(0f, 0f, 0f, 0f));
            Stretch(eventUiTintGO);
            eventUiTintGO.transform.SetAsFirstSibling();

            // ── Shop Panel（ShopController UI） ─────────────────────────────
            var shopPanelGO = MakePanel("ShopPanel", canvasT);
            var shopCG      = shopPanelGO.GetComponent<CanvasGroup>();
            var shopT       = shopPanelGO.transform;

            var shopGoldGO  = MakeTMP("ShopGoldText", shopT, "G 0", 22f, ColGold, TextAlignmentOptions.TopRight, FontStyles.Bold);
            PlaceAnchored(shopGoldGO, new Vector2(0.6f, 1f), new Vector2(1f, 1f), new Vector2(0f, -20f), new Vector2(-20f, -20f));

            // セクション（実際のアイテムはプレハブで動的生成）
            var shopSkillSec       = MakeSection("SkillSection",       shopT, "スキル");
            var shopRelicSec       = MakeSection("RelicSection",       shopT, "遺物");
            var shopConsumableSec  = MakeSection("ConsumableSection",  shopT, "消耗品");
            var shopEquipmentSec   = MakeSection("EquipmentSection",   shopT, "装備");
            var shopServiceSec     = MakeSection("ServiceSection",     shopT, "サービス");

            float secX = -420f;
            PlaceAnchored(shopSkillSec,      new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(secX,       100f), new Vector2(160f, 340f));
            PlaceAnchored(shopRelicSec,      new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(secX+180f,  100f), new Vector2(160f, 340f));
            PlaceAnchored(shopConsumableSec, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(secX+360f,  100f), new Vector2(160f, 340f));
            PlaceAnchored(shopEquipmentSec,  new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(secX+540f,  100f), new Vector2(160f, 340f));
            PlaceAnchored(shopServiceSec,    new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(secX+720f,  100f), new Vector2(160f, 340f));

            var shopLeaveBtnGO = MakeStyledButton("ShopLeaveButton", "店を出る",
                shopT, new Vector2(1f, 0f), new Vector2(-48f, 48f), new Vector2(200f, 52f));

            // ショップツールチップ
            var shopTooltipGO  = MakeImage("ShopTooltip", shopT, ColPanel);
            var shopTooltipCG  = shopTooltipGO.AddComponent<CanvasGroup>();
            shopTooltipCG.alpha = 0f; shopTooltipCG.blocksRaycasts = false;
            PlaceAnchored(shopTooltipGO, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                new Vector2(0f, 60f), new Vector2(360f, 160f));
            var shopTTNameGO  = MakeTMP("ShopTTName",  shopTooltipGO.transform, "—", 18f, ColTitle, TextAlignmentOptions.TopLeft, FontStyles.Bold);
            var shopTTDescGO  = MakeTMP("ShopTTDesc",  shopTooltipGO.transform, "—", 14f, ColText,  TextAlignmentOptions.TopLeft, FontStyles.Normal);
            var shopTTPriceGO = MakeTMP("ShopTTPrice", shopTooltipGO.transform, "G 0", 16f, ColGold, TextAlignmentOptions.TopLeft, FontStyles.Normal);
            PlaceInPanel2(shopTTNameGO,  12f,  -12f, 336f, 28f);
            PlaceInPanel2(shopTTDescGO,  12f,  -48f, 336f, 72f);
            PlaceInPanel2(shopTTPriceGO, 12f, -128f, 336f, 24f);
            shopTTDescGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            // ── Rest Panel（RestSiteController UI） ─────────────────────────
            var restPanelGO = MakePanel("RestPanel", canvasT);
            var restCG      = restPanelGO.GetComponent<CanvasGroup>();
            var restT       = restPanelGO.transform;

            var restHpTextGO      = MakeTMP("RestHPText",      restT, "HP: 100 / 100", 22f, ColText, TextAlignmentOptions.Center, FontStyles.Normal);
            var restHealAmtGO     = MakeTMP("RestHealAmount",  restT, "(+0)", 16f, ColGold, TextAlignmentOptions.Center, FontStyles.Normal);
            var restStatusPopupGO = MakeTMP("RestStatusPopup", restT, "", 20f, ColGold, TextAlignmentOptions.Center, FontStyles.Bold);
            PlaceAnchored(restHpTextGO,      new Vector2(0.3f, 0.75f), new Vector2(0.7f, 0.82f), Vector2.zero, Vector2.zero);
            PlaceAnchored(restHealAmtGO,     new Vector2(0.3f, 0.70f), new Vector2(0.7f, 0.76f), Vector2.zero, Vector2.zero);
            PlaceAnchored(restStatusPopupGO, new Vector2(0.2f, 0.55f), new Vector2(0.8f, 0.65f), Vector2.zero, Vector2.zero);

            var restHealBtnGO     = MakeStyledButton("RestHealButton",     "休息して回復",  restT, new Vector2(0.5f, 0.5f), new Vector2(0f,  80f), new Vector2(260f, 52f));
            var restUpgradeBtnGO  = MakeStyledButton("RestUpgradeButton",  "スキルを強化",  restT, new Vector2(0.5f, 0.5f), new Vector2(0f,  16f), new Vector2(260f, 52f));
            var restSmeltBtnGO    = MakeStyledButton("RestSmeltButton",    "遺物を溶錬",    restT, new Vector2(0.5f, 0.5f), new Vector2(0f, -48f), new Vector2(260f, 52f));
            var restMeditateBtnGO = MakeStyledButton("RestMeditateButton", "瞑想する",      restT, new Vector2(0.5f, 0.5f), new Vector2(0f,-112f), new Vector2(260f, 52f));
            var restLeaveBtnGO    = MakeStyledButton("RestLeaveButton",    "出発する",       restT, new Vector2(0.5f, 0.5f), new Vector2(0f,-176f), new Vector2(260f, 52f));

            var campfireGO = new GameObject("CampfireParticles");
            campfireGO.transform.SetParent(restT, false);
            campfireGO.transform.localPosition = new Vector3(0f, -200f, 0f);
            var campfirePS = campfireGO.AddComponent<ParticleSystem>();
            ConfigureCampfire(campfirePS);

            // ── Map Panel（NodeMapUI） ────────────────────────────────────────
            var mapPanelGO = MakePanel("MapPanel", canvasT);
            var mapCG      = mapPanelGO.GetComponent<CanvasGroup>();
            var mapT       = mapPanelGO.transform;
            MakeImage("MapBg", mapT, ColBg); Stretch(mapT.GetChild(mapT.childCount - 1).gameObject);

            var scrollRectGO = new GameObject("MapScrollRect");
            scrollRectGO.transform.SetParent(mapT, false);
            var srRT = scrollRectGO.AddComponent<RectTransform>();
            srRT.anchorMin = new Vector2(0.05f, 0.05f);
            srRT.anchorMax = new Vector2(0.95f, 0.95f);
            srRT.offsetMin = srRT.offsetMax = Vector2.zero;
            var scrollRect = scrollRectGO.AddComponent<ScrollRect>();
            scrollRect.horizontal = true; scrollRect.vertical = true;

            var viewportGO = new GameObject("Viewport");
            viewportGO.transform.SetParent(scrollRectGO.transform, false);
            var vpRT = viewportGO.AddComponent<RectTransform>();
            vpRT.anchorMin = Vector2.zero; vpRT.anchorMax = Vector2.one;
            vpRT.offsetMin = vpRT.offsetMax = Vector2.zero;
            viewportGO.AddComponent<Image>().color = new Color(0f, 0f, 0f, 0.01f);
            viewportGO.AddComponent<Mask>().showMaskGraphic = false;
            scrollRect.viewport = vpRT;

            var mapRootGO = new GameObject("MapRoot");
            mapRootGO.transform.SetParent(viewportGO.transform, false);
            var mapRootRT = mapRootGO.AddComponent<RectTransform>();
            mapRootRT.anchorMin = mapRootRT.anchorMax = new Vector2(0.5f, 0.5f);
            mapRootRT.pivot     = new Vector2(0.5f, 0.5f);
            mapRootRT.sizeDelta = new Vector2(1200f, 1200f);
            scrollRect.content  = mapRootRT;

            // NodeMapUI コンポーネントを mapPanelGO に付加
            var nodeMapUI = mapPanelGO.AddComponent<NodeMapUI>();

            // ── Pause Panel ──────────────────────────────────────────────────
            var pausePanelGO  = new GameObject("PausePanel");
            pausePanelGO.transform.SetParent(canvasT, false);
            var pausePanelRT = pausePanelGO.AddComponent<RectTransform>();
            Stretch(pausePanelGO);
            pausePanelGO.SetActive(false);
            var pauseUI = pausePanelGO.AddComponent<PauseMenuUI>();

            // Backdrop (暗幕)
            var backdropGO = MakeImage("PauseBackdrop", pausePanelGO.transform, ColOverlay);
            Stretch(backdropGO);
            var backdropCG = backdropGO.AddComponent<CanvasGroup>();
            backdropCG.alpha = 0f;

            // Panel (メニュー本体)
            var pauseMenuGO = MakeImage("PauseMenuPanel", pausePanelGO.transform, ColPanel);
            var pmRT = pauseMenuGO.GetComponent<RectTransform>();
            pmRT.anchorMin = pmRT.anchorMax = new Vector2(0.5f, 0.5f);
            pmRT.pivot = new Vector2(0.5f, 0.5f);
            pmRT.anchoredPosition = Vector2.zero;
            pmRT.sizeDelta = new Vector2(380f, 560f);
            var pauseMenuCG = pauseMenuGO.AddComponent<CanvasGroup>();
            pauseMenuCG.alpha = 0f;
            var pauseMenuT = pauseMenuGO.transform;

            // ポーズメニューボタン群
            var pauseResumeBtn    = MakePauseBtn("ResumeButton",    "ゲームに戻る",      pauseMenuT, -190f);
            var pauseStatusBtn    = MakePauseBtn("StatusButton",    "ステータス",        pauseMenuT, -130f);
            var pauseEquipBtn     = MakePauseBtn("EquipButton",     "装備",             pauseMenuT,  -70f);
            var pauseOptionsBtn   = MakePauseBtn("OptionsButton",   "オプション",        pauseMenuT,  -10f);
            var pauseSep = MakeImage("PauseSep", pauseMenuT, ColSep);
            PlaceAnchored(pauseSep, new Vector2(0.1f, 0.5f), new Vector2(0.9f, 0.5f), new Vector2(0f, 40f), new Vector2(0f, 1f));
            var pauseSaveBtn     = MakePauseBtn("SaveButton",      "セーブ",            pauseMenuT,   60f);
            var pauseAbandonBtn  = MakePauseBtn("AbandonButton",   "ランを諦める",       pauseMenuT,  120f);
            var pauseMenuBtn     = MakePauseBtn("MainMenuButton",  "メインメニュー",     pauseMenuT,  180f);

            var pauseSaveLabelGO  = MakeTMP("SaveLabel",  pauseMenuT, "セーブ済み", 13f, ColGold, TextAlignmentOptions.BottomLeft, FontStyles.Italic);
            var pauseFloorLabelGO = MakeTMP("FloorLabel", pauseMenuT, "Floor 1",    15f, ColText, TextAlignmentOptions.BottomLeft, FontStyles.Normal);
            var pauseGoldLabelGO  = MakeTMP("GoldLabel",  pauseMenuT, "G 0",        15f, ColGold, TextAlignmentOptions.BottomRight, FontStyles.Normal);
            PlaceAnchored(pauseSaveLabelGO,  new Vector2(0f, 0f), new Vector2(0.5f, 0f), new Vector2(16f,  4f), new Vector2(-4f, 28f));
            PlaceAnchored(pauseFloorLabelGO, new Vector2(0f, 0f), new Vector2(0.5f, 0f), new Vector2(16f, 30f), new Vector2(-4f, 24f));
            PlaceAnchored(pauseGoldLabelGO,  new Vector2(0.5f, 0f), new Vector2(1f, 0f), new Vector2(4f,  16f), new Vector2(-16f, 24f));

            // OptionsPanel
            var optionsPanelGO = new GameObject("OptionsPanelController");
            optionsPanelGO.transform.SetParent(pausePanelGO.transform, false);
            var optionsPanel = optionsPanelGO.AddComponent<OptionsPanel>();
            var optGroupGO   = MakeImage("OptionsBg", optionsPanelGO.transform, ColPanel);
            PlaceAnchored(optGroupGO, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                new Vector2(200f, 0f), new Vector2(360f, 340f));
            var optCG = optGroupGO.AddComponent<CanvasGroup>();
            optCG.alpha = 0f;
            var optT  = optGroupGO.transform;
            var optBgmSlider = MakeSimpleSlider("BGMSlider",       optT, new Vector2(0f, -60f),  ColGold);
            var optSfxSlider = MakeSimpleSlider("SFXSlider",       optT, new Vector2(0f, -120f), ColGold);
            var optFsToggle  = MakeToggle("FullscreenToggle",       optT, new Vector2(0f, -180f));
            var optCloseBtn  = MakeStyledButton("OptionsCloseButton", "閉じる",
                optT, new Vector2(0.5f, 0f), new Vector2(0f, 20f), new Vector2(140f, 40f));
            MakeTMP("BGMLabel", optT, "BGM", 16f, ColText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal)
                .GetComponent<RectTransform>().anchoredPosition = new Vector2(20f, -60f);
            MakeTMP("SFXLabel", optT, "SE",  16f, ColText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal)
                .GetComponent<RectTransform>().anchoredPosition = new Vector2(20f, -120f);

            // ConfirmGroup
            var confirmGO = MakeImage("ConfirmGroup", pausePanelGO.transform, ColPanel);
            PlaceAnchored(confirmGO, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                Vector2.zero, new Vector2(440f, 220f));
            var confirmCG  = confirmGO.AddComponent<CanvasGroup>();
            confirmCG.alpha = 0f; confirmCG.blocksRaycasts = false;
            var confirmT   = confirmGO.transform;
            var confirmTextGO = MakeTMP("ConfirmText",    confirmT, "本当によろしいですか？", 20f, ColTitle, TextAlignmentOptions.Center, FontStyles.Normal);
            var confirmYesGO  = MakeStyledButton("ConfirmYesButton", "はい",
                confirmT, new Vector2(0.25f, 0.5f), Vector2.zero, new Vector2(160f, 48f));
            var confirmNoGO   = MakeStyledButton("ConfirmNoButton",  "いいえ",
                confirmT, new Vector2(0.75f, 0.5f), Vector2.zero, new Vector2(160f, 48f));
            PlaceAnchored(confirmTextGO, new Vector2(0.1f, 0.6f), new Vector2(0.9f, 0.9f), Vector2.zero, Vector2.zero);

            // ── Level Up Panel ────────────────────────────────────────────────
            var levelUpPanelGO = new GameObject("LevelUpPanel");
            levelUpPanelGO.transform.SetParent(canvasT, false);
            levelUpPanelGO.AddComponent<RectTransform>();
            Stretch(levelUpPanelGO);
            levelUpPanelGO.SetActive(false);
            var levelUpUI = levelUpPanelGO.AddComponent<LevelUpUI>();

            var luBgGO = MakeImage("LevelUpBg", levelUpPanelGO.transform, ColOverlay);
            Stretch(luBgGO);
            var luCG = MakeImage("LevelUpPanel", levelUpPanelGO.transform, ColPanel)
                .AddComponent<CanvasGroup>();
            PlaceAnchored(luCG.gameObject, new Vector2(0.25f, 0.1f), new Vector2(0.75f, 0.9f), Vector2.zero, Vector2.zero);
            luCG.alpha = 0f;
            var luT = luCG.transform;

            var luCongratsGO = MakeTMP("CongratsText", luT, "LEVEL  UP!", 42f, ColGold, TextAlignmentOptions.Center, FontStyles.Bold);
            var luLevelGO    = MakeTMP("LevelLabel",   luT, "Lv. 1 → Lv. 2", 24f, ColTitle, TextAlignmentOptions.Center, FontStyles.Normal);
            PlaceAnchored(luCongratsGO, new Vector2(0.05f, 0.75f), new Vector2(0.95f, 0.92f), Vector2.zero, Vector2.zero);
            PlaceAnchored(luLevelGO,    new Vector2(0.05f, 0.62f), new Vector2(0.95f, 0.75f), Vector2.zero, Vector2.zero);

            var luStatContainerGO = new GameObject("StatContainer");
            luStatContainerGO.transform.SetParent(luT, false);
            luStatContainerGO.AddComponent<RectTransform>();
            var luStatVLG = luStatContainerGO.AddComponent<VerticalLayoutGroup>();
            luStatVLG.spacing = 6f; luStatVLG.childAlignment = TextAnchor.UpperCenter;
            luStatVLG.childControlWidth = true; luStatVLG.childForceExpandWidth = true; luStatVLG.childForceExpandHeight = false;
            PlaceAnchored(luStatContainerGO, new Vector2(0.1f, 0.35f), new Vector2(0.9f, 0.62f), Vector2.zero, Vector2.zero);

            var luSkillContainerGO = new GameObject("SkillContainer");
            luSkillContainerGO.transform.SetParent(luT, false);
            luSkillContainerGO.AddComponent<RectTransform>();
            var luSkillVLG = luSkillContainerGO.AddComponent<VerticalLayoutGroup>();
            luSkillVLG.spacing = 4f; luSkillVLG.childForceExpandWidth = true; luSkillVLG.childForceExpandHeight = false;
            PlaceAnchored(luSkillContainerGO, new Vector2(0.1f, 0.15f), new Vector2(0.9f, 0.35f), Vector2.zero, Vector2.zero);

            var luSkillHeaderGO = MakeTMP("SkillUnlockHeader", luT, "新スキル習得", 16f, ColGold, TextAlignmentOptions.Center, FontStyles.Bold);
            PlaceAnchored(luSkillHeaderGO, new Vector2(0.1f, 0.35f), new Vector2(0.9f, 0.42f), new Vector2(0f, -4f), Vector2.zero);

            var luContinueBtnGO = MakeStyledButton("LevelUpContinueButton", "続ける",
                luT, new Vector2(0.5f, 0f), new Vector2(0f, 20f), new Vector2(200f, 48f));
            var luContinueLabelGO = luContinueBtnGO.GetComponentInChildren<TextMeshProUGUI>();

            // ── Equip Panel ────────────────────────────────────────────────────
            var equipPanelGO = new GameObject("EquipPanel");
            equipPanelGO.transform.SetParent(canvasT, false);
            equipPanelGO.AddComponent<RectTransform>();
            Stretch(equipPanelGO);
            equipPanelGO.SetActive(false);
            var equipMenuUI = equipPanelGO.AddComponent<EquipMenuUI>();

            var eqBgGO    = MakeImage("EquipBg", equipPanelGO.transform, ColOverlay); Stretch(eqBgGO);
            var eqRootGO  = MakeImage("EquipRoot", equipPanelGO.transform, ColPanel);
            PlaceAnchored(eqRootGO, new Vector2(0.05f, 0.05f), new Vector2(0.95f, 0.95f), Vector2.zero, Vector2.zero);
            var eqRootCG  = eqRootGO.AddComponent<CanvasGroup>(); eqRootCG.alpha = 0f;
            var eqT       = eqRootGO.transform;

            var eqCloseBtn = MakeStyledButton("EquipCloseButton", "閉じる",
                eqT, new Vector2(1f, 1f), new Vector2(-16f, -16f), new Vector2(120f, 40f));

            // 装備スロット（左列）
            var eqWeaponGO  = BuildEquipSlot("WeaponSlot",    eqT, new Vector2(-580f,  160f), "武器");
            var eqArmorGO   = BuildEquipSlot("ArmorSlot",     eqT, new Vector2(-580f,   40f), "防具");
            var eqAccGO     = BuildEquipSlot("AccessorySlot", eqT, new Vector2(-580f,  -80f), "アクセ");

            // インベントリ（中央）
            var eqInventoryGO = new GameObject("InventoryRoot");
            eqInventoryGO.transform.SetParent(eqT, false);
            eqInventoryGO.AddComponent<RectTransform>();
            var invVLG = eqInventoryGO.AddComponent<VerticalLayoutGroup>();
            invVLG.spacing = 4f; invVLG.childControlWidth = true; invVLG.childForceExpandWidth = true; invVLG.childForceExpandHeight = false;
            PlaceAnchored(eqInventoryGO, new Vector2(0.2f, 0.1f), new Vector2(0.65f, 0.9f), Vector2.zero, Vector2.zero);

            // 詳細パネル（右）
            var eqDetailGO = MakeImage("DetailGroup", eqT, ColBtnBg);
            PlaceAnchored(eqDetailGO, new Vector2(0.65f, 0.1f), new Vector2(0.95f, 0.9f), Vector2.zero, Vector2.zero);
            var eqDetailCG = eqDetailGO.AddComponent<CanvasGroup>(); eqDetailCG.alpha = 0f;
            var dT = eqDetailGO.transform;
            var eqDetailName    = MakeTMP("DetailName",    dT, "—", 20f, ColTitle, TextAlignmentOptions.TopLeft, FontStyles.Bold);
            var eqDetailDesc    = MakeTMP("DetailDesc",    dT, "—", 14f, ColText,  TextAlignmentOptions.TopLeft, FontStyles.Normal);
            var eqDetailStats   = MakeTMP("DetailStats",   dT, "—", 14f, ColGold,  TextAlignmentOptions.TopLeft, FontStyles.Normal);
            var eqDetailPassive = MakeTMP("DetailPassive", dT, "—", 14f, ColText,  TextAlignmentOptions.TopLeft, FontStyles.Italic);
            PlaceInPanel2(eqDetailName,    12f,  -12f, 0f, 32f); eqDetailName.GetComponent<RectTransform>().anchorMax = new Vector2(1f, 1f);
            PlaceInPanel2(eqDetailDesc,    12f,  -54f, 0f, 100f); eqDetailDesc.GetComponent<RectTransform>().anchorMax = new Vector2(1f, 1f);
            PlaceInPanel2(eqDetailStats,   12f, -162f, 0f, 80f);  eqDetailStats.GetComponent<RectTransform>().anchorMax = new Vector2(1f, 1f);
            PlaceInPanel2(eqDetailPassive, 12f, -250f, 0f, 80f);  eqDetailPassive.GetComponent<RectTransform>().anchorMax = new Vector2(1f, 1f);
            foreach (var go in new[] { eqDetailDesc, eqDetailStats, eqDetailPassive })
                go.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            // ── Transition Canvas ─────────────────────────────────────────────
            var transCanvasGO = new GameObject("TransitionCanvas");
            var transCanvas   = transCanvasGO.AddComponent<Canvas>();
            transCanvas.renderMode   = RenderMode.ScreenSpaceOverlay;
            transCanvas.sortingOrder = 100;
            transCanvasGO.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            ((CanvasScaler)transCanvasGO.GetComponent<CanvasScaler>()).referenceResolution = new Vector2(1920f, 1080f);
            transCanvasGO.AddComponent<GraphicRaycaster>();
            var transT = transCanvasGO.transform;
            var transManager = transCanvasGO.AddComponent<SceneTransitionManager>();

            // FadePanel
            var fadePanelGO = MakeImage("FadePanel", transT, Color.black);
            Stretch(fadePanelGO);
            var fadeCG = fadePanelGO.AddComponent<CanvasGroup>(); fadeCG.alpha = 0f; fadeCG.blocksRaycasts = false;

            // WipePanel
            var wipePanelGO = MakeImage("WipePanel", transT, Color.black);
            Stretch(wipePanelGO);
            var wipeImg = wipePanelGO.GetComponent<Image>();
            wipeImg.type = Image.Type.Filled;
            wipeImg.fillMethod = Image.FillMethod.Horizontal;
            wipeImg.fillAmount = 0f;

            // IrisPanel
            var irisPanelGO = MakeImage("IrisPanel", transT, Color.black);
            Stretch(irisPanelGO);
            var irisImg = irisPanelGO.GetComponent<Image>();
            irisImg.type = Image.Type.Filled;
            irisImg.fillMethod = Image.FillMethod.Radial360;
            irisImg.fillAmount = 0f;

            // AreaTitle
            var areaTitleGO = new GameObject("AreaTitleGroup");
            areaTitleGO.transform.SetParent(transT, false);
            areaTitleGO.AddComponent<RectTransform>();
            Stretch(areaTitleGO);
            var areaCG = areaTitleGO.AddComponent<CanvasGroup>(); areaCG.alpha = 0f;
            var areaTitleTextGO = MakeTMP("AreaTitleText", areaTitleGO.transform,
                "—", 44f, ColTitle, TextAlignmentOptions.Center, FontStyles.Bold);
            var areaSubtitleTextGO = MakeTMP("AreaSubtitleText", areaTitleGO.transform,
                "—", 20f, ColText, TextAlignmentOptions.Center, FontStyles.Normal);
            PlaceAnchored(areaTitleTextGO,    new Vector2(0.1f, 0.48f), new Vector2(0.9f, 0.58f), Vector2.zero, Vector2.zero);
            PlaceAnchored(areaSubtitleTextGO, new Vector2(0.1f, 0.42f), new Vector2(0.9f, 0.48f), Vector2.zero, Vector2.zero);

            // ── RoguelikeManager GO ───────────────────────────────────────────
            var rogueCtrlGO = new GameObject("RoguelikeController");
            var rogueMgr    = rogueCtrlGO.AddComponent<RoguelikeManager>();

            // ── 配線 ─────────────────────────────────────────────────────────
            WireTransitionManager(transManager, fadeCG, wipeImg, irisImg, areaCG,
                areaTitleTextGO.GetComponent<TextMeshProUGUI>(),
                areaSubtitleTextGO.GetComponent<TextMeshProUGUI>());

            WireNodeMapUI(nodeMapUI, mapRootRT, scrollRect);

            WireLootSystem(lootSys, lootCG,
                lootHeaderGO.GetComponent<TextMeshProUGUI>(),
                lootGoldGO.GetComponent<TextMeshProUGUI>(),
                lootChoiceContainerGO.transform,
                lootSkipBtnGO.GetComponent<Button>(),
                relicObtainCG,
                relicIconGO.GetComponent<Image>(),
                relicNameGO.GetComponent<TextMeshProUGUI>(),
                relicDescGO.GetComponent<TextMeshProUGUI>(),
                relicRarityGO.GetComponent<TextMeshProUGUI>(),
                lootAudio);

            WireEventManager(eventMgr, eventCG, eventRT,
                illustrationGO.GetComponent<Image>(),
                eventTitleGO.GetComponent<TextMeshProUGUI>(),
                eventNarrativeGO.GetComponent<TextMeshProUGUI>(),
                eventResultGO.GetComponent<TextMeshProUGUI>(),
                eventChoiceContainerGO.transform,
                eventContinueBtnGO.GetComponent<Button>(),
                eventUiTintGO.GetComponent<Image>(),
                eventAudio);

            WireShopController(shopCtrl, shopCG,
                shopGoldGO.GetComponent<TextMeshProUGUI>(),
                shopSkillSec.transform, shopRelicSec.transform,
                shopConsumableSec.transform, shopEquipmentSec.transform, shopServiceSec.transform,
                shopLeaveBtnGO.GetComponent<Button>(),
                shopTooltipCG,
                shopTTNameGO.GetComponent<TextMeshProUGUI>(),
                shopTTDescGO.GetComponent<TextMeshProUGUI>(),
                shopTTPriceGO.GetComponent<TextMeshProUGUI>());

            WireRestSiteController(restSite, restCG,
                restHpTextGO.GetComponent<TextMeshProUGUI>(),
                restHealBtnGO.GetComponent<Button>(),
                restUpgradeBtnGO.GetComponent<Button>(),
                restSmeltBtnGO.GetComponent<Button>(),
                restMeditateBtnGO.GetComponent<Button>(),
                restLeaveBtnGO.GetComponent<Button>(),
                restHealAmtGO.GetComponent<TextMeshProUGUI>(),
                restStatusPopupGO.GetComponent<TextMeshProUGUI>(),
                campfirePS, restAudio);

            WirePauseMenuUI(pauseUI, backdropCG, pauseMenuCG, pmRT,
                pauseResumeBtn, pauseStatusBtn, pauseEquipBtn, pauseOptionsBtn,
                pauseSaveBtn, pauseAbandonBtn, pauseMenuBtn,
                pauseSaveLabelGO.GetComponent<TextMeshProUGUI>(),
                pauseFloorLabelGO.GetComponent<TextMeshProUGUI>(),
                pauseGoldLabelGO.GetComponent<TextMeshProUGUI>(),
                optionsPanel, confirmCG,
                confirmTextGO.GetComponent<TextMeshProUGUI>(),
                confirmYesGO.GetComponent<Button>(),
                confirmNoGO.GetComponent<Button>());

            WireOptionsPanel(optionsPanel, optCG, optBgmSlider, optSfxSlider, optFsToggle,
                optCloseBtn.GetComponent<Button>());

            WireLevelUpUI(levelUpUI, luCG, luLevelGO.GetComponent<TextMeshProUGUI>(),
                luCongratsGO.GetComponent<TextMeshProUGUI>(),
                luStatContainerGO.transform, luSkillContainerGO.transform,
                luSkillHeaderGO.GetComponent<TextMeshProUGUI>(),
                luContinueBtnGO.GetComponent<Button>(),
                luContinueLabelGO);

            WireEquipMenuUI(equipMenuUI, eqRootCG, eqCloseBtn.GetComponent<Button>(),
                eqWeaponGO, eqArmorGO, eqAccGO, "武器", "防具", "アクセ",
                eqInventoryGO.transform, eqDetailCG,
                eqDetailName.GetComponent<TextMeshProUGUI>(),
                eqDetailDesc.GetComponent<TextMeshProUGUI>(),
                eqDetailStats.GetComponent<TextMeshProUGUI>(),
                eqDetailPassive.GetComponent<TextMeshProUGUI>());

            WireRoguelikeManager(rogueMgr,
                relicMgr, lootSys, eventMgr, shopCtrl, restSite, nodeMapUI, assetReg, pauseUI,
                charPanelCG, charContainerGO.transform,
                diffPanelCG, diffContainerGO.transform,
                hudCG,
                floorLabelGO.GetComponent<TextMeshProUGUI>(), hpSlider,
                hpTextGO.GetComponent<TextMeshProUGUI>(),
                goldTextGO.GetComponent<TextMeshProUGUI>(),
                luckTextGO.GetComponent<TextMeshProUGUI>(),
                relicBarGO.transform, curseBarGO.transform,
                victoryCG, deathCG,
                runSummaryGO.GetComponent<TextMeshProUGUI>(),
                restartBtnGO.GetComponent<Button>(), menuBtnGO.GetComponent<Button>(),
                skillUpgradeCG, relicSmeltCG,
                levelUpUI, endingMgr, equipMenuUI,
                prologueCG,
                prologueTextGO.GetComponent<TextMeshProUGUI>());

            // ── シーン保存 ───────────────────────────────────────────────────
            Directory.CreateDirectory("Assets/Scenes");
            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            Debug.Log(
                "[Roguelike] シーン生成完了: " + ScenePath + "\n\n" +
                "=== 残りの手動作業 ===\n" +
                "  1. RoguelikeManager → _floorLibrary に FloorLibrary SO を割り当て\n" +
                "  2. RoguelikeManager → _charCardPrefab / _difficultyCardPrefab を割り当て\n" +
                "  3. RoguelikeManager → _relicIconPrefab / _curseIconPrefab を割り当て\n" +
                "  4. RoguelikeManager → _playableCharacters に CharacterData SO を追加\n" +
                "  5. LootSystem → _skillChoicePrefab / _relicChoicePrefab を割り当て\n" +
                "  6. LootSystem → スキル/遺物プール (Common/Uncommon/Rare) を割り当て\n" +
                "  7. NodeMapUI → _nodePrefab / _edgePrefab / 各スプライト / _playerMarkerPrefab を割り当て\n" +
                "  8. RandomEventManager → _choiceButtonPrefab / _allEvents を割り当て\n" +
                "  9. ShopController → _shopItemPrefab を割り当て\n" +
                " 10. AssetRegistry / EndingManager → 各 SO リストを割り当て\n" +
                " 11. 各 AudioClip (BGM/SE) を割り当て\n" +
                " 12. LevelUpUI → _statRowPrefab / _skillRowPrefab を割り当て\n" +
                " 13. EquipMenuUI → _equipEntryPrefab を割り当て\n" +
                " 14. DarkChronicle → Add PhantomJoin Panel を実行\n" +
                " 15. TextMeshPro フォントを割り当て\n" +
                " 16. IrisPanel の Image → スプライトをサークル型に変更（オプション）");
        }

        // ── Wire: SceneTransitionManager ────────────────────────────────────
        static void WireTransitionManager(SceneTransitionManager mgr,
            CanvasGroup fadePanel, Image wipePanel, Image irisPanel,
            CanvasGroup areaTitleGroup, TextMeshProUGUI areaTitleText, TextMeshProUGUI areaSubtitleText)
        {
            var so = new SerializedObject(mgr);
            so.FindProperty("_fadePanel")        .objectReferenceValue = fadePanel;
            so.FindProperty("_wipePanel")        .objectReferenceValue = wipePanel;
            so.FindProperty("_irisPanel")        .objectReferenceValue = irisPanel;
            so.FindProperty("_areaTitleGroup")   .objectReferenceValue = areaTitleGroup;
            so.FindProperty("_areaTitleText")    .objectReferenceValue = areaTitleText;
            so.FindProperty("_areaSubtitleText") .objectReferenceValue = areaSubtitleText;
            so.FindProperty("_defaultDuration")  .floatValue           = 0.6f;
            so.ApplyModifiedProperties();
        }

        // ── Wire: NodeMapUI ──────────────────────────────────────────────────
        static void WireNodeMapUI(NodeMapUI ui, RectTransform mapRoot, ScrollRect scrollRect)
        {
            var so = new SerializedObject(ui);
            so.FindProperty("_mapRoot")    .objectReferenceValue = mapRoot;
            so.FindProperty("_scrollRect") .objectReferenceValue = scrollRect;
            so.ApplyModifiedProperties();
        }

        // ── Wire: LootSystem ────────────────────────────────────────────────
        static void WireLootSystem(LootSystem sys,
            CanvasGroup lootPanel, TextMeshProUGUI headerText, TextMeshProUGUI goldRewardText,
            Transform choiceContainer, Button skipButton,
            CanvasGroup relicObtainPanel, Image relicObtainIcon,
            TextMeshProUGUI relicObtainName, TextMeshProUGUI relicObtainDesc, TextMeshProUGUI relicObtainRarity,
            AudioSource audioSource)
        {
            var so = new SerializedObject(sys);
            so.FindProperty("_lootPanel")        .objectReferenceValue = lootPanel;
            so.FindProperty("_headerText")       .objectReferenceValue = headerText;
            so.FindProperty("_goldRewardText")   .objectReferenceValue = goldRewardText;
            so.FindProperty("_choiceContainer")  .objectReferenceValue = choiceContainer;
            so.FindProperty("_skipButton")       .objectReferenceValue = skipButton;
            so.FindProperty("_relicObtainPanel") .objectReferenceValue = relicObtainPanel;
            so.FindProperty("_relicObtainIcon")  .objectReferenceValue = relicObtainIcon;
            so.FindProperty("_relicObtainName")  .objectReferenceValue = relicObtainName;
            so.FindProperty("_relicObtainDesc")  .objectReferenceValue = relicObtainDesc;
            so.FindProperty("_relicObtainRarity").objectReferenceValue = relicObtainRarity;
            so.FindProperty("_audioSource")      .objectReferenceValue = audioSource;
            so.ApplyModifiedProperties();
        }

        // ── Wire: RandomEventManager ─────────────────────────────────────────
        static void WireEventManager(RandomEventManager mgr,
            CanvasGroup eventPanel, RectTransform eventPanelRect,
            Image illustration, TextMeshProUGUI titleText, TextMeshProUGUI narrativeText,
            TextMeshProUGUI resultText, Transform choiceContainer,
            Button continueButton, Image uiTint, AudioSource ambientSource)
        {
            var so = new SerializedObject(mgr);
            so.FindProperty("_eventPanel")      .objectReferenceValue = eventPanel;
            so.FindProperty("_eventPanelRect")  .objectReferenceValue = eventPanelRect;
            so.FindProperty("_illustration")    .objectReferenceValue = illustration;
            so.FindProperty("_titleText")       .objectReferenceValue = titleText;
            so.FindProperty("_narrativeText")   .objectReferenceValue = narrativeText;
            so.FindProperty("_resultText")      .objectReferenceValue = resultText;
            so.FindProperty("_choiceContainer") .objectReferenceValue = choiceContainer;
            so.FindProperty("_continueButton")  .objectReferenceValue = continueButton;
            so.FindProperty("_uiTint")          .objectReferenceValue = uiTint;
            so.FindProperty("_ambientSource")   .objectReferenceValue = ambientSource;
            so.ApplyModifiedProperties();
        }

        // ── Wire: ShopController ─────────────────────────────────────────────
        static void WireShopController(ShopController ctrl,
            CanvasGroup shopPanel, TextMeshProUGUI goldText,
            Transform skillSection, Transform relicSection, Transform consumableSection,
            Transform equipmentSection, Transform serviceSection,
            Button leaveButton, CanvasGroup tooltip,
            TextMeshProUGUI tooltipName, TextMeshProUGUI tooltipDesc, TextMeshProUGUI tooltipPrice)
        {
            var so = new SerializedObject(ctrl);
            so.FindProperty("_shopPanel")          .objectReferenceValue = shopPanel;
            so.FindProperty("_goldText")           .objectReferenceValue = goldText;
            so.FindProperty("_skillSection")       .objectReferenceValue = skillSection;
            so.FindProperty("_relicSection")       .objectReferenceValue = relicSection;
            so.FindProperty("_consumableSection")  .objectReferenceValue = consumableSection;
            so.FindProperty("_equipmentSection")   .objectReferenceValue = equipmentSection;
            so.FindProperty("_serviceSection")     .objectReferenceValue = serviceSection;
            so.FindProperty("_leaveButton")        .objectReferenceValue = leaveButton;
            so.FindProperty("_tooltip")            .objectReferenceValue = tooltip;
            so.FindProperty("_tooltipName")        .objectReferenceValue = tooltipName;
            so.FindProperty("_tooltipDesc")        .objectReferenceValue = tooltipDesc;
            so.FindProperty("_tooltipPrice")       .objectReferenceValue = tooltipPrice;
            so.ApplyModifiedProperties();
        }

        // ── Wire: RestSiteController ─────────────────────────────────────────
        static void WireRestSiteController(RestSiteController ctrl,
            CanvasGroup restPanel, TextMeshProUGUI hpText,
            Button healButton, Button upgradeButton, Button smeltButton,
            Button meditateButton, Button leaveButton,
            TextMeshProUGUI healAmountText, TextMeshProUGUI statusPopupText,
            ParticleSystem campfireParticles, AudioSource audioSource)
        {
            var so = new SerializedObject(ctrl);
            so.FindProperty("_restPanel")          .objectReferenceValue = restPanel;
            so.FindProperty("_hpText")             .objectReferenceValue = hpText;
            so.FindProperty("_healButton")         .objectReferenceValue = healButton;
            so.FindProperty("_upgradeButton")      .objectReferenceValue = upgradeButton;
            so.FindProperty("_smeltButton")        .objectReferenceValue = smeltButton;
            so.FindProperty("_meditateButton")     .objectReferenceValue = meditateButton;
            so.FindProperty("_leaveButton")        .objectReferenceValue = leaveButton;
            so.FindProperty("_healAmountText")     .objectReferenceValue = healAmountText;
            so.FindProperty("_statusPopupText")    .objectReferenceValue = statusPopupText;
            so.FindProperty("_campfireParticles")  .objectReferenceValue = campfireParticles;
            so.FindProperty("_audioSource")        .objectReferenceValue = audioSource;
            so.ApplyModifiedProperties();
        }

        // ── Wire: PauseMenuUI ────────────────────────────────────────────────
        static void WirePauseMenuUI(PauseMenuUI ui,
            CanvasGroup backdropGroup, CanvasGroup panelGroup, RectTransform panelRect,
            Button resumeButton, Button statusButton, Button equipButton, Button optionsButton,
            Button saveButton, Button abandonButton, Button mainMenuButton,
            TextMeshProUGUI saveLabel, TextMeshProUGUI floorLabel, TextMeshProUGUI goldLabel,
            OptionsPanel optionsPanel, CanvasGroup confirmGroup,
            TextMeshProUGUI confirmText, Button confirmYesButton, Button confirmNoButton)
        {
            var so = new SerializedObject(ui);
            so.FindProperty("_backdropGroup")   .objectReferenceValue = backdropGroup;
            so.FindProperty("_panelGroup")      .objectReferenceValue = panelGroup;
            so.FindProperty("_panelRect")       .objectReferenceValue = panelRect;
            so.FindProperty("_resumeButton")    .objectReferenceValue = resumeButton;
            so.FindProperty("_statusButton")    .objectReferenceValue = statusButton;
            so.FindProperty("_equipButton")     .objectReferenceValue = equipButton;
            so.FindProperty("_optionsButton")   .objectReferenceValue = optionsButton;
            so.FindProperty("_saveButton")      .objectReferenceValue = saveButton;
            so.FindProperty("_abandonButton")   .objectReferenceValue = abandonButton;
            so.FindProperty("_mainMenuButton")  .objectReferenceValue = mainMenuButton;
            so.FindProperty("_saveLabel")       .objectReferenceValue = saveLabel;
            so.FindProperty("_floorLabel")      .objectReferenceValue = floorLabel;
            so.FindProperty("_goldLabel")       .objectReferenceValue = goldLabel;
            so.FindProperty("_optionsPanel")    .objectReferenceValue = optionsPanel;
            so.FindProperty("_confirmGroup")    .objectReferenceValue = confirmGroup;
            so.FindProperty("_confirmText")     .objectReferenceValue = confirmText;
            so.FindProperty("_confirmYesButton").objectReferenceValue = confirmYesButton;
            so.FindProperty("_confirmNoButton") .objectReferenceValue = confirmNoButton;
            so.ApplyModifiedProperties();
        }

        // ── Wire: OptionsPanel ────────────────────────────────────────────────
        static void WireOptionsPanel(OptionsPanel panel,
            CanvasGroup group, Slider bgmSlider, Slider sfxSlider,
            Toggle fullscreenToggle, Button closeButton)
        {
            var so = new SerializedObject(panel);
            so.FindProperty("_group")            .objectReferenceValue = group;
            so.FindProperty("_bgmSlider")        .objectReferenceValue = bgmSlider;
            so.FindProperty("_sfxSlider")        .objectReferenceValue = sfxSlider;
            so.FindProperty("_fullscreenToggle") .objectReferenceValue = fullscreenToggle;
            so.FindProperty("_closeButton")      .objectReferenceValue = closeButton;
            so.ApplyModifiedProperties();
        }

        // ── Wire: LevelUpUI ──────────────────────────────────────────────────
        static void WireLevelUpUI(LevelUpUI ui,
            CanvasGroup panel, TextMeshProUGUI levelLabel, TextMeshProUGUI congratsText,
            Transform statContainer, Transform skillContainer, TextMeshProUGUI skillUnlockHeader,
            Button continueButton, TextMeshProUGUI continueLabel)
        {
            var so = new SerializedObject(ui);
            so.FindProperty("_panel")              .objectReferenceValue = panel;
            so.FindProperty("_levelLabel")         .objectReferenceValue = levelLabel;
            so.FindProperty("_congratsText")       .objectReferenceValue = congratsText;
            so.FindProperty("_statContainer")      .objectReferenceValue = statContainer;
            so.FindProperty("_skillContainer")     .objectReferenceValue = skillContainer;
            so.FindProperty("_skillUnlockHeader")  .objectReferenceValue = skillUnlockHeader;
            so.FindProperty("_continueButton")     .objectReferenceValue = continueButton;
            so.FindProperty("_continueLabel")      .objectReferenceValue = continueLabel;
            so.FindProperty("_fadeInDuration")     .floatValue           = 0.4f;
            so.FindProperty("_fadeOutDuration")    .floatValue           = 0.3f;
            so.FindProperty("_statRevealDelay")    .floatValue           = 0.07f;
            so.ApplyModifiedProperties();
        }

        // ── Wire: EquipMenuUI ────────────────────────────────────────────────
        static void WireEquipMenuUI(EquipMenuUI ui,
            CanvasGroup rootGroup, Button closeButton,
            GameObject weaponSlotGO, GameObject armorSlotGO, GameObject accessorySlotGO,
            string weaponLabel, string armorLabel, string accessoryLabel,
            Transform inventoryRoot, CanvasGroup detailGroup,
            TextMeshProUGUI detailName, TextMeshProUGUI detailDesc,
            TextMeshProUGUI detailStats, TextMeshProUGUI detailPassive)
        {
            var so = new SerializedObject(ui);
            so.FindProperty("_rootGroup")    .objectReferenceValue = rootGroup;
            so.FindProperty("_closeButton")  .objectReferenceValue = closeButton;
            so.FindProperty("_inventoryRoot").objectReferenceValue = inventoryRoot;
            so.FindProperty("_detailGroup")  .objectReferenceValue = detailGroup;
            so.FindProperty("_detailName")   .objectReferenceValue = detailName;
            so.FindProperty("_detailDesc")   .objectReferenceValue = detailDesc;
            so.FindProperty("_detailStats")  .objectReferenceValue = detailStats;
            so.FindProperty("_detailPassive").objectReferenceValue = detailPassive;

            WireEquipSlot(so.FindProperty("_weaponSlot"),    weaponSlotGO);
            WireEquipSlot(so.FindProperty("_armorSlot"),     armorSlotGO);
            WireEquipSlot(so.FindProperty("_accessorySlot"), accessorySlotGO);

            so.ApplyModifiedProperties();
        }

        static void WireEquipSlot(UnityEditor.SerializedProperty slotProp, GameObject slotGO)
        {
            slotProp.FindPropertyRelative("Icon")          .objectReferenceValue = slotGO.transform.Find("SlotIcon")?.GetComponent<Image>();
            slotProp.FindPropertyRelative("NameText")      .objectReferenceValue = slotGO.transform.Find("SlotName")?.GetComponent<TextMeshProUGUI>();
            slotProp.FindPropertyRelative("SlotLabel")     .objectReferenceValue = slotGO.transform.Find("SlotLabel")?.GetComponent<TextMeshProUGUI>();
            slotProp.FindPropertyRelative("UnequipButton") .objectReferenceValue = slotGO.transform.Find("UnequipButton")?.GetComponent<Button>();
        }

        // ── Wire: RoguelikeManager ───────────────────────────────────────────
        static void WireRoguelikeManager(RoguelikeManager mgr,
            RelicManager relicMgr, LootSystem lootSys, RandomEventManager eventMgr,
            ShopController shopCtrl, RestSiteController restSite,
            NodeMapUI mapUI, AssetRegistry assetReg, PauseMenuUI pauseMenu,
            CanvasGroup charSelectPanel, Transform charCardContainer,
            CanvasGroup difficultyPanel, Transform difficultyCardContainer,
            CanvasGroup hud, TextMeshProUGUI floorLabel, Slider hpSlider,
            TextMeshProUGUI hpText, TextMeshProUGUI goldText, TextMeshProUGUI luckText,
            Transform relicBarRoot, Transform curseBarRoot,
            CanvasGroup victoryPanel, CanvasGroup deathPanel,
            TextMeshProUGUI runSummaryText, Button restartButton, Button menuButton,
            CanvasGroup skillUpgradeUI, CanvasGroup relicSmeltUI,
            LevelUpUI levelUpUI, EndingManager endingManager, EquipMenuUI equipMenuUI,
            CanvasGroup prologuePanel, TextMeshProUGUI prologueText)
        {
            var so = new SerializedObject(mgr);
            so.FindProperty("_relicManager")           .objectReferenceValue = relicMgr;
            so.FindProperty("_lootSystem")             .objectReferenceValue = lootSys;
            so.FindProperty("_eventManager")           .objectReferenceValue = eventMgr;
            so.FindProperty("_shopController")         .objectReferenceValue = shopCtrl;
            so.FindProperty("_restSiteController")     .objectReferenceValue = restSite;
            so.FindProperty("_mapUI")                  .objectReferenceValue = mapUI;
            so.FindProperty("_assetRegistry")          .objectReferenceValue = assetReg;
            so.FindProperty("_pauseMenu")              .objectReferenceValue = pauseMenu;
            so.FindProperty("_charSelectPanel")        .objectReferenceValue = charSelectPanel;
            so.FindProperty("_charCardContainer")      .objectReferenceValue = charCardContainer;
            so.FindProperty("_difficultyPanel")        .objectReferenceValue = difficultyPanel;
            so.FindProperty("_difficultyCardContainer").objectReferenceValue = difficultyCardContainer;
            so.FindProperty("_hud")                    .objectReferenceValue = hud;
            so.FindProperty("_floorLabel")             .objectReferenceValue = floorLabel;
            so.FindProperty("_hpSlider")               .objectReferenceValue = hpSlider;
            so.FindProperty("_hpText")                 .objectReferenceValue = hpText;
            so.FindProperty("_goldText")               .objectReferenceValue = goldText;
            so.FindProperty("_luckText")               .objectReferenceValue = luckText;
            so.FindProperty("_relicBarRoot")           .objectReferenceValue = relicBarRoot;
            so.FindProperty("_curseBarRoot")           .objectReferenceValue = curseBarRoot;
            so.FindProperty("_victoryPanel")           .objectReferenceValue = victoryPanel;
            so.FindProperty("_deathPanel")             .objectReferenceValue = deathPanel;
            so.FindProperty("_runSummaryText")         .objectReferenceValue = runSummaryText;
            so.FindProperty("_restartButton")          .objectReferenceValue = restartButton;
            so.FindProperty("_menuButton")             .objectReferenceValue = menuButton;
            so.FindProperty("_skillUpgradeUI")         .objectReferenceValue = skillUpgradeUI;
            so.FindProperty("_relicSmeltUI")           .objectReferenceValue = relicSmeltUI;
            so.FindProperty("_levelUpUI")              .objectReferenceValue = levelUpUI;
            so.FindProperty("_endingManager")          .objectReferenceValue = endingManager;
            so.FindProperty("_equipMenuUI")            .objectReferenceValue = equipMenuUI;
            so.FindProperty("_prologuePanel")          .objectReferenceValue = prologuePanel;
            so.FindProperty("_prologueText")           .objectReferenceValue = prologueText;
            so.ApplyModifiedProperties();
        }

        // ── ファクトリ ────────────────────────────────────────────────────────

        // 非表示パネル（CanvasGroup alpha=0）
        static GameObject MakePanel(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            Stretch(go);
            var cg = go.AddComponent<CanvasGroup>();
            cg.alpha = 0f; cg.blocksRaycasts = false; cg.interactable = false;
            return go;
        }

        // ショップセクションコンテナ
        static GameObject MakeSection(string name, Transform parent, string label)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            var vlg = go.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 4f; vlg.childAlignment = TextAnchor.UpperCenter;
            vlg.childControlWidth = true; vlg.childForceExpandWidth = true; vlg.childForceExpandHeight = false;
            var header = MakeTMP("SectionLabel", go.transform, label, 14f, ColGold, TextAlignmentOptions.Center, FontStyles.Bold);
            header.GetComponent<RectTransform>().sizeDelta = new Vector2(0f, 22f);
            return go;
        }

        // ポーズメニュー内ボタン
        static Button MakePauseBtn(string name, string label, Transform parent, float y)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.1f, 0.5f); rt.anchorMax = new Vector2(0.9f, 0.5f);
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(0f, y);
            rt.sizeDelta = new Vector2(0f, 46f);
            var img = go.AddComponent<Image>(); img.color = ColBtnBg;
            var btn = go.AddComponent<Button>(); btn.targetGraphic = img;
            var lbl = MakeTMP("Label", go.transform, label, 17f, ColText, TextAlignmentOptions.Center, FontStyles.Normal);
            var lrt = lbl.GetComponent<RectTransform>();
            lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one;
            lrt.offsetMin = lrt.offsetMax = Vector2.zero;
            return btn;
        }

        // 装備スロット構築
        static GameObject BuildEquipSlot(string name, Transform parent, Vector2 pos, string labelText)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = new Vector2(320f, 80f);
            go.AddComponent<Image>().color = ColBtnBg;

            var iconGO   = new GameObject("SlotIcon");
            iconGO.transform.SetParent(go.transform, false);
            var iconImg  = iconGO.AddComponent<Image>(); iconImg.color = Color.white;
            var iconRT   = iconGO.GetComponent<RectTransform>();
            iconRT.anchorMin = new Vector2(0f, 0.1f); iconRT.anchorMax = new Vector2(0f, 0.9f);
            iconRT.pivot = new Vector2(0f, 0.5f); iconRT.anchoredPosition = new Vector2(8f, 0f);
            iconRT.sizeDelta = new Vector2(64f, 0f);

            var nameGO = MakeTMP("SlotName",  go.transform, "——", 16f, ColText, TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
            var nameRT = nameGO.GetComponent<RectTransform>();
            nameRT.anchorMin = new Vector2(0f, 0.4f); nameRT.anchorMax = new Vector2(0.7f, 0.9f);
            nameRT.offsetMin = new Vector2(80f, 0f); nameRT.offsetMax = Vector2.zero;

            var lblGO  = MakeTMP("SlotLabel", go.transform, labelText, 12f, ColGold, TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
            var lblRT  = lblGO.GetComponent<RectTransform>();
            lblRT.anchorMin = new Vector2(0f, 0.1f); lblRT.anchorMax = new Vector2(0.7f, 0.4f);
            lblRT.offsetMin = new Vector2(80f, 0f); lblRT.offsetMax = Vector2.zero;

            var unequipGO = new GameObject("UnequipButton");
            unequipGO.transform.SetParent(go.transform, false);
            var unequipRT = unequipGO.AddComponent<RectTransform>();
            unequipRT.anchorMin = new Vector2(0.7f, 0.2f); unequipRT.anchorMax = new Vector2(1f, 0.8f);
            unequipRT.offsetMin = new Vector2(0f, 0f); unequipRT.offsetMax = new Vector2(-8f, 0f);
            var unequipImg = unequipGO.AddComponent<Image>(); unequipImg.color = new Color(0.5f, 0.1f, 0.1f);
            unequipGO.AddComponent<Button>().targetGraphic = unequipImg;
            MakeTMP("Label", unequipGO.transform, "外す", 13f, ColText, TextAlignmentOptions.Center, FontStyles.Normal)
                .GetComponent<RectTransform>().anchorMin = Vector2.zero;
            var unLbl = unequipGO.transform.Find("Label").GetComponent<RectTransform>();
            unLbl.anchorMax = Vector2.one; unLbl.offsetMin = unLbl.offsetMax = Vector2.zero;

            return go;
        }

        // シンプルスライダー（オプションパネル用）
        static Slider MakeSimpleSlider(string name, Transform parent, Vector2 offset, Color fillColor)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.3f, 0.5f); rt.anchorMax = new Vector2(0.95f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = offset; rt.sizeDelta = new Vector2(0f, 20f);
            go.AddComponent<Image>().color = new Color(0.15f, 0.08f, 0.25f);

            var slider = go.AddComponent<Slider>();
            slider.minValue = 0f; slider.maxValue = 1f; slider.value = 0.8f;

            var faGO = new GameObject("Fill Area");
            faGO.transform.SetParent(go.transform, false);
            var faRT = faGO.AddComponent<RectTransform>();
            faRT.anchorMin = Vector2.zero; faRT.anchorMax = Vector2.one;
            faRT.sizeDelta = new Vector2(-10f, 0f);

            var fillGO = new GameObject("Fill");
            fillGO.transform.SetParent(faGO.transform, false);
            var fillRT = fillGO.AddComponent<RectTransform>();
            fillRT.anchorMin = new Vector2(0f, 0f); fillRT.anchorMax = new Vector2(0.8f, 1f);
            fillRT.sizeDelta = Vector2.zero;
            fillGO.AddComponent<Image>().color = fillColor;
            slider.fillRect = fillRT;

            var haGO = new GameObject("Handle Slide Area");
            haGO.transform.SetParent(go.transform, false);
            var haRT = haGO.AddComponent<RectTransform>();
            haRT.anchorMin = Vector2.zero; haRT.anchorMax = Vector2.one;
            haRT.sizeDelta = new Vector2(-20f, 0f);

            var handleGO = new GameObject("Handle");
            handleGO.transform.SetParent(haGO.transform, false);
            var handleRT = handleGO.AddComponent<RectTransform>();
            handleRT.anchorMin = new Vector2(0.8f, 0f); handleRT.anchorMax = new Vector2(0.8f, 1f);
            handleRT.sizeDelta = new Vector2(10f, 0f);
            var handleImg = handleGO.AddComponent<Image>(); handleImg.color = Color.white;
            slider.handleRect = handleRT;
            slider.targetGraphic = handleImg;

            return slider;
        }

        // HUD HP スライダー
        static Slider MakeSlider(string name, Transform parent, Color fillColor,
            Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin; rt.anchorMax = anchorMax;
            rt.offsetMin = offsetMin; rt.offsetMax = offsetMax;
            go.AddComponent<Image>().color = new Color(0.15f, 0.06f, 0.20f, 0.8f);

            var slider = go.AddComponent<Slider>();
            slider.minValue = 0f; slider.maxValue = 1f; slider.value = 1f;

            var faGO = new GameObject("Fill Area"); faGO.transform.SetParent(go.transform, false);
            var faRT = faGO.AddComponent<RectTransform>();
            faRT.anchorMin = Vector2.zero; faRT.anchorMax = Vector2.one;
            faRT.sizeDelta = new Vector2(-10f, 0f);

            var fillGO = new GameObject("Fill"); fillGO.transform.SetParent(faGO.transform, false);
            var fillRT = fillGO.AddComponent<RectTransform>();
            fillRT.anchorMin = new Vector2(0f, 0f); fillRT.anchorMax = new Vector2(1f, 1f);
            fillRT.sizeDelta = Vector2.zero;
            fillGO.AddComponent<Image>().color = fillColor;
            slider.fillRect = fillRT;

            var haGO = new GameObject("Handle Slide Area"); haGO.transform.SetParent(go.transform, false);
            var haRT = haGO.AddComponent<RectTransform>();
            haRT.anchorMin = Vector2.zero; haRT.anchorMax = Vector2.one;
            haRT.sizeDelta = new Vector2(-20f, 0f);

            var handleGO = new GameObject("Handle"); handleGO.transform.SetParent(haGO.transform, false);
            var handleRT = handleGO.AddComponent<RectTransform>();
            handleRT.anchorMin = new Vector2(1f, 0f); handleRT.anchorMax = new Vector2(1f, 1f);
            handleRT.sizeDelta = new Vector2(8f, 0f);
            var handleImg = handleGO.AddComponent<Image>(); handleImg.color = Color.white;
            slider.handleRect = handleRT;
            slider.targetGraphic = handleImg;

            return slider;
        }

        // Toggle（フルスクリーン用）
        static Toggle MakeToggle(string name, Transform parent, Vector2 offset)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.65f, 0.5f); rt.anchorMax = new Vector2(0.95f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = offset; rt.sizeDelta = new Vector2(0f, 28f);
            var img = go.AddComponent<Image>(); img.color = ColBtnBg;
            var toggle = go.AddComponent<Toggle>(); toggle.targetGraphic = img;
            var checkGO = new GameObject("Checkmark");
            checkGO.transform.SetParent(go.transform, false);
            var cRT = checkGO.AddComponent<RectTransform>();
            cRT.anchorMin = new Vector2(0.05f, 0.1f); cRT.anchorMax = new Vector2(0.95f, 0.9f);
            cRT.offsetMin = cRT.offsetMax = Vector2.zero;
            var checkImg = checkGO.AddComponent<Image>(); checkImg.color = ColGold;
            toggle.graphic = checkImg;
            return toggle;
        }

        // 汎用スタイルボタン（センター基点）
        static GameObject MakeStyledButton(string name, string label, Transform parent,
            Vector2 anchor, Vector2 pos, Vector2 size)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            var img = go.AddComponent<Image>(); img.color = ColBtnBg;
            var btn = go.AddComponent<Button>(); btn.targetGraphic = img;
            var lbl = MakeTMP("Label", go.transform, label, 18f, ColText, TextAlignmentOptions.Center, FontStyles.Normal);
            var lrt = lbl.GetComponent<RectTransform>();
            lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one;
            lrt.offsetMin = new Vector2(8f, 0f); lrt.offsetMax = new Vector2(-8f, 0f);
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

        // アンカー+オフセットによる矩形配置
        static void PlaceAnchored(GameObject go,
            Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin; rt.anchorMax = anchorMax;
            rt.offsetMin = offsetMin; rt.offsetMax = offsetMax;
        }

        // センター基点での絶対配置（MakeStyledButton 等で使用）
        static void PlaceAnchored(GameObject go, Vector2 anchor, Vector2 pos, Vector2 size)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot     = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos; rt.sizeDelta = size;
        }

        // パネル内テキスト配置（左上基点）
        static void PlaceInPanel2(GameObject go, float x, float y, float w, float h)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0f, 1f); rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot     = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(x, y); rt.sizeDelta = new Vector2(w, h);
        }

        // フルストレッチ
        static void Stretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        // 炎パーティクル（休憩サイト）
        static void ConfigureCampfire(ParticleSystem ps)
        {
            var main = ps.main;
            main.loop          = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.8f, 1.4f);
            main.startSpeed    = new ParticleSystem.MinMaxCurve(0.5f, 1.5f);
            main.startSize     = new ParticleSystem.MinMaxCurve(0.05f, 0.15f);
            main.startColor    = new ParticleSystem.MinMaxGradient(
                new Color(1.0f, 0.5f, 0.0f, 0.8f), new Color(1.0f, 0.8f, 0.0f, 0.5f));
            main.maxParticles  = 40;

            var emission = ps.emission;
            emission.rateOverTime = 20f;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Circle;
            shape.radius    = 0.3f;

            var vel = ps.velocityOverLifetime;
            vel.enabled = true;
            vel.y = new ParticleSystem.MinMaxCurve(0.5f, 1.5f);
        }

        static void AddToBuildSettings(string path)
        {
            var list = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (list.Exists(s => s.path == path)) return;
            list.Add(new EditorBuildSettingsScene(path, true));
            EditorBuildSettings.scenes = list.ToArray();
            Debug.Log("[Roguelike] Build Settings に追加: " + path);
        }
    }
}
#endif
