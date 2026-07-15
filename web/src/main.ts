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

new Phaser.Game({
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
  ],
});
