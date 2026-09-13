import { StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchField({ value, onChangeText, placeholder = 'Search' }: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.field,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Icon sf="magnifyingglass" md="search" size={16} color={theme.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
});
