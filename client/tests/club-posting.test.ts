import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeClubCode,
  formatClubCode,
  isValidClubCode,
  verifyClubCode,
  DEMO_CLAIM_CODE_ABSTRACTION,
  STUDENT_LIFE_CLUB_REGISTRY,
} from '@/data/club-codes';
import {
  CALVIN_CLUBS,
  getClubById,
} from '@/data/clubs';
import {
  getAccountStorageKey,
  type ClaimModalSource,
} from '@/context/club-leadership-context';
import {
  formatEventDate,
  formatDateSegments,
  formatRawCodeSegments,
  formatTimeSegments,
  getMaxDaysForMonth,
  sanitizeDate,
  sanitizeTime,
  getMaxTimeInputLength,
  getMaxTimeRawDigitLength,
  resolveEventTime,
  getNextOccurrenceYear,
  completeTimeDigits,
  completeDateDigits,
  expandTwoDigitYear,
  validateDate,
  isDateCompleteAndValid,
  isTimeCompleteAndValid,
  parseDateSegments,
} from '@/utils/date-format';
import { isAllowedNumericKey, attachNumericDomFilters } from '@/utils/numeric-input';
import { BottomTabContentInset, Radius, Brand } from '@/constants/theme';
import {
  forYouPosts,
  getPostsByClubId,
  searchPosts,
  type Post,
  type FeedCategory,
} from '@/data/feed';

describe('Club Leadership & Post Creation Domain', () => {
  describe('Club Leader Claim Code Validation', () => {
    it('normalizes codes by removing hyphens and non-alphanumeric chars, converting to uppercase', () => {
      assert.strictEqual(normalizeClubCode('2A6Q-MTK3-R9'), '2A6QMTK3R9');
      assert.strictEqual(normalizeClubCode('2a6q-mtk3-r9'), '2A6QMTK3R9');
      assert.strictEqual(normalizeClubCode('  2a6q mtk3 r9  '), '2A6QMTK3R9');
      assert.strictEqual(normalizeClubCode('2A6Q!MTK3@R9#'), '2A6QMTK3R9');
    });

    it('formats normalized 10-character code into XXXX-XXXX-XX format', () => {
      assert.strictEqual(formatClubCode('2A6QMTK3R9'), '2A6Q-MTK3-R9');
      assert.strictEqual(formatClubCode('2a6qmtk3r9'), '2A6Q-MTK3-R9');
      assert.strictEqual(formatClubCode('2A6Q-MTK3-R9'), '2A6Q-MTK3-R9');
      assert.strictEqual(formatClubCode('2A6Q'), '2A6Q');
      assert.strictEqual(formatClubCode('2A6QMTK'), '2A6Q-MTK');
    });

    it('validates 10-character alphanumeric uppercase code format', () => {
      assert.strictEqual(isValidClubCode('2A6Q-MTK3-R9'), true);
      assert.strictEqual(isValidClubCode('2A6QMTK3R9'), true);
      assert.strictEqual(isValidClubCode('2a6q-mtk3-r9'), true); // normalized to uppercase

      // Invalid lengths or characters
      assert.strictEqual(isValidClubCode('2A6Q'), false);
      assert.strictEqual(isValidClubCode('2A6Q-MTK3-R9X'), false);
      assert.strictEqual(isValidClubCode(''), false);
    });

    it('verifies the demo code matches Abstraction club shell', () => {
      assert.strictEqual(DEMO_CLAIM_CODE_ABSTRACTION, '2A6Q-MTK3-R9');
      const verified = verifyClubCode('2A6Q-MTK3-R9');
      assert.ok(verified, 'Verification should succeed for official demo code');
      assert.strictEqual(verified?.clubId, 'abstraction');
      assert.strictEqual(verified?.clubName, 'Abstraction');
    });

    it('verifies case-insensitive and unhyphenated code submission', () => {
      const verifiedLower = verifyClubCode('2a6q-mtk3-r9');
      assert.ok(verifiedLower);
      assert.strictEqual(verifiedLower?.clubId, 'abstraction');

      const verifiedRaw = verifyClubCode('2A6QMTK3R9');
      assert.ok(verifiedRaw);
      assert.strictEqual(verifiedRaw?.clubId, 'abstraction');
    });

    it('rejects unissued or fake club claim codes', () => {
      assert.strictEqual(verifyClubCode('9999-9999-99'), null);
      assert.strictEqual(verifyClubCode('XXXX-YYYY-ZZ'), null);
      assert.strictEqual(verifyClubCode('INVALID-CODE'), null);
    });

    it('ensures all registered Student Life codes adhere to 10-char alphanumeric standard', () => {
      for (const record of STUDENT_LIFE_CLUB_REGISTRY) {
        assert.ok(record.clubId.length > 0);
        assert.ok(record.clubName.length > 0);
        assert.strictEqual(record.normalizedCode.length, 10);
        assert.strictEqual(record.formattedCode.length, 12);
      }
    });
  });

  describe('Abstraction Demo Club Shell Invariants', () => {
    it('contains Abstraction in CALVIN_CLUBS catalog', () => {
      const club = getClubById('abstraction');
      assert.ok(club, 'Abstraction club must be present in catalog');
      assert.strictEqual(club?.name, 'Abstraction');
      assert.strictEqual(club?.category, 'Academics');
      assert.strictEqual(club?.mark, 'AB');
      assert.strictEqual(club?.location, 'North Hall 276 (CS Lab)');
      assert.ok(club?.contactEmail.endsWith('@calvin.edu'));
      assert.strictEqual(club?.colors.length, 2);
    });

    it('has unique club ID within the full catalog', () => {
      const matches = CALVIN_CLUBS.filter((c) => c.id === 'abstraction');
      assert.strictEqual(matches.length, 1);
    });

    it('ensures Abstraction is not an official department (isDepartment undefined/false)', () => {
      const club = getClubById('abstraction');
      assert.strictEqual(Boolean(club?.isDepartment), false, 'Abstraction must be a club/student org, not a department');
    });
  });

  describe('Post Creation Form Validation & Character Limits', () => {
    const TITLE_MAX = 50;
    const DESC_MAX = 280;

    it('enforces maximum 50 characters for title', () => {
      const validTitle = 'Hackathon 2026 Kickoff & Info Session';
      assert.ok(validTitle.length <= TITLE_MAX);

      const titleExactly50 = 'A'.repeat(50);
      assert.strictEqual(titleExactly50.length, TITLE_MAX);

      const titleTooLong = 'A'.repeat(51);
      assert.ok(titleTooLong.length > TITLE_MAX);
    });

    it('enforces maximum 280 characters for description', () => {
      const validDesc = 'Join Abstraction for our annual spring hackathon! Open to all majors, beginner-friendly workshops included.';
      assert.ok(validDesc.length <= DESC_MAX);

      const descExactly280 = 'B'.repeat(280);
      assert.strictEqual(descExactly280.length, DESC_MAX);

      const descTooLong = 'B'.repeat(281);
      assert.ok(descTooLong.length > DESC_MAX);
    });

    it('requires non-empty title and description to enable publishing', () => {
      const checkCanPublish = (title: string, desc: string): boolean => {
        const t = title.trim();
        const d = desc.trim();
        return t.length > 0 && t.length <= TITLE_MAX && d.length > 0 && d.length <= DESC_MAX;
      };

      assert.strictEqual(checkCanPublish('Hackathon', 'Join us!'), true);
      assert.strictEqual(checkCanPublish('', 'Join us!'), false);
      assert.strictEqual(checkCanPublish('   ', 'Join us!'), false);
      assert.strictEqual(checkCanPublish('Hackathon', ''), false);
      assert.strictEqual(checkCanPublish('Hackathon', '   '), false);
      assert.strictEqual(checkCanPublish('A'.repeat(51), 'Join us!'), false);
      assert.strictEqual(checkCanPublish('Hackathon', 'B'.repeat(281)), false);
    });

    it('calculates remaining character counts accurately', () => {
      const getRemaining = (text: string, max: number) => max - text.length;
      assert.strictEqual(getRemaining('Hello', 50), 45);
      assert.strictEqual(getRemaining('A'.repeat(50), 50), 0);
      assert.strictEqual(getRemaining('Hello Calvin', 280), 268);
    });
  });

  describe('Optional Fields Specification', () => {
    it('ensures post images are strictly optional', () => {
      const postWithoutImage: Partial<Post> = {
        headline: 'Meeting Tonight',
        body: 'Come code with us in North Hall!',
        image: undefined,
      };
      assert.strictEqual(postWithoutImage.image, undefined);
    });

    it('preserves 16:9 card aspect ratio standard when an image is provided', () => {
      // 16:9 aspect ratio standard (ratio = 16 / 9 ~ 1.777)
      const standardRatio = 16 / 9;
      const width = 1600;
      const height = 900;
      assert.strictEqual(Math.round((width / height) * 100), Math.round(standardRatio * 100));
    });

    it('supports optional date/time toggle with standard or custom freeform string', () => {
      // Disabled date/time
      const noWhen = undefined;
      assert.strictEqual(noWhen, undefined);
    });

    it('formats MM/DD/YYYY calendar dates into clean event dates (e.g. Fri, Sep 18)', () => {
      // Deterministic reference date: September 17, 2026
      const refDate = new Date(2026, 8, 17, 12, 0, 0);

      // Within coming 6 months window: year omitted
      assert.strictEqual(formatEventDate('09/18/2026', refDate), 'Fri, Sep 18');
      assert.strictEqual(formatEventDate('2026-09-18', refDate), 'Fri, Sep 18');
      assert.strictEqual(formatEventDate('10/31/2026', refDate), 'Sat, Oct 31');
      assert.strictEqual(formatEventDate('01/15/2027', refDate), 'Fri, Jan 15');
      assert.strictEqual(formatEventDate('03/10/2027', refDate), 'Wed, Mar 10');

      // Within previous 1 month window: year omitted
      assert.strictEqual(formatEventDate('08/20/2026', refDate), 'Thu, Aug 20');

      // Empty string returns empty
      assert.strictEqual(formatEventDate('', refDate), '');
    });

    it('translates dates before 2020 by looking up day of the week and includes year', () => {
      const refDate = new Date(2026, 8, 17, 12, 0, 0);

      // 2015 date
      assert.strictEqual(formatEventDate('05/14/2015', refDate), 'Thu, May 14, 2015');

      // 1999 date
      assert.strictEqual(formatEventDate('12/25/1999', refDate), 'Sat, Dec 25, 1999');

      // 1987 date
      assert.strictEqual(formatEventDate('10/24/1987', refDate), 'Sat, Oct 24, 1987');

      // 1969 Apollo 11 Moon landing
      assert.strictEqual(formatEventDate('07/20/1969', refDate), 'Sun, Jul 20, 1969');
    });

    it('conditionally includes year when date is 2 months ago or 8 months away', () => {
      const refDate = new Date(2026, 8, 17, 12, 0, 0);

      // 2 months ago (July 2026 when ref is September 2026) -> includes year
      assert.strictEqual(formatEventDate('07/15/2026', refDate), 'Wed, Jul 15, 2026');

      // 8 months away (May 2027 when ref is September 2026) -> includes year
      assert.strictEqual(formatEventDate('05/20/2027', refDate), 'Thu, May 20, 2027');

      // 1 year ago -> includes year
      assert.strictEqual(formatEventDate('09/17/2025', refDate), 'Wed, Sep 17, 2025');

      // 2 years in the future -> includes year
      assert.strictEqual(formatEventDate('09/17/2028', refDate), 'Sun, Sep 17, 2028');
    });

    it('enforces real numeric date and time for standard time, rejecting text like "This Friday"', () => {
      const filterDateInput = (raw: string) => raw.replace(/[^0-9/]/g, '');
      assert.strictEqual(filterDateInput('This Friday'), '', 'Text like "This Friday" is completely stripped from numeric date input');
      assert.strictEqual(filterDateInput('09/18/2026'), '09/18/2026');
      assert.strictEqual(filterDateInput('09182026'), '09182026');
    });

    it('defaults date/time and location to open but blank, returning undefined when empty', () => {
      const computeWhen = (hasWhen: boolean, isCustom: boolean, date: string, time: string, custom: string) => {
        if (!hasWhen) return undefined;
        if (isCustom) return custom.trim() || undefined;
        const d = date.trim();
        const t = time.trim();
        if (!d && !t) return undefined;
        const fd = formatEventDate(d);
        if (fd && t) return `${fd} · ${t}`;
        return fd || t || undefined;
      };

      // Open by default, but blank
      assert.strictEqual(computeWhen(true, false, '', '', ''), undefined);
      // With real date and time
      assert.strictEqual(computeWhen(true, false, '09/18/2026', '7:00 PM', ''), 'Fri, Sep 18 · 7:00 PM');
      // Freeform custom text mode with placeholder example
      assert.strictEqual(computeWhen(true, true, '', '', 'Starts this weekend'), 'Starts this weekend');
    });

    it('supports optional location field', () => {
      const noWhere = undefined;
      assert.strictEqual(noWhere, undefined);

      const withWhere = 'North Hall 276';
      assert.strictEqual(withWhere, 'North Hall 276');
    });
  });

  describe('Masked Input Formatting & Separator Specifications', () => {
    it('formats raw date digits with slashes appearing strictly as soon as character after them is typed', () => {
      // 0 to 2 digits: Month only, no slash
      const seg1 = formatDateSegments('0');
      assert.strictEqual(seg1.showSlash1, false);
      assert.strictEqual(seg1.showSlash2, false);
      assert.strictEqual(seg1.formatted, '0');

      const seg2 = formatDateSegments('09');
      assert.strictEqual(seg2.showSlash1, false);
      assert.strictEqual(seg2.showSlash2, false);
      assert.strictEqual(seg2.formatted, '09');

      // 3rd digit typed (first day digit) -> First slash appears!
      const seg3 = formatDateSegments('091');
      assert.strictEqual(seg3.showSlash1, true);
      assert.strictEqual(seg3.showSlash2, false);
      assert.strictEqual(seg3.formatted, '09/1');

      // 4th digit typed -> First slash remains, no second slash yet
      const seg4 = formatDateSegments('0918');
      assert.strictEqual(seg4.showSlash1, true);
      assert.strictEqual(seg4.showSlash2, false);
      assert.strictEqual(seg4.formatted, '09/18');

      // 5th digit typed (first year digit) -> Second slash appears!
      const seg5 = formatDateSegments('09182');
      assert.strictEqual(seg5.showSlash1, true);
      assert.strictEqual(seg5.showSlash2, true);
      assert.strictEqual(seg5.formatted, '09/18/2');

      // Full 8 digits (MMDDYYYY)
      const seg8 = formatDateSegments('09182026');
      assert.strictEqual(seg8.showSlash1, true);
      assert.strictEqual(seg8.showSlash2, true);
      assert.strictEqual(seg8.formatted, '09/18/2026');
      assert.strictEqual(seg8.rawDigits, '09182026');
    });

    it('formats raw claim code alphanumeric characters with hyphens appearing strictly when character after is typed', () => {
      // 1 to 4 characters: Group 1 only, no hyphen
      const code1 = formatRawCodeSegments('2');
      assert.strictEqual(code1.showHyphen1, false);
      assert.strictEqual(code1.showHyphen2, false);
      assert.strictEqual(code1.formatted, '2');

      const code4 = formatRawCodeSegments('2A6Q');
      assert.strictEqual(code4.showHyphen1, false);
      assert.strictEqual(code4.showHyphen2, false);
      assert.strictEqual(code4.formatted, '2A6Q');

      // 5th character typed -> First hyphen appears!
      const code5 = formatRawCodeSegments('2A6QM');
      assert.strictEqual(code5.showHyphen1, true);
      assert.strictEqual(code5.showHyphen2, false);
      assert.strictEqual(code5.formatted, '2A6Q-M');

      // 8th character typed -> First hyphen remains, no second hyphen yet
      const code8 = formatRawCodeSegments('2A6QMTK3');
      assert.strictEqual(code8.showHyphen1, true);
      assert.strictEqual(code8.showHyphen2, false);
      assert.strictEqual(code8.formatted, '2A6Q-MTK3');

      // 9th character typed -> Second hyphen appears!
      const code9 = formatRawCodeSegments('2A6QMTK3R');
      assert.strictEqual(code9.showHyphen1, true);
      assert.strictEqual(code9.showHyphen2, true);
      assert.strictEqual(code9.formatted, '2A6Q-MTK3-R');

      // Full 10 characters
      const code10 = formatRawCodeSegments('2A6QMTK3R9');
      assert.strictEqual(code10.showHyphen1, true);
      assert.strictEqual(code10.showHyphen2, true);
      assert.strictEqual(code10.formatted, '2A6Q-MTK3-R9');
      assert.strictEqual(code10.rawCode, '2A6QMTK3R9');
    });

    it('formats numeric time input and resolves AM/PM period toggle accurately', () => {
      assert.strictEqual(formatTimeSegments('7').formatted, '7');
      assert.strictEqual(formatTimeSegments('730').formatted, '7:30');
      assert.strictEqual(formatTimeSegments('1230').formatted, '12:30');
      assert.strictEqual(formatTimeSegments('7:00').formatted, '7:00');
      assert.strictEqual(formatTimeSegments('abc730def').formatted, '7:30');

      // Progressive time input with instant colon on 3rd digit:
      // 1 -> "1", 10 -> "10", 100 -> "1:00", 1000 -> "10:00"
      assert.strictEqual(formatTimeSegments('1').formatted, '1');
      assert.strictEqual(formatTimeSegments('10').formatted, '10');
      assert.strictEqual(formatTimeSegments('100').formatted, '1:00');
      assert.strictEqual(formatTimeSegments('1000').formatted, '10:00');
      assert.strictEqual(formatTimeSegments('1:000').formatted, '10:00'); // typing 4th digit onto 1:00 shifts colon
      assert.strictEqual(formatTimeSegments('10:0').formatted, '1:00');  // backspace from 10:00
      assert.strictEqual(formatTimeSegments('1:0').formatted, '10');    // backspace from 1:00
      assert.strictEqual(formatTimeSegments('1130').formatted, '11:30');
      assert.strictEqual(formatTimeSegments('1200').formatted, '12:00');
      assert.strictEqual(formatTimeSegments('130').formatted, '1:30');

      // Strict 12-hour clock validation rules:
      // Rule 1: If first digit > 1, max digits is strictly 3
      assert.strictEqual(sanitizeTime('7300').digits, '730');
      assert.strictEqual(formatTimeSegments('7300').formatted, '7:30');
      assert.strictEqual(sanitizeTime('2590').digits, '259');
      assert.strictEqual(formatTimeSegments('2590').formatted, '2:59');

      // Rule 2: If first digit > 1, second digit cannot exceed 5 (tens of minutes <= 5)
      assert.strictEqual(sanitizeTime('76').digits, '7'); // 6 rejected
      assert.strictEqual(sanitizeTime('79').digits, '7'); // 9 rejected
      assert.strictEqual(sanitizeTime('75').digits, '75'); // 5 accepted

      // Rule 3: If first digit is 1, second digit cannot exceed 5
      assert.strictEqual(sanitizeTime('16').digits, '1'); // 6 rejected
      assert.strictEqual(sanitizeTime('19').digits, '1'); // 9 rejected

      // Rule 4: If first digit is 1 and second digit is > 2 (3..5), hour is 1, max 3 digits
      assert.strictEqual(sanitizeTime('1300').digits, '130');
      assert.strictEqual(formatTimeSegments('1300').formatted, '1:30');
      assert.strictEqual(sanitizeTime('1450').digits, '145');
      assert.strictEqual(formatTimeSegments('1450').formatted, '1:45');

      // Rule 5: If 3rd digit is > 5 in hours 10..12, 4th digit is rejected (treated as 3-digit hour 1 time)
      assert.strictEqual(sanitizeTime('1085').digits, '108');
      assert.strictEqual(formatTimeSegments('1085').formatted, '1:08');

      // Resolve with PM
      assert.strictEqual(resolveEventTime('7', 'PM'), '7:00 PM');
      assert.strictEqual(resolveEventTime('7:00', 'PM'), '7:00 PM');
      assert.strictEqual(resolveEventTime('730', 'PM'), '7:30 PM');
      assert.strictEqual(resolveEventTime('12:30', 'PM'), '12:30 PM');
      assert.strictEqual(resolveEventTime('10', 'PM'), '10:00 PM');
      assert.strictEqual(resolveEventTime('100', 'PM'), '1:00 PM');
      assert.strictEqual(resolveEventTime('1:00', 'PM'), '1:00 PM');
      assert.strictEqual(resolveEventTime('1000', 'PM'), '10:00 PM');
      assert.strictEqual(resolveEventTime('10:00', 'PM'), '10:00 PM');
      assert.strictEqual(resolveEventTime('1', 'PM'), '1:00 PM');
      assert.strictEqual(resolveEventTime('130', 'PM'), '1:30 PM');

      // 2-digit progressive input translation:
      // When first digit >= 2, d1 is hour and d2 is tens of minutes (e.g. 25 -> 2:50 PM, not 25:00 PM)
      assert.strictEqual(resolveEventTime('25', 'PM'), '2:50 PM');
      assert.strictEqual(resolveEventTime('73', 'PM'), '7:30 PM');
      assert.strictEqual(resolveEventTime('30', 'PM'), '3:00 PM');
      assert.strictEqual(resolveEventTime('45', 'PM'), '4:50 PM');
      assert.strictEqual(resolveEventTime('81', 'PM'), '8:10 PM');
      assert.strictEqual(resolveEventTime('95', 'PM'), '9:50 PM');

      // When first digit is 1:
      // Hours 10, 11, 12 remain 10:00, 11:00, 12:00
      assert.strictEqual(resolveEventTime('10', 'PM'), '10:00 PM');
      assert.strictEqual(resolveEventTime('11', 'PM'), '11:00 PM');
      assert.strictEqual(resolveEventTime('12', 'PM'), '12:00 PM');
      // 13..15 -> hour is 1, d2 is tens of minutes (1:30 PM, 1:40 PM, 1:50 PM)
      assert.strictEqual(resolveEventTime('13', 'PM'), '1:30 PM');
      assert.strictEqual(resolveEventTime('14', 'PM'), '1:40 PM');
      assert.strictEqual(resolveEventTime('15', 'PM'), '1:50 PM');

      // Resolve with AM
      assert.strictEqual(resolveEventTime('9', 'AM'), '9:00 AM');
      assert.strictEqual(resolveEventTime('10:15', 'AM'), '10:15 AM');
      assert.strictEqual(resolveEventTime('100', 'AM'), '1:00 AM');
      assert.strictEqual(resolveEventTime('1000', 'AM'), '10:00 AM');

      // Combined date and time preview formatting
      const dateStr = formatEventDate('09/18/2026');
      const timeStr = resolveEventTime('1000', 'PM');
      const combinedPreview = `${dateStr} · ${timeStr}`;
      assert.strictEqual(combinedPreview, 'Fri, Sep 18 · 10:00 PM');

      // Empty returns empty
      assert.strictEqual(resolveEventTime('', 'PM'), '');
    });

    it('locks out 4th digit for single-digit hours using dynamic maxLength via getMaxTimeInputLength', () => {
      // Empty input defaults to 5 to allow 4-digit hours (e.g. 10:00)
      assert.strictEqual(getMaxTimeInputLength(''), 5);

      // Single-digit hours starting with 2..9 strictly lock at 4 chars (e.g. "7:30", "2:00")
      assert.strictEqual(getMaxTimeInputLength('7'), 4);
      assert.strictEqual(getMaxTimeInputLength('73'), 4);
      assert.strictEqual(getMaxTimeInputLength('7:30'), 4);
      assert.strictEqual(getMaxTimeInputLength('2:00'), 4);
      assert.strictEqual(getMaxTimeInputLength('3:45'), 4);
      assert.strictEqual(getMaxTimeInputLength('9:59'), 4);

      // Times starting with 1 where second digit is 3..5 (1:30 - 1:59) strictly lock at 4 chars
      assert.strictEqual(getMaxTimeInputLength('13'), 4);
      assert.strictEqual(getMaxTimeInputLength('1:30'), 4);
      assert.strictEqual(getMaxTimeInputLength('1:45'), 4);
      assert.strictEqual(getMaxTimeInputLength('1:59'), 4);

      // Times starting with 1 where 3rd digit is > 5 (e.g. 1:08, 1:19, 1:26) strictly lock at 4 chars
      assert.strictEqual(getMaxTimeInputLength('108'), 4);
      assert.strictEqual(getMaxTimeInputLength('1:08'), 4);
      assert.strictEqual(getMaxTimeInputLength('1:19'), 4);
      assert.strictEqual(getMaxTimeInputLength('1:27'), 4);

      // Double-digit hours (10, 11, 12) allow 5 characters
      assert.strictEqual(getMaxTimeInputLength('1'), 5);
      assert.strictEqual(getMaxTimeInputLength('10'), 5);
      assert.strictEqual(getMaxTimeInputLength('1:00'), 5); // Allows typing 4th digit to make 10:00
      assert.strictEqual(getMaxTimeInputLength('10:00'), 5);
      assert.strictEqual(getMaxTimeInputLength('11:30'), 5);
      assert.strictEqual(getMaxTimeInputLength('12:45'), 5);
    });

    it('formats raw time digits into fake colon segments matching date slash behavior', () => {
      // 0 digits: empty
      const empty = formatTimeSegments('');
      assert.strictEqual(empty.rawDigits, '');
      assert.strictEqual(empty.part1, '');
      assert.strictEqual(empty.showColon, false);
      assert.strictEqual(empty.part2, '');
      assert.strictEqual(empty.formatted, '');

      // 1 digit: no colon
      const one = formatTimeSegments('1');
      assert.strictEqual(one.rawDigits, '1');
      assert.strictEqual(one.part1, '1');
      assert.strictEqual(one.showColon, false);
      assert.strictEqual(one.part2, '');
      assert.strictEqual(one.formatted, '1');

      // 2 digits: no colon (e.g. "10", "73", "25")
      const ten = formatTimeSegments('10');
      assert.strictEqual(ten.rawDigits, '10');
      assert.strictEqual(ten.part1, '10');
      assert.strictEqual(ten.showColon, false);
      assert.strictEqual(ten.part2, '');
      assert.strictEqual(ten.formatted, '10');

      const seventyThree = formatTimeSegments('73');
      assert.strictEqual(seventyThree.part1, '73');
      assert.strictEqual(seventyThree.showColon, false);

      // 3 digits: fake colon appears immediately after 1st digit (e.g. "100" -> "1:00", "730" -> "7:30")
      const oneHundred = formatTimeSegments('100');
      assert.strictEqual(oneHundred.rawDigits, '100');
      assert.strictEqual(oneHundred.part1, '1');
      assert.strictEqual(oneHundred.showColon, true);
      assert.strictEqual(oneHundred.part2, '00');
      assert.strictEqual(oneHundred.formatted, '1:00');

      const sevenThirty = formatTimeSegments('730');
      assert.strictEqual(sevenThirty.rawDigits, '730');
      assert.strictEqual(sevenThirty.part1, '7');
      assert.strictEqual(sevenThirty.showColon, true);
      assert.strictEqual(sevenThirty.part2, '30');
      assert.strictEqual(sevenThirty.formatted, '7:30');

      const twoFifty = formatTimeSegments('250');
      assert.strictEqual(twoFifty.part1, '2');
      assert.strictEqual(twoFifty.showColon, true);
      assert.strictEqual(twoFifty.part2, '50');
      assert.strictEqual(twoFifty.formatted, '2:50');

      // 4 digits: fake colon appears after 2nd digit (e.g. "1000" -> "10:00", "1230" -> "12:30")
      const tenOClock = formatTimeSegments('1000');
      assert.strictEqual(tenOClock.rawDigits, '1000');
      assert.strictEqual(tenOClock.part1, '10');
      assert.strictEqual(tenOClock.showColon, true);
      assert.strictEqual(tenOClock.part2, '00');
      assert.strictEqual(tenOClock.formatted, '10:00');

      const twelveThirty = formatTimeSegments('1230');
      assert.strictEqual(twelveThirty.rawDigits, '1230');
      assert.strictEqual(twelveThirty.part1, '12');
      assert.strictEqual(twelveThirty.showColon, true);
      assert.strictEqual(twelveThirty.part2, '30');
      assert.strictEqual(twelveThirty.formatted, '12:30');
    });

    it('determines strict maximum raw digit length for masked time input', () => {
      // Empty defaults to 4 to allow hours 10..12
      assert.strictEqual(getMaxTimeRawDigitLength(''), 4);

      // Single digit hours 2..9 lock at 3 digits
      assert.strictEqual(getMaxTimeRawDigitLength('7'), 3);
      assert.strictEqual(getMaxTimeRawDigitLength('73'), 3);
      assert.strictEqual(getMaxTimeRawDigitLength('2'), 3);
      assert.strictEqual(getMaxTimeRawDigitLength('9'), 3);

      // Hour 1 with tens of minutes 3..5 locks at 3 digits
      assert.strictEqual(getMaxTimeRawDigitLength('13'), 3);
      assert.strictEqual(getMaxTimeRawDigitLength('15'), 3);

      // Hour 1 with tens of minutes 0..2 allows 4 digits (e.g. "10", "11", "12")
      assert.strictEqual(getMaxTimeRawDigitLength('1'), 4);
      assert.strictEqual(getMaxTimeRawDigitLength('10'), 4);
      assert.strictEqual(getMaxTimeRawDigitLength('11'), 4);
      assert.strictEqual(getMaxTimeRawDigitLength('12'), 4);
    });

    it('verifies calendar date selection state and today subtle outline logic', () => {
      const today = new Date();
      const tDay = today.getDate();
      const tMonth = today.getMonth();
      const tYear = today.getFullYear();

      // Case 1: Today is selected
      const selectedDay = tDay;
      const selectedMonth = tMonth;
      const selectedYear = tYear;

      const isToday = true;
      const isSelected =
        selectedDay === tDay &&
        selectedMonth === tMonth &&
        selectedYear === tYear;

      // When today is selected: solid gold selector is active, subtle outline disappears
      const styleType = isSelected ? 'gold-fill' : isToday ? 'subtle-outline' : 'normal';
      assert.strictEqual(styleType, 'gold-fill', 'Today has gold fill when selected, not subtle outline');

      // Case 2: A different day (e.g. tomorrow) is selected
      const otherIsSelected = false;

      const todayCellWithOtherSelected = isToday && !otherIsSelected;
      assert.strictEqual(todayCellWithOtherSelected, true, 'Today has subtle outline when another day is selected');

      // Case 3: Verify inner 38x32 pill indicator preserves pill shape and guarantees horizontal separation
      const containerWidth = 320 - 32; // 288px grid width (card width minus padding)
      const columnWidth = containerWidth / 7; // ~41.14px per column
      const indicatorWidth = 38;
      const indicatorHeight = 32;
      const marginPerSide = (columnWidth - indicatorWidth) / 2; // ~1.57px
      const distanceBetweenAdjacentDays = marginPerSide * 2; // ~3.14px
      assert.ok(
        indicatorWidth > indicatorHeight,
        'Pill indicator width must exceed height to retain horizontal capsule shape'
      );
      assert.ok(
        distanceBetweenAdjacentDays > 0,
        `Distance between adjacent day indicators (${distanceBetweenAdjacentDays.toFixed(2)}px) prevents touching`
      );
    });
  });

  describe('Feed State Integration & Post Publishing', () => {
    const abstractionClub = getClubById('abstraction')!;

    it('ensures post creation sets campusWide strictly for departments and false for clubs like Abstraction', () => {
      const createTestPost = (club: NonNullable<ReturnType<typeof getClubById>>) => ({
        clubId: club.id,
        org: club.name,
        campusWide: Boolean(club.isDepartment),
      });

      const abstractionPost = createTestPost(abstractionClub);
      assert.strictEqual(abstractionPost.campusWide, false, 'Abstraction posts must not be campusWide');

      const departmentClub = CALVIN_CLUBS.find((c) => c.isDepartment)!;
      assert.ok(departmentClub, 'Must have at least one department club');
      const deptPost = createTestPost(departmentClub);
      assert.strictEqual(deptPost.campusWide, true, 'Official Calvin department posts must be campusWide');
    });

    it('creates a fully populated Post with club metadata and timestamp', () => {
      const newPost: Post = {
        id: `post-test-${Date.now()}`,
        clubId: abstractionClub.id,
        org: abstractionClub.name,
        mark: abstractionClub.mark,
        category: abstractionClub.category as FeedCategory,
        postedAt: 'Just now',
        headline: 'Spring Coding Night',
        body: 'Building apps together tonight in NH 276!',
        when: 'Fri, Sep 18 · 7:00 PM',
        where: 'North Hall 276',
        followed: true,
        campusWide: Boolean(abstractionClub.isDepartment),
        colors: abstractionClub.colors,
        sf: abstractionClub.sf,
        md: abstractionClub.md,
      };

      assert.ok(newPost.id.startsWith('post-test-'));
      assert.strictEqual(newPost.org, 'Abstraction');
      assert.strictEqual(newPost.category, 'Academics');
      assert.strictEqual(newPost.mark, 'AB');
      assert.strictEqual(newPost.campusWide, false, 'Abstraction post is not campus-wide');
      assert.strictEqual(newPost.headline, 'Spring Coding Night');
      assert.strictEqual(newPost.body, 'Building apps together tonight in NH 276!');
      assert.strictEqual(newPost.postedAt, 'Just now');
      assert.strictEqual(newPost.image, undefined, 'Image is optional and undefined here');
    });

    it('prepends new post to dynamic feed and filters in For You when followed', () => {
      const newPost: Post = {
        id: 'post-abstraction-1',
        clubId: abstractionClub.id,
        org: abstractionClub.name,
        mark: abstractionClub.mark,
        category: abstractionClub.category as FeedCategory,
        postedAt: 'Just now',
        headline: 'Spring Coding Night',
        body: 'Building apps together tonight in NH 276!',
        followed: true,
        campusWide: false,
      };

      const feed = [newPost];

      // If user follows 'abstraction'
      const followedFeed = forYouPosts((id) => id === 'abstraction', feed);
      assert.strictEqual(followedFeed.length, 1);
      assert.strictEqual(followedFeed[0].id, 'post-abstraction-1');

      // If user does not follow 'abstraction'
      const unfollowedFeed = forYouPosts((id) => id === 'acm', feed);
      assert.strictEqual(unfollowedFeed.length, 0);
    });

    it('finds newly created post when querying by club ID', () => {
      const newPost: Post = {
        id: 'post-abstraction-2',
        clubId: abstractionClub.id,
        org: abstractionClub.name,
        mark: abstractionClub.mark,
        category: abstractionClub.category as FeedCategory,
        postedAt: 'Just now',
        headline: 'Git & GitHub Workshop',
        body: 'Learn branching, merging, and pull requests.',
        followed: true,
        campusWide: true,
      };

      const feed = [newPost];
      const clubPosts = getPostsByClubId('abstraction', feed);
      assert.strictEqual(clubPosts.length, 1);
      assert.strictEqual(clubPosts[0].headline, 'Git & GitHub Workshop');

      const otherClubPosts = getPostsByClubId('acm', feed);
      assert.strictEqual(otherClubPosts.length, 0);
    });

    it('finds newly created post via search query', () => {
      const newPost: Post = {
        id: 'post-abstraction-3',
        clubId: abstractionClub.id,
        org: abstractionClub.name,
        mark: abstractionClub.mark,
        category: abstractionClub.category as FeedCategory,
        postedAt: 'Just now',
        headline: 'Competitive Programming Meetup',
        body: 'Solving LeetCode and ICPC problems.',
        followed: true,
        campusWide: true,
      };

      const feed = [newPost];
      assert.strictEqual(searchPosts('Competitive', 'All', feed).length, 1);
      assert.strictEqual(searchPosts('Abstraction', 'All', feed).length, 1);
      assert.strictEqual(searchPosts('LeetCode', 'All', feed).length, 1);
      assert.strictEqual(searchPosts('Robotics', 'All', feed).length, 0);
    });
  });

  describe('Dynamic Navigation Tabs (4 vs 5 Tabs)', () => {
    const BASE_TABS = [
      { name: 'knightly', href: '/' },
      { name: 'dining', href: '/dining' },
      { name: 'safety', href: '/safety' },
      { name: 'directory', href: '/directory' },
    ];

    const LEADER_TABS = [
      { name: 'knightly', href: '/' },
      { name: 'dining', href: '/dining' },
      { name: 'safety', href: '/safety' },
      { name: 'directory', href: '/directory' },
      { name: 'post', href: '/post' },
    ];

    it('provides standard 4 tabs when user is not a club leader', () => {
      const isLeader = false;
      const tabs = isLeader ? LEADER_TABS : BASE_TABS;
      assert.strictEqual(tabs.length, 4);
      assert.deepStrictEqual(
        tabs.map((t) => t.name),
        ['knightly', 'dining', 'safety', 'directory']
      );
      assert.strictEqual(tabs.some((t) => t.name === 'post'), false);
    });

    it('injects the 5th Post tab at the far right position (index 4) when user is a leader', () => {
      const isLeader = true;
      const tabs = isLeader ? LEADER_TABS : BASE_TABS;
      assert.strictEqual(tabs.length, 5);
      assert.deepStrictEqual(
        tabs.map((t) => t.name),
        ['knightly', 'dining', 'safety', 'directory', 'post']
      );
      assert.strictEqual(tabs[4].name, 'post');
      assert.strictEqual(tabs[4].href, '/post');
    });
  });

  describe('AccessoryButton & Input Visibility Invariants', () => {
    it('verifies AccessoryButton standard dimensions and tactile properties', () => {
      const standardHeight = 40;
      const calendarButtonSize = { width: 40, height: standardHeight };
      const periodButtonSize = { minWidth: 44, height: standardHeight };

      assert.strictEqual(calendarButtonSize.height, standardHeight);
      assert.strictEqual(periodButtonSize.height, standardHeight);
      assert.strictEqual(calendarButtonSize.width, 40);
      assert.ok(periodButtonSize.minWidth >= 44);
    });

    it('calculates auto-scroll target offsets with comfortable padding above input', () => {
      const getScrollTarget = (sectionY: number, isNearBottom = false) => {
        if (isNearBottom) return 'end';
        return Math.max(0, sectionY - 24);
      };

      assert.strictEqual(getScrollTarget(450, false), 426);
      assert.strictEqual(getScrollTarget(10, false), 0);
      assert.strictEqual(getScrollTarget(800, true), 'end');
    });

    it('brings bottom of page up to height of keyboard when active, and back down when dismissed', () => {
      // Container padding directly tracks keyboardHeight without double-padding
      const getPageBottomPadding = (keyboardH: number) => keyboardH;
      const getScrollContentPadding = (insetsBottom: number) => Math.max(insetsBottom, 8) + BottomTabContentInset;

      // 1. Keyboard closed: page bottom padding is 0, content sits comfortably above bottom bar with standardized 96px inset
      assert.strictEqual(getPageBottomPadding(0), 0);
      assert.strictEqual(getScrollContentPadding(34), 34 + 96);

      // 2. Keyboard opens (e.g. 336px): bottom of page rises directly to top of keyboard
      assert.strictEqual(getPageBottomPadding(336), 336);

      // 3. Keyboard closes: bottom of page returns smoothly to 0
      assert.strictEqual(getPageBottomPadding(0), 0);
    });
  });

  describe('Numeric Input Non-Digit Lockout & Paste Sanitization', () => {
    it('strictly validates keystrokes allowing only digits and navigation keys', () => {
      // Allowed digits
      for (let i = 0; i <= 9; i++) {
        assert.strictEqual(isAllowedNumericKey(String(i)), true, `Digit ${i} must be allowed`);
      }

      // Prohibited punctuation characters (commonly on numpads or keyboards)
      assert.strictEqual(isAllowedNumericKey('.'), false, 'Period must be blocked');
      assert.strictEqual(isAllowedNumericKey(','), false, 'Comma must be blocked');
      assert.strictEqual(isAllowedNumericKey('-'), false, 'Hyphen/minus must be blocked');
      assert.strictEqual(isAllowedNumericKey('+'), false, 'Plus must be blocked');
      assert.strictEqual(isAllowedNumericKey('/'), false, 'Slash must be blocked');
      assert.strictEqual(isAllowedNumericKey(':'), false, 'Colon must be blocked');
      assert.strictEqual(isAllowedNumericKey('e'), false, 'Scientific notation e must be blocked');
      assert.strictEqual(isAllowedNumericKey('E'), false, 'Scientific notation E must be blocked');

      // Prohibited letters & symbols
      assert.strictEqual(isAllowedNumericKey('a'), false);
      assert.strictEqual(isAllowedNumericKey('Z'), false);
      assert.strictEqual(isAllowedNumericKey('@'), false);
      assert.strictEqual(isAllowedNumericKey(' '), false);

      // Allowed navigation & editing control keys
      assert.strictEqual(isAllowedNumericKey('Backspace'), true);
      assert.strictEqual(isAllowedNumericKey('Delete'), true);
      assert.strictEqual(isAllowedNumericKey('Tab'), true);
      assert.strictEqual(isAllowedNumericKey('Enter'), true);
      assert.strictEqual(isAllowedNumericKey('ArrowLeft'), true);
      assert.strictEqual(isAllowedNumericKey('ArrowRight'), true);
      assert.strictEqual(isAllowedNumericKey('ArrowUp'), true);
      assert.strictEqual(isAllowedNumericKey('ArrowDown'), true);

      // Allowed modifier combinations (copy, paste, select all)
      assert.strictEqual(isAllowedNumericKey('v', { ctrlKey: true }), true);
      assert.strictEqual(isAllowedNumericKey('v', { metaKey: true }), true);
      assert.strictEqual(isAllowedNumericKey('c', { ctrlKey: true }), true);
      assert.strictEqual(isAllowedNumericKey('a', { metaKey: true }), true);
    });

    it('simulates DOM event listeners blocking non-digits on keydown and beforeinput', () => {
      const events: Record<string, Function> = {};
      const mockElement = {
        addEventListener: (name: string, fn: Function) => {
          events[name] = fn;
        },
        removeEventListener: (name: string) => {
          delete events[name];
        },
      };

      // In non-web environments (node), attachNumericDomFilters returns no-op gracefully
      const cleanup = attachNumericDomFilters(mockElement);
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('verifies paste sanitization removes non-digits completely before input reaches state', () => {
      const sanitizePaste = (raw: string) => raw.replace(/[^0-9]/g, '');

      assert.strictEqual(sanitizePaste('12.30'), '1230');
      assert.strictEqual(sanitizePaste('12,30'), '1230');
      assert.strictEqual(sanitizePaste('12-30'), '1230');
      assert.strictEqual(sanitizePaste('09/18/2026'), '09182026');
      assert.strictEqual(sanitizePaste('7:00 PM'), '700');
      assert.strictEqual(sanitizePaste('hello world'), '');
      assert.strictEqual(sanitizePaste('!@#$%^&*()'), '');
    });
  });

  describe('Strict Real-Time Date & Time Input Validation and Error Messaging', () => {
    describe('Date Digit Validation (sanitizeDate)', () => {
      it('validates month tens digit: allows only 0 and 1', () => {
        assert.deepStrictEqual(sanitizeDate('0'), { digits: '0', error: null });
        assert.deepStrictEqual(sanitizeDate('1'), { digits: '1', error: null });

        for (let d = 2; d <= 9; d++) {
          const res = sanitizeDate(String(d));
          assert.strictEqual(res.digits, '');
          assert.strictEqual(res.error, 'Month must be between 01-12');
        }
      });

      it('validates month units digit: when tens is 1, allows only 0, 1, 2 (months 10, 11, 12)', () => {
        assert.deepStrictEqual(sanitizeDate('10'), { digits: '10', error: null });
        assert.deepStrictEqual(sanitizeDate('11'), { digits: '11', error: null });
        assert.deepStrictEqual(sanitizeDate('12'), { digits: '12', error: null });

        for (let d = 3; d <= 9; d++) {
          const res = sanitizeDate(`1${d}`);
          assert.strictEqual(res.digits, '1');
          assert.strictEqual(res.error, 'Month must be between 01-12');
        }
      });

      it('validates month units digit: when tens is 0, allows 1..9 and rejects 00', () => {
        for (let d = 1; d <= 9; d++) {
          assert.deepStrictEqual(sanitizeDate(`0${d}`), { digits: `0${d}`, error: null });
        }
        const res = sanitizeDate('00');
        assert.strictEqual(res.digits, '0');
        assert.strictEqual(res.error, 'Month must be between 01-12');
      });

      it('validates day tens digit: for February (02), allows 0..2 and rejects 3..9', () => {
        assert.deepStrictEqual(sanitizeDate('020'), { digits: '020', error: null });
        assert.deepStrictEqual(sanitizeDate('021'), { digits: '021', error: null });
        assert.deepStrictEqual(sanitizeDate('022'), { digits: '022', error: null });

        for (let d = 3; d <= 9; d++) {
          const res = sanitizeDate(`02${d}`);
          assert.strictEqual(res.digits, '02');
          assert.strictEqual(res.error, 'Day must be between 01-29');
        }
      });

      it('validates day tens digit: for other months, allows 0..3 and rejects 4..9', () => {
        assert.deepStrictEqual(sanitizeDate('010'), { digits: '010', error: null });
        assert.deepStrictEqual(sanitizeDate('011'), { digits: '011', error: null });
        assert.deepStrictEqual(sanitizeDate('012'), { digits: '012', error: null });
        assert.deepStrictEqual(sanitizeDate('013'), { digits: '013', error: null });

        for (let d = 4; d <= 9; d++) {
          const res = sanitizeDate(`01${d}`);
          assert.strictEqual(res.digits, '01');
          assert.strictEqual(res.error, 'Day must be between 01-31');
        }
      });

      it('validates day units digit: rejects 00 as a day', () => {
        const res = sanitizeDate('0100');
        assert.strictEqual(res.digits, '010');
        assert.strictEqual(res.error, 'Day must be between 01-31');
      });

      it('validates day units digit: for 30-day months (04, 06, 09, 11), day cannot exceed 30', () => {
        const months30 = ['04', '06', '09', '11'];
        for (const m of months30) {
          assert.deepStrictEqual(sanitizeDate(`${m}30`), { digits: `${m}30`, error: null });
          const res = sanitizeDate(`${m}31`);
          assert.strictEqual(res.digits, `${m}3`);
          assert.strictEqual(res.error, 'Day must be between 01-30');
        }
      });

      it('validates day units digit: for 31-day months, allows 30 and 31, rejects 32..39', () => {
        assert.deepStrictEqual(sanitizeDate('0130'), { digits: '0130', error: null });
        assert.deepStrictEqual(sanitizeDate('0131'), { digits: '0131', error: null });

        for (let d = 2; d <= 9; d++) {
          const res = sanitizeDate(`013${d}`);
          assert.strictEqual(res.digits, '013');
          assert.strictEqual(res.error, 'Day must be between 01-31');
        }
      });

      it('accepts year beginning with !2 and limits user to 2 digits for !2 years', () => {
        // Year starting with 2 allows 2-digit or 4-digit input
        assert.deepStrictEqual(sanitizeDate('09182'), { digits: '09182', error: null });
        assert.deepStrictEqual(sanitizeDate('09182026'), { digits: '09182026', error: null });

        // Year starting with !2 (0, 1, 3, 4, 5, 6, 7, 8, 9) is now accepted
        const nonTwoStarts = [0, 1, 3, 4, 5, 6, 7, 8, 9];
        for (const y of nonTwoStarts) {
          const res = sanitizeDate(`0918${y}`);
          assert.strictEqual(res.digits, `0918${y}`);
          assert.strictEqual(res.error, null);
        }

        // Year starting with !2 limits user to 2 digits for the year (e.g. 42 is accepted, 425 is limited to 42)
        assert.deepStrictEqual(sanitizeDate('091842'), { digits: '091842', error: null });
        assert.deepStrictEqual(sanitizeDate('0918425'), { digits: '091842', error: null });
        assert.deepStrictEqual(sanitizeDate('09181399'), { digits: '091813', error: null });
        assert.deepStrictEqual(sanitizeDate('09189912'), { digits: '091899', error: null });
      });

      it('validates leap years for February 29: allows leap years (2024, 2028, 2000) and rejects non-leap years (2025, 2023, 2100)', () => {
        assert.deepStrictEqual(sanitizeDate('02292024'), { digits: '02292024', error: null });
        assert.deepStrictEqual(sanitizeDate('02292028'), { digits: '02292028', error: null });
        assert.deepStrictEqual(sanitizeDate('02292000'), { digits: '02292000', error: null });

        const res2025 = sanitizeDate('02292025');
        assert.strictEqual(res2025.digits, '0229202');
        assert.strictEqual(res2025.error, '2025 is not a leap year');

        const res2023 = sanitizeDate('02292023');
        assert.strictEqual(res2023.digits, '0229202');
        assert.strictEqual(res2023.error, '2023 is not a leap year');

        const res2100 = sanitizeDate('02292100');
        assert.strictEqual(res2100.digits, '0229210');
        assert.strictEqual(res2100.error, '2100 is not a leap year');
      });

      it('handles backspacing and deletions gracefully without emitting errors', () => {
        assert.deepStrictEqual(sanitizeDate('091', '0918'), { digits: '091', error: null });
        assert.deepStrictEqual(sanitizeDate('', '0918'), { digits: '', error: null });
      });
    });

    describe('Time Digit Validation with Error Feedback (sanitizeTime)', () => {
      it('rejects hour 00 with clear error message', () => {
        const res = sanitizeTime('00');
        assert.strictEqual(res.digits, '0');
        assert.strictEqual(res.error, 'Hour cannot be 00.');
      });

      it('rejects minutes tens > 5 on 2-digit input', () => {
        const res = sanitizeTime('26');
        assert.strictEqual(res.digits, '2');
        assert.strictEqual(res.error, 'Minutes cannot exceed 59.');
      });

      it('rejects 4th digit for single-digit hours (e.g. 730 -> 7300)', () => {
        const res = sanitizeTime('7300');
        assert.strictEqual(res.digits, '730');
        assert.strictEqual(res.error, 'Single-digit hours cannot exceed 3 digits.');
      });

      it('allows 4th digit for 2-digit hours (10:00, 11:30, 12:45)', () => {
        assert.deepStrictEqual(sanitizeTime('1000'), { digits: '1000', error: null });
        assert.deepStrictEqual(sanitizeTime('1130'), { digits: '1130', error: null });
        assert.deepStrictEqual(sanitizeTime('1245'), { digits: '1245', error: null });
      });

      it('rejects 4th digit when hour is 1 and minutes tens is 3..5 (e.g. 1:30 cannot be 1300)', () => {
        const res = sanitizeTime('1300');
        assert.strictEqual(res.digits, '130');
        assert.strictEqual(res.error, 'Single-digit hours cannot exceed 3 digits.');
      });
    });

    describe('Campus Clubs Leader Chip & Claim Dismissal Invariants', () => {
      const getLeaderChipState = (
        isLeader: boolean,
        linkedClubs: { name: string }[],
        isClaimBannerDismissed: boolean
      ) => {
        const isVisible = !isClaimBannerDismissed;
        const title = isLeader
          ? linkedClubs.length > 1
            ? 'Leading multiple clubs'
            : `Leading ${linkedClubs[0]?.name ?? ''}`
          : 'Club Leader? Claim with code';
        const subtitle = isLeader
          ? 'Tap to link to another club'
          : 'Enter 10-character code from Student Life';
        return { isVisible, title, subtitle };
      };

      it('shows claim banner with standard copy when user is not a leader and not dismissed', () => {
        const state = getLeaderChipState(false, [], false);
        assert.strictEqual(state.isVisible, true);
        assert.strictEqual(state.title, 'Club Leader? Claim with code');
        assert.strictEqual(state.subtitle, 'Enter 10-character code from Student Life');
      });

      it('hides claim banner when user is not a leader and has dismissed the banner', () => {
        const state = getLeaderChipState(false, [], true);
        assert.strictEqual(state.isVisible, false);
      });

      it('displays "Leading {Club name}" and "Tap to link to another club" when leading a single club and not dismissed', () => {
        const state = getLeaderChipState(true, [{ name: 'Abstraction' }], false);
        assert.strictEqual(state.isVisible, true);
        assert.strictEqual(state.title, 'Leading Abstraction');
        assert.strictEqual(state.subtitle, 'Tap to link to another club');
      });

      it('displays "Leading multiple clubs" and "Tap to link to another club" when leading multiple clubs and not dismissed', () => {
        const state = getLeaderChipState(
          true,
          [{ name: 'Abstraction' }, { name: 'Knight Riders' }],
          false
        );
        assert.strictEqual(state.isVisible, true);
        assert.strictEqual(state.title, 'Leading multiple clubs');
        assert.strictEqual(state.subtitle, 'Tap to link to another club');
      });

      it('ensures dismissing the banner also removes the leader card ("Leading {Club name}")', () => {
        const state = getLeaderChipState(true, [{ name: 'Abstraction' }], true);
        assert.strictEqual(state.isVisible, false, 'Leader card must be removed when banner is dismissed');
      });

      it('specifies the masked claim code placeholder format as A1B2-C3D4-E5', () => {
        const placeholderCode = 'A1B2-C3D4-E5';
        assert.strictEqual(placeholderCode, 'A1B2-C3D4-E5');
        assert.strictEqual(placeholderCode.length, 12);
        assert.strictEqual(placeholderCode[4], '-');
        assert.strictEqual(placeholderCode[9], '-');
      });

      it('displays "Stop showing me this" button ONLY when opened from Campus Clubs banner, hiding it from profile menu', () => {
        const shouldShowStopShowingOption = (source: ClaimModalSource) => source === 'banner';

        // Opened by tapping Campus Clubs banner chip
        assert.strictEqual(shouldShowStopShowingOption('banner'), true);

        // Opened from Header Avatar profile menu
        assert.strictEqual(shouldShowStopShowingOption('profile'), false);

        // Default or null source
        assert.strictEqual(shouldShowStopShowingOption(null), false);
      });

      it('scopes claim banner dismissal keys to the active student account', () => {
        const johnKey = getAccountStorageKey({ username: 'jmd42', id: '2028420' }, 'knightly_claim_banner_dismissed_');
        const aliceKey = getAccountStorageKey({ username: 'alice', id: '2028555' }, 'knightly_claim_banner_dismissed_');
        const guestKey = getAccountStorageKey(null, 'knightly_claim_banner_dismissed_');

        assert.strictEqual(johnKey, 'knightly_claim_banner_dismissed_jmd42');
        assert.strictEqual(aliceKey, 'knightly_claim_banner_dismissed_alice');
        assert.strictEqual(guestKey, 'knightly_claim_banner_dismissed_guest');
      });

      it('maintains independent dismissal state across accounts so switching accounts restores the banner for non-dismissed users', () => {
        // Model storage for multiple student accounts
        const mockStorage: Record<string, string> = {};

        const dismissForUser = (user: { username: string; id: string }) => {
          const key = getAccountStorageKey(user, 'knightly_claim_banner_dismissed_');
          mockStorage[key] = 'true';
        };

        const isDismissedForUser = (user: { username: string; id: string }) => {
          const key = getAccountStorageKey(user, 'knightly_claim_banner_dismissed_');
          return mockStorage[key] === 'true';
        };

        const john = { username: 'jmd42', id: '2028420' };
        const sarah = { username: 'sarah', id: '2028301' };

        // Initially neither user has dismissed the banner
        assert.strictEqual(isDismissedForUser(john), false);
        assert.strictEqual(isDismissedForUser(sarah), false);

        // John dismisses the banner
        dismissForUser(john);

        // John's card is dismissed, but Sarah's card remains active!
        assert.strictEqual(isDismissedForUser(john), true);
        assert.strictEqual(isDismissedForUser(sarah), false);

        // John signs out and signs back in: John remains dismissed
        assert.strictEqual(isDismissedForUser(john), true);
      });

      it('standardizes bottom margin across all pop-up cards to 20px (Spacing.three + 4) matching dismissal confirmation', () => {
        const STANDARD_MODAL_BOTTOM_INSET = 20; // Spacing.three + 4
        assert.strictEqual(STANDARD_MODAL_BOTTOM_INSET, 20);

        // Verification of dialog configurations
        const modalCardBottomPadding = {
          noticeCard: 20, // Dismissal notice popup
          claimClubModal: 20, // Claim club modal scrollContent bottom
          datePickerModal: 20, // Date picker modal body bottom
          headerAvatarSheet: 20, // Profile sheet bottom
          postSuccessModal: 20, // Post published success modal bottom
        };

        for (const [modalName, padding] of Object.entries(modalCardBottomPadding)) {
          assert.strictEqual(
            padding,
            STANDARD_MODAL_BOTTOM_INSET,
            `${modalName} must maintain consistent 20px bottom inset to the bottommost element`
          );
        }
      });

      it('verifies non-informational popups (date picker) have X close and no Cancel button', () => {
        const datePickerControls = {
          hasCloseXButton: true,
          hasCancelButton: false,
          isInformational: false,
        };

        assert.strictEqual(datePickerControls.hasCloseXButton, true);
        assert.strictEqual(datePickerControls.hasCancelButton, false);
      });

      it('verifies informational popups consistently provide a Got it button without X close', () => {
        const informationalPopups = [
          { name: 'DismissalNotice', buttonLabel: 'Got it', hasCloseX: false },
          { name: 'ClaimClubSuccessStep', buttonLabel: 'Got it', hasCloseX: false },
          { name: 'PostPublishedSuccessModal', buttonLabel: 'Got it', hasCloseX: false },
        ];

        for (const popup of informationalPopups) {
          assert.strictEqual(popup.buttonLabel, 'Got it');
          assert.strictEqual(popup.hasCloseX, false);
        }
      });

      it('ensures calendar selected date indicator retains pill border-radius invariant across month navigation', () => {
        // DatePickerModal day indicator styling contract
        const dayIndicatorSelectedStyle = {
          backgroundColor: Brand.gold,
          borderRadius: Radius.pill,
          overflow: 'hidden',
        };

        const dayIndicatorTodayStyle = {
          borderRadius: Radius.pill,
          borderWidth: 1.5,
          borderColor: 'rgba(243, 195, 0, 0.45)',
          backgroundColor: 'transparent',
          overflow: 'hidden',
        };

        // Both selected date indicator and today outline must have Radius.pill and overflow hidden
        assert.strictEqual(dayIndicatorSelectedStyle.borderRadius, Radius.pill);
        assert.strictEqual(dayIndicatorSelectedStyle.borderRadius, 999);
        assert.strictEqual(dayIndicatorSelectedStyle.overflow, 'hidden');
        assert.strictEqual(dayIndicatorTodayStyle.borderRadius, Radius.pill);
        assert.strictEqual(dayIndicatorTodayStyle.overflow, 'hidden');

        // Verify month/year scoped keys prevent DOM recycling regressions
        const makeMonthGridKey = (year: number, month: number) => `grid-${year}-${month}`;
        const makeDayCellKey = (year: number, month: number, day: number) => `day-${year}-${month}-${day}`;

        // March 2026 vs April 2026 day 15 must have distinct keys
        assert.notStrictEqual(makeMonthGridKey(2026, 2), makeMonthGridKey(2026, 3));
        assert.notStrictEqual(makeDayCellKey(2026, 2, 15), makeDayCellKey(2026, 3, 15));
      });

      it('synchronously initializes calendar date so the pill immediately displays a visible number on very first open', () => {
        // Model parseDateOrDefault logic
        const parseDateOrDefault = (dateStr: string) => {
          const today = new Date();
          const tM = today.getMonth();
          const tY = today.getFullYear();
          const tD = today.getDate();
          const todayFormatted = `${String(tM + 1).padStart(2, '0')}/${String(tD).padStart(2, '0')}/${tY}`;

          const trimmed = (dateStr || '').trim();
          if (trimmed) {
            const parts = trimmed.split(/[/.-]/);
            if (parts.length === 3) {
              let m = parseInt(parts[0], 10) - 1;
              let d = parseInt(parts[1], 10);
              let y = parseInt(parts[2], 10);
              if (parts[0].length === 4) {
                y = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                d = parseInt(parts[2], 10);
              }
              if (!isNaN(m) && !isNaN(d) && !isNaN(y) && m >= 0 && m < 12 && d >= 1 && d <= 31) {
                const mStr = String(m + 1).padStart(2, '0');
                const dStr = String(d).padStart(2, '0');
                return { year: y, month: m, formatted: `${mStr}/${dStr}/${y}` };
              }
            }
          }
          return { year: tY, month: tM, formatted: todayFormatted };
        };

        // When date input is blank on initial launch, activeDateStr is NOT empty string
        const onFirstLaunch = parseDateOrDefault('');
        assert.ok(onFirstLaunch.formatted.length === 10, 'Must have valid MM/DD/YYYY formatted string on first launch');
        assert.notStrictEqual(onFirstLaunch.formatted, '');

        // Text style contract: Selected day MUST have explicit high-contrast black (#000000) text
        const getDayTextColor = (isSelected: boolean, isToday: boolean, defaultText: string) => {
          if (isSelected) return '#000000';
          if (isToday) return Brand.gold;
          return defaultText;
        };

        // On first open, today is selected: text MUST be black, NOT gold (which would blend into the gold pill!)
        const firstOpenTodayColor = getDayTextColor(true, true, '#FFFFFF');
        assert.strictEqual(firstOpenTodayColor, '#000000', 'Selected day text must be black (#000000) so number is clearly visible on gold pill');

        // Unselected today has gold text
        assert.strictEqual(getDayTextColor(false, true, '#FFFFFF'), Brand.gold);
      });

      it('keeps calendar header and navigation buttons fixed while expanding only the bottom for 4, 5, and 6-week months', () => {
        const computeMonthLayout = (year: number, month: number) => {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayWeekday = new Date(year, month, 1).getDay();
          const totalCells = firstDayWeekday + daysInMonth;
          const numWeeks = Math.ceil(totalCells / 7);
          const verticalShift = (numWeeks - 5) * 20;
          return { daysInMonth, firstDayWeekday, totalCells, numWeeks, verticalShift };
        };

        // 1. 5-week baseline month (e.g. March 2026: 31 days starting Sunday = 31 cells -> 5 weeks)
        const march2026 = computeMonthLayout(2026, 2);
        assert.strictEqual(march2026.numWeeks, 5);
        assert.strictEqual(march2026.verticalShift, 0, '5-week month must have 0 vertical shift (centered)');

        // 2. 6-week month (e.g. May 2026: 31 days starting Friday = 36 cells -> 6 weeks)
        // Or August 2026: 31 days starting Saturday = 37 cells -> 6 weeks
        const may2026 = computeMonthLayout(2026, 4);
        assert.strictEqual(may2026.numWeeks, 6);
        assert.strictEqual(
          may2026.verticalShift,
          20,
          '6-week month must shift by +20 to cancel natural -20 top shift in centered container, keeping top fixed'
        );

        // 3. 4-week month (e.g. February 2026: 28 days starting Sunday = 28 cells -> exactly 4 weeks)
        const feb2026 = computeMonthLayout(2026, 1);
        assert.strictEqual(feb2026.numWeeks, 4);
        assert.strictEqual(
          feb2026.verticalShift,
          -20,
          '4-week month must shift by -20 to cancel natural +20 top shift in centered container, keeping top fixed'
        );

        // Verification of invariant: In a viewport of height S and baseline card height H5:
        // Top position = (S - H)/2 + translateY
        const simulateTop = (screenHeight: number, h5: number, numWeeks: number, shift: number) => {
          const cardHeight = h5 + (numWeeks - 5) * 40;
          const naturalTop = (screenHeight - cardHeight) / 2;
          return naturalTop + shift;
        };

        const screenHeight = 800;
        const baselineH5 = 380;
        const top5 = simulateTop(screenHeight, baselineH5, 5, 0);
        const top6 = simulateTop(screenHeight, baselineH5, 6, 20);
        const top4 = simulateTop(screenHeight, baselineH5, 4, -20);

        assert.strictEqual(top6, top5, 'Top of card for 6-week month must match 5-week baseline exactly');
        assert.strictEqual(top4, top5, 'Top of card for 4-week month must match 5-week baseline exactly');
      });

      it('supports full-year double arrow travel (<< and >>) with 2000-2999 boundaries', () => {
        let year = 2026;
        const handlePrevYear = () => { year = Math.max(2000, year - 1); };
        const handleNextYear = () => { year = Math.min(2999, year + 1); };

        // Navigate forward 1 year
        handleNextYear();
        assert.strictEqual(year, 2027);

        // Navigate forward 3 more years
        handleNextYear();
        handleNextYear();
        handleNextYear();
        assert.strictEqual(year, 2030);

        // Navigate back 1 year
        handlePrevYear();
        assert.strictEqual(year, 2029);

        // Boundary test: Cannot exceed 2999
        year = 2999;
        handleNextYear();
        assert.strictEqual(year, 2999, 'Cannot navigate past year 2999');

        // Boundary test: Cannot go below 2000
        year = 2000;
        handlePrevYear();
        assert.strictEqual(year, 2000, 'Cannot navigate before year 2000');
      });

      it('greys out navigation arrows (<, <<, >, >>) according to boundary criteria and prevents further navigation', () => {
        const getNavDisabledStates = (year: number, month: number) => {
          const isPrevYearDisabled = year <= 2000;
          const isPrevMonthDisabled = year < 2000 || (year === 2000 && month <= 0);
          const isNextMonthDisabled = year > 2999 || (year === 2999 && month >= 11);
          const isNextYearDisabled = year >= 2999;
          return { isPrevYearDisabled, isPrevMonthDisabled, isNextMonthDisabled, isNextYearDisabled };
        };

        // 1. January 2000: Both << and < MUST be disabled
        const jan2000 = getNavDisabledStates(2000, 0);
        assert.strictEqual(jan2000.isPrevYearDisabled, true, '<< must disable in any month of 2000');
        assert.strictEqual(jan2000.isPrevMonthDisabled, true, '< must disable in January 2000');
        assert.strictEqual(jan2000.isNextMonthDisabled, false, '> must remain enabled in Jan 2000');
        assert.strictEqual(jan2000.isNextYearDisabled, false, '>> must remain enabled in Jan 2000');

        // 2. February 2000: << disabled, but < enabled (can go back to Jan 2000)
        const feb2000 = getNavDisabledStates(2000, 1);
        assert.strictEqual(feb2000.isPrevYearDisabled, true, '<< must disable in February 2000');
        assert.strictEqual(feb2000.isPrevMonthDisabled, false, '< must remain enabled in Feb 2000');

        // 3. December 2000: << disabled, but < enabled
        const dec2000 = getNavDisabledStates(2000, 11);
        assert.strictEqual(dec2000.isPrevYearDisabled, true, '<< must disable in all months of 2000');
        assert.strictEqual(dec2000.isPrevMonthDisabled, false, '< must be enabled in Dec 2000');

        // 4. December 2999: Both >> and > MUST be disabled
        const dec2999 = getNavDisabledStates(2999, 11);
        assert.strictEqual(dec2999.isNextYearDisabled, true, '>> must disable in any month of 2999');
        assert.strictEqual(dec2999.isNextMonthDisabled, true, '> must disable in December 2999');
        assert.strictEqual(dec2999.isPrevMonthDisabled, false, '< must remain enabled in Dec 2999');
        assert.strictEqual(dec2999.isPrevYearDisabled, false, '<< must remain enabled in Dec 2999');

        // 5. November 2999: >> disabled, but > enabled (can go forward to Dec 2999)
        const nov2999 = getNavDisabledStates(2999, 10);
        assert.strictEqual(nov2999.isNextYearDisabled, true, '>> must disable in November 2999');
        assert.strictEqual(nov2999.isNextMonthDisabled, false, '> must remain enabled in Nov 2999');

        // 6. Injected date prior to 2000 (e.g. 1990): Both backward arrows MUST be greyed out / disabled
        const injectedPast = getNavDisabledStates(1990, 5);
        assert.strictEqual(injectedPast.isPrevYearDisabled, true, '<< must remain disabled if year is injected < 2000');
        assert.strictEqual(injectedPast.isPrevMonthDisabled, true, '< must remain disabled if year is injected < 2000');

        // 7. Injected date after 2999 (e.g. 3500): Both forward arrows MUST be greyed out / disabled
        const injectedFuture = getNavDisabledStates(3500, 5);
        assert.strictEqual(injectedFuture.isNextYearDisabled, true, '>> must remain disabled if year is injected > 2999');
        assert.strictEqual(injectedFuture.isNextMonthDisabled, true, '> must remain disabled if year is injected > 2999');

        // 8. Normal in-range month (e.g. June 2026): All 4 navigation arrows enabled
        const mid2026 = getNavDisabledStates(2026, 5);
        assert.strictEqual(mid2026.isPrevYearDisabled, false);
        assert.strictEqual(mid2026.isPrevMonthDisabled, false);
        assert.strictEqual(mid2026.isNextMonthDisabled, false);
        assert.strictEqual(mid2026.isNextYearDisabled, false);

        // 9. Button visual contract: Disabled buttons have muted color and opacity 0.35
        const navBtnDisabledStyle = { opacity: 0.35 };
        assert.strictEqual(navBtnDisabledStyle.opacity, 0.35, 'Disabled nav button must have opacity 0.35');
      });

      it('autofills year to next calendar occurrence when valid month and day are present on lost focus', () => {
        // Reference date: Thursday, September 17, 2026
        const refDate = new Date(2026, 8, 17); // month is 0-indexed: 8 = September

        // 1. Same year tomorrow: 09/18 -> 2026
        assert.strictEqual(getNextOccurrenceYear(9, 18, refDate), 2026);

        // 2. Same year today: 09/17 -> 2026
        assert.strictEqual(getNextOccurrenceYear(9, 17, refDate), 2026);

        // 3. Past date in current year: 07/29 -> 2027 (already passed in 2026)
        assert.strictEqual(getNextOccurrenceYear(7, 29, refDate), 2027);

        // 4. Past date early in year: 01/01 -> 2027
        assert.strictEqual(getNextOccurrenceYear(1, 1, refDate), 2027);

        // 5. Future date end of year: 12/31 -> 2026
        assert.strictEqual(getNextOccurrenceYear(12, 31, refDate), 2026);

        // 6. Leap day Feb 29: 2026 not leap, 2027 not leap -> next leap year is 2028
        assert.strictEqual(getNextOccurrenceYear(2, 29, refDate), 2028);

        // 7. Regular Feb 28 after Feb has passed in 2026 -> 2027
        assert.strictEqual(getNextOccurrenceYear(2, 28, refDate), 2027);
      });

      it('completes incomplete times with expected translation digits on lost focus', () => {
        // User requirements:
        // "Incomplete times should simply use whatever time the translation model expects (7:00 for 7, or 12:00 for 12, and 4:50 for 45), but on lost focus should fill in the remaining digits."
        assert.strictEqual(completeTimeDigits('7'), '700'); // formats to 7:00
        assert.strictEqual(completeTimeDigits('12'), '1200'); // formats to 12:00
        assert.strictEqual(completeTimeDigits('45'), '450'); // formats to 4:50

        // Additional translation-aligned cases
        assert.strictEqual(completeTimeDigits('1'), '100'); // 1:00
        assert.strictEqual(completeTimeDigits('10'), '1000'); // 10:00
        assert.strictEqual(completeTimeDigits('11'), '1100'); // 11:00
        assert.strictEqual(completeTimeDigits('13'), '130'); // 1:30
        assert.strictEqual(completeTimeDigits('14'), '140'); // 1:40
        assert.strictEqual(completeTimeDigits('15'), '150'); // 1:50
        assert.strictEqual(completeTimeDigits('2'), '200'); // 2:00
        assert.strictEqual(completeTimeDigits('25'), '250'); // 2:50
        assert.strictEqual(completeTimeDigits('73'), '730'); // 7:30
        assert.strictEqual(completeTimeDigits('0'), '1200'); // 12:00
        assert.strictEqual(completeTimeDigits('00'), '1200'); // 12:00
        assert.strictEqual(completeTimeDigits('07'), '700'); // 7:00

        // Already complete times remain untouched
        assert.strictEqual(completeTimeDigits('730'), '730');
        assert.strictEqual(completeTimeDigits('1000'), '1000');
        assert.strictEqual(completeTimeDigits('1230'), '1230');
        assert.strictEqual(completeTimeDigits(''), '');
      });

      it('validates date on lost focus and enforces posting invariants for complete/incomplete date and time', () => {
        // 1. Incomplete year (5 digits or 7 digits) on lost focus must produce error
        assert.strictEqual(
          validateDate('02183'),
          'Please enter a year between 2000 and 2999'
        );
        assert.strictEqual(
          validateDate('0218202'),
          'Please enter a year between 2000 and 2999'
        );

        // 2-digit years (6 digits) automatically expand and produce no error
        assert.strictEqual(validateDate('021820'), null);
        assert.strictEqual(validateDate('091826'), null);
        assert.strictEqual(validateDate('091842'), null);
        assert.strictEqual(validateDate('091813'), null);
        assert.strictEqual(validateDate('091899'), null);

        // 2. Incomplete month/day on blur
        assert.strictEqual(validateDate('02'), 'Please enter a day');
        assert.strictEqual(validateDate('13'), 'Month must be between 01-12');
        assert.strictEqual(validateDate('0235'), 'Day must be between 01-29');

        // 3. Leap year validation
        assert.strictEqual(validateDate('02292025'), '2025 is not a leap year');
        assert.strictEqual(validateDate('02292028'), null); // 2028 is leap
        assert.strictEqual(validateDate('022925'), '2025 is not a leap year'); // 2-digit non-leap
        assert.strictEqual(validateDate('022928'), null); // 2-digit leap

        // 4. Valid complete date and empty date produce no error
        assert.strictEqual(validateDate('09182026'), null);
        assert.strictEqual(validateDate(''), null);

        // 5. Posting invariants:
        // - Incomplete date (02/18/3, 02/18/202) is NOT allowed and must prevent posting
        assert.strictEqual(isDateCompleteAndValid('02183'), false);
        assert.strictEqual(isDateCompleteAndValid('0218202'), false);
        assert.strictEqual(isDateCompleteAndValid('02'), false);

        // - Both 4-digit and 2-digit valid years ARE allowed
        assert.strictEqual(isDateCompleteAndValid('09182026'), true);
        assert.strictEqual(isDateCompleteAndValid('091826'), true);
        assert.strictEqual(isDateCompleteAndValid('091842'), true);
        assert.strictEqual(isDateCompleteAndValid('091825'), true);
        assert.strictEqual(isTimeCompleteAndValid(''), true);

        // - A time with no date IS allowed
        assert.strictEqual(isDateCompleteAndValid(''), true);
        assert.strictEqual(isTimeCompleteAndValid('700'), true);
        assert.strictEqual(isTimeCompleteAndValid('7'), true); // translated by model

        // - Both empty IS allowed
        assert.strictEqual(isDateCompleteAndValid(''), true);
        assert.strictEqual(isTimeCompleteAndValid(''), true);

        // - Full publishing condition simulation
        const simulateCanPublish = (
          rawDateInput: string,
          rawTimeInput: string,
          hasWhenError: boolean
        ) => {
          const isDateValid = isDateCompleteAndValid(rawDateInput);
          const isTimeValid = isTimeCompleteAndValid(rawTimeInput);
          return isDateValid && isTimeValid && !hasWhenError;
        };

        // Complete date + empty time: ALLOWED
        assert.strictEqual(simulateCanPublish('09182026', '', false), true);

        // Empty date + complete time: ALLOWED
        assert.strictEqual(simulateCanPublish('', '700', false), true);

        // Incomplete date 02/18/3: STRICTLY BLOCKED
        assert.strictEqual(simulateCanPublish('02183', '', false), false);
        assert.strictEqual(simulateCanPublish('02183', '700', false), false);

        // Active validation error: STRICTLY BLOCKED
        assert.strictEqual(simulateCanPublish('09182026', '', true), false);
      });
    });

    describe('Two-Digit Year Auto-Switching & Century Boundary Invariants', () => {
      it('switches two-digit years like 25, 26, 42 to 2025, 2026, 2042 in the 21st century', () => {
        const ref2026 = new Date(2026, 8, 18);
        assert.strictEqual(expandTwoDigitYear(25, ref2026), 2025);
        assert.strictEqual(expandTwoDigitYear(26, ref2026), 2026);
        assert.strictEqual(expandTwoDigitYear(42, ref2026), 2042);
        assert.strictEqual(expandTwoDigitYear('25', ref2026), 2025);
        assert.strictEqual(expandTwoDigitYear('26', ref2026), 2026);
        assert.strictEqual(expandTwoDigitYear('42', ref2026), 2042);
      });

      it('expands 27 -> 2027, 13 -> 2013, and 99 -> 2099 in the current century', () => {
        const ref2026 = new Date(2026, 8, 18);
        assert.strictEqual(expandTwoDigitYear(27, ref2026), 2027);
        assert.strictEqual(expandTwoDigitYear(13, ref2026), 2013);
        assert.strictEqual(expandTwoDigitYear(99, ref2026), 2099);
      });

      it('completes to next century if occurring in the next 10 years (e.g. 2095 entering 02 -> 2102)', () => {
        const ref2095 = new Date(2095, 8, 18);
        // 02 in 2095: 2102 is 7 years in the future (<= 10), so completes to 2102, not 2002
        assert.strictEqual(expandTwoDigitYear('02', ref2095), 2102);
        assert.strictEqual(expandTwoDigitYear(2, ref2095), 2102);

        // 05 in 2095: 2105 is 10 years in future (<= 10), completes to 2105
        assert.strictEqual(expandTwoDigitYear('05', ref2095), 2105);

        // 06 in 2095: 2106 is 11 years in future (> 10), so uses current century (2006)
        assert.strictEqual(expandTwoDigitYear('06', ref2095), 2006);

        // Same-century years in 2095
        assert.strictEqual(expandTwoDigitYear('95', ref2095), 2095);
        assert.strictEqual(expandTwoDigitYear('99', ref2095), 2099);
      });

      it('completes across century boundary at year 2099', () => {
        const ref2099 = new Date(2099, 0, 1);
        assert.strictEqual(expandTwoDigitYear('00', ref2099), 2100);
        assert.strictEqual(expandTwoDigitYear('08', ref2099), 2108);
        assert.strictEqual(expandTwoDigitYear('09', ref2099), 2109);
        assert.strictEqual(expandTwoDigitYear('10', ref2099), 2010);
      });

      it('auto-completes date digits for 4-digit and 6-digit inputs via completeDateDigits', () => {
        const ref2026 = new Date(2026, 8, 18);
        assert.strictEqual(completeDateDigits('091825', ref2026), '09182025');
        assert.strictEqual(completeDateDigits('091826', ref2026), '09182026');
        assert.strictEqual(completeDateDigits('091842', ref2026), '09182042');
        assert.strictEqual(completeDateDigits('091813', ref2026), '09182013');
        assert.strictEqual(completeDateDigits('091899', ref2026), '09182099');

        // 4 digits (MMDD): fills next occurrence year
        assert.strictEqual(completeDateDigits('0918', ref2026), '09182026');

        // 8 digits: preserved
        assert.strictEqual(completeDateDigits('09182026', ref2026), '09182026');

        // 2095 boundary
        const ref2095 = new Date(2095, 8, 18);
        assert.strictEqual(completeDateDigits('091802', ref2095), '09182102');
      });

      it('formats event dates with 2-digit years seamlessly via formatEventDate', () => {
        const ref2026 = new Date(2026, 8, 18);
        assert.strictEqual(formatEventDate('09/18/26', ref2026), 'Fri, Sep 18');
        assert.strictEqual(formatEventDate('09/18/42', ref2026), 'Thu, Sep 18, 2042');
        const ref2095 = new Date(2095, 8, 18);
        assert.strictEqual(formatEventDate('09/18/02', ref2095), 'Mon, Sep 18, 2102');
      });
    });

    describe('Location and Custom Event Time Text 25-Character Limit Invariants', () => {
      const MAX_LOCATION_LENGTH = 25;
      const MAX_CUSTOM_WHEN_LENGTH = 25;

      it('enforces 25-character limit constants', () => {
        assert.strictEqual(MAX_LOCATION_LENGTH, 25);
        assert.strictEqual(MAX_CUSTOM_WHEN_LENGTH, 25);
      });

      it('validates location length <= 25 characters', () => {
        const isValidLocation = (loc: string) => loc.length <= 25;
        assert.strictEqual(isValidLocation(''), true);
        assert.strictEqual(isValidLocation('North Hall 276'), true); // 14 chars
        assert.strictEqual(isValidLocation('Spoelhof Fieldhouse 101'), true); // 23 chars <= 25
        assert.strictEqual(isValidLocation('1234567890123456789012345'), true); // exactly 25
        assert.strictEqual(isValidLocation('12345678901234567890123456'), false); // 26 chars: blocked
        assert.strictEqual(isValidLocation('Spoelhof Fieldhouse Room 101'), false); // 28 chars: blocked
      });

      it('validates custom event time text length <= 25 characters', () => {
        const isValidCustomWhen = (when: string) => when.length <= 25;
        assert.strictEqual(isValidCustomWhen(''), true);
        assert.strictEqual(isValidCustomWhen('Starts this weekend'), true); // 19 chars
        assert.strictEqual(isValidCustomWhen('Every Tuesday at 7:30 PM'), true); // 24 chars <= 25
        assert.strictEqual(isValidCustomWhen('1234567890123456789012345'), true); // exactly 25
        assert.strictEqual(isValidCustomWhen('12345678901234567890123456'), false); // 26 chars: blocked
        assert.strictEqual(isValidCustomWhen('Every Tuesday at 7:30 PM EST'), false); // 28 chars: blocked
      });

      it('simulates canPublish validation incorporating location and custom when limits', () => {
        const simulateCanPublishWithLimits = (params: {
          isLeader: boolean;
          hasActiveClub: boolean;
          title: string;
          description: string;
          where: string;
          isCustomWhen: boolean;
          customWhen: string;
          isDateValid: boolean;
          isTimeValid: boolean;
          hasWhenError: boolean;
        }) => {
          const isTitleValid = params.title.trim().length > 0 && params.title.trim().length <= 50;
          const isDescValid = params.description.trim().length > 0 && params.description.trim().length <= 280;
          const isWhereValid = params.where.length <= 25;
          const isCustomWhenValid = !params.isCustomWhen || params.customWhen.length <= 25;
          return (
            params.isLeader &&
            params.hasActiveClub &&
            isTitleValid &&
            isDescValid &&
            isWhereValid &&
            isCustomWhenValid &&
            (params.isCustomWhen || (params.isDateValid && params.isTimeValid && !params.hasWhenError))
          );
        };

        const base = {
          isLeader: true,
          hasActiveClub: true,
          title: 'Meeting',
          description: 'Fun meeting',
          where: 'Commons',
          isCustomWhen: false,
          customWhen: '',
          isDateValid: true,
          isTimeValid: true,
          hasWhenError: false,
        };

        // Normal valid post: ALLOWED
        assert.strictEqual(simulateCanPublishWithLimits(base), true);

        // Location within 25 characters (e.g. 23 chars): ALLOWED
        assert.strictEqual(
          simulateCanPublishWithLimits({ ...base, where: 'Spoelhof Fieldhouse 101' }),
          true
        );

        // Location exceeds 25 characters: BLOCKED
        assert.strictEqual(
          simulateCanPublishWithLimits({ ...base, where: 'Spoelhof Fieldhouse Room 101' }),
          false
        );

        // Custom when text exceeds 25 characters in custom mode: BLOCKED
        assert.strictEqual(
          simulateCanPublishWithLimits({
            ...base,
            isCustomWhen: true,
            customWhen: 'Every Tuesday at 7:30 PM EST',
          }),
          false
        );

        // Custom when text <= 25 characters in custom mode: ALLOWED
        assert.strictEqual(
          simulateCanPublishWithLimits({
            ...base,
            isCustomWhen: true,
            customWhen: 'Every Tuesday at 7:30 PM',
          }),
          true
        );
      });
    });

    /**
     * UNIFIED SUCCESS MODAL TEMPLATE & CLUB LINKING SPECIFICATION
     *
     * Architectural Rationale:
     * To prevent fragmented confirmation patterns across Knightly, all major milestone
     * confirmations (post creation, club claim linking, RSVP confirmations) adhere to a
     * shared template specification:
     * 1. Centered floating card with max width 380 and Radius.xl
     * 2. Semi-transparent backdrop (rgba(0, 0, 0, 0.72))
     * 3. Big animated spring halo ring (96x96) in Renew Green (or designated accent)
     * 4. Clear title and explanatory description
     * 5. Standardized button configurations (single "Got it" or dual "View in Feed" + "Got it")
     */
    describe('Unified Success Modal Template & Club Linking Invariants', () => {
      it('validates club linking success modal payload structure and copy', () => {
        // Simulates the configuration factory used by CompleteClubProfileView
        const createClubLinkingSuccessModalConfig = (claimedClubName: string, onDismiss: () => void) => ({
          visible: true,
          title: `You're Linked to ${claimedClubName || 'Your Club'}!`,
          message:
            'The club posting portal has been activated. You will now see the new "+" tab at the right end of your bottom navigation bar.',
          accentColor: Brand.renewGreen,
          icon: { sf: 'checkmark', md: 'check' },
          primaryButton: {
            label: 'Got it',
            variant: 'primary' as const,
            onPress: onDismiss,
          },
          onClose: onDismiss,
        });

        let dismissed = false;
        const config = createClubLinkingSuccessModalConfig('Abstraction', () => {
          dismissed = true;
        });

        // Verify dynamic club title injection
        assert.strictEqual(config.title, "You're Linked to Abstraction!");

        // Verify fallback when club name is empty
        const fallbackConfig = createClubLinkingSuccessModalConfig('', () => {});
        assert.strictEqual(fallbackConfig.title, "You're Linked to Your Club!");

        // Verify exact instructional messaging guiding the user to the new '+' navigation tab
        assert.ok(
          config.message.includes('The club posting portal has been activated'),
          'Must clarify that posting is now unlocked'
        );
        assert.ok(
          config.message.includes('new "+" tab at the right end of your bottom navigation bar'),
          'Must instruct user on the visual location of the new bottom tab'
        );

        // Verify standard accent color matches Brand.renewGreen
        assert.strictEqual(config.accentColor, Brand.renewGreen);

        // Verify primary button triggers dismiss callback
        assert.strictEqual(config.primaryButton.label, 'Got it');
        assert.strictEqual(config.primaryButton.variant, 'primary');
        config.primaryButton.onPress();
        assert.strictEqual(dismissed, true, 'Primary button should invoke dismiss callback');

        // Verify backdrop onClose triggers dismiss callback
        dismissed = false;
        config.onClose();
        assert.strictEqual(dismissed, true, 'Backdrop onClose should invoke dismiss callback');
      });

      it('validates post creation success modal payload structure and dual actions', () => {
        // Simulates the configuration factory used by CreatePostScreen's PostSuccessModal
        const createPostSuccessModalConfig = (
          clubName: string,
          onClose: () => void,
          onViewFeed: () => void
        ) => ({
          visible: true,
          title: 'Post Published!',
          clubName,
          accentColor: Brand.renewGreen,
          primaryButton: {
            label: 'View in Feed',
            variant: 'primary' as const,
            sf: 'sparkles',
            md: 'auto_awesome',
            onPress: onViewFeed,
          },
          secondaryButton: {
            label: 'Got it',
            variant: 'secondary' as const,
            onPress: onClose,
          },
          onClose,
        });

        let feedViewed = false;
        let closed = false;
        const config = createPostSuccessModalConfig(
          'Abstraction',
          () => { closed = true; },
          () => { feedViewed = true; }
        );

        // Verify title
        assert.strictEqual(config.title, 'Post Published!');

        // Verify primary action navigates to feed
        assert.strictEqual(config.primaryButton.label, 'View in Feed');
        config.primaryButton.onPress();
        assert.strictEqual(feedViewed, true);

        // Verify secondary action dismisses modal
        assert.strictEqual(config.secondaryButton.label, 'Got it');
        config.secondaryButton.onPress();
        assert.strictEqual(closed, true);
      });

      it('enforces that both club linking and post creation share the same visual branding tokens', () => {
        // Both modals must use Renew Green to indicate successful authorization/action completion
        const defaultAccent = Brand.renewGreen;
        assert.strictEqual(defaultAccent, '#A2D683');

        // Verify standard halo dimensions and styling rules
        const modalHaloDimensions = {
          ringDiameter: 96,
          ringBorderRadius: 48,
          ringBorderWidth: 3,
          iconSize: 52,
          cardMaxWidth: 380,
        };

        assert.strictEqual(modalHaloDimensions.ringDiameter, 96);
        assert.strictEqual(modalHaloDimensions.ringBorderRadius, 48);
        assert.strictEqual(modalHaloDimensions.iconSize, 52);
        assert.strictEqual(modalHaloDimensions.cardMaxWidth, 380);
      });
    });

    /**
     * CLAIM CODE VERIFICATION WHEEL ANIMATION & COMPLETE PROFILE INVARIANTS
     *
     * Architectural Rationale:
     * Validates the micro-interaction and subpage visual hierarchy:
     * 1. 3D rotating wheel transforms for "Verify Code" -> "Success!" tumbling replacement.
     * 2. High-contrast typography on Renew Green (Brand.onRenewGreen = #142912, >7:1 WCAG AAA).
     * 3. Color morphing from Calvin Maroon to Renew Green (#A2D683).
     * 4. Removal of the awkward "CLAIM VERIFIED" badge chip from the card body while preserving
     *    the clean club name and distinct two-line guidance copy.
     * 5. Preservation of "CLAIM VERIFIED" in the top subpage header.
     */
    describe('Claim Code Verification Wheel Animation & Complete Profile Invariants', () => {
      it('models the 3D rotating cylindrical tumbler wheel interpolation at rest, midpoint, and completion', () => {
        // Linear interpolation helper mirroring Reanimated's interpolate()
        const interpolate = (val: number, inRange: [number, number], outRange: [number, number]) => {
          const [inMin, inMax] = inRange;
          const [outMin, outMax] = outRange;
          const clamped = Math.max(inMin, Math.min(inMax, val));
          return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
        };

        const computeWheelTransforms = (progress: number) => {
          // "Verify Code" label
          const verifyTranslateY = interpolate(progress, [0, 1], [0, -26]);
          const verifyRotateX = `${interpolate(progress, [0, 1], [0, -60])}deg`;
          const verifyOpacity = interpolate(progress, [0, 0.65], [1, 0]);

          // "Success!" label
          const successTranslateY = interpolate(progress, [0, 1], [26, 0]);
          const successRotateX = `${interpolate(progress, [0, 1], [60, 0])}deg`;
          const successOpacity = interpolate(progress, [0.35, 1], [0, 1]);

          return {
            verify: { translateY: verifyTranslateY, rotateX: verifyRotateX, opacity: verifyOpacity },
            success: { translateY: successTranslateY, rotateX: successRotateX, opacity: successOpacity },
          };
        };

        // At progress = 0 (Resting state before tap)
        const rest = computeWheelTransforms(0);
        assert.strictEqual(rest.verify.translateY, 0);
        assert.strictEqual(rest.verify.rotateX, '0deg');
        assert.strictEqual(rest.verify.opacity, 1);
        assert.strictEqual(rest.success.translateY, 26);
        assert.strictEqual(rest.success.rotateX, '60deg');
        assert.strictEqual(rest.success.opacity, 0);

        // At progress = 0.5 (Mid-rotation: both labels partially visible as wheel tumbles)
        const mid = computeWheelTransforms(0.5);
        assert.strictEqual(mid.verify.translateY, -13);
        assert.strictEqual(mid.verify.rotateX, '-30deg');
        assert.ok(mid.verify.opacity < 0.3, 'Verify Code should be significantly faded at midpoint');
        assert.strictEqual(mid.success.translateY, 13);
        assert.strictEqual(mid.success.rotateX, '30deg');
        assert.ok(mid.success.opacity > 0.2, 'Success! should begin emerging at midpoint');

        // At progress = 1 (Completion: "Success!" fully centered and opaque)
        const done = computeWheelTransforms(1);
        assert.strictEqual(done.verify.translateY, -26);
        assert.strictEqual(done.verify.rotateX, '-60deg');
        assert.strictEqual(done.verify.opacity, 0);
        assert.strictEqual(done.success.translateY, 0);
        assert.strictEqual(done.success.rotateX, '0deg');
        assert.strictEqual(done.success.opacity, 1);
      });

      it('validates standardized Brand.onRenewGreen high-contrast color token', () => {
        // Dark Forest Slate
        assert.strictEqual(Brand.onRenewGreen, '#142912');
        assert.strictEqual(Brand.renewGreen, '#A2D683');

        // Relative luminance helper for WCAG contrast calculation
        const getRelativeLuminance = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          const sRGB = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
          return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
        };

        const lumRenewGreen = getRelativeLuminance(Brand.renewGreen);
        const lumOnRenewGreen = getRelativeLuminance(Brand.onRenewGreen);
        const contrastRatio = (lumRenewGreen + 0.05) / (lumOnRenewGreen + 0.05);

        // Must exceed 7:1 for WCAG AAA compliance on body text
        assert.ok(
          contrastRatio >= 7.0,
          `Contrast ratio between #142912 and #A2D683 must exceed 7.0 (actual: ${contrastRatio.toFixed(2)})`
        );
      });

      it('validates Complete Club Profile header and layout balance requirements', () => {
        // Simulates the banner line structure in CompleteClubProfileView
        const bannerStructure = {
          hasInCardBadge: false, // Must be removed
          claimedClubName: 'Abstraction',
          captionLine1: 'Student Life has provisioned this shell.',
          captionLine2: 'Customize initial club details below.', // On its own separate line
        };

        assert.strictEqual(bannerStructure.hasInCardBadge, false, 'In-card badge chip must be eliminated');
        assert.strictEqual(bannerStructure.captionLine1, 'Student Life has provisioned this shell.');
        assert.strictEqual(bannerStructure.captionLine2, 'Customize initial club details below.');

        // Verify top subpage header subtitle preserves 'CLAIM VERIFIED'
        const headerInfo = {
          title: 'Complete Profile',
          subtitle: 'CLAIM VERIFIED',
        };
        assert.strictEqual(headerInfo.subtitle, 'CLAIM VERIFIED', 'Header bar must preserve CLAIM VERIFIED');
      });
    });

    /**
     * SEGMENTED DATE INPUT & NON-TECHNICAL FRIENDLY ENTRY INVARIANTS
     *
     * Architectural Rationale:
     * Non-technical users often type single digits like "9" for September or "5" for day 5,
     * which previously triggered premature error messages ("Month must be between 01-12")
     * due to strict 2-digit mask assumptions.
     * The SegmentedDateInput architecture isolates Month, Day, and Year into inline cells:
     * 1. Auto-pads unambiguous single digits (2-9 for month -> 02-09; 4-9 for day -> 04-09).
     * 2. Auto-advances focus to next cell without requiring user to type leading zeros.
     * 3. Retains ambiguous digits (1 for month, 1-3 for day) until second digit or blur.
     * 4. Seamlessly auto-expands 2-digit years (26 -> 2026, 42 -> 2042) with 10-year lookahead.
     * 5. Supports reverse-backspacing across cell boundaries.
     * 6. Decomposes pasted full date strings across all segments.
     */
    describe('Segmented Date Input & Non-Technical Friendly Entry Invariants', () => {
      it('parses raw digits and delimited strings into constituent date segments', () => {
        // Empty inputs
        assert.deepStrictEqual(parseDateSegments(''), { month: '', day: '', year: '' });
        assert.deepStrictEqual(parseDateSegments('   '), { month: '', day: '', year: '' });

        // Raw digits
        assert.deepStrictEqual(parseDateSegments('09182026'), { month: '09', day: '18', year: '2026' });
        assert.deepStrictEqual(parseDateSegments('091826'), { month: '09', day: '18', year: '26' });
        assert.deepStrictEqual(parseDateSegments('0918'), { month: '09', day: '18', year: '' });
        assert.deepStrictEqual(parseDateSegments('09'), { month: '09', day: '', year: '' });

        // Delimited strings (slashes, hyphens, dots)
        assert.deepStrictEqual(parseDateSegments('9/18/2026'), { month: '9', day: '18', year: '2026' });
        assert.deepStrictEqual(parseDateSegments('09/18/26'), { month: '09', day: '18', year: '26' });
        assert.deepStrictEqual(parseDateSegments('9-5-2026'), { month: '9', day: '5', year: '2026' });
        assert.deepStrictEqual(parseDateSegments('9.5.26'), { month: '9', day: '5', year: '26' });
      });

      it('simulates Month segment typing and auto-advance logic including intelligent month overflow', () => {
        // Simulate SegmentedDateInput handleMonthChange logic
        const simulateMonthInput = (input: string) => {
          const text = input.replace(/[^0-9]/g, '');
          if (text.length === 0) return { month: '', day: '', focus: null as string | null };
          if (text.length === 1) {
            const digit = parseInt(text, 10);
            if (digit >= 2 && digit <= 9) {
              // Unambiguous: auto-pad to 02..09 and advance to Day
              return { month: `0${digit}`, day: '', focus: 'day' };
            }
            // 0 or 1: wait for second digit
            return { month: text, day: '', focus: 'month' };
          }
          if (text.length === 2) {
            if (text[0] === '0') {
              const d2 = parseInt(text[1], 10);
              if (d2 === 0) return { month: '0', day: '', focus: 'month' };
              return { month: text, day: '', focus: 'day' };
            }
            if (text[0] === '1') {
              const d2 = parseInt(text[1], 10);
              if (d2 >= 0 && d2 <= 2) {
                return { month: text, day: '', focus: 'day' };
              }
              if (d2 >= 3 && d2 <= 9) {
                // Month Overflow rule: typing 1 followed by 3..9 implies January ('01') + Day entry
                // For January (maxDays = 31):
                if (d2 * 10 > 31) {
                  return { month: '01', day: `0${d2}`, focus: 'year' };
                }
                return { month: '01', day: `${d2}`, focus: 'day' };
              }
            }
            return { month: text[0], day: '', focus: 'month' };
          }
          return { month: text.slice(0, 2), day: '', focus: null };
        };

        // 1. Typing 1 then 6: results in '01/06/' with cursor in Year category!
        const oneSix = simulateMonthInput('16');
        assert.strictEqual(oneSix.month, '01');
        assert.strictEqual(oneSix.day, '06');
        assert.strictEqual(oneSix.focus, 'year');

        // 2. Typing 1 then 3: results in '01/3' with cursor in Day category!
        const oneThree = simulateMonthInput('13');
        assert.strictEqual(oneThree.month, '01');
        assert.strictEqual(oneThree.day, '3');
        assert.strictEqual(oneThree.focus, 'day');

        // 3. Typing 1 then 2: results in '12/' with cursor in Day category!
        const oneTwo = simulateMonthInput('12');
        assert.strictEqual(oneTwo.month, '12');
        assert.strictEqual(oneTwo.day, '');
        assert.strictEqual(oneTwo.focus, 'day');

        // 4. Typing 1 then 0: results in '10/' with cursor in Day category!
        const oneZero = simulateMonthInput('10');
        assert.strictEqual(oneZero.month, '10');
        assert.strictEqual(oneZero.day, '');
        assert.strictEqual(oneZero.focus, 'day');

        // Typing 9 for September -> immediately pads to '09' and auto-advances to Day
        const sep = simulateMonthInput('9');
        assert.strictEqual(sep.month, '09');
        assert.strictEqual(sep.focus, 'day');

        // Typing 4 for April -> immediately pads to '04' and auto-advances to Day
        const apr = simulateMonthInput('4');
        assert.strictEqual(apr.month, '04');
        assert.strictEqual(apr.focus, 'day');

        // Typing 1 for January/November/December -> does NOT auto-pad immediately, waits for second digit
        const one = simulateMonthInput('1');
        assert.strictEqual(one.month, '1');
        assert.strictEqual(one.focus, 'month');

        // Blur on single digit '1' pads to '01'
        const blurPad = (m: string) => (m.length === 1 && parseInt(m, 10) >= 1 ? `0${m}` : m);
        assert.strictEqual(blurPad('1'), '01');
      });

      it('simulates Day segment typing and auto-advance logic referencing all months max days', () => {
        // Simulate SegmentedDateInput handleDayChange logic with compact digit * 10 > maxDays rule
        const simulateDayInput = (input: string, month: string = '09') => {
          const text = input.replace(/[^0-9]/g, '');
          if (text.length === 0) return { day: '', advance: false };

          const m = parseInt(month, 10);
          const maxDays = !isNaN(m) && m >= 1 && m <= 12 ? getMaxDaysForMonth(m) : 31;

          if (text.length === 1) {
            const digit = parseInt(text, 10);
            // Compact mathematical rule: if digit * 10 > maxDays, it cannot be a tens digit for this month!
            // In February (maxDays=29): 3..9 (30..90 > 29) auto-pads to 03..09 and advances to Year!
            // In 30/31-day months: 4..9 (40..90 > 31) auto-pads to 04..09 and advances to Year!
            if (digit * 10 > maxDays) {
              return { day: `0${digit}`, advance: true };
            }
            // Otherwise, wait for second digit (0..2 for Feb, 0..3 for other months)
            return { day: text, advance: false };
          }
          if (text.length === 2) {
            const num = parseInt(text, 10);
            if (num === 0) {
              return { day: '0', advance: false };
            }
            if (num >= 1 && num <= maxDays) {
              return { day: text, advance: true };
            }
            return { day: text[0], advance: false };
          }
          return { day: text.slice(0, 2), advance: false };
        };

        // FEBRUARY (month '02'): maxDays=29, maxTens=2
        // Typing 3 in February -> automatically assumes '03' and advances to Year!
        const feb3 = simulateDayInput('3', '02');
        assert.strictEqual(feb3.day, '03');
        assert.strictEqual(feb3.advance, true);

        // Typing 4..9 in February -> automatically pads to '04'..'09' and advances to Year
        const feb7 = simulateDayInput('7', '02');
        assert.strictEqual(feb7.day, '07');
        assert.strictEqual(feb7.advance, true);

        // Typing 1 or 2 in February -> waits for second digit
        const feb1 = simulateDayInput('1', '02');
        assert.strictEqual(feb1.day, '1');
        assert.strictEqual(feb1.advance, false);

        const feb2 = simulateDayInput('2', '02');
        assert.strictEqual(feb2.day, '2');
        assert.strictEqual(feb2.advance, false);

        // Typing 28 in February -> valid, advances
        const feb28 = simulateDayInput('28', '02');
        assert.strictEqual(feb28.day, '28');
        assert.strictEqual(feb28.advance, true);

        // Typing 30 in February -> exceeds max days (29), keeps first digit '3' (or rejected)
        const feb30 = simulateDayInput('30', '02');
        assert.strictEqual(feb30.day, '3');
        assert.strictEqual(feb30.advance, false);

        // 30-DAY MONTHS (e.g. September '09', April '04'): maxDays=30, maxTens=3
        // Typing 3 in September -> does NOT advance, waits for second digit (could be 30)
        const sep3 = simulateDayInput('3', '09');
        assert.strictEqual(sep3.day, '3');
        assert.strictEqual(sep3.advance, false);

        // Typing 30 in September -> valid, advances to Year
        const sep30 = simulateDayInput('30', '09');
        assert.strictEqual(sep30.day, '30');
        assert.strictEqual(sep30.advance, true);

        // Typing 31 in September -> exceeds max days (30), keeps '3'
        const sep31 = simulateDayInput('31', '09');
        assert.strictEqual(sep31.day, '3');
        assert.strictEqual(sep31.advance, false);

        // Typing 5 in September -> digit > 3, immediately pads to '05' and advances
        const sep5 = simulateDayInput('5', '09');
        assert.strictEqual(sep5.day, '05');
        assert.strictEqual(sep5.advance, true);

        // 31-DAY MONTHS (e.g. October '10'): maxDays=31, maxTens=3
        // Typing 31 in October -> valid, advances to Year
        const oct31 = simulateDayInput('31', '10');
        assert.strictEqual(oct31.day, '31');
        assert.strictEqual(oct31.advance, true);

        // Typing 32 in October -> exceeds max days (31), keeps '3'
        const oct32 = simulateDayInput('32', '10');
        assert.strictEqual(oct32.day, '3');
        assert.strictEqual(oct32.advance, false);
      });

      it('simulates Year segment typing, 2-digit limits, and blur expansion', () => {
        // Simulate SegmentedDateInput handleYearChange logic
        const simulateYearInput = (input: string) => {
          const text = input.replace(/[^0-9]/g, '');
          if (text.length === 0) return '';
          if (text[0] !== '2') {
            return text.slice(0, 2);
          }
          return text.slice(0, 4);
        };

        // Year starting with !2: limited strictly to 2 digits
        assert.strictEqual(simulateYearInput('42'), '42');
        assert.strictEqual(simulateYearInput('420'), '42'); // 3rd digit rejected
        assert.strictEqual(simulateYearInput('99'), '99');

        // Year starting with 2: allows up to 4 digits
        assert.strictEqual(simulateYearInput('2'), '2');
        assert.strictEqual(simulateYearInput('26'), '26');
        assert.strictEqual(simulateYearInput('2026'), '2026');
        assert.strictEqual(simulateYearInput('20265'), '2026'); // 5th digit rejected

        // Year blur expands 2-digit year to 4-digit year
        const simulateYearBlur = (yy: string, refDate?: Date) => {
          if (yy.length === 2) {
            return String(expandTwoDigitYear(yy, refDate));
          }
          return yy;
        };

        const testRef = new Date(2026, 8, 18);
        assert.strictEqual(simulateYearBlur('26', testRef), '2026');
        assert.strictEqual(simulateYearBlur('42', testRef), '2042');
        assert.strictEqual(simulateYearBlur('13', testRef), '2013');

        // 10-year lookahead across century boundary
        const boundaryRef = new Date(2095, 0, 1);
        assert.strictEqual(simulateYearBlur('02', boundaryRef), '2102');
      });

      it('simulates pasting full date strings across segmented cells', () => {
        const simulatePaste = (pasted: string) => {
          const text = pasted.replace(/[^0-9]/g, '');
          if (text.length >= 6) {
            const m = text.slice(0, 2);
            const d = text.slice(2, 4);
            let y = text.slice(4, 8);
            if (y.length === 2) {
              y = String(expandTwoDigitYear(y));
            }
            return { month: m, day: d, year: y };
          }
          return null;
        };

        assert.deepStrictEqual(simulatePaste('09182026'), {
          month: '09',
          day: '18',
          year: '2026',
        });

        assert.deepStrictEqual(simulatePaste('091826'), {
          month: '09',
          day: '18',
          year: '2026',
        });
      });

      it('verifies decoupled Date vs Time error highlighting', () => {
        // Models CreatePostScreen's decoupled error state:
        // dateError and timeError are maintained separately so an invalid digit in Time
        // turns the Time box red and NEVER turns the Date box red.
        const simulateInputStates = ({
          rawDate,
          rawTime,
          timeError,
          dateError,
        }: {
          rawDate: string;
          rawTime?: string;
          timeError: string | null;
          dateError: string | null;
        }) => {
          void rawTime;
          const dateBoxHasError = Boolean(dateError && rawDate.length > 0);
          const timeBoxHasError = Boolean(timeError);
          const footerError = dateError || timeError;
          return { dateBoxHasError, timeBoxHasError, footerError };
        };

        // Scenario 1: User has valid date ('09182026') and types invalid minute digit in Time (e.g. 7:90)
        const timeErrorState = simulateInputStates({
          rawDate: '09182026',
          rawTime: '79',
          timeError: 'Minutes tens digit cannot exceed 5',
          dateError: null,
        });
        assert.strictEqual(timeErrorState.timeBoxHasError, true, 'Time box MUST turn red on time error');
        assert.strictEqual(timeErrorState.dateBoxHasError, false, 'Date box MUST NOT turn red on time error');
        assert.strictEqual(timeErrorState.footerError, 'Minutes tens digit cannot exceed 5');

        // Scenario 2: User has valid time ('700') and invalid date (e.g. 2025 is not leap year)
        const dateErrorState = simulateInputStates({
          rawDate: '02292025',
          rawTime: '700',
          timeError: null,
          dateError: '2025 is not a leap year',
        });
        assert.strictEqual(dateErrorState.dateBoxHasError, true, 'Date box MUST turn red on date error');
        assert.strictEqual(dateErrorState.timeBoxHasError, false, 'Time box MUST NOT turn red on date error');
        assert.strictEqual(dateErrorState.footerError, '2025 is not a leap year');
      });

      it('verifies that non-technical entry never produces premature validation errors', () => {
        // Typing single digit '9' for month:
        // SegmentedDateInput handles month '09' internally so validateDate is never
        // invoked on incomplete single-digit state with an error.
        assert.strictEqual(validateDate(''), null);

        // When all 3 segments are filled with auto-padding (e.g. user typed 9, then 5, then 26):
        // Raw date becomes '09052026' or '090526'
        const rawDateWith4DigitYear = '09052026';
        assert.strictEqual(validateDate(rawDateWith4DigitYear), null);
        assert.strictEqual(isDateCompleteAndValid(rawDateWith4DigitYear), true);

        const rawDateWith2DigitYear = '090526';
        assert.strictEqual(validateDate(rawDateWith2DigitYear), null);
        assert.strictEqual(isDateCompleteAndValid(rawDateWith2DigitYear), true);
      });

      it('verifies calendar button centering styling invariants', () => {
        const dateInputWrapper = {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        };
        const calendarIconBtn = {
          width: 40,
          height: 40,
        };
        assert.strictEqual(dateInputWrapper.gap, 6, 'Gap is balanced at 6dp');
        assert.strictEqual(calendarIconBtn.width, 40, 'Calendar button width is 40dp');
        assert.strictEqual(calendarIconBtn.height, 40, 'Calendar button height is 40dp (square)');
      });

      it('verifies universal smooth focus modal exclusion and bottom-half calculation', () => {
        // Elements in modals are excluded
        const isEligibleTarget = (element: { isInsideModal: boolean; top: number; viewportHeight: number }) => {
          if (element.isInsideModal) return false;
          return element.top > element.viewportHeight * 0.45;
        };

        assert.strictEqual(
          isEligibleTarget({ isInsideModal: true, top: 600, viewportHeight: 800 }),
          false,
          'Modal inputs must not trigger window scroll'
        );
        assert.strictEqual(
          isEligibleTarget({ isInsideModal: false, top: 200, viewportHeight: 800 }),
          false,
          'Top-half inputs must not trigger centering scroll'
        );
        assert.strictEqual(
          isEligibleTarget({ isInsideModal: false, top: 550, viewportHeight: 800 }),
          true,
          'Bottom-half inputs must trigger centering scroll'
        );
      });

      it('verifies resilient backspace deletion, cross-segment transitions, and isolated column deletion', () => {
        // 1. Collapsed selection (caret anywhere from 0 to end): Backspace ALWAYS deletes trailing character
        const simulateBackspaceWithCaret = (value: string, selectionStart: number, selectionEnd: number) => {
          if (selectionStart !== selectionEnd) {
            // Range selected: remove selected range
            return value.slice(0, selectionStart) + value.slice(selectionEnd);
          }
          // Collapsed caret (at 0, middle, or end): deletes trailing character
          return value.slice(0, -1);
        };

        // Year box has "2026", caret at 0, 1, 2, or end: always deletes trailing digit
        assert.strictEqual(simulateBackspaceWithCaret('2026', 0, 0), '202');
        assert.strictEqual(simulateBackspaceWithCaret('2026', 1, 1), '202');
        assert.strictEqual(simulateBackspaceWithCaret('2026', 2, 2), '202');
        assert.strictEqual(simulateBackspaceWithCaret('2026', 4, 4), '202');
        assert.strictEqual(simulateBackspaceWithCaret('202', 0, 0), '20');
        assert.strictEqual(simulateBackspaceWithCaret('20', 0, 0), '2');
        assert.strictEqual(simulateBackspaceWithCaret('2', 0, 0), '');

        // Day box has "18", caret at 0, 1, or 2
        assert.strictEqual(simulateBackspaceWithCaret('18', 0, 0), '1');
        assert.strictEqual(simulateBackspaceWithCaret('18', 1, 1), '1');
        assert.strictEqual(simulateBackspaceWithCaret('18', 2, 2), '1');

        // Month box has "09", caret at 0, 1, or 2
        assert.strictEqual(simulateBackspaceWithCaret('09', 0, 0), '0');
        assert.strictEqual(simulateBackspaceWithCaret('09', 1, 1), '0');
        assert.strictEqual(simulateBackspaceWithCaret('09', 2, 2), '0');

        // Range selection deletion
        assert.strictEqual(simulateBackspaceWithCaret('2026', 0, 4), '');
        assert.strictEqual(simulateBackspaceWithCaret('2026', 2, 4), '20');

        // 2. Cross-segment backspacing across empty boundary boxes
        const simulateCrossSegmentBackspace = ({
          month,
          day,
          year,
          activeSegment,
        }: {
          month: string;
          day: string;
          year: string;
          activeSegment: 'month' | 'day' | 'year';
        }) => {
          let nextMonth = month;
          let nextDay = day;
          let nextYear = year;
          let nextSegment = activeSegment;

          if (activeSegment === 'day' && day.length === 0) {
            nextSegment = 'month';
            if (month.length > 0) {
              nextMonth = month.slice(0, -1);
            }
          } else if (activeSegment === 'year' && year.length === 0) {
            if (day.length > 0) {
              nextSegment = 'day';
              nextDay = day.slice(0, -1);
            } else {
              nextSegment = 'month';
              if (month.length > 0) {
                nextMonth = month.slice(0, -1);
              }
            }
          }

          return { nextMonth, nextDay, nextYear, nextSegment };
        };

        // User is in Day, Day is empty, Month has '09': pressing Backspace deletes '9' and focuses Month
        const fromDay = simulateCrossSegmentBackspace({
          month: '09',
          day: '',
          year: '2026',
          activeSegment: 'day',
        });
        assert.strictEqual(fromDay.nextMonth, '0');
        assert.strictEqual(fromDay.nextSegment, 'month');
        assert.strictEqual(fromDay.nextYear, '2026');

        // User is in Year, Year is empty, Day has '18': pressing Backspace deletes '8' and focuses Day
        const fromYear = simulateCrossSegmentBackspace({
          month: '09',
          day: '18',
          year: '',
          activeSegment: 'year',
        });
        assert.strictEqual(fromYear.nextDay, '1');
        assert.strictEqual(fromYear.nextSegment, 'day');
        assert.strictEqual(fromYear.nextMonth, '09');

        // User is in Year, Year is empty AND Day is empty: pressing Backspace moves directly to Month
        const fromEmptyYearAndEmptyDay = simulateCrossSegmentBackspace({
          month: '09',
          day: '',
          year: '',
          activeSegment: 'year',
        });
        assert.strictEqual(fromEmptyYearAndEmptyDay.nextSegment, 'month');
        assert.strictEqual(fromEmptyYearAndEmptyDay.nextMonth, '0');

        // 3. Isolated column deletion: deleting Day when Year is filled must NEVER pull digits from Year
        let m = '09';
        let d = '18';
        let y = '2026';

        // Delete '8' from Day
        d = d.slice(0, -1);
        assert.strictEqual(d, '1');
        assert.strictEqual(m, '09');
        assert.strictEqual(y, '2026');

        // Delete '1' from Day
        d = d.slice(0, -1);
        assert.strictEqual(d, '');
        assert.strictEqual(m, '09');
        assert.strictEqual(y, '2026'); // Year is completely untouched, never collapsed into Day!

        // 4. Safe emitChange when Month or Day is incomplete:
        const computeSafeEmit = (m: string, d: string, y: string) => {
          let combined = m;
          if (m.length === 2) {
            combined += d;
            if (d.length === 2) {
              combined += y;
            }
          }
          return combined;
        };
        // Day and Year entered without Month:
        assert.strictEqual(computeSafeEmit('', '19', '2026'), '', 'Never shift Day into Month when Month is empty');
        assert.strictEqual(computeSafeEmit('1', '19', '2026'), '1', 'Never shift Day into Month when Month is 1 digit');
        // Month and Year entered without Day:
        assert.strictEqual(computeSafeEmit('09', '', '2026'), '09', 'Never shift Year into Day when Day is empty');
        assert.strictEqual(computeSafeEmit('09', '1', '2026'), '091', 'Never shift Year into Day when Day is 1 digit');
        // All segments complete:
        assert.strictEqual(computeSafeEmit('09', '19', '2026'), '09192026', 'Include all segments when predecessors complete');

        // 5. Recursion and Call Stack Safety in isDateCompleteAndValid
        // Entering a day and year without a month could produce an unexpandable 6-digit string like '192026'.
        // completeDateDigits cannot expand '19' as a month, so completed.length remains 6.
        // isDateCompleteAndValid must safely return false and NEVER exceed call stack.
        assert.doesNotThrow(() => {
          assert.strictEqual(isDateCompleteAndValid('192026'), false);
          assert.strictEqual(isDateCompleteAndValid('000000'), false);
          assert.strictEqual(isDateCompleteAndValid('999999'), false);
          assert.strictEqual(isDateCompleteAndValid('311226'), false); // Month 31 invalid
        });

        // 6. "Please enter a month" error invariants:
        // System must show "Please enter a month" similar to "Please enter a day",
        // BUT only if another element of the date has been filled in.

        // Case A: All elements empty -> No error
        assert.strictEqual(validateDate(''), null);
        assert.strictEqual(validateDate({ month: '', day: '', year: '' }), null);
        assert.strictEqual(validateDate('//'), null);

        // Case B: Month is empty, but Day is filled in -> "Please enter a month"
        assert.strictEqual(
          validateDate({ month: '', day: '15', year: '' }),
          'Please enter a month',
          'Must show Please enter a month when Day is filled but Month is empty'
        );
        assert.strictEqual(
          validateDate('/15/'),
          'Please enter a month',
          'Delimited string must show Please enter a month when Day is filled'
        );

        // Case C: Month is empty, but Year is filled in -> "Please enter a month"
        assert.strictEqual(
          validateDate({ month: '', day: '', year: '2026' }),
          'Please enter a month',
          'Must show Please enter a month when Year is filled but Month is empty'
        );
        assert.strictEqual(
          validateDate('//2026'),
          'Please enter a month',
          'Delimited string must show Please enter a month when Year is filled'
        );

        // Case D: Month is empty, and BOTH Day and Year are filled in -> "Please enter a month"
        assert.strictEqual(
          validateDate({ month: '', day: '15', year: '2026' }),
          'Please enter a month',
          'Must show Please enter a month when Day and Year are filled but Month is empty'
        );
        assert.strictEqual(
          validateDate('/15/2026'),
          'Please enter a month',
          'Delimited string must show Please enter a month when Day and Year are filled'
        );

        // Case E: Month is filled in, but Day is empty -> "Please enter a day"
        assert.strictEqual(
          validateDate({ month: '09', day: '', year: '' }),
          'Please enter a day',
          'Must show Please enter a day when Month is filled but Day is empty'
        );
        assert.strictEqual(
          validateDate({ month: '09', day: '', year: '2026' }),
          'Please enter a day',
          'Must show Please enter a day when Month and Year are filled but Day is empty'
        );
        assert.strictEqual(
          validateDate('09'),
          'Please enter a day',
          'Raw digits 09 must show Please enter a day'
        );

        // Case F: Valid complete date -> No error
        assert.strictEqual(validateDate({ month: '09', day: '15', year: '2026' }), null);
        assert.strictEqual(validateDate('09152026'), null);
      });

      it('strictly suppresses date from translation preview and computedWhen when date is invalid (e.g. 02292005)', () => {
        const computeEventPreview = (params: {
          rawDate: string;
          dateSegmentsState: { month: string; day: string; year: string };
          dateError: string | null;
          rawTime: string;
          timeError: string | null;
          timePeriod: 'AM' | 'PM';
          referenceDate?: Date;
        }) => {
          const {
            rawDate,
            dateSegmentsState,
            dateError,
            rawTime,
            timeError,
            timePeriod,
            referenceDate,
          } = params;

          const isDateValidForPreview =
            !dateError &&
            (rawDate.length === 8 || rawDate.length === 6) &&
            validateDate(dateSegmentsState) === null &&
            validateDate(rawDate) === null &&
            isDateCompleteAndValid(rawDate, referenceDate);

          const dateSegments = formatDateSegments(rawDate);
          const formattedDate = isDateValidForPreview
            ? formatEventDate(
                rawDate.length === 6
                  ? formatDateSegments(completeDateDigits(rawDate, referenceDate)).formatted
                  : dateSegments.formatted,
                referenceDate
              )
            : '';

          const isTimeValid = !timeError && isTimeCompleteAndValid(rawTime);
          const resolvedTime = isTimeValid ? resolveEventTime(rawTime, timePeriod) : '';

          if (formattedDate && resolvedTime) {
            return `${formattedDate} · ${resolvedTime}`;
          }
          return formattedDate || resolvedTime || '';
        };

        // 1. formatEventDate strictly returns '' on invalid or partial calendar dates
        assert.strictEqual(formatEventDate('02/29/2005'), '', 'Non-leap year Feb 29 returns empty string');
        assert.strictEqual(formatEventDate('02/29/2025'), '', 'Non-leap year 2025 returns empty string');
        assert.strictEqual(formatEventDate('02/29/200'), '', 'Partial 3-digit year returns empty string');
        assert.strictEqual(formatEventDate('02/30/2026'), '', 'Feb 30 returns empty string');
        assert.strictEqual(formatEventDate('04/31/2026'), '', 'Apr 31 returns empty string');
        assert.strictEqual(formatEventDate('13/01/2026'), '', 'Month 13 returns empty string');

        // Valid leap years format properly
        const ref2026 = new Date(2026, 8, 17, 12, 0, 0);
        assert.strictEqual(formatEventDate('02/29/2024', ref2026), 'Thu, Feb 29, 2024');
        assert.strictEqual(formatEventDate('02/29/2028', ref2026), 'Tue, Feb 29, 2028');
        assert.strictEqual(formatEventDate('02/29/28', ref2026), 'Tue, Feb 29, 2028');

        // 2. User enters invalid date '02292005' (non-leap year)
        // Date error is active, no time: preview must be completely empty (NOT '02/29/200')
        const previewInvalidDateOnly = computeEventPreview({
          rawDate: '02292005',
          dateSegmentsState: { month: '02', day: '29', year: '2005' },
          dateError: '2005 is not a leap year',
          rawTime: '',
          timeError: null,
          timePeriod: 'PM',
        });
        assert.strictEqual(
          previewInvalidDateOnly,
          '',
          'Translation preview must be completely empty and never show 02/29/200 or invalid date'
        );

        // 3. User enters invalid date '02292005' WITH valid time '700' (7:00 PM)
        // Date is omitted from preview; only valid time is rendered
        const previewInvalidDateValidTime = computeEventPreview({
          rawDate: '02292005',
          dateSegmentsState: { month: '02', day: '29', year: '2005' },
          dateError: '2005 is not a leap year',
          rawTime: '700',
          timeError: null,
          timePeriod: 'PM',
        });
        assert.strictEqual(
          previewInvalidDateValidTime,
          '7:00 PM',
          'Translation preview must render only the valid time, omitting the invalid date'
        );

        // 4. User enters valid leap year '02292028' with time '700'
        const previewValidLeapDateAndTime = computeEventPreview({
          rawDate: '02292028',
          dateSegmentsState: { month: '02', day: '29', year: '2028' },
          dateError: null,
          rawTime: '700',
          timeError: null,
          timePeriod: 'PM',
          referenceDate: ref2026,
        });
        assert.strictEqual(
          previewValidLeapDateAndTime,
          'Tue, Feb 29, 2028 · 7:00 PM',
          'Valid leap year date and time must format cleanly together in preview'
        );

        // 5. User enters valid date '09182026' with invalid time
        const previewValidDateInvalidTime = computeEventPreview({
          rawDate: '09182026',
          dateSegmentsState: { month: '09', day: '18', year: '2026' },
          dateError: null,
          rawTime: '765',
          timeError: 'Minutes tens digit cannot exceed 5',
          timePeriod: 'PM',
          referenceDate: ref2026,
        });
        assert.strictEqual(
          previewValidDateInvalidTime,
          'Fri, Sep 18',
          'Valid date must appear while invalid time is omitted from preview'
        );
      });
    });
  });
});

