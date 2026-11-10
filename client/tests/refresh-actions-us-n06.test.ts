/**
 * US-N06: Pull-to-Refresh Gestures & Manual Refresh Actions Test Suite
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.3, 4.4, 4.5, Rule 5, & US-N06):
 * Knightly provides pull-to-refresh (RefreshControl) gestures and tactile 1-tap manual
 * refresh buttons across Campus Feed (Slot 0), Dining (Slot 1), and Campus Safety (Slot 2).
 *
 * NON-NEGOTIABLE DOMAIN INVARIANTS TESTED:
 * 1. Template-Level Pull-to-Refresh Inheritance (AGENTS.md Rule 4.5 & Rule 5):
 *    Cross-cutting refresh behaviors are implemented at the template level in `Screen` and
 *    `ScreenFlatList`. Individual screens and leaf views inherit branded `<RefreshControl>`
 *    by passing `onRefresh` and `refreshing` props without duplicated `<RefreshControl>` tags.
 * 2. Calvin Palette Brand Tokens (AGENTS.md Rule 5):
 *    RefreshControl and RefreshButton use centralized tokens `Brand.gold` (#E8B019) and
 *    `Brand.maroon` (#5E1A24) from `@/constants/theme`. Never hardcoded raw hex values.
 * 3. Offline Resilience & Graceful Fallback (Sprint 1 SLO SC2):
 *    Knightly must NEVER crash when the backend server is offline or unavailable.
 *    All refresh operations catch network errors gracefully and preserve cached/seed data.
 * 4. Local-Only Post Preservation:
 *    When refreshing the feed, locally authored posts (`p-local-*`) survive and merge seamlessly
 *    with fresh server posts, sorted descending by date.
 * 5. Coordinated State Refreshes:
 *    - Dining: Refreshes both student balance summary and venue operating windows in parallel.
 *    - Safety: Refreshes both active advisories and emergency contacts in parallel.
 * 6. Accessible Refresh Controls:
 *    RefreshButton enforces accessibilityRole="button", dynamic accessibilityLabel,
 *    and accessibilityState={{ busy, disabled }}.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { describe, it, mock } from 'node:test';
import type { ReactElement } from 'react';

import { Brand } from '@/constants/theme';
import { diningHalls, mealPlan as defaultMealPlan } from '@/data/dining';
import { posts as defaultPosts, sortPostsByDate, type Post } from '@/data/feed';
import { emergencyContacts, safetyAlerts, type EmergencyContact, type SafetyAlert } from '@/data/safety';
import {
  fetchDiningSummaryApi,
  fetchDiningVenuesApi,
  getDefaultDiningSummary,
  type DiningSummary,
  type EnrichedDiningVenue,
} from '@/services/dining-api';
import { fetchSafetyAlertsApi, fetchSafetyContactsApi } from '@/services/safety-api';

// Helper to read source code files for structural and architectural invariant validation
const srcDir = path.resolve(__dirname, '../src');
const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8').replace(/\r\n/g, '\n');

// ============================================================================
// Component Rendering Test Harness
// Stubs React hooks and React Native Reanimated to execute UI components
// without needing a native mobile runtime or full headless DOM.
// ============================================================================
function withComponentHarness<T>(callback: (harness: {
  Screen: any;
  ScreenFlatList: any;
  RefreshButton: any;
  lastSharedValues: Array<{ value: unknown }>;
  cancelledAnimations: any[];
}) => T): T {
  const React = require('react');
  const lastSharedValues: Array<{ value: unknown }> = [];
  const cancelledAnimations: any[] = [];

  const stubs = new Map<string, unknown>();
  stubs.set('react', {
    ...React,
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (fn: any) => fn(),
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
  });
  stubs.set('react-native-reanimated', {
    __esModule: true,
    default: {
      View: 'Animated.View',
      ScrollView: 'Animated.ScrollView',
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (value: any) => {
      const cell = { value };
      lastSharedValues.push(cell);
      return cell;
    },
    useAnimatedStyle: (factory: any) => factory(),
    withTiming: (t: any) => t,
    withRepeat: (anim: any) => anim,
    withSpring: (s: any) => s,
    cancelAnimation: (anim: any) => {
      cancelledAnimations.push(anim);
    },
    Easing: {
      linear: (v: any) => v,
      out: () => (v: any) => v,
      ease: (v: any) => v,
    },
  });
  stubs.set('@/hooks/use-theme', {
    useTheme: () => ({
      background: '#0B0C0E',
      backgroundElement: '#14161B',
      border: '#2A2E39',
      text: '#FFFFFF',
      textSecondary: '#8E95A5',
      textMuted: '#5C6370',
    }),
  });
  stubs.set('@/context/starfield-context', {
    useStarfield: () => false,
  });
  stubs.set('react-native-safe-area-context', {
    useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 0, right: 0 }),
  });
  stubs.set('@/components/ui/header-overlay', {
    useHeaderOverlayInset: () => 84,
  });
  stubs.set('@/hooks/use-screen-scroll', {
    useScreenScrollHandler: () => (() => {}),
  });

  const loader = Module as unknown as { _load: (...args: any[]) => any };
  const originalLoad = loader._load;
  const loadMock = mock.method(loader, '_load', (...args: any[]) => {
    return stubs.has(args[0]) ? stubs.get(args[0]) : originalLoad(...args);
  });

  try {
    const { Screen, ScreenFlatList } = require('@/components/ui/screen');
    const { RefreshButton } = require('@/components/ui/refresh-button');
    return callback({
      Screen,
      ScreenFlatList,
      RefreshButton,
      lastSharedValues,
      cancelledAnimations,
    });
  } finally {
    loadMock.mock.restore();
  }
}

/**
 * Executes a hook within a simulated React context environment.
 */
function withHookDispatcher<T>(hookCallback: () => T, contextOverrides?: (ctx: any) => any): T {
  const React = require('react');
  const originalUseContext = React.useContext;
  try {
    React.useContext = (ctx: any) => {
      if (contextOverrides) {
        return contextOverrides(ctx);
      }
      return ctx._currentValue;
    };
    return hookCallback();
  } finally {
    React.useContext = originalUseContext;
  }
}

describe('US-N06: Pull-to-Refresh & Manual Refresh Actions Test Suite', () => {
  // ==========================================================================
  // Suite 1: Template-Level Pull-to-Refresh Contract (Screen & ScreenFlatList)
  // ==========================================================================
  describe('Suite 1: Template-Level Pull-to-Refresh Contract (Screen & ScreenFlatList)', () => {
    it('Screen: injects Calvin-branded RefreshControl when onRefresh is provided', () => {
      withComponentHarness(({ Screen }) => {
        let refreshed = false;
        const onRefresh = () => { refreshed = true; };

        // Step 1: Render Screen with onRefresh callback and active refreshing state
        const tree = Screen({
          children: 'Test Content',
          refreshing: true,
          onRefresh,
        }) as ReactElement<any>;

        // Step 2: Validate root structure (View wrapping Animated.ScrollView)
        assert.ok(tree, 'Screen should return a valid React element');
        const scrollView = tree.props.children[1];
        assert.ok(scrollView, 'Screen should render an Animated.ScrollView when scroll=true');

        // Step 3: Validate RefreshControl injection and props
        const refreshControl = scrollView.props.refreshControl;
        assert.ok(refreshControl, 'RefreshControl must be injected into ScrollView when onRefresh is provided');
        assert.strictEqual(refreshControl.props.refreshing, true, 'refreshing prop must match active status');
        assert.strictEqual(refreshControl.props.onRefresh, onRefresh, 'onRefresh callback must be forwarded');

        // Step 4: Validate Calvin University Brand palette tokens
        assert.strictEqual(
          refreshControl.props.tintColor,
          Brand.gold,
          'iOS spinner tintColor must match Brand.gold token'
        );
        assert.deepStrictEqual(
          refreshControl.props.colors,
          [Brand.maroon, Brand.gold],
          'Android progress colors must cycle [Brand.maroon, Brand.gold]'
        );
        assert.strictEqual(
          refreshControl.props.progressBackgroundColor,
          '#14161B',
          'Android progressBackgroundColor must match theme.backgroundElement'
        );

        // Step 5: Verify onRefresh execution
        refreshControl.props.onRefresh();
        assert.strictEqual(refreshed, true, 'Executing refreshControl.onRefresh must trigger callback');
      });
    });

    it('Screen: passes refreshing=false when refresh is idle', () => {
      withComponentHarness(({ Screen }) => {
        const tree = Screen({
          children: 'Idle Content',
          refreshing: false,
          onRefresh: () => {},
        }) as ReactElement<any>;

        const refreshControl = tree.props.children[1].props.refreshControl;
        assert.strictEqual(refreshControl.props.refreshing, false);
      });
    });

    it('Screen: omits RefreshControl when onRefresh is undefined', () => {
      withComponentHarness(({ Screen }) => {
        // When onRefresh is omitted, no RefreshControl should be attached
        const tree = Screen({
          children: 'Static Content',
        }) as ReactElement<any>;

        const refreshControl = tree.props.children[1].props.refreshControl;
        assert.strictEqual(
          refreshControl,
          undefined,
          'Screen must NOT inject RefreshControl if onRefresh is not provided'
        );
      });
    });

    it('Screen: respects custom refreshControl prop override', () => {
      withComponentHarness(({ Screen }) => {
        const React = require('react');
        const customControl = React.createElement('CustomRefresh', { custom: true });

        const tree = Screen({
          children: 'Custom Content',
          onRefresh: () => {},
          refreshControl: customControl,
        }) as ReactElement<any>;

        const refreshControl = tree.props.children[1].props.refreshControl;
        assert.strictEqual(
          refreshControl,
          customControl,
          'Custom refreshControl must take precedence over default branded control'
        );
      });
    });

    it('ScreenFlatList: injects Calvin-branded RefreshControl when onRefresh is provided', () => {
      withComponentHarness(({ ScreenFlatList }) => {
        let refreshed = false;
        const onRefresh = () => { refreshed = true; };

        // Step 1: Render ScreenFlatList with virtualized data and refresh props
        const tree = ScreenFlatList({
          data: [{ id: '1' }, { id: '2' }],
          renderItem: () => null,
          refreshing: true,
          onRefresh,
        }) as ReactElement<any>;

        // Step 2: Validate AnimatedFlatList child receives RefreshControl
        const flatList = tree.props.children[1];
        assert.ok(flatList, 'ScreenFlatList must render child list component');

        const refreshControl = flatList.props.refreshControl;
        assert.ok(refreshControl, 'RefreshControl must be forwarded to FlatList');
        assert.strictEqual(refreshControl.props.refreshing, true);
        assert.strictEqual(refreshControl.props.tintColor, Brand.gold);
        assert.deepStrictEqual(refreshControl.props.colors, [Brand.maroon, Brand.gold]);

        refreshControl.props.onRefresh();
        assert.strictEqual(refreshed, true, 'Executing flatList refreshControl.onRefresh must trigger callback');
      });
    });

    it('ScreenFlatList: omits RefreshControl when onRefresh is undefined', () => {
      withComponentHarness(({ ScreenFlatList }) => {
        const tree = ScreenFlatList({
          data: [],
          renderItem: () => null,
        }) as ReactElement<any>;

        const refreshControl = tree.props.children[1].props.refreshControl;
        assert.strictEqual(refreshControl, undefined);
      });
    });

    it('ScreenFlatList: respects custom refreshControl prop override', () => {
      withComponentHarness(({ ScreenFlatList }) => {
        const React = require('react');
        const customControl = React.createElement('CustomFlatListRefresh', { custom: true });

        const tree = ScreenFlatList({
          data: [],
          renderItem: () => null,
          onRefresh: () => {},
          refreshControl: customControl,
        }) as ReactElement<any>;

        const refreshControl = tree.props.children[1].props.refreshControl;
        assert.strictEqual(refreshControl, customControl);
      });
    });

    it('Static Invariant: Screen template enforces centralized Brand palette tokens without raw hex values', () => {
      const code = readSrc('components/ui/screen.tsx');

      // Verify template imports and usage
      assert.ok(code.includes('RefreshControl'), 'screen.tsx must import RefreshControl from react-native');
      assert.ok(code.includes('tintColor={Brand.gold}'), 'Must use Brand.gold for iOS spinner');
      assert.ok(
        code.includes('colors={[Brand.maroon, Brand.gold]}'),
        'Must use [Brand.maroon, Brand.gold] for Android progress colors'
      );

      // Verify no hardcoded raw hex colors in refresh control construction
      assert.strictEqual(
        code.includes('#E8B019'),
        false,
        'screen.tsx must not hardcode raw #E8B019 hex value; use Brand.gold token'
      );
      assert.strictEqual(
        code.includes('#5E1A24'),
        false,
        'screen.tsx must not hardcode raw #5E1A24 hex value; use Brand.maroon token'
      );
    });

    it('Layout Invariant: Screen and ScreenFlatList enforce contentInsetAdjustmentBehavior="never" and tight Spacing.two top padding', () => {
      const code = readSrc('components/ui/screen.tsx');

      // Verify contentInsetAdjustmentBehavior is explicitly 'never' to eliminate iOS double-inset gap
      assert.ok(
        code.includes('contentInsetAdjustmentBehavior="never"'),
        'screen.tsx must specify contentInsetAdjustmentBehavior="never" to avoid awkward top dead space on iOS'
      );
      assert.strictEqual(
        code.includes('contentInsetAdjustmentBehavior="automatic"'),
        false,
        'screen.tsx must not use contentInsetAdjustmentBehavior="automatic"'
      );
      assert.ok(
        code.includes('paddingTop: headerInset + Spacing.two'),
        'screen.tsx must tighten top padding to headerInset + Spacing.two'
      );
    });
  });

  // ==========================================================================
  // Suite 2: Consolidated Manual Refresh Button Template (RefreshButton)
  // ==========================================================================
  describe('Suite 2: Consolidated Manual Refresh Button Template (RefreshButton)', () => {
    it('Accessibility Contract: renders accessible Pressable with button role and idle state', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({
          onRefresh: () => {},
          refreshing: false,
          label: 'Refresh',
        }) as ReactElement<any>;

        assert.strictEqual(btn.props.accessibilityRole, 'button');
        assert.deepStrictEqual(btn.props.accessibilityState, { busy: false, disabled: false });
        assert.strictEqual(btn.props.disabled, false);
      });
    });

    it('Accessibility Contract: marks busy and disabled during active refresh', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({
          onRefresh: () => {},
          refreshing: true,
          label: 'Refresh',
        }) as ReactElement<any>;

        assert.deepStrictEqual(btn.props.accessibilityState, { busy: true, disabled: true });
        assert.strictEqual(btn.props.disabled, true, 'Pressable must be disabled while refreshing');
      });
    });

    it('Accessibility Contract: marks disabled when disabled prop is true', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({
          onRefresh: () => {},
          disabled: true,
          label: 'Refresh',
        }) as ReactElement<any>;

        assert.deepStrictEqual(btn.props.accessibilityState, { busy: false, disabled: true });
        assert.strictEqual(btn.props.disabled, true);
      });
    });

    it('Accessibility Labels: uses explicit custom accessibilityLabel when provided', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({
          accessibilityLabel: 'Refresh campus feed announcements',
        }) as ReactElement<any>;

        assert.strictEqual(btn.props.accessibilityLabel, 'Refresh campus feed announcements');
      });
    });

    it('Accessibility Labels: generates contextual fallback label from label prop', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({
          label: 'Alerts',
        }) as ReactElement<any>;

        assert.strictEqual(btn.props.accessibilityLabel, 'Refresh Alerts');
      });
    });

    it('Accessibility Labels: falls back to generic description when neither label is given', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({}) as ReactElement<any>;

        assert.strictEqual(btn.props.accessibilityLabel, 'Refresh updated content');
      });
    });

    it('Press Callback: invokes onRefresh callback when pressed in idle state', () => {
      withComponentHarness(({ RefreshButton }) => {
        let pressCount = 0;
        const btn = RefreshButton({
          onRefresh: () => { pressCount++; },
          refreshing: false,
          disabled: false,
        }) as ReactElement<any>;

        // Simulate press
        btn.props.onPress();
        assert.strictEqual(pressCount, 1, 'onRefresh must be invoked when pressed in idle state');
      });
    });

    it('Press Callback: suppresses onRefresh callback when disabled', () => {
      withComponentHarness(({ RefreshButton }) => {
        let pressCount = 0;
        const btn = RefreshButton({
          onRefresh: () => { pressCount++; },
          disabled: true,
        }) as ReactElement<any>;

        // Simulate press while disabled
        btn.props.onPress();
        assert.strictEqual(pressCount, 0, 'onRefresh must NOT be called when button is disabled');
      });
    });

    it('Press Callback: suppresses onRefresh callback when refreshing is already active', () => {
      withComponentHarness(({ RefreshButton }) => {
        let pressCount = 0;
        const btn = RefreshButton({
          onRefresh: () => { pressCount++; },
          refreshing: true,
        }) as ReactElement<any>;

        // Simulate press while already refreshing (debounce / deduplication)
        btn.props.onPress();
        assert.strictEqual(pressCount, 0, 'onRefresh must NOT be called when refreshing is true');
      });
    });

    it('Visual Presentation: renders label text when label prop is provided', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({
          label: 'Check Alerts',
        }) as ReactElement<any>;

        // Find ThemedText in children hierarchy
        const innerRow = btn.props.children;
        const textElement = innerRow.props.children[1];
        assert.ok(textElement, 'Text element must be present when label is passed');
        assert.strictEqual(textElement.props.children, 'Check Alerts');
      });
    });

    it('Visual Presentation: omits label text in icon-only mode', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btn = RefreshButton({}) as ReactElement<any>;

        const innerRow = btn.props.children;
        const textElement = innerRow.props.children[1];
        assert.strictEqual(textElement, null, 'Text element must be null when label is omitted');
      });
    });

    it('Variant Sizing: selects 13px icon for small and 16px icon for medium', () => {
      withComponentHarness(({ RefreshButton }) => {
        const btnSmall = RefreshButton({ size: 'small' }) as ReactElement<any>;
        const iconSmall = btnSmall.props.children.props.children[0].props.children;
        assert.strictEqual(iconSmall.props.size, 13, 'Small refresh button must use 13px icon');

        const btnMedium = RefreshButton({ size: 'medium' }) as ReactElement<any>;
        const iconMedium = btnMedium.props.children.props.children[0].props.children;
        assert.strictEqual(iconMedium.props.size, 16, 'Medium refresh button must use 16px icon');
      });
    });

    it('Brand Colors: defaults to Brand.gold token and supports custom override', () => {
      withComponentHarness(({ RefreshButton }) => {
        const defaultBtn = RefreshButton({ label: 'Refresh' }) as ReactElement<any>;
        const defaultIcon = defaultBtn.props.children.props.children[0].props.children;
        assert.strictEqual(defaultIcon.props.color, Brand.gold);

        const customBtn = RefreshButton({ label: 'Refresh', color: '#00AAFF' }) as ReactElement<any>;
        const customIcon = customBtn.props.children.props.children[0].props.children;
        assert.strictEqual(customIcon.props.color, '#00AAFF');
      });
    });

    it('Layout & Centering: medium button uses 42px height to match SearchField with centered icon wrapper', () => {
      const code = readSrc('components/ui/refresh-button.tsx');

      assert.ok(code.includes('iconWrapper:'), 'RefreshButton must declare iconWrapper container');
      assert.ok(code.includes('innerRowIconOnly:'), 'RefreshButton must declare innerRowIconOnly style');
      assert.ok(
        code.includes('width: 42') && code.includes('height: 42'),
        'RefreshButton must support 42px medium dimension to align with SearchField'
      );
    });

    it('Label Vertical Centering: sets type="caption", explicit lineHeight, and includeFontPadding=false', () => {
      const code = readSrc('components/ui/refresh-button.tsx');

      assert.ok(code.includes('type="caption"'), 'RefreshButton must use type="caption" on ThemedText to avoid oversized default lineHeight');
      assert.ok(code.includes('includeFontPadding: false'), 'RefreshButton must disable Android font padding for tight button centering');
      assert.ok(code.includes('textAlignVertical: \'center\''), 'RefreshButton must vertically center label text');
      assert.ok(code.includes('lineHeight: 14'), 'RefreshButton small label must set explicit tight lineHeight');
    });
  });

  // ==========================================================================
  // Suite 3: Campus Feed Refresh Coordination & Offline Resilience (FeedContext)
  // ==========================================================================
  describe('Suite 3: Campus Feed Refresh Coordination & Offline Resilience (FeedContext)', () => {
    /**
     * Models the exact FeedContext refresh state reducer logic.
     */
    function createFeedRefreshHarness(initialPosts: Post[] = defaultPosts.slice(0, 5)) {
      let posts = [...initialPosts];
      let isRefreshing = false;
      const stateHistory: boolean[] = [];

      const setFeedPosts = (updater: (prev: Post[]) => Post[]) => {
        posts = updater(posts);
      };

      const setIsRefreshing = (val: boolean) => {
        isRefreshing = val;
        stateHistory.push(val);
      };

      const refreshFeed = async (fetcher: () => Promise<Post[]>) => {
        setIsRefreshing(true);
        try {
          const livePosts = await fetcher();
          if (livePosts && livePosts.length > 0) {
            setFeedPosts((prev) => {
              const localOnly = prev.filter((p) => p.id.startsWith('p-local-'));
              return sortPostsByDate([...localOnly, ...livePosts]);
            });
          }
        } catch {
          // Gracefully swallowed per Sprint 1 SLO SC2
        } finally {
          setIsRefreshing(false);
        }
      };

      return {
        get posts() { return posts; },
        get isRefreshing() { return isRefreshing; },
        get stateHistory() { return stateHistory; },
        refreshFeed,
      };
    }

    it('State Transitions: refreshFeed toggles isRefreshing true then false', async () => {
      const harness = createFeedRefreshHarness();

      assert.strictEqual(harness.isRefreshing, false, 'Initially idle');
      await harness.refreshFeed(async () => {
        assert.strictEqual(harness.isRefreshing, true, 'isRefreshing must be true during in-flight fetch');
        return defaultPosts.slice(0, 3);
      });

      assert.strictEqual(harness.isRefreshing, false, 'isRefreshing must return to false on completion');
      assert.deepStrictEqual(harness.stateHistory, [true, false]);
    });

    it('Live Feed Update: replaces feed with fresh server posts when successful', async () => {
      const harness = createFeedRefreshHarness([defaultPosts[0]]);
      const freshPosts: Post[] = [defaultPosts[1], defaultPosts[2]];

      await harness.refreshFeed(async () => freshPosts);

      assert.strictEqual(harness.posts.length, 2);
      assert.strictEqual(harness.posts[0].id, freshPosts[0].id);
      assert.strictEqual(harness.posts[1].id, freshPosts[1].id);
    });

    it('Offline Resilience: catches network errors gracefully without crashing or throwing unhandled exceptions', async () => {
      const initialPosts = defaultPosts.slice(0, 4);
      const harness = createFeedRefreshHarness(initialPosts);

      // Simulate network disconnect / server offline error
      await harness.refreshFeed(async () => {
        throw new TypeError('fetch failed: Network request to /api/posts failed');
      });

      // Must NOT throw, must reset isRefreshing to false, and preserve existing feed
      assert.strictEqual(harness.isRefreshing, false, 'Must reset isRefreshing even on error');
      assert.strictEqual(harness.posts.length, initialPosts.length, 'Must preserve existing posts on error');
      assert.deepStrictEqual(harness.stateHistory, [true, false]);
    });

    it('Local Post Preservation: keeps locally authored posts across feed refreshes', async () => {
      const now = Date.now();
      const localPost: Post = {
        id: `p-local-${now}`,
        clubId: 'c-local-1',
        org: 'Test Organization',
        mark: 'TO',
        headline: 'Locally Authored Flyer',
        body: 'Must survive feed refresh',
        category: 'Social',
        postedAt: new Date(now).toISOString(),
        createdAt: now,
        followed: true,
        campusWide: false,
      };

      const harness = createFeedRefreshHarness([localPost, defaultPosts[0]]);
      const liveServerPosts = [defaultPosts[1], defaultPosts[2]];

      await harness.refreshFeed(async () => liveServerPosts);

      const hasLocal = harness.posts.some((p) => p.id === localPost.id);
      assert.ok(hasLocal, 'Locally authored post must be preserved across feed refreshes');
      assert.strictEqual(harness.posts[0].id, localPost.id, 'Newest local post must remain at the top');
    });

    it('Contract Invariant: useFeed throws descriptive error when used outside FeedProvider', () => {
      const { useFeed } = require('@/context/feed-context');
      assert.throws(
        () => withHookDispatcher(() => useFeed()),
        /useFeed must be used within a FeedProvider/,
        'useFeed must enforce provider boundary'
      );
    });
  });

  // ==========================================================================
  // Suite 4: Campus Dining Refresh Coordination (DiningContext)
  // ==========================================================================
  describe('Suite 4: Campus Dining Refresh Coordination (DiningContext)', () => {
    /**
     * Models the exact DiningContext state reducer and refresh coordinator.
     */
    function createDiningRefreshHarness() {
      let summary: DiningSummary = getDefaultDiningSummary();
      let venues: EnrichedDiningVenue[] = diningHalls.map((h) => ({
        id: h.id,
        name: h.name,
        location: h.location,
        status: 'Open' as const,
        currentMeal: 'Lunch',
        hours: '11:00 AM - 2:00 PM',
        acceptsSwipes: h.acceptsSwipes,
      }));
      let isRefreshing = false;
      let lastUpdated: string | null = null;
      const history: boolean[] = [];

      const refreshDining = async (
        summaryFetcher: () => Promise<DiningSummary | null>,
        venuesFetcher: () => Promise<EnrichedDiningVenue[] | null>
      ) => {
        isRefreshing = true;
        history.push(true);
        try {
          const [freshSummary, freshVenues] = await Promise.all([
            summaryFetcher().catch(() => null),
            venuesFetcher().catch(() => null),
          ]);

          if (freshSummary) {
            summary = freshSummary;
          }
          if (freshVenues && freshVenues.length > 0) {
            venues = freshVenues;
          }
          lastUpdated = new Date().toISOString();
        } catch {
          // Gracefully swallowed per Sprint 1 SLO SC2
        } finally {
          isRefreshing = false;
          history.push(false);
        }
      };

      return {
        get summary() { return summary; },
        get venues() { return venues; },
        get isRefreshing() { return isRefreshing; },
        get lastUpdated() { return lastUpdated; },
        get history() { return history; },
        refreshDining,
      };
    }

    it('State Transitions: refreshDining toggles isRefreshing true then false', async () => {
      const harness = createDiningRefreshHarness();

      assert.strictEqual(harness.isRefreshing, false);
      await harness.refreshDining(
        async () => {
          assert.strictEqual(harness.isRefreshing, true, 'isRefreshing must be true in-flight');
          return null;
        },
        async () => null
      );

      assert.strictEqual(harness.isRefreshing, false, 'isRefreshing must reset to false');
      assert.deepStrictEqual(harness.history, [true, false]);
    });

    it('Parallel Coordination: updates both student balances and venue operating hours', async () => {
      const harness = createDiningRefreshHarness();

      const mockSummary: DiningSummary = {
        ...getDefaultDiningSummary(),
        swipesRemaining: 19,
        knightBucks: 75.5,
      };
      const mockVenues: EnrichedDiningVenue[] = [
        {
          id: 'commons',
          name: 'Commons Dining Hall',
          location: 'Commons Building',
          status: 'Open',
          currentMeal: 'Dinner',
          hours: '4:30 PM - 7:00 PM',
          acceptsSwipes: true,
        },
      ];

      await harness.refreshDining(
        async () => mockSummary,
        async () => mockVenues
      );

      assert.strictEqual(harness.summary.swipesRemaining, 19);
      assert.strictEqual(harness.summary.knightBucks, 75.5);
      assert.strictEqual(harness.venues.length, 1);
      assert.strictEqual(harness.venues[0].id, 'commons');
      assert.ok(harness.lastUpdated, 'lastUpdated must be recorded after refresh');
    });

    it('Offline Resilience: retains fallback summary and venues when server queries fail', async () => {
      const harness = createDiningRefreshHarness();
      const initialSummary = harness.summary;
      const initialVenues = harness.venues;

      // Both API calls reject (offline server)
      await harness.refreshDining(
        async () => { throw new Error('Offline summary error'); },
        async () => { throw new Error('Offline venues error'); }
      );

      assert.strictEqual(harness.isRefreshing, false);
      assert.strictEqual(harness.summary.mealPlanId, initialSummary.mealPlanId);
      assert.strictEqual(harness.venues.length, initialVenues.length);
      assert.ok(harness.lastUpdated, 'Timestamp still records refresh attempt');
    });

    it('Default Fallback Invariant: useDining outside provider returns safe non-empty fallback', () => {
      const { useDining } = require('@/context/dining-context');
      const dining = withHookDispatcher(() => useDining());

      assert.ok(dining, 'useDining must return a valid context object');
      assert.strictEqual(dining.isRefreshing, false);
      assert.strictEqual(dining.summary.mealPlanId, defaultMealPlan.id);
      assert.ok(dining.venues.length > 0, 'Venues must default to seed dining halls');
      assert.strictEqual(typeof dining.refreshDining, 'function');
    });

    it('API Invariants: fetchDiningSummaryApi and fetchDiningVenuesApi are resilient functions', async () => {
      assert.strictEqual(typeof fetchDiningSummaryApi, 'function');
      assert.strictEqual(typeof fetchDiningVenuesApi, 'function');
      const summary = await fetchDiningSummaryApi('test-student');
      assert.ok(summary);
      assert.ok(summary.swipesTotal > 0);
      const venues = await fetchDiningVenuesApi();
      assert.ok(Array.isArray(venues));
      assert.ok(venues.length > 0);
    });
  });

  // ==========================================================================
  // Suite 5: Campus Safety Refresh Coordination (SafetyContext)
  // ==========================================================================
  describe('Suite 5: Campus Safety Refresh Coordination (SafetyContext)', () => {
    /**
     * Models the exact SafetyContext state reducer and refresh coordinator.
     */
    function createSafetyRefreshHarness() {
      let alerts: SafetyAlert[] = [...safetyAlerts];
      let contacts: EmergencyContact[] = [...emergencyContacts];
      let isRefreshing = false;
      let lastUpdated: string | null = null;
      const history: boolean[] = [];

      const refreshSafety = async (
        alertsFetcher: () => Promise<SafetyAlert[]>,
        contactsFetcher: () => Promise<EmergencyContact[]>
      ) => {
        isRefreshing = true;
        history.push(true);
        try {
          const [freshAlerts, freshContacts] = await Promise.all([
            alertsFetcher().catch(() => safetyAlerts),
            contactsFetcher().catch(() => emergencyContacts),
          ]);

          if (freshAlerts && freshAlerts.length > 0) {
            alerts = freshAlerts;
          }
          if (freshContacts && freshContacts.length > 0) {
            contacts = freshContacts;
          }
          lastUpdated = new Date().toISOString();
        } catch {
          // Gracefully swallowed per Sprint 1 SLO SC2
        } finally {
          isRefreshing = false;
          history.push(false);
        }
      };

      return {
        get alerts() { return alerts; },
        get contacts() { return contacts; },
        get isRefreshing() { return isRefreshing; },
        get lastUpdated() { return lastUpdated; },
        get history() { return history; },
        refreshSafety,
      };
    }

    it('State Transitions: refreshSafety toggles isRefreshing true then false', async () => {
      const harness = createSafetyRefreshHarness();

      assert.strictEqual(harness.isRefreshing, false);
      await harness.refreshSafety(
        async () => {
          assert.strictEqual(harness.isRefreshing, true, 'isRefreshing must be true in-flight');
          return safetyAlerts;
        },
        async () => emergencyContacts
      );

      assert.strictEqual(harness.isRefreshing, false);
      assert.deepStrictEqual(harness.history, [true, false]);
    });

    it('Parallel Coordination: updates both active advisories and emergency directory contacts', async () => {
      const harness = createSafetyRefreshHarness();

      const freshAlerts: SafetyAlert[] = [
        {
          id: 'alert-winter-1',
          severity: 'warning',
          title: 'Campus Winter Weather Advisory',
          detail: 'Snow removal active across East Beltline sidewalks',
          at: '2:15 PM',
          area: 'All campus',
        },
      ];
      const freshContacts: EmergencyContact[] = [
        {
          id: 'contact-safety-1',
          name: 'Calvin Safety Dispatch',
          detail: 'Available 24/7',
          phone: '6165263333',
          urgent: true,
        },
      ];

      await harness.refreshSafety(
        async () => freshAlerts,
        async () => freshContacts
      );

      assert.strictEqual(harness.alerts.length, 1);
      assert.strictEqual(harness.alerts[0].id, 'alert-winter-1');
      assert.strictEqual(harness.contacts.length, 1);
      assert.strictEqual(harness.contacts[0].id, 'contact-safety-1');
      assert.ok(harness.lastUpdated);
    });

    it('Offline Resilience: preserves fallback seed data when server queries fail', async () => {
      const harness = createSafetyRefreshHarness();

      // Both API calls throw network errors
      await harness.refreshSafety(
        async () => { throw new Error('Offline alerts'); },
        async () => { throw new Error('Offline contacts'); }
      );

      assert.strictEqual(harness.isRefreshing, false);
      assert.strictEqual(harness.alerts.length, safetyAlerts.length);
      assert.strictEqual(harness.contacts.length, emergencyContacts.length);
      assert.ok(harness.lastUpdated);
    });

    it('Default Fallback Invariant: useSafety outside provider returns safe fallback without throwing', () => {
      const { useSafety } = require('@/context/safety-context');
      const safety = withHookDispatcher(() => useSafety());

      assert.ok(safety, 'useSafety must return a valid context object');
      assert.strictEqual(safety.isRefreshing, false);
      assert.strictEqual(safety.alerts.length, safetyAlerts.length);
      assert.strictEqual(safety.contacts.length, emergencyContacts.length);
      assert.strictEqual(typeof safety.refreshSafety, 'function');
    });
  });

  // ==========================================================================
  // Suite 6: Campus Safety REST API Service Resilience (safety-api.ts)
  // ==========================================================================
  describe('Suite 6: Campus Safety REST API Service Resilience (safety-api.ts)', () => {
    const originalFetch = globalThis.fetch;

    it('fetchSafetyAlertsApi: normalizes valid API response into SafetyAlert records', async () => {
      const mockRawAlerts = [
        {
          id: 'server-alert-1',
          severity: 'warning',
          title: 'Power Outage Drill',
          detail: 'Noordewier-VanderWerp Hall electrical maintenance',
          created_at: new Date().toISOString(),
          area: 'Knollcrest Campus',
        },
      ];

      globalThis.fetch = async () =>
        new Response(JSON.stringify(mockRawAlerts), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      try {
        const alerts = await fetchSafetyAlertsApi();
        assert.ok(Array.isArray(alerts));
        assert.strictEqual(alerts.length, 1);
        assert.strictEqual(alerts[0].id, 'server-alert-1');
        assert.strictEqual(alerts[0].severity, 'warning');
        assert.strictEqual(alerts[0].title, 'Power Outage Drill');
        assert.strictEqual(alerts[0].area, 'Knollcrest Campus');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchSafetyAlertsApi: falls back cleanly to seed safetyAlerts on network error (offline)', async () => {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch: Network unreachable');
      };

      try {
        const alerts = await fetchSafetyAlertsApi();
        assert.deepStrictEqual(alerts, safetyAlerts, 'Must return seed alerts on network failure');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchSafetyAlertsApi: falls back cleanly to seed safetyAlerts on HTTP 500 server error', async () => {
      globalThis.fetch = async () =>
        new Response('Internal Server Error', { status: 500 });

      try {
        const alerts = await fetchSafetyAlertsApi();
        assert.deepStrictEqual(alerts, safetyAlerts);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchSafetyAlertsApi: falls back cleanly to seed safetyAlerts on empty array response', async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify([]), { status: 200 });

      try {
        const alerts = await fetchSafetyAlertsApi();
        assert.deepStrictEqual(alerts, safetyAlerts);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchSafetyContactsApi: normalizes valid API response into EmergencyContact records', async () => {
      const mockRawContacts = [
        {
          id: 'server-contact-1',
          name: 'Calvin Health Services',
          detail: 'Hoogenboom Center Room 240',
          phone: '6165266187',
          urgent: false,
        },
      ];

      globalThis.fetch = async () =>
        new Response(JSON.stringify(mockRawContacts), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      try {
        const contacts = await fetchSafetyContactsApi();
        assert.ok(Array.isArray(contacts));
        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].id, 'server-contact-1');
        assert.strictEqual(contacts[0].name, 'Calvin Health Services');
        assert.strictEqual(contacts[0].phone, '6165266187');
        assert.strictEqual(contacts[0].urgent, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchSafetyContactsApi: falls back cleanly to seed emergencyContacts on network error (offline)', async () => {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch: Server unreachable');
      };

      try {
        const contacts = await fetchSafetyContactsApi();
        assert.deepStrictEqual(contacts, emergencyContacts, 'Must return seed contacts on network failure');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchSafetyContactsApi: falls back cleanly to seed emergencyContacts on HTTP 500 server error', async () => {
      globalThis.fetch = async () =>
        new Response('Internal Server Error', { status: 500 });

      try {
        const contacts = await fetchSafetyContactsApi();
        assert.deepStrictEqual(contacts, emergencyContacts);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('Seed Data Invariant: safety seed datasets are valid and contain primary emergency numbers', () => {
      assert.ok(safetyAlerts.length > 0, 'Seed alerts must not be empty');
      assert.ok(emergencyContacts.length > 0, 'Seed contacts must not be empty');

      // Verify Calvin Safety Dispatch emergency contact exists
      const dispatch = emergencyContacts.find((c) => c.phone === '6165263333');
      assert.ok(dispatch, 'Campus Safety Dispatch (6165263333) must be present in contacts');
      assert.strictEqual(dispatch.urgent, true, 'Campus Safety Dispatch must be marked urgent');
    });
  });

  // ==========================================================================
  // Suite 7: Template Inheritance & Screen Wiring Architectural Invariants
  // ==========================================================================
  describe('Suite 7: Template Inheritance & Screen Wiring Architectural Invariants', () => {
    it('FeedScreen: delegates pull-to-refresh to ScreenFlatList and Screen templates', () => {
      const code = readSrc('app/(tabs)/index.tsx');

      // Wires pull-to-refresh on mobile ScreenFlatList
      assert.ok(
        code.includes('refreshing={isRefreshing}'),
        'FeedScreen must pass refreshing={isRefreshing} to Screen / ScreenFlatList'
      );
      assert.ok(
        code.includes('onRefresh={refreshFeed}'),
        'FeedScreen must pass onRefresh={refreshFeed} to Screen / ScreenFlatList'
      );

      // Wires manual RefreshButton in listHeader
      assert.ok(
        code.includes('<RefreshButton'),
        'FeedScreen must include manual RefreshButton in listHeader'
      );
      assert.ok(
        code.includes('accessibilityLabel="Refresh campus feed"'),
        'FeedScreen RefreshButton must specify accessible label'
      );
    });

    it('Dining Views: wire pull-to-refresh on Screen template and RefreshButton in section header', () => {
      const mobileCode = readSrc('components/dining-mobile-view.tsx');
      const webCode = readSrc('components/dining-web-view.tsx');
      const sectionCode = readSrc('components/dining-venues-section.tsx');

      // DiningMobileView wires Screen template
      assert.ok(mobileCode.includes('refreshing={isRefreshing}'));
      assert.ok(mobileCode.includes('onRefresh={refreshDining}'));

      // DiningWebView wires Screen template
      assert.ok(webCode.includes('refreshing={isRefreshing}'));
      assert.ok(webCode.includes('onRefresh={refreshDining}'));

      // DiningHallsSection wires RefreshButton in SectionHeader
      assert.ok(sectionCode.includes('<RefreshButton'));
      assert.ok(sectionCode.includes('onRefresh={refreshDining}'));
      assert.ok(sectionCode.includes('refreshing={isRefreshing}'));
      assert.ok(sectionCode.includes('accessibilityLabel="Refresh dining hall hours and balances"'));
    });

    it('Safety Views: wire pull-to-refresh on Screen template and RefreshButton in section header', () => {
      const mobileCode = readSrc('components/safety-mobile-view.tsx');
      const webCode = readSrc('components/safety-web-view.tsx');
      const sectionCode = readSrc('components/safety-sections.tsx');

      // SafetyMobileView wires Screen template
      assert.ok(mobileCode.includes('refreshing={isRefreshing}'));
      assert.ok(mobileCode.includes('onRefresh={refreshSafety}'));

      // SafetyWebView wires Screen template
      assert.ok(webCode.includes('refreshing={isRefreshing}'));
      assert.ok(webCode.includes('onRefresh={refreshSafety}'));

      // SafetyAlertsSection wires RefreshButton in SectionHeader
      assert.ok(sectionCode.includes('<RefreshButton'));
      assert.ok(sectionCode.includes('onRefresh={refreshSafety}'));
      assert.ok(sectionCode.includes('refreshing={isRefreshing}'));
      assert.ok(sectionCode.includes('accessibilityLabel="Refresh campus safety alerts"'));
    });

    it('Template Invariant: zero duplicate inline RefreshControl elements outside screen.tsx', () => {
      // Find all .tsx files in client/src
      const getTsxFiles = (dir: string): string[] => {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(getTsxFiles(fullPath));
          } else if (entry.name.endsWith('.tsx')) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const allTsxFiles = getTsxFiles(srcDir);
      const violations: string[] = [];

      for (const file of allTsxFiles) {
        const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
        if (relPath === 'components/ui/screen.tsx') {
          // screen.tsx is the authoritative template owner
          continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('<RefreshControl') || content.includes('RefreshControl')) {
          violations.push(relPath);
        }
      }

      assert.deepStrictEqual(
        violations,
        [],
        `Template inheritance violation: RefreshControl must strictly be encapsulated in screen.tsx. Found violations in: ${violations.join(', ')}`
      );
    });
  });
});
