const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('Server Endpoints Invariants', async (t) => {
  await t.test('verifies express app export exists', () => {
    assert.ok(app);
    assert.equal(typeof app.listen, 'function');
  });

  await t.test('verifies mock supabase client structure', () => {
    const { createClient } = require('../__mocks__/@supabase/supabase-js');
    const mockClient = createClient('http://localhost:54321', 'mock-key');
    assert.ok(mockClient);
    assert.equal(typeof mockClient.from, 'function');
  });
});
