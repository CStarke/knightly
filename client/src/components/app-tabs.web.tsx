/**
 * ============================================================================
 * DESKTOP WEB TAB NAVIGATION LAYOUT (app-tabs.web.tsx)
 * ============================================================================
 *
 * WHY A MENU SIDEBAR ON DESKTOP WEB?
 * Desktop monitors have wide landscape viewports (1280px-1920px+). On wide viewports,
 * horizontal header tabs force user eyes and mouse pointers to travel far up and across
 * the screen, leaving awkward empty space in the main content container.
 *
 * Switching to a fixed left sidebar:
 * 1. Ergonomic Mouse Navigation: Places primary navigation directly on the left rail,
 *    aligning with standard web app paradigms (Slack, Notion, Discord).
 * 2. Collegiate Branding & Context: Dedicates a regal Calvin Maroon masthead with the
 *    signature 33° scaffolding accent and collapsible toggle.
 * 3. Quick Springboards: Embeds direct access to Campus Clubs directory and personal student
 *    profile in the footer rail without requiring separate top-bar clicks.
 * 4. Content Area Expansion: Frees the entire right panel for rich multi-column grids
 *    (e.g. Knightly campus event cards) without header obstruction.
 * 5. Collapsible Layout: Enables students to collapse the sidebar into a focused 76px
 *    icon-only navigation rail to maximize reading and workspace width.
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
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HeaderAvatar } from '@/components/header-avatar';
import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { ClubsNavigationProvider, useClubsNavigation } from '@/context/clubs-navigation-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import { DiningActivityProvider } from '@/context/dining-activity-context';
import { TabPagerPriorityProvider } from '@/context/tab-pager-priority-context';
import { StarfieldContext } from '@/context/starfield-context';
import { student } from '@/data/student';
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

/**
 * Context for managing desktop sidebar expansion and collapse state.
 */
interface SidebarContextValue {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  toggleCollapse: () => {},
});

/**
 * Hook to access desktop sidebar collapse state and toggle handler.
 */
export function useSidebar() {
  return useContext(SidebarContext);
}

/**
 * Root desktop web layout hosting the left sidebar and main content slot.
 *
 * WHAT IT DOES:
 * - Initializes tab context, navigation providers, and collapsible sidebar state.
 * - Renders a side-by-side flex layout with a collapsible sidebar on the left and TabSlot on the right.
 * - Replaces the mobile horizontal gesture pager with direct URL-driven Expo Router `<Tabs>`.
 */
export default function AppTabs() {
  const pathname = usePathname();
  const { isLeader, claimSetupState, cancelClaimSetup } = useClubLeadership();
  const translateX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // Step 1: Manage collapsible sidebar state with persistent storage on web
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem('knightly_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('knightly_sidebar_collapsed', String(next));
        } catch {}
      }
      return next;
    });
  }, []);

  // Auto-redirect to claim profile if a leadership setup action was triggered
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

  // Synchronize TabNavigationContext with Expo Router web pathname
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
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapse }}>
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
                <View style={styles.rootWrapper}>
                  <ParallaxStarfield translateX={translateX} scrollY={scrollY} />

                  <Tabs style={styles.tabsLayout}>
                    {/* Left Desktop Navigation Menu Sidebar */}
                    <TabList asChild>
                      <Sidebar>
                        <TabTrigger name="index" href="/" asChild>
                          <SidebarTabButton
                            label="Knightly"
                            description="Campus events & feed"
                            sf="sparkles"
                            md="auto_awesome"
                          />
                        </TabTrigger>
                        <TabTrigger name="dining" href="/dining" asChild>
                          <SidebarTabButton
                            label="Dining"
                            description="Menus & meal plan"
                            sf="fork.knife"
                            md="restaurant"
                          />
                        </TabTrigger>
                        <TabTrigger name="safety" href="/safety" asChild>
                          <SidebarTabButton
                            label="Safety"
                            description="Campus safety & alerts"
                            sf="shield"
                            md="shield"
                          />
                        </TabTrigger>
                        <TabTrigger name="directory" href="/directory" asChild>
                          <SidebarTabButton
                            label="Directory"
                            description="Students, faculty & staff"
                            sf="person.2"
                            md="people"
                          />
                        </TabTrigger>
                        {isLeader ? (
                          <TabTrigger name="post" href="/post" asChild>
                            <SidebarTabButton
                              label="Post"
                              description="Publish announcement"
                              sf="plus.circle"
                              md="add_circle"
                            />
                          </TabTrigger>
                        ) : null}
                      </Sidebar>
                    </TabList>

                    {/* Main Screen Content Viewport (Right) */}
                    <View style={styles.contentArea}>
                      <TabSlot style={styles.slot} />
                    </View>
                  </Tabs>
                </View>
              </StarfieldContext.Provider>
            </TabPagerPriorityProvider>
          </ClubsNavigationProvider>
        </DiningActivityProvider>
      </TabNavigationContext.Provider>
    </SidebarContext.Provider>
  );
}

/**
 * Props for the desktop navigation sidebar container.
 */
type SidebarProps = TabListProps;

/**
 * Desktop navigation sidebar component rendered along the left edge of the screen.
 *
 * WHAT IT DOES:
 * - Renders Calvin Maroon masthead branding with collapsible toggle button.
 * - Animates width smoothly between 270px (expanded) and 76px (collapsed).
 * - Vertically stacks spacious, mature navigation tab triggers (`SidebarTabButton`).
 * - Houses quick-access links to Campus Clubs and Student Profile in the footer.
 */
function Sidebar({ children, ...props }: SidebarProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { openClubsDirectory } = useClubsNavigation();
  const { isCollapsed, toggleCollapse } = useSidebar();

  // Student profile display fallbacks
  const displayName = user?.fullName ?? `${student.firstName} ${student.lastName}`;
  const displayMajor = user?.major ?? student.major;

  // Animated sidebar width transition (glides smoothly between 270px expanded and 76px collapsed)
  const sidebarWidth = useSharedValue(isCollapsed ? 76 : 270);

  useEffect(() => {
    sidebarWidth.value = withTiming(isCollapsed ? 76 : 270, {
      duration: 240,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [isCollapsed, sidebarWidth]);

  const animatedSidebarStyle = useAnimatedStyle(() => ({
    width: sidebarWidth.value,
  }));

  return (
    <Animated.View
      {...props}
      style={[
        styles.sidebar,
        animatedSidebarStyle,
        {
          backgroundColor: theme.backgroundElement,
        },
      ]}
    >
      {/* Step 1: Calvin Maroon Masthead Branding */}
      {!isCollapsed ? (
        <View style={styles.masthead}>
          <View style={styles.mastheadTopRow}>
            <View style={styles.brandRow}>
              <ThemedText style={styles.brandTitle}>Knightly</ThemedText>
              <View style={styles.goldDot} />
            </View>

            {/* Collapse Sidebar Button */}
            <Pressable
              onPress={toggleCollapse}
              accessibilityRole="button"
              accessibilityLabel="Collapse sidebar"
              accessibilityHint="Shrinks sidebar into an icon-only navigation rail"
              {...Platform.select({ web: { title: 'Collapse sidebar' } as any })}
              style={({ pressed }) => [
                styles.collapseToggle,
                pressed && styles.togglePressed,
              ]}
            >
              <Icon sf="sidebar.left" md="menu_open" size={17} color="rgba(255, 255, 255, 0.85)" />
            </Pressable>
          </View>

          <ThemedText style={styles.mastheadTagline}>CALVIN UNIVERSITY</ThemedText>
        </View>
      ) : (
        <View style={[styles.masthead, styles.mastheadCollapsed]}>
          <View style={styles.brandRowCollapsed}>
            <ThemedText style={styles.brandTitleCollapsed}>K</ThemedText>
            <View style={styles.goldDotCollapsed} />
          </View>

          {/* Expand Sidebar Button */}
          <Pressable
            onPress={toggleCollapse}
            accessibilityRole="button"
            accessibilityLabel="Expand sidebar"
            accessibilityHint="Expands sidebar to show full navigation labels"
            {...Platform.select({ web: { title: 'Expand sidebar' } as any })}
            style={({ pressed }) => [
              styles.collapseToggle,
              styles.collapseToggleCollapsed,
              pressed && styles.togglePressed,
            ]}
          >
            <Icon sf="sidebar.right" md="menu" size={16} color="rgba(255, 255, 255, 0.85)" />
          </Pressable>
        </View>
      )}

      {/* Step 2: Main Navigation Links */}
      <View style={[styles.navSection, isCollapsed && styles.navSectionCollapsed]}>
        {!isCollapsed && (
          <View style={styles.sectionHeadingRow}>
            <ThemedText
              type="caption"
              style={[styles.sectionHeading, { color: theme.textMuted }]}
            >
              PORTAL
            </ThemedText>
          </View>
        )}
        {children}
      </View>

      {/* Step 3: Sidebar Quick Action Footer */}
      {!isCollapsed ? (
        <View style={styles.footer}>
          {/* Campus Clubs Directory Quick Link Button */}
          <Pressable
            onPress={openClubsDirectory}
            accessibilityRole="button"
            accessibilityLabel="Open Campus Clubs Directory - Student organizations and communities"
            {...Platform.select({ web: { title: 'Open Campus Clubs Directory' } as any })}
            style={({ pressed }) => [
              styles.clubsButton,
              {
                backgroundColor: theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.clubsIconBox}>
              <Icon sf="person.2.badge.gearshape" md="group" size={16} color={Brand.gold} />
            </View>
            <View style={styles.clubsCol}>
              <ThemedText style={[styles.clubsButtonTitle, { color: theme.text }]}>
                Campus Clubs Directory
              </ThemedText>
              <ThemedText style={[styles.clubsButtonSubtitle, { color: theme.textMuted }]}>
                Student orgs & communities
              </ThemedText>
            </View>
            <Icon sf="chevron.right" md="chevron_right" size={14} color={theme.textMuted} />
          </Pressable>

          {/* Authenticated Student Profile Strip */}
          <View style={styles.profileRow}>
            <HeaderAvatar />
            <View style={styles.profileMeta}>
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={[styles.profileName, { color: theme.text }]}
              >
                {displayName}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={[styles.profileMajor, { color: theme.textMuted }]}
              >
                {displayMajor}
              </ThemedText>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.footer, styles.footerCollapsed]}>
          {/* Collapsed Campus Clubs Directory Quick Link Button */}
          <Pressable
            onPress={openClubsDirectory}
            accessibilityRole="button"
            accessibilityLabel="Open Campus Clubs Directory"
            {...Platform.select({ web: { title: 'Campus Clubs Directory — Student orgs & communities' } as any })}
            style={({ pressed }) => [
              styles.clubsButtonCollapsed,
              {
                backgroundColor: pressed ? theme.backgroundSelected : 'rgba(232, 176, 25, 0.1)',
              },
              pressed && styles.pressed,
            ]}
          >
            <Icon sf="person.2.badge.gearshape" md="group" size={18} color={Brand.gold} />
          </Pressable>

          {/* Collapsed Student Avatar */}
          <View
            style={styles.profileCollapsed}
            {...Platform.select({ web: { title: `${displayName} • ${displayMajor}` } as any })}
          >
            <HeaderAvatar />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Props for each individual desktop sidebar navigation tab button.
 */
type SidebarTabButtonProps = TabTriggerSlotProps & {
  label: string;
  description?: string;
  sf: SfSymbolName;
  md: MaterialSymbolName;
};

/**
 * Single navigation row button within the desktop sidebar.
 * Automatically receives `isFocused` and `onPress` from Expo Router's `<TabTrigger asChild>`.
 */
function SidebarTabButton({
  label,
  description,
  sf,
  md,
  isFocused,
  ...props
}: SidebarTabButtonProps) {
  const theme = useTheme();
  const { isCollapsed } = useSidebar();

  if (isCollapsed) {
    return (
      <Pressable
        {...props}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${description ?? ''}`}
        accessibilityState={{ selected: !!isFocused }}
        {...Platform.select({
          web: { title: `${label}${description ? ` — ${description}` : ''}` } as any,
        })}
        style={({ pressed }) => [
          styles.tabButtonCollapsed,
          isFocused && [
            styles.tabButtonCollapsedFocused,
            {
              backgroundColor: theme.tintSoft,
            },
          ],
          pressed && !isFocused && {
            backgroundColor: theme.backgroundSelected,
          },
        ]}
      >
        <Icon
          sf={sf}
          md={md}
          size={20}
          color={isFocused ? (theme.tint ?? Brand.maroon) : theme.textMuted}
        />
        {isFocused && <View style={styles.activeDotCollapsed} />}
      </Pressable>
    );
  }

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        isFocused && [
          styles.tabButtonFocused,
          {
            backgroundColor: theme.tintSoft,
          },
        ],
        pressed && !isFocused && [
          styles.tabButtonPressed,
          {
            backgroundColor: theme.backgroundSelected,
          },
        ],
      ]}
    >
      {/* Mature Squircle Icon Badge */}
      <View
        style={[
          styles.tabIconBadge,
          {
            backgroundColor: isFocused
              ? Brand.maroon
              : theme.backgroundSelected,
          },
        ]}
      >
        <Icon
          sf={sf}
          md={md}
          size={17}
          color={isFocused ? '#FFFFFF' : theme.textSecondary}
        />
      </View>

      {/* Label and Caption */}
      <View style={styles.tabTextCol}>
        <ThemedText
          type="smallBold"
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.text : theme.text,
              fontWeight: isFocused ? '700' : '600',
            },
          ]}
        >
          {label}
        </ThemedText>
        {description ? (
          <ThemedText
            type="caption"
            style={[
              styles.tabDescription,
              {
                color: isFocused ? theme.textSecondary : theme.textMuted,
                opacity: isFocused ? 0.95 : 0.75,
              },
            ]}
            numberOfLines={1}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>

      {/* Subtle Trailing Calvin Gold Active Indicator Dot */}
      {isFocused && <View style={styles.activeDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  tabsLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  sidebar: {
    marginVertical: 12,
    marginLeft: 12,
    borderRadius: 20,
    borderWidth: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 20,
    flexShrink: 0,
    overflow: 'hidden',
    alignSelf: 'stretch',
    // Ambient soft elevation shadow giving the sidebar a floating appearance over the starfield
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  masthead: {
    backgroundColor: Brand.maroon,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three + 2,
    paddingBottom: Spacing.three,
    position: 'relative',
    overflow: 'hidden',
    gap: 4,
    borderBottomWidth: 0,
    // Soft elevation shadow separating the maroon masthead from the navigation list without harsh lines
    shadowColor: Brand.maroonDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  mastheadCollapsed: {
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 6,
  },
  mastheadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  goldDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    backgroundColor: Brand.gold,
    marginBottom: 4,
  },
  brandRowCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleCollapsed: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  goldDotCollapsed: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Brand.gold,
    marginBottom: 3,
    marginLeft: 2,
  },
  collapseToggle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  collapseToggleCollapsed: {
    marginTop: 2,
  },
  togglePressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    transform: [{ scale: 0.94 }],
  },
  mastheadTagline: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: 6,
  },
  navSectionCollapsed: {
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.three,
    alignItems: 'center',
    gap: 8,
  },
  sectionHeadingRow: {
    paddingHorizontal: 12,
    paddingTop: Spacing.one,
    paddingBottom: 6,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0,
    minHeight: 56,
  },
  tabButtonFocused: {
    shadowColor: Brand.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButtonPressed: {},
  tabButtonCollapsed: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
    borderWidth: 0,
  },
  tabButtonCollapsedFocused: {
    shadowColor: Brand.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  tabIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabTextCol: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    letterSpacing: -0.15,
  },
  tabDescription: {
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 0.05,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.gold,
    marginRight: 2,
    flexShrink: 0,
  },
  activeDotCollapsed: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.gold,
  },
  footer: {
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.three,
    borderTopWidth: 0,
    gap: Spacing.two + 2,
  },
  footerCollapsed: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    gap: Spacing.two,
  },
  clubsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0,
    // Ambient soft elevation shadow for floating pill appearance
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  clubsButtonCollapsed: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  clubsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(232, 176, 25, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  clubsCol: {
    flex: 1,
    gap: 1,
  },
  clubsButtonTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  clubsButtonSubtitle: {
    fontSize: 11,
    letterSpacing: 0,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  profileCollapsed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  profileMeta: {
    flex: 1,
    gap: 1,
  },
  profileName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  profileMajor: {
    fontSize: 11.5,
  },
  contentArea: {
    flex: 1,
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  slot: {
    flex: 1,
    height: '100%',
  },
  pressed: {
    opacity: 0.75,
  },
});
