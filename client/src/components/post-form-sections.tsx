import React from 'react';
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  type TextInputContentSizeChangeEventData,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { FieldLabel } from '@/components/ui/field-label';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Icon } from '@/components/ui/icon';
import { Brand } from '@/constants/theme';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
} from '@/hooks/use-post-composer';

// ============================================================================
// 1. Post Title Section
// ============================================================================

export interface PostTitleSectionProps {
  value: string;
  onChangeText: (text: string) => void;
  isFocused?: boolean;
  onFocus?: (e?: any) => void;
  onBlur?: (e?: any) => void;
  variant?: 'standard' | 'headline';
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function PostTitleSection({
  value,
  onChangeText,
  isFocused,
  onFocus,
  onBlur,
  variant = 'standard',
  style,
  containerStyle,
  onLayout,
}: PostTitleSectionProps) {
  const isHeadline = variant === 'headline';

  return (
    <View style={[styles.section, containerStyle]} onLayout={onLayout}>
      <FieldLabel
        label="POST TITLE"
        required
        currentLength={value.length}
        maxLength={MAX_TITLE_LENGTH}
      />
      <FormTextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        isFocused={isFocused}
        hasError={value.length > MAX_TITLE_LENGTH}
        placeholder="What's the event?"
        maxLength={MAX_TITLE_LENGTH}
        variant={variant}
        multiline={isHeadline}
        scrollEnabled={!isHeadline}
        blurOnSubmit={isHeadline}
        returnKeyType={isHeadline ? 'done' : undefined}
        numberOfLines={isHeadline ? 2 : 1}
        style={[!isHeadline && styles.titleInput, style]}
      />
    </View>
  );
}

// ============================================================================
// 2. Post Description Section
// ============================================================================

export interface PostDescriptionSectionProps {
  value: string;
  onChangeText: (text: string) => void;
  height?: number;
  onContentSizeChange?: (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => void;
  isFocused?: boolean;
  onFocus?: (e?: any) => void;
  onBlur?: (e?: any) => void;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function PostDescriptionSection({
  value,
  onChangeText,
  height,
  onContentSizeChange,
  isFocused,
  onFocus,
  onBlur,
  style,
  containerStyle,
  onLayout,
}: PostDescriptionSectionProps) {
  return (
    <View style={[styles.section, containerStyle]} onLayout={onLayout}>
      <FieldLabel
        label="DESCRIPTION"
        required
        currentLength={value.length}
        maxLength={MAX_DESCRIPTION_LENGTH}
      />
      <FormTextInput
        value={value}
        onChangeText={onChangeText}
        onContentSizeChange={onContentSizeChange}
        onFocus={onFocus}
        onBlur={onBlur}
        isFocused={isFocused}
        hasError={value.length > MAX_DESCRIPTION_LENGTH}
        placeholder="What is happening? Describe the activity, meeting agenda, or announcements..."
        multiline
        scrollEnabled={false}
        numberOfLines={4}
        maxLength={MAX_DESCRIPTION_LENGTH}
        variant="multiline"
        style={height ? [{ height }, style] : style}
      />
    </View>
  );
}

// ============================================================================
// 3. Post Location Section
// ============================================================================

export interface PostLocationSectionProps {
  value: string;
  onChangeText: (text: string) => void;
  isFocused?: boolean;
  onFocus?: (e?: any) => void;
  onBlur?: (e?: any) => void;
  onOpenInfoModal?: () => void;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function PostLocationSection({
  value,
  onChangeText,
  isFocused,
  onFocus,
  onBlur,
  onOpenInfoModal,
  style,
  containerStyle,
  onLayout,
}: PostLocationSectionProps) {
  return (
    <View style={[styles.section, containerStyle]} onLayout={onLayout}>
      <FieldLabel
        icon={<Icon sf="mappin.and.ellipse" md="place" size={13} color={Brand.gold} />}
        label="LOCATION"
        currentLength={value.length}
        maxLength={MAX_LOCATION_LENGTH}
        infoButton={
          onOpenInfoModal ? (
            <Pressable
              onPress={onOpenInfoModal}
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
          ) : undefined
        }
      />
      <FormTextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        isFocused={isFocused}
        hasError={value.length > MAX_LOCATION_LENGTH}
        placeholder="e.g. North Hall 276"
        maxLength={MAX_LOCATION_LENGTH}
        variant="small"
        style={style}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
