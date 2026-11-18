import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildPcbModel, BuiltPcbModel } from '../three/buildPcbModel';
import {
  applyPcbTheme,
  createPcbMaterials,
  PcbMaterialLibrary,
  PcbTheme,
} from '../three/pcbMaterials';
import { PcbBoardPreset } from '../utils/pcbLayout';
import { computeDesktopPcbPose } from '../utils/pcbScrollPose';

interface PcbSceneCanvasProps {
  preset: PcbBoardPreset;
  animationKey: number;
  isDesktop: boolean;
  theme: PcbTheme;
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

export function PcbSceneCanvas({
  preset,
  animationKey,
  isDesktop,
  theme,
}: PcbSceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef(preset);
  const isDesktopRef = useRef(isDesktop);
  const themeRef = useRef<PcbTheme>(theme);
  const settleStartRef = useRef<number>(performance.now());
  const rebuildFnRef = useRef<(() => void) | null>(null);
  const applyThemeFnRef = useRef<((nextTheme: PcbTheme) => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);

  presetRef.current = preset;
  isDesktopRef.current = isDesktop;
  themeRef.current = theme;

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareGl();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.35, 9.6);
    camera.lookAt(0, 0, 0);

    // Balanced studio key + warm rim fill for dark matte board & cream outlines
    const hemiLight = new THREE.HemisphereLight(0xf5efe2, 0x2a2722, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.55);
    keyLight.position.set(4.5, 6.8, 5.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe8dec9, 0.75);
    rimLight.position.set(-5.0, 2.5, -4.0);
    scene.add(rimLight);

    const materials: PcbMaterialLibrary = createPcbMaterials(themeRef.current);
    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);

    const syncThemeVisuals = (nextTheme: PcbTheme) => {
      applyPcbTheme(materials, nextTheme);
      if (nextTheme === 'dark') {
        hemiLight.color.setHex(0xf5efe2);
        hemiLight.groundColor.setHex(0x2a2722);
        hemiLight.intensity = 0.72;
        keyLight.intensity = 1.55;
        rimLight.color.setHex(0xe8dec9);
        rimLight.intensity = 0.75;
      } else {
        hemiLight.color.setHex(0xf3ece0);
        hemiLight.groundColor.setHex(0xb8aa8f);
        hemiLight.intensity = 0.58;
        keyLight.intensity = 1.35;
        rimLight.color.setHex(0xeef4ff);
        rimLight.intensity = 0.45;
      }
    };

    applyThemeFnRef.current = syncThemeVisuals;
    syncThemeVisuals(themeRef.current);

    let activeModel: BuiltPcbModel | null = null;
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Current damped pose state
    const currentPose = {
      x: isDesktopRef.current ? 1.84 : 0,
      y: isDesktopRef.current ? 0.04 : 0,
      z: 0,
      rotX: 0.56,
      rotY: -0.32,
      rotZ: 0.1,
      scale: isDesktopRef.current ? 0.86 : 1.06,
      explode: 0,
      opacity: 1,
    };

    const pointerTarget = { x: 0, y: 0 };

    const rebuildModel = () => {
      if (activeModel) {
        pivot.remove(activeModel.root);
        activeModel.dispose();
        activeModel = null;
      }
      activeModel = buildPcbModel(presetRef.current, materials, maxAnisotropy);
      pivot.add(activeModel.root);
      settleStartRef.current = performance.now();
    };

    rebuildFnRef.current = rebuildModel;
    rebuildModel();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const updateSize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      // Scale framing gently on narrow tablet/desktop widths so board stays crisp inside column
      if (isDesktopRef.current) {
        const narrowFactor = THREE.MathUtils.clamp((1280 - width) / 520, 0, 1);
        camera.position.z = 9.3 + narrowFactor * 2.3;
      } else {
        camera.position.z = 9.5;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    updateSize();

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const computeTargetPose = () => {
      if (!isDesktopRef.current) {
        const scrollRatio = THREE.MathUtils.clamp(window.scrollY / 600, 0, 1);
        return {
          x: 0,
          y: 0,
          z: 0,
          rotX: 0.56 + scrollRatio * 0.28,
          rotY: -0.28 + scrollRatio * 0.52,
          rotZ: 0.08,
          scale: 1.06,
          explode: scrollRatio * 0.35,
          opacity: 1,
        };
      }

      const howEl = document.getElementById('how-it-works');
      const pricingEl = document.getElementById('pricing');
      const howTop = howEl ? howEl.offsetTop : 860;
      const howHeight = howEl ? howEl.offsetHeight : 680;
      const pricingTop = pricingEl ? pricingEl.offsetTop : 1620;

      const base = computeDesktopPcbPose({
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        howItWorksTop: howTop,
        howItWorksHeight: howHeight,
        pricingTop,
      });

      return {
        ...base,
        rotX: base.rotX + pointerTarget.y * 0.08,
        rotY: base.rotY + pointerTarget.x * 0.1,
      };
    };

    const applyModelPose = (now: number, dt: number): boolean => {
      const target = computeTargetPose();
      const lambda = reducedMotion ? 100 : 8.5;

      currentPose.x = THREE.MathUtils.damp(currentPose.x, target.x, lambda, dt);
      currentPose.y = THREE.MathUtils.damp(currentPose.y, target.y, lambda, dt);
      currentPose.z = THREE.MathUtils.damp(currentPose.z, target.z, lambda, dt);
      currentPose.rotX = THREE.MathUtils.damp(currentPose.rotX, target.rotX, lambda, dt);
      currentPose.rotY = THREE.MathUtils.damp(currentPose.rotY, target.rotY, lambda, dt);
      currentPose.rotZ = THREE.MathUtils.damp(currentPose.rotZ, target.rotZ, lambda, dt);
      currentPose.scale = THREE.MathUtils.damp(currentPose.scale, target.scale, lambda, dt);
      currentPose.explode = THREE.MathUtils.damp(currentPose.explode, target.explode, lambda, dt);
      currentPose.opacity = THREE.MathUtils.damp(currentPose.opacity, target.opacity, lambda, dt);

      // Initial 1.5s ease-out settlement from scattered floating state
      const elapsedSettle = (now - settleStartRef.current) / 1500;
      const rawSettle = reducedMotion ? 1 : THREE.MathUtils.clamp(elapsedSettle, 0, 1);
      const easedSettle = 1 - Math.pow(1 - rawSettle, 3);
      const scatterRemaining = 1 - easedSettle;

      pivot.position.set(currentPose.x, currentPose.y, currentPose.z);
      pivot.rotation.set(currentPose.rotX, currentPose.rotY, currentPose.rotZ);
      const visibleScale = currentPose.scale * (0.35 + 0.65 * currentPose.opacity);
      pivot.scale.setScalar(visibleScale);

      if (activeModel) {
        activeModel.settleMaterialsOpacity(currentPose.opacity);
        activeModel.traceGroup.position.y = currentPose.explode * 0.14;

        for (const comp of activeModel.components) {
          const baseCx = (comp.spec.x + comp.spec.width / 2 - 260) / 110;
          const baseCz = (comp.spec.y + comp.spec.height / 2 - 200) / 110;

          comp.group.position.set(
            baseCx + comp.scatterX * scatterRemaining,
            comp.baseY +
              comp.scatterY * scatterRemaining +
              currentPose.explode * comp.explodeLift,
            baseCz + comp.scatterZ * scatterRemaining
          );
          comp.group.rotation.y = comp.scatterRotY * scatterRemaining;
        }
      }

      mount.dataset.poseX = currentPose.x.toFixed(2);
      mount.dataset.explode = currentPose.explode.toFixed(2);

      const stillSettling =
        rawSettle < 1 ||
        Math.abs(currentPose.x - target.x) > 0.002 ||
        Math.abs(currentPose.y - target.y) > 0.002 ||
        Math.abs(currentPose.rotX - target.rotX) > 0.002 ||
        Math.abs(currentPose.rotY - target.rotY) > 0.002 ||
        Math.abs(currentPose.explode - target.explode) > 0.002 ||
        Math.abs(currentPose.opacity - target.opacity) > 0.002;

      return stillSettling;
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const needsAnotherFrame = applyModelPose(now, dt);
        renderer.render(scene, camera);

        const done = () => {
          if (disposed) return;
          renderBusy = false;
          if (needsAnotherFrame || renderDirty) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    };

    requestRenderRef.current = requestRender;
    requestRender();

    const handleScroll = () => {
      requestRender();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDesktopRef.current || reducedMotion) return;
      pointerTarget.x = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointerTarget.y = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
      requestRender();
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
      requestRender();
    });
    resizeObserver.observe(mount);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);

      if (activeModel) {
        activeModel.dispose();
        activeModel = null;
      }
      materials.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild 3D PCB model and replay settlement animation whenever preset or animationKey changes
  useEffect(() => {
    rebuildFnRef.current?.();
    requestRenderRef.current?.();
  }, [preset, animationKey, isDesktop]);

  // Switch 3D PCB material & lighting colors cleanly on Light/Dark mode toggle
  useEffect(() => {
    applyThemeFnRef.current?.(theme);
    requestRenderRef.current?.();
  }, [theme]);

  return (
    <div
      ref={containerRef}
      data-testid="pcb-3d-canvas"
      data-preset={preset.id}
      aria-label={`Interactive 3D circuit board layout for ${preset.name} responding to page scroll.`}
      role="img"
      className={
        isDesktop
          ? 'pointer-events-none fixed inset-0 z-10 h-screen w-screen'
          : 'pointer-events-none mx-auto h-[340px] w-full max-w-[440px]'
      }
    />
  );
}
