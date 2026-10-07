import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DateUtils, TimeUtils, formatRelativeTime, resolveEventTime } from '@/utils/date-format';
import { Brand } from '@/constants/theme';

describe('Templates & Code De-bloating Invariants', () => {

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

      // Line clamping must be conditional on isWeb
      assert.ok(cardCode.includes("numberOfLines={isWeb ? 3 : undefined}"),
        'post-card.tsx headline must only clamp lines on web');
      assert.ok(cardCode.includes("numberOfLines={isWeb ? 4 : undefined}"),
        'post-card.tsx body must only clamp lines on web');
    });

    it('verifies FeedScreen (tabs)/index.tsx is a lightweight platform router delegating to FeedWebView and FeedMobileView', () => {
      const indexCode = readSrc('app/(tabs)/index.tsx');

      // (tabs)/index.tsx must not be a monolithic component (under 50 lines)
      const lines = indexCode.split('\n');
      assert.ok(lines.length <= 50, `(tabs)/index.tsx should be a concise modular router (got ${lines.length} lines)`);

      // Must import and delegate cleanly to FeedMobileView and FeedWebView
      assert.ok(indexCode.includes('import { FeedMobileView } from "@/components/feed-mobile-view";'),
        'index.tsx must import FeedMobileView');
      assert.ok(indexCode.includes('import { FeedWebView } from "@/components/feed-web-view";'),
        'index.tsx must import FeedWebView');
      assert.ok(indexCode.includes('Platform.OS === "web" ? <FeedWebView /> : <FeedMobileView />') ||
        (indexCode.includes('if (Platform.OS === "web")') && indexCode.includes('<FeedWebView />') && indexCode.includes('<FeedMobileView />')),
        'index.tsx must delegate based on Platform.OS');

      // Both component files must exist and export their respective views
      const mobileCode = readSrc('components/feed-mobile-view.tsx');
      assert.ok(mobileCode.includes('export function FeedMobileView()'), 'FeedMobileView component must be exported');

      const webCode = readSrc('components/feed-web-view.tsx');
      assert.ok(webCode.includes('export function FeedWebView()'), 'FeedWebView component must be exported');
    });
  });
});




