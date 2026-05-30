namespace DarkChronicle.Core
{
    /// <summary>
    /// All Unity scene names used in the project.
    /// Add each scene to File → Build Settings in the same spelling as these constants.
    /// </summary>
    public static class SceneNames
    {
        // ── Main Menu ─────────────────────────────────────────────────────────
        /// <summary>
        /// タイトル画面。ゲーム起動時の最初のシーン。
        /// ここから「ニューゲーム」「再開」「メタ強化」などに遷移する。
        /// </summary>
        public const string MainMenu    = "MainMenu";

        // ── Roguelike ─────────────────────────────────────────────────────────
        /// <summary>
        /// ローグライクのメインシーン。RoguelikeManagerが常駐し、
        /// キャラクター選択→難易度選択→ノードマップ→各フロアをすべて内包する。
        /// ゲームクリア・ゲームオーバーのリザルトパネルもここに配置。
        /// </summary>
        public const string Roguelike   = "Roguelike";

        /// <summary>
        /// 探索フィールドシーン。ローグライクシーンにAdditiveでロードされる。
        /// NodeFieldControllerが起動し、ノードタイプに応じてオブジェクトを切り替える。
        /// 戦闘・休憩・ショップ・イベントは全てここで処理される。
        /// </summary>
        public const string NodeField   = "NodeField";

        // ── Meta Upgrade ──────────────────────────────────────────────────────
        /// <summary>
        /// メタ強化画面。メインメニューからのみアクセス可能。
        /// 碑文（メタ通貨）を消費してノード式の永続強化ツリーを操作する。
        /// MetaUpgradeUIControllerが管理する。
        /// </summary>
        public const string MetaUpgrade = "MetaUpgrade";

        // ── Legacy (non-roguelike) ────────────────────────────────────────────
        /// <summary>
        /// ゲームオーバーシーン（ローグライク以外のシステムがGameManagerを通じて使用）。
        /// ローグライクモードではRoguelikeシーン内のパネルで代替するため通常は使用しない。
        /// </summary>
        public const string GameOver    = "GameOver";
    }
}
