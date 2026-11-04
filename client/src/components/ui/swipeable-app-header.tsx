import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { GestureDetector, type Gesture } from 'react-native-gesture-handler';

import { AppHeader } from '@/components/ui/app-header';

/** Standard header with an isolated gesture surface, leaving page content untouched. */
type SwipeableAppHeaderProps = ComponentProps<typeof AppHeader> & {
  gesture: ReturnType<typeof Gesture.Pan>;
};

/** @returns The shared masthead in a non-collapsible native gesture target. */
export function SwipeableAppHeader({
  gesture,
  ...headerProps
}: SwipeableAppHeaderProps): ReactElement {
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>
        <AppHeader {...headerProps} />
      </View>
    </GestureDetector>
  );
}