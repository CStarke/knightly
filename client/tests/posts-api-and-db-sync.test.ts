/**
 * Posts API & Database Model Adapter Invariant Tests
 *
 * ARCHITECTURAL CONTEXT & SPRINT 1 SLO (SC2):
 * Verifies that the client correctly adapts Supabase PostgreSQL rows into
 * first-class `Post` view models, and enforces offline resilience fallback to
 * seed data (`defaultPosts` & `CALVIN_EVENTS_SEED`) whenever the backend is offline.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adaptDatabasePostToClientPost,
  type DatabasePostRow,
} from '@/utils/post-database-adapter';
import { fetchFeedPosts, createPostApi, deletePostApi } from '@/services/posts-api';
import { feedCategories, type FeedCategory } from '@/data/feed';
import { CALVIN_CLUBS } from '@/data/clubs';

test('Posts Database Adapter & API Service Invariants', async (t) => {
  await t.test('adapts database post row into client Post model accurately', () => {
    const dbRow: DatabasePostRow = {
      id: 'post-uuid-1234',
      club_id: 'abstraction',
      author_student_id: 'student-uuid-42',
      org_name: 'Abstraction',
      mark: 'AB',
      headline: 'Autonomous Hack Night',
      body: 'Building database-backed apps tonight in NH 276.',
      category: 'Academics',
      event_date: '2026-10-28',
      start_time: '18:30:00',
      end_time: '20:30:00',
      when_text: 'Wed, Oct 28 · 6:30 PM - 8:30 PM',
      where_text: 'North Hall 276',
      image_url: 'https://images.unsplash.com/photo-example',
      fallback_banner_svg: null,
      campus_wide: false,
      source: 'club',
      status: 'published',
      posted_at: '2026-10-28T22:00:00.000Z',
      created_at_ms: 1793224800000,
    };

    const post = adaptDatabasePostToClientPost(dbRow);

    assert.equal(post.id, 'post-uuid-1234');
    assert.equal(post.clubId, 'abstraction');
    assert.equal(post.org, 'Abstraction');
    assert.equal(post.mark, 'AB');
    assert.equal(post.headline, 'Autonomous Hack Night');
    assert.equal(post.body, 'Building database-backed apps tonight in NH 276.');
    assert.equal(post.category, 'Academics');
    assert.equal(post.when, 'Wed, Oct 28 · 6:30 PM - 8:30 PM');
    assert.equal(post.where, 'North Hall 276');
    assert.equal(post.image, 'https://images.unsplash.com/photo-example');
    assert.equal(post.createdAt, 1793224800000);
    assert.equal(post.campusWide, false);

    // Verify club visual branding inheritance
    const abstractionClub = CALVIN_CLUBS.find((c) => c.id === 'abstraction');
    assert.deepEqual(post.colors, abstractionClub?.colors);
    assert.equal(post.sf, abstractionClub?.sf);
    assert.equal(post.md, abstractionClub?.md);
  });

  await t.test('deterministically assigns category Simple Banner preset when image_url is missing', () => {
    const dbRowWithoutImage: DatabasePostRow = {
      id: 'post-uuid-5678',
      club_id: null,
      author_student_id: null,
      org_name: 'Calvin Chapel',
      mark: 'CC',
      headline: 'Morning Worship',
      body: 'Gathering together in the Chapel sanctuary.',
      category: 'Faith',
      when_text: 'Fri · 10:00 AM',
      where_text: 'Chapel',
      image_url: null,
      fallback_banner_svg: null,
      campus_wide: true,
      source: 'calvin_drupal',
      status: 'published',
      posted_at: '2026-10-28T14:00:00.000Z',
      created_at_ms: 1793196000000,
    };

    const post = adaptDatabasePostToClientPost(dbRowWithoutImage);

    assert.ok(post.image);
    assert.equal(post.image, 'preset:maroon:diamonds', 'Faith events must default to preset:maroon:diamonds');
  });

  await t.test('safely falls back to Culture when category is unrecognized in database row', () => {
    const dbRowWithInvalidCategory: DatabasePostRow = {
      id: 'post-uuid-9999',
      club_id: null,
      org_name: 'Campus Event',
      headline: 'Misc Campus Meetup',
      body: 'Informal gathering.',
      category: 'NonExistentCategory',
      posted_at: '2026-10-28T12:00:00.000Z',
      created_at_ms: 1793188800000,
    };

    const post = adaptDatabasePostToClientPost(dbRowWithInvalidCategory);
    assert.equal(post.category, 'Culture', 'Must constrain to standard 13 categories');
    assert.ok(feedCategories.includes(post.category));
  });

  await t.test('guarantees offline resilience and returns fallback seed posts when backend is offline', async () => {
    // Calling fetchFeedPosts when no mock/local server is running triggers the graceful fallback
    const posts = await fetchFeedPosts();

    assert.ok(Array.isArray(posts));
    assert.ok(posts.length > 0, 'Must never return empty or throw on network error');

    // Verify posts include campus seed data
    const hasCalvinEvent = posts.some((p) => p.clubId === 'calvin-university' || p.campusWide);
    assert.ok(hasCalvinEvent, 'Fallback must incorporate isolated seed dataset');
  });

  await t.test('createPostApi and deletePostApi handle network disconnect without throwing unhandled exceptions', async () => {
    // Calling with non-existent localhost port
    const result = await createPostApi({
      orgName: 'ACM',
      headline: 'Test Flyer',
      body: 'Test content',
      category: 'Academics',
      authorStudentId: '00000000-0000-0000-0000-000000000042',
    });

    // In offline mode, createPostApi returns null so client keeps optimistic post
    assert.equal(result, null);

    const deleted = await deletePostApi('non-existent-uuid');
    assert.equal(deleted, false);
  });
});
