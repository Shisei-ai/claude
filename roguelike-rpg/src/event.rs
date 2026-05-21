use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum EventConsequence {
    GainHp(i32),
    LoseHp(i32),
    GainMp(i32),
    GainExp(u32),
    GainGold(u32),
    LoseGold(u32),
    GainStrPermanent(i32),
    GainDefPermanent(i32),
    GainIntPermanent(i32),
    GainLukPermanent(i32),
    GainMaxHp(i32),
    GainMaxMp(i32),
    LoseRandomItem,
    GainRandomItem,
    CursedFloor,          // enemies stronger on this floor
    BlessedFloor,         // double exp on this floor
    LearnRandomSkill,
    UnlockSkillBranch,
    TeleportToFloor(u32),
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct EventChoice {
    pub label: String,
    pub description: String,
    pub consequences: Vec<EventConsequence>,
    pub is_risky: bool,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct RandomEvent {
    pub title: String,
    pub description: String,
    pub choices: Vec<EventChoice>,
    pub is_irreversible: bool,
}

pub fn generate_floor_event(floor: u32) -> Option<RandomEvent> {
    use rand::Rng;
    let mut rng = rand::thread_rng();

    // Events become more common and dramatic deeper in the dungeon
    let event_chance = 40 + floor.min(20) as u32 * 3;
    if rng.gen_range(0..100) >= event_chance {
        return None;
    }

    let event_roll = rng.gen_range(0..12u32);

    let event = match event_roll {
        0 => RandomEvent {
            title: "謎めいた祭壇".to_string(),
            description: "暗黒のエネルギーが脈動する古代の祭壇を発見した。声がつぶやく：「血を捧げよ、そうすれば力を授けよう…」".to_string(),
            choices: vec![
                EventChoice {
                    label: "血を捧げる（最大HP永続-20%）".to_string(),
                    description: "闇の力のための永続的な犠牲。".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(8),
                        EventConsequence::GainDefPermanent(4),
                        EventConsequence::GainMaxHp(-20),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "祭壇に祈る（EXP獲得）".to_string(),
                    description: "素直な祈りが適度な報酬をもたらす。".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 50)],
                    is_risky: false,
                },
                EventChoice {
                    label: "無視して通り過ぎる".to_string(),
                    description: "誘惑に背を向ける。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        1 => RandomEvent {
            title: "瀕死の冒険者".to_string(),
            description: "瀕死の冒険者が目の前に横たわっている。最後の息でつぶやく：「頼む…荷物を…持っていってくれ…苦しみを…終わらせてくれ…」".to_string(),
            choices: vec![
                EventChoice {
                    label: "介錯してアイテムを受け取る".to_string(),
                    description: "残酷な行為だが、本人が望んでいる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainGold(50 * floor),
                        EventConsequence::LoseHp(5),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "回復薬で手当てする".to_string(),
                    description: "HP回復薬を使う。この優しさを覚えているかもしれない。".to_string(),
                    consequences: vec![
                        EventConsequence::GainExp(floor * 30),
                        EventConsequence::GainStrPermanent(2),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "運命に任せて立ち去る".to_string(),
                    description: "そんな時間はない。".to_string(),
                    consequences: vec![EventConsequence::LoseHp(3)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        2 => RandomEvent {
            title: "古代の書庫".to_string(),
            description: "埃をかぶった書物で満たされた部屋。ほとんどは損傷していて読めないが、いくつかは残っている。一冊しか学ぶ時間はない…".to_string(),
            choices: vec![
                EventChoice {
                    label: "戦闘書を学ぶ（STR+5）".to_string(),
                    description: "高度な戦闘技術を習得する。".to_string(),
                    consequences: vec![EventConsequence::GainStrPermanent(5)],
                    is_risky: false,
                },
                EventChoice {
                    label: "魔法典を学ぶ（INT+5、MP+20）".to_string(),
                    description: "魔法の理解を深める。".to_string(),
                    consequences: vec![
                        EventConsequence::GainIntPermanent(5),
                        EventConsequence::GainMaxMp(20),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "禁断の書を学ぶ（スキル取得）".to_string(),
                    description: "内容は警告で封印されている。ハイリスク・ハイリターン。".to_string(),
                    consequences: vec![EventConsequence::LearnRandomSkill],
                    is_risky: true,
                },
            ],
            is_irreversible: true,
        },
        3 => RandomEvent {
            title: "賭博師".to_string(),
            description: "マントを羽織った謎めいた人物が即席の机に座っている。「旅人よ、運命を賭けてみるか？倍か無か——お前の全てを。」".to_string(),
            choices: vec![
                EventChoice {
                    label: "ゴールドを賭ける（50/50：×3か全額没収）".to_string(),
                    description: "財布を使った純粋な博打。".to_string(),
                    consequences: vec![EventConsequence::GainGold(rng.gen_range(0..2) * 300 * floor)],
                    is_risky: true,
                },
                EventChoice {
                    label: "力を賭ける（STR+15かSTR-8）".to_string(),
                    description: "肉体的な力を賭ける博打。".to_string(),
                    consequences: if rng.gen_bool(0.4) {
                        vec![EventConsequence::GainStrPermanent(15)]
                    } else {
                        vec![EventConsequence::GainStrPermanent(-8)]
                    },
                    is_risky: true,
                },
                EventChoice {
                    label: "賭けを断る".to_string(),
                    description: "やる価値のないゲームもある。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        4 => RandomEvent {
            title: "呪われた宝物庫".to_string(),
            description: "金と宝石が輝く部屋。だが何かがおかしい——空気が暗黒魔法でざわめいている。看板には書かれている：「取れ、そして呪われよ。」".to_string(),
            choices: vec![
                EventChoice {
                    label: "財宝を奪う（次フロア呪い）".to_string(),
                    description: "富はお前のものだが、呪いがついてくる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainGold(500 * floor),
                        EventConsequence::GainRandomItem,
                        EventConsequence::CursedFloor,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "少しだけ取る（次フロア祝福）".to_string(),
                    description: "自制すれば、均衡が報酬をもたらす。".to_string(),
                    consequences: vec![
                        EventConsequence::GainGold(100 * floor),
                        EventConsequence::BlessedFloor,
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "財宝を砕く（LUK永続増加）".to_string(),
                    description: "呪われた金を砕く。宇宙は徳を称える。".to_string(),
                    consequences: vec![EventConsequence::GainLukPermanent(10)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        5 => RandomEvent {
            title: "虚無の裂け目".to_string(),
            description: "現実の裂け目が空中に漂い、暗黒の渦を巻いている。内側から声が呼びかける…想像を絶する力を約束しながら。".to_string(),
            choices: vec![
                EventChoice {
                    label: "裂け目に手を伸ばす（永続ステータス変化）".to_string(),
                    description: "虚無から何かを引き出す。栄光か恐怖か。".to_string(),
                    consequences: if rng.gen_bool(0.5) {
                        vec![EventConsequence::GainStrPermanent(10), EventConsequence::GainIntPermanent(10)]
                    } else {
                        vec![EventConsequence::GainMaxHp(-40), EventConsequence::GainMaxMp(-20)]
                    },
                    is_risky: true,
                },
                EventChoice {
                    label: "裂け目をくぐる（深部フロアへ転送）".to_string(),
                    description: "ダンジョン深部への片道旅。".to_string(),
                    consequences: vec![EventConsequence::TeleportToFloor(floor + rng.gen_range(3..7))],
                    is_risky: true,
                },
                EventChoice {
                    label: "裂け目を封印する（EXP獲得）".to_string(),
                    description: "知識を使って安全に裂け目を閉じる。".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 100)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        6 => RandomEvent {
            title: "商人の亡霊".to_string(),
            description: "死して久しい商人の霊が現れ、幻の商品が輝いている。「逝く前に最後の商売をさせてくれ…」".to_string(),
            choices: vec![
                EventChoice {
                    label: "レアな武器を買う（500ゴールド）".to_string(),
                    description: "かなり強力な幻の武器。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseGold(500),
                        EventConsequence::GainRandomItem,
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "最良のアイテムをランダム3個と交換".to_string(),
                    description: "最良の装備を多様性に賭ける。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseRandomItem,
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainRandomItem,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "知識を請う（スキル習得）".to_string(),
                    description: "亡霊商人は多くの秘密を知っている。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseGold(200),
                        EventConsequence::LearnRandomSkill,
                    ],
                    is_risky: false,
                },
            ],
            is_irreversible: false,
        },
        7 => RandomEvent {
            title: "竜の卵".to_string(),
            description: "温かく黄金色の卵が骨の巣に座っている。命の脈動を感じる。持ち去れば産んだ何かを怒らせるかもしれない…".to_string(),
            choices: vec![
                EventChoice {
                    label: "卵を奪う（レア素材＋リスク）".to_string(),
                    description: "竜の卵は無価値ではない——持ち続けられればだが。".to_string(),
                    consequences: vec![
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainGold(1000),
                        EventConsequence::CursedFloor,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "卵を砕く（エネルギーから力を得る）".to_string(),
                    description: "竜の潜在的な力を自分のものにする。".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(5),
                        EventConsequence::GainMaxHp(30),
                        EventConsequence::GainDefPermanent(5),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "卵を置いておく（祝福を受ける）".to_string(),
                    description: "竜の遺産を尊重する。報酬が待っている。".to_string(),
                    consequences: vec![
                        EventConsequence::BlessedFloor,
                        EventConsequence::GainExp(floor * 80),
                    ],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        8 => RandomEvent {
            title: "魂の鏡".to_string(),
            description: "巨大な黒曜石の鏡が体ではなく魂を映し出す。映った自分が手を伸ばす：「一緒になれ——完全体になれ。」".to_string(),
            choices: vec![
                EventChoice {
                    label: "鏡と融合する（全ステータス+3、最大HP-30%）".to_string(),
                    description: "肉体と魂の危険な融合。".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(3),
                        EventConsequence::GainDefPermanent(3),
                        EventConsequence::GainIntPermanent(3),
                        EventConsequence::GainLukPermanent(3),
                        EventConsequence::GainMaxHp(-30),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "鏡を砕く（弱点を消す）".to_string(),
                    description: "鏡を割って自分に掛かった呪いを解く。".to_string(),
                    consequences: vec![
                        EventConsequence::GainLukPermanent(15),
                        EventConsequence::LoseHp(10),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "鏡の自分を観察する（スキル習得）".to_string(),
                    description: "魂が新しいことを教えてくれる。".to_string(),
                    consequences: vec![EventConsequence::LearnRandomSkill],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        9 => RandomEvent {
            title: "戦士の墓".to_string(),
            description: "伝説の戦士の墓を発見した。装備品は何世紀も経ってまだ無傷だ。死者を乱すことには代償がある…".to_string(),
            choices: vec![
                EventChoice {
                    label: "装備品を奪う".to_string(),
                    description: "墓を荒らして強力な装備を手に入れる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainRandomItem,
                        EventConsequence::CursedFloor,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "手を合わせてお供えをする".to_string(),
                    description: "戦士を尊重する。霊が祝福してくれるかもしれない。".to_string(),
                    consequences: vec![
                        EventConsequence::GainExp(floor * 60),
                        EventConsequence::GainStrPermanent(4),
                    ],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        10 => RandomEvent {
            title: "運命の十字路".to_string(),
            description: "三つの道が目の前で分かれている。それぞれに紋章が刻まれている：⚔️ 力、🌟 魔法、🗡️ 策略。前に進める道は一つだけ。".to_string(),
            choices: vec![
                EventChoice {
                    label: "戦士の道を進む（STR+8、HP+40）".to_string(),
                    description: "力の道を歩む。".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(8),
                        EventConsequence::GainMaxHp(40),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "魔法使いの道を進む（INT+8、MP+40）".to_string(),
                    description: "魔法の道を歩む。".to_string(),
                    consequences: vec![
                        EventConsequence::GainIntPermanent(8),
                        EventConsequence::GainMaxMp(40),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "盗賊の道を進む（DEX+8、LUK+8）".to_string(),
                    description: "策略の道を歩む。".to_string(),
                    consequences: vec![
                        EventConsequence::GainDefPermanent(4),
                        EventConsequence::GainLukPermanent(8),
                    ],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        _ => RandomEvent {
            title: "最終試練".to_string(),
            description: "轟く声がダンジョンに響き渡る：「深く潜り込んだな。価値を証明せよ——試練を生き延びよ！」".to_string(),
            choices: vec![
                EventChoice {
                    label: "試練を受ける（強敵と戦う、レジェンダリーアイテム獲得）".to_string(),
                    description: "伝説の報酬のために強力な挑戦に立ち向かう。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHp(50),
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainExp(floor * 200),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "試練から逃げる（スキップ、EXP-100）".to_string(),
                    description: "危険を避けるが報酬を逃す。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
    };

    Some(event)
}
