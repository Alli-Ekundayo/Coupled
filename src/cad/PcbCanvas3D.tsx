import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useStudioStore } from '../store/useStudioStore';
import { rotatePt } from './math';
import { ParsedFootprint, ParsedKicadPcb } from './parseKicadPcb';

interface PcbCanvas3DProps {
  board: ParsedKicadPcb | null;
  fitTrigger: number;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function makeLabelTexture(ref: string, value: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1f232c';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#3f4554';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 42px monospace';
    ctx.fillText(ref, 128, value ? 46 : 64);
    if (value) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 24px monospace';
      ctx.fillText(value.slice(0, 14), 128, 88);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

type PkgCategory = 'usbc' | 'header' | 'led' | 'cap' | 'res' | 'lga' | 'ic';

function classifyPackage(fp: ParsedFootprint): PkgCategory {
  const meta = `${fp.lib} ${fp.value}`.toLowerCase();
  const ref = fp.ref.toUpperCase();
  if (meta.includes('usb') || meta.includes('type-c')) return 'usbc';
  if (meta.includes('header') || meta.includes('hdr') || (ref.startsWith('J') && fp.pads.some((p) => p.type === 'thru_hole'))) {
    return 'header';
  }
  if (meta.includes('led') || ref.startsWith('D')) return 'led';
  if (ref.startsWith('C')) return 'cap';
  if (ref.startsWith('R')) return 'res';
  if (meta.includes('lga') || meta.includes('bme') || meta.includes('sensor')) return 'lga';
  return 'ic';
}

export function PcbCanvas3D({ board, fitTrigger }: PcbCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedRef = useStudioStore((s) => s.selectedRef);
  const highlightedNet = useStudioStore((s) => s.highlightedNet);
  const layers = useStudioStore((s) => s.layers);
  const selectComponent = useStudioStore((s) => s.selectComponent);

  const rebuildRef = useRef<(() => void) | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const boardRef = useRef(board);
  const selectedRefRef = useRef(selectedRef);
  const highlightedNetRef = useRef(highlightedNet);
  const layersRef = useRef(layers);
  const selectComponentRef = useRef(selectComponent);

  boardRef.current = board;
  selectedRefRef.current = selectedRef;
  highlightedNetRef.current = highlightedNet;
  layersRef.current = layers;
  selectComponentRef.current = selectComponent;

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const isSoft = detectSoftwareGl();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoft,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoft ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoft;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    camera.position.set(0, 38, 36);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.minDistance = 8;
    controls.maxDistance = 180;

    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.85));
    const key = new THREE.DirectionalLight(0xfffbeb, 1.45);
    key.position.set(24, 42, 22);
    if (!isSoft) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
    }
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rim.position.set(-28, 18, -26);
    scene.add(rim);

    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const disposables: Array<{ dispose: () => void }> = [];
    const pickables: THREE.Object3D[] = [];

    const clearGroup = () => {
      pickables.length = 0;
      while (boardGroup.children.length > 0) {
        boardGroup.remove(boardGroup.children[0]);
      }
      while (disposables.length > 0) {
        disposables.pop()?.dispose();
      }
    };

    const fitCamera = () => {
      const b = boardRef.current;
      if (!b) return;
      const span = Math.max(b.bounds.width, b.bounds.height, 20);
      controls.target.set(0, 0, 0);
      camera.position.set(0, span * 0.95, span * 0.85);
      controls.update();
    };
    fitRef.current = fitCamera;

    const rebuildBoard = () => {
      clearGroup();
      const b = boardRef.current;
      if (!b) return;

      const cx = b.bounds.minX + b.bounds.width / 2;
      const cy = b.bounds.minY + b.bounds.height / 2;
      const toX = (wx: number) => wx - cx;
      const toZ = (wy: number) => wy - cy;
      const boardThick = 1.6;

      // Materials
      const matSubstrateTop = new THREE.MeshStandardMaterial({
        color: 0x166534,
        roughness: 0.62,
        metalness: 0.08,
      });
      const matSubstrateSide = new THREE.MeshStandardMaterial({
        color: 0x14532d,
        roughness: 0.78,
        metalness: 0.05,
      });
      const matPadGold = new THREE.MeshStandardMaterial({
        color: 0xe0b44b,
        roughness: 0.22,
        metalness: 0.88,
      });
      const matViaSilver = new THREE.MeshStandardMaterial({
        color: 0xd8dee9,
        roughness: 0.25,
        metalness: 0.85,
      });
      const matFCu = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.35,
        metalness: 0.55,
      });
      const matBCu = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.35,
        metalness: 0.55,
      });
      const matHighlight = new THREE.MeshStandardMaterial({
        color: 0x00e676,
        emissive: 0x00e676,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.6,
      });
      const matMetalShell = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.26,
        metalness: 0.88,
      });
      const matIcEpoxy = new THREE.MeshStandardMaterial({
        color: 0x222631,
        roughness: 0.55,
        metalness: 0.08,
      });
      const matLgaSilver = new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        roughness: 0.3,
        metalness: 0.82,
      });
      const matCapTan = new THREE.MeshStandardMaterial({
        color: 0xb4834c,
        roughness: 0.48,
        metalness: 0.08,
      });
      const matResBlack = new THREE.MeshStandardMaterial({
        color: 0x1f2430,
        roughness: 0.58,
        metalness: 0.08,
      });
      const matLedGreen = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.88,
        roughness: 0.2,
      });
      const matDrillDark = new THREE.MeshStandardMaterial({
        color: 0x090b0f,
        roughness: 0.9,
      });
      const matSelection = new THREE.LineBasicMaterial({ color: 0x00e676 });

      disposables.push(
        matSubstrateTop,
        matSubstrateSide,
        matPadGold,
        matViaSilver,
        matFCu,
        matBCu,
        matHighlight,
        matMetalShell,
        matIcEpoxy,
        matLgaSilver,
        matCapTan,
        matResBlack,
        matLedGreen,
        matDrillDark,
        matSelection,
      );

      // 1. Extruded FR-4 Substrate from Edge.Cuts + Cutouts
      if (b.outerPolygon.length >= 3) {
        const shape = new THREE.Shape();
        b.outerPolygon.forEach(([x, y], idx) => {
          const sx = toX(x);
          const sy = -toZ(y);
          if (idx === 0) shape.moveTo(sx, sy);
          else shape.lineTo(sx, sy);
        });
        shape.closePath();

        for (const hole of b.cutouts) {
          if (hole.length < 3) continue;
          const hPath = new THREE.Path();
          hole.forEach(([x, y], idx) => {
            const sx = toX(x);
            const sy = -toZ(y);
            if (idx === 0) hPath.moveTo(sx, sy);
            else hPath.lineTo(sx, sy);
          });
          hPath.closePath();
          shape.holes.push(hPath);
        }

        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: boardThick,
          bevelEnabled: false,
        });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, -boardThick, 0);
        disposables.push(geo);

        const substrate = new THREE.Mesh(geo, [matSubstrateTop, matSubstrateSide]);
        substrate.receiveShadow = true;
        substrate.castShadow = true;
        boardGroup.add(substrate);
      }

      // 2. Copper Traces (F.Cu & B.Cu)
      const activeNet = highlightedNetRef.current;
      const activeLayers = layersRef.current;

      for (const seg of b.segments) {
        const isFront = seg.layer !== 'B.Cu';
        if (isFront && !activeLayers.fCu) continue;
        if (!isFront && !activeLayers.bCu) continue;

        const x1 = toX(seg.x1);
        const z1 = toZ(seg.y1);
        const x2 = toX(seg.x2);
        const z2 = toZ(seg.y2);
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 0.01) continue;

        const isHighlighted = activeNet && seg.netName === activeNet;
        const tGeo = new THREE.BoxGeometry(len + seg.width * 0.7, 0.04, seg.width);
        disposables.push(tGeo);
        const mesh = new THREE.Mesh(
          tGeo,
          isHighlighted ? matHighlight : isFront ? matFCu : matBCu,
        );
        mesh.position.set(
          (x1 + x2) / 2,
          isFront ? 0.03 : -boardThick - 0.03,
          (z1 + z2) / 2,
        );
        mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
        boardGroup.add(mesh);
      }

      // 3. Plated Vias
      for (const via of b.vias) {
        const isHighlighted = activeNet && via.netName === activeNet;
        const vGeo = new THREE.CylinderGeometry(via.size / 2, via.size / 2, boardThick + 0.08, 14);
        disposables.push(vGeo);
        const mesh = new THREE.Mesh(vGeo, isHighlighted ? matHighlight : matViaSilver);
        mesh.position.set(toX(via.x), -boardThick / 2, toZ(via.y));
        boardGroup.add(mesh);

        const dGeo = new THREE.CylinderGeometry(via.drill / 2, via.drill / 2, boardThick + 0.1, 10);
        disposables.push(dGeo);
        const holeMesh = new THREE.Mesh(dGeo, matDrillDark);
        holeMesh.position.set(toX(via.x), -boardThick / 2, toZ(via.y));
        boardGroup.add(holeMesh);
      }

      // 4. Pads & Classified 3D Component Packages
      for (const fp of b.footprints) {
        const fpGroup = new THREE.Group();
        fpGroup.position.set(toX(fp.x), 0, toZ(fp.y));
        fpGroup.userData.ref = fp.ref;

        for (const pd of fp.pads) {
          const [rx, ry] = rotatePt(pd.px, pd.py, fp.rot);
          const isMatched = activeNet && pd.netName === activeNet;
          const isTh = pd.type === 'thru_hole';
          const padH = isTh ? boardThick + 0.1 : 0.05;
          const pGeo = new THREE.BoxGeometry(pd.w, padH, pd.h);
          disposables.push(pGeo);
          const padMesh = new THREE.Mesh(
            pGeo,
            isMatched ? matHighlight : pd.type === 'np_thru_hole' ? matDrillDark : matPadGold,
          );
          padMesh.position.set(rx, isTh ? -boardThick / 2 : 0.03, ry);
          padMesh.rotation.y = (pd.ang * Math.PI) / 180;
          padMesh.userData.ref = fp.ref;
          fpGroup.add(padMesh);
          pickables.push(padMesh);
        }

        const bodyGroup = new THREE.Group();
        bodyGroup.rotation.y = (fp.rot * Math.PI) / 180;

        const [bx0, by0, bx1, by1] = fp.bbox;
        const bw = Math.max(0.8, (bx1 - bx0) * 0.78);
        const bd = Math.max(0.8, (by1 - by0) * 0.78);
        const pkg = classifyPackage(fp);

        const addBox = (
          w: number,
          h: number,
          d: number,
          mat: THREE.Material,
          px = 0,
          py = h / 2 + 0.05,
          pz = 0,
        ) => {
          const geo = new THREE.BoxGeometry(w, h, d);
          disposables.push(geo);
          const m = new THREE.Mesh(geo, mat);
          m.position.set(px, py, pz);
          m.castShadow = true;
          m.receiveShadow = true;
          m.userData.ref = fp.ref;
          bodyGroup.add(m);
          pickables.push(m);
          return m;
        };

        if (pkg === 'usbc') {
          addBox(Math.max(bw, 8.8), 3.2, Math.max(bd, 7.0), matMetalShell);
        } else if (pkg === 'header') {
          addBox(Math.max(bw, 2.5), 2.5, Math.max(bd, 5.0), matIcEpoxy);
          for (const pd of fp.pads) {
            const pGeo = new THREE.BoxGeometry(0.64, 5.4, 0.64);
            disposables.push(pGeo);
            const pinMesh = new THREE.Mesh(pGeo, matPadGold);
            pinMesh.position.set(pd.px, 2.75, pd.py);
            pinMesh.userData.ref = fp.ref;
            bodyGroup.add(pinMesh);
            pickables.push(pinMesh);
          }
        } else if (pkg === 'led') {
          addBox(Math.min(bw, 1.6), 0.35, Math.min(bd, 0.85), matCapTan);
          addBox(Math.min(bw * 0.65, 1.0), 0.65, Math.min(bd * 0.75, 0.7), matLedGreen, 0, 0.68, 0);
        } else if (pkg === 'cap') {
          addBox(Math.min(bw, 1.7) * 0.68, 0.85, Math.min(bd, 0.9), matCapTan);
          const capW = Math.min(bw, 1.7) * 0.18;
          const capD = Math.min(bd, 0.9) * 1.02;
          const off = Math.min(bw, 1.7) * 0.42;
          addBox(capW, 0.88, capD, matViaSilver, -off);
          addBox(capW, 0.88, capD, matViaSilver, off);
        } else if (pkg === 'res') {
          addBox(Math.min(bw, 1.7) * 0.68, 0.65, Math.min(bd, 0.9), matResBlack);
          const capW = Math.min(bw, 1.7) * 0.18;
          const capD = Math.min(bd, 0.9) * 1.02;
          const off = Math.min(bw, 1.7) * 0.42;
          addBox(capW, 0.68, capD, matViaSilver, -off);
          addBox(capW, 0.68, capD, matViaSilver, off);
        } else if (pkg === 'lga') {
          addBox(Math.max(bw, 2.5), 1.0, Math.max(bd, 2.5), matLgaSilver);
        } else {
          const icH = 1.35;
          addBox(bw, icH, bd, matIcEpoxy);
          const tex = makeLabelTexture(fp.ref, fp.value);
          disposables.push(tex);
          const topMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.45,
          });
          disposables.push(topMat);
          const labelPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(bw * 0.88, bd * 0.88),
            topMat,
          );
          disposables.push(labelPlane.geometry);
          labelPlane.rotation.x = -Math.PI / 2;
          labelPlane.position.y = icH + 0.06;
          labelPlane.userData.ref = fp.ref;
          bodyGroup.add(labelPlane);
        }

        if (selectedRefRef.current === fp.ref) {
          const selGeo = new THREE.BoxGeometry(bw + 0.7, 2.2, bd + 0.7);
          const edgesGeo = new THREE.EdgesGeometry(selGeo);
          selGeo.dispose();
          disposables.push(edgesGeo);
          const box = new THREE.LineSegments(edgesGeo, matSelection);
          box.position.y = 1.1;
          bodyGroup.add(box);
        }

        fpGroup.add(bodyGroup);
        boardGroup.add(fpGroup);
      }
    };

    rebuildRef.current = rebuildBoard;
    rebuildBoard();
    fitCamera();

    const updateSize = () => {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(mount);

    let rafId = 0;
    let disposed = false;
    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Raycast click-to-select footprint
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = { x: 0, y: 0 };

    const onDown = (e: PointerEvent) => {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const hitRef = hits[0]?.object?.userData?.ref as string | undefined;
      selectComponentRef.current(hitRef ?? null);
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      clearGroup();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [board, selectedRef, highlightedNet, layers]);

  useEffect(() => {
    fitRef.current?.();
  }, [board, fitTrigger]);

  return (
    <div
      ref={containerRef}
      className="cad-grid-bg relative h-full w-full overflow-hidden"
    >
      {!board && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel)]/90 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[var(--text)]">No 3D board to render</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Run placement or upload a `.kicad_pcb` file to inspect the 3D FR-4 stackup.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
