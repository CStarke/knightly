import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
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
    </Tabs>
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
          <View style={styles.brandMark}>
            <ThemedText type="caption" style={styles.brandMarkText}>
              C
            </ThemedText>
          </View>
          <ThemedText type="sectionTitle">Calvin</ThemedText>
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Brand.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#FFFFFF',
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
