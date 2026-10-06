import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/**
 * Clean search input field with Calvin Gold focus ring and icon.
 * Tapping anywhere in the container focuses the native TextInput to bring up the soft keyboard.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  autoFocus = false,
}: SearchFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="search"
      style={[
        styles.field,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: isFocused ? Brand.gold : theme.border,
        },
      ]}>
      <Icon
        sf="magnifyingglass"
        md="search"
        size={16}
        color={isFocused ? Brand.gold : theme.textMuted}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        cursorColor={Brand.gold}
        selectionColor={Brand.gold}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        keyboardType="default"
        style={[styles.input, { color: theme.text }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
});
