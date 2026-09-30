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
 *
 * IMAGE CROPPING ARCHITECTURE:
 * When an image is picked via `ImagePicker.launchImageLibraryAsync`, native editing is disabled
 * (`allowsEditing: false`). Instead, the composer invokes `useImageCropper().openCropper()`,
 * smoothly sliding the horizontal tab pager to the Slot 5 Phantom Tab cropper.
 * This guarantees the exact 16:9 aspect ratio without the focus loss bugs of native modals.
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  Image as RNImage,
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
import { Image } from 'expo-image';
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerModal, parseDateOrDefault } from '@/components/date-picker-modal';
import { InlineImageCropper, type InlineImageCropperRef, type CropTransformState } from '@/components/inline-image-cropper';
import { MaskedTimeInput, type MaskedTimeInputRef } from '@/components/masked-time-input';
import { ThemedText } from '@/components/themed-text';
import { AccessoryButton } from '@/components/ui/accessory-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { SuccessModal } from '@/components/ui/success-modal';
import { SegmentedDateInput } from '@/components/segmented-date-input';
import { BottomTabContentInset, Brand, Radius, Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  completeDateDigits,
  completeTimeDigits,
  formatEventDate,
  formatRawDateSegments,
  isDateCompleteAndValid,
  isTimeCompleteAndValid,
  parseDateSegments,
  resolveTimeWithPeriod,
  sanitizeTimeDigitsWithError,
  validateDateOnBlur,
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

      // In case native picker and probe both did not report dimensions
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

      setRawImage({ uri: finalUri, width, height });
      setImageUrl(finalUri);
      setSavedTransform(null); // Fresh photo starts at centered zoom = 1.0x
      setIsEditing(true); // Open cropper immediately so user can adjust
    } catch (err) {
      console.error('[CreatePostScreen] Error launching image picker:', err);
    } finally {
      setIsCroppingInteracting(false);
    }
  };

  // Commit crop when tapping Done
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

  // Resume editing photo at exact previous position
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Remove photo and reset cropper state
  const handleRemovePhoto = () => {
    setImageUrl(null);
    setRawImage(null);
    setSavedTransform(null);
    setIsEditing(false);
  };

  // Date State (Numeric masked input: MMDDYYYY, slashes appear dynamically on char 3 and char 5)
  const dateInputRef = useRef<TextInput>(null);
  const [rawDate, setRawDate] = useState('');
  const [dateSegmentsState, setDateSegmentsState] = useState({ month: '', day: '', year: '' });
  const [isDateFocused, setIsDateFocused] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time State (Numeric masked input: e.g. 700 -> 7:00, fake colon appears dynamically)
  const timeInputRef = useRef<MaskedTimeInputRef>(null);
  const [rawTime, setRawTime] = useState('');
  const [isTimeFocused, setIsTimeFocused] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');

  // Event Date & Time validation error states (shown in red on respective input borders & card footer)
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const whenError = dateError || timeError;

  // Freeform mode toggle (Standard Time vs Custom Text)
  const [isCustomWhen, setIsCustomWhen] = useState(false);
  const [customWhenText, setCustomWhenText] = useState('');
  const [isCustomWhenFocused, setIsCustomWhenFocused] = useState(false);

  // Location State - open by default, blank
  const [whereText, setWhereText] = useState('');
  const [isWhereFocused, setIsWhereFocused] = useState(false);

  // Web-only DOM numeric filters to strictly block non-numeric characters and paste at browser level
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

  // Club Selector Dropdown State
  const [isClubSelectorOpen, setIsClubSelectorOpen] = useState(false);

  // Success Confirmation Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedClubName, setPublishedClubName] = useState('');

  // Derived Date Segments for non-selectable visual masking
  const dateSegments = useMemo(() => formatRawDateSegments(rawDate), [rawDate]);

  // Translated human-friendly date and time preview shown below inputs
  const eventPreview = useMemo(() => {
    // If the date has an error or is incomplete/invalid, do not include date in preview
    const isDateValidForPreview =
      !dateError &&
      (rawDate.length === 8 || rawDate.length === 6) &&
      validateDateOnBlur(dateSegmentsState) === null &&
      validateDateOnBlur(rawDate) === null &&
      isDateCompleteAndValid(rawDate);

    const formattedDate = isDateValidForPreview
      ? formatEventDate(
          rawDate.length === 6
            ? formatRawDateSegments(completeDateDigits(rawDate)).formatted
            : dateSegments.formatted
        )
      : '';

    const isTimeValid = !timeError && isTimeCompleteAndValid(rawTime);
    const resolvedTime = isTimeValid ? resolveTimeWithPeriod(rawTime, timePeriod) : '';

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

  // Resolve Final "When" Text (only includes if valid date/time or freeform entered)
  const computedWhen = useMemo(() => {
    if (isCustomWhen) return customWhenText.trim() || undefined;
    if (dateError) return undefined;

    const completed = completeDateDigits(rawDate);
    const isFullDate = completed.length === 8;
    const isDateValidForWhen =
      isFullDate &&
      validateDateOnBlur(dateSegmentsState) === null &&
      validateDateOnBlur(completed) === null &&
      isDateCompleteAndValid(completed);
    const formattedDate = isDateValidForWhen
      ? formatEventDate(formatRawDateSegments(completed).formatted)
      : undefined;
    const isTimeValidForWhen = !timeError && isTimeCompleteAndValid(rawTime);
    const resolvedTime = isTimeValidForWhen ? resolveTimeWithPeriod(rawTime, timePeriod) : undefined;

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
    const segs = formatRawDateSegments(raw);
    setSelectedDate(segs.formatted);
    const isCompleteCandidate =
      raw.length === 6 ||
      raw.length === 8 ||
      (nextSegments.month.length === 2 &&
        nextSegments.day.length === 2 &&
        (nextSegments.year.length === 2 || nextSegments.year.length === 4));
    if (isCompleteCandidate) {
      const error = validateDateOnBlur(nextSegments) || validateDateOnBlur(raw);
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

    // If entire date is empty (no elements filled in): no error
    if (!m && !d && !y && !rawDate) {
      setDateError(null);
      return;
    }

    // If only MMDD is filled in without a year, completeDateDigits auto-fills next occurrence year
    if (m.length === 2 && d.length === 2 && !y) {
      const mmdd = `${m}${d}`;
      const completedRaw = completeDateDigits(mmdd);
      if (completedRaw !== mmdd) {
        setRawDate(completedRaw);
        setDateSegmentsState(parseDateSegments(completedRaw));
        const parsed = formatRawDateSegments(completedRaw);
        setSelectedDate(parsed.formatted);
        const error = validateDateOnBlur(completedRaw);
        setDateError(error);
        return;
      }
    }

    // Validate on blur using segments
    const error = validateDateOnBlur(segs);
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
    const result = sanitizeTimeDigitsWithError(raw, rawTime);
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

    // If publisher tapped submit while still in interactive crop mode, auto-commit the crop
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

    // Ensure 2-digit years or partial dates are expanded before publishing
    const completedDate = completeDateDigits(rawDate);
    if (completedDate !== rawDate) {
      setRawDate(completedDate);
      setSelectedDate(formatRawDateSegments(completedDate).formatted);
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

    // Reset Form - stays open by default, but fields blank
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

    // Open confirmation pop-up
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
      {/* Subtle dimming layer over the starfield on create post page for readability */}
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
            <View style={styles.section}>
              <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
                POSTING AS CLUB
              </ThemedText>
              <Pressable
                onPress={() => {
                  if (linkedClubs.length > 1) {
                    setIsClubSelectorOpen((prev) => !prev);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`Posting as ${activeClub.name}. Tap to switch club.`}
                style={[
                  styles.clubSelectorRow,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.clubMonogram,
                    { backgroundColor: activeClub.colors[0] },
                  ]}
                >
                  <ThemedText style={styles.clubMonogramText}>
                    {activeClub.mark}
                  </ThemedText>
                </View>
                <View style={styles.clubSelectorInfo}>
                  <ThemedText style={styles.clubSelectorName} numberOfLines={1}>
                    {activeClub.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    {activeClub.category} · Verified Club Leader
                  </ThemedText>
                </View>
                {linkedClubs.length > 1 ? (
                  <Icon
                    sf={isClubSelectorOpen ? 'chevron.up' : 'chevron.down'}
                    md={isClubSelectorOpen ? 'expand_less' : 'expand_more'}
                    size={18}
                    color={theme.textMuted}
                  />
                ) : (
                  <Badge label="ACTIVE" tone="success" />
                )}
              </Pressable>

              {/* Multiple Clubs Dropdown */}
              {isClubSelectorOpen && linkedClubs.length > 1 ? (
                <View
                  style={[
                    styles.dropdownList,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {linkedClubs.map((club) => (
                    <Pressable
                      key={club.id}
                      onPress={() => {
                        setActiveClub(club);
                        setIsClubSelectorOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        club.id === activeClub.id && {
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        },
                      ]}
                    >
                      <ThemedText style={{ fontWeight: club.id === activeClub.id ? '700' : '500' }}>
                        {club.name}
                      </ThemedText>
                      {club.id === activeClub.id && (
                        <Icon sf="checkmark" md="check" size={16} color={Brand.gold} />
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

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
            <View style={styles.section}>
              <FieldLabel
                label="PHOTO / BANNER"
                rightElement={
                  imageUrl || rawImage ? (
                    <Pressable
                      onPress={handleRemovePhoto}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove banner photo"
                    >
                      <ThemedText type="caption" style={{ color: Brand.brightRed, fontWeight: '600' }}>
                        Remove Photo
                      </ThemedText>
                    </Pressable>
                  ) : null
                }
              />

              {imageUrl || rawImage ? (
                <View style={{ gap: Spacing.two }}>
                  <View style={styles.forceCroppedContainer}>
                    {isEditing && rawImage ? (
                      <InlineImageCropper
                        ref={cropperRef}
                        imageUri={rawImage.uri}
                        imageDimensions={{ width: rawImage.width, height: rawImage.height }}
                        initialTransform={savedTransform}
                        onInteractionChange={setIsCroppingInteracting}
                      />
                    ) : (
                      <>
                        <Image
                          source={{ uri: imageUrl ?? rawImage?.uri }}
                          contentFit="cover"
                          style={styles.forceCroppedImage}
                        />
                        <View style={styles.cropBadge}>
                          <ThemedText type="caption" style={styles.cropBadgeText}>
                            16:9 CARD BANNER
                          </ThemedText>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Photo Actions: Full-width Change Photo (Left) & Edit / Done (Right) */}
                  <View style={styles.photoActionsRow}>
                    <Pressable
                      onPress={handlePickImage}
                      accessibilityRole="button"
                      accessibilityLabel="Change photo"
                      style={[
                        styles.photoActionButtonLarge,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                    >
                      <Icon sf="photo" md="image" size={18} color={theme.text} />
                      <ThemedText style={[styles.photoActionTextLarge, { color: theme.text }]}>
                        Change Photo
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={isEditing ? handleSaveCrop : handleStartEdit}
                      accessibilityRole="button"
                      accessibilityLabel={isEditing ? 'Done cropping photo' : 'Edit photo crop'}
                      disabled={isCropping}
                      style={[
                        styles.photoActionButtonLarge,
                        isEditing
                          ? {
                              borderColor: Brand.gold,
                              backgroundColor: Brand.gold,
                            }
                          : {
                              borderColor: Brand.gold,
                              backgroundColor: 'rgba(243, 195, 0, 0.12)',
                            },
                      ]}
                    >
                      {isCropping ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <>
                          <Icon
                            sf={isEditing ? 'checkmark' : 'crop'}
                            md={isEditing ? 'check' : 'crop'}
                            size={18}
                            color={isEditing ? '#000000' : Brand.gold}
                          />
                          <ThemedText
                            style={[
                              styles.photoActionTextLarge,
                              {
                                color: isEditing ? '#000000' : Brand.gold,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {isEditing ? 'Done' : 'Edit'}
                          </ThemedText>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickImage}
                  accessibilityRole="button"
                  accessibilityLabel="Upload custom banner photo"
                  style={[
                    styles.photoUploadBox,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                >
                  <View style={styles.uploadIconCircle}>
                    <Icon sf="photo.badge.plus" md="add_photo_alternate" size={24} color={Brand.gold} />
                  </View>
                  <View style={{ alignItems: 'center', gap: 3 }}>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                      Upload Banner Photo
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      Select image from device · Drag & zoom to 16:9 crop
                    </ThemedText>
                  </View>
                </Pressable>
              )}
            </View>

            {/* 5. DATE & TIME (ALWAYS VISIBLE INLINE, BLANK BY DEFAULT) */}
            <View
              style={styles.section}
              onLayout={(e) => {
                dateSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <FieldLabel
                icon={<Icon sf="calendar" md="event" size={16} color={Brand.gold} />}
                label="EVENT DATE & TIME"
              />

              <Card style={styles.eventSubCard}>
                {/* Segmented Mode Selector: Standard Time vs Custom Text */}
                <Segmented
                  options={['Standard Time', 'Custom Text'] as const}
                  value={isCustomWhen ? 'Custom Text' : 'Standard Time'}
                  onChange={(mode) => {
                    setIsCustomWhen(mode === 'Custom Text');
                    setDateError(null);
                    setTimeError(null);
                  }}
                />

                {!isCustomWhen ? (
                  <View style={{ gap: Spacing.two }}>
                    <View style={styles.structuredWhenRow}>
                      <View style={{ flex: 1.25, gap: 4 }}>
                        <ThemedText type="caption" themeColor="textMuted">DATE</ThemedText>
                        <View style={styles.dateInputWrapper}>
                          <SegmentedDateInput
                            value={rawDate}
                            onChange={handleRawDateChange}
                            onBlur={handleDateBlur}
                            onFocus={(e) => {
                              setIsDateFocused(true);
                              scrollToInput(dateSectionY.current);
                              handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
                            }}
                            hasError={Boolean(dateError)}
                          />
                          <AccessoryButton
                            onPress={() => setShowDatePicker(true)}
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
                          onChange={handleRawTimeChange}
                          period={timePeriod}
                          onTogglePeriod={handleTogglePeriod}
                          onFocus={(e) => {
                            setIsTimeFocused(true);
                            scrollToInput(dateSectionY.current);
                            handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
                          }}
                          onBlur={handleTimeBlur}
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
                      onChangeText={setCustomWhenText}
                      onFocus={(e) => {
                        setIsCustomWhenFocused(true);
                        scrollToInput(dateSectionY.current);
                        handleSmoothInputFocus(e, { scrollViewRef, targetY: dateSectionY.current });
                      }}
                      onBlur={() => {
                        setIsCustomWhenFocused(false);
                        setDateError(null);
                        setTimeError(null);
                      }}
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
            router.push('/');
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  charCounter: {
    fontSize: 11,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
  },
  clubSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two + 2,
  },
  clubMonogram: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubMonogramText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  clubSelectorInfo: {
    flex: 1,
  },
  clubSelectorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownList: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
  forceCroppedContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1C1D21',
  },
  forceCroppedImage: {
    width: '100%',
    height: '100%',
  },
  cropBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  cropBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  photoUploadBox: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 4,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(243, 195, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  photoActionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  photoActionTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventSubCard: {
    padding: Spacing.two + 2,
    gap: Spacing.two,
  },
  structuredWhenRow: {
    flexDirection: 'row',
    gap: Spacing.two,
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
});

function PostSuccessModal({
  visible,
  clubName,
  onClose,
  onViewFeed,
}: {
  visible: boolean;
  clubName: string;
  onClose: () => void;
  onViewFeed: () => void;
}) {
  return (
    <SuccessModal
      visible={visible}
      title="Post Published!"
      message={
        <ThemedText
          type="default"
          themeColor="textMuted"
          style={{ textAlign: 'center', fontSize: 15, lineHeight: 22, maxWidth: 300 }}
        >
          Your post for{' '}
          <ThemedText
            type="default"
            style={{ fontWeight: '700', color: Brand.renewGreen }}
          >
            {clubName}
          </ThemedText>{' '}
          is now live on the Knightly campus feed.
        </ThemedText>
      }
      primaryButton={{
        label: 'View in Feed',
        variant: 'primary',
        sf: 'sparkles',
        md: 'auto_awesome',
        onPress: onViewFeed,
      }}
      secondaryButton={{
        label: 'Got it',
        variant: 'secondary',
        onPress: onClose,
      }}
      onClose={onClose}
    />
  );
}
