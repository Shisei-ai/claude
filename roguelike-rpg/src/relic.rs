use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum RelicEffect {
    // ── 秘宝（プラス効果）──
    ReviveOnce,             // 致死ダメージを1回だけHP1で耐える（フロアごと）
    ExpMultiplier(u32),     // 取得EXP倍率 (150 = 1.5倍)
    GoldMultiplier(u32),    // 取得ゴールド倍率 (200 = 2倍)
    MaxHpBoost(i32),        // 最大HP増加
    MaxMpBoost(i32),        // 最大MP増加
    CooldownAccelerate,     // クールダウン毎ターン2ずつ減少
    LifeStealBoost(u32),    // 追加ライフスティール%
    DamageReflect(u32),     // ダメージ反射%
    LukBoost(i32),          // LUK増加
    HpRegenBoost(i32),      // 毎ターンHP回復増加
    AttackBoost(i32),       // 攻撃力増加
    MapReveal,              // 取得時にフロア全体を解明

    // ── 呪物（マイナス効果）──
    MaxHpPenalty(i32),      // 最大HP減少
    MaxMpPenalty(i32),      // 最大MP減少
    AttackPenalty(i32),     // 攻撃力減少
    DefensePenalty(i32),    // 防御力減少
    SkillHpCost(i32),       // スキル使用時に追加HP消費
    StepHpDrain(u32, i32),  // N歩ごとにHP-M
    TurnSkipChance(u32),    // 毎ターン行動不能になる確率%
    TurnPoisonChance(u32),  // 毎ターン毒ダメージを受ける確率%
    CooldownPenalty(u32),   // スキルCDに追加ターン
    ExpPenalty(u32),        // EXP取得率% (50 = 半分)
    GoldOnDamage(u32),      // ダメージ時にゴールド%を喪失
    MpCostMultiplier(u32),  // スキルMP消費増加%
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Relic {
    pub id: usize,
    pub name: String,
    pub is_cursed: bool,
    pub effect: RelicEffect,
    pub description: String,
}

pub fn all_relics() -> Vec<Relic> {
    vec![
        // ═════ 秘宝 ═════
        Relic {
            id: 0,
            name: "不死鳥の羽".to_string(),
            is_cursed: false,
            effect: RelicEffect::ReviveOnce,
            description: "致死ダメージを受けた際、一度だけHP1で生き残る（フロアごとに1回）。".to_string(),
        },
        Relic {
            id: 1,
            name: "賢者の石".to_string(),
            is_cursed: false,
            effect: RelicEffect::ExpMultiplier(150),
            description: "獲得EXPが1.5倍になる。修練の道は加速する。".to_string(),
        },
        Relic {
            id: 2,
            name: "黄金の聖杯".to_string(),
            is_cursed: false,
            effect: RelicEffect::GoldMultiplier(200),
            description: "モンスター討伐で得るゴールドが2倍になる。".to_string(),
        },
        Relic {
            id: 3,
            name: "竜の心臓".to_string(),
            is_cursed: false,
            effect: RelicEffect::MaxHpBoost(80),
            description: "竜の生命力が宿り、最大HPが80増加する。".to_string(),
        },
        Relic {
            id: 4,
            name: "魔力の結晶".to_string(),
            is_cursed: false,
            effect: RelicEffect::MaxMpBoost(60),
            description: "純粋な魔力が凝縮された結晶。最大MPが60増加する。".to_string(),
        },
        Relic {
            id: 5,
            name: "時の砂時計".to_string(),
            is_cursed: false,
            effect: RelicEffect::CooldownAccelerate,
            description: "時を操る砂時計。スキルのクールダウンが毎ターン2ずつ減少する。".to_string(),
        },
        Relic {
            id: 6,
            name: "吸血の指輪".to_string(),
            is_cursed: false,
            effect: RelicEffect::LifeStealBoost(25),
            description: "与えたダメージの25%をHPとして吸収する。戦えば戦うほど癒える。".to_string(),
        },
        Relic {
            id: 7,
            name: "反射の盾".to_string(),
            is_cursed: false,
            effect: RelicEffect::DamageReflect(25),
            description: "受けたダメージの25%を攻撃してきた相手へ反射する。".to_string(),
        },
        Relic {
            id: 8,
            name: "幸運の四葉".to_string(),
            is_cursed: false,
            effect: RelicEffect::LukBoost(15),
            description: "奇跡の四葉のクローバー。LUKが15増加し、クリティカル率が上昇する。".to_string(),
        },
        Relic {
            id: 9,
            name: "回復の泉石".to_string(),
            is_cursed: false,
            effect: RelicEffect::HpRegenBoost(5),
            description: "古代の癒しの泉から作られた石。毎ターンHPが5自動回復する。".to_string(),
        },
        Relic {
            id: 10,
            name: "戦意の紋章".to_string(),
            is_cursed: false,
            effect: RelicEffect::AttackBoost(15),
            description: "不滅の闘士の意志が宿る紋章。攻撃力が15増加する。".to_string(),
        },
        Relic {
            id: 11,
            name: "千里眼の宝珠".to_string(),
            is_cursed: false,
            effect: RelicEffect::MapReveal,
            description: "拾った瞬間、このフロアの全マップが解明される。危険も宝も見通す眼。".to_string(),
        },
        // ═════ 呪物 ═════
        Relic {
            id: 12,
            name: "呪われた骸骨".to_string(),
            is_cursed: true,
            effect: RelicEffect::MaxHpPenalty(40),
            description: "死者の怨念が宿る骸骨。最大HPが40減少する。".to_string(),
        },
        Relic {
            id: 13,
            name: "血の石板".to_string(),
            is_cursed: true,
            effect: RelicEffect::SkillHpCost(15),
            description: "血で書かれた契約書。スキル使用時、MPに加えてHPが15追加消費される。".to_string(),
        },
        Relic {
            id: 14,
            name: "餓鬼の縄".to_string(),
            is_cursed: true,
            effect: RelicEffect::StepHpDrain(3, 2),
            description: "常に腹を空かせた亡霊の縄。3歩歩くごとにHPが2失われる。".to_string(),
        },
        Relic {
            id: 15,
            name: "亡霊の鎖".to_string(),
            is_cursed: true,
            effect: RelicEffect::TurnSkipChance(25),
            description: "見えない鎖が手足を縛る。25%の確率でターンを無駄に消費してしまう。".to_string(),
        },
        Relic {
            id: 16,
            name: "疫病の壺".to_string(),
            is_cursed: true,
            effect: RelicEffect::TurnPoisonChance(20),
            description: "封じられた疫病が漏れ続ける壺。毎ターン20%の確率で毒ダメージを受ける。".to_string(),
        },
        Relic {
            id: 17,
            name: "暗黒の封印".to_string(),
            is_cursed: true,
            effect: RelicEffect::CooldownPenalty(3),
            description: "スキルを封じる古代の印。スキル使用後のクールダウンが3ターン追加される。".to_string(),
        },
        Relic {
            id: 18,
            name: "老いの呪い".to_string(),
            is_cursed: true,
            effect: RelicEffect::ExpPenalty(50),
            description: "時間を奪う老いの呪い。獲得するEXPが半分になる。".to_string(),
        },
        Relic {
            id: 19,
            name: "貧乏神の祟り".to_string(),
            is_cursed: true,
            effect: RelicEffect::GoldOnDamage(5),
            description: "ダメージを受けるたびに所持ゴールドの5%が霧散する。".to_string(),
        },
        Relic {
            id: 20,
            name: "弱体の烙印".to_string(),
            is_cursed: true,
            effect: RelicEffect::AttackPenalty(10),
            description: "弱者の烙印が押された。攻撃力が10減少する。".to_string(),
        },
        Relic {
            id: 21,
            name: "脆弱の烙印".to_string(),
            is_cursed: true,
            effect: RelicEffect::DefensePenalty(8),
            description: "脆さの烙印が刻まれた。防御力が8減少する。".to_string(),
        },
        Relic {
            id: 22,
            name: "悪魔の瞳".to_string(),
            is_cursed: true,
            effect: RelicEffect::MaxMpPenalty(40),
            description: "悪魔が宿る眼球。絶えずMPを吸い取り、最大MPが40減少する。".to_string(),
        },
        Relic {
            id: 23,
            name: "魔力枯渇".to_string(),
            is_cursed: true,
            effect: RelicEffect::MpCostMultiplier(50),
            description: "魔力を浪費させる呪い。全スキルのMP消費が50%増加する。".to_string(),
        },
    ]
}

/// フロアに応じたランダムな秘宝または呪物を返す
pub fn random_relic(rng: &mut impl Rng, floor: u32) -> Relic {
    let all = all_relics();
    // 深いフロアほど呪物が出やすい
    let cursed_chance = 35u32.saturating_add(floor.min(15) * 2);
    let want_cursed = rng.gen_range(0..100) < cursed_chance;
    let candidates: Vec<&Relic> = all.iter().filter(|r| r.is_cursed == want_cursed).collect();
    let pool = if candidates.is_empty() { all.iter().collect() } else { candidates };
    pool[rng.gen_range(0..pool.len())].clone()
}
