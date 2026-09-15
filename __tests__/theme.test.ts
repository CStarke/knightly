import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Brand, Colors, Radius, Spacing, WebHeaderInset, MaxContentWidth } from '@/constants/theme';

describe('Theme & Branding Tokens', () => {
  describe('Brand Palette', () => {
    it('defines official Calvin Maroon shades', () => {
      assert.strictEqual(Brand.maroon, '#5E1A24');
      assert.strictEqual(Brand.maroonClassic, '#8C2131');
      assert.strictEqual(Brand.maroonDark, '#450F18');
      assert.strictEqual(Brand.maroonLight, '#8C2131');
    });

    it('defines official Calvin Gold shades', () => {
      assert.strictEqual(Brand.gold, '#F3CD00');
      assert.strictEqual(Brand.goldDark, '#C9A900');
      assert.strictEqual(Brand.goldSoft, '#FFFBEA');
    });

    it('defines official Secondary Palette colors', () => {
      assert.strictEqual(Brand.brightRed, '#C2002F');
      assert.strictEqual(Brand.renewBlue, '#71B1C8');
      assert.strictEqual(Brand.trueGreen, '#A2D683');
    });

    it('defines standard neutrals', () => {
      assert.strictEqual(Brand.pureWhite, '#FFFFFF');
      assert.strictEqual(Brand.pureBlack, '#000000');
    });
  });

  describe('Light and Dark Theme Consistency', () => {
    it('ensures both light and dark themes contain all semantic color tokens', () => {
      const requiredTokens = [
        'text',
        'textSecondary',
        'textMuted',
        'background',
        'backgroundElement',
        'backgroundSelected',
        'border',
        'tint',
        'tintSoft',
        'onTint',
        'accent',
        'accentDark',
        'accentSoft',
        'danger',
        'dangerSoft',
        'success',
        'successSoft',
        'warning',
        'warningSoft',
        'info',
        'infoSoft',
      ] as const;

      for (const token of requiredTokens) {
        assert.ok(token in Colors.light, `Colors.light missing ${token}`);
        assert.ok(token in Colors.dark, `Colors.dark missing ${token}`);
        assert.ok(typeof Colors.light[token] === 'string');
        assert.ok(typeof Colors.dark[token] === 'string');
      }
    });

    it('uses Calvin Bright Red for danger across both light and dark modes', () => {
      assert.strictEqual(Colors.light.danger, Brand.brightRed);
      assert.strictEqual(Colors.dark.danger, Brand.brightRed);
    });

    it('uses onTint white for high-contrast text on primary buttons', () => {
      assert.strictEqual(Colors.light.onTint, '#FFFFFF');
      assert.strictEqual(Colors.dark.onTint, '#FFFFFF');
    });
  });

  describe('Spacing & Radius Scales', () => {
    it('follows monotonically increasing spacing steps', () => {
      assert.ok(Spacing.half < Spacing.one);
      assert.ok(Spacing.one < Spacing.two);
      assert.ok(Spacing.two < Spacing.three);
      assert.ok(Spacing.three < Spacing.four);
      assert.ok(Spacing.four < Spacing.five);
      assert.ok(Spacing.five < Spacing.six);
    });

    it('follows monotonically increasing radius steps', () => {
      assert.ok(Radius.sm < Radius.md);
      assert.ok(Radius.md < Radius.lg);
      assert.ok(Radius.lg < Radius.xl);
      assert.ok(Radius.xl < Radius.pill);
    });

    it('defines web layout constraints', () => {
      assert.strictEqual(WebHeaderInset, 72);
      assert.strictEqual(MaxContentWidth, 800);
    });
  });
});
