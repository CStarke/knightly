/**
 * Feed & Events Business Logic Layer (BLL)
 *
 * ARCHITECTURAL RATIONALE:
 * Unifies student-authored club flyers and scraped Calvin Drupal events.
 *
 * DOMAIN INVARIANTS:
 * 1. Server-Authoritative Timestamps: Post timestamps are generated strictly server-side,
 *    preventing client clock manipulation or feed tampering.
 * 2. Standard 13-Category Taxonomy: Every post must resolve to one of the 13 valid categories.
 * 3. Scraper Idempotency: Drupal events are upserted using their unique external canonical URL
 *    or hash as `external_event_id` to prevent duplicate cards across sync intervals.
 * 4. Image Placeholder Immunity: Generic line-art placeholders are identified cryptographically
 *    and replaced with theme presets without altering genuine photos.
 */

const { KNIGHTLY_CATEGORIES, classifyEvent } = require('./category-mapper');
const { detectCalvinPlaceholder, resolveEventBanner } = require('./image-fingerprint');
const defaultPostsDal = require('../dal/posts-dal');
const { scrapeEvents } = require('./event-scraper');

/**
 * Validates and publishes a student-authored club post.
 * Enforces server-authoritative timestamps, overriding any client-provided dates.
 *
 * @param {object} postPayload - Post creation attributes from client
 * @param {string} [postPayload.headline] - Headline
 * @param {string} [postPayload.body] - Body text
 * @param {string} [postPayload.category] - Category
 * @param {string} [postPayload.orgName] - Club or organization name
 * @param {string} [postPayload.authorStudentId] - Author student UUID
 * @param {string} [postPayload.clubId] - Club slug ID
 * @param {object} [dal=defaultPostsDal] - Injected DAL
 * @returns {Promise<object>} Created post record
 */
async function publishPost(postPayload, dal = defaultPostsDal) {
  // Step 1: Validate required fields
  const headline = (postPayload.headline || '').trim();
  const body = (postPayload.body || '').trim();
  const orgName = (postPayload.orgName || '').trim();
  const authorStudentId = postPayload.authorStudentId || postPayload.author_student_id;

  if (!headline) {
    throw new Error('Post headline is required');
  }
  if (!body) {
    throw new Error('Post body is required');
  }
  if (!orgName) {
    throw new Error('Organization name is required');
  }
  // SECURITY REQUIREMENT: Posts must be tied directly to a verified student for admin tracking
  if (!authorStudentId) {
    throw new Error('Author student ID is required: all club posts must be linked to a specific student for administrative accountability');
  }

  // Step 2: Validate category against 13-category taxonomy
  let category = postPayload.category;
  if (!category || !KNIGHTLY_CATEGORIES.includes(category)) {
    // Attempt fallback mapping based on text content
    category = classifyEvent({
      title: headline,
      summary: body,
      organizer: orgName,
    });
  }

  // Step 3: Handle image / fallback banner
  let imageUrl = postPayload.imageUrl || null;
  let fallbackBannerSvg = postPayload.fallbackBannerSvg || null;

  if (imageUrl) {
    const placeholder = detectCalvinPlaceholder({ url: imageUrl });
    if (placeholder) {
      fallbackBannerSvg = resolveEventBanner({ imageUrl, category });
      imageUrl = null;
    }
  }

  // Step 4: Strict Server-Authoritative Timestamps
  // RATIONALE: We deliberately ignore any postPayload.postedAt or postPayload.createdAt
  // supplied by the client to prevent clock tampering feed manipulation.
  const serverNow = new Date();

  const createdPost = await dal.createPost({
    club_id: postPayload.clubId || postPayload.club_id || null,
    author_student_id: authorStudentId,
    org_name: orgName,
    mark: postPayload.mark || orgName.slice(0, 2).toUpperCase(),
    headline,
    body,
    category,
    event_date: postPayload.eventDate || null,
    start_time: postPayload.startTime || null,
    end_time: postPayload.endTime || null,
    when_text: postPayload.whenText || null,
    where_text: postPayload.whereText || null,
    image_url: imageUrl,
    fallback_banner_svg: fallbackBannerSvg,
    campus_wide: !!postPayload.campusWide,
    source: 'club',
    status: 'published',
    posted_at: serverNow.toISOString(),
    created_at_ms: serverNow.getTime(),
  });

  return createdPost;
}

/**
 * Synchronizes events from the Calvin Drupal scraper into the posts table.
 * Idempotently upserts matching `external_event_id` to prevent duplicates.
 *
 * @param {object} [options={}] - Scrape options
 * @param {number} [options.pages=3] - Page count
 * @param {boolean} [options.forceRefresh=false] - Bypass scraper memory cache
 * @param {Function} [scraperFn=scrapeEvents] - Scraper implementation
 * @param {object} [dal=defaultPostsDal] - Injected DAL
 * @returns {Promise<object>} Sync report
 */
async function syncScrapedEvents(options = {}, scraperFn = scrapeEvents, dal = defaultPostsDal) {
  // Support flexible argument order: syncScrapedEvents(options, dal) or syncScrapedEvents(options, scraperFn, dal)
  let effectiveScraper = scraperFn;
  let effectiveDal = dal;
  if (typeof scraperFn === 'object' && scraperFn !== null && typeof scraperFn.upsertScrapedEvent === 'function') {
    effectiveDal = scraperFn;
    effectiveScraper = scrapeEvents;
  }

  // Step 1: Scrape live events from calvin.edu/events/all
  const scrapedList = await effectiveScraper(options);

  let upsertedCount = 0;
  const errors = [];

  // Step 2: Ingest each event through classification & banner resolution
  for (const rawEvent of scrapedList) {
    try {
      const category = classifyEvent({
        title: rawEvent.title,
        summary: rawEvent.description,
        location: rawEvent.location,
        categoryHint: rawEvent.category,
      });

      const placeholder = detectCalvinPlaceholder({ url: rawEvent.imageUrl });
      const banner = resolveEventBanner({ imageUrl: rawEvent.imageUrl, category });

      const eventPayload = {
        orgName: rawEvent.organizer || 'Calvin Events',
        mark: 'CE',
        headline: rawEvent.title,
        body: rawEvent.description || '',
        category,
        eventDate: rawEvent.eventDate || null,
        startTime: rawEvent.startTime || null,
        endTime: rawEvent.endTime || null,
        whenText: rawEvent.when || null,
        whereText: rawEvent.location || null,
        imageUrl: placeholder ? null : rawEvent.imageUrl,
        fallbackBannerSvg: placeholder ? banner : null,
        externalEventId: rawEvent.id || rawEvent.url || `drupal-${encodeURIComponent(rawEvent.title)}`,
      };

      await effectiveDal.upsertScrapedEvent(eventPayload);
      upsertedCount++;
    } catch (err) {
      errors.push({ title: rawEvent.title, error: err.message });
    }
  }

  return {
    success: true,
    totalScraped: scrapedList.length,
    totalUpserted: upsertedCount,
    errors,
    syncedAt: new Date().toISOString(),
  };
}

module.exports = {
  KNIGHTLY_CATEGORIES,
  publishPost,
  syncScrapedEvents,
};
