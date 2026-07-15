using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace DarkChronicle.Roguelike.Map
{
    /// <summary>
    /// Procedurally generates a Slay the Spire-style node map per floor.
    /// Fixed rows × variable columns; edges ensure every path reaches the boss.
    /// </summary>
    public static class NodeMapGenerator
    {
        // ── Config ─────────────────────────────────────────────────────────
        public const int Rows    = 15;   // nodes along the path (depth)
        public const int Columns = 7;    // max nodes per row (width)

        // Row-type probability tables (index = row, value = allowed types + weights)
        static readonly NodeType[][] RowAllowedTypes =
        {
            // Row 0 : always start
            new[] { NodeType.Battle },
            // Row 1-3 : mostly normal battles, occasional event/treasure
            new[] { NodeType.Battle, NodeType.Battle, NodeType.Battle, NodeType.RandomEvent, NodeType.Treasure },
            new[] { NodeType.Battle, NodeType.Battle, NodeType.RandomEvent, NodeType.Treasure },
            new[] { NodeType.Battle, NodeType.Battle, NodeType.Battle, NodeType.Shop, NodeType.RandomEvent },
            // Row 4 : guaranteed rest site
            new[] { NodeType.RestSite },
            // Row 5-7 : elite battles start appearing
            new[] { NodeType.Battle, NodeType.EliteBattle, NodeType.RandomEvent, NodeType.Shop },
            new[] { NodeType.Battle, NodeType.EliteBattle, NodeType.CursedRoom, NodeType.Treasure },
            new[] { NodeType.EliteBattle, NodeType.Battle, NodeType.RandomEvent, NodeType.Shop },
            // Row 8 : second rest site
            new[] { NodeType.RestSite },
            // Row 9-12 : heavy elites + cursed rooms
            new[] { NodeType.EliteBattle, NodeType.Battle, NodeType.CursedRoom, NodeType.Shop },
            new[] { NodeType.EliteBattle, NodeType.EliteBattle, NodeType.RandomEvent, NodeType.Treasure },
            new[] { NodeType.EliteBattle, NodeType.CursedRoom, NodeType.Battle, NodeType.Shop },
            new[] { NodeType.EliteBattle, NodeType.Battle, NodeType.RandomEvent },
            // Row 13 : shop before boss
            new[] { NodeType.Shop },
            // Row 14 : BOSS
            new[] { NodeType.Boss },
        };

        // ── Generation ─────────────────────────────────────────────────────
        public static MapData Generate(int seed, int floorIndex)
        {
            var rng  = new System.Random(seed + floorIndex * 9999);
            var map  = new MapData { FloorIndex = floorIndex, Seed = seed };
            map.Nodes = new List<MapNode>();

            // 1. Decide which columns are "live" per row (5-7 out of 7)
            int[][] liveColumns = new int[Rows][];
            for (int row = 0; row < Rows; row++)
            {
                if (IsFixedRow(row))
                {
                    liveColumns[row] = new[] { 3 };  // center only
                }
                else
                {
                    int count = rng.Next(4, Columns + 1);
                    liveColumns[row] = Enumerable.Range(0, Columns)
                        .OrderBy(_ => rng.Next())
                        .Take(count)
                        .OrderBy(c => c)
                        .ToArray();
                }
            }

            // 2. Create node objects
            for (int row = 0; row < Rows; row++)
            {
                foreach (int col in liveColumns[row])
                {
                    var type = PickNodeType(row, rng, floorIndex);
                    int nodeID = row * 100 + col;
                    map.Nodes.Add(new MapNode
                    {
                        Row       = row,
                        Column    = col,
                        Type      = type,
                        ID        = nodeID,
                        // Deterministic content ID — RoguelikeManager can use this
                        // to seed encounter group selection reproducibly.
                        ContentID = $"{(int)type}_{seed + nodeID * 137 + floorIndex * 9973}",
                    });
                }
            }

            // 3. Connect edges (row N → row N+1), prefer closer columns
            for (int row = 0; row < Rows - 1; row++)
            {
                var fromNodes = map.GetRow(row);
                var toNodes   = map.GetRow(row + 1);

                // Every "to" node must have at least one incoming edge
                var unconnected = new HashSet<int>(toNodes.Select(n => n.ID));

                foreach (var from in fromNodes)
                {
                    // Connect to closest column(s)
                    var candidates = toNodes
                        .OrderBy(t => Mathf.Abs(t.Column - from.Column))
                        .Take(rng.Next(1, 3))
                        .ToList();

                    foreach (var to in candidates)
                    {
                        if (!from.NextIDs.Contains(to.ID)) from.NextIDs.Add(to.ID);
                        unconnected.Remove(to.ID);
                    }
                }

                // Ensure every to-node is reachable
                foreach (int unconnID in unconnected)
                {
                    var target = toNodes.First(n => n.ID == unconnID);
                    var closest = fromNodes.OrderBy(f => Mathf.Abs(f.Column - target.Column)).First();
                    if (!closest.NextIDs.Contains(target.ID)) closest.NextIDs.Add(target.ID);
                }
            }

            return map;
        }

        static bool IsFixedRow(int row) => row == 4 || row == 8 || row == 13 || row == 14;

        static NodeType PickNodeType(int row, System.Random rng, int floorIndex)
        {
            if (row >= RowAllowedTypes.Length) return NodeType.Battle;
            var pool = RowAllowedTypes[row];

            // Later floors: shift probability toward harder nodes
            if (floorIndex >= 2 && pool.Contains(NodeType.Battle))
            {
                var hard = pool.Where(t => t != NodeType.Battle).ToArray();
                if (hard.Length > 0 && rng.NextDouble() < 0.4) pool = hard;
            }

            return pool[rng.Next(pool.Length)];
        }
    }

    // ── Data Types ─────────────────────────────────────────────────────────
    [System.Serializable]
    public class MapData
    {
        public int            FloorIndex;
        public int            Seed;
        public List<MapNode>  Nodes = new();

        public List<MapNode> GetRow(int row)  => Nodes.FindAll(n => n.Row == row);
        public MapNode GetNode(int id)         => Nodes.Find(n => n.ID == id);
        public List<MapNode> GetStartNodes()   => GetRow(0);
        public List<MapNode> GetBossNodes()    => GetRow(NodeMapGenerator.Rows - 1);
    }

    [System.Serializable]
    public class MapNode
    {
        public int           ID;
        public int           Row;
        public int           Column;
        public NodeType      Type;
        public bool          Visited;
        public bool          Available;     // player can enter (connected to last visited)
        public List<int>     NextIDs = new();

        // Filled in at use-time from FloorData enemy/event pools
        public string        ContentID;    // enemy set ID or event ID
    }
}
