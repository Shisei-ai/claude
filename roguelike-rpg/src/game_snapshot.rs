use serde::Serialize;
use crate::game::{Game, GameMode};
use crate::map::{Tile, MAP_WIDTH, MAP_HEIGHT};
use crate::item::CRAFTING_RECIPES;
use crate::floor_graph::FloorId;

#[derive(Serialize)]
pub struct TileSnap {
    pub t: u8,   // tile type
    pub v: bool, // visible
    pub e: bool, // explored
}

#[derive(Serialize)]
pub struct MonsterSnap {
    pub kind: String,
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub poisoned: bool,
    pub stunned: bool,
}

#[derive(Serialize)]
pub struct FloorItemSnap {
    pub kind: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub rarity: String,
}

#[derive(Serialize)]
pub struct MsgSnap {
    pub text: String,
    pub kind: String,
}

#[derive(Serialize)]
pub struct InvItemSnap {
    pub idx: usize,
    pub name: String,
    pub kind: String,
    pub rarity: String,
    pub equipped: bool,
    pub desc: String,
    pub atk: i32,
    pub def: i32,
    pub hp: i32,
    pub mp: i32,
}

#[derive(Serialize)]
pub struct SkillSnap {
    pub id: usize,
    pub name: String,
    pub desc: String,
    pub learned: bool,
    pub unlocked: bool,
    pub branch: String,
    pub passive: bool,
    pub mp_cost: i32,
    pub cooldown: u32,
    pub cd_left: u32,
    pub sp_cost: u32,
}

#[derive(Serialize)]
pub struct EventSnap {
    pub title: String,
    pub desc: String,
    pub choices: Vec<String>,
    pub selected: usize,
    pub irreversible: bool,
}

#[derive(Serialize)]
pub struct RecipeSnap {
    pub name: String,
    pub ingredients: Vec<String>,
    pub can_craft: bool,
}

#[derive(Serialize)]
pub struct HotbarSlot {
    pub name: String,
    pub cd_left: u32,
    pub cooldown: u32,
    pub mp_cost: i32,
}

#[derive(Serialize)]
pub struct BattleSkillSnap {
    pub id: usize,
    pub name: String,
    pub mp_cost: i32,
    pub cd_left: u32,
}

#[derive(Serialize)]
pub struct BattleItemSnap {
    pub idx: usize,
    pub name: String,
}

#[derive(Serialize)]
pub struct BattleSnap {
    pub enemy_kind: String,
    pub enemy_name: String,
    pub enemy_hp: i32,
    pub enemy_max_hp: i32,
    pub enemy_poisoned: bool,
    pub enemy_stunned: bool,
    pub menu: usize,
    pub sub_mode: u8,
    pub sub_cursor: usize,
    pub log: Vec<MsgSnap>,
    pub turn: u32,
    pub active_skills: Vec<BattleSkillSnap>,
    pub consumables: Vec<BattleItemSnap>,
    pub last_player_action: Option<String>,
    pub last_enemy_action: Option<String>,
    pub turn_order: String,
    pub player_speed: i32,
    pub enemy_speed: i32,
    pub is_victory_effect: bool,
}

#[derive(Serialize)]
pub struct RewardEntrySnap {
    pub category: String,
    pub name: String,
    pub is_cursed: bool,
}

#[derive(Serialize)]
pub struct FloorMapNodeSnap {
    pub id: FloorId,
    pub depth: u32,
    pub floor_type: String,
    pub is_current: bool,
    pub is_boss: bool,
    pub col: usize,   // X position among siblings at this depth
    pub siblings: usize, // total floors at this depth
}

#[derive(Serialize)]
pub struct FloorMapEdgeSnap {
    pub from: FloorId,
    pub to: FloorId,
}

#[derive(Serialize)]
pub struct FloorMapSnap {
    pub nodes: Vec<FloorMapNodeSnap>,
    pub edges: Vec<FloorMapEdgeSnap>,
    pub current_depth: u32,
}

#[derive(Serialize)]
pub struct RelicFloorSnap {
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub is_cursed: bool,
}

#[derive(Serialize)]
pub struct PlayerRelicSnap {
    pub name: String,
    pub is_cursed: bool,
    pub description: String,
}

#[derive(Serialize)]
pub struct GameSnapshot {
    pub mode: String,
    pub floor: u32,
    pub floor_type: String,
    pub turn: u64,
    pub map_w: usize,
    pub map_h: usize,
    pub tiles: Vec<TileSnap>,
    pub px: i32,
    pub py: i32,
    pub monsters: Vec<MonsterSnap>,
    pub items: Vec<FloorItemSnap>,
    pub hp: i32,
    pub max_hp: i32,
    pub mp: i32,
    pub max_mp: i32,
    pub shield: i32,
    pub level: u32,
    pub exp: u32,
    pub exp_next: u32,
    pub gold: u32,
    pub atk: i32,
    pub def: i32,
    pub skill_pts: u32,
    pub poison: u32,
    pub stun: u32,
    pub eq_weapon: Option<String>,
    pub eq_armor: Option<String>,
    pub eq_helmet: Option<String>,
    pub eq_boots: Option<String>,
    pub eq_ring: Option<String>,
    pub eq_amulet: Option<String>,
    pub messages: Vec<MsgSnap>,
    pub inventory: Vec<InvItemSnap>,
    pub inv_cursor: usize,
    pub skills: Vec<SkillSnap>,
    pub skill_cursor: usize,
    pub event: Option<EventSnap>,
    pub recipes: Vec<RecipeSnap>,
    pub craft_cursor: usize,
    pub hotbar: Vec<Option<HotbarSlot>>,
    pub cursed: bool,
    pub blessed: bool,
    pub battle: Option<BattleSnap>,
    pub floor_relics: Vec<RelicFloorSnap>,
    pub player_relics: Vec<PlayerRelicSnap>,
    pub battle_reward: Option<Vec<RewardEntrySnap>>,
    pub floor_map: Option<FloorMapSnap>,
    pub reward_skill_cursor: usize,
    pub reward_learnable_skills: Vec<SkillSnap>,
    pub start_skill_options: Vec<SkillSnap>,
    pub start_skill_cursor: usize,
    pub ending_announcement: Option<[String; 3]>, // [title, flavor, body]
    pub victory_ending: Option<String>,
    pub is_final_floor: bool,
    pub tile_hint: Option<String>,
}

fn tile_id(t: Tile) -> u8 {
    match t {
        Tile::Void          => 0,
        Tile::Wall          => 1,
        Tile::Floor         => 2,
        Tile::Door          => 3,
        Tile::StairsDown    => 4,
        Tile::StairsUp      => 5,
        Tile::CraftingAnvil => 6,
        Tile::Shrine        => 7,
        Tile::Chest         => 8,
        Tile::Tablet        => 9,
    }
}

impl GameSnapshot {
    pub fn from_game(game: &Game) -> Self {
        let tiles: Vec<TileSnap> = (0..MAP_HEIGHT).flat_map(|y| {
            (0..MAP_WIDTH).map(move |x| {
                TileSnap {
                    t: tile_id(game.map.tiles[x][y]),
                    v: game.map.visible[x][y],
                    e: game.map.explored[x][y],
                }
            })
        }).collect();

        let vis = |x: i32, y: i32| -> bool {
            if x < 0 || y < 0 || x >= MAP_WIDTH as i32 || y >= MAP_HEIGHT as i32 { return false; }
            game.map.visible[x as usize][y as usize]
        };

        let monsters: Vec<MonsterSnap> = game.monsters.iter()
            .filter(|m| vis(m.x, m.y))
            .map(|m| {
                use crate::monster::StatusEffect;
                let poisoned = m.status_effects.iter().any(|s| matches!(s, StatusEffect::Poisoned{..}));
                let stunned  = m.status_effects.iter().any(|s| matches!(s, StatusEffect::Stunned{..}));
                MonsterSnap {
                    kind: format!("{:?}", m.kind),
                    x: m.x, y: m.y,
                    hp: m.hp, max_hp: m.max_hp,
                    poisoned, stunned,
                }
            })
            .collect();

        let floor_items: Vec<FloorItemSnap> = game.floor_items.iter()
            .filter(|(x, y, _)| vis(*x, *y))
            .map(|(x, y, item)| FloorItemSnap {
                kind: format!("{:?}", item.kind),
                name: item.name.clone(),
                x: *x, y: *y,
                rarity: format!("{:?}", item.rarity),
            })
            .collect();

        let messages: Vec<MsgSnap> = game.messages.iter().rev().take(14).rev()
            .map(|(text, kind)| MsgSnap {
                text: text.clone(),
                kind: format!("{:?}", kind),
            })
            .collect();

        let eq = &game.player.equipment;
        let equipped_ids: Vec<u64> = [&eq.weapon, &eq.armor, &eq.helmet, &eq.boots, &eq.ring, &eq.amulet]
            .iter().filter_map(|s| s.as_ref()).map(|i| i.id).collect();

        let inventory: Vec<InvItemSnap> = game.player.inventory.iter().enumerate()
            .map(|(idx, item)| InvItemSnap {
                idx,
                name: item.name.clone(),
                kind: format!("{:?}", item.kind),
                rarity: format!("{:?}", item.rarity),
                equipped: equipped_ids.contains(&item.id),
                desc: item.description.clone(),
                atk: item.stats.attack,
                def: item.stats.defense,
                hp: item.stats.hp_bonus,
                mp: item.stats.mp_bonus,
            })
            .collect();

        let skills: Vec<SkillSnap> = game.player.skills.iter()
            .map(|s| {
                let prereq_met = s.prerequisite
                    .and_then(|pid| game.player.skills.get(pid))
                    .map(|p| p.learned)
                    .unwrap_or(true);
                SkillSnap {
                    id: s.id,
                    name: s.name.clone(),
                    desc: s.description.clone(),
                    learned: s.learned,
                    unlocked: prereq_met,
                    branch: format!("{:?}", s.branch),
                    passive: s.is_passive,
                    mp_cost: s.mp_cost,
                    cooldown: s.cooldown,
                    cd_left: s.current_cooldown,
                    sp_cost: s.sp_cost,
                }
            })
            .collect();

        let event = game.current_event.as_ref().map(|e| EventSnap {
            title: e.title.clone(),
            desc: e.description.clone(),
            choices: e.choices.iter().map(|c| c.description.clone()).collect(),
            selected: game.event_selection,
            irreversible: e.is_irreversible,
        });

        let recipes: Vec<RecipeSnap> = CRAFTING_RECIPES.iter()
            .map(|r| {
                let can_craft = r.ingredients.iter().all(|(mat, cnt)| {
                    game.player.inventory.iter()
                        .filter(|i| i.material_type.as_deref() == Some(*mat))
                        .count() >= *cnt as usize
                });
                RecipeSnap {
                    name: r.name.to_string(),
                    ingredients: r.ingredients.iter()
                        .map(|(n, c)| format!("{} ×{}", n, c))
                        .collect(),
                    can_craft,
                }
            })
            .collect();

        // Hotbar: first 4 learned active skills
        let active_skills: Vec<&crate::skill::Skill> = game.player.skills.iter()
            .filter(|s| s.learned && !s.is_passive)
            .take(4)
            .collect();
        let hotbar: Vec<Option<HotbarSlot>> = (0..4)
            .map(|i| active_skills.get(i).map(|s| HotbarSlot {
                name: s.name.clone(),
                cd_left: s.current_cooldown,
                cooldown: s.cooldown,
                mp_cost: s.mp_cost,
            }))
            .collect();

        let mode_str = match game.mode {
            GameMode::StartSkillSelect    => "StartSkillSelect",
            GameMode::EndingAnnouncement  => "EndingAnnouncement",
            GameMode::Exploring     => "Exploring",
            GameMode::Help          => "Help",
            GameMode::Battle        => "Battle",
            GameMode::BattleVictoryEffect => "BattleVictoryEffect",
            GameMode::BattleReward  => "BattleReward",
            GameMode::FloorMap      => "FloorMap",
            GameMode::Inventory     => "Inventory",
            GameMode::Skills        => "Skills",
            GameMode::Crafting      => "Crafting",
            GameMode::Event         => "Event",
            GameMode::Dead          => "Dead",
            GameMode::Victory       => "Victory",
            GameMode::LevelUp       => "LevelUp",
        }.to_string();

        let is_victory_effect = game.mode == crate::game::GameMode::BattleVictoryEffect;
        let battle = if matches!(game.mode, crate::game::GameMode::Battle | crate::game::GameMode::BattleVictoryEffect) {
            game.battle_enemy_idx.and_then(|idx| {
                game.monsters.get(idx).map(|m| {
                    use crate::monster::StatusEffect;
                    let poisoned = m.status_effects.iter().any(|s| matches!(s, StatusEffect::Poisoned{..}));
                    let stunned  = m.status_effects.iter().any(|s| matches!(s, StatusEffect::Stunned{..}));
                    let active_skills: Vec<BattleSkillSnap> = game.player.skills.iter()
                        .enumerate()
                        .filter(|(_, s)| s.learned && !s.is_passive)
                        .map(|(i, s)| BattleSkillSnap {
                            id: i,
                            name: s.name.clone(),
                            mp_cost: s.mp_cost,
                            cd_left: s.current_cooldown,
                        })
                        .collect();
                    let consumables: Vec<BattleItemSnap> = game.player.inventory.iter()
                        .enumerate()
                        .filter(|(_, it)| it.kind == crate::item::ItemKind::Consumable)
                        .map(|(i, it)| BattleItemSnap { idx: i, name: it.name.clone() })
                        .collect();
                    let log: Vec<MsgSnap> = game.battle_log.iter().rev().take(5).rev()
                        .map(|(t, k)| MsgSnap { text: t.clone(), kind: format!("{:?}", k) })
                        .collect();
                    BattleSnap {
                        enemy_kind: format!("{:?}", m.kind),
                        enemy_name: m.kind.name().to_string(),
                        enemy_hp: m.hp,
                        enemy_max_hp: m.max_hp,
                        enemy_poisoned: poisoned,
                        enemy_stunned: stunned,
                        menu: game.battle_menu,
                        sub_mode: game.battle_sub_mode,
                        sub_cursor: game.battle_sub_cursor,
                        log,
                        turn: game.battle_turn,
                        active_skills,
                        consumables,
                        last_player_action: game.battle_last_player_action.clone(),
                        last_enemy_action: game.battle_last_enemy_action.clone(),
                        turn_order: game.battle_turn_order.clone(),
                        player_speed: game.battle_player_speed,
                        enemy_speed: game.battle_enemy_speed,
                        is_victory_effect,
                    }
                })
            })
        } else {
            None
        };

        let floor_relics: Vec<RelicFloorSnap> = game.floor_relics.iter()
            .filter(|(x, y, _)| vis(*x, *y))
            .map(|(x, y, r)| RelicFloorSnap {
                name: r.name.clone(),
                x: *x, y: *y,
                is_cursed: r.is_cursed,
            })
            .collect();

        let player_relics: Vec<PlayerRelicSnap> = game.player.relics.iter()
            .map(|r| PlayerRelicSnap {
                name: r.name.clone(),
                is_cursed: r.is_cursed,
                description: r.description.clone(),
            })
            .collect();

        // ── Floor map (for stone tablet view) ─────────────────────────────────
        let floor_map = if game.mode == GameMode::FloorMap {
            let current_id = game.current_floor_id;
            let current_depth = game.floor_graph.depth_of(current_id);
            let show_from = current_depth.saturating_sub(1);
            let show_to   = current_depth + 3;

            let mut nodes: Vec<FloorMapNodeSnap> = Vec::new();
            let mut edges: Vec<FloorMapEdgeSnap> = Vec::new();

            for depth in show_from..=show_to {
                let siblings = game.floor_graph.floors_at_depth(depth);
                let total = siblings.len();
                for (col, &id) in siblings.iter().enumerate() {
                    let node = match game.floor_graph.get_node(id) { Some(n) => n, None => continue };
                    nodes.push(FloorMapNodeSnap {
                        id,
                        depth,
                        floor_type: node.floor_type.name().to_string(),
                        is_current: id == current_id,
                        is_boss: depth % 5 == 0,
                        col,
                        siblings: total,
                    });
                    for &exit_id in &node.exits {
                        let exit_depth = game.floor_graph.depth_of(exit_id);
                        if exit_depth <= show_to {
                            edges.push(FloorMapEdgeSnap { from: id, to: exit_id });
                        }
                    }
                }
            }
            Some(FloorMapSnap { nodes, edges, current_depth })
        } else { None };

        let battle_reward = if game.mode == GameMode::BattleReward {
            Some(game.pending_rewards.iter().map(|r| RewardEntrySnap {
                category: r.category.clone(),
                name: r.name.clone(),
                is_cursed: r.is_cursed,
            }).collect())
        } else {
            None
        };

        let reward_learnable_skills: Vec<SkillSnap> = if game.mode == GameMode::BattleReward {
            game.player.skills.iter()
                .filter(|s| s.unlocked && !s.learned)
                .map(|s| SkillSnap {
                    id: s.id,
                    name: s.name.clone(),
                    desc: s.description.clone(),
                    learned: s.learned,
                    unlocked: s.unlocked,
                    branch: format!("{:?}", s.branch),
                    passive: s.is_passive,
                    mp_cost: s.mp_cost,
                    cooldown: s.cooldown,
                    cd_left: s.current_cooldown,
                    sp_cost: s.sp_cost,
                })
                .collect()
        } else {
            Vec::new()
        };

        let start_skill_options: Vec<SkillSnap> = {
            let indices = game.start_skill_options();
            indices.iter().map(|&i| {
                let s = &game.player.skills[i];
                SkillSnap {
                    id: s.id,
                    name: s.name.clone(),
                    desc: s.description.clone(),
                    learned: s.learned,
                    unlocked: s.unlocked,
                    branch: format!("{:?}", s.branch),
                    passive: s.is_passive,
                    mp_cost: s.mp_cost,
                    cooldown: s.cooldown,
                    cd_left: s.current_cooldown,
                    sp_cost: s.sp_cost,
                }
            }).collect()
        };

        GameSnapshot {
            mode: mode_str,
            floor: game.player.floor,
            floor_type: game.map.floor_type.name().to_string(),
            turn: game.turn,
            map_w: MAP_WIDTH,
            map_h: MAP_HEIGHT,
            tiles,
            px: game.player.x, py: game.player.y,
            monsters,
            items: floor_items,
            hp: game.player.hp, max_hp: game.player.max_hp,
            mp: game.player.mp, max_mp: game.player.max_mp,
            shield: game.player.shield_hp,
            level: game.player.level,
            exp: game.player.exp, exp_next: game.player.exp_to_next,
            gold: game.player.gold,
            atk: game.player.effective_attack(),
            def: game.player.effective_defense(),
            skill_pts: game.player.skill_points,
            poison: game.player.poison_turns,
            stun: game.player.stun_turns,
            eq_weapon:  eq.weapon.as_ref().map(|i| i.name.clone()),
            eq_armor:   eq.armor.as_ref().map(|i| i.name.clone()),
            eq_helmet:  eq.helmet.as_ref().map(|i| i.name.clone()),
            eq_boots:   eq.boots.as_ref().map(|i| i.name.clone()),
            eq_ring:    eq.ring.as_ref().map(|i| i.name.clone()),
            eq_amulet:  eq.amulet.as_ref().map(|i| i.name.clone()),
            messages,
            inventory,
            inv_cursor: game.inv_selection,
            skills,
            skill_cursor: game.skill_selection,
            event,
            recipes,
            craft_cursor: game.craft_selection,
            hotbar,
            cursed: game.cursed_floor,
            blessed: game.blessed_floor,
            battle,
            floor_relics,
            player_relics,
            battle_reward,
            floor_map,
            reward_skill_cursor: game.reward_skill_cursor,
            reward_learnable_skills,
            start_skill_options,
            start_skill_cursor: game.start_skill_cursor,
            ending_announcement: game.ending_announcement.as_ref().map(|(t, f, b)| {
                [t.clone(), f.clone(), b.clone()]
            }),
            victory_ending: game.victory_ending.clone(),
            is_final_floor: game.is_final_floor,
            tile_hint: {
                let px = game.player.x as usize;
                let py = game.player.y as usize;
                match game.map.tiles[px][py] {
                    Tile::StairsDown    => Some("F / Enter  ─  次のフロアへ降りる".into()),
                    Tile::StairsUp      => Some("F / Enter  ─  上のフロアへ戻る".into()),
                    Tile::Tablet        => Some("F / Enter / M  ─  石板を読む".into()),
                    Tile::CraftingAnvil => Some("F / Enter  ─  鍛冶台を使う".into()),
                    Tile::Shrine        => Some("F / Enter  ─  祠に祈る".into()),
                    Tile::Chest         => Some("F / Enter  ─  宝箱を開ける".into()),
                    _ => {
                        // floor item on same tile?
                        if game.floor_items.iter().any(|(ix, iy, _)| *ix == game.player.x && *iy == game.player.y) {
                            Some("F / Enter  ─  アイテムを拾う".into())
                        } else {
                            None
                        }
                    }
                }
            },
        }
    }
}
