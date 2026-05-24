use serde::{Deserialize, Serialize};
use crate::item::{Item, ItemKind};
use crate::skill::Skill;
use crate::relic::{Relic, RelicEffect};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Equipment {
    pub weapon: Option<Item>,
    pub armor: Option<Item>,
    pub helmet: Option<Item>,
    pub boots: Option<Item>,
    pub ring: Option<Item>,
    pub amulet: Option<Item>,
}

impl Equipment {
    pub fn empty() -> Self {
        Equipment {
            weapon: None,
            armor: None,
            helmet: None,
            boots: None,
            ring: None,
            amulet: None,
        }
    }

    pub fn total_attack(&self) -> i32 {
        self.weapon.as_ref().map(|i| i.stats.attack).unwrap_or(0)
    }

    pub fn total_defense(&self) -> i32 {
        [&self.armor, &self.helmet, &self.boots, &self.ring, &self.amulet]
            .iter()
            .filter_map(|s| s.as_ref())
            .map(|i| i.stats.defense)
            .sum()
    }

    pub fn total_hp_bonus(&self) -> i32 {
        self.all_items().iter().map(|i| i.stats.hp_bonus).sum()
    }

    pub fn total_mp_bonus(&self) -> i32 {
        self.all_items().iter().map(|i| i.stats.mp_bonus).sum()
    }

    pub fn total_str_bonus(&self) -> i32 {
        self.all_items().iter().map(|i| i.stats.str_bonus).sum()
    }

    pub fn total_int_bonus(&self) -> i32 {
        self.all_items().iter().map(|i| i.stats.int_bonus).sum()
    }

    pub fn all_items(&self) -> Vec<&Item> {
        [
            &self.weapon, &self.armor, &self.helmet,
            &self.boots, &self.ring, &self.amulet,
        ]
        .iter()
        .filter_map(|s| s.as_ref())
        .collect()
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TempBuff {
    pub str_bonus: i32,
    pub def_bonus: i32,
    pub turns_left: u32,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Player {
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub mp: i32,
    pub max_mp: i32,
    pub base_str: i32,
    pub base_def: i32,
    pub base_int: i32,
    pub base_dex: i32,
    pub base_vit: i32,
    pub base_luk: i32,
    pub level: u32,
    pub exp: u32,
    pub exp_to_next: u32,
    pub gold: u32,
    pub floor: u32,
    pub inventory: Vec<Item>,
    pub equipment: Equipment,
    pub skills: Vec<Skill>,
    pub skill_points: u32,
    pub temp_buffs: Vec<TempBuff>,
    pub shield_hp: i32,
    pub poison_turns: u32,
    pub poison_damage: i32,
    pub stun_turns: u32,
    pub crit_bonus_turns: u32,
    pub crit_bonus: u32,
    pub lifesteal_pct: u32,
    pub regen_hp: i32,
    pub regen_mp: i32,
    pub steps_taken: u32,
    pub monsters_killed: u32,
    pub items_collected: u32,
    pub skills_used: u32,
    pub deepest_floor: u32,
    pub blessed_floors: Vec<u32>,
    pub cursed_floors: Vec<u32>,
    pub bestiary: Vec<String>,
    // 秘宝・呪物
    pub relics: Vec<Relic>,
    pub relic_revive_available: bool,
}

impl Player {
    pub fn new(x: i32, y: i32) -> Self {
        let skills = crate::skill::all_skills();
        Player {
            x,
            y,
            hp: 80,
            max_hp: 80,
            mp: 50,
            max_mp: 50,
            base_str: 10,
            base_def: 5,
            base_int: 8,
            base_dex: 8,
            base_vit: 10,
            base_luk: 5,
            level: 1,
            exp: 0,
            exp_to_next: 100,
            gold: 50,
            floor: 1,
            inventory: Vec::new(),
            equipment: Equipment::empty(),
            skills,
            skill_points: 3,
            temp_buffs: Vec::new(),
            shield_hp: 0,
            poison_turns: 0,
            poison_damage: 0,
            stun_turns: 0,
            crit_bonus_turns: 0,
            crit_bonus: 0,
            lifesteal_pct: 0,
            regen_hp: 0,
            regen_mp: 0,
            steps_taken: 0,
            monsters_killed: 0,
            items_collected: 0,
            skills_used: 0,
            deepest_floor: 1,
            blessed_floors: Vec::new(),
            cursed_floors: Vec::new(),
            bestiary: Vec::new(),
            relics: Vec::new(),
            relic_revive_available: false,
        }
    }

    pub fn effective_attack(&self) -> i32 {
        let base = self.base_str + self.equipment.total_attack() + self.equipment.total_str_bonus();
        let temp: i32 = self.temp_buffs.iter().map(|b| b.str_bonus).sum();
        let low_hp = self.relic_low_hp_attack_delta();
        let from_hp = self.relic_strength_from_hp();
        let flat = base + temp + self.relic_attack_delta() + low_hp + from_hp;
        let pct_boost = 100i32 + self.relic_all_damage_boost() as i32;
        (flat * pct_boost / 100).max(1)
    }

    pub fn effective_defense(&self) -> i32 {
        let base = self.base_def + self.equipment.total_defense();
        let temp: i32 = self.temp_buffs.iter().map(|b| b.def_bonus).sum();
        (base + temp + self.relic_defense_delta() + self.relic_low_hp_defense_delta()).max(0)
    }

    pub fn effective_magic(&self) -> i32 {
        self.base_int + self.equipment.total_int_bonus() + self.relic_int_delta()
    }

    pub fn recalc_max_hp(&self) -> i32 {
        (80 + (self.level as i32 - 1) * 12
            + self.base_vit * 4
            + self.equipment.total_hp_bonus()
            + self.passive_hp_bonus()
            + self.relic_max_hp_delta()).max(1)
    }

    pub fn recalc_max_mp(&self) -> i32 {
        (50 + (self.level as i32 - 1) * 6
            + self.base_int * 3
            + self.equipment.total_mp_bonus()
            + self.passive_mp_bonus()
            + self.relic_max_mp_delta()).max(0)
    }

    fn passive_hp_bonus(&self) -> i32 {
        use crate::skill::SkillEffect;
        self.skills.iter()
            .filter(|s| s.learned && s.is_passive)
            .map(|s| match s.effect {
                SkillEffect::PassiveHpBoost(v) => v,
                _ => 0,
            })
            .sum()
    }

    fn passive_mp_bonus(&self) -> i32 {
        use crate::skill::SkillEffect;
        self.skills.iter()
            .filter(|s| s.learned && s.is_passive)
            .map(|s| match s.effect {
                SkillEffect::PassiveMpBoost(v) => v,
                _ => 0,
            })
            .sum()
    }

    pub fn passive_regen_hp(&self) -> i32 {
        use crate::skill::SkillEffect;
        let skill_regen: i32 = self.skills.iter()
            .filter(|s| s.learned && s.is_passive)
            .map(|s| match s.effect {
                SkillEffect::PassiveRegenHp(v) => v,
                _ => 0,
            })
            .sum();
        skill_regen + self.relic_hp_regen()
    }

    pub fn passive_regen_mp(&self) -> i32 {
        use crate::skill::SkillEffect;
        let skill_regen: i32 = self.skills.iter()
            .filter(|s| s.learned && s.is_passive)
            .map(|s| match s.effect {
                SkillEffect::PassiveRegenMp(v) => v,
                _ => 0,
            })
            .sum();
        skill_regen + self.relic_mp_regen()
    }

    pub fn gain_exp(&mut self, amount: u32) -> bool {
        self.exp += amount;
        if self.exp >= self.exp_to_next {
            self.level_up();
            return true;
        }
        false
    }

    fn level_up(&mut self) {
        self.level += 1;
        self.exp -= self.exp_to_next;
        self.exp_to_next = (self.exp_to_next as f32 * 1.4) as u32;
        self.skill_points += 2;

        // Stat gains
        self.base_str += 2;
        self.base_def += 1;
        self.base_int += 1;
        self.base_vit += 2;

        let new_max_hp = self.recalc_max_hp();
        let new_max_mp = self.recalc_max_mp();
        let hp_gain = new_max_hp - self.max_hp;
        let mp_gain = new_max_mp - self.max_mp;
        self.max_hp = new_max_hp;
        self.max_mp = new_max_mp;
        self.hp = (self.hp + hp_gain).min(self.max_hp);
        self.mp = (self.mp + mp_gain).min(self.max_mp);
    }

    pub fn heal(&mut self, amount: i32) {
        if amount <= 0 { self.hp = (self.hp + amount).min(self.max_hp); return; }
        let boost_pct = self.relic_healing_boost();
        let boosted = amount + (amount * boost_pct as i32 / 100);
        self.hp = (self.hp + boosted).min(self.max_hp);
    }

    pub fn heal_mp(&mut self, amount: i32) {
        self.mp = (self.mp + amount).min(self.max_mp);
    }

    pub fn take_damage(&mut self, amount: i32) -> i32 {
        let after_def = (amount - self.effective_defense()).max(1);
        let after_shield = if self.shield_hp > 0 {
            let absorbed = after_def.min(self.shield_hp);
            self.shield_hp -= absorbed;
            after_def - absorbed
        } else {
            after_def
        };
        self.hp = (self.hp - after_shield).max(0);
        after_shield
    }

    pub fn is_alive(&self) -> bool {
        self.hp > 0
    }

    pub fn equip(&mut self, idx: usize) -> Option<Item> {
        if idx >= self.inventory.len() {
            return None;
        }
        let item = self.inventory[idx].clone();
        let old = match item.kind {
            ItemKind::Weapon => self.equipment.weapon.replace(item.clone()),
            ItemKind::Armor => self.equipment.armor.replace(item.clone()),
            ItemKind::Helmet => self.equipment.helmet.replace(item.clone()),
            ItemKind::Boots => self.equipment.boots.replace(item.clone()),
            ItemKind::Ring => self.equipment.ring.replace(item.clone()),
            ItemKind::Amulet => self.equipment.amulet.replace(item.clone()),
            _ => return None,
        };
        self.inventory.remove(idx);
        if let Some(old_item) = old {
            self.inventory.push(old_item.clone());
            return Some(old_item);
        }
        None
    }

    pub fn unequip_slot(&mut self, slot: &str) {
        let item = match slot {
            "weapon" => self.equipment.weapon.take(),
            "armor" => self.equipment.armor.take(),
            "helmet" => self.equipment.helmet.take(),
            "boots" => self.equipment.boots.take(),
            "ring" => self.equipment.ring.take(),
            "amulet" => self.equipment.amulet.take(),
            _ => None,
        };
        if let Some(i) = item {
            self.inventory.push(i);
        }
    }

    pub fn tick_buffs(&mut self) {
        self.temp_buffs.retain_mut(|b| {
            if b.turns_left > 0 {
                b.turns_left -= 1;
                b.turns_left > 0
            } else {
                false
            }
        });

        if self.poison_turns > 0 {
            self.hp = (self.hp - self.poison_damage).max(0);
            self.poison_turns -= 1;
        }
        if self.stun_turns > 0 {
            self.stun_turns -= 1;
        }
        if self.crit_bonus_turns > 0 {
            self.crit_bonus_turns -= 1;
            if self.crit_bonus_turns == 0 {
                self.crit_bonus = 0;
            }
        }

        // Passive regeneration
        let regen_hp = self.passive_regen_hp();
        let regen_mp = self.passive_regen_mp();
        if regen_hp > 0 {
            self.heal(regen_hp);
        }
        if regen_mp > 0 {
            self.heal_mp(regen_mp);
        }
    }

    pub fn add_to_bestiary(&mut self, monster_name: String) {
        if !self.bestiary.contains(&monster_name) {
            self.bestiary.push(monster_name);
        }
    }

    pub fn can_move(&self) -> bool {
        self.stun_turns == 0
    }

    pub fn crit_rate(&self) -> u32 {
        let luk = self.base_luk + self.relic_luk_delta();
        5u32.saturating_add((luk / 2) as u32).saturating_add(self.crit_bonus)
    }

    // ────────────────────────────────────────────
    //  秘宝・呪物 ヘルパーメソッド
    // ────────────────────────────────────────────

    pub fn relic_max_hp_delta(&self) -> i32 {
        self.relics.iter().map(|r| match r.effect {
            RelicEffect::MaxHpBoost(v) => v,
            RelicEffect::MaxHpPenalty(v) => -v,
            _ => 0,
        }).sum()
    }

    pub fn relic_max_mp_delta(&self) -> i32 {
        self.relics.iter().map(|r| match r.effect {
            RelicEffect::MaxMpBoost(v) => v,
            RelicEffect::MaxMpPenalty(v) => -v,
            _ => 0,
        }).sum()
    }

    pub fn relic_attack_delta(&self) -> i32 {
        self.relics.iter().map(|r| match r.effect {
            RelicEffect::AttackBoost(v) => v,
            RelicEffect::AttackPenalty(v) => -v,
            _ => 0,
        }).sum()
    }

    pub fn relic_defense_delta(&self) -> i32 {
        self.relics.iter().map(|r| match r.effect {
            RelicEffect::DefenseBoost(v) => v,
            RelicEffect::DefensePenalty(v) => -(v as i32),
            _ => 0,
        }).sum()
    }

    pub fn relic_luk_delta(&self) -> i32 {
        self.relics.iter().map(|r| match r.effect {
            RelicEffect::LukBoost(v) => v,
            _ => 0,
        }).sum()
    }

    pub fn relic_hp_regen(&self) -> i32 {
        self.relics.iter().map(|r| match r.effect {
            RelicEffect::HpRegenBoost(v) => v,
            _ => 0,
        }).sum()
    }

    pub fn relic_exp_multiplier(&self) -> f32 {
        let mut mult = 1.0f32;
        for r in &self.relics {
            match r.effect {
                RelicEffect::ExpMultiplier(p) => mult *= p as f32 / 100.0,
                RelicEffect::ExpPenalty(p)    => mult *= p as f32 / 100.0,
                _ => {}
            }
        }
        mult
    }

    pub fn relic_gold_multiplier(&self) -> f32 {
        self.relics.iter().fold(1.0f32, |acc, r| {
            if let RelicEffect::GoldMultiplier(p) = r.effect { acc * p as f32 / 100.0 } else { acc }
        })
    }

    pub fn relic_lifesteal(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::LifeStealBoost(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn relic_damage_reflect(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::DamageReflect(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn relic_cooldown_accelerate(&self) -> bool {
        self.relics.iter().any(|r| r.effect == RelicEffect::CooldownAccelerate)
    }

    pub fn relic_turn_skip_chance(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::TurnSkipChance(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn relic_turn_poison_chance(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::TurnPoisonChance(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn relic_cooldown_penalty(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::CooldownPenalty(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn relic_mp_cost_multiplier(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::MpCostMultiplier(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn relic_skill_hp_cost(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::SkillHpCost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_step_drain(&self) -> Option<(u32, i32)> {
        self.relics.iter().find_map(|r| {
            if let RelicEffect::StepHpDrain(every, dmg) = r.effect {
                Some((every, dmg))
            } else {
                None
            }
        })
    }

    pub fn relic_gold_on_damage(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::GoldOnDamage(p) = r.effect { p } else { 0 }
        }).sum()
    }

    pub fn has_revive_relic(&self) -> bool {
        self.relics.iter().any(|r| r.effect == RelicEffect::ReviveOnce)
    }

    // ── 新規秘宝ヘルパー ──

    pub fn relic_mp_regen(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::MpRegenBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_dex_delta(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::DexBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_int_delta(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::IntBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_low_hp_attack_delta(&self) -> i32 {
        if self.max_hp == 0 || self.hp * 100 / self.max_hp >= 30 { return 0; }
        self.relics.iter().map(|r| {
            if let RelicEffect::LowHpAttackBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_low_hp_defense_delta(&self) -> i32 {
        if self.max_hp == 0 || self.hp * 100 / self.max_hp >= 30 { return 0; }
        self.relics.iter().map(|r| {
            if let RelicEffect::LowHpDefenseBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_crit_damage_boost(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::CritDamageBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_skill_damage_boost(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::SkillDamageBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_mp_steal_on_hit(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::MpStealOnHit(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_skill_refund_on_kill(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::SkillRefundOnKill(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_post_battle_heal(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::PostBattleHeal(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_extra_drop_chance(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::ExtraDropChance(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_gold_on_step(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::GoldOnStep(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_has_poison_immunity(&self) -> bool {
        self.relics.iter().any(|r| r.effect == RelicEffect::PoisonImmunity)
    }

    pub fn relic_first_attack_boost(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::FirstAttackBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_free_cast_chance(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::FreeCastChance(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_cd_refund_on_skill(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::CdRefundOnSkill(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_healing_boost(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::HealingBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_counter_attack_chance(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::CounterAttackChance(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_all_damage_boost(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::AllDamageBoost(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_has_treasure_radar(&self) -> bool {
        self.relics.iter().any(|r| r.effect == RelicEffect::TreasureRadar)
    }

    pub fn relic_extra_gold_on_kill(&self) -> u32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::ExtraGoldOnKill(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn relic_strength_from_hp(&self) -> i32 {
        if self.relics.iter().any(|r| r.effect == RelicEffect::StrengthFromHp) {
            self.max_hp / 20
        } else {
            0
        }
    }

    pub fn relic_on_kill_heal(&self) -> i32 {
        self.relics.iter().map(|r| {
            if let RelicEffect::OnKillHeal(v) = r.effect { v } else { 0 }
        }).sum()
    }

    pub fn tick_skill_cooldowns(&mut self) {
        let extra_tick = if self.relic_cooldown_accelerate() { 1u32 } else { 0u32 };
        for skill in self.skills.iter_mut() {
            if skill.current_cooldown > 0 {
                let reduction = (1 + extra_tick).min(skill.current_cooldown);
                skill.current_cooldown -= reduction;
            }
        }
    }
}
