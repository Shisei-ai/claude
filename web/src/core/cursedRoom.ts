// 呪われた間 — 入るたびに6つの部屋の型から1つを抽選する (Web版拡張)。
// Unity版 NodeFieldLoot.ResolveCursedAltar (HP-15% → レアのレリック) は「呪いの祭壇」として残し、
// レリックが出るのはこの型だけ (出る確率は低め)。どの型も立ち去ることができる。
// 部屋と数値はノードの contentSeed から決まるので、中断・再開しても同じ部屋になる。
import type { RunState, UnitState } from './run';
import { getEffectiveMaxHP, damageRun, earnGold, addSanity, partyUnits, fullRestore } from './run';
import { addJP, jpToNextJobLevel, MAX_JOB_LEVEL, unitHasSkill } from './level';
import { hasEffect, riskRewardMultiplier, drawRelic, addRelicToRun, randomCurse, CURSE_INFO } from './relics';
import type { Rng } from './rng';

export type CursedRoomId = 'bloodAltar' | 'cursedAltar' | 'whisperMirror' | 'sealedCoffin' | 'taintedSpring' | 'deadBargain';

export interface CursedRoomDef {
  id: CursedRoomId;
  title: string;
  narrative: string;
  /** 抽選の重み (呪いの祭壇だけ低め) */
  weight: number;
  /** 受け入れる側のボタンの動詞 */
  verb: string;
  /** 受け入れたあとの文 */
  resultNarrative: string;
  /** 1人だけが受ける型 (仲間がいれば誰が受けるか選ぶ) */
  single?: boolean;
  /** HPを削る型 (罠師の知識で半減する) */
  trap?: boolean;
}

export const CURSED_ROOMS: CursedRoomDef[] = [
  {
    id: 'bloodAltar', title: '血の祭壇', weight: 3, verb: '祭壇に触れる', trap: true,
    narrative: '黒ずんだ祭壇の溝に、乾いた血がこびりついている。\n触れれば何かを奪われ、何かを得るだろう。',
    resultNarrative: '祭壇が血を啜り、足元に金貨がこぼれ落ちた。',
  },
  {
    id: 'cursedAltar', title: '呪いの祭壇', weight: 1, verb: '遺物を掴む', trap: true,
    narrative: '骨で組まれた祭壇の上に、禍々しい光を放つ遺物が浮かんでいる。\n手を伸ばせば、呪いもまた手を伸ばしてくる。',
    resultNarrative: '焼けるような痛みとともに、遺物が手の中に収まった。',
  },
  {
    id: 'whisperMirror', title: '囁く鏡', weight: 2, verb: '鏡を覗く', single: true,
    narrative: 'ひび割れた姿見が、こちらの名を囁いている。\n覗き込めば、まだ知らぬ技を教えてやろう、と。',
    resultNarrative: '鏡の中の自分が笑い、技の型を刻み込んでいった。\n……何かが憑いてきた気がする。',
  },
  {
    id: 'sealedCoffin', title: '封じられた棺', weight: 2, verb: '鎖を解く',
    narrative: '鎖で縛られた黒い棺が、内側から叩かれている。\n棺の脇には、副葬品らしき金貨と武具が積まれている。',
    resultNarrative: '鎖が弾け飛び、棺の中から何かが這い出してきた——！',
  },
  {
    id: 'taintedSpring', title: '穢れた泉', weight: 2, verb: '泉の水を飲む',
    narrative: '黒く濁った泉が、甘い香りを漂わせている。\n飲めば傷は癒えるだろう。だが、心は濁りに沈む。',
    resultNarrative: '傷がみるみる塞がっていく。\n代わりに、頭の奥で知らない声が囁き始めた。',
  },
  {
    id: 'deadBargain', title: '亡者の取引', weight: 2, verb: '取引に応じる', single: true,
    narrative: '襤褸をまとった亡者が、金貨の袋を差し出している。\n「その命を、少しだけ分けてくれないか」',
    resultNarrative: '亡者の冷たい指が触れると、体の芯から何かが抜けていった。\n袋はずしりと重い。',
  },
];

/** 部屋ごとの数値 */
export const BLOOD_ALTAR_DAMAGE = 0.10;    // 生きている全員が最大HPの10%
export const CURSED_ALTAR_DAMAGE = 0.15;   // 主人公が最大HPの15% (Unity版と同じ)
export const SPRING_SANITY = -2;
export const BARGAIN_MAXHP_PCT = 0.10;     // 1人の最大HP(基礎値)の10%
/** 封じられた棺: 強敵に勝ったときのゴールド倍率 (装備1つも得る・レリックは出ない) */
export const COFFIN_GOLD_MULT = 1.5;

export interface CursedRoomOffer {
  room: CursedRoomDef;
  /** 受け取るゴールド (血の祭壇・亡者の取引) */
  gold: number;
}

/** 部屋を抽選して数値を決める */
export function rollCursedRoom(run: RunState, rng: Rng): CursedRoomOffer {
  const total = CURSED_ROOMS.reduce((a, r) => a + r.weight, 0);
  let roll = rng.next() * total;
  let room = CURSED_ROOMS[0];
  for (const r of CURSED_ROOMS) {
    roll -= r.weight;
    if (roll < 0) { room = r; break; }
  }
  // 悪魔の帳簿: 呪われた間の報酬2倍
  const mult = riskRewardMultiplier(run);
  const gold = room.id === 'bloodAltar' ? Math.round((60 + rng.range(0, 41)) * mult)
    : room.id === 'deadBargain' ? Math.round((120 + rng.range(0, 41)) * mult)
    : 0;
  return { room, gold };
}

/** 罠師の知識 (アッシュ): トラップダメージ50%軽減 */
export function hasTrapMastery(run: RunState): boolean {
  // アッシュの「盗賊の技」(キャラLv6) で得る
  return partyUnits(run).some((u) => unitHasSkill(u, 'SKL_A_TrapMastery'));
}

function trapDamage(run: RunState, unit: UnitState, pct: number): number {
  return Math.round(getEffectiveMaxHP(run, unit) * pct * (hasTrapMastery(run) ? 0.5 : 1));
}

function bargainLoss(unit: UnitState): number {
  return Math.max(1, Math.round(unit.maxHPBase * BARGAIN_MAXHP_PCT));
}

/** 受ける人を選べるか (囁く鏡は職Lvが上がりきった人には効かない) */
export function canReceive(offer: CursedRoomOffer, unit: UnitState): boolean {
  if (offer.room.id === 'whisperMirror') return unit.jobLevel < MAX_JOB_LEVEL;
  return true;
}

/** ボタンに添える代償と見返り */
export function cursedRoomLabel(run: RunState, offer: CursedRoomOffer): string {
  const hasParty = run.partyMembers.length > 0;
  const trapPct = (pct: number) => Math.round(pct * 100 * (hasTrapMastery(run) ? 0.5 : 1));
  switch (offer.room.id) {
    case 'bloodAltar':
      return hasParty ? `全員 HP-${trapPct(BLOOD_ALTAR_DAMAGE)}% / +${offer.gold}G`
        : `HP-${trapDamage(run, run, BLOOD_ALTAR_DAMAGE)} / +${offer.gold}G`;
    case 'cursedAltar':
      return `${hasParty ? '主人公 ' : ''}HP-${trapDamage(run, run, CURSED_ALTAR_DAMAGE)} / ${hasEffect(run, 'RiskRewardMaster') ? 'ボス級' : 'レア'}のレリック`;
    case 'whisperMirror':
      return `呪い1つ / ${hasParty ? '1人の' : ''}職Lv+1`;
    case 'sealedCoffin':
      return '強敵と戦う';
    case 'taintedSpring':
      return `全員HP・MP全回復 / 正気度${SPRING_SANITY}`;
    case 'deadBargain':
      return hasParty ? `1人の最大HP-${Math.round(BARGAIN_MAXHP_PCT * 100)}% / +${offer.gold}G`
        : `最大HP-${bargainLoss(run)} / +${offer.gold}G`;
  }
}

/** 部屋の効果の詳しい説明 (物語の下に出す) */
export function cursedRoomDetail(offer: CursedRoomOffer): string {
  switch (offer.room.id) {
    case 'bloodAltar': return '生きている全員が最大HPの10%を失い、正気度が1下がる。代わりに金貨を得る。';
    case 'cursedAltar': return '主人公が最大HPの15%を失う。代わりにレアのレリックを1つ得る。';
    case 'whisperMirror': return '呪いを1つ受ける。代わりに1人の職Lvが1上がり、その段階の技を覚える。';
    case 'sealedCoffin': return '棺から出てくる強敵と戦う。勝てば戦闘のゴールドが1.5倍になり、装備を1つ得る（レリックは出ない）。';
    case 'taintedSpring': return '全員のHPとMPが完全に回復し、倒れた仲間も起き上がる。代わりに正気度が2下がる。';
    case 'deadBargain': return '1人の最大HPが10%減る。代わりに多めの金貨を得る。';
  }
}

export interface CursedRoomOutcome {
  lines: string[];
  /** 封じられた棺: このあと強敵戦 */
  battle: boolean;
}

/** 受け入れたときの効果を適用する (unit は1人だけが受ける型の対象、who はその人の名前の前置き) */
export function applyCursedRoom(run: RunState, offer: CursedRoomOffer, unit: UnitState = run, who = ''): CursedRoomOutcome {
  const lines: string[] = [];
  switch (offer.room.id) {
    case 'bloodAltar': {
      for (const u of partyUnits(run)) if (u.currentHP > 0) damageRun(run, trapDamage(run, u, BLOOD_ALTAR_DAMAGE), u);
      addSanity(run, -1);
      earnGold(run, offer.gold);
      lines.push(`${run.partyMembers.length > 0 ? '全員 ' : ''}HP-${Math.round(BLOOD_ALTAR_DAMAGE * 100 * (hasTrapMastery(run) ? 0.5 : 1))}%　正気度 -1　+${offer.gold} G`);
      break;
    }
    case 'cursedAltar': {
      const dmg = trapDamage(run, run, CURSED_ALTAR_DAMAGE);
      damageRun(run, dmg, run);
      lines.push(`HP -${dmg}`);
      const relic = drawRelic(run, hasEffect(run, 'RiskRewardMaster') ? 'Boss' : 'Rare') ?? drawRelic(run, 'Rare');
      if (relic) {
        const cursesBefore = run.curses.length;
        addRelicToRun(run, relic);
        lines.push(`「${relic.name}」を得た (${relic.description})`);
        if (run.curses.length > cursesBefore) lines.push('…呪いも憑いてきた');
      } else {
        // 出せるレリックが残っていなければ金貨に替える
        const gold = Math.round(100 * riskRewardMultiplier(run));
        earnGold(run, gold);
        lines.push(`遺物は崩れ、金貨だけが残った (+${gold} G)`);
      }
      break;
    }
    case 'whisperMirror': {
      const curse = randomCurse();
      run.curses.push(curse);
      lines.push(`【${CURSE_INFO[curse].name}】を受けた…`);
      if (unit.jobLevel < MAX_JOB_LEVEL) {
        const learned = addJP(run, Math.max(0, jpToNextJobLevel(unit.jobLevel) - unit.currentJobJP), unit);
        lines.push(`${who}職Lv.${unit.jobLevel} に上がった`);
        if (learned.length > 0) lines.push(`新スキル習得: ${learned.map((s) => s.name).join('、')}`);
      }
      break;
    }
    case 'sealedCoffin':
      return { lines, battle: true };
    case 'taintedSpring': {
      for (const u of partyUnits(run)) fullRestore(run, u);
      addSanity(run, SPRING_SANITY);
      lines.push(`${run.partyMembers.length > 0 ? '全員のHP・MPが完全に回復した' : 'HP・MPが完全に回復した'}　正気度 ${SPRING_SANITY}`);
      break;
    }
    case 'deadBargain': {
      const loss = bargainLoss(unit);
      unit.maxHPBase = Math.max(1, unit.maxHPBase - loss);
      unit.currentHP = Math.min(unit.currentHP, getEffectiveMaxHP(run, unit));
      earnGold(run, offer.gold);
      lines.push(`${who}最大HP -${loss}　+${offer.gold} G`);
      break;
    }
  }
  return { lines, battle: false };
}
