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
        `Color ${colorConfig.id} background "${colorConfig.color}" must be a valid 7-char hex string`
      );
      assert.match(
        colorConfig.accentColor,
        hexRegex,
        `Color ${colorConfig.id} accent "${colorConfig.accentColor}" must be a valid 7-char hex string`
      );
    }
  });

  it('verifies Calvin Maroon pairs with official Collegiate Gold and other colors have designated accents', () => {
    assert.strictEqual(PRESET_COLORS.maroon.accentColor, '#E8B019');
    assert.strictEqual(PRESET_COLORS.forest.accentColor, '#A2D683');
    assert.strictEqual(PRESET_COLORS.navy.accentColor, '#71B1C8');
    assert.strictEqual(PRESET_COLORS.slate.accentColor, '#E8B019');
    assert.strictEqual(PRESET_COLORS.cranberry.accentColor, '#E29FB0');
    assert.strictEqual(PRESET_COLORS.plum.accentColor, '#E2B6D4');
    assert.strictEqual(PRESET_COLORS.chestnut.accentColor, '#F0D5B0');
    assert.strictEqual(PRESET_COLORS.espresso.accentColor, '#E8D4BA');
    assert.strictEqual(PRESET_COLORS.grey.accentColor, '#FFFFFF');
  });

  it('defines all 16 vector patterns and verifies each has valid mini icon and pattern assets', () => {
    assert.strictEqual(PRESET_PATTERN_LIST.length, 16);
    const actualPatterns = PRESET_PATTERN_LIST.map((p) => p.id);
    assert.deepStrictEqual(actualPatterns, expectedPatternIds);

    for (const id of expectedPatternIds) {
      const patternConfig = PRESET_PATTERNS[id];
      assert.ok(patternConfig, `Pattern ${id} must exist in PRESET_PATTERNS registry`);
      assert.ok(patternConfig.iconAsset !== null, `Mini icon asset for ${id} must be defined`);
      assert.ok(patternConfig.patternAsset !== null, `Pattern overlay asset for ${id} must be defined`);
    }

    // 'none' pattern (clean solid color) has null assets
    assert.strictEqual(PRESET_PATTERNS.none.id, 'none');
    assert.strictEqual(PRESET_PATTERNS.none.iconAsset, null);
    assert.strictEqual(PRESET_PATTERNS.none.patternAsset, null);
  });

  it('correctly discriminates preset URIs from external photo URIs and nullish values', () => {
    assert.strictEqual(isPresetBanner('preset:maroon:none'), true);
    assert.strictEqual(isPresetBanner('preset:maroon:diamonds'), true);
    assert.strictEqual(isPresetBanner('preset:navy:gears'), true);
    assert.strictEqual(isPresetBanner('preset:forest:trees'), true);

    // Negative cases
    assert.strictEqual(isPresetBanner('https://images.unsplash.com/photo-123'), false);
    assert.strictEqual(isPresetBanner('file:///data/user/0/cache/photo.jpg'), false);
    assert.strictEqual(isPresetBanner(''), false);
    assert.strictEqual(isPresetBanner(null), false);
    assert.strictEqual(isPresetBanner(undefined), false);
  });

  it('generates canonical compound URIs and parses color and pattern components', () => {
    const uri1 = createPresetBannerUri('maroon', 'none');
    assert.strictEqual(uri1, 'preset:maroon:none');
    assert.deepStrictEqual(parsePresetBannerUri(uri1), { color: 'maroon', pattern: 'none' });

    const uri2 = createPresetBannerUri('navy', 'gears');
    assert.strictEqual(uri2, 'preset:navy:gears');
    assert.deepStrictEqual(parsePresetBannerUri(uri2), { color: 'navy', pattern: 'gears' });

    const uri3 = createPresetBannerUri('forest', 'crystals');
    assert.strictEqual(uri3, 'preset:forest:crystals');
    assert.deepStrictEqual(parsePresetBannerUri(uri3), { color: 'forest', pattern: 'crystals' });

    const uri4 = createPresetBannerUri('plum', 'circuit');
    assert.strictEqual(uri4, 'preset:plum:circuit');
    assert.deepStrictEqual(parsePresetBannerUri(uri4), { color: 'plum', pattern: 'circuit' });

    const uri5 = createPresetBannerUri('espresso', 'arches');
    assert.strictEqual(uri5, 'preset:espresso:arches');
    assert.deepStrictEqual(parsePresetBannerUri(uri5), { color: 'espresso', pattern: 'arches' });

    // Legacy pattern migration (sunburst -> globe)
    assert.deepStrictEqual(parsePresetBannerUri('preset:maroon:sunburst'), {
      color: 'maroon',
      pattern: 'globe',
    });

    // Fallbacks for invalid values
    assert.deepStrictEqual(parsePresetBannerUri('preset:unknown:unknown'), {
      color: 'maroon',
      pattern: 'none',
    });
    assert.deepStrictEqual(parsePresetBannerUri(null), {
      color: 'maroon',
      pattern: 'none',
    });
  });

  it('resolves getPresetBannerDetails for all color and pattern combinations without error', () => {
    for (const colorId of expectedColorIds) {
      // Solid color (pattern = none)
      const solidDetails = getPresetBannerDetails(`preset:${colorId}:none`);
      assert.strictEqual(solidDetails.colorId, colorId);
      assert.strictEqual(solidDetails.patternId, 'none');
      assert.strictEqual(solidDetails.colorHex, PRESET_COLORS[colorId].color);
      assert.strictEqual(solidDetails.accentColor, PRESET_COLORS[colorId].accentColor);
      assert.strictEqual(solidDetails.patternAsset, null);

      // All 8 pattern overlays
      for (const patternId of expectedPatternIds) {
        const details = getPresetBannerDetails(`preset:${colorId}:${patternId}`);
        assert.strictEqual(details.colorId, colorId);
        assert.strictEqual(details.patternId, patternId);
        assert.strictEqual(details.colorHex, PRESET_COLORS[colorId].color);
        assert.strictEqual(details.accentColor, PRESET_COLORS[colorId].accentColor);
        assert.ok(details.patternAsset !== null);
      }
    }
  });
});
