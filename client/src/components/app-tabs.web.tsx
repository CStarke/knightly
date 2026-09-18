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
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/ui/app-header';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { getTabHeader } from '@/constants/tab-headers';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ClubsNavigationProvider } from '@/context/clubs-navigation-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import { DiningActivityProvider } from '@/context/dining-activity-context';
import { ImageCropperView, useImageCropper } from '@/context/image-cropper-context';
import { TabPagerPriorityProvider } from '@/context/tab-pager-priority-context';
import { StarfieldContext } from '@/context/starfield-context';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();
  const pathname = usePathname();
  const { isLeader, claimSetupState, cancelClaimSetup } = useClubLeadership();
  const {
    isOpen: isCropperOpen,
    activeOptions: cropperOptions,
    closeCropper,
    applyCrop,
    isProcessing: isCropperProcessing,
  } = useImageCropper();
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

  const headerProps = useMemo(() => {
    if (isCropperOpen && cropperOptions) {
      return {
        title: 'Crop Banner',
        subtitle: '16:9 Post Aspect Ratio',
        left: (
          <Pressable
            onPress={closeCropper}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingVertical: 6, paddingHorizontal: 4 }]}
          >
            <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
              Cancel
            </ThemedText>
          </Pressable>
        ),
        right: (
          <Pressable
            onPress={applyCrop}
            disabled={isCropperProcessing}
            style={({ pressed }) => [
              styles.doneHeaderButton,
              { backgroundColor: Brand.gold, opacity: isCropperProcessing ? 0.6 : pressed ? 0.8 : 1 },
            ]}
          >
            {isCropperProcessing ? (
              <ActivityIndicator size="small" color="#0B0C0E" />
            ) : (
              <ThemedText type="smallBold" style={styles.doneHeaderButtonText}>
                Done
              </ThemedText>
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
  }, [isCropperOpen, cropperOptions, closeCropper, applyCrop, isCropperProcessing, headerInfo, theme]);

  const diningActivityValue = useMemo(
    () => ({
      isActivityOpen: false,
      openActivity: () => {},
      closeActivity: () => {},
    }),
    []
  );

  const clubsNavigationValue = useMemo(
    () => ({
      clubsLevel: 0 as const,
      activeClubId: null,
      openClubsDirectory: () => {
        router.push('/clubs/index');
      },
      openClubDetail: (clubId: string) => {
        router.push({ pathname: '/clubs/[id]', params: { id: clubId } });
      },
      closeClubDetail: () => {
        router.back();
      },
      closeClubsDirectory: () => {
        router.back();
      },
    }),
    []
  );

  const isInnerScrollActive = useSharedValue(false);
  const tabPagerPriorityValue = useMemo(
    () => ({
      isInnerScrollActive,
      setInnerScrollActive: () => {},
    }),
    [isInnerScrollActive]
  );

  return (
    <DiningActivityProvider value={diningActivityValue}>
      <ClubsNavigationProvider value={clubsNavigationValue}>
        <TabPagerPriorityProvider value={tabPagerPriorityValue}>
          <StarfieldContext.Provider value={{ translateX, scrollY }}>
            <View style={{ flex: 1, position: 'relative' }}>
              <ParallaxStarfield translateX={translateX} scrollY={scrollY} />

          <Tabs>
            <TabList asChild>
              <TopBar>
                <TabTrigger name="knightly" href="/" asChild>
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
              title={headerProps.title}
              subtitle={headerProps.subtitle}
              left={headerProps.left}
              right={headerProps.right}
            />
            <TabSlot style={styles.slot} />
            {isCropperOpen && cropperOptions ? (
              <View style={[StyleSheet.absoluteFill, styles.cropperOverlay]}>
                <ImageCropperView
                  imageUri={cropperOptions.imageUri}
                  imageDimensions={cropperOptions.imageDimensions}
                  onClose={closeCropper}
                  onCropComplete={cropperOptions.onCropComplete}
                />
              </View>
            ) : null}
          </Tabs>
            </View>
          </StarfieldContext.Provider>
        </TabPagerPriorityProvider>
      </ClubsNavigationProvider>
    </DiningActivityProvider>
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
  cropperOverlay: {
    top: 56,
    backgroundColor: '#000000',
    zIndex: 100,
  },
  doneHeaderButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneHeaderButtonText: {
    color: '#0B0C0E',
    fontWeight: '700',
    fontSize: 13,
  },
});
