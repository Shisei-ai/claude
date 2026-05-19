#include "Map.h"
#include <cstring>
#include <cmath>
#include <algorithm>

uint32_t Map::rng() {
    rngState ^= rngState << 13;
    rngState ^= rngState >> 17;
    rngState ^= rngState << 5;
    return rngState;
}

int Map::rngRange(int lo, int hi) {
    if (lo > hi) std::swap(lo, hi);
    return lo + (int)(rng() % (uint32_t)(hi - lo + 1));
}

void Map::fillWalls() {
    for (int y = 0; y < MAP_H; ++y) {
        for (int x = 0; x < MAP_W; ++x) {
            tiles[y][x].type = TileType::WALL;
            tiles[y][x].visible = false;
            tiles[y][x].explored = false;
            tiles[y][x].glyph = '#';
            tiles[y][x].fg = Color(74, 74, 74);
            tiles[y][x].bg = Color(30, 30, 30);
        }
    }
}

void Map::carveRoom(const Room& r) {
    for (int y = r.y; y < r.y + r.h; ++y) {
        for (int x = r.x; x < r.x + r.w; ++x) {
            if (inBounds({x, y})) {
                tiles[y][x].type = TileType::FLOOR;
                tiles[y][x].glyph = '.';
                tiles[y][x].fg = Color(80, 80, 80);
                tiles[y][x].bg = Color(20, 20, 20);
            }
        }
    }
}

void Map::carveCorridor(Vec2 a, Vec2 b) {
    // L-shaped corridor: go horizontal first, then vertical
    // Randomly choose which axis first
    bool hFirst = (rng() % 2 == 0);

    auto carveH = [&](int y, int x1, int x2) {
        int minX = std::min(x1, x2);
        int maxX = std::max(x1, x2);
        for (int x = minX; x <= maxX; ++x) {
            Vec2 p{x, y};
            if (inBounds(p) && tiles[y][x].type == TileType::WALL) {
                tiles[y][x].type = TileType::FLOOR;
                tiles[y][x].glyph = '.';
                tiles[y][x].fg = Color(70, 70, 70);
                tiles[y][x].bg = Color(20, 20, 20);
            }
        }
    };

    auto carveV = [&](int x, int y1, int y2) {
        int minY = std::min(y1, y2);
        int maxY = std::max(y1, y2);
        for (int y = minY; y <= maxY; ++y) {
            Vec2 p{x, y};
            if (inBounds(p) && tiles[y][x].type == TileType::WALL) {
                tiles[y][x].type = TileType::FLOOR;
                tiles[y][x].glyph = '.';
                tiles[y][x].fg = Color(70, 70, 70);
                tiles[y][x].bg = Color(20, 20, 20);
            }
        }
    };

    if (hFirst) {
        carveH(a.y, a.x, b.x);
        carveV(b.x, a.y, b.y);
    } else {
        carveV(a.x, a.y, b.y);
        carveH(b.y, a.x, b.x);
    }
}

BSPNode* Map::buildBSP(int x, int y, int w, int h, int depth) {
    BSPNode* node = new BSPNode(x, y, w, h);

    const int MIN_SIZE = 10;
    const int MAX_DEPTH = 4;

    if (depth >= MAX_DEPTH || w < MIN_SIZE * 2 || h < MIN_SIZE * 2) {
        // Leaf node - create a room
        int roomW = rngRange(6, std::min(w - 2, 14));
        int roomH = rngRange(4, std::min(h - 2, 10));
        int roomX = x + rngRange(1, w - roomW - 1);
        int roomY = y + rngRange(1, h - roomH - 1);
        roomX = std::max(x + 1, std::min(roomX, x + w - roomW - 1));
        roomY = std::max(y + 1, std::min(roomY, y + h - roomH - 1));
        node->room = new Room(roomX, roomY, roomW, roomH);
        return node;
    }

    // Decide split direction
    bool splitH = false;
    if (w > h * 1.25f) {
        splitH = false; // vertical split (split width)
    } else if (h > w * 1.25f) {
        splitH = true;  // horizontal split (split height)
    } else {
        splitH = (rng() % 2 == 0);
    }

    if (splitH) {
        int splitY = y + rngRange(MIN_SIZE, h - MIN_SIZE);
        node->left = buildBSP(x, y, w, splitY - y, depth + 1);
        node->right = buildBSP(x, splitY, w, h - (splitY - y), depth + 1);
    } else {
        int splitX = x + rngRange(MIN_SIZE, w - MIN_SIZE);
        node->left = buildBSP(x, y, splitX - x, h, depth + 1);
        node->right = buildBSP(splitX, y, w - (splitX - x), h, depth + 1);
    }

    return node;
}

Vec2 Map::getRoomCenter(BSPNode* node) {
    if (node == nullptr) return {MAP_W/2, MAP_H/2};
    if (node->room) return node->room->center();
    if (node->left && node->right) {
        Vec2 lc = getRoomCenter(node->left);
        Vec2 rc = getRoomCenter(node->right);
        return {(lc.x + rc.x) / 2, (lc.y + rc.y) / 2};
    }
    if (node->left) return getRoomCenter(node->left);
    return getRoomCenter(node->right);
}

void Map::connectRooms(BSPNode* node) {
    if (node == nullptr || node->isLeaf()) return;

    connectRooms(node->left);
    connectRooms(node->right);

    // Connect children
    Vec2 lc = getRoomCenter(node->left);
    Vec2 rc = getRoomCenter(node->right);
    carveCorridor(lc, rc);
}

void Map::collectRooms(BSPNode* node) {
    if (node == nullptr) return;
    if (node->room) {
        rooms.push_back(*node->room);
        carveRoom(*node->room);
        return;
    }
    collectRooms(node->left);
    collectRooms(node->right);
}

void Map::setTile(Vec2 pos, TileType type) {
    if (!inBounds(pos)) return;
    tiles[pos.y][pos.x].type = type;
    switch (type) {
        case TileType::STAIRS_DOWN:
            tiles[pos.y][pos.x].glyph = '>';
            tiles[pos.y][pos.x].fg = Colors::YELLOW;
            tiles[pos.y][pos.x].bg = Color(20, 20, 20);
            break;
        case TileType::STAIRS_UP:
            tiles[pos.y][pos.x].glyph = '<';
            tiles[pos.y][pos.x].fg = Colors::CYAN;
            tiles[pos.y][pos.x].bg = Color(20, 20, 20);
            break;
        case TileType::DOOR:
            tiles[pos.y][pos.x].glyph = '+';
            tiles[pos.y][pos.x].fg = Colors::BROWN;
            tiles[pos.y][pos.x].bg = Color(20, 20, 20);
            break;
        default:
            break;
    }
}

void Map::generate(int floor, uint32_t seed) {
    rngState = seed + floor * 31337;
    if (rngState == 0) rngState = 1;

    rooms.clear();
    stairsDown = {-1, -1};
    stairsUp = {-1, -1};

    fillWalls();

    // Build BSP tree
    BSPNode* root = buildBSP(1, 1, MAP_W - 2, MAP_H - 2, 0);

    // Collect rooms and carve them
    collectRooms(root);

    // Connect all rooms via BSP corridors
    connectRooms(root);

    delete root;

    // Place stairs
    if (!rooms.empty()) {
        // Stairs up in first room
        Vec2 upPos = rooms[0].center();
        setTile(upPos, floor > 1 ? TileType::STAIRS_UP : TileType::FLOOR);
        if (floor > 1) stairsUp = upPos;

        // Stairs down in last room
        Vec2 downPos = rooms[rooms.size() - 1].center();
        if (downPos == upPos && rooms.size() > 1) {
            downPos = rooms[rooms.size() / 2].center();
        }
        setTile(downPos, TileType::STAIRS_DOWN);
        stairsDown = downPos;
    }
}

void Map::resetVisibility() {
    for (int y = 0; y < MAP_H; ++y)
        for (int x = 0; x < MAP_W; ++x)
            tiles[y][x].visible = false;
}

void Map::computeFOV(Vec2 playerPos, int radius) {
    resetVisibility();

    // Mark player position as visible
    if (inBounds(playerPos)) {
        tiles[playerPos.y][playerPos.x].visible = true;
        tiles[playerPos.y][playerPos.x].explored = true;
    }

    // Cast rays to boundary of circle
    const int RAYS = 360;
    for (int i = 0; i < RAYS; ++i) {
        float angle = (float)i * 3.14159f * 2.0f / RAYS;
        float dx = std::cos(angle);
        float dy = std::sin(angle);

        float rx = (float)playerPos.x + 0.5f;
        float ry = (float)playerPos.y + 0.5f;

        for (int step = 0; step < radius; ++step) {
            rx += dx;
            ry += dy;

            int ix = (int)rx;
            int iy = (int)ry;

            Vec2 p{ix, iy};
            if (!inBounds(p)) break;

            tiles[iy][ix].visible = true;
            tiles[iy][ix].explored = true;

            if (tiles[iy][ix].type == TileType::WALL) break;
        }
    }
}

bool Map::isWalkable(Vec2 pos) const {
    if (!inBounds(pos)) return false;
    TileType t = tiles[pos.y][pos.x].type;
    return t == TileType::FLOOR || t == TileType::DOOR ||
           t == TileType::STAIRS_DOWN || t == TileType::STAIRS_UP;
}

bool Map::inBounds(Vec2 pos) const {
    return pos.x >= 0 && pos.x < MAP_W && pos.y >= 0 && pos.y < MAP_H;
}
