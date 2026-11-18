export interface PcbPose {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  explode: number;
  opacity: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Computes the 3D PCB target pose from normalized section scroll ratios.
 * - Hero (heroProgress = 0): right column isometric hero showcase
 * - How It Works (howItWorksProgress = 0..1): glides left into the open left stage column,
 *   tilts into a steep 3D inspection angle, and gently explodes component/trace layers
 * - Pricing (pricingProgress = 0..1): re-assembles and glides smoothly upward/right out of
 *   the 3-column pricing cards so zero text is ever occluded
 */
export function computeDesktopPcbPose(params: {
  scrollY: number;
  viewportHeight: number;
  howItWorksTop: number;
  howItWorksHeight: number;
  pricingTop: number;
}): PcbPose {
  const {
    scrollY,
    viewportHeight,
    howItWorksTop,
    howItWorksHeight,
    pricingTop,
  } = params;

  const vh = Math.max(viewportHeight, 1);

  // Phase 1: Hero -> How It Works (t1: 0 at top -> 1 when How It Works enters)
  const howAnchor = Math.max(1, howItWorksTop - vh * 0.14);
  const t1 = smoothstep(0, howAnchor, scrollY);

  // Phase 2: How It Works -> Pricing (t2: exits cleanly before Pricing header enters)
  const pricingStart = Math.max(howAnchor + 20, pricingTop - vh * 0.85);
  const pricingEnd = Math.max(pricingStart + 40, pricingTop - vh * 0.35);
  const t2 = smoothstep(pricingStart, pricingEnd, scrollY);

  // Slight continuous rotation drift during scroll inside How It Works
  const howInspect = clamp01(
    (scrollY - (howItWorksTop - vh * 0.35)) / Math.max(howItWorksHeight, 1)
  );

  // Keyframe A (Hero right column, neatly framed inside right vertical rail beside enlarged headline)
  const heroX = 1.84;
  const heroY = 0.04;
  const heroZ = 0;
  const heroRotX = 0.56;
  const heroRotY = -0.32;
  const heroRotZ = 0.1;
  const heroScale = 0.86;

  // Keyframe B (How It Works left 5-col inspection box, shifted further left for wider travel)
  const howX = -2.65;
  const howY = -0.16;
  const howZ = 0.2;
  const howRotX = 0.78 - howInspect * 0.14;
  const howRotY = 0.34 + howInspect * 0.18;
  const howRotZ = -0.08;
  const howScale = 0.54;

  // Keyframe C (Pricing entry: glides smoothly up-right and clears viewport completely)
  const exitX = 1.9;
  const exitY = 3.8;
  const exitZ = -0.6;
  const exitRotX = 0.38;
  const exitRotY = -0.45;
  const exitRotZ = 0.08;
  const exitScale = 0.64;

  const baseX = lerp(heroX, howX, t1);
  const baseY = lerp(heroY, howY, t1);
  const baseZ = lerp(heroZ, howZ, t1);
  const baseRotX = lerp(heroRotX, howRotX, t1);
  const baseRotY = lerp(heroRotY, howRotY, t1);
  const baseRotZ = lerp(heroRotZ, howRotZ, t1);
  const baseScale = lerp(heroScale, howScale, t1);

  const explodePeak = Math.sin(t1 * Math.PI * 0.5) * (1 - t2);

  return {
    x: lerp(baseX, exitX, t2),
    y: lerp(baseY, exitY, t2),
    z: lerp(baseZ, exitZ, t2),
    rotX: lerp(baseRotX, exitRotX, t2),
    rotY: lerp(baseRotY, exitRotY, t2),
    rotZ: lerp(baseRotZ, exitRotZ, t2),
    scale: lerp(baseScale, exitScale, t2),
    explode: clamp01(explodePeak * 0.85),
    opacity: 1 - smoothstep(0.55, 0.98, t2),
  };
}
