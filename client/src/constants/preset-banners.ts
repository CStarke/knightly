/**
 * Preset Simple Banners Configuration & Utilities
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly provides pre-designed collegiate solid-color banners paired with subtle
 * geometric/organic vector shape overlays, arranged in harmonic rainbow order.
 * Storing them as pre-bundled 16:9 SVGs allows expo-image to cache them in GPU memory once,
 * avoiding continuous re-rendering overhead during fast feed scrolling while ensuring
 * razor-sharp vectors on any DPI.
 */

export type PresetBannerId =
  | 'maroon'
  | 'orange'
  | 'amber'
  | 'forest'
  | 'teal'
  | 'blue'
  | 'navy'
  | 'amethyst';

export interface PresetBannerConfig {
  id: PresetBannerId;
  name: string;
  color: string;
}

export const PRESET_BANNER_ASSETS: Record<PresetBannerId, any> = {
  maroon: require('@/../assets/images/banners/banner-maroon.svg'),
  orange: require('@/../assets/images/banners/banner-orange.svg'),
  amber: require('@/../assets/images/banners/banner-amber.svg'),
  forest: require('@/../assets/images/banners/banner-forest.svg'),
  teal: require('@/../assets/images/banners/banner-teal.svg'),
  blue: require('@/../assets/images/banners/banner-blue.svg'),
  navy: require('@/../assets/images/banners/banner-navy.svg'),
  amethyst: require('@/../assets/images/banners/banner-amethyst.svg'),
};

export const PRESET_BANNERS: Record<PresetBannerId, PresetBannerConfig> = {
  maroon: { id: 'maroon', name: 'Calvin Maroon', color: '#5E1A24' },
  orange: { id: 'orange', name: 'Sunset Terracotta', color: '#B84A28' },
  amber: { id: 'amber', name: 'Honey Amber', color: '#A06818' },
  forest: { id: 'forest', name: 'Forest Green', color: '#1E4D2B' },
  teal: { id: 'teal', name: 'Ocean Teal', color: '#134E5E' },
  blue: { id: 'blue', name: 'Arctic Blue', color: '#204B6E' },
  navy: { id: 'navy', name: 'Midnight Navy', color: '#1B2E4B' },
  amethyst: { id: 'amethyst', name: 'Royal Amethyst', color: '#4A2E68' },
};

/**
 * All 8 banner presets strictly ordered in harmonic rainbow sequence:
 * Red (Maroon) -> Orange (Terracotta) -> Amber (Honey) -> Green (Forest) ->
 * Teal (Ocean) -> Blue (Arctic) -> Indigo (Navy) -> Violet (Amethyst)
 */
export const PRESET_BANNER_LIST: PresetBannerConfig[] = [
  PRESET_BANNERS.maroon,
  PRESET_BANNERS.orange,
  PRESET_BANNERS.amber,
  PRESET_BANNERS.forest,
  PRESET_BANNERS.teal,
  PRESET_BANNERS.blue,
  PRESET_BANNERS.navy,
  PRESET_BANNERS.amethyst,
];

/**
 * Checks whether an image identifier represents a simple preset banner.
 */
export function isPresetBanner(uri: string | null | undefined): uri is string {
  return typeof uri === 'string' && uri.startsWith('preset:');
}

/**
 * Extracts the PresetBannerId from a URI string (e.g. "preset:maroon" -> "maroon").
 * Includes seamless backward compatibility mappings.
 */
export function getPresetBannerId(uri: string | null | undefined): PresetBannerId | null {
  if (!isPresetBanner(uri)) return null;
  let id = uri.slice('preset:'.length);
  if (id === 'gold') id = 'amber';
  if (id === 'frost') id = 'blue';
  return PRESET_BANNERS[id as PresetBannerId] ? (id as PresetBannerId) : null;
}

/**
 * Formats a preset ID into a canonical URI string.
 */
export function createPresetBannerUri(id: PresetBannerId): string {
  return `preset:${id}`;
}

/**
 * Returns the resolved expo-image asset source for a given preset URI or ID.
 */
export function getPresetBannerSource(uriOrId: string | null | undefined): any {
  if (!uriOrId) return null;
  let rawId = uriOrId.startsWith('preset:') ? uriOrId.slice('preset:'.length) : uriOrId;
  if (rawId === 'gold') rawId = 'amber';
  if (rawId === 'frost') rawId = 'blue';
  const id = rawId as PresetBannerId;
  return PRESET_BANNER_ASSETS[id] ?? null;
}
