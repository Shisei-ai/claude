// キャラクターの台詞 — Unity版 CharacterDesigns/*Design.cs の VoiceLines / FieldLines と
// Roguelike/CharacterPrologueSystem.cs の原文をそのまま移植。
//
// ボス戦の直前・直後の台詞 (PreBossLine / AfterBossVictory) は、各キャラの物語上の
// 宿敵 (例: ベルンハルトの「ヴァルダー」) を前提にしており、Web版のどのボスに
// 対応させるか未定義のため、現時点では移植していない。
import type { ElementType } from '../core/types';

/** 戦闘中などに出す台詞 (同じ場面に複数あれば無作為に1つ) */
export interface CharLines {
  battleStart?: string[];
  victory?: string[];
  defeat?: string[];
  lowHP?: string[];
  levelUp?: string[];
  crit?: string[];
  boost?: string[];
  /** 敵を Break させたとき */
  breakEnemy?: string[];
  evade?: string[];
  /** Shadow State (影化) に入ったとき */
  shadow?: string[];
  /** 不撓不屈で踏みとどまったとき */
  indomitable?: string[];
  lowMP?: string[];
  /** 元素共鳴が起きたとき */
  resonance?: string[];
  /** 仲間のHPが危ないとき */
  lowAlly?: string[];
  absorbSuccess?: string[];
  absorbFail?: string[];
  getRelic?: string[];
  shop?: string[];
  rest?: string[];
  /** 特定のスキルを使ったとき (スキル名 → 台詞) */
  skill?: Record<string, string[]>;
  /** 属性別の攻撃スキルを使ったとき (特定スキルの台詞が無い場合) */
  element?: Partial<Record<ElementType, string[]>>;
  /** 上記に当てはまらないスキルを使ったとき (毎回は言わない) */
  genericSkill?: string[];
}

export const LINES: Record<string, CharLines> = {
  bernhard: {
    battleStart: ['行くぞ…！', '退かない、退けない。'],
    skill: {
      大地の盾: ['力を借りるぞ、大地よ。'],
      雷迸り: ['これは…魔法か。使えるが、本業ではない。'],
    },
    boost: ['本気を出す！', '全力だ…！'],
    lowHP: ['まだ…まだだ！', '倒れるわけにはいかない…！'],
    indomitable: ['死んでたまるか…！'],
    breakEnemy: ['崩した！今だ！'],
    victory: ['終わった。次に備えろ。', '…俺はただの兵士だ。'],
    defeat: ['すまない…もう少しだったのに…'],
    getRelic: ['使えそうだな。'],
    shop: ['必要なものだけ買え。余分な荷物は命取りだ。'],
    rest: ['腰を下ろせ。飯は俺が作る。'],
  },
  lavinia: {
    battleStart: ['さて、始めましょうか。', 'あなたたちでは、私には届かない。'],
    element: {
      Fire: ['赴くまま、燃え尽きなさい。'],
      Ice: ['冷えなさい。'],
      Lightning: ['…走れ。'],
      Wind: ['薙ぎ払いなさい。'],
      Dark: ['これが闇よ。'],
      Light: ['光あれ。…綺麗でしょう？'],
    },
    skill: {
      業火: ['全て、灰に。'],
      魔力爆発: ['これが私の全力よ。'],
      元素収束: ['共鳴した。…収束。'],
      魔力加速: ['急ぎましょう。'],
    },
    resonance: ['元素が響き合う…！'],
    boost: ['奥の手を使うわ。', '…契約の力を借りる。'],
    lowHP: ['…まずい。私としたことが。', 'これ以上は…さすがにね。'],
    lowMP: ['…魔力が切れかけている。不覚。'],
    crit: ['そこね。'],
    victory: ['予想通りの結末ね。', '…今日のところは、ね。'],
    defeat: ['…まだ、足りなかったか。'],
    getRelic: ['使えそうね。研究が必要だけれど。'],
    shop: ['知識に投資するのは、悪い選択ではないわ。'],
    rest: ['…甘いものはないかしら。聞かなかったことにして。'],
  },
  ash: {
    battleStart: ['仕事の時間か', '敵が多いな。ま、いいか'],
    genericSkill: ['そこだ'],
    shadow: ['影に溶けろ'],
    crit: ['急所'],
    evade: ['遅い'],
    skill: {
      罠設置: ['引っかかれ'],
      毒矢: ['よく効く毒だろ'],
    },
    lowHP: ['……まだだ'],
    victory: ['報酬は先払いな'],
    defeat: ['くそ……まだ死ねん'],
    levelUp: ['腕が上がった、気がする'],
  },
  lilia: {
    battleStart: ['みんなを守ります！', 'ここは私に任せて'],
    skill: {
      治癒: ['どうか、癒えて'],
      '治癒＋': ['どうか、癒えて'],
      聖癒: ['どうか、癒えて'],
      '聖癒＋': ['どうか、癒えて'],
      全体治癒: ['どうか、癒えて'],
      蘇生: ['まだ終わりじゃないよ！'],
      '蘇生＋': ['まだ終わりじゃないよ！'],
      完全蘇生: ['まだ終わりじゃないよ！'],
      聖光弾: ['聖光、裁け！'],
      '聖光弾＋': ['聖光、裁け！'],
      神罰: ['聖光、裁け！'],
    },
    lowAlly: ['大丈夫！今すぐ！'],
    lowHP: ['……まだ祈れます'],
    victory: ['皆さんご無事で良かった'],
    defeat: ['ごめんなさい……守れなかった'],
    levelUp: ['神様、ありがとうございます'],
  },
  zeno: {
    battleStart: ['……手間をかけさせるな', 'また生き物を呑み込む時間か'],
    skill: {
      呪縛: ['封じよ'],
      '呪縛＋': ['封じよ'],
      毒霧: ['封じよ'],
      恐怖の叫び: ['封じよ'],
      呪いの眼差し: ['封じよ'],
      '呪いの眼差し＋': ['封じよ'],
      魂縛: ['封じよ'],
      呪詛の霧: ['封じよ'],
      混沌の呪い: ['封じよ'],
      吸収: ['その力、もらい受ける'],
      '吸収＋': ['その力、もらい受ける'],
      魂喰い: ['その力、もらい受ける'],
      死の宣告: ['三を数えろ'],
      '死の宣告＋': ['三を数えろ'],
    },
    absorbSuccess: ['……悪くない技だ'],
    absorbFail: ['惜しい。次で仕留める'],
    lowHP: ['……死ぬつもりはない'],
    victory: ['使えた'],
    defeat: ['……まだ、終われない'],
    levelUp: ['力が積み重なっていく'],
  },
};

/** 階層に入ったときの台詞 (Web版の層番号 0〜2 → Unity版 OnEnterFloor1〜3)。
 *  {ALLY} は同行している仲間の名前に置き換える (仲間がいなければ出さない) */
export const FIELD_LINES: Record<string, Record<number, string>> = {
  bernhard: {
    0: '…懐かしい石畳だ。王都の面影がある。だが、ここはもう別の場所だ。',
    1: 'この森は生きている。俺には分かる。ここで死んだ者たちの気配がある。',
    2: '…お前も来たのか。{ALLY}。構わない。俺一人で終わらせられる問題でもないからな。',
  },
  lavinia: {
    0: '廃墟、ね。知識は滅びないわ。石が崩れても、記録は残る。…この場所にも、まだ何かが眠っているはずよ。',
    1: 'この森の魔力密度は異常ね。…あの研究所のデータと一致する。見覚えのある場所だわ。',
    2: '呪われた城。詩的な名前ね。…いいえ、これは比喩ではない。本物の呪いが城を包んでいる。感じる？',
  },
};

/** ラン開始時のプロローグ (CharacterPrologueSystem.GetPrologue) */
export const PROLOGUE: Record<string, string[]> = {
  ash: [
    '……また始まりの場所か。',
    '俺は国の秘密を知りすぎた。奴らに追われながらも、まだここに立っている。',
    '影の中を生きてきた。今度も、そうやって生き延びてやる。',
  ],
  zeno: [
    'アカリ……お前をこんな場所に閉じ込めてしまってすまない。',
    'どんな代償を払っても構わない。俺はお前を取り戻す。',
    '死は……まだ許されない。',
  ],
  bernhard: [
    '灰になった王国の記憶が、今も俺を縛っている。',
    '死んでいった仲間たちの顔が浮かぶ。俺だけが生き残った理由を、まだ見つけられていない。',
    'だが、剣を捨てる気はない。この手で贖罪を果たすまでは。',
  ],
  lavinia: [
    'また体が軽い。……いや、これが本当の衰えというものか。',
    '契約の代償は確実に私の時間を奪っていく。それでも、力を手放すつもりはない。',
    'この旅で何かが変わるかもしれない。そんな予感がする。',
  ],
  lilia: [
    '神様、どうか私に力を貸してください。',
    '傷ついた人を癒したい。ただそれだけのために、私はここにいる。',
    '怖くない、とは言えないけれど。……進まなきゃ。',
  ],
};

/** 候補から1つ選ぶ (無ければ null) */
export function pickLine(list: string[] | undefined): string | null {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

/** キャラの短い呼び名 (「ラヴィニア・ヴェルクロア」→「ラヴィニア」) */
export function shortName(fullName: string): string {
  return fullName.split('・')[0];
}
