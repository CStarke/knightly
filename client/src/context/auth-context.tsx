import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { student } from '@/data/student';

export type AuthUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  standing: string;
  major: string;
  classYear: number;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  isAppMounted: boolean;
  user: AuthUser | null;
  signIn: (username: string, password: string) => boolean;
  signOut: () => void;
  setAppMounted: (mounted: boolean) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: PropsWithChildren) {
  // Prototype starts unauthenticated and with the main app unmounted on startup.
  // This guarantees the bottom bar and main app are completely unloaded until successful sign-in.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAppMounted, setIsAppMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const signIn = (username: string, password: string): boolean => {
    // Validates that both fields have input, regardless of their contents
    const trimmedUser = username.trim();
    const hasPassword = password.trim().length > 0;

    if (!trimmedUser || !hasPassword) {
      return false;
    }

    // Students cannot sign in with student IDs (pure digits)
    if (/^\d+$/.test(trimmedUser)) {
      return false;
    }

    // If John Mark Doe's demo username or email is used, or as default student fallback
    const isJohn =
      trimmedUser.toLowerCase() === 'jmd42' ||
      trimmedUser.toLowerCase() === 'jmd42@calvin.edu' ||
      trimmedUser.toLowerCase() === 'john' ||
      trimmedUser.toLowerCase() === 'jmd' ||
      trimmedUser.toLowerCase() === student.email.toLowerCase();

    if (isJohn) {
      setUser({
        id: student.id,
        username: 'jmd42',
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        standing: student.standing,
        major: student.major,
        classYear: student.classYear,
      });
    } else {
      // Derive a friendly user profile for any other prototype credentials
      const isEmail = trimmedUser.includes('@');
      const email = isEmail ? trimmedUser : `${trimmedUser}@calvin.edu`;
      const cleanUser = isEmail ? trimmedUser.split('@')[0] : trimmedUser;
      const cleanName = cleanUser.replace(/[@._-]/g, ' ');
      const words = cleanName.split(' ').filter(Boolean);
      const firstName = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Calvin';
      const lastName = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1) : 'Student';

      setUser({
        id: '2028' + Math.floor(100 + Math.random() * 900),
        username: cleanUser,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        standing: 'Student',
        major: 'Liberal Arts',
        classYear: 2028,
      });
    }

    setIsAuthenticated(true);
    setIsAppMounted(true);
    return true;
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setIsAppMounted(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAppMounted,
        user,
        signIn,
        signOut,
        setAppMounted: setIsAppMounted,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
