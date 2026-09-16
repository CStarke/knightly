import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CALVIN_MEAL_PLANS,
  diningHalls,
  diningDollarsSpentLastWeek,
  flexMealsRemaining,
  formatAmount,
  getFlexMealsRemaining,
  getGuestPassesRemaining,
  getStudentMealPlan,
  getSwipeMetricLabel,
  getSwipeResetText,
  getSwipesRemaining,
  getSwipesTotal,
  guestPassesRemaining,
  hallStatus,
  hasFlexMeals,
  hasGuestPasses,
  isBlockPlan,
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
import { student } from '@/data/student';

describe('Dining Data & Balances', () => {
  it('correctly calculates remaining swipes, flex meals, and guest passes for active student', () => {
    const expectedSwipes = getSwipesTotal(mealPlan) - mealPlan.swipesUsed;
    assert.strictEqual(swipesRemaining, expectedSwipes);
    assert.ok(swipesRemaining >= 0);

    const expectedFlex = (mealPlan.flexMeals ?? 0) - (mealPlan.flexMealsUsed ?? 0);
    assert.strictEqual(flexMealsRemaining, expectedFlex);
    assert.ok(flexMealsRemaining >= 0);

    const expectedGuestPasses = (mealPlan.guestPasses ?? 0) - (mealPlan.guestPassesUsed ?? 0);
    assert.strictEqual(guestPassesRemaining, expectedGuestPasses);
    assert.ok(guestPassesRemaining >= 0);
  });

  it('formats knightBucksLabel with two decimal places', () => {
    const label = knightBucksLabel();
    assert.ok(label.startsWith('$'));
    assert.strictEqual(label, `$${mealPlan.knightBucks.toFixed(2)}`);
  });

  describe('Calvin Meal Plans Catalog & Features', () => {
    it('provides all official Core weekly meal plans', () => {
      const corePlans = ['core21', 'core17', 'core14', 'core10', 'core5'] as const;
      for (const id of corePlans) {
        const plan = CALVIN_MEAL_PLANS[id];
        assert.ok(plan, `Plan ${id} should exist in catalog`);
        assert.strictEqual(plan.cadence, 'weekly');
        assert.strictEqual(isBlockPlan(plan), false);
        assert.strictEqual(getSwipeMetricLabel(plan), 'Swipes left');
        assert.strictEqual(getSwipeResetText(plan), 'Swipes reset Sunday at 12:00 a.m.');
      }
    });

    it('provides official semester block plans', () => {
      const blockPlans = ['knollcrest60', 'joust30'] as const;
      for (const id of blockPlans) {
        const plan = CALVIN_MEAL_PLANS[id];
        assert.ok(plan, `Plan ${id} should exist in catalog`);
        assert.strictEqual(plan.cadence, 'semester');
        assert.strictEqual(isBlockPlan(plan), true);
        assert.strictEqual(getSwipeMetricLabel(plan), 'Meals left');
        assert.strictEqual(getSwipeResetText(plan), 'Swipes last through the semester');
        assert.strictEqual(hasFlexMeals(plan), false);
        assert.strictEqual(hasGuestPasses(plan), false);
      }
    });

    it('correctly allocates flex meals and guest passes across plans', () => {
      // Core 21: 3 flex, 2 guest
      assert.strictEqual(CALVIN_MEAL_PLANS.core21.flexMeals, 3);
      assert.strictEqual(CALVIN_MEAL_PLANS.core21.guestPasses, 2);
      assert.strictEqual(hasFlexMeals(CALVIN_MEAL_PLANS.core21), true);
      assert.strictEqual(hasGuestPasses(CALVIN_MEAL_PLANS.core21), true);

      // Core 17: 3 flex, 2 guest
      assert.strictEqual(CALVIN_MEAL_PLANS.core17.flexMeals, 3);
      assert.strictEqual(CALVIN_MEAL_PLANS.core17.guestPasses, 2);

      // Core 14: 2 flex, 2 guest
      assert.strictEqual(CALVIN_MEAL_PLANS.core14.flexMeals, 2);
      assert.strictEqual(CALVIN_MEAL_PLANS.core14.guestPasses, 2);

      // Core 10: 2 flex, 2 guest
      assert.strictEqual(CALVIN_MEAL_PLANS.core10.flexMeals, 2);
      assert.strictEqual(CALVIN_MEAL_PLANS.core10.guestPasses, 2);

      // Core 5: 1 flex, 0 guest
      assert.strictEqual(CALVIN_MEAL_PLANS.core5.flexMeals, 1);
      assert.strictEqual(hasFlexMeals(CALVIN_MEAL_PLANS.core5), true);
      assert.strictEqual(hasGuestPasses(CALVIN_MEAL_PLANS.core5), false);
      assert.strictEqual(getGuestPassesRemaining(CALVIN_MEAL_PLANS.core5), 0);

      // Block plans have neither
      assert.strictEqual(hasFlexMeals(CALVIN_MEAL_PLANS.knollcrest60), false);
      assert.strictEqual(hasGuestPasses(CALVIN_MEAL_PLANS.knollcrest60), false);
      assert.strictEqual(getFlexMealsRemaining(CALVIN_MEAL_PLANS.knollcrest60), 0);
      assert.strictEqual(getGuestPassesRemaining(CALVIN_MEAL_PLANS.knollcrest60), 0);
    });

    it('calculates swipe totals and balances correctly for block and weekly plans', () => {
      const block60 = CALVIN_MEAL_PLANS.knollcrest60;
      assert.strictEqual(getSwipesTotal(block60), 60);
      // Pure plan definition without student usage has 0 used
      assert.strictEqual(getSwipesRemaining(block60), 60);

      // When paired with a student's usage:
      const studentBlockPlan = getStudentMealPlan({
        mealPlanId: 'knollcrest60',
        swipesUsed: 18,
        flexMealsUsed: 0,
        guestPassesUsed: 0,
        knightBucks: 100,
        diningDollars: 0,
      });
      assert.strictEqual(getSwipesTotal(studentBlockPlan), 60);
      assert.strictEqual(getSwipesRemaining(studentBlockPlan), 42); // 60 - 18

      // Active student dynamically matches student.dining
      const expectedTotal = CALVIN_MEAL_PLANS[student.dining.mealPlanId].swipesTotal;
      assert.strictEqual(getSwipesTotal(mealPlan), expectedTotal);
      assert.strictEqual(
        getSwipesRemaining(mealPlan),
        Math.max(0, expectedTotal - student.dining.swipesUsed)
      );
    });

    it('ensures CALVIN_MEAL_PLANS definitions are pure and contain no student-specific usage data', () => {
      for (const plan of Object.values(CALVIN_MEAL_PLANS)) {
        assert.strictEqual(
          (plan as any).swipesUsed,
          undefined,
          `${plan.name} should not contain student swipesUsed`
        );
        assert.strictEqual(
          (plan as any).flexMealsUsed,
          undefined,
          `${plan.name} should not contain student flexMealsUsed`
        );
        assert.strictEqual(
          (plan as any).guestPassesUsed,
          undefined,
          `${plan.name} should not contain student guestPassesUsed`
        );
        assert.ok(
          typeof plan.bundledKnightBucks === 'number',
          `${plan.name} should specify default bundledKnightBucks`
        );
      }
    });

    it('links John Doe dining state from student profile', () => {
      assert.strictEqual(mealPlan.id, student.dining.mealPlanId);
      assert.strictEqual(
        mealPlan.swipesTotal,
        CALVIN_MEAL_PLANS[student.dining.mealPlanId].swipesTotal
      );
      assert.strictEqual(mealPlan.swipesUsed, student.dining.swipesUsed);
      assert.strictEqual(mealPlan.flexMealsUsed, student.dining.flexMealsUsed);
      assert.strictEqual(mealPlan.guestPassesUsed, student.dining.guestPassesUsed);
      assert.strictEqual(mealPlan.knightBucks, student.dining.knightBucks);
      assert.strictEqual(mealPlan.diningDollars, student.dining.diningDollars);
    });
  });

  describe('getSwipeResetText', () => {
    it('handles weekly plan with reset string', () => {
      const plan = {
        name: 'Core 14',
        cadence: 'weekly' as const,
        weekResetsOn: 'Sunday at 12:00 a.m.',
      };
      assert.strictEqual(getSwipeResetText(plan), 'Swipes reset Sunday at 12:00 a.m.');
    });

    it('handles semester-based block plan', () => {
      const plan = {
        name: 'Knollcrest 60 Block',
        cadence: 'semester' as const,
      };
      assert.strictEqual(getSwipeResetText(plan), 'Swipes last through the semester');
    });

    it('falls back gracefully when weekResetsOn is missing', () => {
      const plan = {
        name: 'Custom',
        cadence: 'weekly' as const,
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

      const ddTx: Transaction = {
        id: 'test-4',
        location: "Johnny's",
        detail: 'Burger combo',
        at: 'Yesterday',
        amount: -8.75,
        kind: 'dining-dollars',
      };
      assert.strictEqual(formatAmount(ddTx), '-$8.75');

      const multiSwipeTx: Transaction = {
        id: 'test-5',
        location: 'Commons',
        detail: 'Guest Swipes',
        at: 'Friday',
        amount: -2,
        kind: 'swipe',
      };
      assert.strictEqual(formatAmount(multiSwipeTx), '-2 swipes');
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

    it('validates transaction collection integrity and unique IDs', () => {
      assert.ok(transactions.length >= 5, 'Should have multiple sample transactions');
      const ids = transactions.map((t) => t.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All transaction IDs must be unique');

      for (const tx of transactions) {
        assert.ok(tx.location.length > 0, 'Transaction must have location');
        assert.ok(tx.detail.length > 0, 'Transaction must have detail');
        assert.ok(tx.at.length > 0, 'Transaction must have timestamp string');
        assert.ok(
          ['swipe', 'knightbucks', 'dining-dollars', 'deposit'].includes(tx.kind),
          `Invalid transaction kind ${tx.kind}`
        );
      }
    });
  });

  describe('Edge Cases & Balance Boundary Invariants', () => {
    it('clamps remaining swipes to zero when usage exceeds total', () => {
      const overusedPlan = getStudentMealPlan({
        mealPlanId: 'core14',
        swipesUsed: 20, // 20 > 14
        flexMealsUsed: 0,
        guestPassesUsed: 0,
        knightBucks: 50,
        diningDollars: 0,
      });
      assert.strictEqual(getSwipesTotal(overusedPlan), 14);
      assert.strictEqual(getSwipesRemaining(overusedPlan), 0);
    });

    it('clamps remaining flex meals to zero when usage exceeds allocation', () => {
      const overusedFlex = getStudentMealPlan({
        mealPlanId: 'core21',
        swipesUsed: 5,
        flexMealsUsed: 5, // 5 > 3
        guestPassesUsed: 0,
        knightBucks: 50,
        diningDollars: 0,
      });
      assert.strictEqual(getFlexMealsRemaining(overusedFlex), 0);
    });

    it('clamps remaining guest passes to zero when usage exceeds allocation', () => {
      const overusedGuest = getStudentMealPlan({
        mealPlanId: 'core17',
        swipesUsed: 2,
        flexMealsUsed: 0,
        guestPassesUsed: 4, // 4 > 2
        knightBucks: 50,
        diningDollars: 0,
      });
      assert.strictEqual(getGuestPassesRemaining(overusedGuest), 0);
    });

    it('formats knightBucksLabel with custom and zero amounts', () => {
      assert.strictEqual(knightBucksLabel(0), '$0.00');
      assert.strictEqual(knightBucksLabel(42.5), '$42.50');
      assert.strictEqual(knightBucksLabel(1234.567), '$1234.57');
      assert.strictEqual(knightBucksLabel(100), '$100.00');
    });

    it('verifies food station items in dining halls are non-empty', () => {
      for (const hall of diningHalls) {
        if (hall.stations) {
          assert.ok(hall.stations.length > 0, `${hall.name} stations should not be empty`);
          for (const station of hall.stations) {
            assert.ok(station.name.length > 0, 'Station must have a name');
            assert.ok(station.items.length > 0, `Station ${station.name} in ${hall.name} must have items`);
          }
        }
      }
    });

    it('calculates hall status for retail locations during open and closed times', () => {
      const peets = diningHalls.find((h) => h.id === 'peets')!;
      // Peet's today: 7:30 to 22:00 (450 to 1320 mins)
      const openTime = new Date(2026, 8, 15, 10, 0);
      const openStatus = hallStatus(peets, openTime);
      assert.strictEqual(openStatus.open, true);
      assert.strictEqual(openStatus.label, 'Open now');
      assert.strictEqual(openStatus.detail, 'Closes 10:00 PM');

      const lateNightTime = new Date(2026, 8, 15, 23, 0);
      const lateNightStatus = hallStatus(peets, lateNightTime);
      assert.strictEqual(lateNightStatus.open, false);
      assert.strictEqual(lateNightStatus.label, 'Closed');
      assert.strictEqual(lateNightStatus.detail, 'Opens tomorrow');
    });

    it('calculates hall status for Johnnys during afternoon open and evening closed times', () => {
      const johnnys = diningHalls.find((h) => h.id === 'johnnys')!;
      // Johnny's: 8:00 to 16:00 (480 to 960 mins)
      const noonTime = new Date(2026, 8, 15, 12, 0);
      const noonStatus = hallStatus(johnnys, noonTime);
      assert.strictEqual(noonStatus.open, true);
      assert.strictEqual(noonStatus.label, 'Open now');
      assert.strictEqual(noonStatus.detail, 'Closes 4:00 PM');

      const eveningTime = new Date(2026, 8, 15, 18, 0);
      const eveningStatus = hallStatus(johnnys, eveningTime);
      assert.strictEqual(eveningStatus.open, false);
      assert.strictEqual(eveningStatus.label, 'Closed');
      assert.strictEqual(eveningStatus.detail, 'Opens tomorrow');
    });
  });
});
