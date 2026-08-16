CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = profile_id);
