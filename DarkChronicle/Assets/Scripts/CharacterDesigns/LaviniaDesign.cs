/*
 * ─────────────────────────────────────────────────────────────────────────
 *   DARK CHRONICLE — キャラクター設計書 #002
 *   ラヴィニア・ヴェルクロア (Lavinia Velcroix)   通称: ラヴィニア
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   ◆ 概要
 *   王立魔術院の元首席研究官。禁忌の契約によって人知を超えた魔力を得たが、
 *   その代価として己の寿命を少しずつ支払い続けている。
 *   圧倒的な魔法火力と属性対応力を誇る純粋な魔法アタッカー。
 *   打たれ弱さと引き換えに「誰も真似できない火力」を提供する。
 *
 *   ◆ 設計コンセプト
 *   • MagATK全キャラ最高、HP/DEF全キャラ最低の完全ガラス砲
 *   • 6属性すべてを習得できる属性カバレッジ最強
 *   • スキル種類はほぼ攻撃魔法のみ（12種中10種が攻撃）
 *   • 固有システム「元素共鳴」で前のターンの属性が次の威力を左右する
 *   • 「高速詠唱」でSPDも全キャラ2位。先手を取って落とす戦法
 *   • MPが潤沢なうちは最強、枯渇すると詰む。リソース管理が肝
 *
 *   ◆ ビジュアル設定（HD-2Dドット絵 確定版）
 *   • 年齢: 36歳（外見は28歳相当。契約の影響で老いにくい）
 *   • 身長: 169cm / 体格: 細身、優雅な所作
 *   • 腰まで届く深い群青黒の長髪（青みがかったハイライト）、流れるように垂らし
 *     前髪を片目に掛けて非対称に。細い銀のチェーン飾り・ピン・小さな宝石が髪に散る
 *   • 氷のように鋭く冷たい氷青色の瞳（左右同色）。切れ長で感情を映さない眼差し
 *   • 銀チェーンのイヤリング、氷青のサファイアペンダント
 *   • 装備一式:
 *     - 肩/胸: 深紺黒の甲冑（金の唐草細工刻印）+ 肩にワタリガラスの黒羽根装飾
 *     - 胴: 深紫/ダークプラムのコルセット（銀バックル）
 *     - アウター: 裾まで届く深紺の大コート（金縁）、内側に星空模様と青白く光るルーン文字
 *     - 足: 黒レースのサイハイストッキング + 銀装飾の黒ロングブーツ（菱形ルーン刻印）
 *     - ベルト: 茶革ベルト。小型魔導書・紫魔法薬・巻物・革袋を吊り下げ
 *   • 武器: 「断界の杖エルデヴィント」（左手）
 *     暗い木地の長杖、先端は三日月/鎌状の金属頭、青い雫型水晶がチェーンで下がり
 *     三日月部分にワタリガラスが1羽止まっている
 *   • 魔導書（右手）: 青いルーンが燃え上がるように光るページを開いた状態で保持
 *   • 足元: 召喚時に展開する氷青の魔法陣（ルーン刻印の輝く円）
 *   • テーマカラー: 深夜群青 × 金装飾 × 氷青魔力 × 深紫コルセット
 *   ※ スプライト仕様の詳細は SpriteSpec クラスを参照
 *
 *   ◆ 性格
 *   • 知性と品格を前面に出した話し方。敬語と距離感を保つ
 *   • 短慮を嫌い、感情的な言動を「品がない」とする
 *   • しかし危機時には驚くほど冷静で、合理的な判断が速い
 *   • 密かに甘いものに目がない（旅の中でボロが出ていく）
 *   • ベルンハルトの不器用な誠実さを「稀有な資質」と内心評価している
 *
 *   ◆ 物語
 *   第1章「禁断の対価」
 *     → 契約した悪魔が出した「次の要求」を巡り、主人公たちと行動を共にする理由が語られる
 *   第2章「学院の影」
 *     → 暗黒の森で、かつての同僚の亡霊が現れ、研究院を去った真相が明かされる
 *   第3章「切り札の裏側」
 *     → 己の寿命が残り少ないことを初めて仲間に打ち明け、最後の覚悟を決める
 *   第4章「呪縛の解呪」
 *     → 契約の悪魔と最終対決。「力を捨てて普通の寿命を生きるか」「短命でも強くあり続けるか」の選択
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.CharacterDesigns
{
    public static class LaviniaDesign
    {
        // ── Identity ───────────────────────────────────────────────────────
        public const string CharacterName = "ラヴィニア・ヴェルクロア";
        public const string NickName      = "ラヴィニア";
        public const string VoicePrefix   = "Lavinia";
        public const string StaffName     = "断界の杖エルデヴィント";

        // ── Base Stats (Level 1) ───────────────────────────────────────────
        // 全キャラ中: MagATK1位 / Speed2位 / HP最低 / PhysDEF最低
        public static readonly CharacterStats BaseStats = new()
        {
            MaxHP           = 280,   // ベルン450との差が185。一撃で致命傷になりうる
            MaxMP           = 200,   // 全キャラ最高。MPこそが彼女の生命線
            PhysicalAttack  = 8,     // ほぼ役に立たない
            MagicAttack     = 55,    // ベルン12の4倍以上。別格
            PhysicalDefense = 8,     // 最低。物理1発で大ダメージ
            MagicDefense    = 18,    // 知識で多少は防げる
            Speed           = 22,    // ベルン18より速い。先手が命綱
            Luck            = 15,    // 契約の恩恵か、運命に愛されている
            CriticalRate    = 12,    // 魔法会心が多め。後述の固有でさらに上昇
            AccuracyRate    = 98,    // 魔法は当たる。当然。
        };

        // ── Growth Rates (per level) ───────────────────────────────────────
        public static readonly CharacterStats GrowthRates = new()
        {
            MaxHP           = 14,    // 非常に低い。Lv50でもHP980程度
            MaxMP           = 12,    // 全キャラ最高。後半は魔法を惜しみなく使える
            PhysicalAttack  = 1,
            MagicAttack     = 6,     // 全キャラ最高。Lv50でMagATK355
            PhysicalDefense = 1,
            MagicDefense    = 2,
            Speed           = 1,
            Luck            = 1,
            CriticalRate    = 0,
            AccuracyRate    = 0,
        };

        // ═══════════════════════════════════════════════════════════════════
        //   スキル全12種 + 強化版12種
        //   内訳: 炎2 / 氷2 / 雷1 / 風1 / 闇1 / 光1 / 複合2 / 支援2
        //   ほぼ攻撃魔法。回復ゼロ。支援は自己強化か妨害のみ。
        // ═══════════════════════════════════════════════════════════════════

        // ■ 炎属性 ──────────────────────────────────────────────────────────
        public static class Skill_FireBolt
        {
            public const string Name        = "火炎弾";
            public const string NameUpgrade = "灼熱火炎弾";
            public const string Desc        = "標準的な炎の弾を放つ。130%の炎属性魔法ダメージ。";
            public const string DescUpgrade = "威力160%。炎上確率が30%に上昇し、燃え広がりやすくなる。";
            public const ElementType Element = ElementType.Fire;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 1.30f;
            public const float BasePowerU   = 1.60f;
            public const int   HitCount     = 1;
            public const int   MPCost       = 8;
            public const int   MPCostU      = 8;     // 同コストで強化
            public const float BurnChance   = 0.15f;
            public const float BurnChanceU  = 0.30f;
            public const bool  CanBreak     = true;  // 炎弱点の敵に対して
            public const int   JobLevelReq  = 1;
            public const int   JPCost       = 0;     // 初期習得
        }

        public static class Skill_Inferno
        {
            public const string Name        = "業火";
            public const string NameUpgrade = "煉獄の業火";
            public const string Desc        = "すべての魔力を凝縮した炎の柱。300%の炎属性ダメージ。詠唱が重い。";
            public const string DescUpgrade = "威力400%。炎上が確定付与され、HP10%以下の敵には即死判定10%。";
            public const ElementType Element = ElementType.Fire;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 3.00f;
            public const float BasePowerU   = 4.00f;
            public const int   MPCost       = 32;
            public const int   MPCostU      = 34;
            public const float BurnChance   = 0.60f;
            public const float BurnChanceU  = 1.00f;  // 確定
            public const bool  CanBreak     = true;
            public const int   JobLevelReq  = 8;
            public const int   JPCost       = 250;
        }

        // ■ 氷属性 ──────────────────────────────────────────────────────────
        public static class Skill_IceSpike
        {
            public const string Name        = "氷棘";
            public const string NameUpgrade = "氷晶閃";
            public const string Desc        = "鋭い氷柱を放つ。140%の氷属性ダメージ、20%で凍結。";
            public const string DescUpgrade = "3本の氷柱に変化し、各60%×3ヒット。凍結確率35%。各ヒットがBreakに有効。";
            public const ElementType Element = ElementType.Ice;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 1.40f;
            public const float BasePowerU   = 0.60f;   // ×3ヒット
            public const int   HitCount     = 1;
            public const int   HitCountU    = 3;
            public const int   MPCost       = 10;
            public const int   MPCostU      = 12;
            public const float FreezeChance = 0.20f;
            public const float FreezeChanceU= 0.35f;
            public const bool  CanBreak     = false;
            public const bool  CanBreakU    = true;
            public const int   JobLevelReq  = 2;
            public const int   JPCost       = 60;
        }

        public static class Skill_Blizzard
        {
            public const string Name        = "氷嵐";
            public const string NameUpgrade = "極氷嵐";
            public const string Desc        = "吹雪で全敵を包む。全体に100%の氷属性ダメージ、凍結した敵の速度を下げる。";
            public const string DescUpgrade = "全体130%。凍結確率が25%上昇、さらに全敵のSpeed-20%(2ターン)。";
            public const ElementType Element = ElementType.Ice;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 1.00f;
            public const float BasePowerU   = 1.30f;
            public const bool  HitsAllEnemies = true;
            public const int   MPCost       = 18;
            public const int   MPCostU      = 20;
            public const float FreezeChance = 0.15f;
            public const float FreezeChanceU= 0.40f;
            public const int   JobLevelReq  = 5;
            public const int   JPCost       = 150;
        }

        // ■ 雷属性 ──────────────────────────────────────────────────────────
        public static class Skill_ChainLightning
        {
            public const string Name        = "連鎖雷撃";
            public const string NameUpgrade = "超電磁連鎖";
            public const string Desc        = "雷を走らせ敵から敵へ連鎖する。2体を180%で貫通。25%で麻痺。";
            public const string DescUpgrade = "3体まで連鎖し各210%。麻痺確率45%。麻痺した敵への追撃+1回。";
            public const ElementType Element = ElementType.Lightning;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 1.80f;
            public const float BasePowerU   = 2.10f;
            public const int   ChainCount   = 2;
            public const int   ChainCountU  = 3;
            public const int   MPCost       = 16;
            public const int   MPCostU      = 18;
            public const float ParalyzeChance  = 0.25f;
            public const float ParalyzeChanceU = 0.45f;
            public const bool  CanBreak     = true;
            public const int   JobLevelReq  = 6;
            public const int   JPCost       = 180;
        }

        // ■ 風属性 ──────────────────────────────────────────────────────────
        public static class Skill_GaleBlade
        {
            public const string Name        = "風刃嵐";
            public const string NameUpgrade = "暴嵐風刃";
            public const string Desc        = "風の刃で全敵を切り刻む。全体に90%×2ヒット、命中率が高い。";
            public const string DescUpgrade = "全体95%×3ヒット。全敵の速度-15%(2ターン)を付与する。";
            public const ElementType Element = ElementType.Wind;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 0.90f;
            public const float BasePowerU   = 0.95f;
            public const int   HitCount     = 2;
            public const int   HitCountU    = 3;
            public const bool  HitsAllEnemies = true;
            public const int   MPCost       = 20;
            public const int   MPCostU      = 22;
            public const bool  CanBreak     = true;
            public const int   JobLevelReq  = 7;
            public const int   JPCost       = 200;
        }

        // ■ 闇属性 ──────────────────────────────────────────────────────────
        public static class Skill_DarkWave
        {
            public const string Name        = "暗黒波";
            public const string NameUpgrade = "冥府の暗黒波";
            public const string Desc        = "絶対に外れない闇の波動。200%の闇属性ダメージ。必中。";
            public const string DescUpgrade = "威力240%。ダメージの20%を自分のHPとして吸収する。";
            public const ElementType Element = ElementType.Dark;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 2.00f;
            public const float BasePowerU   = 2.40f;
            public const int   MPCost       = 22;
            public const int   MPCostU      = 24;
            public const bool  NeverMiss    = true;  // 必中フラグ
            public const float DrainRatioU  = 0.20f; // 強化版: 吸収
            public const bool  CanBreak     = true;
            public const int   JobLevelReq  = 9;
            public const int   JPCost       = 240;
        }

        // ■ 光属性 ──────────────────────────────────────────────────────────
        public static class Skill_HolyBlaze
        {
            public const string Name        = "聖光閃";
            public const string NameUpgrade = "天啓の聖光";
            public const string Desc        = "清浄な光で単体を焼く。160%の光属性ダメージ。アンデッド・悪魔系に1.5倍。";
            public const string DescUpgrade = "全体に90%の光属性。アンデッド・悪魔系への倍率が2倍になる。";
            public const ElementType Element = ElementType.Light;
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 1.60f;
            public const float BasePowerU   = 0.90f;
            public const bool  HitsAllEnemiesOnUpgrade = true;
            public const float UndeadMultiplier  = 1.50f;
            public const float UndeadMultiplierU = 2.00f;
            public const bool  CanBreak     = true;
            public const int   MPCost       = 20;
            public const int   MPCostU      = 24;
            public const int   JobLevelReq  = 10;
            public const int   JPCost       = 280;
        }

        // ■ 複合・上位魔法 ──────────────────────────────────────────────────
        public static class Skill_ArcaneBurst
        {
            public const string Name        = "魔力爆発";
            public const string NameUpgrade = "完全魔力爆発";
            public const string Desc        = "属性を持たない純粋な魔力の爆発。防御を10%無視、280%の真実ダメージ。残MPが多いほど威力上昇。";
            public const string DescUpgrade = "威力380%、防御30%無視。さらにMP残量が70%以上なら追加で1.5倍。";
            public const ElementType Element = ElementType.None;
            public const DamageType  DmgType = DamageType.True;
            public const float BasePower    = 2.80f;
            public const float BasePowerU   = 3.80f;
            public const int   MPCost       = 30;
            public const int   MPCostU      = 32;
            // MPスケーリング: (currentMP / maxMP) を係数として掛ける
            public const bool  ScalesWithMP = true;
            public const float MPScaleMin   = 0.70f;  // MP30%以下: 0.7倍
            public const float MPScaleMax   = 1.30f;  // MP100%: 1.3倍
            public const float IgnoreDefense = 0.10f;
            public const float IgnoreDefenseU= 0.30f;
            public const bool  CanBreak     = false;
            public const int   JobLevelReq  = 11;
            public const int   JPCost       = 320;
        }

        public static class Skill_ElementalConverge
        {
            // 「元素収束」: 直前に使用した属性とは異なる属性でさらに大威力を出す
            // 元素共鳴システムとの直接シナジースキル
            public const string Name        = "元素収束";
            public const string NameUpgrade = "完全元素収束";
            public const string Desc        =
                "直前に放った属性と反応する属性の魔法を収束させる。元素共鳴中は威力1.5倍。\n" +
                "炎後→氷(蒸気爆発), 氷後→雷(帯電氷), 雷後→炎(超過熱)で追加ダメージ+50%。\n" +
                "基本威力: 220%";
            public const string DescUpgrade =
                "威力280%、反応ボーナス+50%→+80%。さらに全元素共鳴スタックを消費して爆発。";
            public const ElementType Element = ElementType.None;  // 直前属性に変化する
            public const DamageType  DmgType = DamageType.Magical;
            public const float BasePower    = 2.20f;
            public const float BasePowerU   = 2.80f;
            public const float ResonanceMult = 1.50f;
            public const float ResonanceMultU= 1.80f;
            public const float ElementReactBonus   = 0.50f;
            public const float ElementReactBonusU  = 0.80f;
            public const int   MPCost       = 26;
            public const int   MPCostU      = 28;
            public const int   JobLevelReq  = 12;
            public const int   JPCost       = 380;
        }

        // ■ 支援魔法（少数） ────────────────────────────────────────────────
        public static class Skill_ManaAcceleration
        {
            public const string Name        = "魔力加速";
            public const string NameUpgrade = "超魔力加速";
            public const string Desc        = "自分の速度+40%、魔法会心率+20%（3ターン）。詠唱の流れを加速する。";
            public const string DescUpgrade = "速度+50%、会心+30%、魔法攻撃力+20%（4ターン）。";
            public const int   MPCost       = 12;
            public const int   MPCostU      = 14;
            public const int   BuffTurns    = 3;
            public const int   BuffTurnsU   = 4;
            public const int   SpeedBuff    = 40;  // %
            public const int   SpeedBuffU   = 50;
            public const int   CritBuff     = 20;
            public const int   CritBuffU    = 30;
            public const int   MagAtkBuffU  = 20;  // 強化版のみ
            public const int   JobLevelReq  = 3;
            public const int   JPCost       = 80;
        }

        public static class Skill_CurseOfSilence
        {
            public const string Name        = "沈黙の呪詛";
            public const string NameUpgrade = "完全沈黙";
            public const string Desc        = "1体の敵に沈黙を付与する（3ターン）。命中率が高い。スキルを封じる。";
            public const string DescUpgrade = "全体に沈黙2ターン付与。ボスには1ターンのみ有効。";
            public const int   MPCost       = 14;
            public const int   MPCostU      = 18;
            public const bool  HitsAllEnemiesOnUpgrade = true;
            public const int   SilenceTurns = 3;
            public const int   SilenceTurnsU= 2;   // 全体化の代わりに短縮
            public const float SuccessRate  = 0.85f;
            public const float SuccessRateU = 0.90f;
            public const int   JobLevelReq  = 4;
            public const int   JPCost       = 100;
        }

        // ■ 固有パッシブ (2種) ──────────────────────────────────────────────
        public static class Passive_ArcaneMastery
        {
            public const string Name = "魔法の極意";
            public const string Desc =
                "【パッシブ】魔法会心時のダメージボーナスが+100%（通常+50%→+150%）。" +
                "また、魔法攻撃力/5の値が会心率に加算される（MagATK100で+20%会心）。";
            public const int JobLevelReq = 8;
            public const int JPCost      = 280;
        }

        public static class Passive_OverloadedCasting
        {
            public const string Name = "過負荷詠唱";
            public const string Desc =
                "【パッシブ】MPが最大値の60%以上: 全魔法コスト-2、Speed+10%。" +
                "MPが最大値の40%以下: 魔法攻撃力+25%（窮地での覚醒）。";
            public const int JobLevelReq = 5;
            public const int JPCost      = 160;
        }

        // ── Allowed Weapons & Armor ────────────────────────────────────────
        public static readonly WeaponType[] AllowedWeapons =
        {
            WeaponType.Staff,
            WeaponType.Tome,
        };

        public static readonly ArmorType[] AllowedArmors =
        {
            ArmorType.Robe,
        };

        // ── Story Chapter Titles ───────────────────────────────────────────
        public static readonly string[] ChapterTitles =
        {
            "禁断の対価",
            "学院の影",
            "切り札の裏側",
            "呪縛の解呪",
        };

        // ── Voice Lines ────────────────────────────────────────────────────
        public static class VoiceLines
        {
            public const string BattleStart_01  = "Lavinia_BattleStart_01";  // "さて、始めましょうか。"
            public const string BattleStart_02  = "Lavinia_BattleStart_02";  // "あなたたちでは、私には届かない。"
            public const string Attack_Fire     = "Lavinia_Attack_Fire";     // "赴くまま、燃え尽きなさい。"
            public const string Attack_Ice      = "Lavinia_Attack_Ice";      // "冷えなさい。"
            public const string Attack_Thunder  = "Lavinia_Attack_Thunder";  // "…走れ。"
            public const string Attack_Wind     = "Lavinia_Attack_Wind";     // "薙ぎ払いなさい。"
            public const string Attack_Dark     = "Lavinia_Attack_Dark";     // "これが闇よ。"
            public const string Attack_Light    = "Lavinia_Attack_Light";    // "光あれ。…綺麗でしょう？"
            public const string Skill_Inferno   = "Lavinia_Inferno";         // "全て、灰に。"
            public const string Skill_ArcaneBurst = "Lavinia_ArcaneBurst";   // "これが私の全力よ。"
            public const string Skill_Converge  = "Lavinia_Converge";        // "共鳴した。…収束。"
            public const string Resonance_Trigger = "Lavinia_Resonance";     // "元素が響き合う…！"
            public const string ManaAccel       = "Lavinia_ManaAccel";       // "急ぎましょう。"
            public const string Boost_01        = "Lavinia_Boost_01";        // "奥の手を使うわ。"
            public const string Boost_02        = "Lavinia_Boost_02";        // "…契約の力を借りる。"
            public const string LowHP_01        = "Lavinia_LowHP_01";        // "…まずい。私としたことが。"
            public const string LowHP_02        = "Lavinia_LowHP_02";        // "これ以上は…さすがにね。"
            public const string LowMP           = "Lavinia_LowMP";           // "…魔力が切れかけている。不覚。"
            public const string Crit            = "Lavinia_Crit";            // "そこね。"
            public const string Victory_01      = "Lavinia_Victory_01";      // "予想通りの結末ね。"
            public const string Victory_02      = "Lavinia_Victory_02";      // "…今日のところは、ね。"
            public const string Defeat          = "Lavinia_Defeat";          // "…まだ、足りなかったか。"
            public const string GetRelic        = "Lavinia_GetRelic";        // "使えそうね。研究が必要だけれど。"
            public const string ShopComment     = "Lavinia_Shop";            // "知識に投資するのは、悪い選択ではないわ。"
            public const string RestSite        = "Lavinia_Rest";            // "…甘いものはないかしら。聞かなかったことにして。"
        }

        // ── Field Dialogue ─────────────────────────────────────────────────
        public static class FieldLines
        {
            public const string OnEnterFloor1 =
                "廃墟、ね。知識は滅びないわ。石が崩れても、記録は残る。…この場所にも、まだ何かが眠っているはずよ。";
            public const string OnEnterFloor2 =
                "この森の魔力密度は異常ね。…あの研究所のデータと一致する。見覚えのある場所だわ。";
            public const string OnEnterFloor3 =
                "呪われた城。詩的な名前ね。…いいえ、これは比喩ではない。本物の呪いが城を包んでいる。感じる？";
            public const string ToBernhard =
                "ベルンハルト、あなたは本当に不器用ね。…褒めているのよ。その誠実さは、そう簡単には手に入らない。";
            public const string PreBossLine =
                "契約の悪魔が近い。…怖いか、ですって？ふふ。私は怖くないわ。ただ、少し…後悔しているだけよ。";
            public const string AfterBossVictory =
                "…終わったわ。本当に。ねえ、ベルン。約束して。私が消えた後も、ちゃんと前を向くと。…バカね、泣かないで。";
        }

        // ── HD-2D Sprite Specification ────────────────────────────────────
        //
        // オクトパストラベラー / ドラゴンクエストI&II HD-2D スタイル準拠。
        // ドット絵制作者・アニメーター向けの詳細仕様書。
        //
        // 【スタイル基準】
        //   • 1キャラ最大32色パレット（透明色含む）
        //   • 輪郭線: 1px 深黒（#06060C）、ハイライト輪郭に薄青白（#D8E8F4）
        //   • シェーディング: フラット2段階 + 光源ハイライト1段階（光源: 右上45°）
        //   • アニメーション: 4fps 基調（詠唱は8fps）
        //   • URP SpriteRenderer: 魔法陣・杖水晶・書のEmissionMapで青白く常時発光
        //   • 杖の水晶 → 常時 RuneMid でゆらゆら明滅 (sin波)
        //   • 書のページ → スキル発動時に RuneGlow に輝度爆発
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
            // 髪（深い群青黒 + 青みハイライト）
            public const string HairDeepest     = "#06080E";   // 最暗部・毛束の奥
            public const string HairBase        = "#0A0C16";   // 基本色
            public const string HairMid         = "#141A2A";   // 青みが出る中間域
            public const string HairBlueSheen   = "#1E2C42";   // 光沢・ハイライト
            public const string HairHighlight   = "#2A3C5A";   // 最明部（前髪先端）
            // 肌（冷たいトーン）
            public const string SkinHighlight   = "#F8EDE0";   // 最明部
            public const string SkinMid         = "#EDD8C0";   // 中間
            public const string SkinShadow      = "#D4B89C";   // 影（顎下・瞼）
            public const string SkinDeep        = "#B89880";   // 深影（首根元）
            // 瞳（氷青）
            public const string EyeHighlight    = "#E8F8FF";   // ハイライト点
            public const string EyeIrisLight    = "#B8E4FF";   // 虹彩 明
            public const string EyeIris         = "#78C4F0";   // 虹彩
            public const string EyeIrisDeep     = "#4898D0";   // 虹彩 深
            public const string EyePupil        = "#2868A8";   // 瞳孔
            // 甲冑（深紺黒 + 金装飾）
            public const string ArmorDeepest    = "#080C14";   // 最暗部・裏地
            public const string ArmorBase       = "#10162A";   // 基本色
            public const string ArmorMid        = "#1A2238";   // 中間
            public const string ArmorHighlight  = "#243050";   // ハイライト面
            // 金装飾
            public const string GoldBright      = "#F0D870";   // 最明部
            public const string GoldMid         = "#D0AA38";   // 中間
            public const string GoldShadow      = "#A88428";   // 影
            public const string GoldDeep        = "#806218";   // 深影
            // コルセット（深紫/ダークプラム）
            public const string CorsetLight     = "#5A2870";   // ハイライト面
            public const string CorsetMid       = "#3C1858";   // 中間色
            public const string CorsetShadow    = "#2A1040";   // 影
            public const string CorsetDeep      = "#1A0830";   // 深影・縫い目
            // 大コート内側（星空模様）
            public const string CoatBase        = "#08101C";   // ベース深夜
            public const string CoatMid         = "#10182C";   // 中間
            public const string CoatStarFaint   = "#3060A0";   // 細かい星（暗）
            public const string CoatStarBright  = "#5080C8";   // 大きい星（明）
            // 魔法陣・ルーングロウ（氷青）
            public const string RuneGlow        = "#C0E0FF";   // 最明部（Emission）
            public const string RuneCore        = "#80C8FF";   // 核
            public const string RuneMid         = "#3890E8";   // 周縁
            public const string RuneDeep        = "#1060C0";   // 根本
            // ワタリガラスの羽（黒 + 光沢）
            public const string FeatherBlack    = "#0A0A10";   // 最暗部
            public const string FeatherBase     = "#14141E";   // 基本
            public const string FeatherSheen    = "#20202E";   // 羽のエッジ光沢
            // ブーツ（黒 + 銀装飾）
            public const string BootBase        = "#141418";   // ブーツ本体
            public const string BootMid         = "#1C1C22";   // ハイライト
            public const string SilverLight     = "#D0D8E0";   // 銀 明部
            public const string SilverMid       = "#909AA0";   // 銀 中間
            public const string SilverDeep      = "#606870";   // 銀 影
            // 杖（暗い木材 + 水晶）
            public const string StaffWoodDeep   = "#201008";   // 木地 最暗
            public const string StaffWoodBase   = "#361A0C";   // 木地 基本
            public const string StaffWoodLight  = "#4A2412";   // 木地 ハイライト
            public const string StaffCrystal    = "#80C4FF";   // 水晶 明
            public const string StaffCrystalDeep= "#3880D0";   // 水晶 深
            // 革小物（茶色系）
            public const string LeatherBase     = "#5A3018";   // 革 中間
            public const string LeatherDeep     = "#3E2010";   // 革 影
            public const string LeatherLight    = "#7A4822";   // 革 明
            // 薬瓶
            public const string PotionLiquid    = "#9030D0";   // 紫液体
            public const string PotionGlow      = "#B860F0";   // 瓶の発光
            // 輪郭・環境
            public const string OutlineMain     = "#06060C";   // メイン輪郭
            public const string OutlineHighlight= "#D8E8F4";   // 逆光輪郭
            public const string ShadowAmbient   = "#0C0E18";   // 環境影・足元

            // ── バトルスプライト アニメーション仕様 ────────────────────────
            //
            // Sprite Sheet レイアウト: 横8列 × 縦n行、各セル 64×96 px
            //
            // Row 0  — アイドル (Idle)
            //   フレーム数 : 4
            //   fps        : 4
            //   内容       : ほんのり浮遊感（全体を0.5px上下に揺らす・呼吸リズム）。
            //                コートの裾と髪の先端が僅かにゆらゆらドリフト（1px幅）。
            //                足元の魔法陣が2f周期でゆっくり輝度変化（0.8→1.0→0.8…）。
            //                杖水晶がRuneMid→RuneCore でsin波明滅。
            //
            // Row 1  — 前進 (StepForward)
            //   フレーム数 : 4
            //   fps        : 8
            //   内容       : 地面を滑るように前進（ジャンプせず）。
            //                コートの裾と髪が動きの後を追って流れる（1〜2fラグ）。
            //
            // Row 2  — 通常攻撃 (Attack) — 魔力弾
            //   フレーム数 : 5
            //   fps        : 10
            //   内容       : f1=杖を前に突き出す構え、f2=先端水晶が急激に明滅
            //                (RuneGlow全体点灯)、f3=ルーン弾が発射される
            //                (杖先から前方に小さな球が飛ぶ、1px×1px の光点)、
            //                f4=書を1枚パラリとめくる仕草（魔法完了の所作）、
            //                f5=待機に戻る。
            //
            // Row 3  — スキル発動（単体/全体属性魔法） (SkillMagic)
            //   フレーム数 : 8
            //   fps        : 8
            //   内容       : f1=魔導書を前に開いてページを見下ろす、
            //                f2=書のページ全体がRuneGlow で点灯、
            //                f3=足元の魔法陣が大きく拡大して輝く（魔法陣を1.5倍スケール）、
            //                f4=杖を高々と掲げる（画面上部方向）、
            //                f5=水晶3連射（光の粒×3が横に流れる）、
            //                f6=大きな光球が前方に炸裂（メインエフェクトフレーム）、
            //                f7=残留パーティクル（RuneCore が小さく4つ散る）、
            //                f8=待機に戻る。
            //
            // Row 4  — 元素収束 / 高威力詠唱 (ElementalConverge)
            //   フレーム数 : 8
            //   fps        : 10
            //   内容       : f1=目を閉じる（2px幅の細い線で閉眼表現）、
            //                f2=頭上と周囲に複数の属性色光球が出現（炎/氷/雷の3色各1球）、
            //                f3=光球が杖先に向かって収束し始める、
            //                f4=収束完了・杖先で爆発的な光（全パレット色混合→白化）、
            //                f5=目を開ける（EyeGlowで瞳の輝度MAX）、
            //                f6=エネルギーが前方に放出（横方向の大きなフラッシュライン）、
            //                f7=後方に髪と羽が大きく乱れる残像、
            //                f8=待機に戻る（魔法陣が点滅して消える）。
            //
            // Row 5  — 防御/バリア (Guard)
            //   フレーム数 : 2
            //   fps        : 4
            //   内容       : 書を正面に翳してバリアを張る。RuneCore が書の周囲を淡く包む。
            //
            // Row 6  — ダメージ (Hurt)
            //   フレーム数 : 3
            //   fps        : 8
            //   内容       : f1=後退・髪が乱れる（左右に1px）、
            //                f2=眉が寄ったわずかな苦悶表情（通常時と差し替えの顔）、
            //                f3=素早く表情を元に戻す（冷たい無表情に即リセット）。
            //                全体を1フレームだけ白フラッシュ。
            //
            // Row 7  — 瀕死 (LowHP)
            //   フレーム数 : 4
            //   fps        : 4
            //   内容       : 前傾みが増し、杖に体重を掛けるような姿勢。
            //                魔法陣の輝度が50%に落ちてちらつく（f2とf4で暗くなる）。
            //                髪が乱れたまま（ダメージ後の状態を維持）。
            //
            // Row 8  — 戦闘不能 (KO)
            //   フレーム数 : 2
            //   fps        : 4
            //   内容       : ゆっくり膝をつく（横倒れではなく、崩れ落ちるイメージ）。
            //                書が地面に落ちてページが開いたまま。魔法陣が完全消灯。
            //
            // Row 9  — 勝利 (Victory)
            //   フレーム数 : 6
            //   fps        : 8
            //   内容       : f1-f2=書を静かに閉じる、f3=杖を体の前に垂直に立てる、
            //                f4=わずかに目を細める（勝利の表情・口角1px上げ）、
            //                f5-f6=コートが風を受けたように大きく広がる。
            //                魔法陣が小さく点滅してゆっくり消える。
            //
            // Row 10 — 過負荷詠唱発動 / 禁忌の力 (ContractPower)
            //   フレーム数 : 4
            //   fps        : 12
            //   内容       : 契約の力を解放する特殊演出。全体が一瞬コントラスト逆転
            //                （黒が白、白が黒）し、CorsetMid→CorsetLight に明るくなる、
            //                RuneGlow が全身の輪郭線に沿って走り抜ける（1px 縁取り変化）、
            //                最後に元の状態に戻る（4fで完結）。
            //
            // ── ポートレート仕様 (96×96 px) ─────────────────────────────────
            //   バスト〜肩のアップ。左向き（ベルンハルトと向き合う配置）。
            //   表情: 冷たく落ち着いた、心の内を見せない半眼。
            //   背景: 深夜群青（#08101C）+ 上部に魔法陣光の環。
            //   静止1枚 + 感情別バリアント 5枚:
            //     [Normal]   冷静な半眼（基本）
            //     [Thinking] 少し目を細めた分析顔
            //     [Surprise] 目を少し見開く（滅多に出ない表情）
            //     [Pain]     眉が微かに寄った苦悶（感情を抑えている）
            //     [Warm]     口角が少し上がった珍しい表情（仲間への信頼シーン）
            //     [Intense]  魔力全開・目が発光している（契約解放演出用）
            //
            // ── フィールドスプライト仕様 (32×48 px) ─────────────────────────
            //   アイドル: 2フレーム（コート裾の小揺れ）
            //   歩行: 4方向 × 4フレーム（滑るような歩き方）
            //   杖は常に携帯（左手に縮小表示）
            //   魔法陣: フィールドでは非表示
            //
            // ── エミッションマップ ─────────────────────────────────────────
            //   発光部位: 杖の水晶 / 魔導書のページ / 足元の魔法陣 / ネックレス
            //   通常時: RuneMid (#3890E8) で低輝度
            //   スキル発動時: RuneGlow (#C0E0FF) に輝度最大化
            //   (MaterialPropertyBlock で EmissionColor をコルーチン制御)
            public const string EmissionColorIdle  = RuneMid;
            public const string EmissionColorSkill = RuneGlow;

            // ── 武器スプライト バリアント ────────────────────────────────────
            //   WeaponSprites配列インデックス:
            //   [0] 通常状態の杖（断界の杖エルデヴィント）— 三日月頭、水晶2個吊り下げ
            //   [1] 魔力加速状態  — 杖全体が RuneCore 色の薄いオーラを帯びる
            //   [2] 業火発動      — 杖頭に炎エフェクト（橙系3色）が巻きつく
            //   [3] 元素収束発動  — 杖頭で複数属性色の光球が合成中の状態
        }
    }
}
