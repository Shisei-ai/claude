using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Data;

namespace DarkChronicle.Character.Traits
{
    /// <summary>
    /// キャラクター固有の「常時パッシブ特性」システム。
    /// スキルとは別に、キャラクター固有のユニーク効果を表現する。
    /// 各トレイトはScriptableObjectとして定義し、CharacterDataに紐付ける。
    /// </summary>

    // ── トレイト基底クラス ─────────────────────────────────────────────────
    public abstract class CharacterTrait : ScriptableObject
    {
        [Header("Identity")]
        public string       TraitName;
        [TextArea]
        public string       Description;
        public Sprite       Icon;
        public bool         IsPassive = true;  // falseなら能動発動トリガーあり

        // バトル開始時の初期化
        public virtual void OnBattleStart(BattleCharacter owner, BattleCharacter[] allHeroes) { }

        // ダメージを受ける前（戻り値で変更可能）
        public virtual int OnBeforeTakeDamage(BattleCharacter owner, int incomingDamage, DamageType type) => incomingDamage;

        // ダメージを受けた後
        public virtual void OnAfterTakeDamage(BattleCharacter owner, int dealtDamage) { }

        // 致死ダメージ判定（trueを返すと死なずにHP1で踏みとどまる）
        public virtual bool OnFatalDamage(BattleCharacter owner) => false;

        // 自分のターン開始時
        public virtual void OnTurnStart(BattleCharacter owner) { }

        // 攻撃前（戻り値で威力変更）
        public virtual float OnBeforeAttack(BattleCharacter owner, BattleCharacter target, float basePower) => basePower;

        // 敵撃破時
        public virtual void OnKill(BattleCharacter owner, BattleCharacter killed) { }

        // バトル終了時（クリーンアップ）
        public virtual void OnBattleEnd(BattleCharacter owner) { }
    }

    // ── トレイト処理エンジン ────────────────────────────────────────────────
    /// <summary>
    /// BattleCharacterに付属し、そのキャラの全トレイトを管理するコンポーネント。
    /// BattleManagerのイベントに登録して適切なタイミングで各トレイトを呼ぶ。
    /// </summary>
    public sealed class TraitProcessor
    {
        readonly BattleCharacter    _owner;
        readonly CharacterTrait[]   _traits;

        public TraitProcessor(BattleCharacter owner, CharacterTrait[] traits)
        {
            _owner  = owner;
            _traits = traits ?? System.Array.Empty<CharacterTrait>();
        }

        public void OnBattleStart(BattleCharacter[] heroes)
        {
            foreach (var t in _traits) t.OnBattleStart(_owner, heroes);
        }

        public int ModifyIncomingDamage(int damage, DamageType type)
        {
            foreach (var t in _traits) damage = t.OnBeforeTakeDamage(_owner, damage, type);
            return Mathf.Max(0, damage);
        }

        public void AfterTakeDamage(int dealt)
        {
            foreach (var t in _traits) t.OnAfterTakeDamage(_owner, dealt);
        }

        public bool TryBlockFatalDamage()
        {
            foreach (var t in _traits)
                if (t.OnFatalDamage(_owner)) return true;
            return false;
        }

        public void OnTurnStart()
        {
            foreach (var t in _traits) t.OnTurnStart(_owner);
        }

        public float ModifyOutgoingPower(BattleCharacter target, float power)
        {
            foreach (var t in _traits) power = t.OnBeforeAttack(_owner, target, power);
            return power;
        }

        public void OnKill(BattleCharacter killed)
        {
            foreach (var t in _traits) t.OnKill(_owner, killed);
        }

        public void OnBattleEnd()
        {
            foreach (var t in _traits) t.OnBattleEnd(_owner);
        }
    }
}
