#include "Combat.h"
#include <algorithm>
#include <string>

static uint32_t xorshift(uint32_t& state) {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state;
}

static int rngRange(uint32_t& state, int lo, int hi) {
    if (lo > hi) std::swap(lo, hi);
    if (lo == hi) return lo;
    return lo + (int)(xorshift(state) % (uint32_t)(hi - lo + 1));
}

static float rollFloat(uint32_t& state) {
    return (float)(xorshift(state) % 1000) / 1000.0f;
}

CombatResult playerAttackMonster(Player& p, Monster& m, uint32_t& rng) {
    CombatResult result;

    // --- 回避判定 ---
    // モンスターの素早さがプレイヤーより高いと回避が発生
    float dodgeChance = std::max(0.0f, std::min(0.35f, (m.speed - p.speed) * 0.015f));
    if (rollFloat(rng) < dodgeChance) {
        result.dodged = true;
        result.message = m.name + " dodges the attack!";
        return result;
    }

    int atk = p.totalAttack();
    int def = m.defense;

    int variance = rngRange(rng, -2, 2);
    int dmg = std::max(1, atk - def / 2 + variance);

    // --- クリティカル判定 (基礎値 + 運 × 0.5%) ---
    float crit = p.effectiveCritChance();
    if (rollFloat(rng) < crit) {
        dmg *= 2;
        result.is_crit = true;
    }

    m.hp -= dmg;
    result.damage = dmg;

    if (m.hp <= 0) {
        m.hp = 0;
        m.alive = false;
        result.killed = true;
        result.message = p.name + " kills the " + m.name + "!";
    } else if (result.is_crit) {
        result.message = "CRITICAL! " + p.name + " hits " + m.name +
                         " for " + std::to_string(dmg) + " damage!";
    } else {
        result.message = p.name + " hits " + m.name +
                         " for " + std::to_string(dmg) + " damage.";
    }

    return result;
}

CombatResult monsterAttackPlayer(Monster& m, Player& p, uint32_t& rng) {
    CombatResult result;

    // --- 回避判定 ---
    // プレイヤーの素早さがモンスターより高いと回避が発生
    float dodgeChance = p.evasionChance(m.speed);
    if (rollFloat(rng) < dodgeChance) {
        result.dodged = true;
        result.message = "You dodge " + m.name + "'s attack!";
        return result;
    }

    int atk = m.attack;
    int def = p.totalDefense();

    int variance = rngRange(rng, -2, 2);
    int dmg = std::max(1, atk - def / 2 + variance);

    // --- モンスタークリティカル判定 (運に基づく) ---
    // 基礎3% + 運 × 0.3%
    float monsterCrit = 0.03f + m.luck * 0.003f;
    if (rollFloat(rng) < monsterCrit) {
        dmg = (int)(dmg * 1.5f);
        result.is_crit = true;
    }

    p.hp -= dmg;
    result.damage = dmg;

    if (p.hp <= 0) {
        p.hp = 0;
        p.alive = false;
        result.killed = true;
        result.message = m.name + " kills " + p.name + "!";
    } else if (result.is_crit) {
        result.message = m.name + " critically hits you for " +
                         std::to_string(dmg) + " damage!";
    } else {
        result.message = m.name + " hits you for " +
                         std::to_string(dmg) + " damage.";
    }

    return result;
}

CombatResult magicAttack(int magicAtk, int targetMagicDefense, int& targetHp,
                         const std::string& attackerName,
                         const std::string& targetName,
                         uint32_t& rng) {
    CombatResult result;

    int variance = rngRange(rng, -3, 3);
    int dmg = std::max(1, magicAtk - targetMagicDefense / 2 + variance);

    targetHp -= dmg;
    result.damage = dmg;

    if (targetHp <= 0) {
        targetHp = 0;
        result.killed = true;
        result.message = attackerName + " blasts " + targetName +
                        " with magic for " + std::to_string(dmg) + " damage! [KILLED]";
    } else {
        result.message = attackerName + " blasts " + targetName +
                        " with magic for " + std::to_string(dmg) + " damage!";
    }

    return result;
}
