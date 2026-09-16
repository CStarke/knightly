import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { student } from '@/data/student';

export function HeaderAvatar() {
  const { user, signOut } = useAuth();
  const [sheetVisible, setSheetVisible] = useState(false);

  const firstName = user?.firstName ?? student.firstName;
  const lastName = user?.lastName ?? student.lastName;
  const fullName = user?.fullName ?? `${student.firstName} ${student.lastName}`;
  const email = user?.email ?? student.email;
  const standing = user?.standing ?? student.standing;
  const major = user?.major ?? student.major;
  const studentId = user?.id ?? student.id;

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'JD';

  const handleSignOut = () => {
    setSheetVisible(false);
    signOut();
  };

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`View profile and account for ${fullName}`}
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}>
        <ThemedText type="smallBold" style={styles.avatarText}>
          {initials}
        </ThemedText>
      </Pressable>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSheetVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheet}>
                {/* Drag Handle Indicator */}
                <View style={styles.handle} />

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.largeAvatar}>
                    <ThemedText type="title" style={styles.largeAvatarText}>
                      {initials}
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={styles.nameText}>
                    {fullName}
                  </ThemedText>
                  <ThemedText type="small" style={styles.emailText}>
                    {email}
                  </ThemedText>
                </View>

                {/* Profile Details */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <ThemedText type="caption" style={styles.infoLabel}>
                      Status
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.infoValue}>
                      {standing} · {major}
                    </ThemedText>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <ThemedText type="caption" style={styles.infoLabel}>
                      Student ID
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.infoValue}>
                      {studentId}
                    </ThemedText>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <ThemedText type="caption" style={styles.infoLabel}>
                      Campus
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.infoValue}>
                      Calvin University
                    </ThemedText>
                  </View>
                </View>

                {/* Actions: Sign Out & Close */}
                <View style={styles.actions}>
                  <Pressable
                    onPress={handleSignOut}
                    accessibilityRole="button"
                    accessibilityLabel="Sign Out"
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.signOutButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSheetVisible(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.cancelButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  avatarText: {
    color: '#FFFFFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: Spacing.three,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1C1D21',
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  profileHeader: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  largeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.maroon,
    marginBottom: Spacing.one,
  },
  largeAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  nameText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emailText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#FFFFFF',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  signOutButton: {
    backgroundColor: Brand.brightRed,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
