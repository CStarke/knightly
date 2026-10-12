/**
 * Application Version Configuration & Invariants
 *
 * VERSIONING RULES (Semantic Versioning for Knightly):
 * - Initial Baseline: `v.0.1.0`
 * - Feature push: Increments the center digit (`0.#.0`) and resets the last digit to 0.
 *   Example: v.0.1.0 -> v.0.2.0
 * - Bugfix / Hotfix: Increments the last digit (`0.0.#`).
 *   Example: v.0.1.0 -> v.0.1.1
 * - Major release: Increments the leading digit (`#.0.0`) when major overhauls occur.
 *
 * Cadence & Rules for AI Agents & Contributors:
 * - You do NOT have to increment the version on every single prompt or minor tweak.
 * - AI agents only have to change the version number once between commits.
 * - Each commit corresponds to a new version, and each commit should only have 1 number go up
 *   (increment either the feature center digit 0.#.0 or bugfix last digit 0.0.#).
 * - If the current uncommitted batch of changes has already incremented the version since the
 *   last git commit, do not increment it again for subsequent tweaks within the same commit.
 * - Keep APP_VERSION in client/src/constants/version.ts and version in client/package.json in parity.
 */
export const APP_VERSION = 'v.0.5.0';
export const APP_VERSION_RAW = '0.5.0';
