import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceHeaderScroll, INITIAL_HEADER_SCROLL } from '@/utils/header-scroll';

test('header takes a long downward scroll to fade completely', () => {
  assert.equal(advanceHeaderScroll(INITIAL_HEADER_SCROLL, 192).opacity, 1);
  assert.equal(advanceHeaderScroll(INITIAL_HEADER_SCROLL, 692).opacity, 0.5);
  assert.equal(advanceHeaderScroll(INITIAL_HEADER_SCROLL, 1192).opacity, 0);
});

test('short accumulated upward scroll reveals header far down the feed', () => {
  const hidden = advanceHeaderScroll(INITIAL_HEADER_SCROLL, 4000);
  const small = advanceHeaderScroll(hidden, 3990);
  assert.equal(small.opacity, 0);
  const revealed = advanceHeaderScroll(small, 3980);
  assert.equal(revealed.opacity, 1);
  assert.equal(advanceHeaderScroll(revealed, 3985).opacity, 1);
});

test('direction changes reject tiny upward jitter and restart the long fade after reveal', () => {
  let state = advanceHeaderScroll(INITIAL_HEADER_SCROLL, 2000);
  state = advanceHeaderScroll(state, 1990);
  state = advanceHeaderScroll(state, 1995);
  state = advanceHeaderScroll(state, 1985);
  assert.equal(state.opacity, 0);
  state = advanceHeaderScroll(state, 1975);
  assert.equal(state.opacity, 1);
  assert.equal(advanceHeaderScroll(state, 2667).opacity, 0.5);
});

test('top bounce, duplicate events and invalid measurements preserve safe state', () => {
  const top = advanceHeaderScroll(INITIAL_HEADER_SCROLL, -40);
  assert.equal(top.opacity, 1);
  assert.equal(advanceHeaderScroll(top, 0).opacity, 1);
  assert.equal(advanceHeaderScroll(top, Number.NaN), top);
  const hidden = advanceHeaderScroll(INITIAL_HEADER_SCROLL, 1500);
  assert.equal(advanceHeaderScroll(hidden, 1500), hidden);
  assert.equal(INITIAL_HEADER_SCROLL.offset, 0);
});
