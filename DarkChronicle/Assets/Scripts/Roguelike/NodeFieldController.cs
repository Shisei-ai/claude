using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Core;
using DarkChronicle.Data;
using DarkChronicle.World;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Placed in the NodeField scene (loaded additively over the roguelike map).
    /// Reads NodeFieldContext.Current on Start and configures the field for the
    /// active node type — activating the correct GameObjects, enabling/disabling
    /// random encounters, and forwarding battle results back through the context.
    ///
    /// Sub-system UIs (Shop, Rest, Event) are rendered by singletons that live in
    /// the persistently loaded roguelike scene, so they remain reachable from here.
    ///
    /// Unity scene setup notes:
    ///   - This scene needs its own Camera; set its depth higher than the NodeMap camera
    ///     so it renders on top when both scenes are loaded additively.
    ///   - The NodeMap camera can be left active; the field camera's higher depth takes
    ///     precedence. Alternatively, disable the NodeMap camera from this script's Start.
    /// </summary>
    public sealed class NodeFieldController : MonoBehaviour
    {
        public static NodeFieldController Instance { get; private set; }

        // ── World ref ──────────────────────────────────────────────────────
        [Header("World")]
        [SerializeField] WorldMapController _worldMap;

        // ── Node-type root objects ─────────────────────────────────────────
        // Each root holds the scene objects relevant for that node type.
        // EventTriggers on children handle player interaction → signal back here.
        [Header("Node-type Root Objects")]
        [SerializeField] GameObject _exitRoot;        // EventTrigger(NodeExit) — shown when done
        [SerializeField] GameObject _eliteSpawnRoot;  // EventTrigger(FixedBattleTrigger)
        [SerializeField] GameObject _bossSpawnRoot;   // EventTrigger(FixedBattleTrigger)
        [SerializeField] GameObject _restSiteRoot;    // EventTrigger(RestSiteFire) + visuals
        [SerializeField] GameObject _shopNPCRoot;     // EventTrigger(ShopNPC) + visuals
        [SerializeField] GameObject _eventRoot;       // EventTrigger(EventNPC) + visuals
        [SerializeField] GameObject _treasureRoot;    // EventTrigger(NodeExit) + chest visuals
        [SerializeField] GameObject _cursedRoomRoot;  // EventTrigger(NodeExit) + altar visuals

        [Header("Player Spawn")]
        [SerializeField] Transform  _playerSpawn;

        NodeFieldContext         _ctx;
        readonly List<EnemyData> _defeatedEnemies = new();

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            Instance = this;

            // Auto-find node roots by convention name when not wired in the Inspector.
            // This allows scene creation without manual reference assignment.
            _exitRoot       ??= GameObject.Find("ExitRoot");
            _eliteSpawnRoot ??= GameObject.Find("EliteSpawnRoot");
            _bossSpawnRoot  ??= GameObject.Find("BossSpawnRoot");
            _restSiteRoot   ??= GameObject.Find("RestSiteRoot");
            _shopNPCRoot    ??= GameObject.Find("ShopNPCRoot");
            _eventRoot      ??= GameObject.Find("EventRoot");
            _treasureRoot   ??= GameObject.Find("TreasureRoot");
            _cursedRoomRoot ??= GameObject.Find("CursedRoomRoot");
            if (_playerSpawn == null)
                _playerSpawn = GameObject.Find("PlayerSpawn")?.transform;
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
            Character.PlayerController.OnEncounterTriggered -= OnRandomEncounter;
            BattleManager.OnBattleEnd                       -= OnBattleEnd;
        }

        void Start()
        {
            _ctx = NodeFieldContext.Current;

            // Deactivate all type-specific roots before selectively enabling the right one
            SetActive(_exitRoot,        false);
            SetActive(_eliteSpawnRoot,  false);
            SetActive(_bossSpawnRoot,   false);
            SetActive(_restSiteRoot,    false);
            SetActive(_shopNPCRoot,     false);
            SetActive(_eventRoot,       false);
            SetActive(_treasureRoot,    false);
            SetActive(_cursedRoomRoot,  false);

            // Standalone test scene (no active run context): just show the exit
            if (_ctx == null) { SetActive(_exitRoot, true); return; }

            ApplyAtmosphere();
            PositionPlayer();
            SetupByNodeType();
        }

        // ── Atmosphere & positioning ───────────────────────────────────────
        void ApplyAtmosphere()
        {
            if (_ctx.Floor == null) return;
            AtmosphereManager.Instance?.TransitionTo(_ctx.Floor.AtmospherePreset, 1.5f);
            AudioManager.Instance?.PlayBGM(_ctx.Floor.FloorBGM);
        }

        void PositionPlayer()
        {
            if (_playerSpawn == null) return;
            FindAnyObjectByType<Character.PlayerController>()?.TeleportTo(_playerSpawn.position);
        }

        // ── Node setup ─────────────────────────────────────────────────────
        void SetupByNodeType()
        {
            switch (_ctx.ActiveNodeType)
            {
                case NodeType.Battle:
                    SetupNormalBattle();
                    break;
                case NodeType.EliteBattle:
                    SetupFixedBattle(isBoss: false);
                    break;
                case NodeType.Boss:
                    SetupFixedBattle(isBoss: true);
                    break;
                case NodeType.RestSite:
                    DisableEncounters();
                    SetActive(_restSiteRoot, true);
                    break;
                case NodeType.Shop:
                    DisableEncounters();
                    SetActive(_shopNPCRoot, true);
                    break;
                case NodeType.RandomEvent:
                    DisableEncounters();
                    SetActive(_eventRoot, true);
                    break;
                case NodeType.Treasure:
                    DisableEncounters();
                    SetActive(_treasureRoot, true);
                    break;
                case NodeType.CursedRoom:
                    DisableEncounters();
                    SetActive(_cursedRoomRoot, true);
                    break;
            }
        }

        void SetupNormalBattle()
        {
            if (_ctx.Floor != null && _worldMap != null)
                _worldMap.SetEncounterRateOverride(_ctx.Floor.EncounterRateMultiplier);

            Character.PlayerController.OnEncounterTriggered += OnRandomEncounter;

            // Normal battles: exit is open from the start; player may leave freely
            // or keep fighting for more enemy kills / loot
            SetActive(_exitRoot, true);
        }

        void SetupFixedBattle(bool isBoss)
        {
            DisableEncounters();

            if (isBoss)
            {
                if (_ctx.Floor != null) AudioManager.Instance?.PlayBGM(_ctx.Floor.BossBGM);
                SetActive(_bossSpawnRoot, true);
            }
            else
            {
                SetActive(_eliteSpawnRoot, true);
            }

            BattleManager.OnBattleEnd += OnBattleEnd;
        }

        void DisableEncounters()
            => FindAnyObjectByType<Character.PlayerController>()?.SetEncountersEnabled(false);

        // ── Random encounter ───────────────────────────────────────────────
        void OnRandomEncounter()
        {
            Character.PlayerController.OnEncounterTriggered -= OnRandomEncounter;

            if (_ctx.Floor == null) return;

            var enemies = RollFromPool(_ctx.Floor.NormalEncounters, _ctx.Run?.Sanity ?? 0);
            if (enemies == null)
            {
                // Pool empty — re-subscribe and let the player try again
                Character.PlayerController.OnEncounterTriggered += OnRandomEncounter;
                return;
            }

            StartBattle(enemies);
            BattleManager.OnBattleEnd += OnBattleEnd;
        }

        // ── Fixed battle (called by EventTrigger.FixedBattleTrigger) ──────
        public void TriggerFixedBattle(List<EnemyData> enemies)
        {
            if (enemies == null || enemies.Count == 0) return;
            StartBattle(enemies);
            // OnBattleEnd already subscribed in SetupFixedBattle
        }

        void StartBattle(List<EnemyData> enemies)
        {
            if (_ctx?.Run == null) return;
            var run = _ctx.Run;

            var initialBP = run.MetaStartBP > 0
                ? new List<int> { run.MetaStartBP }
                : null;

            AtmosphereManager.Instance?.EnterBattle();
            BattleManager.Instance.StartBattle(
                new List<CharacterData> { run.SelectedCharacter },
                new List<CharacterStats> { _ctx.GetHeroStats() },
                enemies,
                new List<ItemData>(run.Inventory),
                usedItem => run.Inventory.Remove(usedItem),
                heroCurrentHP: new List<int> { run.CurrentHP },
                heroInitialBP: initialBP);
        }

        // ── Battle end ─────────────────────────────────────────────────────
        void OnBattleEnd(BattleResult result)
        {
            BattleManager.OnBattleEnd -= OnBattleEnd;
            AtmosphereManager.Instance?.ExitBattle();
            if (_ctx?.Floor != null)
                AudioManager.Instance?.PlayBGM(_ctx.Floor.FloorBGM);

            var defeated = BattleManager.Instance.VictoryEnemyData;

            if (result == BattleResult.Victory)
            {
                if (defeated != null) _defeatedEnemies.AddRange(defeated);
                if (_ctx?.Run != null) _ctx.Run.EnemiesKilled += defeated?.Count ?? 0;

                // Sync hero HP from battle result into RunData
                if (_ctx?.Run != null)
                    _ctx.Run.CurrentHP = Mathf.Clamp(BattleManager.Instance.VictoryHeroHP,
                                                     1, _ctx.Run.MaxHP);

                if (_ctx?.ActiveNodeType == NodeType.Battle)
                {
                    // Re-enable random encounters; player can fight more or leave via exit
                    Character.PlayerController.OnEncounterTriggered += OnRandomEncounter;
                }
                else
                {
                    // Elite / Boss: open exit only after clearing the fixed fight
                    OpenExit();
                }
            }
            else
            {
                // Defeat — hero is dead; zero out HP before signalling
                if (_ctx?.Run != null) _ctx.Run.CurrentHP = 0;
                _ctx?.CompleteNode(new NodeResult
                {
                    WasVictory      = false,
                    DefeatedEnemies = _defeatedEnemies,
                });
            }
        }

        // ── Public API (called by EventTrigger) ────────────────────────────
        /// <summary>Make the exit object visible so the player can leave the node.</summary>
        public void OpenExit() => SetActive(_exitRoot, true);

        /// <summary>
        /// Called by EventTrigger.NodeExit when the player steps on the exit collider.
        /// Signals node completion with victory.
        /// </summary>
        public void OnNodeExit()
        {
            _ctx?.CompleteNode(new NodeResult
            {
                WasVictory      = true,
                DefeatedEnemies = _defeatedEnemies,
            });
        }

        // ── Helpers ────────────────────────────────────────────────────────
        static List<EnemyData> RollFromPool(List<EnemyEncounterGroup> pool, int sanity)
        {
            if (pool == null || pool.Count == 0) return null;
            float total = pool.Sum(g => g.AdjustedWeight(sanity));
            float roll  = Random.Range(0f, total);
            float cum   = 0f;
            foreach (var g in pool)
            {
                cum += g.AdjustedWeight(sanity);
                if (roll < cum) return new List<EnemyData>(g.Enemies);
            }
            return new List<EnemyData>(pool[0].Enemies);
        }

        static void SetActive(GameObject go, bool active)
        {
            if (go != null) go.SetActive(active);
        }
    }
}
