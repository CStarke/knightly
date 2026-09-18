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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image as RNImage,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AccessoryButton } from '@/components/ui/accessory-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabContentInset, Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import { useImageCropper } from '@/context/image-cropper-context';
import { useTabPagerPriority } from '@/context/tab-pager-priority-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  completeTimeDigits,
  formatEventDate,
  formatRawDateSegments,
  formatRawTimeSegments,
  getMaxDaysForMonth,
  getMaxTimeRawDigitLength,
  getNextOccurrenceYear,
  isDateCompleteAndValid,
  isTimeCompleteAndValid,
  resolveTimeWithPeriod,
  sanitizeDateDigits,
  sanitizeTimeDigits,
  sanitizeTimeDigitsWithError,
  validateDateOnBlur,
} from '@/utils/date-format';
import {
  attachNumericDomFilters,
  handleNumericKeyPress,
} from '@/utils/numeric-input';

export const MAX_TITLE_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 280;
export const MAX_LOCATION_LENGTH = 25;
export const MAX_CUSTOM_WHEN_LENGTH = 25;
export { formatEventDate };

/** Smooth blinking gold cursor for masked date/time fields */
function BlinkingCursor({
  color = Brand.gold,
  style,
}: {
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={[
        {
          width: 1.5,
          height: 16,
          backgroundColor: color,
          borderRadius: 0,
          opacity: visible ? 1 : 0,
        },
        style,
      ]}
    />
  );
}

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

  const scrollToInput = (sectionY: number, isNearBottom = false) => {
    setTimeout(() => {
      if (isNearBottom) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      } else {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, sectionY - 16),
          animated: true,
        });
      }
    }, Platform.OS === 'android' ? 100 : 50);
  };

  const handleWebScrollIntoView = (e: any) => {
    if (Platform.OS === 'web' && e?.target?.scrollIntoView) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Form State
  const [title, setTitle] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [description, setDescription] = useState('');
  const [descHeight, setDescHeight] = useState(90);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<{ uri: string; width: number; height: number } | null>(null);
  const { openCropper } = useImageCropper();

  // Pick an image from the user's device photo library
  const handlePickImage = async () => {
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
      openCropper({
        imageUri: finalUri,
        imageDimensions: { width, height },
        onCropComplete: (croppedUri) => {
          setImageUrl(croppedUri);
        },
      });
    } catch (err) {
      console.error('[CreatePostScreen] Error launching image picker:', err);
    }
  };

  // Date State (Numeric masked input: MMDDYYYY, slashes appear dynamically on char 3 and char 5)
  const dateInputRef = useRef<TextInput>(null);
  const [rawDate, setRawDate] = useState('');
  const [isDateFocused, setIsDateFocused] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time State (Numeric masked input: e.g. 700 -> 7:00, fake colon appears dynamically)
  const timeInputRef = useRef<TextInput>(null);
  const [rawTime, setRawTime] = useState('');
  const [isTimeFocused, setIsTimeFocused] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');

  // Event Date & Time validation error state (shown in red at bottom of card)
  const [whenError, setWhenError] = useState<string | null>(null);

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
    const cleanupTime = attachNumericDomFilters(timeInputRef.current);
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

  // Derived Time Segments for non-selectable visual masking
  const timeSegments = useMemo(() => formatRawTimeSegments(rawTime), [rawTime]);
  const maxTimeRawDigits = useMemo(() => getMaxTimeRawDigitLength(rawTime), [rawTime]);

  // Translated human-friendly date and time preview shown below inputs
  const eventPreview = useMemo(() => {
    const isFullDate = rawDate.length === 8;
    const formattedDate = isFullDate ? formatEventDate(dateSegments.formatted) : '';
    const resolvedTime = resolveTimeWithPeriod(rawTime, timePeriod);
    if (formattedDate && resolvedTime) {
      return `${formattedDate} · ${resolvedTime}`;
    }
    return formattedDate || resolvedTime || '';
  }, [rawDate.length, dateSegments.formatted, rawTime, timePeriod]);

  // Validation
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const isTitleValid =
    trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_LENGTH;
  const isDescValid =
    trimmedDescription.length > 0 &&
    trimmedDescription.length <= MAX_DESCRIPTION_LENGTH;
  const isDateValid = isDateCompleteAndValid(rawDate);
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

    const isFullDate = rawDate.length === 8;
    const formattedDate = isFullDate
      ? formatEventDate(dateSegments.formatted)
      : dateSegments.formatted.trim() || undefined;
    const resolvedTime = resolveTimeWithPeriod(rawTime, timePeriod);

    if (!formattedDate && !resolvedTime) return undefined;

    if (formattedDate && resolvedTime) {
      return `${formattedDate} · ${resolvedTime}`;
    }
    return formattedDate || resolvedTime || undefined;
  }, [isCustomWhen, customWhenText, rawDate.length, dateSegments.formatted, rawTime, timePeriod]);

  // Resolve Final "Where" Text
  const computedWhere = useMemo(() => {
    return whereText.trim() || undefined;
  }, [whereText]);

  const handleRawDateChange = (raw: string) => {
    const result = sanitizeDateDigits(raw, rawDate);
    setRawDate(result.digits);
    const segs = formatRawDateSegments(result.digits);
    setSelectedDate(segs.formatted);
    if (result.error) {
      setWhenError(result.error);
    } else {
      setWhenError(null);
    }
    if (dateInputRef.current) {
      const node = (dateInputRef.current as any)._node || (dateInputRef.current as any);
      if (node && 'value' in node && node.value !== result.digits) {
        node.value = result.digits;
      }
    }
  };

  const handleDateBlur = () => {
    setIsDateFocused(false);

    if (!rawDate) {
      setWhenError(null);
      return;
    }

    // If a valid month and day are present on lost focus, but no year (4 digits MMDD),
    // automatically fill the year with the next year when the specified date will take place
    if (rawDate.length === 4) {
      const m = parseInt(rawDate.slice(0, 2), 10);
      const d = parseInt(rawDate.slice(2, 4), 10);
      if (m < 1 || m > 12) {
        setWhenError('Month must be between 01-12');
        return;
      }
      const maxPossibleDays = m === 2 ? 29 : getMaxDaysForMonth(m, 2024);
      if (d < 1 || d > maxPossibleDays) {
        setWhenError(`Day must be between 01-${maxPossibleDays}`);
        return;
      }
      const nextYear = getNextOccurrenceYear(m, d, new Date());
      const completedRaw = `${rawDate}${nextYear}`;
      setRawDate(completedRaw);
      const segs = formatRawDateSegments(completedRaw);
      setSelectedDate(segs.formatted);
      setWhenError(null);
      if (dateInputRef.current) {
        const node = (dateInputRef.current as any)._node || (dateInputRef.current as any);
        if (node && 'value' in node) {
          node.value = completedRaw;
        }
      }
      return;
    }

    // Validate on blur and set error if invalid/incomplete
    const error = validateDateOnBlur(rawDate);
    setWhenError(error);
  };

  const handleSelectCalendarDate = (formattedDate: string) => {
    setSelectedDate(formattedDate);
    const cleaned = formattedDate.replace(/[^0-9]/g, '').slice(0, 8);
    setRawDate(cleaned);
    setWhenError(null);
  };

  const handleRawTimeChange = (raw: string) => {
    const result = sanitizeTimeDigitsWithError(raw, rawTime);
    setRawTime(result.digits);
    if (result.error) {
      setWhenError(result.error);
    } else {
      setWhenError(null);
    }
    if (timeInputRef.current) {
      const node = (timeInputRef.current as any)._node || (timeInputRef.current as any);
      if (node && 'value' in node && node.value !== result.digits) {
        node.value = result.digits;
      }
    }
  };

  const handleTimeBlur = () => {
    setIsTimeFocused(false);
    if (!rawTime) {
      setWhenError(null);
      return;
    }

    const completed = completeTimeDigits(rawTime);
    if (completed && completed !== rawTime) {
      setRawTime(completed);
      if (timeInputRef.current) {
        const node = (timeInputRef.current as any)._node || (timeInputRef.current as any);
        if (node && 'value' in node) {
          node.value = completed;
        }
      }
    }
  };

  // Handle Publish
  const handlePublish = () => {
    if (!canPublish || !activeClub) return;

    const clubName = activeClub.name;

    createPost({
      club: activeClub,
      title: trimmedTitle,
      description: trimmedDescription,
      image: imageUrl ?? undefined,
      when: computedWhen,
      where: computedWhere,
    });

    // Reset Form - stays open by default, but fields blank
    setTitle('');
    setDescription('');
    setImageUrl(null);
    setRawImage(null);
    setIsCustomWhen(false);
    setRawDate('');
    setSelectedDate('');
    setRawTime('');
    setTimePeriod('PM');
    setCustomWhenText('');
    setWhereText('');

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
              <View style={styles.labelRow}>
                <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
                  POST TITLE <ThemedText style={{ color: Brand.brightRed }}>*</ThemedText>
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={[
                    styles.charCounter,
                    {
                      color:
                        title.length > MAX_TITLE_LENGTH
                          ? Brand.brightRed
                          : theme.textMuted,
                    },
                  ]}
                >
                  {title.length}/{MAX_TITLE_LENGTH}
                </ThemedText>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onFocus={(e) => {
                  setIsTitleFocused(true);
                  scrollToInput(titleSectionY.current);
                  handleWebScrollIntoView(e);
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
              <View style={styles.labelRow}>
                <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
                  DESCRIPTION <ThemedText style={{ color: Brand.brightRed }}>*</ThemedText>
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={[
                    styles.charCounter,
                    {
                      color:
                        description.length > MAX_DESCRIPTION_LENGTH
                          ? Brand.brightRed
                          : theme.textMuted,
                    },
                  ]}
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </ThemedText>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                onContentSizeChange={(e) => {
                  setDescHeight(Math.max(90, e.nativeEvent.contentSize.height));
                }}
                onFocus={(e) => {
                  setIsDescFocused(true);
                  scrollToInput(descSectionY.current);
                  handleWebScrollIntoView(e);
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
              <View style={styles.labelRow}>
                <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
                  PHOTO / BANNER
                </ThemedText>
                {imageUrl ? (
                  <Pressable
                    onPress={() => {
                      setImageUrl(null);
                      setRawImage(null);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove banner photo"
                  >
                    <ThemedText type="caption" style={{ color: Brand.brightRed, fontWeight: '600' }}>
                      Remove Photo
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {imageUrl ? (
                <View style={{ gap: Spacing.two }}>
                  <View style={styles.forceCroppedContainer}>
                    <Image
                      source={{ uri: imageUrl }}
                      contentFit="cover"
                      style={styles.forceCroppedImage}
                    />
                    <View style={styles.cropBadge}>
                      <ThemedText type="caption" style={styles.cropBadgeText}>
                        16:9 CARD BANNER
                      </ThemedText>
                    </View>
                  </View>

                  {/* Photo Actions: Adjust Crop, Change Photo, Remove */}
                  <View style={styles.photoActionsRow}>
                    {rawImage ? (
                      <Pressable
                        onPress={() => {
                          if (rawImage) {
                            openCropper({
                              imageUri: rawImage.uri,
                              imageDimensions: { width: rawImage.width, height: rawImage.height },
                              onCropComplete: (croppedUri) => {
                                setImageUrl(croppedUri);
                              },
                            });
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Adjust 16:9 photo crop"
                        style={[
                          styles.photoActionButton,
                          {
                            borderColor: Brand.gold,
                            backgroundColor: 'rgba(243, 195, 0, 0.12)',
                          },
                        ]}
                      >
                        <Icon sf="crop" md="crop" size={14} color={Brand.gold} />
                        <ThemedText style={[styles.photoActionText, { color: Brand.gold }]}>
                          Adjust Crop
                        </ThemedText>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={handlePickImage}
                      accessibilityRole="button"
                      accessibilityLabel="Change photo"
                      style={[
                        styles.photoActionButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                    >
                      <Icon sf="photo" md="image" size={14} color={theme.text} />
                      <ThemedText style={[styles.photoActionText, { color: theme.text }]}>
                        Change Photo
                      </ThemedText>
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
              <View style={styles.sectionHeaderRow}>
                <Icon sf="calendar" md="event" size={16} color={Brand.gold} />
                <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
                  EVENT DATE & TIME
                </ThemedText>
              </View>

              <Card style={styles.eventSubCard}>
                {/* Segmented Mode Selector: Standard Time vs Custom Text */}
                <Segmented
                  options={['Standard Time', 'Custom Text'] as const}
                  value={isCustomWhen ? 'Custom Text' : 'Standard Time'}
                  onChange={(mode) => {
                    setIsCustomWhen(mode === 'Custom Text');
                    setWhenError(null);
                  }}
                />

                {!isCustomWhen ? (
                  <View style={{ gap: Spacing.two }}>
                    <View style={styles.structuredWhenRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <ThemedText type="caption" themeColor="textMuted">DATE</ThemedText>
                        <View style={styles.dateInputWrapper}>
                          <View
                            style={[
                              styles.maskedInputBox,
                              {
                                backgroundColor: theme.backgroundElement,
                                borderColor: isDateFocused ? Brand.gold : theme.border,
                              },
                            ]}
                          >
                            <TextInput
                              ref={dateInputRef}
                              value={rawDate}
                              onChangeText={handleRawDateChange}
                              onKeyPress={handleNumericKeyPress}
                              onFocus={(e) => {
                                setIsDateFocused(true);
                                scrollToInput(dateSectionY.current);
                                handleWebScrollIntoView(e);
                              }}
                              onBlur={handleDateBlur}
                              keyboardType="number-pad"
                              inputMode="numeric"
                              maxLength={8}
                              caretHidden={true}
                              selectionColor="transparent"
                              autoCorrect={false}
                              accessibilityLabel="Event date in MM/DD/YYYY format"
                              style={styles.invisibleInput}
                            />
                            <View pointerEvents="none" style={styles.maskedDisplayRow}>
                              {rawDate.length === 0 ? (
                                <View style={styles.maskedPlaceholderRow}>
                                  {isDateFocused && (
                                    <BlinkingCursor color={Brand.gold} style={styles.emptyCursorAbsolute} />
                                  )}
                                  <ThemedText style={[styles.maskedPlaceholderText, { color: theme.textMuted }]}>
                                    MM/DD/YYYY
                                  </ThemedText>
                                </View>
                              ) : (
                                <View style={styles.maskedDigitsRow}>
                                  <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                                    {dateSegments.part1}
                                  </ThemedText>
                                  {dateSegments.showSlash1 && (
                                    <ThemedText style={[styles.maskedSeparatorText, { color: theme.text }]}>
                                      /
                                    </ThemedText>
                                  )}
                                  <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                                    {dateSegments.part2}
                                  </ThemedText>
                                  {dateSegments.showSlash2 && (
                                    <ThemedText style={[styles.maskedSeparatorText, { color: theme.text }]}>
                                      /
                                    </ThemedText>
                                  )}
                                  <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                                    {dateSegments.part3}
                                  </ThemedText>
                                  {isDateFocused && (
                                    <BlinkingCursor color={Brand.gold} style={styles.trailingCursor} />
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                          <AccessoryButton
                            onPress={() => setShowDatePicker(true)}
                            accessibilityLabel="Open calendar date picker"
                            style={styles.calendarIconBtn}
                          >
                            <Icon sf="calendar" md="calendar_today" size={16} color={Brand.gold} />
                          </AccessoryButton>
                        </View>
                      </View>

                      <View style={{ flex: 1, gap: 4 }}>
                        <ThemedText type="caption" themeColor="textMuted">TIME</ThemedText>
                        <View style={styles.timeInputWrapper}>
                          <View
                            style={[
                              styles.maskedInputBox,
                              {
                                backgroundColor: theme.backgroundElement,
                                borderColor: isTimeFocused ? Brand.gold : theme.border,
                              },
                            ]}
                          >
                            <TextInput
                              ref={timeInputRef}
                              value={rawTime}
                              onChangeText={handleRawTimeChange}
                              onKeyPress={handleNumericKeyPress}
                              onFocus={(e) => {
                                setIsTimeFocused(true);
                                scrollToInput(dateSectionY.current);
                                handleWebScrollIntoView(e);
                              }}
                              onBlur={handleTimeBlur}
                              keyboardType="number-pad"
                              inputMode="numeric"
                              maxLength={maxTimeRawDigits}
                              caretHidden={true}
                              selectionColor="transparent"
                              autoCorrect={false}
                              accessibilityLabel="Event time"
                              style={styles.invisibleInput}
                            />
                            <View pointerEvents="none" style={styles.maskedDisplayRow}>
                              {rawTime.length === 0 ? (
                                <View style={styles.maskedPlaceholderRow}>
                                  {isTimeFocused && (
                                    <BlinkingCursor color={Brand.gold} style={styles.emptyCursorAbsolute} />
                                  )}
                                  <ThemedText style={[styles.maskedPlaceholderText, { color: theme.textMuted }]}>
                                    e.g. 7:00
                                  </ThemedText>
                                </View>
                              ) : (
                                <View style={styles.maskedDigitsRow}>
                                  <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                                    {timeSegments.part1}
                                  </ThemedText>
                                  {timeSegments.showColon && (
                                    <ThemedText style={[styles.maskedSeparatorText, { color: theme.text }]}>
                                      :
                                    </ThemedText>
                                  )}
                                  <ThemedText style={[styles.maskedDigitText, { color: theme.text }]}>
                                    {timeSegments.part2}
                                  </ThemedText>
                                  {isTimeFocused && (
                                    <BlinkingCursor color={Brand.gold} style={styles.trailingCursor} />
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                          <AccessoryButton
                            onPress={handleTogglePeriod}
                            accessibilityLabel={`Current time period is ${timePeriod}. Tap to toggle.`}
                            style={styles.periodToggleBtn}
                          >
                            <ThemedText style={styles.periodToggleText}>{timePeriod}</ThemedText>
                          </AccessoryButton>
                        </View>
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
                    <View style={styles.labelRow}>
                      <ThemedText type="caption" themeColor="textMuted">
                        CUSTOM EVENT TIME TEXT
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.charCounter,
                          {
                            color:
                              customWhenText.length > MAX_CUSTOM_WHEN_LENGTH
                                ? Brand.brightRed
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {customWhenText.length}/{MAX_CUSTOM_WHEN_LENGTH}
                      </ThemedText>
                    </View>
                    <TextInput
                      value={customWhenText}
                      onChangeText={setCustomWhenText}
                      onFocus={(e) => {
                        setIsCustomWhenFocused(true);
                        scrollToInput(dateSectionY.current);
                        handleWebScrollIntoView(e);
                      }}
                      onBlur={() => {
                        setIsCustomWhenFocused(false);
                        setWhenError(null);
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
              <View style={styles.labelRow}>
                <View style={styles.sectionHeaderRow}>
                  <Icon sf="mappin.and.ellipse" md="place" size={16} color={Brand.gold} />
                  <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
                    LOCATION
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={[
                    styles.charCounter,
                    {
                      color:
                        whereText.length > MAX_LOCATION_LENGTH
                          ? Brand.brightRed
                          : theme.textMuted,
                    },
                  ]}
                >
                  {whereText.length}/{MAX_LOCATION_LENGTH}
                </ThemedText>
              </View>

              <TextInput
                value={whereText}
                onChangeText={setWhereText}
                onFocus={(e) => {
                  setIsWhereFocused(true);
                  scrollToInput(locationSectionY.current, true);
                  handleWebScrollIntoView(e);
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
    paddingBottom: Spacing.four * 2,
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
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  eventSubCard: {
    padding: Spacing.two + 2,
    gap: Spacing.two,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  maskedInputBox: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
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
  },
  maskedDisplayRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: Spacing.two + 4,
    right: Spacing.two + 4,
    justifyContent: 'center',
    zIndex: 1,
  },
  maskedPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  emptyCursorAbsolute: {
    position: 'absolute',
    left: 0,
  },
  maskedPlaceholderText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 4,
  },
  maskedDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maskedDigitText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  maskedSeparatorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginHorizontal: 0.5,
  },
  trailingCursor: {
    marginLeft: 2,
  },
  timeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodToggleBtn: {
    height: 40,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodToggleText: {
    color: Brand.gold,
    fontSize: 12,
    fontWeight: '700',
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
    width: 44,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function parseDateOrDefault(dateStr: string) {
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

function DatePickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}: {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectDate: (formattedDate: string) => void;
}) {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={datePickerStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            datePickerStyles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              transform: [{ translateY: verticalShift }],
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <View style={datePickerStyles.modalHeader}>
            <View style={datePickerStyles.headerTitleRow}>
              <Icon sf="calendar" md="event" size={20} color={Brand.gold} />
              <ThemedText type="headline" style={datePickerStyles.headerTitle}>
                Select Event Date
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={datePickerStyles.closeButton}
            >
              <Icon sf="xmark" md="close" size={18} color={theme.textMuted} />
            </Pressable>
          </View>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const datePickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
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
  const theme = useTheme();
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0.3;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 11, stiffness: 160, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, scale, opacity]);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />
        <View
          style={[
            modalStyles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: Brand.renewGreen,
            },
          ]}
        >
          {/* Big animated green checkmark symbol in Renew Green */}
          <Animated.View style={[modalStyles.checkContainer, animatedCheckStyle]}>
            <View style={modalStyles.checkRing}>
              <Icon
                sf="checkmark"
                md="check"
                size={52}
                color={Brand.renewGreen}
                weight="bold"
              />
            </View>
          </Animated.View>

          <ThemedText type="headline" style={modalStyles.title}>
            Post Published!
          </ThemedText>

          <ThemedText
            type="default"
            themeColor="textMuted"
            style={modalStyles.subtitle}
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

          {/* View Feed Button */}
          <Button
            label="View in Feed"
            variant="primary"
            sf="sparkles"
            md="auto_awesome"
            onPress={onViewFeed}
            style={modalStyles.feedButton}
          />

          {/* Got it Button */}
          <Button
            label="Got it"
            variant="secondary"
            onPress={onClose}
            style={modalStyles.gotItButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    borderWidth: 2,
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three + 4,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  checkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  checkRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(162, 214, 131, 0.14)',
    borderWidth: 3,
    borderColor: Brand.renewGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
  },
  feedButton: {
    width: '100%',
    marginTop: Spacing.four,
  },
  gotItButton: {
    width: '100%',
    marginTop: Spacing.two,
  },
});
