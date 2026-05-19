mod map;
mod item;
mod skill;
mod event;
mod monster;
mod player;
mod game;
mod ui;

use std::io;
use std::time::Duration;

use crossterm::{
    event::{self as ctevent, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};

use crate::game::{Game, GameMode};

fn main() -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let result = run(&mut terminal);

    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    if let Err(e) = result {
        eprintln!("Error: {}", e);
    }
    Ok(())
}

fn run(terminal: &mut Terminal<CrosstermBackend<io::Stdout>>) -> io::Result<()> {
    let mut game = Game::new();

    loop {
        terminal.draw(|f| ui::render(f, &game))?;

        if ctevent::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = ctevent::read()? {
                let quit = handle_input(&mut game, key.code, key.modifiers);
                if quit {
                    break;
                }
            }
        }
    }

    Ok(())
}

fn handle_input(game: &mut Game, key: KeyCode, _modifiers: KeyModifiers) -> bool {
    match &game.mode {
        GameMode::Dead | GameMode::Victory => {
            if key == KeyCode::Char('q') || key == KeyCode::Esc {
                return true;
            }
        }

        GameMode::LevelUp => {
            game.mode = GameMode::Exploring;
        }

        GameMode::Inventory => {
            match key {
                KeyCode::Char('i') | KeyCode::Esc => {
                    game.mode = GameMode::Exploring;
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    if game.inv_selection > 0 {
                        game.inv_selection -= 1;
                    }
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
                            game.add_message(format!("Equipped: {}", item.name), game::MessageKind::Loot);
                        }
                    }
                }
                KeyCode::Char('d') => {
                    if game.inv_selection < game.player.inventory.len() {
                        let item = game.player.inventory.remove(game.inv_selection);
                        let (px, py) = (game.player.x, game.player.y);
                        let name = item.name.clone();
                        game.floor_items.push((px, py, item));
                        game.add_message(format!("Dropped: {}", name), game::MessageKind::Normal);
                        if game.inv_selection >= game.player.inventory.len() && game.inv_selection > 0 {
                            game.inv_selection -= 1;
                        }
                    }
                }
                _ => {}
            }
        }

        GameMode::Skills => {
            match key {
                KeyCode::Char('S') | KeyCode::Esc | KeyCode::F(3) => {
                    game.mode = GameMode::Exploring;
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    if game.skill_selection > 0 {
                        game.skill_selection -= 1;
                    }
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
            }
        }

        GameMode::Crafting => {
            match key {
                KeyCode::Char('c') | KeyCode::Esc => {
                    game.mode = GameMode::Exploring;
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    if game.craft_selection > 0 {
                        game.craft_selection -= 1;
                    }
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    use crate::item::CRAFTING_RECIPES;
                    if game.craft_selection + 1 < CRAFTING_RECIPES.len() {
                        game.craft_selection += 1;
                    }
                }
                KeyCode::Enter => {
                    let idx = game.craft_selection;
                    game.try_craft(idx);
                }
                _ => {}
            }
        }

        GameMode::Event => {
            match key {
                KeyCode::Up | KeyCode::Char('k') => {
                    if game.event_selection > 0 {
                        game.event_selection -= 1;
                    }
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
            }
        }

        GameMode::Exploring => {
            match key {
                KeyCode::Char('q') => return true,

                // Movement (WASD + vi keys + arrows)
                KeyCode::Left  | KeyCode::Char('a') | KeyCode::Char('h') => { game.player_move(-1, 0); }
                KeyCode::Right | KeyCode::Char('d') | KeyCode::Char('l') => { game.player_move(1, 0); }
                KeyCode::Up    | KeyCode::Char('w') | KeyCode::Char('k') => { game.player_move(0, -1); }
                KeyCode::Down  | KeyCode::Char('s') | KeyCode::Char('j') => { game.player_move(0, 1); }

                // Diagonal movement (vi keys)
                KeyCode::Char('y') => { game.player_move(-1, -1); }
                KeyCode::Char('u') => { game.player_move(1, -1); }
                KeyCode::Char('b') => { game.player_move(-1, 1); }
                KeyCode::Char('n') => { game.player_move(1, 1); }

                // Wait a turn
                KeyCode::Char('.') | KeyCode::Char('5') => {
                    // end turn without moving
                    let _ = game.player_move(0, 0);
                }

                // Interactions
                KeyCode::Char('g') => game.pickup_item(),
                KeyCode::Char('>') => game.descend(),
                KeyCode::Char('<') => game.ascend(),
                KeyCode::Char('e') => game.activate_shrine(),

                // Open menus
                KeyCode::Char('i') => {
                    game.mode = GameMode::Inventory;
                    game.inv_selection = 0;
                }
                KeyCode::Char('S') | KeyCode::F(3) => {
                    game.mode = GameMode::Skills;
                    game.skill_selection = 0;
                }
                KeyCode::Char('c') => {
                    let px = game.player.x;
                    let py = game.player.y;
                    if game.map.get(px, py) == crate::map::Tile::CraftingAnvil {
                        game.mode = GameMode::Crafting;
                        game.craft_selection = 0;
                    } else {
                        game.add_message("Stand on Crafting Anvil (A) to craft.", game::MessageKind::Warning);
                    }
                }

                // Skill hotkeys 1-4
                KeyCode::Char('1') => use_hotkey_skill(game, 0),
                KeyCode::Char('2') => use_hotkey_skill(game, 1),
                KeyCode::Char('3') => use_hotkey_skill(game, 2),
                KeyCode::Char('4') => use_hotkey_skill(game, 3),

                _ => {}
            }
        }
    }

    false
}

fn use_hotkey_skill(game: &mut Game, hotkey: usize) {
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
            game::MessageKind::Warning,
        );
    }
}
