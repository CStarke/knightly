/**
 * Calvin Autonomous Dining Business Logic Layer (BLL)
 *
 * ARCHITECTURAL RATIONALE:
 * Implements the core business rules for Calvin University's dining system:
 * - Time-windowed swipe calculations preventing cron-job desyncs (Sunday 12:00 a.m. reset cycle)
 * - Weekly Core plans vs. semester block plans
 * - Pre-flight balance and tender validation before ledger insertion
 * - Venue operational status and current meal period resolution
 *
 * Fully decoupled from PostgREST/Supabase by accepting an injectable DAL.
 */

const defaultDiningDal = require('../dal/dining-dal');

/**
 * Calculates the UTC Date representing the start of the current dining week cycle.
 * Calvin weekly meal plans reset every Sunday at 12:00:00 a.m.
 *
 * @param {Date} [referenceDate=new Date()] - Reference date
 * @returns {Date} Date object for Sunday 00:00:00 of current cycle
 */
function getWeekCycleStartDate(referenceDate = new Date()) {
  const d = new Date(referenceDate.getTime());
  // Step 1: Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const day = d.getUTCDay();

  // Step 2: Rewind to the most recent Sunday 00:00:00.000 UTC
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Computes a student's dining account summary, calculating remaining swipes
 * based on meal plan cadence (weekly vs semester) and current time window.
 *
 * @param {string} studentId - Student UUID
 * @param {object} [options={}] - Calculation options
 * @param {Date} [options.now=new Date()] - Evaluation timestamp
 * @param {object} [dal=defaultDiningDal] - Injected DAL
 * @returns {Promise<object>} Dining summary
 */
async function getStudentDiningSummary(studentId, options = {}, dal = defaultDiningDal) {
  const now = options.now || new Date();

  // Step 1: Fetch student account and assigned meal plan
  const account = await dal.getStudentDiningAccount(studentId);
  if (!account) {
    throw new Error(`[dining-service] Dining account not found for student ${studentId}`);
  }

  const mealPlan = account.meal_plan;
  if (!mealPlan) {
    throw new Error(`[dining-service] Meal plan not associated with account for student ${studentId}`);
  }

  let swipesUsed = 0;
  let swipesRemaining = 0;

  // Step 2: Determine swipe usage based on plan cadence
  if (mealPlan.cadence === 'weekly') {
    // Weekly plan: Calculate swipes consumed within current Sunday-Saturday window
    const cycleStart = getWeekCycleStartDate(now);
    const recentTx = await dal.getDiningTransactions(studentId, {
      sinceDate: cycleStart.toISOString(),
      limit: 500,
    });

    // Sum meal swipes during this cycle
    const cycleSwipes = recentTx
      .filter((tx) => tx.transaction_type === 'meal_swipe')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    swipesUsed = cycleSwipes;
    swipesRemaining = Math.max(0, mealPlan.swipes_total - cycleSwipes);
  } else {
    // Semester block plan: Total swipes used across entire semester
    swipesUsed = Number(account.swipes_used || 0);
    swipesRemaining = Math.max(0, mealPlan.swipes_total - swipesUsed);
  }

  // Step 3: Compute flex meals and guest passes remaining
  const flexMealsRemaining = Math.max(0, mealPlan.flex_meals - Number(account.flex_meals_used || 0));
  const guestPassesRemaining = Math.max(0, mealPlan.guest_passes - Number(account.guest_passes_used || 0));

  return {
    studentId: account.student_id,
    mealPlanId: mealPlan.id,
    mealPlanName: mealPlan.name,
    cadence: mealPlan.cadence,
    swipesTotal: mealPlan.swipes_total,
    swipesUsed,
    swipesRemaining,
    flexMealsRemaining,
    guestPassesRemaining,
    knightBucks: Number(account.knight_bucks || 0),
    diningDollars: Number(account.dining_dollars || 0),
    updatedAt: account.updated_at,
  };
}

/**
 * Validates whether a student has sufficient balance/tender for a proposed transaction.
 * Throws a descriptive Error if funds or swipes are insufficient.
 *
 * @param {object} summary - Account summary from getStudentDiningSummary
 * @param {'meal_swipe'|'flex_meal'|'guest_pass'|'knight_bucks'|'dining_dollars'} transactionType
 * @param {number} amount - Transaction amount
 */
function validateTenderSufficiency(summary, transactionType, amount) {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error(`[dining-service] Invalid transaction amount: ${amount}`);
  }

  switch (transactionType) {
    case 'meal_swipe':
      if (summary.swipesRemaining < numAmount) {
        throw new Error(
          `[dining-service] Insufficient meal swipes. Remaining: ${summary.swipesRemaining}, Required: ${numAmount}`
        );
      }
      break;

    case 'flex_meal':
      if (summary.flexMealsRemaining < numAmount) {
        throw new Error(
          `[dining-service] Insufficient flex meals. Remaining: ${summary.flexMealsRemaining}, Required: ${numAmount}`
        );
      }
      break;

    case 'guest_pass':
      if (summary.guestPassesRemaining < numAmount) {
        throw new Error(
          `[dining-service] Insufficient guest passes. Remaining: ${summary.guestPassesRemaining}, Required: ${numAmount}`
        );
      }
      break;

    case 'knight_bucks':
      if (summary.knightBucks < numAmount) {
        throw new Error(
          `[dining-service] Insufficient Knight Bucks. Balance: $${summary.knightBucks.toFixed(2)}, Required: $${numAmount.toFixed(2)}`
        );
      }
      break;

    case 'dining_dollars':
      if (summary.diningDollars < numAmount) {
        throw new Error(
          `[dining-service] Insufficient Dining Dollars. Balance: $${summary.diningDollars.toFixed(2)}, Required: $${numAmount.toFixed(2)}`
        );
      }
      break;

    default:
      throw new Error(`[dining-service] Unsupported transaction type: ${transactionType}`);
  }
}

/**
 * Conducts a dining transaction with validation, recording it in the ledger.
 *
 * @param {object} params
 * @param {string} params.studentId - Student UUID
 * @param {string} params.venueId - Venue identifier
 * @param {'meal_swipe'|'flex_meal'|'guest_pass'|'knight_bucks'|'dining_dollars'} params.transactionType
 * @param {number} params.amount - Transaction amount
 * @param {string} [params.registerId] - Kiosk or register identifier
 * @param {string} [params.cashierId] - Cashier staff identifier
 * @param {string} [params.description] - Description
 * @param {Date} [params.now=new Date()] - Transaction timestamp
 * @param {object} [dal=defaultDiningDal] - Injected DAL
 * @returns {Promise<object>} Result containing recorded transaction and updated summary
 */
async function processTransaction(params, dal = defaultDiningDal) {
  const { studentId, venueId, transactionType, amount } = params;
  const now = params.now || new Date();

  // Step 1: Pre-flight balance check
  const summaryBefore = await getStudentDiningSummary(studentId, { now }, dal);
  validateTenderSufficiency(summaryBefore, transactionType, amount);

  // Step 2: Record immutable transaction in ledger
  const txRecord = await dal.recordDiningTransaction({
    studentId,
    venueId,
    transactionType,
    amount,
    registerId: params.registerId || 'kiosk-main',
    cashierId: params.cashierId || null,
    description: params.description || `${transactionType} at ${venueId}`,
    externalTransactRef: params.externalTransactRef || null,
  });

  // Step 3: Fetch updated summary
  const summaryAfter = await getStudentDiningSummary(studentId, { now }, dal);

  return {
    success: true,
    transaction: txRecord,
    account: summaryAfter,
  };
}

/**
 * Evaluates the current operational status for a dining venue given a reference time.
 *
 * @param {object} venue - Venue record including dining_hours array
 * @param {Date} [referenceDate=new Date()] - Evaluation time
 * @returns {object} Status object: { isOpen, currentMeal, hoursDisplay }
 */
function evaluateVenueStatus(venue, referenceDate = new Date()) {
  const hoursList = venue.dining_hours || [];
  if (hoursList.length === 0) {
    return {
      isOpen: false,
      currentMeal: 'Closed',
      hoursDisplay: 'Hours not posted',
    };
  }

  // Step 1: Determine day of week (0=Sunday .. 6=Saturday) and current minute after midnight
  const dayOfWeek = referenceDate.getDay();
  const currentMinute = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  // Step 2: Find active meal period for today
  const activePeriod = hoursList.find(
    (h) =>
      h.day_of_week === dayOfWeek &&
      currentMinute >= h.start_minute_after_midnight &&
      currentMinute < h.end_minute_after_midnight
  );

  if (activePeriod) {
    const startStr = formatMinuteOfDay(activePeriod.start_minute_after_midnight);
    const endStr = formatMinuteOfDay(activePeriod.end_minute_after_midnight);
    return {
      isOpen: true,
      currentMeal: activePeriod.meal_period,
      hoursDisplay: `${startStr} - ${endStr}`,
    };
  }

  // Step 3: If not currently open, find next upcoming period today
  const nextToday = hoursList
    .filter((h) => h.day_of_week === dayOfWeek && h.start_minute_after_midnight > currentMinute)
    .sort((a, b) => a.start_minute_after_midnight - b.start_minute_after_midnight)[0];

  if (nextToday) {
    const startStr = formatMinuteOfDay(nextToday.start_minute_after_midnight);
    return {
      isOpen: false,
      currentMeal: `Opens at ${startStr} (${nextToday.meal_period})`,
      hoursDisplay: 'Closed',
    };
  }

  return {
    isOpen: false,
    currentMeal: 'Closed',
    hoursDisplay: 'Closed',
  };
}

/**
 * Helper to convert minutes after midnight to 12-hour AM/PM string.
 *
 * @param {number} totalMinutes - Minutes after midnight (e.g. 420 -> "7:00 AM")
 * @returns {string} Formatted time string
 */
function formatMinuteOfDay(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const minPad = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours12}:${minPad} ${ampm}`;
}

module.exports = {
  getWeekCycleStartDate,
  getStudentDiningSummary,
  validateTenderSufficiency,
  processTransaction,
  evaluateVenueStatus,
  formatMinuteOfDay,
};
