import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { ModalDialog, ModalHeader } from '@/components/ui/modal-dialog';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function parseDateOrDefault(dateStr: string) {
  const today = new Date();
  const tM = today.getMonth();
  const tY = today.getFullYear();
  const tD = today.getDate();
  const todayFormatted = `${String(tM + 1).padStart(2, '0')}/${String(tD).padStart(2, '0')}/${tY}`;

  const trimmed = (dateStr || '').trim();
  if (trimmed) {
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      let m = parseInt(parts[0], 10) - 1;
      let d = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      }
      if (!isNaN(m) && !isNaN(d) && !isNaN(y) && m >= 0 && m < 12 && d >= 1 && d <= 31) {
        const mStr = String(m + 1).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        return {
          year: y,
          month: m,
          formatted: `${mStr}/${dStr}/${y}`,
        };
      }
    }
  }

  return {
    year: tY,
    month: tM,
    formatted: todayFormatted,
  };
}

export type DatePickerModalProps = {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectDate: (formattedDate: string) => void;
};

export function DatePickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}: DatePickerModalProps) {
  const theme = useTheme();

  const today = new Date();
  const initialParsed = useMemo(() => parseDateOrDefault(selectedDate), [selectedDate]);
  const [currentYear, setCurrentYear] = useState(initialParsed.year);
  const [currentMonth, setCurrentMonth] = useState(initialParsed.month);
  const [activeDateStr, setActiveDateStr] = useState(initialParsed.formatted);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Dismiss keyboard immediately upon opening
  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
    }
  }, [visible]);

  // Sync state when modal opens or selectedDate changes
  useEffect(() => {
    if (!visible) return;
    const parsed = parseDateOrDefault(selectedDate);
    setCurrentYear(parsed.year);
    setCurrentMonth(parsed.month);
    setActiveDateStr(parsed.formatted);
    if (!selectedDate.trim()) {
      onSelectDate(parsed.formatted);
    }
  }, [visible, selectedDate, onSelectDate]);

  const isPrevYearDisabled = currentYear <= 2000;
  const isPrevMonthDisabled = currentYear < 2000 || (currentYear === 2000 && currentMonth <= 0);
  const isNextMonthDisabled = currentYear > 2999 || (currentYear === 2999 && currentMonth >= 11);
  const isNextYearDisabled = currentYear >= 2999;

  const handlePrevYear = () => {
    if (isPrevYearDisabled) return;
    setCurrentYear((y) => Math.max(2000, y - 1));
  };

  const handleNextYear = () => {
    if (isNextYearDisabled) return;
    setCurrentYear((y) => Math.min(2999, y + 1));
  };

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (currentMonth === 0) {
      if (currentYear > 2000) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      }
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    if (currentMonth === 11) {
      if (currentYear < 2999) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      }
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const totalCells = firstDayWeekday + daysInMonth;
  const numWeeks = Math.ceil(totalCells / 7);
  // Centered at 5 weeks. 6-week months extend bottom by 40px while keeping top/buttons fixed (translateY: +20).
  // 4-week months (Feb) contract bottom by 40px while keeping top/buttons fixed (translateY: -20).
  const verticalShift = (numWeeks - 5) * 20;

  const handleDayPress = (day: number) => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const formatted = `${mStr}/${dStr}/${currentYear}`;
    setActiveDateStr(formatted);
    onSelectDate(formatted);
    onClose();
  };

  if (!visible) return null;

  return (
    <ModalDialog
      visible={visible}
      onClose={onClose}
      cardStyle={[
        datePickerStyles.card,
        {
          top: verticalShift,
        },
      ]}
    >
      {/* Modal Header */}
      <ModalHeader
        title="Select Event Date"
        icon={{ sf: 'calendar', md: 'event', color: Brand.gold }}
        onClose={onClose}
      />

      {/* Calendar Body */}
      <View style={datePickerStyles.body}>
        {/* Month & Year Navigation */}
        <View style={datePickerStyles.header}>
              <View style={datePickerStyles.navGroup}>
                <Pressable
                  onPress={isPrevYearDisabled ? undefined : handlePrevYear}
                  disabled={isPrevYearDisabled}
                  style={[datePickerStyles.navBtn, isPrevYearDisabled && datePickerStyles.navBtnDisabled]}
                  accessibilityLabel="Previous year"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isPrevYearDisabled }}
                  hitSlop={4}
                >
                  <Icon
                    sf="chevron.left.2"
                    md="keyboard_double_arrow_left"
                    size={18}
                    color={isPrevYearDisabled ? theme.textMuted : theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={isPrevMonthDisabled ? undefined : handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  style={[datePickerStyles.navBtn, isPrevMonthDisabled && datePickerStyles.navBtnDisabled]}
                  accessibilityLabel="Previous month"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isPrevMonthDisabled }}
                  hitSlop={4}
                >
                  <Icon
                    sf="chevron.left"
                    md="chevron_left"
                    size={18}
                    color={isPrevMonthDisabled ? theme.textMuted : theme.text}
                  />
                </Pressable>
              </View>

              <ThemedText style={datePickerStyles.monthTitle}>
                {monthNames[currentMonth]} {currentYear}
              </ThemedText>

              <View style={datePickerStyles.navGroup}>
                <Pressable
                  onPress={isNextMonthDisabled ? undefined : handleNextMonth}
                  disabled={isNextMonthDisabled}
                  style={[datePickerStyles.navBtn, isNextMonthDisabled && datePickerStyles.navBtnDisabled]}
                  accessibilityLabel="Next month"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isNextMonthDisabled }}
                  hitSlop={4}
                >
                  <Icon
                    sf="chevron.right"
                    md="chevron_right"
                    size={18}
                    color={isNextMonthDisabled ? theme.textMuted : theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={isNextYearDisabled ? undefined : handleNextYear}
                  disabled={isNextYearDisabled}
                  style={[datePickerStyles.navBtn, isNextYearDisabled && datePickerStyles.navBtnDisabled]}
                  accessibilityLabel="Next year"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isNextYearDisabled }}
                  hitSlop={4}
                >
                  <Icon
                    sf="chevron.right.2"
                    md="keyboard_double_arrow_right"
                    size={18}
                    color={isNextYearDisabled ? theme.textMuted : theme.text}
                  />
                </Pressable>
              </View>
            </View>

            {/* Weekday column headers */}
            <View style={datePickerStyles.weekdayRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
                <ThemedText key={w} type="caption" themeColor="textMuted" style={datePickerStyles.weekdayText}>
                  {w}
                </ThemedText>
              ))}
            </View>

            {/* Days Grid */}
            <View key={`grid-${currentYear}-${currentMonth}`} style={datePickerStyles.grid}>
              {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                <View key={`empty-${currentYear}-${currentMonth}-${idx}`} style={datePickerStyles.dayCellEmpty} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const cellDateStr = `${String(currentMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${currentYear}`;
                const isSelected = activeDateStr === cellDateStr;
                const isToday =
                  day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear();

                return (
                  <Pressable
                    key={`day-${currentYear}-${currentMonth}-${day}`}
                    onPress={() => handleDayPress(day)}
                    style={datePickerStyles.dayCell}
                    accessibilityRole="button"
                    accessibilityLabel={`${monthNames[currentMonth]} ${day}, ${currentYear}${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}`}
                  >
                    <View
                      style={[
                        datePickerStyles.dayIndicator,
                        isSelected && datePickerStyles.dayIndicatorSelected,
                        !isSelected && isToday && datePickerStyles.dayIndicatorToday,
                      ]}
                    >
                      <ThemedText
                        style={[
                          datePickerStyles.dayCellText,
                          {
                            color: isSelected ? '#000000' : isToday ? Brand.gold : theme.text,
                            fontWeight: isSelected || isToday ? '700' : '500',
                          },
                        ]}
                      >
                        {day}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
    </ModalDialog>
  );
}

const datePickerStyles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  body: {
    padding: Spacing.three + 4,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  navBtn: {
    padding: 6,
    borderRadius: Radius.sm,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 40,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndicator: {
    width: 38,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayIndicatorSelected: {
    backgroundColor: Brand.gold,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  dayIndicatorToday: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(243, 195, 0, 0.45)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: Brand.gold,
    fontWeight: '700',
  },
});
