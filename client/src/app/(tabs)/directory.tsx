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
 * 3. 1–5 Column Responsive Grid Parity:
 *    Matches Home Feed and Campus Clubs directory scaling via `resolveFeedColumnCount(width, Platform.OS)`:
 *    1 column on handheld phones, 2 columns on tablets, 3 on standard desktop, 4 on wide desktop, and
 *    up to 5 columns on ultrawide/4K monitors. Trailing spacer cells eliminate orphan card stretching.
 * 4. Direct Contact Action:
 *    Tapping any person card or row immediately opens the device mail client via `mailto:${person.email}`.
 */

import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FeedEmptyState } from '@/components/feed-controls';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChipRow } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { initials, people, personName, type Person } from '@/data/directory';
import { resolveFeedColumnCount } from '@/data/feed';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTheme } from '@/hooks/use-theme';

const filters = ['Everyone', 'Faculty', 'Staff'] as const;
type Filter = (typeof filters)[number];

function roleBadgeTone(role: string): BadgeTone {
  switch (role) {
    case 'Faculty':
      return 'brand';
    case 'Staff':
    default:
      return 'info';
  }
}

function formatPersonSubtitle(person: Person): string {
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

/**
 * Elevated Person Contact Card for Tablet and Desktop Web Grids.
 */
function PersonGridCard({ person }: { person: Person }) {
  const theme = useTheme();

  return (
    <Card flush style={styles.gridCard}>
      <Pressable
        onPress={() => Linking.openURL(`mailto:${person.email}`)}
        accessibilityRole="button"
        accessibilityLabel={`Email ${personName(person)}, ${person.title}`}
        style={({ pressed }) => [styles.gridCardPressable, pressed && styles.pressed]}
      >
        <View style={styles.gridTopRow}>
          <Avatar name={personName(person)} initials={initials(person)} size={44} />
          <View style={styles.gridInfo}>
            <ThemedText style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
              {personName(person)}
            </ThemedText>
            <Badge
              label={person.role}
              tone={roleBadgeTone(person.role)}
              style={styles.roleBadge}
            />
          </View>
        </View>

        <ThemedText
          type="caption"
          themeColor="textSecondary"
          numberOfLines={2}
          style={styles.gridSubtitle}
        >
          {formatPersonSubtitle(person)}
        </ThemedText>

        <View style={styles.gridContactRow}>
          <Icon sf="envelope.fill" md="mail" size={13} color={Brand.gold} />
          <ThemedText
            type="caption"
            themeColor="textMuted"
            numberOfLines={1}
            style={styles.contactText}
          >
            {person.email}
          </ThemedText>
        </View>

        {person.location ? (
          <View style={styles.gridContactRow}>
            <Icon sf="mappin.and.ellipse" md="place" size={13} color={Brand.gold} />
            <ThemedText
              type="caption"
              themeColor="textMuted"
              numberOfLines={1}
              style={styles.contactText}
            >
              {person.location}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    </Card>
  );
}

/**
 * Compact Person List Row for Mobile Phone Handheld Displays.
 */
function PersonListRow({
  person,
  isLast,
}: {
  person: Person;
  isLast: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => Linking.openURL(`mailto:${person.email}`)}
      accessibilityRole="button"
      accessibilityLabel={`Email ${personName(person)}, ${person.title}`}
      style={({ pressed }) => [
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Avatar name={personName(person)} initials={initials(person)} size={42} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <ThemedText
            style={[styles.personName, { color: theme.text }]}
            numberOfLines={1}
          >
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
            style={styles.contactText}
          >
            {person.email}
            {person.location ? ` · ${person.location}` : ''}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function DirectoryScreen() {
  const { width } = useResponsiveLayout();
  const numColumns = resolveFeedColumnCount(width, Platform.OS);
  const maxContentWidth = numColumns >= 5 ? 1880 : numColumns >= 4 ? 1520 : 1200;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Everyone');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return people.filter((person) => {
      const matchesFilter =
        filter === 'Everyone' ||
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

  // Step 4: Chunk filtered people into balanced rows of `numColumns` items
  const evenRows = useMemo(() => {
    if (numColumns <= 1) return [];
    const rows: Person[][] = [];
    for (let i = 0; i < results.length; i += numColumns) {
      rows.push(results.slice(i, i + numColumns));
    }
    return rows;
  }, [results, numColumns]);

  const handleClear = () => {
    setQuery('');
    setFilter('Everyone');
  };

  return (
    <Screen style={[styles.screenInner, { maxWidth: maxContentWidth }]}>
      <View style={styles.filters}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, title, or department"
        />
        <ChipRow options={filters} value={filter} onChange={setFilter} />
      </View>

      {numColumns > 1 ? (
        <View style={styles.evenGrid}>
          {evenRows.map((row, rowIdx) => (
            <View key={`grid-row-${rowIdx}`} style={styles.evenGridRow}>
              {row.map((person) => (
                <View key={person.id} style={styles.evenGridCell}>
                  <PersonGridCard person={person} />
                </View>
              ))}
              {row.length < numColumns &&
                Array.from({ length: numColumns - row.length }).map((_, i) => (
                  <View key={`spacer-${rowIdx}-${i}`} style={styles.evenGridCell} />
                ))}
            </View>
          ))}
        </View>
      ) : results.length > 0 ? (
        <Card flush style={styles.listCard}>
          {results.map((person, index) => (
            <PersonListRow
              key={person.id}
              person={person}
              isLast={index === results.length - 1}
            />
          ))}
        </Card>
      ) : null}

      {results.length === 0 ? (
        <FeedEmptyState
          type="no-filter-matches"
          title="No people found"
          subtitle={
            query
              ? `No one found matching "${query}".`
              : `No people found under "${filter}".`
          }
          buttonLabel="Reset search"
          onClearFilters={handleClear}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    gap: Spacing.three,
    width: '100%',
    alignSelf: 'center',
  },
  filters: {
    gap: Spacing.two,
  },
  listCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.65,
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
  evenGrid: {
    gap: Spacing.three,
    width: '100%',
  },
  evenGridRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    alignItems: 'stretch',
  },
  evenGridCell: {
    flex: 1,
  },
  gridCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: '100%',
  },
  gridCardPressable: {
    padding: Spacing.three,
    gap: Spacing.two,
    flex: 1,
  },
  gridTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  gridInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  gridSubtitle: {
    lineHeight: 18,
    minHeight: 36,
  },
  gridContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

