import { ThemedText } from '@/components/themed-text';
import { SuccessModal } from '@/components/ui/success-modal';
import { Brand } from '@/constants/theme';

export interface PostSuccessModalProps {
  visible: boolean;
  clubName: string;
  onClose: () => void;
  onViewFeed: () => void;
  viewFeedLabel?: string;
}

export function PostSuccessModal({
  visible,
  clubName,
  onClose,
  onViewFeed,
  viewFeedLabel = 'View in Feed',
}: PostSuccessModalProps) {
  return (
    <SuccessModal
      visible={visible}
      title="Post Published!"
      message={
        <ThemedText
          type="default"
          themeColor="textMuted"
          style={{ textAlign: 'center', fontSize: 15, lineHeight: 22, maxWidth: 300 }}
        >
          Your post for{' '}
          <ThemedText
            type="default"
            style={{ fontWeight: '700', color: Brand.renewGreen }}
          >
            {clubName}
          </ThemedText>{' '}
          is now live on the Knightly campus feed.
        </ThemedText>
      }
      primaryButton={{
        label: viewFeedLabel,
        variant: 'primary',
        sf: 'sparkles',
        md: 'auto_awesome',
        onPress: onViewFeed,
      }}
      secondaryButton={{
        label: 'Got it',
        variant: 'secondary',
        onPress: onClose,
      }}
      onClose={onClose}
    />
  );
}
