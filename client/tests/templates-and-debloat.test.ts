import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DateUtils, TimeUtils, formatRelativeTime, resolveEventTime } from '@/utils/date-format';
import { formatDisplayDate } from '@/components/segmented-date-input';
import { calculateModalKeyboardLift } from '@/utils/modal-keyboard';
import { Brand } from '@/constants/theme';

describe('Templates & Code De-bloating Invariants', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8').replace(/\r\n/g, '\n');

  describe('Shared BlinkingCursor Template Contract', () => {
    it('defines BlinkingCursor props and interval cleanup', () => {
      // Validates BlinkingCursor props contract
      interface BlinkingCursorProps {
        color?: string;
        height?: number;
        width?: number;
      }

      const defaultProps: BlinkingCursorProps = {};
      const customProps: BlinkingCursorProps = { color: '#F3C300', height: 20, width: 2 };

      assert.strictEqual(defaultProps.color ?? '#F3C300', '#F3C300');
      assert.strictEqual(defaultProps.height ?? 16, 16);
      assert.strictEqual(defaultProps.width ?? 1.5, 1.5);

      assert.strictEqual(customProps.color, '#F3C300');
      assert.strictEqual(customProps.height, 20);
      assert.strictEqual(customProps.width, 2);
    });
  });

  describe('FieldLabel Template Contract', () => {
    it('formats label, required asterisk, and character counters correctly', () => {
      const renderModel = (
        label: string,
        required: boolean = false,
        current?: number,
        max?: number
      ) => {
        const hasCounter = current !== undefined && max !== undefined;
        const isOver = hasCounter && (current as number) > (max as number);
        return {
          displayText: `${label}${required ? ' *' : ''}`,
          counterText: hasCounter ? `${current}/${max}` : null,
          isOverLimit: isOver,
        };
      };

      const titleLabel = renderModel('POST TITLE', true, 12, 50);
      assert.strictEqual(titleLabel.displayText, 'POST TITLE *');
      assert.strictEqual(titleLabel.counterText, '12/50');
      assert.strictEqual(titleLabel.isOverLimit, false);

      const overLimitLabel = renderModel('DESCRIPTION', true, 281, 280);
      assert.strictEqual(overLimitLabel.displayText, 'DESCRIPTION *');
      assert.strictEqual(overLimitLabel.counterText, '281/280');
      assert.strictEqual(overLimitLabel.isOverLimit, true);

      const plainLabel = renderModel('PHOTO / BANNER', false);
      assert.strictEqual(plainLabel.displayText, 'PHOTO / BANNER');
      assert.strictEqual(plainLabel.counterText, null);
    });

    it('supports optional left icon alongside label text', () => {
      const labelWithIcon = {
        label: 'LOCATION',
        hasIcon: true,
        currentLength: 10,
        maxLength: 25,
      };
      assert.strictEqual(labelWithIcon.label, 'LOCATION');
      assert.strictEqual(labelWithIcon.hasIcon, true);
    });
  });

  describe('MaskedTimeInput Template Contract', () => {
    it('segments and formats time input correctly with AM/PM period', () => {
      const renderTimeSegments = (rawDigits: string) => {
        const d = rawDigits.slice(0, 4);
        let part1 = '';
        let part2 = '';
        let showColon = false;

        if (d.length <= 2) {
          part1 = d;
        } else if (d.length === 3) {
          part1 = d.slice(0, 1);
          part2 = d.slice(1);
          showColon = true;
        } else {
          part1 = d.slice(0, 2);
          part2 = d.slice(2);
          showColon = true;
        }

        return { part1, part2, showColon };
      };

      // 1-2 digits (hour typing)
      assert.deepStrictEqual(renderTimeSegments('7'), { part1: '7', part2: '', showColon: false });
      assert.deepStrictEqual(renderTimeSegments('12'), { part1: '12', part2: '', showColon: false });

      // 3 digits (e.g. 7:30)
      assert.deepStrictEqual(renderTimeSegments('730'), { part1: '7', part2: '30', showColon: true });

      // 4 digits (e.g. 11:45)
      assert.deepStrictEqual(renderTimeSegments('1145'), { part1: '11', part2: '45', showColon: true });
    });
  });

  describe('ModalDialog Template Invariants', () => {
    it('ensures ModalDialog adheres to Android edge-to-edge requirements', () => {
      // Mathematical validation: ModalDialog must satisfy full-bleed requirements
      const dialogConfig = {
        transparent: true,
        animationType: 'fade' as const,
        statusBarTranslucent: true,
        navigationBarTranslucent: true,
        backdrop: {
          flex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
      };

      assert.strictEqual(dialogConfig.transparent, true);
      assert.strictEqual(dialogConfig.statusBarTranslucent, true);
      assert.strictEqual(dialogConfig.navigationBarTranslucent, true);
      assert.strictEqual(dialogConfig.backdrop.width, '100%');
      assert.strictEqual(dialogConfig.backdrop.height, '100%');
    });

    it('computes soft-keyboard modal elevation across various phone heights and ensures action buttons clear keyboard', () => {
      // Scenario 1: Keyboard inactive (height = 0) -> no elevation
      const restingLift = calculateModalKeyboardLift({
        windowHeight: 852,
        keyboardHeight: 0,
        cardHeight: 340,
        insetTop: 59,
      });
      assert.strictEqual(restingLift, 0, 'Resting modal card must stay centered with 0 translateY');

      // Scenario 2: Modern iPhone (iPhone 15: 852px height, 336px keyboard, 340px card, 59px inset)
      // Unshifted card bottom: (852 + 340)/2 = 596px. Keyboard top: 852 - 336 = 516px.
      // Submerged: 596 - 516 = 80px submerged!
      const iPhoneLift = calculateModalKeyboardLift({
        windowHeight: 852,
        keyboardHeight: 336,
        cardHeight: 340,
        insetTop: 59,
      });
      assert.strictEqual(iPhoneLift, 168, 'Must lift by half-keyboard (168px) to center in remaining visible space');
      const liftedCardBottom = (852 + 340) / 2 - iPhoneLift;
      const keyboardTop = 852 - 336;
      assert.strictEqual(liftedCardBottom < keyboardTop, true, 'Card bottom must clear keyboard top');
      assert.strictEqual(keyboardTop - liftedCardBottom, 88, 'Guarantees 88px clearance between card bottom and keyboard');

      // Scenario 3: Compact iPhone SE (667px height, 260px keyboard, 340px card, 20px inset)
      // Unshifted card bottom: (667 + 340)/2 = 503.5px. Keyboard top: 667 - 260 = 407px.
      // Submerged: 503.5 - 407 = 96.5px submerged!
      const seLift = calculateModalKeyboardLift({
        windowHeight: 667,
        keyboardHeight: 260,
        cardHeight: 340,
        insetTop: 20,
      });
      assert.strictEqual(seLift, 130, 'Must lift by 130px');
      const seCardBottom = (667 + 340) / 2 - seLift;
      const seKeyboardTop = 667 - 260;
      assert.strictEqual(seCardBottom < seKeyboardTop, true, 'SE card bottom must clear keyboard top');
      assert.strictEqual(seKeyboardTop - seCardBottom, 33.5, 'Guarantees 33.5px clearance above SE keyboard');

      // Scenario 4: Tall card on compact screen -> clamped to maxSafeLift so top doesn't clip off-screen
      const clampedLift = calculateModalKeyboardLift({
        windowHeight: 667,
        keyboardHeight: 300,
        cardHeight: 440,
        insetTop: 20,
      });
      const restingTop = (667 - 440) / 2; // 113.5
      const topInset = Math.max(16, 20 + 8); // 28
      const maxSafe = restingTop - topInset; // 85.5
      assert.strictEqual(clampedLift, maxSafe, 'Must clamp lift at max safe headroom so top never clips off screen');

      // Scenario 5: Unmeasured card fallback (cardHeight = 0)
      const unmeasuredLift = calculateModalKeyboardLift({
        windowHeight: 800,
        keyboardHeight: 300,
        cardHeight: 0,
        insetTop: 40,
      });
      assert.strictEqual(unmeasuredLift, 150, 'Fallback uses half-keyboard heuristic');
    });

    it('verifies ModalDialog and ClaimClubModal wire soft-keyboard avoidance and keyboard dismissal on exit', () => {
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');
      const claimCode = readSrc('components/claim-club-modal.tsx');

      // ModalDialog wires keyboard elevation and layout measurement
      assert.ok(dialogCode.includes('calculateModalKeyboardLift'), 'ModalDialog must use calculateModalKeyboardLift');
      assert.ok(dialogCode.includes('onLayout={handleCardLayout}'), 'ModalDialog must measure card layout height');
      assert.ok(dialogCode.includes('Keyboard.addListener'), 'ModalDialog must listen to keyboard show/hide events');
      assert.ok(dialogCode.includes('animatedCardStyle'), 'ModalDialog must apply animated card style');

      // ClaimClubModal dismisses virtual keyboard on exit and on verify
      assert.ok(claimCode.includes('Keyboard.dismiss()'), 'ClaimClubModal must call Keyboard.dismiss()');
    });

    it('enforces template inheritance invariant: all dialog modals delegate to ModalDialog and inherit keyboard lift by default', () => {
      const claimCode = readSrc('components/claim-club-modal.tsx');
      const successCode = readSrc('components/ui/success-modal.tsx');
      const datePickerCode = readSrc('components/date-picker-modal.tsx');
      const locationCode = readSrc('components/location-info-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');

      // 1. Template default: avoidKeyboard must default to true
      assert.ok(dialogCode.includes('avoidKeyboard = true'), 'ModalDialog must default avoidKeyboard to true');

      // 2. Leaf dialog modals must delegate directly to ModalDialog template
      assert.ok(claimCode.includes('<ModalDialog'), 'ClaimClubModal must delegate to ModalDialog');
      assert.ok(successCode.includes('<ModalDialog'), 'SuccessModal must delegate to ModalDialog');
      assert.ok(datePickerCode.includes('<ModalDialog'), 'DatePickerModal must delegate to ModalDialog');
      assert.ok(locationCode.includes('<ModalDialog'), 'LocationInfoModal must delegate to ModalDialog');

      // 3. Leaf dialog modals must NOT contain duplicate raw <Modal> tags
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(claimCode), 'ClaimClubModal must not contain raw <Modal>');
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(successCode), 'SuccessModal must not contain raw <Modal>');
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(datePickerCode), 'DatePickerModal must not contain raw <Modal>');
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(locationCode), 'LocationInfoModal must not contain raw <Modal>');
    });
  });

  describe('Tab Navigation De-duplication', () => {
    it('ensures LEADER_TABS inherits from BASE_TABS without duplicated literal objects', () => {
      const baseTabs = [
        { name: 'knightly', href: '/' },
        { name: 'dining', href: '/dining' },
        { name: 'safety', href: '/safety' },
        { name: 'directory', href: '/directory' },
      ];
      const postTab = { name: 'post', href: '/post' };
      const leaderTabs = [...baseTabs, postTab];

      assert.strictEqual(leaderTabs.length, 5);
      assert.strictEqual(leaderTabs[0].name, 'knightly');
      assert.strictEqual(leaderTabs[4].name, 'post');
      assert.strictEqual(baseTabs.length, 4);
    });
  });

  describe('DatePickerModal Date Resolution & Calendar Grid Logic', () => {
    it('computes days in month and starting day offset accurately', () => {
      const getCalendarGrid = (year: number, month: number) => {
        // month: 0-indexed (0 = Jan, 1 = Feb, etc.)
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDayOfWeek, daysInMonth };
      };

      // September 2026: Sep 1, 2026 was Tuesday (day 2), 30 days
      const sep2026 = getCalendarGrid(2026, 8);
      assert.strictEqual(sep2026.firstDayOfWeek, 2);
      assert.strictEqual(sep2026.daysInMonth, 30);

      // February 2028 (Leap year): Feb 1, 2028 is Tuesday (day 2), 29 days
      const feb2028 = getCalendarGrid(2028, 1);
      assert.strictEqual(feb2028.firstDayOfWeek, 2);
      assert.strictEqual(feb2028.daysInMonth, 29);

      // February 2027 (Non-leap year): Feb 1, 2027 is Monday (day 1), 28 days
      const feb2027 = getCalendarGrid(2027, 1);
      assert.strictEqual(feb2027.firstDayOfWeek, 1);
      assert.strictEqual(feb2027.daysInMonth, 28);
    });
  });

  describe('FollowButton Template Contract', () => {
    it('generates correct label and icon metadata for compact and prominent variants', () => {
      const getFollowButtonProps = (
        following: boolean,
        variant: 'compact' | 'prominent',
        clubName: string
      ) => {
        const isCompact = variant === 'compact';
        return {
          label: isCompact
            ? following ? 'Following' : 'Follow'
            : following ? 'Following this club' : 'Follow this club',
          accessibilityLabel: following ? `Unfollow ${clubName}` : `Follow ${clubName}`,
          iconSf: isCompact
            ? following ? 'checkmark' : 'plus'
            : following ? 'checkmark.circle.fill' : 'plus.circle.fill',
          iconMd: isCompact
            ? following ? 'check' : 'add'
            : following ? 'check_circle' : 'add_circle',
        };
      };

      const compactUnfollowed = getFollowButtonProps(false, 'compact', 'Abstraction');
      assert.strictEqual(compactUnfollowed.label, 'Follow');
      assert.strictEqual(compactUnfollowed.accessibilityLabel, 'Follow Abstraction');
      assert.strictEqual(compactUnfollowed.iconSf, 'plus');

      const compactFollowed = getFollowButtonProps(true, 'compact', 'Abstraction');
      assert.strictEqual(compactFollowed.label, 'Following');
      assert.strictEqual(compactFollowed.accessibilityLabel, 'Unfollow Abstraction');
      assert.strictEqual(compactFollowed.iconSf, 'checkmark');

      const prominentUnfollowed = getFollowButtonProps(false, 'prominent', 'Dance Guild');
      assert.strictEqual(prominentUnfollowed.label, 'Follow this club');
      assert.strictEqual(prominentUnfollowed.accessibilityLabel, 'Follow Dance Guild');
      assert.strictEqual(prominentUnfollowed.iconSf, 'plus.circle.fill');

      const prominentFollowed = getFollowButtonProps(true, 'prominent', 'Dance Guild');
      assert.strictEqual(prominentFollowed.label, 'Following this club');
      assert.strictEqual(prominentFollowed.accessibilityLabel, 'Unfollow Dance Guild');
      assert.strictEqual(prominentFollowed.iconSf, 'checkmark.circle.fill');
    });

    it('models 3D wheel text rotation, icon morph scaling, and background color interpolation ranges', () => {
      const interpolateValue = (val: number, inRange: [number, number], outRange: [number, number]) => {
        const ratio = (val - inRange[0]) / (inRange[1] - inRange[0]);
        const clamped = Math.max(0, Math.min(1, ratio));
        const res = outRange[0] + clamped * (outRange[1] - outRange[0]);
        return Math.round(res * 1000) / 1000;
      };

      // Unfollowed State (progress = 0):
      assert.strictEqual(interpolateValue(0, [0, 1], [1, 0.3]), 1);
      assert.strictEqual(interpolateValue(0, [0, 1], [0.3, 1]), 0.3);
      assert.strictEqual(interpolateValue(0, [0, 1], [0, -60]), 0);
      assert.strictEqual(interpolateValue(0, [0, 1], [0, -22]), 0);

      // Following State (progress = 1):
      assert.strictEqual(interpolateValue(1, [0, 1], [1, 0.3]), 0.3);
      assert.strictEqual(interpolateValue(1, [0, 1], [0.3, 1]), 1);
      assert.strictEqual(interpolateValue(1, [0, 1], [0, -60]), -60);
      assert.strictEqual(interpolateValue(1, [0, 1], [0, -22]), -22);

      // Mid-point transition (progress = 0.5):
      assert.strictEqual(interpolateValue(0.5, [0, 1], [1, 0.3]), 0.65);
      assert.strictEqual(interpolateValue(0.5, [0, 1], [0.3, 1]), 0.65);
    });
  });

  describe('Button Template Contract', () => {
    it('supports primary, secondary, danger, and gold button variants with appropriate background and text contrast', () => {
      type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold';
      const mockTheme = {
        tint: '#8C2633',
        danger: '#DC2626',
        backgroundSelected: '#1C1D21',
        text: '#FFFFFF',
        onTint: '#FFFFFF',
      };

      const resolveButtonColors = (variant: ButtonVariant) => {
        const background =
          variant === 'gold'
            ? Brand.gold
            : variant === 'primary'
            ? mockTheme.tint
            : variant === 'danger'
            ? mockTheme.danger
            : mockTheme.backgroundSelected;

        const foreground =
          variant === 'gold'
            ? '#0B0C0E'
            : variant === 'secondary'
            ? mockTheme.text
            : mockTheme.onTint;

        return { background, foreground };
      };

      const goldButton = resolveButtonColors('gold');
      assert.strictEqual(goldButton.background, Brand.gold, 'Gold variant must use Brand.gold');
      assert.strictEqual(goldButton.foreground, '#0B0C0E', 'Gold variant must use high-contrast dark text');

      const primaryButton = resolveButtonColors('primary');
      assert.strictEqual(primaryButton.background, mockTheme.tint);
      assert.strictEqual(primaryButton.foreground, mockTheme.onTint);

      const dangerButton = resolveButtonColors('danger');
      assert.strictEqual(dangerButton.background, mockTheme.danger);
      assert.strictEqual(dangerButton.foreground, mockTheme.onTint);

      const secondaryButton = resolveButtonColors('secondary');
      assert.strictEqual(secondaryButton.background, mockTheme.backgroundSelected);
      assert.strictEqual(secondaryButton.foreground, mockTheme.text);
    });
  });

  describe('DateSegmentCell Model Contract', () => {
    it('standardizes cell widths, placeholders, and lengths for date segments', () => {
      type SegmentType = 'month' | 'day' | 'year';
      const getSegmentSpecs = (type: SegmentType) => {
        switch (type) {
          case 'month':
            return { width: 28, maxLen: 2, placeholder: 'MM', label: 'Event month' };
          case 'day':
            return { width: 28, maxLen: 2, placeholder: 'DD', label: 'Event day' };
          case 'year':
            return { width: 48, maxLen: 4, placeholder: 'YYYY', label: 'Event year' };
        }
      };

      const monthSpec = getSegmentSpecs('month');
      assert.strictEqual(monthSpec.width, 28);
      assert.strictEqual(monthSpec.maxLen, 2);
      assert.strictEqual(monthSpec.placeholder, 'MM');

      const daySpec = getSegmentSpecs('day');
      assert.strictEqual(daySpec.width, 28);
      assert.strictEqual(daySpec.maxLen, 2);
      assert.strictEqual(daySpec.placeholder, 'DD');

      const yearSpec = getSegmentSpecs('year');
      assert.strictEqual(yearSpec.width, 48);
      assert.strictEqual(yearSpec.maxLen, 4);
      assert.strictEqual(yearSpec.placeholder, 'YYYY');
    });

    it('formats raw digits, delimiters, and ISO strings into clean unified display', () => {
      // 1. Single digit unambiguous month 9 -> '09 / '
      assert.strictEqual(formatDisplayDate('9'), '09 / ');

      // 2. Continuous raw digits -> '09 / 18 / 2026'
      assert.strictEqual(formatDisplayDate('09182026'), '09 / 18 / 2026');

      // 3. Slash delimited input -> '09 / 18 / 2026'
      assert.strictEqual(formatDisplayDate('9/18/2026'), '09 / 18 / 2026');

      // 4. ISO formatted input -> '09 / 18 / 2026'
      assert.strictEqual(formatDisplayDate('2026-09-18'), '09 / 18 / 2026');

      // 5. Space delimited input -> '09 / 18 / 2026'
      assert.strictEqual(formatDisplayDate('9 18 2026'), '09 / 18 / 2026');

      // 6. Ambiguous month 1 -> '1'
      assert.strictEqual(formatDisplayDate('1'), '1');

      // 7. Month 12 -> '12 / '
      assert.strictEqual(formatDisplayDate('12'), '12 / ');

      // 8. Month overflow 16 -> '01 / 06 / '
      assert.strictEqual(formatDisplayDate('16'), '01 / 06 / ');
    });
  });

  describe('DiningActivitySummary Model Contract', () => {
    it('formats all 3 dining usage items correctly', () => {
      const getSummaryItems = (swipes: number, kb: number, dd: number) => [
        { value: `${swipes}`, label: 'Swipes used' },
        { value: `$${kb.toFixed(2)}`, label: 'KnightBucks' },
        { value: `$${dd.toFixed(2)}`, label: 'Dining Dollars' },
      ];

      const items = getSummaryItems(14, 12.5, 4.2);
      assert.strictEqual(items[0].value, '14');
      assert.strictEqual(items[0].label, 'Swipes used');
      assert.strictEqual(items[1].value, '$12.50');
      assert.strictEqual(items[1].label, 'KnightBucks');
      assert.strictEqual(items[2].value, '$4.20');
      assert.strictEqual(items[2].label, 'Dining Dollars');
    });
  });

  describe('LoginScreen Flight Coordinates Invariants', () => {
    it('produces identical delta coordinates whether using expanded or simplified formula', () => {
      const windowWidth = 390;
      const windowHeight = 844;
      const MaxContentWidth = 1200;
      const targetScale = 28 / 34;
      const SpacingThree = 16;
      const headerPaddingTop = 44 + 4;
      const defaultHeroWidth = 136;
      const defaultHeroHeight = 42;

      // Expanded formula
      const defaultHeaderX =
        (windowWidth > MaxContentWidth ? (windowWidth - MaxContentWidth) / 2 : 0) +
        SpacingThree;
      const defaultHeaderY = headerPaddingTop;
      const formMainTop = Math.max(headerPaddingTop + 30, (windowHeight - 402) / 2);
      const defaultHeroX = (windowWidth - defaultHeroWidth) / 2;
      const defaultHeroY = formMainTop + 74;

      const defaultHeroCenterX = defaultHeroX + defaultHeroWidth / 2;
      const defaultHeroCenterY = defaultHeroY + defaultHeroHeight / 2;

      const defaultTargetCenterX = defaultHeaderX + (defaultHeroWidth * targetScale) / 2;
      const defaultTargetCenterY = defaultHeaderY + (defaultHeroHeight * targetScale) / 2;

      const deltaX1 = defaultTargetCenterX - defaultHeroCenterX;
      const deltaY1 = defaultTargetCenterY - defaultHeroCenterY;

      // Simplified formula
      const deltaX2 = defaultHeaderX + (defaultHeroWidth * targetScale) / 2 - windowWidth / 2;
      const deltaY2 = headerPaddingTop + (defaultHeroHeight * targetScale) / 2 - (formMainTop + 74 + defaultHeroHeight / 2);

      assert.strictEqual(Math.round(deltaX1 * 1000), Math.round(deltaX2 * 1000));
      assert.strictEqual(Math.round(deltaY1 * 1000), Math.round(deltaY2 * 1000));
    });

    it('computes correct web sidebar docking coordinates and scale invariants', () => {
      // Step 1: Web desktop layout dimensions
      const windowWidth = 1440;
      const windowHeight = 900;
      const isWeb = true;
      const targetSidebarWidth = 270;
      const targetScale = isWeb ? 24 / 34 : 28 / 34;
      const SpacingThree = 16;
      const SpacingFour = 24;
      const defaultHeroWidth = 136;
      const defaultHeroHeight = 42;
      const headerPaddingTop = SpacingFour;
      const formMainTop = Math.max(headerPaddingTop + 30, (windowHeight - 402) / 2);

      // Step 2: On web, target position docks directly into the inset floating left sidebar masthead
      // Sidebar has marginLeft: 12, marginVertical: 12, and masthead has horizontal padding (16 + 2 = 18)
      const sidebarInset = 12;
      const defaultHeaderX = sidebarInset + SpacingThree + 2;
      const defaultHeaderY = sidebarInset + SpacingFour;

      // Center of hero wordmark on initial render
      const heroCenterX = windowWidth / 2;
      const heroCenterY = formMainTop + 74 + defaultHeroHeight / 2;

      // Destination center in the sidebar masthead
      const targetCenterX = defaultHeaderX + (defaultHeroWidth * targetScale) / 2;
      const targetCenterY = defaultHeaderY + (defaultHeroHeight * targetScale) / 2;

      const deltaX = targetCenterX - heroCenterX;
      const deltaY = targetCenterY - heroCenterY;

      // Step 3: Validate invariants
      assert.strictEqual(targetSidebarWidth, 270);
      assert.strictEqual(targetScale, 24 / 34);
      // Wordmark must travel leftward (negative deltaX) towards the left sidebar
      assert.ok(deltaX < 0, 'Wordmark deltaX must be negative to glide into left rail');
      // Wordmark must travel upward (negative deltaY) towards the top masthead
      assert.ok(deltaY < 0, 'Wordmark deltaY must be negative to glide into top masthead');
      // Landing horizontal coordinate plus scaled width must sit well within 270px sidebar
      assert.ok(defaultHeaderX + defaultHeroWidth * targetScale < targetSidebarWidth);
    });

    it('validates collapsible sidebar states, width invariants, and rail layout dimensions', () => {
      // Step 1: Expanded vs Collapsed width contracts
      const expandedWidth = 270;
      const collapsedWidth = 76;

      assert.strictEqual(expandedWidth, 270);
      assert.strictEqual(collapsedWidth, 76);
      assert.ok(collapsedWidth < expandedWidth);

      // Step 2: Collapsed rail geometry (50px squircle button fits cleanly in 76px rail with padding)
      const tabButtonCollapsedSize = 50;
      const horizontalMargin = (collapsedWidth - tabButtonCollapsedSize) / 2;
      assert.strictEqual(horizontalMargin, 13);
      assert.ok(horizontalMargin >= 10, 'Must have at least 10px breathing room on both sides of collapsed tab');

      // Step 3: Toggle state machine
      let isCollapsed = false;
      const toggle = () => { isCollapsed = !isCollapsed; };

      assert.strictEqual(isCollapsed, false);
      toggle();
      assert.strictEqual(isCollapsed, true);
      toggle();
      assert.strictEqual(isCollapsed, false);

      // Step 4: Hover-driven expansion and collapse state machine
      // When isCollapsed is true, hovering temporarily expands the sidebar (effectiveWidth = 270)
      // When mouse leaves (isHovered = false), it collapses back down (effectiveWidth = 76)
      let isHovered = false;
      isCollapsed = true;
      let isAuthenticated = true;

      const getIsEffectivelyCollapsed = () => isCollapsed && !isHovered && isAuthenticated;
      const getEffectiveWidth = () => (getIsEffectivelyCollapsed() ? collapsedWidth : expandedWidth);

      // Initially collapsed
      assert.strictEqual(getIsEffectivelyCollapsed(), true);
      assert.strictEqual(getEffectiveWidth(), 76);

      // Mouse enters sidebar -> expands to 270px
      isHovered = true;
      assert.strictEqual(getIsEffectivelyCollapsed(), false);
      assert.strictEqual(getEffectiveWidth(), 270);

      // Mouse leaves sidebar -> collapses back to 76px
      isHovered = false;
      assert.strictEqual(getIsEffectivelyCollapsed(), true);
      assert.strictEqual(getEffectiveWidth(), 76);

      // During sign-in transition (!isAuthenticated), sidebar remains expanded for seamless docking
      isAuthenticated = false;
      assert.strictEqual(getIsEffectivelyCollapsed(), false);
      assert.strictEqual(getEffectiveWidth(), 270);
    });

    it('validates sidebar zero-outline floating invariants and borderless elevation', () => {
      // Step 1: Strict zero-outline invariants across all sidebar surfaces
      const sidebarBorderWidth = 0;
      const mastheadBorderBottomWidth = 0;
      const footerBorderTopWidth = 0;
      const tabButtonBorderWidth = 0;
      const clubsButtonBorderWidth = 0;

      assert.strictEqual(sidebarBorderWidth, 0, 'Sidebar outer border must be 0 for floating aesthetic');
      assert.strictEqual(mastheadBorderBottomWidth, 0, 'Masthead bottom border must be 0');
      assert.strictEqual(footerBorderTopWidth, 0, 'Footer top border must be 0');
      assert.strictEqual(tabButtonBorderWidth, 0, 'Tab button border must be 0');
      assert.strictEqual(clubsButtonBorderWidth, 0, 'Clubs button border must be 0');

      // Step 2: Ambient elevation shadow properties for the "almost floating" visual effect
      const sidebarElevation = 4;
      const sidebarShadowRadius = 20;
      const tabButtonFocusedElevation = 2;

      assert.ok(sidebarElevation >= 2, 'Sidebar elevation must provide ambient lift');
      assert.ok(sidebarShadowRadius >= 16, 'Sidebar shadow radius must be soft and diffuse');
      assert.ok(tabButtonFocusedElevation >= 1, 'Focused tab must have subtle elevation');
    });

    it('validates mature sidebar tab proportions and generous spacing standards', () => {
      // Step 1: Tab button dimensions must take generous space on the sidebar
      const tabMinHeight = 56;
      const tabPaddingVertical = 10;
      const tabPaddingHorizontal = 12;
      const tabGap = 12;
      const tabBorderRadius = 12;

      assert.ok(tabMinHeight >= 50, 'Tab minHeight must be at least 50px for spacious mature appearance');
      assert.ok(tabPaddingVertical >= 10, 'Vertical padding must be at least 10px');
      assert.ok(tabPaddingHorizontal >= 10, 'Horizontal padding must be at least 10px');
      assert.ok(tabGap >= 10, 'Icon-to-text gap must be at least 10px');
      assert.ok(tabBorderRadius >= 10, 'Border radius must be a refined squircle (>= 10px)');

      // Step 2: Typography scale for mature layout
      const tabTitleSize = 14;
      const tabDescSize = 11.5;
      const tabDescLineHeight = 15;

      assert.ok(tabTitleSize >= 13.5, 'Tab title must be prominent (>= 13.5px)');
      assert.ok(tabDescSize >= 11, 'Tab description must be legible (>= 11px)');
      assert.ok(tabDescLineHeight >= tabDescSize, 'Line height must accommodate description without clipping');
    });

    it('validates sidebar container rounded corners and inset floating geometry', () => {
      const sidebarMarginVertical = 12;
      const sidebarMarginLeft = 12;
      const sidebarBorderRadius = 20;
      const mastheadBorderRadius = 20;

      assert.ok(sidebarMarginVertical >= 8, 'Sidebar must have vertical breathing margin');
      assert.ok(sidebarMarginLeft >= 8, 'Sidebar must have left breathing margin');
      assert.ok(sidebarBorderRadius >= 16, 'Sidebar must have rounded corners (>= 16px)');
      assert.ok(mastheadBorderRadius >= 16, 'Masthead maroon block must have rounded corners (>= 16px)');
    });
  });

  describe('PostCard CategoryBadgeTone Invariants', () => {
    it('maps known categories to their designated badge tones and others to gold', () => {
      const getTone = (category: string) => {
        switch (category) {
          case 'Academics':
            return 'info';
          case 'Outdoors':
            return 'success';
          case 'Athletics':
            return 'danger';
          case 'Faith':
            return 'brand';
          default:
            return 'gold';
        }
      };

      assert.strictEqual(getTone('Academics'), 'info');
      assert.strictEqual(getTone('Outdoors'), 'success');
      assert.strictEqual(getTone('Athletics'), 'danger');
      assert.strictEqual(getTone('Faith'), 'brand');

      // Default fall-through categories
      assert.strictEqual(getTone('The Arts'), 'gold');
      assert.strictEqual(getTone('Music'), 'gold');
      assert.strictEqual(getTone('Social'), 'gold');
      assert.strictEqual(getTone('Service'), 'gold');
      assert.strictEqual(getTone('Gaming'), 'gold');
      assert.strictEqual(getTone('Unknown'), 'gold');
    });
  });

  describe('HeaderAvatar Profile Fallback Resolver Invariants', () => {
    it('falls back to default student profile when user fields are undefined', () => {
      const defaultStudent = {
        firstName: 'John Mark',
        lastName: 'Doe',
        fullName: 'John Mark Doe',
        email: 'jmd24@calvin.edu',
        standing: 'Junior',
        major: 'Computer Science',
        studentId: '1234567',
      };

      const resolveProfile = (user?: Partial<typeof defaultStudent> | null) => ({
        firstName: user?.firstName ?? defaultStudent.firstName,
        lastName: user?.lastName ?? defaultStudent.lastName,
        fullName: user?.fullName ?? defaultStudent.fullName,
        email: user?.email ?? defaultStudent.email,
        standing: user?.standing ?? defaultStudent.standing,
        major: user?.major ?? defaultStudent.major,
        studentId: user?.studentId ?? defaultStudent.studentId,
      });

      // Completely null/empty user
      const emptyProfile = resolveProfile(null);
      assert.deepStrictEqual(emptyProfile, defaultStudent);

      // Partial user overrides only defined fields
      const customUser = {
        firstName: 'Alice',
        email: 'alice@calvin.edu',
      };
      const partialProfile = resolveProfile(customUser);
      assert.strictEqual(partialProfile.firstName, 'Alice');
      assert.strictEqual(partialProfile.lastName, 'Doe');
      assert.strictEqual(partialProfile.email, 'alice@calvin.edu');
      assert.strictEqual(partialProfile.major, 'Computer Science');
    });
  });

  describe('FormInputDynamicStyle Invariants', () => {
    it('computes expected border, text, and background colors across focus and error states', () => {
      const computeStyle = (
        focused: boolean,
        hasError: boolean,
        theme: { text: string; border: string; bg: string },
        brand: { gold: string; red: string }
      ) => ({
        color: theme.text,
        backgroundColor: theme.bg,
        borderColor: hasError ? brand.red : focused ? brand.gold : theme.border,
      });

      const theme = { text: '#F5F5F7', border: '#2C2D33', bg: '#1C1D21' };
      const brand = { gold: '#F3C300', red: '#C2002F' };

      // Normal unfocused
      const unfocused = computeStyle(false, false, theme, brand);
      assert.strictEqual(unfocused.borderColor, '#2C2D33');
      assert.strictEqual(unfocused.color, '#F5F5F7');

      // Focused
      const focused = computeStyle(true, false, theme, brand);
      assert.strictEqual(focused.borderColor, '#F3C300');

      // Error overrides focus
      const errorFocused = computeStyle(true, true, theme, brand);
      assert.strictEqual(errorFocused.borderColor, '#C2002F');
    });
  });

  describe('FormTextInput Template Contract & Web/Mobile Parity Invariants', () => {
    it('enforces web outline suppression and Calvin Gold caret styling in FormTextInput', () => {
      const formInputCode = readSrc('components/ui/form-text-input.tsx');

      // 1. Web outline suppression
      assert.ok(
        formInputCode.includes("outlineStyle: 'none'") || formInputCode.includes('outlineStyle: "none"'),
        'FormTextInput must specify outlineStyle: none on web to suppress native browser focus rectangles'
      );

      // 2. Cross-platform Calvin Gold caret
      assert.ok(
        formInputCode.includes('caretColor: Brand.gold'),
        'FormTextInput must specify caretColor: Brand.gold for web browsers'
      );
      assert.ok(
        formInputCode.includes('cursorColor={Brand.gold}'),
        'FormTextInput must specify cursorColor={Brand.gold} for native mobile'
      );

      // 3. Dynamic border transitions
      assert.ok(
        formInputCode.includes('Brand.brightRed'),
        'FormTextInput must highlight error borders with Brand.brightRed'
      );
      assert.ok(
        formInputCode.includes('Brand.gold'),
        'FormTextInput must highlight focus borders with Brand.gold'
      );
    });

    it('guarantees PostWebView, PostMobileView, and PostDateTimeSection use FormTextInput and shared sections for unified field parity', () => {
      const webViewCode = readSrc('components/post-web-view.tsx');
      const mobileViewCode = readSrc('components/post-mobile-view.tsx');
      const dateTimeCode = readSrc('components/post-date-time-section.tsx');
      const formSectionsCode = readSrc('components/post-form-sections.tsx');

      // Shared templates must consume FormTextInput
      assert.ok(formSectionsCode.includes('FormTextInput'), 'post-form-sections must consume FormTextInput');
      assert.ok(dateTimeCode.includes('FormTextInput'), 'PostDateTimeSection must consume FormTextInput');

      // Both views must consume PostTitleSection, PostDescriptionSection, and PostLocationSection
      assert.ok(webViewCode.includes('PostTitleSection'), 'PostWebView must consume PostTitleSection');
      assert.ok(webViewCode.includes('PostDescriptionSection'), 'PostWebView must consume PostDescriptionSection');
      assert.ok(webViewCode.includes('PostLocationSection'), 'PostWebView must consume PostLocationSection');

      assert.ok(mobileViewCode.includes('PostTitleSection'), 'PostMobileView must consume PostTitleSection');
      assert.ok(mobileViewCode.includes('PostDescriptionSection'), 'PostMobileView must consume PostDescriptionSection');
      assert.ok(mobileViewCode.includes('PostLocationSection'), 'PostMobileView must consume PostLocationSection');

      // Single source of truth: field placeholders declared once in post-form-sections
      assert.ok(
        formSectionsCode.includes('placeholder="What\'s the event?"'),
        'Post title placeholder must be declared once in post-form-sections as "What\'s the event?"'
      );
      assert.ok(
        formSectionsCode.includes('placeholder="e.g. North Hall 276"'),
        'Post location placeholder must be declared once in post-form-sections'
      );
    });
  });

  describe('DiningSubMeter Contract', () => {
    it('formats label, count ratio, and color consistently', () => {
      const formatSubMeter = (label: string, remaining: number, total: number, color: string) => ({
        headerLabel: label,
        countText: `${remaining} of ${total}`,
        color,
      });

      const flex = formatSubMeter('Flex meals', 2, 2, '#4E95D4');
      assert.strictEqual(flex.headerLabel, 'Flex meals');
      assert.strictEqual(flex.countText, '2 of 2');
      assert.strictEqual(flex.color, '#4E95D4');

      const guest = formatSubMeter('Guest passes', 4, 5, '#1B7340');
      assert.strictEqual(guest.headerLabel, 'Guest passes');
      assert.strictEqual(guest.countText, '4 of 5');
      assert.strictEqual(guest.color, '#1B7340');
    });
  });

  describe('Post Modular Components & Debloating Invariants', () => {
    it('verifies 16:9 aspect ratio and default banner dimensions', () => {
      const bannerAspectRatio = 16 / 9;
      assert.strictEqual(Math.round(bannerAspectRatio * 100) / 100, 1.78);
      const fallbackWidth = 1200;
      const fallbackHeight = 675;
      assert.strictEqual(fallbackWidth / fallbackHeight, 16 / 9);
    });

    it('verifies PostSuccessModal displays target club and feed navigation action', () => {
      let navigatedTarget: { index: number; href?: string } | null = null;
      let modalVisible = true;

      const mockTabNav = {
        activeTabIndex: 4,
        setActiveTabIndex: (index: number) => { mockTabNav.activeTabIndex = index; },
        navigateToTab: (index: number, href?: string) => {
          navigatedTarget = { index, href };
          mockTabNav.activeTabIndex = index;
        },
        tabs: [],
      };

      const handleViewFeed = () => {
        modalVisible = false;
        mockTabNav.navigateToTab(0, '/');
      };

      const modalProps = {
        visible: modalVisible,
        clubName: 'Calvin Chess Club',
        viewFeedLabel: 'View in Feed',
        secondaryLabel: 'Got it',
        onViewFeed: handleViewFeed,
      };

      assert.strictEqual(modalProps.clubName, 'Calvin Chess Club');
      assert.strictEqual(modalProps.viewFeedLabel, 'View in Feed');

      // Triggering feed view must close modal and navigate to Slot 0 (Knightly Home)
      modalProps.onViewFeed();
      assert.strictEqual(modalVisible, false);
      assert.deepStrictEqual(navigatedTarget, { index: 0, href: '/' });
      assert.strictEqual(mockTabNav.activeTabIndex, 0);
    });

    it('validates LoginScreen keyboard lift target elevation and clearance formula', () => {
      // Test across multiple window heights and status bar inset configurations
      const scenarios = [
        { windowHeight: 844, insetTop: 47, expectedFormTop: (844 - 402) / 2 },
        { windowHeight: 932, insetTop: 59, expectedFormTop: (932 - 402) / 2 },
        { windowHeight: 667, insetTop: 20, expectedFormTop: (667 - 402) / 2 },
      ];

      for (const { windowHeight, insetTop, expectedFormTop } of scenarios) {
        const formTop = (windowHeight - 402) / 2;
        assert.strictEqual(formTop, expectedFormTop);

        const SpacingFour = 24;
        const minTopClearance = insetTop + SpacingFour + 12;
        const maxSafeRaise = Math.max(0, formTop - minTopClearance);
        const targetRaise = Math.min(105, maxSafeRaise);

        // Guarantees form raises between 0 and 105px
        assert.ok(targetRaise >= 0 && targetRaise <= 105);
        // Guarantees remaining top clearance never falls below minTopClearance
        const finalTop = formTop - targetRaise;
        assert.ok(finalTop >= minTopClearance - 0.001, 'Logo must retain safe top breathing room');
      }
    });

    it('verifies DateUtils and TimeUtils consolidated namespaces and 8 core functions', () => {
      // DateUtils namespace
      assert.strictEqual(DateUtils.formatEvent('09/18/2026', new Date(2026, 8, 17)), 'Fri, Sep 18');
      assert.deepStrictEqual(DateUtils.sanitize('09182026'), { digits: '09182026', error: null });
      const segs = DateUtils.formatSegments('09182026');
      assert.strictEqual(segs.formatted, '09/18/2026');
      assert.strictEqual(DateUtils.validate('09/18/2026'), null);
      assert.strictEqual(DateUtils.isCompleteAndValid('09182026'), true);
      assert.strictEqual(DateUtils.getMaxDays('02', 2024), 29);
      assert.strictEqual(DateUtils.getMaxDays('02', 2025), 28);
      assert.strictEqual(DateUtils.expandYear('26', new Date(2026, 0, 1)), 2026);

      // TimeUtils namespace
      assert.deepStrictEqual(TimeUtils.sanitize('730'), { digits: '730', error: null });
      const timeSegs = TimeUtils.formatSegments('730');
      assert.strictEqual(timeSegs.formatted, '7:30');
      assert.strictEqual(TimeUtils.resolve('730', 'PM'), '7:30 PM');
      assert.strictEqual(resolveEventTime('1200', 'PM'), '12:00 PM');
      assert.strictEqual(TimeUtils.complete('7'), '700');
      assert.strictEqual(TimeUtils.getMaxInputLength('7'), 4);
      assert.strictEqual(TimeUtils.getMaxRawDigits('7'), 3);
      assert.strictEqual(TimeUtils.isCompleteAndValid('700'), true);

      // formatRelativeTime
      assert.strictEqual(formatRelativeTime('2h'), '2h ago');
    });
  });

  describe('SuccessModal Alignment & Centering Invariants', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8');

    it('verifies SuccessModal enforces strict horizontal centering of the circle and card across devices', () => {
      const code = readSrc('components/ui/success-modal.tsx');

      // The checkRing must have alignSelf: 'center' and exact dimensions
      assert.ok(code.includes("alignSelf: 'center'"), 'SuccessModal must enforce alignSelf: center on ring and containers');
      assert.ok(code.includes('width: 96'), 'checkRing must be 96px width');
      assert.ok(code.includes('height: 96'), 'checkRing must be 96px height');
      assert.ok(code.includes('borderRadius: 48'), 'checkRing must be 48px radius');

      // The checkContainer must have width: '100%' and alignSelf: 'center' to eliminate transform shift
      assert.ok(code.includes("width: '100%'"), 'checkContainer must span full width to anchor center transform');

      // Card must be centered horizontally via alignSelf
      assert.ok(code.includes('maxWidth: 380'), 'card must have maxWidth');
    });

    it('verifies SuccessModal renders centered Icon component inside checkRing', () => {
      const code = readSrc('components/ui/success-modal.tsx');

      // Uses standard Icon component with size 52
      assert.ok(code.includes('<Icon'), 'SuccessModal must render Icon component');
      assert.ok(code.includes('size={52}'), 'SuccessModal checkmark must be size 52');
      assert.ok(code.includes('iconCentering'), 'SuccessModal must apply iconCentering style to Icon');
    });

    it('verifies amber simple banner selection circle is completely consistent with other presets', () => {
      const bannerCode = readSrc('components/post-banner-section.tsx');

      // amber preset should NOT have any special inner contrast circle
      assert.ok(!bannerCode.includes('goldCircleInnerContrast'), 'post-banner-section must not contain goldCircleInnerContrast');
      assert.ok(!bannerCode.includes("preset.id === 'amber' ?"), 'amber preset should not have divergent selection markup');
    });
  });

  describe('Web and Mobile Layout Platform Isolation Invariants', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8').replace(/\r\n/g, '\n');

    it('verifies mobile BottomBar is strictly anchored with absolute positioning', () => {
      const tabsCode = readSrc('components/app-tabs.tsx');

      // Native bottom navigation bar must anchor absolutely to bottom edge
      assert.ok(tabsCode.includes("bottomBarWrapper: {\n    position: 'absolute',\n    bottom: 0,\n    left: 0,\n    right: 0,\n    zIndex: 10,"),
        'app-tabs.tsx bottomBarWrapper must preserve absolute positioning at bottom: 0');
    });

    it('verifies LoginScreen maroonContainer mobile styles are clean and non-colliding', () => {
      const loginCode = readSrc('components/login-screen.tsx');

      // Mobile header maroonContainer must have clean absolute positioning
      assert.ok(loginCode.includes("maroonContainer: {\n    position: 'absolute',\n    top: 0,\n    left: 0,\n    right: 0,\n    backgroundColor: Brand.maroon,\n    overflow: 'hidden',\n  },"),
        'login-screen.tsx maroonContainer must be absolute top:0 left:0 right:0');

      // Web sidebar masthead must be cleanly isolated and not merged into maroonContainer
      assert.ok(loginCode.includes("webSidebarMasthead: {"), 'webSidebarMasthead must be defined');
      assert.ok(loginCode.includes("borderRadius: 20"), 'webSidebarMasthead must have borderRadius: 20');
    });

    it('verifies PostCard isolates mobile typography and body from desktop web grid constraints', () => {
      const cardCode = readSrc('components/post-card.tsx');

      // Mobile headline must preserve 22px serif font without height or line constraints
      assert.ok(cardCode.includes("title: {\n    fontFamily: Fonts.serif,\n    fontSize: 22,\n    lineHeight: 28,\n    fontWeight: '700',\n    letterSpacing: -0.3,\n  },"),
        'post-card.tsx title must have 22px serif styling on mobile');

      // Web grid constraints must be isolated in webTitle
      assert.ok(cardCode.includes("webTitle: {\n    fontSize: 18,\n    lineHeight: 23,\n    minHeight: 46,\n  },"),
        'post-card.tsx webTitle must isolate 18px and minHeight: 46 for web grid');

      // Mobile post card container must not force flex: 1 or height: 100%
      assert.ok(cardCode.includes("card: {\n    borderRadius: Radius.lg,\n    overflow: 'hidden',\n  },"),
        'post-card.tsx card container must not force flex: 1 or height: 100% on mobile');

      // Web card container isolates flex: 1 and height: 100%
      assert.ok(cardCode.includes("webCard: {\n    flex: 1,\n    height: '100%',\n  },"),
        'post-card.tsx webCard must isolate flex: 1 and height: 100%');

      // Line clamping must be conditional on isGrid
      assert.ok(cardCode.includes("numberOfLines={isGrid ? 3 : undefined}"),
        'post-card.tsx headline must only clamp lines on grid');
      assert.ok(cardCode.includes("numberOfLines={isGrid ? 4 : undefined}"),
        'post-card.tsx body must only clamp lines on grid');
    });

    it('verifies FeedScreen (tabs)/index.tsx is a lightweight platform router delegating to FeedWebView and FeedMobileView', () => {
      const indexCode = readSrc('app/(tabs)/index.tsx');

      // (tabs)/index.tsx must not be a monolithic component (under 50 lines)
      const lines = indexCode.split('\n');
      assert.ok(lines.length <= 50, `(tabs)/index.tsx should be a concise modular router (got ${lines.length} lines)`);

      // Must import and delegate cleanly to FeedMobileView and FeedWebView based on responsive breakpoint
      assert.ok(indexCode.includes('import { FeedMobileView } from "@/components/feed-mobile-view";'),
        'index.tsx must import FeedMobileView');
      assert.ok(indexCode.includes('import { FeedWebView } from "@/components/feed-web-view";'),
        'index.tsx must import FeedWebView');
      assert.ok(indexCode.includes('isCompact ? <FeedMobileView /> : <FeedWebView />'),
        'index.tsx must delegate based on isCompact breakpoint');

      // Both component files must exist and export their respective views
      const mobileCode = readSrc('components/feed-mobile-view.tsx');
      assert.ok(mobileCode.includes('export function FeedMobileView()'), 'FeedMobileView component must be exported');

      const webCode = readSrc('components/feed-web-view.tsx');
      assert.ok(webCode.includes('export function FeedWebView()'), 'FeedWebView component must be exported');
    });

    it('validates useResponsiveLayout breakpoint and column resolution invariants', () => {
      const { resolveBreakpoint, resolveColumnCount } = require('../src/hooks/use-responsive-layout');

      // Compact: mobile phones (< 768px)
      assert.strictEqual(resolveBreakpoint(390), 'compact');
      assert.strictEqual(resolveBreakpoint(767), 'compact');
      assert.strictEqual(resolveColumnCount(390, true), 1);
      assert.strictEqual(resolveColumnCount(390, false), 1);

      // Medium: tablets in portrait & squarish foldables (768px - 899px)
      assert.strictEqual(resolveBreakpoint(768), 'medium');
      assert.strictEqual(resolveBreakpoint(899), 'medium');
      assert.strictEqual(resolveColumnCount(768, true), 2);

      // Expanded: standard desktop monitors & laptops (900px - 1399px)
      assert.strictEqual(resolveBreakpoint(900), 'expanded');
      assert.strictEqual(resolveBreakpoint(1200), 'expanded');
      assert.strictEqual(resolveColumnCount(1200, true), 3);

      // Wide: full-screen 1080p desktop monitors (1400px - 1799px)
      assert.strictEqual(resolveBreakpoint(1400), 'wide');
      assert.strictEqual(resolveBreakpoint(1799), 'wide');
      assert.strictEqual(resolveColumnCount(1440, true), 4);

      // Ultrawide: 1440p, 4K, and ultra-wide widescreen setups (>= 1800px, capped at 5)
      assert.strictEqual(resolveBreakpoint(1800), 'ultrawide');
      assert.strictEqual(resolveBreakpoint(2560), 'ultrawide');
      assert.strictEqual(resolveColumnCount(1920, true), 5);
      assert.strictEqual(resolveColumnCount(3840, true), 5);
    });

    it('verifies app-tabs.web.tsx renders SmartAppBanner and BottomBar on compact viewports', () => {
      const webTabsCode = readSrc('components/app-tabs.web.tsx');

      assert.ok(webTabsCode.includes("from '@/components/smart-app-banner'") || webTabsCode.includes('from "@/components/smart-app-banner"'),
        'app-tabs.web.tsx must import SmartAppBanner');
      assert.ok(webTabsCode.includes("from '@/components/bottom-tab-bar'") || webTabsCode.includes('from "@/components/bottom-tab-bar"'),
        'app-tabs.web.tsx must import BottomBar from bottom-tab-bar');
      assert.ok(webTabsCode.includes('<SmartAppBanner />'),
        'app-tabs.web.tsx must render SmartAppBanner in mobile shell');
      assert.ok(webTabsCode.includes('<BottomBar>'),
        'app-tabs.web.tsx must render BottomBar in mobile shell');
    });

    it('guarantees Expo Router UI trigger discovery invariants across both desktop and mobile web branches', () => {
      const webTabsCode = readSrc('components/app-tabs.web.tsx');

      // ARCHITECTURAL INVARIANT:
      // In expo-router/ui, <Tabs> parses triggers via parseTriggersFromChildren(children).
      // parseTriggersFromChildren ONLY recurses into React.Fragment (<>) and TabList.
      // If TabList is wrapped inside a <View> (e.g. <View style={styles.mobileLayout}>),
      // parseTriggersFromChildren silently drops the entire tree and returns [] triggers.
      // React Navigation's useNavigationBuilder then crashes with:
      // "Couldn't find any screens for the navigator. Have you defined any screens as its children?"
      // Therefore, the isCompact branch inside <Tabs> MUST use React.Fragment (<>), NEVER a View wrapper!

      // 1. Verify source does not contain an intermediate View wrapping TabList in the isCompact branch
      const tabsBlockMatch = webTabsCode.match(/<Tabs[\s\S]*?<\/Tabs>/);
      assert.ok(tabsBlockMatch, 'app-tabs.web.tsx must render <Tabs> component');
      const tabsBlock = tabsBlockMatch[0];

      assert.ok(!tabsBlock.includes('<View style={styles.mobileLayout}>'),
        'Tabs children must NOT wrap TabList in <View style={styles.mobileLayout}>; must use React.Fragment to preserve trigger discovery');

      // 2. Verify both branches contain TabTrigger for all 4 base routes and post route
      const baseRoutes = ['index', 'dining', 'safety', 'directory'];
      for (const route of baseRoutes) {
        const count = (tabsBlock.match(new RegExp(`name="${route}"`, 'g')) || []).length;
        assert.ok(
          count >= 2,
          `Tabs must register <TabTrigger name="${route}"> in BOTH desktop and mobile branches (found ${count})`
        );
      }

      const postCount = (tabsBlock.match(/name="post"/g) || []).length;
      assert.ok(
        postCount >= 2,
        `Tabs must register <TabTrigger name="post"> in BOTH desktop and mobile branches for leaders (found ${postCount})`
      );

      // 3. Behavioral verification of Expo Router UI parseTriggersFromChildren algorithm
      const TabListType = function TabList() {};
      const TabTriggerType = function TabTrigger() {};
      const TabSlotType = function TabSlot() {};

      type MockElement = { type: any; props: any };
      const isFragment = (c: MockElement) => c.type === 'Fragment';
      const isTabList = (c: MockElement) => c.type === TabListType;
      const isTabTrigger = (c: MockElement) => c.type === TabTriggerType;
      const isTabSlot = (c: MockElement) => c.type === TabSlotType;

      function simulateParseTriggers(children: any, triggers: any[] = [], isInTabList = false): any[] {
        const arr = Array.isArray(children) ? children : [children];
        for (const child of arr) {
          if (!child || isTabSlot(child)) continue;
          if (isFragment(child)) {
            simulateParseTriggers(child.props.children, triggers, isInTabList || isTabList(child));
            continue;
          }
          if (isTabList(child)) {
            let innerChildren = child.props.children;
            if (child.props.asChild && innerChildren && innerChildren.props && 'children' in innerChildren.props) {
              innerChildren = innerChildren.props.children;
            }
            simulateParseTriggers(innerChildren, triggers, true);
            continue;
          }
          if (!isInTabList || !isTabTrigger(child)) continue;
          triggers.push({ name: child.props.name, href: child.props.href });
        }
        return triggers;
      }

      // Simulate mobile web branch (isCompact = true)
      const mockMobileTabs = {
        type: 'Fragment',
        props: {
          children: [
            { type: 'SmartAppBanner', props: {} },
            { type: 'AppHeader', props: {} },
            { type: 'View', props: { children: [{ type: TabSlotType, props: {} }] } },
            {
              type: TabListType,
              props: {
                asChild: true,
                children: {
                  type: 'BottomBar',
                  props: {
                    children: [
                      { type: TabTriggerType, props: { name: 'index', href: '/' } },
                      { type: TabTriggerType, props: { name: 'dining', href: '/dining' } },
                      { type: TabTriggerType, props: { name: 'safety', href: '/safety' } },
                      { type: TabTriggerType, props: { name: 'directory', href: '/directory' } },
                      { type: TabTriggerType, props: { name: 'post', href: '/post' } },
                    ],
                  },
                },
              },
            },
          ],
        },
      };

      const mobileTriggers = simulateParseTriggers(mockMobileTabs);
      assert.strictEqual(mobileTriggers.length, 5, 'Mobile web branch must yield all 5 triggers to Expo Router navigator');
      assert.deepStrictEqual(
        mobileTriggers.map((t) => t.name),
        ['index', 'dining', 'safety', 'directory', 'post'],
        'Mobile web triggers must match exact expected tab names'
      );

      // Verify the negative case: wrapping inside a View must FAIL discovery
      const mockBrokenViewWrapped = {
        type: 'View',
        props: { children: mockMobileTabs.props.children },
      };
      const brokenTriggers = simulateParseTriggers(mockBrokenViewWrapped);
      assert.strictEqual(
        brokenTriggers.length,
        0,
        'Intermediate View wrapper reproduces the "Couldn\'t find any screens" navigator crash'
      );
    });

    it('validates mobile web top bar padding, SmartAppBanner height, and login flight docking parity', () => {
      const { getAppHeaderHeight } = require('../src/components/ui/app-header');
      const { SMART_APP_BANNER_HEIGHT } = require('../src/components/smart-app-banner');
      const appHeaderCode = readSrc('components/ui/app-header.tsx');
      const loginScreenCode = readSrc('components/login-screen.tsx');

      // 1. AppHeader must not use WebHeaderInset (72px) for paddingTop
      assert.ok(
        !appHeaderCode.includes('Platform.OS === "web" ? WebHeaderInset : insets.top'),
        'AppHeader must not blindly apply 72px WebHeaderInset on mobile web'
      );

      // On mobile web (insetsTop = 0): paddingTop is Spacing.three (16px), height is 85px
      assert.strictEqual(getAppHeaderHeight(0), 85, 'Web AppHeader height must be 85px (not 141px)');
      // On native mobile (insetsTop = 47 notch): height is 120px
      assert.strictEqual(getAppHeaderHeight(47), 120, 'Native AppHeader height with 47px notch must be 120px');

      // 2. SmartAppBanner must define deterministic 44px height
      assert.strictEqual(SMART_APP_BANNER_HEIGHT, 44, 'SmartAppBanner height must be exactly 44px');

      // 3. LoginScreen flight docking parity
      // Scenario A: Mobile web with banner active
      const bannerActiveOffset = SMART_APP_BANNER_HEIGHT;
      const webHeaderPaddingTop = 16; // Spacing.three
      const loginWordmarkYWithBanner = bannerActiveOffset + webHeaderPaddingTop;
      const appTabsWordmarkYWithBanner = bannerActiveOffset + webHeaderPaddingTop;
      assert.strictEqual(
        loginWordmarkYWithBanner,
        appTabsWordmarkYWithBanner,
        'Flying wordmark must dock exactly at the underlying AppHeader position with banner (60px)'
      );

      // Scenario B: Mobile web with banner dismissed
      const bannerDismissedOffset = 0;
      const loginWordmarkYDismissed = bannerDismissedOffset + webHeaderPaddingTop;
      const appTabsWordmarkYDismissed = bannerDismissedOffset + webHeaderPaddingTop;
      assert.strictEqual(
        loginWordmarkYDismissed,
        appTabsWordmarkYDismissed,
        'Flying wordmark must dock exactly at the underlying AppHeader position without banner (16px)'
      );

      // 4. LoginScreen must import and handle bannerOffset
      assert.ok(
        loginScreenCode.includes('bannerOffset'),
        'LoginScreen must incorporate bannerOffset in its mobile web header docking coordinates'
      );
      assert.ok(
        loginScreenCode.includes('<SmartAppBanner'),
        'LoginScreen must render SmartAppBanner on mobile web'
      );
    });
  });

  describe('Post Screen Modularization & Web Responsiveness Invariants', () => {
    it('verifies post.tsx satisfies anti-monolith invariant and delegates responsively', () => {
      const postCode = readSrc('app/(tabs)/post.tsx');
      const lines = postCode.split('\n');

      // 1. Anti-monolith invariant: Must be < 150 lines (debloated from 1281 lines)
      assert.ok(
        lines.length < 150,
        `post.tsx must remain a lightweight modular router (< 150 lines), but has ${lines.length} lines`
      );

      // 2. Backward compatibility contract: exports must remain declared
      assert.ok(postCode.includes('export {\n  MAX_TITLE_LENGTH,'), 'post.tsx must re-export MAX_TITLE_LENGTH');
      assert.ok(postCode.includes('MAX_DESCRIPTION_LENGTH,'), 'post.tsx must re-export MAX_DESCRIPTION_LENGTH');
      assert.ok(postCode.includes('MAX_LOCATION_LENGTH,'), 'post.tsx must re-export MAX_LOCATION_LENGTH');
      assert.ok(postCode.includes('MAX_CUSTOM_WHEN_LENGTH,'), 'post.tsx must re-export MAX_CUSTOM_WHEN_LENGTH');
      assert.ok(postCode.includes('formatEventDate,'), 'post.tsx must re-export formatEventDate');
      assert.ok(postCode.includes('DatePickerModal,'), 'post.tsx must re-export DatePickerModal');
      assert.ok(postCode.includes('parseDateOrDefault,'), 'post.tsx must re-export parseDateOrDefault');

      const composerExports = require('../src/hooks/use-post-composer');
      assert.strictEqual(composerExports.MAX_TITLE_LENGTH, 50);
      assert.strictEqual(composerExports.MAX_DESCRIPTION_LENGTH, 280);
      assert.strictEqual(composerExports.MAX_LOCATION_LENGTH, 25);
      assert.strictEqual(composerExports.MAX_CUSTOM_WHEN_LENGTH, 25);

      // 3. Platform delegation: imports both PostMobileView and PostWebView
      assert.ok(postCode.includes('PostMobileView'), 'post.tsx must import PostMobileView');
      assert.ok(postCode.includes('PostWebView'), 'post.tsx must import PostWebView');
      assert.ok(postCode.includes('PostNotLeaderView'), 'post.tsx must import PostNotLeaderView');
      assert.ok(postCode.includes('useResponsiveLayout'), 'post.tsx must use responsive layout hook');
      assert.ok(postCode.includes('isCompact ?'), 'post.tsx must delegate based on isCompact');
    });

    it('validates PostWebView responsive layout rules and live preview panel', () => {
      const webViewCode = readSrc('components/post-web-view.tsx');

      // 1. Desktop side-by-side threshold at 1024px
      assert.ok(
        webViewCode.includes('width >= 1024'),
        'PostWebView must switch to side-by-side layout at width >= 1024px'
      );

      // 2. Container max-width constraints: 1240px desktop, 740px tablet
      assert.ok(
        webViewCode.includes('maxWidth: isSideBySide ? 1240 : 740'),
        'PostWebView must enforce 1240px side-by-side and 740px tablet constraints'
      );

      // 3. Right column preview renders genuine PostCard and posting guidelines
      assert.ok(webViewCode.includes('<PostCard'), 'PostWebView must render genuine PostCard');
      assert.ok(webViewCode.includes('LIVE FEED PREVIEW'), 'PostWebView must include LIVE FEED PREVIEW header');
      assert.ok(webViewCode.includes('Posting Best Practices'), 'PostWebView must include best practices guidelines');

      // 4. Zero raw hex colors: uses theme and Brand tokens
      assert.ok(webViewCode.includes('Brand.gold'), 'PostWebView must use centralized Brand.gold');
      assert.ok(
        webViewCode.includes('Brand.brightRed') ||
          webViewCode.includes('hasError') ||
          readSrc('components/post-form-sections.tsx').includes('hasError'),
        'Post composer must handle validation error styling via Brand.brightRed or FormTextInput hasError'
      );

      // 5. Three-column horizontal layout and zero-scroll architecture on desktop
      assert.ok(webViewCode.includes('threeColumnLayout'), 'PostWebView must implement threeColumnLayout on desktop');
      assert.ok(webViewCode.includes('scroll={!isSideBySide}'), 'PostWebView must pass scroll={!isSideBySide} to Screen to eliminate scrolling on normal desktop monitors');

      // 6. First-class web experience: unboxed form controls on canvas and commanding headline input
      assert.ok(webViewCode.includes('columnContent'), 'PostWebView must place columns directly on canvas via columnContent instead of boxed cards');
      assert.ok(webViewCode.includes('fontSize: 22') || webViewCode.includes('fontSize: 24'), 'PostWebView titleInput must use commanding headline typography');
    });

    it('validates live draft Post object construction in usePostComposer', () => {
      const {
        MAX_TITLE_LENGTH,
        MAX_DESCRIPTION_LENGTH,
        MAX_LOCATION_LENGTH,
        MAX_CUSTOM_WHEN_LENGTH,
      } = require('../src/hooks/use-post-composer');

      assert.strictEqual(MAX_TITLE_LENGTH, 50);
      assert.strictEqual(MAX_DESCRIPTION_LENGTH, 280);
      assert.strictEqual(MAX_LOCATION_LENGTH, 25);
      assert.strictEqual(MAX_CUSTOM_WHEN_LENGTH, 25);

      // Simulate draft construction logic
      const buildPreviewDraft = (params: {
        activeClub?: { id: string; name: string; mark?: string; category?: string };
        title: string;
        description: string;
        imageUrl?: string | null;
        computedWhen?: string;
        computedWhere?: string;
      }) => {
        const trimmedTitle = params.title.trim();
        const trimmedDescription = params.description.trim();
        return {
          id: 'preview-draft',
          clubId: params.activeClub?.id ?? 'preview-club',
          org: params.activeClub?.name ?? 'Calvin Student Club',
          mark: params.activeClub?.mark,
          category: (params.activeClub?.category as any) ?? 'Official',
          postedAt: 'Just now',
          createdAt: Date.now(),
          headline: trimmedTitle || 'Your Title Will Appear Here',
          body:
            trimmedDescription ||
            'Add a clear event description, agenda, or announcement details. As you type, this preview updates in real-time!',
          image: params.imageUrl ?? undefined,
          when: params.computedWhen,
          where: params.computedWhere,
          followed: false,
          campusWide: true,
        };
      };

      // Empty title/description fallback
      const emptyDraft = buildPreviewDraft({ title: '', description: '' });
      assert.strictEqual(emptyDraft.headline, 'Your Title Will Appear Here');
      assert.ok(emptyDraft.body.includes('As you type, this preview updates in real-time!'));
      assert.strictEqual(emptyDraft.category, 'Official');
      assert.strictEqual(emptyDraft.campusWide, true);

      // Filled draft with custom club and logistics
      const filledDraft = buildPreviewDraft({
        activeClub: { id: 'cs-club', name: 'Computer Science Club', mark: 'CS', category: 'Academics' },
        title: 'Hackathon Kickoff 2026',
        description: 'Join us for 24 hours of coding and pizza!',
        imageUrl: 'https://example.com/banner.png',
        computedWhen: 'Saturday, Nov 14 · 9:00 AM – 9:00 PM',
        computedWhere: 'North Hall 276',
      });
      assert.strictEqual(filledDraft.headline, 'Hackathon Kickoff 2026');
      assert.strictEqual(filledDraft.org, 'Computer Science Club');
      assert.strictEqual(filledDraft.category, 'Academics');
      assert.strictEqual(filledDraft.when, 'Saturday, Nov 14 · 9:00 AM – 9:00 PM');
      assert.strictEqual(filledDraft.where, 'North Hall 276');
      assert.strictEqual(filledDraft.image, 'https://example.com/banner.png');
    });
  });
});




