import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FavoriteStar } from '@/components/ui/favorite-star';
import { Brand } from '@/constants/theme';

test('favorite stars retain compact dimensions and use distinct bundled outline and solid assets', () => {
  const outlined = FavoriteStar({ saved: false, color: Brand.gold });
  const filled = FavoriteStar({ saved: true, color: Brand.gold });
  assert.deepEqual(outlined.props.style, { width: 16, height: 16, tintColor: Brand.gold });
  assert.deepEqual(filled.props.style, outlined.props.style);
  const outlineAsset = readFileSync(new URL('../assets/icons/favorite-star-outline.png', import.meta.url));
  const filledAsset = readFileSync(new URL('../assets/icons/favorite-star-filled.png', import.meta.url));
  assert.notDeepEqual(outlineAsset, filledAsset);
  assert.equal(filled.props.accessible, false);
});
