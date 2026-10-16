/**
 * Calvin Drupal Placeholder Image Fingerprinting Service (Client)
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

import type { FeedCategory } from '@/data/feed';

export interface CalvinPlaceholderFingerprint {
  id: string;
  filename: string;
  canonicalUrls: string[];
  sha256: string;
  byteSize: number;
  defaultCategory: FeedCategory;
  presetBanner: string;
}

/**
 * Registry of known Calvin University Drupal fallback line-art placeholder assets.
 */
export const CALVIN_PLACEHOLDER_FINGERPRINTS: Record<string, CalvinPlaceholderFingerprint> = Object.freeze({
  'arts-culture': {
    id: 'arts-culture',
    filename: 'arts-culture.png',
    canonicalUrls: [
      'https://calvin.edu/sites/default/files/2025-10/arts-culture.png',
      '/sites/default/files/2025-10/arts-culture.png',
    ],
    sha256: 'a61256e0fb883e32cf84657f23486a9fb7c62bc6312d60c1e65d01ffe7fd0d4f',
    byteSize: 20770,
    defaultCategory: 'The Arts' as FeedCategory,
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
    defaultCategory: 'Athletics' as FeedCategory,
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
    defaultCategory: 'Social' as FeedCategory,
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
    defaultCategory: 'Faith' as FeedCategory,
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
    defaultCategory: 'Academics' as FeedCategory,
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
    defaultCategory: 'Culture' as FeedCategory,
    presetBanner: 'preset:cranberry:globe',
  },
});

/**
 * Normalizes URL string by stripping query parameters and trailing hashes.
 *
 * @param url - Raw URL string
 * @returns Clean URL path
 */
function cleanUrlPath(url: string): string {
  if (!url) return '';
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
 * @param url - Image URL to evaluate
 * @returns True if the URL is an exact canonical placeholder URL
 */
export function isCalvinPlaceholderUrl(url: string | null | undefined): boolean {
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
 * @param hash - Lowercase or uppercase SHA-256 hash
 * @returns True if hash matches a known placeholder
 */
export function isCalvinPlaceholderHash(hash: string | null | undefined): boolean {
  if (!hash) return false;
  const normalized = hash.trim().toLowerCase();

  return Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS).some(
    (item) => item.sha256 === normalized
  );
}

/**
 * Inspects image URL or hash and returns the matching placeholder descriptor if found.
 *
 * @param options - Object containing url and/or hash
 * @returns Matching placeholder metadata, or null if legitimate/unique
 */
export function detectCalvinPlaceholder(options: {
  url?: string | null;
  hash?: string | null;
}): CalvinPlaceholderFingerprint | null {
  if (options.hash) {
    const normalized = options.hash.trim().toLowerCase();
    const match = Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS).find(
      (item) => item.sha256 === normalized
    );
    if (match) return match;
  }

  if (options.url) {
    const clean = cleanUrlPath(options.url);
    const match = Object.values(CALVIN_PLACEHOLDER_FINGERPRINTS).find((item) =>
      item.canonicalUrls.some((u) => clean === u || clean.endsWith(u))
    );
    if (match) return match;
  }

  return null;
}
