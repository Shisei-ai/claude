using System.IO;
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using DarkChronicle.Roguelike;
using DarkChronicle.World;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Menu item: DarkChronicle > Create NodeField Scene
    ///
    /// Creates Assets/Scenes/NodeField.unity pre-populated with:
    ///   - Camera (depth 10, ClearFlags=Depth so NodeMap shows through)
    ///   - NodeFieldController with all node-type root objects wired
    ///   - NodeFieldVisualSwapper with three floor visual roots
    ///   - Exit trigger (EventTrigger.NodeExit, autoTrigger=true)
    ///   - PlayerSpawn transform
    ///
    /// After creation:
    ///   1. Add a PlayerController prefab to the scene.
    ///   2. Assign a WorldMapController if you want encounter-rate overrides.
    ///   3. Build out each floor's visual root (tilemaps, parallax, lighting).
    ///   4. Add enemy / NPC prefabs to the Elite/Boss/Rest/Shop/Event roots.
    /// </summary>
    public static class NodeFieldSceneSetup
    {
        private const string ScenePath = "Assets/Scenes/NodeField.unity";

        // ── Scene creation ─────────────────────────────────────────────────
        [MenuItem("DarkChronicle/Create NodeField Scene", priority = 100)]
        public static void CreateScene()
        {
            if (File.Exists(ScenePath))
            {
                bool overwrite = EditorUtility.DisplayDialog(
                    "NodeField Scene Already Exists",
                    $"'{ScenePath}' already exists.\nOverwrite?",
                    "Overwrite", "Cancel");
                if (!overwrite) return;
            }

            var scene = EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // ── Camera ──────────────────────────────────────────────────────
            var camGO = new GameObject("NodeFieldCamera");
            var cam   = camGO.AddComponent<Camera>();
            cam.depth        = 10;                           // renders on top of NodeMap camera
            cam.clearFlags   = CameraClearFlags.Depth;       // transparent bg: NodeMap shows through
            cam.orthographic = true;
            cam.orthographicSize = 5f;

            // ── Node-type root objects (all start inactive) ──────────────────
            var exitRoot      = MakeRoot("ExitRoot");
            var eliteRoot     = MakeRoot("EliteSpawnRoot");
            var bossRoot      = MakeRoot("BossSpawnRoot");
            var restRoot      = MakeRoot("RestSiteRoot");
            var shopRoot      = MakeRoot("ShopNPCRoot");
            var eventRoot_    = MakeRoot("EventRoot");
            var treasureRoot  = MakeRoot("TreasureRoot");
            var cursedRoot    = MakeRoot("CursedRoomRoot");

            // ExitRoot: contains the NodeExit trigger collider
            SetupExitTrigger(exitRoot);
            // TreasureRoot: normal chest + Ash-only LockedChest
            SetupInteractTrigger(treasureRoot, "TreasureChest",
                EventTrigger.TriggerType.TreasureChest, triggerOnce: true);
            var lockedChest = SetupLockedChest(treasureRoot);
            // CursedRoomRoot: altar + traps + darkness overlay
            SetupInteractTrigger(cursedRoot, "CursedAltar",
                EventTrigger.TriggerType.CursedAltar, triggerOnce: true);
            var fieldTraps   = SetupFieldTraps(cursedRoot);
            var darknessZone = SetupDarknessZone(cursedRoot);

            // ── Floor visual roots (NodeFieldVisualSwapper activates one at start) ─
            var floor0 = MakeRoot("FloorVisual_0_廃墟",          active: true);
            var floor1 = MakeRoot("FloorVisual_1_暗黒の森",       active: false);
            var floor2 = MakeRoot("FloorVisual_2_呪われた城",     active: false);
            var floor3 = MakeRoot("FloorVisual_3_古代遺跡の回廊", active: false);

            // ── PlayerSpawn ─────────────────────────────────────────────────
            var spawnGO = new GameObject("PlayerSpawn");
            spawnGO.transform.position = new Vector3(0f, -3f, 0f);

            // ── NodeFieldController ──────────────────────────────────────────
            var controllerGO = new GameObject("NodeFieldController");
            var controller   = controllerGO.AddComponent<NodeFieldController>();
            WireController(controller, exitRoot, eliteRoot, bossRoot,
                           restRoot, shopRoot, eventRoot_, treasureRoot, cursedRoot,
                           spawnGO.transform, lockedChest, fieldTraps, darknessZone);

            // ── NodeFieldVisualSwapper ───────────────────────────────────────
            var swapperGO = new GameObject("NodeFieldVisualSwapper");
            var swapper   = swapperGO.AddComponent<NodeFieldVisualSwapper>();
            WireVisualSwapper(swapper, floor0, floor1, floor2, floor3);

            // ── Save ────────────────────────────────────────────────────────
            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            Debug.Log("[NodeField] Scene created at " + ScenePath + ".\n" +
                      "Next steps:\n" +
                      "  1. Add a PlayerController prefab to the scene.\n" +
                      "  2. Assign WorldMapController reference on NodeFieldController.\n" +
                      "  3. Build out each FloorVisual root (tilemaps, parallax, lighting).\n" +
                      "  4. Add enemy/NPC prefabs to Elite/Boss/Rest/Shop/Event roots.");
        }

        // ── Scene validation ───────────────────────────────────────────────
        [MenuItem("DarkChronicle/Validate NodeField Scene", priority = 101)]
        public static void ValidateScene()
        {
            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
            if (scene.name != "NodeField")
            {
                Debug.LogWarning("[NodeField] Open the NodeField scene before validating.");
                return;
            }

            int errors = 0;
            errors += Check(FindFirst<NodeFieldController>() != null,
                "NodeFieldController found", "NodeFieldController MISSING");
            errors += Check(FindFirst<NodeFieldVisualSwapper>() != null,
                "NodeFieldVisualSwapper found", "NodeFieldVisualSwapper MISSING");
            errors += Check(FindFirst<Camera>() != null,
                "Camera found", "Camera MISSING");
            errors += Check(GameObject.Find("PlayerSpawn") != null,
                "PlayerSpawn found", "PlayerSpawn MISSING");
            errors += Check(GameObject.Find("ExitRoot") != null,
                "ExitRoot found", "ExitRoot MISSING — player cannot exit the field");
            errors += Check(GameObject.Find("TreasureRoot") != null,
                "TreasureRoot found", "TreasureRoot MISSING — Treasure nodes have no loot object");
            errors += Check(GameObject.Find("CursedRoomRoot") != null,
                "CursedRoomRoot found", "CursedRoomRoot MISSING — CursedRoom nodes have no altar");

            if (errors == 0) Debug.Log("[NodeField] Validation passed — scene looks good.");
            else             Debug.LogError($"[NodeField] {errors} issue(s) found. See warnings above.");
        }

        // ── Helpers ────────────────────────────────────────────────────────
        static GameObject MakeRoot(string name, bool active = false)
        {
            var go = new GameObject(name);
            go.SetActive(active);
            return go;
        }

        static void SetupExitTrigger(GameObject parent)
        {
            var go  = new GameObject("ExitTrigger");
            go.transform.SetParent(parent.transform);
            go.transform.localPosition = Vector3.zero;

            var col       = go.AddComponent<BoxCollider2D>();
            col.isTrigger = true;
            col.size      = new Vector2(3f, 1.5f);

            var et = go.AddComponent<EventTrigger>();
            var so = new SerializedObject(et);
            so.FindProperty("_triggerType") .enumValueIndex = EnumIndex<EventTrigger.TriggerType>("NodeExit");
            so.FindProperty("_autoTrigger") .boolValue      = true;
            so.FindProperty("_triggerOnce") .boolValue      = true;
            so.ApplyModifiedProperties();
        }

        static void SetupInteractTrigger(GameObject parent, string childName,
                                          EventTrigger.TriggerType type, bool triggerOnce)
        {
            var go  = new GameObject(childName);
            go.transform.SetParent(parent.transform);
            go.transform.localPosition = Vector3.zero;

            var col       = go.AddComponent<BoxCollider2D>();
            col.isTrigger = true;
            col.size      = new Vector2(1.5f, 1.5f);

            var et = go.AddComponent<EventTrigger>();
            var so = new SerializedObject(et);
            so.FindProperty("_triggerType").enumValueIndex = EnumIndex<EventTrigger.TriggerType>(type.ToString());
            so.FindProperty("_triggerOnce").boolValue      = triggerOnce;
            so.ApplyModifiedProperties();
        }

        static void WireController(NodeFieldController c,
            GameObject exit, GameObject elite, GameObject boss,
            GameObject rest, GameObject shop, GameObject ev,
            GameObject treasure, GameObject cursed, Transform spawn,
            LockedChest lockedChest, FieldTrap[] fieldTraps, DarknessZone darknessZone)
        {
            var so = new SerializedObject(c);
            so.FindProperty("_exitRoot")       .objectReferenceValue = exit;
            so.FindProperty("_eliteSpawnRoot") .objectReferenceValue = elite;
            so.FindProperty("_bossSpawnRoot")  .objectReferenceValue = boss;
            so.FindProperty("_restSiteRoot")   .objectReferenceValue = rest;
            so.FindProperty("_shopNPCRoot")    .objectReferenceValue = shop;
            so.FindProperty("_eventRoot")      .objectReferenceValue = ev;
            so.FindProperty("_treasureRoot")   .objectReferenceValue = treasure;
            so.FindProperty("_cursedRoomRoot") .objectReferenceValue = cursed;
            so.FindProperty("_playerSpawn")    .objectReferenceValue = spawn;
            so.FindProperty("_lockedChest")    .objectReferenceValue = lockedChest;
            so.FindProperty("_darknessZone")   .objectReferenceValue = darknessZone;

            var trapsP = so.FindProperty("_fieldTraps");
            trapsP.arraySize = fieldTraps.Length;
            for (int i = 0; i < fieldTraps.Length; i++)
                trapsP.GetArrayElementAtIndex(i).objectReferenceValue = fieldTraps[i];

            so.ApplyModifiedProperties();
        }

        static void WireVisualSwapper(NodeFieldVisualSwapper s,
            GameObject f0, GameObject f1, GameObject f2, GameObject f3)
        {
            var so    = new SerializedObject(s);
            var groups = so.FindProperty("_floorGroups");
            groups.arraySize = 4;
            SetGroup(groups.GetArrayElementAtIndex(0), "廃墟の回廊",      f0);
            SetGroup(groups.GetArrayElementAtIndex(1), "暗黒の森",        f1);
            SetGroup(groups.GetArrayElementAtIndex(2), "呪われた城",      f2);
            SetGroup(groups.GetArrayElementAtIndex(3), "古代遺跡の回廊", f3);
            so.ApplyModifiedProperties();
        }

        static void SetGroup(SerializedProperty p, string label, GameObject root)
        {
            p.FindPropertyRelative("FloorLabel").stringValue          = label;
            p.FindPropertyRelative("Root")      .objectReferenceValue = root;
        }

        // ── Ash フィールドギミック生成 ─────────────────────────────────────

        /// <summary>
        /// TreasureRoot の子に LockedChest を生成する。
        /// Ash がいる場合のみ有効化され、追加ルート（ExtraLootAtTreasure）を提供する。
        /// _lockedVisual・_chestTriggerGO の子はデザイナーがスプライトを追加すること。
        /// </summary>
        static LockedChest SetupLockedChest(GameObject parent)
        {
            var go = new GameObject("LockedChest");
            go.transform.SetParent(parent.transform);
            go.transform.localPosition = new Vector3(2f, 0f, 0f);

            // 施錠状態ビジュアル（プレースホルダ）
            var lockedVisualGO = new GameObject("LockedVisual");
            lockedVisualGO.transform.SetParent(go.transform, false);

            // 開錠後の宝箱トリガー（初期は無効）
            var triggerGO = new GameObject("ChestTrigger");
            triggerGO.transform.SetParent(go.transform, false);
            var triggerCol  = triggerGO.AddComponent<BoxCollider2D>();
            triggerCol.isTrigger = true;
            triggerCol.size      = new Vector2(1.5f, 1.5f);
            var et   = triggerGO.AddComponent<EventTrigger>();
            var etSO = new SerializedObject(et);
            etSO.FindProperty("_triggerType")     .enumValueIndex        = EnumIndex<EventTrigger.TriggerType>("TreasureChest");
            etSO.FindProperty("_triggerOnce")     .boolValue             = true;
            etSO.FindProperty("_hideAfterTrigger").boolValue             = true;
            etSO.ApplyModifiedProperties();
            triggerGO.SetActive(false);

            var chest   = go.AddComponent<LockedChest>();
            var chestSO = new SerializedObject(chest);
            chestSO.FindProperty("_lockedVisual")  .objectReferenceValue = lockedVisualGO;
            chestSO.FindProperty("_chestTriggerGO").objectReferenceValue = triggerGO;
            chestSO.ApplyModifiedProperties();
            EditorUtility.SetDirty(chest);
            return chest;
        }

        /// <summary>
        /// CursedRoomRoot の子に FieldTrap を 3 つ生成する。
        /// 各ビジュアル子GOはプレースホルダ——デザイナーがスプライトを追加すること。
        /// </summary>
        static FieldTrap[] SetupFieldTraps(GameObject parent)
        {
            var positions = new[]
            {
                new Vector3(-2f, -1f, 0f),
                new Vector3( 1f,  1.5f, 0f),
                new Vector3( 3f, -2f, 0f),
            };

            var traps = new FieldTrap[positions.Length];
            for (int i = 0; i < positions.Length; i++)
            {
                var go = new GameObject($"FieldTrap_{i + 1:00}");
                go.transform.SetParent(parent.transform);
                go.transform.localPosition = positions[i];

                var col      = go.AddComponent<BoxCollider2D>();
                col.isTrigger = true;
                col.size      = new Vector2(1f, 1f);

                var activeVisual = new GameObject("TrapActiveVisual");
                activeVisual.transform.SetParent(go.transform, false);

                var disarmedVisual = new GameObject("TrapDisarmedVisual");
                disarmedVisual.transform.SetParent(go.transform, false);
                disarmedVisual.SetActive(false);

                var detectedIndicator = new GameObject("DetectedIndicator");
                detectedIndicator.transform.SetParent(go.transform, false);
                detectedIndicator.SetActive(false);

                var trap   = go.AddComponent<FieldTrap>();
                var trapSO = new SerializedObject(trap);
                trapSO.FindProperty("_trapActiveVisual")  .objectReferenceValue = activeVisual;
                trapSO.FindProperty("_trapDisarmedVisual").objectReferenceValue = disarmedVisual;
                trapSO.FindProperty("_detectedIndicator") .objectReferenceValue = detectedIndicator;
                trapSO.ApplyModifiedProperties();
                EditorUtility.SetDirty(trap);
                traps[i] = trap;
            }
            return traps;
        }

        /// <summary>
        /// CursedRoomRoot の子に DarknessZone を生成する。
        /// ScreenSpaceOverlay キャンバス（sortingOrder=50）上に黒パネルを構築し、
        /// CanvasGroup を DarknessZone に配線する。
        /// </summary>
        static DarknessZone SetupDarknessZone(GameObject parent)
        {
            var go = new GameObject("DarknessZone");
            go.transform.SetParent(parent.transform);

            var canvas           = go.AddComponent<Canvas>();
            canvas.renderMode    = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder  = 50;

            var overlayGO = new GameObject("DarknessOverlay");
            overlayGO.transform.SetParent(go.transform, false);
            var rt        = overlayGO.AddComponent<RectTransform>();
            rt.anchorMin  = Vector2.zero;
            rt.anchorMax  = Vector2.one;
            rt.offsetMin  = rt.offsetMax = Vector2.zero;
            overlayGO.AddComponent<Image>().color = Color.black;
            var cg               = overlayGO.AddComponent<CanvasGroup>();
            cg.alpha             = 0f;
            cg.blocksRaycasts    = false;
            cg.interactable      = false;

            var zone   = go.AddComponent<DarknessZone>();
            var zoneSO = new SerializedObject(zone);
            zoneSO.FindProperty("_overlay").objectReferenceValue = cg;
            zoneSO.ApplyModifiedProperties();
            EditorUtility.SetDirty(zone);
            return zone;
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
            Debug.Log("[NodeField] Added to Build Settings: " + path);
        }

        static int EnumIndex<T>(string name) where T : System.Enum
            => System.Array.IndexOf(System.Enum.GetNames(typeof(T)), name);

        static T FindFirst<T>() where T : Object
            => Object.FindAnyObjectByType<T>();

        static int Check(bool ok, string pass, string fail)
        {
            if (ok) Debug.Log("[NodeField] ✓ " + pass);
            else    Debug.LogWarning("[NodeField] ✗ " + fail);
            return ok ? 0 : 1;
        }
    }
}
