use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    Legendary,
}

impl Rarity {
    pub fn name(&self) -> &str {
        match self {
            Rarity::Common => "Common",
            Rarity::Uncommon => "Uncommon",
            Rarity::Rare => "Rare",
            Rarity::Legendary => "Legendary",
        }
    }

    pub fn color(&self) -> (u8, u8, u8) {
        match self {
            Rarity::Common => (200, 200, 200),
            Rarity::Uncommon => (100, 255, 100),
            Rarity::Rare => (100, 100, 255),
            Rarity::Legendary => (255, 180, 0),
        }
    }

    pub fn multiplier(&self) -> f32 {
        match self {
            Rarity::Common => 1.0,
            Rarity::Uncommon => 1.3,
            Rarity::Rare => 1.7,
            Rarity::Legendary => 2.5,
        }
    }

    pub fn random<R: Rng>(rng: &mut R) -> Rarity {
        match rng.gen_range(0..100) {
            0..=59 => Rarity::Common,
            60..=84 => Rarity::Uncommon,
            85..=96 => Rarity::Rare,
            _ => Rarity::Legendary,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum WeaponType {
    Sword,
    Axe,
    Staff,
    Dagger,
    Bow,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ArmorType {
    Leather,
    Chainmail,
    Plate,
    Robe,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum PotionType {
    Health,
    Mana,
    Strength,
    Speed,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ScrollType {
    Identify,
    Teleport,
    Fireball,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum RingType {
    Strength,
    Defense,
    Speed,
    Magic,
    Life,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ItemKind {
    Weapon {
        weapon_type: WeaponType,
        attack_bonus: i32,
        magic_bonus: i32,
    },
    Armor {
        armor_type: ArmorType,
        defense_bonus: i32,
        hp_bonus: i32,
    },
    Potion {
        potion_type: PotionType,
        power: i32,
    },
    Scroll {
        scroll_type: ScrollType,
    },
    Ring {
        ring_type: RingType,
        bonus: i32,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Item {
    pub name: String,
    pub kind: ItemKind,
    pub rarity: Rarity,
    pub symbol: char,
    pub identified: bool,
    pub value: i32,
}

impl Item {
    pub fn new_weapon<R: Rng>(rng: &mut R, floor: i32) -> Item {
        let rarity = Rarity::random(rng);
        let weapon_type = match rng.gen_range(0..5) {
            0 => WeaponType::Sword,
            1 => WeaponType::Axe,
            2 => WeaponType::Staff,
            3 => WeaponType::Dagger,
            _ => WeaponType::Bow,
        };

        let base_attack = (floor / 2 + rng.gen_range(1..=4)) as f32 * rarity.multiplier();
        let base_magic = if weapon_type == WeaponType::Staff {
            (floor / 2 + rng.gen_range(1..=4)) as f32 * rarity.multiplier()
        } else {
            0.0
        };

        let (name_prefix, bonus_attack, bonus_magic) = match weapon_type {
            WeaponType::Sword => ("Sword", base_attack as i32 + 2, 0),
            WeaponType::Axe => ("Axe", base_attack as i32 + 3, 0),
            WeaponType::Staff => ("Staff", (base_attack * 0.5) as i32, base_magic as i32 + 4),
            WeaponType::Dagger => ("Dagger", base_attack as i32, 0),
            WeaponType::Bow => ("Bow", base_attack as i32 + 1, 0),
        };

        let rarity_prefix = match rarity {
            Rarity::Common => "",
            Rarity::Uncommon => "Fine ",
            Rarity::Rare => "Rare ",
            Rarity::Legendary => "Legendary ",
        };

        Item {
            name: format!("{}{}", rarity_prefix, name_prefix),
            kind: ItemKind::Weapon {
                weapon_type,
                attack_bonus: bonus_attack,
                magic_bonus: bonus_magic,
            },
            rarity,
            symbol: ')',
            identified: true,
            value: bonus_attack * 10 + bonus_magic * 8,
        }
    }

    pub fn new_armor<R: Rng>(rng: &mut R, floor: i32) -> Item {
        let rarity = Rarity::random(rng);
        let armor_type = match rng.gen_range(0..4) {
            0 => ArmorType::Leather,
            1 => ArmorType::Chainmail,
            2 => ArmorType::Plate,
            _ => ArmorType::Robe,
        };

        let base_def = (floor / 2 + rng.gen_range(0..=3)) as f32 * rarity.multiplier();

        let (name, def_bonus, hp_bonus) = match armor_type {
            ArmorType::Leather => ("Leather Armor", base_def as i32 + 1, 5),
            ArmorType::Chainmail => ("Chainmail", base_def as i32 + 3, 10),
            ArmorType::Plate => ("Plate Armor", base_def as i32 + 5, 15),
            ArmorType::Robe => ("Magic Robe", (base_def * 0.5) as i32 + 1, 3),
        };

        let rarity_prefix = match rarity {
            Rarity::Common => "",
            Rarity::Uncommon => "Fine ",
            Rarity::Rare => "Enchanted ",
            Rarity::Legendary => "Legendary ",
        };

        Item {
            name: format!("{}{}", rarity_prefix, name),
            kind: ItemKind::Armor {
                armor_type,
                defense_bonus: def_bonus,
                hp_bonus,
            },
            rarity,
            symbol: '[',
            identified: true,
            value: def_bonus * 12 + hp_bonus * 2,
        }
    }

    pub fn new_potion<R: Rng>(rng: &mut R) -> Item {
        let potion_type = match rng.gen_range(0..4) {
            0 => PotionType::Health,
            1 => PotionType::Mana,
            2 => PotionType::Strength,
            _ => PotionType::Speed,
        };

        let (name, power, value) = match potion_type {
            PotionType::Health => ("Health Potion", 30, 15),
            PotionType::Mana => ("Mana Potion", 20, 15),
            PotionType::Strength => ("Strength Potion", 5, 25),
            PotionType::Speed => ("Speed Potion", 5, 25),
        };

        Item {
            name: name.to_string(),
            kind: ItemKind::Potion { potion_type, power },
            rarity: Rarity::Common,
            symbol: '!',
            identified: rng.gen_bool(0.7),
            value,
        }
    }

    pub fn new_scroll<R: Rng>(rng: &mut R) -> Item {
        let scroll_type = match rng.gen_range(0..3) {
            0 => ScrollType::Identify,
            1 => ScrollType::Teleport,
            _ => ScrollType::Fireball,
        };

        let (name, value) = match scroll_type {
            ScrollType::Identify => ("Scroll of Identify", 20),
            ScrollType::Teleport => ("Scroll of Teleport", 30),
            ScrollType::Fireball => ("Scroll of Fireball", 35),
        };

        Item {
            name: name.to_string(),
            kind: ItemKind::Scroll { scroll_type },
            rarity: Rarity::Common,
            symbol: '?',
            identified: rng.gen_bool(0.5),
            value,
        }
    }

    pub fn new_ring<R: Rng>(rng: &mut R) -> Item {
        let ring_type = match rng.gen_range(0..5) {
            0 => RingType::Strength,
            1 => RingType::Defense,
            2 => RingType::Speed,
            3 => RingType::Magic,
            _ => RingType::Life,
        };

        let bonus = rng.gen_range(1..=4);

        let (name, value) = match ring_type {
            RingType::Strength => (format!("Ring of Strength +{}", bonus), bonus * 20),
            RingType::Defense => (format!("Ring of Defense +{}", bonus), bonus * 20),
            RingType::Speed => (format!("Ring of Speed +{}", bonus), bonus * 20),
            RingType::Magic => (format!("Ring of Magic +{}", bonus), bonus * 20),
            RingType::Life => (format!("Ring of Life +{}", bonus * 10), bonus * 15),
        };

        Item {
            name,
            kind: ItemKind::Ring { ring_type, bonus },
            rarity: Rarity::Uncommon,
            symbol: '=',
            identified: rng.gen_bool(0.4),
            value,
        }
    }

    pub fn random<R: Rng>(rng: &mut R, floor: i32) -> Item {
        match rng.gen_range(0..10) {
            0..=2 => Item::new_weapon(rng, floor),
            3..=5 => Item::new_armor(rng, floor),
            6..=7 => Item::new_potion(rng),
            8 => Item::new_scroll(rng),
            _ => Item::new_ring(rng),
        }
    }

    pub fn display_name(&self) -> &str {
        &self.name
    }

    pub fn description(&self) -> String {
        match &self.kind {
            ItemKind::Weapon { attack_bonus, magic_bonus, .. } => {
                if *magic_bonus > 0 {
                    format!("ATK+{} MAG+{}", attack_bonus, magic_bonus)
                } else {
                    format!("ATK+{}", attack_bonus)
                }
            }
            ItemKind::Armor { defense_bonus, hp_bonus, .. } => {
                format!("DEF+{} HP+{}", defense_bonus, hp_bonus)
            }
            ItemKind::Potion { potion_type, power } => match potion_type {
                PotionType::Health => format!("Restore {} HP", power),
                PotionType::Mana => format!("Restore {} MP", power),
                PotionType::Strength => format!("STR+{} for this floor", power),
                PotionType::Speed => format!("DEX+{} for this floor", power),
            },
            ItemKind::Scroll { scroll_type } => match scroll_type {
                ScrollType::Identify => "Identify an item".to_string(),
                ScrollType::Teleport => "Teleport to a random location".to_string(),
                ScrollType::Fireball => "Deals 40 fire damage to enemy".to_string(),
            },
            ItemKind::Ring { ring_type, bonus } => match ring_type {
                RingType::Strength => format!("STR+{}", bonus),
                RingType::Defense => format!("DEF+{}", bonus),
                RingType::Speed => format!("DEX+{}", bonus),
                RingType::Magic => format!("INT+{}", bonus),
                RingType::Life => format!("MaxHP+{}", bonus * 10),
            },
        }
    }
}
