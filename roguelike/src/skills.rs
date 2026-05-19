use serde::{Deserialize, Serialize};
use crate::classes::Class;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum SkillEffect {
    Damage { multiplier: f32, is_magic: bool },
    Heal { amount: i32 },
    StatusInflict { status: String, chance: f32 },
    AoeDamage { multiplier: f32 },
    Buff { stat: String, amount: i32, duration: i32 },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Skill {
    pub id: usize,
    pub name: String,
    pub description: String,
    pub mp_cost: i32,
    pub min_level: i32,
    pub class: String,
    pub effects: Vec<SkillEffect>,
}

impl Skill {
    pub fn get_all_skills() -> Vec<Skill> {
        vec![
            // Warrior skills
            Skill {
                id: 0,
                name: "Slash".to_string(),
                description: "A powerful sword slash dealing 150% damage.".to_string(),
                mp_cost: 5,
                min_level: 1,
                class: "Warrior".to_string(),
                effects: vec![SkillEffect::Damage { multiplier: 1.5, is_magic: false }],
            },
            Skill {
                id: 1,
                name: "Shield Bash".to_string(),
                description: "Bash the enemy with your shield, stunning them.".to_string(),
                mp_cost: 8,
                min_level: 3,
                class: "Warrior".to_string(),
                effects: vec![
                    SkillEffect::Damage { multiplier: 1.0, is_magic: false },
                    SkillEffect::StatusInflict { status: "Stun".to_string(), chance: 0.6 },
                ],
            },
            Skill {
                id: 2,
                name: "War Cry".to_string(),
                description: "Boost your strength for several turns.".to_string(),
                mp_cost: 12,
                min_level: 5,
                class: "Warrior".to_string(),
                effects: vec![SkillEffect::Buff { stat: "strength".to_string(), amount: 5, duration: 3 }],
            },
            Skill {
                id: 3,
                name: "Berserker".to_string(),
                description: "Enter a berserk state, dealing 250% damage but lowering defense.".to_string(),
                mp_cost: 20,
                min_level: 8,
                class: "Warrior".to_string(),
                effects: vec![
                    SkillEffect::Damage { multiplier: 2.5, is_magic: false },
                    SkillEffect::Buff { stat: "defense".to_string(), amount: -3, duration: 2 },
                ],
            },
            // Mage skills
            Skill {
                id: 4,
                name: "Fireball".to_string(),
                description: "Hurl a ball of fire dealing magic damage and possibly burning.".to_string(),
                mp_cost: 10,
                min_level: 1,
                class: "Mage".to_string(),
                effects: vec![
                    SkillEffect::Damage { multiplier: 2.0, is_magic: true },
                    SkillEffect::StatusInflict { status: "Burn".to_string(), chance: 0.4 },
                ],
            },
            Skill {
                id: 5,
                name: "Ice Shard".to_string(),
                description: "Launch ice shards that slow the enemy.".to_string(),
                mp_cost: 8,
                min_level: 3,
                class: "Mage".to_string(),
                effects: vec![
                    SkillEffect::Damage { multiplier: 1.5, is_magic: true },
                    SkillEffect::StatusInflict { status: "Slow".to_string(), chance: 0.7 },
                ],
            },
            Skill {
                id: 6,
                name: "Thunder".to_string(),
                description: "Call down lightning for heavy magic damage.".to_string(),
                mp_cost: 15,
                min_level: 5,
                class: "Mage".to_string(),
                effects: vec![SkillEffect::Damage { multiplier: 2.5, is_magic: true }],
            },
            Skill {
                id: 7,
                name: "Arcane Blast".to_string(),
                description: "Unleash pure arcane energy for massive damage.".to_string(),
                mp_cost: 25,
                min_level: 8,
                class: "Mage".to_string(),
                effects: vec![SkillEffect::Damage { multiplier: 3.5, is_magic: true }],
            },
            // Rogue skills
            Skill {
                id: 8,
                name: "Backstab".to_string(),
                description: "Strike from the shadows for 200% damage with high crit chance.".to_string(),
                mp_cost: 8,
                min_level: 1,
                class: "Rogue".to_string(),
                effects: vec![SkillEffect::Damage { multiplier: 2.0, is_magic: false }],
            },
            Skill {
                id: 9,
                name: "Poison Strike".to_string(),
                description: "Coat your blade in poison before striking.".to_string(),
                mp_cost: 10,
                min_level: 3,
                class: "Rogue".to_string(),
                effects: vec![
                    SkillEffect::Damage { multiplier: 1.2, is_magic: false },
                    SkillEffect::StatusInflict { status: "Poison".to_string(), chance: 0.8 },
                ],
            },
            Skill {
                id: 10,
                name: "Shadow Step".to_string(),
                description: "Vanish and reappear, buffing your dexterity.".to_string(),
                mp_cost: 12,
                min_level: 5,
                class: "Rogue".to_string(),
                effects: vec![SkillEffect::Buff { stat: "dexterity".to_string(), amount: 6, duration: 3 }],
            },
            Skill {
                id: 11,
                name: "Death Mark".to_string(),
                description: "Mark the enemy for death, dealing triple damage.".to_string(),
                mp_cost: 22,
                min_level: 8,
                class: "Rogue".to_string(),
                effects: vec![SkillEffect::Damage { multiplier: 3.0, is_magic: false }],
            },
        ]
    }

    pub fn get_class_skills(class: &Class) -> Vec<Skill> {
        let class_name = class.name().to_string();
        Self::get_all_skills()
            .into_iter()
            .filter(|s| s.class == class_name)
            .collect()
    }

    pub fn get_available_skills(class: &Class, level: i32) -> Vec<Skill> {
        Self::get_class_skills(class)
            .into_iter()
            .filter(|s| s.min_level <= level)
            .collect()
    }

    pub fn get_by_id(id: usize) -> Option<Skill> {
        Self::get_all_skills().into_iter().find(|s| s.id == id)
    }
}
