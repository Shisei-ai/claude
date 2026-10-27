import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { RunSetupScene } from './scenes/RunSetupScene';
import { MapScene } from './scenes/MapScene';
import { BattleScene } from './scenes/BattleScene';
import { NodeEventScene } from './scenes/NodeEventScene';
import { ResultScene } from './scenes/ResultScene';
import { MetaScene } from './scenes/MetaScene';
import { FinaleScene } from './scenes/FinaleScene';
import { EquipScene } from './scenes/EquipScene';
import { PhantomJoinScene } from './scenes/PhantomJoinScene';
import { SettingsScene } from './scenes/SettingsScene';
import { PrologueScene } from './scenes/PrologueScene';
import { CodexScene } from './scenes/CodexScene';
import { ToastScene } from './scenes/ToastScene';
import { loadFonts } from './ui/fonts';

// 書体を読み込んでから起動する (キャンバスに描く文字が代替フォントのまま残らないように)
const boot = document.getElementById('boot');
const bar = boot?.querySelector<HTMLElement>('.bar > i');
loadFonts((done, total) => { if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`; })
  .then(startGame);

function startGame(): void {
boot?.classList.add('done');
setTimeout(() => boot?.remove(), 600);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#07050d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    PreloadScene,
    MainMenuScene,
    RunSetupScene,
    MapScene,
    BattleScene,
    NodeEventScene,
    ResultScene,
    MetaScene,
    FinaleScene,
    EquipScene,
    PhantomJoinScene,
    SettingsScene,
    PrologueScene,
    CodexScene,
    ToastScene,   // 常に最前面 (実績通知)
  ],
});

// 画面が切り替わるたびに夜闇から溶け出すように見せる (常駐の通知・起動用シーンは除く)
game.events.once(Phaser.Core.Events.READY, () => {
  for (const scene of game.scene.scenes) {
    const key = scene.sys.settings.key;
    if (key === 'Toast' || key === 'Preload') continue;
    scene.sys.events.on(Phaser.Scenes.Events.CREATE, () => scene.cameras.main.fadeIn(280, 7, 5, 13));
  }
});

// 自動テスト用: URL に ?debug を付けたときだけゲーム本体を参照できるようにする
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __dcGame: Phaser.Game }).__dcGame = game;
}
}
