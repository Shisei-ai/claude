use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Class {
    Warrior,
    Mage,
    Rogue,
}

impl Class {
    pub fn name(&self) -> &str {
        match self {
            Class::Warrior => "Warrior",
            Class::Mage => "Mage",
            Class::Rogue => "Rogue",
        }
    }

    pub fn description(&self) -> &str {
        match self {
            Class::Warrior => "A powerful melee fighter with high HP and defense.",
            Class::Mage => "A spellcaster with powerful magic but fragile body.",
            Class::Rogue => "A nimble fighter relying on speed and critical hits.",
        }
    }

    pub fn base_hp(&self) -> i32 {
        match self {
            Class::Warrior => 40,
            Class::Mage => 20,
            Class::Rogue => 28,
        }
    }

    pub fn base_mp(&self) -> i32 {
        match self {
            Class::Warrior => 10,
            Class::Mage => 40,
            Class::Rogue => 20,
        }
    }

    pub fn hp_per_level(&self) -> i32 {
        match self {
            Class::Warrior => 12,
            Class::Mage => 5,
            Class::Rogue => 8,
        }
    }

    pub fn mp_per_level(&self) -> i32 {
        match self {
            Class::Warrior => 2,
            Class::Mage => 8,
            Class::Rogue => 4,
        }
    }

    pub fn base_strength(&self) -> i32 {
        match self {
            Class::Warrior => 8,
            Class::Mage => 2,
            Class::Rogue => 5,
        }
    }

    pub fn base_dexterity(&self) -> i32 {
        match self {
            Class::Warrior => 4,
            Class::Mage => 4,
            Class::Rogue => 9,
        }
    }

    pub fn base_intelligence(&self) -> i32 {
        match self {
            Class::Warrior => 2,
            Class::Mage => 10,
            Class::Rogue => 4,
        }
    }

    pub fn base_defense(&self) -> i32 {
        match self {
            Class::Warrior => 5,
            Class::Mage => 1,
            Class::Rogue => 3,
        }
    }

    pub fn symbol(&self) -> char {
        match self {
            Class::Warrior => '@',
            Class::Mage => '@',
            Class::Rogue => '@',
        }
    }

    pub fn color(&self) -> (u8, u8, u8) {
        match self {
            Class::Warrior => (200, 150, 100),
            Class::Mage => (100, 150, 255),
            Class::Rogue => (150, 255, 150),
        }
    }
}
