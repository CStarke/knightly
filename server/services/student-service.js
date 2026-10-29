/**
 * Student & FERPA Directory Business Logic Layer (BLL)
 *
 * ARCHITECTURAL RATIONALE:
 * Manages student academic identity, variable-length barcode formatting invariants,
 * and FERPA directory onboarding compliance.
 *
 * DOMAIN INVARIANTS:
 * 1. Variable-Length Student IDs: Calvin University student numbers historically range
 *    from 6, 7, 8, to 9+ digits. Barcode formatting handles any 5-16 numeric string safely.
 * 2. By default, students are NOT listed in the campus directory (`directory_opt_in = false`).
 * 3. On first sign-in, students are presented an onboarding dialog asking for directory consent.
 * 4. Students can selectively expose/hide email, phone, and residence hall.
 */

const defaultStudentDal = require('../dal/student-dal');
const defaultDirectoryDal = require('../dal/directory-dal');

/**
 * Formats a student ID into Calvin's standard physical card barcode format.
 * Format: 5 leading zeros + student ID + 2 trailing zeros.
 * Example: '2346052' (7 digits) -> '00000234605200'
 * Example: '23460528' (8 digits) -> '000002346052800'
 *
 * @param {string} studentId - Numeric student ID string (supports 5 to 16 digits)
 * @returns {string} Encoded barcode string
 */
function formatBarcode(studentId) {
  const cleanId = String(studentId || '').trim();
  if (!/^\d{5,16}$/.test(cleanId)) {
    throw new Error(`[student-service] Invalid student ID for barcode: expected 5-16 numeric digits, got "${studentId}"`);
  }
  return `00000${cleanId}00`;
}

/**
 * Validates and formats a student profile object for client consumption.
 *
 * @param {object} rawStudent - Database record from students table
 * @returns {object} Formatted student profile
 */
function formatStudentProfile(rawStudent) {
  if (!rawStudent) return null;

  const middle = rawStudent.middle_name ? ` ${rawStudent.middle_name} ` : ' ';
  const fullName = `${rawStudent.first_name}${middle}${rawStudent.last_name}`.replace(/\s+/g, ' ').trim();

  return {
    id: rawStudent.id,
    studentId: rawStudent.student_id,
    username: rawStudent.username,
    email: rawStudent.email,
    firstName: rawStudent.first_name,
    middleName: rawStudent.middle_name,
    lastName: rawStudent.last_name,
    fullName,
    classYear: rawStudent.class_year,
    standing: rawStudent.standing,
    major: rawStudent.major,
    minor: rawStudent.minor,
    cardNumber: rawStudent.card_number,
    barcode: rawStudent.barcode || formatBarcode(rawStudent.student_id),
    residence: rawStudent.residence,
    advisor: rawStudent.advisor,
    role: rawStudent.role,
    directoryOptIn: !!rawStudent.directory_opt_in,
    directoryPrompted: !!rawStudent.directory_prompted,
    directoryVisibleFields: rawStudent.directory_visible_fields || { email: true, phone: false, residence: false },
  };
}

/**
 * Handles the FERPA directory preference update and synchronizes the directory listing.
 *
 * @param {object} params
 * @param {string} params.studentId - Student UUID
 * @param {boolean} params.directoryOptIn - Consent status
 * @param {object} [params.directoryVisibleFields] - Visible fields configuration
 * @param {object} [studentDal=defaultStudentDal] - Injected student DAL
 * @param {object} [directoryDal=defaultDirectoryDal] - Injected directory DAL
 * @returns {Promise<object>} Updated student profile
 */
async function setDirectoryPreferences(
  params,
  studentDal = defaultStudentDal,
  directoryDal = defaultDirectoryDal
) {
  const { studentId, directoryOptIn, directoryVisibleFields } = params;

  // Step 1: Update student record and mark directory_prompted as TRUE
  const updatedStudent = await studentDal.updateDirectoryPreferences(studentId, {
    directoryOptIn,
    directoryVisibleFields: directoryVisibleFields || { email: true, phone: false, residence: false },
  });

  // Step 2: Synchronize directory table listing
  try {
    await directoryDal.syncStudentDirectoryListing(updatedStudent);
  } catch (err) {
    // Non-fatal warning if directory sync encounters issue
    console.warn(`[student-service] Directory sync notice: ${err.message}`);
  }

  return formatStudentProfile(updatedStudent);
}

module.exports = {
  formatBarcode,
  formatStudentProfile,
  setDirectoryPreferences,
};
