namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 4 ボス群 設計定数
    //   エンディング分岐レリックによって 5 体から 1 体が選択される。
    //
    //   ① 魔王ヴァルナ＝マルアーク  (EndingType.DemonKing)
    //   ② 深淵神ウォルム            (EndingType.AbyssGod)
    //   ③ 時の亡霊エオン            (EndingType.TimeWraith)
    //   ④ 呪われた王アルドリック    (EndingType.CursedKing)
    //   ⑤ 世界の核（真の形態）      (EndingType.TrueCore)
    //
    //   対象プレイヤーレベル: Lv 14–18
    //   ※ ステータス値は EndingSystem.cs の CreateBoss() と同期させること。
    // ══════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────
    //   ① 魔王ヴァルナ＝マルアーク
    //   ActionsPerTurn=2 / HP≤50% Phase 2 / IsUndead=false
    // ─────────────────────────────────────────────────────────────────────
    /// <summary>奈落の玉座に君臨する魔王。連続行動とHP≤50%フェーズ変化が脅威。IsUndead=false。</summary>
    public static class DemonKingDesign
    {
        public const string EnemyName = "魔王ヴァルナ＝マルアーク";
        public const string Lore =
            "古代の戦争が終わった後も、魔王の意志だけは奈落の玉座に宿り続けた。" +
            "幾千年の時を経て、その意志はついに肉体を取り戻した。闇は消えない。";

        public const int MaxHP           = 4200;
        public const int PhysicalAttack  = 115;
        public const int MagicAttack     = 80;
        public const int PhysicalDefense = 52;
        public const int MagicDefense    = 40;
        public const int Speed           = 72;
        public const int ShieldPoints    = 4;
        public const bool IsUndead       = false;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 900;
        public const int JPReward   = 220;
        public const int GoldReward = 350;

        // ── Phase 1（常時） ────────────────────────────────────────
        public static class Action_DemonSwordStrike
        {
            public const string Name      = "魔剣の一撃";
            public const string Desc      = "魔王の力を宿した剣で一体を深く斬りつける。";
            public const float  Power     = 1.8f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 3;
        }

        public static class Action_BlackFlameBlast
        {
            public const string Name      = "黒炎爆裂";
            public const string Desc      = "奈落の黒炎を爆発させ全体を焼き払う。闇属性魔法全体ダメージを与える。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        public static class Action_AbyssBind
        {
            public const string Name         = "奈落の呪縛";
            public const string Desc         = "奈落の力で全体の動きを封じる。25%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.25f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_DemonAwe
        {
            public const string Name      = "魔王の威圧";
            public const string Desc      = "魔王のオーラで自身の攻撃力を高める。";
            public const float  UseChance = 0.20f;
            public const int    Priority  = 1;
        }

        // ── Phase 2（HP 50% 以下） ─────────────────────────────────
        public static class Action_DemonRelease
        {
            public const string Name            = "魔王解放";
            public const string Desc            = "封じていた魔王の真の力を解放し一体を壊滅させる。";
            public const float  Power           = 2.5f;
            public const float  UseChance       = 0.40f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 50;
        }

        public static class Action_SoulDestroyFlame
        {
            public const string Name            = "滅魂の黒炎";
            public const string Desc            = "魂を焼き尽くす黒炎で全体を焼き払う。闇属性魔法全体ダメージを与える。";
            public const float  Power           = 2.0f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 50;
        }

        public static class Action_AbyssJudgment
        {
            public const string Name            = "奈落の審判";
            public const string Desc            = "奈落の力で防御を無視した審判の一撃を叩き込む。";
            public const float  Power           = 4.38f; // TrueDmg ≈ 350 (Power × MagATK 80)
            public const float  UseChance       = 0.25f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 50;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //   ② 深淵神ウォルム
    //   ActionsPerTurn=2 / HP≤50% Phase 2 / IsUndead=false
    // ─────────────────────────────────────────────────────────────────────
    /// <summary>深淵に宿る神。高MagATKと自己回復。HP≤50%でフェーズ変化。IsUndead=false。</summary>
    public static class AbyssGodDesign
    {
        public const string EnemyName = "深淵神ウォルム";
        public const string Lore =
            "世界の底に眠る神殿は深淵そのものが意志を持ち建てたもの。" +
            "深淵神は崇拝者を求め口を開け続ける——見つめ返した者は、もはや引き返せない。";

        public const int MaxHP           = 4000;
        public const int PhysicalAttack  = 85;
        public const int MagicAttack     = 110;
        public const int PhysicalDefense = 30;
        public const int MagicDefense    = 60;
        public const int Speed           = 80;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 950;
        public const int JPReward   = 230;
        public const int GoldReward = 360;

        // ── Phase 1（常時） ────────────────────────────────────────
        public static class Action_AbyssGaze
        {
            public const string Name      = "深淵の視線";
            public const string Desc      = "深淵の瞳で一体を見据え、存在を侵食する。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.4f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        public static class Action_GodEyeWave
        {
            public const string Name      = "神の眼波動";
            public const string Desc      = "神の眼から放たれる波動で全体を侵食する。闇属性魔法全体ダメージを与える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        public static class Action_SilenceBless
        {
            public const string Name         = "沈黙の祝福";
            public const string Desc         = "深淵神の祝福が言葉を奪う。30%の確率で全体に沈黙を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_AbyssRegen
        {
            public const string Name       = "深淵再生";
            public const string Desc       = "深淵の力で傷を塞ぎ体力を大きく回復する。";
            public const float  UseChance  = 0.20f;
            public const int    Priority   = 0;
            public const int    HealAmount = 400;
        }

        // ── Phase 2（HP 50% 以下） ─────────────────────────────────
        public static class Action_GodAwakening
        {
            public const string Name            = "神の目覚め";
            public const string Desc            = "深淵神が真に目覚め、全体を深淵の光で焼き尽くす。闇属性魔法全体ダメージを与える。";
            public const float  Power           = 2.0f;
            public const float  UseChance       = 0.40f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 50;
        }

        public static class Action_AbyssSwallow
        {
            public const string Name            = "深淵の飲み込み";
            public const string Desc            = "深淵が口を開け存在ごと飲み込む。防御を無視した壊滅的なダメージを与える。";
            public const float  Power           = 3.64f; // TrueDmg ≈ 400 (Power × MagATK 110)
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 50;
        }

        public static class Action_ParalysisBaptism
        {
            public const string Name            = "麻痺の洗礼";
            public const string Desc            = "深淵神の洗礼で全体の動きを完全に封じる。30%の確率で麻痺を付与する。";
            public const float  StatusChance    = 0.30f;
            public const float  UseChance       = 0.25f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 50;
            public const bool   IsAbsorbable    = true;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //   ③ 時の亡霊エオン
    //   ActionsPerTurn=3 / HP≤50% Phase 2 / IsUndead=true
    // ─────────────────────────────────────────────────────────────────────
    /// <summary>時間の空白に縛られた最速の亡霊。ActionsPerTurn=3 で手数により圧迫。IsUndead=true。</summary>
    public static class TimeWraithDesign
    {
        public const string EnemyName = "時の亡霊エオン";
        public const string Lore =
            "時間の断層に挟まれた空間で過去と未来を同時に生きる亡霊。" +
            "時計の針が止まった場所で、解放か新たな生贄かを求めてさまよい続ける。";

        public const int MaxHP           = 3600;
        public const int PhysicalAttack  = 100;
        public const int MagicAttack     = 95;
        public const int PhysicalDefense = 45;
        public const int MagicDefense    = 50;
        public const int Speed           = 105;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = true;
        public const int ActionsPerTurn  = 3;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Sword

        public const int ExpReward  = 880;
        public const int JPReward   = 215;
        public const int GoldReward = 340;

        // ── Phase 1（常時） ────────────────────────────────────────
        public static class Action_TimeSword
        {
            public const string Name      = "時の斬撃";
            public const string Desc      = "時間を切り裂く一撃で一体を斬りつける。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        public static class Action_TimeStamp
        {
            public const string Name      = "時間の刻";
            public const string Desc      = "時の波動で全体を打ち据える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        public static class Action_TimeReversal
        {
            public const string Name         = "時間逆転";
            public const string Desc         = "時の流れを逆転させ全体を眠りに引き込む。20%の確率で睡眠を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_TimeShard
        {
            public const string Name      = "時の断片";
            public const string Desc      = "砕けた時の欠片を一体に叩きつける。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.20f;
            public const int    Priority  = 2;
        }

        // ── Phase 2（HP 50% 以下） ─────────────────────────────────
        public static class Action_TimeEnd
        {
            public const string Name            = "時の終焉";
            public const string Desc            = "時間の終わりを告げる波動で全体を消し去ろうとする。闇属性魔法全体ダメージを与える。";
            public const float  Power           = 1.8f;
            public const float  UseChance       = 0.40f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 50;
        }

        public static class Action_TimeCollapse
        {
            public const string Name            = "時間崩壊";
            public const string Desc            = "時間の構造ごと崩壊させる。防御を無視した時の衝撃を与える。";
            public const float  Power           = 3.68f; // TrueDmg ≈ 350 (Power × MagATK 95)
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 50;
        }

        public static class Action_EternalStop
        {
            public const string Name            = "永遠の停止";
            public const string Desc            = "時間を永遠に止め、全体の動きを完全に封じる。25%の確率で麻痺を付与する。";
            public const float  StatusChance    = 0.25f;
            public const float  UseChance       = 0.25f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 50;
            public const bool   IsAbsorbable    = true;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //   ④ 呪われた王アルドリック
    //   ActionsPerTurn=2 / HP≤50% Phase 2 / IsUndead=true
    // ─────────────────────────────────────────────────────────────────────
    /// <summary>呪縛の玉座間を守る王の亡霊。Shields=5 とシールド再生が特徴。IsUndead=true。</summary>
    public static class CursedKingDesign
    {
        public const string EnemyName = "呪われた王アルドリック";
        public const string Lore =
            "かつて栄光ある王国があった場所に今は呪いだけが残っている。" +
            "王は死んでいるが呪いは死なない——玉座は今も、主を待ち続けている。";

        public const int MaxHP           = 4200;
        public const int PhysicalAttack  = 120;
        public const int MagicAttack     = 90;
        public const int PhysicalDefense = 70;
        public const int MagicDefense    = 45;
        public const int Speed           = 65;
        public const int ShieldPoints    = 5;
        public const bool IsUndead       = true;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 920;
        public const int JPReward   = 225;
        public const int GoldReward = 355;

        // ── Phase 1（常時） ────────────────────────────────────────
        public static class Action_CursedSword
        {
            public const string Name      = "呪王の剣";
            public const string Desc      = "呪いを宿した王の剣で一体を深く斬りつける。";
            public const float  Power     = 1.8f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 3;
        }

        public static class Action_AncientCursePoison
        {
            public const string Name         = "古い呪い";
            public const string Desc         = "数百年積もった呪いを全体に解き放つ。30%の確率で毒を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
        }

        public static class Action_KingsGuard
        {
            public const string Name          = "王の護り";
            public const string Desc          = "呪いの力で盾を再建する。シールド+3。";
            public const float  UseChance     = 0.25f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 3;
        }

        public static class Action_GrudgeWave
        {
            public const string Name      = "怨念の波";
            public const string Desc      = "王の怨念を波動にして全体に叩きつける。闇属性魔法全体ダメージを与える。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.20f;
            public const int    Priority  = 2;
        }

        // ── Phase 2（HP 50% 以下） ─────────────────────────────────
        public static class Action_KingsFury
        {
            public const string Name            = "王の憤怒";
            public const string Desc            = "積もった怨念が爆発し全体を薙ぎ払う。";
            public const float  Power           = 2.2f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 50;
        }

        public static class Action_CurseRelease
        {
            public const string Name            = "呪縛の解放";
            public const string Desc            = "全ての呪いを解き放ち全体に出血を引き起こす。35%の確率で出血を付与する。";
            public const float  StatusChance    = 0.35f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 50;
            public const bool   IsAbsorbable    = true;
        }

        public static class Action_KingsJudgment
        {
            public const string Name            = "王の裁き";
            public const string Desc            = "王の最後の権限で防御を無視した一撃を下す。";
            public const float  Power           = 4.00f; // TrueDmg ≈ 360 (Power × MagATK 90)
            public const float  UseChance       = 0.30f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 50;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //   ⑤ 世界の核（真の形態）
    //   ActionsPerTurn=2 / 3 段階フェーズ変化 / IsUndead=false
    //   Rank: TrueFinalBoss
    // ─────────────────────────────────────────────────────────────────────
    /// <summary>全ての始まりと終わりの化身。3段階フェーズ変化が最大の脅威。IsUndead=false。Rank=TrueFinalBoss。</summary>
    public static class TrueCoreDesign
    {
        public const string EnemyName = "世界の核（真の形態）";
        public const string Lore =
            "世界の中心には核がある——全ての生命、全ての魔法、全ての時間の源泉。" +
            "真の姿を見た者は数少ない。見た者の多くは、戻ってこなかった。";

        public const int MaxHP           = 5000;
        public const int PhysicalAttack  = 130;
        public const int MagicAttack     = 115;
        public const int PhysicalDefense = 60;
        public const int MagicDefense    = 60;
        public const int Speed           = 100;
        public const int ShieldPoints    = 6;
        public const bool IsUndead       = false;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 1200;
        public const int JPReward   = 320;
        public const int GoldReward = 600;

        // ── Phase 1（常時、HP > 66%） ──────────────────────────────
        public static class Action_CoreRay
        {
            public const string Name      = "核光線";
            public const string Desc      = "世界の核から放たれる純粋な光線で一体を貫く。光属性魔法ダメージを与える。";
            public const float  Power     = 1.6f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        public static class Action_WorldWave
        {
            public const string Name      = "世界の波動";
            public const string Desc      = "世界の根源から溢れる波動で全体を侵食する。闇属性魔法全体ダメージを与える。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        public static class Action_ExistenceErosion
        {
            public const string Name         = "存在侵食";
            public const string Desc         = "存在そのものを侵食し全体の言葉を奪う。20%の確率で沈黙を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_CoreRegen
        {
            public const string Name       = "核の再生";
            public const string Desc       = "世界の根源エネルギーで傷を塞ぎ体力を大きく回復する。";
            public const float  UseChance  = 0.20f;
            public const int    Priority   = 0;
            public const int    HealAmount = 500;
        }

        // ── Phase 2（HP 66% 以下） ─────────────────────────────────
        public static class Action_WorldCollapse
        {
            public const string Name            = "世界崩壊";
            public const string Desc            = "世界の崩壊を体現した波動で全体を叩きつぶす。闇属性魔法全体ダメージを与える。";
            public const float  Power           = 1.8f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 66;
        }

        public static class Action_ExistenceDenial
        {
            public const string Name            = "実在否定";
            public const string Desc            = "実在を否定する力で全体の動きを封じる。25%の確率で麻痺を付与する。";
            public const float  StatusChance    = 0.25f;
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 66;
            public const bool   IsAbsorbable    = true;
        }

        public static class Action_CoreFission
        {
            public const string Name            = "核分裂の衝撃";
            public const string Desc            = "核が分裂し全体に防御を無視した衝撃波を放つ。";
            public const float  Power           = 3.04f; // TrueDmg ≈ 350 (Power × MagATK 115)
            public const float  UseChance       = 0.30f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 66;
        }

        // ── Phase 3（HP 33% 以下） ─────────────────────────────────
        public static class Action_EndLight
        {
            public const string Name            = "終焉の光";
            public const string Desc            = "終わりを告げる光で全体を完全に焼き尽くす。光属性魔法全体ダメージを与える。";
            public const float  Power           = 2.5f;
            public const float  UseChance       = 0.40f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 33;
        }

        public static class Action_WorldAnnihilation
        {
            public const string Name            = "世界消滅";
            public const string Desc            = "世界そのものを消し去る究極の一撃。防御を無視した滅びの衝撃を全体に与える。";
            public const float  Power           = 4.35f; // TrueDmg ≈ 500 (Power × MagATK 115)
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 33;
        }

        public static class Action_ExistenceDissolve
        {
            public const string Name            = "存在解体";
            public const string Desc            = "存在を解体し全体に出血を引き起こす。35%の確率で出血を付与する。";
            public const float  StatusChance    = 0.35f;
            public const float  UseChance       = 0.25f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 33;
            public const bool   IsAbsorbable    = true;
        }
    }
}
