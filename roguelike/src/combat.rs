use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum StatusEffect {
    Poison { duration: i32, damage_per_turn: i32 },
    Burn { duration: i32, damage_per_turn: i32 },
    Stun { duration: i32 },
    Slow { duration: i32 },
    StrengthBuff { duration: i32, amount: i32 },
    DexterityBuff { duration: i32, amount: i32 },
    DefenseBuff { duration: i32, amount: i32 },
}

impl StatusEffect {
    pub fn name(&self) -> &str {
        match self {
            StatusEffect::Poison { .. } => "Poison",
            StatusEffect::Burn { .. } => "Burn",
            StatusEffect::Stun { .. } => "Stun",
            StatusEffect::Slow { .. } => "Slow",
            StatusEffect::StrengthBuff { .. } => "Strength Up",
            StatusEffect::DexterityBuff { .. } => "Dexterity Up",
            StatusEffect::DefenseBuff { .. } => "Defense Up/Down",
        }
    }

    pub fn tick(&self) -> Option<StatusEffect> {
        match self {
            StatusEffect::Poison { duration, damage_per_turn } => {
                if *duration > 1 { Some(StatusEffect::Poison { duration: duration - 1, damage_per_turn: *damage_per_turn }) } else { None }
            }
            StatusEffect::Burn { duration, damage_per_turn } => {
                if *duration > 1 { Some(StatusEffect::Burn { duration: duration - 1, damage_per_turn: *damage_per_turn }) } else { None }
            }
            StatusEffect::Stun { duration } => {
                if *duration > 1 { Some(StatusEffect::Stun { duration: duration - 1 }) } else { None }
            }
            StatusEffect::Slow { duration } => {
                if *duration > 1 { Some(StatusEffect::Slow { duration: duration - 1 }) } else { None }
            }
            StatusEffect::StrengthBuff { duration, amount } => {
                if *duration > 1 { Some(StatusEffect::StrengthBuff { duration: duration - 1, amount: *amount }) } else { None }
            }
            StatusEffect::DexterityBuff { duration, amount } => {
                if *duration > 1 { Some(StatusEffect::DexterityBuff { duration: duration - 1, amount: *amount }) } else { None }
            }
            StatusEffect::DefenseBuff { duration, amount } => {
                if *duration > 1 { Some(StatusEffect::DefenseBuff { duration: duration - 1, amount: *amount }) } else { None }
            }
        }
    }

    pub fn dot_damage(&self) -> i32 {
        match self {
            StatusEffect::Poison { damage_per_turn, .. } => *damage_per_turn,
            StatusEffect::Burn { damage_per_turn, .. } => *damage_per_turn,
            _ => 0,
        }
    }

    pub fn is_stunned(&self) -> bool {
        matches!(self, StatusEffect::Stun { .. })
    }
}

pub struct CombatResult {
    pub damage: i32,
    pub is_critical: bool,
    pub hit: bool,
    pub message: String,
}

pub fn calculate_damage<R: Rng>(
    rng: &mut R,
    attacker_strength: i32,
    attacker_dex: i32,
    weapon_bonus: i32,
    defender_defense: i32,
    is_magic: bool,
    attacker_int: i32,
    skill_multiplier: f32,
) -> CombatResult {
    let hit_chance = if is_magic {
        0.85 + (attacker_int as f32 * 0.01)
    } else {
        0.75 + (attacker_dex as f32 * 0.02)
    };

    let hit_roll: f32 = rng.gen();
    if hit_roll > hit_chance.min(0.95) {
        return CombatResult {
            damage: 0,
            is_critical: false,
            hit: false,
            message: "MISS!".to_string(),
        };
    }

    let crit_chance = if is_magic {
        0.05 + (attacker_int as f32 * 0.005)
    } else {
        0.05 + (attacker_dex as f32 * 0.01)
    };

    let crit_roll: f32 = rng.gen();
    let is_critical = crit_roll < crit_chance.min(0.35);

    let base_damage = if is_magic {
        attacker_int * 2 + weapon_bonus + rng.gen_range(1..=6)
    } else {
        attacker_strength + weapon_bonus + rng.gen_range(1..=6)
    };

    let scaled = (base_damage as f32 * skill_multiplier) as i32;
    let crit_multiplied = if is_critical { scaled * 2 } else { scaled };
    let final_damage = (crit_multiplied - defender_defense).max(1);

    let msg = if is_critical {
        format!("CRITICAL! {} damage!", final_damage)
    } else {
        format!("{} damage!", final_damage)
    };

    CombatResult {
        damage: final_damage,
        is_critical,
        hit: true,
        message: msg,
    }
}

pub fn monster_attack<R: Rng>(
    rng: &mut R,
    monster_strength: i32,
    monster_dex: i32,
    player_defense: i32,
) -> CombatResult {
    let hit_chance = 0.65 + (monster_dex as f32 * 0.01);
    let hit_roll: f32 = rng.gen();
    if hit_roll > hit_chance.min(0.90) {
        return CombatResult {
            damage: 0,
            is_critical: false,
            hit: false,
            message: "MISS!".to_string(),
        };
    }

    let crit_roll: f32 = rng.gen();
    let is_critical = crit_roll < 0.08;

    let base_damage = monster_strength + rng.gen_range(1..=4);
    let crit_multiplied = if is_critical { base_damage * 2 } else { base_damage };
    let final_damage = (crit_multiplied - player_defense).max(1);

    let msg = if is_critical {
        format!("CRITICAL! {} damage!", final_damage)
    } else {
        format!("{} damage!", final_damage)
    };

    CombatResult {
        damage: final_damage,
        is_critical,
        hit: true,
        message: msg,
    }
}

pub fn apply_status_from_string(name: &str) -> StatusEffect {
    match name {
        "Poison" => StatusEffect::Poison { duration: 3, damage_per_turn: 3 },
        "Burn" => StatusEffect::Burn { duration: 3, damage_per_turn: 4 },
        "Stun" => StatusEffect::Stun { duration: 1 },
        "Slow" => StatusEffect::Slow { duration: 3 },
        _ => StatusEffect::Stun { duration: 1 },
    }
}

pub fn apply_buff_from_string(stat: &str, amount: i32, duration: i32) -> StatusEffect {
    match stat {
        "strength" => StatusEffect::StrengthBuff { duration, amount },
        "dexterity" => StatusEffect::DexterityBuff { duration, amount },
        "defense" => StatusEffect::DefenseBuff { duration, amount },
        _ => StatusEffect::StrengthBuff { duration, amount },
    }
}
