#pragma once
#include "Entity.h"
#include "Types.h"
#include <cstdint>

enum class MonsterType {
    GOBLIN,
    ORC,
    SKELETON,
    TROLL,
    DARK_MAGE,
    VAMPIRE,
    DRAGON
};

enum class MovePattern {
    CHASE,     // Move directly toward player
    RANDOM,    // Random movement
    STATIONARY // Don't move
};

struct MonsterDef {
    const char* name;
    char glyph;
    Color color;
    int hp;
    int attack;
    int defense;
    int magicDefense;
    int magicAttack;
    int speed;
    int luck;
    int xp;
    int minFloor;
    MovePattern movePattern;
    int alertRadius;
};

struct Monster : Entity {
    MonsterType type;
    int hp = 10;
    int maxHp = 10;
    int attack = 4;
    int defense = 1;
    int magicDefense = 0;
    int magicAttack = 0;
    int speed = 5;
    int luck = 3;
    int xpValue = 15;
    int alertRadius = 6;
    bool alerted = false;
    int stunTurns = 0;

    // Forward declare Map to avoid circular dependency
    // think() is implemented in Monster.cpp with Map included there
};

extern const MonsterDef MONSTER_DEFS[];
extern const int MONSTER_DEF_COUNT;

Monster createMonster(MonsterType type, Vec2 pos);
Monster randomMonsterForFloor(int floor, Vec2 pos, uint32_t& rng);

// Simple directional movement toward player
Vec2 monsterThink(const Monster& m, Vec2 playerPos,
                  bool (*isWalkable)(Vec2), Vec2 (*occupied)(Vec2));
