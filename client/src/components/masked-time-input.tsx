import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessoryButton } from '@/components/ui/accessory-button';
import { BlinkingCursor } from '@/components/ui/blinking-cursor';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatTimeSegments,
  getMaxTimeRawDigitLength,
} from '@/utils/date-format';
import { handleNumericKeyPress } from '@/utils/numeric-input';

export type MaskedTimeInputProps = {
  /** Raw numeric digits for the time input (e.g. "730", "1145") */
  value: string;
  /** Invoked when raw digits change */
  onChange: (raw: string) => void;
  /** Current 12-hour period */
  period: 'AM' | 'PM';
  /** Invoked when AM/PM toggle button is pressed */
  onTogglePeriod: () => void;
  /** Invoked on input focus */
  onFocus?: (e?: any) => void;
  /** Invoked on input blur */
  onBlur?: () => void;
  /** Whether the time input is in an error state */
  hasError?: boolean;
  /** Placeholder text shown when input is empty (e.g. "e.g. 7:00" or "e.g. 9:00") */
  placeholder?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
};

export type MaskedTimeInputRef = {
  focus: () => void;
  blur: () => void;
  setNativeValue: (value: string) => void;
  textInput: TextInput | null;
};

/**
 * Standardized Masked 12-Hour Time Input
 *
 * Encapsulates:
 * 1. Caret-hidden numeric keyboard input capturing raw keystrokes (0-9).
 * 2. Visual presentation layer displaying non-selectable formatted chunks (hour : minutes).
 * 3. Standardized BlinkingCursor indicating active caret position.
 * 4. AM / PM accessory toggle button.
 */
export const MaskedTimeInput = forwardRef<MaskedTimeInputRef, MaskedTimeInputProps>(
  function MaskedTimeInput(
    {
      value,
      onChange,
      period,
      onTogglePeriod,
      onFocus,
      onBlur,
      hasError = false,
      placeholder = 'e.g. 7:00',
      accessibilityLabel = 'Event time',
    },
    ref
  ) {
    const theme = useTheme();
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      setNativeValue: (val: string) => {
        if (inputRef.current) {
          const node = (inputRef.current as any)._node || (inputRef.current as any);
          if (node && 'value' in node) {
            node.value = val;
          }
        }
      },
      textInput: inputRef.current,
    }));

    const timeSegments = useMemo(() => formatTimeSegments(value), [value]);
    const maxDigits = useMemo(() => getMaxTimeRawDigitLength(value), [value]);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
      if (Platform.OS === 'web' && inputRef.current) {
        const node = (inputRef.current as any)._node || (inputRef.current as any);
        if (node && typeof node.setSelectionRange === 'function') {
          setTimeout(() => {
            try {
              node.setSelectionRange(node.value.length, node.value.length);
            } catch {}
          }, 0);
        }
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.maskedInputBox,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: hasError
                ? Brand.brightRed
                : isFocused
                ? Brand.gold
                : theme.border,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={value}
            selection={
              Platform.OS !== 'web' ? { start: value.length, end: value.length } : undefined
            }
            onChangeText={onChange}
            onKeyPress={handleNumericKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={maxDigits}
            caretHidden={true}
            selectionColor="transparent"
            autoCorrect={false}
            accessibilityLabel={accessibilityLabel}
            style={styles.invisibleInput}
          />

          <View pointerEvents="none" style={styles.maskedDisplayRow}>
            {value.length === 0 ? (
              <View style={styles.maskedPlaceholderRow}>
                {isFocused && (
                  <BlinkingCursor color={Brand.gold} style={styles.emptyCursorAbsolute} />
                )}
                <ThemedText style={[styles.maskedPlaceholderText, { color: theme.textMuted }]}>
                  {placeholder}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.maskedDigitsRow}>
                <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                  {timeSegments.part1}
                </ThemedText>
                {timeSegments.showColon && (
                  <ThemedText style={[styles.maskedSeparatorText, { color: theme.text }]}>
                    :
                  </ThemedText>
                )}
                <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                  {timeSegments.part2}
                </ThemedText>
                {isFocused && (
                  <BlinkingCursor color={Brand.gold} style={styles.trailingCursor} />
                )}
              </View>
            )}
          </View>
        </View>

        <AccessoryButton
          onPress={onTogglePeriod}
          accessibilityLabel={`Current time period is ${period}. Tap to toggle.`}
          style={styles.periodToggleBtn}
        >
          <ThemedText style={styles.periodToggleText}>{period}</ThemedText>
        </AccessoryButton>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  maskedInputBox: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  invisibleInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 2,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  maskedDisplayRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: Spacing.two + 4,
    right: Spacing.two + 4,
    justifyContent: 'center',
    zIndex: 1,
  },
  maskedPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  emptyCursorAbsolute: {
    position: 'absolute',
    left: 0,
  },
  maskedPlaceholderText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 4,
  },
  maskedDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maskedDigitText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  maskedSeparatorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginHorizontal: 0.5,
  },
  trailingCursor: {
    marginLeft: 2,
  },
  periodToggleBtn: {
    height: 40,
    minWidth: 40,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodToggleText: {
    color: Brand.gold,
    fontWeight: '700',
    fontSize: 13,
  },
});
