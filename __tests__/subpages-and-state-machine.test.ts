import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CALVIN_CLUBS,
  getClubById,
  searchClubs,
  type Club,
} from '@/data/clubs';
import {
  CALVIN_MEAL_PLANS,
  diningHalls,
  hallStatus,
  getStudentMealPlan,
  getSwipesRemaining,
  getSwipesTotal,
  getFlexMealsRemaining,
  getGuestPassesRemaining,
  isBlockPlan,
  type CalvinMealPlanId,
} from '@/data/dining';
import { feedCategories, type FeedCategory } from '@/data/feed';
import { formatBarcode, greeting, student } from '@/data/student';
import { getTabHeader } from '@/constants/tab-headers';
import { calculateStarCounts } from '@/constants/starfield';

describe('Sub-Pages Hierarchy, Pager Invariants & State Machine', () => {
  describe('Clubs Sub-Pages Navigation Lifecycle', () => {
    type NavigationState = {
      level: 0 | 1 | 2;
      activeClubId: string | null;
      bottomBarVisible: boolean;
    };

    function createClubsNavigationMachine(): {
      getState: () => NavigationState;
      openDirectory: () => void;
      openClubDetail: (clubId: string) => void;
      closeClubDetail: () => void;
      closeDirectory: () => void;
      reset: () => void;
    } {
      let state: NavigationState = {
        level: 0,
        activeClubId: null,
        bottomBarVisible: true,
      };

      return {
        getState: () => ({ ...state }),
        openDirectory: () => {
          state = {
            level: 1,
            activeClubId: null,
            bottomBarVisible: false,
          };
        },
        openClubDetail: (clubId: string) => {
          state = {
            level: 2,
            activeClubId: clubId,
            bottomBarVisible: false,
          };
        },
        closeClubDetail: () => {
          state = {
            level: 1,
            activeClubId: null,
            bottomBarVisible: false,
          };
        },
        closeDirectory: () => {
          state = {
            level: 0,
            activeClubId: null,
            bottomBarVisible: true,
          };
        },
        reset: () => {
          state = {
            level: 0,
            activeClubId: null,
            bottomBarVisible: true,
          };
        },
      };
    }

    it('starts at level 0 with bottom bar visible on Knightly Home', () => {
      const nav = createClubsNavigationMachine();
      const state = nav.getState();
      assert.strictEqual(state.level, 0);
      assert.strictEqual(state.activeClubId, null);
      assert.strictEqual(state.bottomBarVisible, true);
    });

    it('transitions to level 1 and hides bottom bar when opening Campus Clubs directory', () => {
      const nav = createClubsNavigationMachine();
      nav.openDirectory();
      const state = nav.getState();
      assert.strictEqual(state.level, 1);
      assert.strictEqual(state.activeClubId, null);
      assert.strictEqual(state.bottomBarVisible, false);
    });

    it('transitions from level 1 to level 2 when opening specific club detail', () => {
      const nav = createClubsNavigationMachine();
      nav.openDirectory();
      nav.openClubDetail('acm');
      const state = nav.getState();
      assert.strictEqual(state.level, 2);
      assert.strictEqual(state.activeClubId, 'acm');
      assert.strictEqual(state.bottomBarVisible, false);
    });

    it('transitions from level 2 back to level 1 when closing club detail', () => {
      const nav = createClubsNavigationMachine();
      nav.openDirectory();
      nav.openClubDetail('calvin-theatre');
      nav.closeClubDetail();
      const state = nav.getState();
      assert.strictEqual(state.level, 1);
      assert.strictEqual(state.activeClubId, null);
      assert.strictEqual(state.bottomBarVisible, false);
    });

    it('transitions from level 1 back to level 0 and restores bottom bar when closing directory', () => {
      const nav = createClubsNavigationMachine();
      nav.openDirectory();
      nav.closeDirectory();
      const state = nav.getState();
      assert.strictEqual(state.level, 0);
      assert.strictEqual(state.activeClubId, null);
      assert.strictEqual(state.bottomBarVisible, true);
    });

    it('resets immediately to level 0 when resetting from club detail', () => {
      const nav = createClubsNavigationMachine();
      nav.openDirectory();
      nav.openClubDetail('outdoor-rec');
      nav.reset();
      const state = nav.getState();
      assert.strictEqual(state.level, 0);
      assert.strictEqual(state.activeClubId, null);
      assert.strictEqual(state.bottomBarVisible, true);
    });
  });

  describe('Dining Activity Sub-Page Navigation Lifecycle', () => {
    type DiningNavState = {
      isActivityOpen: boolean;
      bottomBarVisible: boolean;
    };

    function createDiningNavMachine() {
      let state: DiningNavState = {
        isActivityOpen: false,
        bottomBarVisible: true,
      };

      return {
        getState: () => ({ ...state }),
        openActivity: () => {
          state = { isActivityOpen: true, bottomBarVisible: false };
        },
        closeActivity: () => {
          state = { isActivityOpen: false, bottomBarVisible: true };
        },
      };
    }

    it('starts with activity closed on Dining tab', () => {
      const nav = createDiningNavMachine();
      assert.strictEqual(nav.getState().isActivityOpen, false);
      assert.strictEqual(nav.getState().bottomBarVisible, true);
    });

    it('opens activity and hides bottom bar', () => {
      const nav = createDiningNavMachine();
      nav.openActivity();
      assert.strictEqual(nav.getState().isActivityOpen, true);
      assert.strictEqual(nav.getState().bottomBarVisible, false);
    });

    it('closes activity and restores bottom bar', () => {
      const nav = createDiningNavMachine();
      nav.openActivity();
      nav.closeActivity();
      assert.strictEqual(nav.getState().isActivityOpen, false);
      assert.strictEqual(nav.getState().bottomBarVisible, true);
    });
  });

  describe('Swipe Gesture Physics & Threshold Invariants', () => {
    function computeSwipeTarget(params: {
      fromPage: number;
      dragOffset: number; // Positive = dragging right (backwards)
      pageWidth: number;
      velocityX: number;
    }): number {
      const { fromPage, dragOffset, pageWidth, velocityX } = params;
      const progress = dragOffset / pageWidth;

      // Flick right with sufficient speed (> 400 dp/s)
      if (velocityX > 400) {
        return Math.max(0, fromPage - 1);
      }
      // Flick left with speed (< -400 dp/s)
      if (velocityX < -400) {
        return fromPage; // clamp to current if no next sub-page
      }
      // Drag past 40% threshold
      if (progress > 0.4) {
        return Math.max(0, fromPage - 1);
      }
      return fromPage;
    }

    it('navigates back on fast flick right even if drag distance is small', () => {
      const target = computeSwipeTarget({
        fromPage: 1,
        dragOffset: 20, // only 20px drag
        pageWidth: 400,
        velocityX: 650, // fast flick
      });
      assert.strictEqual(target, 0);
    });

    it('navigates back on slow drag past 40% distance threshold', () => {
      const target = computeSwipeTarget({
        fromPage: 1,
        dragOffset: 180, // 180 / 400 = 45% > 40%
        pageWidth: 400,
        velocityX: 50,
      });
      assert.strictEqual(target, 0);
    });

    it('cancels navigation back if drag is below 40% and velocity is low', () => {
      const target = computeSwipeTarget({
        fromPage: 1,
        dragOffset: 80, // 80 / 400 = 20% < 40%
        pageWidth: 400,
        velocityX: 100,
      });
      assert.strictEqual(target, 1);
    });

    it('navigates from Club Detail (level 2) back to Campus Clubs (level 1) on swipe', () => {
      const target = computeSwipeTarget({
        fromPage: 2,
        dragOffset: 200,
        pageWidth: 400,
        velocityX: 450,
      });
      assert.strictEqual(target, 1);
    });
  });

  describe('Comprehensive Meal Plan Scenarios Across Calvin Student Archetypes', () => {
    it('models Freshman on Core 21 with mid-week partial usage', () => {
      const plan = getStudentMealPlan({
        mealPlanId: 'core21',
        swipesUsed: 11,
        flexMealsUsed: 2,
        guestPassesUsed: 1,
        knightBucks: 140.0,
        diningDollars: 0,
      });

      assert.strictEqual(plan.cadence, 'weekly');
      assert.strictEqual(getSwipesTotal(plan), 21);
      assert.strictEqual(getSwipesRemaining(plan), 10);
      assert.strictEqual(getFlexMealsRemaining(plan), 1); // 3 - 2
      assert.strictEqual(getGuestPassesRemaining(plan), 1); // 2 - 1
      assert.strictEqual(isBlockPlan(plan), false);
    });

    it('models Sophomore on Core 17 at week end with zero swipes left', () => {
      const plan = getStudentMealPlan({
        mealPlanId: 'core17',
        swipesUsed: 17,
        flexMealsUsed: 3,
        guestPassesUsed: 2,
        knightBucks: 85.0,
        diningDollars: 0,
      });

      assert.strictEqual(getSwipesTotal(plan), 17);
      assert.strictEqual(getSwipesRemaining(plan), 0);
      assert.strictEqual(getFlexMealsRemaining(plan), 0);
      assert.strictEqual(getGuestPassesRemaining(plan), 0);
    });

    it('models Junior on Knollcrest 60 Block midway through semester', () => {
      const plan = getStudentMealPlan({
        mealPlanId: 'knollcrest60',
        swipesUsed: 37,
        flexMealsUsed: 0,
        guestPassesUsed: 0,
        knightBucks: 180.0,
        diningDollars: 25.0,
      });

      assert.strictEqual(plan.cadence, 'semester');
      assert.strictEqual(getSwipesTotal(plan), 60);
      assert.strictEqual(getSwipesRemaining(plan), 23); // 60 - 37
      assert.strictEqual(getFlexMealsRemaining(plan), 0);
      assert.strictEqual(getGuestPassesRemaining(plan), 0);
      assert.strictEqual(isBlockPlan(plan), true);
    });

    it('models Senior on Joust 30 Block near graduation', () => {
      const plan = getStudentMealPlan({
        mealPlanId: 'joust30',
        swipesUsed: 29,
        flexMealsUsed: 0,
        guestPassesUsed: 0,
        knightBucks: 50.0,
        diningDollars: 10.0,
      });

      assert.strictEqual(plan.cadence, 'semester');
      assert.strictEqual(getSwipesTotal(plan), 30);
      assert.strictEqual(getSwipesRemaining(plan), 1); // 30 - 29
      assert.strictEqual(isBlockPlan(plan), true);
    });

    it('models Commuter on Core 5 with 1 flex meal', () => {
      const plan = getStudentMealPlan({
        mealPlanId: 'core5',
        swipesUsed: 3,
        flexMealsUsed: 0,
        guestPassesUsed: 0,
        knightBucks: 200.0,
        diningDollars: 50.0,
      });

      assert.strictEqual(getSwipesTotal(plan), 5);
      assert.strictEqual(getSwipesRemaining(plan), 2); // 5 - 3
      assert.strictEqual(getFlexMealsRemaining(plan), 1); // 1 - 0
      assert.strictEqual(getGuestPassesRemaining(plan), 0); // Core 5 has no guest passes
    });

    it('verifies all 7 official Calvin meal plans are fully defined in catalog', () => {
      const planKeys = Object.keys(CALVIN_MEAL_PLANS);
      assert.strictEqual(planKeys.length, 7);
      assert.ok(planKeys.includes('core21'));
      assert.ok(planKeys.includes('core17'));
      assert.ok(planKeys.includes('core14'));
      assert.ok(planKeys.includes('core10'));
      assert.ok(planKeys.includes('core5'));
      assert.ok(planKeys.includes('knollcrest60'));
      assert.ok(planKeys.includes('joust30'));
    });
  });

  describe('Full Dining Hall Schedule Coverage', () => {
    it('verifies all dining locations have non-empty names and descriptions', () => {
      for (const hall of diningHalls) {
        assert.ok(hall.id.length > 0);
        assert.ok(hall.name.length > 0);
        assert.ok(hall.location.length > 0);
        assert.ok(hall.description.length > 0);
      }
    });

    it('checks Commons status across all transitions in a full 24-hour cycle', () => {
      const commons = diningHalls.find((h) => h.id === 'commons')!;

      // 06:00 - Closed, Breakfast at 7:00 AM
      const at6AM = hallStatus(commons, new Date(2026, 8, 15, 6, 0));
      assert.strictEqual(at6AM.open, false);
      assert.strictEqual(at6AM.detail, 'Breakfast at 7:00 AM');

      // 08:30 - Open, Breakfast now, Closes 10:00 AM
      const at830AM = hallStatus(commons, new Date(2026, 8, 15, 8, 30));
      assert.strictEqual(at830AM.open, true);
      assert.strictEqual(at830AM.label, 'Breakfast now');
      assert.strictEqual(at830AM.detail, 'Closes 10:00 AM');

      // 10:15 - Closed, Lunch at 11:00 AM
      const at1015AM = hallStatus(commons, new Date(2026, 8, 15, 10, 15));
      assert.strictEqual(at1015AM.open, false);
      assert.strictEqual(at1015AM.detail, 'Lunch at 11:00 AM');

      // 12:30 - Open, Lunch now, Closes 2:00 PM
      const at1230PM = hallStatus(commons, new Date(2026, 8, 15, 12, 30));
      assert.strictEqual(at1230PM.open, true);
      assert.strictEqual(at1230PM.label, 'Lunch now');
      assert.strictEqual(at1230PM.detail, 'Closes 2:00 PM');

      // 15:00 - Closed, Dinner at 4:30 PM
      const at3PM = hallStatus(commons, new Date(2026, 8, 15, 15, 0));
      assert.strictEqual(at3PM.open, false);
      assert.strictEqual(at3PM.detail, 'Dinner at 4:30 PM');

      // 18:00 - Open, Dinner now, Closes 9:00 PM
      const at6PM = hallStatus(commons, new Date(2026, 8, 15, 18, 0));
      assert.strictEqual(at6PM.open, true);
      assert.strictEqual(at6PM.label, 'Dinner now');
      assert.strictEqual(at6PM.detail, 'Closes 9:00 PM');

      // 22:00 - Closed, Opens tomorrow
      const at10PM = hallStatus(commons, new Date(2026, 8, 15, 22, 0));
      assert.strictEqual(at10PM.open, false);
      assert.strictEqual(at10PM.detail, 'Opens tomorrow');
    });

    it('checks Knollcrest Brunch and Dinner service window transitions', () => {
      const knollcrest = diningHalls.find((h) => h.id === 'knollcrest')!;

      // 11:00 - Open, Brunch now, Closes 2:00 PM
      const brunchStatus = hallStatus(knollcrest, new Date(2026, 8, 15, 11, 0));
      assert.strictEqual(brunchStatus.open, true);
      assert.strictEqual(brunchStatus.label, 'Brunch now');
      assert.strictEqual(brunchStatus.detail, 'Closes 2:00 PM');

      // 15:30 - Closed, Dinner at 5:00 PM
      const midStatus = hallStatus(knollcrest, new Date(2026, 8, 15, 15, 30));
      assert.strictEqual(midStatus.open, false);
      assert.strictEqual(midStatus.detail, 'Dinner at 5:00 PM');

      // 18:00 - Open, Dinner now, Closes 8:00 PM
      const dinnerStatus = hallStatus(knollcrest, new Date(2026, 8, 15, 18, 0));
      assert.strictEqual(dinnerStatus.open, true);
      assert.strictEqual(dinnerStatus.label, 'Dinner now');
      assert.strictEqual(dinnerStatus.detail, 'Closes 8:00 PM');
    });
  });

  describe('Clubs Catalog Categorization Completeness', () => {
    it('verifies clubs are distributed across multiple campus categories', () => {
      const categoriesFound = new Set(CALVIN_CLUBS.map((c) => c.category));
      assert.ok(categoriesFound.size >= 5, 'Clubs must span at least 5 categories');
      assert.ok(categoriesFound.has('Academics'));
      assert.ok(categoriesFound.has('The Arts'));
      assert.ok(categoriesFound.has('Social'));
    });

    it('filters clubs across each official category filter', () => {
      for (const cat of feedCategories) {
        const clubsInCat = searchClubs('', cat);
        for (const club of clubsInCat) {
          assert.strictEqual(club.category, cat);
        }
      }
    });

    it('verifies club contact emails match calvin.edu format', () => {
      for (const club of CALVIN_CLUBS) {
        assert.match(club.contactEmail, /^[a-z0-9._%+-]+@calvin\.edu$/i);
      }
    });
  });

  describe('Device Viewports & Responsive Starfield Benchmarks', () => {
    const devices = [
      { name: 'iPhone SE', w: 375, h: 667, minBase: 30 },
      { name: 'iPhone 15 Pro', w: 393, h: 852, minBase: 30 },
      { name: 'Pixel 9a Baseline', w: 412, h: 915, minBase: 30 },
      { name: 'Pixel 9 Pro XL', w: 448, h: 996, minBase: 33 },
      { name: 'iPad Mini', w: 744, h: 1133, minBase: 50 },
      { name: 'iPad Pro 12.9', w: 1024, h: 1366, minBase: 80 },
      { name: 'MacBook Pro 14', w: 1512, h: 982, minBase: 90 },
      { name: 'Desktop Full HD', w: 1920, h: 1080, minBase: 140 },
      { name: 'Ultrawide 3440x1440', w: 3440, h: 1440, minBase: 240 },
    ];

    for (const device of devices) {
      it(`evaluates ${device.name} (${device.w}x${device.h}) with exact 5:3:1 ratio`, () => {
        const canvasW = device.w * 2.2;
        const canvasH = device.h + 900;
        const counts = calculateStarCounts(canvasW, canvasH);

        assert.ok(
          counts.baseUnit >= device.minBase,
          `${device.name} base unit ${counts.baseUnit} must be at least ${device.minBase}`
        );
        assert.strictEqual(counts.distant, counts.baseUnit * 5);
        assert.strictEqual(counts.midground, counts.baseUnit * 3);
        assert.strictEqual(counts.foreground, counts.baseUnit * 1);
        assert.strictEqual(counts.distant / counts.foreground, 5);
        assert.strictEqual(counts.midground / counts.foreground, 3);
      });
    }
  });

  describe('Student ID Card Display & Barcode Invariants', () => {
    it('formats barcode correctly regardless of student ID input format', () => {
      assert.strictEqual(formatBarcode('2346052'), '00000234605200');
      assert.strictEqual(formatBarcode(' 2346052 '), '00000234605200');
      assert.strictEqual(formatBarcode('234-6052'), '00000234605200');
    });

    it('ensures student ID length matches Calvin standard 7 digits', () => {
      assert.strictEqual(student.id.length, 7);
      assert.match(student.id, /^\d{7}$/);
    });

    it('verifies student residence hall and advisor details are present', () => {
      assert.ok(student.residence.includes('Hall') || student.residence.includes('Apartment'));
      assert.ok(student.advisor.startsWith('Dr.') || student.advisor.startsWith('Prof.'));
    });

    it('validates student academic degree targets', () => {
      assert.strictEqual(student.major, 'Computer Science');
      assert.strictEqual(student.minor, 'Mathematics');
      assert.strictEqual(student.classYear, 2028);
    });
  });

  describe('Tab Pager Gesture Priority & Inner Horizontal Scroll State Machine', () => {
    type PagerState = {
      isInnerScrollActive: boolean;
      isGestureActive: boolean;
      activeTabIndex: number;
      translateX: number;
    };

    function createPagerGestureSimulator(initialIndex = 0, pageWidth = 400) {
      let state: PagerState = {
        isInnerScrollActive: false,
        isGestureActive: false,
        activeTabIndex: initialIndex,
        translateX: (-initialIndex * pageWidth) || 0,
      };

      return {
        getState: () => ({ ...state }),
        setInnerScrollActive: (active: boolean) => {
          state.isInnerScrollActive = active;
        },
        onGestureStart: () => {
          // In app-tabs.tsx: if (isInnerScrollActive.value) { isGestureActive.value = false; return; }
          if (state.isInnerScrollActive) {
            state.isGestureActive = false;
            return;
          }
          state.isGestureActive = true;
        },
        onGestureUpdate: (translationX: number) => {
          if (state.isInnerScrollActive || !state.isGestureActive) return;
          state.translateX = ((-state.activeTabIndex * pageWidth) || 0) + translationX;
        },
        onGestureEnd: (translationX: number, velocityX = 0) => {
          if (state.isInnerScrollActive || !state.isGestureActive) {
            state.isGestureActive = false;
            return;
          }
          state.isGestureActive = false;
          // Apply spring snapping
          const rawIndex = -state.translateX / pageWidth;
          let target = Math.round(rawIndex);
          if (velocityX < -400) target = Math.floor(rawIndex) + 1;
          else if (velocityX > 400) target = Math.ceil(rawIndex) - 1;
          state.activeTabIndex = Math.max(0, Math.min(3, target));
          state.translateX = (-state.activeTabIndex * pageWidth) || 0;
        },
        onGestureFinalize: () => {
          state.isGestureActive = false;
          state.isInnerScrollActive = false;
        },
      };
    }

    it('blocks pager translation when user touches and scrolls horizontal tag chips', () => {
      const sim = createPagerGestureSimulator(0, 400);

      // User touches ChipRow
      sim.setInnerScrollActive(true);
      assert.strictEqual(sim.getState().isInnerScrollActive, true);

      // User moves horizontally by 100px through category tags
      sim.onGestureStart();
      sim.onGestureUpdate(100);
      sim.onGestureEnd(100, 500);

      // Pager track must remain completely unchanged at index 0 (translateX = 0)
      const state = sim.getState();
      assert.strictEqual(state.isGestureActive, false);
      assert.strictEqual(state.activeTabIndex, 0);
      assert.strictEqual(state.translateX, 0);
    });

    it('allows normal tab swiping when user touches outside the tag chips', () => {
      const sim = createPagerGestureSimulator(0, 400);

      // User touches outside ChipRow (isInnerScrollActive is false)
      assert.strictEqual(sim.getState().isInnerScrollActive, false);

      // User swipes left by 250px with velocity
      sim.onGestureStart();
      sim.onGestureUpdate(-250);
      assert.strictEqual(sim.getState().translateX, -250);

      sim.onGestureEnd(-250, -600);

      // Pager transitions to Dining tab (index 1)
      const state = sim.getState();
      assert.strictEqual(state.activeTabIndex, 1);
      assert.strictEqual(state.translateX, -400);
    });

    it('restores normal pager swiping immediately after tag interaction completes', () => {
      const sim = createPagerGestureSimulator(0, 400);

      // Step 1: User scrolls chips
      sim.setInnerScrollActive(true);
      sim.onGestureStart();
      sim.onGestureUpdate(-80);
      assert.strictEqual(sim.getState().translateX, 0); // blocked!

      // Step 2: User releases chips
      sim.setInnerScrollActive(false);
      sim.onGestureFinalize();
      assert.strictEqual(sim.getState().isInnerScrollActive, false);

      // Step 3: Next swipe on screen body works normally
      sim.onGestureStart();
      sim.onGestureUpdate(-200);
      assert.strictEqual(sim.getState().translateX, -200);
      sim.onGestureEnd(-200, -500);

      assert.strictEqual(sim.getState().activeTabIndex, 1);
    });

    it('verifies all feed categories and "All" option are present for filtering', () => {
      const filterOptions = ['All', ...feedCategories];
      assert.strictEqual(filterOptions.length, 9);
      assert.deepStrictEqual(filterOptions, [
        'All',
        'The Arts',
        'Athletics',
        'Music',
        'Academics',
        'Faith',
        'Service',
        'Social',
        'Outdoors',
      ]);
    });

    it('models web mouse drag-to-scroll translation for desktop users', () => {
      let scrollLeft = 0;
      const mouseState = { isDown: true, startX: 200, scrollLeft: 50 };

      // User drags mouse 80px to the left (clientX goes from 200 to 120)
      const clientX = 120;
      const dx = clientX - mouseState.startX; // -80
      scrollLeft = mouseState.scrollLeft - dx; // 50 - (-80) = 130px scrolled

      assert.strictEqual(scrollLeft, 130);
    });
  });
});
