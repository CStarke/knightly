import { describe, it } from 'node:test';
import assert from 'node:assert';
import { distributeIntoRows } from '@/utils/chip-layout';
import { feedCategories } from '@/data/feed';

describe('Chip Layout & Category Grid Partitioning', () => {
  describe('distributeIntoRows', () => {
    it('distributes 12 feed categories into exactly 3 rows of 4 chips each', () => {
      const rows = distributeIntoRows(feedCategories, 4);
      assert.strictEqual(rows.length, 3, '12 categories must take 3 rows with max 4 per row');
      assert.strictEqual(rows[0].length, 4);
      assert.strictEqual(rows[1].length, 4);
      assert.strictEqual(rows[2].length, 4);

      assert.deepStrictEqual(rows[0], ['Academics', 'Athletics', 'Career', 'Culture']);
      assert.deepStrictEqual(rows[1], ['Faith', 'Gaming', 'Music', 'Outdoors']);
      assert.deepStrictEqual(rows[2], ['Service', 'Social', 'The Arts', 'Wellness']);
    });

    it('handles empty list safely', () => {
      const rows = distributeIntoRows([], 4);
      assert.deepStrictEqual(rows, []);
    });

    it('handles single item', () => {
      const rows = distributeIntoRows(['Academics'], 4);
      assert.deepStrictEqual(rows, [['Academics']]);
    });

    it('distributes across minimum rows for varying item counts', () => {
      const testCases: { count: number; maxPerRow: number; expectedRowSizes: number[] }[] = [
        { count: 4, maxPerRow: 4, expectedRowSizes: [4] },
        { count: 5, maxPerRow: 4, expectedRowSizes: [3, 2] },
        { count: 6, maxPerRow: 4, expectedRowSizes: [3, 3] },
        { count: 7, maxPerRow: 4, expectedRowSizes: [4, 3] },
        { count: 8, maxPerRow: 4, expectedRowSizes: [4, 4] },
        { count: 9, maxPerRow: 4, expectedRowSizes: [3, 3, 3] },
        { count: 10, maxPerRow: 4, expectedRowSizes: [4, 3, 3] },
        { count: 11, maxPerRow: 4, expectedRowSizes: [4, 4, 3] },
        { count: 12, maxPerRow: 4, expectedRowSizes: [4, 4, 4] },
        { count: 13, maxPerRow: 4, expectedRowSizes: [4, 3, 3, 3] },
        { count: 14, maxPerRow: 4, expectedRowSizes: [4, 4, 3, 3] },
        { count: 15, maxPerRow: 4, expectedRowSizes: [4, 4, 4, 3] },
        { count: 16, maxPerRow: 4, expectedRowSizes: [4, 4, 4, 4] },
      ];

      for (const { count, maxPerRow, expectedRowSizes } of testCases) {
        const items = Array.from({ length: count }, (_, i) => `item-${i}`);
        const rows = distributeIntoRows(items, maxPerRow);

        const actualSizes = rows.map((r) => r.length);
        assert.deepStrictEqual(
          actualSizes,
          expectedRowSizes,
          `Failed for count ${count}: expected sizes [${expectedRowSizes}], got [${actualSizes}]`
        );

        // Invariant: sum of row sizes equals count
        assert.strictEqual(
          actualSizes.reduce((a, b) => a + b, 0),
          count
        );

        // Invariant: minimum number of rows
        assert.strictEqual(rows.length, Math.ceil(count / maxPerRow));

        // Invariant: perfectly balanced (max row length - min row length <= 1)
        const maxLen = Math.max(...actualSizes);
        const minLen = Math.min(...actualSizes);
        assert.ok(maxLen - minLen <= 1, `Row lengths must be balanced within 1: ${actualSizes}`);

        // Invariant: items flattened matches original order
        const flat = rows.flat();
        assert.deepStrictEqual(flat, items);
      }
    });

    it('safely handles non-positive maxPerRow', () => {
      const items = ['A', 'B', 'C'];
      assert.deepStrictEqual(distributeIntoRows(items, 0), [['A', 'B', 'C']]);
      assert.deepStrictEqual(distributeIntoRows(items, -1), [['A', 'B', 'C']]);
    });
  });
});
