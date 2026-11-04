import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation, Easing, runOnJS, useSharedValue, withSpring, withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  constrainPhantomOffset, shouldClosePhantomPage, transitionPhantomPage,
  type PhantomPageEvent, type PhantomPageState,
} from '@/utils/phantom-page';

/** Inputs shared by any single-level, header-swiped phantom page. */
type PhantomPageOptions = {
  activeIndex: number;
  parentSlot: number;
  slot: number;
  width: number;
  translateX: SharedValue<number>;
  bottomBarTranslateY: SharedValue<number>;
};

/** Native pager integration; mounted includes the complete closing animation. */
type PhantomPageController = {
  mounted: boolean;
  isOpen: boolean;
  isMountedShared: SharedValue<boolean>;
  open: () => void;
  close: () => void;
  reset: () => void;
  headerGesture: ReturnType<typeof Gesture.Pan>;
};

const TIMING = { duration: 340, easing: Easing.bezier(0.4, 0, 0.2, 1) };
const SPRING = { damping: 26, stiffness: 240, mass: 0.9 };

/**
 * Owns a phantom page's lifecycle and header-only gesture, without creating a stack route.
 * @param options Parent/child slots and the shared camera used by the existing pager.
 * @returns Navigation callbacks, render flags, and a gesture attached only to the header.
 */
export function usePhantomPage({ activeIndex, parentSlot, slot, width, translateX, bottomBarTranslateY }: PhantomPageOptions): PhantomPageController {
  const [state, setState] = useState<PhantomPageState>({ phase: 'closed', revision: 0 });
  const stateRef = useRef(state);
  const isMountedShared = useSharedValue(false);
  const dragging = useSharedValue(false);
  const startX = useSharedValue(0);

  // A synchronous ref prevents rapid taps and queued animation callbacks from using stale React state.
  const apply = useCallback((event: PhantomPageEvent) => {
    const next = transitionPhantomPage(stateRef.current, event);
    if (next === stateRef.current) return next;
    stateRef.current = next;
    isMountedShared.value = next.phase !== 'closed';
    setState(next);
    return next;
  }, [isMountedShared]);

  const finishClose = useCallback((revision: number) => {
    apply({ type: 'settled', revision });
  }, [apply]);

  const reset = useCallback(() => {
    if (stateRef.current.phase === 'closed') return;
    cancelAnimation(translateX);
    dragging.value = false;
    apply({ type: 'reset' });
    bottomBarTranslateY.value = 0;
  }, [apply, bottomBarTranslateY, dragging, translateX]);

  const open = useCallback(() => {
    if (activeIndex !== parentSlot || !Number.isFinite(width) || width <= 0) return;
    cancelAnimation(translateX);
    apply({ type: 'open' });
    // Match existing phantom pages: retain the parent selection and hide the bottom bar.
    bottomBarTranslateY.value = withTiming(120, { duration: 260, easing: TIMING.easing });
    translateX.value = withTiming(-slot * width, TIMING);
  }, [activeIndex, parentSlot, width, translateX, apply, bottomBarTranslateY, slot]);

  const close = useCallback(() => {
    if (stateRef.current.phase !== 'open') return;
    cancelAnimation(translateX);
    dragging.value = false;
    const { revision } = apply({ type: 'close' });
    bottomBarTranslateY.value = withTiming(0, { duration: 260, easing: TIMING.easing });
    translateX.value = withTiming(-parentSlot * width, TIMING, (finished) => {
      // Only the current completed animation may unmount the map. Never use a fixed timeout.
      if (finished) runOnJS(finishClose)(revision);
    });
  }, [translateX, dragging, apply, bottomBarTranslateY, parentSlot, width, finishClose]);

  useEffect(() => {
    if (activeIndex !== parentSlot) reset();
  }, [activeIndex, parentSlot, reset]);

  useEffect(() => {
    if (state.phase === 'closed' || activeIndex !== parentSlot) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Consume repeated Back presses during the exit animation as well.
      close();
      return true;
    });
    return () => subscription.remove();
  }, [state.phase, activeIndex, parentSlot, close]);

  // Rotation and activity resume must settle even an interrupted/cancelled header drag.
  const settle = useCallback(() => {
    if (activeIndex !== parentSlot || !isMountedShared.value) return;
    cancelAnimation(translateX);
    dragging.value = false;
    if (stateRef.current.phase === 'closing') {
      finishClose(stateRef.current.revision);
      translateX.value = -parentSlot * width;
      bottomBarTranslateY.value = 0;
    } else {
      translateX.value = -slot * width;
      bottomBarTranslateY.value = 120;
    }
  }, [activeIndex, parentSlot, isMountedShared, translateX, dragging, finishClose, width, bottomBarTranslateY, slot]);

  useEffect(() => { settle(); }, [settle]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', settle);
    return () => subscription.remove();
  }, [settle]);

  useEffect(() => () => {
    // Invalidate any queued completion after the pager itself unmounts.
    stateRef.current = transitionPhantomPage(stateRef.current, { type: 'reset' });
    isMountedShared.value = false;
  }, [isMountedShared]);

  const headerGesture = useMemo(() => Gesture.Pan()
    .enabled(state.phase === 'open' && activeIndex === parentSlot)
    .minPointers(1).maxPointers(1)
    .activeOffsetX([-20, 20]).failOffsetY([-15, 15])
    .onStart(() => {
      cancelAnimation(translateX);
      startX.value = translateX.value;
      dragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = constrainPhantomOffset(startX.value + event.translationX, width, parentSlot, slot);
    })
    .onEnd((event) => {
      dragging.value = false;
      const distance = translateX.value + slot * width;
      if (shouldClosePhantomPage(distance, event.velocityX, width)) {
        runOnJS(close)();
      } else {
        translateX.value = withSpring(-slot * width, { ...SPRING, velocity: event.velocityX });
      }
    })
    .onFinalize(() => {
      // Cancellation (including a second finger) must not leave the track between pages.
      if (dragging.value) translateX.value = withSpring(-slot * width, SPRING);
      dragging.value = false;
    }), [state.phase, activeIndex, parentSlot, translateX, startX, dragging, width, slot, close]);

  return { mounted: state.phase !== 'closed', isOpen: state.phase === 'open', isMountedShared, open, close, reset, headerGesture };
}