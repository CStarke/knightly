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

import { posts as defaultPosts, type Post, type FeedCategory } from '@/data/feed';
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

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [feedPosts, setFeedPosts] = useState<Post[]>(defaultPosts);
  const { isFollowing, toggleFollow } = useClubFollow();

  /**
   * Publishes a new event flyer or announcement.
   *
   * WHY PREPENDING ([newPost, ...prev]):
   * Campus social feeds are reverse-chronological. Placing newly authored posts at index 0
   * ensures immediate visual confirmation when the user returns to the Home feed.
   *
   * WHY AUTO-FOLLOW ON PUBLISH:
   * When a club leader publishes on behalf of their organization, they expect that post to
   * show up when filtering by "Following". Automatically following the organization guarantees
   * consistent feed visibility.
   */
  const createPost = useCallback(
    (input: CreatePostInput): Post => {
      const { club, title, description, image, when, where } = input;

      const newPost: Post = {
        id: `p-local-${Date.now()}`,
        clubId: club.id,
        org: club.name,
        mark: club.mark,
        category: club.category as FeedCategory,
        postedAt: 'Just now',
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

      // Ensure leader follows the club so it shows in Following & For You
      if (!isFollowing(club.id)) {
        toggleFollow(club.id);
      }

      setFeedPosts((prev) => [newPost, ...prev]);
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
