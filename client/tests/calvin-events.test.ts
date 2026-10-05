import { describe, it } from 'node:test';
import assert from 'node:assert';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import { CALVIN_EVENTS_SEED, type ScrapedCalvinEvent } from '@/data/calvin-events-seed';
import { feedCategories, type FeedCategory } from '@/data/feed';
import { getClubById } from '@/data/clubs';

describe('Calvin Events Ingestion & Feed Adapter', () => {
  it('verifies Calvin University is registered in CALVIN_CLUBS as an official institution', () => {
    const calvin = getClubById('calvin-university');
    assert.ok(calvin, 'Calvin University club entry must exist');
    assert.strictEqual(calvin.name, 'Calvin University');
    assert.strictEqual(calvin.mark, 'CU');
    assert.strictEqual(calvin.isDepartment, true);
    assert.deepStrictEqual(calvin.colors, ['#8C2131', '#E8B019']);
  });

  it('adapts a scraped event with an image into a valid Post', () => {
    const sampleEvent: ScrapedCalvinEvent = {
      id: 'calvin-42124',
      nodeId: '42124',
      title: 'Chapel Service: Worship with Calvin Alumni',
      date: 'Oct 02, 2026',
      time: '10:30 am–10:50 am',
      location: 'Chapel Sanctuary',
      summary: 'Weekly community chapel gathering in the sanctuary.',
      description: 'Weekly community chapel gathering in the sanctuary.',
      imageUrl: 'https://calvin.edu/sites/default/files/faith-worship.png',
      detailUrl: 'https://calvin.edu/events/chapel-service',
      category: 'Faith',
      org: 'Calvin University',
      clubId: 'calvin-university',
      campusWide: true,
    };

    const post = adaptCalvinEventToPost(sampleEvent, 1790951400000);
    assert.strictEqual(post.id, 'calvin-42124');
    assert.strictEqual(post.org, 'Calvin University');
    assert.strictEqual(post.clubId, 'calvin-university');
    assert.strictEqual(post.mark, 'CU');
    assert.strictEqual(post.category, 'Faith');
    assert.strictEqual(post.headline, 'Chapel Service: Worship with Calvin Alumni');
    assert.strictEqual(post.when, 'Oct 02, 2026 · 10:30 am–10:50 am');
    assert.strictEqual(post.where, 'Chapel Sanctuary');
    assert.strictEqual(post.image, 'https://calvin.edu/sites/default/files/faith-worship.png');
    assert.strictEqual(post.campusWide, true);
  });

  it('assigns category-matched Simple Banner preset when event lacks an image', () => {
    const noImageEvent: ScrapedCalvinEvent = {
      id: 'calvin-47163',
      nodeId: '47163',
      title: 'BSU Annual Cookout',
      date: 'Oct 02, 2026',
      time: '4:30 pm–8:00 pm',
      location: 'Commons Lawn',
      summary: 'Annual campus cookout hosted on the Commons Lawn.',
      description: 'Annual campus cookout hosted on the Commons Lawn.',
      imageUrl: null,
      detailUrl: 'https://calvin.edu/events/bsu-cookout',
      category: 'Social',
      org: 'Calvin University',
      clubId: 'calvin-university',
      campusWide: true,
    };

    const post = adaptCalvinEventToPost(noImageEvent, 1790973000000);
    assert.strictEqual(post.image, 'preset:orange:lattice');
    assert.strictEqual(post.category, 'Social');
  });

  it('verifies all seed events have valid FeedCategories and non-empty required fields', () => {
    assert.ok(CALVIN_EVENTS_SEED.length > 0, 'Seed events must not be empty');

    for (const event of CALVIN_EVENTS_SEED) {
      assert.ok(event.id.startsWith('calvin-'), `Event ID ${event.id} must be prefixed with calvin-`);
      assert.ok(event.title.length > 0, `Event ${event.id} must have a non-empty title`);
      assert.ok(event.date.length > 0, `Event ${event.id} must have a valid date`);
      assert.ok(
        feedCategories.includes(event.category as FeedCategory),
        `Event ${event.id} category "${event.category}" must be a valid FeedCategory`
      );
    }
  });
});
