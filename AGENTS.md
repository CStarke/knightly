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
