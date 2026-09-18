/**
 * Parallax Starfield Constants & Procedural Generator
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly features an immersive, multi-layered parallax "Starfield" background that visually
 * grounds the Calvin University "Knights" theme.
 *
 * Rather than using heavy video backgrounds or large static PNG bitmaps (which consume tens of
 * megabytes of GPU texture memory and do not scale dynamically), Knightly uses a lightweight,
 * procedurally generated vector starfield rendered via React Native Reanimated worklets.
 *
 * KEY AESTHETIC & MATHEMATICAL INVARIANTS:
 * 1. 5:3:1 Astrophotography Ratio:
 *    Real stellar fields feature vastly more distant, faint stars than bright foreground stars.
 *    Dividing the star count into 5 parts distant (tiny, faint), 3 parts midground, and 1 part
 *    foreground (large, glowing with Calvin Gold accents) produces natural cosmic depth.
 * 2. Responsive Area Density Scaling:
 *    Calibrated against a Google Pixel 9a (412x915 dp) baseline. Scales star counts up on iPads,
 *    tablets, and desktop viewports while capping at 8x to protect framerates.
 * 3. Deterministic Seed-Based PRNG:
 *    Uses a Linear Congruential Generator (LCG) with fixed seeds (1337, 4242, 9999) so stars never
 *    jump or scramble when the view re-renders.
 */

export type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  isSparkle?: boolean;
};

/** Reference viewport dimensions for Google Pixel 9a (412x915 dp) */
export const PIXEL_9A_WIDTH = 412;
export const PIXEL_9A_HEIGHT = 915;

/** Reference canvas area on a Pixel 9a, with horizontal tab overscroll and vertical scroll depth */
export const BASE_CANVAS_AREA = (PIXEL_9A_WIDTH * 2.2) * (PIXEL_9A_HEIGHT + 900);

/** Base foreground star count on a Pixel 9a (ratio 5:3:1 => 120 distant, 72 midground, 24 foreground) */
export const BASE_FOREGROUND_COUNT = 24;

/**
 * Calculates responsive star counts that scale with screen/canvas area while strictly
 * preserving the 5:3:1 ratio (distant : midground : foreground).
 *
 * WHY SCALING IS CAPPED AT 8x:
 * Prevents extreme multi-monitor desktop setups (e.g. 5120x1440 ultrawide displays)
 * from generating thousands of Animated.View nodes, which would degrade garbage collection
 * and Reanimated thread performance.
 */
export function calculateStarCounts(
  canvasWidth: number,
  canvasHeight: number,
): {
  distant: number;
  midground: number;
  foreground: number;
  baseUnit: number;
  ratio: readonly [5, 3, 1];
} {
  const canvasArea = canvasWidth * canvasHeight;
  const scale = Math.min(Math.max(1, canvasArea / BASE_CANVAS_AREA), 8);
  const baseUnit = Math.max(1, Math.round(BASE_FOREGROUND_COUNT * scale));

  return {
    distant: baseUnit * 5,
    midground: baseUnit * 3,
    foreground: baseUnit * 1,
    baseUnit,
    ratio: [5, 3, 1] as const,
  };
}

/**
 * Procedurally generates stars with deterministic coordinates, sizes, and opacities.
 *
 * WHY DETERMINISTIC LCG (s * 9301 + 49297 % 233280):
 * If standard `Math.random()` were used, stars would randomize on every hot reload or state change,
 * producing distracting visual flicker. The seed ensures deterministic coordinates across renders.
 */
export function generateStars(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  seed: number,
  sizeRange: [number, number],
  opacityRange: [number, number],
  colors: string[],
): Star[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * canvasWidth;
    const y = rand() * canvasHeight;
    const size =
      Math.round((sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0])) * 10) /
      10;
    const opacity =
      Math.round(
        (opacityRange[0] + rand() * (opacityRange[1] - opacityRange[0])) * 100,
      ) / 100;
    const color = colors[Math.floor(rand() * colors.length)];
    const isSparkle = size >= 3.4 && rand() > 0.65;
    stars.push({ id: i, x, y, size, opacity, color, isSparkle });
  }
  return stars;
}
