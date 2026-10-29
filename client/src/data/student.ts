/**
 * Formats a 7-digit Calvin student ID into the standard 14-digit barcode format:
 * 5 leading zeros + 7-digit student ID + 2 trailing zeros.
 *
 * Example: '2346052' -> '00000234605200'
 */
export function formatBarcode(studentId: string): string {
  const digits = studentId.replace(/\D/g, "").padStart(7, "0");
  return `00000${digits}00`;
}

export type CalvinMealPlanId =
  | "core21"
  | "core17"
  | "core14"
  | "core10"
  | "core5"
  | "knollcrest60"
  | "joust30";

export type StudentDining = {
  /** The meal plan this student is enrolled in. Matches an ID in CALVIN_MEAL_PLANS. */
  mealPlanId: CalvinMealPlanId;
  /** Swipes used during the current period (this week for weekly plans, this semester for block plans). */
  swipesUsed: number;
  /** Flex meal equivalencies used this week. */
  flexMealsUsed: number;
  /** Guest passes used this semester. */
  guestPassesUsed: number;
  /** Current KnightBucks balance. */
  knightBucks: number;
  /** Current Dining Dollars balance. */
  diningDollars: number;
};

/** Default unauthenticated student profile template used when offline or unauthenticated. */
export const student = {
  id: "2400001",
  firstName: "Calvin",
  middleName: "",
  lastName: "Student",
  classYear: 2028,
  standing: "Student",
  major: "Calvin University",
  minor: "",
  email: "student@calvin.edu",
  /** 7-digit student number printed on the Knight Card. */
  cardNumber: "2400001",
  /** 14-digit encoded barcode: 5 leading 0's, 7-digit student ID, 2 trailing 0's. */
  barcode: "00000240000100",
  residence: "Campus Housing",
  advisor: "Academic Advising",
  /**
   * Neutral default dining account state.
   */
  dining: {
    mealPlanId: "core14" as CalvinMealPlanId,
    swipesUsed: 0,
    flexMealsUsed: 0,
    guestPassesUsed: 0,
    knightBucks: 0.0,
    diningDollars: 0.0,
  },
} as const;

export const fullName = `${student.firstName} ${student.lastName}`;
export const fullLegalName = `${student.firstName} ${student.middleName} ${student.lastName}`;

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
