/**
 * In-Memory Mock DAL Test Double
 *
 * ARCHITECTURAL RATIONALE:
 * Provides a 100% in-memory implementation of all Knightly Data Access Layer (DAL)
 * modules for fast, deterministic unit testing of the Business Logic Layer (BLL).
 * Replicates database triggers (such as `apply_dining_transaction()`) in memory.
 */

function createMockDal() {
  // Database tables simulated as in-memory state
  const state = {
    students: new Map(),
    mealPlans: new Map([
      [
        'core21',
        {
          id: 'core21',
          name: 'Core 21',
          cadence: 'weekly',
          swipes_total: 21,
          flex_meals: 3,
          guest_passes: 2,
          bundled_knight_bucks: 160.0,
        },
      ],
      [
        'core17',
        {
          id: 'core17',
          name: 'Core 17',
          cadence: 'weekly',
          swipes_total: 17,
          flex_meals: 3,
          guest_passes: 2,
          bundled_knight_bucks: 125.0,
        },
      ],
      [
        'knollcrest60',
        {
          id: 'knollcrest60',
          name: 'Knollcrest 60 Block',
          cadence: 'semester',
          swipes_total: 60,
          flex_meals: 0,
          guest_passes: 0,
          bundled_knight_bucks: 30.0,
        },
      ],
    ]),
    studentDiningAccounts: new Map(),
    diningTransactions: [],
    diningVenues: [
      {
        id: 'commons',
        name: 'Commons Dining Hall',
        accepts_swipes: true,
        dining_hours: [
          {
            venue_id: 'commons',
            day_of_week: 1, // Monday
            meal_period: 'Breakfast',
            start_minute_after_midnight: 420, // 7:00 AM
            end_minute_after_midnight: 600, // 10:00 AM
          },
          {
            venue_id: 'commons',
            day_of_week: 1, // Monday
            meal_period: 'Lunch',
            start_minute_after_midnight: 660, // 11:00 AM
            end_minute_after_midnight: 840, // 2:00 PM
          },
          {
            venue_id: 'commons',
            day_of_week: 1, // Monday
            meal_period: 'Dinner',
            start_minute_after_midnight: 990, // 4:30 PM
            end_minute_after_midnight: 1260, // 9:00 PM
          },
        ],
      },
    ],
    clubs: new Map([
      [
        'acm',
        {
          id: 'acm',
          name: 'Association for Computing Machinery',
          category: 'Academics',
          mark: 'AC',
        },
      ],
    ]),
    claimCodes: new Map(),
    memberships: [],
    follows: [],
    posts: [],
    savedPosts: [],
    directoryPeople: [],
  };

  // Student DAL Mock
  const studentDal = {
    async getStudentById(id) {
      return state.students.get(id) || null;
    },
    async getStudentByUsername(username) {
      const lower = (username || '').toLowerCase();
      for (const s of state.students.values()) {
        if (s.username.toLowerCase() === lower) return s;
      }
      return null;
    },
    async getStudentByStudentId(studentId) {
      for (const s of state.students.values()) {
        if (s.student_id === studentId) return s;
      }
      return null;
    },
    async updateDirectoryPreferences(id, { directoryOptIn, directoryVisibleFields }) {
      const s = state.students.get(id);
      if (!s) throw new Error(`Student ${id} not found`);
      s.directory_opt_in = !!directoryOptIn;
      s.directory_prompted = true;
      s.directory_visible_fields = directoryVisibleFields;
      s.updated_at = new Date().toISOString();
      return s;
    },
    async upsertStudent(data) {
      const existing = state.students.get(data.id) || {};
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      state.students.set(data.id, updated);
      return updated;
    },
  };

  // Dining DAL Mock
  const diningDal = {
    async getMealPlans() {
      return Array.from(state.mealPlans.values());
    },
    async getMealPlanById(id) {
      return state.mealPlans.get(id) || null;
    },
    async getStudentDiningAccount(studentId) {
      const account = state.studentDiningAccounts.get(studentId);
      if (!account) return null;
      const plan = state.mealPlans.get(account.meal_plan_id);
      return { ...account, meal_plan: plan };
    },
    async recordDiningTransaction(tx) {
      const record = {
        id: `tx-${state.diningTransactions.length + 1}`,
        student_id: tx.studentId,
        venue_id: tx.venueId,
        transaction_type: tx.transactionType,
        amount: Number(tx.amount),
        register_id: tx.registerId || 'kiosk-main',
        cashier_id: tx.cashierId || null,
        description: tx.description,
        external_transact_ref: tx.externalTransactRef || null,
        created_at: new Date().toISOString(),
      };

      state.diningTransactions.push(record);

      // Replicate the PostgreSQL trigger apply_dining_transaction() in memory
      const account = state.studentDiningAccounts.get(tx.studentId);
      if (account) {
        if (tx.transactionType === 'meal_swipe') {
          account.swipes_used = (account.swipes_used || 0) + Number(tx.amount);
        } else if (tx.transactionType === 'flex_meal') {
          account.flex_meals_used = (account.flex_meals_used || 0) + Number(tx.amount);
        } else if (tx.transactionType === 'guest_pass') {
          account.guest_passes_used = (account.guest_passes_used || 0) + Number(tx.amount);
        } else if (tx.transactionType === 'knight_bucks') {
          account.knight_bucks = Number(account.knight_bucks || 0) - Number(tx.amount);
        } else if (tx.transactionType === 'dining_dollars') {
          account.dining_dollars = Number(account.dining_dollars || 0) - Number(tx.amount);
        }
        account.updated_at = new Date().toISOString();
      }

      return record;
    },
    async getDiningTransactions(studentId, options = {}) {
      let list = state.diningTransactions.filter((tx) => tx.student_id === studentId);
      if (options.sinceDate) {
        const sinceEpoch = new Date(options.sinceDate).getTime();
        list = list.filter((tx) => new Date(tx.created_at).getTime() >= sinceEpoch);
      }
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    async getDiningVenues() {
      return state.diningVenues;
    },
    async upsertStudentDiningAccount(accountData) {
      state.studentDiningAccounts.set(accountData.student_id, { ...accountData });
      return state.studentDiningAccounts.get(accountData.student_id);
    },
  };

  // Clubs DAL Mock
  const clubsDal = {
    async getClubs() {
      // Non-social privacy invariant: follower_count is suppressed from public and club queries
      return Array.from(state.clubs.values()).map(({ follower_count, ...c }) => c);
    },
    async getClubById(id) {
      const club = state.clubs.get(id);
      if (!club) return null;
      const { follower_count, ...safeClub } = club;
      return safeClub;
    },
    async getClaimCodeByHash(codeHash) {
      return state.claimCodes.get(codeHash) || null;
    },
    async redeemClaimCode(codeId, studentId, clubId) {
      for (const code of state.claimCodes.values()) {
        if (code.id === codeId) {
          code.is_redeemed = true;
          code.redeemed_by_student_id = studentId;
          code.redeemed_at = new Date().toISOString();
          break;
        }
      }
      const membership = {
        id: `mem-${state.memberships.length + 1}`,
        student_id: studentId,
        club_id: clubId,
        claim_code_id: codeId,
        granted_at: new Date().toISOString(),
      };
      state.memberships.push(membership);
      return membership;
    },
    async getMembershipsForStudent(studentId) {
      return state.memberships.filter((m) => m.student_id === studentId);
    },
  };

  // Posts DAL Mock
  const postsDal = {
    async getPosts(filters = {}) {
      let list = state.posts.filter((p) => p.status === 'published');
      if (filters.category && filters.category.toLowerCase() !== 'all') {
        list = list.filter((p) => p.category.toLowerCase() === filters.category.toLowerCase());
      }
      return list.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
    },
    async getPostById(id) {
      return state.posts.find((p) => p.id === id) || null;
    },
    async createPost(post) {
      const record = {
        id: `post-${state.posts.length + 1}`,
        ...post,
      };
      state.posts.push(record);
      return record;
    },
    async upsertScrapedEvent(event) {
      const extId = event.external_event_id || event.externalEventId;
      const existingIdx = state.posts.findIndex((p) => (p.external_event_id || p.externalEventId) === extId);
      const record = {
        id: existingIdx >= 0 ? state.posts[existingIdx].id : `post-scraped-${state.posts.length + 1}`,
        ...event,
        external_event_id: extId,
        status: 'published',
        posted_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        state.posts[existingIdx] = record;
      } else {
        state.posts.push(record);
      }
      return record;
    },
    async savePost(studentId, postId) {
      const record = { student_id: studentId, post_id: postId, saved_at: new Date().toISOString() };
      state.savedPosts.push(record);
      return record;
    },
    async unsavePost(studentId, postId) {
      state.savedPosts = state.savedPosts.filter((sp) => !(sp.student_id === studentId && sp.post_id === postId));
      return true;
    },
    async getSavedPosts(studentId) {
      const ids = state.savedPosts.filter((sp) => sp.student_id === studentId).map((sp) => sp.post_id);
      return state.posts.filter((p) => ids.includes(p.id));
    },
  };

  // Directory DAL Mock
  const directoryDal = {
    async searchDirectory(filters = {}) {
      return state.directoryPeople.filter((p) => p.is_public_visible);
    },
    async syncStudentDirectoryListing(student) {
      const record = {
        id: `dir-${state.directoryPeople.length + 1}`,
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        is_public_visible: !!student.directory_opt_in,
      };
      state.directoryPeople.push(record);
      return record;
    },
  };

  return {
    state,
    studentDal,
    diningDal,
    clubsDal,
    postsDal,
    directoryDal,
  };
}

module.exports = {
  createMockDal,
};
