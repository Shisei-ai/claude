use rand::Rng;
use serde::{Deserialize, Serialize};

pub const MAP_WIDTH: usize = 80;
pub const MAP_HEIGHT: usize = 45;

// ── Compact zone for small floor types (centered in the 80×45 grid) ──────────
const CZ_X1: i32 = 15;
const CZ_Y1: i32 = 8;
const CZ_X2: i32 = 65;
const CZ_Y2: i32 = 37;

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Tile {
    Wall,
    Floor,
    Door,
    StairsDown,
    StairsUp,
    CraftingAnvil,
    Shrine,
    Chest,
    Void,
}

impl Tile {
    pub fn walkable(self) -> bool {
        matches!(
            self,
            Tile::Floor
                | Tile::Door
                | Tile::StairsDown
                | Tile::StairsUp
                | Tile::CraftingAnvil
                | Tile::Shrine
                | Tile::Chest
        )
    }

    pub fn blocks_sight(self) -> bool {
        matches!(self, Tile::Wall | Tile::Void)
    }

    pub fn char(self) -> char {
        match self {
            Tile::Wall => '#',
            Tile::Floor => '.',
            Tile::Door => '+',
            Tile::StairsDown => '>',
            Tile::StairsUp => '<',
            Tile::CraftingAnvil => 'A',
            Tile::Shrine => '!',
            Tile::Chest => '$',
            Tile::Void => ' ',
        }
    }
}

// ── Floor type ────────────────────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum FloorType {
    /// Standard multi-room exploration dungeon.
    Exploration,
    /// Small floor packed with chests, guarded by elite enemies.
    Treasury,
    /// Compact arena: one elite boss + a handful of minions.
    MiniBoss,
    /// Large, swarming floor filled with waves of weak enemies.
    Horde,
    /// Compact floor of shrines — spend resources for big rewards.
    Trial,
    /// Peaceful sanctuary: no enemies, multiple shrines and anvils, free heal.
    Sanctuary,
    /// Dark, cursed floor with powerful enemies and exceptional loot.
    Cursed,
}

impl FloorType {
    pub fn name(self) -> &'static str {
        match self {
            FloorType::Exploration => "探索フロア",
            FloorType::Treasury    => "宝物庫",
            FloorType::MiniBoss    => "中ボスフロア",
            FloorType::Horde       => "群衆フロア",
            FloorType::Trial       => "試練の間",
            FloorType::Sanctuary   => "聖域",
            FloorType::Cursed      => "呪われたフロア",
        }
    }

    pub fn description(self) -> &'static str {
        match self {
            FloorType::Exploration => "広大なダンジョン — 探索と戦闘が待つ",
            FloorType::Treasury    => "宝箱が並ぶが、番人が守っている",
            FloorType::MiniBoss    => "強敵が待ち受ける試練の間",
            FloorType::Horde       => "無数の魔物が徘徊する修羅場",
            FloorType::Trial       => "資源を賭けた選択が待つ祠の間",
            FloorType::Sanctuary   => "安らぎの地 — ゆっくり休んで準備を整えよう",
            FloorType::Cursed      => "呪いに満ちた闇の層 — 危険だが報酬は大きい",
        }
    }

    fn is_compact(self) -> bool {
        matches!(self, FloorType::Trial | FloorType::MiniBoss | FloorType::Sanctuary | FloorType::Treasury)
    }

    fn max_rooms(self, floor: u32) -> i32 {
        match self {
            FloorType::Exploration => 15 + (floor as i32 / 3).min(10),
            FloorType::Treasury    => 7 + (floor as i32 / 5).min(3),
            FloorType::MiniBoss    => 5,
            FloorType::Horde       => 22 + (floor as i32 / 4).min(8),
            FloorType::Trial       => 6,
            FloorType::Sanctuary   => 7,
            FloorType::Cursed      => 16 + (floor as i32 / 3).min(8),
        }
    }

    fn room_size_range(self) -> (i32, i32) {
        match self {
            FloorType::MiniBoss    => (5, 10),
            FloorType::Horde       => (5, 14),
            FloorType::Trial       => (5, 9),
            FloorType::Sanctuary   => (5, 10),
            _                      => (4, 12),
        }
    }
}

// ── Room ──────────────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
pub struct Room {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

impl Room {
    pub fn new(x: i32, y: i32, w: i32, h: i32) -> Self {
        Room { x, y, w, h }
    }

    pub fn center(&self) -> (i32, i32) {
        (self.x + self.w / 2, self.y + self.h / 2)
    }

    pub fn intersects(&self, other: &Room) -> bool {
        self.x < other.x + other.w + 1
            && self.x + self.w + 1 > other.x
            && self.y < other.y + other.h + 1
            && self.y + self.h + 1 > other.y
    }
}

// ── Map ───────────────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
pub struct Map {
    pub tiles: Vec<Vec<Tile>>,
    pub visible: Vec<Vec<bool>>,
    pub explored: Vec<Vec<bool>>,
    pub rooms: Vec<Room>,
    pub width: usize,
    pub height: usize,
    pub floor: u32,
    pub floor_type: FloorType,
}

impl Map {
    pub fn new(floor: u32, floor_type: FloorType) -> Self {
        Map {
            tiles: vec![vec![Tile::Void; MAP_HEIGHT]; MAP_WIDTH],
            visible: vec![vec![false; MAP_HEIGHT]; MAP_WIDTH],
            explored: vec![vec![false; MAP_HEIGHT]; MAP_WIDTH],
            rooms: Vec::new(),
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            floor,
            floor_type,
        }
    }

    pub fn get(&self, x: i32, y: i32) -> Tile {
        if x < 0 || y < 0 || x >= self.width as i32 || y >= self.height as i32 {
            return Tile::Void;
        }
        self.tiles[x as usize][y as usize]
    }

    pub fn set(&mut self, x: i32, y: i32, tile: Tile) {
        if x >= 0 && y >= 0 && x < self.width as i32 && y < self.height as i32 {
            self.tiles[x as usize][y as usize] = tile;
        }
    }

    pub fn is_walkable(&self, x: i32, y: i32) -> bool {
        self.get(x, y).walkable()
    }

    // ── Map generation ────────────────────────────────────────────────────────

    pub fn generate<R: Rng>(&mut self, rng: &mut R) -> (i32, i32) {
        let ft = self.floor_type;
        let floor = self.floor;

        let max_rooms = ft.max_rooms(floor);
        let (min_rs, max_rs) = ft.room_size_range();

        // Placement zone: compact types use the centre of the grid
        let (zone_x1, zone_y1, zone_x2, zone_y2) = if ft.is_compact() {
            (CZ_X1, CZ_Y1, CZ_X2, CZ_Y2)
        } else {
            (1, 1, MAP_WIDTH as i32 - 1, MAP_HEIGHT as i32 - 1)
        };

        let mut rooms: Vec<Room> = Vec::new();
        let mut start_pos = ((zone_x1 + zone_x2) / 2, (zone_y1 + zone_y2) / 2);

        for _ in 0..400 {
            let w = rng.gen_range(min_rs..=max_rs);
            let h = rng.gen_range(min_rs..=(max_rs - 2).max(min_rs));
            let x = rng.gen_range(zone_x1..=(zone_x2 - w - 1).max(zone_x1 + 1));
            let y = rng.gen_range(zone_y1..=(zone_y2 - h - 1).max(zone_y1 + 1));
            let room = Room::new(x, y, w, h);

            if rooms.iter().any(|r| r.intersects(&room)) {
                continue;
            }

            self.carve_room(&room);

            if rooms.is_empty() {
                start_pos = room.center();
            } else {
                let prev = rooms.last().unwrap().center();
                let next = room.center();
                if rng.gen_bool(0.5) {
                    self.carve_h_tunnel(prev.0, next.0, prev.1);
                    self.carve_v_tunnel(prev.1, next.1, next.0);
                } else {
                    self.carve_v_tunnel(prev.1, next.1, prev.0);
                    self.carve_h_tunnel(prev.0, next.0, next.1);
                }
            }
            rooms.push(room);
            if rooms.len() as i32 >= max_rooms {
                break;
            }
        }

        // ── Stairs ───────────────────────────────────────────────────────────
        if let Some(last) = rooms.last() {
            let (sx, sy) = last.center();
            self.set(sx, sy, Tile::StairsDown);
        }
        if floor > 1 {
            self.set(start_pos.0, start_pos.1, Tile::StairsUp);
        }

        // ── Type-specific special tiles ───────────────────────────────────────
        match ft {
            FloorType::Exploration | FloorType::Cursed => {
                for room in rooms.iter().skip(2) {
                    let roll = rng.gen_range(0..10);
                    let (cx, cy) = room.center();
                    match roll {
                        0 => self.set(cx, cy, Tile::CraftingAnvil),
                        1 => self.set(cx, cy, Tile::Shrine),
                        2 | 3 => self.set(cx, cy, Tile::Chest),
                        _ => {}
                    }
                }
            }
            FloorType::Treasury => {
                // Chest in every non-start room except last (boss/guard room)
                for room in rooms.iter().skip(1).rev().skip(1) {
                    let (cx, cy) = room.center();
                    self.set(cx, cy, Tile::Chest);
                }
            }
            FloorType::MiniBoss => {
                // No special tiles — game.rs places reward chest after boss death
            }
            FloorType::Horde => {
                // Occasional crafting anvil only
                for room in rooms.iter().skip(2) {
                    if rng.gen_range(0..20) == 0 {
                        let (cx, cy) = room.center();
                        self.set(cx, cy, Tile::CraftingAnvil);
                    }
                }
            }
            FloorType::Trial => {
                // Shrine in every room except start/exit
                for room in rooms.iter().skip(1).rev().skip(1) {
                    let (cx, cy) = room.center();
                    self.set(cx, cy, Tile::Shrine);
                }
            }
            FloorType::Sanctuary => {
                // Alternating Shrine / CraftingAnvil in every non-start room
                for (i, room) in rooms.iter().skip(1).enumerate() {
                    let (cx, cy) = room.center();
                    if i % 2 == 0 {
                        self.set(cx, cy, Tile::Shrine);
                    } else {
                        self.set(cx, cy, Tile::CraftingAnvil);
                    }
                }
            }
        }

        self.rooms = rooms;
        start_pos
    }

    // ── Carving helpers ───────────────────────────────────────────────────────

    fn carve_room(&mut self, room: &Room) {
        for x in room.x..room.x + room.w {
            for y in room.y..room.y + room.h {
                self.set(x, y, Tile::Floor);
            }
        }
        for x in room.x - 1..=room.x + room.w {
            for y in room.y - 1..=room.y + room.h {
                if self.get(x, y) == Tile::Void {
                    self.set(x, y, Tile::Wall);
                }
            }
        }
    }

    fn carve_h_tunnel(&mut self, x1: i32, x2: i32, y: i32) {
        for x in x1.min(x2)..=x1.max(x2) {
            if self.get(x, y) == Tile::Wall || self.get(x, y) == Tile::Void {
                self.set(x, y, Tile::Floor);
            }
        }
        for x in x1.min(x2)..=x1.max(x2) {
            for dy in [-1i32, 1] {
                if self.get(x, y + dy) == Tile::Void {
                    self.set(x, y + dy, Tile::Wall);
                }
            }
        }
    }

    fn carve_v_tunnel(&mut self, y1: i32, y2: i32, x: i32) {
        for y in y1.min(y2)..=y1.max(y2) {
            if self.get(x, y) == Tile::Wall || self.get(x, y) == Tile::Void {
                self.set(x, y, Tile::Floor);
            }
        }
        for y in y1.min(y2)..=y1.max(y2) {
            for dx in [-1i32, 1] {
                if self.get(x + dx, y) == Tile::Void {
                    self.set(x + dx, y, Tile::Wall);
                }
            }
        }
    }

    // ── FOV ───────────────────────────────────────────────────────────────────

    pub fn compute_fov(&mut self, origin_x: i32, origin_y: i32, radius: i32) {
        for row in self.visible.iter_mut() {
            for v in row.iter_mut() {
                *v = false;
            }
        }
        self.visible[origin_x as usize][origin_y as usize] = true;
        self.explored[origin_x as usize][origin_y as usize] = true;

        for octant in 0..8 {
            self.cast_light(origin_x, origin_y, radius, 1, 1.0, 0.0, octant);
        }
    }

    fn cast_light(
        &mut self,
        ox: i32,
        oy: i32,
        radius: i32,
        row: i32,
        mut start_slope: f32,
        end_slope: f32,
        octant: i32,
    ) {
        if start_slope < end_slope {
            return;
        }
        let radius_sq = (radius * radius) as f32;
        let mut blocked = false;
        let mut new_start = 0.0f32;

        'outer: for dist in row..=radius {
            for dx in -dist..=0 {
                let dy = -dist;
                let (mx, my) = self.transform_octant(ox, oy, dx, dy, octant);

                let l_slope = (dx as f32 - 0.5) / (dy as f32 + 0.5);
                let r_slope = (dx as f32 + 0.5) / (dy as f32 - 0.5);

                if start_slope < r_slope { continue; }
                if end_slope > l_slope   { break; }

                if (dx * dx + dy * dy) as f32 <= radius_sq
                    && mx >= 0 && my >= 0
                    && mx < self.width as i32 && my < self.height as i32
                {
                    self.visible[mx as usize][my as usize] = true;
                    self.explored[mx as usize][my as usize] = true;
                }

                if blocked {
                    if self.get(mx, my).blocks_sight() {
                        new_start = r_slope;
                    } else {
                        blocked = false;
                        start_slope = new_start;
                    }
                } else if self.get(mx, my).blocks_sight() {
                    blocked = true;
                    new_start = r_slope;
                    self.cast_light(ox, oy, radius, dist + 1, start_slope, l_slope, octant);
                }
            }
            if blocked { break 'outer; }
        }
    }

    fn transform_octant(&self, ox: i32, oy: i32, x: i32, y: i32, octant: i32) -> (i32, i32) {
        match octant {
            0 => (ox - x, oy + y),
            1 => (ox - y, oy + x),
            2 => (ox + y, oy + x),
            3 => (ox + x, oy + y),
            4 => (ox + x, oy - y),
            5 => (ox + y, oy - x),
            6 => (ox - y, oy - x),
            7 => (ox - x, oy - y),
            _ => (ox, oy),
        }
    }
}
