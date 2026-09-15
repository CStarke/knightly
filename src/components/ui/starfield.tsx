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

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  isSparkle?: boolean;
};

type ParallaxStarfieldProps = {
  translateX: SharedValue<number>;
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

function generateStars(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  seed: number,
  sizeRange: [number, number],
  opacityRange: [number, number],
  colors: string[],
): Star[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * canvasWidth;
    const y = rand() * canvasHeight;
    const size =
      Math.round((sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0])) * 10) /
      10;
    const opacity =
      Math.round(
        (opacityRange[0] + rand() * (opacityRange[1] - opacityRange[0])) * 100,
      ) / 100;
    const color = colors[Math.floor(rand() * colors.length)];
    const isSparkle = size >= 2.8 && rand() > 0.45;
    stars.push({ id: i, x, y, size, opacity, color, isSparkle });
  }
  return stars;
}

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

  const darkColors = useMemo(
    () => ["#FFFFFF", "#FFFFFF", "#FFFFFF", Brand.gold, "#E0F2FE", "#FFFBEA"],
    [],
  );

  const lightColors = useMemo(
    () => ["#8C2131", "#C9A900", "#545F68", Brand.gold, "#8A6FC4"],
    [],
  );

  const activeColors = isDark ? darkColors : lightColors;

  // Layer 1: Distant deep field (tiny, subtle stars, slow drift)
  const layer1Stars = useMemo(
    () =>
      generateStars(
        120,
        canvasWidth,
        canvasHeight,
        1337,
        [1.3, 2.0],
        isDark ? [0.35, 0.58] : [0.2, 0.4],
        activeColors,
      ),
    [canvasWidth, canvasHeight, isDark, activeColors],
  );

  // Layer 2: Midground field (medium stars, balanced drift)
  const layer2Stars = useMemo(
    () =>
      generateStars(
        80,
        canvasWidth,
        canvasHeight,
        4242,
        [2.2, 3.2],
        isDark ? [0.55, 0.85] : [0.32, 0.58],
        activeColors,
      ),
    [canvasWidth, canvasHeight, isDark, activeColors],
  );

  // Layer 3: Foreground field (bright stars with Calvin Gold accents, faster drift for 3D depth)
  const layer3Stars = useMemo(
    () =>
      generateStars(
        30,
        canvasWidth,
        canvasHeight,
        9999,
        [3.2, 4.6],
        isDark ? [0.85, 1.0] : [0.48, 0.78],
        activeColors,
      ),
    [canvasWidth, canvasHeight, isDark, activeColors],
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
      {/* Deep distant star layer */}
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

      {/* Midground star layer */}
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

      {/* Foreground bright star layer */}
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
