export type MealPlan = {
  name: string;
  swipesPerWeek: number;
  swipesUsed: number;
  guestPasses: number;
  guestPassesUsed: number;
  knightBucks: number;
  diningDollars: number;
  weekResetsOn: string;
};

export const mealPlan: MealPlan = {
  name: "Core 14",
  swipesPerWeek: 14,
  swipesUsed: 6,
  guestPasses: 2,
  guestPassesUsed: 1,
  knightBucks: 142.75,
  diningDollars: 68.5,
  weekResetsOn: "Sunday at 12:00 a.m.",
};

export const swipesRemaining = mealPlan.swipesPerWeek - mealPlan.swipesUsed;
export const guestPassesRemaining =
  mealPlan.guestPasses - mealPlan.guestPassesUsed;

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
  if (tx.kind === "swipe") return `${tx.amount} swipe`;

  const sign = tx.amount < 0 ? "-" : "+";
  return `${sign}$${Math.abs(tx.amount).toFixed(2)}`;
}

export function knightBucksLabel() {
  return `$${mealPlan.knightBucks.toFixed(2)}`;
}
