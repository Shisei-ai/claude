using System.Collections;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.UI;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Static helpers that reproduce the treasure-chest and cursed-altar loot flows
    /// from within the NodeField scene (additively loaded over the roguelike scene).
    /// All singleton sub-systems (LootSystem, RelicManager, EndingManager) remain
    /// reachable because the roguelike scene stays loaded.
    /// </summary>
    public static class NodeFieldLoot
    {
        // ── Treasure chest ─────────────────────────────────────────────────
        /// <summary>
        /// Rolls for equipment drop → relic drop → gold fallback,
        /// then opens the node exit. Mirrors RoguelikeManager.ResolveTreasure.
        /// </summary>
        public static IEnumerator ResolveTreasureChest()
        {
            var ctx = NodeFieldContext.Current;
            var run = ctx?.Run;
            if (run == null) { NodeFieldController.Instance?.OpenExit(); yield break; }

            // 35-50% equipment (scales with floor)
            float equipChance = 0.35f + run.CurrentFloor * 0.05f;
            if (Random.value < equipChance)
            {
                EquipmentData equip = null;
                for (int attempt = 0; attempt < 6; attempt++)
                {
                    var candidate = EquipmentFactory.DrawForFloor(run.CurrentFloor);
                    if (candidate != null && run.CanEquip(candidate)) { equip = candidate; break; }
                }
                if (equip != null)
                {
                    run.EquipmentInventory.Add(equip);
                    yield return LootSystem.Instance?.ShowEquipmentObtained(equip);
                    NodeFieldController.Instance?.OpenExit();
                    yield break;
                }
            }

            // Sanity-weighted relic rarity
            float roll = Random.value - run.Sanity * 0.08f;
            var rarity  = roll < 0.15f ? RelicRarity.Rare :
                          roll < 0.45f ? RelicRarity.Uncommon :
                                         RelicRarity.Common;

            if (RelicManager.Instance?.HasTreasureNose() == true)
                rarity = rarity == RelicRarity.Common   ? RelicRarity.Uncommon :
                         rarity == RelicRarity.Uncommon ? RelicRarity.Rare :
                                                          RelicRarity.Rare;

            var relic = LootSystem.Instance?.DrawRelic(rarity, false);
            if (relic != null)
            {
                yield return ObtainRelic(run, relic);
            }
            else
            {
                int gold = Mathf.RoundToInt(Random.Range(60f, 120f) * (1f + run.Sanity * 0.05f));
                run.EarnGold(gold);
            }

            NodeFieldController.Instance?.OpenExit();
        }

        // ── Cursed altar ───────────────────────────────────────────────────
        /// <summary>
        /// Deals 15% MaxHP damage, awards a Rare relic (Boss rarity with RiskRewardMaster),
        /// checks for death, then opens the node exit.
        /// Mirrors RoguelikeManager.ResolveCursedRoom.
        /// </summary>
        public static IEnumerator ResolveCursedAltar()
        {
            var ctx = NodeFieldContext.Current;
            var run = ctx?.Run;
            if (run == null) { NodeFieldController.Instance?.OpenExit(); yield break; }

            int damage = Mathf.RoundToInt(run.MaxHP * 0.15f);
            run.TakeDamage(damage);

            var rarity = run.HasRelic(RelicEffectType.RiskRewardMaster)
                ? RelicRarity.Boss : RelicRarity.Rare;

            var relic = LootSystem.Instance?.DrawRelic(rarity, false);
            if (relic != null)
            {
                if (relic.AttachedCurse != null) run.AddCurse(relic.AttachedCurse);
                yield return ObtainRelic(run, relic);
            }

            // Death check — signal defeat so RoguelikeManager can show death screen
            if (!run.IsAlive)
            {
                ctx.CompleteNode(new NodeResult { WasVictory = false });
                yield break;
            }

            NodeFieldController.Instance?.OpenExit();
        }

        // ── Shared relic acquisition (with ending-path premonition) ────────
        static IEnumerator ObtainRelic(RunData run, RelicData relic)
        {
            if (relic == null) yield break;
            bool endingWasUnset = run.ActiveEnding == EndingType.None;
            run.AddRelic(relic);
            yield return LootSystem.Instance?.ShowRelicObtained(relic);
            if (endingWasUnset && run.ActiveEnding != EndingType.None)
                yield return EndingManager.Instance?.ShowPremonition(run.ActiveEnding);
        }
    }
}
