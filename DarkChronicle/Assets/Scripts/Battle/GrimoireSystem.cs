using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// ゼノ固有の「グリモワール（魔獣の書）」システム。
    ///
    /// ■ 仕組み
    ///   「吸収」「魂喰い」「冥界の扉」スキルで敵を消滅させると、
    ///   その敵が持つスキルのひとつが GrimoireEntry としてスロットに登録される。
    ///   スロットは最大 MaxSlots = 4。溢れると最古のエントリが上書きされる。
    ///   スロット内の技はゼノのコマンドメニューに追加表示され、戦闘中に使用可能。
    ///
    /// ■ スタックの永続性
    ///   グリモワールの内容はバトルをまたいでローグライクラン内で保持される。
    ///   RunData が GrimoireSystem インスタンスを持ち、各バトル開始時に渡す。
    ///
    /// ■ 技の変換ルール
    ///   吸収された SkillData はそのまま参照される（コピーは作らない）が、
    ///   ダメージ計算時のスケール元がゼノの MagATK に切り替わる。
    ///   ダメージ型が Physical の技は Magical に変換される（ゼノは物理不向き）。
    ///   MPCostは元の1.2倍（最小4）で再計算される。
    /// </summary>
    public sealed class GrimoireSystem
    {
        // ── 定数 ──────────────────────────────────────────────────────────
        public const int   MaxSlots            = 4;
        public const float BaseAbsorbChance    = 0.25f;  // 基本吸収確率
        public const float MaxHPRatioBonus     = 0.50f;  // HP0%時の追加ボーナス
        public const float LuckAbsorbCoeff     = 0.005f; // Luck1点 → 確率+0.5%
        public const float EliteAbsorbMult     = 0.40f;  // エリートへの確率補正
        public const float SkillPowerScale     = 0.90f;  // 吸収技の威力倍率（10%ダウン）
        public const float MPCostScale         = 1.20f;  // 吸収技のMP倍率
        public const int   MinMPCost           = 4;

        // ── 状態 ─────────────────────────────────────────────────────────
        readonly List<GrimoireEntry> _slots = new();
        public IReadOnlyList<GrimoireEntry> Slots => _slots;

        public int  SlotCount      => _slots.Count;
        public bool HasFreeSlot    => _slots.Count < MaxSlots;
        public bool HasAnyEntry    => _slots.Count > 0;

        // ── 吸収確率計算 ──────────────────────────────────────────────────
        /// <summary>
        /// ターゲットの現在HP比率と術者の LUK から吸収確率を計算する。
        /// </summary>
        public float GetAbsorbChance(BattleCharacter caster, BattleCharacter target,
                                      float bonusFromSkill = 0f)
        {
            if (target == null || target.MaxHP <= 0) return 0f;
            float hpRatio  = Mathf.Clamp01((float)target.HP / target.MaxHP);
            float hpBonus  = (1f - hpRatio) * MaxHPRatioBonus;
            float luckBonus= caster.Luck * LuckAbsorbCoeff;
            return Mathf.Clamp01(BaseAbsorbChance + hpBonus + luckBonus + bonusFromSkill);
        }

        // ── 吸収試行 ──────────────────────────────────────────────────────
        /// <summary>
        /// BattleManager がサイコロを振った結果（0-1）と共に呼ぶ。
        /// 成功した場合 GrimoireEntry を返す（同時にスロットへ格納）。
        /// 失敗した場合は null を返す。
        /// </summary>
        public GrimoireEntry TryAbsorb(EnemyData enemy, BattleCharacter caster,
                                        BattleCharacter target, float roll,
                                        float extraChance = 0f)
        {
            if (enemy == null || enemy.Rank == EnemyRank.Boss) return null;

            float chance = GetAbsorbChance(caster, target, extraChance);
            if (enemy.Rank == EnemyRank.Elite) chance *= EliteAbsorbMult;
            if (roll > chance) return null;

            var entry = BuildEntry(enemy);
            if (entry == null) return null;

            if (_slots.Count >= MaxSlots) _slots.RemoveAt(0);  // 最古を削除
            _slots.Add(entry);
            GrimoireUIBridge.NotifyUpdate(this);
            return entry;
        }

        // ── 強制吸収（冥界の扉用） ────────────────────────────────────────
        /// <summary>
        /// 確率チェックなしで吸収を実行する（冥界の扉・特殊条件用）。
        /// </summary>
        public GrimoireEntry ForceAbsorb(EnemyData enemy)
        {
            if (enemy == null || enemy.Rank == EnemyRank.Boss) return null;
            var entry = BuildEntry(enemy);
            if (entry == null) return null;
            if (_slots.Count >= MaxSlots) _slots.RemoveAt(0);
            _slots.Add(entry);
            GrimoireUIBridge.NotifyUpdate(this);
            return entry;
        }

        // ── エントリ構築 ──────────────────────────────────────────────────
        GrimoireEntry BuildEntry(EnemyData enemy)
        {
            if (enemy.Actions == null || enemy.Actions.Count == 0) return null;

            // 吸収可能な行動をフィルタ
            var absorbable = enemy.Actions
                .Where(a => a.IsAbsorbable && a.Skill != null)
                .ToList();
            if (absorbable.Count == 0) return null;

            // ランダムに1つ選択（Priority加重サンプリング）
            var totalWeight = absorbable.Sum(a => Mathf.Max(1, a.Priority));
            float r = Random.Range(0f, totalWeight);
            EnemyAction chosen = null;
            float acc = 0f;
            foreach (var a in absorbable)
            {
                acc += Mathf.Max(1, a.Priority);
                if (r <= acc) { chosen = a; break; }
            }
            chosen ??= absorbable.Last();

            var sk = chosen.Skill;
            return new GrimoireEntry
            {
                OriginalEnemyName = enemy.EnemyName,
                DisplayName       = $"【{enemy.EnemyName}】{sk.SkillName}",
                BaseSkill         = sk,
                OverrideDmgType   = sk.DamageType == DamageType.Physical
                                    ? DamageType.Magical   // 物理技は魔法ダメージに変換
                                    : sk.DamageType,
                OverridePower     = sk.BasePower  * SkillPowerScale,
                OverrideHealPower = sk.HealPower  * 0.80f,
                OverrideMPCost    = Mathf.Max(MinMPCost, Mathf.RoundToInt(sk.MPCost * MPCostScale)),
            };
        }

        // ── スロット操作 ──────────────────────────────────────────────────
        public void RemoveSlot(int index)
        {
            if (index >= 0 && index < _slots.Count)
            {
                _slots.RemoveAt(index);
                GrimoireUIBridge.NotifyUpdate(this);
            }
        }

        public void ClearAll()
        {
            _slots.Clear();
            GrimoireUIBridge.NotifyUpdate(this);
        }

        // ── UI向け ────────────────────────────────────────────────────────
        public string GetPreviewText()
        {
            if (_slots.Count == 0) return "<color=#888>グリモワール：空</color>";
            var sb = new System.Text.StringBuilder("<color=#9B59B6>【グリモワール】</color>\n");
            for (int i = 0; i < _slots.Count; i++)
            {
                var e = _slots[i];
                sb.Append($"  [{i + 1}] {e.DisplayName}  MP:{e.OverrideMPCost}");
                if (i < _slots.Count - 1) sb.AppendLine();
            }
            return sb.ToString();
        }
    }

    // ── グリモワールエントリ ──────────────────────────────────────────────
    public class GrimoireEntry
    {
        public string    OriginalEnemyName;
        public string    DisplayName;        // UI表示用「【スライム】体当たり」形式
        public SkillData BaseSkill;          // 元のSkillData（参照）
        public DamageType OverrideDmgType;  // 変換後のDamageType
        public float     OverridePower;     // スケール後のBasePower
        public float     OverrideHealPower; // スケール後のHealPower
        public int       OverrideMPCost;    // 再計算後のMPCost
    }

    // ── UI橋渡し ──────────────────────────────────────────────────────────
    /// <summary>
    /// グリモワールの内容変化をBattleUIに通知するイベント。
    /// BattleUIが購読してゼノのコマンドパネルを更新する。
    /// </summary>
    public static class GrimoireUIBridge
    {
        public static event System.Action<GrimoireSystem> OnGrimoireUpdate;

        public static void NotifyUpdate(GrimoireSystem gs)
            => OnGrimoireUpdate?.Invoke(gs);
    }
}
