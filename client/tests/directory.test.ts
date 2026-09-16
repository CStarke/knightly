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

    it('finds person by exact or partial email address', () => {
      const results = searchPeople('nvermeer@calvin.edu');
      assert.ok(results.length >= 1);
      assert.strictEqual(results[0].firstName, 'Naomi');

      const partialEmail = searchPeople('nvermeer');
      assert.ok(partialEmail.length >= 1);
      assert.strictEqual(partialEmail[0].lastName, 'Vermeer');
    });

    it('filters records by role correctly', () => {
      const faculty = people.filter((p) => p.role === 'Faculty');
      assert.ok(faculty.length >= 3);
      for (const f of faculty) {
        assert.strictEqual(f.role, 'Faculty');
        assert.ok(f.title.includes('Professor') || f.title.includes('Instructor') || f.title.includes('Dean'));
      }

      const students = people.filter((p) => p.role === 'Student');
      assert.ok(students.length >= 3);
      for (const s of students) {
        assert.strictEqual(s.role, 'Student');
        assert.ok(typeof s.classYear === 'number');
      }
    });

    it('searches across multiple tokens such as name and department', () => {
      const multiTokenSearch = (query: string) => {
        const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        return people.filter((p) => {
          const haystack = `${p.firstName} ${p.lastName} ${p.department} ${p.title} ${p.location} ${p.email}`.toLowerCase();
          return tokens.every((token) => haystack.includes(token));
        });
      };

      const csProf = multiTokenSearch('Naomi Computer Science');
      assert.ok(csProf.length >= 1);
      assert.strictEqual(csProf[0].lastName, 'Vermeer');

      const mismatch = multiTokenSearch('Naomi Nursing');
      assert.strictEqual(mismatch.length, 0);
    });
  });

  describe('Directory Data Invariants & Uniqueness', () => {
    it('ensures all person IDs are unique', () => {
      const ids = people.map((p) => p.id);
      const unique = new Set(ids);
      assert.strictEqual(ids.length, unique.size, 'All person IDs must be unique');
    });

    it('ensures all person email addresses are unique and lowercase', () => {
      const emails = people.map((p) => p.email);
      const unique = new Set(emails);
      assert.strictEqual(emails.length, unique.size, 'All person emails must be unique');

      for (const email of emails) {
        assert.strictEqual(email, email.toLowerCase(), `Email "${email}" must be lowercase`);
      }
    });

    it('ensures every person belongs to an officially registered department', () => {
      const deptSet = new Set(departments);
      for (const person of people) {
        assert.ok(
          deptSet.has(person.department),
          `Person ${person.firstName} ${person.lastName} has unregistered department "${person.department}"`
        );
      }
    });

    it('validates phone number formatting when phone is present', () => {
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      const peopleWithPhones = people.filter((p) => p.phone);
      assert.ok(peopleWithPhones.length > 0, 'Should have some people with phone numbers');

      for (const p of peopleWithPhones) {
        assert.match(p.phone!, phoneRegex, `Phone ${p.phone} for ${p.firstName} must match 616-526-XXXX format`);
      }
    });

    it('validates interests are non-empty strings when present', () => {
      const peopleWithInterests = people.filter((p) => p.interests);
      assert.ok(peopleWithInterests.length > 0, 'Should have people with interests');

      for (const p of peopleWithInterests) {
        assert.ok(p.interests!.length > 0);
        for (const interest of p.interests!) {
          assert.ok(interest.trim().length > 0, 'Interest string must not be empty');
        }
      }
    });
  });
});
