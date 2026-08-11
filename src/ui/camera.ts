/** 盤面と画面の座標変換。ここも状態は camera だけで完結させる */

export interface Camera {
  x: number;
  y: number;
  z: number;
}

/** 1マスの基準ピクセル */
export const CELL = 26;
export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 3;

export const createCamera = (): Camera => ({ x: 0, y: 0, z: 1 });

export const screenToWorld = (cam: Camera, sx: number, sy: number): { x: number; y: number } => ({
  x: (sx - cam.x) / (CELL * cam.z),
  y: (sy - cam.y) / (CELL * cam.z),
});

export const worldToScreen = (cam: Camera, wx: number, wy: number): { x: number; y: number } => ({
  x: wx * CELL * cam.z + cam.x,
  y: wy * CELL * cam.z + cam.y,
});

/** 盤面全体が入るように合わせる */
export function fit(cam: Camera, viewW: number, viewH: number, boardW: number, boardH: number): void {
  cam.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(viewW / (boardW * CELL), viewH / (boardH * CELL)) * 0.95));
  cam.x = (viewW - boardW * CELL * cam.z) / 2;
  cam.y = (viewH - boardH * CELL * cam.z) / 2;
}

/** カーソル位置を固定したまま拡大縮小する */
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): void {
  const before = screenToWorld(cam, sx, sy);
  cam.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.z * factor));
  const after = screenToWorld(cam, sx, sy);
  cam.x += (after.x - before.x) * CELL * cam.z;
  cam.y += (after.y - before.y) * CELL * cam.z;
}

/** 指定のマスを画面中央へ（診断からのジャンプに使う） */
export function centerOn(cam: Camera, viewW: number, viewH: number, wx: number, wy: number): void {
  cam.z = Math.max(cam.z, 0.9);
  cam.x = viewW / 2 - wx * CELL * cam.z;
  cam.y = viewH / 2 - wy * CELL * cam.z;
}
