import {
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

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
 * Standardized Club Follow Button
 *
 * Encapsulates the visual state, icon selection, and accessible micro-interaction
 * for following/unfollowing student organizations across list cards and detail headers.
 */
export function FollowButton({
  following,
  onPress,
  clubName,
  variant = 'compact',
  style,
}: FollowButtonProps) {
  const isCompact = variant === 'compact';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={following ? `Unfollow ${clubName}` : `Follow ${clubName}`}
      style={({ pressed }) => [
        styles.base,
        isCompact ? styles.compact : styles.prominent,
        following ? styles.following : styles.unfollowed,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon
        sf={
          isCompact
            ? following ? 'checkmark' : 'plus'
            : following ? 'checkmark.circle.fill' : 'plus.circle.fill'
        }
        md={
          isCompact
            ? following ? 'check' : 'add'
            : following ? 'check_circle' : 'add_circle'
        }
        size={isCompact ? 13 : 18}
        color={following ? Brand.gold : '#0B0C0E'}
      />
      <ThemedText
        style={[
          styles.text,
          isCompact ? styles.compactText : styles.prominentText,
          following ? styles.followingText : styles.unfollowedText,
        ]}
      >
        {isCompact
          ? following ? 'Following' : 'Follow'
          : following ? 'Following this club' : 'Follow this club'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  compact: {
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  prominent: {
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
  },
  unfollowed: {
    backgroundColor: Brand.gold,
  },
  following: {
    backgroundColor: 'rgba(217, 155, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 155, 38, 0.4)',
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    fontWeight: '700',
  },
  compactText: {
    fontSize: 12,
  },
  prominentText: {
    fontSize: 14,
  },
  unfollowedText: {
    color: '#0B0C0E',
  },
  followingText: {
    color: Brand.gold,
  },
});
