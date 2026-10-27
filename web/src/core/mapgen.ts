// ノードマップ生成 — Unity版 Roguelike/Map/NodeMap.cs の移植
// 15行 × 最大7列。全経路がボスに到達するようエッジを保証する。
import type { MapData, MapNode, NodeType } from './types';
import { Rng } from './rng';

export const MAP_ROWS = 15;
export const MAP_COLUMNS = 7;

// 行ごとの出現ノード種別テーブル (NodeMapGenerator.RowAllowedTypes)
const ROW_ALLOWED_TYPES: NodeType[][] = [
  ['Battle'],                                                        // 0: 開始
  ['Battle', 'Battle', 'Battle', 'RandomEvent', 'Treasure'],         // 1
  ['Battle', 'Battle', 'RandomEvent', 'Treasure'],                   // 2
  ['Battle', 'Battle', 'Battle', 'Shop', 'RandomEvent'],             // 3
  ['RestSite'],                                                      // 4: 焚き火固定
  ['Battle', 'EliteBattle', 'RandomEvent', 'Shop'],                  // 5
  ['Battle', 'EliteBattle', 'CursedRoom', 'Treasure'],               // 6
  ['EliteBattle', 'Battle', 'RandomEvent', 'Shop'],                  // 7
  ['RestSite'],                                                      // 8: 焚き火固定
  ['EliteBattle', 'Battle', 'CursedRoom', 'Shop'],                   // 9
  ['EliteBattle', 'EliteBattle', 'RandomEvent', 'Treasure'],         // 10
  ['EliteBattle', 'CursedRoom', 'Battle', 'Shop'],                   // 11
  ['EliteBattle', 'Battle', 'RandomEvent'],                          // 12
  ['Shop'],                                                          // 13: ボス前ショップ固定
  ['Boss'],                                                          // 14: ボス
];

function isFixedRow(row: number): boolean {
  return row === 4 || row === 8 || row === 13 || row === 14;
}

function pickNodeType(row: number, rng: Rng, floorIndex: number): NodeType {
  if (row >= ROW_ALLOWED_TYPES.length) return 'Battle';
  let pool = ROW_ALLOWED_TYPES[row];

  // 後半フロア: 難ノード寄りに確率シフト
  if (floorIndex >= 2 && pool.includes('Battle')) {
    const hard = pool.filter((t) => t !== 'Battle');
    if (hard.length > 0 && rng.next() < 0.4) pool = hard;
  }

  return pool[rng.int(pool.length)];
}

export function generateMap(seed: number, floorIndex: number): MapData {
  const rng = new Rng(seed + floorIndex * 9999);
  const nodes: MapNode[] = [];

  // 1. 行ごとの「生きている」列を決める (固定行は中央のみ / 他は4-7列)
  const liveColumns: number[][] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    if (isFixedRow(row)) {
      liveColumns.push([3]);
    } else {
      const count = rng.range(4, MAP_COLUMNS + 1);
      const cols = rng
        .shuffle([...Array(MAP_COLUMNS).keys()])
        .slice(0, count)
        .sort((a, b) => a - b);
      liveColumns.push(cols);
    }
  }

  // 2. ノード生成
  for (let row = 0; row < MAP_ROWS; row++) {
    for (const col of liveColumns[row]) {
      const id = row * 100 + col;
      nodes.push({
        id,
        row,
        column: col,
        type: pickNodeType(row, rng, floorIndex),
        visited: false,
        nextIDs: [],
        contentSeed: seed + id * 137 + floorIndex * 9973,
      });
    }
  }

  const getRow = (r: number) => nodes.filter((n) => n.row === r);

  // 3. エッジ接続 (近い列を優先 / 全 to ノードの到達保証)
  for (let row = 0; row < MAP_ROWS - 1; row++) {
    const fromNodes = getRow(row);
    const toNodes = getRow(row + 1);
    const unconnected = new Set(toNodes.map((n) => n.id));

    for (const from of fromNodes) {
      const candidates = [...toNodes]
        .sort((a, b) => Math.abs(a.column - from.column) - Math.abs(b.column - from.column))
        .slice(0, rng.range(1, 3));
      for (const to of candidates) {
        if (!from.nextIDs.includes(to.id)) from.nextIDs.push(to.id);
        unconnected.delete(to.id);
      }
    }

    for (const unconnID of unconnected) {
      const target = toNodes.find((n) => n.id === unconnID)!;
      const closest = [...fromNodes].sort(
        (a, b) => Math.abs(a.column - target.column) - Math.abs(b.column - target.column),
      )[0];
      if (!closest.nextIDs.includes(target.id)) closest.nextIDs.push(target.id);
    }
  }

  return { floorIndex, seed, nodes };
}

export function getNode(map: MapData, id: number): MapNode | undefined {
  return map.nodes.find((n) => n.id === id);
}

export function getStartNodes(map: MapData): MapNode[] {
  return map.nodes.filter((n) => n.row === 0);
}

/** 現在ノードから進める次ノード群 */
export function getAvailableNodes(map: MapData, currentNodeId: number): MapNode[] {
  if (currentNodeId < 0) return getStartNodes(map);
  const cur = getNode(map, currentNodeId);
  if (!cur) return [];
  return cur.nextIDs
    .map((id) => getNode(map, id))
    .filter((n): n is MapNode => !!n);
}
