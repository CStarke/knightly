/**
 * Post Composer State & Business Logic Hook
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Centralizes all form state, validation pipelines, image manipulation/cropping,
 * calendar/time masking, and post creation dispatch for Knightly's event composer.
 *
 * ANTI-MONOLITH DECOUPLING (AGENTS.md Rule 4.3):
 * Decouples composer business logic from platform presentation trees, enabling
 * PostWebView and PostMobileView to share 100% identical state and validation
 * without duplicate code or cross-platform regression risk.
 */

import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image as RNImage,
  Platform,
  type TextInput,
} from 'react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { CropTransformState, InlineImageCropperRef } from '@/components/inline-image-cropper';
import type { MaskedTimeInputRef } from '@/components/masked-time-input';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import { useTabNavigation } from '@/context/tab-navigation-context';
import type { FeedCategory, Post } from '@/data/feed';
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

export const MAX_TITLE_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 280;
export const MAX_LOCATION_LENGTH = 25;
export const MAX_CUSTOM_WHEN_LENGTH = 25;

export interface PostComposerState {
  // Title
  title: string;
  setTitle: (text: string) => void;
  isTitleFocused: boolean;
  setIsTitleFocused: (focused: boolean) => void;

  // Description
  description: string;
  setDescription: (text: string) => void;
  descHeight: number;
  setDescHeight: (height: number) => void;
  isDescFocused: boolean;
  setIsDescFocused: (focused: boolean) => void;

  // Banner & Image
  imageUrl: string | null;
  rawImage: { uri: string; width: number; height: number } | null;
  isEditing: boolean;
  isCropping: boolean;
  isCroppingInteracting: boolean;
  savedTransform: CropTransformState | null;
  cropperRef: React.RefObject<InlineImageCropperRef | null>;
  handlePickImage: () => Promise<void>;
  handleSaveCrop: () => Promise<void>;
  handleStartEdit: () => void;
  handleRemovePhoto: () => void;
  handleSelectPresetBanner: (presetUri: string) => void;
  setIsCroppingInteracting: (interacting: boolean) => void;

  // Date
  dateInputRef: React.RefObject<TextInput | null>;
  rawDate: string;
  dateSegmentsState: { month: string; day: string; year: string };
  isDateFocused: boolean;
  setIsDateFocused: (focused: boolean) => void;
  selectedDate: string;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  dateError: string | null;
  handleRawDateChange: (raw: string, segments?: { month: string; day: string; year: string }) => void;
  handleDateBlur: (segments?: { month: string; day: string; year: string }) => void;
  handleSelectCalendarDate: (formattedDate: string) => void;

  // Time & Range
  timeInputRef: React.RefObject<MaskedTimeInputRef | null>;
  rawTime: string;
  isTimeFocused: boolean;
  setIsTimeFocused: (focused: boolean) => void;
  timePeriod: 'AM' | 'PM';
  handleTogglePeriod: () => void;
  handleRawTimeChange: (raw: string) => void;
  handleTimeBlur: () => void;
  timeError: string | null;

  endTimeInputRef: React.RefObject<MaskedTimeInputRef | null>;
  rawEndTime: string;
  isEndTimeFocused: boolean;
  setIsEndTimeFocused: (focused: boolean) => void;
  endTimePeriod: 'AM' | 'PM';
  handleToggleEndPeriod: () => void;
  handleRawEndTimeChange: (raw: string) => void;
  handleEndTimeBlur: () => void;
  endTimeError: string | null;
  timeRangeError: string | null;
  whenError: string | null;

  // Custom "When" Freeform
  isCustomWhen: boolean;
  setIsCustomWhen: (custom: boolean) => void;
  customWhenText: string;
  setCustomWhenText: (text: string) => void;
  isCustomWhenFocused: boolean;
  setIsCustomWhenFocused: (focused: boolean) => void;

  // Location
  whereText: string;
  setWhereText: (text: string) => void;
  isWhereFocused: boolean;
  setIsWhereFocused: (focused: boolean) => void;
  showLocationInfoModal: boolean;
  setShowLocationInfoModal: (show: boolean) => void;

  // Derived Values
  eventPreview: string;
  canPublish: boolean;
  computedWhen: string | undefined;
  computedWhere: string | undefined;
  previewDraftPost: Post;

  // Publishing & Modals
  handlePublish: () => Promise<void>;
  showSuccessModal: boolean;
  setShowSuccessModal: (show: boolean) => void;
  publishedClubName: string;
  handleViewFeed: () => void;

  // Leadership Context pass-throughs
  isLeader: boolean;
  activeClub: any;
  linkedClubs: any[];
  setActiveClub: (club: any) => void;
  openClaimModal: (source: 'banner' | 'profile') => void;
}

export function usePostComposer(): PostComposerState {
  const { isLeader, linkedClubs, activeClub, setActiveClub, openClaimModal } =
    useClubLeadership();
  const { createPost } = useFeed();
  const tabNav = useTabNavigation();

  let pathname = '';
  try {
    pathname = usePathname();
  } catch {
    // Graceful fallback when outside Router context in tests
  }

  // 1. Title State
  const [title, setTitle] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  // 2. Description State
  const [description, setDescription] = useState('');
  const [descHeight, setDescHeight] = useState(90);
  const [isDescFocused, setIsDescFocused] = useState(false);

  // 3. Banner & Photo State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isCroppingInteracting, setIsCroppingInteracting] = useState(false);
  const [savedTransform, setSavedTransform] = useState<CropTransformState | null>(null);
  const cropperRef = useRef<InlineImageCropperRef>(null);

  // 4. Date State
  const dateInputRef = useRef<TextInput>(null);
  const [rawDate, setRawDate] = useState('');
  const [dateSegmentsState, setDateSegmentsState] = useState({ month: '', day: '', year: '' });
  const [isDateFocused, setIsDateFocused] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // 5. Time State (Start & End Time Range)
  const timeInputRef = useRef<MaskedTimeInputRef>(null);
  const [rawTime, setRawTime] = useState('');
  const [isTimeFocused, setIsTimeFocused] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [timeError, setTimeError] = useState<string | null>(null);

  const endTimeInputRef = useRef<MaskedTimeInputRef>(null);
  const [rawEndTime, setRawEndTime] = useState('');
  const [isEndTimeFocused, setIsEndTimeFocused] = useState(false);
  const [endTimePeriod, setEndTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [endPeriodManuallySet, setEndPeriodManuallySet] = useState(false);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);

  // Freeform mode toggle
  const [isCustomWhen, setIsCustomWhen] = useState(false);
  const [customWhenText, setCustomWhenText] = useState('');
  const [isCustomWhenFocused, setIsCustomWhenFocused] = useState(false);

  // 6. Location State
  const [whereText, setWhereText] = useState('');
  const [isWhereFocused, setIsWhereFocused] = useState(false);
  const [showLocationInfoModal, setShowLocationInfoModal] = useState(false);

  // 7. Success Confirmation Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedClubName, setPublishedClubName] = useState('');

  // Auto-commit on tab switch
  const postTabIndex = useMemo(() => {
    if (!tabNav?.tabs) return 4;
    const idx = tabNav.tabs.findIndex((t) => t.name === 'post' || t.href === '/post');
    return idx >= 0 ? idx : 4;
  }, [tabNav?.tabs]);

  const isPostTabActive = useMemo(() => {
    if (tabNav && typeof tabNav.activeTabIndex === 'number') {
      if (tabNav.activeTabIndex !== postTabIndex) return false;
    }
    if (pathname && pathname !== '/post') {
      const otherTabHrefs = ['/', '/dining', '/safety', '/directory'];
      if (otherTabHrefs.includes(pathname)) return false;
    }
    return true;
  }, [tabNav, postTabIndex, pathname]);

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
      console.error('[usePostComposer] Error saving crop:', err);
      setIsEditing(false);
    } finally {
      setIsCropping(false);
      setIsCroppingInteracting(false);
    }
  }, [isCropping]);

  const handleSaveCropRef = useRef(handleSaveCrop);
  handleSaveCropRef.current = handleSaveCrop;

  useEffect(() => {
    if (!isPostTabActive && isEditing) {
      setIsCroppingInteracting(false);
      handleSaveCropRef.current();
    }
  }, [isPostTabActive, isEditing]);

  // Image actions
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
        allowsEditing: false,
        quality: 1,
      });

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
        console.warn('[usePostComposer] probe image failed, fallback to picker/getSize dimensions:', probeErr);
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
      console.error('[usePostComposer] Error launching image picker:', err);
    } finally {
      setIsCroppingInteracting(false);
      setIsCropping(false);
      tabNav?.setActiveTabIndex(4);
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

  const handleSelectPresetBanner = (presetUri: string) => {
    setIsCropping(false);
    setIsCroppingInteracting(false);
    setImageUrl(presetUri);
    setRawImage(null);
    setSavedTransform(null);
    setIsEditing(false);
  };

  // Date handling
  const dateSegments = useMemo(() => formatDateSegments(rawDate), [rawDate]);

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

    // Incomplete date during composition: do not prematurely yell at user
    if ((m && !d && !y) || (m && d && !y)) {
      setDateError(null);
      return;
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

  // Time handling
  const timeRangeError = useMemo(
    () => validateTimeRange(rawTime, timePeriod, rawEndTime, endTimePeriod),
    [rawTime, timePeriod, rawEndTime, endTimePeriod]
  );
  const whenError = dateError || timeError || endTimeError || timeRangeError;

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

  // Derived Event Preview String
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

  const canPublish =
    Boolean(isLeader) &&
    Boolean(activeClub) &&
    isTitleValid &&
    isDescValid &&
    isWhereValid &&
    isCustomWhenValid &&
    (isCustomWhen || (isDateValid && isTimeValid && isEndTimeValid && !whenError));

  // Computed When
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

  // Real-time Preview Draft Post Model
  const previewDraftPost: Post = useMemo(() => {
    return {
      id: 'preview-draft',
      clubId: activeClub?.id ?? 'preview-club',
      org: activeClub?.name ?? 'Calvin Student Club',
      mark: activeClub?.mark,
      category: (activeClub?.category as FeedCategory) ?? 'Official',
      postedAt: 'Just now',
      createdAt: Date.now(),
      headline: trimmedTitle || 'Your Title Will Appear Here',
      body:
        trimmedDescription ||
        'Add a clear event description, agenda, or announcement details. As you type, this preview updates in real-time!',
      image: imageUrl ?? undefined,
      when: computedWhen,
      where: computedWhere,
      followed: false,
      campusWide: true,
    };
  }, [
    activeClub,
    trimmedTitle,
    trimmedDescription,
    imageUrl,
    computedWhen,
    computedWhere,
  ]);

  // Publish Submission Lifecycle
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
        console.warn('[usePostComposer] Auto-applying crop before publish failed:', cropErr);
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
    setRawEndTime('');
    setEndTimePeriod('PM');
    setEndPeriodManuallySet(false);
    setCustomWhenText('');
    setWhereText('');
    setDateError(null);
    setTimeError(null);
    setEndTimeError(null);

    setPublishedClubName(clubName);
    setShowSuccessModal(true);
  };

  const handleViewFeed = () => {
    setShowSuccessModal(false);
    if (tabNav) {
      tabNav.navigateToTab(0, '/');
    } else {
      router.navigate('/');
    }
  };

  return {
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
    dateInputRef,
    rawDate,
    dateSegmentsState,
    isDateFocused,
    setIsDateFocused,
    selectedDate,
    showDatePicker,
    setShowDatePicker,
    dateError,
    handleRawDateChange,
    handleDateBlur,
    handleSelectCalendarDate,
    timeInputRef,
    rawTime,
    isTimeFocused,
    setIsTimeFocused,
    timePeriod,
    handleTogglePeriod,
    handleRawTimeChange,
    handleTimeBlur,
    timeError,
    endTimeInputRef,
    rawEndTime,
    isEndTimeFocused,
    setIsEndTimeFocused,
    endTimePeriod,
    handleToggleEndPeriod,
    handleRawEndTimeChange,
    handleEndTimeBlur,
    endTimeError,
    timeRangeError,
    whenError,
    isCustomWhen,
    setIsCustomWhen,
    customWhenText,
    setCustomWhenText,
    isCustomWhenFocused,
    setIsCustomWhenFocused,
    whereText,
    setWhereText,
    isWhereFocused,
    setIsWhereFocused,
    showLocationInfoModal,
    setShowLocationInfoModal,
    eventPreview,
    canPublish,
    computedWhen,
    computedWhere,
    previewDraftPost,
    handlePublish,
    showSuccessModal,
    setShowSuccessModal,
    publishedClubName,
    handleViewFeed,
    isLeader,
    activeClub,
    linkedClubs,
    setActiveClub,
    openClaimModal,
  };
}
