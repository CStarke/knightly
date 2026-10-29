/**
 * Club Follow State Context
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Following student organizations tailors the student's personal campus life experience:
 * 1. Filtered Feed: The "Following" segmented filter on the Home feed displays updates
 *    exclusively from organizations the student actively tracks.
 * 2. Campus Clubs Directory: Indicates which clubs the student is affiliated with.
 *
 * WHY Set<string> FOR FOLLOWED IDS:
 * In social feed lists containing dozens of rendered post cards, each card checks `isFollowing(clubId)`.
 * Using an array would result in repeated O(N) linear scans on every card render. A JavaScript `Set`
 * delivers guaranteed O(1) membership lookups, ensuring 60fps scrolling performance.
 *
 * WHY PRE-SEEDED DEFAULTS:
 * Empty state experiences increase cognitive friction for new students. Pre-seeding seven core
 * campus institutions (ACM, Athletics, Campus Ministries, Theatre, etc.) ensures the Home feed
 * is immediately engaging on first launch.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AuthContext } from '@/context/auth-context';
import {
  fetchFollowedClubsApi,
  followClubApi,
  unfollowClubApi,
} from '@/services/clubs-api';

export const DEFAULT_FOLLOWED_CLUB_IDS: string[] = [
  'acm',
  'calvin-theatre',
  'knights-athletics',
  'campus-ministries',
  'outdoor-rec',
  'jazz-collective',
  'student-activities',
];


function getFollowStorageKey(studentId: string): string {
  return `knightly_followed_club_ids_${studentId.toLowerCase()}`;
}

function loadLocalFollowedIds(studentId: string, defaults: string[]): Set<string> {
  const set = new Set(defaults.map((d) => d.toLowerCase()));
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(getFollowStorageKey(studentId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => set.add(String(id).toLowerCase()));
        }
      }
    } catch {}
  }
  return set;
}

function persistLocalFollowedIds(studentId: string, ids: Set<string>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        getFollowStorageKey(studentId),
        JSON.stringify(Array.from(ids))
      );
    } catch {}
  }
}

type ClubFollowContextType = {
  followedClubIds: Set<string>;
  isFollowing: (clubId: string) => boolean;
  followClub: (clubId: string) => void;
  unfollowClub: (clubId: string) => void;
  toggleFollow: (clubId: string) => void;
  followedCount: number;
};

const ClubFollowContext = createContext<ClubFollowContextType | null>(null);

/**
 * Provider component that maintains the student's followed club subscription Set.
 *
 * @param props.children - Child React node tree
 * @param props.initialFollowed - Optional seed array of club IDs (defaults to core campus institutions)
 */
export function ClubFollowProvider({
  children,
  initialFollowed = DEFAULT_FOLLOWED_CLUB_IDS,
}: PropsWithChildren<{ initialFollowed?: string[] }>) {
  const auth = useContext(AuthContext);
  const studentId = auth?.user?.id || auth?.user?.studentId || '';

  // Store club IDs in a Set for O(1) membership lookups across large feed lists
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    () => new Set(initialFollowed)
  );

  // SPRINT 1 SLO DIRECTIVE (SC2):
  // Synchronize followed clubs from the Supabase database in the background,
  // merging with initial seed state while keeping immediate synchronous render.
  useEffect(() => {
    if (!studentId) return;
    let mounted = true;
    fetchFollowedClubsApi(studentId).then((serverFollows) => {
      if (mounted && Array.isArray(serverFollows) && serverFollows.length > 0) {
        setFollowedIds((prev) => {
          const next = new Set(prev);
          serverFollows.forEach((id) => next.add(id.toLowerCase()));
          return next;
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, [studentId]);

  // Check if a club is currently followed (case-insensitive)
  const isFollowing = useCallback(
    (clubId: string) => {
      return followedIds.has(clubId.toLowerCase());
    },
    [followedIds]
  );

  // Add a club to the followed Set (lowercased for key consistency)
  const followClub = useCallback(
    (clubId: string) => {
      const lower = clubId.toLowerCase();
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.add(lower);
        return next;
      });
      followClubApi(studentId, lower);
    },
    [studentId]
  );

  // Remove a club from the followed Set
  const unfollowClub = useCallback(
    (clubId: string) => {
      const lower = clubId.toLowerCase();
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(lower);
        return next;
      });
      unfollowClubApi(studentId, lower);
    },
    [studentId]
  );

  // Toggle follow status (adds if missing, removes if present)
  const toggleFollow = useCallback(
    (clubId: string) => {
      const lower = clubId.toLowerCase();
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (next.has(lower)) {
          next.delete(lower);
          unfollowClubApi(studentId, lower);
        } else {
          next.add(lower);
          followClubApi(studentId, lower);
        }
        return next;
      });
    },
    [studentId]
  );

  const value = useMemo(
    () => ({
      followedClubIds: followedIds,
      isFollowing,
      followClub,
      unfollowClub,
      toggleFollow,
      followedCount: followedIds.size,
    }),
    [followedIds, isFollowing, followClub, unfollowClub, toggleFollow]
  );

  return (
    <ClubFollowContext.Provider value={value}>
      {children}
    </ClubFollowContext.Provider>
  );
}

/**
 * Fallback value used when components render outside of a ClubFollowProvider (e.g. isolated test harnesses).
 */
const defaultFallback: ClubFollowContextType = {
  followedClubIds: new Set(DEFAULT_FOLLOWED_CLUB_IDS),
  isFollowing: (clubId: string) =>
    DEFAULT_FOLLOWED_CLUB_IDS.includes(clubId.toLowerCase()),
  followClub: () => {},
  unfollowClub: () => {},
  toggleFollow: () => {},
  followedCount: DEFAULT_FOLLOWED_CLUB_IDS.length,
};

/**
 * React hook to access followed club states and toggle subscriptions.
 *
 * @returns The active ClubFollowContextType, or default fallback if unmounted outside provider
 */
export function useClubFollow() {
  const context = useContext(ClubFollowContext);
  return context ?? defaultFallback;
}
