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
    ///
    /// ■ ビジュアル設定（HD-2Dドット絵 確定版）
    ///   くせ毛気味の漆黒の短髪、金琥珀色の瞳（詠唱時・デバフ発動時は暗紫に発光）
    ///   黒のフード付きボロマント（裾がほつれている = 追放者の証）
    ///   暗紫黒の内ローブ、茶革ベルトにポーションバイアル複数本装備
    ///   左腕のブレーサーに黒い羽根（妹アカリの封印との暗示的繋がり）
    ///   銀の混沌星ペンダント（混沌の呪い・呪詛の霧の視覚フック）
    ///   「呪骸杖グリム」: 節くれだった漆黒の杖 + 頂点の髑髏 + 眼窩の暗紫オーブ
    ///     → 吸収した魂の残滓が宿る。吸収成功のたびに髑髏が一瞬金色に輝く。
    ///   腰に革表紙のグリモワール（魔獣の書）。吸収成功後にGrimoireOpenアニメが入る。
    ///   スプライトサイズ: バトル64×96px / フィールド32×48px / ポートレート96×96px
    ///   PixelsPerUnit: 32, パレット最大32色
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
        public const string WandName   = "呪骸杖グリム";   // 節くれ黒木 + 髑髏 + 魂オーブ

        // ── ビジュアル仕様（SpriteSpec） ──────────────────────────────────
        public static class SpriteSpec
        {
            // ── アウトライン ─────────────────────────────────────────────
            public const string OutlineMain        = "#050508";  // 極冷黒（全身アウトライン）

            // ── 髪（漆黒・くせ毛） ────────────────────────────────────
            public const string HairDeep           = "#0A0C10";  // 漆黒（根元・陰）
            public const string HairMid            = "#14181E";  // 黒（主体）
            public const string HairHighlight      = "#2A3040";  // 極微ブルーシーン（くせ毛の光）

            // ── 肌 ────────────────────────────────────────────────────
            public const string SkinHighlight      = "#D8C0A0";
            public const string SkinMid            = "#C4A888";
            public const string SkinShadow         = "#A08060";

            // ── 瞳（金琥珀） ──────────────────────────────────────────
            public const string EyeHighlight       = "#FFF0A0";  // 琥珀閃光
            public const string EyeIris            = "#C89020";  // 琥珀色虹彩
            public const string EyePupil           = "#6A4010";  // 暗褐色瞳孔
            public const string EyeCurseGlow       = "#C040FF";  // デバフ詠唱時の暗紫発光
            public const string EyeAbsorbGlow      = "#FF8000";  // 吸収成功時の橙金フラッシュ

            // ── フード・マント ─────────────────────────────────────────
            public const string HoodDeep           = "#080A0E";  // 最深部（ほぼ漆黒）
            public const string HoodMid            = "#111520";  // 主体
            public const string HoodLight          = "#1C2030";  // 端・動き時ハイライト
            public const string CloakRaggedEdge    = "#0A0C14";  // ほつれた裾端（追放者の証）

            // ── 内ローブ（暗紫黒） ────────────────────────────────────
            public const string RobeDeep           = "#100818";  // 暗紫黒・最深部
            public const string RobeMid            = "#1A1028";  // 暗紫・主体
            public const string RobeHighlight      = "#281838";  // 暗紫・ハイライト

            // ── 革ベルト・ブレーサー ──────────────────────────────────
            public const string LeatherHighlight   = "#7A5035";
            public const string LeatherMid         = "#5A3820";
            public const string LeatherShadow      = "#3A2410";

            // ── ポーションバイアル（ベルト装備 複数本） ──────────────
            public const string VialGlass          = "#C0D0D8";  // ガラス反射光
            public const string VialLiquidPurple   = "#6020A0";  // 呪術ポーション
            public const string VialLiquidRed      = "#A01830";  // 魂液

            // ── 黒羽根（左ブレーサー） ───────────────────────────────
            public const string FeatherDeep        = "#08080C";
            public const string FeatherSheen       = "#181820";  // 微かな青紫光沢

            // ── 銀ペンダント（混沌の星） ──────────────────────────────
            public const string PendantHighlight   = "#E0E8F0";
            public const string PendantMid         = "#A0B0BC";
            public const string PendantShadow      = "#607080";
            public const string PendantChaosGlow   = "#E0B8FF";  // 混沌の呪い発動時の白紫発光

            // ── 呪骸杖グリム ──────────────────────────────────────────
            public const string WandWoodDeep       = "#200E08";  // 節くれ杖・陰
            public const string WandWoodMid        = "#3A2810";  // 節くれ杖・主体
            public const string WandWoodLight      = "#5C4020";  // 節くれ杖・ハイライト
            public const string SkullBone          = "#C8BEA8";  // 髑髏・骨色
            public const string SkullBoneLight     = "#E0D8C0";  // 髑髏・ハイライト
            public const string SkullShadow        = "#8A8070";  // 髑髏・陰
            public const string SkullOrbDim        = "#3A1060";  // 髑髏眼窩オーブ（通常時）
            public const string SkullOrbGlow       = "#8020C8";  // 髑髏眼窩オーブ（詠唱時）
            public const string SkullOrbAbsorb     = "#D08020";  // 吸収成功時の金色フラッシュ

            // ── グリモワール（腰の魔獣の書） ─────────────────────────
            public const string GrimoireCover      = "#3A2010";  // 革表紙
            public const string GrimoireSpine      = "#5A3820";  // 背表紙・金具
            public const string GrimoirePage       = "#C0B090";  // 魔方陣ページ（縁のみ見える）
            public const string GrimoireSigil      = "#C8A030";  // 金の魔法陣文字

            // ── 呪術エフェクト ─────────────────────────────────────────
            public const string CurseDeep          = "#400880";  // 粒子の消え際
            public const string CurseMid           = "#6010A0";  // 呪術中間
            public const string CurseParticle      = "#8020C8";  // 主要発光色
            public const string AbsorbGold         = "#D0901A";  // 魂の金色波紋
            public const string DeathMarkRed       = "#C01818";  // 死の宣告刻印色
            public const string ChaosPurple        = "#A030D0";  // 混沌の呪い主要色
            public const string SigmaAura          = "#200840";  // 冥界の扉の暗オーラ

            // ── アニメーション仕様 ────────────────────────────────────
            // Row 0: Idle               — 4f / 4fps
            //   f0: 基本立ち（杖を軽く握り左手を腰に）
            //   f1: マントわずかに揺れ、髑髏オーブがSkullOrbDimでほのかに光る
            //   f2: 基本に戻る
            //   f3: ペンダントが1px光る（PendantMid）
            // Row 1: StepForward        — 4f / 8fps
            //   f0: 踏み出し（左足）、マント後方へ流れる
            //   f1-f2: 重心移動、黒羽根がわずかに揺れる
            //   f3: 重心が戻る
            // Row 2: CastDebuff         — 6f / 10fps  ※全デバフ・状態異常スキル共通
            //   f0: 左手がゆっくり持ち上がる
            //   f1: 指が広がる（呪術印）、瞳がEyeCurseGlowに切り替わる
            //   f2: 指先にCurseParticleの粒子が集まる
            //   f3: 左手が最高点（胸の高さ）、髑髏がSkullOrbGlowで明確に光る
            //   f4: 呪術放出（パーティクル飛翔開始）
            //   f5: 手が戻る、瞳が通常色へ
            // Row 3: CastAbsorb         — 8f / 10fps
            //   f0: 両手が前方へ伸びる
            //   f1: 髑髏がSkullOrbAbsorbの金色で発光開始
            //   f2: 瞳がEyeAbsorbGlow、マントが後方に翻る
            //   f3: 両手最大伸展、AbsorbGoldの波紋が杖先から放射
            //   f4: 吸収対象エフェクト（外部制御）
            //   f5: 成功→髑髏MAX発光 / 失敗→瞳が即通常色に戻る
            //   f6: グリモワールが腰でわずかに開く（GrimoireSigilが1frame見える）
            //   f7: 全パーツが基本位置に戻る
            // Row 4: CastSoulFeast      — 8f / 10fps
            //   Absorbと同構成だが、マントが完全に広がり黒羽根が全て立つ
            //   f5の成功発光は全身のRobeMidが1frame明るくなる（ソウルフラッシュ）
            // Row 5: CastDeathSentence  — 6f / 8fps
            //   f0: 杖を真っ直ぐ対象に向ける
            //   f1: 瞳がEyeCurseGlowで細くなる（冷たい睨み）
            //   f2: 髑髏からDeathMarkRedの雫が垂れる（1px赤点）
            //   f3: 杖先に死の刻印ルーン（外部エフェクト）
            //   f4: マントがわずかに揺れる（静かな構え）
            //   f5: 腕が戻るが、瞳はEyeCurseGlowのまま少し長く（視線を保つ）
            // Row 6: CastGateOfUnderworld — 10f / 8fps  ※この技だけフードが外れる
            //   f0: 両腕が広がる
            //   f1: フードが背後に落ち、くせ毛の漆黒髪が完全露出（本気の視覚合図）
            //   f2: 瞳がEyeCurseGlow MAX
            //   f3: 杖と左手が最大開脚、PendantChaosGlowが最大発光
            //   f4-f7: SigmaAuraオーラが広がる（外部パーティクル制御）
            //   f8: 全力放出（キャラは中心で静止、エフェクトのみ動く）
            //   f9: ゆっくり腕が戻る、フードが再び被さる
            // Row 7: Hurt               — 3f / 8fps
            //   f0: 鋭く後方に引く
            //   f1: マントが大きく揺れる（バイアルが揺れる = 計算を乱される演出）
            //   f2: 静止・回復構え
            // Row 8: LowHP             — 4f / 4fps
            //   f0: 前傾み、左手が胸に（痛み）
            //   f1: 瞳がEyeCurseGlowで細く（まだ計算中）
            //   f2: 杖を盾のように前に
            //   f3: f0に戻る（ループ）
            // Row 9: KO                — 2f / 4fps
            //   f0: 斜めに崩れ落ちる（杖が手から離れる）
            //   f1: 倒れた静止（グリモワールが開いて落ちる）
            // Row 10: Victory          — 6f / 8fps
            //   f0-f2: ゆっくり背を向ける
            //   f3: 杖を持ち上げ、髑髏からCurseParticleの魂シグルが一つ立ち上る
            //   f4: マントが静かに揺れる
            //   f5: 微かに振り返る（VoiceLine "使えた"）
            // Row 11: GrimoireOpen     — 4f / 6fps  ※吸収成功後のグリモワール確認
            //   f0: 腰のグリモワールを取り出す
            //   f1: 表紙が開く（GrimoireSigilの金文字が光る）
            //   f2: ページを1枚めくる（新技記録の瞬間）
            //   f3: グリモワールを閉じて腰に戻す
            // Row 12: CastChaosState   — 6f / 10fps  ※混沌の呪い専用
            //   f0: 両手が開く
            //   f1: PendantChaosGlowが白く輝く
            //   f2: 全敵デバフがChaosPurpleでパルス（外部エフェクト）
            //   f3: 髑髏がSkullOrbGlow + SkullOrbAbsorb混合（不規則明滅）
            //   f4: ChaosPurple MAX 粒子爆発
            //   f5: 静止・構えへ戻る

            // ── 発光（MaterialPropertyBlock） ────────────────────────
            public const string EmissionColorIdle       = SkullOrbDim;    // 髑髏眼窩の微かな紫
            public const string EmissionColorCast       = CurseParticle;  // 詠唱：暗紫
            public const string EmissionColorAbsorb     = AbsorbGold;     // 吸収：魂の金
            public const string EmissionColorDeathMark  = DeathMarkRed;   // 死の宣告：赤
            public const string EmissionColorChaosCurse = ChaosPurple;    // 混沌の呪い：暗紫
            public const string EmissionColorGateMax    = SigmaAura;      // 冥界の扉：最深暗オーラ

            // ── ポートレートバリアント ─────────────────────────────────
            // [Normal]      無表情に近い冷静な顔（常に何かを計算中）。瞳=EyeIris。
            // [Calculating] 目が細くなり遠くを見る（思索中）。EyeCurseGlowで微かに光。
            // [Intent]      対象を定め、完全に静止。瞳の輝きが増す。
            // [Pain]        妹の話が出た時・倒れた瞬間。普段の無表情が崩れる唯一の瞬間。
            // [Rare_Warm]   アカリの写し鏡を見た時だけ見せる、一瞬の柔らかさ（ゲーム内1度のみ）。

            // ── 武器スプライトバリアント ──────────────────────────────
            // WeaponSprites[0]: 通常時（SkullOrbDim）
            // WeaponSprites[1]: デバフ詠唱中（SkullOrbGlow + CurseParticle周囲放射）
            // WeaponSprites[2]: 吸収/魂喰い（SkullOrbAbsorb + AbsorbGold 波紋）
            // WeaponSprites[3]: 冥界の扉（フル発光 SkullOrbGlow + SigmaAura オーラ纏い）
        }
    }
}
