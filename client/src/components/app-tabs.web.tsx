/**
 * ============================================================================
 * DESKTOP WEB TAB NAVIGATION LAYOUT (app-tabs.web.tsx)
 * ============================================================================
 *
 * WHY A SEPARATE WEB IMPLEMENTATION?
 * On mobile devices, Knightly uses a 1:1 physical gesture horizontal track (`app-tabs.tsx`).
 * On desktop web browsers, touch gestures are replaced by mouse clicks, keyboard navigation,
 * and standard URL address bar interactions:
 * 1. Semantic Web Routes: Uses Expo Router's `<Tabs>` and `<TabSlot>` directly so each
 *    tab renders at its canonical URL (`/`, `/dining`, `/safety`, `/directory`, `/post`).
 * 2. Top Navigation Bar: Replaces the mobile bottom thumb-bar with a centered, top-fixed
 *    desktop navigation header with Calvin branding and pill button triggers.
 * 3. Content Width Constraints: Centered with `maxWidth: MaxContentWidth` (1200px)
 *    to prevent stretched line lengths on ultrawide monitors.
 * 4. Overlay Subpages: Renders the photo cropper (`ImageCropperView`) as an in-tree
 *    overlay above the TabSlot rather than requiring horizontal gesture panning.
 */

import { router, usePathname } from 'expo-router';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/ui/app-header';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { getTabHeader } from '@/constants/tab-headers';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ClubsNavigationProvider } from '@/context/clubs-navigation-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import { DiningActivityProvider } from '@/context/dining-activity-context';
import { TabPagerPriorityProvider } from '@/context/tab-pager-priority-context';
import { StarfieldContext } from '@/context/starfield-context';
import {
  TabNavigationContext,
  useTabNavigation,
  type TabNavigationContextValue,
  type TabMeta,
} from '@/context/tab-navigation-context';
import { useTheme } from '@/hooks/use-theme';

export {
  TabNavigationContext,
  useTabNavigation,
  type TabNavigationContextValue,
  type TabMeta,
};

export default function AppTabs() {
  const pathname = usePathname();
  const { isLeader, claimSetupState, cancelClaimSetup } = useClubLeadership();
  const headerInfo = getTabHeader(pathname);
  const translateX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (claimSetupState.isOpen && claimSetupState.code) {
      const code = claimSetupState.code;
      cancelClaimSetup();
      router.push({
        pathname: '/complete-club-profile',
        params: { code },
      });
    }
  }, [claimSetupState.isOpen, claimSetupState.code, cancelClaimSetup]);

  const isInnerScrollActive = useSharedValue(false);

  const tabNavValue = useMemo<TabNavigationContextValue>(() => ({
    activeTabIndex: pathname === '/post' ? 4 : pathname === '/dining' ? 1 : pathname === '/safety' ? 2 : pathname === '/directory' ? 3 : 0,
    setActiveTabIndex: () => {},
    navigateToTab: (targetIndex: number, targetHref?: string) => {
      const href = targetHref || '/';
      router.navigate(href as any);
    },
    tabs: [],
  }), [pathname]);

  return (
    <TabNavigationContext.Provider value={tabNavValue}>
      <DiningActivityProvider value={{
        isActivityOpen: false,
        openActivity: () => {},
        closeActivity: () => {},
      }}>
        <ClubsNavigationProvider value={{
          clubsLevel: 0 as const,
          activeClubId: null,
          openClubsDirectory: () => { router.push('/clubs/index'); },
          openClubDetail: (clubId: string) => { router.push({ pathname: '/clubs/[id]', params: { id: clubId } }); },
          closeClubDetail: () => { router.back(); },
          closeClubsDirectory: () => { router.back(); },
        }}>
          <TabPagerPriorityProvider value={{
            isInnerScrollActive,
            setInnerScrollActive: () => {},
          }}>
            <StarfieldContext.Provider value={{ translateX, scrollY }}>
              <View style={{ flex: 1, position: 'relative' }}>
                <ParallaxStarfield translateX={translateX} scrollY={scrollY} />

                <Tabs>
                  <TabList asChild>
                    <TopBar>
                      <TabTrigger name="index" href="/" asChild>
                        <TabButton>Knightly</TabButton>
                      </TabTrigger>
                      <TabTrigger name="dining" href="/dining" asChild>
                        <TabButton>Dining</TabButton>
                      </TabTrigger>
                      <TabTrigger name="safety" href="/safety" asChild>
                        <TabButton>Safety</TabButton>
                      </TabTrigger>
                      <TabTrigger name="directory" href="/directory" asChild>
                        <TabButton>Directory</TabButton>
                      </TabTrigger>
                      {isLeader ? (
                        <TabTrigger name="post" href="/post" asChild>
                          <TabButton>Post</TabButton>
                        </TabTrigger>
                      ) : null}
                    </TopBar>
                  </TabList>

                  <AppHeader
                    title={headerInfo.title}
                    subtitle={headerInfo.subtitle}
                    left={undefined}
                    right={headerInfo.right}
                  />
                  <TabSlot style={styles.slot} />
                </Tabs>
              </View>
            </StarfieldContext.Provider>
          </TabPagerPriorityProvider>
        </ClubsNavigationProvider>
      </DiningActivityProvider>
    </TabNavigationContext.Provider>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButton,
          isFocused && { backgroundColor: theme.tintSoft },
        ]}>
        <ThemedText type="smallBold" style={{ color: isFocused ? theme.tint : theme.textSecondary }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function TopBar(props: TabListProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border },
      ]}>
      <View style={styles.barInner}>
        <View style={styles.brand}>
          <ThemedText type="title" style={styles.brandText}>Calvin</ThemedText>
          <View style={styles.dot} />
        </View>

        <View style={styles.tabs}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  bar: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  barInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  brandText: {
    letterSpacing: -0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.gold,
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
});
