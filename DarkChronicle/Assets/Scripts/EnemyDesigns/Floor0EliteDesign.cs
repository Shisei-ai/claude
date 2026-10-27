namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 0「廃墟の回廊」 エリート敵 設計定数
    //
    //   Elite A (ソロ) : 亡骸騎士 ガルム
    //   Elite B (グループ): 廃術士 ＋ 鎖縛り兵
    //   Elite C (ソロ) : 石礫の守護像 ランバード
    //
    //   対象プレイヤーレベル: Lv 4–6
    //   ダメージ式: RAW = ATK × power × critMult × elemMult × var(0.9-1.1)
    //              DEALT = max(1, RAW − DEF)
    //   IsUndead = true → Fire/Light 1.5× 弱点 (BattleManager 側処理)
    // ══════════════════════════════════════════════════════════════════════

    // ── Elite A: 亡骸騎士 ガルム ──────────────────────────────────────────
    /// <summary>
    /// 廃城で朽ちた騎士の骸が死霊術で動かされた不死のソロ強敵。
    /// 亡者の意地 (HP≤30% で自己回復) が特徴。
    /// 弱点: Fire, Light / Axe。ゼノはアクション「骸骨の咆哮」を吸収可能。
    /// </summary>
    public static class GarmDesign
    {
        public const string EnemyName = "亡骸騎士 ガルム";
        public const string Lore =
            "廃墟の回廊に残された古い騎士の骸が、死霊術によって動かされている。" +
            "かつては忠義の戦士だったが、今や命令の残滓だけが体を動かす。" +
            "錆びた剣でも、その一撃は重い。";

        public const int MaxHP           = 480;
        public const int PhysicalAttack  = 60;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 22;
        public const int MagicDefense    = 8;
        public const int Speed           = 20;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 120;
        public const int JPReward   = 35;
        public const int GoldReward = 55;

        // 錆剣突き: 単体物理 1.7倍 + 30% PhysDEF↓ (2ターン)
        public static class Action_RustyThrust
        {
            public const string Name      = "錆剣突き";
            public const string Desc      = "錆びた剣で一体を深々と貫く。30%の確率で物理防御を2ターン低下させる。";
            public const float  Power     = 1.7f;
            public const float  UseChance = 0.40f;
            public const int    Priority  = 2;
        }

        // 骨砕き: 単体物理 2.2倍（ヘビーヒット）
        public static class Action_BoneCrush
        {
            public const string Name      = "骨砕き";
            public const string Desc      = "全体重を乗せた一撃で骨ごと砕く。";
            public const float  Power     = 2.2f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        // 骸骨の咆哮: 全体 30% 暗闇付与（恐怖表現として Blind を使用 / ゼノ吸収可能）
        public static class Action_SkullRoar
        {
            public const string Name         = "骸骨の咆哮";
            public const string Desc         = "亡骸が腹の底から吠える。全体に30%の確率で暗闇を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.20f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 亡者の意地: 自己回復 80 HP（HP 30%以下で優先発動）
        public static class Action_UndeadWill
        {
            public const string Name            = "亡者の意地";
            public const string Desc            = "不死の意志で自らの骨を繋ぎ直し、HPを80回復する。";
            public const int    HealAmount      = 80;
            public const float  UseChance       = 0.15f;
            public const int    Priority        = 3;    // 高優先: HP 低下時に優先
            public const int    HealthThreshold = 30;   // HP 30% 以下で有効
        }
    }

    // ── Elite B-1: 廃術士 ──────────────────────────────────────────────
    /// <summary>
    /// 鎖縛り兵と組む魔法支援型不死。グループ戦の後衛。
    /// 腐敗の波（闇魔法全体）と味方ATK強化バフを使う。
    /// ゼノは「腐敗の波」「腐敗の呪縛」を吸収可能。
    /// </summary>
    public static class RuinedSorcererDesign
    {
        public const string EnemyName = "廃術士";
        public const string Lore =
            "死霊術に取り憑かれたまま朽ちた魔術師。意識のない体が術式を繰り返す。" +
            "腐敗の魔力が周囲を侵食し、仲間の亡者を強化する。";

        public const int MaxHP           = 250;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 38;
        public const int PhysicalDefense = 8;
        public const int MagicDefense    = 15;
        public const int Speed           = 26;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 70;
        public const int JPReward   = 22;
        public const int GoldReward = 30;

        // 腐敗の波: 全体闇魔法 1.2倍（ゼノ吸収可能）
        public static class Action_CorruptionWave
        {
            public const string Name         = "腐敗の波";
            public const string Desc         = "腐敗の魔力を波状に放つ。全体に闇属性ダメージを与える。";
            public const float  Power        = 1.2f;
            public const float  UseChance    = 0.40f;
            public const int    Priority     = 2;
            public const bool   IsAbsorbable = true;
        }

        // 腐敗の呪縛: 単体 40% 麻痺（ゼノ吸収可能）
        public static class Action_CorruptionBind
        {
            public const string Name         = "腐敗の呪縛";
            public const string Desc         = "腐敗の魔力で一体の動きを縛る。40%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.40f;
            public const float  UseChance    = 0.35f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 死霊鼓舞: 味方全体 ATK+20% バフ（2ターン）
        public static class Action_UndeadFury
        {
            public const string Name      = "死霊鼓舞";
            public const string Desc      = "死霊の呪詛で仲間を鼓舞し、攻撃力を2ターン強化する。";
            public const float  UseChance = 0.25f;
            public const int    Priority  = 3;    // バフ = 高優先
        }
    }

    // ── Elite B-2: 鎖縛り兵 ────────────────────────────────────────────
    /// <summary>
    /// 廃術士と組む前衛タンク型不死。鎖で拘束しながら殴る。
    /// ゼノは「鎖縛り」を吸収可能。
    /// </summary>
    public static class ChainSoldierDesign
    {
        public const string EnemyName = "鎖縛り兵";
        public const string Lore =
            "廃墟の看守だった亡骸が、鎖を武器に蘇った。" +
            "鈍重だが頑丈で、前に立ちはだかり仲間を守る。";

        public const int MaxHP           = 380;
        public const int PhysicalAttack  = 52;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 20;
        public const int MagicDefense    = 6;
        public const int Speed           = 16;
        public const int ShieldPoints    = 2;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Axe

        public const int ExpReward  = 90;
        public const int JPReward   = 28;
        public const int GoldReward = 40;

        // 鎖攻撃: 単体物理 1.5倍
        public static class Action_ChainStrike
        {
            public const string Name      = "鎖攻撃";
            public const string Desc      = "重い鎖を振り回して一体を打ち据える。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.50f;
            public const int    Priority  = 2;
        }

        // 拘束投げ: 全体物理 1.0倍（鎖を広範囲に投げつける）
        public static class Action_BindingThrow
        {
            public const string Name      = "拘束投げ";
            public const string Desc      = "鎖を大きく振り回し全体に打撃を与える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        // 鎖縛り: 単体 35% 麻痺（ゼノ吸収可能）
        public static class Action_ChainBind
        {
            public const string Name         = "鎖縛り";
            public const string Desc         = "鎖で全身を縛り動きを封じる。35%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.35f;
            public const float  UseChance    = 0.20f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    // ── Elite C: 石礫の守護像 ランバード ──────────────────────────────────
    /// <summary>
    /// 廃墟に設置された石造りの守護像。不死ではなく構造体。
    /// 岩の皮膚（シールド再生）が粘り強さを生む。シールド破壊が必須。
    /// 弱点: Thunder / Axe（石 = 不死ではないのでFire/Light無効）。
    /// ゼノは「石化の粉」を吸収可能。
    /// </summary>
    public static class RambardDesign
    {
        public const string EnemyName = "石礫の守護像 ランバード";
        public const string Lore =
            "廃墟の入口を守るために造られた石の守護像。命令が刻まれた石板が核となり、" +
            "破壊命令がない限り動き続ける。鈍重だが堅牢で、シールドを絶えず再生する。";

        public const int MaxHP           = 550;
        public const int PhysicalAttack  = 65;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 28;
        public const int MagicDefense    = 5;
        public const int Speed           = 14;
        public const int ShieldPoints    = 4;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Thunder / WeaponType.Axe
        // ※ 石造りのため Fire/Light は弱点にならない

        public const int ExpReward  = 130;
        public const int JPReward   = 38;
        public const int GoldReward = 60;

        // 石礫の一撃: 単体物理 1.6倍
        public static class Action_BoulderStrike
        {
            public const string Name      = "石礫の一撃";
            public const string Desc      = "石の拳で一体に強烈な一撃を叩き込む。";
            public const float  Power     = 1.6f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }

        // 瓦礫投げ: 全体物理 0.85倍
        public static class Action_RubbleThrow
        {
            public const string Name      = "瓦礫投げ";
            public const string Desc      = "自身の石片を全体に撒き散らす。";
            public const float  Power     = 0.85f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        // 石化の粉: 単体 30% 麻痺（ゼノ吸収可能）
        public static class Action_PetrifyingDust
        {
            public const string Name         = "石化の粉";
            public const string Desc         = "石化を引き起こす粉塵を一体に吹きかける。30%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.20f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 岩の皮膚: シールド+2 再生（カスタム実装待ち）
        public static class Action_RockSkin
        {
            public const string Name          = "岩の皮膚";
            public const string Desc          = "石の外皮を硬化・再生させ、守護の障壁を作り出す。シールド+2。";
            public const float  UseChance     = 0.20f;
            public const int    Priority      = 3;    // シールド破壊後に優先
            public const int    ShieldRestore = 2;
        }
    }
}
