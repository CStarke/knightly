import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BASE_CANVAS_AREA,
  BASE_FOREGROUND_COUNT,
  PIXEL_9A_HEIGHT,
  PIXEL_9A_WIDTH,
  calculateStarCounts,
  generateStars,
} from '@/constants/starfield';

describe('Starfield Responsive Scaling & 5:3:1 Ratio Domain', () => {
  describe('Pixel 9a Baseline Reference', () => {
    it('produces exactly 150 distant, 90 midground, and 30 foreground stars on Pixel 9a', () => {
      const canvasWidth = PIXEL_9A_WIDTH * 2.2;
      const canvasHeight = PIXEL_9A_HEIGHT + 900;
      const counts = calculateStarCounts(canvasWidth, canvasHeight);

      assert.strictEqual(counts.baseUnit, 30);
      assert.strictEqual(counts.distant, 150);
      assert.strictEqual(counts.midground, 90);
      assert.strictEqual(counts.foreground, 30);
      assert.deepStrictEqual(counts.ratio, [5, 3, 1]);
    });

    it('verifies exact 5:3:1 ratio on the Pixel 9a baseline', () => {
      const canvasWidth = PIXEL_9A_WIDTH * 2.2;
      const canvasHeight = PIXEL_9A_HEIGHT + 900;
      const counts = calculateStarCounts(canvasWidth, canvasHeight);

      assert.strictEqual(counts.distant / counts.foreground, 5);
      assert.strictEqual(counts.midground / counts.foreground, 3);
    });
  });

  describe('Responsive Scaling on Different Screen Sizes', () => {
    it('scales up star count on larger phone screens (e.g. Pixel 9 Pro XL, iPhone 16 Pro Max)', () => {
      // iPhone 16 Pro Max: 430 x 932
      const proMaxCanvasW = 430 * 2.2;
      const proMaxCanvasH = 932 + 900;
      const proMaxCounts = calculateStarCounts(proMaxCanvasW, proMaxCanvasH);

      assert.ok(proMaxCounts.foreground >= 30, 'Should have at least baseline foreground stars');
      assert.ok(proMaxCounts.distant >= 150, 'Should have at least baseline distant stars');
      assert.strictEqual(proMaxCounts.distant / proMaxCounts.foreground, 5);
      assert.strictEqual(proMaxCounts.midground / proMaxCounts.foreground, 3);
    });

    it('scales up substantially on tablet screens (e.g. iPad 11-inch)', () => {
      // iPad 11-inch: 834 x 1194
      const tabletCanvasW = 834 * 2.2;
      const tabletCanvasH = 1194 + 900;
      const tabletCounts = calculateStarCounts(tabletCanvasW, tabletCanvasH);

      assert.ok(tabletCounts.baseUnit >= 60, 'Tablet base unit should be at least double a phone');
      assert.ok(tabletCounts.distant >= 300, 'Tablet distant stars should be at least 300');
      assert.ok(tabletCounts.midground >= 180, 'Tablet midground stars should be at least 180');
      assert.ok(tabletCounts.foreground >= 60, 'Tablet foreground stars should be at least 60');

      // Check 5:3:1 ratio
      assert.strictEqual(tabletCounts.distant, tabletCounts.baseUnit * 5);
      assert.strictEqual(tabletCounts.midground, tabletCounts.baseUnit * 3);
      assert.strictEqual(tabletCounts.foreground, tabletCounts.baseUnit * 1);
    });

    it('scales up for desktop web viewports (e.g. 1920x1080 Full HD)', () => {
      // Desktop Full HD: 1920 x 1080
      const webCanvasW = 1920 * 2.2;
      const webCanvasH = 1080 + 900;
      const webCounts = calculateStarCounts(webCanvasW, webCanvasH);

      assert.ok(webCounts.baseUnit >= 140, 'Desktop web should have at least 140 base unit');
      assert.ok(webCounts.distant >= 700, 'Desktop web should have at least 700 distant stars');
      assert.ok(webCounts.midground >= 420, 'Desktop web should have at least 420 midground stars');
      assert.ok(webCounts.foreground >= 140, 'Desktop web should have at least 140 foreground stars');

      // Strictly 5:3:1
      assert.strictEqual(webCounts.distant / webCounts.foreground, 5);
      assert.strictEqual(webCounts.midground / webCounts.foreground, 3);
    });

    it('maintains baseline star count on small phone screens without dropping below minimum', () => {
      // Compact phone: 360 x 640
      const smallCanvasW = 360 * 2.2;
      const smallCanvasH = 640 + 900;
      const smallCounts = calculateStarCounts(smallCanvasW, smallCanvasH);

      assert.strictEqual(smallCounts.baseUnit, 30, 'Should not drop below 30 base unit');
      assert.strictEqual(smallCounts.distant, 150);
      assert.strictEqual(smallCounts.midground, 90);
      assert.strictEqual(smallCounts.foreground, 30);
    });

    it('clamps scaling at maximum of 8x on extreme multi-monitor or ultra-wide setups', () => {
      // Extreme resolution: 7680 x 4320 (8K)
      const extremeCanvasW = 7680 * 2.2;
      const extremeCanvasH = 4320 + 900;
      const extremeCounts = calculateStarCounts(extremeCanvasW, extremeCanvasH);

      const maxBaseUnit = BASE_FOREGROUND_COUNT * 8; // 240
      assert.strictEqual(extremeCounts.baseUnit, maxBaseUnit);
      assert.strictEqual(extremeCounts.distant, maxBaseUnit * 5); // 1200
      assert.strictEqual(extremeCounts.midground, maxBaseUnit * 3); // 720
      assert.strictEqual(extremeCounts.foreground, maxBaseUnit * 1); // 240
      assert.strictEqual(extremeCounts.distant / extremeCounts.foreground, 5);
      assert.strictEqual(extremeCounts.midground / extremeCounts.foreground, 3);
    });
  });

  describe('Star Generation Invariants', () => {
    it('generates stars within valid canvas bounds and assigned properties', () => {
      const width = 1000;
      const height = 2000;
      const stars = generateStars(
        50,
        width,
        height,
        1337,
        [1.5, 3.0],
        [0.2, 0.8],
        ['#FFFFFF', '#C9A900']
      );

      assert.strictEqual(stars.length, 50);
      for (const star of stars) {
        assert.ok(star.x >= 0 && star.x <= width, `x coordinate ${star.x} must be within canvas width`);
        assert.ok(star.y >= 0 && star.y <= height, `y coordinate ${star.y} must be within canvas height`);
        assert.ok(star.size >= 1.5 && star.size <= 3.0, `size ${star.size} must be within range`);
        assert.ok(star.opacity >= 0.2 && star.opacity <= 0.8, `opacity ${star.opacity} must be within range`);
        assert.ok(['#FFFFFF', '#C9A900'].includes(star.color), `color ${star.color} must be from palette`);
      }
    });

    it('generates deterministic star positions given the same seed', () => {
      const stars1 = generateStars(20, 500, 1000, 4242, [2, 4], [0.3, 0.7], ['#FFF']);
      const stars2 = generateStars(20, 500, 1000, 4242, [2, 4], [0.3, 0.7], ['#FFF']);

      assert.deepStrictEqual(stars1, stars2, 'Identical seed and parameters must produce identical starfield');
    });

    it('generates distinct star positions when different seeds are provided', () => {
      const starsA = generateStars(20, 500, 1000, 101, [2, 4], [0.3, 0.7], ['#FFF']);
      const starsB = generateStars(20, 500, 1000, 202, [2, 4], [0.3, 0.7], ['#FFF']);

      assert.notDeepStrictEqual(starsA, starsB, 'Different seeds must produce different starfields');
    });

    it('distributes stars across all four screen quadrants', () => {
      const width = 1000;
      const height = 1000;
      const stars = generateStars(100, width, height, 9999, [1, 3], [0.5, 1.0], ['#FFF']);

      const midX = width / 2;
      const midY = height / 2;

      const q1 = stars.filter((s) => s.x < midX && s.y < midY); // Top-left
      const q2 = stars.filter((s) => s.x >= midX && s.y < midY); // Top-right
      const q3 = stars.filter((s) => s.x < midX && s.y >= midY); // Bottom-left
      const q4 = stars.filter((s) => s.x >= midX && s.y >= midY); // Bottom-right

      assert.ok(q1.length >= 10, 'Top-left quadrant should have stars');
      assert.ok(q2.length >= 10, 'Top-right quadrant should have stars');
      assert.ok(q3.length >= 10, 'Bottom-left quadrant should have stars');
      assert.ok(q4.length >= 10, 'Bottom-right quadrant should have stars');
    });

    it('distributes star colors across the provided color palette', () => {
      const colors = ['#FFFFFF', '#C9A900', '#71B1C8'];
      const stars = generateStars(90, 800, 1200, 7777, [2, 3], [0.4, 0.8], colors);

      for (const color of colors) {
        const matching = stars.filter((s) => s.color === color);
        assert.ok(matching.length >= 10, `Color ${color} should be represented in star distribution`);
      }
    });

    it('scales purely based on canvas area invariant of viewport aspect ratio', () => {
      // Two viewports with the exact same area: 1000x2000 vs 2000x1000
      const countsA = calculateStarCounts(1000, 2000);
      const countsB = calculateStarCounts(2000, 1000);

      assert.strictEqual(countsA.baseUnit, countsB.baseUnit);
      assert.strictEqual(countsA.distant, countsB.distant);
      assert.strictEqual(countsA.midground, countsB.midground);
      assert.strictEqual(countsA.foreground, countsB.foreground);
    });

    it('handles degenerate zero or negative canvas sizes safely', () => {
      const zeroCounts = calculateStarCounts(0, 0);
      assert.strictEqual(zeroCounts.baseUnit, 30);
      assert.strictEqual(zeroCounts.distant, 150);
      assert.strictEqual(zeroCounts.midground, 90);
      assert.strictEqual(zeroCounts.foreground, 30);

      const negativeCounts = calculateStarCounts(-500, -500);
      assert.strictEqual(negativeCounts.baseUnit, 30);
    });
  });
});
