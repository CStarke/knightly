/**
 * Formats a 7-digit Calvin student ID into the standard 14-digit barcode format:
 * 5 leading zeros + 7-digit student ID + 2 trailing zeros.
 *
 * Example: '2346052' -> '00000234605200'
 */
export function formatBarcode(studentId: string): string {
  const digits = studentId.replace(/\D/g, '').padStart(7, '0');
  return `00000${digits}00`;
}

/** The signed-in student. Hardcoded for the prototype. */
export const student = {
  id: '2346052',
  firstName: 'Caleb',
  lastName: 'Starkenburg',
  classYear: 2028,
  standing: 'Sophomore',
  major: 'Computer Science',
  minor: 'Mathematics',
  email: 'cjs42@calvin.edu',
  /** 7-digit student number printed on the Knight Card. */
  cardNumber: '2346052',
  /** 14-digit encoded barcode: 5 leading 0's, 7-digit student ID, 2 trailing 0's. */
  barcode: '00000234605200',
  residence: 'Boer-Bennink Hall, Rm 214',
  advisor: 'Dr. Naomi Vermeer',
} as const;

export const fullName = `${student.firstName} ${student.lastName}`;

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
