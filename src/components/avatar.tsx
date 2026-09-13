import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** Stable pastel-ish color per person so the directory reads as a set. */
function hueFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

type AvatarProps = {
  name: string;
  initials: string;
  size?: number;
};

export function Avatar({ name, initials, size = 44 }: AvatarProps) {
  const hue = hueFor(name);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsl(${hue}, 42%, 42%)`,
        },
      ]}>
      <ThemedText style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
