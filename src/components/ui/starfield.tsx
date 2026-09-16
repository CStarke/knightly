import { memo, useMemo } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { Brand } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import {
  BASE_CANVAS_AREA,
  BASE_FOREGROUND_COUNT,
  calculateStarCounts,
  generateStars,
  PIXEL_9A_HEIGHT,
  PIXEL_9A_WIDTH,
  type Star,
} from "@/constants/starfield";

export {
  BASE_CANVAS_AREA,
  BASE_FOREGROUND_COUNT,
  calculateStarCounts,
  generateStars,
  PIXEL_9A_HEIGHT,
  PIXEL_9A_WIDTH,
  type Star,
};

export type ParallaxStarfieldProps = {
  translateX: SharedValue<number>;
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

export const ParallaxStarfield = memo(function ParallaxStarfield({
  translateX,
  scrollY,
  style,
}: ParallaxStarfieldProps) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Wide virtual canvas spanning across all 4 swipeable tab screens and vertical scroll depth
  const canvasWidth = width * 2.2;
  const canvasHeight = height + 900;

  // Responsive star counts strictly maintaining 5:3:1 ratio (distant : midground : foreground)
  const { distant: distantCount, midground: midgroundCount, foreground: foregroundCount } =
    useMemo(() => calculateStarCounts(canvasWidth, canvasHeight), [canvasWidth, canvasHeight]);

  const darkColors = useMemo(
    () => ["#FFFFFF", "#FFFFFF", "#FFFFFF", Brand.gold, "#E0F2FE", "#FFFBEA"],
    [],
  );

  const lightColors = useMemo(
    () => ["#8C2131", "#C9A900", "#545F68", Brand.gold, "#8A6FC4"],
    [],
  );

  const activeColors = isDark ? darkColors : lightColors;

  // Layer 1: Distant deep field (tiny, subtle stars, slow drift) - 5x ratio
  const layer1Stars = useMemo(
    () =>
      generateStars(
        distantCount,
        canvasWidth,
        canvasHeight,
        1337,
        [1.3, 2.0],
        isDark ? [0.35, 0.58] : [0.2, 0.4],
        activeColors,
      ),
    [distantCount, canvasWidth, canvasHeight, isDark, activeColors],
  );

  // Layer 2: Midground field (medium stars, balanced drift) - 3x ratio
  const layer2Stars = useMemo(
    () =>
      generateStars(
        midgroundCount,
        canvasWidth,
        canvasHeight,
        4242,
        [2.2, 3.2],
        isDark ? [0.55, 0.85] : [0.32, 0.58],
        activeColors,
      ),
    [midgroundCount, canvasWidth, canvasHeight, isDark, activeColors],
  );

  // Layer 3: Foreground field (bright stars with Calvin Gold accents, faster drift for 3D depth) - 1x ratio
  const layer3Stars = useMemo(
    () =>
      generateStars(
        foregroundCount,
        canvasWidth,
        canvasHeight,
        9999,
        [3.2, 4.6],
        isDark ? [0.85, 1.0] : [0.48, 0.78],
        activeColors,
      ),
    [foregroundCount, canvasWidth, canvasHeight, isDark, activeColors],
  );

  // Parallax transforms: Layer 1 (slowest) -> Layer 2 (medium) -> Layer 3 (fastest)
  const layer1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value * 0.05 },
      { translateY: -scrollY.value * 0.04 },
    ],
  }));

  const layer2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value * 0.12 },
      { translateY: -scrollY.value * 0.1 },
    ],
  }));

  const layer3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value * 0.24 },
      { translateY: -scrollY.value * 0.2 },
    ],
  }));

  const baseBg = isDark ? "#07080A" : theme.background;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: baseBg },
        style,
      ]}
    >
      {/* Deep distant star layer (5x ratio) */}
      <Animated.View
        style={[
          styles.canvas,
          { width: canvasWidth, height: canvasHeight },
          layer1Style,
        ]}
      >
        {layer1Stars.map((star) => (
          <View
            key={`l1-${star.id}`}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: star.color,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Midground star layer (3x ratio) */}
      <Animated.View
        style={[
          styles.canvas,
          { width: canvasWidth, height: canvasHeight },
          layer2Style,
        ]}
      >
        {layer2Stars.map((star) => (
          <View
            key={`l2-${star.id}`}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: star.color,
                opacity: star.opacity,
                shadowColor: star.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDark ? 0.5 : 0.2,
                shadowRadius: star.size * 0.8,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Foreground bright star layer (1x ratio) */}
      <Animated.View
        style={[
          styles.canvas,
          { width: canvasWidth, height: canvasHeight },
          layer3Style,
        ]}
      >
        {layer3Stars.map((star) => (
          <View
            key={`l3-${star.id}`}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: star.color,
                opacity: star.opacity,
                shadowColor: star.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDark ? 0.95 : 0.45,
                shadowRadius: star.size * 1.3,
              },
            ]}
          >
            {star.isSparkle ? (
              <View
                style={[
                  styles.sparkleCross,
                  {
                    width: star.size * 1.8,
                    height: star.size * 1.8,
                    borderColor: star.color,
                    opacity: 0.8,
                  },
                ]}
              />
            ) : null}
          </View>
        ))}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    zIndex: 0,
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  star: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleCross: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: "45deg" }],
  },
});
