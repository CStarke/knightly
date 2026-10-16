/**
 * Login Flight Animation Hook
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Encapsulates the multi-phase cinematic transition from the full-screen login view
 * into the main application layout (AGENTS.md Rule 4.3):
 * - Phase 1 (260ms): Fade out the login form and inputs.
 * - Phase 2 (900ms): Translate and scale the hero "Knightly" wordmark while morphing
 *   the Calvin Maroon background into the target header (mobile) or floating sidebar masthead (web).
 * - Phase 3 (160ms): Seamlessly crossfade the root overlay to reveal the underlying mounted app.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  useWindowDimensions,
  type View,
} from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SMART_APP_BANNER_HEIGHT } from '@/components/smart-app-banner';
import { getAppHeaderHeight } from '@/components/ui/app-header';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';

const ANIMATION_DURATION = 900;
const SMOOTH_SLIDE_CURVE = Easing.bezier(0.25, 0.1, 0.25, 1);

export type UseLoginFlightOptions = {
  isBannerVisible?: boolean;
};

export function useLoginFlight({ isBannerVisible = false }: UseLoginFlightOptions = {}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const screenHeight = Math.max(Dimensions.get('screen').height, windowHeight) + insets.bottom;

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && windowWidth >= 768;
  const bannerOffset = isBannerVisible ? SMART_APP_BANNER_HEIGHT : 0;

  const targetSidebarWidth = 270;
  const targetScale = isDesktopWeb ? 24 / 34 : 28 / 34;
  const targetHeaderHeight = getAppHeaderHeight(insets.top);
  const defaultMastheadHeight = 86;
  const headerPaddingTop = isDesktopWeb
    ? Spacing.four
    : insets.top > 0
      ? insets.top + Spacing.one
      : Spacing.three;

  // View measurement refs
  const heroWordmarkRef = useRef<View>(null);
  const headerTargetRef = useRef<View>(null);
  const isTransitioningRef = useRef(false);
  const isKeyboardOpenRef = useRef(false);

  // Analytical fallbacks for initial coordinate delta before layout measurements settle
  const defaultHeaderX = isDesktopWeb
    ? 12 + Spacing.three + 2
    : (windowWidth > MaxContentWidth ? (windowWidth - MaxContentWidth) / 2 : 0) + Spacing.three;
  const defaultHeaderY = isDesktopWeb ? 12 + Spacing.four : bannerOffset + headerPaddingTop;
  const defaultHeroWidth = 136;
  const defaultHeroHeight = 42;
  const formMainTop = Math.max(bannerOffset + headerPaddingTop + 30, (windowHeight - 402) / 2);

  const initialDeltaX = defaultHeaderX + (defaultHeroWidth * targetScale) / 2 - windowWidth / 2;
  const initialDeltaY =
    defaultHeaderY + (defaultHeroHeight * targetScale) / 2 - (formMainTop + 74 + defaultHeroHeight / 2);

  // Shared animation values
  const overlayOpacity = useSharedValue(1);
  const headerHeight = useSharedValue(
    isDesktopWeb ? windowHeight : isWeb ? windowHeight - bannerOffset : screenHeight
  );
  const sidebarMorphProgress = useSharedValue(0);
  const mastheadHeight = useSharedValue(defaultMastheadHeight);
  const formOpacity = useSharedValue(1);
  const headerDetailsOpacity = useSharedValue(0);
  const wordmarkProgress = useSharedValue(0);
  const wordmarkCrossfadeOpacity = useSharedValue(1);
  const deltaX = useSharedValue(initialDeltaX);
  const deltaY = useSharedValue(initialDeltaY);
  const formRaise = useSharedValue(0);

  // Smooth form elevation for soft keyboards
  const raiseForm = useCallback(
    (duration = 280) => {
      if (isTransitioningRef.current) return;
      const formTop = (windowHeight - 402) / 2;
      const minTopClearance = insets.top + Spacing.four + 12;
      const maxSafeRaise = Math.max(0, formTop - minTopClearance);
      const targetRaise = Math.min(105, maxSafeRaise);

      formRaise.value = withTiming(targetRaise, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    },
    [windowHeight, insets.top, formRaise]
  );

  const lowerForm = useCallback(
    (duration = 240) => {
      if (isTransitioningRef.current) return;
      formRaise.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    },
    [formRaise]
  );

  // Native and Web keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      isKeyboardOpenRef.current = true;
      raiseForm(e?.duration && e.duration > 0 ? e.duration : 280);
    };
    const onHide = (e: any) => {
      isKeyboardOpenRef.current = false;
      lowerForm(e?.duration && e.duration > 0 ? e.duration : 240);
    };

    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [raiseForm, lowerForm]);

  // Mobile Web visualViewport resize listener
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      if (window.innerHeight - vv.height > 120) {
        isKeyboardOpenRef.current = true;
        raiseForm(280);
      } else {
        isKeyboardOpenRef.current = false;
        lowerForm(240);
      }
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, [raiseForm, lowerForm]);

  // Geometric target measurement
  const measurePositions = useCallback(() => {
    if (isTransitioningRef.current) return;
    heroWordmarkRef.current?.measureInWindow((hx, hy, hw, hh) => {
      headerTargetRef.current?.measureInWindow((tx, ty, tw, th) => {
        if (isTransitioningRef.current || hw <= 0 || hh <= 0 || tw <= 0 || th <= 0) return;
        deltaX.value = tx + (hw * targetScale) / 2 - (hx + hw / 2);
        deltaY.value = ty + (hh * targetScale) / 2 - (hy + hh / 2);
      });
    });
  }, [deltaX, deltaY, targetScale]);

  useEffect(() => {
    measurePositions();
    const timer = setTimeout(measurePositions, 100);
    return () => clearTimeout(timer);
  }, [measurePositions, windowWidth, windowHeight]);

  // Executes the multi-phase flight animation sequence
  const startFlight = useCallback(
    (onComplete: () => void) => {
      isTransitioningRef.current = true;
      formRaise.value = 0;

      const runFlight = () => {
        // Fade in header details (avatar on mobile, tagline on web)
        headerDetailsOpacity.value = withDelay(
          isDesktopWeb ? 460 : 380,
          withTiming(1, {
            duration: isDesktopWeb ? 340 : 450,
            easing: Easing.out(Easing.quad),
          })
        );

        // Wordmark glides to destination
        wordmarkProgress.value = withTiming(1, {
          duration: ANIMATION_DURATION,
          easing: SMOOTH_SLIDE_CURVE,
        });

        const onFinished = (finished?: boolean) => {
          if (!finished) return;
          wordmarkCrossfadeOpacity.value = 0;
          overlayOpacity.value = withTiming(
            0,
            { duration: 160, easing: Easing.out(Easing.quad) },
            (done) => {
              if (done) runOnJS(onComplete)();
            }
          );
        };

        if (isDesktopWeb) {
          sidebarMorphProgress.value = withTiming(
            1,
            { duration: ANIMATION_DURATION, easing: SMOOTH_SLIDE_CURVE },
            onFinished
          );
        } else {
          headerHeight.value = withTiming(
            targetHeaderHeight,
            { duration: ANIMATION_DURATION, easing: SMOOTH_SLIDE_CURVE },
            onFinished
          );
        }
      };

      // Phase 1: Fade out the form fields completely (260ms), then begin flight
      formOpacity.value = withTiming(
        0,
        { duration: 260, easing: Easing.out(Easing.cubic) },
        (done) => {
          if (done) {
            measurePositions();
            runOnJS(runFlight)();
          }
        }
      );
    },
    [
      deltaX,
      deltaY,
      formOpacity,
      formRaise,
      headerDetailsOpacity,
      headerHeight,
      isDesktopWeb,
      measurePositions,
      overlayOpacity,
      sidebarMorphProgress,
      targetHeaderHeight,
      wordmarkCrossfadeOpacity,
      wordmarkProgress,
    ]
  );

  // Animated styles
  const rootOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const maroonContainerStyle = useAnimatedStyle(() => {
    if (isDesktopWeb) {
      const p = sidebarMorphProgress.value;
      return {
        position: 'absolute',
        left: 12 * p,
        top: 12 * p,
        width: windowWidth + (targetSidebarWidth - windowWidth) * p,
        height: windowHeight + (mastheadHeight.value - windowHeight) * p,
        borderRadius: 20 * p,
        overflow: 'hidden',
        shadowColor: Brand.maroonDark,
        shadowOffset: { width: 0, height: 2 * p },
        shadowOpacity: 0.15 * p,
        shadowRadius: 4 * p,
        elevation: 2 * p,
      };
    }
    return {
      top: bannerOffset,
      height: headerHeight.value,
      width: '100%',
    };
  });

  const formFadeStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const headerDetailsStyle = useAnimatedStyle(() => ({
    opacity: headerDetailsOpacity.value,
  }));

  const targetWordmarkStyle = useAnimatedStyle(() => ({
    opacity: 1 - wordmarkCrossfadeOpacity.value,
  }));

  const flyingWordmarkStyle = useAnimatedStyle(() => {
    const p = wordmarkProgress.value;
    const currentScale = 1 - (1 - targetScale) * p;
    return {
      zIndex: 999,
      opacity: wordmarkCrossfadeOpacity.value,
      transform: [
        { translateX: deltaX.value * p },
        { translateY: deltaY.value * p },
        { scale: currentScale },
      ],
    };
  });

  const formRaiseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -formRaise.value }],
  }));

  return {
    heroWordmarkRef,
    headerTargetRef,
    mastheadHeight,
    isDesktopWeb,
    isWeb,
    headerPaddingTop,
    bannerOffset,
    measurePositions,
    raiseForm,
    lowerForm,
    startFlight,
    isTransitioningRef,
    // Styles
    rootOverlayStyle,
    maroonContainerStyle,
    formFadeStyle,
    headerDetailsStyle,
    targetWordmarkStyle,
    flyingWordmarkStyle,
    formRaiseStyle,
  };
}
