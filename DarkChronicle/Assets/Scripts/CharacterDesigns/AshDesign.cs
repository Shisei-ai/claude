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
            CritRate          = 18,
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
    }
}
