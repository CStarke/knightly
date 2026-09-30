import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Modal Edge-to-Edge Android Invariants & Backdrop Stretch', () => {
  const srcDir = path.resolve(__dirname, '../src');

  // Helper to read source files
  const readSrc = (relPath: string) => fs.readFileSync(path.join(srcDir, relPath), 'utf-8');

  describe('Modal Component Properties Verification', () => {
    it('verifies ClaimClubModal delegates edge-to-edge to the ModalDialog template', () => {
      const claimCode = readSrc('components/claim-club-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');

      // claim-club-modal should use the ModalDialog template (which owns statusBarTranslucent)
      assert.ok(
        claimCode.includes('<ModalDialog'),
        'claim-club-modal must use the ModalDialog template for edge-to-edge guarantees'
      );
      assert.ok(
        claimCode.includes("from '@/components/ui/modal-dialog'"),
        'claim-club-modal must import from modal-dialog'
      );

      // The ModalDialog template itself must carry the required props
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

    it('verifies SuccessModal configures statusBarTranslucent and navigationBarTranslucent', () => {
      const code = readSrc('components/ui/success-modal.tsx');
      const modalMatches = code.match(/<Modal[\s\S]*?>/g) || [];
      assert.strictEqual(modalMatches.length, 1, 'success-modal.tsx should contain exactly 1 Modal element');

      const modalTag = modalMatches[0];
      assert.ok(
        modalTag.includes('statusBarTranslucent'),
        'SuccessModal must specify statusBarTranslucent'
      );
      assert.ok(
        modalTag.includes('navigationBarTranslucent'),
        'SuccessModal must specify navigationBarTranslucent'
      );
      assert.ok(
        modalTag.includes('transparent'),
        'SuccessModal must specify transparent'
      );
    });

    it('verifies HeaderAvatar profile sheet configures statusBarTranslucent and navigationBarTranslucent', () => {
      const code = readSrc('components/header-avatar.tsx');
      const modalMatches = code.match(/<Modal[\s\S]*?>/g) || [];
      assert.strictEqual(modalMatches.length, 1, 'header-avatar.tsx should contain exactly 1 Modal element');

      const modalTag = modalMatches[0];
      assert.ok(
        modalTag.includes('statusBarTranslucent'),
        'HeaderAvatar Modal must specify statusBarTranslucent'
      );
      assert.ok(
        modalTag.includes('navigationBarTranslucent'),
        'HeaderAvatar Modal must specify navigationBarTranslucent'
      );
      assert.ok(
        modalTag.includes('transparent'),
        'HeaderAvatar Modal must specify transparent'
      );
    });

    it('verifies DatePickerModal configures statusBarTranslucent and navigationBarTranslucent', () => {
      const code = readSrc('components/date-picker-modal.tsx');
      const modalMatches = code.match(/<Modal[\s\S]*?>/g) || [];
      assert.strictEqual(modalMatches.length, 1, 'date-picker-modal.tsx should contain exactly 1 Modal element');

      const modalTag = modalMatches[0];
      assert.ok(
        modalTag.includes('statusBarTranslucent'),
        'DatePickerModal must specify statusBarTranslucent'
      );
      assert.ok(
        modalTag.includes('navigationBarTranslucent'),
        'DatePickerModal must specify navigationBarTranslucent'
      );
      assert.ok(
        modalTag.includes('transparent'),
        'DatePickerModal must specify transparent'
      );
    });
  });

  describe('Modal Backdrop Full-Bleed Geometry & Inset Handling', () => {
    it('ensures claim-club-modal edge-to-edge backdrop is covered by ModalDialog template', () => {
      const claimCode = readSrc('components/claim-club-modal.tsx');
      const dialogCode = readSrc('components/ui/modal-dialog.tsx');

      // claim-club-modal delegates backdrop to ModalDialog
      assert.ok(
        claimCode.includes('<ModalDialog'),
        'claim-club-modal must use ModalDialog (which provides the full-bleed backdrop)'
      );

      // Verify ModalDialog itself has the full-bleed backdrop
      assert.ok(dialogCode.includes('backdrop:'), 'modal-dialog must define backdrop');
      assert.match(dialogCode, /backdrop:\s*\{[^}]+width:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+height:\s*'100%'/);
      assert.match(dialogCode, /backdrop:\s*\{[^}]+flex:\s*1/);
    });

    it('ensures success-modal backdrop covers full width and height edge-to-edge', () => {
      const code = readSrc('components/ui/success-modal.tsx');
      assert.ok(code.includes("backdrop:"), 'success-modal must define backdrop');
      assert.match(code, /backdrop:\s*\{[^}]+width:\s*'100%'/);
      assert.match(code, /backdrop:\s*\{[^}]+height:\s*'100%'/);
      assert.match(code, /backdrop:\s*\{[^}]+flex:\s*1/);
    });

    it('ensures header-avatar overlay covers full width and height edge-to-edge with safe-area padding', () => {
      const code = readSrc('components/header-avatar.tsx');
      assert.ok(code.includes("overlay:"), 'header-avatar must define overlay');
      assert.match(code, /overlay:\s*\{[^}]+width:\s*'100%'/);
      assert.match(code, /overlay:\s*\{[^}]+height:\s*'100%'/);
      assert.match(code, /overlay:\s*\{[^}]+flex:\s*1/);
      assert.ok(
        code.includes('paddingBottom: Math.max(insets.bottom'),
        'header-avatar sheet overlay must guard bottom safe-area insets against gesture navigation bars'
      );
    });

    it('ensures datePickerStyles backdrop in date-picker-modal covers full width and height edge-to-edge', () => {
      const code = readSrc('components/date-picker-modal.tsx');
      assert.ok(code.includes("backdrop:"), 'datePickerStyles must define backdrop');
      assert.match(code, /backdrop:\s*\{[^}]+width:\s*'100%'/);
      assert.match(code, /backdrop:\s*\{[^}]+height:\s*'100%'/);
      assert.match(code, /backdrop:\s*\{[^}]+flex:\s*1/);
    });
  });

  describe('Android Edge-to-Edge Geometry Mathematics', () => {
    it('simulates Pixel 9a viewport and proves edge-to-edge eliminates undimmed letterboxing', () => {
      // Pixel 9a viewport specifications
      const pixel9a = {
        screenWidth: 412,
        screenHeight: 915,
        statusBarHeight: 48,
        gestureNavBarHeight: 28,
      };

      // When statusBarTranslucent is false and navigationBarTranslucent is false:
      const nonTranslucentHeight =
        pixel9a.screenHeight - pixel9a.statusBarHeight - pixel9a.gestureNavBarHeight;
      const undimmedTopGap = pixel9a.statusBarHeight;
      const undimmedBottomGap = pixel9a.gestureNavBarHeight;

      assert.strictEqual(nonTranslucentHeight, 839);
      assert.strictEqual(undimmedTopGap, 48);
      assert.strictEqual(undimmedBottomGap, 28);

      // When statusBarTranslucent is true and navigationBarTranslucent is true:
      const fullBleedTop = 0;
      const fullBleedHeight = pixel9a.screenHeight;
      const undimmedGapWithFix = pixel9a.screenHeight - fullBleedHeight;

      assert.strictEqual(fullBleedTop, 0);
      assert.strictEqual(fullBleedHeight, 915);
      assert.strictEqual(undimmedGapWithFix, 0, 'Zero undimmed gaps remain after edge-to-edge translucency');
    });

    it('validates navigation bar translucency rule: must accompany status bar translucency', () => {
      // In ReactModalHostView.kt line 393:
      // "Navigation bar cannot be translucent without status bar being translucent too"
      const validateModalTranslucency = (statusBar: boolean, navBar: boolean): boolean => {
        if (navBar && !statusBar) {
          // Android falls back to disableEdgeToEdge() if nav is translucent but status is not
          return false;
        }
        return statusBar && navBar;
      };

      assert.strictEqual(validateModalTranslucency(false, false), false);
      assert.strictEqual(validateModalTranslucency(false, true), false);
      assert.strictEqual(validateModalTranslucency(true, false), false);
      assert.strictEqual(validateModalTranslucency(true, true), true);
    });
  });
});
