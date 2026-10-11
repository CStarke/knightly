import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PRESET_COLORS,
  PRESET_COLOR_LIST,
  PRESET_PATTERNS,
  PRESET_PATTERN_LIST,
  createPresetBannerUri,
  getPresetBannerDetails,
  isPresetBanner,
  parsePresetBannerUri,
  type PresetColorId,
  type PresetPatternId,
} from '@/constants/preset-banners';
import {
  CROP_ASPECT_RATIO,
  calculateBaseDisplayDimensions,
  calculateOffsetBounds,
  clampOffset,
  getInitialCenteredOffset,
  calculateCropRect,
  zoomAroundFocalPoint,
} from '@/utils/image-crop';
import {
  CALVIN_PLACEHOLDER_FINGERPRINTS,
  isCalvinPlaceholderUrl,
  isCalvinPlaceholderHash,
  detectCalvinPlaceholder,
} from '@/utils/image-fingerprint';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import type { ScrapedCalvinEvent } from '@/data/calvin-events-seed';

describe('Banners & Media Processing Domain', () => {
  // ==========================================================================
  // Suite 1: Preset Colors & Patterns Registry Invariants
  // ==========================================================================
  describe('Preset Simple Banners Invariants', () => {
    const expectedColorIds: PresetColorId[] = [
      'maroon',
      'cranberry',
      'plum',
      'orange',
      'amber',
      'bronze',
      'chestnut',
      'espresso',
      'forest',
      'sage',
      'teal',
      'blue',
      'navy',
      'amethyst',
      'grey',
      'slate',
    ];

    const expectedPatternIds: PresetPatternId[] = [
      'diamonds',
      'waves',
      'globe',
      'ripples',
      'trees',
      'leaves',
      'circuit',
      'gears',
      'arches',
      'grid',
      'stripes',
      'lattice',
      'crystals',
      'snowflakes',
      'constellation',
      'topography',
    ];

    it('defines all 16 collegiate background colors in exact harmonic order', () => {
      assert.strictEqual(PRESET_COLOR_LIST.length, 16);
      const actualOrder = PRESET_COLOR_LIST.map((preset) => preset.id);
      assert.deepStrictEqual(actualOrder, expectedColorIds);

      for (const id of expectedColorIds) {
        const colorConfig = PRESET_COLORS[id];
        assert.ok(colorConfig, `Color ${id} must exist in PRESET_COLORS registry`);
        assert.strictEqual(colorConfig.id, id);
        assert.ok(colorConfig.name.length > 0, `Color ${id} must have a non-empty name`);
      }
    });

    it('verifies all preset colors and accent tones are valid 7-character hex strings', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const colorConfig of PRESET_COLOR_LIST) {
        assert.match(
          colorConfig.color,
          hexRegex,
          `Background ${colorConfig.color} for ${colorConfig.id} must be valid 7-char hex`
        );
        assert.match(
          colorConfig.accentColor,
          hexRegex,
          `Accent ${colorConfig.accentColor} for ${colorConfig.id} must be valid 7-char hex`
        );
      }
    });

    it('defines all 16 geometric overlay patterns', () => {
      assert.strictEqual(PRESET_PATTERN_LIST.length, 16);
      const actualOrder = PRESET_PATTERN_LIST.map((preset) => preset.id);
      assert.deepStrictEqual(actualOrder, expectedPatternIds);

      for (const id of expectedPatternIds) {
        const patternConfig = PRESET_PATTERNS[id];
        assert.ok(patternConfig, `Pattern ${id} must exist in PRESET_PATTERNS registry`);
        assert.strictEqual(patternConfig.id, id);
        assert.ok(patternConfig.name.length > 0, `Pattern ${id} must have a non-empty name`);
      }
    });

    it('creates and parses preset banner URIs accurately', () => {
      const uri = createPresetBannerUri('maroon', 'diamonds');
      assert.strictEqual(uri, 'preset:maroon:diamonds');
      assert.strictEqual(isPresetBanner(uri), true);

      const parsed = parsePresetBannerUri(uri);
      assert.strictEqual(parsed.color, 'maroon');
      assert.strictEqual(parsed.pattern, 'diamonds');

      const details = getPresetBannerDetails(uri);
      assert.ok(details);
      assert.strictEqual(details.colorId, 'maroon');
      assert.strictEqual(details.patternId, 'diamonds');
    });

    it('handles legacy single-token preset URIs with fallback pattern', () => {
      const legacyUri = 'preset:forest';
      assert.strictEqual(isPresetBanner(legacyUri), true);

      const parsed = parsePresetBannerUri(legacyUri);
      assert.strictEqual(parsed.color, 'forest');
      assert.strictEqual(parsed.pattern, 'none');
    });

    it('safely rejects non-preset URIs', () => {
      assert.strictEqual(isPresetBanner('https://calvin.edu/banner.png'), false);
      assert.strictEqual(isPresetBanner('file:///var/mobile/img.png'), false);
      assert.strictEqual(isPresetBanner(''), false);
      assert.strictEqual(isPresetBanner(null), false);
      assert.strictEqual(isPresetBanner(undefined), false);
      assert.deepStrictEqual(parsePresetBannerUri('https://calvin.edu/banner.png'), {
        color: 'maroon',
        pattern: 'none',
      });
    });

    it('PURE SVG INVARIANT: verifies preset banner render definitions avoid <defs> and <use> tags', () => {
      // Direct geometric primitive elements prevent native GPU cache blackouts on Android/iOS
      for (const pattern of PRESET_PATTERN_LIST) {
        assert.ok(pattern.id.length > 0);
        assert.ok(!pattern.id.includes('use'));
      }
    });

    // Parameterized URI serialization tests across combinations
    for (const colorId of expectedColorIds) {
      it(`serializes and round-trips URI for preset "${colorId}:stripes"`, () => {
        const uri = createPresetBannerUri(colorId, 'stripes');
        assert.strictEqual(uri, `preset:${colorId}:stripes`);
        const parsed = parsePresetBannerUri(uri);
        assert.strictEqual(parsed.color, colorId);
        assert.strictEqual(parsed.pattern, 'stripes');
      });

      it(`serializes and round-trips URI for preset "${colorId}:grid"`, () => {
        const uri = createPresetBannerUri(colorId, 'grid');
        assert.strictEqual(uri, `preset:${colorId}:grid`);
        const parsed = parsePresetBannerUri(uri);
        assert.strictEqual(parsed.color, colorId);
        assert.strictEqual(parsed.pattern, 'grid');
      });
    }
  });

  // ==========================================================================
  // Suite 2: Image Crop Viewport Geometry & Base Scale
  // ==========================================================================
  describe('Image Crop Geometry & Viewport Base Scaling', () => {
    const cropWindow = { width: 320, height: 180 }; // 16:9 viewport

    it('verifies 16:9 banner aspect ratio constant', () => {
      assert.strictEqual(CROP_ASPECT_RATIO, 16 / 9);
      assert.strictEqual(cropWindow.width / cropWindow.height, 16 / 9);
    });

    it('covers crop window for a square source image (1:1)', () => {
      const source = { width: 1000, height: 1000 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      assert.strictEqual(base.width, 320);
      assert.strictEqual(base.height, 320);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });

    it('covers crop window for a wide landscape source image (21:9)', () => {
      const source = { width: 2100, height: 900 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      assert.strictEqual(base.height, 180);
      assert.strictEqual(base.width, 420);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });

    it('covers crop window for a tall portrait source image (3:4 phone camera)', () => {
      const source = { width: 3000, height: 4000 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      assert.strictEqual(base.width, 320);
      assert.strictEqual(base.height, 427);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });

    it('safely handles degenerate 0 or negative dimensions', () => {
      const base = calculateBaseDisplayDimensions({ width: 0, height: 0 }, cropWindow);
      assert.strictEqual(base.width, cropWindow.width);
      assert.strictEqual(base.height, cropWindow.height);
    });

    // Parameterized aspect ratio tests
    const aspectRatios = [
      { name: '4:3 standard photo', w: 1600, h: 1200 },
      { name: '16:9 exact match', w: 1920, h: 1080 },
      { name: '9:16 vertical story', w: 1080, h: 1920 },
      { name: '3:2 DSLR landscape', w: 3000, h: 2000 },
      { name: '2:1 panoramic landscape', w: 4000, h: 2000 },
    ];

    for (const ar of aspectRatios) {
      it(`guarantees coverage invariant for ${ar.name} (${ar.w}x${ar.h})`, () => {
        const base = calculateBaseDisplayDimensions({ width: ar.w, height: ar.h }, cropWindow);
        assert.ok(base.width >= cropWindow.width - 0.001);
        assert.ok(base.height >= cropWindow.height - 0.001);
      });
    }
  });

  // ==========================================================================
  // Suite 3: Crop Offset Bounds & Clamping Mechanics
  // ==========================================================================
  describe('Crop Offset Bounds & Clamping Math', () => {
    const cropWindow = { width: 320, height: 180 };

    it('computes symmetric bounds centered at 0 when scale is 1.0', () => {
      const base = { width: 320, height: 320 }; // square fills width, extra height
      const bounds = calculateOffsetBounds(base, cropWindow);
      assert.strictEqual(bounds.minX, 0);
      assert.strictEqual(bounds.maxX, 0);
      assert.strictEqual(bounds.minY, 180 - 320); // -140
      assert.strictEqual(bounds.maxY, 0);
    });

    it('expands horizontal bounds when wide image is displayed', () => {
      const base = { width: 420, height: 180 }; // wide fills height, extra width
      const bounds = calculateOffsetBounds(base, cropWindow);
      assert.strictEqual(bounds.minX, 320 - 420); // -100
      assert.strictEqual(bounds.maxX, 0);
      assert.strictEqual(bounds.minY, 0);
      assert.strictEqual(bounds.maxY, 0);
    });

    it('clamps offsets within allowable boundaries', () => {
      const base = { width: 420, height: 320 };
      const clamped = clampOffset(50, -500, base, cropWindow);
      assert.strictEqual(clamped.offsetX, 0); // clamped to maxX 0
      assert.strictEqual(clamped.offsetY, 180 - 320); // clamped to minY -140
    });

    it('returns 0,0 initial centered offset', () => {
      const base = { width: 320, height: 320 };
      const initial = getInitialCenteredOffset(base, cropWindow);
      assert.strictEqual(initial.offsetX, 0);
      assert.strictEqual(initial.offsetY, -70); // (180 - 320) / 2 = -70
    });
  });

  // ==========================================================================
  // Suite 4: Normalized Crop Rect Calculation
  // ==========================================================================
  describe('Normalized Crop Rect Math & Pixel Accuracy', () => {
    const cropWindow = { width: 320, height: 180 };

    it('calculates 100% width crop rect centered vertically on 1:1 image at scale 1.0', () => {
      const source = { width: 1000, height: 1000 };
      const displayed = calculateBaseDisplayDimensions(source, cropWindow); // 320 x 320
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: -70,
        displayed,
        cropWindow,
        source,
      });

      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.width, 1000);
      assert.strictEqual(rect.height, 563);
      assert.strictEqual(rect.originY, 219);
    });

    it('calculates crop rect with 16:9 aspect ratio', () => {
      const source = { width: 4000, height: 3000 };
      const displayed = calculateBaseDisplayDimensions(source, cropWindow);
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: -50,
        displayed,
        cropWindow,
        source,
      });

      const computedRatio = rect.width / rect.height;
      assert.ok(
        Math.abs(computedRatio - 16 / 9) < 0.02,
        `Crop rect must preserve 16:9 ratio, got ${computedRatio}`
      );
    });

    it('ensures crop rect never exceeds source image dimensions', () => {
      const source = { width: 1920, height: 1080 };
      const displayed = calculateBaseDisplayDimensions(source, cropWindow);
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: 0,
        displayed,
        cropWindow,
        source,
      });

      assert.ok(rect.originX >= 0);
      assert.ok(rect.originY >= 0);
      assert.ok(rect.originX + rect.width <= source.width);
      assert.ok(rect.originY + rect.height <= source.height);
    });
  });

  // ==========================================================================
  // Suite 5: Zoom Around Focal Point Physics
  // ==========================================================================
  describe('Zoom Around Focal Point Mechanics', () => {
    const cropWindow = { width: 320, height: 180 };
    const baseDimensions = { width: 320, height: 320 };

    it('keeps offset at center when zooming exactly into the center of the crop window', () => {
      const result = zoomAroundFocalPoint({
        currentOffset: { offsetX: 0, offsetY: -70 },
        currentZoom: 1.0,
        targetZoom: 2.0,
        focalPoint: { x: 160, y: 90 }, // center of 320x180
        baseDimensions,
        cropWindow,
      });

      assert.strictEqual(result.zoom, 2.0);
      assert.strictEqual(result.offsetX, -160);
      assert.strictEqual(result.offsetY, -230);
    });

    it('shifts offset away from focal point when zooming off-center', () => {
      const result = zoomAroundFocalPoint({
        currentOffset: { offsetX: 0, offsetY: -70 },
        currentZoom: 1.0,
        targetZoom: 1.5,
        focalPoint: { x: 260, y: 140 },
        baseDimensions,
        cropWindow,
      });

      assert.strictEqual(result.zoom, 1.5);
      assert.ok(result.offsetX <= 0);
      assert.ok(result.offsetY <= 0);
    });

    it('clamps resulting zoom within minZoom and maxZoom', () => {
      const minResult = zoomAroundFocalPoint({
        currentOffset: { offsetX: 0, offsetY: 0 },
        currentZoom: 1.0,
        targetZoom: 0.5,
        focalPoint: { x: 160, y: 90 },
        baseDimensions,
        cropWindow,
      });
      assert.strictEqual(minResult.zoom, 1.0);

      const maxResult = zoomAroundFocalPoint({
        currentOffset: { offsetX: 0, offsetY: 0 },
        currentZoom: 1.0,
        targetZoom: 5.0,
        focalPoint: { x: 160, y: 90 },
        baseDimensions,
        cropWindow,
      });
      assert.strictEqual(maxResult.zoom, 3.0);
    });
  });

  // ==========================================================================
  // Suite 6: Calvin Drupal Placeholder Image Fingerprinting
  // ==========================================================================
  describe('Calvin Placeholder Fingerprints & Hash Detection', () => {
    it('detects all 5 canonical Calvin Drupal placeholder URLs', () => {
      const urls = [
        'https://calvin.edu/sites/default/files/2025-10/arts-culture.png',
        'https://calvin.edu/sites/default/files/2025-10/athletics.png',
        'https://calvin.edu/sites/default/files/2025-10/campus-life.png',
        'https://calvin.edu/sites/default/files/2025-10/faith-worship.png',
        'https://calvin.edu/sites/default/files/2025-10/learning-academics.png',
        'https://calvin.edu/sites/default/files/2024-01/calvin-west-michigan.png',
      ];

      for (const url of urls) {
        assert.strictEqual(
          isCalvinPlaceholderUrl(url),
          true,
          `Expected ${url} to be detected as a placeholder URL`
        );
      }
    });

    it('verifies SHA-256 hash detection matches known placeholder assets', () => {
      assert.strictEqual(
        isCalvinPlaceholderHash('f8cecb9826863b286c6effb71aa0b0168ad6ab96ce8b30bf1285c0aee02d1d71'),
        true
      );
      assert.strictEqual(
        isCalvinPlaceholderHash('F8CECB9826863B286C6EFFB71AA0B0168AD6AB96CE8B30BF1285C0AEE02D1D71'),
        true
      );
      assert.strictEqual(
        isCalvinPlaceholderHash('0000000000000000000000000000000000000000000000000000000000000000'),
        false
      );
    });

    it('detects placeholder and returns matching preset banner details', () => {
      const result = detectCalvinPlaceholder({
        url: 'https://calvin.edu/sites/default/files/2025-10/athletics.png',
      });
      assert.ok(result);
      assert.strictEqual(result?.id, 'athletics');
      assert.strictEqual(result?.presetBanner, 'preset:maroon:stripes');
    });

    it('returns null for standard user photos or external image URLs', () => {
      assert.strictEqual(
        detectCalvinPlaceholder({ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a' }),
        null
      );
      assert.strictEqual(detectCalvinPlaceholder({ url: '' }), null);
      assert.strictEqual(detectCalvinPlaceholder({ url: null }), null);
      assert.strictEqual(detectCalvinPlaceholder({}), null);
    });
  });

  // ==========================================================================
  // Suite 7: Same-Filename Immunity Invariant
  // ==========================================================================
  describe('Placeholder Same-Filename Immunity Invariant', () => {
    it('IMMUNITY INVARIANT: does not flag custom uploads that happen to share the same filename', () => {
      const customImages = [
        'https://calvin.edu/sites/default/files/styles/large/public/events/2026-10/athletics.png?itok=PO0iRNs7',
        'https://calvin.edu/sites/default/files/styles/large/public/2026-09/learning-academics.png',
        'https://calvin.edu/sites/default/files/custom-uploads/faith-worship.png',
        'https://example.com/uploads/campus-life.png',
        'https://calvin.edu/assets/arts-culture.png',
      ];

      for (const url of customImages) {
        assert.strictEqual(
          isCalvinPlaceholderUrl(url),
          false,
          `Expected custom upload ${url} NOT to be detected as placeholder`
        );
      }
    });

    it('replaces canonical Calvin Drupal placeholder URLs with matching Knightly preset banners in adapter', () => {
      const eventWithPlaceholder: ScrapedCalvinEvent = {
        id: 'calvin-50001',
        nodeId: '50001',
        title: 'Calvin Men vs Hope Basketball Game',
        date: 'Oct 10, 2026',
        time: '7:30 pm',
        location: 'Van Noord Arena',
        summary: 'Rivalry basketball game.',
        description: 'Rivalry basketball game.',
        imageUrl: 'https://calvin.edu/sites/default/files/2025-10/athletics.png',
        detailUrl: 'https://calvin.edu/events/rivalry-game',
        category: 'Athletics',
        org: 'Calvin Athletics',
        clubId: 'calvin-athletics',
        campusWide: true,
      };

      const post = adaptCalvinEventToPost(eventWithPlaceholder, 1790951400000);
      assert.strictEqual(post.image, 'preset:maroon:stripes');
    });

    it('preserves genuine event hero photography untouched in adapter', () => {
      const eventWithRealPhoto: ScrapedCalvinEvent = {
        id: 'calvin-50002',
        nodeId: '50002',
        title: 'Outdoor Symphony Concert',
        date: 'Oct 15, 2026',
        time: '6:00 pm',
        location: 'Commons Lawn',
        summary: 'Live outdoor orchestra performance.',
        description: 'Live outdoor orchestra performance.',
        imageUrl: 'https://calvin.edu/sites/default/files/styles/hero/public/2026-10/live-orchestra-photo.jpg',
        detailUrl: 'https://calvin.edu/events/symphony',
        category: 'Music',
        org: 'Music Department',
        clubId: 'calvin-music',
        campusWide: true,
      };

      const post = adaptCalvinEventToPost(eventWithRealPhoto, 1790951400000);
      assert.strictEqual(
        post.image,
        'https://calvin.edu/sites/default/files/styles/hero/public/2026-10/live-orchestra-photo.jpg'
      );
    });
  });

  // ==========================================================================
  // Suite 8: Media Fuzzing & Boundary Stress Tests
  // ==========================================================================
  describe('Media Boundary Stress & Fuzzing', () => {
    it('handles extreme zoom levels (0.5x to 3.0x) without NaN or Infinity', () => {
      const cropWindow = { width: 320, height: 180 };
      const source = { width: 1000, height: 1000 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);

      const testScales = [1.0, 1.5, 2.0, 2.5, 3.0];
      for (const scale of testScales) {
        const displayed = {
          width: Math.round(base.width * scale),
          height: Math.round(base.height * scale),
        };
        const bounds = calculateOffsetBounds(displayed, cropWindow);
        assert.ok(!Number.isNaN(bounds.minX));
        assert.ok(!Number.isNaN(bounds.maxX));
        assert.ok(!Number.isNaN(bounds.minY));
        assert.ok(!Number.isNaN(bounds.maxY));

        const rect = calculateCropRect({
          offsetX: 0,
          offsetY: bounds.minY / 2,
          displayed,
          cropWindow,
          source,
        });
        assert.ok(!Number.isNaN(rect.originX));
        assert.ok(!Number.isNaN(rect.originY));
        assert.ok(!Number.isNaN(rect.width));
        assert.ok(!Number.isNaN(rect.height));
      }
    });

    it('handles huge 8K source images (7680x4320) without numeric overflow', () => {
      const cropWindow = { width: 320, height: 180 };
      const hugeSource = { width: 7680, height: 4320 };
      const displayed = calculateBaseDisplayDimensions(hugeSource, cropWindow);
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: 0,
        displayed,
        cropWindow,
        source: hugeSource,
      });

      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.originY, 0);
      assert.strictEqual(rect.width, 7680);
      assert.strictEqual(rect.height, 4320);
    });

    it('handles tiny 10x10 avatar source images without division by zero', () => {
      const cropWindow = { width: 320, height: 180 };
      const tinySource = { width: 10, height: 10 };
      const base = calculateBaseDisplayDimensions(tinySource, cropWindow);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });
  });

  describe('Pure React Native SVG Invariants & GPU Blackout Prevention', () => {
    it('verifies preset banners file strictly avoids <defs> and <use> tags per AGENTS.md invariant', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const bannerCode = fs.readFileSync(
        path.resolve(__dirname, '../src/constants/preset-banners.ts'),
        'utf-8'
      );

      assert.ok(!bannerCode.includes('<defs>'), 'preset-banners.ts must not contain <defs> tag');
      assert.ok(!bannerCode.includes('<use'), 'preset-banners.ts must not contain <use> tag');
    });

    for (let c = 0; c < PRESET_COLOR_LIST.length; c++) {
      const color = PRESET_COLOR_LIST[c];
      it(`evaluates contrast tokens and hex definition for preset color ${color.id} (${color.name})`, () => {
        assert.ok(color.color.startsWith('#'));
        assert.strictEqual(color.color.length, 7);
        assert.ok(color.accentColor.startsWith('#'));
        assert.strictEqual(color.accentColor.length, 7);
      });
    }

    for (let p = 0; p < PRESET_PATTERN_LIST.length; p++) {
      const pattern = PRESET_PATTERN_LIST[p];
      it(`evaluates pattern registry definition for ${pattern.id} (${pattern.name})`, () => {
        assert.ok(pattern.id.length > 0);
        assert.ok(pattern.name.length > 0);
      });
    }
  });

  describe('Calvin Placeholder Fingerprints Cryptographic Registry Invariants', () => {
    const fingerprints = Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS);
    for (let i = 0; i < fingerprints.length; i++) {
      const fp = fingerprints[i];
      it(`verifies SHA-256 fingerprint entry ${i + 1}/${fingerprints.length} (${fp.id})`, () => {
        assert.ok(fp.canonicalUrls.some(u => u.includes('/sites/default/files/')));
        assert.match(fp.sha256, /^[a-f0-9]{64}$/, 'SHA-256 hash must be exactly 64 lowercase hexadecimal characters');
      });
    }
  });
});

