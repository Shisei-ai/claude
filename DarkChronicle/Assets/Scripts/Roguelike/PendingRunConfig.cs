using DarkChronicle.Data;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// RunSetup シーンで確定した「ラン設定」を Roguelike シーンへ渡す静的ブリッジ。
    /// RunSetupUI.OnBeginJourney() が Set() し、RoguelikeManager.MainFlow() が消費する。
    /// </summary>
    public enum StartingBlessingType
    {
        None             = 0,
        VitalGuard       = 1,   // 最大HP+25%
        GoldenCompass    = 2,   // 開始ゴールド+150
        IronWill         = 3,   // コモンレリックを追加で1つ
        AncientKnowledge = 4,   // 最初の戦闘後スキル選択肢+1
        ShadowVeil       = 5,   // 最初の戦闘で全敵シールド-1
    }

    public static class PendingRunConfig
    {
        public static bool                HasPendingConfig  { get; private set; }
        public static CharacterData       SelectedCharacter { get; private set; }
        public static int                 DifficultyLevel   { get; private set; }
        public static StartingBlessingType SelectedBlessing { get; private set; }

        public static void Set(CharacterData character, int difficulty, StartingBlessingType blessing)
        {
            SelectedCharacter = character;
            DifficultyLevel   = difficulty;
            SelectedBlessing  = blessing;
            HasPendingConfig  = true;
        }

        public static void Clear()
        {
            HasPendingConfig  = false;
            SelectedCharacter = null;
            DifficultyLevel   = 0;
            SelectedBlessing  = StartingBlessingType.None;
        }

        public static (string Name, string Desc, string Icon) GetBlessingInfo(StartingBlessingType b) => b switch
        {
            StartingBlessingType.VitalGuard       => ("守護の護符",   "最大HPが25%増加する。長い旅路を生き抜け。",               "❤"),
            StartingBlessingType.GoldenCompass    => ("黄金の羅針盤", "150ゴールドを持って旅を始める。",                         "◈"),
            StartingBlessingType.IronWill         => ("鉄の意志",     "追加のコモンレリックを1つ所持して始まる。",               "⬡"),
            StartingBlessingType.AncientKnowledge => ("知識の欠片",   "最初の戦闘後、スキル選択肢が1枚多くなる。",               "✦"),
            StartingBlessingType.ShadowVeil       => ("影の帳",       "最初の戦闘の開始時、全ての敵のシールドが1枚少ない。",     "◆"),
            _                                     => ("なし",         "",                                                       "·"),
        };
    }
}
