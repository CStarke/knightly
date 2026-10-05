import { type PropsWithChildren } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
}>;

/**
 * Standardized Edge-to-Edge Modal Dialog Wrapper
 *
 * Guarantees true Android full-bleed status bar and navigation bar translucency,
 * full-height dimmed backdrop (rgba(0,0,0,0.72)), accessible dismiss pressable,
 * and a centered floating modal card.
 */
export function ModalDialog({
  visible,
  onClose,
  onRequestClose,
  backdropStyle,
  cardStyle,
  dismissOnBackdropPress = true,
  children,
}: ModalDialogProps) {
  const theme = useTheme();

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
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            cardStyle,
          ]}
        >
          {children}
        </View>
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
