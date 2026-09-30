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

**Rule for all AI Agents & Contributors:**
Whenever you implement and prepare to push a new feature or bugfix/hotfix, you **MUST** update `APP_VERSION` in `client/src/constants/version.ts` (and `client/package.json`) according to these rules before concluding your work.
