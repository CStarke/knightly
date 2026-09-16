import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
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
import { useAuth } from '@/context/auth-context';
import { student } from '@/data/student';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const screenHeight =
    Math.max(Dimensions.get('screen').height, windowHeight) + insets.bottom;

  const { signIn, user, setAppMounted } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [activeInitials, setActiveInitials] = useState(() => {
    const fn = user?.firstName ?? student.firstName;
    const ln = user?.lastName ?? student.lastName;
    return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || 'JD';
  });

  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Exact height of the AppHeader on the home page
  const targetHeaderHeight = getAppHeaderHeight(insets.top);
  const headerPaddingTop =
    Platform.OS === 'web' ? WebHeaderInset : insets.top + Spacing.one;

  const scrollViewRef = useRef<ScrollView>(null);
  const heroWordmarkRef = useRef<View>(null);
  const headerTargetRef = useRef<View>(null);

  const targetScale = 28 / 34;

  // Analytical fallbacks for initial frame before onLayout measurements
  const defaultHeaderX =
    (windowWidth > MaxContentWidth ? (windowWidth - MaxContentWidth) / 2 : 0) +
    Spacing.three;
  const defaultHeaderY = headerPaddingTop;

  const defaultHeroWidth = 136;
  const defaultHeroHeight = 42;

  // Form is optically centered in windowHeight
  const formMainTop = Math.max(headerPaddingTop + 30, (windowHeight - 402) / 2);
  const defaultHeroX = (windowWidth - defaultHeroWidth) / 2;
  const defaultHeroY = formMainTop + 74; // Below shield (58) + marginBottom (16)

  const defaultHeroCenterX = defaultHeroX + defaultHeroWidth / 2;
  const defaultHeroCenterY = defaultHeroY + defaultHeroHeight / 2;

  const defaultTargetCenterX = defaultHeaderX + (defaultHeroWidth * targetScale) / 2;
  const defaultTargetCenterY = defaultHeaderY + (defaultHeroHeight * targetScale) / 2;

  const initialDeltaX = defaultTargetCenterX - defaultHeroCenterX;
  const initialDeltaY = defaultTargetCenterY - defaultHeroCenterY;

  // Shared animation values
  const overlayOpacity = useSharedValue(1);
  const headerHeight = useSharedValue(screenHeight);
  const formOpacity = useSharedValue(1);
  const headerDetailsOpacity = useSharedValue(0);
  const wordmarkProgress = useSharedValue(0);

  // Distance from hero starting center to header destination center
  const deltaX = useSharedValue(initialDeltaX);
  const deltaY = useSharedValue(initialDeltaY);

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

  // Keep screen height and reset values in sync if screen rotates or user signs out
  useEffect(() => {
    if (!isTransitioning) {
      overlayOpacity.value = 1;
      headerHeight.value = screenHeight;
      formOpacity.value = 1;
      headerDetailsOpacity.value = 0;
      wordmarkProgress.value = 0;
      isTransitioningRef.current = false;
    }
  }, [
    screenHeight,
    isTransitioning,
    headerHeight,
    formOpacity,
    headerDetailsOpacity,
    wordmarkProgress,
    overlayOpacity,
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

    // Compute initials immediately for John Doe / demo or custom user
    const isJohn =
      submittedUser.toLowerCase() === 'jmd42' ||
      submittedUser.toLowerCase() === 'jmd42@calvin.edu' ||
      submittedUser.toLowerCase() === 'john' ||
      submittedUser.toLowerCase() === 'jmd' ||
      submittedUser.toLowerCase() === student.email.toLowerCase();

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

    // Symmetric ease-in-out curve for flight and shrink
    const smoothSlideCurve = Easing.bezier(0.42, 0, 0.25, 1);
    const ANIMATION_DURATION = 1250;

    const startFlightAnimation = () => {
      // Permanently freeze measurements so no layout shifts or late callbacks can touch delta
      isTransitioningRef.current = true;

      // Fade in the header subtitle and avatar
      headerDetailsOpacity.value = withDelay(
        420,
        withTiming(1, {
          duration: 750,
          easing: Easing.out(Easing.quad),
        })
      );

      // Wordmark glides from center hero position up to the top-left header corner
      wordmarkProgress.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: smoothSlideCurve,
      });

      // Cinematic shrink animation of the maroon container
      headerHeight.value = withTiming(
        targetHeaderHeight,
        {
          duration: ANIMATION_DURATION,
          easing: smoothSlideCurve,
        },
        (finished) => {
          if (finished) {
            // Once flight arrives at target, smoothly cross-fade overlay (150ms)
            // revealing the identical underlying AppHeader with 100% continuous visibility
            overlayOpacity.value = withTiming(
              0,
              {
                duration: 150,
                easing: Easing.linear,
              },
              (crossfadeDone) => {
                if (crossfadeDone) {
                  runOnJS(onTransitionComplete)(submittedUser, submittedPass);
                }
              }
            );
          }
        }
      );
    };

    const triggerFlightAfterFade = () => {
      // Re-measure now that the keyboard has fully dismissed and layout has settled,
      // while the wordmark is still 100% stationary.
      measurePositions();

      // Clean 100ms beat so the user distinctly perceives the clean fade completion
      // and any async measurements finish before flight begins.
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = setTimeout(() => {
        startFlightAnimation();
      }, 100);
    };

    // Phase 1: Smoothly fade out the rest of the sign in page completely
    const FADE_OUT_DURATION = 380;
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

  const fillDemoCredentials = () => {
    setUsername('jmd42');
    setPassword('calvin2028');
    setErrorMessage('');
  };

  // Animated styles
  const rootOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const maroonBackgroundStyle = useAnimatedStyle(() => ({
    height: headerHeight.value,
  }));

  const formFadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const headerDetailsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerDetailsOpacity.value,
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
      transform: [
        { translateX: dX * p },
        { translateY: dY * p },
        { scale: currentScale },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.rootOverlay, rootOverlayAnimatedStyle]}
      pointerEvents={isTransitioning ? 'none' : 'auto'}>
      {/* 1. Maroon Background Masthead Container: shrinks from screenHeight down to targetHeaderHeight */}
      <Animated.View style={[styles.maroonContainer, maroonBackgroundStyle]}>
        {/* Header Bar elements with invisible target anchor */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shrinkingHeaderContent,
            { paddingTop: headerPaddingTop },
          ]}>
          <View style={styles.headerInner}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerTitleGroup}>
                {/* Invisible target reference for measuring the header docking location */}
                <View
                  ref={headerTargetRef}
                  onLayout={measurePositions}
                  style={[styles.headerWordmarkRow, { opacity: 0 }]}>
                  <ThemedText type="title" style={styles.headerTitleText}>
                    Knightly
                  </ThemedText>
                  <View style={styles.headerGoldDot} />
                </View>

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
      </Animated.View>

      {/* 2. Login Form Screen: Sits unclipped on top of maroonContainer */}
      <View style={styles.formContainer}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}>
            <ScrollView
              ref={scrollViewRef}
              scrollEnabled={!isTransitioning}
              removeClippedSubviews={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {/* Form Main: Vertically and horizontally centered on ANY screen */}
              <View style={styles.formMain}>
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
                      onFocus={() => setUserFocused(true)}
                      onBlur={() => setUserFocused(false)}
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
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (errorMessage) setErrorMessage('');
                        }}
                        onFocus={() => setPassFocused(true)}
                        onBlur={() => setPassFocused(false)}
                        placeholder="Password"
                        placeholderTextColor="rgba(255, 255, 255, 0.55)"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleSignIn}
                        style={[
                          styles.singleLineInput,
                          styles.passwordInput,
                          passFocused && styles.singleLineInputFocused,
                        ]}
                      />
                      <Pressable
                        onPress={() => setShowPassword((prev: boolean) => !prev)}
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
                    style={({ pressed }) => [
                      styles.demoButton,
                      pressed && { opacity: 0.7 },
                    ]}>
                    <ThemedText style={styles.demoButtonText}>
                      Use John Mark Doe demo account
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              </View>

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
            </ScrollView>
          </KeyboardAvoidingView>
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
  },
  singleLineInputFocused: {
    borderBottomColor: Brand.gold,
    borderBottomWidth: 2,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  goldButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  goldButtonPressed: {
    opacity: 0.85,
    backgroundColor: Brand.goldDark,
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
});
