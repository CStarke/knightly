import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { CompleteClubProfileView } from '@/components/complete-club-profile-view';
import { AppHeader } from '@/components/ui/app-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ParallaxStarfield } from '@/components/ui/starfield';
import { StarfieldContext } from '@/context/starfield-context';
import { useTheme } from '@/hooks/use-theme';

export default function CompleteClubProfileScreen() {
  const theme = useTheme();
  const { code } = useLocalSearchParams<{ code: string }>();

  const translateX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSuccess = () => {
    if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <StarfieldContext.Provider value={{ translateX, scrollY }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ParallaxStarfield translateX={translateX} scrollY={scrollY} />
        <AppHeader
          title="Complete Profile"
          subtitle="CLAIM VERIFIED"
          left={
            <HeaderBackButton
              onPress={handleBack}
              accessibilityLabel="Go back"
            />
          }
        />
        <CompleteClubProfileView
          code={code ?? ''}
          onBack={handleBack}
          onSuccess={handleSuccess}
        />
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
