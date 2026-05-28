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
