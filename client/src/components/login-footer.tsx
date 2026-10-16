/**
 * Login Footer & Version Watermark Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Renders the pinned campus location notice and the semantic version watermark
 * (APP_VERSION) in the bottom-right corner (AGENTS.md Section 3 & Rule 4.3).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { APP_VERSION } from '@/constants/version';

export type LoginFooterProps = {
  formFadeStyle: any;
  bottomInset: number;
  rightInset: number;
};

export function LoginFooter({
  formFadeStyle,
  bottomInset,
  rightInset,
}: LoginFooterProps) {
  const bottomPosition = Math.max(bottomInset + Spacing.two, Spacing.four);
  const rightPosition = Math.max(rightInset + Spacing.three, Spacing.four);

  return (
    <>
      {/* Footer pinned closer to the bottom without displacing the centered form */}
      <Animated.View
        style={[styles.footer, { bottom: bottomPosition }, formFadeStyle]}
      >
        <ThemedText style={styles.footerText}>
          Calvin University · Grand Rapids, Michigan
        </ThemedText>
      </Animated.View>

      {/* Version watermark pinned to bottom-right corner */}
      <Animated.View
        style={[styles.versionContainer, { bottom: bottomPosition, right: rightPosition }, formFadeStyle]}
        pointerEvents="none"
      >
        <ThemedText style={styles.versionText}>{APP_VERSION}</ThemedText>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  versionContainer: {
    position: 'absolute',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
