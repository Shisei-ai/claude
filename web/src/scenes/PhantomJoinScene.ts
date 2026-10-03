// 幻影との邂逅 — Unity版 UI/PhantomJoinUI.cs + RoguelikeManager.PhantomJoinEvent
// Floor 0 クリア時に一度だけ発生する二択イベント
//   受け入れる: 主人公以外から現れた2名のうち、選んだ1名が加入
//               (Unity版は2名とも Lv4・スキルなし。Web版は1名が Lv1・職Lv1 で初期武器を持って加わり、
//                以後は主人公と同じく成長・装備する)
//   拒む:       主人公のレベル+2 (Web版: さらに「孤高の誓い」— この旅の間、最大HP・攻撃・防御+50%)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, addVignette, addAmbientMotes } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import { createPartyMember, getEffectiveMaxHP, SOLO_VOW_BONUS } from '../core/run';
import { CHARACTERS, getCharacter } from '../data/characters';
import { MAX_CHARACTER_LEVEL } from '../core/level';
import { Rng } from '../core/rng';
import { hasArt } from './PreloadScene';
import { charFullKey, artFrame } from '../data/assets';

const JOIN_LEVEL = 1;
const JOIN_JOB_LEVEL = 1;

export class PhantomJoinScene extends Phaser.Scene {
  constructor() { super('PhantomJoin'); }

  create(): void {
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d081a, 1);
    // 奈落の霧: 青白い粒がゆっくり昇る
    addVignette(this, 0.85);
    addAmbientMotes(this, 40, 0x9ab8ff);

    // 候補: 主人公以外をシャッフルして2名。ランの種から決めるので、
    // 中断して開き直しても同じ2名になる (引き直しはできない)
    const rnd = new Rng(run.seed + 0x5a17);
    const candidates = CHARACTERS.filter((c) => c.id !== run.characterId);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = rnd.range(0, i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const joinPool = candidates.slice(0, 2);

    this.add.text(width / 2, height * 0.18, '幻影との邂逅',
      textStyle(34, '#eee0c7')).setOrigin(0.5);
    this.add.text(width / 2, height * 0.30,
      '奈落の霧の中から、二つの気配が近づいてくる。\nどちらか一人を旅の同行者に迎えるか、それとも拒むのか。',
      textStyle(17, '#ccc2ad', { align: 'center', lineSpacing: 10 })).setOrigin(0.5);

    // 候補の立ち絵 (霧の中の幻影らしく青白く透かす。絵が無ければテーマカラー矩形)。
    // クリック/タップで同行させる1名を選ぶ
    let chosen = 0;
    const frames: Phaser.GameObjects.Rectangle[] = [];
    const refreshChoice = () => frames.forEach((f, i) =>
      f.setStrokeStyle(i === chosen ? 2 : 1, i === chosen ? 0xd9c66b : 0x3a3050).setFillStyle(0x171226, i === chosen ? 0.6 : 0.25));
    joinPool.forEach((c, i) => {
      const x = width / 2 - 130 + i * 260;
      const feetY = height * 0.64;
      frames.push(this.add.rectangle(x, feetY - 50, 220, 240, 0x171226, 0.25)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { chosen = i; refreshChoice(); }));
      const key = charFullKey(c.id);
      if (hasArt(this, key)) {
        const img = this.add.image(x, feetY, key, artFrame(this, key)).setOrigin(0.5, 1);
        img.setScale(170 / img.height).setAlpha(0.8).setTint(0xc8d8ff);
        this.tweens.add({ targets: img, alpha: 0.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        this.add.rectangle(x, feetY - 52, 84, 104, c.themeColor, 0.85).setStrokeStyle(2, 0xd8e8f4, 0.5);
      }
      this.add.text(x, feetY + 16, c.name, textStyle(14, '#eee0c7')).setOrigin(0.5);
      this.add.text(x, feetY + 38, `Lv. ${JOIN_LEVEL}　職Lv. ${JOIN_JOB_LEVEL}　${c.jobName}`,
        textStyle(12, '#99cc99')).setOrigin(0.5);
    });
    refreshChoice();

    // 受け入れる
    makeButton(this, width / 2 - 220, height * 0.82, '選んだ幻影を受け入れる\n（1人が仲間に加入）', () => {
      run.partyMembers.push(createPartyMember(run, joinPool[chosen].id, JOIN_LEVEL, JOIN_JOB_LEVEL));
      run.phantomEventDone = true;
      saveRun(run);
      this.scene.start('Map');
    }, { width: 380, height: 72, fontSize: 17, color: COLORS.textBlue });

    // 拒む
    makeButton(this, width / 2 + 220, height * 0.82, '拒み、孤高を誓う\n（レベル+2・孤高の誓い）', () => {
      const char = getCharacter(run.characterId);
      for (let i = 0; i < 2; i++) {
        if (run.characterLevel >= MAX_CHARACTER_LEVEL) break;
        run.characterLevel++;
        run.maxHPBase += char.growthRates.maxHP;
      }
      // 孤高の誓い: 仲間を持たない代わりに主人公が大きく強くなる。誓いを立てた時点でHPは満ちる
      run.soloVow = true;
      run.currentHP = getEffectiveMaxHP(run);
      run.phantomEventDone = true;
      saveRun(run);
      this.scene.start('Map');
    }, { width: 380, height: 72, fontSize: 17, color: COLORS.textRed });
    this.add.text(width / 2 + 220, height * 0.82 + 52,
      `孤高の誓い: この旅の間、最大HP・攻撃・防御 +${Math.round(SOLO_VOW_BONUS * 100)}%`,
      textStyle(13, COLORS.textDim)).setOrigin(0.5);
    this.add.text(width / 2 - 220, height * 0.82 + 52,
      'Lv1から共に育ち、装備やスキルで支えてくれる',
      textStyle(13, COLORS.textDim)).setOrigin(0.5);
  }
}
