#include "Renderer.h"
#include <cstdio>
#include <algorithm>
#include <string>

Renderer::Renderer() {}

Renderer::~Renderer() {
    if (font) TTF_CloseFont(font);
    if (renderer) SDL_DestroyRenderer(renderer);
    if (window) SDL_DestroyWindow(window);
    TTF_Quit();
    SDL_Quit();
}

SDL_Color Renderer::toSDLColor(Color c) {
    return {c.r, c.g, c.b, c.a};
}

bool Renderer::init() {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return false;
    }
    if (TTF_Init() != 0) {
        fprintf(stderr, "TTF_Init failed: %s\n", TTF_GetError());
        return false;
    }

    window = SDL_CreateWindow("Roguelike RPG",
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        SCREEN_W, SCREEN_H, SDL_WINDOW_SHOWN);
    if (!window) {
        fprintf(stderr, "SDL_CreateWindow failed: %s\n", SDL_GetError());
        return false;
    }

    renderer = SDL_CreateRenderer(window, -1,
        SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    if (!renderer) {
        renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
        if (!renderer) {
            fprintf(stderr, "SDL_CreateRenderer failed: %s\n", SDL_GetError());
            return false;
        }
    }

    // Try to load a font
    const char* fontPaths[] = {
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
        "/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf",
        "/usr/share/fonts/truetype/hack/Hack-Regular.ttf",
        "./assets/font.ttf",
        nullptr
    };

    for (int i = 0; fontPaths[i] != nullptr; ++i) {
        font = TTF_OpenFont(fontPaths[i], 14);
        if (font) {
            fontLoaded = true;
            // Get glyph metrics
            int advance = 0;
            TTF_GlyphMetrics(font, '@', nullptr, nullptr, nullptr, nullptr, &advance);
            charW = advance > 0 ? advance : TILE_W;
            charH = TTF_FontHeight(font);
            if (charH <= 0) charH = TILE_H;
            fprintf(stdout, "Loaded font: %s (charW=%d, charH=%d)\n",
                    fontPaths[i], charW, charH);
            break;
        }
    }

    if (!fontLoaded) {
        fprintf(stderr, "Warning: No font found. Using pixel fallback.\n");
        charW = TILE_W;
        charH = TILE_H;
    }

    return true;
}

void Renderer::clear() {
    SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
    SDL_RenderClear(renderer);
}

void Renderer::present() {
    SDL_RenderPresent(renderer);
}

void Renderer::drawFilledRect(int x, int y, int w, int h, Color color) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
    SDL_Rect r{x, y, w, h};
    SDL_RenderFillRect(renderer, &r);
}

void Renderer::drawRect(int x, int y, int w, int h, Color color) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
    SDL_Rect r{x, y, w, h};
    SDL_RenderDrawRect(renderer, &r);
}

void Renderer::renderTextLine(int x, int y, const std::string& text, Color col) {
    if (text.empty()) return;
    if (!fontLoaded || !font) {
        // Fallback: draw colored rectangles
        for (int i = 0; i < (int)text.size(); ++i) {
            if (text[i] != ' ')
                drawFilledRect(x + i * charW + 2, y + 2, charW - 4, charH - 4, col);
        }
        return;
    }

    SDL_Color sdlCol = toSDLColor(col);
    SDL_Surface* surf = TTF_RenderText_Blended(font, text.c_str(), sdlCol);
    if (!surf) return;

    SDL_Texture* tex = SDL_CreateTextureFromSurface(renderer, surf);
    SDL_FreeSurface(surf);
    if (!tex) return;

    SDL_Rect dst{x, y, 0, 0};
    SDL_QueryTexture(tex, nullptr, nullptr, &dst.w, &dst.h);
    SDL_RenderCopy(renderer, tex, nullptr, &dst);
    SDL_DestroyTexture(tex);
}

void Renderer::drawGlyph(int px, int py, char c, Color fg, Color bg) {
    // Draw background
    drawFilledRect(px, py, charW, charH, bg);

    if (c == ' ' || c == '\0') return;

    char buf[2] = {c, '\0'};
    renderTextLine(px, py, buf, fg);
}

void Renderer::drawTile(int tx, int ty, char glyph, Color fg, Color bg) {
    int px = tx * TILE_W;
    int py = ty * TILE_H;
    drawGlyph(px, py, glyph, fg, bg);
}

void Renderer::drawChar(int px, int py, char c, Color fg) {
    char buf[2] = {c, '\0'};
    renderTextLine(px, py, buf, fg);
}

void Renderer::drawText(int px, int py, const std::string& text, Color color) {
    renderTextLine(px, py, text, color);
}

void Renderer::drawBar(int x, int y, int w, int h,
                       int current, int max,
                       Color fillColor, Color bgColor, const std::string& label) {
    // Background
    drawFilledRect(x, y, w, h, bgColor);
    // Fill
    if (max > 0) {
        int fillW = (int)((float)current / (float)max * w);
        fillW = std::max(0, std::min(fillW, w));
        drawFilledRect(x, y, fillW, h, fillColor);
    }
    // Border
    drawRect(x, y, w, h, Colors::DARK_GRAY);
    // Label
    if (!label.empty()) {
        renderTextLine(x + 2, y + 1, label, Colors::WHITE);
    }
}

void Renderer::drawMap(const Map& map, const Player& player,
                       const std::vector<Monster>& monsters,
                       const std::vector<Item>& groundItems)
{
    // Draw map tiles
    for (int y = 0; y < MAP_H; ++y) {
        for (int x = 0; x < MAP_W; ++x) {
            const Tile& tile = map.tiles[y][x];

            if (!tile.explored) {
                // Completely dark
                drawTile(x, y, ' ', Colors::BLACK, Colors::BLACK);
                continue;
            }

            Color fg = tile.fg;
            Color bg = tile.bg;

            if (!tile.visible) {
                // Dimmed - explored but not in FOV
                fg = fg.dim(0.35f);
                bg = bg.dim(0.35f);
            }

            drawTile(x, y, tile.glyph, fg, bg);
        }
    }

    // Draw ground items (only if visible)
    for (const Item& item : groundItems) {
        Vec2 p = item.pos;
        if (!map.inBounds(p)) continue;
        if (!map.tiles[p.y][p.x].visible) continue;
        Color bg = map.tiles[p.y][p.x].bg;
        drawTile(p.x, p.y, item.def->glyph, item.def->color, bg);
    }

    // Draw monsters (only if visible)
    for (const Monster& m : monsters) {
        if (!m.alive) continue;
        Vec2 p = m.pos;
        if (!map.inBounds(p)) continue;
        if (!map.tiles[p.y][p.x].visible) continue;
        Color bg = map.tiles[p.y][p.x].bg;
        drawTile(p.x, p.y, m.glyph, m.color, bg);
    }

    // Draw player
    {
        Vec2 p = player.pos;
        if (map.inBounds(p)) {
            Color bg = map.tiles[p.y][p.x].bg;
            drawTile(p.x, p.y, player.glyph, player.color, bg);
        }
    }
}

void Renderer::drawPanel(const Player& player, int floor) {
    // Panel background
    drawFilledRect(PANEL_X, 0, PANEL_W, PANEL_H, Color(15, 15, 25));
    // Border
    drawRect(PANEL_X, 0, PANEL_W, PANEL_H, Color(60, 60, 80));

    int x = PANEL_X + 6;
    int y = 6;
    int lh = charH + 4;  // line height

    // Title / class
    renderTextLine(x, y, "=== " + player.className() + " ===", Colors::YELLOW);
    y += lh;

    renderTextLine(x, y, "Floor: " + std::to_string(floor) + " / " + std::to_string(MAX_FLOOR),
                   Colors::CYAN);
    y += lh;

    renderTextLine(x, y, "Level: " + std::to_string(player.level), Colors::WHITE);
    y += lh;

    // XP bar
    std::string xpLabel = "XP: " + std::to_string(player.xp) + "/" + std::to_string(player.xpToNext);
    drawBar(x, y, PANEL_W - 12, lh - 2, player.xp, player.xpToNext,
            Color(80, 80, 200), Color(20, 20, 60), xpLabel);
    y += lh + 2;

    // HP bar
    std::string hpLabel = "HP: " + std::to_string(player.hp) + "/" + std::to_string(player.maxHp);
    drawBar(x, y, PANEL_W - 12, lh - 2, player.hp, player.maxHp,
            Color(200, 50, 50), Color(60, 15, 15), hpLabel);
    y += lh + 2;

    // MP bar
    std::string mpLabel = "MP: " + std::to_string(player.mp) + "/" + std::to_string(player.maxMp);
    drawBar(x, y, PANEL_W - 12, lh - 2, player.mp, player.maxMp,
            Color(50, 80, 200), Color(15, 25, 60), mpLabel);
    y += lh + 4;

    // Stats
    renderTextLine(x, y, "ATK:  " + std::to_string(player.totalAttack()), Colors::ORANGE);
    y += lh;
    renderTextLine(x, y, "MATK: " + std::to_string(player.magicAttack), Colors::PURPLE);
    y += lh;
    renderTextLine(x, y, "PDEF: " + std::to_string(player.totalDefense()), Colors::CYAN);
    y += lh;
    renderTextLine(x, y, "MDEF: " + std::to_string(player.totalMagicDefense()), Color(100, 180, 255));
    y += lh;
    renderTextLine(x, y, "SPD:  " + std::to_string(player.speed), Colors::GREEN);
    y += lh;
    renderTextLine(x, y, "LCK:  " + std::to_string(player.luck), Colors::YELLOW);
    y += lh;

    // 実効クリティカル率 = 基礎値 + 運×0.5%
    int critPct = (int)(player.effectiveCritChance() * 100.0f);
    renderTextLine(x, y, "CRIT: " + std::to_string(critPct) + "%", Color(255, 200, 50));
    y += lh;

    renderTextLine(x, y, "GOLD: " + std::to_string(player.gold), Colors::YELLOW);
    y += lh + 4;

    // Equipment
    renderTextLine(x, y, "--- Equipment ---", Colors::GRAY);
    y += lh;

    std::string weaponStr = "Weapon: ";
    weaponStr += (player.weapon ? player.weapon->def->name : "None");
    renderTextLine(x, y, weaponStr, player.weapon ? Colors::GREEN : Colors::DARK_GRAY);
    y += lh;

    std::string armorStr = "Armor:  ";
    armorStr += (player.armor ? player.armor->def->name : "None");
    renderTextLine(x, y, armorStr, player.armor ? Colors::GREEN : Colors::DARK_GRAY);
    y += lh + 4;

    // Controls hint
    renderTextLine(x, y, "--- Controls ---", Colors::GRAY);
    y += lh;
    renderTextLine(x, y, "Move: Arrow/WASD", Colors::DARK_GRAY);
    y += lh;
    renderTextLine(x, y, "g/,: Pick up item", Colors::DARK_GRAY);
    y += lh;
    renderTextLine(x, y, "i: Inventory", Colors::DARK_GRAY);
    y += lh;
    renderTextLine(x, y, ">: Descend stairs", Colors::DARK_GRAY);
}

void Renderer::drawMessages(const std::deque<std::string>& messages) {
    // Message log background
    drawFilledRect(0, MSG_Y, SCREEN_W, MSG_H, Color(10, 10, 18));
    drawRect(0, MSG_Y, SCREEN_W, MSG_H, Color(50, 50, 70));

    int x = 6;
    int lineH = charH + 2;
    int maxLines = (MSG_H - 6) / lineH;

    int startMsg = (int)messages.size() - maxLines;
    if (startMsg < 0) startMsg = 0;

    int y = MSG_Y + 4;
    for (int i = startMsg; i < (int)messages.size(); ++i) {
        float age = 1.0f - (float)(messages.size() - 1 - i) / (float)maxLines;
        uint8_t alpha = (uint8_t)(180 + age * 75);
        Color col{200, 200, 200, alpha};
        // Newest messages brighter
        if (i == (int)messages.size() - 1) col = Colors::WHITE;
        renderTextLine(x, y, messages[i], col);
        y += lineH;
    }
}

void Renderer::drawInventory(const Player& player, int selectedIdx) {
    // Semi-transparent overlay
    int iw = 600, ih = 500;
    int ix = (SCREEN_W - iw) / 2;
    int iy = (SCREEN_H - ih) / 2;

    drawFilledRect(ix - 4, iy - 4, iw + 8, ih + 8, Color(0, 0, 0, 200));
    drawFilledRect(ix, iy, iw, ih, Color(15, 15, 30));
    drawRect(ix, iy, iw, ih, Colors::CYAN);

    int lh = charH + 3;
    int x = ix + 10;
    int y = iy + 10;

    renderTextLine(x, y, "=== INVENTORY ===", Colors::YELLOW);
    y += lh + 4;

    renderTextLine(x, y, "u: Use/Equip   Esc: Close   Arrow keys: Navigate",
                   Colors::DARK_GRAY);
    y += lh + 4;

    if (player.inventory.empty()) {
        renderTextLine(x, y, "(Empty)", Colors::DARK_GRAY);
        return;
    }

    for (int i = 0; i < (int)player.inventory.size(); ++i) {
        const Item& item = player.inventory[i];
        if (!item.def) continue;

        bool selected = (i == selectedIdx);
        bool equipped = (player.weapon == &item || player.armor == &item);

        // Highlight selected
        if (selected) {
            drawFilledRect(ix + 4, y - 1, iw - 8, lh + 1, Color(40, 40, 80));
            drawRect(ix + 4, y - 1, iw - 8, lh + 1, Colors::CYAN);
        }

        std::string prefix = std::string(1, 'a' + i) + ") ";
        if (equipped) prefix += "[E] ";

        std::string name = item.displayName();
        if (item.quantity > 1) name += " x" + std::to_string(item.quantity);

        // Show stats
        std::string stats;
        if (item.def->attack_bonus > 0)        stats += " +ATK"  + std::to_string(item.def->attack_bonus);
        if (item.def->defense_bonus > 0)       stats += " +PDEF" + std::to_string(item.def->defense_bonus);
        if (item.def->magic_defense_bonus > 0) stats += " +MDEF" + std::to_string(item.def->magic_defense_bonus);
        if (item.def->hp_restore > 0)          stats += " HP+"   + std::to_string(item.def->hp_restore);
        if (item.def->mp_restore > 0)          stats += " MP+"   + std::to_string(item.def->mp_restore);
        if (item.def->damage > 0)              stats += " DMG"   + std::to_string(item.def->damage);

        Color itemColor = equipped ? Colors::GREEN : item.def->color;
        renderTextLine(x, y, prefix + name + stats, itemColor);
        y += lh;

        if (y > iy + ih - lh) {
            renderTextLine(x, y, "... more ...", Colors::DARK_GRAY);
            break;
        }
    }
}

void Renderer::drawClassSelect(CharClass hoveredClass) {
    clear();
    drawFilledRect(0, 0, SCREEN_W, SCREEN_H, Color(5, 5, 15));

    int lh = charH + 4;
    int cx = SCREEN_W / 2;
    int y = 60;

    auto centered = [&](const std::string& text, Color col) {
        int tw = (int)text.size() * charW;
        renderTextLine(cx - tw / 2, y, text, col);
        y += lh;
    };

    centered("=== ROGUELIKE RPG ===", Colors::YELLOW);
    y += lh;
    centered("Choose Your Class", Colors::WHITE);
    y += lh * 2;

    struct ClassInfo {
        CharClass cls;
        const char* name;
        const char* desc;
        const char* stats;
        Color col;
    };

    ClassInfo classes[] = {
        { CharClass::WARRIOR, "WARRIOR",
          "A mighty fighter, tough and strong.",
          "HP:40  MP:5  ATK:10  DEF:6  CRIT:5%",
          Colors::RED },
        { CharClass::MAGE, "MAGE",
          "A powerful spellcaster with weak body.",
          "HP:20  MP:30  ATK:4  DEF:2  MAGIC:14  CRIT:10%",
          Colors::BLUE },
        { CharClass::ROGUE, "ROGUE",
          "A swift assassin with high crit chance.",
          "HP:28  MP:12  ATK:7  DEF:4  CRIT:25%",
          Colors::GREEN },
    };

    for (auto& ci : classes) {
        bool selected = (ci.cls == hoveredClass);
        int bx = cx - 280;
        int bw = 560;

        if (selected) {
            drawFilledRect(bx - 4, y - 4, bw + 8, lh * 4 + 8, Color(30, 30, 60));
            drawRect(bx - 4, y - 4, bw + 8, lh * 4 + 8, Colors::YELLOW);
        } else {
            drawRect(bx - 4, y - 4, bw + 8, lh * 4 + 8, Color(50, 50, 70));
        }

        Color nameCol = selected ? Colors::YELLOW : ci.col;
        int nameW = (int)strlen(ci.name) * charW;
        renderTextLine(cx - nameW / 2, y, ci.name, nameCol);
        y += lh;

        int descW = (int)strlen(ci.desc) * charW;
        renderTextLine(cx - descW / 2, y, ci.desc, Colors::GRAY);
        y += lh;

        int statsW = (int)strlen(ci.stats) * charW;
        renderTextLine(cx - statsW / 2, y, ci.stats, Colors::CYAN);
        y += lh * 2 + 8;
    }

    y += lh;
    std::string hint = "Left/Right Arrows to select, Enter to confirm";
    int hw = (int)hint.size() * charW;
    renderTextLine(cx - hw / 2, y, hint, Colors::DARK_GRAY);
}

void Renderer::drawGameOver(bool won, int floor, int gold) {
    clear();
    drawFilledRect(0, 0, SCREEN_W, SCREEN_H, Color(5, 5, 15));

    int lh = charH + 4;
    int cx = SCREEN_W / 2;
    int y = 200;

    auto centered = [&](const std::string& text, Color col) {
        int tw = (int)text.size() * charW;
        renderTextLine(cx - tw / 2, y, text, col);
        y += lh;
    };

    if (won) {
        centered("=== VICTORY! ===", Colors::YELLOW);
        y += lh;
        centered("You descended all 10 floors!", Colors::GREEN);
    } else {
        centered("=== YOU DIED ===", Colors::RED);
        y += lh;
        centered("Better luck next time.", Colors::GRAY);
    }

    y += lh * 2;
    centered("Floor reached: " + std::to_string(floor), Colors::WHITE);
    centered("Gold collected: " + std::to_string(gold), Colors::YELLOW);

    y += lh * 2;
    centered("Press Escape or Q to quit", Colors::DARK_GRAY);
}
