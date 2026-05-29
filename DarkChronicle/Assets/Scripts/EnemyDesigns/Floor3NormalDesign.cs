namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 3「古代遺跡の回廊」 通常敵 設計定数
    //
    //   ① 遺跡の石兵
    //   ② 毒砂蛇
    //   ③ 封印の亡霊
    //   ④ 古代の巨人兵
    //
    //   対象プレイヤーレベル: Lv 10–12
    //   複雑さ: シンプル（アクション 2 種）
    //
    //   エンカウンターグループ（5 種）:
    //   G1: 遺跡の石兵 × 1                        (Weight 1.2)
    //   G2: 遺跡の石兵 × 2                        (Weight 1.0)
    //   G3: 毒砂蛇 × 1 + 遺跡の石兵 × 1           (Weight 0.9)
    //   G4: 封印の亡霊 × 2 + 毒砂蛇 × 1           (Weight 0.8)
    //   G5: 古代の巨人兵 × 1                      (Weight 0.7)
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>古代の命令で動き続ける石製の番兵。シールド2枚と防衛構えで粘る。IsUndead=false。</summary>
    public static class RuinStoneSoldierDesign
    {
        public const string EnemyName = "遺跡の石兵";
        public const string Lore =
            "古代遺跡の守護のために錬成された石製の兵士。血月の呪いとは無関係に" +
            "古代の命令で動き続ける。分厚い石の外皮と盾の構えで侵入者を押しとどめる。";

        public const int MaxHP           = 220;
        public const int PhysicalAttack  = 64;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 28;
        public const int MagicDefense    = 12;
        public const int Speed           = 14;
        public const int ShieldPoints    = 2;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Lightning, ElementType.Wind / WeaponType.Axe

        public const int ExpReward  = 52;
        public const int JPReward   = 14;
        public const int GoldReward = 34;

        public static class Action_StoneStrike
        {
            public const string Name      = "石の打撃";
            public const string Desc      = "石の拳で一体を打ちつける。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_SteadfastStance
        {
            public const string Name          = "堅守の構え";
            public const string Desc          = "堅固な構えで守りを固める。シールド+1。";
            public const float  UseChance     = 0.35f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 1;
        }
    }

    /// <summary>遺跡の砂地に潜む大型の毒蛇。古代の封印で強化された毒腺を持つ。IsUndead=false。</summary>
    public static class PoisonSandSerpentDesign
    {
        public const string EnemyName = "毒砂蛇";
        public const string Lore =
            "遺跡の砂地に潜む大型の毒蛇。古代の封印によって毒腺が強化され、" +
            "一噛みで即死級の猛毒を注入する。砂に潜伏して獲物を待ち伏せる。";

        public const int MaxHP           = 160;
        public const int PhysicalAttack  = 58;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 14;
        public const int MagicDefense    = 10;
        public const int Speed           = 40;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Ice, ElementType.Fire / WeaponType.Sword

        public const int ExpReward  = 48;
        public const int JPReward   = 13;
        public const int GoldReward = 30;

        public static class Action_PoisonFang
        {
            public const string Name      = "毒牙";
            public const string Desc      = "猛毒を含む牙で一体に噛みつく。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.55f;
            public const int    Priority  = 2;
        }

        public static class Action_VenomBreath
        {
            public const string Name         = "猛毒の吐息";
            public const string Desc         = "強力な毒液を一体に吐きかける。35%の確率で毒を付与する。";
            public const float  StatusChance = 0.35f;
            public const float  UseChance    = 0.45f;
            public const int    Priority     = 1;
        }
    }

    /// <summary>封印陣に縛られた怨念の霊体。闇魔法と麻痺付与。ゼノ吸収可能。IsUndead=true。</summary>
    public static class SealedWraithDesign
    {
        public const string EnemyName = "封印の亡霊";
        public const string Lore =
            "古代遺跡の封印陣に縛られた霊魂。遺跡の守護のため強制的に霊体化させられた者の" +
            "怨念が顕現している。侵入者に呪縛をかけて動きを封じる。";

        public const int MaxHP           = 160;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 55;
        public const int PhysicalDefense = 8;
        public const int MagicDefense    = 24;
        public const int Speed           = 28;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 55;
        public const int JPReward   = 15;
        public const int GoldReward = 36;

        public static class Action_AncientCurse
        {
            public const string Name      = "古代の呪詛";
            public const string Desc      = "遺跡に刻まれた古代の呪詛を一体に叩きつける。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_SealBind
        {
            public const string Name         = "封印の呪縛";
            public const string Desc         = "封印の力で一体の動きを縛る。20%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    /// <summary>遺跡最深部を守る巨大な石造りの守護者。高HPとシールド3枚、全体薙ぎ払いが脅威。IsUndead=false。</summary>
    public static class AncientGiantSoldierDesign
    {
        public const string EnemyName = "古代の巨人兵";
        public const string Lore =
            "遺跡最深部を守る巨大な石造りの守護者。通常の石兵の数倍の大きさを誇り、" +
            "その踏みつけは地を揺るがす。圧倒的な質量と3枚のシールドで前進を阻む。";

        public const int MaxHP           = 300;
        public const int PhysicalAttack  = 75;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 35;
        public const int MagicDefense    = 15;
        public const int Speed           = 8;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Lightning, ElementType.Wind / WeaponType.Axe

        public const int ExpReward  = 72;
        public const int JPReward   = 19;
        public const int GoldReward = 48;

        public static class Action_GiantStomp
        {
            public const string Name      = "巨人の踏みつけ";
            public const string Desc      = "巨大な足で一体を踏みつぶす。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_CollapseSwing
        {
            public const string Name      = "崩壊の薙ぎ払い";
            public const string Desc      = "石腕を大きく振り払い全体を薙ぎ払う。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }
    }
}
