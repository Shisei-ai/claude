use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, Debug)]
pub enum MonsterKind {
    Rat,
    Goblin,
    Orc,
    Skeleton,
    Zombie,
    Troll,
    Mage,
    Vampire,
    Dragon,
    Demon,
    Ghost,
    Golem,
    // ── 中ボス (MiniBossフロア専用) ───────────────────────────
    GiantRatKing,    // 巨大ネズミ王   floor 1-5
    OrcWarlord,      // オーク戦士長   floor 5-10
    BoneLord,        // 骸骨の騎士王   floor 9-14
    DarkKnight,      // 暗黒騎士       floor 13-18
    VoidMage,        // 虚空の魔道士   floor 17-22
    AbyssalHydra,    // 深淵の多頭竜   floor 21-26
    ChaosWarden,     // 混沌の番兵     floor 25-29
    // ── 宝庫番人 (Treasuryフロア専用) ───────────────────────
    TreasureGolem,   // 宝箱ゴーレム   floor 1-7
    GoldenKnight,    // 黄金騎士       floor 6-13
    TreasuryWitch,   // 宝蔵の��女     floor 11-18
    StoneSentinel,   // 石の番兵       floor 16-23
    DragonGuard,     // 守護竜         floor 21-29
    // ── 最終ボス ──────────────────────────────────────────────
    FinalDemonLord,   // 通常エンディング: ダンジョンの魔王
    AbyssLord,        // 深淵エンディング: 深淵の支配者
    FlameEmperor,     // 炎帝エンディング: 炎帝アグニ
    IceSovereign,     // 氷エンディング:   氷の女王フリゲル
    ChaosAvatar,      // 混沌エンディング: 混沌の化身
    AncientGuardian,  // 古代エンディング: 古代の番人ゴルゴン
}

impl MonsterKind {
    pub fn char(&self) -> char {
        match self {
            MonsterKind::Rat => 'r',
            MonsterKind::Goblin => 'g',
            MonsterKind::Orc => 'O',
            MonsterKind::Skeleton => 's',
            MonsterKind::Zombie => 'z',
            MonsterKind::Troll => 'T',
            MonsterKind::Mage => 'M',
            MonsterKind::Vampire => 'V',
            MonsterKind::Dragon => 'D',
            MonsterKind::Demon => '&',
            MonsterKind::Ghost => 'G',
            MonsterKind::Golem => 'P',
            MonsterKind::GiantRatKing  => '鼠',
            MonsterKind::OrcWarlord    => '将',
            MonsterKind::BoneLord      => '骸',
            MonsterKind::DarkKnight    => '暗',
            MonsterKind::VoidMage      => '虚',
            MonsterKind::AbyssalHydra  => '竜',
            MonsterKind::ChaosWarden   => '混',
            MonsterKind::TreasureGolem => '宝',
            MonsterKind::GoldenKnight  => '金',
            MonsterKind::TreasuryWitch => '魔',
            MonsterKind::StoneSentinel => '番',
            MonsterKind::DragonGuard   => '護',
            MonsterKind::FinalDemonLord  => '魔',
            MonsterKind::AbyssLord       => '淵',
            MonsterKind::FlameEmperor    => '炎',
            MonsterKind::IceSovereign    => '氷',
            MonsterKind::ChaosAvatar     => '沌',
            MonsterKind::AncientGuardian => '古',
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            MonsterKind::Rat => "ネズミ",
            MonsterKind::Goblin => "ゴブリン",
            MonsterKind::Orc => "オーク",
            MonsterKind::Skeleton => "スケルトン",
            MonsterKind::Zombie => "ゾンビ",
            MonsterKind::Troll => "トロール",
            MonsterKind::Mage => "闇の魔法使い",
            MonsterKind::Vampire => "ヴァンパイア",
            MonsterKind::Dragon => "ドラゴン",
            MonsterKind::Demon => "悪魔",
            MonsterKind::Ghost => "亡霊",
            MonsterKind::Golem => "石のゴーレム",
            MonsterKind::GiantRatKing  => "巨大ネズミ王",
            MonsterKind::OrcWarlord    => "オーク戦士長",
            MonsterKind::BoneLord      => "骸骨の騎士王",
            MonsterKind::DarkKnight    => "暗黒騎士",
            MonsterKind::VoidMage      => "虚空の魔道士",
            MonsterKind::AbyssalHydra  => "深淵の多頭竜",
            MonsterKind::ChaosWarden   => "混沌の番兵",
            MonsterKind::TreasureGolem => "宝箱ゴーレム",
            MonsterKind::GoldenKnight  => "黄金騎士",
            MonsterKind::TreasuryWitch => "宝蔵の魔女",
            MonsterKind::StoneSentinel => "石の番兵",
            MonsterKind::DragonGuard   => "守護竜",
            MonsterKind::FinalDemonLord  => "ダンジョンの魔王",
            MonsterKind::AbyssLord       => "深淵の支配者",
            MonsterKind::FlameEmperor    => "炎帝アグニ",
            MonsterKind::IceSovereign    => "氷の女王フリゲル",
            MonsterKind::ChaosAvatar     => "混沌の化身",
            MonsterKind::AncientGuardian => "古代の番人ゴルゴン",
        }
    }

    pub fn is_boss(&self) -> bool {
        matches!(self,
            MonsterKind::Dragon | MonsterKind::Demon
            | MonsterKind::GiantRatKing | MonsterKind::OrcWarlord
            | MonsterKind::BoneLord | MonsterKind::DarkKnight
            | MonsterKind::VoidMage | MonsterKind::AbyssalHydra
            | MonsterKind::ChaosWarden
            | MonsterKind::TreasureGolem | MonsterKind::GoldenKnight
            | MonsterKind::TreasuryWitch | MonsterKind::StoneSentinel
            | MonsterKind::DragonGuard
            | MonsterKind::FinalDemonLord | MonsterKind::AbyssLord
            | MonsterKind::FlameEmperor   | MonsterKind::IceSovereign
            | MonsterKind::ChaosAvatar    | MonsterKind::AncientGuardian
        )
    }

    pub fn is_final_boss(&self) -> bool {
        matches!(self,
            MonsterKind::FinalDemonLord | MonsterKind::AbyssLord
            | MonsterKind::FlameEmperor | MonsterKind::IceSovereign
            | MonsterKind::ChaosAvatar  | MonsterKind::AncientGuardian
        )
    }

    pub fn ending_key(&self) -> Option<&'static str> {
        match self {
            MonsterKind::FinalDemonLord  => Some("normal"),
            MonsterKind::AbyssLord       => Some("abyss"),
            MonsterKind::FlameEmperor    => Some("flame"),
            MonsterKind::IceSovereign    => Some("ice"),
            MonsterKind::ChaosAvatar     => Some("chaos"),
            MonsterKind::AncientGuardian => Some("ancient"),
            _ => None,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum StatusEffect {
    Poisoned { damage: i32, turns_left: u32 },
    Stunned { turns_left: u32 },
    Confused { turns_left: u32 },
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Monster {
    pub id: u64,
    pub kind: MonsterKind,
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub attack: i32,
    pub defense: i32,
    pub speed: i32,
    pub exp_reward: u32,
    pub gold_reward: u32,
    pub status_effects: Vec<StatusEffect>,
    pub is_confused: bool,
    pub ai_state: AiState,
    pub seen_player: bool,
    pub item_drop_chance: u32, // percent
}

#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, Debug)]
pub enum AiState {
    Idle,
    Chasing,
    Fleeing,
}

static mut MONSTER_ID: u64 = 0;
fn next_monster_id() -> u64 {
    unsafe {
        MONSTER_ID += 1;
        MONSTER_ID
    }
}

pub fn spawn_monster<R: Rng>(rng: &mut R, x: i32, y: i32, floor: u32, is_boss: bool) -> Monster {
    let kind = if is_boss {
        if floor >= 15 {
            MonsterKind::Demon
        } else {
            MonsterKind::Dragon
        }
    } else {
        pick_monster_kind(rng, floor)
    };

    let (base_hp, base_atk, base_def, base_exp, base_gold, drop_chance) = base_stats_for(&kind);
    let scale = 1.0 + (floor as f32 - 1.0) * 0.15;

    let hp  = ((base_hp  as f32 * scale) as i32).max(1) + rng.gen_range(0..5);
    let atk = ((base_atk as f32 * scale) as i32).max(1) + rng.gen_range(0..3);
    let def = ((base_def as f32 * scale) as i32).max(0) + rng.gen_range(0..2);
    let exp = (base_exp  as f32 * scale) as u32 + rng.gen_range(0..10);
    let gold= (base_gold as f32 * scale) as u32 + rng.gen_range(0..5);

    Monster {
        id: next_monster_id(),
        kind: kind.clone(),
        x, y,
        hp,
        max_hp: hp,
        attack: atk,
        defense: def,
        speed: speed_for(&kind),
        exp_reward: exp,
        gold_reward: gold,
        status_effects: Vec::new(),
        is_confused: false,
        ai_state: AiState::Idle,
        seen_player: false,
        item_drop_chance: drop_chance,
    }
}

/// MiniBossフロア専用の中ボスを生成する
pub fn spawn_mini_boss<R: Rng>(rng: &mut R, x: i32, y: i32, floor: u32) -> Monster {
    let kind = pick_mini_boss_kind(floor);
    let (base_hp, base_atk, base_def, base_exp, base_gold, drop_chance) = base_stats_for(&kind);
    let scale = 1.0 + (floor as f32 - 1.0) * 0.15;

    // 中ボスは通常モンスターより強いが、スケーリング分散を大きく
    let hp  = ((base_hp  as f32 * scale) as i32).max(1) + rng.gen_range(0..20);
    let atk = ((base_atk as f32 * scale) as i32).max(1) + rng.gen_range(0..5);
    let def = ((base_def as f32 * scale) as i32).max(0) + rng.gen_range(0..3);
    let exp = (base_exp  as f32 * scale) as u32 + rng.gen_range(0..30);
    let gold= (base_gold as f32 * scale) as u32 + rng.gen_range(0..20);

    Monster {
        id: next_monster_id(),
        kind: kind.clone(),
        x, y,
        hp,
        max_hp: hp,
        attack: atk,
        defense: def,
        speed: speed_for(&kind),
        exp_reward: exp,
        gold_reward: gold,
        status_effects: Vec::new(),
        is_confused: false,
        ai_state: AiState::Idle,
        seen_player: false,
        item_drop_chance: drop_chance,
    }
}

/// Treasuryフロア専用の番人を生成する
pub fn spawn_treasury_guardian<R: Rng>(rng: &mut R, x: i32, y: i32, floor: u32) -> Monster {
    let kind = pick_guardian_kind(floor);
    let (base_hp, base_atk, base_def, base_exp, base_gold, drop_chance) = base_stats_for(&kind);
    let scale = 1.0 + (floor as f32 - 1.0) * 0.15;

    let hp  = ((base_hp  as f32 * scale) as i32).max(1) + rng.gen_range(0..15);
    let atk = ((base_atk as f32 * scale) as i32).max(1) + rng.gen_range(0..5);
    let def = ((base_def as f32 * scale) as i32).max(0) + rng.gen_range(0..3);
    let exp = (base_exp  as f32 * scale) as u32 + rng.gen_range(0..30);
    let gold= (base_gold as f32 * scale) as u32 + rng.gen_range(0..20);

    Monster {
        id: next_monster_id(),
        kind: kind.clone(),
        x, y,
        hp,
        max_hp: hp,
        attack: atk,
        defense: def,
        speed: speed_for(&kind),
        exp_reward: exp,
        gold_reward: gold,
        status_effects: Vec::new(),
        is_confused: false,
        ai_state: AiState::Idle,
        seen_player: false,
        item_drop_chance: drop_chance,
    }
}

fn pick_mini_boss_kind(floor: u32) -> MonsterKind {
    match floor {
        1..=5   => MonsterKind::GiantRatKing,
        6..=9   => MonsterKind::OrcWarlord,
        10..=13 => MonsterKind::BoneLord,
        14..=17 => MonsterKind::DarkKnight,
        18..=21 => MonsterKind::VoidMage,
        22..=25 => MonsterKind::AbyssalHydra,
        _       => MonsterKind::ChaosWarden,
    }
}

fn pick_guardian_kind(floor: u32) -> MonsterKind {
    match floor {
        1..=6   => MonsterKind::TreasureGolem,
        7..=11  => MonsterKind::GoldenKnight,
        12..=16 => MonsterKind::TreasuryWitch,
        17..=21 => MonsterKind::StoneSentinel,
        _       => MonsterKind::DragonGuard,
    }
}

pub fn speed_for(kind: &MonsterKind) -> i32 {
    match kind {
        MonsterKind::Rat       => 12,
        MonsterKind::Goblin    =>  8,
        MonsterKind::Skeleton  =>  5,
        MonsterKind::Zombie    =>  2,
        MonsterKind::Orc       =>  6,
        MonsterKind::Ghost     => 11,
        MonsterKind::Troll     =>  3,
        MonsterKind::Mage      =>  7,
        MonsterKind::Golem     =>  2,
        MonsterKind::Vampire   => 10,
        MonsterKind::Dragon    =>  7,
        MonsterKind::Demon     =>  9,
        // 中ボス
        MonsterKind::GiantRatKing  => 10,
        MonsterKind::OrcWarlord    =>  7,
        MonsterKind::BoneLord      =>  5,
        MonsterKind::DarkKnight    =>  8,
        MonsterKind::VoidMage      =>  9,
        MonsterKind::AbyssalHydra  =>  6,
        MonsterKind::ChaosWarden   => 11,
        // 宝庫番人
        MonsterKind::TreasureGolem =>  3,
        MonsterKind::GoldenKnight  =>  7,
        MonsterKind::TreasuryWitch =>  8,
        MonsterKind::StoneSentinel =>  2,
        MonsterKind::DragonGuard   =>  8,
        // 最終ボス
        MonsterKind::FinalDemonLord  =>  8,
        MonsterKind::AbyssLord       => 10,
        MonsterKind::FlameEmperor    => 12,
        MonsterKind::IceSovereign    =>  6,
        MonsterKind::ChaosAvatar     => 11,
        MonsterKind::AncientGuardian =>  5,
    }
}

fn pick_monster_kind<R: Rng>(rng: &mut R, floor: u32) -> MonsterKind {
    let max_tier = (floor / 3).min(8) as usize;
    let pool = vec![
        MonsterKind::Rat,       // tier 0
        MonsterKind::Goblin,    // tier 1
        MonsterKind::Skeleton,  // tier 1
        MonsterKind::Zombie,    // tier 2
        MonsterKind::Orc,       // tier 3
        MonsterKind::Ghost,     // tier 3
        MonsterKind::Troll,     // tier 4
        MonsterKind::Mage,      // tier 5
        MonsterKind::Golem,     // tier 6
        MonsterKind::Vampire,   // tier 7
    ];
    let available = &pool[..=(max_tier.min(pool.len() - 1))];
    available[rng.gen_range(0..available.len())].clone()
}

fn base_stats_for(kind: &MonsterKind) -> (i32, i32, i32, u32, u32, u32) {
    // (hp, atk, def, exp, gold, drop_chance%)
    match kind {
        MonsterKind::Rat       => (8,  2, 0, 5,  3,  10),
        MonsterKind::Goblin    => (15, 4, 1, 10, 8,  20),
        MonsterKind::Skeleton  => (20, 5, 2, 15, 10, 25),
        MonsterKind::Zombie    => (30, 4, 3, 20, 12, 20),
        MonsterKind::Orc       => (45, 8, 4, 35, 20, 30),
        MonsterKind::Ghost     => (25, 7, 5, 30, 15, 35),
        MonsterKind::Troll     => (80, 12, 6, 60, 35, 40),
        MonsterKind::Mage      => (35, 15, 3, 70, 40, 50),
        MonsterKind::Golem     => (100,10, 12,80, 50, 35),
        MonsterKind::Vampire   => (60, 14, 8, 90, 60, 50),
        MonsterKind::Dragon    => (200,25, 15,500,200,80),
        MonsterKind::Demon     => (300,35, 20,1000,500,90),
        // ── 中ボス（通常モンスターの3〜5倍HP、2倍ATK、豊富な報酬）─
        MonsterKind::GiantRatKing  => (120, 14,  4,  300, 180, 90),
        MonsterKind::OrcWarlord    => (280, 28, 14,  700, 400, 90),
        MonsterKind::BoneLord      => (380, 38, 24, 1200, 700, 90),
        MonsterKind::DarkKnight    => (520, 52, 36, 2000,1200, 90),
        MonsterKind::VoidMage      => (360, 75,  8, 2800,1800, 90),
        MonsterKind::AbyssalHydra  => (800, 65, 22, 4500,3000, 90),
        MonsterKind::ChaosWarden   => (950, 88, 42, 7000,5000, 90),
        // ── 宝庫番人（高HP、高DEF、高報酬）────────────────────────
        MonsterKind::TreasureGolem => (200, 18, 22,  500, 800, 90),
        MonsterKind::GoldenKnight  => (400, 38, 28, 1100,1800, 90),
        MonsterKind::TreasuryWitch => (300, 65, 10, 1800,3000, 90),
        MonsterKind::StoneSentinel => (800, 42, 55, 3200,5000, 90),
        MonsterKind::DragonGuard   => (1000,68, 38, 6000,8000, 90),
        // ── 最終ボス（スケーリング前の基準値）──────────────────────
        MonsterKind::FinalDemonLord  => (2000, 80, 40, 8000, 5000, 100),
        MonsterKind::AbyssLord       => (2200, 95, 35, 8500, 5500, 100),
        MonsterKind::FlameEmperor    => (1800,110, 25, 8500, 5500, 100),
        MonsterKind::IceSovereign    => (2100, 70, 65, 8500, 5500, 100),
        MonsterKind::ChaosAvatar     => (1900, 90, 45, 8500, 5500, 100),
        MonsterKind::AncientGuardian => (2500, 75, 60, 8500, 5500, 100),
    }
}

/// エンディング種別文字列に対応する最終ボスを生成する
pub fn spawn_final_boss(boss_key: Option<&str>, x: i32, y: i32) -> Monster {
    let kind = match boss_key {
        Some("abyss")   => MonsterKind::AbyssLord,
        Some("flame")   => MonsterKind::FlameEmperor,
        Some("ice")     => MonsterKind::IceSovereign,
        Some("chaos")   => MonsterKind::ChaosAvatar,
        Some("ancient") => MonsterKind::AncientGuardian,
        _               => MonsterKind::FinalDemonLord,
    };

    let (hp, atk, def, exp, gold, _) = base_stats_for(&kind);

    Monster {
        id: next_monster_id(),
        kind: kind.clone(),
        x, y,
        hp,
        max_hp: hp,
        attack: atk,
        defense: def,
        speed: speed_for(&kind),
        exp_reward: exp,
        gold_reward: gold,
        status_effects: Vec::new(),
        is_confused: false,
        ai_state: AiState::Idle,
        seen_player: false,
        item_drop_chance: 100,
    }
}

impl Monster {
    pub fn is_alive(&self) -> bool {
        self.hp > 0
    }

    pub fn take_damage(&mut self, amount: i32) -> i32 {
        let actual = (amount - self.defense).max(1);
        self.hp = (self.hp - actual).max(0);
        actual
    }

    pub fn tick_status(&mut self) -> i32 {
        let mut poison_dmg = 0;
        self.status_effects.retain_mut(|effect| match effect {
            StatusEffect::Poisoned { damage, turns_left } => {
                poison_dmg += *damage;
                self.hp = (self.hp - *damage).max(0);
                *turns_left -= 1;
                *turns_left > 0
            }
            StatusEffect::Stunned { turns_left } => {
                *turns_left -= 1;
                *turns_left > 0
            }
            StatusEffect::Confused { turns_left } => {
                *turns_left -= 1;
                *turns_left > 0
            }
        });
        poison_dmg
    }

    pub fn is_stunned(&self) -> bool {
        self.status_effects.iter().any(|e| matches!(e, StatusEffect::Stunned { .. }))
    }

    pub fn ai_move_toward(&self, px: i32, py: i32) -> (i32, i32) {
        let dx = (px - self.x).signum();
        let dy = (py - self.y).signum();
        if dx.abs() >= dy.abs() {
            (self.x + dx, self.y)
        } else {
            (self.x, self.y + dy)
        }
    }
}
