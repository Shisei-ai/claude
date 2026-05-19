#pragma once
#include "Config.h"
#include "Types.h"
#include "Map.h"
#include "Player.h"
#include "Monster.h"
#include "Item.h"

#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <string>
#include <vector>
#include <deque>

class Renderer {
public:
    Renderer();
    ~Renderer();

    bool init();

    void clear();
    void present();

    void drawTile(int tx, int ty, char glyph, Color fg, Color bg);
    void drawChar(int px, int py, char c, Color fg);
    void drawText(int px, int py, const std::string& text, Color color);
    void drawRect(int x, int y, int w, int h, Color color);
    void drawFilledRect(int x, int y, int w, int h, Color color);

    void drawMap(const Map& map, const Player& player,
                 const std::vector<Monster>& monsters,
                 const std::vector<Item>& groundItems);
    void drawPanel(const Player& player, int floor);
    void drawMessages(const std::deque<std::string>& messages);
    void drawInventory(const Player& player, int selectedIdx);
    void drawClassSelect(CharClass hoveredClass);
    void drawGameOver(bool won, int floor, int gold);

private:
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    TTF_Font* font = nullptr;
    bool fontLoaded = false;
    int charW = TILE_W;
    int charH = TILE_H;

    void drawGlyph(int px, int py, char c, Color fg, Color bg);
    void drawBar(int x, int y, int w, int h,
                 int current, int max,
                 Color fillColor, Color bgColor, const std::string& label);
    void renderTextLine(int x, int y, const std::string& text, Color col);
    SDL_Color toSDLColor(Color c);
};
