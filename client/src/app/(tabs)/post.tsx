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

import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image as RNImage,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { ModalDialog, ModalHeader } from '@/components/ui/modal-dialog';
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
  resolveEventTimeRange,
  sanitizeTime,
  validateDate,
  validateTimeRange,
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
  let pathname = '';
  try {
    pathname = usePathname();
  } catch {
    // Graceful fallback when outside Router context in tests
  }
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
  // WHAT IT DOES:
  // Step 1: Requests OS media library permissions (iOS / Android).
  // Step 2: Launches system image picker with standard unconstrained editing (`allowsEditing: false`).
  // Step 3: Probes image pixel dimensions via `manipulateAsync` or `RNImage.getSize` to feed into cropper.
  // Step 4: Enters interactive 16:9 crop mode so student can position/zoom their post banner.
  const handlePickImage = async () => {
    setIsCroppingInteracting(false);
    setIsCropping(false);
    tabNav?.setActiveTabIndex(4);
    try {
      // Step 1: Request media library permissions on native devices
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

      // Step 2: Launch device photo picker
      // WHY allowsEditing: false:
      // Native OS crop tools enforce platform-specific aspect ratios (e.g. square on iOS).
      // Disabling native editing lets our unified InlineImageCropper enforce an exact 16:9 banner
      // crop consistently across iOS, Android, and Web browsers.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
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

      // Step 3: Probe actual pixel dimensions
      // Some Android gallery providers return 0 for width/height in asset metadata.
      // Probing via manipulateAsync or RNImage.getSize guarantees accurate dimensions for the cropper.
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

      // Step 4: Initialize raw image state and enter interactive crop mode
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

  // Saves the active crop transform matrix and generates the 16:9 cropped banner artifact
  const handleSaveCrop = useCallback(async () => {
    if (isCropping) return;
    setIsCropping(true);
    setIsCroppingInteracting(false);
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
      setIsCroppingInteracting(false);
    }
  }, [isCropping]);

  const handleSaveCropRef = useRef(handleSaveCrop);
  handleSaveCropRef.current = handleSaveCrop;

  // Determine if the Post composer tab is currently the active foreground tab
  // WHY TAB AWARENESS:
  // All 4 (or 5) tab screens stay mounted in the horizontal pager track.
  // Tracking whether the Post tab is active allows auto-committing active crops on tab switch.
  const postTabIndex = useMemo(() => {
    if (!tabNav?.tabs) return 4;
    const idx = tabNav.tabs.findIndex((t) => t.name === 'post' || t.href === '/post');
    return idx >= 0 ? idx : 4;
  }, [tabNav?.tabs]);

  const isPostTabActive = useMemo(() => {
    // Check master tabNav activeTabIndex if tab navigation context is present
    if (tabNav && typeof tabNav.activeTabIndex === 'number') {
      if (tabNav.activeTabIndex !== postTabIndex) return false;
    }
    // Check Expo Router pathname if available
    if (pathname && pathname !== '/post') {
      const otherTabHrefs = ['/', '/dining', '/safety', '/directory'];
      if (otherTabHrefs.includes(pathname)) return false;
    }
    return true;
  }, [tabNav, postTabIndex, pathname]);

  // AUTO-COMMIT ON TAB SWITCH:
  // When cropping a photo in the Post tab, switching tabs (via bottom bar tap, horizontal
  // swipe gesture, or programmatic navigation) automatically ends the cropping mode and
  // commits the crop (identical to tapping the "Done" button).
  useEffect(() => {
    if (!isPostTabActive && isEditing) {
      setIsCroppingInteracting(false);
      handleSaveCropRef.current();
    }
  }, [isPostTabActive, isEditing]);

  // Re-opens interactive cropping mode for the currently selected raw image
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Clears any attached photo or preset banner, resetting back to text-only mode
  const handleRemovePhoto = () => {
    setIsCropping(false);
    setIsCroppingInteracting(false);
    setImageUrl(null);
    setRawImage(null);
    setSavedTransform(null);
    setIsEditing(false);
  };

  // Selects one of the curated Calvin university preset vector banners
  // Clears custom uploaded photos since preset banners are self-contained bundled SVGs
  const handleSelectPresetBanner = (presetUri: string) => {
    setIsCropping(false);
    setIsCroppingInteracting(false);
    setImageUrl(presetUri);
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

  // Time State (Start & End Time Range)
  const timeInputRef = useRef<MaskedTimeInputRef>(null);
  const [rawTime, setRawTime] = useState('');
  const [isTimeFocused, setIsTimeFocused] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');

  const endTimeInputRef = useRef<MaskedTimeInputRef>(null);
  const [rawEndTime, setRawEndTime] = useState('');
  const [isEndTimeFocused, setIsEndTimeFocused] = useState(false);
  const [endTimePeriod, setEndTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [endPeriodManuallySet, setEndPeriodManuallySet] = useState(false);

  // Validation error states
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);
  const timeRangeError = useMemo(
    () => validateTimeRange(rawTime, timePeriod, rawEndTime, endTimePeriod),
    [rawTime, timePeriod, rawEndTime, endTimePeriod]
  );
  const whenError = dateError || timeError || endTimeError || timeRangeError;

  // Freeform mode toggle
  const [isCustomWhen, setIsCustomWhen] = useState(false);
  const [customWhenText, setCustomWhenText] = useState('');
  const [isCustomWhenFocused, setIsCustomWhenFocused] = useState(false);

  // Location State
  const [whereText, setWhereText] = useState('');
  const [isWhereFocused, setIsWhereFocused] = useState(false);
  const [showLocationInfoModal, setShowLocationInfoModal] = useState(false);

  // Web-only DOM numeric filters
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const cleanupDate = attachNumericDomFilters(dateInputRef.current);
    const cleanupTime = attachNumericDomFilters(timeInputRef.current?.textInput ?? null);
    const cleanupEndTime = attachNumericDomFilters(endTimeInputRef.current?.textInput ?? null);
    return () => {
      cleanupDate();
      cleanupTime();
      cleanupEndTime();
    };
  }, [isCustomWhen]);

  const handleTogglePeriod = () => {
    const next = timePeriod === 'AM' ? 'PM' : 'AM';
    setTimePeriod(next);
    if (!endPeriodManuallySet && !rawEndTime) {
      setEndTimePeriod(next);
    }
  };

  const handleToggleEndPeriod = () => {
    setEndPeriodManuallySet(true);
    setEndTimePeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'));
  };

  // Success Confirmation Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedClubName, setPublishedClubName] = useState('');

  // Derived Date Segments
  const dateSegments = useMemo(() => formatDateSegments(rawDate), [rawDate]);

  // Translated human-friendly date and time preview
  // WHAT IT DOES:
  // Step 1: Validates that the entered date digits form a genuine calendar date.
  // Step 2: Formats the date using formatEventDate (e.g. "Tuesday, Oct 24, 2026").
  // Step 3: Validates and formats time digits with AM/PM period (e.g. "7:00 PM" or "7:00 – 9:00 PM").
  // Step 4: Combines into a live formatted preview string displayed beneath the input cells.
  const eventPreview = useMemo(() => {
    // Step 1: Check date validity for preview
    const isDateValidForPreview =
      !dateError &&
      (rawDate.length === 8 || rawDate.length === 6) &&
      validateDate(dateSegmentsState) === null &&
      validateDate(rawDate) === null &&
      isDateCompleteAndValid(rawDate);

    // Step 2: Format calendar date
    const formattedDate = isDateValidForPreview
      ? formatEventDate(
          rawDate.length === 6
            ? formatDateSegments(completeDateDigits(rawDate)).formatted
            : dateSegments.formatted
        )
      : '';

    // Step 3: Resolve event time with AM/PM period and time range support
    const isStartValid = !timeError && isTimeCompleteAndValid(rawTime);
    const isEndValid = !endTimeError && isTimeCompleteAndValid(rawEndTime);
    const hasRangeError = Boolean(timeRangeError);

    let resolvedTime = '';
    if (!hasRangeError) {
      if (rawTime && isStartValid && rawEndTime && isEndValid) {
        resolvedTime = resolveEventTimeRange(rawTime, timePeriod, rawEndTime, endTimePeriod);
      } else if (rawTime && isStartValid && !rawEndTime) {
        resolvedTime = resolveEventTime(rawTime, timePeriod);
      } else if (!rawTime && rawEndTime && isEndValid) {
        resolvedTime = resolveEventTime(rawEndTime, endTimePeriod);
      }
    }

    // Step 4: Concatenate with dot separator
    if (formattedDate && resolvedTime) {
      return `${formattedDate} · ${resolvedTime}`;
    }
    return formattedDate || resolvedTime || '';
  }, [
    dateError,
    timeError,
    endTimeError,
    timeRangeError,
    rawDate,
    dateSegmentsState,
    dateSegments.formatted,
    rawTime,
    timePeriod,
    rawEndTime,
    endTimePeriod,
  ]);

  // Form Validation Pipeline
  // Evaluates every field against length bounds, required status, and semantic validity
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
  const isEndTimeValid = isTimeCompleteAndValid(rawEndTime);
  const isWhereValid = whereText.length <= MAX_LOCATION_LENGTH;
  const isCustomWhenValid = !isCustomWhen || customWhenText.length <= MAX_CUSTOM_WHEN_LENGTH;

  // Master publish gate: User must be a leader, club selected, title & description valid,
  // location valid, and time/date fields either valid or in valid freeform mode.
  const canPublish =
    Boolean(isLeader) &&
    Boolean(activeClub) &&
    isTitleValid &&
    isDescValid &&
    isWhereValid &&
    isCustomWhenValid &&
    (isCustomWhen || (isDateValid && isTimeValid && isEndTimeValid && !whenError));

  // Resolve Final "When" Text
  // WHAT IT DOES:
  // - In freeform mode: Returns the custom description (e.g. "Every Tuesday at sunset").
  // - In structured mode: Formats the validated calendar date and clock time range into a single string.
  // - If omitted: Returns undefined so the post card simply hides the calendar badge.
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

    const isStartValidForWhen = !timeError && isTimeCompleteAndValid(rawTime);
    const isEndValidForWhen = !endTimeError && isTimeCompleteAndValid(rawEndTime);
    const hasRangeError = Boolean(timeRangeError);

    let resolvedTime: string | undefined = undefined;
    if (!hasRangeError) {
      if (rawTime && isStartValidForWhen && rawEndTime && isEndValidForWhen) {
        resolvedTime = resolveEventTimeRange(rawTime, timePeriod, rawEndTime, endTimePeriod);
      } else if (rawTime && isStartValidForWhen && !rawEndTime) {
        resolvedTime = resolveEventTime(rawTime, timePeriod);
      } else if (!rawTime && rawEndTime && isEndValidForWhen) {
        resolvedTime = resolveEventTime(rawEndTime, endTimePeriod);
      }
    }

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
    endTimeError,
    timeRangeError,
    rawDate,
    dateSegmentsState,
    rawTime,
    timePeriod,
    rawEndTime,
    endTimePeriod,
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

  const handleRawEndTimeChange = (raw: string) => {
    const result = sanitizeTime(raw, rawEndTime);
    setRawEndTime(result.digits);
    if (result.error) {
      setEndTimeError(result.error);
    } else {
      setEndTimeError(null);
    }
    endTimeInputRef.current?.setNativeValue(result.digits);
  };

  const handleEndTimeBlur = () => {
    setIsEndTimeFocused(false);
    if (!rawEndTime) {
      setEndTimeError(null);
      return;
    }

    const completed = completeTimeDigits(rawEndTime);
    if (completed && completed !== rawEndTime) {
      setRawEndTime(completed);
      endTimeInputRef.current?.setNativeValue(completed);
    }
  };

  // Handle Publish Lifecycle
  // WHAT IT DOES:
  // Step 1: Validates form completeness against `canPublish` and ensures an active club is selected.
  // Step 2: Auto-commits any active banner crop so student crop adjustments aren't lost if they hit publish directly.
  // Step 3: Finalizes any partially typed date digits (e.g. completes 2-digit year to 4-digit).
  // Step 4: Dispatches post creation payload to FeedContext.
  // Step 5: Resets all form fields and validation errors to clean state.
  // Step 6: Dismisses keyboard, scrolls composer back to top, and displays PostSuccessModal.
  const handlePublish = async () => {
    // Step 1: Guard against invalid submission
    if (!canPublish || !activeClub) return;

    const clubName = activeClub.name;
    let finalImageUrl = imageUrl;

    // Step 2: Auto-commit any active crop in the inline cropper before publishing
    // WHY AUTO-COMMIT:
    // If the student zoomed/panned their photo and immediately pressed "Publish Flyer"
    // without tapping "Done" first, we automatically capture their latest transform so their
    // crop adjustments are preserved on the feed card.
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

    // Step 3: Auto-complete 2-digit years to 4-digit if needed
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

    // Step 4: Publish post to feed context.
    // NOTE FOR BACKEND INTEGRATION: Currently, createPost generates client-side timestamps (Date.now()).
    // In production with a live backend API, the server must assign the post creation timestamp
    // to safeguard feed chronology against client device clock modifications.
    createPost({
      club: activeClub,
      title: trimmedTitle,
      description: trimmedDescription,
      image: finalImageUrl ?? undefined,
      when: computedWhen,
      where: computedWhere,
    });

    // Step 5: Reset all form fields to pristine initial state
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
    setRawEndTime('');
    setEndTimePeriod('PM');
    setEndPeriodManuallySet(false);
    setCustomWhenText('');
    setWhereText('');
    setDateError(null);
    setTimeError(null);
    setEndTimeError(null);

    // Step 6: Dismiss keyboard, scroll to top, and show celebration modal
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
              endTimeInputRef={endTimeInputRef}
              rawEndTime={rawEndTime}
              onRawEndTimeChange={handleRawEndTimeChange}
              endTimePeriod={endTimePeriod}
              onToggleEndPeriod={handleToggleEndPeriod}
              onEndTimeFocus={(e) => {
                setIsEndTimeFocused(true);
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
                setDateError(null);
                setTimeError(null);
                setEndTimeError(null);
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

        {/* Location Guidance Modal */}
        <ModalDialog
          visible={showLocationInfoModal}
          onClose={() => setShowLocationInfoModal(false)}
        >
          <ModalHeader
            title="Location Guide"
            icon={{ sf: 'mappin.and.ellipse', md: 'place', color: Brand.gold }}
            onClose={() => setShowLocationInfoModal(false)}
          />
          <View style={styles.infoModalBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Icon sf="checkmark.circle.fill" md="check_circle" size={14} color={Brand.gold} />
              </View>
              <ThemedText style={styles.infoText}>
                <Text style={styles.infoBold}>Optional field.</Text> Leave blank if your event or announcement is online, location-independent, or TBA.
              </ThemedText>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Icon sf="mappin.circle" md="room" size={14} color={Brand.gold} />
              </View>
              <ThemedText style={styles.infoText}>
                <Text style={styles.infoBold}>Campus or off-campus:</Text> Specify a room number, building, lawn, or address (e.g. <Text style={styles.infoItalic}>"Commons Lawn"</Text>, <Text style={styles.infoItalic}>"CFAC 222"</Text>, or <Text style={styles.infoItalic}>"Downtown Grand Rapids"</Text>).
              </ThemedText>
            </View>

            <View style={styles.infoModalFooter}>
              <Button
                label="Got it"
                variant="gold"
                size="regular"
                onPress={() => setShowLocationInfoModal(false)}
              />
            </View>
          </View>
        </ModalDialog>
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
