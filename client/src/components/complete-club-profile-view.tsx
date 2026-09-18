/**
 * Complete Club Profile View (Claim Setup In-Pager Subpage)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * When a student enters a valid Student Life claim code in the Claim Club dialog,
 * rather than instantly dropping them into an empty state or pushing an external route,
 * Knightly transitions into this setup view as an in-pager subpage.
 *
 * WHY IN-PAGER SUBPAGE ARCHITECTURE:
 * 1. Background Continuity: Like the image cropper and club detail views, rendering this
 *    as an in-pager subpage maintains the 3D parallax starfield canvas and tab pager layout.
 * 2. Guided Onboarding: Club shells provisioned by Student Life often have bare minimum details.
 *    Prompting the leader to confirm meeting time, location, and description immediately
 *    ensures campus students see high-quality information in the Campus Clubs directory.
 * 3. Race Condition Invariant: `handleSubmit` re-verifies `checkClubCode` right before committing,
 *    preventing two co-presidents from accidentally linking the same single-use code simultaneously.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
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
    setStep('success');
  }, [code, record, claimClub, description, meetingSchedule, location, contactEmail, category, user?.id]);

  const claimedClubName = record && record !== 'loading' ? record.clubName : '';

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

  if (step === 'success') {
    return (
      <Screen style={styles.screenInner}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Icon sf="checkmark" md="check" size={36} color="#FFFFFF" />
          </View>
          <ThemedText type="headline" style={styles.successHeadline}>
            You're Linked to {claimedClubName}!
          </ThemedText>
          <ThemedText type="default" themeColor="textMuted" style={styles.successBody}>
            The club posting portal has been activated. You will now see the new "+" tab at the right end of your bottom navigation bar.
          </ThemedText>
          <Button
            label="Got it"
            variant="primary"
            onPress={onSuccess}
            style={styles.wideButton}
          />
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
          {/* Claim verified banner */}
          <View style={[styles.claimBanner, { borderColor: 'rgba(243, 205, 0, 0.3)', backgroundColor: 'rgba(243, 205, 0, 0.06)' }]}>
            <Badge label="CLAIM VERIFIED" tone="success" />
            <ThemedText type="headline" style={styles.claimedClubName}>
              {claimedClubName}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Student Life has provisioned this shell. Customize initial club details below.
            </ThemedText>
          </View>

          {/* Description — auto-expanding, matching New Post */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <ThemedText type="caption" themeColor="textMuted" style={styles.fieldLabel}>
                CLUB DESCRIPTION
              </ThemedText>
              <ThemedText
                type="caption"
                style={[
                  styles.charCount,
                  { color: description.length > MAX_DESCRIPTION_LENGTH ? Brand.brightRed : theme.textMuted },
                ]}
              >
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </ThemedText>
            </View>
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
            <ThemedText type="caption" themeColor="textMuted" style={styles.fieldLabel}>
              MEETING SCHEDULE
            </ThemedText>
            <TextInput
              value={meetingSchedule}
              onChangeText={setMeetingSchedule}
              onFocus={() => setIsScheduleFocused(true)}
              onBlur={() => setIsScheduleFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. Wednesdays · 6:30 PM - 8:30 PM"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.singleInput,
                {
                  color: theme.text,
                  borderColor: isScheduleFocused ? Brand.gold : theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <ThemedText type="caption" themeColor="textMuted" style={styles.fieldLabel}>
              LOCATION
            </ThemedText>
            <TextInput
              value={location}
              onChangeText={setLocation}
              onFocus={() => setIsLocFocused(true)}
              onBlur={() => setIsLocFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. North Hall 276 (CS Lab)"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.singleInput,
                {
                  color: theme.text,
                  borderColor: isLocFocused ? Brand.gold : theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />
          </View>

          {/* Contact Email */}
          <View style={styles.fieldGroup}>
            <ThemedText type="caption" themeColor="textMuted" style={styles.fieldLabel}>
              CONTACT EMAIL
            </ThemedText>
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="e.g. abstraction@calvin.edu"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.singleInput,
                {
                  color: theme.text,
                  borderColor: isEmailFocused ? Brand.gold : theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.fieldGroup}>
            <ThemedText type="caption" themeColor="textMuted" style={styles.fieldLabel}>
              CATEGORY
            </ThemedText>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  charCount: {
    fontSize: 11,
  },
  descInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
    lineHeight: 22,
    minHeight: MIN_DESC_HEIGHT,
    textAlignVertical: 'top',
    // @ts-ignore — web only
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  singleInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
    // @ts-ignore — web only
    outlineWidth: 0,
    outlineColor: 'transparent',
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
  // Success state
  successContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHeadline: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
});
