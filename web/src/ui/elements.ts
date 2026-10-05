import type { ElementType } from '../core/types';

/** 弱点枠に表示する属性の略称と色 */
export const ELEMENT_BADGE: Record<ElementType, { label: string; color: string }> = {
  None: { label: '無', color: '#d8d0e8' },
  Physical: { label: '物', color: '#e8e0d0' },
  Fire: { label: '炎', color: '#ff8a4a' },
  Ice: { label: '氷', color: '#8ad8ff' },
  Lightning: { label: '雷', color: '#ffe04a' },
  Wind: { label: '風', color: '#8aeaa0' },
  Dark: { label: '闇', color: '#c09aff' },
  Light: { label: '光', color: '#fff2a8' },
  Poison: { label: '毒', color: '#b0e070' },
  Bleed: { label: '血', color: '#ff6a7a' },
};
