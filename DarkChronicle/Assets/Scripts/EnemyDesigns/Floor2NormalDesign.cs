namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 2「呪われた城」 通常敵 設計定数
    //
    //   ① 呪われた衛兵
    //   ② 呪血蝙蝠
    //   ③ 城の怨霊
    //   ④ 影の処刑人
    //
    //   対象プレイヤーレベル: Lv 6–8
    //   複雑さ: シンプル（アクション 2 種）
    //
    //   エンカウンターグループ（5 種）:
    //   G1: 呪われた衛兵 × 1                     (Weight 1.2)
    //   G2: 呪われた衛兵 × 2                     (Weight 1.0)
    //   G3: 呪血蝙蝠 × 1 + 呪われた衛兵 × 1      (Weight 0.9)
    //   G4: 城の怨霊 × 2 + 呪血蝙蝠 × 1          (Weight 0.8)
    //   G5: 影の処刑人 × 1                       (Weight 0.7)
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>城の守備兵の亡骸。盾スキルで粘る基本型不死。IsUndead=true。</summary>
    public static class CursedGuardDesign
    {
        public const string EnemyName = "呪われた衛兵";
        public const string Lore =
            "呪われた城の守備についていた兵士の亡骸。血月の呪いに縛られ、" +
            "侵入者を排除し続ける。生前の戦闘本能だけが残っている。";

        public const int MaxHP           = 160;
        public const int PhysicalAttack  = 50;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 20;
        public const int MagicDefense    = 10;
        public const int Speed           = 20;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 40;
        public const int JPReward   = 12;
        public const int GoldReward = 26;

        public static class Action_SwordStrike
        {
            public const string Name      = "剣撃";
            public const string Desc      = "呪いを帯びた剣で一体を斬りつける。";
            public const float  Power     = 1.2f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_CursedShield
        {
            public const string Name          = "呪いの盾";
            public const string Desc          = "呪われた盾で守りを固める。シールド+1。";
            public const float  UseChance     = 0.35f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 1;
        }
    }

    /// <summary>血月の夜に活性化する呪われた蝙蝠。高速で出血を付与する。IsUndead=false。</summary>
    public static class CurseBloodBatDesign
    {
        public const string EnemyName = "呪血蝙蝠";
        public const string Lore =
            "血月の呪いを受けた大型の蝙蝠。鋭い牙で血を啜り、" +
            "傷口から出血を引き起こす。夜の城内を飛び回り複数で襲いかかる。";

        public const int MaxHP           = 100;
        public const int PhysicalAttack  = 44;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 8;
        public const int MagicDefense    = 12;
        public const int Speed           = 42;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Bow

        public const int ExpReward  = 35;
        public const int JPReward   = 10;
        public const int GoldReward = 22;

        public static class Action_BloodBite
        {
            public const string Name      = "血の噛みつき";
            public const string Desc      = "鋭い牙で一体に噛みつく。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.55f;
            public const int    Priority  = 2;
        }

        public static class Action_BloodDrain
        {
            public const string Name         = "血吸い";
            public const string Desc         = "傷口から血を啜る。25%の確率で出血を付与する。";
            public const float  StatusChance = 0.25f;
            public const float  UseChance    = 0.45f;
            public const int    Priority     = 1;
        }
    }

    /// <summary>城に縛られた怨念が霊体として顕現。闇魔法と暗闇付与。ゼノ吸収可能。IsUndead=true。</summary>
    public static class CastleWraithDesign
    {
        public const string EnemyName = "城の怨霊";
        public const string Lore =
            "呪われた城で非業の死を遂げた者の怨念が霊体として顕現した存在。" +
            "恨みの波動で侵入者を蝕み、暗闇に引きずり込もうとする。";

        public const int MaxHP           = 130;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 48;
        public const int PhysicalDefense = 6;
        public const int MagicDefense    = 22;
        public const int Speed           = 28;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Staff

        public const int ExpReward  = 42;
        public const int JPReward   = 13;
        public const int GoldReward = 28;

        public static class Action_GrudgeWave
        {
            public const string Name      = "怨念の波";
            public const string Desc      = "怨念を波動にして一体に叩きつける。闇属性魔法ダメージを与える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.60f;
            public const int    Priority  = 2;
        }

        public static class Action_CursingGaze
        {
            public const string Name         = "呪縛の眼差し";
            public const string Desc         = "怨念の眼で一体を見据える。20%の確率で暗闇を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    /// <summary>城の地下牢を守っていた巨躯の処刑人。高ATKとシールド2枚が脅威。IsUndead=true。</summary>
    public static class ShadowExecutionerDesign
    {
        public const string EnemyName = "影の処刑人";
        public const string Lore =
            "呪われた城の地下牢で死刑を執行し続けた処刑人の亡骸。" +
            "巨大な斧を振るう腕力は死してなお衰えず、薙ぎ払いで複数を一掃する。";

        public const int MaxHP           = 200;
        public const int PhysicalAttack  = 58;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 25;
        public const int MagicDefense    = 10;
        public const int Speed           = 14;
        public const int ShieldPoints    = 2;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 55;
        public const int JPReward   = 16;
        public const int GoldReward = 38;

        public static class Action_ExecutionStrike
        {
            public const string Name      = "処刑の一撃";
            public const string Desc      = "全体重を乗せた斧の一撃で一体を叩き潰す。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.65f;
            public const int    Priority  = 2;
        }

        public static class Action_JudgmentSweep
        {
            public const string Name      = "断罪の薙ぎ";
            public const string Desc      = "巨大な斧を大きく振るい全体を薙ぎ払う。";
            public const float  Power     = 1.1f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }
    }
}
