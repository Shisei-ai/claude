#pragma once
#include <cstdint>
#include <string>

enum class TileType {
    WALL,
    FLOOR,
    DOOR,
    STAIRS_DOWN,
    STAIRS_UP
};

enum class CharClass {
    WARRIOR,
    MAGE,
    ROGUE
};

enum class ItemType {
    WEAPON,
    ARMOR,
    POTION_HP,
    POTION_MP,
    SCROLL_FIRE,
    SCROLL_IDENTIFY,
    GOLD
};

enum class Direction {
    NONE,
    NORTH,
    SOUTH,
    EAST,
    WEST,
    NORTHEAST,
    NORTHWEST,
    SOUTHEAST,
    SOUTHWEST
};

struct Vec2 {
    int x = 0;
    int y = 0;

    Vec2() = default;
    Vec2(int x, int y) : x(x), y(y) {}

    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator-(const Vec2& o) const { return {x - o.x, y - o.y}; }
    Vec2 operator*(int s) const { return {x * s, y * s}; }
    bool operator==(const Vec2& o) const { return x == o.x && y == o.y; }
    bool operator!=(const Vec2& o) const { return !(*this == o); }

    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }

    int manhattanDist(const Vec2& o) const {
        return abs(x - o.x) + abs(y - o.y);
    }

    float dist(const Vec2& o) const {
        float dx = (float)(x - o.x);
        float dy = (float)(y - o.y);
        return __builtin_sqrtf(dx*dx + dy*dy);
    }
};

struct Color {
    uint8_t r = 255;
    uint8_t g = 255;
    uint8_t b = 255;
    uint8_t a = 255;

    constexpr Color() = default;
    constexpr Color(uint8_t r, uint8_t g, uint8_t b, uint8_t a = 255)
        : r(r), g(g), b(b), a(a) {}

    Color dim(float factor = 0.5f) const {
        return {
            (uint8_t)(r * factor),
            (uint8_t)(g * factor),
            (uint8_t)(b * factor),
            a
        };
    }
};

struct Rect {
    int x = 0;
    int y = 0;
    int w = 0;
    int h = 0;

    Rect() = default;
    Rect(int x, int y, int w, int h) : x(x), y(y), w(w), h(h) {}

    bool contains(Vec2 p) const {
        return p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
    }
};

struct CombatResult {
    int damage = 0;
    bool is_crit = false;
    bool killed = false;
    std::string message;
};

// Common colors
namespace Colors {
    constexpr Color BLACK      {0,   0,   0};
    constexpr Color WHITE      {255, 255, 255};
    constexpr Color RED        {200, 50,  50};
    constexpr Color GREEN      {50,  200, 50};
    constexpr Color BLUE       {50,  100, 200};
    constexpr Color YELLOW     {220, 220, 50};
    constexpr Color CYAN       {50,  200, 200};
    constexpr Color MAGENTA    {200, 50,  200};
    constexpr Color GRAY       {160, 160, 160};
    constexpr Color DARK_GRAY  {80,  80,  80};
    constexpr Color ORANGE     {220, 140, 40};
    constexpr Color PURPLE     {140, 50,  200};
    constexpr Color DARK_RED   {150, 30,  30};
    constexpr Color DARK_GREEN {30,  100, 30};
    constexpr Color OLIVE      {128, 128, 0};
    constexpr Color BROWN      {139, 90,  43};
}
