namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 4「混沌の終末域」 エリート敵 設計定数
    //
    //   エリートエンカウンター（3 種）:
    //   E1: 虚無の化身「グナウス」× 1          (Solo)
    //   E2: 混沌の預言者「セルゴン」× 1
    //       + 深淵の騎士 × 1                   (Group)
    //   E3: 終末の顕現「ヴォイダル」× 1         (Solo)
    //
    //   対象プレイヤーレベル: Lv 14–18
    //   ギミック: 連続行動, 全体デバフ連打, HP回復・自己強化, フェーズ変化
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>虚無の力が具現化した化身。ActionsPerTurn=2 と自己回復で押し続ける。IsUndead=false。</summary>
    public static class GnausDesign
    {
        public const string EnemyName = "虚無の化身「グナウス」";
        public const string Lore =
            "「世界」の深淵から溢れ出た虚無の力が巨大な肉体を持つ化身として顕現した存在。" +
            "二つの拳を交互に叩きつけながら戦場を支配し、消耗すると虚無の力で傷を塞ぐ。";

        public const int MaxHP           = 680;
        public const int PhysicalAttack  = 98;
        public const int MagicAttack     = 30;
        public const int PhysicalDefense = 45;
        public const int MagicDefense    = 25;
        public const int Speed           = 18;
        public const int ShieldPoints    = 4;
        public const bool IsUndead       = false;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Light, ElementType.Lightning / WeaponType.Axe

        public const int ExpReward  = 180;
        public const int JPReward   = 45;
        public const int GoldReward = 110;

        public static class Action_VoidTread
        {
            public const string Name      = "虚無の踏圧";
            public const string Desc      = "虚無の力を纏った足で一体を踏みつぶす。";
            public const float  Power     = 1.6f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 3;
        }

        public static class Action_CollapseGauntlet
        {
            public const string Name      = "崩壊の剛拳";
            public const string Desc      = "崩壊のエネルギーを込めた拳で一体を強打する。";
            public const float  Power     = 2.0f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        public static class Action_DoomSwing
        {
            public const string Name      = "終末の薙ぎ";
            public const string Desc      = "巨腕を大きく振り払い全体を薙ぎ倒す。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.20f;
            public const int    Priority  = 2;
        }

        public static class Action_ChaosRegen
        {
            public const string Name       = "混沌の再生";
            public const string Desc       = "虚無の力で傷を塞ぎ体力を回復する。";
            public const float  UseChance  = 0.25f;
            public const int    Priority   = 1;
            public const int    HealAmount = 250;
        }
    }

    /// <summary>混沌の力を操る預言者。全体デバフ連打と癒しでパーティを支配する。IsUndead=false。</summary>
    public static class SergonDesign
    {
        public const string EnemyName = "混沌の預言者「セルゴン」";
        public const string Lore =
            "混沌の終末域に立ち、世界の崩壊を高らかに謳い上げる預言者。" +
            "全体に沈黙と麻痺を撒き散らし、深淵の騎士を癒しながら戦況を支配する。";

        public const int MaxHP           = 360;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 72;
        public const int PhysicalDefense = 12;
        public const int MagicDefense    = 30;
        public const int Speed           = 35;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Light, ElementType.Fire / WeaponType.Tome

        public const int ExpReward  = 140;
        public const int JPReward   = 38;
        public const int GoldReward = 90;

        public static class Action_DoomCurse
        {
            public const string Name      = "終末の呪詛";
            public const string Desc      = "終末の呪詛を全体に叩きつける。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        public static class Action_SilenceStorm
        {
            public const string Name         = "沈黙の嵐";
            public const string Desc         = "言葉を奪う混沌の嵐を全体に解き放つ。30%の確率で沈黙を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_ParalysisWave
        {
            public const string Name         = "麻痺の波動";
            public const string Desc         = "終末の波動で全体の動きを封じる。25%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.25f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_ChaosHeal
        {
            public const string Name         = "混沌の癒し";
            public const string Desc         = "混沌のエネルギーで自身の傷を癒す。";
            public const float  UseChance    = 0.20f;
            public const int    Priority     = 0;
            public const int    HealAmount   = 200;
            public const bool   IsAbsorbable = true;
        }
    }

    /// <summary>セルゴンの護衛を担う深淵の重騎士。高ATKとシールド3枚で前線を維持する。IsUndead=false。</summary>
    public static class AbyssKnightDesign
    {
        public const string EnemyName = "深淵の騎士";
        public const string Lore =
            "混沌の終末域を守護するために深淵から召喚された重騎士。" +
            "混沌の力を宿した巨大な剣で侵入者を薙ぎ払い、セルゴンの傍を離れない。";

        public const int MaxHP           = 500;
        public const int PhysicalAttack  = 88;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 38;
        public const int MagicDefense    = 22;
        public const int Speed           = 16;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Light, ElementType.Lightning / WeaponType.Sword

        public const int ExpReward  = 160;
        public const int JPReward   = 42;
        public const int GoldReward = 100;

        public static class Action_AbyssSlash
        {
            public const string Name      = "深淵の斬撃";
            public const string Desc      = "深淵の力を帯びた巨大な剣で一体を斬りつける。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_ChaosGuard
        {
            public const string Name          = "混沌の護り";
            public const string Desc          = "混沌の力で盾を強化する。シールド+2。";
            public const float  UseChance     = 0.40f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 2;
        }
    }

    /// <summary>終末そのものが顕現した最終エリート。ActionsPerTurn=2 と HP≤40%フェーズ変化が最大の脅威。IsUndead=false。</summary>
    public static class VoidalDesign
    {
        public const string EnemyName = "終末の顕現「ヴォイダル」";
        public const string Lore =
            "「世界」の終末を具現化した究極の化身。その存在自体が現実を侵食する。" +
            "追い詰められると真の姿を解放し、あらゆる抵抗を無意味にする破滅の力を解き放つ。";

        public const int MaxHP           = 780;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 90;
        public const int PhysicalDefense = 18;
        public const int MagicDefense    = 38;
        public const int Speed           = 26;
        public const int ShieldPoints    = 5;
        public const bool IsUndead       = false;
        public const int ActionsPerTurn  = 2;

        // Weakness: ElementType.Light, ElementType.Fire / WeaponType.Tome

        public const int ExpReward  = 220;
        public const int JPReward   = 55;
        public const int GoldReward = 140;

        // ── Phase 1（常時） ────────────────────────────────────────
        public static class Action_VoidClaw
        {
            public const string Name      = "虚無の爪";
            public const string Desc      = "虚無の力を凝縮した爪で一体に深い傷を刻む。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }

        public static class Action_ChaosWhisper
        {
            public const string Name         = "混沌の囁き";
            public const string Desc         = "混沌の声で一体の言葉を奪う。35%の確率で沈黙を付与する。";
            public const float  StatusChance = 0.35f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        public static class Action_DoomRegen
        {
            public const string Name       = "終末の再生";
            public const string Desc       = "終末のエネルギーで傷を急速に塞ぐ。";
            public const float  UseChance  = 0.25f;
            public const int    Priority   = 1;
            public const int    HealAmount = 300;
        }

        public static class Action_CollapseWave
        {
            public const string Name      = "崩壊の波動";
            public const string Desc      = "現実を崩壊させる波動を全体に放つ。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.15f;
            public const int    Priority  = 2;
        }

        // ── Phase 2（HP 40% 以下） ─────────────────────────────────
        public static class Action_DespairManifestation
        {
            public const string Name            = "絶望の顕現";
            public const string Desc            = "真の姿が解放され、絶望の光で全体を焼き尽くす。闇属性魔法全体ダメージを与える。";
            public const float  Power           = 1.8f;
            public const float  UseChance       = 0.40f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 40;
        }

        public static class Action_VoidRelease
        {
            public const string Name            = "虚無解放";
            public const string Desc            = "蓄積した虚無の力を一気に解放する。防御を無視した壊滅的なダメージを与える。";
            public const float  Power           = 3.56f; // TrueDmg ≈ 320 (Power × MagATK 90)
            public const float  UseChance       = 0.35f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 40;
        }

        public static class Action_ChaosExplosion
        {
            public const string Name            = "混沌の爆発";
            public const string Desc            = "混沌のエネルギーが爆発し全体に出血を引き起こす。35%の確率で出血を付与する。";
            public const float  StatusChance    = 0.35f;
            public const float  UseChance       = 0.25f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 40;
            public const bool   IsAbsorbable    = true;
        }
    }
}
