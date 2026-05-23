use crossterm::event::{KeyCode, KeyModifiers};
use crate::game::{Game, GameMode, MessageKind};
use crate::item::CRAFTING_RECIPES;
use crate::map::Tile;


/// Returns true if the game should quit.
pub fn handle_input(game: &mut Game, key: KeyCode, _modifiers: KeyModifiers) -> bool {
    match &game.mode {
        // ── Start skill selection ─────────────────────────────────────
        // ↑ / k  : cursor up
        // ↓ / j  : cursor down
        // Enter  : confirm selection
        GameMode::StartSkillSelect => match key {
            KeyCode::Up | KeyCode::Char('k') => {
                if game.start_skill_cursor > 0 { game.start_skill_cursor -= 1; }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                let n = game.start_skill_options().len();
                if game.start_skill_cursor + 1 < n { game.start_skill_cursor += 1; }
            }
            KeyCode::Enter | KeyCode::Char(' ') => {
                game.confirm_start_skill();
            }
            _ => {}
        },

        // ── Ending announcement (any key dismisses) ───────────────────
        GameMode::EndingAnnouncement => {
            game.ending_announcement = None;
            game.mode = GameMode::Exploring;
        }

        // ── Battle victory effect (any key → advance to rewards) ─────
        GameMode::BattleVictoryEffect => {
            game.confirm_battle_victory_effect();
        }

        // ── Dead / Victory ────────────────────────────────────────────
        GameMode::Dead | GameMode::Victory => {
            if matches!(key, KeyCode::Char('q') | KeyCode::Esc) {
                return true;
            }
        }

        // ── Battle Reward ─────────────────────────────────────────────
        // ↑ / k  : skill cursor up
        // ↓ / j  : skill cursor down
        // Enter  : learn selected skill (if skill_pts > 0 and skill valid)
        // Esc / Space / q : confirm and close
        GameMode::BattleReward => match key {
            KeyCode::Esc | KeyCode::Char(' ') | KeyCode::Char('q') => {
                game.confirm_battle_rewards();
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if game.reward_skill_cursor > 0 {
                    game.reward_skill_cursor -= 1;
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                let learnable_count = game.player.skills.iter()
                    .filter(|s| s.unlocked && !s.learned)
                    .count();
                if game.reward_skill_cursor + 1 < learnable_count {
                    game.reward_skill_cursor += 1;
                }
            }
            KeyCode::Enter => {
                if game.player.skill_points > 0 {
                    // Find the Nth learnable skill
                    let idx_opt = game.player.skills.iter()
                        .enumerate()
                        .filter(|(_, s)| s.unlocked && !s.learned)
                        .nth(game.reward_skill_cursor)
                        .map(|(i, _)| i);
                    if let Some(idx) = idx_opt {
                        game.learn_skill(idx);
                        // clamp cursor
                        let learnable_count = game.player.skills.iter()
                            .filter(|s| s.unlocked && !s.learned)
                            .count();
                        if game.reward_skill_cursor >= learnable_count && game.reward_skill_cursor > 0 {
                            game.reward_skill_cursor -= 1;
                        }
                    }
                } else {
                    game.confirm_battle_rewards();
                }
            }
            _ => {}
        },

        // ── Floor map (Esc / Enter / m closes) ────────────────────────
        GameMode::FloorMap => {
            if matches!(key, KeyCode::Esc | KeyCode::Enter | KeyCode::Char('m') | KeyCode::Char(' ')) {
                game.mode = GameMode::Exploring;
            }
        }

        // ── Level-up notification (any key dismisses) ─────────────────
        GameMode::LevelUp => {
            game.mode = GameMode::Exploring;
        }

        // ── Help (any key dismisses) ──────────────────────────────────
        GameMode::Help => {
            game.mode = GameMode::Exploring;
        }

        // ── Inventory ─────────────────────────────────────────────────
        // i / Esc  : close
        // ↑ / k    : cursor up
        // ↓ / j    : cursor down
        // Enter / u: use / consume
        // e        : equip / unequip
        // d        : drop
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
                clamp_inv(game);
            }
            KeyCode::Char('e') => {
                let idx = game.inv_selection;
                if idx < game.player.inventory.len() {
                    let item = game.player.inventory[idx].clone();
                    if item.is_equippable() {
                        game.player.equip(idx);
                        clamp_inv(game);
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
                    clamp_inv(game);
                }
            }
            _ => {}
        },

        // ── Skill tree ────────────────────────────────────────────────
        // k / Esc  : close
        // ↑ / k    : cursor up  (k only closes when skill tree is NOT the active key)
        // ↓ / j    : cursor down
        // Enter    : learn skill
        // ── Skill tree ────────────────────────────────────────────────
        // k / Esc  : close
        // ↑        : cursor up
        // ↓        : cursor down
        // Enter    : learn skill
        GameMode::Skills => match key {
            KeyCode::Char('k') | KeyCode::Esc | KeyCode::F(3) => game.mode = GameMode::Exploring,
            KeyCode::Up => {
                if game.skill_selection > 0 { game.skill_selection -= 1; }
            }
            KeyCode::Down => {
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

        // ── Crafting ─────────────────────────────────────────────────
        // c / Esc  : close
        // ↑ / k    : cursor up
        // ↓ / j    : cursor down
        // Enter    : craft selected recipe
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

        // ── Random event ──────────────────────────────────────────────
        // ↑ / k    : cursor up
        // ↓ / j    : cursor down
        // Enter    : confirm choice
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

        // ── Battle ───────────────────────────────────────────────────
        // ←/→ / a/d: navigate menu items
        // ↑/↓ / w/s: same (for sub-lists)
        // Enter    : confirm
        // Esc      : back / cancel
        GameMode::Battle => match key {
            KeyCode::Left  | KeyCode::Char('a') | KeyCode::Char('A') => game.battle_navigate(-1),
            KeyCode::Right | KeyCode::Char('d') | KeyCode::Char('D') => game.battle_navigate(1),
            KeyCode::Up    | KeyCode::Char('w') | KeyCode::Char('W') => game.battle_navigate(-1),
            KeyCode::Down  | KeyCode::Char('s') | KeyCode::Char('S') => game.battle_navigate(1),
            KeyCode::Enter => game.battle_confirm(),
            KeyCode::Esc   => game.battle_back(),
            _ => {}
        },

        // ── Exploring (main mode) ─────────────────────────────────────
        // Movement  : ↑↓←→  /  w a s d  /  h j k l
        // Diagonal  : y u b n  (vi-keys: ↖ ↗ ↙ ↘)
        // Wait turn : Space / .
        // Interact  : f  (pickup / stairs / shrine / open chest — context-aware)
        //           : Enter  (same smart-interact)
        //           : g  (pickup only, original binding kept)
        //           : >  (descend stairs)
        //           : <  (ascend stairs)
        //           : e  (activate shrine, kept for convenience)
        // Inventory : i
        // Skills    : k
        // Crafting  : c  (only when standing on Crafting Anvil)
        // Skill 1-4 : 1 2 3 4
        // Help      : ?
        // Quit      : q
        GameMode::Exploring => match key {
            KeyCode::Char('q') => return true,
            KeyCode::Char('?') => game.mode = GameMode::Help,

            // Movement (4-directional)
            KeyCode::Left  | KeyCode::Char('a') | KeyCode::Char('h') => { game.player_move(-1,  0); }
            KeyCode::Right | KeyCode::Char('d') | KeyCode::Char('l') => { game.player_move( 1,  0); }
            KeyCode::Up    | KeyCode::Char('w') | KeyCode::Char('k') => { game.player_move( 0, -1); }
            KeyCode::Down  | KeyCode::Char('s') | KeyCode::Char('j') => { game.player_move( 0,  1); }

            // Diagonal movement (vi-keys)
            KeyCode::Char('y') => { game.player_move(-1, -1); }
            KeyCode::Char('u') => { game.player_move( 1, -1); }
            KeyCode::Char('b') => { game.player_move(-1,  1); }
            KeyCode::Char('n') => { game.player_move( 1,  1); }

            // Wait / skip turn
            KeyCode::Char(' ') | KeyCode::Char('.') | KeyCode::Char('5') => {
                game.player_move(0, 0);
            }

            // Smart interact (context-aware: pickup / stairs / shrine / craft)
            KeyCode::Char('f') | KeyCode::Enter => game.smart_interact(),

            // Explicit action aliases
            KeyCode::Char('g') => game.pickup_item(),
            KeyCode::Char('>') => game.descend(),
            KeyCode::Char('m') => game.activate_tablet(),
            KeyCode::Char('e') => game.activate_shrine(),

            // Open menus
            KeyCode::Char('i') => {
                game.mode = GameMode::Inventory;
                game.inv_selection = 0;
            }
            KeyCode::Char('k') => {
                game.mode = GameMode::Skills;
                game.skill_selection = 0;
            }
            // Legacy uppercase binding still works
            KeyCode::Char('S') | KeyCode::F(3) => {
                game.mode = GameMode::Skills;
                game.skill_selection = 0;
            }
            KeyCode::Char('c') => {
                let (px, py) = (game.player.x, game.player.y);
                if game.map.get(px, py) == Tile::CraftingAnvil {
                    game.mode = GameMode::Crafting;
                    game.craft_selection = 0;
                } else {
                    game.add_message(
                        "Stand on a Crafting Anvil (⚒) to craft.",
                        MessageKind::Warning,
                    );
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

fn clamp_inv(game: &mut Game) {
    if game.inv_selection >= game.player.inventory.len() && game.inv_selection > 0 {
        game.inv_selection -= 1;
    }
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
            format!("No skill in slot {}. Press [k] to open skill tree.", hotkey + 1),
            MessageKind::Warning,
        );
    }
}
