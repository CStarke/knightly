import { describe, it } from 'node:test';
import assert from 'node:assert';
import { departments, people, type Person, type PersonRole } from '@/data/directory';

describe('Directory Domain', () => {
  describe('Departments', () => {
    it('contains core academic and administrative departments', () => {
      assert.ok(departments.includes('Computer Science'));
      assert.ok(departments.includes('Engineering'));
      assert.ok(departments.includes('Nursing'));
      assert.ok(departments.includes('Campus Safety'));
      assert.ok(departments.includes('Dining Services'));
    });

    it('has unique department entries without duplicates', () => {
      const uniqueDepts = new Set(departments);
      assert.strictEqual(uniqueDepts.size, departments.length);
    });
  });

  describe('People Records', () => {
    it('validates every person has required directory fields', () => {
      const validRoles: PersonRole[] = ['Student', 'Faculty', 'Staff'];

      for (const p of people) {
        assert.ok(p.id.length > 0, 'Person must have an ID');
        assert.ok(p.firstName.length > 0, 'Person must have first name');
        assert.ok(p.lastName.length > 0, 'Person must have last name');
        assert.ok(validRoles.includes(p.role), `Person role ${p.role} is invalid`);
        assert.ok(p.title.length > 0, 'Person must have title or major');
        assert.ok(p.department.length > 0, 'Person must belong to a department');
        assert.match(p.email, /@calvin\.edu$/, `Email ${p.email} must end with @calvin.edu`);
        assert.ok(p.location.length > 0, 'Person must have an office or dorm location');

        if (p.role === 'Student') {
          assert.ok(typeof p.classYear === 'number', 'Student should have class year');
          assert.ok(p.classYear! >= 2020 && p.classYear! <= 2035, 'Class year should be plausible');
        }
      }
    });

    it('contains representations of students, faculty, and staff', () => {
      const students = people.filter((p) => p.role === 'Student');
      const faculty = people.filter((p) => p.role === 'Faculty');
      const staff = people.filter((p) => p.role === 'Staff');

      assert.ok(students.length > 0, 'Must have students');
      assert.ok(faculty.length > 0, 'Must have faculty');
      assert.ok(staff.length > 0, 'Must have staff');
    });
  });

  describe('Search & Filter Logic', () => {
    function searchPeople(query: string): Person[] {
      const q = query.toLowerCase().trim();
      return people.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    it('finds person by partial first or last name', () => {
      const results = searchPeople('Naomi');
      assert.ok(results.length > 0);
      assert.ok(results.some((p) => p.lastName === 'Vermeer'));

      const byLast = searchPeople('Vermeer');
      assert.ok(byLast.length > 0);
      assert.strictEqual(byLast[0].firstName, 'Naomi');
    });

    it('filters people by department', () => {
      const csPeople = people.filter((p) => p.department === 'Computer Science');
      assert.ok(csPeople.length > 0);
      for (const p of csPeople) {
        assert.strictEqual(p.department, 'Computer Science');
      }
    });

    it('returns empty array when search query matches nobody', () => {
      const results = searchPeople('xyznonexistentstudent12345');
      assert.strictEqual(results.length, 0);
    });
  });
});
