/**
 * Campus Clubs & Leadership Claims API Client Service
 *
 * ARCHITECTURAL RATIONALE:
 * Provides client interface to server endpoints for club directory queries,
 * cryptographic claim code verification, and club follow persistence.
 *
 * OFFLINE RESILIENCE & SPRINT 1 SLO (SC2):
 * Knightly must NEVER crash when the backend server is offline or unavailable.
 * All network calls are wrapped in try/catch with 2.5-second abort timeouts,
 * falling back gracefully to isolated seed datasets (`CALVIN_CLUBS` and `checkClubCode`).
 */

import { CALVIN_CLUBS, type Club } from '@/data/clubs';
import { checkClubCode } from '@/data/club-codes';
import { API_BASE_URL } from '@/services/api-config';
import { DEFAULT_FOLLOWED_CLUB_IDS } from '@/context/club-follow-context';

export interface FetchClubsFilters {
  category?: string;
  search?: string;
}

export interface ClaimClubApiResult {
  success: boolean;
  clubId?: string;
  error?: string;
  message?: string;
}

/**
 * Fetches the registered clubs directory from the server/Supabase.
 * Falls back cleanly to CALVIN_CLUBS if backend is unreachable.
 *
 * @param filters - Optional category or search filter
 * @returns Array of Club objects
 */
export async function fetchClubsApi(filters: FetchClubsFilters = {}): Promise<Club[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const queryParams = new URLSearchParams();
    if (filters.category && filters.category.toLowerCase() !== 'all') {
      queryParams.set('category', filters.category);
    }
    if (filters.search) {
      queryParams.set('search', filters.search);
    }

    const url = `${API_BASE_URL}/clubs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Merge with client visual assets (icons, colors)
        return data.map((club) => {
          const matched = CALVIN_CLUBS.find((c) => c.id === club.id);
          return {
            ...matched,
            ...club,

            description: club.description ?? matched?.description ?? '',
            colors: club.colors || matched?.colors || ['#8C2131', '#E8B019'],
            sf: club.sf || matched?.sf || 'sparkles',
            md: club.md || matched?.md || 'auto_awesome',
          };
        });
      }
    }
  } catch {
    // Offline or network error: fall back to isolated client seed
  }

  // ISOLATED HARDCODED FALLBACK (Required by Sprint 1 SLO SC2)
  let result = CALVIN_CLUBS;
  if (filters.category && filters.category.toLowerCase() !== 'all') {
    result = result.filter(
      (c) => c.category.toLowerCase() === filters.category?.toLowerCase()
    );
  }
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||

        c.description.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * Redeems a club leadership claim code via backend verification.
 * Falls back to local verification when server is offline.
 *
 * @param params.rawCode - Raw 10-character code
 * @param params.studentId - Student UUID
 * @param params.targetClubId - Target club slug ID
 * @returns Verification result
 */
export async function claimClubApi(params: {
  rawCode: string;
  studentId: string;
  targetClubId?: string;
}): Promise<ClaimClubApiResult> {
  const { rawCode, studentId, targetClubId } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API_BASE_URL}/clubs/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawCode, studentId, targetClubId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        clubId: data.clubId,
        message: data.message,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || 'Claim code verification failed',
      };
    }
  } catch {
    // Fall back to local checkCode verification when offline
  }

  const localCheck = checkClubCode(rawCode);
  if (!localCheck.valid) {
    return {
      success: false,
      error: localCheck.error,
    };
  }

  return {
    success: true,
    clubId: localCheck.record.clubId,
    message: `Claimed ${localCheck.record.clubName} (offline mode)`,
  };
}

/**
 * Fetches followed club IDs for a student from the backend.
 *
 * @param studentId - Student UUID
 * @returns Array of followed club IDs
 */
export async function fetchFollowedClubsApi(studentId: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `${API_BASE_URL}/clubs/follows?studentId=${encodeURIComponent(studentId)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Offline fallback
  }

  return DEFAULT_FOLLOWED_CLUB_IDS;
}

/**
 * Persists club follow relationship to the backend.
 *
 * @param studentId - Student UUID
 * @param clubId - Club slug ID
 * @returns True if successfully persisted
 */
export async function followClubApi(studentId: string, clubId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${API_BASE_URL}/clubs/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, clubId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Removes club follow relationship from the backend.
 *
 * @param studentId - Student UUID
 * @param clubId - Club slug ID
 * @returns True if successfully removed
 */
export async function unfollowClubApi(studentId: string, clubId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${API_BASE_URL}/clubs/follow`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, clubId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    return res.ok;
  } catch {
    return false;
  }
}
