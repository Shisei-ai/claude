/**
 * 自動配置の呼び出し口。
 *
 * Worker が使える環境では別スレッドで走らせ、使えなければその場で計算する。
 * どちらでも結果は同じ（domain が純粋関数なので）。
 */

import type { LayoutReply, LayoutRequest } from '../worker/layout.worker';
import { runLayout } from '../worker/layout.worker';

let worker: Worker | null = null;
let workerBroken = false;

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('../worker/layout.worker.ts', import.meta.url), { type: 'module' });
    worker.onerror = () => {
      // 起動に失敗したら以後は同期で計算する（結果は同じ、待ち時間だけの違い）
      workerBroken = true;
      worker = null;
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

/** 別スレッドで配置を計算する。使えない環境では同期で計算して返す */
export function requestLayout(req: LayoutRequest): Promise<LayoutReply> {
  const w = getWorker();
  if (!w) return Promise.resolve(runLayout(req));

  return new Promise((resolve) => {
    const onMessage = (e: MessageEvent<LayoutReply>): void => {
      cleanup();
      resolve(e.data);
    };
    const onError = (): void => {
      cleanup();
      workerBroken = true;
      worker = null;
      resolve(runLayout(req)); // 落ちたらその場で計算し直す
    };
    const cleanup = (): void => {
      w.removeEventListener('message', onMessage as EventListener);
      w.removeEventListener('error', onError);
    };
    w.addEventListener('message', onMessage as EventListener);
    w.addEventListener('error', onError);
    w.postMessage(req);
  });
}

/** テスト用。次回また作り直す */
export function resetLayoutWorker(): void {
  worker?.terminate();
  worker = null;
  workerBroken = false;
}
