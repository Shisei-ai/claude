#include "Monster.h"
#include <cstdlib>
#include <algorithm>
#include <vector>

const MonsterDef MONSTER_DEFS[] = {
    // GOBLIN
    { "Goblin",    'g', Colors::GREEN,      10,  4,  1,  0,  15, 1, MovePattern::CHASE, 6 },
    // ORC
    { "Orc",       'o', Colors::OLIVE,      25,  8,  4,  0,  35, 2, MovePattern::CHASE, 7 },
    // SKELETON
    { "Skeleton",  's', Colors::GRAY,       18,  7,  3,  0,  30, 2, MovePattern::CHASE, 6 },
    // TROLL
    { "Troll",     'T', Colors::DARK_GREEN, 50, 12,  6,  0,  75, 4, MovePattern::CHASE, 8 },
    // DARK_MAGE
    { "Dark Mage", 'm', Colors::PURPLE,     22,  5,  2, 15,  60, 3, MovePattern::CHASE, 7 },
    // VAMPIRE
    { "Vampire",   'V', Colors::DARK_RED,   40, 10,  5,  5,  90, 5, MovePattern::CHASE, 8 },
    // DRAGON
    { "Dragon",    'D', Colors::RED,       100, 18, 10, 10, 200, 7, MovePattern::CHASE, 10 },
};

const int MONSTER_DEF_COUNT = 7;

Monster createMonster(MonsterType type, Vec2 pos) {
    int idx = (int)type;
    const MonsterDef& def = MONSTER_DEFS[idx];

    Monster m;
    m.type = type;
    m.pos = pos;
    m.glyph = def.glyph;
    m.color = def.color;
    m.name = def.name;
    m.alive = true;
    m.hp = def.hp;
    m.maxHp = def.hp;
    m.attack = def.attack;
    m.defense = def.defense;
    m.magicAttack = def.magicAttack;
    m.xpValue = def.xp;
    m.alertRadius = def.alertRadius;
    m.alerted = false;
    m.stunTurns = 0;
    return m;
}

static uint32_t xorshift(uint32_t& state) {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state;
}

Monster randomMonsterForFloor(int floor, Vec2 pos, uint32_t& rng) {
    // Build list of eligible monster types for this floor
    std::vector<MonsterType> eligible;
    for (int i = 0; i < MONSTER_DEF_COUNT; ++i) {
        if (MONSTER_DEFS[i].minFloor <= floor) {
            eligible.push_back((MonsterType)i);
        }
    }

    if (eligible.empty()) eligible.push_back(MonsterType::GOBLIN);

    // Weight toward higher-tier monsters as floor increases
    // Simple: pick random from eligible list
    uint32_t r = xorshift(rng);
    MonsterType chosen = eligible[r % eligible.size()];

    return createMonster(chosen, pos);
}

Vec2 monsterThink(const Monster& m, Vec2 playerPos,
                  bool (*isWalkable)(Vec2), Vec2 (*occupied)(Vec2))
{
    (void)isWalkable;
    (void)occupied;

    // Simple: move in direction of player
    Vec2 diff = {playerPos.x - m.pos.x, playerPos.y - m.pos.y};

    // Normalize to -1,0,1
    Vec2 dir{0, 0};
    if (diff.x > 0) dir.x = 1;
    else if (diff.x < 0) dir.x = -1;
    if (diff.y > 0) dir.y = 1;
    else if (diff.y < 0) dir.y = -1;

    return dir;
}
