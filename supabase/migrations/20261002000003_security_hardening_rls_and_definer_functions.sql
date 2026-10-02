-- GÜVENLİK SERTLEŞTİRME (02.10.2026; Claude canlıya uyguladı, dosya kayıt amaçlı). Supabase güvenlik denetimi + kod incelemesi.
-- 1) accountant_clients: RLS kapalıydı (anon anahtarla okunup yazılabiliyordu). Boş, kullanılmıyor.
-- 2) update_business_profile: üye olmayan kullanıcıda rol NULL → 'NULL NOT IN (...)' IF'i geçiyordu; oturum açmış herkes
--    herhangi bir işletmenin adını/vergi/iletişim bilgisini değiştirebiliyordu. Kullanılmıyor → dışarıya kapatıldı.
-- 3) get_storage_buckets / get_storage_policies: kullanılmıyor → dışarıya kapatıldı.
-- 4) resolve_zernio_profile_for_platform: yetki kontrolü yoktu → service_role ya da işletme üyesi şartı.
alter table public.accountant_clients enable row level security;
revoke execute on function public.update_business_profile(uuid, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.get_storage_buckets() from public, anon, authenticated;
revoke execute on function public.get_storage_policies() from public, anon, authenticated;
create or replace function public.resolve_zernio_profile_for_platform(p_org_id uuid, p_platform text)
returns zernio_profile_resolution
language plpgsql security definer
set search_path to 'integration', 'public'
as $function$
declare
  v_slot integer;
  v_zernio_id text;
  v_mapping_id uuid;
  v_res zernio_profile_resolution;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not exists (
    select 1 from public.organization_members m where m.organization_id = p_org_id and m.user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN: bu işletme için yetkiniz yok' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_org_id::text));
  select zp.profile_slot, zp.zernio_profile_id, zp.id into v_slot, v_zernio_id, v_mapping_id
  from integration.zernio_profiles zp
  left join integration.social_accounts sa
    on sa.zernio_profile_mapping_id = zp.id and sa.platform = p_platform and sa.is_active = true
  where zp.organization_id = p_org_id and sa.id is null and zp.status = 'active'
  order by zp.profile_slot asc limit 1;
  if v_slot is not null then
    v_res.profile_slot := v_slot; v_res.is_new := false; v_res.zernio_profile_id := v_zernio_id; v_res.mapping_id := v_mapping_id;
    return v_res;
  end if;
  select zp.profile_slot, zp.id into v_slot, v_mapping_id
  from integration.zernio_profiles zp
  where zp.organization_id = p_org_id and zp.status = 'provisioning'
  order by zp.profile_slot asc limit 1;
  if v_slot is null then
    select coalesce(max(profile_slot), 0) + 1 into v_slot from integration.zernio_profiles where organization_id = p_org_id;
    insert into integration.zernio_profiles (organization_id, profile_slot, profile_key, is_primary, status)
    values (p_org_id, v_slot, 'slot_' || v_slot, v_slot = 1, 'provisioning')
    returning id into v_mapping_id;
  end if;
  v_res.profile_slot := v_slot; v_res.is_new := true; v_res.zernio_profile_id := null; v_res.mapping_id := v_mapping_id;
  return v_res;
end;
$function$;
revoke execute on function public.resolve_zernio_profile_for_platform(uuid, text) from public, anon;
grant execute on function public.resolve_zernio_profile_for_platform(uuid, text) to authenticated, service_role;
