#include "Game.h"
#include "Combat.h"
#include <algorithm>
#include <cstdio>
#include <ctime>
#include <cstring>

Game::Game() {
    rngState = (uint32_t)time(nullptr);
    if (rngState == 0) rngState = 987654321;
}

uint32_t Game::rng() {
    rngState ^= rngState << 13;
    rngState ^= rngState >> 17;
    rngState ^= rngState << 5;
    return rngState;
}

int Game::rngRange(int lo, int hi) {
    if (lo > hi) std::swap(lo, hi);
    if (lo == hi) return lo;
    return lo + (int)(rng() % (uint32_t)(hi - lo + 1));
}

void Game::init() {
    if (!renderer.init()) {
        fprintf(stderr, "Failed to init renderer\n");
        return;
    }
    gameState = GameState::CLASS_SELECT;
    selectedClass = CharClass::WARRIOR;
    addMessage("Welcome to the Dungeon! Choose your class.");
}

void Game::run() {
    bool running = true;
    SDL_Event e;

    while (running) {
        while (SDL_PollEvent(&e)) {
            if (e.type == SDL_QUIT) {
                running = false;
            } else {
                handleEvent(e);
            }

            // Check for quit signal
            if (gameState == GameState::GAME_OVER || gameState == GameState::WIN) {
                // Still running - player can press Q/Esc to quit
            }
        }

        update();
        SDL_Delay(16);  // ~60fps cap
    }
}

void Game::handleEvent(const SDL_Event& e) {
    if (e.type == SDL_KEYDOWN) {
        handleInput(e.key.keysym.sym);
    }
}

void Game::handleInput(SDL_Keycode key) {
    switch (gameState) {
        case GameState::CLASS_SELECT:
            handleClassSelectInput(key);
            break;
        case GameState::PLAYING:
            handlePlayingInput(key);
            break;
        case GameState::INVENTORY:
            handleInventoryInput(key);
            break;
        case GameState::GAME_OVER:
        case GameState::WIN:
            handleGameOverInput(key);
            break;
    }
}

void Game::handleClassSelectInput(SDL_Keycode key) {
    switch (key) {
        case SDLK_LEFT:
        case SDLK_a:
            if (selectedClass == CharClass::MAGE)        selectedClass = CharClass::WARRIOR;
            else if (selectedClass == CharClass::ROGUE)  selectedClass = CharClass::MAGE;
            break;
        case SDLK_RIGHT:
        case SDLK_d:
            if (selectedClass == CharClass::WARRIOR)  selectedClass = CharClass::MAGE;
            else if (selectedClass == CharClass::MAGE) selectedClass = CharClass::ROGUE;
            break;
        case SDLK_RETURN:
        case SDLK_RETURN2:
        case SDLK_SPACE:
            // Start game
            player.init(selectedClass);
            player.floor = 1;
            currentFloor = 1;
            generateFloor(1);
            gameState = GameState::PLAYING;
            addMessage("You enter the dungeon as a " + player.className() + ".");
            addMessage("Use arrow keys or WASD to move. 'i' for inventory, '>' to descend.");
            break;
        default:
            break;
    }
}

void Game::handlePlayingInput(SDL_Keycode key) {
    Vec2 dir{0, 0};
    bool acted = false;

    switch (key) {
        // Cardinal directions
        case SDLK_UP:    case SDLK_w: case SDLK_k: dir = {0, -1}; break;
        case SDLK_DOWN:  case SDLK_s: case SDLK_j: dir = {0,  1}; break;
        case SDLK_LEFT:  case SDLK_a: case SDLK_h: dir = {-1, 0}; break;
        case SDLK_RIGHT: case SDLK_d: case SDLK_l: dir = { 1, 0}; break;
        // Diagonal
        case SDLK_KP_7: case SDLK_y: dir = {-1, -1}; break;
        case SDLK_KP_9: case SDLK_u: dir = { 1, -1}; break;
        case SDLK_KP_1: case SDLK_b: dir = {-1,  1}; break;
        case SDLK_KP_3: case SDLK_n: dir = { 1,  1}; break;
        // Wait
        case SDLK_KP_5: case SDLK_PERIOD:
            acted = true;
            addMessage("You wait.");
            break;
        // Pick up
        case SDLK_g: case SDLK_COMMA:
            tryPickup();
            acted = true;
            break;
        // Descend
        case SDLK_GREATER:
        case SDLK_KP_ENTER:
            descendStairs();
            acted = true;
            break;
        // Ascend
        case SDLK_LESS:
            ascendStairs();
            acted = true;
            break;
        // Inventory
        case SDLK_i:
            gameState = GameState::INVENTORY;
            inventorySelection = 0;
            return;
        default:
            return;
    }

    if (dir.x != 0 || dir.y != 0) {
        movePlayer(dir);
        acted = true;
    }

    if (acted) {
        processMonsterTurns();
        map.computeFOV(player.pos, FOV_RADIUS);
        turnCount++;
        // Auto-regenerate small HP/MP over time
        if (turnCount % 20 == 0) {
            if (player.hp < player.maxHp) player.hp = std::min(player.maxHp, player.hp + 1);
        }
        if (turnCount % 10 == 0) {
            if (player.mp < player.maxMp) player.mp = std::min(player.maxMp, player.mp + 1);
        }
    }
}

void Game::handleInventoryInput(SDL_Keycode key) {
    switch (key) {
        case SDLK_ESCAPE:
        case SDLK_i:
            gameState = GameState::PLAYING;
            break;
        case SDLK_UP: case SDLK_w: case SDLK_k:
            if (!player.inventory.empty()) {
                inventorySelection = (inventorySelection - 1 + (int)player.inventory.size())
                                     % (int)player.inventory.size();
            }
            break;
        case SDLK_DOWN: case SDLK_s: case SDLK_j:
            if (!player.inventory.empty()) {
                inventorySelection = (inventorySelection + 1) % (int)player.inventory.size();
            }
            break;
        case SDLK_u: case SDLK_RETURN: case SDLK_RETURN2:
            if (!player.inventory.empty() &&
                inventorySelection < (int)player.inventory.size())
            {
                Item& it = player.inventory[inventorySelection];
                if (!it.def) break;

                if (it.isWeapon() || it.isArmor()) {
                    // Toggle equip
                    bool wasEquipped = (player.weapon == &it || player.armor == &it);
                    if (wasEquipped) {
                        if (player.weapon == &it) player.weapon = nullptr;
                        if (player.armor == &it) player.armor = nullptr;
                        addMessage("You unequip the " + it.def->name + ".");
                    } else {
                        if (it.isWeapon()) {
                            player.weapon = &it;
                            addMessage("You equip the " + it.def->name + ".");
                        } else {
                            player.armor = &it;
                            addMessage("You equip the " + it.def->name + ".");
                        }
                    }
                } else if (it.isPotion()) {
                    std::string pname = it.def->name;
                    // Potions: restore HP/MP
                    if (it.def->type == ItemType::POTION_HP) {
                        int old = player.hp;
                        player.hp = std::min(player.maxHp, player.hp + it.def->hp_restore);
                        addMessage("You drink the " + pname + ". HP +" +
                                   std::to_string(player.hp - old) + ".");
                    } else if (it.def->type == ItemType::POTION_MP) {
                        int old = player.mp;
                        player.mp = std::min(player.maxMp, player.mp + it.def->mp_restore);
                        addMessage("You drink the " + pname + ". MP +" +
                                   std::to_string(player.mp - old) + ".");
                    }
                    // Remove potion from inventory, fix equipment pointers
                    // Before erasing, nullify weapon/armor if they point to this item
                    if (player.weapon == &player.inventory[inventorySelection]) player.weapon = nullptr;
                    if (player.armor == &player.inventory[inventorySelection]) player.armor = nullptr;
                    player.inventory.erase(player.inventory.begin() + inventorySelection);
                    // Re-establish equipment pointers (find by name fallback)
                    if (inventorySelection >= (int)player.inventory.size())
                        inventorySelection = (int)player.inventory.size() - 1;
                    if (inventorySelection < 0) inventorySelection = 0;
                } else if (it.isScroll()) {
                    std::string sname = it.def->name;
                    if (it.def->type == ItemType::SCROLL_FIRE) {
                        // Fire scroll: damage all monsters in FOV
                        int totalDmg = 0;
                        int killed = 0;
                        for (auto& m : monsters) {
                            if (!m.alive) continue;
                            if (!map.inBounds(m.pos)) continue;
                            if (!map.tiles[m.pos.y][m.pos.x].visible) continue;
                            auto res = magicAttack(player.magicAttack + it.def->damage,
                                                   m.defense, m.hp,
                                                   "Fire scroll", m.name, rngState);
                            totalDmg += res.damage;
                            if (m.hp <= 0) {
                                m.alive = false;
                                killed++;
                                if (player.gainXP(m.xpValue)) {
                                    addMessage("Level up! You are now level " +
                                               std::to_string(player.level) + "!");
                                }
                            }
                        }
                        addMessage("You read a Fire Scroll! " + std::to_string(totalDmg) +
                                   " total damage, " + std::to_string(killed) + " monsters killed.");
                    } else if (it.def->type == ItemType::SCROLL_IDENTIFY) {
                        it.identified = true;
                        // Identify all in inventory
                        for (auto& inv : player.inventory) inv.identified = true;
                        addMessage("All items in your inventory are now identified!");
                    }
                    if (player.weapon == &player.inventory[inventorySelection]) player.weapon = nullptr;
                    if (player.armor == &player.inventory[inventorySelection]) player.armor = nullptr;
                    player.inventory.erase(player.inventory.begin() + inventorySelection);
                    if (inventorySelection >= (int)player.inventory.size())
                        inventorySelection = (int)player.inventory.size() - 1;
                    if (inventorySelection < 0) inventorySelection = 0;
                    // After scroll use, take a turn
                    processMonsterTurns();
                    map.computeFOV(player.pos, FOV_RADIUS);
                    turnCount++;
                }
            }
            break;
        case SDLK_d: {
            // Drop item
            if (!player.inventory.empty() &&
                inventorySelection < (int)player.inventory.size())
            {
                Item& it = player.inventory[inventorySelection];
                if (player.weapon == &it) player.weapon = nullptr;
                if (player.armor == &it) player.armor = nullptr;
                it.pos = player.pos;
                groundItems.push_back(it);
                addMessage("You drop the " + it.displayName() + ".");
                player.inventory.erase(player.inventory.begin() + inventorySelection);
                if (inventorySelection >= (int)player.inventory.size())
                    inventorySelection = (int)player.inventory.size() - 1;
                if (inventorySelection < 0) inventorySelection = 0;
            }
            break;
        }
        default:
            break;
    }
}

void Game::handleGameOverInput(SDL_Keycode key) {
    if (key == SDLK_ESCAPE || key == SDLK_q || key == SDLK_RETURN) {
        SDL_Event quitEvent;
        quitEvent.type = SDL_QUIT;
        SDL_PushEvent(&quitEvent);
    }
}

void Game::movePlayer(Vec2 dir) {
    Vec2 target = player.pos + dir;

    if (!map.inBounds(target)) return;

    // Check for monster
    Monster* m = getMonsterAt(target);
    if (m && m->alive) {
        // Attack monster
        CombatResult result = playerAttackMonster(player, *m, rngState);
        addMessage(result.message);

        if (result.killed) {
            m->alive = false;
            bool leveled = player.gainXP(m->xpValue);
            if (leveled) {
                addMessage("You leveled up! Now level " + std::to_string(player.level) + "!");
            }
        }
        return;
    }

    // Check if walkable
    if (!map.isWalkable(target)) {
        return;
    }

    // Move
    player.pos = target;

    // Auto-pickup gold
    for (auto it = groundItems.begin(); it != groundItems.end(); ) {
        if (it->pos == player.pos && it->isGold()) {
            addMessage("You pick up " + std::to_string(it->quantity) + " gold.");
            player.gold += it->quantity;
            it = groundItems.erase(it);
        } else {
            ++it;
        }
    }
}

void Game::tryPickup() {
    for (auto it = groundItems.begin(); it != groundItems.end(); ) {
        if (it->pos == player.pos) {
            if (it->isGold()) {
                addMessage("You pick up " + std::to_string(it->quantity) + " gold.");
                player.gold += it->quantity;
                it = groundItems.erase(it);
            } else {
                if ((int)player.inventory.size() >= MAX_INVENTORY) {
                    addMessage("Your inventory is full!");
                    return;
                }
                addMessage("You pick up the " + it->displayName() + ".");
                player.inventory.push_back(*it);
                it = groundItems.erase(it);
            }
        } else {
            ++it;
        }
    }
}

void Game::descendStairs() {
    if (map.tiles[player.pos.y][player.pos.x].type != TileType::STAIRS_DOWN) {
        addMessage("There are no stairs down here.");
        return;
    }

    if (currentFloor >= MAX_FLOOR) {
        addMessage("You have conquered the dungeon!");
        gameState = GameState::WIN;
        return;
    }

    currentFloor++;
    player.floor = currentFloor;
    generateFloor(currentFloor);
    addMessage("You descend to floor " + std::to_string(currentFloor) + ".");
    map.computeFOV(player.pos, FOV_RADIUS);
}

void Game::ascendStairs() {
    if (map.tiles[player.pos.y][player.pos.x].type != TileType::STAIRS_UP) {
        addMessage("There are no stairs up here.");
        return;
    }
    if (currentFloor <= 1) {
        addMessage("You are on the first floor.");
        return;
    }
    currentFloor--;
    player.floor = currentFloor;
    generateFloor(currentFloor);
    addMessage("You ascend to floor " + std::to_string(currentFloor) + ".");
    map.computeFOV(player.pos, FOV_RADIUS);
}

void Game::generateFloor(int floor) {
    monsters.clear();
    groundItems.clear();

    // Generate map
    uint32_t seed = rngState + (uint32_t)floor * 777777;
    map.generate(floor, seed);

    // Place player at stairs up position (or first room center)
    if (map.stairsUp.x >= 0 && floor > 1) {
        player.pos = map.stairsUp;
    } else if (!map.rooms.empty()) {
        player.pos = map.rooms[0].center();
    } else {
        player.pos = {5, 5};
    }

    // Spawn monsters
    int monsterCount = 5 + floor * 2;
    spawnMonsters(floor, monsterCount);

    // Spawn items
    int itemCount = 3 + floor;
    spawnItems(floor, itemCount);

    // Compute initial FOV
    map.computeFOV(player.pos, FOV_RADIUS);
}

void Game::spawnMonsters(int floor, int count) {
    if (map.rooms.empty()) return;

    for (int i = 0; i < count; ++i) {
        // Try to find a valid position
        int attempts = 0;
        while (attempts < 50) {
            // Pick a random room (not the first one where player spawns)
            int roomIdx = rngRange(1, (int)map.rooms.size() - 1);
            if (map.rooms.size() == 1) roomIdx = 0;
            const Room& room = map.rooms[roomIdx];

            int mx = rngRange(room.x, room.x + room.w - 1);
            int my = rngRange(room.y, room.y + room.h - 1);
            Vec2 pos{mx, my};

            if (!map.isWalkable(pos)) { attempts++; continue; }
            if (pos == player.pos) { attempts++; continue; }
            if (getMonsterAt(pos)) { attempts++; continue; }

            monsters.push_back(randomMonsterForFloor(floor, pos, rngState));
            break;
        }
    }
}

void Game::spawnItems(int floor, int count) {
    if (map.rooms.empty()) return;

    for (int i = 0; i < count; ++i) {
        int attempts = 0;
        while (attempts < 50) {
            int roomIdx = rngRange(0, (int)map.rooms.size() - 1);
            const Room& room = map.rooms[roomIdx];

            int ix = rngRange(room.x, room.x + room.w - 1);
            int iy = rngRange(room.y, room.y + room.h - 1);
            Vec2 pos{ix, iy};

            if (!map.isWalkable(pos)) { attempts++; continue; }
            if (pos == player.pos) { attempts++; continue; }

            Item item = randomItem(floor, rngState);
            item.pos = pos;
            groundItems.push_back(item);
            break;
        }
    }
}

void Game::processMonsterTurns() {
    for (auto& m : monsters) {
        if (!m.alive) continue;
        if (m.stunTurns > 0) {
            m.stunTurns--;
            continue;
        }

        // Check if player is in alert radius
        float dist = m.pos.dist(player.pos);

        if (!m.alerted && dist <= (float)m.alertRadius) {
            m.alerted = true;
        }

        if (!m.alerted) continue;

        // Adjacent to player -> attack
        Vec2 diff = {player.pos.x - m.pos.x, player.pos.y - m.pos.y};
        int manhattan = abs(diff.x) + abs(diff.y);

        if (manhattan <= 1 && manhattan > 0) {
            // Dark mage uses magic if has magicAttack
            CombatResult result;
            if (m.magicAttack > 0 && rngRange(0, 2) == 0) {
                result = magicAttack(m.magicAttack, player.totalDefense(),
                                     player.hp, m.name, player.name, rngState);
            } else {
                result = monsterAttackPlayer(m, player, rngState);
            }
            addMessage(result.message);

            if (!player.alive) {
                gameState = GameState::GAME_OVER;
                addMessage("You have died! Game over.");
                return;
            }
            continue;
        }

        // Move toward player
        Vec2 dir{0, 0};
        // Try to move in the direction with bigger difference first
        int ax = abs(diff.x);
        int ay = abs(diff.y);

        // Build candidate moves
        Vec2 moves[4];
        int nm = 0;

        if (ax >= ay) {
            if (diff.x != 0) moves[nm++] = {(diff.x > 0) ? 1 : -1, 0};
            if (diff.y != 0) moves[nm++] = {0, (diff.y > 0) ? 1 : -1};
            if (diff.x != 0) moves[nm++] = {(diff.x > 0) ? -1 : 1, 0};
            if (diff.y != 0) moves[nm++] = {0, (diff.y > 0) ? -1 : 1};
        } else {
            if (diff.y != 0) moves[nm++] = {0, (diff.y > 0) ? 1 : -1};
            if (diff.x != 0) moves[nm++] = {(diff.x > 0) ? 1 : -1, 0};
            if (diff.y != 0) moves[nm++] = {0, (diff.y > 0) ? -1 : 1};
            if (diff.x != 0) moves[nm++] = {(diff.x > 0) ? -1 : 1, 0};
        }

        // Try moves in order
        for (int mi = 0; mi < nm; ++mi) {
            Vec2 target = m.pos + moves[mi];
            if (!map.isWalkable(target)) continue;
            if (target == player.pos) continue;
            if (getMonsterAt(target)) continue;
            m.pos = target;
            break;
        }
    }

    // Remove dead monsters
    monsters.erase(
        std::remove_if(monsters.begin(), monsters.end(),
                       [](const Monster& m){ return !m.alive; }),
        monsters.end());
}

Monster* Game::getMonsterAt(Vec2 pos) {
    for (auto& m : monsters) {
        if (m.alive && m.pos == pos) return &m;
    }
    return nullptr;
}

bool Game::isTileOccupied(Vec2 pos) const {
    for (const auto& m : monsters) {
        if (m.alive && m.pos == pos) return true;
    }
    return false;
}

void Game::addMessage(const std::string& msg) {
    messages.push_back(msg);
    while ((int)messages.size() > MAX_MESSAGES) {
        messages.pop_front();
    }
}

void Game::update() {
    renderer.clear();

    switch (gameState) {
        case GameState::CLASS_SELECT:
            renderer.drawClassSelect(selectedClass);
            break;
        case GameState::PLAYING:
            renderer.drawMap(map, player, monsters, groundItems);
            renderer.drawPanel(player, currentFloor);
            renderer.drawMessages(messages);
            break;
        case GameState::INVENTORY:
            renderer.drawMap(map, player, monsters, groundItems);
            renderer.drawPanel(player, currentFloor);
            renderer.drawMessages(messages);
            renderer.drawInventory(player, inventorySelection);
            break;
        case GameState::GAME_OVER:
            renderer.drawGameOver(false, currentFloor, player.gold);
            break;
        case GameState::WIN:
            renderer.drawGameOver(true, currentFloor, player.gold);
            break;
    }

    renderer.present();
}
