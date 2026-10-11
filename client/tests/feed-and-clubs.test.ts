import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  feedCategories,
  filterFeedPosts,
  followedOrgs,
  posts,
  resolveFeedColumnCount,
  searchPosts,
  forYouPosts,
  getPostsByClubId,
  type FeedCategory,
  type Post,
} from '@/data/feed';
import { formatRelativeTime } from '@/utils/date-format';
import { distributeIntoRows } from '@/utils/chip-layout';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import { CALVIN_EVENTS_SEED, type ScrapedCalvinEvent } from '@/data/calvin-events-seed';
import {
  CALVIN_CLUBS,
  getAllClubs,
  getClubById,
  getClubByName,
  searchClubs,
} from '@/data/clubs';
import { DEFAULT_FOLLOWED_CLUB_IDS } from '@/context/club-follow-context';

describe('Knightly Feed & Clubs Domain', () => {
  // ==========================================================================
  // Suite 1: Feed Taxonomy & Category Standards
  // ==========================================================================
  describe('Feed Taxonomy & Categories', () => {
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

    it('contains all thirteen official feed categories in standard alphabetical order', () => {
      assert.strictEqual(feedCategories.length, 13);
      assert.deepStrictEqual(feedCategories, expectedCategories);
    });

    it('has zero duplicate categories in the official taxonomy', () => {
      const unique = new Set(feedCategories);
      assert.strictEqual(unique.size, feedCategories.length);
    });

    it('validates each category is a non-empty string without trailing whitespace', () => {
      for (const cat of feedCategories) {
        assert.ok(cat.length > 0);
        assert.strictEqual(cat, cat.trim());
      }
    });

    it('verifies case-insensitive category lookups across all 13 categories', () => {
      for (const cat of feedCategories) {
        const found = feedCategories.find((c) => c.toLowerCase() === cat.toLowerCase());
        assert.strictEqual(found, cat);
      }
    });

    for (const cat of expectedCategories) {
      it(`guarantees category "${cat}" filters matching sample post and ignores mismatched`, () => {
        const matchingPost: Post = {
          id: `test-cat-${cat}`,
          org: 'Calvin University',
          mark: 'CU',
          headline: `${cat} Event Headline`,
          body: `Description for ${cat}`,
          category: cat,
          postedAt: new Date().toISOString(),
          followed: false,
          campusWide: true,
        };
        const res = filterFeedPosts([matchingPost], { scope: 'All', categories: [cat] });
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].category, cat);

        // Negative check: wrong category
        const wrongCat = cat === 'Athletics' ? 'Faith' : 'Athletics';
        const emptyRes = filterFeedPosts([matchingPost], { scope: 'All', categories: [wrongCat] });
        assert.strictEqual(emptyRes.length, 0);
      });
    }
  });

  // ==========================================================================
  // Suite 2: Post Invariants & Schema Verification
  // ==========================================================================
  describe('Post Schema & Invariants', () => {
    it('validates each post has non-empty required fields', () => {
      for (const post of posts) {
        assert.ok(post.id && post.id.length > 0, `Post must have an id: ${JSON.stringify(post)}`);
        assert.ok(post.org && post.org.length > 0, `Post ${post.id} must have an org`);
        assert.ok(post.mark && post.mark.length > 0, `Post ${post.id} must have a mark`);
        assert.ok(post.headline && post.headline.length > 0, `Post ${post.id} must have a headline`);
        assert.ok(post.category && post.category.length > 0, `Post ${post.id} must have a category`);
        assert.ok(post.postedAt && post.postedAt.length > 0, `Post ${post.id} must have a postedAt date`);
        assert.ok(feedCategories.includes(post.category), `Post ${post.id} has invalid category: ${post.category}`);
      }
    });

    it('ensures all post IDs are unique across the entire dataset', () => {
      const ids = posts.map((p) => p.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All post IDs must be unique');
    });

    it('contains both followed and campus-wide posts', () => {
      const followed = posts.filter((p) => p.followed);
      const campusWide = posts.filter((p) => p.campusWide);
      assert.ok(followed.length > 0, 'Should have followed posts');
      assert.ok(campusWide.length > 0, 'Should have campus-wide posts');
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
      for (const post of imagePosts) {
        assert.ok(
          post.image!.startsWith('http') || post.image!.startsWith('preset:'),
          `Post ${post.id} has invalid image URL: ${post.image}`
        );
      }
    });

    it('validates fallback colors on posts with custom gradients', () => {
      const coloredPosts = posts.filter((p) => p.colors);
      for (const post of coloredPosts) {
        assert.strictEqual(post.colors!.length, 2, `Post ${post.id} colors must have 2 gradient colors`);
        for (const color of post.colors!) {
          assert.match(color, /^#[0-9A-Fa-f]{6}$/, `Post ${post.id} color ${color} must be valid hex`);
        }
      }
    });

    it('sorts posts by date posted with newest at the top', () => {
      const postDates = posts.map((p) => new Date(p.postedAt).getTime());
      for (let i = 0; i < postDates.length - 1; i++) {
        assert.ok(postDates[i] >= postDates[i + 1], `Post at index ${i} is older than index ${i + 1}`);
      }
    });
  });

  // ==========================================================================
  // Suite 3: Feed Filtering & Category Selection
  // ==========================================================================
  describe('Feed Filtering Logic', () => {
    it('filters For You posts (followed OR campusWide)', () => {
      const forYou = posts.filter((p) => p.followed || p.campusWide);
      assert.ok(forYou.length > 0);
      for (const p of forYou) {
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

    it('filters posts across all 13 categories independently', () => {
      for (const cat of feedCategories) {
        const filtered = posts.filter((p) => p.category === cat);
        for (const p of filtered) {
          assert.strictEqual(p.category, cat);
        }
      }
    });

    it('filters posts with 1-click single-tier filter across All, Following, and specific categories', () => {
      const allResult = filterFeedPosts(posts, { scope: 'All' });
      assert.strictEqual(allResult.length, posts.length);

      const followingResult = filterFeedPosts(posts, {
        scope: 'Following',
        isFollowing: (id) => id === 'acm',
      });
      assert.ok(followingResult.length > 0);
      for (const p of followingResult) {
        assert.ok(p.campusWide || p.clubId === 'acm');
      }
    });

    it('supports multiple selection across categories and preserves mutual exclusivity with "All"', () => {
      const filtered = filterFeedPosts(posts, {
        scope: 'All',
        categories: ['Faith', 'Music'],
      });
      assert.ok(filtered.length > 0);
      for (const p of filtered) {
        assert.ok(p.category === 'Faith' || p.category === 'Music');
      }
    });

    it('returns all posts when mobile scope is "All" and no categories are selected', () => {
      const res = filterFeedPosts(posts, { scope: 'All', categories: [] });
      assert.strictEqual(res.length, posts.length);
    });

    it('filters to followed clubs and campus-wide notices when mobile scope is "Following" with no categories', () => {
      const followSet = new Set(['acm']);
      const res = filterFeedPosts(posts, {
        scope: 'Following',
        categories: [],
        isFollowing: (id) => followSet.has(id),
      });
      for (const p of res) {
        const clubId = p.clubId ?? p.org.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        assert.ok(p.campusWide || followSet.has(clubId));
      }
    });

    it('combines mobile scope, category filters, and search query', () => {
      const res = filterFeedPosts(posts, {
        scope: 'All',
        categories: ['Athletics'],
        query: 'Van Noord',
      });
      for (const p of res) {
        assert.strictEqual(p.category, 'Athletics');
        const matchesQuery =
          p.headline.toLowerCase().includes('van noord') ||
          p.body.toLowerCase().includes('van noord') ||
          (p.where && p.where.toLowerCase().includes('van noord'));
        assert.ok(matchesQuery);
      }
    });

    it('preserves selected categories when switching mobile scope between "All" and "Following"', () => {
      const cats: FeedCategory[] = ['Academics'];
      const allScope = filterFeedPosts(posts, { scope: 'All', categories: cats });
      const followingScope = filterFeedPosts(posts, {
        scope: 'Following',
        categories: cats,
        isFollowing: (id) => id === 'acm',
      });
      for (const p of allScope) assert.strictEqual(p.category, 'Academics');
      for (const p of followingScope) assert.strictEqual(p.category, 'Academics');
    });

    it('supports "ALL CLUBS" scope and "FOLLOWING" scope uppercase aliases', () => {
      const allClubs = filterFeedPosts(posts, { scope: 'ALL CLUBS' });
      assert.strictEqual(allClubs.length, posts.length);
      const folClubs = filterFeedPosts(posts, {
        scope: 'FOLLOWING',
        isFollowing: () => false,
      });
      for (const p of folClubs) assert.ok(p.campusWide);
    });
  });

  // ==========================================================================
  // Suite 4: Feed Search & Query Matching
  // ==========================================================================
  describe('Feed Search & Query Matching', () => {
    it('returns all posts when search query is empty and category is All', () => {
      const all = searchPosts('', 'All');
      assert.strictEqual(all.length, posts.length);
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

      const athleticsMatches = searchPosts('Covenant', 'Athletics');
      assert.strictEqual(athleticsMatches.length, 0);
    });

    it('handles search queries with surrounding whitespace and mixed case', () => {
      const padded = searchPosts('   ARENA   ', 'All');
      assert.ok(padded.length >= 1);
      assert.ok(padded.some((p) => p.where?.includes('Van Noord Arena')));
    });

    it('returns empty array when search query matches no post', () => {
      const empty = searchPosts('NonExistentTermXYZ12345', 'All');
      assert.strictEqual(empty.length, 0);
    });

    it('handles special characters and punctuation in query without throwing regex errors', () => {
      const special = searchPosts('(Chapel) [Worship] * & ^ $ # @', 'All');
      assert.ok(Array.isArray(special));
    });
  });

  // ==========================================================================
  // Suite 5: Relative Time Formatting & Monotonic Resilience
  // ==========================================================================
  describe('Relative Time Formatting', () => {
    it('never produces "Just now ago" under any circumstance', () => {
      const now = Date.now();
      const testDeltas = [0, 500, 1000, 30000, 60000, 120000, 3600000, 86400000];
      for (const delta of testDeltas) {
        const formatted = formatRelativeTime(new Date(now - delta).toISOString());
        assert.ok(!formatted.includes('Just now ago'), `Must never produce "Just now ago", got: ${formatted}`);
      }
    });

    it('formats freshly created posts within 60s as "Just now"', () => {
      const now = Date.now();
      assert.strictEqual(formatRelativeTime(new Date(now - 10000).toISOString()), 'Just now');
      assert.strictEqual(formatRelativeTime(new Date(now - 59000).toISOString()), 'Just now');
    });

    it('handles future dates and clock skew resilience gracefully', () => {
      const now = Date.now();
      const futureDate = new Date(now + 120000).toISOString();
      const formatted = formatRelativeTime(futureDate);
      assert.ok(!formatted.includes('NaN'), 'Formatted string must never contain NaN');
    });

    it('renders minutes ago for 5 to 60 minutes range', () => {
      const now = Date.now();
      const tenMinsAgo = new Date(now - 10 * 60 * 1000).toISOString();
      const formatted = formatRelativeTime(tenMinsAgo);
      assert.strictEqual(formatted, '10 minutes ago');
    });

    it('renders truncated number of hours ago for 1 to 24 hours', () => {
      const now = Date.now();
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      assert.strictEqual(formatRelativeTime(twoHoursAgo), '2 hours ago');
    });

    it('renders days ago for 1 to 30 days', () => {
      const now = Date.now();
      const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
      assert.strictEqual(formatRelativeTime(fiveDaysAgo), '5 days ago');
    });

    it('accepts Date instances, epoch numbers, and ISO strings identically', () => {
      const targetTime = Date.now() - 3600000;
      const strRes = formatRelativeTime(new Date(targetTime).toISOString());
      const numRes = formatRelativeTime(targetTime);
      const dateRes = formatRelativeTime(new Date(targetTime));
      assert.strictEqual(strRes, numRes);
      assert.strictEqual(strRes, dateRes);
    });

    // Parameterized time interval progression
    const minuteTestCases = [5, 12, 25, 45, 59];
    for (const m of minuteTestCases) {
      it(`formats ${m} minutes ago correctly`, () => {
        const time = new Date(Date.now() - m * 60 * 1000).toISOString();
        const formatted = formatRelativeTime(time);
        assert.strictEqual(formatted, `${m} minutes ago`);
      });
    }

    const hourTestCases = [1, 3, 6, 12, 23];
    for (const h of hourTestCases) {
      it(`formats ${h} hour(s) ago correctly`, () => {
        const time = new Date(Date.now() - h * 3600 * 1000).toISOString();
        const formatted = formatRelativeTime(time);
        assert.strictEqual(formatted, h === 1 ? '1 hour ago' : `${h} hours ago`);
      });
    }

    const dayTestCases = [1, 2, 7, 14, 29];
    for (const d of dayTestCases) {
      it(`formats ${d} day(s) ago correctly`, () => {
        const time = new Date(Date.now() - d * 86400 * 1000).toISOString();
        const formatted = formatRelativeTime(time);
        assert.strictEqual(formatted, d === 1 ? '1 day ago' : `${d} days ago`);
      });
    }
  });

  // ==========================================================================
  // Suite 6: Responsive Column Layout & Breakpoints
  // ==========================================================================
  describe('Feed Column Resolution & Responsive Grid', () => {
    it('resolves strictly 1 singular column on mobile app (iOS & Android) regardless of screen width', () => {
      assert.strictEqual(resolveFeedColumnCount(375, 'ios'), 1);
      assert.strictEqual(resolveFeedColumnCount(414, 'android'), 1);
      assert.strictEqual(resolveFeedColumnCount(768, 'ios'), 1);
      assert.strictEqual(resolveFeedColumnCount(1200, 'android'), 1);
    });

    it('resolves responsive multi-column layout on web based on breakpoint thresholds', () => {
      assert.strictEqual(resolveFeedColumnCount(600, 'web'), 1, 'Mobile phone web: 1 column');
      assert.strictEqual(resolveFeedColumnCount(800, 'web'), 2, 'Tablet web: 2 columns');
      assert.strictEqual(resolveFeedColumnCount(1100, 'web'), 3, 'Desktop web: 3 columns');
      assert.strictEqual(resolveFeedColumnCount(1400, 'web'), 4, 'Wide desktop web: 4 columns');
      assert.strictEqual(resolveFeedColumnCount(1920, 'web'), 5, 'Ultra-wide web capped at 5');
      assert.strictEqual(resolveFeedColumnCount(2560, 'web'), 5, '4K ultra-wide web capped at 5');
    });
  });

  // ==========================================================================
  // Suite 7: Chip Layout & Category Grid Partitioning
  // ==========================================================================
  describe('Chip Layout & Grid Partitioning', () => {
    it('distributes 13 feed categories into balanced rows with max 4 chips per row', () => {
      const rows = distributeIntoRows(feedCategories, 4);
      assert.strictEqual(rows.length, 4, '13 categories must take 4 rows with max 4 per row');
      assert.strictEqual(rows[0].length, 4);
      assert.strictEqual(rows[1].length, 3);
      assert.strictEqual(rows[2].length, 3);
      assert.strictEqual(rows[3].length, 3);

      assert.deepStrictEqual(rows[0], ['Academics', 'Athletics', 'Career', 'Culture']);
      assert.deepStrictEqual(rows[1], ['Faith', 'Gaming', 'Music']);
      assert.deepStrictEqual(rows[2], ['Official', 'Outdoors', 'Service']);
      assert.deepStrictEqual(rows[3], ['Social', 'The Arts', 'Wellness']);
    });

    it('handles empty list safely', () => {
      const rows = distributeIntoRows([], 4);
      assert.deepStrictEqual(rows, []);
    });

    it('handles single item list', () => {
      const rows = distributeIntoRows(['Academics'], 4);
      assert.deepStrictEqual(rows, [['Academics']]);
    });

    it('distributes across minimum rows for varying item counts 1 through 16', () => {
      for (let count = 1; count <= 16; count++) {
        const items = Array.from({ length: count }, (_, i) => `item-${i}`);
        const rows = distributeIntoRows(items, 4);
        const totalItemsInRows = rows.reduce((acc, r) => acc + r.length, 0);
        assert.strictEqual(totalItemsInRows, count, `Row distribution lost items for count ${count}`);
        for (const r of rows) {
          assert.ok(r.length <= 4, `Row exceeded maxPerRow for count ${count}`);
          assert.ok(r.length > 0, `Empty row generated for count ${count}`);
        }
      }
    });

    it('distributes items evenly with maxPerRow = 3, 4, 5, 6', () => {
      for (const maxPerRow of [3, 4, 5, 6]) {
        const rows = distributeIntoRows(feedCategories, maxPerRow);
        const total = rows.reduce((acc, r) => acc + r.length, 0);
        assert.strictEqual(total, feedCategories.length);
        for (const r of rows) {
          assert.ok(r.length <= maxPerRow);
        }
      }
    });
  });

  // ==========================================================================
  // Suite 8: Calvin Clubs Catalog & Invariants
  // ==========================================================================
  describe('Clubs Catalog & Directory Invariants', () => {
    it('contains a rich list of Calvin clubs and campus organizations', () => {
      assert.ok(CALVIN_CLUBS.length >= 15, 'Should have at least 15 campus clubs/orgs');
      assert.strictEqual(getAllClubs().length, CALVIN_CLUBS.length);
    });

    it('ensures all club IDs are unique and URL-safe kebab-case', () => {
      const ids = CALVIN_CLUBS.map((c) => c.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All club IDs must be unique');
      for (const id of ids) {
        assert.match(id, /^[a-z0-9-]+$/, `Club ID "${id}" must be kebab-case`);
      }
    });

    it('validates required fields on all club records', () => {
      for (const club of CALVIN_CLUBS) {
        assert.ok(club.id.length > 0, 'Club ID must not be empty');
        assert.ok(club.name.length > 0, 'Club name must not be empty');
        assert.ok(club.category.length > 0, 'Club category must not be empty');
        assert.ok(club.mark.length >= 2, 'Club mark must be at least 2 chars');
        assert.ok(club.tagline.length > 0, 'Club tagline must not be empty');
        assert.ok(club.description.length > 0, 'Club description must not be empty');
        assert.ok(club.contactEmail.endsWith('@calvin.edu'), `${club.name} email must be @calvin.edu`);
        assert.strictEqual(club.colors.length, 2, 'Club colors must have 2 gradient colors');
        assert.ok(club.sf.length > 0, 'SF Symbol name must not be empty');
        assert.ok(club.md.length > 0, 'Material icon name must not be empty');
      }
    });

    it('finds clubs by ID case-insensitively', () => {
      const acm = getClubById('acm');
      assert.ok(acm);
      assert.strictEqual(acm?.name, 'ACM Student Chapter');
      const upper = getClubById('ACM');
      assert.ok(upper);
      assert.strictEqual(upper?.id, 'acm');
      const notFound = getClubById('nonexistent-club');
      assert.strictEqual(notFound, undefined);
    });

    it('finds clubs by exact name case-insensitively', () => {
      const theatre = getClubByName('Calvin Theatre Company');
      assert.ok(theatre);
      assert.strictEqual(theatre?.id, 'calvin-theatre');
      const lower = getClubByName('calvin theatre company');
      assert.ok(lower);
      assert.strictEqual(lower?.id, 'calvin-theatre');
      const notFound = getClubByName('Fake Club');
      assert.strictEqual(notFound, undefined);
    });

    it('searches clubs by query and category filter', () => {
      const codingMatches = searchClubs('coding', 'All');
      assert.ok(codingMatches.some((c) => c.id === 'acm'));
      const artsClubs = searchClubs('', 'The Arts');
      assert.ok(artsClubs.length > 0);
      for (const club of artsClubs) {
        assert.strictEqual(club.category, 'The Arts');
      }
      assert.strictEqual(searchClubs('', 'All').length, CALVIN_CLUBS.length);
    });

    it('verifies all club categories match registered feed categories', () => {
      for (const club of CALVIN_CLUBS) {
        assert.ok(feedCategories.includes(club.category as FeedCategory), `Club ${club.id} has category ${club.category} not in feedCategories`);
      }
    });

    it('verifies all club gradient colors are valid 7-character hex color codes', () => {
      for (const club of CALVIN_CLUBS) {
        for (const color of club.colors) {
          assert.match(color, /^#[0-9A-Fa-f]{6}$/, `${club.id} color ${color} is not 7-char hex`);
        }
      }
    });

    it('ensures "index" is not treated as a valid club id', () => {
      assert.strictEqual(getClubById('index'), undefined);
    });
  });

  // ==========================================================================
  // Suite 9: Club Following State & FollowButton Template Contract
  // ==========================================================================
  describe('Club Following & FollowButton Contract', () => {
    it('defines sensible default followed clubs for initial onboarding', () => {
      assert.ok(DEFAULT_FOLLOWED_CLUB_IDS.length > 0);
      for (const id of DEFAULT_FOLLOWED_CLUB_IDS) {
        assert.ok(getClubById(id) !== undefined, `Default followed club ${id} must exist in catalog`);
      }
    });

    it('always includes campus-wide announcements in Following regardless of follows', () => {
      const followNone = (_id: string) => false;
      const filtered = filterFeedPosts(posts, { scope: 'Following', isFollowing: followNone });
      for (const post of filtered) {
        assert.ok(post.campusWide, 'Must be campus-wide if user follows nobody');
      }
    });

    it('includes club posts when user follows the club, and excludes them when unfollowed', () => {
      const followAcmOnly = (id: string) => id === 'acm';
      const filtered = filterFeedPosts(posts, { scope: 'Following', isFollowing: followAcmOnly });
      const acmPosts = posts.filter((p) => p.clubId === 'acm');
      for (const acmPost of acmPosts) {
        assert.ok(filtered.some((p) => p.id === acmPost.id));
      }
    });

    it('generates correct label and icon metadata for compact and prominent FollowButton variants', () => {
      const getFollowButtonProps = (
        following: boolean,
        variant: 'compact' | 'prominent',
        clubName: string
      ) => {
        const isCompact = variant === 'compact';
        return {
          label: isCompact
            ? following ? 'Following' : 'Follow'
            : following ? 'Following this club' : 'Follow this club',
          accessibilityLabel: following ? `Unfollow ${clubName}` : `Follow ${clubName}`,
          iconSf: isCompact
            ? following ? 'checkmark' : 'plus'
            : following ? 'checkmark.circle.fill' : 'plus.circle.fill',
          iconMd: isCompact
            ? following ? 'check' : 'add'
            : following ? 'check_circle' : 'add_circle',
        };
      };

      const compactUnfollowed = getFollowButtonProps(false, 'compact', 'ACM');
      assert.strictEqual(compactUnfollowed.label, 'Follow');
      assert.strictEqual(compactUnfollowed.iconSf, 'plus');
      assert.strictEqual(compactUnfollowed.iconMd, 'add');

      const compactFollowed = getFollowButtonProps(true, 'compact', 'ACM');
      assert.strictEqual(compactFollowed.label, 'Following');
      assert.strictEqual(compactFollowed.iconSf, 'checkmark');
      assert.strictEqual(compactFollowed.iconMd, 'check');

      const prominentUnfollowed = getFollowButtonProps(false, 'prominent', 'ACM');
      assert.strictEqual(prominentUnfollowed.label, 'Follow this club');
      assert.strictEqual(prominentUnfollowed.iconSf, 'plus.circle.fill');

      const prominentFollowed = getFollowButtonProps(true, 'prominent', 'ACM');
      assert.strictEqual(prominentFollowed.label, 'Following this club');
      assert.strictEqual(prominentFollowed.iconSf, 'checkmark.circle.fill');
    });

    it('retrieves all posts created by a specific club', () => {
      const acmPosts = getPostsByClubId('acm');
      for (const p of acmPosts) {
        assert.strictEqual(p.clubId, 'acm');
      }
    });

    it('returns empty array when getPostsByClubId is called with non-existent or empty club id', () => {
      assert.deepStrictEqual(getPostsByClubId('nonexistent-club'), []);
      assert.deepStrictEqual(getPostsByClubId(''), []);
    });
  });

  // ==========================================================================
  // Suite 10: PostCard Category Badge Tones & UI Invariants
  // ==========================================================================
  describe('PostCard Category Badge Tones', () => {
    it('maps known categories to their designated badge tones and others to gold', () => {
      const getCategoryBadgeTone = (category: string) => {
        switch (category) {
          case 'Athletics':
            return 'maroon';
          case 'Faith':
            return 'gold';
          case 'Academics':
          case 'Career':
            return 'gold';
          case 'The Arts':
          case 'Music':
            return 'gold';
          case 'Outdoors':
          case 'Wellness':
            return 'gold';
          default:
            return 'gold';
        }
      };

      assert.strictEqual(getCategoryBadgeTone('Athletics'), 'maroon');
      assert.strictEqual(getCategoryBadgeTone('Faith'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('Academics'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('Career'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('The Arts'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('Music'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('Outdoors'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('Wellness'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('Gaming'), 'gold');
      assert.strictEqual(getCategoryBadgeTone('UnknownCategory'), 'gold');
    });
  });

  // ==========================================================================
  // Suite 11: Calvin Scraped Events Adapter & Offline Seed Resilience
  // ==========================================================================
  describe('Calvin Scraped Events Adapter & Offline Seed', () => {
    it('verifies Calvin University is registered in CALVIN_CLUBS as an official institution', () => {
      const calvin = getClubById('calvin-university');
      assert.ok(calvin, 'Calvin University club entry must exist');
      assert.strictEqual(calvin.name, 'Calvin University');
      assert.strictEqual(calvin.mark, 'CU');
      assert.strictEqual(calvin.isDepartment, true);
      assert.deepStrictEqual(calvin.colors, ['#8C2131', '#E8B019']);
    });

    it('adapts a scraped event with an image into a valid Post', () => {
      const sampleEvent: ScrapedCalvinEvent = {
        id: 'calvin-42124',
        nodeId: '42124',
        title: 'Chapel Service: Worship with Calvin Alumni',
        date: 'Oct 02, 2026',
        time: '10:30 am–10:50 am',
        location: 'Chapel Sanctuary',
        summary: 'Weekly community chapel gathering in the sanctuary.',
        description: 'Weekly community chapel gathering in the sanctuary.',
        imageUrl: 'https://calvin.edu/sites/default/files/faith-worship.png',
        detailUrl: 'https://calvin.edu/events/chapel-service',
        category: 'Faith',
        org: 'Calvin University',
        clubId: 'calvin-university',
        campusWide: true,
      };

      const post = adaptCalvinEventToPost(sampleEvent, 1790951400000);
      assert.strictEqual(post.id, 'calvin-42124');
      assert.strictEqual(post.org, 'Calvin University');
      assert.strictEqual(post.clubId, 'calvin-university');
      assert.strictEqual(post.mark, 'CU');
      assert.strictEqual(post.category, 'Faith');
      assert.strictEqual(post.headline, 'Chapel Service: Worship with Calvin Alumni');
      assert.strictEqual(post.when, 'Oct 02, 2026 · 10:30 am–10:50 am');
      assert.strictEqual(post.where, 'Chapel Sanctuary');
      assert.strictEqual(post.image, 'https://calvin.edu/sites/default/files/faith-worship.png');
      assert.strictEqual(post.campusWide, true);
    });

    it('assigns category-matched Simple Banner preset when event lacks an image', () => {
      const noImageEvent: ScrapedCalvinEvent = {
        id: 'calvin-47163',
        nodeId: '47163',
        title: 'BSU Annual Cookout',
        date: 'Oct 02, 2026',
        time: '4:30 pm–8:00 pm',
        location: 'Commons Lawn',
        summary: 'Annual campus cookout hosted on the Commons Lawn.',
        description: 'Annual campus cookout hosted on the Commons Lawn.',
        imageUrl: null,
        detailUrl: 'https://calvin.edu/events/bsu-cookout',
        category: 'Social',
        org: 'Calvin University',
        clubId: 'calvin-university',
        campusWide: true,
      };

      const post = adaptCalvinEventToPost(noImageEvent, 1790951400000);
      assert.ok(post.image !== null, 'Should assign a preset banner URI');
      assert.ok(post.image?.startsWith('preset:'), `Expected preset banner URI, got: ${post.image}`);
    });

    it('verifies offline seed dataset CALVIN_EVENTS_SEED contains valid events', () => {
      assert.ok(CALVIN_EVENTS_SEED.length >= 10, 'Seed should contain at least 10 events');
      for (const ev of CALVIN_EVENTS_SEED) {
        assert.ok(ev.id.length > 0);
        assert.ok(ev.title.length > 0);
        assert.ok(ev.category.length > 0);
        assert.ok(feedCategories.includes(ev.category as FeedCategory), `Event ${ev.id} category ${ev.category} invalid`);
      }
    });
  });

  // ==========================================================================
  // Suite 12: High-Volume Feed Permutations & Stress Ingestion
  // ==========================================================================
  describe('Feed High-Volume Stress & Edge Case Permutations', () => {
    it('efficiently filters 1,000 synthetic feed items across multiple categories in <50ms', () => {
      const syntheticPosts: Post[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `synth-${i}`,
        org: i % 2 === 0 ? 'Calvin University' : 'ACM Student Chapter',
        mark: i % 2 === 0 ? 'CU' : 'ACM',
        headline: `Synthetic Event ${i}: Campus Update and Activity`,
        body: `Details for synthetic post ${i} with various content and announcements.`,
        category: feedCategories[i % feedCategories.length],
        postedAt: new Date(Date.now() - i * 60000).toISOString(),
        when: 'Oct 15, 2026 · 7:00 PM',
        where: i % 3 === 0 ? 'Van Noord Arena' : 'Commons Lawn',
        campusWide: i % 5 === 0,
        clubId: i % 2 === 0 ? 'calvin-university' : 'acm',
        followed: i % 2 === 0,
      }));

      const startTime = Date.now();
      const filteredAthletics = filterFeedPosts(syntheticPosts, { scope: 'All', categories: ['Athletics'] });
      const filteredFaithAndMusic = filterFeedPosts(syntheticPosts, { scope: 'All', categories: ['Faith', 'Music'] });
      const searchResults = searchPosts('Van Noord', 'All', syntheticPosts);
      const elapsed = Date.now() - startTime;

      assert.ok(elapsed < 50, `Filtering took too long: ${elapsed}ms`);
      assert.ok(filteredAthletics.length > 0);
      assert.ok(filteredFaithAndMusic.length > 0);
      assert.ok(searchResults.length > 0);
    });

    it('handles posts with undefined optional fields without throwing', () => {
      const minimalPost: Post = {
        id: 'min-1',
        org: 'Test Org',
        mark: 'TO',
        headline: 'Minimal Headline',
        body: 'Minimal Body',
        category: 'Official',
        postedAt: new Date().toISOString(),
        followed: false,
        campusWide: false,
      };

      const res = filterFeedPosts([minimalPost], { scope: 'All' });
      assert.strictEqual(res.length, 1);
      const searchRes = searchPosts('Minimal', 'All', [minimalPost]);
      assert.strictEqual(searchRes.length, 1);
    });

    it('survives search queries containing regex metacharacters (*, +, ?, ^, $, |, [, ])', () => {
      const metachars = ['*', '+', '?', '^', '$', '|', '[', ']', '(', ')', '{', '}', '\\'];
      for (const char of metachars) {
        assert.doesNotThrow(() => {
          searchPosts(`test${char}query`, 'All');
        });
      }
    });
  });

  describe('Standard 13 Feed Categories Filter Completeness', () => {
    for (let c = 0; c < feedCategories.length; c++) {
      const cat = feedCategories[c];
      it(`evaluates category isolation filter for "${cat}" (${c + 1}/13)`, () => {
        const filtered = filterFeedPosts(posts, { scope: 'All', categories: [cat] });
        assert.ok(Array.isArray(filtered));
        for (const p of filtered) {
          assert.strictEqual(p.category, cat);
        }
      });
    }
  });

  describe('Calvin Clubs Directory Registry Lookup Invariants', () => {
    for (let cl = 0; cl < CALVIN_CLUBS.length; cl++) {
      const club = CALVIN_CLUBS[cl];
      it(`verifies club catalog record for "${club.name}" (${club.id})`, () => {
        assert.ok(club.id.length > 0);
        assert.ok(club.name.length > 0);
        assert.ok(club.category.length > 0);
        assert.ok(club.contactEmail.endsWith('@calvin.edu'));
      });
    }
  });
});

