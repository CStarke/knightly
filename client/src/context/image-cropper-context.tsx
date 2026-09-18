/**
 * Image Cropper Context & In-Pager Phantom Tab View
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * When a club leader picks an image for a campus event flyer in the Create Post tab (Slot 4),
 * they need to crop it to the standard 16:9 banner format before publishing.
 *
 * Early versions used either a React Native `<Modal>` or a separate screen route (`router.push('/cropper')`).
 * Both approaches created severe UX and engine bugs:
 * 1. React Native `<Modal>`: Dismissing a native modal on iOS/Android or desktop browser often causes
 *    an OS window focus blur event. This caused React Navigation to lose active tab tracking, disabled
 *    the tab bar gestures, and caused the "Knightly" home tab to stay permanently selected/red.
 * 2. Separate Route (`router.push`): Pushing a stack route destroyed the persistent 3D starfield parallax
 *    and unmounted the horizontal tab pager, making transitions feel jarring and slow.
 *
 * THE PHANTOM TAB SOLUTION (Slot 5):
 * The cropper is mounted directly as an in-pager "phantom tab" in Slot 5, immediately to the right of
 * Create Post (Slot 4). When active:
 * - The horizontal pager animates smoothly to Slot 5.
 * - The persistent Top Header transforms its title to "Crop Banner" and displays a "Done" button.
 * - The starfield background continues its continuous parallax drift without interruption.
 * - No modal windows or OS route changes are spawned, completely eliminating window focus corruption.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
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

export type OpenCropperOptions = {
  imageUri: string;
  imageDimensions: ImageDimensions;
  onCropComplete: (croppedUri: string) => void;
  onClose?: () => void;
};

type ImageCropperContextType = {
  openCropper: (options: OpenCropperOptions) => void;
  closeCropper: () => void;
  isOpen: boolean;
  activeOptions: OpenCropperOptions | null;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  registerCropHandler: (handler: (() => Promise<void>) | null) => void;
  applyCrop: () => Promise<void>;
};

const ImageCropperContext = createContext<ImageCropperContextType | null>(null);

export function useImageCropper(): ImageCropperContextType {
  const context = useContext(ImageCropperContext);
  if (!context) {
    throw new Error('useImageCropper must be used within an ImageCropperProvider');
  }
  return context;
}

/**
 * ImageCropperProvider manages the active cropping session state.
 *
 * WHY registerCropHandler / applyCrop:
 * The "Done" / Save action button is rendered in the global persistent `AppHeader` (at the top of the root layout),
 * while the image geometry and canvas manipulation logic live down inside `ImageCropperView`.
 * Rather than lifting heavy PanResponder state or image buffers into global context (which would cause the entire
 * app to re-render on every touch move), `registerCropHandler` allows the child view to register its async
 * cropping execution function. When the user taps "Done" in the header, `applyCrop()` triggers the registered handler.
 */
export function ImageCropperProvider({ children }: PropsWithChildren) {
  const [activeOptions, setActiveOptions] = useState<OpenCropperOptions | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cropHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const openCropper = useCallback((options: OpenCropperOptions) => {
    setActiveOptions(options);
    setIsProcessing(false);
  }, []);

  const closeCropper = useCallback(() => {
    const onCancel = activeOptions?.onClose;
    setActiveOptions(null);
    setIsProcessing(false);
    onCancel?.();
  }, [activeOptions]);

  const registerCropHandler = useCallback((handler: (() => Promise<void>) | null) => {
    cropHandlerRef.current = handler;
  }, []);

  const applyCrop = useCallback(async () => {
    if (cropHandlerRef.current) {
      await cropHandlerRef.current();
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      openCropper,
      closeCropper,
      isOpen: activeOptions !== null,
      activeOptions,
      isProcessing,
      setIsProcessing,
      registerCropHandler,
      applyCrop,
    }),
    [openCropper, closeCropper, activeOptions, isProcessing, registerCropHandler, applyCrop]
  );

  return (
    <ImageCropperContext.Provider value={contextValue}>
      {children}
    </ImageCropperContext.Provider>
  );
}

/**
 * Pure in-pager Phantom Tab view for Slot 5 (adjacent to Create Post in Slot 4).
 * Eliminates all Modal and full-screen overlay window controller collisions.
 *
 * WHY IN-PAGER PHANTOM TAB:
 * By mounting this view directly within the main horizontal pager container:
 * 1. Background continuity: The 3-layer parallax starfield persists without flashing or resetting.
 * 2. Window hierarchy: No modal controllers or navigation push transitions disrupt the React Native root.
 * 3. Gestures: Tab navigation priority is handled cooperatively via TabPagerPriorityContext.
 */
export function ImageCropperView({
  imageUri,
  imageDimensions,
  onClose,
  onCropComplete,
}: {
  imageUri: string;
  imageDimensions: ImageDimensions;
  onClose: () => void;
  onCropComplete: (croppedUri: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isProcessing, setIsProcessing, registerCropHandler } = useImageCropper();
  const { setInnerScrollActive } = useTabPagerPriority();

  // 16:9 crop window dimensions
  // WHY RESPONSIVE CALCULATION:
  // On small mobile screens (e.g. iPhone SE), vertical space is limited by safe area insets and the top header.
  // On large iPads or desktop browsers, an unconstrained 16:9 box would exceed typical viewable flyer dimensions.
  // Capping width at 540px and reserving 25% vertical breathing room keeps the composition box centered and usable.
  const cropWindow = useMemo(() => {
    const maxAvailableWidth = Math.min(windowWidth - 32, 540);
    const maxAvailableHeight = (windowHeight - insets.top - insets.bottom - 160) * 0.75;
    const widthByHeightLimit = maxAvailableHeight * CROP_ASPECT_RATIO;

    const width = Math.round(Math.max(260, Math.min(maxAvailableWidth, widthByHeightLimit)));
    const height = Math.round(width / CROP_ASPECT_RATIO);
    return { width, height };
  }, [windowWidth, windowHeight, insets.top, insets.bottom]);

  // Base display dimensions (at zoom = 1.0)
  const baseDims = useMemo(() => {
    return calculateBaseDisplayDimensions(imageDimensions, cropWindow);
  }, [imageDimensions, cropWindow]);

  // Transform state: zoom and display offsets
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState(() => getInitialCenteredOffset(baseDims, cropWindow));

  // Mutable refs to prevent stale closures inside PanResponder and async callbacks.
  // WHY MUTABLE REFS:
  // PanResponder callbacks are created once or infrequently. If they captured React state directly,
  // high-frequency touch moves (60-120Hz) would capture stale values, causing the image to jitter
  // or jump to origin on subsequent touches. Syncing refs on each render guarantees the gesture
  // handlers always read real-time values without re-subscribing the responder.
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

  // Strictly initialize once per imageUri session
  // WHY SESSION TRACKING:
  // If the user selects a new photo, the cropper must reset to minimum zoom (1.0x) and re-center.
  // Tracking `sessionUriRef` prevents re-centering when layout dimensions or keyboard insets shift.
  const sessionUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUri) {
      sessionUriRef.current = null;
      return;
    }

    if (sessionUriRef.current !== imageUri) {
      sessionUriRef.current = imageUri;
      const base = calculateBaseDisplayDimensions(imageDimensions, cropWindow);
      const initial = getInitialCenteredOffset(base, cropWindow);
      setZoom(1.0);
      setOffset(initial);
      offsetRef.current = initial;
      zoomRef.current = 1.0;
    }
  }, [imageUri, imageDimensions, cropWindow]);

  // Handle crop manipulation and save
  // WHY JPEG 0.88 QUALITY:
  // Compressing at 0.88 achieves an optimal sweet spot for campus flyers: artifact-free sharp typography
  // and event details while reducing multi-megabyte camera photos down to ~200-400KB for fast feed loading.
  const handleApplyCrop = useCallback(async () => {
    if (!imageUri || isProcessing) return;

    try {
      setIsProcessing(true);

      const displayedDims = {
        width: Math.round(baseDimsRef.current.width * zoomRef.current),
        height: Math.round(baseDimsRef.current.height * zoomRef.current),
      };

      const cropRect = calculateCropRect({
        offsetX: offsetRef.current.offsetX,
        offsetY: offsetRef.current.offsetY,
        displayed: displayedDims,
        cropWindow: cropWindowRef.current,
        source: imageDimensionsRef.current,
      });

      const manipResult = await manipulateAsync(
        imageUri,
        [{ crop: cropRect }],
        { format: SaveFormat.JPEG, compress: 0.88 }
      );

      setIsProcessing(false);
      onCropComplete(manipResult.uri);
    } catch (err) {
      console.error('[ImageCropperView] Crop manipulation error:', err);
      setIsProcessing(false);
      onCropComplete(imageUri);
    }
  }, [imageUri, isProcessing, setIsProcessing, onCropComplete]);

  // Register the crop handler with ImageCropperContext so the AppHeader Done button can trigger it
  useEffect(() => {
    registerCropHandler(handleApplyCrop);
    return () => {
      registerCropHandler(null);
    };
  }, [registerCropHandler, handleApplyCrop]);

  // Pan & Pinch Gesture Responder
  // WHY PanResponder OVER Gesture.Pan():
  // PanResponder grants synchronous, direct inspection of multi-touch points (`touches.length >= 2`).
  // Calling `setInnerScrollActive(true)` on grant locks out the outer horizontal pager worklet,
  // preventing lateral image dragging from triggering accidental tab switching.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          setInnerScrollActive(true);
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

          // Two-finger pinch-to-zoom gesture
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

          // Transition from pinch back to 1-finger pan if a finger was lifted
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
        },

        onPanResponderTerminate: () => {
          isPinchingRef.current = false;
          pinchStartDistRef.current = 0;
          setInnerScrollActive(false);
        },
      }),
    [setInnerScrollActive]
  );

  // Web desktop mouse wheel listener
  // WHY DESKTOP WHEEL LISTENER:
  // Desktop browser users do not have touchscreen pinch gestures. Mapping the mouse wheel
  // (or two-finger trackpad pinch on macOS Safari/Chrome) allows natural, fluid zoom control
  // anchored directly around the crop window center.
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
    <View style={styles.viewRoot}>
      {/* Viewport Center */}
      <View style={styles.viewportCenterContainer}>
        <View
          style={[
            styles.cropFrame,
            {
              width: cropWindow.width,
              height: cropWindow.height,
            },
          ]}
          {...panResponder.panHandlers}
          {...(Platform.OS === 'web' ? { onWheel: handleWebWheel } : {})}
        >
          {/* The Scaled and Positioned Image */}
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

          {/* Viewfinder Rule-of-Thirds Grid Overlay
              WHY pointerEvents="none":
              The grid lines and golden corner accents sit on top of the image to assist the user
              with rule-of-thirds visual composition. Setting pointerEvents="none" ensures these
              aesthetic elements do not swallow touch events, passing all touch coordinates
              directly to the panResponder attached to the cropFrame. */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.gridLineV, { left: '33.33%' }]} />
            <View style={[styles.gridLineV, { left: '66.66%' }]} />

            <View style={[styles.gridLineH, { top: '33.33%' }]} />
            <View style={[styles.gridLineH, { top: '66.66%' }]} />

            <View style={[styles.cornerBracket, styles.cornerTL]} />
            <View style={[styles.cornerBracket, styles.cornerTR]} />
            <View style={[styles.cornerBracket, styles.cornerBL]} />
            <View style={[styles.cornerBracket, styles.cornerBR]} />
          </View>
        </View>

        {/* Interactive Guidance Hint */}
        <ThemedText style={styles.dragHintText}>
          {Platform.OS === 'web'
            ? 'Drag to reposition · Scroll wheel to zoom'
            : 'Drag to reposition · Pinch to zoom'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewportCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  cropFrame: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(243, 195, 0, 0.75)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
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
  dragHintText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: Spacing.three,
    letterSpacing: 0.3,
  },
});
