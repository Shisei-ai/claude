using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Events;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Cross-scene data container for the roguelike node currently being explored.
    /// Survives scene loads via DontDestroyOnLoad.
    /// RoguelikeManager fills it before additively loading the field scene,
    /// then polls IsComplete to know when the player has finished the node.
    /// </summary>
    public sealed class NodeFieldContext : MonoBehaviour
    {
        public static NodeFieldContext Current { get; private set; }

        // ── Node identity ─────────────────────────────────────────────────
        public NodeType          ActiveNodeType;
        public FloorData         Floor;
        public int               FloorIndex;
        public int               NodeID;

        // ── Battle payload (Elite / Boss: pre-scaled enemy list) ──────────
        public List<EnemyData>   OverrideEnemies = new();

        // ── Event payload ─────────────────────────────────────────────────
        public RandomEventData   PendingEvent;

        // ── Run reference (NodeFieldController needs this to start battles) ─
        public RunData                     Run;
        public System.Func<CharacterStats> GetHeroStats;

        // ── Completion state ──────────────────────────────────────────────
        public bool       IsComplete { get; private set; }
        public NodeResult LastResult { get; private set; }

        void Awake()
        {
            if (Current != null && Current != this) { Destroy(gameObject); return; }
            Current = this;
            DontDestroyOnLoad(gameObject);
        }

        void OnDestroy() { if (Current == this) Current = null; }

        /// <summary>
        /// Call this before loading the field scene to reset all state for the new node.
        /// </summary>
        public void Prepare(NodeType type, FloorData floor, int floorIndex,
                            RunData run, System.Func<CharacterStats> getStats)
        {
            ActiveNodeType = type;
            Floor          = floor;
            FloorIndex     = floorIndex;
            Run            = run;
            GetHeroStats   = getStats;
            OverrideEnemies.Clear();
            PendingEvent   = null;
            IsComplete     = false;
            LastResult     = null;
        }

        /// <summary>
        /// Called by NodeFieldController (via EventTrigger.NodeExit or OnBattleEnd)
        /// to signal that the node is done. Safe to call more than once — only first call counts.
        /// </summary>
        public void CompleteNode(NodeResult result)
        {
            if (IsComplete) return;
            LastResult = result ?? new NodeResult { WasVictory = true };
            IsComplete = true;
        }
    }

    // ── Result handed back to RoguelikeManager after the field unloads ────
    public sealed class NodeResult
    {
        public bool             WasVictory;
        public List<EnemyData>  DefeatedEnemies = new();
    }
}
