import { useMemo, type ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CampusMapView from '@/components/campus-map-view';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { createCampusMapHtml } from '@/utils/campus-map-html';

/**
 * Shared map body for the native phantom page and standalone web route.
 * @returns A fixed, safe-area-aware viewer; the owning screen supplies its header.
 */
export function CampusMapContent(): ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Stable HTML preserves pan/zoom through unrelated pager renders.
  const html = useMemo(() => createCampusMapHtml(theme), [theme]);

  return (
    <Screen scroll={false} style={{ paddingBottom: insets.bottom }}>
      <CampusMapView html={html} />
    </Screen>
  );
}