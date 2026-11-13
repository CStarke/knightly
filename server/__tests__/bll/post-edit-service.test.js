const test = require('node:test');
const assert = require('node:assert/strict');
const { editPost } = require('../../services/post-edit-service');
const { registerPostEditRoute } = require('../../routes/post-edit-route');

const id = '11111111-1111-4111-8111-111111111111';
const original = {
  id, club_id: 'abstraction', source: 'club', status: 'published',
  headline: 'Original', body: 'Description', posted_at: '2026-11-01T12:00:00Z',
  created_at_ms: 1793534400000, image_url: 'preset:maroon:none',
};
function setup(post = original, memberships = [{ club_id: 'abstraction' }]) {
  const writes = [];
  const posts = {
    getPostById: async () => post,
    updatePost: async (postId, clubId, changes) => {
      writes.push({ postId, clubId, changes });
      return { ...post, ...changes };
    },
  };
  const clubs = { getMembershipsForStudent: async () => memberships };
  return { posts, clubs, writes };
}

test('leader edits text while identity, timestamp and banner survive', async () => {
  const { posts, clubs, writes } = setup();
  const result = await editPost(id, { studentId: 'student', headline: ' New title ', whereText: '' }, posts, clubs);
  assert.deepEqual(writes, [{ postId: id, clubId: 'abstraction', changes: { headline: 'New title', where_text: null } }]);
  assert.equal(result.id, original.id);
  assert.equal(result.posted_at, original.posted_at);
  assert.equal(result.created_at_ms, original.created_at_ms);
  assert.equal(result.image_url, original.image_url);
  assert.equal(result.body, original.body);
});

test('co-leader may edit a post authored by another leader', async () => {
  const { posts, clubs } = setup({ ...original, author_student_id: 'another-leader' });
  assert.equal((await editPost(id, { studentId: 'co-leader', body: 'Updated' }, posts, clubs)).body, 'Updated');
});

test('invalid inputs and protected fields never write', async () => {
  const invalid = [
    null, [], {}, { studentId: 'student' },
    { studentId: '', headline: 'Title' },
    { studentId: 'student', headline: '  ' },
    { studentId: 'student', body: 42 },
    { studentId: 'student', headline: 'x'.repeat(51) },
    { studentId: 'student', body: 'x'.repeat(281) },
    { studentId: 'student', whereText: 'x'.repeat(26) },
    { studentId: 'student', whenText: 'x'.repeat(161) },
    { studentId: 'student', posted_at: '2099-01-01' },
    { studentId: 'student', clubId: 'another-club' },
    { studentId: 'student', status: 'archived' },
  ];
  for (const payload of invalid) {
    const { posts, clubs, writes } = setup();
    await assert.rejects(editPost(id, payload, posts, clubs), { status: 400 });
    assert.equal(writes.length, 0);
  }
});

test('boundary lengths and clearing optional logistics work', async () => {
  const { posts, clubs } = setup();
  const result = await editPost(id, {
    studentId: 'student', headline: 'x'.repeat(50), body: 'x'.repeat(280),
    whereText: 'x'.repeat(25), whenText: 'x'.repeat(160),
  }, posts, clubs);
  assert.equal(result.when_text.length, 160);
  assert.equal(result.where_text.length, 25);
});

test('missing, local, scraped, archived and unrelated club posts are rejected', async () => {
  const cases = [
    [id, null, [], 404],
    ['p-local-123', original, [], 400],
    [id, { ...original, source: 'calvin_drupal' }, [{ club_id: 'abstraction' }], 403],
    [id, { ...original, status: 'archived' }, [{ club_id: 'abstraction' }], 403],
    [id, original, [{ club_id: 'other-club' }], 403],
    [id, original, [], 403],
  ];
  for (const [postId, post, memberships, status] of cases) {
    const { posts, clubs, writes } = setup(post, memberships);
    await assert.rejects(editPost(postId, { studentId: 'student', headline: 'New' }, posts, clubs), { status });
    assert.equal(writes.length, 0);
  }
});

test('post removed between lookup and update returns conflict', async () => {
  const { posts, clubs } = setup();
  posts.updatePost = async () => null;
  await assert.rejects(editPost(id, { studentId: 'student', body: 'New' }, posts, clubs), { status: 409 });
});

test('registered PATCH route returns validation errors and hides database diagnostics', async () => {
  const { posts, clubs } = setup();
  let handler;
  registerPostEditRoute({ patch: (path, callback) => {
    assert.equal(path, '/api/posts/:id');
    handler = callback;
  } }, posts, clubs);
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
  await handler({ params: { id }, body: { studentId: 'student', headline: 'New' } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.headline, 'New');
  await handler({ params: { id }, body: {} }, response);
  assert.equal(response.statusCode, 400);
  posts.getPostById = async () => { throw new Error('database unavailable'); };
  await handler({ params: { id }, body: { studentId: 'student', headline: 'New' } }, response);
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error, 'Unable to save changes. Please try again.');
});
