// 能力表 — キャラのステータス・スキル (キャラLvで解放されるパッシブ込み) を一覧する重ね表示。
// 戦闘・マップ・装備画面で名前を押したとき、旅の支度でキャラを選ぶときに開く。
// 旅の途中なら今のレベル・装備込みの値と習得済みのスキル、旅立ち前なら初期値と習得予定のスキルを出す。
import Phaser from 'phaser';
import { COLORS, textStyle, titleStyle, latinStyle, drawPanel, makeButton } from './theme';
import { getCharacter } from '../data/characters';
import { levelPassivesOf } from '../data/levelPassives';
import { buildBattleStats, getEffectiveMaxHP, getMaxMP, type RunState, type UnitState } from '../core/run';
import { getEquipment, EQUIP_RARITY_COLOR } from '../data/equipment';
import { findEnemySkillById } from '../data/enemies';
import { charPortraitKey, charFullKey } from '../data/assets';
import { hasArt } from '../scenes/PreloadScene';
import { ELEMENT_BADGE } from './elements';
import type { CharacterStats, SkillDef } from '../core/types';
import { playSfx } from '../audio/sfx';

export interface SheetSource {
  characterId: string;
  /** 旅の途中のキャラ (省くと旅立ち前の初期値で出す) */
  run?: RunState;
  unit?: UnitState;
  /** 戦闘中の今のHP・MP (省くと旅の記録の値) */
  live?: { hp: number; mp: number };
}

const DEPTH = 500;
/** 能力表を開いている場面 (下の画面のドラッグ・ホイールを止めるため) */
const openScenes = new WeakSet<Phaser.Scene>();
export function isSheetOpen(scene: Phaser.Scene): boolean { return openScenes.has(scene); }
const STAT_ROWS: [keyof CharacterStats, string][] = [
  ['maxHP', '最大HP'], ['maxMP', '最大MP'],
  ['physicalAttack', '物理攻撃'], ['magicAttack', '魔法攻撃'],
  ['physicalDefense', '物理防御'], ['magicDefense', '魔法防御'],
  ['speed', '素早さ'], ['luck', '運'],
  ['criticalRate', '会心率'], ['accuracyRate', '命中'],
];

/** 技の性質を短く (属性・威力・対象) */
function skillTags(sk: SkillDef): string {
  const parts: string[] = [];
  if (sk.element && sk.element !== 'None') parts.push(`【${ELEMENT_BADGE[sk.element].label}】`);
  if (sk.basePower > 0) parts.push(`威力${Math.round(sk.basePower * 100)}%${sk.hitCount > 1 ? `×${sk.hitCount}` : ''}`);
  if (sk.hitsAllEnemies) parts.push('全体');
  if (sk.isHeal) parts.push('回復');
  return parts.join(' ');
}

/** 能力表を開く。閉じるボタンか外側を押すと閉じる */
export function openCharacterSheet(scene: Phaser.Scene, src: SheetSource): void {
  const { width, height } = scene.scale;
  const char = getCharacter(src.characterId);
  const run = src.run;
  const unit = src.unit ?? (run && run.characterId === src.characterId ? run : undefined);
  const inRun = !!(run && unit);
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { objs.push(o); return o; };
  let wheelHandler: ((p: Phaser.Input.Pointer, o: unknown, dx: number, dy: number) => void) | null = null;
  // 開いたときのクリック (指を離す動作) で、すぐ閉じてしまわないように
  const openedAt = Date.now();
  const close = () => {
    if (Date.now() - openedAt < 300) return;
    if (wheelHandler) scene.input.off('wheel', wheelHandler);
    objs.forEach((o) => o.destroy());
    openScenes.delete(scene);
  };
  openScenes.add(scene);
  scene.events.once('shutdown', () => openScenes.delete(scene));
  playSfx('select');

  // 下の画面を押せないよう全面を覆う (外側を押すと閉じる)
  add(scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72).setDepth(DEPTH)
    .setInteractive().on('pointerup', close));
  const panelW = 1080, panelH = 620;
  const left = width / 2 - panelW / 2, top = height / 2 - panelH / 2;
  add(drawPanel(scene, width / 2, height / 2, panelW, panelH, { alpha: 0.98 }).setDepth(DEPTH + 1));
  // パネルの上は押しても閉じない
  add(scene.add.rectangle(width / 2, height / 2, panelW, panelH, 0x000000, 0.001).setDepth(DEPTH + 1).setInteractive());

  // ── 左列: 顔・名前・レベル・ステータス・装備 ──
  const lx = left + 36;
  const pkey = charPortraitKey(char.id);
  const fkey = charFullKey(char.id);
  if (hasArt(scene, pkey)) {
    const pic = add(scene.add.image(lx + 44, top + 70, pkey).setDepth(DEPTH + 2));
    pic.setScale(88 / pic.height);
  } else if (hasArt(scene, fkey)) {
    const pic = add(scene.add.image(lx + 44, top + 70, fkey).setDepth(DEPTH + 2));
    pic.setScale(88 / pic.height);
  }
  add(scene.add.text(lx + 100, top + 34, char.name, titleStyle(24, COLORS.textGold)).setDepth(DEPTH + 2));
  const levelLine = inRun
    ? `${char.jobName}　Lv.${unit!.characterLevel}　職Lv.${unit!.jobLevel}`
    : `${char.jobName}　Lv.1　職Lv.1（旅立ち時）`;
  add(scene.add.text(lx + 100, top + 72, levelLine, textStyle(16, COLORS.text)).setDepth(DEPTH + 2));

  const stats: CharacterStats = inRun ? buildBattleStats(run!, unit!) : { ...char.baseStats };
  if (inRun) {
    const maxHP = Math.min(stats.maxHP, getEffectiveMaxHP(run!, unit!));
    const hp = src.live?.hp ?? unit!.currentHP;
    const mp = src.live?.mp ?? unit!.currentMP;
    add(scene.add.text(lx + 100, top + 98, `HP ${hp} / ${maxHP}　MP ${mp} / ${getMaxMP(run!, unit!)}`,
      textStyle(15, COLORS.textBlue)).setDepth(DEPTH + 2));
  }

  let y = top + 134;
  add(scene.add.text(lx, y, inRun ? '◆ ステータス（装備・強化込み）' : '◆ ステータス（初期値）', textStyle(16, COLORS.textGold)).setDepth(DEPTH + 2));
  y += 30;
  STAT_ROWS.forEach(([key, label], i) => {
    const cx = lx + (i % 2) * 196;
    const cy = y + Math.floor(i / 2) * 28;
    const v = stats[key];
    const growth = char.growthRates[key];
    add(scene.add.text(cx, cy, label, textStyle(15, COLORS.textDim)).setDepth(DEPTH + 2));
    add(scene.add.text(cx + 170, cy, key === 'criticalRate' || key === 'accuracyRate' ? `${v}%` : `${v}`,
      latinStyle(16, COLORS.text)).setOrigin(1, 0).setDepth(DEPTH + 2));
    // 旅立ち前は、レベルが1上がるごとの伸びも添える
    if (!inRun && growth) {
      add(scene.add.text(cx + 174, cy + 2, `+${growth}`, latinStyle(11, COLORS.textGreen)).setDepth(DEPTH + 2));
    }
  });
  y += 5 * 28 + 10;
  if (!inRun) {
    add(scene.add.text(lx, y - 6, '緑の数字はレベルが1上がるごとの伸び', textStyle(11, COLORS.textDim)).setDepth(DEPTH + 2));
    y += 14;
  }

  if (inRun) {
    y += 4;
    add(scene.add.text(lx, y, '◆ 装備', textStyle(16, COLORS.textGold)).setDepth(DEPTH + 2));
    y += 28;
    for (const [label, id] of [['武器', unit!.equippedWeapon], ['防具', unit!.equippedArmor], ['装飾', unit!.equippedAccessory]] as const) {
      const eq = id ? getEquipment(id) : undefined;
      add(scene.add.text(lx, y, `${label}　${eq ? eq.name : '― なし ―'}`,
        textStyle(14, eq ? EQUIP_RARITY_COLOR[eq.rarity] : COLORS.textDim)).setDepth(DEPTH + 2));
      y += 24;
    }
  }

  // ── 右列: スキル一覧 (アクティブ / パッシブ / グリモワール)。長いのでスクロールする ──
  const rx = left + 490;
  const rw = panelW - (rx - left) - 36;
  const listTop = top + 30;
  const listBottom = top + panelH - 72;
  add(scene.add.rectangle(rx + rw / 2, (listTop + listBottom) / 2, rw + 16, listBottom - listTop + 12, 0x0b0812, 0.6)
    .setStrokeStyle(1, COLORS.border, 0.7).setDepth(DEPTH + 1));
  const list = add(scene.add.container(0, 0).setDepth(DEPTH + 2));
  const maskG = scene.make.graphics({}, false).fillRect(rx - 6, listTop, rw + 12, listBottom - listTop);
  list.setMask(maskG.createGeometryMask());
  objs.push(maskG);

  const learned = (id: string) => inRun ? unit!.unlockedSkillIds.includes(id) : false;
  const entries = char.learnableSkills.filter((e, i, a) => a.findIndex((x) => x.skill.id === e.skill.id) === i);
  const actives = entries.filter((e) => !e.skill.isPassive);
  const passives = entries.filter((e) => e.skill.isPassive);
  let ly = listTop + 8;
  const section = (label: string) => {
    list.add(scene.add.text(rx, ly, label, textStyle(17, COLORS.textGold)));
    ly += 30;
  };
  // req: 習得の条件 (例「職Lv3」「キャラLv2」)。null なら条件を出さない
  const row = (sk: SkillDef, req: string | null, have: boolean) => {
    const nameColor = have ? COLORS.text : '#8f86a3';
    const mark = have ? '◆' : '◇';
    list.add(scene.add.text(rx, ly, `${mark} ${sk.name}`, textStyle(16, nameColor)));
    const right: string[] = [];
    if (!sk.isPassive && sk.mpCost > 0) right.push(`MP ${sk.mpCost}`);
    if (req !== null && !have) right.push(`${req}で習得`);
    if (req !== null && have && !inRun) right.push('初期習得');
    if (right.length) list.add(scene.add.text(rx + rw, ly + 2, right.join('　'), textStyle(13, have ? COLORS.textBlue : '#8f86a3')).setOrigin(1, 0));
    const tags = skillTags(sk);
    const desc = scene.add.text(rx + 18, ly + 24, `${tags ? tags + '　' : ''}${sk.description}`, textStyle(13, have ? COLORS.textDim : '#7d758f', {
      wordWrap: { width: rw - 24 }, lineSpacing: 2,
    }));
    list.add(desc);
    ly += 24 + desc.height + 12;
  };
  // 旅立ち前は「職Lv1 で最初から覚えている」ものを習得済みとして見せる
  const has = (e: { skill: SkillDef; jobLevel: number }) => inRun ? learned(e.skill.id) : e.jobLevel <= 1;
  section(`アクティブスキル（${actives.filter(has).length} / ${actives.length}）`);
  actives.forEach((e) => row(e.skill, `職Lv${e.jobLevel}`, has(e)));
  ly += 6;
  // パッシブ: キャラLv2・4・6で解放される固有のもの → 職Lvで覚えるもの
  const levelPassives = levelPassivesOf(char.id);
  const level = inRun ? unit!.characterLevel : 1;
  const passiveHave = levelPassives.filter((p) => level >= p.level).length + passives.filter(has).length;
  section(`パッシブスキル（${passiveHave} / ${levelPassives.length + passives.length}）`);
  levelPassives.forEach((p) => row(p.skill, `キャラLv${p.level}`, level >= p.level));
  passives.forEach((e) => row(e.skill, `職Lv${e.jobLevel}`, has(e)));
  // ゼノ: グリモワールに刻んだ敵の技
  const absorbed = inRun ? unit!.absorbedSkillIds.map((id) => findEnemySkillById(id)).filter((s): s is SkillDef => !!s) : [];
  if (absorbed.length > 0) {
    ly += 6;
    section(`グリモワール（刻んだ技 ${absorbed.length}）`);
    absorbed.forEach((sk) => row(sk, null, true));
  }

  // スクロール (ホイール・ドラッグ)。収まるときは動かない
  const minY = Math.min(0, listBottom - (ly + 4));
  const scrollTo = (v: number) => { list.y = Phaser.Math.Clamp(v, minY, 0); };
  if (minY < 0) {
    add(scene.add.text(rx + rw, listBottom + 8, 'ホイール・ドラッグでスクロール', textStyle(12, COLORS.textDim)).setOrigin(1, 0).setDepth(DEPTH + 2));
    wheelHandler = (_p, _o, _dx, dy) => scrollTo(list.y - dy);
    scene.input.on('wheel', wheelHandler);
    let drag: { y: number; listY: number } | null = null;
    const hit = add(scene.add.rectangle(rx + rw / 2, (listTop + listBottom) / 2, rw + 12, listBottom - listTop, 0x000000, 0.001)
      .setDepth(DEPTH + 3).setInteractive());
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => { drag = { y: p.y, listY: list.y }; });
    hit.on('pointermove', (p: Phaser.Input.Pointer) => { if (drag && p.isDown) scrollTo(drag.listY + (p.y - drag.y)); });
    hit.on('pointerup', () => { drag = null; });
    hit.on('pointerout', () => { drag = null; });
  }

  add(makeButton(scene, width / 2, top + panelH - 36, '閉じる', close, { width: 200, height: 42, fontSize: 16 }).setDepth(DEPTH + 3));
}
