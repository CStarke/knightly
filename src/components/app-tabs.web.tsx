import { usePathname } from 'expo-router';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/ui/app-header';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { getTabHeader } from '@/constants/tab-headers';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { StarfieldContext } from '@/context/starfield-context';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const pathname = usePathname();
  const headerInfo = getTabHeader(pathname);
  const translateX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  return (
    <StarfieldContext.Provider value={{ translateX, scrollY }}>
      <View style={{ flex: 1, position: 'relative' }}>
        <ParallaxStarfield translateX={translateX} scrollY={scrollY} />

        <Tabs>
          <TabList asChild>
            <TopBar>
              <TabTrigger name="knightly" href="/" asChild>
                <TabButton>Knightly</TabButton>
              </TabTrigger>
              <TabTrigger name="dining" href="/dining" asChild>
                <TabButton>Dining</TabButton>
              </TabTrigger>
              <TabTrigger name="safety" href="/safety" asChild>
                <TabButton>Safety</TabButton>
              </TabTrigger>
              <TabTrigger name="directory" href="/directory" asChild>
                <TabButton>Directory</TabButton>
              </TabTrigger>
            </TopBar>
          </TabList>

          <AppHeader
            title={headerInfo.title}
            subtitle={headerInfo.subtitle}
            right={headerInfo.right}
          />
          <TabSlot style={styles.slot} />
        </Tabs>
      </View>
    </StarfieldContext.Provider>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButton,
          isFocused && { backgroundColor: theme.tintSoft },
        ]}>
        <ThemedText type="smallBold" style={{ color: isFocused ? theme.tint : theme.textSecondary }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function TopBar(props: TabListProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border },
      ]}>
      <View style={styles.barInner}>
        <View style={styles.brand}>
          <ThemedText type="title" style={styles.brandText}>Calvin</ThemedText>
          <View style={styles.dot} />
        </View>

        <View style={styles.tabs}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  bar: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  barInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  brandText: {
    letterSpacing: -0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.gold,
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
});
