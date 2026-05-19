#pragma once
#include "Entity.h"
#include "Item.h"
#include <vector>
#include <string>

struct Player : Entity {
    CharClass charClass = CharClass::WARRIOR;
    int level = 1;
    int xp = 0;
    int xpToNext = 100;

    int hp = 40;
    int maxHp = 40;
    int mp = 10;
    int maxMp = 10;

    int attack = 10;
    int defense = 6;
    int magicDefense = 2;
    int magicAttack = 3;
    float critChance = 0.05f;

    int gold = 0;
    int floor = 1;

    Item* weapon = nullptr;  // equipped weapon
    Item* armor = nullptr;   // equipped armor

    std::vector<Item> inventory;

    void init(CharClass cls);
    bool gainXP(int amount);  // returns true if leveled up
    int totalAttack() const;
    int totalDefense() const;
    int totalMagicDefense() const;
    bool addItem(Item item);
    bool useItem(int idx);
    bool equip(int idx);
    void levelUpStats();
    std::string className() const;
};
