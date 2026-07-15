// 装備管理 — Unity版 UI/EquipMenuUI.cs 相当
// 3スロット (武器/防具/装飾品) + 所持品リスト。職業制限あり。
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import type { RunState } from '../core/run';
import { buildBattleStats, canEquip, equipItem, unequipSlot } from '../core/run';
import { getEquipment, EQUIP_RARITY_LABEL, EQUIP_RARITY_COLOR, SLOT_LABEL } from '../data/equipment';
import type { EquipSlot } from '../core/types';

export class EquipScene extends Phaser.Scene {
  private run!: RunState;

  constructor() { super('Equip'); }

  create(): void {
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    this.run = run;

    const { width, height } = this.scale;
    drawSceneBackground(this, undefined, 'panel');

    this.add.text(width / 2, 40, '装備', textStyle(30, COLORS.textGold)).setOrigin(0.5);

    // ── 現在のステータス ──
    const stats = buildBattleStats(run);
    this.add.text(width / 2, 76,
      `HP ${run.currentHP}/${stats.maxHP}　MP ${stats.maxMP}　物攻 ${stats.physicalAttack}　魔攻 ${stats.magicAttack}　` +
      `物防 ${stats.physicalDefense}　魔防 ${stats.magicDefense}　速度 ${stats.speed}　会心 ${stats.criticalRate}%`,
      textStyle(13, COLORS.textDim)).setOrigin(0.5);

    // ── 装備スロット ──
    const slots: { slot: EquipSlot; id: string | null }[] = [
      { slot: 'Weapon', id: run.equippedWeapon },
      { slot: 'Armor', id: run.equippedArmor },
      { slot: 'Accessory', id: run.equippedAccessory },
    ];

    slots.forEach((s, i) => {
      const x = width / 2 - 400 + i * 400;
      const y = 150;
      this.add.rectangle(x, y, 370, 84, 0x171226, 0.95).setStrokeStyle(1, COLORS.border);
      this.add.text(x - 170, y - 28, SLOT_LABEL[s.slot], textStyle(13, COLORS.textGold));
      const eq = s.id ? getEquipment(s.id) : undefined;
      if (eq) {
        this.add.text(x - 170, y - 4,
          `${EQUIP_RARITY_LABEL[eq.rarity]}${eq.name}`,
          textStyle(14, EQUIP_RARITY_COLOR[eq.rarity]));
        this.add.text(x - 170, y + 18, eq.description,
          textStyle(10, COLORS.textDim, { wordWrap: { width: 250 } }));
        makeButton(this, x + 130, y, '外す', () => {
          unequipSlot(this.run, s.slot as 'Weapon' | 'Armor' | 'Accessory');
          saveRun(this.run);
          this.scene.restart();
        }, { width: 80, height: 34, fontSize: 13 });
      } else {
        this.add.text(x - 170, y + 2, '― なし ―', textStyle(13, '#554d66'));
      }
    });

    // ── 所持品リスト ──
    this.add.text(80, 214, '◆ 所持品', textStyle(17, COLORS.text));
    const inv = run.equipmentInventory;

    if (inv.length === 0) {
      this.add.text(width / 2, 320, '装備品を持っていない。\nショップや宝箱で手に入る。',
        textStyle(14, COLORS.textDim, { align: 'center' })).setOrigin(0.5);
    }

    const perCol = 6;
    inv.slice(0, 12).forEach((id, i) => {
      const eq = getEquipment(id);
      if (!eq) return;
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const x = width / 2 - 300 + col * 600;
      const y = 268 + row * 62;
      const equippable = canEquip(run, id);

      this.add.rectangle(x, y, 560, 54, 0x120e1c, 0.95).setStrokeStyle(1, COLORS.border);
      this.add.text(x - 265, y - 16,
        `${EQUIP_RARITY_LABEL[eq.rarity]}${eq.name}【${SLOT_LABEL[eq.slot]}】`,
        textStyle(13, EQUIP_RARITY_COLOR[eq.rarity]));
      this.add.text(x - 265, y + 6, eq.description,
        textStyle(10, COLORS.textDim, { wordWrap: { width: 420 } }));
      makeButton(this, x + 230, y, equippable ? '装備' : '装備不可', () => {
        if (!equippable) return;
        equipItem(this.run, id);
        saveRun(this.run);
        this.scene.restart();
      }, { width: 92, height: 36, fontSize: 12, disabled: !equippable });
    });

    if (inv.length > 12) {
      this.add.text(width / 2, height - 110, `…他 ${inv.length - 12} 個`,
        textStyle(12, COLORS.textDim)).setOrigin(0.5);
    }

    makeButton(this, width / 2, height - 52, 'マップへ戻る', () => {
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 260 });
  }
}
