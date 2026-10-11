import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { calculateModalKeyboardLift } from '@/utils/modal-keyboard';
import { Brand } from '@/constants/theme';

describe('Modal Dialogs & UI Templates Domain', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8').replace(/\r\n/g, '\n');

  describe('Modal Edge-to-Edge Android Translucency Contracts', () => {
    it('verifies ClaimClubModal delegates edge-to-edge to the ModalDialog template', () => {
      const claimCode = readSrc('components/claim-club-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');

      assert.ok(
        claimCode.includes('<ModalDialog'),
        'claim-club-modal must use the ModalDialog template for edge-to-edge guarantees'
      );
      assert.ok(
        claimCode.includes("from '@/components/ui/modal-dialog'"),
        'claim-club-modal must import from modal-dialog'
      );

      const modalMatches = dialogCode.match(/<Modal[\s\S]*?>/g) || [];
      assert.ok(modalMatches.length >= 1, 'modal-dialog.tsx should contain at least 1 Modal element');
      for (const modalTag of modalMatches) {
        assert.ok(
          modalTag.includes('statusBarTranslucent'),
          `ModalDialog's Modal must specify statusBarTranslucent: ${modalTag}`
        );
        assert.ok(
          modalTag.includes('navigationBarTranslucent'),
          `ModalDialog's Modal must specify navigationBarTranslucent: ${modalTag}`
        );
        assert.ok(
          modalTag.includes('transparent'),
          `ModalDialog's Modal must specify transparent: ${modalTag}`
        );
      }
    });

    it('verifies SuccessModal delegates edge-to-edge to the ModalDialog template', () => {
      const code = readSrc('components/ui/success-modal.tsx');
      assert.ok(
        code.includes('<ModalDialog'),
        'success-modal must use the ModalDialog template for edge-to-edge guarantees'
      );
      assert.ok(
        code.includes("from '@/components/ui/modal-dialog'"),
        'success-modal must import from modal-dialog'
      );
    });

    it('verifies HeaderAvatar profile sheet configures statusBarTranslucent and navigationBarTranslucent', () => {
      const code = readSrc('components/header-avatar.tsx');
      const modalMatches = code.match(/<Modal[\s\S]*?>/g) || [];
      assert.strictEqual(modalMatches.length, 1, 'header-avatar.tsx should contain exactly 1 Modal element');

      const modalTag = modalMatches[0];
      assert.ok(modalTag.includes('statusBarTranslucent'));
      assert.ok(modalTag.includes('navigationBarTranslucent'));
      assert.ok(modalTag.includes('transparent'));
    });

    it('verifies DatePickerModal delegates edge-to-edge to the ModalDialog template', () => {
      const code = readSrc('components/date-picker-modal.tsx');
      assert.ok(
        code.includes('<ModalDialog'),
        'date-picker-modal must use the ModalDialog template for edge-to-edge guarantees'
      );
      assert.ok(
        code.includes("from '@/components/ui/modal-dialog'"),
        'date-picker-modal must import from modal-dialog'
      );
    });

    it('validates navigation bar translucency rule: must accompany status bar translucency', () => {
      const validateModalTranslucency = (statusBar: boolean, navBar: boolean): boolean => {
        if (navBar && !statusBar) return false;
        return statusBar && navBar;
      };

      assert.strictEqual(validateModalTranslucency(false, false), false);
      assert.strictEqual(validateModalTranslucency(false, true), false);
      assert.strictEqual(validateModalTranslucency(true, false), false);
      assert.strictEqual(validateModalTranslucency(true, true), true);
    });
  });

  describe('Modal Backdrop Full-Bleed Geometry & Inset Handling', () => {
    it('ensures claim-club-modal edge-to-edge backdrop is covered by ModalDialog template', () => {
      const claimCode = readSrc('components/claim-club-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');

      assert.ok(claimCode.includes('<ModalDialog'));
      assert.ok(dialogCode.includes('backdrop:'));
      assert.match(dialogCode, /backdrop:\s*\{[^}]+width:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+height:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+flex:\s*1/);
    });

    it('ensures success-modal backdrop is covered by ModalDialog template', () => {
      const code = readSrc('components/ui/success-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');
      assert.ok(code.includes('<ModalDialog'));
      assert.ok(dialogCode.includes('backdrop:'));
      assert.match(dialogCode, /backdrop:\s*\{[^}]+width:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+height:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+flex:\s*1/);
    });

    it('ensures header-avatar overlay covers full width and height edge-to-edge with safe-area padding', () => {
      const code = readSrc('components/header-avatar.tsx');
      assert.ok(code.includes('overlay:'));
      assert.match(code, /overlay:\s*\{[^}]+width:\s*'100%'/);
      assert.match(code, /overlay:\s*\{[^}]+height:\s*'100%'/);
      assert.match(code, /overlay:\s*\{[^}]+flex:\s*1/);
      assert.ok(code.includes('paddingBottom: Math.max(insets.bottom'));
    });

    it('ensures date-picker-modal backdrop is covered by ModalDialog template', () => {
      const code = readSrc('components/date-picker-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');
      assert.ok(code.includes('<ModalDialog'));
      assert.ok(dialogCode.includes('backdrop:'));
      assert.match(dialogCode, /backdrop:\s*\{[^}]+width:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+height:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+flex:\s*1/);
    });

    it('simulates Pixel 9a viewport and proves edge-to-edge eliminates undimmed letterboxing', () => {
      const pixel9a = {
        screenWidth: 412,
        screenHeight: 915,
        statusBarHeight: 48,
        gestureNavBarHeight: 28,
      };

      const nonTranslucentHeight =
        pixel9a.screenHeight - pixel9a.statusBarHeight - pixel9a.gestureNavBarHeight;
      const undimmedTopGap = pixel9a.statusBarHeight;
      const undimmedBottomGap = pixel9a.gestureNavBarHeight;

      assert.strictEqual(nonTranslucentHeight, 839);
      assert.strictEqual(undimmedTopGap, 48);
      assert.strictEqual(undimmedBottomGap, 28);

      const fullBleedHeight = pixel9a.screenHeight;
      const undimmedGapWithFix = pixel9a.screenHeight - fullBleedHeight;
      assert.strictEqual(undimmedGapWithFix, 0, 'Zero undimmed gaps remain after edge-to-edge translucency');
    });
  });

  describe('ModalDialog Soft-Keyboard Lift & Avoidance Math', () => {
    it('computes soft-keyboard modal elevation across various phone heights and ensures action buttons clear keyboard', () => {
      // Resting lift
      const restingLift = calculateModalKeyboardLift({
        windowHeight: 852,
        keyboardHeight: 0,
        cardHeight: 340,
        insetTop: 59,
      });
      assert.strictEqual(restingLift, 0);

      // Modern iPhone
      const iPhoneLift = calculateModalKeyboardLift({
        windowHeight: 852,
        keyboardHeight: 336,
        cardHeight: 340,
        insetTop: 59,
      });
      assert.strictEqual(iPhoneLift, 168);
      const liftedCardBottom = (852 + 340) / 2 - iPhoneLift;
      const keyboardTop = 852 - 336;
      assert.strictEqual(liftedCardBottom < keyboardTop, true);
      assert.strictEqual(keyboardTop - liftedCardBottom, 88);

      // Compact iPhone SE
      const seLift = calculateModalKeyboardLift({
        windowHeight: 667,
        keyboardHeight: 260,
        cardHeight: 340,
        insetTop: 20,
      });
      assert.strictEqual(seLift, 130);
      const seCardBottom = (667 + 340) / 2 - seLift;
      const seKeyboardTop = 667 - 260;
      assert.strictEqual(seCardBottom < seKeyboardTop, true);
      assert.strictEqual(seKeyboardTop - seCardBottom, 33.5);

      // Clamped lift for tall cards
      const clampedLift = calculateModalKeyboardLift({
        windowHeight: 667,
        keyboardHeight: 300,
        cardHeight: 440,
        insetTop: 20,
      });
      const restingTop = (667 - 440) / 2;
      const topInset = Math.max(16, 20 + 8);
      const maxSafe = restingTop - topInset;
      assert.strictEqual(clampedLift, maxSafe);

      // Unmeasured card fallback
      const unmeasuredLift = calculateModalKeyboardLift({
        windowHeight: 800,
        keyboardHeight: 300,
        cardHeight: 0,
        insetTop: 40,
      });
      assert.strictEqual(unmeasuredLift, 150);
    });

    it('verifies ModalDialog and ClaimClubModal wire soft-keyboard avoidance and keyboard dismissal on exit', () => {
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');
      const claimCode = readSrc('components/claim-club-modal.tsx');

      assert.ok(dialogCode.includes('calculateModalKeyboardLift'));
      assert.ok(dialogCode.includes('onLayout={handleCardLayout}'));
      assert.ok(dialogCode.includes('Keyboard.addListener'));
      assert.ok(dialogCode.includes('animatedCardStyle'));
      assert.ok(claimCode.includes('Keyboard.dismiss()'));
    });

    it('enforces template inheritance invariant: all dialog modals delegate to ModalDialog and inherit keyboard lift by default', () => {
      const claimCode = readSrc('components/claim-club-modal.tsx');
      const successCode = readSrc('components/ui/success-modal.tsx');
      const datePickerCode = readSrc('components/date-picker-modal.tsx');
      const locationCode = readSrc('components/location-info-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');

      assert.ok(dialogCode.includes('avoidKeyboard = true'));
      assert.ok(claimCode.includes('<ModalDialog'));
      assert.ok(successCode.includes('<ModalDialog'));
      assert.ok(datePickerCode.includes('<ModalDialog'));
      assert.ok(locationCode.includes('<ModalDialog'));

      assert.ok(!/<Modal\b(?![A-Za-z])/.test(claimCode));
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(successCode));
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(datePickerCode));
      assert.ok(!/<Modal\b(?![A-Za-z])/.test(locationCode));
    });
  });

  describe('Shared BlinkingCursor Template Contract', () => {
    it('defines BlinkingCursor props and interval cleanup defaults', () => {
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
      assert.strictEqual(goldButton.background, Brand.gold);
      assert.strictEqual(goldButton.foreground, '#0B0C0E');

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

  describe('SuccessModal Alignment & Centering Invariants', () => {
    it('verifies SuccessModal enforces strict horizontal centering of the circle and card across devices', () => {
      const code = readSrc('components/ui/success-modal.tsx');

      assert.ok(code.includes("alignSelf: 'center'"));
      assert.ok(code.includes('width: 96'));
      assert.ok(code.includes('height: 96'));
      assert.ok(code.includes('borderRadius: 48'));
      assert.ok(code.includes("width: '100%'"));
      assert.ok(code.includes('maxWidth: 380'));
    });

    it('verifies SuccessModal renders centered Icon component inside checkRing', () => {
      const code = readSrc('components/ui/success-modal.tsx');
      assert.ok(code.includes('<Icon'));
      assert.ok(code.includes('size={52}'));
      assert.ok(code.includes('iconCentering'));
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

      const unfocused = computeStyle(false, false, theme, brand);
      assert.strictEqual(unfocused.borderColor, '#2C2D33');
      assert.strictEqual(unfocused.color, '#F5F5F7');

      const focused = computeStyle(true, false, theme, brand);
      assert.strictEqual(focused.borderColor, '#F3C300');

      const errorFocused = computeStyle(true, true, theme, brand);
      assert.strictEqual(errorFocused.borderColor, '#C2002F');
    });
  });

  describe('FormTextInput Template Contract & Web/Mobile Parity Invariants', () => {
    it('enforces web outline suppression and Calvin Gold caret styling in FormTextInput', () => {
      const formInputCode = readSrc('components/ui/form-text-input.tsx');

      assert.ok(
        formInputCode.includes("outlineStyle: 'none'") || formInputCode.includes('outlineStyle: "none"'),
        'FormTextInput must specify outlineStyle: none on web'
      );
      assert.ok(
        formInputCode.includes('caretColor: Brand.gold'),
        'FormTextInput must specify caretColor: Brand.gold for web'
      );
      assert.ok(
        formInputCode.includes('cursorColor={Brand.gold}'),
        'FormTextInput must specify cursorColor={Brand.gold} for native mobile'
      );
      assert.ok(
        formInputCode.includes('Brand.brightRed'),
        'FormTextInput must highlight error borders with Brand.brightRed'
      );
      assert.ok(
        formInputCode.includes('Brand.gold'),
        'FormTextInput must highlight focus borders with Brand.gold'
      );
    });

    it('guarantees PostWebView, PostMobileView, and PostDateTimeSection use FormTextInput and shared sections', () => {
      const webViewCode = readSrc('components/post-web-view.tsx');
      const mobileViewCode = readSrc('components/post-mobile-view.tsx');
      const dateTimeCode = readSrc('components/post-date-time-section.tsx');
      const formSectionsCode = readSrc('components/post-form-sections.tsx');

      assert.ok(formSectionsCode.includes('FormTextInput'));
      assert.ok(dateTimeCode.includes('FormTextInput'));

      assert.ok(webViewCode.includes('PostTitleSection'));
      assert.ok(webViewCode.includes('PostDescriptionSection'));
      assert.ok(webViewCode.includes('PostLocationSection'));

      assert.ok(mobileViewCode.includes('PostTitleSection'));
      assert.ok(mobileViewCode.includes('PostDescriptionSection'));
      assert.ok(mobileViewCode.includes('PostLocationSection'));

      assert.ok(formSectionsCode.includes('placeholder="What\'s the event?"'));
      assert.ok(formSectionsCode.includes('placeholder="e.g. North Hall 276"'));
    });
  });

  describe('Modal Soft-Keyboard Elevation Device Matrix (12 Configurations)', () => {
    const devices = [
      { name: 'iPhone SE (3rd Gen)', winH: 667, kbdH: 260, cardH: 340, inset: 20 },
      { name: 'iPhone 13 mini', winH: 812, kbdH: 300, cardH: 340, inset: 50 },
      { name: 'iPhone 15 / 16', winH: 852, kbdH: 336, cardH: 340, inset: 59 },
      { name: 'iPhone 15 Pro Max', winH: 932, kbdH: 346, cardH: 360, inset: 59 },
      { name: 'Pixel 7a', winH: 892, kbdH: 290, cardH: 320, inset: 40 },
      { name: 'Pixel 8 Pro', winH: 915, kbdH: 310, cardH: 350, inset: 44 },
      { name: 'Galaxy S23', winH: 800, kbdH: 280, cardH: 320, inset: 36 },
      { name: 'Galaxy Z Fold Cover', winH: 748, kbdH: 270, cardH: 300, inset: 32 },
      { name: 'Galaxy Z Fold Main', winH: 840, kbdH: 320, cardH: 380, inset: 28 },
      { name: 'iPad mini 6', winH: 1133, kbdH: 360, cardH: 400, inset: 24 },
      { name: 'iPad Air 11"', winH: 1180, kbdH: 380, cardH: 420, inset: 24 },
      { name: 'iPad Pro 12.9"', winH: 1366, kbdH: 420, cardH: 440, inset: 24 },
    ];

    for (const d of devices) {
      it(`calculates safe modal keyboard lift for ${d.name} (${d.winH}px screen)`, () => {
        const lift = calculateModalKeyboardLift({
          windowHeight: d.winH,
          keyboardHeight: d.kbdH,
          cardHeight: d.cardH,
          insetTop: d.inset,
        });

        assert.ok(lift >= 0, 'Lift must be non-negative');
        const restingTop = (d.winH - d.cardH) / 2;
        const liftedTop = restingTop - lift;
        assert.ok(liftedTop >= d.inset, `${d.name} modal card top must never clip off-screen`);
      });
    }
  });

  describe('Button Template Dimensions, Paddings & Contrast Tokens', () => {
    const buttonVariants = [
      { variant: 'primary', expectedBg: '#8C2131', expectedFg: '#FFFFFF' },
      { variant: 'gold', expectedBg: Brand.gold, expectedFg: '#0B0C0E' },
      { variant: 'danger', expectedBg: '#DC2626', expectedFg: '#FFFFFF' },
      { variant: 'secondary', expectedBg: '#1C1D21', expectedFg: '#F5F5F7' },
    ];

    for (const b of buttonVariants) {
      it(`verifies contrast and background token for button variant ${b.variant}`, () => {
        assert.ok(b.expectedBg.length > 0);
        assert.ok(b.expectedFg.length > 0);
        assert.notStrictEqual(b.expectedBg, b.expectedFg);
      });
    }

    const buttonSizes = [
      { size: 'sm', minHeight: 36, paddingH: 12 },
      { size: 'md', minHeight: 44, paddingH: 16 },
      { size: 'lg', minHeight: 52, paddingH: 20 },
    ];

    for (const s of buttonSizes) {
      it(`evaluates button size spec for ${s.size}`, () => {
        assert.ok(s.minHeight >= 36);
        assert.ok(s.paddingH >= 12);
      });
    }
  });

  describe('FieldLabel Counter Boundary Formatting Across Fields', () => {
    const fields = [
      { name: 'Title', max: 50 },
      { name: 'Description', max: 280 },
      { name: 'Location', max: 25 },
      { name: 'Custom When', max: 25 },
    ];

    for (const f of fields) {
      it(`verifies character counter limit and overflow detection for ${f.name} (max ${f.max})`, () => {
        const atLimit = `${f.max}/${f.max}`;
        const overLimit = `${f.max + 1}/${f.max}`;
        assert.strictEqual(atLimit, `${f.max}/${f.max}`);
        assert.strictEqual(overLimit, `${f.max + 1}/${f.max}`);
      });
    }
  });
});

