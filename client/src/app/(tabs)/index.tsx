/**
 * Campus Feed Home Screen (Slot 0)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Primary landing screen for Knightly (`/`). Acts as a lightweight platform router delegating
 * between FeedWebView (multi-column balanced web grid) and FeedMobileView (singular full-width
 * mobile column with animated scope toggle).
 *
 * ANTI-MONOLITH MODULARIZATION (AGENTS.md Rule 4.3):
 * Keeps platform layout trees strictly decoupled to eliminate cross-platform CSS bleed,
 * prevent merge conflicts across parallel contributors, and maintain clean separation of concerns.
 */

import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

import { FeedMobileView } from "@/components/feed-mobile-view";
import { FeedWebView } from "@/components/feed-web-view";

export default function FeedScreen() {
  const { isCompact } = useResponsiveLayout();
  return isCompact ? <FeedMobileView /> : <FeedWebView />;
}
