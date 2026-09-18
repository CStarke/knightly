/**
 * Automatically spreads any number of items evenly over the minimum number
 * of rows that can hold all items with at most `maxPerRow` items in each row.
 *
 * Example:
 * 12 items, maxPerRow = 4 -> 3 rows of [4, 4, 4]
 * 11 items, maxPerRow = 4 -> 3 rows of [4, 4, 3]
 * 13 items, maxPerRow = 4 -> 4 rows of [4, 3, 3, 3]
 */
export function distributeIntoRows<T>(items: readonly T[], maxPerRow = 4): T[][] {
  if (!items || items.length === 0) return [];
  if (maxPerRow <= 0) return [Array.from(items)];

  const numRows = Math.ceil(items.length / maxPerRow);
  const baseSize = Math.floor(items.length / numRows);
  const remainder = items.length % numRows;

  const rows: T[][] = [];
  let currentIndex = 0;

  for (let i = 0; i < numRows; i++) {
    const rowSize = baseSize + (i < remainder ? 1 : 0);
    rows.push(items.slice(currentIndex, currentIndex + rowSize));
    currentIndex += rowSize;
  }

  return rows;
}
