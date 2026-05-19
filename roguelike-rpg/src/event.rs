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
            title: "Mysterious Altar".to_string(),
            description: "You discover an ancient altar pulsing with dark energy. A voice whispers: 'Offer your blood, and I shall grant you power...'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Offer blood (lose 20% max HP permanently)".to_string(),
                    description: "A permanent sacrifice for dark power.".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(8),
                        EventConsequence::GainDefPermanent(4),
                        EventConsequence::GainMaxHp(-20),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "Pray to the altar (gain exp)".to_string(),
                    description: "A simple prayer yields moderate rewards.".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 50)],
                    is_risky: false,
                },
                EventChoice {
                    label: "Ignore the altar".to_string(),
                    description: "Walk away from temptation.".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        1 => RandomEvent {
            title: "Dying Adventurer".to_string(),
            description: "A mortally wounded adventurer lies before you. With their last breath: 'Please... take my belongings. Just... end my suffering...'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Mercy kill and take their items".to_string(),
                    description: "A grim act, but they requested it.".to_string(),
                    consequences: vec![
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainGold(50 * floor),
                        EventConsequence::LoseHp(5),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Heal them with a potion".to_string(),
                    description: "Use one of your HP potions. They might remember this kindness.".to_string(),
                    consequences: vec![
                        EventConsequence::GainExp(floor * 30),
                        EventConsequence::GainStrPermanent(2),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Leave them to their fate".to_string(),
                    description: "You don't have time for this.".to_string(),
                    consequences: vec![EventConsequence::LoseHp(3)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        2 => RandomEvent {
            title: "Ancient Library".to_string(),
            description: "A room filled with dusty tomes. Most are too damaged to read, but a few survive. You only have time to study one...".to_string(),
            choices: vec![
                EventChoice {
                    label: "Study the combat manual (STR +5)".to_string(),
                    description: "Master advanced fighting techniques.".to_string(),
                    consequences: vec![EventConsequence::GainStrPermanent(5)],
                    is_risky: false,
                },
                EventChoice {
                    label: "Study the arcane codex (INT +5, MP +20)".to_string(),
                    description: "Expand your magical understanding.".to_string(),
                    consequences: vec![
                        EventConsequence::GainIntPermanent(5),
                        EventConsequence::GainMaxMp(20),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Study the forbidden tome (random skill)".to_string(),
                    description: "The contents are sealed with a warning. High risk, high reward.".to_string(),
                    consequences: vec![EventConsequence::LearnRandomSkill],
                    is_risky: true,
                },
            ],
            is_irreversible: true,
        },
        3 => RandomEvent {
            title: "The Gambler".to_string(),
            description: "A mysterious figure in a cloak sits at a makeshift table. 'Care to wager your fate, traveler? Double or nothing — your very essence.'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Bet your gold (50/50: x3 gold or lose all)".to_string(),
                    description: "A pure gamble with your wallet.".to_string(),
                    consequences: vec![EventConsequence::GainGold(rng.gen_range(0..2) * 300 * floor)],
                    is_risky: true,
                },
                EventChoice {
                    label: "Bet your strength (gain 15 STR or lose 8)".to_string(),
                    description: "Gamble with your physical power.".to_string(),
                    consequences: if rng.gen_bool(0.4) {
                        vec![EventConsequence::GainStrPermanent(15)]
                    } else {
                        vec![EventConsequence::GainStrPermanent(-8)]
                    },
                    is_risky: true,
                },
                EventChoice {
                    label: "Decline the wager".to_string(),
                    description: "Some games are not worth playing.".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        4 => RandomEvent {
            title: "Cursed Treasure Room".to_string(),
            description: "A room glittering with gold and gems. But something feels wrong — the air crackles with dark magic. A sign reads: 'TAKE, AND BE DAMNED.'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Take the treasure (cursed floor next)".to_string(),
                    description: "The riches are yours, but the curse follows.".to_string(),
                    consequences: vec![
                        EventConsequence::GainGold(500 * floor),
                        EventConsequence::GainRandomItem,
                        EventConsequence::CursedFloor,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "Take only a small amount (blessed next floor)".to_string(),
                    description: "Restrain yourself, be rewarded with balance.".to_string(),
                    consequences: vec![
                        EventConsequence::GainGold(100 * floor),
                        EventConsequence::BlessedFloor,
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Destroy the treasure (gain permanent luck)".to_string(),
                    description: "Shatter the cursed gold. The universe rewards virtue.".to_string(),
                    consequences: vec![EventConsequence::GainLukPermanent(10)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        5 => RandomEvent {
            title: "The Void Rift".to_string(),
            description: "A tear in reality hangs in the air, swirling with darkness. Voices call from within... promising unimaginable power.".to_string(),
            choices: vec![
                EventChoice {
                    label: "Reach into the rift (random permanent stat change)".to_string(),
                    description: "Pull something from the void. It could be glorious or terrible.".to_string(),
                    consequences: if rng.gen_bool(0.5) {
                        vec![EventConsequence::GainStrPermanent(10), EventConsequence::GainIntPermanent(10)]
                    } else {
                        vec![EventConsequence::GainMaxHp(-40), EventConsequence::GainMaxMp(-20)]
                    },
                    is_risky: true,
                },
                EventChoice {
                    label: "Step through the rift (teleport to deeper floor)".to_string(),
                    description: "A one-way trip deeper into the dungeon.".to_string(),
                    consequences: vec![EventConsequence::TeleportToFloor(floor + rng.gen_range(3..7))],
                    is_risky: true,
                },
                EventChoice {
                    label: "Seal the rift (gain EXP)".to_string(),
                    description: "Use your knowledge to close the rift safely.".to_string(),
                    consequences: vec![EventConsequence::GainExp(floor * 100)],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        6 => RandomEvent {
            title: "Merchant's Ghost".to_string(),
            description: "The spirit of a long-dead merchant materializes, their phantom wares still gleaming. 'One final sale before I pass on...'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Buy a rare weapon (500 gold)".to_string(),
                    description: "A phantom weapon of considerable power.".to_string(),
                    consequences: vec![
                        EventConsequence::LoseGold(500),
                        EventConsequence::GainRandomItem,
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Trade your best item for 3 random items".to_string(),
                    description: "Gamble your best gear for variety.".to_string(),
                    consequences: vec![
                        EventConsequence::LoseRandomItem,
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainRandomItem,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "Ask for knowledge (learn random skill)".to_string(),
                    description: "Ghost merchants know many secrets.".to_string(),
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
            title: "Dragon Egg".to_string(),
            description: "A warm, golden egg sits in a nest of bones. It pulses with life. Taking it could anger whatever laid it...".to_string(),
            choices: vec![
                EventChoice {
                    label: "Take the egg (rare material + risk)".to_string(),
                    description: "Dragon eggs are priceless — if you can keep it.".to_string(),
                    consequences: vec![
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainGold(1000),
                        EventConsequence::CursedFloor,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "Smash the egg (gain power from the energy)".to_string(),
                    description: "Release the dragon's latent power for yourself.".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(5),
                        EventConsequence::GainMaxHp(30),
                        EventConsequence::GainDefPermanent(5),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Leave the egg (receive a blessing)".to_string(),
                    description: "Honor the dragon's legacy. Be rewarded.".to_string(),
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
            title: "Mirror of Souls".to_string(),
            description: "A massive obsidian mirror reflects not your body, but your soul. Your reflection reaches out a hand: 'Merge with me — become complete.'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Merge with your reflection (gain ALL stats +3, lose 30% HP)".to_string(),
                    description: "A dangerous union of body and soul.".to_string(),
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
                    label: "Shatter the mirror (destroy a weakness)".to_string(),
                    description: "Break the mirror to break a curse upon yourself.".to_string(),
                    consequences: vec![
                        EventConsequence::GainLukPermanent(15),
                        EventConsequence::LoseHp(10),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Study your reflection (unlock skill)".to_string(),
                    description: "Your soul teaches you something new.".to_string(),
                    consequences: vec![EventConsequence::LearnRandomSkill],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
        9 => RandomEvent {
            title: "Warrior's Grave".to_string(),
            description: "You find the grave of a legendary warrior, their equipment still intact after centuries. Disturbing the dead has consequences...".to_string(),
            choices: vec![
                EventChoice {
                    label: "Take the equipment".to_string(),
                    description: "Loot the grave for powerful gear.".to_string(),
                    consequences: vec![
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainRandomItem,
                        EventConsequence::CursedFloor,
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "Pay respects and leave an offering".to_string(),
                    description: "Honor the warrior. Their spirit may bless you.".to_string(),
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
            title: "Fate's Crossroads".to_string(),
            description: "Three paths diverge before you, each marked with a symbol: ⚔️ Strength, 🌟 Magic, or 🗡️ Cunning. Only one path leads forward.".to_string(),
            choices: vec![
                EventChoice {
                    label: "Take the Warrior's Path (STR+8, HP+40)".to_string(),
                    description: "Embrace the way of strength.".to_string(),
                    consequences: vec![
                        EventConsequence::GainStrPermanent(8),
                        EventConsequence::GainMaxHp(40),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Take the Mage's Path (INT+8, MP+40)".to_string(),
                    description: "Embrace the way of magic.".to_string(),
                    consequences: vec![
                        EventConsequence::GainIntPermanent(8),
                        EventConsequence::GainMaxMp(40),
                    ],
                    is_risky: false,
                },
                EventChoice {
                    label: "Take the Rogue's Path (DEX+8, LUK+8)".to_string(),
                    description: "Embrace the way of cunning.".to_string(),
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
            title: "The Final Test".to_string(),
            description: "A booming voice fills the dungeon: 'YOU HAVE DELVED DEEP. PROVE YOUR WORTH — SURVIVE THE TRIAL!'".to_string(),
            choices: vec![
                EventChoice {
                    label: "Accept the trial (boss encounter, but gain legendary item)".to_string(),
                    description: "Face a powerful challenge for legendary reward.".to_string(),
                    consequences: vec![
                        EventConsequence::LoseHp(50),
                        EventConsequence::GainRandomItem,
                        EventConsequence::GainExp(floor * 200),
                    ],
                    is_risky: true,
                },
                EventChoice {
                    label: "Flee the trial (skip, lose 100 EXP)".to_string(),
                    description: "Avoid the danger but miss the reward.".to_string(),
                    consequences: vec![],
                    is_risky: false,
                },
            ],
            is_irreversible: true,
        },
    };

    Some(event)
}
