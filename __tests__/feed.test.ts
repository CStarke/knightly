import { describe, it } from 'node:test';
import assert from 'node:assert';
import { feedCategories, posts, type FeedCategory, type Post } from '@/data/feed';

describe('Knightly Feed Domain', () => {
  describe('Feed Categories', () => {
    it('contains all eight official feed categories', () => {
      const expectedCategories: FeedCategory[] = [
        'The Arts',
        'Athletics',
        'Music',
        'Academics',
        'Faith',
        'Service',
        'Social',
        'Outdoors',
      ];

      assert.strictEqual(feedCategories.length, 8);
      for (const cat of expectedCategories) {
        assert.ok(feedCategories.includes(cat), `Expected category ${cat} in feedCategories`);
      }
    });

    it('has no duplicates in category list', () => {
      const unique = new Set(feedCategories);
      assert.strictEqual(unique.size, feedCategories.length);
    });
  });

  describe('Posts Structure & Content', () => {
    it('validates each post has non-empty required fields', () => {
      for (const p of posts) {
        assert.ok(p.id.length > 0, 'Post must have an id');
        assert.ok(p.org.length > 0, 'Post must specify organizing body');
        assert.ok(feedCategories.includes(p.category), `Post ${p.id} category ${p.category} must be valid`);
        assert.ok(p.headline.length > 0, 'Post must have headline');
        assert.ok(p.body.length > 0, 'Post must have body copy');
        assert.ok(p.postedAt.length > 0, 'Post must have relative postedAt string');
        assert.strictEqual(typeof p.followed, 'boolean');
        assert.strictEqual(typeof p.campusWide, 'boolean');
      }
    });

    it('contains both followed and campus-wide posts', () => {
      const followed = posts.filter((p) => p.followed);
      const campusWide = posts.filter((p) => p.campusWide);

      assert.ok(followed.length > 0, 'Should have followed posts');
      assert.ok(campusWide.length > 0, 'Should have campus-wide posts');
    });
  });

  describe('Feed Filtering Logic', () => {
    it('filters For You posts (followed OR campusWide)', () => {
      const forYouPosts = posts.filter((p) => p.followed || p.campusWide);
      assert.ok(forYouPosts.length > 0);
      for (const p of forYouPosts) {
        assert.ok(p.followed || p.campusWide, 'For You post must be followed or campus-wide');
      }
    });

    it('filters posts by specific category', () => {
      const athleticsPosts = posts.filter((p) => p.category === 'Athletics');
      assert.ok(athleticsPosts.length > 0);
      for (const p of athleticsPosts) {
        assert.strictEqual(p.category, 'Athletics');
      }
    });

    it('searches posts by keyword in headline or body', () => {
      const query = 'Airband';
      const results = posts.filter(
        (p) =>
          p.headline.toLowerCase().includes(query.toLowerCase()) ||
          p.body.toLowerCase().includes(query.toLowerCase())
      );
      assert.ok(results.length > 0);
      assert.ok(results.some((p) => p.headline.includes('Airband')));
    });
  });
});
