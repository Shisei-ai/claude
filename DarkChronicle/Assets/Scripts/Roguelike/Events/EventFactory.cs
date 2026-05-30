using System.Collections.Generic;
using UnityEngine;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike.Events
{
    /// <summary>
    /// Programmatically creates all 40 RandomEventData instances at runtime.
    /// Called by RandomEventManager.InitForRun() when the inspector pool is empty.
    ///
    /// Three floors:
    ///   Floor 0–1  廃墟         (10 events)
    ///   Floor 2–3  暗黒の森     (10 events)
    ///   Floor 4–5  呪われた城   (10 events)
    ///   Any floor  特別イベント  (10 events)
    /// </summary>
    public static class EventFactory
    {
        public static List<RandomEventData> CreateAllEvents()
        {
            var list = new List<RandomEventData>();

            // ── 廃墟（フロア 0–1）────────────────────────────────────────────
            list.Add(AncientAltar());
            list.Add(WoundedKnight());
            list.Add(MysteriousChest());
            list.Add(CorruptedSpring());
            list.Add(RuinedLibrary());
            list.Add(ScavengersDeal());
            list.Add(ForgottenGrave());
            list.Add(DemonicPact());
            list.Add(VoiceInTheDark());
            list.Add(AbandonedCamp());

            // ── 暗黒の森（フロア 2–3）────────────────────────────────────────
            list.Add(TalkingRaven());
            list.Add(MoonshadowPuddle());
            list.Add(WitchsCauldron());
            list.Add(BloodTree());
            list.Add(LostMerchant());
            list.Add(FaeringAmbush());
            list.Add(DruidCircle());
            list.Add(SpiritWell());
            list.Add(BanditCamp());
            list.Add(MirrorLake());

            // ── 呪われた城（フロア 4–5）──────────────────────────────────────
            list.Add(ShadowCouncil());
            list.Add(PhantomArmoury());
            list.Add(DarkSanctum());
            list.Add(TreasureVault());
            list.Add(FallenHero());
            list.Add(CursedPortrait());
            list.Add(GrimReapersDeal());
            list.Add(SoulCage());
            list.Add(DespairChamber());
            list.Add(FinalBlessing());

            // ── 特別イベント（全フロア）──────────────────────────────────────
            list.Add(GamblersTavern());
            list.Add(MysteriousTrader());
            list.Add(DivineSanctuary());
            list.Add(ChaoticRift());
            list.Add(BloodForKnowledge());
            list.Add(SkillForgery());
            list.Add(LuckyShrine());
            list.Add(DarkMirror());
            list.Add(TimeEchoChamber());
            list.Add(SovereignsTrial());

            // ── エンディング分岐（1回限り・全フロア）────────────────────────
            list.Add(DemonKingsBeckoning());
            list.Add(AbyssGazing());
            list.Add(TimesWhisper());
            list.Add(CursedCrowns());
            list.Add(TrueCoreEcho());

            return list;
        }

        // ════════════════════════════════════════════════════════════════════
        //   廃墟（フロア 0–1）
        // ════════════════════════════════════════════════════════════════════

        static RandomEventData AncientAltar() => Ev(
            EventLibrary.AncientAltar, "古の祭壇",
            "廃墟の中心に、黒い石でできた祭壇が佇んでいる。\n" +
            "供物の血が乾いた跡が無数に刻まれ、何者かの意志が今も宿っているようだ。\n" +
            "祭壇は何かを待ち望んでいるかのように、かすかに脈動している。",
            minFloor: 0, maxFloor: 1, tint: new Color(0.5f, 0.35f, 0.25f),
            Choice("血を捧げる",
                   "最大HPの15%を失うが、神秘の力を受け取る。",
                   Res("あなたの血が祭壇に吸い込まれ、代わりに暗い輝きを放つ遺物が現れた。",
                       hp: -0.15f, relic: true, relicPool: RelicRarity.Uncommon)),
            Choice("ゴールドを捧げる", "50Gが必要。",
                   Res("金貨が祭壇の上で溶け、レアな宝物と化した。",
                       goldChange: -50, relic: true, relicPool: RelicRarity.Rare),
                   gold: 50),
            Choice("立ち去る",
                   Res("祭壇は沈黙した。"))
        );

        static RandomEventData WoundedKnight() => Ev(
            EventLibrary.WoundedKnight, "傷ついた騎士",
            "崩れた柱の陰に、重傷を負った騎士が倒れている。\n" +
            "かつての栄光を示す紋章が刻まれた鎧は、今や血と泥で汚れていた。\n" +
            "「……頼む、ここから出してくれ……」と、彼はかろうじて呟く。",
            minFloor: 0, maxFloor: 1, tint: new Color(0.55f, 0.5f, 0.45f),
            Choice("助ける",
                   "HP10%を使って騎士を助ける。",
                   Res("騎士は深く頭を下げ、路銀と感謝の言葉を残して去っていった。心が少し軽くなった気がする。",
                       hp: -0.10f, goldChange: 40, sanity: 1)),
            Choice("持ち物を漁る",
                   Res("騎士が弱々しく抵抗する中、ポーチからいくらかのゴールドを奪った。後味の悪い選択だ。",
                       goldChange: 30)),
            Choice("通り過ぎる",
                   Res("騎士の嗚咽が遠ざかる。"))
        );

        static RandomEventData MysteriousChest() => Ev(
            EventLibrary.MysteriousChest, "謎めいた宝箱",
            "廊下の奥に、埃をかぶった大きな宝箱がある。\n" +
            "鍵穴には見慣れない紋章が彫られ、かすかに金属的な匂いが漂っている。\n" +
            "罠か、それとも本物の宝か――判断がつかない。",
            minFloor: 0, maxFloor: 2, tint: new Color(0.6f, 0.55f, 0.3f),
            Choice("思い切って開ける",
                   Res("箱の中には宝の山が！……だが同時に、毒針が飛んできた。",
                       goldChange: 60, hp: -0.20f)),
            Choice("慎重に調べてから開ける",
                   Res("罠を解除し、少ないながらも確実な報酬を手に入れた。",
                       goldChange: 30)),
            Choice("無視する",
                   Res("宝箱は誰にも開かれることなく、廃墟に残された。"))
        );

        static RandomEventData CorruptedSpring() => Ev(
            EventLibrary.CorruptedSpring, "腐った泉",
            "石造りの泉に、黒と緑が混ざった水が湛えられている。\n" +
            "奇妙なことに、水面からは甘い香りが漂い、不思議な光が揺れていた。\n" +
            "これが回復の泉か、あるいは何か別のものか。",
            minFloor: 0, maxFloor: 2, tint: new Color(0.3f, 0.45f, 0.35f),
            Choice("飲む",
                   Res("水は喉を焼くように冷たく……しかし傷が癒えていく。あるいは何かが体に根付いた。",
                       hp: 0.30f, curse: true)),
            Choice("少しだけ飲む",
                   Res("慎重に少量だけ飲むと、じわじわと体力が戻ってきた。",
                       hp: 0.15f)),
            Choice("立ち去る",
                   Res("後ろ髪を引かれながらも、判断力を信じて去った。"))
        );

        static RandomEventData RuinedLibrary() => Ev(
            EventLibrary.RuinedLibrary, "廃墟の図書館",
            "天井が崩れ落ちた書庫に、古い書物が散乱している。\n" +
            "大半は読めないほど傷んでいるが、その中にひときわ輝く数冊が目に留まった。\n" +
            "知識は力だ――ただし、代償を払えるならば。",
            minFloor: 0, maxFloor: 1, tint: new Color(0.45f, 0.4f, 0.55f),
            Choice("魔法書を読む",
                   Res("古代の術式が脳裏に焼き付いた。新たなスキルを習得できる。",
                       skillDraft: true, skillCount: 3)),
            Choice("貴重な本を売れそうな本をまとめる",
                   Res("学術的価値のある本を数冊まとめた。商人に高く売れるだろう。",
                       goldChange: 50)),
            Choice("そっと立ち去る",
                   Res("かつて誰かが大切にした本たちを、そのままにしておいた。"))
        );

        static RandomEventData ScavengersDeal() => Ev(
            EventLibrary.ScavengersDeal, "スカベンジャーの取引",
            "廃材を漁っていた男が話しかけてくる。\n" +
            "「旅人よ、こいつを買ってくれないか？　廃墟の奥で拾った代物だ」\n" +
            "彼の荷物の中に、興味深い品がいくつか見える。",
            minFloor: 0, maxFloor: 2, tint: new Color(0.55f, 0.5f, 0.4f),
            Choice("ゴールドで購入（80G）",
                   "80Gを支払う。",
                   Res("男は満足そうにゴールドを受け取り、レアな遺物を手渡した。",
                       goldChange: -80, relic: true, relicPool: RelicRarity.Rare),
                   gold: 80),
            Choice("スキルを売り渡す",
                   Res("甲巻物をスカベンジャーに渡す代わりに、大量のゴールドを受け取った。デッキから1つスキルが消える。",
                       goldChange: 100, removeSkill: true)),
            Choice("断る",
                   Res("男は肩をすくめ、再び廃材の山に戻っていった。"))
        );

        static RandomEventData ForgottenGrave() => Ev(
            EventLibrary.ForgottenGrave, "忘れられた墓",
            "苔むした墓標が、人気のない場所にひっそりと立っている。\n" +
            "名前は読めないが、誰かがここに眠っていることだけは確かだ。\n" +
            "この墓には何かが隠されているかもしれない。",
            minFloor: 0, maxFloor: 1, tint: new Color(0.4f, 0.4f, 0.45f),
            Choice("墓を掘り返す",
                   Res("土の中から古い小袋が出てきた。しかし掘り返した代償か、悪い気が漂い始めた。",
                       goldChange: 50, curse: true)),
            Choice("祈りを捧げる",
                   Res("静かに手を合わせると、安らかな気配が周囲を包み込んだ。体の傷が癒えていく。",
                       hp: 0.20f)),
            Choice("通り過ぎる",
                   Res("死者を安らかに眠らせてやった。"))
        );

        static RandomEventData DemonicPact() => Ev(
            EventLibrary.DemonicPact, "悪魔の契約",
            "暗闇の中から影が現れた。人の形をしているが、確かに人ではない。\n" +
            "「勇者よ、取引をしよう。汝の命の一部と引き換えに、我が力を授けよう」\n" +
            "低い声が空気を震わせ、その目は暗紅色に輝いている。",
            minFloor: 0, maxFloor: 5, oneTime: true, tint: new Color(0.5f, 0.1f, 0.3f),
            sanityWeight: 0.2f,
            Choice("契約する",
                   Res("最大HPが大きく削られたが、悪魔は約束通り二つの遺物を置いていった。",
                       maxHP: -30, relic: true, relicPool: RelicRarity.Rare)),
            Choice("拒絶する",
                   Res("悪魔は低く笑い、「いつかまた会おう」と呟いて消えた。"))
        );

        static RandomEventData VoiceInTheDark() => Ev(
            EventLibrary.VoiceInTheDark, "暗闇の声",
            "廃墟の奥深くから、低く呼びかける声が聞こえる。\n" +
            "「……こちらへ来い……知識を与えよう……」\n" +
            "声の出所は全く見えない。従うか、無視するか。",
            minFloor: 0, maxFloor: 2, tint: new Color(0.3f, 0.25f, 0.45f),
            Choice("声に従う",
                   Res("暗闇の奥に踏み込むと、不思議な力が体を包んだ。心の何かが揺れた気がする。",
                       hp: 0.20f, sanity: 1)),
            Choice("声に応える",
                   "HP10%を失うが、知識を得られるかもしれない。",
                   Res("声は喜んだようで、古い術式を授けてくれた。しかし体の一部が消耗した。",
                       hp: -0.10f, skillDraft: true, skillCount: 2)),
            Choice("無視する",
                   Res("声は次第に遠ざかり、やがて沈黙した。"))
        );

        static RandomEventData AbandonedCamp() => Ev(
            EventLibrary.AbandonnedCamp, "捨てられた野営地",
            "廃墟の中に、まだ温もりが残る野営地の跡がある。\n" +
            "消えたたき火、散らばった食料、倒れたテント……\n" +
            "どうやら最近まで誰かがここで生活していたようだ。",
            minFloor: 0, maxFloor: 1, tint: new Color(0.5f, 0.45f, 0.35f),
            Choice("物資を漁る",
                   Res("残された食料と少々のゴールドを見つけた。お腹も膨れ、傷も癒える。",
                       goldChange: 35, hp: 0.10f)),
            Choice("罠を確認してから漁る",
                   Res("用心した甲斐があった。少ないが、安全に物資を確保できた。",
                       goldChange: 20)),
            Choice("ゆっくり休む",
                   Res("温もりの残るテントで少し休んだ。体力が回復した。",
                       hp: 0.25f))
        );

        // ════════════════════════════════════════════════════════════════════
        //   暗黒の森（フロア 2–3）
        // ════════════════════════════════════════════════════════════════════

        static RandomEventData TalkingRaven() => Ev(
            EventLibrary.TalkingRaven, "喋るカラス",
            "一羽の黒いカラスが、目線の高さの枝に止まりこちらを見つめている。\n" +
            "「旅人よ、迷っているのか？　この森には危険が潜む」\n" +
            "その声は人の言葉だった。カラスは知恵ある目で語りかける。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.2f, 0.2f, 0.3f), oneTime: false, sanityWeight: 0.3f,
            Choice("カラスの話を聞く",
                   Res("カラスは森の秘密をいくつか語ってくれた。知識を得て、心が少し落ち着いた気がする。",
                       sanity: 1)),
            Choice("カラスを捕まえようとする",
                   Res("カラスは素早く飛び去り、金切り声で不吉な叫びを残した。何か嫌な予感がする。",
                       goldChange: 20, sanity: -1)),
            Choice("立ち去る",
                   Res("カラスは静かに見送った。"))
        );

        static RandomEventData MoonshadowPuddle() => Ev(
            EventLibrary.MoonshadowPuddle, "月影の水溜り",
            "木々の隙間から差し込む月光が、道端の水溜りに映り込んでいる。\n" +
            "しかしその水面には、月ではなく見知らぬ星座が映っていた。\n" +
            "神秘的な輝きが揺れ、何かを語りかけているようだ。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.2f, 0.3f, 0.55f),
            Choice("水面を覗き込む",
                   Res("星座の導きで、古いスキルの知識が浮かび上がった。",
                       skillDraft: true, skillCount: 3)),
            Choice("水を飲む",
                   Res("冷たく澄んだ水が体に染み渡り、傷が癒えると共に体が少し強くなった。",
                       hp: 0.20f, maxHP: 10)),
            Choice("立ち去る",
                   Res("水面の輝きが静かに消えていった。"))
        );

        static RandomEventData WitchsCauldron() => Ev(
            EventLibrary.WitchsCauldron, "魔女の大釜",
            "森の開けた場所に、巨大な鉄製の大釜がある。\n" +
            "まだ火が灯っており、中には黒い液体がぐつぐつと煮立っていた。\n" +
            "周囲には奇妙な薬草と骨の欠片が散らばっている。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.25f, 0.45f, 0.35f),
            Choice("何かを入れてみる（50G）",
                   "50Gを使う。何が出てくるかわからない。",
                   Res("金貨が液体に溶け込むと、大釜から輝く遺物が浮かび上がった。",
                       goldChange: -50, relic: true, relicPool: RelicRarity.Uncommon),
                   gold: 50),
            Choice("鍋の中を確認する",
                   "危険かもしれない。",
                   Res("顔を近づけた瞬間、蒸気が噴き出した。しかし同時に、何かが頭の中で閃いた。",
                       hp: -0.10f, skillDraft: true, skillCount: 2)),
            Choice("立ち去る",
                   Res("大釜は誰にも邪魔されず、静かに煮え続けた。"))
        );

        static RandomEventData BloodTree() => Ev(
            EventLibrary.BloodTree, "血の木",
            "真っ黒な幹から、深紅の樹液がしたたり落ちている。\n" +
            "傷口のような裂け目が幹全体に走り、木は呻くような音を立てていた。\n" +
            "この液体は毒か、あるいは禁じられた薬か。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.5f, 0.15f, 0.2f),
            Choice("樹液を集めて飲む",
                   "HPを20%失うが、強烈な効果があるかもしれない。",
                   Res("喉が焼けるように熱い。しかし体の奥底から力が湧き出てきた。",
                       hp: -0.20f, relic: true, relicPool: RelicRarity.Uncommon)),
            Choice("木を調べる",
                   Res("根元に古い財布が埋まっているのを発見した。",
                       goldChange: 40)),
            Choice("木を燃やす",
                   Res("木は断末魔の叫びを上げ、炎上した。しかし何かが目覚めたようで、敵が現れた！",
                       battle: true, elite: false))
        );

        static RandomEventData LostMerchant() => Ev(
            EventLibrary.LostMerchant, "迷子の商人",
            "森の中で荷物を背負った男性が途方に暮れている。\n" +
            "「助かった！　道に迷ってしまって……どうか街まで案内してもらえませんか」\n" +
            "大量の荷物の中に、面白そうな品が見える。",
            minFloor: 2, maxFloor: 4, tint: new Color(0.4f, 0.45f, 0.35f),
            Choice("案内してあげる",
                   "HPを5%使って商人を守りながら進む。",
                   Res("商人は感謝しながら大量のゴールドと商品を置いていった。",
                       hp: -0.05f, goldChange: 60, relic: true, relicPool: RelicRarity.Common)),
            Choice("品物を購入する（40G）",
                   "40Gで商人の品を購入する。",
                   Res("商人から役立つ品を買った。",
                       goldChange: -40, relic: true, relicPool: RelicRarity.Common),
                   gold: 40),
            Choice("立ち去る",
                   Res("商人の「お待ちを！」という声を背に、森を進んだ。"))
        );

        static RandomEventData FaeringAmbush() => Ev(
            EventLibrary.FaeringAmbush, "妖精の奇襲",
            "突然、全身から光を放つ小さな存在たちに囲まれた。\n" +
            "妖精だ。彼らは笑い声を立てながら、あなたの荷物に手を伸ばしてくる。\n" +
            "「人間の宝はいただき！　でも戦っても構わないよ？」",
            minFloor: 2, maxFloor: 3, tint: new Color(0.55f, 0.45f, 0.65f),
            Choice("戦う",
                   Res("妖精たちは強敵だったが、退けることができた。彼らの宝が残された。",
                       battle: true, elite: true)),
            Choice("交渉する（30G）",
                   "30Gを差し出す。",
                   Res("妖精たちはゴールドを受け取って喜び、お礼に呪いを解いてくれた。",
                       goldChange: -30, removeCurse: true),
                   gold: 30),
            Choice("逃げる",
                   Res("必死で逃げたが、妖精の悪戯で少し傷を負った。",
                       hp: -0.10f))
        );

        static RandomEventData DruidCircle() => Ev(
            EventLibrary.DruidCircle, "ドルイドの輪",
            "直径5メートルほどの石の輪が、清浄な気配に包まれていた。\n" +
            "古代のドルイドたちが儀式を行った場所だという。\n" +
            "輪の中央に立つと、自然の力が体に染み込んでくる気がした。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.3f, 0.5f, 0.3f),
            Choice("儀式に参加する",
                   Res("大地の力が体を満たした。傷が癒え、体が少し強くなった。",
                       hp: 0.30f, maxHP: 15)),
            Choice("石を一つ持ち帰る",
                   Res("不思議な力を宿した石を手に入れた。心がじんわりと温かくなった気がする。",
                       sanity: 1, goldChange: 30)),
            Choice("立ち去る",
                   Res("神聖な場所を乱さずに立ち去った。"))
        );

        static RandomEventData SpiritWell() => Ev(
            EventLibrary.SpiritWell, "精霊の井戸",
            "苔むした石造りの井戸から、淡い光が溢れている。\n" +
            "「願いを言え。ただし、望むものはひとつだけだ」\n" +
            "精霊の声が、井戸の中から静かに響いた。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.35f, 0.4f, 0.6f), oneTime: false, sanityWeight: 0.2f,
            Choice("回復を望む",
                   Res("柔らかな光が体を包み込み、全ての傷が消えた。",
                       fullHeal: true)),
            Choice("力を望む",
                   Res("力への渇望が精霊に伝わり、新たな術の知識が授けられた。",
                       skillDraft: true, skillCount: 3)),
            Choice("富を望む",
                   Res("井戸の底から金貨が次々と飛び出してきた。",
                       goldChange: 80))
        );

        static RandomEventData BanditCamp() => Ev(
            EventLibrary.BanditCamp, "山賊のキャンプ",
            "木々の向こうに炎が見え、酔っ払いの笑い声が聞こえる。\n" +
            "山賊たちのアジトだ。奪われた旅人の荷物が山積みになっている。\n" +
            "どう対処するか。",
            minFloor: 2, maxFloor: 3, tint: new Color(0.5f, 0.35f, 0.25f),
            Choice("正面から奇襲する",
                   Res("山賊たちを打ち倒した。盗まれた財宝が戦利品として残った。",
                       battle: true, elite: false)),
            Choice("こっそり盗みに入る",
                   Res("上手く忍び込んで金を盗んだ。……ただし、帰り際に見つかってしまった。",
                       goldChange: 60, hp: -0.15f)),
            Choice("迂回する",
                   Res("山賊と関わらずに別の道を進んだ。"))
        );

        static RandomEventData MirrorLake() => Ev(
            EventLibrary.MirrorLake, "鏡の湖",
            "風も吹かないのに、湖面が鏡のように静まり返っている。\n" +
            "水面には過去の自分の姿が映っていた。後悔、悲しみ、そして希望。\n" +
            "この湖には特別な力があるという。",
            minFloor: 2, maxFloor: 3, oneTime: true, tint: new Color(0.25f, 0.35f, 0.55f),
            sanityWeight: 0.15f,
            Choice("過去を見つめる",
                   Res("水面に映る記憶が体に流れ込み、最大HPが増した。しかし何か暗いものも残った気がする。",
                       maxHP: 20, curse: true)),
            Choice("湖に手を触れる",
                   Res("湖の力が呪いを洗い流した。水面に触れた瞬間、心の霧が晴れていくようだった。",
                       removeCurse: true, sanity: 1)),
            Choice("立ち去る",
                   Res("湖は静かに波紋を描いた。"))
        );

        // ════════════════════════════════════════════════════════════════════
        //   呪われた城（フロア 4–5）
        // ════════════════════════════════════════════════════════════════════

        static RandomEventData ShadowCouncil() => Ev(
            EventLibrary.ShadowCouncil, "影の会議",
            "空中に浮かぶ影たちが、密やかに話し合っている。\n" +
            "この城の主について、次の戦いについて……\n" +
            "彼らはまだこちらに気づいていないようだ。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.2f, 0.15f, 0.35f),
            Choice("盗み聞きする",
                   Res("敵の弱点と戦術を知ることができた。情報を得て、精神的な余裕が生まれた。",
                       sanity: 1, relic: true, relicPool: RelicRarity.Common)),
            Choice("仲間に加わる",
                   Res("影たちに認められ、強力な遺物を得た。しかし彼らとの契約が新たな呪縛となった。",
                       relic: true, relicPool: RelicRarity.Rare, curse: true)),
            Choice("逃げる",
                   Res("気づかれる前にその場を離れた。"))
        );

        static RandomEventData PhantomArmoury() => Ev(
            EventLibrary.PhantomArmoury, "幻の武器庫",
            "透き通った幽霊の鎧や剣が壁に飾られている部屋に迷い込んだ。\n" +
            "触れようとすると手が通り抜けるが、集中すれば実体化させられそうだ。\n" +
            "この力を自分のものにできるだろうか。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.35f, 0.4f, 0.55f),
            Choice("武器を実体化させる",
                   "HP10%を消費して集中する。",
                   Res("幻の刃が手の中で実体化した。その力が術式の知識として刻まれた。",
                       hp: -0.10f, skillDraft: true, skillCount: 3)),
            Choice("鎧を実体化させる",
                   "HP10%を消費して集中する。",
                   Res("幻の鎧が体を包んだ瞬間、消えてしまった。しかしその強度が最大HPとして残った。",
                       hp: -0.10f, maxHP: 30)),
            Choice("立ち去る",
                   Res("幻の武器庫は静かに佇み続けた。"))
        );

        static RandomEventData DarkSanctum() => Ev(
            EventLibrary.DarkSanctum, "暗黒の祭壇",
            "黒い炎が灯る祭壇が、圧倒的な邪気を放っている。\n" +
            "しかしよく見ると、その炎の中に封じられた呪いが揺らめいていた。\n" +
            "ここには浄化の力もあるかもしれない。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.4f, 0.1f, 0.45f),
            Choice("力を奉納する",
                   "最大HPを20失うが……",
                   Res("祭壇は最大HPを吸い取り、代わりに呪われた強力な遺物を与え、呪いを一つ解いた。",
                       maxHP: -20, relic: true, relicPool: RelicRarity.Cursed, removeCurse: true)),
            Choice("光で浄化する",
                   Res("聖なる光を当てると、祭壇は轟音と共に砕けた。呪いが消えていく……",
                       removeCurse: true, removeCurseCount: 99)),
            Choice("立ち去る",
                   Res("邪気に当てられないよう、急いで立ち去った。"))
        );

        static RandomEventData TreasureVault() => Ev(
            EventLibrary.TreasureVault, "財宝の間",
            "金貨、宝石、古代の遺物……この部屋には信じられないほどの財宝が積み上げられている。\n" +
            "しかし入口には無数の罠の跡があり、天井には不審な染みが広がっていた。\n" +
            "欲張れば欲張るほど、危険も増す。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.6f, 0.5f, 0.2f),
            Choice("全て持っていく",
                   Res("大量のゴールドを手に入れたが、出口で罠が作動し呪いにかかった。",
                       goldChange: 150, curse: true)),
            Choice("慎重に選んで持つ",
                   Res("罠を避けながら、確実に価値あるものだけを持ち出した。",
                       goldChange: 80)),
            Choice("ひとつだけ持つ",
                   Res("最も安全な品をひとつだけ選んだ。欲を抑えた判断だ。",
                       goldChange: 40))
        );

        static RandomEventData FallenHero() => Ev(
            EventLibrary.FallenHero, "倒れた英雄",
            "城の廊下に、かつての英雄の遺体が安らかに横たわっている。\n" +
            "その手には、長い旅を物語るように、傷だらけだが輝く遺物が握られていた。\n" +
            "この英雄の意志を受け継ぐことができるか。",
            minFloor: 4, maxFloor: 5, oneTime: true, tint: new Color(0.5f, 0.45f, 0.6f),
            sanityWeight: 0.25f,
            Choice("形見を受け取る",
                   Res("英雄の意志が宿った遺物を手に取った。その重さが使命感を与えてくれる。",
                       relic: true, relicPool: RelicRarity.Boss)),
            Choice("祈りを捧げる",
                   Res("静かに祈ると、英雄の魂が感謝するように全ての傷を癒やしてくれた。心に平穏が宿った。",
                       fullHeal: true, sanity: 1)),
            Choice("立ち去る",
                   Res("英雄を静かに安らかに眠らせてやった。"))
        );

        static RandomEventData CursedPortrait() => Ev(
            EventLibrary.CursedPortrait, "呪われた肖像画",
            "廊下に飾られた肖像画の中の人物が、こちらを見て微笑んでいる。\n" +
            "しかしその笑みは徐々に歪み、口が動いて何かを語りかけてきた。\n" +
            "「お前はここで何を探している？」",
            minFloor: 4, maxFloor: 5, tint: new Color(0.5f, 0.35f, 0.5f),
            Choice("肖像画を見つめ返す",
                   Res("絵の中の視線が急に変わり、強烈なビジョンが頭に流れ込んだ。何かが変わった……",
                       relic: true, relicPool: RelicRarity.Uncommon, curse: true)),
            Choice("肖像画を切り裂く",
                   Res("キャンバスが裂けると共に、呪いの気配が消えた。しかしゴールドを失った気がする。",
                       goldChange: -20, removeCurse: true)),
            Choice("目を逸らして通り過ぎる",
                   Res("絵は何事もなかったように静まった。"))
        );

        static RandomEventData GrimReapersDeal() => Ev(
            EventLibrary.GrimReapersDeal, "死神の取引",
            "鎌を持った影が、ゆっくりと近づいてくる。\n" +
            "「汝の命を少し借りよう。その代わり、我が持つ宝を授けよう」\n" +
            "逃げる選択肢はない。ここで答えを出すしかない。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.15f, 0.1f, 0.2f), oneTime: true, sanityWeight: 0f,
            Choice("命を担保にする",
                   Res("HPが極限まで削られた。しかし死神は約束通り、二つの強力な遺物を残した。",
                       hp: -0.89f, relic: true, relicPool: RelicRarity.Cursed)),
            Choice("断る",
                   Res("「残念だ」と呟き、死神は去っていった。しかしその鎌の一振りで少し傷を負った。",
                       hp: -0.05f))
        );

        static RandomEventData SoulCage() => Ev(
            EventLibrary.SoulCage, "魂の檻",
            "鉄格子の中に、青白い炎として閉じ込められた魂たちが揺らめいている。\n" +
            "「……助けてくれ……」「……一緒に連れていって……」\n" +
            "魂たちは必死に訴えかけてくるが、その力を利用することもできそうだ。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.3f, 0.3f, 0.6f),
            Choice("魂を解放する",
                   Res("魂たちは感謝の光を放ちながら昇っていった。その加護で体が強くなり、心も穏やかになった。",
                       maxHP: 20, sanity: 1)),
            Choice("魂の力を吸収する",
                   Res("魂たちの力が体に流れ込んだ。傷が癒えたが、怨念が僅かに残った気がする。",
                       hp: 0.30f, curse: true)),
            Choice("無視する",
                   Res("魂の嘆きが背後で続く。"))
        );

        static RandomEventData DespairChamber() => Ev(
            EventLibrary.DespairChamber, "絶望の間",
            "この部屋に入った瞬間、絶望的な感情が全身を包み込んだ。\n" +
            "過去の失敗、後悔、恐怖……暗黒の感情が波のように押し寄せる。\n" +
            "しかし、この試練を乗り越えることで何かを得られるかもしれない。",
            minFloor: 4, maxFloor: 5, tint: new Color(0.2f, 0.15f, 0.25f),
            Choice("恐怖に立ち向かう",
                   "最大HPを10失うが、呪いを全て払える。",
                   Res("全ての闇を受け入れることで、それらを乗り越えた。呪いが消えていく……",
                       maxHP: -10, removeCurse: true, removeCurseCount: 99)),
            Choice("絶望に沈む",
                   Res("感情の嵐に流されてしまった。体も心もひどく傷ついた。",
                       hp: -0.20f, curse: true)),
            Choice("素早く通り抜ける",
                   Res("走り抜けることで何とか耐えた。少し傷を負ったが、最小限の被害だ。",
                       hp: -0.05f))
        );

        static RandomEventData FinalBlessing() => Ev(
            EventLibrary.FinalBlessing, "最後の祝福",
            "城の奥の礼拝堂。朽ちた建物の中で、一点だけ神聖な光が差し込んでいる。\n" +
            "この光は確かに、あなたを待っていた。\n" +
            "最終決戦の前に、どんな力を望むか。",
            minFloor: 4, maxFloor: 5, oneTime: true, tint: new Color(0.8f, 0.75f, 0.5f),
            sanityWeight: 0.5f,
            Choice("力の祝福を受ける",
                   Res("戦いのための新たな術が授けられた。",
                       skillDraft: true, skillCount: 3)),
            Choice("癒やしの祝福を受ける",
                   Res("柔らかな光が全ての傷を癒やし、さらに体を強くした。",
                       fullHeal: true, maxHP: 30)),
            Choice("精神の祝福を受ける",
                   Res("聖なる光が心の澱を洗い流し、精神が研ぎ澄まされた。ゴールドも降り注いできた。",
                       sanity: 2, goldChange: 100))
        );

        // ════════════════════════════════════════════════════════════════════
        //   特別イベント（全フロア対応）
        // ════════════════════════════════════════════════════════════════════

        static RandomEventData GamblersTavern() => Ev(
            EventLibrary.GamblersTavern, "賭博師の酒場",
            "廃墟の一角に、なぜか賑やかな酒場が営業していた。\n" +
            "「さあ旅人、一勝負いかがかね？」\n" +
            "カードを持った男が、挑戦的な笑みを浮かべている。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.55f, 0.4f, 0.25f), oneTime: false, sanityWeight: 0.35f,
            Choice("大きく賭ける（100G）",
                   "100Gを賭ける。勝てば200G、負ければ50G返却。",
                   Res("運試しの結果……大きく勝った！",
                       goldChange: 100),
                   gold: 100),
            Choice("小さく賭ける（30G）",
                   "30Gを賭ける。",
                   Res("慎重な賭けが実を結び、少し増えて返ってきた。",
                       goldChange: 30),
                   gold: 30),
            Choice("飲むだけにする（20G）",
                   "20Gでお酒を飲む。",
                   Res("旨い酒で疲れが取れた。賭け事より休息が大事だ。",
                       goldChange: -20, hp: 0.10f),
                   gold: 20)
        );

        static RandomEventData MysteriousTrader() => Ev(
            EventLibrary.MysteriousTrader, "謎の行商人",
            "どこからともなく現れた行商人が、不思議な品を広げて見せた。\n" +
            "「どこにも売っていない、本物の逸品だよ」\n" +
            "確かに、その品は見たことのない輝きを放っている。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.4f, 0.35f, 0.5f), oneTime: false, sanityWeight: 0.3f,
            Choice("特別な品を購入（120G）",
                   "120Gを支払う。",
                   Res("商人から希少な遺物を購入した。どこにも売っていない代物だ。",
                       goldChange: -120, relic: true, relicPool: RelicRarity.Event),
                   gold: 120),
            Choice("普通の品を購入（70G）",
                   "70Gを支払う。",
                   Res("珍しい遺物を手に入れた。まずまずの取引だ。",
                       goldChange: -70, relic: true, relicPool: RelicRarity.Uncommon),
                   gold: 70),
            Choice("断る",
                   Res("商人は軽く肩をすくめ、霧の中に消えた。"))
        );

        static RandomEventData DivineSanctuary() => Ev(
            EventLibrary.DivineSanctuary, "神聖なる聖域",
            "この場所だけが、闇の中に完全な安全地帯として存在している。\n" +
            "聖なる光が満ち、敵も悪意も近づくことができない特別な場所。\n" +
            "ここで何を望むか。",
            minFloor: 0, maxFloor: 5, oneTime: true, tint: new Color(0.9f, 0.85f, 0.6f),
            sanityWeight: 0.5f,
            Choice("癒やしの泉で休む",
                   Res("心身の全ての傷が癒やされた。完全な回復だ。",
                       fullHeal: true)),
            Choice("瞑想して力を蓄える",
                   Res("静かな瞑想で体が強化され、精神が安定してきた気がした。",
                       maxHP: 20, sanity: 1)),
            Choice("次の戦いに備える",
                   Res("聖域の知恵が新たなスキルを啓示した。",
                       skillDraft: true, skillCount: 4))
        );

        static RandomEventData ChaoticRift() => Ev(
            EventLibrary.ChaoticRift, "混沌の亀裂",
            "空間が裂け、次元の亀裂が目の前に広がっている。\n" +
            "その中からは、ありとあらゆる可能性が覗いていた。\n" +
            "何が起きるかは神のみぞ知る。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.4f, 0.3f, 0.7f),
            Choice("亀裂に飛び込む",
                   Res("混沌の力がランダムに作用した。何が起きるかわからなかったが……不思議と心が落ち着いた。",
                       hp: 0.25f, goldChange: 50, sanity: 1)),
            Choice("端から観察する",
                   Res("安全な距離から亀裂を観察することで、次元の知識を得た。知ることで恐怖が薄れた。",
                       sanity: 1)),
            Choice("亀裂を閉じる",
                   Res("亀裂を封印すると、その反動で体が強化された。",
                       maxHP: 40, removeCurse: true))
        );

        static RandomEventData BloodForKnowledge() => Ev(
            EventLibrary.BloodForKnowledge, "知識と血の取引",
            "本棚が床から天井まで続く秘密の書庫。\n" +
            "しかし扉には「知識の代償は血」と刻まれている。\n" +
            "より多くの知識には、より多くの代償が必要だ。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.45f, 0.15f, 0.2f),
            Choice("多くの血を捧げる",
                   "最大HPの30%を失う。",
                   Res("大量の血が書庫に吸い込まれ、5冊の魔法書が輝きを放った。",
                       hp: -0.30f, skillDraft: true, skillCount: 5)),
            Choice("少しの血を捧げる",
                   "最大HPの10%を失う。",
                   Res("少量の血で、2冊の魔法書が開かれた。",
                       hp: -0.10f, skillDraft: true, skillCount: 2)),
            Choice("断る",
                   Res("書庫の扉は固く閉ざされたままだ。"))
        );

        static RandomEventData SkillForgery() => Ev(
            EventLibrary.SkillForgery, "スキル鍛冶屋",
            "金槌の音が響く小屋の中に、腕の立つ鍛冶師がいた。\n" +
            "しかし彼が鍛えるのは剣や鎧ではなく、術式そのものだという。\n" +
            "「スキルを改造してやろうか？」",
            minFloor: 0, maxFloor: 5, tint: new Color(0.5f, 0.4f, 0.25f),
            Choice("スキルを強化する（100G）",
                   "100Gでスキルを一つランダムに強化する。",
                   Res("鍛冶師の技術でスキルが強化された。",
                       goldChange: -100, skillDraft: true, skillCount: 1),
                   gold: 100),
            Choice("スキルを精錬する",
                   "HP15%を代償に、より多くのスキルを習得できる。",
                   Res("HP を代償に、精錬された術の知識が授けられた。",
                       hp: -0.15f, skillDraft: true, skillCount: 3)),
            Choice("古いスキルを売る",
                   Res("不要なスキルを売り払い、金を得た。",
                       removeSkill: true, goldChange: 80))
        );

        static RandomEventData LuckyShrine() => Ev(
            EventLibrary.LuckyShrine, "安寧の祠",
            "小さな社に、穏やかな表情の地蔵が祀られている。\n" +
            "「心の平安を授けよう……誠実な心を持つ者には」\n" +
            "像の周囲に、静かな光が揺れている。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.6f, 0.55f, 0.3f), oneTime: false, sanityWeight: 0.4f,
            Choice("賽銭を投げる（10G）",
                   "10Gを賽銭として捧げる。",
                   Res("コインが清浄な光を放ちながら社に吸い込まれ、心の澱が流れ落ちた。",
                       goldChange: -10, sanity: 1, removeCurse: true),
                   gold: 10),
            Choice("全財産を捧げる",
                   Res("全てのゴールドを捧げると、地蔵が大きく光った。精神が極限まで研ぎ澄まされた。",
                       goldChange: -9999, sanity: 3)),
            Choice("ただ手を合わせるだけ",
                   Res("誠実な祈りに、心がわずかに落ち着いた。",
                       sanity: 1))
        );

        static RandomEventData DarkMirror() => Ev(
            EventLibrary.DarkMirror, "暗黒の鏡",
            "鏡の中に、あなたの影が映っている。しかしその影は、あなたとは違う動きをしていた。\n" +
            "「お前の弱さをよこせ。その代わり、力を与えよう」\n" +
            "影は手を伸ばして語りかける。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.25f, 0.2f, 0.4f),
            Choice("影を受け入れる",
                   Res("影と融合することで強大な力を得たが、その代償として闇が宿った。",
                       relic: true, relicPool: RelicRarity.Cursed, curse: true)),
            Choice("影と戦う",
                   Res("影を押しつぶすことで、呪いの一つを払い除けた。恐怖を克服し、心が落ち着いた。",
                       hp: -0.25f, removeCurse: true, sanity: 1)),
            Choice("鏡を割る",
                   Res("鏡が砕けると呪いが一つ消えたが、その衝撃で体を痛めた。",
                       maxHP: -10, removeCurse: true))
        );

        static RandomEventData TimeEchoChamber() => Ev(
            EventLibrary.TimeEchoChamber, "時の反響室",
            "この部屋では、過去の戦闘の残響が空気中に漂っている。\n" +
            "勝利の雄叫び、苦しみの悲鳴、決断の瞬間……\n" +
            "過去のどの記憶を選ぶかで、未来が変わる。",
            minFloor: 0, maxFloor: 5, oneTime: true, tint: new Color(0.4f, 0.35f, 0.6f),
            sanityWeight: 0.2f,
            Choice("過去の勝利を選ぶ",
                   Res("勝利の記憶が力となり、最大HPが向上した。誇りを思い出し、精神が安定した。",
                       maxHP: 20, sanity: 1)),
            Choice("過去の敗北を選ぶ",
                   Res("痛みを受け入れることで呪いが消え、体が回復した。",
                       removeCurse: true, hp: 0.15f)),
            Choice("未来を視る",
                   Res("まだ起きていないことが垣間見えた。新たなスキルへの道が開けた。",
                       skillDraft: true, skillCount: 3))
        );

        static RandomEventData SovereignsTrial() => Ev(
            EventLibrary.SovereignsTrial, "王者の試練",
            "「汝が真の王者たるに相応しいか、試させてもらおう」\n" +
            "声の主は見えないが、その威圧感は圧倒的だ。\n" +
            "試練を受けるか、誓いを立てるか、それとも……",
            minFloor: 2, maxFloor: 5, oneTime: true, tint: new Color(0.5f, 0.45f, 0.2f),
            sanityWeight: 0.25f,
            Choice("試練を受ける",
                   Res("強敵との戦いを制し、王者の証たる遺物を二つ手に入れた。",
                       battle: true, elite: true)),
            Choice("誓いを立てる",
                   Res("「ならば呪いを代償に、知識を与えよう」と声は言った。",
                       removeCurse: true, skillDraft: true, skillCount: 2)),
            Choice("立ち去る",
                   Res("王者の試練から逃げた。それもまた、一つの答えだ。"))
        );

        // ════════════════════════════════════════════════════════════════════
        //   エンディング分岐（1回限り・全フロア）
        // ════════════════════════════════════════════════════════════════════

        static RandomEventData DemonKingsBeckoning() => Ev(
            EventLibrary.DemonKingsBeckoning, "玉座の呼び声",
            "廃墟の一角に、黒曜石で作られた小さな玉座の模型が置かれていた。\n" +
            "その表面には古代文字が刻まれ、暗紅色の光がかすかに脈動している。\n" +
            "触れた瞬間、どこか遠い場所から「来い」という声が聞こえた気がした。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.4f, 0.05f, 0.05f), oneTime: true, sanityWeight: 0f,
            Choice("玉座に触れる",
                   "魔王の意志に応える。奈落の玉座への道が開かれるかもしれない。",
                   Res("暗紅色の光があなたを包み込んだ。玉座の証印が手に宿り、遠くの扉が開く音がした。",
                       endingBranch: true, endingPath: EndingType.DemonKing)),
            Choice("立ち去る",
                   Res("玉座の脈動が遠ざかり、やがて沈黙した。この道は、今は必要ない。"))
        );

        static RandomEventData AbyssGazing() => Ev(
            EventLibrary.AbyssGazing, "千の眼の像",
            "通路に、無数の目が刻まれた石像が立っていた。\n" +
            "全ての目があなたに向けられており、一つ一つの瞳が深い闇を宿している。\n" +
            "見つめ返すと、深淵の底から何かがこちらを見ているのを感じた。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.02f, 0.04f, 0.22f), oneTime: true, sanityWeight: 0f,
            Choice("見つめ返す",
                   "深淵に応える。神殿への道が開かれるかもしれない。",
                   Res("千の眼が一斉に瞬いた。深淵の証印が瞳に宿り、遠い場所への道標が刻まれた。",
                       endingBranch: true, endingPath: EndingType.AbyssGod)),
            Choice("目を逸らす",
                   Res("視線を外した瞬間、全ての目が閉じた。あの深みに踏み込む時ではない。"))
        );

        static RandomEventData TimesWhisper() => Ev(
            EventLibrary.TimesWhisper, "止まった懐中時計",
            "石畳の上に、傷だらけの懐中時計が落ちている。\n" +
            "蓋を開けると針は止まっているのに、かすかな振動と共に時を刻む音が聞こえた。\n" +
            "「……まだ時間はある……戻っておいで……」と、時計が囁く。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.12f, 0.06f, 0.22f), oneTime: true, sanityWeight: 0f,
            Choice("時計を拾う",
                   "時の亡霊の声に応える。時の空白への道が開かれるかもしれない。",
                   Res("時計を手に取った瞬間、時間の感覚が歪んだ。砕けた時の証印が手に渡り、道が見えた。",
                       endingBranch: true, endingPath: EndingType.TimeWraith)),
            Choice("放置する",
                   Res("時計の囁きが遠ざかる。今は過去の声に耳を傾ける必要はない。"))
        );

        static RandomEventData CursedCrowns() => Ev(
            EventLibrary.CursedCrowns, "呪われた王冠",
            "壁の高い棚に、古びた王冠が飾られていた。\n" +
            "金属は錆び、宝石は濁っているのに、その周囲だけ空気が重く澱んでいる。\n" +
            "触れた者に呪いを与えるという——しかし、その怨念には何かが宿っているようだ。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.18f, 0.02f, 0.18f), oneTime: true, sanityWeight: 0f,
            Choice("王冠に触れる",
                   "古い王の怨念に応える。玉座間への道が開かれるかもしれない。",
                   Res("王冠の冷たさが指先を伝った。古王の呪冠の欠片が手に残り、呪われた道が示された。",
                       endingBranch: true, endingPath: EndingType.CursedKing)),
            Choice("立ち去る",
                   Res("王冠は棚の上で静かに佇んでいる。あの怨念に触れる必要はまだない。"))
        );

        static RandomEventData TrueCoreEcho() => Ev(
            EventLibrary.TrueCoreEcho, "世界の響き",
            "何もない空間に、かすかな振動が伝わってくる。\n" +
            "壁も天井も床も、全てが僅かに共鳴しており、何かが目覚めようとしている気配がする。\n" +
            "「世界の中心を探せ。全ての始まりと終わりがそこにある」という言葉が脳裏に浮かんだ。",
            minFloor: 0, maxFloor: 5, tint: new Color(0.03f, 0.03f, 0.1f), oneTime: true, sanityWeight: 0f,
            sanityWeight: 0.3f,
            Choice("響きに応える",
                   "世界の核の声に応える。真実の道が開かれるかもしれない。",
                   Res("振動が体の中心を突き抜けた。世界の核片が手の中に現れ、真実への道が開かれた。",
                       endingBranch: true, endingPath: EndingType.TrueCore)),
            Choice("無視する",
                   Res("振動はやがて静まり、世界は沈黙した。今は耳を傾ける時ではない。"))
        );

        // ════════════════════════════════════════════════════════════════════
        //   ファクトリ ヘルパー
        // ════════════════════════════════════════════════════════════════════

        // Overload without oneTime/sanityWeight (most events)
        static RandomEventData Ev(string id, string title, string narrative,
                                  int minFloor, int maxFloor,
                                  Color tint,
                                  params EventChoice[] choices)
        {
            var ev = ScriptableObject.CreateInstance<RandomEventData>();
            ev.name          = id;
            ev.EventID       = id;
            ev.Title         = title;
            ev.NarrativeText = narrative;
            ev.MinFloor      = minFloor;
            ev.MaxFloor      = maxFloor;
            ev.UITintColor   = tint;
            ev.Choices       = new List<EventChoice>(choices);
            return ev;
        }

        // Overload with oneTime and sanityWeight (all required — avoids C# named-arg + params conflict)
        static RandomEventData Ev(string id, string title, string narrative,
                                  int minFloor, int maxFloor,
                                  Color tint, bool oneTime, float sanityWeight,
                                  params EventChoice[] choices)
        {
            var ev = ScriptableObject.CreateInstance<RandomEventData>();
            ev.name          = id;
            ev.EventID       = id;
            ev.Title         = title;
            ev.NarrativeText = narrative;
            ev.MinFloor      = minFloor;
            ev.MaxFloor      = maxFloor;
            ev.UITintColor   = tint;
            ev.OneTimeOnly   = oneTime;
            ev.SanityWeight  = sanityWeight;
            ev.Choices       = new List<EventChoice>(choices);
            return ev;
        }

        // Choice without gold requirement
        static EventChoice Choice(string text, EventChoiceResult result, string tooltip = null)
            => new EventChoice
            {
                ChoiceText  = text,
                TooltipText = tooltip ?? string.Empty,
                Result      = result,
            };

        // Choice with gold requirement
        static EventChoice Choice(string text, string tooltip, EventChoiceResult result, int gold = 0)
            => new EventChoice
            {
                ChoiceText    = text,
                TooltipText   = tooltip,
                RequiresGold  = gold > 0,
                GoldCost      = gold,
                Result        = result,
            };

        // Result builder
        static EventChoiceResult Res(string narrative,
                                     float hp           = 0f,
                                     int   goldChange   = 0,
                                     bool  relic        = false,
                                     RelicRarity relicPool = RelicRarity.Common,
                                     bool  curse        = false,
                                     bool  skillDraft   = false,
                                     int   skillCount   = 3,
                                     bool  removeSkill  = false,
                                     int   maxHP        = 0,
                                     int   sanity       = 0,
                                     bool  battle       = false,
                                     bool  elite        = false,
                                     bool  removeCurse  = false,
                                     int   removeCurseCount = 1,
                                     bool  fullHeal     = false,
                                     bool  endingBranch = false,
                                     EndingType endingPath = EndingType.None)
            => new EventChoiceResult
            {
                NarrativeText       = narrative,
                ChangeHP            = hp != 0f || fullHeal,
                HPChangePercent     = hp,
                FullHeal            = fullHeal,
                ChangeGold          = goldChange != 0,
                GoldChange          = goldChange,
                GainRelic           = relic,
                RelicRarityPool     = relicPool,
                GainCurse           = curse,
                GainSkillDraft      = skillDraft,
                SkillChoiceCount    = skillCount,
                RemoveSkill         = removeSkill,
                ChangeMaxHP         = maxHP != 0,
                MaxHPChange         = maxHP,
                ChangeSanity        = sanity != 0,
                SanityChange        = sanity,
                TriggerBattle       = battle,
                IsEliteBattle       = elite,
                RemoveCurse         = removeCurse,
                RemoveCurseCount    = removeCurseCount,
                TriggerEndingBranch = endingBranch,
                EndingPath          = endingPath,
            };
    }
}
