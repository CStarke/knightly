import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getSavedPostsStorageKey,
  loadSavedPostIds,
  persistSavedPostIds,
} from '@/context/feed-context';
import { Brand } from '@/constants/theme';
import { FeedEmptyState } from '@/components/feed-controls';

describe('Saved Posts Architectural Invariants & Student Privacy', () => {
  it('strictly isolates storage keys by student account to prevent cross-account leak', () => {
    const studentA = { id: '2028420', username: 'jmd42' };
    const studentB = { id: '2028421', username: 'sarah.connor' };
    const guestUser = null;

    const keyA = getSavedPostsStorageKey(studentA);
    const keyB = getSavedPostsStorageKey(studentB);
    const keyGuest = getSavedPostsStorageKey(guestUser);

    assert.equal(keyA, 'knightly_saved_posts_jmd42');
    assert.equal(keyB, 'knightly_saved_posts_sarah.connor');
    assert.equal(keyGuest, 'knightly_saved_posts_guest');
    assert.notEqual(keyA, keyB, 'Student A and Student B storage keys must not collide');
  });

  it('guarantees saved post lists are partitioned and private per student account', () => {
    const studentA = { id: '2028420', username: 'jmd42' };
    const studentB = { id: '2028421', username: 'sarah.connor' };

    persistSavedPostIds(studentA, ['post-1', 'post-2']);
    persistSavedPostIds(studentB, ['post-3']);

    const loadedA = loadSavedPostIds(studentA);
    const loadedB = loadSavedPostIds(studentB);

    assert.deepEqual(loadedA, ['post-1', 'post-2'], 'Student A must only see their own saved posts');
    assert.deepEqual(loadedB, ['post-3'], 'Student B must only see their own saved posts');
    assert.ok(!loadedB.includes('post-1'), 'Student B must never see Student A saved posts');
  });

  it('renders consolidated FeedEmptyState for no-saved-posts with star icon and gold color', () => {
    const emptyElement = FeedEmptyState({ type: 'no-saved-posts' });
    assert.ok(emptyElement, 'Empty state element must render');

    const cardProps = emptyElement.props;
    const children = Array.isArray(cardProps.children) ? cardProps.children : [cardProps.children];

    // Find the Icon component in children
    const iconChild = children.find(
      (c: any) => c && c.type && (c.type.name === 'Icon' || c.props?.sf === 'star')
    );
    assert.ok(iconChild, 'Must render an Icon in no-saved-posts empty state');
    assert.equal(iconChild.props.sf, 'star');
    assert.equal(iconChild.props.md, 'star_border');
    assert.equal(iconChild.props.color, Brand.gold);

    // Verify title copy
    const titleChild = children.find(
      (c: any) => c && c.props?.children === 'No saved posts yet'
    );
    assert.ok(titleChild, 'Must render exact "No saved posts yet" title copy');
  });
});
