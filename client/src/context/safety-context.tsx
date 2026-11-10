/**
 * Campus Safety State & Refresh Coordination Context
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.3, 4.4, & US-N06):
 * Coordinates live campus safety advisories, emergency dispatch directory contacts,
 * and refresh cycles between `SafetyAlertsSection` and `SafetyNumbersSection`.
 *
 * OFFLINE RESILIENCE & SPRINT 1 SLO (SC2):
 * Knightly must NEVER crash when the backend server is offline or unavailable.
 * All network queries gracefully fall back to isolated client seed datasets (`safetyAlerts`, `emergencyContacts`).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { emergencyContacts, safetyAlerts, type EmergencyContact, type SafetyAlert } from '@/data/safety';
import { fetchSafetyAlertsApi, fetchSafetyContactsApi } from '@/services/safety-api';

export type SafetyContextType = {
  /** Real-time active safety advisories and weather alerts stream. */
  alerts: SafetyAlert[];
  /** Essential campus emergency numbers and department contacts. */
  contacts: EmergencyContact[];
  /** Whether a pull-to-refresh or manual refresh operation is actively in flight. */
  isRefreshing: boolean;
  /** Triggers a simultaneous refresh of both campus safety alerts and emergency contacts. */
  refreshSafety: () => Promise<void>;
  /** Timestamp when the safety advisories and contacts were last refreshed. */
  lastUpdated: string | null;
};

const defaultContextValue: SafetyContextType = {
  alerts: safetyAlerts,
  contacts: emergencyContacts,
  isRefreshing: false,
  refreshSafety: async () => {},
  lastUpdated: null,
};

const SafetyContext = createContext<SafetyContextType>(defaultContextValue);

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<SafetyAlert[]>(safetyAlerts);
  const [contacts, setContacts] = useState<EmergencyContact[]>(emergencyContacts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /**
   * Refreshes both active safety alerts and emergency directory contacts in parallel.
   */
  const refreshSafety = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [freshAlerts, freshContacts] = await Promise.all([
        fetchSafetyAlertsApi().catch(() => safetyAlerts),
        fetchSafetyContactsApi().catch(() => emergencyContacts),
      ]);

      if (freshAlerts && freshAlerts.length > 0) {
        setAlerts(freshAlerts);
      }
      if (freshContacts && freshContacts.length > 0) {
        setContacts(freshContacts);
      }
      setLastUpdated(new Date().toISOString());
    } catch {
      // Swallowed gracefully per Sprint 1 SLO SC2
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial mount synchronization
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchSafetyAlertsApi().catch(() => safetyAlerts),
      fetchSafetyContactsApi().catch(() => emergencyContacts),
    ]).then(([freshAlerts, freshContacts]) => {
      if (!mounted) return;
      if (freshAlerts && freshAlerts.length > 0) {
        setAlerts(freshAlerts);
      }
      if (freshContacts && freshContacts.length > 0) {
        setContacts(freshContacts);
      }
      setLastUpdated(new Date().toISOString());
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      alerts,
      contacts,
      isRefreshing,
      refreshSafety,
      lastUpdated,
    }),
    [alerts, contacts, isRefreshing, refreshSafety, lastUpdated]
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

/**
 * Custom hook to consume coordinated safety state and refresh actions.
 */
export function useSafety(): SafetyContextType {
  const context = useContext(SafetyContext);
  return context || defaultContextValue;
}
