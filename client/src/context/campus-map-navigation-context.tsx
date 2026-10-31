import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { router } from 'expo-router';

/** Opens Map through the native pager, or its existing route on web. */
type CampusMapNavigation = { openCampusMap: () => void };

// Web and standalone consumers keep the existing route, without an unsafe `any` cast.
const CampusMapNavigationContext = createContext<CampusMapNavigation>({
  openCampusMap: () => router.push('/campus-map'),
});

/** @returns A provider whose children open Map inside the owning Safety pager. */
export function CampusMapNavigationProvider({ children, value }: {
  children: ReactNode;
  value: CampusMapNavigation;
}): ReactElement {
  return <CampusMapNavigationContext.Provider value={value}>{children}</CampusMapNavigationContext.Provider>;
}

/** @returns The platform's Map entry action; defaults to routed navigation on web. */
export function useCampusMapNavigation(): CampusMapNavigation {
  return useContext(CampusMapNavigationContext);
}