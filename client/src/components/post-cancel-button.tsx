import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import type { Post } from '@/data/feed';

/** Allows a club leader to confirm cancellation of a server-backed post. */
export function PostCancelButton({ post }: { post: Post }) {
  const { isLeaderOf } = useClubLeadership();
  const { cancelPost } = useFeed();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const isServerPost = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.id);
  if (!post.clubId || !isServerPost || post.isCancelled || !isLeaderOf(post.clubId)) return null;

  const close = () => {
    if (!savingRef.current) setOpen(false);
  };

  const confirm = async () => {
    // Guard synchronously against repeated clicks before the disabled state renders.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await cancelPost(post.id);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to cancel the post. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Button label="Mark as canceled" variant="danger" onPress={() => {
        setError(null);
        setOpen(true);
      }} />
      <ModalDialog visible={open} onClose={close} cardStyle={styles.dialog}>
        <ThemedText type="subtitle">Cancel this post?</ThemedText>
        <ThemedText>{post.headline}</ThemedText>
        <ThemedText type="small">
          This post will stay visible with a Canceled label. This action cannot be undone in the app.
        </ThemedText>
        {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
        <View style={styles.actions}>
          <Button label="Keep post active" variant="secondary" disabled={saving} onPress={close} />
          <Button label={saving ? 'Canceling…' : 'Confirm cancellation'} variant="danger"
            disabled={saving} onPress={confirm} />
        </View>
      </ModalDialog>
    </>
  );
}

const styles = StyleSheet.create({
  dialog: { width: '100%', maxWidth: 520, gap: Spacing.three },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
