const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockDal } = require('../mocks/mock-dal');
const {
  formatBarcode,
  formatStudentProfile,
  setDirectoryPreferences,
} = require('../../services/student-service');

test('Student & FERPA Directory BLL Invariants', async (t) => {
  await t.test('formats card barcode with 5 leading and 2 trailing zeros supporting variable student ID lengths', () => {
    // 7-digit ID standard
    assert.equal(formatBarcode('2346052'), '00000234605200');
    assert.equal(formatBarcode('1234567'), '00000123456700');

    // 8-digit ID (newer enrollment eras)
    assert.equal(formatBarcode('23460528'), '000002346052800');

    // 6-digit ID (older enrollment eras)
    assert.equal(formatBarcode('123456'), '0000012345600');
  });

  await t.test('rejects non-numeric or malformed student IDs for barcode generation', () => {
    assert.throws(
      () => {
        formatBarcode('12'); // Too short (< 5 digits)
      },
      { message: /Invalid student ID for barcode/ }
    );

    assert.throws(
      () => {
        formatBarcode('ABC4567'); // Letters
      },
      { message: /Invalid student ID for barcode/ }
    );
  });

  await t.test('assembles student full name cleanly handling missing middle name', () => {
    const studentWithMiddle = {
      id: 'uuid-1',
      student_id: '2346052',
      username: 'jmd42',
      first_name: 'John',
      middle_name: 'Michael',
      last_name: 'Doe',
      class_year: 2026,
      standing: 'Junior',
      major: 'Computer Science',
      card_number: '2346052',
    };

    const formatted1 = formatStudentProfile(studentWithMiddle);
    assert.equal(formatted1.fullName, 'John Michael Doe');
    assert.equal(formatted1.barcode, '00000234605200');

    const studentWithoutMiddle = {
      ...studentWithMiddle,
      middle_name: null,
    };
    const formatted2 = formatStudentProfile(studentWithoutMiddle);
    assert.equal(formatted2.fullName, 'John Doe');
  });

  await t.test('updates FERPA directory preference and syncs directory listing', async () => {
    const { studentDal, directoryDal, state } = createMockDal();
    const studentId = 'uuid-ferpa-test';

    // Seed student unprompted and unlisted by default
    await studentDal.upsertStudent({
      id: studentId,
      student_id: '2346052',
      username: 'jmd42',
      email: 'jmd42@calvin.edu',
      first_name: 'John',
      last_name: 'Doe',
      standing: 'Junior',
      major: 'Computer Science',
      directory_opt_in: false,
      directory_prompted: false,
      directory_visible_fields: { email: true, phone: false, residence: false },
    });

    // Student opts in during first-login onboarding popup
    const updated = await setDirectoryPreferences(
      {
        studentId,
        directoryOptIn: true,
        directoryVisibleFields: { email: true, phone: true, residence: false },
      },
      studentDal,
      directoryDal
    );

    assert.equal(updated.directoryOptIn, true);
    assert.equal(updated.directoryPrompted, true);
    assert.equal(updated.directoryVisibleFields.phone, true);

    // Verify directory table synchronized
    assert.equal(state.directoryPeople.length, 1);
    assert.equal(state.directoryPeople[0].is_public_visible, true);
    assert.equal(state.directoryPeople[0].email, 'jmd42@calvin.edu');
  });
});
