import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import {
  InlineImageCropper,
  type CropTransformState,
  type InlineImageCropperRef,
} from '@/components/inline-image-cropper';
import { ThemedText } from '@/components/themed-text';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import {
  PRESET_COLOR_LIST,
  PRESET_PATTERN_LIST,
  createPresetBannerUri,
  getPresetBannerDetails,
  isPresetBanner,
  parsePresetBannerUri,
} from '@/constants/preset-banners';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PostBannerSectionProps {
  imageUrl: string | null;
  rawImage: { uri: string; width: number; height: number } | null;
  isEditing: boolean;
  isCropping: boolean;
  savedTransform: CropTransformState | null;
  cropperRef: React.RefObject<InlineImageCropperRef | null>;
  onPickImage: () => void;
  onRemovePhoto: () => void;
  onSelectPresetBanner?: (uri: string) => void;
  onStartEdit: () => void;
  onSaveCrop: () => void;
  onCroppingInteractionChange: (interacting: boolean) => void;
}

export function PostBannerSection({
  imageUrl,
  rawImage,
  isEditing,
  isCropping,
  savedTransform,
  cropperRef,
  onPickImage,
  onRemovePhoto,
  onSelectPresetBanner,
  onStartEdit,
  onSaveCrop,
  onCroppingInteractionChange,
}: PostBannerSectionProps) {
  const theme = useTheme();
  const [bannerMode, setBannerMode] = useState<'Color' | 'Pattern'>('Color');

  const isPreset = isPresetBanner(imageUrl);
  const { color: activeColor, pattern: activePattern } = parsePresetBannerUri(imageUrl);
  const presetDetails = getPresetBannerDetails(imageUrl);

  // Split color swatches across two balanced rows of 6
  const colorMidpoint = Math.ceil(PRESET_COLOR_LIST.length / 2);
  const colorRow1 = PRESET_COLOR_LIST.slice(0, colorMidpoint);
  const colorRow2 = PRESET_COLOR_LIST.slice(colorMidpoint);

  // Split pattern icons across two balanced rows of 6
  const patternMidpoint = Math.ceil(PRESET_PATTERN_LIST.length / 2);
  const patternRow1 = PRESET_PATTERN_LIST.slice(0, patternMidpoint);
  const patternRow2 = PRESET_PATTERN_LIST.slice(patternMidpoint);

  const renderColorButton = (colorPreset: (typeof PRESET_COLOR_LIST)[number]) => {
    const isSelected = activeColor === colorPreset.id;
    return (
      <Pressable
        key={colorPreset.id}
        onPress={() =>
          onSelectPresetBanner?.(createPresetBannerUri(colorPreset.id, activePattern))
        }
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Select ${colorPreset.name} background color`}
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.presetCircleButton,
          { backgroundColor: colorPreset.color },
          isSelected
            ? {
                borderWidth: 3.5,
                borderColor: Brand.gold,
                transform: [{ scale: 1.08 }],
              }
            : {
                borderWidth: 1.5,
                borderColor: theme.border,
              },
        ]}
      />
    );
  };

  const renderPatternButton = (patternPreset: (typeof PRESET_PATTERN_LIST)[number]) => {
    const isSelected = activePattern === patternPreset.id;
    return (
      <Pressable
        key={patternPreset.id}
        onPress={() => {
          // Tapping the active pattern toggles it off to 'none' (solid color)
          const nextPattern = isSelected ? 'none' : patternPreset.id;
          onSelectPresetBanner?.(createPresetBannerUri(activeColor, nextPattern));
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Select ${patternPreset.name} pattern`}
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.presetCircleButton,
          {
            backgroundColor: theme.backgroundElement,
          },
          isSelected
            ? {
                borderWidth: 3.5,
                borderColor: Brand.gold,
                transform: [{ scale: 1.08 }],
              }
            : {
                borderWidth: 1.5,
                borderColor: theme.border,
              },
        ]}
      >
        {patternPreset.iconAsset ? (
          <Image
            source={patternPreset.iconAsset}
            tintColor={isSelected ? Brand.gold : theme.text}
            contentFit="contain"
            style={{ width: 20, height: 20 }}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.section}>
      <FieldLabel
        label="PHOTO / BANNER"
        rightElement={
          imageUrl || rawImage ? (
            <Pressable
              onPress={onRemovePhoto}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove banner"
            >
              <ThemedText type="caption" style={{ color: Brand.brightRed, fontWeight: '600' }}>
                Remove Banner
              </ThemedText>
            </Pressable>
          ) : null
        }
      />

      {isPreset ? (
        <View style={{ gap: Spacing.two }}>
          {/* 16:9 Banner Preview: Solid Background Color + Dynamic Pattern Overlay */}
          <View
            style={[
              styles.forceCroppedContainer,
              { backgroundColor: presetDetails.colorHex },
            ]}
          >
            {presetDetails.patternAsset ? (
              <Image
                source={presetDetails.patternAsset}
                tintColor={presetDetails.accentColor}
                contentFit="cover"
                style={styles.forceCroppedImage}
              />
            ) : null}
            <View style={styles.cropBadge}>
              <ThemedText type="caption" style={styles.cropBadgeText}>
                16:9 CARD BANNER
              </ThemedText>
            </View>
          </View>

          {/* Segmented Mode Selector: Color vs Pattern */}
          <Segmented
            options={['Color', 'Pattern'] as const}
            value={bannerMode}
            onChange={setBannerMode}
          />

          {/* Circular Selector Buttons (Color Swatches OR Pattern Icons in 2 Balanced Rows of 6) */}
          {bannerMode === 'Color' ? (
            <View style={styles.presetPaletteGrid}>
              <View style={styles.presetPaletteRow}>
                {colorRow1.map(renderColorButton)}
              </View>
              <View style={styles.presetPaletteRow}>
                {colorRow2.map(renderColorButton)}
              </View>
            </View>
          ) : (
            <View style={styles.presetPaletteGrid}>
              <View style={styles.presetPaletteRow}>
                {patternRow1.map(renderPatternButton)}
              </View>
              <View style={styles.presetPaletteRow}>
                {patternRow2.map(renderPatternButton)}
              </View>
            </View>
          )}
        </View>
      ) : imageUrl || rawImage ? (
        <View style={{ gap: Spacing.two }}>
          <View style={styles.forceCroppedContainer}>
            {isEditing && rawImage ? (
              <InlineImageCropper
                ref={cropperRef as any}
                imageUri={rawImage.uri}
                imageDimensions={{ width: rawImage.width, height: rawImage.height }}
                initialTransform={savedTransform}
                onInteractionChange={onCroppingInteractionChange}
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

          {/* Photo Actions: Change Photo (Left) & Edit / Done (Right) */}
          <View style={styles.photoActionsRow}>
            <Pressable
              onPress={onPickImage}
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
              onPress={isEditing ? onSaveCrop : onStartEdit}
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
        <View style={styles.splitUploadRow}>
          {/* 1. Upload Photo */}
          <Pressable
            onPress={onPickImage}
            accessibilityRole="button"
            accessibilityLabel="Upload photo"
            style={[
              styles.splitUploadBox,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          >
            <View style={styles.uploadIconCircle}>
              <Icon sf="photo.badge.plus" md="add_photo_alternate" size={22} color={Brand.gold} />
            </View>
            <ThemedText style={[styles.splitUploadTitle, { color: theme.text }]}>
              Upload Photo
            </ThemedText>
          </Pressable>

          {/* 2. Simple Banners (Defaults to Solid Maroon, with pattern starting OFF) */}
          <Pressable
            onPress={() => onSelectPresetBanner?.(createPresetBannerUri('maroon', 'none'))}
            accessibilityRole="button"
            accessibilityLabel="Select simple banner"
            style={[
              styles.splitUploadBox,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          >
            <View style={styles.uploadIconCircle}>
              <Icon sf="paintpalette" md="palette" size={22} color={Brand.gold} />
            </View>
            <ThemedText style={[styles.splitUploadTitle, { color: theme.text }]}>
              Simple Banners
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
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
  splitUploadRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
  },
  splitUploadBox: {
    flex: 1,
    minHeight: 125,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 4,
  },
  splitUploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  presetPaletteGrid: {
    width: '100%',
    gap: Spacing.two,
  },
  presetPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: Spacing.one,
    paddingHorizontal: 2,
  },
  presetCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
});
