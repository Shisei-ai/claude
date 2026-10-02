// ラン設定 — Unity版 RunSetupSceneSetup.cs / RunSetupUI.cs の移植
// キャラクター / 加護 / 難易度 を選び「旅立つ」
import Phaser from 'phaser';
import { playBgm } from '../audio/bgm';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { CHARACTERS } from '../data/characters';
import { BLESSINGS } from '../data/blessings';
import { DIFFICULTY_TIERS } from '../data/difficulty';
import { createRun } from '../core/run';
import { saveRun } from '../core/save';
import { generateMap } from '../core/mapgen';
import type { BlessingType } from '../core/types';
import { hasArt } from './PreloadScene';
import { charPortraitKey } from '../data/assets';
import { CHARACTER_TRAITS, TRAIT_INFO } from '../battle/traits';
import { grimoireCarrySlots } from '../core/meta';
import { loadMeta } from '../core/save';
import { findEnemySkillById } from '../data/enemies';
import { enemyUsingSkill, isCarryableGrimoireSkill } from '../data/codex';
import { ELEMENT_BADGE } from '../ui/elements';

export class RunSetupScene extends Phaser.Scene {
  private selectedChar = 0;
  private selectedBlessing = 0;
  private selectedDifficulty = 1;   // 標準
  private infoText!: Phaser.GameObjects.Text;
  private charMarks: Phaser.GameObjects.Rectangle[] = [];
  private blessMarks: Phaser.GameObjects.Rectangle[] = [];
  private diffMarks: Phaser.GameObjects.Rectangle[] = [];

  constructor() { super('RunSetup'); }

  create(): void {
    const { width, height } = this.scale;
    playBgm(this, 'title');
    drawSceneBackground(this, undefined, 'charselect');
    this.charMarks = [];
    this.blessMarks = [];
    this.diffMarks = [];

    this.add.text(width / 2, 44, '旅の支度', textStyle(36, COLORS.textGold)).setOrigin(0.5);

    // ── キャラクター選択 ──
    this.add.text(80, 100, '◆ 旅人', textStyle(20, COLORS.text));
    CHARACTERS.forEach((c, i) => {
      const x = 140 + i * 216;
      const y = 190;
      const card = this.add.rectangle(x, y, 196, 120, 0x171226, 0.95)
        .setStrokeStyle(2, i === this.selectedChar ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selectedChar = i; this.refresh(); });
      this.charMarks.push(card);
      // 顔グラがあれば表示、無ければテーマ色の四角
      const pkey = charPortraitKey(c.id);
      if (hasArt(this, pkey)) {
        const pic = this.add.image(x, y - 22, pkey).setOrigin(0.5, 0.5);
        pic.setScale(64 / pic.height);
        pic.setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { this.selectedChar = i; this.refresh(); });
      } else {
        this.add.rectangle(x, y - 26, 44, 44, c.themeColor, 0.9).setStrokeStyle(1, 0x000000);
      }
      this.add.text(x, y + 14, c.name, textStyle(14)).setOrigin(0.5);
      this.add.text(x, y + 38, c.jobName, textStyle(12, COLORS.textDim)).setOrigin(0.5);
    });

    // ── 加護選択 ──
    this.add.text(80, 280, '◆ 始まりの加護', textStyle(20, COLORS.text));
    BLESSINGS.forEach((b, i) => {
      const x = 140 + i * 180;
      const y = 348;
      const card = this.add.rectangle(x, y, 164, 76, 0x171226, 0.95)
        .setStrokeStyle(2, i === this.selectedBlessing ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selectedBlessing = i; this.refresh(); });
      this.blessMarks.push(card);
      this.add.text(x, y - 16, `${b.icon} ${b.name}`, textStyle(14, COLORS.textGold)).setOrigin(0.5);
    });

    // ── 難易度選択 ──
    this.add.text(80, 420, '◆ 試練の深さ', textStyle(20, COLORS.text));
    DIFFICULTY_TIERS.forEach((d, i) => {
      const x = 140 + i * 180;
      const y = 482;
      const card = this.add.rectangle(x, y, 164, 64, 0x171226, 0.95)
        .setStrokeStyle(2, i === this.selectedDifficulty ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selectedDifficulty = i; this.refresh(); });
      this.diffMarks.push(card);
      const color = i >= 4 ? COLORS.textRed : i >= 2 ? COLORS.textGold : COLORS.text;
      this.add.text(x, y, d.displayName, textStyle(18, color)).setOrigin(0.5);
    });

    // ── 説明パネル ──
    this.add.rectangle(width / 2, 584, width - 160, 96, 0x0e0a18, 0.9)
      .setStrokeStyle(1, COLORS.border);
    this.infoText = this.add.text(width / 2, 584, '', textStyle(14, COLORS.textDim, {
      wordWrap: { width: width - 220 }, align: 'center',
    })).setOrigin(0.5);

    // ── ボタン ──
    makeButton(this, width / 2 - 190, height - 52, '戻る', () => {
      this.scene.start('MainMenu');
    }, { width: 200 });
    makeButton(this, width / 2 + 130, height - 52, '旅立つ', () => {
      this.depart();
    }, { width: 320, color: COLORS.textGold });

    this.refresh();
  }

  private refresh(): void {
    this.charMarks.forEach((m, i) =>
      m.setStrokeStyle(2, i === this.selectedChar ? COLORS.borderBright : COLORS.border));
    this.blessMarks.forEach((m, i) =>
      m.setStrokeStyle(2, i === this.selectedBlessing ? COLORS.borderBright : COLORS.border));
    this.diffMarks.forEach((m, i) =>
      m.setStrokeStyle(2, i === this.selectedDifficulty ? COLORS.borderBright : COLORS.border));

    const c = CHARACTERS[this.selectedChar];
    const b = BLESSINGS[this.selectedBlessing];
    const d = DIFFICULTY_TIERS[this.selectedDifficulty];
    // 固有トレイト (習得パッシブとは別に最初から有効)
    const traits = CHARACTER_TRAITS[c.id] ?? [];
    const traitLine = traits.length
      ? `固有特性: ${traits.map((t) => TRAIT_INFO[t].name).join('・')}\n`
      : '';
    this.infoText.setText(
      `${c.name}（${c.jobName}） HP${c.baseStats.maxHP} / MP${c.baseStats.maxMP}\n` +
      traitLine +
      `${b.name}: ${b.desc}\n` +
      `${d.displayName}: ${d.description}（開始ゴールド ${d.startingGold}G）`,
    );
  }

  /** 旅立つ: ゼノで持ち込み枠があり、刻んだ技の記録があれば先に選ばせる */
  private depart(): void {
    const char = CHARACTERS[this.selectedChar];
    const slots = char.id === 'zeno' ? grimoireCarrySlots() : 0;
    // 持ち込めるのは通常の敵の技だけ (強敵の技を第1層から使えると難易度が崩れるため)
    const archive = loadMeta().grimoireArchive.filter((id) => !!findEnemySkillById(id) && isCarryableGrimoireSkill(id));
    if (slots > 0 && archive.length > 0) this.showGrimoirePicker(archive, slots);
    else this.startRun([]);
  }

  // ── 魔獣の書: 持ち込む技を選ぶ ──────────────────────────────────────
  private showGrimoirePicker(archive: string[], slots: number): void {
    const { width, height } = this.scale;
    const D = 200;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const selected: string[] = [];
    let page = 0;
    const perPage = 12;
    const pages = Math.ceil(archive.length / perPage);
    let body: Phaser.GameObjects.GameObject[] = [];

    // 下の画面を押せないように全面を覆う
    objs.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(D).setInteractive());
    objs.push(this.add.rectangle(width / 2, height / 2, 1000, 600, 0x0e0a18, 0.98)
      .setStrokeStyle(2, COLORS.borderBright).setDepth(D));
    objs.push(this.add.text(width / 2, 90, '魔獣の書 — 持ち込む技を選ぶ', textStyle(24, COLORS.textGold)).setOrigin(0.5).setDepth(D + 1));
    const info = this.add.text(width / 2, 124, '', textStyle(14, COLORS.textDim)).setOrigin(0.5).setDepth(D + 1);
    objs.push(info);

    const render = () => {
      body.forEach((o) => o.destroy());
      body = [];
      info.setText(`これまでに刻んだ通常の敵の技から ${slots} つまで選べる（選択中 ${selected.length} / ${slots}）　強敵・ボスの技は持ち込めない`);
      archive.slice(page * perPage, page * perPage + perPage).forEach((id, k) => {
        const sk = findEnemySkillById(id)!;
        const x = width / 2 + (k % 2 === 0 ? -240 : 240);
        const y = 172 + Math.floor(k / 2) * 66;
        const on = selected.includes(id);
        const card = this.add.rectangle(x, y, 460, 58, on ? 0x2a2410 : 0x171226, 0.98)
          .setStrokeStyle(on ? 2 : 1, on ? 0xd9c66b : COLORS.border).setDepth(D + 1)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            const i = selected.indexOf(id);
            if (i >= 0) selected.splice(i, 1);
            else if (selected.length < slots) selected.push(id);
            else { selected.shift(); selected.push(id); }   // 枠が埋まっていれば一番古い選択と入れ替え
            render();
          });
        const badge = ELEMENT_BADGE[sk.element];
        const from = enemyUsingSkill(id);
        const power = sk.basePower > 0 ? `威力${Math.round(sk.basePower * 100)}%${sk.hitCount > 1 ? `×${sk.hitCount}` : ''}${sk.hitsAllEnemies ? '・全体' : ''}` : '補助';
        body.push(card,
          this.add.text(x - 215, y - 18, `${on ? '◆' : '◇'} ${sk.name}`, textStyle(15, on ? COLORS.textGold : COLORS.text)).setDepth(D + 2),
          this.add.text(x + 215, y - 17, `【${badge.label}】 ${power}`, textStyle(12, badge.color)).setOrigin(1, 0).setDepth(D + 2),
          this.add.text(x - 215, y + 6, `${from ? from.name + ' の技　' : ''}${sk.description ?? ''}`, textStyle(11, COLORS.textDim, {
            wordWrap: { width: 430 }, maxLines: 1,
          })).setDepth(D + 2),
        );
      });
      if (pages > 1) {
        body.push(
          makeButton(this, width / 2 - 110, 578, '◀', () => { page = (page + pages - 1) % pages; render(); }, { width: 60, height: 34 }).setDepth(D + 2),
          this.add.text(width / 2, 578, `${page + 1} / ${pages}`, textStyle(14)).setOrigin(0.5).setDepth(D + 2),
          makeButton(this, width / 2 + 110, 578, '▶', () => { page = (page + 1) % pages; render(); }, { width: 60, height: 34 }).setDepth(D + 2),
        );
      }
    };
    render();

    objs.push(
      makeButton(this, width / 2 - 170, 636, '持ち込まずに旅立つ', () => this.startRun([]), { width: 280, height: 46, fontSize: 16 }).setDepth(D + 2),
      makeButton(this, width / 2 + 170, 636, '選んだ技で旅立つ', () => this.startRun([...selected]), { width: 280, height: 46, fontSize: 16, color: COLORS.textGold }).setDepth(D + 2),
    );
    void objs;
  }

  private startRun(carried: string[]): void {
    const char = CHARACTERS[this.selectedChar];
    const blessing: BlessingType = BLESSINGS[this.selectedBlessing].type;
    const run = createRun(char.id, this.selectedDifficulty, blessing);
    // 魔獣の書: 持ち込んだ技は最初からグリモワールに刻まれている
    run.absorbedSkillIds = [...carried];
    run.map = generateMap(run.seed, run.currentFloor);
    saveRun(run);
    this.scene.start('Prologue');
  }
}
