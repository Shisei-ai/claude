/**
 * 自動配置を別スレッドで走らせる（HANDOFF §8-3）。
 *
 * ブロック方式は置き方を最大27通り試すので、大きな計画では10秒近くかかる。
 * 同期で回すと画面がその間まったく反応しなくなるので、ここへ逃がす。
 *
 * domain/ が DOM もグローバル状態も持たない純粋関数なので、
 * 同じコードをそのまま Worker で動かせる —— これが §2 の分離の御利益。
 */

import { createBoard } from '../domain/geometry';
import { applyPlan } from '../domain/layout/blocks';
import { buildPlan, type Choice, type PlanContext } from '../domain/planner';
import { buildDataset } from '../domain/dataset';
import type { Belt, Node, Save } from '../domain/types';
import type { GameConfig } from '../domain/constants';
import type { LayoutResult } from '../domain/layout/autoLayout';
import type { BlocksResult } from '../domain/layout/blocks';

export interface LayoutRequest {
  save: Save;
  cfg: GameConfig;
  cur: number;
  item: string;
  rate: number;
  choice: Choice;
  useBlocks: boolean;
  w: number;
  h: number;
}

export type LayoutReply =
  | { ok: true; nodes: Node[]; belts: Belt[]; w: number; h: number; result: LayoutResult | BlocksResult }
  | { ok: false; error: string };

/** 実際の計算。Worker が使えない環境ではこれを直接呼ぶ */
export function runLayout(req: LayoutRequest): LayoutReply {
  try {
    const ds = buildDataset(req.save, req.cfg);
    const ctx: PlanContext = {
      ds,
      areas: req.save.areas,
      cur: req.cur,
      basePower: req.save.meta.basePower,
      genRec: req.save.meta.genRec ?? null,
      field: req.save.areas[req.cur]?.field ?? [],
    };
    const board = createBoard(req.w, req.h);
    const plan = buildPlan(ctx, req.item, req.rate, req.choice);
    const result = applyPlan(ctx, board, plan, req.choice, { useBlocks: req.useBlocks });
    return { ok: true, nodes: board.nodes, belts: board.belts, w: board.w, h: board.h, result };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Worker として読み込まれたときだけ受け口を張る
if (typeof self !== 'undefined' && typeof (self as unknown as { document?: unknown }).document === 'undefined') {
  self.onmessage = (e: MessageEvent<LayoutRequest>): void => {
    self.postMessage(runLayout(e.data));
  };
}
