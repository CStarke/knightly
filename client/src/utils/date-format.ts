/**
 * Unified Date and Time Utilities for Knightly.
 *
 * ARCHITECTURAL DESIGN:
 * Consolidates date entry, masking, validation, and relative timestamp calculations into
 * 8 core functions, organized under `DateUtils` and `TimeUtils` namespaces while preserving
 * full backward-compatible standalone exports for existing callers and test suites.
 */

// ============================================================================
// Types
// ============================================================================

export interface SanitizeResult {
  digits: string;
  error: string | null;
}

export interface DateSegments {
  month: string;
  day: string;
  year: string;
}

export interface DateSegmentsResult {
  rawDigits: string;
  part1: string;
  showSlash1: boolean;
  part2: string;
  showSlash2: boolean;
  part3: string;
  formatted: string;
}

export interface TimeSegmentsResult {
  rawDigits: string;
  part1: string;
  showColon: boolean;
  part2: string;
  formatted: string;
}

export type FormatPostTimeOptions = {
  now?: number;
  monotonicNow?: number;
};

export const QUICK_TIMES = ['11:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];

// ============================================================================
// Internal Helpers
// ============================================================================

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function splitTimeDigits(digits: string): [string, string] {
  if (digits.length === 3) {
    return [digits[0], digits.slice(1)];
  }
  if (digits.startsWith('0')) {
    return [digits.slice(1, 2), digits.slice(2)];
  }
  return [digits.slice(0, 2), digits.slice(2)];
}

function formatElapsed(elapsedMs: number, allowWeeksMonths: boolean = false): string {
  if (elapsedMs < 60_000) return 'Just now';
  if (elapsedMs < 3_600_000) return `${Math.floor(elapsedMs / 60_000)}m ago`;
  if (elapsedMs < 86_400_000) return `${Math.floor(elapsedMs / 3_600_000)}h ago`;
  if (!allowWeeksMonths || elapsedMs < 604_800_000) {
    return `${Math.floor(elapsedMs / 86_400_000)}d ago`;
  }
  if (elapsedMs < 2_592_000_000) {
    return `${Math.floor(elapsedMs / 604_800_000)}w ago`;
  }
  return `${Math.floor(elapsedMs / 2_592_000_000)}mo ago`;
}

// ============================================================================
// Core Date Functions (1-4)
// ============================================================================

/**
 * 1. Formats MM/DD/YYYY or YYYY-MM-DD into a human-readable event date (e.g. "Fri, Sep 18" or "Fri, Sep 18, 2026").
 */
export function formatEventDate(
  dateStr: string,
  referenceDate: Date = new Date()
): string {
  const trimmed = dateStr.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let m = parseInt(parts[0], 10) - 1;
    let d = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    let yearPart = parts[2];

    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
      yearPart = parts[0];
    }

    if (yearPart.length === 2) {
      y = expandTwoDigitYear(yearPart, referenceDate);
      yearPart = String(y);
    }

    if (yearPart.length !== 4) {
      return '';
    }

    if (
      !isNaN(m) &&
      !isNaN(d) &&
      !isNaN(y) &&
      m >= 0 &&
      m < 12 &&
      d >= 1 &&
      d <= 31 &&
      y >= 1000 &&
      y <= 9999
    ) {
      const dt = new Date(y, m, d);
      dt.setFullYear(y);

      if (
        !isNaN(dt.getTime()) &&
        dt.getFullYear() === y &&
        dt.getMonth() === m &&
        dt.getDate() === d
      ) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];
        const dayName = days[dt.getDay()];
        const monthName = months[dt.getMonth()];
        const dayNum = dt.getDate();

        const inWindow = isDateWithinActiveWindow(dt, referenceDate);
        return inWindow ? `${dayName}, ${monthName} ${dayNum}` : `${dayName}, ${monthName} ${dayNum}, ${y}`;
      }
    }
  }
  return '';
}

/**
 * 2. Formats a post's timestamp or relative time string for the campus feed card footer.
 */
export function formatRelativeTime(
  postedAt?: string,
  createdAt?: number,
  monotonicCreatedAt?: number,
  options?: FormatPostTimeOptions
): string {
  if (monotonicCreatedAt !== undefined && monotonicCreatedAt !== null) {
    const currentMonotonic =
      options?.monotonicNow ?? (typeof performance !== 'undefined' ? performance.now() : undefined);
    if (currentMonotonic !== undefined) {
      return formatElapsed(currentMonotonic - monotonicCreatedAt, false);
    }
  }

  if (typeof createdAt === 'number' && !isNaN(createdAt)) {
    const now = options?.now ?? Date.now();
    return formatElapsed(now - createdAt, true);
  }

  if (!postedAt || typeof postedAt !== 'string') {
    return 'Just now';
  }

  const trimmed = postedAt.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'just now' || lower === 'just now ago' || lower === 'now') {
    return 'Just now';
  }

  if (lower.endsWith('ago')) {
    return lower.includes('just now') ? 'Just now' : trimmed;
  }

  return `${trimmed} ago`;
}

/**
 * 3. Validates and sanitizes raw date digits (MMDDYYYY, up to 8 digits) character-by-character.
 */
export function sanitizeDate(
  incomingRaw: string,
  currentDigits: string = ''
): SanitizeResult {
  const incoming = incomingRaw.replace(/[^0-9]/g, '').slice(0, 8);
  if (!incoming) {
    return { digits: '', error: null };
  }

  if (incoming.length < currentDigits.length && currentDigits.startsWith(incoming)) {
    return { digits: incoming, error: null };
  }

  let valid = '';
  let error: string | null = null;

  for (let i = 0; i < incoming.length; i++) {
    const char = incoming[i];
    const digit = parseInt(char, 10);
    if (isNaN(digit)) continue;

    const pos = valid.length;

    if (pos === 0) {
      if (digit === 0 || digit === 1) {
        valid += char;
      } else {
        error = 'Month must be between 01-12';
        break;
      }
    } else if (pos === 1) {
      const monthNum = parseInt(valid[0] + char, 10);
      if (monthNum >= 1 && monthNum <= 12) {
        valid += char;
      } else {
        error = 'Month must be between 01-12';
        break;
      }
    } else if (pos === 2) {
      const month = valid.slice(0, 2);
      const maxTens = month === '02' ? 2 : 3;
      if (digit >= 0 && digit <= maxTens) {
        valid += char;
      } else {
        error = `Day must be between 01-${getMaxDaysForMonth(month)}`;
        break;
      }
    } else if (pos === 3) {
      const month = valid.slice(0, 2);
      const dayNum = parseInt(valid[2] + char, 10);
      const maxDays = getMaxDaysForMonth(month);
      if (dayNum >= 1 && dayNum <= maxDays) {
        valid += char;
      } else {
        error = `Day must be between 01-${maxDays}`;
        break;
      }
    } else if (pos === 4 || pos === 5) {
      valid += char;
    } else if (pos === 6) {
      if (valid[4] !== '2') {
        break;
      }
      valid += char;
    } else if (pos === 7) {
      const month = valid.slice(0, 2);
      const day = valid.slice(2, 4);
      if (month === '02' && day === '29') {
        const year = parseInt(valid.slice(4, 7) + char, 10);
        if (isLeapYear(year)) {
          valid += char;
        } else {
          error = `${year} is not a leap year`;
          break;
        }
      } else {
        valid += char;
      }
    }

    if (valid.length === 8) break;
  }

  return { digits: valid, error };
}

/**
 * 4. Parses raw numeric digits (up to 8 digits: MMDDYYYY) into segments with dynamic slashes.
 */
export function formatDateSegments(rawInput: string): DateSegmentsResult {
  const sanitized = sanitizeDate(rawInput);
  const rawDigits = sanitized.digits;
  const part1 = rawDigits.slice(0, 2);
  const showSlash1 = rawDigits.length > 2;
  const part2 = rawDigits.slice(2, 4);
  const showSlash2 = rawDigits.length > 4;
  const part3 = rawDigits.slice(4, 8);

  let formatted = part1;
  if (showSlash1) formatted += `/${part2}`;
  if (showSlash2) formatted += `/${part3}`;

  return {
    rawDigits,
    part1,
    showSlash1,
    part2,
    showSlash2,
    part3,
    formatted,
  };
}

// ============================================================================
// Core Date Validation & Auto-Completion (5)
// ============================================================================

/**
 * 5. Validates a raw date string or segment object on blur / submission.
 */
export function validateDate(
  target: string | { month?: string; day?: string; year?: string },
  referenceDate: Date = new Date()
): string | null {
  let m = '';
  let d = '';
  let y = '';

  if (typeof target === 'object' && target !== null) {
    m = (target.month || '').trim();
    d = (target.day || '').trim();
    y = (target.year || '').trim();
  } else if (typeof target === 'string') {
    const segs = parseDateSegments(target);
    m = segs.month;
    d = segs.day;
    y = segs.year;
  }

  if (!m && !d && !y) {
    return null;
  }

  const isAnotherElementFilled = Boolean(d || y);

  if (!m) {
    return isAnotherElementFilled ? 'Please enter a month' : null;
  }

  if (m.length === 1) {
    const monthNum = parseInt(m, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 9) {
      return 'Month must be between 01-12';
    }
    m = `0${m}`;
  }

  const monthNum = parseInt(m, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return 'Month must be between 01-12';
  }

  if (!d) {
    return 'Please enter a day';
  }

  if (d.length === 1) {
    const dayNum = parseInt(d, 10);
    if (isNaN(dayNum) || dayNum < 1) {
      return 'Please enter a day';
    }
    d = `0${d}`;
  }

  const dayNum = parseInt(d, 10);
  const maxPossibleDays = monthNum === 2 ? 29 : getMaxDaysForMonth(monthNum);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > maxPossibleDays) {
    return `Day must be between 01-${maxPossibleDays}`;
  }

  if (!y) {
    return null;
  }

  let finalYear = y;
  if (y.length === 2) {
    finalYear = String(expandTwoDigitYear(y, referenceDate));
  } else if (y.length !== 4) {
    return 'Please enter a year between 2000 and 2999';
  }

  const yearNum = parseInt(finalYear, 10);
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2999) {
    return 'Please enter a year between 2000 and 2999';
  }

  if (monthNum === 2 && dayNum === 29 && !isLeapYear(yearNum)) {
    return `${yearNum} is not a leap year`;
  }

  const maxDays = getMaxDaysForMonth(monthNum, yearNum);
  if (dayNum > maxDays) {
    return `Day must be between 01-${maxDays}`;
  }

  return null;
}

// ============================================================================
// Core Time Functions (6-8)
// ============================================================================

/**
 * 6. Validates and sanitizes raw time digits to guarantee only valid 12-hour clock times.
 */
export function sanitizeTime(
  raw: string,
  currentDigits: string = ''
): SanitizeResult {
  const incoming = raw.replace(/[^0-9]/g, '');
  if (!incoming) return { digits: '', error: null };

  if (incoming.length < currentDigits.length && currentDigits.startsWith(incoming)) {
    return { digits: incoming, error: null };
  }

  let valid = '';
  let error: string | null = null;

  for (let i = 0; i < incoming.length; i++) {
    const char = incoming[i];
    const digit = parseInt(char, 10);
    if (isNaN(digit)) continue;

    const pos = valid.length;

    if (pos === 0) {
      valid += char;
    } else if (pos === 1) {
      const d1 = parseInt(valid[0], 10);
      if (d1 === 0) {
        if (digit >= 1 && digit <= 9) {
          valid += char;
        } else {
          error = 'Hour cannot be 00.';
          break;
        }
      } else {
        if (digit >= 0 && digit <= 5) {
          valid += char;
        } else {
          error = 'Minutes cannot exceed 59.';
          break;
        }
      }
    } else if (pos === 2) {
      const d1 = parseInt(valid[0], 10);
      const d2 = parseInt(valid[1], 10);

      if (d1 >= 2 || (d1 === 1 && d2 >= 3)) {
        valid += char;
      } else if (d1 === 1 && d2 <= 2) {
        valid += char;
      } else if (d1 === 0) {
        if (digit >= 0 && digit <= 5) {
          valid += char;
        } else {
          error = 'Minutes cannot exceed 59.';
          break;
        }
      }
    } else if (pos === 3) {
      const d1 = parseInt(valid[0], 10);
      const d2 = parseInt(valid[1], 10);
      const d3 = parseInt(valid[2], 10);

      if (d1 === 1 && d2 <= 2 && d3 <= 5) {
        valid += char;
      } else if (d1 === 0) {
        valid += char;
      } else {
        error = d3 > 5 ? 'Minutes cannot exceed 59.' : 'Single-digit hours cannot exceed 3 digits.';
        break;
      }
    }

    if (valid.length === 4) break;
  }

  return { digits: valid, error };
}

/**
 * 7. Parses raw numeric digits into time segments for colon masking.
 */
export function formatTimeSegments(rawInput: string): TimeSegmentsResult {
  const rawDigits = sanitizeTime(rawInput).digits;
  if (rawDigits.length <= 2) {
    return {
      rawDigits,
      part1: rawDigits,
      showColon: false,
      part2: '',
      formatted: rawDigits,
    };
  }
  const [part1, part2] = splitTimeDigits(rawDigits);
  return {
    rawDigits,
    part1,
    showColon: true,
    part2,
    formatted: `${part1}:${part2}`,
  };
}

/**
 * 8. Combines entered time digits with selected AM/PM period into a standardized event time.
 */
export function resolveEventTime(
  timeStr: string,
  period: 'AM' | 'PM' = 'PM'
): string {
  const trimmed = timeStr.trim();
  if (!trimmed) return '';
  if (/am|pm/i.test(trimmed)) return trimmed;

  const digits = sanitizeTime(trimmed).digits;
  if (!digits) return '';

  if (digits.length === 1) {
    const d1 = parseInt(digits[0], 10);
    return d1 >= 1 && d1 <= 9 ? `${d1}:00 ${period}` : '';
  }

  if (digits.length === 2) {
    const d1 = parseInt(digits[0], 10);
    const d2 = parseInt(digits[1], 10);

    if (d1 >= 2) return `${d1}:${d2}0 ${period}`;
    if (d1 === 1) return d2 <= 2 ? `${digits}:00 ${period}` : `1:${d2}0 ${period}`;
    if (d1 === 0) return d2 >= 1 && d2 <= 9 ? `${d2}:00 ${period}` : `12:00 ${period}`;
  }

  if (digits.length === 3) {
    if (digits.startsWith('0')) {
      const h = parseInt(digits.slice(0, 2), 10);
      return `${h}:${digits.slice(2)}0 ${period}`;
    }
    return `${digits[0]}:${digits.slice(1)} ${period}`;
  }

  const [h, m] = splitTimeDigits(digits);
  return `${h}:${m} ${period}`;
}

// ============================================================================
// Consolidated Namespace Objects
// ============================================================================

export const DateUtils = {
  formatEvent: formatEventDate,
  sanitize: sanitizeDate,
  formatSegments: formatDateSegments,
  validate: validateDate,
  getMaxDays: getMaxDaysForMonth,
  expandYear: expandTwoDigitYear,
  getNextYear: getNextOccurrenceYear,
  complete: completeDateDigits,
  parse: parseDateSegments,
  isCompleteAndValid: isDateCompleteAndValid,
};

export const TimeUtils = {
  sanitize: sanitizeTime,
  formatSegments: formatTimeSegments,
  resolve: resolveEventTime,
  complete: completeTimeDigits,
  getMaxInputLength: getMaxTimeInputLength,
  getMaxRawDigits: getMaxTimeRawDigitLength,
  isCompleteAndValid: isTimeCompleteAndValid,
};

// ============================================================================
// Backward-Compatible Standalone Functions & Aliases
// ============================================================================

/**
 * Checks whether a given target date falls within the active window (previous 1 month to coming 6 months).
 */
export function isDateWithinActiveWindow(
  dt: Date,
  referenceDate: Date = new Date()
): boolean {
  const pastLimit = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - 1,
    referenceDate.getDate(),
    0, 0, 0, 0
  );
  const futureLimit = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 6,
    referenceDate.getDate(),
    23, 59, 59, 999
  );
  const t = dt.getTime();
  return t >= pastLimit.getTime() && t <= futureLimit.getTime();
}

/**
 * Computes maximum days for a given month string ('01'..'12').
 */
export function getMaxDaysForMonth(month: string | number, year?: number): number {
  const mStr = typeof month === 'number' ? String(month).padStart(2, '0') : month.padStart(2, '0');
  if (mStr === '02') {
    return year !== undefined && !isLeapYear(year) ? 28 : 29;
  }
  return ['04', '06', '09', '11'].includes(mStr) ? 30 : 31;
}

/**
 * Expands a 2-digit year into a 4-digit year.
 */
export function expandTwoDigitYear(
  twoDigitYear: number | string,
  referenceDate: Date = new Date()
): number {
  const yy = typeof twoDigitYear === 'string' ? parseInt(twoDigitYear, 10) : twoDigitYear;
  if (isNaN(yy) || yy < 0 || yy > 99) return NaN;

  const currentYear = referenceDate.getFullYear();
  const centuryBase = Math.floor(currentYear / 100) * 100;
  const candidateYear = centuryBase + yy;
  const nextCenturyYear = centuryBase + 100 + yy;

  return nextCenturyYear > currentYear && nextCenturyYear <= currentYear + 10
    ? nextCenturyYear
    : candidateYear;
}

/**
 * Calculates the next calendar year when a specified month and day will occur.
 */
export function getNextOccurrenceYear(
  month: number,
  day: number,
  referenceDate: Date = new Date()
): number {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  for (let y = refYear; y <= 2999; y++) {
    if (month === 2 && day === 29) {
      if (!isLeapYear(y)) continue;
    } else {
      if (day > getMaxDaysForMonth(month, y)) continue;
    }

    if (y > refYear) return y;
    if (month > refMonth || (month === refMonth && day >= refDay)) return y;
  }

  return refYear;
}

/**
 * Automatically completes partial or 2-digit dates (MMDD -> MMDDYYYY, MMDDYY -> MMDDYYYY).
 */
export function completeDateDigits(
  raw: string,
  referenceDate: Date = new Date()
): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');

  if (digits.length === 4) {
    const m = parseInt(digits.slice(0, 2), 10);
    const d = parseInt(digits.slice(2, 4), 10);
    if (m >= 1 && m <= 12) {
      const maxPossibleDays = m === 2 ? 29 : getMaxDaysForMonth(m, 2024);
      if (d >= 1 && d <= maxPossibleDays) {
        return `${digits}${getNextOccurrenceYear(m, d, referenceDate)}`;
      }
    }
    return digits;
  }

  if (digits.length === 6) {
    const m = parseInt(digits.slice(0, 2), 10);
    const yy = digits.slice(4, 6);
    if (m >= 1 && m <= 12) {
      const expandedYear = expandTwoDigitYear(yy, referenceDate);
      if (!isNaN(expandedYear)) {
        return `${digits.slice(0, 4)}${expandedYear}`;
      }
    }
    return digits;
  }

  return digits;
}

/**
 * Splits a raw date string into month, day, and year parts.
 */
export function parseDateSegments(rawDate: string): DateSegments {
  if (!rawDate) return { month: '', day: '', year: '' };
  const trimmed = rawDate.trim();
  if (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('.')) {
    const parts = trimmed.split(/[/.-]/);
    return {
      month: parts[0] || '',
      day: parts[1] || '',
      year: parts[2] || '',
    };
  }
  const digits = trimmed.replace(/[^0-9]/g, '');
  return {
    month: digits.slice(0, 2),
    day: digits.slice(2, 4),
    year: digits.slice(4, 8),
  };
}

/**
 * Checks whether a raw date is complete and valid for publishing.
 */
export function isDateCompleteAndValid(
  rawDate: string,
  referenceDate: Date = new Date()
): boolean {
  if (!rawDate || rawDate.length === 0) return true;
  if (rawDate.length === 6) {
    const completed = completeDateDigits(rawDate, referenceDate);
    if (completed.length !== 8) return false;
    return isDateCompleteAndValid(completed, referenceDate);
  }
  if (rawDate.length !== 8) return false;
  return validateDate(rawDate, referenceDate) === null;
}

/**
 * On lost focus, fills in remaining digits for incomplete times.
 */
export function completeTimeDigits(raw: string): string {
  const digits = sanitizeTime(raw).digits;
  if (!digits) return '';

  if (digits.length === 1) {
    const d1 = parseInt(digits[0], 10);
    if (d1 >= 1 && d1 <= 9) return `${d1}00`;
    if (d1 === 0) return '1200';
    return digits;
  }

  if (digits.length === 2) {
    const d1 = parseInt(digits[0], 10);
    const d2 = parseInt(digits[1], 10);

    if (d1 >= 2) return `${d1}${d2}0`;
    if (d1 === 1) return d2 <= 2 ? `${digits}00` : `1${d2}0`;
    if (d1 === 0) return d2 >= 1 && d2 <= 9 ? `${d2}00` : '1200';
  }

  return digits;
}

/**
 * Checks whether a raw time resolves to a valid time.
 */
export function isTimeCompleteAndValid(rawTime: string): boolean {
  if (!rawTime || rawTime.length === 0) return true;
  return Boolean(resolveEventTime(rawTime, 'PM'));
}

/**
 * Computes maximum character input length for the masked time field.
 */
export function getMaxTimeInputLength(raw: string): number {
  if (!raw || typeof raw !== 'string') return 5;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return 5;

  const d1 = parseInt(digits[0], 10);
  if (d1 >= 2) return 4;

  if (d1 === 1 && digits.length >= 2) {
    const d2 = parseInt(digits[1], 10);
    if (d2 >= 3) return 4;
    if (digits.length >= 3 && parseInt(digits[2], 10) > 5) return 4;
  }

  if (d1 === 0 && digits.length >= 2 && parseInt(digits[1], 10) >= 2) {
    return 4;
  }

  return 5;
}

export function getMaxTimeRawDigitLength(raw: string): number {
  return getMaxTimeInputLength(raw) - 1;
}

/**
 * Parses raw alphanumeric characters into 10-char claim code segments (XXXX-XXXX-XX).
 */
export function formatRawCodeSegments(rawInput: string): {
  rawCode: string;
  part1: string;
  showHyphen1: boolean;
  part2: string;
  showHyphen2: boolean;
  part3: string;
  formatted: string;
} {
  const rawCode = rawInput.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 10);
  const part1 = rawCode.slice(0, 4);
  const showHyphen1 = rawCode.length > 4;
  const part2 = rawCode.slice(4, 8);
  const showHyphen2 = rawCode.length > 8;
  const part3 = rawCode.slice(8, 10);

  let formatted = part1;
  if (showHyphen1) formatted += `-${part2}`;
  if (showHyphen2) formatted += `-${part3}`;

  return {
    rawCode,
    part1,
    showHyphen1,
    part2,
    showHyphen2,
    part3,
    formatted,
  };
}

// 1:1 Aliases for legacy imports
export const sanitizeDateDigits = sanitizeDate;
export const formatRawDateSegments = formatDateSegments;
export const validateDateOnBlur = validateDate;
export const sanitizeTimeDigitsWithError = sanitizeTime;
export const sanitizeTimeDigits = (raw: string) => sanitizeTime(raw).digits;
export const formatRawTimeSegments = formatTimeSegments;
export const formatTimeDigits = (raw: string) => {
  const digits = sanitizeTime(raw).digits;
  if (digits.length <= 2) {
    return raw.endsWith(':') && digits.length > 0 ? `${digits}:` : digits;
  }
  const [h, m] = splitTimeDigits(digits);
  return `${h}:${m}`;
};
export const resolveTimeWithPeriod = resolveEventTime;
export const formatPostRelativeTime = formatRelativeTime;
