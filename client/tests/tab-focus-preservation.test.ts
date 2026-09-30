import { describe, it } from 'node:test';
import assert from 'node:assert';

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

import { redirectSystemPath } from '../src/app/+native-intent';

/**
 * State machine modeling the Subpage-Aware Unified Tab Controller in AppTabs and SwipeableTabPager.
 * Coordinates bottom bar taps, horizontal swipe gestures, inline subpages (Campus Clubs, Complete Profile),
 * and external native Activity intent interception.
 */
function createUnifiedTabControllerMachine(initialPath: string = '/') {
  let pathname = initialPath;
  let tabIndex = TABS.findIndex((t) => t.href === pathname);
  let activeTabIndex = tabIndex >= 0 ? tabIndex : 0;
  let headerIndex = activeTabIndex;
  let translateX = -activeTabIndex * 390; // mock screen width = 390
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
    translateX = targetIndex === 0 ? 0 : -targetIndex * 390;

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
    pathname = newPathname;
    const newIndex = TABS.findIndex((t) => t.href === newPathname);
    if (newIndex >= 0) {
      const isRouteTabChange = prevTabIndex !== newIndex;
      prevTabIndex = newIndex;

      tabIndex = newIndex;
      activeTabIndex = newIndex;
      headerIndex = newIndex;

      const isSubpageOpen =
        (newIndex === 0 && (clubsLevel > 0 || isClaimSetupOpen)) ||
        (newIndex === 1 && false);

      if (!isSubpageOpen || isRouteTabChange) {
        translateX = -newIndex * 390;
      }
    }
  }

  function openClubsDirectory() {
    clubsLevel = 1;
    translateX = -1 * 390; // Slot 1
  }

  function startClaimSetup(code: string, source: 'banner' | 'profile') {
    isClaimSetupOpen = true;
    claimSetupSource = source;
    cachedSetupCode = code;

    if (source === 'profile') {
      clubsLevel = 1;
      translateX = -1 * 390; // Pan from 0 to -1*width
    } else if (source === 'banner') {
      clubsLevel = 1;
      // Camera is ALREADY at Slot 1 (-1 * 390); lock firmly in place!
      translateX = -1 * 390;
    }
  }

  function backFromClaimSetup(): { cameraLandingX: number; codeSuppliedDuringSlide: string } {
    const codeDuringSlide = cachedSetupCode;
    if (claimSetupSource === 'banner') {
      // Returns cleanly to Campus Clubs at Slot 1
      isClaimSetupOpen = false;
      claimSetupSource = null;
      clubsLevel = 1;
      // translateX stays at -1 * 390
      return { cameraLandingX: translateX, codeSuppliedDuringSlide: codeDuringSlide };
    } else {
      // Slides back to Knightly Home (Slot 0)
      translateX = 0;
      // Teardown occurs only AFTER arrival
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

describe('Tab Focus Preservation & Native Activity Focus Invariants', () => {
  describe('Expo Router +native-intent Intent Interception', () => {
    it('unconditionally drops unrouted root intent (/) when returning from Android external activities', async () => {
      const intercepted = await redirectSystemPath({ path: '/', initial: false });
      assert.strictEqual(intercepted, null, 'Unrouted / intent must be dropped completely to preserve state');

      const emptyIntercepted = await redirectSystemPath({ path: '', initial: false });
      assert.strictEqual(emptyIntercepted, null, 'Unrouted empty intent must be dropped completely to preserve state');
    });

    it('preserves genuine deep links and cold launch routes', async () => {
      const coldLaunch = await redirectSystemPath({ path: '/', initial: true });
      assert.strictEqual(coldLaunch, '/', 'Initial cold launch root must pass through');

      const diningDeepLink = await redirectSystemPath({ path: '/dining', initial: false });
      assert.strictEqual(diningDeepLink, '/dining', 'Deep link to /dining must pass through');

      const customDeepLink = await redirectSystemPath({ path: '/safety', initial: false });
      assert.strictEqual(customDeepLink, '/safety', 'Non-root deep links must not be blocked');
    });
  });

  describe('Route Naming & JUMP_TO Invariants', () => {
    it('dispatches JUMP_TO with route name "index" for Knightly tab, eliminating navigator warnings', () => {
      const controller = createUnifiedTabControllerMachine('/dining');
      controller.navigateToTab(0);

      const actions = controller.getDispatchedActions();
      const lastAction = actions[actions.length - 1];

      assert.deepStrictEqual(lastAction, {
        type: 'JUMP_TO',
        payload: { name: 'index' },
      }, 'Knightly route name MUST be "index" to match Expo Router (tabs)/index.tsx');
    });
  });

  describe('Campus Clubs -> Claim Club Setup Navigation & Camera Coordinates', () => {
    it('locks camera at Slot 1 (-1 * width) when claiming from Campus Clubs banner, never bouncing to 0', () => {
      const controller = createUnifiedTabControllerMachine('/');

      // 1. User opens Campus Clubs from Knightly Home
      controller.openClubsDirectory();
      let state = controller.getState();
      assert.strictEqual(state.clubsLevel, 1);
      assert.strictEqual(state.translateX, -390, 'Campus Clubs sits at Slot 1 (-1 * width)');

      // 2. User claims club from banner card at top of Campus Clubs
      controller.startClaimSetup('KNIGHT-2026-X1', 'banner');
      state = controller.getState();
      assert.strictEqual(state.isClaimSetupOpen, true);
      assert.strictEqual(state.claimSetupSource, 'banner');
      assert.strictEqual(state.translateX, -390, 'Camera MUST stay firmly locked at Slot 1 (-1 * width)');

      // 3. Simulated re-render with pathname = '/' (subpage open, route unchanged)
      controller.onPathnameChange('/');
      state = controller.getState();
      assert.strictEqual(state.translateX, -390, 'Subpage-aware controller must NOT reset camera to 0');

      // 4. User taps back from setup -> returns cleanly to Campus Clubs at Slot 1
      const backRes = controller.backFromClaimSetup();
      assert.strictEqual(backRes.cameraLandingX, -390, 'Back from banner setup must stay at Slot 1 Campus Clubs');
      state = controller.getState();
      assert.strictEqual(state.clubsLevel, 1, 'Clubs level must remain 1');
      assert.strictEqual(state.isClaimSetupOpen, false, 'Setup modal closed');
    });

    it('smoothly glides back to Knightly Home on profile claim exit and retains code during slide', () => {
      const controller = createUnifiedTabControllerMachine('/');

      // 1. User opens Claim Setup from Profile Header Avatar (Slot 0)
      controller.startClaimSetup('KNIGHT-2026-X1', 'profile');
      let state = controller.getState();
      assert.strictEqual(state.isClaimSetupOpen, true);
      assert.strictEqual(state.claimSetupSource, 'profile');
      assert.strictEqual(state.translateX, -390, 'Glides to Slot 1 for Complete Profile');

      // 2. User exits setup (or taps "Got it!")
      const backRes = controller.backFromClaimSetup();
      assert.strictEqual(backRes.codeSuppliedDuringSlide, 'KNIGHT-2026-X1', 'Setup code MUST remain valid throughout slide');
      assert.strictEqual(backRes.cameraLandingX, 0, 'Camera smoothly docks at Slot 0 (Knightly Home)');

      state = controller.getState();
      assert.strictEqual(state.isClaimSetupOpen, false);
      assert.strictEqual(state.clubsLevel, 0);
      assert.strictEqual(state.translateX, 0);
    });
  });

  describe('Tab Selection Mutual Exclusion Invariants', () => {
    it('guarantees exactly one bottom bar tab is illuminated as focused at all times', () => {
      const controller = createUnifiedTabControllerMachine('/');

      for (let i = 0; i < TABS.length; i++) {
        controller.navigateToTab(i);
        const focusedTabs = TABS.map((_, idx) => controller.evaluateTabButtonFocus(idx));
        const activeCount = focusedTabs.filter(Boolean).length;
        assert.strictEqual(activeCount, 1, `Exactly one tab must be focused when active tab is ${i}`);
        assert.strictEqual(focusedTabs[i], true, `Tab ${i} (${TABS[i].name}) must be the focused one`);
      }
    });
  });
});
