-- Cancellation remains visible wherever a published post is readable.
-- A separate flag preserves the existing publication status and RLS policies.
BEGIN;

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.posts.is_cancelled IS
    'True when a club leader has marked the post canceled. The post stays visible.';

COMMIT;
