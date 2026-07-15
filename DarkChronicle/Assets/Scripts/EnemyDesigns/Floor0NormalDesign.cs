namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 0「廃墟の回廊」 通常敵 設計定数
    //
    //   ① ゴブリン
    //   ② 腐乱ゾンビ
    //   ③ 骸骨の射手
    //   ④ 亡者の魔術師
    //
    //   対象プレイヤーレベル: Lv 1–4
    //   複雑さ: シンプル（アクション 2 種）
    //
    //   エンカウンターグループ（5 種）:
    //   G1: ゴブリン × 1              (Weight 1.2)
    //   G2: ゴブリン × 2              (Weight 1.0)
    //   G3: 腐乱ゾンビ × 1 + ゴブリン × 1 (Weight 0.9)
    //   G4: 骸骨の射手 × 2 + 腐乱ゾンビ × 1 (Weight 0.8)
    //   G5: 亡者の魔術師 × 1           (Weight 0.7)
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>廃墟に巣食う小型の野蛮族。素早く毒ナイフを使う。IsUndead=false。</summary>
    public static class GoblinDesign
    {
        public const string EnemyName = "ゴブリン";
        public const string Lore =
            "廃墟の暗がりに潜む小柄な野蛮族。乱暴だが臆病で、数で優位に立てないと逃げる。" +
            "毒を塗った粗末なナイフを愛用している。";

        public const int MaxHP           = 75;
        public const int PhysicalAttack  = 24;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 6;
        public const int MagicDefense    = 4;
        public const int Speed           = 24;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire / WeaponType.Dagger

        public const int ExpReward  = 18;
        public const int JPReward   = 5;
        public const int GoldReward = 12;

        public static class Action_GoblinStab
        {
            public const string Name      = "ゴブリン突き";
            public const string Desc      = "粗末なナイフで一体を突き刺す。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_PoisonKnife
        {
            public const string Name         = "毒ナイフ";
            public const string Desc         = "毒を塗ったナイフで一体を切りつける。20%の確率で毒を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
        }
    }

    /// <summary>鈍足だが HP が高い。腐臭の吐息で毒を撒く。IsUndead=true。</summary>
    public static class RottingZombieDesign
    {
        public const string EnemyName = "腐乱ゾンビ";
        public const string Lore =
            "廃墟に倒れた兵士の遺体が死霊術で蘇った不死者。" +
            "鈍重だが頑丈で、腐敗した息が毒として周囲に広がる。";

        public const int MaxHP           = 110;
        public const int PhysicalAttack  = 20;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 6;
        public const int MagicDefense    = 2;
        public const int Speed           = 10;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 22;
        public const int JPReward   = 7;
        public const int GoldReward = 14;

        public static class Action_RottenClaw
        {
            public const string Name      = "腐った爪";
            public const string Desc      = "腐敗した爪で一体を引っかく。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_StenchBreath
        {
            public const string Name         = "腐臭の吐息";
            public const string Desc         = "腐敗した息を一体に吹きかける。25%の確率で毒を付与する。";
            public const float  StatusChance = 0.25f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
        }
    }

    /// <summary>HP は低いが素早く、2連射でシールドを削る後衛型。IsUndead=true。</summary>
    public static class SkeletonArcherDesign
    {
        public const string EnemyName = "骸骨の射手";
        public const string Lore =
            "かつて弓兵だった骸骨が死霊術で蘇った不死者。" +
            "前衛を避けて後方から矢を放ち続ける。骨の軽い体は素早いが脆い。";

        public const int MaxHP           = 60;
        public const int PhysicalAttack  = 18;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 5;
        public const int MagicDefense    = 4;
        public const int Speed           = 22;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Sword

        public const int ExpReward  = 18;
        public const int JPReward   = 5;
        public const int GoldReward = 10;

        public static class Action_BoneArrow
        {
            public const string Name      = "骨の矢";
            public const string Desc      = "骨で作った矢を一体に放つ。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.70f;
            public const int    Priority  = 2;
        }

        // 2連射: 0.7倍 × 2ヒット（HitCount=2 で実装）
        public static class Action_DoubleShot
        {
            public const string Name      = "二連射";
            public const string Desc      = "矢を素早く2本連続で放つ。";
            public const float  Power     = 0.7f;
            public const int    HitCount  = 2;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }
    }

    /// <summary>唯一の魔法型通常敵。腐敗の呪いはゼノが吸収可能。IsUndead=true。</summary>
    public static class UndeadMageDesign
    {
        public const string EnemyName = "亡者の魔術師";
        public const string Lore =
            "廃墟に残された魔術師の亡霊。生前の呪文詠唱の記憶だけが体を動かす。" +
            "闇の礫と腐敗の呪いで侵入者を蝕む。";

        public const int MaxHP           = 95;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 28;
        public const int PhysicalDefense = 4;
        public const int MagicDefense    = 10;
        public const int Speed           = 20;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 28;
        public const int JPReward   = 9;
        public const int GoldReward = 18;

        public static class Action_DarkPebble
        {
            public const string Name      = "暗黒の礫";
            public const string Desc      = "闇の魔力を固めた礫を一体に放つ。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.55f;
            public const int    Priority  = 2;
        }

        public static class Action_CorruptionCurse
        {
            public const string Name         = "腐敗の呪い";
            public const string Desc         = "腐敗の呪いを一体に刻む。20%の確率で毒を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.45f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }
}
