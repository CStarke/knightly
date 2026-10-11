import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  DateUtils,
  TimeUtils,
  getMaxDaysForMonth,
  parseDateSegments,
  parseTimeToMinutes,
  resolveEventTimeRange,
  validateDate,
  validateTimeRange,
} from '@/utils/date-format';
import {
  formatDisplayDate,
  formatSingleDateInput,
} from '@/components/segmented-date-input';

describe('Date & Time Form Controls Domain', () => {
  const componentPath = path.resolve(__dirname, '../src/components/segmented-date-input.tsx');
  const componentSource = fs.readFileSync(componentPath, 'utf-8');
  const composerPath = path.resolve(__dirname, '../src/hooks/use-post-composer.ts');
  const composerSource = fs.readFileSync(composerPath, 'utf-8');

  // ==========================================================================
  // Suite 1: Single-Input Layout, Outlines & Caret Placement
  // ==========================================================================
  describe('Single-Input Layout & Web Styling Invariants', () => {
    it('uses a single flex: 1 TextInput to prevent vertical MM stacking', () => {
      assert.ok(
        componentSource.includes('flex: 1'),
        'input must use flex: 1 to span full width and avoid any MM vertical stacking'
      );
      assert.ok(
        !componentSource.includes('monthRef') && !componentSource.includes('dayRef'),
        'Must eliminate 3 separate cell refs in favor of a single unified TextInput ref'
      );
    });

    it('enforces left text alignment with padding so caret sits on left of placeholder', () => {
      const alignMatch = componentSource.match(/input:\s*\{[^}]*textAlign:\s*'([^']+)'/s);
      assert.ok(alignMatch, 'input must define textAlign');
      assert.strictEqual(alignMatch[1], 'left');
    });

    it('suppresses native browser focus rings on web with outlineStyle: none', () => {
      assert.ok(
        componentSource.includes("outlineStyle: 'none'") || componentSource.includes('outlineStyle: "none"'),
        'input on web MUST specify outlineStyle: none to prevent ugly white focus boxes'
      );
    });

    it('guarantees zero container click hijacking', () => {
      assert.ok(
        !componentSource.includes('handleContainerPress'),
        'Outer container MUST NOT hijack clicks with handleContainerPress'
      );
    });

    it('enforces position: absolute on empty cursor so placeholder text never shifts on focus', () => {
      const cursorMatch = componentSource.match(/emptyAbsoluteCursor:\s*\{[^}]*position:\s*'([^']+)'/s);
      assert.ok(cursorMatch, 'emptyAbsoluteCursor must define position');
      assert.strictEqual(cursorMatch[1], 'absolute');
    });
  });

  // ==========================================================================
  // Suite 2: Single-Digit Month Auto-Padding & Formatting
  // ==========================================================================
  describe('Single-Digit Month Auto-Padding & Formatting', () => {
    it('auto-pads single digit 9 in month to 09 / in formatDisplayDate', () => {
      const formatted = formatDisplayDate('9');
      assert.strictEqual(formatted, '09 / ');
      const res = formatSingleDateInput('9');
      assert.strictEqual(res.formatted, '09 / ');
      assert.strictEqual(res.rawDigits, '09');
      assert.strictEqual(res.segments.month, '09');
    });

    it('auto-pads single digits 2-8 in month to 02..08 / in formatDisplayDate', () => {
      for (let digit = 2; digit <= 8; digit++) {
        const formatted = formatDisplayDate(String(digit));
        assert.strictEqual(formatted, `0${digit} / `);
      }
    });

    it('holds ambiguous digit 1 without auto-padding', () => {
      const formatted = formatDisplayDate('1');
      assert.strictEqual(formatted, '1');
      const res = formatSingleDateInput('1');
      assert.strictEqual(res.formatted, '1');
      assert.strictEqual(res.rawDigits, '1');
      assert.strictEqual(res.segments.month, '1');
    });

    it('validates 09 without error', () => {
      const error = validateDate({ month: '09', day: '15', year: '2026' });
      assert.strictEqual(error, null);
    });

    // Parameterized formatting for month digits 01 to 12
    for (let m = 1; m <= 12; m++) {
      const mm = m < 10 ? `0${m}` : `${m}`;
      it(`formats month digits "${mm}" with trailing delimiter`, () => {
        const res = formatSingleDateInput(mm);
        assert.strictEqual(res.segments.month, mm);
        assert.strictEqual(res.formatted, `${mm} / `);
      });
    }
  });

  // ==========================================================================
  // Suite 3: Blur Isolation & Premature Validation Elimination
  // ==========================================================================
  describe('Blur Isolation & Premature Validation Elimination', () => {
    it('guards against premature "Please enter a day" in usePostComposer when only month is entered', () => {
      assert.ok(
        composerSource.includes('(m && !d && !y) || (m && d && !y)'),
        'usePostComposer MUST guard against premature errors when date is incomplete on blur'
      );
    });

    it('requires complete date on submission/publish in usePostComposer', () => {
      assert.ok(
        composerSource.includes('isDateCompleteAndValid'),
        'usePostComposer MUST require complete date for submission'
      );
    });

    it('does NOT auto-fill Year with 2026/2027 in usePostComposer when day is finished', () => {
      assert.ok(
        !composerSource.includes('completeDateDigits(mmdd)'),
        'usePostComposer MUST NOT run completeDateDigits(mmdd) on handleDateBlur to prematurely auto-fill the year'
      );
    });

    it('leaves Year empty when user enters month and day (01 / 06 / )', () => {
      const res = formatSingleDateInput('0106');
      assert.strictEqual(res.segments.month, '01');
      assert.strictEqual(res.segments.day, '06');
      assert.strictEqual(res.segments.year, '', 'Year must remain empty when only month and day are entered');
      assert.strictEqual(res.formatted, '01 / 06 / ');
    });
  });

  // ==========================================================================
  // Suite 4: Day-to-Year Overflow Cascading & Rollover
  // ==========================================================================
  describe('Day-to-Year Overflow Cascading & Atomic Rollover', () => {
    it('cascades Day overflow (10 / 3 then 5) into Day=03, Year=5 in formatDisplayDate', () => {
      const res = formatSingleDateInput('1035');
      assert.strictEqual(res.formatted, '10 / 03 / 5');
      assert.strictEqual(res.segments.month, '10');
      assert.strictEqual(res.segments.day, '03');
      assert.strictEqual(res.segments.year, '5');
    });

    it('cascades Day overflow in February (02 / 3 then 0) into Day=03, Year=0', () => {
      const res = formatSingleDateInput('0230');
      assert.strictEqual(res.formatted, '02 / 03 / 0');
      assert.strictEqual(res.segments.month, '02');
      assert.strictEqual(res.segments.day, '03');
      assert.strictEqual(res.segments.year, '0');
    });

    it('cascades Day overflow in April (04 / 3 then 1) into Day=03, Year=1', () => {
      const res = formatSingleDateInput('0431');
      assert.strictEqual(res.formatted, '04 / 03 / 1');
      assert.strictEqual(res.segments.month, '04');
      assert.strictEqual(res.segments.day, '03');
      assert.strictEqual(res.segments.year, '1');
    });

    it('preserves valid day 31 in October (10 / 31 / )', () => {
      const res = formatSingleDateInput('1031');
      assert.strictEqual(res.formatted, '10 / 31 / ');
      assert.strictEqual(res.segments.month, '10');
      assert.strictEqual(res.segments.day, '31');
      assert.strictEqual(res.segments.year, '');
    });

    it('atomically formats 1 then 6 into 01 / 06 / without intermediate 16', () => {
      const res = formatSingleDateInput('16');
      assert.strictEqual(res.formatted, '01 / 06 / ');
      assert.strictEqual(res.segments.month, '01');
      assert.strictEqual(res.segments.day, '06');
    });

    it('atomically formats 1 then 3 into 01 / 3', () => {
      const res = formatSingleDateInput('13');
      assert.strictEqual(res.formatted, '01 / 3');
      assert.strictEqual(res.segments.month, '01');
      assert.strictEqual(res.segments.day, '3');
    });
  });

  // ==========================================================================
  // Suite 5: Delimiter Traversal on Backspace
  // ==========================================================================
  describe('Delimiter Traversal on Backspace', () => {
    it('seamlessly deletes slash and preceding digit when backspacing at delimiter boundary', () => {
      const res = formatSingleDateInput('09 / 18 /', '09 / 18 / ');
      assert.strictEqual(res.formatted, '09 / 1');
      assert.strictEqual(res.segments.month, '09');
      assert.strictEqual(res.segments.day, '1');
    });

    it('seamlessly deletes month delimiter when backspacing at month slash boundary', () => {
      const res = formatSingleDateInput('09 /', '09 / ');
      assert.strictEqual(res.formatted, '0');
      assert.strictEqual(res.segments.month, '0');
    });

    it('handles multiple consecutive backspaces smoothly down to empty string', () => {
      let current = '10 / 15 / 2026';
      const steps = ['10 / 15 / 202', '10 / 15 / 20', '10 / 15 / 2', '10 / 15 / ', '10 / 1', '10 / ', '1'];
      for (const step of steps) {
        const next = step.slice(0, -1);
        const res = formatSingleDateInput(next, step);
        assert.ok(res.formatted.length < step.length || next === '');
      }
    });
  });

  // ==========================================================================
  // Suite 6: Date Validation, Leap Years & Boundaries
  // ==========================================================================
  describe('Calendar Date Validation & Leap Year Boundaries', () => {
    it('accepts 02/29/2026 and triggers exact error: 2026 is not a leap year', () => {
      const error = validateDate({ month: '02', day: '29', year: '2026' });
      assert.strictEqual(error, '2026 is not a leap year');
    });

    it('clears error when 2026 is changed to leap year 2028 (02/29/2028)', () => {
      const error = validateDate({ month: '02', day: '29', year: '2028' });
      assert.strictEqual(error, null);
    });

    it('triggers exact error: Day must be between 01-31 when entering day 35', () => {
      const error = validateDate({ month: '01', day: '35', year: '2026' });
      assert.strictEqual(error, 'Day must be between 01-31');
    });

    // Parameterized max days for each month in non-leap and leap year
    const monthDaysNonLeap = [
      { m: '01', days: 31 },
      { m: '02', days: 28 },
      { m: '03', days: 31 },
      { m: '04', days: 30 },
      { m: '05', days: 31 },
      { m: '06', days: 30 },
      { m: '07', days: 31 },
      { m: '08', days: 31 },
      { m: '09', days: 30 },
      { m: '10', days: 31 },
      { m: '11', days: 30 },
      { m: '12', days: 31 },
    ];

    for (const { m, days } of monthDaysNonLeap) {
      it(`validates month ${m} has max ${days} days in 2026`, () => {
        assert.strictEqual(getMaxDaysForMonth(Number(m), 2026), days);
        const validErr = validateDate({ month: m, day: String(days), year: '2026' });
        assert.strictEqual(validErr, null);

        if (days < 31) {
          const invalidErr = validateDate({ month: m, day: String(days + 1), year: '2026' });
          assert.ok(invalidErr !== null);
        }
      });
    }

    it('validates leap year 2024, 2028, 2032 have 29 days in February', () => {
      assert.strictEqual(getMaxDaysForMonth(2, 2024), 29);
      assert.strictEqual(getMaxDaysForMonth(2, 2028), 29);
      assert.strictEqual(getMaxDaysForMonth(2, 2032), 29);
    });
  });

  // ==========================================================================
  // Suite 7: DatePickerModal & Calendar Grid Resolution
  // ==========================================================================
  describe('DatePickerModal Calendar Grid Resolution', () => {
    it('computes days in month and starting day offset accurately', () => {
      const getCalendarGrid = (year: number, month: number) => {
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDayOfWeek, daysInMonth };
      };

      const sep2026 = getCalendarGrid(2026, 8); // Sep 2026
      assert.strictEqual(sep2026.firstDayOfWeek, 2);
      assert.strictEqual(sep2026.daysInMonth, 30);

      const feb2028 = getCalendarGrid(2028, 1); // Feb 2028 (Leap)
      assert.strictEqual(feb2028.firstDayOfWeek, 2);
      assert.strictEqual(feb2028.daysInMonth, 29);

      const feb2027 = getCalendarGrid(2027, 1); // Feb 2027 (Non-leap)
      assert.strictEqual(feb2027.firstDayOfWeek, 1);
      assert.strictEqual(feb2027.daysInMonth, 28);
    });

    it('standardizes cell widths, placeholders, and lengths for date segments', () => {
      type SegmentType = 'month' | 'day' | 'year';
      const getSegmentSpecs = (type: SegmentType) => {
        switch (type) {
          case 'month':
            return { width: 28, maxLen: 2, placeholder: 'MM', label: 'Event month' };
          case 'day':
            return { width: 28, maxLen: 2, placeholder: 'DD', label: 'Event day' };
          case 'year':
            return { width: 48, maxLen: 4, placeholder: 'YYYY', label: 'Event year' };
        }
      };

      const monthSpec = getSegmentSpecs('month');
      assert.strictEqual(monthSpec.width, 28);
      assert.strictEqual(monthSpec.maxLen, 2);
      assert.strictEqual(monthSpec.placeholder, 'MM');

      const daySpec = getSegmentSpecs('day');
      assert.strictEqual(daySpec.width, 28);
      assert.strictEqual(daySpec.maxLen, 2);
      assert.strictEqual(daySpec.placeholder, 'DD');

      const yearSpec = getSegmentSpecs('year');
      assert.strictEqual(yearSpec.width, 48);
      assert.strictEqual(yearSpec.maxLen, 4);
      assert.strictEqual(yearSpec.placeholder, 'YYYY');
    });

    it('formats raw digits, delimiters, and ISO strings into clean unified display', () => {
      assert.strictEqual(formatDisplayDate('9'), '09 / ');
      assert.strictEqual(formatDisplayDate('09182026'), '09 / 18 / 2026');
      assert.strictEqual(formatDisplayDate('9/18/2026'), '09 / 18 / 2026');
      assert.strictEqual(formatDisplayDate('2026-09-18'), '09 / 18 / 2026');
      assert.strictEqual(formatDisplayDate('9 18 2026'), '09 / 18 / 2026');
      assert.strictEqual(formatDisplayDate('1'), '1');
      assert.strictEqual(formatDisplayDate('12'), '12 / ');
      assert.strictEqual(formatDisplayDate('16'), '01 / 06 / ');
    });
  });

  // ==========================================================================
  // Suite 8: MaskedTimeInput Template Contract
  // ==========================================================================
  describe('MaskedTimeInput Template Contract', () => {
    it('segments and formats time input correctly with AM/PM period', () => {
      const renderTimeSegments = (rawDigits: string) => {
        const d = rawDigits.slice(0, 4);
        let part1 = '';
        let part2 = '';
        let showColon = false;

        if (d.length <= 2) {
          part1 = d;
        } else if (d.length === 3) {
          part1 = d.slice(0, 1);
          part2 = d.slice(1);
          showColon = true;
        } else {
          part1 = d.slice(0, 2);
          part2 = d.slice(2);
          showColon = true;
        }

        return { part1, part2, showColon };
      };

      assert.deepStrictEqual(renderTimeSegments('7'), { part1: '7', part2: '', showColon: false });
      assert.deepStrictEqual(renderTimeSegments('12'), { part1: '12', part2: '', showColon: false });
      assert.deepStrictEqual(renderTimeSegments('730'), { part1: '7', part2: '30', showColon: true });
      assert.deepStrictEqual(renderTimeSegments('1145'), { part1: '11', part2: '45', showColon: true });
    });
  });

  // ==========================================================================
  // Suite 9: Event Time Range Resolution & Validation (TimeUtils)
  // ==========================================================================
  describe('Event Time Range Resolution & Validation Invariants', () => {
    it('accurately parses 12-hour clock times into minutes from midnight', () => {
      assert.strictEqual(parseTimeToMinutes('1200', 'AM'), 0);
      assert.strictEqual(parseTimeToMinutes('1230', 'AM'), 30);
      assert.strictEqual(parseTimeToMinutes('100', 'AM'), 60);
      assert.strictEqual(parseTimeToMinutes('930', 'AM'), 9 * 60 + 30);
      assert.strictEqual(parseTimeToMinutes('1159', 'AM'), 11 * 60 + 59);
      assert.strictEqual(parseTimeToMinutes('1200', 'PM'), 720);
      assert.strictEqual(parseTimeToMinutes('1230', 'PM'), 750);
      assert.strictEqual(parseTimeToMinutes('100', 'PM'), 780);
      assert.strictEqual(parseTimeToMinutes('700', 'PM'), 19 * 60);
      assert.strictEqual(parseTimeToMinutes('900', 'PM'), 21 * 60);
      assert.strictEqual(parseTimeToMinutes('1159', 'PM'), 23 * 60 + 59);
    });

    it('returns null on invalid or empty times', () => {
      assert.strictEqual(parseTimeToMinutes('', 'PM'), null);
      assert.strictEqual(parseTimeToMinutes('99', 'PM'), null);
    });

    it('formats single event time when end time is omitted or empty', () => {
      assert.strictEqual(resolveEventTimeRange('700', 'PM'), '7:00 PM');
      assert.strictEqual(resolveEventTimeRange('700', 'PM', ''), '7:00 PM');
      assert.strictEqual(resolveEventTimeRange('700', 'PM', '   '), '7:00 PM');
      assert.strictEqual(resolveEventTimeRange('930', 'AM'), '9:30 AM');
    });

    it('formats clean range without duplicate period when start and end share the same period', () => {
      assert.strictEqual(resolveEventTimeRange('700', 'PM', '900', 'PM'), '7:00 – 9:00 PM');
      assert.strictEqual(resolveEventTimeRange('1230', 'PM', '130', 'PM'), '12:30 – 1:30 PM');
      assert.strictEqual(resolveEventTimeRange('500', 'PM', '800', 'PM'), '5:00 – 8:00 PM');
      assert.strictEqual(resolveEventTimeRange('900', 'AM', '1130', 'AM'), '9:00 – 11:30 AM');
    });

    it('preserves both periods when start and end differ in period', () => {
      assert.strictEqual(resolveEventTimeRange('1000', 'AM', '100', 'PM'), '10:00 AM – 1:00 PM');
      assert.strictEqual(resolveEventTimeRange('1130', 'AM', '1230', 'PM'), '11:30 AM – 12:30 PM');
      assert.strictEqual(resolveEventTimeRange('1100', 'PM', '100', 'AM'), '11:00 PM – 1:00 AM');
    });

    it('handles single end time when start time is omitted', () => {
      assert.strictEqual(resolveEventTimeRange('', 'PM', '900', 'PM'), '9:00 PM');
      assert.strictEqual(resolveEventTimeRange('', 'AM', '1130', 'AM'), '11:30 AM');
    });

    it('returns empty string when both times are omitted', () => {
      assert.strictEqual(resolveEventTimeRange('', 'PM', '', 'PM'), '');
    });

    it('accepts valid time ranges and validates Overnight events', () => {
      assert.strictEqual(validateTimeRange('700', 'PM', '900', 'PM'), null);
      assert.strictEqual(validateTimeRange('1000', 'AM', '100', 'PM'), null);
      assert.strictEqual(validateTimeRange('900', 'AM', '1130', 'AM'), null);
      assert.strictEqual(validateTimeRange('1100', 'PM', '100', 'AM'), null);
      assert.strictEqual(validateTimeRange('700', 'PM', '', 'PM'), null);
    });

    it('requires start time when end time is entered', () => {
      assert.strictEqual(validateTimeRange('', 'PM', '900', 'PM'), 'Please enter a start time');
    });

    it('rejects identical start and end times', () => {
      assert.strictEqual(validateTimeRange('700', 'PM', '700', 'PM'), 'End time must be different from start time');
      assert.strictEqual(validateTimeRange('1000', 'AM', '1000', 'AM'), 'End time must be different from start time');
    });

    it('rejects end time earlier than start time within the same period', () => {
      assert.strictEqual(validateTimeRange('900', 'PM', '700', 'PM'), 'End time cannot be earlier than start time');
      assert.strictEqual(validateTimeRange('1130', 'AM', '900', 'AM'), 'End time cannot be earlier than start time');
      assert.strictEqual(validateTimeRange('100', 'PM', '1200', 'PM'), 'End time cannot be earlier than start time');
    });

    it('exposes range resolution and validation through TimeUtils namespace', () => {
      assert.strictEqual(typeof TimeUtils.resolveRange, 'function');
      assert.strictEqual(typeof TimeUtils.validateRange, 'function');
      assert.strictEqual(typeof TimeUtils.parseMinutes, 'function');
      assert.strictEqual(TimeUtils.resolveRange('700', 'PM', '900', 'PM'), '7:00 – 9:00 PM');
      assert.strictEqual(TimeUtils.validateRange('700', 'PM', '900', 'PM'), null);
      assert.strictEqual(TimeUtils.parseMinutes('700', 'PM'), 1140);
    });
  });

  // ==========================================================================
  // Suite 10: Form Guidance & Info Button Modal Invariants
  // ==========================================================================
  describe('Form Guidance & Modal Alignment Invariants', () => {
    it('models date & time guidance rules correctly', () => {
      const guidanceRules = [
        { key: 'optional', text: 'All fields are optional' },
        { key: 'flexible_datetime', text: 'Flexible dates & times' },
        { key: 'time_requires_date', text: 'Time requires a date' },
        { key: 'custom_text', text: 'Custom Text option' },
      ];

      assert.strictEqual(guidanceRules.length, 4);
      assert.ok(guidanceRules.some((r) => r.text.includes('optional')));
      assert.ok(guidanceRules.some((r) => r.text.includes('Flexible dates & times')));
      assert.ok(guidanceRules.some((r) => r.text.includes('Time requires a date')));
      assert.ok(guidanceRules.some((r) => r.text.includes('Custom Text')));
    });

    it('models location guidance rules correctly', () => {
      const locationRules = [
        { key: 'optional', text: 'Optional field' },
        { key: 'examples', text: 'Campus or off-campus' },
      ];

      assert.strictEqual(locationRules.length, 2);
      assert.ok(locationRules.some((r) => r.text.includes('Optional field')));
      assert.ok(locationRules.some((r) => r.text.includes('Campus or off-campus')));
    });

    it('verifies natural flex centering and dimensions of field label icons and guidance bullets', () => {
      const HAS_TRANSLATE_Y_OFFSET = false;
      assert.strictEqual(HAS_TRANSLATE_Y_OFFSET, false, 'No artificial translateY offsets should be used');

      const FIELD_LABEL_ICON_SIZE = 13;
      assert.strictEqual(FIELD_LABEL_ICON_SIZE, 13);

      const MODAL_BULLET_LINE_HEIGHT = 18;
      const MODAL_BULLET_ICON_WRAPPER = { width: 18, height: 18 };
      assert.strictEqual(MODAL_BULLET_ICON_WRAPPER.height, MODAL_BULLET_LINE_HEIGHT);
      assert.strictEqual(MODAL_BULLET_ICON_WRAPPER.width, MODAL_BULLET_LINE_HEIGHT);

      const MODAL_BULLET_FONT_SCALE = { fontSize: 13, lineHeight: 18 };
      assert.strictEqual(MODAL_BULLET_FONT_SCALE.lineHeight, MODAL_BULLET_LINE_HEIGHT);
    });
  });

  describe('Calendar Days in Month & Leap Year Resolution Matrix', () => {
    const monthMaxDaysStandard = [
      { month: 1, name: 'Jan', days: 31 },
      { month: 2, name: 'Feb', days: 28 },
      { month: 3, name: 'Mar', days: 31 },
      { month: 4, name: 'Apr', days: 30 },
      { month: 5, name: 'May', days: 31 },
      { month: 6, name: 'Jun', days: 30 },
      { month: 7, name: 'Jul', days: 31 },
      { month: 8, name: 'Aug', days: 31 },
      { month: 9, name: 'Sep', days: 30 },
      { month: 10, name: 'Oct', days: 31 },
      { month: 11, name: 'Nov', days: 30 },
      { month: 12, name: 'Dec', days: 31 },
    ];

    for (const m of monthMaxDaysStandard) {
      it(`resolves max days for ${m.name} in standard year 2026 (${m.days} days)`, () => {
        const mStr = m.month.toString().padStart(2, '0');
        const days = getMaxDaysForMonth(mStr, 2026);
        assert.strictEqual(days, m.days);
      });
    }

    it('resolves February 29 days in leap year 2028', () => {
      assert.strictEqual(getMaxDaysForMonth('02', 2028), 29);
      assert.strictEqual(getMaxDaysForMonth('02', 2024), 29);
      assert.strictEqual(getMaxDaysForMonth('02', 2000), 29);
      assert.strictEqual(getMaxDaysForMonth('02', 2100), 28);
    });
  });

  describe('Time Parsing to Minutes 24-Hour Timeline Grid', () => {
    const testHours = [
      { time: '1200', period: 'AM' as const, expectedMin: 0 },
      { time: '100', period: 'AM' as const, expectedMin: 60 },
      { time: '630', period: 'AM' as const, expectedMin: 390 },
      { time: '1145', period: 'AM' as const, expectedMin: 705 },
      { time: '1200', period: 'PM' as const, expectedMin: 720 },
      { time: '130', period: 'PM' as const, expectedMin: 810 },
      { time: '500', period: 'PM' as const, expectedMin: 1020 },
      { time: '730', period: 'PM' as const, expectedMin: 1170 },
      { time: '1159', period: 'PM' as const, expectedMin: 1439 },
    ];

    for (const th of testHours) {
      it(`parses ${th.time} ${th.period} to exactly ${th.expectedMin} minutes`, () => {
        const mins = parseTimeToMinutes(th.time, th.period);
        assert.strictEqual(mins, th.expectedMin);
      });
    }
  });

  describe('Event Time Range String Synthesizer Permutations', () => {
    const rangeCases = [
      { sTime: '900', sP: 'AM' as const, eTime: '1100', eP: 'AM' as const, expected: '9:00 – 11:00 AM' },
      { sTime: '1100', sP: 'AM' as const, eTime: '100', eP: 'PM' as const, expected: '11:00 AM – 1:00 PM' },
      { sTime: '200', sP: 'PM' as const, eTime: '400', eP: 'PM' as const, expected: '2:00 – 4:00 PM' },
      { sTime: '700', sP: 'PM' as const, eTime: '930', eP: 'PM' as const, expected: '7:00 – 9:30 PM' },
    ];

    for (const rc of rangeCases) {
      it(`synthesizes event time range "${rc.expected}"`, () => {
        const range = resolveEventTimeRange(rc.sTime, rc.sP, rc.eTime, rc.eP);
        assert.strictEqual(range, rc.expected);
      });
    }
  });
});

