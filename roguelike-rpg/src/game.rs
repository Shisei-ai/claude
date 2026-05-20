use rand::Rng;
use crate::map::{Map, Tile};
use crate::player::Player;
use crate::monster::{Monster, AiState};
use crate::item::{Item, ItemKind, ConsumableEffect, generate_floor_item};
use crate::skill::{SkillEffect};
use crate::event::{RandomEvent, EventConsequence, generate_floor_event};

pub const MSG_LOG_SIZE: usize = 100;
pub const INVENTORY_MAX: usize = 30;
pub const FOV_RADIUS: i32 = 8;

#[derive(Clone, PartialEq, Eq)]
pub enum GameMode {
    Exploring,
    Help,
    Battle,
    Inventory,
    Skills,
    Crafting,
    Event,
    Dead,
    Victory,
    LevelUp,
}

pub struct Game {
    pub map: Map,
    pub player: Player,
    pub monsters: Vec<Monster>,
    pub floor_items: Vec<(i32, i32, Item)>,
    pub messages: Vec<(String, MessageKind)>,
    pub mode: GameMode,
    pub rng: rand::rngs::ThreadRng,
    pub current_event: Option<RandomEvent>,
    pub inv_selection: usize,
    pub skill_selection: usize,
    pub craft_selection: usize,
    pub event_selection: usize,
    pub turn: u64,
    pub cursed_floor: bool,
    pub blessed_floor: bool,
    pub floor_exp_mult: f32,
    pub show_map_revealed: bool,
    pub battle_enemy_idx: Option<usize>,
    pub battle_menu: usize,       // 0=Attack 1=Skill 2=Item 3=Run
    pub battle_sub_mode: u8,      // 0=main 1=skill-select 2=item-select
    pub battle_sub_cursor: usize,
    pub battle_log: Vec<(String, MessageKind)>,
    pub battle_turn: u32,
    pub collection_unlocked: Vec<String>,
    pub camera_x: i32,
    pub camera_y: i32,
}

#[derive(Clone, PartialEq, Eq)]
#[derive(Debug)]
pub enum MessageKind {
    Normal,
    Combat,
    Loot,
    System,
    Event,
    Warning,
    Good,
}

impl Game {
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();
        let mut map = Map::new(1);
        let (px, py) = map.generate(&mut rng);
        let player = Player::new(px, py);

        let mut game = Game {
            map,
            player,
            monsters: Vec::new(),
            floor_items: Vec::new(),
            messages: Vec::new(),
            mode: GameMode::Exploring,
            rng,
            current_event: None,
            inv_selection: 0,
            skill_selection: 0,
            craft_selection: 0,
            event_selection: 0,
            turn: 0,
            cursed_floor: false,
            blessed_floor: false,
            floor_exp_mult: 1.0,
            show_map_revealed: false,
            battle_enemy_idx: None,
            battle_menu: 0,
            battle_sub_mode: 0,
            battle_sub_cursor: 0,
            battle_log: Vec::new(),
            battle_turn: 0,
            collection_unlocked: Vec::new(),
            camera_x: 0,
            camera_y: 0,
        };

        game.spawn_floor_content();
        game.map.compute_fov(game.player.x, game.player.y, FOV_RADIUS);
        game.add_message("Welcome to the Dungeon! (? for help)", MessageKind::System);
        game
    }

    pub fn add_message(&mut self, msg: impl Into<String>, kind: MessageKind) {
        let s = msg.into();
        self.messages.push((s, kind));
        if self.messages.len() > MSG_LOG_SIZE {
            self.messages.remove(0);
        }
    }

    fn spawn_floor_content(&mut self) {
        let floor = self.map.floor;
        let num_monsters = 5 + floor as usize + self.rng.gen_range(0..4);
        let num_items = 3 + self.rng.gen_range(0..3);

        let rooms = self.map.rooms.clone();
        let player_start = (self.player.x, self.player.y);

        // Spawn monsters (skip room 0 = player start)
        for room in rooms.iter().skip(1) {
            if self.monsters.len() >= num_monsters {
                break;
            }
            let (cx, cy) = room.center();
            if (cx - player_start.0).abs() + (cy - player_start.1).abs() < 5 {
                continue;
            }
            // Occasional boss
            let is_boss = floor >= 5 && self.rng.gen_range(0..15) == 0;
            let m = crate::monster::spawn_monster(&mut self.rng, cx, cy, floor, is_boss);
            self.monsters.push(m);

            // Extra monsters in room
            for _ in 0..self.rng.gen_range(0..3) {
                if self.monsters.len() >= num_monsters {
                    break;
                }
                let ox = cx + self.rng.gen_range(-2..=2);
                let oy = cy + self.rng.gen_range(-1..=1);
                if self.map.is_walkable(ox, oy) {
                    let m2 = crate::monster::spawn_monster(&mut self.rng, ox, oy, floor, false);
                    self.monsters.push(m2);
                }
            }
        }

        // Spawn items
        for room in rooms.iter().skip(1) {
            if self.floor_items.len() >= num_items {
                break;
            }
            if self.rng.gen_range(0..3) == 0 {
                let (cx, cy) = room.center();
                let item = generate_floor_item(&mut self.rng, floor);
                self.floor_items.push((cx + 1, cy, item));
            }
        }
    }

    pub fn player_move(&mut self, dx: i32, dy: i32) -> bool {
        if !self.player.can_move() {
            self.add_message("You are stunned!", MessageKind::Warning);
            self.end_player_turn();
            return true;
        }

        let nx = self.player.x + dx;
        let ny = self.player.y + dy;

        // Check for monster at target → enter battle
        if let Some(idx) = self.monster_at(nx, ny) {
            let name = self.monsters[idx].kind.name().to_string();
            self.battle_enemy_idx = Some(idx);
            self.battle_menu = 0;
            self.battle_sub_mode = 0;
            self.battle_sub_cursor = 0;
            self.battle_log.clear();
            self.battle_turn = 0;
            self.battle_log.push((format!("⚔ {} appeared!", name), MessageKind::Event));
            self.mode = GameMode::Battle;
            return true;
        }

        if self.map.is_walkable(nx, ny) {
            self.player.x = nx;
            self.player.y = ny;
            self.player.steps_taken += 1;
            self.map.compute_fov(self.player.x, self.player.y, FOV_RADIUS);
            self.update_camera();

            // Auto-pick logic: display items under player
            if let Some(idx) = self.item_at(nx, ny) {
                let (_, _, ref item) = self.floor_items[idx];
                let name = item.name.clone();
                self.add_message(format!("You see: {}", name), MessageKind::Normal);
            }

            // Check tile interaction
            match self.map.get(nx, ny) {
                Tile::StairsDown => {
                    self.add_message("Press '>' to descend.", MessageKind::System);
                }
                Tile::StairsUp => {
                    self.add_message("Press '<' to ascend.", MessageKind::System);
                }
                Tile::CraftingAnvil => {
                    self.add_message("Crafting Anvil! Press 'c' to craft.", MessageKind::System);
                }
                Tile::Shrine => {
                    self.add_message("Ancient Shrine! Press 'e' to interact.", MessageKind::System);
                }
                Tile::Chest => {
                    self.add_message("A chest! Press 'g' to open.", MessageKind::System);
                }
                _ => {}
            }

            self.end_player_turn();
            true
        } else {
            false
        }
    }

    fn update_camera(&mut self) {
        self.camera_x = self.player.x;
        self.camera_y = self.player.y;
    }

    pub fn pickup_item(&mut self) {
        let px = self.player.x;
        let py = self.player.y;

        // Check for chest
        if self.map.get(px, py) == Tile::Chest {
            self.map.set(px, py, Tile::Floor);
            let num_items = self.rng.gen_range(1..=3);
            for _ in 0..num_items {
                let item = generate_floor_item(&mut self.rng, self.map.floor);
                let name = item.name.clone();
                if self.player.inventory.len() < INVENTORY_MAX {
                    self.player.inventory.push(item);
                    self.player.items_collected += 1;
                    self.add_message(format!("Chest! Found: {}", name), MessageKind::Loot);
                }
            }
            return;
        }

        if let Some(idx) = self.item_at(px, py) {
            if self.player.inventory.len() >= INVENTORY_MAX {
                self.add_message("Inventory full!", MessageKind::Warning);
                return;
            }
            let (_, _, item) = self.floor_items.remove(idx);
            let name = item.name.clone();
            self.player.inventory.push(item);
            self.player.items_collected += 1;
            self.add_message(format!("Picked up: {}", name), MessageKind::Loot);
        } else {
            self.add_message("Nothing here to pick up.", MessageKind::Normal);
        }
    }

    pub fn use_item(&mut self, idx: usize) {
        if idx >= self.player.inventory.len() {
            return;
        }

        let item = self.player.inventory[idx].clone();
        match item.kind {
            ItemKind::Consumable => {
                self.apply_consumable(idx);
            }
            ItemKind::SkillTome => {
                self.use_skill_tome(idx);
            }
            _ if item.is_equippable() => {
                self.player.equip(idx);
                self.update_stats();
                self.add_message(format!("Equipped: {}", item.name), MessageKind::Loot);
            }
            _ => {
                self.add_message("Can't use this item.", MessageKind::Warning);
            }
        }
        self.mode = GameMode::Exploring;
    }

    fn apply_consumable(&mut self, idx: usize) {
        let item = self.player.inventory.remove(idx);
        if let Some(effect) = item.consumable_effect {
            match effect {
                ConsumableEffect::HealHp(amount) => {
                    self.player.heal(amount);
                    self.add_message(format!("Recovered {} HP!", amount), MessageKind::Good);
                }
                ConsumableEffect::HealMp(amount) => {
                    self.player.heal_mp(amount);
                    self.add_message(format!("Recovered {} MP!", amount), MessageKind::Good);
                }
                ConsumableEffect::TempStrBoost(amount, turns) => {
                    self.player.temp_buffs.push(crate::player::TempBuff {
                        str_bonus: amount,
                        def_bonus: 0,
                        turns_left: turns,
                    });
                    self.add_message(format!("+{} STR for {} turns!", amount, turns), MessageKind::Good);
                }
                ConsumableEffect::TempDefBoost(amount, turns) => {
                    self.player.temp_buffs.push(crate::player::TempBuff {
                        str_bonus: 0,
                        def_bonus: amount,
                        turns_left: turns,
                    });
                    self.add_message(format!("+{} DEF for {} turns!", amount, turns), MessageKind::Good);
                }
                ConsumableEffect::Teleport => {
                    self.teleport_player();
                    self.add_message("You teleport to a random location!", MessageKind::System);
                }
                ConsumableEffect::RevealMap => {
                    self.show_map_revealed = true;
                    for x in 0..self.map.width {
                        for y in 0..self.map.height {
                            self.map.explored[x][y] = true;
                        }
                    }
                    self.add_message("The entire floor is revealed!", MessageKind::System);
                }
                ConsumableEffect::IdentifyItem => {
                    self.add_message("All items identified! (Already known)", MessageKind::System);
                }
                ConsumableEffect::PoisonResist(_) => {
                    self.player.poison_turns = 0;
                    self.add_message("Poison cured!", MessageKind::Good);
                }
            }
        }
        self.end_player_turn();
    }

    fn use_skill_tome(&mut self, idx: usize) {
        let item = self.player.inventory[idx].clone();
        if let Some(skill_id) = item.skill_tome_id {
            if skill_id < self.player.skills.len() {
                if self.player.skills[skill_id].learned {
                    self.add_message("You already know this skill.", MessageKind::Warning);
                    return;
                }
                if !self.player.skills[skill_id].unlocked {
                    self.add_message("This skill is not yet unlocked.", MessageKind::Warning);
                    return;
                }
                let name = self.player.skills[skill_id].name.clone();
                self.player.skills[skill_id].learned = true;
                self.player.inventory.remove(idx);
                self.add_message(format!("Learned skill: {}!", name), MessageKind::Good);
                self.update_stats();
            }
        }
    }

    pub fn use_skill_in_combat(&mut self, skill_idx: usize) {
        if skill_idx >= self.player.skills.len() {
            return;
        }

        let skill = self.player.skills[skill_idx].clone();
        if !skill.can_use(self.player.mp) {
            if !skill.learned {
                self.add_message("Skill not learned!", MessageKind::Warning);
            } else if skill.current_cooldown > 0 {
                self.add_message(format!("On cooldown: {} turns", skill.current_cooldown), MessageKind::Warning);
            } else {
                self.add_message("Not enough MP!", MessageKind::Warning);
            }
            return;
        }

        self.player.mp -= skill.mp_cost;
        self.player.skills[skill_idx].current_cooldown = skill.cooldown;
        self.player.skills_used += 1;

        match skill.effect {
            SkillEffect::AttackMult(pct) => {
                if let Some(closest) = self.closest_monster() {
                    let base_dmg = self.player.effective_attack();
                    let dmg = (base_dmg as f32 * pct as f32 / 100.0) as i32;
                    let actual = self.monsters[closest].take_damage(dmg);
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}: attack hits {} for {} damage!", skill.name, name, actual), MessageKind::Combat);
                    if !self.monsters[closest].is_alive() {
                        self.on_monster_death(closest);
                    }
                }
            }
            SkillEffect::AoeDamage(dmg) => {
                let magic = self.player.effective_magic();
                let total_dmg = dmg + magic / 3;
                let mut hit_count = 0;
                let px = self.player.x;
                let py = self.player.y;
                let dead: Vec<usize> = self.monsters.iter().enumerate()
                    .filter(|(_, m)| {
                        let d = (m.x - px).abs() + (m.y - py).abs();
                        d <= 5 && m.is_alive()
                    })
                    .map(|(i, _)| i)
                    .collect();
                for i in &dead {
                    self.monsters[*i].take_damage(total_dmg);
                    hit_count += 1;
                }
                self.add_message(format!("{}: Hits {} enemies for {} magic damage!", skill.name, hit_count, total_dmg), MessageKind::Combat);
                for i in dead.into_iter().rev() {
                    if !self.monsters[i].is_alive() {
                        self.on_monster_death(i);
                    }
                }
            }
            SkillEffect::Heal(amount) => {
                self.player.heal(amount);
                self.add_message(format!("{}: Healed {} HP!", skill.name, amount), MessageKind::Good);
            }
            SkillEffect::MpHeal(amount) => {
                self.player.heal_mp(amount);
                self.add_message(format!("{}: Recovered {} MP!", skill.name, amount), MessageKind::Good);
            }
            SkillEffect::Shield(amount, turns) => {
                self.player.shield_hp += amount;
                self.add_message(format!("{}: Shield +{} for {} turns!", skill.name, amount, turns), MessageKind::Good);
            }
            SkillEffect::DotPoison(dmg, turns) => {
                if let Some(closest) = self.closest_monster() {
                    self.monsters[closest].status_effects.push(
                        crate::monster::StatusEffect::Poisoned { damage: dmg, turns_left: turns }
                    );
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}: {} is poisoned! ({}/turn x {})", skill.name, name, dmg, turns), MessageKind::Combat);
                }
            }
            SkillEffect::Stun(turns) => {
                if let Some(closest) = self.closest_monster() {
                    self.monsters[closest].status_effects.push(
                        crate::monster::StatusEffect::Stunned { turns_left: turns }
                    );
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}: {} is stunned for {} turns!", skill.name, name, turns), MessageKind::Combat);
                }
            }
            SkillEffect::TeleportStrike => {
                if let Some(closest) = self.closest_monster() {
                    let dmg = self.player.effective_attack() * 2;
                    let actual = self.monsters[closest].take_damage(dmg);
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}: Blink strike on {} for {} damage! (CRIT)", skill.name, name, actual), MessageKind::Combat);
                    if !self.monsters[closest].is_alive() {
                        self.on_monster_death(closest);
                    }
                }
            }
            SkillEffect::DoubleAttack => {
                for _ in 0..2 {
                    if let Some(closest) = self.closest_monster() {
                        if self.monsters[closest].is_alive() {
                            let dmg = self.player.effective_attack();
                            let actual = self.monsters[closest].take_damage(dmg);
                            let name = self.monsters[closest].kind.name().to_string();
                            self.add_message(format!("{}: Attack {} for {}!", skill.name, name, actual), MessageKind::Combat);
                            if !self.monsters[closest].is_alive() {
                                self.on_monster_death(closest);
                            }
                        }
                    }
                }
            }
            SkillEffect::CritBoost(pct) => {
                self.player.crit_bonus = pct;
                self.player.crit_bonus_turns = 5;
                self.add_message(format!("{}: Crit rate +{}% for 5 turns!", skill.name, pct), MessageKind::Good);
            }
            _ => {
                self.add_message(format!("{}: Passive skill.", skill.name), MessageKind::Warning);
            }
        }

        self.end_player_turn();
    }

    fn describe_crit(&mut self, is_crit: bool) -> &'static str {
        if is_crit { "CRITICAL STRIKE" } else { "attack" }
    }

    fn closest_monster(&self) -> Option<usize> {
        let px = self.player.x;
        let py = self.player.y;
        self.monsters.iter().enumerate()
            .filter(|(_, m)| m.is_alive())
            .min_by_key(|(_, m)| (m.x - px).abs() + (m.y - py).abs())
            .map(|(i, _)| i)
    }

    pub fn attack_monster(&mut self, idx: usize) {
        let is_crit = self.rng.gen_range(0..100) < self.player.crit_rate();
        let base_dmg = self.player.effective_attack() + self.rng.gen_range(0..5);
        let dmg = if is_crit { base_dmg * 2 } else { base_dmg };

        let actual = self.monsters[idx].take_damage(dmg);
        let name = self.monsters[idx].kind.name().to_string();

        // Lifesteal
        if self.player.lifesteal_pct > 0 {
            let heal = (actual as f32 * self.player.lifesteal_pct as f32 / 100.0) as i32;
            self.player.heal(heal);
        }

        if is_crit {
            self.add_message(format!("CRITICAL! You strike {} for {} damage!", name, actual), MessageKind::Combat);
        } else {
            self.add_message(format!("You attack {} for {} damage.", name, actual), MessageKind::Combat);
        }

        if !self.monsters[idx].is_alive() {
            self.on_monster_death(idx);
        }
    }

    fn on_monster_death(&mut self, idx: usize) {
        // Extract all data before any mutable borrows
        let name = self.monsters[idx].kind.name().to_string();
        let raw_exp = self.monsters[idx].exp_reward;
        let gold = self.monsters[idx].gold_reward;
        let drop_chance = self.monsters[idx].item_drop_chance;
        let x = self.monsters[idx].x;
        let y = self.monsters[idx].y;

        let mut exp = raw_exp;
        if self.blessed_floor {
            exp = (exp as f32 * 2.0) as u32;
        }
        if self.cursed_floor {
            exp = (exp as f32 * 1.5) as u32;
        }

        self.add_message(format!("{} is defeated! +{} EXP, +{} gold", name, exp, gold), MessageKind::Good);

        self.player.monsters_killed += 1;
        self.player.add_to_bestiary(name.clone());

        let leveled = self.player.gain_exp(exp);
        self.player.gold += gold;

        if leveled {
            self.add_message(format!("LEVEL UP! Now level {}!", self.player.level), MessageKind::Good);
            self.mode = GameMode::LevelUp;
            self.update_stats();
        }

        if self.rng.gen_range(0..100) < drop_chance {
            let item = generate_floor_item(&mut self.rng, self.map.floor);
            let iname = item.name.clone();
            self.add_message(format!("{} dropped: {}!", name, iname), MessageKind::Loot);
            self.floor_items.push((x, y, item));
        }

        self.monsters.remove(idx);
    }

    fn update_stats(&mut self) {
        let new_max_hp = self.player.recalc_max_hp();
        let new_max_mp = self.player.recalc_max_mp();
        self.player.max_hp = new_max_hp;
        self.player.max_mp = new_max_mp;
        self.player.hp = self.player.hp.min(self.player.max_hp);
        self.player.mp = self.player.mp.min(self.player.max_mp);

        // Update lifesteal from skills
        let ls: u32 = self.player.skills.iter()
            .filter(|s| s.learned && s.is_passive)
            .map(|s| match s.effect {
                SkillEffect::LifeSteal(pct) => pct,
                _ => 0,
            })
            .sum();
        self.player.lifesteal_pct = ls;
    }

    fn end_player_turn(&mut self) {
        self.turn += 1;
        self.player.tick_buffs();
        self.player.tick_skill_cooldowns();

        if !self.player.is_alive() {
            self.mode = GameMode::Dead;
            self.add_message("You have died! Game Over.", MessageKind::Warning);
            return;
        }

        self.run_monster_turns();

        if !self.player.is_alive() {
            self.mode = GameMode::Dead;
            self.add_message("You have died! Game Over.", MessageKind::Warning);
        }
    }

    fn run_monster_turns(&mut self) {
        let px = self.player.x;
        let py = self.player.y;

        for i in 0..self.monsters.len() {
            if !self.monsters[i].is_alive() {
                continue;
            }

            // Tick status effects
            self.monsters[i].tick_status();
            if !self.monsters[i].is_alive() {
                continue;
            }

            // Skip if stunned
            if self.monsters[i].is_stunned() {
                continue;
            }

            let mx = self.monsters[i].x;
            let my = self.monsters[i].y;
            let dist = (mx - px).abs() + (my - py).abs();
            let visible = self.map.visible.get(mx as usize)
                .and_then(|col| col.get(my as usize))
                .copied()
                .unwrap_or(false);

            if visible || self.monsters[i].seen_player {
                self.monsters[i].seen_player = true;
                self.monsters[i].ai_state = AiState::Chasing;
            }

            if self.monsters[i].ai_state == AiState::Chasing {
                if dist <= 1 {
                    // Attack player
                    let atk = self.monsters[i].attack + self.rng.gen_range(0..4);
                    let curse_bonus = if self.cursed_floor { atk / 4 } else { 0 };
                    let dmg = self.player.take_damage(atk + curse_bonus);
                    let name = self.monsters[i].kind.name().to_string();
                    self.add_message(format!("{} attacks you for {} damage!", name, dmg), MessageKind::Combat);
                } else {
                    // Move toward player
                    let (nx, ny) = self.monsters[i].ai_move_toward(px, py);
                    let passable = self.map.is_walkable(nx, ny)
                        && self.monster_at(nx, ny).is_none()
                        && !(nx == px && ny == py);
                    if passable {
                        self.monsters[i].x = nx;
                        self.monsters[i].y = ny;
                    }
                }
            }
        }

        // Remove dead monsters
        self.monsters.retain(|m| m.is_alive());
    }

    pub fn descend(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        if self.map.get(px, py) != Tile::StairsDown {
            self.add_message("No stairs here.", MessageKind::Warning);
            return;
        }

        let next_floor = self.map.floor + 1;
        self.player.floor = next_floor;
        if next_floor > self.player.deepest_floor {
            self.player.deepest_floor = next_floor;
        }

        // Check for random event
        if let Some(event) = generate_floor_event(next_floor) {
            self.current_event = Some(event);
            self.mode = GameMode::Event;
        } else {
            self.load_floor(next_floor);
        }

        if next_floor >= 30 {
            self.mode = GameMode::Victory;
            self.add_message("YOU HAVE CONQUERED THE DUNGEON! VICTORY!", MessageKind::Good);
        }
    }

    pub fn ascend(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        if self.map.get(px, py) != Tile::StairsUp {
            self.add_message("No ascending stairs here.", MessageKind::Warning);
            return;
        }
        if self.map.floor <= 1 {
            self.add_message("You're already on the first floor!", MessageKind::Warning);
            return;
        }
        let prev_floor = self.map.floor - 1;
        self.load_floor(prev_floor);
    }

    pub fn apply_event_choice(&mut self, choice_idx: usize) {
        if let Some(event) = self.current_event.take() {
            if choice_idx >= event.choices.len() {
                return;
            }
            let choice = event.choices[choice_idx].clone();
            let floor = self.player.floor;

            for consequence in &choice.consequences {
                match consequence {
                    EventConsequence::GainHp(v) => { self.player.heal(*v); }
                    EventConsequence::LoseHp(v) => { self.player.take_damage(*v); }
                    EventConsequence::GainMp(v) => { self.player.heal_mp(*v); }
                    EventConsequence::GainExp(v) => { self.player.gain_exp(*v); }
                    EventConsequence::GainGold(v) => { self.player.gold += v; }
                    EventConsequence::LoseGold(v) => { self.player.gold = self.player.gold.saturating_sub(*v); }
                    EventConsequence::GainStrPermanent(v) => { self.player.base_str += v; }
                    EventConsequence::GainDefPermanent(v) => { self.player.base_def += v; }
                    EventConsequence::GainIntPermanent(v) => { self.player.base_int += v; }
                    EventConsequence::GainLukPermanent(v) => { self.player.base_luk += v; }
                    EventConsequence::GainMaxHp(v) => {
                        self.player.max_hp = (self.player.max_hp + v).max(1);
                        self.player.hp = self.player.hp.min(self.player.max_hp);
                    }
                    EventConsequence::GainMaxMp(v) => {
                        self.player.max_mp = (self.player.max_mp + v).max(0);
                        self.player.mp = self.player.mp.min(self.player.max_mp);
                    }
                    EventConsequence::LoseRandomItem => {
                        if !self.player.inventory.is_empty() {
                            let idx = self.rng.gen_range(0..self.player.inventory.len());
                            let name = self.player.inventory.remove(idx).name;
                            self.add_message(format!("Lost: {}", name), MessageKind::Warning);
                        }
                    }
                    EventConsequence::GainRandomItem => {
                        let item = generate_floor_item(&mut self.rng, floor);
                        let name = item.name.clone();
                        if self.player.inventory.len() < INVENTORY_MAX {
                            self.player.inventory.push(item);
                            self.add_message(format!("Gained: {}", name), MessageKind::Loot);
                        }
                    }
                    EventConsequence::CursedFloor => {
                        self.cursed_floor = true;
                        self.add_message("The next floor is CURSED!", MessageKind::Warning);
                    }
                    EventConsequence::BlessedFloor => {
                        self.blessed_floor = true;
                        self.add_message("The next floor is BLESSED! 2x EXP!", MessageKind::Good);
                    }
                    EventConsequence::LearnRandomSkill => {
                        let unlearned: Vec<usize> = self.player.skills.iter().enumerate()
                            .filter(|(_, s)| s.unlocked && !s.learned && !s.is_passive)
                            .map(|(i, _)| i)
                            .collect();
                        if let Some(&skill_idx) = unlearned.first() {
                            let name = self.player.skills[skill_idx].name.clone();
                            self.player.skills[skill_idx].learned = true;
                            self.add_message(format!("Learned: {}!", name), MessageKind::Good);
                        } else {
                            self.add_message("No new skills available.", MessageKind::Normal);
                        }
                    }
                    EventConsequence::UnlockSkillBranch => {
                        for skill in self.player.skills.iter_mut() {
                            if !skill.unlocked {
                                skill.unlocked = true;
                                break;
                            }
                        }
                    }
                    EventConsequence::TeleportToFloor(target) => {
                        let f = *target;
                        self.add_message(format!("Teleported to floor {}!", f), MessageKind::Event);
                        self.load_floor(f);
                        return;
                    }
                }
            }

            self.add_message(format!("Choice: '{}'", choice.label), MessageKind::Event);
            self.load_floor(floor);
        }
    }

    fn load_floor(&mut self, floor: u32) {
        let mut new_map = Map::new(floor);
        let (px, py) = new_map.generate(&mut self.rng);
        self.map = new_map;
        self.player.x = px;
        self.player.y = py;
        self.player.floor = floor;
        self.monsters.clear();
        self.floor_items.clear();
        self.spawn_floor_content();
        self.map.compute_fov(px, py, FOV_RADIUS);
        self.update_camera();
        self.mode = GameMode::Exploring;
        self.add_message(format!("Floor {} — Descending deeper...", floor), MessageKind::System);
    }

    fn teleport_player(&mut self) {
        let w = self.map.width as i32;
        let h = self.map.height as i32;
        for _ in 0..200 {
            let x = self.rng.gen_range(0..w);
            let y = self.rng.gen_range(0..h);
            if self.map.is_walkable(x, y) && self.monster_at(x, y).is_none() {
                self.player.x = x;
                self.player.y = y;
                self.map.compute_fov(x, y, FOV_RADIUS);
                self.update_camera();
                return;
            }
        }
    }

    pub fn activate_shrine(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        if self.map.get(px, py) != Tile::Shrine {
            self.add_message("No shrine here.", MessageKind::Warning);
            return;
        }
        self.map.set(px, py, Tile::Floor);
        let roll = self.rng.gen_range(0..4);
        match roll {
            0 => {
                let heal = self.player.max_hp / 3;
                self.player.heal(heal);
                self.add_message(format!("Shrine blesses you! +{} HP", heal), MessageKind::Good);
            }
            1 => {
                self.player.heal_mp(self.player.max_mp / 2);
                self.add_message("Shrine restores your mana!", MessageKind::Good);
            }
            2 => {
                self.player.base_luk += 3;
                self.add_message("Shrine grants you fortune! LUK +3", MessageKind::Good);
            }
            _ => {
                self.player.gain_exp(self.player.level * 50);
                self.add_message("Shrine grants knowledge! +EXP", MessageKind::Good);
            }
        }
    }

    pub fn learn_skill(&mut self, skill_idx: usize) {
        if skill_idx >= self.player.skills.len() {
            return;
        }
        if self.player.skill_points == 0 {
            self.add_message("No skill points available!", MessageKind::Warning);
            return;
        }

        let skill = &self.player.skills[skill_idx];
        if skill.learned {
            self.add_message("Already learned!", MessageKind::Warning);
            return;
        }
        if !skill.unlocked {
            self.add_message("Skill locked! Need prerequisites.", MessageKind::Warning);
            return;
        }
        if let Some(prereq) = skill.prerequisite {
            if !self.player.skills[prereq].learned {
                let prereq_name = self.player.skills[prereq].name.clone();
                self.add_message(format!("Need to learn {} first!", prereq_name), MessageKind::Warning);
                return;
            }
        }

        let name = self.player.skills[skill_idx].name.clone();
        self.player.skills[skill_idx].learned = true;
        self.player.skill_points -= 1;
        self.add_message(format!("Learned: {}! ({} SP left)", name, self.player.skill_points), MessageKind::Good);

        // Unlock prerequisites for next tier
        for i in 0..self.player.skills.len() {
            if self.player.skills[i].prerequisite == Some(skill_idx) {
                self.player.skills[i].unlocked = true;
            }
        }

        self.update_stats();
    }

    // ── Battle navigation ────────────────────────────────────────────
    pub fn battle_navigate(&mut self, dir: i32) {
        match self.battle_sub_mode {
            0 => {
                self.battle_menu = ((self.battle_menu as i32 + dir + 4) % 4) as usize;
            }
            1 => {
                let n = self.player.skills.iter()
                    .filter(|s| s.learned && !s.is_passive)
                    .count() as i32;
                if n > 0 {
                    self.battle_sub_cursor = ((self.battle_sub_cursor as i32 + dir + n) % n) as usize;
                }
            }
            2 => {
                let n = self.player.inventory.iter()
                    .filter(|i| i.kind == crate::item::ItemKind::Consumable)
                    .count() as i32;
                if n > 0 {
                    self.battle_sub_cursor = ((self.battle_sub_cursor as i32 + dir + n) % n) as usize;
                }
            }
            _ => {}
        }
    }

    pub fn battle_back(&mut self) {
        if self.battle_sub_mode > 0 {
            self.battle_sub_mode = 0;
        }
    }

    pub fn battle_confirm(&mut self) {
        match self.battle_sub_mode {
            0 => match self.battle_menu {
                0 => self.battle_do_attack(),
                1 => {
                    let n = self.player.skills.iter()
                        .filter(|s| s.learned && !s.is_passive)
                        .count();
                    if n == 0 {
                        self.battle_log.push(("No active skills learned!".into(), MessageKind::Warning));
                    } else {
                        self.battle_sub_mode = 1;
                        self.battle_sub_cursor = 0;
                    }
                }
                2 => {
                    let n = self.player.inventory.iter()
                        .filter(|i| i.kind == crate::item::ItemKind::Consumable)
                        .count();
                    if n == 0 {
                        self.battle_log.push(("No items!".into(), MessageKind::Warning));
                    } else {
                        self.battle_sub_mode = 2;
                        self.battle_sub_cursor = 0;
                    }
                }
                3 => self.battle_do_run(),
                _ => {}
            },
            1 => {
                let indices: Vec<usize> = self.player.skills.iter()
                    .enumerate()
                    .filter(|(_, s)| s.learned && !s.is_passive)
                    .map(|(i, _)| i)
                    .collect();
                if let Some(&skill_idx) = indices.get(self.battle_sub_cursor) {
                    self.battle_do_skill(skill_idx);
                }
            }
            2 => {
                let indices: Vec<usize> = self.player.inventory.iter()
                    .enumerate()
                    .filter(|(_, i)| i.kind == crate::item::ItemKind::Consumable)
                    .map(|(i, _)| i)
                    .collect();
                if let Some(&item_idx) = indices.get(self.battle_sub_cursor) {
                    self.battle_do_item(item_idx);
                }
            }
            _ => {}
        }
    }

    fn battle_do_attack(&mut self) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => return };
        if idx >= self.monsters.len() { self.battle_end_return(); return; }

        let is_crit = self.rng.gen_range(0..100) < self.player.crit_rate();
        let base = self.player.effective_attack() + self.rng.gen_range(0..5);
        let dmg = if is_crit { base * 2 } else { base };
        let actual = self.monsters[idx].take_damage(dmg);
        let name = self.monsters[idx].kind.name().to_string();

        if self.player.lifesteal_pct > 0 {
            let heal = (actual as f32 * self.player.lifesteal_pct as f32 / 100.0) as i32;
            self.player.heal(heal);
        }

        let msg = if is_crit {
            format!("⚡ CRITICAL! You strike {} for {} damage!", name, actual)
        } else {
            format!("⚔ You attack {} for {} damage.", name, actual)
        };
        self.battle_log.push((msg, MessageKind::Combat));
        self.add_message(self.battle_log.last().unwrap().0.clone(), MessageKind::Combat);

        self.battle_turn += 1;
        self.battle_sub_mode = 0;

        if !self.monsters[idx].is_alive() {
            self.battle_end_victory(idx);
        } else {
            self.battle_enemy_turn();
        }
    }

    fn battle_do_skill(&mut self, skill_idx: usize) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => return };
        if idx >= self.monsters.len() { self.battle_end_return(); return; }

        if skill_idx >= self.player.skills.len() { return; }
        let skill = self.player.skills[skill_idx].clone();

        if !skill.can_use(self.player.mp) {
            let msg = if skill.current_cooldown > 0 {
                format!("On cooldown ({} turns left).", skill.current_cooldown)
            } else {
                "Not enough MP!".to_string()
            };
            self.battle_log.push((msg, MessageKind::Warning));
            return;
        }

        self.player.mp -= skill.mp_cost;
        self.player.skills[skill_idx].current_cooldown = skill.cooldown;
        self.player.skills_used += 1;

        let msg = match &skill.effect {
            SkillEffect::AttackMult(pct) => {
                let dmg = (self.player.effective_attack() as f32 * *pct as f32 / 100.0) as i32;
                let actual = self.monsters[idx].take_damage(dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}: {} takes {} damage!", skill.name, name, actual)
            }
            SkillEffect::TeleportStrike => {
                let dmg = self.player.effective_attack() * 2;
                let actual = self.monsters[idx].take_damage(dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}: Blink strike on {} for {} CRIT!", skill.name, name, actual)
            }
            SkillEffect::DoubleAttack => {
                let mut total = 0;
                for _ in 0..2 {
                    if self.monsters[idx].is_alive() {
                        let d = self.player.effective_attack();
                        total += self.monsters[idx].take_damage(d);
                    }
                }
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}: Double strike on {} for {} total!", skill.name, name, total)
            }
            SkillEffect::DotPoison(dmg, turns) => {
                self.monsters[idx].status_effects.push(
                    crate::monster::StatusEffect::Poisoned { damage: *dmg, turns_left: *turns }
                );
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}: {} is poisoned! ({}/turn)", skill.name, name, dmg)
            }
            SkillEffect::Stun(turns) => {
                self.monsters[idx].status_effects.push(
                    crate::monster::StatusEffect::Stunned { turns_left: *turns }
                );
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}: {} is stunned for {} turns!", skill.name, name, turns)
            }
            SkillEffect::Heal(amount) => {
                self.player.heal(*amount);
                format!("✦ {}: Healed {} HP!", skill.name, amount)
            }
            SkillEffect::MpHeal(amount) => {
                self.player.heal_mp(*amount);
                format!("✦ {}: Recovered {} MP!", skill.name, amount)
            }
            SkillEffect::Shield(amount, _) => {
                self.player.shield_hp += amount;
                format!("✦ {}: Shield +{}!", skill.name, amount)
            }
            SkillEffect::CritBoost(pct) => {
                self.player.crit_bonus = *pct;
                self.player.crit_bonus_turns = 5;
                format!("✦ {}: Crit rate +{}% for 5 turns!", skill.name, pct)
            }
            SkillEffect::AoeDamage(dmg) => {
                let actual = self.monsters[idx].take_damage(*dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}: Arcane blast on {} for {}!", skill.name, name, actual)
            }
            _ => format!("✦ {}: Used.", skill.name),
        };

        self.battle_log.push((msg.clone(), MessageKind::Combat));
        self.add_message(msg, MessageKind::Combat);
        self.battle_turn += 1;
        self.battle_sub_mode = 0;

        if idx < self.monsters.len() && !self.monsters[idx].is_alive() {
            self.battle_end_victory(idx);
        } else if idx < self.monsters.len() {
            self.battle_enemy_turn();
        }
    }

    fn battle_do_item(&mut self, item_idx: usize) {
        if item_idx >= self.player.inventory.len() { return; }
        let item = self.player.inventory[item_idx].clone();
        let msg = format!("🧪 Used: {}", item.name);
        self.battle_log.push((msg.clone(), MessageKind::Loot));
        self.add_message(msg, MessageKind::Loot);

        if let Some(ref effect) = item.consumable_effect {
            match effect {
                crate::item::ConsumableEffect::HealHp(amt) => { let a = *amt; self.player.heal(a); }
                crate::item::ConsumableEffect::HealMp(amt) => { let a = *amt; self.player.heal_mp(a); }
                crate::item::ConsumableEffect::TempStrBoost(s, t) => {
                    let (s, t) = (*s, *t);
                    self.player.temp_buffs.push(crate::player::TempBuff { str_bonus: s, def_bonus: 0, turns_left: t });
                }
                crate::item::ConsumableEffect::TempDefBoost(d, t) => {
                    let (d, t) = (*d, *t);
                    self.player.temp_buffs.push(crate::player::TempBuff { str_bonus: 0, def_bonus: d, turns_left: t });
                }
                crate::item::ConsumableEffect::PoisonResist(_) => { self.player.poison_turns = 0; }
                _ => {}
            }
        }
        self.player.inventory.remove(item_idx);

        self.battle_turn += 1;
        self.battle_sub_mode = 0;
        self.battle_enemy_turn();
    }

    fn battle_do_run(&mut self) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => { self.battle_end_return(); return; } };
        let escape_chance = 40u32 + self.player.base_dex as u32;
        if self.rng.gen_range(0..100) < escape_chance {
            self.battle_log.push(("🏃 You escaped!".into(), MessageKind::Good));
            self.add_message("You escaped from battle!", MessageKind::Good);
            self.battle_end_return();
        } else {
            self.battle_log.push(("Failed to run!".into(), MessageKind::Warning));
            self.add_message("Failed to escape!", MessageKind::Warning);
            self.battle_enemy_turn();
        }
    }

    fn battle_enemy_turn(&mut self) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => { self.battle_end_return(); return; } };
        if idx >= self.monsters.len() { self.battle_end_return(); return; }

        // Tick monster status
        self.monsters[idx].tick_status();

        if !self.monsters[idx].is_alive() {
            self.battle_end_victory(idx);
            return;
        }

        if self.monsters[idx].is_stunned() {
            let name = self.monsters[idx].kind.name().to_string();
            self.battle_log.push((format!("💫 {} is stunned!", name), MessageKind::Warning));
            // Player turn tick
            self.player.tick_buffs();
            self.player.tick_skill_cooldowns();
            return;
        }

        let atk = self.monsters[idx].attack + self.rng.gen_range(0..4);
        let bonus = if self.cursed_floor { atk / 4 } else { 0 };
        let dmg = self.player.take_damage(atk + bonus);
        let name = self.monsters[idx].kind.name().to_string();
        let msg = format!("💥 {} attacks you for {} damage!", name, dmg);
        self.battle_log.push((msg.clone(), MessageKind::Combat));
        self.add_message(msg, MessageKind::Combat);

        self.player.tick_buffs();
        self.player.tick_skill_cooldowns();

        if !self.player.is_alive() {
            self.battle_log.push(("💀 You have fallen...".into(), MessageKind::Warning));
            self.mode = GameMode::Dead;
            self.add_message("You have died! Game Over.", MessageKind::Warning);
        }
    }

    fn battle_end_victory(&mut self, idx: usize) {
        let name = self.monsters[idx].kind.name().to_string();
        self.battle_log.push((format!("✨ {} is defeated!", name), MessageKind::Good));
        self.on_monster_death(idx);
        self.battle_enemy_idx = None;
        if self.mode == GameMode::Battle {
            self.mode = GameMode::Exploring;
        }
        self.end_player_turn();
    }

    fn battle_end_return(&mut self) {
        self.battle_enemy_idx = None;
        self.mode = GameMode::Exploring;
    }

    fn monster_at(&self, x: i32, y: i32) -> Option<usize> {
        self.monsters.iter().position(|m| m.x == x && m.y == y && m.is_alive())
    }

    fn item_at(&self, x: i32, y: i32) -> Option<usize> {
        self.floor_items.iter().position(|(ix, iy, _)| *ix == x && *iy == y)
    }

    pub fn try_craft(&mut self, recipe_idx: usize) {
        use crate::item::CRAFTING_RECIPES;
        if recipe_idx >= CRAFTING_RECIPES.len() {
            return;
        }
        let recipe = &CRAFTING_RECIPES[recipe_idx];
        let floor = self.map.floor;

        if let Some(crafted) = crate::item::try_craft(recipe, &mut self.player.inventory, floor, &mut self.rng) {
            let name = crafted.name.clone();
            if self.player.inventory.len() < INVENTORY_MAX {
                self.player.inventory.push(crafted);
                self.player.items_collected += 1;
                self.add_message(format!("Crafted: {}!", name), MessageKind::Good);
            } else {
                self.add_message("Inventory full! Can't craft.", MessageKind::Warning);
            }
        } else {
            self.add_message("Not enough materials for this recipe.", MessageKind::Warning);
        }
    }
}
