import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  getMaxDaysForMonth,
  parseDateSegments,
  validateDate,
} from '@/utils/date-format';
import {
  formatDisplayDate,
  formatSingleDateInput,
} from '@/components/segmented-date-input';

describe('Unified Single-Input Date Field Specification & Invariant Tests', () => {
  const componentPath = path.resolve(__dirname, '../src/components/segmented-date-input.tsx');
  const componentSource = fs.readFileSync(componentPath, 'utf-8');
  const composerPath = path.resolve(__dirname, '../src/hooks/use-post-composer.ts');
  const composerSource = fs.readFileSync(composerPath, 'utf-8');

  // ==========================================================================
  // Group 1: Single-Input Layout, Outlines & Caret Placement (Issues 2, 8b, 9)
  // ==========================================================================
  describe('Single-Input Layout, Outlines & Caret Placement', () => {
    it('uses a single flex: 1 TextInput to prevent vertical MM stacking (Issue 2)', () => {
      // Must use a single flexible TextInput spanning the container
      assert.ok(
        componentSource.includes('flex: 1'),
        'input must use flex: 1 to span full width and avoid any MM vertical stacking'
      );
      assert.ok(
        !componentSource.includes('monthRef') && !componentSource.includes('dayRef'),
        'Must eliminate 3 separate cell refs in favor of a single unified TextInput ref'
      );
    });

    it('enforces left text alignment with padding so caret sits on left of placeholder (Issue 9)', () => {
      const alignMatch = componentSource.match(/input:\s*\{[^}]*textAlign:\s*'([^']+)'/s);
      assert.ok(alignMatch, 'input must define textAlign');
      assert.strictEqual(
        alignMatch[1],
        'left',
        `input textAlign must be 'left' so caret sits on left of placeholder text (currently: '${alignMatch[1]}')`
      );
    });

    it('suppresses native browser focus rings on web with outlineStyle: none (Issue 8b)', () => {
      assert.ok(
        componentSource.includes("outlineStyle: 'none'") || componentSource.includes('outlineStyle: "none"'),
        'input on web MUST specify outlineStyle: none to prevent ugly white focus boxes'
      );
    });

    it('guarantees zero container click hijacking (Issue 8)', () => {
      // Outer container must be a standard View without any Pressable handlers forcing focus to Month
      assert.ok(
        !componentSource.includes('handleContainerPress'),
        'Outer container MUST NOT hijack clicks with handleContainerPress'
      );
    });

    it('enforces position: absolute on empty cursor so placeholder text never shifts on focus', () => {
      const cursorMatch = componentSource.match(/emptyAbsoluteCursor:\s*\{[^}]*position:\s*'([^']+)'/s);
      assert.ok(cursorMatch, 'emptyAbsoluteCursor must define position');
      assert.strictEqual(
        cursorMatch[1],
        'absolute',
        `emptyAbsoluteCursor position must be 'absolute' so placeholder text never moves on focus`
      );
    });
  });

  // ==========================================================================
  // Group 2: Single-Digit Month Auto-Padding (Issue 3)
  // ==========================================================================
  describe('Single-Digit Month Auto-Padding (Issue 3)', () => {
    it('auto-pads single digit 9 in month to 09 / in formatDisplayDate (Issue 3)', () => {
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
  });

  // ==========================================================================
  // Group 3: Blur Isolation & Premature Validation Elimination (Issue 4)
  // ==========================================================================
  describe('Blur Isolation & Premature Validation Elimination (Issue 4)', () => {
    it('guards against premature "Please enter a day" in usePostComposer when only month is entered (Issue 4)', () => {
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
  });

  // ==========================================================================
  // Group 4: Premature Year Auto-Fill Invariants (Issue 5)
  // ==========================================================================
  describe('Premature Year Auto-Fill Invariants (Issue 5)', () => {
    it('does NOT auto-fill Year with 2026/2027 in usePostComposer when day is finished (Issue 5)', () => {
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
  // Group 5: Day-to-Year Overflow Cascading (Issue 6)
  // ==========================================================================
  describe('Day-to-Year Overflow Cascading (Issue 6)', () => {
    it('cascades Day overflow (10 / 3 then 5) into Day=03, Year=5 in formatDisplayDate (Issue 6)', () => {
      const res = formatSingleDateInput('1035');
      assert.strictEqual(res.formatted, '10 / 03 / 5');
      assert.strictEqual(res.segments.month, '10');
      assert.strictEqual(res.segments.day, '03');
      assert.strictEqual(res.segments.year, '5');
    });

    it('cascades Day overflow in February (02 / 3 then 0) into Day=03, Year=0 (Issue 6)', () => {
      const res = formatSingleDateInput('0230');
      assert.strictEqual(res.formatted, '02 / 03 / 0');
      assert.strictEqual(res.segments.month, '02');
      assert.strictEqual(res.segments.day, '03');
      assert.strictEqual(res.segments.year, '0');
    });

    it('cascades Day overflow in April (04 / 3 then 1) into Day=03, Year=1 (Issue 6)', () => {
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
  });

  // ==========================================================================
  // Group 6: Atomic Single-Frame Rollover (Issue 1)
  // ==========================================================================
  describe('Atomic Single-Frame Rollover (Issue 1)', () => {
    it('atomically formats 1 then 6 into 01 / 06 / without intermediate 16 (Issue 1)', () => {
      const res = formatSingleDateInput('16');
      assert.strictEqual(res.formatted, '01 / 06 / ');
      assert.strictEqual(res.segments.month, '01');
      assert.strictEqual(res.segments.day, '06');
    });

    it('atomically formats 1 then 3 into 01 / 3 (Issue 1)', () => {
      const res = formatSingleDateInput('13');
      assert.strictEqual(res.formatted, '01 / 3');
      assert.strictEqual(res.segments.month, '01');
      assert.strictEqual(res.segments.day, '3');
    });
  });

  // ==========================================================================
  // Group 7: Delimiter Traversal on Backspace (Issue 7)
  // ==========================================================================
  describe('Delimiter Traversal on Backspace (Issue 7)', () => {
    it('seamlessly deletes slash and preceding digit when backspacing at delimiter boundary', () => {
      // User has '09 / 18 / ' and backspaces: drops slash and trailing 8 -> '09 / 1'
      const res = formatSingleDateInput('09 / 18 /', '09 / 18 / ');
      assert.strictEqual(res.formatted, '09 / 1');
      assert.strictEqual(res.segments.month, '09');
      assert.strictEqual(res.segments.day, '1');
    });

    it('seamlessly deletes month delimiter when backspacing at month slash boundary', () => {
      // User has '09 / ' and backspaces: drops slash and trailing 9 -> '0'
      const res = formatSingleDateInput('09 /', '09 / ');
      assert.strictEqual(res.formatted, '0');
      assert.strictEqual(res.segments.month, '0');
    });
  });

  // ==========================================================================
  // Group 8: Permissive Entry & Real-Time Error Messaging
  // ==========================================================================
  describe('Permissive Entry & Descriptive Error Messages', () => {
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
  });
});
