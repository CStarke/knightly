# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Versioning Policy

Knightly uses strict semantic application versioning defined in `client/src/constants/version.ts` and displayed as tiny text (`v.0.#.#`) in the bottom-right corner of the Login Screen:

- **Baseline:** `v.0.1.0`
- **Feature Push:** Increment the **center digit** (`0.#.0`) and reset the last digit to 0.
  - *Example:* `v.0.1.0` -> `v.0.2.0`
- **Bugfix / Hotfix:** Increment the **last digit** (`0.0.#`).
  - *Example:* `v.0.1.0` -> `v.0.1.1`
- **Major Release:** Increment the **first digit** (`#.0.0`) when major application overhauls occur.
  - *Example:* `v.0.9.0` -> `v.1.0.0`

**Cadence & Rules for AI Agents & Contributors:**
- You do **NOT** have to increment the version on every single prompt or minor tweak.
- AI agents only have to change the version number **once between commits**.
- Each commit corresponds to a new version, and each commit should only have **1 number go up** (increment either feature center digit `0.#.0` or bugfix last digit `0.0.#`).
- If the current uncommitted batch of changes has already incremented the version since the last git commit, do **not** increment it again for subsequent tweaks within the same commit.
- Keep `APP_VERSION` in `client/src/constants/version.ts` and `version` in `client/package.json` in parity.

# Code Commenting Standards

Maintain well-commented code across the entire codebase. Both "what" and "why" comments are integral:

- **"What" Comments (Execution & Steps):** Clearly describe what each function or logical block does step-by-step. Label multi-stage pipelines (e.g. `// Step 1: ...`, `// Step 2: ...`), explain variable transformations, regexes, math truncation, sorting comparator directions, and data sanitization so anyone skimming the code can immediately follow the execution flow without mentally tracing it.
- **"Why" Comments (Architecture & Rationale):** Explicitly explain non-obvious design decisions, architectural trade-offs, edge-case workarounds, and business logic requirements (e.g. `// WHY CAMPUS-WIDE INCLUSION: ...`, `// WHY SORTING BY DATE: ...`).
- **JSDoc Specifications:** Include JSDoc blocks above exported utility functions, hooks, and types detailing parameter expectations, return values, interval boundary rules, and timezone behaviors.
- **Preserve Existing Documentation:** Never strip or discard existing comments or docstrings unless explicitly instructed or replacing obsolete code.

# Backend Integration & Server-Authoritative Timestamps

When implementing or integrating the backend service (`server/` or Supabase):
- **Server-Authoritative Creation Timestamps:** When publishing posts (`POST /api/posts`), the post creation timestamp (`postedAt` ISO 8601 string and `createdAt` epoch milliseconds) **must** be generated and assigned by the server (e.g. database `DEFAULT NOW()` or server clock), never accepted from the client request body.
- **Clock Manipulation Immunity:** Relying on the server's authoritative clock prevents users from setting their personal device clocks forward or backward to artificially bump posts to the top of the feed or bypass announcement schedules.
