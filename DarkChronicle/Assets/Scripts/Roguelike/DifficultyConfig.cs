using UnityEngine;

namespace DarkChronicle.Roguelike
{
    public enum DifficultyLevel
    {
        Story     = 0,   // 物語    — 初心者向け
        Normal    = 1,   // 標準    — 基準難易度
        Hard      = 2,   // 強敵    — 強化開始
        Challenge = 3,   // 試練    — 盾が増える
        Expert    = 4,   // 覇者    — 全敵強化
        Abyss     = 5,   // 深淵    — 最高難度
    }

    public static class DifficultyConfig
    {
        public static readonly DifficultyTier[] Tiers =
        {
            new DifficultyTier(DifficultyLevel.Story,     "物語",
                "初めての冒険者向け。敵が弱く設定されています。",
                hpMult: 0.85f, dmgMult: 0.85f, startGold: 150,
                eliteShields: 0, allShields: 0, startCurse: false),

            new DifficultyTier(DifficultyLevel.Normal,    "標準",
                "バランスの取れた標準難易度。初回プレイはここから。",
                hpMult: 1.00f, dmgMult: 1.00f, startGold: 100,
                eliteShields: 0, allShields: 0, startCurse: false),

            new DifficultyTier(DifficultyLevel.Hard,      "強敵",
                "敵が強化される。余裕を持って挑め。",
                hpMult: 1.15f, dmgMult: 1.10f, startGold: 75,
                eliteShields: 0, allShields: 0, startCurse: false),

            new DifficultyTier(DifficultyLevel.Challenge, "試練",
                "エリートの盾が増加した。装備を固めてから挑め。",
                hpMult: 1.30f, dmgMult: 1.20f, startGold: 50,
                eliteShields: 1, allShields: 0, startCurse: false),

            new DifficultyTier(DifficultyLevel.Expert,    "覇者",
                "全ての敵が強靭になった。戦略的な判断が求められる。",
                hpMult: 1.50f, dmgMult: 1.35f, startGold: 25,
                eliteShields: 1, allShields: 1, startCurse: false),

            new DifficultyTier(DifficultyLevel.Abyss,     "深淵",
                "呪いを背負って旅立て。これが最難関だ。",
                hpMult: 1.75f, dmgMult: 1.55f, startGold: 0,
                eliteShields: 2, allShields: 2, startCurse: true),
        };

        public static DifficultyTier Get(int level) =>
            Tiers[Mathf.Clamp(level, 0, Tiers.Length - 1)];
    }

    public sealed class DifficultyTier
    {
        public DifficultyLevel Level;
        public string          DisplayName;
        public string          Description;
        public float           EnemyHPMult;
        public float           EnemyDamageMult;
        public int             StartingGold;
        public int             ExtraEliteShields;     // elite のみに加算
        public int             ExtraAllEnemyShields;  // 全敵に加算
        public bool            StartWithCurse;

        public DifficultyTier(DifficultyLevel level, string name, string desc,
                              float hpMult, float dmgMult, int startGold,
                              int eliteShields, int allShields, bool startCurse)
        {
            Level                = level;
            DisplayName          = name;
            Description          = desc;
            EnemyHPMult          = hpMult;
            EnemyDamageMult      = dmgMult;
            StartingGold         = startGold;
            ExtraEliteShields    = eliteShields;
            ExtraAllEnemyShields = allShields;
            StartWithCurse       = startCurse;
        }
    }
}
