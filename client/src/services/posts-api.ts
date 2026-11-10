import { createTimedFetch } from '@/services/timed-fetch';

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
  /** Optional callback invoked when the network request fails or times out. */
  onError?: (error: Error) => void;
}

export type FetchFeedPostsResult = {
  posts: Post[];
  isError: boolean;
  errorMessage?: string;
};

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
 * Fetches published posts from the unified Supabase database via the REST API with detailed error reporting.
 * Falls back cleanly to isolated offline seed posts if unreachable.
 *
 * @param options - Query filters, pagination, and error callback
 * @param fallbackPosts - Optional in-memory posts to preserve during offline state
 * @returns FetchFeedPostsResult containing posts, error flag, and optional error message
 */
export async function fetchFeedPostsDetailed(
  options: FetchPostsOptions = {},
  fallbackPosts?: Post[]
): Promise<FetchFeedPostsResult> {
  let isError = false;
  let errorMessage: string | undefined;

  try {
    const request = createTimedFetch(5000);

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
    const res = await request(url, {});

    if (res.ok) {
      const rows: DatabasePostRow[] = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          posts: rows.map(adaptDatabasePostToClientPost),
          isError: false,
        };
      }
    } else {
      isError = true;
      errorMessage = `Server returned status ${res.status}`;
      options.onError?.(new Error(errorMessage));
    }
  } catch (err: any) {
    isError = true;
    errorMessage = err?.message || 'Network request failed';
    options.onError?.(err instanceof Error ? err : new Error(errorMessage));
  }

  // ISOLATED HARDCODED FALLBACK (Required by Sprint 1 SLO SC2)
  // Keep an already-rendered feed unchanged offline instead of rebuilding/re-timestamping its cards.
  if (fallbackPosts) {
    return {
      posts: fallbackPosts,
      isError,
      errorMessage,
    };
  }

  const fallbackScraped = CALVIN_EVENTS_SEED.map((e, idx) =>
    adaptCalvinEventToPost(e, Date.now() - idx * 3600 * 1000)
  );

  return {
    posts: [...defaultPosts, ...fallbackScraped],
    isError,
    errorMessage,
  };
}

/**
 * Fetches published posts from the unified Supabase database via the REST API.
 * Falls back cleanly to isolated offline seed posts if unreachable.
 *
 * @param options - Query filters and pagination
 * @param fallbackPosts - Optional in-memory posts to preserve during offline state
 * @returns Array of Post objects ready for feed display
 */
export async function fetchFeedPosts(
  options: FetchPostsOptions = {},
  fallbackPosts?: Post[]
): Promise<Post[]> {
  const result = await fetchFeedPostsDetailed(options, fallbackPosts);
  return result.posts;
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
    const request = createTimedFetch(8000);

    const res = await request(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
    const request = createTimedFetch(5000);

    const res = await request(`${API_BASE_URL}/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    return res.ok;
  } catch {
    return false;
  }
}
