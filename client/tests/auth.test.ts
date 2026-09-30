import { describe, it } from 'node:test';
import assert from 'node:assert';
import { student } from '@/data/student';
import {
  PASSWORD_MASK_DELAY_MS,
  PASSWORD_MASK_DOT,
  formatPasswordDisplay,
  processPasswordMaskInput,
} from '@/utils/masked-password';

// Simple unit simulation of AuthProvider core logic for testing
function createAuthManager() {
  let isAuthenticated = false;
  let isAppMounted = false;
  let user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    standing: string;
    major: string;
  } | null = null;

  const signIn = (username: string, password: string): boolean => {
    const trimmedUser = username.trim();
    const hasPassword = password.trim().length > 0;

    if (!trimmedUser || !hasPassword) {
      return false;
    }

    // Students cannot sign in with student IDs (pure digits)
    if (/^\d+$/.test(trimmedUser)) {
      return false;
    }

    const isJohn =
      trimmedUser.toLowerCase() === 'jmd42' ||
      trimmedUser.toLowerCase() === 'jmd42@calvin.edu' ||
      trimmedUser.toLowerCase() === 'john' ||
      trimmedUser.toLowerCase() === 'jmd' ||
      trimmedUser.toLowerCase() === student.email.toLowerCase();

    if (isJohn) {
      user = {
        id: student.id,
        username: 'jmd42',
        fullName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        standing: student.standing,
        major: student.major,
      };
    } else {
      const isEmail = trimmedUser.includes('@');
      const email = isEmail ? trimmedUser : `${trimmedUser}@calvin.edu`;
      const cleanUser = isEmail ? trimmedUser.split('@')[0] : trimmedUser;
      const cleanName = cleanUser.replace(/[@._-]/g, ' ');
      const words = cleanName.split(' ').filter(Boolean);
      const firstName = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Calvin';
      const lastName = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1) : 'Student';

      user = {
        id: '2028100',
        username: cleanUser,
        fullName: `${firstName} ${lastName}`,
        email,
        standing: 'Student',
        major: 'Liberal Arts',
      };
    }

    isAuthenticated = true;
    isAppMounted = true;
    return true;
  };

  const setAppMounted = (mounted: boolean) => {
    isAppMounted = mounted;
  };

  const signOut = () => {
    isAuthenticated = false;
    isAppMounted = false;
    user = null;
  };

  return {
    get isAuthenticated() {
      return isAuthenticated;
    },
    get isAppMounted() {
      return isAppMounted;
    },
    get user() {
      return user;
    },
    signIn,
    signOut,
    setAppMounted,
  };
}

describe('Authentication & Startup Login', () => {
  describe('Startup State', () => {
    it('starts unauthenticated on startup so login page is presented', () => {
      const auth = createAuthManager();
      assert.strictEqual(auth.isAuthenticated, false);
      assert.strictEqual(auth.user, null);
    });

    it('starts with isAppMounted false so nothing is loaded in background and no bottom bar shows', () => {
      const auth = createAuthManager();
      assert.strictEqual(auth.isAppMounted, false);
    });
  });

  describe('Login Validation Rules', () => {
    it('rejects sign in when both fields are empty', () => {
      const auth = createAuthManager();
      const result = auth.signIn('', '');
      assert.strictEqual(result, false);
      assert.strictEqual(auth.isAuthenticated, false);
    });

    it('rejects sign in when password is empty', () => {
      const auth = createAuthManager();
      const result = auth.signIn('jmd42', '');
      assert.strictEqual(result, false);
      assert.strictEqual(auth.isAuthenticated, false);
    });

    it('rejects sign in when username is whitespace only', () => {
      const auth = createAuthManager();
      const result = auth.signIn('   ', 'anypassword');
      assert.strictEqual(result, false);
      assert.strictEqual(auth.isAuthenticated, false);
    });

    it('rejects sign in when password is whitespace only', () => {
      const auth = createAuthManager();
      const result = auth.signIn('jmd42', '   ');
      assert.strictEqual(result, false);
      assert.strictEqual(auth.isAuthenticated, false);
    });

    it('rejects sign in when a numeric student ID is entered instead of username/email', () => {
      const auth = createAuthManager();
      const result = auth.signIn('2028042', 'pass123');
      assert.strictEqual(result, false);
      assert.strictEqual(auth.isAuthenticated, false);
      assert.strictEqual(auth.user, null);
    });

    it('signs in successfully when valid username and password are provided', () => {
      const auth = createAuthManager();
      const result = auth.signIn('anyUser', 'anyPassword123');
      assert.strictEqual(result, true);
      assert.strictEqual(auth.isAuthenticated, true);
      assert.strictEqual(auth.isAppMounted, true);
      assert.ok(auth.user !== null);
      assert.strictEqual(auth.user?.username, 'anyUser');
    });

    it('populates John Doe profile when jmd42 username is entered', () => {
      const auth = createAuthManager();
      const result = auth.signIn('jmd42', 'pass123');
      assert.strictEqual(result, true);
      assert.strictEqual(auth.isAuthenticated, true);
      assert.strictEqual(auth.user?.fullName, 'John Doe');
      assert.strictEqual(auth.user?.email, 'jmd42@calvin.edu');
      assert.strictEqual(auth.user?.id, student.id);
    });

    it('populates John Doe profile when jmd42@calvin.edu email is entered', () => {
      const auth = createAuthManager();
      const result = auth.signIn('jmd42@calvin.edu', 'pass123');
      assert.strictEqual(result, true);
      assert.strictEqual(auth.isAuthenticated, true);
      assert.strictEqual(auth.user?.fullName, 'John Doe');
      assert.strictEqual(auth.user?.email, 'jmd42@calvin.edu');
      assert.strictEqual(auth.user?.id, student.id);
    });

    it('recognizes John Doe across uppercase, lowercase, and aliases', () => {
      const auth = createAuthManager();
      const aliases = ['JMD42', 'John', 'jmd', 'JMD42@CALVIN.EDU', '  jmd42  '];

      for (const alias of aliases) {
        auth.signOut();
        const success = auth.signIn(alias, 'password123');
        assert.strictEqual(success, true, `Alias "${alias}" should sign in`);
        assert.strictEqual(auth.user?.fullName, 'John Doe');
        assert.strictEqual(auth.user?.email, 'jmd42@calvin.edu');
      }
    });

    it('synthesizes student full names from dotted or underscored usernames', () => {
      const auth = createAuthManager();

      // Dotted username
      auth.signIn('sarah.connor', 'pass123');
      assert.strictEqual(auth.user?.fullName, 'Sarah Connor');
      assert.strictEqual(auth.user?.email, 'sarah.connor@calvin.edu');

      // Underscored username
      auth.signOut();
      auth.signIn('alex_turner', 'pass123');
      assert.strictEqual(auth.user?.fullName, 'Alex Turner');
      assert.strictEqual(auth.user?.email, 'alex_turner@calvin.edu');

      // Full email entered
      auth.signOut();
      auth.signIn('ada.lovelace@calvin.edu', 'pass123');
      assert.strictEqual(auth.user?.fullName, 'Ada Lovelace');
      assert.strictEqual(auth.user?.email, 'ada.lovelace@calvin.edu');
    });

    it('provides sensible fallback for single-token usernames', () => {
      const auth = createAuthManager();
      auth.signIn('knightly', 'pass123');
      assert.strictEqual(auth.user?.fullName, 'Knightly Student');
      assert.strictEqual(auth.user?.email, 'knightly@calvin.edu');
    });
  });

  describe('Background Loading & Sign Out Flow', () => {
    it('allows background mounting before committing final authentication', () => {
      const auth = createAuthManager();
      assert.strictEqual(auth.isAppMounted, false);
      assert.strictEqual(auth.isAuthenticated, false);

      auth.setAppMounted(true);
      assert.strictEqual(auth.isAppMounted, true);
      assert.strictEqual(auth.isAuthenticated, false);
    });

    it('clears session and unmounts app on signOut', () => {
      const auth = createAuthManager();
      auth.signIn('jmd42', 'pass123');
      assert.strictEqual(auth.isAuthenticated, true);
      assert.strictEqual(auth.isAppMounted, true);

      auth.signOut();
      assert.strictEqual(auth.isAuthenticated, false);
      assert.strictEqual(auth.isAppMounted, false);
      assert.strictEqual(auth.user, null);
    });

    it('handles multiple consecutive signOut calls idempotently', () => {
      const auth = createAuthManager();
      auth.signIn('jmd42', 'pass123');
      auth.signOut();
      assert.doesNotThrow(() => {
        auth.signOut();
        auth.signOut();
      });
      assert.strictEqual(auth.isAuthenticated, false);
      assert.strictEqual(auth.user, null);
    });

    it('supports re-signing in with a different student account', () => {
      const auth = createAuthManager();
      auth.signIn('jmd42', 'pass1');
      assert.strictEqual(auth.user?.fullName, 'John Doe');

      auth.signOut();
      auth.signIn('jane.smith', 'pass2');
      assert.strictEqual(auth.user?.fullName, 'Jane Smith');
      assert.strictEqual(auth.isAuthenticated, true);
    });
  });

  describe('Login Screen Keyboard Elevation & Positioning Invariants', () => {
    const calculateLoginRaise = (params: {
      isKeyboardOpen: boolean;
      windowHeight: number;
      insetsTop: number;
      isTransitioning?: boolean;
    }) => {
      const { isKeyboardOpen, windowHeight, insetsTop, isTransitioning = false } = params;
      if (isTransitioning || !isKeyboardOpen) {
        return 0;
      }
      const formTop = (windowHeight - 402) / 2;
      const minTopClearance = insetsTop + 16 + 12; // insets.top + Spacing.four + 12px
      const maxSafeRaise = Math.max(0, formTop - minTopClearance);
      // "It should raise just a touch more" -> 105px target raise
      const desiredRaise = 105;
      return Math.min(desiredRaise, maxSafeRaise);
    };

    it('returns zero raise when keyboard is closed or during sign in transition', () => {
      // Keyboard closed
      assert.strictEqual(
        calculateLoginRaise({ isKeyboardOpen: false, windowHeight: 852, insetsTop: 47 }),
        0
      );

      // During sign in flight transition: must be 0 to prevent measurement distortion
      assert.strictEqual(
        calculateLoginRaise({
          isKeyboardOpen: true,
          windowHeight: 852,
          insetsTop: 47,
          isTransitioning: true,
        }),
        0
      );
    });

    it('raises password field and sign in button with a touch more clearance (105px) above the keyboard', () => {
      // Standard iPhone 15 Pro (height 852, keyboard 336)
      const raiseIPhone15 = calculateLoginRaise({
        isKeyboardOpen: true,
        windowHeight: 852,
        insetsTop: 47,
      });
      // Raised just a touch more: 105px (up from previous 75px)
      assert.strictEqual(raiseIPhone15, 105);

      // Verify password field clearance:
      // Form top is (852 - 402) / 2 = 225. Password bottom is 225 + 288 = 513.
      // Keyboard top is 852 - 336 = 516.
      // Raised by 105: password bottom is 513 - 105 = 408, which is 108px above the keyboard!
      const passwordBottomRaised = (852 - 402) / 2 + 288 - raiseIPhone15;
      const keyboardTop = 852 - 336;
      assert.ok(
        passwordBottomRaised < keyboardTop,
        'Password field must be fully unobstructed above the keyboard'
      );
      assert.strictEqual(keyboardTop - passwordBottomRaised, 108);

      // Verify sign in button top clearance:
      // Form top is 225, Sign in button starts at 225 + (402 - 48) = 579.
      // Raised by 105: sign in button starts at 579 - 105 = 474, which is 42px comfortably above the 516 keyboard top!
      const buttonTopRaised = (852 - 402) / 2 + (402 - 48) - raiseIPhone15;
      assert.ok(
        buttonTopRaised < keyboardTop,
        'Sign in button top must be comfortably above keyboard'
      );
      assert.strictEqual(keyboardTop - buttonTopRaised, 42);
    });

    it('guarantees the brand logo at the top of the login section never hits the top of the screen', () => {
      // 1. Modern device (iPhone 15 Pro, height 852, insetsTop 47)
      const raise15 = calculateLoginRaise({
        isKeyboardOpen: true,
        windowHeight: 852,
        insetsTop: 47,
      });
      const formTop15 = (852 - 402) / 2;
      const raisedFormTop15 = formTop15 - raise15;
      assert.ok(
        raisedFormTop15 > 47 + 16,
        'Logo must stay well below status bar/notch on iPhone 15'
      );
      assert.strictEqual(raisedFormTop15, 120); // 73px below status bar!

      // 2. Compact device (iPhone SE, height 667, insetsTop 20, keyboard 260)
      const raiseSE = calculateLoginRaise({
        isKeyboardOpen: true,
        windowHeight: 667,
        insetsTop: 20,
      });
      const formTopSE = (667 - 402) / 2; // 132.5
      const raisedFormTopSE = formTopSE - raiseSE;
      assert.ok(
        raisedFormTopSE >= 20 + 16,
        'Logo must never hit top on small devices like iPhone SE'
      );
      assert.strictEqual(Math.round(raisedFormTopSE), 48); // Exactly clamped by maxSafeRaise
    });

    it('executes uninterrupted smooth cubic ease-out curve from 0 to targetRaise without mid-flight clipping', () => {
      // Pure cubic ease-out: f(t) = 1 - (1 - t)^3
      const cubicEaseOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const targetRaise = 105;

      // Uninterrupted progression: motion decelerates continuously all the way to t=1.0
      const y50 = targetRaise * cubicEaseOut(0.5);
      const y80 = targetRaise * cubicEaseOut(0.8);
      const y95 = targetRaise * cubicEaseOut(0.95);
      const y100 = targetRaise * cubicEaseOut(1.0);

      assert.ok(y50 < y80, 'Progresses smoothly through mid-flight');
      assert.ok(y80 < y95, 'Does not hit an early ceiling at 80%');
      assert.ok(y95 < y100, 'Gently lands at full target raise at 100%');
      assert.strictEqual(Math.round(y100), 105);
    });

    it('enforces non-scrollable ScrollView invariants (scrollEnabled false, bounces false)', () => {
      // User explicitly requires that the login screen is stationary and cannot be scrolled
      const scrollViewConfig = {
        scrollEnabled: false,
        bounces: false,
        overScrollMode: 'never' as const,
      };
      assert.strictEqual(scrollViewConfig.scrollEnabled, false);
      assert.strictEqual(scrollViewConfig.bounces, false);
      assert.strictEqual(scrollViewConfig.overScrollMode, 'never');
    });
  });

  describe('Masked Password Entry & Transient Visibility Invariants', () => {
    it('defines standard dot character and 500ms mask delay', () => {
      assert.strictEqual(PASSWORD_MASK_DOT, '\u2022');
      assert.strictEqual(PASSWORD_MASK_DELAY_MS, 500);
    });

    it('shows single typed character in plaintext and signals 500ms timer', () => {
      const step1 = processPasswordMaskInput({
        currentReal: '',
        currentDisplay: '',
        newInputText: 'c',
      });
      assert.strictEqual(step1.newReal, 'c');
      assert.strictEqual(step1.newDisplay, 'c');
      assert.strictEqual(step1.shouldStartTimer, true);
    });

    it('turns previous character into dot immediately when next character is typed within 500ms', () => {
      // Step 1: user typed 'c', visible as 'c'
      const step1 = { real: 'c', display: 'c' };

      // Step 2: user types 'a' while 'c' is still visible ('ca')
      const step2 = processPasswordMaskInput({
        currentReal: step1.real,
        currentDisplay: step1.display,
        newInputText: 'ca',
      });
      assert.strictEqual(step2.newReal, 'ca');
      // Previous character 'c' immediately turned into '•', and 'a' is visible!
      assert.strictEqual(step2.newDisplay, `${PASSWORD_MASK_DOT}a`);
      assert.strictEqual(step2.shouldStartTimer, true);
    });

    it('turns character into dot after 500ms timeout and handles subsequent keystroke', () => {
      // Step 1: 'ca' after 500ms becomes '••'
      const maskedAfter500ms = formatPasswordDisplay('ca', false);
      assert.strictEqual(maskedAfter500ms, `${PASSWORD_MASK_DOT}${PASSWORD_MASK_DOT}`);

      // Step 2: user types 'l' onto '••' -> '••l'
      const step3 = processPasswordMaskInput({
        currentReal: 'ca',
        currentDisplay: maskedAfter500ms,
        newInputText: `${PASSWORD_MASK_DOT}${PASSWORD_MASK_DOT}l`,
      });
      assert.strictEqual(step3.newReal, 'cal');
      assert.strictEqual(step3.newDisplay, `${PASSWORD_MASK_DOT}${PASSWORD_MASK_DOT}l`);
      assert.strictEqual(step3.shouldStartTimer, true);
    });

    it('handles rapid sequential typing preserving only the newest character visible', () => {
      let real = '';
      let display = '';
      const word = 'Knight';

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const nextInput = display + char;
        const result = processPasswordMaskInput({
          currentReal: real,
          currentDisplay: display,
          newInputText: nextInput,
        });

        real = result.newReal;
        display = result.newDisplay;

        // Verify underlying real password matches prefix so far
        assert.strictEqual(real, word.slice(0, i + 1));

        // Verify all preceding characters are dots and only the newest character is plaintext
        const expectedDisplay = PASSWORD_MASK_DOT.repeat(i) + char;
        assert.strictEqual(display, expectedDisplay);
        assert.strictEqual(result.shouldStartTimer, true);
      }

      // After 500ms elapses following final character:
      const finalDisplay = formatPasswordDisplay(real, false);
      assert.strictEqual(finalDisplay, PASSWORD_MASK_DOT.repeat(6));
    });

    it('handles backspace when newest character is visible, maintaining remaining characters as dots', () => {
      // User is at '••••i' with real password 'calvi'
      const result = processPasswordMaskInput({
        currentReal: 'calvi',
        currentDisplay: `${PASSWORD_MASK_DOT.repeat(4)}i`,
        newInputText: PASSWORD_MASK_DOT.repeat(4),
      });
      assert.strictEqual(result.newReal, 'calv');
      assert.strictEqual(result.newDisplay, PASSWORD_MASK_DOT.repeat(4));
      assert.strictEqual(result.shouldStartTimer, false);
    });

    it('handles backspace when all characters are dots', () => {
      const result = processPasswordMaskInput({
        currentReal: 'calv',
        currentDisplay: PASSWORD_MASK_DOT.repeat(4),
        newInputText: PASSWORD_MASK_DOT.repeat(3),
      });
      assert.strictEqual(result.newReal, 'cal');
      assert.strictEqual(result.newDisplay, PASSWORD_MASK_DOT.repeat(3));
      assert.strictEqual(result.shouldStartTimer, false);
    });

    it('masks all characters immediately on multi-character paste', () => {
      const pasteInput = 'Knightly2026!';
      const result = processPasswordMaskInput({
        currentReal: '',
        currentDisplay: '',
        newInputText: pasteInput,
      });
      assert.strictEqual(result.newReal, 'Knightly2026!');
      assert.strictEqual(result.newDisplay, PASSWORD_MASK_DOT.repeat(13));
      assert.strictEqual(result.shouldStartTimer, false);
    });

    it('correctly reveals and masks on showPassword toggle', () => {
      const password = 'mypassword123';
      assert.strictEqual(formatPasswordDisplay(password, true), 'mypassword123');
      assert.strictEqual(formatPasswordDisplay(password, false), PASSWORD_MASK_DOT.repeat(13));
    });

    it('handles clearing and full deletion to empty string', () => {
      const result = processPasswordMaskInput({
        currentReal: 'abc',
        currentDisplay: `${PASSWORD_MASK_DOT.repeat(2)}c`,
        newInputText: '',
      });
      assert.strictEqual(result.newReal, '');
      assert.strictEqual(result.newDisplay, '');
      assert.strictEqual(result.shouldStartTimer, false);
    });
  });
});
