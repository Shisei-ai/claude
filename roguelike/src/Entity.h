#pragma once
#include "Types.h"
#include <string>

struct Entity {
    Vec2 pos {0, 0};
    char glyph = '?';
    Color color = Colors::WHITE;
    bool alive = true;
    std::string name = "Unknown";
};
