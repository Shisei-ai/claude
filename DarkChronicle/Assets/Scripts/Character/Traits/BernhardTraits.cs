using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Character.Traits
{
    // ═══════════════════════════════════════════════════════════════════════
    //   ベルンハルト固有トレイト × 3
    // ═══════════════════════════════════════════════════════════════════════

    // ── トレイト①: 不撓不屈 ─────────────────────────────────────────────────
    /// <summary>
    /// 1戦闘に1回だけ、致死ダメージを受けてもHP1で踏みとどまる。
    /// 発動時に専用ボイスと演出が流れる。
    /// スキルとして習得するが、習得後は自動発動（パッシブ）。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_IndomitableWill",
                     menuName  = "DarkChronicle/Trait/Bernhard/IndomitableWill")]
    public sealed class Trait_IndomitableWill : CharacterTrait
    {
        bool _triggered;

        public override void OnBattleStart(BattleCharacter owner, BattleCharacter[] heroes)
        {
            _triggered = false;
        }

        public override bool OnFatalDamage(BattleCharacter owner)
        {
            if (_triggered) return false;
            _triggered = true;

            // HP強制的に1にする（BattleCharacter.TakeDamageの後に補正）
            // → BattleManagerがこのtrueを受け取ってHP=1にセット
            AudioManager?.PlayVoice("Bernhard_IndomitableWill");
            VFXSpawner?.Spawn("VFX_IndomitableWill", owner.WorldPosition);
            BattleUIBridge?.ShowTraitActivated("不撓不屈", owner);
            return true;
        }

        public override void OnBattleEnd(BattleCharacter owner) => _triggered = false;

        // これらはEditorでアサイン or シングルトン経由で取得
        static Core.AudioManager  AudioManager  => Core.AudioManager.Instance;
        static object             VFXSpawner    => null;  // TODO: VFX管理クラスに差し替え
        static UI.BattleUI        BattleUIBridge => null; // TODO
    }

    // ── トレイト②: 歴戦の鎧 ─────────────────────────────────────────────────
    /// <summary>
    /// 攻撃を受けるたびに物理防御+3%（最大5スタック）。
    /// スタックはターン経過では消えず、戦闘終了時のみリセット。
    /// Boost×Break時代の「受け続けて壁になる」プレイングを補強する。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_BattleHardened",
                     menuName  = "DarkChronicle/Trait/Bernhard/BattleHardened")]
    public sealed class Trait_BattleHardened : CharacterTrait
    {
        const int   MaxStacks     = 5;
        const float DefPerStack   = 0.03f;  // 物理防御+3%/スタック

        int _stacks;

        public override void OnBattleStart(BattleCharacter owner, BattleCharacter[] heroes)
        {
            _stacks = 0;
        }

        public override void OnAfterTakeDamage(BattleCharacter owner, int dealtDamage)
        {
            if (dealtDamage <= 0 || _stacks >= MaxStacks) return;
            _stacks++;

            // 防御ステータスをバフとして積む（BattleCharacterのバフシステム経由）
            owner.AddTemporaryDefBuff(Mathf.RoundToInt(owner.BaseStats.PhysicalDefense * DefPerStack));

            // UI: スタック数表示更新
            BattleUIBridge?.ShowStackCount(owner, _stacks, MaxStacks, "歴戦");
        }

        public override void OnBattleEnd(BattleCharacter owner)
        {
            _stacks = 0;
            owner.ClearTemporaryDefBuff();
        }

        static UI.BattleUI BattleUIBridge => null;
    }

    // ── トレイト③: 鋼の肉体 ─────────────────────────────────────────────────
    /// <summary>
    /// 毒・出血・炎上によるダメージオーバータイムを30%軽減する。
    /// 暗黒の森フロアはDOT敵が多いため、戦士が自然に活きるデザイン。
    /// </summary>
    [CreateAssetMenu(fileName = "Trait_IronConstitution",
                     menuName  = "DarkChronicle/Trait/Bernhard/IronConstitution")]
    public sealed class Trait_IronConstitution : CharacterTrait
    {
        const float DotReduction = 0.30f;

        // BattleCharacter.TickStatusEffectsが呼ぶ前に割り込む
        // → DOTダメージをここで軽減して返す
        public override int OnBeforeTakeDamage(BattleCharacter owner, int incoming, DamageType type)
        {
            // TrueダメージはDOTとして扱わないため、ここでは判定しない
            // 実際のDOT判定はStatusEffectTypeを見るが、DamageTypeは一般的な物理/魔法のみ
            // DOT専用パスのためBattleCharacterに専用メソッドを追加する (下記参照)
            return incoming;
        }

        // BattleCharacterから直接呼ばれるDOT軽減メソッド
        public int ReduceDOTDamage(int dotDamage)
            => Mathf.Max(1, Mathf.RoundToInt(dotDamage * (1f - DotReduction)));
    }

    // ── BattleCharacter拡張メソッド（トレイト統合用） ─────────────────────
    // BattleCharacterに追加すべきメソッド群のスタブ
    public static class BattleCharacterTraitExtensions
    {
        /// <summary>一時的な防御バフを積む（歴戦の鎧用）</summary>
        public static void AddTemporaryDefBuff(this BattleCharacter c, int amount)
        {
            // TODO: BattleCharacterの_buffStatsにPhysicalDefenseを加算
            // c._buffStats.PhysicalDefense += amount;  // privateフィールドのためリフレクション or 公開メソッド化が必要
        }

        public static void ClearTemporaryDefBuff(this BattleCharacter c)
        {
            // TODO: 歴戦スタック由来のバフをクリア
        }

        /// <summary>WorldPositionプロパティ（VFX配置用）</summary>
        public static Vector3 WorldPosition(this BattleCharacter c)
        {
            // TODO: バトルシーン内でのキャラ位置を返す
            return Vector3.zero;
        }
    }
}
