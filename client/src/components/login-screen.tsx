/**
 * Login Screen Orchestrator Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Lightweight, modular screen orchestrator managing user credentials,
 * authentication dispatch, and composing subcomponents (AGENTS.md Rule 4.3):
 * - `useLoginFlight`: Encapsulates Reanimated shared values, layout tracking, and flight curves.
 * - `LoginFlightContainer`: Maroon background morphing into desktop sidebar or mobile AppHeader.
 * - `LoginFormFields`: Interactive inputs, masked password logic, and submit buttons.
 * - `LoginFooter`: Campus location notice and version watermark.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginFlightContainer } from '@/components/login-flight-container';
import { LoginFooter } from '@/components/login-footer';
import { LoginFormFields } from '@/components/login-form-fields';
import { SmartAppBanner, isSmartAppBannerDismissed } from '@/components/smart-app-banner';
import { useAuth } from '@/context/auth-context';
import { student } from '@/data/student';
import { useLoginFlight } from '@/hooks/use-login-flight';
import {
  PASSWORD_MASK_DELAY_MS,
  PASSWORD_MASK_DOT,
  formatPasswordDisplay,
  processPasswordMaskInput,
} from '@/utils/masked-password';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, user, setAppMounted } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayPassword, setDisplayPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const maskTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isBannerDismissed, setIsBannerDismissed] = useState(() => isSmartAppBannerDismissed());
  const [isCollapsedLocally] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem('knightly_sidebar_collapsed') === 'true';
      } catch {}
    }
    return false;
  });

  const [activeInitials, setActiveInitials] = useState(() => {
    const fn = user?.firstName ?? student.firstName;
    const ln = user?.lastName ?? student.lastName;
    return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || 'JD';
  });

  const isBannerVisible = Platform.OS === 'web' && !isBannerDismissed;
  const flight = useLoginFlight({ isBannerVisible });

  // Clean up password mask timer on unmount
  useEffect(() => {
    return () => {
      if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
    };
  }, []);

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
    [displayPassword, errorMessage, password, showPassword]
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

  const fillDemoCredentials = () => {
    setUsername('jmd42');
    setPassword('calvin2028');
    setDisplayPassword(formatPasswordDisplay('calvin2028', showPassword));
    setErrorMessage('');
  };

  const handleSignIn = () => {
    if (isTransitioning || flight.isTransitioningRef.current) return;

    const submittedUser = username.trim();
    const submittedPass = password.trim();

    if (!submittedUser || !submittedPass) {
      setErrorMessage('Please enter both your Calvin username/email and password.');
      return;
    }

    if (/^\d+$/.test(submittedUser)) {
      setErrorMessage(
        'Student ID sign-in is not supported. Please use your Calvin username (e.g. jmd42) or email.'
      );
      return;
    }

    Keyboard.dismiss();
    setErrorMessage('');
    setIsTransitioning(true);

    // Compute initials for header avatar
    const lowerUser = submittedUser.toLowerCase();
    const isJohn = ['jmd42', 'jmd42@calvin.edu', 'john', 'jmd', student.email.toLowerCase()].includes(lowerUser);
    if (isJohn) {
      setActiveInitials('JD');
    } else {
      const cleanUser = submittedUser.includes('@') ? submittedUser.split('@')[0] : submittedUser;
      const words = cleanUser.replace(/[@._-]/g, ' ').split(' ').filter(Boolean);
      const fn = words[0] ? words[0].charAt(0).toUpperCase() : 'C';
      const ln = words[1] ? words[1].charAt(0).toUpperCase() : 'S';
      setActiveInitials(`${fn}${ln}`);
    }

    // Mount background app during form fade-out to prevent CPU contention during flight
    setAppMounted(true);

    flight.startFlight(() => {
      signIn(submittedUser, submittedPass);
    });
  };

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  return (
    <Animated.View
      style={[styles.rootOverlay, flight.rootOverlayStyle]}
      pointerEvents={isTransitioning ? 'none' : 'auto'}
    >
      {/* Smart App Banner on mobile web */}
      {flight.isWeb && !flight.isDesktopWeb && !isBannerDismissed ? (
        <SmartAppBanner onDismiss={() => setIsBannerDismissed(true)} />
      ) : null}

      {/* 1. Maroon Background Container & Morphing Masthead */}
      <LoginFlightContainer
        isDesktopWeb={flight.isDesktopWeb}
        headerPaddingTop={flight.headerPaddingTop}
        activeInitials={activeInitials}
        isCollapsedLocally={isCollapsedLocally}
        headerTargetRef={flight.headerTargetRef}
        mastheadHeight={flight.mastheadHeight}
        measurePositions={flight.measurePositions}
        maroonContainerStyle={flight.maroonContainerStyle}
        targetWordmarkStyle={flight.targetWordmarkStyle}
        headerDetailsStyle={flight.headerDetailsStyle}
      />

      {/* 2. Login Form & Hero View */}
      <View style={[styles.formContainer, flight.bannerOffset > 0 && { top: flight.bannerOffset }]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            style={styles.keyboardView}
            {...(Platform.OS === 'web' ? ({ 'data-no-auto-scroll': 'true' } as any) : {})}
          >
            <ScrollView
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              removeClippedSubviews={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <LoginFormFields
                heroWordmarkRef={flight.heroWordmarkRef}
                measurePositions={flight.measurePositions}
                flyingWordmarkStyle={flight.flyingWordmarkStyle}
                formFadeStyle={flight.formFadeStyle}
                formRaiseStyle={flight.formRaiseStyle}
                username={username}
                onChangeUsername={(text) => {
                  setUsername(text);
                  if (errorMessage) setErrorMessage('');
                }}
                displayPassword={displayPassword}
                showPassword={showPassword}
                onChangePassword={handlePasswordChange}
                onToggleShowPassword={toggleShowPassword}
                errorMessage={errorMessage}
                canSubmit={canSubmit}
                isTransitioning={isTransitioning}
                onSubmit={handleSignIn}
                onFillDemo={fillDemoCredentials}
                onRaiseForm={flight.raiseForm}
                onLowerForm={flight.lowerForm}
              />

              <LoginFooter
                formFadeStyle={flight.formFadeStyle}
                bottomInset={insets.bottom}
                rightInset={insets.right}
              />
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
  formContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: '100%',
  },
});
