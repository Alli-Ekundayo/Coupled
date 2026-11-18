import * as THREE from 'three';

export interface PcbMaterialLibrary {
  substrateTop: THREE.MeshStandardMaterial;
  substrateSide: THREE.MeshStandardMaterial;
  copperTrace: THREE.MeshStandardMaterial;
  solderPad: THREE.MeshStandardMaterial;
  icEpoxy: THREE.MeshStandardMaterial;
  icInsetCap: THREE.MeshStandardMaterial;
  metalLead: THREE.MeshStandardMaterial;
  metalCan: THREE.MeshStandardMaterial;
  ceramicBody: THREE.MeshStandardMaterial;
  edgeInk: THREE.LineBasicMaterial;
  faintEdgeInk: THREE.LineBasicMaterial;
  textures: THREE.Texture[];
  dispose: () => void;
}

export function createSilkscreenTexture(
  designator: string,
  subtitle?: string,
  widthPx = 256,
  heightPx = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#191919';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Subtle matte frame
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, widthPx - 24, heightPx - 24);

    // Pin-1 fiducial dot
    ctx.fillStyle = '#E8DEC9';
    ctx.beginPath();
    ctx.arc(28, 28, 6, 0, Math.PI * 2);
    ctx.fill();

    // Designator text
    ctx.fillStyle = '#E8DEC9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 42px "IBM Plex Mono", monospace';
    ctx.fillText(
      designator,
      widthPx / 2,
      subtitle ? heightPx / 2 - 18 : heightPx / 2
    );

    if (subtitle) {
      ctx.fillStyle = '#B8AF9D';
      ctx.font = '400 26px "IBM Plex Mono", monospace';
      ctx.fillText(subtitle, widthPx / 2, heightPx / 2 + 28);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type PcbTheme = 'dark' | 'light';

export function applyPcbTheme(
  mats: PcbMaterialLibrary,
  theme: PcbTheme
): void {
  if (theme === 'dark') {
    mats.substrateTop.color.setHex(0x1c1b18);
    mats.substrateSide.color.setHex(0x141311);
    mats.copperTrace.color.setHex(0xcfc4ae);
    mats.solderPad.color.setHex(0xe8dec9);
    mats.icEpoxy.color.setHex(0x151514);
    mats.icInsetCap.color.setHex(0x1f1e1b);
    mats.metalLead.color.setHex(0xcfc4ae);
    mats.metalCan.color.setHex(0x35322b);
    mats.ceramicBody.color.setHex(0x2b2822);
    mats.edgeInk.color.setHex(0xe8dec9);
    mats.edgeInk.opacity = 0.92;
    mats.faintEdgeInk.color.setHex(0xe8dec9);
    mats.faintEdgeInk.opacity = 0.38;
  } else {
    mats.substrateTop.color.setHex(0xd6cab0);
    mats.substrateSide.color.setHex(0xbcae91);
    mats.copperTrace.color.setHex(0x262626);
    mats.solderPad.color.setHex(0x525252);
    mats.icEpoxy.color.setHex(0x191919);
    mats.icInsetCap.color.setHex(0x222222);
    mats.metalLead.color.setHex(0x626262);
    mats.metalCan.color.setHex(0xc8bfa9);
    mats.ceramicBody.color.setHex(0x3b3832);
    mats.edgeInk.color.setHex(0x111111);
    mats.edgeInk.opacity = 0.88;
    mats.faintEdgeInk.color.setHex(0x111111);
    mats.faintEdgeInk.opacity = 0.4;
  }
}

export function createPcbMaterials(theme: PcbTheme = 'dark'): PcbMaterialLibrary {
  const substrateTop = new THREE.MeshStandardMaterial({
    color: 0x1c1b18,
    roughness: 0.84,
    metalness: 0.04,
  });

  const substrateSide = new THREE.MeshStandardMaterial({
    color: 0x141311,
    roughness: 0.9,
    metalness: 0.04,
  });

  const copperTrace = new THREE.MeshStandardMaterial({
    color: 0xcfc4ae,
    roughness: 0.28,
    metalness: 0.72,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const solderPad = new THREE.MeshStandardMaterial({
    color: 0xe8dec9,
    roughness: 0.22,
    metalness: 0.78,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const icEpoxy = new THREE.MeshStandardMaterial({
    color: 0x151514,
    roughness: 0.58,
    metalness: 0.08,
  });

  const icInsetCap = new THREE.MeshStandardMaterial({
    color: 0x1f1e1b,
    roughness: 0.52,
    metalness: 0.1,
  });

  const metalLead = new THREE.MeshStandardMaterial({
    color: 0xcfc4ae,
    roughness: 0.22,
    metalness: 0.88,
  });

  const metalCan = new THREE.MeshStandardMaterial({
    color: 0x35322b,
    roughness: 0.32,
    metalness: 0.74,
  });

  const ceramicBody = new THREE.MeshStandardMaterial({
    color: 0x2b2822,
    roughness: 0.55,
    metalness: 0.08,
  });

  const edgeInk = new THREE.LineBasicMaterial({
    color: 0xe8dec9,
    transparent: true,
    opacity: 0.92,
  });

  const faintEdgeInk = new THREE.LineBasicMaterial({
    color: 0xe8dec9,
    transparent: true,
    opacity: 0.38,
  });

  const textures: THREE.Texture[] = [];

  const lib: PcbMaterialLibrary = {
    substrateTop,
    substrateSide,
    copperTrace,
    solderPad,
    icEpoxy,
    icInsetCap,
    metalLead,
    metalCan,
    ceramicBody,
    edgeInk,
    faintEdgeInk,
    textures,
    dispose() {
      substrateTop.dispose();
      substrateSide.dispose();
      copperTrace.dispose();
      solderPad.dispose();
      icEpoxy.dispose();
      icInsetCap.dispose();
      metalLead.dispose();
      metalCan.dispose();
      ceramicBody.dispose();
      edgeInk.dispose();
      faintEdgeInk.dispose();
      textures.forEach((tex) => tex.dispose());
    },
  };

  applyPcbTheme(lib, theme);
  return lib;
}
