/**
 * Post Composer Mobile View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Specialized handheld mobile layout for Knightly's Create Post composer.
 * Preserves soft keyboard lift animations, dynamic input scroll centering,
 * and edge-to-edge mobile ergonomic controls.
 */

import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerModal } from '@/components/date-picker-modal';
import { LocationInfoModal } from '@/components/location-info-modal';
import { PostBannerSection } from '@/components/post-banner-section';
import { PostClubSelector } from '@/components/post-club-selector';
import { PostDateTimeSection } from '@/components/post-date-time-section';
import { PostSuccessModal } from '@/components/post-success-modal';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { BottomTabContentInset, Brand, Radius, Spacing } from '@/constants/theme';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
  type PostComposerState,
} from '@/hooks/use-post-composer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { handleSmoothInputFocus } from '@/utils/smooth-input-focus';

export interface PostMobileViewProps {
  composer: PostComposerState;
}

export function PostMobileView({ composer }: PostMobileViewProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useSharedValue(0);

  // Section Y measurements for auto-scrolling into view on focus
  const titleSectionY = useRef(0);
  const descSectionY = useRef(0);
  const dateSectionY = useRef(0);
  const locationSectionY = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      const duration = e?.duration ?? 250;
      keyboardHeight.value = withTiming(h, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    };

    const onHide = (e: any) => {
      const duration = e?.duration ?? 250;
      keyboardHeight.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  const animatedPageStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: keyboardHeight.value,
  }));

  const scrollToInput = (sectionY: number) => {
    const windowHeight = Dimensions.get('window').height;
    const targetY = Math.max(0, sectionY - Math.min(100, windowHeight * 0.15));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: targetY,
        animated: true,
      });
    }, Platform.OS === 'android' ? 100 : 50);
  };

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
    isCroppingInteracting,
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
      <Screen style={styles.screen} scroll={false}>
        <Animated.View style={animatedPageStyle}>
          <ScrollView
            ref={scrollViewRef}
            scrollEnabled={!isCroppingInteracting}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.two) + BottomTabContentInset,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. CLUB AUTHOR SELECTOR */}
            <PostClubSelector
              activeClub={activeClub}
              linkedClubs={linkedClubs}
              onSelectClub={setActiveClub}
            />

            {/* 2. TITLE (REQUIRED, MAX 50 CHARS) */}
            <View
              style={styles.section}
              onLayout={(e) => {
                titleSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <FieldLabel
                label="POST TITLE"
                required
                currentLength={title.length}
                maxLength={MAX_TITLE_LENGTH}
              />
              <TextInput
                value={title}
                onChangeText={setTitle}
                onFocus={(e) => {
                  setIsTitleFocused(true);
                  scrollToInput(titleSectionY.current);
                  handleSmoothInputFocus(e);
                }}
                onBlur={() => setIsTitleFocused(false)}
                cursorColor={Brand.gold}
                selectionColor={Brand.gold}
                placeholder="e.g. Welcome Night & Info Session"
                placeholderTextColor={theme.textMuted}
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

            {/* 3. DESCRIPTION (REQUIRED, MAX 280 CHARS) */}
            <View
              style={styles.section}
              onLayout={(e) => {
                descSectionY.current = e.nativeEvent.layout.y;
              }}
            >
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
                  setDescHeight(Math.max(90, e.nativeEvent.contentSize.height));
                }}
                onFocus={(e) => {
                  setIsDescFocused(true);
                  scrollToInput(descSectionY.current);
                  handleSmoothInputFocus(e);
                }}
                onBlur={() => setIsDescFocused(false)}
                cursorColor={Brand.gold}
                selectionColor={Brand.gold}
                placeholder="What is happening? Describe the activity, meeting agenda, or announcements..."
                placeholderTextColor={theme.textMuted}
                multiline
                scrollEnabled={false}
                numberOfLines={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                style={[
                  styles.descInput,
                  {
                    height: Math.max(90, descHeight),
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

            {/* 4. ATTACH IMAGE */}
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

            {/* 5. DATE & TIME (ALWAYS VISIBLE INLINE, BLANK BY DEFAULT) */}
            <PostDateTimeSection
              isCustomWhen={isCustomWhen}
              onModeChange={(isCustom) => {
                setIsCustomWhen(isCustom);
              }}
              rawDate={rawDate}
              onRawDateChange={handleRawDateChange}
              onDateBlur={handleDateBlur}
              onDateFocus={(e) => {
                scrollToInput(dateSectionY.current);
                handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
              }}
              dateError={dateError}
              onOpenDatePicker={() => setShowDatePicker(true)}
              timeInputRef={timeInputRef}
              rawTime={rawTime}
              onRawTimeChange={handleRawTimeChange}
              timePeriod={timePeriod}
              onTogglePeriod={handleTogglePeriod}
              onTimeFocus={(e) => {
                scrollToInput(dateSectionY.current);
                handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
              }}
              onTimeBlur={handleTimeBlur}
              timeError={timeError}
              endTimeInputRef={endTimeInputRef}
              rawEndTime={rawEndTime}
              onRawEndTimeChange={handleRawEndTimeChange}
              endTimePeriod={endTimePeriod}
              onToggleEndPeriod={handleToggleEndPeriod}
              onEndTimeFocus={(e) => {
                scrollToInput(dateSectionY.current);
                handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
              }}
              onEndTimeBlur={handleEndTimeBlur}
              endTimeError={endTimeError}
              eventPreview={eventPreview}
              customWhenText={customWhenText}
              onCustomWhenTextChange={setCustomWhenText}
              isCustomWhenFocused={isCustomWhenFocused}
              onCustomWhenFocus={(e) => {
                setIsCustomWhenFocused(true);
                scrollToInput(dateSectionY.current);
                handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
              }}
              onCustomWhenBlur={() => {
                setIsCustomWhenFocused(false);
              }}
              whenError={whenError}
              onLayout={(e) => {
                dateSectionY.current = e.nativeEvent.layout.y;
              }}
            />

            {/* 6. LOCATION (ALWAYS VISIBLE INLINE, BLANK BY DEFAULT) */}
            <View
              style={styles.section}
              onLayout={(e) => {
                locationSectionY.current = e.nativeEvent.layout.y;
              }}
            >
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
                onFocus={(e) => {
                  setIsWhereFocused(true);
                  scrollToInput(locationSectionY.current);
                  handleSmoothInputFocus(e, { scrollViewRef, targetY: locationSectionY.current });
                }}
                onBlur={() => setIsWhereFocused(false)}
                cursorColor={Brand.gold}
                selectionColor={Brand.gold}
                placeholder="e.g. North Hall 276"
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

            {/* 7. PUBLISH ACTION BUTTON */}
            <Button
              label={`Publish as ${activeClub.name}`}
              variant="gold"
              onPress={handlePublish}
              disabled={!canPublish}
              style={styles.publishBtn}
            />
          </ScrollView>
        </Animated.View>

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
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  section: {
    gap: 6,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    fontWeight: '600',
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
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 4,
    fontSize: 14,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  publishBtn: {
    marginTop: Spacing.two,
  },
  infoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
