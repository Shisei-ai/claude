// ランダムイベント全50種 — Unity版 Roguelike/Events/EventFactory.cs の移植
//   一般イベント40 (廃墟10 / 暗黒の森10 / 呪われた城10 / 特別10)
// + エンディング分岐5 (1ラン1回・排他)
// + キャラクター固有5
//
// 【Web版での置き換え】
// - skillDraft (スキルドラフト): Web版はJP制のため「JP獲得 (枚数×25)」に変換
// - removeSkill (スキル売却):   「JP-50 (最低0)」に変換
// - フロア番号: Unity版の0-5 (廃墟0-1/森2-3/城4-5) を Web版の0-3 に変換済み
import type { RelicRarity } from './relics';

export interface EventResult {
  narrative: string;
  hpPct?: number;          // 最大HP比の増減 (+回復/-ダメージ)
  gold?: number;           // 増減 (-9999 = 全財産を失う)
  relicPool?: RelicRarity; // レリック獲得 (プール指定)
  curse?: boolean;         // 呪いを1つ得る
  skillDraft?: number;     // Unity: スキルドラフト枚数 → Web: JP+枚数×25
  removeSkill?: boolean;   // Unity: スキル削除 → Web: JP-50
  maxHP?: number;          // 最大HPの増減 (固定値)
  sanity?: number;
  battle?: boolean;
  elite?: boolean;
  removeCurse?: number;    // 除去数 (99 = 全て)
  fullHeal?: boolean;
  endingPath?: 'DemonKing' | 'AbyssGod' | 'TimeWraith' | 'CursedKing' | 'TrueCore';
}

export interface EventChoiceDef {
  text: string;
  tooltip?: string;
  goldCost?: number;       // 必要ゴールド (選択時に減算)
  result: EventResult;
}

export interface RandomEventDef {
  id: string;
  title: string;
  narrative: string;
  minFloor: number;
  maxFloor: number;
  oneTime?: boolean;
  sanityWeight?: number;         // 正気度による出現重み補正
  requiredCharacter?: string;    // characterId (bernhard等)
  isEndingEvent?: boolean;       // エンディング分岐 (activeEnding設定済みなら除外)
  tint: number;
  choices: EventChoiceDef[];
}

export const RANDOM_EVENTS: RandomEventDef[] = [
  // ════════════════════════════════════════════════════════════════════
  //  廃墟 (Web Floor 0)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'ancient_altar', title: '古の祭壇',
    narrative: '廃墟の中心に、黒い石でできた祭壇が佇んでいる。\n供物の血が乾いた跡が無数に刻まれ、何者かの意志が今も宿っているようだ。\n祭壇は何かを待ち望んでいるかのように、かすかに脈動している。',
    minFloor: 0, maxFloor: 0, tint: 0x805940,
    choices: [
      { text: '血を捧げる', tooltip: '最大HPの15%を失うが、神秘の力を受け取る。',
        result: { narrative: 'あなたの血が祭壇に吸い込まれ、代わりに暗い輝きを放つ遺物が現れた。', hpPct: -0.15, relicPool: 'Uncommon' } },
      { text: 'ゴールドを捧げる', tooltip: '50Gが必要。', goldCost: 50,
        result: { narrative: '金貨が祭壇の上で溶け、レアな宝物と化した。', relicPool: 'Rare' } },
      { text: '立ち去る', result: { narrative: '祭壇は沈黙した。' } },
    ],
  },
  {
    id: 'wounded_knight', title: '傷ついた騎士',
    narrative: '崩れた柱の陰に、重傷を負った騎士が倒れている。\nかつての栄光を示す紋章が刻まれた鎧は、今や血と泥で汚れていた。\n「……頼む、ここから出してくれ……」と、彼はかろうじて呟く。',
    minFloor: 0, maxFloor: 0, tint: 0x8c8073,
    choices: [
      { text: '助ける', tooltip: 'HP10%を使って騎士を助ける。',
        result: { narrative: '騎士は深く頭を下げ、路銀と感謝の言葉を残して去っていった。心が少し軽くなった気がする。', hpPct: -0.10, gold: 40, sanity: 1 } },
      { text: '持ち物を漁る',
        result: { narrative: '騎士が弱々しく抵抗する中、ポーチからいくらかのゴールドを奪った。後味の悪い選択だ。', gold: 30 } },
      { text: '通り過ぎる', result: { narrative: '騎士の嗚咽が遠ざかる。' } },
    ],
  },
  {
    id: 'mysterious_chest', title: '謎めいた宝箱',
    narrative: '廊下の奥に、埃をかぶった大きな宝箱がある。\n鍵穴には見慣れない紋章が彫られ、かすかに金属的な匂いが漂っている。\n罠か、それとも本物の宝か――判断がつかない。',
    minFloor: 0, maxFloor: 1, tint: 0x998c4d,
    choices: [
      { text: '思い切って開ける',
        result: { narrative: '箱の中には宝の山が！……だが同時に、毒針が飛んできた。', gold: 60, hpPct: -0.20 } },
      { text: '慎重に調べてから開ける',
        result: { narrative: '罠を解除し、少ないながらも確実な報酬を手に入れた。', gold: 30 } },
      { text: '無視する', result: { narrative: '宝箱は誰にも開かれることなく、廃墟に残された。' } },
    ],
  },
  {
    id: 'corrupted_spring', title: '腐った泉',
    narrative: '石造りの泉に、黒と緑が混ざった水が湛えられている。\n奇妙なことに、水面からは甘い香りが漂い、不思議な光が揺れていた。\nこれが回復の泉か、あるいは何か別のものか。',
    minFloor: 0, maxFloor: 1, tint: 0x4d7359,
    choices: [
      { text: '飲む',
        result: { narrative: '水は喉を焼くように冷たく……しかし傷が癒えていく。あるいは何かが体に根付いた。', hpPct: 0.30, curse: true } },
      { text: '少しだけ飲む',
        result: { narrative: '慎重に少量だけ飲むと、じわじわと体力が戻ってきた。', hpPct: 0.15 } },
      { text: '立ち去る', result: { narrative: '後ろ髪を引かれながらも、判断力を信じて去った。' } },
    ],
  },
  {
    id: 'ruined_library', title: '廃墟の図書館',
    narrative: '天井が崩れ落ちた書庫に、古い書物が散乱している。\n大半は読めないほど傷んでいるが、その中にひときわ輝く数冊が目に留まった。\n知識は力だ――ただし、代償を払えるならば。',
    minFloor: 0, maxFloor: 0, tint: 0x73668c,
    choices: [
      { text: '魔法書を読む',
        result: { narrative: '古代の術式が脳裏に焼き付いた。技の理解が深まった。', skillDraft: 3 } },
      { text: '売れそうな本をまとめる',
        result: { narrative: '学術的価値のある本を数冊まとめた。商人に高く売れるだろう。', gold: 50 } },
      { text: 'そっと立ち去る', result: { narrative: 'かつて誰かが大切にした本たちを、そのままにしておいた。' } },
    ],
  },
  {
    id: 'scavengers_deal', title: 'スカベンジャーの取引',
    narrative: '廃材を漁っていた男が話しかけてくる。\n「旅人よ、こいつを買ってくれないか？　廃墟の奥で拾った代物だ」\n彼の荷物の中に、興味深い品がいくつか見える。',
    minFloor: 0, maxFloor: 1, tint: 0x8c8066,
    choices: [
      { text: 'ゴールドで購入（80G）', tooltip: '80Gを支払う。', goldCost: 80,
        result: { narrative: '男は満足そうにゴールドを受け取り、レアな遺物を手渡した。', relicPool: 'Rare' } },
      { text: '技の記憶を売り渡す',
        result: { narrative: '術式の記録をスカベンジャーに渡す代わりに、大量のゴールドを受け取った。修練の一部が失われた。', gold: 100, removeSkill: true } },
      { text: '断る', result: { narrative: '男は肩をすくめ、再び廃材の山に戻っていった。' } },
    ],
  },
  {
    id: 'forgotten_grave', title: '忘れられた墓',
    narrative: '苔むした墓標が、人気のない場所にひっそりと立っている。\n名前は読めないが、誰かがここに眠っていることだけは確かだ。\nこの墓には何かが隠されているかもしれない。',
    minFloor: 0, maxFloor: 0, tint: 0x666673,
    choices: [
      { text: '墓を掘り返す',
        result: { narrative: '土の中から古い小袋が出てきた。しかし掘り返した代償か、悪い気が漂い始めた。', gold: 50, curse: true } },
      { text: '祈りを捧げる',
        result: { narrative: '静かに手を合わせると、安らかな気配が周囲を包み込んだ。体の傷が癒えていく。', hpPct: 0.20 } },
      { text: '通り過ぎる', result: { narrative: '死者を安らかに眠らせてやった。' } },
    ],
  },
  {
    id: 'demonic_pact', title: '悪魔の契約',
    narrative: '暗闇の中から影が現れた。人の形をしているが、確かに人ではない。\n「勇者よ、取引をしよう。汝の命の一部と引き換えに、我が力を授けよう」\n低い声が空気を震わせ、その目は暗紅色に輝いている。',
    minFloor: 0, maxFloor: 3, oneTime: true, sanityWeight: 0.2, tint: 0x801a4d,
    choices: [
      { text: '契約する',
        result: { narrative: '最大HPが大きく削られたが、悪魔は約束通り遺物を置いていった。', maxHP: -30, relicPool: 'Rare' } },
      { text: '拒絶する', result: { narrative: '悪魔は低く笑い、「いつかまた会おう」と呟いて消えた。' } },
    ],
  },
  {
    id: 'voice_in_dark', title: '暗闇の声',
    narrative: '廃墟の奥深くから、低く呼びかける声が聞こえる。\n「……こちらへ来い……知識を与えよう……」\n声の出所は全く見えない。従うか、無視するか。',
    minFloor: 0, maxFloor: 1, tint: 0x4d4073,
    choices: [
      { text: '声に従う',
        result: { narrative: '暗闇の奥に踏み込むと、不思議な力が体を包んだ。心の何かが揺れた気がする。', hpPct: 0.20, sanity: 1 } },
      { text: '声に応える', tooltip: 'HP10%を失うが、知識を得られるかもしれない。',
        result: { narrative: '声は喜んだようで、古い術式を授けてくれた。しかし体の一部が消耗した。', hpPct: -0.10, skillDraft: 2 } },
      { text: '無視する', result: { narrative: '声は次第に遠ざかり、やがて沈黙した。' } },
    ],
  },
  {
    id: 'abandoned_camp', title: '捨てられた野営地',
    narrative: '廃墟の中に、まだ温もりが残る野営地の跡がある。\n消えたたき火、散らばった食料、倒れたテント……\nどうやら最近まで誰かがここで生活していたようだ。',
    minFloor: 0, maxFloor: 0, tint: 0x807359,
    choices: [
      { text: '物資を漁る',
        result: { narrative: '残された食料と少々のゴールドを見つけた。お腹も膨れ、傷も癒える。', gold: 35, hpPct: 0.10 } },
      { text: '罠を確認してから漁る',
        result: { narrative: '用心した甲斐があった。少ないが、安全に物資を確保できた。', gold: 20 } },
      { text: 'ゆっくり休む',
        result: { narrative: '温もりの残るテントで少し休んだ。体力が回復した。', hpPct: 0.25 } },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  //  暗黒の森 (Web Floor 1)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'talking_raven', title: '喋るカラス',
    narrative: '一羽の黒いカラスが、目線の高さの枝に止まりこちらを見つめている。\n「旅人よ、迷っているのか？　この森には危険が潜む」\nその声は人の言葉だった。カラスは知恵ある目で語りかける。',
    minFloor: 1, maxFloor: 1, sanityWeight: 0.3, tint: 0x33334d,
    choices: [
      { text: 'カラスの話を聞く',
        result: { narrative: 'カラスは森の秘密をいくつか語ってくれた。知識を得て、心が少し落ち着いた気がする。', sanity: 1 } },
      { text: 'カラスを捕まえようとする',
        result: { narrative: 'カラスは素早く飛び去り、金切り声で不吉な叫びを残した。何か嫌な予感がする。', gold: 20, sanity: -1 } },
      { text: '立ち去る', result: { narrative: 'カラスは静かに見送った。' } },
    ],
  },
  {
    id: 'moonshadow_puddle', title: '月影の水溜り',
    narrative: '木々の隙間から差し込む月光が、道端の水溜りに映り込んでいる。\nしかしその水面には、月ではなく見知らぬ星座が映っていた。\n神秘的な輝きが揺れ、何かを語りかけているようだ。',
    minFloor: 1, maxFloor: 1, tint: 0x334d8c,
    choices: [
      { text: '水面を覗き込む',
        result: { narrative: '星座の導きで、古いスキルの知識が浮かび上がった。', skillDraft: 3 } },
      { text: '水を飲む',
        result: { narrative: '冷たく澄んだ水が体に染み渡り、傷が癒えると共に体が少し強くなった。', hpPct: 0.20, maxHP: 10 } },
      { text: '立ち去る', result: { narrative: '水面の輝きが静かに消えていった。' } },
    ],
  },
  {
    id: 'witchs_cauldron', title: '魔女の大釜',
    narrative: '森の開けた場所に、巨大な鉄製の大釜がある。\nまだ火が灯っており、中には黒い液体がぐつぐつと煮立っていた。\n周囲には奇妙な薬草と骨の欠片が散らばっている。',
    minFloor: 1, maxFloor: 1, tint: 0x407359,
    choices: [
      { text: '何かを入れてみる（50G）', tooltip: '50Gを使う。何が出てくるかわからない。', goldCost: 50,
        result: { narrative: '金貨が液体に溶け込むと、大釜から輝く遺物が浮かび上がった。', relicPool: 'Uncommon' } },
      { text: '鍋の中を確認する', tooltip: '危険かもしれない。',
        result: { narrative: '顔を近づけた瞬間、蒸気が噴き出した。しかし同時に、何かが頭の中で閃いた。', hpPct: -0.10, skillDraft: 2 } },
      { text: '立ち去る', result: { narrative: '大釜は誰にも邪魔されず、静かに煮え続けた。' } },
    ],
  },
  {
    id: 'blood_tree', title: '血の木',
    narrative: '真っ黒な幹から、深紅の樹液がしたたり落ちている。\n傷口のような裂け目が幹全体に走り、木は呻くような音を立てていた。\nこの液体は毒か、あるいは禁じられた薬か。',
    minFloor: 1, maxFloor: 1, tint: 0x802633,
    choices: [
      { text: '樹液を集めて飲む', tooltip: 'HPを20%失うが、強烈な効果があるかもしれない。',
        result: { narrative: '喉が焼けるように熱い。しかし体の奥底から力が湧き出てきた。', hpPct: -0.20, relicPool: 'Uncommon' } },
      { text: '木を調べる',
        result: { narrative: '根元に古い財布が埋まっているのを発見した。', gold: 40 } },
      { text: '木を燃やす',
        result: { narrative: '木は断末魔の叫びを上げ、炎上した。しかし何かが目覚めたようで、敵が現れた！', battle: true } },
    ],
  },
  {
    id: 'lost_merchant', title: '迷子の商人',
    narrative: '森の中で荷物を背負った男性が途方に暮れている。\n「助かった！　道に迷ってしまって……どうか街まで案内してもらえませんか」\n大量の荷物の中に、面白そうな品が見える。',
    minFloor: 1, maxFloor: 2, tint: 0x667359,
    choices: [
      { text: '案内してあげる', tooltip: 'HPを5%使って商人を守りながら進む。',
        result: { narrative: '商人は感謝しながら大量のゴールドと商品を置いていった。', hpPct: -0.05, gold: 60, relicPool: 'Common' } },
      { text: '品物を購入する（40G）', tooltip: '40Gで商人の品を購入する。', goldCost: 40,
        result: { narrative: '商人から役立つ品を買った。', relicPool: 'Common' } },
      { text: '立ち去る', result: { narrative: '商人の「お待ちを！」という声を背に、森を進んだ。' } },
    ],
  },
  {
    id: 'faering_ambush', title: '妖精の奇襲',
    narrative: '突然、全身から光を放つ小さな存在たちに囲まれた。\n妖精だ。彼らは笑い声を立てながら、あなたの荷物に手を伸ばしてくる。\n「人間の宝はいただき！　でも戦っても構わないよ？」',
    minFloor: 1, maxFloor: 1, tint: 0x8c73a6,
    choices: [
      { text: '戦う',
        result: { narrative: '妖精たちは強敵だ。戦いが始まる！', battle: true, elite: true } },
      { text: '交渉する（30G）', tooltip: '30Gを差し出す。', goldCost: 30,
        result: { narrative: '妖精たちはゴールドを受け取って喜び、お礼に呪いを解いてくれた。', removeCurse: 1 } },
      { text: '逃げる',
        result: { narrative: '必死で逃げたが、妖精の悪戯で少し傷を負った。', hpPct: -0.10 } },
    ],
  },
  {
    id: 'druid_circle', title: 'ドルイドの輪',
    narrative: '直径5メートルほどの石の輪が、清浄な気配に包まれていた。\n古代のドルイドたちが儀式を行った場所だという。\n輪の中央に立つと、自然の力が体に染み込んでくる気がした。',
    minFloor: 1, maxFloor: 1, tint: 0x4d804d,
    choices: [
      { text: '儀式に参加する',
        result: { narrative: '大地の力が体を満たした。傷が癒え、体が少し強くなった。', hpPct: 0.30, maxHP: 15 } },
      { text: '石を一つ持ち帰る',
        result: { narrative: '不思議な力を宿した石を手に入れた。心がじんわりと温かくなった気がする。', sanity: 1, gold: 30 } },
      { text: '立ち去る', result: { narrative: '神聖な場所を乱さずに立ち去った。' } },
    ],
  },
  {
    id: 'spirit_well', title: '精霊の井戸',
    narrative: '苔むした石造りの井戸から、淡い光が溢れている。\n「願いを言え。ただし、望むものはひとつだけだ」\n精霊の声が、井戸の中から静かに響いた。',
    minFloor: 1, maxFloor: 1, sanityWeight: 0.2, tint: 0x596699,
    choices: [
      { text: '回復を望む',
        result: { narrative: '柔らかな光が体を包み込み、全ての傷が消えた。', fullHeal: true } },
      { text: '力を望む',
        result: { narrative: '力への渇望が精霊に伝わり、新たな術の知識が授けられた。', skillDraft: 3 } },
      { text: '富を望む',
        result: { narrative: '井戸の底から金貨が次々と飛び出してきた。', gold: 80 } },
    ],
  },
  {
    id: 'bandit_camp', title: '山賊のキャンプ',
    narrative: '木々の向こうに炎が見え、酔っ払いの笑い声が聞こえる。\n山賊たちのアジトだ。奪われた旅人の荷物が山積みになっている。\nどう対処するか。',
    minFloor: 1, maxFloor: 1, tint: 0x805940,
    choices: [
      { text: '正面から奇襲する',
        result: { narrative: '山賊たちに切り込む。戦いが始まる！', battle: true } },
      { text: 'こっそり盗みに入る',
        result: { narrative: '上手く忍び込んで金を盗んだ。……ただし、帰り際に見つかってしまった。', gold: 60, hpPct: -0.15 } },
      { text: '迂回する', result: { narrative: '山賊と関わらずに別の道を進んだ。' } },
    ],
  },
  {
    id: 'mirror_lake', title: '鏡の湖',
    narrative: '風も吹かないのに、湖面が鏡のように静まり返っている。\n水面には過去の自分の姿が映っていた。後悔、悲しみ、そして希望。\nこの湖には特別な力があるという。',
    minFloor: 1, maxFloor: 1, oneTime: true, sanityWeight: 0.15, tint: 0x40598c,
    choices: [
      { text: '過去を見つめる',
        result: { narrative: '水面に映る記憶が体に流れ込み、最大HPが増した。しかし何か暗いものも残った気がする。', maxHP: 20, curse: true } },
      { text: '湖に手を触れる',
        result: { narrative: '湖の力が呪いを洗い流した。水面に触れた瞬間、心の霧が晴れていくようだった。', removeCurse: 1, sanity: 1 } },
      { text: '立ち去る', result: { narrative: '湖は静かに波紋を描いた。' } },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  //  呪われた城 (Web Floor 2〜3)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'shadow_council', title: '影の会議',
    narrative: '空中に浮かぶ影たちが、密やかに話し合っている。\nこの城の主について、次の戦いについて……\n彼らはまだこちらに気づいていないようだ。',
    minFloor: 2, maxFloor: 3, tint: 0x332659,
    choices: [
      { text: '盗み聞きする',
        result: { narrative: '敵の弱点と戦術を知ることができた。情報を得て、精神的な余裕が生まれた。', sanity: 1, relicPool: 'Common' } },
      { text: '仲間に加わる',
        result: { narrative: '影たちに認められ、強力な遺物を得た。しかし彼らとの契約が新たな呪縛となった。', relicPool: 'Rare', curse: true } },
      { text: '逃げる', result: { narrative: '気づかれる前にその場を離れた。' } },
    ],
  },
  {
    id: 'phantom_armoury', title: '幻の武器庫',
    narrative: '透き通った幽霊の鎧や剣が壁に飾られている部屋に迷い込んだ。\n触れようとすると手が通り抜けるが、集中すれば実体化させられそうだ。\nこの力を自分のものにできるだろうか。',
    minFloor: 2, maxFloor: 3, tint: 0x59668c,
    choices: [
      { text: '武器を実体化させる', tooltip: 'HP10%を消費して集中する。',
        result: { narrative: '幻の刃が手の中で実体化した。その力が術式の知識として刻まれた。', hpPct: -0.10, skillDraft: 3 } },
      { text: '鎧を実体化させる', tooltip: 'HP10%を消費して集中する。',
        result: { narrative: '幻の鎧が体を包んだ瞬間、消えてしまった。しかしその強度が最大HPとして残った。', hpPct: -0.10, maxHP: 30 } },
      { text: '立ち去る', result: { narrative: '幻の武器庫は静かに佇み続けた。' } },
    ],
  },
  {
    id: 'dark_sanctum', title: '暗黒の祭壇',
    narrative: '黒い炎が灯る祭壇が、圧倒的な邪気を放っている。\nしかしよく見ると、その炎の中に封じられた呪いが揺らめいていた。\nここには浄化の力もあるかもしれない。',
    minFloor: 2, maxFloor: 3, tint: 0x661a73,
    choices: [
      { text: '力を奉納する', tooltip: '最大HPを20失うが……',
        result: { narrative: '祭壇は最大HPを吸い取り、代わりに呪われた強力な遺物を与え、呪いを一つ解いた。', maxHP: -20, relicPool: 'Cursed', removeCurse: 1 } },
      { text: '光で浄化する',
        result: { narrative: '聖なる光を当てると、祭壇は轟音と共に砕けた。呪いが消えていく……', removeCurse: 99 } },
      { text: '立ち去る', result: { narrative: '邪気に当てられないよう、急いで立ち去った。' } },
    ],
  },
  {
    id: 'treasure_vault', title: '財宝の間',
    narrative: '金貨、宝石、古代の遺物……この部屋には信じられないほどの財宝が積み上げられている。\nしかし入口には無数の罠の跡があり、天井には不審な染みが広がっていた。\n欲張れば欲張るほど、危険も増す。',
    minFloor: 2, maxFloor: 3, tint: 0x998033,
    choices: [
      { text: '全て持っていく',
        result: { narrative: '大量のゴールドを手に入れたが、出口で罠が作動し呪いにかかった。', gold: 150, curse: true } },
      { text: '慎重に選んで持つ',
        result: { narrative: '罠を避けながら、確実に価値あるものだけを持ち出した。', gold: 80 } },
      { text: 'ひとつだけ持つ',
        result: { narrative: '最も安全な品をひとつだけ選んだ。欲を抑えた判断だ。', gold: 40 } },
    ],
  },
  {
    id: 'fallen_hero', title: '倒れた英雄',
    narrative: '城の廊下に、かつての英雄の遺体が安らかに横たわっている。\nその手には、長い旅を物語るように、傷だらけだが輝く遺物が握られていた。\nこの英雄の意志を受け継ぐことができるか。',
    minFloor: 2, maxFloor: 3, oneTime: true, sanityWeight: 0.25, tint: 0x807399,
    choices: [
      { text: '形見を受け取る',
        result: { narrative: '英雄の意志が宿った遺物を手に取った。その重さが使命感を与えてくれる。', relicPool: 'Boss' } },
      { text: '祈りを捧げる',
        result: { narrative: '静かに祈ると、英雄の魂が感謝するように全ての傷を癒やしてくれた。心に平穏が宿った。', fullHeal: true, sanity: 1 } },
      { text: '立ち去る', result: { narrative: '英雄を静かに安らかに眠らせてやった。' } },
    ],
  },
  {
    id: 'cursed_portrait', title: '呪われた肖像画',
    narrative: '廊下に飾られた肖像画の中の人物が、こちらを見て微笑んでいる。\nしかしその笑みは徐々に歪み、口が動いて何かを語りかけてきた。\n「お前はここで何を探している？」',
    minFloor: 2, maxFloor: 3, tint: 0x805980,
    choices: [
      { text: '肖像画を見つめ返す',
        result: { narrative: '絵の中の視線が急に変わり、強烈なビジョンが頭に流れ込んだ。何かが変わった……', relicPool: 'Uncommon', curse: true } },
      { text: '肖像画を切り裂く',
        result: { narrative: 'キャンバスが裂けると共に、呪いの気配が消えた。しかしゴールドを失った気がする。', gold: -20, removeCurse: 1 } },
      { text: '目を逸らして通り過ぎる', result: { narrative: '絵は何事もなかったように静まった。' } },
    ],
  },
  {
    id: 'grim_reapers_deal', title: '死神の取引',
    narrative: '鎌を持った影が、ゆっくりと近づいてくる。\n「汝の命を少し借りよう。その代わり、我が持つ宝を授けよう」\n逃げる選択肢はない。ここで答えを出すしかない。',
    minFloor: 2, maxFloor: 3, oneTime: true, tint: 0x261a33,
    choices: [
      { text: '命を担保にする',
        result: { narrative: 'HPが極限まで削られた。しかし死神は約束通り、強力な遺物を残した。', hpPct: -0.89, relicPool: 'Cursed' } },
      { text: '断る',
        result: { narrative: '「残念だ」と呟き、死神は去っていった。しかしその鎌の一振りで少し傷を負った。', hpPct: -0.05 } },
    ],
  },
  {
    id: 'soul_cage', title: '魂の檻',
    narrative: '鉄格子の中に、青白い炎として閉じ込められた魂たちが揺らめいている。\n「……助けてくれ……」「……一緒に連れていって……」\n魂たちは必死に訴えかけてくるが、その力を利用することもできそうだ。',
    minFloor: 2, maxFloor: 3, tint: 0x4d4d99,
    choices: [
      { text: '魂を解放する',
        result: { narrative: '魂たちは感謝の光を放ちながら昇っていった。その加護で体が強くなり、心も穏やかになった。', maxHP: 20, sanity: 1 } },
      { text: '魂の力を吸収する',
        result: { narrative: '魂たちの力が体に流れ込んだ。傷が癒えたが、怨念が僅かに残った気がする。', hpPct: 0.30, curse: true } },
      { text: '無視する', result: { narrative: '魂の嘆きが背後で続く。' } },
    ],
  },
  {
    id: 'despair_chamber', title: '絶望の間',
    narrative: 'この部屋に入った瞬間、絶望的な感情が全身を包み込んだ。\n過去の失敗、後悔、恐怖……暗黒の感情が波のように押し寄せる。\nしかし、この試練を乗り越えることで何かを得られるかもしれない。',
    minFloor: 2, maxFloor: 3, tint: 0x332640,
    choices: [
      { text: '恐怖に立ち向かう', tooltip: '最大HPを10失うが、呪いを全て払える。',
        result: { narrative: '全ての闇を受け入れることで、それらを乗り越えた。呪いが消えていく……', maxHP: -10, removeCurse: 99 } },
      { text: '絶望に沈む',
        result: { narrative: '感情の嵐に流されてしまった。体も心もひどく傷ついた。', hpPct: -0.20, curse: true } },
      { text: '素早く通り抜ける',
        result: { narrative: '走り抜けることで何とか耐えた。少し傷を負ったが、最小限の被害だ。', hpPct: -0.05 } },
    ],
  },
  {
    id: 'final_blessing', title: '最後の祝福',
    narrative: '城の奥の礼拝堂。朽ちた建物の中で、一点だけ神聖な光が差し込んでいる。\nこの光は確かに、あなたを待っていた。\n最終決戦の前に、どんな力を望むか。',
    minFloor: 2, maxFloor: 3, oneTime: true, sanityWeight: 0.5, tint: 0xccbf80,
    choices: [
      { text: '力の祝福を受ける',
        result: { narrative: '戦いのための新たな術が授けられた。', skillDraft: 3 } },
      { text: '癒やしの祝福を受ける',
        result: { narrative: '柔らかな光が全ての傷を癒やし、さらに体を強くした。', fullHeal: true, maxHP: 30 } },
      { text: '精神の祝福を受ける',
        result: { narrative: '聖なる光が心の澱を洗い流し、精神が研ぎ澄まされた。ゴールドも降り注いできた。', sanity: 2, gold: 100 } },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  //  特別イベント (全フロア)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'gamblers_tavern', title: '賭博師の酒場',
    narrative: '廃墟の一角に、なぜか賑やかな酒場が営業していた。\n「さあ旅人、一勝負いかがかね？」\nカードを持った男が、挑戦的な笑みを浮かべている。',
    minFloor: 0, maxFloor: 3, sanityWeight: 0.35, tint: 0x8c6640,
    choices: [
      { text: '大きく賭ける（100G）', tooltip: '100Gを賭ける。', goldCost: 100,
        result: { narrative: '運試しの結果……大きく勝った！', gold: 100 } },
      { text: '小さく賭ける（30G）', tooltip: '30Gを賭ける。', goldCost: 30,
        result: { narrative: '慎重な賭けが実を結び、少し増えて返ってきた。', gold: 30 } },
      { text: '飲むだけにする（20G）', tooltip: '20Gでお酒を飲む。', goldCost: 20,
        result: { narrative: '旨い酒で疲れが取れた。賭け事より休息が大事だ。', hpPct: 0.10 } },
    ],
  },
  {
    id: 'mysterious_trader', title: '謎の行商人',
    narrative: 'どこからともなく現れた行商人が、不思議な品を広げて見せた。\n「どこにも売っていない、本物の逸品だよ」\n確かに、その品は見たことのない輝きを放っている。',
    minFloor: 0, maxFloor: 3, sanityWeight: 0.3, tint: 0x665980,
    choices: [
      { text: '特別な品を購入（120G）', tooltip: '120Gを支払う。', goldCost: 120,
        result: { narrative: '商人から希少な遺物を購入した。どこにも売っていない代物だ。', relicPool: 'Rare' } },
      { text: '普通の品を購入（70G）', tooltip: '70Gを支払う。', goldCost: 70,
        result: { narrative: '珍しい遺物を手に入れた。まずまずの取引だ。', relicPool: 'Uncommon' } },
      { text: '断る', result: { narrative: '商人は軽く肩をすくめ、霧の中に消えた。' } },
    ],
  },
  {
    id: 'divine_sanctuary', title: '神聖なる聖域',
    narrative: 'この場所だけが、闇の中に完全な安全地帯として存在している。\n聖なる光が満ち、敵も悪意も近づくことができない特別な場所。\nここで何を望むか。',
    minFloor: 0, maxFloor: 3, oneTime: true, sanityWeight: 0.5, tint: 0xe6d999,
    choices: [
      { text: '癒やしの泉で休む',
        result: { narrative: '心身の全ての傷が癒やされた。完全な回復だ。', fullHeal: true } },
      { text: '瞑想して力を蓄える',
        result: { narrative: '静かな瞑想で体が強化され、精神が安定してきた気がした。', maxHP: 20, sanity: 1 } },
      { text: '次の戦いに備える',
        result: { narrative: '聖域の知恵が新たなスキルを啓示した。', skillDraft: 4 } },
    ],
  },
  {
    id: 'chaotic_rift', title: '混沌の亀裂',
    narrative: '空間が裂け、次元の亀裂が目の前に広がっている。\nその中からは、ありとあらゆる可能性が覗いていた。\n何が起きるかは神のみぞ知る。',
    minFloor: 0, maxFloor: 3, tint: 0x664db3,
    choices: [
      { text: '亀裂に飛び込む',
        result: { narrative: '混沌の力がランダムに作用した。何が起きるかわからなかったが……不思議と心が落ち着いた。', hpPct: 0.25, gold: 50, sanity: 1 } },
      { text: '端から観察する',
        result: { narrative: '安全な距離から亀裂を観察することで、次元の知識を得た。知ることで恐怖が薄れた。', sanity: 1 } },
      { text: '亀裂を閉じる',
        result: { narrative: '亀裂を封印すると、その反動で体が強化された。', maxHP: 40, removeCurse: 1 } },
    ],
  },
  {
    id: 'blood_for_knowledge', title: '知識と血の取引',
    narrative: '本棚が床から天井まで続く秘密の書庫。\nしかし扉には「知識の代償は血」と刻まれている。\nより多くの知識には、より多くの代償が必要だ。',
    minFloor: 0, maxFloor: 3, tint: 0x732633,
    choices: [
      { text: '多くの血を捧げる', tooltip: '最大HPの30%を失う。',
        result: { narrative: '大量の血が書庫に吸い込まれ、5冊の魔法書が輝きを放った。', hpPct: -0.30, skillDraft: 5 } },
      { text: '少しの血を捧げる', tooltip: '最大HPの10%を失う。',
        result: { narrative: '少量の血で、2冊の魔法書が開かれた。', hpPct: -0.10, skillDraft: 2 } },
      { text: '断る', result: { narrative: '書庫の扉は固く閉ざされたままだ。' } },
    ],
  },
  {
    id: 'skill_forgery', title: 'スキル鍛冶屋',
    narrative: '金槌の音が響く小屋の中に、腕の立つ鍛冶師がいた。\nしかし彼が鍛えるのは剣や鎧ではなく、術式そのものだという。\n「スキルを改造してやろうか？」',
    minFloor: 0, maxFloor: 3, tint: 0x806640,
    choices: [
      { text: '技を鍛えてもらう（100G）', tooltip: '100Gで修練が進む。', goldCost: 100,
        result: { narrative: '鍛冶師の技術で術式が磨き上げられた。', skillDraft: 1 } },
      { text: '技を精錬する', tooltip: 'HP15%を代償に、多くの修練を積める。',
        result: { narrative: 'HPを代償に、精錬された術の知識が授けられた。', hpPct: -0.15, skillDraft: 3 } },
      { text: '古い技の記憶を売る',
        result: { narrative: '使い込んだ術式の記録を売り払い、金を得た。修練の一部が失われた。', removeSkill: true, gold: 80 } },
    ],
  },
  {
    id: 'lucky_shrine', title: '安寧の祠',
    narrative: '小さな社に、穏やかな表情の地蔵が祀られている。\n「心の平安を授けよう……誠実な心を持つ者には」\n像の周囲に、静かな光が揺れている。',
    minFloor: 0, maxFloor: 3, sanityWeight: 0.4, tint: 0x998c4d,
    choices: [
      { text: '賽銭を投げる（10G）', tooltip: '10Gを賽銭として捧げる。', goldCost: 10,
        result: { narrative: 'コインが清浄な光を放ちながら社に吸い込まれ、心の澱が流れ落ちた。', sanity: 1, removeCurse: 1 } },
      { text: '全財産を捧げる',
        result: { narrative: '全てのゴールドを捧げると、地蔵が大きく光った。精神が極限まで研ぎ澄まされた。', gold: -9999, sanity: 3 } },
      { text: 'ただ手を合わせるだけ',
        result: { narrative: '誠実な祈りに、心がわずかに落ち着いた。', sanity: 1 } },
    ],
  },
  {
    id: 'dark_mirror', title: '暗黒の鏡',
    narrative: '鏡の中に、あなたの影が映っている。しかしその影は、あなたとは違う動きをしていた。\n「お前の弱さをよこせ。その代わり、力を与えよう」\n影は手を伸ばして語りかける。',
    minFloor: 0, maxFloor: 3, tint: 0x403366,
    choices: [
      { text: '影を受け入れる',
        result: { narrative: '影と融合することで強大な力を得たが、その代償として闇が宿った。', relicPool: 'Cursed', curse: true } },
      { text: '影と戦う',
        result: { narrative: '影を押しつぶすことで、呪いの一つを払い除けた。恐怖を克服し、心が落ち着いた。', hpPct: -0.25, removeCurse: 1, sanity: 1 } },
      { text: '鏡を割る',
        result: { narrative: '鏡が砕けると呪いが一つ消えたが、その衝撃で体を痛めた。', maxHP: -10, removeCurse: 1 } },
    ],
  },
  {
    id: 'time_echo_chamber', title: '時の反響室',
    narrative: 'この部屋では、過去の戦闘の残響が空気中に漂っている。\n勝利の雄叫び、苦しみの悲鳴、決断の瞬間……\n過去のどの記憶を選ぶかで、未来が変わる。',
    minFloor: 0, maxFloor: 3, oneTime: true, sanityWeight: 0.2, tint: 0x665999,
    choices: [
      { text: '過去の勝利を選ぶ',
        result: { narrative: '勝利の記憶が力となり、最大HPが向上した。誇りを思い出し、精神が安定した。', maxHP: 20, sanity: 1 } },
      { text: '過去の敗北を選ぶ',
        result: { narrative: '痛みを受け入れることで呪いが消え、体が回復した。', removeCurse: 1, hpPct: 0.15 } },
      { text: '未来を視る',
        result: { narrative: 'まだ起きていないことが垣間見えた。新たな術への道が開けた。', skillDraft: 3 } },
    ],
  },
  {
    id: 'sovereigns_trial', title: '王者の試練',
    narrative: '「汝が真の王者たるに相応しいか、試させてもらおう」\n声の主は見えないが、その威圧感は圧倒的だ。\n試練を受けるか、誓いを立てるか、それとも……',
    minFloor: 1, maxFloor: 3, oneTime: true, sanityWeight: 0.25, tint: 0x807333,
    choices: [
      { text: '試練を受ける',
        result: { narrative: '見えざる王者が強敵を差し向けてきた！', battle: true, elite: true } },
      { text: '誓いを立てる',
        result: { narrative: '「ならば呪いを代償に、知識を与えよう」と声は言った。', removeCurse: 1, skillDraft: 2 } },
      { text: '立ち去る', result: { narrative: '王者の試練から逃げた。それもまた、一つの答えだ。' } },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  //  エンディング分岐 (1ラン1回・排他)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'demon_kings_beckoning', title: '玉座の呼び声',
    narrative: '廃墟の一角に、黒曜石で作られた小さな玉座の模型が置かれていた。\nその表面には古代文字が刻まれ、暗紅色の光がかすかに脈動している。\n触れた瞬間、どこか遠い場所から「来い」という声が聞こえた気がした。',
    minFloor: 0, maxFloor: 3, oneTime: true, isEndingEvent: true, tint: 0x660d0d,
    choices: [
      { text: '玉座に触れる', tooltip: '魔王の意志に応える。奈落の玉座への道が開かれるかもしれない。',
        result: { narrative: '暗紅色の光があなたを包み込んだ。玉座の証印が手に宿り、遠くの扉が開く音がした。', endingPath: 'DemonKing' } },
      { text: '立ち去る', result: { narrative: '玉座の脈動が遠ざかり、やがて沈黙した。この道は、今は必要ない。' } },
    ],
  },
  {
    id: 'abyss_gazing', title: '千の眼の像',
    narrative: '通路に、無数の目が刻まれた石像が立っていた。\n全ての目があなたに向けられており、一つ一つの瞳が深い闇を宿している。\n見つめ返すと、深淵の底から何かがこちらを見ているのを感じた。',
    minFloor: 0, maxFloor: 3, oneTime: true, isEndingEvent: true, tint: 0x050a38,
    choices: [
      { text: '見つめ返す', tooltip: '深淵に応える。神殿への道が開かれるかもしれない。',
        result: { narrative: '千の眼が一斉に瞬いた。深淵の証印が瞳に宿り、遠い場所への道標が刻まれた。', endingPath: 'AbyssGod' } },
      { text: '目を逸らす', result: { narrative: '視線を外した瞬間、全ての目が閉じた。あの深みに踏み込む時ではない。' } },
    ],
  },
  {
    id: 'times_whisper', title: '止まった懐中時計',
    narrative: '石畳の上に、傷だらけの懐中時計が落ちている。\n蓋を開けると針は止まっているのに、かすかな振動と共に時を刻む音が聞こえた。\n「……まだ時間はある……戻っておいで……」と、時計が囁く。',
    minFloor: 0, maxFloor: 3, oneTime: true, isEndingEvent: true, tint: 0x1f0f38,
    choices: [
      { text: '時計を拾う', tooltip: '時の亡霊の声に応える。時の空白への道が開かれるかもしれない。',
        result: { narrative: '時計を手に取った瞬間、時間の感覚が歪んだ。砕けた時の証印が手に渡り、道が見えた。', endingPath: 'TimeWraith' } },
      { text: '放置する', result: { narrative: '時計の囁きが遠ざかる。今は過去の声に耳を傾ける必要はない。' } },
    ],
  },
  {
    id: 'cursed_crowns', title: '呪われた王冠',
    narrative: '壁の高い棚に、古びた王冠が飾られていた。\n金属は錆び、宝石は濁っているのに、その周囲だけ空気が重く澱んでいる。\n触れた者に呪いを与えるという——しかし、その怨念には何かが宿っているようだ。',
    minFloor: 0, maxFloor: 3, oneTime: true, isEndingEvent: true, tint: 0x2e052e,
    choices: [
      { text: '王冠に触れる', tooltip: '古い王の怨念に応える。玉座間への道が開かれるかもしれない。',
        result: { narrative: '王冠の冷たさが指先を伝った。古王の呪冠の欠片が手に残り、呪われた道が示された。', endingPath: 'CursedKing' } },
      { text: '立ち去る', result: { narrative: '王冠は棚の上で静かに佇んでいる。あの怨念に触れる必要はまだない。' } },
    ],
  },
  {
    id: 'true_core_echo', title: '世界の響き',
    narrative: '何もない空間に、かすかな振動が伝わってくる。\n壁も天井も床も、全てが僅かに共鳴しており、何かが目覚めようとしている気配がする。\n「世界の中心を探せ。全ての始まりと終わりがそこにある」という言葉が脳裏に浮かんだ。',
    minFloor: 0, maxFloor: 3, oneTime: true, isEndingEvent: true, sanityWeight: 0.3, tint: 0x08081a,
    choices: [
      { text: '響きに応える', tooltip: '世界の核の声に応える。真実の道が開かれるかもしれない。',
        result: { narrative: '振動が体の中心を突き抜けた。世界の核片が手の中に現れ、真実への道が開かれた。', endingPath: 'TrueCore' } },
      { text: '無視する', result: { narrative: '振動はやがて静まり、世界は沈黙した。今は耳を傾ける時ではない。' } },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  //  キャラクター固有イベント
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'ash_raven_returns', title: '影の密使',
    narrative: '廃墟の柱の影に、見覚えのある男が立っていた。\n昔の同僚——国の秘密を共有した仲間の一人だ。\n彼の目に懐かしさと緊張が混じっている。「アッシュ……生きていたのか。」',
    minFloor: 0, maxFloor: 3, requiredCharacter: 'ash', tint: 0x262633,
    choices: [
      { text: '話を聞く',
        result: { narrative: '仲間の近況を聞いた。情報を交換し合い、お互いに背を向けて別の道へ歩いた。', hpPct: 0.1, sanity: 5 } },
      { text: '距離を置く',
        result: { narrative: '信じていいのかわからない。アッシュは静かに立ち去った。影の中では友を信じることが命取りになる。', sanity: -3 } },
    ],
  },
  {
    id: 'zeno_akari_memory', title: '妹の痕跡',
    narrative: '崩れた書架の奥に、見覚えのある魔法文字が刻まれた石版があった。\nアカリが研究していた術式の記録——ここを通ったのか、それとも手がかりなのか。\nゼノの手が、石版をそっとなぞる。',
    minFloor: 0, maxFloor: 3, requiredCharacter: 'zeno', tint: 0x1a1a40,
    choices: [
      { text: '石版を詳しく調べる',
        result: { narrative: '断片的な記録が読み取れた。アカリの足跡が——確かにここにある。希望が一つ増えた。', sanity: 8, skillDraft: 1 } },
      { text: '記録だけ写す',
        result: { narrative: '石版の内容を記憶に刻み込んだ。アカリを探す旅に、また一つ灯台ができた。', sanity: 5 } },
    ],
  },
  {
    id: 'bernhard_ash_oath', title: '王国の生き残り',
    narrative: '荒れ果てた野営地の跡に、老いた兵士が一人座っていた。\nその胸の紋章——かつてベルンハルトが仕えた王国のものだ。\n老兵はベルンハルトを見上げ、「……将軍、生きておられたか」と震える声で言った。',
    minFloor: 0, maxFloor: 3, requiredCharacter: 'bernhard', tint: 0x33261a,
    choices: [
      { text: '共に戦った日々を語る',
        result: { narrative: 'かつての戦場の記憶を語り合った。老兵の目に涙が光る。贖罪の道は、まだ続いている。', hpPct: 0.15, sanity: 6 } },
      { text: '先を急ぐ',
        result: { narrative: 'ベルンハルトは足を止めなかった。過去を振り返る時間はない——まだやるべきことがある。', sanity: -2 } },
    ],
  },
  {
    id: 'lavinia_contract_fade', title: '契約の衰え',
    narrative: '一瞬だけ、体から力が抜けた。\n契約の紋様が薄れているのがわかる——代償が、また一段階進んだのだ。\nラヴィニアはそれを静かに受け止め、それでも前を向いた。',
    minFloor: 0, maxFloor: 3, requiredCharacter: 'lavinia', tint: 0x400d33,
    choices: [
      { text: '契約の力を再確認する',
        result: { narrative: '力はまだある。衰えを認めた上で、今ある力を最大限に使う——それがラヴィニアの選択だ。', relicPool: 'Uncommon', maxHP: -5 } },
      { text: '衰えを受け入れ、進む',
        result: { narrative: '命の時間が減る分、この旅の密度が増す。ラヴィニアは静かに微笑み、歩き続けた。', sanity: 3 } },
    ],
  },
  {
    id: 'lilia_gods_silence', title: '神の沈黙',
    narrative: '目の前の負傷した旅人に、回復の祈りを捧げた。\nしかし——何も起きなかった。神の声が、届かない。\nリリアは膝をついたまま、しばらく動けなかった。',
    minFloor: 0, maxFloor: 3, requiredCharacter: 'lilia', tint: 0x1a1a26,
    choices: [
      { text: 'それでも祈り続ける',
        result: { narrative: '繰り返し祈り続けた。やがてかすかな光が宿り、旅人の傷が少しだけ癒えた。\n神は、聞いていた。', hpPct: 0.1, sanity: 5 } },
      { text: '自分の手で傷を手当する',
        result: { narrative: '神の力ではなく、自分の手で処置を施した。\n神に頼らなくても、できることはある——リリアは静かにそれを学んだ。', sanity: 8 } },
    ],
  },
];

/** エンディングパス → 証印レリックID */
export const ENDING_RELIC_ID: Record<string, string> = {
  DemonKing: 'ending_demon_king',
  AbyssGod: 'ending_abyss_god',
  TimeWraith: 'ending_time_wraith',
  CursedKing: 'ending_cursed_king',
  TrueCore: 'ending_true_core',
};
