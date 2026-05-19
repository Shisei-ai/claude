use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, Debug)]
pub enum MonsterKind {
    Rat,
    Goblin,
    Orc,
    Skeleton,
    Zombie,
    Troll,
    Mage,
    Vampire,
    Dragon,
    Demon,
    Ghost,
    Golem,
}

impl MonsterKind {
    pub fn char(&self) -> char {
        match self {
            MonsterKind::Rat => 'r',
            MonsterKind::Goblin => 'g',
            MonsterKind::Orc => 'O',
            MonsterKind::Skeleton => 's',
            MonsterKind::Zombie => 'z',
            MonsterKind::Troll => 'T',
            MonsterKind::Mage => 'M',
            MonsterKind::Vampire => 'V',
            MonsterKind::Dragon => 'D',
            MonsterKind::Demon => '&',
            MonsterKind::Ghost => 'G',
            MonsterKind::Golem => 'P',
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            MonsterKind::Rat => "Rat",
            MonsterKind::Goblin => "Goblin",
            MonsterKind::Orc => "Orc",
            MonsterKind::Skeleton => "Skeleton",
            MonsterKind::Zombie => "Zombie",
            MonsterKind::Troll => "Troll",
            MonsterKind::Mage => "Dark Mage",
            MonsterKind::Vampire => "Vampire",
            MonsterKind::Dragon => "Dragon",
            MonsterKind::Demon => "Demon",
            MonsterKind::Ghost => "Ghost",
            MonsterKind::Golem => "Stone Golem",
        }
    }

    pub fn is_boss(&self) -> bool {
        matches!(self, MonsterKind::Dragon | MonsterKind::Demon)
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum StatusEffect {
    Poisoned { damage: i32, turns_left: u32 },
    Stunned { turns_left: u32 },
    Confused { turns_left: u32 },
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Monster {
    pub id: u64,
    pub kind: MonsterKind,
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub attack: i32,
    pub defense: i32,
    pub exp_reward: u32,
    pub gold_reward: u32,
    pub status_effects: Vec<StatusEffect>,
    pub is_confused: bool,
    pub ai_state: AiState,
    pub seen_player: bool,
    pub item_drop_chance: u32, // percent
}

#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, Debug)]
pub enum AiState {
    Idle,
    Chasing,
    Fleeing,
}

static mut MONSTER_ID: u64 = 0;
fn next_monster_id() -> u64 {
    unsafe {
        MONSTER_ID += 1;
        MONSTER_ID
    }
}

pub fn spawn_monster<R: Rng>(rng: &mut R, x: i32, y: i32, floor: u32, is_boss: bool) -> Monster {
    let kind = if is_boss {
        if floor >= 15 {
            MonsterKind::Demon
        } else {
            MonsterKind::Dragon
        }
    } else {
        pick_monster_kind(rng, floor)
    };

    let (base_hp, base_atk, base_def, base_exp, base_gold, drop_chance) = base_stats_for(&kind);
    let scale = 1.0 + (floor as f32 - 1.0) * 0.15;
    let cursed_bonus = 1.0f32; // set externally if on cursed floor

    let hp = ((base_hp as f32 * scale * cursed_bonus) as i32).max(1) + rng.gen_range(0..5);
    let atk = ((base_atk as f32 * scale * cursed_bonus) as i32).max(1) + rng.gen_range(0..3);
    let def = ((base_def as f32 * scale) as i32).max(0) + rng.gen_range(0..2);
    let exp = (base_exp as f32 * scale) as u32 + rng.gen_range(0..10);
    let gold = (base_gold as f32 * scale) as u32 + rng.gen_range(0..5);

    Monster {
        id: next_monster_id(),
        kind,
        x,
        y,
        hp,
        max_hp: hp,
        attack: atk,
        defense: def,
        exp_reward: exp,
        gold_reward: gold,
        status_effects: Vec::new(),
        is_confused: false,
        ai_state: AiState::Idle,
        seen_player: false,
        item_drop_chance: drop_chance,
    }
}

fn pick_monster_kind<R: Rng>(rng: &mut R, floor: u32) -> MonsterKind {
    let max_tier = (floor / 3).min(8) as usize;
    let pool = vec![
        MonsterKind::Rat,       // tier 0
        MonsterKind::Goblin,    // tier 1
        MonsterKind::Skeleton,  // tier 1
        MonsterKind::Zombie,    // tier 2
        MonsterKind::Orc,       // tier 3
        MonsterKind::Ghost,     // tier 3
        MonsterKind::Troll,     // tier 4
        MonsterKind::Mage,      // tier 5
        MonsterKind::Golem,     // tier 6
        MonsterKind::Vampire,   // tier 7
    ];
    let available = &pool[..=(max_tier.min(pool.len() - 1))];
    available[rng.gen_range(0..available.len())].clone()
}

fn base_stats_for(kind: &MonsterKind) -> (i32, i32, i32, u32, u32, u32) {
    // (hp, atk, def, exp, gold, drop_chance%)
    match kind {
        MonsterKind::Rat       => (8,  2, 0, 5,  3,  10),
        MonsterKind::Goblin    => (15, 4, 1, 10, 8,  20),
        MonsterKind::Skeleton  => (20, 5, 2, 15, 10, 25),
        MonsterKind::Zombie    => (30, 4, 3, 20, 12, 20),
        MonsterKind::Orc       => (45, 8, 4, 35, 20, 30),
        MonsterKind::Ghost     => (25, 7, 5, 30, 15, 35),
        MonsterKind::Troll     => (80, 12, 6, 60, 35, 40),
        MonsterKind::Mage      => (35, 15, 3, 70, 40, 50),
        MonsterKind::Golem     => (100,10, 12,80, 50, 35),
        MonsterKind::Vampire   => (60, 14, 8, 90, 60, 50),
        MonsterKind::Dragon    => (200,25, 15,500,200,80),
        MonsterKind::Demon     => (300,35, 20,1000,500,90),
    }
}

impl Monster {
    pub fn is_alive(&self) -> bool {
        self.hp > 0
    }

    pub fn take_damage(&mut self, amount: i32) -> i32 {
        let actual = (amount - self.defense).max(1);
        self.hp = (self.hp - actual).max(0);
        actual
    }

    pub fn tick_status(&mut self) -> i32 {
        let mut poison_dmg = 0;
        self.status_effects.retain_mut(|effect| match effect {
            StatusEffect::Poisoned { damage, turns_left } => {
                poison_dmg += *damage;
                self.hp = (self.hp - *damage).max(0);
                *turns_left -= 1;
                *turns_left > 0
            }
            StatusEffect::Stunned { turns_left } => {
                *turns_left -= 1;
                *turns_left > 0
            }
            StatusEffect::Confused { turns_left } => {
                *turns_left -= 1;
                *turns_left > 0
            }
        });
        poison_dmg
    }

    pub fn is_stunned(&self) -> bool {
        self.status_effects.iter().any(|e| matches!(e, StatusEffect::Stunned { .. }))
    }

    pub fn ai_move_toward(&self, px: i32, py: i32) -> (i32, i32) {
        let dx = (px - self.x).signum();
        let dy = (py - self.y).signum();
        if dx.abs() >= dy.abs() {
            (self.x + dx, self.y)
        } else {
            (self.x, self.y + dy)
        }
    }
}
