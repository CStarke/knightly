import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PostNotLeaderViewProps {
  onOpenClaimModal: () => void;
}

/**
 * Screen presented to students who have not yet claimed club leadership access.
 * Guides them to enter their 10-character Student Life authorization code.
 */
export function PostNotLeaderView({ onOpenClaimModal }: PostNotLeaderViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.outerContainer}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(7, 8, 10, 0.48)' : 'rgba(255, 255, 255, 0.48)',
            zIndex: 0,
          },
        ]}
      />
      <Screen style={styles.notLeaderScreen}>
        <Card style={styles.notLeaderCard}>
          <View style={styles.notLeaderIconCircle}>
            <Icon sf="lock.shield.fill" md="lock" size={32} color={Brand.gold} />
          </View>
          <ThemedText type="headline" style={styles.notLeaderTitle}>
            Club Leadership Required
          </ThemedText>
          <ThemedText
            type="default"
            themeColor="textMuted"
            style={styles.notLeaderSubtitle}
          >
            Only authorized club student leaders can publish campus posts. If you are
            a leader, enter the 10-character code provided by Student Life.
          </ThemedText>
          <Button
            label="Enter Leader Code"
            variant="primary"
            onPress={onOpenClaimModal}
            style={{ width: '100%', marginTop: Spacing.two }}
          />
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
  notLeaderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  notLeaderCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  notLeaderIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(243, 195, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  notLeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  notLeaderSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
