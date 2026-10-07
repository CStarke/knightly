import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getAppHeaderHeight } from '@/components/ui/app-header';
import { Icon } from '@/components/ui/icon';
import { Brand, Fonts, MaxContentWidth, Radius, Spacing, WebHeaderInset } from '@/constants/theme';
import { APP_VERSION } from '@/constants/version';
import { useAuth } from '@/context/auth-context';
import { student } from '@/data/student';
import { useTheme } from '@/hooks/use-theme';
import {
  PASSWORD_MASK_DELAY_MS,
  PASSWORD_MASK_DOT,
  formatPasswordDisplay,
  processPasswordMaskInput,
} from '@/utils/masked-password';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const screenHeight =
    Math.max(Dimensions.get('screen').height, windowHeight) + insets.bottom;

  const { signIn, user, setAppMounted } = useAuth();
  const theme = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayPassword, setDisplayPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const maskTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isCollapsedLocally] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem('knightly_sidebar_collapsed') === 'true';
      } catch {}
    }
    return false;
  });

  // Clean up any pending password mask timer on unmount
  useEffect(() => {
    return () => {
      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
      }
    };
  }, []);

  const [activeInitials, setActiveInitials] = useState(() => {
    const fn = user?.firstName ?? student.firstName;
    const ln = user?.lastName ?? student.lastName;
    return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || 'JD';
  });

  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isWeb = Platform.OS === 'web';
  const targetSidebarWidth = 270;
  const targetScale = isWeb ? 24 / 34 : 28 / 34;

  // Exact height of the AppHeader on the home page (for mobile)
  const targetHeaderHeight = getAppHeaderHeight(insets.top);
  // Exact height of the Calvin Maroon Masthead at the top of the desktop sidebar
  const defaultMastheadHeight = 86;
  const mastheadHeight = useSharedValue(defaultMastheadHeight);
  const headerPaddingTop =
    isWeb ? Spacing.four : insets.top + Spacing.one;

  const scrollViewRef = useRef<ScrollView>(null);
  const heroWordmarkRef = useRef<View>(null);
  const headerTargetRef = useRef<View>(null);

  // Analytical fallbacks for initial frame before onLayout measurements
  // On web, target position docks into the left sidebar masthead (x: 12 + Spacing.three + 2, y: 12 + Spacing.four)
  // On mobile, target position docks into the centered AppHeader
  const defaultHeaderX = isWeb
    ? 12 + Spacing.three + 2
    : (windowWidth > MaxContentWidth ? (windowWidth - MaxContentWidth) / 2 : 0) + Spacing.three;
  const defaultHeaderY = isWeb ? 12 + Spacing.four : headerPaddingTop;
  const defaultHeroWidth = 136;
  const defaultHeroHeight = 42;
  const formMainTop = Math.max(headerPaddingTop + 30, (windowHeight - 402) / 2);

  const initialDeltaX = defaultHeaderX + (defaultHeroWidth * targetScale) / 2 - windowWidth / 2;
  const initialDeltaY =
    defaultHeaderY + (defaultHeroHeight * targetScale) / 2 - (formMainTop + 74 + defaultHeroHeight / 2);

  // Shared animation values
  const initialHeight = isWeb ? windowHeight : screenHeight;
  const overlayOpacity = useSharedValue(1);
  const headerHeight = useSharedValue(initialHeight);
  const headerWidth = useSharedValue(windowWidth);
  const sidebarMorphProgress = useSharedValue(0);
  const formOpacity = useSharedValue(1);
  const headerDetailsOpacity = useSharedValue(0);
  const wordmarkProgress = useSharedValue(0);
  const wordmarkCrossfadeOpacity = useSharedValue(1);

  // Distance from hero starting center to header/sidebar destination center
  const deltaX = useSharedValue(initialDeltaX);
  const deltaY = useSharedValue(initialDeltaY);

  // Dedicated shared value for smooth form elevation without mid-curve clipping
  const formRaise = useSharedValue(0);
  const isKeyboardOpenRef = useRef(false);

  const raiseForm = useCallback(
    (duration: number = 280) => {
      if (isTransitioningRef.current) return;
      const formTop = (windowHeight - 402) / 2;
      // Keep at least insets.top + Spacing.four + 12px breathing room so the logo never hits the top
      const minTopClearance = insets.top + Spacing.four + 12;
      const maxSafeRaise = Math.max(0, formTop - minTopClearance);
      // "It should raise just a touch more" -> 105px (up from previous 75px), clamped by maxSafeRaise
      const targetRaise = Math.min(105, maxSafeRaise);

      formRaise.value = withTiming(targetRaise, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    },
    [windowHeight, insets.top, formRaise]
  );

  const lowerForm = useCallback(
    (duration: number = 240) => {
      if (isTransitioningRef.current) return;
      formRaise.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    },
    [formRaise]
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      isKeyboardOpenRef.current = true;
      const duration = e?.duration && e.duration > 0 ? e.duration : 280;
      raiseForm(duration);
    };

    const onHide = (e: any) => {
      isKeyboardOpenRef.current = false;
      const duration = e?.duration && e.duration > 0 ? e.duration : 240;
      lowerForm(duration);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [raiseForm, lowerForm]);

  // Mobile Web visualViewport resize listener for on-screen keyboards
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) {
      return;
    }
    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const diff = window.innerHeight - vv.height;
      if (diff > 120) {
        isKeyboardOpenRef.current = true;
        raiseForm(280);
      } else {
        isKeyboardOpenRef.current = false;
        lowerForm(240);
      }
    };
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [raiseForm, lowerForm]);

  // Measure both untransformed views to get exact travel delta
  const measurePositions = useCallback(() => {
    if (isTransitioningRef.current) return;

    heroWordmarkRef.current?.measureInWindow((hx, hy, hw, hh) => {
      headerTargetRef.current?.measureInWindow((tx, ty, tw, th) => {
        if (isTransitioningRef.current) return;
        if (hw > 0 && hh > 0 && tw > 0 && th > 0) {
          const heroCenterX = hx + hw / 2;
          const heroCenterY = hy + hh / 2;

          const targetCenterX = tx + (hw * targetScale) / 2;
          const targetCenterY = ty + (hh * targetScale) / 2;

          deltaX.value = targetCenterX - heroCenterX;
          deltaY.value = targetCenterY - heroCenterY;
        }
      });
    });
  }, [deltaX, deltaY, targetScale]);

  // Measure on mount, window resize, and layout changes
  useEffect(() => {
    measurePositions();
    const t1 = setTimeout(measurePositions, 50);
    const t2 = setTimeout(measurePositions, 150);
    const t3 = setTimeout(measurePositions, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [measurePositions, windowWidth, windowHeight]);

  // Keep screen dimensions and reset values in sync if screen rotates or user signs out
  useEffect(() => {
    if (!isTransitioning) {
      overlayOpacity.value = 1;
      headerHeight.value = isWeb ? windowHeight : screenHeight;
      headerWidth.value = windowWidth;
      sidebarMorphProgress.value = 0;
      formOpacity.value = 1;
      headerDetailsOpacity.value = 0;
      wordmarkProgress.value = 0;
      wordmarkCrossfadeOpacity.value = 1;
      isTransitioningRef.current = false;
    }
  }, [
    screenHeight,
    windowHeight,
    windowWidth,
    isTransitioning,
    headerHeight,
    headerWidth,
    sidebarMorphProgress,
    formOpacity,
    headerDetailsOpacity,
    wordmarkProgress,
    wordmarkCrossfadeOpacity,
    overlayOpacity,
    isWeb,
  ]);

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  const onTransitionComplete = (submittedUser: string, submittedPass: string) => {
    signIn(submittedUser, submittedPass);
  };

  const handleSignIn = () => {
    if (isTransitioning || isTransitioningRef.current) return;

    const submittedUser = username.trim();
    const submittedPass = password.trim();

    if (!submittedUser || !submittedPass) {
      setErrorMessage('Please enter both your Calvin username/email and password.');
      return;
    }

    // Students cannot sign in with student IDs (pure digits)
    if (/^\d+$/.test(submittedUser)) {
      setErrorMessage(
        'Student ID sign-in is not supported. Please use your Calvin username (e.g. jmd42) or email.'
      );
      return;
    }

    Keyboard.dismiss();
    setErrorMessage('');
    setIsTransitioning(true);
    formRaise.value = 0;

    // Compute initials immediately for John Doe / demo or custom user
    const lowerUser = submittedUser.toLowerCase();
    const isJohn = ['jmd42', 'jmd42@calvin.edu', 'john', 'jmd', student.email.toLowerCase()].includes(lowerUser);

    if (isJohn) {
      setActiveInitials('JD');
    } else {
      const isEmail = submittedUser.includes('@');
      const cleanUser = isEmail ? submittedUser.split('@')[0] : submittedUser;
      const cleanName = cleanUser.replace(/[@._-]/g, ' ');
      const words = cleanName.split(' ').filter(Boolean);
      const fn = words[0] ? words[0].charAt(0).toUpperCase() : 'C';
      const ln = words[1] ? words[1].charAt(0).toUpperCase() : 'S';
      setActiveInitials(`${fn}${ln}`);
    }

    // 1. Mount the main app in the background behind the 100% opaque maroon screen
    // Doing this at t = 0 allows the background app to mount and settle completely
    // during the 380ms form fade-out, avoiding any JS/CPU contention when the flight begins.
    setAppMounted(true);

    // Fluid ease-in-out slide curve for flight and shrink
    const smoothSlideCurve = Easing.bezier(0.25, 0.1, 0.25, 1);
    const ANIMATION_DURATION = 900;

    const startFlightAnimation = () => {
      // Permanently freeze measurements so no layout shifts or late callbacks can touch delta
      isTransitioningRef.current = true;

      // Fade in the header details (avatar on mobile, tagline and collapse on web)
      headerDetailsOpacity.value = withDelay(
        isWeb ? 460 : 380,
        withTiming(1, {
          duration: isWeb ? 340 : 450,
          easing: Easing.out(Easing.quad),
        })
      );

      // Wordmark glides from center hero position into the target (AppHeader on mobile, Sidebar on web)
      wordmarkProgress.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: smoothSlideCurve,
      });

      const onFlightFinished = (finished?: boolean) => {
        if (finished) {
          // Snap from the fractionally scaled flying wordmark to the pixel-perfect native target wordmark
          // right before the overlay crossfades to the identically matching app-tabs beneath.
          wordmarkCrossfadeOpacity.value = 0;

          // Once flight arrives at target, smoothly cross-fade overlay (160ms)
          // revealing the identical underlying UI with 100% continuous visibility
          overlayOpacity.value = withTiming(
            0,
            {
              duration: 160,
              easing: Easing.out(Easing.quad),
            },
            (crossfadeDone) => {
              if (crossfadeDone) {
                runOnJS(onTransitionComplete)(submittedUser, submittedPass);
              }
            }
          );
        }
      };

      if (isWeb) {
        // WHY INSET MORPH ON WEB:
        // Desktop web layout uses an inset, rounded floating sidebar with a Calvin Maroon masthead
        // (left: 12, top: 12, width: 270, height: targetMastheadHeight, borderRadius: 20).
        // Animating sidebarMorphProgress glides the maroon container from full-screen width/height
        // directly into the exact inset geometry, rounded contour, and ambient elevation of the masthead.
        sidebarMorphProgress.value = withTiming(
          1,
          {
            duration: ANIMATION_DURATION,
            easing: smoothSlideCurve,
          },
          onFlightFinished
        );
      } else {
        // Mobile: Cinematic vertical shrink animation of the maroon container into the 104px AppHeader
        headerHeight.value = withTiming(
          targetHeaderHeight,
          {
            duration: ANIMATION_DURATION,
            easing: smoothSlideCurve,
          },
          onFlightFinished
        );
      }
    };

    const triggerFlightAfterFade = () => {
      // Re-measure now that the keyboard has fully dismissed and layout has settled,
      // while the wordmark is still 100% stationary.
      measurePositions();

      // Brief 30ms settle so layout has settled and the flight smoothly initiates
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = setTimeout(() => {
        startFlightAnimation();
      }, 30);
    };

    // Phase 1: Smoothly fade out the rest of the sign in page completely
    const FADE_OUT_DURATION = 260;
    formOpacity.value = withTiming(
      0,
      {
        duration: FADE_OUT_DURATION,
        easing: Easing.out(Easing.cubic),
      },
      (fadeFinished) => {
        if (fadeFinished) {
          // Phase 2: ONLY start the flight & maroon shrink animation AFTER the fade-out is 100% finished
          runOnJS(triggerFlightAfterFade)();
        }
      }
    );
  };

  const applyPassword = useCallback(
    (newRealPassword: string) => {
      setPassword(newRealPassword);
      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
        maskTimerRef.current = null;
      }
      setDisplayPassword(formatPasswordDisplay(newRealPassword, showPassword));
    },
    [showPassword]
  );

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => {
      const next = !prev;
      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
        maskTimerRef.current = null;
      }
      setDisplayPassword(formatPasswordDisplay(password, next));
      return next;
    });
  }, [password]);

  const handlePasswordChange = useCallback(
    (newInputText: string) => {
      if (errorMessage) setErrorMessage('');

      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
        maskTimerRef.current = null;
      }

      if (showPassword) {
        setPassword(newInputText);
        setDisplayPassword(newInputText);
        return;
      }

      const result = processPasswordMaskInput({
        currentReal: password,
        currentDisplay: displayPassword,
        newInputText,
      });

      setPassword(result.newReal);
      setDisplayPassword(result.newDisplay);

      if (result.shouldStartTimer) {
        maskTimerRef.current = setTimeout(() => {
          setDisplayPassword(PASSWORD_MASK_DOT.repeat(result.newReal.length));
          maskTimerRef.current = null;
        }, PASSWORD_MASK_DELAY_MS);
      }
    },
    [errorMessage, showPassword, password, displayPassword]
  );

  const fillDemoCredentials = () => {
    setUsername('jmd42');
    applyPassword('calvin2028');
    setErrorMessage('');
  };

  // Animated styles
  const rootOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const maroonBackgroundStyle = useAnimatedStyle(() => {
    if (isWeb) {
      const p = sidebarMorphProgress.value;
      const startH = windowHeight;
      const currentWidth = windowWidth + (targetSidebarWidth - windowWidth) * p;
      const currentLeft = 12 * p;
      const currentTop = 12 * p;
      const currentHeight = startH + (mastheadHeight.value - startH) * p;
      const currentRadius = 20 * p;

      return {
        position: 'absolute',
        left: currentLeft,
        top: currentTop,
        width: currentWidth,
        height: currentHeight,
        borderRadius: currentRadius,
        overflow: 'hidden',
        // Ambient soft elevation shadow blooming during flight to match the masthead
        shadowColor: Brand.maroonDark,
        shadowOffset: { width: 0, height: 2 * p },
        shadowOpacity: 0.15 * p,
        shadowRadius: 4 * p,
        elevation: 2 * p,
      };
    }
    return {
      height: headerHeight.value,
      width: '100%',
    };
  });

  const formFadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const headerDetailsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerDetailsOpacity.value,
  }));

  const targetWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - wordmarkCrossfadeOpacity.value,
  }));

  // Wordmark translation and scaling animation:
  // Starts at progress = 0: translateX = 0, translateY = 0, scale = 1.0 (dead-center in hero)
  // Ends at progress = 1: translateX = deltaX, translateY = deltaY, scale = 28 / 34 (top-left header corner)
  const wordmarkAnimatedStyle = useAnimatedStyle(() => {
    const p = wordmarkProgress.value;
    const dX = deltaX.value;
    const dY = deltaY.value;

    const currentScale = 1 - (1 - targetScale) * p;

    return {
      zIndex: 999,
      opacity: wordmarkCrossfadeOpacity.value,
      transform: [
        { translateX: dX * p },
        { translateY: dY * p },
        { scale: currentScale },
      ],
    };
  });

  // Smoothly raises the login form when the keyboard appears or input is focused.
  // "Not too much, it's just barely hidden, and you still don't want to be able to scroll,
  // the logo at the top of the login section shouldn't hit the top of the screen"
  // "It should raise just a touch more, and give it the same smooth raising that other places in the app do."
  const formRaiseAnimatedStyle = useAnimatedStyle(() => {
    if (isTransitioning) {
      return {
        transform: [{ translateY: 0 }],
      };
    }
    return {
      transform: [{ translateY: -formRaise.value }],
    };
  });

  return (
    <Animated.View
      style={[styles.rootOverlay, rootOverlayAnimatedStyle]}
      pointerEvents={isTransitioning ? 'none' : 'auto'}>
      {/* Static measurement anchor for Desktop Web docking coordinates */}
      {isWeb && (
        <View
          pointerEvents="none"
          style={styles.webTargetMeasurementAnchor}>
          <View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) {
                mastheadHeight.value = h;
              }
              measurePositions();
            }}
            style={styles.webSidebarMasthead}>
            <View style={styles.webSidebarMastheadTopRow}>
              <View
                ref={headerTargetRef}
                onLayout={measurePositions}
                style={[styles.webSidebarWordmarkRow, { opacity: 0 }]}>
                <ThemedText style={styles.webSidebarBrandTitle}>Knightly</ThemedText>
                <View style={styles.webSidebarGoldDot} />
              </View>

              {/* Collapse button placeholder to ensure identical flex layout */}
              <View style={[styles.webSidebarCollapseToggle, { opacity: 0 }]} />
            </View>

            {/* Tagline placeholder to ensure identical layout height */}
            <ThemedText style={[styles.webSidebarMastheadTagline, { opacity: 0 }]}>
              CALVIN UNIVERSITY
            </ThemedText>
          </View>
        </View>
      )}

      {/* 1. Maroon Background Container:
          - Web: Horizontally and vertically glides into inset floating rounded sidebar masthead
          - Mobile: Vertically shrinks from screenHeight down to targetHeaderHeight */}
      <Animated.View style={[styles.maroonContainer, maroonBackgroundStyle]}>
        {isWeb ? (
          /* Web Sidebar Masthead Layout Container */
          <View
            pointerEvents="none"
            style={styles.webSidebarContainer}>
            {/* Calvin Maroon Masthead Branding */}
            <View style={styles.webSidebarMasthead}>
              <View style={styles.webSidebarMastheadTopRow}>
                {/* Perfect native text fades in instantly at the end of flight, preventing subpixel blur */}
                <Animated.View style={[styles.webSidebarWordmarkRow, targetWordmarkAnimatedStyle]}>
                  <ThemedText style={styles.webSidebarBrandTitle}>Knightly</ThemedText>
                  <View style={styles.webSidebarGoldDot} />
                </Animated.View>

                {/* Collapse Sidebar Button Preview */}
                <Animated.View
                  style={[
                    styles.webSidebarCollapseToggle,
                    headerDetailsAnimatedStyle,
                  ]}>
                  <Icon 
                    sf={isCollapsedLocally ? 'pin' : 'sidebar.left'} 
                    md={isCollapsedLocally ? 'push_pin' : 'menu_open'} 
                    size={17} 
                    color="rgba(255, 255, 255, 0.85)" 
                  />
                </Animated.View>
              </View>

              <Animated.View style={headerDetailsAnimatedStyle}>
                <ThemedText style={styles.webSidebarMastheadTagline}>
                  CALVIN UNIVERSITY
                </ThemedText>
              </Animated.View>
            </View>
          </View>
        ) : (
          /* Mobile AppHeader Shrinking Container */
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shrinkingHeaderContent,
              { paddingTop: headerPaddingTop },
            ]}>
            <View style={styles.headerInner}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerTitleGroup}>
                  {/* Perfect native text fades in instantly at the end of flight, preventing subpixel blur */}
                  <Animated.View
                    ref={headerTargetRef}
                    onLayout={measurePositions}
                    style={[styles.headerWordmarkRow, targetWordmarkAnimatedStyle]}>
                    <ThemedText type="title" style={styles.headerTitleText}>
                      Knightly
                    </ThemedText>
                    <View style={styles.headerGoldDot} />
                  </Animated.View>

                  {/* Header Subtitle */}
                  <Animated.View style={headerDetailsAnimatedStyle}>
                    <ThemedText type="caption" style={styles.headerSubtitleText}>
                      CAMPUS COMMUNITY & FEED
                    </ThemedText>
                  </Animated.View>
                </View>

                {/* Header Avatar */}
                <Animated.View style={[styles.headerAvatar, headerDetailsAnimatedStyle]}>
                  <ThemedText type="smallBold" style={styles.headerAvatarText}>
                    {activeInitials}
                  </ThemedText>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* 2. Login Form Screen: Sits unclipped on top of maroonContainer */}
      <View style={styles.formContainer}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            style={styles.keyboardView}
            {...(Platform.OS === 'web' ? ({ 'data-no-auto-scroll': 'true' } as any) : {})}>
            <ScrollView
              ref={scrollViewRef}
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              removeClippedSubviews={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {/* Form Main: Vertically and horizontally centered on ANY screen, raises smoothly when keyboard appears */}
              <Animated.View style={[styles.formMain, formRaiseAnimatedStyle]}>
                {/* Branding Header */}
                <View style={styles.brandHeader}>
                  {/* Shield Icon: Fades out on sign in */}
                  <Animated.View style={formFadeAnimatedStyle}>
                    <View style={styles.shieldWrap}>
                      <Icon sf="sparkles" md="auto_awesome" size={30} color={Brand.gold} />
                    </View>
                  </Animated.View>

                  {/* Single continuous Knightly wordmark: Starts in the natural Flexbox center */}
                  <Animated.View
                    ref={heroWordmarkRef}
                    onLayout={measurePositions}
                    style={[styles.brandRow, wordmarkAnimatedStyle]}>
                    <ThemedText style={styles.brandTitle}>Knightly</ThemedText>
                    <View style={styles.brandDot} />
                  </Animated.View>

                  {/* Calvin University & Sign-In Prompt: Fade out on sign in */}
                  <Animated.View style={formFadeAnimatedStyle}>
                    <ThemedText style={styles.brandSubtitle}>CALVIN UNIVERSITY</ThemedText>
                    <ThemedText style={styles.signInPrompt}>
                      Sign in with your Calvin Account
                    </ThemedText>
                  </Animated.View>
                </View>

                {/* Form Fields: Fade out on sign in */}
                <Animated.View style={[styles.fields, formFadeAnimatedStyle]}>
                  {/* Calvin Username or Email Single Line */}
                  <View style={styles.fieldWrap}>
                    <TextInput
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      onFocus={() => {
                        setUserFocused(true);
                        if (Platform.OS === 'android') {
                          raiseForm(250);
                        }
                      }}
                      onBlur={() => setUserFocused(false)}
                      cursorColor={Brand.gold}
                      selectionColor={Brand.gold}
                      placeholder="Calvin username or email"
                      placeholderTextColor="rgba(255, 255, 255, 0.55)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      style={[
                        styles.singleLineInput,
                        userFocused && styles.singleLineInputFocused,
                      ]}
                    />
                  </View>

                  {/* Password Single Line */}
                  <View style={styles.fieldWrap}>
                    <View style={styles.passwordRow}>
                      <TextInput
                        value={displayPassword}
                        onChangeText={handlePasswordChange}
                        onFocus={() => {
                          setPassFocused(true);
                          if (Platform.OS === 'web' || Platform.OS === 'android') {
                            raiseForm(250);
                          }
                        }}
                        onBlur={() => {
                          setPassFocused(false);
                          if (Platform.OS === 'web' && !isKeyboardOpenRef.current) {
                            lowerForm(250);
                          }
                        }}
                        cursorColor={Brand.gold}
                        selectionColor={Brand.gold}
                        placeholder="Password"
                        placeholderTextColor="rgba(255, 255, 255, 0.55)"
                        secureTextEntry={false}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        returnKeyType="go"
                        onSubmitEditing={handleSignIn}
                        style={[
                          styles.singleLineInput,
                          styles.passwordInput,
                          passFocused && styles.singleLineInputFocused,
                        ]}
                      />
                      <Pressable
                        onPress={toggleShowPassword}
                        hitSlop={12}
                        style={styles.eyeButton}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                        <Icon
                          sf={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                          md={showPassword ? 'visibility_off' : 'visibility'}
                          size={20}
                          color="rgba(255, 255, 255, 0.75)"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Error Message */}
                  {errorMessage ? (
                    <View style={styles.errorContainer}>
                      <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                    </View>
                  ) : null}

                  {/* Gold Sign-In Button */}
                  <Pressable
                    onPress={handleSignIn}
                    disabled={!canSubmit || isTransitioning}
                    focusable={false}
                    accessibilityRole="button"
                    accessibilityLabel="Sign In"
                    style={({ pressed }) => [
                      styles.goldButton,
                      !canSubmit && styles.goldButtonDisabled,
                      pressed && canSubmit && styles.goldButtonPressed,
                    ]}>
                    <ThemedText style={styles.goldButtonText}>Sign In</ThemedText>
                  </Pressable>

                  {/* Quick Fill Demo Helper */}
                  <Pressable
                    onPress={fillDemoCredentials}
                    focusable={false}
                    style={({ pressed }) => [
                      styles.demoButton,
                      pressed && { opacity: 0.7 },
                    ]}>
                    <ThemedText style={styles.demoButtonText}>
                      Use John Mark Doe demo account
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              </Animated.View>

              {/* Footer pinned closer to the bottom without displacing the centered form */}
              <Animated.View
                style={[
                  styles.footer,
                  { bottom: Math.max(insets.bottom + Spacing.two, Spacing.four) },
                  formFadeAnimatedStyle,
                ]}>
                <ThemedText style={styles.footerText}>
                  Calvin University · Grand Rapids, Michigan
                </ThemedText>
              </Animated.View>

              {/* Version watermark pinned to bottom right corner */}
              <Animated.View
                style={[
                  styles.versionContainer,
                  {
                    bottom: Math.max(insets.bottom + Spacing.two, Spacing.four),
                    right: Math.max(insets.right + Spacing.three, Spacing.four),
                  },
                  formFadeAnimatedStyle,
                ]}
                pointerEvents="none">
                <ThemedText style={styles.versionText}>{APP_VERSION}</ThemedText>
              </Animated.View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  maroonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.maroon,
    overflow: 'hidden',
  },
  webTargetMeasurementAnchor: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 270,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1,
  },
  webSidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 270,
    borderRadius: 20,
    borderWidth: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
  webSidebarMasthead: {
    backgroundColor: Brand.maroon,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three + 2,
    paddingBottom: Spacing.three,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    gap: 4,
    borderBottomWidth: 0,
    shadowColor: Brand.maroonDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  webSidebarMastheadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webSidebarCollapseToggle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  webSidebarWordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  webSidebarBrandTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  webSidebarGoldDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    backgroundColor: Brand.gold,
    marginBottom: 4,
  },
  webSidebarMastheadTagline: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  shrinkingHeaderContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  headerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flexShrink: 1,
    gap: 2,
    position: 'relative',
  },
  headerWordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerGoldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.gold,
    marginBottom: 6,
  },
  headerSubtitleText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerAvatarText: {
    color: '#FFFFFF',
  },
  formContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
  },
  keyboardView: {
    flex: 1,
    overflow: 'visible',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    minHeight: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  formMain: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  shieldWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(243, 205, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(243, 205, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  brandTitle: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Brand.gold,
    marginBottom: 7,
  },
  brandSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    color: Brand.gold,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  signInPrompt: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: Spacing.one + 2,
    textAlign: 'center',
  },
  fields: {
    width: '100%',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  fieldWrap: {
    width: '100%',
  },
  singleLineInput: {
    borderWidth: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 0,
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: 0,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  singleLineInputFocused: {
    borderBottomColor: Brand.gold,
    borderBottomWidth: 1.5,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  errorContainer: {
    marginTop: -Spacing.two,
  },
  errorText: {
    color: '#FFB4B4',
    fontSize: 13,
    fontWeight: '500',
  },
  goldButton: {
    backgroundColor: Brand.gold,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    overflow: 'hidden',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  goldButtonDisabled: {
    opacity: 0.45,
  },
  goldButtonPressed: {
    backgroundColor: Brand.goldDark,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  goldButtonText: {
    fontFamily: Fonts.sans,
    color: '#450F18',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  demoButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  demoButtonText: {
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.3,
  },
  versionContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  versionText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
  },
});
