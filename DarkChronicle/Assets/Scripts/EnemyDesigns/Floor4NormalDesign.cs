namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 4「混沌の終末域」 通常敵 設計定数
    //
    //   ① 終末の騎士
    //   ② 混沌の爪獣
    //   ③ 虚無の霊体
    //   ④ 崩壊の巨人
    //
    //   対象プレイヤーレベル: Lv 14–18
    //   複雑さ: シンプル（アクション 2 種）
    //
    //   エンカウンターグループ（5 種）:
    //   G1: 終末の騎士 × 1                        (Weight 1.2)
    //   G2: 終末の騎士 × 2                        (Weight 1.0)
    //   G3: 混沌の爪獣 × 1 + 終末の騎士 × 1       (Weight 0.9)
    //   G4: 虚無の霊体 × 2 + 混沌の爪獣 × 1       (Weight 0.8)
    //   G5: 崩壊の巨人 × 1                        (Weight 0.7)
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>混沌に侵食された重装甲の戦士。シールド2枚と盾構えで粘る基本型。IsUndead=false。</summary>
    public static class ApocalypseKnightDesign
    {
        public const string EnemyName = "終末の騎士";
        public const string Lore =
            "混沌の力に侵食された重装甲の戦士。かつては秩序の守護者だったが、" +
            "終末の波動に呑まれ意志を失った。混沌のエネルギーを帯びた剣で侵入者を斬り裂く。";

        public const int MaxHP           = 280;
        public const int PhysicalAttack  = 78;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 32;
        public const int MagicDefense    = 18;
        public const int Speed           = 16;
        public const int ShieldPoints    = 2;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Light, ElementType.Fire / WeaponType.Axe

        public const int ExpReward  = 68;
        public const int JPReward   = 18;
        public const int GoldReward = 44;

        public static class Action_DoomswordStrike
        {
            public const string Name      = "終末の剣撃";
            public const string Desc      = "混沌を帯びた剣で一体を斬りつける。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_ChaosGuard
        {
            public const string Name          = "混沌の盾構え";
            public const string Desc          = "混沌のエネルギーで盾を強化する。シールド+1。";
            public const float  UseChance     = 0.35f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 1;
        }
    }

    /// <summary>混沌の力で変異した大型の獣。高速で出血を付与する。IsUndead=false。</summary>
    public static class ChaosBeastDesign
    {
        public const string EnemyName = "混沌の爪獣";
        public const string Lore =
            "終末の混沌に曝され続けた野生の獣が変異した姿。全身から溢れる混沌の爪は" +
            "触れた者の傷口を広げ、止まらぬ出血を引き起こす。";

        public const int MaxHP           = 200;
        public const int PhysicalAttack  = 72;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 18;
        public const int MagicDefense    = 14;
        public const int Speed           = 44;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Ice, ElementType.Lightning / WeaponType.Sword

        public const int ExpReward  = 62;
        public const int JPReward   = 16;
        public const int GoldReward = 40;

        public static class Action_ChaosClaw
        {
            public const string Name      = "混沌の爪";
            public const string Desc      = "混沌の力を帯びた鋭い爪で一体を引っかく。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_LacerateTear
        {
            public const string Name         = "裂傷の引き裂き";
            public const string Desc         = "傷口を広げるように一体を引き裂く。30%の確率で出血を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
        }
    }

    /// <summary>終末の虚無から生まれた霊体。闇魔法と沈黙付与。ゼノ吸収可能。IsUndead=true。</summary>
    public static class VoidSpecterDesign
    {
        public const string EnemyName = "虚無の霊体";
        public const string Lore =
            "混沌の終末域に満ちる虚無のエネルギーが凝集して生まれた霊体。" +
            "言葉を奪う囁きで魔術師の力を封じ、虚無の波動で精神を侵食する。";

        public const int MaxHP           = 200;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 65;
        public const int PhysicalDefense = 10;
        public const int MagicDefense    = 28;
        public const int Speed           = 30;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 72;
        public const int JPReward   = 20;
        public const int GoldReward = 48;

        public static class Action_VoidWave
        {
            public const string Name      = "虚無の波動";
            public const string Desc      = "虚無のエネルギーを波動にして一体に叩きつける。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_ChaosWhisper
        {
            public const string Name         = "混沌の囁き";
            public const string Desc         = "混沌の声で一体の言葉を奪う。25%の確率で沈黙を付与する。";
            public const float  StatusChance = 0.25f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    /// <summary>混沌に呑まれた巨大な戦争兵器の残骸。高HPとシールド3枚、全体攻撃が脅威。IsUndead=false。</summary>
    public static class CollapseGiantDesign
    {
        public const string EnemyName = "崩壊の巨人";
        public const string Lore =
            "終末の混沌に呑まれ暴走を続ける巨大な戦争兵器の成れの果て。" +
            "分厚い装甲と圧倒的な膂力で全てを踏み荒らす。混沌のエネルギーで崩壊しながらも止まらない。";

        public const int MaxHP           = 380;
        public const int PhysicalAttack  = 88;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 40;
        public const int MagicDefense    = 20;
        public const int Speed           = 8;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Lightning, ElementType.Wind / WeaponType.Axe

        public const int ExpReward  = 95;
        public const int JPReward   = 25;
        public const int GoldReward = 62;

        public static class Action_CollapseFist
        {
            public const string Name      = "崩壊の拳";
            public const string Desc      = "全体重を乗せた巨大な拳で一体を叩き潰す。";
            public const float  Power     = 1.6f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_DoomstompAll
        {
            public const string Name      = "終末の踏み荒らし";
            public const string Desc      = "大地を揺るがす踏みつけで全体を薙ぎ払う。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }
    }
}
