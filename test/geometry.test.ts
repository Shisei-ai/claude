/**
 * §6-2 の単体テスト（幾何）。
 * ポートの割り当てと回転は、保存済みのベルトが指すポート番号の意味そのものなので、
 * 参照実装と1つでもずれると既存ファイルの配線が壊れる。
 */

import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { allocSide, buildDataset, computePorts, sideLen } from '../src/domain/dataset';
import { boardOf, canPlace, cellsOf, createBoard, footprint, freePorts, portFaces, portGeom, portUsed } from '../src/domain/geometry';
import type { Facility, Node, Rot } from '../src/domain/types';
import { loadReference } from './helpers/reference';

const data = seed();
const ds = buildDataset(data);
const node = (fac: string, x: number, y: number, rot: Rot = 0, extra: Partial<Node> = {}): Node => ({
  uid: 'n' + fac + x + '_' + y,
  fac,
  x,
  y,
  rot,
  ...extra,
});

describe('footprint と占有マス', () => {
  it('90°/270° で幅と奥行きが入れ替わる', () => {
    const f: Facility = { id: 'rect', name: '長方形', kind: 'process', w: 4, h: 2, power: 0, gen: 0 };
    const ds2 = buildDataset({ ...data, facs: [...data.facs, f] });
    expect(footprint(ds2, { fac: 'rect', rot: 0 })).toEqual({ w: 4, h: 2 });
    expect(footprint(ds2, { fac: 'rect', rot: 1 })).toEqual({ w: 2, h: 4 });
    expect(footprint(ds2, { fac: 'rect', rot: 3 })).toEqual({ w: 2, h: 4 });
  });

  it('180° は幅と奥行きが変わらない（参照実装のバグを直した箇所）', () => {
    // 参照実装は `n.rot ? swap : keep` と書いていて rot=2 でも入れ替えていた。
    // portGeom 側は rot=2 を「w×h のまま反転」として計算するので両者が食い違う。
    // 初期データは全て正方形なので表に出ないが、非正方形を作ると口が範囲外へ出る。
    const f: Facility = { id: 'rect', name: '長方形', kind: 'process', w: 4, h: 2, power: 0, gen: 0 };
    const ds2 = buildDataset({ ...data, facs: [...data.facs, f] });
    expect(footprint(ds2, { fac: 'rect', rot: 2 })).toEqual({ w: 4, h: 2 });

    // 直した結果、どの向きでも全ての口が占有範囲の内側に収まる
    for (const rot of [0, 1, 2, 3] as Rot[]) {
      const n = node('rect', 5, 5, rot);
      const cells = new Set(cellsOf(ds2, n).map((c) => c.x + ',' + c.y));
      const ports = ds2.ports('rect');
      for (let i = 0; i < ports.length; i++) {
        const g = portGeom(ds2, n, i)!;
        expect(cells, `rot=${rot} port#${i}`).toContain(g.inside.x + ',' + g.inside.y);
      }
    }
  });

  it('未知の設備は 1×1 として扱う', () => {
    expect(footprint(ds, { fac: 'nope', rot: 0 })).toEqual({ w: 1, h: 1 });
  });

  it('canPlace は盤外と重なりを弾く', () => {
    const board = createBoard(20, 12);
    board.nodes.push(node('smelt', 5, 5));
    expect(canPlace(ds, board, node('smelt', 8, 5))).toBe(true);
    expect(canPlace(ds, board, node('smelt', 6, 6))).toBe(false); // 重なる
    expect(canPlace(ds, board, node('smelt', -1, 5))).toBe(false); // 盤外
    expect(canPlace(ds, board, node('smelt', 19, 5))).toBe(false); // はみ出す
    expect(canPlace(ds, board, node('tenyu', 17, 9))).toBe(false); // 4×4 が入らない
  });

  it('canPlace は自分自身を無視できる（移動・回転の判定用）', () => {
    const board = createBoard(20, 12);
    const n = node('smelt', 5, 5);
    board.nodes.push(n);
    expect(canPlace(ds, board, { ...n, x: 6 })).toBe(false);
    expect(canPlace(ds, board, { ...n, x: 6 }, n.uid)).toBe(true);
  });
});

describe('ポートの割り当て', () => {
  it('辺の長さは 上下＝幅 / 左右＝奥行き', () => {
    const f = { w: 4, h: 2 };
    expect(sideLen(f, 0)).toBe(4);
    expect(sideLen(f, 2)).toBe(4);
    expect(sideLen(f, 1)).toBe(2);
    expect(sideLen(f, 3)).toBe(2);
  });

  it('辺を使い切ったら時計回りに次の辺へ回る', () => {
    const f = { w: 2, h: 2 };
    // 東（s=1）から6個。東2つ→南2つ→西2つ
    expect(allocSide(f, 1, 6, new Set())).toEqual([
      { s: 1, o: 0 },
      { s: 1, o: 1 },
      { s: 2, o: 0 },
      { s: 2, o: 1 },
      { s: 3, o: 0 },
      { s: 3, o: 1 },
    ]);
  });

  it('搬出口と搬入口は同じマスに重ならない', () => {
    const f: Facility = { id: 't', name: 't', kind: 'process', w: 1, h: 1, power: 0, gen: 0, nIn: 2, nOut: 2 };
    const ports = computePorts(f);
    expect(ports).toHaveLength(4);
    expect(new Set(ports.map((p) => p.s + ':' + p.o)).size).toBe(4);
    // 搬出口が先、搬入口が後（ポート番号の意味は保存ファイルと直結する）
    expect(ports.map((p) => p.t)).toEqual(['out', 'out', 'in', 'in']);
  });

  it('初期データの設備のポートが参照実装と一致する', () => {
    const ref = loadReference();
    ref.setup([], [], 40, 40);
    for (const f of data.facs) {
      expect(ds.ports(f.id), f.name).toEqual(ref.portsOf(f.id));
    }
  });
});

describe('ポートの幾何（回転すると口も回る）', () => {
  const ref = loadReference();

  it('初期データの全設備・全向きで inside/adj/dir が参照実装と一致する', () => {
    for (const f of data.facs) {
      for (const rot of [0, 1, 2, 3] as Rot[]) {
        const n = node(f.id, 6, 6, rot);
        ref.setup([n], [], 40, 40);
        const ports = ds.ports(f.id);
        for (let i = 0; i < ports.length; i++) {
          expect(portGeom(ds, n, i), `${f.name} rot=${rot} port#${i}`).toEqual(ref.portGeom(n, i));
        }
      }
    }
  });

  it('搬出口は右、搬入口は左が既定（rot=0 の精錬炉）', () => {
    const n = node('smelt', 3, 3);
    expect(portGeom(ds, n, 0)).toMatchObject({ t: 'out', inside: { x: 4, y: 3 }, adj: { x: 5, y: 3 }, dir: 1 });
    expect(portGeom(ds, n, 2)).toMatchObject({ t: 'in', inside: { x: 3, y: 3 }, adj: { x: 2, y: 3 }, dir: 3 });
  });

  it('90°回すと搬出口は下を向く', () => {
    const n = node('smelt', 3, 3, 1);
    expect(portGeom(ds, n, 0)).toMatchObject({ t: 'out', dir: 2 });
  });

  it('存在しないポート番号は null', () => {
    expect(portGeom(ds, node('smelt', 1, 1), 99)).toBeNull();
    expect(portGeom(ds, node('nope', 1, 1), 0)).toBeNull();
  });
});

describe('口の使用状況', () => {
  it('1つの口に繋げるラインは1本まで', () => {
    const a = node('wh_out', 2, 2, 0, { item: 'ore_gen' });
    const z = node('smelt', 5, 2, 0, { rec: 'r_shell' });
    const board = boardOf(20, 12, [a, z], []);
    expect(freePorts(ds, board, a, 'out')).toHaveLength(1);
    board.belts.push({ uid: 'b1', from: a.uid, fromPort: 0, to: z.uid, toPort: 2, cells: [], item: 'ore_gen' });
    expect(portUsed(board, a.uid, 0)).toBe(true);
    expect(freePorts(ds, board, a, 'out')).toHaveLength(0);
    expect(freePorts(ds, board, z, 'in')).toHaveLength(1); // 精錬炉は搬入口2つ
  });

  it('口の正面マスが列挙できる', () => {
    const a = node('wh_out', 2, 2, 0, { item: 'ore_gen' });
    const board = boardOf(20, 12, [a], []);
    expect([...portFaces(ds, board)]).toEqual(['3,2']);
  });
});
