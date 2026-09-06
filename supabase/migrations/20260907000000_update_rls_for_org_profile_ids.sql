-- Update RLS policies for all tables that use profile_id 
-- to support organization_id in profile_id column

-- notifications
DROP POLICY IF EXISTS "Users can view and manage their own notifications" ON public.notifications;
CREATE POLICY "Users can view and manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- social_accounts (if it exists in public schema)
DROP POLICY IF EXISTS "Kullanici kendi hesaplarini gorebilir" ON public.social_accounts;
CREATE POLICY "Kullanici kendi hesaplarini gorebilir" ON public.social_accounts FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- posts
DROP POLICY IF EXISTS "Kullanici kendi gonderilerini gorebilir" ON public.posts;
CREATE POLICY "Kullanici kendi gonderilerini gorebilir" ON public.posts FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- conversations
DROP POLICY IF EXISTS "Kullanici kendi sohbetlerini gorebilir" ON public.conversations;
CREATE POLICY "Kullanici kendi sohbetlerini gorebilir" ON public.conversations FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- messages
DROP POLICY IF EXISTS "Kullanici kendi mesajlarini gorebilir" ON public.messages;
CREATE POLICY "Kullanici kendi mesajlarini gorebilir" ON public.messages FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- comments
DROP POLICY IF EXISTS "Kullanici kendi yorumlarini gorebilir" ON public.comments;
CREATE POLICY "Kullanici kendi yorumlarini gorebilir" ON public.comments FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- reviews
DROP POLICY IF EXISTS "Kullanici kendi degerlendirmelerini gorebilir" ON public.reviews;
CREATE POLICY "Kullanici kendi degerlendirmelerini gorebilir" ON public.reviews FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- transactions
DROP POLICY IF EXISTS "Kullanici kendi finansal islemlerini gorebilir" ON public.transactions;
CREATE POLICY "Kullanici kendi finansal islemlerini gorebilir" ON public.transactions FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- company_documents
DROP POLICY IF EXISTS "Kullanici kendi dökümanlarini gorebilir" ON public.company_documents;
CREATE POLICY "Kullanici kendi dökümanlarini gorebilir" ON public.company_documents FOR SELECT USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));

-- drive_watch_channels
DROP POLICY IF EXISTS "Kullanici kendi kanallarini gorebilir" ON public.drive_watch_channels;
CREATE POLICY "Kullanici kendi kanallarini gorebilir" ON public.drive_watch_channels FOR ALL USING (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = profile_id AND user_id = auth.uid()));
