#include "Item.h"
#include <algorithm>

namespace ItemDefs {
    const ItemDef DAGGER = {
        "Dagger", ')', Colors::GRAY, ItemType::WEAPON,
        3, 0, 0, 0, 0, 1, 15
    };
    const ItemDef SWORD = {
        "Sword", ')', Colors::WHITE, ItemType::WEAPON,
        6, 0, 0, 0, 0, 2, 40
    };
    const ItemDef GREAT_SWORD = {
        "Great Sword", ')', Colors::CYAN, ItemType::WEAPON,
        10, 0, 0, 0, 0, 4, 80
    };
    const ItemDef STAFF = {
        "Magic Staff", '/', Colors::PURPLE, ItemType::WEAPON,
        2, 0, 0, 0, 0, 2, 50
    };
    const ItemDef BOW = {
        "Bow", ')', Colors::BROWN, ItemType::WEAPON,
        5, 0, 0, 0, 0, 2, 35
    };

    const ItemDef LEATHER_ARMOR = {
        "Leather Armor", '[', Colors::BROWN, ItemType::ARMOR,
        0, 2, 0, 0, 0, 1, 20
    };
    const ItemDef CHAIN_MAIL = {
        "Chain Mail", '[', Colors::GRAY, ItemType::ARMOR,
        0, 5, 0, 0, 0, 3, 60
    };
    const ItemDef PLATE_ARMOR = {
        "Plate Armor", '[', Colors::WHITE, ItemType::ARMOR,
        0, 8, 0, 0, 0, 5, 100
    };

    const ItemDef POTION_HP = {
        "Health Potion", '!', Colors::RED, ItemType::POTION_HP,
        0, 0, 25, 0, 0, 1, 10
    };
    const ItemDef POTION_MP = {
        "Mana Potion", '!', Colors::BLUE, ItemType::POTION_MP,
        0, 0, 0, 15, 0, 1, 10
    };

    const ItemDef SCROLL_FIRE = {
        "Scroll of Fire", '?', Colors::ORANGE, ItemType::SCROLL_FIRE,
        0, 0, 0, 0, 30, 2, 25
    };
    const ItemDef SCROLL_IDENTIFY = {
        "Scroll of Identify", '?', Colors::YELLOW, ItemType::SCROLL_IDENTIFY,
        0, 0, 0, 0, 0, 1, 15
    };

    const ItemDef GOLD = {
        "Gold", '$', Colors::YELLOW, ItemType::GOLD,
        0, 0, 0, 0, 0, 1, 1
    };
}

uint32_t itemRng(uint32_t& state) {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state;
}

int itemRngRange(uint32_t& state, int lo, int hi) {
    if (lo > hi) std::swap(lo, hi);
    return lo + (int)(itemRng(state) % (uint32_t)(hi - lo + 1));
}

Item createWeapon(const ItemDef& def) {
    Item item;
    item.def = &def;
    item.quantity = 1;
    item.identified = true;
    return item;
}

Item createArmor(const ItemDef& def) {
    Item item;
    item.def = &def;
    item.quantity = 1;
    item.identified = true;
    return item;
}

Item createPotion(const ItemDef& def) {
    Item item;
    item.def = &def;
    item.quantity = 1;
    item.identified = true;
    return item;
}

Item createScroll(const ItemDef& def) {
    Item item;
    item.def = &def;
    item.quantity = 1;
    item.identified = false;  // scrolls start unidentified
    return item;
}

Item createGold(int amount) {
    Item item;
    item.def = &ItemDefs::GOLD;
    item.quantity = amount;
    item.identified = true;
    return item;
}

Item randomItem(int floor, uint32_t& rngState) {
    // Weighted random item selection based on floor
    int roll = itemRngRange(rngState, 1, 100);

    if (roll <= 5) {
        // Gold
        int amount = itemRngRange(rngState, floor * 5, floor * 20);
        return createGold(amount);
    } else if (roll <= 30) {
        // Potion
        int pr = itemRngRange(rngState, 1, 100);
        if (pr <= 60) return createPotion(ItemDefs::POTION_HP);
        return createPotion(ItemDefs::POTION_MP);
    } else if (roll <= 45) {
        // Scroll
        int sr = itemRngRange(rngState, 1, 100);
        if (sr <= 60) return createScroll(ItemDefs::SCROLL_FIRE);
        return createScroll(ItemDefs::SCROLL_IDENTIFY);
    } else if (roll <= 70) {
        // Weapon
        if (floor >= 7) {
            int wr = itemRngRange(rngState, 1, 100);
            if (wr <= 40) return createWeapon(ItemDefs::GREAT_SWORD);
            if (wr <= 70) return createWeapon(ItemDefs::STAFF);
            return createWeapon(ItemDefs::SWORD);
        } else if (floor >= 4) {
            int wr = itemRngRange(rngState, 1, 100);
            if (wr <= 35) return createWeapon(ItemDefs::SWORD);
            if (wr <= 60) return createWeapon(ItemDefs::BOW);
            if (wr <= 80) return createWeapon(ItemDefs::STAFF);
            return createWeapon(ItemDefs::DAGGER);
        } else {
            int wr = itemRngRange(rngState, 1, 100);
            if (wr <= 60) return createWeapon(ItemDefs::DAGGER);
            if (wr <= 80) return createWeapon(ItemDefs::BOW);
            return createWeapon(ItemDefs::SWORD);
        }
    } else {
        // Armor
        if (floor >= 6) {
            int ar = itemRngRange(rngState, 1, 100);
            if (ar <= 40) return createArmor(ItemDefs::PLATE_ARMOR);
            return createArmor(ItemDefs::CHAIN_MAIL);
        } else if (floor >= 3) {
            int ar = itemRngRange(rngState, 1, 100);
            if (ar <= 50) return createArmor(ItemDefs::CHAIN_MAIL);
            return createArmor(ItemDefs::LEATHER_ARMOR);
        } else {
            return createArmor(ItemDefs::LEATHER_ARMOR);
        }
    }
}
