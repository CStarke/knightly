/**
 * Campus Safety & Emergency Dispatch API Client Service
 *
 * ARCHITECTURAL RATIONALE (AGENTS.md Rule 4.4 & US-N06):
 * Provides the client interface for live campus emergency advisories, active weather alerts,
 * and emergency directory contacts (`/api/safety/*`).
 *
 * OFFLINE RESILIENCE & SPRINT 1 SLO (SC2):
 * Knightly must NEVER crash when the backend server is offline or unavailable.
 * Network queries are wrapped in strict try/catch with 2.5-second abort timeouts,
 * falling back gracefully to isolated client seed datasets (`safetyAlerts`, `emergencyContacts`).
 */

import { emergencyContacts, safetyAlerts, type EmergencyContact, type SafetyAlert } from '@/data/safety';
import { API_BASE_URL } from '@/services/api-config';
import { createTimedFetch } from '@/services/timed-fetch';

/**
 * Fetches active campus safety alerts and weather advisories from the backend REST API.
 * Falls back cleanly to isolated offline seed data if unreachable.
 *
 * @returns Array of active SafetyAlert records
 */
export async function fetchSafetyAlertsApi(): Promise<SafetyAlert[]> {
  try {
    const request = createTimedFetch(3000);
    const res = await request(`${API_BASE_URL}/safety/alerts`, {});
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((alert: any) => ({
          id: alert.id || String(alert.alert_id),
          severity: alert.severity || 'info',
          title: alert.title || alert.headline || 'Campus Advisory',
          detail: alert.detail || alert.body || '',
          at: alert.at || (alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Recently'),
          area: alert.area || 'All campus',
        }));
      }
    }
  } catch {
    // Offline resilience: backend offline / timeout, fallback to isolated seed data
  }

  return safetyAlerts;
}

/**
 * Fetches essential campus emergency contacts and university service dispatch numbers.
 * Falls back cleanly to isolated offline seed contacts if unreachable.
 *
 * @returns Array of EmergencyContact records
 */
export async function fetchSafetyContactsApi(): Promise<EmergencyContact[]> {
  try {
    const request = createTimedFetch(3000);
    const res = await request(`${API_BASE_URL}/safety/contacts`, {});
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id || String(c.contact_id),
          name: c.name || c.title || '',
          detail: c.detail || c.description || '',
          phone: c.phone || '',
          urgent: Boolean(c.urgent || c.is_emergency),
        }));
      }
    }
  } catch {
    // Offline resilience: backend offline / timeout, fallback to isolated seed data
  }

  return emergencyContacts;
}
