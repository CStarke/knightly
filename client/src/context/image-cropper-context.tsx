/**
 * Image Cropper Context (DEPRECATED - SUPERSEDED BY InlineImageCropper)
 *
 * ARCHITECTURAL EVOLUTION:
 * - V1: React Native <Modal> (caused OS window blur focus bugs).
 * - V2: Slot 5 Phantom Tab (in-pager horizontal slide to slot 5).
 * - V3 (Current Standard): Direct inline 16:9 cropper (`InlineImageCropper` in `post.tsx`).
 *
 * By mounting the cropper directly inline inside Section 4 ("PHOTO / BANNER") of Create Post:
 * 1. Eliminates pager track expansion and camera slide animation latency.
 * 2. Directly connects the full-width "Change photo" and dynamic "Edit" / "Done" toggle buttons.
 * 3. Retains exact zoom level and offset coordinates when toggling between preview and editing modes.
 *
 * This file is retained as a lightweight backwards-compatible shim.
 */

import { createContext, useContext, type PropsWithChildren } from 'react';
import type { ImageDimensions } from '@/utils/image-crop';

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

const ImageCropperContext = createContext<ImageCropperContextType>({
  openCropper: () => {},
  closeCropper: () => {},
  isOpen: false,
  activeOptions: null,
  isProcessing: false,
  setIsProcessing: () => {},
  registerCropHandler: () => {},
  applyCrop: async () => {},
});

export function useImageCropper(): ImageCropperContextType {
  return useContext(ImageCropperContext);
}

export function ImageCropperProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
