/**
 * Preset Simple Banners Configuration & Utilities
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly provides pre-designed collegiate solid-color banners paired with subtle
 * geometric/organic vector shape overlays, arranged in harmonic rainbow order.
 * Background colors and vector patterns are decoupled into independent layers:
 * 1. Background Color: 8 collegiate hues, each defining its own base fill and
 *    matching companion accent tint (e.g. Calvin Maroon pairs with Collegiate Gold).
 * 2. Pattern Overlay: 8 vector designs (plus 'none' for clean solid colors) rendered
 *    as transparent overlays tinted dynamically by the background's accent color.
 *
 * Storing them as pre-bundled SVGs allows expo-image to cache them in GPU memory once,
 * avoiding continuous re-rendering overhead during fast feed scrolling while ensuring
 * razor-sharp vectors on any DPI.
 */

export type PresetColorId =
  | 'maroon'
  | 'cranberry'
  | 'plum'
  | 'orange'
  | 'amber'
  | 'bronze'
  | 'chestnut'
  | 'espresso'
  | 'forest'
  | 'sage'
  | 'teal'
  | 'blue'
  | 'navy'
  | 'amethyst'
  | 'grey'
  | 'slate';

export type PresetPatternId =
  | 'none'
  | 'diamonds'
  | 'waves'
  | 'globe'
  | 'ripples'
  | 'trees'
  | 'leaves'
  | 'circuit'
  | 'gears'
  | 'arches'
  | 'grid'
  | 'stripes'
  | 'lattice'
  | 'snowflakes'
  | 'crystals'
  | 'constellation'
  | 'topography';

export interface PresetColorConfig {
  id: PresetColorId;
  name: string;
  color: string;
  accentColor: string;
}

export interface PresetPatternConfig {
  id: PresetPatternId;
  name: string;
  iconAsset: any | null;
  patternAsset: any | null;
}

/**
 * 16 Collegiate background colors arranged into two balanced 8-color rows:
 * Row 1 (Warm / Earthy / Botanical / Berry): Maroon -> Cranberry -> Plum -> Terracotta -> Amber -> Bronze -> Chestnut -> Espresso
 * Row 2 (Fresh / Aquatic / Jewel / Neutral): Forest -> Sage -> Teal -> Blue -> Navy -> Amethyst -> Grey -> Slate
 */
export const PRESET_COLORS: Record<PresetColorId, PresetColorConfig> = {
  maroon: {
    id: 'maroon',
    name: 'Calvin Maroon',
    color: '#5E1A24',
    accentColor: '#E8B019', // Official Collegiate Gold
  },
  cranberry: {
    id: 'cranberry',
    name: 'Cranberry Rose',
    // Muted, sophisticated collegiate berry-rose tone, balanced alongside Calvin Maroon
    color: '#76283C',
    accentColor: '#E29FB0', // Soft Dusty Rose Accent
  },
  plum: {
    id: 'plum',
    name: 'Velvet Plum',
    // Rich, regal deep mulberry plum tone bridging Cranberry Rose and Amethyst
    color: '#552344',
    accentColor: '#E2B6D4', // Soft Lilac Accent
  },
  orange: {
    id: 'orange',
    name: 'Sunset Terracotta',
    color: '#B84A28',
    accentColor: '#F3CD00', // Warm Sun Accent
  },
  amber: {
    id: 'amber',
    name: 'Honey Amber',
    color: '#A06818',
    accentColor: '#FFFFFF', // Luminous White
  },
  bronze: {
    id: 'bronze',
    name: 'Heritage Bronze',
    color: '#6E4F25',
    accentColor: '#F2D492', // Warm Antique Gold
  },
  chestnut: {
    id: 'chestnut',
    name: 'Warm Chestnut',
    // Rich warm auburn timber tone between Bronze and Espresso
    color: '#5C2E1F',
    accentColor: '#F0D5B0', // Golden Wheat Accent
  },
  espresso: {
    id: 'espresso',
    name: 'Cafe Espresso',
    // Dark roasted coffee bean brown with warm latte cream companion
    color: '#3E271E',
    accentColor: '#E8D4BA', // Warm Latte Cream Accent
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    color: '#1E4D2B',
    accentColor: '#A2D683', // Soft Mint
  },
  sage: {
    id: 'sage',
    name: 'Alpine Sage',
    color: '#2E5339',
    accentColor: '#B8E0C0', // Celadon Mint
  },
  teal: {
    id: 'teal',
    name: 'Ocean Teal',
    color: '#134E5E',
    accentColor: '#71B1C8', // Seafoam Sky
  },
  blue: {
    id: 'blue',
    name: 'Arctic Blue',
    color: '#204B6E',
    accentColor: '#FFFFFF', // Ice White
  },
  navy: {
    id: 'navy',
    name: 'Midnight Navy',
    color: '#1B2E4B',
    accentColor: '#71B1C8', // Blueprint Ice Blue
  },
  amethyst: {
    id: 'amethyst',
    name: 'Royal Amethyst',
    color: '#4A2E68',
    accentColor: '#FFFFFF', // Lavender White
  },
  grey: {
    id: 'grey',
    name: 'Granite Grey',
    // Clean, neutral architectural mid-grey
    color: '#4E5560',
    accentColor: '#FFFFFF', // Luminous White Accent
  },
  slate: {
    id: 'slate',
    name: 'Basalt Slate',
    color: '#28303B',
    accentColor: '#E8B019', // High-Contrast Collegiate Gold
  },
};

export const PRESET_COLOR_LIST: PresetColorConfig[] = [
  // Row 1: Warm / Earthy / Botanical / Berry (8 Colors)
  PRESET_COLORS.maroon,
  PRESET_COLORS.cranberry,
  PRESET_COLORS.plum,
  PRESET_COLORS.orange,
  PRESET_COLORS.amber,
  PRESET_COLORS.bronze,
  PRESET_COLORS.chestnut,
  PRESET_COLORS.espresso,
  // Row 2: Fresh / Aquatic / Jewel / Neutral (8 Colors)
  PRESET_COLORS.forest,
  PRESET_COLORS.sage,
  PRESET_COLORS.teal,
  PRESET_COLORS.blue,
  PRESET_COLORS.navy,
  PRESET_COLORS.amethyst,
  PRESET_COLORS.grey,
  PRESET_COLORS.slate,
];

/**
 * 8 Vector Pattern overlays and mini circle logo icons, plus 'none' (solid color).
 */
export const PRESET_PATTERNS: Record<PresetPatternId, PresetPatternConfig> = {
  none: {
    id: 'none',
    name: 'Solid Color',
    iconAsset: null,
    patternAsset: null,
  },
  diamonds: {
    id: 'diamonds',
    name: 'Diamonds',
    iconAsset: require('@/../assets/images/banners/icons/icon-diamonds.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-diamonds.svg'),
  },
  waves: {
    id: 'waves',
    name: 'Waves',
    iconAsset: require('@/../assets/images/banners/icons/icon-waves.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-waves.svg'),
  },
  globe: {
    id: 'globe',
    name: 'Globe',
    iconAsset: require('@/../assets/images/banners/icons/icon-globe.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-globe.svg'),
  },
  ripples: {
    id: 'ripples',
    name: 'Ripples',
    iconAsset: require('@/../assets/images/banners/icons/icon-ripples.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-ripples.svg'),
  },
  trees: {
    id: 'trees',
    name: 'Trees',
    iconAsset: require('@/../assets/images/banners/icons/icon-trees.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-trees.svg'),
  },
  leaves: {
    id: 'leaves',
    name: 'Leaves',
    iconAsset: require('@/../assets/images/banners/icons/icon-leaves.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-leaves.svg'),
  },
  circuit: {
    id: 'circuit',
    name: 'Circuit',
    iconAsset: require('@/../assets/images/banners/icons/icon-circuit.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-circuit.svg'),
  },
  gears: {
    id: 'gears',
    name: 'Gears',
    iconAsset: require('@/../assets/images/banners/icons/icon-gears.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-gears.svg'),
  },
  arches: {
    id: 'arches',
    name: 'Arches',
    iconAsset: require('@/../assets/images/banners/icons/icon-arches.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-arches.svg'),
  },
  grid: {
    id: 'grid',
    name: 'Grid',
    iconAsset: require('@/../assets/images/banners/icons/icon-grid.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-grid.svg'),
  },
  stripes: {
    id: 'stripes',
    name: 'Stripes',
    iconAsset: require('@/../assets/images/banners/icons/icon-stripes.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-stripes.svg'),
  },
  lattice: {
    id: 'lattice',
    name: 'Lattice',
    iconAsset: require('@/../assets/images/banners/icons/icon-lattice.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-lattice.svg'),
  },
  crystals: {
    id: 'crystals',
    name: 'Crystals',
    iconAsset: require('@/../assets/images/banners/icons/icon-crystals.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-crystals.svg'),
  },
  snowflakes: {
    id: 'snowflakes',
    name: 'Snowflakes',
    iconAsset: require('@/../assets/images/banners/icons/icon-snowflakes.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-snowflakes.svg'),
  },
  constellation: {
    id: 'constellation',
    name: 'Constellation',
    iconAsset: require('@/../assets/images/banners/icons/icon-constellation.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-constellation.svg'),
  },
  topography: {
    id: 'topography',
    name: 'Topography',
    iconAsset: require('@/../assets/images/banners/icons/icon-topography.svg'),
    patternAsset: require('@/../assets/images/banners/patterns/pattern-topography.svg'),
  },
};

export const PRESET_PATTERN_LIST: PresetPatternConfig[] = [
  // Row 1: Thematic / Nature / Tech / Industry (8 Patterns)
  PRESET_PATTERNS.diamonds,
  PRESET_PATTERNS.waves,
  PRESET_PATTERNS.globe,
  PRESET_PATTERNS.ripples,
  PRESET_PATTERNS.trees,
  PRESET_PATTERNS.leaves,
  PRESET_PATTERNS.circuit,
  PRESET_PATTERNS.gears,
  // Row 2: Geometric / Architectural / Terrestrial / Celestial (8 Patterns)
  PRESET_PATTERNS.arches,
  PRESET_PATTERNS.grid,
  PRESET_PATTERNS.stripes,
  PRESET_PATTERNS.lattice,
  PRESET_PATTERNS.crystals,
  PRESET_PATTERNS.snowflakes,
  PRESET_PATTERNS.constellation,
  PRESET_PATTERNS.topography,
];

/**
 * Checks whether an image identifier represents a simple preset banner.
 */
export function isPresetBanner(uri: string | null | undefined): uri is string {
  return typeof uri === 'string' && uri.startsWith('preset:');
}

/**
 * Parses a canonical preset banner URI into its color and pattern components.
 * Canonical format: `preset:<color>:<pattern>` (e.g. `preset:maroon:none` or `preset:maroon:gears`).
 * Default fallback: color 'maroon', pattern 'none'.
 */
export function parsePresetBannerUri(uri: string | null | undefined): {
  color: PresetColorId;
  pattern: PresetPatternId;
} {
  if (!isPresetBanner(uri)) {
    return { color: 'maroon', pattern: 'none' };
  }

  const raw = uri.slice('preset:'.length);
  const parts = raw.split(':');
  const colorPart = parts[0] as PresetColorId;
  const rawPatternPart = parts[1] ?? 'none';
  // Transparent backward-compatibility migration for legacy sunburst pattern URIs
  const patternPart = (rawPatternPart === 'sunburst' ? 'globe' : rawPatternPart) as PresetPatternId;

  const validColor: PresetColorId = PRESET_COLORS[colorPart] ? colorPart : 'maroon';
  const validPattern: PresetPatternId = PRESET_PATTERNS[patternPart] ? patternPart : 'none';

  return { color: validColor, pattern: validPattern };
}

/**
 * Formats a color and pattern ID into a canonical URI string.
 */
export function createPresetBannerUri(
  color: PresetColorId,
  pattern: PresetPatternId = 'none'
): string {
  return `preset:${color}:${pattern}`;
}

export interface PresetBannerDetails {
  colorHex: string;
  accentColor: string;
  patternAsset: any | null;
  colorName: string;
  patternName: string;
  colorId: PresetColorId;
  patternId: PresetPatternId;
}

/**
 * Returns fully resolved rendering details for a given preset URI or color ID.
 */
export function getPresetBannerDetails(
  uriOrColor: string | null | undefined,
  patternOverride?: PresetPatternId
): PresetBannerDetails {
  const parsed = parsePresetBannerUri(uriOrColor);
  const colorId = parsed.color;
  const patternId = patternOverride ?? parsed.pattern;

  const colorConfig = PRESET_COLORS[colorId] ?? PRESET_COLORS.maroon;
  const patternConfig = PRESET_PATTERNS[patternId] ?? PRESET_PATTERNS.none;

  return {
    colorHex: colorConfig.color,
    accentColor: colorConfig.accentColor,
    patternAsset: patternConfig.patternAsset,
    colorName: colorConfig.name,
    patternName: patternConfig.name,
    colorId,
    patternId,
  };
}
