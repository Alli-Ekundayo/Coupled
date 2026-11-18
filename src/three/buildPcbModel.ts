import * as THREE from 'three';
import { PcbBoardPreset, PcbComponentSpec } from '../utils/pcbLayout';
import {
  createSilkscreenTexture,
  PcbMaterialLibrary,
} from './pcbMaterials';

const WORLD_SCALE = 1 / 110;
const BOARD_CENTER_X = 260;
const BOARD_CENTER_Y = 200;
const BOARD_THICKNESS = 0.14;

function toWorldX(svgX: number): number {
  return (svgX - BOARD_CENTER_X) * WORLD_SCALE;
}

function toWorldZ(svgY: number): number {
  return (svgY - BOARD_CENTER_Y) * WORLD_SCALE;
}

function addEdges(
  mesh: THREE.Mesh,
  material: THREE.LineBasicMaterial,
  thresholdAngle = 22
): void {
  const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
  const line = new THREE.LineSegments(edgesGeo, material);
  mesh.add(line);
}

function createRoundedRectShape(
  width: number,
  height: number,
  radius: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export interface PcbComponentHandle {
  group: THREE.Group;
  spec: PcbComponentSpec;
  baseY: number;
  scatterX: number;
  scatterZ: number;
  scatterY: number;
  scatterRotY: number;
  explodeLift: number;
}

export interface BuiltPcbModel {
  root: THREE.Group;
  boardGroup: THREE.Group;
  traceGroup: THREE.Group;
  components: PcbComponentHandle[];
  settleMaterialsOpacity: (opacity: number) => void;
  dispose: () => void;
}

function buildComponentBody(
  comp: PcbComponentSpec,
  mats: PcbMaterialLibrary,
  maxAnisotropy: number,
  extraMaterials: THREE.Material[]
): { group: THREE.Group; explodeLift: number } {
  const group = new THREE.Group();
  const w = comp.width * WORLD_SCALE;
  const d = comp.height * WORLD_SCALE;

  // Main MCU QFP Package (has innerInset)
  if (comp.innerInset) {
    const pkgHeight = 0.14;
    const bodyShape = createRoundedRectShape(w, d, 0.03);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: pkgHeight * 0.72,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    bodyGeo.rotateX(-Math.PI / 2);

    const tex = createSilkscreenTexture(comp.designator, comp.label, 256, 256);
    tex.anisotropy = maxAnisotropy;
    mats.textures.push(tex);

    const capMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.56,
      metalness: 0.06,
    });
    extraMaterials.push(capMat);

    const bodyMesh = new THREE.Mesh(bodyGeo, [mats.icEpoxy, mats.icEpoxy]);
    bodyMesh.position.y = 0.02;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    addEdges(bodyMesh, mats.edgeInk, 25);
    group.add(bodyMesh);

    // Top engraved die cap with crisp silkscreen label
    const capGeo = new THREE.BoxGeometry(w * 0.72, 0.014, d * 0.72);
    const capMesh = new THREE.Mesh(capGeo, [
      mats.icInsetCap,
      mats.icInsetCap,
      capMat,
      mats.icInsetCap,
      mats.icInsetCap,
      mats.icInsetCap,
    ]);
    capMesh.position.y = pkgHeight * 0.72 + 0.044;
    addEdges(capMesh, mats.faintEdgeInk, 20);
    group.add(capMesh);

    // Gull-wing leads around sides
    if (comp.pins) {
      const leadGeo = new THREE.BoxGeometry(0.065, 0.026, 0.024);
      let leadCount = 0;
      for (const p of comp.pins) leadCount += p.count;
      const leads = new THREE.InstancedMesh(leadGeo, mats.metalLead, leadCount);
      const dummy = new THREE.Object3D();
      let idx = 0;

      for (const sideSpec of comp.pins) {
        const { side, count } = sideSpec;
        for (let i = 0; i < count; i += 1) {
          const ratio = (i + 1) / (count + 1) - 0.5;
          if (side === 'left' || side === 'right') {
            const sign = side === 'left' ? -1 : 1;
            dummy.position.set(sign * (w / 2 + 0.03), 0.025, ratio * d);
            dummy.rotation.set(0, 0, sign * -0.18);
          } else {
            const sign = side === 'top' ? -1 : 1;
            dummy.position.set(ratio * w, 0.025, sign * (d / 2 + 0.03));
            dummy.rotation.set(sign * 0.18, Math.PI / 2, 0);
          }
          dummy.updateMatrix();
          leads.setMatrixAt(idx, dummy.matrix);
          idx += 1;
        }
      }
      leads.instanceMatrix.needsUpdate = true;
      leads.computeBoundingSphere();
      group.add(leads);
    }

    return { group, explodeLift: 0.62 };
  }

  // USB-C / Edge Receptacle (J1)
  if (comp.designator === 'J1') {
    const shellH = 0.22;
    const shellGeo = new THREE.BoxGeometry(w, shellH, d);
    const shell = new THREE.Mesh(shellGeo, mats.metalCan);
    shell.position.y = shellH / 2 + 0.01;
    shell.castShadow = true;
    shell.receiveShadow = true;
    addEdges(shell, mats.edgeInk, 20);
    group.add(shell);

    // Recessed port opening + inner tongue on left edge
    const cavityGeo = new THREE.BoxGeometry(0.04, shellH * 0.54, d * 0.72);
    const cavity = new THREE.Mesh(cavityGeo, mats.icEpoxy);
    cavity.position.set(-w / 2 + 0.012, shellH / 2 + 0.01, 0);
    group.add(cavity);

    const tongueGeo = new THREE.BoxGeometry(0.06, 0.025, d * 0.56);
    const tongue = new THREE.Mesh(tongueGeo, mats.metalLead);
    tongue.position.set(-w / 2 + 0.02, shellH / 2 + 0.01, 0);
    group.add(tongue);

    // Top silkscreen badge
    const tex = createSilkscreenTexture(comp.designator, comp.label, 128, 256);
    tex.anisotropy = maxAnisotropy;
    mats.textures.push(tex);
    const badgeMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.1,
    });
    extraMaterials.push(badgeMat);
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.68, d * 0.52),
      badgeMat
    );
    badge.rotation.x = -Math.PI / 2;
    badge.position.y = shellH + 0.012;
    group.add(badge);

    return { group, explodeLift: 0.54 };
  }

  // Pin Header (J2)
  if (comp.designator === 'J2') {
    const hdrH = 0.18;
    const shroud = new THREE.Mesh(
      new THREE.BoxGeometry(w, hdrH, d),
      mats.icEpoxy
    );
    shroud.position.y = hdrH / 2 + 0.01;
    shroud.castShadow = true;
    addEdges(shroud, mats.edgeInk, 20);
    group.add(shroud);

    const pinCount = comp.pins?.[0]?.count ?? 6;
    const pinGeo = new THREE.BoxGeometry(0.036, 0.14, 0.036);
    const pins = new THREE.InstancedMesh(pinGeo, mats.metalLead, pinCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pinCount; i += 1) {
      const ratio = (i + 1) / (pinCount + 1) - 0.5;
      dummy.position.set(0, hdrH + 0.04, ratio * d * 0.85);
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
    }
    pins.instanceMatrix.needsUpdate = true;
    pins.computeBoundingSphere();
    group.add(pins);

    return { group, explodeLift: 0.48 };
  }

  // Crystal Oscillator Can (Y1) or Inductor (L1)
  if (comp.designator === 'Y1' || comp.designator === 'L1') {
    const baseH = 0.04;
    const canH = 0.13;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, baseH, d),
      mats.ceramicBody
    );
    base.position.y = baseH / 2 + 0.005;
    addEdges(base, mats.edgeInk);
    group.add(base);

    const can = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.84, canH, d * 0.84),
      mats.metalCan
    );
    can.position.y = baseH + canH / 2 + 0.005;
    can.castShadow = true;
    addEdges(can, mats.edgeInk);
    group.add(can);

    return { group, explodeLift: 0.44 };
  }

  // LDO / MOSFET / Larger IC (U2, Q1)
  if (comp.designator === 'U2' || comp.designator === 'Q1') {
    const h = 0.11;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mats.icEpoxy
    );
    body.position.y = h / 2 + 0.015;
    body.castShadow = true;
    addEdges(body, mats.edgeInk);
    group.add(body);

    // Thermal metal tab
    const tab = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.22, 0.025, d * 0.72),
      mats.metalLead
    );
    tab.position.set(0, 0.018, -d * 0.44);
    addEdges(tab, mats.faintEdgeInk);
    group.add(tab);

    return { group, explodeLift: 0.42 };
  }

  // SMD Passive / Diode (C1, C2, R1, D1)
  const smdH = 0.08;
  const horizontal = w >= d;
  const bodyW = horizontal ? w * 0.64 : w;
  const bodyD = horizontal ? d : d * 0.64;

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, smdH, bodyD),
    mats.ceramicBody
  );
  core.position.y = smdH / 2 + 0.006;
  core.castShadow = true;
  addEdges(core, mats.edgeInk);
  group.add(core);

  // Two metallic end-cap terminations
  const capOffset = (horizontal ? w : d) * 0.39;
  const capW = horizontal ? w * 0.22 : w * 1.02;
  const capD = horizontal ? d * 1.02 : d * 0.22;

  for (const sign of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(capW, smdH * 1.06, capD),
      mats.metalLead
    );
    cap.position.set(
      horizontal ? sign * capOffset : 0,
      smdH / 2 + 0.006,
      horizontal ? 0 : sign * capOffset
    );
    addEdges(cap, mats.faintEdgeInk);
    group.add(cap);
  }

  return { group, explodeLift: 0.34 };
}

export function buildPcbModel(
  preset: PcbBoardPreset,
  mats: PcbMaterialLibrary,
  maxAnisotropy: number
): BuiltPcbModel {
  const root = new THREE.Group();
  const boardGroup = new THREE.Group();
  const traceGroup = new THREE.Group();
  const components: PcbComponentHandle[] = [];
  const extraGeometries: THREE.BufferGeometry[] = [];
  const extraMaterials: THREE.Material[] = [];

  // 1. Extruded PCB Substrate with Corner Mounting Holes
  const boardW = preset.board.width * WORLD_SCALE;
  const boardD = preset.board.height * WORLD_SCALE;
  const boardR = preset.board.cornerRadius * WORLD_SCALE;
  const boardShape = createRoundedRectShape(boardW, boardD, boardR);

  const boardCenterSvgX = preset.board.x + preset.board.width / 2;
  const boardCenterSvgY = preset.board.y + preset.board.height / 2;

  for (const [hx, hy] of preset.board.mountingHoles) {
    const holePath = new THREE.Path();
    const localX = (hx - boardCenterSvgX) * WORLD_SCALE;
    const localY = -(hy - boardCenterSvgY) * WORLD_SCALE;
    holePath.absarc(
      localX,
      localY,
      preset.board.holeRadius * WORLD_SCALE,
      0,
      Math.PI * 2,
      true
    );
    boardShape.holes.push(holePath);
  }

  const boardGeo = new THREE.ExtrudeGeometry(boardShape, {
    depth: BOARD_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  boardGeo.rotateX(-Math.PI / 2);
  extraGeometries.push(boardGeo);

  const boardMesh = new THREE.Mesh(boardGeo, [
    mats.substrateTop,
    mats.substrateSide,
  ]);
  boardMesh.position.set(
    toWorldX(boardCenterSvgX),
    -BOARD_THICKNESS / 2,
    toWorldZ(boardCenterSvgY)
  );
  boardMesh.receiveShadow = true;
  boardMesh.castShadow = true;
  addEdges(boardMesh, mats.edgeInk, 26);
  boardGroup.add(boardMesh);

  // Mounting hole annular copper/ink rings on top surface
  const topSurfaceY = BOARD_THICKNESS / 2 + 0.016;
  const ringGeo = new THREE.RingGeometry(
    preset.board.holeRadius * WORLD_SCALE,
    (preset.board.holeRadius + 4.5) * WORLD_SCALE,
    24
  );
  ringGeo.rotateX(-Math.PI / 2);
  extraGeometries.push(ringGeo);

  for (const [hx, hy] of preset.board.mountingHoles) {
    const ring = new THREE.Mesh(ringGeo, mats.solderPad);
    ring.position.set(toWorldX(hx), topSurfaceY + 0.004, toWorldZ(hy));
    addEdges(ring, mats.edgeInk, 20);
    boardGroup.add(ring);
  }

  root.add(boardGroup);

  // 2. Raised 3D Copper Traces & Vias
  const traceWidth = 0.022;
  const traceHeight = 0.016;

  for (const trace of preset.traces) {
    for (let i = 0; i < trace.points.length - 1; i += 1) {
      const [x1, y1] = trace.points[i];
      const [x2, y2] = trace.points[i + 1];
      const wx1 = toWorldX(x1);
      const wz1 = toWorldZ(y1);
      const wx2 = toWorldX(x2);
      const wz2 = toWorldZ(y2);
      const dx = wx2 - wx1;
      const dz = wz2 - wz1;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;

      const segGeo = new THREE.BoxGeometry(len + traceWidth * 0.85, traceHeight, traceWidth);
      extraGeometries.push(segGeo);
      const seg = new THREE.Mesh(segGeo, mats.copperTrace);
      seg.position.set((wx1 + wx2) / 2, topSurfaceY + traceHeight / 2, (wz1 + wz2) / 2);
      seg.rotation.y = -Math.atan2(dz, dx);
      addEdges(seg, mats.faintEdgeInk, 30);
      traceGroup.add(seg);
    }

    if (trace.viaPoints) {
      for (const [vx, vy] of trace.viaPoints) {
        const viaGeo = new THREE.CylinderGeometry(0.036, 0.036, traceHeight + 0.008, 16);
        extraGeometries.push(viaGeo);
        const via = new THREE.Mesh(viaGeo, mats.solderPad);
        via.position.set(toWorldX(vx), topSurfaceY + traceHeight / 2, toWorldZ(vy));
        addEdges(via, mats.edgeInk, 25);
        traceGroup.add(via);
      }
    }
  }

  root.add(traceGroup);

  // 3. Solder Pads & Multi-Part 3D Components
  for (const comp of preset.components) {
    const cx = toWorldX(comp.x + comp.width / 2);
    const cz = toWorldZ(comp.y + comp.height / 2);

    // Component footprint pad plate anchored on board surface
    const padPlateGeo = new THREE.BoxGeometry(
      comp.width * WORLD_SCALE * 1.04,
      0.008,
      comp.height * WORLD_SCALE * 1.04
    );
    extraGeometries.push(padPlateGeo);
    const padOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(padPlateGeo, 20),
      mats.faintEdgeInk
    );
    padOutline.position.set(cx, topSurfaceY + 0.002, cz);
    boardGroup.add(padOutline);

    const { group, explodeLift } = buildComponentBody(
      comp,
      mats,
      maxAnisotropy,
      extraMaterials
    );

    group.position.set(cx, topSurfaceY, cz);
    root.add(group);

    components.push({
      group,
      spec: comp,
      baseY: topSurfaceY,
      scatterX: comp.scatterX * WORLD_SCALE * 1.4,
      scatterZ: comp.scatterY * WORLD_SCALE * 1.4,
      scatterY: 0.45 + Math.abs(comp.scatterRotateDeg) * 0.025,
      scatterRotY: THREE.MathUtils.degToRad(comp.scatterRotateDeg),
      explodeLift,
    });
  }

  return {
    root,
    boardGroup,
    traceGroup,
    components,
    settleMaterialsOpacity(opacity: number) {
      const clamped = Math.max(0, Math.min(1, opacity));
      root.visible = clamped > 0.02;
    },
    dispose() {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
        }
      });
      extraGeometries.forEach((g) => g.dispose());
      extraMaterials.forEach((m) => m.dispose());
    },
  };
}
