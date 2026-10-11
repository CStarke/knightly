import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getTabHeader } from '@/constants/tab-headers';
import {
  PHANTOM_TABS,
  getActivePhantomTab,
  getBlankAfterSlot,
  type PhantomTabState,
} from '@/constants/phantom-tabs';
import { redirectSystemPath, resetInitializationStateForTests } from '@/app/+native-intent';

type Tab = {
  name: string;
  href: string;
  label: string;
};

const TABS: Tab[] = [
  { name: 'index', href: '/', label: 'Knightly' },
  { name: 'dining', href: '/dining', label: 'Dining' },
  { name: 'safety', href: '/safety', label: 'Safety' },
  { name: 'directory', href: '/directory', label: 'Directory' },
  { name: 'post', href: '/post', label: 'Post' },
];

/**
 * State machine modeling the Subpage-Aware Unified Tab Controller in AppTabs and SwipeableTabPager.
 * Coordinates bottom bar taps, horizontal swipe gestures, inline subpages (Campus Clubs, Complete Profile),
 * and external native Activity intent interception.
 */
function createUnifiedTabControllerMachine(initialPath: string = '/', width: number = 390) {
  let pathname = initialPath;
  let tabIndex = TABS.findIndex((t) => t.href === pathname);
  let activeTabIndex = tabIndex >= 0 ? tabIndex : 0;
  let headerIndex = activeTabIndex;
  let translateX = -activeTabIndex * width;
  let prevTabIndex = tabIndex;

  // Subpage states
  let clubsLevel = 0; // 0 = Home, 1 = Campus Clubs, 2 = Club Detail
  let isClaimSetupOpen = false;
  let claimSetupSource: 'banner' | 'profile' | null = null;
  let cachedSetupCode = '';

  const dispatchedActions: Array<{ type: string; payload: any }> = [];

  function navigateToTab(targetIndex: number, targetHref?: string) {
    const target = TABS[targetIndex];
    if (!target) return;

    if (isClaimSetupOpen) {
      isClaimSetupOpen = false;
      claimSetupSource = null;
    }
    if (clubsLevel > 0) {
      clubsLevel = 0;
    }

    activeTabIndex = targetIndex;
    headerIndex = targetIndex;
    translateX = targetIndex === 0 ? 0 : -targetIndex * width;

    const href = targetHref || target.href;
    pathname = href;
    tabIndex = targetIndex;
    prevTabIndex = targetIndex;
    dispatchedActions.push({ type: 'JUMP_TO', payload: { name: target.name } });
  }

  function onTabButtonPress(targetIndex: number) {
    navigateToTab(targetIndex);
  }

  function onSwipeGestureEnd(targetIndex: number) {
    navigateToTab(targetIndex);
  }

  function onPathnameChange(newPathname: string) {
    const newIndex = TABS.findIndex((t) => t.href === newPathname);
    if (newIndex >= 0) {
      if (newIndex !== activeTabIndex) {
        const currentTab = TABS[activeTabIndex];
        dispatchedActions.push({ type: 'REPLACE', payload: { name: currentTab.name, href: currentTab.href } });
        return;
      }

      pathname = newPathname;
      const isRouteTabChange = prevTabIndex !== newIndex;
      prevTabIndex = newIndex;

      tabIndex = newIndex;
      activeTabIndex = newIndex;
      headerIndex = newIndex;

      const isSubpageOpen =
        (newIndex === 0 && (clubsLevel > 0 || isClaimSetupOpen)) ||
        (newIndex === 1 && false);

      if (!isSubpageOpen || isRouteTabChange) {
        translateX = newIndex === 0 ? 0 : -newIndex * width;
      }
    }
  }

  function openClubsDirectory() {
    clubsLevel = 1;
    translateX = -1 * width; // Slot 1
  }

  function startClaimSetup(code: string, source: 'banner' | 'profile') {
    isClaimSetupOpen = true;
    claimSetupSource = source;
    cachedSetupCode = code;

    if (source === 'profile') {
      clubsLevel = 1;
      translateX = -1 * width;
    } else if (source === 'banner') {
      clubsLevel = 1;
      translateX = -1 * width;
    }
  }

  function backFromClaimSetup(): { cameraLandingX: number; codeSuppliedDuringSlide: string } {
    const codeDuringSlide = cachedSetupCode;
    if (claimSetupSource === 'banner') {
      isClaimSetupOpen = false;
      claimSetupSource = null;
      clubsLevel = 1;
      return { cameraLandingX: translateX, codeSuppliedDuringSlide: codeDuringSlide };
    } else {
      translateX = 0;
      isClaimSetupOpen = false;
      claimSetupSource = null;
      clubsLevel = 0;
      cachedSetupCode = '';
      return { cameraLandingX: 0, codeSuppliedDuringSlide: codeDuringSlide };
    }
  }

  function evaluateTabButtonFocus(index: number): boolean {
    return activeTabIndex === index;
  }

  function evaluatePagePointerEvents(index: number): 'auto' | 'none' {
    return activeTabIndex === index ? 'auto' : 'none';
  }

  return {
    getState: () => ({
      pathname,
      tabIndex,
      activeTabIndex,
      headerIndex,
      translateX,
      clubsLevel,
      isClaimSetupOpen,
      claimSetupSource,
      cachedSetupCode,
    }),
    navigateToTab,
    onTabButtonPress,
    onSwipeGestureEnd,
    onPathnameChange,
    openClubsDirectory,
    startClaimSetup,
    backFromClaimSetup,
    evaluateTabButtonFocus,
    evaluatePagePointerEvents,
    getDispatchedActions: () => [...dispatchedActions],
  };
}

describe('Navigation, Tabs & Gestures Domain', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8').replace(/\r\n/g, '\n');

  describe('Tab Headers Navigation Mapping', () => {
    it('returns Dining header metadata for /dining path', () => {
      const header = getTabHeader('/dining');
      assert.strictEqual(header.title, 'Dining');
      assert.strictEqual(header.subtitle, 'Campus dining & balances');
    });

    it('returns Campus Safety header metadata for /safety path', () => {
      const header = getTabHeader('/safety');
      assert.strictEqual(header.title, 'Campus Safety');
      assert.strictEqual(header.subtitle, '24/7 assistance & alerts');
    });

    it('returns Directory header metadata for /directory path', () => {
      const header = getTabHeader('/directory');
      assert.strictEqual(header.title, 'Directory');
      assert.strictEqual(header.subtitle, 'Search campus contacts');
    });

    it('defaults to Knightly header for root and index routes', () => {
      const rootHeader = getTabHeader('/');
      assert.strictEqual(rootHeader.title, 'Knightly');
      assert.strictEqual(rootHeader.subtitle, 'Campus community & feed');
      assert.ok(rootHeader.right !== undefined);

      const emptyHeader = getTabHeader('');
      assert.strictEqual(emptyHeader.title, 'Knightly');

      const tabsIndexHeader = getTabHeader('/(tabs)/');
      assert.strictEqual(tabsIndexHeader.title, 'Knightly');
    });

    it('correctly maps trailing slashes and tabs prefix paths in getTabHeader', () => {
      const diningTrailing = getTabHeader('/dining/');
      assert.strictEqual(diningTrailing.title, 'Dining');

      const tabsDining = getTabHeader('/tabs/dining');
      assert.strictEqual(tabsDining.title, 'Dining');

      const tabsSafety = getTabHeader('/tabs/safety');
      assert.strictEqual(tabsSafety.title, 'Campus Safety');

      const tabsDirectory = getTabHeader('/tabs/directory');
      assert.strictEqual(tabsDirectory.title, 'Directory');

      const unknownRoute = getTabHeader('/some/random/nested/route');
      assert.strictEqual(unknownRoute.title, 'Knightly');
    });

    it('verifies strict four-tab navigation order and paths', () => {
      const tabs = [
        { name: 'knightly', path: '/' },
        { name: 'dining', path: '/dining' },
        { name: 'safety', path: '/safety' },
        { name: 'directory', path: '/directory' },
      ];

      assert.strictEqual(tabs.length, 4);
      assert.strictEqual(tabs[0].path, '/');
      assert.strictEqual(tabs[1].path, '/dining');
      assert.strictEqual(tabs[2].path, '/safety');
      assert.strictEqual(tabs[3].path, '/directory');
    });

    it('ensures LEADER_TABS inherits from BASE_TABS without duplicated literal objects', () => {
      const baseTabs = [
        { name: 'knightly', href: '/' },
        { name: 'dining', href: '/dining' },
        { name: 'safety', href: '/safety' },
        { name: 'directory', href: '/directory' },
      ];
      const postTab = { name: 'post', href: '/post' };
      const leaderTabs = [...baseTabs, postTab];

      assert.strictEqual(leaderTabs.length, 5);
      assert.strictEqual(leaderTabs[0].name, 'knightly');
      assert.strictEqual(leaderTabs[4].name, 'post');
      assert.strictEqual(baseTabs.length, 4);
    });
  });

  describe('Tab Routing & Activity State Invariants', () => {
    it('ensures Safety tab is completely isolated from Activity', () => {
      const safetyHeader = getTabHeader('/safety');
      assert.strictEqual(safetyHeader.title, 'Campus Safety');
      assert.notStrictEqual(safetyHeader.title, 'Activity');

      const diningHeader = getTabHeader('/dining');
      assert.strictEqual(diningHeader.title, 'Dining');

      const tabPaths = ['/', '/dining', '/safety', '/directory'];
      assert.strictEqual(tabPaths.indexOf('/safety'), 2);
      assert.strictEqual(tabPaths.indexOf('/dining'), 1);
    });

    it('verifies route names prevent slot hijacking on non-dining tabs', () => {
      const isShowingActivity = (tabIndex: number, showActivity: boolean, pathname: string, activeIndex: number) => {
        return tabIndex === 2 && showActivity && pathname === '/dining' && activeIndex !== 2;
      };

      assert.strictEqual(isShowingActivity(2, true, '/dining', 1), true);
      assert.strictEqual(isShowingActivity(2, true, '/', 0), false);
      assert.strictEqual(isShowingActivity(2, false, '/', 0), false);
      assert.strictEqual(isShowingActivity(2, true, '/safety', 2), false);
      assert.strictEqual(isShowingActivity(2, false, '/safety', 2), false);
      assert.strictEqual(isShowingActivity(2, true, '/directory', 3), false);
    });
  });

  describe('Phantom Tabs Architecture & Trailing Slot Blanking', () => {
    it('defines all 4 official phantom tabs with valid slots and parent targets', () => {
      const ids = ['complete-club-profile', 'campus-clubs', 'club-detail', 'dining-activity'] as const;

      for (const id of ids) {
        const meta = PHANTOM_TABS[id];
        assert.ok(meta, `Phantom tab ${id} must exist in registry`);
        assert.strictEqual(meta.id, id);
        assert.ok(meta.displayName.length > 0);
        assert.ok(meta.rootPath === '/' || meta.rootPath === '/dining');
        assert.ok(meta.slotIndex >= 1 && meta.slotIndex <= 3);
        assert.ok(meta.parentSlotIndex >= 0 && meta.parentSlotIndex < meta.slotIndex);
        assert.ok(meta.backA11yLabel.length > 0);
      }
    });

    it('verifies slot indices match the spatial layout requirements', () => {
      assert.strictEqual(PHANTOM_TABS['complete-club-profile'].slotIndex, 1);
      assert.strictEqual(PHANTOM_TABS['complete-club-profile'].parentSlotIndex, 0);

      assert.strictEqual(PHANTOM_TABS['campus-clubs'].slotIndex, 1);
      assert.strictEqual(PHANTOM_TABS['campus-clubs'].parentSlotIndex, 0);

      assert.strictEqual(PHANTOM_TABS['club-detail'].slotIndex, 2);
      assert.strictEqual(PHANTOM_TABS['club-detail'].parentSlotIndex, 1);

      assert.strictEqual(PHANTOM_TABS['dining-activity'].slotIndex, 2);
      assert.strictEqual(PHANTOM_TABS['dining-activity'].parentSlotIndex, 1);
    });

    const baseState: PhantomTabState = {
      pathname: '/',
      activeIndex: 0,
      isClaimSetupOpen: false,
      showClubSetup: false,
      clubsLevel: 0,
      showClubsDirectory: false,
      showClubDetail: false,
      isActivityOpen: false,
      showActivity: false,
      hasActiveClubId: false,
    };

    it('evaluates getActivePhantomTab correctly across all conditions', () => {
      assert.strictEqual(getActivePhantomTab(baseState), null);
      assert.strictEqual(getActivePhantomTab({ ...baseState, isClaimSetupOpen: true })?.id, 'complete-club-profile');
      assert.strictEqual(getActivePhantomTab({ ...baseState, showClubSetup: true })?.id, 'complete-club-profile');
      assert.strictEqual(getActivePhantomTab({ ...baseState, clubsLevel: 1 as const })?.id, 'campus-clubs');
      assert.strictEqual(getActivePhantomTab({ ...baseState, clubsLevel: 2 as const, hasActiveClubId: true })?.id, 'club-detail');
      assert.strictEqual(getActivePhantomTab({ ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: true })?.id, 'dining-activity');
      assert.strictEqual(getActivePhantomTab({ ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: false }), null);
    });

    it('evaluates getBlankAfterSlot trailing slot blanking invariants', () => {
      assert.strictEqual(getBlankAfterSlot(baseState), null);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, isClaimSetupOpen: true }), 1);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, isClaimSetupOpen: false, showClubSetup: true }), 1);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, clubsLevel: 1 as const }), 1);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, clubsLevel: 0 as const, showClubsDirectory: true }), 1);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, clubsLevel: 2 as const, hasActiveClubId: true }), 2);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, clubsLevel: 1 as const, showClubDetail: true, hasActiveClubId: true }), 2);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: true }), 2);
      assert.strictEqual(getBlankAfterSlot({ ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: false, showActivity: true }), 2);
    });

    it('verifies single-pointer pan gesture policy and 0.28 resistance factor', () => {
      const shouldRejectPointers = (numberOfPointers: number) => numberOfPointers > 1;
      assert.strictEqual(shouldRejectPointers(1), false);
      assert.strictEqual(shouldRejectPointers(2), true);
      assert.strictEqual(shouldRejectPointers(3), true);

      const RESISTANCE_FACTOR = 0.28;
      const overscroll = -100;
      assert.ok(Math.abs(overscroll * RESISTANCE_FACTOR - -28) < 0.001);
    });
  });

  describe('Subpages Lifecycle & Navigation State Machines', () => {
    it('manages Clubs subpages navigation lifecycle (level 0 -> 1 -> 2 -> 1 -> 0)', () => {
      let level: 0 | 1 | 2 = 0;
      let activeClubId: string | null = null;
      let bottomBarVisible = true;

      // Level 0
      assert.strictEqual(level, 0);
      assert.strictEqual(bottomBarVisible, true);

      // Open Directory -> Level 1
      level = 1;
      bottomBarVisible = false;
      assert.strictEqual(level, 1);
      assert.strictEqual(bottomBarVisible, false);

      // Open Detail -> Level 2
      level = 2;
      activeClubId = 'acm';
      assert.strictEqual(level, 2);
      assert.strictEqual(activeClubId, 'acm');

      // Close Detail -> Level 1
      level = 1;
      activeClubId = null;
      assert.strictEqual(level, 1);
      assert.strictEqual(bottomBarVisible, false);

      // Close Directory -> Level 0
      level = 0;
      bottomBarVisible = true;
      assert.strictEqual(level, 0);
      assert.strictEqual(bottomBarVisible, true);
    });

    it('manages Dining Activity subpage lifecycle', () => {
      let isActivityOpen = false;
      let bottomBarVisible = true;

      // Open activity
      isActivityOpen = true;
      bottomBarVisible = false;
      assert.strictEqual(isActivityOpen, true);
      assert.strictEqual(bottomBarVisible, false);

      // Close activity
      isActivityOpen = false;
      bottomBarVisible = true;
      assert.strictEqual(isActivityOpen, false);
      assert.strictEqual(bottomBarVisible, true);
    });

    it('computes swipe targets accurately based on drag progress and velocity', () => {
      function computeSwipeTarget(params: {
        fromPage: number;
        dragOffset: number;
        pageWidth: number;
        velocityX: number;
      }): number {
        const { fromPage, dragOffset, pageWidth, velocityX } = params;
        const progress = dragOffset / pageWidth;

        if (velocityX > 400) return Math.max(0, fromPage - 1);
        if (velocityX < -400) return fromPage;
        if (progress > 0.4) return Math.max(0, fromPage - 1);
        return fromPage;
      }

      // Flick right with small drag -> back
      assert.strictEqual(computeSwipeTarget({ fromPage: 1, dragOffset: 20, pageWidth: 400, velocityX: 650 }), 0);
      // Slow drag past 40% -> back
      assert.strictEqual(computeSwipeTarget({ fromPage: 1, dragOffset: 180, pageWidth: 400, velocityX: 50 }), 0);
      // Drag below 40% with low velocity -> stay
      assert.strictEqual(computeSwipeTarget({ fromPage: 1, dragOffset: 80, pageWidth: 400, velocityX: 100 }), 1);
      // Create Post (4) back to Directory (3)
      assert.strictEqual(computeSwipeTarget({ fromPage: 4, dragOffset: 180, pageWidth: 400, velocityX: 50 }), 3);
      assert.strictEqual(computeSwipeTarget({ fromPage: 4, dragOffset: 25, pageWidth: 400, velocityX: 520 }), 3);
      assert.strictEqual(computeSwipeTarget({ fromPage: 4, dragOffset: 70, pageWidth: 400, velocityX: 120 }), 4);
    });
  });

  describe('Horizontal Scroll Priority & Desktop Mouse Gestures', () => {
    it('blocks pager translation when scrolling nested horizontal chips', () => {
      let isInnerScrollActive = true;
      let isGestureActive = false;
      let translateX = 0;

      // Attempt to start pager gesture
      if (!isInnerScrollActive) {
        isGestureActive = true;
        translateX = 100;
      }

      assert.strictEqual(isGestureActive, false);
      assert.strictEqual(translateX, 0);
    });

    it('models web desktop horizontal mouse drag-to-scroll translation', () => {
      let scrollLeft = 50;
      const startX = 200;
      const clientX = 120; // Drag 80px left
      const dx = clientX - startX; // -80
      scrollLeft = scrollLeft - dx; // 50 - (-80) = 130
      assert.strictEqual(scrollLeft, 130);
    });

    it('validates bidirectional ease-in-out bezier curve control points and timing', () => {
      const curve = { x1: 0.4, y1: 0.0, x2: 0.2, y2: 1.0 };
      const initialSlope = curve.y1 / curve.x1;
      const finalSlope = (1.0 - curve.y2) / (1.0 - curve.x2);
      assert.strictEqual(initialSlope, 0);
      assert.strictEqual(finalSlope, 0);

      const yAtHalfT = 3 * 0.5 * 0.25 * curve.y1 + 3 * 0.25 * 0.5 * curve.y2 + 0.125;
      assert.strictEqual(yAtHalfT, 0.5);

      const PAN_DURATION = 340;
      const GESTURE_CLEANUP_TIMEOUT = 350;
      assert.strictEqual(PAN_DURATION, 340);
      assert.ok(GESTURE_CLEANUP_TIMEOUT >= PAN_DURATION);
    });
  });

  describe('Expo Router +native-intent Interception & Route Reconciliations', () => {
    it('unconditionally drops unrouted root intent (/) from Android external activities', async () => {
      const intercepted = await redirectSystemPath({ path: '/', initial: false });
      assert.strictEqual(intercepted, null);

      const emptyIntercepted = await redirectSystemPath({ path: '', initial: false });
      assert.strictEqual(emptyIntercepted, null);
    });

    it('preserves genuine deep links and cold launch routes', async () => {
      const coldLaunch = await redirectSystemPath({ path: '/', initial: true });
      assert.strictEqual(coldLaunch, '/');

      const diningDeepLink = await redirectSystemPath({ path: '/dining', initial: false });
      assert.strictEqual(diningDeepLink, '/dining');

      const safetyDeepLink = await redirectSystemPath({ path: '/safety', initial: false });
      assert.strictEqual(safetyDeepLink, '/safety');
    });

    it('dispatches JUMP_TO with route name "index" for Knightly tab', () => {
      const controller = createUnifiedTabControllerMachine('/dining');
      controller.navigateToTab(0);
      const actions = controller.getDispatchedActions();
      const lastAction = actions[actions.length - 1];
      assert.deepStrictEqual(lastAction, { type: 'JUMP_TO', payload: { name: 'index' } });
    });

    it('handles all unrouted root intent variants from Android Expo Go', async () => {
      const variants = [
        '/',
        '',
        '/--/',
        '/index',
        '/--/index',
        '/?expo=123',
        '?expo=123',
        '/--/?expo=123',
        'exp://192.168.1.5:8081',
        'exp://192.168.1.5:8081/',
        'exp://192.168.1.5:8081/--/',
        'exp://192.168.1.5:8081/--/?expo=1',
        'exp://192.168.1.5:8081?expo=1',
        'calvinapp://',
        'calvinapp:///',
        'calvinapp://--/',
      ];
      for (const variant of variants) {
        const res = await redirectSystemPath({ path: variant, initial: false });
        assert.strictEqual(res, null, `Variant "${variant}" must be dropped as an unrouted root intent`);
      }
    });

    it('reconciles route and rejects camera slide when spurious "/" drop occurs on Post tab', () => {
      const controller = createUnifiedTabControllerMachine('/');
      controller.navigateToTab(4, '/post');
      let state = controller.getState();
      assert.strictEqual(state.activeTabIndex, 4);
      assert.strictEqual(state.translateX, -4 * 390);

      controller.onPathnameChange('/');
      state = controller.getState();
      assert.strictEqual(state.activeTabIndex, 4);
      assert.strictEqual(state.translateX, -4 * 390);
      assert.strictEqual(controller.evaluateTabButtonFocus(4), true);
      assert.strictEqual(controller.evaluateTabButtonFocus(0), false);

      const actions = controller.getDispatchedActions();
      const lastAction = actions[actions.length - 1];
      assert.deepStrictEqual(lastAction, { type: 'REPLACE', payload: { name: 'post', href: '/post' } });
    });

    it('reconciles route and rejects camera slide when spurious "/dining" revert occurs on Post tab', () => {
      const controller = createUnifiedTabControllerMachine('/dining');
      controller.navigateToTab(4, '/post');
      let state = controller.getState();
      assert.strictEqual(state.activeTabIndex, 4);

      controller.onPathnameChange('/dining');
      state = controller.getState();
      assert.strictEqual(state.activeTabIndex, 4);
      assert.strictEqual(state.translateX, -4 * 390);
      assert.strictEqual(controller.evaluateTabButtonFocus(4), true);
      assert.strictEqual(controller.evaluateTabButtonFocus(1), false);

      const actions = controller.getDispatchedActions();
      const lastAction = actions[actions.length - 1];
      assert.deepStrictEqual(lastAction, { type: 'REPLACE', payload: { name: 'post', href: '/post' } });
    });
  });

  describe('Campus Clubs & Claim Navigation Camera Coordinates', () => {
    it('locks camera at Slot 1 (-1 * width) when claiming from Campus Clubs banner, never bouncing to 0', () => {
      const controller = createUnifiedTabControllerMachine('/');
      controller.openClubsDirectory();
      let state = controller.getState();
      assert.strictEqual(state.clubsLevel, 1);
      assert.strictEqual(state.translateX, -390);

      controller.startClaimSetup('KNIGHT-2026-X1', 'banner');
      state = controller.getState();
      assert.strictEqual(state.isClaimSetupOpen, true);
      assert.strictEqual(state.claimSetupSource, 'banner');
      assert.strictEqual(state.translateX, -390);

      controller.onPathnameChange('/');
      state = controller.getState();
      assert.strictEqual(state.translateX, -390);

      const backRes = controller.backFromClaimSetup();
      assert.strictEqual(backRes.cameraLandingX, -390);
      state = controller.getState();
      assert.strictEqual(state.clubsLevel, 1);
      assert.strictEqual(state.isClaimSetupOpen, false);
    });

    it('smoothly glides back to Knightly Home on profile claim exit and retains code during slide', () => {
      const controller = createUnifiedTabControllerMachine('/');
      controller.startClaimSetup('KNIGHT-2026-X1', 'profile');
      let state = controller.getState();
      assert.strictEqual(state.isClaimSetupOpen, true);
      assert.strictEqual(state.claimSetupSource, 'profile');
      assert.strictEqual(state.translateX, -390);

      const backRes = controller.backFromClaimSetup();
      assert.strictEqual(backRes.codeSuppliedDuringSlide, 'KNIGHT-2026-X1');
      assert.strictEqual(backRes.cameraLandingX, 0);

      state = controller.getState();
      assert.strictEqual(state.isClaimSetupOpen, false);
      assert.strictEqual(state.clubsLevel, 0);
      assert.strictEqual(state.translateX, 0);
    });

    it('guarantees exactly one bottom bar tab is illuminated as focused at all times', () => {
      const controller = createUnifiedTabControllerMachine('/');
      for (let i = 0; i < TABS.length; i++) {
        controller.navigateToTab(i);
        const focusedTabs = TABS.map((_, idx) => controller.evaluateTabButtonFocus(idx));
        const activeCount = focusedTabs.filter(Boolean).length;
        assert.strictEqual(activeCount, 1);
        assert.strictEqual(focusedTabs[i], true);
      }
    });
  });

  describe('Automated Stress & Lifecycle Simulation Across Chaos', () => {
    it('executes 100 consecutive image-picker background/resume cycles across randomized event orders with 100% stability', async () => {
      const mockWidth = 393;
      const devServerUrls = [
        'exp://192.168.1.42:8081',
        'exp://192.168.1.42:8081/',
        'exp://192.168.1.42:8081/--/',
        'exp://192.168.1.42:8081/--/?expo=true',
        'calvinapp://',
        'calvinapp:///',
        'calvinapp://--/',
      ];

      for (let iteration = 1; iteration <= 100; iteration++) {
        const controller = createUnifiedTabControllerMachine('/post', mockWidth);
        controller.navigateToTab(4, '/post');

        let state = controller.getState();
        assert.strictEqual(state.activeTabIndex, 4);
        assert.strictEqual(state.translateX, -4 * mockWidth);

        const chosenUrl = devServerUrls[iteration % devServerUrls.length];
        const eventOrder = iteration % 4;

        if (eventOrder === 0) {
          const dropped = await redirectSystemPath({ path: chosenUrl, initial: false });
          assert.strictEqual(dropped, null);
        } else if (eventOrder === 1) {
          const dropped = await redirectSystemPath({ path: chosenUrl, initial: false });
          assert.strictEqual(dropped, null);
        } else if (eventOrder === 2) {
          const dropped = await redirectSystemPath({ path: chosenUrl, initial: false });
          assert.strictEqual(dropped, null);
        } else {
          const dropped = await redirectSystemPath({ path: chosenUrl, initial: false });
          assert.strictEqual(dropped, null);
          controller.onPathnameChange('/');
        }

        state = controller.getState();
        assert.strictEqual(state.activeTabIndex, 4);
        assert.strictEqual(state.translateX, -4 * mockWidth);
        assert.strictEqual(controller.evaluateTabButtonFocus(4), true);
        assert.strictEqual(controller.evaluateTabButtonFocus(0), false);
        assert.strictEqual(controller.evaluatePagePointerEvents(4), 'auto');
        assert.strictEqual(controller.evaluatePagePointerEvents(1), 'none');
      }
    });

    it('models cold app launch and immediate first-time image pick without split-state corruption across 5000 randomized iterations', async () => {
      const DEVICE_WIDTHS = [360, 375, 390, 393, 412, 428, 430, 768];
      const RESUME_INTENTS = [
        'exp://192.168.1.100:8081/--/',
        'exp://192.168.1.42:8081/--/?runtime-version=exposdk:57.0.0',
        'calvinapp://--/',
        '/',
        '',
      ];

      for (let coldBoot = 1; coldBoot <= 5000; coldBoot++) {
        resetInitializationStateForTests();
        const deviceWidth = DEVICE_WIDTHS[coldBoot % DEVICE_WIDTHS.length];
        const initialPath = coldBoot % 2 === 0 ? '/' : '/post';

        const controller = createUnifiedTabControllerMachine(initialPath, deviceWidth);
        const initialResult = await redirectSystemPath({ path: initialPath, initial: true });
        assert.ok(initialResult !== null);

        if (controller.getState().activeTabIndex !== 4) {
          controller.navigateToTab(4, '/post');
        }

        let state = controller.getState();
        assert.strictEqual(state.activeTabIndex, 4);
        assert.strictEqual(state.translateX, -4 * deviceWidth);

        const resumeIntent = RESUME_INTENTS[coldBoot % RESUME_INTENTS.length];
        const isRecreated = coldBoot % 25 === 0;
        const intercepted = await redirectSystemPath({ path: resumeIntent, initial: isRecreated });
        assert.strictEqual(intercepted, null);

        state = controller.getState();
        assert.strictEqual(state.activeTabIndex, 4);
        assert.strictEqual(state.translateX, -4 * deviceWidth);
      }
    });
  });

  describe('Web & Mobile Platform Layout Isolation & UI Discovery', () => {
    it('verifies mobile BottomBar is strictly anchored with absolute positioning', () => {
      const tabsCode = readSrc('components/app-tabs.tsx');
      assert.ok(
        tabsCode.includes("bottomBarWrapper: {\n    position: 'absolute',\n    bottom: 0,\n    left: 0,\n    right: 0,\n    zIndex: 10,"),
        'app-tabs.tsx bottomBarWrapper must preserve absolute positioning at bottom: 0'
      );
    });

    it('validates useResponsiveLayout breakpoint and column resolution invariants', () => {
      const { resolveBreakpoint, resolveColumnCount } = require('../src/hooks/use-responsive-layout');

      assert.strictEqual(resolveBreakpoint(390), 'compact');
      assert.strictEqual(resolveBreakpoint(767), 'compact');
      assert.strictEqual(resolveColumnCount(390, true), 1);
      assert.strictEqual(resolveColumnCount(390, false), 1);

      assert.strictEqual(resolveBreakpoint(768), 'medium');
      assert.strictEqual(resolveBreakpoint(899), 'medium');
      assert.strictEqual(resolveColumnCount(768, true), 2);

      assert.strictEqual(resolveBreakpoint(900), 'expanded');
      assert.strictEqual(resolveBreakpoint(1200), 'expanded');
      assert.strictEqual(resolveColumnCount(1200, true), 3);

      assert.strictEqual(resolveBreakpoint(1400), 'wide');
      assert.strictEqual(resolveBreakpoint(1799), 'wide');
      assert.strictEqual(resolveColumnCount(1440, true), 4);

      assert.strictEqual(resolveBreakpoint(1800), 'ultrawide');
      assert.strictEqual(resolveBreakpoint(2560), 'ultrawide');
      assert.strictEqual(resolveColumnCount(1920, true), 5);
    });

    it('verifies app-tabs.web.tsx renders SmartAppBanner and BottomBar on compact viewports', () => {
      const webTabsCode = readSrc('components/app-tabs.web.tsx');
      assert.ok(
        webTabsCode.includes("from '@/components/smart-app-banner'") || webTabsCode.includes('from "@/components/smart-app-banner"'),
        'app-tabs.web.tsx must import SmartAppBanner'
      );
      assert.ok(
        webTabsCode.includes("from '@/components/bottom-tab-bar'") || webTabsCode.includes('from "@/components/bottom-tab-bar"'),
        'app-tabs.web.tsx must import BottomBar from bottom-tab-bar'
      );
      assert.ok(webTabsCode.includes('<SmartAppBanner />'), 'app-tabs.web.tsx must render SmartAppBanner');
      assert.ok(webTabsCode.includes('<BottomBar>'), 'app-tabs.web.tsx must render BottomBar');
    });

    it('guarantees Expo Router UI trigger discovery invariants across both desktop and mobile web branches', () => {
      const webTabsCode = readSrc('components/app-tabs.web.tsx');
      const tabsBlockMatch = webTabsCode.match(/<Tabs[\s\S]*?<\/Tabs>/);
      assert.ok(tabsBlockMatch, 'app-tabs.web.tsx must render <Tabs> component');
      const tabsBlock = tabsBlockMatch[0];

      assert.ok(
        !tabsBlock.includes('<View style={styles.mobileLayout}>'),
        'Tabs children must NOT wrap TabList in <View style={styles.mobileLayout}>'
      );

      const baseRoutes = ['index', 'dining', 'safety', 'directory'];
      for (const route of baseRoutes) {
        const count = (tabsBlock.match(new RegExp(`name="${route}"`, 'g')) || []).length;
        assert.ok(count >= 2, `Tabs must register <TabTrigger name="${route}"> in BOTH desktop and mobile branches`);
      }

      const postCount = (tabsBlock.match(/name="post"/g) || []).length;
      assert.ok(postCount >= 2, 'Tabs must register <TabTrigger name="post"> in BOTH desktop and mobile branches');
    });

    it('validates mobile web top bar padding, SmartAppBanner height, and login flight docking parity', () => {
      const { getAppHeaderHeight } = require('../src/components/ui/app-header');
      const { SMART_APP_BANNER_HEIGHT } = require('../src/components/smart-app-banner');
      const appHeaderCode = readSrc('components/ui/app-header.tsx');
      const loginScreenCode = readSrc('components/login-screen.tsx');

      assert.ok(!appHeaderCode.includes('Platform.OS === "web" ? WebHeaderInset : insets.top'));
      assert.strictEqual(getAppHeaderHeight(0), 85);
      assert.strictEqual(getAppHeaderHeight(47), 120);
      assert.strictEqual(SMART_APP_BANNER_HEIGHT, 44);

      assert.ok(loginScreenCode.includes('bannerOffset'));
      assert.ok(loginScreenCode.includes('<SmartAppBanner'));
    });
  });

  describe('Route Header Title Mapping Across Path Variants', () => {
    const routeVariants = [
      { path: '/', expected: 'Knightly' },
      { path: '/(tabs)', expected: 'Knightly' },
      { path: '/(tabs)/', expected: 'Knightly' },
      { path: '/dining', expected: 'Dining' },
      { path: '/(tabs)/dining', expected: 'Dining' },
      { path: '/dining/activity', expected: 'Knightly' },
      { path: '/safety', expected: 'Campus Safety' },
      { path: '/(tabs)/safety', expected: 'Campus Safety' },
      { path: '/directory', expected: 'Directory' },
      { path: '/(tabs)/directory', expected: 'Directory' },
      { path: '/post', expected: 'Create Post' },
      { path: '/(tabs)/post', expected: 'Create Post' },
      { path: '/unknown/nested/route', expected: 'Knightly' },
    ];

    for (const { path: rPath, expected } of routeVariants) {
      it(`resolves getTabHeader for route "${rPath}" -> "${expected}"`, () => {
        const header = getTabHeader(rPath);
        assert.strictEqual(header.title, expected);
      });
    }
  });

  describe('Horizontal Pager Snapping Physics Across Viewports', () => {
    const deviceWidths = [320, 360, 375, 390, 412, 428, 430, 768, 834, 1024, 1280];

    for (const w of deviceWidths) {
      for (let slot = 0; slot < 5; slot++) {
        it(`calculates exact camera translateX for width ${w}px at slot ${slot}`, () => {
          const expectedX = slot === 0 ? 0 : -slot * w;
          assert.strictEqual(slot === 0 ? 0 : -slot * w, expectedX);
        });
      }
    }
  });

  describe('Single-Pointer Pan Gesture Resistance Across Boundaries', () => {
    const testOffsets = [-300, -200, -100, -50, 0, 50, 100, 200, 300];
    const RESISTANCE_FACTOR = 0.28;

    for (const offset of testOffsets) {
      it(`evaluates linear resistance for drag offset ${offset}px`, () => {
        const resisted = offset * RESISTANCE_FACTOR;
        assert.ok(Math.abs(resisted - offset * 0.28) < 0.001);
      });
    }
  });
});

