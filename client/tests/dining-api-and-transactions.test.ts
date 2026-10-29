/**
 * Calvin Autonomous Dining API Client & Transaction Invariant Tests
 *
 * ARCHITECTURAL RATIONALE:
 * Validates the dining services API client, venue operating status mappings,
 * student dining balance calculations, and offline resilience invariants.
 *
 * DOMAIN INVARIANTS:
 * 1. Sunday 12:00 a.m. weekly cycle reset for Core plans.
 * 2. Non-negative swipe and balance bounds: swipesRemaining >= 0, flexMealsRemaining >= 0.
 * 3. Offline Resilience (Sprint 1 SLO SC2): Zero unhandled crashes when server is offline.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CALVIN_MEAL_PLANS,
  diningHalls,
  getSwipeResetText,
  getSwipesRemaining,
  isBlockPlan,
  mealPlan as defaultMealPlan,
} from '../src/data/dining';
import {
  fetchDiningSummaryApi,
  fetchDiningVenuesApi,
  getDefaultDiningSummary,
  recordDiningTransactionApi,
} from '../src/services/dining-api';

describe('Calvin Autonomous Dining API & Transaction Invariants', () => {
  describe('Dining Venues & Operating Windows API', () => {
    it('returns valid dining venues conforming to EnrichedDiningVenue interface', async () => {
      const venues = await fetchDiningVenuesApi();
      assert.ok(Array.isArray(venues), 'Venues must be an array');
      assert.ok(venues.length > 0, 'Must contain at least 1 venue');

      const commons = venues.find((v) => v.id === 'commons');
      assert.ok(commons, 'Commons Dining Hall must be listed');
      assert.strictEqual(commons.name, 'Commons Dining Hall');
      assert.strictEqual(commons.acceptsSwipes, true);
      assert.ok(['Open', 'Closed'].includes(commons.status));
    });

    it('falls back cleanly to seed dining halls when backend server is offline', async () => {
      const venues = await fetchDiningVenuesApi();
      assert.ok(venues.length >= diningHalls.length);
      for (const venue of venues) {
        assert.ok(venue.id, 'Venue must have an id');
        assert.ok(venue.name, 'Venue must have a name');
        assert.ok(typeof venue.acceptsSwipes === 'boolean');
      }
    });
  });

  describe('Student Dining Account & Balance Summary API', () => {
    it('provides a complete default offline dining summary matching default student', () => {
      const summary = getDefaultDiningSummary();
      assert.strictEqual(summary.mealPlanId, defaultMealPlan.id);
      assert.strictEqual(summary.mealPlanName, defaultMealPlan.name);
      assert.strictEqual(summary.swipesTotal, defaultMealPlan.swipesTotal);
      assert.ok(summary.swipesRemaining >= 0, 'Swipes remaining cannot be negative');
      assert.strictEqual(summary.cadence, defaultMealPlan.cadence);
      assert.strictEqual(typeof summary.knightBucks, 'number');
      assert.strictEqual(typeof summary.diningDollars, 'number');
    });

    it('fetches student dining summary and gracefully falls back to seed data if server is offline', async () => {
      const summary = await fetchDiningSummaryApi('2346052');
      assert.ok(summary, 'Must return a valid summary');
      assert.ok(summary.mealPlanId, 'Must include mealPlanId');
      assert.ok(summary.swipesTotal > 0, 'Must have positive total swipes');
      assert.ok(summary.swipesRemaining <= summary.swipesTotal, 'Remaining cannot exceed total');
    });

    it('accurately distinguishes weekly plans from semester block plans', () => {
      assert.strictEqual(isBlockPlan(CALVIN_MEAL_PLANS.knollcrest60), true);
      assert.strictEqual(isBlockPlan(CALVIN_MEAL_PLANS.joust30), true);
      assert.strictEqual(isBlockPlan(CALVIN_MEAL_PLANS.core21), false);
      assert.strictEqual(isBlockPlan(CALVIN_MEAL_PLANS.core14), false);
    });

    it('generates descriptive swipe reset text based on plan cadence', () => {
      const weeklyReset = getSwipeResetText(CALVIN_MEAL_PLANS.core21);
      assert.ok(weeklyReset.includes('Sunday at 12:00 a.m.'));

      const blockReset = getSwipeResetText(CALVIN_MEAL_PLANS.knollcrest60);
      assert.ok(blockReset.includes('semester'));
    });
  });

  describe('Dining Transaction & Ledger API', () => {
    it('handles transaction submission gracefully without unhandled exceptions when offline', async () => {
      const result = await recordDiningTransactionApi({
        studentId: '2346052',
        venueId: 'commons',
        transactionType: 'meal_swipe',
        amount: 1,
        description: 'Dinner Swipe',
      });

      assert.ok(typeof result.success === 'boolean');
    });

    it('enforces non-negative swipe calculation boundaries', () => {
      const computedZero = getSwipesRemaining({ swipesTotal: 14, swipesUsed: 20 });
      assert.strictEqual(computedZero, 0, 'Swipes remaining must never be negative');

      const computedNormal = getSwipesRemaining({ swipesTotal: 14, swipesUsed: 7 });
      assert.strictEqual(computedNormal, 7);
    });
  });
});
