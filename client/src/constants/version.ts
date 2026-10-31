/**
 * Application Version Configuration & Invariants
 *
 * VERSIONING RULES (Semantic Versioning for Knightly):
 * - Initial Baseline: `v.0.1.0`
 * - Feature push: Increments the center digit (`0.#.0`) and resets the last digit to 0.
 * - Bugfix / Hotfix: Increments the last digit (`0.0.#`).
 * - Major release: Increments the leading digit (`#.0.0`) when major overhauls occur.
 *
 * Cadence & Rules for AI Agents & Contributors:
 * - The version is calculated strictly relative to the current version of the `main` branch.
 * - Regardless of how many commits are made on a branch, or how many times `main` has been updated,
 *   when committing and opening a pull request, the version must update exactly once in the correct digit.
 * - Keep APP_VERSION in client/src/constants/version.ts and version in client/package.json in parity.
 */
export const APP_VERSION = 'v.0.8.0';
export const APP_VERSION_RAW = '0.8.0';
