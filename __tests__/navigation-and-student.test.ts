import { describe, it } from 'node:test';
import assert from 'node:assert';
import { student, fullName, greeting, formatBarcode } from '@/data/student';
import { getTabHeader } from '@/constants/tab-headers';

describe('Student Profile & Navigation', () => {
  describe('Student Profile', () => {
    it('provides full name concatenation', () => {
      assert.strictEqual(fullName, `${student.firstName} ${student.lastName}`);
      assert.strictEqual(fullName, 'Caleb Starkenburg');
    });

    it('validates 7-digit student ID and cardNumber', () => {
      assert.strictEqual(student.id, '2346052');
      assert.strictEqual(student.cardNumber, '2346052');
      assert.match(student.cardNumber, /^\d{7}$/, 'Student number should be exactly 7 digits');
    });

    it('formats 14-digit barcode with 5 leading zeros and 2 trailing zeros', () => {
      assert.strictEqual(student.barcode, '00000234605200');
      assert.match(student.barcode, /^00000\d{7}00$/, 'Barcode must be 14 digits with 5 leading 0s and 2 trailing 0s');
      assert.strictEqual(formatBarcode('2346052'), '00000234605200');
      assert.strictEqual(formatBarcode('1234567'), '00000123456700');
    });

    it('contains Calvin academic status information', () => {
      assert.strictEqual(student.major, 'Computer Science');
      assert.strictEqual(student.standing, 'Sophomore');
      assert.strictEqual(student.classYear, 2028);
      assert.ok(student.email.endsWith('@calvin.edu'));
      assert.ok(student.residence.length > 0);
      assert.ok(student.advisor.length > 0);
    });

    it('generates appropriate time-of-day greetings', () => {
      // Midnight / early morning
      assert.strictEqual(greeting(new Date(2026, 8, 15, 0, 0)), 'Good morning');
      assert.strictEqual(greeting(new Date(2026, 8, 15, 11, 59)), 'Good morning');

      // Afternoon (12:00 PM to 4:59 PM)
      assert.strictEqual(greeting(new Date(2026, 8, 15, 12, 0)), 'Good afternoon');
      assert.strictEqual(greeting(new Date(2026, 8, 15, 16, 59)), 'Good afternoon');

      // Evening (5:00 PM to 11:59 PM)
      assert.strictEqual(greeting(new Date(2026, 8, 15, 17, 0)), 'Good evening');
      assert.strictEqual(greeting(new Date(2026, 8, 15, 23, 59)), 'Good evening');
    });
  });

  describe('Tab Headers Navigation Mapping', () => {
    it('returns Dining header metadata for /dining path', () => {
      const header = getTabHeader('/dining');
      assert.strictEqual(header.title, 'Dining');
      assert.strictEqual(header.subtitle, 'Campus dining & balances');
    });

    it('returns Campus Safety header metadata for /safety path', () => {
      const header = getTabHeader('/safety');
      assert.strictEqual(header.title, 'Campus Safety');
      assert.strictEqual(header.subtitle, '24/7 assistance & alerts');
    });

    it('returns Directory header metadata for /directory path', () => {
      const header = getTabHeader('/directory');
      assert.strictEqual(header.title, 'Directory');
      assert.strictEqual(header.subtitle, 'Search campus contacts');
    });

    it('defaults to Knightly header for root and index routes', () => {
      const rootHeader = getTabHeader('/');
      assert.strictEqual(rootHeader.title, 'Knightly');
      assert.strictEqual(rootHeader.subtitle, 'Campus community & feed');
      assert.ok(rootHeader.right !== undefined);

      const emptyHeader = getTabHeader('');
      assert.strictEqual(emptyHeader.title, 'Knightly');

      const tabsIndexHeader = getTabHeader('/(tabs)/');
      assert.strictEqual(tabsIndexHeader.title, 'Knightly');
    });
  });
});
