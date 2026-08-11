/**
 * 盤面への操作。
 *
 * 画面から呼ばれる「編集」はすべてここを通し、Store.edit で包む。
 * そうしておけば、どの操作も取り消せる。
 */

import { canPlace, footprint } from '../domain/geometry';
import { connectNodes, pickItemFor, rewire, type ConnectFailure } from '../domain/routing';
import type { Node, Rot } from '../domain/types';
import type { Store } from '../store/state';

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

const FAIL_MSG: Record<ConnectFailure, string> = {
  'no-out-port': 'の搬出口が満杯です。分流器を挟んでください。',
  'no-in-port': 'の搬入口が満杯です。合流器を挟んでください。',
  'no-route': '経路が確保できません。間に空きマスが必要です。',
};

export function placeNode(store: Store, fac: string, x: number, y: number, rot: Rot): ActionResult {
  const t: Node = { uid: '', fac, x, y, rot, rec: null, item: null };
  if (!canPlace(store.ds, store.board, t)) return { ok: false, message: 'そこには置けません。' };
  store.edit(() => {
    const uid = 'u' + store.board.uidSeq++;
    const recs = store.ds.recipesFor(fac);
    store.board.nodes.push({
      uid,
      fac,
      x,
      y,
      rot,
      // 作れるものが1つしかない設備は、置いた時点で決めてしまう
      rec: recs.length === 1 ? recs[0]!.id : null,
      item: null,
    });
    // 置いたものをそのまま選択状態にする。edit の中でやらないと画面が1テンポ遅れる
    store.ui.sel = { k: 'n', uid };
  });
  return { ok: true };
}

export function removeNode(store: Store, uid: string): ActionResult {
  store.edit(() => {
    store.board.nodes = store.board.nodes.filter((n) => n.uid !== uid);
    store.board.belts = store.board.belts.filter((b) => b.from !== uid && b.to !== uid);
    if (store.ui.sel?.uid === uid) store.ui.sel = null;
  });
  return { ok: true };
}

export function removeBelt(store: Store, uid: string): ActionResult {
  store.edit(() => {
    store.board.belts = store.board.belts.filter((b) => b.uid !== uid);
    if (store.ui.sel?.uid === uid) store.ui.sel = null;
  });
  return { ok: true };
}

export function rotateNode(store: Store, uid: string): ActionResult {
  const n = store.board.nodes.find((x) => x.uid === uid);
  if (!n) return { ok: false, message: '設備が見つかりません。' };
  const next = (((n.rot || 0) + 1) & 3) as Rot;
  if (!canPlace(store.ds, store.board, { ...n, rot: next }, n.uid))
    return { ok: false, message: 'その向きでは他の設備と重なります。' };
  let lost = 0;
  store.edit(() => {
    n.rot = next;
    lost = rewire(store.ds, store.board, n.uid);
  });
  return lost ? { ok: true, message: `${lost}本のラインが引き直せず外れました。` } : { ok: true };
}

export function moveNode(store: Store, uid: string, x: number, y: number): ActionResult {
  const n = store.board.nodes.find((v) => v.uid === uid);
  if (!n) return { ok: false, message: '設備が見つかりません。' };
  if (n.x === x && n.y === y) return { ok: true };
  if (!canPlace(store.ds, store.board, { ...n, x, y }, n.uid)) return { ok: false, message: 'そこには置けません。' };
  let lost = 0;
  store.edit(() => {
    n.x = x;
    n.y = y;
    lost = rewire(store.ds, store.board, n.uid);
  });
  return lost ? { ok: true, message: `${lost}本のラインが引き直せず外れました。` } : { ok: true };
}

export function addBelt(store: Store, fromUid: string, toUid: string): ActionResult {
  const A = store.board.nodes.find((n) => n.uid === fromUid);
  const Z = store.board.nodes.find((n) => n.uid === toUid);
  if (!A || !Z) return { ok: false, message: '設備が見つかりません。' };
  let result: ActionResult = { ok: true };
  store.edit(() => {
    const r = connectNodes(store.ds, store.board, A, Z);
    if (r.ok) {
      store.ui.sel = { k: 'b', uid: r.belt.uid };
      if (!r.belt.item)
        result = { ok: true, message: '運ぶ品目が決まりませんでした。右のパネルで指定してください。' };
    } else {
      const who = r.reason === 'no-out-port' ? store.ds.fac(A.fac)?.name : store.ds.fac(Z.fac)?.name;
      result = {
        ok: false,
        message: r.reason === 'no-route' ? FAIL_MSG[r.reason] : `${who ?? '設備'}${FAIL_MSG[r.reason]}`,
      };
    }
  });
  return result;
}

/** ラインの経路だけを引き直す */
export function rerouteBelt(store: Store, uid: string): ActionResult {
  const b = store.board.belts.find((x) => x.uid === uid);
  if (!b) return { ok: false, message: 'ラインが見つかりません。' };
  const A = store.board.nodes.find((n) => n.uid === b.from);
  const Z = store.board.nodes.find((n) => n.uid === b.to);
  if (!A || !Z) return { ok: false, message: '端の設備が見つかりません。' };
  let result: ActionResult = { ok: true };
  store.edit(() => {
    const item = b.item;
    store.board.belts = store.board.belts.filter((x) => x.uid !== uid);
    const r = connectNodes(store.ds, store.board, A, Z, item);
    if (r.ok) store.ui.sel = { k: 'b', uid: r.belt.uid };
    else {
      store.board.belts.push(b); // 戻す
      result = { ok: false, message: '別の経路が見つかりません。' };
    }
  });
  return result;
}

/**
 * 設備の設定（レシピ・引き出す品目）を変えたあと、
 * 繋がっているラインの品目を見直す。
 */
export function retagBelts(store: Store, uid: string): void {
  for (const b of store.board.belts) {
    if (b.from !== uid && b.to !== uid) continue;
    const A = store.board.nodes.find((n) => n.uid === b.from);
    const Z = store.board.nodes.find((n) => n.uid === b.to);
    if (!A || !Z) continue;
    const fa = store.ds.fac(A.fac);
    const fz = store.ds.fac(Z.fac);
    if (!fa || !fz) continue;
    const outs = fa.tap ? (A.item ? [A.item] : []) : (store.ds.rec(A.rec)?.out ?? []).map((o) => o.item);
    const ins = (store.ds.rec(Z.rec)?.in ?? []).map((o) => o.item);
    const okA = fa.kind === 'logistics' || (b.item != null && outs.includes(b.item));
    const okZ = fz.kind === 'logistics' || fz.kind === 'sink' || (b.item != null && ins.includes(b.item));
    if (!b.item || !okA || !okZ) b.item = pickItemFor(store.ds, store.board, b.from, b.to);
  }
}

export function setRecipe(store: Store, uid: string, recId: string | null): void {
  store.edit(() => {
    const n = store.board.nodes.find((x) => x.uid === uid);
    if (!n) return;
    n.rec = recId;
    retagBelts(store, uid);
  });
}

export function setTapItem(store: Store, uid: string, itemId: string | null): void {
  store.edit(() => {
    const n = store.board.nodes.find((x) => x.uid === uid);
    if (!n) return;
    n.item = itemId;
    retagBelts(store, uid);
  });
}

export function setBeltItem(store: Store, uid: string, itemId: string | null): void {
  store.edit(() => {
    const b = store.board.belts.find((x) => x.uid === uid);
    if (b) b.item = itemId;
  });
}

/** 設備の中心（画面をそこへ寄せるのに使う） */
export function nodeCenter(store: Store, uid: string): { x: number; y: number } | null {
  const n = store.board.nodes.find((x) => x.uid === uid);
  if (!n) return null;
  const { w, h } = footprint(store.ds, n);
  return { x: n.x + w / 2, y: n.y + h / 2 };
}

export function beltCenter(store: Store, uid: string): { x: number; y: number } | null {
  const b = store.board.belts.find((x) => x.uid === uid);
  if (!b) return null;
  const cs = b.cells ?? [];
  if (cs.length) {
    const c = cs[Math.floor(cs.length / 2)]!;
    return { x: c.x + 0.5, y: c.y + 0.5 };
  }
  return nodeCenter(store, b.from);
}
