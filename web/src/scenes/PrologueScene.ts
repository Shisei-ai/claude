// プロローグ — ラン開始時にキャラクターの独白を表示する (CharacterPrologueSystem の移植)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun } from '../core/save';
import { getCharacter } from '../data/characters';
import { PROLOGUE } from '../data/dialogue';
import { showDialogue } from '../ui/dialogue';
import { hasArt, charFullKey, artFrame } from '../data/assets';

export class PrologueScene extends Phaser.Scene {
  constructor() { super('Prologue'); }

  create(): void {
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    const lines = PROLOGUE[run.characterId] ?? ['……行くか。'];
    const { width, height } = this.scale;
    drawSceneBackground(this, undefined, 'title');

    // 立ち絵を大きく、少し透かして背景に置く
    const key = charFullKey(run.characterId);
    if (hasArt(this, key)) {
      const img = this.add.image(width * 0.5, height * 0.42, key, artFrame(this, key)).setAlpha(0.85);
      img.setScale(460 / img.height);
    }
    this.add.text(width / 2, 48, `― ${getCharacter(run.characterId).name} ―`,
      textStyle(22, COLORS.textGold)).setOrigin(0.5);

    const toMap = () => this.scene.start('Map');
    makeButton(this, width - 90, 48, 'スキップ', toMap, { width: 130, height: 36, fontSize: 14 });
    showDialogue(this, { characterId: run.characterId, lines, onDone: toMap });
  }
}
