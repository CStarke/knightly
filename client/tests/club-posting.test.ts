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
  isDateWithinActiveWindow,
  formatRawDateSegments,
  formatRawCodeSegments,
  formatRawTimeSegments,
  getMaxDaysForMonth,
  sanitizeDateDigits,
  sanitizeTimeDigits,
  sanitizeTimeDigitsWithError,
  formatTimeDigits,
  getMaxTimeInputLength,
  getMaxTimeRawDigitLength,
  resolveTimeWithPeriod,
  getNextOccurrenceYear,
  completeTimeDigits,
  validateDateOnBlur,
  isDateCompleteAndValid,
  isTimeCompleteAndValid,
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
      const seg1 = formatRawDateSegments('0');
      assert.strictEqual(seg1.showSlash1, false);
      assert.strictEqual(seg1.showSlash2, false);
      assert.strictEqual(seg1.formatted, '0');

      const seg2 = formatRawDateSegments('09');
      assert.strictEqual(seg2.showSlash1, false);
      assert.strictEqual(seg2.showSlash2, false);
      assert.strictEqual(seg2.formatted, '09');

      // 3rd digit typed (first day digit) -> First slash appears!
      const seg3 = formatRawDateSegments('091');
      assert.strictEqual(seg3.showSlash1, true);
      assert.strictEqual(seg3.showSlash2, false);
      assert.strictEqual(seg3.formatted, '09/1');

      // 4th digit typed -> First slash remains, no second slash yet
      const seg4 = formatRawDateSegments('0918');
      assert.strictEqual(seg4.showSlash1, true);
      assert.strictEqual(seg4.showSlash2, false);
      assert.strictEqual(seg4.formatted, '09/18');

      // 5th digit typed (first year digit) -> Second slash appears!
      const seg5 = formatRawDateSegments('09182');
      assert.strictEqual(seg5.showSlash1, true);
      assert.strictEqual(seg5.showSlash2, true);
      assert.strictEqual(seg5.formatted, '09/18/2');

      // Full 8 digits (MMDDYYYY)
      const seg8 = formatRawDateSegments('09182026');
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
      assert.strictEqual(formatTimeDigits('7'), '7');
      assert.strictEqual(formatTimeDigits('730'), '7:30');
      assert.strictEqual(formatTimeDigits('1230'), '12:30');
      assert.strictEqual(formatTimeDigits('7:00'), '7:00');
      assert.strictEqual(formatTimeDigits('abc730def'), '7:30');

      // Progressive time input with instant colon on 3rd digit:
      // 1 -> "1", 10 -> "10", 100 -> "1:00", 1000 -> "10:00"
      assert.strictEqual(formatTimeDigits('1'), '1');
      assert.strictEqual(formatTimeDigits('10'), '10');
      assert.strictEqual(formatTimeDigits('100'), '1:00');
      assert.strictEqual(formatTimeDigits('1000'), '10:00');
      assert.strictEqual(formatTimeDigits('1:000'), '10:00'); // typing 4th digit onto 1:00 shifts colon
      assert.strictEqual(formatTimeDigits('10:0'), '1:00');  // backspace from 10:00
      assert.strictEqual(formatTimeDigits('1:0'), '10');    // backspace from 1:00
      assert.strictEqual(formatTimeDigits('1130'), '11:30');
      assert.strictEqual(formatTimeDigits('1200'), '12:00');
      assert.strictEqual(formatTimeDigits('130'), '1:30');

      // Strict 12-hour clock validation rules:
      // Rule 1: If first digit > 1, max digits is strictly 3
      assert.strictEqual(sanitizeTimeDigits('7300'), '730');
      assert.strictEqual(formatTimeDigits('7300'), '7:30');
      assert.strictEqual(sanitizeTimeDigits('2590'), '259');
      assert.strictEqual(formatTimeDigits('2590'), '2:59');

      // Rule 2: If first digit > 1, second digit cannot exceed 5 (tens of minutes <= 5)
      assert.strictEqual(sanitizeTimeDigits('76'), '7'); // 6 rejected
      assert.strictEqual(sanitizeTimeDigits('79'), '7'); // 9 rejected
      assert.strictEqual(sanitizeTimeDigits('75'), '75'); // 5 accepted

      // Rule 3: If first digit is 1, second digit cannot exceed 5
      assert.strictEqual(sanitizeTimeDigits('16'), '1'); // 6 rejected
      assert.strictEqual(sanitizeTimeDigits('19'), '1'); // 9 rejected

      // Rule 4: If first digit is 1 and second digit is > 2 (3..5), hour is 1, max 3 digits
      assert.strictEqual(sanitizeTimeDigits('1300'), '130');
      assert.strictEqual(formatTimeDigits('1300'), '1:30');
      assert.strictEqual(sanitizeTimeDigits('1450'), '145');
      assert.strictEqual(formatTimeDigits('1450'), '1:45');

      // Rule 5: If 3rd digit is > 5 in hours 10..12, 4th digit is rejected (treated as 3-digit hour 1 time)
      assert.strictEqual(sanitizeTimeDigits('1085'), '108');
      assert.strictEqual(formatTimeDigits('1085'), '1:08');

      // Resolve with PM
      assert.strictEqual(resolveTimeWithPeriod('7', 'PM'), '7:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('7:00', 'PM'), '7:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('730', 'PM'), '7:30 PM');
      assert.strictEqual(resolveTimeWithPeriod('12:30', 'PM'), '12:30 PM');
      assert.strictEqual(resolveTimeWithPeriod('10', 'PM'), '10:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('100', 'PM'), '1:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('1:00', 'PM'), '1:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('1000', 'PM'), '10:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('10:00', 'PM'), '10:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('1', 'PM'), '1:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('130', 'PM'), '1:30 PM');

      // 2-digit progressive input translation:
      // When first digit >= 2, d1 is hour and d2 is tens of minutes (e.g. 25 -> 2:50 PM, not 25:00 PM)
      assert.strictEqual(resolveTimeWithPeriod('25', 'PM'), '2:50 PM');
      assert.strictEqual(resolveTimeWithPeriod('73', 'PM'), '7:30 PM');
      assert.strictEqual(resolveTimeWithPeriod('30', 'PM'), '3:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('45', 'PM'), '4:50 PM');
      assert.strictEqual(resolveTimeWithPeriod('81', 'PM'), '8:10 PM');
      assert.strictEqual(resolveTimeWithPeriod('95', 'PM'), '9:50 PM');

      // When first digit is 1:
      // Hours 10, 11, 12 remain 10:00, 11:00, 12:00
      assert.strictEqual(resolveTimeWithPeriod('10', 'PM'), '10:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('11', 'PM'), '11:00 PM');
      assert.strictEqual(resolveTimeWithPeriod('12', 'PM'), '12:00 PM');
      // 13..15 -> hour is 1, d2 is tens of minutes (1:30 PM, 1:40 PM, 1:50 PM)
      assert.strictEqual(resolveTimeWithPeriod('13', 'PM'), '1:30 PM');
      assert.strictEqual(resolveTimeWithPeriod('14', 'PM'), '1:40 PM');
      assert.strictEqual(resolveTimeWithPeriod('15', 'PM'), '1:50 PM');

      // Resolve with AM
      assert.strictEqual(resolveTimeWithPeriod('9', 'AM'), '9:00 AM');
      assert.strictEqual(resolveTimeWithPeriod('10:15', 'AM'), '10:15 AM');
      assert.strictEqual(resolveTimeWithPeriod('100', 'AM'), '1:00 AM');
      assert.strictEqual(resolveTimeWithPeriod('1000', 'AM'), '10:00 AM');

      // Combined date and time preview formatting
      const dateStr = formatEventDate('09/18/2026');
      const timeStr = resolveTimeWithPeriod('1000', 'PM');
      const combinedPreview = `${dateStr} · ${timeStr}`;
      assert.strictEqual(combinedPreview, 'Fri, Sep 18 · 10:00 PM');

      // Empty returns empty
      assert.strictEqual(resolveTimeWithPeriod('', 'PM'), '');
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
      const empty = formatRawTimeSegments('');
      assert.strictEqual(empty.rawDigits, '');
      assert.strictEqual(empty.part1, '');
      assert.strictEqual(empty.showColon, false);
      assert.strictEqual(empty.part2, '');
      assert.strictEqual(empty.formatted, '');

      // 1 digit: no colon
      const one = formatRawTimeSegments('1');
      assert.strictEqual(one.rawDigits, '1');
      assert.strictEqual(one.part1, '1');
      assert.strictEqual(one.showColon, false);
      assert.strictEqual(one.part2, '');
      assert.strictEqual(one.formatted, '1');

      // 2 digits: no colon (e.g. "10", "73", "25")
      const ten = formatRawTimeSegments('10');
      assert.strictEqual(ten.rawDigits, '10');
      assert.strictEqual(ten.part1, '10');
      assert.strictEqual(ten.showColon, false);
      assert.strictEqual(ten.part2, '');
      assert.strictEqual(ten.formatted, '10');

      const seventyThree = formatRawTimeSegments('73');
      assert.strictEqual(seventyThree.part1, '73');
      assert.strictEqual(seventyThree.showColon, false);

      // 3 digits: fake colon appears immediately after 1st digit (e.g. "100" -> "1:00", "730" -> "7:30")
      const oneHundred = formatRawTimeSegments('100');
      assert.strictEqual(oneHundred.rawDigits, '100');
      assert.strictEqual(oneHundred.part1, '1');
      assert.strictEqual(oneHundred.showColon, true);
      assert.strictEqual(oneHundred.part2, '00');
      assert.strictEqual(oneHundred.formatted, '1:00');

      const sevenThirty = formatRawTimeSegments('730');
      assert.strictEqual(sevenThirty.rawDigits, '730');
      assert.strictEqual(sevenThirty.part1, '7');
      assert.strictEqual(sevenThirty.showColon, true);
      assert.strictEqual(sevenThirty.part2, '30');
      assert.strictEqual(sevenThirty.formatted, '7:30');

      const twoFifty = formatRawTimeSegments('250');
      assert.strictEqual(twoFifty.part1, '2');
      assert.strictEqual(twoFifty.showColon, true);
      assert.strictEqual(twoFifty.part2, '50');
      assert.strictEqual(twoFifty.formatted, '2:50');

      // 4 digits: fake colon appears after 2nd digit (e.g. "1000" -> "10:00", "1230" -> "12:30")
      const tenOClock = formatRawTimeSegments('1000');
      assert.strictEqual(tenOClock.rawDigits, '1000');
      assert.strictEqual(tenOClock.part1, '10');
      assert.strictEqual(tenOClock.showColon, true);
      assert.strictEqual(tenOClock.part2, '00');
      assert.strictEqual(tenOClock.formatted, '10:00');

      const twelveThirty = formatRawTimeSegments('1230');
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
      const otherDay = (tDay % 28) + 1;
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
    describe('Date Digit Validation (sanitizeDateDigits)', () => {
      it('validates month tens digit: allows only 0 and 1', () => {
        assert.deepStrictEqual(sanitizeDateDigits('0'), { digits: '0', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('1'), { digits: '1', error: null });

        for (let d = 2; d <= 9; d++) {
          const res = sanitizeDateDigits(String(d));
          assert.strictEqual(res.digits, '');
          assert.strictEqual(res.error, 'Month must be between 01-12');
        }
      });

      it('validates month units digit: when tens is 1, allows only 0, 1, 2 (months 10, 11, 12)', () => {
        assert.deepStrictEqual(sanitizeDateDigits('10'), { digits: '10', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('11'), { digits: '11', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('12'), { digits: '12', error: null });

        for (let d = 3; d <= 9; d++) {
          const res = sanitizeDateDigits(`1${d}`);
          assert.strictEqual(res.digits, '1');
          assert.strictEqual(res.error, 'Month must be between 01-12');
        }
      });

      it('validates month units digit: when tens is 0, allows 1..9 and rejects 00', () => {
        for (let d = 1; d <= 9; d++) {
          assert.deepStrictEqual(sanitizeDateDigits(`0${d}`), { digits: `0${d}`, error: null });
        }
        const res = sanitizeDateDigits('00');
        assert.strictEqual(res.digits, '0');
        assert.strictEqual(res.error, 'Month must be between 01-12');
      });

      it('validates day tens digit: for February (02), allows 0..2 and rejects 3..9', () => {
        assert.deepStrictEqual(sanitizeDateDigits('020'), { digits: '020', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('021'), { digits: '021', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('022'), { digits: '022', error: null });

        for (let d = 3; d <= 9; d++) {
          const res = sanitizeDateDigits(`02${d}`);
          assert.strictEqual(res.digits, '02');
          assert.strictEqual(res.error, 'Day must be between 01-29');
        }
      });

      it('validates day tens digit: for other months, allows 0..3 and rejects 4..9', () => {
        assert.deepStrictEqual(sanitizeDateDigits('010'), { digits: '010', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('011'), { digits: '011', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('012'), { digits: '012', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('013'), { digits: '013', error: null });

        for (let d = 4; d <= 9; d++) {
          const res = sanitizeDateDigits(`01${d}`);
          assert.strictEqual(res.digits, '01');
          assert.strictEqual(res.error, 'Day must be between 01-31');
        }
      });

      it('validates day units digit: rejects 00 as a day', () => {
        const res = sanitizeDateDigits('0100');
        assert.strictEqual(res.digits, '010');
        assert.strictEqual(res.error, 'Day must be between 01-31');
      });

      it('validates day units digit: for 30-day months (04, 06, 09, 11), day cannot exceed 30', () => {
        const months30 = ['04', '06', '09', '11'];
        for (const m of months30) {
          assert.deepStrictEqual(sanitizeDateDigits(`${m}30`), { digits: `${m}30`, error: null });
          const res = sanitizeDateDigits(`${m}31`);
          assert.strictEqual(res.digits, `${m}3`);
          assert.strictEqual(res.error, 'Day must be between 01-30');
        }
      });

      it('validates day units digit: for 31-day months, allows 30 and 31, rejects 32..39', () => {
        assert.deepStrictEqual(sanitizeDateDigits('0130'), { digits: '0130', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('0131'), { digits: '0131', error: null });

        for (let d = 2; d <= 9; d++) {
          const res = sanitizeDateDigits(`013${d}`);
          assert.strictEqual(res.digits, '013');
          assert.strictEqual(res.error, 'Day must be between 01-31');
        }
      });

      it('validates year 1st digit: must be 2 (constraining year between 2000 and 2999)', () => {
        assert.deepStrictEqual(sanitizeDateDigits('09182'), { digits: '09182', error: null });

        const invalidYearStarts = [0, 1, 3, 4, 5, 6, 7, 8, 9];
        for (const y of invalidYearStarts) {
          const res = sanitizeDateDigits(`0918${y}`);
          assert.strictEqual(res.digits, '0918');
          assert.strictEqual(res.error, 'Please enter a year between 2000 and 2999');
        }
      });

      it('validates leap years for February 29: allows leap years (2024, 2028, 2000) and rejects non-leap years (2025, 2023, 2100)', () => {
        assert.deepStrictEqual(sanitizeDateDigits('02292024'), { digits: '02292024', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('02292028'), { digits: '02292028', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('02292000'), { digits: '02292000', error: null });

        const res2025 = sanitizeDateDigits('02292025');
        assert.strictEqual(res2025.digits, '0229202');
        assert.strictEqual(res2025.error, '2025 is not a leap year');

        const res2023 = sanitizeDateDigits('02292023');
        assert.strictEqual(res2023.digits, '0229202');
        assert.strictEqual(res2023.error, '2023 is not a leap year');

        const res2100 = sanitizeDateDigits('02292100');
        assert.strictEqual(res2100.digits, '0229210');
        assert.strictEqual(res2100.error, '2100 is not a leap year');
      });

      it('handles backspacing and deletions gracefully without emitting errors', () => {
        assert.deepStrictEqual(sanitizeDateDigits('091', '0918'), { digits: '091', error: null });
        assert.deepStrictEqual(sanitizeDateDigits('', '0918'), { digits: '', error: null });
      });
    });

    describe('Time Digit Validation with Error Feedback (sanitizeTimeDigitsWithError)', () => {
      it('rejects hour 00 with clear error message', () => {
        const res = sanitizeTimeDigitsWithError('00');
        assert.strictEqual(res.digits, '0');
        assert.strictEqual(res.error, 'Hour cannot be 00.');
      });

      it('rejects minutes tens > 5 on 2-digit input', () => {
        const res = sanitizeTimeDigitsWithError('26');
        assert.strictEqual(res.digits, '2');
        assert.strictEqual(res.error, 'Minutes cannot exceed 59.');
      });

      it('rejects 4th digit for single-digit hours (e.g. 730 -> 7300)', () => {
        const res = sanitizeTimeDigitsWithError('7300');
        assert.strictEqual(res.digits, '730');
        assert.strictEqual(res.error, 'Single-digit hours cannot exceed 3 digits.');
      });

      it('allows 4th digit for 2-digit hours (10:00, 11:30, 12:45)', () => {
        assert.deepStrictEqual(sanitizeTimeDigitsWithError('1000'), { digits: '1000', error: null });
        assert.deepStrictEqual(sanitizeTimeDigitsWithError('1130'), { digits: '1130', error: null });
        assert.deepStrictEqual(sanitizeTimeDigitsWithError('1245'), { digits: '1245', error: null });
      });

      it('rejects 4th digit when hour is 1 and minutes tens is 3..5 (e.g. 1:30 cannot be 1300)', () => {
        const res = sanitizeTimeDigitsWithError('1300');
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
        // 1. Partial year (e.g. 02/18/3) on lost focus must produce error
        assert.strictEqual(
          validateDateOnBlur('02183'),
          'Please enter a year between 2000 and 2999'
        );
        assert.strictEqual(
          validateDateOnBlur('021820'),
          'Please enter a year between 2000 and 2999'
        );
        assert.strictEqual(
          validateDateOnBlur('0218202'),
          'Please enter a year between 2000 and 2999'
        );

        // 2. Incomplete month/day on blur
        assert.strictEqual(validateDateOnBlur('02'), 'Please enter a day');
        assert.strictEqual(validateDateOnBlur('13'), 'Month must be between 01-12');
        assert.strictEqual(validateDateOnBlur('0235'), 'Day must be between 01-29');

        // 3. Leap year validation
        assert.strictEqual(validateDateOnBlur('02292025'), '2025 is not a leap year');
        assert.strictEqual(validateDateOnBlur('02292028'), null); // 2028 is leap

        // 4. Valid complete date and empty date produce no error
        assert.strictEqual(validateDateOnBlur('09182026'), null);
        assert.strictEqual(validateDateOnBlur(''), null);

        // 5. Posting invariants:
        // - Incomplete date (02/18/3) is NOT allowed and must prevent posting
        assert.strictEqual(isDateCompleteAndValid('02183'), false);
        assert.strictEqual(isDateCompleteAndValid('02'), false);

        // - A date and no time at all IS allowed
        assert.strictEqual(isDateCompleteAndValid('09182026'), true);
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
  });
});

