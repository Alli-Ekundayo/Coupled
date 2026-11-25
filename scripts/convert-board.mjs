#!/usr/bin/env node
/**
 * Converts the KiCad-exported VRML board (scripts/all.wrl) into a compact binary
 * the browser can load without parsing 10 MB of VRML text.
 *
 *   node scripts/convert-board.mjs [input.wrl] [outDir] [--board=N]
 *
 * Outputs (default: public/models):
 *   board.json  - layer metadata + component placements (millimetres)
 *   board.bin   - quantised vertex positions (uint16) + triangle indices
 *
 * The VRML is a panel holding several separate boards. Only ONE is exported: boards are
 * found as connected pieces of the substrate layer and ranked by area, --board=0 (default)
 * being the largest. Everything else (layers, vias, silkscreen, components) is cropped to it.
 *
 * Only the geometry actually embedded in the VRML (board stack-up) is exported.
 * Component footprints are `Inline` references to external files, so only their
 * placement (footprint name, position, rotation) is recorded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const positional = args.filter((a) => !a.startsWith('--'));
const input = positional[0] ?? path.join(here, 'all.wrl');
const outDir = positional[1] ?? path.join(here, '..', 'public', 'models');
const boardFlag = flags.find((f) => f.startsWith('--board='));
const boardRank = boardFlag ? Number(boardFlag.split('=')[1]) : 0;

/** KiCad VRML units: 0.1 inch, with a global 2.54 scale => millimetres. */
const UNIT_TO_MM = 2.54;

const text = fs.readFileSync(input, 'utf8');

const nums = (s) => s.split(/[\s,]+/).filter(Boolean).map(Number);

// ---------------------------------------------------------------- layers
const shapeRe =
  /Shape\s*\{[\s\S]*?diffuseColor ([\d.eE+\- ]+)[\s\S]*?point \[([\s\S]*?)\][\s\S]*?coordIndex \[([\s\S]*?)\]/g;

const rawLayers = [];
for (let m; (m = shapeRe.exec(text)); ) {
  const color = nums(m[1]);
  const points = nums(m[2]).map((v) => v * UNIT_TO_MM);
  const indexRaw = nums(m[3]);
  const indices = [];
  let face = [];
  for (const v of indexRaw) {
    if (v === -1) {
      for (let i = 1; i + 1 < face.length; i += 1) indices.push(face[0], face[i], face[i + 1]);
      face = [];
    } else face.push(v);
  }
  rawLayers.push({ color, points, indices });
}

// ---------------------------------------------------------------- pick one board
/** Connected pieces of a layer (union-find over triangle vertices) with their XY bounds. */
function connectedPieces(layer) {
  const count = layer.points.length / 3;
  const parent = Int32Array.from({ length: count }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let i = 0; i < layer.indices.length; i += 3) {
    const root = find(layer.indices[i]);
    parent[find(layer.indices[i + 1])] = root;
    parent[find(layer.indices[i + 2])] = root;
  }
  const pieces = new Map();
  for (let v = 0; v < count; v += 1) {
    const r = find(v);
    let piece = pieces.get(r);
    if (!piece) {
      piece = { vertices: 0, min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
      pieces.set(r, piece);
    }
    piece.vertices += 1;
    for (let k = 0; k < 2; k += 1) {
      piece.min[k] = Math.min(piece.min[k], layer.points[v * 3 + k]);
      piece.max[k] = Math.max(piece.max[k], layer.points[v * 3 + k]);
    }
  }
  return [...pieces.values()].filter((p) => p.vertices > 200);
}

/** Keeps only triangles whose centroid lies in the box, re-indexing the vertices. */
function cropLayer(layer, box) {
  const remap = new Map();
  const points = [];
  const indices = [];
  const inside = (a, b, c) => {
    const x = (layer.points[a * 3] + layer.points[b * 3] + layer.points[c * 3]) / 3;
    const y = (layer.points[a * 3 + 1] + layer.points[b * 3 + 1] + layer.points[c * 3 + 1]) / 3;
    return x >= box.min[0] && x <= box.max[0] && y >= box.min[1] && y <= box.max[1];
  };
  const take = (v) => {
    let n = remap.get(v);
    if (n === undefined) {
      n = points.length / 3;
      remap.set(v, n);
      points.push(layer.points[v * 3], layer.points[v * 3 + 1], layer.points[v * 3 + 2]);
    }
    return n;
  };
  for (let i = 0; i < layer.indices.length; i += 3) {
    const [a, b, c] = [layer.indices[i], layer.indices[i + 1], layer.indices[i + 2]];
    if (inside(a, b, c)) indices.push(take(a), take(b), take(c));
  }
  return { ...layer, points, indices };
}

// Classify by colour + z extent (KiCad exports a fixed stack order, but be defensive).
function classify(layer) {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 2; i < layer.points.length; i += 3) {
    zMin = Math.min(zMin, layer.points[i]);
    zMax = Math.max(zMax, layer.points[i]);
  }
  const [r, g, b] = layer.color;
  const silver = r > 0.6 && Math.abs(r - g) < 0.05;
  const white = r > 0.85 && g > 0.85 && b > 0.85;
  const spansBoard = zMax - zMin > 1;
  const top = (zMin + zMax) / 2 > 0;
  let name;
  if (white) name = top ? 'silk-top' : 'silk-bottom';
  else if (silver) name = spansBoard ? 'vias' : top ? 'copper-top' : 'copper-bottom';
  else if (spansBoard) name = 'substrate';
  else name = top ? 'mask-top' : 'mask-bottom';
  return { name, zMin, zMax };
}

const substrateFull = rawLayers.find((l) => classify(l).name === 'substrate');
const boards = connectedPieces(substrateFull).sort(
  (a, b) => (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) - (a.max[0] - a.min[0]) * (a.max[1] - a.min[1])
);
const chosen = boards[boardRank];
if (!chosen) throw new Error(`No board #${boardRank}; found ${boards.length} boards`);
console.log(
  `boards found: ${boards.length}; exporting #${boardRank} ` +
    `(${(chosen.max[0] - chosen.min[0]).toFixed(1)} x ${(chosen.max[1] - chosen.min[1]).toFixed(1)} mm)`
);
const MARGIN = 0.5;
const cropBox = {
  min: [chosen.min[0] - MARGIN, chosen.min[1] - MARGIN],
  max: [chosen.max[0] + MARGIN, chosen.max[1] + MARGIN],
};
for (let i = 0; i < rawLayers.length; i += 1) rawLayers[i] = cropLayer(rawLayers[i], cropBox);
// A layer that only existed on another board (e.g. its bottom silkscreen) ends up empty.
for (let i = rawLayers.length - 1; i >= 0; i -= 1) {
  if (rawLayers[i].points.length === 0) rawLayers.splice(i, 1);
}

// ---------------------------------------------------------------- bounds
let bMin = [Infinity, Infinity, Infinity];
let bMax = [-Infinity, -Infinity, -Infinity];
for (const l of rawLayers) {
  for (let i = 0; i < l.points.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      bMin[k] = Math.min(bMin[k], l.points[i + k]);
      bMax[k] = Math.max(bMax[k], l.points[i + k]);
    }
  }
}
// Board outline = the substrate layer (silk can overhang slightly)
const substrate = rawLayers.find((l) => classify(l).name === 'substrate');
let oMin = [Infinity, Infinity];
let oMax = [-Infinity, -Infinity];
for (let i = 0; i < substrate.points.length; i += 3) {
  for (let k = 0; k < 2; k += 1) {
    oMin[k] = Math.min(oMin[k], substrate.points[i + k]);
    oMax[k] = Math.max(oMax[k], substrate.points[i + k]);
  }
}
const center = [(oMin[0] + oMax[0]) / 2, (oMin[1] + oMax[1]) / 2, 0];

// ---------------------------------------------------------------- binary pack
const chunks = [];
let byteLength = 0;
const push = (typed) => {
  const pad = (4 - (byteLength % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    byteLength += pad;
  }
  const offset = byteLength;
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  chunks.push(buf);
  byteLength += buf.length;
  return offset;
};

const layers = rawLayers.map((layer) => {
  const info = classify(layer);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < layer.points.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const v = layer.points[i + k] - center[k];
      min[k] = Math.min(min[k], v);
      max[k] = Math.max(max[k], v);
    }
  }
  const vertexCount = layer.points.length / 3;
  const pos = new Uint16Array(layer.points.length);
  for (let i = 0; i < layer.points.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const range = max[k] - min[k];
      const v = layer.points[i + k] - center[k];
      pos[i + k] = range > 1e-9 ? Math.round(((v - min[k]) / range) * 65535) : 0;
    }
  }
  const wide = vertexCount > 65535;
  const idx = wide ? Uint32Array.from(layer.indices) : Uint16Array.from(layer.indices);
  return {
    name: info.name,
    color: layer.color.slice(0, 3),
    vertexCount,
    indexCount: idx.length,
    indexType: wide ? 'u32' : 'u16',
    min,
    max,
    positionOffset: push(pos),
    indexOffset: push(idx),
  };
});

// ---------------------------------------------------------------- components
const components = [];
const blockRe =
  /Transform\s*\{\s*(?:rotation\s+([-\d.eE+ ]+?)\s+)?translation\s+([-\d.eE+ ]+?)\s+scale\s+[-\d.eE+ ]+?\s+children\s*\[\s*Inline\s*\{\s*url\s+"(?:[^"]*\/)?([^"/]+)\.wrl"/g;
let parsedComponents = 0;
for (let m; (m = blockRe.exec(text)); ) {
  parsedComponents += 1;
  const rot = m[1] ? nums(m[1]) : [0, 0, 1, 0];
  const t = nums(m[2]).map((v) => v * UNIT_TO_MM);
  if (t[0] < cropBox.min[0] || t[0] > cropBox.max[0] || t[1] < cropBox.min[1] || t[1] > cropBox.max[1]) {
    continue;
  }
  components.push({
    footprint: m[3],
    position: [t[0] - center[0], t[1] - center[1], t[2]].map((v) => +v.toFixed(4)),
    rotation: rot.map((v) => +v.toFixed(5)),
  });
}

const inlineCount = (text.match(/Inline\s*\{/g) ?? []).length;
if (parsedComponents !== inlineCount) {
  console.warn(`warning: ${inlineCount} Inline nodes but parsed ${parsedComponents} components`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'board.bin'), Buffer.concat(chunks));
fs.writeFileSync(
  path.join(outDir, 'board.json'),
  JSON.stringify({
    units: 'mm',
    size: [oMax[0] - oMin[0], oMax[1] - oMin[1], bMax[2] - bMin[2]].map((v) => +v.toFixed(3)),
    byteLength,
    layers,
    components,
  })
);

console.log(`layers: ${layers.map((l) => l.name).join(', ')}`);
console.log(`components: ${components.length}`);
console.log(`board: ${(oMax[0] - oMin[0]).toFixed(1)} x ${(oMax[1] - oMin[1]).toFixed(1)} mm`);
console.log(`board.bin: ${(byteLength / 1024 / 1024).toFixed(2)} MB`);
