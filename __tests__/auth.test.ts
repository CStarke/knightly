import { describe, it } from 'node:test';
import assert from 'node:assert';
import { student } from '@/data/student';

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
});
