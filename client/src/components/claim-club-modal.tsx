/**
 * Claim Club Leadership Modal Dialog
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * This modal provides the initial entry point for student officers claiming their organization.
 * It is invoked from two entry surfaces:
 * 1. The Campus Clubs discovery banner chip ("Are you a club leader? Claim your club").
 * 2. The User Profile menu (accessible via the top header avatar).
 *
 * MASKED INPUT ARCHITECTURE (WHY INVISIBLE TEXTINPUT + DISPLAY LAYER):
 * Displaying formatted codes (`XXXX-XXXX-XX`) inside a standard controlled `<TextInput>`
 * causes severe cursor jumping bugs on mobile platforms:
 * - As the user types the 5th character, inserting a hyphen shifts string length, causing iOS/Android
 *   to jump the selection cursor to the end or beginning of the line.
 * - Deleting across a hyphen often requires multiple backspaces or causes deletion deadlocks.
 *
 * SOLUTION:
 * We decouple raw input from visual rendering:
 * 1. An invisible, caret-hidden `TextInput` captures raw unformatted keystrokes (0-9, A-Z only).
 * 2. A pointerEvents="none" presentation layer displays the characters divided into discrete
 *    chunks (`part1`, `part2`, `part3`) with non-interactive separator hyphens.
 * 3. A custom `BlinkingCursor` simulates a high-fidelity native cursor at the active insertion point.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import {
  DEMO_CLAIM_CODE_ABSTRACTION,
  checkClubCode,
  isValidClubCode,
} from '@/data/club-codes';
import { formatRawCodeSegments } from '@/utils/date-format';
import { useTheme } from '@/hooks/use-theme';

/**
 * Smooth blinking gold cursor for masked text fields.
 *
 * WHY CUSTOM BLINKING CURSOR:
 * Because the underlying `TextInput` has `caretHidden={true}` to prevent native cursor
 * conflicts with our custom segmented layout, we render a faux cursor that blinks at standard
 * 530ms intervals (matching standard iOS/Android text cursor cadence).
 */
function BlinkingCursor({
  color = Brand.gold,
  height = 20,
  style,
}: {
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={[
        {
          width: 1.5,
          height,
          backgroundColor: color,
          borderRadius: 0,
          opacity: visible ? 1 : 0,
        },
        style,
      ]}
    />
  );
}

export function ClaimClubModal() {
  const theme = useTheme();
  const {
    isClaimModalOpen,
    claimModalSource,
    closeClaimModal,
    dismissClaimBanner,
    startClaimSetup,
  } = useClubLeadership();

  const [rawCode, setRawCode] = useState('');
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDismissNotice, setShowDismissNotice] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  // Derived segments for visual non-selectable hyphen masking
  const codeSegments = useMemo(() => formatRawCodeSegments(rawCode), [rawCode]);

  const handleClose = () => {
    setError(null);
    setRawCode('');
    closeClaimModal();
  };

  const handleConfirmDismiss = () => {
    dismissClaimBanner();
    setShowDismissNotice(false);
    handleClose();
  };

  // WHY SANITIZATION ON KEYSTROKE:
  // Strips punctuation, whitespace, and lowercase characters immediately as the student types,
  // preventing illegal characters from ever entering the state buffer.
  const handleRawCodeChange = (text: string) => {
    setError(null);
    const clean = text.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 10);
    setRawCode(clean);
  };

  // WHY DEMO QUICK-FILL:
  // Enables instant one-tap evaluation during testing and presentations without manual typing.
  const handleUseDemoCode = () => {
    setError(null);
    const clean = DEMO_CLAIM_CODE_ABSTRACTION.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    setRawCode(clean);
  };

  // WHY TRANSITION TO IN-PAGER SETUP:
  // Once the code passes verification, we close this modal dialog and trigger `startClaimSetup`.
  // This transitions the UI to the full setup subpage inside the pager, providing ample screen
  // real estate for filling out meeting schedules, locations, and mission statements.
  const handleVerifyCode = () => {
    const result = checkClubCode(rawCode);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    // Code is valid and unused — initiate in-pager setup and close modal
    const source = claimModalSource ?? 'profile';
    handleClose();
    startClaimSetup(rawCode, source);
  };

  return (
    <>
      <Modal
        visible={isClaimModalOpen && !showDismissNotice}
        animationType="fade"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Icon sf="key.fill" md="key" size={20} color={Brand.gold} />
              <ThemedText type="headline" style={styles.headerTitle}>
                Claim Club Leadership
              </ThemedText>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <Icon sf="xmark" md="close" size={18} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Body — code entry only */}
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.stepContainer}>
              <ThemedText type="default" themeColor="textMuted" style={styles.stepSubtitle}>
                Enter the 10-character code issued to your club by Student Life to link your account.
              </ThemedText>

              <View style={styles.inputContainer}>
                <ThemedText type="caption" themeColor="textMuted" style={styles.inputLabel}>
                  LEADER CLAIM CODE (0-9, A-Z)
                </ThemedText>
                <View
                  style={[
                    styles.codeMaskedBox,
                    {
                      borderColor: error
                        ? Brand.brightRed
                        : isCodeFocused
                        ? Brand.gold
                        : theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <TextInput
                    ref={codeInputRef}
                    value={rawCode}
                    onChangeText={handleRawCodeChange}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    caretHidden={true}
                    selectionColor="transparent"
                    onFocus={() => setIsCodeFocused(true)}
                    onBlur={() => setIsCodeFocused(false)}
                    accessibilityLabel="Leader claim code"
                    style={styles.invisibleCodeInput}
                  />
                  <View pointerEvents="none" style={styles.codeDisplayLayer}>
                    {rawCode.length === 0 ? (
                      <View style={styles.codePlaceholderRow}>
                        {isCodeFocused && (
                          <BlinkingCursor
                            color={Brand.gold}
                            height={20}
                            style={styles.codeEmptyAbsoluteCursor}
                          />
                        )}
                        <ThemedText
                          style={[
                            styles.codePlaceholderText,
                            { color: theme.textMuted },
                          ]}
                        >
                          A1B2-C3D4-E5
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={styles.codeDigitsRow}>
                        <ThemedText style={[styles.codeCharText, { color: theme.text }]}>
                          {codeSegments.part1}
                        </ThemedText>
                        {codeSegments.showHyphen1 && (
                          <ThemedText style={[styles.codeSeparatorText, { color: theme.text }]}>
                            -
                          </ThemedText>
                        )}
                        <ThemedText style={[styles.codeCharText, { color: theme.text }]}>
                          {codeSegments.part2}
                        </ThemedText>
                        {codeSegments.showHyphen2 && (
                          <ThemedText style={[styles.codeSeparatorText, { color: theme.text }]}>
                            -
                          </ThemedText>
                        )}
                        <ThemedText style={[styles.codeCharText, { color: theme.text }]}>
                          {codeSegments.part3}
                        </ThemedText>
                        {isCodeFocused && (
                          <BlinkingCursor
                            color={Brand.gold}
                            height={20}
                            style={styles.codeTrailingCursor}
                          />
                        )}
                      </View>
                    )}
                  </View>
                </View>
                {error ? (
                  <ThemedText type="caption" style={styles.errorText}>
                    {error}
                  </ThemedText>
                ) : null}
              </View>

              {/* Demo Helper Pill */}
              <Pressable
                onPress={handleUseDemoCode}
                style={({ pressed }) => [
                  styles.demoPill,
                  { opacity: pressed ? 0.75 : 1, borderColor: Brand.gold },
                ]}
              >
                <Icon sf="sparkles" md="auto_awesome" size={14} color={Brand.gold} />
                <ThemedText type="caption" style={{ color: Brand.gold, fontWeight: '600' }}>
                  Quick Fill Demo Code: {DEMO_CLAIM_CODE_ABSTRACTION}
                </ThemedText>
              </Pressable>

              <View style={styles.actionButtonGroup}>
                <Button
                  label="Verify Code"
                  variant="primary"
                  onPress={handleVerifyCode}
                  disabled={!isValidClubCode(rawCode)}
                  style={styles.actionButton}
                />

                {claimModalSource === 'banner' && (
                  <Pressable
                    onPress={() => setShowDismissNotice(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Stop showing me this"
                    style={({ pressed }) => [
                      styles.stopShowingButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ThemedText style={styles.stopShowingText}>
                      Stop showing me this
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
        </View>
      </Modal>

      <Modal
        visible={showDismissNotice}
        animationType="fade"
        transparent
        onRequestClose={handleConfirmDismiss}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleConfirmDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />
          <View style={[styles.noticeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.noticeIconCircle}>
              <Icon sf="bell.slash.fill" md="notifications_off" size={24} color={Brand.gold} />
            </View>
            <ThemedText type="headline" style={styles.noticeTitle}>
              We'll get rid of that for you!
            </ThemedText>
            <ThemedText type="default" themeColor="textMuted" style={styles.noticeMessage}>
              If you want to claim a club in the future, click on your profile picture in the top right of the Knightly home page.
            </ThemedText>
            <Button
              label="Got it"
              variant="primary"
              onPress={handleConfirmDismiss}
              style={{ width: '100%', marginTop: Spacing.two }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.three + 4,
    paddingBottom: Spacing.three + 4,
  },
  stepContainer: {
    gap: Spacing.three,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    gap: 6,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  codeMaskedBox: {
    height: 52,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  invisibleCodeInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 2,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  codeDisplayLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: Spacing.three,
    right: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 1,
  },
  codePlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  codeEmptyAbsoluteCursor: {
    position: 'absolute',
    left: -4,
  },
  codePlaceholderText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: Fonts.mono,
    letterSpacing: 2,
    textAlign: 'center',
    marginLeft: 4,
  },
  codeDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCharText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: Fonts.mono,
    letterSpacing: 2,
  },
  codeSeparatorText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: Fonts.mono,
    letterSpacing: 2,
  },
  codeTrailingCursor: {
    marginLeft: 4,
  },
  singleInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
    fontSize: 15,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: 'top',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  errorText: {
    color: Brand.brightRed,
    fontSize: 12,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(243, 195, 0, 0.08)',
    alignSelf: 'center',
  },
  clubBanner: {
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  claimedClubName: {
    fontSize: 20,
    fontWeight: '700',
  },
  actionButtonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.one,
  },
  actionButton: {
    width: '100%',
    marginTop: Spacing.one,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    textAlign: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  successHeadline: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 340,
  },
  stopShowingButton: {
    alignSelf: 'center',
    paddingVertical: 1,
    paddingHorizontal: Spacing.two,
    marginTop: 0,
    marginBottom: 0,
  },
  stopShowingText: {
    color: Brand.brightRed,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three + 4,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  noticeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(243, 195, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  noticeMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
});
