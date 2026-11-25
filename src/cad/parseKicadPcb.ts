import { Point2D, polygonSignedArea, rotatePt } from './math';
import {
  atomNum,
  atomStr,
  findChild,
  findChildren,
  isSexprList,
  parseSexpr,
  SexprList,
} from './sexpr';

export interface ParsedPad {
  num: string;
  type: string;
  shape: string;
  px: number;
  py: number;
  ang: number;
  w: number;
  h: number;
  drill: number;
  drillY?: number;
  netId: number;
  netName: string;
}

export interface ParsedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: string;
  width: number;
}

export interface ParsedFootprint {
  lib: string;
  ref: string;
  value: string;
  x: number;
  y: number;
  rot: number;
  layer: string;
  pads: ParsedPad[];
  silkLines: ParsedLine[];
  crtydLines: ParsedLine[];
  bbox: [number, number, number, number];
}

export interface ParsedSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  layer: 'F.Cu' | 'B.Cu' | string;
  netId: number;
  netName: string;
}

export interface ParsedVia {
  x: number;
  y: number;
  size: number;
  drill: number;
  netId: number;
  netName: string;
}

export interface ParsedZone {
  netName: string;
  layer: string;
  polygon: Point2D[];
}

export interface ParsedKicadPcb {
  netNames: Record<number, string>;
  footprints: ParsedFootprint[];
  segments: ParsedSegment[];
  vias: ParsedVia[];
  outerPolygon: Point2D[];
  cutouts: Point2D[][];
  zones: ParsedZone[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function chainEdgeSegments(rawSegs: Array<[Point2D, Point2D]>, tol = 0.08): Point2D[][] {
  if (rawSegs.length === 0) return [];
  const unused = rawSegs.map((seg) => ({ a: seg[0], b: seg[1], used: false }));
  const loops: Point2D[][] = [];

  for (let i = 0; i < unused.length; i += 1) {
    if (unused[i].used) continue;
    unused[i].used = true;
    const poly: Point2D[] = [unused[i].a, unused[i].b];

    let extended = true;
    while (extended) {
      extended = false;
      const tail = poly[poly.length - 1];
      const head = poly[0];
      if (poly.length >= 3 && dist(tail, head) <= tol) {
        break;
      }
      for (let j = 0; j < unused.length; j += 1) {
        if (unused[j].used) continue;
        if (dist(tail, unused[j].a) <= tol) {
          unused[j].used = true;
          poly.push(unused[j].b);
          extended = true;
          break;
        }
        if (dist(tail, unused[j].b) <= tol) {
          unused[j].used = true;
          poly.push(unused[j].a);
          extended = true;
          break;
        }
      }
    }

    if (poly.length >= 3) {
      if (dist(poly[poly.length - 1], poly[0]) <= tol) {
        poly.pop();
      }
      if (poly.length >= 3) {
        loops.push(poly);
      }
    }
  }

  return loops;
}

function parseXy(node: SexprList | undefined): Point2D | null {
  if (!node) return null;
  const x = atomNum(node[1]);
  const y = atomNum(node[2]);
  if (x === undefined || y === undefined) return null;
  return [x, y];
}

function parseFootprint(fpNode: SexprList, netNames: Record<number, string>): ParsedFootprint {
  const lib = atomStr(fpNode[1]) ?? '';
  const atNode = findChild(fpNode, 'at');
  const x = atomNum(atNode?.[1]) ?? 0;
  const y = atomNum(atNode?.[2]) ?? 0;
  const rot = atomNum(atNode?.[3]) ?? 0;
  const layerNode = findChild(fpNode, 'layer');
  const layer = atomStr(layerNode?.[1]) ?? 'F.Cu';

  let ref = '';
  let value = '';

  for (const prop of findChildren(fpNode, 'property')) {
    const key = atomStr(prop[1]);
    const val = atomStr(prop[2]) ?? '';
    if (key === 'Reference') ref = val;
    if (key === 'Value') value = val;
  }
  for (const fpText of findChildren(fpNode, 'fp_text')) {
    const kind = atomStr(fpText[1]);
    const val = atomStr(fpText[2]) ?? '';
    if (kind === 'reference' && !ref) ref = val;
    if (kind === 'value' && !value) value = val;
  }

  const pads: ParsedPad[] = [];
  for (const padNode of findChildren(fpNode, 'pad')) {
    const num = atomStr(padNode[1]) ?? '';
    const type = atomStr(padNode[2]) ?? 'smd';
    const shape = atomStr(padNode[3]) ?? 'rect';
    const padAt = findChild(padNode, 'at');
    const px = atomNum(padAt?.[1]) ?? 0;
    const py = atomNum(padAt?.[2]) ?? 0;
    const ang = atomNum(padAt?.[3]) ?? rot;
    const sizeNode = findChild(padNode, 'size');
    const w = atomNum(sizeNode?.[1]) ?? 0.6;
    const h = atomNum(sizeNode?.[2]) ?? w;
    const drillNode = findChild(padNode, 'drill');
    let drill = 0;
    let drillY: number | undefined;
    if (drillNode) {
      // handle both (drill 0.8) and (drill oval 0.8 1.2)
      const first = atomNum(drillNode[1]);
      if (first !== undefined) {
        drill = first;
        drillY = atomNum(drillNode[2]);
      } else {
        drill = atomNum(drillNode[2]) ?? 0;
        drillY = atomNum(drillNode[3]);
      }
    }
    const netNode = findChild(padNode, 'net');
    const netId = atomNum(netNode?.[1]) ?? 0;
    const netName = atomStr(netNode?.[2]) ?? netNames[netId] ?? '';

    pads.push({
      num,
      type,
      shape,
      px,
      py,
      ang,
      w,
      h,
      drill,
      drillY,
      netId,
      netName,
    });
  }

  const silkLines: ParsedLine[] = [];
  const crtydLines: ParsedLine[] = [];

  const pushGraphicLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    gLayer: string,
    width: number,
  ) => {
    const item: ParsedLine = { x1, y1, x2, y2, layer: gLayer, width };
    if (gLayer.includes('CrtYd')) {
      crtydLines.push(item);
    } else if (gLayer.includes('Silk')) {
      silkLines.push(item);
    }
  };

  for (const lineNode of findChildren(fpNode, 'fp_line')) {
    const s = parseXy(findChild(lineNode, 'start'));
    const e = parseXy(findChild(lineNode, 'end'));
    if (!s || !e) continue;
    const gLayer = atomStr(findChild(lineNode, 'layer')?.[1]) ?? '';
    const stroke = findChild(lineNode, 'stroke');
    const width = atomNum(findChild(stroke ?? [], 'width')?.[1]) ?? atomNum(findChild(lineNode, 'width')?.[1]) ?? 0.12;
    pushGraphicLine(s[0], s[1], e[0], e[1], gLayer, width);
  }

  for (const rectNode of findChildren(fpNode, 'fp_rect')) {
    const s = parseXy(findChild(rectNode, 'start'));
    const e = parseXy(findChild(rectNode, 'end'));
    if (!s || !e) continue;
    const gLayer = atomStr(findChild(rectNode, 'layer')?.[1]) ?? '';
    const stroke = findChild(rectNode, 'stroke');
    const width = atomNum(findChild(stroke ?? [], 'width')?.[1]) ?? atomNum(findChild(rectNode, 'width')?.[1]) ?? 0.12;
    pushGraphicLine(s[0], s[1], e[0], s[1], gLayer, width);
    pushGraphicLine(e[0], s[1], e[0], e[1], gLayer, width);
    pushGraphicLine(e[0], e[1], s[0], e[1], gLayer, width);
    pushGraphicLine(s[0], e[1], s[0], s[1], gLayer, width);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (crtydLines.length > 0) {
    for (const l of crtydLines) {
      minX = Math.min(minX, l.x1, l.x2);
      minY = Math.min(minY, l.y1, l.y2);
      maxX = Math.max(maxX, l.x1, l.x2);
      maxY = Math.max(maxY, l.y1, l.y2);
    }
  } else if (pads.length > 0) {
    for (const pd of pads) {
      const relDeg = pd.ang - rot;
      const [rw, rh] = rotatePt(pd.w / 2, pd.h / 2, relDeg);
      const [rw2, rh2] = rotatePt(-pd.w / 2, pd.h / 2, relDeg);
      const halfX = Math.max(Math.abs(rw), Math.abs(rw2));
      const halfY = Math.max(Math.abs(rh), Math.abs(rh2));
      minX = Math.min(minX, pd.px - halfX);
      minY = Math.min(minY, pd.py - halfY);
      maxX = Math.max(maxX, pd.px + halfX);
      maxY = Math.max(maxY, pd.py + halfY);
    }
    minX -= 0.3;
    minY -= 0.3;
    maxX += 0.3;
    maxY += 0.3;
  } else {
    minX = -1.2;
    minY = -1.2;
    maxX = 1.2;
    maxY = 1.2;
  }

  return {
    lib,
    ref: ref || 'REF?',
    value,
    x,
    y,
    rot,
    layer,
    pads,
    silkLines,
    crtydLines,
    bbox: [minX, minY, maxX, maxY],
  };
}

export function parseKicadPcb(rawText: string): ParsedKicadPcb {
  const ast = parseSexpr(rawText);
  const root =
    ast.find((n) => isSexprList(n) && n[0] === 'kicad_pcb') as SexprList | undefined;
  const boardNode: SexprList = root ?? ast;

  const netNames: Record<number, string> = {};
  for (const netNode of findChildren(boardNode, 'net')) {
    const id = atomNum(netNode[1]);
    const name = atomStr(netNode[2]) ?? '';
    if (id !== undefined) {
      netNames[id] = name;
    }
  }

  const footprints: ParsedFootprint[] = [];
  for (const fpNode of findChildren(boardNode, 'footprint')) {
    footprints.push(parseFootprint(fpNode, netNames));
  }

  const segments: ParsedSegment[] = [];
  for (const segNode of findChildren(boardNode, 'segment')) {
    const s = parseXy(findChild(segNode, 'start'));
    const e = parseXy(findChild(segNode, 'end'));
    if (!s || !e) continue;
    const width = atomNum(findChild(segNode, 'width')?.[1]) ?? 0.25;
    const layer = atomStr(findChild(segNode, 'layer')?.[1]) ?? 'F.Cu';
    const netId = atomNum(findChild(segNode, 'net')?.[1]) ?? 0;
    segments.push({
      x1: s[0],
      y1: s[1],
      x2: e[0],
      y2: e[1],
      width,
      layer,
      netId,
      netName: netNames[netId] ?? '',
    });
  }

  const vias: ParsedVia[] = [];
  for (const viaNode of findChildren(boardNode, 'via')) {
    const at = parseXy(findChild(viaNode, 'at'));
    if (!at) continue;
    const size = atomNum(findChild(viaNode, 'size')?.[1]) ?? 0.6;
    const drill = atomNum(findChild(viaNode, 'drill')?.[1]) ?? 0.3;
    const netId = atomNum(findChild(viaNode, 'net')?.[1]) ?? 0;
    vias.push({
      x: at[0],
      y: at[1],
      size,
      drill,
      netId,
      netName: netNames[netId] ?? '',
    });
  }

  const edgeSegments: Array<[Point2D, Point2D]> = [];
  const polyLoops: Point2D[][] = [];

  for (const grLine of findChildren(boardNode, 'gr_line')) {
    const layer = atomStr(findChild(grLine, 'layer')?.[1]) ?? '';
    if (layer !== 'Edge.Cuts') continue;
    const s = parseXy(findChild(grLine, 'start'));
    const e = parseXy(findChild(grLine, 'end'));
    if (s && e) edgeSegments.push([s, e]);
  }

  for (const grRect of findChildren(boardNode, 'gr_rect')) {
    const layer = atomStr(findChild(grRect, 'layer')?.[1]) ?? '';
    if (layer !== 'Edge.Cuts') continue;
    const s = parseXy(findChild(grRect, 'start'));
    const e = parseXy(findChild(grRect, 'end'));
    if (s && e) {
      polyLoops.push([
        [s[0], s[1]],
        [e[0], s[1]],
        [e[0], e[1]],
        [s[0], e[1]],
      ]);
    }
  }

  for (const grPoly of findChildren(boardNode, 'gr_poly')) {
    const layer = atomStr(findChild(grPoly, 'layer')?.[1]) ?? '';
    if (layer !== 'Edge.Cuts') continue;
    const ptsNode = findChild(grPoly, 'pts');
    if (!ptsNode) continue;
    const pts = findChildren(ptsNode, 'xy')
      .map(parseXy)
      .filter((p): p is Point2D => p !== null);
    if (pts.length >= 3) polyLoops.push(pts);
  }

  for (const grArc of findChildren(boardNode, 'gr_arc')) {
    const layer = atomStr(findChild(grArc, 'layer')?.[1]) ?? '';
    if (layer !== 'Edge.Cuts') continue;
    const s = parseXy(findChild(grArc, 'start'));
    const m = parseXy(findChild(grArc, 'mid'));
    const e = parseXy(findChild(grArc, 'end'));
    if (s && m && e) {
      edgeSegments.push([s, m], [m, e]);
    } else if (s && e) {
      edgeSegments.push([s, e]);
    }
  }

  const chained = chainEdgeSegments(edgeSegments, 0.08);
  const allLoops = [...polyLoops, ...chained];

  let outerPolygon: Point2D[] = [];
  const cutouts: Point2D[][] = [];

  if (allLoops.length > 0) {
    const sorted = [...allLoops].sort(
      (a, b) => Math.abs(polygonSignedArea(b)) - Math.abs(polygonSignedArea(a)),
    );
    outerPolygon = sorted[0];
    for (let i = 1; i < sorted.length; i += 1) {
      cutouts.push(sorted[i]);
    }
  }

  const zones: ParsedZone[] = [];
  for (const zoneNode of findChildren(boardNode, 'zone')) {
    const netName = atomStr(findChild(zoneNode, 'net_name')?.[1]) ?? '';
    const layer = atomStr(findChild(zoneNode, 'layer')?.[1]) ?? 'F.Cu';
    const polyNode = findChild(zoneNode, 'polygon');
    const ptsNode = polyNode ? findChild(polyNode, 'pts') : undefined;
    if (!ptsNode) continue;
    const pts = findChildren(ptsNode, 'xy')
      .map(parseXy)
      .filter((p): p is Point2D => p !== null);
    if (pts.length >= 3) {
      zones.push({ netName, layer, polygon: pts });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const includePt = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const p of outerPolygon) includePt(p[0], p[1]);
  if (!Number.isFinite(minX)) {
    for (const fp of footprints) includePt(fp.x, fp.y);
    for (const seg of segments) {
      includePt(seg.x1, seg.y1);
      includePt(seg.x2, seg.y2);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 40;
      maxY = 30;
    } else {
      minX -= 4;
      minY -= 4;
      maxX += 4;
      maxY += 4;
    }
    outerPolygon = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];
  }

  return {
    netNames,
    footprints,
    segments,
    vias,
    outerPolygon,
    cutouts,
    zones,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    },
  };
}
