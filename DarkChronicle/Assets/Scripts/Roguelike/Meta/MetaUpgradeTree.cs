using System.Linq;
using UnityEngine;
using DarkChronicle.Roguelike;

namespace DarkChronicle.Roguelike.Meta
{
    // ── Bonus Types ───────────────────────────────────────────────────────────
    public enum MetaUpgradeBonusType
    {
        MaxHPPercent,           // MetaMaxHPMult += value
        PhysAtkPercent,         // MetaPhysAtkMult += value
        MagAtkPercent,          // MetaMagAtkMult += value
        PhysDefPercent,         // MetaPhysDefMult += value
        MagDefPercent,          // MetaMagDefMult += value
        CritRateFlat,           // MetaCritRateBonus += (int)value
        MaxMPFlat,              // MetaMaxMPBonus += (int)value
        StartingGold,           // MetaExtraStartGold += (int)value
        ShopDiscount,           // MetaShopDiscount += value (capped at 0.40)
        ExtraRelicChoices,      // MetaExtraRelicChoices += (int)value
        StartBP,                // MetaStartBP += (int)value
        FloorClearExtraHeal,    // MetaFloorClearExtraHeal = true
        StartWithCommonRelic,   // MetaStartWithCommonRelic = true
        CurseDmgReduction,      // MetaCurseDmgReduction += value (capped at 0.80)
        CurseHPReductionImmune, // MetaCurseHPReductionImmune = true
    }

    // ── Single bonus entry ────────────────────────────────────────────────────
    [System.Serializable]
    public struct MetaUpgradeBonus
    {
        public MetaUpgradeBonusType Type;
        public float                Value;

        public MetaUpgradeBonus(MetaUpgradeBonusType type, float value)
        {
            Type  = type;
            Value = value;
        }
    }

    // ── Node definition ───────────────────────────────────────────────────────
    public class MetaUpgradeNode
    {
        public string              ID;
        public string              PathName;        // パス名（UIグルーピング用）
        public string              DisplayName;
        public string              Description;
        public int                 EpitaphCost;
        public string[]            RequiredNodeIDs; // 前提ノードID（空=制限なし）
        public MetaUpgradeBonus[]  Bonuses;
        public bool                IsFinalNode;     // ★ 最終ノードマーカー

        public MetaUpgradeNode(string id, string path, string name, string desc,
                               int cost, string[] required, bool isFinal,
                               params MetaUpgradeBonus[] bonuses)
        {
            ID              = id;
            PathName        = path;
            DisplayName     = name;
            Description     = desc;
            EpitaphCost     = cost;
            RequiredNodeIDs = required ?? new string[0];
            IsFinalNode     = isFinal;
            Bonuses         = bonuses;
        }
    }

    // ── Tree ──────────────────────────────────────────────────────────────────
    /// <summary>
    /// ラン間で引き継がれるメタ強化ツリー。
    /// 全5パス × 各5ノード = 計25ノード。
    /// 碑文（ヒトブン）を消費してノードを解放する。
    /// </summary>
    public static class MetaUpgradeTree
    {
        static string NodeKey(string id) => $"MetaNode_{id}";

        // ── ノード定義 ─────────────────────────────────────────────────────────
        public static readonly MetaUpgradeNode[] AllNodes =
        {
            // ════════════════════════════════════════════════════════════════
            // PATH 1 : 鉄の意志  (Iron Will — HP/Defense)
            // ════════════════════════════════════════════════════════════════
            new("iron_1", "鉄の意志", "強靭な体",
                "最大HPが5%増加する。",
                cost: 5, required: null, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MaxHPPercent, 0.05f)),

            new("iron_2", "鉄の意志", "護りの盾",
                "物理防御が8%増加する。",
                cost: 10, required: new[]{"iron_1"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.PhysDefPercent, 0.08f)),

            new("iron_3", "鉄の意志", "不屈の肉体",
                "最大HPがさらに10%増加する。",
                cost: 15, required: new[]{"iron_2"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MaxHPPercent, 0.10f)),

            new("iron_4", "鉄の意志", "回復の章",
                "フロアクリア時に最大HPの5%を追加回復する。",
                cost: 20, required: new[]{"iron_3"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.FloorClearExtraHeal, 1f)),

            new("iron_5", "鉄の意志", "★ 鋼鉄の城",
                "最大HPが15%増加し、魔法防御も8%増加する。",
                cost: 30, required: new[]{"iron_4"}, isFinal: true,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MaxHPPercent, 0.15f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.MagDefPercent, 0.08f)),

            // ════════════════════════════════════════════════════════════════
            // PATH 2 : 刃の覚醒  (Blade Awakening — Attack/Combat)
            // ════════════════════════════════════════════════════════════════
            new("blade_1", "刃の覚醒", "鋭き刃",
                "物理攻撃が5%増加する。",
                cost: 5, required: null, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.PhysAtkPercent, 0.05f)),

            new("blade_2", "刃の覚醒", "急所の眼",
                "会心率が5ポイント増加する。",
                cost: 10, required: new[]{"blade_1"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.CritRateFlat, 5f)),

            new("blade_3", "刃の覚醒", "魔力の刃",
                "魔法攻撃が5%増加する。",
                cost: 15, required: new[]{"blade_2"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MagAtkPercent, 0.05f)),

            new("blade_4", "刃の覚醒", "闘志",
                "バトル開始時にBPを1つ獲得する。",
                cost: 20, required: new[]{"blade_3"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.StartBP, 1f)),

            new("blade_5", "刃の覚醒", "★ 覇王の一撃",
                "物理・魔法攻撃が10%増加し、会心率がさらに5ポイント増加する。",
                cost: 30, required: new[]{"blade_4"}, isFinal: true,
                new MetaUpgradeBonus(MetaUpgradeBonusType.PhysAtkPercent, 0.10f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.MagAtkPercent,  0.10f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.CritRateFlat,   5f)),

            // ════════════════════════════════════════════════════════════════
            // PATH 3 : 幸運の星  (Lucky Star — Economy/Gold)
            // ════════════════════════════════════════════════════════════════
            new("luck_1", "幸運の星", "行商の知恵",
                "ランスタート時のゴールドが30増加する。",
                cost: 5, required: null, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.StartingGold, 30f)),

            new("luck_2", "幸運の星", "交渉術",
                "ショップの全品価格が10%低下する。",
                cost: 10, required: new[]{"luck_1"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.ShopDiscount, 0.10f)),

            new("luck_3", "幸運の星", "商才",
                "ランスタート時のゴールドがさらに50増加する。",
                cost: 15, required: new[]{"luck_2"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.StartingGold, 50f)),

            new("luck_4", "幸運の星", "鑑定眼",
                "戦闘勝利後のレリック選択肢が1つ増える。",
                cost: 20, required: new[]{"luck_3"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.ExtraRelicChoices, 1f)),

            new("luck_5", "幸運の星", "★ 運命の寵児",
                "ランスタート時のゴールドが100増加し、コモンレリックを1つ携えてランを始める。",
                cost: 30, required: new[]{"luck_4"}, isFinal: true,
                new MetaUpgradeBonus(MetaUpgradeBonusType.StartingGold,        100f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.StartWithCommonRelic, 1f)),

            // ════════════════════════════════════════════════════════════════
            // PATH 4 : 古代の知識  (Ancient Knowledge — MP/Skills)
            // ════════════════════════════════════════════════════════════════
            new("arcane_1", "古代の知識", "秘術の素養",
                "最大MPが15増加する。",
                cost: 5, required: null, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MaxMPFlat, 15f)),

            new("arcane_2", "古代の知識", "魔力の泉",
                "最大MPがさらに20増加する。",
                cost: 10, required: new[]{"arcane_1"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MaxMPFlat, 20f)),

            new("arcane_3", "古代の知識", "技の研鑽",
                "物理・魔法攻撃が5%増加する（スキル威力の底上げ）。",
                cost: 15, required: new[]{"arcane_2"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.PhysAtkPercent, 0.05f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.MagAtkPercent,  0.05f)),

            new("arcane_4", "古代の知識", "値切り上手",
                "ショップの全品価格がさらに10%低下する。",
                cost: 20, required: new[]{"arcane_3"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.ShopDiscount, 0.10f)),

            new("arcane_5", "古代の知識", "★ 秘術の極み",
                "最大MPが25増加し、物理・魔法攻撃がさらに5%増加する。",
                cost: 30, required: new[]{"arcane_4"}, isFinal: true,
                new MetaUpgradeBonus(MetaUpgradeBonusType.MaxMPFlat,     25f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.PhysAtkPercent, 0.05f),
                new MetaUpgradeBonus(MetaUpgradeBonusType.MagAtkPercent,  0.05f)),

            // ════════════════════════════════════════════════════════════════
            // PATH 5 : 荒野の知恵  (Wilderness Wisdom — Curse Resistance)
            // ════════════════════════════════════════════════════════════════
            new("wild_1", "荒野の知恵", "呪いへの慣れ",
                "呪いによるダメージ増加効果が15%軽減される。",
                cost: 5, required: null, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.CurseDmgReduction, 0.15f)),

            new("wild_2", "荒野の知恵", "穢れ払い",
                "呪いによるダメージ増加がさらに15%軽減される。",
                cost: 10, required: new[]{"wild_1"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.CurseDmgReduction, 0.15f)),

            new("wild_3", "荒野の知恵", "盾の守護",
                "物理防御が8%増加する。",
                cost: 15, required: new[]{"wild_2"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.PhysDefPercent, 0.08f)),

            new("wild_4", "荒野の知恵", "呪縛解放",
                "呪いによるダメージ増加がさらに20%軽減される。",
                cost: 20, required: new[]{"wild_3"}, isFinal: false,
                new MetaUpgradeBonus(MetaUpgradeBonusType.CurseDmgReduction, 0.20f)),

            new("wild_5", "荒野の知恵", "★ 不死身の旅人",
                "「衰弱」呪いによる最大HP低下を完全に無効化する。",
                cost: 30, required: new[]{"wild_4"}, isFinal: true,
                new MetaUpgradeBonus(MetaUpgradeBonusType.CurseHPReductionImmune, 1f)),
        };

        // ── Unlock API ────────────────────────────────────────────────────────
        public static bool IsUnlocked(string nodeID) =>
            PlayerPrefs.GetInt(NodeKey(nodeID), 0) == 1;

        public static bool CanUnlock(string nodeID)
        {
            var node = GetNode(nodeID);
            if (node == null || IsUnlocked(nodeID)) return false;
            if (MetaProgression.TotalEpitaphs < node.EpitaphCost) return false;
            return node.RequiredNodeIDs.All(IsUnlocked);
        }

        public static bool TryUnlock(string nodeID)
        {
            if (!CanUnlock(nodeID)) return false;
            var node = GetNode(nodeID);
            MetaProgression.SpendEpitaphs(node.EpitaphCost);
            PlayerPrefs.SetInt(NodeKey(nodeID), 1);
            PlayerPrefs.Save();
            return true;
        }

        public static void ResetAll()
        {
            foreach (var n in AllNodes)
                PlayerPrefs.DeleteKey(NodeKey(n.ID));
            PlayerPrefs.Save();
        }

        // ── Apply bonuses to a run ─────────────────────────────────────────────
        /// <summary>
        /// ランスタート時に呼び出し、解放済みのノードのボーナスをすべてRunDataに適用する。
        /// MaxHP の変更は呼び出し後に run.MaxHP を参照すること。
        /// </summary>
        public static void ApplyAll(RunData run)
        {
            foreach (var node in AllNodes)
            {
                if (!IsUnlocked(node.ID)) continue;
                foreach (var bonus in node.Bonuses)
                    ApplyBonus(run, bonus);
            }
            // Clamp accumulated values
            run.MetaShopDiscount    = Mathf.Clamp(run.MetaShopDiscount,    0f, 0.40f);
            run.MetaCurseDmgReduction = Mathf.Clamp(run.MetaCurseDmgReduction, 0f, 0.80f);
        }

        static void ApplyBonus(RunData run, MetaUpgradeBonus b)
        {
            switch (b.Type)
            {
                case MetaUpgradeBonusType.MaxHPPercent:
                    run.MetaMaxHPMult            += b.Value;        break;
                case MetaUpgradeBonusType.PhysAtkPercent:
                    run.MetaPhysAtkMult          += b.Value;        break;
                case MetaUpgradeBonusType.MagAtkPercent:
                    run.MetaMagAtkMult           += b.Value;        break;
                case MetaUpgradeBonusType.PhysDefPercent:
                    run.MetaPhysDefMult          += b.Value;        break;
                case MetaUpgradeBonusType.MagDefPercent:
                    run.MetaMagDefMult           += b.Value;        break;
                case MetaUpgradeBonusType.CritRateFlat:
                    run.MetaCritRateBonus        += Mathf.RoundToInt(b.Value); break;
                case MetaUpgradeBonusType.MaxMPFlat:
                    run.MetaMaxMPBonus           += Mathf.RoundToInt(b.Value); break;
                case MetaUpgradeBonusType.StartingGold:
                    run.MetaExtraStartGold       += Mathf.RoundToInt(b.Value); break;
                case MetaUpgradeBonusType.ShopDiscount:
                    run.MetaShopDiscount         += b.Value;        break;
                case MetaUpgradeBonusType.ExtraRelicChoices:
                    run.MetaExtraRelicChoices    += Mathf.RoundToInt(b.Value); break;
                case MetaUpgradeBonusType.StartBP:
                    run.MetaStartBP              += Mathf.RoundToInt(b.Value); break;
                case MetaUpgradeBonusType.FloorClearExtraHeal:
                    run.MetaFloorClearExtraHeal   = true;           break;
                case MetaUpgradeBonusType.StartWithCommonRelic:
                    run.MetaStartWithCommonRelic  = true;           break;
                case MetaUpgradeBonusType.CurseDmgReduction:
                    run.MetaCurseDmgReduction    += b.Value;        break;
                case MetaUpgradeBonusType.CurseHPReductionImmune:
                    run.MetaCurseHPReductionImmune = true;          break;
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        public static MetaUpgradeNode GetNode(string id) =>
            System.Array.Find(AllNodes, n => n.ID == id);

        public static int GetUnlockedCount() =>
            AllNodes.Count(n => IsUnlocked(n.ID));

        public static int GetTotalCost() =>
            AllNodes.Sum(n => n.EpitaphCost);

        public static string[] GetPathNames() =>
            AllNodes.Select(n => n.PathName).Distinct().ToArray();
    }
}
