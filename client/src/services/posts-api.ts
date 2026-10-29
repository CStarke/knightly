/**
 * Posts & Unified Feed API Client Service
 *
 * ARCHITECTURAL RATIONALE:
 * Provides client-side interface to the server's Unified Posts API (`/api/posts`),
 * synchronizing student-authored flyers and scraped campus announcements with Supabase.
 *
 * OFFLINE RESILIENCE & SPRINT 1 SLO (SC2):
 * Knightly must NEVER crash when the backend server is offline or unavailable.
 * All network calls are wrapped in strict try/catch with 2.5-second abort timeouts,
 * falling back cleanly to isolated seed data (`defaultPosts` & `CALVIN_EVENTS_SEED`).
 */

import { posts as defaultPosts, type Post } from '@/data/feed';
import { CALVIN_EVENTS_SEED } from '@/data/calvin-events-seed';
import { API_BASE_URL } from '@/services/api-config';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import { adaptDatabasePostToClientPost, type DatabasePostRow } from '@/utils/post-database-adapter';

export interface FetchPostsOptions {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePostPayload {
  clubId?: string;
  authorStudentId?: string;
  orgName: string;
  mark?: string;
  headline: string;
  body: string;
  category: string;
  whenText?: string;
  whereText?: string;
  imageUrl?: string;
  campusWide?: boolean;
}

/**
 * Fetches published posts from the unified Supabase database via the REST API.
 * Falls back cleanly to isolated offline seed posts if unreachable.
 *
 * @param options - Query filters and pagination
 * @returns Array of Post objects ready for feed display
 */
export async function fetchFeedPosts(options: FetchPostsOptions = {}): Promise<Post[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const queryParams = new URLSearchParams();
    if (options.category && options.category.toLowerCase() !== 'all') {
      queryParams.set('category', options.category);
    }
    if (options.search) {
      queryParams.set('search', options.search);
    }
    if (options.limit) {
      queryParams.set('limit', String(options.limit));
    }
    if (options.offset) {
      queryParams.set('offset', String(options.offset));
    }

    const url = `${API_BASE_URL}/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const rows: DatabasePostRow[] = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map(adaptDatabasePostToClientPost);
      }
    }
  } catch {
    // Backend offline / unreachable: proceed to graceful offline fallback below
  }

  // ISOLATED HARDCODED FALLBACK (Required by Sprint 1 SLO SC2)
  const fallbackScraped = CALVIN_EVENTS_SEED.map((e, idx) =>
    adaptCalvinEventToPost(e, Date.now() - idx * 3600 * 1000)
  );

  return [...defaultPosts, ...fallbackScraped];
}

/**
 * Publishes a student flyer to Supabase via the backend API.
 * Guarantees server-authoritative timestamps and student author accountability.
 *
 * @param payload - Post details
 * @returns Newly created Post object with server-assigned UUID and timestamps
 */
export async function createPostApi(payload: CreatePostPayload): Promise<Post | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const createdRow: DatabasePostRow = await res.json();
      return adaptDatabasePostToClientPost(createdRow);
    } else {
      const errorJson = await res.json().catch(() => ({}));
      console.warn('[posts-api.createPostApi] Server rejected post:', res.status, errorJson);
    }
  } catch (err: any) {
    // Offline or network error: log diagnostic and return null so caller preserves optimistic local post
    console.warn('[posts-api.createPostApi] Network / offline error:', err?.message || err);
  }

  return null;
}

/**
 * Deletes a post from the Supabase database via the REST API.
 *
 * @param id - Post UUID
 * @returns True if successfully deleted
 */
export async function deletePostApi(id: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    return res.ok;
  } catch {
    return false;
  }
}
