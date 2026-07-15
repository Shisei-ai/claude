using System.Collections;
using UnityEngine;

namespace DarkChronicle.World
{
    /// <summary>
    /// Ash の「鍵師の手」でのみ開錠できる追加宝箱ギミック。
    /// TreasureRoot の子に配置し、NodeFieldController から Initialize() を呼ぶ。
    /// Ash がパーティにいない場合は GO ごと非表示になる。
    /// 開錠後の ChestTrigger(EventTrigger.TreasureChest) が通常の宝箱と同じ
    /// NodeFieldLoot.ResolveTreasureChest() を実行し、追加ルートを提供する。
    /// </summary>
    public sealed class LockedChest : MonoBehaviour
    {
        [SerializeField] GameObject _lockedVisual;    // 施錠状態のスプライト・表示
        [SerializeField] GameObject _chestTriggerGO;  // EventTrigger(TreasureChest) を持つ子GO
        [SerializeField] float      _unlockDelay = 0.6f;

        /// <summary>NodeFieldController から Start() 後に呼ぶ。</summary>
        public void Initialize(bool canPickLock)
        {
            if (!canPickLock)
            {
                gameObject.SetActive(false);
                return;
            }

            if (_chestTriggerGO != null) _chestTriggerGO.SetActive(false);
            StartCoroutine(UnlockSequence());
        }

        IEnumerator UnlockSequence()
        {
            yield return new WaitForSeconds(_unlockDelay);

            if (_lockedVisual   != null) _lockedVisual.SetActive(false);
            if (_chestTriggerGO != null) _chestTriggerGO.SetActive(true);
        }
    }
}
