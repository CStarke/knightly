import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

const isWeb = Platform.OS === 'web';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { getPresetBannerDetails, isPresetBanner } from '@/constants/preset-banners';
import { useClubFollow } from '@/context/club-follow-context';
import type { Post } from '@/data/feed';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/date-format';

/**
 * Determines the visual tone/color for a post's category badge.
 *
 * WHY CATEGORY TONES:
 * Color-coding categories provides instant peripheral visual recognition as students scroll
 * rapidly through the feed, letting them distinguish athletic games from academic colloquia at a glance.
 *
 * @param category - The post category name (e.g. 'Academics', 'Outdoors', 'Athletics', 'Faith')
 * @returns The semantic BadgeTone matching the category
 */
function categoryBadgeTone(category: string): BadgeTone {
  switch (category) {
    case 'Academics':
      return 'info';
    case 'Outdoors':
      return 'success';
    case 'Athletics':
      return 'danger';
    case 'Faith':
      return 'brand';
    case 'Official':
      return 'gold';
    default:
      return 'gold';
  }
}

/**
 * Organization affiliation badge component.
 *
 * WHAT IT DOES:
 * - When `isOverlay` is true (post has a banner image), renders a translucent frosted glass pill
 *   floating in the top-left of the image with a subtle border.
 * - When `isOverlay` is false (post has no image), renders an inline horizontal header strip.
 * - If the student follows this organization (`followed: true`), renders a verified checkmark seal.
 * - Clicking the badge triggers `onPress` to navigate to that organization's detail subpage.
 *
 * WHY VERIFIED SEAL:
 * Instead of displaying verbose text like "Following", a gold checkmark seal icon provides
 * an elegant, high-status visual confirmation of the student's personal subscriptions.
 */
function OrgBadge({
  org,
  followed,
  isOverlay,
  onPress,
}: {
  org: string;
  followed: boolean;
  isOverlay: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${org} club page`}
      style={({ pressed }) => [
        isOverlay ? (isWeb ? [styles.orgPill, styles.webOrgPill] : styles.orgPill) : styles.noImageOrgRow,
        pressed && styles.pressedPill,
      ]}
    >
      {/* Verified seal indicator when the student is following this club */}
      {followed ? (
        <Icon
          sf="checkmark.seal.fill"
          md="verified"
          size={isOverlay ? 14 : 15}
          color={isOverlay ? Brand.gold : Brand.goldDark}
        />
      ) : null}
      <ThemedText
        type={isOverlay ? undefined : 'smallBold'}
        style={isOverlay ? (isWeb ? [styles.overlayOrgText, styles.webOverlayOrgText] : styles.overlayOrgText) : styles.noImageOrgText}
        numberOfLines={isOverlay ? 1 : undefined}
      >
        {org}
      </ThemedText>
    </Pressable>
  );
}

/**
 * Modern post card component for announcements, flyers, and campus updates.
 *
 * FEATURES & ARCHITECTURE:
 * - Edge-to-edge stock imagery with overlaid organization pill tag
 * - Sleek follow checkmark icon replacing verbose "Following" text
 * - Prominent display headline as the largest text on the card
 * - Graceful layout for non-image posts with an editorial header strip
 * - High-contrast event metadata & readable body copy
 * - Tap on club name navigates directly to that club's short page
 * - Dynamic relative timestamp footer with past/future handling and timezone support
 *
 * @param props.post - The post model to render
 * @param props.onPressOrg - Optional callback when organization tag is tapped (defaults to navigating to `/clubs/[id]`)
 */
export interface PostCardProps {
  post: Post;
  /**
   * Optional custom callback when the organization pill/badge is pressed.
   * If provided, receives the post's canonical clubId.
   * If omitted, defaults to navigating to the club's detail screen (`/clubs/[id]`).
   */
  onPressOrg?: (clubId: string) => void;
}

export function PostCard({ post, onPressOrg }: PostCardProps) {
  const theme = useTheme();
  const { isFollowing } = useClubFollow();

  // Step 1: Derive canonical club ID (fallback slugification for legacy posts without clubId)
  // WHY SLUGIFY FALLBACK:
  // Older demo seed posts or mock feeds might not specify post.clubId explicitly. Slugifying
  // post.org ensures navigation to `/clubs/[id]` and follow state lookups work seamlessly.
  const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const followed = isFollowing(clubId);

  // Step 2: Club page navigation handler
  // WHY CUSTOM ORG HANDLER:
  // When viewed inside `ClubDetailView`, tapping the organization badge should NOT push a duplicate
  // instance of the same club page onto the navigation stack. Supplying `onPressOrg` allows the parent
  // view to intercept the tap and smoothly scroll the user to the top of the page instead.
  const handlePressOrg = () => {
    if (onPressOrg) {
      onPressOrg(clubId);
      return;
    }
    router.push({
      pathname: '/clubs/[id]',
      params: { id: clubId },
    });
  };

  const isPreset = isPresetBanner(post.image);
  const presetDetails = isPreset ? getPresetBannerDetails(post.image) : null;

  return (
    <Card flush style={[styles.card, isWeb && styles.webCard]}>
      {/* Step 3: Top Banner Image Container (when image is present) */}
      {post.image ? (
        <View style={styles.imageContainer}>
          {/*
            WHY LAYERED PRESET BANNERS:
            Preset banners decouple collegiate background colors from vector patterns.
            A solid View provides the background color and an absolute-positioned Image
            renders the transparent SVG pattern overlay tinted by the background's accent.
          */}
          {presetDetails ? (
            <View style={[styles.image, { backgroundColor: presetDetails.colorHex }]}>
              {presetDetails.patternAsset ? (
                <Image
                  source={presetDetails.patternAsset}
                  tintColor={presetDetails.accentColor}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
                  transition={250}
                />
              ) : null}
            </View>
          ) : (
            <Image
              source={{ uri: post.image }}
              style={styles.image}
              contentFit="cover"
              transition={250}
            />
          )}
          {/* Subtle top scrim ensuring overlay badges contrast cleanly against bright photos */}
          <View style={[styles.scrim, isWeb && styles.webScrim]} />

          <View style={styles.overlayBar}>
            <OrgBadge org={post.org} followed={followed} isOverlay onPress={handlePressOrg} />

            <View style={styles.badgeWrapper}>
              <Badge label={post.category} tone={categoryBadgeTone(post.category)} />
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.content, isWeb && styles.webContent]}>
        {/* Step 4: Editorial header strip for posts without an image */}
        {!post.image ? (
          <View style={styles.noImageHeader}>
            <OrgBadge org={post.org} followed={followed} isOverlay={false} onPress={handlePressOrg} />
            <Badge label={post.category} tone={categoryBadgeTone(post.category)} />
          </View>
        ) : null}

        {/* Step 5: Headline typography (largest, most commanding text in serif font) */}
        <ThemedText style={[styles.title, isWeb && styles.webTitle]} numberOfLines={isWeb ? 3 : undefined}>
          {post.headline}
        </ThemedText>

        {/* Step 6: Event logistics metadata (When & Where badges) */}
        {post.when || post.where ? (
          <View style={styles.metaSection}>
            {post.when ? (
              <MetaBadge
                icon={{ sf: 'calendar', md: 'event' }}
                text={post.when}
                bold
                tintSoft={theme.tintSoft}
              />
            ) : null}

            {post.where ? (
              <MetaBadge
                icon={{ sf: 'mappin.and.ellipse', md: 'place' }}
                text={post.where}
                tintSoft={theme.tintSoft}
              />
            ) : null}
          </View>
        ) : null}

        {/* Step 7: Body copy */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.body} numberOfLines={isWeb ? 4 : undefined}>
          {post.body}
        </ThemedText>

        {/*
          Step 8: Card footer with dynamic relative timestamp & campus-wide badge
          WHY DYNAMIC RELATIVE TIME:
          Computes human-friendly relative age ("Just now", "45 minutes ago", "3 hours ago",
          "In 2 days", or exact date) dynamically based on current client clock and server timestamp.
        */}
        <View style={styles.footer}>
          <ThemedText type="caption" themeColor="textMuted">
            {formatRelativeTime(post.postedAt, post.createdAt, post.monotonicCreatedAt)}
          </ThemedText>
          {post.campusWide ? (
            <ThemedText type="caption" themeColor="textMuted">
              Campus-wide
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  webCard: {
    flex: 1,
    height: '100%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#1C1D21',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
  },
  webScrim: {
    height: 60,
  },
  overlayBar: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  orgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(17, 24, 28, 0.75)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    maxWidth: '70%',
    flexShrink: 1,
  },
  webOrgPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    maxWidth: '68%',
  },
  overlayOrgText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  webOverlayOrgText: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  badgeWrapper: {
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  noImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
    gap: Spacing.two,
  },
  noImageOrgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  noImageOrgText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  webContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  webTitle: {
    fontSize: 18,
    lineHeight: 23,
    minHeight: 46,
  },
  metaSection: {
    gap: 6,
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 3,
  },
  metaIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 13,
  },
  body: {
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  pressedPill: {
    opacity: 0.75,
  },
});

/**
 * Event logistics metadata badge (date or location).
 *
 * WHAT IT DOES:
 * Renders a small tinted circular icon with accompanying text for event timing (calendar icon)
 * or physical location (map pin icon).
 *
 * @param props.icon - Platform-specific icon names (SF Symbols for iOS, Material Symbols for Android/Web)
 * @param props.text - The formatted date/time string or location name
 * @param props.bold - When true, applies smallBold weight (typically used for event dates to emphasize timing)
 * @param props.tintSoft - The soft brand background color for the circular icon container
 */
function MetaBadge({
  icon,
  text,
  bold = false,
  tintSoft,
}: {
  icon: { sf: 'calendar' | 'mappin.and.ellipse'; md: 'event' | 'place' };
  text: string;
  bold?: boolean;
  tintSoft: string;
}) {
  return (
    <View style={styles.metaRow}>
      <View style={[styles.metaIconWrap, { backgroundColor: tintSoft }]}>
        <Icon sf={icon.sf} md={icon.md} size={13} color={Brand.maroon} />
      </View>
      <ThemedText
        type={bold ? 'smallBold' : 'small'}
        themeColor={bold ? undefined : 'textSecondary'}
        style={styles.metaText}
      >
        {text}
      </ThemedText>
    </View>
  );
}


