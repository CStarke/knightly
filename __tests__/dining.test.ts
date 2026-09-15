import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  diningHalls,
  diningDollarsSpentLastWeek,
  flexMealsRemaining,
  formatAmount,
  getSwipeResetText,
  guestPassesRemaining,
  hallStatus,
  knightBucksLabel,
  knightBucksSpentLastWeek,
  mealPlan,
  swipesRemaining,
  swipesUsedLastWeek,
  transactions,
  type DiningHall,
  type MealPlan,
  type Transaction,
} from '@/data/dining';

describe('Dining Data & Balances', () => {
  it('correctly calculates remaining swipes, flex meals, and guest passes', () => {
    const expectedSwipes = (mealPlan.swipesTotal ?? mealPlan.swipesPerWeek) - mealPlan.swipesUsed;
    assert.strictEqual(swipesRemaining, expectedSwipes);
    assert.ok(swipesRemaining >= 0);

    const expectedFlex = (mealPlan.flexMeals ?? 2) - (mealPlan.flexMealsUsed ?? 0);
    assert.strictEqual(flexMealsRemaining, expectedFlex);
    assert.ok(flexMealsRemaining >= 0);

    const expectedGuestPasses = mealPlan.guestPasses - mealPlan.guestPassesUsed;
    assert.strictEqual(guestPassesRemaining, expectedGuestPasses);
    assert.ok(guestPassesRemaining >= 0);
  });

  it('formats knightBucksLabel with two decimal places', () => {
    const label = knightBucksLabel();
    assert.ok(label.startsWith('$'));
    assert.strictEqual(label, `$${mealPlan.knightBucks.toFixed(2)}`);
  });

  describe('getSwipeResetText', () => {
    it('handles weekly plan with reset string', () => {
      const plan: MealPlan = {
        name: 'Core 14',
        cadence: 'weekly',
        swipesPerWeek: 14,
        swipesUsed: 2,
        guestPasses: 2,
        guestPassesUsed: 0,
        knightBucks: 50,
        diningDollars: 50,
        weekResetsOn: 'Sunday at 12:00 a.m.',
      };
      assert.strictEqual(getSwipeResetText(plan), 'Swipes reset Sunday at 12:00 a.m.');
    });

    it('handles semester-based block plan', () => {
      const plan: MealPlan = {
        name: 'Block 60',
        cadence: 'semester',
        swipesPerWeek: 60,
        swipesUsed: 10,
        guestPasses: 0,
        guestPassesUsed: 0,
        knightBucks: 0,
        diningDollars: 0,
      };
      assert.strictEqual(getSwipeResetText(plan), 'Swipes last through the semester');
    });

    it('falls back gracefully when weekResetsOn is missing', () => {
      const plan: MealPlan = {
        name: 'Custom',
        swipesPerWeek: 10,
        swipesUsed: 0,
        guestPasses: 0,
        guestPassesUsed: 0,
        knightBucks: 0,
        diningDollars: 0,
      };
      assert.strictEqual(getSwipeResetText(plan), 'Swipes last through the semester');
    });
  });

  describe('Dining Halls & Hours', () => {
    it('contains all five primary dining locations', () => {
      const ids = diningHalls.map((h) => h.id);
      assert.ok(ids.includes('commons'));
      assert.ok(ids.includes('knollcrest'));
      assert.ok(ids.includes('uppercrust'));
      assert.ok(ids.includes('peets'));
      assert.ok(ids.includes('johnnys'));
    });

    it('ensures service windows have start time strictly before end time', () => {
      for (const hall of diningHalls) {
        assert.ok(hall.today.length > 0, `${hall.name} should have service windows`);
        for (const window of hall.today) {
          assert.ok(
            window.start < window.end,
            `${hall.name} window ${window.label} start (${window.start}) must be before end (${window.end})`
          );
        }
      }
    });

    it('verifies Commons and Knollcrest accept swipes while retail spots do not', () => {
      const commons = diningHalls.find((h) => h.id === 'commons')!;
      const knollcrest = diningHalls.find((h) => h.id === 'knollcrest')!;
      const peets = diningHalls.find((h) => h.id === 'peets')!;
      const uppercrust = diningHalls.find((h) => h.id === 'uppercrust')!;
      const johnnys = diningHalls.find((h) => h.id === 'johnnys')!;

      assert.strictEqual(commons.acceptsSwipes, true);
      assert.strictEqual(knollcrest.acceptsSwipes, true);
      assert.strictEqual(peets.acceptsSwipes, false);
      assert.strictEqual(uppercrust.acceptsSwipes, false);
      assert.strictEqual(johnnys.acceptsSwipes, false);
    });

    it('calculates hall status during active service window', () => {
      const commons = diningHalls.find((h) => h.id === 'commons')!;
      // Commons breakfast is 7:00 to 10:00 (420 to 600 mins)
      const atEightAM = new Date(2026, 8, 15, 8, 0);
      const status = hallStatus(commons, atEightAM);
      assert.strictEqual(status.open, true);
      assert.strictEqual(status.label, 'Breakfast now');
      assert.strictEqual(status.detail, 'Closes 10:00 AM');
    });

    it('calculates hall status between service windows', () => {
      const commons = diningHalls.find((h) => h.id === 'commons')!;
      // Commons is closed between 10:00 and 11:00 (Lunch opens at 11:00)
      const atTenThirtyAM = new Date(2026, 8, 15, 10, 30);
      const status = hallStatus(commons, atTenThirtyAM);
      assert.strictEqual(status.open, false);
      assert.strictEqual(status.label, 'Closed');
      assert.strictEqual(status.detail, 'Lunch at 11:00 AM');
    });

    it('calculates hall status late night after all service windows close', () => {
      const commons = diningHalls.find((h) => h.id === 'commons')!;
      // Commons dinner ends at 21:00 (9:00 PM)
      const atElevenPM = new Date(2026, 8, 15, 23, 0);
      const status = hallStatus(commons, atElevenPM);
      assert.strictEqual(status.open, false);
      assert.strictEqual(status.label, 'Closed');
      assert.strictEqual(status.detail, 'Opens tomorrow');
    });
  });

  describe('Transactions & Activity Metrics', () => {
    it('formats transaction amounts accurately', () => {
      const swipeTx: Transaction = {
        id: 'test-1',
        location: 'Commons',
        detail: 'Lunch',
        at: 'Today',
        amount: -1,
        kind: 'swipe',
      };
      assert.strictEqual(formatAmount(swipeTx), '-1 swipe');

      const spendTx: Transaction = {
        id: 'test-2',
        location: "Peet's Coffee",
        detail: 'Latte',
        at: 'Today',
        amount: -4.5,
        kind: 'knightbucks',
      };
      assert.strictEqual(formatAmount(spendTx), '-$4.50');

      const depositTx: Transaction = {
        id: 'test-3',
        location: 'Online',
        detail: 'Deposit',
        at: 'Today',
        amount: 50,
        kind: 'deposit',
      };
      assert.strictEqual(formatAmount(depositTx), '+$50.00');
    });

    it('computes 7-day usage metrics correctly matching transactions', () => {
      const calculatedSwipesUsed = transactions
        .filter((tx) => tx.kind === 'swipe' && tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      assert.strictEqual(swipesUsedLastWeek, calculatedSwipesUsed);

      const calculatedKBSpent = transactions
        .filter((tx) => tx.kind === 'knightbucks' && tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      assert.strictEqual(knightBucksSpentLastWeek, calculatedKBSpent);

      const calculatedDDSpent = transactions
        .filter((tx) => tx.kind === 'dining-dollars' && tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      assert.strictEqual(diningDollarsSpentLastWeek, calculatedDDSpent);
    });
  });
});
