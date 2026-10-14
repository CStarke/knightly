import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Web uses campus-map-view.web.tsx; native uses campus-map-view.tsx.
import CampusMapView from '@/components/campus-map-view';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createCampusMapHtml } from '@/utils/campus-map-html';

/** Shows the bundled campus building map with zoom and pan controls. */
export default function CampusMapScreen() {
  const theme = useTheme();

  // Keep the screen clear of the device's top and bottom safe areas.
  const insets = useSafeAreaInsets();

  // Keep the document stable so unrelated renders do not reset the zoom.
  // A changed theme creates new HTML so the viewer uses the current colors.
  const html = useMemo(() => createCampusMapHtml(theme), [theme]);

  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <HeaderBackButton
          color={Brand.pureWhite}
          onPress={() => {
            // Direct web visits may have no previous app screen.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/safety');
            }
          }}
        />

        <View style={styles.heading}>
          <Text style={styles.brandLabel}>CALVIN UNIVERSITY</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Campus map
          </Text>
        </View>
      </View>

      {/* Both platform viewers receive the same map and interaction code. */}
      <CampusMapView html={html} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },

  // Use the app's brand colors to connect the map to the rest of Knightly.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    backgroundColor: Brand.maroon,
    borderBottomWidth: Spacing.one,
    borderBottomColor: Brand.gold,
  },

  heading: {
    flex: 1,
  },

  brandLabel: {
    color: Brand.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.one,
  },

  title: {
    color: Brand.pureWhite,
    fontSize: 22,
    fontWeight: '600',
  },
});