import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { ClubDetailView } from '@/components/club-detail-view';
import { AppHeader } from '@/components/ui/app-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { StarfieldContext } from '@/context/starfield-context';
import { getClubById } from '@/data/clubs';
import { useTheme } from '@/hooks/use-theme';

import ClubsDirectoryScreen from './index';

export default function ClubDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const translateX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const club = useMemo(() => {
    return id && id !== 'index' ? getClubById(id) : undefined;
  }, [id]);

  // If matched /clubs/index or no ID, seamlessly render the clubs directory screen
  if (!id || id === 'index') {
    return <ClubsDirectoryScreen />;
  }

  return (
    <StarfieldContext.Provider value={{ translateX, scrollY }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ParallaxStarfield translateX={translateX} scrollY={scrollY} />
        {/*
          WHY STANDARD "View Club" HEADER:
          Club names can be exceptionally long (e.g. "Knightly Robotics & Autonomous Vehicle Engineering"),
          which overflows the top masthead. Standardizing the title to "View Club" while showing the
          concise category in the subtitle keeps the header clean and uniform, letting the club's full
          identity shine in the hero card below.
        */}
        <AppHeader
          title="View Club"
          subtitle={club ? club.category : 'Not found'}
          left={
            <HeaderBackButton
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            />
          }
        />
        <ClubDetailView clubId={id} />
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
