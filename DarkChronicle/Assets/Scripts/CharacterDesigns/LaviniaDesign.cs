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
 *   ◆ ビジュアル設定
 *   • 年齢: 36歳（外見は28歳相当。契約の影響で老いにくい）
 *   • 身長: 169cm / 体格: 細身、優雅な所作
 *   • 長い銀白の髪を緩くまとめ、右目には金色の瞳、左目は深紅（契約の証）
 *   • 深紫と黒を基調とした研究官のローブ、金刺繍が精緻
 *   • 杖: 「断界の杖エルデヴィント」— 先端に封印された悪魔の眼球が嵌まっている
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
    }
}
