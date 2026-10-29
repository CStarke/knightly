/**
 * Database Post to Client Feed Post Adapter
 *
 * ARCHITECTURAL RATIONALE:
 * Transforms PostgreSQL `posts` rows fetched from the REST API / Supabase into
 * first-class `Post` view models for Knightly's feed UI.
 *
 * PICTURE & BANNER INVARIANTS:
 * If a post row does not have a custom image, it falls back to its deterministic
 * Simple Banner preset ('preset:{color}:{pattern}') harmonized with its 13-category taxonomy.
 */

import { CALVIN_CLUBS } from '@/data/clubs';
import { feedCategories, type FeedCategory, type Post } from '@/data/feed';

export type DatabasePostRow = {
  id: string;
  club_id?: string | null;
  author_student_id?: string | null;
  org_name: string;
  mark?: string | null;
  headline: string;
  body: string;
  category: string;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  when_text?: string | null;
  where_text?: string | null;
  image_url?: string | null;
  fallback_banner_svg?: string | null;
  campus_wide?: boolean;
  source?: 'club' | 'calvin_drupal' | 'admin';
  status?: 'published' | 'draft' | 'archived';
  posted_at: string;
  created_at_ms: number | string;
};

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
 * Transforms a database row into a client Post object.
 *
 * @param row - Database row representation
 * @returns Fully adapted Post for card rendering
 */
export function adaptDatabasePostToClientPost(row: DatabasePostRow): Post {
  const club = row.club_id ? CALVIN_CLUBS.find((c) => c.id === row.club_id) : undefined;
  const validCategory = (
    feedCategories.includes(row.category as FeedCategory) ? row.category : 'Culture'
  ) as FeedCategory;

  let banner = row.image_url || undefined;
  if (!banner && row.fallback_banner_svg) {
    banner = row.fallback_banner_svg;
  }
  if (!banner) {
    banner = CATEGORY_SIMPLE_BANNERS[validCategory] || 'preset:maroon:diamonds';
  }

  const postedAtMs = Number(row.created_at_ms) || new Date(row.posted_at).getTime() || Date.now();

  return {
    id: row.id,
    clubId: row.club_id || (row.source === 'calvin_drupal' ? 'calvin-university' : undefined),
    org: row.org_name || club?.name || 'Calvin Community',
    mark: row.mark || club?.mark || (row.org_name ? row.org_name.slice(0, 2).toUpperCase() : 'CC'),
    category: validCategory,
    postedAt: row.posted_at || new Date(postedAtMs).toISOString(),
    createdAt: postedAtMs,
    headline: row.headline || '',
    body: row.body || '',
    when: row.when_text || undefined,
    where: row.where_text || undefined,
    image: banner,
    followed: false,
    campusWide: Boolean(row.campus_wide),
    colors: club?.colors || ['#8C2131', '#E8B019'],
    sf: club?.sf || 'sparkles',
    md: club?.md || 'auto_awesome',
  };
}
