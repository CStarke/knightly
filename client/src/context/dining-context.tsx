/**
 * Campus Dining State & Refresh Coordination Context
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.3, 4.4, & US-N06):
 * Coordinates live dining operational data, student dining balances, and refresh cycles
 * between `KnightIdCardSection` (Digital ID card & balances) and `DiningHallsSection` (venues & hours).
 *
 * OFFLINE RESILIENCE & SPRINT 1 SLO (SC2):
 * Knightly must NEVER crash when the backend server is offline or unavailable.
 * All network queries gracefully fall back to isolated client seed data (`diningHalls`, `mealPlan`).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/context/auth-context';
import { diningHalls, hallStatus } from '@/data/dining';
import {
  fetchDiningSummaryApi,
  fetchDiningVenuesApi,
  getDefaultDiningSummary,
  type DiningSummary,
  type EnrichedDiningVenue,
} from '@/services/dining-api';

export type DiningContextType = {
  /** Real-time student dining summary containing swipe balances, flex meals, and dollars. */
  summary: DiningSummary;
  /** Real-time list of Calvin dining venues, operating statuses, and daily schedules. */
  venues: EnrichedDiningVenue[];
  /** Whether a pull-to-refresh or manual refresh operation is actively in flight. */
  isRefreshing: boolean;
  /** Triggers a simultaneous refresh of both dining balances and venue operational statuses. */
  refreshDining: () => Promise<void>;
  /** Timestamp when the dining summary and venue list were last refreshed. */
  lastUpdated: string | null;
};

const initialVenues: EnrichedDiningVenue[] = diningHalls.map((hall) => {
  const status = hallStatus(hall);
  return {
    id: hall.id,
    name: hall.name,
    location: hall.location,
    status: status.open ? 'Open' : 'Closed',
    currentMeal: status.label,
    hours: status.detail,
    acceptsSwipes: hall.acceptsSwipes,
  };
});

const defaultContextValue: DiningContextType = {
  summary: getDefaultDiningSummary(),
  venues: initialVenues,
  isRefreshing: false,
  refreshDining: async () => {},
  lastUpdated: null,
};

const DiningContext = createContext<DiningContextType>(defaultContextValue);

export function DiningProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const targetId = user?.studentId || user?.id;

  const [summary, setSummary] = useState<DiningSummary>(getDefaultDiningSummary);
  const [venues, setVenues] = useState<EnrichedDiningVenue[]>(initialVenues);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /**
   * Refreshes both student dining balances and venue operational windows in parallel.
   */
  const refreshDining = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [freshSummary, freshVenues] = await Promise.all([
        fetchDiningSummaryApi(targetId).catch(() => null),
        fetchDiningVenuesApi().catch(() => null),
      ]);

      if (freshSummary) {
        setSummary(freshSummary);
      }
      if (freshVenues && freshVenues.length > 0) {
        setVenues(freshVenues);
      }
      setLastUpdated(new Date().toISOString());
    } catch {
      // Swallowed gracefully per Sprint 1 SLO SC2
    } finally {
      setIsRefreshing(false);
    }
  }, [targetId]);

  // Initial mount synchronization
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchDiningSummaryApi(targetId).catch(() => null),
      fetchDiningVenuesApi().catch(() => null),
    ]).then(([freshSummary, freshVenues]) => {
      if (!mounted) return;
      if (freshSummary) {
        setSummary(freshSummary);
      }
      if (freshVenues && freshVenues.length > 0) {
        setVenues(freshVenues);
      }
      setLastUpdated(new Date().toISOString());
    });

    return () => {
      mounted = false;
    };
  }, [targetId]);

  const value = useMemo(
    () => ({
      summary,
      venues,
      isRefreshing,
      refreshDining,
      lastUpdated,
    }),
    [summary, venues, isRefreshing, refreshDining, lastUpdated]
  );

  return <DiningContext.Provider value={value}>{children}</DiningContext.Provider>;
}

/**
 * Custom hook to consume coordinated dining state and refresh actions.
 */
export function useDining(): DiningContextType {
  const context = useContext(DiningContext);
  return context || defaultContextValue;
}
