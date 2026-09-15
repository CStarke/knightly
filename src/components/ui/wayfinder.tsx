import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const WAYFINDER_ASPECT_RATIO = 264.7 / 350.62; // ~0.755 (width / height)

const SOURCES = {
  full: require('@/../assets/images/wayfinder.svg'),
  inverse: require('@/../assets/images/wayfinder-inverse.svg'),
  gold: require('@/../assets/images/wayfinder-gold.svg'),
  white: require('@/../assets/images/wayfinder-white.svg'),
};

export type WayfinderProps = {
  /** Height in pixels of the emblem. Default is 28. */
  size?: number;
  /**
   * Official brand variants:
   * - 'full': Official 4-color Wayfinder (Maroon, Red, Gold, White) for light/white backgrounds.
   * - 'inverse': Official inverse (White chevron, Gold & White loop) for Maroon/dark backgrounds.
   * - 'gold': Single-color Classic Gold (#F3CD00).
   * - 'white': Single-color White (#FFFFFF).
   */
  variant?: 'full' | 'inverse' | 'gold' | 'white';
  /** Optional monochrome tint color */
  tintColor?: string;
  /** Legacy props for backward compatibility */
  primaryColor?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Official Calvin University "Wayfinder" brand emblem.
 * Uses the official SVG asset suite from Calvin University's brand identity standards.
 */
export function Wayfinder({
  size = 28,
  variant,
  tintColor,
  primaryColor,
  accentColor,
  style,
}: WayfinderProps) {
  let resolvedVariant = variant ?? 'full';
  if (!variant && (primaryColor === '#F3CD00' || accentColor === '#FFFFFF')) {
    resolvedVariant = 'inverse';
  }

  const height = size;
  const width = Math.round(size * WAYFINDER_ASPECT_RATIO);

  return (
    <View
      style={[styles.container, { width, height }, style]}
      accessibilityRole="image"
      accessibilityLabel="Calvin University Wayfinder">
      <Image
        source={SOURCES[resolvedVariant]}
        style={{ width, height }}
        tintColor={tintColor}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
