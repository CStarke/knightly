import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import type { Post } from '@/data/feed';

/** Confirms permanent deletion of an active or canceled server-backed club post. */
export function PostDeleteButton({ post }: { post: Post }) {
  const { isLeaderOf } = useClubLeadership();
  const { deletePost } = useFeed();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const isServerPost = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.id);
  if (!post.clubId || !isServerPost || !isLeaderOf(post.clubId)) return null;

  const close = () => {
    if (!deletingRef.current) setOpen(false);
  };

  const confirm = async () => {
    // Block duplicate submissions before the next React render disables the button.
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setError(null);
    try {
      await deletePost(post.id);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete the post. Please try again.');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <>
      <Button label="Delete post" variant="danger" onPress={() => {
        setError(null);
        setOpen(true);
      }} />
      <ModalDialog visible={open} onClose={close} cardStyle={styles.dialog}>
        <ThemedText type="subtitle">Permanently delete this post?</ThemedText>
        <ThemedText>{post.headline}</ThemedText>
        <ThemedText type="small">
          This removes the post from the feed, club page and saved posts. This action cannot be undone.
        </ThemedText>
        {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
        <View style={styles.actions}>
          <Button label="Keep post" variant="secondary" disabled={deleting} onPress={close} />
          <Button label={deleting ? 'Deleting…' : 'Delete permanently'} variant="danger"
            disabled={deleting} onPress={confirm} />
        </View>
      </ModalDialog>
    </>
  );
}

const styles = StyleSheet.create({
  dialog: { width: '100%', maxWidth: 520, gap: Spacing.three },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
