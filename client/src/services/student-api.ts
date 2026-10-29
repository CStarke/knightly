/**
 * Student Academic Profile & FERPA Directory API Service
 *
 * ARCHITECTURAL RATIONALE:
 * Provides client-side interface to the server's Student & Directory endpoints (`/api/student`),
 * retrieving academic credentials, meal plan subscriptions, and managing FERPA privacy consent.
 *
 * OFFLINE RESILIENCE & SPRINT 1 SLO (SC2):
 * Knightly must NEVER crash when the backend server is offline or unavailable.
 * All network calls are wrapped in strict try/catch with 2.5-second abort timeouts,
 * falling back gracefully to the isolated student persona (`student` from `@/data/student`).
 *
 * DOMAIN INVARIANTS:
 * 1. FERPA Privacy Invariant: By default, students are unlisted (`directoryOptIn = false`).
 * 2. Variable-Length Student IDs: Supports 6, 7, 8, to 9+ digits without truncation.
 * 3. Physical Card Barcode: Invariant `00000{studentId}00` (5 leading 0's, ID, 2 trailing 0's).
 */

import { student as defaultStudent, formatBarcode } from '@/data/student';
import { API_BASE_URL } from '@/services/api-config';
import type { DirectoryVisibleFields } from '@/components/directory-onboarding-modal';

export interface StudentProfile {
  id: string;
  studentId: string;
  username: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  classYear: number;
  standing: string;
  major: string;
  minor?: string;
  cardNumber: string;
  barcode: string;
  residence?: string;
  advisor?: string;
  role?: string;
  directoryOptIn: boolean;
  directoryPrompted: boolean;
  directoryVisibleFields: DirectoryVisibleFields;
}

export interface UpdateDirectoryPreferenceParams {
  studentId: string;
  directoryOptIn: boolean;
  directoryVisibleFields: DirectoryVisibleFields;
}

export interface UpdateDirectoryResult {
  success: boolean;
  student?: StudentProfile;
  error?: string;
}

/**
 * Returns default offline student profile from isolated seed data.
 * Guarantees zero crashes when network is unreachable (Sprint 1 SLO SC2).
 */
export function getDefaultStudentProfile(): StudentProfile {
  const middle = defaultStudent.middleName ? ` ${defaultStudent.middleName} ` : ' ';
  const fullName = `${defaultStudent.firstName}${middle}${defaultStudent.lastName}`.replace(/\s+/g, ' ').trim();

  return {
    id: defaultStudent.id,
    studentId: defaultStudent.id,
    username: 'student',
    email: defaultStudent.email,
    firstName: defaultStudent.firstName,
    middleName: defaultStudent.middleName,
    lastName: defaultStudent.lastName,
    fullName,
    classYear: defaultStudent.classYear,
    standing: defaultStudent.standing,
    major: defaultStudent.major,
    minor: defaultStudent.minor,
    cardNumber: defaultStudent.cardNumber,
    barcode: defaultStudent.barcode,
    residence: defaultStudent.residence,
    advisor: defaultStudent.advisor,
    role: 'student',
    directoryOptIn: false,
    directoryPrompted: false,
    directoryVisibleFields: { email: true, phone: false, residence: false },
  };
}

/**
 * Fetches the authenticated student's academic profile from Supabase via backend API.
 * Falls back cleanly to isolated offline student profile if unreachable.
 *
 * @param username - Optional Calvin username (defaults to active user or 'jmd42')
 * @returns StudentProfile object
 */
export async function fetchStudentProfile(username?: string): Promise<StudentProfile> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const queryParams = new URLSearchParams();
    if (username) {
      queryParams.set('username', username);
    }

    const url = `${API_BASE_URL}/student${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.studentId || data.id)) {
        return {
          id: data.id || defaultStudent.id,
          // Disambiguate human-readable student ID number from internal database UUID
          studentId:
            data.studentId ||
            (data.id && !data.id.includes('-') ? data.id : defaultStudent.id),
          username: data.username || username || 'jmd42',
          email: data.email || defaultStudent.email,
          firstName: data.firstName || (data.name ? data.name.split(' ')[0] : defaultStudent.firstName),
          middleName: data.middleName || undefined,
          lastName: data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : defaultStudent.lastName),
          fullName: data.fullName || data.name || `${defaultStudent.firstName} ${defaultStudent.lastName}`,
          classYear: typeof data.classYear === 'number' ? data.classYear : defaultStudent.classYear,
          standing: data.standing || (typeof data.classYear === 'string' ? data.classYear : defaultStudent.standing),
          major: data.major || defaultStudent.major,
          minor: data.minor || defaultStudent.minor,
          cardNumber: data.cardNumber || defaultStudent.cardNumber,
          barcode: data.barcode || formatBarcode(data.studentId || defaultStudent.id),
          residence: data.residence || data.residenceHall || defaultStudent.residence,
          advisor: data.advisor || defaultStudent.advisor,
          role: data.role || 'student',
          directoryOptIn: !!data.directoryOptIn,
          directoryPrompted: !!data.directoryPrompted,
          directoryVisibleFields: data.directoryVisibleFields || { email: true, phone: false, residence: false },
        };
      }
    }
  } catch {
    // Backend offline / network unreachable: fall through to offline fallback
  }

  // ISOLATED HARDCODED FALLBACK (Required by Sprint 1 SLO SC2)
  return getDefaultStudentProfile();
}

/**
 * Updates a student's FERPA directory preference and field visibility.
 * Synchronizes with Supabase `students` and `directory_people` tables.
 *
 * @param params - studentId, directoryOptIn, and visible fields
 * @returns Result object with updated profile or optimistic offline confirmation
 */
export async function updateDirectoryPreferenceApi(
  params: UpdateDirectoryPreferenceParams
): Promise<UpdateDirectoryResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${API_BASE_URL}/student/directory-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        student: data as StudentProfile,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    // Offline resilience: allow local consent transition so the student is never trapped in a modal
    return {
      success: true,
      error: err?.message,
    };
  }
}
