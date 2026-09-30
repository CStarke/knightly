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

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BlinkingCursor } from '@/components/ui/blinking-cursor';
import { FieldLabel } from '@/components/ui/field-label';
import { Icon } from '@/components/ui/icon';
import { ModalDialog, ModalHeader } from '@/components/ui/modal-dialog';
import { SuccessModal } from '@/components/ui/success-modal';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import {
  DEMO_CLAIM_CODE_ABSTRACTION,
  checkClubCode,
  isValidClubCode,
} from '@/data/club-codes';
import { formatRawCodeSegments } from '@/utils/date-format';
import { useTheme } from '@/hooks/use-theme';

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDismissNotice, setShowDismissNotice] = useState(false);
  const codeInputRef = useRef<TextInput>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Reanimated shared progress driver for the verification success sequence:
   * 0 -> Idle / Code Entry State
   * 1 -> Success State (Renew Green border, Renew Green button fill, wheel rotated to "Success!")
   */
  const successProgress = useSharedValue(0);

  // Clear any pending navigation or reset timeouts on component unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  // Ensure fresh, pristine state whenever the modal opens
  useEffect(() => {
    if (isClaimModalOpen) {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      setError(null);
      setIsSuccess(false);
      successProgress.value = 0;
      setRawCode('');
    }
  }, [isClaimModalOpen, successProgress]);

  // Derived segments for visual non-selectable hyphen masking
  const codeSegments = useMemo(() => formatRawCodeSegments(rawCode), [rawCode]);

  /**
   * Close the modal and defer resetting state until the fade-out completes.
   *
   * ARCHITECTURAL RATIONALE:
   * When closing the modal, React Native's fade animation takes ~250-300ms.
   * If state is reset synchronously, the button and border snap back to their default
   * colors during the fade-out, breaking visual continuity. Deferring the reset by 400ms
   * ensures the active visual state remains intact until the modal is completely off-screen.
   */
  const handleClose = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    closeClaimModal();

    resetTimerRef.current = setTimeout(() => {
      setError(null);
      setIsSuccess(false);
      successProgress.value = 0;
      setRawCode('');
    }, 400);
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
    if (isSuccess) {
      setIsSuccess(false);
      successProgress.value = 0;
    }
    setError(null);
    const clean = text.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 10);
    setRawCode(clean);
  };

  // WHY DEMO QUICK-FILL:
  // Enables instant one-tap evaluation during testing and presentations without manual typing.
  const handleUseDemoCode = () => {
    if (isSuccess) {
      setIsSuccess(false);
      successProgress.value = 0;
    }
    setError(null);
    const clean = DEMO_CLAIM_CODE_ABSTRACTION.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    setRawCode(clean);
  };

  /**
   * Dynamic Code Box Outline Interpolation:
   * Smoothly morphs from gold (if focused) or standard border to Renew Green (#A2D683)
   * upon successful verification, while immediately turning Bright Red (#C2002F) on error.
   */
  const animatedCodeBoxStyle = useAnimatedStyle(() => {
    if (error) {
      return { borderColor: Brand.brightRed };
    }
    const baseBorder = isCodeFocused ? Brand.gold : theme.border;
    const borderColor = interpolateColor(
      successProgress.value,
      [0, 1],
      [baseBorder, Brand.renewGreen]
    );
    return { borderColor };
  }, [error, isCodeFocused, theme.border]);

  /**
   * Dynamic Verify Button Background Color Interpolation:
   * Smoothly transitions from Calvin Maroon (theme.tint) to Renew Green (Brand.renewGreen).
   */
  const animatedButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      successProgress.value,
      [0, 1],
      [theme.tint, Brand.renewGreen]
    );
    return { backgroundColor };
  }, [theme.tint]);

  /**
   * 3D Cylindrical Tumbler Wheel Animation — "Verify Code" label:
   * Rotates vertically up and backward along the horizontal X axis perpendicular to the screen:
   * translateY moves from 0 to -26px, rotateX tilts from 0 to -60deg, opacity fades from 1 to 0.
   */
  const animatedVerifyTextStyle = useAnimatedStyle(() => {
    const translateY = interpolate(successProgress.value, [0, 1], [0, -26]);
    const rotateX = `${interpolate(successProgress.value, [0, 1], [0, -60])}deg`;
    const opacity = interpolate(successProgress.value, [0, 0.65], [1, 0]);
    return {
      opacity,
      transform: [{ perspective: 300 }, { translateY }, { rotateX }],
    };
  });

  /**
   * 3D Cylindrical Tumbler Wheel Animation — "Success!" label:
   * Rotates vertically up and forward into view from below along the horizontal X axis:
   * translateY moves from +26px to 0, rotateX rotates from +60deg to 0deg, opacity fades from 0 to 1.
   */
  const animatedSuccessTextStyle = useAnimatedStyle(() => {
    const translateY = interpolate(successProgress.value, [0, 1], [26, 0]);
    const rotateX = `${interpolate(successProgress.value, [0, 1], [60, 0])}deg`;
    const opacity = interpolate(successProgress.value, [0.35, 1], [0, 1]);
    return {
      opacity,
      transform: [{ perspective: 300 }, { translateY }, { rotateX }],
    };
  });

  // WHY CHOREOGRAPHED SUCCESS SEQUENCE:
  // Instead of an abrupt screen jump, triggering a 380ms 3D tumbler wheel spin and a brief
  // ~570ms hold gives the student unmistakable, delightful visual feedback that their
  // credential has been verified before smoothly gliding to the profile setup screen.
  const handleVerifyCode = () => {
    if (isSuccess) return;

    const result = checkClubCode(rawCode);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    // Dismiss virtual keyboard so the card layout stays centered and unobstructed
    Keyboard.dismiss();
    setError(null);
    setIsSuccess(true);

    // Run the 380ms wheel rotation and color fade
    successProgress.value = withTiming(1, {
      duration: 380,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });

    // Hold the "Success!" state for ~570ms (total elapsed ~950ms) before transitioning
    transitionTimerRef.current = setTimeout(() => {
      const source = claimModalSource ?? 'profile';
      closeClaimModal();
      startClaimSetup(rawCode, source);

      // Defer state reset by 400ms so the green outline, green button fill,
      // and "Success!" label remain stable and visible throughout the entire fade-out!
      resetTimerRef.current = setTimeout(() => {
        setIsSuccess(false);
        successProgress.value = 0;
        setRawCode('');
        setError(null);
      }, 400);
    }, 950);
  };

  return (
    <>
      <ModalDialog
        visible={isClaimModalOpen && !showDismissNotice}
        onClose={handleClose}
        onRequestClose={isSuccess ? () => {} : handleClose}
        dismissOnBackdropPress={!isSuccess}
      >
        {/* Header */}
        <ModalHeader
          title="Claim Club Leadership"
          icon={{ sf: 'key.fill', md: 'key', color: Brand.gold }}
          onClose={isSuccess ? undefined : handleClose}
        />

        {/* Body — code entry only */}
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.stepContainer}>
              <ThemedText type="default" themeColor="textMuted" style={styles.stepSubtitle}>
                Enter the 10-character code issued to your club by Student Life to link your account.
              </ThemedText>

              <View style={styles.inputContainer}>
                <FieldLabel label="LEADER CLAIM CODE (0-9, A-Z)" />
                <Animated.View
                  style={[
                    styles.codeMaskedBox,
                    {
                      backgroundColor: theme.background,
                    },
                    animatedCodeBoxStyle,
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
                          <ThemedText style={[styles.codeCharText, { color: theme.text }]}>
                            -
                          </ThemedText>
                        )}
                        <ThemedText style={[styles.codeCharText, { color: theme.text }]}>
                          {codeSegments.part2}
                        </ThemedText>
                        {codeSegments.showHyphen2 && (
                          <ThemedText style={[styles.codeCharText, { color: theme.text }]}>
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
                </Animated.View>
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
                {/*
                 * Animated Rotating Wheel Verification Button
                 *
                 * ARCHITECTURAL RATIONALE:
                 * Replacing the static button with a 3D cylindrical tumbling wheel animation
                 * provides instant, tactile confirmation that the entered credentials are valid.
                 * 1. The background color smoothly fades from Calvin Maroon (theme.tint) to
                 *    Renew Green (Brand.renewGreen).
                 * 2. "Verify Code" rotates up-and-out on the X axis while fading out.
                 * 3. "Success!" rotates up-and-in from below on the X axis while fading in,
                 *    styled in high-contrast Dark Forest Slate (Brand.onRenewGreen).
                 * 4. A brief ~570ms pause lets the student visually celebrate before the modal
                 *    glides into the in-pager club profile customization screen.
                 */}
                <Animated.View
                  style={[
                    styles.animatedActionButton,
                    animatedButtonStyle,
                    (!isValidClubCode(rawCode) && !isSuccess) && styles.buttonDisabled,
                  ]}
                >
                  <Pressable
                    onPress={handleVerifyCode}
                    disabled={!isValidClubCode(rawCode) || isSuccess}
                    accessibilityRole="button"
                    accessibilityLabel={isSuccess ? 'Success!' : 'Verify Code'}
                    style={({ pressed }) => [
                      styles.actionButtonPressable,
                      pressed && !isSuccess && { opacity: 0.8 },
                    ]}
                  >
                    <View style={styles.wheelTrack}>
                      {/* "Verify Code" label — tumbling up and out */}
                      <Animated.View style={[styles.wheelLabelSlot, animatedVerifyTextStyle]}>
                        <ThemedText style={[styles.verifyButtonText, { color: theme.onTint }]}>
                          Verify Code
                        </ThemedText>
                      </Animated.View>

                      {/* "Success!" label — tumbling up and in from below */}
                      <Animated.View
                        style={[
                          styles.wheelLabelSlot,
                          styles.wheelLabelAbsolute,
                          animatedSuccessTextStyle,
                        ]}
                      >
                        <ThemedText style={styles.successButtonText}>
                          Success!
                        </ThemedText>
                      </Animated.View>
                    </View>
                  </Pressable>
                </Animated.View>

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
      </ModalDialog>

      <SuccessModal
        visible={showDismissNotice}
        icon={{ sf: 'bell.slash.fill', md: 'notifications_off' }}
        accentColor={Brand.gold}
        title="We'll get rid of that for you!"
        message="If you want to claim a club in the future, click on your profile picture in the top right of the Knightly home page."
        primaryButton={{
          label: 'Got it',
          onPress: handleConfirmDismiss,
        }}
        onClose={handleConfirmDismiss}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  codeTrailingCursor: {
    marginLeft: 4,
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
  actionButtonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.one,
  },
  animatedActionButton: {
    width: '100%',
    borderRadius: Radius.md,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  actionButtonPressable: {
    width: '100%',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  wheelTrack: {
    height: 24,
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelLabelSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelLabelAbsolute: {
    position: 'absolute',
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: Brand.onRenewGreen,
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
});
