#pragma once
#include "Config.h"
#include "Types.h"
#include "Map.h"
#include "Player.h"
#include "Monster.h"
#include "Item.h"
#include "Renderer.h"

#include <SDL2/SDL.h>
#include <vector>
#include <deque>
#include <string>
#include <cstdint>

enum class GameState {
    CLASS_SELECT,
    PLAYING,
    INVENTORY,
    GAME_OVER,
    WIN
};

class Game {
public:
    Game();
    ~Game() = default;

    void init();
    void run();

private:
    Player player;
    std::vector<Monster> monsters;
    std::vector<Item> groundItems;
    Map map;
    Renderer renderer;
    std::deque<std::string> messages;

    int currentFloor = 1;
    GameState gameState = GameState::CLASS_SELECT;
    CharClass selectedClass = CharClass::WARRIOR;
    int inventorySelection = 0;
    int turnCount = 0;

    uint32_t rngState = 12345678;

    // RNG helpers
    uint32_t rng();
    int rngRange(int lo, int hi);

    void handleEvent(const SDL_Event& e);
    void handleInput(SDL_Keycode key);
    void handleClassSelectInput(SDL_Keycode key);
    void handlePlayingInput(SDL_Keycode key);
    void handleInventoryInput(SDL_Keycode key);
    void handleGameOverInput(SDL_Keycode key);

    void movePlayer(Vec2 dir);
    void tryPickup();
    void descendStairs();
    void ascendStairs();

    void generateFloor(int floor);
    void spawnMonsters(int floor, int count);
    void spawnItems(int floor, int count);

    void processMonsterTurns();
    Monster* getMonsterAt(Vec2 pos);
    bool isTileOccupied(Vec2 pos) const;

    void addMessage(const std::string& msg);
    void update();
};
