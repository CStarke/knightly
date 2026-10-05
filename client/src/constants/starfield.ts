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
 * 2. Standard Area Density Scaling (per 10,000 px²):
 *    Rather than coupling star counts to a specific hardware device screen baseline, star counts
 *    scale uniformly with canvas area at a standardized density per 10,000 square pixels (px²).
 *    Scales star counts smoothly across all device sizes (compact phones, tablets, and wide web
 *    monitors) while capping at a maximum ceiling to protect framerates and Reanimated UI performance.
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

/**
 * Standard unit area for starfield density calculations (10,000 pixels²).
 * WHY 10,000 px²:
 * A 100x100 pixel square is an intuitive, standard spatial benchmark across mobile and web
 * display densities.
 */
export const STAR_DENSITY_UNIT_AREA_PX = 10_000;

/**
 * Standard star density: ~1.3 stars per 10,000 px² across all depth layers.
 * WHY 1.3 STARS / 10k px²:
 * Produces ~200-220 total stars on standard mobile canvases (~1.5M-1.65M px² wide virtual canvas),
 * preserving optimal ambient cosmic depth without visual clutter or GPU overdraw.
 */
export const STARS_PER_10K_PX = 1.3;

/**
 * Maximum total star ceiling across all layers combined.
 * WHY CAP AT 1800 STARS:
 * Prevents extreme multi-monitor desktop setups (e.g. 5120x1440 ultrawide displays)
 * from generating thousands of Animated.View nodes, which would degrade garbage collection
 * and Reanimated thread performance.
 */
export const MAX_TOTAL_STARS = 1800;

/**
 * Minimum total stars to ensure even tiny test viewports render a visible skybox.
 */
export const MIN_TOTAL_STARS = 9; // 1 base unit => 5 distant, 3 midground, 1 foreground

/**
 * Calculates responsive star counts that scale with screen/canvas area based on a standard
 * density per 10,000 square pixels while strictly preserving the 5:3:1 ratio
 * (distant : midground : foreground).
 *
 * @param canvasWidth - Total canvas width in pixels
 * @param canvasHeight - Total canvas height in pixels
 * @param densityPer10kPx - Stars per 10,000 px² (defaults to STARS_PER_10K_PX = 1.3)
 * @returns Object with counts for each depth layer, the base unit, total count, and ratio
 */
export function calculateStarCounts(
  canvasWidth: number,
  canvasHeight: number,
  densityPer10kPx: number = STARS_PER_10K_PX,
): {
  distant: number;
  midground: number;
  foreground: number;
  baseUnit: number;
  total: number;
  ratio: readonly [5, 3, 1];
} {
  // Step 1: Calculate total canvas area in square pixels (guarding against negative bounds)
  const canvasArea = Math.max(0, canvasWidth * canvasHeight);

  // Step 2: Compute target total stars using the standard area density (per 10,000 px²)
  const rawTotalStars = (canvasArea / STAR_DENSITY_UNIT_AREA_PX) * Math.max(0, densityPer10kPx);

  // Step 3: Clamp total stars within [MIN_TOTAL_STARS, MAX_TOTAL_STARS]
  const clampedTotal = Math.min(Math.max(MIN_TOTAL_STARS, rawTotalStars), MAX_TOTAL_STARS);

  // Step 4: Resolve base unit for the 5:3:1 ratio (5 + 3 + 1 = 9 total ratio units)
  // WHY ROUNDING BASE UNIT: Guarantees each layer has exact integer star counts while preserving 5:3:1
  const baseUnit = Math.max(1, Math.round(clampedTotal / 9));

  return {
    distant: baseUnit * 5,
    midground: baseUnit * 3,
    foreground: baseUnit * 1,
    baseUnit,
    total: baseUnit * 9,
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
