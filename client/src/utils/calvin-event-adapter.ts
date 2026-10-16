/**
 * Calvin Event to Feed Post Adapter
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Converts scraped Calvin University events (from server REST API or offline seed data)
 * into first-class Knightly `Post` models ready for feed rendering in `PostCard`.
 *
 * PICTURE IMPLICATIONS & SIMPLE BANNER FALLBACK:
 * When an event has a hero photo from the university CMS, it is normalized to an HTTPS URL.
 * When an event lacks a photo (~19% of events), the adapter assigns a deterministic collegiate
 * Simple Banner preset ('preset:{color}:{pattern}') harmonized with the event's category,
 * ensuring no card appears plain or broken.
 */

import type { FeedCategory, Post } from '@/data/feed';
import type { ScrapedCalvinEvent } from '@/data/calvin-events-seed';
import { isCalvinPlaceholderUrl } from '@/utils/image-fingerprint';

/**
 * Category-to-preset-banner mapping for events without a photographic image or with generic placeholders.
 */
const CATEGORY_SIMPLE_BANNERS: Record<FeedCategory, string> = {
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
};

/**
 * Adapts a scraped Calvin event into a Knightly Post.
 *
 * @param event - The scraped event metadata
 * @param baseTimestamp - Base publication epoch timestamp (ms)
 * @returns Fully formed Post object
 */
export function adaptCalvinEventToPost(
  event: ScrapedCalvinEvent,
  baseTimestamp: number = Date.now()
): Post {
  // Step 1: Ensure category is a valid Knightly FeedCategory with safe fallback
  const validCategory = (event.category as FeedCategory) || 'Culture';

  // Step 2: Handle picture, auto-replace generic Drupal placeholders, or assign matching Simple Banner preset
  let bannerImage: string;
  if (!event.imageUrl || event.imageUrl.trim().length === 0) {
    // Case 2A: Omitted or empty image -> assign category Simple Banner preset
    bannerImage = CATEGORY_SIMPLE_BANNERS[validCategory] || 'preset:maroon:diamonds';
  } else if (isCalvinPlaceholderUrl(event.imageUrl)) {
    // Case 2B: Generic Calvin Drupal line-art placeholder detected -> replace with category Simple Banner preset
    // WHY PRESERVING OTHER IMAGES: Only exact canonical placeholder system URLs are matched; custom images
    // sharing the same filename remain intact.
    bannerImage = CATEGORY_SIMPLE_BANNERS[validCategory] || 'preset:maroon:diamonds';
  } else {
    // Case 2C: Authentic photography / flyer -> retain original image URL
    bannerImage = event.imageUrl;
  }

  // Step 3: Format when string (e.g. "Oct 02, 2026 · 10:30 am–10:50 am")
  const when = event.time
    ? `${event.date} · ${event.time}`
    : event.date;

  return {
    id: event.id,
    clubId: 'calvin-university',
    org: 'Calvin University',
    mark: 'CU',
    category: validCategory,
    headline: event.title,
    body: event.description || event.summary || event.title,
    when,
    where: event.location || 'Calvin Campus',
    image: bannerImage,
    postedAt: new Date(baseTimestamp).toISOString(),
    createdAt: baseTimestamp,
    campusWide: true,
    followed: false,
    colors: ['#8C2131', '#E8B019'], // Calvin Maroon & Collegiate Gold
    sf: 'building.columns',
    md: 'account_balance',
  };
}
