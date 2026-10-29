/**
 * FERPA Campus Directory Onboarding Modal
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * In compliance with the Family Educational Rights and Privacy Act (FERPA)
 * and Calvin University student data governance:
 * - Student information is NOT publicly listed by default.
 * - On first sign-in, students are presented this onboarding dialog to explicitly
 *   choose whether they wish to be listed in the campus-wide directory, and if so,
 *   which contact fields (email, phone, residence hall) should be visible.
 *
 * TEMPLATE-LEVEL INHERITANCE INVARIANT:
 * Strictly inherits the centralized `ModalDialog` template from `@/components/ui/modal-dialog`,
 * gaining edge-to-edge translucent backdrop handling, accessibility boundaries, and fluid
 * keyboard avoidance automatically.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ModalDialog, ModalHeader } from '@/components/ui/modal-dialog';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DirectoryVisibleFields = {
  email: boolean;
  phone: boolean;
  residence: boolean;
};

export type DirectoryOnboardingModalProps = {
  /** Whether the modal is currently visible */
  visible: boolean;
  /** Invoked when student saves their privacy preference */
  onComplete: (preferences: {
    directoryOptIn: boolean;
    directoryVisibleFields: DirectoryVisibleFields;
  }) => void;
  /** Optional dismiss / close handler */
  onClose?: () => void;
};

/**
 * FERPA Directory Privacy Consent Dialog
 */
export function DirectoryOnboardingModal({
  visible,
  onComplete,
  onClose,
}: DirectoryOnboardingModalProps) {
  const theme = useTheme();

  // Step 1: State management for opt-in selection and field toggles
  // Default: opt-in is false (private) per FERPA strict compliance
  const [optIn, setOptIn] = useState<boolean>(false);
  const [visibleFields, setVisibleFields] = useState<DirectoryVisibleFields>({
    email: true,
    phone: false,
    residence: false,
  });

  // Step 2: Field toggle helper
  const toggleField = (field: keyof DirectoryVisibleFields) => {
    setVisibleFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Step 3: Handle completion submission
  const handleSave = () => {
    onComplete({
      directoryOptIn: optIn,
      directoryVisibleFields: visibleFields,
    });
  };

  return (
    <ModalDialog
      visible={visible}
      onClose={onClose || (() => {})}
      dismissOnBackdropPress={false}
      cardStyle={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}
    >
      <ModalHeader
        title="Directory Privacy (FERPA)"
        icon={{ sf: 'lock.shield', md: 'security', color: Brand.gold }}
        onClose={onClose}
      />

      <View style={styles.body}>
        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          Calvin University respects student privacy under FERPA. By default, your contact information
          is unlisted. Choose how you would like to appear in the campus directory.
        </ThemedText>

        {/* Option A: Keep Unlisted (Private) */}
        <Pressable
          style={[
            styles.optionCard,
            {
              borderColor: !optIn ? Brand.gold : theme.border,
              backgroundColor: !optIn ? theme.backgroundSelected : 'transparent',
            },
          ]}
          onPress={() => setOptIn(false)}
        >
          <View style={styles.optionHeader}>
            <Icon
              sf={!optIn ? 'checkmark.circle.fill' : 'circle'}
              md={!optIn ? 'check_circle' : 'radio_button_unchecked'}
              size={20}
              color={!optIn ? Brand.gold : theme.textMuted}
            />
            <ThemedText style={[styles.optionTitle, { color: theme.text }]}>
              Keep Unlisted (Private)
            </ThemedText>
          </View>
          <ThemedText style={[styles.optionSubtext, { color: theme.textSecondary }]}>
            Your profile will not be searchable in the public student directory.
          </ThemedText>
        </Pressable>

        {/* Option B: List in Directory */}
        <Pressable
          style={[
            styles.optionCard,
            {
              borderColor: optIn ? Brand.gold : theme.border,
              backgroundColor: optIn ? theme.backgroundSelected : 'transparent',
            },
          ]}
          onPress={() => setOptIn(true)}
        >
          <View style={styles.optionHeader}>
            <Icon
              sf={optIn ? 'checkmark.circle.fill' : 'circle'}
              md={optIn ? 'check_circle' : 'radio_button_unchecked'}
              size={20}
              color={optIn ? Brand.gold : theme.textMuted}
            />
            <ThemedText style={[styles.optionTitle, { color: theme.text }]}>
              List in Campus Directory
            </ThemedText>
          </View>
          <ThemedText style={[styles.optionSubtext, { color: theme.textSecondary }]}>
            Fellow students and faculty can find your profile with the fields you select below.
          </ThemedText>
        </Pressable>

        {/* Granular Field Toggles (Active when Opt-In is true) */}
        {optIn && (
          <View style={[styles.fieldsContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText style={[styles.fieldsHeading, { color: theme.textMuted }]}>
              VISIBLE DIRECTORY FIELDS:
            </ThemedText>

            {/* Email Address Toggle */}
            <Pressable
              style={styles.fieldRow}
              onPress={() => toggleField('email')}
            >
              <ThemedText style={[styles.fieldName, { color: theme.text }]}>
                Calvin Email Address
              </ThemedText>
              <Icon
                sf={visibleFields.email ? 'checkmark.square.fill' : 'square'}
                md={visibleFields.email ? 'check_box' : 'check_box_outline_blank'}
                size={20}
                color={visibleFields.email ? Brand.maroon : theme.textMuted}
              />
            </Pressable>

            {/* Phone Number Toggle */}
            <Pressable
              style={styles.fieldRow}
              onPress={() => toggleField('phone')}
            >
              <ThemedText style={[styles.fieldName, { color: theme.text }]}>
                Phone Number
              </ThemedText>
              <Icon
                sf={visibleFields.phone ? 'checkmark.square.fill' : 'square'}
                md={visibleFields.phone ? 'check_box' : 'check_box_outline_blank'}
                size={20}
                color={visibleFields.phone ? Brand.maroon : theme.textMuted}
              />
            </Pressable>

            {/* Residence Hall Toggle */}
            <Pressable
              style={styles.fieldRow}
              onPress={() => toggleField('residence')}
            >
              <ThemedText style={[styles.fieldName, { color: theme.text }]}>
                Residence Hall & Room
              </ThemedText>
              <Icon
                sf={visibleFields.residence ? 'checkmark.square.fill' : 'square'}
                md={visibleFields.residence ? 'check_box' : 'check_box_outline_blank'}
                size={20}
                color={visibleFields.residence ? Brand.maroon : theme.textMuted}
              />
            </Pressable>
          </View>
        )}

        {/* Footer Note */}
        <ThemedText style={[styles.noteText, { color: theme.textMuted }]}>
          You can change these preferences at any time from your Account Settings.
        </ThemedText>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <Button
            label="Save Preferences"
            variant="gold"
            onPress={handleSave}
            size="large"
          />
        </View>
      </View>
    </ModalDialog>
  );
}

const styles = StyleSheet.create({
  modalCard: {
    maxWidth: 480,
    width: '92%',
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  body: {
    marginTop: Spacing.two,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  optionCard: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.two,
    marginBottom: Spacing.one,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 28,
  },
  fieldsContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    marginTop: Spacing.half,
    marginBottom: Spacing.one,
  },
  fieldsHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  fieldName: {
    fontSize: 14,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    marginVertical: Spacing.one,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: Spacing.one,
  },
});
