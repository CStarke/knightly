import { describe, it } from 'node:test';
import assert from 'node:assert';
import { feedCategories, followedOrgs, posts, searchPosts, type FeedCategory } from '@/data/feed';
import { formatRelativeTime } from '@/utils/date-format';

describe('Knightly Feed Domain', () => {
  describe('Feed Categories', () => {
    it('contains all thirteen official feed categories', () => {
      const expectedCategories: FeedCategory[] = [
        'Academics',
        'Athletics',
        'Career',
        'Culture',
        'Faith',
        'Gaming',
        'Music',
        'Official',
        'Outdoors',
        'Service',
        'Social',
        'The Arts',
        'Wellness',
      ];

      assert.strictEqual(feedCategories.length, 13);
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
      assert.strictEqual(formatRelativeTime('Just now'), 'Just now');
      assert.strictEqual(formatRelativeTime('just now'), 'Just now');
      assert.strictEqual(formatRelativeTime('Just now ago'), 'Just now');
      assert.strictEqual(formatRelativeTime('now'), 'Just now');
      assert.strictEqual(formatRelativeTime(undefined), 'Just now');
      assert.notStrictEqual(formatRelativeTime('Just now'), 'Just now ago');
    });

    it('formats freshly created posts within 60s as "Just now"', () => {
      const created = 1_700_000_000_000;
      assert.strictEqual(
        formatRelativeTime(undefined, created, undefined, { now: created + 5_000 }),
        'Just now'
      );
      assert.strictEqual(
        formatRelativeTime(undefined, created, undefined, { now: created + 59_000 }),
        'Just now'
      );
    });

    it('handles future dates and clock skew resilience', () => {
      const created = 1_700_000_000_000;
      // Minor clock skew within 5 minutes renders as "Just now"
      assert.strictEqual(
        formatRelativeTime(undefined, created, undefined, { now: created - 2 * 60_000 }),
        'Just now'
      );
      // Relative future times within 30 days
      assert.strictEqual(
        formatRelativeTime(undefined, created, undefined, { now: created - 7_200_000, timeZone: 'UTC' }),
        'In 2 hours'
      );
      assert.strictEqual(
        formatRelativeTime(undefined, created, undefined, { now: created - 864_000_000, timeZone: 'UTC' }),
        'In 10 days'
      );
      // Far future dates (> 30 days) render exact posted date
      assert.strictEqual(
        formatRelativeTime(undefined, created, undefined, { now: created - 35 * 86_400_000, timeZone: 'UTC' }),
        'Posted 14 November 2023'
      );
    });

    it('shields against device clock changes during active session using monotonic clock', () => {
      const monotonicStart = 10_000;
      // Wall clock jumps 5 days into future due to user manual time change
      const wallCreated = 1_700_000_000_000;
      const wallNowTampered = wallCreated + 5 * 86_400_000;
      // But only 20 seconds elapsed monotonically
      const monotonicNow = monotonicStart + 20_000;

      const formatted = formatRelativeTime('Just now', wallCreated, monotonicStart, {
        now: wallNowTampered,
        monotonicNow,
      });

      assert.strictEqual(formatted, 'Just now');
    });

    it('accurately increments elapsed time monotonically during active session', () => {
      const monotonicStart = 10_000;
      assert.strictEqual(
        formatRelativeTime('Just now', undefined, monotonicStart, { monotonicNow: monotonicStart + 5 * 60_000 }),
        '5 minutes ago'
      );
      assert.strictEqual(
        formatRelativeTime('Just now', undefined, monotonicStart, { monotonicNow: monotonicStart + 3 * 3_600_000 }),
        '3 hours ago'
      );
      assert.strictEqual(
        formatRelativeTime('Just now', undefined, monotonicStart, { monotonicNow: monotonicStart + 2 * 86_400_000 }),
        '2 days ago'
      );
    });

    it('is timezone-invariant across different timezones for identical UTC deltas', () => {
      // 2 hours ago in UTC epoch ms
      const createdUtc = 1_700_000_000_000;
      const nowUtc = createdUtc + 2 * 3_600_000;

      // Both EDT (UTC-4) and JST (UTC+9) share the same epoch millisecond delta
      const resultTimezoneA = formatRelativeTime(undefined, createdUtc, undefined, { now: nowUtc, timeZone: 'America/New_York' });
      const resultTimezoneB = formatRelativeTime(undefined, createdUtc, undefined, { now: nowUtc, timeZone: 'Asia/Tokyo' });

      assert.strictEqual(resultTimezoneA, '2 hours ago');
      assert.strictEqual(resultTimezoneA, resultTimezoneB);
    });

    it('correctly handles pre-seeded feed tokens and never double-suffixes "ago"', () => {
      assert.strictEqual(formatRelativeTime('2h'), '2h ago');
      assert.strictEqual(formatRelativeTime('1d'), '1d ago');
      assert.strictEqual(formatRelativeTime('45m'), '45m ago');
      assert.strictEqual(formatRelativeTime('2h ago'), '2h ago');
      assert.strictEqual(formatRelativeTime('Yesterday ago'), 'Yesterday ago');
    });

    it('formats all mock posts without producing "Just now ago"', () => {
      for (const p of posts) {
        const formatted = formatRelativeTime(p.postedAt, p.createdAt, p.monotonicCreatedAt);
        assert.ok(!formatted.includes('Just now ago'), `Post ${p.id} rendered "Just now ago"`);
        assert.ok(!formatted.endsWith('ago ago'), `Post ${p.id} rendered double "ago"`);
      }
    });
  });

  describe('Dynamic postedAt Specification & Timezone Invariants', () => {
    const fixedNow = new Date('2026-10-21T15:00:00.000Z').getTime();

    it('renders "Just now" for 0 to 5 minutes ago and minor future clock skew', () => {
      // 0 ms
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow).toISOString(), undefined, undefined, { now: fixedNow }),
        'Just now'
      );
      // 2.5 minutes ago
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 150_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'Just now'
      );
      // 4 minutes 59 seconds ago
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 299_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'Just now'
      );
      // Minor clock skew: 2 minutes in future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 120_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'Just now'
      );
      // Minor clock skew: 4 minutes 59 seconds in future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 299_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'Just now'
      );
    });

    it('renders minutes ago for 5 to 60 minutes range', () => {
      // Exactly 5 minutes
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 5 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '5 minutes ago'
      );
      // 25 minutes
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 25 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '25 minutes ago'
      );
      // 45 minutes
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 45 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '45 minutes ago'
      );
      // 59 minutes 59 seconds
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - (59 * 60_000 + 59_000)).toISOString(), undefined, undefined, { now: fixedNow }),
        '59 minutes ago'
      );
    });

    it('renders truncated number of hours ago for 1 to 24 hours (e.g. 1h 50m displays "1 hour ago")', () => {
      // Exactly 1 hour
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 3_600_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '1 hour ago'
      );
      // 1 hour 50 minutes (user explicit requirement)
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 110 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '1 hour ago'
      );
      // 1 hour 59 minutes
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 119 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '1 hour ago'
      );
      // 2 hours
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 2 * 3_600_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '2 hours ago'
      );
      // 5 hours 30 minutes
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - (5 * 3_600_000 + 1_800_000)).toISOString(), undefined, undefined, { now: fixedNow }),
        '5 hours ago'
      );
      // 23 hours 59 minutes
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - (23 * 3_600_000 + 3_540_000)).toISOString(), undefined, undefined, { now: fixedNow }),
        '23 hours ago'
      );
    });

    it('renders days ago for 1 to 30 days', () => {
      // Exactly 1 day (24 hours)
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 86_400_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '1 day ago'
      );
      // 1 day 18 hours
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - (86_400_000 + 18 * 3_600_000)).toISOString(), undefined, undefined, { now: fixedNow }),
        '1 day ago'
      );
      // 2 days
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 2 * 86_400_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '2 days ago'
      );
      // 15 days
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 15 * 86_400_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '15 days ago'
      );
      // Exactly 30 days
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - 30 * 86_400_000).toISOString(), undefined, undefined, { now: fixedNow }),
        '30 days ago'
      );
      // 30 days 23 hours
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow - (30 * 86_400_000 + 23 * 3_600_000)).toISOString(), undefined, undefined, { now: fixedNow }),
        '30 days ago'
      );
    });

    it('renders exact posted date past 30 days ago (e.g. "Posted 21 October 2026")', () => {
      // 31 days ago
      const thirtyOneDaysAgo = fixedNow - 31 * 86_400_000;
      const formatted31 = formatRelativeTime(new Date(thirtyOneDaysAgo).toISOString(), undefined, undefined, {
        now: fixedNow,
        timeZone: 'UTC',
      });
      assert.strictEqual(formatted31, 'Posted 20 September 2026');

      // 60 days ago
      const sixtyDaysAgo = fixedNow - 60 * 86_400_000;
      const formatted60 = formatRelativeTime(new Date(sixtyDaysAgo).toISOString(), undefined, undefined, {
        now: fixedNow,
        timeZone: 'UTC',
      });
      assert.strictEqual(formatted60, 'Posted 22 August 2026');
    });

    it('renders future relative countdowns before 30 days and switches to exact date past 30 days', () => {
      // 5 minutes in the future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 5 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 5 minutes'
      );
      // 25 minutes in the future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 25 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 25 minutes'
      );
      // 1 hour in the future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 3_600_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 1 hour'
      );
      // 1 hour 50 minutes in the future (truncated)
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 110 * 60_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 1 hour'
      );
      // 2 hours in the future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 2 * 3_600_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 2 hours'
      );
      // 8 days in the future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 8 * 86_400_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 8 days'
      );
      // 30 days in the future
      assert.strictEqual(
        formatRelativeTime(new Date(fixedNow + 30 * 86_400_000).toISOString(), undefined, undefined, { now: fixedNow }),
        'In 30 days'
      );
      // 35 days in the future (> 30 days switches to direct date)
      const farFuture = fixedNow + 35 * 86_400_000;
      assert.strictEqual(
        formatRelativeTime(new Date(farFuture).toISOString(), undefined, undefined, { now: fixedNow, timeZone: 'UTC' }),
        'Posted 25 November 2026'
      );
    });

    it('correctly adapts date boundary across different time zones', () => {
      // 2026-10-21T01:30:00.000Z (1:30 AM UTC on Oct 21 = 9:30 PM EDT on Oct 20)
      const dateIso = '2026-10-21T01:30:00.000Z';
      const farFuture = new Date('2026-12-01T00:00:00.000Z').getTime();

      const utcResult = formatRelativeTime(dateIso, undefined, undefined, { now: farFuture, timeZone: 'UTC' });
      const nyResult = formatRelativeTime(dateIso, undefined, undefined, { now: farFuture, timeZone: 'America/New_York' });
      const tokyoResult = formatRelativeTime(dateIso, undefined, undefined, { now: farFuture, timeZone: 'Asia/Tokyo' });

      assert.strictEqual(utcResult, 'Posted 21 October 2026');
      assert.strictEqual(nyResult, 'Posted 20 October 2026');
      assert.strictEqual(tokyoResult, 'Posted 21 October 2026');
    });

    it('accepts Date instances, epoch numbers, and ISO strings identically', () => {
      const targetTime = fixedNow - 15 * 60_000; // 15 mins ago
      const fromIso = formatRelativeTime(new Date(targetTime).toISOString(), undefined, undefined, { now: fixedNow });
      const fromNum = formatRelativeTime(targetTime, undefined, undefined, { now: fixedNow });
      const fromDate = formatRelativeTime(new Date(targetTime), undefined, undefined, { now: fixedNow });

      assert.strictEqual(fromIso, '15 minutes ago');
      assert.strictEqual(fromNum, '15 minutes ago');
      assert.strictEqual(fromDate, '15 minutes ago');
    });

    it('sorts posts by date posted with newest at the top', () => {
      const { sortPostsByDate } = require('@/data/feed');
      const postsUnsorted = [
        { ...posts[0], id: 'older-1', postedAt: '2026-09-10T12:00:00.000Z' },
        { ...posts[0], id: 'newest', postedAt: '2026-10-01T10:00:00.000Z' },
        { ...posts[0], id: 'older-2', postedAt: '2026-09-15T12:00:00.000Z' },
        { ...posts[0], id: 'middle', postedAt: '2026-09-25T12:00:00.000Z' },
      ];
      const sorted = sortPostsByDate(postsUnsorted);
      assert.strictEqual(sorted[0].id, 'newest');
      assert.strictEqual(sorted[1].id, 'middle');
      assert.strictEqual(sorted[2].id, 'older-2');
      assert.strictEqual(sorted[3].id, 'older-1');

      for (let i = 0; i < sorted.length - 1; i++) {
        const timeA = new Date(sorted[i].postedAt).getTime();
        const timeB = new Date(sorted[i + 1].postedAt).getTime();
        assert.ok(timeA >= timeB, 'Posts must be in descending order of creation time');
      }
    });
  });

  describe('Feed Even Grid & 1-Click Unified Filter Invariants', () => {
    it('chunks posts into strictly even rows with equal cell counts and spacers', () => {
      const samplePosts = posts.slice(0, 5); // 5 items

      // 2-column even row chunking
      const numCols = 2;
      const rows: typeof posts[] = [];
      for (let i = 0; i < samplePosts.length; i += numCols) {
        rows.push(samplePosts.slice(i, i + numCols));
      }

      assert.strictEqual(rows.length, 3);
      assert.strictEqual(rows[0].length, 2);
      assert.strictEqual(rows[1].length, 2);
      assert.strictEqual(rows[2].length, 1);

      // Spacer calculation for the incomplete last row
      const spacersNeeded = numCols - rows[rows.length - 1].length;
      assert.strictEqual(spacersNeeded, 1, 'Odd item count must compute exactly 1 spacer cell');
    });

    it('filters posts with 1-click single-tier filter across All, Following, and specific categories', () => {
      const isFollowing = (clubId: string) => clubId === 'student-activities';

      // 1-Click: "Following"
      const followingPosts = posts.filter((post) => {
        const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return post.campusWide || isFollowing(clubId);
      });
      assert.ok(followingPosts.length > 0);

      // 1-Click: "Athletics"
      const athleticsPosts = posts.filter((post) => post.category === 'Athletics');
      assert.ok(athleticsPosts.length > 0);
      for (const p of athleticsPosts) {
        assert.strictEqual(p.category, 'Athletics');
      }

      // 1-Click: "All"
      const allPosts = posts.filter(() => true);
      assert.strictEqual(allPosts.length, posts.length);
    });

    it('supports multiple selection across categories and preserves mutual exclusivity with "All"', () => {
      const isFollowing = (clubId: string) => clubId === 'student-activities';

      // Multi-select test helper mirroring toggleFilter logic
      let filters = new Set<string>(['All']);

      const toggle = (opt: string) => {
        if (opt === 'All') {
          filters = new Set(['All']);
          return;
        }
        filters.delete('All');
        if (filters.has(opt)) {
          filters.delete(opt);
        } else {
          filters.add(opt);
        }
        if (filters.size === 0) {
          filters = new Set(['All']);
        }
      };

      // 1. Initial state is "All"
      assert.ok(filters.has('All'));
      assert.strictEqual(filters.size, 1);

      // 2. Select "Athletics" -> "All" is cleared
      toggle('Athletics');
      assert.ok(!filters.has('All'));
      assert.ok(filters.has('Athletics'));
      assert.strictEqual(filters.size, 1);

      // 3. Multi-select "Faith" -> both "Athletics" and "Faith" are active
      toggle('Faith');
      assert.ok(filters.has('Athletics'));
      assert.ok(filters.has('Faith'));
      assert.strictEqual(filters.size, 2);

      // Verify filtered posts include posts from BOTH categories (union)
      const multiCatPosts = posts.filter((p) => filters.has(p.category));
      const hasAthletics = multiCatPosts.some((p) => p.category === 'Athletics');
      const hasFaith = multiCatPosts.some((p) => p.category === 'Faith');
      assert.ok(hasAthletics, 'Must include Athletics posts in multi-select');
      assert.ok(hasFaith, 'Must include Faith posts in multi-select');
      assert.ok(
        multiCatPosts.every((p) => p.category === 'Athletics' || p.category === 'Faith'),
        'All results must belong to selected categories'
      );

      // 4. Combine with "Following"
      toggle('Following');
      assert.ok(filters.has('Following'));
      assert.ok(filters.has('Athletics'));
      assert.ok(filters.has('Faith'));

      const constrainedPosts = posts.filter((post) => {
        const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const matchesFollow = post.campusWide || isFollowing(clubId);
        const matchesCategory = post.category === 'Athletics' || post.category === 'Faith';
        return matchesFollow && matchesCategory;
      });
      assert.ok(constrainedPosts.length <= multiCatPosts.length);

      // 5. Selecting "All" clears all specific categories and Following
      toggle('All');
      assert.ok(filters.has('All'));
      assert.strictEqual(filters.size, 1);

      // 6. Deselecting the last active specific category falls back to "All"
      toggle('Academics');
      assert.ok(filters.has('Academics'));
      assert.ok(!filters.has('All'));
      toggle('Academics');
      assert.ok(filters.has('All'), 'Falling back to All when empty');
      assert.strictEqual(filters.size, 1);
    });
  });
});
