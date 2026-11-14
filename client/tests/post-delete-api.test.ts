import test from 'node:test';
import assert from 'node:assert/strict';
import { deletePostApi } from '@/services/posts-api';

test('delete sends student identity and accepts confirmed success', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).endsWith('/posts/post-id'));
      assert.equal(options?.method, 'DELETE');
      assert.deepEqual(JSON.parse(String(options?.body)), { studentId: 'leader' });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };
    assert.equal(await deletePostApi('post-id', 'leader'), true);
  } finally { globalThis.fetch = originalFetch; }
});

test('retry accepts only a typed absent-post response', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'POST_NOT_FOUND' }), { status: 404 });
    assert.equal(await deletePostApi('post-id', 'leader'), true);
    globalThis.fetch = async () => new Response('Not Found', { status: 404 });
    assert.equal(await deletePostApi('post-id', 'leader'), false);
  } finally { globalThis.fetch = originalFetch; }
});

test('missing identity, permission errors, offline and malformed responses fail safely', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('Offline'); };
    assert.equal(await deletePostApi('post-id', 'leader'), false);
    assert.equal(await deletePostApi('post-id'), false);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Denied' }), { status: 403 });
    assert.equal(await deletePostApi('post-id', 'leader'), false);
    globalThis.fetch = async () => new Response('{}', { status: 200 });
    assert.equal(await deletePostApi('post-id', 'leader'), false);
  } finally { globalThis.fetch = originalFetch; }
});
