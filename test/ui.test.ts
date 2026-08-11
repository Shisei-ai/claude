/**
 * @vitest-environment jsdom
 *
 * 画面の起動テスト。実際の index.html の骨組みを読み込んで startApp() を走らせ、
 * 主要な操作が最後まで通ることを確かめる。
 *
 * 描画そのもの（canvas への線）は検証しない。ここで見たいのは
 * 「domain の計算結果が画面の要素まで届いているか」と「操作で状態が動くか」。
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildPlan, type PlanContext } from '../src/domain/planner';
import { applyPlan } from '../src/domain/layout/blocks';
import type { Store } from '../src/store/state';
import * as A from '../src/ui/actions';
import { startApp } from '../src/ui/app';

/** canvas は jsdom に無いので、呼ばれても落ちないだけの 2D コンテキストを差す */
function stubCanvas(): void {
  const noop = (): void => void 0;
  const ctx = new Proxy(
    {
      canvas: null,
      setTransform: noop,
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: noop }),
    } as unknown as CanvasRenderingContext2D,
    {
      get(target, prop) {
        if (prop in target) return (target as unknown as Record<string, unknown>)[prop as string];
        return noop;
      },
      set() {
        return true;
      },
    },
  );
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext'];
  // jsdom は要素サイズを 0 で返すので、盤面が潰れないよう寸法を与える
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width: 900, height: 600, top: 0, left: 0, right: 900, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }),
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
}

function mountMarkup(): void {
  // jsdom 環境では import.meta.url が http なので、プロジェクト直下から読む
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  document.body.innerHTML = body;
}

let store: Store;

beforeEach(() => {
  localStorage.clear();
  stubCanvas();
  mountMarkup();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    fn(0);
    return 0;
  });
  store = startApp();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;
const text = (sel: string): string => $(sel).textContent ?? '';

describe('起動', () => {
  it('初期データで画面が組み上がる', () => {
    // 地域タブは2つ、エリアタブは四号谷地の6件
    expect(document.querySelectorAll('#regionTabs button')).toHaveLength(2);
    expect(text('#regionTabs')).toContain('四号谷地');
    expect(text('#regionTabs')).toContain('武陵');
    expect(document.querySelectorAll('#areaTabs button')).toHaveLength(6);

    // パレットに設備が並び、採取設備は出ていない
    const palette = text('#palette');
    expect(palette).toContain('精錬炉');
    expect(palette).toContain('倉庫搬出口');
    expect(palette).not.toContain('電動採鉱機');

    // 盤面の情報と電力
    expect(text('#areaInfo')).toContain('80×56');
    expect(text('#powerNum')).toBe('240 / 0');
    expect(text('#inspector')).toContain('概況');
  });

  it('空の盤面では診断が空で、採取ゾーンの品目だけがバランスに並ぶ', () => {
    expect(text('#diag')).toContain('問題が見つかるとここに並びます');
    // 中枢エリアは源石鉱物と青鉄鉱物を採っているので、その2行だけが出る
    expect(text('#balance')).toContain('源石鉱物');
    expect(text('#balance')).toContain('青鉄鉱物');
    expect(text('#metrics')).toContain('盤面に設備を置くと');
  });

  it('エリアを切り替えると盤面と採取ゾーンが入れ替わる', () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('#regionTabs button');
    buttons[1]!.click(); // 武陵
    expect(store.region).toBe('武陵');
    expect(text('#areaTabs')).toContain('武陵城');
    // 武陵城の採取ゾーンが効いている（赤銅鉱物が倉庫に入る）
    expect(store.res.field['ore_red']).toBe(360);
  });
});

describe('ツールと操作', () => {
  it('ツールを切り替えると案内文が変わる', () => {
    const tools = document.querySelectorAll<HTMLButtonElement>('#tools button');
    tools[2]!.click(); // ライン
    expect(store.ui.tool).toBe('belt');
    expect($('#stage').dataset.tool).toBe('belt');
    expect(text('#hint')).toContain('送り出す側');
    tools[0]!.click();
    expect(store.ui.tool).toBe('select');
  });

  it('パレットから設備を選ぶと設置ツールになる', () => {
    const b = [...document.querySelectorAll<HTMLButtonElement>('#palette .fac')].find((x) =>
      (x.textContent ?? '').includes('精錬炉'),
    )!;
    b.click();
    expect(store.ui.tool).toBe('place');
    expect(store.ui.pickFac).toBe('smelt');
    expect(text('#hint')).toContain('精錬炉');
  });

  it('設備を置くと検査パネルに出て、撤去すると消える', () => {
    const r = A.placeNode(store, 'smelt', 10, 10, 0);
    expect(r.ok).toBe(true);
    expect(store.board.nodes).toHaveLength(1);
    // 選択されているので検査パネルに詳細が出る
    expect(text('#inspector')).toContain('精錬炉');
    expect(text('#inspector')).toContain('作るもの');

    A.removeNode(store, store.board.nodes[0]!.uid);
    expect(store.board.nodes).toHaveLength(0);
  });

  it('取り消しとやり直しが効く', () => {
    A.placeNode(store, 'smelt', 10, 10, 0);
    A.placeNode(store, 'crush', 16, 10, 0);
    expect(store.board.nodes).toHaveLength(2);

    expect(store.undo()).toBe(true);
    expect(store.board.nodes).toHaveLength(1);
    expect(store.undo()).toBe(true);
    expect(store.board.nodes).toHaveLength(0);
    expect(store.undo()).toBe(false); // これ以上は戻れない

    expect(store.redo()).toBe(true);
    expect(store.board.nodes).toHaveLength(1);
    expect(store.redo()).toBe(true);
    expect(store.board.nodes).toHaveLength(2);
  });

  it('取り消しボタンの有効・無効が状態に追随する', () => {
    expect($('#btnUndo').hasAttribute('disabled')).toBe(true);
    A.placeNode(store, 'smelt', 10, 10, 0);
    expect($('#btnUndo').hasAttribute('disabled')).toBe(false);
    expect($('#btnRedo').hasAttribute('disabled')).toBe(true);
    $('#btnUndo').click();
    expect($('#btnRedo').hasAttribute('disabled')).toBe(false);
  });

  it('キーボードでツールを切り替えられる', () => {
    dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    expect(store.ui.tool).toBe('belt');
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(store.ui.tool).toBe('select');
  });

  it('設備を回すと向きが変わる', () => {
    A.placeNode(store, 'smelt', 10, 10, 0);
    const uid = store.board.nodes[0]!.uid;
    A.rotateNode(store, uid);
    expect(store.board.nodes[0]!.rot).toBe(1);
    expect(text('#inspector')).toContain('→右向き');
  });
});

describe('計算結果が画面に出る', () => {
  /** 倉庫搬出口 → 精錬炉 → 倉庫搬入口 の最小ライン */
  const buildLine = (): void => {
    A.placeNode(store, 'wh_out', 4, 10, 0);
    const tap = store.board.nodes[0]!;
    A.setTapItem(store, tap.uid, 'ore_gen');
    A.placeNode(store, 'smelt', 10, 10, 0);
    const sm = store.board.nodes[1]!;
    A.setRecipe(store, sm.uid, 'r_shell');
    A.placeNode(store, 'wh_in', 16, 10, 0);
    const sink = store.board.nodes[2]!;
    A.addBelt(store, tap.uid, sm.uid);
    A.addBelt(store, sm.uid, sink.uid);
  };

  it('品目バランスと効率に数値が出る', () => {
    buildLine();
    expect(store.board.belts).toHaveLength(2);
    const bal = text('#balance');
    expect(bal).toContain('源石鉱物');
    expect(bal).toContain('結晶外殻');
    const met = text('#metrics');
    expect(met).toContain('倉庫への搬入');
    expect(met).toContain('結晶外殻');
    expect(met).toContain('平均稼働率');
    expect(text('#powerNum')).toBe('240 / 24');
  });

  it('電力が足りないと画面が停電の表示になる', () => {
    for (let i = 0; i < 4; i++) A.placeNode(store, 'tenyu', 2 + i * 6, 4, 0);
    // 天有洪炉 80×4 = 320 > 基礎電力 240
    expect(store.res.cons).toBe(320);
    expect($('#blackout').classList.contains('on')).toBe(true);
    expect(text('#diag')).toContain('電力不足');
  });

  it('診断の行をクリックすると該当設備が選択される', () => {
    A.placeNode(store, 'smelt', 10, 10, 0);
    A.setRecipe(store, store.board.nodes[0]!.uid, 'r_shell');
    const row = document.querySelector<HTMLElement>('#diag .jump');
    expect(row).not.toBeNull();
    row!.click();
    expect(store.ui.sel).toEqual({ k: 'n', uid: store.board.nodes[0]!.uid });
  });

  it('推定値に依存していることが検査パネルに出る', () => {
    A.placeNode(store, 'smelt', 10, 10, 0);
    A.setRecipe(store, store.board.nodes[0]!.uid, 'r_shell'); // 確度は推定
    store.ui.sel = null;
    store.recompute();
    const ins = text('#inspector');
    expect(ins).toContain('この計画の確度');
    expect(ins).toContain('推定値を含む計画です');
  });
});

describe('生産目標からの自動配置', () => {
  it('逆算して配置すると、盤面が埋まって搬入量が出る', () => {
    const ctx: PlanContext = {
      ds: store.ds,
      areas: store.save.areas,
      cur: store.save.cur,
      basePower: store.save.meta.basePower,
    };
    const plan = buildPlan(ctx, 'shell', 20);
    store.edit(() => {
      applyPlan(ctx, store.board, plan, {}, { useBlocks: true });
    });

    expect(store.board.nodes.length).toBeGreaterThan(0);
    expect(store.board.belts.length).toBeGreaterThan(0);
    // §7 の回帰ケースと同じ値が画面に出ている
    expect(Math.round((store.res.core['shell']?.ship ?? 0) * 10) / 10).toBe(20);
    expect(text('#powerNum')).toBe('240 / 48');
    // 停止も注意も無い（ベルトが上限に達している「上限」の情報は出る）
    expect(store.res.diag.filter((d) => d.lv === 'err')).toHaveLength(0);
    expect(store.res.diag.filter((d) => d.lv === 'wrn')).toHaveLength(0);
    expect(text('#diag')).toContain('停止 0');
    // 配置も取り消せる
    store.undo();
    expect(store.board.nodes).toHaveLength(0);
  });
});

describe('モーダル', () => {
  it('生産目標の画面が開いて計算結果が出る', () => {
    $('#btnPlan').click();
    expect($('#mPlan').classList.contains('on')).toBe(true);
    const pane = text('#planPane');
    expect(pane).toContain('総設備数');
    expect(pane).toContain('必要な設備');
    expect(pane).toContain('ブロックを並べて配置');
  });

  it('データ編集のタブが切り替わる', () => {
    $('#btnData').click();
    expect(text('#dPane')).toContain('品目名');
    const tabs = document.querySelectorAll<HTMLButtonElement>('#dTabs button');
    tabs[4]!.click(); // 網羅状況
    expect(text('#dPane')).toContain('推定のまま');
    expect(text('#dPane')).toContain('行き止まり');
    tabs[3]!.click(); // まとめて入力
    expect($<HTMLTextAreaElement>('#bulkText').value).toContain('包装機 10s:');
  });

  it('採取ゾーンの画面に登録が並ぶ', () => {
    $('#btnField').click();
    const pane = text('#fieldPane');
    expect(pane).toContain('中枢エリア');
    expect(pane).toContain('電動採鉱機Ⅱ');
    expect(pane).toContain('倉庫（地域共通）');
  });

  it('Esc でモーダルが閉じる', () => {
    $('#btnHelp').click();
    expect($('#mHelp').classList.contains('on')).toBe(true);
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('#mHelp').classList.contains('on')).toBe(false);
  });
});

describe('保存', () => {
  it('書き出した JSON を読み戻すと盤面が復元される', () => {
    A.placeNode(store, 'smelt', 10, 10, 0);
    A.setRecipe(store, store.board.nodes[0]!.uid, 'r_shell');
    const json = store.toJSON();

    store.reset();
    expect(store.board.nodes).toHaveLength(0);

    store.fromJSON(json);
    expect(store.board.nodes).toHaveLength(1);
    expect(store.board.nodes[0]!.rec).toBe('r_shell');
    expect(text('#inspector')).toContain('概況');
  });

  it('自動保存された内容から続きを再開できる', async () => {
    A.placeNode(store, 'smelt', 10, 10, 0);
    // 自動保存は少し待ってから走る
    await new Promise((r) => setTimeout(r, 1000));
    expect(localStorage.getItem('aic:plan')).toBeTruthy();

    mountMarkup();
    const store2 = startApp();
    expect(store2.board.nodes).toHaveLength(1);
    expect(store2.board.nodes[0]!.fac).toBe('smelt');
  });
});

describe('自動配置は別スレッドへ逃がす（§8-3）', () => {
  it('Worker が使えない環境では同期で計算して同じ結果を返す', async () => {
    const { requestLayout } = await import('../src/ui/layoutRunner');
    const { runLayout } = await import('../src/worker/layout.worker');
    const req = {
      save: JSON.parse(store.toJSON()),
      cfg: { ...store.cfg },
      cur: store.save.cur,
      item: 'shell',
      rate: 20,
      choice: {},
      useBlocks: true,
      w: 80,
      h: 56,
    };
    // jsdom には Worker が無いので、その場で計算する経路に落ちる
    expect(typeof Worker).toBe('undefined');
    const viaRunner = await requestLayout(req);
    const direct = runLayout(req);
    expect(viaRunner.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (viaRunner.ok && direct.ok) {
      expect(viaRunner.nodes.length).toBe(direct.nodes.length);
      expect(viaRunner.belts.length).toBe(direct.belts.length);
      expect(viaRunner.result.failed).toBe(0);
    }
  });

  it('壊れた目標でも例外にせず、理由を返す', async () => {
    const { runLayout } = await import('../src/worker/layout.worker');
    const r = runLayout({
      save: JSON.parse(store.toJSON()),
      cfg: { ...store.cfg },
      cur: 99, // 存在しないエリア
      item: 'shell',
      rate: 20,
      choice: {},
      useBlocks: true,
      w: 80,
      h: 56,
    });
    // 落ちずに何らかの結果（成功でも失敗でも）を返すこと
    expect(typeof r.ok).toBe('boolean');
  });

  it('配置ボタンを押すと盤面が置き換わり、取り消せる', async () => {
    $('#btnPlan').click();
    await Promise.resolve();
    const sel = $<HTMLSelectElement>('#pItem');
    sel.value = 'shell';
    sel.dispatchEvent(new Event('change'));
    $<HTMLInputElement>('#pRate').value = '20';
    $('#pRun').click();

    expect(store.board.nodes).toHaveLength(0);
    $('#pApply').click();
    // 非同期なので待つ
    await new Promise((r) => setTimeout(r, 50));
    expect(store.board.nodes.length).toBeGreaterThan(0);
    expect($('#mPlan').classList.contains('on')).toBe(false);

    const n = store.board.nodes.length;
    store.undo();
    expect(store.board.nodes).toHaveLength(0);
    store.redo();
    expect(store.board.nodes).toHaveLength(n);
  });
});
