import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import type { DirectoryVisibleFields } from '@/components/directory-onboarding-modal';
import { student } from '@/data/student';
import {
  fetchStudentProfile,
  updateDirectoryPreferenceApi,
} from '@/services/student-api';

export type AuthUser = {
  id: string;
  studentId?: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  standing: string;
  major: string;
  minor?: string;
  classYear: number;
  cardNumber?: string;
  barcode?: string;
  residence?: string;
  advisor?: string;
  directoryOptIn?: boolean;
  directoryPrompted?: boolean;
  directoryVisibleFields?: DirectoryVisibleFields;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  isAppMounted: boolean;
  user: AuthUser | null;
  signIn: (username: string, password: string) => boolean;
  signOut: () => void;
  setAppMounted: (mounted: boolean) => void;
  showDirectoryPrompt: boolean;
  dismissDirectoryPrompt: () => void;
  updateDirectoryPreferences: (
    directoryOptIn: boolean,
    directoryVisibleFields: DirectoryVisibleFields
  ) => Promise<boolean>;
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
  const [showDirectoryPrompt, setShowDirectoryPrompt] = useState(false);

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

    // Derive provisional user profile for instant 60fps first-frame transition
    const isEmail = trimmedUser.includes('@');
    const email = isEmail ? trimmedUser : `${trimmedUser}@calvin.edu`;
    const cleanUser = isEmail ? trimmedUser.split('@')[0] : trimmedUser;
    const cleanName = cleanUser.replace(/[@._-]/g, ' ');
    const words = cleanName.split(' ').filter(Boolean);
    const firstName = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Calvin';
    const lastName = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1) : 'Student';

    // Derive stable provisional 7-digit student ID from username hash (e.g. 24XXXXX)
    let hash = 0;
    const lowerUser = cleanUser.toLowerCase();
    for (let i = 0; i < lowerUser.length; i++) {
      hash = (hash << 5) - hash + lowerUser.charCodeAt(i);
      hash |= 0;
    }
    const suffix = String(Math.abs(hash % 90000) + 10000).padStart(5, '0');
    const provisionalId = `24${suffix}`;

    setUser({
      id: provisionalId,
      studentId: provisionalId,
      username: cleanUser.toLowerCase(),
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      standing: 'Student',
      major: 'Liberal Arts',
      classYear: 2028,
      cardNumber: provisionalId,
      barcode: `00000${provisionalId}00`,
      directoryOptIn: false,
      directoryPrompted: false,
      directoryVisibleFields: { email: true, phone: false, residence: false },
    });

    setIsAuthenticated(true);
    setIsAppMounted(true);

    // Asynchronously synchronize student profile and FERPA preferences with backend (database-authoritative)
    fetchStudentProfile(trimmedUser)
      .then((profile) => {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            id: profile.id || prev.id,
            studentId: profile.studentId || prev.studentId,
            firstName: profile.firstName || prev.firstName,
            middleName: profile.middleName,
            lastName: profile.lastName || prev.lastName,
            fullName: profile.fullName || prev.fullName,
            email: profile.email || prev.email,
            barcode: profile.barcode || prev.barcode,
            cardNumber: profile.cardNumber || prev.cardNumber,
            standing: profile.standing || prev.standing,
            major: profile.major || prev.major,
            minor: profile.minor || prev.minor,
            residence: profile.residence || prev.residence,
            advisor: profile.advisor || prev.advisor,
            directoryOptIn: profile.directoryOptIn,
            directoryPrompted: profile.directoryPrompted,
            directoryVisibleFields: profile.directoryVisibleFields,
          };
        });

        // If student has not yet confirmed FERPA directory preferences, present dialog
        if (!profile.directoryPrompted) {
          setShowDirectoryPrompt(true);
        }
      })
      .catch(() => {
        // Safe offline resilience
      });

    return true;
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setIsAppMounted(false);
    setUser(null);
    setShowDirectoryPrompt(false);
  };

  const updateDirectoryPreferences = async (
    directoryOptIn: boolean,
    directoryVisibleFields: DirectoryVisibleFields
  ): Promise<boolean> => {
    // Optimistically update local user state
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        directoryOptIn,
        directoryPrompted: true,
        directoryVisibleFields,
      };
    });
    setShowDirectoryPrompt(false);

    try {
      const studentId = user?.id || user?.studentId || student.id;
      await updateDirectoryPreferenceApi({
        studentId,
        directoryOptIn,
        directoryVisibleFields,
      });
    } catch {
      // Safe offline fallback
    }

    return true;
  };

  const dismissDirectoryPrompt = () => {
    setShowDirectoryPrompt(false);
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
        showDirectoryPrompt,
        dismissDirectoryPrompt,
        updateDirectoryPreferences,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
