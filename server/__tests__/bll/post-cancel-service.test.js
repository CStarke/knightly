const test = require('node:test');
const assert = require('node:assert/strict');
const { cancelPost } = require('../../services/post-cancel-service');
const { registerPostCancelRoute } = require('../../routes/post-cancel-route');
const postsDal = require('../../dal/posts-dal');

const id = '11111111-1111-4111-8111-111111111111';
const original = {
  id, club_id: 'abstraction', source: 'club', status: 'published',
  headline: 'Meeting', body: 'Bring your robot', posted_at: '2026-11-13T12:00:00Z',
  created_at_ms: 1794571200000,
};
function setup(post = original, memberships = [{ club_id: 'abstraction' }]) {
  let current = post;
  const writes = [];
  const posts = {
    getPostById: async () => current,
    cancelPost: async (postId, clubId) => {
      writes.push({ postId, clubId });
      current = { ...current, is_cancelled: true };
      return current;
    },
  };
  const clubs = { getMembershipsForStudent: async () => memberships };
  return { posts, clubs, writes };
}

test('leader cancellation preserves content, status and publication timestamps', async () => {
  const { posts, clubs, writes } = setup();
  const result = await cancelPost(id, { studentId: 'co-leader' }, posts, clubs);
  assert.deepEqual(result, { ...original, is_cancelled: true });
  assert.deepEqual(writes, [{ postId: id, clubId: 'abstraction' }]);
});

test('retry after successful cancellation returns the same result without another write', async () => {
  const { posts, clubs, writes } = setup();
  const first = await cancelPost(id, { studentId: 'leader' }, posts, clubs);
  const second = await cancelPost(id, { studentId: 'leader' }, posts, clubs);
  assert.deepEqual(second, first);
  assert.equal(writes.length, 1);
});

test('nonleaders cannot cancel even an already canceled post', async () => {
  for (const memberships of [[], [{ club_id: 'other-club' }]]) {
    const { posts, clubs, writes } = setup({ ...original, is_cancelled: true }, memberships);
    await assert.rejects(cancelPost(id, { studentId: 'student' }, posts, clubs), { status: 403 });
    assert.equal(writes.length, 0);
  }
});

test('malformed requests and attempts to change protected fields fail', async () => {
  for (const payload of [null, [], {}, { studentId: 123 }, { studentId: '  ' },
    { studentId: 'leader', is_cancelled: false }, { studentId: 'leader', clubId: 'other' }]) {
    const { posts, clubs, writes } = setup();
    await assert.rejects(cancelPost(id, payload, posts, clubs), { status: 400 });
    assert.equal(writes.length, 0);
  }
  const { posts, clubs } = setup();
  await assert.rejects(cancelPost('p-local-123', { studentId: 'leader' }, posts, clubs), { status: 400 });
});

test('missing, scraped and unpublished posts cannot be canceled', async () => {
  for (const [post, status] of [[null, 404], [{ ...original, source: 'calvin_drupal' }, 403],
    [{ ...original, status: 'archived' }, 403], [{ ...original, club_id: null }, 403]]) {
    const { posts, clubs, writes } = setup(post);
    await assert.rejects(cancelPost(id, { studentId: 'leader' }, posts, clubs), { status });
    assert.equal(writes.length, 0);
  }
});

test('concurrent deletion or status change produces a conflict', async () => {
  const { posts, clubs } = setup();
  posts.cancelPost = async () => null;
  await assert.rejects(cancelPost(id, { studentId: 'leader' }, posts, clubs), { status: 409 });
});

test('DAL writes only cancellation flag with ownership and publication filters', async () => {
  const calls = [];
  const query = {
    update(value) { calls.push(['update', value]); return this; },
    eq(key, value) { calls.push(['eq', key, value]); return this; },
    select() { return this; },
    async maybeSingle() { return { data: { ...original, is_cancelled: true }, error: null }; },
  };
  const client = { from(table) { assert.equal(table, 'posts'); return query; } };
  const result = await postsDal.cancelPost(id, 'abstraction', client);
  assert.equal(result.is_cancelled, true);
  assert.deepEqual(calls, [
    ['update', { is_cancelled: true }], ['eq', 'id', id], ['eq', 'club_id', 'abstraction'],
    ['eq', 'source', 'club'], ['eq', 'status', 'published'],
  ]);
  query.maybeSingle = async () => ({ data: null, error: { message: 'offline' } });
  await assert.rejects(postsDal.cancelPost(id, 'abstraction', client), /offline/);
});

test('route reports success, denied access and a safe database error', async () => {
  const { posts, clubs } = setup();
  let handler;
  registerPostCancelRoute({ patch(path, callback) {
    assert.equal(path, '/api/posts/:id/cancel');
    handler = callback;
  } }, posts, clubs);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  const req = { params: { id }, body: { studentId: 'leader' } };
  await handler(req, res);
  assert.equal(res.body.is_cancelled, true);
  clubs.getMembershipsForStudent = async () => [];
  await handler(req, res);
  assert.equal(res.code, 403);
  posts.getPostById = async () => { throw new Error('database details'); };
  await handler(req, res);
  assert.equal(res.code, 500);
  assert.equal(res.body.error, 'Unable to cancel the post. Please try again.');
});
