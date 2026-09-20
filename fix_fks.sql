DO  
DECLARE
  tbl TEXT;
  tables_to_update TEXT[] := ARRAY[
    'posts', 'comments', 'conversations', 'messages', 
    'reviews', 'notifications', 'transactions', 
    'company_documents', 'drive_watch_channels'
  ];
BEGIN
  -- 1. Update existing records: if profile_id is a user_id, map it to their organization_id
  FOREACH tbl IN ARRAY tables_to_update
  LOOP
    -- check if table exists first
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('
        UPDATE public.%I t
        SET profile_id = om.organization_id
        FROM public.organization_members om
        WHERE t.profile_id = om.user_id
      ', tbl);
      
      -- 2. Drop the old foreign key constraint
      BEGIN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_profile_id_fkey', tbl, tbl);
      EXCEPTION WHEN OTHERS THEN NULL; END;
      
      -- 3. Add the new foreign key pointing to organizations(id)
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.organizations(id) ON DELETE CASCADE', tbl, tbl);
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END LOOP;
END ;
