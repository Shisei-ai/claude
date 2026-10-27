using UnityEngine;
using DarkChronicle.Roguelike;

namespace DarkChronicle.World
{
    /// <summary>
    /// フィールド上のトラップギミック。CursedRoomRoot の子に複数配置する。
    ///
    /// Ash の「罠師の知識」あり: 入室直後に自動検知・解除される（ダメージなし）。
    /// Ash なし: プレイヤーが踏むと RunData.MaxHP の一定割合のダメージを受ける。
    ///           Trait_RoguesCraft.TrapDamageReduction が適用される余地を残しているが、
    ///           現実装では Ash のみがトレイトを持つため全ダメージ or 全解除の二択。
    /// </summary>
    [RequireComponent(typeof(BoxCollider2D))]
    public sealed class FieldTrap : MonoBehaviour
    {
        [Tooltip("MaxHP に対するトラップダメージ割合（0〜1）")]
        [SerializeField, Range(0f, 1f)] float _damagePercent = 0.15f;

        [SerializeField] GameObject _trapActiveVisual;    // 作動中の見た目（デザイナー要設定）
        [SerializeField] GameObject _trapDisarmedVisual;  // 解除後の見た目
        [SerializeField] GameObject _detectedIndicator;   // Ash 検知時の「！」マーカー

        bool _triggered;

        /// <summary>NodeFieldController から SetActive(_cursedRoomRoot, true) 後に呼ぶ。</summary>
        public void Initialize(bool canDisarmTrap)
        {
            if (canDisarmTrap)
            {
                if (_detectedIndicator != null) _detectedIndicator.SetActive(true);
                Disarm();
                return;
            }
            // else: コライダーは有効のまま、プレイヤーが踏んだときに OnTriggerEnter2D で発火
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (_triggered)               return;
            if (!other.CompareTag("Player")) return;
            _triggered = true;

            var ctx = NodeFieldContext.Current;
            if (ctx?.Run != null)
            {
                int dmg = Mathf.RoundToInt(ctx.Run.MaxHP * _damagePercent);
                ctx.Run.CurrentHP = Mathf.Max(1, ctx.Run.CurrentHP - dmg);
                // HUD 反映は RoguelikeManager が Run.CurrentHP の変化を検知して行う
            }

            Disarm();
        }

        void Disarm()
        {
            if (_trapActiveVisual   != null) _trapActiveVisual.SetActive(false);
            if (_trapDisarmedVisual != null) _trapDisarmedVisual.SetActive(true);
            var col = GetComponent<Collider2D>();
            if (col != null) col.enabled = false;
        }
    }
}
