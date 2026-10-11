/**
 * Campus Safety & Emergency Dispatch Screen (Slot 2 Router)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Lightweight anti-monolith router delegating between `SafetyMobileView` and `SafetyWebView`
 * (AGENTS.md Rule 4.3 & 4.5).
 * - Mobile (< 768px): Single-column prioritized vertical stack.
 * - Desktop Web (>= 768px): 2-column command center (emergency dialer & contacts on left, active alerts on right).
 */

import { SafetyMobileView } from '@/components/safety-mobile-view';
import { SafetyWebView } from '@/components/safety-web-view';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function SafetyScreen() {
  const { isCompact } = useResponsiveLayout();

  if (isCompact) {
    return <SafetyMobileView />;
  }

  return <SafetyWebView />;
}
