#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace DarkChronicle.Editor
{
    /// <summary>
    /// 全 ScriptableObject アセットを一括生成するマスターコマンド。
    /// Menu: DarkChronicle → Generate → ★ ALL ASSETS
    ///
    /// 各ジェネレーターをプログレスバー付きで順番に実行し、
    /// 完了後に SOGenUtils.ValidateAllGeneratedAssets() で問題を自動検出する。
    /// </summary>
    public static class MasterSOGenerator
    {
        // ── 全アセット一括生成 ─────────────────────────────────────────────

        [MenuItem("DarkChronicle/Generate/★ ALL ASSETS （全アセット一括生成）", priority = 1)]
        public static void GenerateAll()
        {
            var steps = new (string label, Action action)[]
            {
                // ── キャラクター ──────────────────────────────────────────
                ("キャラクター: ベルンハルト",           BernhardSOGenerator.GenerateAll),
                ("キャラクター: ゼノ",                   ZenoSOGenerator.GenerateAll),
                ("キャラクター: アッシュ",               AshSOGenerator.GenerateAll),
                ("キャラクター: ラヴィニア",             LaviniaSOGenerator.GenerateAll),
                ("キャラクター: リリア",                 LiliaSOGenerator.GenerateAll),

                // ── Floor 0 廃墟の回廊 ────────────────────────────────────
                ("Floor 0 通常敵（廃墟の回廊）",         Floor0NormalSOGenerator.GenerateAll),
                ("Floor 0 精鋭敵（廃墟の回廊）",         Floor0EliteSOGenerator.GenerateAll),

                // ── Floor 1 暗黒の森 ──────────────────────────────────────
                ("Floor 1 通常敵（暗黒の森）",           Floor1NormalSOGenerator.GenerateAll),
                ("Floor 1 精鋭敵（暗黒の森）",           Floor1EliteSOGenerator.GenerateAll),

                // ── Floor 2 呪われた城 ────────────────────────────────────
                ("Floor 2 通常敵（呪われた城）",         Floor2NormalSOGenerator.GenerateAll),
                ("Floor 2 精鋭敵（呪われた城）",         Floor2EliteSOGenerator.GenerateAll),

                // ── Floor 3 古代遺跡の回廊 ───────────────────────────────
                ("Floor 3 通常敵（古代遺跡の回廊）",     Floor3NormalSOGenerator.GenerateAll),
                ("Floor 3 精鋭敵（古代遺跡の回廊）",     Floor3EliteSOGenerator.GenerateAll),
                ("Floor 3 ボス（千年の扉番 ヴァルゴット）", ValgottSOGenerator.GenerateAll),

                // ── Floor 4 混沌の終末域 ─────────────────────────────────
                ("Floor 4 通常敵（混沌の終末域）",       Floor4NormalSOGenerator.GenerateAll),
                ("Floor 4 精鋭敵（混沌の終末域）",       Floor4EliteSOGenerator.GenerateAll),
                ("Floor 4 エンディングボス群（5体）",    Floor4BossSOGenerator.GenerateAll),
            };

            var errors = new List<(string label, Exception ex)>();

            try
            {
                for (int i = 0; i < steps.Length; i++)
                {
                    float progress = (float)i / steps.Length;
                    bool  cancel   = EditorUtility.DisplayCancelableProgressBar(
                        "DarkChronicle: 全アセット生成中",
                        $"[{i + 1}/{steps.Length}] {steps[i].label}",
                        progress);

                    if (cancel)
                    {
                        Debug.LogWarning("[MasterSOGenerator] ユーザーによってキャンセルされました。");
                        break;
                    }

                    try
                    {
                        steps[i].action();
                    }
                    catch (Exception ex)
                    {
                        errors.Add((steps[i].label, ex));
                        Debug.LogError($"[MasterSOGenerator] 失敗: {steps[i].label}\n{ex}");
                    }
                }
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // ── バリデーション実行 ──────────────────────────────────────────
            var issues   = SOGenUtils.ValidateAllGeneratedAssets();
            int errCount = issues.FindAll(x => x.IsError).Count;
            int wrnCount = issues.Count - errCount;

            foreach (var issue in issues)
            {
                if (issue.IsError) Debug.LogError($"[ValidateAssets] {issue.AssetPath}: {issue.Issue}");
                else               Debug.LogWarning($"[ValidateAssets] {issue.AssetPath}: {issue.Issue}");
            }

            // ── 結果ダイアログ ──────────────────────────────────────────────
            string genStatus = errors.Count == 0
                ? "全ジェネレーター正常完了"
                : $"生成エラー {errors.Count} 件（Console 参照）";

            string valStatus = issues.Count == 0
                ? "バリデーション問題なし ✓"
                : $"エラー {errCount} 件 / 警告 {wrnCount} 件（Console 参照）";

            EditorUtility.DisplayDialog(
                "全アセット生成 完了",
                $"生成: {genStatus}\n検証: {valStatus}",
                "OK");
        }

        // ── バリデーションのみ実行 ───────────────────────────────────────────

        [MenuItem("DarkChronicle/Generate/▶ バリデーション（生成済みアセット検証）", priority = 50)]
        public static void ValidateOnly()
        {
            var issues   = SOGenUtils.ValidateAllGeneratedAssets();
            int errCount = issues.FindAll(x => x.IsError).Count;
            int wrnCount = issues.Count - errCount;

            foreach (var issue in issues)
            {
                if (issue.IsError) Debug.LogError($"[ValidateAssets] {issue.AssetPath}: {issue.Issue}");
                else               Debug.LogWarning($"[ValidateAssets] {issue.AssetPath}: {issue.Issue}");
            }

            if (issues.Count == 0)
            {
                Debug.Log("[ValidateAssets] ✓ 問題なし");
                EditorUtility.DisplayDialog("バリデーション完了", "生成済みアセットに問題は見つかりませんでした。", "OK");
            }
            else
            {
                EditorUtility.DisplayDialog(
                    "バリデーション結果",
                    $"エラー: {errCount} 件\n警告: {wrnCount} 件\nConsole で詳細を確認してください。",
                    "OK");
            }
        }
    }
}
#endif
