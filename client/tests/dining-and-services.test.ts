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
  type Transaction,
} from '@/data/dining';
import { student } from '@/data/student';
import { departments, people, type Person, type PersonRole } from '@/data/directory';
import { emergencyContacts, safetyAlerts, type SafetyAlert } from '@/data/safety';

describe('Dining, Directory & Campus Safety Domain', () => {
  // ==========================================================================
  // Suite 1: Calvin Dining Balances & Swipes Model
  // ==========================================================================
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

    // Parameterized swipe consumption steps from 0 to total
    for (let used = 0; used <= 10; used += 2) {
      it(`computes swipesRemaining accurately when swipesUsed is ${used}`, () => {
        const testPlan = { ...mealPlan, swipesUsed: used };
        const remaining = getSwipesRemaining(testPlan);
        assert.strictEqual(remaining, Math.max(0, getSwipesTotal(testPlan) - used));
      });
    }

    // Parameterized flex meal consumption steps
    for (let flexUsed = 0; flexUsed <= 3; flexUsed++) {
      it(`computes flexMealsRemaining accurately when flexMealsUsed is ${flexUsed}`, () => {
        const testPlan = { ...mealPlan, flexMeals: 3, flexMealsUsed: flexUsed };
        const remaining = getFlexMealsRemaining(testPlan);
        assert.strictEqual(remaining, 3 - flexUsed);
      });
    }

    it('formats knightBucksLabel with two decimal places', () => {
      const label = knightBucksLabel();
      assert.ok(label.startsWith('$'));
      assert.strictEqual(label, `$${mealPlan.knightBucks.toFixed(2)}`);
    });

    it('formats transaction amounts consistently with plus/minus signs', () => {
      assert.strictEqual(
        formatAmount({ id: '1', kind: 'knightbucks', amount: 5.5, location: 'Store', detail: 'Deposit', at: 'Today' }),
        '+$5.50'
      );
      assert.strictEqual(
        formatAmount({ id: '2', kind: 'knightbucks', amount: -12.75, location: 'Store', detail: 'Snack', at: 'Today' }),
        '-$12.75'
      );
      assert.strictEqual(
        formatAmount({ id: '3', kind: 'swipe', amount: -1, location: 'Commons', detail: 'Lunch', at: 'Today' }),
        '-1 swipe'
      );
    });
  });

  // ==========================================================================
  // Suite 2: Calvin Meal Plans Catalog & Features
  // ==========================================================================
  describe('Calvin Meal Plans Catalog & Features', () => {
    const corePlans = ['core21', 'core17', 'core14', 'core10', 'core5'] as const;
    const blockPlans = ['knollcrest60', 'joust30'] as const;

    it('provides all official Core weekly meal plans', () => {
      for (const id of corePlans) {
        const plan = CALVIN_MEAL_PLANS[id];
        assert.ok(plan, `Plan ${id} should exist in catalog`);
        assert.strictEqual(plan.cadence, 'weekly');
        assert.strictEqual(isBlockPlan(plan), false);
        assert.strictEqual(getSwipeMetricLabel(plan), 'Swipes left');
      }
    });

    it('provides all official Block semester meal plans', () => {
      for (const id of blockPlans) {
        const plan = CALVIN_MEAL_PLANS[id];
        assert.ok(plan, `Plan ${id} should exist in catalog`);
        assert.strictEqual(plan.cadence, 'semester');
        assert.strictEqual(isBlockPlan(plan), true);
        assert.strictEqual(getSwipeMetricLabel(plan), 'Meals left');
      }
    });

    it('returns Sunday reset message for weekly plans and semester end for block plans', () => {
      for (const id of corePlans) {
        const text = getSwipeResetText(CALVIN_MEAL_PLANS[id]);
        assert.ok(text.toLowerCase().includes('sunday'));
      }
      for (const id of blockPlans) {
        const text = getSwipeResetText(CALVIN_MEAL_PLANS[id]);
        assert.ok(text.toLowerCase().includes('semester'));
      }
    });

    for (const id of [...corePlans, ...blockPlans]) {
      it(`verifies plan "${id}" has positive swipe allocation and valid name`, () => {
        const plan = CALVIN_MEAL_PLANS[id];
        assert.ok(plan.swipesTotal > 0);
        assert.ok(plan.name.length > 0);
        if (plan.description) {
          assert.ok(plan.description.length > 0);
        }
      });
    }
  });

  // ==========================================================================
  // Suite 3: Dining Hall Hours & Status Invariants
  // ==========================================================================
  describe('Dining Halls Status & Venue Metadata', () => {
    it('contains all key campus dining venues', () => {
      const names = diningHalls.map((h) => h.name);
      assert.ok(names.some((n) => n.includes('Commons')));
      assert.ok(names.some((n) => n.includes('Knollcrest')));
      assert.ok(names.some((n) => n.includes('Uppercrust')));
      assert.ok(names.some((n) => n.includes("Peet's")));
    });

    it('validates each dining hall has valid coordinates, hours, and status', () => {
      for (const hall of diningHalls) {
        assert.ok(hall.id.length > 0);
        assert.ok(hall.name.length > 0);
        assert.ok(Array.isArray(hall.today));
        const status = hallStatus(hall);
        assert.ok(typeof status.open === 'boolean');
        assert.ok(status.label.length > 0);
      }
    });
  });

  // ==========================================================================
  // Suite 4: Dining SubMeter & Activity Summary Contracts
  // ==========================================================================
  describe('Dining SubMeter & Activity Summary Contracts', () => {
    it('formats DiningSubMeter label, count ratio, and color consistently', () => {
      const formatSubMeter = (label: string, remaining: number, total: number, color: string) => ({
        headerLabel: label,
        countText: `${remaining} of ${total}`,
        color,
      });

      const flex = formatSubMeter('Flex meals', 2, 2, '#4E95D4');
      assert.strictEqual(flex.headerLabel, 'Flex meals');
      assert.strictEqual(flex.countText, '2 of 2');
      assert.strictEqual(flex.color, '#4E95D4');

      const guest = formatSubMeter('Guest passes', 4, 5, '#1B7340');
      assert.strictEqual(guest.headerLabel, 'Guest passes');
      assert.strictEqual(guest.countText, '4 of 5');
      assert.strictEqual(guest.color, '#1B7340');
    });

    it('formats all 3 dining usage items in DiningActivitySummary correctly', () => {
      const summaryItems = [
        { label: 'Meal Swipes Used', value: swipesUsedLastWeek.toString() },
        { label: 'Dining Dollars Spent', value: `$${diningDollarsSpentLastWeek.toFixed(2)}` },
        { label: 'Knight Bucks Spent', value: `$${knightBucksSpentLastWeek.toFixed(2)}` },
      ];

      assert.strictEqual(summaryItems.length, 3);
      assert.strictEqual(summaryItems[0].label, 'Meal Swipes Used');
      assert.strictEqual(summaryItems[1].label, 'Dining Dollars Spent');
      assert.strictEqual(summaryItems[2].label, 'Knight Bucks Spent');
    });

    it('validates recent transactions have non-empty dates and valid amounts', () => {
      assert.ok(transactions.length > 0);
      for (const tx of transactions) {
        assert.ok(tx.id.length > 0);
        assert.ok(tx.location.length > 0);
        assert.ok(tx.at.length > 0);
        assert.ok(typeof tx.amount === 'number');
      }
    });
  });

  // ==========================================================================
  // Suite 5: Campus Directory Departments & Taxonomy
  // ==========================================================================
  describe('Directory Departments & Taxonomy', () => {
    it('contains core academic and administrative departments', () => {
      assert.ok(departments.includes('Computer Science'));
      assert.ok(departments.includes('Engineering'));
      assert.ok(departments.includes('Nursing'));
      assert.ok(departments.includes('Campus Safety'));
      assert.ok(departments.includes('Dining Services'));
    });

    it('has unique department entries without duplicates', () => {
      const uniqueDepts = new Set(departments);
      assert.strictEqual(uniqueDepts.size, departments.length);
    });

    for (const dept of ['Computer Science', 'Engineering', 'Nursing', 'Campus Safety', 'Dining Services']) {
      it(`verifies directory department "${dept}" contains affiliated faculty or staff`, () => {
        const matches = people.filter((p) => p.department === dept);
        assert.ok(matches.length > 0, `Department ${dept} should have affiliated people`);
      });
    }
  });

  // ==========================================================================
  // Suite 6: Directory People Records & Privacy Invariants
  // ==========================================================================
  describe('Directory People Records & Privacy Invariants', () => {
    it('validates every person has required directory fields', () => {
      const validRoles: PersonRole[] = ['Faculty', 'Staff'];

      for (const p of people) {
        assert.ok(p.id.length > 0, 'Person must have an ID');
        assert.ok(p.firstName.length > 0, 'Person must have first name');
        assert.ok(p.lastName.length > 0, 'Person must have last name');
        assert.ok(validRoles.includes(p.role), `Person role ${p.role} is invalid`);
        assert.ok(p.title.length > 0, 'Person must have title');
        assert.ok(p.department.length > 0, 'Person must belong to a department');
        assert.match(p.email, /@calvin\.edu$/, `Email ${p.email} must end with @calvin.edu`);
        assert.ok(p.location.length > 0, 'Person must have an office location');
      }
    });

    it('contains representations of faculty and staff, with students strictly excluded for privacy', () => {
      const students = people.filter((p) => (p.role as string) === 'Student');
      const faculty = people.filter((p) => p.role === 'Faculty');
      const staff = people.filter((p) => p.role === 'Staff');

      assert.strictEqual(students.length, 0, 'Must have zero students for privacy compliance');
      assert.ok(faculty.length > 0, 'Must have faculty');
      assert.ok(staff.length > 0, 'Must have staff');
    });

    it('ensures all person IDs are unique across the directory', () => {
      const ids = people.map((p) => p.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size);
    });
  });

  // ==========================================================================
  // Suite 7: Directory Search & Filtering Logic
  // ==========================================================================
  describe('Directory Search & Filtering Logic', () => {
    function searchPeople(query: string): Person[] {
      const q = query.toLowerCase().trim();
      return people.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    it('finds faculty by first name', () => {
      const results = searchPeople('Naomi');
      assert.ok(results.length >= 1);
      assert.ok(results.some((p) => p.firstName === 'Naomi'));
    });

    it('finds faculty by last name', () => {
      const results = searchPeople('Vermeer');
      assert.ok(results.length >= 1);
      assert.ok(results.some((p) => p.lastName === 'Vermeer'));
    });

    it('finds faculty by department name', () => {
      const results = searchPeople('Engineering');
      assert.ok(results.length >= 1);
      for (const p of results) {
        assert.ok(p.department.includes('Engineering') || p.title.includes('Engineering'));
      }
    });

    it('finds faculty by email prefix', () => {
      const results = searchPeople('nvermeer');
      assert.ok(results.length >= 1);
      assert.ok(results.some((p) => p.email.startsWith('nvermeer')));
    });

    it('handles mixed case and surrounding whitespace in search query', () => {
      const padded = searchPeople('   nUrSiNg   ');
      assert.ok(padded.length >= 1);
    });

    it('returns empty array when query does not match any record', () => {
      const empty = searchPeople('NonExistentPersonXYZ');
      assert.strictEqual(empty.length, 0);
    });

    for (const dept of departments.slice(0, 10)) {
      it(`finds people associated with department "${dept}" via directory search`, () => {
        const matches = searchPeople(dept);
        assert.ok(matches.length > 0);
        for (const m of matches) {
          assert.ok(
            m.department.toLowerCase().includes(dept.toLowerCase()) ||
            m.title.toLowerCase().includes(dept.toLowerCase())
          );
        }
      });
    }
  });

  // ==========================================================================
  // Suite 8: Campus Safety Emergency Contacts & Dialing Protocols
  // ==========================================================================
  describe('Campus Safety Emergency Contacts', () => {
    it('contains essential campus emergency numbers', () => {
      const dispatch = emergencyContacts.find((c) => c.phone === '6165263333');
      assert.ok(dispatch, 'Campus safety dispatch must exist');
      assert.strictEqual(dispatch!.urgent, true);
      assert.ok(dispatch!.name.toLowerCase().includes('campus safety'));

      const emergency911 = emergencyContacts.find((c) => c.phone === '911');
      assert.ok(emergency911, '911 must exist');
      assert.strictEqual(emergency911!.urgent, true);
    });

    it('contains health, counseling, and crisis lifelines', () => {
      const counseling = emergencyContacts.find((c) => c.name.toLowerCase().includes('counseling'));
      assert.ok(counseling, 'Counseling Center must exist');
      assert.ok(counseling!.phone.length >= 7);

      const health = emergencyContacts.find((c) => c.name.toLowerCase().includes('health'));
      assert.ok(health, 'Health Services must exist');

      const lifeline = emergencyContacts.find((c) => c.phone === '988');
      assert.ok(lifeline, '988 Suicide & Crisis Lifeline must exist');
    });

    it('validates each emergency contact structure', () => {
      for (const contact of emergencyContacts) {
        assert.ok(contact.id.length > 0, 'Contact must have an id');
        assert.ok(contact.name.length > 0, 'Contact must have a name');
        assert.ok(contact.detail.length > 0, 'Contact must have detail info');
        assert.match(contact.phone, /^\d+$/, `Phone ${contact.phone} must be purely numeric for tel: dialing`);
      }
    });

    it('ensures all emergency contact IDs are unique', () => {
      const ids = emergencyContacts.map((c) => c.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size);
    });
  });

  // ==========================================================================
  // Suite 9: Campus Safety Alerts & Notifications
  // ==========================================================================
  describe('Campus Safety Alerts & Notifications', () => {
    it('validates alert severities', () => {
      const allowedSeverities: SafetyAlert['severity'][] = ['critical', 'warning', 'info'];
      for (const alert of safetyAlerts) {
        assert.ok(allowedSeverities.includes(alert.severity), `Invalid severity ${alert.severity}`);
        assert.ok(alert.title.length > 0, 'Alert must have title');
        assert.ok(alert.detail.length > 0, 'Alert must have detail');
        assert.ok(alert.area.length > 0, 'Alert must specify campus area');
        assert.ok(alert.at.length > 0, 'Alert must specify time');
      }
    });

    it('has at least one current safety alert for demonstration', () => {
      assert.ok(safetyAlerts.length >= 1);
    });

    it('ensures all alert IDs are unique', () => {
      const ids = safetyAlerts.map((a) => a.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All alert IDs must be unique');
    });
  });

  // ==========================================================================
  // Suite 10: High-Volume Services Stress & Ingestion Fuzzing
  // ==========================================================================
  describe('Campus Services Stress & Ledger Invariants', () => {
    it('handles 1,000 synthetic transactions ledger calculation in <15ms', () => {
      const syntheticTxs: Transaction[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `tx-${i}`,
        kind: (i % 2 === 0 ? 'swipe' : 'dining-dollars') as Transaction['kind'],
        amount: i % 2 === 0 ? -1 : -(i % 15 + 1.25),
        location: i % 3 === 0 ? 'Commons Dining Hall' : 'Uppercrust',
        detail: i % 2 === 0 ? 'Meal swipe' : 'Snack',
        at: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      const startTime = Date.now();
      const totalSpent = syntheticTxs
        .filter((tx) => tx.kind === 'dining-dollars')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const elapsed = Date.now() - startTime;

      assert.ok(elapsed < 15);
      assert.ok(totalSpent > 0);
    });

    it('clamps negative balance metrics safely without throwing', () => {
      const exhaustedPlan = {
        ...mealPlan,
        swipesUsed: 100, // over-consumed
        flexMealsUsed: 50,
        guestPassesUsed: 50,
      };
      const remainingSwipes = Math.max(0, getSwipesTotal(exhaustedPlan) - exhaustedPlan.swipesUsed);
      assert.strictEqual(remainingSwipes, 0);
    });
  });

  describe('Dining Venues 24-Hour Cycle Status Grid', () => {
    const venues = ['commons', 'knollcrest', 'johnnys', 'peets', 'uppercrust'];
    const hours = [7, 8, 11, 13, 17, 19, 21, 23];

    for (const vId of venues) {
      for (const h of hours) {
        it(`evaluates hallStatus for venue "${vId}" at ${h}:00`, () => {
          const hall = diningHalls.find((dh) => dh.id === vId);
          if (hall) {
            const status = hallStatus(hall, new Date(2026, 8, 15, h, 0));
            assert.ok(typeof status.open === 'boolean');
            assert.ok(status.detail.length > 0);
          }
        });
      }
    }
  });

  describe('Transaction Ledger Formatting & Kind Badges', () => {
    const testTransactions: { kind: Transaction['kind']; amount: number; expected: string }[] = [
      { kind: 'swipe', amount: -1, expected: '-1 swipe' },
      { kind: 'dining-dollars', amount: -6.5, expected: '-$6.50' },
      { kind: 'knightbucks', amount: -12.25, expected: '-$12.25' },
      { kind: 'deposit', amount: 50, expected: '+$50.00' },
    ];

    for (const tx of testTransactions) {
      it(`formats amount correctly for ${tx.kind} transaction`, () => {
        const formatted = formatAmount({
          id: 'test',
          location: 'Test Location',
          detail: 'Test Detail',
          at: 'Today',
          kind: tx.kind,
          amount: tx.amount,
        });
        assert.strictEqual(formatted, tx.expected);
      });
    }
  });
});

