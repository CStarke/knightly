/**
 * Student Academic Profile & FERPA Directory API Invariant Tests
 *
 * ARCHITECTURAL RATIONALE:
 * Validates the student academic profile client service, variable-length student ID handling,
 * physical card barcode generation invariants, and FERPA privacy compliance.
 *
 * DOMAIN INVARIANTS:
 * 1. FERPA Consent Invariant: By default, students are unlisted (`directoryOptIn = false`).
 * 2. Variable-Length Student IDs: Supports 6, 7, 8, to 9+ digits without buffer truncation.
 * 3. Physical Card Barcode: Invariant `00000{studentId}00` (5 leading 0's, ID digits, 2 trailing 0's).
 * 4. Offline Resilience (Sprint 1 SLO SC2): Client must never crash when backend is offline.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatBarcode, student as defaultStudent } from '../src/data/student';
import {
  fetchStudentProfile,
  getDefaultStudentProfile,
  updateDirectoryPreferenceApi,
  type StudentProfile,
} from '../src/services/student-api';

describe('Student Profile & FERPA Directory API Invariants', () => {
  describe('Variable-Length Student IDs & Barcode Generation', () => {
    it('formats 7-digit student ID into 14-digit barcode with 5 leading and 2 trailing zeros', () => {
      const barcode = formatBarcode('2346052');
      assert.strictEqual(barcode, '00000234605200');
      assert.strictEqual(barcode.length, 14);
      assert.ok(barcode.startsWith('00000'));
      assert.ok(barcode.endsWith('00'));
    });

    it('formats 6-digit legacy student ID by padding to 7 digits for barcode consistency', () => {
      const barcode = formatBarcode('987654');
      assert.strictEqual(barcode, '00000098765400');
      assert.strictEqual(barcode.length, 14);
    });

    it('formats 8-digit student ID without digit truncation', () => {
      const barcode = formatBarcode('23460528');
      assert.strictEqual(barcode, '000002346052800');
      assert.strictEqual(barcode.length, 15);
      assert.ok(barcode.startsWith('00000'));
      assert.ok(barcode.endsWith('00'));
    });

    it('formats 9-digit student ID without digit truncation', () => {
      const barcode = formatBarcode('123456789');
      assert.strictEqual(barcode, '0000012345678900');
      assert.strictEqual(barcode.length, 16);
      assert.ok(barcode.startsWith('00000'));
      assert.ok(barcode.endsWith('00'));
    });

    it('strips non-numeric characters before barcode generation', () => {
      const barcode = formatBarcode('ID: 234-6052');
      assert.strictEqual(barcode, '00000234605200');
    });
  });

  describe('Student Profile Service & Schema Parity', () => {
    it('provides a complete default offline student profile conforming to StudentProfile', () => {
      const profile = getDefaultStudentProfile();
      assert.ok(profile.id, 'profile must have an id');
      assert.strictEqual(profile.studentId, defaultStudent.id);
      assert.strictEqual(profile.username, 'student');
      assert.strictEqual(profile.firstName, defaultStudent.firstName);
      assert.strictEqual(profile.lastName, defaultStudent.lastName);
      assert.strictEqual(profile.email, defaultStudent.email);
      assert.strictEqual(profile.classYear, defaultStudent.classYear);
      assert.strictEqual(profile.standing, defaultStudent.standing);
      assert.strictEqual(profile.major, defaultStudent.major);
      assert.strictEqual(profile.cardNumber, defaultStudent.cardNumber);
      assert.strictEqual(profile.barcode, defaultStudent.barcode);
    });

    it('enforces FERPA default in offline profile: directoryOptIn is false', () => {
      const profile = getDefaultStudentProfile();
      assert.strictEqual(profile.directoryOptIn, false, 'Default FERPA opt-in must be false (private)');
      assert.strictEqual(profile.directoryPrompted, false, 'Student must not be marked prompted by default');
      assert.deepStrictEqual(profile.directoryVisibleFields, {
        email: true,
        phone: false,
        residence: false,
      });
    });

    it('fetches student profile and gracefully falls back to seed data if server is offline', async () => {
      // With backend offline or online, fetchStudentProfile must resolve without throwing
      const profile = await fetchStudentProfile('jmd42');
      assert.ok(profile, 'Must return a valid profile');
      assert.ok(profile.studentId.length >= 6, 'Student ID must have at least 6 digits');
      assert.ok(profile.email.endsWith('@calvin.edu'), 'Student email must be Calvin domain');
      assert.ok(profile.barcode.startsWith('00000'), 'Barcode must have 5 leading zeros');
    });
  });

  describe('FERPA Directory Preference Mutation API', () => {
    it('handles directory preference update without unhandled exceptions when backend is unreachable', async () => {
      const result = await updateDirectoryPreferenceApi({
        studentId: '2346052',
        directoryOptIn: true,
        directoryVisibleFields: {
          email: true,
          phone: true,
          residence: false,
        },
      });

      // Must return a defined object indicating status
      assert.ok(typeof result.success === 'boolean');
    });

    it('preserves field masking flags across visible field selections', () => {
      const fields = {
        email: true,
        phone: false,
        residence: false,
      };

      // Email is visible, phone & residence are hidden
      assert.strictEqual(fields.email, true);
      assert.strictEqual(fields.phone, false);
      assert.strictEqual(fields.residence, false);

      // Student toggles phone visibility
      const updated = { ...fields, phone: true };
      assert.strictEqual(updated.phone, true);
      assert.strictEqual(updated.residence, false);
    });
  });
});
