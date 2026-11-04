import { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useHeaderOverlayScroll } from '@/components/ui/header-overlay';
import { useStarfield } from '@/context/starfield-context';

/** Publishes vertical screen scrolling to shared header motion and background parallax on the UI thread. */
export function useScreenScrollHandler() {
  const headerScroll = useHeaderOverlayScroll();
  const starfield = useStarfield();
  return useAnimatedScrollHandler({
    onScroll: (event) => {
      if (headerScroll) headerScroll.value = event.contentOffset.y;
      if (starfield) starfield.scrollY.value = event.contentOffset.y;
    },
  });
}
