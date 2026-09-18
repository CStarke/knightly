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
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export const DEFAULT_FOLLOWED_CLUB_IDS: string[] = [
  'acm',
  'calvin-theatre',
  'knights-athletics',
  'campus-ministries',
  'outdoor-rec',
  'jazz-collective',
  'student-activities',
];

type ClubFollowContextType = {
  followedClubIds: Set<string>;
  isFollowing: (clubId: string) => boolean;
  followClub: (clubId: string) => void;
  unfollowClub: (clubId: string) => void;
  toggleFollow: (clubId: string) => void;
  followedCount: number;
};

const ClubFollowContext = createContext<ClubFollowContextType | null>(null);

export function ClubFollowProvider({
  children,
  initialFollowed = DEFAULT_FOLLOWED_CLUB_IDS,
}: PropsWithChildren<{ initialFollowed?: string[] }>) {
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    () => new Set(initialFollowed)
  );

  const isFollowing = useCallback(
    (clubId: string) => {
      return followedIds.has(clubId.toLowerCase());
    },
    [followedIds]
  );

  const followClub = useCallback((clubId: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.add(clubId.toLowerCase());
      return next;
    });
  }, []);

  const unfollowClub = useCallback((clubId: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.delete(clubId.toLowerCase());
      return next;
    });
  }, []);

  const toggleFollow = useCallback((clubId: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      const key = clubId.toLowerCase();
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

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

const defaultFallback: ClubFollowContextType = {
  followedClubIds: new Set(DEFAULT_FOLLOWED_CLUB_IDS),
  isFollowing: (clubId: string) =>
    DEFAULT_FOLLOWED_CLUB_IDS.includes(clubId.toLowerCase()),
  followClub: () => {},
  unfollowClub: () => {},
  toggleFollow: () => {},
  followedCount: DEFAULT_FOLLOWED_CLUB_IDS.length,
};

export function useClubFollow() {
  const context = useContext(ClubFollowContext);
  return context ?? defaultFallback;
}
