// アセット先読みシーン — 宣言済みの画像を起動時に読み込む。
// 実ファイルが無いキーは loaderror で MISSING_ART に記録し、
// 各シーンは hasArt() で存在チェックしてから画像を使う (無ければ矩形描画)。
import Phaser from 'phaser';
import { COLORS, textStyle, drawSceneBackground } from '../ui/theme';
import {
  CHARACTER_ART, ENEMY_ART, BG_ART, MISSING_ART,
  charFullKey, charPortraitKey, enemyArtKey, bgArtKey,
} from '../data/assets';

// 既存の import 経路 (scenes → PreloadScene) を維持するため再エクスポート
export { hasArt } from '../data/assets';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this);
    this.add.text(width / 2, height / 2, 'Now Loading…',
      textStyle(20, COLORS.textDim)).setOrigin(0.5);

    // 未配置ファイルはここで握りつぶす (コンソール汚染も抑止)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      MISSING_ART.add(file.key);
    });

    for (const [id, art] of Object.entries(CHARACTER_ART)) {
      if (art.full) this.load.image(charFullKey(id), art.full);
      if (art.portrait) this.load.image(charPortraitKey(id), art.portrait);
    }
    for (const [id, url] of Object.entries(ENEMY_ART)) {
      this.load.image(enemyArtKey(id), url);
    }
    for (const [key, url] of Object.entries(BG_ART)) {
      this.load.image(bgArtKey(key), url);
    }
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
