using DarkChronicle.Data;

namespace DarkChronicle.CharacterDesigns
{
    /// <summary>
    /// リリア・アルバ — 僧侶クラスの設計定数。
    ///
    /// ■ コンセプト
    ///   全キャラ最多MPを持つ回復・支援特化のヒーラー。
    ///   単体回復・全体回復・蘇生・状態異常回復・防御バフを網羅し、
    ///   パーティの生命線として機能する。
    ///   聖属性攻撃魔法を習得できる唯一のキャラクターで、
    ///   アンデッド・悪魔系の敵に対しては固有トレイトと合わせて
    ///   圧倒的なダメージを叩き出す。
    ///
    /// ■ 固有システム
    ///   「自動慈愛」トレイトにより、自分のターンでなくても
    ///   毎ターン末にHP残量最低の味方へ自動小回復が発動する。
    ///   「蘇生時の自己回復」で蘇生スキルを使ってもMPしか失わない。
    ///   行動が遅い（SPD最低）分、被ダメージを確認してから動ける立ち回り。
    ///
    /// ■ キャラクター像
    ///   聖ルミアス教会の若き司祭見習い。19歳、女性。
    ///   異例の若さで癒しの聖印を授けられた天才肌。
    ///   苦難を見てきたからこそ笑顔を絶やさない芯の強さを持つ。
    ///   旅の仲間への愛情は誰よりも深く、時に過保護なほど。
    ///   甘いものとお花が好き。アッシュに「口の減らない子ね」と言われ怒る。
    ///
    /// ■ ビジュアル設定（HD-2Dドット絵 確定版）
    ///   • 年齢: 19歳 / 身長: 158cm / 体格: 小柄・細身・柔らかな雰囲気
    ///   • 長い波打つイチゴミルク色の髪（薄ピンクがかったシャンパンブロンド）
    ///     サイドに細い三つ編みを垂らし、残りは緩く下ろす
    ///     髪飾り: 金の蝶々ピン・白いリボン・青い宝石ピン
    ///   • 温かみのある琥珀色の瞳（蜂蜜のような色）、柔らかな微笑み
    ///   • 装備一式（典礼白ローブ×旅装束の融合）:
    ///     - メインドレス: 裾まで届く白の典礼ドレス（金の唐草刺繍が裾・袖口に精緻に入る）
    ///     - 外套: 白のサーコート（金縁、同じく金刺繍）ドレスの上に重ねる
    ///     - アンダースカート: 水色の布が裾から覗く（動きのたびに翻る）
    ///     - 胸元: 青サファイアの十字架ブローチ（異例の若さで授けられた「聖印」の証）
    ///     - 首元: 白いフリルカラー
    ///     - 袖口: 白いレースカフス
    ///     - ベルト: 茶革のダブルベルト（金バックル）。旅人らしい実用的アクセント
    ///     - ソックス: 白のフリル付きニーハイソックス
    ///     - ブーツ: 茶革のアンクルブーツ（金の花柄型押し）
    ///     - 小物: 腰帯に厚みのある聖典（革装丁）を固定
    ///   • 杖: 「天光の杖アルミア」（右手に縦持ち）
    ///     金のフィリグリー細工の杖身、上部に天使の翼が広がる。
    ///     翼の中央に青白く輝く水晶クラスターが複数（聖印と同じ色）。
    ///     右側に金のベルがチェーンで下がり、白いリボンが結ばれている。
    ///   • テーマカラー: 清白 × 金刺繍 × 水色アクセント × 琥珀色の温もり
    ///   ※ スプライト仕様の詳細は SpriteSpec クラスを参照
    /// </summary>
    public static class LiliaDesign
    {
        // ── 基本情報 ──────────────────────────────────────────────────────
        public const string CharacterName = "リリア・アルバ";
        public const string VoicePrefix   = "lilia";
        public const string StaffName     = "天光の杖アルミア";   // 翼・水晶・鐘を持つ聖杖

        public static readonly string[] ChapterTitles =
        {
            "第一章：慈愛の祈り",
            "第二章：神の沈黙",
            "第三章：奇跡の代価",
            "第四章：光に還る",
        };

        // ── ステータス ───────────────────────────────────────────────────
        // MP240 は全キャラ最高（ラヴィニアの200を超える）。
        // SPD14 は最低だが「被ダメを見てから動く」立ち回りを生む。
        // MagDEF28 は全キャラ最高の魔法耐性。HP370 は中程度。
        public static readonly CharacterStats BaseStats = new CharacterStats
        {
            MaxHP             = 370,
            MaxMP             = 240,
            PhysicalAttack    = 10,
            MagicAttack       = 42,
            PhysicalDefense   = 15,
            MagicDefense      = 28,
            Speed             = 14,
            Luck              = 16,
            CritRate          = 5,
            AccuracyRate      = 90,
        };

        // 成長率: MP/HP/MagDEF重視。PhysATKは成長しない。
        public static readonly CharacterStats GrowthRates = new CharacterStats
        {
            MaxHP             = 22,
            MaxMP             = 15,
            PhysicalAttack    = 0,
            MagicAttack       = 4,
            PhysicalDefense   = 2,
            MagicDefense      = 3,
            Speed             = 1,
        };

        // ── 装備制限 ─────────────────────────────────────────────────────
        // 杖: 魔法キャラ基本。魔道書: 回復魔法の詠唱補助。
        // ローブ: 魔法耐性。盾: 物理攻撃をある程度防ぐ。
        public static readonly WeaponType[] AllowedWeapons =
        {
            WeaponType.Staff, WeaponType.Tome,
        };

        public static readonly ArmorType[] AllowedArmors =
        {
            ArmorType.Robe, ArmorType.Shield,
        };

        // ═════════════════════════════════════════════════════════════════
        //   スキル定数
        // ═════════════════════════════════════════════════════════════════

        // ── 治癒 ─────────────────────────────────────────────────────────
        // 最も基本的な回復魔法。MPが低く使いやすい。
        public static class Skill_Cure
        {
            public const string Name        = "治癒";
            public const string Desc        = "一人の味方のHPを回復する（回復力80）。";
            public const string NameUpgrade = "治癒＋";
            public const string DescUpgrade = "より強力な回復（回復力130）。同時に小さな状態異常を1つ解除する。";
            public const float  HealPower   = 80f;
            public const float  HealPowerU  = 130f;
            public const int    MPCost      = 6;
            public const int    MPCostU     = 8;
        }

        // ── 清浄 ─────────────────────────────────────────────────────────
        // 一人の状態異常をすべて回復する。毒・盲目・沈黙など一括解除。
        public static class Skill_Purify
        {
            public const string Name = "清浄";
            public const string Desc = "一人の味方のすべての状態異常を取り除く。";
            public const int    MPCost = 8;
        }

        // ── 聖光弾 ───────────────────────────────────────────────────────
        // 聖属性の単体攻撃魔法。アンデッド・悪魔系に×2.0のボーナスダメージ。
        // Lilia の唯一の直接攻撃手段だが、対アンデッドでは頼もしい火力に。
        public static class Skill_HolyBolt
        {
            public const string Name           = "聖光弾";
            public const string Desc           = "聖なる光弾を放つ（120%）。アンデッド・悪魔系に×2.0の追加ダメージ。";
            public const string NameUpgrade    = "聖光弾＋";
            public const string DescUpgrade    = "強力な光弾（200%）。アンデッド・悪魔系に×2.5の追加ダメージ。";
            public const float  BasePower      = 1.20f;
            public const float  BasePowerU     = 2.00f;
            public const float  UndeadMult     = 2.00f;   // アンデッド倍率（固有トレイトでさらに+）
            public const float  UndeadMultU    = 2.50f;
            public const int    MPCost         = 10;
            public const int    MPCostU        = 12;
            public const bool   CanBreak       = false;
        }

        // ── 守護の祈り ───────────────────────────────────────────────────
        // 一人に守護バフ。物理防御+30%、魔法防御+30% を3ターン維持。
        // 強化版は持続が4ターンになり、速度も10%上昇する。
        public static class Skill_GuardianPrayer
        {
            public const string Name          = "守護の祈り";
            public const string Desc          = "一人の味方を守護する。物理防御+30%、魔法防御+30%（3ターン）。";
            public const string NameUpgrade   = "守護の祈り＋";
            public const string DescUpgrade   = "より強固な守護。物理防御+40%、魔法防御+40%、速度+10%（4ターン）。";
            public const int    Duration      = 3;
            public const int    DurationU     = 4;
            public const float  DefBonus      = 0.30f;
            public const float  DefBonusU     = 0.40f;
            public const int    MPCost        = 10;
            public const int    MPCostU       = 12;
        }

        // ── 聖癒 ─────────────────────────────────────────────────────────
        // 強化版の単体回復。治癒の約2.5倍の回復量を持つ中核スキル。
        public static class Skill_HolyCure
        {
            public const string Name        = "聖癒";
            public const string Desc        = "強力な回復魔法（回復力200）。HP大幅回復。";
            public const string NameUpgrade = "聖癒＋";
            public const string DescUpgrade = "極めて強力な回復（回復力280）。状態異常も全回復する。";
            public const float  HealPower   = 200f;
            public const float  HealPowerU  = 280f;
            public const int    MPCost      = 16;
            public const int    MPCostU     = 18;
        }

        // ── 蘇生 ─────────────────────────────────────────────────────────
        // 戦闘不能の一人をHP50%で蘇生する。パーティの生命保険。
        // 固有トレイトにより蘇生時に術者もHP20%回復（使い損感を解消）。
        public static class Skill_Revive
        {
            public const string Name           = "蘇生";
            public const string Desc           = "戦闘不能の味方一人をHP50%で蘇生させる。";
            public const string NameUpgrade    = "蘇生＋";
            public const string DescUpgrade    = "戦闘不能の味方一人をHP80%で蘇生させる。リジェネも付与する。";
            public const float  ReviveHPPct    = 0.50f;
            public const float  ReviveHPPctU   = 0.80f;
            public const int    MPCost         = 20;
            public const int    MPCostU        = 22;
        }

        // ── 再生の光 ─────────────────────────────────────────────────────
        // 全員にリジェネ（継続回復）を5ターン付与する。
        // 毎ターン少しずつ回復するため、MP効率が非常に優れている。
        public static class Skill_RegenLight
        {
            public const string Name        = "再生の光";
            public const string Desc        = "味方全員にリジェネを付与する（5ターン間、毎ターンMagATK×0.35回復）。";
            public const string NameUpgrade = "再生の光＋";
            public const string DescUpgrade = "リジェネ持続ターン+2（7ターン）。回復量がMagATK×0.45に増加。";
            public const int    Duration    = 5;
            public const int    DurationU   = 7;
            public const float  RegenMult   = 0.35f;   // MagATK × この値 / ターン
            public const float  RegenMultU  = 0.45f;
            public const int    MPCost      = 14;
            public const int    MPCostU     = 16;
        }

        // ── 全体治癒 ─────────────────────────────────────────────────────
        // パーティ全体を回復する。習得Lvが高い分、単体回復より効率的に全体へ。
        public static class Skill_Curaga
        {
            public const string Name        = "全体治癒";
            public const string Desc        = "味方全員のHPを回復する（回復力110）。";
            public const string NameUpgrade = "全体治癒＋";
            public const string DescUpgrade = "より強力な全体回復（回復力160）。リジェネも同時に付与する。";
            public const float  HealPower   = 110f;
            public const float  HealPowerU  = 160f;
            public const int    MPCost      = 22;
            public const int    MPCostU     = 24;
        }

        // ── 神罰 ─────────────────────────────────────────────────────────
        // 敵全体に聖属性ダメージ（3ヒット）。アンデッドに×2.5。
        // 敵の属性弱点（聖）を突いてBreakも狙える。
        // 固有トレイト「聖光の加護」が乗ると合計ダメージは壊滅的になる。
        public static class Skill_DivinePunishment
        {
            public const string Name          = "神罰";
            public const string Desc          = "聖なる裁きが敵全体を3回打つ（100%×3）。アンデッド系に×2.5の特効。ブレイクゲージを削る。";
            public const string NameUpgrade   = "神罰＋";
            public const string DescUpgrade   = "4回攻撃（100%×4）。アンデッド系に×3.0の特効。アンデッドを確定Break。";
            public const float  BasePower     = 1.00f;
            public const int    HitCount      = 3;
            public const int    HitCountU     = 4;
            public const float  UndeadMult    = 2.50f;
            public const float  UndeadMultU   = 3.00f;
            public const int    MPCost        = 26;
            public const int    MPCostU       = 28;
            public const bool   CanBreak      = true;
        }

        // ── 聖域 ─────────────────────────────────────────────────────────
        // 集大成の全体支援。状態異常全回復 + リジェネ + 魔法防御+30%を一度に付与。
        // 強化版はさらに物理防御バフも追加され、完全な耐久体制を整える。
        public static class Skill_Sanctuary
        {
            public const string Name          = "聖域";
            public const string Desc          = "味方全員の状態異常を回復し、リジェネ（5ターン）＋魔法防御+30%（3ターン）を付与する。";
            public const string NameUpgrade   = "聖域＋";
            public const string DescUpgrade   = "状態異常回復＋リジェネ（7ターン）＋物理防御+30%＋魔法防御+40%（3ターン）。";
            public const int    Duration      = 3;
            public const int    DurationU     = 3;
            public const float  MagDefBonus   = 0.30f;
            public const float  MagDefBonusU  = 0.40f;
            public const float  PhysDefBonusU = 0.30f;
            public const int    MPCost        = 30;
            public const int    MPCostU       = 32;
        }

        // ── 完全蘇生 ─────────────────────────────────────────────────────
        // 戦闘不能の全員を同時にHP100%で蘇生する大奇跡。
        // MP38と高コストだが、全滅寸前からの逆転劇を可能にする。
        public static class Skill_FullRevive
        {
            public const string Name         = "完全蘇生";
            public const string Desc         = "戦闘不能の味方全員をHP100%で蘇生させる。大いなる奇跡。";
            public const float  ReviveHPPct  = 1.00f;
            public const int    MPCost       = 38;
        }

        // ── 奇跡の祝福 ───────────────────────────────────────────────────
        // 最終奥義。全員完全回復 + 全状態異常回復 + 魔法防御+50%（2ターン）。
        // 次に受けるダメージを1回だけ半減させるバリアも付与する。
        public static class Skill_MiracleBlessing
        {
            public const string Name        = "奇跡の祝福";
            public const string Desc        = "全員のHPを完全に回復し、すべての状態異常を除去する。魔法防御+50%（2ターン）＋次の被ダメ1回を50%軽減するバリアを付与。";
            public const float  HealPower   = 9999f;   // 完全回復を意味する特殊値
            public const float  MagDefBonus = 0.50f;
            public const int    Duration    = 2;
            public const int    MPCost      = 44;
        }

        // ── パッシブ ─────────────────────────────────────────────────────

        // 癒しの心得: 全ての回復スキルの効果量+25%（常時）。
        public static class Passive_HealingMastery
        {
            public const string Name      = "癒しの心得";
            public const string Desc      = "すべての回復魔法の効果量が25%上昇する。";
            public const float  HealBonus = 0.25f;
        }

        // 自動慈愛: ターン終了時、最もHP%が低い味方に自動で小回復を行う。
        // MP不消費。回復量はMagATK×0.30。
        public static class Passive_AutoCompassion
        {
            public const string Name      = "自動慈愛";
            public const string Desc      = "毎ターン終了時、最もHP残量の少ない味方にMagATK×0.30の回復を自動で行う（MP消費なし）。";
            public const float  HealMult  = 0.30f;
        }

        // ── ボイス・フィールドセリフ ──────────────────────────────────────
        public static class VoiceLines
        {
            public const string BattleStart1    = "lilia_battle_start_1";  // 「みんなを守ります！」
            public const string BattleStart2    = "lilia_battle_start_2";  // 「ここは私に任せて」
            public const string UseHeal         = "lilia_heal";             // 「どうか、癒えて」
            public const string UseRevive       = "lilia_revive";           // 「まだ終わりじゃないよ！」
            public const string UseHolyAttack   = "lilia_holy";             // 「聖光、裁け！」
            public const string LowAllyHP       = "lilia_low_ally";         // 「大丈夫！今すぐ！」
            public const string AllyRevived     = "lilia_revive_success";   // 「よかった……！」
            public const string LowHP           = "lilia_low_hp";           // 「……まだ祈れます」
            public const string Victory         = "lilia_victory";           // 「皆さんご無事で良かった」
            public const string Defeat          = "lilia_defeat";            // 「ごめんなさい……守れなかった」
            public const string LevelUp         = "lilia_level_up";          // 「神様、ありがとうございます」
        }

        public static class FieldDialogue
        {
            public const string MeetBernhard   = "lilia_meet_bernhard";  // 「傷を見せてください、すぐ治します」
            public const string MeetLavinia    = "lilia_meet_lavinia";   // 「ヴェルクロア様、また無理しないでくださいね」
            public const string MeetAsh        = "lilia_meet_ash";       // 「アッシュさんって、実はとても優しいですよね」
            public const string AshReply       = "lilia_ash_reply";      // 「へ？口が減らない子だ……」
            public const string Rest           = "lilia_rest";           // 「少し休みましょう。体が資本ですよ」
            public const string FindUndead     = "lilia_undead";         // 「アンデッドには……私がやります！」
            public const string AfterBattle    = "lilia_after_battle";   // 「お疲れ様でした。怪我はないですか？」
        }

        // ── HD-2D Sprite Specification ────────────────────────────────────
        //
        // オクトパストラベラー / ドラゴンクエストI&II HD-2D スタイル準拠。
        // ドット絵制作者・アニメーター向けの詳細仕様書。
        //
        // 【スタイル基準】
        //   • 1キャラ最大32色パレット（透明色含む）
        //   • 輪郭線: 1px 温かい深茶（#3A2810）。冷たい黒を避けて柔らかさを演出
        //   • ハイライト輪郭: 暖白（#FFF8F0）
        //   • シェーディング: フラット2段階 + 光源ハイライト1段階（光源: 右上45°）
        //   • アニメーション: 4fps 基調（回復スキルは6-8fps）
        //   • URP SpriteRenderer:
        //     - 杖の水晶クラスター: EmissionMap で HolyDim→HolyGlow に変化
        //     - 胸の聖印（青十字ブローチ）: HolyGlow と同期して微光
        //     - 自動慈愛パッシブ発動時: 水晶から小さな光粒子がパーティ側へ飛ぶ
        //       （パーティクルシステムで処理。スプライト行は不要）
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
            // 髪（イチゴミルク色 / ピンクがかったシャンパンブロンド）
            public const string HairDeep        = "#C08860";   // 三つ編み奥・根元
            public const string HairBase        = "#D8A07A";   // 基本色
            public const string HairMid         = "#ECC090";   // 中間（ウェーブの山）
            public const string HairLight       = "#F8D8B0";   // 明部
            public const string HairHighlight   = "#FFF0D8";   // 最明・毛先ハイライト
            public const string HairPinkSheen   = "#F0C0B0";   // ピンクがかった光沢
            // 肌（明るく柔らかい）
            public const string SkinHighlight   = "#FFE8D0";   // 最明部
            public const string SkinMid         = "#F8D0B0";   // 中間
            public const string SkinShadow      = "#E0B090";   // 影（顎下・目元）
            public const string SkinDeep        = "#C89070";   // 深影（首根元）
            // 瞳（琥珀色/蜂蜜色）
            public const string EyeHighlight    = "#FFE8A0";   // ハイライト点
            public const string EyeIrisLight    = "#D4A840";   // 虹彩 明
            public const string EyeIris         = "#B08030";   // 虹彩（琥珀）
            public const string EyeIrisDeep     = "#806020";   // 虹彩 深
            public const string EyePupil        = "#402808";   // 瞳孔
            // 白ローブ（純白〜温かいオフホワイト）
            public const string WhiteBright     = "#FFFFFB";   // ハイライト
            public const string WhiteBase       = "#F8F4EE";   // 基本白
            public const string WhiteShadow     = "#E8E0D4";   // 影（ドレープ）
            public const string WhiteDeep       = "#D0C8BC";   // 深影（深いヒダ）
            public const string WhiteDarkest    = "#B8B0A4";   // 最暗部（布の折り重なり）
            // 金刺繍・金装飾
            public const string GoldBright      = "#F8D860";   // 刺繍 最明
            public const string GoldMid         = "#D8A820";   // 刺繍 中間
            public const string GoldShadow      = "#A88018";   // 刺繍 影
            public const string GoldDeep        = "#806010";   // 刺繍 深影
            // 水色アクセント（アンダースカート・聖印・水晶）
            public const string BlueAccentLight = "#C0E8FF";   // 最明（聖光グロウ）
            public const string BlueAccentMid   = "#80C8F0";   // 中間
            public const string BlueAccentBase  = "#50A0D8";   // 基本（スカート・ブローチ）
            public const string BlueAccentDeep  = "#3070A8";   // 深影
            // 杖の水晶グロウ（聖光 — スキル連動Emission）
            public const string HolyGlow        = "#E0F8FF";   // 最明部（回復・蘇生MAX）
            public const string HolyCrystal     = "#A0D8FF";   // 水晶 中間
            public const string HolyMid         = "#60B8F0";   // 通常発光
            public const string HolyDim         = "#3890C8";   // 待機時微光
            // 天使の翼（暖かい白）
            public const string WingBright      = "#FFFFFC";   // 最明・羽先
            public const string WingBase        = "#F0ECD8";   // 羽の基本
            public const string WingShadow      = "#D8D0B8";   // 羽の影
            public const string WingDeep        = "#B8B0A0";   // 羽の付け根・奥
            // 茶革（ベルト・ブーツ）
            public const string LeatherHighlight= "#A06030";   // 明部
            public const string LeatherMid      = "#804820";   // 中間
            public const string LeatherShadow   = "#603010";   // 影
            public const string LeatherDeep     = "#402008";   // 深影・縫い目
            // 金ベル・バックル
            public const string BellGold        = "#F0D060";   // ベル 明
            public const string BellGoldShadow  = "#C0A020";   // ベル 影
            // 輪郭・環境
            public const string OutlineMain     = "#3A2810";   // 温かい深茶（冷黒を避ける）
            public const string OutlineHighlight= "#FFF8F0";   // 逆光輪郭（暖白）
            public const string ShadowAmbient   = "#C8C0B0";   // 環境影（床・足元）

            // ── バトルスプライト アニメーション仕様 ────────────────────────
            //
            // Sprite Sheet レイアウト: 横8列 × 縦n行、各セル 64×96 px
            //
            // ★ 全アニメーション共通: 鐘の表現
            //   杖のベルは大きく動くフレームで1〜2px揺れる。
            //   スキル発動時はベルが大きく左右に揺れ、光の波紋が周囲に1px広がる。
            //   （音エフェクトのビジュアルヒント）
            //
            // Row 0  — アイドル (Idle)
            //   フレーム数 : 4  /  fps : 4
            //   内容       : ふわりとした小刻みなお辞儀リズム（0.5px 上下）。
            //                ドレスの裾が2〜3px幅でゆっくり揺れる。
            //                髪の毛先と三つ編みが1px 左右ドリフト（f2, f4）。
            //                杖水晶が HolyDim で優しく明滅（2f周期）。
            //                微笑みの表情を維持。
            //
            // Row 1  — 前進 (StepForward)
            //   フレーム数 : 4  /  fps : 6
            //   内容       : 小さく素早い歩幅（スカートが揺れ、内側の水色が見える）。
            //                杖を縦に持ち、聖典を胸に抱えながら歩く。
            //
            // Row 2  — 通常攻撃・聖光弾 (HolyBolt)
            //   フレーム数 : 5  /  fps : 8
            //   内容       : f1=杖を前方へゆっくり向ける（攻撃は苦手な仕草で）、
            //                f2=水晶が HolyMid→HolyGlow に輝度上昇、
            //                f3=光弾を発射（1フレームの全体フラッシュ: WhiteBright）、
            //                f4=杖先からの光跡がまだ残っている（HolyCrystal の細い線1px）、
            //                f5=待機に戻る。少し照れたような顔（攻撃は本業外）。
            //
            // Row 3  — 回復スキル・単体 (HealSingle)
            //   フレーム数 : 6  /  fps : 8
            //   内容       : f1-f2=杖を頭上に掲げ、ベルが小さく揺れる（1px）、
            //                f3=水晶が HolyGlow に点灯。十字形の光が杖先に浮かぶ
            //                   （白く輝く小さな+形、3×3px相当）、
            //                f4=温かい光の波が味方へ向かって広がる（半透過の白円弧）、
            //                f5=杖を胸の前に引き戻し、ほっとした表情、
            //                f6=待機に戻る。
            //
            // Row 4  — 回復スキル・全体 (HealAll)
            //   フレーム数 : 8  /  fps : 8
            //   内容       : f1=聖典を片手で開き視線を落とす（詠唱準備）、
            //                f2-f3=杖と聖典を両手で掲げる（翼が最大限に広がる描写）、
            //                f4=HolyGlow が水晶から溢れ、翼全体が WhiteBright に近づく、
            //                f5=1フレームの全体ホワイトフラッシュ（治癒の光の爆発）、
            //                f6-f7=金の光粒が上から降り注ぐ（GoldMid の小さな点が4〜6個）、
            //                f8=待機に戻る。「皆さん、大丈夫ですか？」な表情。
            //
            // Row 5  — 蘇生 (Revive)
            //   フレーム数 : 8  /  fps : 6
            //   内容       : f1-f2=膝を曲げ、倒れた仲間に手を伸ばす姿勢
            //                   （スカートが地面に広がる）、
            //                f3=杖を地面に突き立てる。ベルが大きく揺れる
            //                   （ベルが左右に2〜3px振れる最大振れフレーム）、
            //                f4=翼が左右に大きく広がる（最大展開フレーム）、
            //                f5=HolyGlow の光柱が杖から真上に伸びる（細い輝く線）、
            //                f6=水晶から光が下方向にも拡散（仲間の方へ向かう）、
            //                f7=立ち上がりながら安堵の表情に変わる、
            //                f8=待機に戻る。
            //
            // Row 6  — 支援バフ（守護の祈り/聖域） (Support)
            //   フレーム数 : 6  /  fps : 8
            //   内容       : f1-f2=聖典を開いて詠唱（目を閉じてテキストを読む仕草）、
            //                f3-f4=聖典のページから文字のような光の断片が上昇
            //                   （GoldBright の小さな点×3〜4）、
            //                f5=杖の十字部分が HolyMid で輝き、バフの光が対象に向かう、
            //                f6=待機に戻る。穏やかな表情。
            //
            // Row 7  — ガード (Guard)
            //   フレーム数 : 2  /  fps : 4
            //   内容       : 杖を両手で胸の前に横にかざす（天使の翼が前面に向く）。
            //                翼が WhiteBright に輝き、バリアを張る描写。
            //                水晶が HolyMid でパルス（1フレームずつ HolyMid↔HolyGlow）。
            //
            // Row 8  — ダメージ (Hurt)
            //   フレーム数 : 3  /  fps : 8
            //   内容       : f1=後退（1px 後ろへ）。聖典が揺れる。スカートが前へ。
            //                f2=眉を少し寄せた心配顔（痛みより仲間を気にする表情）、
            //                f3=すぐに表情を戻す。杖を構え直す。
            //                1フレーム白フラッシュ。
            //
            // Row 9  — 瀕死 (LowHP)
            //   フレーム数 : 4  /  fps : 4
            //   内容       : 聖典を胸にぎゅっと抱く、前傾みの姿勢。
            //                水晶の輝きが HolyDim の半分程度に落ちちらつく。
            //                「まだ祈れます」の表情: 少し眉が寄っているが微笑みは消えない。
            //
            // Row 10 — 戦闘不能 (KO)
            //   フレーム数 : 2  /  fps : 4
            //   内容       : ゆっくりと膝をついて横向きに倒れる（f1）。
            //                スカートが地面に広がる。聖典が胸の前で半開き（f2）。
            //                水晶の光が完全に消える。ベルが静止。
            //
            // Row 11 — 勝利 (Victory)
            //   フレーム数 : 6  /  fps : 8
            //   内容       : f1-f2=くるりと1回転するスピン（スカートが大きく広がる
            //                   最大フレーム: スカートの裾が左右に64pxに広がる表現）、
            //                f3-f4=両手を胸の前で合わせた感謝の祈りポーズ、
            //                f5=パーティを振り向いての元気な笑顔、
            //                f6=蝶の髪飾りをそっと触って整える。
            //
            // Row 12 — 奇跡の祝福（最終奥義） (MiracleBlessing)
            //   フレーム数 : 8  /  fps : 8
            //   内容       : f1=両膝をついて頭を垂れる（深いおじぎ・祈りの最大表現）、
            //                f2-f3=杖がゆっくり自力で浮き上がる（杖を手放す動作）、
            //                   翼が両側に完全展開（最大幅フレーム）、
            //                f4=HolyGlow MAX。スプライト全体が一時的に WhiteBright に近づく、
            //                f5=杖を中心に十字形の光が4方向に伸びる
            //                   （十字光の腕 = 各10px）、
            //                f6=金のベルが大きく鳴る（ベルが最大振れ×2、GoldBright フラッシュ）、
            //                f7=光の輪が外側に広がって消える
            //                   （HolyCrystal → BlueAccentLight → 消失の順）、
            //                f8=杖が手に戻り、頭を上げると穏やかな表情。目に光が宿っている。
            //
            // ★ 自動慈愛パッシブ（毎ターン末専用演出）
            //   スプライト行ではなくパーティクルシステムで処理:
            //   杖水晶から GoldMid (#D8A820) → HolyGlow (#E0F8FF) のグラデーションの
            //   小さな光粒（2×2px相当）が最低HP%の味方キャラへ曲線飛行する。
            //   飛行時間 = 0.5秒。飛び着いた後に小さなハートの閃光（HolyGlow 1フレーム）。
            //
            // ── ポートレート仕様 (96×96 px) ─────────────────────────────────
            //   バスト〜肩のアップ。正面向き（ヒーラーとして仲間に向き合う）。
            //   表情: 柔らかい微笑み。目がわずかにうるうる（濡れた琥珀の表現）。
            //   背景: 大聖堂のステンドグラス光（白×水色×金の光が斜めに差す）。
            //   静止1枚 + 感情別バリアント 5枚:
            //     [Gentle]     柔らかい微笑み（基本）
            //     [Determined] 小さいながらも決意に満ちた表情（「私がやります！」）
            //     [Worried]    眉が寄ってやや涙目（仲間が危険な時）
            //     [Happy]      満面の笑顔・目が細くなる（蘇生成功後）
            //     [Embarrassed]頬が僅かに赤い照れ顔（「え、褒めてくれてるんですか？」）
            //
            // ── フィールドスプライト仕様 (32×48 px) ─────────────────────────
            //   アイドル: 2フレーム（ドレス裾の小揺れ）
            //   歩行: 4方向 × 4フレーム（スカートが揺れる）
            //   杖を縦に持ち、聖典を小脇に抱えたフォルム
            //
            // ── エミッションマップ ─────────────────────────────────────────
            //   発光部位: 杖の水晶クラスター + 胸の聖印（青十字ブローチ）
            //   通常時    : HolyDim (#3890C8) で低輝度の温かい点灯
            //   回復スキル: HolyCrystal (#A0D8FF) に輝度上昇
            //   全体回復/蘇生/奥義: HolyGlow (#E0F8FF) に全開（最大輝度）
            //   聖印とクラスターは EmissionColor を同期して同時に輝く
            public const string EmissionColorIdle   = HolyDim;
            public const string EmissionColorHeal   = HolyCrystal;
            public const string EmissionColorMax    = HolyGlow;

            // ── 武器スプライト バリアント ────────────────────────────────────
            //   WeaponSprites配列インデックス:
            //   [0] 通常の杖（天光の杖アルミア）— 翼折りたたみ状態、水晶微光
            //   [1] 回復詠唱中の杖 — 翼が少し開く、水晶 HolyCrystal 点灯
            //   [2] 奥義発動中の杖 — 翼完全展開、水晶 HolyGlow 全開、ベル揺れ最大
        }
    }
}
