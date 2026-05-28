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
    /// </summary>
    public static class LiliaDesign
    {
        // ── 基本情報 ──────────────────────────────────────────────────────
        public const string CharacterName = "リリア・アルバ";
        public const string VoicePrefix   = "lilia";

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
    }
}
