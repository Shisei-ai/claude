// アセット先読みシーン — 宣言済みの画像を起動時に読み込む。
// 実ファイルが無いキーは loaderror で MISSING_ART に記録し、
// 各シーンは hasArt() で存在チェックしてから画像を使う (無ければ矩形描画)。
import Phaser from 'phaser';
import { COLORS, textStyle, drawSceneBackground } from '../ui/theme';
import {
  CHARACTER_ART, ENEMY_ART, BG_ART, BGM_ART, MISSING_ART,
  charFullKey, charPortraitKey, enemyArtKey, bgArtKey, bgmKey,
} from '../data/assets';

import presentFiles from 'virtual:asset-list';

// 既存の import 経路 (scenes → PreloadScene) を維持するため再エクスポート
export { hasArt } from '../data/assets';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this);
    this.add.text(width / 2, height / 2, 'Now Loading…',
      textStyle(20, COLORS.textDim)).setOrigin(0.5);

    // 実在しないファイルは読みに行かない (404 やデコードエラーを出さない)。
    // 読み込まなかったキーは MISSING_ART に入れ、各シーンは従来描画にフォールバック
    const present = new Set(presentFiles);
    const queue = (key: string, url: string, kind: 'image' | 'audio') => {
      if (!present.has(url)) { MISSING_ART.add(key); return; }
      if (kind === 'image') this.load.image(key, url);
      else this.load.audio(key, url);
    };
    // 実在しても壊れていて読めなかった場合の保険
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      MISSING_ART.add(file.key);
    });

    for (const [id, art] of Object.entries(CHARACTER_ART)) {
      if (art.full) queue(charFullKey(id), art.full, 'image');
      if (art.portrait) queue(charPortraitKey(id), art.portrait, 'image');
    }
    for (const [id, url] of Object.entries(ENEMY_ART)) queue(enemyArtKey(id), url, 'image');
    for (const [key, urls] of Object.entries(BG_ART)) {
      queue(bgArtKey(key), urls.find((u) => present.has(u)) ?? urls[0], 'image');
    }
    for (const [key, url] of Object.entries(BGM_ART)) queue(bgmKey(key), url, 'audio');
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
