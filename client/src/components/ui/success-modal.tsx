/**
 * Standard Success Confirmation Modal Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * In Knightly, major user accomplishments (e.g. successfully linking a club leadership code,
 * publishing a campus-wide event post, or submitting an RSVP) previously suffered from inconsistent
 * presentation patterns:
 * - Some flows (like Create Post) used a centered, animated spring modal popup over a dimmed backdrop.
 * - Other flows (like Club Claiming) swapped out the entire page with a full-screen success screen.
 *
 * Full-screen success replacements introduce jarring layout transitions, lose context of the underlying
 * form that was just completed, and complicate subpage gesture cancellation and camera gliding.
 *
 * UNIFIED SUCCESS TEMPLATE PATTERN:
 * This component standardizes all major success confirmations into a single, high-polish modal:
 * 1. Centered Floating Card: Floating over a semi-transparent dimmed backdrop (`rgba(0,0,0,0.72)`).
 * 2. Animated Spring Checkmark: Uses Reanimated spring physics (`damping: 11, stiffness: 160`) to pop
 *    a bold green checkmark inside an illuminated Renew Green halo ring (`rgba(162, 214, 131, 0.14)`).
 * 3. Clear Typography: Bold headline title paired with muted explanatory body text.
 * 4. Configurable Action Buttons: Accommodates single primary confirmation ("Got it") or dual-action
 *    flows (primary "View in Feed" + secondary "Got it").
 * 5. Accessibility & Dismissal: Accessible backdrop dismiss button and hardware Android back support.
 */

import { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SuccessModalButton = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  sf?: SfSymbolName;
  md?: MaterialSymbolName;
};

export type SuccessModalProps = {
  /** Whether the modal dialog is currently visible */
  visible: boolean;
  /** Primary headline title (e.g. "Post Published!" or "You're Linked to Abstraction!") */
  title: string;
  /** Explanatory body text or custom React node */
  message?: string | React.ReactNode;
  /** Primary confirmation button (e.g. "Got it" or "View in Feed") */
  primaryButton?: SuccessModalButton;
  /** Optional secondary action button (e.g. "Got it" when primary is "View in Feed") */
  secondaryButton?: SuccessModalButton;
  /** Called when the backdrop is pressed or Android hardware back is triggered */
  onClose: () => void;
  /** Optional custom icon (defaults to checkmark) */
  icon?: {
    sf: SfSymbolName;
    md: MaterialSymbolName;
  };
  /** Optional custom accent color (defaults to Brand.renewGreen) */
  accentColor?: string;
  /** Optional custom container style */
  style?: StyleProp<ViewStyle>;
};

export function SuccessModal({
  visible,
  title,
  message,
  primaryButton,
  secondaryButton,
  onClose,
  icon = { sf: 'checkmark', md: 'check' },
  accentColor = Brand.renewGreen,
  style,
}: SuccessModalProps) {
  const theme = useTheme();
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  // Playful spring entrance for the icon ring whenever the modal becomes visible
  useEffect(() => {
    if (visible) {
      scale.value = 0.3;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 11, stiffness: 160, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, scale, opacity]);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Dimmed backdrop pressable to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />

        {/* Centered Modal Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: accentColor,
            },
            style,
          ]}
        >
          {/* Animated Spring Halo Ring & Icon */}
          <Animated.View style={[styles.checkContainer, animatedCheckStyle]}>
            <View
              style={[
                styles.checkRing,
                {
                  borderColor: accentColor,
                  backgroundColor:
                    accentColor === Brand.renewGreen
                      ? 'rgba(162, 214, 131, 0.14)'
                      : `${accentColor}1A`,
                },
              ]}
            >
              <Icon
                sf={icon.sf}
                md={icon.md}
                size={52}
                color={accentColor}
                weight="bold"
              />
            </View>
          </Animated.View>

          {/* Headline Title */}
          <ThemedText type="headline" style={styles.title}>
            {title}
          </ThemedText>

          {/* Subtitle / Body Description */}
          {message ? (
            typeof message === 'string' ? (
              <ThemedText
                type="default"
                themeColor="textMuted"
                style={styles.subtitle}
              >
                {message}
              </ThemedText>
            ) : (
              <View style={styles.customMessageContainer}>{message}</View>
            )
          ) : null}

          {/* Primary Action Button */}
          {primaryButton ? (
            <Button
              label={primaryButton.label}
              variant={primaryButton.variant ?? 'primary'}
              sf={primaryButton.sf}
              md={primaryButton.md}
              onPress={primaryButton.onPress}
              style={styles.primaryButton}
            />
          ) : null}

          {/* Secondary Action Button */}
          {secondaryButton ? (
            <Button
              label={secondaryButton.label}
              variant={secondaryButton.variant ?? 'secondary'}
              sf={secondaryButton.sf}
              md={secondaryButton.md}
              onPress={secondaryButton.onPress}
              style={styles.secondaryButton}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    borderWidth: 2,
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three + 4,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  checkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  checkRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
  },
  customMessageContainer: {
    marginTop: Spacing.two,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    marginTop: Spacing.four,
  },
  secondaryButton: {
    width: '100%',
    marginTop: Spacing.two,
  },
});
