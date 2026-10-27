// 装備データ — Unity版 Roguelike/EquipmentFactory.cs の移植 (全34種+魔道書4種)
//
// ※ Unity版のプールには WeaponType.Tome の武器が存在せず、魔道書のみ装備可能な
//   ゼノが武器を装備できなかったため、Web版で魔道書4本 (フロア別) を新規追加。
import type { EquipmentDef, EquipSlot } from '../core/types';
import { Rng } from '../core/rng';

const E = (e: EquipmentDef) => e;

export const EQUIPMENT: EquipmentDef[] = [
  // ═══ WEAPONS — Floor 0: 廃墟 (Common) ═══════════════════════════
  E({ id: 'Equip_RustedSword', name: '錆びた剣', slot: 'Weapon', rarity: 'Common',
    description: '物攻+25',
    weaponCategory: 'Sword', weaponElement: 'None',
    bonusStats: { physicalAttack: 25 }, value: 90 }),
  E({ id: 'Equip_OldAxe', name: '古い斧', slot: 'Weapon', rarity: 'Common',
    description: '物攻+30 会心+5',
    weaponCategory: 'Axe', weaponElement: 'None',
    bonusStats: { physicalAttack: 30, criticalRate: 5 }, value: 100 }),
  E({ id: 'Equip_ApprenticeStaff', name: '見習いの杖', slot: 'Weapon', rarity: 'Common',
    description: '魔攻+20 MP+10',
    weaponCategory: 'Staff', weaponElement: 'None',
    bonusStats: { magicAttack: 20, maxMP: 10 }, value: 90 }),
  E({ id: 'Equip_ShortBow', name: '短弓', slot: 'Weapon', rarity: 'Common',
    description: '物攻+20 速度+5',
    weaponCategory: 'Bow', weaponElement: 'None',
    bonusStats: { physicalAttack: 20, speed: 5 }, value: 90 }),
  E({ id: 'Equip_WornGrimoire', name: '古びた魔道書', slot: 'Weapon', rarity: 'Common',
    description: '魔攻+22 MP+12',
    weaponCategory: 'Tome', weaponElement: 'None',
    bonusStats: { magicAttack: 22, maxMP: 12 }, value: 90 }),

  // ═══ WEAPONS — Floor 1: 暗黒の森 (Uncommon) ════════════════════
  E({ id: 'Equip_KnightSword', name: '騎士の剣', slot: 'Weapon', rarity: 'Uncommon',
    description: '物攻+55',
    weaponCategory: 'Sword', weaponElement: 'None',
    bonusStats: { physicalAttack: 55 }, value: 200 }),
  E({ id: 'Equip_BerserkerAxe', name: '戦鬼の斧', slot: 'Weapon', rarity: 'Uncommon',
    description: '物攻+70 会心+8',
    weaponCategory: 'Axe', weaponElement: 'None',
    bonusStats: { physicalAttack: 70, criticalRate: 8 }, value: 220 }),
  E({ id: 'Equip_DarkStaff', name: '闇の杖', slot: 'Weapon', rarity: 'Uncommon',
    description: '魔攻+60 MP+20　闇属性',
    weaponCategory: 'Staff', weaponElement: 'Dark',
    bonusStats: { magicAttack: 60, maxMP: 20 }, value: 210 }),
  E({ id: 'Equip_PoisonBlade', name: '毒刃', slot: 'Weapon', rarity: 'Uncommon',
    description: '物攻+45 速度+10　攻撃時25%で毒',
    weaponCategory: 'Dagger', weaponElement: 'None', weaponPoison: 0.25,
    bonusStats: { physicalAttack: 45, speed: 10 }, value: 190 }),
  E({ id: 'Equip_CurseTome', name: '呪術書', slot: 'Weapon', rarity: 'Uncommon',
    description: '魔攻+55 MP+25　闇属性',
    weaponCategory: 'Tome', weaponElement: 'Dark',
    bonusStats: { magicAttack: 55, maxMP: 25 }, value: 210 }),

  // ═══ WEAPONS — Floor 2: 呪われた城 (Rare) ═══════════════════════
  E({ id: 'Equip_HolySword', name: '聖剣フォルセティ', slot: 'Weapon', rarity: 'Rare',
    description: '物攻+100　光属性',
    weaponCategory: 'Sword', weaponElement: 'Light',
    bonusStats: { physicalAttack: 100 }, value: 400 }),
  E({ id: 'Equip_DemonScythe', name: '魔王の大鎌', slot: 'Weapon', rarity: 'Rare',
    description: '物攻+90 会心+15　闇属性',
    weaponCategory: 'Axe', weaponElement: 'Dark',
    bonusStats: { physicalAttack: 90, criticalRate: 15 }, value: 400 }),
  E({ id: 'Equip_SageScepter', name: '賢者の杖', slot: 'Weapon', rarity: 'Rare',
    description: '魔攻+100 MP+50',
    weaponCategory: 'Staff', weaponElement: 'None',
    bonusStats: { magicAttack: 100, maxMP: 50 }, value: 400 }),
  E({ id: 'Equip_DragonBow', name: '竜骨の弓', slot: 'Weapon', rarity: 'Rare',
    description: '物攻+85 会心+10 速度+10',
    weaponCategory: 'Bow', weaponElement: 'None',
    bonusStats: { physicalAttack: 85, criticalRate: 10, speed: 10 }, value: 380 }),
  E({ id: 'Equip_Lemegeton', name: '禁書レメゲトン', slot: 'Weapon', rarity: 'Rare',
    description: '魔攻+95 MP+55 会心+8　闇属性',
    weaponCategory: 'Tome', weaponElement: 'Dark',
    bonusStats: { magicAttack: 95, maxMP: 55, criticalRate: 8 }, value: 400 }),

  // ═══ WEAPONS — Floor 3: 古代遺跡の回廊 (Rare+) ══════════════════
  E({ id: 'Equip_RuinsKingSword', name: '遺跡王の剣', slot: 'Weapon', rarity: 'Rare',
    description: '物攻+140　光属性',
    weaponCategory: 'Sword', weaponElement: 'Light',
    bonusStats: { physicalAttack: 140 }, value: 580 }),
  E({ id: 'Equip_AncientPoisonFang', name: '古毒の牙刃', slot: 'Weapon', rarity: 'Rare',
    description: '物攻+120 会心+18　攻撃時40%で毒',
    weaponCategory: 'Dagger', weaponElement: 'None', weaponPoison: 0.40,
    bonusStats: { physicalAttack: 120, criticalRate: 18 }, value: 560 }),
  E({ id: 'Equip_AncientScepter', name: '古代の笏', slot: 'Weapon', rarity: 'Rare',
    description: '魔攻+140 MP+60',
    weaponCategory: 'Staff', weaponElement: 'None',
    bonusStats: { magicAttack: 140, maxMP: 60 }, value: 580 }),
  E({ id: 'Equip_StoneSplitBow', name: '石砕の弓', slot: 'Weapon', rarity: 'Rare',
    description: '物攻+125 速度+15 会心+15',
    weaponCategory: 'Bow', weaponElement: 'None',
    bonusStats: { physicalAttack: 125, speed: 15, criticalRate: 15 }, value: 560 }),
  E({ id: 'Equip_PrimordialCodex', name: '原初の写本', slot: 'Weapon', rarity: 'Rare',
    description: '魔攻+135 MP+70 会心+10',
    weaponCategory: 'Tome', weaponElement: 'None',
    bonusStats: { magicAttack: 135, maxMP: 70, criticalRate: 10 }, value: 580 }),

  // ═══ ARMOR — Floor 0 (Common) ═══════════════════════════════════
  E({ id: 'Equip_LeatherArmor', name: '革鎧', slot: 'Armor', rarity: 'Common',
    description: '物防+30',
    armorCategory: 'LightArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 30 }, value: 80 }),
  E({ id: 'Equip_MagicRobe', name: '魔法のローブ', slot: 'Armor', rarity: 'Common',
    description: '魔防+25 MP+20',
    armorCategory: 'Robe', weaponElement: 'None',
    bonusStats: { magicDefense: 25, maxMP: 20 }, value: 85 }),
  E({ id: 'Equip_ChainMail', name: '軽装甲冑', slot: 'Armor', rarity: 'Common',
    description: '物防+20 速度+10',
    armorCategory: 'LightArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 20, speed: 10 }, value: 80 }),

  // ═══ ARMOR — Floor 1 (Uncommon) ═════════════════════════════════
  E({ id: 'Equip_KnightArmor', name: '騎士の鎧', slot: 'Armor', rarity: 'Uncommon',
    description: '物防+70',
    armorCategory: 'HeavyArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 70 }, value: 190 }),
  E({ id: 'Equip_DarkRobe', name: '闇の法衣', slot: 'Armor', rarity: 'Uncommon',
    description: '魔防+60 MP+40',
    armorCategory: 'Robe', weaponElement: 'None',
    bonusStats: { magicDefense: 60, maxMP: 40 }, value: 200 }),
  E({ id: 'Equip_ReinforcedLeather', name: '強化革鎧', slot: 'Armor', rarity: 'Uncommon',
    description: '物防+50 速度+15',
    armorCategory: 'LightArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 50, speed: 15 }, value: 190 }),

  // ═══ ARMOR — Floor 2 (Rare) ═════════════════════════════════════
  E({ id: 'Equip_DragonMail', name: 'ドラゴンメイル', slot: 'Armor', rarity: 'Rare',
    description: '物防+130 HP+50',
    armorCategory: 'HeavyArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 130, maxHP: 50 }, value: 380 }),
  E({ id: 'Equip_AncientRobe', name: '古代の法衣', slot: 'Armor', rarity: 'Rare',
    description: '魔防+120 MP+80',
    armorCategory: 'Robe', weaponElement: 'None',
    bonusStats: { magicDefense: 120, maxMP: 80 }, value: 380 }),
  E({ id: 'Equip_ShadowArmor', name: '影の鎧', slot: 'Armor', rarity: 'Rare',
    description: '物防+100 速度+25',
    armorCategory: 'LightArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 100, speed: 25 }, value: 360 }),

  // ═══ ARMOR — Floor 3 (Rare+) ════════════════════════════════════
  E({ id: 'Equip_AncientKingArmor', name: '古代王の甲冑', slot: 'Armor', rarity: 'Rare',
    description: '物防+170 HP+70',
    armorCategory: 'HeavyArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 170, maxHP: 70 }, value: 620 }),
  E({ id: 'Equip_SealedVestment', name: '封印の法衣', slot: 'Armor', rarity: 'Rare',
    description: '魔防+155 MP+100',
    armorCategory: 'Robe', weaponElement: 'None',
    bonusStats: { magicDefense: 155, maxMP: 100 }, value: 620 }),
  E({ id: 'Equip_RuinsBeastArmor', name: '遺跡の獣甲', slot: 'Armor', rarity: 'Rare',
    description: '物防+145 速度+30',
    armorCategory: 'LightArmor', weaponElement: 'None',
    bonusStats: { physicalDefense: 145, speed: 30 }, value: 600 }),

  // ═══ ACCESSORIES — Floor 0 (Common) ═════════════════════════════
  E({ id: 'Equip_LuckyCharm', name: '幸運の護符', slot: 'Accessory', rarity: 'Common',
    description: '運+15',
    weaponElement: 'None', bonusStats: { luck: 15 }, value: 70 }),
  E({ id: 'Equip_SpeedRing', name: '加速の指輪', slot: 'Accessory', rarity: 'Common',
    description: '速度+20',
    weaponElement: 'None', bonusStats: { speed: 20 }, value: 70 }),
  E({ id: 'Equip_CritGem', name: '会心の石', slot: 'Accessory', rarity: 'Common',
    description: '会心+15',
    weaponElement: 'None', bonusStats: { criticalRate: 15 }, value: 70 }),

  // ═══ ACCESSORIES — Floor 1 (Uncommon) ═══════════════════════════
  E({ id: 'Equip_VitalityBand', name: '活力の腕輪', slot: 'Accessory', rarity: 'Uncommon',
    description: 'HP+50',
    weaponElement: 'None', bonusStats: { maxHP: 50 }, value: 160 }),
  E({ id: 'Equip_MPBand', name: '魔力の腕輪', slot: 'Accessory', rarity: 'Uncommon',
    description: 'MP+30',
    weaponElement: 'None', bonusStats: { maxMP: 30 }, value: 160 }),
  E({ id: 'Equip_WarriorRing', name: '戦士の指輪', slot: 'Accessory', rarity: 'Uncommon',
    description: '物攻+15 物防+15',
    weaponElement: 'None', bonusStats: { physicalAttack: 15, physicalDefense: 15 }, value: 170 }),

  // ═══ ACCESSORIES — Floor 2 (Rare) ═══════════════════════════════
  E({ id: 'Equip_RevivalAmulet', name: '蘇生の護符', slot: 'Accessory', rarity: 'Rare',
    description: 'HP+30 運+10　1戦闘に1度、致死を耐える',
    weaponElement: 'None', bonusStats: { maxHP: 30, luck: 10 }, value: 350,
    passiveText: '致死ダメージを1回無効化する' }),
  E({ id: 'Equip_DragonAmulet', name: '龍心の護符', slot: 'Accessory', rarity: 'Rare',
    description: 'HP+30 速度+10 運+10',
    weaponElement: 'None', bonusStats: { maxHP: 30, speed: 10, luck: 10 }, value: 360 }),
  E({ id: 'Equip_CursedRing', name: '呪いの指輪', slot: 'Accessory', rarity: 'Rare',
    description: '物攻+50 物防-30',
    weaponElement: 'None', bonusStats: { physicalAttack: 50, physicalDefense: -30 }, value: 300,
    passiveText: 'Patk大幅上昇の代わりに防御が下がる' }),

  // ═══ ACCESSORIES — Floor 3 (Rare+) ══════════════════════════════
  E({ id: 'Equip_AncientCoreShard', name: '古代核の欠片', slot: 'Accessory', rarity: 'Rare',
    description: 'HP+60 物攻+20 魔攻+20',
    weaponElement: 'None', bonusStats: { maxHP: 60, physicalAttack: 20, magicAttack: 20 }, value: 560 }),
  E({ id: 'Equip_SoulSeal', name: '封印の魂守', slot: 'Accessory', rarity: 'Rare',
    description: '魔防+40 MP+60 運+20',
    weaponElement: 'None', bonusStats: { magicDefense: 40, maxMP: 60, luck: 20 }, value: 540 }),
  E({ id: 'Equip_AncientPoisonBracelet', name: '古毒の腕輪', slot: 'Accessory', rarity: 'Rare',
    description: '物攻+35 速度+25 会心+25',
    weaponElement: 'None', bonusStats: { physicalAttack: 35, speed: 25, criticalRate: 25 }, value: 550,
    passiveText: '攻撃に古毒の効果が乗ることがある' }),
];

// ── フロア別抽選プール (EquipmentFactory.DrawForFloor) ──────────────────

const WEAPONS_BY_FLOOR = [
  ['Equip_RustedSword', 'Equip_OldAxe', 'Equip_ApprenticeStaff', 'Equip_ShortBow', 'Equip_WornGrimoire'],
  ['Equip_KnightSword', 'Equip_BerserkerAxe', 'Equip_DarkStaff', 'Equip_PoisonBlade', 'Equip_CurseTome'],
  ['Equip_HolySword', 'Equip_DemonScythe', 'Equip_SageScepter', 'Equip_DragonBow', 'Equip_Lemegeton'],
  ['Equip_RuinsKingSword', 'Equip_AncientPoisonFang', 'Equip_AncientScepter', 'Equip_StoneSplitBow', 'Equip_PrimordialCodex'],
];
const ARMORS_BY_FLOOR = [
  ['Equip_LeatherArmor', 'Equip_MagicRobe', 'Equip_ChainMail'],
  ['Equip_KnightArmor', 'Equip_DarkRobe', 'Equip_ReinforcedLeather'],
  ['Equip_DragonMail', 'Equip_AncientRobe', 'Equip_ShadowArmor'],
  ['Equip_AncientKingArmor', 'Equip_SealedVestment', 'Equip_RuinsBeastArmor'],
];
const ACCESSORIES_BY_FLOOR = [
  ['Equip_LuckyCharm', 'Equip_SpeedRing', 'Equip_CritGem'],
  ['Equip_VitalityBand', 'Equip_MPBand', 'Equip_WarriorRing'],
  ['Equip_RevivalAmulet', 'Equip_DragonAmulet', 'Equip_CursedRing'],
  ['Equip_AncientCoreShard', 'Equip_SoulSeal', 'Equip_AncientPoisonBracelet'],
];

const BY_ID = new Map(EQUIPMENT.map((e) => [e.id, e]));

export function getEquipment(id: string): EquipmentDef | undefined {
  return BY_ID.get(id);
}

/** 層ごとの装備を抽選する。usable を渡すと、それを満たす装備だけから選ぶ
 *  (Web版: 宝箱・棺の装備はパーティの誰かが装備できる物だけにする)。
 *  その層に使える物が無ければ下の層 → 装飾品の順に探す */
export function drawEquipmentForFloor(
  floor: number, rng: Rng, slot?: EquipSlot, usable?: (eq: EquipmentDef) => boolean,
): EquipmentDef {
  const f = Math.max(0, Math.min(3, floor));
  const chosen: EquipSlot = slot ?? (() => {
    const v = rng.next();
    return v < 0.40 ? 'Weapon' : v < 0.80 ? 'Armor' : 'Accessory';
  })();
  const poolOf = (s: EquipSlot, fl: number): EquipmentDef[] =>
    (s === 'Weapon' ? WEAPONS_BY_FLOOR : s === 'Armor' ? ARMORS_BY_FLOOR : ACCESSORIES_BY_FLOOR)[fl]
      .map((id) => BY_ID.get(id)!)
      .filter((eq) => !usable || usable(eq));
  let pool = poolOf(chosen, f);
  for (let fl = f - 1; pool.length === 0 && fl >= 0; fl--) pool = poolOf(chosen, fl);
  if (pool.length === 0) pool = poolOf('Accessory', f);
  return pool[rng.int(pool.length)];
}

export const EQUIP_RARITY_LABEL: Record<string, string> = {
  Common: '【普通】', Uncommon: '【珍しい】', Rare: '【希少】',
};

export const EQUIP_RARITY_COLOR: Record<string, string> = {
  Common: '#d8d0e8', Uncommon: '#80e6ff', Rare: '#ffd11a',
};

export const SLOT_LABEL: Record<EquipSlot, string> = {
  Weapon: '武器', Armor: '防具', Accessory: '装飾品',
};