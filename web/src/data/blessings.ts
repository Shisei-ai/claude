// Unity版 Roguelike/PendingRunConfig.cs の忠実移植
import type { BlessingType } from '../core/types';

export interface BlessingInfo {
  type: BlessingType;
  name: string;
  desc: string;
  icon: string;
}

export const BLESSINGS: BlessingInfo[] = [
  { type: 'None',             name: 'なし',         desc: '加護なし。', icon: '·' },
  { type: 'VitalGuard',       name: '守護の護符',   desc: '最大HP+25%。', icon: '❤' },
  { type: 'GoldenCompass',    name: '黄金の羅針盤', desc: '150Gを持って旅立つ。', icon: '◈' },
  { type: 'IronWill',         name: '鉄の意志',     desc: '一般レリックを1つ持って旅立つ。', icon: '⬡' },
  { type: 'AncientKnowledge', name: '知識の欠片',   desc: '最初のレリック報酬の選択肢+1。', icon: '✦' },
  { type: 'ShadowVeil',       name: '影の帳',       desc: '最初の戦闘で敵のシールド-1。', icon: '◆' },
];
