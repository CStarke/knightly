# Knightly Backend API Documentation

This document specifies the REST API endpoints and data contracts provided by the backend service (`server/`) and backed by Supabase.

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
      "timestamp": "2026-09-16T21:00:00.000Z",
      "database": "connected"
    }
    ```

---

### 2. Student Profile & ID Card
- **`GET /api/student`**
  - **Description**: Fetches current authenticated student details, residence hall, advisor, and meal balances.
  - **Response `200 OK`**:
    ```json
    {
      "id": "1234567",
      "name": "Alex Knight",
      "email": "ak23@calvin.edu",
      "major": "Computer Science, B.S.",
      "classYear": "Sophomore",
      "residenceHall": "Bolt Hall",
      "room": "214",
      "advisor": "Prof. Victor Norman",
      "mealPlan": "Core 17",
      "swipesRemaining": 12,
      "diningDollars": 145.50
    }
    ```

---

### 3. Dining Schedules & Activity
- **`GET /api/dining/venues`**
  - **Description**: Returns all campus dining hall venues (Commons, Knollcrest, Johnny's, Peet's) and current operating hours.
  - **Response `200 OK`**:
    ```json
    [
      {
        "id": "commons",
        "name": "Commons Dining Hall",
        "status": "Open",
        "currentMeal": "Dinner",
        "hours": "4:45 PM - 7:30 PM"
      }
    ]
    ```

- **`GET /api/dining/history`**
  - **Description**: Returns recent meal swipe and dining dollar transactions for the student.

---

### 4. Campus Clubs & Organizations
- **`GET /api/clubs`**
  - **Query Parameters**:
    - `category` (optional): Filter by category (`all`, `the-arts`, `athletics`, `academic`, `cultural`, `service`).
    - `search` (optional): Filter by club name or keywords.
  - **Response `200 OK`**:
    ```json
    [
      {
        "id": "running-club",
        "name": "Calvin Running Club",
        "category": "athletics",
        "description": "Weekly group runs across campus trails for all fitness levels.",
        "membersCount": 42,
        "isFollowed": false
      }
    ]
    ```

- **`POST /api/clubs/:id/follow`**
  - **Description**: Toggle follow status for a club.
  - **Response `200 OK`**:
    ```json
    {
      "clubId": "running-club",
      "isFollowed": true
    }
    ```

---

### 5. Campus Safety & Emergency
- **`GET /api/safety/contacts`**
  - **Description**: Returns official Calvin Campus Safety contact numbers and emergency procedures.
  - **Response `200 OK`**:
    ```json
    {
      "emergency": "616-526-3333",
      "nonEmergency": "616-526-6452",
      "campusEscort": "616-526-6452",
      "healthServices": "616-526-6187"
    }
    ```
