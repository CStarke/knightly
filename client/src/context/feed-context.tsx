/**
 * Campus Feed State & Post Publishing Context
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly's home screen displays an aggregated campus life feed containing flyers, announcements,
 * and event invitations from university departments and registered student organizations.
 *
 * This context manages the live stream of posts, coordinating between:
 * 1. The initial static feed seed data (`defaultPosts`).
 * 2. Newly authored posts published by student leaders in the `Create Post` composer.
 * 3. Follow state synchronization (ensuring published posts appear in the user's Following feed).
 * 4. Account-scoped saved posts bookmarking with O(1) Set lookups and local persistence.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { posts as defaultPosts, sortPostsByDate, type Post, type FeedCategory } from '@/data/feed';
import { useClubFollow } from '@/context/club-follow-context';
import { AuthContext } from '@/context/auth-context';
import type { Club } from '@/data/clubs';
import { CALVIN_EVENTS_SEED } from '@/data/calvin-events-seed';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import { fetchCampusEvents } from '@/services/events-api';
import { fetchFeedPosts, createPostApi, deletePostApi } from '@/services/posts-api';

export type CreatePostInput = {
  club: Club;
  title: string;
  description: string;
  image?: string;
  when?: string;
  where?: string;
};

type FeedContextType = {
  posts: Post[];
  createPost: (input: CreatePostInput) => Post;
  deletePost: (id: string) => void;

  // Posts saved by the individual student (personal bookmarking)
  savedPosts: Post[];
  toggleSavePost: (id: string) => void;
  isPostSaved: (id: string) => boolean;

  // Backward-compatibility aliases for favorites
  favoritePosts: Post[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const FeedContext = createContext<FeedContextType | null>(null);

/**
 * Builds a user-isolated storage key for saved posts.
 *
 * WHY NAMESPACING & STUDENT PRIVACY:
 * Saved posts are personal bookmarks for individual students, NOT a social liking system.
 * Namespacing storage keys prevents saved posts from leaking across accounts when multiple students
 * share a device or sign in successively.
 */
export function getSavedPostsStorageKey(
  user: { id?: string; username?: string } | null
): string {
  const accountId = user ? (user.username || user.id || 'default').toLowerCase() : 'guest';
  return `knightly_saved_posts_${accountId}`;
}

const inMemorySavedPostIds: Record<string, string[]> = {};

/**
 * Loads saved post IDs partitioned by student account.
 */
export function loadSavedPostIds(
  user: { id?: string; username?: string } | null
): string[] {
  const accountId = user ? (user.username || user.id || 'default').toLowerCase() : 'guest';
  if (inMemorySavedPostIds[accountId] !== undefined) {
    return inMemorySavedPostIds[accountId];
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    inMemorySavedPostIds[accountId] = [];
    return [];
  }
  try {
    const raw = window.localStorage.getItem(getSavedPostsStorageKey(user));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemorySavedPostIds[accountId] = parsed;
        return parsed;
      }
    }
  } catch {
    // In case of parsing errors or quota exceptions, fallback gracefully
  }
  inMemorySavedPostIds[accountId] = [];
  return [];
}

/**
 * Persists saved post IDs to localStorage and in-memory cache.
 */
export function persistSavedPostIds(
  user: { id?: string; username?: string } | null,
  ids: string[]
): void {
  const accountId = user ? (user.username || user.id || 'default').toLowerCase() : 'guest';
  inMemorySavedPostIds[accountId] = ids;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(getSavedPostsStorageKey(user), JSON.stringify(ids));
    } catch {
      // Ignore quota exceptions
    }
  }
}


const LOCAL_AUTHORED_POSTS_KEY = 'knightly_local_authored_posts';

export function loadLocalAuthoredPosts(): Post[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOCAL_AUTHORED_POSTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export function persistLocalAuthoredPosts(posts: Post[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_AUTHORED_POSTS_KEY, JSON.stringify(posts));
    } catch {}
  }
}

const DEMO_POST_OFFSETS_MS = [
  25 * 60 * 1000, // 25 minutes ago
  45 * 60 * 1000, // 45 minutes ago
  1 * 3600 * 1000, // 1 hour ago
  2 * 3600 * 1000, // 2 hours ago
  3 * 3600 * 1000, // 3 hours ago
  5 * 3600 * 1000, // 5 hours ago
  7 * 3600 * 1000, // 7 hours ago
  10 * 3600 * 1000, // 10 hours ago
  14 * 3600 * 1000, // 14 hours ago
  1 * 86400 * 1000, // 1 day ago
  2 * 86400 * 1000, // 2 days ago
  4 * 86400 * 1000, // 4 days ago
  5 * 86400 * 1000, // 5 days ago
  6 * 86400 * 1000, // 6 days ago
  10 * 86400 * 1000, // 10 days ago
  15 * 86400 * 1000, // 15 days ago
  35 * 86400 * 1000, // 35 days ago (formats as full date)
];

function getInitialPosts(): Post[] {
  // Step 1: Record current wall-clock epoch timestamp
  const now = Date.now();
  // Step 2: Load locally authored posts from persistent storage (survives app reloads)
  const localAuthored = loadLocalAuthoredPosts();
  // Step 3: Adapt isolated offline seed events from Calvin website
  const calvinSeedPosts = CALVIN_EVENTS_SEED.slice(0, 15).map((e, idx) =>
    adaptCalvinEventToPost(e, now - (idx + 1) * 1800 * 1000)
  );
  // Step 4: Combine local authored flyers with seed posts
  const combined = [...localAuthored, ...defaultPosts, ...calvinSeedPosts];
  return sortPostsByDate(combined);
}

const FAVORITES_STORAGE_KEY = 'knightly_favorite_post_ids';

/**
 * Loads saved favorite post IDs from browser localStorage on web, or returns empty array.
 */
function getInitialFavoriteIds(): string[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  const [feedPosts, setFeedPosts] = useState<Post[]>(getInitialPosts);
  // Maintain saved post IDs in a Set for guaranteed O(1) constant-time membership lookups
  // during fast 60fps scrolling (matching the ClubFollowContext architectural invariant).
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    return new Set(loadSavedPostIds(user));
  });

  // Re-synchronize saved posts whenever the authenticated student changes
  useEffect(() => {
    setSavedIds(new Set(loadSavedPostIds(user)));
  }, [user]);

  // Toggle saving a post with persistent storage scoped to student account
  const toggleSavePost = useCallback(
    (id: string) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        persistSavedPostIds(user, Array.from(next));
        return next;
      });
    },
    [user]
  );

  // O(1) membership check
  const isPostSaved = useCallback(
    (id: string) => savedIds.has(id),
    [savedIds]
  );

  // Memoized array of saved Post objects for the Saved feed view
  const savedPosts = useMemo(
    () => feedPosts.filter((post) => savedIds.has(post.id)),
    [feedPosts, savedIds]
  );

  const { isFollowing, toggleFollow } = useClubFollow();

  // SPRINT 1 SLO DIRECTIVE (SC2):
  // Asynchronously retrieve fresh events from the server REST API (/api/events),
  // merging with local state while preserving the offline seed data fallback.
  useEffect(() => {
    let mounted = true;
    fetchFeedPosts().then((livePosts) => {
      if (mounted && livePosts.length > 0) {
        setFeedPosts((prev) => {
          const localOnly = prev.filter((p) => p.id.startsWith('p-local-'));
          return sortPostsByDate([...localOnly, ...livePosts]);
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Publishes a new event flyer or announcement.
   *
   * BACKEND INTEGRATION DIRECTIVE (SERVER-AUTHORITATIVE TIMESTAMPS):
   * In this local client demo state, `postedAt` and `createdAt` are generated from the device's
   * current wall-clock (`Date.now()`). When integrating the production backend API, the post
   * creation timestamp MUST be generated and assigned by the server (e.g. database `DEFAULT NOW()`
   * or server epoch timestamp) and returned in the API response. Relying on the server's authoritative
   * clock protects feed chronology and prevents users from altering personal device dates/times
   * to manipulate feed ordering or bypass publishing schedules.
   *
   * WHY SORTING BY DATE:
   * Campus social feeds are reverse-chronological. Sorting ensures newly authored posts
   * and any scheduled posts appear in strictly descending order (newest at the top).
   *
   * WHY AUTO-FOLLOW ON PUBLISH:
   * When a club leader publishes on behalf of their organization, they expect that post to
   * show up when filtering by "Following". Automatically following the organization guarantees
   * consistent feed visibility.
   */
  const createPost = useCallback(
    (input: CreatePostInput): Post => {
      const { club, title, description, image, when, where } = input;
      // Step 1: Capture current timestamp for unique post identity and publication time
      const now = Date.now();

      // Step 2: Construct the Post object with sanitized title, description, logistics, and branding
      const newPost: Post = {
        id: `p-local-${now}`,
        clubId: club.id,
        org: club.name,
        mark: club.mark,
        category: club.category as FeedCategory,
        postedAt: new Date(now).toISOString(),
        createdAt: now,
        monotonicCreatedAt: typeof performance !== 'undefined' ? performance.now() : undefined,
        headline: title.trim(),
        body: description.trim(),
        when: when?.trim() ? when.trim() : undefined,
        where: where?.trim() ? where.trim() : undefined,
        image: image?.trim() ? image.trim() : undefined,
        followed: true,
        campusWide: Boolean(club.isDepartment),
        colors: club.colors,
        sf: club.sf,
        md: club.md,
      };

      // Step 3: Automatically follow the organization if not already followed
      if (!isFollowing(club.id)) {
        toggleFollow(club.id);
      }

      // Step 4: Persist locally authored flyer to storage immediately (survives offline reloads)
      const currentLocals = loadLocalAuthoredPosts();
      persistLocalAuthoredPosts([newPost, ...currentLocals.filter((p) => p.id !== newPost.id)]);

      // Step 5: Insert the post into feed state optimistically to maintain instant UI responsiveness
      setFeedPosts((prev) => sortPostsByDate([newPost, ...prev]));

      // Step 6: Asynchronously persist flyer to Supabase database via backend REST API
      const authorStudentId = user?.id || user?.studentId || '';
      createPostApi({
        clubId: club.id,
        authorStudentId,
        orgName: club.name,
        mark: club.mark,
        headline: title.trim(),
        body: description.trim(),
        category: club.category,
        whenText: when?.trim() ? when.trim() : undefined,
        whereText: where?.trim() ? where.trim() : undefined,
        imageUrl: image?.trim() ? image.trim() : undefined,
        campusWide: Boolean(club.isDepartment),
      }).then((serverPost) => {
        if (serverPost) {
          // Replace optimistic local post with server-authoritative record (UUID, server timestamps)
          setFeedPosts((prev) =>
            sortPostsByDate(prev.map((p) => (p.id === newPost.id ? serverPost : p)))
          );
          // Update persistent local cache with server UUID
          const updatedLocals = loadLocalAuthoredPosts().map((p) =>
            p.id === newPost.id ? serverPost : p
          );
          persistLocalAuthoredPosts(updatedLocals);
        }
      });

      // Step 6: Return newly created post to the caller
      return newPost;
    },
    [isFollowing, toggleFollow, user]
  );

  const deletePost = useCallback((id: string) => {
    setFeedPosts((prev) => prev.filter((p) => p.id !== id));
    const remainingLocals = loadLocalAuthoredPosts().filter((p) => p.id !== id);
    persistLocalAuthoredPosts(remainingLocals);
    deletePostApi(id);
  }, []);

  const value = useMemo(
    () => ({
      posts: feedPosts,
      createPost,
      deletePost,

      savedPosts,
      toggleSavePost,
      isPostSaved,

      // Backward compatibility aliases
      favoritePosts: savedPosts,
      toggleFavorite: toggleSavePost,
      isFavorite: isPostSaved,
    }),
    [
      feedPosts,
      createPost,
      deletePost,
      savedPosts,
      toggleSavePost,
      isPostSaved,
    ]
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
}

export function useOptionalFeed() {
  return useContext(FeedContext);
}
