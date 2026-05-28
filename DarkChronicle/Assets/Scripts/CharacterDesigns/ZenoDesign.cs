using DarkChronicle.Data;

namespace DarkChronicle.CharacterDesigns
{
    /// <summary>
    /// ゼノ・ファウスト — 呪術師クラスの設計定数。
    ///
    /// ■ コンセプト
    ///   妨害・弱体化の専門家。敵の能力を削り行動を封じることでパーティを支援する。
    ///   速さはアッシュに次ぐ全キャラ2位で、先手で敵を弱体化できる。
    ///   最大の個性は「吸収」システム：敵モンスターを確率で消滅させ、
    ///   その技をグリモワール（魔獣の書）に記録して自分のコマンドに加える。
    ///   実行するたびに戦術が変化する唯一無二のキャラクター。
    ///
    /// ■ グリモワールシステム
    ///   吸収した敵の技を最大4スロット保持。バトルをまたいで持続（ローグライク内）。
    ///   新たな吸収が5枚目以降になると最古のスロットが上書きされる。
    ///   吸収技はゼノの MagATK でスケールし直される。
    ///
    /// ■ キャラクター像
    ///   元王立魔術院の「精霊魔法」研究員。34歳、男性。
    ///   禁忌の「魂吸収」魔法を追求したため異端として追放された。
    ///   封印された妹の魂を取り戻すために力を集め続けている。
    ///   狡猾で口数が少なく常に何かを計算している。
    ///   ラヴィニアとは互いに「禁忌の術者」として複雑な関係を持つ。
    ///   心の奥に妹を想う炎だけは、誰にも消せない。
    /// </summary>
    public static class ZenoDesign
    {
        // ── 基本情報 ──────────────────────────────────────────────────────
        public const string CharacterName = "ゼノ・ファウスト";
        public const string VoicePrefix   = "zeno";

        public static readonly string[] ChapterTitles =
        {
            "第一章：禁忌の術師",
            "第二章：魔獣の書",
            "第三章：封じられた魂",
            "第四章：解放の代価",
        };

        // ── ステータス ───────────────────────────────────────────────────
        // SPD25 は全キャラ2位（最速のアッシュ28に次ぐ）。
        // それ以外はほぼ平均的で、突出した強さはない。
        // 強さはステータスではなくデバフとグリモワールから来る。
        public static readonly CharacterStats BaseStats = new CharacterStats
        {
            MaxHP             = 340,
            MaxMP             = 130,
            PhysicalAttack    = 12,
            MagicAttack       = 38,
            PhysicalDefense   = 14,
            MagicDefense      = 20,
            Speed             = 25,
            Luck              = 18,
            CritRate          = 8,
            AccuracyRate      = 90,
        };

        // 成長率: SPD/MagATK重視。PhysATKはゼロ成長。
        public static readonly CharacterStats GrowthRates = new CharacterStats
        {
            MaxHP             = 20,
            MaxMP             = 6,
            PhysicalAttack    = 0,
            MagicAttack       = 3,
            PhysicalDefense   = 2,
            MagicDefense      = 2,
            Speed             = 2,
        };

        // ── 装備制限 ─────────────────────────────────────────────────────
        // 魔道書のみ（グリモワール＝魔道書という設定の強調）。
        // 防具は軽装かローブの二択。
        public static readonly WeaponType[] AllowedWeapons =
        {
            WeaponType.Tome,
        };

        public static readonly ArmorType[] AllowedArmors =
        {
            ArmorType.LightArmor, ArmorType.Robe,
        };

        // ═════════════════════════════════════════════════════════════════
        //   スキル定数
        // ═════════════════════════════════════════════════════════════════

        // ── 呪縛 ─────────────────────────────────────────────────────────
        // 単体の速度を-40%にする。先手を取れるゼノが初手で使うと
        // 以降の敵の行動順を大幅に遅らせられる。
        public static class Skill_BindCurse
        {
            public const string Name         = "呪縛";
            public const string Desc         = "一体の敵の速度を-40%にする（2ターン）。";
            public const string NameUpgrade  = "呪縛＋";
            public const string DescUpgrade  = "速度-50%（3ターン）＋物理攻撃力も-20%。";
            public const float  SpdDebuff    = 0.40f;
            public const float  SpdDebuffU   = 0.50f;
            public const float  AtkDebuffU   = 0.20f;
            public const int    Duration     = 2;
            public const int    DurationU    = 3;
            public const int    MPCost       = 6;
            public const int    MPCostU      = 8;
        }

        // ── 毒霧 ─────────────────────────────────────────────────────────
        // 全体に毒付与。デバフを重ねる戦術の柱。
        // 確率は高め(80%)で消費MPも低いため序盤から重宝する。
        public static class Skill_PoisonMist
        {
            public const string Name          = "毒霧";
            public const string Desc          = "全敵に80%の確率で毒を付与する（3ターン）。";
            public const string NameUpgrade   = "毒霧＋";
            public const string DescUpgrade   = "全敵に毒（5ターン）＋40%の確率で出血も付与。";
            public const float  PoisonChance  = 0.80f;
            public const int    PoisonTurns   = 3;
            public const int    PoisonTurnsU  = 5;
            public const float  BleedChanceU  = 0.40f;
            public const int    MPCost        = 10;
            public const int    MPCostU       = 12;
        }

        // ── 恐怖の叫び ───────────────────────────────────────────────────
        // 単体を恐怖状態にし物理攻撃を封じる。DPS系の敵に特効。
        // 物理攻撃デバフも同時付与するため、アタッカーを無力化できる。
        public static class Skill_Terror
        {
            public const string Name          = "恐怖の叫び";
            public const string Desc          = "単体を恐怖状態にする（2ターン。物理攻撃不可）。物理攻撃力-30%。";
            public const string NameUpgrade   = "恐怖の叫び＋";
            public const string DescUpgrade   = "恐怖3ターン＋物理攻撃力-40%＋次ターンの行動も封じる。";
            public const float  FearChance    = 0.80f;
            public const int    FearTurns     = 2;
            public const int    FearTurnsU    = 3;
            public const float  AtkDebuff     = 0.30f;
            public const float  AtkDebuffU    = 0.40f;
            public const int    MPCost        = 10;
            public const int    MPCostU       = 12;
        }

        // ── 呪いの眼差し ─────────────────────────────────────────────────
        // 単体の全ステータスを-20%する強力な複合デバフ。
        // 攻撃・防御・速度すべてが落ちるためあらゆる敵に有効。
        public static class Skill_EvilEye
        {
            public const string Name          = "呪いの眼差し";
            public const string Desc          = "単体の全ステータス（攻撃・防御・速度）を-20%する（3ターン）。";
            public const string NameUpgrade   = "呪いの眼差し＋";
            public const string DescUpgrade   = "全ステータス-25%（4ターン）＋魔法使用も封じる（1ターン）。";
            public const float  StatDebuff    = 0.20f;
            public const float  StatDebuffU   = 0.25f;
            public const int    Duration      = 3;
            public const int    DurationU     = 4;
            public const int    MPCost        = 14;
            public const int    MPCostU       = 16;
        }

        // ── 吸収 ─────────────────────────────────────────────────────────
        // グリモワールシステムの核心。敵を確率で吸収し、
        // その技をグリモワールに記録してゼノのコマンドに追加する。
        // HP消費あり（MaxHPの15%）。敵HPが低いほど成功しやすい。
        // ※ボスへの使用不可。
        public static class Skill_Absorb
        {
            public const string Name              = "吸収";
            public const string Desc              = "敵1体を確率で吸収しグリモワールにその技を記録する。確率は残りHP%が低いほど高い（基本25%、HP0%なら75%）。術者のHP-15%。ボスには無効。";
            public const string NameUpgrade       = "吸収＋";
            public const string DescUpgrade       = "HP消費-10%に軽減。吸収確率+10%ボーナス。吸収成功時、その技を即座に1回使用できる。";
            public const float  BaseAbsorbChance  = 0.25f;
            public const float  MaxAbsorbBonus    = 0.50f;   // HP0%の時の最大ボーナス
            public const float  HPCostPct         = 0.15f;   // 術者MaxHP×15%を消費
            public const float  HPCostPctU        = 0.10f;
            public const float  AbsorbChanceBonusU = 0.10f;
            public const int    MPCost            = 16;
            public const int    MPCostU           = 16;
        }

        // ── 魂縛 ─────────────────────────────────────────────────────────
        // 単体を必中で次ターン行動不能にする。影縫い（アッシュ）と異なり
        // MPコストが低く妨害専門家らしい純粋な行動制御技。
        public static class Skill_SoulShackle
        {
            public const string Name         = "魂縛";
            public const string Desc         = "単体を必中で次ターン行動不能にする（1ターン）。";
            public const string NameUpgrade  = "魂縛＋";
            public const string DescUpgrade  = "必中行動不能（2ターン）＋アンデッドには即死扱い。";
            public const int    BindTurns    = 1;
            public const int    BindTurnsU   = 2;
            public const int    MPCost       = 14;
            public const int    MPCostU      = 14;
        }

        // ── 呪詛の霧 ─────────────────────────────────────────────────────
        // 全敵にランダムなデバフと状態異常を同時付与する混沌の技。
        // 効果がランダムなため予測しにくいが、確実に場を乱す。
        // ゼノの「陰気だが狡猾」という性格を体現するスキル。
        public static class Skill_CurseFog
        {
            public const string Name          = "呪詛の霧";
            public const string Desc          = "全敵にランダムなデバフ1種（ATK/DEF/SPD/命中のいずれか-25%）と、ランダムな状態異常を40%で付与する（2ターン）。";
            public const string NameUpgrade   = "呪詛の霧＋";
            public const string DescUpgrade   = "ランダムデバフ2種＋状態異常2種の付与確率60%（3ターン）。";
            public const float  DebuffAmount  = 0.25f;
            public const float  StatusChance  = 0.40f;
            public const float  StatusChanceU = 0.60f;
            public const int    Duration      = 2;
            public const int    DurationU     = 3;
            public const int    MPCost        = 16;
            public const int    MPCostU       = 18;
        }

        // ── 因果の鎖 ─────────────────────────────────────────────────────
        // 2体の敵を呪いで繋ぐ。一方がダメージを受けると
        // もう一方にも50%のダメージが伝わる。多敵戦闘での効率を爆発的に高める。
        // 使いこなしポイント: 全体攻撃と組み合わせると実質2倍ダメージ。
        public static class Skill_CausalChain
        {
            public const string Name              = "因果の鎖";
            public const string Desc              = "2体の敵を鎖で繋ぐ（2ターン）。一体がダメージを受けるとその50%がもう一体にも伝わる。";
            public const string NameUpgrade       = "因果の鎖＋";
            public const string DescUpgrade       = "全敵を連結（3ターン）。一体へのダメージが全体に30%伝播する。";
            public const float  ChainDmgPct       = 0.50f;   // 連鎖ダメージ割合
            public const float  ChainDmgPctU      = 0.30f;   // 全体連鎖時（分散するため低め）
            public const int    Duration          = 2;
            public const int    DurationU         = 3;
            public const int    MPCost            = 18;
            public const int    MPCostU           = 20;
        }

        // ── 魂喰い ───────────────────────────────────────────────────────
        // 吸収の上位版。確率を強化した代わりにHP消費が増える。
        // HP低下時の絶望的な状況で逆転の一手になりうる。
        public static class Skill_SoulFeast
        {
            public const string Name               = "魂喰い";
            public const string Desc               = "吸収の強化版。HP消費-5%（MaxHPの20%）、吸収確率は全ての条件で20%増加。エリートにも使用可能（確率は低め）。";
            public const float  BaseAbsorbChance   = 0.45f;   // 吸収の基本25%から+20%
            public const float  MaxAbsorbBonus     = 0.50f;
            public const float  HPCostPct          = 0.20f;
            public const float  EliteAbsorbMult    = 0.40f;   // エリートへの確率補正（×40%）
            public const int    MPCost             = 20;
        }

        // ── 死の宣告 ─────────────────────────────────────────────────────
        // 単体に死の呪印を刻む。3ターン後に必ず即死する。
        // ボスには「3ターン後にMaxHPの50%ダメージ」として機能する。
        // 遅効性だが確実性の高い究極の除去手段。
        // 使いこなしポイント: 早めに使い、その間に他の敵を処理する。
        public static class Skill_DeathSentence
        {
            public const string Name           = "死の宣告";
            public const string Desc           = "単体に死の刻印を刻む。3ターン後に必ず即死（ボスにはMaxHPの50%ダメージ）。";
            public const string NameUpgrade    = "死の宣告＋";
            public const string DescUpgrade    = "発動まで2ターン（1短縮）。ボスへのダメージが70%MaxHPに増加。";
            public const int    DelayTurns     = 3;
            public const int    DelayTurnsU    = 2;
            public const float  BossDmgPct     = 0.50f;
            public const float  BossDmgPctU    = 0.70f;
            public const int    MPCost         = 20;
            public const int    MPCostU        = 20;
        }

        // ── 混沌の呪い ───────────────────────────────────────────────────
        // 全敵に全種類のデバフを一度に付与する総力技。
        // 呪術の心得パッシブと組み合わせると圧倒的な弱体化状態を作り出す。
        public static class Skill_ChaosCurse
        {
            public const string Name         = "混沌の呪い";
            public const string Desc         = "全敵のすべてのステータス（ATK/MAG/DEF/MDEF/SPD/命中）を-20%し、毒・出血のいずれかを75%で付与する（3ターン）。";
            public const string NameUpgrade  = "混沌の呪い＋";
            public const string DescUpgrade  = "全ステータス-25%（4ターン）。毒と出血を同時付与（確率85%）。呪詛の霧と重ね掛け可能。";
            public const float  DebuffAmount = 0.20f;
            public const float  DebuffAmountU= 0.25f;
            public const int    Duration     = 3;
            public const int    DurationU    = 4;
            public const float  StatusChance = 0.75f;
            public const float  StatusChanceU= 0.85f;
            public const int    MPCost       = 28;
            public const int    MPCostU      = 30;
        }

        // ── 冥界の扉 ─────────────────────────────────────────────────────
        // 最終奥義。通常敵は100%確率で吸収（消滅）させる。
        // エリートは60%確率で吸収。ボスには使用不可。
        // 加えて、現在フィールド上の全デバフ・状態異常の持続を1ターン延長する。
        public static class Skill_GateOfUnderworld
        {
            public const string Name                = "冥界の扉";
            public const string Desc                = "通常敵を100%確率で吸収し消滅させる。エリートには60%で吸収を試みる。フィールド上の全デバフ・呪いの持続を+1ターン延長する。";
            public const float  NormalAbsorbChance  = 1.00f;
            public const float  EliteAbsorbChance   = 0.60f;
            public const int    MPCost              = 34;
        }

        // ── パッシブ ─────────────────────────────────────────────────────

        // 呪術の心得: 全状態異常の成功率+20%、持続ターン+1。
        // デバッファーとしての根幹を強化する。
        public static class Passive_CurseMastery
        {
            public const string Name          = "呪術の心得";
            public const string Desc          = "すべての状態異常付与確率が20%上昇し、持続ターンが1増加する。";
            public const float  ChanceBonus   = 0.20f;
            public const int    DurationBonus = 1;
        }

        // 吸収の代価: 吸収スキルのHP消費を半減。
        // 吸収成功時、その技を即座に使用可能になる（グリモワールに追加後、即1回フリー使用）。
        public static class Passive_PriceOfAbsorption
        {
            public const string Name         = "吸収の代価";
            public const string Desc         = "吸収スキルのHP消費を50%軽減する。吸収成功後、その技を即座に1回フリーで使用できる。";
            public const float  HPCostReduce = 0.50f;
        }

        // ── ボイス・フィールドセリフ ──────────────────────────────────────
        public static class VoiceLines
        {
            public const string BattleStart1  = "zeno_battle_start_1";   // 「……手間をかけさせるな」
            public const string BattleStart2  = "zeno_battle_start_2";   // 「また生き物を呑み込む時間か」
            public const string UseDebuff     = "zeno_debuff";            // 「封じよ」
            public const string UseAbsorb     = "zeno_absorb";            // 「その力、もらい受ける」
            public const string AbsorbSuccess = "zeno_absorb_success";    // 「……悪くない技だ」
            public const string AbsorbFail    = "zeno_absorb_fail";       // 「惜しい。次で仕留める」
            public const string UseDeathSent  = "zeno_death_sentence";    // 「三を数えろ」
            public const string LowHP         = "zeno_low_hp";            // 「……死ぬつもりはない」
            public const string Victory       = "zeno_victory";           // 「使えた」
            public const string Defeat        = "zeno_defeat";            // 「……まだ、終われない」
            public const string LevelUp       = "zeno_level_up";          // 「力が積み重なっていく」
        }

        public static class FieldDialogue
        {
            public const string MeetBernhard  = "zeno_meet_bernhard";  // 「騎士か。……守りたいものがあるのか、お前も」
            public const string MeetLavinia   = "zeno_meet_lavinia";   // 「禁忌の術者同士か。お互い背負うものがある」
            public const string MeetAsh       = "zeno_meet_ash";       // 「賞金稼ぎか。金で動く奴は信頼できない。今のところは」
            public const string MeetLilia     = "zeno_meet_lilia";     // 「……聖魔法か。役に立つかもしれない」
            public const string AboutSister   = "zeno_sister";         // 「関係ない話だ」（内心：アカリ……もう少しだ）
            public const string UsingGrimoire = "zeno_grimoire";       // 「貸し出しはしない。返してももらえないから」
        }

        // 妹の設定（フィールドセリフや内面描写用）
        public const string SisterName = "アカリ・ファウスト";
    }
}
