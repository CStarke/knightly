import { StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

/** Inset navigation surfaces so all four rounded corners show against the page. */
export const navigationChromeStyles = StyleSheet.create({
  header: {
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.two,
    marginTop: Spacing.two,
    overflow: 'hidden',
  },
  bottomBar: {
    borderRadius: Radius.xl,
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    // Clip the inner surface to the same rounded silhouette.
    overflow: 'hidden',
  },
});
