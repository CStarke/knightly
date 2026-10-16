import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ModalDialogProps = PropsWithChildren<{
  /** Whether the modal dialog is currently visible */
  visible: boolean;
  /** Invoked when backdrop is tapped or dialog is dismissed */
  onClose: () => void;
  /** Optional separate handler for Android hardware back button */
  onRequestClose?: () => void;
  /** Optional custom styling for the outer backdrop view */
  backdropStyle?: StyleProp<ViewStyle>;
  /** Optional custom styling for the inner card container */
  cardStyle?: StyleProp<ViewStyle>;
  /** Whether tapping the backdrop triggers onClose (defaults to true) */
  dismissOnBackdropPress?: boolean;
  /** Whether the modal dialog should automatically raise when the software keyboard is active (defaults to true) */
  avoidKeyboard?: boolean;
}>;

import {
  calculateModalKeyboardLift,
  type ModalKeyboardLiftParams,
} from '@/utils/modal-keyboard';

export { calculateModalKeyboardLift, type ModalKeyboardLiftParams };

/**
 * Standardized Edge-to-Edge Modal Dialog Wrapper
 *
 * Guarantees true Android full-bleed status bar and navigation bar translucency,
 * full-height dimmed backdrop (rgba(0,0,0,0.72)), accessible dismiss pressable,
 * fluid 60fps soft-keyboard elevation (guaranteeing action buttons stay visible),
 * and a centered floating modal card.
 */
export function ModalDialog({
  visible,
  onClose,
  onRequestClose,
  backdropStyle,
  cardStyle,
  dismissOnBackdropPress = true,
  avoidKeyboard = true,
  children,
}: ModalDialogProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Track rendered card height dynamically via onLayout
  const [cardHeight, setCardHeight] = useState(0);
  const activeKeyboardHeightRef = useRef(0);
  const keyboardLift = useSharedValue(0);

  // Step 1: Smooth elevation animations
  const animateLift = useCallback(
    (kHeight: number, duration: number = 250) => {
      const targetLift = calculateModalKeyboardLift({
        windowHeight,
        keyboardHeight: kHeight,
        cardHeight,
        insetTop: insets.top,
      });

      keyboardLift.value = withTiming(targetLift, {
        duration: Math.max(150, duration),
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    },
    [cardHeight, insets.top, keyboardLift, windowHeight]
  );

  const animateLower = useCallback(
    (duration: number = 240) => {
      keyboardLift.value = withTiming(0, {
        duration: Math.max(150, duration),
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    },
    [keyboardLift]
  );

  // Step 2: Dynamically re-adjust lift if cardHeight updates while keyboard is active
  const handleCardLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && Math.abs(h - cardHeight) > 1) {
        setCardHeight(h);
        if (activeKeyboardHeightRef.current > 0) {
          const targetLift = calculateModalKeyboardLift({
            windowHeight,
            keyboardHeight: activeKeyboardHeightRef.current,
            cardHeight: h,
            insetTop: insets.top,
          });
          keyboardLift.value = withTiming(targetLift, {
            duration: 150,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
        }
      }
    },
    [cardHeight, insets.top, keyboardLift, windowHeight]
  );

  // Step 3: Listen to platform keyboard events (iOS, Android, and Web visualViewport)
  useEffect(() => {
    if (!visible || !avoidKeyboard) {
      keyboardLift.value = 0;
      activeKeyboardHeightRef.current = 0;
      return;
    }

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.visualViewport) {
        return;
      }
      const handleResize = () => {
        const vv = window.visualViewport;
        if (!vv) return;
        const diff = window.innerHeight - vv.height;
        if (diff > 100) {
          activeKeyboardHeightRef.current = diff;
          animateLift(diff, 250);
        } else {
          activeKeyboardHeightRef.current = 0;
          animateLower(240);
        }
      };
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
      };
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height ?? 300;
      const duration = e?.duration && e.duration > 0 ? e.duration : 250;
      activeKeyboardHeightRef.current = h;
      animateLift(h, duration);
    };

    const onHide = (e: any) => {
      const duration = e?.duration && e.duration > 0 ? e.duration : 240;
      activeKeyboardHeightRef.current = 0;
      animateLower(duration);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [animateLift, animateLower, avoidKeyboard, keyboardLift, visible]);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboardLift.value }],
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose ?? onClose}
    >
      <View style={[styles.backdrop, backdropStyle]}>
        {dismissOnBackdropPress && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />
        )}
        <Animated.View
          onLayout={handleCardLayout}
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            cardStyle,
            animatedCardStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export type ModalHeaderProps = {
  /** Modal headline title */
  title: string;
  /** Optional icon displayed beside title */
  icon?: {
    sf: SfSymbolName;
    md: MaterialSymbolName;
    color?: string;
  };
  /** Optional close callback (renders 'X' button on the right) */
  onClose?: () => void;
  /** Optional style override */
  style?: StyleProp<ViewStyle>;
};

/**
 * Standardized modal card header row with optional icon, bold title, and close button.
 */
export function ModalHeader({
  title,
  icon,
  onClose,
  style,
}: ModalHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.titleRow}>
        {icon && (
          <Icon
            sf={icon.sf}
            md={icon.md}
            size={18}
            color={icon.color ?? Brand.gold}
          />
        )}
        <ThemedText type="headline" style={styles.titleText}>
          {title}
        </ThemedText>
      </View>
      {onClose && (
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.closeBtn}
        >
          <Icon sf="xmark" md="close" size={18} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: undefined,
  },
  closeBtn: {
    padding: 4,
  },
});
