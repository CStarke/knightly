# Software Requirements Specification

## 1. Introduction

### 1.1 Purpose
Simplifying everyday campus life

### 1.2 Intended Audience
Calvin Students

### 1.3 Intended Use
Mobile app for frequently used campus resources

### 1.4 Product Scope
Campus dining, printing, campus safety, news and other student services

### 1.5 Definitions and Acronyms

- **User:** Base-level Calvin student account; no elevated permissions
- **Club-Leader:** Base-level Calvin student account + ability to post events for club only
- **Administrator (Student Life):** Can delete posts and assign roles
- **Phantom-tabs:** The previous tab that shows up during swiping animation

## 2. Overall Description

### 2.1 User Needs

- **Students:** A student needs to be able to access the app several times a day, often in short sessions between classes, mostly on a phone. They value speed and do not have to remember where each service lives.
- **Club Leaders:** A club leader needs to be able to have the ability to add detailed postings of club events/meetings as well as everything a student does
- **Campus Safety:** Campus safety needs to be able to access students at any requested point in time probably through a web application.
- **Administrators:** Admins need to be able to access a web interface that allows updating announcements, monitoring postings other content and, allocation of user roles without releasing a new app version.

### 2.2 Assumptions

- Users have a modern phone that can handle in-app animations
- Users will have access to reliable internet access
- Users will have basic knowledge on how to navigate a modern application
- Users are willing to install a new application as long as it saves time

### 2.3 Dependencies

- Calvin's single sign-on service for authentication
- Integration with dining service's current systems and/or flexibility to change if needed
- Integration with campus safety's current systems and/or flexibility to change if needed

## 3. System Features and Requirements

### 3.1 Functional Requirements

- **FR-1:** When the user signs into the app, the system shall display the home screen with shortcuts to dining, printing, campus safety, news, and student services.
- **FR-2:** When the user selects Dining, the system shall display the hours and current menu for each dining location.
- **FR-3:** When the user selects Printing, the system shall display printer locations and a link to the print service as well as explicit ways to refill printing budget
- **FR-4:** The system shall make campus safety reachable from the home screen in no more than two taps.
- **FR-5:** When the user opens News, the system shall display the most recent articles in reverse chronological order.
- **FR-6:** When the user selects a student service link, the system shall open the destination in the appropriate external app or browser.
- **FR-7:** While the user is on any main screen, the system shall display navigation to every other main section.
- **FR-8:** When the user submits valid Calvin credentials, the system shall sign the user in and show their personalized features.
- **FR-9:** While the user is not signed in, the system shall allow access to public content only.
- **FR-10:** If the device has no network connection, then the system shall display the most recently cached content with a notice that it may be outdated.
- **FR-11:** When an administrator publishes a content update, the system shall make the update visible to users on their next content refresh.
- **FR-12:** If a Campus Service fails to load, then the system shall display an error message and a retry option.

### 3.2 Non-Functional Requirements

#### Performance

- **NFR-P1:** The home screen shall be interactive within 3 seconds of app launch on a mid-range smartphone over campus Wi-Fi.
- **NFR-P2:** 95% of content requests (dining, news, service links) shall complete in under 2 seconds on campus Wi-Fi.
- **NFR-P3:** Navigation between main sections shall take less than 500 MS when content is cached.
- **NFR-P4:** The app shall support at least 2,000 concurrent users without degraded response times (roughly a fraction of Calvin's student body using it at peak meal times).
- **NFR-P5:** Application downtimes shall be reduced to less busy application usage times (TBD, e.g., between midnight and 6:00AM)

#### Security

- **NFR-S1:** Only authenticated users shall access features that use personal data.
- **NFR-S2:** All network communication shall use HTTPS
- **NFR-S3:** The app shall not store passwords on the device; authentication tokens shall be kept in the platform's secure storage.
- **NFR-S4:** Only authenticated administrators shall be able to publish content updates.
- **NFR-S5:** Authentication tokens shall expire after a defined period of inactivity (TBD, e.g., 30 days).

#### Usability

- **NFR-U1:** A first-time student shall be able to reach any main Campus Service from the home screen in no more than two taps.
- **NFR-U2:** The app shall meet WCAG 2.1 Level AA for text contrast, touch target size, and screen reader labels.
- **NFR-U3:** The app shall support both iOS and Android, and portrait orientation on common phone sizes.

#### Reliability

- **NFR-R1:** The app shall have a crash-free session rate of at least 99%.
- **NFR-R2:** If one Campus Service fails to load, the rest of the app shall continue to work.
- **NFR-R3:** The content backend shall be available at least 99% of the time, measured monthly.

#### Compliance

- **NFR-C1:** The app shall handle student data in line with FERPA and Calvin's IT and privacy policies.
- **NFR-C2:** The app shall follow Apple App Store and Google Play policies.
- **NFR-C3:** The app shall follow Calvin's brand standards for name, logo, and colors where it uses them.

### 3.3 System Features

- Sign in page
- Dining Page
- Home Dashboard
- Campus Safety
- Campus news
- Printing
- Phone numbers redirection to phone app
- Directory redirection to outlook
- Content management

## 4. Database Requirements

- **DB-1:** Authentication tokens shall be stored only in secure device storage.
- **DB-2:** Campus safety contact numbers shall be cached on the device so they remain reachable offline.
- **DB-3:** The system shall store Users (ID, name, email, role).
- **DB-4:** The system shall store Clubs (name, description, category, assigned Club Leaders).
- **DB-5:** The system shall store Posts (author, Club, content, timestamp, status).
- **DB-6:** The system shall store Follows (the relationship between a Student and a Club).
- **DB-7:** The system shall store dining and campus safety data as needed by those features [TBD: depends on the final feature list, for example menus, ratings, incident reports, alerts].
- **DB-8:** The system shall store Administrator and Moderator accounts with their roles and permissions.
- **DB-9:** The system shall keep an audit log of moderation actions and role changes.
- **DB-10:** The system shall not store student passwords. Authentication shall go through Calvin's login system or a standard hashed-credential approach.
- **DB-11:** Personal and safety-related data shall be encrypted in transit and at rest.
- **DB-12:** The database shall support concurrent access by at least 2,000 users without degraded performance.
