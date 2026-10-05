-- Hesap silme (Google Play zorunluluğu): `delete-account` Edge Function'ı bu iki işlevi service_role ile çağırır.
-- 1) account_deletion_info: silinecek verinin dış kaynaklarını (Zernio hesapları, depolama dosyaları) önceden toplar (salt okunur).
-- 2) account_deletion_unblock: auth.users silinmesini engelleyen "NO ACTION" yabancı anahtarları temizler.
-- Asıl silme auth.users silinince CASCADE ile olur (profil, işletme ve işletmeye bağlı bütün veriler).
-- İstemciler bu işlevleri ÇAĞIRAMAZ (yalnız service_role).

create or replace function public.account_deletion_info(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_orgs uuid[];
  v_is_admin boolean;
  v_accounts text[];
  v_receipts text[];
  v_media jsonb;
begin
  select coalesce(array_agg(id), '{}') into v_orgs from public.organizations where owner_id = p_user;
  select exists (select 1 from public.admin_users where user_id = p_user) into v_is_admin;

  select coalesce(array_agg(distinct zernio_account_id), '{}') into v_accounts
    from integration.social_accounts where organization_id = any(v_orgs) and zernio_account_id is not null;

  select coalesce(array_agg(image_url), '{}') into v_receipts
    from public.finance_documents where organization_id = any(v_orgs) and image_url is not null;

  select coalesce(jsonb_agg(jsonb_build_object('bucket', storage_bucket, 'path', storage_path)), '[]'::jsonb) into v_media
    from public.posts where profile_id = any(v_orgs) and storage_bucket is not null and storage_path is not null;

  return jsonb_build_object(
    'isAdmin', v_is_admin,
    'orgIds', to_jsonb(v_orgs),
    'zernioAccountIds', to_jsonb(v_accounts),
    'receiptUrls', to_jsonb(v_receipts),
    'postMedia', v_media
  );
end;
$$;

create or replace function public.account_deletion_unblock(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_orgs uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_orgs from public.organizations where owner_id = p_user;

  -- Başka kayıtlarda "kim yaptı" bilgisi olarak duran referanslar (boş bırakılabilenler)
  update public.accountant_ai_messages set sender_user_id = null where sender_user_id = p_user;
  update public.accountant_connection_events set actor_user_id = null where actor_user_id = p_user;
  update public.accountant_taxpayer_links set confirmed_by_user_id = null where confirmed_by_user_id = p_user;
  update public.accountant_taxpayer_links set disconnected_by_user_id = null where disconnected_by_user_id = p_user;
  update public.admin_users set granted_by = null where granted_by = p_user;
  update public.ai_personas set created_by = null where created_by = p_user;
  update public.ledger_ai_rules set created_by_user_id = null where created_by_user_id = p_user;
  update public.organization_audit_events set actor_user_id = null where actor_user_id = p_user;
  update public.organization_legal_profiles set updated_by_user_id = null where updated_by_user_id = p_user;

  -- Boş bırakılamayan ya da işletmeye bağlı olanlar silinir
  delete from public.accountant_taxpayer_links where initiated_by_user_id = p_user;
  delete from public.accountant_connection_events where taxpayer_organization_id = any(v_orgs);
end;
$$;

revoke all on function public.account_deletion_info(uuid) from public, anon, authenticated;
revoke all on function public.account_deletion_unblock(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_info(uuid) to service_role;
grant execute on function public.account_deletion_unblock(uuid) to service_role;
