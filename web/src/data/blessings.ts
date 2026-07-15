// Unity版 Roguelike/PendingRunConfig.cs の忠実移植
import type { BlessingType } from '../core/types';

export interface BlessingInfo {
  type: BlessingType;
  name: string;
  desc: string;
  icon: string;
}

export const BLESSINGS: BlessingInfo[] = [
  { type: 'None',             name: 'なし',         desc: '加護を受けずに旅立つ。', icon: '·' },
  { type: 'VitalGuard',       name: '守護の護符',   desc: '最大HPが25%増加する。長い旅路を生き抜け。', icon: '❤' },
  { type: 'GoldenCompass',    name: '黄金の羅針盤', desc: '150ゴールドを持って旅を始める。', icon: '◈' },
  { type: 'IronWill',         name: '鉄の意志',     desc: '追加のコモンレリックを1つ所持して始まる。', icon: '⬡' },
  { type: 'AncientKnowledge', name: '知識の欠片',   desc: '最初の戦闘後、スキル選択肢が1枚多くなる。', icon: '✦' },
  { type: 'ShadowVeil',       name: '影の帳',       desc: '最初の戦闘の開始時、全ての敵のシールドが1枚少ない。', icon: '◆' },
];
