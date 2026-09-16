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

/** The signed-in student. Hardcoded for the prototype. */
export const student = {
  id: "2346052",
  firstName: "John",
  middleName: "Mark",
  lastName: "Doe",
  classYear: 2028,
  standing: "Sophomore",
  major: "Computer Science",
  minor: "Mathematics",
  email: "jmd42@calvin.edu",
  /** 7-digit student number printed on the Knight Card. */
  cardNumber: "2346052",
  /** 14-digit encoded barcode: 5 leading 0's, 7-digit student ID, 2 trailing 0's. */
  barcode: "00000234605200",
  residence: "Boer-Bennink Hall, Rm 214",
  advisor: "Dr. Naomi Vermeer",
  /**
   * John Doe's active dining account & meal plan subscription.
   * To test other plans for John Doe, simply change `mealPlanId` here (e.g. 'knollcrest60', 'core14', etc.).
   */
  dining: {
    mealPlanId: "core14" as CalvinMealPlanId,
    swipesUsed: 7,
    flexMealsUsed: 1,
    guestPassesUsed: 0,
    knightBucks: 30.0,
    diningDollars: 18.5,
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
