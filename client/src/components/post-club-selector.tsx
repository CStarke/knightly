import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import type { Club } from '@/data/clubs';
import { useTheme } from '@/hooks/use-theme';

export interface PostClubSelectorProps {
  activeClub: Club;
  linkedClubs: Club[];
  onSelectClub: (club: Club) => void;
}

export function PostClubSelector({
  activeClub,
  linkedClubs,
  onSelectClub,
}: PostClubSelectorProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.section}>
      <ThemedText type="caption" themeColor="textMuted" style={styles.sectionLabel}>
        POSTING AS CLUB
      </ThemedText>
      <Pressable
        onPress={() => {
          if (linkedClubs.length > 1) {
            setIsOpen((prev) => !prev);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Posting as ${activeClub.name}. Tap to switch club.`}
        style={[
          styles.clubSelectorRow,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.clubMonogram,
            { backgroundColor: activeClub.colors[0] },
          ]}
        >
          <ThemedText style={styles.clubMonogramText}>
            {activeClub.mark}
          </ThemedText>
        </View>
        <View style={styles.clubSelectorInfo}>
          <ThemedText style={styles.clubSelectorName} numberOfLines={1}>
            {activeClub.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {activeClub.category} · Verified Club Leader
          </ThemedText>
        </View>
        {linkedClubs.length > 1 ? (
          <Icon
            sf={isOpen ? 'chevron.up' : 'chevron.down'}
            md={isOpen ? 'expand_less' : 'expand_more'}
            size={18}
            color={theme.textMuted}
          />
        ) : (
          <Badge label="ACTIVE" tone="success" />
        )}
      </Pressable>

      {isOpen && linkedClubs.length > 1 ? (
        <View
          style={[
            styles.dropdownList,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          {linkedClubs.map((club) => (
            <Pressable
              key={club.id}
              onPress={() => {
                onSelectClub(club);
                setIsOpen(false);
              }}
              style={[
                styles.dropdownItem,
                club.id === activeClub.id && {
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                },
              ]}
            >
              <ThemedText style={{ fontWeight: club.id === activeClub.id ? '700' : '500' }}>
                {club.name}
              </ThemedText>
              {club.id === activeClub.id && (
                <Icon sf="checkmark" md="check" size={16} color={Brand.gold} />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  clubSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two + 2,
  },
  clubMonogram: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubMonogramText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  clubSelectorInfo: {
    flex: 1,
  },
  clubSelectorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownList: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
});
