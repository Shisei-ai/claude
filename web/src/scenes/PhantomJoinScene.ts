// 幻影との邂逅 — Unity版 UI/PhantomJoinUI.cs + RoguelikeManager.PhantomJoinEvent
// Floor 0 クリア時に一度だけ発生する二択イベント
//   受け入れる: 主人公以外からランダム2名が Lv4 で加入 (スキルなし=通常攻撃のみ)
//   拒む:       主人公のレベル+2
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import { buildPartyMemberStats } from '../core/run';
import { CHARACTERS, getCharacter } from '../data/characters';
import { MAX_CHARACTER_LEVEL } from '../core/level';
import { battleRandom as rnd } from '../core/rng';

const JOIN_LEVEL = 4;

export class PhantomJoinScene extends Phaser.Scene {
  constructor() { super('PhantomJoin'); }

  create(): void {
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d081a, 1);

    // 候補: 主人公以外をシャッフルして2名
    const candidates = CHARACTERS.filter((c) => c.id !== run.characterId);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = rnd.range(0, i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const joinPool = candidates.slice(0, 2);

    this.add.text(width / 2, height * 0.18, '幻影との邂逅',
      textStyle(34, '#eee0c7')).setOrigin(0.5);
    this.add.text(width / 2, height * 0.30,
      '奈落の霧の中から、二つの気配が近づいてくる。\nそれは旅の同行者となるのか、それとも拒むのか。',
      textStyle(17, '#ccc2ad', { align: 'center', lineSpacing: 10 })).setOrigin(0.5);

    // 候補の立ち絵 (暫定: テーマカラー矩形)
    joinPool.forEach((c, i) => {
      const x = width / 2 - 110 + i * 220;
      const y = height * 0.50;
      this.add.rectangle(x, y, 84, 104, c.themeColor, 0.85).setStrokeStyle(2, 0xd8e8f4, 0.5);
      this.add.text(x, y + 72, c.name, textStyle(14, '#eee0c7')).setOrigin(0.5);
      this.add.text(x, y + 94, `Lv. ${JOIN_LEVEL}　${c.jobName}`,
        textStyle(12, '#99cc99')).setOrigin(0.5);
    });

    // 受け入れる
    makeButton(this, width / 2 - 220, height * 0.82, '幻影を受け入れる\n（仲間が加入）', () => {
      for (const c of joinPool) {
        const stats = buildPartyMemberStats(c.id, JOIN_LEVEL);
        run.partyMembers.push({
          characterId: c.id, level: JOIN_LEVEL,
          currentHP: stats.maxHP, maxHP: stats.maxHP,
        });
      }
      run.phantomEventDone = true;
      saveRun(run);
      this.scene.start('Map');
    }, { width: 380, height: 72, fontSize: 17, color: COLORS.textBlue });

    // 拒む
    makeButton(this, width / 2 + 220, height * 0.82, '拒み、力を求める\n（自分のレベル+2）', () => {
      const char = getCharacter(run.characterId);
      for (let i = 0; i < 2; i++) {
        if (run.characterLevel >= MAX_CHARACTER_LEVEL) break;
        run.characterLevel++;
        run.maxHPBase += char.growthRates.maxHP;
        run.currentHP += char.growthRates.maxHP;
      }
      run.phantomEventDone = true;
      saveRun(run);
      this.scene.start('Map');
    }, { width: 380, height: 72, fontSize: 17, color: COLORS.textRed });
  }
}
