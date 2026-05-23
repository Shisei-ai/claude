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
    CursedFloor,
    BlessedFloor,
    LearnRandomSkill,
    UnlockSkillBranch,
    TeleportToFloor(u32),
    // ── 祠専用 ──────────────────────────────────────────────
    FullRestoreHpMp,        // HP・MP完全回復＋状態異常解除
    LoseHpPct(u32),         // 最大HPの何%を失う（直接ダメージ）
    LoseAllGold,            // 全ゴールドを失う
    GainPositiveRelic,      // ランダム秘宝を授与
    GainNegativeRelic,      // ランダム呪物を授与
    KillAllMonsters,        // このフロアの全モンスターを消滅
    ResetSkillCooldowns,    // 全スキルのクールダウンをリセット
    SetHpToOne,             // HPを強制的に1にする（防御無視）
    GainLevelUp,            // 強制レベルアップ
    GainEndingRelic(usize), // エンディング秘宝を獲得（ID指定）
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
    pub triggers_floor_reload: bool,  // false = 祠イベントなど、階層を再生成しない
}

pub fn generate_floor_event(floor: u32) -> Option<RandomEvent> {
    use rand::Rng;
    let mut rng = rand::thread_rng();

    let event_roll = rng.gen_range(0..12u32);

    let event = match event_roll {
        0 => RandomEvent {
            title: "謎めいた祭壇".to_string(),
            description: "暗黒のエネルギーが脈動する古代の祭壇を発見した。声がつぶやく：「血を捧げよ、そうすれば力を授けよう…」".to_string(),
            choices: vec![
                EventChoice {
                    label: "血を捧げる（最大HP永続-20）".to_string(),
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
        },
        3 => RandomEvent {
            title: "賭博師".to_string(),
            description: "マントを羽織った謎めいた人物が即席の机に座っている。「旅人よ、運命を賭けてみるか？カードはもう切った——お前が選ぶだけだ。」".to_string(),
            choices: vec![
                EventChoice {
                    label: "ゴールドを賭ける".to_string(),
                    description: "賭博師はにやりと笑う。何が起きるかは、カードをめくるまで分からない。".to_string(),
                    consequences: vec![EventConsequence::GainGold(rng.gen_range(0..2) * 300 * floor)],
                    is_risky: true,
                },
                EventChoice {
                    label: "力を賭ける".to_string(),
                    description: "運命が力を与えるか、奪うか——賭博師は何も言わない。".to_string(),
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
        },
        8 => RandomEvent {
            title: "魂の鏡".to_string(),
            description: "巨大な黒曜石の鏡が体ではなく魂を映し出す。映った自分が手を伸ばす：「一緒になれ——完全体になれ。」".to_string(),
            choices: vec![
                EventChoice {
                    label: "鏡と融合する（全ステータス+3、最大HP-30）".to_string(),
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
            triggers_floor_reload: true,
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
            triggers_floor_reload: true,
        },
        10 => RandomEvent {
            title: "運命の十字路".to_string(),
            description: "三つの道が目の前で分かれている。それぞれに紋章が刻まれている：⚔ 力、✦ 魔法、🗡 策略。前に進める道は一つだけ。".to_string(),
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
                    label: "盗賊の道を進む（DEF+4、LUK+8）".to_string(),
                    description: "策略の道を歩む。".to_string(),
                    consequences: vec![
                        EventConsequence::GainDefPermanent(4),
                        EventConsequence::GainLukPermanent(8),
                    ],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: true,
        },
        _ => RandomEvent {
            title: "最終試練".to_string(),
            description: "轟く声がダンジョンに響き渡る：「深く潜り込んだな。価値を証明せよ——試練を生き延びよ！」".to_string(),
            choices: vec![
                EventChoice {
                    label: "試練を受ける（ダメージ、EXP大量獲得）".to_string(),
                    description: "伝説の報酬のために強力な挑戦に立ち向かう。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHp(50),
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainExp(floor * 200),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "試練から逃げる".to_string(),
                    description: "危険を避けるが報酬を逃す。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: true,
        },
    };

    Some(event)
}

/// フロア移動時に低確率で発生するエンディング変更イベント。
/// already_acquired: プレイヤーが既に持っているエンディング秘宝のID一覧。
/// 既に持っているものは出現しない。
pub fn generate_ending_event(floor: u32, already_acquired: &[usize]) -> Option<RandomEvent> {
    use rand::Rng;
    let mut rng = rand::thread_rng();

    // フロア5未満 or 確率20%でのみ発生
    if floor < 5 || rng.gen_range(0..100) >= 20 {
        return None;
    }

    // 獲得済みを除いた候補を選ぶ
    let candidates: Vec<usize> = (24..=28usize)
        .filter(|id| !already_acquired.contains(id))
        .collect();
    if candidates.is_empty() {
        return None;
    }

    let relic_id = candidates[rng.gen_range(0..candidates.len())];

    let event = match relic_id {
        24 => RandomEvent {
            title: "深淵の呼び声".to_string(),
            description: "暗い廊下の奥から、ひとつの眼が煌めいている。\n声が響く――「お前は深淵を覗いたことがあるか？\n覗けば、深淵もお前を覗く。それが契約だ……」".to_string(),
            choices: vec![
                EventChoice {
                    label: "深淵を覗く（深淵の瞳を入手）".to_string(),
                    description: "虚無の王との決戦が約束される。ただし、最終ボスが変わる。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHp(30),
                        EventConsequence::GainEndingRelic(24),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "目をそらして立ち去る".to_string(),
                    description: "深淵の声は消え、廊下に静寂が戻る。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },
        25 => RandomEvent {
            title: "炎帝の試練".to_string(),
            description: "炎に包まれた祭壇が突如現れた。\n古代の書物が燃えながら浮かんでいる。\n「炎の審判を受けよ。お前が真の勇者ならば、炎は敵ではない」".to_string(),
            choices: vec![
                EventChoice {
                    label: "聖典を手に取る（炎帝の聖典を入手）".to_string(),
                    description: "炎帝との決戦が確定する。HP全回復の恩寵と引き換えに、最終ボスが変わる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainEndingRelic(25),
                        EventConsequence::FullRestoreHpMp,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "祭壇の前で頭を垂れ立ち去る".to_string(),
                    description: "炎は静かに消え、祭壇も消える。EXPだけが残る。".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 60)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },
        26 => RandomEvent {
            title: "永遠の冬の残滓".to_string(),
            description: "床に半ば埋もれた氷の結晶が薄く輝いている。\n触れると周囲の空気が凍りつき、女性の声が聞こえる。\n「この結晶を持っていきなさい……そして私の元に来なさい」".to_string(),
            choices: vec![
                EventChoice {
                    label: "氷晶を砕いて吸収する（永遠氷晶を入手）".to_string(),
                    description: "氷の女王との決戦が約束される。最大HPが増加するが最終ボスが変わる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainEndingRelic(26),
                        EventConsequence::GainMaxHp(50),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "結晶に触れずに立ち去る".to_string(),
                    description: "氷の声は遠ざかり、結晶は元通りに光を失う。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },
        27 => RandomEvent {
            title: "混沌の亀裂".to_string(),
            description: "壁に巨大な亀裂が走り、その奥から不規則な光が漏れている。\n現実と夢の境界が溶けていくような感覚に陥る。\n「入れ。それとも逃げるか。どちらでも構わん――結末は同じだ」".to_string(),
            choices: vec![
                EventChoice {
                    label: "亀裂に手を伸ばす（混沌の欠片を入手）".to_string(),
                    description: "混沌の化身との決戦が確定する。スキルポイント＋3と引き換えに最終ボスが変わる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainEndingRelic(27),
                        EventConsequence::GainLevelUp,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "亀裂から距離を置く".to_string(),
                    description: "光は弱まり、亀裂は静かに閉じていく。".to_string(),
                    consequences: vec![EventConsequence::GainGold(200 * floor)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },
        _ => RandomEvent {
            title: "古代の番人の碑文".to_string(),
            description: "苔むした石板に、解読困難な古代文字が刻まれている。\nじっと見つめると文字が光り始め、意味が脳裏に流れ込んでくる。\n「汝、この石を持ちて、番人の試練を受けよ」".to_string(),
            choices: vec![
                EventChoice {
                    label: "碑文から魂石を取り出す（古代魂石を入手）".to_string(),
                    description: "古代の番人との決戦が確定する。全スキルのクールダウンがリセットされる。".to_string(),
                    consequences: vec![
                        EventConsequence::GainEndingRelic(28),
                        EventConsequence::ResetSkillCooldowns,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "碑文を写して立ち去る".to_string(),
                    description: "石板は光を失う。しかし記録は残った。EXPを得る。".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 80)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },
    };

    Some(event)
}

// ────────────────────────────────────────────────────────────────
//  祠専用ランダムイベント（ハイリスク・ハイリターン）
// ────────────────────────────────────────────────────────────────
pub fn generate_shrine_event(floor: u32) -> RandomEvent {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let roll = rng.gen_range(0..8u32);

    match roll {
        // ── 古代の審判の祠 ──────────────────────────────────────
        0 => RandomEvent {
            title: "古代の審判の祠".to_string(),
            description: "神の眼差しがお前を測る。純粋なる力を証明すれば報酬を。財を捧げれば癒しを。去れば神の怒りはない。".to_string(),
            choices: vec![
                EventChoice {
                    label: "試練を受ける（最大HPの50%消費 → STR+12、DEF+8、最大HP+40）".to_string(),
                    description: "神に自身の体を賭け、代わりに永続強化を得る。高リスク・高リターン。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHpPct(50),
                        EventConsequence::GainStrPermanent(12),
                        EventConsequence::GainDefPermanent(8),
                        EventConsequence::GainMaxHp(40),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: format!("財を捧げる（ゴールド{}消費 → HP・MP完全回復）", 300 * floor.max(1)),
                    description: "金で神の御心を買う。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseGold(300 * floor.max(1)),
                        EventConsequence::FullRestoreHpMp,
                        EventConsequence::GainLukPermanent(3),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "立ち去る".to_string(),
                    description: "神は去る者を追わない。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },

        // ── 血の誓約の祠 ────────────────────────────────────────
        1 => RandomEvent {
            title: "血の誓約の祠".to_string(),
            description: "赤黒い石板に刻まれた言葉：「血の誓いを立てよ。我はお前を最強の戦士に変えよう」。祠が脈動している。".to_string(),
            choices: vec![
                EventChoice {
                    label: "全てを捧げる（HP1まで失う → STR+15、DEF+10、最大HP+60）".to_string(),
                    description: "死の淵まで血を流し、神格の力を得る。超高リスク。".to_string(),
                    consequences: vec![
                        EventConsequence::SetHpToOne,
                        EventConsequence::GainStrPermanent(15),
                        EventConsequence::GainDefPermanent(10),
                        EventConsequence::GainMaxHp(60),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "半分を捧げる（最大HPの50%消費 → ランダム秘宝）".to_string(),
                    description: "中程度の犠牲でランダムな秘宝を授かる。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHpPct(50),
                        EventConsequence::GainPositiveRelic,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "断る（神の小さな怒り：HP-10）".to_string(),
                    description: "誓いを拒めば、神は去り際に小さな痛みを与える。".to_string(),
                    consequences: vec![EventConsequence::LoseHp(10)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },

        // ── 運命の天秤の祠 ──────────────────────────────────────
        2 => {
            let lucky = rng.gen_bool(0.5);
            RandomEvent {
                title: "運命の天秤の祠".to_string(),
                description: "二つの皿を持つ天秤が浮かんでいる。「全てを賭けるか、それとも確実な中庸を選ぶか？」".to_string(),
                choices: vec![
                    EventChoice {
                        label: "天秤に全てを賭ける".to_string(),
                        description: "天秤はすでに傾きを決めている。お前の目には見えないが。".to_string(),
                        consequences: if lucky {
                            vec![EventConsequence::FullRestoreHpMp, EventConsequence::GainExp(floor * 250)]
                        } else {
                            vec![EventConsequence::SetHpToOne]
                        },
                        is_risky: true,
                    },
                    EventChoice {
                        label: "均衡を選ぶ（最大HPの50%消費 → STR+8、INT+8）".to_string(),
                        description: "犠牲は確実だが、見返りも確実。".to_string(),
                        consequences: vec![
                            EventConsequence::LoseHpPct(50),
                            EventConsequence::GainStrPermanent(8),
                            EventConsequence::GainIntPermanent(8),
                        ],
                        is_risky: true,
                    },
                    EventChoice {
                        label: "立ち去る".to_string(),
                        description: "賭けに参加しない選択も勇気の一つ。".to_string(),
                        consequences: vec![],
                        is_risky: false,
                    },
                ],
                is_irreversible: true,
                triggers_floor_reload: false,
            }
        },

        // ── 禁忌の聖域 ──────────────────────────────────────────
        3 => RandomEvent {
            title: "禁忌の聖域".to_string(),
            description: "封印された扉の奥に禁断の力が眠る。二つの選択肢が浮かぶ：禁断の力を解き放つか、扉ごと砕くか。".to_string(),
            choices: vec![
                EventChoice {
                    label: "禁忌を解放（秘宝と呪物を同時取得）".to_string(),
                    description: "光と闇が同時に降り注ぐ。祝福と呪いを共に受け入れる覚悟があるか？".to_string(),
                    consequences: vec![
                        EventConsequence::GainPositiveRelic,
                        EventConsequence::GainNegativeRelic,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "扉を砕く（HP1 → 全モンスター消滅）".to_string(),
                    description: "全身全霊の一撃で扉を粉砕。爆発でHP1になるが、フロア全ての敵が消える。".to_string(),
                    consequences: vec![
                        EventConsequence::SetHpToOne,
                        EventConsequence::KillAllMonsters,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "立ち去る".to_string(),
                    description: "禁断には触れないのが賢明かもしれない。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },

        // ── 魂の坩堝の祠 ────────────────────────────────────────
        4 => RandomEvent {
            title: "魂の坩堝の祠".to_string(),
            description: "これまで倒した敵の魂が坩堝の中で渦巻いている。「その魂を再び汝に還そう」と声がする。".to_string(),
            choices: vec![
                EventChoice {
                    label: format!("魂を全て吸収（EXP+{}）", floor * 200 + 100),
                    description: "倒した魂のエネルギーを全てEXPに変換する。".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 200 + 100)],
                    is_risky: false,
                },
                EventChoice {
                    label: "魂と融合する（最大HP-30 → STR+12、DEF+8）".to_string(),
                    description: "魂が肉体に溶け込む。HPの上限は落ちるが永続的な力を得る。".to_string(),
                    consequences: vec![
                        EventConsequence::GainMaxHp(-30),
                        EventConsequence::GainStrPermanent(12),
                        EventConsequence::GainDefPermanent(8),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "魂を解放する（HP・MP完全回復、魂が祝福）".to_string(),
                    description: "魂を安らかに送り出す。見返りに癒しの祝福を受ける。".to_string(),
                    consequences: vec![
                        EventConsequence::FullRestoreHpMp,
                        EventConsequence::GainLukPermanent(5),
                    ],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },

        // ── 黄金神の祠 ──────────────────────────────────────────
        5 => RandomEvent {
            title: "黄金神の祠".to_string(),
            description: "黄金に輝く神像が鎮座している。「財を全て捧げれば、汝を次の段階へ引き上げよう」という声が聞こえる。".to_string(),
            choices: vec![
                EventChoice {
                    label: "全財産を捧げる（全ゴールド消費 → レベルアップ＋完全回復）".to_string(),
                    description: "お金は全て消えるが、一気にレベルアップし完全回復する。究極のトレードオフ。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseAllGold,
                        EventConsequence::GainLevelUp,
                        EventConsequence::FullRestoreHpMp,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: format!("一部を捧げる（ゴールド{}消費 → 最大HP+40、最大MP+30）", 200 * floor.max(1)),
                    description: "それなりの金を捧げ、確実な永続強化を得る。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseGold(200 * floor.max(1)),
                        EventConsequence::GainMaxHp(40),
                        EventConsequence::GainMaxMp(30),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "立ち去る".to_string(),
                    description: "財布を守る。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },

        // ── 時の神の祠 ──────────────────────────────────────────
        6 => RandomEvent {
            title: "時の神の祠".to_string(),
            description: "砂時計の形をした祠。時間そのものが歪んでいる。「過去・現在・未来——どの時を望む？」".to_string(),
            choices: vec![
                EventChoice {
                    label: format!("時を止める（ゴールド{}消費 → 全CDリセット＋MP完全回復）", 400 * floor.max(1)),
                    description: "時を一瞬止め、全スキルのクールダウンをリセット。戦術的に極めて強力。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseGold(400 * floor.max(1)),
                        EventConsequence::ResetSkillCooldowns,
                        EventConsequence::GainMp(999),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: format!("時を加速する（最大HPの50%消費 → {}階へ転送）", floor + 3),
                    description: "3フロア先へ一気に飛ぶ。ただし時の加速の代償で半分のHPを失う。".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHpPct(50),
                        EventConsequence::TeleportToFloor(floor + 3),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "立ち去る".to_string(),
                    description: "時の流れには逆らわない。".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
            triggers_floor_reload: false,
        },

        // ── 狂気の神の祠 ────────────────────────────────────────
        _ => {
            let good_outcome = rng.gen_bool(0.45);
            RandomEvent {
                title: "狂気の神の祠".to_string(),
                description: "祠全体がぐにゃりと歪んでいる。笑い声が響き渡る。「全てを賭けるか？さあさあ——狂気に飛び込め！」".to_string(),
                choices: vec![
                    EventChoice {
                        label: "狂気を取り込む（45%：全能力大幅強化 / 55%：全能力大幅弱体）".to_string(),
                        description: if good_outcome {
                            "★ 狂気が力に変わる——全能力が大幅上昇する！".to_string()
                        } else {
                            "★ 狂気に飲み込まれた——全能力が大幅低下する…".to_string()
                        },
                        consequences: if good_outcome {
                            vec![
                                EventConsequence::GainStrPermanent(18),
                                EventConsequence::GainDefPermanent(10),
                                EventConsequence::GainIntPermanent(12),
                                EventConsequence::GainLukPermanent(8),
                                EventConsequence::GainMaxHp(60),
                            ]
                        } else {
                            vec![
                                EventConsequence::GainStrPermanent(-10),
                                EventConsequence::GainDefPermanent(-6),
                                EventConsequence::GainMaxHp(-50),
                                EventConsequence::GainMaxMp(-30),
                            ]
                        },
                        is_risky: true,
                    },
                    EventChoice {
                        label: "秘宝と呪物を同時に受け取る".to_string(),
                        description: "狂気の神は必ず光と影の両方を与える。結果は確実だが内容は選べない。".to_string(),
                        consequences: vec![
                            EventConsequence::GainPositiveRelic,
                            EventConsequence::GainNegativeRelic,
                        ],
                        is_risky: true,
                    },
                    EventChoice {
                        label: "立ち去る（狂気の神の嘲笑を受ける：HP-15）".to_string(),
                        description: "逃げることもできるが、神は嘲笑いながら痛みを与える。".to_string(),
                        consequences: vec![EventConsequence::LoseHp(15)],
                        is_risky: false,
                    },
                ],
                is_irreversible: true,
                triggers_floor_reload: false,
            }
        }
    }
}

