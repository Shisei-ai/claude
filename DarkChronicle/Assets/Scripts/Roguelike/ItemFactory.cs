using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Runtime factory for consumable items. All items have a deterministic
    /// ScriptableObject.name so save/load can resolve them via AssetRegistry.FindItem.
    /// </summary>
    public static class ItemFactory
    {
        static readonly Dictionary<string, ItemData> _cache = new();

        public static ItemData Get(string id)
        {
            if (_cache.TryGetValue(id, out var cached)) return cached;
            return null;
        }

        public static List<ItemData> CreateConsumables()
        {
            return new List<ItemData>
            {
                Make("Item_HealthPotion",    "回復薬",      "HPを150回復する。",                   healHP: 150, value: 80),
                Make("Item_GreatHealthPotion","大回復薬",   "HPを400回復する。",                   healHP: 400, value: 200),
                Make("Item_MaxHealthPotion", "全回復薬",    "HPを全回復する。",                    healHP: 9999, value: 500),
                Make("Item_Ether",           "エーテル",    "MPを30回復する。",                    healMP: 30, value: 120),
                Make("Item_GreatEther",      "大エーテル",  "MPを80回復する。",                    healMP: 80, value: 280),
                Make("Item_Antidote",        "解毒剤",      "毒を治療する。",
                    cureStatus: new StatusEffect { Type = StatusEffectType.Poison }, value: 50),
                Make("Item_HemoStatic",      "止血剤",      "出血を治療する。",
                    cureStatus: new StatusEffect { Type = StatusEffectType.Bleed }, value: 50),
                Make("Item_BurnSalve",       "火傷薬",      "炎上を治療する。",
                    cureStatus: new StatusEffect { Type = StatusEffectType.Burn }, value: 50),
                Make("Item_Panacea",         "万能薬",      "すべての状態異常を治療する。",
                    cureAll: true, value: 300),
                Make("Item_Stimulant",       "覚醒薬",      "睡眠・麻痺を治療し、HPを50回復する。",
                    cureStatus: new StatusEffect { Type = StatusEffectType.Sleep },
                    healHP: 50, value: 150),
                Make("Item_ParalysisAntidote","麻痺解毒",   "麻痺を治療する。",
                    cureStatus: new StatusEffect { Type = StatusEffectType.Paralysis }, value: 60),
                Make("Item_RevivalPotion",   "蘇生薬",      "KO状態の味方をHP25%で復活させる。",
                    revive: true, reviveHP: 25, value: 400),
                Make("Item_FullRevival",     "完全蘇生薬",  "KO状態の味方をHP全回復で復活させる。",
                    revive: true, reviveHP: 100, value: 900),
                Make("Item_PoisonNeedle",    "毒針",        "敵に毒を付与する。",
                    applyStatus: new StatusEffect { Type = StatusEffectType.Poison, Duration = 3, Value = 0.05f },
                    value: 60),
                Make("Item_SleepPowder",     "眠り粉",      "敵に睡眠を付与する。",
                    applyStatus: new StatusEffect { Type = StatusEffectType.Sleep, Duration = 2, Value = 0f },
                    value: 80),
                Make("Item_ParalysisStone",  "麻痺石",      "敵に麻痺を付与する。",
                    applyStatus: new StatusEffect { Type = StatusEffectType.Paralysis, Duration = 2, Value = 0f },
                    value: 80),
            };
        }

        static ItemData Make(string id, string displayName, string desc,
                             int healHP = 0, int healMP = 0,
                             bool revive = false, int reviveHP = 50,
                             StatusEffect cureStatus = null, bool cureAll = false,
                             StatusEffect applyStatus = null,
                             int value = 100)
        {
            if (_cache.TryGetValue(id, out var existing)) return existing;

            var item            = ScriptableObject.CreateInstance<ItemData>();
            item.name           = id;
            item.ItemName       = displayName;
            item.Description    = desc;
            item.Type           = ItemType.Consumable;
            item.Value          = value;
            item.HealHP         = healHP;
            item.HealMP         = healMP;
            item.ReviveTarget   = revive;
            item.ReviveHPPercent = reviveHP;
            item.CureStatus     = cureStatus;
            item.CureAllStatus  = cureAll;
            item.ApplyStatus    = applyStatus;

            _cache[id] = item;
            return item;
        }
    }
}
