/**
 * Create Post Composer Screen (Slot 4)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * The Create Post composer is exclusively available to verified student club leaders (`isLeader`).
 * It allows authoring campus event flyers and announcements with structured metadata
 * (Date/Time masking, physical location, customized mission descriptions, and 16:9 cropped imagery).
 *
 * CHARACTER LIMIT INVARIANTS:
 * - MAX_TITLE_LENGTH (50 chars): Fits within 2 lines on small mobile feed cards without truncation.
 * - MAX_DESCRIPTION_LENGTH (280 chars): Standard micro-blogging length that conveys essential
 *   event details without causing massive feed card height disparity.
 * - MAX_LOCATION_LENGTH (25 chars): Fits comfortably beside the map pin icon in single-line card headers.
 * - MAX_CUSTOM_WHEN_LENGTH (25 chars): Fits inside the date pill badge for non-calendar time descriptions
 *   (e.g. "Every Tues at Sunset").
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image as RNImage,
  Keyboard,
  Platform,
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
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerModal, parseDateOrDefault } from '@/components/date-picker-modal';
import type { CropTransformState, InlineImageCropperRef } from '@/components/inline-image-cropper';
import type { MaskedTimeInputRef } from '@/components/masked-time-input';
import { PostBannerSection } from '@/components/post-banner-section';
import { PostClubSelector } from '@/components/post-club-selector';
import { PostDateTimeSection } from '@/components/post-date-time-section';
import { PostSuccessModal } from '@/components/post-success-modal';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { BottomTabContentInset, Brand, Radius, Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import { useTabNavigation } from '@/context/tab-navigation-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  completeDateDigits,
  completeTimeDigits,
  formatDateSegments,
  formatEventDate,
  isDateCompleteAndValid,
  isTimeCompleteAndValid,
  parseDateSegments,
  resolveEventTime,
  sanitizeTime,
  validateDate,
} from '@/utils/date-format';
import { attachNumericDomFilters } from '@/utils/numeric-input';
import { handleSmoothInputFocus } from '@/utils/smooth-input-focus';

export const MAX_TITLE_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 280;
export const MAX_LOCATION_LENGTH = 25;
export const MAX_CUSTOM_WHEN_LENGTH = 25;
export { formatEventDate, DatePickerModal, parseDateOrDefault };

export default function CreatePostScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isLeader, linkedClubs, activeClub, setActiveClub, openClaimModal } =
    useClubLeadership();
  const { createPost } = useFeed();
  const insets = useSafeAreaInsets();
  const tabNav = useTabNavigation();
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

  // Form State
  const [title, setTitle] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [description, setDescription] = useState('');
  const [descHeight, setDescHeight] = useState(90);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isCroppingInteracting, setIsCroppingInteracting] = useState(false);
  const [savedTransform, setSavedTransform] = useState<CropTransformState | null>(null);
  const cropperRef = useRef<InlineImageCropperRef>(null);

  // Pick an image from the user's device photo library
  const handlePickImage = async () => {
    setIsCroppingInteracting(false);
    setIsCropping(false);
    tabNav?.setActiveTabIndex(4);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo Library Access',
            'Please enable photo library permissions in your device settings to select and upload a post banner.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Standardize 16:9 interactive crop across iOS, Android, and Web
        quality: 1,
      });

      // Synchronously re-pin tab focus upon native activity resume
      tabNav?.setActiveTabIndex(4);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      let width = asset.width ?? 0;
      let height = asset.height ?? 0;
      let finalUri = asset.uri;

      try {
        const probe = await manipulateAsync(asset.uri, [], { compress: 1 });
        if (probe.width > 0 && probe.height > 0) {
          width = probe.width;
          height = probe.height;
          finalUri = probe.uri;
        }
      } catch (probeErr) {
        console.warn('[CreatePostScreen] probe image failed, fallback to picker/getSize dimensions:', probeErr);
      }

      if (width <= 0 || height <= 0) {
        await new Promise<void>((resolve) => {
          RNImage.getSize(
            finalUri,
            (w, h) => {
              width = w;
              height = h;
              resolve();
            },
            () => {
              width = 1200;
              height = 675;
              resolve();
            }
          );
        });
      }

      tabNav?.setActiveTabIndex(4);
      setRawImage({ uri: finalUri, width, height });
      setImageUrl(finalUri);
      setSavedTransform(null);
      setIsEditing(true);
    } catch (err) {
      console.error('[CreatePostScreen] Error launching image picker:', err);
    } finally {
      setIsCroppingInteracting(false);
      setIsCropping(false);
      tabNav?.setActiveTabIndex(4);
    }
  };

  const handleSaveCrop = async () => {
    if (isCropping) return;
    setIsCropping(true);
    try {
      const cropRes = await cropperRef.current?.applyCrop();
      if (cropRes) {
        setImageUrl(cropRes.uri);
        setSavedTransform(cropRes.transform);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('[CreatePostScreen] Error saving crop:', err);
      setIsEditing(false);
    } finally {
      setIsCropping(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleRemovePhoto = () => {
    setIsCropping(false);
    setIsCroppingInteracting(false);
    setImageUrl(null);
    setRawImage(null);
    setSavedTransform(null);
    setIsEditing(false);
  };

  // Date State
  const dateInputRef = useRef<TextInput>(null);
  const [rawDate, setRawDate] = useState('');
  const [dateSegmentsState, setDateSegmentsState] = useState({ month: '', day: '', year: '' });
  const [isDateFocused, setIsDateFocused] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time State
  const timeInputRef = useRef<MaskedTimeInputRef>(null);
  const [rawTime, setRawTime] = useState('');
  const [isTimeFocused, setIsTimeFocused] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');

  // Validation error states
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const whenError = dateError || timeError;

  // Freeform mode toggle
  const [isCustomWhen, setIsCustomWhen] = useState(false);
  const [customWhenText, setCustomWhenText] = useState('');
  const [isCustomWhenFocused, setIsCustomWhenFocused] = useState(false);

  // Location State
  const [whereText, setWhereText] = useState('');
  const [isWhereFocused, setIsWhereFocused] = useState(false);

  // Web-only DOM numeric filters
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const cleanupDate = attachNumericDomFilters(dateInputRef.current);
    const cleanupTime = attachNumericDomFilters(timeInputRef.current?.textInput ?? null);
    return () => {
      cleanupDate();
      cleanupTime();
    };
  }, [isCustomWhen]);

  const handleTogglePeriod = () => {
    setTimePeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'));
  };

  // Success Confirmation Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedClubName, setPublishedClubName] = useState('');

  // Derived Date Segments
  const dateSegments = useMemo(() => formatDateSegments(rawDate), [rawDate]);

  // Translated human-friendly date and time preview
  const eventPreview = useMemo(() => {
    const isDateValidForPreview =
      !dateError &&
      (rawDate.length === 8 || rawDate.length === 6) &&
      validateDate(dateSegmentsState) === null &&
      validateDate(rawDate) === null &&
      isDateCompleteAndValid(rawDate);

    const formattedDate = isDateValidForPreview
      ? formatEventDate(
          rawDate.length === 6
            ? formatDateSegments(completeDateDigits(rawDate)).formatted
            : dateSegments.formatted
        )
      : '';

    const isTimeValid = !timeError && isTimeCompleteAndValid(rawTime);
    const resolvedTime = isTimeValid ? resolveEventTime(rawTime, timePeriod) : '';

    if (formattedDate && resolvedTime) {
      return `${formattedDate} · ${resolvedTime}`;
    }
    return formattedDate || resolvedTime || '';
  }, [
    dateError,
    timeError,
    rawDate,
    dateSegmentsState,
    dateSegments.formatted,
    rawTime,
    timePeriod,
  ]);

  // Validation
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const isTitleValid =
    trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_LENGTH;
  const isDescValid =
    trimmedDescription.length > 0 &&
    trimmedDescription.length <= MAX_DESCRIPTION_LENGTH;
  const isAnyDateElementFilled = Boolean(
    dateSegmentsState.month || dateSegmentsState.day || dateSegmentsState.year || rawDate
  );
  const isDateValid = isAnyDateElementFilled
    ? isDateCompleteAndValid(rawDate) &&
      dateSegmentsState.month.length === 2 &&
      dateSegmentsState.day.length === 2 &&
      (dateSegmentsState.year.length === 4 || dateSegmentsState.year.length === 2)
    : true;
  const isTimeValid = isTimeCompleteAndValid(rawTime);
  const isWhereValid = whereText.length <= MAX_LOCATION_LENGTH;
  const isCustomWhenValid = !isCustomWhen || customWhenText.length <= MAX_CUSTOM_WHEN_LENGTH;
  const canPublish =
    Boolean(isLeader) &&
    Boolean(activeClub) &&
    isTitleValid &&
    isDescValid &&
    isWhereValid &&
    isCustomWhenValid &&
    (isCustomWhen || (isDateValid && isTimeValid && !whenError));

  // Resolve Final "When" Text
  const computedWhen = useMemo(() => {
    if (isCustomWhen) return customWhenText.trim() || undefined;
    if (dateError) return undefined;

    const completed = completeDateDigits(rawDate);
    const isFullDate = completed.length === 8;
    const isDateValidForWhen =
      isFullDate &&
      validateDate(dateSegmentsState) === null &&
      validateDate(completed) === null &&
      isDateCompleteAndValid(completed);
    const formattedDate = isDateValidForWhen
      ? formatEventDate(formatDateSegments(completed).formatted)
      : undefined;
    const isTimeValidForWhen = !timeError && isTimeCompleteAndValid(rawTime);
    const resolvedTime = isTimeValidForWhen ? resolveEventTime(rawTime, timePeriod) : undefined;

    if (!formattedDate && !resolvedTime) return undefined;

    if (formattedDate && resolvedTime) {
      return `${formattedDate} · ${resolvedTime}`;
    }
    return formattedDate || resolvedTime || undefined;
  }, [
    isCustomWhen,
    customWhenText,
    dateError,
    timeError,
    rawDate,
    dateSegmentsState,
    rawTime,
    timePeriod,
  ]);

  const computedWhere = whereText.trim() || undefined;

  const handleRawDateChange = (
    raw: string,
    segments?: { month: string; day: string; year: string }
  ) => {
    setRawDate(raw);
    const nextSegments = segments || parseDateSegments(raw);
    setDateSegmentsState(nextSegments);
    const segs = formatDateSegments(raw);
    setSelectedDate(segs.formatted);
    const isCompleteCandidate =
      raw.length === 6 ||
      raw.length === 8 ||
      (nextSegments.month.length === 2 &&
        nextSegments.day.length === 2 &&
        (nextSegments.year.length === 2 || nextSegments.year.length === 4));
    if (isCompleteCandidate) {
      const error = validateDate(nextSegments) || validateDate(raw);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  const handleDateBlur = (segments?: { month: string; day: string; year: string }) => {
    setIsDateFocused(false);

    const segs = segments || dateSegmentsState || parseDateSegments(rawDate);
    const m = segs.month || '';
    const d = segs.day || '';
    const y = segs.year || '';

    if (!m && !d && !y && !rawDate) {
      setDateError(null);
      return;
    }

    if (m.length === 2 && d.length === 2 && !y) {
      const mmdd = `${m}${d}`;
      const completedRaw = completeDateDigits(mmdd);
      if (completedRaw !== mmdd) {
        setRawDate(completedRaw);
        setDateSegmentsState(parseDateSegments(completedRaw));
        const parsed = formatDateSegments(completedRaw);
        setSelectedDate(parsed.formatted);
        const error = validateDate(completedRaw);
        setDateError(error);
        return;
      }
    }

    const error = validateDate(segs);
    setDateError(error);
  };

  const handleSelectCalendarDate = (formattedDate: string) => {
    setSelectedDate(formattedDate);
    const cleaned = formattedDate.replace(/[^0-9]/g, '').slice(0, 8);
    setRawDate(cleaned);
    setDateSegmentsState(parseDateSegments(cleaned));
    setDateError(null);
  };

  const handleRawTimeChange = (raw: string) => {
    const result = sanitizeTime(raw, rawTime);
    setRawTime(result.digits);
    if (result.error) {
      setTimeError(result.error);
    } else {
      setTimeError(null);
    }
    timeInputRef.current?.setNativeValue(result.digits);
  };

  const handleTimeBlur = () => {
    setIsTimeFocused(false);
    if (!rawTime) {
      setTimeError(null);
      return;
    }

    const completed = completeTimeDigits(rawTime);
    if (completed && completed !== rawTime) {
      setRawTime(completed);
      timeInputRef.current?.setNativeValue(completed);
    }
  };

  // Handle Publish
  const handlePublish = async () => {
    if (!canPublish || !activeClub) return;

    const clubName = activeClub.name;
    let finalImageUrl = imageUrl;

    if (isEditing && cropperRef.current) {
      try {
        const cropRes = await cropperRef.current.applyCrop();
        if (cropRes) {
          finalImageUrl = cropRes.uri;
          setImageUrl(cropRes.uri);
          setSavedTransform(cropRes.transform);
        }
      } catch (cropErr) {
        console.warn('[CreatePostScreen] Auto-applying crop before publish failed:', cropErr);
      }
      setIsEditing(false);
    }

    const completedDate = completeDateDigits(rawDate);
    if (completedDate !== rawDate) {
      setRawDate(completedDate);
      setSelectedDate(formatDateSegments(completedDate).formatted);
      if (dateInputRef.current) {
        const node = (dateInputRef.current as any)._node || (dateInputRef.current as any);
        if (node && 'value' in node) {
          node.value = completedDate;
        }
      }
    }

    createPost({
      club: activeClub,
      title: trimmedTitle,
      description: trimmedDescription,
      image: finalImageUrl ?? undefined,
      when: computedWhen,
      where: computedWhere,
    });

    setTitle('');
    setDescription('');
    setImageUrl(null);
    setRawImage(null);
    setSavedTransform(null);
    setIsEditing(false);
    setIsCustomWhen(false);
    setRawDate('');
    setSelectedDate('');
    setRawTime('');
    setTimePeriod('PM');
    setCustomWhenText('');
    setWhereText('');
    setDateError(null);
    setTimeError(null);

    Keyboard.dismiss();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });

    setPublishedClubName(clubName);
    setShowSuccessModal(true);
  };

  // If user is not yet a club leader, show helpful guide to claim access
  if (!isLeader || !activeClub) {
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
        <Screen style={styles.notLeaderScreen}>
          <Card style={styles.notLeaderCard}>
            <View style={styles.notLeaderIconCircle}>
              <Icon sf="lock.shield.fill" md="lock" size={32} color={Brand.gold} />
            </View>
            <ThemedText type="headline" style={styles.notLeaderTitle}>
              Club Leadership Required
            </ThemedText>
            <ThemedText
              type="default"
              themeColor="textMuted"
              style={styles.notLeaderSubtitle}
            >
              Only authorized club student leaders can publish campus posts. If you are
              a leader, enter the 10-character code provided by Student Life.
            </ThemedText>
            <Button
              label="Enter Leader Code"
              variant="primary"
              onPress={() => openClaimModal('profile')}
              style={{ width: '100%', marginTop: Spacing.two }}
            />
          </Card>
        </Screen>
      </View>
    );
  }

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
                placeholder="e.g. Hack Night & Lightning Talks"
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
              onStartEdit={handleStartEdit}
              onSaveCrop={handleSaveCrop}
              onCroppingInteractionChange={setIsCroppingInteracting}
            />

            {/* 5. DATE & TIME (ALWAYS VISIBLE INLINE, BLANK BY DEFAULT) */}
            <PostDateTimeSection
              isCustomWhen={isCustomWhen}
              onModeChange={(isCustom) => {
                setIsCustomWhen(isCustom);
                setDateError(null);
                setTimeError(null);
              }}
              rawDate={rawDate}
              onRawDateChange={handleRawDateChange}
              onDateBlur={handleDateBlur}
              onDateFocus={(e) => {
                setIsDateFocused(true);
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
                setIsTimeFocused(true);
                scrollToInput(dateSectionY.current);
                handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
              }}
              onTimeBlur={handleTimeBlur}
              timeError={timeError}
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
                setDateError(null);
                setTimeError(null);
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
                icon={<Icon sf="mappin.and.ellipse" md="place" size={16} color={Brand.gold} />}
                label="LOCATION"
                currentLength={whereText.length}
                maxLength={MAX_LOCATION_LENGTH}
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
              variant="primary"
              onPress={handlePublish}
              disabled={!canPublish}
              style={styles.publishBtn}
            />
          </ScrollView>
        </Animated.View>

        {/* Date Picker Modal for calendar selection */}
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={selectedDate}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={handleSelectCalendarDate}
        />

        {/* Post Published Success Modal */}
        <PostSuccessModal
          visible={showSuccessModal}
          clubName={publishedClubName}
          onClose={() => setShowSuccessModal(false)}
          onViewFeed={() => {
            setShowSuccessModal(false);
            if (tabNav) {
              tabNav.navigateToTab(0, '/');
            } else {
              router.navigate('/');
            }
          }}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
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
  notLeaderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  notLeaderCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  notLeaderIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(243, 195, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  notLeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  notLeaderSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
});
