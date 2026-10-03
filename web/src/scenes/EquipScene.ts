// 装備管理 — Unity版 UI/EquipMenuUI.cs 相当
// 3スロット (武器/防具/装飾品) + 所持品リスト。職業制限あり。
// 所持品はパーティ共有、装備枠は1人ずつ。上のタブで主人公と仲間を切り替える。
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import type { RunState, UnitState } from '../core/run';
import { buildBattleStats, canEquip, equipItem, unequipSlot, partyUnits, getEffectiveMaxHP } from '../core/run';
import { jpToNextJobLevel, MAX_JOB_LEVEL } from '../core/level';
import { getCharacter } from '../data/characters';
import { shortName } from '../data/dialogue';
import { getEquipment, EQUIP_RARITY_LABEL, EQUIP_RARITY_COLOR, SLOT_LABEL } from '../data/equipment';
import type { EquipSlot } from '../core/types';

export class EquipScene extends Phaser.Scene {
  private run!: RunState;
  /** 表示中の人 (partyUnits の番号。0 = 主人公) */
  private unitIndex = 0;

  constructor() { super('Equip'); }

  init(data: { unit?: number }): void {
    this.unitIndex = data?.unit ?? 0;
  }

  /** 同じ人を表示したまま描き直す */
  private refresh(): void {
    this.scene.restart({ unit: this.unitIndex });
  }

  create(): void {
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    this.run = run;
    const units = partyUnits(run);
    this.unitIndex = Math.min(this.unitIndex, units.length - 1);
    const unit: UnitState = units[this.unitIndex];

    const { width, height } = this.scale;
    drawSceneBackground(this, undefined, 'panel');

    this.add.text(width / 2, 36, '装備', textStyle(30, COLORS.textGold)).setOrigin(0.5);

    // ── 誰の装備か (仲間がいるときだけタブを出す) ──
    let top = 70;
    if (units.length > 1) {
      const tabW = 230;
      units.forEach((u, i) => {
        const x = width / 2 + (i - (units.length - 1) / 2) * (tabW + 14);
        const name = shortName(getCharacter(u.characterId).name);
        makeButton(this, x, 88, `${i === 0 ? '主人公 ' : '仲間 '}${name}　Lv.${u.characterLevel}`, () => {
          if (i === this.unitIndex) return;
          this.unitIndex = i;
          this.refresh();
        }, { width: tabW, height: 36, fontSize: 13, color: i === this.unitIndex ? COLORS.textGold : COLORS.textDim });
      });
      top = 116;
    }

    // ── 現在のステータス ──
    const stats = buildBattleStats(run, unit);
    const jpNext = unit.jobLevel >= MAX_JOB_LEVEL ? '最大' : `${unit.currentJobJP}/${jpToNextJobLevel(unit.jobLevel)}`;
    this.add.text(width / 2, top,
      `${getCharacter(unit.characterId).name}　Lv.${unit.characterLevel}　職Lv.${unit.jobLevel} (JP ${jpNext})　` +
      `HP ${unit.currentHP}/${Math.min(stats.maxHP, getEffectiveMaxHP(run, unit))}`,
      textStyle(14, COLORS.text)).setOrigin(0.5);
    this.add.text(width / 2, top + 22,
      `MP ${Math.min(unit.currentMP, stats.maxMP)}/${stats.maxMP}　物攻 ${stats.physicalAttack}　魔攻 ${stats.magicAttack}　` +
      `物防 ${stats.physicalDefense}　魔防 ${stats.magicDefense}　速度 ${stats.speed}　会心 ${stats.criticalRate}%`,
      textStyle(13, COLORS.textDim)).setOrigin(0.5);

    // ── 装備スロット ──
    const slots: { slot: EquipSlot; id: string | null }[] = [
      { slot: 'Weapon', id: unit.equippedWeapon },
      { slot: 'Armor', id: unit.equippedArmor },
      { slot: 'Accessory', id: unit.equippedAccessory },
    ];
    const slotY = top + 90;

    slots.forEach((s, i) => {
      const x = width / 2 - 400 + i * 400;
      const y = slotY;
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
          unequipSlot(this.run, s.slot as 'Weapon' | 'Armor' | 'Accessory', unit);
          saveRun(this.run);
          this.refresh();
        }, { width: 80, height: 34, fontSize: 13 });
      } else {
        this.add.text(x - 170, y + 2, '― なし ―', textStyle(13, '#554d66'));
      }
    });

    // ── 所持品リスト ──
    const listTop = slotY + 62;
    this.add.text(80, listTop, '◆ 所持品 (パーティ共有)', textStyle(17, COLORS.text));
    const inv = run.equipmentInventory;

    if (inv.length === 0) {
      this.add.text(width / 2, listTop + 110, '装備品を持っていない。\nショップや宝箱で手に入る。',
        textStyle(14, COLORS.textDim, { align: 'center' })).setOrigin(0.5);
    }

    const perCol = units.length > 1 ? 5 : 6;
    const rowH = units.length > 1 ? 58 : 62;
    inv.slice(0, perCol * 2).forEach((id, i) => {
      const eq = getEquipment(id);
      if (!eq) return;
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const x = width / 2 - 300 + col * 600;
      const y = listTop + 54 + row * rowH;
      const equippable = canEquip(unit, id);

      this.add.rectangle(x, y, 560, 54, 0x120e1c, 0.95).setStrokeStyle(1, COLORS.border);
      this.add.text(x - 265, y - 16,
        `${EQUIP_RARITY_LABEL[eq.rarity]}${eq.name}【${SLOT_LABEL[eq.slot]}】`,
        textStyle(13, EQUIP_RARITY_COLOR[eq.rarity]));
      this.add.text(x - 265, y + 6, eq.description,
        textStyle(10, COLORS.textDim, { wordWrap: { width: 420 } }));
      makeButton(this, x + 230, y, equippable ? '装備' : '装備不可', () => {
        if (!equippable) return;
        equipItem(this.run, id, unit);
        saveRun(this.run);
        this.refresh();
      }, { width: 92, height: 36, fontSize: 12, disabled: !equippable });
    });

    if (inv.length > perCol * 2) {
      this.add.text(width / 2, height - 96, `…他 ${inv.length - perCol * 2} 個`,
        textStyle(12, COLORS.textDim)).setOrigin(0.5);
    }

    makeButton(this, width / 2, height - 52, 'マップへ戻る', () => {
      saveRun(this.run);
      this.scene.start('Map');
    }, { width: 260 });
  }
}
