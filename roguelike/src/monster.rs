use rand::Rng;
use serde::{Deserialize, Serialize};
use crate::combat::StatusEffect;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum MonsterKind {
    Slime,
    Goblin,
    Skeleton,
    Orc,
    Troll,
    Vampire,
    Dragon,
    DarkKnight,
}

impl MonsterKind {
    pub fn name(&self) -> &'static str {
        match self {
            MonsterKind::Slime => "Slime",
            MonsterKind::Goblin => "Goblin",
            MonsterKind::Skeleton => "Skeleton",
            MonsterKind::Orc => "Orc",
            MonsterKind::Troll => "Troll",
            MonsterKind::Vampire => "Vampire",
            MonsterKind::Dragon => "Dragon",
            MonsterKind::DarkKnight => "Dark Knight",
        }
    }

    pub fn symbol(&self) -> char {
        match self {
            MonsterKind::Slime => 's',
            MonsterKind::Goblin => 'g',
            MonsterKind::Skeleton => 'S',
            MonsterKind::Orc => 'o',
            MonsterKind::Troll => 'T',
            MonsterKind::Vampire => 'V',
            MonsterKind::Dragon => 'D',
            MonsterKind::DarkKnight => 'K',
        }
    }

    pub fn color(&self) -> (u8, u8, u8) {
        match self {
            MonsterKind::Slime => (0, 200, 50),
            MonsterKind::Goblin => (150, 200, 50),
            MonsterKind::Skeleton => (230, 230, 200),
            MonsterKind::Orc => (100, 150, 50),
            MonsterKind::Troll => (80, 120, 80),
            MonsterKind::Vampire => (180, 0, 180),
            MonsterKind::Dragon => (200, 50, 50),
            MonsterKind::DarkKnight => (80, 80, 150),
        }
    }

    pub fn for_floor(floor: i32) -> Vec<MonsterKind> {
        match floor {
            1..=2 => vec![MonsterKind::Slime, MonsterKind::Goblin],
            3..=4 => vec![MonsterKind::Goblin, MonsterKind::Skeleton],
            5..=6 => vec![MonsterKind::Skeleton, MonsterKind::Orc],
            7..=8 => vec![MonsterKind::Orc, MonsterKind::Troll],
            9..=10 => vec![MonsterKind::Troll, MonsterKind::Vampire],
            11..=14 => vec![MonsterKind::Vampire, MonsterKind::DarkKnight],
            _ => vec![MonsterKind::Dragon, MonsterKind::DarkKnight],
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Monster {
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub strength: i32,
    pub dexterity: i32,
    pub defense: i32,
    pub xp_reward: i32,
    pub gold_reward: i32,
    pub kind: MonsterKind,
    pub status_effects: Vec<StatusEffect>,
    pub is_alive: bool,
}

impl Monster {
    pub fn new(kind: MonsterKind, x: i32, y: i32, floor: i32) -> Self {
        let scale = 1.0 + (floor as f32 - 1.0) * 0.2;

        let (base_hp, base_str, base_dex, base_def, base_xp, base_gold) = match kind {
            MonsterKind::Slime => (8, 2, 2, 0, 5, 2),
            MonsterKind::Goblin => (12, 3, 5, 1, 10, 5),
            MonsterKind::Skeleton => (15, 5, 3, 2, 15, 8),
            MonsterKind::Orc => (25, 7, 3, 3, 25, 12),
            MonsterKind::Troll => (40, 9, 2, 5, 40, 20),
            MonsterKind::Vampire => (35, 8, 7, 4, 50, 30),
            MonsterKind::Dragon => (80, 15, 6, 10, 150, 80),
            MonsterKind::DarkKnight => (60, 12, 8, 8, 100, 60),
        };

        let hp = ((base_hp as f32) * scale) as i32;
        let str_stat = ((base_str as f32) * scale) as i32;
        let dex = ((base_dex as f32) * scale) as i32;
        let def = ((base_def as f32) * scale) as i32;
        let xp = ((base_xp as f32) * scale) as i32;
        let gold = ((base_gold as f32) * scale) as i32;

        Monster {
            x,
            y,
            hp,
            max_hp: hp,
            strength: str_stat,
            dexterity: dex,
            defense: def,
            xp_reward: xp,
            gold_reward: gold,
            kind,
            status_effects: Vec::new(),
            is_alive: true,
        }
    }

    pub fn random<R: Rng>(rng: &mut R, x: i32, y: i32, floor: i32) -> Self {
        let candidates = MonsterKind::for_floor(floor);
        let kind = candidates[rng.gen_range(0..candidates.len())].clone();
        Monster::new(kind, x, y, floor)
    }

    pub fn take_damage(&mut self, damage: i32) {
        self.hp -= damage;
        if self.hp <= 0 {
            self.hp = 0;
            self.is_alive = false;
        }
    }

    pub fn is_stunned(&self) -> bool {
        self.status_effects.iter().any(|e| e.is_stunned())
    }

    pub fn tick_status_effects(&mut self) -> i32 {
        let mut total_dot = 0;
        let mut new_effects = Vec::new();

        for effect in &self.status_effects {
            total_dot += effect.dot_damage();
            if let Some(next) = effect.tick() {
                new_effects.push(next);
            }
        }

        if total_dot > 0 {
            self.take_damage(total_dot);
        }

        self.status_effects = new_effects;
        total_dot
    }

    pub fn apply_status(&mut self, effect: StatusEffect) {
        self.status_effects.push(effect);
    }

    pub fn try_move_toward_player(
        &self,
        px: i32,
        py: i32,
        map: &crate::map::Map,
        other_monsters: &[&Monster],
    ) -> Option<(i32, i32)> {
        if self.is_stunned() {
            return None;
        }

        let dx = (px - self.x).signum();
        let dy = (py - self.y).signum();

        // Try direct move
        let candidates = [
            (self.x + dx, self.y + dy),
            (self.x + dx, self.y),
            (self.x, self.y + dy),
        ];

        for (nx, ny) in &candidates {
            let blocked_by_monster = other_monsters.iter().any(|m| m.x == *nx && m.y == *ny);
            if map.is_walkable(*nx, *ny) && !blocked_by_monster {
                return Some((*nx, *ny));
            }
        }

        None
    }

    pub fn attack_description(&self) -> String {
        format!("{} attacks", self.kind.name())
    }
}
