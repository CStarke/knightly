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
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { posts as defaultPosts, sortPostsByDate, type Post, type FeedCategory } from '@/data/feed';
import { useClubFollow } from '@/context/club-follow-context';
import type { Club } from '@/data/clubs';

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
};

const FeedContext = createContext<FeedContextType | null>(null);

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
  // Step 2: Randomize order of default posts so different organizations appear at the top on reload
  const shuffled = [...defaultPosts].sort(() => Math.random() - 0.5);
  // Step 3: Assign strictly increasing past offsets so posts have valid chronological history
  const populated = shuffled.map((post, idx) => {
    const offset =
      idx < DEMO_POST_OFFSETS_MS.length
        ? DEMO_POST_OFFSETS_MS[idx]
        : DEMO_POST_OFFSETS_MS[DEMO_POST_OFFSETS_MS.length - 1] + (idx - DEMO_POST_OFFSETS_MS.length + 1) * 86400 * 1000;
    const postTime = now - offset;
    return {
      ...post,
      postedAt: new Date(postTime).toISOString(),
      createdAt: postTime,
    };
  });
  // Step 4: Sort all posts in descending chronological order (newest first)
  return sortPostsByDate(populated);
}

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [feedPosts, setFeedPosts] = useState<Post[]>(getInitialPosts);
  const { isFollowing, toggleFollow } = useClubFollow();

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

      // Step 4: Insert the post into feed state and maintain descending chronological order
      setFeedPosts((prev) => sortPostsByDate([newPost, ...prev]));
      // Step 5: Return newly created post to the caller
      return newPost;
    },
    [isFollowing, toggleFollow]
  );

  const deletePost = useCallback((id: string) => {
    setFeedPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      posts: feedPosts,
      createPost,
      deletePost,
    }),
    [feedPosts, createPost, deletePost]
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
