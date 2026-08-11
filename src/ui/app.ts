/**
 * 画面の組み立てと入力の受け付け。
 *
 * ここは「Store を読んで描く」「入力を actions へ渡す」だけに徹する。
 * 計算はすべて domain/ にあり、この層には無い。
 */

import { fmt } from '../domain/constants';
import { canPlace } from '../domain/geometry';
import type { Rot } from '../domain/types';
import { Store, type Tool } from '../store/state';
import * as A from './actions';
import { centerOn, createCamera, fit, screenToWorld, zoomAt } from './camera';
import { beltAtCell, beltNear, draw, nodeAtCell, type DrawView } from './draw';
import { byId, esc, qsa } from './dom';
import { createDataUi, paintData, syncTabButtons, type DataTab } from './modals/data';
import { paintField } from './modals/field';
import { bindIoModal } from './modals/io';
import { createPlanUi, paintPlan, runPlan } from './modals/plan';
import {
  paintBalance,
  paintDiag,
  paintInspector,
  paintMetrics,
  paintPalette,
  paintPower,
  paintTabs,
  type PanelHooks,
} from './panels';

const HINTS: Record<Tool, string> = {
  select: '設備やラインをクリックすると右に詳細。設備はドラッグで移動、空白のドラッグでスクロール。',
  place: '盤面をクリックで設置。R で向きを回します。',
  belt: '送り出す側の設備 → 受け取る側の設備 の順にクリック。',
  erase: '撤去したい設備またはラインをクリック。',
};

export function startApp(): Store {
  const store = new Store();
  const cam = createCamera();
  const cv = byId<HTMLCanvasElement>('cv');
  const stage = byId('stage');
  const ctx = cv.getContext('2d');

  const planUi = createPlanUi();
  const dataUi = createDataUi();

  let dragPan: { sx: number; sy: number; cx: number; cy: number } | null = null;
  let dragNode: { uid: string; offX: number; offY: number; tx: number; ty: number; moved: boolean } | null = null;
  let ghostCell: { x: number; y: number } | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;
  let rafPending = false;

  /* ── 描画 ─────────────────────────────────────── */

  const view = (): DrawView => {
    const n = store.ui.pickFac && ghostCell ? store.ds.fac(store.ui.pickFac) : null;
    return {
      ds: store.ds,
      board: store.board,
      res: store.res,
      cam,
      width: cv.clientWidth,
      height: cv.clientHeight,
      sel: store.ui.sel,
      hover: store.ui.hover,
      beltFrom: store.ui.beltFrom,
      ghost:
        store.ui.tool === 'place' && n && ghostCell
          ? {
              fac: n.id,
              x: ghostCell.x,
              y: ghostCell.y,
              rot: store.ui.ghostRot,
              ok: canPlace(store.ds, store.board, {
                uid: '',
                fac: n.id,
                x: ghostCell.x,
                y: ghostCell.y,
                rot: store.ui.ghostRot,
              }),
            }
          : null,
      dragTo: dragNode
        ? (() => {
            const nd = store.board.nodes.find((x) => x.uid === dragNode!.uid);
            if (!nd) return null;
            return {
              fac: nd.fac,
              x: dragNode.tx,
              y: dragNode.ty,
              rot: nd.rot,
              ok: canPlace(store.ds, store.board, { ...nd, x: dragNode.tx, y: dragNode.ty }, nd.uid),
            };
          })()
        : null,
    };
  };

  const paintBoard = (): void => {
    if (!ctx) return;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      draw(ctx, view());
    });
  };

  const resize = (): void => {
    if (!ctx) return;
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, r.width * dpr);
    cv.height = Math.max(1, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBoard();
  };

  const fitView = (): void => {
    const r = cv.getBoundingClientRect();
    fit(cam, r.width || 800, r.height || 600, store.board.w, store.board.h);
    paintBoard();
  };

  /* ── 画面全体の更新 ─────────────────────────── */

  const hooks: PanelHooks = {
    refresh: () => refresh(),
    flash: (m) => flash(m),
    focusNode: (uid) => {
      const c = A.nodeCenter(store, uid);
      if (!c) return;
      store.ui.sel = { k: 'n', uid };
      const r = cv.getBoundingClientRect();
      centerOn(cam, r.width, r.height, c.x, c.y);
      refresh();
    },
    focusBelt: (uid) => {
      const c = A.beltCenter(store, uid);
      if (!c) return;
      store.ui.sel = { k: 'b', uid };
      const r = cv.getBoundingClientRect();
      centerOn(cam, r.width, r.height, c.x, c.y);
      refresh();
    },
    fitView,
    onPickFac: (facId) => {
      store.ui.pickFac = facId;
      setTool('place');
    },
    rotate: (uid) => report(A.rotateNode(store, uid)),
    removeNode: (uid) => report(A.removeNode(store, uid)),
    removeBelt: (uid) => report(A.removeBelt(store, uid)),
    reroute: (uid) => report(A.rerouteBelt(store, uid)),
    setRecipe: (uid, rec) => A.setRecipe(store, uid, rec),
    setTapItem: (uid, item) => A.setTapItem(store, uid, item),
    setBeltItem: (uid, item) => A.setBeltItem(store, uid, item),
  };

  function refresh(): void {
    paintPower(store);
    paintTabs(store, hooks);
    paintPalette(byId('palette'), store, hooks);
    paintInspector(byId('inspector'), store, hooks);
    paintBalance(byId('balance'), store);
    paintMetrics(byId('metrics'), store);
    paintDiag(byId('diag'), store, hooks);
    byId('btnUndo').toggleAttribute('disabled', !store.canUndo());
    byId('btnRedo').toggleAttribute('disabled', !store.canRedo());
    const st = byId('saveState');
    st.textContent = store.dirty ? '● 未保存' : '保存済み';
    st.classList.toggle('dirty', store.dirty);
    showHint();
    paintBoard();
  }
  store.subscribe(() => refresh());

  function report(r: A.ActionResult): void {
    if (!r.ok || r.message) flash(r.message ?? '');
    refresh();
  }

  function flash(msg: string): void {
    if (!msg) return;
    const hint = byId('hint');
    hint.textContent = msg;
    hint.classList.add('flash');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      hint.classList.remove('flash');
      showHint();
    }, 2800);
  }

  function showHint(): void {
    const hint = byId('hint');
    if (hint.classList.contains('flash')) return;
    let t = HINTS[store.ui.tool];
    if (store.ui.tool === 'place')
      t = store.ui.pickFac
        ? `${store.ds.fac(store.ui.pickFac)?.name ?? ''} を設置 — ${HINTS.place}`
        : '左の一覧から設備を選んでください。';
    if (store.ui.tool === 'belt' && store.ui.beltFrom) t = '受け取り側の設備をクリック（Esc で取り消し）';
    hint.textContent = t;
  }

  function setTool(t: Tool): void {
    store.ui.tool = t;
    stage.dataset.tool = t;
    store.ui.beltFrom = null;
    if (t !== 'place') store.ui.pickFac = null;
    for (const b of qsa<HTMLButtonElement>(document, '#tools button'))
      b.setAttribute('aria-pressed', String(b.dataset.tool === t));
    refresh();
  }

  /* ── 盤面の入力 ─────────────────────────────── */

  const cellAt = (e: PointerEvent | MouseEvent): { gx: number; gy: number; sx: number; sy: number } => {
    const r = cv.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const w = screenToWorld(cam, sx, sy);
    return { gx: Math.floor(w.x), gy: Math.floor(w.y), sx, sy };
  };

  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    const { gx, gy, sx, sy } = cellAt(e);
    const n = nodeAtCell(store.ds, store.board, gx, gy);

    // 中ボタンはどのツールでもスクロール
    if (e.button === 1) {
      dragPan = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
      stage.classList.add('panning');
      return;
    }

    if (store.ui.tool === 'place' && store.ui.pickFac) {
      report(A.placeNode(store, store.ui.pickFac, gx, gy, store.ui.ghostRot));
      return;
    }
    if (store.ui.tool === 'belt') {
      if (!n) {
        store.ui.beltFrom = null;
        refresh();
        return;
      }
      if (!store.ui.beltFrom) {
        store.ui.beltFrom = n.uid;
        refresh();
        return;
      }
      if (store.ui.beltFrom === n.uid) {
        store.ui.beltFrom = null;
        refresh();
        return;
      }
      const from = store.ui.beltFrom;
      store.ui.beltFrom = null;
      report(A.addBelt(store, from, n.uid));
      return;
    }
    if (store.ui.tool === 'erase') {
      if (n) report(A.removeNode(store, n.uid));
      else {
        const b = beltAtCell(store.board, gx, gy) ?? beltNear(view(), sx, sy, 10);
        if (b) report(A.removeBelt(store, b));
      }
      return;
    }

    /* 選択ツール */
    if (n) {
      store.ui.sel = { k: 'n', uid: n.uid };
      dragNode = { uid: n.uid, offX: gx - n.x, offY: gy - n.y, tx: n.x, ty: n.y, moved: false };
      refresh();
      return;
    }
    const b = beltAtCell(store.board, gx, gy) ?? beltNear(view(), sx, sy, 10);
    if (b) {
      store.ui.sel = { k: 'b', uid: b };
      refresh();
      return;
    }
    store.ui.sel = null;
    dragPan = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    stage.classList.add('panning');
    refresh();
  });

  cv.addEventListener('pointermove', (e) => {
    const { gx, gy, sx, sy } = cellAt(e);
    ghostCell = { x: gx, y: gy };

    if (dragPan) {
      cam.x = dragPan.cx + (e.clientX - dragPan.sx);
      cam.y = dragPan.cy + (e.clientY - dragPan.sy);
      paintBoard();
      return;
    }
    if (dragNode) {
      const tx = gx - dragNode.offX;
      const ty = gy - dragNode.offY;
      if (tx !== dragNode.tx || ty !== dragNode.ty) {
        dragNode.tx = tx;
        dragNode.ty = ty;
        dragNode.moved = true;
        paintBoard();
      }
      return;
    }

    // ホバーの見た目とツールチップ
    const n = nodeAtCell(store.ds, store.board, gx, gy);
    const b = n ? null : (beltAtCell(store.board, gx, gy) ?? beltNear(view(), sx, sy, 10));
    const next = n ? { k: 'n' as const, uid: n.uid } : b ? { k: 'b' as const, uid: b } : null;
    const changed = next?.uid !== store.ui.hover?.uid || next?.k !== store.ui.hover?.k;
    store.ui.hover = next;
    showTip(next, sx, sy);
    if (changed || store.ui.tool === 'place') paintBoard();
  });

  const endDrag = (): void => {
    dragPan = null;
    stage.classList.remove('panning');
    if (dragNode) {
      const d = dragNode;
      dragNode = null;
      if (d.moved) report(A.moveNode(store, d.uid, d.tx, d.ty));
      else paintBoard();
    }
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => {
    store.ui.hover = null;
    ghostCell = null;
    byId('tip').classList.remove('on');
    paintBoard();
  });

  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      zoomAt(cam, e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      paintBoard();
    },
    { passive: false },
  );

  /** 盤面の要素にカーソルを合わせたときの吹き出し */
  function showTip(sel: { k: 'n' | 'b'; uid: string } | null, sx: number, sy: number): void {
    const tip = byId('tip');
    if (!sel) {
      tip.classList.remove('on');
      return;
    }
    const { ds, res } = store;
    let html = '';
    if (sel.k === 'n') {
      const n = store.board.nodes.find((x) => x.uid === sel.uid);
      if (!n) return;
      const f = ds.fac(n.fac);
      if (!f) return;
      const rt = res.ratio[n.uid] ?? 0;
      const passive = f.kind === 'sink' || f.kind === 'logistics';
      const sub = f.tap ? (n.item ? ds.itemName(n.item) : '引き出す品目が未設定') : (ds.rec(n.rec)?.name ?? 'レシピ未設定');
      html =
        `<div class="t">${esc(f.name)}</div>` +
        `<div class="r"><span>${esc(sub)}</span></div>` +
        (passive ? '' : `<div class="r"><span>稼働率</span><b>${(rt * 100).toFixed(0)}%</b></div>`) +
        (f.power ? `<div class="r"><span>消費電力</span><b>−${fmt(f.power)}</b></div>` : '') +
        (f.gen ? `<div class="r"><span>発電量</span><b>+${fmt(f.gen * rt)}</b></div>` : '');
    } else {
      const b = store.board.belts.find((x) => x.uid === sel.uid);
      if (!b) return;
      const flow = res.belt[b.uid] ?? 0;
      const cap = ds.capOf(b.item);
      html =
        `<div class="t">${esc(b.item ? ds.itemName(b.item) : '品目が未設定')}</div>` +
        `<div class="r"><span>${esc(ds.lineName(b.item))}</span><b>${fmt(flow)} / ${cap}</b></div>` +
        `<div class="r"><span>占有率</span><b>${Math.round((flow / cap) * 100)}%</b></div>` +
        `<div class="r"><span>長さ</span><b>${(b.cells ?? []).length} マス</b></div>`;
    }
    tip.innerHTML = html;
    tip.classList.add('on');
    // 画面からはみ出さない位置へ
    const r = stage.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    tip.style.left = Math.min(sx + 16, r.width - tw - 8) + 'px';
    tip.style.top = Math.min(sy + 16, r.height - th - 8) + 'px';
  }

  /* ── キーボード ─────────────────────────────── */

  addEventListener('keydown', (e) => {
    const t = (document.activeElement?.tagName ?? '').toUpperCase();
    const typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    const mod = e.ctrlKey || e.metaKey;

    if (mod && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      const ok = e.shiftKey ? store.redo() : store.undo();
      flash(ok ? (e.shiftKey ? 'やり直しました。' : '取り消しました。') : 'これ以上は戻れません。');
      return;
    }
    if (mod && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      store.redo();
      return;
    }
    if (e.key === 'Escape') {
      if (document.querySelector('.modal.on')) {
        closeModals();
        return;
      }
      store.ui.beltFrom = null;
      store.ui.sel = null;
      setTool('select');
      return;
    }
    if (typing) return;

    if (e.key >= '1' && e.key <= '4') {
      setTool((['select', 'place', 'belt', 'erase'] as Tool[])[+e.key - 1]!);
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (store.ui.sel?.k === 'n') report(A.rotateNode(store, store.ui.sel.uid));
      else {
        store.ui.ghostRot = (((store.ui.ghostRot + 1) & 3) as Rot);
        paintBoard();
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (store.ui.sel?.k === 'n') report(A.removeNode(store, store.ui.sel.uid));
      else if (store.ui.sel?.k === 'b') report(A.removeBelt(store, store.ui.sel.uid));
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      fitView();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      const r = cv.getBoundingClientRect();
      zoomAt(cam, r.width / 2, r.height / 2, 1.2);
      paintBoard();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      const r = cv.getBoundingClientRect();
      zoomAt(cam, r.width / 2, r.height / 2, 1 / 1.2);
      paintBoard();
      return;
    }
    if (e.key === 'v' || e.key === 'V') {
      dataUi.tab = 'cov';
      openData();
      return;
    }
  });

  /* ── モーダル ───────────────────────────────── */

  const openModal = (id: string): void => {
    byId(id).classList.add('on');
    byId(id).querySelector<HTMLElement>('input,select,textarea,button')?.focus();
  };
  const closeModals = (): void => {
    for (const m of qsa(document, '.modal')) m.classList.remove('on');
  };

  const openData = (): void => {
    syncTabButtons(dataUi);
    paintData(byId('dPane'), store, dataUi, { refresh, flash });
    openModal('mData');
  };

  byId('btnData').onclick = openData;
  byId('dTabs').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    dataUi.tab = b.dataset.tab as DataTab;
    syncTabButtons(dataUi);
    paintData(byId('dPane'), store, dataUi, { refresh, flash });
  });

  byId('btnField').onclick = () => {
    paintField(byId('fieldPane'), store, refresh);
    openModal('mField');
  };

  byId('btnPlan').onclick = () => {
    runPlan(store, planUi);
    paintPlan(byId('planPane'), store, planUi, { flash, close: closeModals, refresh, fitView });
    openModal('mPlan');
  };

  byId('btnIO').onclick = () => {
    byId<HTMLTextAreaElement>('ioText').value = '';
    openModal('mIO');
  };
  bindIoModal(byId('mIO'), store, { flash, close: closeModals, refresh, fitView });

  byId('btnHelp').onclick = () => openModal('mHelp');

  for (const b of qsa<HTMLButtonElement>(document, '[data-close]')) b.onclick = closeModals;
  for (const m of qsa(document, '.modal'))
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModals();
    });

  /* ── ヘッダーのボタン ───────────────────────── */

  byId('tools').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b?.dataset.tool) setTool(b.dataset.tool as Tool);
  });
  byId('btnUndo').onclick = () => {
    if (!store.undo()) flash('これ以上は戻れません。');
  };
  byId('btnRedo').onclick = () => {
    store.redo();
  };
  byId('zIn').onclick = () => {
    const r = cv.getBoundingClientRect();
    zoomAt(cam, r.width / 2, r.height / 2, 1.2);
    paintBoard();
  };
  byId('zOut').onclick = () => {
    const r = cv.getBoundingClientRect();
    zoomAt(cam, r.width / 2, r.height / 2, 1 / 1.2);
    paintBoard();
  };
  byId('zFit').onclick = fitView;

  addEventListener('resize', resize);
  addEventListener('beforeunload', (e) => {
    if (store.dirty) e.preventDefault();
  });

  /* ── 起動 ───────────────────────────────────── */

  store.restoreFromStorage();
  refresh();
  resize();
  fitView();
  return store;
}
