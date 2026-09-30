/**
 * Checks whether a given target date falls within the active window:
 * - Within previous 1 month (pastLimit)
 * - Within coming 6 months (futureLimit)
 */
export function isDateWithinActiveWindow(
  dt: Date,
  referenceDate: Date = new Date()
): boolean {
  // previous 1 month: 1 calendar month before reference date at 00:00:00.000
  const pastLimit = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - 1,
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );

  // coming 6 months: 6 calendar months after reference date at 23:59:59.999
  const futureLimit = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 6,
    referenceDate.getDate(),
    23,
    59,
    59,
    999
  );

  const t = dt.getTime();
  return t >= pastLimit.getTime() && t <= futureLimit.getTime();
}

/**
 * Formats MM/DD/YYYY or YYYY-MM-DD into a clean, human-readable event date (e.g. Fri, Sep 18).
 * Supports any historical or future calendar year (including dates before 2020).
 * If the date is outside the coming 6 months or previous 1 month, the year is included
 * (e.g. Thu, May 14, 2015, or Wed, Jul 15, 2026, or Thu, May 20, 2027).
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

    // Require complete 4-digit year for formatting
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

      // Verify valid calendar day (e.g., handles leap years, rejects Feb 30)
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
        if (inWindow) {
          return `${dayName}, ${monthName} ${dayNum}`;
        }
        return `${dayName}, ${monthName} ${dayNum}, ${y}`;
      }
    }
  }
  return '';
}

export const QUICK_TIMES = ['11:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];

/**
 * Parses raw numeric digits (up to 8 digits: MMDDYYYY) into segments.
 * Slashes appear strictly as soon as the character AFTER them is typed:
 * - Slash 1 appears as soon as char 3 (the first day digit) is typed.
 * - Slash 2 appears as soon as char 5 (the first year digit) is typed.
 */
export interface SanitizeResult {
  digits: string;
  error: string | null;
}

/**
 * Validates and sanitizes raw date digits (MMDDYYYY, up to 8 digits) character-by-character:
 * - Digit 1 (pos 0): month tens must be 0 or 1.
 * - Digit 2 (pos 1): month units:
 *     - if month tens is 1, must be 0..2 (months 10..12).
 *     - if month tens is 0, must be 1..9 (months 01..09, rejecting 00).
 * - Digit 3 (pos 2): day tens:
 *     - if month is '02' (February), must be 0..2 (max 29 days).
 *     - for other months, must be 0..3 (max 31 days).
 * - Digit 4 (pos 3): day units:
 *     - if day tens is 0, must be 1..9 (rejecting 00).
 *     - if day tens is 3:
 *         - for 30-day months (04, 06, 09, 11), must be 0 only.
 *         - for 31-day months, must be 0..1.
 *     - if day tens is 1 or 2, 0..9 allowed.
 * - Digit 5 (pos 4): year 1st digit: accepts any digit (both 2 and !2).
 * - Digit 6 (pos 5): year 2nd digit: accepts any digit 0..9.
 * - Digit 7 (pos 6): year 3rd digit: if year started with !2, limits user to 2 digits; if started with 2, allows 0..9.
 * - Digit 8 (pos 7): year 4th digit (when year starts with 2):
 *     - if month is '02' and day is '29', verifies leap year.
 */
/**
 * Computes maximum days for a given 2-digit month string ('01' to '12').
 * February defaults to 29 (or 28 if non-leap year is specified).
 */
export function getMaxDaysForMonth(month: string | number, year?: number): number {
  const mStr = typeof month === 'number' ? String(month).padStart(2, '0') : month.padStart(2, '0');
  if (mStr === '02') {
    if (year !== undefined) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return isLeap ? 29 : 28;
    }
    return 29;
  }
  if (['04', '06', '09', '11'].includes(mStr)) {
    return 30;
  }
  return 31;
}

export function sanitizeDateDigits(
  incomingRaw: string,
  currentDigits: string = ''
): SanitizeResult {
  const incoming = incomingRaw.replace(/[^0-9]/g, '').slice(0, 8);
  if (!incoming) {
    return { digits: '', error: null };
  }

  // Deletion: if incoming is shorter than current, allow without errors
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
      const d0 = parseInt(valid[0], 10);
      if (d0 === 1) {
        if (digit >= 0 && digit <= 2) {
          valid += char;
        } else {
          error = 'Month must be between 01-12';
          break;
        }
      } else if (d0 === 0) {
        if (digit >= 1 && digit <= 9) {
          valid += char;
        } else {
          error = 'Month must be between 01-12';
          break;
        }
      }
    } else if (pos === 2) {
      const month = valid.slice(0, 2);
      if (month === '02') {
        if (digit >= 0 && digit <= 2) {
          valid += char;
        } else {
          error = `Day must be between 01-${getMaxDaysForMonth(month)}`;
          break;
        }
      } else {
        if (digit >= 0 && digit <= 3) {
          valid += char;
        } else {
          error = `Day must be between 01-${getMaxDaysForMonth(month)}`;
          break;
        }
      }
    } else if (pos === 3) {
      const month = valid.slice(0, 2);
      const d2 = parseInt(valid[2], 10);

      if (d2 === 0) {
        if (digit >= 1 && digit <= 9) {
          valid += char;
        } else {
          error = `Day must be between 01-${getMaxDaysForMonth(month)}`;
          break;
        }
      } else if (d2 === 3) {
        if (['04', '06', '09', '11'].includes(month)) {
          if (digit === 0) {
            valid += char;
          } else {
            error = `Day must be between 01-${getMaxDaysForMonth(month)}`;
            break;
          }
        } else {
          if (digit >= 0 && digit <= 1) {
            valid += char;
          } else {
            error = `Day must be between 01-${getMaxDaysForMonth(month)}`;
            break;
          }
        }
      } else {
        valid += char;
      }
    } else if (pos === 4) {
      // 1st year digit: accept any digit (both 2 and !2)
      valid += char;
    } else if (pos === 5) {
      // 2nd year digit: accept any digit (0..9)
      valid += char;
    } else if (pos === 6) {
      // 3rd year digit:
      // "limit the user to 2 digits when they puts anything besides a 2"
      if (valid[4] !== '2') {
        break;
      }
      valid += char;
    } else if (pos === 7) {
      // 4th year digit (only reached when valid[4] === '2')
      const month = valid.slice(0, 2);
      const day = valid.slice(2, 4);
      if (month === '02' && day === '29') {
        const year = parseInt(valid.slice(4, 7) + char, 10);
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (isLeap) {
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
 * Parses raw numeric digits (up to 8 digits: MMDDYYYY) into segments.
 * Slashes appear strictly as soon as the character AFTER them is typed:
 * - Slash 1 appears as soon as char 3 (the first day digit) is typed.
 * - Slash 2 appears as soon as char 5 (the first year digit) is typed.
 */
export function formatRawDateSegments(rawInput: string): {
  rawDigits: string;
  part1: string;
  showSlash1: boolean;
  part2: string;
  showSlash2: boolean;
  part3: string;
  formatted: string;
} {
  const sanitized = sanitizeDateDigits(rawInput);
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

/**
 * Parses raw uppercase alphanumeric characters (up to 10 chars: XXXX-XXXX-XX) into segments.
 * Hyphens appear strictly as soon as the character AFTER them is typed:
 * - Hyphen 1 appears as soon as char 5 is typed.
 * - Hyphen 2 appears as soon as char 9 is typed.
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

/**
 * Validates and sanitizes raw time digits to guarantee only valid 12-hour clock times can be entered:
 * - Digit 1 (d1): 1-9 (or 0)
 * - If d1 >= 2:
 *     - Hour is strictly single digit (d1). Max digits is strictly 3.
 *     - d2 is tens of minutes: must be in [0..5].
 *     - d3 is units of minutes: in [0..9].
 * - If d1 === 1:
 *     - d2 must be in [0..5] (hours 10-12, or hour 1 with minutes starting 3x-5x).
 *     - If d2 in [3..5]: hour is 1, max digits is strictly 3 (e.g. 1:30 - 1:59).
 *     - If d2 in [0..2]: can be 3 digits (1:00, 1:15, 1:20) or 4 digits (10:00, 11:30, 12:45).
 *     - If 4 digits entered, d3 (tens of minutes) must be in [0..5], d4 in [0..9].
 */
export function sanitizeTimeDigitsWithError(
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
      } else if (d1 >= 2) {
        // d1 is 2..9: d2 is tens of minutes, must be 0..5
        if (digit >= 0 && digit <= 5) {
          valid += char;
        } else {
          error = 'Minutes cannot exceed 59.';
          break;
        }
      } else if (d1 === 1) {
        // d1 is 1: d2 must be 0..5 (0..2 for hours 10..12, or 3..5 for minutes)
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
        // 3-digit time: d3 is units of minutes (0..9)
        valid += char;
      } else if (d1 === 1 && d2 <= 2) {
        // Hour is 10, 11, 12 OR 3-digit time 1:0x, 1:1x, 1:2x
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

      // 4th digit allowed ONLY for hours 10, 11, 12 where d3 (tens of minutes) is 0..5
      if (d1 === 1 && d2 <= 2 && d3 <= 5) {
        valid += char;
      } else if (d1 === 0) {
        valid += char;
      } else {
        if (d3 > 5) {
          error = 'Minutes cannot exceed 59.';
        } else {
          error = 'Single-digit hours cannot exceed 3 digits.';
        }
        break;
      }
    }

    if (valid.length === 4) break;
  }

  return { digits: valid, error };
}

export function sanitizeTimeDigits(raw: string): string {
  return sanitizeTimeDigitsWithError(raw).digits;
}

/**
 * Formats time input digits:
 * 1 digit (e.g. "1") -> "1"
 * 2 digits (e.g. "10") -> "10"
 * 3 digits (e.g. "100") -> "1:00", "730" -> "7:30"
 * 4 digits (e.g. "1000") -> "10:00", "1230" -> "12:30"
 */
export function formatTimeDigits(raw: string): string {
  const digits = sanitizeTimeDigits(raw);
  if (digits.length <= 2) {
    if (raw.endsWith(':') && digits.length > 0) {
      return `${digits}:`;
    }
    return digits;
  }
  if (digits.length === 3) {
    return `${digits[0]}:${digits.slice(1)}`;
  }
  if (digits.startsWith('0')) {
    return `${digits.slice(1, 2)}:${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Combines entered time digits with the selected AM/PM period.
 * Uses robust 12-hour clock heuristics:
 * - 1 digit (1..9): hour only (e.g. "1" -> "1:00 PM", "7" -> "7:00 PM")
 * - 2 digits:
 *     - First digit >= 2 (20..95): hour is d1, d2 is tens of minutes (e.g. "25" -> "2:50 PM", "73" -> "7:30 PM")
 *     - First digit === 1:
 *         - d2 in 0..2 (10, 11, 12): valid 2-digit hours (e.g. "10" -> "10:00 PM", "12" -> "12:00 PM")
 *         - d2 in 3..5 (13, 14, 15): hour is 1, d2 is tens of minutes (e.g. "13" -> "1:30 PM", "15" -> "1:50 PM")
 *     - First digit === 0: "01".."09" -> "1:00 PM".."9:00 PM", "00" -> "12:00 PM"
 * - 3 digits: e.g. "100" -> "1:00 PM", "730" -> "7:30 PM", "250" -> "2:50 PM"
 * - 4 digits: e.g. "1000" -> "10:00 PM", "1230" -> "12:30 PM"
 */
export function resolveTimeWithPeriod(
  timeStr: string,
  period: 'AM' | 'PM' = 'PM'
): string {
  const trimmed = timeStr.trim();
  if (!trimmed) return '';
  if (/am|pm/i.test(trimmed)) return trimmed;

  const digits = sanitizeTimeDigits(trimmed);
  if (!digits) return '';

  // 1 digit
  if (digits.length === 1) {
    const d1 = parseInt(digits[0], 10);
    if (d1 >= 1 && d1 <= 9) {
      return `${d1}:00 ${period}`;
    }
    return '';
  }

  // 2 digits
  if (digits.length === 2) {
    const d1 = parseInt(digits[0], 10);
    const d2 = parseInt(digits[1], 10);

    // If first digit >= 2 (e.g. 20..95), d1 is the hour and d2 is tens of minutes
    // e.g. "25" -> "2:50 PM", "73" -> "7:30 PM", "30" -> "3:00 PM"
    if (d1 >= 2) {
      return `${d1}:${d2}0 ${period}`;
    }

    if (d1 === 1) {
      // Hours 10, 11, 12
      if (d2 <= 2) {
        return `${digits}:00 ${period}`;
      }
      // "13", "14", "15" -> hour is 1, tens of minutes is 3..5 (e.g. "13" -> "1:30 PM", "15" -> "1:50 PM")
      return `1:${d2}0 ${period}`;
    }

    if (d1 === 0) {
      if (d2 >= 1 && d2 <= 9) {
        return `${d2}:00 ${period}`;
      }
      return `12:00 ${period}`;
    }
  }

  // 3 digits: e.g. "100" -> "1:00 PM", "730" -> "7:30 PM", "250" -> "2:50 PM"
  if (digits.length === 3) {
    if (digits.startsWith('0')) {
      const h = parseInt(digits.slice(0, 2), 10);
      return `${h}:${digits.slice(2)}0 ${period}`;
    }
    return `${digits[0]}:${digits.slice(1)} ${period}`;
  }

  // 4 digits: e.g. "1000" -> "10:00 PM", "1230" -> "12:30 PM"
  if (digits.startsWith('0')) {
    return `${digits.slice(1, 2)}:${digits.slice(2)} ${period}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)} ${period}`;
}

/**
 * Computes the strict maximum input character length (including formatted colon)
 * for the time input field.
 * In a 12-hour clock, only hours 10, 11, and 12 can have 4 digits (5 characters formatted: "10:00").
 * Single-digit hour times (e.g. 7:30, 1:30, 1:08) can have at most 3 digits (4 characters formatted: "7:30").
 * Dynamically setting maxLength to 4 when a 4th digit is impossible locks the native/virtual
 * keyboard at the hardware/OS level, preventing any keypress for a 4th digit.
 */
export function getMaxTimeInputLength(raw: string): number {
  if (!raw || typeof raw !== 'string') return 5;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return 5;

  const d1 = parseInt(digits[0], 10);
  if (d1 >= 2) {
    return 4;
  }

  if (d1 === 1) {
    if (digits.length >= 2) {
      const d2 = parseInt(digits[1], 10);
      if (d2 >= 3) {
        // e.g. 1:30 - 1:59 (hour 1, tens of minutes 3..5) -> strictly 3 digits, max 4 chars
        return 4;
      }
      if (digits.length >= 3) {
        const d3 = parseInt(digits[2], 10);
        if (d3 > 5) {
          // e.g. 1:08, 1:19, 1:26 -> tens of minutes in a 4-digit time cannot exceed 5 -> strictly 3 digits, max 4 chars
          return 4;
        }
      }
    }
  }

  if (d1 === 0 && digits.length >= 2) {
    const d2 = parseInt(digits[1], 10);
    if (d2 >= 2) {
      return 4;
    }
  }

  return 5;
}

/**
 * Parses raw numeric digits into time segments for fake colon masking:
 * - Up to 2 digits: part1 only, no colon
 * - 3 digits (e.g. "100" -> "1:00", "730" -> "7:30"): part1=1st digit, showColon=true, part2=2 digits
 * - 4 digits (e.g. "1000" -> "10:00", "1230" -> "12:30"): part1=first 2 digits, showColon=true, part2=2 digits
 */
export function formatRawTimeSegments(rawInput: string): {
  rawDigits: string;
  part1: string;
  showColon: boolean;
  part2: string;
  formatted: string;
} {
  const rawDigits = sanitizeTimeDigits(rawInput);
  if (rawDigits.length <= 2) {
    return {
      rawDigits,
      part1: rawDigits,
      showColon: false,
      part2: '',
      formatted: rawDigits,
    };
  }
  if (rawDigits.length === 3) {
    const part1 = rawDigits[0];
    const part2 = rawDigits.slice(1);
    return {
      rawDigits,
      part1,
      showColon: true,
      part2,
      formatted: `${part1}:${part2}`,
    };
  }
  // 4 digits
  if (rawDigits.startsWith('0')) {
    const part1 = rawDigits.slice(1, 2);
    const part2 = rawDigits.slice(2);
    return {
      rawDigits,
      part1,
      showColon: true,
      part2,
      formatted: `${part1}:${part2}`,
    };
  }
  const part1 = rawDigits.slice(0, 2);
  const part2 = rawDigits.slice(2);
  return {
    rawDigits,
    part1,
    showColon: true,
    part2,
    formatted: `${part1}:${part2}`,
  };
}

/**
 * Returns the maximum number of raw numeric digits (excluding the colon)
 * allowed for a given time prefix.
 * e.g. for "7", only 3 digits total are possible ("730"), whereas for "10", 4 digits ("1000") are allowed.
 */
export function getMaxTimeRawDigitLength(raw: string): number {
  return getMaxTimeInputLength(raw) - 1;
}

/**
 * Calculates the next calendar year when a specified month and day will occur,
 * relative to a reference date.
 * E.g. when entered on 09/17/2026:
 * - 09/18 -> 2026 (tomorrow)
 * - 09/17 -> 2026 (today)
 * - 07/29 -> 2027 (already passed in 2026)
 * - 02/29 -> 2028 (next leap year)
 */
export function getNextOccurrenceYear(
  month: number,
  day: number,
  referenceDate: Date = new Date()
): number {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // 1-indexed (1..12)
  const refDay = referenceDate.getDate();

  for (let y = refYear; y <= 2999; y++) {
    // Check if the day exists in candidate year y (e.g. leap year for Feb 29)
    if (month === 2 && day === 29) {
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      if (!isLeap) continue;
    } else {
      const maxDays = getMaxDaysForMonth(month, y);
      if (day > maxDays) continue;
    }

    // In future year, this is the earliest occurrence
    if (y > refYear) {
      return y;
    }

    // In current year, must be today or future
    if (month > refMonth || (month === refMonth && day >= refDay)) {
      return y;
    }
  }

  return refYear;
}

/**
 * Expands a 2-digit year (e.g. 25, 26, 42, 13, 99, 02) into a 4-digit year.
 *
 * SPECIFICATION & INVARIANTS:
 * - Uses the current century by default (e.g. In 2026: 27 -> 2027, 13 -> 2013, 99 -> 2099, 42 -> 2042).
 * - UNLESS the year will occur in the next 10 years (in which case it completes to the next century).
 *   Example: In year 2095, entering 02 completes to 2102 (not 2002), because 2102 is within the next 10 years (2095-2105).
 * - Months are not taken into account for these year calculations.
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

  if (nextCenturyYear > currentYear && nextCenturyYear <= currentYear + 10) {
    return nextCenturyYear;
  }
  return candidateYear;
}

/**
 * Automatically completes partial or 2-digit dates:
 * - 4 digits (MMDD): automatically fills the year with the next occurrence year
 * - 6 digits (MMDDYY): automatically switches 2-digit years (e.g. 25, 26, 42) into 4-digit years (e.g. 2025, 2026, 2042)
 * - 8 digits (MMDDYYYY): already complete
 */
export function completeDateDigits(
  raw: string,
  referenceDate: Date = new Date()
): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');

  // 4 digits (MMDD): auto-fills next occurrence year
  if (digits.length === 4) {
    const m = parseInt(digits.slice(0, 2), 10);
    const d = parseInt(digits.slice(2, 4), 10);
    if (m >= 1 && m <= 12) {
      const maxPossibleDays = m === 2 ? 29 : getMaxDaysForMonth(m, 2024);
      if (d >= 1 && d <= maxPossibleDays) {
        const nextYear = getNextOccurrenceYear(m, d, referenceDate);
        return `${digits}${nextYear}`;
      }
    }
    return digits;
  }

  // 6 digits (MMDDYY): auto-expands 2-digit year to 4-digit year
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
 * Splits a raw date string (e.g. "09182026", "091826", "0918") or delimited
 * date string ("09/18/2026") into constituent month, day, and year parts.
 */
export function parseDateSegments(rawDate: string): {
  month: string;
  day: string;
  year: string;
} {
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
 * On lost focus, fills in remaining digits for incomplete times according to
 * the translation model expectations:
 * - "7" -> "700" (which formats to "7:00")
 * - "12" -> "1200" (which formats to "12:00")
 * - "45" -> "450" (which formats to "4:50")
 * - "1" -> "100" (which formats to "1:00")
 * - "10" -> "1000" (which formats to "10:00")
 * - "13" -> "130" (which formats to "1:30")
 * - "25" -> "250" (which formats to "2:50")
 * - "73" -> "730" (which formats to "7:30")
 */
export function completeTimeDigits(raw: string): string {
  const digits = sanitizeTimeDigits(raw);
  if (!digits) return '';

  if (digits.length === 1) {
    const d1 = parseInt(digits[0], 10);
    if (d1 >= 1 && d1 <= 9) {
      return `${d1}00`;
    }
    if (d1 === 0) {
      return '1200';
    }
    return digits;
  }

  if (digits.length === 2) {
    const d1 = parseInt(digits[0], 10);
    const d2 = parseInt(digits[1], 10);

    // If first digit >= 2 (e.g. 20..95), d1 is hour and d2 is tens of minutes
    // e.g. "45" -> "450" (4:50), "25" -> "250" (2:50), "73" -> "730" (7:30)
    if (d1 >= 2) {
      return `${d1}${d2}0`;
    }

    if (d1 === 1) {
      if (d2 <= 2) {
        // Hours 10, 11, 12 -> "1000", "1100", "1200"
        return `${digits}00`;
      }
      // "13", "14", "15" -> hour is 1, tens of minutes is d2 -> "130", "140", "150"
      return `1${d2}0`;
    }

    if (d1 === 0) {
      if (d2 >= 1 && d2 <= 9) {
        return `${d2}00`;
      }
      return '1200';
    }
  }

  return digits;
}

/**
 * Validates a raw date string or segment object on lost focus.
 * Returns an error message if invalid, or null if valid.
 *
 * SPECIFICATION & INVARIANTS:
 * - Empty string or all-empty segments returns null (posting without date is permitted).
 * - If Month is empty but another element (Day or Year) is filled in: returns "Please enter a month".
 * - If Month is filled in but Day is empty: returns "Please enter a day".
 * - If Month is invalid (< 1 or > 12): returns "Month must be between 01-12".
 * - If Day exceeds max days for that month/year: returns "Day must be between 01-{maxDays}".
 * - If Year is invalid: returns "Please enter a year between 2000 and 2999".
 */
export function validateDateOnBlur(
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
    const trimmed = target.trim();
    if (!trimmed) return null;

    if (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('.')) {
      const parts = trimmed.split(/[/.-]/);
      m = parts[0] || '';
      d = parts[1] || '';
      y = parts[2] || '';
    } else {
      const digits = trimmed.replace(/[^0-9]/g, '');
      if (digits.length === 0) return null;
      if (digits.length <= 2) {
        m = digits;
      } else if (digits.length === 3) {
        m = digits.slice(0, 2);
        d = digits.slice(2);
      } else if (digits.length === 4) {
        m = digits.slice(0, 2);
        d = digits.slice(2, 4);
      } else if (digits.length === 5) {
        m = digits.slice(0, 2);
        d = digits.slice(2, 4);
        y = digits.slice(4);
      } else if (digits.length === 6) {
        m = digits.slice(0, 2);
        d = digits.slice(2, 4);
        y = digits.slice(4, 6);
      } else {
        m = digits.slice(0, 2);
        d = digits.slice(2, 4);
        y = digits.slice(4, 8);
      }
    }
  }

  // If entire date is empty (no elements filled in): no error
  if (!m && !d && !y) {
    return null;
  }

  const isAnotherElementFilled = Boolean(d || y);

  // If Month is completely empty, but another element (Day or Year) has been filled in:
  if (!m) {
    if (isAnotherElementFilled) {
      return 'Please enter a month';
    }
    return null;
  }

  // Month is partially filled (e.g. 1 digit)
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

  // Check Day:
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

  // Check Year:
  if (!y) {
    // Both Month and Day are present, but Year is empty.
    // 4 digits (MMDD) is allowed so completeDateDigits can auto-fill next occurrence year.
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

  if (monthNum === 2 && dayNum === 29) {
    const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
    if (!isLeap) {
      return `${yearNum} is not a leap year`;
    }
  }

  const maxDays = getMaxDaysForMonth(monthNum, yearNum);
  if (dayNum > maxDays) {
    return `Day must be between 01-${maxDays}`;
  }

  return null;
}

/**
 * Checks whether a raw date is complete and valid for publishing.
 * - Empty string is allowed (posting without a date is permitted).
 * - Partial dates (e.g. 02/18/3) are strictly disallowed.
 * - 6-digit dates (MMDDYY) and 8-digit dates (MMDDYYYY) must pass full month, day, leap year, and year validation.
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
  return validateDateOnBlur(rawDate, referenceDate) === null;
}

/**
 * Checks whether a raw time is complete/valid for publishing.
 * - Empty string is allowed (posting without a time is permitted).
 * - Non-empty string must resolve to a valid time via resolveTimeWithPeriod.
 */
export function isTimeCompleteAndValid(rawTime: string): boolean {
  if (!rawTime || rawTime.length === 0) return true;
  const resolved = resolveTimeWithPeriod(rawTime, 'PM');
  return Boolean(resolved);
}

/**
 * Options for formatPostRelativeTime to allow deterministic unit testing.
 */
export type FormatPostTimeOptions = {
  now?: number; // Wall-clock timestamp (epoch ms)
  monotonicNow?: number; // Monotonic timestamp (e.g. performance.now())
};

/**
 * Formats a post's timestamp or relative time string for the campus feed card footer.
 *
 * ARCHITECTURAL CONTEXT & USER INVARIANTS:
 * 1. "Just now ago" must NEVER be an option under any circumstances.
 *    - If a post was created moments ago, it renders strictly as "Just now" (without "ago").
 *    - Strings that already contain "Just now" or end in "ago" are never double-suffixed.
 * 2. Device Clock & Timezone Invariance:
 *    - Uses UTC epoch timestamps (`Date.now()`) so user timezone differences (EDT, PDT, UTC, JST)
 *      have zero effect on elapsed calculation.
 *    - Clock Rolled Back (Past): If the user manually sets their phone clock into the past
 *      or server/client clock skew occurs (`now < createdAt`), the negative delta is clamped
 *      and renders as "Just now" rather than negative numbers or future times.
 *    - Clock Advanced (Future): If the user advances their phone clock during the active session,
 *      `monotonicCreatedAt` via `performance.now()` measures the true elapsed execution time,
 *      preventing newly authored posts from abruptly jumping to "5d ago".
 *    - Pre-seeded strings like "2h", "1d" format smoothly as "2h ago", "1d ago".
 */
export function formatPostRelativeTime(
  postedAt?: string,
  createdAt?: number,
  monotonicCreatedAt?: number,
  options?: FormatPostTimeOptions
): string {
  // 1. If we have a monotonic session timestamp and monotonic clock, use it to guard
  // against manual system clock changes while the app is active
  if (monotonicCreatedAt !== undefined && monotonicCreatedAt !== null) {
    const currentMonotonic =
      options?.monotonicNow ?? (typeof performance !== 'undefined' ? performance.now() : undefined);
    if (currentMonotonic !== undefined) {
      const elapsedMs = currentMonotonic - monotonicCreatedAt;
      if (elapsedMs < 60_000) {
        return 'Just now';
      }
      if (elapsedMs < 3_600_000) {
        return `${Math.floor(elapsedMs / 60_000)}m ago`;
      }
      if (elapsedMs < 86_400_000) {
        return `${Math.floor(elapsedMs / 3_600_000)}h ago`;
      }
      return `${Math.floor(elapsedMs / 86_400_000)}d ago`;
    }
  }

  // 2. If a numeric UTC epoch timestamp is available:
  if (typeof createdAt === 'number' && !isNaN(createdAt)) {
    const now = options?.now ?? Date.now();
    const diffMs = now - createdAt;

    // Clock skew / clock rolled back into past: clamp to 'Just now'
    if (diffMs < 60_000) {
      return 'Just now';
    }
    if (diffMs < 3_600_000) {
      return `${Math.floor(diffMs / 60_000)}m ago`;
    }
    if (diffMs < 86_400_000) {
      return `${Math.floor(diffMs / 3_600_000)}h ago`;
    }
    if (diffMs < 604_800_000) {
      return `${Math.floor(diffMs / 86_400_000)}d ago`;
    }
    if (diffMs < 2_592_000_000) {
      return `${Math.floor(diffMs / 604_800_000)}w ago`;
    }
    return `${Math.floor(diffMs / 2_592_000_000)}mo ago`;
  }

  // 3. String-based fallback (for pre-seeded mock posts or legacy records):
  if (!postedAt || typeof postedAt !== 'string') {
    return 'Just now';
  }

  const trimmed = postedAt.trim();
  const lower = trimmed.toLowerCase();

  // Guard against any permutation of "just now", "just now ago", or "now"
  if (lower === 'just now' || lower === 'just now ago' || lower === 'now') {
    return 'Just now';
  }

  // If already ends in "ago"
  if (lower.endsWith('ago')) {
    if (lower.includes('just now')) {
      return 'Just now';
    }
    return trimmed;
  }

  // Relative duration token (e.g. "2h", "5m", "1d", "3w") -> append " ago"
  return `${trimmed} ago`;
}



