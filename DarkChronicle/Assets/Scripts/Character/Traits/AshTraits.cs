using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Character.Traits
{
    // ═══════════════════════════════════════════════════════════════════════
    //   アッシュ固有トレイト × 2  +  探索特性トレイト
    // ═══════════════════════════════════════════════════════════════════════

    // ── トレイト①: 影舞踊 ────────────────────────────────────────────────
    /// <summary>
    /// アッシュの核心システム。
    /// ・基本回避率を+20%上昇させる。
    /// ・物理/魔法攻撃を回避したとき「Shadow State」に入る。
    /// ・Shadow State中に攻撃スキルを使うと、会心確定＋ダメージ+30%。
    ///   （状態はそのアクションで消費される）
    /// ・外部から GrantShadowState() で手動付与も可能（罠設置・スモーク等）。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_ShadowDance",
                     menuName  = "DarkChronicle/Trait/Ash/ShadowDance")]
    public sealed class Trait_ShadowDance : CharacterTrait
    {
        // 固定値 ─────────────────────────────────────────────────────────
        public const float DodgeRateBonus       = 0.20f;  // 基本回避率+20%
        public const float ShadowDamageBonus    = 0.30f;  // Shadow State中ダメージ+30%
        public const float ShadowDamageBonusU   = 0.45f;  // 強化版 影矢＋ 使用時のボーナス

        bool _isInShadowState;
        public bool IsInShadowState => _isInShadowState;

        // ── 外部API ───────────────────────────────────────────────────────

        /// <summary>
        /// 回避成功時（BattleManagerから呼ぶ）または特定スキル使用後に呼ぶ。
        /// </summary>
        public void GrantShadowState()
        {
            _isInShadowState = true;
            BattleShadowUIBridge.NotifyStateChange(true);
        }

        /// <summary>
        /// 攻撃スキル使用時に呼ぶ。Shadow Stateなら消費してtrueを返す。
        /// </summary>
        public bool ConsumeShadowState()
        {
            if (!_isInShadowState) return false;
            _isInShadowState = false;
            BattleShadowUIBridge.NotifyStateChange(false);
            return true;
        }

        // ── 回避率ボーナス ────────────────────────────────────────────────
        public float GetDodgeRateBonus() => DodgeRateBonus;

        // ── 攻撃前ダメージ修飾（Shadow Stateを消費して威力を上げる） ───────
        public override float OnBeforeAttack(BattleCharacter owner, BattleCharacter target,
                                              float basePower)
        {
            if (_isInShadowState)
                return basePower * (1f + ShadowDamageBonus);
            return basePower;
        }

        // ── バトル終了時リセット ──────────────────────────────────────────
        public override void OnBattleEnd(BattleCharacter owner)
        {
            _isInShadowState = false;
        }

        // ── UIヒント ──────────────────────────────────────────────────────
        public string GetStateLabel()
        {
            return _isInShadowState
                ? "<color=#9B59B6>【Shadow State】次の攻撃：会心確定＋30%ボーナス</color>"
                : string.Empty;
        }
    }

    // ── トレイト②: 鷲の目 ────────────────────────────────────────────────
    /// <summary>
    /// 会心性能を根本から強化するトレイト。
    /// ・会心ダメージ倍率が×2.5になる（通常×2.0）。
    /// ・CritRate += LUK / 4 の値を常時加算（LUK20 → +5%会心率）。
    /// ・会心ヒット時、次の攻撃の会心率+10%（最大3スタック累積）。
    ///   → 死の踊りで連続会心が出ると雪崩式に倍率が上がる。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_EagleEye",
                     menuName  = "DarkChronicle/Trait/Ash/EagleEye")]
    public sealed class Trait_EagleEye : CharacterTrait
    {
        public const float ExtraCritMultiplier  = 0.5f;  // ×2.0 → ×2.5
        public const int   LuckToCritDivisor    = 4;     // LUK/4 → 追加会心率
        public const int   CritStackBonusPct    = 10;    // 会心コンボ1スタック=+10%
        public const int   MaxCritComboStacks   = 3;

        int _critComboStacks;
        public int CritComboStacks => _critComboStacks;

        // ── 会心ダメージ倍率の追加量 ──────────────────────────────────────
        public float GetCritMultiplierBonus() => ExtraCritMultiplier;

        // ── 会心率のボーナス ─────────────────────────────────────────────
        public int GetCritRateBonus(int luck)
            => Mathf.RoundToInt((float)luck / LuckToCritDivisor)
               + _critComboStacks * CritStackBonusPct;

        // ── 会心ヒント時にスタック追加 ────────────────────────────────────
        /// <summary>
        /// BattleManagerが会心判定成功後に呼ぶ。
        /// </summary>
        public void OnCriticalHit()
        {
            if (_critComboStacks < MaxCritComboStacks)
                _critComboStacks++;
        }

        // ── バトル終了時スタックリセット ─────────────────────────────────
        public override void OnBattleEnd(BattleCharacter owner)
        {
            _critComboStacks = 0;
        }

        // ── UIヒント ──────────────────────────────────────────────────────
        public string GetCurrentBonusText(BattleCharacter owner)
        {
            int totalCritBonus = GetCritRateBonus(owner.Luck);
            return $"会心倍率×2.5 / 会心率+{totalCritBonus}%（連続会心{_critComboStacks}スタック）";
        }
    }

    // ── トレイト③: 盗賊の技 ─────────────────────────────────────────────
    /// <summary>
    /// バトル外・ローグライクでの探索特性。
    /// ・フィールドの鍵付き宝箱を開錠できる。
    /// ・フィールドのトラップを自動検知・解除できる。
    /// ・暗闇・盲目エリアでも視界を確保できる。
    /// ・バトル中は盲目状態を無効化する（付与されない）。
    /// ・ローグライクでの各種ボーナスを保持する定数。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_RoguesCraft",
                     menuName  = "DarkChronicle/Trait/Ash/RoguesCraft")]
    public sealed class Trait_RoguesCraft : CharacterTrait
    {
        // フィールド特性フラグ
        public bool CanPickLock   => true;
        public bool CanDisarmTrap => true;
        public bool HasDarkVision => true;

        // ローグライク定数
        public const int   ExtraLootAtTreasure      = 1;     // 宝箱ノードで追加ルート1回
        public const float TrapDamageReduction       = 0.50f; // 呪われた部屋のトラップダメ-50%
        public const int   HiddenNodesRevealed       = 2;     // マップの隠しノードを2つ開示

        // バトル: 盲目付与を無効化
        // BattleManagerのApplyStatus時にこのトレイトを確認してSkip
        public bool IsBlindImmune => true;

        // フィールドスキル「暗視術」の魔力コストなし判定
        public override void OnBattleStart(BattleCharacter owner, BattleCharacter[] heroes)
        {
            // 盲目耐性はBattleManagerのApplyStatus内で確認されるため
            // ここでは特にアクションなし
        }

        // ── 現在の効果テキスト（UI用） ────────────────────────────────────
        public string GetFieldAbilityText()
        {
            return "鍵師の手 / 罠師の知識 / 暗視術（フィールド＆ローグライク特性有効）";
        }
    }

    // ── Shadow State UI橋渡し ─────────────────────────────────────────────
    /// <summary>
    /// Shadow State のON/OFFをBattleUIに通知する静的イベント。
    /// BattleUIが購読してアッシュのステータス表示を更新する。
    /// </summary>
    public static class BattleShadowUIBridge
    {
        public static event System.Action<bool> OnShadowStateChanged;

        public static void NotifyStateChange(bool isActive)
            => OnShadowStateChanged?.Invoke(isActive);
    }
}
