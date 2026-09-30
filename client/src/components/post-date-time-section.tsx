import React from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MaskedTimeInput, type MaskedTimeInputRef } from '@/components/masked-time-input';
import { SegmentedDateInput } from '@/components/segmented-date-input';
import { ThemedText } from '@/components/themed-text';
import { AccessoryButton } from '@/components/ui/accessory-button';
import { Card } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const MAX_CUSTOM_WHEN_LENGTH = 25;

export interface PostDateTimeSectionProps {
  isCustomWhen: boolean;
  onModeChange: (isCustom: boolean) => void;
  rawDate: string;
  onRawDateChange: (raw: string, segments?: { month: string; day: string; year: string }) => void;
  onDateBlur: (segments?: { month: string; day: string; year: string }) => void;
  onDateFocus: (e: any) => void;
  dateError: string | null;
  onOpenDatePicker: () => void;
  timeInputRef: React.RefObject<MaskedTimeInputRef | null>;
  rawTime: string;
  onRawTimeChange: (raw: string) => void;
  timePeriod: 'AM' | 'PM';
  onTogglePeriod: () => void;
  onTimeFocus: (e: any) => void;
  onTimeBlur: () => void;
  timeError: string | null;
  eventPreview: string;
  customWhenText: string;
  onCustomWhenTextChange: (text: string) => void;
  isCustomWhenFocused: boolean;
  onCustomWhenFocus: (e: any) => void;
  onCustomWhenBlur: () => void;
  whenError: string | null;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function PostDateTimeSection({
  isCustomWhen,
  onModeChange,
  rawDate,
  onRawDateChange,
  onDateBlur,
  onDateFocus,
  dateError,
  onOpenDatePicker,
  timeInputRef,
  rawTime,
  onRawTimeChange,
  timePeriod,
  onTogglePeriod,
  onTimeFocus,
  onTimeBlur,
  timeError,
  eventPreview,
  customWhenText,
  onCustomWhenTextChange,
  isCustomWhenFocused,
  onCustomWhenFocus,
  onCustomWhenBlur,
  whenError,
  onLayout,
}: PostDateTimeSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.section} onLayout={onLayout}>
      <FieldLabel
        icon={<Icon sf="calendar" md="event" size={16} color={Brand.gold} />}
        label="EVENT DATE & TIME"
      />

      <Card style={styles.eventSubCard}>
        {/* Segmented Mode Selector: Standard Time vs Custom Text */}
        <Segmented
          options={['Standard Time', 'Custom Text'] as const}
          value={isCustomWhen ? 'Custom Text' : 'Standard Time'}
          onChange={(mode) => onModeChange(mode === 'Custom Text')}
        />

        {!isCustomWhen ? (
          <View style={{ gap: Spacing.two }}>
            <View style={styles.structuredWhenRow}>
              <View style={{ flex: 1.25, gap: 4 }}>
                <ThemedText type="caption" themeColor="textMuted">DATE</ThemedText>
                <View style={styles.dateInputWrapper}>
                  <SegmentedDateInput
                    value={rawDate}
                    onChange={onRawDateChange}
                    onBlur={onDateBlur}
                    onFocus={onDateFocus}
                    hasError={Boolean(dateError)}
                  />
                  <AccessoryButton
                    onPress={onOpenDatePicker}
                    accessibilityLabel="Open calendar date picker"
                    style={styles.calendarIconBtn}
                  >
                    <Icon sf="calendar" md="calendar_today" size={16} color={Brand.gold} />
                  </AccessoryButton>
                </View>
              </View>

              <View style={{ flex: 0.85, gap: 4 }}>
                <ThemedText type="caption" themeColor="textMuted">TIME</ThemedText>
                <MaskedTimeInput
                  ref={timeInputRef}
                  value={rawTime}
                  onChange={onRawTimeChange}
                  period={timePeriod}
                  onTogglePeriod={onTogglePeriod}
                  onFocus={onTimeFocus}
                  onBlur={onTimeBlur}
                  hasError={Boolean(timeError)}
                />
              </View>
            </View>

            {/* Translated event date & time preview with margin left */}
            {eventPreview ? (
              <View style={styles.eventPreviewRow}>
                <Icon sf="sparkles" md="auto_awesome" size={12} color={Brand.gold} />
                <ThemedText style={styles.eventPreviewText}>
                  {eventPreview}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <FieldLabel
              label="CUSTOM EVENT TIME TEXT"
              currentLength={customWhenText.length}
              maxLength={MAX_CUSTOM_WHEN_LENGTH}
            />
            <TextInput
              value={customWhenText}
              onChangeText={onCustomWhenTextChange}
              onFocus={onCustomWhenFocus}
              onBlur={onCustomWhenBlur}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. Starts this weekend"
              placeholderTextColor={theme.textMuted}
              maxLength={MAX_CUSTOM_WHEN_LENGTH}
              style={[
                styles.smallInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor:
                    customWhenText.length > MAX_CUSTOM_WHEN_LENGTH
                      ? Brand.brightRed
                      : isCustomWhenFocused
                      ? Brand.gold
                      : theme.border,
                },
              ]}
            />
          </View>
        )}

        {/* Real-time validation error message */}
        {whenError ? (
          <View style={styles.whenErrorRow}>
            <Icon sf="exclamationmark.circle.fill" md="error" size={13} color={Brand.brightRed} />
            <ThemedText style={styles.whenErrorText}>
              {whenError}
            </ThemedText>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  eventSubCard: {
    padding: Spacing.two + 2,
    gap: Spacing.two,
  },
  structuredWhenRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarIconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 4,
    fontSize: 14,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  eventPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
    marginTop: 4,
  },
  eventPreviewText: {
    color: Brand.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  whenErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
    marginTop: 4,
  },
  whenErrorText: {
    color: Brand.brightRed,
    fontSize: 12,
    fontWeight: '600',
  },
});
