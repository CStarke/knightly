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
import { BackHandler, Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { AppHeader } from '@/components/ui/app-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { getTabHeader } from '@/constants/tab-headers';
import { Brand, Spacing } from '@/constants/theme';
import { DiningActivityProvider } from '@/context/dining-activity-context';
import { ClubsNavigationProvider } from '@/context/clubs-navigation-context';
import { TabPagerPriorityProvider } from '@/context/tab-pager-priority-context';
import { StarfieldContext } from '@/context/starfield-context';
import { getClubById } from '@/data/clubs';
import { useTheme } from '@/hooks/use-theme';

type TabMeta = {
  name: string;
  href: '/' | '/dining' | '/safety' | '/directory';
  label: string;
  sf: SfSymbolName;
  sfActive?: SfSymbolName;
  md: MaterialSymbolName;
  mdActive?: MaterialSymbolName;
};

const TABS: TabMeta[] = [
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

/** Ease-out curve for programmatic tab taps. */
const CURVE = Easing.bezier(0.22, 1, 0.36, 1);
const DURATION = 320;

function getRouteName(href: string): string {
  if (href === '/') return 'index';
  return href.replace(/^\//, '');
}

const dismissKeyboard = () => {
  Keyboard.dismiss();
};

export default function AppTabs() {
  const bottomBarTranslateY = useSharedValue(0);

  return (
    <Tabs>
      <SwipeableTabPager bottomBarTranslateY={bottomBarTranslateY} />

      <TabList asChild>
        <BottomBar translateY={bottomBarTranslateY}>
          {TABS.map((meta) => (
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
function SwipeableTabPager({ bottomBarTranslateY }: { bottomBarTranslateY: SharedValue<number> }) {
  const { state, descriptors } = Navigator.useContext();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const tabIndex = TABS.findIndex((tab) => tab.href === pathname);
  // Only update active tab index when pathname matches an actual tab.
  const [activeIndex, setActiveIndex] = useState(() => (tabIndex >= 0 ? tabIndex : 0));
  const [headerIndex, setHeaderIndex] = useState(() => (tabIndex >= 0 ? tabIndex : 0));

  // Activity view state (inline sub-page next to Dining)
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const isActivityOpenShared = useSharedValue(false);

  // Clubs navigation state (inline sub-pages on Knightly Home)
  // Level 0: Knightly Home feed
  // Level 1: Campus Clubs directory
  // Level 2: Individual Club detail
  const [clubsLevel, setClubsLevel] = useState<0 | 1 | 2>(0);
  const [showClubsDirectory, setShowClubsDirectory] = useState(false);
  const [showClubDetail, setShowClubDetail] = useState(false);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const clubsLevelShared = useSharedValue<number>(0);

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
      // When navigated to any tab other than Knightly, Clubs sub-pages must be completely closed
      if (tabIndex !== 0 && clubsLevelShared.value > 0) {
        clubsLevelShared.value = 0;
        setClubsLevel(0);
        setShowClubsDirectory(false);
        setShowClubDetail(false);
        setActiveClubId(null);
        bottomBarTranslateY.value = 0;
      }
    }
  }, [tabIndex, bottomBarTranslateY, isActivityOpenShared, clubsLevelShared]);

  const translateX = useSharedValue(-activeIndex * width);
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const isGestureActive = useSharedValue(false);

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
        if (clubsLevelShared.value === 2) {
          translateX.value = -2 * width;
        } else if (clubsLevelShared.value === 1) {
          translateX.value = -1 * width;
        } else {
          translateX.value = 0;
        }
      } else if (pathname === '/dining') {
        translateX.value = isActivityOpenShared.value ? -2 * width : -1 * width;
      } else {
        translateX.value = -activeIndex * width;
      }
    }
  }, [width, activeIndex, pathname, translateX, isActivityOpenShared, clubsLevelShared]);

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

  const forceCloseSubpageStates = useCallback(() => {
    setIsActivityOpen(false);
    setShowActivity(false);
    isActivityOpenShared.value = false;

    setClubsLevel(0);
    setShowClubsDirectory(false);
    setShowClubDetail(false);
    setActiveClubId(null);
    clubsLevelShared.value = 0;

    bottomBarTranslateY.value = withTiming(0, { duration: 200, easing: CURVE });
  }, [bottomBarTranslateY, isActivityOpenShared, clubsLevelShared]);

  // Intercept Android hardware back button when Activity or Clubs sub-pages are open
  useEffect(() => {
    if (!isActivityOpen && clubsLevel === 0) return;

    const onBackPress = () => {
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
  }, [isActivityOpen, clubsLevel, closeClubDetail, closeClubsDirectory, closeActivity]);

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
    if (isActivityOpenShared.value || clubsLevelShared.value > 0) return;

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
      const target = TABS[targetIndex];
      if (target) {
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
        setActiveIndex(targetIndex);
        setHeaderIndex(targetIndex);
        if (targetIndex !== tabIndex) {
          lastGestureTarget.value = targetIndex;
          router.navigate(target.href);
        }
      }
    },
    [bottomBarTranslateY, isActivityOpenShared, clubsLevelShared, tabIndex, lastGestureTarget]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onStart(() => {
          'worklet';
          if (isInnerScrollActive.value) {
            isGestureActive.value = false;
            return;
          }
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
          if (isInnerScrollActive.value || !isGestureActive.value) return;

          const raw = startX.value + event.translationX;
          let minX = -(TABS.length - 1) * width;
          let maxX = 0;

          if (isActivityOpenShared.value) {
            minX = -2 * width;
            maxX = -1 * width;
          } else if (clubsLevelShared.value === 2) {
            minX = -2 * width;
            maxX = -1 * width;
          } else if (clubsLevelShared.value === 1) {
            minX = -1 * width;
            maxX = 0;
          }

          if (raw > maxX) {
            // Elastic resistance when dragging right past boundary
            const over = raw - maxX;
            translateX.value = maxX + over * 0.28;
          } else if (raw < minX) {
            // Elastic resistance when dragging left past boundary
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
              runOnJS(closeClubsDirectoryFromGesture)();
            }
            return;
          }

          let targetIndex = Math.round(rawIndex);

          // Natural flick handling in direction of velocity
          if (vx < -400 && Math.floor(rawIndex) < TABS.length - 1) {
            targetIndex = Math.floor(rawIndex) + 1;
          } else if (vx > 400 && Math.ceil(rawIndex) > 0) {
            targetIndex = Math.ceil(rawIndex) - 1;
          }

          targetIndex = Math.max(0, Math.min(TABS.length - 1, targetIndex));
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
          isInnerScrollActive.value = false;
        }),
    [
      width,
      onTabChange,
      closeActivityFromGesture,
      closeClubDetailFromGesture,
      closeClubsDirectoryFromGesture,
      forceCloseSubpageStates,
      translateX,
      startX,
      isGestureActive,
      isInnerScrollActive,
      isActivityOpenShared,
      clubsLevelShared,
    ]
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const activeClub = useMemo(() => {
    return activeClubId ? getClubById(activeClubId) : undefined;
  }, [activeClubId]);

  const currentTab = TABS[headerIndex] ?? TABS[0];
  const headerInfo = getTabHeader(currentTab.name);

  const headerProps = useMemo(() => {
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
                <Animated.View style={[styles.pagerTrack, { width: width * TABS.length }, style]}>
                  {TABS.map((tab, i) => {
                    const routeName = getRouteName(tab.href);
                    const route =
                      state.routes.find((r) => r.name === routeName || r.name === tab.name) ??
                      state.routes[i];
                    const descriptor = route ? descriptors[route.key] : undefined;

                    // Slot 1 renders ClubsDirectoryView ONLY when explicitly opened from Knightly
                    const isShowingClubs =
                      i === 1 && showClubsDirectory && pathname === '/' && activeIndex === 0;

                    // Slot 2 renders ClubDetailView when opened from Knightly, OR DiningActivityView when opened from Dining
                    const isShowingClubDetail =
                      i === 2 && showClubDetail && pathname === '/' && activeIndex === 0 && !!activeClubId;

                    const isShowingActivity =
                      i === 2 && showActivity && pathname === '/dining' && activeIndex !== 2;

                    let isCurrentPage = false;
                    if (pathname === '/' && activeIndex === 0) {
                      if (clubsLevel === 2) isCurrentPage = i === 2;
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
                        {isShowingClubDetail ? (
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

function TabButton({ meta, isFocused, ...props }: TabTriggerSlotProps & { meta: TabMeta }) {
  const theme = useTheme();
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 14,
      stiffness: 170,
      mass: 0.6,
    });
  }, [isFocused, progress]);

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
      accessibilityState={{ selected: !!isFocused }}
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
