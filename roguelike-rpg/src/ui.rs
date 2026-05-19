use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Wrap},
};

use crate::game::{Game, GameMode, MessageKind};
use crate::item::{Rarity, CRAFTING_RECIPES};
use crate::map::Tile;
use crate::monster::MonsterKind;
use crate::skill::SkillBranch;

pub const VIEW_W: i32 = 55;
pub const VIEW_H: i32 = 35;

pub fn render(f: &mut Frame, game: &Game) {
    let area = f.area();
    match game.mode {
        GameMode::Dead => render_death(f, game, area),
        GameMode::Victory => render_victory(f, game, area),
        GameMode::Inventory => render_inventory(f, game, area),
        GameMode::Skills => render_skills(f, game, area),
        GameMode::Crafting => render_crafting(f, game, area),
        GameMode::Event => render_event(f, game, area),
        GameMode::LevelUp => render_levelup(f, game, area),
        _ => render_main(f, game, area),
    }
}

fn render_main(f: &mut Frame, game: &Game, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(VIEW_W as u16 + 2), Constraint::Length(28)])
        .split(area);

    let left = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(VIEW_H as u16 + 2), Constraint::Length(9)])
        .split(chunks[0]);

    render_map(f, game, left[0]);
    render_log(f, game, left[1]);
    render_sidebar(f, game, chunks[1]);
}

fn render_map(f: &mut Frame, game: &Game, area: Rect) {
    let block = Block::default()
        .title(format!(" Dungeon Floor {} ", game.map.floor))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let cam_x = game.player.x;
    let cam_y = game.player.y;
    let half_w = inner.width as i32 / 2;
    let half_h = inner.height as i32 / 2;

    let mut lines: Vec<Line> = Vec::new();
    for screen_y in 0..inner.height as i32 {
        let map_y = cam_y - half_h + screen_y;
        let mut spans: Vec<Span> = Vec::new();

        for screen_x in 0..inner.width as i32 {
            let map_x = cam_x - half_w + screen_x;

            // Player
            if map_x == game.player.x && map_y == game.player.y {
                spans.push(Span::styled(
                    "@",
                    Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD),
                ));
                continue;
            }

            // Check visibility
            let is_visible = if map_x >= 0 && map_y >= 0
                && map_x < game.map.width as i32
                && map_y < game.map.height as i32
            {
                if game.show_map_revealed {
                    true
                } else {
                    game.map.visible[map_x as usize][map_y as usize]
                }
            } else {
                false
            };

            let is_explored = if map_x >= 0 && map_y >= 0
                && map_x < game.map.width as i32
                && map_y < game.map.height as i32
            {
                game.map.explored[map_x as usize][map_y as usize]
            } else {
                false
            };

            if !is_visible && !is_explored {
                spans.push(Span::raw(" "));
                continue;
            }

            // Monster
            if is_visible {
                if let Some(m) = game.monsters.iter().find(|m| m.x == map_x && m.y == map_y) {
                    let color = monster_color(&m.kind);
                    let bold = if m.kind.is_boss() { Modifier::BOLD } else { Modifier::empty() };
                    spans.push(Span::styled(
                        m.kind.char().to_string(),
                        Style::default().fg(color).add_modifier(bold),
                    ));
                    continue;
                }

                // Floor item
                if let Some((_, _, item)) = game.floor_items.iter().find(|(ix, iy, _)| *ix == map_x && *iy == map_y) {
                    let color = rarity_color(&item.rarity);
                    spans.push(Span::styled(item.char().to_string(), Style::default().fg(color)));
                    continue;
                }
            }

            // Tile
            let tile = game.map.get(map_x, map_y);
            let (ch, style) = tile_style(tile, is_visible, is_explored);
            spans.push(Span::styled(ch.to_string(), style));
        }
        lines.push(Line::from(spans));
    }

    let para = Paragraph::new(lines);
    f.render_widget(para, inner);
}

fn tile_style(tile: Tile, visible: bool, _explored: bool) -> (char, Style) {
    let dim = Style::default().fg(Color::DarkGray);
    let bright = |c: Color| Style::default().fg(c);

    match tile {
        Tile::Floor => (
            '.',
            if visible { bright(Color::Rgb(80, 80, 80)) } else { dim },
        ),
        Tile::Wall => (
            '#',
            if visible { bright(Color::Rgb(100, 80, 60)) } else { Style::default().fg(Color::Rgb(60, 50, 40)) },
        ),
        Tile::Door => (
            '+',
            if visible { bright(Color::Rgb(160, 120, 60)) } else { dim },
        ),
        Tile::StairsDown => (
            '>',
            if visible { Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD) } else { dim },
        ),
        Tile::StairsUp => (
            '<',
            if visible { Style::default().fg(Color::Cyan) } else { dim },
        ),
        Tile::CraftingAnvil => (
            'A',
            if visible { Style::default().fg(Color::Rgb(200, 180, 100)).add_modifier(Modifier::BOLD) } else { dim },
        ),
        Tile::Shrine => (
            '!',
            if visible { Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD) } else { dim },
        ),
        Tile::Chest => (
            '$',
            if visible { Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD) } else { dim },
        ),
        Tile::Void => (' ', Style::default()),
    }
}

fn monster_color(kind: &MonsterKind) -> Color {
    match kind {
        MonsterKind::Rat => Color::Rgb(150, 100, 80),
        MonsterKind::Goblin => Color::Green,
        MonsterKind::Orc => Color::Rgb(100, 160, 80),
        MonsterKind::Skeleton => Color::Rgb(200, 200, 180),
        MonsterKind::Zombie => Color::Rgb(100, 160, 100),
        MonsterKind::Troll => Color::Rgb(80, 200, 80),
        MonsterKind::Mage => Color::Magenta,
        MonsterKind::Vampire => Color::Rgb(200, 50, 50),
        MonsterKind::Dragon => Color::Red,
        MonsterKind::Demon => Color::Rgb(220, 30, 30),
        MonsterKind::Ghost => Color::Rgb(180, 180, 255),
        MonsterKind::Golem => Color::Rgb(120, 120, 120),
    }
}

fn rarity_color(r: &Rarity) -> Color {
    match r {
        Rarity::Common => Color::White,
        Rarity::Uncommon => Color::Green,
        Rarity::Rare => Color::Blue,
        Rarity::Epic => Color::Magenta,
        Rarity::Legendary => Color::Yellow,
    }
}

fn render_log(f: &mut Frame, game: &Game, area: Rect) {
    let block = Block::default()
        .title(" Messages ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let visible_lines = inner.height as usize;
    let start = game.messages.len().saturating_sub(visible_lines);
    let lines: Vec<Line> = game.messages[start..]
        .iter()
        .map(|(msg, kind)| {
            let color = match kind {
                MessageKind::Combat => Color::Red,
                MessageKind::Loot => Color::Yellow,
                MessageKind::Good => Color::Green,
                MessageKind::Warning => Color::LightRed,
                MessageKind::Event => Color::Cyan,
                MessageKind::System => Color::LightBlue,
                MessageKind::Normal => Color::Gray,
            };
            Line::from(Span::styled(msg.clone(), Style::default().fg(color)))
        })
        .collect();

    f.render_widget(Paragraph::new(lines), inner);
}

fn render_sidebar(f: &mut Frame, game: &Game, area: Rect) {
    let p = &game.player;
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(14),
            Constraint::Length(10),
            Constraint::Length(9),
            Constraint::Min(4),
        ])
        .split(area);

    // Stats block
    let exp_pct = (p.exp * 100 / p.exp_to_next.max(1)).min(100) as u16;
    let hp_pct = (p.hp * 100 / p.max_hp.max(1)).min(100) as u16;
    let mp_pct = (p.mp * 100 / p.max_mp.max(1)).min(100) as u16;

    let hp_color = if hp_pct > 50 { Color::Green } else if hp_pct > 25 { Color::Yellow } else { Color::Red };

    let stats_lines = vec![
        Line::from(vec![
            Span::styled("Name ", Style::default().fg(Color::DarkGray)),
            Span::styled("Hero", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
        ]),
        Line::from(vec![
            Span::styled(format!("Lv.{:<3} ", p.level), Style::default().fg(Color::Cyan)),
            Span::styled(format!("Floor {}", p.floor), Style::default().fg(Color::White)),
        ]),
        Line::from(vec![
            Span::styled("HP ", Style::default().fg(Color::DarkGray)),
            Span::styled(format!("{}/{}", p.hp, p.max_hp), Style::default().fg(hp_color)),
        ]),
        Line::from(vec![
            Span::styled("MP ", Style::default().fg(Color::DarkGray)),
            Span::styled(format!("{}/{}", p.mp, p.max_mp), Style::default().fg(Color::Blue)),
        ]),
        Line::from(""),
        Line::from(vec![
            Span::styled("STR ", Style::default().fg(Color::Red)),
            Span::styled(format!("{:<4}", p.effective_attack()), Style::default().fg(Color::White)),
            Span::styled("DEF ", Style::default().fg(Color::Cyan)),
            Span::styled(format!("{}", p.effective_defense()), Style::default().fg(Color::White)),
        ]),
        Line::from(vec![
            Span::styled("INT ", Style::default().fg(Color::Magenta)),
            Span::styled(format!("{:<4}", p.effective_magic()), Style::default().fg(Color::White)),
            Span::styled("LUK ", Style::default().fg(Color::Yellow)),
            Span::styled(format!("{}", p.base_luk), Style::default().fg(Color::White)),
        ]),
        Line::from(vec![
            Span::styled("Gold ", Style::default().fg(Color::Yellow)),
            Span::styled(format!("{}", p.gold), Style::default().fg(Color::Yellow)),
        ]),
        Line::from(""),
        Line::from(vec![
            Span::styled("EXP ", Style::default().fg(Color::DarkGray)),
            Span::styled(format!("{}/{}", p.exp, p.exp_to_next), Style::default().fg(Color::Rgb(200, 200, 100))),
        ]),
        Line::from(vec![
            Span::styled(format!("[{}{}]", "=".repeat(exp_pct as usize / 5), " ".repeat(20 - exp_pct as usize / 5)),
            Style::default().fg(Color::Rgb(200, 200, 100))),
        ]),
        Line::from(""),
        if p.shield_hp > 0 {
            Line::from(Span::styled(format!("Shield: {}", p.shield_hp), Style::default().fg(Color::Cyan)))
        } else { Line::from("") },
        if p.stun_turns > 0 {
            Line::from(Span::styled(format!("STUNNED: {}", p.stun_turns), Style::default().fg(Color::Red)))
        } else { Line::from("") },
    ];

    let stats_block = Block::default()
        .title(" Stats ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));
    f.render_widget(Paragraph::new(stats_lines).block(stats_block), chunks[0]);

    // Equipment block
    let eq = &p.equipment;
    let equip_lines = vec![
        Line::from(vec![
            Span::styled("Wpn ", Style::default().fg(Color::DarkGray)),
            eq.weapon.as_ref().map(|i| Span::styled(shorten(&i.name, 18), Style::default().fg(rarity_color(&i.rarity))))
                .unwrap_or_else(|| Span::styled("--", Style::default().fg(Color::DarkGray))),
        ]),
        Line::from(vec![
            Span::styled("Arm ", Style::default().fg(Color::DarkGray)),
            eq.armor.as_ref().map(|i| Span::styled(shorten(&i.name, 18), Style::default().fg(rarity_color(&i.rarity))))
                .unwrap_or_else(|| Span::styled("--", Style::default().fg(Color::DarkGray))),
        ]),
        Line::from(vec![
            Span::styled("Hlm ", Style::default().fg(Color::DarkGray)),
            eq.helmet.as_ref().map(|i| Span::styled(shorten(&i.name, 18), Style::default().fg(rarity_color(&i.rarity))))
                .unwrap_or_else(|| Span::styled("--", Style::default().fg(Color::DarkGray))),
        ]),
        Line::from(vec![
            Span::styled("Bts ", Style::default().fg(Color::DarkGray)),
            eq.boots.as_ref().map(|i| Span::styled(shorten(&i.name, 18), Style::default().fg(rarity_color(&i.rarity))))
                .unwrap_or_else(|| Span::styled("--", Style::default().fg(Color::DarkGray))),
        ]),
        Line::from(vec![
            Span::styled("Rng ", Style::default().fg(Color::DarkGray)),
            eq.ring.as_ref().map(|i| Span::styled(shorten(&i.name, 18), Style::default().fg(rarity_color(&i.rarity))))
                .unwrap_or_else(|| Span::styled("--", Style::default().fg(Color::DarkGray))),
        ]),
        Line::from(vec![
            Span::styled("Aml ", Style::default().fg(Color::DarkGray)),
            eq.amulet.as_ref().map(|i| Span::styled(shorten(&i.name, 18), Style::default().fg(rarity_color(&i.rarity))))
                .unwrap_or_else(|| Span::styled("--", Style::default().fg(Color::DarkGray))),
        ]),
        Line::from(""),
        Line::from(vec![
            Span::styled("ATK ", Style::default().fg(Color::Red)),
            Span::styled(format!("{:<4}", p.effective_attack()), Style::default().fg(Color::White)),
            Span::styled("DEF ", Style::default().fg(Color::Cyan)),
            Span::styled(format!("{}", p.effective_defense()), Style::default().fg(Color::White)),
        ]),
    ];

    let equip_block = Block::default()
        .title(" Equipment ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));
    f.render_widget(Paragraph::new(equip_lines).block(equip_block), chunks[1]);

    // Active skills bar
    let known_active: Vec<_> = p.skills.iter()
        .filter(|s| s.learned && !s.is_passive)
        .take(4)
        .collect();
    let skill_lines: Vec<Line> = known_active.iter().enumerate().map(|(i, s)| {
        let cd_text = if s.current_cooldown > 0 {
            format!(" CD:{}", s.current_cooldown)
        } else {
            String::new()
        };
        let color = if s.current_cooldown == 0 { Color::Green } else { Color::DarkGray };
        Line::from(vec![
            Span::styled(format!("[{}]", i + 1), Style::default().fg(Color::Yellow)),
            Span::styled(format!(" {}", shorten(&s.name, 12)), Style::default().fg(color)),
            Span::styled(format!(" {}MP{}", s.mp_cost, cd_text), Style::default().fg(Color::Rgb(100, 100, 200))),
        ])
    }).collect();

    let skill_block = Block::default()
        .title(" Skills (1-4) ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));
    f.render_widget(Paragraph::new(skill_lines).block(skill_block), chunks[2]);

    // Controls hint
    let controls = vec![
        Line::from(Span::styled("WASD/Arrows: Move", Style::default().fg(Color::DarkGray))),
        Line::from(Span::styled("g: Pickup  >/<: Stairs", Style::default().fg(Color::DarkGray))),
        Line::from(Span::styled("i: Inv  s: Skills  c: Craft", Style::default().fg(Color::DarkGray))),
        Line::from(Span::styled("1-4: Use skill  q: Quit", Style::default().fg(Color::DarkGray))),
    ];
    let ctrl_block = Block::default()
        .title(" Controls ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Rgb(40, 40, 40)));
    f.render_widget(Paragraph::new(controls).block(ctrl_block), chunks[3]);
}

fn render_inventory(f: &mut Frame, game: &Game, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(60), Constraint::Percentage(40)])
        .split(area);

    let items: Vec<ListItem> = game.player.inventory.iter().enumerate().map(|(i, item)| {
        let prefix = if i == game.inv_selection { "► " } else { "  " };
        let color = rarity_color(&item.rarity);
        ListItem::new(Line::from(vec![
            Span::styled(prefix, Style::default().fg(Color::Yellow)),
            Span::styled(item.char().to_string(), Style::default().fg(color)),
            Span::styled(format!(" {}", item.name), Style::default().fg(color)),
        ]))
    }).collect();

    let list = List::new(items)
        .block(Block::default()
            .title(format!(" Inventory ({}/{}) — i:close  u:use  e:equip  d:drop ", game.player.inventory.len(), crate::game::INVENTORY_MAX))
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Yellow)));
    f.render_widget(list, chunks[0]);

    // Item detail
    if let Some(item) = game.player.inventory.get(game.inv_selection) {
        let color = rarity_color(&item.rarity);
        let mut lines = vec![
            Line::from(Span::styled(&item.name, Style::default().fg(color).add_modifier(Modifier::BOLD))),
            Line::from(Span::styled(item.rarity.label(), Style::default().fg(color))),
            Line::from(""),
            Line::from(Span::styled(&item.description, Style::default().fg(Color::Gray))),
            Line::from(""),
        ];

        if item.stats.attack != 0 {
            lines.push(Line::from(Span::styled(format!("ATK: +{}", item.stats.attack), Style::default().fg(Color::Red))));
        }
        if item.stats.defense != 0 {
            lines.push(Line::from(Span::styled(format!("DEF: +{}", item.stats.defense), Style::default().fg(Color::Cyan))));
        }
        if item.stats.hp_bonus != 0 {
            lines.push(Line::from(Span::styled(format!("HP: +{}", item.stats.hp_bonus), Style::default().fg(Color::Green))));
        }
        if item.stats.mp_bonus != 0 {
            lines.push(Line::from(Span::styled(format!("MP: +{}", item.stats.mp_bonus), Style::default().fg(Color::Blue))));
        }
        if item.stats.int_bonus != 0 {
            lines.push(Line::from(Span::styled(format!("INT: +{}", item.stats.int_bonus), Style::default().fg(Color::Magenta))));
        }
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(format!("Value: {} gold", item.value), Style::default().fg(Color::Yellow))));

        let detail = Paragraph::new(lines)
            .block(Block::default().title(" Item Detail ").borders(Borders::ALL))
            .wrap(Wrap { trim: false });
        f.render_widget(detail, chunks[1]);
    }
}

fn render_skills(f: &mut Frame, game: &Game, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(area);

    let skills = &game.player.skills;
    let items: Vec<ListItem> = skills.iter().enumerate().map(|(i, skill)| {
        let prefix = if i == game.skill_selection { "► " } else { "  " };
        let color = if skill.learned {
            Color::Green
        } else if skill.unlocked {
            Color::Yellow
        } else {
            Color::DarkGray
        };
        let branch_icon = match skill.branch {
            SkillBranch::Warrior => "⚔",
            SkillBranch::Mage => "★",
            SkillBranch::Rogue => "✦",
            SkillBranch::Universal => "◉",
        };
        let status = if skill.learned {
            if skill.is_passive { " [PASSIVE]" } else { " [ACTIVE]" }
        } else if skill.unlocked {
            " [AVAIL]"
        } else {
            " [LOCKED]"
        };
        ListItem::new(Line::from(vec![
            Span::styled(prefix, Style::default().fg(Color::Yellow)),
            Span::styled(branch_icon, Style::default().fg(color)),
            Span::styled(format!(" {}", &skill.name), Style::default().fg(color)),
            Span::styled(status, Style::default().fg(Color::DarkGray)),
        ]))
    }).collect();

    let sp = game.player.skill_points;
    let list = List::new(items)
        .block(Block::default()
            .title(format!(" Skills — SP:{} — s:close  Enter:learn ", sp))
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan)));
    f.render_widget(list, chunks[0]);

    // Skill detail
    if let Some(skill) = skills.get(game.skill_selection) {
        let color = if skill.learned { Color::Green } else if skill.unlocked { Color::Yellow } else { Color::DarkGray };
        let mut lines = vec![
            Line::from(Span::styled(skill.name.clone(), Style::default().fg(color).add_modifier(Modifier::BOLD))),
            Line::from(Span::styled(
                match skill.branch {
                    SkillBranch::Warrior => "⚔ Warrior",
                    SkillBranch::Mage => "★ Mage",
                    SkillBranch::Rogue => "✦ Rogue",
                    SkillBranch::Universal => "◉ Universal",
                },
                Style::default().fg(Color::DarkGray),
            )),
            Line::from(""),
            Line::from(Span::styled(skill.description.clone(), Style::default().fg(Color::White))),
            Line::from(""),
        ];
        if !skill.is_passive {
            lines.push(Line::from(Span::styled(format!("MP Cost: {}", skill.mp_cost), Style::default().fg(Color::Blue))));
            lines.push(Line::from(Span::styled(format!("Cooldown: {} turns", skill.cooldown), Style::default().fg(Color::Yellow))));
        } else {
            lines.push(Line::from(Span::styled("Passive: Always active when learned", Style::default().fg(Color::Green))));
        }
        if let Some(prereq) = skill.prerequisite {
            if prereq < skills.len() {
                lines.push(Line::from(Span::styled(
                    format!("Requires: {}", skills[prereq].name),
                    Style::default().fg(Color::DarkGray),
                )));
            }
        }
        lines.push(Line::from(""));
        if skill.learned {
            lines.push(Line::from(Span::styled("✓ LEARNED", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD))));
        } else if skill.unlocked && sp > 0 {
            lines.push(Line::from(Span::styled("Press Enter to learn (1 SP)", Style::default().fg(Color::Yellow))));
        } else if sp == 0 {
            lines.push(Line::from(Span::styled("No skill points!", Style::default().fg(Color::Red))));
        } else {
            lines.push(Line::from(Span::styled("LOCKED — Meet prerequisites", Style::default().fg(Color::DarkGray))));
        }

        let detail = Paragraph::new(lines)
            .block(Block::default().title(" Skill Detail ").borders(Borders::ALL))
            .wrap(Wrap { trim: false });
        f.render_widget(detail, chunks[1]);
    }
}

fn render_crafting(f: &mut Frame, game: &Game, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(area);

    let recipes: Vec<ListItem> = CRAFTING_RECIPES.iter().enumerate().map(|(i, recipe)| {
        let prefix = if i == game.craft_selection { "► " } else { "  " };

        // Check if craftable
        let mut can_craft = true;
        for (mat_type, count) in recipe.ingredients {
            let have: u32 = game.player.inventory.iter()
                .filter(|item| item.material_type.as_deref() == Some(mat_type))
                .count() as u32;
            if have < *count {
                can_craft = false;
                break;
            }
        }

        let color = if can_craft { Color::Green } else { Color::DarkGray };
        ListItem::new(Line::from(vec![
            Span::styled(prefix, Style::default().fg(Color::Yellow)),
            Span::styled(recipe.name, Style::default().fg(color)),
        ]))
    }).collect();

    let list = List::new(recipes)
        .block(Block::default()
            .title(" Crafting — c:close  Enter:craft ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Rgb(200, 160, 60))));
    f.render_widget(list, chunks[0]);

    // Recipe detail
    if let Some(recipe) = CRAFTING_RECIPES.get(game.craft_selection) {
        let mut lines = vec![
            Line::from(Span::styled(recipe.name, Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))),
            Line::from(Span::styled(recipe.result_description, Style::default().fg(Color::Gray))),
            Line::from(""),
            Line::from(Span::styled("Ingredients:", Style::default().fg(Color::White))),
        ];

        for (mat_type, count) in recipe.ingredients {
            let have: u32 = game.player.inventory.iter()
                .filter(|item| item.material_type.as_deref() == Some(mat_type))
                .count() as u32;
            let ok_color = if have >= *count { Color::Green } else { Color::Red };
            lines.push(Line::from(vec![
                Span::styled(format!("  {} x{}", mat_type, count), Style::default().fg(Color::White)),
                Span::styled(format!(" (have: {})", have), Style::default().fg(ok_color)),
            ]));
        }

        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled("Materials in inventory:", Style::default().fg(Color::DarkGray))));
        let mut mat_counts: std::collections::HashMap<&str, u32> = std::collections::HashMap::new();
        for item in &game.player.inventory {
            if let Some(ref mt) = item.material_type {
                *mat_counts.entry(mt.as_str()).or_insert(0) += 1;
            }
        }
        for (mat, count) in &mat_counts {
            lines.push(Line::from(Span::styled(format!("  {} x{}", mat, count), Style::default().fg(Color::Rgb(150, 150, 150)))));
        }

        let detail = Paragraph::new(lines)
            .block(Block::default().title(" Recipe Detail ").borders(Borders::ALL))
            .wrap(Wrap { trim: false });
        f.render_widget(detail, chunks[1]);
    }
}

fn render_event(f: &mut Frame, game: &Game, area: Rect) {
    if let Some(event) = &game.current_event {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(10), Constraint::Length(event.choices.len() as u16 * 3 + 4)])
            .split(area);

        let desc = Paragraph::new(vec![
            Line::from(Span::styled(&event.title, Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))),
            Line::from(""),
            Line::from(Span::styled(&event.description, Style::default().fg(Color::White))),
        ])
        .block(Block::default().title(" Random Event! ").borders(Borders::ALL).border_style(Style::default().fg(Color::Cyan)))
        .wrap(Wrap { trim: false });
        f.render_widget(desc, chunks[0]);

        let items: Vec<ListItem> = event.choices.iter().enumerate().map(|(i, choice)| {
            let prefix = if i == game.event_selection { "► " } else { "  " };
            let risk_label = if choice.is_risky { " ⚠" } else { "" };
            let color = if i == game.event_selection { Color::Yellow } else { Color::White };
            ListItem::new(vec![
                Line::from(vec![
                    Span::styled(prefix, Style::default().fg(Color::Yellow)),
                    Span::styled(format!("{}{}", choice.label, risk_label), Style::default().fg(color).add_modifier(Modifier::BOLD)),
                ]),
                Line::from(Span::styled(format!("   {}", choice.description), Style::default().fg(Color::DarkGray))),
            ])
        }).collect();

        let choices = List::new(items)
            .block(Block::default()
                .title(" Choose Wisely (↑↓ to select, Enter to confirm) — Irreversible! ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Red)));
        f.render_widget(choices, chunks[1]);
    }
}

fn render_levelup(f: &mut Frame, game: &Game, area: Rect) {
    let p = &game.player;
    let lines = vec![
        Line::from(""),
        Line::from(Span::styled("★ LEVEL UP! ★", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from(Span::styled(format!("Now Level {}", p.level), Style::default().fg(Color::Cyan))),
        Line::from(""),
        Line::from(Span::styled(format!("Max HP: {}", p.max_hp), Style::default().fg(Color::Green))),
        Line::from(Span::styled(format!("Max MP: {}", p.max_mp), Style::default().fg(Color::Blue))),
        Line::from(Span::styled(format!("STR: {}  DEF: {}  INT: {}", p.base_str, p.base_def, p.base_int), Style::default().fg(Color::White))),
        Line::from(""),
        Line::from(Span::styled(format!("Skill Points: {} (+2)", p.skill_points), Style::default().fg(Color::Magenta))),
        Line::from(""),
        Line::from(Span::styled("Press any key to continue...", Style::default().fg(Color::DarkGray))),
    ];

    let w = area.width.min(40);
    let h = 14u16;
    let popup = Rect {
        x: area.x + (area.width.saturating_sub(w)) / 2,
        y: area.y + (area.height.saturating_sub(h)) / 2,
        width: w,
        height: h,
    };

    f.render_widget(
        Paragraph::new(lines)
            .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::Yellow)))
            .style(Style::default().bg(Color::Black)),
        popup,
    );
}

fn render_death(f: &mut Frame, game: &Game, area: Rect) {
    let p = &game.player;
    let lines = vec![
        Line::from(""),
        Line::from(Span::styled("  ██████  ███████  █████  ████████  ██   ██  ", Style::default().fg(Color::Red).add_modifier(Modifier::BOLD))),
        Line::from(Span::styled("  ██   ██ ██      ██   ██    ██     ██   ██  ", Style::default().fg(Color::Red))),
        Line::from(Span::styled("  ██   ██ █████   ███████    ██     ███████  ", Style::default().fg(Color::Red))),
        Line::from(Span::styled("  ██   ██ ██      ██   ██    ██     ██   ██  ", Style::default().fg(Color::Red))),
        Line::from(Span::styled("  ██████  ███████ ██   ██    ██     ██   ██  ", Style::default().fg(Color::Red).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from(Span::styled(format!("  You reached floor {} (deepest: {})", p.floor, p.deepest_floor), Style::default().fg(Color::White))),
        Line::from(Span::styled(format!("  Level {} | {} turns", p.level, game.turn), Style::default().fg(Color::Gray))),
        Line::from(Span::styled(format!("  Monsters slain: {}", p.monsters_killed), Style::default().fg(Color::Gray))),
        Line::from(Span::styled(format!("  Items collected: {}", p.items_collected), Style::default().fg(Color::Gray))),
        Line::from(Span::styled(format!("  Bestiary: {}/{} entries", p.bestiary.len(), 12), Style::default().fg(Color::Gray))),
        Line::from(""),
        Line::from(Span::styled("  Press 'q' to quit.", Style::default().fg(Color::DarkGray))),
    ];

    let para = Paragraph::new(lines)
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::Red)))
        .style(Style::default().bg(Color::Black));
    f.render_widget(para, area);
}

fn render_victory(f: &mut Frame, game: &Game, area: Rect) {
    let p = &game.player;
    let lines = vec![
        Line::from(""),
        Line::from(Span::styled("  ✦ VICTORY! ✦", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from(Span::styled("  You have conquered the dungeon!", Style::default().fg(Color::Green))),
        Line::from(""),
        Line::from(Span::styled(format!("  Final Level: {}", p.level), Style::default().fg(Color::Cyan))),
        Line::from(Span::styled(format!("  Turns taken: {}", game.turn), Style::default().fg(Color::White))),
        Line::from(Span::styled(format!("  Monsters slain: {}", p.monsters_killed), Style::default().fg(Color::White))),
        Line::from(Span::styled(format!("  Deepest Floor: {}", p.deepest_floor), Style::default().fg(Color::White))),
        Line::from(Span::styled(format!("  Skills learned: {}", p.skills.iter().filter(|s| s.learned).count()), Style::default().fg(Color::Magenta))),
        Line::from(Span::styled(format!("  Bestiary: {}/12 entries", p.bestiary.len()), Style::default().fg(Color::Yellow))),
        Line::from(""),
        Line::from(Span::styled("  Press 'q' to quit.", Style::default().fg(Color::DarkGray))),
    ];

    let para = Paragraph::new(lines)
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::Yellow)))
        .style(Style::default().bg(Color::Black));
    f.render_widget(para, area);
}

fn shorten(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max - 1])
    }
}
