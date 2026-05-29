using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Data;

namespace DarkChronicle.Roguelike
{
    // ── Ending Path Enum ───────────────────────────────────────────────────────
    public enum EndingType
    {
        None       = 0,
        DemonKing,   // 魔王再誕
        AbyssGod,    // 深淵神覚醒
        TimeWraith,  // 時の亡霊
        CursedKing,  // 呪われた王の終焉
        TrueCore,    // 世界の核（真の形態）
    }
}

namespace DarkChronicle.Roguelike.Relics
{
    using DarkChronicle.Roguelike;

    // ── Ending Path RelicEffectType Extensions ─────────────────────────────────
    // NOTE: These values must be appended to RelicEffectType in RelicData.cs.
    // They are referenced here via the existing RelicEffectType enum.
    //   EndingPath_DemonKing
    //   EndingPath_AbyssGod
    //   EndingPath_TimeWraith
    //   EndingPath_CursedKing
    //   EndingPath_TrueCore

    // ── Ending System ──────────────────────────────────────────────────────────
    /// <summary>
    /// Pure static helpers for the five-path true-final-floor (Floor 4) ending system.
    /// Provides all narrative text, boss/relic/floor factory methods, and type mappings.
    /// </summary>
    public static class EndingSystem
    {
        // ── Type Resolution ────────────────────────────────────────────────────

        /// <summary>Maps a held relic's PrimaryEffect to its EndingType.</summary>
        public static EndingType GetEndingType(RelicData relic)
        {
            if (relic == null) return EndingType.None;
            return GetEndingType(relic.PrimaryEffect);
        }

        /// <summary>Maps a RelicEffectType directly to its EndingType.</summary>
        public static EndingType GetEndingType(RelicEffectType effect) => effect switch
        {
            RelicEffectType.EndingPath_DemonKing  => EndingType.DemonKing,
            RelicEffectType.EndingPath_AbyssGod   => EndingType.AbyssGod,
            RelicEffectType.EndingPath_TimeWraith => EndingType.TimeWraith,
            RelicEffectType.EndingPath_CursedKing => EndingType.CursedKing,
            RelicEffectType.EndingPath_TrueCore   => EndingType.TrueCore,
            _                                     => EndingType.None,
        };

        // ── Narrative Text ─────────────────────────────────────────────────────

        /// <summary>Short premonition title shown when the player picks up an ending relic.</summary>
        public static string GetPremonitionTitle(EndingType ending) => ending switch
        {
            EndingType.DemonKing  => "「魔王再誕」への道が開かれた",
            EndingType.AbyssGod   => "「深淵神覚醒」への道が開かれた",
            EndingType.TimeWraith => "「時の亡霊」への道が開かれた",
            EndingType.CursedKing => "「呪われた王の終焉」への道が開かれた",
            EndingType.TrueCore   => "「世界の核」への道が開かれた",
            _                     => "未知の予兆",
        };

        /// <summary>Two-sentence ominous premonition text displayed beneath the title card.</summary>
        public static string GetPremonitionText(EndingType ending) => ending switch
        {
            EndingType.DemonKing =>
                "闇の奥底から玉座が呼んでいる。魔王の意志はまだ死んでいない——それはあなたを待ち続けている。",

            EndingType.AbyssGod =>
                "深淵は静かに口を開け、あなたの魂を覗き込んでいる。神に見つめられた者は、もはや引き返せない。",

            EndingType.TimeWraith =>
                "時計の針が止まり、過去と未来が交わる場所がある。亡霊は永遠の中であなたの訪れを待ち望んでいた。",

            EndingType.CursedKing =>
                "古い呪いの声が廃墟の石畳に染み込んでいる。王の骨は砕けても、その怨念だけは今も王座を離れない。",

            EndingType.TrueCore =>
                "世界の中心で何かが目覚めようとしている。全ての始まりと終わりが交差する場所で、真実があなたを待つ。",

            _ =>
                "何かが変わった。行く手に、未知の扉が現れた。",
        };

        /// <summary>The title card shown on the ending screen.</summary>
        public static string GetEndingTitle(EndingType ending) => ending switch
        {
            EndingType.DemonKing  => "エンディング：魔王再誕",
            EndingType.AbyssGod   => "エンディング：深淵神覚醒",
            EndingType.TimeWraith => "エンディング：時の亡霊との邂逅",
            EndingType.CursedKing => "エンディング：呪われた王の終焉",
            EndingType.TrueCore   => "真のエンディング：世界の核",
            _                     => "エンディング",
        };

        /// <summary>
        /// Four-sentence ending narrative. <paramref name="won"/> is true when the
        /// player defeated the floor boss; false for a run-over/flee epilogue.
        /// </summary>
        public static string GetEndingText(EndingType ending, bool won) => ending switch
        {
            EndingType.DemonKing => won
                ? "魔王ヴァルナ＝マルアークの肉体は砕け、奈落の玉座は静寂に包まれた。" +
                  "しかし、その死の瞬間に彼の最後の言葉が世界に刻まれた。" +
                  "「闇は消えない——それは形を変えて、また戻ってくる。」" +
                  "あなたは廃墟を後にした。背後に広がる暗闇が、静かに笑っていた。"
                : "魔王の力に圧倒され、あなたは奈落の縁から命からがら脱出した。" +
                  "玉座は今も闇の中に沈んでいる——そして魔王はまだ待っている。" +
                  "敗北の苦みを胸に刻み、あなたは傷ついた体を引きずって戻った。" +
                  "いつかまた、あの扉を開けることができるだろうか。",

            EndingType.AbyssGod => won
                ? "深淵神ウォルムは最後の叫びと共に虚空へと消えていった。" +
                  "神殿の壁に刻まれた無数の目が、一つずつ閉じていく。" +
                  "深淵は口を閉じ、長い眠りに就いた——少なくとも、今は。" +
                  "あなたは光の届かない神殿を後にし、地上の空気を初めて懐かしく思った。"
                : "深淵神の眼差しがあなたの精神を侵食し、足が止まった。" +
                  "神には勝てなかった——そして深淵は今も広がり続けている。" +
                  "あなたは這うようにして神殿を脱出し、外の世界へと戻った。" +
                  "あの目はまだ、どこかであなたを見つめている気がした。",

            EndingType.TimeWraith => won
                ? "時の亡霊エオンは時間の裂け目に飲み込まれ、その姿は霧のように消えた。" +
                  "止まっていた時計の針が、再びゆっくりと動き始める。" +
                  "過去と未来は元の流れへと戻り、空白だった時間が静かに埋まっていった。" +
                  "あなたは時の外から現在へと帰還し、命の鼓動が確かであることを感じた。"
                : "時間の歪みの中で方向感覚を失い、あなたは何度も同じ場所に戻ってきた。" +
                  "亡霊は笑いながら時の波間に消えていった。" +
                  "気づけば時の空白の外へと押し出され、現実へと弾き返されていた。" +
                  "時計の針が刻む音だけが、あの場所の現実を証明している。",

            EndingType.CursedKing => won
                ? "呪われた王アルドリックの呪縛が解け、玉座間に積もった呪いの霧が晴れた。" +
                  "数百年続いた古い呪いが、ついに終わりを迎えた瞬間だった。" +
                  "王の亡霊は安らかな表情で光の中へと消え、「ありがとう」という声が残った。" +
                  "呪いから解放された城は、静かな廃墟として風雨に委ねられていった。"
                : "呪いの重さに耐えきれず、あなたは玉座間から退いた。" +
                  "王の怨念はまだ城の石に染み込んでいる——呪いは続く。" +
                  "傷ついた心と体を抱えて、あなたは呪われた城を後にした。" +
                  "いつかこの呪いを断ち切るために、もう一度戻れるだろうか。",

            EndingType.TrueCore => won
                ? "世界の核が砕け、その光が全ての闇を一瞬だけ照らし出した。" +
                  "始まりと終わりが交差した場所で、あなたは真実の断片を目にした。" +
                  "世界はまだここにある——あなたが守ったから、あるいは、元々続くはずだったから。" +
                  "核の欠片を胸に抱き、あなたは世界の中枢を後にした。世界は、続いていく。"
                : "世界の核の前に、あなたの力は及ばなかった。" +
                  "真実はあまりにも重く、あまりにも眩しかった。" +
                  "それでも世界は存在し続け、核はまた静かな眠りについた。" +
                  "真の形態を見た者として、あなたは密かな使命を胸に帰還した。",

            _ =>
                "長い戦いの末、あなたは再び出発点に立っていた。" +
                "世界は変わり、しかし続いていく。" +
                "あなたの歩んだ道は消えない。" +
                "また、歩き出す時が来るだろう。",
        };

        // ── Factory Methods ────────────────────────────────────────────────────

        /// <summary>
        /// Creates a runtime ending relic ScriptableObject for the given path.
        /// These are generated at runtime and are not saved as project assets.
        /// </summary>
        public static RelicData CreateEndingRelic(EndingType ending)
        {
            var relic = ScriptableObject.CreateInstance<RelicData>();

            switch (ending)
            {
                case EndingType.DemonKing:
                    relic.RelicName    = "魔王の証印";
                    relic.Description  = "魔王の力に呼ばれた者の証。奈落の玉座への扉が開く。";
                    relic.Rarity       = RelicRarity.Event;
                    relic.PrimaryEffect = RelicEffectType.EndingPath_DemonKing;
                    relic.FlavorText   = "玉座は空ではない——それは満ちている、闇で。";
                    break;

                case EndingType.AbyssGod:
                    relic.RelicName    = "深淵の瞳孔";
                    relic.Description  = "深淵に見つめられた証。神殿への道が滲み出す。";
                    relic.Rarity       = RelicRarity.Event;
                    relic.PrimaryEffect = RelicEffectType.EndingPath_AbyssGod;
                    relic.FlavorText   = "見つめ続けると、深淵もまたあなたを見つめ返す。";
                    break;

                case EndingType.TimeWraith:
                    relic.RelicName    = "砕けた懐中時計";
                    relic.Description  = "時の亡霊から授かった欠片。時の空白への入口が現れる。";
                    relic.Rarity       = RelicRarity.Event;
                    relic.PrimaryEffect = RelicEffectType.EndingPath_TimeWraith;
                    relic.FlavorText   = "針は動かない。でも、時は確かに流れている。";
                    break;

                case EndingType.CursedKing:
                    relic.RelicName    = "古王の呪冠";
                    relic.Description  = "古い呪いを宿した王冠の欠片。玉座間への道が開く。";
                    relic.Rarity       = RelicRarity.Event;
                    relic.PrimaryEffect = RelicEffectType.EndingPath_CursedKing;
                    relic.FlavorText   = "王は死んでいる。だが呪いはまだ生きている。";
                    break;

                case EndingType.TrueCore:
                    relic.RelicName    = "世界の核片";
                    relic.Description  = "世界の根源から生まれた欠片。真実の道が開かれる。";
                    relic.Rarity       = RelicRarity.Event;
                    relic.PrimaryEffect = RelicEffectType.EndingPath_TrueCore;
                    relic.FlavorText   = "世界の心臓が、まだ鼓動している。";
                    break;

                default:
                    relic.RelicName    = "未知の欠片";
                    relic.Description  = "正体不明の遺物。";
                    relic.Rarity       = RelicRarity.Event;
                    break;
            }

            relic.PrimaryValue = 0f;
            return relic;
        }

        /// <summary>
        /// Creates a runtime EnemyData ScriptableObject for the Floor 4 boss.
        /// </summary>
        public static EnemyData CreateBoss(EndingType ending)
        {
            var enemy = ScriptableObject.CreateInstance<EnemyData>();

            // Default shared action
            var defaultAction = new EnemyAction
            {
                ActionName   = "虚無の打撃",
                Skill        = null,
                Priority     = 1,
                UseChance    = 1f,
                HealthThreshold = 0,
                IsAbsorbable = false,
            };

            switch (ending)
            {
                case EndingType.DemonKing:
                    enemy.EnemyName  = "魔王ヴァルナ＝マルアーク";
                    enemy.Rank       = EnemyRank.Boss;
                    enemy.Stats      = new CharacterStats
                    {
                        MaxHP           = 4200,  // Lv14想定: 約18ターン戦闘
                        PhysicalAttack  = 115,   // ×1.8 → Lv14ベルン(Pdef84)に 123 dmg / 7hit
                        MagicAttack     = 80,
                        PhysicalDefense = 52,    // 大剣割り(91×2.2)で 148 dmg
                        MagicDefense    = 40,
                        Speed           = 72,
                    };
                    enemy.ShieldPoints = 4;
                    enemy.ExpReward    = 900;
                    enemy.JPReward     = 220;
                    enemy.GoldReward   = 350;
                    break;

                case EndingType.AbyssGod:
                    enemy.EnemyName  = "深淵神ウォルム";
                    enemy.Rank       = EnemyRank.Boss;
                    enemy.Stats      = new CharacterStats
                    {
                        MaxHP           = 4000,  // 魔法特化型：少し低めHP
                        PhysicalAttack  = 85,    // 物理は控えめ
                        MagicAttack     = 110,   // ×1.5 → Lv14ベルン(Mdef48)に 117 dmg / 7hit
                        PhysicalDefense = 30,    // 物理が通る → 物理キャラの活躍場面
                        MagicDefense    = 60,    // 魔法が一部吸収される逆説的ボス
                        Speed           = 80,
                    };
                    enemy.ShieldPoints = 3;
                    enemy.ExpReward    = 950;
                    enemy.JPReward     = 230;
                    enemy.GoldReward   = 360;
                    break;

                case EndingType.TimeWraith:
                    enemy.EnemyName  = "時の亡霊エオン";
                    enemy.Rank       = EnemyRank.Boss;
                    enemy.Stats      = new CharacterStats
                    {
                        MaxHP           = 3600,  // 超高速型：低HPで圧迫感
                        PhysicalAttack  = 100,   // ×1.8 → Lv14ベルン(Pdef84)に 96 dmg
                        MagicAttack     = 95,    // ×1.5 → Lv14ベルン(Mdef48)に 95 dmg
                        PhysicalDefense = 45,
                        MagicDefense    = 50,
                        Speed           = 105,   // 最速。ベルン(Spd31)の3.4倍行動
                    };
                    enemy.ShieldPoints = 3;
                    enemy.ExpReward    = 880;
                    enemy.JPReward     = 215;
                    enemy.GoldReward   = 340;
                    break;

                case EndingType.CursedKing:
                    enemy.EnemyName  = "呪われた王アルドリック";
                    enemy.Rank       = EnemyRank.Boss;
                    enemy.Stats      = new CharacterStats
                    {
                        MaxHP           = 4200,  // 超硬型：高HPかつ高DEF
                        PhysicalAttack  = 120,   // ×1.8 → Lv14ベルン(Pdef84)に 132 dmg / 6hit
                        MagicAttack     = 90,
                        PhysicalDefense = 70,    // 大剣割り(91×2.2)で 130 dmg（削りが遅い）
                        MagicDefense    = 45,
                        Speed           = 65,    // 鈍重だが重い一撃で圧迫
                    };
                    enemy.ShieldPoints = 5;
                    enemy.ExpReward    = 920;
                    enemy.JPReward     = 225;
                    enemy.GoldReward   = 355;
                    break;

                case EndingType.TrueCore:
                    enemy.EnemyName  = "世界の核（真の形態）";
                    enemy.Rank       = EnemyRank.TrueFinalBoss;
                    enemy.Stats      = new CharacterStats
                    {
                        MaxHP           = 5000,  // 最高HP・全能型
                        PhysicalAttack  = 130,   // ×1.8 → Lv15ベルン(Pdef88)に 146 dmg / 6hit
                        MagicAttack     = 115,   // ×1.5 → Lv15ベルン(Mdef50)に 123 dmg
                        PhysicalDefense = 60,    // 大剣割り(95×2.2)で 149 dmg（高いが突破可能）
                        MagicDefense    = 60,    // 魔法も同様
                        Speed           = 100,   // 全ボス中2番目の速さ
                    };
                    enemy.ShieldPoints = 6;
                    enemy.ExpReward    = 1200;
                    enemy.JPReward     = 320;
                    enemy.GoldReward   = 600;
                    break;

                default:
                    enemy.EnemyName  = "不明の存在";
                    enemy.Rank       = EnemyRank.Boss;
                    enemy.Stats      = new CharacterStats { MaxHP = 2000, Speed = 80 };
                    enemy.ShieldPoints = 3;
                    break;
            }

            enemy.ElementWeaknesses = new List<ElementType>();
            enemy.Actions           = new List<EnemyAction> { defaultAction };
            enemy.ActionsPerTurn    = 1;
            return enemy;
        }

        /// <summary>
        /// Creates a runtime FloorData ScriptableObject representing the true final floor (Floor 4).
        /// The boss pool is pre-populated with the matching ending boss.
        /// </summary>
        public static FloorData CreateFloor4(EndingType ending)
        {
            var floor = ScriptableObject.CreateInstance<FloorData>();

            // Shared Floor 4 settings
            floor.FloorIndex           = 3;
            floor.FloorLore            = GetFloor4Lore(ending);
            floor.NormalEncounters     = new List<EnemyEncounterGroup>();
            floor.EliteEncounters      = new List<EnemyEncounterGroup>();
            floor.EnemyHPMultiplier    = 1.5f;
            floor.EnemyDamageMultiplier = 1.5f;
            floor.BaseGoldReward       = 200;
            floor.BossDamageMultiplier = 1.3f;
            floor.BossShieldBonus      = 2;
            floor.BossGivesRelic       = true;
            floor.HasFog               = true;
            floor.FogDensity           = 0.04f;

            // Per-path name, subtitle, boss, and fog colour
            var boss = CreateBoss(ending);
            floor.BossPool = new List<EnemyData> { boss };

            switch (ending)
            {
                case EndingType.DemonKing:
                    floor.FloorName     = "奈落の玉座";
                    floor.FloorSubtitle = "全ての闇の終着点";
                    floor.FogColor      = new Color(0.3f, 0.02f, 0.05f);
                    break;

                case EndingType.AbyssGod:
                    floor.FloorName     = "深淵神殿";
                    floor.FloorSubtitle = "深淵が口を開ける";
                    floor.FogColor      = new Color(0.02f, 0.05f, 0.25f);
                    break;

                case EndingType.TimeWraith:
                    floor.FloorName     = "時の空白";
                    floor.FloorSubtitle = "時が止まる場所";
                    floor.FogColor      = new Color(0.15f, 0.1f, 0.25f);
                    break;

                case EndingType.CursedKing:
                    floor.FloorName     = "呪縛の玉座間";
                    floor.FloorSubtitle = "古い呪いの終焉";
                    floor.FogColor      = new Color(0.2f, 0.02f, 0.2f);
                    break;

                case EndingType.TrueCore:
                    floor.FloorName     = "世界の中枢";
                    floor.FloorSubtitle = "全ての始まりと終わり";
                    floor.FogColor      = new Color(0.05f, 0.05f, 0.05f);
                    break;

                default:
                    floor.FloorName     = "未知の深淵";
                    floor.FloorSubtitle = "—";
                    floor.FogColor      = new Color(0.05f, 0.05f, 0.05f);
                    break;
            }

            return floor;
        }

        // ── Internal Helpers ───────────────────────────────────────────────────

        static string GetFloor4Lore(EndingType ending) => ending switch
        {
            EndingType.DemonKing =>
                "古代の戦争が終わった後も、魔王の意志だけは奈落の玉座に宿り続けた。" +
                "幾千年の時を経て、その意志はついに肉体を取り戻そうとしている。",

            EndingType.AbyssGod =>
                "世界の底に眠る神殿は、人の手によって建てられたものではない。" +
                "深淵そのものが意志を持ち、崇拝者を求めて口を開け続けている。",

            EndingType.TimeWraith =>
                "時間の断層に挟まれたこの空間では、過去も未来も同時に存在する。" +
                "時の亡霊は永遠の中に閉じ込められ、解放を求めてさまよっている——あるいは、さらなる生贄を。",

            EndingType.CursedKing =>
                "かつて栄光ある王国があった場所に、今は呪いだけが残っている。" +
                "王は死んでいるが、呪いは死なない。玉座は今も、主を待ち続けている。",

            EndingType.TrueCore =>
                "世界の中心には核がある。全ての生命、全ての魔法、全ての時間の源泉。" +
                "真の姿を見た者は数少ない——そして見た者の多くは、戻ってこなかった。",

            _ => "未知の場所。",
        };
    }
}
