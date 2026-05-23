use rand::Rng;
use crate::map::{Map, Tile, FloorType};
use crate::player::Player;
use crate::monster::{Monster, AiState};
use crate::item::{Item, ItemKind, ConsumableEffect, generate_floor_item, generate_weapon, generate_armor, generate_material};
use crate::skill::{SkillEffect};
use crate::event::{RandomEvent, EventConsequence, generate_floor_event};
use crate::relic::{Relic, RelicEffect, random_relic};
use crate::floor_graph::{FloorGraph, FloorId};

pub const MSG_LOG_SIZE: usize = 100;
pub const INVENTORY_MAX: usize = 30;
pub const FOV_RADIUS: i32 = 8;

#[derive(Clone, PartialEq, Eq)]
pub enum GameMode {
    StartSkillSelect,
    Exploring,
    Help,
    Battle,
    BattleVictoryEffect, // 敵撃破エフェクト演出（→ BattleReward へ）
    BattleReward,
    FloorMap,
    Inventory,
    Skills,
    Crafting,
    Event,
    Dead,
    Victory,
    LevelUp,
    EndingAnnouncement, // エンディング秘宝入手時の演出
}

#[derive(Clone)]
pub struct RewardEntry {
    pub category: String, // "exp", "gold", "material", "weapon", "armor", "relic", "cursed"
    pub name: String,
    pub is_cursed: bool,
}

pub struct Game {
    pub map: Map,
    pub player: Player,
    pub monsters: Vec<Monster>,
    pub floor_items: Vec<(i32, i32, Item)>,
    pub floor_relics: Vec<(i32, i32, Relic)>,
    pub messages: Vec<(String, MessageKind)>,
    pub mode: GameMode,
    pub rng: rand::rngs::ThreadRng,
    pub current_event: Option<RandomEvent>,
    pub inv_selection: usize,
    pub skill_selection: usize,
    pub craft_selection: usize,
    pub event_selection: usize,
    pub turn: u64,
    pub cursed_floor: bool,
    pub blessed_floor: bool,
    pub floor_exp_mult: f32,
    pub show_map_revealed: bool,
    pub battle_enemy_idx: Option<usize>,
    pub battle_menu: usize,       // 0=Attack 1=Skill 2=Item 3=Run
    pub battle_sub_mode: u8,      // 0=main 1=skill-select 2=item-select
    pub battle_sub_cursor: usize,
    pub battle_log: Vec<(String, MessageKind)>,
    pub battle_turn: u32,
    pub battle_last_player_action: Option<String>,
    pub battle_last_enemy_action: Option<String>,
    pub battle_turn_order: String,   // "player_first" | "enemy_first"
    pub battle_player_speed: i32,
    pub battle_enemy_speed: i32,
    pub collection_unlocked: Vec<String>,
    pub camera_x: i32,
    pub camera_y: i32,
    pub pending_rewards: Vec<RewardEntry>,
    pub reward_skill_cursor: usize,
    pub start_skill_cursor: usize,
    // ── マルチエンディング ───────────────────────────────────────────────────────
    /// 獲得したエンディング秘宝のボス種別（"abyss"/"flame"/"ice"/"chaos"/"ancient"）
    pub ending_boss_type: Option<String>,
    /// 最終ボスフロアにいるか
    pub is_final_floor: bool,
    /// クリア時のエンディング種別（Victoryモードで参照）
    pub victory_ending: Option<String>,
    /// エンディング秘宝入手時の演出テキスト (タイトル, フレーバー, 本文)
    pub ending_announcement: Option<(String, String, String)>,
    // ── Floor graph ──────────────────────────────────────────────────────────
    pub floor_graph: FloorGraph,
    pub current_floor_id: FloorId,
    /// Maps staircase tile positions to destination floor IDs.
    pub stair_destinations: Vec<(i32, i32, FloorId)>,
    /// Destination to load after a transition event resolves.
    pub pending_floor_id: Option<FloorId>,
}

#[derive(Clone, PartialEq, Eq)]
#[derive(Debug)]
pub enum MessageKind {
    Normal,
    Combat,
    Loot,
    System,
    Event,
    Warning,
    Good,
}

impl Game {
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();
        let floor_graph = FloorGraph::new(&mut rng);

        // Placeholder map/player — overwritten immediately by load_floor_by_id
        let map = Map::new(1, FloorType::Exploration);
        let player = Player::new(0, 0);

        let mut game = Game {
            map,
            player,
            monsters: Vec::new(),
            floor_items: Vec::new(),
            floor_relics: Vec::new(),
            messages: Vec::new(),
            mode: GameMode::StartSkillSelect,
            rng,
            current_event: None,
            inv_selection: 0,
            skill_selection: 0,
            craft_selection: 0,
            event_selection: 0,
            turn: 0,
            cursed_floor: false,
            blessed_floor: false,
            floor_exp_mult: 1.0,
            show_map_revealed: false,
            battle_enemy_idx: None,
            battle_menu: 0,
            battle_sub_mode: 0,
            battle_sub_cursor: 0,
            battle_log: Vec::new(),
            battle_turn: 0,
            battle_last_player_action: None,
            battle_last_enemy_action: None,
            battle_turn_order: "player_first".to_string(),
            battle_player_speed: 0,
            battle_enemy_speed: 0,
            collection_unlocked: Vec::new(),
            camera_x: 0,
            camera_y: 0,
            pending_rewards: Vec::new(),
            reward_skill_cursor: 0,
            start_skill_cursor: 0,
            ending_boss_type: None,
            is_final_floor: false,
            victory_ending: None,
            ending_announcement: None,
            floor_graph,
            current_floor_id: 1,
            stair_destinations: Vec::new(),
            pending_floor_id: None,
        };

        game.load_floor_by_id(1);
        game.add_message("ダンジョンへようこそ！（? でヘルプ、m で石板を読む）", MessageKind::System);
        game
    }

    /// Returns the skill indices that appear on the start-skill selection screen.
    /// One entry per branch: the first (lowest ID) unlocked skill with no prerequisite.
    pub fn start_skill_options(&self) -> Vec<usize> {
        use crate::skill::SkillBranch;
        let order = [
            SkillBranch::Warrior,
            SkillBranch::Mage,
            SkillBranch::Rogue,
            SkillBranch::Knight,
            SkillBranch::Shaman,
            SkillBranch::Alchemist,
            SkillBranch::Universal,
        ];
        order.iter().filter_map(|branch| {
            self.player.skills.iter().position(|s| {
                &s.branch == branch && s.unlocked && s.prerequisite.is_none()
            })
        }).collect()
    }

    pub fn confirm_start_skill(&mut self) {
        let options = self.start_skill_options();
        if let Some(&skill_idx) = options.get(self.start_skill_cursor) {
            let name = self.player.skills[skill_idx].name.clone();
            self.player.skills[skill_idx].learned = true;
            // Unlock next-tier skills that have this as prerequisite
            for i in 0..self.player.skills.len() {
                if self.player.skills[i].prerequisite == Some(skill_idx) {
                    self.player.skills[i].unlocked = true;
                }
            }
            self.add_message(format!("【スタータースキル】「{}」を習得した！", name), MessageKind::Good);
            self.update_stats();
        }
        self.mode = GameMode::Exploring;
    }

    /// エンディング秘宝を入手したときの処理。
    /// 演出テキストをセットして EndingAnnouncement モードに遷移する。
    pub fn apply_ending_relic(&mut self, relic_id: usize) {
        use crate::relic::ending_relic;
        let relic = ending_relic(relic_id);
        let boss_key = match &relic.effect {
            crate::relic::RelicEffect::EndingBoss(k) => k.clone(),
            _ => return,
        };
        let (title, flavor, body) = match boss_key.as_str() {
            "abyss" => (
                "【深淵の目醒め】".to_string(),
                "深淵がお前を見つめている――".to_string(),
                format!(
                    "「{}」を手に入れた。\n虚無の王「深淵の支配者」が最終試練として君臨する。\n光すら届かぬ闇の底で、お前を待ち受けている。",
                    relic.name
                ),
            ),
            "flame" => (
                "【炎帝の審判】".to_string(),
                "炎よ、汝は選ばれた者か――".to_string(),
                format!(
                    "「{}」を手に入れた。\n炎神「炎帝アグニ」が最終試練として降臨する。\n世界を焼き尽くす炎の化身が、お前の真の力を試す。",
                    relic.name
                ),
            ),
            "ice" => (
                "【永遠の冬の到来】".to_string(),
                "すべてが凍りつく――時間すらも――".to_string(),
                format!(
                    "「{}」を手に入れた。\n氷の支配者「フリゲル女王」が最終試練として目醒める。\n永遠の冬を統べる者が、お前の熱を奪いに来る。",
                    relic.name
                ),
            ),
            "chaos" => (
                "【混沌の夜明け】".to_string(),
                "秩序は崩れ、混沌が支配する――".to_string(),
                format!(
                    "「{}」を手に入れた。\n「混沌の化身」が最終試練として具現化する。\n理の外に存在する者が、お前の理性を飲み込もうとしている。",
                    relic.name
                ),
            ),
            "ancient" => (
                "【古代の番人の覚醒】".to_string(),
                "千年の眠りが覚める――".to_string(),
                format!(
                    "「{}」を手に入れた。\n太古の守護者「ゴルゴン」が最終試練として復活する。\n文明の黎明期から眠る番人が、お前の資格を問う。",
                    relic.name
                ),
            ),
            _ => return,
        };

        self.ending_boss_type = Some(boss_key);
        self.player.relics.push(relic.clone());
        self.add_message(format!("【エンディング秘宝】「{}」を手に入れた！最終ボスが変わる！", relic.name), MessageKind::Good);
        self.ending_announcement = Some((title, flavor, body));
        self.mode = GameMode::EndingAnnouncement;
    }

    /// 最終ボスフロアをロードして、対応する最終ボスをスポーンする。
    fn load_final_boss_floor(&mut self) {
        use crate::map::FloorType;
        use crate::monster::spawn_final_boss;

        self.is_final_floor = true;
        self.monsters.clear();
        self.floor_items.clear();
        self.floor_relics.clear();

        // MiniBoss型のマップを生成（コンパクト）
        self.map = crate::map::Map::new(30, FloorType::MiniBoss);
        let (px, py, _stairs) = self.map.generate(&mut self.rng, 0);
        self.player.x = px;
        self.player.y = py;
        self.player.floor = 30;
        self.camera_x = px - 40;
        self.camera_y = py - 22;

        // ボスを最後の部屋の中央にスポーン
        if let Some(boss_room) = self.map.rooms.last() {
            let (bx, by) = boss_room.center();
            let boss = spawn_final_boss(self.ending_boss_type.as_deref(), bx, by);
            let boss_name = boss.kind.name().to_string();
            self.monsters.push(boss);
            self.add_message(
                format!("【最終決戦】{}が現れた！！", boss_name),
                MessageKind::Warning,
            );
        }

        // 視界を更新
        self.map.compute_fov(self.player.x, self.player.y, crate::game::FOV_RADIUS);
    }

    pub fn add_message(&mut self, msg: impl Into<String>, kind: MessageKind) {
        let s = msg.into();
        self.messages.push((s, kind));
        if self.messages.len() > MSG_LOG_SIZE {
            self.messages.remove(0);
        }
    }

    fn spawn_floor_content(&mut self) {
        match self.map.floor_type {
            FloorType::Exploration => self.spawn_exploration(),
            FloorType::Treasury    => self.spawn_treasury(),
            FloorType::MiniBoss    => self.spawn_miniboss(),
            FloorType::Horde       => self.spawn_horde(),
            FloorType::Trial       => self.spawn_trial(),
            FloorType::Sanctuary   => self.spawn_sanctuary(),
            FloorType::Cursed      => self.spawn_cursed(),
        }
    }

    // ── Exploration ───────────────────────────────────────────────────────────
    fn spawn_exploration(&mut self) {
        let floor = self.map.floor;
        let num_monsters = 5 + floor as usize + self.rng.gen_range(0..4);
        let num_items = 3 + self.rng.gen_range(0..3);
        let rooms = self.map.rooms.clone();
        let ps = (self.player.x, self.player.y);

        for room in rooms.iter().skip(1) {
            if self.monsters.len() >= num_monsters { break; }
            let (cx, cy) = room.center();
            if (cx - ps.0).abs() + (cy - ps.1).abs() < 5 { continue; }
            let is_boss = floor >= 5 && self.rng.gen_range(0..15) == 0;
            self.monsters.push(crate::monster::spawn_monster(&mut self.rng, cx, cy, floor, is_boss));
            for _ in 0..self.rng.gen_range(0..3) {
                if self.monsters.len() >= num_monsters { break; }
                let ox = cx + self.rng.gen_range(-2..=2);
                let oy = cy + self.rng.gen_range(-1..=1);
                if self.map.is_walkable(ox, oy) {
                    self.monsters.push(crate::monster::spawn_monster(&mut self.rng, ox, oy, floor, false));
                }
            }
        }
        for room in rooms.iter().skip(1) {
            if self.floor_items.len() >= num_items { break; }
            if self.rng.gen_range(0..3) == 0 {
                let (cx, cy) = room.center();
                let item = generate_floor_item(&mut self.rng, floor);
                self.floor_items.push((cx + 1, cy, item));
            }
        }
        self.spawn_relic_in_random_room(1);
    }

    // ── Treasury ──────────────────────────────────────────────────────────────
    // Few elite guardians, lots of chests (already placed by map gen), no relic.
    fn spawn_treasury(&mut self) {
        let floor = self.map.floor;
        let num_guards = 2 + self.rng.gen_range(0..3usize);
        let rooms = self.map.rooms.clone();
        let ps = (self.player.x, self.player.y);

        // Guardians: elite enemies in rooms other than start
        let mut spawned = 0;
        for room in rooms.iter().skip(1).rev() {
            if spawned >= num_guards { break; }
            let (cx, cy) = room.center();
            if (cx - ps.0).abs() + (cy - ps.1).abs() < 3 { continue; }
            // All guardians are boss-tier on this floor
            self.monsters.push(crate::monster::spawn_monster(&mut self.rng, cx, cy, floor, true));
            spawned += 1;
        }
        // No loose items — rewards come from chests
    }

    // ── MiniBoss ──────────────────────────────────────────────────────────────
    // 1 boss in the last room + a few minions. Reward item near boss spawn.
    fn spawn_miniboss(&mut self) {
        let floor = self.map.floor;
        let rooms = self.map.rooms.clone();

        // Boss in last room
        if let Some(boss_room) = rooms.last() {
            let (bx, by) = boss_room.center();
            self.monsters.push(crate::monster::spawn_monster(&mut self.rng, bx, by, floor, true));
            // 2-4 minions scattered in the boss room
            let num_minions = 2 + self.rng.gen_range(0..3usize);
            for _ in 0..num_minions {
                let mx = bx + self.rng.gen_range(-2..=2);
                let my = by + self.rng.gen_range(-1..=1);
                if self.map.is_walkable(mx, my) && self.monster_at(mx, my).is_none() {
                    self.monsters.push(crate::monster::spawn_monster(&mut self.rng, mx, my, floor, false));
                }
            }
            // Guaranteed reward chest offset from center
            let cx = bx + 2;
            let cy = by;
            if self.map.is_walkable(cx, cy) {
                self.map.set(cx, cy, Tile::Chest);
            }
        }
        // A relic in a non-boss room as well
        self.spawn_relic_in_random_room(1);
    }

    // ── Horde ─────────────────────────────────────────────────────────────────
    // Many weak enemies, minimal items.
    fn spawn_horde(&mut self) {
        let floor = self.map.floor;
        let num_monsters = 15 + floor as usize + self.rng.gen_range(0..8);
        let rooms = self.map.rooms.clone();
        let ps = (self.player.x, self.player.y);

        for room in rooms.iter().skip(1) {
            if self.monsters.len() >= num_monsters { break; }
            let (cx, cy) = room.center();
            if (cx - ps.0).abs() + (cy - ps.1).abs() < 4 { continue; }
            // Pack of 2-5 weak enemies per room
            let pack = 2 + self.rng.gen_range(0..4usize);
            for i in 0..pack {
                if self.monsters.len() >= num_monsters { break; }
                let ox = cx + (i as i32 % 3) - 1;
                let oy = cy + (i as i32 / 3) - 1;
                if self.map.is_walkable(ox, oy) {
                    self.monsters.push(crate::monster::spawn_monster(&mut self.rng, ox, oy, floor, false));
                }
            }
        }
        // Small item scatter (rewards mainly from kills)
        if let Some(room) = rooms.get(rooms.len().saturating_sub(2)) {
            let (cx, cy) = room.center();
            let item = generate_floor_item(&mut self.rng, floor);
            self.floor_items.push((cx, cy, item));
        }
    }

    // ── Trial ─────────────────────────────────────────────────────────────────
    // No enemies. Multiple shrines (placed by map gen). No items, no relics.
    fn spawn_trial(&mut self) {
        // All content comes from shrines — nothing to spawn here
    }

    // ── Sanctuary ─────────────────────────────────────────────────────────────
    // No enemies. Heal player on entry. 1 item + 1 relic to pick up.
    fn spawn_sanctuary(&mut self) {
        let floor = self.map.floor;
        // Full HP/MP restore
        self.player.hp = self.player.max_hp;
        self.player.mp = self.player.max_mp;
        self.player.poison_turns = 0;
        self.player.stun_turns = 0;
        self.add_message("聖域に踏み入れた。体力が全回復した！", MessageKind::Good);

        let rooms = self.map.rooms.clone();
        // 1-2 items in corner rooms
        let num_items = 1 + self.rng.gen_range(0..2usize);
        for room in rooms.iter().skip(1) {
            if self.floor_items.len() >= num_items { break; }
            let (cx, cy) = room.center();
            let item = generate_floor_item(&mut self.rng, floor);
            self.floor_items.push((cx + 1, cy + 1, item));
        }
        self.spawn_relic_in_random_room(1);
    }

    // ── Cursed ────────────────────────────────────────────────────────────────
    // Powered-up enemies, more relics (mixed), better item drops.
    fn spawn_cursed(&mut self) {
        let floor = self.map.floor;
        self.cursed_floor = true;
        let num_monsters = 8 + floor as usize + self.rng.gen_range(0..5);
        let num_items = 4 + self.rng.gen_range(0..3);
        let rooms = self.map.rooms.clone();
        let ps = (self.player.x, self.player.y);

        for room in rooms.iter().skip(1) {
            if self.monsters.len() >= num_monsters { break; }
            let (cx, cy) = room.center();
            if (cx - ps.0).abs() + (cy - ps.1).abs() < 5 { continue; }
            // Higher boss spawn rate on cursed floor
            let is_boss = floor >= 3 && self.rng.gen_range(0..8) == 0;
            self.monsters.push(crate::monster::spawn_monster(&mut self.rng, cx, cy, floor + 2, is_boss));
            for _ in 0..self.rng.gen_range(0..3) {
                if self.monsters.len() >= num_monsters { break; }
                let ox = cx + self.rng.gen_range(-2..=2);
                let oy = cy + self.rng.gen_range(-1..=1);
                if self.map.is_walkable(ox, oy) {
                    self.monsters.push(crate::monster::spawn_monster(&mut self.rng, ox, oy, floor + 1, false));
                }
            }
        }
        for room in rooms.iter().skip(1) {
            if self.floor_items.len() >= num_items { break; }
            if self.rng.gen_range(0..2) == 0 {
                let (cx, cy) = room.center();
                let item = generate_floor_item(&mut self.rng, floor);
                self.floor_items.push((cx + 1, cy, item));
            }
        }
        // 2 relics — at least one cursed
        self.spawn_relic_in_random_room(1);
        if rooms.len() > 3 {
            // Force a cursed relic in the last room
            if let Some(room) = rooms.last() {
                let (cx, cy) = room.center();
                let mut relic = random_relic(&mut self.rng, floor);
                while !relic.is_cursed { relic = random_relic(&mut self.rng, floor); }
                self.floor_relics.push((cx - 1, cy + 1, relic));
            }
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────
    fn spawn_relic_in_random_room(&mut self, skip: usize) {
        let rooms = self.map.rooms.clone();
        if rooms.len() <= skip + 1 { return; }
        let room_idx = self.rng.gen_range(skip..rooms.len());
        let (cx, cy) = rooms[room_idx].center();
        let relic = random_relic(&mut self.rng, self.map.floor);
        self.floor_relics.push((cx - 1, cy + 1, relic));
    }

    pub fn player_move(&mut self, dx: i32, dy: i32) -> bool {
        if !self.player.can_move() {
            self.add_message("スタン状態！", MessageKind::Warning);
            self.end_player_turn();
            return true;
        }

        let nx = self.player.x + dx;
        let ny = self.player.y + dy;

        // Check for monster at target → enter battle
        if let Some(idx) = self.monster_at(nx, ny) {
            let name = self.monsters[idx].kind.name().to_string();
            self.battle_enemy_idx = Some(idx);
            self.battle_menu = 0;
            self.battle_sub_mode = 0;
            self.battle_sub_cursor = 0;
            self.battle_log.clear();
            self.battle_turn = 0;
            self.battle_last_player_action = None;
            self.battle_last_enemy_action = None;
            self.battle_turn_order = "player_first".to_string();
            self.battle_player_speed = self.player.base_dex;
            self.battle_enemy_speed = self.monsters[idx].speed;
            self.battle_log.push((format!("⚔ {} appeared!", name), MessageKind::Event));
            self.mode = GameMode::Battle;
            return true;
        }

        // TurnSkipChance: 亡霊の鎖による行動不能
        let skip_chance = self.player.relic_turn_skip_chance();
        if skip_chance > 0 && self.rng.gen_range(0..100) < skip_chance {
            self.add_message("亡霊の鎖に囚われ、動けない！", MessageKind::Warning);
            self.end_player_turn();
            return true;
        }

        if self.map.is_walkable(nx, ny) {
            self.player.x = nx;
            self.player.y = ny;
            self.player.steps_taken += 1;
            self.map.compute_fov(self.player.x, self.player.y, FOV_RADIUS);
            self.update_camera();

            // StepHpDrain: 餓鬼の縄
            if let Some((every, drain)) = self.player.relic_step_drain() {
                if every > 0 && self.player.steps_taken % every == 0 {
                    self.player.hp = (self.player.hp - drain).max(0);
                    self.add_message(format!("餓鬼の縄が締め上がる…HP-{}！", drain), MessageKind::Warning);
                }
            }

            // Auto-pick logic: display items under player
            if let Some(idx) = self.item_at(nx, ny) {
                let (_, _, ref item) = self.floor_items[idx];
                let name = item.name.clone();
                self.add_message(format!("発見：{}", name), MessageKind::Normal);
            }

            // Auto-acquire relic
            self.try_pickup_relic(nx, ny);

            // Check tile interaction
            match self.map.get(nx, ny) {
                Tile::StairsDown => {
                    self.add_message("[F/Enter] で次のフロアへ降りる", MessageKind::System);
                }
                Tile::Tablet => {
                    self.add_message("石板 — [F/Enter/m] でフロア分岐地図を読む", MessageKind::System);
                }
                Tile::CraftingAnvil => {
                    self.add_message("鍛冶台！[F/Enter] でクラフト", MessageKind::System);
                }
                Tile::Shrine => {
                    self.add_message("古代の祠！[F/Enter] で祈る", MessageKind::System);
                }
                Tile::Chest => {
                    self.add_message("宝箱！[F/Enter] で開ける", MessageKind::System);
                }
                _ => {}
            }

            self.end_player_turn();
            true
        } else {
            false
        }
    }

    fn update_camera(&mut self) {
        self.camera_x = self.player.x;
        self.camera_y = self.player.y;
    }

    pub fn pickup_item(&mut self) {
        let px = self.player.x;
        let py = self.player.y;

        // Check for chest
        if self.map.get(px, py) == Tile::Chest {
            self.map.set(px, py, Tile::Floor);
            let num_items = self.rng.gen_range(1..=3);
            for _ in 0..num_items {
                let item = generate_floor_item(&mut self.rng, self.map.floor);
                let name = item.name.clone();
                if self.player.inventory.len() < INVENTORY_MAX {
                    self.player.inventory.push(item);
                    self.player.items_collected += 1;
                    self.add_message(format!("宝箱を開けた！{}を入手", name), MessageKind::Loot);
                }
            }
            return;
        }

        if let Some(idx) = self.item_at(px, py) {
            if self.player.inventory.len() >= INVENTORY_MAX {
                self.add_message("インベントリがいっぱい！", MessageKind::Warning);
                return;
            }
            let (_, _, item) = self.floor_items.remove(idx);
            let name = item.name.clone();
            self.player.inventory.push(item);
            self.player.items_collected += 1;
            self.add_message(format!("{}を拾った", name), MessageKind::Loot);
        } else {
            self.add_message("ここには何もない。", MessageKind::Normal);
        }
    }

    pub fn use_item(&mut self, idx: usize) {
        if idx >= self.player.inventory.len() {
            return;
        }

        let item = self.player.inventory[idx].clone();
        match item.kind {
            ItemKind::Consumable => {
                self.apply_consumable(idx);
            }
            ItemKind::SkillTome => {
                self.use_skill_tome(idx);
            }
            _ if item.is_equippable() => {
                self.player.equip(idx);
                self.update_stats();
                self.add_message(format!("{}を装備した", item.name), MessageKind::Loot);
            }
            _ => {
                self.add_message("このアイテムは使えない。", MessageKind::Warning);
            }
        }
        self.mode = GameMode::Exploring;
    }

    fn apply_consumable(&mut self, idx: usize) {
        let item = self.player.inventory.remove(idx);
        if let Some(effect) = item.consumable_effect {
            match effect {
                ConsumableEffect::HealHp(amount) => {
                    self.player.heal(amount);
                    self.add_message(format!("HP+{}回復！", amount), MessageKind::Good);
                }
                ConsumableEffect::HealMp(amount) => {
                    self.player.heal_mp(amount);
                    self.add_message(format!("MP+{}回復！", amount), MessageKind::Good);
                }
                ConsumableEffect::TempStrBoost(amount, turns) => {
                    self.player.temp_buffs.push(crate::player::TempBuff {
                        str_bonus: amount,
                        def_bonus: 0,
                        turns_left: turns,
                    });
                    self.add_message(format!("STR+{} ({}ターン)！", amount, turns), MessageKind::Good);
                }
                ConsumableEffect::TempDefBoost(amount, turns) => {
                    self.player.temp_buffs.push(crate::player::TempBuff {
                        str_bonus: 0,
                        def_bonus: amount,
                        turns_left: turns,
                    });
                    self.add_message(format!("DEF+{} ({}ターン)！", amount, turns), MessageKind::Good);
                }
                ConsumableEffect::Teleport => {
                    self.teleport_player();
                    self.add_message("ランダムな場所へ転送された！", MessageKind::System);
                }
                ConsumableEffect::RevealMap => {
                    self.show_map_revealed = true;
                    for x in 0..self.map.width {
                        for y in 0..self.map.height {
                            self.map.explored[x][y] = true;
                        }
                    }
                    self.add_message("このフロアのマップが解明された！", MessageKind::System);
                }
                ConsumableEffect::IdentifyItem => {
                    self.add_message("全アイテム鑑定済み！（既知）", MessageKind::System);
                }
                ConsumableEffect::PoisonResist(_) => {
                    self.player.poison_turns = 0;
                    self.add_message("毒が治った！", MessageKind::Good);
                }
            }
        }
        self.end_player_turn();
    }

    fn use_skill_tome(&mut self, idx: usize) {
        let item = self.player.inventory[idx].clone();
        if let Some(skill_id) = item.skill_tome_id {
            if skill_id < self.player.skills.len() {
                if self.player.skills[skill_id].learned {
                    self.add_message("このスキルは習得済みだ。", MessageKind::Warning);
                    return;
                }
                if !self.player.skills[skill_id].unlocked {
                    self.add_message("このスキルはまだ解放されていない。", MessageKind::Warning);
                    return;
                }
                let name = self.player.skills[skill_id].name.clone();
                self.player.skills[skill_id].learned = true;
                self.player.inventory.remove(idx);
                self.add_message(format!("スキル「{}」を習得！", name), MessageKind::Good);
                self.update_stats();
            }
        }
    }

    pub fn use_skill_in_combat(&mut self, skill_idx: usize) {
        if skill_idx >= self.player.skills.len() {
            return;
        }

        let skill = self.player.skills[skill_idx].clone();

        // 魔力枯渇: MP消費増加
        let mp_extra_pct = self.player.relic_mp_cost_multiplier();
        let actual_mp_cost = skill.mp_cost + (skill.mp_cost as f32 * mp_extra_pct as f32 / 100.0) as i32;

        let can_use = !skill.is_passive && skill.learned && skill.current_cooldown == 0
            && self.player.mp >= actual_mp_cost;
        if !can_use {
            if !skill.learned {
                self.add_message("スキルを習得していない！", MessageKind::Warning);
            } else if skill.current_cooldown > 0 {
                self.add_message(format!("クールダウン中：残り{}ターン", skill.current_cooldown), MessageKind::Warning);
            } else {
                self.add_message("MPが足りない！", MessageKind::Warning);
            }
            return;
        }

        self.player.mp -= actual_mp_cost;
        // 暗黒の封印: CD追加
        let cd_penalty = self.player.relic_cooldown_penalty();
        self.player.skills[skill_idx].current_cooldown = skill.cooldown + cd_penalty;
        self.player.skills_used += 1;

        // 血の石板: スキル使用時HP追加消費
        let hp_cost = self.player.relic_skill_hp_cost();
        if hp_cost > 0 {
            self.player.hp = (self.player.hp - hp_cost).max(0);
            self.add_message(format!("血の石板の代償…HP-{}！", hp_cost), MessageKind::Warning);
            if !self.player.is_alive() {
                let _ = self.check_revive();
            }
        }

        match skill.effect {
            SkillEffect::AttackMult(pct) => {
                if let Some(closest) = self.closest_monster() {
                    let base_dmg = self.player.effective_attack();
                    let dmg = (base_dmg as f32 * pct as f32 / 100.0) as i32;
                    let actual = self.monsters[closest].take_damage(dmg);
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}：{}に{}ダメージ！", skill.name, name, actual), MessageKind::Combat);
                    if !self.monsters[closest].is_alive() {
                        self.on_monster_death(closest);
                    }
                }
            }
            SkillEffect::AoeDamage(dmg) => {
                let magic = self.player.effective_magic();
                let total_dmg = dmg + magic / 3;
                let mut hit_count = 0;
                let px = self.player.x;
                let py = self.player.y;
                let dead: Vec<usize> = self.monsters.iter().enumerate()
                    .filter(|(_, m)| {
                        let d = (m.x - px).abs() + (m.y - py).abs();
                        d <= 5 && m.is_alive()
                    })
                    .map(|(i, _)| i)
                    .collect();
                for i in &dead {
                    self.monsters[*i].take_damage(total_dmg);
                    hit_count += 1;
                }
                self.add_message(format!("{}：敵{}体に魔法{}ダメージ！", skill.name, hit_count, total_dmg), MessageKind::Combat);
                for i in dead.into_iter().rev() {
                    if !self.monsters[i].is_alive() {
                        self.on_monster_death(i);
                    }
                }
            }
            SkillEffect::Heal(amount) => {
                self.player.heal(amount);
                self.add_message(format!("{}：HP+{}回復！", skill.name, amount), MessageKind::Good);
            }
            SkillEffect::MpHeal(amount) => {
                self.player.heal_mp(amount);
                self.add_message(format!("{}：MP+{}回復！", skill.name, amount), MessageKind::Good);
            }
            SkillEffect::Shield(amount, turns) => {
                self.player.shield_hp += amount;
                self.add_message(format!("{}：シールド+{}（{}ターン）！", skill.name, amount, turns), MessageKind::Good);
            }
            SkillEffect::DotPoison(dmg, turns) => {
                if let Some(closest) = self.closest_monster() {
                    self.monsters[closest].status_effects.push(
                        crate::monster::StatusEffect::Poisoned { damage: dmg, turns_left: turns }
                    );
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}：{}を毒状態に！({}/turn × {})", skill.name, name, dmg, turns), MessageKind::Combat);
                }
            }
            SkillEffect::Stun(turns) => {
                if let Some(closest) = self.closest_monster() {
                    self.monsters[closest].status_effects.push(
                        crate::monster::StatusEffect::Stunned { turns_left: turns }
                    );
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}：{}をスタン状態に！({}ターン)", skill.name, name, turns), MessageKind::Combat);
                }
            }
            SkillEffect::TeleportStrike => {
                if let Some(closest) = self.closest_monster() {
                    let dmg = self.player.effective_attack() * 2;
                    let actual = self.monsters[closest].take_damage(dmg);
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}：{}に瞬間移動攻撃{}ダメージ！（クリティカル）", skill.name, name, actual), MessageKind::Combat);
                    if !self.monsters[closest].is_alive() {
                        self.on_monster_death(closest);
                    }
                }
            }
            SkillEffect::DoubleAttack => {
                for _ in 0..2 {
                    if let Some(closest) = self.closest_monster() {
                        if self.monsters[closest].is_alive() {
                            let dmg = self.player.effective_attack();
                            let actual = self.monsters[closest].take_damage(dmg);
                            let name = self.monsters[closest].kind.name().to_string();
                            self.add_message(format!("{}：{}に{}ダメージ！", skill.name, name, actual), MessageKind::Combat);
                            if !self.monsters[closest].is_alive() {
                                self.on_monster_death(closest);
                            }
                        }
                    }
                }
            }
            SkillEffect::CritBoost(pct) => {
                self.player.crit_bonus = pct;
                self.player.crit_bonus_turns = 5;
                self.add_message(format!("{}：クリット率+{}%（5ターン）！", skill.name, pct), MessageKind::Good);
            }
            SkillEffect::SoulDrain(pct) => {
                if let Some(closest) = self.closest_monster() {
                    let base_dmg = self.player.effective_attack();
                    let dmg = (base_dmg as f32 * pct as f32 / 100.0) as i32;
                    let actual = self.monsters[closest].take_damage(dmg);
                    self.player.hp = (self.player.hp + actual).min(self.player.max_hp);
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}：{}から{}を吸収！HP+{}！", skill.name, name, actual, actual), MessageKind::Combat);
                    if !self.monsters[closest].is_alive() {
                        self.on_monster_death(closest);
                    }
                }
            }
            SkillEffect::AttackBuff(bonus, _turns) => {
                if let Some(closest) = self.closest_monster() {
                    let base_dmg = self.player.effective_attack() + bonus;
                    let actual = self.monsters[closest].take_damage(base_dmg);
                    let name = self.monsters[closest].kind.name().to_string();
                    self.add_message(format!("{}：{}に{}ダメージ！", skill.name, name, actual), MessageKind::Combat);
                    if !self.monsters[closest].is_alive() {
                        self.on_monster_death(closest);
                    }
                }
            }
            _ => {
                self.add_message(format!("{}：パッシブスキルのため使用不可。", skill.name), MessageKind::Warning);
            }
        }

        self.end_player_turn();
    }

    fn describe_crit(&mut self, is_crit: bool) -> &'static str {
        if is_crit { "必殺" } else { "攻撃" }
    }

    fn closest_monster(&self) -> Option<usize> {
        let px = self.player.x;
        let py = self.player.y;
        self.monsters.iter().enumerate()
            .filter(|(_, m)| m.is_alive())
            .min_by_key(|(_, m)| (m.x - px).abs() + (m.y - py).abs())
            .map(|(i, _)| i)
    }

    pub fn attack_monster(&mut self, idx: usize) {
        let is_crit = self.rng.gen_range(0..100) < self.player.crit_rate();
        let base_dmg = self.player.effective_attack() + self.rng.gen_range(0..5);
        let dmg = if is_crit { base_dmg * 2 } else { base_dmg };

        let actual = self.monsters[idx].take_damage(dmg);
        let name = self.monsters[idx].kind.name().to_string();

        // Lifesteal (スキル由来 + 秘宝由来)
        let ls_pct = self.player.lifesteal_pct + self.player.relic_lifesteal();
        if ls_pct > 0 {
            let heal = (actual as f32 * ls_pct as f32 / 100.0) as i32;
            self.player.heal(heal);
        }

        if is_crit {
            self.add_message(format!("クリティカル！{}に{}ダメージ！", name, actual), MessageKind::Combat);
        } else {
            self.add_message(format!("{}に{}ダメージ。", name, actual), MessageKind::Combat);
        }

        if !self.monsters[idx].is_alive() {
            self.on_monster_death(idx);
        }
    }

    fn on_monster_death(&mut self, idx: usize) {
        // Extract all data before any mutable borrows
        let name = self.monsters[idx].kind.name().to_string();
        let is_final = self.monsters[idx].kind.is_final_boss();
        let ending_key = self.monsters[idx].kind.ending_key().map(|s| s.to_string());
        let raw_exp = self.monsters[idx].exp_reward;
        let gold = self.monsters[idx].gold_reward;
        let drop_chance = self.monsters[idx].item_drop_chance;
        let x = self.monsters[idx].x;
        let y = self.monsters[idx].y;

        // 最終ボスを探索モード中に倒した場合もエンディングへ
        if is_final && self.is_final_floor {
            self.victory_ending = ending_key;
            self.monsters.remove(idx);
            self.mode = GameMode::Victory;
            self.add_message(format!("【ダンジョン制覇】{}を撃破した！勝利！", name), MessageKind::Good);
            return;
        }

        let mut exp = raw_exp;
        if self.blessed_floor {
            exp = (exp as f32 * 2.0) as u32;
        }
        if self.cursed_floor {
            exp = (exp as f32 * 1.5) as u32;
        }
        // 秘宝・呪物のEXP倍率
        exp = (exp as f32 * self.player.relic_exp_multiplier()) as u32;

        // 秘宝・呪物のゴールド倍率
        let actual_gold = (gold as f32 * self.player.relic_gold_multiplier()) as u32;

        self.add_message(format!("{}を倒した！EXP+{}、ゴールド+{}", name, exp, actual_gold), MessageKind::Good);

        self.player.monsters_killed += 1;
        self.player.add_to_bestiary(name.clone());

        let leveled = self.player.gain_exp(exp);
        self.player.gold += actual_gold;

        if leveled {
            self.add_message(format!("レベルアップ！ レベル{}になった！", self.player.level), MessageKind::Good);
            self.mode = GameMode::LevelUp;
            self.update_stats();
        }

        if self.rng.gen_range(0..100) < drop_chance {
            let item = generate_floor_item(&mut self.rng, self.map.floor);
            let iname = item.name.clone();
            self.add_message(format!("{}が{}を落とした！", name, iname), MessageKind::Loot);
            self.floor_items.push((x, y, item));
        }

        self.monsters.remove(idx);
    }

    fn update_stats(&mut self) {
        let new_max_hp = self.player.recalc_max_hp();
        let new_max_mp = self.player.recalc_max_mp();
        self.player.max_hp = new_max_hp;
        self.player.max_mp = new_max_mp;
        self.player.hp = self.player.hp.min(self.player.max_hp);
        self.player.mp = self.player.mp.min(self.player.max_mp);

        // Update lifesteal from skills (relic bonus is added at runtime in attack_monster)
        let ls: u32 = self.player.skills.iter()
            .filter(|s| s.learned && s.is_passive)
            .map(|s| match s.effect {
                SkillEffect::LifeSteal(pct) => pct,
                _ => 0,
            })
            .sum();
        self.player.lifesteal_pct = ls;
    }

    fn check_revive(&mut self) -> bool {
        if self.player.hp <= 0 && self.player.relic_revive_available && self.player.has_revive_relic() {
            self.player.hp = 1;
            self.player.relic_revive_available = false;
            self.add_message("不死鳥の羽が輝く！死の淵から甦った！", MessageKind::Good);
            return true;
        }
        false
    }

    fn end_player_turn(&mut self) {
        self.turn += 1;
        self.player.tick_buffs();
        self.player.tick_skill_cooldowns();

        // 疫病の壺: 毎ターン確率でダメージ
        let poison_chance = self.player.relic_turn_poison_chance();
        if poison_chance > 0 && self.rng.gen_range(0..100) < poison_chance {
            let dmg = 5i32;
            self.player.hp = (self.player.hp - dmg).max(0);
            self.add_message(format!("疫病の壺から毒が漏れる…HP-{}！", dmg), MessageKind::Warning);
        }

        if !self.player.is_alive() {
            if self.check_revive() { /* 復活 */ }
            else {
                self.mode = GameMode::Dead;
                self.add_message("あなたは力尽きた… ゲームオーバー。", MessageKind::Warning);
                return;
            }
        }

        self.run_monster_turns();

        if !self.player.is_alive() {
            if !self.check_revive() {
                self.mode = GameMode::Dead;
                self.add_message("あなたは力尽きた… ゲームオーバー。", MessageKind::Warning);
            }
        }
    }

    fn run_monster_turns(&mut self) {
        let px = self.player.x;
        let py = self.player.y;

        for i in 0..self.monsters.len() {
            if !self.monsters[i].is_alive() {
                continue;
            }

            // Tick status effects
            self.monsters[i].tick_status();
            if !self.monsters[i].is_alive() {
                continue;
            }

            // Skip if stunned
            if self.monsters[i].is_stunned() {
                continue;
            }

            let mx = self.monsters[i].x;
            let my = self.monsters[i].y;
            let dist = (mx - px).abs() + (my - py).abs();
            let visible = self.map.visible.get(mx as usize)
                .and_then(|col| col.get(my as usize))
                .copied()
                .unwrap_or(false);

            if visible || self.monsters[i].seen_player {
                self.monsters[i].seen_player = true;
                self.monsters[i].ai_state = AiState::Chasing;
            }

            if self.monsters[i].ai_state == AiState::Chasing {
                if dist <= 1 {
                    // Attack player
                    let atk = self.monsters[i].attack + self.rng.gen_range(0..4);
                    let curse_bonus = if self.cursed_floor { atk / 4 } else { 0 };
                    let dmg = self.player.take_damage(atk + curse_bonus);
                    let name = self.monsters[i].kind.name().to_string();
                    self.add_message(format!("{}の攻撃！{}ダメージ！", name, dmg), MessageKind::Combat);

                    // 貧乏神の祟り: ダメージ時ゴールド喪失
                    let gold_pct = self.player.relic_gold_on_damage();
                    if gold_pct > 0 && dmg > 0 {
                        let lost = ((self.player.gold as f32 * gold_pct as f32 / 100.0) as u32).max(1);
                        self.player.gold = self.player.gold.saturating_sub(lost);
                        self.add_message(format!("貧乏神の祟り！ゴールド-{}…", lost), MessageKind::Warning);
                    }

                    // 反射の盾: ダメージ反射
                    let reflect_pct = self.player.relic_damage_reflect();
                    if reflect_pct > 0 && dmg > 0 {
                        let reflect = ((dmg as f32 * reflect_pct as f32 / 100.0) as i32).max(1);
                        self.monsters[i].take_damage(reflect);
                        self.add_message(format!("反射の盾！{}に{}ダメージを反射！", name, reflect), MessageKind::Good);
                    }
                } else {
                    // Move toward player
                    let (nx, ny) = self.monsters[i].ai_move_toward(px, py);
                    let passable = self.map.is_walkable(nx, ny)
                        && self.monster_at(nx, ny).is_none()
                        && !(nx == px && ny == py);
                    if passable {
                        self.monsters[i].x = nx;
                        self.monsters[i].y = ny;
                    }
                }
            }
        }

        // Remove dead monsters
        self.monsters.retain(|m| m.is_alive());
    }

    pub fn descend(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        if self.map.get(px, py) != Tile::StairsDown {
            self.add_message("ここには階段がない。", MessageKind::Warning);
            return;
        }
        // Find which destination this staircase leads to
        let dest = self.stair_destinations.iter()
            .find(|(sx, sy, _)| *sx == px && *sy == py)
            .map(|(_, _, id)| *id);

        let dest_id = match dest {
            Some(id) => id,
            None => {
                self.add_message("この階段の行き先は不明…", MessageKind::Warning);
                return;
            }
        };

        let next_depth = self.floor_graph.depth_of(dest_id);

        // Final boss floor at depth 30
        if next_depth >= 30 {
            self.load_final_boss_floor();
            return;
        }

        // Check for special ending events first (20% chance, floor >= 5)
        let acquired_ending_ids: Vec<usize> = self.player.relics.iter()
            .filter(|r| crate::relic::ENDING_RELIC_IDS.contains(&r.id))
            .map(|r| r.id)
            .collect();
        if let Some(event) = crate::event::generate_ending_event(next_depth, &acquired_ending_ids) {
            self.pending_floor_id = Some(dest_id);
            self.current_event = Some(event);
            self.mode = GameMode::Event;
            return;
        }

        // Check for random floor-transition event
        if let Some(event) = generate_floor_event(next_depth) {
            self.pending_floor_id = Some(dest_id);
            self.current_event = Some(event);
            self.mode = GameMode::Event;
        } else {
            self.load_floor_by_id(dest_id);
        }
    }

    pub fn apply_event_choice(&mut self, choice_idx: usize) {
        if let Some(event) = self.current_event.take() {
            if choice_idx >= event.choices.len() {
                return;
            }
            let choice = event.choices[choice_idx].clone();
            let floor = self.player.floor;

            for consequence in &choice.consequences {
                match consequence {
                    EventConsequence::GainHp(v) => { self.player.heal(*v); }
                    EventConsequence::LoseHp(v) => { self.player.take_damage(*v); }
                    EventConsequence::GainMp(v) => { self.player.heal_mp(*v); }
                    EventConsequence::GainExp(v) => { self.player.gain_exp(*v); }
                    EventConsequence::GainGold(v) => { self.player.gold += v; }
                    EventConsequence::LoseGold(v) => { self.player.gold = self.player.gold.saturating_sub(*v); }
                    EventConsequence::GainStrPermanent(v) => { self.player.base_str += v; }
                    EventConsequence::GainDefPermanent(v) => { self.player.base_def += v; }
                    EventConsequence::GainIntPermanent(v) => { self.player.base_int += v; }
                    EventConsequence::GainLukPermanent(v) => { self.player.base_luk += v; }
                    EventConsequence::GainMaxHp(v) => {
                        self.player.max_hp = (self.player.max_hp + v).max(1);
                        self.player.hp = self.player.hp.min(self.player.max_hp);
                    }
                    EventConsequence::GainMaxMp(v) => {
                        self.player.max_mp = (self.player.max_mp + v).max(0);
                        self.player.mp = self.player.mp.min(self.player.max_mp);
                    }
                    EventConsequence::LoseRandomItem => {
                        if !self.player.inventory.is_empty() {
                            let idx = self.rng.gen_range(0..self.player.inventory.len());
                            let name = self.player.inventory.remove(idx).name;
                            self.add_message(format!("{}を失った", name), MessageKind::Warning);
                        }
                    }
                    EventConsequence::GainRandomItem => {
                        let item = generate_floor_item(&mut self.rng, floor);
                        let name = item.name.clone();
                        if self.player.inventory.len() < INVENTORY_MAX {
                            self.player.inventory.push(item);
                            self.add_message(format!("{}を入手した", name), MessageKind::Loot);
                        }
                    }
                    EventConsequence::CursedFloor => {
                        self.cursed_floor = true;
                        self.add_message("次のフロアは呪われている！", MessageKind::Warning);
                    }
                    EventConsequence::BlessedFloor => {
                        self.blessed_floor = true;
                        self.add_message("次のフロアは祝福されている！EXP×2！", MessageKind::Good);
                    }
                    EventConsequence::LearnRandomSkill => {
                        let unlearned: Vec<usize> = self.player.skills.iter().enumerate()
                            .filter(|(_, s)| s.unlocked && !s.learned && !s.is_passive)
                            .map(|(i, _)| i)
                            .collect();
                        if let Some(&skill_idx) = unlearned.first() {
                            let name = self.player.skills[skill_idx].name.clone();
                            self.player.skills[skill_idx].learned = true;
                            self.add_message(format!("スキル「{}」を習得！", name), MessageKind::Good);
                        } else {
                            self.add_message("習得できるスキルがない。", MessageKind::Normal);
                        }
                    }
                    EventConsequence::UnlockSkillBranch => {
                        for skill in self.player.skills.iter_mut() {
                            if !skill.unlocked {
                                skill.unlocked = true;
                                break;
                            }
                        }
                    }
                    EventConsequence::TeleportToFloor(target_depth) => {
                        let td = *target_depth;
                        self.floor_graph.ensure_depth(td + 4, &mut self.rng);
                        if let Some(fid) = self.floor_graph.reachable_at_depth(self.current_floor_id, td, &mut self.rng) {
                            self.add_message(format!("深度{}へ転送された！", td), MessageKind::Event);
                            self.pending_floor_id = None;
                            self.load_floor_by_id(fid);
                        } else {
                            self.add_message("転送失敗…", MessageKind::Warning);
                        }
                        return;
                    }
                    EventConsequence::FullRestoreHpMp => {
                        self.player.hp = self.player.max_hp;
                        self.player.mp = self.player.max_mp;
                        self.player.poison_turns = 0;
                        self.player.stun_turns = 0;
                        self.add_message("HP・MP完全回復！状態異常も解除！", MessageKind::Good);
                    }
                    EventConsequence::LoseHpPct(pct) => {
                        let loss = (self.player.max_hp * *pct as i32 / 100).max(1);
                        self.player.hp = (self.player.hp - loss).max(1);
                        self.add_message(format!("HP-{}（最大HPの{}%）！", loss, pct), MessageKind::Warning);
                    }
                    EventConsequence::LoseAllGold => {
                        let lost = self.player.gold;
                        self.player.gold = 0;
                        self.add_message(format!("ゴールド{}枚を全て失った！", lost), MessageKind::Warning);
                    }
                    EventConsequence::GainPositiveRelic => {
                        let floor = self.player.floor;
                        let mut relic = random_relic(&mut self.rng, floor);
                        while relic.is_cursed {
                            relic = random_relic(&mut self.rng, floor);
                        }
                        let name = relic.name.clone();
                        let desc = relic.description.clone();
                        if relic.effect == RelicEffect::MapReveal {
                            for col in self.map.explored.iter_mut() {
                                for cell in col.iter_mut() { *cell = true; }
                            }
                        }
                        self.player.relics.push(relic);
                        self.update_stats();
                        self.player.relic_revive_available = self.player.has_revive_relic();
                        self.add_message(format!("【秘宝】「{}」を授与された！{}", name, desc), MessageKind::Good);
                    }
                    EventConsequence::GainNegativeRelic => {
                        let floor = self.player.floor;
                        let mut relic = random_relic(&mut self.rng, floor);
                        while !relic.is_cursed {
                            relic = random_relic(&mut self.rng, floor);
                        }
                        let name = relic.name.clone();
                        let desc = relic.description.clone();
                        self.player.relics.push(relic);
                        self.update_stats();
                        self.add_message(format!("【呪物】「{}」が憑依した！{}", name, desc), MessageKind::Warning);
                    }
                    EventConsequence::KillAllMonsters => {
                        let count = self.monsters.len();
                        self.monsters.clear();
                        self.add_message(format!("フロアの全モンスター{}体が消滅した！", count), MessageKind::Good);
                    }
                    EventConsequence::ResetSkillCooldowns => {
                        for skill in self.player.skills.iter_mut() {
                            skill.current_cooldown = 0;
                        }
                        self.add_message("全スキルのクールダウンがリセットされた！", MessageKind::Good);
                    }
                    EventConsequence::SetHpToOne => {
                        self.player.hp = 1;
                        self.add_message("HPが強制的に1になった！", MessageKind::Warning);
                    }
                    EventConsequence::GainLevelUp => {
                        let exp_needed = self.player.exp_to_next.saturating_sub(self.player.exp);
                        let leveled = self.player.gain_exp(exp_needed + 1);
                        if leveled {
                            self.add_message(format!("強制レベルアップ！レベル{}になった！", self.player.level), MessageKind::Good);
                            self.update_stats();
                        }
                    }
                    EventConsequence::GainEndingRelic(relic_id) => {
                        let id = *relic_id;
                        // 既に持っている場合はスキップ
                        if !self.player.relics.iter().any(|r| r.id == id) {
                            self.apply_ending_relic(id);
                            // apply_ending_relic が EndingAnnouncement モードに遷移するため
                            // イベント後フロアロードを抑制する
                        }
                    }
                }
            }

            self.add_message(format!("選択：「{}」", choice.label), MessageKind::Event);
            if event.triggers_floor_reload {
                if let Some(pending_id) = self.pending_floor_id.take() {
                    self.load_floor_by_id(pending_id);
                } else {
                    self.reload_current_floor();
                }
            } else {
                self.mode = GameMode::Exploring;
            }
        }
    }

    pub fn load_floor_by_id(&mut self, floor_id: FloorId) {
        let depth = self.floor_graph.depth_of(floor_id);
        let ft    = self.floor_graph.floor_type_of(floor_id);

        // Ensure at least 4 depths ahead are generated
        self.floor_graph.ensure_depth(depth + 6, &mut self.rng);

        let exits = self.floor_graph.exits_of(floor_id);
        let num_exits = exits.len().max(1);

        let mut new_map = Map::new(depth, ft);
        let (px, py, stair_positions) = new_map.generate(&mut self.rng, num_exits);

        self.map = new_map;
        self.current_floor_id = floor_id;
        self.player.x = px;
        self.player.y = py;
        self.player.floor = depth;
        if depth > self.player.deepest_floor {
            self.player.deepest_floor = depth;
        }
        self.monsters.clear();
        self.floor_items.clear();
        self.floor_relics.clear();
        self.cursed_floor = false;
        self.blessed_floor = false;
        self.stair_destinations = stair_positions.into_iter()
            .zip(exits.into_iter())
            .map(|((x, y), dest)| (x, y, dest))
            .collect();

        self.player.relic_revive_available = self.player.has_revive_relic();
        self.spawn_floor_content();
        self.map.compute_fov(px, py, FOV_RADIUS);
        self.update_camera();
        self.mode = GameMode::Exploring;

        let ft_name = ft.name();
        let ft_desc = ft.description();
        self.add_message(
            format!("深度{}階 ─ 【{}】{}", depth, ft_name, ft_desc),
            MessageKind::System,
        );
    }

    /// Reload the current floor (regenerate from same floor_id).
    fn reload_current_floor(&mut self) {
        let id = self.current_floor_id;
        self.load_floor_by_id(id);
    }

    fn teleport_player(&mut self) {
        let w = self.map.width as i32;
        let h = self.map.height as i32;
        for _ in 0..200 {
            let x = self.rng.gen_range(0..w);
            let y = self.rng.gen_range(0..h);
            if self.map.is_walkable(x, y) && self.monster_at(x, y).is_none() {
                self.player.x = x;
                self.player.y = y;
                self.map.compute_fov(x, y, FOV_RADIUS);
                self.update_camera();
                return;
            }
        }
    }

    pub fn activate_shrine(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        if self.map.get(px, py) != Tile::Shrine {
            self.add_message("ここには祠がない。", MessageKind::Warning);
            return;
        }
        self.map.set(px, py, Tile::Floor);
        let floor = self.player.floor;
        let event = crate::event::generate_shrine_event(floor);
        self.current_event = Some(event);
        self.event_selection = 0;
        self.mode = GameMode::Event;
    }

    pub fn learn_skill(&mut self, skill_idx: usize) {
        if skill_idx >= self.player.skills.len() {
            return;
        }
        let sp_cost = self.player.skills[skill_idx].sp_cost;
        if self.player.skill_points < sp_cost {
            self.add_message("スキルポイントが足りない！", MessageKind::Warning);
            return;
        }

        let skill = &self.player.skills[skill_idx];
        if skill.learned {
            self.add_message("すでに習得済み！", MessageKind::Warning);
            return;
        }
        if !skill.unlocked {
            self.add_message("スキルがロックされている！前提条件を満たせ。", MessageKind::Warning);
            return;
        }
        if let Some(prereq) = skill.prerequisite {
            if !self.player.skills[prereq].learned {
                let prereq_name = self.player.skills[prereq].name.clone();
                self.add_message(format!("先に「{}」を習得する必要がある！", prereq_name), MessageKind::Warning);
                return;
            }
        }

        let name = self.player.skills[skill_idx].name.clone();
        self.player.skills[skill_idx].learned = true;
        self.player.skill_points -= sp_cost;
        self.add_message(format!("スキル「{}」を習得！（残りSP：{}）", name, self.player.skill_points), MessageKind::Good);

        // Unlock prerequisites for next tier
        for i in 0..self.player.skills.len() {
            if self.player.skills[i].prerequisite == Some(skill_idx) {
                self.player.skills[i].unlocked = true;
            }
        }

        self.update_stats();
    }

    // ── Battle navigation ────────────────────────────────────────────
    pub fn battle_navigate(&mut self, dir: i32) {
        match self.battle_sub_mode {
            0 => {
                self.battle_menu = ((self.battle_menu as i32 + dir + 4) % 4) as usize;
            }
            1 => {
                let n = self.player.skills.iter()
                    .filter(|s| s.learned && !s.is_passive)
                    .count() as i32;
                if n > 0 {
                    self.battle_sub_cursor = ((self.battle_sub_cursor as i32 + dir + n) % n) as usize;
                }
            }
            2 => {
                let n = self.player.inventory.iter()
                    .filter(|i| i.kind == crate::item::ItemKind::Consumable)
                    .count() as i32;
                if n > 0 {
                    self.battle_sub_cursor = ((self.battle_sub_cursor as i32 + dir + n) % n) as usize;
                }
            }
            _ => {}
        }
    }

    pub fn battle_back(&mut self) {
        if self.battle_sub_mode > 0 {
            self.battle_sub_mode = 0;
        }
    }

    pub fn battle_confirm(&mut self) {
        match self.battle_sub_mode {
            0 => match self.battle_menu {
                0 => self.battle_do_attack(),
                1 => {
                    let n = self.player.skills.iter()
                        .filter(|s| s.learned && !s.is_passive)
                        .count();
                    if n == 0 {
                        self.battle_log.push(("アクティブスキルを習得していない！".into(), MessageKind::Warning));
                    } else {
                        self.battle_sub_mode = 1;
                        self.battle_sub_cursor = 0;
                    }
                }
                2 => {
                    let n = self.player.inventory.iter()
                        .filter(|i| i.kind == crate::item::ItemKind::Consumable)
                        .count();
                    if n == 0 {
                        self.battle_log.push(("アイテムがない！".into(), MessageKind::Warning));
                    } else {
                        self.battle_sub_mode = 2;
                        self.battle_sub_cursor = 0;
                    }
                }
                3 => self.battle_do_run(),
                _ => {}
            },
            1 => {
                let indices: Vec<usize> = self.player.skills.iter()
                    .enumerate()
                    .filter(|(_, s)| s.learned && !s.is_passive)
                    .map(|(i, _)| i)
                    .collect();
                if let Some(&skill_idx) = indices.get(self.battle_sub_cursor) {
                    self.battle_do_skill(skill_idx);
                }
            }
            2 => {
                let indices: Vec<usize> = self.player.inventory.iter()
                    .enumerate()
                    .filter(|(_, i)| i.kind == crate::item::ItemKind::Consumable)
                    .map(|(i, _)| i)
                    .collect();
                if let Some(&item_idx) = indices.get(self.battle_sub_cursor) {
                    self.battle_do_item(item_idx);
                }
            }
            _ => {}
        }
    }

    fn determine_turn_order(&mut self, enemy_idx: usize) -> bool {
        let p_spd = self.player.base_dex;
        let e_spd = self.monsters.get(enemy_idx).map(|m| m.speed).unwrap_or(5);
        self.battle_player_speed = p_spd;
        self.battle_enemy_speed = e_spd;
        if p_spd != e_spd { p_spd > e_spd } else { self.rng.gen_bool(0.5) }
    }

    fn execute_player_attack(&mut self, idx: usize) -> bool {
        let is_crit = self.rng.gen_range(0..100) < self.player.crit_rate();
        let base = self.player.effective_attack() + self.rng.gen_range(0..5);
        let dmg = if is_crit { base * 2 } else { base };
        let actual = self.monsters[idx].take_damage(dmg);
        let name = self.monsters[idx].kind.name().to_string();
        self.battle_last_player_action = Some(if is_crit { "crit" } else { "slash" }.to_string());
        if self.player.lifesteal_pct > 0 {
            let heal = (actual as f32 * self.player.lifesteal_pct as f32 / 100.0) as i32;
            self.player.heal(heal);
        }
        let msg = if is_crit {
            format!("⚡ クリティカル！{}に{}ダメージ！", name, actual)
        } else {
            format!("⚔ {}に{}ダメージ。", name, actual)
        };
        self.battle_log.push((msg.clone(), MessageKind::Combat));
        self.add_message(msg, MessageKind::Combat);
        !self.monsters[idx].is_alive()
    }

    fn battle_do_attack(&mut self) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => return };
        if idx >= self.monsters.len() { self.battle_end_return(); return; }

        self.battle_last_player_action = None;
        self.battle_last_enemy_action = None;

        let player_first = self.determine_turn_order(idx);
        self.battle_turn_order = if player_first { "player_first" } else { "enemy_first" }.to_string();
        self.battle_turn += 1;
        self.battle_sub_mode = 0;

        if player_first {
            let killed = self.execute_player_attack(idx);
            if killed { self.battle_end_victory(idx); return; }
            if self.mode == GameMode::Battle { self.battle_enemy_turn(); }
        } else {
            self.battle_enemy_turn();
            if !self.player.is_alive() || self.mode != GameMode::Battle { return; }
            let idx2 = match self.battle_enemy_idx { Some(i) => i, None => return };
            if idx2 < self.monsters.len() && self.monsters[idx2].is_alive() {
                let killed = self.execute_player_attack(idx2);
                if killed { self.battle_end_victory(idx2); }
            }
        }
    }

    fn battle_do_skill(&mut self, skill_idx: usize) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => return };
        if idx >= self.monsters.len() { self.battle_end_return(); return; }

        self.battle_last_player_action = None;
        self.battle_last_enemy_action = None;

        if skill_idx >= self.player.skills.len() { return; }
        let skill = self.player.skills[skill_idx].clone();

        let mp_extra_pct = self.player.relic_mp_cost_multiplier();
        let actual_mp_cost = skill.mp_cost + (skill.mp_cost as f32 * mp_extra_pct as f32 / 100.0) as i32;
        let can_use = !skill.is_passive && skill.learned && skill.current_cooldown == 0
            && self.player.mp >= actual_mp_cost;
        if !can_use {
            let msg = if skill.current_cooldown > 0 {
                format!("クールダウン中（残り{}ターン）。", skill.current_cooldown)
            } else {
                "MPが足りない！".to_string()
            };
            self.battle_log.push((msg, MessageKind::Warning));
            return;
        }

        // Determine turn order; enemy-first gets to hit before skill resolves
        let player_first = self.determine_turn_order(idx);
        self.battle_turn_order = if player_first { "player_first" } else { "enemy_first" }.to_string();
        if !player_first {
            self.battle_enemy_turn();
            if !self.player.is_alive() || self.mode != GameMode::Battle { return; }
        }

        self.player.mp -= actual_mp_cost;
        let cd_penalty = self.player.relic_cooldown_penalty();
        self.player.skills[skill_idx].current_cooldown = skill.cooldown + cd_penalty;
        self.player.skills_used += 1;

        // 血の石板: スキル使用時HP追加消費
        let hp_cost = self.player.relic_skill_hp_cost();
        if hp_cost > 0 {
            self.player.hp = (self.player.hp - hp_cost).max(0);
            let hcmsg = format!("血の石板の代償…HP-{}！", hp_cost);
            self.battle_log.push((hcmsg.clone(), MessageKind::Warning));
        }

        self.battle_last_player_action = Some(match &skill.effect {
            SkillEffect::Heal(_) | SkillEffect::MpHeal(_) => "skill_heal",
            SkillEffect::Shield(..) | SkillEffect::CritBoost(_) => "skill_buff",
            SkillEffect::DotPoison(..) | SkillEffect::Stun(_) => "skill_debuff",
            SkillEffect::SoulDrain(_) => "skill_drain",
            SkillEffect::AoeDamage(_) => "skill_magic",
            _ => "skill_atk",
        }.to_string());

        let msg = match &skill.effect {
            SkillEffect::AttackMult(pct) => {
                let dmg = (self.player.effective_attack() as f32 * *pct as f32 / 100.0) as i32;
                let actual = self.monsters[idx].take_damage(dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}に{}ダメージ！", skill.name, name, actual)
            }
            SkillEffect::TeleportStrike => {
                let dmg = self.player.effective_attack() * 2;
                let actual = self.monsters[idx].take_damage(dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}に瞬間移動攻撃{}ダメージ！（必殺）", skill.name, name, actual)
            }
            SkillEffect::DoubleAttack => {
                let mut total = 0;
                for _ in 0..2 {
                    if self.monsters[idx].is_alive() {
                        let d = self.player.effective_attack();
                        total += self.monsters[idx].take_damage(d);
                    }
                }
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}に2連撃{}ダメージ！", skill.name, name, total)
            }
            SkillEffect::DotPoison(dmg, turns) => {
                self.monsters[idx].status_effects.push(
                    crate::monster::StatusEffect::Poisoned { damage: *dmg, turns_left: *turns }
                );
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}を毒状態に！({}毎ターン)", skill.name, name, dmg)
            }
            SkillEffect::Stun(turns) => {
                self.monsters[idx].status_effects.push(
                    crate::monster::StatusEffect::Stunned { turns_left: *turns }
                );
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}をスタン！({}ターン)", skill.name, name, turns)
            }
            SkillEffect::Heal(amount) => {
                self.player.heal(*amount);
                format!("✦ {}：HP+{}回復！", skill.name, amount)
            }
            SkillEffect::MpHeal(amount) => {
                self.player.heal_mp(*amount);
                format!("✦ {}：MP+{}回復！", skill.name, amount)
            }
            SkillEffect::Shield(amount, _) => {
                self.player.shield_hp += amount;
                format!("✦ {}：シールド+{}！", skill.name, amount)
            }
            SkillEffect::CritBoost(pct) => {
                self.player.crit_bonus = *pct;
                self.player.crit_bonus_turns = 5;
                format!("✦ {}：クリット率+{}%（5ターン）！", skill.name, pct)
            }
            SkillEffect::AoeDamage(dmg) => {
                let actual = self.monsters[idx].take_damage(*dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}に魔法爆発{}ダメージ！", skill.name, name, actual)
            }
            SkillEffect::SoulDrain(pct) => {
                let base_dmg = self.player.effective_attack();
                let dmg = (base_dmg as f32 * *pct as f32 / 100.0) as i32;
                let actual = self.monsters[idx].take_damage(dmg);
                self.player.hp = (self.player.hp + actual).min(self.player.max_hp);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}から{}吸収！HP+{}！", skill.name, name, actual, actual)
            }
            SkillEffect::AttackBuff(bonus, _turns) => {
                let base_dmg = self.player.effective_attack() + bonus;
                let actual = self.monsters[idx].take_damage(base_dmg);
                let name = self.monsters[idx].kind.name().to_string();
                format!("✦ {}：{}に{}ダメージ！", skill.name, name, actual)
            }
            _ => format!("✦ {}：発動！", skill.name),
        };

        self.battle_log.push((msg.clone(), MessageKind::Combat));
        self.add_message(msg, MessageKind::Combat);
        self.battle_turn += 1;
        self.battle_sub_mode = 0;

        if idx < self.monsters.len() && !self.monsters[idx].is_alive() {
            self.battle_end_victory(idx);
        } else if player_first && idx < self.monsters.len() {
            self.battle_enemy_turn();
        }
        // !player_first case: enemy already acted before skill; no retaliation
    }

    fn battle_do_item(&mut self, item_idx: usize) {
        self.battle_last_player_action = Some("item".to_string());
        self.battle_last_enemy_action = None;
        if item_idx >= self.player.inventory.len() { return; }

        let idx = match self.battle_enemy_idx { Some(i) => i, None => { self.battle_end_return(); return; } };
        let player_first = self.determine_turn_order(idx);
        self.battle_turn_order = if player_first { "player_first" } else { "enemy_first" }.to_string();
        if !player_first {
            self.battle_enemy_turn();
            if !self.player.is_alive() || self.mode != GameMode::Battle { return; }
        }

        let item = self.player.inventory[item_idx].clone();
        let msg = format!("🧪 使用：{}", item.name);
        self.battle_log.push((msg.clone(), MessageKind::Loot));
        self.add_message(msg, MessageKind::Loot);

        if let Some(ref effect) = item.consumable_effect {
            match effect {
                crate::item::ConsumableEffect::HealHp(amt) => { let a = *amt; self.player.heal(a); }
                crate::item::ConsumableEffect::HealMp(amt) => { let a = *amt; self.player.heal_mp(a); }
                crate::item::ConsumableEffect::TempStrBoost(s, t) => {
                    let (s, t) = (*s, *t);
                    self.player.temp_buffs.push(crate::player::TempBuff { str_bonus: s, def_bonus: 0, turns_left: t });
                }
                crate::item::ConsumableEffect::TempDefBoost(d, t) => {
                    let (d, t) = (*d, *t);
                    self.player.temp_buffs.push(crate::player::TempBuff { str_bonus: 0, def_bonus: d, turns_left: t });
                }
                crate::item::ConsumableEffect::PoisonResist(_) => { self.player.poison_turns = 0; }
                _ => {}
            }
        }
        self.player.inventory.remove(item_idx);

        self.battle_turn += 1;
        self.battle_sub_mode = 0;
        if player_first {
            self.battle_enemy_turn();
        }
    }

    fn battle_do_run(&mut self) {
        self.battle_last_player_action = Some("flee".to_string());
        self.battle_last_enemy_action = None;
        let idx = match self.battle_enemy_idx { Some(i) => i, None => { self.battle_end_return(); return; } };
        let escape_chance = 40u32 + self.player.base_dex as u32;
        if self.rng.gen_range(0..100) < escape_chance {
            self.battle_log.push(("🏃 逃走成功！".into(), MessageKind::Good));
            self.add_message("戦闘から逃げた！", MessageKind::Good);
            self.battle_end_return();
        } else {
            self.battle_log.push(("逃走失敗！".into(), MessageKind::Warning));
            self.add_message("逃走に失敗した！", MessageKind::Warning);
            self.battle_enemy_turn();
        }
    }

    fn battle_enemy_turn(&mut self) {
        let idx = match self.battle_enemy_idx { Some(i) => i, None => { self.battle_end_return(); return; } };
        if idx >= self.monsters.len() { self.battle_end_return(); return; }

        // Tick monster status
        self.monsters[idx].tick_status();

        if !self.monsters[idx].is_alive() {
            self.battle_end_victory(idx);
            return;
        }

        if self.monsters[idx].is_stunned() {
            self.battle_last_enemy_action = Some("stun_skip".to_string());
            let name = self.monsters[idx].kind.name().to_string();
            self.battle_log.push((format!("💫 {}はスタン状態！", name), MessageKind::Warning));
            // Player turn tick
            self.player.tick_buffs();
            self.player.tick_skill_cooldowns();
            return;
        }

        self.battle_last_enemy_action = Some("enemy_slash".to_string());
        let atk = self.monsters[idx].attack + self.rng.gen_range(0..4);
        let bonus = if self.cursed_floor { atk / 4 } else { 0 };
        let dmg = self.player.take_damage(atk + bonus);
        let name = self.monsters[idx].kind.name().to_string();
        let msg = format!("💥 {}の攻撃！{}ダメージ！", name, dmg);
        self.battle_log.push((msg.clone(), MessageKind::Combat));
        self.add_message(msg, MessageKind::Combat);

        // 貧乏神の祟り
        let gold_pct = self.player.relic_gold_on_damage();
        if gold_pct > 0 && dmg > 0 {
            let lost = ((self.player.gold as f32 * gold_pct as f32 / 100.0) as u32).max(1);
            self.player.gold = self.player.gold.saturating_sub(lost);
        }

        // 反射の盾 (battle)
        let reflect_pct = self.player.relic_damage_reflect();
        if reflect_pct > 0 && dmg > 0 && idx < self.monsters.len() {
            let reflect = ((dmg as f32 * reflect_pct as f32 / 100.0) as i32).max(1);
            self.monsters[idx].take_damage(reflect);
            let rname = self.monsters[idx].kind.name().to_string();
            let rmsg = format!("✨ 反射の盾！{}に{}ダメージを反射！", rname, reflect);
            self.battle_log.push((rmsg.clone(), MessageKind::Good));
        }

        self.player.tick_buffs();
        self.player.tick_skill_cooldowns();

        if !self.player.is_alive() {
            if self.check_revive() {
                let rmsg = "✨ 不死鳥の羽が輝く！甦った！".to_string();
                self.battle_log.push((rmsg.clone(), MessageKind::Good));
                self.add_message(rmsg, MessageKind::Good);
            } else {
                self.battle_log.push(("💀 あなたは倒れた…".into(), MessageKind::Warning));
                self.mode = GameMode::Dead;
                self.add_message("あなたは力尽きた… ゲームオーバー。", MessageKind::Warning);
            }
        }
    }

    fn battle_end_victory(&mut self, idx: usize) {
        let name = self.monsters[idx].kind.name().to_string();
        let is_final = self.monsters[idx].kind.is_final_boss();
        let ending_key = self.monsters[idx].kind.ending_key().map(|s| s.to_string());
        self.battle_log.push((format!("✨ {}を倒した！", name), MessageKind::Good));

        // 最終ボスを倒した場合はエンディングへ
        if is_final {
            self.victory_ending = ending_key;
            self.on_monster_death(idx);
            self.battle_enemy_idx = None;
            self.mode = GameMode::Victory;
            self.add_message("【ダンジョン制覇】最終ボスを撃破した！勝利！", MessageKind::Good);
            return;
        }

        // Collect base stats before on_monster_death mutates the list
        let raw_exp = self.monsters[idx].exp_reward;
        let gold = self.monsters[idx].gold_reward;
        let floor = self.map.floor;

        let mut exp = raw_exp;
        if self.blessed_floor { exp = (exp as f32 * 2.0) as u32; }
        if self.cursed_floor  { exp = (exp as f32 * 1.5) as u32; }
        exp = (exp as f32 * self.player.relic_exp_multiplier()) as u32;
        let actual_gold = (gold as f32 * self.player.relic_gold_multiplier()) as u32;

        self.on_monster_death(idx);
        self.battle_enemy_idx = None;

        // Build reward list
        let mut rewards: Vec<RewardEntry> = Vec::new();
        rewards.push(RewardEntry { category: "exp".into(),  name: format!("EXP +{}", exp),       is_cursed: false });
        rewards.push(RewardEntry { category: "gold".into(), name: format!("ゴールド +{}", actual_gold), is_cursed: false });

        // Material drop ~45%
        if self.rng.gen_range(0..100) < 45 {
            let mat = generate_material(&mut self.rng);
            let mat_name = mat.name.clone();
            if self.player.inventory.len() < crate::game::INVENTORY_MAX {
                self.player.inventory.push(mat);
            }
            rewards.push(RewardEntry { category: "material".into(), name: mat_name, is_cursed: false });
        }

        // Weapon drop ~10%
        if self.rng.gen_range(0..100) < 10 {
            let w = generate_weapon(&mut self.rng, floor);
            let wname = w.name.clone();
            if self.player.inventory.len() < crate::game::INVENTORY_MAX {
                self.player.inventory.push(w);
            }
            rewards.push(RewardEntry { category: "weapon".into(), name: wname, is_cursed: false });
        }

        // Armor drop ~10%
        if self.rng.gen_range(0..100) < 10 {
            let a = generate_armor(&mut self.rng, floor);
            let aname = a.name.clone();
            if self.player.inventory.len() < crate::game::INVENTORY_MAX {
                self.player.inventory.push(a);
            }
            rewards.push(RewardEntry { category: "armor".into(), name: aname, is_cursed: false });
        }

        // Relic (秘宝) drop ~4%
        if self.rng.gen_range(0..100) < 4 {
            let mut relic = random_relic(&mut self.rng, floor);
            while relic.is_cursed { relic = random_relic(&mut self.rng, floor); }
            let rname = relic.name.clone();
            rewards.push(RewardEntry { category: "relic".into(), name: rname.clone(), is_cursed: false });
            self.add_message(format!("秘宝「{}」を入手した！", rname), MessageKind::Loot);
            self.player.relics.push(relic);
        }

        // Cursed relic (呪物) drop ~2%
        if self.rng.gen_range(0..100) < 2 {
            let mut relic = random_relic(&mut self.rng, floor);
            while !relic.is_cursed { relic = random_relic(&mut self.rng, floor); }
            let rname = relic.name.clone();
            rewards.push(RewardEntry { category: "cursed".into(), name: rname.clone(), is_cursed: true });
            self.add_message(format!("呪物「{}」が取り憑いた！", rname), MessageKind::Warning);
            self.player.relics.push(relic);
        }

        // Boss floor (depth % 5 == 0): guaranteed 秘宝 drop
        if self.map.floor_type == FloorType::MiniBoss && self.map.floor % 5 == 0 {
            let mut relic = random_relic(&mut self.rng, floor);
            while relic.is_cursed { relic = random_relic(&mut self.rng, floor); }
            let rname = relic.name.clone();
            rewards.push(RewardEntry { category: "relic".into(), name: rname.clone(), is_cursed: false });
            self.add_message(format!("【ボス報酬】秘宝「{}」を手に入れた！", rname), MessageKind::Good);
            self.player.relics.push(relic);
        }

        self.pending_rewards = rewards;
        self.reward_skill_cursor = 0;
        // Enter dissolve-effect mode first; monster stays in list at HP=0
        // confirm_battle_victory_effect() will clean up and advance to BattleReward
        self.mode = GameMode::BattleVictoryEffect;
    }

    pub fn confirm_battle_victory_effect(&mut self) {
        if let Some(idx) = self.battle_enemy_idx {
            if idx < self.monsters.len() {
                self.on_monster_death(idx);
            }
        }
        self.battle_enemy_idx = None;
        self.mode = GameMode::BattleReward;
        self.end_player_turn();
    }

    pub fn confirm_battle_rewards(&mut self) {
        self.pending_rewards.clear();
        self.mode = GameMode::Exploring;
    }

    fn battle_end_return(&mut self) {
        self.battle_enemy_idx = None;
        self.mode = GameMode::Exploring;
    }

    fn monster_at(&self, x: i32, y: i32) -> Option<usize> {
        self.monsters.iter().position(|m| m.x == x && m.y == y && m.is_alive())
    }

    fn item_at(&self, x: i32, y: i32) -> Option<usize> {
        self.floor_items.iter().position(|(ix, iy, _)| *ix == x && *iy == y)
    }

    fn relic_at(&self, x: i32, y: i32) -> Option<usize> {
        self.floor_relics.iter().position(|(rx, ry, _)| *rx == x && *ry == y)
    }

    pub fn try_pickup_relic(&mut self, x: i32, y: i32) {
        if let Some(idx) = self.relic_at(x, y) {
            let (_, _, relic) = self.floor_relics.remove(idx);
            let kind_label = if relic.is_cursed { "呪物" } else { "秘宝" };
            self.add_message(
                format!("【{}】「{}」を獲得！{}", kind_label, relic.name, relic.description),
                if relic.is_cursed { MessageKind::Warning } else { MessageKind::Good },
            );

            // MapReveal: 千里眼の宝珠
            if relic.effect == RelicEffect::MapReveal {
                for col in self.map.explored.iter_mut() {
                    for cell in col.iter_mut() {
                        *cell = true;
                    }
                }
                self.add_message("このフロアの全マップが解明された！", MessageKind::System);
            }

            self.player.relics.push(relic);
            // リレックのステータス変動を反映
            self.update_stats();
            // 不死鳥の羽: 取得したらすぐ有効化
            self.player.relic_revive_available = self.player.has_revive_relic();
        }
    }

    pub fn try_craft(&mut self, recipe_idx: usize) {
        use crate::item::CRAFTING_RECIPES;
        if recipe_idx >= CRAFTING_RECIPES.len() {
            return;
        }
        let recipe = &CRAFTING_RECIPES[recipe_idx];
        let floor = self.map.floor;

        if let Some(crafted) = crate::item::try_craft(recipe, &mut self.player.inventory, floor, &mut self.rng) {
            let name = crafted.name.clone();
            if self.player.inventory.len() < INVENTORY_MAX {
                self.player.inventory.push(crafted);
                self.player.items_collected += 1;
                self.add_message(format!("{}を製作した！", name), MessageKind::Good);
            } else {
                self.add_message("インベントリがいっぱいで製作できない！", MessageKind::Warning);
            }
        } else {
            self.add_message("素材が不足している。", MessageKind::Warning);
        }
    }

    pub fn activate_tablet(&mut self) {
        let (px, py) = (self.player.x, self.player.y);
        if self.map.get(px, py) != Tile::Tablet {
            self.add_message("ここには石板がない。", MessageKind::Warning);
            return;
        }
        self.mode = GameMode::FloorMap;
    }

    /// Context-aware interact: descend/shrine/tablet/pickup.
    pub fn smart_interact(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        match self.map.get(px, py) {
            Tile::StairsDown    => self.descend(),
            Tile::Tablet        => self.activate_tablet(),
            Tile::Shrine        => self.activate_shrine(),
            Tile::CraftingAnvil => {
                self.mode = GameMode::Crafting;
                self.craft_selection = 0;
            }
            _ => self.pickup_item(),
        }
    }
}
