/*
 * ─────────────────────────────────────────────────────────────────────────
 *   DARK CHRONICLE — キャラクター設計書 #001
 *   ベルンハルト (Bernhard)   通称: ベルン
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   ◆ 概要
 *   元王国騎士団長。滅亡した王国の生き残りとして、贖罪の旅に出た中堅の剣士。
 *   攻撃・防御・魔法を一通り修めた「教科書通りの完成形」だが、
 *   その完成度こそが彼の武器。尖った才能はないが、何をやらせても水準以上。
 *   ラン後半の強化が積み重なるほど「安定して強い」性能に仕上がる。
 *
 *   ◆ 設計コンセプト
 *   • スキル習得数が最多 (12種 + 固有パッシブ3種)
 *   • 物理・防御・少量の魔法を全部カバー
 *   • 器用貧乏に見えて「ハイスタンダード」な最終スペック
 *   • 初心者が使いやすく、上級者が深く使い込める
 *   • BoostとBreakの基礎が学べるチュートリアル的ポジション
 *
 *   ◆ ビジュアル設定（HD-2Dドット絵 確定版）
 *   • 年齢: 28歳 / 身長: 184cm / 体格: がっしりした筋肉質・堂々とした立ち姿
 *   • 金色がかった中くらいの長さの髪、わずかな無精髭、灰みがかった青い瞳
 *   • 銀白色の重装甲冑（金色の細工彫刻、胸部と肩に青く輝くルーン文字刻印）
 *   • 鮮やかな緋色のマント（背中から翻る）
 *   • 武器: 片手ロングソード「断罪剣テオドリク」（左手で下方に構える）
 *   • 盾: 「廃王の護盾」（赤地に銀のグリフィン＋王冠の紋章、右手保持）
 *   • テーマカラー: 銀甲冑 × 緋マント × 金装飾 × 青いルーングロウ
 *   ※ スプライト仕様の詳細は SpriteSpec クラスを参照
 *
 *   ◆ 性格
 *   • 寡黙かつ誠実。余計なことは言わないが、必要なことは必ず言う
 *   • 自己評価が低い（「俺はただの兵士だ」）
 *   • 料理が得意（外見とのギャップが仲間に愛される）
 *   • 怒りはほとんど表に出さないが、無実の民が傷つくと沸点を超える
 *
 *   ◆ 物語
 *   第1章「灰燼の誓い」
 *     → 廃墟と化した王都に戻り、宮廷内の裏切り者の痕跡を追う
 *   第2章「暗森の亡霊」
 *     → 暗黒の森で、死んだはずの元部下の幻影と対峙する
 *   第3章「呪われた戴冠式」
 *     → 呪われた城で、すべての元凶である「魔王に成り果てた旧友」と決着をつける
 *   第4章「贖罪の果て」
 *     → 真実が明かされ、生き残るべきか死に赴くべきかの選択を迫られる
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.CharacterDesigns
{
    // ─── このファイルはEditor専用の設計定数置き場 ──────────────────────────
    // 実際のScriptableObjectはBernhardSOGeneratorから生成される。
    public static class BernhardDesign
    {
        // ── Identity ───────────────────────────────────────────────────────
        public const string CharacterName  = "ベルンハルト";
        public const string NickName       = "ベルン";
        public const string VoicePrefix    = "Bernhard";
        public const string WeaponName     = "断罪剣テオドリク";
        public const string ShieldName     = "廃王の護盾";

        // ── Base Stats (Level 1) ───────────────────────────────────────────
        // 全キャラ中: HP1位 / DEF1位 / SPD3位 / MP最低 / MagATK最低
        public static readonly CharacterStats BaseStats = new()
        {
            MaxHP           = 450,
            MaxMP           = 80,
            PhysicalAttack  = 35,
            MagicAttack     = 12,
            PhysicalDefense = 28,
            MagicDefense    = 20,
            Speed           = 18,
            Luck            = 12,
            CriticalRate    = 8,
            AccuracyRate    = 92,
        };

        // ── Growth Rates (per level) ───────────────────────────────────────
        // 平均より高いHP/DEF成長・低いMP/MagATK成長・普通のSpeed
        public static readonly CharacterStats GrowthRates = new()
        {
            MaxHP           = 30,   // ±2 variance in-game
            MaxMP           = 3,
            PhysicalAttack  = 4,
            MagicAttack     = 1,
            PhysicalDefense = 4,
            MagicDefense    = 2,
            Speed           = 1,
            Luck            = 1,
            CriticalRate    = 0,    // no crit growth; crit comes from skills/relics
            AccuracyRate    = 0,
        };

        // ── Skill Roster ───────────────────────────────────────────────────
        // 12技 + 固有パッシブ3種 = 計15習得可能
        // 物理8 + 魔法2 + 支援2 + パッシブ3

        // ■ 初期スキル群 (JobLevel 1-3) ─────────────────────────────────────
        public static class Skill_DoubleSlash
        {
            public const string Name        = "二段斬り";
            public const string NameUpgrade = "二段斬り＋";
            public const string Desc        = "素早く2回斬りかかる。シンプルだが確実な技。";
            public const string DescUpgrade = "3回の連続斬撃に変化し、安定したダメージを与える。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.Physical;
            public const float BasePower    = 0.80f;   // ×2hit
            public const float BasePowerU   = 0.82f;   // ×3hit
            public const int   HitCount     = 2;
            public const int   HitCountU    = 3;
            public const int   MPCost       = 4;
            public const int   MPCostU      = 4;       // 同コストで強化
            public const bool  CanBreak     = false;
            public const int   JobLevelReq  = 1;
            public const int   JPCost       = 0;       // 初期習得
            public const string AnimTrigger = "DoubleSlash";
        }

        public static class Skill_ShieldBash
        {
            public const string Name        = "盾砕き";
            public const string NameUpgrade = "盾砕き＋";
            public const string Desc        = "盾で強打し、敵の防御体制を崩す。シールドを2つ削る。";
            public const string DescUpgrade = "シールドを3つ削り、麻痺の確率がさらに高まる。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.Physical;
            public const float BasePower    = 0.60f;
            public const float BasePowerU   = 0.65f;
            public const int   HitCount     = 1;
            public const int   MPCost       = 5;
            public const bool  CanBreak     = true;
            public const int   ShieldDamage = 2;
            public const int   ShieldDamageU = 3;
            public const float StunChance   = 0.30f;
            public const float StunChanceU  = 0.45f;
            public const int   JobLevelReq  = 1;
            public const int   JPCost       = 50;
            public const string AnimTrigger = "ShieldBash";
        }

        public static class Skill_DefensiveStance
        {
            public const string Name        = "守りの構え";
            public const string NameUpgrade = "鉄壁の構え";
            public const string Desc        = "防御態勢を取る。物理防御+40%、速度-20%（2ターン）。";
            public const string DescUpgrade = "物理防御+60%かつ魔法防御+20%。速度低下なし。";
            public const int   MPCost       = 6;
            public const int   MPCostU      = 8;
            public const bool  IsHeal       = false;
            public const int   JobLevelReq  = 2;
            public const int   JPCost       = 60;
            public const string AnimTrigger = "DefStance";
        }

        // ■ 中級スキル群 (JobLevel 4-6) ─────────────────────────────────────
        public static class Skill_WarCry
        {
            public const string Name        = "雄叫び";
            public const string NameUpgrade = "覇気の雄叫び";
            public const string Desc        = "気合いの一喝で味方全員の物理攻撃力を3ターン+25%。";
            public const string DescUpgrade = "物理攻撃力+25%に加え、魔法攻撃力も+15%上昇する。";
            public const int   MPCost       = 10;
            public const int   MPCostU      = 12;
            public const bool  HitsAllAllies = true;
            public const int   JobLevelReq  = 4;
            public const int   JPCost       = 100;
            public const string AnimTrigger = "WarCry";
        }

        public static class Skill_HeavyStrike
        {
            public const string Name        = "強撃";
            public const string NameUpgrade = "渾身の強撃";
            public const string Desc        = "力を溜めた一撃。220%の高威力。クリティカル率+20%。";
            public const string DescUpgrade = "威力が280%に上昇。急所を突く確率がさらに高まる。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.Physical;
            public const float BasePower    = 2.20f;
            public const float BasePowerU   = 2.80f;
            public const int   HitCount     = 1;
            public const int   MPCost       = 12;
            public const int   MPCostU      = 14;
            public const int   CritBonus    = 20;
            public const bool  CanBreak     = false;
            public const int   JobLevelReq  = 5;
            public const int   JPCost       = 120;
            public const string AnimTrigger = "HeavyStrike";
        }

        public static class Skill_Whirlwind
        {
            public const string Name        = "旋風斬";
            public const string NameUpgrade = "暴嵐旋風斬";
            public const string Desc        = "剣を大きく振り回し、全敵を90%の威力で斬りつける。Break効果あり。";
            public const string DescUpgrade = "威力110%に上昇。Breakヒット数も増加する。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.Physical;
            public const float BasePower    = 0.90f;
            public const float BasePowerU   = 1.10f;
            public const int   HitCount     = 1;
            public const bool  HitsAllEnemies = true;
            public const bool  CanBreak     = true;
            public const int   MPCost       = 14;
            public const int   MPCostU      = 16;
            public const int   JobLevelReq  = 6;
            public const int   JPCost       = 150;
            public const string AnimTrigger = "Whirlwind";
        }

        // ■ 上級スキル群 (JobLevel 7-9) ─────────────────────────────────────
        public static class Skill_FlameBlade
        {
            public const string Name        = "炎の刃";
            public const string NameUpgrade = "灼熱の炎刃";
            public const string Desc        = "剣に炎を纏わせた物理と魔法の中間技。150%の炎属性ダメージ。その後2ターン攻撃に炎を付与。";
            public const string DescUpgrade = "威力170%。炎付与が3ターンに延長、炎上付与確率も上昇。";
            public const ElementType Element = ElementType.Fire;
            public const DamageType  DmgType = DamageType.Physical;   // hybrid: uses (PhysATK + MagATK)/2
            public const float BasePower    = 1.50f;
            public const float BasePowerU   = 1.70f;
            public const int   MPCost       = 16;
            public const int   MPCostU      = 18;
            public const float BurnChance   = 0.25f;
            public const float BurnChanceU  = 0.40f;
            public const int   JobLevelReq  = 7;
            public const int   JPCost       = 180;
            public const string AnimTrigger = "FlameBlade";
        }

        public static class Skill_RapidBarrage
        {
            public const string Name        = "百烈斬";
            public const string NameUpgrade = "千烈斬";
            public const string Desc        = "休みなく5連撃を叩き込む。各ヒットがBreakに有効。";
            public const string DescUpgrade = "7連撃に増加。最後の一撃が特大ダメージ（×2倍）になる。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.Physical;
            public const float BasePower    = 0.55f;
            public const float BasePowerU   = 0.55f;   // 最後の1撃だけ×2
            public const int   HitCount     = 5;
            public const int   HitCountU    = 7;
            public const bool  CanBreak     = true;
            public const int   MPCost       = 18;
            public const int   MPCostU      = 20;
            public const int   JobLevelReq  = 8;
            public const int   JPCost       = 200;
            public const string AnimTrigger = "RapidBarrage";
        }

        public static class Skill_ThunderEdge
        {
            public const string Name        = "雷迸り";
            public const string NameUpgrade = "雷神の迸り";
            public const string Desc        = "雷光を帯びた横薙ぎ。全敵に110%の雷属性魔法ダメージ、40%で麻痺。";
            public const string DescUpgrade = "威力130%。麻痺確率60%、さらにBP+1を自分に付与。";
            public const ElementType Element = ElementType.Lightning;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 1.10f;
            public const float BasePowerU   = 1.30f;
            public const bool  HitsAllEnemies = true;
            public const float ParalyzeChance = 0.40f;
            public const float ParalyzeChanceU= 0.60f;
            public const int   MPCost       = 20;
            public const int   MPCostU      = 20;
            public const int   JobLevelReq  = 9;
            public const int   JPCost       = 220;
            public const string AnimTrigger = "ThunderEdge";
        }

        // ■ 最高峰スキル群 (JobLevel 10-12) ─────────────────────────────────
        public static class Skill_SovereignBlade
        {
            public const string Name        = "覇剣";
            public const string NameUpgrade = "絶対覇剣";
            public const string Desc        = "真の剣士のみが会得できる、魂を込めた一太刀。350%の真実ダメージ。";
            public const string DescUpgrade = "威力450%。Break中の敵にさらに+50%の追加ダメージ。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.True;        // 防御無視
            public const float BasePower    = 3.50f;
            public const float BasePowerU   = 4.50f;
            public const int   HitCount     = 1;
            public const int   MPCost       = 28;
            public const int   MPCostU      = 30;
            public const bool  CanBreak     = false;
            public const int   JobLevelReq  = 10;
            public const int   JPCost       = 350;
            public const string AnimTrigger = "SovereignBlade";
        }

        public static class Skill_EarthBastion
        {
            public const string Name        = "大地の盾";
            public const string NameUpgrade = "神盾・大地の城壁";
            public const string Desc        = "大地の魔力を借りた珍しい支援魔法。味方全員の魔法防御+30%、HP10%回復。";
            public const string DescUpgrade = "魔法防御+30%かつ物理防御+20%。回復量がHP15%に増加。";
            public const int   MPCost       = 22;
            public const int   MPCostU      = 24;
            public const bool  HitsAllAllies = true;
            public const bool  IsHeal        = true;
            public const float HealPower     = 0.10f;    // MaxHPの10%
            public const float HealPowerU    = 0.15f;
            public const int   JobLevelReq   = 11;
            public const int   JPCost        = 280;
            public const string AnimTrigger  = "EarthBastion";
        }

        // ■ 固有パッシブ (習得は通常スキルと同様) ────────────────────────────
        // パッシブはCharacterTraitsシステムで処理。スキルとして買うがBattle中は自動発動。

        public static class Passive_IndomitableWill
        {
            public const string Name = "不撓不屈";
            public const string Desc = "【パッシブ】1戦闘に1回だけ、致死ダメージを受けてもHP1で踏みとどまる。";
            public const int    JobLevelReq = 10;
            public const int    JPCost      = 300;
        }

        public static class Passive_BattleHardened
        {
            public const string Name = "歴戦の鎧";
            public const string Desc = "【パッシブ】攻撃を受けるたびに物理防御+3%（最大5スタック、戦闘ごとにリセット）。";
            public const int    JobLevelReq = 6;
            public const int    JPCost      = 180;
        }

        public static class Passive_IronConstitution
        {
            public const string Name = "鋼の肉体";
            public const string Desc = "【パッシブ】毒・出血によるダメージを30%軽減する。";
            public const int    JobLevelReq = 4;
            public const int    JPCost      = 120;
        }

        // ── Boost Interactions ─────────────────────────────────────────────
        // Boost時の各スキル追加効果（BattleManagerから参照）
        // Boost×1: ヒット数+1 or 威力+40%
        // Boost×2: ヒット数+2 or 威力+80%、バフ効果+1ターン延長
        // Boost×3: 効果2倍+追加エフェクト（技固有）
        // 覇剣Boost×3: 「全Break状態の敵に即死判定10%」
        // 雄叫びBoost×3: 「自分のATKも同時にUP」
        // 百烈斬Boost×3: 「スキルが全体ヒットになる」

        // ── Allowed Weapons ────────────────────────────────────────────────
        public static readonly WeaponType[] AllowedWeapons =
        {
            WeaponType.Sword,
            WeaponType.Axe,
            WeaponType.Spear,
            WeaponType.Fists,  // 素手もOK
        };

        // ── Allowed Armor ──────────────────────────────────────────────────
        public static readonly ArmorType[] AllowedArmors =
        {
            ArmorType.LightArmor,
            ArmorType.HeavyArmor,
            ArmorType.Shield,
        };

        // ── Story Chapter Titles ───────────────────────────────────────────
        public static readonly string[] ChapterTitles =
        {
            "灰燼の誓い",
            "暗森の亡霊",
            "呪われた戴冠式",
            "贖罪の果て",
        };

        // ── Voice Line Keys ────────────────────────────────────────────────
        public static class VoiceLines
        {
            public const string BattleStart_01  = "Bernhard_BattleStart_01";  // "行くぞ…！"
            public const string BattleStart_02  = "Bernhard_BattleStart_02";  // "退かない、退けない。"
            public const string Attack_01        = "Bernhard_Attack_01";       // "はぁ！"
            public const string Attack_02        = "Bernhard_Attack_02";       // "せい！"
            public const string Skill_Magic_01   = "Bernhard_Skill_Magic_01";  // "これは…魔法か。使えるが、本業ではない。"
            public const string Skill_Magic_02   = "Bernhard_Skill_Magic_02";  // "力を借りるぞ、大地よ。"
            public const string Boost_01         = "Bernhard_Boost_01";        // "本気を出す！"
            public const string Boost_02         = "Bernhard_Boost_02";        // "全力だ…！"
            public const string LowHP_01         = "Bernhard_LowHP_01";        // "まだ…まだだ！"
            public const string LowHP_02         = "Bernhard_LowHP_02";        // "倒れるわけにはいかない…！"
            public const string IndomitableWill  = "Bernhard_IndomitableWill"; // "死んでたまるか…！"
            public const string Break_Enemy      = "Bernhard_Break_Enemy";     // "崩した！今だ！"
            public const string Victory_01       = "Bernhard_Victory_01";      // "終わった。次に備えろ。"
            public const string Victory_02       = "Bernhard_Victory_02";      // "…俺はただの兵士だ。"
            public const string Defeat           = "Bernhard_Defeat";          // "すまない…もう少しだったのに…"
            public const string GetRelic         = "Bernhard_GetRelic";        // "使えそうだな。"
            public const string ShopComment      = "Bernhard_Shop_01";         // "必要なものだけ買え。余分な荷物は命取りだ。"
            public const string RestSite         = "Bernhard_Rest_01";         // "腰を下ろせ。飯は俺が作る。"
        }

        // ── Field Dialogue Samples ─────────────────────────────────────────
        // EventTriggerおよびNPCとの会話で使用するサンプル台詞
        public static class FieldLines
        {
            public const string OnEnterFloor1 =
                "…懐かしい石畳だ。王都の面影がある。だが、ここはもう別の場所だ。";
            public const string OnEnterFloor2 =
                "この森は生きている。俺には分かる。ここで死んだ者たちの気配がある。";
            public const string OnEnterFloor3 =
                "…お前も来たのか。{ALLY}。構わない。俺一人で終わらせられる問題でもないからな。";
            public const string PreBossLine =
                "ヴァルダー…。お前がそうなったのは、俺のせいだ。だからこそ、俺が終わらせる。";
            public const string AfterBossVictory =
                "終わった…。やっと終わった。…ありがとう、みんな。俺一人じゃ無理だった。";
        }

        // ── HD-2D Sprite Specification ────────────────────────────────────
        //
        // オクトパストラベラー / ドラゴンクエストI&II HD-2D スタイル準拠。
        // ドット絵制作者・アニメーター向けの詳細仕様書。
        //
        // 【スタイル基準】
        //   • 1キャラ最大32色パレット（透明色含む）
        //   • 輪郭線: 1px 黒系（#0A1018）、一部ハイライト輪郭に白系（#E8F0F4）
        //   • シェーディング: フラット2段階 + 光源ハイライト1段階（光源: 右上45°）
        //   • アニメーション: 4fps 基調（アクションは8fps）
        //   • URP SpriteRenderer: Normal Map なし、Emission マップで青いルーンを発光させる
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
            // 甲冑（銀白）
            public const string ArmorHighlight   = "#E8F0F4";   // 最明部・光沢ハイライト
            public const string ArmorLight       = "#C8D4DC";   // 明部
            public const string ArmorMid         = "#9AAAB8";   // 中間色
            public const string ArmorShadow      = "#6B8294";   // 影部
            public const string ArmorDeep        = "#3D5466";   // 深影・裏地
            // 金装飾
            public const string GoldHighlight    = "#F0D880";   // 金装飾 明部
            public const string GoldMid          = "#D4A843";   // 金装飾 中間
            public const string GoldShadow       = "#B88C35";   // 金装飾 影
            public const string GoldDeep         = "#8B6826";   // 金装飾 深影
            // 青いルーングロウ
            public const string RuneGlow         = "#9ADCFF";   // ルーン最明部（Emission）
            public const string RuneCore         = "#5CB8FF";   // ルーン中心
            public const string RuneMid          = "#3A8FE8";   // ルーン周縁
            public const string RuneDeep         = "#1A5CB8";   // ルーン根本
            // 緋色マント
            public const string CapeHighlight    = "#F04040";   // マント 明部
            public const string CapeMid          = "#C82020";   // マント 中間
            public const string CapeShadow       = "#961818";   // マント 影
            public const string CapeDeep         = "#641010";   // マント 深影・折り目
            // 髪（金色）
            public const string HairHighlight    = "#F0D880";   // 前髪ハイライト
            public const string HairMid          = "#D4A843";   // 髪 中間
            public const string HairShadow       = "#B88C35";   // 髪 影
            public const string HairDeep         = "#8B6826";   // 髪 根元・後ろ
            // 肌
            public const string SkinHighlight    = "#F8DDB8";   // 肌 明部
            public const string SkinMid          = "#EECBA0";   // 肌 中間
            public const string SkinShadow       = "#D4A87A";   // 肌 影（顎下・目元）
            public const string SkinDeep         = "#B88C64";   // 肌 深影・無精髭部
            // 瞳（灰みがかった青）
            public const string EyeHighlight     = "#C0DCE8";   // 瞳 ハイライト点
            public const string EyeIris          = "#7090A0";   // 虹彩
            public const string EyePupil         = "#3A5060";   // 瞳孔
            // 盾（赤地 + 銀紋章）
            public const string ShieldRed        = "#B82020";   // 盾 地色（赤）
            public const string ShieldRedShadow  = "#8B1818";   // 盾 赤 影
            public const string ShieldSilver     = "#C8D0D8";   // 盾 グリフィン紋章
            public const string ShieldSilverShad = "#A0B0BC";   // 盾 紋章 影
            public const string ShieldRim        = "#D4A843";   // 盾 縁取り（金）
            // 剣
            public const string BladeHighlight   = "#E8EEF0";   // 刃 ハイライト
            public const string BladeMid         = "#C0C8D0";   // 刃 中間
            public const string BladeShadow      = "#909A9E";   // 刃 影
            public const string BladeEdge        = "#68787C";   // 刃縁・溝
            public const string CrossguardGold   = "#D4A843";   // 鍔（金）
            // 輪郭・影全体
            public const string OutlineMain      = "#0A1018";   // メイン輪郭
            public const string OutlineHighlight = "#E8F0F4";   // 逆光輪郭（左辺）
            public const string ShadowAmbient    = "#1A2028";   // 環境影・足元影

            // ── バトルスプライト アニメーション仕様 ────────────────────────
            //
            // Sprite Sheet レイアウト: 横8列 × 縦n行、各セル 64×96 px
            //
            // Row 0  — アイドル (Idle)
            //   フレーム数 : 4
            //   fps        : 4
            //   内容       : 直立待機。胸部ルーンが2f周期でゆっくり明滅。
            //                マントが微風で1px波打つ（f2 と f4 で先端1px下移動）。
            //
            // Row 1  — 前進 (StepForward)
            //   フレーム数 : 4
            //   fps        : 8
            //   内容       : 1歩前に踏み出してから戻る。
            //                剣を肩に引きつつ半歩前進（f1-f2）→ 引き戻し（f3-f4）。
            //
            // Row 2  — 通常攻撃 (Attack)
            //   フレーム数 : 6
            //   fps        : 10
            //   内容       : f1=構え(膝を少し曲げる)、f2=大きく踏み込み剣を振り上げる、
            //                f3=振り下ろし最大速度(モーションブラー1px)、
            //                f4=当たり判定フレーム(剣先が敵位置)、
            //                f5=振り抜け後の腕伸ばし、f6=待機に戻る。
            //
            // Row 3  — スキル発動・物理 (SkillPhysical)
            //   フレーム数 : 8
            //   fps        : 10
            //   内容       : f1-f2=大きく腕を引き力を溜める動作、
            //                f3=剣が金色に光り始める（GoldHighlight で縁取り1px追加）、
            //                f4=爆発的踏み込み、f5-f6=連続斬り動作、
            //                f7=残像エフェクト(前フレームを50%透過コピー)、
            //                f8=待機に戻る。
            //
            // Row 4  — スキル発動・魔法 (SkillMagical)
            //   フレーム数 : 8
            //   fps        : 8
            //   内容       : f1-f2=盾を掲げて大地に足を踏みしめる、
            //                f3-f4=ルーン刻印が全体的に青く発光（RuneGlow 全面に拡大）、
            //                f5=ルーン光が剣先に集束、f6-f7=魔法放出動作、
            //                f8=待機に戻る。
            //
            // Row 5  — 防御 (Guard)
            //   フレーム数 : 2
            //   fps        : 4
            //   内容       : 盾を正面に構えて腰を落とす。盾が微光。
            //
            // Row 6  — ダメージ (Hurt)
            //   フレーム数 : 3
            //   fps        : 8
            //   内容       : f1=仰け反り（1px上+右にずれ）、f2=よろめき（中間）、
            //                f3=態勢を立て直す。全体を1フレームだけ白フラッシュ。
            //
            // Row 7  — 瀕死 (LowHP)
            //   フレーム数 : 4
            //   fps        : 4
            //   内容       : 膝を若干曲げ、前傾み姿勢。甲冑に傷痕ヒビを追加描画。
            //                2f周期でゆっくり揺れる（呼吸感）。
            //
            // Row 8  — 戦闘不能 (KO)
            //   フレーム数 : 2
            //   fps        : 4
            //   内容       : 倒れ込んだ状態（横向き）。マントが地面に広がる。
            //
            // Row 9  — 勝利 (Victory)
            //   フレーム数 : 6
            //   fps        : 8
            //   内容       : f1-f3=剣を天に突き上げる大きな動作、
            //                f4=剣先がルーン光で輝く(RuneCore エフェクト)、
            //                f5-f6=剣を下ろして仁王立ち。マントが大きく翻る。
            //
            // Row 10 — 不撓不屈発動 (IndomitableWill)
            //   フレーム数 : 4
            //   fps        : 12
            //   内容       : HP1で踏みとどまる演出。全体が一瞬白く消え、
            //                ルーン全体が強烈に点滅（RuneGlow最大輝度 → OutlineMain のサイクル×2）、
            //                最後に仁王立ちに戻る。
            //
            // ── ポートレート仕様 (96×96 px) ─────────────────────────────────
            //   バスト〜肩のアップ。右向き（ゲーム内会話UIに合わせて右向き）。
            //   表情: やや険しい目つき、口はしっかり閉じている。
            //   背景: 単色（ThemeColor #9B1C1C を80%透過）+ 右上に薄いルーングロウ放射。
            //   静止1枚 + 感情別バリアント 4枚:
            //     [Normal] 険しい表情（基本）
            //     [Serious] 眉を寄せた集中顔
            //     [Surprise] わずかに目を見開く
            //     [Pain] 歯を食いしばった苦悶
            //     [Calm] やや表情が和らいだ状態（仲間との会話シーン用）
            //
            // ── フィールドスプライト仕様 (32×48 px) ─────────────────────────
            //   アイドル: 2フレーム（体の微揺れ）
            //   歩行: 4方向 × 4フレーム
            //   光源: なし（フィールドはタイル照明に委ねる）
            //   マントは1〜2px揺れで表現
            //
            // ── エミッションマップ (バトルスプライト用) ──────────────────────
            //   ルーン刻印部分のみ EmissionMap を用意する。
            //   通常時: RuneMid (#3A8FE8) で微光
            //   スキル発動時: RuneGlow (#9ADCFF) に輝度を上げるアニメーション
            //   (UnityのMaterialPropertyBlockでEmission強度をコルーチンで変化)
            public const string EmissionColorIdle  = RuneMid;
            public const string EmissionColorSkill = RuneGlow;

            // ── 武器スプライト バリアント ────────────────────────────────────
            //   WeaponSprites配列インデックスと対応するスプライト内容:
            //   [0] 通常状態の剣（断罪剣テオドリク）— 金色クロスガード、直剣
            //   [1] 剣Boost状態 — 刃が金色オーラを帯びた演出（BladeMid全体をGoldMidに差し替え）
            //   [2] 炎の刃状態  — 刃先に炎エフェクト（オレンジ系2色）を重ねたスプライト
            //   [3] 雷迸り状態  — 刃に稲妻テクスチャ（RuneCore系の青）を重ねたスプライト
        }
    }
}
