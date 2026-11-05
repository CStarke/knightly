import { Platform, StyleSheet } from 'react-native';

import { HeaderHorizontalInset, HeaderTopInset, Radius, Spacing } from '@/constants/theme';

/** Inset navigation surfaces so all four rounded corners show against the page. */
export const navigationChromeStyles = StyleSheet.create({
  header: {
    borderRadius: Radius.xl,
    // Square native top corners to fill the status-bar region; retain rounded lower corners.
    borderTopLeftRadius: Platform.OS === 'web' ? Radius.xl : 0,
    borderTopRightRadius: Platform.OS === 'web' ? Radius.xl : 0,
    marginHorizontal: HeaderHorizontalInset,
    marginTop: HeaderTopInset,
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
