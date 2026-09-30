import { createContext, useContext } from 'react';
import type { MaterialSymbolName, SfSymbolName } from '@/components/ui/icon';

/**
 * Tab metadata defining icons, route URLs, and accessibility labels.
 */
export type TabMeta = {
  name: string;
  href: '/' | '/dining' | '/post' | '/safety' | '/directory';
  label: string;
  sf: SfSymbolName;
  sfActive?: SfSymbolName;
  md: MaterialSymbolName;
  mdActive?: MaterialSymbolName;
};

/**
 * Global Tab Navigation & Synchronization Context
 *
 * Coordinates bottom bar taps, horizontal swipe gestures, and cross-tab programmatic
 * navigation (e.g. "View in Feed" confirmation in the Create Post modal).
 */
export type TabNavigationContextValue = {
  activeTabIndex: number;
  setActiveTabIndex: (index: number) => void;
  navigateToTab: (targetIndex: number, targetHref?: string) => void;
  tabs: TabMeta[];
};

export const TabNavigationContext = createContext<TabNavigationContextValue | null>(null);

export function useTabNavigation(): TabNavigationContextValue | null {
  return useContext(TabNavigationContext);
}
