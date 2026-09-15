import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { student } from '@/data/student';

export function HeaderAvatar() {
  return (
    <View style={styles.avatar}>
      <ThemedText type="smallBold" style={styles.avatarText}>
        {student.firstName[0]}
        {student.lastName[0]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  avatarText: {
    color: '#FFFFFF',
  },
});
