/** The signed-in student. Hardcoded for the prototype. */
export const student = {
  id: 'S-0942',
  firstName: 'Caleb',
  lastName: 'Starkenburg',
  classYear: 2028,
  standing: 'Sophomore',
  major: 'Computer Science',
  minor: 'Mathematics',
  email: 'cjs42@calvin.edu',
  /** Printed on the Knight Card and encoded in the barcode. */
  cardNumber: '6041078342',
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
