use bracket_lib::prelude::*;
use crate::player::Player;
use crate::map::{Map, TileType};
use crate::monster::Monster;
use crate::items::ItemKind;
use crate::skills::Skill;
use crate::classes::Class;

pub const PANEL_HEIGHT: i32 = 12;
pub const MAP_RENDER_WIDTH: i32 = 60;
pub const MAP_RENDER_HEIGHT: i32 = 38;
pub const SCREEN_WIDTH: i32 = 80;
pub const SCREEN_HEIGHT: i32 = 50;

pub fn render_map(ctx: &mut BTerm, map: &Map, player: &Player, monsters: &[Monster]) {
    for y in 0..MAP_RENDER_HEIGHT {
        for x in 0..MAP_RENDER_WIDTH {
            if !map.in_bounds(x, y) {
                continue;
            }
            let tile = map.tile_at(x, y);
            if tile.is_visible {
                match tile.tile_type {
                    TileType::Floor => {
                        ctx.set(x, y, RGB::named(GRAY40), RGB::named(BLACK), '.' as u16);
                    }
                    TileType::Wall => {
                        ctx.set(x, y, RGB::named(DARK_CYAN), RGB::named(BLACK), '#' as u16);
                    }
                    TileType::StairsDown => {
                        ctx.set(x, y, RGB::named(YELLOW), RGB::named(BLACK), '>' as u16);
                    }
                }
            } else if tile.is_revealed {
                match tile.tile_type {
                    TileType::Floor => {
                        ctx.set(x, y, RGB::from_u8(40, 40, 40), RGB::named(BLACK), '.' as u16);
                    }
                    TileType::Wall => {
                        ctx.set(x, y, RGB::from_u8(50, 70, 70), RGB::named(BLACK), '#' as u16);
                    }
                    TileType::StairsDown => {
                        ctx.set(x, y, RGB::from_u8(100, 100, 0), RGB::named(BLACK), '>' as u16);
                    }
                }
            }
        }
    }

    // Draw monsters
    for monster in monsters {
        if !monster.is_alive {
            continue;
        }
        let mx = monster.x;
        let my = monster.y;
        if map.in_bounds(mx, my) && map.tile_at(mx, my).is_visible {
            let (r, g, b) = monster.kind.color();
            ctx.set(mx, my, RGB::from_u8(r, g, b), RGB::named(BLACK), monster.kind.symbol() as u16);
        }
    }

    // Draw player
    let (pr, pg, pb) = player.class.color();
    ctx.set(player.x, player.y, RGB::from_u8(pr, pg, pb), RGB::named(BLACK), '@' as u16);
}

pub fn render_hud(ctx: &mut BTerm, player: &Player, messages: &[String]) {
    let panel_y = MAP_RENDER_HEIGHT;

    // Background bar
    ctx.draw_box(
        0, panel_y,
        SCREEN_WIDTH - 1, PANEL_HEIGHT - 1,
        RGB::named(WHITE),
        RGB::named(BLACK),
    );

    // Stats line
    ctx.print_color(
        1, panel_y + 1,
        RGB::named(YELLOW), RGB::named(BLACK),
        &format!(
            "{} Lv.{} | Floor {}",
            player.class.name(), player.level, player.floor_number
        ),
    );

    // HP bar
    let hp_pct = (player.hp as f32 / player.max_hp as f32).max(0.0).min(1.0);
    let hp_color = if hp_pct > 0.5 { RGB::named(GREEN) } else if hp_pct > 0.25 { RGB::named(YELLOW) } else { RGB::named(RED) };
    ctx.print_color(1, panel_y + 2, RGB::named(WHITE), RGB::named(BLACK), "HP:");
    draw_bar(ctx, 4, panel_y + 2, 20, hp_pct, hp_color);
    ctx.print_color(25, panel_y + 2, RGB::named(WHITE), RGB::named(BLACK),
        &format!("{}/{}", player.hp, player.max_hp));

    // MP bar
    let mp_pct = if player.max_mp > 0 { (player.mp as f32 / player.max_mp as f32).max(0.0).min(1.0) } else { 0.0 };
    ctx.print_color(1, panel_y + 3, RGB::named(WHITE), RGB::named(BLACK), "MP:");
    draw_bar(ctx, 4, panel_y + 3, 20, mp_pct, RGB::named(BLUE));
    ctx.print_color(25, panel_y + 3, RGB::named(WHITE), RGB::named(BLACK),
        &format!("{}/{}", player.mp, player.max_mp));

    // XP bar
    let xp_pct = (player.experience as f32 / player.exp_to_next as f32).max(0.0).min(1.0);
    ctx.print_color(1, panel_y + 4, RGB::named(WHITE), RGB::named(BLACK), "XP:");
    draw_bar(ctx, 4, panel_y + 4, 20, xp_pct, RGB::named(MAGENTA));
    ctx.print_color(25, panel_y + 4, RGB::named(WHITE), RGB::named(BLACK),
        &format!("{}/{}", player.experience, player.exp_to_next));

    // Status effects
    let status_str: Vec<&str> = player.status_effects.iter().map(|e| e.name()).collect();
    if !status_str.is_empty() {
        ctx.print_color(1, panel_y + 5, RGB::named(ORANGE), RGB::named(BLACK),
            &format!("Status: {}", status_str.join(", ")));
    }

    // Gold
    ctx.print_color(36, panel_y + 1, RGB::named(YELLOW), RGB::named(BLACK),
        &format!("Gold: {}", player.gold));

    // Stats column
    ctx.print_color(36, panel_y + 2, RGB::named(WHITE), RGB::named(BLACK),
        &format!("STR:{} DEX:{} INT:{} DEF:{}",
            player.effective_strength(),
            player.effective_dexterity(),
            player.effective_intelligence(),
            player.effective_defense()));

    // Controls hint
    ctx.print_color(36, panel_y + 3, RGB::named(GRAY50), RGB::named(BLACK),
        "[WASD/Arrows] Move  [>] Stairs");
    ctx.print_color(36, panel_y + 4, RGB::named(GRAY50), RGB::named(BLACK),
        "[I] Inventory  [S] Skills  [C] Stats");

    // Message log
    let log_start_y = panel_y + 6;
    ctx.print_color(1, log_start_y - 1, RGB::named(CYAN), RGB::named(BLACK), "-- Messages --");
    let display_count = 5.min(messages.len());
    let start_idx = if messages.len() > display_count { messages.len() - display_count } else { 0 };
    for (i, msg) in messages[start_idx..].iter().enumerate() {
        let fade = if i == display_count.saturating_sub(1) { 255u8 } else { (200 - i as u8 * 30).max(80) };
        ctx.print_color(
            1, log_start_y + i as i32,
            RGB::from_u8(fade, fade, fade), RGB::named(BLACK),
            msg,
        );
    }
}

fn draw_bar(ctx: &mut BTerm, x: i32, y: i32, width: i32, pct: f32, color: RGB) {
    let filled = (width as f32 * pct) as i32;
    for i in 0..width {
        if i < filled {
            ctx.set(x + i, y, color, RGB::named(BLACK), 219u16);
        } else {
            ctx.set(x + i, y, RGB::from_u8(50, 50, 50), RGB::named(BLACK), 176u16);
        }
    }
}

pub fn render_inventory(ctx: &mut BTerm, player: &Player) {
    ctx.cls();
    ctx.draw_box(0, 0, 79, 49, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(2, 0, RGB::named(YELLOW), RGB::named(BLACK), " INVENTORY ");
    ctx.print_color(2, 1, RGB::named(CYAN), RGB::named(BLACK), "[ESC] Close  [E] Equip/Use  [D] Drop");

    // Equipment slots
    ctx.print_color(2, 3, RGB::named(WHITE), RGB::named(BLACK), "-- Equipment --");
    let weapon_str = player.equipment.weapon.as_ref().map(|w| w.name.clone()).unwrap_or_else(|| "None".to_string());
    let armor_str = player.equipment.armor.as_ref().map(|a| a.name.clone()).unwrap_or_else(|| "None".to_string());
    let ring_str = player.equipment.ring.as_ref().map(|r| r.name.clone()).unwrap_or_else(|| "None".to_string());

    ctx.print_color(2, 4, RGB::named(WHITE), RGB::named(BLACK), &format!("Weapon: {}", weapon_str));
    ctx.print_color(2, 5, RGB::named(WHITE), RGB::named(BLACK), &format!("Armor:  {}", armor_str));
    ctx.print_color(2, 6, RGB::named(WHITE), RGB::named(BLACK), &format!("Ring:   {}", ring_str));

    // Inventory items
    ctx.print_color(2, 8, RGB::named(WHITE), RGB::named(BLACK), "-- Items --");

    if player.inventory.is_empty() {
        ctx.print_color(2, 9, RGB::named(GRAY50), RGB::named(BLACK), "(empty)");
    }

    for (i, item) in player.inventory.iter().enumerate() {
        let line_y = 9 + i as i32;
        if line_y >= 48 {
            break;
        }
        let (r, g, b) = item.rarity.color();
        let key_str = if i < 9 { format!("{})", i + 1) } else { format!("{})", i + 1) };
        ctx.print_color(2, line_y, RGB::named(WHITE), RGB::named(BLACK), &key_str);
        ctx.print_color(5, line_y, RGB::from_u8(r, g, b), RGB::named(BLACK),
            &format!("{} {} - {}", item.symbol, item.name, item.description()));
    }

    ctx.print_color(2, 47, RGB::named(GRAY50), RGB::named(BLACK),
        &format!("Items: {}/20  Gold: {}", player.inventory.len(), player.gold));
}

pub fn render_skills(ctx: &mut BTerm, player: &Player) {
    ctx.cls();
    ctx.draw_box(0, 0, 79, 49, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(2, 0, RGB::named(YELLOW), RGB::named(BLACK), " SKILLS ");
    ctx.print_color(2, 1, RGB::named(CYAN), RGB::named(BLACK), "[ESC] Close");
    ctx.print_color(2, 2, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Skill Points: {}  Class: {}", player.skill_points, player.class.name()));

    let all_class_skills = Skill::get_class_skills(&player.class);
    ctx.print_color(2, 4, RGB::named(WHITE), RGB::named(BLACK), "-- Class Skills --");

    for (i, skill) in all_class_skills.iter().enumerate() {
        let line_y = 5 + i as i32 * 3;
        if line_y >= 47 {
            break;
        }

        let learned = player.has_skill(skill.id);
        let available = skill.min_level <= player.level;

        let name_color = if learned {
            RGB::named(GREEN)
        } else if available {
            RGB::named(YELLOW)
        } else {
            RGB::named(GRAY50)
        };

        let status = if learned { "[Learned]" } else if available { "[Available]" } else { "[Locked]" };
        ctx.print_color(2, line_y, name_color, RGB::named(BLACK),
            &format!("{}) {} {} - MP:{}", i + 1, skill.name, status, skill.mp_cost));
        ctx.print_color(4, line_y + 1, RGB::from_u8(180, 180, 180), RGB::named(BLACK),
            &format!("Lv.{} required: {}", skill.min_level, skill.description));

        if player.skill_points > 0 && available && !learned {
            ctx.print_color(4, line_y + 1, RGB::named(CYAN), RGB::named(BLACK),
                &format!("[Press {}] to learn this skill", i + 1));
        }
    }
}

pub fn render_character_stats(ctx: &mut BTerm, player: &Player) {
    ctx.cls();
    ctx.draw_box(0, 0, 79, 49, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(2, 0, RGB::named(YELLOW), RGB::named(BLACK), " CHARACTER STATS ");
    ctx.print_color(2, 1, RGB::named(CYAN), RGB::named(BLACK), "[ESC] Close");

    let (r, g, b) = player.class.color();
    ctx.print_color(2, 3, RGB::from_u8(r, g, b), RGB::named(BLACK),
        &format!("Class: {}", player.class.name()));
    ctx.print_color(2, 4, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Level: {}  (Kills: {}  Floors: {})", player.level, player.total_kills, player.floors_descended));
    ctx.print_color(2, 5, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Experience: {}/{}", player.experience, player.exp_to_next));
    ctx.print_color(2, 6, RGB::named(YELLOW), RGB::named(BLACK),
        &format!("Gold: {}", player.gold));

    ctx.print_color(2, 8, RGB::named(CYAN), RGB::named(BLACK), "-- Base Stats --");
    ctx.print_color(2, 9, RGB::named(WHITE), RGB::named(BLACK),
        &format!("HP:           {}/{}", player.hp, player.max_hp));
    ctx.print_color(2, 10, RGB::named(WHITE), RGB::named(BLACK),
        &format!("MP:           {}/{}", player.mp, player.max_mp));
    ctx.print_color(2, 11, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Strength:     {} (base: {})", player.effective_strength(), player.base_strength));
    ctx.print_color(2, 12, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Dexterity:    {} (base: {})", player.effective_dexterity(), player.base_dexterity));
    ctx.print_color(2, 13, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Intelligence: {} (base: {})", player.effective_intelligence(), player.base_intelligence));
    ctx.print_color(2, 14, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Defense:      {} (base: {})", player.effective_defense(), player.base_defense));

    ctx.print_color(2, 16, RGB::named(CYAN), RGB::named(BLACK), "-- Equipment Bonuses --");
    ctx.print_color(2, 17, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Attack Bonus: +{}", player.weapon_attack_bonus()));
    ctx.print_color(2, 18, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Magic Bonus:  +{}", player.weapon_magic_bonus()));
    ctx.print_color(2, 19, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Defense Bonus:+{}", player.equipment.defense_bonus()));
    ctx.print_color(2, 20, RGB::named(WHITE), RGB::named(BLACK),
        &format!("HP Bonus:     +{}", player.equipment.hp_bonus()));

    ctx.print_color(2, 22, RGB::named(CYAN), RGB::named(BLACK), "-- Status Effects --");
    if player.status_effects.is_empty() {
        ctx.print_color(2, 23, RGB::named(GRAY50), RGB::named(BLACK), "None");
    } else {
        for (i, eff) in player.status_effects.iter().enumerate() {
            ctx.print_color(2, 23 + i as i32, RGB::named(ORANGE), RGB::named(BLACK), eff.name());
        }
    }

    // Skill summary
    let start_y = 26;
    ctx.print_color(2, start_y, RGB::named(CYAN), RGB::named(BLACK), "-- Learned Skills --");
    let learned: Vec<_> = Skill::get_class_skills(&player.class)
        .into_iter()
        .filter(|s| player.has_skill(s.id))
        .collect();

    if learned.is_empty() {
        ctx.print_color(2, start_y + 1, RGB::named(GRAY50), RGB::named(BLACK), "None");
    } else {
        for (i, s) in learned.iter().enumerate() {
            ctx.print_color(2, start_y + 1 + i as i32, RGB::named(GREEN), RGB::named(BLACK),
                &format!("{} (MP:{})", s.name, s.mp_cost));
        }
    }
}

pub fn render_battle_ui(
    ctx: &mut BTerm,
    player: &Player,
    monster: &Monster,
    messages: &[String],
    selected_action: usize,
) {
    ctx.cls();

    // Title
    ctx.draw_box(0, 0, 79, 49, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(30, 0, RGB::named(YELLOW), RGB::named(BLACK), " BATTLE! ");

    // Monster info
    ctx.draw_box(1, 1, 38, 12, RGB::named(WHITE), RGB::named(BLACK));
    let (mr, mg, mb) = monster.kind.color();
    ctx.print_color(3, 2, RGB::from_u8(mr, mg, mb), RGB::named(BLACK),
        &format!("{} {}", monster.kind.symbol(), monster.kind.name()));

    let m_hp_pct = (monster.hp as f32 / monster.max_hp as f32).max(0.0);
    let m_hp_color = if m_hp_pct > 0.5 { RGB::named(GREEN) } else if m_hp_pct > 0.25 { RGB::named(YELLOW) } else { RGB::named(RED) };
    ctx.print_color(3, 3, RGB::named(WHITE), RGB::named(BLACK), "HP:");
    draw_bar(ctx, 6, 3, 25, m_hp_pct, m_hp_color);
    ctx.print_color(32, 3, RGB::named(WHITE), RGB::named(BLACK),
        &format!("{}/{}", monster.hp, monster.max_hp));

    ctx.print_color(3, 4, RGB::named(WHITE), RGB::named(BLACK),
        &format!("STR:{} DEX:{} DEF:{}", monster.strength, monster.dexterity, monster.defense));

    if !monster.status_effects.is_empty() {
        let statuses: Vec<&str> = monster.status_effects.iter().map(|e| e.name()).collect();
        ctx.print_color(3, 5, RGB::named(ORANGE), RGB::named(BLACK),
            &format!("Status: {}", statuses.join(", ")));
    }

    // Player info
    ctx.draw_box(40, 1, 38, 12, RGB::named(WHITE), RGB::named(BLACK));
    let (pr, pg, pb) = player.class.color();
    ctx.print_color(42, 2, RGB::from_u8(pr, pg, pb), RGB::named(BLACK),
        &format!("@ {} Lv.{}", player.class.name(), player.level));

    let p_hp_pct = (player.hp as f32 / player.max_hp as f32).max(0.0);
    let p_hp_color = if p_hp_pct > 0.5 { RGB::named(GREEN) } else if p_hp_pct > 0.25 { RGB::named(YELLOW) } else { RGB::named(RED) };
    ctx.print_color(42, 3, RGB::named(WHITE), RGB::named(BLACK), "HP:");
    draw_bar(ctx, 45, 3, 25, p_hp_pct, p_hp_color);
    ctx.print_color(71, 3, RGB::named(WHITE), RGB::named(BLACK),
        &format!("{}/{}", player.hp, player.max_hp));

    let p_mp_pct = if player.max_mp > 0 { (player.mp as f32 / player.max_mp as f32).max(0.0) } else { 0.0 };
    ctx.print_color(42, 4, RGB::named(WHITE), RGB::named(BLACK), "MP:");
    draw_bar(ctx, 45, 4, 25, p_mp_pct, RGB::named(BLUE));
    ctx.print_color(71, 4, RGB::named(WHITE), RGB::named(BLACK),
        &format!("{}/{}", player.mp, player.max_mp));

    // Battle actions
    ctx.draw_box(1, 14, 38, 10, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(3, 14, RGB::named(CYAN), RGB::named(BLACK), " Actions ");

    let actions = ["[1] Attack", "[2] Skills", "[3] Items", "[4] Flee"];
    for (i, action) in actions.iter().enumerate() {
        let color = if i == selected_action { RGB::named(YELLOW) } else { RGB::named(WHITE) };
        ctx.print_color(3, 15 + i as i32, color, RGB::named(BLACK), action);
    }

    // Message log
    ctx.draw_box(40, 14, 38, 10, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(42, 14, RGB::named(CYAN), RGB::named(BLACK), " Log ");

    let msg_display = 8.min(messages.len());
    let msg_start = if messages.len() > msg_display { messages.len() - msg_display } else { 0 };
    for (i, msg) in messages[msg_start..].iter().enumerate() {
        let fade = (255 - i as u8 * 25).max(100);
        ctx.print_color(42, 15 + i as i32, RGB::from_u8(fade, fade, fade), RGB::named(BLACK), msg);
    }
}

pub fn render_skill_select(ctx: &mut BTerm, player: &Player, selected: usize) {
    let skills: Vec<_> = Skill::get_class_skills(&player.class)
        .into_iter()
        .filter(|s| player.has_skill(s.id))
        .collect();

    ctx.draw_box(5, 25, 60, 15, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(7, 25, RGB::named(YELLOW), RGB::named(BLACK), " Select Skill (ESC to cancel) ");

    if skills.is_empty() {
        ctx.print_color(7, 27, RGB::named(GRAY50), RGB::named(BLACK), "No skills learned yet!");
        return;
    }

    for (i, skill) in skills.iter().enumerate() {
        let has_mp = player.mp >= skill.mp_cost;
        let color = if i == selected {
            if has_mp { RGB::named(YELLOW) } else { RGB::named(RED) }
        } else {
            if has_mp { RGB::named(WHITE) } else { RGB::named(GRAY50) }
        };
        ctx.print_color(7, 27 + i as i32, color, RGB::named(BLACK),
            &format!("[{}] {} (MP:{}) - {}", i + 1, skill.name, skill.mp_cost, skill.description));
    }
}

pub fn render_item_select(ctx: &mut BTerm, player: &Player, selected: usize) {
    let usable: Vec<_> = player.inventory.iter().enumerate()
        .filter(|(_, item)| {
            matches!(item.kind,
                ItemKind::Potion { .. } | ItemKind::Scroll { .. })
        })
        .collect();

    ctx.draw_box(5, 25, 60, 15, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(7, 25, RGB::named(YELLOW), RGB::named(BLACK), " Use Item (ESC to cancel) ");

    if usable.is_empty() {
        ctx.print_color(7, 27, RGB::named(GRAY50), RGB::named(BLACK), "No usable items!");
        return;
    }

    for (i, (_, item)) in usable.iter().enumerate() {
        let color = if i == selected { RGB::named(YELLOW) } else { RGB::named(WHITE) };
        ctx.print_color(7, 27 + i as i32, color, RGB::named(BLACK),
            &format!("[{}] {} - {}", i + 1, item.name, item.description()));
    }
}

pub fn render_main_menu(ctx: &mut BTerm) {
    ctx.cls();

    let title_lines = [
        r" ____  ___  ___  _   _ _     ___ _  _____ ",
        r"|  _ \/ _ \/ __|| | | | |   |_ _| |/ /__ \",
        r"| |_) | | | |   | | | | |    | || ' /  / /",
        r"|  _ <| |_| |_  | |_| | |___ | || . \ / / ",
        r"|_| \_\\___/\___| \___/|_____|___|_|\_/_/  ",
    ];

    for (i, line) in title_lines.iter().enumerate() {
        ctx.print_color(
            5, 5 + i as i32,
            RGB::named(YELLOW), RGB::named(BLACK),
            line,
        );
    }

    ctx.print_color(20, 12, RGB::named(RED), RGB::named(BLACK), "A Roguelike Adventure");

    ctx.print_color(25, 16, RGB::named(WHITE), RGB::named(BLACK), "[Enter] New Game");
    ctx.print_color(25, 18, RGB::named(WHITE), RGB::named(BLACK), "[Q] Quit");

    ctx.print_color(10, 22, RGB::named(GRAY50), RGB::named(BLACK),
        "Navigate with WASD or Arrow Keys. Permadeath - no second chances!");
    ctx.print_color(10, 23, RGB::named(GRAY50), RGB::named(BLACK),
        "Descend 15 floors and defeat the final boss to win!");
}

pub fn render_class_select(ctx: &mut BTerm, selected: usize) {
    ctx.cls();
    ctx.draw_box(0, 0, 79, 49, RGB::named(WHITE), RGB::named(BLACK));
    ctx.print_color(25, 1, RGB::named(YELLOW), RGB::named(BLACK), "Choose Your Class");
    ctx.print_color(20, 2, RGB::named(GRAY50), RGB::named(BLACK),
        "Use [1][2][3] to select, [Enter] to confirm");

    let classes = [Class::Warrior, Class::Mage, Class::Rogue];
    let descriptions = [
        (
            "Warrior",
            &[
                "HP: 40  MP: 10",
                "STR: 8  DEX: 4  INT: 2  DEF: 5",
                "",
                "The Warrior excels at melee combat",
                "with powerful physical attacks and",
                "high defense. Uses battle cries and",
                "berserker rage to overwhelm enemies.",
                "",
                "Skills: Slash, Shield Bash,",
                "        War Cry, Berserker",
            ] as &[&str]
        ),
        (
            "Mage",
            &[
                "HP: 20  MP: 40",
                "STR: 2  DEX: 4  INT: 10  DEF: 1",
                "",
                "The Mage commands powerful arcane",
                "forces to devastate enemies from",
                "afar. Fragile but immensely",
                "destructive when at range.",
                "",
                "Skills: Fireball, Ice Shard,",
                "        Thunder, Arcane Blast",
            ] as &[&str]
        ),
        (
            "Rogue",
            &[
                "HP: 28  MP: 20",
                "STR: 5  DEX: 9  INT: 4  DEF: 3",
                "",
                "The Rogue relies on cunning and",
                "speed to outmaneuver foes. High",
                "critical hit chance and poison",
                "make them deadly assassins.",
                "",
                "Skills: Backstab, Poison Strike,",
                "        Shadow Step, Death Mark",
            ] as &[&str]
        ),
    ];

    for (i, (class, desc)) in descriptions.iter().enumerate() {
        let box_x = 2 + i as i32 * 26;
        let box_w = 24;
        let box_y = 5;
        let box_h = 30;

        let border_color = if i == selected { RGB::named(YELLOW) } else { RGB::named(WHITE) };
        ctx.draw_box(box_x, box_y, box_w, box_h, border_color, RGB::named(BLACK));

        let (cr, cg, cb) = classes[i].color();
        ctx.print_color(box_x + 2, box_y + 1, RGB::from_u8(cr, cg, cb), RGB::named(BLACK),
            &format!("[{}] {}", i + 1, class));

        for (j, line) in desc.iter().enumerate() {
            ctx.print_color(box_x + 2, box_y + 2 + j as i32, RGB::named(WHITE), RGB::named(BLACK), line);
        }

        if i == selected {
            ctx.print_color(box_x + 2, box_y + box_h, RGB::named(YELLOW), RGB::named(BLACK), "[SELECTED]");
        }
    }

    ctx.print_color(28, 40, RGB::named(CYAN), RGB::named(BLACK), "Press [Enter] to begin your adventure!");
}

pub fn render_game_over(ctx: &mut BTerm, player: &Player) {
    ctx.cls();

    ctx.print_color(30, 10, RGB::named(RED), RGB::named(BLACK), "YOU DIED!");
    ctx.print_color(25, 12, RGB::named(WHITE), RGB::named(BLACK), "Your adventure has ended...");

    ctx.print_color(25, 15, RGB::named(YELLOW), RGB::named(BLACK), "-- Final Stats --");
    ctx.print_color(25, 16, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Class:  {} Lv.{}", player.class.name(), player.level));
    ctx.print_color(25, 17, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Floor:  {}", player.floor_number));
    ctx.print_color(25, 18, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Kills:  {}", player.total_kills));
    ctx.print_color(25, 19, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Gold:   {}", player.gold));

    ctx.print_color(25, 22, RGB::named(GRAY50), RGB::named(BLACK), "[Enter] Return to Main Menu");
    ctx.print_color(25, 23, RGB::named(GRAY50), RGB::named(BLACK), "[Q] Quit");
}

pub fn render_victory(ctx: &mut BTerm, player: &Player) {
    ctx.cls();

    ctx.print_color(25, 8, RGB::named(YELLOW), RGB::named(BLACK), "CONGRATULATIONS!");
    ctx.print_color(20, 9, RGB::named(GREEN), RGB::named(BLACK), "You have conquered the dungeon!");

    ctx.print_color(25, 12, RGB::named(YELLOW), RGB::named(BLACK), "-- Victory Stats --");
    ctx.print_color(25, 13, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Class:  {} Lv.{}", player.class.name(), player.level));
    ctx.print_color(25, 14, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Floors Cleared: {}", player.floors_descended));
    ctx.print_color(25, 15, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Total Kills: {}", player.total_kills));
    ctx.print_color(25, 16, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Gold Collected: {}", player.gold));
    ctx.print_color(25, 17, RGB::named(WHITE), RGB::named(BLACK),
        &format!("Final HP: {}/{}", player.hp, player.max_hp));

    ctx.print_color(25, 20, RGB::named(GRAY50), RGB::named(BLACK), "[Enter] Return to Main Menu");
    ctx.print_color(25, 21, RGB::named(GRAY50), RGB::named(BLACK), "[Q] Quit");
}

pub fn render_level_up(ctx: &mut BTerm, player: &Player) {
    ctx.draw_box(15, 10, 50, 28, RGB::named(YELLOW), RGB::named(BLACK));
    ctx.print_color(30, 10, RGB::named(YELLOW), RGB::named(BLACK), " LEVEL UP! ");

    ctx.print_color(17, 12, RGB::named(WHITE), RGB::named(BLACK),
        &format!("You are now level {}!", player.level));

    ctx.print_color(17, 14, RGB::named(CYAN), RGB::named(BLACK), "Stats increased:");
    ctx.print_color(17, 15, RGB::named(WHITE), RGB::named(BLACK),
        &format!("HP:  {}/{}", player.hp, player.max_hp));
    ctx.print_color(17, 16, RGB::named(WHITE), RGB::named(BLACK),
        &format!("MP:  {}/{}", player.mp, player.max_mp));
    ctx.print_color(17, 17, RGB::named(WHITE), RGB::named(BLACK),
        &format!("STR: {}  DEX: {}  INT: {}  DEF: {}",
            player.base_strength,
            player.base_dexterity,
            player.base_intelligence,
            player.base_defense));

    if player.skill_points > 0 {
        ctx.print_color(17, 19, RGB::named(GREEN), RGB::named(BLACK),
            &format!("You have {} skill point(s) to spend!", player.skill_points));
        ctx.print_color(17, 20, RGB::named(GRAY50), RGB::named(BLACK),
            "Press [S] to open the skills menu.");
    }

    // Check for newly available skills
    let new_skills: Vec<_> = Skill::get_class_skills(&player.class)
        .into_iter()
        .filter(|s| s.min_level == player.level)
        .collect();

    if !new_skills.is_empty() {
        ctx.print_color(17, 22, RGB::named(YELLOW), RGB::named(BLACK), "New skills available:");
        for (i, s) in new_skills.iter().enumerate() {
            ctx.print_color(17, 23 + i as i32, RGB::named(GREEN), RGB::named(BLACK),
                &format!("  - {}", s.name));
        }
    }

    ctx.print_color(17, 36, RGB::named(WHITE), RGB::named(BLACK), "[Enter] Continue");
}
