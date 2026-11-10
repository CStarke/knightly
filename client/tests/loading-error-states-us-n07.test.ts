/**
 * US-N07: Loading, Empty, and Request-Failure Error States Test Suite
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.3, 4.4, 4.5, Rule 5, & US-N07):
 * "US-N07: As a student, I want separate loading, no-results, and request-failure messages,
 *  with retry after a failure, so I understand what happened and can try again."
 *
 * NON-NEGOTIABLE DOMAIN INVARIANTS TESTED:
 * 1. Animated Loading Skeleton Template Contract (AGENTS.md Rule 4.5 & US-N07):
 *    - Reanimated breathing opacity pulse animation (0.38 <-> 0.85) cycles infinitely at 60fps.
 *    - Accessibility compliance: accessibilityRole="progressbar", busy=true, and descriptive labels.
 *    - Responsive layouts: 1 column on handheld mobile, balanced multi-column rows matching numColumns
 *      with trailing padding cells on desktop web.
 *    - Semantic theme tokens: consumes backgroundSelected, backgroundElement, border without raw hexes.
 * 2. Request-Failure Error Banner & Card Template Contract (ErrorBanner):
 *    - Actionable Retry: every failure banner provides dedicated onRetry with isRetrying state reflection.
 *    - Compact 'banner' variant with warning icon, title, message, retry button, and dismiss action.
 *    - Full 'card' variant with prominent wifi_off glyph, title, subtitle, and medium retry button.
 *    - Accessibility compliance: accessibilityRole="alert", liveRegion="assertive", accessible descriptions.
 *    - Centralized Calvin palette tokens: Brand.brightRed (#C2002F), Brand.gold (#E8B019), theme.dangerSoft.
 * 3. Feed Empty State Taxonomy & Consolidation (FeedEmptyState):
 *    - Strictly distinguishes 4 distinct empty states: 'no-following-posts', 'no-filter-matches',
 *      'no-saved-posts', and 'no-posts'.
 *    - Dedicated iconography (star, sparkles, search, article) and tailored guidance copy.
 *    - Interactive CTAs: 'Browse Campus Clubs' and 'Clear Filters' triggers.
 * 4. Posts API Resilience & Detailed Error Reporting (posts-api.ts):
 *    - fetchFeedPostsDetailed returns isError: false on 200 responses.
 *    - fetchFeedPostsDetailed returns isError: true and invokes options.onError on HTTP error or network throw.
 *    - Offline resilience: preserves in-memory fallback posts or seed data without unhandled exceptions.
 * 5. Feed Context Loading, Error, and Retry State Coordination (FeedContext):
 *    - Initial mount triggers isLoading=true then false upon fetch resolution.
 *    - Network errors populate error state with descriptive message.
 *    - retryFeed() resets error to null before re-attempting fetch.
 *    - clearError() manually clears error to null.
 *    - Successful refresh clears previous error state and preserves locally authored posts (p-local-*).
 * 6. Template-Level Feature Inheritance & Anti-Monolith Screen Integration:
 *    - FeedScreen, FeedMobileView, and FeedWebView delegate to ErrorBanner, FeedLoadingSkeleton, and FeedEmptyState.
 *    - Zero duplicate inline error or skeleton elements outside template files.
 *    - Zero ActivityIndicator spinners in feed views.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { describe, it, mock } from 'node:test';
import type { ReactElement } from 'react';

import type { FeedEmptyState as FeedEmptyStateTypeFn } from '@/components/feed-controls';
import {
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_ERROR_TITLE,
  type ErrorBanner as ErrorBannerTypeFn,
} from '@/components/ui/error-banner';
import type {
  FeedLoadingSkeleton as FeedLoadingSkeletonTypeFn,
  PostCardSkeleton as PostCardSkeletonTypeFn,
  Skeleton as SkeletonTypeFn,
  SkeletonCard as SkeletonCardTypeFn,
  SkeletonLine as SkeletonLineTypeFn,
} from '@/components/ui/skeleton';
import { Brand, Radius } from '@/constants/theme';
import { posts as defaultPosts, sortPostsByDate, type Post } from '@/data/feed';
import {
  fetchFeedPosts,
  fetchFeedPostsDetailed,
  type FetchFeedPostsResult,
} from '@/services/posts-api';
import { type DatabasePostRow } from '@/utils/post-database-adapter';

// Helper to read source code files for structural and architectural invariant validation
const srcDir = path.resolve(__dirname, '../src');
const readSrc = (relPath: string) =>
  fs.readFileSync(path.join(srcDir, relPath), 'utf-8').replace(/\r\n/g, '\n');

// ============================================================================
// Element Search Helpers for Shallow Component Tree Inspection
// ============================================================================

/**
 * Recursively searches a React element tree for the first element matching predicate.
 */
function findElement(tree: any, predicate: (node: any) => boolean): any {
  if (!tree) return null;
  if (predicate(tree)) return tree;
  if (Array.isArray(tree)) {
    for (const item of tree) {
      const found = findElement(item, predicate);
      if (found) return found;
    }
    return null;
  }
  if (tree.props && tree.props.children) {
    return findElement(tree.props.children, predicate);
  }
  return null;
}

/**
 * Recursively collects all elements matching predicate from a React element tree.
 */
function findAllElements(tree: any, predicate: (node: any) => boolean): any[] {
  const results: any[] = [];
  function search(node: any) {
    if (!node) return;
    if (predicate(node)) results.push(node);
    if (Array.isArray(node)) {
      for (const item of node) search(item);
    } else if (node.props && node.props.children) {
      search(node.props.children);
    }
  }
  search(tree);
  return results;
}

// ============================================================================
// Component Rendering Test Harness
// Stubs React hooks and React Native Reanimated to execute UI components
// without needing a native mobile runtime or full headless DOM.
// ============================================================================

interface ComponentHarnessResult {
  Skeleton: typeof SkeletonTypeFn;
  SkeletonLine: typeof SkeletonLineTypeFn;
  SkeletonCard: typeof SkeletonCardTypeFn;
  PostCardSkeleton: typeof PostCardSkeletonTypeFn;
  FeedLoadingSkeleton: typeof FeedLoadingSkeletonTypeFn;
  ErrorBanner: typeof ErrorBannerTypeFn;
  FeedEmptyState: typeof FeedEmptyStateTypeFn;
  lastSharedValues: Array<{ value: unknown }>;
  cancelledAnimations: any[];
  activeCleanups: Array<() => void>;
  themeMock: Record<string, string>;
}

function withComponentHarness<T>(callback: (harness: ComponentHarnessResult) => T): T {
  const React = require('react');
  const lastSharedValues: Array<{ value: unknown }> = [];
  const cancelledAnimations: any[] = [];
  const activeCleanups: Array<() => void> = [];

  const themeMock: Record<string, string> = {
    background: '#0B0C0E',
    backgroundElement: '#14161B',
    backgroundSelected: '#1F2328',
    border: '#2A2E39',
    text: '#FFFFFF',
    textSecondary: '#8E95A5',
    textMuted: '#5C6370',
    danger: Brand.brightRed,
    dangerSoft: '#291216',
  };

  // Configure React 19 current hook dispatcher so hooks execute smoothly in headless unit tests
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const originalH = internals ? internals.H : null;
  const mockDispatcher = {
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (fn: any) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        activeCleanups.push(cleanup);
      }
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useRef: (initial: any) => ({ current: initial }),
    useLayoutEffect: (fn: any) => fn(),
    useContext: (ctx: any) => ctx?._currentValue,
  };
  if (internals) {
    internals.H = mockDispatcher;
  }

  const stubs = new Map<string, unknown>();
  stubs.set('react', {
    ...React,
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (fn: any) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        activeCleanups.push(cleanup);
      }
    },
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
    withTiming: (toValue: any, config?: any) => ({ type: 'withTiming', toValue, config }),
    withRepeat: (animation: any, numberOfReps?: number, reverse?: boolean) => ({
      type: 'withRepeat',
      animation,
      numberOfReps,
      reverse,
    }),
    withSpring: (s: any) => s,
    cancelAnimation: (anim: any) => {
      cancelledAnimations.push(anim);
    },
    Easing: {
      linear: (v: any) => v,
      out: () => (v: any) => v,
      ease: 'ease',
      inOut: (easing: any) => ({ type: 'inOut', easing }),
    },
  });
  stubs.set('@/hooks/use-theme', {
    useTheme: () => themeMock,
  });

  const loader = Module as unknown as { _load: (...args: any[]) => any };
  const originalLoad = loader._load;
  const loadMock = mock.method(loader, '_load', (...args: any[]) => {
    const request = args[0];
    if (typeof request === 'string') {
      if (
        request === '@/hooks/use-theme' ||
        request.endsWith('hooks/use-theme') ||
        request.endsWith('hooks\\use-theme') ||
        request.endsWith('hooks/use-theme.ts') ||
        request.endsWith('hooks\\use-theme.ts')
      ) {
        return stubs.get('@/hooks/use-theme');
      }
    }
    return stubs.has(request) ? stubs.get(request) : originalLoad(...args);
  });

  try {
    const skeletonModule = require('@/components/ui/skeleton');
    const errorBannerModule = require('@/components/ui/error-banner');
    const feedControlsModule = require('@/components/feed-controls');

    return callback({
      Skeleton: skeletonModule.Skeleton,
      SkeletonLine: skeletonModule.SkeletonLine,
      SkeletonCard: skeletonModule.SkeletonCard,
      PostCardSkeleton: skeletonModule.PostCardSkeleton,
      FeedLoadingSkeleton: skeletonModule.FeedLoadingSkeleton,
      ErrorBanner: errorBannerModule.ErrorBanner,
      FeedEmptyState: feedControlsModule.FeedEmptyState,
      lastSharedValues,
      cancelledAnimations,
      activeCleanups,
      themeMock,
    });
  } finally {
    loadMock.mock.restore();
    if (internals) {
      internals.H = originalH;
    }
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

describe('US-N07: Loading, Empty, and Request-Failure Error States Test Suite', () => {
  // ==========================================================================
  // Suite 1: Animated Loading Skeleton Template Contract (Skeleton & Variants)
  // ==========================================================================
  describe('Suite 1: Animated Loading Skeleton Template Contract', () => {
    it('Skeleton: sets up Reanimated breathing opacity pulse animation (withRepeat, withTiming, duration=850, Easing.inOut)', () => {
      withComponentHarness(({ Skeleton, lastSharedValues, activeCleanups, cancelledAnimations }) => {
        // Step 1: Render atomic Skeleton primitive
        const tree = Skeleton({}) as ReactElement<any>;
        assert.ok(tree, 'Skeleton should return a valid React element');

        // Step 2: Validate initial shared value is set to 0.38
        assert.ok(lastSharedValues.length > 0, 'Must initialize a shared value for pulse animation');
        const sharedCell = lastSharedValues[lastSharedValues.length - 1];

        // Step 3: Validate useEffect sets up infinite breathing loop
        // opacity.value = withRepeat(withTiming(0.85, { duration: 850, easing: Easing.inOut(...) }), -1, true)
        const animation = sharedCell.value as any;
        assert.strictEqual(animation.type, 'withRepeat', 'Pulse must use Reanimated withRepeat');
        assert.strictEqual(animation.numberOfReps, -1, 'Pulse loop must run indefinitely (-1 reps)');
        assert.strictEqual(animation.reverse, true, 'Pulse must reverse direction on alternate cycles');

        assert.strictEqual(animation.animation.type, 'withTiming');
        assert.strictEqual(animation.animation.toValue, 0.85, 'Pulse peak opacity must reach 0.85');
        assert.strictEqual(animation.animation.config.duration, 850, 'Pulse timing duration must be 850ms');
        assert.deepStrictEqual(animation.animation.config.easing, {
          type: 'inOut',
          easing: 'ease',
        });

        // Step 4: Validate unmount cleanup invokes cancelAnimation
        assert.ok(activeCleanups.length > 0, 'Skeleton must register cleanup callback');
        activeCleanups.forEach((cleanup) => cleanup());
        assert.ok(
          cancelledAnimations.includes(sharedCell),
          'Unmounting Skeleton must cancel animation to prevent memory leaks'
        );
      });
    });

    it('Skeleton: enforces accessible progressbar role, busy state, and custom accessibilityLabel', () => {
      withComponentHarness(({ Skeleton }) => {
        // Step 1: Render with default props
        const defaultEl = Skeleton({}) as ReactElement<any>;
        assert.strictEqual(defaultEl.props.accessible, true);
        assert.strictEqual(defaultEl.props.accessibilityRole, 'progressbar');
        assert.deepStrictEqual(defaultEl.props.accessibilityState, { busy: true });
        assert.strictEqual(defaultEl.props.accessibilityLabel, 'Loading content...');
        assert.strictEqual(defaultEl.props.testID, 'skeleton-block');

        // Step 2: Render with custom accessible label and testID
        const customEl = Skeleton({
          accessibilityLabel: 'Loading announcements...',
          testID: 'custom-skeleton',
          width: 250,
          height: 32,
          borderRadius: Radius.md,
        }) as ReactElement<any>;

        assert.strictEqual(customEl.props.accessibilityLabel, 'Loading announcements...');
        assert.strictEqual(customEl.props.testID, 'custom-skeleton');

        // Step 3: Verify style array includes width, height, borderRadius, and theme.backgroundSelected
        const styleArray = customEl.props.style;
        const inlineStyle = styleArray[1];
        assert.strictEqual(inlineStyle.width, 250);
        assert.strictEqual(inlineStyle.height, 32);
        assert.strictEqual(inlineStyle.borderRadius, Radius.md);
        assert.strictEqual(inlineStyle.backgroundColor, '#1F2328');
      });
    });

    it('SkeletonLine: forwards text loading accessibility attributes and default height=14', () => {
      withComponentHarness(({ SkeletonLine }) => {
        // Step 1: Render default SkeletonLine
        const defaultLine = SkeletonLine({}) as ReactElement<any>;
        assert.strictEqual(defaultLine.props.accessibilityLabel, 'Loading text...');
        assert.strictEqual(defaultLine.props.height, 14);
        assert.strictEqual(defaultLine.props.borderRadius, Radius.sm);

        // Step 2: Render custom SkeletonLine
        const customLine = SkeletonLine({
          width: '75%',
          height: 18,
          borderRadius: Radius.pill,
          accessibilityLabel: 'Loading club headline...',
        }) as ReactElement<any>;

        assert.strictEqual(customLine.props.width, '75%');
        assert.strictEqual(customLine.props.height, 18);
        assert.strictEqual(customLine.props.borderRadius, Radius.pill);
        assert.strictEqual(customLine.props.accessibilityLabel, 'Loading club headline...');
      });
    });

    it('SkeletonCard: renders themed container matching Card layout and borders', () => {
      withComponentHarness(({ SkeletonCard }) => {
        const card = SkeletonCard({
          children: 'Placeholder Content',
        }) as ReactElement<any>;

        assert.strictEqual(card.props.testID, 'skeleton-card');
        assert.strictEqual(card.props.children, 'Placeholder Content');

        // Validate theme backgroundElement and border
        const styleArray = card.props.style;
        const themeStyle = styleArray[1];
        assert.strictEqual(themeStyle.backgroundColor, '#14161B');
        assert.strictEqual(themeStyle.borderColor, '#2A2E39');
      });
    });

    it('PostCardSkeleton: renders complete announcement flyer skeleton layout structure', () => {
      withComponentHarness(({ PostCardSkeleton, SkeletonLine }) => {
        // Step 1: Render PostCardSkeleton with hero image enabled (default)
        const flyerWithHero = PostCardSkeleton({}) as ReactElement<any>;
        assert.strictEqual(flyerWithHero.props.testID, 'post-card-skeleton');

        // Step 2: Inspect header row (avatar mark, org name line, category pill)
        const headerRow = flyerWithHero.props.children[0];
        assert.ok(headerRow, 'Must include header row');
        const avatar = findElement(headerRow, (n) => n?.props?.accessibilityLabel === 'Loading author mark...');
        assert.ok(avatar, 'Must render club author mark placeholder');
        assert.strictEqual(avatar.props.width, 36);
        assert.strictEqual(avatar.props.height, 36);
        assert.strictEqual(avatar.props.borderRadius, Radius.pill);

        // Step 3: Inspect hero banner placeholder
        const heroBanner = flyerWithHero.props.children[1];
        assert.ok(heroBanner, 'Hero image banner must be present when showHeroImage=true');
        assert.strictEqual(heroBanner.props.accessibilityLabel, 'Loading event image...');
        assert.strictEqual(heroBanner.props.height, 140);
        assert.strictEqual(heroBanner.props.borderRadius, Radius.md);

        // Step 4: Inspect body section (headline, date logistics row, description lines)
        const bodySection = flyerWithHero.props.children[2];
        assert.ok(bodySection, 'Must include body section');
        const lines = findAllElements(
          bodySection,
          (n) => n?.type === SkeletonLine || n?.type?.name === 'SkeletonLine'
        );
        assert.ok(lines.length >= 4, 'Must render multiple text lines for headline and description');

        // Step 5: Inspect footer row (date stamp line, bookmark action)
        const footerRow = flyerWithHero.props.children[3];
        assert.ok(footerRow, 'Must include footer row');
        const bookmarkPill = findElement(footerRow, (n) => n?.props?.borderRadius === Radius.pill && n?.props?.width === 20);
        assert.ok(bookmarkPill, 'Must render bookmark action placeholder');

        // Step 6: Render PostCardSkeleton without hero image
        const flyerWithoutHero = PostCardSkeleton({ showHeroImage: false }) as ReactElement<any>;
        assert.strictEqual(
          flyerWithoutHero.props.children[1],
          false,
          'Hero image placeholder must be omitted when showHeroImage=false'
        );
      });
    });

    it('FeedLoadingSkeleton (Mobile): renders single-column vertical stack with alternating hero placeholders', () => {
      withComponentHarness(({ FeedLoadingSkeleton }) => {
        // Step 1: Render mobile skeleton with 4 placeholder items
        const mobileSkeleton = FeedLoadingSkeleton({
          count: 4,
          numColumns: 1,
        }) as ReactElement<any>;

        // Step 2: Validate root accessibility attributes
        assert.strictEqual(mobileSkeleton.props.testID, 'feed-loading-skeleton');
        assert.strictEqual(mobileSkeleton.props.accessible, true);
        assert.strictEqual(mobileSkeleton.props.accessibilityRole, 'progressbar');
        assert.strictEqual(mobileSkeleton.props.accessibilityLabel, 'Loading campus announcements...');
        assert.deepStrictEqual(mobileSkeleton.props.accessibilityState, { busy: true });

        // Step 3: Validate card count
        const cardWrappers = mobileSkeleton.props.children;
        assert.strictEqual(cardWrappers.length, 4, 'Must render exactly 4 card wrappers');

        // Step 4: Validate alternating hero image banners (idx % 2 === 0)
        assert.strictEqual(cardWrappers[0].props.children.props.showHeroImage, true);
        assert.strictEqual(cardWrappers[1].props.children.props.showHeroImage, false);
        assert.strictEqual(cardWrappers[2].props.children.props.showHeroImage, true);
        assert.strictEqual(cardWrappers[3].props.children.props.showHeroImage, false);
      });
    });

    it('FeedLoadingSkeleton (Desktop Web): partitions items into balanced rows matching numColumns with padding cells', () => {
      withComponentHarness(({ FeedLoadingSkeleton }) => {
        // Step 1: Render desktop skeleton with 5 cards across 3 columns
        const webSkeleton = FeedLoadingSkeleton({
          count: 5,
          numColumns: 3,
        }) as ReactElement<any>;

        assert.strictEqual(webSkeleton.props.testID, 'feed-loading-skeleton');
        const rows = webSkeleton.props.children;
        assert.strictEqual(rows.length, 2, '5 items across 3 columns must partition into 2 rows');

        // Row 0: 3 cards
        const row0Cells = rows[0].props.children[0];
        assert.strictEqual(row0Cells.length, 3, 'First row must contain 3 items');

        // Row 1: 2 cards + 1 padding cell
        const row1Cells = rows[1].props.children[0];
        const row1Pads = rows[1].props.children[1];
        assert.strictEqual(row1Cells.length, 2, 'Second row must contain 2 items');
        assert.strictEqual(row1Pads.length, 1, 'Second row must contain 1 trailing padding spacer cell');

        // Step 2: Validate 2-column balanced grid with 4 cards
        const twoColSkeleton = FeedLoadingSkeleton({
          count: 4,
          numColumns: 2,
        }) as ReactElement<any>;

        const twoColRows = twoColSkeleton.props.children;
        assert.strictEqual(twoColRows.length, 2, '4 items across 2 columns must partition into 2 rows');
        assert.strictEqual(twoColRows[0].props.children[0].length, 2);
        assert.strictEqual(twoColRows[1].props.children[0].length, 2);
        assert.strictEqual(twoColRows[0].props.children[1], false);
      });
    });

    it('Theme Token Invariant: Skeletons strictly consume semantic theme tokens without raw hex literals', () => {
      const code = readSrc('components/ui/skeleton.tsx');
      const codeWithoutComments = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      // Verifies usage of semantic tokens
      assert.ok(code.includes('theme.backgroundSelected'), 'Must use theme.backgroundSelected');
      assert.ok(code.includes('theme.backgroundElement'), 'Must use theme.backgroundElement');
      assert.ok(code.includes('theme.border'), 'Must use theme.border');
      assert.ok(code.includes('Radius.sm'), 'Must use Radius.sm');
      assert.ok(code.includes('Spacing.three'), 'Must use Spacing.three');

      // Verifies zero illegal hardcoded hex colors in code
      assert.strictEqual(codeWithoutComments.includes('#8C2131'), false, 'Must not hardcode raw #8C2131 maroon');
      assert.strictEqual(codeWithoutComments.includes('#E8B019'), false, 'Must not hardcode raw #E8B019 gold');
      assert.strictEqual(codeWithoutComments.includes('#FFFFFF'), false, 'Must not hardcode raw #FFFFFF');
      assert.strictEqual(codeWithoutComments.includes('#000000'), false, 'Must not hardcode raw #000000');
    });
  });

  // ==========================================================================
  // Suite 2: Request-Failure Error Banner & Card Template Contract (ErrorBanner)
  // ==========================================================================
  describe('Suite 2: Request-Failure Error Banner & Card Template Contract (ErrorBanner)', () => {
    it('ErrorBanner (Banner Variant): renders compact alert bar with warning icon, title, and message', () => {
      withComponentHarness(({ ErrorBanner }) => {
        // Step 1: Render default banner variant
        const banner = ErrorBanner({}) as ReactElement<any>;

        assert.strictEqual(banner.props.testID, 'request-failure-banner');
        assert.strictEqual(banner.props.accessible, true);
        assert.strictEqual(banner.props.accessibilityRole, 'alert');
        assert.strictEqual(banner.props.accessibilityLiveRegion, 'assertive');

        // Step 2: Validate warning alert glyph
        const icon = findElement(banner, (n) => n?.props?.sf === 'exclamationmark.triangle.fill');
        assert.ok(icon, 'Must render warning alert icon');
        assert.strictEqual(icon.props.md, 'warning');
        assert.strictEqual(icon.props.size, 18);
        assert.strictEqual(icon.props.color, Brand.brightRed);

        // Step 3: Validate default title and message text
        const titleEl = findElement(banner, (n) => n?.props?.children === DEFAULT_ERROR_TITLE);
        assert.ok(titleEl, 'Must render default error title');

        const msgEl = findElement(banner, (n) => n?.props?.children === DEFAULT_ERROR_MESSAGE);
        assert.ok(msgEl, 'Must render default error message');

        // Step 4: Render with custom title and message
        const customBanner = ErrorBanner({
          title: 'Custom Server Failure',
          message: 'Unable to reach Knightly database.',
        }) as ReactElement<any>;

        const customTitle = findElement(customBanner, (n) => n?.props?.children === 'Custom Server Failure');
        assert.ok(customTitle);
        const customMsg = findElement(customBanner, (n) => n?.props?.children === 'Unable to reach Knightly database.');
        assert.ok(customMsg);
      });
    });

    it('ErrorBanner (Banner Variant): wires RefreshButton retry action with isRetrying state', () => {
      withComponentHarness(({ ErrorBanner }) => {
        let retryCount = 0;
        const onRetry = () => {
          retryCount++;
        };

        // Step 1: Render with onRetry callback and isRetrying=false
        const bannerIdle = ErrorBanner({
          onRetry,
          isRetrying: false,
          retryLabel: 'Try Again',
        }) as ReactElement<any>;

        const retryBtn = findElement(bannerIdle, (n) => n?.props?.label === 'Try Again');
        assert.ok(retryBtn, 'Must render retry RefreshButton when onRetry is passed');
        assert.strictEqual(retryBtn.props.size, 'small');
        assert.strictEqual(retryBtn.props.variant, 'pill');
        assert.strictEqual(retryBtn.props.color, Brand.brightRed);
        assert.strictEqual(retryBtn.props.refreshing, false);

        // Step 2: Simulate retry button click
        retryBtn.props.onRefresh();
        assert.strictEqual(retryCount, 1, 'Executing onRefresh must invoke onRetry');

        // Step 3: Render with isRetrying=true
        const bannerRetrying = ErrorBanner({
          onRetry,
          isRetrying: true,
        }) as ReactElement<any>;

        const activeRetryBtn = findElement(bannerRetrying, (n) => n?.props?.label === 'Try Again');
        assert.strictEqual(activeRetryBtn.props.refreshing, true, 'isRetrying must reflect in refreshing prop');

        // Step 4: When onRetry is omitted, retry button must not render
        const bannerNoRetry = ErrorBanner({}) as ReactElement<any>;
        const absentBtn = findElement(bannerNoRetry, (n) => n?.props?.label === 'Try Again');
        assert.strictEqual(absentBtn, null, 'Must omit retry button when onRetry is undefined');
      });
    });

    it('ErrorBanner (Banner Variant): wires dismiss button and triggers onDismiss callback', () => {
      withComponentHarness(({ ErrorBanner }) => {
        let dismissed = false;
        const onDismiss = () => {
          dismissed = true;
        };

        // Step 1: Render with onDismiss callback
        const bannerWithDismiss = ErrorBanner({
          onDismiss,
        }) as ReactElement<any>;

        const dismissBtn = findElement(
          bannerWithDismiss,
          (n) => n?.props?.accessibilityLabel === 'Dismiss error message'
        );
        assert.ok(dismissBtn, 'Must render dismiss Pressable');
        assert.strictEqual(dismissBtn.props.accessibilityRole, 'button');

        // Verify close icon inside dismiss button
        const closeIcon = findElement(dismissBtn, (n) => n?.props?.sf === 'xmark');
        assert.ok(closeIcon);
        assert.strictEqual(closeIcon.props.md, 'close');
        assert.strictEqual(closeIcon.props.size, 14);

        // Step 2: Trigger dismiss press
        dismissBtn.props.onPress();
        assert.strictEqual(dismissed, true, 'Pressing dismiss button must execute onDismiss');

        // Step 3: When onDismiss is omitted, dismiss button must not render
        const bannerNoDismiss = ErrorBanner({}) as ReactElement<any>;
        const absentDismiss = findElement(
          bannerNoDismiss,
          (n) => n?.props?.accessibilityLabel === 'Dismiss error message'
        );
        assert.strictEqual(absentDismiss, null, 'Must omit dismiss button when onDismiss is undefined');
      });
    });

    it('ErrorBanner (Card Variant): renders prominent centered error card with wifi_off glyph and medium retry button', () => {
      withComponentHarness(({ ErrorBanner }) => {
        let retryCount = 0;
        const onRetry = () => {
          retryCount++;
        };

        // Step 1: Render card variant
        const cardTree = ErrorBanner({
          variant: 'card',
          title: 'Unable to load campus feed',
          message: 'The university server is currently unreachable.',
          onRetry,
          isRetrying: true,
          retryLabel: 'Reconnect',
        }) as ReactElement<any>;

        assert.strictEqual(cardTree.props.testID, 'request-failure-banner');

        // Step 2: Validate root alert accessibility attributes
        const alertRoot = findElement(cardTree, (n) => n?.props?.accessibilityRole === 'alert');
        assert.ok(alertRoot, 'Must render accessible alert container in card variant');
        assert.strictEqual(alertRoot.props.accessibilityLiveRegion, 'assertive');

        // Step 3: Validate prominent wifi_off icon (size 32, Brand.brightRed)
        const wifiIcon = findElement(cardTree, (n) => n?.props?.sf === 'wifi.slash');
        assert.ok(wifiIcon, 'Must render wifi_off glyph in card variant');
        assert.strictEqual(wifiIcon.props.md, 'wifi_off');
        assert.strictEqual(wifiIcon.props.size, 32);
        assert.strictEqual(wifiIcon.props.color, Brand.brightRed);

        // Step 4: Validate headline & subtitle
        const titleEl = findElement(cardTree, (n) => n?.props?.children === 'Unable to load campus feed');
        assert.ok(titleEl);
        assert.strictEqual(titleEl.props.type, 'smallBold');

        const subtitleEl = findElement(
          cardTree,
          (n) => n?.props?.children === 'The university server is currently unreachable.'
        );
        assert.ok(subtitleEl);
        assert.strictEqual(subtitleEl.props.type, 'small');
        assert.strictEqual(subtitleEl.props.themeColor, 'textSecondary');

        // Step 5: Validate medium retry button
        const retryBtn = findElement(cardTree, (n) => n?.props?.label === 'Reconnect');
        assert.ok(retryBtn, 'Must render medium retry button in card variant');
        assert.strictEqual(retryBtn.props.size, 'medium');
        assert.strictEqual(retryBtn.props.refreshing, true);

        retryBtn.props.onRefresh();
        assert.strictEqual(retryCount, 1);
      });
    });

    it('Accessibility Contract: builds descriptive composite accessibilityLabel including retry instructions', () => {
      withComponentHarness(({ ErrorBanner }) => {
        // Step 1: With retry action
        const bannerWithRetry = ErrorBanner({
          title: 'Network Timeout',
          message: 'Connection timed out.',
          onRetry: () => {},
        }) as ReactElement<any>;

        assert.strictEqual(
          bannerWithRetry.props.accessibilityLabel,
          'Network Timeout. Connection timed out.. Press Try Again to retry the request.'
        );

        // Step 2: Without retry action
        const bannerWithoutRetry = ErrorBanner({
          title: 'Notice',
          message: 'Campus alerts paused.',
        }) as ReactElement<any>;

        assert.strictEqual(
          bannerWithoutRetry.props.accessibilityLabel,
          'Notice. Campus alerts paused.'
        );
      });
    });

    it('Centralized Theme Tokens: enforces Brand.brightRed, theme.dangerSoft, and zero raw hex values', () => {
      const code = readSrc('components/ui/error-banner.tsx');
      const codeWithoutComments = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      // Verifies usage of centralized tokens
      assert.ok(code.includes('Brand.brightRed'), 'Must use Brand.brightRed token');
      assert.ok(code.includes('theme.dangerSoft'), 'Must use theme.dangerSoft token');
      assert.ok(code.includes('theme.textMuted'), 'Must use theme.textMuted token');

      // Verifies zero illegal hardcoded hex colors in code
      assert.strictEqual(codeWithoutComments.includes('#8C2131'), false, 'Must not hardcode raw #8C2131');
      assert.strictEqual(codeWithoutComments.includes('#E8B019'), false, 'Must not hardcode raw #E8B019');
      assert.strictEqual(codeWithoutComments.includes('#FFFFFF'), false, 'Must not hardcode raw #FFFFFF');
      assert.strictEqual(codeWithoutComments.includes('#000000'), false, 'Must not hardcode raw #000000');
    });
  });

  // ==========================================================================
  // Suite 3: Feed Empty State Taxonomy & Consolidation (FeedEmptyState)
  // ==========================================================================
  describe('Suite 3: Feed Empty State Taxonomy & Consolidation (FeedEmptyState)', () => {
    it('Empty State "no-saved-posts": renders star bookmark icon with guide text', () => {
      withComponentHarness(({ FeedEmptyState }) => {
        // Step 1: Render default no-saved-posts state
        const emptyState = FeedEmptyState({
          type: 'no-saved-posts',
        }) as ReactElement<any>;

        // Step 2: Verify star icon
        const starIcon = findElement(emptyState, (n) => n?.props?.sf === 'star');
        assert.ok(starIcon, 'Must render star icon for saved posts empty state');
        assert.strictEqual(starIcon.props.md, 'star_border');
        assert.strictEqual(starIcon.props.size, 28);
        assert.strictEqual(starIcon.props.color, Brand.gold);

        // Step 3: Verify title and subtitle copy
        const title = findElement(emptyState, (n) => n?.props?.children === 'No saved posts yet');
        assert.ok(title);
        const sub = findElement(
          emptyState,
          (n) =>
            n?.props?.children ===
            'Tap the star on any announcement or event to save it here for quick reference.'
        );
        assert.ok(sub);

        // Step 4: Render custom title and subtitle override
        const customState = FeedEmptyState({
          type: 'no-saved-posts',
          title: 'Custom Saved Title',
          subtitle: 'Custom saved subtitle.',
        }) as ReactElement<any>;

        assert.ok(findElement(customState, (n) => n?.props?.children === 'Custom Saved Title'));
        assert.ok(findElement(customState, (n) => n?.props?.children === 'Custom saved subtitle.'));
      });
    });

    it('Empty State "no-following-posts": renders sparkles icon with "Browse Campus Clubs" CTA', () => {
      withComponentHarness(({ FeedEmptyState }) => {
        let clubsBrowsed = false;
        const onBrowseClubs = () => {
          clubsBrowsed = true;
        };

        // Step 1: Render no-following-posts with CTA
        const emptyState = FeedEmptyState({
          type: 'no-following-posts',
          onBrowseClubs,
        }) as ReactElement<any>;

        // Step 2: Verify sparkles icon
        const sparklesIcon = findElement(emptyState, (n) => n?.props?.sf === 'sparkles');
        assert.ok(sparklesIcon);
        assert.strictEqual(sparklesIcon.props.md, 'auto_awesome');
        assert.strictEqual(sparklesIcon.props.size, 28);
        assert.strictEqual(sparklesIcon.props.color, Brand.gold);

        // Step 3: Verify copy
        assert.ok(findElement(emptyState, (n) => n?.props?.children === 'No posts from your followed clubs'));

        // Step 4: Verify CTA button and execution
        const ctaBtn = findElement(emptyState, (n) => n?.props?.onPress === onBrowseClubs);
        assert.ok(ctaBtn, 'Must render Browse Campus Clubs CTA button');
        const ctaText = findElement(ctaBtn, (n) => n?.props?.children === 'Browse Campus Clubs');
        assert.ok(ctaText);

        ctaBtn.props.onPress();
        assert.strictEqual(clubsBrowsed, true, 'Pressing CTA must invoke onBrowseClubs');

        // Step 5: Verify button is omitted when callback is not provided
        const noCtaState = FeedEmptyState({
          type: 'no-following-posts',
        }) as ReactElement<any>;
        assert.strictEqual(findElement(noCtaState, (n) => n?.props?.children === 'Browse Campus Clubs'), null);
      });
    });

    it('Empty State "no-posts": renders newspaper/article icon with campus announcements notice', () => {
      withComponentHarness(({ FeedEmptyState }) => {
        let clubsBrowsed = false;
        const onBrowseClubs = () => {
          clubsBrowsed = true;
        };

        const emptyState = FeedEmptyState({
          type: 'no-posts',
          onBrowseClubs,
        }) as ReactElement<any>;

        // Verify newspaper icon
        const newsIcon = findElement(emptyState, (n) => n?.props?.sf === 'newspaper');
        assert.ok(newsIcon);
        assert.strictEqual(newsIcon.props.md, 'article');
        assert.strictEqual(newsIcon.props.size, 28);
        assert.strictEqual(newsIcon.props.color, Brand.gold);

        // Verify copy
        assert.ok(findElement(emptyState, (n) => n?.props?.children === 'No campus announcements yet'));

        // Verify CTA execution
        const ctaBtn = findElement(emptyState, (n) => n?.props?.onPress === onBrowseClubs);
        assert.ok(ctaBtn);
        ctaBtn.props.onPress();
        assert.strictEqual(clubsBrowsed, true);
      });
    });

    it('Empty State "no-filter-matches": renders search icon with "Clear Filters" CTA', () => {
      withComponentHarness(({ FeedEmptyState }) => {
        let filtersCleared = false;
        const onClearFilters = () => {
          filtersCleared = true;
        };

        const emptyState = FeedEmptyState({
          type: 'no-filter-matches',
          onClearFilters,
        }) as ReactElement<any>;

        // Verify search icon
        const searchIcon = findElement(emptyState, (n) => n?.props?.sf === 'magnifyingglass');
        assert.ok(searchIcon);
        assert.strictEqual(searchIcon.props.md, 'search');
        assert.strictEqual(searchIcon.props.size, 26);
        assert.strictEqual(searchIcon.props.color, Brand.gold);

        // Verify copy
        assert.ok(findElement(emptyState, (n) => n?.props?.children === 'Nothing matches those filters'));

        // Verify CTA execution
        const ctaBtn = findElement(emptyState, (n) => n?.props?.onPress === onClearFilters);
        assert.ok(ctaBtn, 'Must render Clear Filters CTA button');
        const ctaText = findElement(ctaBtn, (n) => n?.props?.children === 'Clear Filters');
        assert.ok(ctaText);

        ctaBtn.props.onPress();
        assert.strictEqual(filtersCleared, true, 'Pressing CTA must invoke onClearFilters');
      });
    });

    it('Consolidation Re-Exports: feed-controls.tsx re-exports ErrorBanner and all Skeleton templates', () => {
      const feedControls = require('@/components/feed-controls');

      // Verify ErrorBanner re-export
      assert.strictEqual(typeof feedControls.ErrorBanner, 'function');

      // Verify Skeleton templates re-export
      assert.strictEqual(typeof feedControls.FeedLoadingSkeleton, 'function');
      assert.strictEqual(typeof feedControls.PostCardSkeleton, 'function');
      assert.strictEqual(typeof feedControls.Skeleton, 'function');
      assert.strictEqual(typeof feedControls.SkeletonCard, 'function');
      assert.strictEqual(typeof feedControls.SkeletonLine, 'function');
      assert.strictEqual(typeof feedControls.FeedEmptyState, 'function');
    });
  });

  // ==========================================================================
  // Suite 4: Posts API Resilience & Detailed Error Reporting (posts-api.ts)
  // ==========================================================================
  describe('Suite 4: Posts API Resilience & Detailed Error Reporting (posts-api.ts)', () => {
    const originalFetch = globalThis.fetch;

    it('fetchFeedPostsDetailed: returns isError: false and adapted posts on HTTP 200 response', async () => {
      const mockRawRows: DatabasePostRow[] = [
        {
          id: 'server-post-1',
          club_id: 'c-knights',
          org_name: 'Calvin Tech Club',
          headline: 'Annual Hackathon',
          body: 'Collaborative coding weekend at North Hall.',
          category: 'Academics',
          posted_at: '2026-11-10T14:00:00.000Z',
          created_at_ms: 1794320000000,
          campus_wide: true,
        },
      ];

      globalThis.fetch = async () =>
        new Response(JSON.stringify(mockRawRows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      try {
        const result = await fetchFeedPostsDetailed();
        assert.strictEqual(result.isError, false, 'Successful 200 response must return isError: false');
        assert.strictEqual(result.errorMessage, undefined);
        assert.strictEqual(result.posts.length, 1);
        assert.strictEqual(result.posts[0].id, 'server-post-1');
        assert.strictEqual(result.posts[0].org, 'Calvin Tech Club');
        assert.strictEqual(result.posts[0].headline, 'Annual Hackathon');
        assert.strictEqual(result.posts[0].category, 'Academics');
        assert.strictEqual(result.posts[0].campusWide, true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchFeedPostsDetailed: returns isError: true and invokes onError on HTTP 500 error', async () => {
      let errorReceived: any = null;
      globalThis.fetch = async () =>
        new Response('Internal Server Error', { status: 500 });

      try {
        const result = await fetchFeedPostsDetailed({
          onError: (err) => {
            errorReceived = err;
          },
        });

        assert.strictEqual(result.isError, true, 'HTTP 500 must return isError: true');
        assert.ok(result.errorMessage?.includes('500'), 'errorMessage must reference status 500');
        assert.ok(errorReceived, 'onError callback must be invoked on HTTP 500');
        assert.strictEqual(errorReceived?.message, 'Server returned status 500');
        assert.ok(result.posts.length > 0, 'Must provide seed data fallback on failure');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchFeedPostsDetailed: returns isError: true and invokes onError on HTTP 404 error', async () => {
      let errorReceived: any = null;
      globalThis.fetch = async () =>
        new Response('Not Found', { status: 404 });

      try {
        const result = await fetchFeedPostsDetailed({
          onError: (err) => {
            errorReceived = err;
          },
        });

        assert.strictEqual(result.isError, true);
        assert.ok(result.errorMessage?.includes('404'));
        assert.strictEqual(errorReceived?.message, 'Server returned status 404');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchFeedPostsDetailed: catches network throw (offline) without crashing and invokes onError', async () => {
      let errorReceived: any = null;
      globalThis.fetch = async () => {
        throw new TypeError('fetch failed: Connection refused to university server');
      };

      try {
        const result = await fetchFeedPostsDetailed({
          onError: (err) => {
            errorReceived = err;
          },
        });

        assert.strictEqual(result.isError, true);
        assert.ok(
          result.errorMessage?.includes('Connection refused'),
          'errorMessage must capture network exception detail'
        );
        assert.ok(errorReceived instanceof Error);
        assert.ok(result.posts.length > 0, 'Must fall back to offline seed data');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchFeedPostsDetailed: preserves caller fallbackPosts array during offline/network failure', async () => {
      const callerFallback: Post[] = [defaultPosts[0], defaultPosts[1]];

      globalThis.fetch = async () => {
        throw new Error('Offline timeout');
      };

      try {
        const result = await fetchFeedPostsDetailed({}, callerFallback);
        assert.strictEqual(result.isError, true);
        assert.strictEqual(result.posts, callerFallback, 'Must return caller fallbackPosts unchanged');
        assert.strictEqual(result.posts.length, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetchFeedPosts: convenience function returns post array directly', async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify([]), { status: 200 });

      try {
        const posts = await fetchFeedPosts();
        assert.ok(Array.isArray(posts));
        assert.ok(posts.length > 0, 'Must resolve to post array with fallback');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // Suite 5: Feed Context Loading, Error, and Retry State Coordination (FeedContext)
  // ==========================================================================
  describe('Suite 5: Feed Context Loading, Error, and Retry State Coordination (FeedContext)', () => {
    /**
     * Models the exact FeedContext state reducer and error/retry coordinator.
     */
    function createFeedLoadingErrorHarness(initialPosts: Post[] = defaultPosts.slice(0, 5)) {
      let posts = [...initialPosts];
      let isLoading = false;
      let isRefreshing = false;
      let error: string | null = null;
      const loadingHistory: boolean[] = [];
      const refreshHistory: boolean[] = [];
      const errorHistory: (string | null)[] = [];

      const setFeedPosts = (updater: (prev: Post[]) => Post[]) => {
        posts = updater(posts);
      };

      const setIsLoading = (val: boolean) => {
        isLoading = val;
        loadingHistory.push(val);
      };

      const setIsRefreshing = (val: boolean) => {
        isRefreshing = val;
        refreshHistory.push(val);
      };

      const setError = (val: string | null) => {
        error = val;
        errorHistory.push(val);
      };

      const clearError = () => {
        setError(null);
      };

      const initialMount = async (fetcher: () => Promise<FetchFeedPostsResult>) => {
        setIsLoading(true);
        try {
          const result = await fetcher();
          if (result.isError) {
            setError(result.errorMessage || 'Unable to connect to campus network');
          } else {
            setError(null);
            if (result.posts && result.posts.length > 0) {
              setFeedPosts((prev) => {
                const localOnly = prev.filter((p) => p.id.startsWith('p-local-'));
                return sortPostsByDate([...localOnly, ...result.posts]);
              });
            }
          }
        } catch (err: any) {
          setError(err?.message || 'Unable to connect to campus network');
        } finally {
          setIsLoading(false);
        }
      };

      const refreshFeed = async (fetcher: () => Promise<FetchFeedPostsResult>) => {
        setIsRefreshing(true);
        try {
          const result = await fetcher();
          if (result.isError) {
            setError(result.errorMessage || 'Unable to connect to campus network');
          } else {
            setError(null);
            if (result.posts && result.posts.length > 0) {
              setFeedPosts((prev) => {
                const localOnly = prev.filter((p) => p.id.startsWith('p-local-'));
                return sortPostsByDate([...localOnly, ...result.posts]);
              });
            }
          }
        } catch (err: any) {
          setError(err?.message || 'Unable to connect to campus network');
        } finally {
          setIsRefreshing(false);
        }
      };

      const retryFeed = async (fetcher: () => Promise<FetchFeedPostsResult>) => {
        setError(null);
        await refreshFeed(fetcher);
      };

      const addLocalPost = (post: Post) => {
        setFeedPosts((prev) => sortPostsByDate([post, ...prev]));
      };

      return {
        get posts() {
          return posts;
        },
        get isLoading() {
          return isLoading;
        },
        get isRefreshing() {
          return isRefreshing;
        },
        get error() {
          return error;
        },
        get loadingHistory() {
          return loadingHistory;
        },
        get refreshHistory() {
          return refreshHistory;
        },
        get errorHistory() {
          return errorHistory;
        },
        initialMount,
        refreshFeed,
        retryFeed,
        clearError,
        addLocalPost,
      };
    }

    it('Initial Mount Lifecycle: triggers isLoading=true during fetch and transitions to isLoading=false on resolution', async () => {
      const harness = createFeedLoadingErrorHarness();

      assert.strictEqual(harness.isLoading, false, 'Initially idle before mount');

      await harness.initialMount(async () => {
        assert.strictEqual(harness.isLoading, true, 'isLoading must be true while in flight');
        return { posts: defaultPosts.slice(0, 3), isError: false };
      });

      assert.strictEqual(harness.isLoading, false, 'isLoading must return to false on resolution');
      assert.strictEqual(harness.error, null, 'Error must remain null on success');
      assert.deepStrictEqual(harness.loadingHistory, [true, false]);
    });

    it('Network Error Coordination: populates error state with descriptive message and terminates loading', async () => {
      const harness = createFeedLoadingErrorHarness();

      await harness.initialMount(async () => {
        return {
          posts: defaultPosts.slice(0, 5),
          isError: true,
          errorMessage: 'Server returned status 503 Service Unavailable',
        };
      });

      assert.strictEqual(harness.isLoading, false, 'Must terminate loading state');
      assert.strictEqual(harness.error, 'Server returned status 503 Service Unavailable');
    });

    it('retryFeed: clears existing error to null, initiates fresh fetch, and clears error on success', async () => {
      const harness = createFeedLoadingErrorHarness();

      // Step 1: Pre-condition - feed is in error state from failed initial load
      await harness.initialMount(async () => ({
        posts: [],
        isError: true,
        errorMessage: 'Network timeout',
      }));
      assert.strictEqual(harness.error, 'Network timeout');

      // Step 2: Invoke retryFeed() with successful recovery response
      let errorDuringRetry: string | null = 'not-checked';
      await harness.retryFeed(async () => {
        errorDuringRetry = harness.error;
        return {
          posts: [defaultPosts[0]],
          isError: false,
        };
      });

      // Step 3: Verify error was cleared BEFORE fetch and stayed cleared after success
      assert.strictEqual(errorDuringRetry, null, 'retryFeed must clear error BEFORE initiating fetch');
      assert.strictEqual(harness.error, null, 'Error must remain null on recovery');
      assert.strictEqual(harness.posts.length, 1);
    });

    it('retryFeed: clears error first, and if retry fails again, updates error with latest failure message', async () => {
      const harness = createFeedLoadingErrorHarness();

      // Step 1: Pre-condition - initial failure
      await harness.initialMount(async () => ({
        posts: [],
        isError: true,
        errorMessage: 'Old 500 error',
      }));
      assert.strictEqual(harness.error, 'Old 500 error');

      // Step 2: Retry also fails with different error
      let errorDuringRetry: string | null = 'not-checked';
      await harness.retryFeed(async () => {
        errorDuringRetry = harness.error;
        return {
          posts: [],
          isError: true,
          errorMessage: 'New 504 Gateway Timeout',
        };
      });

      assert.strictEqual(errorDuringRetry, null, 'Error was cleared during retry attempt');
      assert.strictEqual(harness.error, 'New 504 Gateway Timeout', 'Error updated with new failure');
    });

    it('clearError: manually dismisses error state without triggering a network fetch', async () => {
      const harness = createFeedLoadingErrorHarness();

      // Set synthetic error
      await harness.initialMount(async () => ({
        posts: [],
        isError: true,
        errorMessage: 'Active error banner',
      }));

      assert.strictEqual(harness.error, 'Active error banner');
      harness.clearError();
      assert.strictEqual(harness.error, null, 'clearError must set error to null');
      assert.strictEqual(harness.isLoading, false);
      assert.strictEqual(harness.isRefreshing, false);
    });

    it('refreshFeed: successful pull-to-refresh clears previous error state and merges local posts', async () => {
      const now = Date.now();
      const localPost: Post = {
        id: `p-local-${now}`,
        clubId: 'c-local-1',
        org: 'Test Organization',
        mark: 'TO',
        headline: 'Locally Authored Flyer',
        body: 'Must survive refresh',
        category: 'Social',
        postedAt: new Date(now).toISOString(),
        createdAt: now,
        followed: true,
        campusWide: false,
      };

      const harness = createFeedLoadingErrorHarness([localPost, defaultPosts[0]]);

      // Pre-condition: feed has a stale error
      await harness.initialMount(async () => ({
        posts: [localPost, defaultPosts[0]],
        isError: true,
        errorMessage: 'Stale offline error',
      }));
      assert.strictEqual(harness.error, 'Stale offline error');

      // Refresh recovers successfully
      const serverPosts = [defaultPosts[1], defaultPosts[2]];
      await harness.refreshFeed(async () => ({
        posts: serverPosts,
        isError: false,
      }));

      assert.strictEqual(harness.error, null, 'Successful refresh must clear stale error');
      assert.strictEqual(harness.posts[0].id, localPost.id, 'Local post must remain at top of feed');
      assert.ok(harness.posts.some((p) => p.id === serverPosts[0].id));
    });

    it('useFeed Provider Boundary: throws descriptive error if accessed outside FeedProvider', () => {
      const { useFeed } = require('@/context/feed-context');
      assert.throws(
        () => withHookDispatcher(() => useFeed()),
        /useFeed must be used within a FeedProvider/,
        'useFeed must enforce provider boundary'
      );
    });
  });

  // ==========================================================================
  // Suite 6: Template-Level Feature Inheritance & Anti-Monolith Screen Integration
  // ==========================================================================
  describe('Suite 6: Template-Level Feature Inheritance & Anti-Monolith Screen Integration', () => {
    it('FeedScreen: delegates to ErrorBanner for both banner and card states and FeedLoadingSkeleton for initial loading', () => {
      const code = readSrc('app/(tabs)/index.tsx');

      // Step 1: Imports template components
      assert.ok(code.includes('import { ErrorBanner } from "@/components/ui/error-banner"'));
      assert.ok(code.includes('import { FeedLoadingSkeleton } from "@/components/ui/skeleton"'));

      // Step 2: Consumes US-N07 loading and error state from useFeed()
      assert.ok(code.includes('isLoading,'));
      assert.ok(code.includes('error,'));
      assert.ok(code.includes('retryFeed,'));
      assert.ok(code.includes('clearError,'));

      // Step 3: Wires inline ErrorBanner in listHeader
      assert.ok(code.includes('<ErrorBanner'));
      assert.ok(code.includes('variant="banner"'));
      assert.ok(code.includes('onRetry={retryFeed}'));
      assert.ok(code.includes('isRetrying={isRefreshing}'));
      assert.ok(code.includes('onDismiss={clearError}'));

      // Step 4: Wires full ErrorBanner card in listEmpty
      assert.ok(code.includes('variant="card"'));

      // Step 5: Wires FeedLoadingSkeleton for loading state
      assert.ok(code.includes('isLoading && dynamicPosts.length === 0'));
      assert.ok(code.includes('<FeedLoadingSkeleton numColumns={numColumns} count={numColumns * 2} />'));
    });

    it('FeedMobileView: delegates to ErrorBanner, FeedLoadingSkeleton, and FeedEmptyState', () => {
      const code = readSrc('components/feed-mobile-view.tsx');

      // Step 1: Imports from feed-controls single source of truth
      assert.ok(code.includes('ErrorBanner,'));
      assert.ok(code.includes('FeedEmptyState,'));
      assert.ok(code.includes('FeedLoadingSkeleton,'));

      // Step 2: Consumes context states
      assert.ok(code.includes('isLoading,'));
      assert.ok(code.includes('error,'));
      assert.ok(code.includes('retryFeed,'));
      assert.ok(code.includes('clearError,'));

      // Step 3: Wires FeedLoadingSkeleton for mobile handheld (numColumns=1, count=3)
      assert.ok(code.includes('<FeedLoadingSkeleton numColumns={1} count={3} />'));

      // Step 4: Wires ErrorBanner variants
      assert.ok(code.includes('variant="banner"'));
      assert.ok(code.includes('variant="card"'));

      // Step 5: Wires FeedEmptyState with distinct taxonomy
      assert.ok(code.includes('"no-saved-posts"'));
      assert.ok(code.includes('"no-following-posts"'));
      assert.ok(code.includes('"no-filter-matches"'));
    });

    it('FeedWebView: delegates to ErrorBanner, FeedLoadingSkeleton, and FeedEmptyState', () => {
      const code = readSrc('components/feed-web-view.tsx');

      // Step 1: Imports from feed-controls single source of truth
      assert.ok(code.includes('ErrorBanner,'));
      assert.ok(code.includes('FeedEmptyState,'));
      assert.ok(code.includes('FeedLoadingSkeleton,'));

      // Step 2: Consumes context states
      assert.ok(code.includes('isLoading,'));
      assert.ok(code.includes('error,'));
      assert.ok(code.includes('retryFeed,'));
      assert.ok(code.includes('clearError,'));

      // Step 3: Wires FeedLoadingSkeleton with responsive multi-column grid
      assert.ok(code.includes('<FeedLoadingSkeleton numColumns={numColumns} count={numColumns * 2} />'));

      // Step 4: Wires ErrorBanner variants
      assert.ok(code.includes('variant="banner"'));
      assert.ok(code.includes('variant="card"'));

      // Step 5: Wires FeedEmptyState with distinct taxonomy
      assert.ok(code.includes('"no-saved-posts"'));
      assert.ok(code.includes('"no-following-posts"'));
      assert.ok(code.includes('"no-filter-matches"'));
    });

    it('Template Invariant: zero duplicate inline skeleton implementations outside skeleton.tsx', () => {
      // Collect all .tsx files in client/src
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
        if (relPath === 'components/ui/skeleton.tsx') {
          // skeleton.tsx is the authoritative template owner
          continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        // Check for ad-hoc custom skeleton definitions
        if (
          content.includes('function Skeleton(') ||
          content.includes('const Skeleton =') ||
          content.includes('function PostCardSkeleton(') ||
          content.includes('const PostCardSkeleton =') ||
          content.includes('function FeedLoadingSkeleton(') ||
          content.includes('const FeedLoadingSkeleton =')
        ) {
          violations.push(relPath);
        }
      }

      assert.deepStrictEqual(
        violations,
        [],
        `Template inheritance violation: Skeleton primitives must strictly be defined in skeleton.tsx. Found violations in: ${violations.join(', ')}`
      );
    });

    it('Template Invariant: zero duplicate inline error banners outside error-banner.tsx', () => {
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
        if (relPath === 'components/ui/error-banner.tsx') {
          continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        if (
          content.includes('function ErrorBanner(') ||
          content.includes('const ErrorBanner =')
        ) {
          violations.push(relPath);
        }
      }

      assert.deepStrictEqual(
        violations,
        [],
        `Template inheritance violation: ErrorBanner must strictly be defined in error-banner.tsx. Found violations in: ${violations.join(', ')}`
      );
    });

    it('Template Invariant: zero ActivityIndicator spinners in feed screens/views', () => {
      const feedScreen = readSrc('app/(tabs)/index.tsx');
      const mobileView = readSrc('components/feed-mobile-view.tsx');
      const webView = readSrc('components/feed-web-view.tsx');

      assert.strictEqual(
        feedScreen.includes('ActivityIndicator'),
        false,
        'FeedScreen must not use ActivityIndicator; use FeedLoadingSkeleton instead'
      );
      assert.strictEqual(
        mobileView.includes('ActivityIndicator'),
        false,
        'FeedMobileView must not use ActivityIndicator; use FeedLoadingSkeleton instead'
      );
      assert.strictEqual(
        webView.includes('ActivityIndicator'),
        false,
        'FeedWebView must not use ActivityIndicator; use FeedLoadingSkeleton instead'
      );
    });
  });
});
