-- posts
UPDATE public.posts t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_profile_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- comments
UPDATE public.comments t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_profile_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- conversations
UPDATE public.conversations t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_profile_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- messages
UPDATE public.messages t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_profile_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- reviews
UPDATE public.reviews t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_profile_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- notifications
UPDATE public.notifications t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_profile_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- transactions
UPDATE public.transactions t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_profile_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- company_documents
UPDATE public.company_documents t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.company_documents DROP CONSTRAINT IF EXISTS company_documents_profile_id_fkey;
ALTER TABLE public.company_documents ADD CONSTRAINT company_documents_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- drive_watch_channels
UPDATE public.drive_watch_channels t SET profile_id = om.organization_id FROM public.organization_members om WHERE t.profile_id = om.user_id;
ALTER TABLE public.drive_watch_channels DROP CONSTRAINT IF EXISTS drive_watch_channels_profile_id_fkey;
ALTER TABLE public.drive_watch_channels ADD CONSTRAINT drive_watch_channels_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
