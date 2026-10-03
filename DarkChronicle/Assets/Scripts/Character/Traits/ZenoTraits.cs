using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Character.Traits
{
    // ═══════════════════════════════════════════════════════════════════════
    //   ゼノ固有トレイト × 3
    // ═══════════════════════════════════════════════════════════════════════

    // ── トレイト①: 呪詛増幅 ─────────────────────────────────────────────
    /// <summary>
    /// 全てのデバフ・状態異常を根本から強化するトレイト。
    ///
    /// ・すべての状態異常付与確率+25%。
    /// ・全てのデバフ（速度・攻撃・防御低下など）の持続ターン+1。
    /// ・デバフが2種以上重なった敵へのMagATKスケール攻撃ダメージ+15%/種
    ///   （最大4種重複で+60%）。
    ///   「呪いを積み重ねるほど爆発的に強くなる」設計。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_CurseAmplifier",
                     menuName  = "DarkChronicle/Trait/Zeno/CurseAmplifier")]
    public sealed class Trait_CurseAmplifier : CharacterTrait
    {
        public const float StatusChanceBonus     = 0.25f;  // 状態異常確率+25%
        public const int   DebuffDurationBonus   = 1;      // デバフ持続+1T
        public const float DmgBonusPerDebuff     = 0.15f;  // デバフ1種につき+15%ダメージ
        public const int   MaxDebuffStacks       = 4;      // 最大4種重複まで

        /// <summary>
        /// 状態異常付与確率を修飾する。BattleManager のステータス計算時に呼ぶ。
        /// </summary>
        public float ModifyStatusChance(float baseChance)
            => Mathf.Clamp01(baseChance + StatusChanceBonus);

        /// <summary>
        /// 対象に現在何種のデバフが重なっているかを受け取り、
        /// ダメージボーナス倍率を返す。
        /// </summary>
        public float GetDebuffStackBonus(int debuffCount)
        {
            int stacks = Mathf.Clamp(debuffCount, 0, MaxDebuffStacks);
            return stacks * DmgBonusPerDebuff;
        }

        public string GetCurrentBonusText()
            => $"状態異常確率+25% / デバフ持続+1T / デバフ重複ボーナス最大+{MaxDebuffStacks * (int)(DmgBonusPerDebuff * 100)}%";
    }

    // ── トレイト②: 魔獣の書の主 ────────────────────────────────────────
    /// <summary>
    /// グリモワールシステムのライフサイクルを管理するトレイト。
    ///
    /// ・バトル開始時にグリモワールをBattleManagerに提供する。
    /// ・吸収スキル使用時のHP消費を25%軽減する。
    /// ・グリモワール内のスキルを使用する際、MPコストをさらに-1（最小1）する。
    /// ・吸収した技の威力スケールボーナス+10%（GrimoireSystem の SkillPowerScale に追加）。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_GrimoireMaster",
                     menuName  = "DarkChronicle/Trait/Zeno/GrimoireMaster")]
    public sealed class Trait_GrimoireMaster : CharacterTrait
    {
        public const float AbsorbHPCostReduction  = 0.25f;  // HP消費-25%
        public const int   GrimoireMPDiscount     = 1;      // グリモワール技MP-1
        public const float AbsorbedSkillPowerBonus= 0.10f;  // 吸収技威力+10%

        // グリモワールのインスタンス（バトル間で持続）
        public GrimoireSystem GrimoireSystem { get; private set; }

        public override void OnBattleStart(BattleCharacter owner, BattleCharacter[] heroes)
        {
            GrimoireSystem ??= new GrimoireSystem();
            GrimoireUIBridge.NotifyUpdate(GrimoireSystem);
        }

        // HP消費量の計算
        public int GetAbsorbHPCost(BattleCharacter owner, float basePct)
        {
            float reducedPct = basePct * (1f - AbsorbHPCostReduction);
            return Mathf.Max(1, Mathf.RoundToInt(owner.MaxHP * reducedPct));
        }

        // グリモワール技のMPコスト計算
        public int GetGrimoireMPCost(int baseCost)
            => Mathf.Max(1, baseCost - GrimoireMPDiscount);

        // 吸収技の最終威力スケール
        public float GetAbsorbedSkillPowerScale()
            => GrimoireSystem.SkillPowerScale + AbsorbedSkillPowerBonus;

        public override void OnBattleEnd(BattleCharacter owner)
        {
            // グリモワールはバトル間で保持（リセットしない）
            GrimoireUIBridge.NotifyUpdate(GrimoireSystem);
        }
    }

    // ── トレイト③: 暗黒の意志 ────────────────────────────────────────────
    /// <summary>
    /// HPが減るほど吸収と呪術が強化されるトレイト。
    /// 妹への想いが絶望的な状況でこそ最大の力を発揮する。
    ///
    /// ・HP50%以下：全スキルのMPコスト-3（最小1）
    /// ・HP25%以下：吸収確率+30%（捨て身の絶死吸収）
    /// ・HP10%以下：デバフ効果量が+50%に増幅される（究極の覚悟）
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_DarkWill",
                     menuName  = "DarkChronicle/Trait/Zeno/DarkWill")]
    public sealed class Trait_DarkWill : CharacterTrait
    {
        const float LowHPThreshold    = 0.50f;  // HP50%以下でMP軽減
        const float CritHPThreshold   = 0.25f;  // HP25%以下で吸収ボーナス
        const float DespHPThreshold   = 0.10f;  // HP10%以下でデバフ増幅
        const int   MPCostReduction   = 3;
        const float AbsorbChanceBonus = 0.30f;
        const float DebuffAmplifyBonus= 0.50f;

        static float HPRatio(BattleCharacter owner)
            => owner.MaxHP > 0 ? (float)owner.HP / owner.MaxHP : 0f;

        // MP軽減（BattleManager のスキルコスト計算時に呼ぶ）
        public int ModifyMPCost(BattleCharacter owner, int baseCost)
        {
            if (HPRatio(owner) <= LowHPThreshold)
                return Mathf.Max(1, baseCost - MPCostReduction);
            return baseCost;
        }

        // 吸収ボーナス（吸収確率計算時に呼ぶ）
        public float GetAbsorbBonus(BattleCharacter owner)
            => HPRatio(owner) <= CritHPThreshold ? AbsorbChanceBonus : 0f;

        // デバフ増幅（デバフ適用時に呼ぶ）
        public float GetDebuffAmplify(BattleCharacter owner)
            => HPRatio(owner) <= DespHPThreshold ? DebuffAmplifyBonus : 0f;

        // UI状態ラベル
        public string GetStateLabel(BattleCharacter owner)
        {
            float ratio = HPRatio(owner);
            if (ratio <= DespHPThreshold)
                return "<color=#FF0000>【絶死の覚悟】デバフ+50% / 吸収+30% / MP-3</color>";
            if (ratio <= CritHPThreshold)
                return "<color=#FF6060>【捨て身】吸収確率+30% / MP-3</color>";
            if (ratio <= LowHPThreshold)
                return "<color=#FFA500>【低HP】MPコスト-3</color>";
            return string.Empty;
        }

        public override void OnTurnStart(BattleCharacter owner)
        {
            // UI通知（購読側でゼノのステータスパネルを更新）
        }
    }
}
