import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BlinkingCursor } from '@/components/ui/blinking-cursor';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  expandTwoDigitYear,
  getMaxDaysForMonth,
  parseDateSegments,
} from '@/utils/date-format';

// ============================================================================
// Types & Contracts
// ============================================================================

export interface SegmentedDateInputProps {
  /** Raw digit string or formatted date string (e.g. "09182026" or "09 / 18 / 2026") */
  value: string;
  /** Invoked when raw digits change, providing both compact digits and structured segments */
  onChange: (rawDigits: string, segments?: { month: string; day: string; year: string }) => void;
  /** Invoked on input blur */
  onBlur?: (segments?: { month: string; day: string; year: string }) => void;
  /** Invoked on input focus */
  onFocus?: (e?: any) => void;
  /** Whether the field is in an error state (renders bright red border) */
  hasError?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional custom container styles */
  style?: StyleProp<ViewStyle>;
}

export type DateSegmentCellProps = {
  inputRef?: React.RefObject<TextInput | null>;
  value?: string;
  placeholder?: string;
  accessibilityLabel?: string;
  isFocused?: boolean;
  maxLength?: number;
  widthStyle?: any;
  disabled?: boolean;
  textColor?: string;
  placeholderColor?: string;
  onChangeText?: (text: string) => void;
  onKeyPress?: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  onFocus?: (e: any) => void;
  onBlur?: () => void;
};

export interface DateSegmentsMask {
  rawDigits: string;
  month: string;
  showSlash1: boolean;
  day: string;
  showSlash2: boolean;
  year: string;
  formatted: string;
}

// ============================================================================
// Display Formatter & Mask Pipeline
// ============================================================================

/**
 * Parses raw or partial date input into discrete display chunks with dynamic slashes.
 * Matches the seamless Claim Club modal masking architecture:
 * 1. Single-digit month (2-9) auto-pads immediately to 02..09 /
 * 2. Atomic rollover (16 -> 01 / 06 / , 13 -> 01 / 3) without intermediate visual flicker
 * 3. Day overflow cascading (1035 -> 10 / 03 / 5, 0230 -> 02 / 03 / 0)
 * 4. Delimited (slashes, hyphens, dots, spaces) and ISO 8601 compatibility
 */
export function formatRawDateSegments(rawInput: string): DateSegmentsMask {
  if (!rawInput || !rawInput.trim()) {
    return {
      rawDigits: '',
      month: '',
      showSlash1: false,
      day: '',
      showSlash2: false,
      year: '',
      formatted: '',
    };
  }

  const trimmed = rawInput.trim();

  // Delimited inputs (slashes, hyphens, dots, spaces)
  if (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('.') || trimmed.includes(' ')) {
    const parts = trimmed.split(/[/.\s-]+/).filter(Boolean);

    // ISO format: YYYY-MM-DD
    if (parts.length >= 3 && parts[0].length === 4) {
      const y = parts[0].slice(0, 4);
      let m = parts[1].replace(/[^0-9]/g, '').slice(0, 2);
      if (m.length === 1 && parseInt(m, 10) >= 1 && parseInt(m, 10) <= 9) m = `0${m}`;
      let d = parts[2].replace(/[^0-9]/g, '').slice(0, 2);
      if (d.length === 1 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 9) d = `0${d}`;
      return {
        rawDigits: `${m}${d}${y}`,
        month: m,
        showSlash1: true,
        day: d,
        showSlash2: true,
        year: y,
        formatted: `${m} / ${d} / ${y}`,
      };
    }

    let m = (parts[0] || '').replace(/[^0-9]/g, '');
    let d = (parts[1] || '').replace(/[^0-9]/g, '');
    let y = (parts[2] || '').replace(/[^0-9]/g, '');

    if (m.length === 1 && parts.length > 1 && parseInt(m, 10) >= 1 && parseInt(m, 10) <= 9) {
      m = `0${m}`;
    }
    if (d.length === 1 && parts.length > 2 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 9) {
      d = `0${d}`;
    }

    m = m.slice(0, 2);
    d = d.slice(0, 2);
    y = y.slice(0, 4);

    const showSlash1 = parts.length > 1 || m.length === 2;
    const showSlash2 = parts.length > 2 || d.length === 2;

    let formatted = m;
    if (showSlash1) {
      formatted += ` / ${d}`;
      if (showSlash2) {
        formatted += ` / ${y}`;
      }
    }

    return {
      rawDigits: `${m}${d}${y}`,
      month: m,
      showSlash1,
      day: d,
      showSlash2,
      year: y,
      formatted: formatted.trim(),
    };
  }

  // Pure digits handling
  let digits = trimmed.replace(/[^0-9]/g, '').slice(0, 8);
  if (!digits) {
    return {
      rawDigits: '',
      month: '',
      showSlash1: false,
      day: '',
      showSlash2: false,
      year: '',
      formatted: '',
    };
  }

  let m = '';
  let d = '';
  let y = '';
  let showSlash1 = false;
  let showSlash2 = false;

  const firstM = parseInt(digits[0], 10);
  if (digits.length === 1) {
    if (firstM >= 2 && firstM <= 9) {
      m = `0${firstM}`;
      digits = m;
      showSlash1 = true;
    } else {
      m = digits;
      return {
        rawDigits: digits,
        month: m,
        showSlash1: false,
        day: '',
        showSlash2: false,
        year: '',
        formatted: m,
      };
    }
  } else {
    if (firstM >= 2 && firstM <= 9) {
      m = `0${firstM}`;
      digits = m + digits.slice(1);
      showSlash1 = true;
    } else {
      const mNum = parseInt(digits.slice(0, 2), 10);
      if (mNum >= 1 && mNum <= 12) {
        m = digits.slice(0, 2);
        showSlash1 = true;
      } else {
        // Month rollover (13..19 -> 01, second char rolls to day)
        m = '01';
        showSlash1 = true;
        const rollChar = digits[1];
        digits = m + rollChar + digits.slice(2);
      }
    }
  }

  const restAfterM = digits.slice(2);
  if (!restAfterM) {
    return {
      rawDigits: m,
      month: m,
      showSlash1,
      day: '',
      showSlash2: false,
      year: '',
      formatted: `${m} / `,
    };
  }

  // Resolve Day
  const firstD = parseInt(restAfterM[0], 10);
  if (restAfterM.length === 1) {
    if (firstD >= 4 && firstD <= 9) {
      d = `0${firstD}`;
      showSlash2 = true;
      return {
        rawDigits: `${m}${d}`,
        month: m,
        showSlash1: true,
        day: d,
        showSlash2: true,
        year: '',
        formatted: `${m} / ${d} / `,
      };
    } else {
      d = restAfterM;
      return {
        rawDigits: `${m}${d}`,
        month: m,
        showSlash1: true,
        day: d,
        showSlash2: false,
        year: '',
        formatted: `${m} / ${d}`,
      };
    }
  }

  // Two or more digits in restAfterM
  if (firstD >= 4 && firstD <= 9) {
    d = `0${firstD}`;
    showSlash2 = true;
    y = restAfterM.slice(1, 5);
  } else {
    const dayCandidate = parseInt(restAfterM.slice(0, 2), 10);
    const maxDays = getMaxDaysForMonth(m);
    if (firstD === 3 && dayCandidate > maxDays) {
      d = '03';
      showSlash2 = true;
      y = restAfterM.slice(1, 5);
    } else {
      d = restAfterM.slice(0, 2);
      showSlash2 = true;
      y = restAfterM.slice(2, 6);
    }
  }

  let formatted = `${m} / ${d}`;
  if (showSlash2) {
    formatted += ' / ';
    if (y) formatted += y;
  }

  const rawDigits = `${m}${d}${y}`;
  return {
    rawDigits,
    month: m,
    showSlash1: true,
    day: d,
    showSlash2,
    year: y,
    formatted,
  };
}

/**
 * Backward-compatible formatDisplayDate helper.
 */
export function formatDisplayDate(raw: string): string {
  return formatRawDateSegments(raw).formatted;
}

/**
 * Backward-compatible formatSingleDateInput helper.
 */
export function formatSingleDateInput(
  input: string,
  prevInput: string = ''
): {
  formatted: string;
  rawDigits: string;
  segments: { month: string; day: string; year: string };
} {
  // Handle delimiter boundary backspacing: seamlessly drop delimiter and preceding character
  if (prevInput && input.length < prevInput.length) {
    if (
      prevInput.endsWith(' / ') &&
      (input === prevInput.slice(0, -1) || input === prevInput.trimEnd() || input === prevInput.slice(0, -2))
    ) {
      const withoutDelim = prevInput.slice(0, -3).trimEnd();
      const droppedChar = withoutDelim.slice(0, -1);
      return formatSingleDateInput(droppedChar);
    }
    if (
      prevInput.endsWith(' /') &&
      (input === prevInput.slice(0, -1) || input === prevInput.trimEnd())
    ) {
      const withoutDelim = prevInput.slice(0, -2).trimEnd();
      const droppedChar = withoutDelim.slice(0, -1);
      return formatSingleDateInput(droppedChar);
    }
  }

  const result = formatRawDateSegments(input);
  return {
    formatted: result.formatted,
    rawDigits: result.rawDigits,
    segments: {
      month: result.month,
      day: result.day,
      year: result.year,
    },
  };
}

// ============================================================================
// Backward-Compatible Cell Contract
// ============================================================================

export function DateSegmentCell({
  inputRef,
  value = '',
  placeholder = '',
  accessibilityLabel = '',
  maxLength = 2,
  widthStyle,
  disabled,
  textColor,
  placeholderColor,
  onChangeText,
  onKeyPress,
  onFocus,
  onBlur,
}: DateSegmentCellProps) {
  return (
    <View style={[styles.legacyCell, widthStyle]}>
      <TextInput
        ref={inputRef as any}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        accessibilityLabel={accessibilityLabel}
        maxLength={maxLength}
        editable={!disabled}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.legacyInput, { color: textColor }]}
      />
    </View>
  );
}

// ============================================================================
// Main Component: SegmentedDateInput
// (Masked Architecture: Invisible TextInput + Themed Presentation Layer)
// ============================================================================

/**
 * Masked Segmented Date Input
 *
 * Implements the proven Claim Club Modal architecture:
 * 1. An invisible, caret-hidden <TextInput> captures raw unformatted keystrokes.
 * 2. A pointerEvents="none" presentation layer displays characters divided into
 *    discrete chunks (month, day, year) with non-interactive separator slashes.
 * 3. A custom BlinkingCursor simulates a native cursor at the active insertion point.
 *
 * RATIONALE & ZERO-FLICKER GUARANTEE:
 * Because the native TextInput is completely invisible, the browser/OS DOM NEVER
 * renders raw keystrokes (e.g. "16" or unformatted slashes) before React can format them.
 * React computes the presentation layer synchronously in render, so separators and
 * rollovers appear instantly in the EXACT same frame as the keystroke with zero flicker.
 */
export const SegmentedDateInput = forwardRef<TextInput, SegmentedDateInputProps>(
  function SegmentedDateInput(
    {
      value,
      onChange,
      onBlur,
      onFocus,
      hasError = false,
      disabled = false,
      style,
    },
    ref
  ) {
    const theme = useTheme();
    const inputRef = useRef<TextInput>(null);
    useImperativeHandle(ref, () => inputRef.current as TextInput);

    const [rawDigits, setRawDigits] = useState(() => {
      const init = formatRawDateSegments(value || '');
      return init.rawDigits;
    });
    const [isFocused, setIsFocused] = useState(false);

    // Keep internal raw digits synchronized with incoming external value (e.g. calendar picker)
    useEffect(() => {
      const parsed = formatRawDateSegments(value || '');
      setRawDigits(parsed.rawDigits);
    }, [value]);

    // Derive formatted segments synchronously in render
    const segments = useMemo(() => formatRawDateSegments(rawDigits), [rawDigits]);

    const handleRawChange = useCallback(
      (text: string) => {
        // Strip non-digits
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 8);
        const parsed = formatRawDateSegments(cleaned);

        setRawDigits(parsed.rawDigits);
        onChange(parsed.rawDigits, {
          month: parsed.month,
          day: parsed.day,
          year: parsed.year,
        });
      },
      [onChange]
    );

    const handleInputFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleInputBlur = useCallback(() => {
      setIsFocused(false);

      // On blur: re-pad single digits and expand 2-digit years
      let m = segments.month;
      let d = segments.day;
      let y = segments.year;

      if (m.length === 1 && parseInt(m, 10) >= 1 && parseInt(m, 10) <= 9) {
        m = `0${m}`;
      }
      if (d.length === 1 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 9) {
        d = `0${d}`;
      }
      if (y.length === 2) {
        y = String(expandTwoDigitYear(y));
      }

      const nextRaw = `${m}${d}${y}`;
      if (nextRaw !== rawDigits) {
        setRawDigits(nextRaw);
        onChange(nextRaw, { month: m, day: d, year: y });
      }

      onBlur?.({ month: m, day: d, year: y });
    }, [segments, rawDigits, onChange, onBlur]);

    const handleKeyDown = useCallback(
      (e: any) => {
        const key = e.key;
        // Delimiter jump on slash or space
        if (key === '/' || key === ' ') {
          e.preventDefault();
          if (rawDigits.length === 1) {
            handleRawChange(`0${rawDigits}`);
          } else if (rawDigits.length === 3) {
            const m = rawDigits.slice(0, 2);
            const d = rawDigits[2];
            handleRawChange(`${m}0${d}`);
          }
        }
      },
      [rawDigits, handleRawChange]
    );

    const isFieldEmpty = rawDigits.length === 0;

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: hasError
              ? Brand.brightRed
              : isFocused
              ? Brand.gold
              : theme.border,
          },
          style,
        ]}
      >
        {/* Invisible TextInput: captures keystrokes without displaying raw DOM caret/text */}
        <TextInput
          ref={inputRef}
          value={rawDigits}
          onChangeText={handleRawChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          {...(Platform.OS === 'web' ? ({ onKeyDown: handleKeyDown } as any) : {})}
          editable={!disabled}
          caretHidden={true}
          selectionColor="transparent"
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={8}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Event date"
          style={styles.input}
        />

        {/* Presentation Layer: displays discrete chunks with static separators and BlinkingCursor */}
        <View pointerEvents="none" style={styles.displayLayer}>
          {isFieldEmpty ? (
            <View style={styles.placeholderRow}>
              {isFocused && (
                <BlinkingCursor
                  color={Brand.gold}
                  height={18}
                  style={styles.emptyAbsoluteCursor}
                />
              )}
              <ThemedText
                style={[
                  styles.placeholderText,
                  { color: theme.textMuted },
                ]}
              >
                MM / DD / YYYY
              </ThemedText>
            </View>
          ) : (
            <View style={styles.digitsRow}>
              {/* Month */}
              <ThemedText style={[styles.charText, { color: theme.text }]}>
                {segments.month}
              </ThemedText>

              {/* Slash 1 */}
              {segments.showSlash1 && (
                <ThemedText style={[styles.separatorText, { color: theme.textMuted }]}>
                  {' / '}
                </ThemedText>
              )}

              {/* Day */}
              {segments.day ? (
                <ThemedText style={[styles.charText, { color: theme.text }]}>
                  {segments.day}
                </ThemedText>
              ) : null}

              {/* Slash 2 */}
              {segments.showSlash2 && (
                <ThemedText style={[styles.separatorText, { color: theme.textMuted }]}>
                  {' / '}
                </ThemedText>
              )}

              {/* Year */}
              {segments.year ? (
                <ThemedText style={[styles.charText, { color: theme.text }]}>
                  {segments.year}
                </ThemedText>
              ) : null}

              {/* High-fidelity Blinking Cursor at insertion point */}
              {isFocused && (
                <BlinkingCursor
                  color={Brand.gold}
                  height={18}
                  style={styles.trailingCursor}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  }
);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.three,
    position: 'relative',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    textAlign: 'left',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 2,
    outlineWidth: 0,
    outlineColor: 'transparent',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  displayLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: Spacing.three,
    right: Spacing.three,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexDirection: 'row',
    zIndex: 1,
  },
  placeholderRow: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  emptyAbsoluteCursor: {
    position: 'absolute',
    left: -4,
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
  },
  digitsRow: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  charText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'left',
  },
  separatorText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'left',
  },
  trailingCursor: {
    marginLeft: 2,
  },
  legacyCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  legacyInput: {
    fontSize: 16,
    textAlign: 'center',
  },
});
