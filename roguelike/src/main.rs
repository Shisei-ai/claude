use bracket_lib::prelude::*;

mod map;
mod player;
mod monster;
mod combat;
mod items;
mod classes;
mod skills;
mod ui;
mod game;

use game::{GameWorld, RunState, BattleSubState};
use classes::Class;

struct State {
    world: GameWorld,
}

impl State {
    fn new() -> Self {
        State {
            world: GameWorld::new(),
        }
    }
}

impl GameState for State {
    fn tick(&mut self, ctx: &mut BTerm) {
        ctx.cls();

        let current_state = self.world.run_state.clone();

        match current_state {
            RunState::MainMenu => {
                ui::render_main_menu(ctx);
                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Return => {
                            self.world.run_state = RunState::ClassSelect(0);
                        }
                        VirtualKeyCode::Q => {
                            ctx.quit();
                        }
                        _ => {}
                    }
                }
            }

            RunState::ClassSelect(selected) => {
                ui::render_class_select(ctx, selected);
                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Key1 => {
                            self.world.run_state = RunState::ClassSelect(0);
                        }
                        VirtualKeyCode::Key2 => {
                            self.world.run_state = RunState::ClassSelect(1);
                        }
                        VirtualKeyCode::Key3 => {
                            self.world.run_state = RunState::ClassSelect(2);
                        }
                        VirtualKeyCode::Left => {
                            self.world.run_state = RunState::ClassSelect(selected.saturating_sub(1));
                        }
                        VirtualKeyCode::Right => {
                            self.world.run_state = RunState::ClassSelect((selected + 1).min(2));
                        }
                        VirtualKeyCode::Return => {
                            let class = match selected {
                                0 => Class::Warrior,
                                1 => Class::Mage,
                                _ => Class::Rogue,
                            };
                            self.world.start_game(class);
                        }
                        VirtualKeyCode::Escape => {
                            self.world.run_state = RunState::MainMenu;
                        }
                        _ => {}
                    }
                }
            }

            RunState::Playing => {
                // Render game world
                ui::render_map(ctx, &self.world.map, &self.world.player, &self.world.monsters);
                ui::render_hud(ctx, &self.world.player, &self.world.messages);

                if let Some(key) = ctx.key {
                    match key {
                        // Movement
                        VirtualKeyCode::W | VirtualKeyCode::Up => {
                            self.world.try_move_player(0, -1);
                        }
                        VirtualKeyCode::S | VirtualKeyCode::Down => {
                            self.world.try_move_player(0, 1);
                        }
                        VirtualKeyCode::A | VirtualKeyCode::Left => {
                            self.world.try_move_player(-1, 0);
                        }
                        VirtualKeyCode::D | VirtualKeyCode::Right => {
                            self.world.try_move_player(1, 0);
                        }
                        // Diagonal movement (numpad)
                        VirtualKeyCode::Numpad7 | VirtualKeyCode::Y => {
                            self.world.try_move_player(-1, -1);
                        }
                        VirtualKeyCode::Numpad9 | VirtualKeyCode::U => {
                            self.world.try_move_player(1, -1);
                        }
                        VirtualKeyCode::Numpad1 | VirtualKeyCode::B => {
                            self.world.try_move_player(-1, 1);
                        }
                        VirtualKeyCode::Numpad3 | VirtualKeyCode::N => {
                            self.world.try_move_player(1, 1);
                        }
                        // Wait turn
                        VirtualKeyCode::Numpad5 => {
                            self.world.end_player_turn();
                        }
                        // Stairs or wait
                        VirtualKeyCode::Period => {
                            if ctx.shift {
                                self.world.do_stairs();
                            } else {
                                self.world.end_player_turn();
                            }
                        }
                        VirtualKeyCode::RBracket => {
                            self.world.do_stairs();
                        }
                        // Menus
                        VirtualKeyCode::I => {
                            self.world.run_state = RunState::Inventory;
                        }
                        VirtualKeyCode::K | VirtualKeyCode::Key6 => {
                            // S is used for movement, so use K for skills
                            self.world.run_state = RunState::Skills;
                        }
                        VirtualKeyCode::C => {
                            self.world.run_state = RunState::CharStats;
                        }
                        VirtualKeyCode::Escape => {
                            self.world.run_state = RunState::MainMenu;
                        }
                        _ => {}
                    }
                }

                // Check for level up
                if self.world.pending_level_up {
                    self.world.pending_level_up = false;
                    self.world.run_state = RunState::LevelUp;
                }

                // Check game over
                if !self.world.player.is_alive() {
                    self.world.run_state = RunState::GameOver;
                }
            }

            RunState::BattleMenu { monster_idx, sub_state } => {
                if monster_idx >= self.world.monsters.len() || !self.world.monsters[monster_idx].is_alive {
                    self.world.run_state = RunState::Playing;
                    return;
                }

                let action_idx = match &sub_state {
                    BattleSubState::SelectAction => 0,
                    BattleSubState::SelectSkill(_) => 1,
                    BattleSubState::SelectItem(_) => 2,
                };

                ui::render_battle_ui(
                    ctx,
                    &self.world.player,
                    &self.world.monsters[monster_idx],
                    &self.world.messages,
                    action_idx,
                );

                match &sub_state {
                    BattleSubState::SelectAction => {
                        if let Some(key) = ctx.key {
                            match key {
                                VirtualKeyCode::Key1 => {
                                    // Attack
                                    let monster_dead = self.world.player_attack(monster_idx);
                                    if monster_dead || !self.world.monsters[monster_idx].is_alive {
                                        if self.world.pending_level_up {
                                            self.world.pending_level_up = false;
                                            self.world.run_state = RunState::LevelUp;
                                        } else {
                                            self.world.run_state = RunState::Playing;
                                        }
                                    } else {
                                        self.world.monster_turn_after_battle(monster_idx);
                                        if !self.world.player.is_alive() {
                                            self.world.run_state = RunState::GameOver;
                                        }
                                    }
                                }
                                VirtualKeyCode::Key2 => {
                                    // Skills submenu
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectSkill(0),
                                    };
                                }
                                VirtualKeyCode::Key3 => {
                                    // Items submenu
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectItem(0),
                                    };
                                }
                                VirtualKeyCode::Key4 => {
                                    // Flee
                                    let fled = self.world.player_flee(monster_idx);
                                    if fled {
                                        self.world.recompute_fov();
                                        self.world.run_state = RunState::Playing;
                                    } else if !self.world.player.is_alive() {
                                        self.world.run_state = RunState::GameOver;
                                    }
                                    // else stay in battle
                                }
                                _ => {}
                            }
                        }
                    }

                    BattleSubState::SelectSkill(sel_idx) => {
                        let skills: Vec<_> = skills::Skill::get_class_skills(&self.world.player.class)
                            .into_iter()
                            .filter(|s| self.world.player.has_skill(s.id))
                            .collect();

                        ui::render_skill_select(ctx, &self.world.player, *sel_idx);

                        if let Some(key) = ctx.key {
                            match key {
                                VirtualKeyCode::Escape => {
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectAction,
                                    };
                                }
                                VirtualKeyCode::Up | VirtualKeyCode::W => {
                                    let new_sel = sel_idx.saturating_sub(1);
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectSkill(new_sel),
                                    };
                                }
                                VirtualKeyCode::Down | VirtualKeyCode::S => {
                                    let new_sel = (sel_idx + 1).min(skills.len().saturating_sub(1));
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectSkill(new_sel),
                                    };
                                }
                                VirtualKeyCode::Return => {
                                    if *sel_idx < skills.len() {
                                        let skill_id = skills[*sel_idx].id;
                                        let monster_dead = self.world.player_use_skill(monster_idx, skill_id);
                                        if monster_dead || !self.world.monsters[monster_idx].is_alive {
                                            if self.world.pending_level_up {
                                                self.world.pending_level_up = false;
                                                self.world.run_state = RunState::LevelUp;
                                            } else {
                                                self.world.run_state = RunState::Playing;
                                            }
                                        } else {
                                            self.world.monster_turn_after_battle(monster_idx);
                                            if !self.world.player.is_alive() {
                                                self.world.run_state = RunState::GameOver;
                                            } else {
                                                self.world.run_state = RunState::BattleMenu {
                                                    monster_idx,
                                                    sub_state: BattleSubState::SelectAction,
                                                };
                                            }
                                        }
                                    }
                                }
                                // Number key shortcuts
                                key => {
                                    let num = match key {
                                        VirtualKeyCode::Key1 => Some(0usize),
                                        VirtualKeyCode::Key2 => Some(1),
                                        VirtualKeyCode::Key3 => Some(2),
                                        VirtualKeyCode::Key4 => Some(3),
                                        _ => None,
                                    };
                                    if let Some(idx) = num {
                                        if idx < skills.len() {
                                            let skill_id = skills[idx].id;
                                            let monster_dead = self.world.player_use_skill(monster_idx, skill_id);
                                            if monster_dead || !self.world.monsters[monster_idx].is_alive {
                                                if self.world.pending_level_up {
                                                    self.world.pending_level_up = false;
                                                    self.world.run_state = RunState::LevelUp;
                                                } else {
                                                    self.world.run_state = RunState::Playing;
                                                }
                                            } else {
                                                self.world.monster_turn_after_battle(monster_idx);
                                                if !self.world.player.is_alive() {
                                                    self.world.run_state = RunState::GameOver;
                                                } else {
                                                    self.world.run_state = RunState::BattleMenu {
                                                        monster_idx,
                                                        sub_state: BattleSubState::SelectAction,
                                                    };
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    BattleSubState::SelectItem(sel_idx) => {
                        let usable = self.world.get_usable_items_indices();

                        ui::render_item_select(ctx, &self.world.player, *sel_idx);

                        if let Some(key) = ctx.key {
                            match key {
                                VirtualKeyCode::Escape => {
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectAction,
                                    };
                                }
                                VirtualKeyCode::Up | VirtualKeyCode::W => {
                                    let new_sel = sel_idx.saturating_sub(1);
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectItem(new_sel),
                                    };
                                }
                                VirtualKeyCode::Down | VirtualKeyCode::S => {
                                    let new_sel = (sel_idx + 1).min(usable.len().saturating_sub(1));
                                    self.world.run_state = RunState::BattleMenu {
                                        monster_idx,
                                        sub_state: BattleSubState::SelectItem(new_sel),
                                    };
                                }
                                VirtualKeyCode::Return => {
                                    if *sel_idx < usable.len() {
                                        let inv_idx = usable[*sel_idx];
                                        if let Some(msg) = self.world.player_use_item_in_battle(inv_idx) {
                                            self.world.add_message(msg);
                                        }
                                        self.world.monster_turn_after_battle(monster_idx);
                                        if !self.world.player.is_alive() {
                                            self.world.run_state = RunState::GameOver;
                                        } else {
                                            self.world.run_state = RunState::BattleMenu {
                                                monster_idx,
                                                sub_state: BattleSubState::SelectAction,
                                            };
                                        }
                                    }
                                }
                                key => {
                                    let num = match key {
                                        VirtualKeyCode::Key1 => Some(0usize),
                                        VirtualKeyCode::Key2 => Some(1),
                                        VirtualKeyCode::Key3 => Some(2),
                                        VirtualKeyCode::Key4 => Some(3),
                                        VirtualKeyCode::Key5 => Some(4),
                                        _ => None,
                                    };
                                    if let Some(idx) = num {
                                        if idx < usable.len() {
                                            let inv_idx = usable[idx];
                                            if let Some(msg) = self.world.player_use_item_in_battle(inv_idx) {
                                                self.world.add_message(msg);
                                            }
                                            self.world.monster_turn_after_battle(monster_idx);
                                            if !self.world.player.is_alive() {
                                                self.world.run_state = RunState::GameOver;
                                            } else {
                                                self.world.run_state = RunState::BattleMenu {
                                                    monster_idx,
                                                    sub_state: BattleSubState::SelectAction,
                                                };
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            RunState::Inventory => {
                ui::render_map(ctx, &self.world.map, &self.world.player, &self.world.monsters);
                ui::render_inventory(ctx, &self.world.player);

                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Escape => {
                            self.world.run_state = RunState::Playing;
                        }
                        // Number keys to use/equip items
                        key => {
                            let num: Option<usize> = match key {
                                VirtualKeyCode::Key1 => Some(0),
                                VirtualKeyCode::Key2 => Some(1),
                                VirtualKeyCode::Key3 => Some(2),
                                VirtualKeyCode::Key4 => Some(3),
                                VirtualKeyCode::Key5 => Some(4),
                                VirtualKeyCode::Key6 => Some(5),
                                VirtualKeyCode::Key7 => Some(6),
                                VirtualKeyCode::Key8 => Some(7),
                                VirtualKeyCode::Key9 => Some(8),
                                VirtualKeyCode::Key0 => Some(9),
                                _ => None,
                            };

                            if let Some(idx) = num {
                                if idx < self.world.player.inventory.len() {
                                    let item_kind = self.world.player.inventory[idx].kind.clone();
                                    match item_kind {
                                        items::ItemKind::Weapon { .. }
                                        | items::ItemKind::Armor { .. }
                                        | items::ItemKind::Ring { .. } => {
                                            if let Some(msg) = self.world.player.equip_item(idx) {
                                                self.world.add_message(msg);
                                            }
                                        }
                                        items::ItemKind::Potion { .. }
                                        | items::ItemKind::Scroll { .. } => {
                                            if let Some(msg) = self.world.player.use_item(idx) {
                                                self.world.add_message(msg);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            RunState::Skills => {
                ui::render_map(ctx, &self.world.map, &self.world.player, &self.world.monsters);
                ui::render_skills(ctx, &self.world.player);

                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Escape => {
                            self.world.run_state = RunState::Playing;
                        }
                        // Number keys to learn skills
                        key => {
                            let num: Option<usize> = match key {
                                VirtualKeyCode::Key1 => Some(0),
                                VirtualKeyCode::Key2 => Some(1),
                                VirtualKeyCode::Key3 => Some(2),
                                VirtualKeyCode::Key4 => Some(3),
                                _ => None,
                            };

                            if let Some(idx) = num {
                                let all_class_skills = skills::Skill::get_class_skills(&self.world.player.class);
                                if idx < all_class_skills.len() {
                                    let skill = &all_class_skills[idx];
                                    if skill.min_level <= self.world.player.level {
                                        let skill_id = skill.id;
                                        if self.world.player.learn_skill(skill_id) {
                                            let skill_name = all_class_skills[idx].name.clone();
                                            self.world.add_message(format!("Learned {}!", skill_name));
                                        } else if self.world.player.has_skill(skill_id) {
                                            self.world.add_message("Already learned!".to_string());
                                        } else {
                                            self.world.add_message("No skill points!".to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            RunState::CharStats => {
                ui::render_character_stats(ctx, &self.world.player);

                if let Some(key) = ctx.key {
                    if key == VirtualKeyCode::Escape || key == VirtualKeyCode::C {
                        self.world.run_state = RunState::Playing;
                    }
                }
            }

            RunState::LevelUp => {
                ui::render_map(ctx, &self.world.map, &self.world.player, &self.world.monsters);
                ui::render_level_up(ctx, &self.world.player);

                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Return | VirtualKeyCode::Space => {
                            self.world.run_state = RunState::Playing;
                        }
                        VirtualKeyCode::K => {
                            self.world.run_state = RunState::Skills;
                        }
                        _ => {}
                    }
                }
            }

            RunState::GameOver => {
                ui::render_game_over(ctx, &self.world.player);

                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Return => {
                            self.world = GameWorld::new();
                            self.world.run_state = RunState::MainMenu;
                        }
                        VirtualKeyCode::Q => {
                            ctx.quit();
                        }
                        _ => {}
                    }
                }
            }

            RunState::Victory => {
                ui::render_victory(ctx, &self.world.player);

                if let Some(key) = ctx.key {
                    match key {
                        VirtualKeyCode::Return => {
                            self.world = GameWorld::new();
                            self.world.run_state = RunState::MainMenu;
                        }
                        VirtualKeyCode::Q => {
                            ctx.quit();
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

fn main() -> BError {
    let context = BTermBuilder::simple80x50()
        .with_title("Roguelike RPG")
        .with_fps_cap(30.0)
        .build()?;

    let gs = State::new();
    main_loop(context, gs)
}
