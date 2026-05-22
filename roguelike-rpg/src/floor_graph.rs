use rand::Rng;
use rand::seq::SliceRandom;
use std::collections::HashMap;
use crate::map::FloorType;

pub type FloorId = u32;

#[derive(Clone, Debug)]
pub struct FloorNode {
    pub id: FloorId,
    pub depth: u32,
    pub floor_type: FloorType,
    /// Floor IDs this floor connects to (the staircases lead here).
    pub exits: Vec<FloorId>,
}

pub struct FloorGraph {
    pub nodes: HashMap<FloorId, FloorNode>,
    by_depth: HashMap<u32, Vec<FloorId>>,
    next_id: FloorId,
    pub generated_max_depth: u32,
}

impl FloorGraph {
    pub fn new<R: Rng>(rng: &mut R) -> Self {
        let root = FloorNode {
            id: 1,
            depth: 1,
            floor_type: FloorType::Exploration,
            exits: Vec::new(),
        };
        let mut g = FloorGraph {
            nodes: HashMap::new(),
            by_depth: HashMap::new(),
            next_id: 2,
            generated_max_depth: 1,
        };
        g.nodes.insert(1, root);
        g.by_depth.insert(1, vec![1]);
        // Pre-generate enough depth so the first tablet view works immediately.
        g.ensure_depth(15, rng);
        g
    }

    // ── Public queries ────────────────────────────────────────────────────────

    pub fn get_node(&self, id: FloorId) -> Option<&FloorNode> {
        self.nodes.get(&id)
    }

    pub fn exits_of(&self, id: FloorId) -> Vec<FloorId> {
        self.nodes.get(&id).map(|n| n.exits.clone()).unwrap_or_default()
    }

    pub fn depth_of(&self, id: FloorId) -> u32 {
        self.nodes.get(&id).map(|n| n.depth).unwrap_or(0)
    }

    pub fn floor_type_of(&self, id: FloorId) -> FloorType {
        self.nodes.get(&id).map(|n| n.floor_type).unwrap_or(FloorType::Exploration)
    }

    pub fn floors_at_depth(&self, depth: u32) -> Vec<FloorId> {
        self.by_depth.get(&depth).cloned().unwrap_or_default()
    }

    /// Returns an arbitrary floor reachable at the given depth from `from_id`
    /// within a small forward BFS. Falls back to any floor at that depth.
    pub fn reachable_at_depth<R: Rng>(&self, from_id: FloorId, target_depth: u32, rng: &mut R) -> Option<FloorId> {
        // BFS from from_id, collect all nodes at target_depth
        let mut frontier = vec![from_id];
        let mut found: Vec<FloorId> = Vec::new();
        let mut visited = std::collections::HashSet::new();
        visited.insert(from_id);

        while !frontier.is_empty() && found.is_empty() {
            let mut next = Vec::new();
            for id in frontier {
                if self.depth_of(id) == target_depth {
                    found.push(id);
                    continue;
                }
                for &exit in &self.exits_of(id) {
                    if !visited.contains(&exit) && self.depth_of(exit) <= target_depth {
                        visited.insert(exit);
                        next.push(exit);
                    }
                }
            }
            frontier = next;
        }

        if !found.is_empty() {
            let idx = rng.gen_range(0..found.len());
            return Some(found[idx]);
        }
        // Fallback: any floor at that depth
        let all = self.floors_at_depth(target_depth);
        if all.is_empty() { return None; }
        Some(all[rng.gen_range(0..all.len())])
    }

    // ── Graph extension ───────────────────────────────────────────────────────

    pub fn ensure_depth<R: Rng>(&mut self, target_depth: u32, rng: &mut R) {
        if target_depth <= self.generated_max_depth { return; }
        for d in (self.generated_max_depth + 1)..=target_depth {
            self.generate_depth(d, rng);
        }
        self.generated_max_depth = target_depth;
    }

    fn alloc_id(&mut self) -> FloorId {
        let id = self.next_id;
        self.next_id += 1;
        id
    }

    fn generate_depth<R: Rng>(&mut self, depth: u32, rng: &mut R) {
        let is_boss = depth % 5 == 0;
        let prev_ids = self.by_depth.get(&(depth - 1)).cloned().unwrap_or_default();
        if prev_ids.is_empty() { return; }

        // How many variants to create at this depth
        let num_variants: usize = if is_boss {
            1
        } else {
            // 1 to min(prev_count+1, 3) — grows organically with branching
            rng.gen_range(1..=(prev_ids.len() + 1).min(3))
        };

        // Create the new floor nodes
        let mut curr_ids: Vec<FloorId> = Vec::new();
        for _ in 0..num_variants {
            let id = self.alloc_id();
            let ft = if is_boss {
                FloorType::MiniBoss
            } else {
                pick_floor_type(depth, rng)
            };
            self.nodes.insert(id, FloorNode { id, depth, floor_type: ft, exits: Vec::new() });
            curr_ids.push(id);
        }
        self.by_depth.insert(depth, curr_ids.clone());

        // Assign exits from each previous node to 2-3 nodes in curr
        for &prev_id in &prev_ids {
            let num_exits = if is_boss {
                1
            } else {
                rng.gen_range(2..=3usize).min(curr_ids.len())
            };
            let mut choices = curr_ids.clone();
            choices.shuffle(rng);
            choices.truncate(num_exits);
            if let Some(n) = self.nodes.get_mut(&prev_id) {
                n.exits = choices;
            }
        }

        // Guarantee every curr node is reachable from at least one prev node
        for &curr_id in &curr_ids {
            let reachable = prev_ids.iter().any(|&pid| {
                self.nodes.get(&pid).map(|n| n.exits.contains(&curr_id)).unwrap_or(false)
            });
            if !reachable {
                let pid = prev_ids[rng.gen_range(0..prev_ids.len())];
                if let Some(n) = self.nodes.get_mut(&pid) {
                    if !n.exits.contains(&curr_id) {
                        n.exits.push(curr_id);
                    }
                }
            }
        }
    }
}

/// Pick a random floor type for graph pre-generation (no Game RNG state needed).
pub fn pick_floor_type<R: Rng>(depth: u32, rng: &mut R) -> FloorType {
    if depth == 1 { return FloorType::Exploration; }
    if depth % 5 == 0 { return FloorType::MiniBoss; }
    let roll = rng.gen_range(0..100u32);
    match roll {
        0..=34  => FloorType::Exploration,
        35..=48 => FloorType::Treasury,
        49..=62 => FloorType::Horde,
        63..=74 => FloorType::Trial,
        75..=84 => FloorType::Sanctuary,
        _       => FloorType::Cursed,
    }
}
