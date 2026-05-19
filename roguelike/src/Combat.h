#pragma once
#include "Types.h"
#include "Player.h"
#include "Monster.h"
#include <string>
#include <cstdint>

CombatResult playerAttackMonster(Player& p, Monster& m, uint32_t& rng);
CombatResult monsterAttackPlayer(Monster& m, Player& p, uint32_t& rng);
CombatResult magicAttack(int magicAtk, int targetDefense, int& targetHp,
                         const std::string& attackerName,
                         const std::string& targetName,
                         uint32_t& rng);
