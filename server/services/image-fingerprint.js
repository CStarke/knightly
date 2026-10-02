/**
 * Calvin Drupal Placeholder Image Fingerprinting Service
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Calvin University's Drupal CMS automatically attaches generic line-art illustrations
 * to calendar events when organizers do not upload a custom flyer or hero photo.
 * In Knightly's feed, these 1:1 line-art icons look stretched, cropped, or out-of-place
 * when placed in 16:9 card banners.
 *
 * WHY CRYPTOGRAPHIC FINGERPRINTING (SHA-256) OVER FILENAME MATCHING:
 * An event organizer may upload a genuine photo or custom flyer that happens to be named
 * `athletics.png` or `campus-life.png`. Naive filename inspection (e.g. `url.endsWith('athletics.png')`)
 * would mistakenly replace real flyers with simple preset banners.
 * By verifying either:
 * 1. The exact canonical Drupal system path (`/sites/default/files/2025-10/{name}.png`), OR
 * 2. The cryptographic SHA-256 checksum of the image binary payload,
 * we ensure 100% collision-free identification of generic line-art placeholders while
 * guaranteeing that legitimate photos sharing the same filename remain intact.
 */

const crypto = require('crypto');

/**
 * Registry of known Calvin University Drupal fallback line-art placeholder assets.
 * Each entry specifies the exact canonical URL, file size, SHA-256 hash, and Knightly
 * default preset banner assignment.
 */
const CALVIN_PLACEHOLDER_FINGERPRINTS = Object.freeze({
  'arts-culture': {
    id: 'arts-culture',
    filename: 'arts-culture.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2025-10/arts-culture.png',
      '/sites/default/files/2025-10/arts-culture.png',
    ],
    sha256: 'a61256e0fb883e32cf84657f23486a9fb7c62bc6312d60c1e65d01ffe7fd0d4f',
    byteSize: 20770,
    defaultCategory: 'The Arts',
    presetBanner: 'preset:amethyst:crystals',
  },
  athletics: {
    id: 'athletics',
    filename: 'athletics.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2025-10/athletics.png',
      '/sites/default/files/2025-10/athletics.png',
    ],
    sha256: 'f8cecb9826863b286c6effb71aa0b0168ad6ab96ce8b30bf1285c0aee02d1d71',
    byteSize: 34469,
    defaultCategory: 'Athletics',
    presetBanner: 'preset:maroon:stripes',
  },
  'campus-life': {
    id: 'campus-life',
    filename: 'campus-life.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2025-10/campus-life.png',
      '/sites/default/files/2025-10/campus-life.png',
    ],
    sha256: 'a9ca566d6f35aa0d313bd80824a400be4ac51b0ca0482f63c172ef549c0401ce',
    byteSize: 106246,
    defaultCategory: 'Social',
    presetBanner: 'preset:orange:lattice',
  },
  'faith-worship': {
    id: 'faith-worship',
    filename: 'faith-worship.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2025-10/faith-worship.png',
      '/sites/default/files/2025-10/faith-worship.png',
    ],
    sha256: 'ddce0786f8c0691a53e77e29ccfe16b4eff83f360c2e7e038960897156912a90',
    byteSize: 24147,
    defaultCategory: 'Faith',
    presetBanner: 'preset:maroon:diamonds',
  },
  'learning-academics': {
    id: 'learning-academics',
    filename: 'learning-academics.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2025-10/learning-academics.png',
      '/sites/default/files/2025-10/learning-academics.png',
    ],
    sha256: 'f60387246ad7e5849f6b3c899129b585f8f8222fc82be1d39395caec7811ce30',
    byteSize: 15423,
    defaultCategory: 'Academics',
    presetBanner: 'preset:navy:arches',
  },
  'calvin-west-michigan': {
    id: 'calvin-west-michigan',
    filename: 'calvin-west-michigan.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2024-01/calvin-west-michigan.png',
      '/sites/default/files/2024-01/calvin-west-michigan.png',
    ],
    sha256: '5bf4d839bcca68737a61d46d69ac062a0f8df2b95b8eae39cfa6fbe82f99fe41',
    byteSize: 7037,
    defaultCategory: 'Culture',
    presetBanner: 'preset:cranberry:globe',
  },
});

/**
 * Knightly category fallback presets for replacing line-art placeholders.
 */
const CATEGORY_PRESET_BANNERS = Object.freeze({
  Faith: 'preset:maroon:diamonds',
  Academics: 'preset:navy:arches',
  Athletics: 'preset:maroon:stripes',
  Music: 'preset:plum:waves',
  'The Arts': 'preset:amethyst:crystals',
  Career: 'preset:bronze:grid',
  Outdoors: 'preset:forest:trees',
  Service: 'preset:teal:leaves',
  Wellness: 'preset:sage:ripples',
  Social: 'preset:orange:lattice',
  Culture: 'preset:cranberry:globe',
  Official: 'preset:maroon:none',
  Gaming: 'preset:slate:circuit',
});

/**
 * Computes the lowercase hex SHA-256 digest of a binary Buffer.
 *
 * @param {Buffer|Uint8Array} buffer - Image payload buffer
 * @returns {string} SHA-256 hexadecimal hash string
 */
function computeSha256(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new TypeError('Expected buffer to compute SHA-256 hash');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
}

/**
 * Normalizes URL string by stripping query parameters and trailing slashes.
 *
 * @param {string} url - Raw URL string
 * @returns {string} Clean URL path
 */
function cleanUrlPath(url) {
  if (!url || typeof url !== 'string') return '';
  return url.split('?')[0].split('#')[0].trim();
}

/**
 * Determines whether a URL points to an official Calvin Drupal generic line-art placeholder.
 *
 * IMMUNITY INVARIANT:
 * Checks for the exact canonical system directory (`/sites/default/files/2025-10/...`).
 * Will NOT match user-uploaded images that happen to share the same filename under
 * `/styles/large/public/events/...` or other custom paths.
 *
 * @param {string|null} url - Image URL to evaluate
 * @returns {boolean} True if the URL is an exact canonical placeholder URL
 */
function isCalvinPlaceholderUrl(url) {
  if (!url) return false;
  const clean = cleanUrlPath(url);

  for (const item of Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS)) {
    for (const canonical of item.canonicalUrls) {
      if (clean === canonical || clean.endsWith(canonical)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines whether a SHA-256 hash matches any of the known Calvin placeholder assets.
 *
 * @param {string|null} hash - Lowercase or uppercase SHA-256 hash
 * @returns {boolean} True if hash matches a known placeholder
 */
function isCalvinPlaceholderHash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  const normalized = hash.trim().toLowerCase();

  return Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS).some(
    (item) => item.sha256 === normalized
  );
}

/**
 * Determines whether a binary image buffer matches any known Calvin placeholder asset.
 *
 * @param {Buffer|Uint8Array} buffer - Binary file buffer
 * @returns {boolean} True if binary content hash matches a known placeholder
 */
function isCalvinPlaceholderBuffer(buffer) {
  if (!buffer) return false;
  const hash = computeSha256(buffer);
  return isCalvinPlaceholderHash(hash);
}

/**
 * Inspects image metadata (URL, binary buffer, or pre-computed hash) and returns
 * the matching placeholder descriptor if found, or null if genuine/unique.
 *
 * @param {Object} params
 * @param {string} [params.url] - Image URL
 * @param {Buffer} [params.buffer] - Image binary payload
 * @param {string} [params.hash] - Pre-computed SHA-256 hash
 * @returns {Object|null} Matching placeholder metadata, or null
 */
function detectCalvinPlaceholder({ url, buffer, hash } = {}) {
  // Check 1: Cryptographic hash comparison (highest authority)
  const computedHash = hash
    ? hash.trim().toLowerCase()
    : buffer
    ? computeSha256(buffer)
    : null;

  if (computedHash) {
    const matchByHash = Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS).find(
      (item) => item.sha256 === computedHash
    );
    if (matchByHash) return matchByHash;
  }

  // Check 2: Canonical URL path comparison
  if (url) {
    const clean = cleanUrlPath(url);
    const matchByUrl = Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS).find((item) =>
      item.canonicalUrls.some((u) => clean === u || clean.endsWith(u))
    );
    if (matchByUrl) return matchByUrl;
  }

  return null;
}

/**
 * Resolves the banner image for an event, automatically replacing generic Drupal
 * placeholders with category-harmonized Knightly simple preset banners while
 * preserving legitimate photography and custom flyers (even if sharing the same filename).
 *
 * @param {Object} params
 * @param {string|null} params.imageUrl - Scraped image URL
 * @param {string} [params.category] - Event category (e.g. 'Athletics', 'The Arts')
 * @param {Buffer} [params.buffer] - Optional downloaded image binary buffer
 * @param {string} [params.hash] - Optional pre-computed SHA-256 hash
 * @returns {string} Final banner image string (HTTPS URL or 'preset:{color}:{pattern}')
 */
function resolveEventBanner({ imageUrl, category, buffer, hash } = {}) {
  // If no image source at all, return null so downstream adapters or callers can handle fallback
  if (!imageUrl && !buffer && !hash) {
    return null;
  }

  const placeholder = detectCalvinPlaceholder({ url: imageUrl, buffer, hash });

  if (placeholder) {
    // If identified as a generic placeholder, substitute with Knightly preset banner
    const cat = category || placeholder.defaultCategory;
    return CATEGORY_PRESET_BANNERS[cat] || placeholder.presetBanner;
  }

  // If genuine image, retain URL intact
  return imageUrl;
}

module.exports = {
  CALVIN_PLACEHOLDER_FINGERPRINTS,
  CATEGORY_PRESET_BANNERS,
  computeSha256,
  isCalvinPlaceholderUrl,
  isCalvinPlaceholderHash,
  isCalvinPlaceholderBuffer,
  detectCalvinPlaceholder,
  resolveEventBanner,
};
