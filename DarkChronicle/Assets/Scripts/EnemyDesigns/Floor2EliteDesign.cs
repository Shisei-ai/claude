namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 2「呪われた城」 エリート敵 設計定数
    //
    //   Elite A (ソロ)   : 紅月の近衛騎士 ガレン
    //   Elite B (グループ): 呪いの魔女 フェルナ ＋ 呪縛の使い魔
    //   Elite C (ソロ)   : 呪われた伯爵の霊 ヴェルモン
    //
    //   対象プレイヤーレベル: Lv 8–10
    //   ギミック: 連続行動 ＋ 呪い・デバフ重ね ＋ シールド再生
    // ══════════════════════════════════════════════════════════════════════

    // ── Elite A: 紅月の近衛騎士 ガレン ────────────────────────────────────
    /// <summary>
    /// 血月の呪いを受けた王城の近衛騎士。1ターン2回行動し、
    /// シールドを再建し続ける手数型物理エリート。
    /// ActionsPerTurn = 2。弱点: Fire, Light / Axe。
    /// </summary>
    public static class GalenDesign
    {
        public const string EnemyName = "紅月の近衛騎士 ガレン";
        public const string Lore =
            "呪われた城が崩壊の始まりを迎えたとき、血月の光を浴びて不死となった近衛騎士。" +
            "王への忠誠だけが残り、侵入者を排除するために動き続ける。" +
            "その剣さばきは生前よりも鋭く、そして容赦がない。";

        public const int MaxHP           = 580;
        public const int PhysicalAttack  = 88;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 35;
        public const int MagicDefense    = 12;
        public const int Speed           = 35;
        public const int ShieldPoints    = 4;
        public const bool IsUndead       = true;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 200;
        public const int JPReward   = 55;
        public const int GoldReward = 80;

        // 呪剣斬: 単体物理 1.5倍
        public static class Action_CursedSlash
        {
            public const string Name      = "呪剣斬";
            public const string Desc      = "呪いを纏った剣で一体を鋭く斬り裂く。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.40f;
            public const int    Priority  = 2;
        }

        // 断罪の剣: 単体物理 1.8倍（重攻撃）
        public static class Action_JudgmentBlade
        {
            public const string Name      = "断罪の剣";
            public const string Desc      = "全力を込めた一撃で一体を断ち切る。";
            public const float  Power     = 1.8f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        // 血月の一掃: 全体物理 1.2倍
        public static class Action_BloodMoonSweep
        {
            public const string Name      = "血月の一掃";
            public const string Desc      = "血月の力を解放し、薙ぎ払いで全体を打ち据える。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.15f;
            public const int    Priority  = 2;
        }

        // 守護再建: シールド+2 再生（カスタム実装待ち）
        public static class Action_GuardRestore
        {
            public const string Name          = "守護再建";
            public const string Desc          = "呪われた鎧を補強し、守護の障壁を再構築する。シールド+2。";
            public const float  UseChance     = 0.20f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 2;
        }
    }

    // ── Elite B-1: 呪いの魔女 フェルナ ────────────────────────────────────
    /// <summary>
    /// 城に仕えた魔術師の亡霊。デバフを重ねる後衛型。
    /// 使い魔を強化しながら Blind・Paralysis を蓄積させる。
    /// ゼノは 呪いの一瞥・縛りの呪詛 を吸収可能。
    /// </summary>
    public static class FernaDesign
    {
        public const string EnemyName = "呪いの魔女 フェルナ";
        public const string Lore =
            "かつて城の魔術顧問として仕えた女性魔術師の亡霊。" +
            "死してなお呪いの研究を続け、訪れる者に呪縛を重ねて消耗させる。" +
            "使い魔との連携が真骨頂。";

        public const int MaxHP           = 300;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 50;
        public const int PhysicalDefense = 8;
        public const int MagicDefense    = 22;
        public const int Speed           = 28;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 100;
        public const int JPReward   = 32;
        public const int GoldReward = 50;

        // 呪いの一瞥: 単体 35% 暗闇（ゼノ吸収可能）
        public static class Action_CursedGaze
        {
            public const string Name         = "呪いの一瞥";
            public const string Desc         = "呪いの眼差しで一体を見据える。35%の確率で暗闇を付与する。";
            public const float  StatusChance = 0.35f;
            public const float  UseChance    = 0.28f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 腐敗の波: 単体闇魔法 1.1倍
        public static class Action_CorruptionWave
        {
            public const string Name      = "腐敗の波";
            public const string Desc      = "腐敗の魔力を一体に叩き込む。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.27f;
            public const int    Priority  = 2;
        }

        // 縛りの呪詛: 単体 30% 麻痺（ゼノ吸収可能）
        public static class Action_BindingCurse
        {
            public const string Name         = "縛りの呪詛";
            public const string Desc         = "呪縛の魔力で一体の動きを縛る。30%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 呪いの強化: 使い魔ATK+20% バフ（サポート・カスタム実装待ち）
        public static class Action_CurseEnhance
        {
            public const string Name      = "呪いの強化";
            public const string Desc      = "使い魔に呪いの力を注ぎ込み、攻撃力を高める。攻撃力+20%（2ターン）。";
            public const float  UseChance = 0.20f;
            public const int    Priority  = 3;
        }
    }

    // ── Elite B-2: 呪縛の使い魔 ───────────────────────────────────────────
    /// <summary>
    /// フェルナが従える呪術的な使い魔。素早く前衛に立ち回り Sleep を付与する。
    /// ゼノは 呪縛の叫び を吸収可能。
    /// </summary>
    public static class CursedFamiliarDesign
    {
        public const string EnemyName = "呪縛の使い魔";
        public const string Lore =
            "フェルナが生前から使役し続けてきた使い魔。" +
            "主の死後も呪いの契約で縛られ、戦い続けている。" +
            "爪と叫び声で相手を消耗させる前衛役。";

        public const int MaxHP           = 220;
        public const int PhysicalAttack  = 55;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 12;
        public const int MagicDefense    = 10;
        public const int Speed           = 38;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire, ElementType.Light

        public const int ExpReward  = 75;
        public const int JPReward   = 22;
        public const int GoldReward = 35;

        // 呪いの爪: 単体物理 1.5倍
        public static class Action_CursedClaw
        {
            public const string Name      = "呪いの爪";
            public const string Desc      = "呪いに染まった鋭い爪で一体を引き裂く。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.45f;
            public const int    Priority  = 2;
        }

        // 暗影噛み: 単体物理 1.3倍
        public static class Action_ShadowBite
        {
            public const string Name      = "暗影噛み";
            public const string Desc      = "影に潜り込みながら一体に噛みつく。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }

        // 呪縛の叫び: 単体 25% 睡眠（ゼノ吸収可能）
        public static class Action_BindingShriek
        {
            public const string Name         = "呪縛の叫び";
            public const string Desc         = "呪いを込めた甲高い叫びで一体を眠りに誘う。25%の確率で睡眠を付与する。";
            public const float  StatusChance = 0.25f;
            public const float  UseChance    = 0.20f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    // ── Elite C: 呪われた伯爵の霊 ヴェルモン ──────────────────────────────
    /// <summary>
    /// 呪われた城に縛られた貴族の怨霊。高い魔法防御とシールド再生が特徴。
    /// HP 40% 以下でフェーズ2に移行し、全体デバフ攻撃が解放される。
    /// ゼノは 血月の眼差し・絶望の呪縛・崩壊の咆哮 を吸収可能。
    /// </summary>
    public static class VelmonDesign
    {
        public const string EnemyName = "呪われた伯爵の霊 ヴェルモン";
        public const string Lore =
            "城の主であった伯爵の怨霊。呪いの連鎖に囚われ、" +
            "城から離れられなくなった。その怒りと嘆きが呪術となり、" +
            "訪れる者を絶望へと叩き落とす。";

        public const int MaxHP           = 500;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 62;
        public const int PhysicalDefense = 15;
        public const int MagicDefense    = 30;
        public const int Speed           = 25;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Staff

        public const int ExpReward  = 210;
        public const int JPReward   = 58;
        public const int GoldReward = 85;

        // ─── Phase 1 アクション（常時） ──────────────────────────────────

        // 呪縛の手: 単体闇魔法 1.2倍
        public static class Action_CursedHand
        {
            public const string Name      = "呪縛の手";
            public const string Desc      = "怨念を込めた手で一体を掴み、闇属性魔法ダメージを与える。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }

        // 血月の眼差し: 単体 30% 暗闇（ゼノ吸収可能）
        public static class Action_BloodMoonGaze
        {
            public const string Name         = "血月の眼差し";
            public const string Desc         = "血月に染まった眼で一体を見据える。30%の確率で暗闇を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.30f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 腐敗の息吹: 全体闇魔法 0.9倍
        public static class Action_CorruptBreath
        {
            public const string Name      = "腐敗の息吹";
            public const string Desc      = "腐敗した魔力を全体に吹き散らす。";
            public const float  Power     = 0.9f;
            public const float  UseChance = 0.20f;
            public const int    Priority  = 2;
        }

        // 呪いの鎧: シールド+1 再生（カスタム実装待ち）
        public static class Action_CurseArmor
        {
            public const string Name          = "呪いの鎧";
            public const string Desc          = "呪いの力で霊体の守護を再構築する。シールド+1。";
            public const float  UseChance     = 0.15f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 1;
        }

        // ─── Phase 2 アクション（HP 40% 以下で追加解放） ─────────────────

        // 絶望の呪縛: 全体 25% 麻痺（ゼノ吸収可能）
        public static class Action_DespairBind
        {
            public const string Name            = "絶望の呪縛";
            public const string Desc            = "絶望の呪いで全体の動きを縛る。25%の確率で全員に麻痺を付与する。";
            public const float  StatusChance    = 0.25f;
            public const float  UseChance       = 0.40f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 40;
            public const bool   IsAbsorbable    = true;
        }

        // 血の嵐: 全体闇魔法 1.5倍（強化版全体攻撃）
        public static class Action_BloodStorm
        {
            public const string Name            = "血の嵐";
            public const string Desc            = "血月の力を解放し、嵐となった呪血が全体を蹂躙する。";
            public const float  Power           = 1.5f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 40;
        }

        // 崩壊の咆哮: 全体 30% 睡眠（ゼノ吸収可能）
        public static class Action_CollapseRoar
        {
            public const string Name            = "崩壊の咆哮";
            public const string Desc            = "崩壊の怒りを咆哮に乗せ全体に放つ。30%の確率で全員に睡眠を付与する。";
            public const float  StatusChance    = 0.30f;
            public const float  UseChance       = 0.25f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 40;
            public const bool   IsAbsorbable    = true;
        }
    }
}
