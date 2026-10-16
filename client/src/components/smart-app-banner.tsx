/**
 * Smart App Banner Component (Option A - Progressive Web Access)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Displayed exclusively on mobile web browsers (< 768px viewports).
 *
 * WHY NON-BLOCKING BANNER:
 * When students click shared links (from campus email, Discord, or GroupMe),
 * hard-blocking with a "Download App" wall causes massive drop-off (>70%).
 * Instead, this banner provides a zero-friction, full-fidelity web experience
 * while gracefully inviting students to install the native app for hardware-level
 * perks (turnstile barcode brightness boost, push alerts, and offline caching).
 *
 * DISMISSAL MEMORY:
 * User dismissal is persisted in browser localStorage (`knightly_app_banner_dismissed`)
 * so repeat visits remain clean and unobstructed.
 */

import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export const SMART_APP_BANNER_STORAGE_KEY = 'knightly_app_banner_dismissed';
export const SMART_APP_BANNER_HEIGHT = 44;

/**
 * Returns true if the user previously dismissed the mobile web app banner.
 */
export function isSmartAppBannerDismissed(): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(SMART_APP_BANNER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

export interface SmartAppBannerProps {
  onDismiss?: () => void;
}

export function SmartAppBanner({ onDismiss }: SmartAppBannerProps = {}) {
  const { isMobileWeb } = useResponsiveLayout();

  const [isDismissed, setIsDismissed] = useState(() => isSmartAppBannerDismissed());

  // Do not render if not mobile web or user previously dismissed
  if (!isMobileWeb || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SMART_APP_BANNER_STORAGE_KEY, 'true');
      } catch {}
    }
    onDismiss?.();
  };

  const handleOpenApp = () => {
    // Attempt opening custom scheme or fallback to info page
    Linking.openURL('https://calvin.edu/knightly').catch(() => {});
  };

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.innerRow}>
        <View style={styles.iconBox}>
          <Icon sf="sparkles" md="auto_awesome" size={16} color={Brand.gold} />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title} numberOfLines={1}>
            Get the Knightly App
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            Offline ID barcode & campus push alerts
          </ThemedText>
        </View>

        <Pressable
          onPress={handleOpenApp}
          accessibilityRole="button"
          accessibilityLabel="Get Knightly App"
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <ThemedText style={styles.actionText}>Get App</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss app banner"
          hitSlop={8}
          style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}
        >
          <Icon sf="xmark" md="close" size={14} color="rgba(255, 255, 255, 0.7)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#1B2028',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 176, 25, 0.3)',
    paddingHorizontal: Spacing.two + 2,
    height: SMART_APP_BANNER_HEIGHT,
    justifyContent: 'center',
    zIndex: 30,
    width: '100%',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 4,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(232, 176, 25, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    lineHeight: 13,
  },
  actionButton: {
    backgroundColor: Brand.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    flexShrink: 0,
  },
  actionText: {
    color: '#0B0C0E',
    fontSize: 11,
    fontWeight: '700',
  },
  dismissButton: {
    padding: 4,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
