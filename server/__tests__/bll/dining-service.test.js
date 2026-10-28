const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockDal } = require('../mocks/mock-dal');
const {
  getWeekCycleStartDate,
  getStudentDiningSummary,
  validateTenderSufficiency,
  processTransaction,
  evaluateVenueStatus,
  formatMinuteOfDay,
} = require('../../services/dining-service');

test('Calvin Dining Service BLL Invariants', async (t) => {
  await t.test('calculates Sunday 12:00 a.m. weekly cycle boundary accurately', () => {
    // Reference: Wednesday, October 28, 2026 at 14:30:00 UTC
    const wednesday = new Date('2026-10-28T14:30:00.000Z');
    const cycleStart = getWeekCycleStartDate(wednesday);

    // Expect: Sunday, October 25, 2026 at 00:00:00.000 UTC
    assert.equal(cycleStart.getUTCDay(), 0, 'Must rewind to Sunday');
    assert.equal(cycleStart.toISOString(), '2026-10-25T00:00:00.000Z');
  });

  await t.test('computes remaining swipes for weekly meal plan (Core 21)', async () => {
    const { diningDal, state } = createMockDal();
    const studentId = 'student-test-uuid-1';

    // Seed student dining account with Core 21
    await diningDal.upsertStudentDiningAccount({
      student_id: studentId,
      meal_plan_id: 'core21',
      swipes_used: 0,
      flex_meals_used: 1,
      guest_passes_used: 0,
      knight_bucks: 160.0,
      dining_dollars: 0.0,
    });

    // Conduct 3 meal swipes during this week
    const now = new Date('2026-10-28T12:00:00.000Z');
    await diningDal.recordDiningTransaction({
      studentId,
      venueId: 'commons',
      transactionType: 'meal_swipe',
      amount: 1,
    });
    await diningDal.recordDiningTransaction({
      studentId,
      venueId: 'commons',
      transactionType: 'meal_swipe',
      amount: 2,
    });

    const summary = await getStudentDiningSummary(studentId, { now }, diningDal);

    assert.equal(summary.mealPlanId, 'core21');
    assert.equal(summary.swipesTotal, 21);
    assert.equal(summary.swipesUsed, 3);
    assert.equal(summary.swipesRemaining, 18, '21 total - 3 used = 18 remaining');
    assert.equal(summary.flexMealsRemaining, 2, '3 total - 1 used = 2 remaining');
    assert.equal(summary.knightBucks, 160.0);
  });

  await t.test('enforces tender sufficiency and rejects transactions with insufficient balance', () => {
    const mockSummary = {
      swipesRemaining: 1,
      flexMealsRemaining: 0,
      guestPassesRemaining: 0,
      knightBucks: 5.5,
      diningDollars: 0.0,
    };

    // Valid meal swipe
    assert.doesNotThrow(() => {
      validateTenderSufficiency(mockSummary, 'meal_swipe', 1);
    });

    // Insufficient meal swipes
    assert.throws(
      () => {
        validateTenderSufficiency(mockSummary, 'meal_swipe', 2);
      },
      { message: /Insufficient meal swipes/ }
    );

    // Insufficient flex meals
    assert.throws(
      () => {
        validateTenderSufficiency(mockSummary, 'flex_meal', 1);
      },
      { message: /Insufficient flex meals/ }
    );

    // Insufficient Knight Bucks
    assert.throws(
      () => {
        validateTenderSufficiency(mockSummary, 'knight_bucks', 10.0);
      },
      { message: /Insufficient Knight Bucks/ }
    );
  });

  await t.test('processes dining transaction and updates ledger & account balances atomically', async () => {
    const { diningDal } = createMockDal();
    const studentId = 'student-test-uuid-2';

    await diningDal.upsertStudentDiningAccount({
      student_id: studentId,
      meal_plan_id: 'core17',
      swipes_used: 0,
      flex_meals_used: 0,
      guest_passes_used: 0,
      knight_bucks: 125.0,
      dining_dollars: 0.0,
    });

    const now = new Date('2026-10-28T12:30:00.000Z');

    // Conduct transaction for $12.50 Knight Bucks
    const result = await processTransaction(
      {
        studentId,
        venueId: 'peets',
        transactionType: 'knight_bucks',
        amount: 12.5,
        now,
      },
      diningDal
    );

    assert.equal(result.success, true);
    assert.equal(result.transaction.amount, 12.5);
    assert.equal(result.account.knightBucks, 112.5, '$125.00 - $12.50 = $112.50');
  });

  await t.test('evaluates venue operating status correctly based on time of day', () => {
    const venue = {
      dining_hours: [
        {
          day_of_week: 1, // Monday
          meal_period: 'Lunch',
          start_minute_after_midnight: 660, // 11:00 AM
          end_minute_after_midnight: 840, // 2:00 PM
        },
      ],
    };

    // Monday at 12:15 PM (735 minutes after midnight)
    const mondayLunch = new Date(2026, 9, 26, 12, 15, 0); // Month is 0-indexed: 9 = October
    // Ensure getDay() is Monday (1)
    if (mondayLunch.getDay() === 1) {
      const status = evaluateVenueStatus(venue, mondayLunch);
      assert.equal(status.isOpen, true);
      assert.equal(status.currentMeal, 'Lunch');
      assert.equal(status.hoursDisplay, '11:00 AM - 2:00 PM');
    }

    assert.equal(formatMinuteOfDay(420), '7:00 AM');
    assert.equal(formatMinuteOfDay(1020), '5:00 PM');
  });
});
