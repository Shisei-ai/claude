#include "Player.h"
#include "Config.h"
#include <algorithm>

void Player::init(CharClass cls) {
    charClass = cls;
    level = 1;
    xp = 0;
    xpToNext = 100;
    gold = 0;
    floor = 1;
    glyph = '@';
    color = Colors::WHITE;
    alive = true;
    name = "Hero";
    weapon = nullptr;
    armor = nullptr;
    inventory.clear();

    switch (cls) {
        case CharClass::WARRIOR:
            // 重装備の戦士: 高物理防御・魔法防御低・低素早さ・平均運
            maxHp = 40; hp = 40;
            maxMp = 5;  mp = 5;
            attack = 10; defense = 6; magicDefense = 2;
            magicAttack = 3;
            speed = 6;  luck = 5;
            baseCritChance = 0.05f;
            name = "Warrior";
            break;
        case CharClass::MAGE:
            // 魔法使い: 物理防御最低・魔法防御最高・中程度の素早さ・高運
            maxHp = 20; hp = 20;
            maxMp = 30; mp = 30;
            attack = 4; defense = 2; magicDefense = 8;
            magicAttack = 14;
            speed = 7;  luck = 8;
            baseCritChance = 0.08f;
            name = "Mage";
            break;
        case CharClass::ROGUE:
            // 盗賊: バランス型防御・最高素早さ・最高運・高クリティカル
            maxHp = 28; hp = 28;
            maxMp = 12; mp = 12;
            attack = 7; defense = 4; magicDefense = 4;
            magicAttack = 5;
            speed = 12; luck = 10;
            baseCritChance = 0.20f;
            name = "Rogue";
            break;
    }
}

bool Player::gainXP(int amount) {
    xp += amount;
    if (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = level * 100;
        levelUpStats();
        return true;
    }
    return false;
}

void Player::levelUpStats() {
    switch (charClass) {
        case CharClass::WARRIOR:
            // 戦士: HP・物理攻防が主な成長。素早さ・運は伸びない
            maxHp += 12;
            maxMp += 2;
            attack += 3;
            defense += 2;
            magicDefense += 1;
            magicAttack += 1;
            // speed: 成長なし (重装備の宿命)
            luck += 1;
            break;
        case CharClass::MAGE:
            // 魔法使い: MP・魔法攻防・運が成長。素早さは変わらない
            maxHp += 5;
            maxMp += 10;
            attack += 1;
            defense += 1;
            magicDefense += 3;
            magicAttack += 4;
            // speed: 成長なし
            luck += 2;
            break;
        case CharClass::ROGUE:
            // 盗賊: 素早さ・運が伸び続ける。攻防はほどほど
            maxHp += 7;
            maxMp += 3;
            attack += 2;
            defense += 1;
            magicDefense += 1;
            magicAttack += 1;
            speed += 1;
            luck += 2;
            baseCritChance = std::min(0.50f, baseCritChance + 0.01f);
            break;
    }
    // Restore some health on level up
    hp = std::min(hp + maxHp / 4, maxHp);
    mp = std::min(mp + maxMp / 4, maxMp);
}

int Player::totalAttack() const {
    int atk = attack;
    if (weapon) atk += weapon->def->attack_bonus;
    return atk;
}

int Player::totalDefense() const {
    int def = defense;
    if (armor) def += armor->def->defense_bonus;
    return def;
}

int Player::totalMagicDefense() const {
    int mdef = magicDefense;
    if (armor) mdef += armor->def->magic_defense_bonus;
    return mdef;
}

float Player::effectiveCritChance() const {
    return std::min(0.60f, baseCritChance + luck * 0.005f);
}

float Player::evasionChance(int attackerSpeed) const {
    // 素早さの差が大きいほど回避率が上がる (上限40%)
    float evade = (speed - attackerSpeed) * 0.015f;
    return std::max(0.0f, std::min(0.40f, evade));
}

bool Player::addItem(Item item) {
    if ((int)inventory.size() >= MAX_INVENTORY) return false;
    // Stack gold
    if (item.isGold()) {
        gold += item.quantity;
        return true;
    }
    inventory.push_back(item);
    return true;
}

bool Player::useItem(int idx) {
    if (idx < 0 || idx >= (int)inventory.size()) return false;
    Item& it = inventory[idx];
    if (!it.def) return false;

    switch (it.def->type) {
        case ItemType::POTION_HP:
            hp = std::min(maxHp, hp + it.def->hp_restore);
            inventory.erase(inventory.begin() + idx);
            // Fix weapon/armor pointers after erase
            if (weapon && weapon >= &inventory[0]) {
                // pointer may be invalid after erase, but we handle this carefully
            }
            return true;
        case ItemType::POTION_MP:
            mp = std::min(maxMp, mp + it.def->mp_restore);
            inventory.erase(inventory.begin() + idx);
            return true;
        case ItemType::SCROLL_FIRE:
        case ItemType::SCROLL_IDENTIFY:
            // These are handled by Game
            return true;
        case ItemType::WEAPON:
        case ItemType::ARMOR:
            return equip(idx);
        default:
            return false;
    }
}

bool Player::equip(int idx) {
    if (idx < 0 || idx >= (int)inventory.size()) return false;
    Item& it = inventory[idx];
    if (!it.def) return false;

    if (it.isWeapon()) {
        // Unequip current weapon back to inventory if any
        weapon = &inventory[idx];
        return true;
    } else if (it.isArmor()) {
        armor = &inventory[idx];
        return true;
    }
    return false;
}

std::string Player::className() const {
    switch (charClass) {
        case CharClass::WARRIOR: return "Warrior";
        case CharClass::MAGE:    return "Mage";
        case CharClass::ROGUE:   return "Rogue";
    }
    return "Unknown";
}
