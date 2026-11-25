import { MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BoardModel, loadBoardModel } from '../three/buildBoardModel';
import { PcbTheme } from '../three/pcbMaterials';
import { lerp, ScrollValues } from '../utils/scrollStage';

interface PcbSceneCanvasProps {
  /**
   * Live scroll values (slide / explode / zoom, each 0..1). The page writes to this ref on
   * scroll; the scene reads it on every animation frame, so scrolling never goes through
   * React state.
   */
  valuesRef: MutableRefObject<ScrollValues>;
  /** Bump to replay the assemble-from-exploded intro. */
  animationKey: number;
  theme: PcbTheme;
  /**
   * `stage` (default): the scroll-choreographed hero board.
   * `viewer`: centred board the user can drag to rotate; explode / zoom still come from valuesRef.
   */
  layout?: 'stage' | 'viewer';
  /** Accessible description of the canvas. */
  label?: string;
}

const MODEL_URL = '/models/board';
const FOV = 32;
const NARROW_BREAKPOINT = 768;
const INTRO_SECONDS = 1.8;

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

const STAGE_LABEL =
  'Interactive 3D circuit board. As you scroll it slides across the screen, explodes into its layers, then zooms in.';

export function PcbSceneCanvas({
  valuesRef,
  animationKey,
  theme,
  layout = 'stage',
  label = STAGE_LABEL,
}: PcbSceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<PcbTheme>(theme);
  const applyThemeRef = useRef<((next: PcbTheme) => void) | null>(null);
  const replayRef = useRef<(() => void) | null>(null);

  themeRef.current = theme;

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const softwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !softwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.error('WebGL is unavailable, skipping 3D board.', error);
      mount.dataset.webgl = 'unavailable';
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.setPixelRatio(softwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 80);
    (window as any).__dbg = { scene, camera, THREE }; // TEMP-DEBUG

    const hemiLight = new THREE.HemisphereLight(0xf5efe2, 0x2a2722, 0.4);
    const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.15);
    keyLight.position.set(4.5, 6.8, 7);
    const rimLight = new THREE.DirectionalLight(0xe8dec9, 0.5);
    rimLight.position.set(-5, 2.5, -4);
    scene.add(hemiLight, keyLight, rimLight);

    const applyTheme = (next: PcbTheme) => {
      if (next === 'dark') {
        hemiLight.color.setHex(0xf5efe2);
        hemiLight.groundColor.setHex(0x2a2722);
        hemiLight.intensity = 0.4;
        keyLight.intensity = 1.15;
        rimLight.intensity = 0.5;
      } else {
        hemiLight.color.setHex(0xf3ece0);
        hemiLight.groundColor.setHex(0xb8aa8f);
        hemiLight.intensity = 0.35;
        keyLight.intensity = 1.0;
        rimLight.intensity = 0.4;
      }
    };
    applyThemeRef.current = applyTheme;
    applyTheme(themeRef.current);

    // pivot orients the board; the model inside is centred on the origin.
    const pivot = new THREE.Group();
    pivot.visible = false;
    scene.add(pivot);

    let model: BoardModel | null = null;
    let disposed = false;
    const abort = new AbortController();

    // Damped copies of the three scroll values, plus intro + pointer state.
    const smooth = { slide: 0, explode: 0, zoom: 0 };
    let intro = 1;
    let introStart = performance.now();
    let loadedAt = 0;
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const isViewer = layout === 'viewer';
    // Viewer only: drag-to-rotate offsets (radians) and their damped copies.
    const drag = { yaw: 0, pitch: 0, sYaw: 0, sPitch: 0, active: false, lastX: 0, lastY: 0 };

    replayRef.current = () => {
      introStart = performance.now();
      intro = 1;
    };

    loadBoardModel(MODEL_URL, abort.signal)
      .then((loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        model = loaded;
        pivot.add(loaded.root);
        pivot.visible = true;
        loadedAt = performance.now();
        introStart = loadedAt;
        mount.dataset.ready = 'true';
        mount.style.opacity = '1';
      })
      .catch((error) => {
        if (abort.signal.aborted) return;
        console.error('Failed to load the PCB model.', error);
        mount.dataset.ready = 'error';
      });

    let width = 1;
    let height = 1;
    const updateSize = () => {
      width = Math.max(mount.clientWidth, 1);
      height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    updateSize();

    let frameId = 0;
    let running = false;
    let lastTime = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      frameId = requestAnimationFrame(frame);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // ---- read the scroll values for this frame
      const target = valuesRef.current;
      const lambda = reducedMotion ? 200 : 7;
      smooth.slide = THREE.MathUtils.damp(smooth.slide, target.slide, lambda, dt);
      smooth.explode = THREE.MathUtils.damp(smooth.explode, target.explode, lambda, dt);
      smooth.zoom = THREE.MathUtils.damp(smooth.zoom, target.zoom, lambda, dt);
      const { slide, explode, zoom } = smooth;

      if (!model) {
        renderer.render(scene, camera);
        return;
      }

      // Intro: board assembles from an exploded state, then hands over to scroll.
      if (reducedMotion) {
        intro = 0;
      } else {
        const t = THREE.MathUtils.clamp((now - introStart) / (INTRO_SECONDS * 1000), 0, 1);
        intro = Math.pow(1 - t, 3);
      }
      model.setExplode(Math.max(explode, intro * 0.6));

      pointer.sx = THREE.MathUtils.damp(pointer.sx, pointer.x, 4, dt);
      pointer.sy = THREE.MathUtils.damp(pointer.sy, pointer.y, 4, dt);
      drag.sYaw = THREE.MathUtils.damp(drag.sYaw, drag.yaw, 10, dt);
      drag.sPitch = THREE.MathUtils.damp(drag.sPitch, drag.pitch, 10, dt);

      // ---- camera: zoom dollies in; framing adapts to aspect ratio
      const aspect = width / height;
      const narrow = width < NARROW_BREAKPOINT;
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      const fitDist = Math.max(
        (model.size.y * 1.05) / (2 * tanHalf),
        (model.size.x * 1.7) / (2 * tanHalf * aspect)
      );
      const baseDist = narrow ? fitDist * 1.35 : fitDist;
      const dist = lerp(baseDist, baseDist * 0.62, zoom);
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      const halfH = tanHalf * dist;
      const halfW = halfH * aspect;

      // ---- slide: board moves across the screen (screen-space fractions, so it holds
      // its place on screen while the camera zooms)
      let xFrac: number;
      let yFrac: number;
      let scale: number;
      if (isViewer) {
        xFrac = 0;
        yFrac = 0;
        scale = narrow ? 0.78 : 0.86;
      } else if (narrow) {
        xFrac = 0;
        yFrac = lerp(-0.4, 0.04, slide);
        scale = lerp(0.5, 0.8, slide);
      } else {
        xFrac = lerp(lerp(0.46, -0.42, slide), -0.34, zoom);
        yFrac = 0;
        scale = lerp(0.62, 0.72, slide);
      }

      pivot.position.set(xFrac * halfW, yFrac * halfH, 0);
      pivot.scale.setScalar(scale);
      if (isViewer) {
        pivot.rotation.set(
          lerp(-0.62, -0.82, explode) + drag.sPitch,
          lerp(-0.25, 0.62, explode) + drag.sYaw,
          lerp(0, 0.1, explode)
        );
      } else pivot.rotation.set(
        lerp(-0.5, -0.82, explode) + pointer.sy * 0.06,
        lerp(lerp(-0.42, 0.2, slide), 0.62, explode) + pointer.sx * 0.08,
        lerp(-0.04, 0.05, slide) + lerp(0, 0.1, explode)
      );

      mount.dataset.slide = slide.toFixed(2);
      mount.dataset.explode = explode.toFixed(2);
      mount.dataset.zoom = zoom.toFixed(2);

      renderer.render(scene, camera);
    };

    const start = () => {
      if (running || disposed) return;
      running = true;
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    // Only spend GPU time while the pinned section is on screen.
    const intersection = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
        else stop();
      },
      { rootMargin: '100px' }
    );
    intersection.observe(mount);

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(mount);

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointer.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };
    if (!isViewer) window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleDragStart = (event: PointerEvent) => {
      drag.active = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      mount.setPointerCapture(event.pointerId);
    };
    const handleDragMove = (event: PointerEvent) => {
      if (!drag.active) return;
      drag.yaw += (event.clientX - drag.lastX) * 0.008;
      drag.pitch = THREE.MathUtils.clamp(drag.pitch + (event.clientY - drag.lastY) * 0.006, -0.7, 0.7);
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };
    const handleDragEnd = () => {
      drag.active = false;
    };
    if (isViewer) {
      mount.addEventListener('pointerdown', handleDragStart);
      mount.addEventListener('pointermove', handleDragMove);
      mount.addEventListener('pointerup', handleDragEnd);
      mount.addEventListener('pointercancel', handleDragEnd);
    }

    return () => {
      disposed = true;
      abort.abort();
      stop();
      intersection.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      mount.removeEventListener('pointerdown', handleDragStart);
      mount.removeEventListener('pointermove', handleDragMove);
      mount.removeEventListener('pointerup', handleDragEnd);
      mount.removeEventListener('pointercancel', handleDragEnd);
      model?.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      applyThemeRef.current = null;
      replayRef.current = null;
    };
    // valuesRef is a stable ref object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyThemeRef.current?.(theme);
  }, [theme]);

  useEffect(() => {
    if (animationKey > 0) replayRef.current?.();
  }, [animationKey]);

  return (
    <div
      ref={containerRef}
      data-testid="pcb-3d-canvas"
      role="img"
      aria-label={label}
      className={`absolute inset-0 z-10 h-full w-full opacity-0 transition-opacity duration-700 ${
        layout === 'viewer' ? 'cursor-grab touch-none active:cursor-grabbing' : 'pointer-events-none'
      }`}
    />
  );
}
