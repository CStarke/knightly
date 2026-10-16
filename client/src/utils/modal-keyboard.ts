/**
 * Modal Keyboard Elevation & Clearance Calculations
 *
 * ARCHITECTURAL RATIONALE:
 * In edge-to-edge modals with translucent status and navigation bars, the window does not
 * resize automatically on mobile operating systems (especially Android edge-to-edge full-bleed
 * mode and iOS modal presentation windows).
 *
 * When a student focuses an input (such as the Leader Claim Code input in ClaimClubModal),
 * the software keyboard occupies the bottom 260px - 380px of the viewport. Without active
 * keyboard elevation, the modal card remains centered in the full window height, submerging
 * the lower half of the card — critically hiding action buttons like "Verify Code" beneath the keyboard.
 *
 * MATHEMATICAL ELEVATION PRINCIPLES:
 * 1. Default Resting Center: In the unshifted modal, the card is centered at:
 *    restingTop = (windowHeight - cardHeight) / 2
 *    restingBottom = (windowHeight + cardHeight) / 2
 * 2. Target Balanced Center: Centering the card within the remaining visible space above
 *    the keyboard (between topInset and keyboardTop) yields an ideal lift of ~ keyboardHeight / 2.
 * 3. Bottom Clearance Guarantee: We calculate clearanceNeeded = restingBottom - (windowHeight - keyboardHeight) + 16px.
 *    The desired lift must be at least clearanceNeeded so the bottom action buttons are never covered.
 * 4. Top Safe-Area Ceiling: The card must never clip past the top safe area inset (topInset = Math.max(16, insetTop + 8)).
 *    maxSafeLift = Math.max(0, restingCardTop - topInset).
 * 5. Clamped Result: The final lift is clamped between 0 and maxSafeLift.
 */

export type ModalKeyboardLiftParams = {
  windowHeight: number;
  keyboardHeight: number;
  cardHeight: number;
  insetTop: number;
};

/**
 * Computes the optimal vertical translation (in pixels) to elevate a modal card above the software keyboard.
 *
 * @param params Viewport, keyboard, card dimensions, and top inset
 * @returns Non-negative vertical translation value (translateY = -lift)
 */
export function calculateModalKeyboardLift({
  windowHeight,
  keyboardHeight,
  cardHeight,
  insetTop,
}: ModalKeyboardLiftParams): number {
  // Step 1: If keyboard is not active or reporting zero height, keep resting position
  if (keyboardHeight <= 0) return 0;

  const topInset = Math.max(16, insetTop + 8);

  // Step 2: If cardHeight hasn't been measured yet, use symmetrical half-keyboard lift as safe heuristic
  if (cardHeight <= 0) {
    const maxSafeLift = Math.max(0, (windowHeight / 2) - topInset - 40);
    return Math.min(Math.round(keyboardHeight / 2), maxSafeLift);
  }

  const restingCardTop = (windowHeight - cardHeight) / 2;
  const restingCardBottom = (windowHeight + cardHeight) / 2;
  const keyboardTop = windowHeight - keyboardHeight;

  // Step 3: Compute clearance needed to clear keyboard with 16px breathing room
  const clearanceNeeded = Math.max(0, restingCardBottom - keyboardTop + 16);

  // Step 4: Compute maximum lift allowed before card top hits topInset
  const maxSafeLift = Math.max(0, restingCardTop - topInset);

  // Step 5: Symmetrically center in visible space or lift sufficiently to clear keyboard
  const desiredLift = Math.max(Math.round(keyboardHeight / 2), clearanceNeeded);

  // Step 6: Return clamped lift
  return Math.min(desiredLift, maxSafeLift);
}
