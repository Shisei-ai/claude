use rand::Rng;
use serde::{Deserialize, Serialize};

pub const MAP_WIDTH: usize = 80;
pub const MAP_HEIGHT: usize = 45;

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

#[derive(Clone, Serialize, Deserialize)]
pub struct Map {
    pub tiles: Vec<Vec<Tile>>,
    pub visible: Vec<Vec<bool>>,
    pub explored: Vec<Vec<bool>>,
    pub rooms: Vec<Room>,
    pub width: usize,
    pub height: usize,
    pub floor: u32,
}

impl Map {
    pub fn new(floor: u32) -> Self {
        Map {
            tiles: vec![vec![Tile::Void; MAP_HEIGHT]; MAP_WIDTH],
            visible: vec![vec![false; MAP_HEIGHT]; MAP_WIDTH],
            explored: vec![vec![false; MAP_HEIGHT]; MAP_WIDTH],
            rooms: Vec::new(),
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            floor,
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

    pub fn generate<R: Rng>(&mut self, rng: &mut R) -> (i32, i32) {
        let max_rooms = 15 + (self.floor as i32 / 3).min(10);
        let min_room_size = 4;
        let max_room_size = 12;

        let mut rooms: Vec<Room> = Vec::new();
        let mut start_pos = (1, 1);

        for _ in 0..200 {
            let w = rng.gen_range(min_room_size..=max_room_size);
            let h = rng.gen_range(min_room_size..=(max_room_size - 2));
            let x = rng.gen_range(1..self.width as i32 - w - 1);
            let y = rng.gen_range(1..self.height as i32 - h - 1);
            let room = Room::new(x, y, w, h);

            if rooms.iter().any(|r| r.intersects(&room)) {
                continue;
            }

            self.carve_room(&room);

            if rooms.is_empty() {
                start_pos = room.center();
            } else {
                let prev_center = rooms.last().unwrap().center();
                let new_center = room.center();
                if rng.gen_bool(0.5) {
                    self.carve_h_tunnel(prev_center.0, new_center.0, prev_center.1);
                    self.carve_v_tunnel(prev_center.1, new_center.1, new_center.0);
                } else {
                    self.carve_v_tunnel(prev_center.1, new_center.1, prev_center.0);
                    self.carve_h_tunnel(prev_center.0, new_center.0, new_center.1);
                }
            }
            rooms.push(room);
            if rooms.len() as i32 >= max_rooms {
                break;
            }
        }

        // Place stairs
        if let Some(last_room) = rooms.last() {
            let (sx, sy) = last_room.center();
            self.set(sx, sy, Tile::StairsDown);
        }

        // Place start stairs (only on floor > 1)
        if self.floor > 1 {
            self.set(start_pos.0, start_pos.1, Tile::StairsUp);
        }

        // Place special tiles
        for room in rooms.iter().skip(2) {
            let roll = rng.gen_range(0..10);
            if roll == 0 {
                let (cx, cy) = room.center();
                self.set(cx, cy, Tile::CraftingAnvil);
            } else if roll == 1 {
                let (cx, cy) = room.center();
                self.set(cx, cy, Tile::Shrine);
            } else if roll <= 3 {
                let (cx, cy) = room.center();
                self.set(cx, cy, Tile::Chest);
            }
        }

        self.rooms = rooms;
        start_pos
    }

    fn carve_room(&mut self, room: &Room) {
        for x in room.x..room.x + room.w {
            for y in room.y..room.y + room.h {
                self.set(x, y, Tile::Floor);
            }
        }
        // Walls are already Void; add explicit wall border
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
        // Wall borders
        for x in x1.min(x2)..=x1.max(x2) {
            for dy in [-1i32, 1] {
                let ny = y + dy;
                if self.get(x, ny) == Tile::Void {
                    self.set(x, ny, Tile::Wall);
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
                let nx = x + dx;
                if self.get(nx, y) == Tile::Void {
                    self.set(nx, y, Tile::Wall);
                }
            }
        }
    }

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

                if start_slope < r_slope {
                    continue;
                }
                if end_slope > l_slope {
                    break;
                }

                if (dx * dx + dy * dy) as f32 <= radius_sq {
                    if mx >= 0
                        && my >= 0
                        && mx < self.width as i32
                        && my < self.height as i32
                    {
                        self.visible[mx as usize][my as usize] = true;
                        self.explored[mx as usize][my as usize] = true;
                    }
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
            if blocked {
                break 'outer;
            }
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
