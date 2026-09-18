import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CALVIN_CLUBS,
  getAllClubs,
  getClubById,
  getClubByName,
  searchClubs,
} from '@/data/clubs';
import {
  feedCategories,
  forYouPosts,
  getPostsByClubId,
  posts,
  searchPosts,
} from '@/data/feed';
import { DEFAULT_FOLLOWED_CLUB_IDS } from '@/context/club-follow-context';

describe('Clubs & Feed Follow Domain', () => {
  describe('Clubs Catalog & Invariants', () => {
    it('contains a rich list of Calvin clubs and campus organizations', () => {
      assert.ok(CALVIN_CLUBS.length >= 15, 'Should have at least 15 campus clubs/orgs');
      assert.strictEqual(getAllClubs().length, CALVIN_CLUBS.length);
    });

    it('ensures all club IDs are unique and URL-safe', () => {
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
      // Search by keyword
      const codingMatches = searchClubs('coding', 'All');
      assert.ok(codingMatches.some((c) => c.id === 'acm'));

      // Filter by category
      const artsClubs = searchClubs('', 'The Arts');
      assert.ok(artsClubs.length > 0);
      for (const club of artsClubs) {
        assert.strictEqual(club.category, 'The Arts');
      }

      // Filter by both
      const theatreMatches = searchClubs('theatre', 'The Arts');
      assert.ok(theatreMatches.some((c) => c.id === 'calvin-theatre'));

      // Empty query returns all for 'All'
      assert.strictEqual(searchClubs('', 'All').length, CALVIN_CLUBS.length);
    });
  });

  describe('Dynamic Following & Feed Filtering Rules', () => {
    it('always includes campus-wide announcements in Following regardless of follows', () => {
      // User follows nobody
      const followNone = (_id: string) => false;
      const followingPosts = forYouPosts(followNone);

      assert.ok(followingPosts.length > 0, 'Campus-wide announcements should still be visible');
      for (const post of followingPosts) {
        assert.strictEqual(
          post.campusWide,
          true,
          `Post ${post.id} in unfollowed feed must be campusWide`
        );
      }

      // Airband (p1) is campus-wide
      assert.ok(followingPosts.some((p) => p.id === 'p1'));
      // LOFT (p4) is campus-wide
      assert.ok(followingPosts.some((p) => p.id === 'p4'));
    });

    it('includes club posts when user follows the club, and excludes them when unfollowed', () => {
      // ACM hack night (p5) is NOT campusWide
      const acmPost = posts.find((p) => p.id === 'p5')!;
      assert.strictEqual(acmPost.campusWide, false);

      // 1. When user follows 'acm':
      const followingAcm = (id: string) => id === 'acm';
      const feedWithAcm = forYouPosts(followingAcm);
      assert.ok(
        feedWithAcm.some((p) => p.id === 'p5'),
        'ACM hack night must show when user follows ACM'
      );

      // 2. When user unfollows 'acm':
      const notFollowingAcm = (id: string) => id === 'calvin-theatre';
      const feedWithoutAcm = forYouPosts(notFollowingAcm);
      assert.strictEqual(
        feedWithoutAcm.some((p) => p.id === 'p5'),
        false,
        'ACM hack night must NOT show when user does not follow ACM'
      );
    });

    it('dynamically adapts feed when user follows multiple clubs', () => {
      const followed = new Set(['acm', 'calvin-theatre', 'jazz-collective']);
      const isFollowing = (id: string) => followed.has(id);
      const feed = forYouPosts(isFollowing);

      // Check non-campusWide posts from followed clubs
      assert.ok(feed.some((p) => p.clubId === 'acm'));
      assert.ok(feed.some((p) => p.clubId === 'calvin-theatre'));
      assert.ok(feed.some((p) => p.clubId === 'jazz-collective'));

      // Check non-campusWide posts from unfollowed clubs are excluded
      const orchestraPost = posts.find((p) => p.id === 'p7')!; // Calvin Orchestra (not campus-wide)
      assert.strictEqual(orchestraPost.campusWide, false);
      assert.strictEqual(feed.some((p) => p.id === 'p7'), false);

      // Now follow orchestra
      followed.add('calvin-orchestra');
      const updatedFeed = forYouPosts(isFollowing);
      assert.ok(
        updatedFeed.some((p) => p.id === 'p7'),
        'Orchestra post must appear after following calvin-orchestra'
      );
    });

    it('retrieves all posts created by a specific club', () => {
      const ctPosts = getPostsByClubId('calvin-theatre');
      assert.ok(ctPosts.length >= 1);
      for (const p of ctPosts) {
        assert.ok(
          p.clubId === 'calvin-theatre' || p.org === 'Calvin Theatre Company'
        );
      }

      const acmPosts = getPostsByClubId('acm');
      assert.ok(acmPosts.length >= 1);
      assert.strictEqual(acmPosts[0].headline, 'Hack night: build something dumb');
    });

    it('defines sensible default followed clubs for initial onboarding', () => {
      assert.ok(DEFAULT_FOLLOWED_CLUB_IDS.length > 0);
      assert.ok(DEFAULT_FOLLOWED_CLUB_IDS.includes('acm'));
      assert.ok(DEFAULT_FOLLOWED_CLUB_IDS.includes('calvin-theatre'));
      assert.ok(DEFAULT_FOLLOWED_CLUB_IDS.includes('outdoor-rec'));
    });
  });

  describe('Header Navigation & Back Button Invariants', () => {
    it('ensures "index" is not treated as a valid club id', () => {
      // getClubById('index') must return undefined so that dynamic route /clubs/[id]
      // handles id="index" as directory instead of "club not found"
      assert.strictEqual(getClubById('index'), undefined);
      assert.strictEqual(getClubById('all'), undefined);
    });

    it('ensures all club IDs in catalog differ from Expo Router reserved names', () => {
      const reservedSegments = new Set(['index', '_layout', '+not-found', 'all']);
      for (const club of CALVIN_CLUBS) {
        assert.strictEqual(
          reservedSegments.has(club.id),
          false,
          `Club id "${club.id}" cannot be a reserved route segment`
        );
      }
    });
  });

  describe('Clubs Sub-Page Hierarchy & Gesture Invariants', () => {
    it('manages hierarchical navigation levels correctly', () => {
      let level: 0 | 1 | 2 = 0;
      let activeClubId: string | null = null;

      // 0: Knightly Home
      assert.strictEqual(level, 0);
      assert.strictEqual(activeClubId, null);

      // Open clubs directory -> Level 1
      level = 1;
      assert.strictEqual(level, 1);

      // Open club detail -> Level 2
      level = 2;
      activeClubId = 'acm';
      assert.strictEqual(level, 2);
      assert.strictEqual(activeClubId, 'acm');

      // Back from detail -> Level 1
      level = 1;
      assert.strictEqual(level, 1);

      // Back from directory -> Level 0
      level = 0;
      activeClubId = null;
      assert.strictEqual(level, 0);
      assert.strictEqual(activeClubId, null);
    });

    it('calculates gesture swipe-back target indices with velocity and position thresholds', () => {
      const getTargetIndex = (
        currentLevel: 1 | 2,
        rawIndex: number,
        vx: number
      ): number => {
        if (currentLevel === 2) {
          // On Club Detail (index 2): swipe right goes to Campus Clubs (index 1)
          if (vx > 400 || rawIndex < 1.6) {
            return 1;
          }
          return 2;
        } else {
          // On Campus Clubs (index 1): swipe right goes to Knightly Home (index 0)
          if (vx > 400 || rawIndex < 0.6) {
            return 0;
          }
          return 1;
        }
      };

      // Level 2 (Club Detail -> Campus Clubs):
      // Flick right with high velocity
      assert.strictEqual(getTargetIndex(2, 1.9, 500), 1);
      // Drag past 40% of the screen (rawIndex < 1.6)
      assert.strictEqual(getTargetIndex(2, 1.5, 50), 1);
      // Insufficient drag without velocity stays on detail
      assert.strictEqual(getTargetIndex(2, 1.8, 100), 2);

      // Level 1 (Campus Clubs -> Knightly Home):
      // Flick right with high velocity
      assert.strictEqual(getTargetIndex(1, 0.9, 450), 0);
      // Drag past 40% of the screen (rawIndex < 0.6)
      assert.strictEqual(getTargetIndex(1, 0.5, 80), 0);
      // Insufficient drag without velocity stays on directory
      assert.strictEqual(getTargetIndex(1, 0.8, 120), 1);
    });

    it('determines correct header title, subtitle, and back button for each level', () => {
      const getHeaderState = (
        pathname: string,
        clubsLevel: 0 | 1 | 2,
        activeClubId: string | null
      ) => {
        if (pathname === '/' && clubsLevel === 2) {
          const club = activeClubId ? getClubById(activeClubId) : undefined;
          return {
            title: club ? club.name : 'Club',
            subtitle: club ? club.category : 'Details',
            hasBackButton: true,
            backTarget: 'Campus Clubs',
          };
        }
        if (pathname === '/' && clubsLevel === 1) {
          return {
            title: 'Campus Clubs',
            subtitle: 'Student orgs & communities',
            hasBackButton: true,
            backTarget: 'Knightly Home',
          };
        }
        return {
          title: 'Knightly',
          subtitle: 'Campus community & feed',
          hasBackButton: false,
          backTarget: null,
        };
      };

      // Level 2 with ACM
      const detailHeader = getHeaderState('/', 2, 'acm');
      assert.strictEqual(detailHeader.title, 'ACM Student Chapter');
      assert.strictEqual(detailHeader.subtitle, 'Academics');
      assert.strictEqual(detailHeader.hasBackButton, true);
      assert.strictEqual(detailHeader.backTarget, 'Campus Clubs');

      // Level 1: Campus Clubs directory
      const directoryHeader = getHeaderState('/', 1, null);
      assert.strictEqual(directoryHeader.title, 'Campus Clubs');
      assert.strictEqual(directoryHeader.subtitle, 'Student orgs & communities');
      assert.strictEqual(directoryHeader.hasBackButton, true);
      assert.strictEqual(directoryHeader.backTarget, 'Knightly Home');

      // Level 0: Knightly Home
      const homeHeader = getHeaderState('/', 0, null);
      assert.strictEqual(homeHeader.title, 'Knightly');
      assert.strictEqual(homeHeader.hasBackButton, false);
    });

    it('enforces pager slot isolation invariants between tabs and sub-pages', () => {
      const isShowingClubsDirectory = (
        slotIndex: number,
        showClubs: boolean,
        pathname: string,
        activeIndex: number
      ) => slotIndex === 1 && showClubs && pathname === '/' && activeIndex === 0;

      const isShowingClubDetail = (
        slotIndex: number,
        showDetail: boolean,
        pathname: string,
        activeIndex: number,
        activeClubId: string | null
      ) => slotIndex === 2 && showDetail && pathname === '/' && activeIndex === 0 && !!activeClubId;

      // On Knightly tab with directory open:
      assert.strictEqual(isShowingClubsDirectory(1, true, '/', 0), true);
      assert.strictEqual(isShowingClubsDirectory(1, false, '/', 0), false);
      // Not on Dining tab:
      assert.strictEqual(isShowingClubsDirectory(1, true, '/dining', 1), false);

      // On Knightly tab with detail open:
      assert.strictEqual(isShowingClubDetail(2, true, '/', 0, 'acm'), true);
      assert.strictEqual(isShowingClubDetail(2, false, '/', 0, 'acm'), false);
      assert.strictEqual(isShowingClubDetail(2, true, '/', 0, null), false);
      // Not on Safety or Dining:
      assert.strictEqual(isShowingClubDetail(2, true, '/safety', 2, 'acm'), false);
      assert.strictEqual(isShowingClubDetail(2, true, '/dining', 1, 'acm'), false);
    });
  });

  describe('Club Data Invariants & Schema Integrity', () => {
    it('verifies all club categories match registered feed categories', () => {
      const allowedCategories = new Set(feedCategories);
      for (const club of CALVIN_CLUBS) {
        assert.ok(
          allowedCategories.has(club.category),
          `Club "${club.name}" category "${club.category}" is not in official feed categories`
        );
      }
    });

    it('verifies all club gradient colors are valid 7-character hex color codes', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      for (const club of CALVIN_CLUBS) {
        assert.strictEqual(club.colors.length, 2, `${club.name} must have 2 gradient colors`);
        assert.match(club.colors[0], hexPattern, `${club.name} primary color ${club.colors[0]} is not hex`);
        assert.match(club.colors[1], hexPattern, `${club.name} secondary color ${club.colors[1]} is not hex`);
      }
    });

    it('verifies every post associated with a club links to a valid club in the catalog', () => {
      for (const post of posts) {
        if (post.clubId) {
          const club = getClubById(post.clubId);
          assert.ok(
            club !== undefined,
            `Post "${post.headline}" links to unknown clubId "${post.clubId}"`
          );
        }
      }
    });

    it('handles search queries with extra whitespace, mixed casing, and special tokens', () => {
      const resultsWithSpaces = searchClubs('   theatre   ', 'All');
      assert.ok(resultsWithSpaces.some((c) => c.id === 'calvin-theatre'));

      const resultsCaps = searchClubs('OUTDOOR', 'All');
      assert.ok(resultsCaps.some((c) => c.id === 'outdoor-rec'));

      const nonExistent = searchClubs('zzzznonexistentorg999', 'All');
      assert.strictEqual(nonExistent.length, 0);
    });

    it('returns empty array when getPostsByClubId is called with non-existent or empty club id', () => {
      assert.deepStrictEqual(getPostsByClubId(''), []);
      assert.deepStrictEqual(getPostsByClubId('non-existent-club-id'), []);
    });
  });

  describe('Follow State Machine Simulator', () => {
    function createFollowManager(initial: string[] = DEFAULT_FOLLOWED_CLUB_IDS) {
      const followed = new Set(initial);
      return {
        isFollowing: (id: string) => followed.has(id),
        toggleFollow: (id: string) => {
          if (followed.has(id)) {
            followed.delete(id);
          } else {
            followed.add(id);
          }
        },
        get followedCount() {
          return followed.size;
        },
        get followedList() {
          return Array.from(followed);
        },
      };
    }

    it('initializes with default followed clubs and allows toggling off and on', () => {
      const manager = createFollowManager();
      const initialCount = manager.followedCount;
      assert.ok(initialCount > 0);
      assert.strictEqual(manager.isFollowing('acm'), true);

      // Unfollow ACM
      manager.toggleFollow('acm');
      assert.strictEqual(manager.isFollowing('acm'), false);
      assert.strictEqual(manager.followedCount, initialCount - 1);

      // Re-follow ACM
      manager.toggleFollow('acm');
      assert.strictEqual(manager.isFollowing('acm'), true);
      assert.strictEqual(manager.followedCount, initialCount);
    });

    it('adds new club when toggled for an unfollowed club', () => {
      const manager = createFollowManager(['acm']);
      assert.strictEqual(manager.isFollowing('robotics-club'), false);

      manager.toggleFollow('robotics-club');
      assert.strictEqual(manager.isFollowing('robotics-club'), true);
      assert.strictEqual(manager.followedCount, 2);
    });

    it('supports unfollowing all clubs to empty state', () => {
      const manager = createFollowManager(['acm', 'calvin-theatre']);
      assert.strictEqual(manager.followedCount, 2);

      manager.toggleFollow('acm');
      manager.toggleFollow('calvin-theatre');
      assert.strictEqual(manager.followedCount, 0);
      assert.deepStrictEqual(manager.followedList, []);
    });
  });
});
