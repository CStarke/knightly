import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateStarCounts,
  generateStars,
  MAX_TOTAL_STARS,
  MIN_TOTAL_STARS,
  STAR_DENSITY_UNIT_AREA_PX,
  STARS_PER_10K_PX,
} from '@/constants/starfield';

describe('Parallax Starfield Density & Procedural Generator Invariants', () => {
  it('defines standard density constants decoupled from hardware-specific screen baselines', () => {
    assert.strictEqual(
      STAR_DENSITY_UNIT_AREA_PX,
      10000,
      'Standard area density unit must be 10,000 px²'
    );
    assert.strictEqual(
      STARS_PER_10K_PX,
      1.3,
      'Default star density should be 1.3 stars per 10,000 px²'
    );
    assert.strictEqual(
      MAX_TOTAL_STARS,
      1800,
      'Max total star ceiling should be 1800 to protect 60/120fps UI performance'
    );
    assert.strictEqual(
      MIN_TOTAL_STARS,
      9,
      'Min total stars should be 9 (1 base unit of 5:3:1 ratio)'
    );
  });

  it('strictly preserves the 5:3:1 astrophotography ratio (distant : midground : foreground)', () => {
    const testCanvases = [
      { width: 400, height: 800 },
      { width: 800, height: 1600 },
      { width: 1200, height: 2400 },
      { width: 2560, height: 1440 },
    ];

    for (const { width, height } of testCanvases) {
      const counts = calculateStarCounts(width, height);
      assert.strictEqual(counts.ratio[0], 5);
      assert.strictEqual(counts.ratio[1], 3);
      assert.strictEqual(counts.ratio[2], 1);

      assert.strictEqual(
        counts.distant,
        counts.baseUnit * 5,
        `Distant layer must be exactly 5x baseUnit for ${width}x${height}`
      );
      assert.strictEqual(
        counts.midground,
        counts.baseUnit * 3,
        `Midground layer must be exactly 3x baseUnit for ${width}x${height}`
      );
      assert.strictEqual(
        counts.foreground,
        counts.baseUnit * 1,
        `Foreground layer must be exactly 1x baseUnit for ${width}x${height}`
      );
      assert.strictEqual(
        counts.total,
        counts.baseUnit * 9,
        `Total stars must be exactly 9x baseUnit for ${width}x${height}`
      );
    }
  });

  it('scales star counts proportionally with canvas area per 10,000 px²', () => {
    // Canvas 1: 1,000,000 px² => 100 units of 10,000 px²
    // Expected raw: 100 * 1.3 = 130 stars => baseUnit = round(130 / 9) = 14 => total = 126
    const canvas1 = calculateStarCounts(1000, 1000);
    assert.strictEqual(canvas1.baseUnit, 14);
    assert.strictEqual(canvas1.total, 126);

    // Canvas 2: 2,000,000 px² => 200 units of 10,000 px² (2x area)
    // Expected raw: 200 * 1.3 = 260 stars => baseUnit = round(260 / 9) = 29 => total = 261 (~2x total)
    const canvas2 = calculateStarCounts(1000, 2000);
    assert.strictEqual(canvas2.baseUnit, 29);
    assert.strictEqual(canvas2.total, 261);

    // Verify doubling area approximately doubles star count
    const ratio = canvas2.total / canvas1.total;
    assert.ok(
      Math.abs(ratio - 2.0) < 0.15,
      `Doubling canvas area should approximately double star count (got ratio ${ratio})`
    );
  });

  it('supports custom density per 10,000 px²', () => {
    // 1,000,000 px² with 2.0 stars per 10,000 px² => 200 stars => baseUnit = round(200 / 9) = 22 => 198 total
    const counts = calculateStarCounts(1000, 1000, 2.0);
    assert.strictEqual(counts.baseUnit, 22);
    assert.strictEqual(counts.total, 198);
  });

  it('safely clamps star counts on extreme and zero viewports', () => {
    // 1. Extreme ultrawide / 8K display: 8000x4000 = 32,000,000 px²
    // 3,200 * 1.3 = 4,160 stars => should be capped at MAX_TOTAL_STARS (1800)
    const ultrawide = calculateStarCounts(8000, 4000);
    assert.strictEqual(ultrawide.total, MAX_TOTAL_STARS);
    assert.strictEqual(ultrawide.baseUnit, 200); // 1800 / 9 = 200

    // 2. Zero / negative canvas dimensions
    const zeroCanvas = calculateStarCounts(0, 0);
    assert.strictEqual(zeroCanvas.total, MIN_TOTAL_STARS);
    assert.strictEqual(zeroCanvas.baseUnit, 1);

    const negativeCanvas = calculateStarCounts(-500, 800);
    assert.strictEqual(negativeCanvas.total, MIN_TOTAL_STARS);
    assert.strictEqual(negativeCanvas.baseUnit, 1);
  });

  it('generates deterministic stars via LCG PRNG without visual scramble', () => {
    const starsRun1 = generateStars(
      20,
      800,
      1600,
      1337,
      [1.3, 2.0],
      [0.35, 0.58],
      ['#FFFFFF', '#E8B019']
    );

    const starsRun2 = generateStars(
      20,
      800,
      1600,
      1337,
      [1.3, 2.0],
      [0.35, 0.58],
      ['#FFFFFF', '#E8B019']
    );

    assert.strictEqual(starsRun1.length, 20);
    assert.strictEqual(starsRun2.length, 20);

    for (let i = 0; i < 20; i++) {
      assert.strictEqual(starsRun1[i].id, starsRun2[i].id);
      assert.strictEqual(starsRun1[i].x, starsRun2[i].x);
      assert.strictEqual(starsRun1[i].y, starsRun2[i].y);
      assert.strictEqual(starsRun1[i].size, starsRun2[i].size);
      assert.strictEqual(starsRun1[i].opacity, starsRun2[i].opacity);
      assert.strictEqual(starsRun1[i].color, starsRun2[i].color);
      assert.strictEqual(starsRun1[i].isSparkle, starsRun2[i].isSparkle);
    }
  });
});
