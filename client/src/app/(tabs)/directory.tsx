/**
 * Campus People Directory Screen
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * The People Directory allows students to look up contact information for faculty advisors,
 * university staff, department heads, and fellow student peers across Calvin University.
 *
 * DESIGN & ACCESSIBILITY DECISIONS:
 * 1. Role-Based Visual Hierarchy:
 *    - Faculty: Brand tone (Calvin Maroon) reflects academic faculty authority.
 *    - Staff: Info tone (Renew Blue) indicates campus administrative support.
 *    - Student: Gold tone (Calvin Gold) highlights undergraduate peers.
 * 2. Smart Subtitle Formatting (`formatPersonSubtitle`):
 *    Avoids tautological text repetition when a professor's title already contains their department
 *    (e.g. "Professor of Computer Science · Computer Science Department" -> "Professor of Computer Science").
 * 3. Direct Contact Action:
 *    Tapping any person row immediately opens the device mail client via `mailto:${person.email}`.
 */

import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ChipRow } from '@/components/ui/chip';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { initials, people, personName } from '@/data/directory';
import { useTheme } from '@/hooks/use-theme';

const filters = ['Everyone', 'Students', 'Faculty', 'Staff'] as const;
type Filter = (typeof filters)[number];

function roleBadgeTone(role: string): BadgeTone {
  switch (role) {
    case 'Faculty':
      return 'brand';
    case 'Staff':
      return 'info';
    case 'Student':
    default:
      return 'gold';
  }
}

function formatPersonSubtitle(person: (typeof people)[number]): string {
  if (person.role === 'Student') {
    if (person.classYear) {
      return `${person.title} · Class of ${person.classYear}`;
    }
    return person.title;
  }

  // Avoid repeating department if title already includes it (e.g. "Professor of Computer Science")
  if (
    person.department &&
    person.title.toLowerCase().includes(person.department.toLowerCase())
  ) {
    return person.title;
  }

  if (person.department) {
    return `${person.title} · ${person.department}`;
  }

  return person.title;
}

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
    <Screen>
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
            <Avatar name={personName(person)} initials={initials(person)} size={42} />

            <View style={styles.body}>
              <View style={styles.headerRow}>
                <ThemedText
                  style={[styles.personName, { color: theme.text }]}
                  numberOfLines={1}>
                  {personName(person)}
                </ThemedText>
                <Badge
                  label={person.role}
                  tone={roleBadgeTone(person.role)}
                  style={styles.roleBadge}
                />
              </View>

              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {formatPersonSubtitle(person)}
              </ThemedText>

              <View style={styles.contactRow}>
                <Icon sf="envelope.fill" md="mail" size={12} color={theme.textMuted} />
                <ThemedText
                  type="caption"
                  themeColor="textMuted"
                  numberOfLines={1}
                  style={styles.contactText}>
                  {person.email}
                  {person.location ? ` · ${person.location}` : ''}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        ))}

        {results.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="small" themeColor="textSecondary">
              {query ? `No one found matching "${query}".` : 'No people found.'}
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
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  personName: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  roleBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    flex: 1,
    minWidth: 0,
  },
  empty: {
    padding: Spacing.four,
    alignItems: 'center',
  },
});
