import { useEffect, useRef } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';

export type FollowButtonProps = {
  /** Whether the student currently follows this club */
  following: boolean;
  /** Invoked when toggle button is pressed */
  onPress: (e?: GestureResponderEvent) => void;
  /** Name of the organization for screen reader accessibility labels */
  clubName: string;
  /** Display variant: 'compact' for directory cards, 'prominent' for hero banner */
  variant?: 'compact' | 'prominent';
  /** Optional custom container style override */
  style?: StyleProp<ViewStyle>;
};

/**
 * Standardized Club Follow Button with 3D Wheel Text & Morphing Icon Animation
 *
 * Encapsulates the visual state, icon morphing, 3D cylindrical tumbler wheel text roll,
 * and accessible micro-interaction for following/unfollowing student organizations.
 *
 * ANIMATION CHOREOGRAPHY:
 * 1. 3D Cylindrical Wheel Roll: Text tumbles on the horizontal X axis with realistic perspective
 *    (e.g. "Follow this club" rolls upward into the distance as "Following this club" rolls in from below).
 * 2. Icon Cross-Morph: The plus icon spins -90° and shrinks away while the checkmark icon spins in from +90°
 *    and scales up to 1.0.
 * 3. Color Shift: Button background and border interpolate smoothly between collegiate gold and translucent dark badge.
 */
export function FollowButton({
  following,
  onPress,
  clubName,
  variant = 'compact',
  style,
}: FollowButtonProps) {
  const isCompact = variant === 'compact';
  const followProgress = useSharedValue(following ? 1 : 0);
  const isInitialMount = useRef(true);

  // Animate progress on user follow/unfollow toggle
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      followProgress.value = following ? 1 : 0;
      return;
    }
    followProgress.value = withTiming(following ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [following, followProgress]);

  // Step 1: Animated Container Style (Background & Border Color Shift)
  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      followProgress.value,
      [0, 1],
      [Brand.gold, 'rgba(217, 155, 38, 0.15)']
    );
    const borderColor = interpolateColor(
      followProgress.value,
      [0, 1],
      ['rgba(217, 155, 38, 0)', 'rgba(217, 155, 38, 0.45)']
    );
    return {
      backgroundColor,
      borderColor,
    };
  });

  // Step 2: Animated Plus Icon (Scales down and rotates out when transitioning to followed)
  const animatedPlusIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(followProgress.value, [0, 1], [1, 0.3]);
    const rotate = `${interpolate(followProgress.value, [0, 1], [0, -90])}deg`;
    const opacity = interpolate(followProgress.value, [0, 0.45], [1, 0]);
    return {
      opacity,
      transform: [{ scale }, { rotate }],
    };
  });

  // Step 3: Animated Checkmark Icon (Rotates from +90deg and scales up to 1.0 when entering)
  const animatedCheckIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(followProgress.value, [0, 1], [0.3, 1]);
    const rotate = `${interpolate(followProgress.value, [0, 1], [90, 0])}deg`;
    const opacity = interpolate(followProgress.value, [0.55, 1], [0, 1]);
    return {
      opacity,
      transform: [{ scale }, { rotate }],
    };
  });

  // Step 4: 3D Cylindrical Tumbler Wheel Text — Unfollowed Label ("Follow" / "Follow this club")
  // Rotates vertically up and backward along the X axis perpendicular to the view:
  const animatedUnfollowedTextStyle = useAnimatedStyle(() => {
    const translateY = interpolate(followProgress.value, [0, 1], [0, isCompact ? -18 : -22]);
    const rotateX = `${interpolate(followProgress.value, [0, 1], [0, -60])}deg`;
    const opacity = interpolate(followProgress.value, [0, 0.55], [1, 0]);
    return {
      opacity,
      transform: [{ perspective: 250 }, { translateY }, { rotateX }],
    };
  });

  // Step 5: 3D Cylindrical Tumbler Wheel Text — Following Label ("Following" / "Following this club")
  // Rotates vertically up and forward into view from below along the X axis:
  const animatedFollowingTextStyle = useAnimatedStyle(() => {
    const translateY = interpolate(followProgress.value, [0, 1], [isCompact ? 18 : 22, 0]);
    const rotateX = `${interpolate(followProgress.value, [0, 1], [60, 0])}deg`;
    const opacity = interpolate(followProgress.value, [0.45, 1], [0, 1]);
    return {
      opacity,
      transform: [{ perspective: 250 }, { translateY }, { rotateX }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={following ? `Unfollow ${clubName}` : `Follow ${clubName}`}
      style={({ pressed }) => [
        pressed && styles.pressed,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.base,
          isCompact ? styles.compact : styles.prominent,
          animatedContainerStyle,
        ]}
      >
        {/* Morphing & Sliding Icon Container */}
        <View style={isCompact ? styles.iconSlotCompact : styles.iconSlotProminent}>
          {/* Plus icon (Unfollowed state) */}
          <Animated.View style={[styles.iconAbsolute, animatedPlusIconStyle]}>
            <Icon
              sf={isCompact ? 'plus' : 'plus.circle.fill'}
              md={isCompact ? 'add' : 'add_circle'}
              size={isCompact ? 13 : 18}
              color="#0B0C0E"
            />
          </Animated.View>

          {/* Checkmark icon (Followed state) */}
          <Animated.View style={[styles.iconAbsolute, animatedCheckIconStyle]}>
            <Icon
              sf={isCompact ? 'checkmark' : 'checkmark.circle.fill'}
              md={isCompact ? 'check' : 'check_circle'}
              size={isCompact ? 13 : 18}
              color={Brand.gold}
            />
          </Animated.View>
        </View>

        {/* 3D Cylindrical Tumbler Wheel Text Track */}
        <View style={[styles.wheelTrack, isCompact ? styles.wheelTrackCompact : styles.wheelTrackProminent]}>
          {/* Unfollowed text label */}
          <Animated.View style={[styles.wheelLabelSlot, animatedUnfollowedTextStyle]}>
            <ThemedText
              type={isCompact ? 'caption' : 'smallBold'}
              style={[
                styles.text,
                isCompact ? styles.compactText : styles.prominentText,
                styles.unfollowedText,
              ]}
              numberOfLines={1}
            >
              {isCompact ? 'Follow' : 'Follow this club'}
            </ThemedText>
          </Animated.View>

          {/* Following text label */}
          <Animated.View style={[styles.wheelLabelSlot, styles.wheelLabelAbsolute, animatedFollowingTextStyle]}>
            <ThemedText
              type={isCompact ? 'caption' : 'smallBold'}
              style={[
                styles.text,
                isCompact ? styles.compactText : styles.prominentText,
                styles.followingText,
              ]}
              numberOfLines={1}
            >
              {isCompact ? 'Following' : 'Following this club'}
            </ThemedText>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  compact: {
    height: 30,
    minHeight: 30,
    gap: 5,
    paddingHorizontal: 12,
  },
  prominent: {
    height: 42,
    minHeight: 42,
    gap: 8,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.75,
  },
  iconSlotCompact: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconSlotProminent: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelTrack: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wheelTrackCompact: {
    height: 16,
    minWidth: 56,
  },
  wheelTrackProminent: {
    height: 20,
    minWidth: 124,
  },
  wheelLabelSlot: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelLabelAbsolute: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  compactText: {
    fontSize: 12,
    lineHeight: 16,
  },
  prominentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  unfollowedText: {
    color: '#0B0C0E',
  },
  followingText: {
    color: Brand.gold,
  },
});
