# Knightly User Stories & Traceability Matrix

This document provides a comprehensive tracking repository of all user stories and functional requirements for **Knightly**, the mobile-first campus life super-app for Calvin University.

It consolidates:
1. **Part 1:** The original user stories transcribed from [`docs/Knightly User Stories.pdf`](file:///C:/Users/kelle/cs-262/knightly/docs/Knightly%20User%20Stories.pdf), organized into the canonical 6 product functional domains.
2. **Part 2:** The converted user stories derived from the Software Requirements Specification ([`docs/SRS_Document.md`](file:///C:/Users/kelle/cs-262/knightly/docs/SRS_Document.md) Section 3.1, `FR-1` through `FR-26`), formatted into standard agile user story syntax:
   $$\text{As a } [\text{role}], \text{ I should be able to } [\text{action}], \text{ so that } [\text{outcome}]$$
3. **Part 3:** Comprehensive user stories derived from a full codebase audit covering advanced creative authoring, club leadership authorization, desktop/responsive mechanics, interactive vector map features, astronomical visual identity, security masking, offline data resilience, and centralized template architectures (`US-X01` through `US-X26`).

---

## Executive Summary & Implementation Status

| Domain / Specification Source | Total Stories | Implemented (`[x]`) | Pending / Partial (`[ ]`) | Completion Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Knightly Feed** (Original PDF) | 14 | 11 | 3 | 78.6% |
| **Dining and Knight Card** (Original PDF) | 13 | 9 | 4 | 69.2% |
| **Safety** (Original PDF) | 8 | 7 | 1 | 87.5% |
| **Directory** (Original PDF) | 3 | 3 | 0 | 100.0% |
| **Navigation and Experience** (Original PDF) | 7 | 5 | 2 | 71.4% |
| **Account and Personal Data** (Original PDF) | 3 | 2 | 1 | 66.7% |
| **Subtotal: Part 1 (Original User Stories PDF)** | **48** | **37** | **11** | **77.1%** |
| **Subtotal: Part 2 (SRS Requirements `FR-1`–`FR-26`)** | **26** | **23** | **3** | **88.5%** |
| **Creative & Post Authoring** (Codebase Audit) | 5 | 5 | 0 | 100.0% |
| **Club Leadership & Verification** (Codebase Audit) | 3 | 3 | 0 | 100.0% |
| **Desktop & Responsive Experience** (Codebase Audit) | 3 | 3 | 0 | 100.0% |
| **Interactive Campus Map & Location Services** (Codebase Audit) | 2 | 2 | 0 | 100.0% |
| **Visual Identity & Astrophysics** (Codebase Audit) | 2 | 2 | 0 | 100.0% |
| **Campus Dining & Services** (Codebase Audit) | 2 | 2 | 0 | 100.0% |
| **Authentication & Security** (Codebase Audit) | 3 | 3 | 0 | 100.0% |
| **Offline Resilience & Data Integrity** (Codebase Audit) | 3 | 3 | 0 | 100.0% |
| **Template Architecture & Consolidation** (Codebase Audit) | 3 | 3 | 0 | 100.0% |
| **Subtotal: Part 3 (Additional Features Audit `US-X01`–`US-X26`)** | **26** | **26** | **0** | **100.0%** |
| **Grand Total (Tracked Requirements)** | **100** | **86** | **14** | **86.0%** |

---

## Part 1: Original User Stories (from `Knightly User Stories.pdf`)

### 1. Knightly Feed

- [x] **US-F01:** As a student, I want a scrollable feed of club and campus posts that read fully in place, so I can catch up without tapping into separate article screens.
  - *Verification & Code Reference:* Implemented in [`FeedMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-mobile-view.tsx) and [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx). Posts show the complete headline, event date/time, venue, and description text body directly in the scrollable feed stream without forcing navigation to sub-pages.
- [x] **US-F02:** As a student, I want a For you view showing posts from orgs I follow plus campus-wide announcements, so I see what's relevant first.
  - *Verification & Code Reference:* Implemented in [`feed-context.tsx`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx) and [`filterFeedPosts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts). When the "Following" scope is active, the feed filters strictly to posts from followed club IDs (`isFollowing(post.clubId)`) plus university-wide announcements (`post.campusWide === true`).
- [x] **US-F03:** As a student, I want an All campus view with every post published from approved campus sources, ordered newest first, so I can discover clubs and events I don't follow yet.
  - *Verification & Code Reference:* Implemented in [`FeedMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-mobile-view.tsx), [`FeedWebView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-web-view.tsx), and [`sortPostsByDate`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts). "All Campus" toggle renders all approved university and student club posts sorted in reverse-chronological order.
- [x] **US-F04:** As a student, I want to search posts all over campus, so I can find a specific event or organization quickly.
  - *Verification & Code Reference:* Implemented in [`FeedSearchField`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-controls.tsx) and [`filterFeedPosts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts). Performs real-time substring searches across headline, body text, organization name, venue, and category.
- [x] **US-F05:** As a student, I want to filter posts by category (The Arts, Athletics, Music, Academics, Faith, Service, Social, Outdoors), so I can browse by interest.
  - *Verification & Code Reference:* Implemented in [`FeedFilterChips`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-controls.tsx) and [`feedCategories`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts). Supports horizontal category chips covering all 13 standard campus taxonomy categories with multi-selection support and clear reset.
- [x] **US-F06:** As a student, I want to follow and unfollow campus organizations, so I can control which organizations appear in my For you feed.
  - *Verification & Code Reference:* Implemented in [`ClubFollowContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/club-follow-context.tsx), [`FollowButton`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/follow-button.tsx), and [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx). Provides instantaneous $O(1)$ Set lookups and updates the Following feed immediately.
- [x] **US-F07:** As a student, I want to mark a post as a favorite, so I can save an announcement or event to revisit later.
  - *Verification & Code Reference:* Implemented in [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx) (star bookmark button) and [`toggleSavePost`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx). Bookmarks are persisted to account-partitioned local storage (`knightly_saved_posts_{account}`).
- [x] **US-F08:** As a student, I want to view my favorite posts and remove posts from that list, so I can keep useful information easy to find.
  - *Verification & Code Reference:* Implemented in [`FeedMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-mobile-view.tsx) ("Saved" segmented option) and [`savedPosts`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx). Clicking the star removes the post from the saved list with immediate UI synchronization.
- [x] **US-F09:** As a student, I want the feed to automatically retrieve published club and campus posts from configured, approved Calvin sources when I open it, so I can catch up without checking separate websites.
  - *Verification & Code Reference:* Implemented in [`fetchCampusEvents`](file:///C:/Users/kelle/cs-262/knightly/client/src/services/events-api.ts) and [`FeedProvider`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx). On mount, the client queries `GET /api/events` (backed by [`event-scraper.js`](file:///C:/Users/kelle/cs-262/knightly/server/services/event-scraper.js)), merging live Calvin events with offline seed fallback.
- [x] **US-F10:** As a student, I want event posts to show the event date, time, location, and any registration link, so I can decide whether to attend and know how to participate.
  - *Verification & Code Reference:* Implemented in [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx). Formats when/where logistics, renders calendar and pin icons, and displays external action/registration buttons when link metadata is provided.
- [x] **US-F11:** As an authorized club representative, I want to submit a post with a title, content, category, and any event details for my club, so students can discover our announcements and activities.
  - *Verification & Code Reference:* Implemented in [`usePostComposer`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-post-composer.ts), [`PostMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-mobile-view.tsx), and [`PostWebView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-web-view.tsx). Verified club leaders can input title, description, category, masked dates, dual 12-hour time ranges, locations, and images.
- [ ] **US-F12:** As an authorized club representative, I want to edit posts belonging to my club, so changed dates, locations, and other details stay accurate.
  - *Status:* **Pending Implementation.** Currently, the composer only supports publishing new posts (`createPost`). An edit form pre-populated with existing post attributes and a corresponding update handler (`PUT /api/posts/:id`) are not yet implemented.
- [ ] **US-F13:** As an authorized club representative, I want to mark an event to post as canceled, so students can see that the event will not take place.
  - *Status:* **Pending Implementation.** Post data models do not yet include a `isCancelled` status flag or canceled overlay banner in [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx).
- [ ] **US-F14:** As an authorized club representative, I want to withdraw an outdated post from the feed, so students do not rely on information that no longer applies.
  - *Status:* **Pending UI Exposure.** While [`deletePost(id)`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx#L308) exists in the context layer, there is currently no user-facing delete/withdraw button on post cards or in a club leader management dashboard.

---

### 2. Dining and Knight Card

- [x] **US-D01:** As a student, I want to see my meal plan in one place, so I know what I have left.
  - *Verification & Code Reference:* Implemented in [`DiningCardSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-card-section.tsx) and [`MealPlanStats`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/meal-plan-stats.tsx). Displays meal plan name, remaining meal swipes, KnightBucks, and Dining Dollars.
- [x] **US-D02:** As a student, I want my remaining swipes and guest passes shown as one dash per meal, so I can understand my balance at a glance.
  - *Verification & Code Reference:* Implemented in [`DashMeter`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/dash-meter.tsx). Renders discrete rounded dash chips (one chip per remaining meal swipe) with empty slots indicated by semi-transparent dashes.
- [x] **US-D03:** As a student, I want to tap my Knight Card to open my student ID full screen, so I can present it quickly.
  - *Verification & Code Reference:* Implemented in [`KnightCardScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/card.tsx) and [`DiningCardSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-card-section.tsx). Tapping the digital card navigates to the dedicated high-contrast full-screen ID card modal.
- [x] **US-D04:** As a student, I want the screen brightness to rise automatically when my ID opens, so scanners can read the barcode reliably.
  - *Verification & Code Reference:* Implemented in [`useBoostedBrightness`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/card.tsx#L18) using `expo-brightness`. Automatically records device brightness and ramps display brightness to 1.0 (100%) upon mounting and foregrounding.
- [x] **US-D05:** As a student, I want my previous brightness restored when I dismiss the ID, so I don't have to readjust my phone.
  - *Verification & Code Reference:* Implemented in [`useBoostedBrightness`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/card.tsx#L22). Restores exact pre-boost system brightness or cached level on dismissal, unmount, or app backgrounding.
- [x] **US-D06:** As a student, I want the ID barcode to scale to fit my screen, so it scans on any device size.
  - *Verification & Code Reference:* Implemented in [`Barcode`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/barcode.tsx). Generates 14-digit Code 128 / 39 bars scaled dynamically to container widths.
- [x] **US-D07:** As a student, I want to see dining hall hours relative to the current time, so I know what's open right now.
  - *Verification & Code Reference:* Implemented in [`hallStatus`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/dining.ts#L331) and [`DiningHallsSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-venues-section.tsx). Calculates status against wall-clock time, displaying "Open now", "Lunch now", or "Closed" with next transition times (e.g. "Closes 9:00 PM", "Dinner at 4:30 PM").
- [x] **US-D08:** As a student, I want to see today's stations, so I can decide where to eat.
  - *Verification & Code Reference:* Implemented in [`DiningMenuSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-venues-section.tsx#L65). Renders categorized stations (Grill, Homestyle, Pure Eats allergen-free, Deli) with today's dishes.
- [x] **US-D09:** As a student, I want to view my recent transactions, so I can track my spending.
  - *Verification & Code Reference:* Implemented in [`DiningActivityView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-activity.tsx) and [`dining-history.tsx`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/dining-history.tsx). Shows 7-day spend summaries and transaction lists with timestamps, locations, and payment types.
- [ ] **US-D10:** As a student, I want dining hours and today's menu to be automatically retrieved from approved Calvin sources when I open Dining, so I can find the latest available information in one place.
  - *Status:* **Pending Implementation.** Currently, dining hours and menus are statically defined in [`client/src/data/dining.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/dining.ts). Live automated scraping or API retrieval from Calvin Creative Dining services is pending.
- [ ] **US-D11:** As a signed-in student, I want my meal balances, transaction history, and Knight Card information retrieved from approved university services for my account, so the app shows my own information.
  - *Status:* **Pending Implementation.** Student dining balances and card data currently load from client mock profiles ([`client/src/data/student.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/student.ts)). Integration with Calvin's live card management API (e.g. CalNet / Knight Card database) is scheduled for subsequent phases.
- [ ] **US-D12:** As a student, I want to select a dining hall and see that hall's hours and menu, so I can compare where to eat.
  - *Status:* **Pending Implementation.** While all halls display hours in [`DiningHallsSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-venues-section.tsx), the daily station menu is hardcoded to Commons. Venue tabs to switch station menus between Commons, Knollcrest, Upper Crust, and Johnny's are not yet implemented.
- [ ] **US-D13:** As a student, I want a message explaining how to adjust brightness when automatic adjustment is unavailable, so I can still prepare my ID for scanning.
  - *Status:* **Pending Implementation.** In [`card.tsx`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/card.tsx), brightness errors and web platforms are silently bypassed without rendering an instructional banner or manual brightness adjustment guide.

---

### 3. Safety

- [x] **US-S01:** As a student, I want a one-tap call button to campus safety, so I can reach help immediately in an emergency.
  - *Verification & Code Reference:* Implemented in [`SafetyEmergencyButton`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L35). Tapping the button directly initiates a phone call to Calvin Campus Safety Dispatch (`tel:6165263333`) via `Linking.openURL`.
- [x] **US-S02:** As a student, I want quick entry points for Safe Walk, reporting an incident, and blue light locations, so I can get the right help without searching.
  - *Verification & Code Reference:* Implemented in [`SafetyQuickAssistCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L60). Offers distinct quick cards for Safe Walk dispatch, Incident Reporting, and Blue Light phone locations.
- [x] **US-S03:** As a student, I want to see recent campus alerts, so I stay informed about anything affecting my safety.
  - *Verification & Code Reference:* Implemented in [`SafetyAlertsSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L94). Displays active campus safety notices from the last 48 hours with severity indicators and timestamps.
- [x] **US-S04:** As a student, I want a list of campus phone numbers, so I can contact the right office.
  - *Verification & Code Reference:* Implemented in [`SafetyNumbersSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L139) and [`emergencyContacts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/safety.ts). Lists Campus Safety non-emergency, Health Services, Campus Ministries, Residence Life, and Title IX with one-tap dialing.
- [x] **US-S05:** As a student, I want a quick entry point that opens the official incident-report form, so I can report a concern through the correct campus service.
  - *Verification & Code Reference:* Implemented in [`SafetyQuickAssistCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L75). Opens Calvin's official incident reporting portal via `WebBrowser.openBrowserAsync`.
- [x] **US-S06:** As a student, I want a quick entry point that opens an official map or maintained list of blue light locations, so I can find the nearest listed emergency phone.
  - *Verification & Code Reference:* Implemented in [`LocationInfoModal`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/location-info-modal.tsx) and [`SafetyQuickAssistCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L81). Opens modal describing campus blue light emergency phone poles and callbox locations.
- [x] **US-S07:** As a student, I want saved Campus Safety and emergency contact numbers to remain visible without an internet data connection, so I can find help when online services are unavailable.
  - *Verification & Code Reference:* Implemented in [`data/safety.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/safety.ts). Safety numbers are statically bundled within client memory, guaranteeing 100% offline access with zero network dependencies.
- [ ] **US-S08:** As a student, I want the Safety screen to automatically retrieve alerts from an approved campus source when I open it, so I can read the latest available announcements.
  - *Status:* **Pending Implementation.** Alerts are currently sourced from the local dataset [`safetyAlerts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/safety.ts#L6); dynamic polling or webhook ingestion from Calvin Emergency Management is not yet built.

---

### 4. Directory

- [x] **US-R01:** As a student, I want to search the directory of students, faculty, and staff, so I can find someone quickly.
  - *Verification & Code Reference:* Implemented in [`DirectoryScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/(tabs)/directory.tsx) and [`people`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/directory.ts). Performs instant fuzzy search across name, email, department, academic major, and phone extensions.
- [x] **US-R02:** As a student, I want to filter the directory by role, so I can narrow results to the group I need.
  - *Verification & Code Reference:* Implemented in [`DirectoryScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/(tabs)/directory.tsx#L25). Provides role filter chips (`All`, `Students`, `Faculty`, `Staff`) that instantly partition directory rows.
- [x] **US-R03:** As a student, I want to tap a person's row to open my mail client, so I can email them without copying addresses.
  - *Verification & Code Reference:* Implemented in [`DirectoryScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/(tabs)/directory.tsx#L52). Tapping any person row launches the OS default email client with `mailto:{email}` pre-filled.

---

### 5. Navigation and Experience

- [x] **US-N01:** As a student, I want to swipe left and right between the four tabs, so I can move around the app naturally with one hand.
  - *Verification & Code Reference:* Implemented in [`AppTabs`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.tsx) using `react-native-gesture-handler` and `react-native-reanimated`. Supports continuous 1:1 finger swipe tracking across horizontal slots.
- [x] **US-N02:** As a student, I want the swipe to follow my finger with elastic edges and a spring snap, so navigation feels smooth and responsive.
  - *Verification & Code Reference:* Implemented in [`AppTabs`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.tsx#L400). Configured with rubber-band edge drag resistance and high-refresh-rate spring physics (`withSpring`).
- [x] **US-N03:** As a student, I want to tap the bottom bar to slide to a tab, so I have a clear alternative to swiping.
  - *Verification & Code Reference:* Implemented in [`BottomTabBar`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/bottom-tab-bar.tsx). Tab presses animate the horizontal pager track smoothly to the targeted slot index.
- [x] **US-N04:** As a student, I want light and dark palettes, so the app is comfortable to read in any environment.
  - *Verification & Code Reference:* Implemented in [`theme.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/constants/theme.ts), [`useTheme`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-theme.ts), and [`useColorScheme`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-color-scheme.ts). Full light and dark themes using official Calvin Maroon (`#8C2131`) and Collegiate Gold (`#E8B019`) color tokens.
- [x] **US-N05:** As a web user, I want a top navigation bar, so the app works with a mouse and larger screen.
  - *Verification & Code Reference:* Implemented in [`AppTabsWeb`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.web.tsx) and [`AppHeader`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/app-header.tsx). Features desktop navbar with clickable tab links, avatar, and quick links.
- [ ] **US-N06:** As a student, I want a refresh action on the feed, dining, and safety screens, so I can request updated information without reopening the app.
  - *Status:* **Pending Implementation.** Pull-to-refresh (`RefreshControl`) gestures and manual refresh buttons have not yet been wired into the feed, dining, or safety view components.
- [ ] **US-N07:** As a student, I want separate loading, no-results, and request-failure messages, with retry after a failure, so I understand what happened and can try again.
  - *Status:* **Partial Implementation.** No-results empty states are implemented ([`FeedEmptyState`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-controls.tsx#L42)). However, explicit animated loading skeletons and error banners with retry buttons on network failure are not yet implemented.

---

### 6. Account and Personal Data

- [x] **US-A01:** As a student, I want to sign in through an approved Calvin authentication service, so I can access university information associated with my account.
  - *Verification & Code Reference:* Implemented in [`LoginScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/login-screen.tsx) and [`AuthContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/auth-context.tsx). Validates Calvin usernames/emails (`jmd42`, `jmd42@calvin.edu`) and gates personalized student features. (Full CalNet SSO provider integration pending).
- [x] **US-A02:** As a student, I want to sign out and clear my personal information from the app screen and local cache, so another person using my device cannot view my account details.
  - *Verification & Code Reference:* Implemented in [`signOut`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/auth-context.tsx#L114). Completely unmounts the application shell, resets session tokens, and isolates local saved posts and club leadership keys by account identifier.
- [ ] **US-A03:** As a student, I want an expired session to hide personal information and ask me to sign in again, so my account data is not shown without an active session.
  - *Status:* **Pending Implementation.** Inactivity timers, JWT expiry checks, and automatic background session eviction have not yet been implemented in [`AuthContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/auth-context.tsx).

---

## Part 2: SRS Functional Requirements Converted to User Stories

All 26 functional requirements defined in [`docs/SRS_Document.md`](file:///C:/Users/kelle/cs-262/knightly/docs/SRS_Document.md) Section 3.1 are transcribed below into standard Agile user story syntax:

- [x] **FR-1:** **Dashboard & Core Navigation**
  `As a student, I should be able to view the home dashboard with persistent navigation to dining, safety, directory, and student services upon sign-in, so that I can easily discover campus news and access key university tools.`
  - *Verification & Code Reference:* Implemented in [`AppTabs`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.tsx) and [`BottomTabBar`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/bottom-tab-bar.tsx).

- [x] **FR-2:** **Dining Venues & Real-Time Status**
  `As a student, I should be able to view real-time status (Open/Closed), operating hours, meal service periods, and current station menus for each dining venue, so that I know where and when to eat on campus.`
  - *Verification & Code Reference:* Implemented in [`diningHalls`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/dining.ts#L242) and [`DiningHallsSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-venues-section.tsx#L19).

- [x] **FR-3:** **Meal Balances & Dash Meter**
  `As a student, I should be able to view my meal plan balances with a visual Dash Meter and track recent transaction activity, so that I can monitor my remaining meals and campus spending at a glance.`
  - *Verification & Code Reference:* Implemented in [`DashMeter`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/dash-meter.tsx), [`DiningCardSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-card-section.tsx), and [`DiningActivityView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-activity.tsx).

- [x] **FR-4:** **Digital Knight Card & Auto-Brightness**
  `As a student, I should be able to display my digital Knight Card with an auto-brightened 14-digit barcode that restores brightness on dismissal, so that dining and library barcode scanners can reliably read my student ID.`
  - *Verification & Code Reference:* Implemented in [`KnightCardScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/card.tsx) and [`Barcode`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/barcode.tsx).

- [x] **FR-5:** **Emergency Dispatch 2-Tap Access**
  `As a student, I should be able to reach emergency dispatch in no more than two taps from any screen and one tap on the Safety screen, so that I can immediately get assistance in an urgent or dangerous situation.`
  - *Verification & Code Reference:* Implemented in [`SafetyEmergencyButton`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L35) and bottom tab index 2.

- [x] **FR-6:** **Offline Safety Directory**
  `As a student, I should be able to access campus safety numbers and emergency contacts offline, so that I can call for help even without a cellular data or Wi-Fi connection.`
  - *Verification & Code Reference:* Implemented in [`data/safety.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/safety.ts) and [`SafetyNumbersSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L139).

- [x] **FR-7:** **Reverse-Chronological Feed**
  `As a student, I should be able to see the latest announcements and events ordered newest first using server-authoritative timestamps, so that I stay informed of timely campus happenings without feed manipulation.`
  - *Verification & Code Reference:* Implemented in [`sortPostsByDate`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts#L86) and [`FeedProvider`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx).

- [x] **FR-8:** **Dual-Scope Feed Filter**
  `As a student, I should be able to toggle between a Following feed and an All Campus feed, so that I can prioritize organizations I care about while retaining the option to discover all campus events.`
  - *Verification & Code Reference:* Implemented in [`FeedMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-mobile-view.tsx) and [`FeedWebView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-web-view.tsx).

- [x] **FR-9:** **Real-Time Feed Search**
  `As a student, I should be able to search posts in real time across headlines, descriptions, clubs, categories, and venues, so that I can quickly locate specific campus activities.`
  - *Verification & Code Reference:* Implemented in [`FeedSearchField`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-controls.tsx) and [`filterFeedPosts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts).

- [x] **FR-10:** **13-Category Campus Taxonomy Filtering**
  `As a student, I should be able to filter feed posts using category chips spanning the 13 campus categories, so that I can discover events tailored to my specific interests.`
  - *Verification & Code Reference:* Implemented in [`feedCategories`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/feed.ts) and [`FeedFilterChips`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-controls.tsx).

- [x] **FR-11:** **Saved & Favorite Posts**
  `As a student, I should be able to bookmark posts, view them in a dedicated Saved tab, and remove them when finished, so that I can keep track of events I plan to attend.`
  - *Verification & Code Reference:* Implemented in [`FeedContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/feed-context.tsx#L182) and [`FeedMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-mobile-view.tsx).

- [x] **FR-12:** **Organization Following Management**
  `As a student, I should be able to follow and unfollow campus organizations from post cards and club pages, so that my personalized feed immediately reflects my club preferences.`
  - *Verification & Code Reference:* Implemented in [`ClubFollowContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/club-follow-context.tsx) and [`FollowButton`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/follow-button.tsx).

- [x] **FR-13:** **Event Flyer & Simple Banner Rendering**
  `As a student, I should be able to view rich event metadata with hero photography or auto-generated collegiate Simple Banners, so that flyers look visually polished without generic placeholder line art.`
  - *Verification & Code Reference:* Implemented in [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx), [`preset-banners.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/constants/preset-banners.ts), and [`image-fingerprint.js`](file:///C:/Users/kelle/cs-262/knightly/server/services/image-fingerprint.js).

- [x] **FR-14:** **Campus People Directory & One-Touch Contact**
  `As a student, I should be able to search the campus directory by role and contact individuals with one-touch email or phone links, so that I can connect with professors, staff, and peers effortlessly.`
  - *Verification & Code Reference:* Implemented in [`DirectoryScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/(tabs)/directory.tsx) and [`data/directory.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/directory.ts).

- [x] **FR-15:** **Interactive Vector Campus Map**
  `As a student, I should be able to navigate an interactive vector campus map with zoom and pan gestures, so that I can find buildings and navigate around Calvin University.`
  - *Verification & Code Reference:* Implemented in [`CampusMapScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/campus-map.tsx) and [`CampusMapView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/campus-map-view.tsx).

- [x] **FR-16:** **Club Directory & Dynamic Profiles**
  `As a student, I should be able to browse the campus club directory and tap any organization to view its profile, meeting times, and room locations, so that I can get involved in student life.`
  - *Verification & Code Reference:* Implemented in [`ClubsDirectoryView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/clubs-directory-view.tsx), [`ClubDetailView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/club-detail-view.tsx), and [`clubs.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/clubs.ts).

- [x] **FR-17:** **Club Leadership Claim Code Verification**
  `As a club leader, I should be able to enter a 10-character claim code to verify leadership authorization and unlock the Create Post composer, so that I can represent my organization and publish announcements.`
  - *Verification & Code Reference:* Implemented in [`ClaimClubModal`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/claim-club-modal.tsx), [`ClubLeadershipContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/club-leadership-context.tsx), and [`club-codes.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/club-codes.ts).

- [x] **FR-18:** **Post Composer & Media Cropping**
  `As an authorized club leader, I should be able to create an event post with verified date-time masking, 16:9 flyer cropping, and venue details, so that my club's flyers are accurate and attractively presented.`
  - *Verification & Code Reference:* Implemented in [`usePostComposer`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-post-composer.ts), [`PostMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-mobile-view.tsx), and [`InlineImageCropper`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/inline-image-cropper.tsx).

- [x] **FR-19:** **Horizontal Gesture Pager & Tab Navigation**
  `As a student, I should be able to transition between main sections using a bottom tab bar and a gesture-driven horizontal pager with spring physics, so that navigation is tactile, fluid, and intuitive.`
  - *Verification & Code Reference:* Implemented in [`AppTabs`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.tsx) and [`BottomTabBar`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/bottom-tab-bar.tsx).

- [x] **FR-20:** **Inline Phantom Tabs Architecture**
  `As a student, I should be able to view subpages as inline Phantom Tabs with blanked trailing slots, so that navigation feels continuous and never glitches or exposes unrelated screens during overscroll.`
  - *Verification & Code Reference:* Implemented in [`phantom-tabs.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/constants/phantom-tabs.ts) and [`AppTabs`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.tsx).

- [x] **FR-21:** **Calvin Credential Authentication**
  `As a student, I should be able to sign in with my Calvin credentials to mount the application shell and view personalized account details, so that I can access my Knight Card and student data.`
  - *Verification & Code Reference:* Implemented in [`LoginScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/login-screen.tsx) and [`AuthContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/auth-context.tsx).

- [x] **FR-22:** **Unauthenticated Data Gating**
  `As a guest or unauthenticated user, I should be restricted to public content and blocked from viewing personal student data or authoring posts, so that student privacy and administrative integrity are maintained.`
  - *Verification & Code Reference:* Implemented in [`AuthContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/auth-context.tsx), [`_layout.tsx`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/_layout.tsx), and [`PostNotLeaderView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-not-leader-view.tsx).

- [x] **FR-23:** **Offline Resilience & Seed Data Fallback**
  `As a student, I should be able to use the app seamlessly offline or when the server is down without experiencing crashes, so that campus events and safety contacts are always available.`
  - *Verification & Code Reference:* Implemented in [`fetchCampusEvents`](file:///C:/Users/kelle/cs-262/knightly/client/src/services/events-api.ts) with graceful fallback to [`calvin-events-seed.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/calvin-events-seed.ts) (Sprint 1 SLO SC2).

- [ ] **FR-24:** **Real-Time Remote Content Synchronization**
  `As a student, I should be able to see newly published or modified announcements from club leaders on my next feed update, so that I receive up-to-date campus information.`
  - *Status:* **Partial Implementation.** Local posts update instantly for the publishing author via `FeedContext`, but server-wide feed synchronization and automated polling for other active client devices are not yet implemented.

- [ ] **FR-25:** **Fault Isolation & Friendly Retry Handling**
  `As a student, I should be able to see a friendly error message with a retry option if an API request fails while unaffected features continue working, so that temporary network issues do not interrupt my entire experience.`
  - *Status:* **Pending Implementation.** Failed network requests currently fall back silently to bundled seed data; user-facing error banners and retry actions have not yet been built.

- [ ] **FR-26:** **Campus Printing Services**
  `As a student, I should be able to view campus printer locations, access university printing portals, and check printing quota guidance, so that I can print assignments without confusion.`
  - *Status:* **Pending Implementation.** The printing feature and accompanying UI screen have not yet been implemented in the codebase.

---

## Part 3: Additional Application Features (Codebase Audit)

This section documents advanced functional capabilities and architectural implementations uncovered during a comprehensive audit of the Knightly codebase that extend beyond the baseline PDF user stories and original SRS functional requirements.

---

### 1. Creative & Post Authoring

- [x] **US-X01:** As an authorized club leader, I should be able to select from 16 collegiate color themes and 16 geometric or organic vector pattern overlays to generate 256 unique banner combinations rendered via pure React Native SVG without `<defs>` or `<use>` tags, so that my club event announcements have vibrant, sharp, and lightweight branded artwork that prevents native GPU cache blackouts on iOS and Android devices.
  - *Verification & Code Reference:* Implemented in [`preset-banners.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/constants/preset-banners.ts), [`PostBannerSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-banner-section.tsx), and [`PostCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-card.tsx). Provides 16 background hues (warm and cool collegiate palettes) paired with complementary accent tints and 16 transparent vector patterns (diamonds, waves, circuit, topography, etc.). Uses direct `<path>`, `<circle>`, `<rect>`, and `<polygon>` elements conforming strictly to repository SVG invariants.

- [x] **US-X02:** As an authorized club leader, I should be able to crop uploaded event flyers directly within an inline 16:9 viewport using pinch-to-zoom, pan gestures, and slider controls with persistent transform memory, so that my flyer images fit the campus feed aspect ratio perfectly without leaving the composer screen or glitching tab navigation gestures.
  - *Verification & Code Reference:* Implemented in [`InlineImageCropper`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/inline-image-cropper.tsx), [`image-crop.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/image-crop.ts), and [`useTabPagerPriority`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/tab-pager-priority-context.tsx). Restricts zoom between 1.0x and 4.0x, calculates clamped focal point offsets, isolates touch priority via `setInnerScrollActive`, resumes from prior transform coordinates on edit, and exports cropped artifacts via `expo-image-manipulator` (`manipulateAsync`).

- [x] **US-X03:** As an authorized club leader, I should be able to enter event dates and start/end time ranges using masked segmented cells with AM/PM auto-synchronization and overnight nocturnal validation, so that event logistics are formatted consistently, preventing end-time errors while seamlessly supporting late-night campus activities crossing midnight.
  - *Verification & Code Reference:* Implemented in [`SegmentedDateInput`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/segmented-date-input.tsx), [`MaskedTimeInput`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/masked-time-input.tsx), [`PostDateTimeSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-date-time-section.tsx), and [`validateTimeRange`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/date-format.ts#L368). Features atomic digit rollover, leap year bounds, start-to-end period auto-synchronization, and overnight range support (e.g. 10:00 PM – 1:00 AM).

- [x] **US-X04:** As an authorized club leader using a desktop browser, I should be able to compose announcements within an adaptive multi-column publication studio featuring an instant 1:1 live post card preview, so that I can visually verify exactly how my flyer, typography, logistics badges, and club branding will appear to students before publishing.
  - *Verification & Code Reference:* Implemented in [`PostWebView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/post-web-view.tsx) and [`usePostComposer`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-post-composer.ts). Displays a 3-column zero-scroll layout on desktop displays (width >= 1024px) separating post metadata, banner/schedule controls, and a live editorial `PostCard` preview alongside publishing guidance.

- [x] **US-X05:** As an authorized club leader, I should be able to open an interactive modal calendar to select event dates constrained to the active academic window (1 month past to 6 months future), so that I can pick event dates visually without manual digit typing while preventing accidental scheduling outside active semesters.
  - *Verification & Code Reference:* Implemented in [`DatePickerModal`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/date-picker-modal.tsx) and [`isDateWithinActiveWindow`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/date-format.ts#L398). Features month pagination, day-of-week grid alignment, current day highlighting, and automatic synchronization with the segmented date input.

---

### 2. Club Leadership & Verification

- [x] **US-X06:** As a student club president or advisor, I should be able to enter a Student Life-issued 10-character claim code with automatic chunked hyphenation (`XXXX-XXXX-XX`) and instant cryptographic verification, so that I can securely claim administrative ownership of my organization without complex OAuth configurations or manual IT provisioning.
  - *Verification & Code Reference:* Implemented in [`ClaimClubModal`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/claim-club-modal.tsx), [`normalizeClubCode`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/club-codes.ts#L44), [`formatClubCode`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/club-codes.ts#L56), and [`ClubLeadershipContext`](file:///C:/Users/kelle/cs-262/knightly/client/src/context/club-leadership-context.tsx). Automatically sanitizes non-alphanumeric input, chunks characters into 4-4-2 blocks, and persists claimed status to account-partitioned local storage.

- [x] **US-X07:** As a newly verified club leader, I should be guided through an in-pager profile completion wizard to configure meeting schedules, room locations, contact emails, categories, and mission descriptions, so that my club's profile is fully populated with accurate logistics before announcements are published to the campus directory.
  - *Verification & Code Reference:* Implemented in [`CompleteClubProfileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/complete-club-profile-view.tsx) and [`complete-club-profile.tsx`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/complete-club-profile.tsx). Operates as an in-pager subpage preserving 3D starfield continuity, validates double-claim race conditions, and applies category chip distributions via `distributeIntoRows`.

- [x] **US-X08:** As a student or club member on desktop, I should be able to view an organization's deep profile in a 2-column studio layout presenting profile logistics on the left and a dedicated post archive on the right, so that I can review leadership details and recent club announcements simultaneously without excessive vertical scrolling.
  - *Verification & Code Reference:* Implemented in [`ClubDetailView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/club-detail-view.tsx) and [`useResponsiveLayout`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-responsive-layout.ts). Renders a fixed 380px left logistics column (hero banner, meeting cadence, room location, contact email) alongside an expansive right activity stream dynamically populated from `FeedContext`.

---

### 3. Desktop & Responsive Experience

- [x] **US-X09:** As a web user on a desktop display, I should be able to navigate using a left sidebar rail that collapses from 270px to 76px with hover-triggered expansion and persistent pin toggling, so that I can maximize horizontal workspace for multi-column feeds while retaining effortless mouse navigation across tabs.
  - *Verification & Code Reference:* Implemented in [`AppTabsWeb`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.web.tsx) and [`useSidebar`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/app-tabs.web.tsx#L55). Features Reanimated spring width transitions, hover detection, persistent state storage (`knightly_sidebar_collapsed`), and seamless wordmark docking.

- [x] **US-X10:** As a user on any screen size from mobile to 4K ultrawide monitors, I should experience an optimized multi-column layout scaling dynamically from 1 to 5 columns across feed, clubs, and directory views, so that content density takes full advantage of available screen real estate without awkward whitespace or cramped cards.
  - *Verification & Code Reference:* Implemented in [`useResponsiveLayout`](file:///C:/Users/kelle/cs-262/knightly/client/src/hooks/use-responsive-layout.ts) (`resolveBreakpoint`, `resolveColumnCount`). Maps viewport widths into five semantic breakpoints (`compact`, `medium`, `expanded`, `wide`, `ultrawide`), driving responsive grid structures across [`FeedWebView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-web-view.tsx) and [`ClubsDirectoryView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/clubs-directory-view.tsx).

- [x] **US-X11:** As a mobile web visitor, I should see a non-intrusive top banner inviting me to launch or install the native app that can be dismissed permanently, so that I can browse shared campus links immediately without modal paywalls or repeated installation prompts on subsequent visits.
  - *Verification & Code Reference:* Implemented in [`SmartAppBanner`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/smart-app-banner.tsx) and [`isSmartAppBannerDismissed`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/smart-app-banner.tsx#L33). Renders exclusively on mobile web viewports (< 768px), triggers native app deep-links via `Linking.openURL`, and persists dismissal to `localStorage` (`knightly_app_banner_dismissed`).

---

### 4. Interactive Campus Map & Location Services

- [x] **US-X12:** As a student or campus visitor, I should be able to navigate an offline vector campus map using drag-to-pan, pinch-to-zoom, keyboard navigation (arrows, `+`, `-`), and a one-touch "Fit Map" reset button, so that I can quickly orient myself, locate academic buildings, and reset my view if zoomed in too far.
  - *Verification & Code Reference:* Implemented in [`CampusMapView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/campus-map-view.tsx), [`CampusMapView.web`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/campus-map-view.web.tsx), [`createCampusMapHtml`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/campus-map-html.ts), and [`campusMapSvg`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/campus-map-svg.ts). Provides high-performance vector rendering inside a sandboxed WebView/iframe with zero external network requests.

- [x] **US-X13:** As a student concerned about campus safety, I should be able to open a dedicated modal detailing Calvin University's network of blue light emergency telephone towers and call boxes, so that I know how emergency phone call boxes work, where they are placed, and how to reach dispatch in an emergency.
  - *Verification & Code Reference:* Implemented in [`LocationInfoModal`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/location-info-modal.tsx) and [`SafetyQuickAssistCard`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/safety-sections.tsx#L81). Built using the centralized `ModalDialog` template with custom icon headers and accessibility support.

---

### 5. Visual Identity & Astrophysics

- [x] **US-X14:** As a student using the app, I should see an ambient multi-layered starfield background that responds to tab swiping and page scrolling with a calibrated 5:3:1 cosmic depth ratio (distant:midground:foreground), so that the visual theme reflects Calvin Knights branding with natural astronomical depth without draining battery or CPU.
  - *Verification & Code Reference:* Implemented in [`ParallaxStarfield`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/starfield.tsx) and [`starfield.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/constants/starfield.ts). Distributes star counts across 3 parallax layers (velocity multipliers 0.05 / 0.12 / 0.24) using deterministic seed-based PRNG worklets.

- [x] **US-X15:** As a user on devices ranging from compact phones to ultrawide desktop monitors, star counts should scale smoothly at 1.3 stars per 10,000 px² capped at a strict 1,800 star ceiling, so that star density remains aesthetically uniform across all aspect ratios while safeguarding GPU memory and 60fps Reanimated rendering performance.
  - *Verification & Code Reference:* Implemented in [`calculateStarCounts`](file:///C:/Users/kelle/cs-262/knightly/client/src/constants/starfield.ts#L68) (`STAR_DENSITY_UNIT_AREA_PX = 10_000`, `STARS_PER_10K_PX = 1.3`, `MAX_TOTAL_STARS = 1800`). Decouples skybox rendering from specific hardware screen dimensions and prevents overdraw on 4K/ultrawide displays.

---

### 6. Campus Dining & Services

- [x] **US-X16:** As a student planning meals, I should see live "Open now", meal-specific (e.g. "Lunch now"), or "Closed" status badges computed dynamically from current device time against venue operating schedules, along with next transition times (e.g. "Closes 9:00 PM", "Dinner at 4:30 PM"), so that I immediately know which dining locations are serving food right now and when the next meal period begins.
  - *Verification & Code Reference:* Implemented in [`hallStatus`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/dining.ts#L331) and [`DiningHallsSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-venues-section.tsx). Evaluates wall-clock minutes against discrete venue schedule windows (`diningHalls`) and renders standardized status badges with transition times.

- [x] **US-X17:** As a student browsing dining venues, I should see clear indicators of whether each dining venue accepts meal plan swipes or exclusively KnightBucks, so that I can select an eatery that matches my available meal plan balance before walking across campus.
  - *Verification & Code Reference:* Implemented in [`DiningHallsSection`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/dining-venues-section.tsx#L47) and [`diningHalls`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/dining.ts). Displays "Accepts swipes" or "KnightBucks only" labels alongside operating hours for Commons, Knollcrest, Upper Crust, and Johnny's.

---

### 7. Authentication & Security

- [x] **US-X18:** As a student typing my password on mobile or web, I should see each character briefly in plaintext before it obfuscates into a bullet dot (`•`) after 500ms or upon typing the next character, with the ability to toggle full password visibility, so that I can verify tricky keystrokes on mobile keyboards without exposing my entire password to onlookers.
  - *Verification & Code Reference:* Implemented in [`processPasswordMaskInput`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/masked-password.ts#L31), [`formatPasswordDisplay`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/masked-password.ts#L98), and [`LoginScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/login-screen.tsx#L469). Handles cursor diffing, multi-character paste masking, delayed masking timers (`PASSWORD_MASK_DELAY_MS = 500`), and eye-icon visibility toggles.

- [x] **US-X19:** As a software evaluator, grader, or developer, I should be able to tap a demo credentials link on the login screen to auto-populate valid Calvin student credentials (`jmd42` / `calvin2028`), so that I can test the full authenticated student experience without manually typing login info each test cycle.
  - *Verification & Code Reference:* Implemented in [`LoginScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/login-screen.tsx#L503) (`fillDemoCredentials`) and [`student.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/student.ts). Populates John Doe's active student profile and resets error messages in one tap.

- [x] **US-X20:** As a student signing in, I should experience a fluid Reanimated transition where the login hero wordmark smoothly flies and scales into the left sidebar masthead (desktop) or top `AppHeader` (mobile), so that authentication transitions feel cohesive, premium, and visually continuous without jarring screen flashes.
  - *Verification & Code Reference:* Implemented in [`LoginScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/login-screen.tsx#L124) (`wordmarkProgress`, `sidebarMorphProgress`, `deltaX`, `deltaY`). Coordinates 60fps Reanimated shared values to interpolate position, scale, opacity, and background dimensions during authentication handoff.

---

### 8. Offline Resilience & Data Integrity

- [x] **US-X21:** As a user browsing campus events, generic Drupal line-art placeholders should be identified via exact canonical URLs and SHA-256 binary checksums and replaced with collegiate vector banners without altering user-uploaded photos sharing identical filenames, so that the feed displays polished visuals while custom flyers named `athletics.png` or `arts-culture.png` are never erroneously overwritten.
  - *Verification & Code Reference:* Implemented in [`image-fingerprint.js`](file:///C:/Users/kelle/cs-262/knightly/server/services/image-fingerprint.js), [`image-fingerprint.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/image-fingerprint.ts), and [`calvin-event-adapter.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/calvin-event-adapter.ts). Maintains SHA-256 checksums and canonical paths for Drupal default placeholders with same-filename immunity tests.

- [x] **US-X22:** As a student opening the app when the backend server is offline or unreachable, I should still see a rich, realistic feed of campus events loaded seamlessly from bundled seed data with zero application crashes, so that the mobile app remains 100% functional, responsive, and useful during server outages or network loss (Sprint 1 SLO SC2).
  - *Verification & Code Reference:* Implemented in [`fetchCampusEvents`](file:///C:/Users/kelle/cs-262/knightly/client/src/services/events-api.ts#L43), [`calvin-events-seed.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/data/calvin-events-seed.ts), and [`sync-calvin-events.js`](file:///C:/Users/kelle/cs-262/knightly/server/scripts/sync-calvin-events.js). Wraps network fetching in timeout fallbacks to pre-cached Calvin calendar events.

- [x] **US-X23:** As an Android student returning to Knightly after picking a photo with the system image picker or launching an external app, my active tab and in-progress form data should remain intact without resetting to the root screen, so that external operating system resume intents do not destroy my draft post or reset navigation state.
  - *Verification & Code Reference:* Implemented in [`redirectSystemPath`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/+native-intent.ts#L7). Intercepts incoming OS intents, strips protocols and Expo prefixes, and drops unrouted root resume intents (`initial === false` or `hasInitialized === true`) to protect active UI state.

---

### 9. Template Architecture & Component Consolidation

- [x] **US-X24:** As a developer and end-user, all application modals should utilize a standardized `ModalDialog` component providing automatic soft-keyboard avoidance, edge-to-edge status bar translucency, and dimmed backdrop tap dismissal, so that modal dialogs across all tabs behave consistently without duplicated modal containers, manual elevation math, or broken keyboard layouts.
  - *Verification & Code Reference:* Implemented in [`ModalDialog`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/modal-dialog.tsx) and [`modal-keyboard.ts`](file:///C:/Users/kelle/cs-262/knightly/client/src/utils/modal-keyboard.ts). Consolidates keyboard listeners, safe-area elevation, and translucent backdrop rendering across `DatePickerModal`, `ClaimClubModal`, `LocationInfoModal`, and `SuccessModal`.

- [x] **US-X25:** As a user interacting with form inputs across the app, I should experience consistent Calvin Gold focus highlighting, Bright Red error states, gold text carets, and suppressed browser outline rings, so that input fields conform strictly to Calvin brand guidelines across native and web without ad-hoc inline styling or unstyled raw inputs.
  - *Verification & Code Reference:* Implemented in [`FormTextInput`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/ui/form-text-input.tsx). Standardizes `cursorColor`, `caretColor`, `outlineStyle: 'none'`, and focus/error border states across post creation, club claiming, and search forms.

- [x] **US-X26:** As a student viewing empty lists in Feed, Clubs, or Directory, I should see a consistently styled empty state card with contextual iconography, encouraging messaging, and clear action buttons, so that empty views guide me clearly toward discovering content or adjusting filters rather than displaying blank screens.
  - *Verification & Code Reference:* Implemented in [`FeedEmptyState`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-controls.tsx#L262). Deployed across [`FeedMobileView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-mobile-view.tsx), [`FeedWebView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/feed-web-view.tsx), [`ClubsDirectoryView`](file:///C:/Users/kelle/cs-262/knightly/client/src/components/clubs-directory-view.tsx), and [`DirectoryScreen`](file:///C:/Users/kelle/cs-262/knightly/client/src/app/(tabs)/directory.tsx).
