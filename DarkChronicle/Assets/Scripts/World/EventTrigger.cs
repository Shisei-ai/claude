using System.Collections;
using UnityEngine;
using DarkChronicle.UI;
using DarkChronicle.Core;

namespace DarkChronicle.World
{
    /// <summary>
    /// Place on any world object to trigger dialogues, scene transitions,
    /// item pickups, or scripted cutscenes when the player interacts.
    /// </summary>
    public sealed class EventTrigger : MonoBehaviour
    {
        public enum TriggerType { Dialogue, SceneTransition, ItemPickup, BattleTrigger, Custom }

        public static event System.Action<Data.ItemData, int> OnItemPickedUp;

        [Header("Trigger Config")]
        [SerializeField] TriggerType      _triggerType;
        [SerializeField] bool             _triggerOnce   = false;
        [SerializeField] bool             _autoTrigger   = false;  // trigger on enter (no interact)
        [SerializeField] float            _autoTriggerRadius = 1f;

        [Header("Dialogue")]
        [SerializeField] DialogueSequence _dialogueSequence;

        [Header("Scene Transition")]
        [SerializeField] string           _targetScene;
        [SerializeField] Vector3          _spawnPosition;
        [SerializeField] float            _transitionDelay = 0f;

        [Header("Item Pickup")]
        [SerializeField] Data.ItemData    _item;
        [SerializeField] int              _quantity = 1;
        [SerializeField] GameObject       _pickupVFX;

        [Header("Battle Trigger")]
        [SerializeField] Data.EnemyData[] _fixedEnemies;
        [SerializeField] bool             _isAmbush;

        [Header("Visual")]
        [SerializeField] GameObject       _interactIndicator;
        [SerializeField] bool             _hideAfterTrigger = true;

        bool _hasTriggered;
        bool _playerInRange;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            if (_interactIndicator != null) _interactIndicator.SetActive(false);
            Character.PlayerController.OnInteract += OnPlayerInteract;
        }

        void OnDestroy() => Character.PlayerController.OnInteract -= OnPlayerInteract;

        void OnTriggerEnter2D(Collider2D other)
        {
            if (!other.CompareTag("Player")) return;
            _playerInRange = true;
            if (_interactIndicator != null) _interactIndicator.SetActive(true);
            if (_autoTrigger) StartCoroutine(Execute());
        }

        void OnTriggerExit2D(Collider2D other)
        {
            if (!other.CompareTag("Player")) return;
            _playerInRange = false;
            if (_interactIndicator != null) _interactIndicator.SetActive(false);
        }

        // ── Interaction ────────────────────────────────────────────────────
        void OnPlayerInteract(GameObject interactedWith)
        {
            if (interactedWith != gameObject) return;
            if (!_playerInRange)             return;
            StartCoroutine(Execute());
        }

        IEnumerator Execute()
        {
            if (_triggerOnce && _hasTriggered) yield break;
            _hasTriggered = true;

            if (_interactIndicator != null) _interactIndicator.SetActive(false);

            switch (_triggerType)
            {
                case TriggerType.Dialogue:
                    yield return DialogueSystem.Instance.PlayDialogue(_dialogueSequence);
                    break;

                case TriggerType.SceneTransition:
                    GameManager.Instance.TransitionToScene(_targetScene, _spawnPosition, _transitionDelay);
                    break;

                case TriggerType.ItemPickup:
                    yield return PickupItem();
                    break;

                case TriggerType.BattleTrigger:
                    GameManager.Instance.StartBattle(new System.Collections.Generic.List<Data.EnemyData>(_fixedEnemies), _isAmbush);
                    break;
            }

            if (_hideAfterTrigger && _triggerOnce) gameObject.SetActive(false);
        }

        IEnumerator PickupItem()
        {
            if (_item == null) yield break;

            if (_pickupVFX != null) Instantiate(_pickupVFX, transform.position, Quaternion.identity);

            string msg = _quantity > 1
                ? $"{_item.ItemName} ×{_quantity} を手に入れた！"
                : $"{_item.ItemName} を手に入れた！";

            yield return DialogueSystem.Instance.PlaySingleLine(string.Empty, msg);
            OnItemPickedUp?.Invoke(_item, _quantity);
        }
    }
}
