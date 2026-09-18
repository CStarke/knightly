/**
 * ============================================================================
 * TAB PAGER GESTURE PRIORITY MEDIATION CONTEXT
 * ============================================================================
 *
 * WHY DOES THIS CONTEXT EXIST?
 * In a mobile UI where the root view is an interactive horizontal pan gesture pager
 * (`Gesture.Pan()` in `app-tabs.tsx`), any horizontal finger movement across the
 * screen will naturally be captured by the pager to swipe between tabs.
 *
 * THE TOUCH COLLISION PROBLEM:
 * When inner child components also require horizontal interaction—such as:
 * 1. Horizontal category tag filter chips (`ChipRow` in the feed and clubs directories)
 * 2. The 16:9 photo cropping viewfinder (`ImageCropperView` in Slot 5)
 * The outer pager's Pan gesture and the inner child's pan/scroll responder compete
 * for the same touch events. Without arbitration, swiping through category chips
 * or panning an image horizontally accidentally swipes the whole screen to the next tab!
 *
 * THE REANIMATED WORKLET SOLUTION:
 * This context exposes `isInnerScrollActive`, a Reanimated `SharedValue<boolean>`.
 * When a user initiates a touch inside a nested horizontal view, the child immediately
 * sets `isInnerScrollActive = true`.
 * In `app-tabs.tsx`, the outer pager's `onStart`, `onUpdate`, and `onEnd` worklets
 * synchronously check `if (isInnerScrollActive.value) return;` directly on the UI thread.
 * This completely locks out the tab pager with ZERO bridge latency, allowing the child
 * to enjoy 100% uninterrupted gesture tracking.
 */

import React, { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type TabPagerPriorityContextType = {
  /**
   * Shared value indicating whether an inner horizontal scrollable element
   * (e.g. tag filter chips, photo cropper viewfinder) is currently active.
   * Read synchronously inside Reanimated UI worklets to block outer pager swipes.
   */
  isInnerScrollActive: SharedValue<boolean>;
  /** Bridge callback to update the shared priority state from JavaScript/React responders */
  setInnerScrollActive: (active: boolean) => void;
};

const fallbackSharedValue: SharedValue<boolean> = {
  value: false,
  addListener: () => {},
  removeListener: () => {},
  modify: () => {},
  get: () => false,
  set: () => {},
};

const defaultContext: TabPagerPriorityContextType = {
  isInnerScrollActive: fallbackSharedValue,
  setInnerScrollActive: () => {},
};

const TabPagerPriorityContext = createContext<TabPagerPriorityContextType>(defaultContext);

export function TabPagerPriorityProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TabPagerPriorityContextType;
}) {
  return (
    <TabPagerPriorityContext.Provider value={value}>
      {children}
    </TabPagerPriorityContext.Provider>
  );
}

export function useTabPagerPriority() {
  return useContext(TabPagerPriorityContext);
}
