/**
 * Login Form Fields & Hero Branding Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Renders the interactive login fields, masked password management,
 * hero sparkles badge, flying wordmark anchor, submit button, and demo fill (AGENTS.md Rule 4.3).
 */

import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewInstance } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';

export type LoginFormFieldsProps = {
  heroWordmarkRef: React.RefObject<ViewInstance | null>;
  measurePositions: () => void;
  flyingWordmarkStyle: any;
  formFadeStyle: any;
  formRaiseStyle: any;
  username: string;
  onChangeUsername: (text: string) => void;
  displayPassword: string;
  showPassword: boolean;
  onChangePassword: (text: string) => void;
  onToggleShowPassword: () => void;
  errorMessage: string;
  canSubmit: boolean;
  isTransitioning: boolean;
  onSubmit: () => void;
  onFillDemo: () => void;
  onRaiseForm: (duration?: number) => void;
  onLowerForm: (duration?: number) => void;
};

export function LoginFormFields({
  heroWordmarkRef,
  measurePositions,
  flyingWordmarkStyle,
  formFadeStyle,
  formRaiseStyle,
  username,
  onChangeUsername,
  displayPassword,
  showPassword,
  onChangePassword,
  onToggleShowPassword,
  errorMessage,
  canSubmit,
  isTransitioning,
  onSubmit,
  onFillDemo,
  onRaiseForm,
  onLowerForm,
}: LoginFormFieldsProps) {
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <Animated.View style={[styles.formMain, formRaiseStyle]}>
      {/* Branding Header */}
      <View style={styles.brandHeader}>
        {/* Shield Icon: Fades out on sign in */}
        <Animated.View style={formFadeStyle}>
          <View style={styles.shieldWrap}>
            <Icon sf="sparkles" md="auto_awesome" size={30} color={Brand.gold} />
          </View>
        </Animated.View>

        {/* Flying Knightly wordmark: Centers in hero, glides to header on submit */}
        <Animated.View
          ref={heroWordmarkRef as any}
          onLayout={measurePositions}
          style={[styles.brandRow, flyingWordmarkStyle]}
        >
          <ThemedText style={styles.brandTitle}>Knightly</ThemedText>
          <View style={styles.brandDot} />
        </Animated.View>

        {/* Calvin University Subtitle & Prompt */}
        <Animated.View style={formFadeStyle}>
          <ThemedText style={styles.brandSubtitle}>CALVIN UNIVERSITY</ThemedText>
          <ThemedText style={styles.signInPrompt}>
            Sign in with your Calvin Account
          </ThemedText>
        </Animated.View>
      </View>

      {/* Form Fields */}
      <Animated.View style={[styles.fields, formFadeStyle]}>
        {/* Username Input */}
        <View style={styles.fieldWrap}>
          <TextInput
            value={username}
            onChangeText={onChangeUsername}
            onFocus={() => {
              setUserFocused(true);
              if (Platform.OS === 'android') onRaiseForm(250);
            }}
            onBlur={() => setUserFocused(false)}
            cursorColor={Brand.gold}
            selectionColor={Brand.gold}
            placeholder="Calvin username or email"
            placeholderTextColor="rgba(255, 255, 255, 0.55)"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={[
              styles.singleLineInput,
              userFocused && styles.singleLineInputFocused,
            ]}
          />
        </View>

        {/* Password Input */}
        <View style={styles.fieldWrap}>
          <View style={styles.passwordRow}>
            <TextInput
              value={displayPassword}
              onChangeText={onChangePassword}
              onFocus={() => {
                setPassFocused(true);
                if (Platform.OS === 'web' || Platform.OS === 'android') {
                  onRaiseForm(250);
                }
              }}
              onBlur={() => {
                setPassFocused(false);
                if (Platform.OS === 'web') onLowerForm(250);
              }}
              cursorColor={Brand.gold}
              selectionColor={Brand.gold}
              placeholder="Password"
              placeholderTextColor="rgba(255, 255, 255, 0.55)"
              secureTextEntry={false}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              style={[
                styles.singleLineInput,
                styles.passwordInput,
                passFocused && styles.singleLineInputFocused,
              ]}
            />
            <Pressable
              onPress={onToggleShowPassword}
              hitSlop={12}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon
                sf={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                md={showPassword ? 'visibility_off' : 'visibility'}
                size={20}
                color="rgba(255, 255, 255, 0.75)"
              />
            </Pressable>
          </View>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          </View>
        ) : null}

        {/* Gold Sign-In Button */}
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit || isTransitioning}
          focusable={false}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
          style={({ pressed }) => [
            styles.goldButton,
            !canSubmit && styles.goldButtonDisabled,
            pressed && canSubmit && styles.goldButtonPressed,
          ]}
        >
          <ThemedText style={styles.goldButtonText}>Sign In</ThemedText>
        </Pressable>

        {/* Demo Account Button */}
        <Pressable
          onPress={onFillDemo}
          focusable={false}
          style={({ pressed }) => [styles.demoButton, pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={styles.demoButtonText}>
            Use John Mark Doe demo account
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  formMain: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  brandHeader: {
    alignItems: 'center',
    gap: 6,
  },
  shieldWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232, 176, 25, 0.15)',
    borderWidth: 1.5,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Brand.gold,
    marginBottom: 6,
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  signInPrompt: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  fields: {
    gap: Spacing.three,
  },
  fieldWrap: {
    gap: 4,
  },
  singleLineInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.three,
    height: 48,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    outlineWidth: 0,
  } as any,
  singleLineInputFocused: {
    borderColor: Brand.gold,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(196, 30, 58, 0.25)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  goldButton: {
    backgroundColor: Brand.gold,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  goldButtonDisabled: {
    backgroundColor: 'rgba(232, 176, 25, 0.35)',
    shadowOpacity: 0,
    elevation: 0,
  },
  goldButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  goldButtonText: {
    color: Brand.maroon,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  demoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  demoButtonText: {
    color: Brand.gold,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
