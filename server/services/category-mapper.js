/**
 * Calvin Event Category Mapper & Consolidation Engine
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Calvin University's Drupal CMS defines 151 granular taxonomy terms that mix academic
 * departments, student clubs, administrative offices, and campus buildings into a single dropdown.
 *
 * Knightly consolidates these into 13 high-level student life categories:
 * - Faith (merges Calvin, Campus Ministries, Chapel, LOFT, Jubilee, Worship, Prayer)
 * - Academics (merges all ~40 academic departments, lectures, Jellema, and Kinesiology)
 * - Athletics (varsity, club sports, MIAA/NCAA, intramurals)
 * - Music (choirs, bands, orchestra, recitals, concerts)
 * - The Arts (theatre, galleries, film, dance, Tartuffe, Calvin Theatre Company)
 * - Career (career fairs, internships, startup garage, accounting club)
 * - Social (student organizations, residence life, cookouts, kickoff events, movie knight)
 * - Culture (CISD, BSU, Bersama, international, multicultural)
 * - Outdoors (ecosystem preserve, nature preserve, earthkeepers, trails)
 * - Service (service-learning, volunteer workdays, community outreach)
 * - Wellness (Broene counseling, health services, active minds, de-stress)
 * - Gaming (esports, LAN parties, board games)
 * - Official (administrative announcements, presidential notices, campus notices)
 */

/**
 * Valid Knightly feed categories.
 */
const KNIGHTLY_CATEGORIES = [
  'Academics',
  'Athletics',
  'Career',
  'Culture',
  'Faith',
  'Gaming',
  'Music',
  'Official',
  'Outdoors',
  'Service',
  'Social',
  'The Arts',
  'Wellness',
];

/**
 * Domain-specific keyword and venue matching rules ordered by specificity.
 */
const CATEGORY_RULES = [
  // 1. Faith & Campus Ministries (Calvin + Campus Ministries + Chapel + Worship + Prayer)
  {
    category: 'Faith',
    keywords: [
      'chapel', 'campus ministries', 'loft', 'worship', 'prayer', 'scripture',
      'bible', 'ministry', 'ministries', 'hymn', 'sermon', 'church', 'christian',
      'faith', 'devotional', 'pastor', 'theological', 'seminary', 'gospel',
      'christ', 'jesus', 'communion', 'advent', 'lent', 'spiritual', 'reformed',
      'crc', 'ifi', 'young life', 'jubilee', 'congregational'
    ],
    locations: ['chapel sanctuary', 'chapel undercroft', 'prayer room', 'university chapel'],
  },

  // 2. Official / University Notices (Presidential addresses, commencement, registrar, campus safety)
  {
    category: 'Official',
    keywords: [
      'commencement', 'graduation', 'convocation', 'state of the university',
      'presidential', 'president', 'board of trustees', 'governance', 'campus safety',
      'registrar', 'financial aid', 'admissions deadline', 'weather alert',
      'campus closure', 'official announcement', 'accreditation'
    ],
    locations: [],
  },

  // 3. Music (Separated from The Arts per user directive)
  {
    category: 'Music',
    keywords: [
      'choir', 'concert', 'orchestra', 'recital', 'music', 'symphony', 'band',
      'jazz', 'hymnsing', 'vocal', 'instrumental', 'chorale', 'chamber', 'organ',
      'percussion', 'brass', 'woodwind', 'ensemble', 'soloist'
    ],
    locations: ['recital hall', 'cfac auditorium', 'rehearsal room'],
  },

  // 4. The Arts (Visual, theatre, film, dance)
  {
    category: 'The Arts',
    keywords: [
      'theatre', 'theater', 'play', 'gallery', 'exhibition', 'art', 'acting',
      'tartuffe', 'film', 'cinema', 'dance', 'musical', 'sculpture', 'painting',
      'exhibit', 'calvin theatre company', 'ctc', 'call gallery', 'swing dance'
    ],
    locations: ['gezon auditorium', 'center art gallery', 'black box theater'],
  },

  // 5. Athletics & Sports (Excludes Kinesiology per user directive)
  {
    category: 'Athletics',
    keywords: [
      'game', 'match', 'volleyball', 'soccer', 'basketball', 'cross country',
      'xc', 'tennis', 'lacrosse', 'athletics', 'knights', 'golf', 'swimming',
      'diving', 'track and field', 'baseball', 'softball', 'hockey', 'miaa',
      'ncaa', 'intramural', 'tournament', 'nationals', 'pre-nationals', 'varsity',
      'football'
    ],
    locations: ['van noord arena', 'spoelhof fieldhouse', 'gainey', 'zuidema soccer', 'zuidema field', 'pool'],
  },

  // 6. Academics (Includes Kinesiology, lectures, research, Jellema, colloquia)
  {
    category: 'Academics',
    keywords: [
      'kinesiology', 'lecture', 'seminar', 'symposium', 'colloquium', 'exam',
      'thesis', 'research', 'scholar', 'academic', 'academics', 'biology',
      'chemistry', 'math', 'mathematics', 'engineering', 'nursing', 'intensive',
      'economics', 'history', 'philosophy', 'honors', 'acm', 'computer science',
      'jellema', 'stem', 'faculty', 'physics', 'psychology', 'conference',
      'presentation', 'study', 'study session', 'writing circle', 'apologetics',
      'dialogue', 'call', 'calvin academy for lifelong learning', 'meeter center'
    ],
    locations: ['hiemenga', 'devries', 'science building', 'north hall', 'classroom', 'lab', 'sb 343'],
  },

  // 7. Career & Professional Development
  {
    category: 'Career',
    keywords: [
      'career', 'resume', 'internship', 'job', 'interview', 'networking',
      'employer', 'recruiter', 'career fair', 'startup garage',
      'professional development', 'marketing', 'accounting club', 'consulting',
      'business', 'executive breakfast'
    ],
    locations: ['career center'],
  },

  // 8. Outdoors & Ecology
  {
    category: 'Outdoors',
    keywords: [
      'outdoors', 'hiking', 'camping', 'trail', 'nature', 'preserve', 'ecosystem',
      'earthkeepers', 'creek', 'ecosystem preserve', 'garden', 'environmental',
      'stewardship volunteer'
    ],
    locations: ['bunker interpretive center', 'nature preserve', 'ecosystem preserve', 'trails'],
  },

  // 9. Service & Community Engagement
  {
    category: 'Service',
    keywords: [
      'service', 'volunteer', 'community service', 'food drive', 'blood drive',
      'outreach', 'fundraiser', 'charity', 'clean up', 'stewardship',
      'service-learning'
    ],
    locations: ['service-learning center'],
  },

  // 10. Wellness & Mental Health
  {
    category: 'Wellness',
    keywords: [
      'wellness', 'mental health', 'counseling', 'fitness', 'broene',
      'active minds', 'de-stress', 'yoga', 'mindfulness', 'health',
      'self-care', 'transitions'
    ],
    locations: ['broene counseling', 'health center', 'health services'],
  },

  // 11. Gaming & Esports
  {
    category: 'Gaming',
    keywords: ['esports', 'gaming', 'smash', 'board game', 'video game', 'lan party', 'tabletop', 'rpg', 'd&d'],
    locations: [],
  },

  // 12. Culture & Diversity
  {
    category: 'Culture',
    keywords: [
      'culture', 'heritage', 'multicultural', 'intercultural', 'cisd', 'bsu',
      'bersama', 'asian', 'latino', 'hispanic', 'african', 'international',
      'diversity', 'anniversary', 'society', '150th', 'liberation', 'border'
    ],
    locations: ['cisd lounge'],
  },

  // 13. Social (Campus life, kickoff events, student organizations)
  {
    category: 'Social',
    keywords: [
      'cookout', 'kickoff', 'party', 'fair', 'fest', 'festival', 'picnic',
      'barbecue', 'bbq', 'movie', 'trivia', 'banquet', 'celebration',
      'ice cream', 'social', 'welcome week', 'movie knight', 'knives out',
      'gathering', 'meetup', 'student life', 'student organizations', 'residence life'
    ],
    locations: ['commons lawn', 'johnny', 'peet', 'dorm', 'residence hall', 'library basement'],
  },
];

/**
 * Classifies an event into one of Knightly's 13 standard FeedCategories.
 *
 * @param {Object} event - The parsed event object
 * @param {string} [event.title] - The event headline
 * @param {string} [event.summary] - Event summary or teaser
 * @param {string} [event.location] - Venue or room name
 * @param {string} [event.categoryHint] - Optional category ID or name from Drupal
 * @returns {string} A guaranteed valid Knightly FeedCategory
 */
function classifyEvent(event = {}) {
  // Step 1: Normalize all text inputs to lowercase strings for case-insensitive matching
  const title = (event.title || '').toLowerCase();
  const summary = (event.summary || '').toLowerCase();
  const location = (event.location || '').toLowerCase();
  const hint = (event.categoryHint || '').toLowerCase();

  // SPECIAL USER CONSTRAINT: Kinesiology MUST be classified as Academics, never Athletics
  if (title.includes('kinesiology') || summary.includes('kinesiology') || hint.includes('kinesiology')) {
    return 'Academics';
  }

  // Step 2: Check high-priority Title keywords
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(title)) {
        return rule.category;
      }
    }
  }

  // Step 3: Check Venue / Location heuristics (e.g. Chapel Sanctuary -> Faith)
  for (const rule of CATEGORY_RULES) {
    for (const loc of rule.locations) {
      if (location.includes(loc)) {
        return rule.category;
      }
    }
  }

  // Step 4: Check Summary description keywords
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(summary)) {
        return rule.category;
      }
    }
  }

  // Step 5: Check category hint from Drupal if available
  if (hint) {
    for (const rule of CATEGORY_RULES) {
      for (const kw of rule.keywords) {
        if (hint.includes(kw)) {
          return rule.category;
        }
      }
    }
  }

  // Step 6: Guaranteed Safe Fallback (defaults to Culture)
  return 'Culture';
}

module.exports = {
  KNIGHTLY_CATEGORIES,
  CATEGORY_RULES,
  classifyEvent,
};
