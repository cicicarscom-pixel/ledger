-- Add parent_comment_id to comments table
ALTER TABLE public.comments ADD COLUMN parent_comment_id text;
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON public.comments (parent_comment_id);
