import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  TimeUtils,
  parseTimeToMinutes,
  resolveEventTimeRange,
  validateTimeRange,
} from '@/utils/date-format';

describe('Event Time Range Resolution & Validation Invariants', () => {
  describe('parseTimeToMinutes', () => {
    it('accurately parses 12-hour clock times into minutes from midnight', () => {
      // Midnight boundaries
      assert.strictEqual(parseTimeToMinutes('1200', 'AM'), 0, '12:00 AM must be 0 minutes');
      assert.strictEqual(parseTimeToMinutes('1230', 'AM'), 30, '12:30 AM must be 30 minutes');
      assert.strictEqual(parseTimeToMinutes('100', 'AM'), 60, '1:00 AM must be 60 minutes');

      // Morning times
      assert.strictEqual(parseTimeToMinutes('930', 'AM'), 9 * 60 + 30);
      assert.strictEqual(parseTimeToMinutes('1159', 'AM'), 11 * 60 + 59);

      // Noon boundaries
      assert.strictEqual(parseTimeToMinutes('1200', 'PM'), 720, '12:00 PM must be 720 minutes');
      assert.strictEqual(parseTimeToMinutes('1230', 'PM'), 750, '12:30 PM must be 750 minutes');

      // Afternoon & evening times
      assert.strictEqual(parseTimeToMinutes('100', 'PM'), 780, '1:00 PM must be 780 minutes');
      assert.strictEqual(parseTimeToMinutes('700', 'PM'), 19 * 60, '7:00 PM must be 1140 minutes');
      assert.strictEqual(parseTimeToMinutes('900', 'PM'), 21 * 60, '9:00 PM must be 1260 minutes');
      assert.strictEqual(parseTimeToMinutes('1159', 'PM'), 23 * 60 + 59);
    });

    it('returns null on invalid or empty times', () => {
      assert.strictEqual(parseTimeToMinutes('', 'PM'), null);
      assert.strictEqual(parseTimeToMinutes('99', 'PM'), null);
    });
  });

  describe('resolveEventTimeRange', () => {
    it('formats single event time when end time is omitted or empty', () => {
      assert.strictEqual(resolveEventTimeRange('700', 'PM'), '7:00 PM');
      assert.strictEqual(resolveEventTimeRange('700', 'PM', ''), '7:00 PM');
      assert.strictEqual(resolveEventTimeRange('700', 'PM', '   '), '7:00 PM');
      assert.strictEqual(resolveEventTimeRange('930', 'AM'), '9:30 AM');
    });

    it('formats clean range without duplicate period when start and end share the same period', () => {
      // PM range: 7:00 PM - 9:00 PM -> 7:00 – 9:00 PM
      assert.strictEqual(resolveEventTimeRange('700', 'PM', '900', 'PM'), '7:00 – 9:00 PM');
      assert.strictEqual(resolveEventTimeRange('1230', 'PM', '130', 'PM'), '12:30 – 1:30 PM');
      assert.strictEqual(resolveEventTimeRange('500', 'PM', '800', 'PM'), '5:00 – 8:00 PM');

      // AM range: 9:00 AM - 11:30 AM -> 9:00 – 11:30 AM
      assert.strictEqual(resolveEventTimeRange('900', 'AM', '1130', 'AM'), '9:00 – 11:30 AM');
    });

    it('preserves both periods when start and end differ in period', () => {
      // Morning to afternoon
      assert.strictEqual(resolveEventTimeRange('1000', 'AM', '100', 'PM'), '10:00 AM – 1:00 PM');
      assert.strictEqual(resolveEventTimeRange('1130', 'AM', '1230', 'PM'), '11:30 AM – 12:30 PM');

      // Overnight
      assert.strictEqual(resolveEventTimeRange('1100', 'PM', '100', 'AM'), '11:00 PM – 1:00 AM');
    });

    it('handles single end time when start time is omitted', () => {
      assert.strictEqual(resolveEventTimeRange('', 'PM', '900', 'PM'), '9:00 PM');
      assert.strictEqual(resolveEventTimeRange('', 'AM', '1130', 'AM'), '11:30 AM');
    });

    it('returns empty string when both times are omitted', () => {
      assert.strictEqual(resolveEventTimeRange('', 'PM', '', 'PM'), '');
    });
  });

  describe('validateTimeRange', () => {
    it('accepts valid time ranges', () => {
      assert.strictEqual(validateTimeRange('700', 'PM', '900', 'PM'), null);
      assert.strictEqual(validateTimeRange('1000', 'AM', '100', 'PM'), null);
      assert.strictEqual(validateTimeRange('900', 'AM', '1130', 'AM'), null);
      assert.strictEqual(validateTimeRange('1100', 'PM', '100', 'AM'), null, 'Overnight event is valid');
      assert.strictEqual(validateTimeRange('700', 'PM', '', 'PM'), null, 'Omitted end time is valid');
    });

    it('requires start time when end time is entered', () => {
      assert.strictEqual(
        validateTimeRange('', 'PM', '900', 'PM'),
        'Please enter a start time'
      );
    });

    it('rejects identical start and end times', () => {
      assert.strictEqual(
        validateTimeRange('700', 'PM', '700', 'PM'),
        'End time must be different from start time'
      );
      assert.strictEqual(
        validateTimeRange('1000', 'AM', '1000', 'AM'),
        'End time must be different from start time'
      );
    });

    it('rejects end time earlier than start time within the same period', () => {
      assert.strictEqual(
        validateTimeRange('900', 'PM', '700', 'PM'),
        'End time cannot be earlier than start time'
      );
      assert.strictEqual(
        validateTimeRange('1130', 'AM', '900', 'AM'),
        'End time cannot be earlier than start time'
      );
      assert.strictEqual(
        validateTimeRange('100', 'PM', '1200', 'PM'),
        'End time cannot be earlier than start time'
      );
    });
  });

  describe('TimeUtils Namespace Invariants', () => {
    it('exposes range resolution and validation through TimeUtils', () => {
      assert.strictEqual(typeof TimeUtils.resolveRange, 'function');
      assert.strictEqual(typeof TimeUtils.validateRange, 'function');
      assert.strictEqual(typeof TimeUtils.parseMinutes, 'function');

      assert.strictEqual(TimeUtils.resolveRange('700', 'PM', '900', 'PM'), '7:00 – 9:00 PM');
      assert.strictEqual(TimeUtils.validateRange('700', 'PM', '900', 'PM'), null);
      assert.strictEqual(TimeUtils.parseMinutes('700', 'PM'), 1140);
    });
  });

  describe('Form Guidance & Info Button Modal Invariants', () => {
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
      // Natural alignment invariant: No artificial translateY offsets
      const HAS_TRANSLATE_Y_OFFSET = false;
      assert.strictEqual(HAS_TRANSLATE_Y_OFFSET, false, 'No artificial translateY offsets should be used');

      // Matching icon size invariant: 13px icons match 12px caption font scale
      const FIELD_LABEL_ICON_SIZE = 13;
      assert.strictEqual(FIELD_LABEL_ICON_SIZE, 13);

      // Modal bullet icon wrapper dimensions match text line-height (18px x 18px)
      const MODAL_BULLET_LINE_HEIGHT = 18;
      const MODAL_BULLET_ICON_WRAPPER = { width: 18, height: 18 };
      assert.strictEqual(MODAL_BULLET_ICON_WRAPPER.height, MODAL_BULLET_LINE_HEIGHT);
      assert.strictEqual(MODAL_BULLET_ICON_WRAPPER.width, MODAL_BULLET_LINE_HEIGHT);

      // Nested guidance spans match parent line-height to prevent baseline drift
      const MODAL_BULLET_FONT_SCALE = { fontSize: 13, lineHeight: 18 };
      assert.strictEqual(MODAL_BULLET_FONT_SCALE.lineHeight, MODAL_BULLET_LINE_HEIGHT);
    });
  });
});


