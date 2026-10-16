import React, { forwardRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FormTextInputVariant = 'standard' | 'headline' | 'small' | 'multiline';

export type FormTextInputProps = TextInputProps & {
  /** Optional external override for focus state. If omitted, tracks focus internally. */
  isFocused?: boolean;
  /** When true, highlights border in Calvin Bright Red to indicate a validation error. */
  hasError?: boolean;
  /** Visual density and typography variant. Defaults to 'standard'. */
  variant?: FormTextInputVariant;
};

/**
 * Standardized template-level text input primitive for Knightly forms.
 *
 * Implements cross-cutting form invariants:
 * - Dynamic Calvin Gold border highlighting when focused.
 * - Calvin Bright Red border highlighting on validation error.
 * - Web focus ring suppression via `outlineStyle: 'none'`.
 * - Cross-platform Calvin Gold caret via `cursorColor` (native) and `caretColor` (web).
 * - Full theme token conformance (background, text, placeholder, border, radius).
 */
export const FormTextInput = forwardRef<TextInput, FormTextInputProps>(
  (
    {
      style,
      isFocused: externalFocused,
      hasError = false,
      variant = 'standard',
      onFocus,
      onBlur,
      placeholderTextColor,
      ...rest
    },
    ref
  ) => {
    const theme = useTheme();
    const [internalFocused, setInternalFocused] = useState(false);

    // Step 1: Resolve active focus state (external prop takes precedence if provided)
    const activeFocused = externalFocused !== undefined ? externalFocused : internalFocused;

    // Step 2: Handle focus and blur events while notifying callers
    const handleFocus: TextInputProps['onFocus'] = (e) => {
      setInternalFocused(true);
      onFocus?.(e);
    };

    const handleBlur: TextInputProps['onBlur'] = (e) => {
      setInternalFocused(false);
      onBlur?.(e);
    };

    // Step 3: Compute border color based on validation error and active focus state
    const borderColor = hasError
      ? Brand.brightRed
      : activeFocused
      ? Brand.gold
      : theme.border;

    // Step 4: Resolve variant-specific baseline styles
    const variantStyle =
      variant === 'headline'
        ? styles.headlineInput
        : variant === 'small'
        ? styles.smallInput
        : variant === 'multiline'
        ? styles.multilineInput
        : styles.standardInput;

    return (
      <TextInput
        ref={ref}
        onFocus={handleFocus}
        onBlur={handleBlur}
        cursorColor={Brand.gold}
        selectionColor={Brand.gold}
        placeholderTextColor={placeholderTextColor ?? theme.textMuted}
        style={[
          styles.baseInput,
          variantStyle,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor,
          },
          style,
        ]}
        {...rest}
      />
    );
  }
);

FormTextInput.displayName = 'FormTextInput';

const styles = StyleSheet.create({
  baseInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    outlineWidth: 0,
    outlineColor: 'transparent',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      caretColor: Brand.gold,
    }),
  },
  standardInput: {
    minHeight: 44,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
    fontSize: 15,
    lineHeight: 22,
  },
  headlineInput: {
    minHeight: 48,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  smallInput: {
    height: 42,
    minHeight: 42,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 4,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 90,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
});
