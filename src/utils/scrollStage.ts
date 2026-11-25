/**
 * Scroll choreography for the pinned PCB stage.
 *
 * The page has one tall section; a viewport-sized stage is pinned (position: sticky)
 * inside it. Scrolling through the section yields a single 0..1 progress value, which
 * is turned into three independent 0..1 values that the 3D scene reads every frame:
 *
 *   slide   - board travels from the hero column to the opposite side of the screen
 *   explode - the stack-up separates into layers, components lift off the board
 *   zoom    - the camera pushes in on the exploded stack
 */

export interface ScrollValues {
  slide: number;
  explode: number;
  zoom: number;
}

/** Progress ranges (0..1 of the pinned scroll distance) where each value ramps 0 -> 1. */
export const STAGE_RANGES = {
  slide: [0.0, 0.3],
  explode: [0.26, 0.64],
  zoom: [0.6, 0.96],
} as const;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Progress through the pinned section: 0 when the section's top touches the viewport top,
 * 1 when its bottom touches the viewport bottom (i.e. just before the pin releases).
 */
export function computeStageProgress(
  sectionTop: number,
  sectionHeight: number,
  viewportHeight: number
): number {
  const scrollable = sectionHeight - viewportHeight;
  if (scrollable <= 0) return 0;
  return clamp01(-sectionTop / scrollable);
}

export function computeScrollValues(progress: number): ScrollValues {
  const p = clamp01(progress);
  return {
    slide: smoothstep(STAGE_RANGES.slide[0], STAGE_RANGES.slide[1], p),
    explode: smoothstep(STAGE_RANGES.explode[0], STAGE_RANGES.explode[1], p),
    zoom: smoothstep(STAGE_RANGES.zoom[0], STAGE_RANGES.zoom[1], p),
  };
}
