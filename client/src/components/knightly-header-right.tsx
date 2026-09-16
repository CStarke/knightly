import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderAvatar } from '@/components/header-avatar';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useClubsNavigation } from '@/context/clubs-navigation-context';

export function KnightlyHeaderRight() {
  const { openClubsDirectory } = useClubsNavigation();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={openClubsDirectory}
        accessibilityRole="button"
        accessibilityLabel="Explore and search campus clubs"
        hitSlop={8}
        style={({ pressed }) => [styles.clubsBtn, pressed && styles.pressed]}
      >
        <Icon sf="person.2.badge.gearshape" md="group" size={14} color={Brand.gold} />
        <ThemedText style={styles.clubsText}>Clubs</ThemedText>
      </Pressable>

      <HeaderAvatar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  clubsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(217, 155, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 155, 38, 0.35)',
  },
  clubsText: {
    color: Brand.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.75,
  },
});
