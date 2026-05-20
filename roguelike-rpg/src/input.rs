use crossterm::event::{KeyCode, KeyModifiers};
use crate::game::{Game, GameMode, MessageKind};
use crate::item::CRAFTING_RECIPES;
use crate::map::Tile;

pub fn handle_input(game: &mut Game, key: KeyCode, _modifiers: KeyModifiers) -> bool {
    match &game.mode {
        GameMode::Dead | GameMode::Victory => {
            if key == KeyCode::Char('q') || key == KeyCode::Esc {
                return true;
            }
        }

        GameMode::LevelUp => {
            game.mode = GameMode::Exploring;
        }

        GameMode::Help => {
            game.mode = GameMode::Exploring;
        }

        GameMode::Inventory => match key {
            KeyCode::Char('i') | KeyCode::Esc => game.mode = GameMode::Exploring,
            KeyCode::Up | KeyCode::Char('k') => {
                if game.inv_selection > 0 { game.inv_selection -= 1; }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if game.inv_selection + 1 < game.player.inventory.len() {
                    game.inv_selection += 1;
                }
            }
            KeyCode::Enter | KeyCode::Char('u') => {
                let idx = game.inv_selection;
                game.use_item(idx);
                if game.inv_selection >= game.player.inventory.len() && game.inv_selection > 0 {
                    game.inv_selection -= 1;
                }
            }
            KeyCode::Char('e') => {
                let idx = game.inv_selection;
                if idx < game.player.inventory.len() {
                    let item = game.player.inventory[idx].clone();
                    if item.is_equippable() {
                        game.player.equip(idx);
                        if game.inv_selection >= game.player.inventory.len() && game.inv_selection > 0 {
                            game.inv_selection -= 1;
                        }
                        game.add_message(format!("Equipped: {}", item.name), MessageKind::Loot);
                    }
                }
            }
            KeyCode::Char('d') => {
                if game.inv_selection < game.player.inventory.len() {
                    let item = game.player.inventory.remove(game.inv_selection);
                    let (px, py) = (game.player.x, game.player.y);
                    let name = item.name.clone();
                    game.floor_items.push((px, py, item));
                    game.add_message(format!("Dropped: {}", name), MessageKind::Normal);
                    if game.inv_selection >= game.player.inventory.len() && game.inv_selection > 0 {
                        game.inv_selection -= 1;
                    }
                }
            }
            _ => {}
        },

        GameMode::Skills => match key {
            KeyCode::Char('S') | KeyCode::Esc | KeyCode::F(3) => game.mode = GameMode::Exploring,
            KeyCode::Up | KeyCode::Char('k') => {
                if game.skill_selection > 0 { game.skill_selection -= 1; }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if game.skill_selection + 1 < game.player.skills.len() {
                    game.skill_selection += 1;
                }
            }
            KeyCode::Enter => {
                let idx = game.skill_selection;
                game.learn_skill(idx);
            }
            _ => {}
        },

        GameMode::Crafting => match key {
            KeyCode::Char('c') | KeyCode::Esc => game.mode = GameMode::Exploring,
            KeyCode::Up | KeyCode::Char('k') => {
                if game.craft_selection > 0 { game.craft_selection -= 1; }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if game.craft_selection + 1 < CRAFTING_RECIPES.len() {
                    game.craft_selection += 1;
                }
            }
            KeyCode::Enter => {
                let idx = game.craft_selection;
                game.try_craft(idx);
            }
            _ => {}
        },

        GameMode::Event => match key {
            KeyCode::Up | KeyCode::Char('k') => {
                if game.event_selection > 0 { game.event_selection -= 1; }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if let Some(ref ev) = game.current_event {
                    if game.event_selection + 1 < ev.choices.len() {
                        game.event_selection += 1;
                    }
                }
            }
            KeyCode::Enter => {
                let idx = game.event_selection;
                game.event_selection = 0;
                game.apply_event_choice(idx);
            }
            _ => {}
        },

        GameMode::Battle => {
            match key {
                KeyCode::Left  | KeyCode::Char('a') | KeyCode::Char('A') => game.battle_navigate(-1),
                KeyCode::Right | KeyCode::Char('d') | KeyCode::Char('D') => game.battle_navigate(1),
                KeyCode::Up    | KeyCode::Char('w') | KeyCode::Char('W') => game.battle_navigate(-1),
                KeyCode::Down  | KeyCode::Char('s') | KeyCode::Char('S') => game.battle_navigate(1),
                KeyCode::Enter => game.battle_confirm(),
                KeyCode::Esc   => game.battle_back(),
                _ => {}
            }
        }

        GameMode::Exploring => match key {
            KeyCode::Char('q') => return true,

            // Help overlay
            KeyCode::Char('?') => game.mode = GameMode::Help,

            // Movement
            KeyCode::Left  | KeyCode::Char('a') | KeyCode::Char('h') => { game.player_move(-1,  0); }
            KeyCode::Right | KeyCode::Char('d') | KeyCode::Char('l') => { game.player_move( 1,  0); }
            KeyCode::Up    | KeyCode::Char('w') | KeyCode::Char('k') => { game.player_move( 0, -1); }
            KeyCode::Down  | KeyCode::Char('s') | KeyCode::Char('j') => { game.player_move( 0,  1); }
            KeyCode::Char('y') => { game.player_move(-1, -1); }
            KeyCode::Char('u') => { game.player_move( 1, -1); }
            KeyCode::Char('b') => { game.player_move(-1,  1); }
            KeyCode::Char('n') => { game.player_move( 1,  1); }
            KeyCode::Char('.') | KeyCode::Char('5') => { game.player_move(0, 0); }

            // Interaction
            KeyCode::Char('g') => game.pickup_item(),
            KeyCode::Char('>') => game.descend(),
            KeyCode::Char('<') => game.ascend(),
            KeyCode::Char('e') => game.activate_shrine(),

            // Menus
            KeyCode::Char('i') => { game.mode = GameMode::Inventory; game.inv_selection = 0; }
            KeyCode::Char('S') | KeyCode::F(3) => { game.mode = GameMode::Skills; game.skill_selection = 0; }
            KeyCode::Char('c') => {
                let px = game.player.x;
                let py = game.player.y;
                if game.map.get(px, py) == Tile::CraftingAnvil {
                    game.mode = GameMode::Crafting;
                    game.craft_selection = 0;
                } else {
                    game.add_message("Stand on Crafting Anvil (⚒) to craft.", MessageKind::Warning);
                }
            }

            // Skill hotkeys
            KeyCode::Char('1') => use_hotkey_skill(game, 0),
            KeyCode::Char('2') => use_hotkey_skill(game, 1),
            KeyCode::Char('3') => use_hotkey_skill(game, 2),
            KeyCode::Char('4') => use_hotkey_skill(game, 3),

            _ => {}
        },
    }
    false
}

pub fn use_hotkey_skill(game: &mut Game, hotkey: usize) {
    let skill_indices: Vec<usize> = game.player.skills.iter()
        .enumerate()
        .filter(|(_, s)| s.learned && !s.is_passive)
        .map(|(i, _)| i)
        .collect();

    if let Some(&skill_idx) = skill_indices.get(hotkey) {
        game.use_skill_in_combat(skill_idx);
    } else {
        game.add_message(
            format!("No skill in slot {}. Press 'S' to open skill tree.", hotkey + 1),
            MessageKind::Warning,
        );
    }
}
