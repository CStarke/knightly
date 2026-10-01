import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PRESET_BANNERS,
  PRESET_BANNER_LIST,
  PRESET_BANNER_ASSETS,
  createPresetBannerUri,
  getPresetBannerId,
  getPresetBannerSource,
  isPresetBanner,
  type PresetBannerId,
} from '@/constants/preset-banners';

describe('Preset Simple Banners Invariants', () => {
  const expectedPresetIds: PresetBannerId[] = [
    'maroon',
    'orange',
    'amber',
    'forest',
    'teal',
    'blue',
    'navy',
    'amethyst',
  ];

  it('defines all 8 collegiate banner presets in exact chromatic rainbow order', () => {
    assert.strictEqual(PRESET_BANNER_LIST.length, 8);
    const actualOrder = PRESET_BANNER_LIST.map((preset) => preset.id);
    assert.deepStrictEqual(actualOrder, expectedPresetIds);

    for (const id of expectedPresetIds) {
      const preset = PRESET_BANNERS[id];
      assert.ok(preset, `Preset ${id} must exist in PRESET_BANNERS registry`);
      assert.strictEqual(preset.id, id);
      assert.ok(preset.name.length > 0, `Preset ${id} must have a non-empty name`);
    }
  });

  it('verifies all preset banner colors are valid 7-character hex strings', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const preset of PRESET_BANNER_LIST) {
      assert.match(
        preset.color,
        hexRegex,
        `Preset ${preset.id} color "${preset.color}" must be a valid 7-char hex string`
      );
    }
  });

  it('verifies each preset banner has an associated vector asset mapped in PRESET_BANNER_ASSETS', () => {
    for (const id of expectedPresetIds) {
      const asset = PRESET_BANNER_ASSETS[id];
      assert.ok(asset !== undefined && asset !== null, `Asset for preset ${id} must be defined`);
    }
  });

  it('correctly discriminates preset URIs from external photo URIs and nullish values', () => {
    assert.strictEqual(isPresetBanner('preset:maroon'), true);
    assert.strictEqual(isPresetBanner('preset:orange'), true);
    assert.strictEqual(isPresetBanner('preset:amber'), true);
    assert.strictEqual(isPresetBanner('preset:amethyst'), true);

    // Negative cases
    assert.strictEqual(isPresetBanner('https://images.unsplash.com/photo-123'), false);
    assert.strictEqual(isPresetBanner('file:///data/user/0/cache/photo.jpg'), false);
    assert.strictEqual(isPresetBanner(''), false);
    assert.strictEqual(isPresetBanner(null), false);
    assert.strictEqual(isPresetBanner(undefined), false);
  });

  it('parses preset IDs, generates canonical URIs, and maintains backward compatibility', () => {
    for (const id of expectedPresetIds) {
      const uri = createPresetBannerUri(id);
      assert.strictEqual(uri, `preset:${id}`);
      assert.strictEqual(getPresetBannerId(uri), id);
      assert.ok(getPresetBannerSource(uri) !== null, `Source for ${uri} must resolve`);
      assert.ok(getPresetBannerSource(id) !== null, `Source for ${id} must resolve`);
    }

    // Backward compatibility for legacy identifiers
    assert.strictEqual(getPresetBannerId('preset:gold'), 'amber');
    assert.strictEqual(getPresetBannerId('preset:frost'), 'blue');
    assert.ok(getPresetBannerSource('preset:gold') !== null);
    assert.ok(getPresetBannerSource('preset:frost') !== null);

    // Invalid or unknown IDs return null
    assert.strictEqual(getPresetBannerId('preset:unknown-preset'), null);
    assert.strictEqual(getPresetBannerId('https://calvin.edu/banner.jpg'), null);
    assert.strictEqual(getPresetBannerId(null), null);
    assert.strictEqual(getPresetBannerSource('preset:nonexistent'), null);
    assert.strictEqual(getPresetBannerSource(null), null);
  });
});
