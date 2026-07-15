using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Character.Traits
{
    // ═══════════════════════════════════════════════════════════════════════
    //   リリア固有トレイト × 3
    // ═══════════════════════════════════════════════════════════════════════

    // ── トレイト①: 清心の治癒師 ──────────────────────────────────────────
    /// <summary>
    /// 回復魔法の根幹を強化するトレイト。
    /// ・すべての回復スキルの効果量+30%（パッシブ「癒しの心得」と加算で合計+55%）。
    /// ・蘇生スキル（IsRevive=true）を使用した後、術者自身のHPも20%回復する。
    ///   →「自分が傷つきながら仲間を助ける」ではなく、奇跡として自然に。
    /// ・リジェネ系スキルの持続ターンが+1される。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_PureheartHealer",
                     menuName  = "DarkChronicle/Trait/Lilia/PureheartHealer")]
    public sealed class Trait_PureheartHealer : CharacterTrait
    {
        public const float HealBonus              = 0.30f;  // 回復量+30%
        public const float SelfHealAfterRevive    = 0.20f;  // 蘇生後自己回復20%
        public const int   RegenDurationBonus     = 1;      // リジェネ持続+1T

        // ── 回復量修飾 ────────────────────────────────────────────────────
        /// <summary>
        /// HealPower計算時に呼ぶ。healAmountに乗算ボーナスを返す。
        /// </summary>
        public float ModifyHealAmount(float healAmount)
            => healAmount * (1f + HealBonus);

        // ── 蘇生後自己回復 ────────────────────────────────────────────────
        /// <summary>
        /// 蘇生スキル使用後にBattleManagerが呼ぶ。術者のHP20%回復量を返す。
        /// </summary>
        public int GetPostReviveSelfHeal(BattleCharacter owner)
            => Mathf.Max(1, Mathf.RoundToInt(owner.MaxHP * SelfHealAfterRevive));

        // ── UIヒント ──────────────────────────────────────────────────────
        public string GetCurrentBonusText()
            => $"回復量+30% / 蘇生時自己HP+20% / リジェネ持続+{RegenDurationBonus}T";
    }

    // ── トレイト②: 奇跡の手 ──────────────────────────────────────────────
    /// <summary>
    /// 毎ターン末にパーティで最もHP残量%が低い味方を自動で小回復する。
    ///   回復量: owner.Matk × 0.30
    ///   MP不消費。対象が満タンの場合は発動しない（無駄撃ち防止）。
    ///
    /// さらに「完全蘇生（FullRevive）」スキル使用時のみ、
    /// 蘇生した全員にリジェネを付与する（蘇生直後の即死を防ぐ）。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_MiracleHands",
                     menuName  = "DarkChronicle/Trait/Lilia/MiracleHands")]
    public sealed class Trait_MiracleHands : CharacterTrait
    {
        public const float AutoHealMult           = 0.30f;  // Matk × 0.30 / ターン
        public const float AutoHealHPThreshold    = 0.99f;  // 99%以上なら発動しない
        public const int   FullReviveRegenTurns   = 3;      // 完全蘇生後のリジェネ持続

        // ── ターン終了時自動回復 ──────────────────────────────────────────
        public override void OnTurnStart(BattleCharacter owner)
        {
            // BattleManagerがターン終了時に呼ぶため、OnTurnStartで代用
            // (OnAfterTurnEnd フックが追加されるまでの暫定)
        }

        /// <summary>
        /// BattleManager の「全員のターン処理後」フェーズで呼ぶ。
        /// 最もHP残量%の低い味方のインデックスと回復量を返す。
        /// 発動しない場合は healAmount=0 を返す。
        /// </summary>
        public int ComputeAutoHeal(BattleCharacter owner)
            => Mathf.RoundToInt(owner.Matk * AutoHealMult);

        public bool ShouldAutoHeal(BattleCharacter target)
            => target.IsAlive && (float)target.HP / target.MaxHP < AutoHealHPThreshold;

        // ── 完全蘇生後のリジェネターン数 ─────────────────────────────────
        public int GetFullReviveRegenTurns() => FullReviveRegenTurns;

        public string GetCurrentBonusText(BattleCharacter owner)
        {
            int healAmt = ComputeAutoHeal(owner);
            return $"毎ターン末：最低HP味方に{healAmt}自動回復 / 完全蘇生後リジェネ{FullReviveRegenTurns}T付与";
        }
    }

    // ── トレイト③: 聖光の加護 ───────────────────────────────────────────
    /// <summary>
    /// 聖属性攻撃を根本から強化し、アンデッド・悪魔系への特効をさらに倍増する。
    ///
    /// ・聖属性スキルのダメージ+40%（常時）。
    /// ・アンデッド・悪魔系へのダメージに追加×1.5倍（スキル本来の倍率に乗算）。
    ///   例: 聖光弾（×2.0）+ このトレイト（×1.5）= 合計×3.0 倍ダメージ。
    ///       神罰（×2.5）+ このトレイト（×1.5）= 合計×3.75 倍ダメージ。
    /// ・アンデッド系敵に対してBreakゲージを2倍速く削る（CanBreak=true時）。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_HolyGrace",
                     menuName  = "DarkChronicle/Trait/Lilia/HolyGrace")]
    public sealed class Trait_HolyGrace : CharacterTrait
    {
        public const float HolyDamageBonus     = 0.40f;  // 聖属性ダメージ+40%
        public const float UndeadExtraMult     = 1.50f;  // アンデッドへの追加倍率×1.5
        public const int   UndeadBreakMultiple = 2;      // Breakゲージ削り×2倍

        // ── 聖属性ダメージ修飾 ────────────────────────────────────────────
        public float ModifyHolyDamage(float rawDamage)
            => rawDamage * (1f + HolyDamageBonus);

        // ── アンデッド特効 ────────────────────────────────────────────────
        /// <summary>
        /// 対象がアンデッド・悪魔系かどうかを判定し、追加倍率を返す。
        /// BattleManagerが EnemyData.EnemyTags を確認してこのメソッドを呼ぶ。
        /// </summary>
        public float GetUndeadBonusMult(bool targetIsUndead)
            => targetIsUndead ? UndeadExtraMult : 1f;

        public int GetBreakDamageMultiple(bool targetIsUndead)
            => targetIsUndead ? UndeadBreakMultiple : 1;

        // ── UIヒント ──────────────────────────────────────────────────────
        public string GetCurrentBonusText()
            => "聖属性ダメージ+40% / アンデッド・悪魔系に追加×1.5 / Break速度×2倍";
    }
}
