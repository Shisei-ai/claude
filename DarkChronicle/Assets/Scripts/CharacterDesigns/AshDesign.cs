using DarkChronicle.Data;

namespace DarkChronicle.CharacterDesigns
{
    /// <summary>
    /// アッシュ・レイヴン — 狩人クラスの設計定数。
    ///
    /// ■ コンセプト
    ///   全キャラ最高の素早さと高い基礎回避率を持つ物理アタッカー。
    ///   「影舞踊」固有トレイトにより、回避成功 → Shadow State → 次の攻撃が会心確定＋威力ボーナス
    ///   という回避連動コンボが軸。素のダメージは平凡だが会心倍率×2.5（固有）で
    ///   コンボを決めると火力は一線級。
    ///   使いこなしに一癖あるが、「待つ」「仕掛ける」タイミングを読む玄人向けキャラ。
    ///
    /// ■ フィールド特性
    ///   鍵師の手・罠師の知識・暗視術で探索をサポートする唯一のキャラクター。
    ///   ローグライクではマップ開示・罠軽減・秘密宝箱開錠などの恩恵がある。
    ///
    /// ■ キャラクター像
    ///   元王国諜報部隊「鴉の翼」所属の腕利き斥候。27歳、男性。
    ///   任務中に見た王国の真実に独自行動を取り、お尋ね者に。
    ///   今は賞金稼ぎとして気ままに生きる飄々とした皮肉屋。
    ///   いざとなれば誰より頼りになる、と本人は口が裂けても言わない。
    ///
    /// ■ ビジュアル設定（HD-2Dドット絵 確定版）
    ///   • 年齢: 27歳 / 身長: 178cm / 体格: 細身・引き締まった筋肉
    ///   • 短くくせのある暗い森林緑の髪（寝ぐせ気味でランダムに跳ねる）
    ///   • 暗い灰緑色の瞳（半眼・自信満々の流し目、口角が常に少し上がっている）
    ///     ※ DarkVision スキルの視覚的フック: 暗所で瞳の色が僅かに発光する
    ///   • 小さな銀のピアス（左耳）
    ///   • 装備一式:
    ///     - アウター: くすんだ深森緑のフードジャケット（着古した実用的な質感）
    ///     - スカーフ: 草緑のマフラーを首に巻く
    ///     - インナー: 暗い茶色の革ジャケット
    ///     - ハーネス: 胸に2本の茶革クロスストラップ（矢筒固定用）
    ///     - ボトム: 暗い焦茶のパンツ
    ///     - ブーツ: 茶革の丈長ブーツ + 銀のすね当て（金刻印あり）
    ///     - グローブ: 指なし茶革グローブ（射手の必需品）
    ///     - ベルト: 茶革ベルト（真鍮バックル）
    ///   • 弓矢:
    ///     - 背中の矢筒（緑の羽根付き矢を複数収納）
    ///     - コンポジットボウ「影矢のルーン弓」— 金と銀の装飾金具、
    ///       弓身に緑色のルーン刻印（Shadow State 中にRuneGlow で発光）
    ///   • マント: 鮮やかなエメラルドグリーンの長マント（裾まで届く、翻る）
    ///     ※ 「ステルスキャラなのに派手」— 飄々とした性格の視覚的体現
    ///   • テーマカラー: 暗森緑 × 茶革 × 翠緑マント × 弓のルーングロウ
    ///   ※ スプライト仕様の詳細は SpriteSpec クラスを参照
    /// </summary>
    public static class AshDesign
    {
        // ── 基本情報 ──────────────────────────────────────────────────────
        public const string CharacterName = "アッシュ・レイヴン";
        public const string VoicePrefix   = "ash";

        public static readonly string[] ChapterTitles =
        {
            "第一章：鴉の翼",
            "第二章：消えた痕跡",
            "第三章：追われる者",
            "第四章：影に還る",
        };

        // ── ステータス ───────────────────────────────────────────────────
        // SPD28 は全キャラ最速。HP/DEFは最低水準だが回避で補う。
        // LUK20 が固有トレイト経由で会心率にも変換されるため、
        // 実質的な攻撃力は数値以上になる。
        public static readonly CharacterStats BaseStats = new CharacterStats
        {
            MaxHP             = 320,
            MaxMP             = 65,
            PhysicalAttack    = 32,
            MagicAttack       = 8,
            PhysicalDefense   = 10,
            MagicDefense      = 14,
            Speed             = 28,
            Luck              = 20,
            CriticalRate      = 18,
            AccuracyRate      = 95,
        };

        // 成長率: HP/SPD重視。MagATKは成長しない。
        public static readonly CharacterStats GrowthRates = new CharacterStats
        {
            MaxHP             = 18,
            MaxMP             = 2,
            PhysicalAttack    = 3,
            MagicAttack       = 0,
            PhysicalDefense   = 2,
            MagicDefense      = 1,
            Speed             = 2,
        };

        // ── 装備制限 ─────────────────────────────────────────────────────
        public static readonly WeaponType[] AllowedWeapons =
        {
            WeaponType.Bow, WeaponType.Dagger,
        };

        public static readonly ArmorType[] AllowedArmors =
        {
            ArmorType.LightArmor,
        };

        // ═════════════════════════════════════════════════════════════════
        //   スキル定数 (通常版 / 強化版)
        // ═════════════════════════════════════════════════════════════════

        // ── 影矢 ─────────────────────────────────────────────────────────
        // 基本攻撃スキル。Shadow State中に使うと威力1.70→2.30に化ける。
        // コンボの起点兼決め手になる万能技。
        public static class Skill_ShadowArrow
        {
            public const string Name         = "影矢";
            public const string Desc         = "影を纏った一矢。Shadow State中は威力が大幅に上昇する。";
            public const string NameUpgrade  = "影矢＋";
            public const string DescUpgrade  = "暗影を凝縮した一矢。Shadow State中は会心も確定する。";
            public const float  BasePower    = 1.30f;
            public const float  BasePowerU   = 1.75f;
            public const int    MPCost       = 4;
            public const int    MPCostU      = 4;
            // Shadow State中の威力追加量（BasePowerに加算）
            public const float  ShadowBonus  = 0.40f;
            public const float  ShadowBonusU = 0.55f;
            public const bool   CanBreak     = false;
        }

        // ── 毒矢 ─────────────────────────────────────────────────────────
        // 低直接ダメージ＋強力な毒付与。毒状態の敵に再使用すると
        // 蓄積毒が一気に爆発（残存DoT×ターン分を即時ダメージ化）。
        // 使いこなしポイント①: 毒を先撃ちしてからタイミングを計る。
        public static class Skill_PoisonArrow
        {
            public const string Name          = "毒矢";
            public const string Desc          = "毒を塗った矢。毒状態の敵に再使用すると蓄積毒が爆発する。";
            public const string NameUpgrade   = "毒矢＋";
            public const string DescUpgrade   = "猛毒を塗った矢。毒の持続が伸び、爆発ダメージも大幅増大。";
            public const float  BasePower     = 0.70f;
            public const float  BasePowerU    = 0.80f;
            public const int    MPCost        = 6;
            public const int    MPCostU       = 6;
            public const float  PoisonChance  = 0.80f;
            public const int    PoisonTurns   = 3;
            public const int    PoisonTurnsU  = 5;
            // 毒爆発時の残DoT倍率（残ターン × DoT × この倍率）
            public const float  BurstMult     = 1.0f;
            public const float  BurstMultU    = 1.5f;
        }

        // ── 残影 ─────────────────────────────────────────────────────────
        // 防御スキル。単体物理攻撃を高確率で回避し、回避時に反撃。
        // 使いこなしポイント②: 回避→Shadow State→影矢のチェーンを繋ぐ布石。
        public static class Skill_Afterimage
        {
            public const string Name          = "残影";
            public const string Desc          = "2ターン間、単体攻撃を75%の確率で回避する。回避時に50%の反撃。";
            public const string NameUpgrade   = "残影＋";
            public const string DescUpgrade   = "3ターン間、単体攻撃を90%の確率で回避。回避後にShadow Stateを付与。";
            public const float  DodgeChance   = 0.75f;
            public const float  DodgeChanceU  = 0.90f;
            public const int    Duration      = 2;
            public const int    DurationU     = 3;
            public const float  CounterPower  = 0.50f;
            public const float  CounterPowerU = 0.80f;
            public const int    MPCost        = 8;
            public const int    MPCostU       = 8;
        }

        // ── 鷹の目 ───────────────────────────────────────────────────────
        // 2ターンの強力な自己強化。命中を完全補正＋会心率大幅上昇。
        // これを撃ってから高威力スキルを繋ぐのが基本コンボ。
        public static class Skill_EagleEye
        {
            public const string Name          = "鷹の目";
            public const string Desc          = "2ターン間、命中を必中にし、会心率を35%上昇させる。";
            public const string NameUpgrade   = "鷹の目＋";
            public const string DescUpgrade   = "3ターン間、命中必中・会心率+50%。次の攻撃にBreak判定を追加。";
            public const int    Duration      = 2;
            public const int    DurationU     = 3;
            public const float  CritBonus     = 0.35f;
            public const float  CritBonusU    = 0.50f;
            public const int    MPCost        = 8;
            public const int    MPCostU       = 8;
        }

        // ── 二連射 ───────────────────────────────────────────────────────
        // 2ヒット物理。各ヒット独立で会心判定。Shadow State中は3連射。
        // 連続会心が決まると固有「会心強化」パッシブのスタックも積む。
        public static class Skill_DoubleShot
        {
            public const string Name         = "二連射";
            public const string Desc         = "素早い2連続攻撃。Shadow State中は3連射。各ヒット独立で会心判定。";
            public const string NameUpgrade  = "二連射＋";
            public const string DescUpgrade  = "3連射（Shadow中4連射）。会心ヒット時そのヒットに+25%追加ダメージ。";
            public const float  BasePower    = 0.85f;
            public const float  BasePowerU   = 0.90f;
            public const int    HitCount     = 2;
            public const int    HitCountU    = 3;
            public const int    ShadowExtraHits = 1;   // Shadow State時の追加ヒット数
            public const float  CritBonusPerHit    = 0.00f;   // Base: なし
            public const float  CritBonusPerHitU   = 0.25f;   // Upgrade: 会心時+25%
            public const int    MPCost       = 12;
            public const int    MPCostU      = 12;
            public const bool   CanBreak     = false;
        }

        // ── 罠設置 ───────────────────────────────────────────────────────
        // 使いこなしポイント③（最大の癖）: このターンは何もしない。
        // 次に行動した敵に230%の爆発ダメージ＋スタン。
        // 使用後に Shadow State が付与されるため、「待ちながら強化状態に入る」技。
        // ターン順を読んで仕掛けるのが真骨頂。
        public static class Skill_SetTrap
        {
            public const string Name         = "罠設置";
            public const string Desc         = "次に行動した敵に230%の爆発ダメージ＋50%スタン。設置後にShadow Stateを得る。";
            public const string NameUpgrade  = "罠設置＋";
            public const string DescUpgrade  = "威力320%＋スタン70%＋毒付与。任意タイミングで手動起爆も可能。";
            public const float  TrapPower    = 2.30f;
            public const float  TrapPowerU   = 3.20f;
            public const float  StunChance   = 0.50f;
            public const float  StunChanceU  = 0.70f;
            public const int    MPCost       = 10;
            public const int    MPCostU      = 10;
        }

        // ── スモーク ─────────────────────────────────────────────────────
        // 全体デバフ＋自己Shadow State付与。命中・速度を2ターン下げる。
        // 直接ダメージはないが、場を整えつつShadow Stateに入れる。
        public static class Skill_SmokeScreen
        {
            public const string Name          = "スモーク";
            public const string Desc          = "煙幕で全敵の命中-25%・速度-15%（2ターン）。使用者にShadow Stateを付与。";
            public const string NameUpgrade   = "スモーク＋";
            public const string DescUpgrade   = "全敵の命中-40%・速度-20%（3ターン）。次ターン開幕に追加でShadow State再付与。";
            public const float  AccDebuff     = 0.25f;
            public const float  AccDebuffU    = 0.40f;
            public const float  SpdDebuff     = 0.15f;
            public const float  SpdDebuffU    = 0.20f;
            public const int    Duration      = 2;
            public const int    DurationU     = 3;
            public const int    MPCost        = 14;
            public const int    MPCostU       = 14;
        }

        // ── 必殺狙撃 ─────────────────────────────────────────────────────
        // 超高威力単発。HP低目標に即死判定を持つ仕上げ技。
        // Shadow State中は威力がさらに跳ね上がり、即死確率も上昇。
        public static class Skill_DeathmarkShot
        {
            public const string Name             = "必殺狙撃";
            public const string Desc             = "急所を狙った必殺の一矢（300%）。HP35%以下の敵に30%で即死。Shadow State中は350%＋即死40%。";
            public const string NameUpgrade      = "必殺狙撃＋";
            public const string DescUpgrade      = "380%。HP50%以下に30%即死、HP35%以下に40%即死。Shadow State中は会心確定＋必中。";
            public const float  BasePower        = 3.00f;
            public const float  BasePowerU       = 3.80f;
            public const float  ShadowPower      = 3.50f;
            public const float  ShadowPowerU     = 4.00f;
            public const float  ExecuteChance    = 0.30f;
            public const float  ExecuteChanceU   = 0.40f;
            public const float  ExecuteThreshold = 0.35f;   // HP35%以下
            public const float  ExecuteThresholdU2 = 0.50f; // U版: HP50%以下にも低確率
            public const int    MPCost           = 20;
            public const int    MPCostU          = 20;
        }

        // ── 矢の雨 ───────────────────────────────────────────────────────
        // 全敵3ヒット。CanBreak=true でシールド削りにも使える全体技。
        // 強化版はBlindを付与してさらに命中デバフを重ねられる。
        public static class Skill_ArrowRain
        {
            public const string Name          = "矢の雨";
            public const string Desc          = "敵全体に3ヒットの矢を降らせる。ブレイクゲージを削りやすい。";
            public const string NameUpgrade   = "矢の雨＋";
            public const string DescUpgrade   = "威力×1.25に上昇し、50%の確率で盲目を付与する。";
            public const float  BasePower     = 0.65f;
            public const float  BasePowerU    = 0.80f;
            public const int    HitCount      = 3;
            public const int    MPCost        = 22;
            public const int    MPCostU       = 22;
            public const bool   CanBreak      = true;
            public const float  BlindChance   = 0.00f;
            public const float  BlindChanceU  = 0.50f;
        }

        // ── 影縫い ───────────────────────────────────────────────────────
        // 100%ダメージ＋次ターン行動不能（必中）。
        // 縛り中の敵はスキルダメージ+20%を受けるため、高火力コンボの補助に。
        public static class Skill_ShadowStitch
        {
            public const string Name             = "影縫い";
            public const string Desc             = "影で縫い付け（100%）、次ターン必ず行動不能にする（必中）。縛り中の敵へのスキルダメ+20%。";
            public const string NameUpgrade      = "影縫い＋";
            public const string DescUpgrade      = "威力150%＋2ターン行動不能。縛り中スキルダメ+30%。";
            public const float  BasePower        = 1.00f;
            public const float  BasePowerU       = 1.50f;
            public const int    BindTurns        = 1;
            public const int    BindTurnsU       = 2;
            public const float  BoundDmgBonus    = 0.20f;
            public const float  BoundDmgBonusU   = 0.30f;
            public const int    MPCost           = 16;
            public const int    MPCostU          = 16;
        }

        // ── 死の踊り ─────────────────────────────────────────────────────
        // 最強技。5連打ランダム対象。各ヒットで独立会心判定し、
        // 会心が出るとそのヒットが追加1ヒットを生む（最大10ヒット）。
        // 会心強化パッシブと組み合わせると雪崩式にヒット数が爆発する。
        public static class Skill_DanceOfDeath
        {
            public const string Name         = "死の踊り";
            public const string Desc         = "ランダムに敵を5連打（110%×5）。各ヒット独立で会心判定し、会心時にそのヒットが追加1ヒット（最大10ヒット）。";
            public const string NameUpgrade  = "死の踊り＋";
            public const string DescUpgrade  = "6連打（最大18ヒット）。Shadow State中は全ヒットが会心確定。";
            public const float  BasePower    = 1.10f;
            public const float  BasePowerU   = 1.20f;
            public const int    HitCount     = 5;
            public const int    HitCountU    = 6;
            public const int    MPCost       = 28;
            public const int    MPCostU      = 28;
        }

        // ── フィールドスキル ──────────────────────────────────────────────

        // 鍵師の手: バトル外専用。施錠された宝箱やドアを開錠する。
        // ローグライク: 宝箱ノードで秘密宝箱を1つ追加発見。
        public static class Skill_Lockpicking
        {
            public const string Name = "鍵師の手";
            public const string Desc = "【フィールド】鍵のかかった宝箱・扉を開錠できる。【ローグライク】宝箱ノードで追加の秘密宝箱を1つ発見する。";
        }

        // 罠師の知識: フィールドのトラップを自動検知・解除する。
        // ローグライク: 呪われた部屋のトラップ内容を事前確認、ダメージ半減。
        public static class Skill_TrapMastery
        {
            public const string Name = "罠師の知識";
            public const string Desc = "【フィールド】トラップを自動検知・解除できる。【ローグライク】呪われた部屋のトラップを事前確認し、ダメージを50%軽減する。";
        }

        // 暗視術: 暗闇・盲目状態でも視界を確保する魔法。
        // バトルでは盲目状態を無効化（付与されない）。
        // ローグライク: マップ上の隠しノードを2つ発見する。
        public static class Skill_DarkVision
        {
            public const string Name = "暗視術";
            public const string Desc = "【フィールド】暗闇・盲目状態でも視界を確保できる。【バトル】盲目状態を無効化する。【ローグライク】マップ上の隠しノードを2つ発見する。";
        }

        // ── パッシブ ─────────────────────────────────────────────────────

        // 流麗回避: 基本回避率+15%。さらに回避成功するたびにBP+1。
        // Shadow Dance トレイトと組み合わせると「回避=火力リソース獲得」のサイクルが回る。
        public static class Passive_FluidEvasion
        {
            public const string Name = "流麗回避";
            public const string Desc = "基本回避率を15%上昇させる。攻撃を回避するたびにBPを1獲得する。";
        }

        // 会心強化: 会心ダメージ倍率を×2.5に上昇（通常×2.0）。
        // さらに会心ヒット時、次の攻撃の会心率+10%（最大3スタック・+30%）。
        // 死の踊りとの連鎖で雪崩式に強くなる。
        public static class Passive_CriticalEnhancement
        {
            public const string Name = "会心強化";
            public const string Desc = "会心ダメージ倍率が×2.5になる（通常×2.0）。会心ヒット時、次の攻撃の会心率+10%（最大3スタック）。";
        }

        // ── ボイス・フィールドセリフ ──────────────────────────────────────
        public static class VoiceLines
        {
            public const string BattleStart1   = "ash_battle_start_1";   // 「仕事の時間か」
            public const string BattleStart2   = "ash_battle_start_2";   // 「敵が多いな。ま、いいか」
            public const string UseSkill       = "ash_skill";             // 「そこだ」
            public const string ShadowState    = "ash_shadow_state";      // 「影に溶けろ」
            public const string CritHit        = "ash_crit";              // 「急所」
            public const string EvasionSuccess = "ash_evade";             // 「遅い」
            public const string TrapSet        = "ash_trap";              // 「引っかかれ」
            public const string Poison         = "ash_poison";            // 「よく効く毒だろ」
            public const string LowHP          = "ash_low_hp";            // 「……まだだ」
            public const string Victory        = "ash_victory";           // 「報酬は先払いな」
            public const string Defeat         = "ash_defeat";            // 「くそ……まだ死ねん」
            public const string LevelUp        = "ash_level_up";          // 「腕が上がった、気がする」
        }

        public static class FieldDialogue
        {
            public const string MeetBernhard = "ash_meet_bernhard";  // 「騎士様か。堅そうだな」
            public const string MeetLavinia  = "ash_meet_lavinia";   // 「禁忌の契約……似たようなもんだ、俺も」
            public const string FindLock     = "ash_find_lock";      // 「鍵か。ちょっと待ってな」
            public const string FindTrap     = "ash_find_trap";      // 「罠だ。踏むなよ、お前が。俺は踏まないから」
            public const string DarkArea     = "ash_dark";           // 「暗いな。……俺には見えるけど」
            public const string Comment      = "ash_comment";        // 「依頼通りにやるだけだ。感謝とかいらない」
        }

        // ── HD-2D Sprite Specification ────────────────────────────────────
        //
        // オクトパストラベラー / ドラゴンクエストI&II HD-2D スタイル準拠。
        // ドット絵制作者・アニメーター向けの詳細仕様書。
        //
        // 【スタイル基準】
        //   • 1キャラ最大32色パレット（透明色含む）
        //   • 輪郭線: 1px 深黒緑（#0A0E08）、ハイライト輪郭に明るいベージュ（#E8D8B0）
        //   • シェーディング: フラット2段階 + 光源ハイライト1段階（光源: 右上45°）
        //   • アニメーション: 4fps 基調（射撃・Shadow Stateは10-12fps）
        //   • URP SpriteRenderer: 弓のルーン刻印のみEmissionMap。
        //     通常時=RuneDim（暗緑）、Shadow State突入時=RuneGlow（輝緑）に跳ね上がる
        //   • Shadow State中のスプライト全体に暗い半透明オーバーレイ（#0A1408 @ 30%）を
        //     MaterialPropertyBlockで重ねて「影に溶ける」感を演出する
        //
        // 【スプライトサイズ】
        //   バトルスプライト : 64 × 96 px  （PixelsPerUnit = 32）
        //   フィールドスプライト: 32 × 48 px  （PixelsPerUnit = 16）
        //   ポートレート       : 96 × 96 px  （UI用、ノンスケール表示）
        //
        // ─────────────────────────────────────────────────────────────────
        public static class SpriteSpec
        {
            // ── キャンバスサイズ ────────────────────────────────────────────
            public const int BattleSpriteWidth   = 64;
            public const int BattleSpriteHeight  = 96;
            public const int FieldSpriteWidth    = 32;
            public const int FieldSpriteHeight   = 48;
            public const int PortraitSize        = 96;
            public const int PixelsPerUnit       = 32;

            // ── カラーパレット (HTML Hex) ────────────────────────────────────
            // 髪（暗い森林緑・跳ね気味）
            public const string HairDeep        = "#162018";   // 最暗部・髪束奥
            public const string HairBase        = "#1E3020";   // 基本色
            public const string HairMid         = "#2A4228";   // 中間色
            public const string HairLight       = "#365434";   // 明部（外側の毛先）
            public const string HairHighlight   = "#446640";   // ハイライト（逆立った毛先）
            // 肌（やや日焼け・アウトドア系）
            public const string SkinHighlight   = "#F0D8B0";   // 最明部
            public const string SkinMid         = "#E0C090";   // 中間
            public const string SkinShadow      = "#C8A070";   // 影（顎下・指の間）
            public const string SkinDeep        = "#A87850";   // 深影（首根元）
            // 瞳（暗い灰緑）
            public const string EyeHighlight    = "#C0C8B8";   // ハイライト点
            public const string EyeIris         = "#5A6850";   // 虹彩（灰緑）
            public const string EyeIrisDeep     = "#3A4832";   // 虹彩 深
            public const string EyePupil        = "#1A2018";   // 瞳孔
            // DarkVision発動時の瞳グロウ（暗所でEmissionとして利用）
            public const string EyeDarkVisionGlow = "#60FF80"; // 緑白の発光
            // 深森緑ジャケット
            public const string JacketDeep      = "#0C1C10";   // 最暗部・裏地
            public const string JacketShadow    = "#14280E";   // 影
            public const string JacketBase      = "#1E3818";   // 基本色
            public const string JacketMid       = "#2A4820";   // 中間
            public const string JacketHighlight = "#344E28";   // ハイライト面
            // 草緑スカーフ
            public const string ScarfLight      = "#508040";   // 明部
            public const string ScarfMid        = "#386830";   // 中間
            public const string ScarfShadow     = "#245020";   // 影
            // エメラルド緑マント
            public const string CapeHighlight   = "#28CC44";   // 最明部（翻る先端）
            public const string CapeMid         = "#20A838";   // 中間
            public const string CapeShadow      = "#168428";   // 影
            public const string CapeDeep        = "#0E601C";   // 深影・折り目
            // 茶革（全革小物共通）
            public const string LeatherHighlight= "#9A6030";   // 明部
            public const string LeatherMid      = "#7A4820";   // 中間
            public const string LeatherShadow   = "#5A3414";   // 影
            public const string LeatherDeep     = "#3A2008";   // 深影・縫い目
            // 真鍮バックル・弓金具（金系）
            public const string BrassHighlight  = "#F0C840";   // 最明
            public const string BrassMid        = "#D0A030";   // 中間
            public const string BrassShadow     = "#A07820";   // 影
            public const string BrassDeep       = "#786010";   // 深影
            // 銀のすね当て・弓金具（銀系）
            public const string SilverHighlight = "#D0D8D0";   // 明部
            public const string SilverMid       = "#A0A8A0";   // 中間
            public const string SilverShadow    = "#707870";   // 影
            // 弓本体（暗い木材）
            public const string BowWoodDeep     = "#32200A";   // 最暗部
            public const string BowWoodBase     = "#4A3010";   // 基本色
            public const string BowWoodLight    = "#6A4018";   // 明部
            // 弓のルーン刻印（緑グロウ — Shadow State 連動）
            public const string RuneGlow        = "#80FF80";   // Shadow State MAX輝度
            public const string RuneActive      = "#40D060";   // Shadow State 通常
            public const string RuneDim         = "#209040";   // 通常時（微光）
            public const string RuneOff         = "#0E5020";   // 非発光（輪郭のみ）
            // 矢の羽根（緑）
            public const string ArrowFletching  = "#30B040";
            // 輪郭・環境
            public const string OutlineMain     = "#0A0E08";   // メイン輪郭（深緑黒）
            public const string OutlineHighlight= "#E8D8B0";   // 逆光輪郭（暖色）
            public const string ShadowAmbient   = "#181C10";   // 環境影・足元

            // ── バトルスプライト アニメーション仕様 ────────────────────────
            //
            // Sprite Sheet レイアウト: 横8列 × 縦n行、各セル 64×96 px
            //
            // ★ Shadow State オーバーレイ:
            //   以下のすべてのアニメーション行に対して、Shadow State 中は
            //   MaterialPropertyBlock で #0A1408 @ alpha 0.3 を全体に重ねる。
            //   別スプライト行は不要（コードで制御）。
            //
            // Row 0  — アイドル (Idle)
            //   フレーム数 : 4  /  fps : 4
            //   内容       : 重心を片足に乗せた「やる気なさそうな」リラックス立ち。
            //                弓を片手にだらりと持ち、膝が少し曲がっている。
            //                口角が僅かに上がった半笑い。
            //                マントが微風で2px幅でゆっくり揺れる（f2-f4）。
            //                弓のルーン刻印が RuneDim で0.5倍→1倍→0.5倍と呼吸する。
            //
            // Row 1  — 前進 (StepForward)
            //   フレーム数 : 4  /  fps : 8
            //   内容       : 軽い爪先立ちに近い歩き方（重心を地面から離す感覚）。
            //                歩幅は小さく、忍び足に近い。マントが後ろに流れる。
            //
            // Row 2  — 通常攻撃 (Attack) — クイックドロウ
            //   フレーム数 : 5  /  fps : 10
            //   内容       : f1=右肩越しに矢を一瞬でつかむ（手が後ろに伸びる）、
            //                f2=弓を引き絞る（弦を右耳まで引く、側面シルエット）、
            //                f3=解放・矢が飛ぶ（矢はスプライト外で別エフェクト）、
            //                f4=弓腕を伸ばした解放後フォーム、
            //                f5=待機に戻る。
            //                全体を素早く（合計0.5秒以内で完結）。
            //
            // Row 3  — Shadow State 突入 (EnterShadowState)
            //   フレーム数 : 2  /  fps : 12
            //   内容       : f1=全身が1フレームだけ50%透過（点滅感）、
            //                f2=弓のルーン刻印が RuneDim→RuneGlow に一気に点灯。
            //                   弓全体がほのかに緑色にシルエット変化。
            //                この2フレームの後、通常アニメーションに戻るが
            //                弓のルーン輝度は RuneActive 以上を維持する（コード制御）。
            //
            // Row 4  — スキル・弓技（Shadow State 中） (SkillBow)
            //   フレーム数 : 8  /  fps : 10
            //   内容       : f1-f2=矢を構える。矢全体が RuneActive の緑光を帯びる、
            //                f3=弦を通常より大きく引き絞る（弓が大きく湾曲する描写）、
            //                f4=解放直前・弓全体がRuneGlow に輝度MAX（全パレット中最明）、
            //                f5=解放。矢が緑の光跡を引きながら飛ぶ（矢エフェクト）、
            //                f6-f7=矢の光跡の残像（緑の細い線が2本残る・ブレ表現）、
            //                f8=待機に戻る。弓のルーンが RuneActive に落ち着く。
            //
            // Row 5  — スキル・罠設置 (SetTrap)
            //   フレーム数 : 6  /  fps : 8
            //   内容       : f1=しゃがみ始め（膝が曲がる）、
            //                f2=両手を地面に向けて罠を広げる動作、
            //                f3-f4=設置中（手元が動く）、
            //                f5=立ち上がる、f6=待機。
            //                素早い動き（0.75秒）。設置後にニヤリとした表情。
            //
            // Row 6  — スキル・スモーク (SmokeScreen)
            //   フレーム数 : 4  /  fps : 8
            //   内容       : f1=ベルトから煙幕弾を取り出す（腰に手を伸ばす）、
            //                f2=前方に放り投げる（軽く投擲）、
            //                f3=低い姿勢に即移行（爆発回避）、
            //                f4=煙の中に消える（全体を暗くフェードアウト気味）。
            //
            // Row 7  — 回避・残像 (Afterimage/Dodge)
            //   フレーム数 : 3  /  fps : 10
            //   内容       : f1=身をかわす（左に1〜2px体が傾く）、
            //                f2=元の位置に前フレームの半透過コピーを残す（残像）、
            //                f3=元の立ち位置に戻る。残像は消える。
            //                「盾なし回避」のため、このモーションがガード代わり。
            //
            // Row 8  — ダメージ (Hurt)
            //   フレーム数 : 3  /  fps : 8
            //   内容       : f1=後退（1px右にずれ）・マントが前に飛ぶ、
            //                f2=目を細めた「チッ」な表情（苦悶ではなく苛立ち）、
            //                f3=即座に戦闘態勢に戻る（回復が早い）。
            //                1フレーム白フラッシュ。
            //
            // Row 9  — 瀕死 (LowHP)
            //   フレーム数 : 4  /  fps : 4
            //   内容       : 膝を少し曲げた低重心。片手で弓、もう片手は腰に。
            //                表情はまだ軽い笑み（強がり）。弓のルーンが弱く明滅。
            //
            // Row 10 — 戦闘不能 (KO)
            //   フレーム数 : 2  /  fps : 4
            //   内容       : 膝から崩れ落ちる。弓がカランと横に転がる（f2）。
            //                マントが地面に広がる。弓のルーン刻印が完全消灯。
            //
            // Row 11 — 勝利 (Victory)
            //   フレーム数 : 6  /  fps : 8
            //   内容       : f1-f2=弓をくるりと一回転させる（見せ技）、
            //                f3=弓を肩に担ぐ（斜め持ち）、
            //                f4=もう片手をポケット（orベルト）に突っ込む、
            //                f5-f6=「ま、こんなもんだろ」という顔で視線を逸らす。
            //                マントがひとたびゆったり翻って収まる。
            //
            // Row 12 — 死の踊り（奥義） (DanceOfDeath)
            //   フレーム数 : 8  /  fps : 12
            //   内容       : f1=Shadow State 爆発的突入（全身半透過一瞬フラッシュ）、
            //                f2-f3=弓を超高速で引く→放す×2（2連射の表現）、
            //                f4-f5=ランダム方向に体ごと跳び、その都度矢を放す、
            //                f6=空中で逆手持ちに体をひねって放つ（最大動作フレーム）、
            //                f7=着地・弓のルーン RuneGlow 全開・マント大きく翻る、
            //                f8=ニヤリとした表情で待機に戻る。
            //                ★ 会心ヒット毎にこのアニメのランダムフレームを1枚追加再生
            //                  （コード側で処理。会心の「追加1ヒット」演出に対応）
            //
            // ── ポートレート仕様 (96×96 px) ─────────────────────────────────
            //   バスト〜肩のアップ。やや斜め向き（3/4画角）。
            //   表情: 口角が少し上がった半笑い・流し目（キャラの核）。
            //   背景: 単色（夕暮れ橙 #604020 を60%透過）+ 右上に弓のシルエット。
            //   静止1枚 + 感情別バリアント 4枚:
            //     [Normal]   半笑い流し目（基本）
            //     [Smug]     ニヤリとした自信たっぷりの笑み
            //     [Serious]  珍しく笑みを消した、本気の眼差し（緊急時のみ）
            //     [Hurt]     口をへの字に曲げた苛立ち顔（苦悶ではない）
            //     [Rare]     照れた顔（仲間に感謝された時にのみ出る滅多に見ない表情）
            //
            // ── フィールドスプライト仕様 (32×48 px) ─────────────────────────
            //   アイドル: 2フレーム（重心の小揺れ）
            //   歩行: 4方向 × 4フレーム（忍び足気味）
            //   弓は背中に担いだ状態（矢が少し飛び出している）
            //
            // ── エミッションマップ ─────────────────────────────────────────
            //   発光部位: 弓のルーン刻印のみ
            //   通常時  : RuneDim (#209040) で低輝度常時微光
            //   Shadow State 突入: RuneGlow (#80FF80) に輝度爆発 → RuneActive に落ち着く
            //   DarkVision発動時: 瞳に EyeDarkVisionGlow (#60FF80) を一時的に乗せる
            public const string EmissionColorNormal      = RuneDim;
            public const string EmissionColorShadowState = RuneActive;
            public const string EmissionColorSkill       = RuneGlow;

            // ── 武器スプライト バリアント ────────────────────────────────────
            //   WeaponSprites配列インデックス:
            //   [0] 通常の弓（影矢のルーン弓）— 金銀装飾、ルーン消灯状態
            //   [1] Shadow State中の弓 — ルーン刻印が RuneActive でうっすら発光
            //   [2] スキル発動中の弓  — ルーン刻印が RuneGlow で全開発光、弓全体が緑に染まる
        }
    }
}
