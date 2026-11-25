import { Camera2D } from '../store/useStudioStore';

export type Point2D = [number, number];

/**
 * Rotate local offset (px, py) by footprint rotation angle (deg, KiCad CCW in Y-down frame).
 */
export function rotatePt(px: number, py: number, rotDeg: number): Point2D {
  const rad = (rotDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [px * c + py * s, -px * s + py * c];
}

export function worldToScreen(
  wx: number,
  wy: number,
  cam: Camera2D,
  viewportW: number,
  viewportH: number,
): Point2D {
  return [
    (wx - cam.cx) * cam.scale + viewportW / 2,
    (wy - cam.cy) * cam.scale + viewportH / 2,
  ];
}

export function screenToWorld(
  sx: number,
  sy: number,
  cam: Camera2D,
  viewportW: number,
  viewportH: number,
): Point2D {
  return [
    (sx - viewportW / 2) / cam.scale + cam.cx,
    (sy - viewportH / 2) / cam.scale + cam.cy,
  ];
}

export interface HitTestableFootprint {
  x: number;
  y: number;
  rot: number;
  bbox: [number, number, number, number];
}

export function hitTestFootprint(
  fp: HitTestableFootprint,
  wx: number,
  wy: number,
  padding = 0.5,
): boolean {
  const [lx, ly] = rotatePt(wx - fp.x, wy - fp.y, -fp.rot);
  const [bx0, by0, bx1, by1] = fp.bbox;
  return (
    lx >= bx0 - padding &&
    lx <= bx1 + padding &&
    ly >= by0 - padding &&
    ly <= by1 + padding
  );
}

export function polygonSignedArea(pts: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}
