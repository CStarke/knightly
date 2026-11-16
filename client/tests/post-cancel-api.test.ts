import test from 'node:test';
import assert from 'node:assert/strict';
import { cancelPostApi } from '@/services/post-cancel-api';
import { adaptDatabasePostToClientPost } from '@/utils/post-database-adapter';

const row = {
  id: '11111111-1111-4111-8111-111111111111', club_id: 'abstraction',
  org_name: 'Abstraction', headline: 'Meeting', body: 'Bring your robot', category: 'Academics',
  posted_at: '2026-11-13T12:00:00.000Z', created_at_ms: 1794571200000,
};

test('adapter handles canceled, active and legacy rows', () => {
  assert.equal(adaptDatabasePostToClientPost(row).isCancelled, false);
  assert.equal(adaptDatabasePostToClientPost({ ...row, is_cancelled: false }).isCancelled, false);
  const canceled = adaptDatabasePostToClientPost({ ...row, is_cancelled: true });
  assert.equal(canceled.isCancelled, true);
  assert.equal(canceled.id, row.id);
  assert.equal(canceled.postedAt, row.posted_at);
  assert.equal(canceled.headline, row.headline);
});

test('cancel request sends identity and verifies the server cancellation', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).endsWith(`/posts/${row.id}/cancel`));
      assert.equal(options?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(options?.body)), { studentId: 'leader' });
      return new Response(JSON.stringify({ ...row, is_cancelled: true }), { status: 200 });
    };
    const result = await cancelPostApi(row.id, 'leader');
    assert.equal(result.isCancelled, true);
    assert.equal(result.createdAt, row.created_at_ms);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('offline, forbidden and invalid cancellation responses reject', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('Offline'); };
    await assert.rejects(cancelPostApi(row.id, 'leader'), /Offline/);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Leadership required' }), { status: 403 });
    await assert.rejects(cancelPostApi(row.id, 'leader'), /Leadership required/);
    globalThis.fetch = async () => new Response(JSON.stringify(row), { status: 200 });
    await assert.rejects(cancelPostApi(row.id, 'leader'), /invalid cancellation/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
