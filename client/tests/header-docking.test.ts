import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHeaderDockingFrame } from '@/utils/header-docking';
import { HeaderHorizontalInset, HeaderTopInset, Radius, Spacing } from '@/constants/theme';

test('login surface starts full width and docks to the inset rounded header', () => {
  const start = getHeaderDockingFrame(0, 390, 0);
  assert.equal(start.left, 0);
  assert.equal(start.width, 390);
  assert.equal(start.borderRadius, 0);
  const end = getHeaderDockingFrame(1, 390, 0);
  assert.equal(end.left, HeaderHorizontalInset);
  assert.equal(end.top, HeaderTopInset);
  assert.equal(end.width, 390 - HeaderHorizontalInset * 2);
  assert.equal(end.borderRadius, Radius.xl);
  assert.equal(end.wordmarkLeft, HeaderHorizontalInset + Spacing.three);
});

test('docking preserves banner offset and centers capped header content on wider native screens', () => {
  const end = getHeaderDockingFrame(1, 1024, 72);
  assert.equal(end.top, 72 + HeaderTopInset);
  assert.equal(end.wordmarkLeft, (1024 - 800) / 2 + Spacing.three);
  assert.deepEqual(getHeaderDockingFrame(2, 390, 72), getHeaderDockingFrame(1, 390, 72));
  const half = getHeaderDockingFrame(0.5, 390, 72);
  assert.equal(half.width, 390 - HeaderHorizontalInset);
  assert.equal(half.borderRadius, Radius.xl / 2);
});
