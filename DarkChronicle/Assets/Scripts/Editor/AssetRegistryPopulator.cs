#if UNITY_EDITOR
using System.Linq;
using UnityEditor;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Roguelike;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// Assets/Data 以下を走査して AssetRegistry の各リストを自動入力する EditorWindow。
    /// SOジェネレーターで新しいアセットを生成した後に使うことで、
    /// インスペクタへの手動ドラッグを不要にする。
    ///
    /// Menu: DarkChronicle → Asset Registry → Populate Window
    /// </summary>
    public class AssetRegistryPopulator : EditorWindow
    {
        [MenuItem("DarkChronicle/Asset Registry/Populate Window を開く", priority = 100)]
        public static void Open() =>
            GetWindow<AssetRegistryPopulator>("AssetRegistry Populator");

        // ── State ──────────────────────────────────────────────────────────
        AssetRegistry _target;

        int _skillCount, _charCount, _relicCount, _itemCount, _equipCount;
        bool _scanned;

        static readonly string ScanRoot = "Assets/Data";

        // ── GUI ────────────────────────────────────────────────────────────
        void OnGUI()
        {
            EditorGUILayout.Space(6);
            GUILayout.Label("AssetRegistry 自動入力ツール", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(
                "SOジェネレーターで生成したアセットを AssetRegistry に一括登録します。\n" +
                "対象の AssetRegistry コンポーネントをシーンからドラッグしてください。",
                MessageType.Info);
            EditorGUILayout.Space(6);

            _target = (AssetRegistry)EditorGUILayout.ObjectField(
                "AssetRegistry", _target, typeof(AssetRegistry), true);

            EditorGUILayout.Space(4);

            if (GUILayout.Button("Assets/Data を走査してプレビュー", GUILayout.Height(28)))
                Scan();

            if (_scanned)
            {
                EditorGUILayout.Space(6);
                using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
                {
                    GUILayout.Label("発見済みアセット数", EditorStyles.boldLabel);
                    EditorGUILayout.LabelField("SkillData",     _skillCount.ToString());
                    EditorGUILayout.LabelField("CharacterData", _charCount.ToString());
                    EditorGUILayout.LabelField("RelicData",     _relicCount.ToString());
                    EditorGUILayout.LabelField("ItemData",      _itemCount.ToString());
                    EditorGUILayout.LabelField("EquipmentData", _equipCount.ToString());
                }

                EditorGUILayout.Space(6);

                using (new EditorGUI.DisabledScope(_target == null))
                {
                    if (GUILayout.Button("AssetRegistry に一括登録", GUILayout.Height(36)))
                        Populate();
                }

                if (_target == null)
                    EditorGUILayout.HelpBox(
                        "AssetRegistry オブジェクトをシーンからドラッグしてください。",
                        MessageType.Warning);
            }
        }

        // ── Scan ───────────────────────────────────────────────────────────
        void Scan()
        {
            _skillCount = AssetDatabase.FindAssets("t:SkillData",      new[] { ScanRoot }).Length;
            _charCount  = AssetDatabase.FindAssets("t:CharacterData",  new[] { ScanRoot }).Length;
            _relicCount = AssetDatabase.FindAssets("t:RelicData",      new[] { ScanRoot }).Length;
            _itemCount  = AssetDatabase.FindAssets("t:ItemData",       new[] { ScanRoot }).Length;
            _equipCount = AssetDatabase.FindAssets("t:EquipmentData",  new[] { ScanRoot }).Length;
            _scanned    = true;
            Repaint();
        }

        // ── Populate ───────────────────────────────────────────────────────
        void Populate()
        {
            if (_target == null) return;

            Undo.RecordObject(_target, "AssetRegistry Auto-Populate");
            var so = new SerializedObject(_target);

            int total = 0;
            total += PopulateList(so, "_allSkills",    "t:SkillData");
            total += PopulateList(so, "_characters",   "t:CharacterData");
            total += PopulateList(so, "_allRelics",    "t:RelicData");
            total += PopulateList(so, "_allItems",     "t:ItemData");
            total += PopulateList(so, "_allEquipment", "t:EquipmentData");

            so.ApplyModifiedProperties();
            EditorUtility.SetDirty(_target);
            AssetDatabase.SaveAssets();

            Scan();
            Debug.Log($"[AssetRegistryPopulator] AssetRegistry を更新しました。登録アセット合計: {total} 件。");
            EditorUtility.DisplayDialog(
                "登録完了",
                $"AssetRegistry に合計 {total} 件のアセットを登録しました。",
                "OK");
        }

        /// <summary>
        /// 指定フィルタで Assets/Data を検索し、SerializedProperty のリストに上書き代入する。
        /// </summary>
        static int PopulateList(SerializedObject so, string fieldName, string filter)
        {
            var prop = so.FindProperty(fieldName);
            if (prop == null)
            {
                Debug.LogWarning($"[AssetRegistryPopulator] フィールド '{fieldName}' が見つかりません。");
                return 0;
            }

            var guids = AssetDatabase.FindAssets(filter, new[] { ScanRoot });
            var paths = guids
                .Select(g => AssetDatabase.GUIDToAssetPath(g))
                .OrderBy(p => p)
                .ToArray();

            prop.ClearArray();
            for (int i = 0; i < paths.Length; i++)
            {
                var asset = AssetDatabase.LoadMainAssetAtPath(paths[i]);
                if (asset == null) continue;
                prop.InsertArrayElementAtIndex(i);
                prop.GetArrayElementAtIndex(i).objectReferenceValue = asset;
            }

            return paths.Length;
        }
    }
}
#endif
