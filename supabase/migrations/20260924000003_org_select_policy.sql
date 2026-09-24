CREATE POLICY "Users can select their own organizations" ON public.organizations FOR SELECT USING (owner_id = auth.uid());
