/**
 * Campus Dining & Digital ID Screen (Slot 1 Router)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Lightweight anti-monolith router delegating between `DiningMobileView` and `DiningWebView`
 * (AGENTS.md Rule 4.3 & 4.5).
 * - Mobile (< 768px): Single-column focused stack.
 * - Desktop Web (>= 768px): 2-column split dashboard (ID Card on left, dining halls & menus on right).
 */

import { DiningMobileView } from '@/components/dining-mobile-view';
import { DiningWebView } from '@/components/dining-web-view';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function DiningScreen() {
  const { isCompact } = useResponsiveLayout();

  if (isCompact) {
    return <DiningMobileView />;
  }

  return <DiningWebView />;
}
