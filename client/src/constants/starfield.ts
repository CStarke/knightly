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

/** Base foreground star count on a Pixel 9a (ratio 5:3:1 => 150 distant, 90 midground, 30 foreground) */
export const BASE_FOREGROUND_COUNT = 30;

/**
 * Calculates responsive star counts that scale with screen/canvas area while strictly
 * preserving the 5:3:1 ratio (distant : midground : foreground).
 * - Distant stars: 5x baseUnit
 * - Midground stars: 3x baseUnit
 * - Foreground stars: 1x baseUnit
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
  // Scale with canvas area relative to Pixel 9a baseline.
  // Phone screens at or smaller than Pixel 9a maintain the baseline density (scale >= 1.0),
  // while larger phones, foldables, tablets, and desktop web scale up to fill the viewport.
  // Capped at 8x to prevent excessive DOM/View nodes on extreme multi-monitor setups.
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
    const isSparkle = size >= 2.8 && rand() > 0.45;
    stars.push({ id: i, x, y, size, opacity, color, isSparkle });
  }
  return stars;
}
