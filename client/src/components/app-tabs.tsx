import { Navigator, router, usePathname } from 'expo-router';
import {
  TabContext,
  TabList,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  GestureResponderEvent,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DiningActivityView } from '@/components/dining-activity';
import { ClubsDirectoryView } from '@/components/clubs-directory-view';
import { ClubDetailView } from '@/components/club-detail-view';
import { CompleteClubProfileView } from '@/components/complete-club-profile-view';
import { AppHeader } from '@/components/ui/app-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { getTabHeader } from '@/constants/tab-headers';
import { getBlankAfterSlot } from '@/constants/phantom-tabs';
import { Brand, Spacing } from '@/constants/theme';
import { DiningActivityProvider } from '@/context/dining-activity-context';
import { ClubsNavigationProvider } from '@/context/clubs-navigation-context';
import { TabPagerPriorityProvider } from '@/context/tab-pager-priority-context';
import { StarfieldContext } from '@/context/starfield-context';
import { getClubById } from '@/data/clubs';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useTheme } from '@/hooks/use-theme';

import {
  TabNavigationContext,
  useTabNavigation,
  type TabNavigationContextValue,
  type TabMeta,
} from '@/context/tab-navigation-context';

export {
  TabNavigationContext,
  useTabNavigation,
  type TabNavigationContextValue,
  type TabMeta,
};

/**
 * Standard 4-tab layout for regular campus students:
 * Knightly (Feed) -> Dining -> Safety -> Directory.
 */
const BASE_TABS: TabMeta[] = [
  {
    name: 'index',
    href: '/',
    label: 'Knightly',
    sf: 'sparkles',
    md: 'auto_awesome',
  },
  {
    name: 'dining',
    href: '/dining',
    label: 'Dining',
    sf: 'fork.knife',
    md: 'restaurant',
  },
  {
    name: 'safety',
    href: '/safety',
    label: 'Safety',
    sf: 'shield',
    sfActive: 'shield.fill',
    md: 'shield',
  },
  {
    name: 'directory',
    href: '/directory',
    label: 'Directory',
    sf: 'person.2',
    sfActive: 'person.2.fill',
    md: 'group',
  },
];

const POST_TAB: TabMeta = {
  name: 'post',
  href: '/post',
  label: 'Post',
  sf: 'plus.circle.fill',
  md: 'add_circle',
};

/**
 * Extended 5-tab layout unlocked for verified Club Leaders:
 * Appends the dedicated "Post" tab (`/post`) as Slot 4.
 */
const LEADER_TABS: TabMeta[] = [...BASE_TABS, POST_TAB];

/**
 * Programmatic animation easing curve (bidirectional ease-in-out cubic-bezier).
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Previously, an ease-out-only curve `Easing.bezier(0.22, 1, 0.36, 1)` was used.
 * Ease-out curves have an initial derivative of ~4.54 at t=0, meaning they launch into motion
 * at peak velocity with zero acceleration ramp-up. Compounding this, when a Phantom Tab is opened
 * (Campus Clubs, Club Setup, Dining Activity, Photo Cropper), React and the native UI thread must
 * synchronously mount that slot's view hierarchy (cards, forms, search fields) on that exact
 * initial frame. That initial frame dropped under load, causing a visible 50–100px hitch/jolt.
 *
 * SOLUTION:
 * We use a balanced ease-in-out cubic-bezier: `Easing.bezier(0.40, 0.0, 0.20, 1.0)`.
 * 1. Initial derivative at t=0 is 0: The camera accelerates gently from rest over the first 30–50ms.
 * 2. Mounting tolerance: Any native layout pass completes during this near-zero-displacement phase,
 *    eliminating visual stuttering.
 * 3. Final derivative at t=1 is 0: The camera softly cushions to a halt into the target slot.
 * 4. Duration is set to 340ms to provide an exquisitely fluid, cinematic lateral glide.
 */
const CURVE = Easing.bezier(0.4, 0.0, 0.2, 1.0);
const DURATION = 340;

/**
 * Normalizes an Expo Router href pathname into an internal route name key.
 * Expo Router associates '/' with 'index' in its internal state.routes array.
 */
function getRouteName(href: string): string {
  if (href === '/') return 'index';
  return href.replace(/^\//, '');
}

/** Utility to dismiss virtual keyboard when horizontal swipes initiate */
const dismissKeyboard = () => {
  Keyboard.dismiss();
};

/**
 * Global Tab Navigation & Synchronization Context
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Coordinates bottom bar taps and horizontal swipe gestures through a unified controller.
 * Bypasses Expo Router's `<TabTrigger>` `!trigger.isFocused` click lockout bug (where React
 * Navigation's state.index === 0 causes Knightly taps to be discarded as already focused).
 * Shields the active tab selection and screen interactivity against spurious unrouted
 * resume intent drops to '/' triggered by Android native activities (e.g. ImagePicker).
 */


export default function AppTabs() {
  const bottomBarTranslateY = useSharedValue(0);
  const { isLeader } = useClubLeadership();
  const tabs = isLeader ? LEADER_TABS : BASE_TABS;
  const pathname = usePathname();
  const initialIndex = tabs.findIndex((tab) => tab.href === pathname);
  const [activeTabIndex, setActiveTabIndex] = useState(() => (initialIndex >= 0 ? initialIndex : 0));
  const activeTabIndexRef = useRef(activeTabIndex);
  activeTabIndexRef.current = activeTabIndex;
  const pagerNavigateRef = useRef<((index: number, href?: string) => void) | null>(null);

  // Reconcile Expo Router route pathname whenever it diverges from master activeTabIndex
  useEffect(() => {
    // If activeTabIndex is out of bounds (e.g. leadership revoked and tabs shortened), clamp it
    if (activeTabIndex >= tabs.length) {
      setActiveTabIndex(Math.max(0, tabs.length - 1));
      return;
    }

    const currentTab = tabs[activeTabIndex];
    const isTabRoute = tabs.some((t) => t.href === pathname) || pathname === '/' || pathname === '';
    if (isTabRoute && currentTab && pathname !== currentTab.href) {
      try {
        router.replace(currentTab.href as any);
      } catch {}
    }
  }, [pathname, activeTabIndex, tabs]);

  const navigateToTab = useCallback(
    (targetIndex: number, targetHref?: string) => {
      if (pagerNavigateRef.current) {
        pagerNavigateRef.current(targetIndex, targetHref);
      } else {
        setActiveTabIndex(targetIndex);
        const href = targetHref || tabs[targetIndex]?.href;
        if (href) router.navigate(href as any);
      }
    },
    [tabs]
  );

  const tabNavValue = useMemo(
    () => ({
      activeTabIndex,
      setActiveTabIndex,
      navigateToTab,
      tabs,
    }),
    [activeTabIndex, navigateToTab, tabs]
  );

  return (
    <TabNavigationContext.Provider value={tabNavValue}>
      <Tabs options={{ backBehavior: 'none' }}>
        <SwipeableTabPager
          bottomBarTranslateY={bottomBarTranslateY}
          tabs={tabs}
          pagerNavigateRef={pagerNavigateRef}
          activeTabIndex={activeTabIndex}
          setActiveTabIndex={setActiveTabIndex}
        />

        <TabList asChild>
          <BottomBar translateY={bottomBarTranslateY}>
            {tabs.map((meta, index) => (
              <TabTrigger key={meta.name} name={meta.name} href={meta.href} asChild>
                <TabButton meta={meta} index={index} activeTabIndex={activeTabIndex} />
              </TabTrigger>
            ))}
          </BottomBar>
        </TabList>
      </Tabs>
    </TabNavigationContext.Provider>
  );
}

/**
 * Interactive follow-my-finger horizontal pager for tab navigation and inline sub-pages.
 * All tabs and sub-pages sit side-by-side in an animated track that moves 1:1 with finger drag,
 * rubber-bands at the outer edges, and smoothly snaps with physics on release.
 */
function SwipeableTabPager({
  bottomBarTranslateY,
  tabs,
  pagerNavigateRef,
  activeTabIndex,
  setActiveTabIndex,
}: {
  bottomBarTranslateY: SharedValue<number>;
  tabs: TabMeta[];
  pagerNavigateRef: React.MutableRefObject<((index: number, href?: string) => void) | null>;
  activeTabIndex: number;
  setActiveTabIndex: (index: number) => void;
}) {
  const { state, descriptors, navigation } = Navigator.useContext();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const tabIndex = tabs.findIndex((tab) => tab.href === pathname);
  const activeTabIndexRef = useRef(activeTabIndex);
  activeTabIndexRef.current = activeTabIndex;

  const translateX = useSharedValue(-activeTabIndex * width);
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const isGestureActive = useSharedValue(false);
  const lastGestureTarget = useSharedValue<number | null>(null);

  // Leadership claim setup state
  // Why useSharedValue alongside React state? Reanimated worklets running on the
  // native UI thread cannot read React state synchronously without crossing the JS bridge.
  // We mirror the boolean state into a shared value so gesture worklets make zero-latency routing decisions.
  const { claimSetupState, cancelClaimSetup, completeClaimSetup } = useClubLeadership();
  const isClubSetupOpenShared = useSharedValue(false);

  useEffect(() => {
    isClubSetupOpenShared.value = claimSetupState.isOpen;
  }, [claimSetupState.isOpen, isClubSetupOpenShared]);

  // Activity view state (inline sub-page next to Dining)
  // WHY TWO STATES (isActivityOpen vs showActivity)?
  // 1. `isActivityOpen`: Logical state driving active gesture bounds and URL header updates.
  // 2. `showActivity`: Render persistence flag. When backing out, the camera takes 320ms to slide.
  //    If unmounted immediately, the user would see an empty/black hole during the slide.
  //    `showActivity` keeps the component rendered until the slide finishes, preventing visual flash.
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const isActivityOpenShared = useSharedValue(false);

  // Clubs navigation state (inline sub-pages on Knightly Home)
  // Hierarchical Depth Architecture:
  // Level 0: Knightly Home feed (Slot 0)
  // Level 1: Campus Clubs directory (Slot 1)
  // Level 2: Individual Club detail (Slot 2)
  // Panning between levels is 1:1 with finger touch, preserving continuous starfield canvas.
  const [clubsLevel, setClubsLevel] = useState<0 | 1 | 2>(0);
  const [showClubsDirectory, setShowClubsDirectory] = useState(false);
  const [showClubDetail, setShowClubDetail] = useState(false);
  const [showClubSetup, setShowClubSetup] = useState(false);
  const [cachedSetupCode, setCachedSetupCode] = useState<string>('');
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const clubsLevelShared = useSharedValue<number>(0);

  const navigateToTab = useCallback(
    (targetIndex: number, targetHref?: string) => {
      const target = tabs[targetIndex];
      if (!target) return;

      if (claimSetupState.isOpen) {
        cancelClaimSetup();
      }
      if (isActivityOpenShared.value) {
        isActivityOpenShared.value = false;
        setIsActivityOpen(false);
        setShowActivity(false);
        bottomBarTranslateY.value = withTiming(0, { duration: 200, easing: CURVE });
      }
      if (clubsLevelShared.value > 0) {
        clubsLevelShared.value = 0;
        setClubsLevel(0);
        setShowClubsDirectory(false);
        setShowClubDetail(false);
        setActiveClubId(null);
        bottomBarTranslateY.value = withTiming(0, { duration: 200, easing: CURVE });
      }

      cancelAnimation(translateX);
      isGestureActive.value = false;

      const targetX = -targetIndex * width;
      lastGestureTarget.value = targetIndex;
      translateX.value = withTiming(targetX, { duration: DURATION, easing: CURVE });

      setActiveTabIndex(targetIndex);

      const href = targetHref || target.href;
      if (pathname !== href) {
        router.navigate(href as any);
      }
      try {
        navigation?.dispatch({
          type: 'JUMP_TO',
          payload: { name: getRouteName(target.href) },
        });
      } catch {}
    },
    [
      tabs,
      claimSetupState.isOpen,
      cancelClaimSetup,
      isActivityOpenShared,
      bottomBarTranslateY,
      clubsLevelShared,
      translateX,
      isGestureActive,
      width,
      lastGestureTarget,
      setActiveTabIndex,
      pathname,
      navigation,
    ]
  );

  useEffect(() => {
    pagerNavigateRef.current = navigateToTab;
    return () => {
      pagerNavigateRef.current = null;
    };
  }, [navigateToTab, pagerNavigateRef]);

  // Unified single source of truth: Drive horizontal camera and subpage lifecycle strictly from activeTabIndex
  const prevActiveIndex = useRef(activeTabIndex);
  useEffect(() => {
    const isIndexChange = prevActiveIndex.current !== activeTabIndex;
    prevActiveIndex.current = activeTabIndex;

    if (lastGestureTarget.value === activeTabIndex) {
      lastGestureTarget.value = null;
      return;
    }
    lastGestureTarget.value = null;

    // When navigated to any tab other than Dining, Activity must be completely closed
    if (activeTabIndex !== 1 && isActivityOpenShared.value) {
      isActivityOpenShared.value = false;
      setIsActivityOpen(false);
      setShowActivity(false);
      bottomBarTranslateY.value = 0;
    }
    // When navigated to any tab other than Knightly, Clubs sub-pages & setup must be completely closed
    if (activeTabIndex !== 0 && (clubsLevelShared.value > 0 || claimSetupState.isOpen)) {
      if (claimSetupState.isOpen) {
        cancelClaimSetup();
      }
      clubsLevelShared.value = 0;
      setClubsLevel(0);
      setShowClubsDirectory(false);
      setShowClubDetail(false);
      setActiveClubId(null);
      bottomBarTranslateY.value = 0;
    }

    // Subpage-aware camera positioning:
    // Only animate translateX to -activeTabIndex * width if an actual tab change occurred
    // OR if no inline subpages (Campus Clubs, Complete Profile, Activity) are currently active.
    const isSubpageOpen =
      (activeTabIndex === 0 && (clubsLevelShared.value > 0 || claimSetupState.isOpen)) ||
      (activeTabIndex === 1 && isActivityOpenShared.value);

    if (!isSubpageOpen || isIndexChange) {
      const targetX = -activeTabIndex * width;
      if (Math.abs(translateX.value - targetX) >= 1) {
        cancelAnimation(translateX);
        isGestureActive.value = false;
        translateX.value = withTiming(targetX, { duration: DURATION, easing: CURVE });
      }
    }

    // Keep React Navigation internal state in sync with master activeTabIndex
    const currentTab = tabs[activeTabIndex];
    if (currentTab) {
      try {
        navigation?.dispatch({
          type: 'JUMP_TO',
          payload: { name: getRouteName(currentTab.href) },
        });
      } catch {}
    }
  }, [
    activeTabIndex,
    width,
    translateX,
    isGestureActive,
    isActivityOpenShared,
    clubsLevelShared,
    claimSetupState.isOpen,
    cancelClaimSetup,
    bottomBarTranslateY,
    lastGestureTarget,
    tabs,
    navigation,
  ]);

  const blankAfterSlot = getBlankAfterSlot({
    pathname,
    activeIndex: activeTabIndex,
    isClaimSetupOpen: claimSetupState.isOpen,
    showClubSetup,
    clubsLevel,
    showClubsDirectory,
    showClubDetail,
    isActivityOpen,
    showActivity,
    hasActiveClubId: !!activeClubId,
  });

  // Priority coordination for inner horizontal scrollable content (e.g. tag filter chips)
  const isInnerScrollActive = useSharedValue(false);

  const setInnerScrollActive = useCallback(
    (active: boolean) => {
      'worklet';
      isInnerScrollActive.value = active;
    },
    [isInnerScrollActive]
  );

  const tabPagerPriorityValue = useMemo(
    () => ({
      isInnerScrollActive,
      setInnerScrollActive,
    }),
    [isInnerScrollActive, setInnerScrollActive]
  );

  // Keep translateX in sync on screen rotation, resize, or insets recalculation
  const prevWidth = useRef(width);
  useEffect(() => {
    if (prevWidth.current !== width) {
      prevWidth.current = width;
      const targetIndex = activeTabIndexRef.current;
      if (targetIndex === 0) {
        if (claimSetupState.isOpen || clubsLevelShared.value === 1) {
          translateX.value = -1 * width;
        } else if (clubsLevelShared.value === 2) {
          translateX.value = -2 * width;
        } else {
          translateX.value = 0;
        }
      } else if (targetIndex === 1) {
        translateX.value = isActivityOpenShared.value ? -2 * width : -1 * width;
      } else {
        translateX.value = -targetIndex * width;
      }
    }
  }, [width, translateX, isActivityOpenShared, clubsLevelShared, claimSetupState.isOpen]);

  // RESUME RECOVERY: When returning from native Android activities (e.g. photo picker or permissions),
  // immediately re-anchor the camera to activeTabIndexRef.current,
  // and force route reconciliation if pathname diverged.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const targetIndex = activeTabIndexRef.current;
        const currentTab = tabs[targetIndex];
        const isSubpageOpen =
          (targetIndex === 0 && (clubsLevelShared.value > 0 || claimSetupState.isOpen)) ||
          (targetIndex === 1 && isActivityOpenShared.value);

        if (!isSubpageOpen) {
          const targetX = -targetIndex * width;
          cancelAnimation(translateX);
          isGestureActive.value = false;
          translateX.value = targetX;
        }

        if (currentTab && pathname !== currentTab.href) {
          try {
            navigation?.dispatch({
              type: 'JUMP_TO',
              payload: { name: getRouteName(currentTab.href) },
            });
          } catch {}
          router.replace(currentTab.href as any);
        }
      }
    });
    return () => sub.remove();
  }, [
    width,
    translateX,
    isGestureActive,
    clubsLevelShared,
    claimSetupState.isOpen,
    isActivityOpenShared,
    tabs,
    pathname,
    navigation,
  ]);

  // Open Activity with a smooth horizontal slide identical to switching tabs from Dining to Safety
  const openActivity = useCallback(() => {
    setShowActivity(true);
    setIsActivityOpen(true);
    isActivityOpenShared.value = true;
    cancelAnimation(translateX);
    isGestureActive.value = false;

    // Animate bottom bar down off-screen, keeping Dining as the selected tab
    bottomBarTranslateY.value = withTiming(120, { duration: 260, easing: CURVE });

    // Animate pager track to index 2 (Activity position)
    translateX.value = withTiming(-2 * width, { duration: DURATION, easing: CURVE });
  }, [width, translateX, isGestureActive, isActivityOpenShared, bottomBarTranslateY]);

  // Close Activity and slide back to Dining smoothly
  const closeActivity = useCallback(() => {
    isActivityOpenShared.value = false;
    setIsActivityOpen(false);
    isGestureActive.value = false;

    // Animate bottom bar back up into view
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });

    // Animate pager track back to Dining (-1 * width)
    const targetX = -1 * width;
    cancelAnimation(translateX);
    translateX.value = withTiming(targetX, { duration: DURATION, easing: CURVE }, () => {
      runOnJS(setShowActivity)(false);
    });
  }, [width, translateX, isGestureActive, isActivityOpenShared, bottomBarTranslateY]);

  const closeActivityFromGesture = useCallback(() => {
    isActivityOpenShared.value = false;
    setIsActivityOpen(false);
    isGestureActive.value = false;

    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });

    setTimeout(() => {
      setShowActivity(false);
    }, 350);
  }, [isActivityOpenShared, isGestureActive, bottomBarTranslateY]);

  // Clubs Sub-page navigation callbacks
  const openClubsDirectory = useCallback(() => {
    setShowClubsDirectory(true);
    setClubsLevel(1);
    clubsLevelShared.value = 1;
    cancelAnimation(translateX);
    isGestureActive.value = false;

    // Animate bottom bar down off-screen
    bottomBarTranslateY.value = withTiming(120, { duration: 260, easing: CURVE });

    // Animate pager track to index 1 (Campus Clubs position)
    translateX.value = withTiming(-1 * width, { duration: DURATION, easing: CURVE });
  }, [width, translateX, isGestureActive, clubsLevelShared, bottomBarTranslateY]);

  const closeClubsDirectory = useCallback(() => {
    clubsLevelShared.value = 0;
    setClubsLevel(0);
    isGestureActive.value = false;

    // Animate bottom bar back up into view
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });

    // Animate pager track back to Knightly Home (0)
    cancelAnimation(translateX);
    translateX.value = withTiming(0, { duration: DURATION, easing: CURVE }, () => {
      runOnJS(setShowClubsDirectory)(false);
      runOnJS(setActiveClubId)(null);
    });
  }, [translateX, isGestureActive, clubsLevelShared, bottomBarTranslateY]);

  const closeClubsDirectoryFromGesture = useCallback(() => {
    clubsLevelShared.value = 0;
    setClubsLevel(0);
    isGestureActive.value = false;

    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });

    setTimeout(() => {
      setShowClubsDirectory(false);
      setActiveClubId(null);
    }, 350);
  }, [clubsLevelShared, isGestureActive, bottomBarTranslateY]);

  const openClubDetail = useCallback(
    (clubId: string) => {
      setActiveClubId(clubId);
      setShowClubDetail(true);
      setClubsLevel(2);
      clubsLevelShared.value = 2;
      cancelAnimation(translateX);
      isGestureActive.value = false;

      // Animate pager track to index 2 (Club Detail position)
      translateX.value = withTiming(-2 * width, { duration: DURATION, easing: CURVE });
    },
    [width, translateX, isGestureActive, clubsLevelShared]
  );

  const closeClubDetail = useCallback(() => {
    clubsLevelShared.value = 1;
    setClubsLevel(1);
    isGestureActive.value = false;

    // Animate pager track back to Campus Clubs (-1 * width)
    const targetX = -1 * width;
    cancelAnimation(translateX);
    translateX.value = withTiming(targetX, { duration: DURATION, easing: CURVE }, () => {
      runOnJS(setShowClubDetail)(false);
    });
  }, [width, translateX, isGestureActive, clubsLevelShared]);

  const closeClubDetailFromGesture = useCallback(() => {
    clubsLevelShared.value = 1;
    setClubsLevel(1);
    isGestureActive.value = false;

    setTimeout(() => {
      setShowClubDetail(false);
    }, 350);
  }, [clubsLevelShared, isGestureActive]);

  // Camera Pan effect when setup is activated
  useEffect(() => {
    if (claimSetupState.isOpen && claimSetupState.code) {
      setShowClubSetup(true);
      setCachedSetupCode(claimSetupState.code);
      if (claimSetupState.source === 'profile') {
        // Opened from HeaderAvatar on Knightly Home (slot 0)
        // Camera smoothly pans right to Slot 1, bottom bar slides down off-screen!
        clubsLevelShared.value = 1;
        setClubsLevel(1);
        cancelAnimation(translateX);
        isGestureActive.value = false;
        bottomBarTranslateY.value = withTiming(120, { duration: 260, easing: CURVE });
        translateX.value = withTiming(-1 * width, { duration: DURATION, easing: CURVE });
      } else if (claimSetupState.source === 'banner') {
        // Opened from Campus Clubs directory (which is already in Slot 1 at -1 * width)
        // Camera is already at -1 * width; bottom bar is already hidden.
        // Lock camera firmly at Slot 1 (-1 * width) without jarring pan or bounce back!
        clubsLevelShared.value = 1;
        setClubsLevel(1);
        cancelAnimation(translateX);
        isGestureActive.value = false;
        translateX.value = -1 * width;
      }
    }
  }, [
    claimSetupState.isOpen,
    claimSetupState.code,
    claimSetupState.source,
    width,
    translateX,
    isGestureActive,
    clubsLevelShared,
    bottomBarTranslateY,
  ]);

  const handleBackFromSetup = useCallback(() => {
    const source = claimSetupState.source;
    if (source === 'banner') {
      // Returns cleanly to Campus Clubs directory at Slot 1
      clubsLevelShared.value = 1;
      setClubsLevel(1);
      cancelClaimSetup();
      setShowClubSetup(false);
    } else {
      // Smoothly glides back to Knightly Home (Slot 0)
      clubsLevelShared.value = 0;
      setClubsLevel(0);
      isGestureActive.value = false;
      bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
      cancelAnimation(translateX);
      translateX.value = withTiming(0, { duration: DURATION, easing: CURVE }, () => {
        runOnJS(cancelClaimSetup)();
        runOnJS(setShowClubSetup)(false);
      });
    }
  }, [claimSetupState.source, cancelClaimSetup, clubsLevelShared, bottomBarTranslateY, translateX, isGestureActive]);

  const handleDismissSetupFromGesture = useCallback(() => {
    clubsLevelShared.value = 0;
    setClubsLevel(0);
    isGestureActive.value = false;
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
    setTimeout(() => {
      cancelClaimSetup();
      setShowClubSetup(false);
    }, DURATION);
  }, [cancelClaimSetup, clubsLevelShared, isGestureActive, bottomBarTranslateY]);

  const handleSuccessFromSetup = useCallback(() => {
    clubsLevelShared.value = 0;
    setClubsLevel(0);
    setShowClubsDirectory(false);
    setShowClubDetail(false);
    setActiveClubId(null);
    isGestureActive.value = false;
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
    cancelAnimation(translateX);
    translateX.value = withTiming(0, { duration: DURATION, easing: CURVE }, () => {
      runOnJS(completeClaimSetup)();
      runOnJS(setShowClubSetup)(false);
    });
  }, [completeClaimSetup, clubsLevelShared, bottomBarTranslateY, translateX, isGestureActive]);

  const forceCloseSubpageStates = useCallback(() => {
    setIsActivityOpen(false);
    setShowActivity(false);
    isActivityOpenShared.value = false;

    if (claimSetupState.isOpen) {
      cancelClaimSetup();
    }
    setShowClubSetup(false);

    setClubsLevel(0);
    setShowClubsDirectory(false);
    setShowClubDetail(false);
    setActiveClubId(null);
    clubsLevelShared.value = 0;

    bottomBarTranslateY.value = withTiming(0, { duration: 200, easing: CURVE });
  }, [bottomBarTranslateY, isActivityOpenShared, clubsLevelShared, claimSetupState.isOpen, cancelClaimSetup]);

  // Intercept Android hardware back button when Activity, Clubs, or Setup are open
  useEffect(() => {
    if (!isActivityOpen && clubsLevel === 0 && !claimSetupState.isOpen) return;

    const onBackPress = () => {
      if (claimSetupState.isOpen) {
        handleBackFromSetup();
        return true;
      }
      if (clubsLevel === 2) {
        closeClubDetail();
        return true;
      }
      if (clubsLevel === 1) {
        closeClubsDirectory();
        return true;
      }
      if (isActivityOpen) {
        closeActivity();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isActivityOpen, clubsLevel, claimSetupState.isOpen, handleBackFromSetup, closeClubDetail, closeClubsDirectory, closeActivity]);

  const activityContextValue = useMemo(
    () => ({
      isActivityOpen,
      openActivity,
      closeActivity,
    }),
    [isActivityOpen, openActivity, closeActivity]
  );

  const clubsNavigationValue = useMemo(
    () => ({
      clubsLevel,
      activeClubId,
      openClubsDirectory,
      openClubDetail,
      closeClubDetail,
      closeClubsDirectory,
    }),
    [clubsLevel, activeClubId, openClubsDirectory, openClubDetail, closeClubDetail, closeClubsDirectory]
  );

  const onTabChange = useCallback(
    (targetIndex: number) => {
      navigateToTab(targetIndex);
    },
    [navigateToTab]
  );

  /**
   * Primary Follow-My-Finger Horizontal Pan Gesture
   *
   * WHY GESTURE-BASED RATHER THAN SWIPE-ACTION-ONLY?
   * Modern mobile UX standards (iOS PageViewController, Android ViewPager2) require
   * 1:1 tactile responsiveness: the screen must track the user's finger continuously
   * during the drag, not simply detect a swipe after release.
   *
   * WHY POINTER LOCKING (minPointers=1, maxPointers=1)?
   * Rejects two-finger pinches (used in image zoom, photo crop, maps) so zooming
   * an image never accidentally drags the screen horizontally.
   *
   * WHY OFFSET AND FAIL THRESHOLDS?
   * - activeOffsetX([-20, 20]): Requires 20dp intentional horizontal movement before capturing.
   * - failOffsetY([-15, 15]): If the finger moves 15dp vertically first, this horizontal
   *   gesture immediately FAILS. This gives priority to vertical ScrollViews (feed, forms,
   *   dining schedules) so vertical scrolling feels fluid and never hitches on subtle angle drags.
   */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onStart((event) => {
          'worklet';
          // Disqualify if another finger touched down or if an inner horizontal responder
          // (such as category tag chips or the photo crop box) claimed priority.
          if (event.numberOfPointers > 1 || isInnerScrollActive.value) {
            isGestureActive.value = false;
            return;
          }
          // Cancel any in-flight settling spring to allow catching the screen mid-flight
          cancelAnimation(translateX);
          startX.value = translateX.value;
          isGestureActive.value = true;
          runOnJS(dismissKeyboard)();
          if (!isActivityOpenShared.value && clubsLevelShared.value === 0) {
            runOnJS(forceCloseSubpageStates)();
          }
        })
        .onUpdate((event) => {
          'worklet';
          if (event.numberOfPointers > 1 || isInnerScrollActive.value || !isGestureActive.value) return;

          const raw = startX.value + event.translationX;
          let minX = -(tabs.length - 1) * width;
          let maxX = 0;

          // Restrict horizontal camera bounds when inside Phantom Tab subpages:
          // Users inside a subpage can only stay on that subpage or swipe backwards to its parent.
          if (isActivityOpenShared.value) {
            minX = -2 * width; // Slot 2 Activity
            maxX = -1 * width; // Slot 1 Dining
          } else if (clubsLevelShared.value === 2) {
            minX = -2 * width; // Slot 2 Club Detail
            maxX = -1 * width; // Slot 1 Campus Clubs
          } else if (clubsLevelShared.value === 1) {
            minX = -1 * width; // Slot 1 Campus Clubs
            maxX = 0;          // Slot 0 Knightly Home
          }

          // Tactile rubber-banding physics:
          // When pulling beyond the defined boundaries (e.g. left of Home or right of the last tab),
          // apply a 0.28 resistance coefficient matching iOS UIKit UIScrollView spring tension.
          if (raw > maxX) {
            const over = raw - maxX;
            translateX.value = maxX + over * 0.28;
          } else if (raw < minX) {
            const over = raw - minX;
            translateX.value = minX + over * 0.28;
          } else {
            translateX.value = raw;
          }
        })
        .onEnd((event) => {
          'worklet';
          if (isInnerScrollActive.value || !isGestureActive.value) return;
          isGestureActive.value = false;

          const currentX = translateX.value;
          const rawIndex = -currentX / width;
          const vx = event.velocityX;

          if (isActivityOpenShared.value) {
            // In Activity mode, user can drag right back to Dining (index 1)
            let targetIndex = 2; // stay on Activity
            if (vx > 400 || rawIndex < 1.6) {
              targetIndex = 1; // back to Dining
            }

            const targetX = -targetIndex * width;
            translateX.value = withSpring(targetX, {
              damping: 26,
              stiffness: 240,
              mass: 0.9,
              velocity: event.velocityX,
            });

            if (targetIndex === 1) {
              runOnJS(closeActivityFromGesture)();
            }
            return;
          }

          if (clubsLevelShared.value === 2) {
            // In Club Detail mode, user can drag right back to Campus Clubs (index 1)
            let targetIndex = 2; // stay on Club Detail
            if (vx > 400 || rawIndex < 1.6) {
              targetIndex = 1; // back to Campus Clubs
            }

            const targetX = -targetIndex * width;
            translateX.value = withSpring(targetX, {
              damping: 26,
              stiffness: 240,
              mass: 0.9,
              velocity: event.velocityX,
            });

            if (targetIndex === 1) {
              runOnJS(closeClubDetailFromGesture)();
            }
            return;
          }

          if (clubsLevelShared.value === 1) {
            // In Campus Clubs mode, user can drag right back to Knightly Home (index 0)
            let targetIndex = 1; // stay on Campus Clubs
            if (vx > 400 || rawIndex < 0.6) {
              targetIndex = 0; // back to Knightly Home
            }

            const targetX = -targetIndex * width;
            translateX.value = withSpring(targetX, {
              damping: 26,
              stiffness: 240,
              mass: 0.9,
              velocity: event.velocityX,
            });

            if (targetIndex === 0) {
              if (isClubSetupOpenShared.value) {
                runOnJS(handleDismissSetupFromGesture)();
              } else {
                runOnJS(closeClubsDirectoryFromGesture)();
              }
            }
            return;
          }

          let targetIndex = Math.round(rawIndex);

          // Natural flick handling in direction of velocity
          if (vx < -400 && Math.floor(rawIndex) < tabs.length - 1) {
            targetIndex = Math.floor(rawIndex) + 1;
          } else if (vx > 400 && Math.ceil(rawIndex) > 0) {
            targetIndex = Math.ceil(rawIndex) - 1;
          }

          targetIndex = Math.max(0, Math.min(tabs.length - 1, targetIndex));
          const targetX = -targetIndex * width;

          translateX.value = withSpring(targetX, {
            damping: 26,
            stiffness: 240,
            mass: 0.9,
            velocity: event.velocityX,
          });

          runOnJS(onTabChange)(targetIndex);
        })
        .onFinalize(() => {
          'worklet';
          isGestureActive.value = false;
        }),
    [
      width,
      tabs,
      onTabChange,
      closeActivityFromGesture,
      closeClubDetailFromGesture,
      closeClubsDirectoryFromGesture,
      handleDismissSetupFromGesture,
      forceCloseSubpageStates,
      translateX,
      startX,
      isGestureActive,
      isInnerScrollActive,
      isActivityOpenShared,
      clubsLevelShared,
      isClubSetupOpenShared,
    ]
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const activeClub = activeClubId ? getClubById(activeClubId) : undefined;

  const currentTab = tabs[activeTabIndex] ?? tabs[0];
  const headerInfo = getTabHeader(currentTab.name);

  const headerProps = useMemo(() => {
    if (pathname === '/' && claimSetupState.isOpen) {
      return {
        title: 'Complete Profile',
        subtitle: 'CLAIM VERIFIED',
        left: (
          <HeaderBackButton
            onPress={handleBackFromSetup}
            accessibilityLabel={claimSetupState.source === 'banner' ? 'Go back to clubs' : 'Go back to feed'}
          />
        ),
        right: undefined,
      };
    }

    if (pathname === '/' && clubsLevel === 2) {
      return {
        title: activeClub ? activeClub.name : 'Club',
        subtitle: activeClub ? activeClub.category : 'Details',
        left: (
          <HeaderBackButton
            onPress={closeClubDetail}
            accessibilityLabel="Go back to clubs"
          />
        ),
        right: undefined,
      };
    }

    if (pathname === '/' && clubsLevel === 1) {
      return {
        title: 'Campus Clubs',
        subtitle: 'Student orgs & communities',
        left: (
          <HeaderBackButton
            onPress={closeClubsDirectory}
            accessibilityLabel="Go back to feed"
          />
        ),
        right: undefined,
      };
    }

    if (pathname === '/dining' && isActivityOpen) {
      return {
        title: 'Activity',
        subtitle: 'LAST 7 DAYS',
        left: (
          <HeaderBackButton
            onPress={closeActivity}
            accessibilityLabel="Go back to Dining"
          />
        ),
        right: undefined,
      };
    }

    return {
      title: headerInfo.title,
      subtitle: headerInfo.subtitle,
      left: undefined,
      right: headerInfo.right,
    };
  }, [
    pathname,
    claimSetupState.isOpen,
    claimSetupState.source,
    handleBackFromSetup,
    clubsLevel,
    activeClub,
    closeClubDetail,
    closeClubsDirectory,
    isActivityOpen,
    closeActivity,
    headerInfo,
  ]);

  return (
    <DiningActivityProvider value={activityContextValue}>
      <ClubsNavigationProvider value={clubsNavigationValue}>
        <TabPagerPriorityProvider value={tabPagerPriorityValue}>
          <StarfieldContext.Provider value={{ translateX, scrollY }}>
            <View style={styles.pagerContainer}>
              {/* Parallax Starfield with 3 depth layers reacting to both horizontal and vertical scrolling */}
              <ParallaxStarfield translateX={translateX} scrollY={scrollY} />

              <AppHeader
                title={headerProps.title}
                subtitle={headerProps.subtitle}
                left={headerProps.left}
                right={headerProps.right}
              />

              <GestureDetector gesture={pan}>
                {/* 
                  Horizontal Pager Track
                  Width is strictly width * tabs.length (4 for students, 5 for club leaders).
                */}
                <Animated.View style={[styles.pagerTrack, { width: width * tabs.length }, style]}>
                  {tabs.map((tab, i) => {
                    const routeName = getRouteName(tab.href);
                    const route =
                      state.routes.find((r) => r.name === routeName || r.name === tab.name) ??
                      state.routes[i];
                    const descriptor = route ? descriptors[route.key] : undefined;

                    // TRAILING SLOT BLANKING:
                    // When a Phantom Tab is open (e.g. Campus Clubs in Slot 1), dragging past the right
                    // boundary rubber-bands the track leftward. If slots 2, 3, etc. remained populated,
                    // the user would catch glimpses of Safety or Directory. We replace trailing slots with
                    // an empty frame to ensure only the continuous starfield canvas is visible during overscroll.
                    const isSlotBlanked = blankAfterSlot !== null && i > blankAfterSlot;
                    if (isSlotBlanked) {
                      return (
                        <View
                          key={tab.name}
                          style={[styles.page, { width }]}
                          aria-hidden={true}
                          accessibilityElementsHidden={true}
                          importantForAccessibility="no-hide-descendants"
                        />
                      );
                    }

                    // DYNAMIC SLOT SWAPPING:
                    // Slot 1 is hijacked for CompleteClubProfileView or ClubsDirectoryView when activated from Home.
                    const isShowingClubSetup =
                      i === 1 && (claimSetupState.isOpen || showClubSetup) && activeTabIndex === 0;

                    const isShowingClubs =
                      i === 1 && showClubsDirectory && !claimSetupState.isOpen && !showClubSetup && activeTabIndex === 0;

                    // Slot 2 is hijacked for ClubDetailView (from Clubs) or DiningActivityView (from Dining).
                    const isShowingClubDetail =
                      i === 2 && showClubDetail && activeTabIndex === 0 && !!activeClubId;

                    const isShowingActivity =
                      i === 2 && showActivity && activeTabIndex === 1;

                    // ACCESSIBILITY & FOCUS DETERMINATION:
                    // Only the visually active page should receive screen reader focus and allow tab-stops.
                    let isCurrentPage = false;
                    if (activeTabIndex === 0) {
                      if (claimSetupState.isOpen || showClubSetup) isCurrentPage = i === 1;
                      else if (clubsLevel === 2) isCurrentPage = i === 2;
                      else if (clubsLevel === 1) isCurrentPage = i === 1;
                      else isCurrentPage = i === 0;
                    } else if (activeTabIndex === 1) {
                      if (isActivityOpen) isCurrentPage = i === 2;
                      else isCurrentPage = i === 1;
                    } else {
                      isCurrentPage = activeTabIndex === i;
                    }

                    return (
                      <View
                        key={tab.name}
                        style={[styles.page, { width }]}
                        pointerEvents={isCurrentPage || activeTabIndex === i ? 'auto' : 'none'}
                        aria-hidden={!isCurrentPage}
                        accessibilityElementsHidden={!isCurrentPage}
                        importantForAccessibility={isCurrentPage ? 'auto' : 'no-hide-descendants'}>
                        {isShowingClubSetup ? (
                          <CompleteClubProfileView
                            code={claimSetupState.code ?? cachedSetupCode}
                            onBack={handleBackFromSetup}
                            onSuccess={handleSuccessFromSetup}
                          />
                        ) : isShowingClubDetail ? (
                          <ClubDetailView clubId={activeClubId!} />
                        ) : isShowingClubs ? (
                          <ClubsDirectoryView />
                        ) : isShowingActivity ? (
                          <DiningActivityView />
                        ) : descriptor ? (
                          <TabContext.Provider value={descriptor.options}>
                            {descriptor.render()}
                          </TabContext.Provider>
                        ) : null}
                      </View>
                    );
                  })}
                </Animated.View>
              </GestureDetector>
            </View>
          </StarfieldContext.Provider>
        </TabPagerPriorityProvider>
      </ClubsNavigationProvider>
    </DiningActivityProvider>
  );
}

function BottomBar({
  children,
  style,
  translateY,
  ...props
}: TabListProps & { translateY?: SharedValue<number> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    const ty = translateY ? translateY.value : 0;
    return {
      transform: [{ translateY: ty }],
      opacity: ty > 60 ? 0 : 1 - ty / 60,
    };
  });

  return (
    <Animated.View style={[styles.bottomBarWrapper, animatedStyle]}>
      {/* Signature Calvin Gold rule with 33° brand scaffolding accent separating bottom bar from the screen */}
      <View style={styles.ruleContainer}>
        <View style={styles.rule} />
        <View style={styles.ruleAccent} />
      </View>

      <View
        {...props}
        style={[
          styles.bar,
          {
            backgroundColor: theme.backgroundElement,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
          style,
        ]}>
        {children}
      </View>
    </Animated.View>
  );
}

/**
 * Individual Animated Bottom Tab Bar Button
 *
 * WHY DIRECT PATHNAME SYNCHRONIZATION (effectivelyFocused = meta.href === pathname)?
 * Expo Router's `<TabTrigger>` injects an `isFocused` boolean. However, if any subpage
 * or modal window opens or dismisses, React Navigation's internal state can dispatch
 * unrouted window restore events that set `isFocused = true` on the initial route (Index 0).
 * By evaluating `meta.href === pathname`, the visual active state is 100% strictly bound
 * to the actual active URL route. It is impossible for two tabs to ever illuminate at once.
 *
 * MOTION DESIGN:
 * - Spring Pop: Uses a bouncy spring (damping 14, stiffness 170, mass 0.6) that pops
 *   the icon up to 1.16 scale before settling at 1.0.
 * - Vertical Lift: Lifts the active icon from y: 6 up to y: -1 to make room for the text label.
 * - Dual Icon Layers: Cross-fades between the muted outline icon and tinted solid icon.
 */
function TabButton({
  meta,
  index,
  activeTabIndex,
  isFocused: _isFocused,
  ...props
}: TabTriggerSlotProps & { meta: TabMeta; index: number; activeTabIndex: number }) {
  const theme = useTheme();
  const tabNav = useTabNavigation();
  const effectivelyFocused = activeTabIndex === index;
  const progress = useSharedValue(effectivelyFocused ? 1 : 0);

  const effectivelyFocusedRef = useRef(effectivelyFocused);
  effectivelyFocusedRef.current = effectivelyFocused;

  useEffect(() => {
    if (AppState.currentState === 'active') {
      progress.value = withSpring(effectivelyFocused ? 1 : 0, {
        damping: 14,
        stiffness: 170,
        mass: 0.6,
      });
    } else {
      cancelAnimation(progress);
      progress.value = effectivelyFocused ? 1 : 0;
    }
  }, [effectivelyFocused, progress]);

  // Cleanly snap progress to current focus on foreground resume (recovering any frozen background springs)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        cancelAnimation(progress);
        progress.value = effectivelyFocusedRef.current ? 1 : 0;
      }
    });
    return () => sub.remove();
  }, [progress]);

  const iconContainerAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Spring pop on selection: scales up to ~1.16 before settling to 1.0
    const scale = interpolate(p, [0, 0.55, 1], [0.94, 1.16, 1.0]);
    // Smooth vertical lift: centered at y: 6 when inactive, lifted to y: -1 when active
    const translateY = interpolate(p, [0, 1], [6, -1]);

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.3, 1], [0, 0.4, 1]),
      transform: [
        { translateY: interpolate(p, [0, 1], [6, 0]) },
        { scale: interpolate(p, [0, 1], [0.8, 1]) },
      ],
    };
  });

  const handlePress = (e: GestureResponderEvent) => {
    e.preventDefault?.();
    tabNav?.navigateToTab(index, meta.href);
    props.onPress?.(e);
  };

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!effectivelyFocused }}
      accessibilityLabel={meta.label}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={styles.tabContent}>
        <Animated.View style={[styles.iconWrapper, iconContainerAnimatedStyle]}>
          <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
            <Icon sf={meta.sf} md={meta.md} size={22} color={theme.textMuted} />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, activeIconStyle]}>
            <Icon
              sf={meta.sfActive ?? meta.sf}
              md={meta.mdActive ?? meta.md}
              size={22}
              color={theme.tint}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.labelWrapper, labelAnimatedStyle]}>
          <ThemedText style={[styles.label, { color: theme.tint }]} numberOfLines={1}>
            {meta.label}
          </ThemedText>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pagerContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0B0C0E',
  },
  pagerTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flex: 1,
    height: '100%',
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  ruleContainer: {
    width: '100%',
    height: 3,
    backgroundColor: Brand.gold,
    position: 'relative',
    overflow: 'hidden',
  },
  rule: {
    flex: 1,
    backgroundColor: Brand.gold,
  },
  ruleAccent: {
    position: 'absolute',
    left: '25%',
    width: 32,
    height: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ skewX: '-33deg' }],
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.one + 2,
    paddingHorizontal: Spacing.one,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
