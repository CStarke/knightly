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
 * This version string is displayed as tiny text in the bottom right of the Login page.
 * Whenever making changes, AI agents and developers must increment the version according to these rules.
 */
export const APP_VERSION = 'v.0.1.0';
export const APP_VERSION_RAW = '0.1.0';
