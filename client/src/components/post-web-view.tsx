/**
 * Post Composer Web View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * First-class desktop web authoring studio and adaptive tablet experience for Knightly's Create Post composer.
 * Designed as a true web publication canvas (Notion, Substack, Linear aesthetic) rather than a reformatted mobile app.
 *
 * DESKTOP WIDE SCREEN INVARIANTS:
 * 1. Three-Column Horizontal Studio (width >= 1024px):
 *    - Column 1 (Post Details): Club author selector, enlarged headline title, description textarea, location.
 *      Form controls sit directly on the canvas background without boxed card wrappers or faux-mobile chips.
 *    - Column 2 (Media & Schedule): Expanded 16:9 Banner canvas with enlarged 42px preset palette swatches,
 *      and flat event date/time schedule controls placed directly on the background.
 *    - Column 3 (Review & Publish): Real-time live preview rendering a genuine `PostCard` (`variant="editorial"`),
 *      prominent primary "Publish as [Club Name]" button, and compact posting guidance card.
 * 2. Zero-Scroll Architecture:
 *    - Total layout height calibrated to ~646px, utilizing desktop vertical headroom while strictly guaranteeing
 *      zero scrolling on normal desktop monitor viewports (1366x768, 1440x900, 1920x1080) via `scroll={!isSideBySide}`.
 * 3. Tablet Adaptive Layout (768px <= width < 1024px):
 *    - Centered single-column container (`maxWidth: 740px`) with vertical scrolling enabled.
 * 4. 0-Bleed Web Tokens: Strict adherence to `@/constants/theme` tokens and zero raw hex values.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { DatePickerModal } from '@/components/date-picker-modal';
import { LocationInfoModal } from '@/components/location-info-modal';
import { PostBannerSection } from '@/components/post-banner-section';
import { PostCard } from '@/components/post-card';
import { PostClubSelector } from '@/components/post-club-selector';
import { PostDateTimeSection } from '@/components/post-date-time-section';
import { PostSuccessModal } from '@/components/post-success-modal';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
  type PostComposerState,
} from '@/hooks/use-post-composer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export interface PostWebViewProps {
  composer: PostComposerState;
}

export function PostWebView({ composer }: PostWebViewProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Desktop 3-column studio threshold (1024px)
  const isSideBySide = width >= 1024;

  const {
    title,
    setTitle,
    isTitleFocused,
    setIsTitleFocused,
    description,
    setDescription,
    descHeight,
    setDescHeight,
    isDescFocused,
    setIsDescFocused,
    imageUrl,
    rawImage,
    isEditing,
    isCropping,
    savedTransform,
    cropperRef,
    handlePickImage,
    handleSaveCrop,
    handleStartEdit,
    handleRemovePhoto,
    handleSelectPresetBanner,
    setIsCroppingInteracting,
    rawDate,
    handleRawDateChange,
    handleDateBlur,
    handleSelectCalendarDate,
    selectedDate,
    showDatePicker,
    setShowDatePicker,
    dateError,
    timeInputRef,
    rawTime,
    handleRawTimeChange,
    timePeriod,
    handleTogglePeriod,
    handleTimeBlur,
    timeError,
    endTimeInputRef,
    rawEndTime,
    handleRawEndTimeChange,
    endTimePeriod,
    handleToggleEndPeriod,
    handleEndTimeBlur,
    endTimeError,
    whenError,
    isCustomWhen,
    setIsCustomWhen,
    customWhenText,
    setCustomWhenText,
    isCustomWhenFocused,
    setIsCustomWhenFocused,
    eventPreview,
    whereText,
    setWhereText,
    isWhereFocused,
    setIsWhereFocused,
    showLocationInfoModal,
    setShowLocationInfoModal,
    previewDraftPost,
    canPublish,
    handlePublish,
    showSuccessModal,
    setShowSuccessModal,
    publishedClubName,
    handleViewFeed,
    activeClub,
    linkedClubs,
    setActiveClub,
  } = composer;

  // ============================================================================
  // COLUMN 1: POST DETAILS (Direct on Background Canvas)
  // ============================================================================
  const renderDetailsColumn = () => (
    <View style={styles.columnContent}>
      {/* 1. CLUB AUTHOR SELECTOR */}
      <PostClubSelector
        activeClub={activeClub}
        linkedClubs={linkedClubs}
        onSelectClub={setActiveClub}
      />

      {/* 2. TITLE (HERO HEADLINE INPUT, REQUIRED, MAX 50 CHARS) */}
      <View style={styles.section}>
        <FieldLabel
          label="POST TITLE"
          required
          currentLength={title.length}
          maxLength={MAX_TITLE_LENGTH}
        />
        <TextInput
          value={title}
          onChangeText={setTitle}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          cursorColor={Brand.gold}
          selectionColor={Brand.gold}
          placeholder="Post title"
          placeholderTextColor={theme.textMuted}
          multiline
          scrollEnabled={false}
          blurOnSubmit
          returnKeyType="done"
          numberOfLines={2}
          maxLength={MAX_TITLE_LENGTH}
          style={[
            styles.titleInput,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor:
                title.length > MAX_TITLE_LENGTH
                  ? Brand.brightRed
                  : isTitleFocused
                  ? Brand.gold
                  : theme.border,
            },
          ]}
        />
      </View>

      {/* 3. DESCRIPTION (EXPANSIVE TEXTAREA, REQUIRED, MAX 280 CHARS) */}
      <View style={styles.section}>
        <FieldLabel
          label="DESCRIPTION"
          required
          currentLength={description.length}
          maxLength={MAX_DESCRIPTION_LENGTH}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          onContentSizeChange={(e) => {
            setDescHeight(Math.max(90, Math.min(130, e.nativeEvent.contentSize.height)));
          }}
          onFocus={() => setIsDescFocused(true)}
          onBlur={() => setIsDescFocused(false)}
          cursorColor={Brand.gold}
          selectionColor={Brand.gold}
          placeholder="Write post details, meeting agenda, or announcements..."
          placeholderTextColor={theme.textMuted}
          multiline
          scrollEnabled={false}
          numberOfLines={4}
          maxLength={MAX_DESCRIPTION_LENGTH}
          style={[
            styles.descInput,
            {
              height: Math.max(90, Math.min(130, descHeight)),
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor:
                description.length > MAX_DESCRIPTION_LENGTH
                  ? Brand.brightRed
                  : isDescFocused
                  ? Brand.gold
                  : theme.border,
            },
          ]}
        />
      </View>

      {/* 4. LOCATION */}
      <View style={styles.section}>
        <FieldLabel
          icon={<Icon sf="mappin.and.ellipse" md="place" size={13} color={Brand.gold} />}
          label="LOCATION"
          currentLength={whereText.length}
          maxLength={MAX_LOCATION_LENGTH}
          infoButton={
            <Pressable
              onPress={() => setShowLocationInfoModal(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Location guidance"
              style={({ pressed }) => [
                styles.infoBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Icon sf="info.circle" md="info" size={13} color={Brand.gold} />
            </Pressable>
          }
        />
        <TextInput
          value={whereText}
          onChangeText={setWhereText}
          onFocus={() => setIsWhereFocused(true)}
          onBlur={() => setIsWhereFocused(false)}
          cursorColor={Brand.gold}
          selectionColor={Brand.gold}
          placeholder="Building & room (e.g. CFAC 222)"
          placeholderTextColor={theme.textMuted}
          maxLength={MAX_LOCATION_LENGTH}
          style={[
            styles.smallInput,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor:
                whereText.length > MAX_LOCATION_LENGTH
                  ? Brand.brightRed
                  : isWhereFocused
                  ? Brand.gold
                  : theme.border,
            },
          ]}
        />
      </View>
    </View>
  );

  // ============================================================================
  // COLUMN 2: MEDIA & SCHEDULE (Direct on Background Canvas)
  // ============================================================================
  const renderMediaScheduleColumn = () => (
    <View style={styles.columnContent}>
      {/* 5. ATTACH IMAGE / BANNER (EXPANSIVE 16:9 CANVAS + 42PX SWATCHES) */}
      <PostBannerSection
        imageUrl={imageUrl}
        rawImage={rawImage}
        isEditing={isEditing}
        isCropping={isCropping}
        savedTransform={savedTransform}
        cropperRef={cropperRef}
        onPickImage={handlePickImage}
        onRemovePhoto={handleRemovePhoto}
        onSelectPresetBanner={handleSelectPresetBanner}
        onStartEdit={handleStartEdit}
        onSaveCrop={handleSaveCrop}
        onCroppingInteractionChange={setIsCroppingInteracting}
      />

      {/* 6. DATE & TIME (FLAT DIRECT-ON-BACKGROUND SCHEDULE) */}
      <PostDateTimeSection
        flat={true}
        isCustomWhen={isCustomWhen}
        onModeChange={(isCustom) => {
          setIsCustomWhen(isCustom);
        }}
        rawDate={rawDate}
        onRawDateChange={handleRawDateChange}
        onDateBlur={handleDateBlur}
        onDateFocus={() => {}}
        dateError={dateError}
        onOpenDatePicker={() => setShowDatePicker(true)}
        timeInputRef={timeInputRef}
        rawTime={rawTime}
        onRawTimeChange={handleRawTimeChange}
        timePeriod={timePeriod}
        onTogglePeriod={handleTogglePeriod}
        onTimeFocus={() => {}}
        onTimeBlur={handleTimeBlur}
        timeError={timeError}
        endTimeInputRef={endTimeInputRef}
        rawEndTime={rawEndTime}
        onRawEndTimeChange={handleRawEndTimeChange}
        endTimePeriod={endTimePeriod}
        onToggleEndPeriod={handleToggleEndPeriod}
        onEndTimeFocus={() => {}}
        onEndTimeBlur={handleEndTimeBlur}
        endTimeError={endTimeError}
        eventPreview={eventPreview}
        customWhenText={customWhenText}
        onCustomWhenTextChange={setCustomWhenText}
        isCustomWhenFocused={isCustomWhenFocused}
        onCustomWhenFocus={() => setIsCustomWhenFocused(true)}
        onCustomWhenBlur={() => setIsCustomWhenFocused(false)}
        whenError={whenError}
      />
    </View>
  );

  // ============================================================================
  // COLUMN 3: REVIEW & PUBLISH (Live Card Preview + Action + Guidelines)
  // ============================================================================
  const renderPreviewPanel = () => (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeaderRow}>
        <View style={styles.previewHeaderLeft}>
          <Icon sf="eye.fill" md="visibility" size={14} color={Brand.gold} />
          <ThemedText style={styles.previewHeaderTitle}>
            LIVE FEED PREVIEW
          </ThemedText>
        </View>
        <Badge label="Campus Feed" tone="gold" />
      </View>

      {/* Genuine PostCard rendering in real-time */}
      <View style={styles.previewCardWrapper}>
        <PostCard
          post={previewDraftPost}
          variant="editorial"
          onPressOrg={() => {
            // No-op during live editing preview
          }}
        />
      </View>

      {/* Primary Publish Action Button */}
      <Button
        label={`Publish as ${activeClub.name}`}
        variant="gold"
        onPress={handlePublish}
        disabled={!canPublish}
        style={styles.publishBtn}
      />

      {/* Posting Best Practices Guidance Card */}
      <Card style={styles.guidelinesCard}>
        <View style={styles.guidelinesHeader}>
          <Icon sf="sparkles" md="auto_awesome" size={13} color={Brand.gold} />
          <ThemedText style={styles.guidelinesTitle}>
            Posting Best Practices
          </ThemedText>
        </View>

        <View style={styles.guidelineItem}>
          <ThemedText style={styles.guidelineBullet}>•</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.guidelineText}>
            <ThemedText style={styles.guidelineStrong}>16:9 Banner:</ThemedText> Custom photos or curated preset banners appear prominently in feeds.
          </ThemedText>
        </View>

        <View style={styles.guidelineItem}>
          <ThemedText style={styles.guidelineBullet}>•</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.guidelineText}>
            <ThemedText style={styles.guidelineStrong}>Event Logistics:</ThemedText> Provide both date and time so students can plan attendance.
          </ThemedText>
        </View>

        <View style={styles.guidelineItem}>
          <ThemedText style={styles.guidelineBullet}>•</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.guidelineText}>
            <ThemedText style={styles.guidelineStrong}>Location:</ThemedText> Specify building or room number (e.g. <ThemedText style={styles.guidelineItalic}>"CFAC 222"</ThemedText>, <ThemedText style={styles.guidelineItalic}>"Commons Lawn"</ThemedText>).
          </ThemedText>
        </View>
      </Card>
    </View>
  );

  return (
    <View style={styles.outerContainer}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(7, 8, 10, 0.48)' : 'rgba(255, 255, 255, 0.48)',
            zIndex: 0,
          },
        ]}
      />
      {/* On desktop web (isSideBySide), disable vertical scroll to keep the 3-column studio fully in view without scrolling */}
      <Screen style={styles.screen} scroll={!isSideBySide}>
        <View style={[styles.pageWrapper, { maxWidth: isSideBySide ? 1240 : 740 }]}>
          {/* Header Introduction: Grand web masthead without mobile badge chips */}
          <View style={styles.pageHeader}>
            <ThemedText type="title" style={styles.pageTitle}>
              Create Campus Post
            </ThemedText>
            <ThemedText type="default" themeColor="textMuted" style={styles.pageSubtitle} numberOfLines={1}>
              Author and publish flyers, meetings, and club announcements across the Calvin community.
            </ThemedText>
          </View>

          {/* Responsive 3-Column Desktop or Single-Column Tablet Layout */}
          <View style={[styles.mainLayout, isSideBySide && styles.threeColumnLayout]}>
            {/* Column 1: Details (Direct on canvas) */}
            <View style={[styles.column, isSideBySide && styles.columnOne]}>
              {renderDetailsColumn()}
            </View>

            {/* Column 2: Media & Schedule (Direct on canvas) */}
            <View style={[styles.column, isSideBySide && styles.columnTwo]}>
              {renderMediaScheduleColumn()}
            </View>

            {/* Column 3: Live Preview & Action (Dedicated Card) */}
            <View style={[styles.column, isSideBySide && styles.columnThree]}>
              {renderPreviewPanel()}
            </View>
          </View>
        </View>

        {/* Modals */}
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={selectedDate}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={handleSelectCalendarDate}
        />

        <PostSuccessModal
          visible={showSuccessModal}
          clubName={publishedClubName}
          onClose={() => setShowSuccessModal(false)}
          onViewFeed={handleViewFeed}
        />

        <LocationInfoModal
          visible={showLocationInfoModal}
          onClose={() => setShowLocationInfoModal(false)}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
  screen: {
    flex: 1,
  },
  pageWrapper: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.three + 2,
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  mainLayout: {
    width: '100%',
    gap: Spacing.three,
  },
  threeColumnLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.four,
  },
  column: {
    width: '100%',
  },
  columnOne: {
    flex: 1.05,
    minWidth: 0,
  },
  columnTwo: {
    flex: 1.05,
    minWidth: 0,
  },
  columnThree: {
    flex: 1.1,
    minWidth: 0,
  },
  columnContent: {
    gap: Spacing.three,
  },
  section: {
    gap: 6,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    minHeight: 48,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  descInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 90,
    textAlignVertical: 'top',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  smallInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 4,
    fontSize: 14,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  publishBtn: {
    marginTop: 2,
    minHeight: 48,
  },
  infoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    gap: Spacing.two + 2,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.half,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  previewHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Brand.gold,
  },
  previewCardWrapper: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  guidelinesCard: {
    padding: Spacing.three,
    gap: 6,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  guidelineBullet: {
    color: Brand.gold,
    fontSize: 13,
    lineHeight: 16,
  },
  guidelineText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  guidelineStrong: {
    fontWeight: '700',
  },
  guidelineItalic: {
    fontStyle: 'italic',
    color: Brand.gold,
  },
});
