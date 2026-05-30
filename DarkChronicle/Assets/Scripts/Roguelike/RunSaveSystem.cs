using System;
using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.Roguelike.Map;

namespace DarkChronicle.Roguelike
{
    [Serializable]
    public class RunSaveDTO
    {
        // Identity
        public string CharacterName;
        public int    Seed;
        public long   StartTimeTicks;
        public string ActiveEnding;

        // Progress
        public int  CurrentFloor;
        public int  CurrentNodeIndex;
        public int  TotalRoomsCleared;

        // Resources
        public int  CurrentHP;
        public int  MaxHP;
        public int  Gold;
        public int  Sanity;

        // Level
        public int  CharacterLevel;
        public int  CurrentEXP;
        public int  JobLevel;
        public int  CurrentJobJP;
        public int  TotalExpGained;
        public int  TotalJPGained;

        // Statistics
        public int  DamageDealt;
        public int  EnemiesKilled;
        public int  GoldEarned;
        public int  RelicsFound;
        public int  EventsVisited;

        // Assets by ScriptableObject name
        public string[] DeckNames;
        public string[] RelicNames;
        public string[] InventoryNames;
        public string[] CurseEffectNames;
        public string[] UnlockedSkillNames;

        // Equipment
        public string   EquippedWeaponName;
        public string   EquippedArmorName;
        public string   EquippedAccessoryName;
        public string[] EquipmentInventoryNames;

        // Map state
        public int   CurrentNodeID    = -1;
        public int[] VisitedNodeIDs;
        public int[] AvailableNodeIDs;
    }

    public static class RunSaveSystem
    {
        const string SaveKey = "DarkChronicle_RunSave_v1";

        public static void Save(RunData run, MapData mapData, int currentNodeID)
        {
            var dto = new RunSaveDTO
            {
                CharacterName     = run.SelectedCharacter?.name ?? string.Empty,
                Seed              = run.Seed,
                StartTimeTicks    = run.StartTime.Ticks,
                ActiveEnding      = run.ActiveEnding.ToString(),
                CurrentFloor      = run.CurrentFloor,
                CurrentNodeIndex  = run.CurrentNodeIndex,
                TotalRoomsCleared = run.TotalRoomsCleared,
                CurrentHP         = run.CurrentHP,
                MaxHP             = run.MaxHP,
                Gold              = run.Gold,
                Sanity            = run.Sanity,
                CharacterLevel    = run.CharacterLevel,
                CurrentEXP        = run.CurrentEXP,
                JobLevel          = run.JobLevel,
                CurrentJobJP      = run.CurrentJobJP,
                TotalExpGained    = run.TotalExpGained,
                TotalJPGained     = run.TotalJPGained,
                DamageDealt       = run.DamageDealt,
                EnemiesKilled     = run.EnemiesKilled,
                GoldEarned        = run.GoldEarned,
                RelicsFound       = run.RelicsFound,
                EventsVisited     = run.EventsVisited,
                DeckNames              = run.Deck.ConvertAll(s => s.name).ToArray(),
                RelicNames             = run.Relics.ConvertAll(r => r.name).ToArray(),
                InventoryNames         = run.Inventory.ConvertAll(i => i.name).ToArray(),
                CurseEffectNames       = run.Curses.ConvertAll(c => c.Effect.ToString()).ToArray(),
                UnlockedSkillNames     = run.UnlockedSkillNames.ToArray(),
                EquippedWeaponName     = run.EquippedWeapon?.name    ?? string.Empty,
                EquippedArmorName      = run.EquippedArmor?.name     ?? string.Empty,
                EquippedAccessoryName  = run.EquippedAccessory?.name ?? string.Empty,
                EquipmentInventoryNames = run.EquipmentInventory.ConvertAll(e => e.name).ToArray(),
                CurrentNodeID     = currentNodeID,
                VisitedNodeIDs    = mapData?.Nodes.FindAll(n => n.Visited).ConvertAll(n => n.ID).ToArray()
                                    ?? new int[0],
                AvailableNodeIDs  = mapData?.Nodes.FindAll(n => n.Available).ConvertAll(n => n.ID).ToArray()
                                    ?? new int[0],
            };

            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(dto));
            PlayerPrefs.Save();
        }

        public static RunSaveDTO LoadDTO()
        {
            string json = PlayerPrefs.GetString(SaveKey, string.Empty);
            if (string.IsNullOrEmpty(json)) return null;
            try   { return JsonUtility.FromJson<RunSaveDTO>(json); }
            catch { return null; }
        }

        public static bool HasSave() => PlayerPrefs.HasKey(SaveKey);

        public static void DeleteSave()
        {
            PlayerPrefs.DeleteKey(SaveKey);
            PlayerPrefs.Save();
        }

        public static RunData RestoreRunData(RunSaveDTO dto, AssetRegistry registry)
        {
            var run = new RunData
            {
                SelectedCharacter = registry.FindCharacter(dto.CharacterName),
                Seed              = dto.Seed,
                StartTime         = new DateTime(dto.StartTimeTicks),
                CurrentFloor      = dto.CurrentFloor,
                CurrentNodeIndex  = dto.CurrentNodeIndex,
                TotalRoomsCleared = dto.TotalRoomsCleared,
                CurrentHP         = dto.CurrentHP,
                MaxHP             = dto.MaxHP,
                Gold              = dto.Gold,
                Sanity            = dto.Sanity,
                CharacterLevel    = dto.CharacterLevel,
                CurrentEXP        = dto.CurrentEXP,
                JobLevel          = dto.JobLevel,
                CurrentJobJP      = dto.CurrentJobJP,
                TotalExpGained    = dto.TotalExpGained,
                TotalJPGained     = dto.TotalJPGained,
                DamageDealt       = dto.DamageDealt,
                EnemiesKilled     = dto.EnemiesKilled,
                GoldEarned        = dto.GoldEarned,
                RelicsFound       = dto.RelicsFound,
                EventsVisited     = dto.EventsVisited,
                IsRunActive       = true,
            };

            if (Enum.TryParse<EndingType>(dto.ActiveEnding, out var ending))
                run.ActiveEnding = ending;

            if (dto.DeckNames != null)
                foreach (var n in dto.DeckNames)
                { var s = registry.FindSkill(n); if (s != null) run.Deck.Add(s); }

            if (dto.RelicNames != null)
                foreach (var n in dto.RelicNames)
                { var r = registry.FindRelic(n); if (r != null) run.Relics.Add(r); }

            if (dto.InventoryNames != null)
                foreach (var n in dto.InventoryNames)
                { var item = registry.FindItem(n); if (item != null) run.Inventory.Add(item); }

            if (dto.CurseEffectNames != null)
                foreach (var n in dto.CurseEffectNames)
                    if (Enum.TryParse<CurseEffectType>(n, out var effect))
                        run.Curses.Add(RoguelikeManager.BuildCurse(effect));

            if (dto.UnlockedSkillNames != null)
                run.UnlockedSkillNames = new List<string>(dto.UnlockedSkillNames);

            if (!string.IsNullOrEmpty(dto.EquippedWeaponName))
                run.EquippedWeapon    = registry.FindEquipment(dto.EquippedWeaponName);
            if (!string.IsNullOrEmpty(dto.EquippedArmorName))
                run.EquippedArmor     = registry.FindEquipment(dto.EquippedArmorName);
            if (!string.IsNullOrEmpty(dto.EquippedAccessoryName))
                run.EquippedAccessory = registry.FindEquipment(dto.EquippedAccessoryName);

            if (dto.EquipmentInventoryNames != null)
                foreach (var n in dto.EquipmentInventoryNames)
                { var e = registry.FindEquipment(n); if (e != null) run.EquipmentInventory.Add(e); }

            return run;
        }
    }
}
