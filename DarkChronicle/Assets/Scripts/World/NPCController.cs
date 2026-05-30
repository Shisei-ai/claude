using System.Collections;
using UnityEngine;
using DarkChronicle.UI;

namespace DarkChronicle.World
{
    /// <summary>
    /// NPC that wanders, idles, looks at the player, and delivers dialogue on interact.
    /// Supports shop functionality and quest-giving via dialogue branches.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class NPCController : MonoBehaviour
    {
        public enum NPCBehavior { Stationary, Wander, Patrol }

        [Header("Identity")]
        [SerializeField] string           _npcName;
        [SerializeField] Sprite           _portrait;
        [SerializeField] NPCBehavior      _behavior;

        [Header("Dialogue")]
        [SerializeField] DialogueSequence _dialogue;
        [SerializeField] DialogueSequence _postQuestDialogue;

        [Header("Movement")]
        [SerializeField] float            _wanderRadius  = 3f;
        [SerializeField] float            _wanderSpeed   = 1.5f;
        [SerializeField] float            _wanderIdleMin = 2f;
        [SerializeField] float            _wanderIdleMax = 5f;
        [SerializeField] Transform[]      _patrolPoints;

        [Header("Look At Player")]
        [SerializeField] bool             _lookAtPlayer  = true;
        [SerializeField] float            _lookAtRange   = 4f;

        Rigidbody2D   _rb;
        Animator      _anim;
        SpriteRenderer _sprite;
        Transform     _playerTransform;
        Vector3       _homePosition;
        bool          _isTalking;
        int           _patrolIndex;

        void Awake()
        {
            _rb           = GetComponent<Rigidbody2D>();
            _anim         = GetComponent<Animator>();
            _sprite       = GetComponent<SpriteRenderer>();
            _homePosition = transform.position;

            var player = FindFirstObjectByType<Character.PlayerController>();
            if (player != null) _playerTransform = player.transform;

            Character.PlayerController.OnInteract += OnPlayerInteract;
        }

        void OnDestroy() => Character.PlayerController.OnInteract -= OnPlayerInteract;

        void Start()
        {
            switch (_behavior)
            {
                case NPCBehavior.Wander:  StartCoroutine(WanderRoutine());  break;
                case NPCBehavior.Patrol:  StartCoroutine(PatrolRoutine());  break;
            }
        }

        void Update()
        {
            if (_isTalking || _playerTransform == null) return;
            if (_lookAtPlayer && Vector3.Distance(transform.position, _playerTransform.position) < _lookAtRange)
                LookAt(_playerTransform.position);
        }

        // ── Interaction ────────────────────────────────────────────────────
        void OnPlayerInteract(GameObject obj)
        {
            if (obj != gameObject || _isTalking) return;
            StartCoroutine(Talk());
        }

        IEnumerator Talk()
        {
            _isTalking = true;
            LookAt(_playerTransform.position);
            _anim?.SetBool("IsMoving", false);
            _rb.velocity = Vector2.zero;

            yield return DialogueSystem.Instance.PlayDialogue(_dialogue);

            _isTalking = false;
        }

        // ── Movement Routines ──────────────────────────────────────────────
        IEnumerator WanderRoutine()
        {
            while (true)
            {
                if (_isTalking) { yield return null; continue; }

                // Idle
                float idleTime = Random.Range(_wanderIdleMin, _wanderIdleMax);
                _rb.velocity   = Vector2.zero;
                _anim?.SetBool("IsMoving", false);
                yield return new WaitForSeconds(idleTime);

                if (_isTalking) { yield return null; continue; }

                // Pick random destination within wander radius
                Vector2 randomDir  = Random.insideUnitCircle.normalized;
                Vector3 targetPos  = _homePosition + (Vector3)(randomDir * Random.Range(0.5f, _wanderRadius));

                yield return MoveToPosition(targetPos, _wanderSpeed);
            }
        }

        IEnumerator PatrolRoutine()
        {
            if (_patrolPoints.Length == 0) yield break;
            while (true)
            {
                if (_isTalking) { yield return null; continue; }
                var target = _patrolPoints[_patrolIndex % _patrolPoints.Length];
                yield return MoveToPosition(target.position, _wanderSpeed);
                _patrolIndex++;
                yield return new WaitForSeconds(1f);
            }
        }

        IEnumerator MoveToPosition(Vector3 target, float speed)
        {
            Vector2 dir = (target - transform.position).normalized;
            _rb.velocity = dir * speed;
            _anim?.SetBool("IsMoving", true);
            _anim?.SetFloat("MoveX", dir.x);
            _anim?.SetFloat("MoveY", dir.y);
            _sprite.flipX = dir.x < 0f;

            while (Vector3.Distance(transform.position, target) > 0.15f)
            {
                if (_isTalking) { _rb.velocity = Vector2.zero; yield break; }
                yield return null;
            }
            _rb.velocity = Vector2.zero;
            _anim?.SetBool("IsMoving", false);
        }

        // ── Utilities ──────────────────────────────────────────────────────
        void LookAt(Vector3 target)
        {
            Vector2 dir = (target - transform.position).normalized;
            _anim?.SetFloat("MoveX", dir.x);
            _anim?.SetFloat("MoveY", dir.y);
            if (Mathf.Abs(dir.x) > 0.1f) _sprite.flipX = dir.x < 0f;
        }

        void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(Application.isPlaying ? _homePosition : transform.position, _wanderRadius);
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere(transform.position, _lookAtRange);
        }
    }
}
