CREATE POLICY "Users can delete their own communication logs" ON public.ai_communication_logs FOR DELETE USING (auth.uid() = merchant_id);
