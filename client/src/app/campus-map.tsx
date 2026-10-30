import { useCallback, useMemo, type ReactElement } from 'react';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { CampusMapContent } from '@/components/campus-map-content';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Screen } from '@/components/ui/screen';
import { SwipeableAppHeader } from '@/components/ui/swipeable-app-header';
import { PHANTOM_TABS } from '@/constants/phantom-tabs';
import { shouldClosePhantomPage } from '@/utils/phantom-page';

/**
 * Preserves the web route and direct links. Normal native entry opens the Safety phantom page.
 * @returns The same map body and branded header used by native navigation.
 */
export default function CampusMapScreen(): ReactElement {
  const { width } = useWindowDimensions();
  const meta = PHANTOM_TABS['campus-map'];
  const goBack = useCallback(() => {
    // Direct visits have no app history; return to Safety rather than a blank page.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/safety');
  }, []);
  const headerGesture = useMemo(() => Gesture.Pan()
    .minPointers(1).maxPointers(1)
    .activeOffsetX([-20, 20]).failOffsetY([-15, 15])
    .onEnd((event) => {
      if (shouldClosePhantomPage(event.translationX, event.velocityX, width)) runOnJS(goBack)();
    }), [width, goBack]);

  return (
    <Screen scroll={false} header={
      <SwipeableAppHeader
        gesture={headerGesture}
        title={meta.defaultTitle ?? meta.displayName}
        subtitle={meta.defaultSubtitle}
        left={<HeaderBackButton onPress={goBack} accessibilityLabel={meta.backA11yLabel} />}
      />
    }>
      <CampusMapContent />
    </Screen>
  );
}

