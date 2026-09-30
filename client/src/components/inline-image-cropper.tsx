/**
 * Inline 16:9 Image Cropper Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Previously, photo cropping for event flyer banners was handled in a dedicated Slot 5
 * Phantom Tab in the horizontal pager track (`app-tabs.tsx`). While this avoided native
 * OS modal focus blur bugs, navigating away from the Create Post screen introduced camera
 * glide transitions, unneeded track expansion, and separated the user from the composer form.
 *
 * This inline cropper mounts directly within the 16:9 banner container (`forceCroppedContainer`)
 * on the Create Post page:
 * 1. Pixel-Perfect Continuity: When reopening "Edit", the cropper accepts `initialTransform`
 *    and resumes at the exact zoom and offset coordinates where the user previously saved,
 *    preventing any jarring snap or zoom-out.
 * 2. Gesture Isolation:
 *    - Calls `onInteractionChange(true/false)` to disable vertical scrolling on the parent
 *      `ScrollView` during active touches.
 *    - Calls `setInnerScrollActive(true/false)` via `useTabPagerPriority()` to lock horizontal
 *      tab swiping while panning or pinching the image.
 * 3. Multi-Platform Zoom:
 *    - Touchscreen: Native PanResponder pinch-to-zoom and 1-finger panning.
 *    - Desktop Web: Mouse drag panning + centered mouse-wheel zoom listener.
 * 4. High-Fidelity Export:
 *    - Computes scalar projection ratios to crop the full-resolution source image buffer
 *      via `expo-image-manipulator` (`manipulateAsync`) at 0.88 JPEG quality.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius } from '@/constants/theme';
import { useTabPagerPriority } from '@/context/tab-pager-priority-context';
import {
  CROP_ASPECT_RATIO,
  calculateBaseDisplayDimensions,
  calculateCropRect,
  clampOffset,
  getInitialCenteredOffset,
  zoomAroundFocalPoint,
  type ImageDimensions,
} from '@/utils/image-crop';

export const CROP_MIN_ZOOM = 1.0;
export const CROP_MAX_ZOOM = 4.0;

export type CropTransformState = {
  zoom: number;
  offset: { offsetX: number; offsetY: number };
};

export type CropResult = {
  uri: string;
  transform: CropTransformState;
};

export type InlineImageCropperRef = {
  applyCrop: () => Promise<CropResult>;
  resetCrop: () => void;
  getTransform: () => CropTransformState;
};

export type InlineImageCropperProps = {
  imageUri: string;
  imageDimensions: ImageDimensions;
  initialTransform?: CropTransformState | null;
  onInteractionChange?: (interacting: boolean) => void;
  aspectRatio?: number;
};

export const InlineImageCropper = forwardRef<InlineImageCropperRef, InlineImageCropperProps>(
  function InlineImageCropper(
    {
      imageUri,
      imageDimensions,
      initialTransform,
      onInteractionChange,
      aspectRatio = CROP_ASPECT_RATIO,
    },
    ref
  ) {
    const { setInnerScrollActive } = useTabPagerPriority();

    // Crop window dimensions derived from container layout (16:9 default fallback)
    const [cropWindow, setCropWindow] = useState<{ width: number; height: number }>({
      width: 360,
      height: Math.round(360 / aspectRatio),
    });

    // Base display dimensions at 1.0x cover zoom
    const baseDims = useMemo(() => {
      return calculateBaseDisplayDimensions(imageDimensions, cropWindow);
    }, [imageDimensions, cropWindow]);

    // Transform state: zoom and display offsets
    const [zoom, setZoom] = useState(() => initialTransform?.zoom ?? 1.0);
    const [offset, setOffset] = useState(() => {
      if (initialTransform) {
        return initialTransform.offset;
      }
      return getInitialCenteredOffset(baseDims, cropWindow);
    });

    // Mutable refs to prevent stale closures inside PanResponder & async operations
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const offsetRef = useRef(offset);
    offsetRef.current = offset;
    const baseDimsRef = useRef(baseDims);
    baseDimsRef.current = baseDims;
    const cropWindowRef = useRef(cropWindow);
    cropWindowRef.current = cropWindow;
    const imageDimensionsRef = useRef(imageDimensions);
    imageDimensionsRef.current = imageDimensions;

    // Multi-touch tracking refs
    const isPinchingRef = useRef(false);
    const pinchStartDistRef = useRef(0);
    const pinchStartZoomRef = useRef(1.0);
    const pinchStartOffsetRef = useRef({ offsetX: 0, offsetY: 0 });

    // Single-touch / pan tracking refs
    const panStartOffsetRef = useRef({ offsetX: 0, offsetY: 0 });
    const panStartTouchRef = useRef({ pageX: 0, pageY: 0 });

    // Session tracking: resets when imageUri changes, or restores initialTransform
    const sessionUriRef = useRef<string | null>(null);

    useEffect(() => {
      if (!imageUri) {
        sessionUriRef.current = null;
        return;
      }

      if (sessionUriRef.current !== imageUri) {
        sessionUriRef.current = imageUri;
        if (initialTransform) {
          setZoom(initialTransform.zoom);
          setOffset(initialTransform.offset);
          zoomRef.current = initialTransform.zoom;
          offsetRef.current = initialTransform.offset;
        } else {
          const base = calculateBaseDisplayDimensions(imageDimensions, cropWindowRef.current);
          const initial = getInitialCenteredOffset(base, cropWindowRef.current);
          setZoom(1.0);
          setOffset(initial);
          zoomRef.current = 1.0;
          offsetRef.current = initial;
        }
      }
    }, [imageUri, imageDimensions, initialTransform]);

    // Safety cleanup on unmount: ensure gesture priority & parent scroll locks are released
    useEffect(() => {
      return () => {
        setInnerScrollActive(false);
        onInteractionChange?.(false);
      };
    }, [setInnerScrollActive, onInteractionChange]);

    // Handle container layout change
    const handleLayout = useCallback(
      (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        if (width <= 0 || height <= 0) return;

        const newWindow = { width, height };
        setCropWindow(newWindow);
        cropWindowRef.current = newWindow;

        // If offset is already set, ensure it is clamped within the updated layout bounds
        const newBase = calculateBaseDisplayDimensions(imageDimensionsRef.current, newWindow);
        baseDimsRef.current = newBase;

        const displayedDims = {
          width: Math.round(newBase.width * zoomRef.current),
          height: Math.round(newBase.height * zoomRef.current),
        };

        const clamped = clampOffset(
          offsetRef.current.offsetX,
          offsetRef.current.offsetY,
          displayedDims,
          newWindow
        );
        offsetRef.current = clamped;
        setOffset(clamped);
      },
      []
    );

    // Apply crop manipulation
    const handleApplyCrop = useCallback(async (): Promise<CropResult> => {
      const currentZoom = zoomRef.current;
      const currentOffset = offsetRef.current;

      const displayedDims = {
        width: Math.round(baseDimsRef.current.width * currentZoom),
        height: Math.round(baseDimsRef.current.height * currentZoom),
      };

      const cropRect = calculateCropRect({
        offsetX: currentOffset.offsetX,
        offsetY: currentOffset.offsetY,
        displayed: displayedDims,
        cropWindow: cropWindowRef.current,
        source: imageDimensionsRef.current,
      });

      try {
        const manipResult = await manipulateAsync(
          imageUri,
          [{ crop: cropRect }],
          { format: SaveFormat.JPEG, compress: 0.88 }
        );

        return {
          uri: manipResult.uri,
          transform: {
            zoom: currentZoom,
            offset: currentOffset,
          },
        };
      } catch (err) {
        console.error('[InlineImageCropper] Crop manipulation error:', err);
        return {
          uri: imageUri,
          transform: {
            zoom: currentZoom,
            offset: currentOffset,
          },
        };
      }
    }, [imageUri]);

    // Imperative handle exposed to parent
    useImperativeHandle(
      ref,
      () => ({
        applyCrop: handleApplyCrop,
        resetCrop: () => {
          const initial = getInitialCenteredOffset(baseDimsRef.current, cropWindowRef.current);
          setZoom(1.0);
          setOffset(initial);
          zoomRef.current = 1.0;
          offsetRef.current = initial;
        },
        getTransform: () => ({
          zoom: zoomRef.current,
          offset: offsetRef.current,
        }),
      }),
      [handleApplyCrop]
    );

    // Gesture Responder with ScrollView & Pager Lockout
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderTerminationRequest: () => true,

          onPanResponderGrant: (evt) => {
            // Lock parent tab pager and vertical ScrollView
            setInnerScrollActive(true);
            onInteractionChange?.(true);

            const touches = evt.nativeEvent.touches;
            if (touches && touches.length >= 2) {
              isPinchingRef.current = true;
              const t0 = touches[0];
              const t1 = touches[1];
              pinchStartDistRef.current = Math.hypot(t0.pageX - t1.pageX, t0.pageY - t1.pageY);
              pinchStartZoomRef.current = zoomRef.current;
              pinchStartOffsetRef.current = { ...offsetRef.current };
            } else {
              isPinchingRef.current = false;
              panStartOffsetRef.current = { ...offsetRef.current };
              const t0 = (touches && touches[0]) || evt.nativeEvent;
              panStartTouchRef.current = { pageX: t0.pageX, pageY: t0.pageY };
            }
          },

          onPanResponderMove: (evt) => {
            const touches = evt.nativeEvent.touches;

            // Two-finger pinch-to-zoom
            if (touches && touches.length >= 2) {
              const t0 = touches[0];
              const t1 = touches[1];
              const currentDist = Math.hypot(t0.pageX - t1.pageX, t0.pageY - t1.pageY);

              if (!isPinchingRef.current || pinchStartDistRef.current <= 0) {
                isPinchingRef.current = true;
                pinchStartDistRef.current = currentDist;
                pinchStartZoomRef.current = zoomRef.current;
                pinchStartOffsetRef.current = { ...offsetRef.current };
                return;
              }

              const scaleRatio = currentDist / Math.max(1, pinchStartDistRef.current);
              const targetZoom = pinchStartZoomRef.current * scaleRatio;

              const result = zoomAroundFocalPoint({
                currentOffset: pinchStartOffsetRef.current,
                currentZoom: pinchStartZoomRef.current,
                targetZoom,
                focalPoint: {
                  x: cropWindowRef.current.width / 2,
                  y: cropWindowRef.current.height / 2,
                },
                baseDimensions: baseDimsRef.current,
                cropWindow: cropWindowRef.current,
                minZoom: CROP_MIN_ZOOM,
                maxZoom: CROP_MAX_ZOOM,
              });

              zoomRef.current = result.zoom;
              offsetRef.current = { offsetX: result.offsetX, offsetY: result.offsetY };
              setZoom(result.zoom);
              setOffset({ offsetX: result.offsetX, offsetY: result.offsetY });
              return;
            }

            // Lifted second finger: transition cleanly back to 1-finger drag
            if (isPinchingRef.current) {
              isPinchingRef.current = false;
              panStartOffsetRef.current = { ...offsetRef.current };
              const t0 = (touches && touches[0]) || evt.nativeEvent;
              panStartTouchRef.current = { pageX: t0.pageX, pageY: t0.pageY };
              return;
            }

            // Single-finger (or desktop mouse) drag
            const currentTouch = (touches && touches[0]) || evt.nativeEvent;
            const dx = currentTouch.pageX - panStartTouchRef.current.pageX;
            const dy = currentTouch.pageY - panStartTouchRef.current.pageY;

            const rawNewX = panStartOffsetRef.current.offsetX + dx;
            const rawNewY = panStartOffsetRef.current.offsetY + dy;

            const displayedDims = {
              width: Math.round(baseDimsRef.current.width * zoomRef.current),
              height: Math.round(baseDimsRef.current.height * zoomRef.current),
            };
            const clamped = clampOffset(rawNewX, rawNewY, displayedDims, cropWindowRef.current);

            offsetRef.current = clamped;
            setOffset(clamped);
          },

          onPanResponderRelease: () => {
            isPinchingRef.current = false;
            pinchStartDistRef.current = 0;
            setInnerScrollActive(false);
            onInteractionChange?.(false);
          },

          onPanResponderTerminate: () => {
            isPinchingRef.current = false;
            pinchStartDistRef.current = 0;
            setInnerScrollActive(false);
            onInteractionChange?.(false);
          },
        }),
      [setInnerScrollActive, onInteractionChange]
    );

    // Guaranteed reset on mount, unmount, or when the imageUri changes
    useEffect(() => {
      setInnerScrollActive(false);
      onInteractionChange?.(false);
      return () => {
        setInnerScrollActive(false);
        onInteractionChange?.(false);
      };
    }, [imageUri, setInnerScrollActive, onInteractionChange]);

    // Desktop Web Mouse Wheel Listener
    const handleWebWheel = (e: any) => {
      if (Platform.OS !== 'web') return;
      e.preventDefault?.();
      e.stopPropagation?.();

      const delta = e.deltaY;
      const zoomFactor = delta > 0 ? 0.92 : 1.08;
      const targetZoom = zoomRef.current * zoomFactor;

      const result = zoomAroundFocalPoint({
        currentOffset: offsetRef.current,
        currentZoom: zoomRef.current,
        targetZoom,
        focalPoint: {
          x: cropWindowRef.current.width / 2,
          y: cropWindowRef.current.height / 2,
        },
        baseDimensions: baseDimsRef.current,
        cropWindow: cropWindowRef.current,
        minZoom: CROP_MIN_ZOOM,
        maxZoom: CROP_MAX_ZOOM,
      });

      zoomRef.current = result.zoom;
      offsetRef.current = { offsetX: result.offsetX, offsetY: result.offsetY };
      setZoom(result.zoom);
      setOffset({ offsetX: result.offsetX, offsetY: result.offsetY });
    };

    const displayedWidth = Math.round(baseDims.width * zoom);
    const displayedHeight = Math.round(baseDims.height * zoom);

    return (
      <View
        style={styles.container}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
        {...(Platform.OS === 'web' ? { onWheel: handleWebWheel } : {})}
      >
        {/* The Scaled and Positioned Source Image */}
        <Image
          source={{ uri: imageUri }}
          style={{
            position: 'absolute',
            left: offset.offsetX,
            top: offset.offsetY,
            width: displayedWidth,
            height: displayedHeight,
          }}
          contentFit="fill"
        />

        {/* Viewfinder Rule-of-Thirds Grid & Golden Corner Overlay */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.gridLineV, { left: '33.33%' }]} />
          <View style={[styles.gridLineV, { left: '66.66%' }]} />

          <View style={[styles.gridLineH, { top: '33.33%' }]} />
          <View style={[styles.gridLineH, { top: '66.66%' }]} />

          <View style={[styles.cornerBracket, styles.cornerTL]} />
          <View style={[styles.cornerBracket, styles.cornerTR]} />
          <View style={[styles.cornerBracket, styles.cornerBL]} />
          <View style={[styles.cornerBracket, styles.cornerBR]} />

          {/* Interactive Mode Badge */}
          <View style={styles.cropModeBadge}>
            <ThemedText style={styles.cropModeBadgeText}>
              {Platform.OS === 'web'
                ? 'DRAG · SCROLL TO ZOOM'
                : 'DRAG · PINCH TO ZOOM'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(243, 195, 0, 0.75)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: Brand.gold,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  cropModeBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(243, 195, 0, 0.4)',
  },
  cropModeBadgeText: {
    color: Brand.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
