// 図鑑 — Web版独自の追加要素。出会った敵・手に入れたレリックと装備、実績を一覧する
import Phaser from 'phaser';
import { playBgm } from '../audio/bgm';
import { COLORS, makeButton, textStyle, drawSceneBackground, drawOrnamentLine } from '../ui/theme';
import { ELEMENT_BADGE } from '../ui/elements';
import { loadMeta, type MetaSave } from '../core/save';
import { ACHIEVEMENTS } from '../core/achievements';
import type { CharacterStats, EnemyDef, EnemyRank, EquipmentDef, SkillDef } from '../core/types';
import { CODEX_ENEMIES, GRIMOIRE_SKILLS, enemyFloor, enemyUsingSkill, isCarryableGrimoireSkill } from '../data/codex';
import { RELICS, RARITY_LABEL, RARITY_COLOR, type RelicDef } from '../data/relics';
import { EQUIPMENT, EQUIP_RARITY_LABEL, EQUIP_RARITY_COLOR, SLOT_LABEL } from '../data/equipment';
import { hasArt } from './PreloadScene';
import { enemyArtKey, artFrame } from '../data/assets';

type Tab = 'enemy' | 'relic' | 'equip' | 'grimoire' | 'achievement';

const TABS: { id: Tab; label: string }[] = [
  { id: 'enemy', label: '魔物' },
  { id: 'relic', label: '遺物' },
  { id: 'equip', label: '装備' },
  { id: 'grimoire', label: '魔導書' },
  { id: 'achievement', label: '実績' },
];

const RANK_LABEL: Record<EnemyRank, string> = {
  Normal: '通常', Elite: 'エリート', Boss: 'ボス', TrueFinalBoss: '真なる最終ボス',
};
const RANK_COLOR: Record<EnemyRank, string> = {
  Normal: COLORS.text, Elite: '#f0a060', Boss: COLORS.textGold, TrueFinalBoss: '#ff8ad8',
};

const STAT_LABEL: Record<keyof CharacterStats, string> = {
  maxHP: 'HP', maxMP: 'MP', physicalAttack: '物攻', magicAttack: '魔攻',
  physicalDefense: '物防', magicDefense: '魔防', speed: '速度', luck: '運',
  criticalRate: '会心', accuracyRate: '命中',
};

// 一覧の格子 (左側) と詳細欄 (右側)
const COLS = 4;
const ROWS = 10;
const PER_PAGE = COLS * ROWS;
const LIST_X = 40;
const LIST_Y = 150;
const CELL_W = 172;
const CELL_H = 42;
const DETAIL_X = 770;
const DETAIL_W = 470;

export class CodexScene extends Phaser.Scene {
  private tab: Tab = 'enemy';
  private page = 0;
  private selected = -1;
  private meta!: MetaSave;
  /** タブ切替・ページ送りで作り直す部分 */
  private body: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('Codex'); }

  init(data: { tab?: Tab }): void {
    this.tab = data.tab ?? 'enemy';
    this.page = 0;
    this.selected = -1;
  }

  create(): void {
    const { width, height } = this.scale;
    playBgm(this, 'title');
    drawSceneBackground(this, 0x0a0812, 'meta');
    this.meta = loadMeta();
    this.body = [];

    this.add.text(width / 2, 36, '図鑑', textStyle(34, COLORS.textGold)).setOrigin(0.5);
    drawOrnamentLine(this, width / 2, 58, 260);

    TABS.forEach((t, i) => {
      const x = width / 2 + (i - (TABS.length - 1) / 2) * 160;
      const active = t.id === this.tab;
      this.add.rectangle(x, 110, 148, 38, active ? 0x2a2140 : 0x151020, 0.95)
        .setStrokeStyle(active ? 2 : 1, active ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.tab === t.id) return;
          this.scene.restart({ tab: t.id });
        });
      this.add.text(x, 110, t.label, textStyle(17, active ? COLORS.textGold : COLORS.text)).setOrigin(0.5);
    });

    makeButton(this, width - 150, height - 36, 'メニューへ戻る', () => {
      this.scene.start('MainMenu');
    }, { width: 240, height: 42 });

    this.renderBody();
  }

  private clearBody(): void {
    this.body.forEach((o) => o.destroy());
    this.body = [];
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.body.push(o);
    return o;
  }

  private renderBody(): void {
    this.clearBody();
    switch (this.tab) {
      case 'enemy': this.renderEnemies(); break;
      case 'relic': this.renderRelics(); break;
      case 'equip': this.renderEquipment(); break;
      case 'grimoire': this.renderGrimoire(); break;
      case 'achievement': this.renderAchievements(); break;
    }
  }

  // ── 共通: 一覧の格子とページ送り ────────────────────────────────────
  private renderGrid<T>(
    items: T[],
    cell: (item: T) => { label: string; color: string; known: boolean },
    detail: (item: T) => void,
    progress: string,
  ): void {
    const { width } = this.scale;
    this.keep(this.add.text(width / 2, 76, progress, textStyle(15, COLORS.text)).setOrigin(0.5));

    const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const start = this.page * PER_PAGE;
    items.slice(start, start + PER_PAGE).forEach((item, k) => {
      const index = start + k;
      const x = LIST_X + (k % COLS) * CELL_W + CELL_W / 2;
      const y = LIST_Y + Math.floor(k / COLS) * (CELL_H + 4) + CELL_H / 2;
      const c = cell(item);
      const isSel = index === this.selected;
      this.keep(this.add.rectangle(x, y, CELL_W - 6, CELL_H, isSel ? 0x2a2140 : 0x171226, 0.95)
        .setStrokeStyle(isSel ? 2 : 1, isSel ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selected = index; this.renderBody(); }));
      this.keep(this.add.text(x, y, c.known ? c.label : '？？？',
        textStyle(12, c.known ? c.color : '#6a5f80', { wordWrap: { width: CELL_W - 16 }, align: 'center' }))
        .setOrigin(0.5));
    });

    // ページ送り
    const py = LIST_Y + ROWS * (CELL_H + 4) + 14;
    const cx = LIST_X + (COLS * CELL_W) / 2;
    if (pages > 1) {
      this.keep(makeButton(this, cx - 110, py, '◀', () => { this.page--; this.renderBody(); },
        { width: 64, height: 34, disabled: this.page === 0 }));
      this.keep(this.add.text(cx, py, `${this.page + 1} / ${pages}`, textStyle(15)).setOrigin(0.5));
      this.keep(makeButton(this, cx + 110, py, '▶', () => { this.page++; this.renderBody(); },
        { width: 64, height: 34, disabled: this.page >= pages - 1 }));
    }

    // 詳細欄
    const top = LIST_Y - 4;
    const panelH = ROWS * (CELL_H + 4) + 4;
    this.keep(this.add.rectangle(DETAIL_X + DETAIL_W / 2, top + panelH / 2, DETAIL_W, panelH, 0x0e0a18, 0.94)
      .setStrokeStyle(1, COLORS.border));
    if (this.selected >= 0 && this.selected < items.length) {
      detail(items[this.selected]);
    } else {
      this.keep(this.add.text(DETAIL_X + DETAIL_W / 2, top + panelH / 2, '項目を選ぶと詳しい内容を表示する',
        textStyle(14, COLORS.textDim)).setOrigin(0.5));
    }
  }

  /** 詳細欄に文章を足す (y を返すので続けて並べられる) */
  private line(y: number, text: string, size = 14, color: string = COLORS.text, x = DETAIL_X + 20): number {
    const t = this.keep(this.add.text(x, y, text, textStyle(size, color, {
      wordWrap: { width: DETAIL_X + DETAIL_W - 20 - x }, lineSpacing: 4,
    })));
    return y + t.height + 8;
  }

  // ── 魔物 ───────────────────────────────────────────────────────────
  private renderEnemies(): void {
    const seen = new Set(this.meta.seenEnemies);
    const known = CODEX_ENEMIES.filter((e) => seen.has(e.id)).length;
    this.renderGrid(CODEX_ENEMIES,
      (e) => ({ label: e.name, color: RANK_COLOR[e.rank], known: seen.has(e.id) }),
      (e) => this.enemyDetail(e, seen.has(e.id)),
      `出会った魔物 ${known} / ${CODEX_ENEMIES.length}`);
  }

  private enemyDetail(e: EnemyDef, known: boolean): void {
    let y = LIST_Y + 12;
    const floorLabel = enemyFloor(e.id) >= 4 ? '最終層' : `第${enemyFloor(e.id) + 1}層`;
    if (!known) {
      y = this.line(y, '？？？', 22, COLORS.textDim);
      this.line(y, `${floorLabel}に棲む${RANK_LABEL[e.rank]}の魔物。まだ出会っていない。`, 14, COLORS.textDim);
      return;
    }

    // 絵があれば右上に小さく
    const key = enemyArtKey(e.id);
    let textRight = DETAIL_X + DETAIL_W - 20;
    if (hasArt(this, key)) {
      const img = this.keep(this.add.image(DETAIL_X + DETAIL_W - 90, LIST_Y + 92, key, artFrame(this, key)));
      img.setScale(Math.min(150 / img.width, 160 / img.height));
      textRight = DETAIL_X + DETAIL_W - 175;
    }
    const narrow = (text: string, size: number, color: string) => {
      const t = this.keep(this.add.text(DETAIL_X + 20, y, text, textStyle(size, color, {
        wordWrap: { width: textRight - DETAIL_X - 20 }, lineSpacing: 4,
      })));
      y += t.height + 8;
    };
    narrow(e.name, 22, RANK_COLOR[e.rank]);
    narrow(`${floorLabel}　${RANK_LABEL[e.rank]}`, 13, COLORS.textDim);
    const s = e.stats;
    narrow(`HP ${s.maxHP}　物攻 ${s.physicalAttack}　魔攻 ${s.magicAttack}\n` +
      `物防 ${s.physicalDefense}　魔防 ${s.magicDefense}　速度 ${s.speed}\n` +
      `シールド ${e.shieldPoints}${e.isUndead ? '　不死' : ''}`, 13, COLORS.text);
    narrow(`倒した数　${this.meta.enemyKills[e.id] ?? 0}`, 13, COLORS.textGold);

    // 弱点: 見つけたものだけ属性を表示
    y = Math.max(y, LIST_Y + 180);
    const knownWeak = new Set(this.meta.knownWeaknesses[e.id] ?? []);
    this.keep(this.add.text(DETAIL_X + 20, y, '弱点', textStyle(13, COLORS.textDim)));
    if (e.elementWeaknesses.length === 0) {
      this.keep(this.add.text(DETAIL_X + 64, y, 'なし', textStyle(13)));
    }
    e.elementWeaknesses.forEach((el, i) => {
      const bx = DETAIL_X + 74 + i * 26;
      const found = knownWeak.has(el);
      this.keep(this.add.rectangle(bx, y + 9, 22, 22, 0x000000, 0.65)
        .setStrokeStyle(1, found ? 0xd9c66b : 0x6a5a8a));
      this.keep(this.add.text(bx, y + 9, found ? ELEMENT_BADGE[el].label : '?',
        textStyle(13, found ? ELEMENT_BADGE[el].color : '#9a90b0')).setOrigin(0.5));
    });
    y += 36;
    this.line(y, e.lore, 13, COLORS.textDim);
  }

  // ── 遺物 ───────────────────────────────────────────────────────────
  // ── 魔導書 (ゼノがグリモワールに刻んだ敵の技) ─────────────────────
  private renderGrimoire(): void {
    const got = new Set(this.meta.grimoireArchive);
    const known = GRIMOIRE_SKILLS.filter((s) => got.has(s.id)).length;
    this.renderGrid(GRIMOIRE_SKILLS,
      (s) => ({ label: s.name, color: ELEMENT_BADGE[s.element].color, known: got.has(s.id) }),
      (s) => this.grimoireDetail(s, got.has(s.id)),
      `刻んだ技 ${known} / ${GRIMOIRE_SKILLS.length}　（ゼノの吸収で記録。「魔獣の書」を解放すると旅立ちに持ち込める）`);
  }

  private grimoireDetail(s: SkillDef, known: boolean): void {
    let y = LIST_Y + 12;
    const from = enemyUsingSkill(s.id);
    if (!known) {
      y = this.line(y, '？？？', 22, COLORS.textDim);
      this.line(y, `${from ? from.name + ' が使う技。' : ''}まだ吸収していない。`, 14, COLORS.textDim);
      return;
    }
    const badge = ELEMENT_BADGE[s.element];
    y = this.line(y, s.name, 22, COLORS.textGold);
    y = this.line(y, `【${badge.label}】　${from ? from.name + ' の技' : ''}`, 13, badge.color);
    const power = s.basePower > 0
      ? `威力 ${Math.round(s.basePower * 100)}%${s.hitCount > 1 ? ` × ${s.hitCount}回` : ''}${s.hitsAllEnemies ? '（全体）' : ''}`
      : '補助技';
    y = this.line(y, `${power}　MP ${Math.max(4, s.mpCost || 8)}　魔法攻撃力で放つ`, 14);
    if (s.description) y = this.line(y, s.description, 13, COLORS.textDim);
    this.line(y + 6, isCarryableGrimoireSkill(s.id)
      ? '◆ 「魔獣の書」で旅立ちに持ち込める'
      : '◇ 強敵の技のため、旅立ちには持ち込めない', 13, isCarryableGrimoireSkill(s.id) ? COLORS.textGold : COLORS.textDim);
  }

  private renderRelics(): void {
    const seen = new Set(this.meta.seenRelics);
    const known = RELICS.filter((r) => seen.has(r.id)).length;
    this.renderGrid(RELICS,
      (r) => ({ label: r.name, color: RARITY_COLOR[r.rarity], known: seen.has(r.id) }),
      (r) => this.relicDetail(r, seen.has(r.id)),
      `手に入れた遺物 ${known} / ${RELICS.length}`);
  }

  private relicDetail(r: RelicDef, known: boolean): void {
    let y = LIST_Y + 12;
    y = this.line(y, `【${RARITY_LABEL[r.rarity]}】`, 13, RARITY_COLOR[r.rarity]);
    if (!known) {
      this.line(y, '？？？\n\nまだ手に入れていない。', 16, COLORS.textDim);
      return;
    }
    y = this.line(y, r.name, 22, COLORS.textGold);
    y = this.line(y, r.description, 15);
    if (r.flavor) this.line(y + 8, r.flavor, 13, COLORS.textDim);
  }

  // ── 装備 ───────────────────────────────────────────────────────────
  private renderEquipment(): void {
    const seen = new Set(this.meta.seenEquipment);
    const known = EQUIPMENT.filter((e) => seen.has(e.id)).length;
    this.renderGrid(EQUIPMENT,
      (e) => ({ label: e.name, color: EQUIP_RARITY_COLOR[e.rarity], known: seen.has(e.id) }),
      (e) => this.equipDetail(e, seen.has(e.id)),
      `手に入れた装備 ${known} / ${EQUIPMENT.length}`);
  }

  private equipDetail(e: EquipmentDef, known: boolean): void {
    let y = LIST_Y + 12;
    y = this.line(y, `${EQUIP_RARITY_LABEL[e.rarity]}　${SLOT_LABEL[e.slot]}`, 13, EQUIP_RARITY_COLOR[e.rarity]);
    if (!known) {
      this.line(y, '？？？\n\nまだ手に入れていない。', 16, COLORS.textDim);
      return;
    }
    y = this.line(y, e.name, 22, COLORS.textGold);
    y = this.line(y, e.description, 15);
    const stats = (Object.entries(e.bonusStats) as [keyof CharacterStats, number][])
      .filter(([, v]) => v)
      .map(([k, v]) => `${STAT_LABEL[k]} ${v > 0 ? '+' : ''}${v}`)
      .join('　');
    if (stats) y = this.line(y, stats, 14, COLORS.textBlue);
    if (e.weaponElement && e.weaponElement !== 'None') {
      y = this.line(y, `攻撃属性: ${ELEMENT_BADGE[e.weaponElement].label}`, 14, ELEMENT_BADGE[e.weaponElement].color);
    }
    if (e.passiveText) y = this.line(y, e.passiveText, 13, COLORS.textDim);
    this.line(y, `価格の目安 ${e.value} G`, 13, COLORS.textDim);
  }

  // ── 実績 (2列の一覧のみ) ─────────────────────────────────────────────
  private renderAchievements(): void {
    const { width } = this.scale;
    const got = new Set(this.meta.achievements);
    this.keep(this.add.text(width / 2, 70, `解除した実績 ${ACHIEVEMENTS.filter((a) => got.has(a.id)).length} / ${ACHIEVEMENTS.length}`,
      textStyle(15, COLORS.textDim)).setOrigin(0.5));
    const colW = 580;
    const rowH = 46;
    const perCol = Math.ceil(ACHIEVEMENTS.length / 2);
    ACHIEVEMENTS.forEach((a, i) => {
      const x = width / 2 + (i < perCol ? -colW / 2 - 10 : colW / 2 + 10);
      const y = LIST_Y + (i % perCol) * rowH + rowH / 2 - 4;
      const done = got.has(a.id);
      this.keep(this.add.rectangle(x, y, colW, rowH - 6, done ? 0x2a2410 : 0x151020, 0.95)
        .setStrokeStyle(1, done ? 0xd9c66b : COLORS.border));
      this.keep(this.add.text(x - colW / 2 + 14, y, done ? '★' : '☆',
        textStyle(18, done ? COLORS.textGold : '#6a5f80')).setOrigin(0, 0.5));
      this.keep(this.add.text(x - colW / 2 + 44, y, a.name,
        textStyle(15, done ? COLORS.textGold : COLORS.text)).setOrigin(0, 0.5));
      this.keep(this.add.text(x + colW / 2 - 14, y, a.desc,
        textStyle(12, done ? COLORS.text : COLORS.textDim)).setOrigin(1, 0.5));
    });
  }
}
