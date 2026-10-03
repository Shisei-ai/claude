using System.IO;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.UI;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// DarkChronicle → Add PhantomJoin Panel
    ///
    /// Opens the Roguelike scene and injects a PhantomJoinUI overlay panel, then wires
    /// it to the RoguelikeManager's _phantomJoinUI field.
    ///
    /// Run this once after the Roguelike scene already exists.
    /// Safe to run again — it removes any existing PhantomJoinPanel before rebuilding.
    /// </summary>
    public static class PhantomJoinPanelSetup
    {
        const string ScenePath = "Assets/Scenes/Roguelike.unity";

        [MenuItem("DarkChronicle/Add PhantomJoin Panel", priority = 104)]
        static void Run()
        {
            if (!File.Exists(ScenePath))
            {
                EditorUtility.DisplayDialog("PhantomJoinPanelSetup",
                    $"Scene not found at {ScenePath}.\n" +
                    "Open the Roguelike scene manually, then re-run this tool.",
                    "OK");
                return;
            }

            bool dirty = EditorSceneManager.GetActiveScene().isDirty;
            if (dirty && !EditorUtility.DisplayDialog("Unsaved changes",
                    "The current scene has unsaved changes. Continue and potentially lose them?",
                    "Continue", "Cancel"))
                return;

            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);

            // ── Find Canvas ────────────────────────────────────────────────
            var canvas = Object.FindAnyObjectByType<Canvas>();
            if (canvas == null)
            {
                Debug.LogError("[PhantomJoinPanelSetup] No Canvas found in the Roguelike scene.");
                return;
            }

            // Remove stale panel if present
            var existing = canvas.transform.Find("PhantomJoinPanel");
            if (existing != null) Object.DestroyImmediate(existing.gameObject);

            // ── Colour palette ─────────────────────────────────────────────
            var colBg     = new Color(0.05f, 0.03f, 0.10f, 0.93f);
            var colTitle  = new Color(0.93f, 0.88f, 0.78f);
            var colBody   = new Color(0.80f, 0.76f, 0.68f);
            var colAccept = new Color(0.20f, 0.36f, 0.58f);
            var colRefuse = new Color(0.48f, 0.22f, 0.20f);

            // ── Root panel ─────────────────────────────────────────────────
            var root   = CreateGO("PhantomJoinPanel", canvas.transform);
            var rootRT = root.AddComponent<RectTransform>();
            StretchFull(rootRT);
            var rootBg = root.AddComponent<Image>();
            rootBg.color = colBg;
            var rootCG = root.AddComponent<CanvasGroup>();
            rootCG.alpha          = 0f;
            rootCG.blocksRaycasts = false;

            // ── PhantomJoinUI component ────────────────────────────────────
            var ui = root.AddComponent<PhantomJoinUI>();

            // ── Title ──────────────────────────────────────────────────────
            var titleGO  = CreateGO("Title", root.transform);
            var titleRT  = titleGO.AddComponent<RectTransform>();
            titleRT.anchorMin = new Vector2(0.10f, 0.70f);
            titleRT.anchorMax = new Vector2(0.90f, 0.85f);
            titleRT.offsetMin = Vector2.zero;
            titleRT.offsetMax = Vector2.zero;
            var titleTMP = titleGO.AddComponent<TextMeshProUGUI>();
            titleTMP.text      = "幻影との邂逅";
            titleTMP.alignment = TextAlignmentOptions.Center;
            titleTMP.fontSize  = 32;
            titleTMP.color     = colTitle;

            // ── Body ───────────────────────────────────────────────────────
            var bodyGO  = CreateGO("Body", root.transform);
            var bodyRT  = bodyGO.AddComponent<RectTransform>();
            bodyRT.anchorMin = new Vector2(0.10f, 0.50f);
            bodyRT.anchorMax = new Vector2(0.90f, 0.68f);
            bodyRT.offsetMin = Vector2.zero;
            bodyRT.offsetMax = Vector2.zero;
            var bodyTMP = bodyGO.AddComponent<TextMeshProUGUI>();
            bodyTMP.text      = "奈落の霧の中から、二つの気配が近づいてくる。\nそれは旅の同行者となるのか、それとも拒むのか。";
            bodyTMP.alignment = TextAlignmentOptions.Center;
            bodyTMP.fontSize  = 20;
            bodyTMP.color     = colBody;

            // ── Portrait row ───────────────────────────────────────────────
            var rowGO  = CreateGO("PortraitRow", root.transform);
            var rowRT  = rowGO.AddComponent<RectTransform>();
            rowRT.anchorMin = new Vector2(0.15f, 0.30f);
            rowRT.anchorMax = new Vector2(0.85f, 0.48f);
            rowRT.offsetMin = Vector2.zero;
            rowRT.offsetMax = Vector2.zero;
            var hlg = rowGO.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing                = 20f;
            hlg.childAlignment         = TextAnchor.MiddleCenter;
            hlg.childForceExpandWidth  = false;
            hlg.childForceExpandHeight = false;

            // ── Accept button ──────────────────────────────────────────────
            var (acceptBtn, acceptLabel) = MakeButton(root.transform,
                new Vector2(0.15f, 0.10f), new Vector2(0.45f, 0.24f),
                colAccept, "幻影を受け入れる\n（仲間が加入）");

            // ── Refuse button ──────────────────────────────────────────────
            var (refuseBtn, refuseLabel) = MakeButton(root.transform,
                new Vector2(0.55f, 0.10f), new Vector2(0.85f, 0.24f),
                colRefuse, "拒み、力を求める\n（自分のレベル+2）");

            // ── Wire serialised fields via SerializedObject ────────────────
            var so = new SerializedObject(ui);
            so.FindProperty("_root")         .objectReferenceValue = rootCG;
            so.FindProperty("_titleText")    .objectReferenceValue = titleTMP;
            so.FindProperty("_bodyText")     .objectReferenceValue = bodyTMP;
            so.FindProperty("_portraitRow")  .objectReferenceValue = rowGO.transform;
            so.FindProperty("_acceptButton") .objectReferenceValue = acceptBtn;
            so.FindProperty("_acceptLabel")  .objectReferenceValue = acceptLabel;
            so.FindProperty("_refuseButton") .objectReferenceValue = refuseBtn;
            so.FindProperty("_refuseLabel")  .objectReferenceValue = refuseLabel;
            so.ApplyModifiedProperties();

            // ── Wire RoguelikeManager._phantomJoinUI ───────────────────────
            var mgr = Object.FindAnyObjectByType<Roguelike.RoguelikeManager>();
            if (mgr != null)
            {
                var mgrSO = new SerializedObject(mgr);
                mgrSO.FindProperty("_phantomJoinUI").objectReferenceValue = ui;
                mgrSO.ApplyModifiedProperties();
                EditorUtility.SetDirty(mgr);
                Debug.Log("[PhantomJoinPanelSetup] Wired PhantomJoinUI → RoguelikeManager.");
            }
            else
            {
                Debug.LogWarning("[PhantomJoinPanelSetup] RoguelikeManager not found — wire _phantomJoinUI manually.");
            }

            EditorUtility.SetDirty(root);
            EditorSceneManager.SaveScene(scene);
            Debug.Log("[PhantomJoinPanelSetup] Done. Roguelike scene saved.");
        }

        // ── Helpers ────────────────────────────────────────────────────────
        static GameObject CreateGO(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            return go;
        }

        static void StretchFull(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        static (Button btn, TextMeshProUGUI label) MakeButton(Transform parent,
            Vector2 anchorMin, Vector2 anchorMax, Color color, string text)
        {
            var go = CreateGO("Btn", parent);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;

            var img = go.AddComponent<Image>();
            img.color = color;
            var btn = go.AddComponent<Button>();

            var textGO = CreateGO("Label", go.transform);
            var textRT = textGO.AddComponent<RectTransform>();
            textRT.anchorMin = Vector2.zero;
            textRT.anchorMax = Vector2.one;
            textRT.offsetMin = new Vector2(8f, 4f);
            textRT.offsetMax = new Vector2(-8f, -4f);
            var tmp = textGO.AddComponent<TextMeshProUGUI>();
            tmp.text      = text;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.fontSize  = 18;
            tmp.color     = Color.white;

            return (btn, tmp);
        }
    }
}
