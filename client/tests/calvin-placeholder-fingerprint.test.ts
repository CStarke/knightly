import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CALVIN_PLACEHOLDER_FINGERPRINTS,
  isCalvinPlaceholderUrl,
  isCalvinPlaceholderHash,
  detectCalvinPlaceholder,
} from '@/utils/image-fingerprint';
import { adaptCalvinEventToPost } from '@/utils/calvin-event-adapter';
import type { ScrapedCalvinEvent } from '@/data/calvin-events-seed';

describe('Calvin Placeholder Fingerprint & Same-Filename Immunity', () => {
  it('detects all 5 canonical Calvin Drupal placeholder URLs', () => {
    const urls = [
      'https://calvin.edu/sites/default/files/2025-10/arts-culture.png',
      'https://calvin.edu/sites/default/files/2025-10/athletics.png',
      'https://calvin.edu/sites/default/files/2025-10/campus-life.png',
      'https://calvin.edu/sites/default/files/2025-10/faith-worship.png',
      'https://calvin.edu/sites/default/files/2025-10/learning-academics.png',
      'https://calvin.edu/sites/default/files/2024-01/calvin-west-michigan.png',
    ];

    for (const url of urls) {
      assert.strictEqual(
        isCalvinPlaceholderUrl(url),
        true,
        `Expected ${url} to be detected as a placeholder URL`
      );
    }
  });

  it('IMMUNITY INVARIANT: does not flag custom uploads that happen to share the same filename', () => {
    // Custom user uploads or different paths with identical filenames
    const customImages = [
      'https://calvin.edu/sites/default/files/styles/large/public/events/2026-10/athletics.png?itok=PO0iRNs7',
      'https://calvin.edu/sites/default/files/styles/large/public/2026-09/learning-academics.png',
      'https://calvin.edu/sites/default/files/custom-uploads/faith-worship.png',
      'https://example.com/uploads/campus-life.png',
      'https://calvin.edu/assets/arts-culture.png',
    ];

    for (const url of customImages) {
      assert.strictEqual(
        isCalvinPlaceholderUrl(url),
        false,
        `Expected custom upload ${url} NOT to be detected as placeholder`
      );
    }
  });

  it('verifies SHA-256 hash detection matches known placeholder assets', () => {
    assert.strictEqual(
      isCalvinPlaceholderHash('f8cecb9826863b286c6effb71aa0b0168ad6ab96ce8b30bf1285c0aee02d1d71'),
      true
    );
    assert.strictEqual(
      isCalvinPlaceholderHash('F8CECB9826863B286C6EFFB71AA0B0168AD6AB96CE8B30BF1285C0AEE02D1D71'),
      true
    );
    assert.strictEqual(
      isCalvinPlaceholderHash('a61256e0fb883e32cf84657f23486a9fb7c62bc6312d60c1e65d01ffe7fd0d4f'),
      true
    );
    assert.strictEqual(
      isCalvinPlaceholderHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
      false // Empty string SHA-256
    );
  });

  it('auto-replaces generic Drupal placeholders with category Simple Banner in adaptCalvinEventToPost', () => {
    const athleticsPlaceholderEvent: ScrapedCalvinEvent = {
      id: 'calvin-101',
      nodeId: '101',
      title: 'Men\'s Soccer vs Wheaton',
      date: 'Oct 02, 2026',
      time: '7:00 pm',
      location: 'Zuidema Field',
      summary: 'Knights soccer home match.',
      description: 'Knights soccer home match.',
      imageUrl: 'https://calvin.edu/sites/default/files/2025-10/athletics.png',
      detailUrl: 'https://calvin.edu/events/mens-soccer',
      category: 'Athletics',
      org: 'Calvin University',
      clubId: 'calvin-university',
      campusWide: true,
    };

    const post = adaptCalvinEventToPost(athleticsPlaceholderEvent);
    assert.strictEqual(
      post.image,
      'preset:maroon:stripes',
      'Athletics placeholder should be replaced with preset:maroon:stripes'
    );
  });

  it('preserves legitimate event flyers even if filename matches placeholder basename', () => {
    const customFlyerEvent: ScrapedCalvinEvent = {
      id: 'calvin-102',
      nodeId: '102',
      title: 'Varsity Soccer Showcase',
      date: 'Oct 05, 2026',
      time: '3:00 pm',
      location: 'Zuidema Field',
      summary: 'Showcase tournament flyer.',
      description: 'Showcase tournament flyer.',
      imageUrl: 'https://calvin.edu/sites/default/files/styles/large/public/events/2026-10/athletics.png?itok=ABC123',
      detailUrl: 'https://calvin.edu/events/showcase',
      category: 'Athletics',
      org: 'Calvin University',
      clubId: 'calvin-university',
      campusWide: true,
    };

    const post = adaptCalvinEventToPost(customFlyerEvent);
    assert.strictEqual(
      post.image,
      'https://calvin.edu/sites/default/files/styles/large/public/events/2026-10/athletics.png?itok=ABC123',
      'Legitimate custom flyer must NOT be replaced by preset banner'
    );
  });

  it('uses classified event category when replacing placeholders', () => {
    // In Calvin Drupal, an international student discussion has campus-life.png,
    // but Knightly classifies it as Culture
    const cultureEvent: ScrapedCalvinEvent = {
      id: 'calvin-103',
      nodeId: '103',
      title: 'International Student Gathering',
      date: 'Oct 03, 2026',
      time: '5:00 pm',
      location: 'Commons Annex',
      summary: 'Cultural exchange dinner.',
      description: 'Cultural exchange dinner.',
      imageUrl: 'https://calvin.edu/sites/default/files/2025-10/campus-life.png',
      detailUrl: 'https://calvin.edu/events/intl-gathering',
      category: 'Culture',
      org: 'Calvin University',
      clubId: 'calvin-university',
      campusWide: true,
    };

    const post = adaptCalvinEventToPost(cultureEvent);
    assert.strictEqual(
      post.image,
      'preset:cranberry:globe',
      'Culture event with placeholder should receive Culture preset banner'
    );
  });
});
