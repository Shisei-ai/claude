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
        /// ここから「新しい旅を始める」「旅を続ける」「メタ強化」などに遷移する。
        /// </summary>
        public const string MainMenu    = "MainMenu";

        // ── Run Setup ────────────────────────────────────────────────────────
        /// <summary>
        /// ニューゲーム時の初期準備シーン。
        /// キャラクター・祝福・難易度を選択し、確定後に Roguelike シーンへ遷移する。
        /// </summary>
        public const string RunSetup    = "RunSetup";

        // ── Roguelike ─────────────────────────────────────────────────────────
        /// <summary>
        /// ゲームのメインシーン。RoguelikeManager が常駐し、
        /// ノードマップ→各フロアをすべて内包する。
        /// ゲームクリア・ゲームオーバーのリザルトパネルもここに配置。
        /// </summary>
        public const string Roguelike   = "Roguelike";

        /// <summary>
        /// 探索フィールドシーン。Roguelike シーンに Additive でロードされる。
        /// NodeFieldController が起動し、ノードタイプに応じてオブジェクトを切り替える。
        /// 戦闘・休憩・ショップ・イベントは全てここで処理される。
        /// </summary>
        public const string NodeField   = "NodeField";

        // ── Meta Upgrade ──────────────────────────────────────────────────────
        /// <summary>
        /// メタ強化画面。メインメニューからのみアクセス可能。
        /// 碑文（メタ通貨）を消費してノード式の永続強化ツリーを操作する。
        /// MetaUpgradeUIController が管理する。
        /// </summary>
        public const string MetaUpgrade = "MetaUpgrade";
    }
}
