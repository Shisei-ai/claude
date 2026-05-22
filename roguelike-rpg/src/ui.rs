use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Wrap},
};

use crate::game::{Game, GameMode, MessageKind, FOV_RADIUS};
use crate::item::{Rarity, CRAFTING_RECIPES};
use crate::map::Tile;
use crate::monster::MonsterKind;
use crate::skill::SkillBranch;

pub const VIEW_W: i32 = 58;
pub const VIEW_H: i32 = 36;

// ── Palette ──────────────────────────────────────────────────────────────────
const PAL_BG:         (u8,u8,u8) = (8, 8, 14);          // near-black with blue tint
const PAL_WALL_NEAR:  (u8,u8,u8) = (110, 88, 65);       // warm stone lit
const PAL_WALL_MID:   (u8,u8,u8) = (60, 50, 38);        // stone shadow
const PAL_WALL_FAR:   (u8,u8,u8) = (32, 28, 22);        // explored dim
const PAL_FLOOR_NEAR: (u8,u8,u8) = (68, 60, 48);        // warm flagstone lit
const PAL_FLOOR_MID:  (u8,u8,u8) = (35, 32, 26);        // floor mid-shadow
const PAL_FLOOR_FAR:  (u8,u8,u8) = (18, 16, 13);        // explored dark
const PAL_GOLD:       (u8,u8,u8) = (220, 170, 50);
const PAL_TEAL:       (u8,u8,u8) = (40, 140, 160);
const PAL_MAGENTA:    (u8,u8,u8) = (160, 60, 200);
const PAL_RED:        (u8,u8,u8) = (200, 50, 50);
const PAL_HP_HIGH:    (u8,u8,u8) = (60, 190, 90);
const PAL_HP_MID:     (u8,u8,u8) = (220, 180, 40);
const PAL_HP_LOW:     (u8,u8,u8) = (220, 50, 50);
const PAL_MP_BAR:     (u8,u8,u8) = (60, 100, 230);
const PAL_EXP_BAR:    (u8,u8,u8) = (160, 80, 220);
const PAL_BORDER:     (u8,u8,u8) = (45, 55, 75);
const PAL_BORDER_LIT: (u8,u8,u8) = (80, 100, 140);

fn rgb(c: (u8,u8,u8)) -> Color { Color::Rgb(c.0, c.1, c.2) }

fn lerp(a: (u8,u8,u8), b: (u8,u8,u8), t: f32) -> Color {
    let t = t.clamp(0.0, 1.0);
    Color::Rgb(
        (a.0 as f32 + (b.0 as f32 - a.0 as f32) * t) as u8,
        (a.1 as f32 + (b.1 as f32 - a.1 as f32) * t) as u8,
        (a.2 as f32 + (b.2 as f32 - a.2 as f32) * t) as u8,
    )
}

fn torch_falloff(dist: f32) -> f32 {
    let r = FOV_RADIUS as f32;
    let t = (dist / r).min(1.0);
    1.0 - t * t  // quadratic torch falloff
}

// ── Tile rendering with distance-based lighting ───────────────────────────────
fn tile_span(tile: Tile, visible: bool, explored: bool, dist: f32) -> Span<'static> {
    if !visible && !explored {
        return Span::raw(" ");
    }
    let falloff = if visible { torch_falloff(dist) } else { 0.0 };
    // explored-only: render at dim fixed level; visible: full lighting
    match tile {
        Tile::Wall => {
            let (ch, color) = if visible {
                // Shade character changes with distance for texture
                let ch = if dist < 2.5 { '▓' } else if dist < 5.0 { '▒' } else { '░' };
                let color = lerp(PAL_WALL_NEAR, PAL_WALL_MID, 1.0 - falloff);
                (ch, color)
            } else {
                ('░', rgb(PAL_WALL_FAR))
            };
            Span::styled(ch.to_string(), Style::default().fg(color))
        }
        Tile::Floor => {
            let color = if visible {
                lerp(PAL_FLOOR_NEAR, PAL_FLOOR_MID, 1.0 - falloff)
            } else {
                rgb(PAL_FLOOR_FAR)
            };
            Span::styled("·", Style::default().fg(color))
        }
        Tile::Door => {
            let color = if visible {
                lerp((180, 130, 60), (80, 58, 28), 1.0 - falloff)
            } else {
                Color::Rgb(40, 30, 14)
            };
            Span::styled("╬", Style::default().fg(color))
        }
        Tile::StairsDown => {
            let color = if visible {
                lerp(PAL_TEAL, (20, 60, 70), 1.0 - falloff * 0.6)
            } else {
                Color::Rgb(20, 50, 60)
            };
            Span::styled("≫", Style::default().fg(color).add_modifier(Modifier::BOLD))
        }
        Tile::StairsUp => {
            let color = if visible {
                lerp(PAL_TEAL, (20, 60, 70), 1.0 - falloff * 0.6)
            } else {
                Color::Rgb(20, 50, 60)
            };
            Span::styled("≪", Style::default().fg(color))
        }
        Tile::CraftingAnvil => {
            let color = if visible {
                lerp(PAL_GOLD, (100, 80, 20), 1.0 - falloff * 0.5)
            } else {
                Color::Rgb(80, 65, 20)
            };
            Span::styled("⚒", Style::default().fg(color).add_modifier(Modifier::BOLD))
        }
        Tile::Shrine => {
            let color = if visible {
                lerp(PAL_MAGENTA, (60, 20, 80), 1.0 - falloff * 0.4)
            } else {
                Color::Rgb(50, 18, 70)
            };
            let glyph = if dist < 4.0 { "✦" } else { "✧" };
            Span::styled(glyph, Style::default().fg(color).add_modifier(Modifier::BOLD))
        }
        Tile::Chest => {
            let color = if visible {
                lerp(PAL_GOLD, (110, 85, 25), 1.0 - falloff * 0.4)
            } else {
                Color::Rgb(90, 70, 18)
            };
            Span::styled("◆", Style::default().fg(color).add_modifier(Modifier::BOLD))
        }
        Tile::Tablet => {
            let color = if visible {
                lerp((160, 160, 140), (80, 80, 70), 1.0 - falloff * 0.5)
            } else {
                Color::Rgb(70, 70, 60)
            };
            Span::styled("𝄿", Style::default().fg(color).add_modifier(Modifier::BOLD))
        }
        Tile::Void => Span::raw(" "),
    }
}

fn item_span(ch: char, rarity: &Rarity, dist: f32) -> Span<'static> {
    let base = rarity_rgb(rarity);
    let dimmed = lerp(base, PAL_FLOOR_FAR, (1.0 - torch_falloff(dist)) * 0.6);
    let glyph = match ch {
        '/' => "†",
        '[' => "≡",
        '^' => "◬",
        'b' => "⊤",
        'o' => "◎",
        '"' => "⌂",
        '!' => "⌥",
        '*' => "◇",
        '?' => "§",
        _   => "·",
    };
    Span::styled(glyph, Style::default().fg(dimmed).add_modifier(Modifier::BOLD))
}

fn rarity_rgb(r: &Rarity) -> (u8, u8, u8) {
    match r {
        Rarity::Common    => (140, 140, 140),
        Rarity::Uncommon  => (60, 200, 80),
        Rarity::Rare      => (60, 140, 255),
        Rarity::Epic      => (180, 60, 255),
        Rarity::Legendary => (255, 165, 0),
    }
}

fn rarity_color(r: &Rarity) -> Color { rgb(rarity_rgb(r)) }

fn monster_span(kind: &MonsterKind, dist: f32) -> Span<'static> {
    let (glyph, base_color): (&'static str, (u8,u8,u8)) = match kind {
        MonsterKind::Rat      => ("ʀ", (130, 90,  70)),
        MonsterKind::Goblin   => ("ɢ", (60,  170, 60)),
        MonsterKind::Orc      => ("Ø", (80,  160, 70)),
        MonsterKind::Skeleton => ("☠", (200, 195, 175)),
        MonsterKind::Zombie   => ("ƶ", (80,  150, 90)),
        MonsterKind::Troll    => ("Ŧ", (60,  200, 70)),
        MonsterKind::Mage     => ("Ψ", (180, 70,  230)),
        MonsterKind::Vampire  => ("Ɐ", (210, 40,  60)),
        MonsterKind::Dragon   => ("Ð", (230, 30,  30)),
        MonsterKind::Demon    => ("Ω", (240, 20,  20)),
        MonsterKind::Ghost    => ("Ƨ", (160, 160, 255)),
        MonsterKind::Golem    => ("Ɣ", (110, 110, 110)),
    };
    let color = lerp(base_color, PAL_FLOOR_FAR, (1.0 - torch_falloff(dist)) * 0.3);
    let mut style = Style::default().fg(color);
    if kind.is_boss() { style = style.add_modifier(Modifier::BOLD); }
    Span::styled(glyph, style)
}

// ── Bar helper ────────────────────────────────────────────────────────────────
fn stat_bar(current: i32, max: i32, width: usize, filled_color: (u8,u8,u8), empty_color: (u8,u8,u8)) -> Line<'static> {
    let pct = (current as f32 / max.max(1) as f32).clamp(0.0, 1.0);
    let filled = (pct * width as f32) as usize;
    let empty  = width - filled;
    Line::from(vec![
        Span::styled("█".repeat(filled), Style::default().fg(rgb(filled_color))),
        Span::styled("░".repeat(empty),  Style::default().fg(rgb(empty_color))),
    ])
}

fn hp_color(pct: f32) -> (u8,u8,u8) {
    if pct > 0.5 { PAL_HP_HIGH }
    else if pct > 0.25 { PAL_HP_MID }
    else { PAL_HP_LOW }
}

// ── Border helpers ────────────────────────────────────────────────────────────
fn dark_block(title: &'static str) -> Block<'static> {
    Block::default()
        .title(Span::styled(
            format!(" {} ", title),
            Style::default().fg(rgb(PAL_BORDER_LIT)).add_modifier(Modifier::BOLD),
        ))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(rgb(PAL_BORDER)))
}

// ── Top-level dispatch ────────────────────────────────────────────────────────
pub fn render(f: &mut Frame, game: &Game) {
    let area = f.area();
    match game.mode {
        GameMode::Dead       => render_death(f, game, area),
        GameMode::Victory    => render_victory(f, game, area),
        GameMode::Inventory  => render_inventory(f, game, area),
        GameMode::Skills     => render_skills(f, game, area),
        GameMode::Crafting   => render_crafting(f, game, area),
        GameMode::Event      => render_event(f, game, area),
        GameMode::LevelUp    => render_levelup(f, game, area),
        GameMode::Help            => { render_main(f, game, area); render_help(f, area); }
        GameMode::StartSkillSelect => render_start_skill_select(f, game, area),
        _                         => render_main(f, game, area),
    }
}

// ── Main layout ───────────────────────────────────────────────────────────────
fn render_main(f: &mut Frame, game: &Game, area: Rect) {
    // Fill background
    f.render_widget(
        Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))),
        area,
    );

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(VIEW_W as u16 + 2), Constraint::Length(28)])
        .split(area);

    let left = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(VIEW_H as u16 + 2), Constraint::Length(10)])
        .split(chunks[0]);

    render_map(f, game, left[0]);
    render_log(f, game, left[1]);
    render_sidebar(f, game, chunks[1]);
}

// ── Map ───────────────────────────────────────────────────────────────────────
fn render_map(f: &mut Frame, game: &Game, area: Rect) {
    let floor_label = format!(" ⚔  DUNGEON  ·  FLOOR {}  ⚔ ", game.map.floor);
    let block = Block::default()
        .title(Span::styled(floor_label, Style::default().fg(rgb(PAL_GOLD)).add_modifier(Modifier::BOLD)))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(rgb(PAL_BORDER)))
        .style(Style::default().bg(rgb(PAL_BG)));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let cam_x  = game.player.x;
    let cam_y  = game.player.y;
    let half_w = inner.width  as i32 / 2;
    let half_h = inner.height as i32 / 2;

    let mut lines: Vec<Line> = Vec::new();

    for screen_y in 0..inner.height as i32 {
        let map_y = cam_y - half_h + screen_y;
        let mut spans: Vec<Span> = Vec::new();

        for screen_x in 0..inner.width as i32 {
            let map_x = cam_x - half_w + screen_x;

            // Player glyph
            if map_x == game.player.x && map_y == game.player.y {
                spans.push(Span::styled(
                    "@",
                    Style::default()
                        .fg(rgb(PAL_GOLD))
                        .bg(rgb(PAL_BG))
                        .add_modifier(Modifier::BOLD),
                ));
                continue;
            }

            let in_bounds = map_x >= 0 && map_y >= 0
                && map_x < game.map.width  as i32
                && map_y < game.map.height as i32;

            let visible  = in_bounds && (game.show_map_revealed || game.map.visible[map_x as usize][map_y as usize]);
            let explored = in_bounds && game.map.explored[map_x as usize][map_y as usize];

            if !visible && !explored {
                spans.push(Span::raw(" "));
                continue;
            }

            let dist = (((map_x - cam_x).pow(2) + (map_y - cam_y).pow(2)) as f32).sqrt();

            // Monster
            if visible {
                if let Some(m) = game.monsters.iter().find(|m| m.x == map_x && m.y == map_y) {
                    spans.push(monster_span(&m.kind, dist));
                    continue;
                }
                // Floor item
                if let Some((_, _, item)) = game.floor_items.iter().find(|(ix, iy, _)| *ix == map_x && *iy == map_y) {
                    spans.push(item_span(item.char(), &item.rarity, dist));
                    continue;
                }
            }

            // Tile
            let tile = game.map.get(map_x, map_y);
            spans.push(tile_span(tile, visible, explored, dist));
        }
        lines.push(Line::from(spans));
    }

    f.render_widget(
        Paragraph::new(lines).style(Style::default().bg(rgb(PAL_BG))),
        inner,
    );
}

// ── Message log ───────────────────────────────────────────────────────────────
fn render_log(f: &mut Frame, game: &Game, area: Rect) {
    let block = dark_block("Messages");
    let inner = block.inner(area);
    f.render_widget(block, area);

    let visible = inner.height as usize;
    let start   = game.messages.len().saturating_sub(visible);

    let lines: Vec<Line> = game.messages[start..]
        .iter()
        .map(|(msg, kind)| {
            let (bullet, color) = match kind {
                MessageKind::Combat  => ("▸ ", Color::Rgb(220, 80,  80)),
                MessageKind::Loot    => ("◈ ", rgb(PAL_GOLD)),
                MessageKind::Good    => ("✦ ", Color::Rgb(80,  200, 100)),
                MessageKind::Warning => ("⚠ ", Color::Rgb(230, 100, 40)),
                MessageKind::Event   => ("◉ ", Color::Rgb(80,  200, 220)),
                MessageKind::System  => ("· ", Color::Rgb(100, 130, 180)),
                MessageKind::Normal  => ("  ", Color::Rgb(100, 100, 100)),
            };
            Line::from(vec![
                Span::styled(bullet, Style::default().fg(color)),
                Span::styled(msg.clone(), Style::default().fg(color)),
            ])
        })
        .collect();

    f.render_widget(
        Paragraph::new(lines).style(Style::default().bg(rgb(PAL_BG))),
        inner,
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
fn render_sidebar(f: &mut Frame, game: &Game, area: Rect) {
    let p = &game.player;

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(17), // stats + bars
            Constraint::Length(9),  // equipment
            Constraint::Length(8),  // skills hotbar
            Constraint::Min(3),     // controls hint
        ])
        .split(area);

    // ── Stats panel ──────────────────────────────────────────────────────────
    let hp_pct  = p.hp  as f32 / p.max_hp.max(1)  as f32;
    let mp_pct  = p.mp  as f32 / p.max_mp.max(1)  as f32;
    let exp_pct = p.exp as f32 / p.exp_to_next.max(1) as f32;
    let hp_col  = hp_color(hp_pct);

    let bar_w = 18usize;

    let mut stats_lines: Vec<Line> = vec![
        Line::from(vec![
            Span::styled("  HERO  ", Style::default().fg(rgb(PAL_GOLD)).add_modifier(Modifier::BOLD)),
            Span::styled(format!("Lv.{}", p.level),    Style::default().fg(Color::Rgb(160,160,255))),
            Span::styled(format!("  F{}", p.floor),    Style::default().fg(Color::Rgb(100,120,160))),
        ]),
        Line::from(Span::styled("─".repeat(24), Style::default().fg(rgb(PAL_BORDER)))),
        // HP label
        Line::from(vec![
            Span::styled(" HP ", Style::default().fg(Color::Rgb(200,80,80))),
            Span::styled(format!("{:>4}/{:<4}", p.hp, p.max_hp), Style::default().fg(rgb(hp_col))),
        ]),
    ];
    // HP bar
    stats_lines.push({
        let mut l = stat_bar(p.hp, p.max_hp, bar_w, hp_col, (30, 20, 20));
        l.spans.insert(0, Span::raw(" "));
        l
    });
    if p.shield_hp > 0 {
        stats_lines.push(Line::from(vec![
            Span::styled(" ◈ Shield ", Style::default().fg(Color::Rgb(80,180,220))),
            Span::styled(format!("{}", p.shield_hp), Style::default().fg(Color::Rgb(80,200,240))),
        ]));
    }

    // MP label + bar
    stats_lines.push(Line::from(vec![
        Span::styled(" MP ", Style::default().fg(Color::Rgb(80,120,230))),
        Span::styled(format!("{:>4}/{:<4}", p.mp, p.max_mp), Style::default().fg(rgb(PAL_MP_BAR))),
    ]));
    stats_lines.push({
        let mut l = stat_bar(p.mp as i32, p.max_mp as i32, bar_w, PAL_MP_BAR, (10, 18, 40));
        l.spans.insert(0, Span::raw(" "));
        l
    });

    // EXP bar
    stats_lines.push(Line::from(vec![
        Span::styled(" EX ", Style::default().fg(Color::Rgb(160,80,220))),
        Span::styled(format!("{:>4}/{:<4}", p.exp, p.exp_to_next), Style::default().fg(rgb(PAL_EXP_BAR))),
    ]));
    stats_lines.push({
        let mut l = stat_bar(p.exp as i32, p.exp_to_next as i32, bar_w, PAL_EXP_BAR, (30, 12, 50));
        l.spans.insert(0, Span::raw(" "));
        l
    });

    // Divider + combat stats
    stats_lines.push(Line::from(Span::styled("─".repeat(24), Style::default().fg(rgb(PAL_BORDER)))));
    stats_lines.push(Line::from(vec![
        Span::styled(" ⚔ ", Style::default().fg(Color::Rgb(220,80,80))),
        Span::styled(format!("{:<4}", p.effective_attack()),  Style::default().fg(Color::Rgb(240,180,100))),
        Span::styled(" ⛨ ", Style::default().fg(Color::Rgb(80,160,220))),
        Span::styled(format!("{:<4}", p.effective_defense()), Style::default().fg(Color::Rgb(100,200,240))),
        Span::styled(" ✦ ", Style::default().fg(rgb(PAL_GOLD))),
        Span::styled(format!("{}", p.gold),                   Style::default().fg(rgb(PAL_GOLD))),
    ]));
    stats_lines.push(Line::from(vec![
        Span::styled(" ★ ", Style::default().fg(Color::Rgb(180,80,230))),
        Span::styled(format!("{:<4}", p.effective_magic()),   Style::default().fg(Color::Rgb(200,100,255))),
        Span::styled(" ☘ ", Style::default().fg(Color::Rgb(100,220,100))),
        Span::styled(format!("{:<4}", p.base_luk),            Style::default().fg(Color::Rgb(100,240,120))),
    ]));

    if p.stun_turns > 0 {
        stats_lines.push(Line::from(Span::styled(
            format!(" ⚡ STUNNED ({})", p.stun_turns),
            Style::default().fg(Color::Rgb(240,50,50)).add_modifier(Modifier::BOLD),
        )));
    }

    f.render_widget(
        Paragraph::new(stats_lines)
            .block(dark_block("Status"))
            .style(Style::default().bg(rgb(PAL_BG))),
        chunks[0],
    );

    // ── Equipment panel ───────────────────────────────────────────────────────
    let eq = &p.equipment;
    let slot_line = |label: &'static str, item: &Option<crate::item::Item>| -> Line<'static> {
        let value = item.as_ref().map(|i| {
            Span::styled(trim_str(&i.name, 16), Style::default().fg(rarity_color(&i.rarity)))
        }).unwrap_or_else(|| Span::styled("──────────────", Style::default().fg(rgb(PAL_BORDER))));
        Line::from(vec![
            Span::styled(label, Style::default().fg(Color::Rgb(80,100,130))),
            value,
        ])
    };

    let eq_lines: Vec<Line> = vec![
        slot_line("⚔ ", &eq.weapon),
        slot_line("⛨ ", &eq.armor),
        slot_line("◬ ", &eq.helmet),
        slot_line("⊤ ", &eq.boots),
        slot_line("◎ ", &eq.ring),
        slot_line("⌂ ", &eq.amulet),
    ];

    f.render_widget(
        Paragraph::new(eq_lines)
            .block(dark_block("Equipment"))
            .style(Style::default().bg(rgb(PAL_BG))),
        chunks[1],
    );

    // ── Active skills ─────────────────────────────────────────────────────────
    let known_active: Vec<_> = p.skills.iter()
        .filter(|s| s.learned && !s.is_passive)
        .take(4)
        .collect();

    let skill_lines: Vec<Line> = (0..4).map(|i| {
        if let Some(s) = known_active.get(i) {
            let ready = s.current_cooldown == 0;
            let (slot_color, name_color, cd_text) = if ready {
                (rgb(PAL_GOLD), Color::Rgb(200,220,255), String::new())
            } else {
                (rgb(PAL_BORDER), Color::Rgb(70,70,80), format!(" ⏳{}", s.current_cooldown))
            };
            Line::from(vec![
                Span::styled(format!("[{}]", i + 1), Style::default().fg(slot_color).add_modifier(Modifier::BOLD)),
                Span::styled(format!(" {}", trim_str(&s.name, 11)), Style::default().fg(name_color)),
                Span::styled(format!(" {}♦{}", s.mp_cost, cd_text), Style::default().fg(Color::Rgb(60,80,200))),
            ])
        } else {
            Line::from(Span::styled(format!("[{}] ─────────────", i + 1), Style::default().fg(rgb(PAL_BORDER))))
        }
    }).collect();

    f.render_widget(
        Paragraph::new(skill_lines)
            .block(dark_block("Skills 1–4"))
            .style(Style::default().bg(rgb(PAL_BG))),
        chunks[2],
    );

    // ── Controls ─────────────────────────────────────────────────────────────
    let ctrl_lines = vec![
        Line::from(Span::styled("WASD/arrows · Move", Style::default().fg(rgb(PAL_BORDER_LIT)))),
        Line::from(Span::styled("g·pick  >/< stairs", Style::default().fg(rgb(PAL_BORDER_LIT)))),
        Line::from(Span::styled("i·inv  S·skills  c·craft", Style::default().fg(rgb(PAL_BORDER_LIT)))),
    ];
    f.render_widget(
        Paragraph::new(ctrl_lines)
            .block(dark_block("Keys"))
            .style(Style::default().bg(rgb(PAL_BG))),
        chunks[3],
    );
}

// ── Inventory ─────────────────────────────────────────────────────────────────
fn render_inventory(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(58), Constraint::Percentage(42)])
        .split(area);

    let items: Vec<ListItem> = game.player.inventory.iter().enumerate().map(|(i, item)| {
        let selected = i == game.inv_selection;
        let prefix = if selected { "▶ " } else { "  " };
        let color   = rarity_color(&item.rarity);
        let bg      = if selected { Color::Rgb(20, 25, 35) } else { rgb(PAL_BG) };
        let glyph   = item_glyph(item.char());
        ListItem::new(Line::from(vec![
            Span::styled(prefix, Style::default().fg(rgb(PAL_GOLD))),
            Span::styled(glyph, Style::default().fg(color)),
            Span::styled(format!(" {}", item.name), Style::default().fg(color).bg(bg)),
        ]))
    }).collect();

    f.render_widget(
        List::new(items)
            .block(Block::default()
                .title(Span::styled(
                    format!(" ◈ Inventory  {}/{}  · u:use  e:equip  d:drop  i:close ", game.player.inventory.len(), crate::game::INVENTORY_MAX),
                    Style::default().fg(rgb(PAL_BORDER_LIT)),
                ))
                .borders(Borders::ALL)
                .border_style(Style::default().fg(rgb(PAL_BORDER)))
                .style(Style::default().bg(rgb(PAL_BG)))),
        chunks[0],
    );

    // Item detail
    if let Some(item) = game.player.inventory.get(game.inv_selection) {
        let color = rarity_color(&item.rarity);
        let rarity_label = rarity_ornate_label(&item.rarity);
        let mut lines: Vec<Line> = vec![
            Line::from(Span::styled(item.name.clone(), Style::default().fg(color).add_modifier(Modifier::BOLD))),
            Line::from(Span::styled(rarity_label, Style::default().fg(color))),
            Line::from(Span::styled("─".repeat(22), Style::default().fg(rgb(PAL_BORDER)))),
            Line::from(Span::styled(item.description.clone(), Style::default().fg(Color::Rgb(140,140,140)))),
            Line::from(""),
        ];
        if item.stats.attack  != 0 { lines.push(stat_line("⚔ ATK", item.stats.attack,  Color::Rgb(220,80,80))); }
        if item.stats.defense != 0 { lines.push(stat_line("⛨ DEF", item.stats.defense, Color::Rgb(80,160,220))); }
        if item.stats.hp_bonus  != 0 { lines.push(stat_line("♥ HP",  item.stats.hp_bonus,  Color::Rgb(60,200,90))); }
        if item.stats.mp_bonus  != 0 { lines.push(stat_line("♦ MP",  item.stats.mp_bonus,  Color::Rgb(80,130,240))); }
        if item.stats.int_bonus != 0 { lines.push(stat_line("★ INT", item.stats.int_bonus, Color::Rgb(180,80,240))); }
        lines.push(Line::from(""));
        lines.push(Line::from(vec![
            Span::styled("✦ Value  ", Style::default().fg(rgb(PAL_BORDER_LIT))),
            Span::styled(format!("{} gold", item.value), Style::default().fg(rgb(PAL_GOLD))),
        ]));

        f.render_widget(
            Paragraph::new(lines)
                .block(dark_block("Detail"))
                .style(Style::default().bg(rgb(PAL_BG)))
                .wrap(Wrap { trim: false }),
            chunks[1],
        );
    }
}

fn stat_line(label: &'static str, val: i32, color: Color) -> Line<'static> {
    Line::from(vec![
        Span::styled(format!(" {} ", label), Style::default().fg(Color::Rgb(80,100,130))),
        Span::styled(format!("+{}", val), Style::default().fg(color).add_modifier(Modifier::BOLD)),
    ])
}

fn rarity_ornate_label(r: &Rarity) -> String {
    match r {
        Rarity::Common    => "◇ Common".to_string(),
        Rarity::Uncommon  => "◆ Uncommon".to_string(),
        Rarity::Rare      => "✦ Rare".to_string(),
        Rarity::Epic      => "★ Epic".to_string(),
        Rarity::Legendary => "✧ L E G E N D A R Y ✧".to_string(),
    }
}

// ── Skill tree ────────────────────────────────────────────────────────────────
fn render_skills(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(52), Constraint::Percentage(48)])
        .split(area);

    let skills = &game.player.skills;
    let items: Vec<ListItem> = skills.iter().enumerate().map(|(i, skill)| {
        let selected = i == game.skill_selection;
        let (name_color, status_glyph) = if skill.learned {
            (Color::Rgb(80, 220, 100), "✓")
        } else if skill.unlocked {
            (Color::Rgb(200, 180, 80), "○")
        } else {
            (Color::Rgb(50, 50, 60), "✕")
        };
        let branch_icon = match skill.branch {
            SkillBranch::Warrior   => "⚔",
            SkillBranch::Mage      => "★",
            SkillBranch::Rogue     => "✦",
            SkillBranch::Universal => "◉",
            SkillBranch::Knight    => "🛡",
            SkillBranch::Shaman    => "☽",
            SkillBranch::Alchemist => "⚗",
        };
        let prefix = if selected { "▶ " } else { "  " };
        let passive = if skill.is_passive { " ◈" } else { "" };
        ListItem::new(Line::from(vec![
            Span::styled(prefix, Style::default().fg(rgb(PAL_GOLD))),
            Span::styled(status_glyph, Style::default().fg(name_color)),
            Span::styled(" ", Style::default()),
            Span::styled(branch_icon, Style::default().fg(name_color)),
            Span::styled(format!(" {}{}", skill.name, passive), Style::default().fg(name_color)),
        ]))
    }).collect();

    f.render_widget(
        List::new(items)
            .block(Block::default()
                .title(Span::styled(
                    format!(" ✦ Skills  SP:{}  · Enter:learn  S:close ", game.player.skill_points),
                    Style::default().fg(rgb(PAL_BORDER_LIT)),
                ))
                .borders(Borders::ALL)
                .border_style(Style::default().fg(rgb(PAL_BORDER)))
                .style(Style::default().bg(rgb(PAL_BG)))),
        chunks[0],
    );

    if let Some(skill) = skills.get(game.skill_selection) {
        let color = if skill.learned { Color::Rgb(80,220,100) } else if skill.unlocked { Color::Rgb(200,180,80) } else { Color::Rgb(80,80,100) };
        let branch_color = match skill.branch {
            SkillBranch::Warrior   => Color::Rgb(220,80,80),
            SkillBranch::Mage      => Color::Rgb(180,80,240),
            SkillBranch::Rogue     => Color::Rgb(80,200,120),
            SkillBranch::Universal => Color::Rgb(200,160,80),
            SkillBranch::Knight    => Color::Rgb(100,160,220),
            SkillBranch::Shaman    => Color::Rgb(180,100,200),
            SkillBranch::Alchemist => Color::Rgb(100,200,180),
        };
        let branch_name = match skill.branch {
            SkillBranch::Warrior   => "⚔  Warrior Path",
            SkillBranch::Mage      => "★  Arcane Path",
            SkillBranch::Rogue     => "✦  Shadow Path",
            SkillBranch::Universal => "◉  Universal",
            SkillBranch::Knight    => "🛡  Knight Path",
            SkillBranch::Shaman    => "☽  Shaman Path",
            SkillBranch::Alchemist => "⚗  Alchemist Path",
        };
        let mut lines = vec![
            Line::from(Span::styled(skill.name.clone(), Style::default().fg(color).add_modifier(Modifier::BOLD))),
            Line::from(Span::styled(branch_name, Style::default().fg(branch_color))),
            Line::from(Span::styled("─".repeat(24), Style::default().fg(rgb(PAL_BORDER)))),
            Line::from(Span::styled(skill.description.clone(), Style::default().fg(Color::Rgb(160,160,180)))),
            Line::from(""),
        ];
        if !skill.is_passive {
            lines.push(Line::from(vec![
                Span::styled(" ♦ MP cost  ", Style::default().fg(rgb(PAL_BORDER_LIT))),
                Span::styled(format!("{}", skill.mp_cost), Style::default().fg(rgb(PAL_MP_BAR))),
            ]));
            lines.push(Line::from(vec![
                Span::styled(" ⏳ Cooldown ", Style::default().fg(rgb(PAL_BORDER_LIT))),
                Span::styled(format!("{} turns", skill.cooldown), Style::default().fg(Color::Rgb(180,160,80))),
            ]));
        } else {
            lines.push(Line::from(Span::styled(" ◈ Passive — always active", Style::default().fg(Color::Rgb(80,200,140)))));
        }
        if let Some(prereq) = skill.prerequisite {
            if prereq < skills.len() {
                lines.push(Line::from(vec![
                    Span::styled(" ← Requires  ", Style::default().fg(rgb(PAL_BORDER_LIT))),
                    Span::styled(skills[prereq].name.clone(), Style::default().fg(Color::Rgb(150,150,160))),
                ]));
            }
        }
        lines.push(Line::from(Span::styled("─".repeat(24), Style::default().fg(rgb(PAL_BORDER)))));
        if skill.learned {
            lines.push(Line::from(Span::styled(" ✓  LEARNED", Style::default().fg(Color::Rgb(80,230,110)).add_modifier(Modifier::BOLD))));
        } else if skill.unlocked && game.player.skill_points > 0 {
            lines.push(Line::from(Span::styled(" ▶  Press Enter to learn (1 SP)", Style::default().fg(rgb(PAL_GOLD)))));
        } else if game.player.skill_points == 0 {
            lines.push(Line::from(Span::styled(" ✕  No skill points remaining", Style::default().fg(Color::Rgb(200,60,60)))));
        } else {
            lines.push(Line::from(Span::styled(" ✕  LOCKED — meet prerequisites", Style::default().fg(rgb(PAL_BORDER)))));
        }

        f.render_widget(
            Paragraph::new(lines)
                .block(dark_block("Skill Detail"))
                .style(Style::default().bg(rgb(PAL_BG)))
                .wrap(Wrap { trim: false }),
            chunks[1],
        );
    }
}

// ── Crafting ──────────────────────────────────────────────────────────────────
fn render_crafting(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    let recipes: Vec<ListItem> = CRAFTING_RECIPES.iter().enumerate().map(|(i, recipe)| {
        let selected = i == game.craft_selection;
        let can_craft = recipe.ingredients.iter().all(|(mat_type, count)| {
            game.player.inventory.iter().filter(|item| item.material_type.as_deref() == Some(mat_type)).count() as u32 >= *count
        });
        let prefix = if selected { "▶ " } else { "  " };
        let color  = if can_craft { Color::Rgb(80, 220, 100) } else { Color::Rgb(60, 60, 70) };
        let icon   = if can_craft { "⚒" } else { "·" };
        ListItem::new(Line::from(vec![
            Span::styled(prefix, Style::default().fg(rgb(PAL_GOLD))),
            Span::styled(icon, Style::default().fg(color)),
            Span::styled(format!(" {}", recipe.name), Style::default().fg(color)),
        ]))
    }).collect();

    f.render_widget(
        List::new(recipes)
            .block(Block::default()
                .title(Span::styled(
                    " ⚒  Crafting Anvil  · Enter:craft  c:close ",
                    Style::default().fg(rgb(PAL_BORDER_LIT)),
                ))
                .borders(Borders::ALL)
                .border_style(Style::default().fg(rgb(PAL_BORDER)))
                .style(Style::default().bg(rgb(PAL_BG)))),
        chunks[0],
    );

    if let Some(recipe) = CRAFTING_RECIPES.get(game.craft_selection) {
        let mut lines = vec![
            Line::from(Span::styled(recipe.name, Style::default().fg(rgb(PAL_GOLD)).add_modifier(Modifier::BOLD))),
            Line::from(Span::styled(recipe.result_description, Style::default().fg(Color::Rgb(140,140,160)))),
            Line::from(Span::styled("─".repeat(22), Style::default().fg(rgb(PAL_BORDER)))),
            Line::from(Span::styled(" Ingredients:", Style::default().fg(rgb(PAL_BORDER_LIT)))),
        ];

        for (mat_type, count) in recipe.ingredients {
            let have = game.player.inventory.iter()
                .filter(|item| item.material_type.as_deref() == Some(mat_type))
                .count() as u32;
            let ok    = have >= *count;
            let color = if ok { Color::Rgb(80,200,100) } else { Color::Rgb(200,60,60) };
            let icon  = if ok { "✓" } else { "✕" };
            lines.push(Line::from(vec![
                Span::styled(format!("  {} ", icon), Style::default().fg(color)),
                Span::styled(format!("{} x{}", mat_type, count), Style::default().fg(Color::Rgb(160,160,180))),
                Span::styled(format!(" ({})", have), Style::default().fg(color)),
            ]));
        }

        lines.push(Line::from(Span::styled("─".repeat(22), Style::default().fg(rgb(PAL_BORDER)))));
        lines.push(Line::from(Span::styled(" Inventory materials:", Style::default().fg(rgb(PAL_BORDER_LIT)))));
        let mut mat_counts: std::collections::HashMap<&str, u32> = std::collections::HashMap::new();
        for item in &game.player.inventory {
            if let Some(ref mt) = item.material_type {
                *mat_counts.entry(mt.as_str()).or_insert(0) += 1;
            }
        }
        for (mat, count) in &mat_counts {
            lines.push(Line::from(vec![
                Span::styled("  ◇ ", Style::default().fg(rgb(PAL_BORDER_LIT))),
                Span::styled(format!("{} x{}", mat, count), Style::default().fg(Color::Rgb(140,140,160))),
            ]));
        }

        f.render_widget(
            Paragraph::new(lines)
                .block(dark_block("Recipe"))
                .style(Style::default().bg(rgb(PAL_BG)))
                .wrap(Wrap { trim: false }),
            chunks[1],
        );
    }
}

// ── Random event ──────────────────────────────────────────────────────────────
fn render_event(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);

    if let Some(event) = &game.current_event {
        let choice_h  = (event.choices.len() * 3 + 4).min(area.height as usize / 2) as u16;
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(6), Constraint::Length(choice_h)])
            .split(area);

        f.render_widget(
            Paragraph::new(vec![
                Line::from(Span::styled(format!("  ◈  {}  ◈", event.title), Style::default().fg(rgb(PAL_GOLD)).add_modifier(Modifier::BOLD))),
                Line::from(Span::styled("─".repeat(60), Style::default().fg(rgb(PAL_BORDER)))),
                Line::from(""),
                Line::from(Span::styled(&event.description, Style::default().fg(Color::Rgb(200,200,220)))),
            ])
            .block(Block::default()
                .title(Span::styled(" ✦  Random Event  — This choice is IRREVERSIBLE ", Style::default().fg(rgb(PAL_GOLD))))
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Rgb(180,80,80))))
            .style(Style::default().bg(rgb(PAL_BG)))
            .wrap(Wrap { trim: false }),
            chunks[0],
        );

        let items: Vec<ListItem> = event.choices.iter().enumerate().map(|(i, choice)| {
            let selected   = i == game.event_selection;
            let prefix     = if selected { "▶  " } else { "   " };
            let risk_badge = if choice.is_risky { " ⚠" } else { "" };
            let label_col  = if selected { rgb(PAL_GOLD) } else { Color::Rgb(180,180,200) };
            ListItem::new(vec![
                Line::from(vec![
                    Span::styled(prefix, Style::default().fg(rgb(PAL_GOLD))),
                    Span::styled(format!("{}{}", choice.label, risk_badge), Style::default().fg(label_col).add_modifier(Modifier::BOLD)),
                ]),
                Line::from(vec![
                    Span::styled("     ", Style::default()),
                    Span::styled(choice.description.clone(), Style::default().fg(Color::Rgb(100,100,120))),
                ]),
            ])
        }).collect();

        f.render_widget(
            List::new(items)
                .block(Block::default()
                    .title(Span::styled(" ↑↓ navigate · Enter confirm ", Style::default().fg(rgb(PAL_BORDER_LIT))))
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(Color::Rgb(140,40,40))))
                .style(Style::default().bg(rgb(PAL_BG))),
            chunks[1],
        );
    }
}

// ── Level up ──────────────────────────────────────────────────────────────────
fn render_levelup(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);
    let p = &game.player;

    let lines = vec![
        Line::from(""),
        Line::from(Span::styled("  ✦  L E V E L   U P  ✦", Style::default().fg(rgb(PAL_GOLD)).add_modifier(Modifier::BOLD))),
        Line::from(Span::styled("  ─────────────────────", Style::default().fg(rgb(PAL_BORDER)))),
        Line::from(""),
        Line::from(Span::styled(format!("  ◈  Level {}", p.level), Style::default().fg(Color::Rgb(160,160,255)))),
        Line::from(""),
        Line::from(vec![
            Span::styled("  ♥ HP  ", Style::default().fg(Color::Rgb(80,200,100))),
            Span::styled(format!("{}", p.max_hp), Style::default().fg(Color::Rgb(200,240,200))),
        ]),
        Line::from(vec![
            Span::styled("  ♦ MP  ", Style::default().fg(rgb(PAL_MP_BAR))),
            Span::styled(format!("{}", p.max_mp), Style::default().fg(Color::Rgb(180,200,255))),
        ]),
        Line::from(vec![
            Span::styled("  ⚔ ATK ", Style::default().fg(Color::Rgb(220,80,80))),
            Span::styled(format!("{}", p.effective_attack()), Style::default().fg(Color::Rgb(255,200,150))),
        ]),
        Line::from(""),
        Line::from(vec![
            Span::styled("  ✦ Skill Points  ", Style::default().fg(rgb(PAL_BORDER_LIT))),
            Span::styled(format!("{} (+2)", p.skill_points), Style::default().fg(rgb(PAL_EXP_BAR)).add_modifier(Modifier::BOLD)),
        ]),
        Line::from(""),
        Line::from(Span::styled("  Press any key to continue…", Style::default().fg(rgb(PAL_BORDER)))),
    ];

    let w = area.width.min(34);
    let h = 16u16;
    let popup = Rect {
        x: area.x + (area.width.saturating_sub(w)) / 2,
        y: area.y + (area.height.saturating_sub(h)) / 2,
        width: w, height: h,
    };
    f.render_widget(
        Paragraph::new(lines)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(rgb(PAL_GOLD))))
            .style(Style::default().bg(Color::Rgb(8, 8, 18))),
        popup,
    );
}

// ── Death screen ──────────────────────────────────────────────────────────────
fn render_death(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);
    let p = &game.player;

    let lines = vec![
        Line::from(""),
        Line::from(Span::styled(
            "  ╔══════════════════════════════════╗",
            Style::default().fg(Color::Rgb(120,20,20)),
        )),
        Line::from(Span::styled(
            "  ║  ░░░ Y O U   D I E D ░░░       ║",
            Style::default().fg(Color::Rgb(200,30,30)).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            "  ╚══════════════════════════════════╝",
            Style::default().fg(Color::Rgb(120,20,20)),
        )),
        Line::from(""),
        Line::from(Span::styled(
            format!("  Floor reached  ·  {} / {} (deepest)", p.floor, p.deepest_floor),
            Style::default().fg(Color::Rgb(160,80,80)),
        )),
        Line::from(Span::styled(
            format!("  Level {}  ·  {} turns", p.level, game.turn),
            Style::default().fg(Color::Rgb(120,70,70)),
        )),
        Line::from(Span::styled("  ─────────────────────────────────────", Style::default().fg(rgb(PAL_BORDER)))),
        Line::from(Span::styled(
            format!("  ⚔  Monsters slain    {}", p.monsters_killed),
            Style::default().fg(Color::Rgb(160,80,80)),
        )),
        Line::from(Span::styled(
            format!("  ◈  Items collected   {}", p.items_collected),
            Style::default().fg(Color::Rgb(140,100,60)),
        )),
        Line::from(Span::styled(
            format!("  ✦  Skills learned    {}", p.skills.iter().filter(|s| s.learned).count()),
            Style::default().fg(Color::Rgb(120,80,140)),
        )),
        Line::from(Span::styled(
            format!("  ☠  Bestiary entries  {}/12", p.bestiary.len()),
            Style::default().fg(Color::Rgb(120,120,140)),
        )),
        Line::from(""),
        Line::from(Span::styled("  Press q to quit.", Style::default().fg(rgb(PAL_BORDER)))),
    ];

    f.render_widget(
        Paragraph::new(lines)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Rgb(100,20,20))))
            .style(Style::default().bg(rgb(PAL_BG))),
        area,
    );
}

// ── Victory screen ────────────────────────────────────────────────────────────
fn render_victory(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);
    let p = &game.player;

    let lines = vec![
        Line::from(""),
        Line::from(Span::styled(
            "  ✦═══════════════════════════════════✦",
            Style::default().fg(rgb(PAL_GOLD)),
        )),
        Line::from(Span::styled(
            "        V  I  C  T  O  R  Y  !",
            Style::default().fg(rgb(PAL_GOLD)).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            "  ✦═══════════════════════════════════✦",
            Style::default().fg(rgb(PAL_GOLD)),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  You have conquered the Dungeon!",
            Style::default().fg(Color::Rgb(200,230,200)),
        )),
        Line::from(""),
        Line::from(Span::styled(format!("  ◈  Final Level   {}", p.level),        Style::default().fg(Color::Rgb(160,160,255)))),
        Line::from(Span::styled(format!("  ⚔  Monsters     {}", p.monsters_killed), Style::default().fg(Color::Rgb(220,100,100)))),
        Line::from(Span::styled(format!("  ◆  Items found  {}", p.items_collected), Style::default().fg(rgb(PAL_GOLD)))),
        Line::from(Span::styled(format!("  ★  Skills       {}", p.skills.iter().filter(|s| s.learned).count()), Style::default().fg(Color::Rgb(200,100,255)))),
        Line::from(Span::styled(format!("  ☠  Bestiary     {}/12", p.bestiary.len()), Style::default().fg(Color::Rgb(160,160,200)))),
        Line::from(Span::styled(format!("  ⏳  Turns taken  {}", game.turn),         Style::default().fg(Color::Rgb(120,140,180)))),
        Line::from(""),
        Line::from(Span::styled("  Press q to quit.", Style::default().fg(rgb(PAL_BORDER)))),
    ];

    f.render_widget(
        Paragraph::new(lines)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(rgb(PAL_GOLD))))
            .style(Style::default().bg(Color::Rgb(8, 10, 8))),
        area,
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
fn item_glyph(ch: char) -> &'static str {
    match ch {
        '/' => "†",
        '[' => "≡",
        '^' => "◬",
        'b' => "⊤",
        'o' => "◎",
        '"' => "⌂",
        '!' => "⌥",
        '*' => "◇",
        '?' => "§",
        _   => "·",
    }
}

fn trim_str(s: &str, max: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= max {
        s.to_string()
    } else {
        format!("{}…", chars[..max-1].iter().collect::<String>())
    }
}

// ── Help overlay ──────────────────────────────────────────────────────────────
fn render_help(f: &mut Frame, area: Rect) {
    // Semi-transparent dark backdrop
    f.render_widget(
        Paragraph::new("").style(Style::default().bg(Color::Rgb(4, 4, 10))),
        area,
    );

    let w = area.width.min(72);
    let h = area.height.min(40);
    let popup = Rect {
        x: area.x + (area.width.saturating_sub(w)) / 2,
        y: area.y + (area.height.saturating_sub(h)) / 2,
        width: w, height: h,
    };

    fn sec(label: &'static str) -> Line<'static> {
        Line::from(vec![
            Span::styled("  ", Style::default()),
            Span::styled(label, Style::default()
                .fg(Color::Rgb(60, 100, 140))
                .add_modifier(Modifier::BOLD)),
        ])
    }
    fn row(keys: &'static str, desc: &'static str) -> Line<'static> {
        Line::from(vec![
            Span::styled(format!("  {:<24}", keys), Style::default().fg(Color::Rgb(190, 170, 110))),
            Span::styled(desc, Style::default().fg(Color::Rgb(110, 120, 140))),
        ])
    }
    fn div() -> Line<'static> {
        Line::from(Span::styled(
            format!("  {}", "─".repeat(62)),
            Style::default().fg(Color::Rgb(30, 40, 55)),
        ))
    }

    let lines: Vec<Line> = vec![
        Line::from(""),
        Line::from(Span::styled(
            "   ✦  CONTROLS  ✦   press any key to close",
            Style::default().fg(Color::Rgb(220, 170, 50)).add_modifier(Modifier::BOLD),
        )),
        div(),
        Line::from(""),
        sec("MOVEMENT"),
        row("WASD  /  Arrow Keys",   "Move up · left · down · right"),
        row("Y U B N",               "Diagonal (↖ ↗ ↙ ↘)"),
        row(".  or  5",              "Wait one turn (let enemies act)"),
        Line::from(""),
        div(),
        sec("INTERACTION"),
        row("G",                     "Pick up item  /  open chest (◆)"),
        row(">",                     "Descend stairs (≫)"),
        row("<",                     "Ascend stairs (≪)"),
        row("E  (on ✦)",             "Activate shrine — random blessing"),
        row("C  (on ⚒)",             "Open crafting menu at anvil"),
        Line::from(""),
        div(),
        sec("COMBAT  &  SKILLS"),
        row("Move into enemy",       "Attack that enemy"),
        row("1 · 2 · 3 · 4",        "Use skill in hotbar slot"),
        row("S  (shift+s)",          "Open skill tree — spend skill points"),
        Line::from(""),
        div(),
        sec("INVENTORY"),
        row("I",                     "Open inventory"),
        row("↑ ↓  (in inventory)",   "Select item"),
        row("Enter  or  U",          "Use / drink / equip item"),
        row("E  (in inventory)",     "Equip highlighted item"),
        row("D",                     "Drop item on floor"),
        Line::from(""),
        div(),
        sec("MAP LEGEND"),
        row("@  Player    ·  Floor   ▓ Wall",  ""),
        row("≫  Stairs↓   ≪  Stairs↑",         ""),
        row("⚒  Crafting  ✦  Shrine   ◆  Chest",""),
        row("†≡⌥◇§  Items on floor",            "rarity: gray/green/blue/purple/gold"),
        Line::from(""),
        div(),
        row("?",                     "Toggle this help screen"),
        row("Q",                     "Quit game"),
        Line::from(""),
    ];

    f.render_widget(
        Paragraph::new(lines)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Rgb(45, 60, 85))))
            .style(Style::default().bg(Color::Rgb(6, 7, 14))),
        popup,
    );
}

// ── Start skill selection ─────────────────────────────────────────────────────
fn render_start_skill_select(f: &mut Frame, game: &Game, area: Rect) {
    f.render_widget(Paragraph::new("").style(Style::default().bg(rgb(PAL_BG))), area);

    let pw = area.width.min(64);
    let ph = area.height.min(44);
    let popup = Rect {
        x: area.x + (area.width.saturating_sub(pw)) / 2,
        y: area.y + (area.height.saturating_sub(ph)) / 2,
        width: pw, height: ph,
    };
    let options = game.start_skill_options();

    let title_line = Line::from(vec![
        Span::styled("── スタータースキルを選択 ──", Style::default().fg(Color::Rgb(255, 220, 80)).add_modifier(Modifier::BOLD)),
    ]);
    let hint_line = Line::from(Span::styled(
        "↑↓ 選択  Enter 決定",
        Style::default().fg(Color::Rgb(100, 120, 160)),
    ));

    let mut lines: Vec<Line> = vec![title_line, Line::from(""), Line::from(
        Span::styled("ゲーム開始前に1つのスキルを無料で習得できます。", Style::default().fg(Color::Rgb(180, 180, 200)))
    ), Line::from("")];

    for (row, &skill_idx) in options.iter().enumerate() {
        let skill = &game.player.skills[skill_idx];
        let selected = row == game.start_skill_cursor;
        let branch_icon = match skill.branch {
            SkillBranch::Warrior   => "⚔",
            SkillBranch::Mage      => "★",
            SkillBranch::Rogue     => "✦",
            SkillBranch::Universal => "◉",
            SkillBranch::Knight    => "🛡",
            SkillBranch::Shaman    => "☽",
            SkillBranch::Alchemist => "⚗",
        };
        let branch_color = match skill.branch {
            SkillBranch::Warrior   => Color::Rgb(220, 80, 80),
            SkillBranch::Mage      => Color::Rgb(100, 160, 255),
            SkillBranch::Rogue     => Color::Rgb(180, 100, 220),
            SkillBranch::Universal => Color::Rgb(80, 200, 200),
            SkillBranch::Knight    => Color::Rgb(220, 180, 60),
            SkillBranch::Shaman    => Color::Rgb(140, 90, 180),
            SkillBranch::Alchemist => Color::Rgb(80, 200, 120),
        };
        let prefix = if selected { "▶ " } else { "  " };
        let bg = if selected { Color::Rgb(30, 40, 60) } else { Color::Reset };
        let name_style = Style::default().fg(if selected { Color::Rgb(255, 240, 120) } else { Color::Rgb(220, 220, 220) }).bg(bg);
        let passive_tag = if skill.is_passive { " [パッシブ]" } else { "" };
        lines.push(Line::from(vec![
            Span::raw(prefix),
            Span::styled(format!("{} ", branch_icon), Style::default().fg(branch_color).bg(bg)),
            Span::styled(format!("{}{}", skill.name, passive_tag), name_style),
        ]));
        lines.push(Line::from(vec![
            Span::raw("    "),
            Span::styled(&skill.description, Style::default().fg(Color::Rgb(140, 160, 180))),
        ]));
        lines.push(Line::from(""));
    }

    lines.push(hint_line);

    f.render_widget(
        Paragraph::new(lines)
            .block(Block::default()
                .borders(Borders::ALL)
                .title(" 初期スキル選択 ")
                .border_style(Style::default().fg(Color::Rgb(255, 200, 60))))
            .style(Style::default().bg(Color::Rgb(8, 10, 18))),
        popup,
    );
}
