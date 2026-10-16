import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FieldLabelProps = {
  /** Label caption text (e.g. "POST TITLE", "DESCRIPTION", "PHOTO / BANNER") */
  label: string;
  /** Optional icon rendered to the left of label */
  icon?: ReactNode;
  /** Whether field is required (renders a bold red asterisk) */
  required?: boolean;
  /** Current character count */
  currentLength?: number;
  /** Maximum character count allowed */
  maxLength?: number;
  /** Optional info button or accessory element rendered directly beside the label text on the same line */
  infoButton?: ReactNode;
  /** Optional custom element rendered on the far right side of the label row */
  rightElement?: ReactNode;
  /** Custom container style override */
  style?: StyleProp<ViewStyle>;
};

/**
 * Standardized form field label row:
 * Encapsulates uppercase section label, optional left icon, red required asterisk,
 * optional inline info button directly beside the label, and dynamic character counter.
 */
export function FieldLabel({
  label,
  icon,
  required = false,
  currentLength,
  maxLength,
  infoButton,
  rightElement,
  style,
}: FieldLabelProps) {
  const theme = useTheme();

  const showCounter = currentLength !== undefined && maxLength !== undefined;
  const isOverLimit = showCounter && currentLength > maxLength;

  return (
    <View style={[styles.labelRow, style]}>
      {/* Left group: Icon, uppercase label, required asterisk, and inline info button on the same line */}
      <View style={styles.leftContainer}>
        {icon}
        <ThemedText type="caption" themeColor="textMuted" style={styles.labelText}>
          {label}
          {required ? (
            <Text style={styles.requiredStar}> *</Text>
          ) : null}
        </ThemedText>
        {infoButton}
      </View>

      {/* Right group: Dynamic character counter and optional right-aligned element */}
      {showCounter || rightElement ? (
        <View style={styles.rightContainer}>
          {showCounter ? (
            <ThemedText
              type="caption"
              style={[
                styles.counterText,
                { color: isOverLimit ? Brand.brightRed : theme.textMuted },
              ]}
            >
              {currentLength}/{maxLength}
            </ThemedText>
          ) : null}
          {rightElement}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  // WHAT: Horizontal linear container for left icon, label text, and inline info button.
  // WHY: Keeping them all as direct flex children with alignItems: 'center' and natural font metrics
  // guarantees they sit on the exact same horizontal line without artificial translateY offsets.
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    letterSpacing: 0.8,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: undefined,
  },
  requiredStar: {
    color: Brand.brightRed,
    fontWeight: '700',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: undefined,
  },
});
