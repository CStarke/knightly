import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
  /** Optional custom element rendered on the right side of the label row */
  rightElement?: ReactNode;
  /** Custom container style override */
  style?: StyleProp<ViewStyle>;
};

/**
 * Standardized form field label row:
 * Encapsulates uppercase section label, optional left icon, red required asterisk,
 * and dynamic character counter with warning color when exceeding limit.
 */
export function FieldLabel({
  label,
  icon,
  required = false,
  currentLength,
  maxLength,
  rightElement,
  style,
}: FieldLabelProps) {
  const theme = useTheme();

  const showCounter = currentLength !== undefined && maxLength !== undefined;
  const isOverLimit = showCounter && currentLength > maxLength;

  return (
    <View style={[styles.labelRow, style]}>
      <View style={styles.leftContainer}>
        {icon}
        <ThemedText type="caption" themeColor="textMuted" style={styles.labelText}>
          {label}
          {required ? (
            <ThemedText style={styles.requiredStar}> *</ThemedText>
          ) : null}
        </ThemedText>
      </View>

      {rightElement ? (
        rightElement
      ) : showCounter ? (
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
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  requiredStar: {
    color: Brand.brightRed,
    fontWeight: '700',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
