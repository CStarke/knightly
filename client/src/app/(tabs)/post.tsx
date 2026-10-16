/**
 * Create Post Composer Screen (Slot 4)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * The Create Post composer is exclusively available to verified student club leaders (`isLeader`).
 * It allows authoring campus event flyers and announcements with structured metadata
 * (Date/Time masking, physical location, customized mission descriptions, and 16:9 cropped imagery).
 *
 * ANTI-MONOLITH ARCHITECTURE (AGENTS.md Rule 4.3):
 * Rather than holding state and multiple platform layout trees in a 1,200+ line monolith,
 * this file acts as a lightweight router delegating to:
 * - PostNotLeaderView: Authorization guard when user is not a leader
 * - PostWebView: Responsive desktop 2-column layout with sticky live card preview
 * - PostMobileView: Handheld mobile layout with soft keyboard lift and input auto-scrolling
 *
 * All state and business logic are centralized in `usePostComposer()`.
 */

import React from 'react';

import { DatePickerModal, parseDateOrDefault } from '@/components/date-picker-modal';
import { PostMobileView } from '@/components/post-mobile-view';
import { PostNotLeaderView } from '@/components/post-not-leader-view';
import { PostWebView } from '@/components/post-web-view';
import {
  MAX_CUSTOM_WHEN_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
  usePostComposer,
} from '@/hooks/use-post-composer';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { formatEventDate } from '@/utils/date-format';

export {
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_CUSTOM_WHEN_LENGTH,
  formatEventDate,
  DatePickerModal,
  parseDateOrDefault,
};

export default function CreatePostScreen() {
  const { isCompact } = useResponsiveLayout();
  const composer = usePostComposer();

  // If user is not yet an authorized club leader, display the code entry claim screen
  if (!composer.isLeader || !composer.activeClub) {
    return (
      <PostNotLeaderView
        onOpenClaimModal={() => composer.openClaimModal('profile')}
      />
    );
  }

  // Delegate between responsive desktop/tablet web view and mobile handheld view
  return isCompact ? (
    <PostMobileView composer={composer} />
  ) : (
    <PostWebView composer={composer} />
  );
}
