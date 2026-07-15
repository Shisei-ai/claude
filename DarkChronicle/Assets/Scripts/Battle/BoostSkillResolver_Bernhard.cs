using System.Collections.Generic;
using DarkChronicle.Data;

namespace DarkChronicle.Battle
{
    /// <summary>
    /// ベルンハルト固有スキルの Boost 強化テーブル。
    /// 二段斬り・盾砕き・雄叫び・強撃・旋風斬・炎の刃・百烈斬・雷迸り・覇剣・大地の盾 は
    /// BoostSkillResolver.BoostTable に共有エントリとして定義済み。
    /// このファイルでは未定義の固有スキル（守りの構え）のみを追加する。
    /// </summary>
    public static class BoostSkillResolver_Bernhard
    {
        public static readonly Dictionary<string, BoostUpgrade[]> BernhardBoostTable = new()
        {
            // ── 守りの構え ────────────────────────────────────────────────
            // Base: 物理防御+40%、速度-20%（2ターン）
            // Upgraded: 物理防御+60% + 魔法防御+20%、速度低下なし
            ["守りの構え"] = new[]
            {
                new BoostUpgrade { BuffDurationBonus = 1,
                    FlavorText = "防御バフ持続+1ターン（合計3ターン）" },
                new BoostUpgrade { BuffDurationBonus = 2, AlsoBuffPhysicalDef = true,
                    FlavorText = "防御バフ持続+2ターン / 物理防御バフ効果も上昇" },
                new BoostUpgrade { BuffDurationBonus = 3, AlsoBuffPhysicalDef = true,
                    AlsoBuffMagicAtk = false, GrantRegenStatus = true, SelfBuffIncluded = true,
                    FlavorText = "防御バフ持続+3ターン / 全防御UP / 速度低下解除 / リジェネ付与" },
            },
        };
    }
}
