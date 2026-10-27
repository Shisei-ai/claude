using System.Collections;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Unity.Cinemachine;

namespace DarkChronicle.HD2D
{
    /// <summary>
    /// Octopath-style diorama camera with depth-of-field, tilt control, and smooth follow.
    /// Attach to the main camera alongside a CinemachineBrain.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public sealed class HD2DCamera : MonoBehaviour
    {
        // ── Inspector ──────────────────────────────────────────────────────
        [Header("Diorama Settings")]
        [SerializeField] float _tiltAngle        = 28f;
        [SerializeField] float _cameraHeight     = 8f;
        [SerializeField] float _cameraDistance   = 12f;
        [SerializeField] float _fieldOfView      = 35f;

        [Header("Depth of Field")]
        [SerializeField] float _focusDistance    = 10f;
        [SerializeField] float _focalLength      = 50f;
        [SerializeField] float _aperture         = 5.6f;
        [SerializeField] bool  _dofEnabled       = true;

        [Header("Follow Smoothing")]
        [SerializeField] float _followSmoothing  = 5f;
        [SerializeField] Vector3 _focusOffset    = new Vector3(0f, 0.5f, 0f);

        [Header("Shake")]
        [SerializeField] float _shakeDecay       = 5f;

        // ── Private ────────────────────────────────────────────────────────
        Camera            _cam;
        Volume            _ppVolume;
        DepthOfField      _dof;
        CinemachineCamera        _vcam;
        Transform         _target;
        Vector3           _shakeOffset;
        float             _shakeMagnitude;
        Vector3           _currentVelocity;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            _cam = GetComponent<Camera>();
            _cam.fieldOfView = _fieldOfView;

            // Grab post-process volume
            _ppVolume = FindAnyObjectByType<Volume>();
            if (_ppVolume != null && _ppVolume.profile.TryGet(out _dof))
                ApplyDOFSettings();
        }

        void LateUpdate()
        {
            if (_target == null) return;

            Vector3 desiredPos = ComputeDesiredPosition();
            transform.position = Vector3.SmoothDamp(
                transform.position, desiredPos, ref _currentVelocity, 1f / _followSmoothing);

            // Apply camera tilt
            transform.rotation = Quaternion.Euler(_tiltAngle, 0f, 0f);

            // Shake
            if (_shakeMagnitude > 0.01f)
            {
                _shakeOffset  = Random.insideUnitSphere * _shakeMagnitude;
                _shakeMagnitude = Mathf.Lerp(_shakeMagnitude, 0f, Time.deltaTime * _shakeDecay);
                transform.position += _shakeOffset;
            }
        }

        // ── Public API ─────────────────────────────────────────────────────
        public void SetTarget(Transform target) => _target = target;

        public void Shake(float magnitude) => _shakeMagnitude = Mathf.Max(_shakeMagnitude, magnitude);

        public IEnumerator TransitionFocus(float newFocusDistance, float duration)
        {
            if (_dof == null) yield break;
            float start    = _dof.focusDistance.value;
            float elapsed  = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                _dof.focusDistance.value = Mathf.Lerp(start, newFocusDistance, elapsed / duration);
                yield return null;
            }
            _dof.focusDistance.value = newFocusDistance;
        }

        public IEnumerator DramaticZoom(float targetFOV, float duration, AnimationCurve curve = null)
        {
            float startFOV = _cam.fieldOfView;
            float elapsed  = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                float eased = curve != null ? curve.Evaluate(t) : Mathf.SmoothStep(0f, 1f, t);
                _cam.fieldOfView = Mathf.Lerp(startFOV, targetFOV, eased);
                yield return null;
            }
            _cam.fieldOfView = targetFOV;
        }

        // ── Helpers ────────────────────────────────────────────────────────
        Vector3 ComputeDesiredPosition()
        {
            Vector3 focusPoint = _target.position + _focusOffset;
            float   rad        = _tiltAngle * Mathf.Deg2Rad;
            return focusPoint
                 + Vector3.up      * _cameraHeight
                 - Vector3.forward * _cameraDistance * Mathf.Cos(rad)
                 + Vector3.up      * _cameraDistance * Mathf.Sin(rad) * 0.5f;
        }

        void ApplyDOFSettings()
        {
            if (!_dofEnabled) { _dof.active = false; return; }
            _dof.active = true;
            _dof.mode.value           = DepthOfFieldMode.Bokeh;
            _dof.focusDistance.value  = _focusDistance;
            _dof.focalLength.value    = _focalLength;
            _dof.aperture.value       = _aperture;
        }
    }
}
