using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Runtime factory for all equipment.
    /// Deterministic ScriptableObject.name IDs for save/load compat via AssetRegistry.FindEquipment.
    /// </summary>
    public static class EquipmentFactory
    {
        static readonly Dictionary<string, EquipmentData> _cache = new();
        static bool _built;

        // ── Per-floor draw pools ───────────────────────────────────────────
        static readonly string[][] WeaponsByFloor =
        {
            new[] { "Equip_RustedSword",     "Equip_OldAxe",           "Equip_ApprenticeStaff",  "Equip_ShortBow"            },
            new[] { "Equip_KnightSword",     "Equip_BerserkerAxe",     "Equip_DarkStaff",         "Equip_PoisonBlade"         },
            new[] { "Equip_HolySword",       "Equip_DemonScythe",      "Equip_SageScepter",       "Equip_DragonBow"           },
            new[] { "Equip_RuinsKingSword",  "Equip_AncientPoisonFang","Equip_AncientScepter",    "Equip_StoneSplitBow"       },
        };
        static readonly string[][] ArmorsByFloor =
        {
            new[] { "Equip_LeatherArmor",    "Equip_MagicRobe",        "Equip_ChainMail"           },
            new[] { "Equip_KnightArmor",     "Equip_DarkRobe",         "Equip_ReinforcedLeather"   },
            new[] { "Equip_DragonMail",      "Equip_AncientRobe",      "Equip_ShadowArmor"         },
            new[] { "Equip_AncientKingArmor","Equip_SealedVestment",   "Equip_RuinsBeastArmor"     },
        };
        static readonly string[][] AccessoriesByFloor =
        {
            new[] { "Equip_LuckyCharm",      "Equip_SpeedRing",        "Equip_CritGem"             },
            new[] { "Equip_VitalityBand",    "Equip_MPBand",            "Equip_WarriorRing"         },
            new[] { "Equip_RevivalAmulet",   "Equip_DragonAmulet",     "Equip_CursedRing"          },
            new[] { "Equip_AncientCoreShard","Equip_SoulSeal",          "Equip_AncientPoisonBracelet"},
        };

        public static EquipmentData Get(string id)
        {
            EnsureBuilt();
            _cache.TryGetValue(id, out var e);
            return e;
        }

        public static EquipmentData DrawForFloor(int floor, EquipSlot? slot = null)
        {
            EnsureBuilt();
            floor = Mathf.Clamp(floor, 0, 3);

            EquipSlot chosen = slot ?? (Random.value switch
            {
                float v when v < 0.40f => EquipSlot.Weapon,
                float v when v < 0.80f => EquipSlot.Armor,
                _                      => EquipSlot.Accessory,
            });

            string[] pool = chosen switch
            {
                EquipSlot.Weapon    => WeaponsByFloor[floor],
                EquipSlot.Armor     => ArmorsByFloor[floor],
                _                   => AccessoriesByFloor[floor],
            };
            return Get(pool[Random.Range(0, pool.Length)]);
        }

        static void EnsureBuilt() { if (!_built) { BuildAll(); _built = true; } }

        // ── Factory helpers ────────────────────────────────────────────────
        static EquipmentData Add(EquipmentData e) { _cache[e.name] = e; return e; }

        static EquipmentData Weapon(string id, string displayName, string desc,
                                    CharacterStats bonus, EquipmentRarity rarity,
                                    WeaponType cat, ElementType element, int value)
        {
            var e            = ScriptableObject.CreateInstance<EquipmentData>();
            e.name           = id;
            e.EquipName      = displayName;
            e.Description    = desc;
            e.Slot           = EquipSlot.Weapon;
            e.Rarity         = rarity;
            e.WeaponCategory = cat;
            e.WeaponElement  = element;
            e.BonusStats     = bonus;
            e.Value          = value;
            return Add(e);
        }

        static EquipmentData Armor(string id, string displayName, string desc,
                                   CharacterStats bonus, EquipmentRarity rarity,
                                   ArmorType cat, int value)
        {
            var e           = ScriptableObject.CreateInstance<EquipmentData>();
            e.name          = id;
            e.EquipName     = displayName;
            e.Description   = desc;
            e.Slot          = EquipSlot.Armor;
            e.Rarity        = rarity;
            e.ArmorCategory = cat;
            e.BonusStats    = bonus;
            e.Value         = value;
            return Add(e);
        }

        static EquipmentData Accessory(string id, string displayName, string desc,
                                        CharacterStats bonus, EquipmentRarity rarity,
                                        int value, string passive = "")
        {
            var e           = ScriptableObject.CreateInstance<EquipmentData>();
            e.name          = id;
            e.EquipName     = displayName;
            e.Description   = desc;
            e.Slot          = EquipSlot.Accessory;
            e.Rarity        = rarity;
            e.BonusStats    = bonus;
            e.Value         = value;
            e.PassiveText   = passive;
            return Add(e);
        }

        static CharacterStats Stats(int hp = 0, int mp = 0, int patk = 0, int matk = 0,
                                     int pdef = 0, int mdef = 0, int spd = 0,
                                     int luck = 0, int crit = 0)
            => new CharacterStats
            {
                MaxHP            = hp,   MaxMP           = mp,
                PhysicalAttack   = patk, MagicAttack     = matk,
                PhysicalDefense  = pdef, MagicDefense    = mdef,
                Speed            = spd,  Luck            = luck,
                CriticalRate     = crit,
            };

        // ── Item Definitions ───────────────────────────────────────────────
        static void BuildAll()
        {
            // ═══ WEAPONS — Floor 0: 廃墟 (Common) ═══════════════════════════
            Weapon("Equip_RustedSword",     "錆びた剣",
                "古びているが使える剣。Patk+25。",
                Stats(patk: 25), EquipmentRarity.Common, WeaponType.Sword, ElementType.None, 90);

            Weapon("Equip_OldAxe",          "古い斧",
                "重みで敵を怯ませる。Patk+30、会心+5。",
                Stats(patk: 30, crit: 5), EquipmentRarity.Common, WeaponType.Axe, ElementType.None, 100);

            Weapon("Equip_ApprenticeStaff", "見習いの杖",
                "魔法学校の入門用。Matk+20、MP+10。",
                Stats(mp: 10, matk: 20), EquipmentRarity.Common, WeaponType.Staff, ElementType.None, 90);

            Weapon("Equip_ShortBow",        "短弓",
                "素早い一射。Patk+20、速度+5。",
                Stats(patk: 20, spd: 5), EquipmentRarity.Common, WeaponType.Bow, ElementType.None, 90);

            // ═══ WEAPONS — Floor 1: 暗黒の森 (Uncommon) ════════════════════
            Weapon("Equip_KnightSword",     "騎士の剣",
                "王国騎士団の制式武器。Patk+55。",
                Stats(patk: 55), EquipmentRarity.Uncommon, WeaponType.Sword, ElementType.None, 200);

            Weapon("Equip_BerserkerAxe",    "戦鬼の斧",
                "一撃必殺を狙う蛮族の斧。Patk+70、会心+8。",
                Stats(patk: 70, crit: 8), EquipmentRarity.Uncommon, WeaponType.Axe, ElementType.None, 220);

            Weapon("Equip_DarkStaff",       "闇の杖",
                "闇の力を宿す杖。Matk+60、MP+20。",
                Stats(mp: 20, matk: 60), EquipmentRarity.Uncommon, WeaponType.Staff, ElementType.Dark, 210);

            Weapon("Equip_PoisonBlade",     "毒刃",
                "塗られた毒が蝕む。Patk+45、速度+10。",
                Stats(patk: 45, spd: 10), EquipmentRarity.Uncommon, WeaponType.Dagger, ElementType.Poison, 190);

            // ═══ WEAPONS — Floor 2: 呪われた城 (Rare) ═══════════════════════
            Weapon("Equip_HolySword",       "聖剣フォルセティ",
                "不死を滅する聖なる輝き。Patk+100、光属性。",
                Stats(patk: 100), EquipmentRarity.Rare, WeaponType.Sword, ElementType.Light, 400);

            Weapon("Equip_DemonScythe",     "魔王の大鎌",
                "闇の王が振るいし刃。Patk+90、会心+15、闇属性。",
                Stats(patk: 90, crit: 15), EquipmentRarity.Rare, WeaponType.Axe, ElementType.Dark, 400);

            Weapon("Equip_SageScepter",     "賢者の杖",
                "失われた賢者の叡智。Matk+100、MP+50。",
                Stats(mp: 50, matk: 100), EquipmentRarity.Rare, WeaponType.Staff, ElementType.None, 400);

            Weapon("Equip_DragonBow",       "竜骨の弓",
                "竜の骨で作られた弓。Patk+85、会心+10、速度+10。",
                Stats(patk: 85, spd: 10, crit: 10), EquipmentRarity.Rare, WeaponType.Bow, ElementType.None, 380);

            // ═══ ARMOR — Floor 0: 廃墟 (Common) ════════════════════════════
            Armor("Equip_LeatherArmor",     "革鎧",
                "軽くて動きやすい。Pdef+30。",
                Stats(pdef: 30), EquipmentRarity.Common, ArmorType.LightArmor, 80);

            Armor("Equip_MagicRobe",        "魔法のローブ",
                "魔力を通しやすい。Mdef+25、MP+20。",
                Stats(mp: 20, mdef: 25), EquipmentRarity.Common, ArmorType.Robe, 85);

            Armor("Equip_ChainMail",        "軽装甲冑",
                "守りと機動を両立。Pdef+20、速度+10。",
                Stats(pdef: 20, spd: 10), EquipmentRarity.Common, ArmorType.LightArmor, 80);

            // ═══ ARMOR — Floor 1: 暗黒の森 (Uncommon) ══════════════════════
            Armor("Equip_KnightArmor",      "騎士の鎧",
                "重厚な騎士団の甲冑。Pdef+70。",
                Stats(pdef: 70), EquipmentRarity.Uncommon, ArmorType.HeavyArmor, 190);

            Armor("Equip_DarkRobe",         "闇の法衣",
                "闇に溶け込む漆黒の衣。Mdef+60、MP+40。",
                Stats(mp: 40, mdef: 60), EquipmentRarity.Uncommon, ArmorType.Robe, 200);

            Armor("Equip_ReinforcedLeather","強化革鎧",
                "金具で強化した革鎧。Pdef+50、速度+15。",
                Stats(pdef: 50, spd: 15), EquipmentRarity.Uncommon, ArmorType.LightArmor, 190);

            // ═══ ARMOR — Floor 2: 呪われた城 (Rare) ═════════════════════════
            Armor("Equip_DragonMail",       "ドラゴンメイル",
                "竜鱗を素材とした最高の鎧。Pdef+130、HP+50。",
                Stats(hp: 50, pdef: 130), EquipmentRarity.Rare, ArmorType.HeavyArmor, 380);

            Armor("Equip_AncientRobe",      "古代の法衣",
                "神代の術者が纏った衣。Mdef+120、MP+80。",
                Stats(mp: 80, mdef: 120), EquipmentRarity.Rare, ArmorType.Robe, 380);

            Armor("Equip_ShadowArmor",      "影の鎧",
                "影を纏い姿を隠す。Pdef+100、速度+25。",
                Stats(pdef: 100, spd: 25), EquipmentRarity.Rare, ArmorType.LightArmor, 360);

            // ═══ ACCESSORIES — Floor 0: 廃墟 (Common) ═══════════════════════
            Accessory("Equip_LuckyCharm",   "幸運の護符",
                "幸運を引き寄せる。運+15。",
                Stats(luck: 15), EquipmentRarity.Common, 70);

            Accessory("Equip_SpeedRing",    "加速の指輪",
                "動作を軽くする指輪。速度+20。",
                Stats(spd: 20), EquipmentRarity.Common, 70);

            Accessory("Equip_CritGem",      "会心の石",
                "急所への感覚が鋭くなる。会心+15。",
                Stats(crit: 15), EquipmentRarity.Common, 70);

            // ═══ ACCESSORIES — Floor 1: 暗黒の森 (Uncommon) ═════════════════
            Accessory("Equip_VitalityBand", "活力の腕輪",
                "生命力を高める腕輪。HP+50。",
                Stats(hp: 50), EquipmentRarity.Uncommon, 160);

            Accessory("Equip_MPBand",       "魔力の腕輪",
                "魔力を蓄える腕輪。MP+30。",
                Stats(mp: 30), EquipmentRarity.Uncommon, 160);

            Accessory("Equip_WarriorRing",  "戦士の指輪",
                "攻守を高める武人の証。Patk+15、Pdef+15。",
                Stats(patk: 15, pdef: 15), EquipmentRarity.Uncommon, 170);

            // ═══ ACCESSORIES — Floor 2: 呪われた城 (Rare) ════════════════════
            Accessory("Equip_RevivalAmulet","蘇生の護符",
                "死の淵から引き戻す。HP+30、運+10。[1度だけ致死ダメージを無効]",
                Stats(hp: 30, luck: 10), EquipmentRarity.Rare, 350,
                passive: "致死ダメージを1回無効化する");

            Accessory("Equip_DragonAmulet", "龍心の護符",
                "竜の心臓を模した護符。HP+30、速度+10、運+10。",
                Stats(hp: 30, spd: 10, luck: 10), EquipmentRarity.Rare, 360);

            Accessory("Equip_CursedRing",   "呪いの指輪",
                "力と引き換えに身を蝕む。Patk+50、Pdef-30。",
                Stats(patk: 50, pdef: -30), EquipmentRarity.Rare, 300,
                passive: "Patk大幅上昇の代わりに防御が下がる");

            // ═══ WEAPONS — Floor 3: 古代遺跡の回廊 (Rare+) ══════════════════
            Weapon("Equip_RuinsKingSword",    "遺跡王の剣",
                "古代王の権威を宿す聖剣。Patk+140、光属性。",
                Stats(patk: 140), EquipmentRarity.Rare, WeaponType.Sword, ElementType.Light, 580);

            Weapon("Equip_AncientPoisonFang", "古毒の牙刃",
                "太古の猛毒を封じた刃。Patk+120、会心+18、毒属性。",
                Stats(patk: 120, crit: 18), EquipmentRarity.Rare, WeaponType.Dagger, ElementType.Poison, 560);

            Weapon("Equip_AncientScepter",    "古代の笏",
                "封印の力を解放する杖。Matk+140、MP+60。",
                Stats(mp: 60, matk: 140), EquipmentRarity.Rare, WeaponType.Staff, ElementType.None, 580);

            Weapon("Equip_StoneSplitBow",     "石砕の弓",
                "石兵の骨格で作られた弓。Patk+125、速度+15、会心+15。",
                Stats(patk: 125, spd: 15, crit: 15), EquipmentRarity.Rare, WeaponType.Bow, ElementType.None, 560);

            // ═══ ARMOR — Floor 3: 古代遺跡の回廊 (Rare+) ═══════════════════
            Armor("Equip_AncientKingArmor",   "古代王の甲冑",
                "遺跡に眠る王の最後の鎧。Pdef+170、HP+70。",
                Stats(hp: 70, pdef: 170), EquipmentRarity.Rare, ArmorType.HeavyArmor, 620);

            Armor("Equip_SealedVestment",     "封印の法衣",
                "古代術者が身を守るために封じた法衣。Mdef+155、MP+100。",
                Stats(mp: 100, mdef: 155), EquipmentRarity.Rare, ArmorType.Robe, 620);

            Armor("Equip_RuinsBeastArmor",    "遺跡の獣甲",
                "遺跡の巨獣から剥いだ甲殻。Pdef+145、速度+30。",
                Stats(pdef: 145, spd: 30), EquipmentRarity.Rare, ArmorType.LightArmor, 600);

            // ═══ ACCESSORIES — Floor 3: 古代遺跡の回廊 (Rare+) ══════════════
            Accessory("Equip_AncientCoreShard", "古代核の欠片",
                "遺跡の核から砕けた欠片。HP+60、Patk+20、Matk+20。",
                Stats(hp: 60, patk: 20, matk: 20), EquipmentRarity.Rare, 560);

            Accessory("Equip_SoulSeal",         "封印の魂守",
                "亡霊を封じる護符。Mdef+40、MP+60、運+20。",
                Stats(mdef: 40, mp: 60, luck: 20), EquipmentRarity.Rare, 540);

            Accessory("Equip_AncientPoisonBracelet", "古毒の腕輪",
                "太古の毒を蓄える腕輪。Patk+35、速度+25、会心+25。",
                Stats(patk: 35, spd: 25, crit: 25), EquipmentRarity.Rare, 550,
                passive: "攻撃に古毒の効果が乗ることがある");
        }
    }
}
