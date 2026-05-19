#pragma once
#include "Types.h"
#include <string>
#include <cstdint>

struct ItemDef {
    std::string name;
    char glyph;
    Color color;
    ItemType type;
    int attack_bonus = 0;
    int defense_bonus = 0;
    int magic_defense_bonus = 0;
    int hp_restore = 0;
    int mp_restore = 0;
    int damage = 0;       // for scrolls
    int minFloor = 1;
    int value = 0;        // gold value
};

struct Item {
    const ItemDef* def = nullptr;
    int quantity = 1;
    bool identified = false;
    Vec2 pos {-1, -1};

    bool isWeapon() const { return def && def->type == ItemType::WEAPON; }
    bool isArmor() const  { return def && def->type == ItemType::ARMOR; }
    bool isPotion() const { return def && (def->type == ItemType::POTION_HP || def->type == ItemType::POTION_MP); }
    bool isScroll() const { return def && (def->type == ItemType::SCROLL_FIRE || def->type == ItemType::SCROLL_IDENTIFY); }
    bool isGold() const   { return def && def->type == ItemType::GOLD; }

    std::string displayName() const {
        if (!def) return "???";
        if (!identified && isScroll()) return "Scroll (unidentified)";
        return def->name;
    }
};

// Global item definitions
namespace ItemDefs {
    // Weapons
    extern const ItemDef DAGGER;
    extern const ItemDef SWORD;
    extern const ItemDef GREAT_SWORD;
    extern const ItemDef STAFF;
    extern const ItemDef BOW;

    // Armor
    extern const ItemDef LEATHER_ARMOR;
    extern const ItemDef CHAIN_MAIL;
    extern const ItemDef PLATE_ARMOR;

    // Potions
    extern const ItemDef POTION_HP;
    extern const ItemDef POTION_MP;

    // Scrolls
    extern const ItemDef SCROLL_FIRE;
    extern const ItemDef SCROLL_IDENTIFY;

    // Gold
    extern const ItemDef GOLD;
}

Item createWeapon(const ItemDef& def);
Item createArmor(const ItemDef& def);
Item createPotion(const ItemDef& def);
Item createScroll(const ItemDef& def);
Item createGold(int amount);
Item randomItem(int floor, uint32_t& rngState);

uint32_t itemRng(uint32_t& state);
int itemRngRange(uint32_t& state, int lo, int hi);
