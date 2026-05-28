namespace DarkChronicle.EnemyDesigns
{
    /// <summary>
    /// 千年の扉番 ヴァルゴット — Floor 3 ボス設計定数。
    ///
    /// ■ コンセプト
    ///   深淵への入口を封じるために古代文明が石と魔法で造った巨大守護構造体。
    ///   意志も感情もない。ただ「通すな」という命令だけが刻まれている。
    ///   分岐レリック非所持ルートにおける通常エンディングの最終障壁。
    ///   敗北時ナレーション:
    ///     「番人は崩れ落ちた。深淵の扉は——今、誰もいない。
    ///      あなたたちは生きて、帰る場所がある。それだけで、充分だ。」
    ///
    /// ■ バランス設計根拠
    ///   対象プレイヤーレベル: Lv 10（Lv 12 で余裕あり）
    ///   ダメージ式: RAW = ATK × power × crit × elemMult、DEALT = max(1, RAW − DEF)
    ///   主攻撃(石礫の打撃 1.8倍)でベルンハルト(Lv10 Pdef64)に約 89 ダメージ → 8ヒット
    ///   PhysDEF 30・MagDEF 15 で「魔法で崩す」を正解として明示
    ///
    /// ■ フェーズ構造
    ///   Phase 1 (HP 100%〜51%): 物理中心。シールド6枚。守護の構えでシールド再生。
    ///   Phase 2 (HP 50%以下) : 石肌に亀裂。闇魔法追加。崩壊カウントダウン開始。
    ///
    /// ■ 崩壊カウントダウン（カスタム実装が必要）
    ///   Phase 2 突入時 UI「崩壊カウント: 4」を表示。
    ///   ボスがターンを消費するたびに -1。
    ///   カウント = 0 で「深淵解放」を強制発動 → 全体 400 固定ダメージ。
    ///   その後カウントを 3 にリセット（2 回目以降は 3→0→3... とループ）。
    ///   暫定実装: VoidRelease を UseChance 0.20 の通常行動として登録。
    /// </summary>
    public static class ValgottDesign
    {
        // ── 基本情報 ──────────────────────────────────────────────────────
        public const string EnemyName = "千年の扉番 ヴァルゴット";
        public const string Lore      =
            "深淵の入口を守り続ける古代の番人。造られた目的のみで動き続け、" +
            "一切の意志を持たない。その石の体には千年の時が刻まれている。";

        // ── ステータス ────────────────────────────────────────────────────
        public const int MaxHP           = 2400;
        public const int PhysicalAttack  = 85;
        public const int MagicAttack     = 60;   // Phase 2 のみ使用
        public const int PhysicalDefense = 30;   // 低め → 物理攻撃も通る
        public const int MagicDefense    = 15;   // 弱点 → 魔法で崩すのが正解
        public const int Speed           = 42;   // 鈍重だが確実
        public const int ShieldPoints    = 6;    // Phase 1 で 6 枚、Phase 2 で +3 再生

        // ── 弱点 ──────────────────────────────────────────────────────────
        // ElementWeaknesses: Fire (石を熱する), Thunder (古い封印回路を乱す)
        // WeaponWeaknesses : Axe (石を割る)

        // ── 報酬 ──────────────────────────────────────────────────────────
        public const int ExpReward  = 550;
        public const int JPReward   = 150;
        public const int GoldReward = 200;
        // 分岐レリック非所持ルートの最終報酬 → レリックドロップ確定（FloorData 側で設定）

        // ═════════════════════════════════════════════════════════════════
        //   Phase 1 アクション定数（HealthThreshold = 0 → 常時有効）
        // ═════════════════════════════════════════════════════════════════

        // 石礫の打撃: 単体物理 1.8倍 — 主力攻撃
        public static class Action_BoulderStrike
        {
            public const string Name      = "石礫の打撃";
            public const string Desc      = "巨大な石塊で一体を打ち据える。";
            public const float  Power     = 1.8f;
            public const float  UseChance = 0.40f;
            public const int    Priority  = 2;
        }

        // 封印の圧: 全体物理 0.9倍 + 物防デバフ
        public static class Action_SealPressure
        {
            public const string Name      = "封印の圧";
            public const string Desc      = "封印の圧力を全体に放つ。物理防御-15%（2ターン）。";
            public const float  Power     = 0.9f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        // 石化の眼差し: 単体 麻痺 30% ← ゼノ吸収可能
        public static class Action_PetrifyingGaze
        {
            public const string Name         = "石化の眼差し";
            public const string Desc         = "古代の魔眼で一体を睨む。30%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.20f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;  // ゼノのグリモワールに記録可能
        }

        // 守護の構え: 自身シールド +2（シールド破壊後の自動再生想定）
        // ※ シールド付与ロジックはカスタム実装が必要。現状は SkillData に記録のみ。
        public static class Action_GuardianStance
        {
            public const string Name          = "守護の構え";
            public const string Desc          = "番人としての意志を固め、守護の障壁を再構築する。シールド+2。";
            public const float  UseChance     = 0.15f;
            public const int    Priority      = 3;    // 高優先: シールド破壊後に優先発動
            public const int    ShieldRestore = 2;    // 付与シールド数（カスタム実装参照）
        }

        // ═════════════════════════════════════════════════════════════════
        //   Phase 2 アクション定数（HealthThreshold = 50 → HP 50%以下で有効）
        // ═════════════════════════════════════════════════════════════════

        // 深淵の脈動: 全体闇魔法 0.95倍 + ランダムデバフ1種
        public static class Action_AbyssPulse
        {
            public const string Name            = "深淵の脈動";
            public const string Desc            = "亀裂から溢れる深淵の力が全体を揺さぶる。ランダムなデバフを1種付与する（2ターン）。";
            public const float  Power           = 0.95f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 50;
        }

        // 石化の眼差し＋: 全体 麻痺 25% ← ゼノ吸収可能（強化版）
        public static class Action_PetrifyingGazePlus
        {
            public const string Name            = "石化の眼差し＋";
            public const string Desc            = "覚醒した魔眼が全体を睨む。25%の確率で全員に麻痺を付与する。";
            public const float  StatusChance    = 0.25f;
            public const float  UseChance       = 0.20f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 50;
            public const bool   IsAbsorbable    = true;
        }

        // 深淵解放: 全体固定 400 ダメージ（DamageType.True で防御無視）
        // カウントダウン = 0 のとき強制発動。暫定は UseChance 0.20 で通常行動として登録。
        // BasePower は MagATK 60 で 400 固定になるよう逆算: 60 × 6.67 ≒ 400
        public static class Action_VoidRelease
        {
            public const string Name            = "深淵解放";
            public const string Desc            = "封印が崩壊し、深淵の純粋な力が全員に400の固定ダメージを与える。";
            public const float  Power           = 6.67f;   // × MagATK60 ≒ 400（True damage で防御無視）
            public const int    FixedDamage     = 400;     // 設計上の期待ダメージ（参照用）
            public const float  UseChance       = 0.20f;   // 暫定確率（カウントダウン実装後に上書き）
            public const int    Priority        = 3;
            public const int    HealthThreshold = 50;
        }
    }
}
