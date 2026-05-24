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
    // ── エンディング変更（特殊イベント限定）──
    EndingBoss(String),     // 最終ボスの種類を変える

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

    // ── 新規秘宝効果 ──
    DefenseBoost(i32),         // 防御力増加
    MpRegenBoost(i32),         // 毎ターンMP自動回復
    DexBoost(i32),             // DEX増加（先制率向上）
    IntBoost(i32),             // INT増加（魔法強化）
    LowHpAttackBoost(i32),     // HP30%以下で攻撃力大幅増加
    LowHpDefenseBoost(i32),    // HP30%以下で防御力大幅増加
    CritDamageBoost(u32),      // クリティカルダメージ増加%
    SkillDamageBoost(u32),     // スキルダメージ増加%
    MpStealOnHit(i32),         // 攻撃命中時MP回復
    SkillRefundOnKill(u32),    // 敵撃破時スキルCD減少
    PostBattleHeal(i32),       // 戦闘勝利後HP回復
    ExtraDropChance(u32),      // 追加アイテムドロップ確率%
    GoldOnStep(u32),           // 歩くたびにゴールド獲得
    PoisonImmunity,            // 毒状態完全免疫
    FirstAttackBoost(i32),     // 戦闘最初の攻撃にボーナスダメージ
    FreeCastChance(u32),       // スキルMPコスト無効化確率%
    CdRefundOnSkill(u32),      // スキル使用後に他スキルCD減少
    HealingBoost(u32),         // 全HP回復効果増加%
    CounterAttackChance(u32),  // 被攻撃時に反撃する確率%
    AllDamageBoost(u32),       // 全攻撃ダメージ増加%
    TreasureRadar,             // フロア生成時に宝箱位置を自動解明
    ExtraGoldOnKill(u32),      // 撃破時ゴールド追加%
    StrengthFromHp,            // 最大HPの1/20が攻撃力に加算
    OnKillHeal(i32),           // 敵撃破時HP回復
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
        // ═════ エンディング秘宝（特殊イベントのみ入手可）═════
        Relic {
            id: 24,
            name: "深淵の瞳".to_string(),
            is_cursed: false,
            effect: RelicEffect::EndingBoss("abyss".to_string()),
            description: "深淵から覗く瞳。持つ者の運命を、虚無の王との戦いへ導く。".to_string(),
        },
        Relic {
            id: 25,
            name: "炎帝の聖典".to_string(),
            is_cursed: false,
            effect: RelicEffect::EndingBoss("flame".to_string()),
            description: "炎神の審判が記された禁断の書。持つ者に炎帝との決戦を約束する。".to_string(),
        },
        Relic {
            id: 26,
            name: "永遠氷晶".to_string(),
            is_cursed: false,
            effect: RelicEffect::EndingBoss("ice".to_string()),
            description: "永遠の冬を閉じ込めた結晶。持つ者を氷の支配者との戦いへ誘う。".to_string(),
        },
        Relic {
            id: 27,
            name: "混沌の欠片".to_string(),
            is_cursed: false,
            effect: RelicEffect::EndingBoss("chaos".to_string()),
            description: "混沌そのものの破片。持つ者の世界を混沌の化身が支配しようとする。".to_string(),
        },
        Relic {
            id: 28,
            name: "古代魂石".to_string(),
            is_cursed: false,
            effect: RelicEffect::EndingBoss("ancient".to_string()),
            description: "千年の眠りを封じた魂石。持つ者の前に太古の番人が復活する。".to_string(),
        },
        // ═════ 追加秘宝（29〜52）═════
        Relic { id: 29, name: "鉄壁の護符".to_string(), is_cursed: false,
            effect: RelicEffect::DefenseBoost(12),
            description: "古の戦士が鍛えし護符。防御力が12増加する。".to_string() },
        Relic { id: 30, name: "霊力の源泉".to_string(), is_cursed: false,
            effect: RelicEffect::MpRegenBoost(4),
            description: "霊峰より湧き出る魔力の石。毎ターンMPが4自動回復する。".to_string() },
        Relic { id: 31, name: "俊足の符".to_string(), is_cursed: false,
            effect: RelicEffect::DexBoost(12),
            description: "風神が刻みし符。DEXが12増加し、先制攻撃率が上昇する。".to_string() },
        Relic { id: 32, name: "知略の結晶".to_string(), is_cursed: false,
            effect: RelicEffect::IntBoost(15),
            description: "知恵の精霊が宿る結晶。INTが15増加し、魔法・スキルが強化される。".to_string() },
        Relic { id: 33, name: "血戦の誓い".to_string(), is_cursed: false,
            effect: RelicEffect::LowHpAttackBoost(40),
            description: "背水の陣で力が覚醒する。HP30%以下の時、攻撃力が40増加する。".to_string() },
        Relic { id: 34, name: "不屈の心".to_string(), is_cursed: false,
            effect: RelicEffect::LowHpDefenseBoost(30),
            description: "極限状態で本能が目覚める。HP30%以下の時、防御力が30増加する。".to_string() },
        Relic { id: 35, name: "月光の結晶".to_string(), is_cursed: false,
            effect: RelicEffect::CritDamageBoost(50),
            description: "月夜に光り輝く結晶。クリティカルヒット時のダメージが50%増加する。".to_string() },
        Relic { id: 36, name: "魔法増幅器".to_string(), is_cursed: false,
            effect: RelicEffect::SkillDamageBoost(25),
            description: "古代文明の魔力増幅装置。全スキルのダメージが25%増加する。".to_string() },
        Relic { id: 37, name: "霊魂の蒸留器".to_string(), is_cursed: false,
            effect: RelicEffect::MpStealOnHit(8),
            description: "霊魂から魔力を搾り取る秘器。攻撃命中のたびにMPが8回復する。".to_string() },
        Relic { id: 38, name: "素早い直感".to_string(), is_cursed: false,
            effect: RelicEffect::SkillRefundOnKill(2),
            description: "撃破の瞬間に研ぎ澄まされる直感。敵を倒した時、全スキルCDが2減少する。".to_string() },
        Relic { id: 39, name: "癒しの源泉".to_string(), is_cursed: false,
            effect: RelicEffect::PostBattleHeal(20),
            description: "戦闘後に湧き出る治癒の泉。戦闘勝利後、HPが20回復する。".to_string() },
        Relic { id: 40, name: "錬金術師の指輪".to_string(), is_cursed: false,
            effect: RelicEffect::ExtraDropChance(25),
            description: "錬金術師が遺した指輪。戦闘後25%の確率でアイテムを追加ドロップする。".to_string() },
        Relic { id: 41, name: "黄金律の刻印".to_string(), is_cursed: false,
            effect: RelicEffect::GoldOnStep(2),
            description: "地に宿る富の刻印。1歩歩くごとにゴールドが2枚降り積もる。".to_string() },
        Relic { id: 42, name: "毒耐性の鱗".to_string(), is_cursed: false,
            effect: RelicEffect::PoisonImmunity,
            description: "毒蛇の王から剥ぎ取った鱗。いかなる毒も完全に無効化する。".to_string() },
        Relic { id: 43, name: "先手必勝の章".to_string(), is_cursed: false,
            effect: RelicEffect::FirstAttackBoost(50),
            description: "兵法書の極意。戦闘開始最初の一撃にダメージ+50の奇襲ボーナスが付く。".to_string() },
        Relic { id: 44, name: "呪文の宝玉".to_string(), is_cursed: false,
            effect: RelicEffect::FreeCastChance(20),
            description: "魔力を秘めた宝玉。スキル使用時、20%の確率でMPを消費しない。".to_string() },
        Relic { id: 45, name: "永久機関の歯車".to_string(), is_cursed: false,
            effect: RelicEffect::CdRefundOnSkill(1),
            description: "止まらない歯車の奇跡。スキル使用後、他の全スキルCDが1減少する。".to_string() },
        Relic { id: 46, name: "癒しの絆創膏".to_string(), is_cursed: false,
            effect: RelicEffect::HealingBoost(30),
            description: "神秘の包帯。アイテムやスキルによるHP回復量が30%増加する。".to_string() },
        Relic { id: 47, name: "復讐の炎".to_string(), is_cursed: false,
            effect: RelicEffect::CounterAttackChance(25),
            description: "怒りの炎が宿る秘宝。攻撃を受けた際、25%の確率で即座に反撃する。".to_string() },
        Relic { id: 48, name: "炎帝の加護".to_string(), is_cursed: false,
            effect: RelicEffect::AllDamageBoost(10),
            description: "炎帝の祝福が武器に宿る。全ての攻撃ダメージが10%増加する。".to_string() },
        Relic { id: 49, name: "秘密の羅針盤".to_string(), is_cursed: false,
            effect: RelicEffect::TreasureRadar,
            description: "宝の匂いを嗅ぎつける羅針盤。フロア生成時、宝箱の位置が自動解明される。".to_string() },
        Relic { id: 50, name: "盗賊神の加護".to_string(), is_cursed: false,
            effect: RelicEffect::ExtraGoldOnKill(20),
            description: "盗賊神の微笑み。敵撃破時に得るゴールドが20%追加される。".to_string() },
        Relic { id: 51, name: "肉体強化の秘石".to_string(), is_cursed: false,
            effect: RelicEffect::StrengthFromHp,
            description: "生命力が力に変わる秘石。最大HPの1/20が攻撃力に加算される。".to_string() },
        Relic { id: 52, name: "戦士の魂".to_string(), is_cursed: false,
            effect: RelicEffect::OnKillHeal(10),
            description: "倒れた敵の魂が力を与える。敵を撃破するたびにHPが10回復する。".to_string() },
    ]
}

/// エンディング秘宝のIDリスト（通常ドロップから除外する）
pub const ENDING_RELIC_IDS: &[usize] = &[24, 25, 26, 27, 28];

/// 指定IDのエンディング秘宝を返す
pub fn ending_relic(id: usize) -> Relic {
    all_relics().into_iter().find(|r| r.id == id).expect("ending relic id valid")
}

/// フロアに応じたランダムな秘宝または呪物を返す（既所持IDを除外）
pub fn random_relic(rng: &mut impl Rng, floor: u32, owned_ids: &[usize]) -> Option<Relic> {
    let all = all_relics();
    let cursed_chance = 35u32.saturating_add(floor.min(15) * 2);
    let want_cursed = rng.gen_range(0..100) < cursed_chance;
    let candidates: Vec<&Relic> = all.iter()
        .filter(|r| r.is_cursed == want_cursed && !ENDING_RELIC_IDS.contains(&r.id) && !owned_ids.contains(&r.id))
        .collect();
    let pool: Vec<&Relic> = if candidates.is_empty() {
        all.iter().filter(|r| !ENDING_RELIC_IDS.contains(&r.id) && !owned_ids.contains(&r.id)).collect()
    } else {
        candidates
    };
    if pool.is_empty() { return None; }
    Some(pool[rng.gen_range(0..pool.len())].clone())
}

/// 秘宝（非呪物）をランダムに返す（既所持IDを除外）
pub fn random_positive_relic(rng: &mut impl Rng, _floor: u32, owned_ids: &[usize]) -> Option<Relic> {
    let all = all_relics();
    let pool: Vec<&Relic> = all.iter()
        .filter(|r| !r.is_cursed && !ENDING_RELIC_IDS.contains(&r.id) && !owned_ids.contains(&r.id))
        .collect();
    if pool.is_empty() { return None; }
    Some(pool[rng.gen_range(0..pool.len())].clone())
}

/// 呪物をランダムに返す（既所持IDを除外）
pub fn random_negative_relic(rng: &mut impl Rng, _floor: u32, owned_ids: &[usize]) -> Option<Relic> {
    let all = all_relics();
    let pool: Vec<&Relic> = all.iter()
        .filter(|r| r.is_cursed && !ENDING_RELIC_IDS.contains(&r.id) && !owned_ids.contains(&r.id))
        .collect();
    if pool.is_empty() { return None; }
    Some(pool[rng.gen_range(0..pool.len())].clone())
}
