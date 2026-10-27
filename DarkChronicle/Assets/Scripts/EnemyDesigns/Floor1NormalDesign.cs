namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 1「暗黒の森」 通常敵 設計定数
    //
    //   ① 闇色の狼
    //   ② 毒胞子菌
    //   ③ 森の妖精
    //   ④ 絡み蔓
    //
    //   対象プレイヤーレベル: Lv 4–6
    //   複雑さ: シンプル（アクション 2 種）
    //
    //   エンカウンターグループ（5 種）:
    //   G1: 闇色の狼 × 1                  (Weight 1.2)
    //   G2: 闇色の狼 × 2                  (Weight 1.0)
    //   G3: 毒胞子菌 × 1 + 闇色の狼 × 1   (Weight 0.9)
    //   G4: 森の妖精 × 2 + 毒胞子菌 × 1   (Weight 0.8)
    //   G5: 絡み蔓 × 1                    (Weight 0.7)
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>森の魔力に侵された野生の狼。素早い物理攻撃と暗闇付与。IsUndead=false。</summary>
    public static class DarkWolfDesign
    {
        public const string EnemyName = "闇色の狼";
        public const string Lore =
            "暗黒の森の魔力に侵食された野生の狼。毛並みは夜闇の色に染まり、" +
            "その遠吠えは聞いた者の視界を奪う。群れで行動することが多い。";

        public const int MaxHP           = 120;
        public const int PhysicalAttack  = 38;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 12;
        public const int MagicDefense    = 8;
        public const int Speed           = 32;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Sword

        public const int ExpReward  = 30;
        public const int JPReward   = 9;
        public const int GoldReward = 18;

        public static class Action_FangStrike
        {
            public const string Name      = "牙の一撃";
            public const string Desc      = "鋭い牙で一体に噛みつく。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_DarkHowl
        {
            public const string Name         = "暗闇の遠吠え";
            public const string Desc         = "闇を纏った遠吠えで一体の視界を奪う。15%の確率で暗闇を付与する。";
            public const float  StatusChance = 0.15f;
            public const float  UseChance    = 0.35f;
            public const int    Priority     = 1;
        }
    }

    /// <summary>発光キノコが変異した魔生物。毒胞子と菌糸の波で攻める。IsUndead=false。</summary>
    public static class ToxicSporeFungusDesign
    {
        public const string EnemyName = "毒胞子菌";
        public const string Lore =
            "暗黒の森に生える発光するキノコが魔力で変異した魔生物。" +
            "動く必要はなく、胞子と菌糸を周囲に広げて侵入者を蝕む。";

        public const int MaxHP           = 140;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 30;
        public const int PhysicalDefense = 10;
        public const int MagicDefense    = 8;
        public const int Speed           = 10;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire / WeaponType.Axe

        public const int ExpReward  = 28;
        public const int JPReward   = 8;
        public const int GoldReward = 16;

        public static class Action_SporeCloud
        {
            public const string Name         = "胞子散布";
            public const string Desc         = "毒性の胞子を一体に浴びせる。30%の確率で毒を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.60f;
            public const int    Priority     = 1;
        }

        public static class Action_MyceliumBurst
        {
            public const string Name      = "菌糸噴射";
            public const string Desc      = "地中の菌糸を膨張させ、風の力で一体を打ち据える。";
            public const float  Power     = 0.9f;
            public const float  UseChance = 0.40f;
            public const int    Priority  = 2;
        }
    }

    /// <summary>悪意ある森の小精霊。素早く惑わしの粉で眠らせる。ゼノ吸収可能。IsUndead=false。</summary>
    public static class ForestSpriteDesign
    {
        public const string EnemyName = "森の妖精";
        public const string Lore =
            "暗黒の森に棲む悪意に満ちた小さな精霊。人を惑わし、眠らせて森の奥へ誘い込む。" +
            "単体では脆いが、複数で行動すると厄介。";

        public const int MaxHP           = 85;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 35;
        public const int PhysicalDefense = 8;
        public const int MagicDefense    = 14;
        public const int Speed           = 36;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Bow

        public const int ExpReward  = 32;
        public const int JPReward   = 10;
        public const int GoldReward = 20;

        public static class Action_FairyPebble
        {
            public const string Name      = "妖精の礫";
            public const string Desc      = "妖精の魔力で固めた風の礫を一体に放つ。";
            public const float  Power     = 0.9f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_BewitchingDust
        {
            public const string Name         = "惑わしの粉";
            public const string Desc         = "眠りを誘う輝く粉を一体に振りかける。18%の確率で睡眠を付与する。";
            public const float  StatusChance = 0.18f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    /// <summary>暗黒の森の根が変異した植物型魔物。高HPで麻痺を付与する。ゼノ吸収可能。IsUndead=false。</summary>
    public static class EntanglingVineDesign
    {
        public const string EnemyName = "絡み蔓";
        public const string Lore =
            "暗黒の森の根が魔力で覚醒し、自ら動き始めた植物型の魔物。" +
            "鞭のように振るう蔓は強靭で、絡みつかれると身動きが取れなくなる。";

        public const int MaxHP           = 180;
        public const int PhysicalAttack  = 34;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 18;
        public const int MagicDefense    = 6;
        public const int Speed           = 6;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire / WeaponType.Axe

        public const int ExpReward  = 38;
        public const int JPReward   = 11;
        public const int GoldReward = 22;

        public static class Action_VineWhip
        {
            public const string Name      = "蔓打ち";
            public const string Desc      = "強靭な蔓を鞭のように振るい一体を打つ。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_EntangleBind
        {
            public const string Name         = "絡み縛り";
            public const string Desc         = "蔓で一体の手足をがんじがらめに縛る。20%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }
}
