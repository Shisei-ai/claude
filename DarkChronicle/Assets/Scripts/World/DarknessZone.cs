using System.Collections;
using UnityEngine;

namespace DarkChronicle.World
{
    /// <summary>
    /// 呪われた部屋などの暗闇ギミック。
    /// ScreenSpaceOverlay キャンバス上の黒パネルをフェードインさせることで
    /// 視界を制限する演出を行う。
    ///
    /// Ash の「暗視術」がある場合: Initialize(hasVision=true) → GO を非表示にして無効化。
    /// ない場合: sortingOrder=50 の黒オーバーレイをフェードインする。
    ///
    /// NodeFieldSceneSetup が _overlay を事前配線するため、
    /// ランタイムでの動的 GO 生成は行わない。
    /// </summary>
    public sealed class DarknessZone : MonoBehaviour
    {
        [SerializeField] CanvasGroup _overlay;
        [SerializeField, Range(0f, 1f)] float _targetAlpha    = 0.82f;
        [SerializeField]                float _fadeInDuration  = 1.2f;

        /// <summary>NodeFieldController から SetActive(_cursedRoomRoot, true) 後に呼ぶ。</summary>
        public void Initialize(bool hasVision)
        {
            if (hasVision)
            {
                gameObject.SetActive(false);
                return;
            }

            if (_overlay == null) return;
            _overlay.alpha = 0f;
            StartCoroutine(FadeIn());
        }

        IEnumerator FadeIn()
        {
            float elapsed = 0f;
            while (elapsed < _fadeInDuration)
            {
                elapsed       += Time.deltaTime;
                _overlay.alpha = Mathf.Lerp(0f, _targetAlpha, elapsed / _fadeInDuration);
                yield return null;
            }
            _overlay.alpha = _targetAlpha;
        }
    }
}
