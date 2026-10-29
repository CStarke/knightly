# Knightly Backend API Documentation

This document specifies the REST API endpoints and data contracts provided by the backend service (`server/`) and backed by Supabase.

---

## Architecture & REST Strategy

Knightly leverages a **dual REST strategy**:

1. **Custom Express REST API (`server/server.js`)**:
   - Manages Calvin-specific business logic: Sunday weekly swipe reset calculations, salted SHA-256 claim code redemption, server-authoritative timestamps, and live Drupal event scraper synchronization.
2. **Supabase Auto-Generated PostgREST API**:
   - Supabase automatically provides an instant, auto-documented REST API for every table in [`server/db/migrations/001_initial_schema.sql`](file:///C:/Users/cjsta/Desktop/-/Knightly/server/db/migrations/001_initial_schema.sql) (`/rest/v1/students`, `/rest/v1/posts`, etc.), protected by PostgreSQL Row-Level Security (RLS).

---

## Base URL
- **Local Development**: `http://localhost:3000/api`
- **Production**: Configured via `SERVER_URL` in `client/config.ts`

---

## Endpoints

### 1. Health & Status
- **`GET /health`**
  - **Description**: Returns operational status of the server and database connectivity.
  - **Response `200 OK`**:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-10-28T17:00:00.000Z",
      "database": "connected"
    }
    ```

---

### 2. Student Profile & FERPA Directory
- **`GET /api/student`**
  - **Description**: Fetches student academic credentials, 14-digit barcode, and FERPA directory status.
  - **Query Parameters**:
    - `username` (optional): Calvin username (e.g. `jmd42`). Defaults to authenticated user.
  - **Response `200 OK`**:
    ```json
    {
      "id": "uuid-here",
      "studentId": "2346052",
      "username": "jmd42",
      "email": "jmd42@calvin.edu",
      "fullName": "John Doe",
      "classYear": 2026,
      "standing": "Junior",
      "major": "Computer Science",
      "cardNumber": "2346052",
      "barcode": "00000234605200",
      "role": "student",
      "directoryOptIn": false,
      "directoryPrompted": true,
      "directoryVisibleFields": { "email": true, "phone": false, "residence": false }
    }
    ```

- **`POST /api/student/directory-preference`**
  - **Description**: Updates student FERPA directory consent and visible fields.
  - **Request Body**:
    ```json
    {
      "studentId": "uuid-here",
      "directoryOptIn": true,
      "directoryVisibleFields": { "email": true, "phone": false, "residence": false }
    }
    ```
  - **Response `200 OK`**: Updated student profile.

---

### 3. Dining Services & Autonomous Ledger
- **`GET /api/dining/venues`**
  - **Description**: Returns dining venues enriched with real-time operational status (Open/Closed), active meal period, and hours.
  - **Response `200 OK`**:
    ```json
    [
      {
        "id": "commons",
        "name": "Commons Dining Hall",
        "location": "Commons Union, Level 1",
        "status": "Open",
        "currentMeal": "Dinner",
        "hours": "4:30 PM - 9:00 PM",
        "acceptsSwipes": true
      }
    ]
    ```

- **`GET /api/dining/summary`**
  - **Description**: Returns live balance summary calculating weekly Sunday reset window or semester blocks.
  - **Query Parameters**:
    - `studentId` (required): Student UUID.
  - **Response `200 OK`**:
    ```json
    {
      "studentId": "uuid-here",
      "mealPlanId": "core17",
      "mealPlanName": "Core 17",
      "cadence": "weekly",
      "swipesTotal": 17,
      "swipesUsed": 5,
      "swipesRemaining": 12,
      "flexMealsRemaining": 2,
      "guestPassesRemaining": 2,
      "knightBucks": 125.00,
      "diningDollars": 0.00
    }
    ```

- **`POST /api/dining/transaction`**
  - **Description**: Records an immutable transaction in `dining_transactions`. Triggers atomic balance update.
  - **Request Body**:
    ```json
    {
      "studentId": "uuid-here",
      "venueId": "commons",
      "transactionType": "meal_swipe",
      "amount": 1,
      "registerId": "kiosk-main"
    }
    ```
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "transaction": { "id": "tx-1", "amount": 1, ... },
      "account": { "swipesRemaining": 11, ... }
    }
    ```

---

### 4. Campus Clubs & Leadership Claim Codes
- **`GET /api/clubs`**
  - **Query Parameters**:
    - `category` (optional): 13-category taxonomy filter.
    - `search` (optional): Keyword search.
  - **Response `200 OK`**: List of registered clubs (follower counts are strictly omitted to maintain a non-social, spam-free environment).

- **`POST /api/clubs/claim`**
  - **Description**: Validates and redeems a 10-character club claim code via salted SHA-256 hash. Grants posting authorization as that club (no club roles).
  - **Request Body**:
    ```json
    {
      "rawCode": "2A6Q-MTK3-R9",
      "studentId": "uuid-here",
      "targetClubId": "acm"
    }
    ```
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "clubId": "acm",
      "message": "Successfully claimed club acm"
    }
    ```

- **`GET /api/clubs/follows`**
  - **Query Parameters**: `studentId` (UUID).
  - **Response `200 OK`**: Array of followed club IDs (e.g. `["acm", "abstraction"]`).

- **`POST /api/clubs/follow`**
  - **Request Body**: `{ "studentId": "uuid", "clubId": "acm" }`
  - **Response `200 OK`**: `{ "success": true, "follow": { ... } }`

- **`DELETE /api/clubs/follow`**
  - **Request Body**: `{ "studentId": "uuid", "clubId": "acm" }`
  - **Response `200 OK`**: `{ "success": true }`

- **`GET /api/clubs/memberships`**
  - **Query Parameters**: `studentId` (UUID).
  - **Response `200 OK`**: List of active club memberships authorizing posting access for that student.

---

### 5. Unified Feed & Scraped Events
- **`GET /api/events`**
  - **Description**: Returns live and cached events scraped from `calvin.edu/events/all`.
  - **Query Parameters**:
    - `pages` (default: 3)
    - `category` (optional)
    - `refresh` (`true` | `false`)

- **`GET /api/posts`**
  - **Description**: Returns published announcements and events in reverse-chronological order.

- **`POST /api/posts`**
  - **Description**: Publishes a new student announcement on behalf of a claimed club.
  - **Security & Accountability Directives**:
    > **SERVER-AUTHORITATIVE TIMESTAMPS:** The creation timestamps (`posted_at` and `created_at_ms`) are strictly generated server-side to guarantee clock-tamper immunity.
    > **ADMIN ACCOUNTABILITY:** Even though the post displays publicly under the club name, `author_student_id` is strictly required and bound directly to the authenticated student for administrative auditing and moderation.
  - **Request Body**:
    ```json
    {
      "clubId": "acm",
      "authorStudentId": "uuid-here",
      "orgName": "ACM",
      "headline": "Spring Coding Night",
      "body": "Building apps together tonight in NH 276!",
      "category": "Academics",
      "whenText": "Fri, Sep 18 · 7:00 PM",
      "whereText": "North Hall 276"
    }
    ```
  - **Response `201 Created`**: Created post record.

- **`DELETE /api/posts/:id`**
  - **Description**: Deletes a post by UUID.
  - **Response `200 OK`**: `{ "success": true, "message": "Post uuid deleted" }`.

- **`POST /api/events/sync`**
  - **Description**: Triggers an on-demand scraper sync from `calvin.edu/events/all` into the Supabase `posts` table.
  - **Query/Body Parameters**: `pages` (default: 3).
  - **Response `200 OK`**: `{ "success": true, "totalScraped": 10, "totalUpserted": 10 }`.

---

### 6. Campus Safety Contacts
- **`GET /api/safety/contacts`**
  - **Response `200 OK`**: Emergency phone numbers and dispatch details.
