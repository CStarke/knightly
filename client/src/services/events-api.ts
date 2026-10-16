/**
 * Calvin Events API Client Service
 *
 * SPRINT 1 SLO CONTEXT (SC2):
 * "Update the client to retrieve data from the server, instead of using the hard-coded data.
 * (Don't remove the logic/code that provided the hard-coded data -- just comment it out or isolate it
 * so it isn't used by default.)"
 *
 * This service attempts to retrieve live scraped campus events from the REST API endpoint
 * (`GET /api/events`), and gracefully falls back to `CALVIN_EVENTS_SEED` when offline or
 * when running the mobile client without the local backend server active.
 */

import { CALVIN_EVENTS_SEED, type ScrapedCalvinEvent } from '@/data/calvin-events-seed';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import type { Post } from '@/data/feed';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Fetches campus events from the server REST API or resolves from isolated seed data.
 *
 * @param pages - Number of pages to retrieve (default: 3)
 * @returns Array of Post objects adapted from events
 */
export async function fetchCampusEvents(pages: number = 3): Promise<Post[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const res = await fetch(`${API_BASE_URL}/events?pages=${pages}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: ScrapedCalvinEvent[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((e, idx) => adaptCalvinEventToPost(e, Date.now() - idx * 3600 * 1000));
      }
    }
  } catch {
    // Backend server unavailable or offline: fall back cleanly to isolated seed data
  }

  // ISOLATED HARDCODED FALLBACK (Required by Sprint 1 SLO SC2)
  return CALVIN_EVENTS_SEED.map((e, idx) =>
    adaptCalvinEventToPost(e, Date.now() - idx * 3600 * 1000)
  );
}
