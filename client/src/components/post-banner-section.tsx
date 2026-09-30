import React from 'react';
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
  onStartEdit,
  onSaveCrop,
  onCroppingInteractionChange,
}: PostBannerSectionProps) {
  const theme = useTheme();

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
        <Pressable
          onPress={onPickImage}
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
});
