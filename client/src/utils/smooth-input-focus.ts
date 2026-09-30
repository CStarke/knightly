import { Dimensions, Platform } from 'react-native';

export interface SmoothFocusOptions {
  scrollViewRef?: React.RefObject<any>;
  targetY?: number;
  offsetThreshold?: number;
}

/**
 * Universally centers an input on focus when it sits in the bottom half of the screen.
 * - Skips inputs that reside within modal dialogs (modals shift themselves).
 * - On Web: uses native smooth scrollIntoView with block: 'center'.
 * - On Native (iOS/Android): scrolls the containing ScrollView with smooth cubic/animated scrolling.
 */
export function handleSmoothInputFocus(e?: any, options?: SmoothFocusOptions) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const target = e?.target as HTMLElement | undefined;
    if (target && typeof target.getBoundingClientRect === 'function') {
      // Modal & stationary view exclusion: if inside a dialog/modal or stationary view, do not shift window scroll
      if (
        target.closest &&
        (target.closest('[role="dialog"]') ||
          target.closest('[data-modal="true"]') ||
          target.closest('[data-no-auto-scroll="true"]'))
      ) {
        return;
      }
      const rect = target.getBoundingClientRect();
      const threshold = options?.offsetThreshold ?? window.innerHeight * 0.45;
      if (rect.top > threshold || rect.bottom > window.innerHeight * 0.5) {
        if (typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  // Native ScrollView centering
  if (options?.scrollViewRef?.current && typeof options?.targetY === 'number') {
    const windowHeight = Dimensions.get('window').height;
    const targetScrollY = Math.max(0, options.targetY - Math.min(100, windowHeight * 0.15));
    setTimeout(() => {
      options.scrollViewRef?.current?.scrollTo({
        y: targetScrollY,
        animated: true,
      });
    }, Platform.OS === 'android' ? 100 : 50);
  }
}

/**
 * Attaches a global event listener on Web to ensure ANY input field in the bottom half
 * of the screen across the entire app smoothly centers on user interaction.
 * Excludes modal dialogs.
 */
export function setupUniversalWebSmoothFocus(): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return () => {};
  }

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const tagName = target.tagName;
    if (tagName !== 'INPUT' && tagName !== 'TEXTAREA') return;

    // Skip if inside a modal or stationary view
    if (
      target.closest &&
      (target.closest('[role="dialog"]') ||
        target.closest('[data-modal="true"]') ||
        target.closest('[data-no-auto-scroll="true"]'))
    ) {
      return;
    }

    // Check if in bottom half of viewport
    const rect = target.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.45) {
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  window.addEventListener('focusin', handleFocusIn, { passive: true });
  return () => {
    window.removeEventListener('focusin', handleFocusIn);
  };
}
