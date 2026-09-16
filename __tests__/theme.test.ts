import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Brand, Colors, Fonts, Radius, Spacing, WebHeaderInset, MaxContentWidth } from '@/constants/theme';

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

    it('validates exact pixel values across spacing scale', () => {
      assert.strictEqual(Spacing.half, 2);
      assert.strictEqual(Spacing.one, 4);
      assert.strictEqual(Spacing.two, 8);
      assert.strictEqual(Spacing.three, 16);
      assert.strictEqual(Spacing.four, 24);
      assert.strictEqual(Spacing.five, 32);
      assert.strictEqual(Spacing.six, 64);
    });

    it('validates exact pixel values across radius scale', () => {
      assert.strictEqual(Radius.sm, 8);
      assert.strictEqual(Radius.md, 12);
      assert.strictEqual(Radius.lg, 18);
      assert.strictEqual(Radius.xl, 26);
      assert.strictEqual(Radius.pill, 999);
    });
  });

  describe('Color Format & Contrast Invariants', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;

    it('verifies all brand colors are valid 7-character hex strings', () => {
      for (const [key, color] of Object.entries(Brand)) {
        assert.match(color, hexPattern, `Brand.${key} color "${color}" is not valid hex`);
      }
    });

    it('verifies all light semantic colors are valid hex strings', () => {
      for (const [key, color] of Object.entries(Colors.light)) {
        assert.match(color, hexPattern, `Colors.light.${key} color "${color}" is not valid hex`);
      }
    });

    it('verifies all dark semantic colors are valid hex strings', () => {
      for (const [key, color] of Object.entries(Colors.dark)) {
        assert.match(color, hexPattern, `Colors.dark.${key} color "${color}" is not valid hex`);
      }
    });

    it('maintains expected contrast polarities between light and dark modes', () => {
      // Helper to calculate approximate perceived luminance (0 to 1)
      const getLuminance = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return 0.299 * r + 0.587 * g + 0.114 * b;
      };

      // Light mode background should be bright (> 0.8), text dark (< 0.2)
      assert.ok(getLuminance(Colors.light.background) > 0.8);
      assert.ok(getLuminance(Colors.light.text) < 0.2);

      // Dark mode background should be very dark (< 0.1), text light (> 0.8)
      assert.ok(getLuminance(Colors.dark.background) < 0.1);
      assert.ok(getLuminance(Colors.dark.text) > 0.8);
    });
  });

  describe('Typography & Font Families', () => {
    it('defines standard font family keys', () => {
      assert.ok(Fonts.sans, 'Fonts must define sans');
      assert.ok(Fonts.serif, 'Fonts must define serif');
      assert.ok(Fonts.rounded, 'Fonts must define rounded');
      assert.ok(Fonts.mono, 'Fonts must define mono');
    });
  });
});
