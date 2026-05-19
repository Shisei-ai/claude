use serde::{Deserialize, Serialize};
use crate::classes::Class;
use crate::items::{Item, ItemKind};
use crate::combat::StatusEffect;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Equipment {
    pub weapon: Option<Item>,
    pub armor: Option<Item>,
    pub ring: Option<Item>,
    pub accessory: Option<Item>,
}

impl Equipment {
    pub fn new() -> Self {
        Equipment { weapon: None, armor: None, ring: None, accessory: None }
    }

    pub fn attack_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(w) = &self.weapon {
            if let ItemKind::Weapon { attack_bonus, .. } = w.kind {
                bonus += attack_bonus;
            }
        }
        bonus
    }

    pub fn magic_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(w) = &self.weapon {
            if let ItemKind::Weapon { magic_bonus, .. } = w.kind {
                bonus += magic_bonus;
            }
        }
        bonus
    }

    pub fn defense_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(a) = &self.armor {
            if let ItemKind::Armor { defense_bonus, .. } = a.kind {
                bonus += defense_bonus;
            }
        }
        if let Some(r) = &self.ring {
            if let ItemKind::Ring { ring_type: crate::items::RingType::Defense, bonus: b } = r.kind {
                bonus += b;
            }
        }
        bonus
    }

    pub fn hp_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(a) = &self.armor {
            if let ItemKind::Armor { hp_bonus, .. } = a.kind {
                bonus += hp_bonus;
            }
        }
        if let Some(r) = &self.ring {
            if let ItemKind::Ring { ring_type: crate::items::RingType::Life, bonus: b } = r.kind {
                bonus += b * 10;
            }
        }
        bonus
    }

    pub fn str_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(r) = &self.ring {
            if let ItemKind::Ring { ring_type: crate::items::RingType::Strength, bonus: b } = r.kind {
                bonus += b;
            }
        }
        bonus
    }

    pub fn dex_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(r) = &self.ring {
            if let ItemKind::Ring { ring_type: crate::items::RingType::Speed, bonus: b } = r.kind {
                bonus += b;
            }
        }
        bonus
    }

    pub fn int_bonus(&self) -> i32 {
        let mut bonus = 0;
        if let Some(r) = &self.ring {
            if let ItemKind::Ring { ring_type: crate::items::RingType::Magic, bonus: b } = r.kind {
                bonus += b;
            }
        }
        bonus
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Player {
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub mp: i32,
    pub max_mp: i32,
    pub base_strength: i32,
    pub base_dexterity: i32,
    pub base_intelligence: i32,
    pub base_defense: i32,
    pub level: i32,
    pub experience: i32,
    pub exp_to_next: i32,
    pub class: Class,
    pub inventory: Vec<Item>,
    pub equipment: Equipment,
    pub learned_skills: Vec<usize>,
    pub skill_points: i32,
    pub gold: i32,
    pub floor_number: i32,
    pub status_effects: Vec<StatusEffect>,
    pub temp_str_bonus: i32,
    pub temp_dex_bonus: i32,
    pub temp_def_bonus: i32,
    pub total_kills: i32,
    pub floors_descended: i32,
}

impl Player {
    pub fn new(class: Class, start_x: i32, start_y: i32) -> Self {
        let max_hp = class.base_hp();
        let max_mp = class.base_mp();

        let mut player = Player {
            x: start_x,
            y: start_y,
            hp: max_hp,
            max_hp,
            mp: max_mp,
            max_mp,
            base_strength: class.base_strength(),
            base_dexterity: class.base_dexterity(),
            base_intelligence: class.base_intelligence(),
            base_defense: class.base_defense(),
            level: 1,
            experience: 0,
            exp_to_next: 100,
            class,
            inventory: Vec::new(),
            equipment: Equipment::new(),
            learned_skills: vec![],
            skill_points: 0,
            gold: 20,
            floor_number: 1,
            status_effects: Vec::new(),
            temp_str_bonus: 0,
            temp_dex_bonus: 0,
            temp_def_bonus: 0,
            total_kills: 0,
            floors_descended: 0,
        };

        // Give starting skill (level 1 skill, id 0 for warrior, 4 for mage, 8 for rogue)
        let start_skill_id = match player.class {
            Class::Warrior => 0,
            Class::Mage => 4,
            Class::Rogue => 8,
        };
        player.learned_skills.push(start_skill_id);

        player
    }

    pub fn effective_strength(&self) -> i32 {
        self.base_strength + self.equipment.str_bonus() + self.temp_str_bonus
    }

    pub fn effective_dexterity(&self) -> i32 {
        self.base_dexterity + self.equipment.dex_bonus() + self.temp_dex_bonus
    }

    pub fn effective_intelligence(&self) -> i32 {
        self.base_intelligence + self.equipment.int_bonus()
    }

    pub fn effective_defense(&self) -> i32 {
        self.base_defense + self.equipment.defense_bonus() + self.temp_def_bonus
    }

    pub fn weapon_attack_bonus(&self) -> i32 {
        self.equipment.attack_bonus()
    }

    pub fn weapon_magic_bonus(&self) -> i32 {
        self.equipment.magic_bonus()
    }

    pub fn is_alive(&self) -> bool {
        self.hp > 0
    }

    pub fn heal(&mut self, amount: i32) {
        self.hp = (self.hp + amount).min(self.max_hp + self.equipment.hp_bonus());
    }

    pub fn restore_mp(&mut self, amount: i32) {
        self.mp = (self.mp + amount).min(self.max_mp);
    }

    pub fn take_damage(&mut self, damage: i32) {
        self.hp -= damage;
        if self.hp < 0 {
            self.hp = 0;
        }
    }

    pub fn gain_experience(&mut self, exp: i32) -> bool {
        self.experience += exp;
        if self.experience >= self.exp_to_next {
            self.level_up();
            return true;
        }
        false
    }

    fn level_up(&mut self) {
        self.experience -= self.exp_to_next;
        self.level += 1;
        self.exp_to_next = (self.exp_to_next as f32 * 1.5) as i32;
        self.skill_points += 1;

        let hp_gain = self.class.hp_per_level();
        let mp_gain = self.class.mp_per_level();

        self.max_hp += hp_gain;
        self.max_mp += mp_gain;
        self.hp = self.max_hp;
        self.mp = self.max_mp;

        // Stat increases per level
        match self.class {
            Class::Warrior => {
                self.base_strength += 2;
                self.base_defense += 1;
            }
            Class::Mage => {
                self.base_intelligence += 2;
                self.base_dexterity += 1;
            }
            Class::Rogue => {
                self.base_dexterity += 2;
                self.base_strength += 1;
            }
        }
    }

    pub fn add_to_inventory(&mut self, item: Item) -> bool {
        if self.inventory.len() < 20 {
            self.inventory.push(item);
            true
        } else {
            false
        }
    }

    pub fn equip_item(&mut self, inventory_idx: usize) -> Option<String> {
        if inventory_idx >= self.inventory.len() {
            return None;
        }

        let item = self.inventory[inventory_idx].clone();
        match &item.kind {
            ItemKind::Weapon { .. } => {
                let old = self.equipment.weapon.replace(item.clone());
                self.inventory.remove(inventory_idx);
                if let Some(old_item) = old {
                    self.inventory.push(old_item);
                }
                Some(format!("Equipped {}", item.name))
            }
            ItemKind::Armor { .. } => {
                let old = self.equipment.armor.replace(item.clone());
                self.inventory.remove(inventory_idx);
                if let Some(old_item) = old {
                    self.inventory.push(old_item);
                }
                Some(format!("Equipped {}", item.name))
            }
            ItemKind::Ring { .. } => {
                let old = self.equipment.ring.replace(item.clone());
                self.inventory.remove(inventory_idx);
                if let Some(old_item) = old {
                    self.inventory.push(old_item);
                }
                Some(format!("Equipped {}", item.name))
            }
            _ => None,
        }
    }

    pub fn use_item(&mut self, inventory_idx: usize) -> Option<String> {
        if inventory_idx >= self.inventory.len() {
            return None;
        }

        let item = self.inventory[inventory_idx].clone();
        match &item.kind {
            ItemKind::Potion { potion_type, power } => {
                let result = match potion_type {
                    crate::items::PotionType::Health => {
                        let healed = (*power).min(self.max_hp - self.hp);
                        self.heal(*power);
                        format!("Restored {} HP!", healed)
                    }
                    crate::items::PotionType::Mana => {
                        let restored = (*power).min(self.max_mp - self.mp);
                        self.restore_mp(*power);
                        format!("Restored {} MP!", restored)
                    }
                    crate::items::PotionType::Strength => {
                        self.temp_str_bonus += power;
                        format!("Strength increased by {}!", power)
                    }
                    crate::items::PotionType::Speed => {
                        self.temp_dex_bonus += power;
                        format!("Dexterity increased by {}!", power)
                    }
                };
                self.inventory.remove(inventory_idx);
                Some(result)
            }
            ItemKind::Weapon { .. } | ItemKind::Armor { .. } | ItemKind::Ring { .. } => {
                self.equip_item(inventory_idx)
            }
            _ => None,
        }
    }

    pub fn is_stunned(&self) -> bool {
        self.status_effects.iter().any(|e| e.is_stunned())
    }

    pub fn tick_status_effects(&mut self) -> Vec<String> {
        let mut messages = Vec::new();
        let mut new_effects = Vec::new();
        let mut total_dot = 0;

        for effect in &self.status_effects {
            let dot = effect.dot_damage();
            if dot > 0 {
                total_dot += dot;
                match effect {
                    StatusEffect::Poison { .. } => messages.push(format!("Poison deals {} damage!", dot)),
                    StatusEffect::Burn { .. } => messages.push(format!("Burn deals {} damage!", dot)),
                    _ => {}
                }
            }

            // Handle buff removal
            match effect {
                StatusEffect::StrengthBuff { duration, amount } => {
                    if *duration <= 1 {
                        self.temp_str_bonus -= amount;
                    }
                }
                StatusEffect::DexterityBuff { duration, amount } => {
                    if *duration <= 1 {
                        self.temp_dex_bonus -= amount;
                    }
                }
                StatusEffect::DefenseBuff { duration, amount } => {
                    if *duration <= 1 {
                        self.temp_def_bonus -= amount;
                    }
                }
                _ => {}
            }

            if let Some(next) = effect.tick() {
                new_effects.push(next);
            }
        }

        if total_dot > 0 {
            self.take_damage(total_dot);
        }

        self.status_effects = new_effects;
        messages
    }

    pub fn apply_status(&mut self, effect: StatusEffect) {
        // Apply buff effects immediately
        match &effect {
            StatusEffect::StrengthBuff { amount, .. } => {
                self.temp_str_bonus += amount;
            }
            StatusEffect::DexterityBuff { amount, .. } => {
                self.temp_dex_bonus += amount;
            }
            StatusEffect::DefenseBuff { amount, .. } => {
                self.temp_def_bonus += amount;
            }
            _ => {}
        }
        self.status_effects.push(effect);
    }

    pub fn learn_skill(&mut self, skill_id: usize) -> bool {
        if self.skill_points > 0 && !self.learned_skills.contains(&skill_id) {
            self.learned_skills.push(skill_id);
            self.skill_points -= 1;
            true
        } else {
            false
        }
    }

    pub fn has_skill(&self, skill_id: usize) -> bool {
        self.learned_skills.contains(&skill_id)
    }
}
