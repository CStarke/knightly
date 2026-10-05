import React, { useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaskedTimeInput, type MaskedTimeInputRef } from '@/components/masked-time-input';
import { SegmentedDateInput } from '@/components/segmented-date-input';
import { ThemedText } from '@/components/themed-text';
import { AccessoryButton } from '@/components/ui/accessory-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { ModalDialog, ModalHeader } from '@/components/ui/modal-dialog';
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
  endTimeInputRef?: React.RefObject<MaskedTimeInputRef | null>;
  rawEndTime?: string;
  onRawEndTimeChange?: (raw: string) => void;
  endTimePeriod?: 'AM' | 'PM';
  onToggleEndPeriod?: () => void;
  onEndTimeFocus?: (e: any) => void;
  onEndTimeBlur?: () => void;
  endTimeError?: string | null;
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
  endTimeInputRef,
  rawEndTime = '',
  onRawEndTimeChange,
  endTimePeriod = 'PM',
  onToggleEndPeriod,
  onEndTimeFocus,
  onEndTimeBlur,
  endTimeError,
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
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <View style={styles.section} onLayout={onLayout}>
      <FieldLabel
        icon={<Icon sf="calendar" md="event" size={13} color={Brand.gold} />}
        label="EVENT DATE & TIME"
        infoButton={
          <Pressable
            onPress={() => setShowInfoModal(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Date and time guidance"
            style={({ pressed }) => [
              styles.infoBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icon sf="info.circle" md="info" size={13} color={Brand.gold} />
          </Pressable>
        }
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
            {/* Row 1: Event Date Input with Calendar Picker Accessory */}
            <View style={styles.dateBlock}>
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

            {/* Row 2: Event Time Range (Start Time & Optional End Time) */}
            <View style={styles.timeRangeRow}>
              {/* Start Time Field */}
              <View style={styles.timeColumn}>
                <ThemedText type="caption" themeColor="textMuted">START TIME</ThemedText>
                <MaskedTimeInput
                  ref={timeInputRef}
                  value={rawTime}
                  onChange={onRawTimeChange}
                  period={timePeriod}
                  onTogglePeriod={onTogglePeriod}
                  onFocus={onTimeFocus}
                  onBlur={onTimeBlur}
                  hasError={Boolean(timeError || (whenError && whenError.includes('start time')))}
                  placeholder="e.g. 7:00"
                  accessibilityLabel="Event start time"
                />
              </View>

              {/* End Time Field (Optional for ranges e.g. 7:00 - 9:00 PM) */}
              <View style={styles.timeColumn}>
                <ThemedText type="caption" themeColor="textMuted">END TIME</ThemedText>
                <MaskedTimeInput
                  ref={endTimeInputRef}
                  value={rawEndTime}
                  onChange={onRawEndTimeChange || (() => {})}
                  period={endTimePeriod}
                  onTogglePeriod={onToggleEndPeriod || (() => {})}
                  onFocus={onEndTimeFocus}
                  onBlur={onEndTimeBlur}
                  hasError={Boolean(endTimeError || (whenError && whenError.includes('End time')))}
                  placeholder="e.g. 9:00"
                  accessibilityLabel="Event end time (optional)"
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

      {/* Date & Time Guidance Modal */}
      <ModalDialog
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      >
        <ModalHeader
          title="Date & Time Guide"
          icon={{ sf: 'calendar', md: 'event', color: Brand.gold }}
          onClose={() => setShowInfoModal(false)}
        />
        <View style={styles.infoModalBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Icon sf="checkmark.circle.fill" md="check_circle" size={14} color={Brand.gold} />
            </View>
            <ThemedText style={styles.infoText}>
              <Text style={styles.infoBold}>All fields are optional.</Text> Fill in only what applies to your event.
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Icon sf="clock" md="schedule" size={14} color={Brand.gold} />
            </View>
            <ThemedText style={styles.infoText}>
              <Text style={styles.infoBold}>Flexible dates & times:</Text> You can set a date without a time (all-day events), or a start time without an end time.
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Icon sf="exclamationmark.circle" md="error_outline" size={14} color={Brand.brightRed} />
            </View>
            <ThemedText style={styles.infoText}>
              <Text style={styles.infoBold}>Time requires a date:</Text> To specify a time, you must also provide the event date.
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Icon sf="text.quote" md="edit_note" size={14} color={Brand.gold} />
            </View>
            <ThemedText style={styles.infoText}>
              <Text style={styles.infoBold}>Custom Text option:</Text> For more general or recurring times (e.g. <Text style={styles.infoItalic}>"Starts this weekend"</Text>), switch to the Custom Text tab.
            </ThemedText>
          </View>

          <View style={styles.infoModalFooter}>
            <Button
              label="Got it"
              variant="gold"
              size="regular"
              onPress={() => setShowInfoModal(false)}
            />
          </View>
        </View>
      </ModalDialog>
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
  dateBlock: {
    gap: 4,
  },
  timeRangeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timeColumn: {
    flex: 1,
    gap: 4,
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
    includeFontPadding: false,
  },
  // Inline info button beside label text (hitSlop={8} gives a generous touch target)
  infoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalBody: {
    padding: Spacing.three,
    gap: Spacing.two + 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  // WHAT: Matches line 1's height (18px) and fixed width (18px) so flexbox centers the bullet icon on the first line.
  // WHY: Avoids artificial translateY offsets by letting flexbox center the icon within line 1, and fixed width guarantees left-margin alignment.
  infoIconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  infoBold: {
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  infoItalic: {
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    color: Brand.gold,
  },
  infoModalFooter: {
    marginTop: Spacing.one,
  },
});
