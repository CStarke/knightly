/**
 * Login Flight Container Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Renders the animated Calvin Maroon background container during login (AGENTS.md Rule 4.3):
 * - On desktop web: morphs smoothly into the floating rounded sidebar masthead.
 * - On mobile: vertically shrinks into the centered AppHeader with student initials avatar.
 * Includes the static layout measurement anchor and mobile Smart App Banner.
 */

import React from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Fonts, Spacing } from '@/constants/theme';

export type LoginFlightContainerProps = {
  isDesktopWeb: boolean;
  headerPaddingTop: number;
  activeInitials: string;
  isCollapsedLocally?: boolean;
  headerTargetRef: React.RefObject<ViewInstance | null>;
  mastheadHeight: SharedValue<number>;
  measurePositions: () => void;
  maroonContainerStyle: any;
  targetWordmarkStyle: any;
  headerDetailsStyle: any;
};

export function LoginFlightContainer({
  isDesktopWeb,
  headerPaddingTop,
  activeInitials,
  isCollapsedLocally = false,
  headerTargetRef,
  mastheadHeight,
  measurePositions,
  maroonContainerStyle,
  targetWordmarkStyle,
  headerDetailsStyle,
}: LoginFlightContainerProps) {
  return (
    <>
      {/* Static measurement anchor for Desktop Web docking coordinates */}
      {isDesktopWeb && (
        <View pointerEvents="none" style={styles.webTargetMeasurementAnchor}>
          <View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) mastheadHeight.value = h;
              measurePositions();
            }}
            style={styles.webSidebarMasthead}
          >
            <View style={styles.webSidebarMastheadTopRow}>
              <View
                ref={headerTargetRef as any}
                onLayout={measurePositions}
                style={[styles.webSidebarWordmarkRow, { opacity: 0 }]}
              >
                <ThemedText style={styles.webSidebarBrandTitle}>Knightly</ThemedText>
                <View style={styles.webSidebarGoldDot} />
              </View>
              <View style={[styles.webSidebarCollapseToggle, { opacity: 0 }]} />
            </View>
            <ThemedText style={[styles.webSidebarMastheadTagline, { opacity: 0 }]}>
              CALVIN UNIVERSITY
            </ThemedText>
          </View>
        </View>
      )}

      {/* Maroon Background Container */}
      <Animated.View style={[styles.maroonContainer, maroonContainerStyle]}>
        {isDesktopWeb ? (
          /* Web Sidebar Masthead */
          <View pointerEvents="none" style={styles.webSidebarContainer}>
            <View style={styles.webSidebarMasthead}>
              <View style={styles.webSidebarMastheadTopRow}>
                <Animated.View style={[styles.webSidebarWordmarkRow, targetWordmarkStyle]}>
                  <ThemedText style={styles.webSidebarBrandTitle}>Knightly</ThemedText>
                  <View style={styles.webSidebarGoldDot} />
                </Animated.View>

                <Animated.View
                  style={[styles.webSidebarCollapseToggle, headerDetailsStyle]}
                >
                  <Icon
                    sf={isCollapsedLocally ? 'pin' : 'sidebar.left'}
                    md={isCollapsedLocally ? 'push_pin' : 'menu_open'}
                    size={17}
                    color="rgba(255, 255, 255, 0.85)"
                  />
                </Animated.View>
              </View>

              <Animated.View style={headerDetailsStyle}>
                <ThemedText style={styles.webSidebarMastheadTagline}>
                  CALVIN UNIVERSITY
                </ThemedText>
              </Animated.View>
            </View>
          </View>
        ) : (
          /* Mobile AppHeader Container */
          <Animated.View
            pointerEvents="none"
            style={[styles.shrinkingHeaderContent, { paddingTop: headerPaddingTop }]}
          >
            <View style={styles.headerInner}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerTitleGroup}>
                  <Animated.View
                    ref={headerTargetRef as any}
                    onLayout={measurePositions}
                    style={[styles.headerWordmarkRow, targetWordmarkStyle]}
                  >
                    <ThemedText type="title" style={styles.headerTitleText}>
                      Knightly
                    </ThemedText>
                    <View style={styles.headerGoldDot} />
                  </Animated.View>

                  <Animated.View style={headerDetailsStyle}>
                    <ThemedText type="caption" style={styles.headerSubtitleText}>
                      CAMPUS COMMUNITY & FEED
                    </ThemedText>
                  </Animated.View>
                </View>

                <Animated.View style={[styles.headerAvatar, headerDetailsStyle]}>
                  <ThemedText type="smallBold" style={styles.headerAvatarText}>
                    {activeInitials}
                  </ThemedText>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  maroonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.maroon,
    overflow: 'hidden',
  },
  webTargetMeasurementAnchor: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 270,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1,
  },
  webSidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 270,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
  },
  webSidebarMasthead: {
    backgroundColor: Brand.maroon,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three + 2,
    paddingBottom: Spacing.three,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    gap: 4,
    shadowColor: Brand.maroonDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  webSidebarMastheadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webSidebarCollapseToggle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  webSidebarWordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  webSidebarBrandTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  webSidebarGoldDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    backgroundColor: Brand.gold,
    marginBottom: 4,
  },
  webSidebarMastheadTagline: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  shrinkingHeaderContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
  },
  headerInner: {
    paddingBottom: Spacing.two,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    gap: 2,
  },
  headerWordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerGoldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.gold,
    marginBottom: 5,
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
