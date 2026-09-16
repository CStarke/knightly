import {
  student,
  type CalvinMealPlanId,
  type StudentDining,
} from "@/data/student";

export { type CalvinMealPlanId, type StudentDining };

export type MealPlanCadence = "weekly" | "semester";

/**
 * Universal definition of a Calvin University meal plan.
 * Pure plan configuration and rules without any student-specific consumption data.
 * Can be assigned to any student.
 */
export type MealPlan = {
  id: CalvinMealPlanId;
  name: string;
  cadence: MealPlanCadence;
  /** Swipes allocated for the period (per week for weekly plans, per semester for semester block plans). */
  swipesTotal: number;
  /** Flex meal equivalencies (e.g. 1-3/week for Core plans). Omitted or 0 on block plans. */
  flexMeals?: number;
  /** Guest passes (per semester). Omitted or 0 on block plans and Core 5. */
  guestPasses?: number;
  /** KnightBucks bundled by default with this plan per semester. */
  bundledKnightBucks: number;
  /** Reset schedule text if plan resets weekly (e.g. "Sunday at 12:00 a.m."). */
  weekResetsOn?: string;
  /** Descriptive overview of the plan. */
  description?: string;
};

/**
 * Official Calvin University Meal Plans catalog (Core Weekly & Semester Block).
 * Purely plan archetypes available to all students.
 */
export const CALVIN_MEAL_PLANS: Record<CalvinMealPlanId, MealPlan> = {
  core21: {
    id: "core21",
    name: "Core 21",
    cadence: "weekly",
    swipesTotal: 21,
    flexMeals: 3,
    guestPasses: 2,
    bundledKnightBucks: 160.0,
    weekResetsOn: "Sunday at 12:00 a.m.",
    description:
      "21 meals/week + 3 flex meals + 2 guest passes. Best for students eating 3 meals/day.",
  },
  core17: {
    id: "core17",
    name: "Core 17",
    cadence: "weekly",
    swipesTotal: 17,
    flexMeals: 3,
    guestPasses: 2,
    bundledKnightBucks: 125.0,
    weekResetsOn: "Sunday at 12:00 a.m.",
    description: "17 meals/week + 3 flex meals + 2 guest passes.",
  },
  core14: {
    id: "core14",
    name: "Core 14",
    cadence: "weekly",
    swipesTotal: 14,
    flexMeals: 2,
    guestPasses: 2,
    bundledKnightBucks: 80.0,
    weekResetsOn: "Sunday at 12:00 a.m.",
    description:
      "14 meals/week + 2 flex meals + 2 guest passes. Most popular choice.",
  },
  core10: {
    id: "core10",
    name: "Core 10",
    cadence: "weekly",
    swipesTotal: 10,
    flexMeals: 2,
    guestPasses: 2,
    bundledKnightBucks: 70.0,
    weekResetsOn: "Sunday at 12:00 a.m.",
    description: "10 meals/week + 2 flex meals + 2 guest passes.",
  },
  core5: {
    id: "core5",
    name: "Core 5",
    cadence: "weekly",
    swipesTotal: 5,
    flexMeals: 1,
    guestPasses: 0,
    bundledKnightBucks: 35.0,
    weekResetsOn: "Sunday at 12:00 a.m.",
    description: "5 meals/week + 1 flex meal. No guest passes.",
  },
  knollcrest60: {
    id: "knollcrest60",
    name: "Knollcrest 60 Block",
    cadence: "semester",
    swipesTotal: 60,
    bundledKnightBucks: 30.0,
    description: "60 meals per semester for apartments or commuters.",
  },
  joust30: {
    id: "joust30",
    name: "Joust 30 Block",
    cadence: "semester",
    swipesTotal: 30,
    bundledKnightBucks: 15.0,
    description: "30 meals per semester for light campus dining.",
  },
};

/** Combined student meal plan and active balance state. */
export type ActiveStudentMealPlan = MealPlan & {
  swipesUsed: number;
  flexMealsUsed: number;
  guestPassesUsed: number;
  knightBucks: number;
  diningDollars: number;
};

/**
 * Resolves a student's dining account and joins it with the corresponding plan definition.
 * Defaults to John Doe's dining account from student.ts.
 */
export function getStudentMealPlan(
  diningAccount: StudentDining = student.dining,
): ActiveStudentMealPlan {
  const plan =
    CALVIN_MEAL_PLANS[diningAccount.mealPlanId] ?? CALVIN_MEAL_PLANS.core21;
  return {
    ...plan,
    swipesUsed: diningAccount.swipesUsed,
    flexMealsUsed: diningAccount.flexMealsUsed,
    guestPassesUsed: diningAccount.guestPassesUsed,
    knightBucks: diningAccount.knightBucks,
    diningDollars: diningAccount.diningDollars,
  };
}

/** Active student's meal plan (dynamically resolved from John Doe's profile in student.ts). */
export const mealPlan: ActiveStudentMealPlan = getStudentMealPlan(
  student.dining,
);

/** Returns true if the plan is a semester lump-sum block plan without weekly resets. */
export function isBlockPlan(
  plan: { cadence?: MealPlanCadence } = mealPlan,
): boolean {
  return plan.cadence === "semester";
}

/** Returns the total swipe allotment for the current cycle (weekly or block). */
export function getSwipesTotal(
  plan: { swipesTotal?: number } = mealPlan,
): number {
  return plan.swipesTotal ?? 0;
}

/** Returns the remaining swipes for the plan given current usage. */
export function getSwipesRemaining(
  plan: { swipesTotal?: number; swipesUsed?: number } = mealPlan,
): number {
  return Math.max(0, getSwipesTotal(plan) - (plan.swipesUsed ?? 0));
}

/** Returns true if the plan provides flex meals (e.g. Core plans). */
export function hasFlexMeals(plan: { flexMeals?: number } = mealPlan): boolean {
  return typeof plan.flexMeals === "number" && plan.flexMeals > 0;
}

/** Returns remaining flex meals, or 0 if the plan has none. */
export function getFlexMealsRemaining(
  plan: { flexMeals?: number; flexMealsUsed?: number } = mealPlan,
): number {
  if (!hasFlexMeals(plan)) return 0;
  return Math.max(0, (plan.flexMeals ?? 0) - (plan.flexMealsUsed ?? 0));
}

/** Returns true if the plan provides separate guest passes (Core 10, 14, 17, 21). */
export function hasGuestPasses(
  plan: { guestPasses?: number } = mealPlan,
): boolean {
  return typeof plan.guestPasses === "number" && plan.guestPasses > 0;
}

/** Returns remaining guest passes, or 0 if the plan has none. */
export function getGuestPassesRemaining(
  plan: { guestPasses?: number; guestPassesUsed?: number } = mealPlan,
): number {
  if (!hasGuestPasses(plan)) return 0;
  return Math.max(0, (plan.guestPasses ?? 0) - (plan.guestPassesUsed ?? 0));
}

/** Returns the appropriate metric card label ("Meals left" for block plans, "Swipes left" for weekly). */
export function getSwipeMetricLabel(
  plan: { cadence?: MealPlanCadence } = mealPlan,
): string {
  return isBlockPlan(plan) ? "Meals left" : "Swipes left";
}

export const swipesRemaining = getSwipesRemaining(mealPlan);
export const flexMealsRemaining = getFlexMealsRemaining(mealPlan);
export const guestPassesRemaining = getGuestPassesRemaining(mealPlan);

/**
 * Returns the descriptive swipe cadence/reset note based on whether the plan
 * is weekly (e.g. Core 21) or semester-based (e.g. Knollcrest 60 Block).
 */
export function getSwipeResetText(
  plan: { cadence?: MealPlanCadence; weekResetsOn?: string } = mealPlan,
): string {
  if (isBlockPlan(plan)) {
    return "Swipes last through the semester";
  }
  if (plan.weekResetsOn) {
    return `Swipes reset ${plan.weekResetsOn}`;
  }
  return "Swipes last through the semester";
}

export type ServiceWindow = {
  label: string;
  /** Minutes after midnight. */
  start: number;
  end: number;
};

export type DiningHall = {
  id: string;
  name: string;
  location: string;
  description: string;
  acceptsSwipes: boolean;
  today: ServiceWindow[];
  stations?: { name: string; items: string[] }[];
};

const hm = (hours: number, minutes = 0) => hours * 60 + minutes;

export const diningHalls: DiningHall[] = [
  {
    id: "commons",
    name: "Commons Dining Hall",
    location: "Commons Union, Level 1",
    description: "All-you-care-to-eat with the new allergen-free station.",
    acceptsSwipes: true,
    today: [
      { label: "Breakfast", start: hm(7), end: hm(10) },
      { label: "Lunch", start: hm(11), end: hm(14) },
      { label: "Dinner", start: hm(16, 30), end: hm(21) },
    ],
    stations: [
      {
        name: "Grill",
        items: ["Smash burgers", "Sweet potato fries", "Grilled chicken"],
      },
      {
        name: "Homestyle",
        items: ["Rosemary pot roast", "Garlic mashed potatoes", "Green beans"],
      },
      {
        name: "Pure Eats",
        items: ["Lentil curry", "Jasmine rice", "Roasted cauliflower"],
      },
      { name: "Deli", items: ["Build-your-own", "Tomato basil soup"] },
    ],
  },
  {
    id: "knollcrest",
    name: "Knollcrest Dining",
    location: "Knollcrest East",
    description: "Quieter room on the east side, big breakfast spread.",
    acceptsSwipes: true,
    today: [
      { label: "Brunch", start: hm(9), end: hm(14) },
      { label: "Dinner", start: hm(17), end: hm(20) },
    ],
    stations: [
      {
        name: "Skillet",
        items: ["Belgian waffles", "Shakshuka", "Hash browns"],
      },
      { name: "Noodle bar", items: ["Pho", "Pad see ew"] },
    ],
  },
  {
    id: "uppercrust",
    name: "Uppercrust",
    location: "Commons Union, Level 2",
    description: "Pizza, pasta, and late-night grab-and-go.",
    acceptsSwipes: false,
    today: [{ label: "Open", start: hm(11), end: hm(23) }],
  },
  {
    id: "peets",
    name: "Peet's Coffee",
    location: "Hekman Library lobby",
    description:
      "Espresso, pastries, and the only outlet-heavy tables on campus.",
    acceptsSwipes: false,
    today: [{ label: "Open", start: hm(7, 30), end: hm(22) }],
  },
  {
    id: "johnnys",
    name: "Johnny's",
    location: "Spoelhof Center",
    description: "Sandwiches, smoothies, and the cookie.",
    acceptsSwipes: false,
    today: [{ label: "Open", start: hm(8), end: hm(16) }],
  },
];

export type HallStatus = {
  open: boolean;
  label: string;
  /** Next transition, e.g. "Closes 9:00 PM" or "Opens 4:30 PM". */
  detail: string;
};

function formatMinutes(minutes: number) {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function hallStatus(hall: DiningHall, now = new Date()): HallStatus {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const current = hall.today.find(
    (w) => minutesNow >= w.start && minutesNow < w.end,
  );

  if (current) {
    return {
      open: true,
      label: current.label === "Open" ? "Open now" : `${current.label} now`,
      detail: `Closes ${formatMinutes(current.end)}`,
    };
  }

  const next = hall.today.find((w) => w.start > minutesNow);
  if (next) {
    return {
      open: false,
      label: "Closed",
      detail: `${next.label} at ${formatMinutes(next.start)}`,
    };
  }

  return { open: false, label: "Closed", detail: "Opens tomorrow" };
}

export type Transaction = {
  id: string;
  location: string;
  detail: string;
  at: string;
  /** Negative for spend, positive for deposits. */
  amount: number;
  kind: "swipe" | "knightbucks" | "dining-dollars" | "deposit";
};

export const transactions: Transaction[] = [
  {
    id: "t1",
    location: "Commons Dining Hall",
    detail: "Lunch swipe",
    at: "Today, 12:18 PM",
    amount: -1,
    kind: "swipe",
  },
  {
    id: "t2",
    location: "Peet's Coffee",
    detail: "Large cold brew",
    at: "Today, 9:42 AM",
    amount: -4.25,
    kind: "knightbucks",
  },
  {
    id: "t3",
    location: "Commons Dining Hall",
    detail: "Breakfast swipe",
    at: "Today, 7:55 AM",
    amount: -1,
    kind: "swipe",
  },
  {
    id: "t4",
    location: "Uppercrust",
    detail: "Two slices + drink",
    at: "Yesterday, 9:31 PM",
    amount: -8.5,
    kind: "dining-dollars",
  },
  {
    id: "t5",
    location: "Campus Store",
    detail: "Blue book, pens",
    at: "Yesterday, 3:04 PM",
    amount: -6.99,
    kind: "knightbucks",
  },
  {
    id: "t6",
    location: "Knollcrest Dining",
    detail: "Dinner swipe (guest)",
    at: "Sep 11, 6:12 PM",
    amount: -1,
    kind: "swipe",
  },
  {
    id: "t7",
    location: "Online",
    detail: "KnightBucks deposit",
    at: "Sep 10, 8:00 AM",
    amount: 100,
    kind: "deposit",
  },
  {
    id: "t8",
    location: "Johnny's",
    detail: "Turkey club, cookie",
    at: "Sep 9, 1:22 PM",
    amount: -11.4,
    kind: "knightbucks",
  },
];

export function formatAmount(tx: Transaction) {
  if (tx.kind === "swipe") {
    const isSingular = Math.abs(tx.amount) === 1;
    return `${tx.amount} swipe${isSingular ? "" : "s"}`;
  }

  const sign = tx.amount < 0 ? "-" : "+";
  return `${sign}$${Math.abs(tx.amount).toFixed(2)}`;
}

export function knightBucksLabel(amount = mealPlan.knightBucks) {
  return `$${amount.toFixed(2)}`;
}

export const swipesUsedLastWeek = transactions
  .filter((tx) => tx.kind === "swipe" && tx.amount < 0)
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

export const knightBucksSpentLastWeek = transactions
  .filter((tx) => tx.kind === "knightbucks" && tx.amount < 0)
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

export const diningDollarsSpentLastWeek = transactions
  .filter((tx) => tx.kind === "dining-dollars" && tx.amount < 0)
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
