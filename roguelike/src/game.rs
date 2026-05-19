use rand::Rng;
use rand::rngs::StdRng;
use rand::SeedableRng;
use crate::map::Map;
use crate::player::Player;
use crate::monster::Monster;
use crate::items::Item;
use crate::classes::Class;
use crate::skills::{Skill, SkillEffect};
use crate::combat::{calculate_damage, monster_attack, apply_status_from_string, apply_buff_from_string, StatusEffect};

pub const MAX_FLOOR: i32 = 15;
const MONSTERS_PER_FLOOR: usize = 8;
const ITEMS_PER_FLOOR: usize = 5;
const FOV_RADIUS: i32 = 8;

#[derive(Clone, Debug, PartialEq)]
pub enum BattleAction {
    Attack,
    Skills,
    Items,
    Flee,
}

#[derive(Clone, Debug, PartialEq)]
pub enum BattleSubState {
    SelectAction,
    SelectSkill(usize),  // index of selected skill
    SelectItem(usize),   // index of selected item
}

#[derive(Clone, Debug, PartialEq)]
pub enum RunState {
    MainMenu,
    ClassSelect(usize),
    Playing,
    BattleMenu {
        monster_idx: usize,
        sub_state: BattleSubState,
    },
    LevelUp,
    Inventory,
    Skills,
    CharStats,
    GameOver,
    Victory,
}

pub struct GameWorld {
    pub map: Map,
    pub player: Player,
    pub monsters: Vec<Monster>,
    pub floor_items: Vec<(i32, i32, Item)>,
    pub messages: Vec<String>,
    pub run_state: RunState,
    pub rng: StdRng,
    pub pending_level_up: bool,
}

impl GameWorld {
    pub fn new() -> Self {
        let seed: u64 = rand::random();
        let mut rng = StdRng::seed_from_u64(seed);
        let mut map = Map::new(1);
        map.generate(&mut rng);

        let (sx, sy) = map.starting_position();
        let player = Player::new(Class::Warrior, sx, sy); // temp class; overwritten on class select

        GameWorld {
            map,
            player,
            monsters: Vec::new(),
            floor_items: Vec::new(),
            messages: Vec::new(),
            run_state: RunState::MainMenu,
            rng,
            pending_level_up: false,
        }
    }

    pub fn start_game(&mut self, class: Class) {
        let seed: u64 = rand::random();
        self.rng = StdRng::seed_from_u64(seed);

        let mut map = Map::new(1);
        map.generate(&mut self.rng);

        let (sx, sy) = map.starting_position();
        let class_copy = class.clone();
        let mut player = Player::new(class, sx, sy);

        // Give starting equipment based on class
        match class_copy {
            Class::Warrior => {
                let weapon = Item::new_weapon(&mut self.rng, 1);
                let armor = Item::new_armor(&mut self.rng, 1);
                player.equipment.weapon = Some(weapon);
                player.equipment.armor = Some(armor);
            }
            Class::Mage => {
                let staff = Item::new_weapon(&mut self.rng, 1);
                let robe = Item::new_armor(&mut self.rng, 1);
                player.equipment.weapon = Some(staff);
                player.equipment.armor = Some(robe);
                // Start with a mana potion
                let pot = Item::new_potion(&mut self.rng);
                player.inventory.push(pot);
            }
            Class::Rogue => {
                let dagger = Item::new_weapon(&mut self.rng, 1);
                let leather = Item::new_armor(&mut self.rng, 1);
                player.equipment.weapon = Some(dagger);
                player.equipment.armor = Some(leather);
                // Start with a health potion
                let pot = Item::new_potion(&mut self.rng);
                player.inventory.push(pot);
            }
        }

        self.player = player;
        self.map = map;
        self.messages = vec!["Welcome to the dungeon! Good luck!".to_string()];
        self.pending_level_up = false;

        self.spawn_floor_entities();
        self.recompute_fov();
        self.run_state = RunState::Playing;
    }

    pub fn descend_floor(&mut self) {
        let next_floor = self.player.floor_number + 1;

        if next_floor > MAX_FLOOR {
            self.run_state = RunState::Victory;
            return;
        }

        self.player.floor_number = next_floor;
        self.player.floors_descended += 1;

        let mut map = Map::new(next_floor);
        map.generate(&mut self.rng);

        let (sx, sy) = map.starting_position();
        self.player.x = sx;
        self.player.y = sy;

        self.map = map;
        self.monsters.clear();
        self.floor_items.clear();
        self.spawn_floor_entities();
        self.recompute_fov();

        // Partial heal on floor change
        let heal_amount = self.player.max_hp / 5;
        self.player.heal(heal_amount);
        let mp_heal = self.player.max_mp / 5;
        self.player.restore_mp(mp_heal);

        self.add_message(format!("You descend to floor {}!", next_floor));
    }

    fn spawn_floor_entities(&mut self) {
        let floor = self.player.floor_number;
        let room_count = self.map.rooms.len();

        // Spawn monsters (skip first room - that's where the player starts)
        let monster_count = MONSTERS_PER_FLOOR.min(room_count.saturating_sub(1));
        for room_idx in 1..=monster_count {
            if room_idx >= room_count {
                break;
            }
            let (cx, cy) = self.map.rooms[room_idx].center();
            let offset_x = self.rng.gen_range(-2..=2);
            let offset_y = self.rng.gen_range(-2..=2);
            let mx = (cx + offset_x).max(1).min(self.map.width - 2);
            let my = (cy + offset_y).max(1).min(self.map.height - 2);

            if self.map.is_walkable(mx, my) {
                let monster = Monster::random(&mut self.rng, mx, my, floor);
                self.monsters.push(monster);
            }
        }

        // Spawn items
        for _ in 0..ITEMS_PER_FLOOR {
            if let Some(room) = self.map.rooms.get(self.rng.gen_range(0..room_count)) {
                let (cx, cy) = room.center();
                let ix = cx + self.rng.gen_range(-1..=1);
                let iy = cy + self.rng.gen_range(-1..=1);
                if self.map.is_walkable(ix, iy) {
                    let item = Item::random(&mut self.rng, floor);
                    self.floor_items.push((ix, iy, item));
                }
            }
        }
    }

    pub fn recompute_fov(&mut self) {
        self.map.compute_fov(self.player.x, self.player.y, FOV_RADIUS);
    }

    pub fn add_message(&mut self, msg: String) {
        self.messages.push(msg);
        if self.messages.len() > 100 {
            self.messages.remove(0);
        }
    }

    pub fn try_move_player(&mut self, dx: i32, dy: i32) {
        if self.player.is_stunned() {
            self.add_message("You are stunned and cannot move!".to_string());
            self.end_player_turn();
            return;
        }

        let nx = self.player.x + dx;
        let ny = self.player.y + dy;

        // Check for monster collision - start combat
        if let Some(idx) = self.monsters.iter().position(|m| m.is_alive && m.x == nx && m.y == ny) {
            self.run_state = RunState::BattleMenu {
                monster_idx: idx,
                sub_state: BattleSubState::SelectAction,
            };
            let name = self.monsters[idx].kind.name().to_string();
            self.add_message(format!("You encounter a {}!", name));
            return;
        }

        if self.map.is_walkable(nx, ny) {
            self.player.x = nx;
            self.player.y = ny;
            self.recompute_fov();
            self.check_for_items();
            self.end_player_turn();
        }
    }

    fn check_for_items(&mut self) {
        let px = self.player.x;
        let py = self.player.y;

        let mut picked_up_msgs: Vec<String> = Vec::new();
        let mut full_msgs: Vec<String> = Vec::new();
        let mut remaining: Vec<(i32, i32, Item)> = Vec::new();

        let items = std::mem::take(&mut self.floor_items);
        for (ix, iy, item) in items {
            if ix == px && iy == py {
                let name = item.name.clone();
                if self.player.add_to_inventory(item) {
                    picked_up_msgs.push(format!("Picked up: {}", name));
                } else {
                    remaining.push((ix, iy, Item::new_potion(&mut self.rng)));
                    full_msgs.push("Inventory full!".to_string());
                }
            } else {
                remaining.push((ix, iy, item));
            }
        }

        self.floor_items = remaining;
        for msg in full_msgs {
            self.add_message(msg);
        }
        for msg in picked_up_msgs {
            self.add_message(msg);
        }
    }

    pub fn end_player_turn(&mut self) {
        // Tick player status effects
        let msgs = self.player.tick_status_effects();
        for msg in msgs {
            self.add_message(msg);
        }

        if !self.player.is_alive() {
            self.run_state = RunState::GameOver;
            return;
        }

        // Monster AI turns
        self.do_monster_turns();

        if !self.player.is_alive() {
            self.run_state = RunState::GameOver;
        }
    }

    fn do_monster_turns(&mut self) {
        let px = self.player.x;
        let py = self.player.y;

        for i in 0..self.monsters.len() {
            if !self.monsters[i].is_alive {
                continue;
            }

            // Tick monster status
            let dot = self.monsters[i].tick_status_effects();
            if dot > 0 {
                let name = self.monsters[i].kind.name().to_string();
                self.add_message(format!("{} takes {} damage from status!", name, dot));
            }

            if !self.monsters[i].is_alive {
                continue;
            }

            let mx = self.monsters[i].x;
            let my = self.monsters[i].y;

            // Check if adjacent to player
            let dist = ((mx - px).abs()).max((my - py).abs());

            if dist <= 1 {
                // Attack player
                if !self.monsters[i].is_stunned() {
                    let result = monster_attack(
                        &mut self.rng,
                        self.monsters[i].strength,
                        self.monsters[i].dexterity,
                        self.player.effective_defense(),
                    );
                    if result.hit {
                        self.player.take_damage(result.damage);
                        let name = self.monsters[i].kind.name().to_string();
                        self.add_message(format!("{} attacks you! {}", name, result.message));
                    } else {
                        let name = self.monsters[i].kind.name().to_string();
                        self.add_message(format!("{} attacks but misses!", name));
                    }
                }
            } else {
                // Try to move toward player if in FOV range
                let visible_range = FOV_RADIUS + 2;
                if dist <= visible_range {
                    let others: Vec<&Monster> = self.monsters.iter()
                        .enumerate()
                        .filter(|(j, m)| *j != i && m.is_alive)
                        .map(|(_, m)| m)
                        .collect();

                    if let Some((nx, ny)) = self.monsters[i].try_move_toward_player(px, py, &self.map, &others) {
                        // Don't move onto the player
                        if nx != px || ny != py {
                            self.monsters[i].x = nx;
                            self.monsters[i].y = ny;
                        }
                    }
                }
            }
        }
    }

    pub fn player_attack(&mut self, monster_idx: usize) -> bool {
        if monster_idx >= self.monsters.len() {
            return false;
        }

        let atk = self.player.effective_strength();
        let dex = self.player.effective_dexterity();
        let weapon_bonus = self.player.weapon_attack_bonus();
        let def = self.monsters[monster_idx].defense;

        let result = calculate_damage(
            &mut self.rng,
            atk, dex, weapon_bonus, def,
            false,
            self.player.effective_intelligence(),
            1.0,
        );

        let name = self.monsters[monster_idx].kind.name().to_string();
        if result.hit {
            self.monsters[monster_idx].take_damage(result.damage);
            self.add_message(format!("You attack {}! {}", name, result.message));

            if !self.monsters[monster_idx].is_alive {
                self.on_monster_killed(monster_idx);
                return true; // monster died
            }
        } else {
            self.add_message(format!("You attack {} but MISS!", name));
        }

        false
    }

    pub fn player_use_skill(&mut self, monster_idx: usize, skill_id: usize) -> bool {
        let skill = match Skill::get_by_id(skill_id) {
            Some(s) => s,
            None => return false,
        };

        if self.player.mp < skill.mp_cost {
            self.add_message("Not enough MP!".to_string());
            return false;
        }

        self.player.mp -= skill.mp_cost;

        let mut monster_dead = false;
        let name = self.monsters[monster_idx].kind.name().to_string();
        self.add_message(format!("You use {}!", skill.name));

        for effect in &skill.effects.clone() {
            match effect {
                SkillEffect::Damage { multiplier, is_magic } => {
                    let (atk, magic_b) = if *is_magic {
                        (self.player.effective_intelligence(), self.player.weapon_magic_bonus())
                    } else {
                        (self.player.effective_strength(), self.player.weapon_attack_bonus())
                    };
                    let dex = self.player.effective_dexterity();
                    let def = self.monsters[monster_idx].defense;
                    let int = self.player.effective_intelligence();

                    let result = calculate_damage(
                        &mut self.rng,
                        atk, dex, magic_b, def,
                        *is_magic,
                        int,
                        *multiplier,
                    );

                    if result.hit {
                        self.monsters[monster_idx].take_damage(result.damage);
                        self.add_message(format!("  {} takes {}!", name, result.damage));
                        if !self.monsters[monster_idx].is_alive {
                            monster_dead = true;
                        }
                    } else {
                        self.add_message("  But it missed!".to_string());
                    }
                }
                SkillEffect::StatusInflict { status, chance } => {
                    if !monster_dead {
                        let roll: f32 = self.rng.gen();
                        if roll < *chance {
                            let eff = apply_status_from_string(status);
                            let status_name = eff.name().to_string();
                            self.monsters[monster_idx].apply_status(eff);
                            self.add_message(format!("  {} is now {}!", name, status_name));
                        }
                    }
                }
                SkillEffect::Buff { stat, amount, duration } => {
                    let eff = apply_buff_from_string(stat, *amount, *duration);
                    let eff_name = eff.name().to_string();
                    self.player.apply_status(eff);
                    self.add_message(format!("  {}: {}!", eff_name, amount));
                }
                SkillEffect::Heal { amount } => {
                    self.player.heal(*amount);
                    self.add_message(format!("  You recover {} HP!", amount));
                }
                SkillEffect::AoeDamage { multiplier } => {
                    // For simplicity, hit the target monster
                    let atk = self.player.effective_strength();
                    let dex = self.player.effective_dexterity();
                    let def = self.monsters[monster_idx].defense;
                    let int = self.player.effective_intelligence();

                    let result = calculate_damage(
                        &mut self.rng,
                        atk, dex, 0, def,
                        true, int,
                        *multiplier,
                    );
                    if result.hit {
                        self.monsters[monster_idx].take_damage(result.damage);
                        if !self.monsters[monster_idx].is_alive {
                            monster_dead = true;
                        }
                    }
                }
            }
        }

        if monster_dead {
            self.on_monster_killed(monster_idx);
        }

        monster_dead
    }

    pub fn player_use_item_in_battle(&mut self, item_inventory_idx: usize) -> Option<String> {
        self.player.use_item(item_inventory_idx)
    }

    pub fn player_flee(&mut self, monster_idx: usize) -> bool {
        let dex = self.player.effective_dexterity();
        let m_dex = if monster_idx < self.monsters.len() { self.monsters[monster_idx].dexterity } else { 5 };
        let flee_chance = 0.4 + (dex as f32 - m_dex as f32) * 0.05;
        let roll: f32 = self.rng.gen();

        if roll < flee_chance.max(0.1).min(0.9) {
            self.add_message("You fled from battle!".to_string());
            // Move player away
            let px = self.player.x;
            let py = self.player.y;
            let offsets = [(-2, 0), (2, 0), (0, -2), (0, 2)];
            for (ox, oy) in &offsets {
                let nx = px + ox;
                let ny = py + oy;
                if self.map.is_walkable(nx, ny) {
                    self.player.x = nx;
                    self.player.y = ny;
                    break;
                }
            }
            true
        } else {
            self.add_message("Failed to flee! The enemy strikes!".to_string());
            if monster_idx < self.monsters.len() {
                let result = monster_attack(
                    &mut self.rng,
                    self.monsters[monster_idx].strength,
                    self.monsters[monster_idx].dexterity,
                    self.player.effective_defense(),
                );
                if result.hit {
                    self.player.take_damage(result.damage);
                    self.add_message(format!("You take {} damage!", result.damage));
                }
            }
            false
        }
    }

    fn on_monster_killed(&mut self, monster_idx: usize) {
        let xp = self.monsters[monster_idx].xp_reward;
        let gold = self.monsters[monster_idx].gold_reward;
        let name = self.monsters[monster_idx].kind.name().to_string();

        self.player.gold += gold;
        self.player.total_kills += 1;
        self.add_message(format!("You defeated {}! +{} XP, +{} Gold", name, xp, gold));

        let leveled = self.player.gain_experience(xp);
        if leveled {
            self.add_message(format!("Level Up! You are now level {}!", self.player.level));
            self.pending_level_up = true;
        }

        // Maybe drop item
        let drop_chance: f32 = self.rng.gen();
        if drop_chance < 0.3 {
            let item = Item::random(&mut self.rng, self.player.floor_number);
            let name = item.name.clone();
            let mx = self.monsters[monster_idx].x;
            let my = self.monsters[monster_idx].y;
            self.floor_items.push((mx, my, item));
            self.add_message(format!("{} dropped {}!", name, name));
        }
    }

    pub fn do_stairs(&mut self) {
        use crate::map::TileType;
        let tile = self.map.tile_at(self.player.x, self.player.y);
        if tile.tile_type == TileType::StairsDown {
            self.descend_floor();
        } else {
            self.add_message("There are no stairs here.".to_string());
        }
    }

    pub fn monster_turn_after_battle(&mut self, monster_idx: usize) {
        if monster_idx >= self.monsters.len() || !self.monsters[monster_idx].is_alive {
            return;
        }

        if self.monsters[monster_idx].is_stunned() {
            let name = self.monsters[monster_idx].kind.name().to_string();
            self.add_message(format!("{} is stunned!", name));
            return;
        }

        let result = monster_attack(
            &mut self.rng,
            self.monsters[monster_idx].strength,
            self.monsters[monster_idx].dexterity,
            self.player.effective_defense(),
        );

        let name = self.monsters[monster_idx].kind.name().to_string();
        if result.hit {
            self.player.take_damage(result.damage);
            self.add_message(format!("{} attacks you! {}", name, result.message));
        } else {
            self.add_message(format!("{} attacks but misses!", name));
        }

        // Tick status effects
        let dot = self.monsters[monster_idx].tick_status_effects();
        if dot > 0 {
            self.add_message(format!("{} takes {} dot damage!", name, dot));
        }

        let msgs = self.player.tick_status_effects();
        for msg in msgs {
            self.add_message(msg);
        }
    }

    pub fn get_usable_items_indices(&self) -> Vec<usize> {
        self.player.inventory.iter().enumerate()
            .filter(|(_, item)| {
                matches!(item.kind,
                    crate::items::ItemKind::Potion { .. } | crate::items::ItemKind::Scroll { .. })
            })
            .map(|(i, _)| i)
            .collect()
    }
}
