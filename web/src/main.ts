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

// 自動テスト用: URL に ?debug を付けたときだけゲーム本体を参照できるようにする
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __dcGame: Phaser.Game }).__dcGame = game;
}
