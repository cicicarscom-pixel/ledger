-- F5-C sonrası doğrulama. Hata olursa EXCEPTION fırlatır; sonunda bilerek geri alınır ("F5-C TEST OK" ile biter).
-- 1) Eski sütunlar ve eşitleme tetikleyicileri yok; 2) org_id kimlik göndermeden dolar; 3) organization_ai_settings anahtarı org_id.
-- (supabase/tests/f4_1a_client_without_identity.sql eski sütunları okuduğu için F5-C'den sonra GEÇERSİZDİR; bu dosya onun yerini alır.)
do $$
declare
  v_owner uuid := (select owner_id from public.organizations order by created_at desc limit 1);
  r1 record; r2 record; r3 record; left_cols int; trg int; pk text;
begin
  select count(*) into left_cols from information_schema.columns
   where table_schema = 'public'
     and table_name in ('ai_communication_logs','appointment_services','appointments','bot_settings','business_services','calendar_blocks','calendars','customers','organization_ai_settings','waha_sessions')
     and column_name in ('merchant_id','organization_id');
  if left_cols <> 0 then raise exception 'F5-C: % eski sütun hâlâ var', left_cols; end if;

  select count(*) into trg from pg_trigger where tgname = 'a00_sync_org_id' and not tgisinternal;
  if trg <> 0 then raise exception 'F5-C: % eşitleme tetikleyicisi hâlâ var', trg; end if;
  if exists (select 1 from pg_proc where proname = 'tr_sync_org_id') then raise exception 'F5-C: tr_sync_org_id hâlâ var'; end if;

  select pg_get_constraintdef(oid) into pk from pg_constraint where conname = 'organization_ai_settings_pkey';
  if pk <> 'PRIMARY KEY (org_id)' then raise exception 'F5-C: organization_ai_settings anahtarı beklenen değil: %', pk; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.calendars (name) values ('__f5c_test') returning org_id into r1;
  insert into public.business_services (name, price) values ('__f5c_test', 1) returning org_id into r2;
  insert into public.organization_ai_settings (updated_at) values (now())
    on conflict (org_id) do update set updated_at = excluded.updated_at returning org_id into r3;
  reset role;
  if r1.org_id is null or r2.org_id <> r1.org_id or r3.org_id <> r1.org_id then
    raise exception 'F5-C TEST BAŞARISIZ: org_id kimlik göndermeden doğru dolmadı';
  end if;
  raise exception 'F5-C TEST OK (geri alındı)';
end $$;
