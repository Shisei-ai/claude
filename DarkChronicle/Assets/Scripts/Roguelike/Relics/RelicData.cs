using UnityEngine;

namespace DarkChronicle.Roguelike.Relics
{
    // ── Relic Effect Catalogue ─────────────────────────────────────────────
    // Every unique effect a relic can have. Values are tuned per ScriptableObject.
    public enum RelicEffectType
    {
        // ─ Combat: Offense ───────────────────────────────────────────────
        FlatDamageUp,           // 全ダメージ+N
        PercentDamageUp,        // 全ダメージ+N%
        FirstHitDoubleDamage,   // 戦闘中最初の攻撃が2倍
        CritRateUp,             // クリティカル率+N%
        CritDamageUp,           // クリティカルダメージ+N%
        ExtraHitOnCrit,         // クリティカル時に追加ヒット
        OnKillHeal,             // 敵撃破時にHP回復
        OnKillBP,               // 敵撃破時にBP+1
        ExecuteLowHP,           // HP10%以下の敵を即死させる
        BonusDamageOnBreak,     // Break時ダメージ+N%
        FireDamageUp,           // 炎属性ダメージ+N%
        IceDamageUp,
        LightningDamageUp,
        DarkDamageUp,
        LightDamageUp,
        PoisonDamageUp,
        BleedDamageUp,
        MultiHitBonus,          // マルチヒット時に追加ダメージ
        LastStandDamage,        // HP50%以下で全ダメージ+50%

        // ─ Combat: Defense ───────────────────────────────────────────────
        FlatDefenseUp,          // 防御+N
        PercentDamageReduction, // 被ダメ-N%
        ThornsReflect,          // 受けたダメの一部を反射
        FirstHitImmune,         // 戦闘で最初に受けるダメージを無効
        ReviveOnce,             // 1回だけHP1で復活
        HealAtBattleStart,      // 戦闘開始時HP+N%回復
        RegenEachTurn,          // ターン開始時HP+N%
        ShieldPerFloor,         // 各フロアクリア時に防御バリア付与
        StatusImmunity,         // 特定状態異常を無効化
        BreakImmunity,          // Breakしない(ボスのみ、味方には不要)

        // ─ Boost / BP System ─────────────────────────────────────────────
        StartWithBP,            // 戦闘開始時BP+N
        BPGainUp,               // BP取得量+1
        BoostFree,              // 1戦闘に1回だけ無料Boost
        BoostDamageMultiplier,  // Boost時のダメージ倍率UP
        MaxBPUp,                // 最大BP+1

        // ─ Break System ──────────────────────────────────────────────────
        BreakDamageBonus,       // Break中の敵へ+N%追加
        ShieldHitBonus,         // Break攻撃でシールドを-2削る
        BreakExtend,            // Break状態が1ターン延長
        WeaknessReveal,         // 戦闘開始時に敵の弱点を全表示

        // ─ Economy / Run ────────────────────────────────────────────────
        GoldDropUp,             // 敵のゴールドドロップ+N%
        ShopDiscount,           // ショップ価格-N%
        FreeRemove,             // ショップでのスキル削除1回無料
        GoldToHP,               // 50Gごとに最大HP+1
        LuckUp,                 // LUCK+N (ドロップ・イベントに影響)
        ExtraLootChoice,        // 戦闘後の報酬選択肢+1個
        DuplicateRelic,         // 所持レリックのどれかのコピーを得る(取得時1回)

        // ─ Skill / Deck ──────────────────────────────────────────────────
        SkillMPDiscount,        // 全スキルMP消費-1(最低1)
        MPRegenEachTurn,        // ターン開始時MP+N
        StartWithFullMP,        // 戦闘開始時MP全回復
        RandomSkillBuff,        // ターン開始時ランダムスキルのパワー+50%
        EchoSkill,              // 1ターンに1回だけスキルがエコー(効果2回)
        NegateSkillCost,        // 一定確率でMPコストゼロ

        // ─ Luck / RNG ───────────────────────────────────────────────────
        LuckyDodge,             // LUCKに応じて回避率付与
        LuckyGold,              // イベント報酬がゴールドの場合1.5倍
        CursedButPowerful,      // 呪い1つ追加の代わりにダメージ+30%
        MiracleChance,          // 低確率で超強力なドロップ
        RiskRewardMaster,       // 呪いの部屋の報酬が2倍

        // ─ Floor / Stage ────────────────────────────────────────────────
        EliteReward,            // 強敵クリア後の報酬+1
        BossShield,             // ボス戦開始時にシールドバリア付与
        FloorClearHeal,         // フロアクリア時HP30%回復
        ShortcutKey,            // マップで1ノードスキップ可能
        RestEfficiencyUp,       // 野営地での回復量+N%

        // ─ Cursed Relics (強力だが代償あり) ──────────────────────────────
        VampiricBlade,          // ダメージの20%を吸収、でも最大HP-20%
        BerserkerRage,          // HPが低いほど攻撃力UP、防御-50%
        ForbiddenGrimoire,      // 全スキルのパワー2倍、MP2倍消費
        DeathMark,              // 2ターンで敵を即死させる、でも自分も被ダメ+25%
        SoulSiphon,             // 敵撃破時に魂を集め、10個でレリック獲得(1ラン1回)
        AncientCurse,           // 全ステータス+30%、毎部屋HP5%失う
        PhilosophersStone,      // 全ゴールドを2倍に、でも呪いを1つ追加

        // ─ Conditional Offense ───────────────────────────────────────────
        FirstTurnBoost,         // 1ターン目のみダメージ+50%
        StackingRage,           // 戦闘中攻撃ごとにダメージ+3%（最大10スタック）
        PoisonMaster,           // 毒状態の敵へのダメージ+30%
        BleedMaster,            // 出血状態の敵へのダメージ+30%
        ShadowStrike,           // 攻撃スキルに25%の確率で追加ヒット
        Opportunist,            // デバフ状態の敵への全ダメ+20%
        ExecuteOnBreak,         // Break中かつHP20%以下の敵を即死
        NecroticPower,          // 倒した敵の数×2%追加ダメ（ラン累積、最大+40%）
        CritChain,              // クリティカル後、次の攻撃のクリ率+30%
        SpiritualBalance,       // Sanity×10%攻撃力UP（最大+30%）

        // ─ Status Infliction ─────────────────────────────────────────────
        PoisonAura,             // 戦闘開始時に全敵に毒付与（3ターン、HP3%/ターン）
        BleedOnCrit,            // 攻撃時15%の確率で出血付与（2ターン、HP4%/ターン）
        BurnAura,               // 戦闘開始時に全敵に炎上付与（3ターン、HP2%/ターン）
        ChillAura,              // 戦闘開始時に全敵に凍結付与（2ターン）
        ThunderMark,            // 攻撃時20%の確率で麻痺付与（1ターン）

        // ─ Defense and Survival ──────────────────────────────────────────
        EvasionUp,              // 回避率+N%（PrimaryValueが%値）
        DamageCap,              // 1回のダメージを最大HPの20%に制限
        HealingFactor,          // 全回復量+25%
        Transcendence,          // 戦闘開始時にMaxHPの10%分のバリアを付与（FortifiedWallと累積）
        AdaptiveArmor,          // 被ダメを受けるたびに物理・魔法防御が3%UP（最大30%、戦闘ごとリセット）
        FortifiedWall,          // 戦闘開始時にMaxHPの10%分のバリアを付与（ダメージ吸収）
        LastStandGuard,         // HP20%以下の時、受けるダメージ-40%
        Counterstrike,          // ダメージを受けた時に15%の確率で全敵にMaxHPの10%の反撃

        // ─ BP and Boost Extended ─────────────────────────────────────────
        EfficientBoost,         // ブーストのBP消費-1（最低1）
        BoostExtend,            // ブーストの効果が1ターン延長
        BoostSurge,             // ブースト使用後、次のスキルのダメージ+30%
        BPOnBreak,              // 敵をBreakさせた時にBP+2

        // ─ Break Extended ────────────────────────────────────────────────
        QuickBreak,             // シールドへのダメージ+1（ShieldHitBonusと加算）
        BreakRegen,             // 敵がBreak中、ターン開始時にHP+5%回復
        BreakSeal,              // 敵をBreakさせた時、次の1ターンその敵のダメージを0にする

        // ─ Skill and Deck Extended ───────────────────────────────────────
        ManaOverflow,           // MPが最大の時、スキルの効果+20%
        SkillCopy,              // 1戦闘1回だけ、使用後にスキルが無料でもう一度発動
        JumpStart,              // 戦闘開始時、ランダムな1スキルのMP消費を0にする
        DeckPurify,             // スキルを削除するたびに全スキルの威力が永続+3%（最大+30%）
        ChainBonus,             // 3ターン連続スキル使用後、次のスキルのダメージが2倍
        CurseWeaver,            // 保有している呪いの数×10%、攻撃力UP
        SpecializedDeck,        // デッキが10枚以下の時、全スキルの効果+20%

        // ─ Exploration Effects ───────────────────────────────────────────
        EliteHunter,            // エリート戦闘後のゴールドが2倍
        TreasureNose,           // 宝の間のレリックのレアリティが1段階UP
        EventMaster,            // ランダムイベント終了後に追加で20G取得
        BlackMarket,            // ショップに呪われたレリックが1つ必ず追加される
        GoldShield,             // ダメージを最大50Gまでゴールドで相殺する

        // ─ Economy and Tactics ───────────────────────────────────────────
        CompoundInterest,       // 保有ゴールド100Gごとに敵ゴールドドロップ+1%（最大+10%）
        Recycler,               // 戦闘勝利後にデッキのランダムスキルを30Gで売却
        MirrorImage,            // 受けたダメージの25%を蓄積、次の攻撃に上乗せ
        BattleRhythm,           // 同じスキルを連続で使うと次の使用時に威力+50%

        // ─ Special Mechanics ─────────────────────────────────────────────
        SurgeProtection,        // 同一戦闘で3回以上ダメを受けた後、攻撃+30%
        AoEShieldDamage,        // フラグのみ（全体攻撃スキル使用時にシールド削り-1適用）

        // ─ Cursed Extended ───────────────────────────────────────────────
        GlassCannon,            // 全攻撃+80%、受けるダメージも+60%（cursed）
        BloodPact,              // HP50%以下の時攻撃+100%、毎ターンHP-3%（cursed）
        ChaosCore,              // ダメージが毎回±30%ランダムに変動（cursed）
        HungryBlade,            // 攻撃+40%、毎ターンHP-5（固定値）（cursed）
        SacrificialPact,        // 戦闘開始時HP-30%、その戦闘中全ダメージ+60%（cursed）
        MirrorCurse,            // 保有呪い数×15%攻撃UP、でも最大HP-10%/呪い（cursed）
        DoubleOrNothing,        // 戦闘開始時コイン投げ：表=全ダメ2倍、裏=全ダメ0.5倍（cursed）
        LifeDrain,              // 毎ターン生存している全敵のHP1%を吸収（cursed/powerful）
        CorruptedCore,          // 全スキルの効果+50%、スキル使用ごとにHP-5（固定値）（cursed）

        // ─ Ending Path Relics (special — one per run) ────────────────────
        EndingPath_DemonKing,   // 魔王再誕ルートの証印
        EndingPath_AbyssGod,    // 深淵降臨ルートの証印
        EndingPath_TimeWraith,  // 時の終焉ルートの証印
        EndingPath_CursedKing,  // 呪いの解放ルートの証印
        EndingPath_TrueCore,    // 真実の核ルートの証印（真エンド）
    }

    public enum RelicRarity { Common, Uncommon, Rare, Boss, Cursed, Event }

    // ── Relic ScriptableObject ─────────────────────────────────────────────
    [CreateAssetMenu(fileName = "RelicData", menuName = "DarkChronicle/Roguelike/Relic")]
    public class RelicData : ScriptableObject
    {
        [Header("Identity")]
        public string           RelicName;
        [TextArea] public string Description;
        public Sprite           Icon;
        public RelicRarity      Rarity;
        public Color            RarityColor = Color.white;

        [Header("Effect")]
        public RelicEffectType  PrimaryEffect;
        public float            PrimaryValue;       // context-dependent magnitude

        [Header("Secondary Effect (optional)")]
        public bool             HasSecondaryEffect;
        public RelicEffectType  SecondaryEffect;
        public float            SecondaryValue;

        [Header("Acquisition")]
        public CurseData        AttachedCurse;     // some relics come with a curse
        public string           FlavorText;

        public string RarityLabel => Rarity switch
        {
            RelicRarity.Common   => "一般",
            RelicRarity.Uncommon => "珍しい",
            RelicRarity.Rare     => "レア",
            RelicRarity.Boss     => "ボス報酬",
            RelicRarity.Cursed   => "呪われた",
            RelicRarity.Event    => "イベント",
            _                    => ""
        };
    }
}
