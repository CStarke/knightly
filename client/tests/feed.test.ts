import { describe, it } from 'node:test';
import assert from 'node:assert';
import { feedCategories, followedOrgs, posts, searchPosts, type FeedCategory } from '@/data/feed';
import { formatPostRelativeTime } from '@/utils/date-format';

describe('Knightly Feed Domain', () => {
  describe('Feed Categories', () => {
    it('contains all twelve official feed categories', () => {
      const expectedCategories: FeedCategory[] = [
        'Academics',
        'Athletics',
        'Career',
        'Culture',
        'Faith',
        'Gaming',
        'Music',
        'Outdoors',
        'Service',
        'Social',
        'The Arts',
        'Wellness',
      ];

      assert.strictEqual(feedCategories.length, 12);
      assert.deepStrictEqual(feedCategories, expectedCategories);
      for (const cat of expectedCategories) {
        assert.ok(feedCategories.includes(cat), `Expected category ${cat} in feedCategories`);
      }
    });

    it('has no duplicates in category list', () => {
      const unique = new Set(feedCategories);
      assert.strictEqual(unique.size, feedCategories.length);
    });
  });

  describe('Posts Structure & Content', () => {
    it('validates each post has non-empty required fields', () => {
      for (const p of posts) {
        assert.ok(p.id.length > 0, 'Post must have an id');
        assert.ok(p.org.length > 0, 'Post must specify organizing body');
        assert.ok(feedCategories.includes(p.category), `Post ${p.id} category ${p.category} must be valid`);
        assert.ok(p.headline.length > 0, 'Post must have headline');
        assert.ok(p.body.length > 0, 'Post must have body copy');
        assert.ok(p.postedAt.length > 0, 'Post must have relative postedAt string');
        assert.strictEqual(typeof p.followed, 'boolean');
        assert.strictEqual(typeof p.campusWide, 'boolean');
      }
    });

    it('contains both followed and campus-wide posts', () => {
      const followed = posts.filter((p) => p.followed);
      const campusWide = posts.filter((p) => p.campusWide);

      assert.ok(followed.length > 0, 'Should have followed posts');
      assert.ok(campusWide.length > 0, 'Should have campus-wide posts');
    });
  });

  describe('Feed Filtering Logic', () => {
    it('filters For You posts (followed OR campusWide)', () => {
      const forYouPosts = posts.filter((p) => p.followed || p.campusWide);
      assert.ok(forYouPosts.length > 0);
      for (const p of forYouPosts) {
        assert.ok(p.followed || p.campusWide, 'For You post must be followed or campus-wide');
      }
    });

    it('filters posts by specific category', () => {
      const athleticsPosts = posts.filter((p) => p.category === 'Athletics');
      assert.ok(athleticsPosts.length > 0);
      for (const p of athleticsPosts) {
        assert.strictEqual(p.category, 'Athletics');
      }
    });

    it('searches posts by keyword in headline or body', () => {
      const query = 'Airband';
      const results = posts.filter(
        (p) =>
          p.headline.toLowerCase().includes(query.toLowerCase()) ||
          p.body.toLowerCase().includes(query.toLowerCase())
      );
      assert.ok(results.length > 0);
      assert.ok(results.some((p) => p.headline.includes('Airband')));
    });
  });

  describe('searchPosts Helper Logic', () => {
    it('returns all posts when search query is empty and category is All', () => {
      const all = searchPosts('', 'All');
      assert.strictEqual(all.length, posts.length);
    });

    it('searches posts matching venue / location in "where" field', () => {
      const covenant = searchPosts('Covenant Fine Arts', 'All');
      assert.ok(covenant.length >= 1);
      assert.ok(covenant.some((p) => p.where?.includes('Covenant')));
    });

    it('searches posts matching organizing body name', () => {
      const saPosts = searchPosts('Student Activities', 'All');
      assert.ok(saPosts.length >= 1);
      assert.ok(saPosts.some((p) => p.org === 'Student Activities'));
    });

    it('combines category filtering with text search query', () => {
      const musicMatches = searchPosts('Covenant', 'Music');
      assert.ok(musicMatches.length >= 1);
      for (const m of musicMatches) {
        assert.strictEqual(m.category, 'Music');
      }

      // Mismatched category returns 0
      const athleticsMatches = searchPosts('Covenant', 'Athletics');
      assert.strictEqual(athleticsMatches.length, 0);
    });

    it('handles search queries with surrounding whitespace and mixed case', () => {
      const padded = searchPosts('   ARENA   ', 'All');
      assert.ok(padded.length >= 1);
      assert.ok(padded.some((p) => p.where?.includes('Van Noord Arena')));
    });
  });

  describe('Feed Invariants & Schema Integrity', () => {
    it('ensures all post IDs are unique', () => {
      const ids = posts.map((p) => p.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All post IDs must be unique');
    });

    it('ensures followedOrgs contains unique organizations from followed posts', () => {
      const uniqueOrgs = new Set(followedOrgs);
      assert.strictEqual(uniqueOrgs.size, followedOrgs.length);
      assert.ok(followedOrgs.length > 0);
    });

    it('validates event time and location formatting on event posts', () => {
      const eventPosts = posts.filter((p) => p.when);
      assert.ok(eventPosts.length > 0, 'Should have posts with event times');

      for (const post of eventPosts) {
        assert.ok(post.when!.length > 0, 'Event when string must not be empty');
        assert.ok(post.where !== undefined && post.where.length > 0, 'Event posts should have locations');
      }
    });

    it('validates image URLs when an image is attached to a post', () => {
      const imagePosts = posts.filter((p) => p.image);
      assert.ok(imagePosts.length > 0, 'Should have posts with hero images');

      for (const post of imagePosts) {
        assert.match(post.image!, /^https?:\/\//, `Post image "${post.image}" must be HTTP/HTTPS`);
      }
    });

    it('validates fallback colors on posts with custom gradients', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      const colorPosts = posts.filter((p) => p.colors);
      assert.ok(colorPosts.length > 0);

      for (const p of colorPosts) {
        assert.strictEqual(p.colors!.length, 2);
        assert.match(p.colors![0], hexPattern);
        assert.match(p.colors![1], hexPattern);
      }
    });
  });

  describe('Relative Timestamp & Clock Skew Resilience', () => {
    it('never produces "Just now ago" under any circumstance', () => {
      assert.strictEqual(formatPostRelativeTime('Just now'), 'Just now');
      assert.strictEqual(formatPostRelativeTime('just now'), 'Just now');
      assert.strictEqual(formatPostRelativeTime('Just now ago'), 'Just now');
      assert.strictEqual(formatPostRelativeTime('now'), 'Just now');
      assert.strictEqual(formatPostRelativeTime(undefined), 'Just now');
      assert.notStrictEqual(formatPostRelativeTime('Just now'), 'Just now ago');
    });

    it('formats freshly created posts within 60s as "Just now"', () => {
      const created = 1_700_000_000_000;
      assert.strictEqual(
        formatPostRelativeTime(undefined, created, undefined, { now: created + 5_000 }),
        'Just now'
      );
      assert.strictEqual(
        formatPostRelativeTime(undefined, created, undefined, { now: created + 59_000 }),
        'Just now'
      );
    });

    it('handles clock rolled back into past (user sets phone back or clock skew)', () => {
      const created = 1_700_000_000_000;
      // Phone clock was manually moved back 2 hours or 10 days
      assert.strictEqual(
        formatPostRelativeTime(undefined, created, undefined, { now: created - 7_200_000 }),
        'Just now'
      );
      assert.strictEqual(
        formatPostRelativeTime(undefined, created, undefined, { now: created - 864_000_000 }),
        'Just now'
      );
    });

    it('shields against device clock changes during active session using monotonic clock', () => {
      const monotonicStart = 10_000;
      // Wall clock jumps 5 days into future due to user manual time change
      const wallCreated = 1_700_000_000_000;
      const wallNowTampered = wallCreated + 5 * 86_400_000;
      // But only 20 seconds elapsed monotonically
      const monotonicNow = monotonicStart + 20_000;

      const formatted = formatPostRelativeTime('Just now', wallCreated, monotonicStart, {
        now: wallNowTampered,
        monotonicNow,
      });

      assert.strictEqual(formatted, 'Just now');
    });

    it('accurately increments elapsed time monotonically during active session', () => {
      const monotonicStart = 10_000;
      assert.strictEqual(
        formatPostRelativeTime('Just now', undefined, monotonicStart, { monotonicNow: monotonicStart + 5 * 60_000 }),
        '5m ago'
      );
      assert.strictEqual(
        formatPostRelativeTime('Just now', undefined, monotonicStart, { monotonicNow: monotonicStart + 3 * 3_600_000 }),
        '3h ago'
      );
      assert.strictEqual(
        formatPostRelativeTime('Just now', undefined, monotonicStart, { monotonicNow: monotonicStart + 2 * 86_400_000 }),
        '2d ago'
      );
    });

    it('is timezone-invariant across different timezones for identical UTC deltas', () => {
      // 2 hours ago in UTC epoch ms
      const createdUtc = 1_700_000_000_000;
      const nowUtc = createdUtc + 2 * 3_600_000;

      // Both EDT (UTC-4) and JST (UTC+9) share the same epoch millisecond delta
      const resultTimezoneA = formatPostRelativeTime(undefined, createdUtc, undefined, { now: nowUtc });
      const resultTimezoneB = formatPostRelativeTime(undefined, createdUtc, undefined, { now: nowUtc });

      assert.strictEqual(resultTimezoneA, '2h ago');
      assert.strictEqual(resultTimezoneA, resultTimezoneB);
    });

    it('correctly handles pre-seeded feed tokens and never double-suffixes "ago"', () => {
      assert.strictEqual(formatPostRelativeTime('2h'), '2h ago');
      assert.strictEqual(formatPostRelativeTime('1d'), '1d ago');
      assert.strictEqual(formatPostRelativeTime('45m'), '45m ago');
      assert.strictEqual(formatPostRelativeTime('2h ago'), '2h ago');
      assert.strictEqual(formatPostRelativeTime('Yesterday ago'), 'Yesterday ago');
    });

    it('formats all mock posts without producing "Just now ago"', () => {
      for (const p of posts) {
        const formatted = formatPostRelativeTime(p.postedAt, p.createdAt, p.monotonicCreatedAt);
        assert.ok(!formatted.includes('Just now ago'), `Post ${p.id} rendered "Just now ago"`);
        assert.ok(!formatted.endsWith('ago ago'), `Post ${p.id} rendered double "ago"`);
      }
    });
  });
});
