namespace DarkChronicle.EnemyDesigns
{
    // ══════════════════════════════════════════════════════════════════════
    //   Floor 1「暗黒の森」 エリート敵 設計定数
    //
    //   Elite A (ソロ)   : 影の狂猟 ラクセン
    //   Elite B (グループ): 暗森の霊媒師 ＋ 影霊
    //   Elite C (ソロ)   : 千年の根霊 ナグル
    //
    //   対象プレイヤーレベル: Lv 6–8
    //   ギミック: 再生・回復 ＋ 召喚・増援（プレースホルダー）
    // ══════════════════════════════════════════════════════════════════════

    // ── Elite A: 影の狂猟 ラクセン ────────────────────────────────────────
    /// <summary>
    /// 暗黒の森の魔力で変異した大型の闇色の猛獣。光を憎む性質を持ち、
    /// 傷を負うほど影の力で自己修復する。HP 低下時に 影の再生 が優先発動。
    /// 弱点: Fire, Light / Sword。ゼノは 暗黒の遠吠え を吸収可能。
    /// </summary>
    public static class RaxenDesign
    {
        public const string EnemyName = "影の狂猟 ラクセン";
        public const string Lore =
            "暗黒の森の深部に潜む変異した大型の猛獣。その体は影そのものでできており、" +
            "光に触れると苦痛を感じる。傷ついた部位は影の力で瞬く間に再生する。";

        public const int MaxHP           = 540;
        public const int PhysicalAttack  = 75;
        public const int MagicAttack     = 25;
        public const int PhysicalDefense = 20;
        public const int MagicDefense    = 12;
        public const int Speed           = 44;
        public const int ShieldPoints    = 2;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Sword

        public const int ExpReward  = 150;
        public const int JPReward   = 45;
        public const int GoldReward = 65;

        // 闇爪: 単体物理 1.8倍
        public static class Action_DarkClaw
        {
            public const string Name      = "闇爪";
            public const string Desc      = "影の爪で一体を深々と引き裂く。";
            public const float  Power     = 1.8f;
            public const float  UseChance = 0.38f;
            public const int    Priority  = 2;
        }

        // 噛み裂き: 単体物理 2.1倍（重攻撃）
        public static class Action_TearingBite
        {
            public const string Name      = "噛み裂き";
            public const string Desc      = "鋭い牙で一体の肉を噛み裂く。";
            public const float  Power     = 2.1f;
            public const float  UseChance = 0.25f;
            public const int    Priority  = 2;
        }

        // 暗黒の遠吠え: 全体 30% 暗闇（ゼノ吸収可能）
        public static class Action_DarkHowl
        {
            public const string Name         = "暗黒の遠吠え";
            public const string Desc         = "闇を纏った遠吠えで全体の視界を奪う。30%の確率で全員に暗闇を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.22f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 影の再生: 自己回復 120 HP（HP 35% 以下で優先発動）
        public static class Action_ShadowRegen
        {
            public const string Name            = "影の再生";
            public const string Desc            = "影の力で傷口を塞ぎ、HPを120回復する。";
            public const int    HealAmount      = 120;
            public const float  UseChance       = 0.15f;
            public const int    Priority        = 3;
            public const int    HealthThreshold = 35;
        }
    }

    // ── Elite B-1: 暗森の霊媒師 ──────────────────────────────────────────
    /// <summary>
    /// 廃れた森の祭祀を行い続ける不死の死霊術師。後衛支援型で単体では脆いが、
    /// 影霊を再召喚して戦力を補充しようとする。
    /// ゼノは 影渦・呪縛の霧 を吸収可能。
    /// </summary>
    public static class DarkForestMediumDesign
    {
        public const string EnemyName = "暗森の霊媒師";
        public const string Lore =
            "森の奥で古代の儀式を繰り返す死霊術師の亡骸。" +
            "自我はないが、術式の記憶だけが肉体を動かし続けている。" +
            "影の精霊を呼び出し、絶えず戦力を補充しようとする。";

        public const int MaxHP           = 280;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 45;
        public const int PhysicalDefense = 10;
        public const int MagicDefense    = 18;
        public const int Speed           = 30;
        public const int ShieldPoints    = 1;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light / WeaponType.Tome

        public const int ExpReward  = 85;
        public const int JPReward   = 27;
        public const int GoldReward = 40;

        // 影渦: 単体闇魔法 1.3倍（ゼノ吸収可能）
        public static class Action_ShadowVortex
        {
            public const string Name         = "影渦";
            public const string Desc         = "影の渦を一体に向けて放つ。闇属性魔法ダメージを与える。";
            public const float  Power        = 1.3f;
            public const float  UseChance    = 0.35f;
            public const int    Priority     = 2;
            public const bool   IsAbsorbable = true;
        }

        // 暗闇の波: 全体闇魔法 1.0倍
        public static class Action_DarkWave
        {
            public const string Name      = "暗闇の波";
            public const string Desc      = "闇の魔力の波動で全体を打ち据える。";
            public const float  Power     = 1.0f;
            public const float  UseChance = 0.30f;
            public const int    Priority  = 2;
        }

        // 影霊召喚: 召喚プレースホルダー（カスタム実装待ち）
        public static class Action_SummonShadowSpirit
        {
            public const string Name      = "影霊召喚";
            public const string Desc      = "影の力で精霊を呼び出す。影霊を1体召喚する。";
            public const float  UseChance = 0.20f;
            public const int    Priority  = 3;
        }

        // 呪縛の霧: 全体 20% 睡眠（ゼノ吸収可能）
        public static class Action_CursedMist
        {
            public const string Name         = "呪縛の霧";
            public const string Desc         = "呪われた霧を全体に漂わせる。20%の確率で全員に睡眠を付与する。";
            public const float  StatusChance = 0.20f;
            public const float  UseChance    = 0.15f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }

    // ── Elite B-2: 影霊 ──────────────────────────────────────────────────
    /// <summary>
    /// 霊媒師の儀式で呼び出された影の精霊。単体は脆いが素早く毒を撒く。
    /// 影融合で霊媒師を強化する。ゼノは 呪い触れ を吸収可能。
    /// </summary>
    public static class ShadowSpiritDesign
    {
        public const string EnemyName = "影霊";
        public const string Lore =
            "霊媒師の儀式によって呼び出された影の精霊。実体が薄く物理攻撃を弾くが、" +
            "光属性には極めて脆い。霊媒師が消えると同時に消滅する。";

        public const int MaxHP           = 180;
        public const int PhysicalAttack  = 0;
        public const int MagicAttack     = 28;
        public const int PhysicalDefense = 5;
        public const int MagicDefense    = 20;
        public const int Speed           = 50;
        public const int ShieldPoints    = 0;
        public const bool IsUndead       = true;

        // Weakness: ElementType.Fire, ElementType.Light

        public const int ExpReward  = 55;
        public const int JPReward   = 17;
        public const int GoldReward = 28;

        // 影触れ: 単体闇魔法 0.9倍
        public static class Action_ShadowTouch
        {
            public const string Name      = "影触れ";
            public const string Desc      = "影の爪先で一体に触れ、闇属性魔法ダメージを与える。";
            public const float  Power     = 0.9f;
            public const float  UseChance = 0.50f;
            public const int    Priority  = 2;
        }

        // 呪い触れ: 単体 30% 毒（ゼノ吸収可能）
        public static class Action_CursedTouch
        {
            public const string Name         = "呪い触れ";
            public const string Desc         = "呪われた影で一体に触れる。30%の確率で毒を付与する。";
            public const float  StatusChance = 0.30f;
            public const float  UseChance    = 0.30f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }

        // 影融合: 霊媒師ATK+15% バフ（サポート・カスタム実装待ち）
        public static class Action_ShadowMerge
        {
            public const string Name      = "影融合";
            public const string Desc      = "霊媒師と影を融合させ、攻撃力を高める。霊媒師の魔法攻撃力+15%（2ターン）。";
            public const float  UseChance = 0.20f;
            public const int    Priority  = 3;
        }
    }

    // ── Elite C: 千年の根霊 ナグル ────────────────────────────────────────
    /// <summary>
    /// 暗黒の森の奥深くに根を張る古代の植物精霊。
    /// 高い物理防御と継続回復を持ち、毒の胞子を絶えず撒き散らす「削り合い」型エリート。
    /// 不死ではなく植物系のため Fire/Axe が弱点（Lightning 弱点なし）。
    /// ゼノは 蔦縛り を吸収可能。
    /// </summary>
    public static class NagulDesign
    {
        public const string EnemyName = "千年の根霊 ナグル";
        public const string Lore =
            "暗黒の森の奥に根を張り続けて千年が経つ古代の植物精霊。" +
            "その巨体は半ば石化しており、体からは絶えず毒の胞子が溢れ出す。" +
            "傷ついても根が再生し、その場に縛り付けて相手を蝕む。";

        public const int MaxHP           = 620;
        public const int PhysicalAttack  = 80;
        public const int MagicAttack     = 0;
        public const int PhysicalDefense = 30;
        public const int MagicDefense    = 8;
        public const int Speed           = 12;
        public const int ShieldPoints    = 3;
        public const bool IsUndead       = false;

        // Weakness: ElementType.Fire / WeaponType.Axe
        // ※ 植物系のため Lightning 弱点なし

        public const int ExpReward  = 160;
        public const int JPReward   = 48;
        public const int GoldReward = 70;

        // 根の打撃: 単体物理 1.7倍
        public static class Action_RootStrike
        {
            public const string Name      = "根の打撃";
            public const string Desc      = "巨大な根を振り上げ一体を叩き潰す。";
            public const float  Power     = 1.7f;
            public const float  UseChance = 0.35f;
            public const int    Priority  = 2;
        }

        // 毒胞子: 全体 40% 毒
        public static class Action_ToxicSpores
        {
            public const string Name         = "毒胞子";
            public const string Desc         = "毒性の胞子を全体に撒き散らす。40%の確率で全員に毒を付与する。";
            public const float  StatusChance = 0.40f;
            public const float  UseChance    = 0.25f;
            public const int    Priority     = 1;
        }

        // 根の再生: 自己回復 150 HP（常時・Priority 3）
        public static class Action_RootRegen
        {
            public const string Name      = "根の再生";
            public const string Desc      = "大地の力を吸い上げ、傷を癒す。HPを150回復する。";
            public const int    HealAmount = 150;
            public const float  UseChance  = 0.25f;
            public const int    Priority   = 3;
        }

        // 蔦縛り: 単体 35% 麻痺（ゼノ吸収可能）
        public static class Action_VineBind
        {
            public const string Name         = "蔦縛り";
            public const string Desc         = "蔦を伸ばして一体の手足を縛る。35%の確率で麻痺を付与する。";
            public const float  StatusChance = 0.35f;
            public const float  UseChance    = 0.15f;
            public const int    Priority     = 1;
            public const bool   IsAbsorbable = true;
        }
    }
}
