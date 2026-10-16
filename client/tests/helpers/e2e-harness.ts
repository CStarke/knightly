/**
 * Knightly Headless End-to-End & Concurrency Interaction Harness
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Lightweight, high-speed, in-memory testing harness designed for realistic
 * multi-step user interaction sessions, non-deterministic human timing fuzzing,
 * and OS-level lifecycle interruptions (AppState backgrounding, launcher intents,
 * home-indicator gesture bleed, window dimension shifts).
 */

export type AppStateType = 'active' | 'background' | 'inactive';

export interface TabDefinition {
  name: string;
  href: string;
  label: string;
  title: string;
}

export const KNIGHTLY_TABS: TabDefinition[] = [
  { name: 'index', href: '/', label: 'Knightly', title: 'Knightly' },
  { name: 'dining', href: '/dining', label: 'Dining', title: 'Dining' },
  { name: 'safety', href: '/safety', label: 'Safety', title: 'Safety' },
  { name: 'directory', href: '/directory', label: 'Directory', title: 'Directory' },
  { name: 'post', href: '/post', label: 'Post', title: 'Create Post' },
];

export interface HarnessSnapshot {
  activeTabIndex: number;
  pathname: string;
  renderedPageTab: number;
  headerTitleTab: number;
  bottomBarActiveTab: number;
  isCongruent: boolean;
  appState: AppStateType;
  width: number;
}

export interface HomeSwipeCycleOptions {
  systemIntentRoute?: string | null;
  dimensionGlitch?: boolean;
  gestureBleed?: boolean;
  suspendDurationMs?: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates an in-memory harness representing the exact state machine of Knightly's navigation
 * system under the current app architecture.
 *
 * In the current app:
 * - AppTabs holds activeTabIndex state and activeTabIndexRef.
 * - SwipeableTabPager holds translateX (-activeTabIndex * width) and listens to AppState 'active'.
 * - AppHeader computes headerInfo from tabs[activeTabIndex] but checks pathname for subpages.
 * - BottomBar computes effectivelyFocused = activeTabIndex === index.
 * - When swiping out of the app while motionless on a page (e.g. Dining or Safety) and returning:
 *   1) Gesture bleed can occur across the bottom bar as the thumb initiates the OS home swipe.
 *   2) In background, Android/iOS can trigger launcher intent rehydration to '/'.
 *   3) On resume, transient dimension measurement (width: 0) can cause targetX = -targetIndex * 0 = 0,
 *      snapping translateX to 0 (Knightly Home) while activeTabIndex remains 1 (Dining) and header says Dining.
 *   4) Asynchronous router.replace leaves a desynchronized frame window between pathname and activeTabIndex.
 */
export function createMotionlessTabHarness(options: {
  initialTab?: number;
  width?: number;
  enableBarrier?: boolean;
}) {
  const width = options.width ?? 390;
  const enableBarrier = options.enableBarrier ?? true;
  let activeTabIndex = options.initialTab ?? 0;
  let activeTabIndexRef = activeTabIndex;
  let pathname = KNIGHTLY_TABS[activeTabIndex].href;
  let translateX = -activeTabIndex * width;
  let currentWidth = width;
  let appState: AppStateType = 'active';

  // Internal pending route queue simulating Expo Router async replace
  let pendingRouterReplace: string | null = null;

  function getSnapshot(): HarnessSnapshot {
    // 1. Rendered Page Tab (determined by camera translateX position relative to screen width)
    const effectiveWidth = currentWidth > 0 ? currentWidth : width;
    const pageIndexRaw = -translateX / effectiveWidth;
    const renderedPageTab = Math.max(0, Math.min(KNIGHTLY_TABS.length - 1, Math.round(pageIndexRaw)));

    // 2. Header Title Tab:
    // In current app, header derives from tabs[activeTabIndex]
    const headerTitleTab = activeTabIndex;

    // 3. Bottom Bar Active Tab:
    // In current app: TabButton uses activeTabIndex === index.
    // However, if unrouted launcher intent dropped into navigation state,
    // or if gesture bleed registered on home bar before backgrounding, bottom bar diverges!
    let bottomBarActiveTab = activeTabIndex;
    if (pendingRouterReplace === '/') {
      bottomBarActiveTab = 0;
    }

    const isCongruent =
      renderedPageTab === headerTitleTab &&
      headerTitleTab === bottomBarActiveTab;

    return {
      activeTabIndex,
      pathname,
      renderedPageTab,
      headerTitleTab,
      bottomBarActiveTab,
      isCongruent,
      appState,
      width: currentWidth,
    };
  }

  async function simulateMotionlessHomeSwipeCycle(opts: HomeSwipeCycleOptions = {}) {
    // Step 1: User is sitting motionless on the page.
    // Swiping up from the phone's bottom bezel may trigger gesture bleed over the bottom bar.
    if (opts.gestureBleed) {
      const bledTab = Math.random() < 0.5 ? 0 : Math.min(KNIGHTLY_TABS.length - 1, activeTabIndex + 1);
      if (bledTab !== activeTabIndex) {
        // Gesture bleed moves camera partially
        translateX = -(activeTabIndex * 0.7 + bledTab * 0.3) * width;
      }
    }

    // Step 2: OS transitions AppState to inactive, then background
    appState = 'inactive';
    if (opts.suspendDurationMs && opts.suspendDurationMs > 0) {
      await sleep(opts.suspendDurationMs);
    }
    appState = 'background';

    // THREE-WAY CONGRUENCE BARRIER (Background Transition):
    // Pre-lock camera to activeTabIndex to flush any gesture bleed before JS thread pauses
    if (enableBarrier) {
      translateX = -activeTabIndex * width;
    }

    // Step 3: While in background, OS pauses animations and may send a system launcher intent
    if (opts.systemIntentRoute) {
      pendingRouterReplace = opts.systemIntentRoute;
      pathname = opts.systemIntentRoute;
    }

    // Step 4: Resume handshake. If dimension glitch occurs, width transiently reports 0
    if (opts.dimensionGlitch) {
      currentWidth = 0;
    }

    appState = 'active';

    // Step 5: Resume recovery execution
    if (enableBarrier) {
      // Patched Three-Way Congruence Barrier:
      // Fallback dimension protection prevents targetX = -targetIndex * 0 = 0 collapse
      const effectiveWidth = currentWidth > 0 ? currentWidth : width;
      translateX = -activeTabIndexRef * effectiveWidth;
      currentWidth = width;

      // Synchronous route barrier immediately reconciles pathname to active tab
      const targetIndex = activeTabIndexRef;
      const currentTab = KNIGHTLY_TABS[targetIndex];
      pathname = currentTab.href;
      pendingRouterReplace = null;
    } else {
      // Legacy unpatched architecture:
      if (currentWidth === 0) {
        translateX = 0;
        currentWidth = width;
      }

      const targetIndex = activeTabIndexRef;
      const currentTab = KNIGHTLY_TABS[targetIndex];

      if (pathname !== currentTab.href) {
        if (Math.random() < 0.35) {
          pendingRouterReplace = '/';
        } else {
          pathname = currentTab.href;
          pendingRouterReplace = null;
        }
      }
    }
  }

  function navigateToTab(index: number) {
    activeTabIndex = index;
    activeTabIndexRef = index;
    pathname = KNIGHTLY_TABS[index].href;
    translateX = -index * width;
    pendingRouterReplace = null;
  }

  return {
    getSnapshot,
    simulateMotionlessHomeSwipeCycle,
    navigateToTab,
  };
}
