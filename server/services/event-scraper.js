/**
 * Calvin University Events Scraper Service
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Ingests live campus events from Calvin's official web calendar (calvin.edu/events/all).
 * Rather than scraping single days or weeks that expire quickly, scraping /events/all
 * provides a continuous rolling chronological stream of upcoming campus events.
 *
 * SPRINT 1 SLO CONTEXT (SC2, VV12):
 * Operates as a server service with in-memory caching (30-minute TTL) to avoid hammering
 * Calvin's web servers, while serving normalized events to Knightly's client via REST API.
 */

const { classifyEvent } = require('./category-mapper');

/**
 * In-memory event cache structure.
 */
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Decodes standard HTML entities commonly found in Drupal markup.
 *
 * @param {string} str - Raw HTML string
 * @returns {string} Clean decoded string
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips HTML tags and decodes entities.
 *
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripTags(html) {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '));
}

/**
 * Normalizes protocol-relative and root-relative image URLs to absolute HTTPS URLs.
 *
 * @param {string|null} src - Raw image src from HTML
 * @returns {string|null} Normalized HTTPS URL
 */
function normalizeImageUrl(src) {
  if (!src) return null;
  const clean = src.trim();
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }
  if (clean.startsWith('/')) {
    return `https://calvin.edu${clean}`;
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://calvin.edu/${clean}`;
}

/**
 * Parses Drupal's `event-calendar` HTML into structured event objects.
 *
 * @param {string} html - Raw HTML from calvin.edu/events/all
 * @returns {Array<Object>} Parsed event objects
 */
function parseEventsHtml(html) {
  if (!html || typeof html !== 'string') return [];

  // Split content on Drupal event wrapper: `<div data-history-node-id="`
  const chunks = html.split(/<div\s+data-history-node-id="(\d+)"\s+class="([^"]*node--type-provus-event[^"]*)">/i);
  const events = [];

  for (let i = 1; i < chunks.length; i += 3) {
    const id = chunks[i];
    const content = chunks[i + 2];

    // 1. Extract Title and Detail Link
    let title = '';
    let detailUrl = '';
    const titleMatch = content.match(/<h4[^>]*class="[^"]*event-calendar__title[^"]*"[^>]*>([\s\S]*?)<\/h4>/i);
    if (titleMatch) {
      const aMatch = titleMatch[1].match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (aMatch) {
        detailUrl = aMatch[1].startsWith('http') ? aMatch[1] : `https://calvin.edu${aMatch[1]}`;
        title = stripTags(aMatch[2]);
      } else {
        title = stripTags(titleMatch[1]);
      }
    }

    // 2. Extract Event Date
    let date = '';
    const dateMatch = content.match(/<div\s+class="event-calendar__date">([\s\S]*?)<\/div>/i);
    if (dateMatch) {
      date = stripTags(dateMatch[1]);
    }

    // 3. Extract Time
    let time = '';
    const timeMatch = content.match(/<div\s+class="event-calendar__date-location__date">([\s\S]*?)<\/div>/i);
    if (timeMatch) {
      time = stripTags(timeMatch[1]);
    }

    // 4. Extract Location
    let location = '';
    const locMatch = content.match(/<div\s+class="event-calendar__date-location__location">([\s\S]*?)<\/div>/i);
    if (locMatch) {
      location = stripTags(locMatch[1]);
    }

    // 5. Extract Summary Description
    let summary = '';
    const sumMatch = content.match(/<div\s+class="event-calendar__summary">([\s\S]*?)<\/div>/i);
    if (sumMatch) {
      summary = stripTags(sumMatch[1]);
    }

    // 6. Extract Hero Image
    let imageUrl = null;
    const imgMatch = content.match(/<div\s+class="event-calendar__image"[\s\S]*?<img[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      imageUrl = normalizeImageUrl(imgMatch[1]);
    }

    // Only include valid events with a non-empty title
    if (title && title.length > 0) {
      const category = classifyEvent({ title, summary, location });

      events.push({
        id: `calvin-${id}`,
        nodeId: id,
        title,
        date,
        time,
        location: location || 'Calvin Campus',
        summary,
        description: summary || title,
        imageUrl,
        detailUrl,
        category,
        org: 'Calvin University',
        clubId: 'calvin-university',
        campusWide: true,
      });
    }
  }

  return events;
}

/**
 * Scrapes upcoming Calvin University events from calvin.edu/events/all.
 *
 * @param {Object} options - Scraping options
 * @param {number} [options.pages=3] - Number of pagination pages to fetch (10 events/page)
 * @param {boolean} [options.forceRefresh=false] - Force cache bypass
 * @returns {Promise<Array<Object>>} Array of parsed events
 */
async function scrapeEvents({ pages = 3, forceRefresh = false } = {}) {
  const now = Date.now();

  // Return cached events if still fresh and not forcing refresh
  if (!forceRefresh && cachedEvents && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedEvents;
  }

  const pageIndices = Array.from({ length: Math.max(1, Math.min(pages, 10)) }, (_, i) => i);
  const urls = pageIndices.map((i) => `https://calvin.edu/events/all?page=${i}`);

  try {
    // Fetch all pages in parallel
    const responses = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return '';
          return await res.text();
        } catch {
          return '';
        }
      })
    );

    // Parse each page's HTML
    const allParsed = [];
    const seenNodeIds = new Set();

    for (const html of responses) {
      if (!html) continue;
      const pageEvents = parseEventsHtml(html);
      for (const ev of pageEvents) {
        if (!seenNodeIds.has(ev.nodeId)) {
          seenNodeIds.add(ev.nodeId);
          allParsed.push(ev);
        }
      }
    }

    if (allParsed.length > 0) {
      cachedEvents = allParsed;
      lastFetchTime = now;
      return allParsed;
    }

    // Fallback to cache if available
    return cachedEvents || [];
  } catch {
    return cachedEvents || [];
  }
}

module.exports = {
  scrapeEvents,
  parseEventsHtml,
  decodeHtmlEntities,
  stripTags,
  normalizeImageUrl,
};
