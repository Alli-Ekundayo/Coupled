import * as THREE from 'three';
import {
  ComponentKind,
  FALLBACK_FOOTPRINT,
  FOOTPRINTS,
  PartMaterial,
} from './footprints';

interface LayerMeta {
  name: string;
  color: [number, number, number];
  vertexCount: number;
  indexCount: number;
  indexType: 'u16' | 'u32';
  min: [number, number, number];
  max: [number, number, number];
  positionOffset: number;
  indexOffset: number;
}

interface PlacementMeta {
  footprint: string;
  position: [number, number, number];
  /** VRML axis-angle: [ax, ay, az, angle] */
  rotation: [number, number, number, number];
}

interface BoardMeta {
  size: [number, number, number];
  layers: LayerMeta[];
  components: PlacementMeta[];
}

export interface BoardModel {
  /** Board centred on the origin, lying in the XY plane (+Z = component side), scaled to world units. */
  root: THREE.Group;
  /** Board outline in world units: [width, height, thickness]. */
  size: THREE.Vector3;
  /** 0 = assembled, 1 = fully exploded. */
  setExplode: (amount: number) => void;
  dispose: () => void;
}

/** How far (mm) each stack-up layer travels along Z at explode = 1. */
const LAYER_LIFT: Record<string, number> = {
  substrate: 0,
  vias: 0,
  'mask-top': 10,
  'copper-top': 20,
  'silk-top': 30,
  'mask-bottom': -10,
  'copper-bottom': -20,
  'silk-bottom': -30,
};

/** How far (mm) component groups lift away from their side of the board at explode = 1. */
const COMPONENT_LIFT: Record<ComponentKind, number> = {
  passive: 44,
  ic: 56,
  connector: 70,
};

interface MaterialStyle {
  color: string;
  roughness: number;
  metalness: number;
  offset?: boolean;
}

const LAYER_STYLE: Record<string, MaterialStyle> = {
  substrate: { color: '#9a8f5c', roughness: 0.75, metalness: 0 },
  'mask-top': { color: '#1a5e3b', roughness: 0.42, metalness: 0.05 },
  'mask-bottom': { color: '#1a5e3b', roughness: 0.42, metalness: 0.05 },
  'copper-top': { color: '#d8d3c4', roughness: 0.28, metalness: 0.9, offset: true },
  'copper-bottom': { color: '#d8d3c4', roughness: 0.28, metalness: 0.9, offset: true },
  vias: { color: '#d8d3c4', roughness: 0.3, metalness: 0.9 },
  'silk-top': { color: '#efe7d3', roughness: 0.8, metalness: 0, offset: true },
  'silk-bottom': { color: '#efe7d3', roughness: 0.8, metalness: 0, offset: true },
};

const PART_STYLE: Record<PartMaterial, MaterialStyle> = {
  silver: { color: '#cfcfc9', roughness: 0.3, metalness: 0.9 },
  gold: { color: '#d9ad54', roughness: 0.28, metalness: 0.95 },
  ceramic: { color: '#b49b6e', roughness: 0.6, metalness: 0.05 },
  resistor: { color: '#262421', roughness: 0.55, metalness: 0.05 },
  tantalum: { color: '#d3a43c', roughness: 0.5, metalness: 0.05 },
  ic: { color: '#1c1c1d', roughness: 0.5, metalness: 0.1 },
  plastic: { color: '#171717', roughness: 0.55, metalness: 0.05 },
  metal: { color: '#a4a7a8', roughness: 0.35, metalness: 0.85 },
  trimmer: { color: '#2a58a0', roughness: 0.5, metalness: 0.05 },
  terminal: { color: '#3b8a5a', roughness: 0.55, metalness: 0.05 },
};

function createMaterial(style: MaterialStyle, doubleSided: boolean): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: style.color,
    roughness: style.roughness,
    metalness: style.metalness,
    flatShading: true,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: !!style.offset,
    polygonOffsetFactor: style.offset ? -1 : 0,
    polygonOffsetUnits: style.offset ? -2 : 0,
  });
}

function buildLayerGeometry(layer: LayerMeta, buffer: ArrayBuffer): THREE.BufferGeometry {
  const quantised = new Uint16Array(buffer, layer.positionOffset, layer.vertexCount * 3);
  const positions = new Float32Array(layer.vertexCount * 3);
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const range = layer.max[k] - layer.min[k];
      positions[i + k] = layer.min[k] + (quantised[i + k] / 65535) * range;
    }
  }
  const indices =
    layer.indexType === 'u32'
      ? new Uint32Array(buffer, layer.indexOffset, layer.indexCount)
      : new Uint16Array(buffer, layer.indexOffset, layer.indexCount);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export async function loadBoardModel(
  baseUrl: string,
  signal?: AbortSignal
): Promise<BoardModel> {
  const [metaResponse, binResponse] = await Promise.all([
    fetch(`${baseUrl}.json`, { signal }),
    fetch(`${baseUrl}.bin`, { signal }),
  ]);
  if (!metaResponse.ok || !binResponse.ok) {
    throw new Error(`Failed to load board model from ${baseUrl}`);
  }
  const meta = (await metaResponse.json()) as BoardMeta;
  const buffer = await binResponse.arrayBuffer();
  return buildBoardModel(meta, buffer);
}

function buildBoardModel(meta: BoardMeta, buffer: ArrayBuffer): BoardModel {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const root = new THREE.Group();
  const board = new THREE.Group();
  root.add(board);

  // ---- stack-up layers
  const layerMeshes: { mesh: THREE.Mesh; lift: number }[] = [];
  for (const layer of meta.layers) {
    const style = LAYER_STYLE[layer.name] ?? {
      color: `rgb(${layer.color.map((c) => Math.round(c * 255)).join(',')})`,
      roughness: 0.6,
      metalness: 0,
    };
    const geometry = buildLayerGeometry(layer, buffer);
    const material = createMaterial(style, true);
    geometries.push(geometry);
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = layer.name;
    mesh.frustumCulled = false;
    board.add(mesh);
    layerMeshes.push({ mesh, lift: LAYER_LIFT[layer.name] ?? 0 });
  }

  // ---- components: one instanced box set per (footprint part, board side)
  const partMaterials = new Map<PartMaterial, THREE.MeshStandardMaterial>();
  const getPartMaterial = (key: PartMaterial) => {
    let material = partMaterials.get(key);
    if (!material) {
      material = createMaterial(PART_STYLE[key], false);
      partMaterials.set(key, material);
      materials.push(material);
    }
    return material;
  };

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(boxGeometry);

  const byFootprint = new Map<string, { matrix: THREE.Matrix4; side: 1 | -1 }[]>();
  const axis = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  for (const placement of meta.components) {
    const [ax, ay, az, angle] = placement.rotation;
    axis.set(ax, ay, az).normalize();
    quaternion.setFromAxisAngle(axis, angle);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...placement.position),
      quaternion,
      new THREE.Vector3(1, 1, 1)
    );
    const list = byFootprint.get(placement.footprint) ?? [];
    list.push({ matrix, side: placement.position[2] >= 0 ? 1 : -1 });
    byFootprint.set(placement.footprint, list);
  }

  const componentGroups: { group: THREE.Group; lift: number }[] = [];
  const groupFor = new Map<string, THREE.Group>();
  const getGroup = (kind: ComponentKind, side: 1 | -1) => {
    const key = `${kind}:${side}`;
    let group = groupFor.get(key);
    if (!group) {
      group = new THREE.Group();
      group.name = `components-${key}`;
      board.add(group);
      groupFor.set(key, group);
      componentGroups.push({ group, lift: COMPONENT_LIFT[kind] * side });
    }
    return group;
  };

  const local = new THREE.Matrix4();
  const scaleMatrix = new THREE.Matrix4();
  for (const [footprint, placements] of byFootprint) {
    const spec = FOOTPRINTS[footprint] ?? FALLBACK_FOOTPRINT;
    for (const side of [1, -1] as const) {
      const sidePlacements = placements.filter((p) => p.side === side);
      if (sidePlacements.length === 0) continue;
      const group = getGroup(spec.kind, side);

      for (const part of spec.parts) {
        const nx = part.repeat?.nx ?? 1;
        const ny = part.repeat?.ny ?? 1;
        const mesh = new THREE.InstancedMesh(
          boxGeometry,
          getPartMaterial(part.material),
          sidePlacements.length * nx * ny
        );
        mesh.name = `${footprint}`;
        mesh.frustumCulled = false;

        let instance = 0;
        for (const placement of sidePlacements) {
          for (let ix = 0; ix < nx; ix += 1) {
            for (let iy = 0; iy < ny; iy += 1) {
              local.makeTranslation(
                part.at[0] + ix * (part.repeat?.dx ?? 0),
                part.at[1] + iy * (part.repeat?.dy ?? 0),
                part.at[2]
              );
              scaleMatrix.makeScale(part.size[0], part.size[1], part.size[2]);
              mesh.setMatrixAt(
                instance,
                new THREE.Matrix4().multiplyMatrices(placement.matrix, local).multiply(scaleMatrix)
              );
              instance += 1;
            }
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
        group.add(mesh);
      }
    }
  }

  // Millimetres -> world units, sized so the long edge of the board is ~6.2 units.
  const longEdge = Math.max(meta.size[0], meta.size[1]);
  const worldScale = 6.2 / longEdge;
  root.scale.setScalar(worldScale);

  const setExplode = (amount: number) => {
    for (const { mesh, lift } of layerMeshes) mesh.position.z = lift * amount;
    for (const { group, lift } of componentGroups) group.position.z = lift * amount;
  };
  setExplode(0);

  return {
    root,
    size: new THREE.Vector3(meta.size[0], meta.size[1], meta.size[2]).multiplyScalar(worldScale),
    setExplode,
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const { group } of componentGroups) {
        group.traverse((child) => {
          if (child instanceof THREE.InstancedMesh) child.dispose();
        });
      }
    },
  };
}
