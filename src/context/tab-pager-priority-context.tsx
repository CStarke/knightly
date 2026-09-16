import React, { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type TabPagerPriorityContextType = {
  /**
   * Shared value indicating whether an inner horizontal scrollable element
   * (e.g. tag filter chips, carousels) is currently being interacted with.
   * When true, the outer tab pager pan gesture is prevented from intercepting touches.
   */
  isInnerScrollActive: SharedValue<boolean>;
  /** Helper function to set inner scroll active state */
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
