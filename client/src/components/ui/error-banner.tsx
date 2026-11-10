/**
 * Reusable Request Failure Error Banner & Card Template
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.5 & US-N07):
 * When backend network queries fail or time out, Knightly displays explicit, actionable
 * request-failure messages rather than silently failing or displaying empty screens.
 *
 * NON-NEGOTIABLE DOMAIN INVARIANTS:
 * 1. Actionable Retry: Every failure banner must provide a dedicated, accessible "Retry"
 *    action so students can immediately re-attempt network synchronization.
 * 2. Visual Differentiation:
 *    - 'banner': Compact alert bar rendered above feed streams when cached/seed data remains visible.
 *    - 'card': Prominent centered card rendered when no cached data exists and initial load fails.
 * 3. Centralized Palette Tokens: Consumes `Brand.brightRed` (#C2002F), `Brand.gold` (#E8B019),
 *    and theme tokens (`dangerSoft`, `text`, `textSecondary`, `border`) without inline hex drift.
 * 4. Accessibility Compliance: Enforces `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`.
 */

import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ErrorBannerVariant = 'banner' | 'card';

export interface ErrorBannerProps {
  /** Short headline summary (e.g. "Unable to connect to campus network"). */
  title?: string;
  /** Explanatory message detailing what occurred and suggesting next steps. */
  message?: string;
  /** Primary retry callback triggered when the student presses the retry button. */
  onRetry?: () => void | Promise<void>;
  /** Whether the retry network operation is actively in flight. */
  isRetrying?: boolean;
  /** Optional dismiss callback to clear the error banner. */
  onDismiss?: () => void;
  /** Presentation mode: 'banner' for top stream callouts, 'card' for empty view states. */
  variant?: ErrorBannerVariant;
  /** Text label for the retry button. Defaults to "Try Again". */
  retryLabel?: string;
  /** Custom container style overrides. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for automated test suites. */
  testID?: string;
}

export const DEFAULT_ERROR_TITLE = 'Unable to connect to campus network';
export const DEFAULT_ERROR_MESSAGE =
  "We couldn't reach the university servers. Please check your connection and try again.";

/**
 * Knightly Consolidated Request-Failure Banner and Error Card.
 */
export function ErrorBanner({
  title = DEFAULT_ERROR_TITLE,
  message = DEFAULT_ERROR_MESSAGE,
  onRetry,
  isRetrying = false,
  onDismiss,
  variant = 'banner',
  retryLabel = 'Try Again',
  style,
  testID = 'request-failure-banner',
}: ErrorBannerProps) {
  const theme = useTheme();

  const accessibilityDescription = `${title}. ${message}${
    onRetry ? '. Press Try Again to retry the request.' : ''
  }`;

  // ==========================================================================
  // Full Card Variant (e.g. in place of empty stream on hard network disconnect)
  // ==========================================================================
  if (variant === 'card') {
    return (
      <View testID={testID} style={styles.cardWrapper}>
        <Card style={[styles.cardRoot, style]}>
          <View
            accessible={true}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            accessibilityLabel={accessibilityDescription}
            style={styles.cardContent}
          >
          {/* Failure Alert Glyphs */}
          <View style={styles.cardIconWrapper}>
            <Icon
              sf="wifi.slash"
              md="wifi_off"
              size={32}
              color={Brand.brightRed}
            />
          </View>

          {/* Heading & Explanatory Body */}
          <ThemedText type="smallBold" style={styles.cardTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.cardSubtitle}
          >
            {message}
          </ThemedText>

          {/* Dedicated Retry Button */}
          {onRetry && (
            <View style={styles.cardActionRow}>
              <RefreshButton
                onRefresh={onRetry}
                refreshing={isRetrying}
                label={retryLabel}
                size="medium"
                variant="pill"
                color={Brand.brightRed}
                accessibilityLabel={`Retry request: ${retryLabel}`}
              />
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

  // ==========================================================================
  // Inline Callout Banner Variant (e.g. above feed stream with cached posts)
  // ==========================================================================
  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={accessibilityDescription}
      style={[
        styles.bannerRoot,
        {
          backgroundColor: theme.dangerSoft,
          borderColor: 'rgba(194, 0, 47, 0.35)',
        },
        style,
      ]}
    >
      <View style={styles.bannerLeft}>
        <Icon
          sf="exclamationmark.triangle.fill"
          md="warning"
          size={18}
          color={Brand.brightRed}
        />
        <View style={styles.bannerTextCol}>
          {title ? (
            <ThemedText type="smallBold" style={styles.bannerTitleText}>
              {title}
            </ThemedText>
          ) : null}
          <ThemedText
            type="caption"
            themeColor="textSecondary"
            style={styles.bannerMessageText}
          >
            {message}
          </ThemedText>
        </View>
      </View>

      <View style={styles.bannerActions}>
        {onRetry && (
          <RefreshButton
            onRefresh={onRetry}
            refreshing={isRetrying}
            label={retryLabel}
            size="small"
            variant="pill"
            color={Brand.brightRed}
            accessibilityLabel={`Retry failed request: ${retryLabel}`}
          />
        )}
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error message"
            style={({ pressed }) => [
              styles.dismissButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon sf="xmark" md="close" size={14} color={theme.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  bannerRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  bannerTextCol: {
    flex: 1,
    gap: 1,
  },
  bannerTitleText: {
    color: Brand.brightRed,
    fontSize: 13,
    lineHeight: 17,
  },
  bannerMessageText: {
    fontSize: 12,
    lineHeight: 16,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  dismissButton: {
    padding: Spacing.half,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: '100%',
  },
  cardRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  cardIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(194, 0, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  cardTitle: {
    textAlign: 'center',
    color: Brand.brightRed,
    fontSize: 15,
  },
  cardSubtitle: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  cardActionRow: {
    marginTop: Spacing.two,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
