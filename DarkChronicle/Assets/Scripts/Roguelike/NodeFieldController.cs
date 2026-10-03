using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Battle;
using DarkChronicle.Character.Traits;
using DarkChronicle.Core;
using DarkChronicle.Data;
using DarkChronicle.HD2D;
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

        [Header("Field Gimmicks")]
        [SerializeField] LockedChest  _lockedChest;
        [SerializeField] FieldTrap[]  _fieldTraps;
        [SerializeField] DarknessZone _darknessZone;

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

            // Gimmick auto-find (used when not wired in Inspector)
            if (_lockedChest == null && _treasureRoot != null)
                _lockedChest = _treasureRoot.GetComponentInChildren<LockedChest>(true);
            if (_darknessZone == null && _cursedRoomRoot != null)
                _darknessZone = _cursedRoomRoot.GetComponentInChildren<DarknessZone>(true);
            if ((_fieldTraps == null || _fieldTraps.Length == 0) && _cursedRoomRoot != null)
                _fieldTraps = _cursedRoomRoot.GetComponentsInChildren<FieldTrap>(true);
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
                    SetupTreasureNode();
                    break;
                case NodeType.CursedRoom:
                    DisableEncounters();
                    SetActive(_cursedRoomRoot, true);
                    SetupCursedRoomNode();
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

        void SetupTreasureNode()
        {
            bool canPickLock = HasTrait<Trait_RoguesCraft>();
            _lockedChest?.Initialize(canPickLock);
        }

        void SetupCursedRoomNode()
        {
            bool hasRoguesCraft = HasTrait<Trait_RoguesCraft>();

            if (_fieldTraps != null)
                foreach (var trap in _fieldTraps)
                    trap?.Initialize(hasRoguesCraft);

            _darknessZone?.Initialize(hasRoguesCraft);
        }

        bool HasTrait<T>() where T : CharacterTrait
        {
            var traits = _ctx?.Run?.SelectedCharacter?.Traits;
            if (traits == null) return false;
            return System.Array.Exists(traits, t => t is T);
        }

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

            // ShadowVeil: 通常戦闘ノードの初回戦闘で全敵シールド-1（フラグを消費）
            if (run.BlessingFirstCombatShieldReduction && enemies != null)
            {
                run.BlessingFirstCombatShieldReduction = false;
                var reduced = new List<EnemyData>(enemies.Count);
                foreach (var e in enemies)
                {
                    if (e != null && e.ShieldPoints > 1)
                    {
                        var copy = Object.Instantiate(e);
                        copy.ShieldPoints = e.ShieldPoints - 1;
                        reduced.Add(copy);
                    }
                    else
                    {
                        reduced.Add(e);
                    }
                }
                enemies = reduced;
            }

            // Build hero lists — main hero first, then party members
            var heroData  = new List<CharacterData>  { run.SelectedCharacter };
            var heroStats = new List<CharacterStats> { _ctx.GetHeroStats() };
            var heroHP    = new List<int>            { run.CurrentHP };
            for (int i = 0; i < _ctx.PartyData.Count; i++)
            {
                heroData.Add(_ctx.PartyData[i]);
                heroStats.Add(_ctx.PartyStats[i]);
                heroHP.Add(i < _ctx.PartyCurrentHP.Count ? _ctx.PartyCurrentHP[i] : _ctx.PartyStats[i].MaxHP);
            }

            var initialBP = run.MetaStartBP > 0
                ? new List<int> { run.MetaStartBP }
                : null;

            AtmosphereManager.Instance?.EnterBattle();
            BattleManager.Instance.StartBattle(
                heroData,
                heroStats,
                enemies,
                new List<ItemData>(run.Inventory),
                usedItem => run.Inventory.Remove(usedItem),
                heroCurrentHP: heroHP,
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
                {
                    _ctx.Run.CurrentHP = Mathf.Clamp(BattleManager.Instance.VictoryHeroHP,
                                                     1, _ctx.Run.MaxHP);
                    var allHP = BattleManager.Instance.VictoryAllHeroHP;
                    for (int i = 0; i < _ctx.Run.PartyCurrentHP.Count; i++)
                    {
                        int idx = i + 1;
                        if (idx < allHP.Count && i < _ctx.Run.PartyMaxHP.Count)
                            _ctx.Run.PartyCurrentHP[i] = Mathf.Clamp(allHP[idx], 1, _ctx.Run.PartyMaxHP[i]);
                    }
                }

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
