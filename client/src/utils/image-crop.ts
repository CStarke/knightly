/**
 * Image Cropping Geometry & Coordinate Mapping Utilities
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * In Knightly, club leaders upload promotional posters and banner graphics for campus events.
 * Displaying unconstrained user photos across feed cards, discovery carousels, and club profile headers
 * leads to severe layout shift, inconsistent card heights, and letterboxing artifacts.
 *
 * To solve this, Knightly enforces a standardized 16:9 banner aspect ratio across all published posts.
 * This utility module provides pure mathematical transformations between two distinct coordinate spaces:
 * 1. Screen-Space Viewport Coordinates (floating-point CSS/device pixels within the interactive cropper UI)
 * 2. Natural Pixel Coordinates (integer pixel coordinates within the full-resolution source image file)
 *
 * WHY PURE FUNCTIONS:
 * Decoupling geometry math from React hooks and PanResponder logic enables:
 * - High-speed zero-allocation calculations during 60/120fps gesture updates.
 * - 100% deterministic unit testing without mocking React Native or native canvas/manipulation drivers.
 * - Platform independence (identical calculations on iOS, Android, and Web).
 */

/**
 * The standardized banner aspect ratio (16:9 = 1.777...).
 * 
 * WHY 16:9:
 * - Perfectly matches landscape video, modern presentation slides, and campus digital signage.
 * - Fits comfortably on mobile screens without pushing the title, description, and RSVP buttons below the fold.
 * - Avoids awkward vertical cropping for horizontal landscape club event flyers.
 */
export const CROP_ASPECT_RATIO = 16 / 9;

export type ImageDimensions = {
  width: number;
  height: number;
};

export type CropWindowDimensions = {
  width: number;
  height: number;
};

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type CropTransform = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

/**
 * Calculates the base display dimensions needed for an image to cover
 * the target crop window at zoom = 1 without any empty gaps.
 *
 * WHY COVER SCALING (Math.max):
 * An essential UX invariant of this cropper is "No Letterboxing / No Blank Gaps".
 * If the source image were scaled with "contain" (Math.min), black or transparent borders
 * would appear inside the crop window whenever the aspect ratios differed.
 * By taking the maximum scaling factor between width and height, the image is guaranteed to
 * completely blanket the crop window along both axes at minimum zoom (1.0x).
 */
export function calculateBaseDisplayDimensions(
  source: ImageDimensions,
  cropWindow: CropWindowDimensions
): ImageDimensions {
  if (source.width <= 0 || source.height <= 0 || cropWindow.width <= 0 || cropWindow.height <= 0) {
    return { width: cropWindow.width, height: cropWindow.height };
  }

  const scaleToCoverWidth = cropWindow.width / source.width;
  const scaleToCoverHeight = cropWindow.height / source.height;
  const minCoverScale = Math.max(scaleToCoverWidth, scaleToCoverHeight);

  return {
    width: Math.round(source.width * minCoverScale),
    height: Math.round(source.height * minCoverScale),
  };
}

/**
 * Calculates the min and max allowable offsets so the image never leaves
 * an unpainted gap inside the crop window.
 *
 * WHY BOUNDS CLAMPING:
 * Because the image is guaranteed to be equal to or larger than the crop window
 * (via calculateBaseDisplayDimensions), the offset bounds are always negative or zero.
 * - Upper bound is 0 (the top/left edge of the image cannot be dragged inward past the crop window).
 * - Lower bound is (cropWindow.dimension - displayed.dimension) (the bottom/right edge of the image
 *   cannot be dragged inward past the opposite crop window edge).
 */
export function calculateOffsetBounds(
  displayed: ImageDimensions,
  cropWindow: CropWindowDimensions
): { minX: number; maxX: number; minY: number; maxY: number } {
  // Image must completely cover crop window:
  // offsetX <= 0 and offsetX + displayed.width >= cropWindow.width
  const minX = Math.min(0, cropWindow.width - displayed.width);
  const maxX = 0;

  const minY = Math.min(0, cropWindow.height - displayed.height);
  const maxY = 0;

  return { minX, maxX, minY, maxY };
}

/**
 * Clamps an offset tuple to remain strictly within allowable bounds.
 */
export function clampOffset(
  offsetX: number,
  offsetY: number,
  displayed: ImageDimensions,
  cropWindow: CropWindowDimensions
): { offsetX: number; offsetY: number } {
  const { minX, maxX, minY, maxY } = calculateOffsetBounds(displayed, cropWindow);
  return {
    offsetX: Math.max(minX, Math.min(maxX, offsetX)),
    offsetY: Math.max(minY, Math.min(maxY, offsetY)),
  };
}

/**
 * Calculates initial centered offset for an image inside the crop window.
 * 
 * WHY INITIAL CENTERING:
 * Most users compose photos with the primary subject centered in the frame.
 * Placing the image initially centered ensures that excess margins on portrait or panoramic
 * photos are cropped symmetrically by default before the user begins adjusting.
 */
export function getInitialCenteredOffset(
  displayed: ImageDimensions,
  cropWindow: CropWindowDimensions
): { offsetX: number; offsetY: number } {
  const rawX = (cropWindow.width - displayed.width) / 2;
  const rawY = (cropWindow.height - displayed.height) / 2;
  return clampOffset(rawX, rawY, displayed, cropWindow);
}

/**
 * Maps the screen-relative displayed crop frame back to the natural pixel
 * coordinates of the source image for expo-image-manipulator.
 *
 * WHY THIS MATH PREVENTS THE "TOP-LEFT ZOOMED-IN" CROP BUG:
 * Early cropper implementations attempted to crop directly using screen-coordinate offsets
 * without mapping them to the source image's actual pixel dimensions. On modern devices,
 * a phone camera photo might be 4032x3024 pixels, while the screen cropper window is only
 * 360x202 points. If a 360-pixel crop window is extracted from a 4032-pixel raw image without
 * scaling, the resulting crop will only encompass a tiny 8% postage stamp in the top-left corner!
 *
 * Here, we compute the exact scalar projection ratios (`displayToSourceX` and `displayToSourceY`).
 * Multiplying the inverted screen-relative crop window origin by these ratios maps the exact visual
 * frame seen by the user onto the full-resolution uncompressed image buffer.
 */
export function calculateCropRect(params: {
  offsetX: number;
  offsetY: number;
  displayed: ImageDimensions;
  cropWindow: CropWindowDimensions;
  source: ImageDimensions;
}): CropRect {
  const { offsetX, offsetY, displayed, cropWindow, source } = params;

  if (displayed.width <= 0 || displayed.height <= 0 || source.width <= 0 || source.height <= 0) {
    return { originX: 0, originY: 0, width: source.width, height: source.height };
  }

  // Clamped display offsets
  const clamped = clampOffset(offsetX, offsetY, displayed, cropWindow);

  // Position of crop window relative to top-left of displayed image
  const cropLeftInDisplay = -clamped.offsetX;
  const cropTopInDisplay = -clamped.offsetY;

  // Scale ratio from displayed screen pixels to native source image pixels
  const displayToSourceX = source.width / displayed.width;
  const displayToSourceY = source.height / displayed.height;

  const rawOriginX = Math.round(cropLeftInDisplay * displayToSourceX);
  const rawOriginY = Math.round(cropTopInDisplay * displayToSourceY);
  const rawWidth = Math.round(cropWindow.width * displayToSourceX);
  const rawHeight = Math.round(cropWindow.height * displayToSourceY);

  // Strictly clamp to source boundaries
  const originX = Math.max(0, Math.min(rawOriginX, source.width - 1));
  const originY = Math.max(0, Math.min(rawOriginY, source.height - 1));
  const width = Math.max(1, Math.min(rawWidth, source.width - originX));
  const height = Math.max(1, Math.min(rawHeight, source.height - originY));

  return { originX, originY, width, height };
}

export const MIN_ZOOM = 1.0;
export const MAX_ZOOM = 3.0;

/**
 * Calculates new offsets and clamped zoom when zooming into or out of a focal point
 * (such as the center of the crop window or a two-finger pinch midpoint).
 *
 * WHY FOCAL-POINT ZOOMING MATTERS (VS SIMPLE SCALE TRANSFORMS):
 * If an image is scaled around its (0,0) top-left origin, zooming causes the center of the image
 * to race away towards the bottom-right.
 * If scaled around the window center, pinching an off-center face or logo pulls the feature away
 * from the user's fingers.
 *
 * By maintaining the invariant:
 *   (focalPoint.x - newOffsetX) / newZoom === (focalPoint.x - oldOffsetX) / oldZoom
 * the exact image feature directly underneath the focal point remains invariant in screen space
 * throughout the entire pinch or wheel zoom interaction.
 */
export function zoomAroundFocalPoint(params: {
  currentOffset: { offsetX: number; offsetY: number };
  currentZoom: number;
  targetZoom: number;
  focalPoint: { x: number; y: number };
  baseDimensions: ImageDimensions;
  cropWindow: CropWindowDimensions;
  minZoom?: number;
  maxZoom?: number;
}): { offsetX: number; offsetY: number; zoom: number } {
  const {
    currentOffset,
    currentZoom,
    targetZoom,
    focalPoint,
    baseDimensions,
    cropWindow,
    minZoom = MIN_ZOOM,
    maxZoom = MAX_ZOOM,
  } = params;

  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));
  const safeCurrentZoom = Math.max(0.001, currentZoom);
  const ratio = clampedZoom / safeCurrentZoom;

  const focalXInImage = focalPoint.x - currentOffset.offsetX;
  const focalYInImage = focalPoint.y - currentOffset.offsetY;

  const rawNewOffsetX = focalPoint.x - focalXInImage * ratio;
  const rawNewOffsetY = focalPoint.y - focalYInImage * ratio;

  const newDisplayed: ImageDimensions = {
    width: Math.round(baseDimensions.width * clampedZoom),
    height: Math.round(baseDimensions.height * clampedZoom),
  };

  const clampedOffset = clampOffset(rawNewOffsetX, rawNewOffsetY, newDisplayed, cropWindow);

  return {
    offsetX: clampedOffset.offsetX,
    offsetY: clampedOffset.offsetY,
    zoom: clampedZoom,
  };
}
