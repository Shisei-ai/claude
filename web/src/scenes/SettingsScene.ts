// 設定 — BGM音量・効果音量・戦闘速度。メインメニューとマップから開く。
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground, drawBar, drawOrnamentLine } from '../ui/theme';
import { getSettings, updateSettings, BATTLE_SPEEDS } from '../core/settings';
import { playSfx, type Sfx, type SfxOptions } from '../audio/sfx';
import { applyBgmVolume } from '../audio/bgm';

interface SettingsInit { from?: string }

/** 「効果音を試す」で順に鳴らす音 */
const SFX_SAMPLES: [string, Sfx, SfxOptions?][] = [
  ['斬撃', 'hit'], ['会心の一撃', 'crit'], ['弱点', 'weak'], ['獣の爪', 'hit', { claw: true }],
  ['炎の魔法', 'hit', { element: 'Fire', magical: true }], ['氷の魔法', 'hit', { element: 'Ice', magical: true }],
  ['雷の魔法', 'hit', { element: 'Lightning', magical: true }], ['風の魔法', 'hit', { element: 'Wind', magical: true }],
  ['闇の魔法', 'hit', { element: 'Dark', magical: true }], ['光の魔法', 'hit', { element: 'Light', magical: true }],
  ['技の構え', 'skill'], ['回避', 'miss'], ['ブレイク', 'break'], ['回復', 'heal'], ['強化', 'buff'], ['弱体', 'debuff'],
  ['毒', 'dot'], ['障壁', 'shield'], ['敵を倒す', 'defeat'], ['勝利', 'victory'], ['全滅', 'toll'], ['実績', 'chime'],
];

export class SettingsScene extends Phaser.Scene {
  private from = 'MainMenu';
  private sampleIndex = 0;

  constructor() { super('Settings'); }

  init(data: SettingsInit): void {
    this.from = data?.from ?? 'MainMenu';
  }

  create(): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    drawSceneBackground(this, undefined, 'panel');
    const s = getSettings();

    this.add.text(width / 2, 70, '設定', textStyle(34, COLORS.textGold)).setOrigin(0.5);
    drawOrnamentLine(this, width / 2, 98, 260);

    const labelX = width / 2 - 300;
    const volumeRow = (y: number, label: string, value: number, onChange: (v: number) => void) => {
      this.add.text(labelX, y, label, textStyle(18)).setOrigin(0, 0.5);
      const barX = width / 2 - 60;
      const barW = 240;
      const g = this.add.graphics();
      drawBar(g, barX, y - 8, barW, 16, value, COLORS.accent);
      this.add.text(barX + barW + 70, y, `${Math.round(value * 100)}%`, textStyle(16, COLORS.textDim)).setOrigin(0.5);
      const step = (d: number) => {
        const v = Math.round(Math.min(1, Math.max(0, value + d)) * 10) / 10;
        onChange(v);
        this.create();
      };
      makeButton(this, barX - 40, y, '－', () => step(-0.1), { width: 48, height: 36, fontSize: 18 });
      makeButton(this, barX + barW + 150, y, '＋', () => step(0.1), { width: 48, height: 36, fontSize: 18 });
    };

    volumeRow(190, 'BGM 音量', s.bgmVolume, (v) => { updateSettings({ bgmVolume: v }); applyBgmVolume(); });
    volumeRow(270, '効果音 音量', s.sfxVolume, (v) => { updateSettings({ sfxVolume: v }); playSfx('select'); });

    // 戦闘速度
    this.add.text(labelX, 360, '戦闘速度', textStyle(18)).setOrigin(0, 0.5);
    BATTLE_SPEEDS.forEach((sp, i) => {
      const selected = s.battleSpeed === sp;
      makeButton(this, width / 2 - 40 + i * 110, 360, `×${sp}`, () => {
        updateSettings({ battleSpeed: sp });
        playSfx('select');
        this.create();
      }, { width: 96, height: 40, fontSize: 17, color: selected ? COLORS.textGold : COLORS.text });
    });
    this.add.text(width / 2 + 125, 404, '戦闘中も右上のボタンで切り替えられます',
      textStyle(12, COLORS.textDim)).setOrigin(0.5);

    // 押すたびに戦闘の効果音を順に鳴らす
    const caption = this.add.text(width / 2, 540, '', textStyle(13, COLORS.textDim)).setOrigin(0.5);
    makeButton(this, width / 2, 500, '効果音を試す', () => {
      const [label, kind, opts] = SFX_SAMPLES[this.sampleIndex % SFX_SAMPLES.length];
      this.sampleIndex++;
      playSfx(kind, opts);
      caption.setText(`♪ ${label}　(${(this.sampleIndex - 1) % SFX_SAMPLES.length + 1}/${SFX_SAMPLES.length})`);
    }, { width: 220, height: 42, fontSize: 15 });

    makeButton(this, width / 2, height - 70, '戻る', () => {
      this.scene.start(this.from);
    }, { width: 240 });
  }
}
