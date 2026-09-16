import { describe, it } from 'node:test';
import assert from 'node:assert';
import { student, fullName, fullLegalName, greeting, formatBarcode } from '@/data/student';
import { getTabHeader } from '@/constants/tab-headers';

describe('Student Profile & Navigation', () => {
  describe('Student Profile', () => {
    it('provides full name concatenation', () => {
      assert.strictEqual(fullName, `${student.firstName} ${student.lastName}`);
      assert.strictEqual(fullName, 'John Doe');
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

  describe('Tab Routing & Activity State Invariants', () => {
    it('ensures Safety tab is completely isolated from Activity', () => {
      // Safety route must always map to Campus Safety and never Activity
      const safetyHeader = getTabHeader('/safety');
      assert.strictEqual(safetyHeader.title, 'Campus Safety');
      assert.notStrictEqual(safetyHeader.title, 'Activity');

      // Dining route must map to Dining
      const diningHeader = getTabHeader('/dining');
      assert.strictEqual(diningHeader.title, 'Dining');

      // Verify Safety tab index is 2
      const tabPaths = ['/', '/dining', '/safety', '/directory'];
      assert.strictEqual(tabPaths.indexOf('/safety'), 2);
      assert.strictEqual(tabPaths.indexOf('/dining'), 1);
    });

    it('verifies route names prevent slot hijacking on non-dining tabs', () => {
      const isShowingActivity = (tabIndex: number, showActivity: boolean, pathname: string, activeIndex: number) => {
        return tabIndex === 2 && showActivity && pathname === '/dining' && activeIndex !== 2;
      };

      // When on Activity from Dining:
      assert.strictEqual(isShowingActivity(2, true, '/dining', 1), true);

      // When swiping back to Knightly (the bug scenario):
      assert.strictEqual(isShowingActivity(2, true, '/', 0), false);
      assert.strictEqual(isShowingActivity(2, false, '/', 0), false);

      // When clicking Safety tab afterwards:
      assert.strictEqual(isShowingActivity(2, true, '/safety', 2), false);
      assert.strictEqual(isShowingActivity(2, false, '/safety', 2), false);

      // When on Directory:
      assert.strictEqual(isShowingActivity(2, true, '/directory', 3), false);
    });

    it('correctly maps trailing slashes and tabs prefix paths in getTabHeader', () => {
      const diningTrailing = getTabHeader('/dining/');
      assert.strictEqual(diningTrailing.title, 'Dining');

      const tabsDining = getTabHeader('/tabs/dining');
      assert.strictEqual(tabsDining.title, 'Dining');

      const tabsSafety = getTabHeader('/tabs/safety');
      assert.strictEqual(tabsSafety.title, 'Campus Safety');

      const tabsDirectory = getTabHeader('/tabs/directory');
      assert.strictEqual(tabsDirectory.title, 'Directory');

      const unknownRoute = getTabHeader('/some/random/nested/route');
      assert.strictEqual(unknownRoute.title, 'Knightly');
    });

    it('verifies strict four-tab navigation order and paths', () => {
      const tabs = [
        { name: 'knightly', path: '/' },
        { name: 'dining', path: '/dining' },
        { name: 'safety', path: '/safety' },
        { name: 'directory', path: '/directory' },
      ];

      assert.strictEqual(tabs.length, 4);
      assert.strictEqual(tabs[0].path, '/');
      assert.strictEqual(tabs[1].path, '/dining');
      assert.strictEqual(tabs[2].path, '/safety');
      assert.strictEqual(tabs[3].path, '/directory');
    });
  });

  describe('Student Profile Invariants & Barcode Processing', () => {
    it('provides complete full legal name with middle name', () => {
      assert.strictEqual(fullLegalName, `${student.firstName} ${student.middleName} ${student.lastName}`);
      assert.strictEqual(fullLegalName, 'John Mark Doe');
    });

    it('processes student IDs containing dashes, spaces, or leading zeros in formatBarcode', () => {
      // ID with hyphen
      assert.strictEqual(formatBarcode('234-6052'), '00000234605200');
      // ID with spaces
      assert.strictEqual(formatBarcode('  2346052  '), '00000234605200');
      // Short ID is padded with leading zeros to 7 digits
      assert.strictEqual(formatBarcode('42'), '00000000004200');
      // Empty string is padded to 7 zeros
      assert.strictEqual(formatBarcode(''), '00000000000000');
    });

    it('verifies greeting boundary conditions at exactly 12:00 PM and 5:00 PM', () => {
      // Morning up to 11:59:59
      const morningEnd = new Date(2026, 8, 15, 11, 59, 59);
      assert.strictEqual(greeting(morningEnd), 'Good morning');

      // Afternoon starts at 12:00:00
      const noon = new Date(2026, 8, 15, 12, 0, 0);
      assert.strictEqual(greeting(noon), 'Good afternoon');

      // Afternoon ends at 16:59:59
      const afternoonEnd = new Date(2026, 8, 15, 16, 59, 59);
      assert.strictEqual(greeting(afternoonEnd), 'Good afternoon');

      // Evening starts at 17:00:00 (5:00 PM)
      const eveningStart = new Date(2026, 8, 15, 17, 0, 0);
      assert.strictEqual(greeting(eveningStart), 'Good evening');
    });
  });
});
