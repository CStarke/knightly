import { Navigator, router, usePathname } from 'expo-router';
import {
  TabContext,
  TabList,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { Brand, Radius, Spacing } from '@/constants/theme';
import { DiningActivityProvider } from '@/context/dining-activity-context';
import { ClubsNavigationProvider } from '@/context/clubs-navigation-context';
import { TabPagerPriorityProvider } from '@/context/tab-pager-priority-context';
import { ImageCropperView, useImageCropper } from '@/context/image-cropper-context';
import { StarfieldContext } from '@/context/starfield-context';
import { getClubById } from '@/data/clubs';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tab metadata defining icons, route URLs, and accessibility labels.
 * Why both SF Symbols (iOS) and Material Symbols (Android/Web)?
 * Knightly adheres strictly to platform HIG: native iOS users expect Apple SF Symbols,
 * while Android and web users expect Material Design iconography. Dual-keying
 * ensures visual authenticity on every platform without compromise.
 */
type TabMeta = {
  name: string;
  href: '/' | '/dining' | '/post' | '/safety' | '/directory';
  label: string;
  sf: SfSymbolName;
  sfActive?: SfSymbolName;
  md: MaterialSymbolName;
  mdActive?: MaterialSymbolName;
};

/**
 * Standard 4-tab layout for regular campus students:
 * Knightly (Feed) -> Dining -> Safety -> Directory.
 */
const BASE_TABS: TabMeta[] = [
  {
    name: 'knightly',
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

/**
 * Extended 5-tab layout unlocked for verified Club Leaders:
 * Appends the dedicated "Post" tab (`/post`) as Slot 4.
 * Why dynamic tab lists?
 * Student organizations at Calvin need privileged publishing tools to post bulletins
 * and event notices, while standard students only consume information. Surfacing the
 * Post tab conditionally prevents clutter for regular students while giving leaders
 * instant, single-tap access to publishing workflows.
 */
const LEADER_TABS: TabMeta[] = [
  {
    name: 'knightly',
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
  {
    name: 'post',
    href: '/post',
    label: 'Post',
    sf: 'plus.circle.fill',
    md: 'add_circle',
  },
];

/**
 * Programmatic animation easing curve (iOS-style quintic ease-out cubic-bezier).
 * Used when a user taps a bottom bar button or hardware back button rather than swiping.
 * Duration is 320ms to allow eye tracking of the lateral camera pan without feeling sluggish.
 */
const CURVE = Easing.bezier(0.22, 1, 0.36, 1);
const DURATION = 320;

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

export default function AppTabs() {
  const bottomBarTranslateY = useSharedValue(0);
  const { isLeader } = useClubLeadership();
  const tabs = isLeader ? LEADER_TABS : BASE_TABS;

  return (
    <Tabs>
      <SwipeableTabPager bottomBarTranslateY={bottomBarTranslateY} tabs={tabs} />

      <TabList asChild>
        <BottomBar translateY={bottomBarTranslateY}>
          {tabs.map((meta) => (
            <TabTrigger key={meta.name} name={meta.name} href={meta.href} asChild>
              <TabButton meta={meta} />
            </TabTrigger>
          ))}
        </BottomBar>
      </TabList>
    </Tabs>
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
}: {
  bottomBarTranslateY: SharedValue<number>;
  tabs: TabMeta[];
}) {
  const { state, descriptors } = Navigator.useContext();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const tabIndex = tabs.findIndex((tab) => tab.href === pathname);
  // Only update active tab index when pathname matches an actual tab.
  const [activeIndex, setActiveIndex] = useState(() => (tabIndex >= 0 ? tabIndex : 0));
  const [headerIndex, setHeaderIndex] = useState(() => (tabIndex >= 0 ? tabIndex : 0));

  // Leadership claim setup state
  // Why useSharedValue alongside React state? Reanimated worklets running on the
  // native UI thread cannot read React state synchronously without crossing the JS bridge.
  // We mirror the boolean state into a shared value so gesture worklets make zero-latency routing decisions.
  const { isLeader, claimSetupState, cancelClaimSetup, completeClaimSetup } = useClubLeadership();
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
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const clubsLevelShared = useSharedValue<number>(0);

  // Photo cropper state (Slot 5 Phantom Tab adjacent to Create Post)
  // Why Slot 5? Placing the cropper at Slot 5 directly to the right of Create Post (Slot 4)
  // enables a native camera slide into the crop viewfinder and allows swiping right
  // back to Create Post to cancel, avoiding native OS modal window focus desync bugs.
  const {
    isOpen: isCropperOpen,
    activeOptions,
    closeCropper,
    applyCrop,
    isProcessing: isCropperProcessing,
  } = useImageCropper();
  const [showCropper, setShowCropper] = useState(false);
  const isCropperOpenShared = useSharedValue(false);

  useEffect(() => {
    isCropperOpenShared.value = isCropperOpen;
  }, [isCropperOpen, isCropperOpenShared]);

  useEffect(() => {
    if (tabIndex >= 0) {
      setActiveIndex(tabIndex);
      setHeaderIndex(tabIndex);
      // When navigated to any tab other than Dining, Activity must be completely closed
      if (tabIndex !== 1 && isActivityOpenShared.value) {
        isActivityOpenShared.value = false;
        setIsActivityOpen(false);
        setShowActivity(false);
        bottomBarTranslateY.value = 0;
      }
      // When navigated to any tab other than Knightly, Clubs sub-pages & setup must be completely closed
      if (tabIndex !== 0 && (clubsLevelShared.value > 0 || claimSetupState.isOpen)) {
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
      // When navigated to any tab other than Post, Cropper must be completely closed
      if (tabIndex !== 4 && isCropperOpenShared.value) {
        closeCropper();
        isCropperOpenShared.value = false;
        setShowCropper(false);
        bottomBarTranslateY.value = 0;
      }
    }
  }, [tabIndex, bottomBarTranslateY, isActivityOpenShared, clubsLevelShared, isCropperOpenShared, claimSetupState.isOpen, cancelClaimSetup, closeCropper]);

  const translateX = useSharedValue(-activeIndex * width);
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const isGestureActive = useSharedValue(false);

  const blankAfterSlot = getBlankAfterSlot({
    pathname,
    activeIndex,
    isClaimSetupOpen: claimSetupState.isOpen,
    showClubSetup,
    clubsLevel,
    showClubsDirectory,
    showClubDetail,
    isActivityOpen,
    showActivity,
    hasActiveClubId: !!activeClubId,
    isCropperOpen,
    showCropper,
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

  // Avoid fighting the gesture spring when pathname updates after swipe release
  const lastGestureTarget = useSharedValue<number | null>(null);

  // Keep translateX in sync on screen rotation or resize
  const prevWidth = useRef(width);
  useEffect(() => {
    if (prevWidth.current !== width) {
      prevWidth.current = width;
      if (pathname === '/') {
        if (claimSetupState.isOpen) {
          translateX.value = -1 * width;
        } else if (clubsLevelShared.value === 2) {
          translateX.value = -2 * width;
        } else if (clubsLevelShared.value === 1) {
          translateX.value = -1 * width;
        } else {
          translateX.value = 0;
        }
      } else if (pathname === '/dining') {
        translateX.value = isActivityOpenShared.value ? -2 * width : -1 * width;
      } else if (pathname === '/post') {
        translateX.value = isCropperOpenShared.value ? -5 * width : -4 * width;
      } else {
        translateX.value = -activeIndex * width;
      }
    }
  }, [width, activeIndex, pathname, translateX, isActivityOpenShared, clubsLevelShared, isCropperOpenShared]);

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
        // It replaces the content in-place without jarring pan!
        clubsLevelShared.value = 1;
        setClubsLevel(1);
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
    cancelClaimSetup();
    if (source === 'banner') {
      // Returns to Campus Clubs directory at Slot 1
      clubsLevelShared.value = 1;
      setClubsLevel(1);
      setShowClubSetup(false);
    } else {
      // Returns to Knightly Home (Slot 0)
      clubsLevelShared.value = 0;
      setClubsLevel(0);
      isGestureActive.value = false;
      bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
      cancelAnimation(translateX);
      translateX.value = withTiming(0, { duration: DURATION, easing: CURVE }, () => {
        runOnJS(setShowClubSetup)(false);
      });
    }
  }, [claimSetupState.source, cancelClaimSetup, clubsLevelShared, bottomBarTranslateY, translateX, isGestureActive]);

  const handleDismissSetupFromGesture = useCallback(() => {
    cancelClaimSetup();
    clubsLevelShared.value = 0;
    setClubsLevel(0);
    isGestureActive.value = false;
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
    setTimeout(() => {
      setShowClubSetup(false);
    }, 350);
  }, [cancelClaimSetup, clubsLevelShared, isGestureActive, bottomBarTranslateY]);

  const handleSuccessFromSetup = useCallback(() => {
    completeClaimSetup();
    clubsLevelShared.value = 0;
    setClubsLevel(0);
    setShowClubsDirectory(false);
    setShowClubDetail(false);
    setActiveClubId(null);
    isGestureActive.value = false;
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
    cancelAnimation(translateX);
    translateX.value = withTiming(0, { duration: DURATION, easing: CURVE }, () => {
      runOnJS(setShowClubSetup)(false);
    });
  }, [completeClaimSetup, clubsLevelShared, bottomBarTranslateY, translateX, isGestureActive]);

  // Camera Pan effect when Cropper is activated
  useEffect(() => {
    if (isCropperOpen) {
      setShowCropper(true);
      cancelAnimation(translateX);
      isGestureActive.value = false;
      bottomBarTranslateY.value = withTiming(120, { duration: 260, easing: CURVE });
      translateX.value = withTiming(-5 * width, { duration: DURATION, easing: CURVE });
    }
  }, [isCropperOpen, width, translateX, isGestureActive, bottomBarTranslateY]);

  const handleCloseCropper = useCallback(() => {
    closeCropper();
    isGestureActive.value = false;
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
    cancelAnimation(translateX);
    translateX.value = withTiming(-4 * width, { duration: DURATION, easing: CURVE }, () => {
      runOnJS(setShowCropper)(false);
    });
  }, [closeCropper, bottomBarTranslateY, translateX, isGestureActive, width]);

  const handleCloseCropperFromGesture = useCallback(() => {
    closeCropper();
    isGestureActive.value = false;
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: CURVE });
    setTimeout(() => {
      setShowCropper(false);
    }, 350);
  }, [closeCropper, isGestureActive, bottomBarTranslateY]);

  const forceCloseSubpageStates = useCallback(() => {
    setIsActivityOpen(false);
    setShowActivity(false);
    isActivityOpenShared.value = false;

    if (claimSetupState.isOpen) {
      cancelClaimSetup();
    }
    setShowClubSetup(false);

    if (isCropperOpenShared.value) {
      closeCropper();
      setShowCropper(false);
      isCropperOpenShared.value = false;
    }

    setClubsLevel(0);
    setShowClubsDirectory(false);
    setShowClubDetail(false);
    setActiveClubId(null);
    clubsLevelShared.value = 0;

    bottomBarTranslateY.value = withTiming(0, { duration: 200, easing: CURVE });
  }, [bottomBarTranslateY, isActivityOpenShared, clubsLevelShared, claimSetupState.isOpen, cancelClaimSetup, isCropperOpenShared, closeCropper]);

  // Intercept Android hardware back button when Activity, Clubs, Setup, or Cropper are open
  useEffect(() => {
    if (!isActivityOpen && clubsLevel === 0 && !claimSetupState.isOpen && !isCropperOpen) return;

    const onBackPress = () => {
      if (isCropperOpen) {
        handleCloseCropper();
        return true;
      }
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
  }, [isActivityOpen, clubsLevel, claimSetupState.isOpen, isCropperOpen, handleCloseCropper, handleBackFromSetup, closeClubDetail, closeClubsDirectory, closeActivity]);

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

  // Animate smoothly when tab changes via bottom bar taps
  useEffect(() => {
    if (tabIndex < 0) return;
    if (isActivityOpenShared.value || clubsLevelShared.value > 0 || claimSetupState.isOpen) return;

    // If this pathname change was triggered by swipe release, skip since withSpring is already handling it
    if (lastGestureTarget.value === tabIndex) {
      lastGestureTarget.value = null;
      return;
    }
    lastGestureTarget.value = null;

    // Tapping a tab overrides any active gesture or settling spring
    cancelAnimation(translateX);
    isGestureActive.value = false;

    const targetX = -tabIndex * width;
    if (Math.abs(translateX.value - targetX) < 1) return;

    translateX.value = withTiming(targetX, { duration: DURATION, easing: CURVE });
  }, [tabIndex, width, translateX, isGestureActive, isActivityOpenShared, clubsLevelShared, lastGestureTarget]);

  const onTabChange = useCallback(
    (targetIndex: number) => {
      const target = tabs[targetIndex];
      if (target) {
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
        if (isCropperOpenShared.value) {
          closeCropper();
          isCropperOpenShared.value = false;
          setShowCropper(false);
          bottomBarTranslateY.value = withTiming(0, { duration: 200, easing: CURVE });
        }
        setActiveIndex(targetIndex);
        setHeaderIndex(targetIndex);
        if (targetIndex !== tabIndex) {
          lastGestureTarget.value = targetIndex;
          router.navigate(target.href);
        } else {
          const targetX = -targetIndex * width;
          if (Math.abs(translateX.value - targetX) >= 1) {
            cancelAnimation(translateX);
            isGestureActive.value = false;
            translateX.value = withTiming(targetX, { duration: DURATION, easing: CURVE });
          }
        }
      }
    },
    [bottomBarTranslateY, isActivityOpenShared, clubsLevelShared, isCropperOpenShared, closeCropper, claimSetupState.isOpen, cancelClaimSetup, tabIndex, lastGestureTarget, tabs, width, translateX, isGestureActive]
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
          if (!isActivityOpenShared.value && clubsLevelShared.value === 0 && !isCropperOpenShared.value) {
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
          if (isCropperOpenShared.value) {
            minX = -5 * width; // Slot 5 Cropper
            maxX = -4 * width; // Slot 4 Create Post
          } else if (isActivityOpenShared.value) {
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

          if (isCropperOpenShared.value) {
            // In Cropper mode, user can drag right back to Post (index 4)
            let targetIndex = 5; // stay on Cropper
            if (vx > 400 || rawIndex < 4.6) {
              targetIndex = 4; // back to Post
            }

            const targetX = -targetIndex * width;
            translateX.value = withSpring(targetX, {
              damping: 26,
              stiffness: 240,
              mass: 0.9,
              velocity: event.velocityX,
            });

            if (targetIndex === 4) {
              runOnJS(handleCloseCropperFromGesture)();
            }
            return;
          }

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
      handleCloseCropperFromGesture,
      forceCloseSubpageStates,
      translateX,
      startX,
      isGestureActive,
      isInnerScrollActive,
      isActivityOpenShared,
      clubsLevelShared,
      isClubSetupOpenShared,
      isCropperOpenShared,
    ]
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const activeClub = useMemo(() => {
    return activeClubId ? getClubById(activeClubId) : undefined;
  }, [activeClubId]);

  const currentTab = tabs[headerIndex] ?? tabs[0];
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

    if (pathname === '/post' && isCropperOpen) {
      return {
        title: 'Crop Banner',
        subtitle: '16:9 Post Aspect Ratio',
        left: (
          <HeaderBackButton
            onPress={handleCloseCropper}
            accessibilityLabel="Cancel photo crop"
          />
        ),
        right: (
          <Pressable
            onPress={applyCrop}
            disabled={isCropperProcessing}
            accessibilityRole="button"
            accessibilityLabel="Done cropping"
            style={styles.doneHeaderButton}
          >
            {isCropperProcessing ? (
              <ActivityIndicator size="small" color="#0B0C0E" />
            ) : (
              <ThemedText style={styles.doneHeaderButtonText}>Done</ThemedText>
            )}
          </Pressable>
        ),
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
    isCropperOpen,
    handleCloseCropper,
    applyCrop,
    isCropperProcessing,
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
                  Width is calculated dynamically:
                  - Regular students: width * 4 (Knightly, Dining, Safety, Directory)
                  - Club leaders: width * 6 (Knightly, Dining, Safety, Directory, Create Post, Photo Cropper)
                  Why extend the track for the Cropper?
                  Putting the cropper into Slot 5 allows the camera to slide naturally from Slot 4 to Slot 5
                  on photo selection, keeping the cropper fully inline without creating separate Modal windows.
                */}
                <Animated.View style={[styles.pagerTrack, { width: width * (isLeader ? tabs.length + 1 : tabs.length) }, style]}>
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
                      i === 1 && (claimSetupState.isOpen || showClubSetup) && pathname === '/' && activeIndex === 0;

                    const isShowingClubs =
                      i === 1 && showClubsDirectory && !claimSetupState.isOpen && !showClubSetup && pathname === '/' && activeIndex === 0;

                    // Slot 2 is hijacked for ClubDetailView (from Clubs) or DiningActivityView (from Dining).
                    const isShowingClubDetail =
                      i === 2 && showClubDetail && pathname === '/' && activeIndex === 0 && !!activeClubId;

                    const isShowingActivity =
                      i === 2 && showActivity && pathname === '/dining' && activeIndex !== 2;

                    // ACCESSIBILITY & FOCUS DETERMINATION:
                    // Only the visually active page should receive screen reader focus and allow tab-stops.
                    let isCurrentPage = false;
                    if (pathname === '/' && activeIndex === 0) {
                      if (claimSetupState.isOpen || showClubSetup) isCurrentPage = i === 1;
                      else if (clubsLevel === 2) isCurrentPage = i === 2;
                      else if (clubsLevel === 1) isCurrentPage = i === 1;
                      else isCurrentPage = i === 0;
                    } else if (pathname === '/dining') {
                      if (isActivityOpen) isCurrentPage = i === 2;
                      else isCurrentPage = i === 1;
                    } else {
                      isCurrentPage = activeIndex === i;
                    }

                    return (
                      <View
                        key={tab.name}
                        style={[styles.page, { width }]}
                        aria-hidden={!isCurrentPage}
                        accessibilityElementsHidden={!isCurrentPage}
                        importantForAccessibility={isCurrentPage ? 'auto' : 'no-hide-descendants'}>
                        {isShowingClubSetup ? (
                          <CompleteClubProfileView
                            code={claimSetupState.code ?? ''}
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
                  {isLeader ? (
                    <View
                      key="slot-5-cropper"
                      style={[styles.page, { width }]}
                      aria-hidden={!isCropperOpen}
                      accessibilityElementsHidden={!isCropperOpen}
                      importantForAccessibility={isCropperOpen ? 'auto' : 'no-hide-descendants'}>
                      {(isCropperOpen || showCropper) && activeOptions ? (
                        <ImageCropperView
                          imageUri={activeOptions.imageUri}
                          imageDimensions={activeOptions.imageDimensions}
                          onClose={handleCloseCropper}
                          onCropComplete={(croppedUri) => {
                            activeOptions.onCropComplete(croppedUri);
                            handleCloseCropper();
                          }}
                        />
                      ) : null}
                    </View>
                  ) : null}
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
function TabButton({ meta, isFocused, ...props }: TabTriggerSlotProps & { meta: TabMeta }) {
  const theme = useTheme();
  const pathname = usePathname();
  const effectivelyFocused = meta.href === pathname;
  const progress = useSharedValue(effectivelyFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(effectivelyFocused ? 1 : 0, {
      damping: 14,
      stiffness: 170,
      mass: 0.6,
    });
  }, [effectivelyFocused, progress]);

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

  return (
    <Pressable
      {...props}
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
  doneHeaderButton: {
    backgroundColor: Brand.gold,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  doneHeaderButtonText: {
    color: '#0B0C0E',
    fontSize: 14,
    fontWeight: '700',
  },
});
