/**
 * Masked password display utility.
 *
 * Implements modern mobile password entry behavior:
 * - When typing a character, it is briefly shown in plaintext.
 * - It turns into a masking dot ('•') once the next character is typed, or after 500 ms.
 * - Backspace / delete immediately removes the character and maintains dots for remaining characters.
 * - Multi-character insertion (paste) masks all characters immediately.
 * - Supports full cursor position diffing for selections, replacements, and middle edits.
 */

export const PASSWORD_MASK_DOT = '\u2022'; // '•'
export const PASSWORD_MASK_DELAY_MS = 500;

export interface PasswordMaskInputParams {
  currentReal: string;
  currentDisplay: string;
  newInputText: string;
}

export interface PasswordMaskResult {
  newReal: string;
  newDisplay: string;
  shouldStartTimer: boolean;
}

/**
 * Reconciles the typed text from TextInput with the underlying real password
 * and produces the target display string and timer directive.
 */
export function processPasswordMaskInput(params: PasswordMaskInputParams): PasswordMaskResult {
  const { currentReal, currentDisplay, newInputText } = params;

  if (newInputText.length === 0) {
    return {
      newReal: '',
      newDisplay: '',
      shouldStartTimer: false,
    };
  }

  // Find common matching prefix length between previous display and new input
  let prefixLen = 0;
  while (
    prefixLen < currentDisplay.length &&
    prefixLen < newInputText.length &&
    currentDisplay[prefixLen] === newInputText[prefixLen]
  ) {
    prefixLen++;
  }

  // Find common matching suffix length (excluding prefix match range)
  let suffixLen = 0;
  while (
    suffixLen < currentDisplay.length - prefixLen &&
    suffixLen < newInputText.length - prefixLen &&
    currentDisplay[currentDisplay.length - 1 - suffixLen] ===
      newInputText[newInputText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const insertedText = newInputText.slice(prefixLen, newInputText.length - suffixLen);
  const newReal =
    currentReal.slice(0, prefixLen) +
    insertedText +
    (suffixLen > 0 ? currentReal.slice(currentReal.length - suffixLen) : '');

  // Case A: Single character typed / replaced
  if (insertedText.length === 1) {
    // All characters before and after the newly typed character become dots.
    // The newly typed character remains visible for PASSWORD_MASK_DELAY_MS.
    const newDisplay =
      PASSWORD_MASK_DOT.repeat(prefixLen) +
      insertedText +
      PASSWORD_MASK_DOT.repeat(suffixLen);

    return {
      newReal,
      newDisplay,
      shouldStartTimer: true,
    };
  }

  // Case B: Deletion or multi-character paste / replacement
  // All characters are masked as dots immediately.
  const newDisplay = PASSWORD_MASK_DOT.repeat(newReal.length);
  return {
    newReal,
    newDisplay,
    shouldStartTimer: false,
  };
}

/**
 * Formats a password string for display based on visibility toggle.
 */
export function formatPasswordDisplay(password: string, showPassword: boolean): string {
  if (showPassword || !password) {
    return password;
  }
  return PASSWORD_MASK_DOT.repeat(password.length);
}
