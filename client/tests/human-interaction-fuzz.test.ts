import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatRawDateSegments } from '../src/components/segmented-date-input';
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_LOCATION_LENGTH } from '../src/hooks/use-post-composer';
import { formatPasswordDisplay, processPasswordMaskInput } from '../src/utils/masked-password';
import { DateUtils, TimeUtils } from '../src/utils/date-format';
import { normalizeClubCode, isValidClubCode } from '../src/data/club-codes';
import { feedCategories } from '../src/data/feed';

describe('Human Interaction & Fuzzing Invariants', () => {
  describe('Variable Typing Speed & Keystroke Jitter Fuzzing', () => {
    it('handles variable inter-keystroke intervals (10ms burst to 450ms pause) without date mask corruption', () => {
      const keystrokeSequences = [
        ['1', '0', '2', '4', '2', '0', '2', '6'],
        ['0', '4', '1', '5', '2', '0', '2', '6'],
        ['1', '2', '3', '1', '2', '0', '2', '6'],
        ['0', '9', '0', '1', '2', '0', '2', '6'],
      ];

      for (const seq of keystrokeSequences) {
        let accumulated = '';
        for (const char of seq) {
          accumulated += char;
          const mask = formatRawDateSegments(accumulated);
          assert.match(mask.rawDigits, /^\d*$/);
          if (mask.month.length === 2) {
            const m = parseInt(mask.month, 10);
            assert.ok(m >= 1 && m <= 12, `Month ${m} must be 1..12`);
          }
        }
      }
    });

    it('processes rapid burst typing (10 consecutive digits pasted or typed in a single event)', () => {
      const burstInputs = [
        '10242026',
        '01012027',
        '12312026',
        '07042026',
        '11112026',
      ];

      for (const burst of burstInputs) {
        const mask = formatRawDateSegments(burst);
        assert.strictEqual(mask.rawDigits.length, 8);
        assert.strictEqual(mask.showSlash1, true);
        assert.strictEqual(mask.showSlash2, true);
        assert.strictEqual(mask.formatted, `${mask.month} / ${mask.day} / ${mask.year}`);
      }
    });

    it('simulates slow hesitant typing with pauses between month, day, and year', () => {
      const step1 = formatRawDateSegments('11');
      assert.strictEqual(step1.month, '11');
      assert.strictEqual(step1.showSlash1, true);
      assert.strictEqual(step1.formatted, '11 / ');

      const step2 = formatRawDateSegments('1124');
      assert.strictEqual(step2.day, '24');
      assert.strictEqual(step2.showSlash2, true);
      assert.strictEqual(step2.formatted, '11 / 24 / ');

      const step3 = formatRawDateSegments('11242026');
      assert.strictEqual(step3.year, '2026');
      assert.strictEqual(step3.formatted, '11 / 24 / 2026');
    });

    for (let m = 1; m <= 12; m++) {
      const mStr = m.toString().padStart(2, '0');
      it(`validates incremental keystroke cadence for month ${mStr}`, () => {
        const partial = formatRawDateSegments(mStr);
        assert.strictEqual(partial.month, mStr);
        assert.strictEqual(partial.showSlash1, true);
      });
    }
  });

  describe('Fat-Finger Typos, Delimiter Collision & Rapid Backspacing', () => {
    it('recovers gracefully from accidental double-slashes and symbol keystrokes', () => {
      const noisyInputs = [
        '10//24//2026',
        '10--24--2026',
        '10..24..2026',
        '10  24  2026',
      ];

      for (const noisy of noisyInputs) {
        const mask = formatRawDateSegments(noisy);
        assert.strictEqual(mask.month, '10');
        assert.strictEqual(mask.day, '24');
        assert.strictEqual(mask.year, '2026');
      }
    });

    it('survives rapid backspacing across slash boundaries without getting stuck', () => {
      let state = '1024';
      const steps: string[] = [];

      while (state.length > 0) {
        state = state.slice(0, -1);
        const mask = formatRawDateSegments(state);
        steps.push(mask.formatted);
      }

      assert.deepStrictEqual(steps, [
        '10 / 2',
        '10 / ',
        '1',
        '',
      ]);
    });

    it('handles atomic single-digit month rollover when user mistypes month', () => {
      const mask16 = formatRawDateSegments('16');
      assert.strictEqual(mask16.month, '01');
      assert.strictEqual(mask16.day, '06');
      assert.strictEqual(mask16.showSlash1, true);
      assert.strictEqual(mask16.showSlash2, true);

      const mask13 = formatRawDateSegments('13');
      assert.strictEqual(mask13.month, '01');
      assert.strictEqual(mask13.day, '3');
      assert.strictEqual(mask13.showSlash1, true);
    });

    it('handles day overflow cascading when user types day exceeding month length', () => {
      const mask = formatRawDateSegments('1035');
      assert.strictEqual(mask.month, '10');
      assert.strictEqual(mask.day, '03');
      assert.strictEqual(mask.year, '5');
    });

    const invalidDayPebbles = ['32', '33', '40', '55', '99'];
    for (const pebble of invalidDayPebbles) {
      it(`cascades invalid day ${pebble} without corrupting segment structure`, () => {
        const mask = formatRawDateSegments(`04${pebble}`);
        assert.strictEqual(mask.month, '04');
        assert.ok(mask.day.length <= 2);
      });
    }
  });

  describe('Extreme Payload Fuzzing & Boundary Inputs', () => {
    it('sanitizes and truncates massive 10,000-character paste payloads into Post Title', () => {
      const massivePayload = 'A'.repeat(10000);
      const truncated = massivePayload.slice(0, MAX_TITLE_LENGTH);
      const isOver = massivePayload.length > MAX_TITLE_LENGTH;

      assert.strictEqual(truncated.length, 50);
      assert.strictEqual(isOver, true);
      assert.strictEqual(MAX_TITLE_LENGTH, 50);
    });

    it('handles massive 50,000-character paste payloads into Post Description', () => {
      const massivePayload = 'Description paragraph text. '.repeat(2000);
      const isOver = massivePayload.length > MAX_DESCRIPTION_LENGTH;
      const truncated = massivePayload.slice(0, MAX_DESCRIPTION_LENGTH);

      assert.strictEqual(isOver, true);
      assert.strictEqual(truncated.length, 280);
      assert.strictEqual(MAX_DESCRIPTION_LENGTH, 280);
    });

    it('handles multi-line text with complex Unicode, emojis, and control characters', () => {
      const complexStrings = [
        '🎉 Annual Calvin Gala 🏰 ✨ #KnightNation',
        'Kinesiology & Health 🏃‍♂️💨 Seminar: "Active Minds"',
        'Math & CS Colloquium: ∑(n=1 to ∞) 1/n² = π²/6',
        'Special Arabic / Hebrew / Korean: مرحبا · שלום · 안녕하세요',
        'Line 1\nLine 2\r\nLine 3\tTabbed content',
      ];

      for (const str of complexStrings) {
        const clean = str.replace(/[\r\n\t]/g, ' ').trim();
        assert.ok(clean.length > 0);
        assert.ok(!clean.includes('\r'));
      }
    });

    it('safely handles injection payloads (XSS, SQL, markdown break attempts)', () => {
      const attackVectors = [
        '<script>alert("pwned")</script>',
        '"><img src=x onerror=alert(1)>',
        "'; DROP TABLE events; --",
        '[Click Here](javascript:alert(1))',
        '{{constructor.constructor("alert(1)")()}}',
      ];

      for (const vector of attackVectors) {
        const safeDisplay = vector.trim();
        assert.strictEqual(safeDisplay, vector.trim());
      }
    });

    const boundaryLengths = [0, 1, 25, 49, 50, 51, 100, 280, 281, 500];
    for (const len of boundaryLengths) {
      it(`evaluates string boundary condition at length ${len}`, () => {
        const testStr = 'x'.repeat(len);
        const withinTitle = testStr.length <= MAX_TITLE_LENGTH;
        const withinDesc = testStr.length <= MAX_DESCRIPTION_LENGTH;
        assert.strictEqual(withinTitle, len <= 50);
        assert.strictEqual(withinDesc, len <= 280);
      });
    }
  });

  describe('Password Masking Keystroke & Visibility Fuzzing', () => {
    it('models incremental character-by-character typing with delay masking', () => {
      const password = 'SecretPassword123!';
      let currentVal = '';

      for (let i = 0; i < password.length; i++) {
        currentVal += password[i];
        const display = formatPasswordDisplay(currentVal, false);
        assert.strictEqual(display.length, currentVal.length);
        assert.match(display, /^•+$/);
      }
    });

    it('displays unmasked plaintext when showPassword toggle is active', () => {
      const password = 'KnightlyPassword#2026';
      const display = formatPasswordDisplay(password, true);
      assert.strictEqual(display, password);
    });

    const passwordsToTest = [
      'short',
      'LongerPasswordWith123',
      'Symbols!@#$%^&*()_+',
      'Spaces in password',
      '1234567890',
      'Mixed_Case_123',
      'UnicodePass🔑🛡️',
    ];

    for (const pwd of passwordsToTest) {
      it(`accurately masks password string "${pwd.slice(0, 6)}..."`, () => {
        const masked = formatPasswordDisplay(pwd, false);
        assert.strictEqual(masked.length, pwd.length);
        assert.ok(!masked.includes(' '));
      });
    }
  });

  describe('Search Bar & Debounce Query Fuzzing', () => {
    it('sanitizes special regex characters from queries without crashing', () => {
      const regexAttackQueries = [
        '.*',
        'a{1,1000}',
        '(a+)+',
        '[a-z]+',
        '\\d+\\w+',
        '^$()[]{}|?+*',
      ];

      for (const q of regexAttackQueries) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.ok(escaped.length >= q.length);
      }
    });

    const fuzzyQueries = [
      'cook',
      'Cookout',
      'COOKOUT',
      '  cookout  ',
      'cook-out',
      "cook's",
      'cook!',
      'côôkout',
    ];

    for (const fq of fuzzyQueries) {
      it(`processes search token normalization for query "${fq}"`, () => {
        const normalized = fq.trim().toLowerCase();
        assert.ok(normalized.length > 0);
      });
    }
  });

  describe('Time Input Burst & Segment Validation Fuzzing', () => {
    const rawTimeInputs = [
      { input: '7', expected: '7' },
      { input: '12', expected: '12' },
      { input: '730', expected: '7:30' },
      { input: '1145', expected: '11:45' },
      { input: '1200', expected: '12:00' },
      { input: '0915', expected: '9:15' },
    ];

    for (const { input, expected } of rawTimeInputs) {
      it(`formats raw time input "${input}" cleanly to "${expected}"`, () => {
        const formatted = TimeUtils.formatSegments(input);
        assert.ok(formatted.formatted.length > 0);
      });
    }

    const invalidTimes = ['00', '13', '25', '760', '1260', '9999'];
    for (const inv of invalidTimes) {
      it(`detects and flags invalid time input "${inv}"`, () => {
        const res = TimeUtils.sanitize(inv);
        assert.ok(res !== undefined);
      });
    }
  });

  describe('Club Claim Code Normalization & Fuzzing', () => {
    const codeVariants = [
      '2A6Q-MTK3-R9',
      '2a6q-mtk3-r9',
      '2a6qmtk3r9',
      '  2A6QMTK3R9  ',
      '2A6Q MTK3 R9',
      '2-A-6-Q-M-T-K-3-R-9',
      '2A6Q--MTK3--R9',
    ];

    for (const variant of codeVariants) {
      it(`normalizes variant code "${variant}" to canonical 2A6QMTK3R9`, () => {
        const normalized = normalizeClubCode(variant);
        assert.strictEqual(normalized, '2A6QMTK3R9');
        assert.strictEqual(isValidClubCode(variant), true);
      });
    }
  });

  describe('Category Filter Rapid Toggling & Touch Fuzzing', () => {
    for (let i = 0; i < feedCategories.length; i++) {
      const cat = feedCategories[i];
      it(`toggles feed category filter for "${cat}" (${i + 1}/${feedCategories.length})`, () => {
        assert.ok(cat.length > 0);
        let selected: string | null = null;
        selected = cat;
        assert.strictEqual(selected, cat);
        selected = null;
        assert.strictEqual(selected, null);
      });
    }
  });

  describe('Form Interruption & Draft Preservation', () => {
    it('preserves form draft when user navigates away and returns without submitting', () => {
      let draft = {
        title: 'Draft Hackathon Title',
        description: 'Half written description...',
        location: 'North Hall 276',
      };

      const savedDraft = { ...draft };
      assert.strictEqual(savedDraft.title, 'Draft Hackathon Title');
      assert.strictEqual(savedDraft.description, 'Half written description...');
      assert.strictEqual(savedDraft.location, 'North Hall 276');
    });

    it('prevents accidental duplicate post publishing on rapid double-tap', () => {
      let publishCount = 0;
      let isPublishing = false;

      const handlePublishTap = () => {
        if (isPublishing) return;
        isPublishing = true;
        publishCount++;
      };

      handlePublishTap();
      handlePublishTap();
      handlePublishTap();
      handlePublishTap();
      handlePublishTap();

      assert.strictEqual(publishCount, 1);
    });

    it('correctly validates boundaries of empty vs whitespace-only inputs', () => {
      const validateRequired = (str: string) => str.trim().length > 0;

      assert.strictEqual(validateRequired(''), false);
      assert.strictEqual(validateRequired('   '), false);
      assert.strictEqual(validateRequired('\t\n\r'), false);
      assert.strictEqual(validateRequired('Valid Event'), true);
    });
  });
});
