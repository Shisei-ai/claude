/**
 * 状態管理（HANDOFF §2 の store/）
 *
 * エリア切り替えとダーティ管理、そして取り消し／やり直し。
 *
 * domain/ は純粋関数なので、ここが唯一の可変状態になる。
 * 画面はこの Store を購読して、変更のたびに描き直すだけにしてある。
 */

import { seed } from '../data/seed';
import { defaultConfig, type GameConfig } from '../domain/constants';
import { buildDataset, type Dataset } from '../domain/dataset';
import type { Board } from '../domain/geometry';
import { inspectBoard, solve, type SolveResult } from '../domain/solver';
import type { Area, Rot, Save } from '../domain/types';
import { boardOfArea, dumpSave, loadSave, syncArea } from './save';

export type Tool = 'select' | 'place' | 'belt' | 'erase';
export type Selection = { k: 'n' | 'b'; uid: string } | null;

/** localStorage のキー。ブラウザを閉じても続きから編集できる */
const STORAGE_KEY = 'aic:plan';
const HISTORY_MAX = 60;

export interface UiState {
  tool: Tool;
  /** 設備ツールで置こうとしている設備 */
  pickFac: string | null;
  ghostRot: Rot;
  /** ベルトツールで選んだ送り出し側 */
  beltFrom: string | null;
  sel: Selection;
  hover: Selection;
  /** パレットの絞り込み */
  facFilter: string;
}

export interface Snapshot {
  save: Save;
  cur: number;
}

type Listener = () => void;

export class Store {
  save: Save = seed();
  cfg: GameConfig = defaultConfig();
  ds: Dataset;
  board: Board;
  res: SolveResult;
  ui: UiState = {
    tool: 'select',
    pickFac: null,
    ghostRot: 0,
    beltFrom: null,
    sel: null,
    hover: null,
    facFilter: '',
  };
  /** 保存されていない変更があるか */
  dirty = false;

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ds = buildDataset(this.save, this.cfg);
    this.board = boardOfArea(this.area);
    this.res = this.runSolve();
  }

  /* ── 参照 ─────────────────────────────────────────── */

  get area(): Area {
    return this.save.areas[this.save.cur] ?? this.save.areas[0]!;
  }
  get region(): string {
    return this.area.region;
  }
  areasOfRegion(region: string): { area: Area; index: number }[] {
    return this.save.areas.map((area, index) => ({ area, index })).filter((x) => x.area.region === region);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  /* ── 計算 ─────────────────────────────────────────── */

  private runSolve(): SolveResult {
    const res = solve({
      ds: this.ds,
      board: this.board,
      areas: this.save.areas,
      cur: this.save.cur,
      basePower: this.save.meta.basePower,
      genRec: this.save.meta.genRec ?? null,
      field: this.area.field,
      area: this.area,
    });
    // 構造の点検はソルバーとは別立て。先頭に並べる
    try {
      res.diag = inspectBoard(this.ds, this.board).concat(res.diag);
    } catch {
      /* 点検で落ちても計算結果は返す */
    }
    // 純増を控えておく。同じ地域の他エリアを計算するときの倉庫の入りになる
    this.area.net = res.net;
    return res;
  }

  /** 盤面や数値を変えたあとに呼ぶ。索引→ソルバー→再描画 */
  recompute(opts: { reindex?: boolean } = {}): void {
    if (opts.reindex) this.ds = buildDataset(this.save, this.cfg);
    syncArea(this.area, this.board);
    this.res = this.runSolve();
    this.emit();
    this.queueSave();
  }

  /* ── 変更（取り消し可能） ──────────────────────────── */

  /**
   * 状態を変える操作は必ずここを通す。
   * 直前の状態を控えてから fn を実行するので、そのまま取り消せる。
   */
  edit(fn: () => void, opts: { reindex?: boolean } = {}): void {
    this.pushUndo();
    fn();
    this.dirty = true;
    this.recompute(opts);
  }

  private pushUndo(): void {
    this.undoStack.push(this.serialize());
    if (this.undoStack.length > HISTORY_MAX) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  private serialize(): string {
    syncArea(this.area, this.board);
    return JSON.stringify({ save: this.save, cur: this.save.cur, pipeCap: this.cfg.pipeCap });
  }

  private restore(json: string): void {
    const o = JSON.parse(json) as { save: Save; cur: number; pipeCap: number };
    this.save = o.save;
    this.save.cur = o.cur;
    this.cfg = { pipeCap: o.pipeCap };
    this.ds = buildDataset(this.save, this.cfg);
    this.board = boardOfArea(this.area);
    this.ui.sel = null;
    this.ui.beltFrom = null;
    this.res = this.runSolve();
    this.dirty = true;
    this.emit();
    this.queueSave();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(this.serialize());
    this.restore(prev);
    return true;
  }
  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.serialize());
    this.restore(next);
    return true;
  }

  /* ── エリア切り替え ────────────────────────────────── */

  openArea(index: number): void {
    const i = Math.max(0, Math.min(this.save.areas.length - 1, index | 0));
    if (i === this.save.cur) return;
    syncArea(this.area, this.board); // いま開いているエリアを畳む
    this.save.cur = i;
    this.board = boardOfArea(this.area);
    if (this.area.basePower != null) this.save.meta.basePower = this.area.basePower;
    this.save.meta.goal = this.area.goal ?? null;
    this.ui.sel = null;
    this.ui.beltFrom = null;
    this.res = this.runSolve();
    this.emit();
  }

  /** その地域の最初のエリアを開く */
  openRegion(region: string): void {
    const first = this.save.areas.findIndex((a) => a.region === region);
    if (first >= 0) this.openArea(first);
  }

  /* ── 保存・読込 ────────────────────────────────────── */

  toJSON(): string {
    syncArea(this.area, this.board);
    // 基礎電力と検証目標はエリアごとに控える
    this.area.basePower = this.save.meta.basePower;
    this.area.goal = this.save.meta.goal ?? null;
    return dumpSave(this.save, this.cfg);
  }

  /** JSON を取り込む。読めなければ例外を投げる */
  fromJSON(json: string): { repaired: number; lost: number } {
    const r = loadSave(json);
    this.pushUndo();
    this.save = r.save;
    this.cfg = r.cfg;
    this.ds = buildDataset(this.save, this.cfg);
    this.board = boardOfArea(this.area);
    if (this.area.basePower != null) this.save.meta.basePower = this.area.basePower;
    this.save.meta.goal = this.area.goal ?? null;
    this.ui.sel = null;
    this.ui.beltFrom = null;
    this.res = this.runSolve();
    this.dirty = false;
    this.emit();
    this.queueSave();
    return { repaired: r.repaired, lost: r.lost };
  }

  reset(): void {
    this.pushUndo();
    this.save = seed();
    this.cfg = defaultConfig();
    this.ds = buildDataset(this.save, this.cfg);
    this.board = boardOfArea(this.area);
    this.ui.sel = null;
    this.res = this.runSolve();
    this.dirty = false;
    this.emit();
    this.queueSave();
  }

  /** 入力のたびに書くと重いので、少し待ってからまとめて書く */
  private queueSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        localStorage.setItem(STORAGE_KEY, this.toJSON());
        this.dirty = false;
        this.emit();
      } catch {
        /* 容量超過などは黙って諦める。ファイル書き出しがある */
      }
    }, 900);
  }

  /** 前回の続きを読む。無ければ false */
  restoreFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      this.fromJSON(raw);
      this.undoStack.length = 0;
      this.redoStack.length = 0;
      return true;
    } catch {
      return false;
    }
  }
}
