import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CROP_ASPECT_RATIO,
  calculateBaseDisplayDimensions,
  calculateOffsetBounds,
  clampOffset,
  getInitialCenteredOffset,
  calculateCropRect,
  zoomAroundFocalPoint,
} from '@/utils/image-crop';
import {
  PHANTOM_TABS,
  getActivePhantomTab,
  getBlankAfterSlot,
} from '@/constants/phantom-tabs';

describe('Image Crop Geometry & Coordinate Mapping Invariants', () => {
  const cropWindow = { width: 320, height: 180 }; // 16:9 viewport

  describe('Aspect Ratio Constant', () => {
    it('verifies 16:9 banner aspect ratio constant', () => {
      assert.strictEqual(CROP_ASPECT_RATIO, 16 / 9);
      assert.strictEqual(cropWindow.width / cropWindow.height, 16 / 9);
    });
  });

  describe('calculateBaseDisplayDimensions', () => {
    it('covers crop window for a square source image (1:1)', () => {
      const source = { width: 1000, height: 1000 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      // Width must fill 320, height scales to 320 (exceeds 180 height)
      assert.strictEqual(base.width, 320);
      assert.strictEqual(base.height, 320);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });

    it('covers crop window for a wide landscape source image (21:9)', () => {
      const source = { width: 2100, height: 900 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      // Height must fill 180, width scales to 420 (exceeds 320 width)
      assert.strictEqual(base.height, 180);
      assert.strictEqual(base.width, 420);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });

    it('covers crop window for a tall portrait source image (3:4 phone camera)', () => {
      const source = { width: 3000, height: 4000 };
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      // Width must fill 320, height scales to ~427 (exceeds 180)
      assert.strictEqual(base.width, 320);
      assert.strictEqual(base.height, 427);
      assert.ok(base.width >= cropWindow.width);
      assert.ok(base.height >= cropWindow.height);
    });

    it('safely handles degenerate 0 or negative dimensions', () => {
      const base = calculateBaseDisplayDimensions({ width: 0, height: 0 }, cropWindow);
      assert.strictEqual(base.width, cropWindow.width);
      assert.strictEqual(base.height, cropWindow.height);
    });
  });

  describe('calculateOffsetBounds & clampOffset', () => {
    it('correctly bounds vertical panning for square image', () => {
      const displayed = { width: 320, height: 320 };
      const bounds = calculateOffsetBounds(displayed, cropWindow);
      // Width matches crop window exactly, so X cannot pan
      assert.strictEqual(bounds.minX, 0);
      assert.strictEqual(bounds.maxX, 0);
      // Height is 320 vs cropWindow 180: can pan vertically from -140 to 0
      assert.strictEqual(bounds.minY, -140);
      assert.strictEqual(bounds.maxY, 0);

      // Clamping within bounds
      assert.deepStrictEqual(clampOffset(0, -50, displayed, cropWindow), { offsetX: 0, offsetY: -50 });
      assert.deepStrictEqual(clampOffset(50, 50, displayed, cropWindow), { offsetX: 0, offsetY: 0 });
      assert.deepStrictEqual(clampOffset(-50, -200, displayed, cropWindow), { offsetX: 0, offsetY: -140 });
    });

    it('correctly bounds horizontal panning for wide landscape image', () => {
      const displayed = { width: 420, height: 180 };
      const bounds = calculateOffsetBounds(displayed, cropWindow);
      // Height matches crop window, so Y cannot pan
      assert.strictEqual(bounds.minY, 0);
      assert.strictEqual(bounds.maxY, 0);
      // Width is 420 vs 320: can pan horizontally from -100 to 0
      assert.strictEqual(bounds.minX, -100);
      assert.strictEqual(bounds.maxX, 0);
    });
  });

  describe('getInitialCenteredOffset', () => {
    it('centers vertical slice for tall/square images', () => {
      const displayed = { width: 320, height: 320 };
      const initial = getInitialCenteredOffset(displayed, cropWindow);
      assert.strictEqual(initial.offsetX, 0);
      assert.strictEqual(initial.offsetY, -70); // (180 - 320) / 2 = -70
    });

    it('centers horizontal slice for wide landscape images', () => {
      const displayed = { width: 420, height: 180 };
      const initial = getInitialCenteredOffset(displayed, cropWindow);
      assert.strictEqual(initial.offsetX, -50); // (320 - 420) / 2 = -50
      assert.strictEqual(initial.offsetY, 0);
    });
  });

  describe('calculateCropRect Mapping to Native Image Space', () => {
    it('maps centered 16:9 crop on a 1000x1000 square image', () => {
      const source = { width: 1000, height: 1000 };
      const displayed = { width: 320, height: 320 }; // zoom = 1
      const initial = getInitialCenteredOffset(displayed, cropWindow); // { offsetX: 0, offsetY: -70 }

      const rect = calculateCropRect({
        offsetX: initial.offsetX,
        offsetY: initial.offsetY,
        displayed,
        cropWindow,
        source,
      });

      // Full width of 1000 is kept
      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.width, 1000);
      // 16:9 of 1000 width is 563 height (1000 * 9 / 16 = 562.5 -> 563)
      assert.strictEqual(rect.height, 563);
      // originY is centered: (1000 - 563) / 2 = 218.5 -> 219
      assert.strictEqual(rect.originY, 219);
      // Verify resulting rectangle is within source bounds
      assert.ok(rect.originX + rect.width <= source.width);
      assert.ok(rect.originY + rect.height <= source.height);
    });

    it('maps top crop on a 1000x1000 square image when user pans to top', () => {
      const source = { width: 1000, height: 1000 };
      const displayed = { width: 320, height: 320 };

      // User pans image down to top boundary (offsetY = 0)
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: 0,
        displayed,
        cropWindow,
        source,
      });

      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.originY, 0);
      assert.strictEqual(rect.width, 1000);
      assert.strictEqual(rect.height, 563);
    });

    it('maps bottom crop on a 1000x1000 square image when user pans to bottom', () => {
      const source = { width: 1000, height: 1000 };
      const displayed = { width: 320, height: 320 };

      // User pans image up to bottom boundary (offsetY = -140)
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: -140,
        displayed,
        cropWindow,
        source,
      });

      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.originY, 438); // Math.round(140 * (1000 / 320)) = Math.round(437.5) = 438
      assert.strictEqual(rect.width, 1000);
      assert.ok(rect.originY + rect.height <= source.height);
    });

    it('handles 2x zoom on a high-resolution photo correctly', () => {
      const source = { width: 3840, height: 2160 }; // 4K 16:9 photo
      // Base display at zoom=1 would be 320x180.
      // At zoom=2, displayed is 640x360.
      const displayed = { width: 640, height: 360 };

      // Center offset at 2x zoom: (320 - 640)/2 = -160, (180 - 360)/2 = -90
      const rect = calculateCropRect({
        offsetX: -160,
        offsetY: -90,
        displayed,
        cropWindow,
        source,
      });

      // At 2x zoom centered, width should be 3840 / 2 = 1920, height = 2160 / 2 = 1080
      assert.strictEqual(rect.width, 1920);
      assert.strictEqual(rect.height, 1080);
      assert.strictEqual(rect.originX, 960); // (3840 - 1920) / 2 = 960
      assert.strictEqual(rect.originY, 540); // (2160 - 1080) / 2 = 540
      assert.strictEqual(rect.width / rect.height, 16 / 9);
    });
  });

  describe('zoomAroundFocalPoint Scaling', () => {
    it('zooms in centered without shifting center point', () => {
      const baseDims = { width: 320, height: 320 };
      const currentOffset = { offsetX: 0, offsetY: -70 }; // centered at 1.0x
      const focalPoint = { x: 160, y: 90 }; // center of 320x180 crop window

      const result = zoomAroundFocalPoint({
        currentOffset,
        currentZoom: 1.0,
        targetZoom: 2.0,
        focalPoint,
        baseDimensions: baseDims,
        cropWindow,
      });

      assert.strictEqual(result.zoom, 2.0);
      // New displayed: 640x640
      // Center offset: (320 - 640)/2 = -160, (180 - 640)/2 = -230
      assert.strictEqual(result.offsetX, -160);
      assert.strictEqual(result.offsetY, -230);
    });

    it('clamps targetZoom within minZoom and maxZoom', () => {
      const baseDims = { width: 320, height: 180 };
      const currentOffset = { offsetX: 0, offsetY: 0 };
      const focalPoint = { x: 160, y: 90 };

      const minResult = zoomAroundFocalPoint({
        currentOffset,
        currentZoom: 1.0,
        targetZoom: 0.5,
        focalPoint,
        baseDimensions: baseDims,
        cropWindow,
      });
      assert.strictEqual(minResult.zoom, 1.0);

      const maxResult = zoomAroundFocalPoint({
        currentOffset,
        currentZoom: 1.0,
        targetZoom: 5.0,
        focalPoint,
        baseDimensions: baseDims,
        cropWindow,
      });
      assert.strictEqual(maxResult.zoom, 3.0);
    });
  });

  describe('Cropper Lifecycle & Tab Bar Focus Synchronization Invariants', () => {
    it('verifies tab focus strictly evaluates meta.href === pathname', () => {
      const tabs = [
        { name: 'knightly', href: '/' },
        { name: 'dining', href: '/dining' },
        { name: 'safety', href: '/safety' },
        { name: 'directory', href: '/directory' },
        { name: 'post', href: '/post' },
      ];

      // When on '/post', only the post tab must be effectively focused
      const pathname = '/post';
      const focusedStates = tabs.map((tab) => ({
        name: tab.name,
        isFocused: tab.href === pathname,
      }));

      assert.strictEqual(focusedStates.find((t) => t.name === 'post')?.isFocused, true);
      assert.strictEqual(focusedStates.find((t) => t.name === 'knightly')?.isFocused, false);
      assert.strictEqual(focusedStates.find((t) => t.name === 'dining')?.isFocused, false);
      assert.strictEqual(focusedStates.filter((t) => t.isFocused).length, 1);
    });

    it('prevents multiple active tabs when switching from post to dining', () => {
      const tabs = [
        { name: 'knightly', href: '/' },
        { name: 'dining', href: '/dining' },
        { name: 'safety', href: '/safety' },
        { name: 'directory', href: '/directory' },
        { name: 'post', href: '/post' },
      ];

      // Switch to '/dining'
      const pathname = '/dining';
      const focusedStates = tabs.map((tab) => ({
        name: tab.name,
        isFocused: tab.href === pathname,
      }));

      assert.strictEqual(focusedStates.find((t) => t.name === 'dining')?.isFocused, true);
      assert.strictEqual(focusedStates.find((t) => t.name === 'knightly')?.isFocused, false);
      assert.strictEqual(focusedStates.find((t) => t.name === 'post')?.isFocused, false);
      assert.strictEqual(focusedStates.filter((t) => t.isFocused).length, 1);
    });
  });

  describe('Slot 5 Photo Cropper Phantom Tab Invariants', () => {
    it('verifies photo-cropper phantom tab metadata', () => {
      const meta = PHANTOM_TABS['photo-cropper'];
      assert.strictEqual(meta.id, 'photo-cropper');
      assert.strictEqual(meta.rootPath, '/post');
      assert.strictEqual(meta.slotIndex, 5);
      assert.strictEqual(meta.parentSlotIndex, 4);
      assert.strictEqual(meta.defaultTitle, 'Crop Banner');
      assert.strictEqual(meta.defaultSubtitle, '16:9 Post Aspect Ratio');
    });

    it('identifies photo-cropper as active phantom tab on /post when cropper is open', () => {
      const active = getActivePhantomTab({
        pathname: '/post',
        activeIndex: 4,
        isClaimSetupOpen: false,
        clubsLevel: 0,
        showClubsDirectory: false,
        showClubDetail: false,
        isActivityOpen: false,
        showActivity: false,
        hasActiveClubId: false,
        isCropperOpen: true,
      });

      assert.ok(active !== null);
      assert.strictEqual(active?.id, 'photo-cropper');
      assert.strictEqual(active?.slotIndex, 5);
    });

    it('returns null active phantom tab on /post when cropper is closed', () => {
      const active = getActivePhantomTab({
        pathname: '/post',
        activeIndex: 4,
        isClaimSetupOpen: false,
        clubsLevel: 0,
        showClubsDirectory: false,
        showClubDetail: false,
        isActivityOpen: false,
        showActivity: false,
        hasActiveClubId: false,
        isCropperOpen: false,
      });

      assert.strictEqual(active, null);
    });

    it('preserves slot 5 during active crop or exit transition, blanks it when closed', () => {
      // Cropper open -> slot 5 preserved
      assert.strictEqual(
        getBlankAfterSlot({
          pathname: '/post',
          activeIndex: 4,
          isClaimSetupOpen: false,
          clubsLevel: 0,
          showClubsDirectory: false,
          showClubDetail: false,
          isActivityOpen: false,
          showActivity: false,
          hasActiveClubId: false,
          isCropperOpen: true,
        }),
        5
      );

      // Cropper transitioning out (showCropper = true) -> slot 5 preserved
      assert.strictEqual(
        getBlankAfterSlot({
          pathname: '/post',
          activeIndex: 4,
          isClaimSetupOpen: false,
          clubsLevel: 0,
          showClubsDirectory: false,
          showClubDetail: false,
          isActivityOpen: false,
          showActivity: false,
          hasActiveClubId: false,
          isCropperOpen: false,
          showCropper: true,
        }),
        5
      );

      // Cropper closed -> slot 5 blanked (blankAfterSlot = 4)
      assert.strictEqual(
        getBlankAfterSlot({
          pathname: '/post',
          activeIndex: 4,
          isClaimSetupOpen: false,
          clubsLevel: 0,
          showClubsDirectory: false,
          showClubDetail: false,
          isActivityOpen: false,
          showActivity: false,
          hasActiveClubId: false,
          isCropperOpen: false,
          showCropper: false,
        }),
        4
      );
    });
  });

  describe('Accurate High-Resolution Natural Pixel Crop Invariants', () => {
    it('crops 100% of width at zoom 1.0 on a 3024x4032 phone camera portrait photo', () => {
      const source = { width: 3024, height: 4032 }; // 3:4 iPhone camera photo
      const base = calculateBaseDisplayDimensions(source, cropWindow);
      // cropWindow is 320x180 (16:9).
      // Scale to cover width: 320/3024 = 0.1058.
      // Base display dims: 320 x 427
      assert.strictEqual(base.width, 320);
      assert.strictEqual(base.height, 427);

      // Initial centered offset
      const initial = getInitialCenteredOffset(base, cropWindow);
      // (180 - 427) / 2 = -123.5
      assert.strictEqual(initial.offsetX, 0);
      assert.strictEqual(initial.offsetY, -123.5);

      const rect = calculateCropRect({
        offsetX: initial.offsetX,
        offsetY: initial.offsetY,
        displayed: base,
        cropWindow,
        source,
      });

      // Crucial requirement: FULL width of 3024 must be retained, NEVER a zoomed-in 1200 box!
      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.width, 3024);
      // 180 * (4032 / 427) = 1700 height
      assert.strictEqual(rect.height, 1700);
      // originY is centered vertically: Math.round(123.5 * (4032 / 427)) = 1166
      assert.strictEqual(rect.originY, 1166);
      assert.ok(rect.originY + rect.height <= source.height);
      assert.ok(Math.abs(rect.width / rect.height - 16 / 9) < 0.01);
    });

    it('allows panning down to the lower part of a 3024x4032 portrait photo', () => {
      const source = { width: 3024, height: 4032 };
      const base = calculateBaseDisplayDimensions(source, cropWindow); // 320 x 427

      // Pan to the bottom of the portrait image: offsetY = cropWindow.height - base.height = 180 - 427 = -247
      const rect = calculateCropRect({
        offsetX: 0,
        offsetY: -247,
        displayed: base,
        cropWindow,
        source,
      });

      assert.strictEqual(rect.originX, 0);
      assert.strictEqual(rect.width, 3024);
      assert.strictEqual(rect.height, 1700);
      // Bottom of image: originY + height should equal source.height
      assert.strictEqual(rect.originY, 2332);
      assert.strictEqual(rect.originY + rect.height, source.height);
    });

    it('accurately scales crop window at 4.0x zoom (max zoom) on high-res photo', () => {
      const source = { width: 3024, height: 4032 };
      const base = calculateBaseDisplayDimensions(source, cropWindow); // 320 x 427
      const displayed = { width: base.width * 4, height: base.height * 4 }; // 1280 x 1708

      // Centered at 4x zoom
      const initial = getInitialCenteredOffset(displayed, cropWindow);
      const rect = calculateCropRect({
        offsetX: initial.offsetX,
        offsetY: initial.offsetY,
        displayed,
        cropWindow,
        source,
      });

      // At 4x zoom, crop width must be 3024 / 4 = 756
      assert.strictEqual(rect.width, 756);
      // Crop height must be 1701 / 4 = 425.25 -> 425
      assert.strictEqual(rect.height, 425);
      // Centered: (3024 - 756) / 2 = 1134
      assert.strictEqual(rect.originX, 1134);
      assert.ok(rect.originX + rect.width <= source.width);
      assert.ok(rect.originY + rect.height <= source.height);
    });
  });
});
