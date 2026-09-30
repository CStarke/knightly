import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type ViewStyle,
} from 'react-native';

import { BlinkingCursor } from '@/components/ui/blinking-cursor';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  expandTwoDigitYear,
  getMaxDaysForMonth,
  parseDateSegments,
} from '@/utils/date-format';
import { isAllowedNumericKey } from '@/utils/numeric-input';

export interface SegmentedDateInputProps {
  value: string; // raw digits string: MMDDYYYY, MMDDYY, or partial
  onChange: (rawDigits: string, segments?: { month: string; day: string; year: string }) => void;
  onBlur?: (segments?: { month: string; day: string; year: string }) => void;
  onFocus?: (e?: any) => void;
  hasError?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SegmentCursor = BlinkingCursor;

function syncNode(ref: RefObject<TextInput | null>, val: string) {
  if (!ref.current) return;
  const node = (ref.current as any)._node || (ref.current as any);
  if (node && 'value' in node && node.value !== val) {
    node.value = val;
  }
}

function getEffectiveMaxDays(monthStr: string): number {
  const m = parseInt(monthStr, 10);
  if (!isNaN(m) && m >= 1 && m <= 12) {
    return getMaxDaysForMonth(m);
  }
  return 31;
}

function getEl(ref: RefObject<TextInput | null>): HTMLInputElement | null {
  const element: any = ref.current;
  if (!element) return null;
  if (typeof element.addEventListener === 'function') return element;
  if (element._node && typeof element._node.addEventListener === 'function') return element._node;
  if (typeof element.getNativeRef === 'function') return element.getNativeRef();
  return null;
}

function setCaretAtEnd(ref: RefObject<TextInput | null>) {
  if (Platform.OS !== 'web') return;
  setTimeout(() => {
    try {
      const el = getEl(ref);
      if (el && typeof el.setSelectionRange === 'function') {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    } catch {}
  }, 0);
}

type DateSegmentCellProps = {
  inputRef: RefObject<TextInput | null>;
  value: string;
  placeholder: string;
  accessibilityLabel: string;
  isFocused: boolean;
  maxLength: number;
  widthStyle: any;
  disabled?: boolean;
  textColor: string;
  placeholderColor: string;
  onChangeText: (text: string) => void;
  onKeyPress?: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  onFocus: (e: any) => void;
  onBlur: () => void;
};

function DateSegmentCell({
  inputRef,
  value,
  placeholder,
  accessibilityLabel,
  isFocused,
  maxLength,
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
    <View style={[styles.segmentCell, widthStyle]}>
      <TextInput
        ref={inputRef as any}
        value={value}
        selection={Platform.OS !== 'web' ? { start: value.length, end: value.length } : undefined}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={maxLength}
        caretHidden={true}
        selectionColor="transparent"
        autoCorrect={false}
        editable={!disabled}
        accessibilityLabel={accessibilityLabel}
        style={styles.invisibleInput}
      />
      <View pointerEvents="none" style={styles.segmentDisplay}>
        {value.length === 0 ? (
          <View style={styles.displayRow}>
            {isFocused && (
              <View style={styles.cursorAbsolute}>
                <SegmentCursor color={Brand.gold} />
              </View>
            )}
            <ThemedText style={[styles.segmentPlaceholderText, { color: placeholderColor }]}>
              {placeholder}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.displayRow}>
            <ThemedText style={[styles.segmentDigitText, { color: textColor }]}>
              {value}
            </ThemedText>
            {isFocused && (
              <View style={styles.cursorTrailing}>
                <SegmentCursor color={Brand.gold} />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function SegmentedDateInput({
  value,
  onChange,
  onBlur,
  onFocus,
  hasError = false,
  disabled = false,
  style,
}: SegmentedDateInputProps) {
  const theme = useTheme();

  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [focusedSegment, setFocusedSegment] = useState<'month' | 'day' | 'year' | null>(null);

  const segmentsRef = useRef({ month: '', day: '', year: '' });
  segmentsRef.current = { month, day, year };

  // Guards against echo reconciliation: user typing/backspacing sets this flag,
  // preventing parent value changes from clobbering in-flight partial state.
  const isInternalChangeRef = useRef(false);

  // Sync internal segments ONLY when external value changes (e.g. calendar picker, initial prop, reset)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const segs = parseDateSegments(value || '');
    setMonth(segs.month);
    setDay(segs.day);
    setYear(segs.year);
    syncNode(monthRef, segs.month);
    syncNode(dayRef, segs.day);
    syncNode(yearRef, segs.year);
  }, [value]);

  const emitChange = useCallback(
    (m: string, d: string, y: string) => {
      isInternalChangeRef.current = true;
      // In sequential digit representation (MMDDYYYY):
      // - Month must have 2 digits before Day can be appended.
      // - Day must have 2 digits before Year can be appended.
      // If preceding segments are incomplete, omit subsequent segments so positions never shift!
      let combined = m;
      if (m.length === 2) {
        combined += d;
        if (d.length === 2) {
          combined += y;
        }
      }
      onChange(combined, { month: m, day: d, year: y });
    },
    [onChange]
  );

  const handlePasteFull = (rawText: string): boolean => {
    const digits = rawText.replace(/[^0-9]/g, '');
    if (digits.length >= 4) {
      const m = digits.slice(0, 2);
      const d = digits.slice(2, 4);
      let y = digits.slice(4, 8);
      if (y.length === 2) {
        y = String(expandTwoDigitYear(y));
      }
      setMonth(m);
      setDay(d);
      setYear(y);
      syncNode(monthRef, m);
      syncNode(dayRef, d);
      syncNode(yearRef, y);
      emitChange(m, d, y);
      yearRef.current?.focus();
      setCaretAtEnd(yearRef);
      return true;
    }
    return false;
  };

  // Handle Month changes & smart auto-advance / overflow
  const handleMonthChange = (rawText: string) => {
    isInternalChangeRef.current = true;
    const text = rawText.replace(/[^0-9]/g, '');

    if (text.length >= 4) {
      if (handlePasteFull(text)) return;
    }

    if (text.length === 0) {
      setMonth('');
      syncNode(monthRef, '');
      emitChange('', day, year);
      return;
    }

    if (text.length === 1) {
      const digit = parseInt(text, 10);
      // Unambiguous months (2..9): auto-pad to 02..09 and focus Day
      if (digit >= 2 && digit <= 9) {
        const padded = `0${digit}`;
        setMonth(padded);
        syncNode(monthRef, padded);
        emitChange(padded, day, year);
        dayRef.current?.focus();
        setCaretAtEnd(dayRef);
        return;
      }
      // Digit 0 or 1: wait for second digit
      setMonth(text);
      syncNode(monthRef, text);
      emitChange(text, day, year);
      return;
    }

    if (text.length === 2) {
      // Month starting with 0: 01..09 is valid, 00 is blocked
      if (text[0] === '0') {
        const d2 = parseInt(text[1], 10);
        if (d2 === 0) {
          setMonth('0');
          syncNode(monthRef, '0');
          emitChange('0', day, year);
          return;
        }
        setMonth(text);
        syncNode(monthRef, text);
        emitChange(text, day, year);
        dayRef.current?.focus();
        setCaretAtEnd(dayRef);
        return;
      }

      // Month starting with 1
      if (text[0] === '1') {
        const d2 = parseInt(text[1], 10);
        // Valid 2-digit months 10, 11, 12
        if (d2 >= 0 && d2 <= 2) {
          setMonth(text);
          syncNode(monthRef, text);
          emitChange(text, day, year);
          dayRef.current?.focus();
          setCaretAtEnd(dayRef);
          return;
        }
        // Month Overflow rule: typing 1 followed by 3..9 implies January ('01') + Day entry
        if (d2 >= 3 && d2 <= 9) {
          setMonth('01');
          syncNode(monthRef, '01');
          // For January (maxDays = 31): if d2 * 10 > 31 (i.e. 4..9), cannot be tens digit -> auto-pad to 0d and focus Year
          if (d2 * 10 > 31) {
            const paddedDay = `0${d2}`;
            setDay(paddedDay);
            syncNode(dayRef, paddedDay);
            emitChange('01', paddedDay, year);
            yearRef.current?.focus();
            setCaretAtEnd(yearRef);
          } else {
            // d2 === 3: can be tens digit (30 or 31) -> keep '3' in Day and leave focus in Day
            const dayDigit = `${d2}`;
            setDay(dayDigit);
            syncNode(dayRef, dayDigit);
            emitChange('01', dayDigit, year);
            dayRef.current?.focus();
            setCaretAtEnd(dayRef);
          }
          return;
        }
      }

      // Fallback
      setMonth(text[0]);
      syncNode(monthRef, text[0]);
      emitChange(text[0], day, year);
    }
  };

  // Handle Day changes & auto-advance
  const handleDayChange = (rawText: string) => {
    isInternalChangeRef.current = true;
    const text = rawText.replace(/[^0-9]/g, '');

    if (text.length >= 4) {
      if (handlePasteFull(`${month}${text}`)) return;
    }

    if (text.length === 0) {
      setDay('');
      syncNode(dayRef, '');
      emitChange(month, '', year);
      return;
    }

    const maxDays = getEffectiveMaxDays(month);

    if (text.length === 1) {
      const digit = parseInt(text, 10);
      // Compact mathematical test: if digit * 10 > maxDays, it cannot be a tens digit for this month!
      // (e.g. 3 in Feb is 30 > 29; 4..9 in any month is 40..90 > 31). Auto-pad to 0d and advance to Year!
      if (digit * 10 > maxDays) {
        const paddedDay = `0${digit}`;
        setDay(paddedDay);
        syncNode(dayRef, paddedDay);
        emitChange(month, paddedDay, year);
        yearRef.current?.focus();
        setCaretAtEnd(yearRef);
        return;
      }
      // Otherwise, can be a tens digit (0..2 in Feb, 0..3 in 30/31-day months): wait for 2nd digit
      setDay(text);
      syncNode(dayRef, text);
      emitChange(month, text, year);
      return;
    }

    if (text.length === 2) {
      const num = parseInt(text, 10);
      if (num === 0) {
        setDay('0');
        syncNode(dayRef, '0');
        emitChange(month, '0', year);
        return;
      }

      if (num >= 1 && num <= maxDays) {
        setDay(text);
        syncNode(dayRef, text);
        emitChange(month, text, year);
        yearRef.current?.focus();
        setCaretAtEnd(yearRef);
        return;
      }

      // Over maxDays: keep first digit
      setDay(text[0]);
      syncNode(dayRef, text[0]);
      emitChange(month, text[0], year);
    }
  };

  // Handle Year changes & digit limits
  const handleYearChange = (rawText: string) => {
    isInternalChangeRef.current = true;
    const text = rawText.replace(/[^0-9]/g, '');

    if (text.length === 0) {
      setYear('');
      syncNode(yearRef, '');
      emitChange(month, day, '');
      return;
    }

    // If year starts with !2: strictly limit to 2 digits
    if (text[0] !== '2') {
      const limited = text.slice(0, 2);
      setYear(limited);
      syncNode(yearRef, limited);
      emitChange(month, day, limited);
      return;
    }

    // If year starts with 2: allow up to 4 digits
    const limited = text.slice(0, 4);
    setYear(limited);
    syncNode(yearRef, limited);
    emitChange(month, day, limited);
  };

  // Cross-segment backspace handling on native devices
  const handleDayKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && day.length === 0) {
      monthRef.current?.focus();
      setCaretAtEnd(monthRef);
      const m = segmentsRef.current.month;
      if (m.length > 0) {
        const updatedM = m.slice(0, -1);
        setMonth(updatedM);
        syncNode(monthRef, updatedM);
        emitChange(updatedM, '', segmentsRef.current.year);
      }
    }
  };

  const handleYearKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && year.length === 0) {
      const d = segmentsRef.current.day;
      const m = segmentsRef.current.month;
      if (d.length > 0) {
        dayRef.current?.focus();
        setCaretAtEnd(dayRef);
        const updatedD = d.slice(0, -1);
        setDay(updatedD);
        syncNode(dayRef, updatedD);
        emitChange(m, updatedD, '');
      } else {
        monthRef.current?.focus();
        setCaretAtEnd(monthRef);
        if (m.length > 0) {
          const updatedM = m.slice(0, -1);
          setMonth(updatedM);
          syncNode(monthRef, updatedM);
          emitChange(updatedM, '', '');
        }
      }
    }
  };

  // Segment blur handlers: auto-pad single digits and expand 2-digit years
  const handleMonthBlur = () => {
    let finalMonth = segmentsRef.current.month;
    if (finalMonth.length === 1 && parseInt(finalMonth, 10) >= 1) {
      finalMonth = `0${finalMonth}`;
      setMonth(finalMonth);
      syncNode(monthRef, finalMonth);
      emitChange(finalMonth, segmentsRef.current.day, segmentsRef.current.year);
    }
    checkContainerBlur();
  };

  const handleDayBlur = () => {
    let finalDay = segmentsRef.current.day;
    if (finalDay.length === 1 && parseInt(finalDay, 10) >= 1) {
      finalDay = `0${finalDay}`;
      setDay(finalDay);
      syncNode(dayRef, finalDay);
      emitChange(segmentsRef.current.month, finalDay, segmentsRef.current.year);
    }
    checkContainerBlur();
  };

  const handleYearBlur = () => {
    let finalYear = segmentsRef.current.year;
    if (finalYear.length === 2) {
      const expanded = String(expandTwoDigitYear(finalYear));
      finalYear = expanded;
      setYear(finalYear);
      syncNode(yearRef, finalYear);
      emitChange(segmentsRef.current.month, segmentsRef.current.day, finalYear);
    }
    checkContainerBlur();
  };

  const checkContainerBlur = () => {
    setTimeout(() => {
      let isStillFocused = false;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const active = document.activeElement;
        const monthEl = getEl(monthRef);
        const dayEl = getEl(dayRef);
        const yearEl = getEl(yearRef);
        isStillFocused = active === monthEl || active === dayEl || active === yearEl;
      } else {
        isStillFocused = Boolean(
          (monthRef.current as any)?.isFocused?.() ||
          (dayRef.current as any)?.isFocused?.() ||
          (yearRef.current as any)?.isFocused?.()
        );
      }
      if (!isStillFocused) {
        setFocusedSegment(null);
        onBlur?.(segmentsRef.current);
      }
    }, 100);
  };

  // Web DOM keyboard interception:
  // 1. Synchronously prevents invalid digits from ever entering the input
  // 2. Guarantees Backspace & Delete ALWAYS delete characters from the trailing end
  //    (or clear selected range), invariant of browser caret placement quirks
  // 3. Implements cross-segment backspacing seamlessly across segment boundaries
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const monthEl = getEl(monthRef);
    const dayEl = getEl(dayRef);
    const yearEl = getEl(yearRef);

    const onMonthKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const { month: m, day: d, year: y } = segmentsRef.current;
        const start = monthEl ? monthEl.selectionStart ?? 0 : 0;
        const end = monthEl ? monthEl.selectionEnd ?? 0 : 0;

        if (start !== end && monthEl) {
          const next = m.slice(0, start) + m.slice(end);
          setMonth(next);
          syncNode(monthRef, next);
          emitChange(next, d, y);
          setCaretAtEnd(monthRef);
          return;
        }

        if (m.length > 0) {
          const next = m.slice(0, -1);
          setMonth(next);
          syncNode(monthRef, next);
          emitChange(next, d, y);
          setCaretAtEnd(monthRef);
          return;
        }
        return;
      }

      if (!isAllowedNumericKey(e.key, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey })) {
        e.preventDefault();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        const start = monthEl ? monthEl.selectionStart ?? 0 : 0;
        const end = monthEl ? monthEl.selectionEnd ?? 0 : 0;
        if (start !== end) {
          e.preventDefault();
          handleMonthChange(e.key);
          return;
        }

        const { month: m } = segmentsRef.current;
        if (m.length === 0) return;
        if (m === '0') {
          if (e.key === '0') e.preventDefault();
          return;
        }
        if (m === '1') {
          // Keys 0..2 produce 10..12; keys 3..9 trigger Month Overflow to Day. All permitted!
          return;
        }
        if (m.length >= 2) {
          e.preventDefault();
        }
      }
    };

    const onDayKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const { month: m, day: d, year: y } = segmentsRef.current;
        const start = dayEl ? dayEl.selectionStart ?? 0 : 0;
        const end = dayEl ? dayEl.selectionEnd ?? 0 : 0;

        if (start !== end && dayEl) {
          const next = d.slice(0, start) + d.slice(end);
          setDay(next);
          syncNode(dayRef, next);
          emitChange(m, next, y);
          setCaretAtEnd(dayRef);
          return;
        }

        if (d.length > 0) {
          const next = d.slice(0, -1);
          setDay(next);
          syncNode(dayRef, next);
          emitChange(m, next, y);
          setCaretAtEnd(dayRef);
          return;
        }

        // Day is empty -> Cross-segment backspace into Month!
        monthRef.current?.focus();
        setCaretAtEnd(monthRef);
        if (m.length > 0) {
          const nextM = m.slice(0, -1);
          setMonth(nextM);
          syncNode(monthRef, nextM);
          emitChange(nextM, '', y);
          setCaretAtEnd(monthRef);
        }
        return;
      }

      if (!isAllowedNumericKey(e.key, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey })) {
        e.preventDefault();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        const start = dayEl ? dayEl.selectionStart ?? 0 : 0;
        const end = dayEl ? dayEl.selectionEnd ?? 0 : 0;
        if (start !== end) {
          e.preventDefault();
          handleDayChange(e.key);
          return;
        }

        const { month: m, day: d } = segmentsRef.current;
        if (d.length === 0) return;
        const maxDays = getEffectiveMaxDays(m);
        const potential = parseInt(d + e.key, 10);
        if (potential === 0 || potential > maxDays) {
          e.preventDefault();
          return;
        }
        if (d.length >= 2) {
          e.preventDefault();
        }
      }
    };

    const onYearKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const { month: m, day: d, year: y } = segmentsRef.current;
        const start = yearEl ? yearEl.selectionStart ?? 0 : 0;
        const end = yearEl ? yearEl.selectionEnd ?? 0 : 0;

        if (start !== end && yearEl) {
          const next = y.slice(0, start) + y.slice(end);
          setYear(next);
          syncNode(yearRef, next);
          emitChange(m, d, next);
          setCaretAtEnd(yearRef);
          return;
        }

        if (y.length > 0) {
          const next = y.slice(0, -1);
          setYear(next);
          syncNode(yearRef, next);
          emitChange(m, d, next);
          setCaretAtEnd(yearRef);
          return;
        }

        // Year is empty -> Cross-segment backspace into Day (or Month if Day is also empty)
        if (d.length > 0) {
          dayRef.current?.focus();
          setCaretAtEnd(dayRef);
          const nextD = d.slice(0, -1);
          setDay(nextD);
          syncNode(dayRef, nextD);
          emitChange(m, nextD, '');
          setCaretAtEnd(dayRef);
        } else {
          monthRef.current?.focus();
          setCaretAtEnd(monthRef);
          if (m.length > 0) {
            const nextM = m.slice(0, -1);
            setMonth(nextM);
            syncNode(monthRef, nextM);
            emitChange(nextM, '', '');
            setCaretAtEnd(monthRef);
          }
        }
        return;
      }

      if (!isAllowedNumericKey(e.key, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey })) {
        e.preventDefault();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        const start = yearEl ? yearEl.selectionStart ?? 0 : 0;
        const end = yearEl ? yearEl.selectionEnd ?? 0 : 0;
        if (start !== end) {
          e.preventDefault();
          handleYearChange(e.key);
          return;
        }

        const { year: y } = segmentsRef.current;
        if (y.length === 0 || y.length === 1) return;
        if (y.length === 2) {
          if (y[0] !== '2') e.preventDefault();
          return;
        }
        if (y.length === 3) return;
        if (y.length >= 4) e.preventDefault();
      }
    };

    const onBeforeInput = (e: any) => {
      if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
      }
    };

    const attachCaretListeners = (el: HTMLInputElement | null, ref: React.RefObject<TextInput | null>) => {
      if (!el) return () => {};
      const onFocusOrClick = () => setCaretAtEnd(ref);
      el.addEventListener('focus', onFocusOrClick);
      el.addEventListener('click', onFocusOrClick);
      el.addEventListener('mouseup', onFocusOrClick);
      return () => {
        el.removeEventListener('focus', onFocusOrClick);
        el.removeEventListener('click', onFocusOrClick);
        el.removeEventListener('mouseup', onFocusOrClick);
      };
    };

    monthEl?.addEventListener('keydown', onMonthKeyDown);
    monthEl?.addEventListener('beforeinput', onBeforeInput);
    const cleanMonthCaret = attachCaretListeners(monthEl, monthRef);

    dayEl?.addEventListener('keydown', onDayKeyDown);
    dayEl?.addEventListener('beforeinput', onBeforeInput);
    const cleanDayCaret = attachCaretListeners(dayEl, dayRef);

    yearEl?.addEventListener('keydown', onYearKeyDown);
    yearEl?.addEventListener('beforeinput', onBeforeInput);
    const cleanYearCaret = attachCaretListeners(yearEl, yearRef);

    return () => {
      monthEl?.removeEventListener('keydown', onMonthKeyDown);
      monthEl?.removeEventListener('beforeinput', onBeforeInput);
      cleanMonthCaret();

      dayEl?.removeEventListener('keydown', onDayKeyDown);
      dayEl?.removeEventListener('beforeinput', onBeforeInput);
      cleanDayCaret();

      yearEl?.removeEventListener('keydown', onYearKeyDown);
      yearEl?.removeEventListener('beforeinput', onBeforeInput);
      cleanYearCaret();
    };
  }, []);

  const isFocused = focusedSegment !== null;

  return (
    <Pressable
      onPress={(e) => {
        if (disabled) return;
        onFocus?.(e);
        if (!month) {
          monthRef.current?.focus();
          setCaretAtEnd(monthRef);
        } else if (!day) {
          dayRef.current?.focus();
          setCaretAtEnd(dayRef);
        } else {
          yearRef.current?.focus();
          setCaretAtEnd(yearRef);
        }
      }}
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
      {/* 1. MONTH CELL */}
      <DateSegmentCell
        inputRef={monthRef}
        value={month}
        placeholder="MM"
        accessibilityLabel="Event month"
        isFocused={focusedSegment === 'month'}
        maxLength={2}
        widthStyle={styles.twoDigitCell}
        disabled={disabled}
        textColor={theme.text}
        placeholderColor={theme.textMuted}
        onChangeText={handleMonthChange}
        onFocus={(e) => {
          setFocusedSegment('month');
          onFocus?.(e);
          setCaretAtEnd(monthRef);
        }}
        onBlur={handleMonthBlur}
      />

      <ThemedText style={[styles.separator, { color: theme.textMuted }]}>/</ThemedText>

      {/* 2. DAY CELL */}
      <DateSegmentCell
        inputRef={dayRef}
        value={day}
        placeholder="DD"
        accessibilityLabel="Event day"
        isFocused={focusedSegment === 'day'}
        maxLength={2}
        widthStyle={styles.twoDigitCell}
        disabled={disabled}
        textColor={theme.text}
        placeholderColor={theme.textMuted}
        onChangeText={handleDayChange}
        onKeyPress={handleDayKeyPress}
        onFocus={(e) => {
          setFocusedSegment('day');
          onFocus?.(e);
          setCaretAtEnd(dayRef);
        }}
        onBlur={handleDayBlur}
      />

      <ThemedText style={[styles.separator, { color: theme.textMuted }]}>/</ThemedText>

      {/* 3. YEAR CELL */}
      <DateSegmentCell
        inputRef={yearRef}
        value={year}
        placeholder="YYYY"
        accessibilityLabel="Event year"
        isFocused={focusedSegment === 'year'}
        maxLength={4}
        widthStyle={styles.yearCell}
        disabled={disabled}
        textColor={theme.text}
        placeholderColor={theme.textMuted}
        onChangeText={handleYearChange}
        onKeyPress={handleYearKeyPress}
        onFocus={(e) => {
          setFocusedSegment('year');
          onFocus?.(e);
          setCaretAtEnd(yearRef);
        }}
        onBlur={handleYearBlur}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    overflow: 'hidden',
    position: 'relative',
  },
  segmentCell: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  twoDigitCell: {
    width: 28,
  },
  yearCell: {
    width: 48,
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  segmentDisplay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  segmentDigitText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentPlaceholderText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  separator: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginHorizontal: 1,
    userSelect: 'none',
  },
  cursorTrailing: {
    marginLeft: 1,
  },
  cursorAbsolute: {
    position: 'absolute',
    left: 0,
    top: 2,
  },
});
