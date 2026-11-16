import test from 'node:test';
import assert from 'node:assert/strict';
import { editPostApi } from '@/services/post-edit-api';

// Exercise actual fetch request construction and adapter behavior without a live database.
test('post edits send partial fields and preserve server identity/timestamps', async () => {
  const previousFetch = globalThis.fetch;
  const row = {
    id: '11111111-1111-4111-8111-111111111111', club_id: 'abstraction',
    org_name: 'Abstraction', headline: 'Updated', body: 'Description', category: 'Academics',
    posted_at: '2026-11-01T12:00:00.000Z', created_at_ms: 1793534400000,
  };
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).endsWith(`/posts/${row.id}`));
      assert.equal(options?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(options?.body)), { studentId: 'leader', headline: 'Updated' });
      return new Response(JSON.stringify(row), { status: 200 });
    };
    const post = await editPostApi(row.id, 'leader', { headline: 'Updated' });
    assert.equal(post.id, row.id);
    assert.equal(post.postedAt, row.posted_at);
    assert.equal(post.headline, 'Updated');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('permission errors, offline saves and malformed success responses reject', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Club leadership required' }), { status: 403 });
    await assert.rejects(editPostApi('post', 'student', { body: 'New' }), /Club leadership required/);
    globalThis.fetch = async () => { throw new Error('Network unavailable'); };
    await assert.rejects(editPostApi('post', 'student', { body: 'New' }), /Network unavailable/);
    globalThis.fetch = async () => new Response('{}', { status: 200 });
    await assert.rejects(editPostApi('post', 'student', { body: 'New' }), /invalid post/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
