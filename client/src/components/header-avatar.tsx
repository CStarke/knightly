import { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useTheme } from '@/hooks/use-theme';
import { student } from '@/data/student';

export function HeaderAvatar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { openClaimModal } = useClubLeadership();
  const [sheetVisible, setSheetVisible] = useState(false);

  const firstName = user?.firstName ?? student.firstName;
  const lastName = user?.lastName ?? student.lastName;
  const profile = {
    fullName: user?.fullName ?? `${firstName} ${lastName}`,
    email: user?.email ?? student.email,
    standing: user?.standing ?? student.standing,
    major: user?.major ?? student.major,
    studentId: user?.id ?? student.id,
    initials: `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'JD',
  };

  return (
    <>
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setSheetVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`View profile and account for ${profile.fullName}`}
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}>
        <ThemedText type="smallBold" style={styles.avatarText}>
          {profile.initials}
        </ThemedText>
      </Pressable>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSheetVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSheetVisible(false)}>
          <View
            style={[
              styles.overlay,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.three),
              },
            ]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheet}>
                {/* Close X Button */}
                <Pressable
                  onPress={() => setSheetVisible(false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={styles.closeButton}
                >
                  <Icon sf="xmark" md="close" size={18} color={theme.textMuted} />
                </Pressable>

                {/* Drag Handle Indicator */}
                <View style={styles.handle} />

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.largeAvatar}>
                    <ThemedText type="title" style={styles.largeAvatarText}>
                      {profile.initials}
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={styles.nameText}>
                    {profile.fullName}
                  </ThemedText>
                  <ThemedText type="small" style={styles.emailText}>
                    {profile.email}
                  </ThemedText>
                </View>

                {/* Profile Details */}
                <View style={styles.infoCard}>
                  {[
                    { label: 'Status', value: `${profile.standing} · ${profile.major}` },
                    { label: 'Student ID', value: String(profile.studentId) },
                    { label: 'Campus', value: 'Calvin University' },
                  ].map((field, idx) => (
                    <View key={field.label}>
                      {idx > 0 && <View style={styles.divider} />}
                      <View style={styles.infoRow}>
                        <ThemedText type="caption" style={styles.infoLabel}>
                          {field.label}
                        </ThemedText>
                        <ThemedText type="smallBold" style={styles.infoValue}>
                          {field.value}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Actions: Claim Club, Sign Out & Close */}
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => { setSheetVisible(false); openClaimModal('profile'); }}
                    accessibilityRole="button"
                    accessibilityLabel="Claim Club Leadership"
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.claimClubButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Icon sf="key.fill" md="vpn_key" size={16} color={Brand.gold} />
                    <ThemedText style={styles.claimClubButtonText}>
                      Claim Club Leadership
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSheetVisible(false); signOut(); }}
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
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1C1D21',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three + 4,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.two + 4,
    right: Spacing.three + 4,
    zIndex: 10,
    padding: 4,
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
  claimClubButton: {
    backgroundColor: 'rgba(243, 195, 0, 0.12)',
    borderWidth: 1,
    borderColor: Brand.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  claimClubButtonText: {
    color: Brand.gold,
    fontWeight: '700',
    fontSize: 15,
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
