/**
 * Club Leader Claim Codes & Verification Registry
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly restricts organization-level posting permissions (e.g. creating campus-wide
 * event flyers, editing club social links, and managing officer rosters) strictly to verified
 * student club leaders.
 *
 * Rather than building an invasive OAuth integration with university LDAP/Active Directory
 * or requiring manual admin approval for every officer transition each semester, Knightly
 * utilizes a lightweight single-use "Claim Code" authorization architecture:
 * 1. The Student Life Office issues a unique 10-character alphanumeric claim code (e.g. `2A6Q-MTK3-R9`)
 *    to the club's primary faculty advisor or elected president.
 * 2. The student enters this code into the "Claim Club" flow in Knightly.
 * 3. Upon verification, the student's local session is granted persistent Club Leadership privileges.
 * 4. The code is permanently marked as used in local storage to prevent duplicate/unauthorized claims.
 */

export type ClubClaimRecord = {
  clubId: string;
  clubName: string;
  /** Raw uppercase normalized 10-character code. */
  normalizedCode: string;
  /** Display formatted code with hyphens. */
  formattedCode: string;
  claimedByStudentId?: string;
};

/** Pre-created club claim code for session prototype. */
export const DEMO_CLAIM_CODE_ABSTRACTION = '2A6Q-MTK3-R9';

/**
 * Normalizes input: removes non-alphanumeric characters and converts to uppercase.
 *
 * WHY NORMALIZATION:
 * Mobile text inputs and software keyboards frequently introduce user input variances:
 * - Autocapitalization may or may not capitalize letters.
 * - Copy-pasting from email or PDFs frequently introduces trailing whitespace, non-breaking spaces, or hyphens.
 * - Voice dictation or third-party keyboards may insert unexpected punctuation.
 * Stripping all non-alphanumerics and uppercasing guarantees that `2a6q-mtk3-r9`, `2A6Q MTK3 R9`, and
 * `2A6QMTK3R9` all resolve to the exact same canonical database key.
 */
export function normalizeClubCode(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

/**
 * Formats a normalized 10-character code into XXXX-XXXX-XX chunks.
 *
 * WHY CHUNKING:
 * According to cognitive load research (Miller's Law), strings of 10 arbitrary characters are
 * difficult for humans to read and verify at a glance. Chunking into 4-4-2 blocks (`XXXX-XXXX-XX`)
 * allows students to visually cross-reference their code against Student Life emails with minimal error.
 */
export function formatClubCode(raw: string): string {
  const clean = normalizeClubCode(raw).slice(0, 10);
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 10)}`;
}

/**
 * Validates whether a string matches the required 10-character alphanumeric format.
 */
export function isValidClubCode(raw: string): boolean {
  const clean = normalizeClubCode(raw);
  return /^[0-9A-Z]{10}$/.test(clean);
}

/**
 * Pre-registered club claim records.
 * Securely matched against normalized uppercase alphanumeric keys.
 */
export const CLUB_CLAIM_REGISTRY: Record<string, ClubClaimRecord> = {
  '2A6QMTK3R9': {
    clubId: 'abstraction',
    clubName: 'Abstraction',
    normalizedCode: '2A6QMTK3R9',
    formattedCode: '2A6Q-MTK3-R9',
  },
};

export const STUDENT_LIFE_CLUB_REGISTRY: ClubClaimRecord[] = Object.values(CLUB_CLAIM_REGISTRY);

export const USED_CODES_STORAGE_KEY = 'knightly_used_claim_codes';

// In-memory set of used normalized codes (0-9, A-Z)
const usedClubCodesSet = new Set<string>();

/**
 * Loads used codes from localStorage if available.
 *
 * WHY STORAGE SYNC:
 * If a club leader claims their organization in a web session and reloads the browser,
 * the claim code must remain marked as used to prevent re-submitting the same code.
 * In a native app or multi-user environment, this would be backed by a server database.
 */
function loadUsedCodesFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(USED_CODES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          if (typeof c === 'string') {
            usedClubCodesSet.add(c.toUpperCase());
          }
        }
      }
    }
  } catch {
    // Ignore localStorage read errors (e.g. Safari private browsing restrictions)
  }
}

// Initial load
loadUsedCodesFromStorage();

/**
 * Checks if a club claim code has already been used to link an account.
 */
export function isClubCodeUsed(raw: string): boolean {
  loadUsedCodesFromStorage();
  const normalized = normalizeClubCode(raw);
  return usedClubCodesSet.has(normalized);
}

/**
 * Renders a club claim code inactive once the account is finished linking.
 *
 * WHY IMMEDIATE INVALIDATION:
 * Prevents multiple students from entering the same claim code simultaneously
 * or reusing a code from previous semesters.
 */
export function markClubCodeUsed(raw: string, studentId?: string): void {
  const normalized = normalizeClubCode(raw);
  if (!normalized) return;

  usedClubCodesSet.add(normalized);

  if (CLUB_CLAIM_REGISTRY[normalized]) {
    CLUB_CLAIM_REGISTRY[normalized].claimedByStudentId = studentId;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const list = Array.from(usedClubCodesSet);
      window.localStorage.setItem(USED_CODES_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

/**
 * Resets used codes registry (useful for tests and demo resets).
 */
export function resetUsedClubCodes(): void {
  usedClubCodesSet.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(USED_CODES_STORAGE_KEY);
    } catch {}
  }
}

export type CheckClubCodeResult =
  | { valid: true; record: ClubClaimRecord }
  | { valid: false; isUsed: boolean; error: string };

/**
 * Checks a club claim code against format, usage status, and registry.
 *
 * WHY THREE DISTINCT VALIDATION OUTCOMES:
 * 1. Format error: User typed fewer than 10 characters or illegal characters.
 * 2. Already used error: The code is legitimate, but another student officer already claimed it.
 * 3. Unregistered code: The code has the right format, but was never issued by Student Life.
 * Providing precise feedback prevents student confusion and directs them to the correct contact.
 */
export function checkClubCode(inputCode: string): CheckClubCodeResult {
  const normalized = normalizeClubCode(inputCode);
  if (!isValidClubCode(normalized)) {
    return {
      valid: false,
      isUsed: false,
      error: 'Invalid code. Please enter a valid 10-character code provided by Student Life.',
    };
  }

  if (isClubCodeUsed(normalized)) {
    return {
      valid: false,
      isUsed: true,
      error: 'Code already used. Please request a new one from Student Life',
    };
  }

  const record = CLUB_CLAIM_REGISTRY[normalized];
  if (!record) {
    return {
      valid: false,
      isUsed: false,
      error: 'Invalid code. Please enter a valid 10-character code provided by Student Life.',
    };
  }

  return { valid: true, record };
}

/**
 * Validates and resolves a club claim code against the registry.
 * Returns the matching club claim record if valid, or null.
 */
export function verifyClubCode(inputCode: string): ClubClaimRecord | null {
  const normalized = normalizeClubCode(inputCode);
  if (!isValidClubCode(normalized)) {
    return null;
  }
  return CLUB_CLAIM_REGISTRY[normalized] ?? null;
}


