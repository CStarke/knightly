/**
 * Club Leadership & Authorization Context
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly operates with role-based UI tiers:
 * - General Students: Browse events, search clubs, RSVP, follow organizations.
 * - Club Leaders: All general student privileges PLUS access to the 5th "Post" tab,
 *   publishing campus-wide flyers, and customizing club descriptions/schedules.
 *
 * WHY MULTI-CLUB LEADERSHIP:
 * At Calvin University, active student leaders frequently hold executive positions in multiple
 * student organizations simultaneously (e.g. President of Computer Science Club and Treasurer
 * of Engineering Society). This context is designed with a multi-club array (`linkedClubIds`)
 * rather than a single boolean or single club ID, and tracks an `activeClub` selector for the
 * Create Post composer.
 *
 * WHY USER-SCOPED STORAGE KEYING:
 * During development, testing, and multi-user device sharing, students switch accounts.
 * Storing claims under global keys like `knightly_linked_clubs` would leak claimed organizations
 * to other students logging in on the same browser/device. `getAccountStorageKey` namespaces all
 * persisted arrays by student ID / username.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CALVIN_CLUBS, type Club } from '@/data/clubs';
import { checkClubCode } from '@/data/club-codes';
import { useAuth, type AuthUser } from '@/context/auth-context';

export type ClaimModalSource = 'banner' | 'profile' | null;

/**
 * Builds a user-isolated storage key.
 *
 * WHY NAMESPACING:
 * Prevents account state cross-contamination when multiple users test or log in
 * on the same browser/device.
 */
export function getAccountStorageKey(
  user: { id?: string; username?: string } | null,
  prefix: string
): string {
  const accountId = user ? (user.username || user.id || 'default').toLowerCase() : 'guest';
  return `${prefix}${accountId}`;
}

/**
 * Loads user-scoped claim banner dismissal state.
 *
 * WHY PERSISTENT DISMISSAL:
 * Once a student dismisses the "Are you a club leader? Claim your club" banner chip
 * on the Campus Clubs tab, they should never be badgered with it again on subsequent visits.
 */
export function loadClaimBannerDismissed(
  user: { id?: string; username?: string } | null
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  if (!user) return false;
  const userKey = getAccountStorageKey(user, 'knightly_claim_banner_dismissed_');
  try {
    const userVal = window.localStorage.getItem(userKey);
    if (userVal !== null) {
      return userVal === 'true';
    }
    // Backward-compatibility fallback for John Doe (default demo user)
    const isJohn = user.username?.toLowerCase() === 'jmd42' || user.id === '2028420';
    if (isJohn) {
      return window.localStorage.getItem('knightly_claim_banner_dismissed') === 'true';
    }
    return false;
  } catch {
    return false;
  }
}

export type ClaimSetupState = {
  isOpen: boolean;
  code: string | null;
  source: ClaimModalSource;
};

type ClubLeadershipContextType = {
  /** Array of club IDs that the current student account leads. */
  linkedClubIds: string[];
  /** Full club objects that the current student account leads. */
  linkedClubs: Club[];
  /** Whether the user leads at least one club (enabling the center Post tab). */
  isLeader: boolean;
  /** Check if the current student is a leader of a specific club. */
  isLeaderOf: (clubId: string) => boolean;
  /** Currently active club selected for posting. */
  activeClub: Club | null;
  /** Select active club when leading multiple clubs. */
  setActiveClub: (club: Club) => void;
  /** Claim a club using a 10-digit code issued by Student Life. */
  claimClub: (
    code: string,
    initialDetails?: Partial<Club>
  ) => { success: boolean; error?: string; club?: Club };
  /** Update club profile details after claiming. */
  updateClubProfile: (clubId: string, details: Partial<Club>) => void;
  /** Reset / unlink a club (useful for demo & testing). */
  unlinkClub: (clubId: string) => void;
  /** State for the Claim Club modal. */
  isClaimModalOpen: boolean;
  /** The source that opened the claim modal ('banner' on campus clubs vs 'profile' from header avatar). */
  claimModalSource: ClaimModalSource;
  openClaimModal: (source?: 'banner' | 'profile') => void;
  closeClaimModal: () => void;
  /** Whether the user dismissed the claim club chip on campus clubs. */
  isClaimBannerDismissed: boolean;
  /** Dismiss the claim club chip on campus clubs forever. */
  dismissClaimBanner: () => void;
  /** Setup sub-page state following code verification */
  claimSetupState: ClaimSetupState;
  startClaimSetup: (code: string, source: ClaimModalSource) => void;
  cancelClaimSetup: () => void;
  completeClaimSetup: () => void;
};

const CLAIM_BANNER_DISMISSED_KEY = 'knightly_claim_banner_dismissed';

const ClubLeadershipContext = createContext<ClubLeadershipContextType | null>(null);

export function ClubLeadershipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Overridden club details in local memory (e.g. customized description, schedule)
  const [customClubDetails, setCustomClubDetails] = useState<Record<string, Partial<Club>>>({});
  // Set of linked club IDs for the active student account
  const [linkedClubIds, setLinkedClubIds] = useState<string[]>([]);
  // Active club for the posting screen
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  // Modal visibility and entry source
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimModalSource, setClaimModalSource] = useState<ClaimModalSource>(null);
  const [claimSetupState, setClaimSetupState] = useState<ClaimSetupState>({
    isOpen: false,
    code: null,
    source: null,
  });

  // Whether the user has dismissed the claim club banner on campus clubs (scoped to active account)
  const [isClaimBannerDismissed, setIsClaimBannerDismissed] = useState<boolean>(() =>
    loadClaimBannerDismissed(user)
  );

  // Sync state whenever the active student account changes (e.g. sign-in, switch account, sign-out)
  useEffect(() => {
    if (!user) {
      setIsClaimBannerDismissed(false);
      setLinkedClubIds([]);
      setActiveClubId(null);
      setClaimSetupState({ isOpen: false, code: null, source: null });
      return;
    }

    // 1. Sync banner dismissal status for this user
    setIsClaimBannerDismissed(loadClaimBannerDismissed(user));

    // 2. Sync linked clubs for this user from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const clubsKey = getAccountStorageKey(user, 'knightly_linked_clubs_');
        const savedClubs = window.localStorage.getItem(clubsKey);
        if (savedClubs) {
          const parsed = JSON.parse(savedClubs);
          if (Array.isArray(parsed)) {
            setLinkedClubIds(parsed);
            setActiveClubId(parsed[0] ?? null);
            return;
          }
        }
      } catch {}
    }

    setLinkedClubIds([]);
    setActiveClubId(null);
  }, [user?.username, user?.id]);

  const dismissClaimBanner = useCallback(() => {
    setIsClaimBannerDismissed(true);
    if (typeof window !== 'undefined' && window.localStorage && user) {
      try {
        const userKey = getAccountStorageKey(user, 'knightly_claim_banner_dismissed_');
        window.localStorage.setItem(userKey, 'true');
        const isJohn = user.username?.toLowerCase() === 'jmd42' || user.id === '2028420';
        if (isJohn) {
          window.localStorage.setItem(CLAIM_BANNER_DISMISSED_KEY, 'true');
        }
      } catch {}
    }
  }, [user]);

  // Resolved list of linked clubs
  // WHY OVERRIDE MERGING:
  // Baseline club directory data is statically defined in CALVIN_CLUBS. When a student leader
  // completes their club setup (customizing meeting time, description, or contact email),
  // those changes are kept in customClubDetails and merged over the static seed record.
  const linkedClubs = useMemo(() => {
    return linkedClubIds.map((id) => {
      const baseClub = CALVIN_CLUBS.find((c) => c.id === id) ?? {
        id,
        name: 'Unknown Club',
        category: 'Academics' as const,
        mark: 'UC',
        tagline: '',
        description: '',
        contactEmail: 'clubs@calvin.edu',
        colors: ['#0A2E36', '#14B8A6'] as [string, string],
        sf: 'person.2' as const,
        md: 'group' as const,
      };
      const overrides = customClubDetails[id] || {};
      return { ...baseClub, ...overrides };
    });
  }, [linkedClubIds, customClubDetails]);

  // Active club for the post composer.
  // WHY DEFAULT TO FIRST LINKED CLUB:
  // Ensures the Create Post composer immediately has a valid posting identity ready without
  // forcing the user through a picker modal every time they open the composer.
  const activeClub = useMemo(() => {
    if (!linkedClubs.length) return null;
    return linkedClubs.find((c) => c.id === activeClubId) ?? linkedClubs[0];
  }, [linkedClubs, activeClubId]);

  const isLeader = linkedClubIds.length > 0;

  const isLeaderOf = useCallback(
    (clubId: string) => linkedClubIds.includes(clubId),
    [linkedClubIds]
  );

  /**
   * Validates claim code and links the organization to the active student account.
   *
   * WHY IMMUTABLE ARRAY UPDATE + STORAGE SYNC:
   * Appending the new club ID to `linkedClubIds` immediately unlocks the 5th "Post" tab in the
   * bottom bar and switches `activeClubId` so the student can immediately start posting.
   */
  const claimClub = useCallback(
    (code: string, initialDetails?: Partial<Club>) => {
      const check = checkClubCode(code);
      if (!check.valid) {
        return {
          success: false,
          error: check.error,
        };
      }

      const record = check.record;
      const targetClubId = record.clubId;

      setLinkedClubIds((prev) => {
        if (prev.includes(targetClubId)) return prev;
        const next = [...prev, targetClubId];
        if (typeof window !== 'undefined' && window.localStorage && user) {
          try {
            const clubsKey = getAccountStorageKey(user, 'knightly_linked_clubs_');
            window.localStorage.setItem(clubsKey, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      if (initialDetails) {
        setCustomClubDetails((prev) => ({
          ...prev,
          [targetClubId]: {
            ...prev[targetClubId],
            ...initialDetails,
            leader: user?.fullName ? `${user.fullName} (Leader)` : 'Student Leader',
          },
        }));
      }

      setActiveClubId(targetClubId);

      const baseClub = CALVIN_CLUBS.find((c) => c.id === targetClubId);
      const fullClub = {
        ...(baseClub || {}),
        ...(initialDetails || {}),
        id: targetClubId,
        name: record.clubName,
      } as Club;

      return { success: true, club: fullClub };
    },
    [user]
  );

  const updateClubProfile = useCallback((clubId: string, details: Partial<Club>) => {
    setCustomClubDetails((prev) => ({
      ...prev,
      [clubId]: {
        ...prev[clubId],
        ...details,
      },
    }));
  }, []);

  const unlinkClub = useCallback((clubId: string) => {
    setLinkedClubIds((prev) => {
      const next = prev.filter((id) => id !== clubId);
      if (typeof window !== 'undefined' && window.localStorage && user) {
        try {
          const clubsKey = getAccountStorageKey(user, 'knightly_linked_clubs_');
          window.localStorage.setItem(clubsKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    setActiveClubId((prev) => (prev === clubId ? null : prev));
  }, [user]);

  const setActiveClub = useCallback((club: Club) => {
    setActiveClubId(club.id);
  }, []);

  const openClaimModal = useCallback((source: 'banner' | 'profile' = 'profile') => {
    setClaimModalSource(source);
    setIsClaimModalOpen(true);
  }, []);

  const closeClaimModal = useCallback(() => {
    setIsClaimModalOpen(false);
    setClaimModalSource(null);
  }, []);

  const startClaimSetup = useCallback((code: string, source: ClaimModalSource = 'profile') => {
    setClaimSetupState({
      isOpen: true,
      code,
      source,
    });
  }, []);

  const cancelClaimSetup = useCallback(() => {
    setClaimSetupState({
      isOpen: false,
      code: null,
      source: null,
    });
  }, []);

  const completeClaimSetup = useCallback(() => {
    setClaimSetupState({
      isOpen: false,
      code: null,
      source: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      linkedClubIds,
      linkedClubs,
      isLeader,
      isLeaderOf,
      activeClub,
      setActiveClub,
      claimClub,
      updateClubProfile,
      unlinkClub,
      isClaimModalOpen,
      claimModalSource,
      openClaimModal,
      closeClaimModal,
      isClaimBannerDismissed,
      dismissClaimBanner,
      claimSetupState,
      startClaimSetup,
      cancelClaimSetup,
      completeClaimSetup,
    }),
    [
      linkedClubIds,
      linkedClubs,
      isLeader,
      isLeaderOf,
      activeClub,
      setActiveClub,
      claimClub,
      updateClubProfile,
      unlinkClub,
      isClaimModalOpen,
      claimModalSource,
      openClaimModal,
      closeClaimModal,
      isClaimBannerDismissed,
      dismissClaimBanner,
      claimSetupState,
      startClaimSetup,
      cancelClaimSetup,
      completeClaimSetup,
    ]
  );

  return (
    <ClubLeadershipContext.Provider value={value}>
      {children}
    </ClubLeadershipContext.Provider>
  );
}

export function useClubLeadership() {
  const context = useContext(ClubLeadershipContext);
  if (!context) {
    throw new Error('useClubLeadership must be used within a ClubLeadershipProvider');
  }
  return context;
}
