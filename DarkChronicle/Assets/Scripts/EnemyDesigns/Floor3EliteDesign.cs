namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 3「古代遺跡の回廊」 エリート敵 設計定数
    //
    //   Elite A (ソロ)   : 覚醒の石兵 グロム
    //   Elite B (グループ): 古代祭司 ファルン ＋ 封印の守護剣士
    //   Elite C (ソロ)   : 深淵の先触れ ヴォルガ
    //
    //   対象プレイヤーレベル: Lv 10–12
    //   ギミック: カウントダウン ＋ デバフ無効（自己浄化）＋ HP回復・高耐久
    // ══════════════════════════════════════════════════════════════════════

    // ── Elite A: 覚醒の石兵 グロム ────────────────────────────────────────
    /// <summary>
    /// 古代遺跡の封印から目覚めた石製戦闘兵器。HP 回復とシールド再生で粘り強く、
    /// 封印の力が蓄積すると「封印崩壊」（全体固定 300 真ダメージ）が炸裂する。
    /// 弱点: Lightning, Fire / Axe。
    /// ■ 封印崩壊カウントダウン（カスタム実装待ち）
    ///   暫定 UseChance 0.10 で通常行動として登録。
    ///   BasePower 7.5 × MagATK 40 ≒ 300（DamageType.True で防御無視）。
    /// </summary>
    public static class GromDesign
    {
        public const string EnemyName = "覚醒の石兵 グロム";
        public const string Lore =
            "古代文明が戦争のために造り出した石製の自動戦闘兵器。" +
            "長い封印の眠りから目覚め、刻まれた命令のまま侵入者を排除し続ける。" +
            "封印の力が蓄積すると、体の亀裂から致命的なエネルギーが解放される。";

        public const int MaxHP           = 660;
        public const int PhysicalAttack  = 95;
        public const int MagicAttack     = 40;   // 封印崩壊（TrueDmg）専用
        public const int PhysicalDefense = 40;
        public const int MagicDefense    = 12;
        public const int Speed           = 16;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Lightning, ElementType.Fire / WeaponType.Axe

        public const int ExpReward  = 250;
        public const int JPReward   = 65;
        public const int GoldReward = 95;

        // 石礫の殴打: 単体物理 1.8倍
        public static class Action_BoulderSmash
        {
            public const string Name      = "石礫の殴打";
            public const string Desc      = "巨大な石の拳で一体を叩き潰す。";
            public const float  Power     = 1.8f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }

        // 封印の砕撃: 全体物理 1.3倍
        public static class Action_SealCrush
        {
            public const string Name      = "封印の砕撃";
            public const string Desc      = "封印の力を解放した衝撃波で全体を打ち据える。";
            public const float  Power     = 1.3f;
            public const float  UseChance = 0.20f;
            public const int    Priority  = 2;
        }

        // 古代の再生: 自己回復 180 HP（常時・Priority 3）
        public static class Action_AncientRegen
        {
            public const string Name      = "古代の再生";
            public const string Desc      = "古代の修復機構が起動し、HPを180回復する。";
            public const int    HealAmount = 180;
            public const float  UseChance = 0.20f;
            public const int    Priority  = 3;
        }

        // 刻印の盾: シールド+2 再生（カスタム実装待ち）
        public static class Action_RuneShield
        {
            public const string Name          = "刻印の盾";
            public const string Desc          = "石の外皮に刻まれた紋章が輝き、守護の盾を再生する。シールド+2。";
            public const float  UseChance     = 0.15f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 2;
        }

        // 封印崩壊: 全体固定 300 真ダメージ（カウントダウン暫定）
        // BasePower 7.5 × MagATK 40 ≒ 300（DamageType.True で防御無視）
        public static class Action_SealCollapse
        {
            public const string Name        = "封印崩壊";
            public const string Desc        = "蓄積した封印エネルギーが一気に解放され、全体に300の固定ダメージを与える。";
            public const float  Power       = 7.5f;   // × MagATK 40 ≒ 300
            public const int    FixedDamage = 300;
            public const float  UseChance   = 0.10f;  // 暫定（カウントダウン実装後に上書き）
            public const int    Priority    = 3;
        }
    }

    // ── Elite B-1: 古代祭司 ファルン ──────────────────────────────────────
    /// <summary>
    /// 古代遺跡の祭事を司った魔術師の亡骸ではなく、遺跡の封印機構が人型に具現化した存在。
    /// 自身に付与されたデバフを「封印解除」で浄化する。ゼノは 封印の光芒・古代の縛り を吸収可能。
    /// ■ 封印解除（デバフ自己浄化）: カスタム実装待ち。現状はサポートスキルとして登録。
    /// </summary>
    public static class FarunDesign
    {
        public const string EnemyName = "古代祭司 ファルン";
        public const string Lore =
            "古代遺跡の封印術式が祭司の形を取って具現化した存在。" +
            "意志はなく、封印を維持するという機能だけが動かしている。" +
            "自身に干渉する呪いを即座に解除し、仲間の守護剣士を強化する。";

        public const int MaxHP           = 320;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 55;
        public const int PhysicalDefense = 10;
        public const int MagicDefense    = 25;
        public const int Speed           = 32;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire, ElementType.Wind / WeaponType.Tome

        public const int ExpReward  = 110;
        public const int JPReward   = 32;
        public const int GoldReward = 52;

        // 封印の光芒: 単体光魔法 1.1倍（ゼノ吸収可能）
        public static class Action_SealRadiance
        {
            public const string Name         = "封印の光芒";
            public const string Desc         = "封印の光の束を一体に向けて放つ。光属性魔法ダメージを与える。";
            public const float  Power        = 1.1f;
            public const float  UseChance    = 0.30f;
            public const int    Priority     = 2;
            public const bool   IsAbsorbable = true;
        }

        // 古代の縛り: 単体 35% 麻痺（ゼノ吸収可能）
        public static class Action_AncientBind
        {
            public const string Name         = "古代の縛り";
            public const string Desc         = "古代の封印術で一体の動きを縛る。35%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.35f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 封印解除: 自己デバフ浄化（デバフ無効プレースホルダー）
        public static class Action_SealRelease
        {
            public const string Name      = "封印解除";
            public const string Desc      = "封印術式を逆用し、自身に付与された状態異常をすべて解除する。";
            public const float  UseChance = 0.20f;
            public const int    Priority  = 3;
        }

        // 刻印強化: 守護剣士ATK+20% バフ（サポート・カスタム実装待ち）
        public static class Action_RuneBoost
        {
            public const string Name      = "刻印強化";
            public const string Desc      = "仲間に刻印を施し、攻撃力を高める。攻撃力+20%（2ターン）。";
            public const float  UseChance = 0.25f;
            public const int    Priority  = 3;
        }
    }

    // ── Elite B-2: 封印の守護剣士 ─────────────────────────────────────────
    /// <summary>
    /// 古代遺跡の番兵として刻まれた石剣士。ファルンに強化されながら前衛を務める。
    /// 封印の防壁でシールドを再生し、粘り強く戦う。
    /// </summary>
    public static class SealGuardianDesign
    {
        public const string EnemyName = "封印の守護剣士";
        public const string Lore =
            "古代遺跡の入口を守るために造られた石製の剣士型守護機構。" +
            "祭司の指令に従い前衛を担い、侵入者を剣で排除する。";

        public const int MaxHP           = 420;
        public const int PhysicalAttack  = 85;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 30;
        public const int MagicDefense    = 15;
        public const int Speed           = 28;
        public const int ShieldPoints    = 2;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Lightning, ElementType.Fire / WeaponType.Spear

        public const int ExpReward  = 130;
        public const int JPReward   = 38;
        public const int GoldReward = 58;

        // 封印剣: 単体物理 1.7倍
        public static class Action_SealSword
        {
            public const string Name      = "封印剣";
            public const string Desc      = "封印の紋章を刻んだ剣で一体を鋭く斬る。";
            public const float  Power     = 1.7f;
            public const float  UseChance = 0.40f;
            public const int    Priority  = 2;
        }

        // 古代の突撃: 単体物理 1.4倍
        public static class Action_AncientCharge
        {
            public const string Name      = "古代の突撃";
            public const string Desc      = "全体重を乗せて一体に突撃する。";
            public const float  Power     = 1.4f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        // 刻印の斬撃: 全体物理 1.5倍（範囲攻撃）
        public static class Action_RuneSlash
        {
            public const string Name      = "刻印の斬撃";
            public const string Desc      = "紋章の力を解放した薙ぎ払いで全体を斬り裂く。";
            public const float  Power     = 1.5f;
            public const float  UseChance = 0.10f;
            public const int    Priority  = 2;
        }

        // 封印の防壁: シールド+1 再生（カスタム実装待ち）
        public static class Action_SealBarrier
        {
            public const string Name          = "封印の防壁";
            public const string Desc          = "封印の術式で防壁を再構築する。シールド+1。";
            public const float  UseChance     = 0.20f;
            public const int    Priority      = 3;
            public const int    ShieldRestore = 1;
        }
    }

    // ── Elite C: 深淵の先触れ ヴォルガ ────────────────────────────────────
    /// <summary>
    /// 封印の亀裂から滲み出た深淵の使者。HP 45% 以下でフェーズ2に移行し、
    /// 全体闇魔法と「虚無解放」（全体固定 280 真ダメージ）が解禁される。
    /// デバフ自己浄化と HP 回復で粘り強い。
    /// ゼノは 深淵の触手・封印の呪縛・絶望の霧 を吸収可能。
    /// ■ 虚無解放カウントダウン（カスタム実装待ち）
    ///   暫定 UseChance 0.35 で Phase 2 行動として登録。
    ///   BasePower 3.73 × MagATK 75 ≒ 280（DamageType.True で防御無視）。
    /// </summary>
    public static class VorgaDesign
    {
        public const string EnemyName = "深淵の先触れ ヴォルガ";
        public const string Lore =
            "深淵への封印に生じた亀裂から這い出た、深淵の意志の断片。" +
            "実体を持ちながら半ば虚無に属しており、光と炎だけが有効に作用する。" +
            "自身の傷を闇の力で修復し、虚無のエネルギーを蓄えて解放する。";

        public const int MaxHP           = 560;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 75;
        public const int PhysicalDefense = 20;
        public const int MagicDefense    = 35;
        public const int Speed           = 28;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Light, ElementType.Fire / WeaponType.Staff

        public const int ExpReward  = 270;
        public const int JPReward   = 70;
        public const int GoldReward = 100;

        // ─── Phase 1 アクション（常時） ──────────────────────────────────

        // 深淵の触手: 単体闇魔法 1.3倍（ゼノ吸収可能）
        public static class Action_AbyssTentacle
        {
            public const string Name         = "深淵の触手";
            public const string Desc         = "深淵の虚無から伸びた触手で一体を打ち据える。闇属性魔法ダメージを与える。";
            public const float  Power        = 1.3f;
            public const float  UseChance    = 0.30f;
            public const int    Priority     = 2;
            public const bool   IsAbsorbable = true;
        }

        // 封印の呪縛: 単体 30% 麻痺（ゼノ吸収可能）
        public static class Action_SealShackle
        {
            public const string Name         = "封印の呪縛";
            public const string Desc         = "古代封印の残滓を利用して一体の動きを縛る。30%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 深淵の再生: 自己回復 200 HP（常時・Priority 3）
        public static class Action_AbyssRegen
        {
            public const string Name       = "深淵の再生";
            public const string Desc       = "深淵の虚無に傷を沈め、闇の力でHPを200回復する。";
            public const int    HealAmount = 200;
            public const float  UseChance  = 0.25f;
            public const int    Priority   = 3;
        }

        // 虚無の浄化: 自己デバフ浄化（デバフ無効プレースホルダー）
        public static class Action_VoidPurge
        {
            public const string Name      = "虚無の浄化";
            public const string Desc      = "虚無の力で干渉を払拭し、自身の状態異常をすべて解除する。";
            public const float  UseChance = 0.20f;
            public const int    Priority  = 3;
        }

        // ─── Phase 2 アクション（HP 45% 以下で追加解放） ─────────────────

        // 深淵の開口: 全体闇魔法 1.8倍
        public static class Action_AbyssOpening
        {
            public const string Name            = "深淵の開口";
            public const string Desc            = "深淵の門が開き、全体を呑み込む闇の奔流が走る。";
            public const float  Power           = 1.8f;
            public const float  UseChance       = 0.45f;
            public const int    Priority        = 2;
            public const int    HealthThreshold = 45;
        }

        // 虚無解放: 全体固定 280 真ダメージ（カウントダウン暫定）
        // BasePower 3.73 × MagATK 75 ≒ 280（DamageType.True で防御無視）
        public static class Action_VoidRelease
        {
            public const string Name            = "虚無解放";
            public const string Desc            = "蓄積した虚無のエネルギーが解放され、全体に280の固定ダメージを与える。";
            public const float  Power           = 3.73f;  // × MagATK 75 ≒ 280
            public const int    FixedDamage     = 280;
            public const float  UseChance       = 0.35f;  // 暫定（カウントダウン実装後に上書き）
            public const int    Priority        = 3;
            public const int    HealthThreshold = 45;
        }

        // 絶望の霧: 全体 25% 睡眠（ゼノ吸収可能）
        public static class Action_DespairMist
        {
            public const string Name            = "絶望の霧";
            public const string Desc            = "深淵の絶望が霧となって全体を包む。25%の確率で全員に睡眠を付与する。";
            public const float  StatusChance    = 0.25f;
            public const float  UseChance       = 0.20f;
            public const int    Priority        = 1;
            public const int    HealthThreshold = 45;
            public const bool   IsAbsorbable    = true;
        }
    }
}
