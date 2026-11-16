import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { Spacing } from '@/constants/theme';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useFeed } from '@/context/feed-context';
import type { Post } from '@/data/feed';
import type { PostTextChanges } from '@/services/post-edit-api';

/** Shows editing for a claimed club's server-backed post in every post-card layout. */
export function PostEditButton({ post }: { post: Post }) {
  const { isLeaderOf } = useClubLeadership();
  const [open, setOpen] = useState(false);
  const isServerPost = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.id);
  if (!post.clubId || !isServerPost || !isLeaderOf(post.clubId)) return null;

  return (
    <>
      <Button label="Edit post" variant="secondary" onPress={() => setOpen(true)} />
      {/* Mount each draft once so feed refreshes cannot overwrite typing. */}
      {open ? <PostEditDialog post={post} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Prefills a text-edit draft and retains it after validation or network failures. */
function PostEditDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const { editPost } = useFeed();
  const original = useRef(post).current;
  const [headline, setHeadline] = useState(post.headline);
  const [body, setBody] = useState(post.body);
  const [whenText, setWhenText] = useState(post.when || '');
  const [whereText, setWhereText] = useState(post.where || '');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Only changed fields are sent, preserving other edits made while this dialog is open.
  const changes: PostTextChanges = {};
  if (headline !== original.headline) changes.headline = headline.trim();
  if (body !== original.body) changes.body = body.trim();
  if (whenText !== (original.when || '')) changes.whenText = whenText.trim();
  if (whereText !== (original.where || '')) changes.whereText = whereText.trim();
  const hasChanges = Object.keys(changes).length > 0;

  const close = () => {
    if (!savingRef.current) onClose();
  };

  const save = async () => {
    // A synchronous guard also prevents double clicks before React rerenders.
    if (savingRef.current || !hasChanges) return;
    if (!headline.trim() || !body.trim()) {
      setError('Title and description are required.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await editPost(post.id, changes);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save changes. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <ModalDialog visible onClose={close} cardStyle={styles.dialog}>
      <ThemedText type="subtitle">Edit post</ThemedText>
      <ThemedText type="small">{post.org}</ThemedText>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields}>
        <ThemedText>Title</ThemedText>
        <FormTextInput accessibilityLabel="Post title" value={headline} onChangeText={setHeadline}
          maxLength={50} editable={!saving} />
        <ThemedText>Description</ThemedText>
        <FormTextInput accessibilityLabel="Post description" value={body} onChangeText={setBody}
          maxLength={280} multiline variant="multiline" editable={!saving} />
        <ThemedText>Date and time</ThemedText>
        <FormTextInput accessibilityLabel="Post date and time" value={whenText} onChangeText={setWhenText}
          maxLength={160} placeholder="Fri, Nov 20 · 6:00 PM–8:00 PM" editable={!saving} />
        <ThemedText>Location</ThemedText>
        <FormTextInput accessibilityLabel="Post location" value={whereText} onChangeText={setWhereText}
          maxLength={25} editable={!saving} />
      </ScrollView>
      {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
      <View style={styles.actions}>
        <Button label="Discard changes" variant="secondary" disabled={saving} onPress={close} />
        <Button label={saving ? 'Saving…' : 'Save changes'} disabled={saving || !hasChanges} onPress={save} />
      </View>
    </ModalDialog>
  );
}

const styles = StyleSheet.create({
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', gap: Spacing.three },
  fields: { gap: Spacing.two },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
