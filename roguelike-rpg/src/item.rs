use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Debug)]
pub enum ItemKind {
    Weapon,
    Armor,
    Helmet,
    Boots,
    Ring,
    Amulet,
    Consumable,
    Material,
    SkillTome,
}

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Debug)]
pub enum WeaponType {
    Sword,
    Axe,
    Staff,
    Dagger,
    Bow,
}

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Debug)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

impl Rarity {
    pub fn label(&self) -> &'static str {
        match self {
            Rarity::Common => "Common",
            Rarity::Uncommon => "Uncommon",
            Rarity::Rare => "Rare",
            Rarity::Epic => "Epic",
            Rarity::Legendary => "Legendary",
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ItemStats {
    pub attack: i32,
    pub defense: i32,
    pub hp_bonus: i32,
    pub mp_bonus: i32,
    pub str_bonus: i32,
    pub dex_bonus: i32,
    pub int_bonus: i32,
    pub vit_bonus: i32,
    pub luk_bonus: i32,
}

impl Default for ItemStats {
    fn default() -> Self {
        ItemStats {
            attack: 0,
            defense: 0,
            hp_bonus: 0,
            mp_bonus: 0,
            str_bonus: 0,
            dex_bonus: 0,
            int_bonus: 0,
            vit_bonus: 0,
            luk_bonus: 0,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum ConsumableEffect {
    HealHp(i32),
    HealMp(i32),
    TempStrBoost(i32, u32),
    TempDefBoost(i32, u32),
    IdentifyItem,
    Teleport,
    RevealMap,
    PoisonResist(u32),
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Item {
    pub id: u64,
    pub name: String,
    pub kind: ItemKind,
    pub rarity: Rarity,
    pub stats: ItemStats,
    pub consumable_effect: Option<ConsumableEffect>,
    pub material_type: Option<String>,
    pub skill_tome_id: Option<usize>,
    pub enchant_level: u8,
    pub description: String,
    pub value: u32,
}

impl Item {
    pub fn char(&self) -> char {
        match self.kind {
            ItemKind::Weapon => '/',
            ItemKind::Armor => '[',
            ItemKind::Helmet => '^',
            ItemKind::Boots => 'b',
            ItemKind::Ring => 'o',
            ItemKind::Amulet => '"',
            ItemKind::Consumable => '!',
            ItemKind::Material => '*',
            ItemKind::SkillTome => '?',
        }
    }

    pub fn is_equippable(&self) -> bool {
        matches!(
            self.kind,
            ItemKind::Weapon
                | ItemKind::Armor
                | ItemKind::Helmet
                | ItemKind::Boots
                | ItemKind::Ring
                | ItemKind::Amulet
        )
    }
}

static mut ITEM_ID_COUNTER: u64 = 0;
fn next_item_id() -> u64 {
    unsafe {
        ITEM_ID_COUNTER += 1;
        ITEM_ID_COUNTER
    }
}

pub fn generate_weapon<R: Rng>(rng: &mut R, floor: u32) -> Item {
    let power = floor as i32;
    let rarity = roll_rarity(rng, floor);
    let (wtype, base_name) = match rng.gen_range(0..5) {
        0 => (WeaponType::Sword, "Sword"),
        1 => (WeaponType::Axe, "Axe"),
        2 => (WeaponType::Staff, "Staff"),
        3 => (WeaponType::Dagger, "Dagger"),
        _ => (WeaponType::Bow, "Bow"),
    };

    let base_atk = match wtype {
        WeaponType::Sword => 4,
        WeaponType::Axe => 6,
        WeaponType::Staff => 2,
        WeaponType::Dagger => 3,
        WeaponType::Bow => 4,
    };

    let rarity_mult = rarity_multiplier(&rarity);
    let atk = ((base_atk + power / 2) as f32 * rarity_mult) as i32 + rng.gen_range(0..3);
    let int_bonus = if matches!(wtype, WeaponType::Staff) { atk / 2 } else { 0 };

    let prefix = rarity_prefix(&rarity, rng);
    let name = format!("{} {}", prefix, base_name);

    Item {
        id: next_item_id(),
        name,
        kind: ItemKind::Weapon,
        rarity: rarity.clone(),
        stats: ItemStats {
            attack: atk,
            int_bonus,
            ..Default::default()
        },
        consumable_effect: None,
        material_type: None,
        skill_tome_id: None,
        enchant_level: 0,
        description: format!("A {} weapon.", rarity.label().to_lowercase()),
        value: ((atk * 10) as f32 * rarity_mult) as u32,
    }
}

pub fn generate_armor<R: Rng>(rng: &mut R, floor: u32) -> Item {
    let power = floor as i32;
    let rarity = roll_rarity(rng, floor);
    let (kind, base_name, base_def) = match rng.gen_range(0..4) {
        0 => (ItemKind::Armor, "Armor", 5),
        1 => (ItemKind::Helmet, "Helmet", 2),
        2 => (ItemKind::Boots, "Boots", 1),
        _ => (ItemKind::Ring, "Ring", 0),
    };

    let rarity_mult = rarity_multiplier(&rarity);
    let def = ((base_def + power / 3) as f32 * rarity_mult) as i32 + rng.gen_range(0..2);
    let hp_bonus = if matches!(kind, ItemKind::Armor) { def * 5 } else { 0 };
    let prefix = rarity_prefix(&rarity, rng);
    let name = format!("{} {}", prefix, base_name);

    Item {
        id: next_item_id(),
        name,
        kind,
        rarity: rarity.clone(),
        stats: ItemStats {
            defense: def,
            hp_bonus,
            ..Default::default()
        },
        consumable_effect: None,
        material_type: None,
        skill_tome_id: None,
        enchant_level: 0,
        description: format!("A {} piece of protection.", rarity.label().to_lowercase()),
        value: ((def * 8) as f32 * rarity_mult) as u32,
    }
}

pub fn generate_consumable<R: Rng>(rng: &mut R, floor: u32) -> Item {
    let power = floor as i32;
    let (name, effect, desc, value) = match rng.gen_range(0..6) {
        0 => {
            let heal = 20 + power * 5;
            ("HP Potion".to_string(), ConsumableEffect::HealHp(heal), "Restores HP.".to_string(), 50)
        }
        1 => {
            let heal = 10 + power * 3;
            ("MP Potion".to_string(), ConsumableEffect::HealMp(heal), "Restores MP.".to_string(), 40)
        }
        2 => {
            let boost = 5 + power;
            ("Strength Tonic".to_string(), ConsumableEffect::TempStrBoost(boost, 10), "Temporarily boosts STR.".to_string(), 80)
        }
        3 => {
            let boost = 5 + power;
            ("Iron Skin Potion".to_string(), ConsumableEffect::TempDefBoost(boost, 10), "Temporarily boosts DEF.".to_string(), 80)
        }
        4 => {
            ("Scroll of Teleport".to_string(), ConsumableEffect::Teleport, "Teleports you to a random location.".to_string(), 100)
        }
        _ => {
            ("Map Scroll".to_string(), ConsumableEffect::RevealMap, "Reveals the entire floor map.".to_string(), 120)
        }
    };

    Item {
        id: next_item_id(),
        name,
        kind: ItemKind::Consumable,
        rarity: Rarity::Common,
        stats: Default::default(),
        consumable_effect: Some(effect),
        material_type: None,
        skill_tome_id: None,
        enchant_level: 0,
        description: desc,
        value: value as u32,
    }
}

pub fn generate_material<R: Rng>(rng: &mut R) -> Item {
    let (mat_type, name, desc, value) = match rng.gen_range(0..8) {
        0 => ("iron_ore", "Iron Ore", "Used in crafting metal equipment.", 20),
        1 => ("magic_crystal", "Magic Crystal", "Imbued with arcane energy.", 50),
        2 => ("leather_hide", "Leather Hide", "Sturdy animal hide.", 15),
        3 => ("mythril_shard", "Mythril Shard", "A rare lightweight metal.", 100),
        4 => ("dragon_scale", "Dragon Scale", "Scales from a dragon. Extremely tough.", 200),
        5 => ("soul_essence", "Soul Essence", "The distilled essence of a defeated foe.", 80),
        6 => ("ancient_bone", "Ancient Bone", "Bone of something old and powerful.", 60),
        _ => ("enchant_dust", "Enchant Dust", "Used to enhance equipment.", 40),
    };

    Item {
        id: next_item_id(),
        name: name.to_string(),
        kind: ItemKind::Material,
        rarity: Rarity::Common,
        stats: Default::default(),
        consumable_effect: None,
        material_type: Some(mat_type.to_string()),
        skill_tome_id: None,
        enchant_level: 0,
        description: desc.to_string(),
        value: value as u32,
    }
}

pub fn generate_skill_tome<R: Rng>(rng: &mut R, skill_id: usize) -> Item {
    Item {
        id: next_item_id(),
        name: format!("Skill Tome #{}", skill_id),
        kind: ItemKind::SkillTome,
        rarity: Rarity::Rare,
        stats: Default::default(),
        consumable_effect: None,
        material_type: None,
        skill_tome_id: Some(skill_id),
        enchant_level: 0,
        description: "A tome containing the knowledge of a new skill.".to_string(),
        value: 300,
    }
}

pub fn generate_floor_item<R: Rng>(rng: &mut R, floor: u32) -> Item {
    let roll = rng.gen_range(0..10);
    match roll {
        0..=2 => generate_weapon(rng, floor),
        3..=5 => generate_armor(rng, floor),
        6..=7 => generate_consumable(rng, floor),
        8 => generate_material(rng),
        _ => {
            let skill_id = rng.gen_range(0..15);
            generate_skill_tome(rng, skill_id)
        }
    }
}

fn roll_rarity<R: Rng>(rng: &mut R, floor: u32) -> Rarity {
    let bonus = floor.min(20) as u32;
    let roll = rng.gen_range(0..100u32);
    if roll < 50 {
        Rarity::Common
    } else if roll < 75 {
        Rarity::Uncommon
    } else if roll < 88 + bonus / 5 {
        Rarity::Rare
    } else if roll < 96 + bonus / 3 {
        Rarity::Epic
    } else {
        Rarity::Legendary
    }
}

fn rarity_multiplier(r: &Rarity) -> f32 {
    match r {
        Rarity::Common => 1.0,
        Rarity::Uncommon => 1.3,
        Rarity::Rare => 1.7,
        Rarity::Epic => 2.2,
        Rarity::Legendary => 3.0,
    }
}

fn rarity_prefix<R: Rng>(r: &Rarity, rng: &mut R) -> &'static str {
    match r {
        Rarity::Common => {
            let opts = ["Old", "Worn", "Basic", "Simple"];
            opts[rng.gen_range(0..opts.len())]
        }
        Rarity::Uncommon => {
            let opts = ["Iron", "Steel", "Keen", "Sturdy"];
            opts[rng.gen_range(0..opts.len())]
        }
        Rarity::Rare => {
            let opts = ["Arcane", "Tempered", "Blessed", "Shadow"];
            opts[rng.gen_range(0..opts.len())]
        }
        Rarity::Epic => {
            let opts = ["Mythril", "Soulbound", "Ancient", "Radiant"];
            opts[rng.gen_range(0..opts.len())]
        }
        Rarity::Legendary => {
            let opts = ["Dragon", "Divine", "Void", "Eternal"];
            opts[rng.gen_range(0..opts.len())]
        }
    }
}

pub struct CraftingRecipe {
    pub name: &'static str,
    pub ingredients: &'static [(&'static str, u32)],
    pub result_description: &'static str,
}

pub const CRAFTING_RECIPES: &[CraftingRecipe] = &[
    CraftingRecipe {
        name: "Iron Sword",
        ingredients: &[("iron_ore", 3), ("leather_hide", 1)],
        result_description: "A reliable iron sword.",
    },
    CraftingRecipe {
        name: "Mythril Armor",
        ingredients: &[("mythril_shard", 3), ("leather_hide", 2)],
        result_description: "Light but strong mythril armor.",
    },
    CraftingRecipe {
        name: "Arcane Staff",
        ingredients: &[("magic_crystal", 3), ("ancient_bone", 1)],
        result_description: "A staff crackling with magic.",
    },
    CraftingRecipe {
        name: "Dragon Scale Armor",
        ingredients: &[("dragon_scale", 4), ("mythril_shard", 2)],
        result_description: "Nigh-impenetrable dragon scale armor.",
    },
    CraftingRecipe {
        name: "Soul Weapon",
        ingredients: &[("soul_essence", 5), ("iron_ore", 2)],
        result_description: "A weapon imbued with fallen souls.",
    },
    CraftingRecipe {
        name: "Enchant Weapon",
        ingredients: &[("enchant_dust", 3)],
        result_description: "Enhance a weapon with magic dust.",
    },
    CraftingRecipe {
        name: "Mega HP Potion",
        ingredients: &[("magic_crystal", 1), ("leather_hide", 1)],
        result_description: "A powerful healing potion.",
    },
];

pub fn try_craft<R: Rng>(
    recipe: &CraftingRecipe,
    inventory: &mut Vec<Item>,
    floor: u32,
    rng: &mut R,
) -> Option<Item> {
    // Check if we have all ingredients
    let mut to_remove: Vec<usize> = Vec::new();
    for (mat_type, count) in recipe.ingredients {
        let mut found = 0u32;
        for (i, item) in inventory.iter().enumerate() {
            if item.material_type.as_deref() == Some(mat_type) {
                to_remove.push(i);
                found += 1;
                if found >= *count {
                    break;
                }
            }
        }
        if found < *count {
            return None;
        }
    }

    // Remove in reverse order
    to_remove.sort_unstable();
    to_remove.dedup();
    for i in to_remove.into_iter().rev() {
        inventory.remove(i);
    }

    // Generate result
    let item = match recipe.name {
        "Iron Sword" => {
            let mut w = generate_weapon(rng, floor);
            w.name = "Iron Sword".to_string();
            w.stats.attack += 5;
            w.rarity = Rarity::Uncommon;
            w
        }
        "Mythril Armor" => {
            let mut a = generate_armor(rng, floor);
            a.name = "Mythril Armor".to_string();
            a.kind = ItemKind::Armor;
            a.stats.defense += 8;
            a.stats.hp_bonus += 30;
            a.rarity = Rarity::Rare;
            a
        }
        "Arcane Staff" => {
            let mut s = generate_weapon(rng, floor);
            s.name = "Arcane Staff".to_string();
            s.stats.attack += 3;
            s.stats.int_bonus += 15;
            s.stats.mp_bonus += 30;
            s.rarity = Rarity::Rare;
            s
        }
        "Dragon Scale Armor" => {
            let mut a = generate_armor(rng, floor);
            a.name = "Dragon Scale Armor".to_string();
            a.kind = ItemKind::Armor;
            a.stats.defense += 25;
            a.stats.hp_bonus += 80;
            a.rarity = Rarity::Legendary;
            a
        }
        "Soul Weapon" => {
            let mut w = generate_weapon(rng, floor);
            w.name = "Soul Blade".to_string();
            w.stats.attack += 20;
            w.stats.str_bonus += 5;
            w.rarity = Rarity::Epic;
            w
        }
        "Mega HP Potion" => {
            let heal = 100 + floor as i32 * 10;
            Item {
                id: next_item_id(),
                name: "Mega HP Potion".to_string(),
                kind: ItemKind::Consumable,
                rarity: Rarity::Uncommon,
                stats: Default::default(),
                consumable_effect: Some(ConsumableEffect::HealHp(heal)),
                material_type: None,
                skill_tome_id: None,
                enchant_level: 0,
                description: "A potent healing potion.".to_string(),
                value: 200,
            }
        }
        _ => generate_consumable(rng, floor),
    };

    Some(item)
}
