const test = require('node:test');
const assert = require('node:assert/strict');
const { deleteClubPost } = require('../../services/post-delete-service');
const { registerPostDeleteRoute } = require('../../routes/post-delete-route');
const { deletePost } = require('../../dal/posts-dal');

const id = '11111111-1111-4111-8111-111111111111';
const original = { id, club_id: 'abstraction', source: 'club', status: 'published' };
function setup(post = original, memberships = [{ club_id: 'abstraction' }]) {
  let current = post;
  const writes = [];
  const posts = {
    getPostById: async () => current,
    deletePost: async (postId, client, clubId) => {
      writes.push({ postId, clubId });
      current = null;
      return true;
    },
  };
  return { posts, clubs: { getMembershipsForStudent: async () => memberships }, writes };
}

test('leader can delete active and canceled club posts', async () => {
  for (const is_cancelled of [false, true]) {
    const { posts, clubs, writes } = setup({ ...original, is_cancelled, author_student_id: 'another-leader' });
    await deleteClubPost(id, { studentId: 'co-leader' }, posts, clubs);
    assert.deepEqual(writes, [{ postId: id, clubId: 'abstraction' }]);
    assert.equal(await posts.getPostById(id), null);
  }
});

test('nonleader, other-club leader, scraped and unpublished posts cannot be deleted', async () => {
  for (const [post, memberships] of [[original, []], [original, [{ club_id: 'other-club' }]],
    [{ ...original, source: 'calvin_drupal' }, [{ club_id: 'abstraction' }]],
    [{ ...original, status: 'draft' }, [{ club_id: 'abstraction' }]]]) {
    const { posts, clubs, writes } = setup(post, memberships);
    await assert.rejects(deleteClubPost(id, { studentId: 'student' }, posts, clubs), { status: 403 });
    assert.equal(writes.length, 0);
  }
});

test('missing post returns 404 and malformed requests do not write', async () => {
  const missing = setup(null);
  await assert.rejects(deleteClubPost(id, { studentId: 'leader' }, missing.posts, missing.clubs), { status: 404 });
  for (const payload of [null, [], {}, { studentId: 42 }, { studentId: ' ' },
    { studentId: 'leader', clubId: 'other' }]) {
    const { posts, clubs, writes } = setup();
    await assert.rejects(deleteClubPost(id, payload, posts, clubs), { status: 400 });
    assert.equal(writes.length, 0);
  }
  const { posts, clubs } = setup();
  await assert.rejects(deleteClubPost('p-local-1', { studentId: 'leader' }, posts, clubs), { status: 400 });
});

test('a concurrent deletion succeeds but ownership/status changes produce conflict', async () => {
  const { posts, clubs } = setup();
  posts.deletePost = async () => false;
  await assert.rejects(deleteClubPost(id, { studentId: 'leader' }, posts, clubs), { status: 409 });
  let reads = 0;
  posts.getPostById = async () => ++reads === 1 ? original : null;
  await deleteClubPost(id, { studentId: 'leader' }, posts, clubs);
});

test('DAL applies verified ownership filters and reports missing rows and failures', async () => {
  const filters = [];
  const query = {
    delete() { return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    select(columns) { assert.equal(columns, 'id'); return this; },
    async maybeSingle() { return { data: { id }, error: null }; },
  };
  const client = { from(table) { assert.equal(table, 'posts'); return query; } };
  assert.equal(await deletePost(id, client, 'abstraction'), true);
  assert.deepEqual(filters, [['id', id], ['club_id', 'abstraction'], ['source', 'club'], ['status', 'published']]);
  query.maybeSingle = async () => ({ data: null, error: null });
  assert.equal(await deletePost(id, client, 'abstraction'), false);
  query.maybeSingle = async () => ({ data: null, error: { message: 'offline' } });
  await assert.rejects(deletePost(id, client, 'abstraction'), /offline/);
});

test('route returns typed missing response for retries and hides database details', async () => {
  const { posts, clubs } = setup();
  let handler;
  registerPostDeleteRoute({ delete(path, callback) {
    assert.equal(path, '/api/posts/:id');
    handler = callback;
  } }, posts, clubs);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  const req = { params: { id }, body: { studentId: 'leader' } };
  await handler(req, res);
  assert.deepEqual(res.body, { success: true });
  await handler(req, res);
  assert.equal(res.code, 404);
  assert.equal(res.body.code, 'POST_NOT_FOUND');
  posts.getPostById = async () => { throw new Error('internal database details'); };
  await handler(req, res);
  assert.equal(res.code, 500);
  assert.equal(res.body.error, 'Unable to delete the post. Please try again.');
});

