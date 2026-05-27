using System.Collections;
using UnityEngine;
using UnityEngine.InputSystem;
using DarkChronicle.HD2D;

namespace DarkChronicle.Character
{
    /// <summary>
    /// Field map player controller: 8-directional movement, animation,
    /// interaction with NPCs/events, and random encounter triggering.
    /// Input via Unity Input System (new).
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D), typeof(Animator))]
    public sealed class PlayerController : MonoBehaviour
    {
        // ── Inspector ──────────────────────────────────────────────────────
        [Header("Movement")]
        [SerializeField] float _walkSpeed    = 4f;
        [SerializeField] float _runSpeed     = 7.5f;
        [SerializeField] float _dashDuration = 0.25f;
        [SerializeField] LayerMask _interactLayer;

        [Header("Encounter")]
        [SerializeField] float _baseEncounterRate  = 0.015f;  // per step
        [SerializeField] float _encounterZoneMultiplier = 1f;
        [SerializeField] bool  _encountersEnabled  = true;

        [Header("Sprites (8-direction)")]
        [SerializeField] Sprite[] _walkDownSprites;
        [SerializeField] Sprite[] _walkUpSprites;
        [SerializeField] Sprite[] _walkSideSprites;

        // ── Private ────────────────────────────────────────────────────────
        Rigidbody2D _rb;
        Animator    _anim;
        SpriteRenderer _sprite;

        Vector2 _moveInput;
        Vector2 _lastFacingDir = Vector2.down;
        bool    _isRunning;
        bool    _canMove    = true;
        float   _stepCounter;

        // Input Actions (generated from Input Action asset)
        PlayerInputActions _inputActions;

        // ── Encounter Step Tracking ────────────────────────────────────────
        float _distanceSinceLastStep;
        const float StepDistance = 0.5f;

        // ── Events ─────────────────────────────────────────────────────────
        public static event System.Action OnEncounterTriggered;
        public static event System.Action<GameObject> OnInteract;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            _rb     = GetComponent<Rigidbody2D>();
            _anim   = GetComponent<Animator>();
            _sprite = GetComponent<SpriteRenderer>();

            _inputActions = new PlayerInputActions();
        }

        void OnEnable()
        {
            _inputActions.Enable();
            _inputActions.Player.Move    .performed += OnMovePerformed;
            _inputActions.Player.Move    .canceled  += OnMoveCanceled;
            _inputActions.Player.Run     .performed += ctx => _isRunning = true;
            _inputActions.Player.Run     .canceled  += ctx => _isRunning = false;
            _inputActions.Player.Interact.performed += OnInteractPerformed;
        }

        void OnDisable()
        {
            _inputActions.Player.Move    .performed -= OnMovePerformed;
            _inputActions.Player.Move    .canceled  -= OnMoveCanceled;
            _inputActions.Player.Interact.performed -= OnInteractPerformed;
            _inputActions.Disable();
        }

        void FixedUpdate()
        {
            if (!_canMove) { _rb.velocity = Vector2.zero; return; }

            float speed = _isRunning ? _runSpeed : _walkSpeed;
            _rb.velocity = _moveInput * speed;

            // Track distance for encounter step counting
            if (_moveInput.magnitude > 0.1f)
            {
                _distanceSinceLastStep += speed * Time.fixedDeltaTime;
                while (_distanceSinceLastStep >= StepDistance)
                {
                    _distanceSinceLastStep -= StepDistance;
                    OnStep();
                }
            }
        }

        void Update()
        {
            UpdateAnimation();
        }

        // ── Input Handlers ─────────────────────────────────────────────────
        void OnMovePerformed(InputAction.CallbackContext ctx)
        {
            _moveInput = ctx.ReadValue<Vector2>();
            if (_moveInput.magnitude > 0.1f) _lastFacingDir = _moveInput.normalized;
        }

        void OnMoveCanceled(InputAction.CallbackContext ctx) => _moveInput = Vector2.zero;

        void OnInteractPerformed(InputAction.CallbackContext ctx)
        {
            if (!_canMove) return;
            TryInteract();
        }

        // ── Movement Helpers ───────────────────────────────────────────────
        public void SetCanMove(bool value) => _canMove = value;

        public void TeleportTo(Vector3 position)
        {
            transform.position  = position;
            _distanceSinceLastStep = 0f;
        }

        public IEnumerator MoveTo(Vector3 target, float speed = -1f)
        {
            if (speed < 0f) speed = _walkSpeed;
            _canMove = false;
            while (Vector3.Distance(transform.position, target) > 0.05f)
            {
                transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);
                yield return null;
            }
            transform.position = target;
            _canMove = true;
        }

        // ── Animation ──────────────────────────────────────────────────────
        void UpdateAnimation()
        {
            bool moving = _moveInput.magnitude > 0.1f;
            _anim.SetBool("IsMoving", moving);
            _anim.SetFloat("MoveX",   _lastFacingDir.x);
            _anim.SetFloat("MoveY",   _lastFacingDir.y);
            _anim.SetFloat("Speed",   _rb.velocity.magnitude);
            _anim.SetBool("IsRunning", _isRunning && moving);

            // Flip sprite for left/right
            if (Mathf.Abs(_lastFacingDir.x) > 0.1f)
                _sprite.flipX = _lastFacingDir.x < 0f;
        }

        // ── Interaction ────────────────────────────────────────────────────
        void TryInteract()
        {
            Vector2 origin  = (Vector2)transform.position + _lastFacingDir * 0.6f;
            Collider2D hit  = Physics2D.OverlapCircle(origin, 0.3f, _interactLayer);
            if (hit != null) OnInteract?.Invoke(hit.gameObject);
        }

        // ── Encounter System ───────────────────────────────────────────────
        void OnStep()
        {
            if (!_encountersEnabled) return;
            float chance = _baseEncounterRate * _encounterZoneMultiplier;
            if (Random.value < chance) TriggerEncounter();
        }

        void TriggerEncounter()
        {
            _encountersEnabled = false;   // prevent multi-trigger
            StartCoroutine(EncounterTransition());
        }

        IEnumerator EncounterTransition()
        {
            SetCanMove(false);
            // Flash effect
            for (int i = 0; i < 6; i++)
            {
                _sprite.color = i % 2 == 0 ? Color.white : new Color(1f, 1f, 1f, 0f);
                yield return new WaitForSeconds(0.07f);
            }
            _sprite.color = Color.white;
            OnEncounterTriggered?.Invoke();
            // After battle, re-enable
            _encountersEnabled = true;
            SetCanMove(true);
        }

        public void SetEncounterZone(float multiplier) => _encounterZoneMultiplier = multiplier;
        public void SetEncountersEnabled(bool enabled)  => _encountersEnabled = enabled;

        // ── Gizmos ─────────────────────────────────────────────────────────
        void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere((Vector2)transform.position + _lastFacingDir * 0.6f, 0.3f);
        }
    }
}
