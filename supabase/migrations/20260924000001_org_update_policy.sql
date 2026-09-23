CREATE POLICY "Users can update their own organizations" ON public.organizations FOR UPDATE USING (owner_id = auth.uid());
