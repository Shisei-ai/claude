#pragma once
#include "Config.h"
#include "Types.h"
#include <vector>
#include <cstdint>

struct Tile {
    TileType type = TileType::WALL;
    bool visible = false;
    bool explored = false;
    char glyph = '#';
    Color fg = Colors::DARK_GRAY;
    Color bg = Colors::BLACK;
};

struct Room {
    int x, y, w, h;

    Room(int x, int y, int w, int h) : x(x), y(y), w(w), h(h) {}

    Vec2 center() const {
        return {x + w / 2, y + h / 2};
    }

    bool intersects(const Room& other, int margin = 1) const {
        return x - margin < other.x + other.w &&
               x + w + margin > other.x &&
               y - margin < other.y + other.h &&
               y + h + margin > other.y;
    }
};

// BSP node for dungeon generation
struct BSPNode {
    int x, y, w, h;
    BSPNode* left = nullptr;
    BSPNode* right = nullptr;
    Room* room = nullptr;

    BSPNode(int x, int y, int w, int h) : x(x), y(y), w(w), h(h) {}
    ~BSPNode() {
        delete left;
        delete right;
        delete room;
    }

    bool isLeaf() const { return left == nullptr && right == nullptr; }
};

class Map {
public:
    Tile tiles[MAP_H][MAP_W];
    std::vector<Room> rooms;
    Vec2 stairsDown {-1, -1};
    Vec2 stairsUp {-1, -1};

    void generate(int floor, uint32_t seed);
    void computeFOV(Vec2 playerPos, int radius);
    bool isWalkable(Vec2 pos) const;
    bool inBounds(Vec2 pos) const;
    void resetVisibility();

private:
    uint32_t rngState = 0;
    uint32_t rng();
    int rngRange(int lo, int hi);  // [lo, hi]

    void fillWalls();
    void carveRoom(const Room& r);
    void carveCorridor(Vec2 a, Vec2 b);
    BSPNode* buildBSP(int x, int y, int w, int h, int depth);
    void collectRooms(BSPNode* node);
    void connectRooms(BSPNode* node);
    Vec2 getRoomCenter(BSPNode* node);
    void setTile(Vec2 pos, TileType type);
};
