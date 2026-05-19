use rand::Rng;
use serde::{Deserialize, Serialize};

pub const MAP_WIDTH: i32 = 60;
pub const MAP_HEIGHT: i32 = 45;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum TileType {
    Wall,
    Floor,
    StairsDown,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tile {
    pub tile_type: TileType,
    pub is_revealed: bool,
    pub is_visible: bool,
}

impl Tile {
    pub fn wall() -> Self {
        Tile { tile_type: TileType::Wall, is_revealed: false, is_visible: false }
    }
    pub fn floor() -> Self {
        Tile { tile_type: TileType::Floor, is_revealed: false, is_visible: false }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rect {
    pub x1: i32,
    pub y1: i32,
    pub x2: i32,
    pub y2: i32,
}

impl Rect {
    pub fn new(x: i32, y: i32, w: i32, h: i32) -> Self {
        Rect { x1: x, y1: y, x2: x + w, y2: y + h }
    }

    pub fn center(&self) -> (i32, i32) {
        ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)
    }

    pub fn intersects(&self, other: &Rect) -> bool {
        self.x1 <= other.x2 && self.x2 >= other.x1 && self.y1 <= other.y2 && self.y2 >= other.y1
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Map {
    pub tiles: Vec<Tile>,
    pub width: i32,
    pub height: i32,
    pub rooms: Vec<Rect>,
    pub floor_number: i32,
}

impl Map {
    pub fn new(floor_number: i32) -> Self {
        let total = (MAP_WIDTH * MAP_HEIGHT) as usize;
        Map {
            tiles: vec![Tile::wall(); total],
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            rooms: Vec::new(),
            floor_number,
        }
    }

    pub fn idx(&self, x: i32, y: i32) -> usize {
        (y * self.width + x) as usize
    }

    pub fn in_bounds(&self, x: i32, y: i32) -> bool {
        x >= 0 && x < self.width && y >= 0 && y < self.height
    }

    pub fn is_walkable(&self, x: i32, y: i32) -> bool {
        if !self.in_bounds(x, y) {
            return false;
        }
        let idx = self.idx(x, y);
        self.tiles[idx].tile_type != TileType::Wall
    }

    pub fn tile_at(&self, x: i32, y: i32) -> &Tile {
        let idx = self.idx(x, y);
        &self.tiles[idx]
    }

    fn set_tile(&mut self, x: i32, y: i32, tile_type: TileType) {
        if self.in_bounds(x, y) {
            let idx = self.idx(x, y);
            self.tiles[idx].tile_type = tile_type;
        }
    }

    fn carve_room(&mut self, room: &Rect) {
        for y in (room.y1 + 1)..room.y2 {
            for x in (room.x1 + 1)..room.x2 {
                self.set_tile(x, y, TileType::Floor);
            }
        }
    }

    fn carve_h_tunnel(&mut self, x1: i32, x2: i32, y: i32) {
        let (start, end) = if x1 < x2 { (x1, x2) } else { (x2, x1) };
        for x in start..=end {
            self.set_tile(x, y, TileType::Floor);
        }
    }

    fn carve_v_tunnel(&mut self, y1: i32, y2: i32, x: i32) {
        let (start, end) = if y1 < y2 { (y1, y2) } else { (y2, y1) };
        for y in start..=end {
            self.set_tile(x, y, TileType::Floor);
        }
    }

    pub fn generate<R: Rng>(&mut self, rng: &mut R) {
        let max_rooms = 20;
        let min_size = 4;
        let max_size = 10;

        for _ in 0..max_rooms {
            let w = rng.gen_range(min_size..=max_size);
            let h = rng.gen_range(min_size..=max_size);
            let x = rng.gen_range(1..(self.width - w - 1));
            let y = rng.gen_range(1..(self.height - h - 1));

            let new_room = Rect::new(x, y, w, h);
            let overlaps = self.rooms.iter().any(|r| r.intersects(&new_room));

            if !overlaps {
                self.carve_room(&new_room);

                if !self.rooms.is_empty() {
                    let (new_cx, new_cy) = new_room.center();
                    let (prev_cx, prev_cy) = self.rooms.last().unwrap().center();

                    if rng.gen_bool(0.5) {
                        self.carve_h_tunnel(prev_cx, new_cx, prev_cy);
                        self.carve_v_tunnel(prev_cy, new_cy, new_cx);
                    } else {
                        self.carve_v_tunnel(prev_cy, new_cy, prev_cx);
                        self.carve_h_tunnel(prev_cx, new_cx, new_cy);
                    }
                }

                self.rooms.push(new_room);
            }
        }

        // Place stairs in the last room
        if let Some(last_room) = self.rooms.last() {
            let (sx, sy) = last_room.center();
            self.set_tile(sx, sy, TileType::StairsDown);
        }
    }

    pub fn starting_position(&self) -> (i32, i32) {
        if self.rooms.is_empty() {
            (MAP_WIDTH / 2, MAP_HEIGHT / 2)
        } else {
            self.rooms[0].center()
        }
    }

    // Shadowcasting FOV
    pub fn compute_fov(&mut self, origin_x: i32, origin_y: i32, radius: i32) {
        // Reset visible tiles
        for tile in self.tiles.iter_mut() {
            tile.is_visible = false;
        }

        // Mark origin as visible
        if self.in_bounds(origin_x, origin_y) {
            let idx = self.idx(origin_x, origin_y);
            self.tiles[idx].is_visible = true;
            self.tiles[idx].is_revealed = true;
        }

        // Cast rays in all 8 octants
        for octant in 0..8 {
            self.cast_light(origin_x, origin_y, radius, 1, 1.0, 0.0, octant);
        }
    }

    fn cast_light(
        &mut self,
        cx: i32,
        cy: i32,
        radius: i32,
        row: i32,
        mut start_slope: f32,
        end_slope: f32,
        octant: i32,
    ) {
        if start_slope < end_slope {
            return;
        }

        let mut next_start_slope = start_slope;

        for i in row..=radius {
            let mut blocked = false;
            let dy = -i;

            let dx_start = (-((i as f32) * start_slope) - 0.5) as i32;
            let dx_end = (-((i as f32) * end_slope) + 0.5) as i32;

            for dx in dx_start..=dx_end {
                let (map_x, map_y) = self.octant_transform(cx, cy, dx, dy, octant);

                let l_slope = (dx as f32 - 0.5) / (dy as f32 + 0.5);
                let r_slope = (dx as f32 + 0.5) / (dy as f32 - 0.5);

                if start_slope < r_slope {
                    continue;
                } else if end_slope > l_slope {
                    break;
                }

                let dist_sq = dx * dx + dy * dy;
                if dist_sq <= radius * radius && self.in_bounds(map_x, map_y) {
                    let idx = self.idx(map_x, map_y);
                    self.tiles[idx].is_visible = true;
                    self.tiles[idx].is_revealed = true;
                }

                if blocked {
                    if self.in_bounds(map_x, map_y) && !self.is_transparent(map_x, map_y) {
                        next_start_slope = r_slope;
                        continue;
                    } else {
                        blocked = false;
                        start_slope = next_start_slope;
                    }
                } else if self.in_bounds(map_x, map_y) && !self.is_transparent(map_x, map_y) && i < radius {
                    blocked = true;
                    self.cast_light(cx, cy, radius, i + 1, start_slope, l_slope, octant);
                    next_start_slope = r_slope;
                }
            }

            if blocked {
                break;
            }
        }
    }

    fn octant_transform(&self, cx: i32, cy: i32, dx: i32, dy: i32, octant: i32) -> (i32, i32) {
        let (row, col) = match octant {
            0 => (dx, dy),
            1 => (dy, dx),
            2 => (-dy, dx),
            3 => (-dx, dy),
            4 => (-dx, -dy),
            5 => (-dy, -dx),
            6 => (dy, -dx),
            _ => (dx, -dy),
        };
        (cx + col, cy + row)
    }

    fn is_transparent(&self, x: i32, y: i32) -> bool {
        if !self.in_bounds(x, y) {
            return false;
        }
        let idx = self.idx(x, y);
        self.tiles[idx].tile_type != TileType::Wall
    }
}
