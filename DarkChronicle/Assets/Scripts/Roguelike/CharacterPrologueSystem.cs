namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Per-character prologue lines shown at the start of a new roguelike run.
    /// Character names must match CharacterData.name (the ScriptableObject asset file name).
    /// </summary>
    public static class CharacterPrologueSystem
    {
        public static string[] GetPrologue(string characterName) => characterName switch
        {
            "Ash" => new[]
            {
                "……また始まりの場所か。",
                "俺は国の秘密を知りすぎた。奴らに追われながらも、まだここに立っている。",
                "影の中を生きてきた。今度も、そうやって生き延びてやる。",
            },
            "Zeno" => new[]
            {
                "アカリ……お前をこんな場所に閉じ込めてしまってすまない。",
                "どんな代償を払っても構わない。俺はお前を取り戻す。",
                "死は……まだ許されない。",
            },
            "Bernhard" => new[]
            {
                "灰になった王国の記憶が、今も俺を縛っている。",
                "死んでいった仲間たちの顔が浮かぶ。俺だけが生き残った理由を、まだ見つけられていない。",
                "だが、剣を捨てる気はない。この手で贖罪を果たすまでは。",
            },
            "Lavinia" => new[]
            {
                "また体が軽い。……いや、これが本当の衰えというものか。",
                "契約の代償は確実に私の時間を奪っていく。それでも、力を手放すつもりはない。",
                "この旅で何かが変わるかもしれない。そんな予感がする。",
            },
            "Lilia" => new[]
            {
                "神様、どうか私に力を貸してください。",
                "傷ついた人を癒したい。ただそれだけのために、私はここにいる。",
                "怖くない、とは言えないけれど。……進まなきゃ。",
            },
            _ => new[] { "……行くか。" },
        };
    }
}
