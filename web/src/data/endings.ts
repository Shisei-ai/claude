// エンディングシステム — Unity版 Roguelike/EndingSystem.cs の移植
// 5つの結末: 魔王再誕 / 深淵神覚醒 / 時の亡霊 / 呪われた王の終焉 / 世界の核(真)
//
// Floor4ボスのステータスはUnity版 (de185a5 で再設計された実戦値) を忠実移植。
// アクションはUnity版がプレースホルダー(虚無の打撃/Skill=null)だったため、
// 各ボスのステータス特性に合わせて Web 版で新規デザイン。
import type { EnemyDef, SkillDef } from '../core/types';

export type EndingType = 'DemonKing' | 'AbyssGod' | 'TimeWraith' | 'CursedKing' | 'TrueCore';

function bossSkill(p: Partial<SkillDef> & Pick<SkillDef, 'id' | 'name' | 'description'>): SkillDef {
  return {
    element: 'Physical', damageType: 'Physical', mpCost: 0,
    basePower: 0, hitCount: 1, hitsAllEnemies: false, hitsAllAllies: false,
    canBreak: false, isHeal: false, healPower: 0,
    ...p,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  Floor 4 ボス5体 (EndingSystem.CreateBoss のステータス準拠)
// ══════════════════════════════════════════════════════════════════════

const VARNA_MALAK: EnemyDef = {
  id: 'f4b_demon_king', name: '魔王ヴァルナ＝マルアーク', rank: 'Boss',
  lore: '古代の戦争が終わった後も、魔王の意志だけは奈落の玉座に宿り続けた。幾千年の時を経て、その意志はついに肉体を取り戻そうとしている。',
  stats: {
    maxHP: 4200, maxMP: 0, physicalAttack: 115, magicAttack: 80,
    physicalDefense: 52, magicDefense: 40, speed: 72, luck: 0,
    criticalRate: 10, accuracyRate: 94,
  },
  shieldPoints: 4, isUndead: false,
  elementWeaknesses: ['Light'],
  actions: [
    { skill: bossSkill({ id: 'f4b_dk_blade', name: '魔剣・滅国',
        description: '王国を滅ぼした魔剣が一体を両断する。', basePower: 1.8 }),
      priority: 2, useChance: 0.40, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_dk_hellfire', name: '奈落の炎',
        description: '玉座の底から噴き上がる黒炎が全体を焼く。',
        element: 'Dark', damageType: 'Magical', basePower: 1.1, hitsAllEnemies: true }),
      priority: 2, useChance: 0.25, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_dk_dread', name: '玉座の威圧',
        description: '魔王の威圧が全体の闘志を挫く。物理攻撃力-30%(2ターン)。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 1,
        appliedStatus: { type: 'AtkDown', duration: 2, value: 0.30 } }),
      priority: 1, useChance: 0.20, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_dk_regen', name: '闇の帰還',
        description: '奈落の闇が魔王の傷を呑み込み、HPを250回復する。',
        healAmountFlat: 250 }),
      priority: 3, useChance: 0.15, healthThreshold: 30 },
  ],
  actionsPerTurn: 2,
  expReward: 900, jpReward: 220, goldReward: 350,
  tint: 0x5a0a14,
};

const WORM_ABYSS: EnemyDef = {
  id: 'f4b_abyss_god', name: '深淵神ウォルム', rank: 'Boss',
  lore: '世界の底に眠る神殿は、人の手によって建てられたものではない。深淵そのものが意志を持ち、崇拝者を求めて口を開け続けている。',
  stats: {
    maxHP: 4000, maxMP: 0, physicalAttack: 85, magicAttack: 110,
    physicalDefense: 30, magicDefense: 60, speed: 80, luck: 0,
    criticalRate: 8, accuracyRate: 96,
  },
  shieldPoints: 3, isUndead: false,
  elementWeaknesses: ['Light', 'Fire'],
  actions: [
    { skill: bossSkill({ id: 'f4b_ag_gaze', name: '深淵の凝視',
        description: '神の視線が一体の存在を圧し潰す。',
        element: 'Dark', damageType: 'Magical', basePower: 1.5 }),
      priority: 2, useChance: 0.35, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_ag_void_wave', name: '虚無の波動',
        description: '深淵の波動が全てを呑み込む。',
        element: 'Dark', damageType: 'Magical', basePower: 1.0, hitsAllEnemies: true }),
      priority: 2, useChance: 0.30, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_ag_thousand_eyes', name: '千の眼',
        description: '無数の目が開き、全体の視界を灼く。25%の確率で暗闇。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 0.25,
        appliedStatus: { type: 'Blind', duration: 3, value: 0 } }),
      priority: 1, useChance: 0.20, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_ag_tentacle', name: '深淵の巨腕',
        description: '虚無から現れた巨腕が一体を叩き潰す。', basePower: 1.8 }),
      priority: 2, useChance: 0.15, healthThreshold: 0 },
  ],
  actionsPerTurn: 2,
  expReward: 950, jpReward: 230, goldReward: 360,
  tint: 0x0a1450,
};

const EON_WRAITH: EnemyDef = {
  id: 'f4b_time_wraith', name: '時の亡霊エオン', rank: 'Boss',
  lore: '時間の断層に挟まれたこの空間では、過去も未来も同時に存在する。時の亡霊は永遠の中に閉じ込められ、解放を求めてさまよっている——あるいは、さらなる生贄を。',
  stats: {
    maxHP: 3600, maxMP: 0, physicalAttack: 100, magicAttack: 95,
    physicalDefense: 45, magicDefense: 50, speed: 105, luck: 0,
    criticalRate: 15, accuracyRate: 96,
  },
  shieldPoints: 3, isUndead: false,
  elementWeaknesses: ['Light', 'Lightning'],
  actions: [
    { skill: bossSkill({ id: 'f4b_tw_timeslash', name: '時斬り',
        description: '止まった時間の隙間から刃が届く。', basePower: 1.4 }),
      priority: 2, useChance: 0.40, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tw_flurry', name: '刹那の連撃',
        description: '一瞬の間に三度の斬撃が走る。', basePower: 0.6, hitCount: 3 }),
      priority: 2, useChance: 0.30, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tw_timestop', name: '時間停止',
        description: '対象の時間を止める。50%の確率で行動不能(1ターン)。',
        element: 'None', damageType: 'Magical', statusChance: 0.50,
        appliedStatus: { type: 'ActionSeal', duration: 1, value: 0 } }),
      priority: 1, useChance: 0.20, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tw_paradox', name: '時間遡行',
        description: '傷を負う前の時間へ巻き戻る。HPを200回復する。',
        healAmountFlat: 200 }),
      priority: 3, useChance: 0.10, healthThreshold: 40 },
  ],
  actionsPerTurn: 2,
  expReward: 880, jpReward: 215, goldReward: 340,
  tint: 0x2a1a50,
};

const ALDRIC_CURSED: EnemyDef = {
  id: 'f4b_cursed_king', name: '呪われた王アルドリック', rank: 'Boss',
  lore: 'かつて栄光ある王国があった場所に、今は呪いだけが残っている。王は死んでいるが、呪いは死なない。玉座は今も、主を待ち続けている。',
  stats: {
    maxHP: 4200, maxMP: 0, physicalAttack: 120, magicAttack: 90,
    physicalDefense: 70, magicDefense: 45, speed: 65, luck: 0,
    criticalRate: 10, accuracyRate: 92,
  },
  shieldPoints: 5, isUndead: true,
  elementWeaknesses: ['Light', 'Fire'],
  actions: [
    { skill: bossSkill({ id: 'f4b_ck_kingblade', name: '呪剣・王権',
        description: '王権の重みを乗せた一撃が一体を打ち砕く。', basePower: 1.8 }),
      priority: 2, useChance: 0.35, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_ck_grudge_sweep', name: '怨嗟の一薙ぎ',
        description: '数百年の怨念が刃となり全体を薙ぐ。', basePower: 1.2, hitsAllEnemies: true }),
      priority: 2, useChance: 0.25, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_ck_royal_curse', name: '王の呪詛',
        description: '古い呪いが全体の力を奪う。攻撃・防御-20%(3ターン)。',
        element: 'Dark', damageType: 'Magical', hitsAllEnemies: true, statusChance: 1,
        appliedStatus: { type: 'DefDown', duration: 3, value: 0.20 } }),
      priority: 1, useChance: 0.20, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_ck_curse_mail', name: '呪鎧の再生',
        description: '呪いが鎧を編み直す。シールド+2。', shieldRestore: 2 }),
      priority: 3, useChance: 0.20, healthThreshold: 0 },
  ],
  actionsPerTurn: 2,
  expReward: 920, jpReward: 225, goldReward: 355,
  tint: 0x460a46,
};

const TRUE_CORE: EnemyDef = {
  id: 'f4b_true_core', name: '世界の核（真の形態）', rank: 'TrueFinalBoss',
  lore: '世界の中心には核がある。全ての生命、全ての魔法、全ての時間の源泉。真の姿を見た者は数少ない——そして見た者の多くは、戻ってこなかった。',
  stats: {
    maxHP: 5000, maxMP: 0, physicalAttack: 130, magicAttack: 115,
    physicalDefense: 60, magicDefense: 60, speed: 100, luck: 0,
    criticalRate: 12, accuracyRate: 96,
  },
  shieldPoints: 6, isUndead: false,
  elementWeaknesses: ['Dark', 'Light'],
  actions: [
    { skill: bossSkill({ id: 'f4b_tc_origin_light', name: '起源の光',
        description: '世界の始まりの光が一体を貫く。',
        element: 'Light', damageType: 'Magical', basePower: 1.5 }),
      priority: 2, useChance: 0.30, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tc_finality', name: '終焉の波',
        description: '終わりの波動が全体を洗い流す。',
        element: 'None', damageType: 'Magical', basePower: 1.2, hitsAllEnemies: true }),
      priority: 2, useChance: 0.25, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tc_collapse', name: '崩界の一撃',
        description: '世界の質量そのものを乗せた一撃。', basePower: 2.2 }),
      priority: 2, useChance: 0.20, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tc_law', name: '万象の理',
        description: '世界法則が書き換わり、全体の速度-25%(2ターン)。',
        element: 'None', damageType: 'Magical', hitsAllEnemies: true, statusChance: 1,
        appliedStatus: { type: 'SpdDown', duration: 2, value: 0.25 } }),
      priority: 1, useChance: 0.15, healthThreshold: 0 },
    { skill: bossSkill({ id: 'f4b_tc_pulse', name: '核の脈動',
        description: '世界の鼓動が核を修復する。HPを300回復する。',
        healAmountFlat: 300 }),
      priority: 3, useChance: 0.15, healthThreshold: 40 },
  ],
  actionsPerTurn: 2,
  expReward: 1200, jpReward: 320, goldReward: 600,
  tint: 0x14141c,
};

// ══════════════════════════════════════════════════════════════════════
//  エンディング定義 (物語テキストは EndingSystem.cs 原文)
// ══════════════════════════════════════════════════════════════════════

export interface EndingDef {
  type: EndingType;
  premonitionTitle: string;
  premonitionText: string;
  endingTitle: string;
  endingTextWon: string;
  endingTextLost: string;
  floorName: string;
  floorSubtitle: string;
  floorLore: string;
  tint: number;
  boss: EnemyDef;
}

export const ENDINGS: Record<EndingType, EndingDef> = {
  DemonKing: {
    type: 'DemonKing',
    premonitionTitle: '「魔王再誕」への道が開かれた',
    premonitionText: '闇の奥底から玉座が呼んでいる。魔王の意志はまだ死んでいない——それはあなたを待ち続けている。',
    endingTitle: 'エンディング：魔王再誕',
    endingTextWon:
      '魔王ヴァルナ＝マルアークの肉体は砕け、奈落の玉座は静寂に包まれた。' +
      'しかし、その死の瞬間に彼の最後の言葉が世界に刻まれた。' +
      '「闇は消えない——それは形を変えて、また戻ってくる。」' +
      'あなたは廃墟を後にした。背後に広がる暗闇が、静かに笑っていた。',
    endingTextLost:
      '魔王の力に圧倒され、あなたは奈落の縁から命からがら脱出した。' +
      '玉座は今も闇の中に沈んでいる——そして魔王はまだ待っている。' +
      '敗北の苦みを胸に刻み、あなたは傷ついた体を引きずって戻った。' +
      'いつかまた、あの扉を開けることができるだろうか。',
    floorName: '奈落の玉座', floorSubtitle: '全ての闇の終着点',
    floorLore: '古代の戦争が終わった後も、魔王の意志だけは奈落の玉座に宿り続けた。幾千年の時を経て、その意志はついに肉体を取り戻そうとしている。',
    tint: 0x4d050d, boss: VARNA_MALAK,
  },
  AbyssGod: {
    type: 'AbyssGod',
    premonitionTitle: '「深淵神覚醒」への道が開かれた',
    premonitionText: '深淵は静かに口を開け、あなたの魂を覗き込んでいる。神に見つめられた者は、もはや引き返せない。',
    endingTitle: 'エンディング：深淵神覚醒',
    endingTextWon:
      '深淵神ウォルムは最後の叫びと共に虚空へと消えていった。' +
      '神殿の壁に刻まれた無数の目が、一つずつ閉じていく。' +
      '深淵は口を閉じ、長い眠りに就いた——少なくとも、今は。' +
      'あなたは光の届かない神殿を後にし、地上の空気を初めて懐かしく思った。',
    endingTextLost:
      '深淵神の眼差しがあなたの精神を侵食し、足が止まった。' +
      '神には勝てなかった——そして深淵は今も広がり続けている。' +
      'あなたは這うようにして神殿を脱出し、外の世界へと戻った。' +
      'あの目はまだ、どこかであなたを見つめている気がした。',
    floorName: '深淵神殿', floorSubtitle: '深淵が口を開ける',
    floorLore: '世界の底に眠る神殿は、人の手によって建てられたものではない。深淵そのものが意志を持ち、崇拝者を求めて口を開け続けている。',
    tint: 0x050d40, boss: WORM_ABYSS,
  },
  TimeWraith: {
    type: 'TimeWraith',
    premonitionTitle: '「時の亡霊」への道が開かれた',
    premonitionText: '時計の針が止まり、過去と未来が交わる場所がある。亡霊は永遠の中であなたの訪れを待ち望んでいた。',
    endingTitle: 'エンディング：時の亡霊との邂逅',
    endingTextWon:
      '時の亡霊エオンは時間の裂け目に飲み込まれ、その姿は霧のように消えた。' +
      '止まっていた時計の針が、再びゆっくりと動き始める。' +
      '過去と未来は元の流れへと戻り、空白だった時間が静かに埋まっていった。' +
      'あなたは時の外から現在へと帰還し、命の鼓動が確かであることを感じた。',
    endingTextLost:
      '時間の歪みの中で方向感覚を失い、あなたは何度も同じ場所に戻ってきた。' +
      '亡霊は笑いながら時の波間に消えていった。' +
      '気づけば時の空白の外へと押し出され、現実へと弾き返されていた。' +
      '時計の針が刻む音だけが、あの場所の現実を証明している。',
    floorName: '時の空白', floorSubtitle: '時が止まる場所',
    floorLore: '時間の断層に挟まれたこの空間では、過去も未来も同時に存在する。時の亡霊は永遠の中に閉じ込められ、解放を求めてさまよっている——あるいは、さらなる生贄を。',
    tint: 0x261a40, boss: EON_WRAITH,
  },
  CursedKing: {
    type: 'CursedKing',
    premonitionTitle: '「呪われた王の終焉」への道が開かれた',
    premonitionText: '古い呪いの声が廃墟の石畳に染み込んでいる。王の骨は砕けても、その怨念だけは今も王座を離れない。',
    endingTitle: 'エンディング：呪われた王の終焉',
    endingTextWon:
      '呪われた王アルドリックの呪縛が解け、玉座間に積もった呪いの霧が晴れた。' +
      '数百年続いた古い呪いが、ついに終わりを迎えた瞬間だった。' +
      '王の亡霊は安らかな表情で光の中へと消え、「ありがとう」という声が残った。' +
      '呪いから解放された城は、静かな廃墟として風雨に委ねられていった。',
    endingTextLost:
      '呪いの重さに耐えきれず、あなたは玉座間から退いた。' +
      '王の怨念はまだ城の石に染み込んでいる——呪いは続く。' +
      '傷ついた心と体を抱えて、あなたは呪われた城を後にした。' +
      'いつかこの呪いを断ち切るために、もう一度戻れるだろうか。',
    floorName: '呪縛の玉座間', floorSubtitle: '古い呪いの終焉',
    floorLore: 'かつて栄光ある王国があった場所に、今は呪いだけが残っている。王は死んでいるが、呪いは死なない。玉座は今も、主を待ち続けている。',
    tint: 0x33052f, boss: ALDRIC_CURSED,
  },
  TrueCore: {
    type: 'TrueCore',
    premonitionTitle: '「世界の核」への道が開かれた',
    premonitionText: '世界の中心で何かが目覚めようとしている。全ての始まりと終わりが交差する場所で、真実があなたを待つ。',
    endingTitle: '真のエンディング：世界の核',
    endingTextWon:
      '世界の核が砕け、その光が全ての闇を一瞬だけ照らし出した。' +
      '始まりと終わりが交差した場所で、あなたは真実の断片を目にした。' +
      '世界はまだここにある——あなたが守ったから、あるいは、元々続くはずだったから。' +
      '核の欠片を胸に抱き、あなたは世界の中枢を後にした。世界は、続いていく。',
    endingTextLost:
      '世界の核の前に、あなたの力は及ばなかった。' +
      '真実はあまりにも重く、あまりにも眩しかった。' +
      'それでも世界は存在し続け、核はまた静かな眠りについた。' +
      '真の形態を見た者として、あなたは密かな使命を胸に帰還した。',
    floorName: '世界の中枢', floorSubtitle: '全ての始まりと終わり',
    floorLore: '世界の中心には核がある。全ての生命、全ての魔法、全ての時間の源泉。真の姿を見た者は数少ない——そして見た者の多くは、戻ってこなかった。',
    tint: 0x0d0d0d, boss: TRUE_CORE,
  },
};

/** デフォルトエンディング (証印なしでヴァルゴットを撃破) */
export const DEFAULT_ENDING_TEXT =
  '長い戦いの末、あなたは再び出発点に立っていた。' +
  '世界は変わり、しかし続いていく。' +
  'あなたの歩んだ道は消えない。' +
  'また、歩き出す時が来るだろう。';

// ══════════════════════════════════════════════════════════════════════
//  キャラクター別エピローグ (EndingSystem.GetCharacterEpilogue 原文)
// ══════════════════════════════════════════════════════════════════════

export function getCharacterEpilogue(characterId: string, won: boolean): string {
  switch (characterId) {
    case 'ash': return won
      ? '魔王の玉座が砕け落ちる音の中、アッシュはただ静かに立っていた。\n国の秘密を知りすぎた男が行き着いた先がここだったとは——皮肉だとは思わない。\n影の中を生きた者が、最後に光の前に立った。それでいい。'
      : '今日は届かなかった。だが、アッシュは今日も生き延びた。\n逃げることを知っている男に、敗北は付きものだ——重要なのは、次があるということだ。\nまた始まりの場所に戻ってきた。次は、もっと上手くやる。';
    case 'zeno': return won
      ? 'アカリ——。\nこの勝利をどれだけ彼女に伝えたかったか。どんな代償を払っても取り戻すと誓ったあの日から、ゼノはずっと走り続けてきた。\nまだ終わりではない。でも、今日だけは少し休んでいい気がした。'
      : '届かなかった。アカリへの誓いを、また果たせなかった。\nゼノの目には悔しさよりも、静かな決意が宿っていた。\n死は許されない——まだ取り戻すべき者がいる限り。';
    case 'bernhard': return won
      ? '灰になった王国の記憶が、少しだけ安らいだ気がした。\n死んでいった仲間たちに、今日の結果を報告できるだろうか。ベルンハルトにはまだわからない。\nだが剣を置く理由が、今日も見つからなかった。贖罪はまだ続く。'
      : 'また敗れた。しかしベルンハルトは戦場から戻った——今日も、生き残った。\nそれが罰なのか試練なのか、彼にはわからない。\n倒れた仲間たちの分まで立ち続けること。それだけが今の彼にできることだ。';
    case 'lavinia': return won
      ? '契約の代償が体を蝕んでいるのを感じながら、ラヴィニアはそれでも微笑んだ。\n時間を対価に力を得た——その選択に後悔はない。今日もその力は世界に意味をもたらした。\n残された時間を、どう使うか。それだけを考えながら、彼女は歩き続ける。'
      : '力が続かなかった。ラヴィニアは冷静に自分の限界を受け止めた。\n衰えは確実に進んでいる——それでも、まだ諦める気はない。\nこの旅はまだ終わらない。契約の時間が尽きる、その日まで。';
    case 'lilia': return won
      ? '神様、聞こえていますか——祈りが届いた気がします。\n傷ついた人を癒したい、ただそれだけで歩き続けてきた。今日、その願いが一つ叶った。\nリリアはまた祈る。次の旅でも、力が必要な誰かのために。'
      : '今日は守れなかった。リリアは涙をこらえながら、それでも前を向いた。\n怖かった。でも逃げなかった——それで十分だと、彼女は自分に言い聞かせた。\nまた進もう。次こそ、ちゃんと守れるように。';
    default: return '';
  }
}

export function getEnding(type: string | null): EndingDef | null {
  if (!type) return null;
  return ENDINGS[type as EndingType] ?? null;
}
