/**
 * Complete Club Profile View (Claim Setup In-Pager Subpage)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * When a student enters a valid Student Life claim code in the Claim Club dialog,
 * rather than instantly dropping them into an empty state or pushing an external route,
 * Knightly transitions into this setup view as an in-pager subpage.
 *
 * WHY IN-PAGER SUBPAGE ARCHITECTURE:
 * 1. Background Continuity: Like the club detail views, rendering this
 *    as an in-pager subpage maintains the 3D parallax starfield canvas and tab pager layout.
 * 2. Guided Onboarding: Club shells provisioned by Student Life often have bare minimum details.
 *    Prompting the leader to confirm meeting time, location, and description immediately
 *    ensures campus students see high-quality information in the Campus Clubs directory.
 * 3. Race Condition Invariant: `handleSubmit` re-verifies `checkClubCode` right before committing,
 *    preventing two co-presidents from accidentally linking the same single-use code simultaneously.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SuccessModal } from '@/components/ui/success-modal';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import {
  checkClubCode,
  markClubCodeUsed,
  type ClubClaimRecord,
} from '@/data/club-codes';
import { feedCategories, type FeedCategory } from '@/data/feed';
import { distributeIntoRows } from '@/utils/chip-layout';
import { handleSmoothInputFocus } from '@/utils/smooth-input-focus';
import { useTheme } from '@/hooks/use-theme';

const MIN_DESC_HEIGHT = 90;
const MAX_DESCRIPTION_LENGTH = 280;

type Step = 'form' | 'success';

export type CompleteClubProfileViewProps = {
  code: string;
  onBack: () => void;
  onSuccess: () => void;
};

export function CompleteClubProfileView({
  code,
  onBack,
  onSuccess,
}: CompleteClubProfileViewProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { claimClub } = useClubLeadership();

  // Guard state — 'loading' | ClubClaimRecord | null (null = failed guard)
  // WHY MOUNT GUARD:
  // Prevents direct navigation or stale state from exposing the setup form
  // if the code was already consumed or invalid.
  const [record, setRecord] = useState<ClubClaimRecord | null | 'loading'>('loading');
  const [guardError, setGuardError] = useState<string | null>(null);

  // Form fields (pre-filled with smart defaults for frictionless onboarding)
  const [description, setDescription] = useState(
    'A community of student developers building creative software projects, exploring algorithms, and participating in regional hackathons.'
  );
  const [descHeight, setDescHeight] = useState(MIN_DESC_HEIGHT);
  const [isDescFocused, setIsDescFocused] = useState(false);

  const [meetingSchedule, setMeetingSchedule] = useState('Wednesdays · 6:30 PM - 8:30 PM');
  const [isScheduleFocused, setIsScheduleFocused] = useState(false);

  const [location, setLocation] = useState('North Hall 276 (CS Lab)');
  const [isLocFocused, setIsLocFocused] = useState(false);

  const [contactEmail, setContactEmail] = useState('abstraction@calvin.edu');
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const [category, setCategory] = useState<FeedCategory>('Academics');

  // Spreads categories evenly over minimum number of rows with at most 4 chips per row.
  // WHY distributeIntoRows:
  // Mobile screens vary between 360px and 430px. Pre-distributing chips prevents awkward 1-chip
  // overflow rows and maintains symmetrical visual weight.
  const categoryRows = useMemo(() => distributeIntoRows(feedCategories, 4), []);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');

  // Validate the claim code on mount or when code changes
  useEffect(() => {
    if (!code) {
      setGuardError('No claim code provided. Please go back and try again.');
      setRecord(null);
      return;
    }
    const result = checkClubCode(code);
    if (!result.valid) {
      setGuardError(result.error);
      setRecord(null);
    } else {
      setRecord(result.record);
      setGuardError(null);
    }
  }, [code]);

  /**
   * Finalizes profile details and binds the club to the current student leader.
   *
   * WHY DOUBLE-CHECK VERIFICATION:
   * During the time the user spent filling out this form, another officer might have submitted
   * the exact same code on another device. Re-checking `checkClubCode` before writing avoids
   * split-brain claims and ensures atomicity.
   */
  const handleSubmit = useCallback(() => {
    if (!code || !record || record === 'loading') return;

    // Double-check in case the code was used between navigation and submit
    const recheck = checkClubCode(code);
    if (!recheck.valid) {
      setSubmitError(recheck.error);
      return;
    }

    const result = claimClub(code, {
      description: description.trim(),
      meetingSchedule: meetingSchedule.trim(),
      location: location.trim(),
      contactEmail: contactEmail.trim(),
      category,
    });

    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to link club. Please try again.');
      return;
    }

    // Only mark as used after a confirmed successful claim
    markClubCodeUsed(code, user?.id);
    Keyboard.dismiss();
    setStep('success');
  }, [code, record, claimClub, description, meetingSchedule, location, contactEmail, category, user?.id]);

  const claimedClubName = record && record !== 'loading' ? record.clubName : '';

  const getInputStyle = (focused: boolean) => [
    styles.inputBase,
    {
      color: theme.text,
      borderColor: focused ? Brand.gold : theme.border,
      backgroundColor: theme.backgroundElement,
    },
  ];

  const handleDismissSuccess = useCallback(() => {
    setStep('form');
    onSuccess();
  }, [onSuccess]);

  if (guardError) {
    return (
      <Screen style={styles.screenInner}>
        <View style={styles.guardContainer}>
          <View style={[styles.guardCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.guardIconCircle, { backgroundColor: 'rgba(194, 0, 47, 0.12)' }]}>
              <Icon sf="exclamationmark.triangle.fill" md="warning" size={28} color={Brand.brightRed} />
            </View>
            <ThemedText type="headline" style={styles.guardTitle}>
              Code Unavailable
            </ThemedText>
            <ThemedText type="default" themeColor="textMuted" style={styles.guardMessage}>
              {guardError}
            </ThemedText>
            <Button
              label="Go Back"
              variant="primary"
              onPress={onBack}
              style={{ width: '100%', marginTop: Spacing.two }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenInner}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          {/*
           * Provisioned Club Claim Header Banner
           *
           * ARCHITECTURAL RATIONALE:
           * The previous in-card "CLAIM VERIFIED" chip was removed because verification is
           * already celebrated via the micro-interaction on the code entry modal and stated
           * in the top screen header subtitle. Removing the floating chip places immediate
           * visual focus on the claimed organization's name, while splitting the guidance
           * copy onto separate lines provides balanced vertical cadence.
           */}
          <View style={[styles.claimBanner, { borderColor: 'rgba(243, 205, 0, 0.3)', backgroundColor: 'rgba(243, 205, 0, 0.06)' }]}>
            <ThemedText type="headline" style={styles.claimedClubName}>
              {claimedClubName}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Student Life has provisioned this shell.
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Customize initial club details below.
            </ThemedText>
          </View>

          {/* Description — auto-expanding, matching New Post */}
          <View style={styles.fieldGroup}>
            <FieldLabel
              label="CLUB DESCRIPTION"
              currentLength={description.length}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              onContentSizeChange={(e) => {
                setDescHeight(Math.max(MIN_DESC_HEIGHT, e.nativeEvent.contentSize.height));
              }}
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setIsDescFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="What is your club about? Describe your mission, activities..."
              placeholderTextColor={theme.textMuted}
              multiline
              scrollEnabled={false}
              numberOfLines={4}
              maxLength={MAX_DESCRIPTION_LENGTH}
              style={[
                styles.inputBase,
                styles.descInput,
                {
                  height: Math.max(MIN_DESC_HEIGHT, descHeight),
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: description.length > MAX_DESCRIPTION_LENGTH
                    ? Brand.brightRed
                    : isDescFocused
                    ? Brand.gold
                    : theme.border,
                },
              ]}
            />
          </View>

          {/* Meeting Schedule */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="MEETING SCHEDULE" />
            <TextInput
              value={meetingSchedule}
              onChangeText={setMeetingSchedule}
              onFocus={(e) => {
                setIsScheduleFocused(true);
                handleSmoothInputFocus(e);
              }}
              onBlur={() => setIsScheduleFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. Wednesdays · 6:30 PM - 8:30 PM"
              placeholderTextColor={theme.textMuted}
              style={getInputStyle(isScheduleFocused)}
            />
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="LOCATION" />
            <TextInput
              value={location}
              onChangeText={setLocation}
              onFocus={(e) => {
                setIsLocFocused(true);
                handleSmoothInputFocus(e);
              }}
              onBlur={() => setIsLocFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. North Hall 276 (CS Lab)"
              placeholderTextColor={theme.textMuted}
              style={getInputStyle(isLocFocused)}
            />
          </View>

          {/* Contact Email */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="CONTACT EMAIL" />
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              onFocus={(e) => {
                setIsEmailFocused(true);
                handleSmoothInputFocus(e);
              }}
              onBlur={() => setIsEmailFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. abstraction@calvin.edu"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={getInputStyle(isEmailFocused)}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="SELECT CATEGORY" />
            <View style={styles.categoryGrid}>
              {categoryRows.map((row, rowIndex) => (
                <View key={`cat-row-${rowIndex}`} style={styles.categoryRow}>
                  {row.map((cat) => {
                    const selected = cat === category;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={({ pressed }) => [
                          styles.categoryChip,
                          {
                            borderColor: selected ? Brand.gold : theme.border,
                            backgroundColor: selected
                              ? 'rgba(243, 205, 0, 0.12)'
                              : theme.backgroundElement,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={cat}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={[
                            styles.categoryChipText,
                            { color: selected ? Brand.gold : theme.textMuted },
                          ]}
                        >
                          {cat}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Submit error */}
          {submitError ? (
            <ThemedText type="caption" style={styles.errorText}>
              {submitError}
            </ThemedText>
          ) : null}

          {/* Submit Button */}
          <Button
            label="Link Club & Enable Posting"
            variant="primary"
            onPress={handleSubmit}
            style={styles.wideButton}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Standard Success Confirmation Modal Template */}
      <SuccessModal
        visible={step === 'success'}
        title={`You're Linked to ${claimedClubName || 'Your Club'}!`}
        message='The club posting portal has been activated. You will now see the new "+" tab at the right end of your bottom navigation bar.'
        primaryButton={{
          label: 'Got it',
          variant: 'primary',
          onPress: handleDismissSuccess,
        }}
        onClose={handleDismissSuccess}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    paddingBottom: Spacing.six,
  },
  fill: {
    flex: 1,
    width: '100%',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  claimBanner: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.one + 2,
  },
  claimedClubName: {
    fontSize: 22,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 6,
  },
  inputBase: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
    // @ts-ignore — web only
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  descInput: {
    lineHeight: 22,
    minHeight: MIN_DESC_HEIGHT,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'column',
    gap: Spacing.one + 2,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    justifyContent: 'space-between',
  },
  categoryChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: Brand.brightRed,
    fontSize: 13,
  },
  wideButton: {
    width: '100%',
    marginTop: Spacing.one,
  },
  // Guard / error state
  guardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  guardCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  guardIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  guardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  guardMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
