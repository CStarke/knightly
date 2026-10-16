/**
 * CLI Tool: Sync Calvin Events
 *
 * Runs the scraper against calvin.edu/events/all and generates:
 * 1. Summary of parsed events and category breakdown.
 * 2. An updated seed snapshot file in client/src/data/calvin-events-seed.ts
 */

const fs = require('fs');
const path = require('path');
const { scrapeEvents } = require('../services/event-scraper');
const { KNIGHTLY_CATEGORIES } = require('../services/category-mapper');

async function sync() {
  console.log('Fetching live events from calvin.edu/events/all (pages 0, 1, 2)...');
  const events = await scrapeEvents({ pages: 3, forceRefresh: true });

  console.log(`Successfully parsed ${events.length} upcoming events!\n`);

  // Breakdown by category
  const breakdown = {};
  KNIGHTLY_CATEGORIES.forEach((c) => (breakdown[c] = 0));
  events.forEach((e) => {
    breakdown[e.category] = (breakdown[e.category] || 0) + 1;
  });

  console.log('Category Breakdown:');
  console.table(breakdown);

  // Write snapshot to client seed file
  const clientSeedPath = path.resolve(__dirname, '../../client/src/data/calvin-events-seed.ts');
  const fileContent = `/**
 * Pre-Scraped Calvin Events Seed Snapshot
 *
 * SPRINT 1 SLO CONTEXT (SC2):
 * This file serves as the isolated client fallback seed data. When the client is offline
 * or during standalone Expo development, the feed context falls back to this dataset
 * so the application always presents authentic campus events without crashing.
 *
 * Generated automatically by server/scripts/sync-calvin-events.js
 */

export interface ScrapedCalvinEvent {
  id: string;
  nodeId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  summary: string;
  description: string;
  imageUrl: string | null;
  detailUrl: string;
  category: string;
  org: string;
  clubId: string;
  campusWide: boolean;
}

export const CALVIN_EVENTS_SEED: ScrapedCalvinEvent[] = ${JSON.stringify(events, null, 2)};
`;

  fs.writeFileSync(clientSeedPath, fileContent, 'utf8');
  console.log(`\nSaved ${events.length} seed events to:\n  ${clientSeedPath}`);
}

sync().catch((err) => {
  console.error('Error syncing events:', err);
  process.exit(1);
});
