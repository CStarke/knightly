import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { ClubsDirectoryView } from '@/components/clubs-directory-view';
import { AppHeader } from '@/components/ui/app-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { StarfieldContext } from '@/context/starfield-context';
import { useTheme } from '@/hooks/use-theme';

export default function ClubsDirectoryScreen() {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  return (
    <StarfieldContext.Provider value={{ translateX, scrollY }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ParallaxStarfield translateX={translateX} scrollY={scrollY} />
        <AppHeader
          title="Campus Clubs"
          subtitle="Student orgs & communities"
          left={
            <HeaderBackButton
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            />
          }
        />
        <ClubsDirectoryView />
      </View>
    </StarfieldContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
});
