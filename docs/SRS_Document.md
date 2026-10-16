# Software Requirements Specification

## 1. Introduction

### 1.1 Purpose
Simplifying everyday campus life at Calvin University by centralizing student announcements, dining hall menus and meal balances, digital student ID cards, campus safety resources, organization discovery, and campus directories into a fast, offline-resilient, mobile-first community super-app.

### 1.2 Intended Audience
Calvin University students, student organization leaders, Campus Safety officers and dispatchers, Dining Services staff, faculty advisors, Student Life administrators.

### 1.3 Intended Use
A mobile and web application accessed multiple times daily for frequently used campus resources: checking live dining hall status and station menus, tracking meal plan swipe balances, presenting the digital Knight Card barcode, discovering and filtering campus events and club flyers, contacting emergency safety services, navigating campus with an interactive map, and browsing the student/faculty directory.

### 1.4 Product Scope
Campus dining (venue hours, station menus, meal plan swipe balances and dining history), digital student ID (Knight Card full-screen barcode with auto-brightness boost), campus safety (one-tap 24/7 dispatch, emergency contacts, safe walk, incident reporting, interactive campus map), announcements and campus news feed (search, photo and Simple Banner presentation, favorite posts), club directory and dynamic profiles, club leadership claiming (claim codes), event flyer creation and composer, campus people directory, and campus printing services access.

### 1.5 Definitions and Acronyms

- **User:** Base-level Calvin student account; no elevated permissions (can browse feed, follow clubs, favorite posts, view dining balances, present Knight Card, contact safety, and search directory).
- **Club-Leader:** Base-level Calvin student account + verified authorization via alphanumeric claim code to author, edit, cancel, and publish event announcements on behalf of claimed student organizations.
- **Administrator (Student Life):** University staff with elevated permissions to issue claim codes, moderate/delete posts, broadcast campus-wide notices, and allocate user roles.
- **Phantom-tabs:** Inline, full-height subpages (Campus Clubs directory, Club Detail, Complete Profile, Dining Activity) occupying an adjacent slot in the horizontal tab pager without opening in a native OS modal or navigation stack push, preserving gesture continuity and avoiding OS window focus bugs.
- **Knight Card:** The official Calvin University digital student identification card displaying student details, meal balances, and a 14-digit hardware-scannable barcode.
- **Dash Meter:** A visual indicator component showing remaining student meal swipes and guest passes as individual discrete dashes for quick glanceability.
- **Simple Banner:** A pre-designed 2-layer collegiate vector banner combining 1 of 16 brand colors with 1 of 16 SVG patterns (256 combinations) without GPU-crashing `<defs>` or `<use>` tags, used when posts lack custom photos.
- **Server-Authoritative Timestamps:** Creation timestamps (`postedAt` ISO string and `createdAt` UTC ms) generated on the server clock to prevent device clock-tampering from manipulating feed order.
- **Offline Seed Snapshot:** Pre-compiled campus event dataset (`calvin-events-seed.ts`) that enables the application to remain functional and never crash when the backend server is offline (Sprint 1 SLO SC2).
- **Trailing Slot Blanking:** Pager technique rendering blank frames to the right of an active Phantom Tab to prevent peeking into unrelated tabs during elastic overscroll.

## 2. Overall Description

### 2.1 User Needs

- **Students:** A student needs to be able to access the app several times a day, often in short sessions between classes, mostly on a phone. They value speed and do not have to remember where each service lives. They need to quickly check if dining halls are open, see their remaining meal swipes at a glance, present their student ID barcode for scanning, find club events by category or keyword, save favorite announcements, and call campus safety in an emergency.
- **Club Leaders:** A club leader needs to be able to have the ability to add detailed postings of club events/meetings (headline, description, category, date, 12-hour dual time range, venue location, 16:9 cropped flyer or preset banner), edit or cancel existing events, claim organization leadership via verification codes, and manage club profile descriptions alongside everything a student does.
- **Campus Safety:** Campus safety needs to be immediately reachable by students at any point in time via one-tap emergency calling, broadcast urgent campus bulletins and weather warnings, provide accessible blue light location info, and receive student concerns and incident reports.
- **Administrators:** Admins need to be able to access a web interface that allows updating announcements, broadcasting campus-wide alerts, monitoring postings and moderating content, and allocating user roles without releasing a new app version.
- **Faculty / Advisors:** Faculty need to be discoverable in the campus directory with office hours, department info, and one-touch email contact so students can connect efficiently.

### 2.2 Assumptions

- Users have a modern smartphone (iOS 16+ or Android 12+) or modern web browser capable of handling 60 FPS gesture animations.
- Users will have access to campus Wi-Fi or cellular data, but the app must remain functional when offline or on poor connections.
- Users will have basic knowledge on how to navigate a modern application (swiping between tabs, pull-to-refresh, modal dialogs).
- Users are willing to install a new application as long as it saves time and centralizes disparate campus tools.
- Mobile devices feature hardware screens capable of brightness adjustment for optical barcode scanning.

### 2.3 Dependencies

- Calvin's single sign-on (SSO) / CalNet service for student authentication and credential validation.
- Integration with dining service's current systems (operating hours, menus, meal plan swipe balances, KnightBucks, and Dining Dollars) and/or flexibility to change if needed.
- Integration with campus safety's current systems (dispatch lines, alert feeds, incident report forms) and/or flexibility to change if needed.
- Calvin University Events calendar (`calvin.edu/events/all`) for live public event scraping and category normalization.
- Supabase PostgreSQL database for persistent cloud data storage and REST API communication.
- Expo SDK 57 runtime and native module APIs (`expo-image`, `expo-brightness`, `expo-router`, `react-native-reanimated`).

## 3. System Features and Requirements

### 3.1 Functional Requirements

- **FR-1:** When the user signs into the app, the system shall display the home dashboard (Campus Feed) with shortcuts and persistent navigation to dining, campus safety, directory, and student services.
- **FR-2:** When the user selects Dining, the system shall display real-time status (Open/Closed), hours, meal periods, and current station menus for each dining venue (Commons, Knollcrest, Johnny's, Peet's).
- **FR-3:** When the user opens the Dining tab or profile, the system shall display their meal plan balances (remaining swipes, guest passes, flex meals, KnightBucks, Dining Dollars) using a discrete Dash Meter (one dash per remaining swipe), along with recent transaction activity.
- **FR-4:** When the user selects the Knight Card, the system shall display the student's digital ID with a 14-digit scaled barcode (`00000{studentId}00`) and automatically ramp the screen brightness to maximum for optical scanning, restoring previous brightness upon dismissal.
- **FR-5:** The system shall make campus safety emergency dispatch (`616-526-3333` and `911`) reachable from any main screen in no more than two taps, with a one-tap direct call button on the Safety screen.
- **FR-6:** The system shall permanently cache campus safety and emergency contact numbers in local memory so they remain accessible even without an internet data connection.
- **FR-7:** When the user opens the Campus Feed, the system shall display the most recent announcements and events in reverse-chronological order based on server-authoritative timestamps.
- **FR-8:** The system shall provide a dual-scope feed filter: a "Following" ("For You") view showing posts from followed organizations plus campus-wide announcements, and an "All Campus" view showing all approved university posts.
- **FR-9:** The system shall allow users to search feed posts in real time by keyword across headline, body, organization, category, and venue.
- **FR-10:** The system shall allow users to filter feed posts using category chips across the standard 13-category campus taxonomy (`Faith`, `Academics`, `Athletics`, `Music`, `The Arts`, `Career`, `Outdoors`, `Service`, `Wellness`, `Social`, `Culture`, `Official`, `Gaming`).
- **FR-11:** The system shall allow users to bookmark/favorite posts, save them to a dedicated Favorites list, and remove posts from favorites.
- **FR-12:** The system shall allow users to follow and unfollow student organizations directly from post cards or club profile pages, updating the "Following" feed stream immediately.
- **FR-13:** When rendering event posts, the system shall display the event date, time range, location, and hero photo; if no photo is available or if a generic Calvin placeholder is detected, the system shall render a collegiate Simple Banner (16 colors × 16 patterns).
- **FR-14:** When the user selects Directory, the system shall display a searchable list of students, faculty, and staff, filterable by role, with one-touch links to open the user's mail client (`mailto:`) or dial phone extensions.
- **FR-15:** When the user selects Campus Map, the system shall display an interactive vector campus building map with pan, pinch-to-zoom, and zoom reset controls.
- **FR-16:** When the user opens Campus Clubs, the system shall display a directory of registered organizations and allow tapping any club to view its meeting schedule, room location, and full profile.
- **FR-17:** When an authorized club leader enters a valid 10-character alphanumeric claim code (`XXXX-XXXX-XX`), the system shall verify the code, grant club leadership privileges, and reveal the Create Post tab.
- **FR-18:** When an authorized club leader creates a post, the system shall allow specifying the publishing club, headline, description, category, event date, dual 12-hour time range (with AM/PM auto-sync and nocturnal validation), venue location, and 16:9 cropped flyer or preset banner.
- **FR-19:** While the user is on any main screen, the system shall display navigation to every other main section via a bottom tab bar and fluid horizontal swipeable pager with spring physics.
- **FR-20:** Subpages (club directory, club details, complete profile, dining activity) shall render as inline Phantom Tabs within the pager track, blanking trailing slots to prevent peeking during overscroll.
- **FR-21:** When the user submits valid Calvin credentials, the system shall sign the user in, mount the application shell, and show their personalized features.
- **FR-22:** While the user is not signed in, the system shall restrict access to public content only and gate personal data (Knight Card, meal balances, post authoring).
- **FR-23:** If the device has no network connection or the backend server is unreachable, the system shall seamlessly fall back to pre-compiled seed data (`CALVIN_EVENTS_SEED`) without crashing or showing unhandled errors (Sprint 1 SLO SC2).
- **FR-24:** When an administrator or club leader publishes or modifies a content update, the system shall make the update visible to users upon their next feed refresh.
- **FR-25:** If a campus service or network request fails to load, the system shall display a friendly message with a retry option, while other independent services continue to work.
- **FR-26:** When the user selects Printing, the system shall display printer locations, quick access links to the campus printing service, and information on checking printing quotas.

### 3.2 Non-Functional Requirements

#### Performance

- **NFR-P1:** The home screen shall be interactive within 3 seconds of app launch on a mid-range smartphone over campus Wi-Fi.
- **NFR-P2:** 95% of content requests (dining, news, service links) shall complete in under 2 seconds on campus Wi-Fi.
- **NFR-P3:** Navigation between main sections and Phantom Tabs shall take less than 500 MS (sustaining 60 FPS / 16 ms per frame animation) when content is cached.
- **NFR-P4:** The app and backend microservice shall support at least 2,000 concurrent users without degraded response times (roughly a fraction of Calvin's student body using it at peak meal times).
- **NFR-P5:** Application downtimes and server sync jobs shall be reduced to less busy application usage times (e.g., between midnight and 6:00 AM).
- **NFR-P6:** The animated starfield background canvas shall be capped at 1,800 total stars to safeguard GPU framerates on multi-monitor desktop viewports.

#### Security

- **NFR-S1:** Only authenticated users shall access features that use personal data (Knight Card barcode, meal plan balances, transaction history).
- **NFR-S2:** All network communication between client, backend server, and database shall use HTTPS (TLS 1.3).
- **NFR-S3:** The app shall not store passwords on the device; authentication tokens shall be kept in the platform's secure storage (Keychain / KeyStore).
- **NFR-S4:** Only authenticated club leaders and administrators shall be able to publish, edit, or delete event announcements.
- **NFR-S5:** Authentication tokens shall expire after a defined period of inactivity (e.g., 30 days) or immediately upon user sign-out.
- **NFR-S6:** Post creation timestamps (`postedAt` and `createdAt`) shall be generated server-side to prevent client device clock-tampering from altering feed ordering.

#### Usability

- **NFR-U1:** A first-time student shall be able to reach any main Campus Service or emergency contact from the home screen in no more than two taps.
- **NFR-U2:** The app shall meet WCAG 2.1 Level AA for text contrast (4.5:1 for normal text, 3:1 for large text/icons), touch target size (minimum 44 × 44 points), and screen reader labels.
- **NFR-U3:** The app shall support iOS, Android, and modern web browsers, supporting portrait orientation on common phone sizes and responsive multi-column layouts on desktop.
- **NFR-U4:** Swiping between tabs shall implement 1:1 finger tracking, rubber-band boundary resistance, and smooth spring snap.
- **NFR-U5:** The app shall provide full light and dark mode color palette support adhering to Calvin University brand standards (Calvin Maroon `#5E1A24` / `#8C2131` and Collegiate Gold `#E8B019`).

#### Reliability

- **NFR-R1:** The app shall have a crash-free session rate of at least 99%.
- **NFR-R2:** If one Campus Service or API fails to load, the rest of the application shall continue to work normally (fault isolation).
- **NFR-R3:** The content backend shall be available at least 99% of the time, measured monthly.
- **NFR-R4:** If the backend server is completely offline, the client shall seamlessly fall back to local seed data without crashing (Sprint 1 SLO SC2).
- **NFR-R5:** External Android intents (e.g. returning from image picker) shall be filtered via `+native-intent.ts` to prevent accidental app resets to root.

#### Compliance

- **NFR-C1:** The app shall handle student data in line with FERPA and Calvin's IT and privacy policies.
- **NFR-C2:** The app shall follow Apple App Store Review Guidelines and Google Play Developer policies.
- **NFR-C3:** The app shall follow Calvin's brand standards for name, logo, typography, and colors where it uses them.

### 3.3 System Features

- Sign in page (Calvin credentials, demo logins, masked password input, version watermark)
- Home Dashboard & Campus Feed (reverse-chronological cards, For You vs All Campus scopes, search bar, 13-category filter chips, favorites list)
- Post Card Presentation & Media (16:9 flyers, 16×16 collegiate Simple Banners, Drupal placeholder fingerprinting with SHA-256 immunity)
- Dining Page (Commons, Knollcrest, Johnny's, Peet's hours & live Open/Closed status, station menus, meal swipe Dash Meter, dining history)
- Digital Student ID (Knight Card full-screen barcode, automatic screen brightness boost and restore)
- Campus Safety (one-tap emergency dispatch to `616-526-3333` and `911`, permanent offline phone directory, Safe Walk, incident reporting)
- Campus Map (bundled interactive vector building map with pan, pinch-to-zoom, and reset controls)
- Campus Directory (searchable students, faculty, and staff, role filtering, one-touch mailto and phone calling)
- Campus Clubs Directory & Profiles (club mission, meeting schedules, room locations, social links, follow/unfollow toggle)
- Club Leadership Claiming (10-character alphanumeric claim code verification `XXXX-XXXX-XX`, profile onboarding)
- Content Management & Create Post Composer (headline, description, category, date picker, dual masked 12-hour time inputs, 16:9 photo cropper, preset banner generator)
- Campus News & Scraper Integration (automated crawling of `calvin.edu/events/all`, category normalization, offline seed snapshot sync)
- Printing (printer locations, links to campus printing services, printing budget refill guidance)
- Phone numbers redirection to phone app (one-touch dialing)
- Directory redirection to email client (one-touch mailto)
- Navigation & Motion System (horizontal Reanimated tab pager, in-pager Phantom Tabs, trailing slot blanking, 3D parallax starfield)

## 4. Database Requirements

- **DB-1:** Authentication tokens shall be stored only in secure device storage (iOS Keychain / Android KeyStore).
- **DB-2:** Campus safety contact numbers shall be cached permanently on the device so they remain reachable offline.
- **DB-3:** The system shall store Users / Students (ID, name, email, major, class year, residence hall, room, advisor, meal plan, swipes remaining, dining dollars, role).
- **DB-4:** The system shall store Clubs (ID, name, category, description, meeting schedule, location, contact email, member count, assigned Club Leaders).
- **DB-5:** The system shall store Posts (ID, author, clubId, headline, body, category, when/date-time text, where/location, image/banner URI, campus-wide flag, server-authoritative timestamps `posted_at` and `created_at`, status).
- **DB-6:** The system shall store Follows (the relationship between a Student and a Club).
- **DB-7:** The system shall store Favorites (the bookmark relationship between a Student and a Post).
- **DB-8:** The system shall store dining data (venues, operating hours, meal service periods, station menus) and student dining transaction history.
- **DB-9:** The system shall store Club Claim Records (normalized 10-character claim codes, associated club, redemption status, claimed by student ID, redemption timestamp).
- **DB-10:** The system shall store Administrator and Moderator accounts with their roles and permissions.
- **DB-11:** The system shall keep an immutable audit log (`audit_logs`) of moderation actions, post deletions, and role changes.
- **DB-12:** The system shall not store student passwords in plaintext. Authentication shall go through Calvin's login system or a standard hashed-credential approach.
- **DB-13:** Personal and safety-related data shall be encrypted in transit (HTTPS/TLS 1.3) and at rest (AES-256).
- **DB-14:** The database shall support concurrent access by at least 2,000 users without degraded performance.
- **DB-15:** Post creation timestamps shall be generated server-side using database defaults (`DEFAULT NOW()`) to guarantee chronological integrity.
