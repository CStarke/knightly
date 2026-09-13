import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card';
import { ChipRow } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Spacing } from '@/constants/theme';
import { initials, people, personName } from '@/data/directory';
import { useTheme } from '@/hooks/use-theme';

const filters = ['Everyone', 'Students', 'Faculty', 'Staff'] as const;
type Filter = (typeof filters)[number];

export default function DirectoryScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Everyone');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return people.filter((person) => {
      const matchesFilter =
        filter === 'Everyone' ||
        (filter === 'Students' && person.role === 'Student') ||
        (filter === 'Faculty' && person.role === 'Faculty') ||
        (filter === 'Staff' && person.role === 'Staff');

      const matchesQuery =
        needle.length === 0 ||
        personName(person).toLowerCase().includes(needle) ||
        person.title.toLowerCase().includes(needle) ||
        person.department.toLowerCase().includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  return (
    <Screen header={<AppHeader title="Directory" subtitle="Students, faculty, and staff" />}>
      <View style={styles.filters}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search by name or major" />
        <ChipRow options={filters} value={filter} onChange={setFilter} />
      </View>

      <Card flush>
        {results.map((person, index) => (
          <Pressable
            key={person.id}
            onPress={() => Linking.openURL(`mailto:${person.email}`)}
            style={({ pressed }) => [
              styles.row,
              index < results.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <Avatar name={personName(person)} initials={initials(person)} size={40} />

            <View style={styles.body}>
              <ThemedText type="smallBold">{personName(person)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {person.title}
                {person.role === 'Student' ? ` · ${person.classYear}` : ` · ${person.department}`}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {person.email}
              </ThemedText>
            </View>

            <Icon sf="envelope" md="mail" size={16} color={theme.textMuted} />
          </Pressable>
        ))}

        {results.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="small" themeColor="textSecondary">
              No one by that name.
            </ThemedText>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  empty: {
    padding: Spacing.three,
  },
});
